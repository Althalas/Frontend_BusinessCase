import { Component, inject, signal, computed, ChangeDetectionStrategy, effect } from "@angular/core";
import { toSignal, rxResource } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { FormBuilder, FormGroup, ReactiveFormsModule } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatSliderModule } from "@angular/material/slider";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { StationsService, Station } from "@core/services/stations.service";
import { VehiclesService, Vehicle } from "@core/services/vehicles.service";
import { StationCardComponent } from "../../components/station-card/station-card.component";
import { debounceTime, startWith, catchError, map } from "rxjs/operators";
import { of } from "rxjs";
import { createPaginatedResource } from "@shared/utils/pagination.util";
import { createMutationResource } from "@shared/utils/mutation.util";

/**
 * Page de liste des bornes de recharge.
 * 
 * - Utilisation exclusive de l'`API rxResource` (Angular 21) pour la gestion des données asynchrones.
 * - Architecture "Pure Signals" : Le template ne consomme que des Signals dérivés.
 * - Support natif des Observables avec annulation automatique des requêtes précédentes.
 * 
 * Fonctionnalités Principales :
 * - Filtrage réactif (déclenché automatiquement par les signaux ou le formulaire).
 * - Pagination via `rxResource` (traque les changements de page/taille).
 * - Gestion des favoris avec rechargement partiel intelligent.
 * - Vue filtrée côté client pour la recherche textuelle instantanée.
 */
@Component({
  selector: "app-stations-list",
  
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    StationCardComponent,
  ],
  templateUrl: "./stations-list.component.html",
  styleUrl: "./stations-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationsListComponent {
  private stationsService = inject(StationsService);
  private vehiclesService = inject(VehiclesService);
  private fb = inject(FormBuilder);

  // --- CONTROLS ---
  filterForm: FormGroup = this.fb.group({
    connectorType: [""],
    minPower: [null],
    maxPrice: [null],
    onlyMyVehicles: [false],
    search: [""],
  });

  // --- LOCAL STATE ---
  readonly pageSize = signal(10);
  readonly pageIndex = signal(0); // 0-based for MatPaginator

  // --- HELPER SIGNALS ---
  // Charge les véhicules de l'utilisateur pour la logique "onlyMyVehicles"
  readonly userVehiclesResource = rxResource<Vehicle[], unknown>({
    stream: () => this.vehiclesService.getAll().pipe(catchError(() => of([])))
  });
  readonly userVehicles = computed(() => this.userVehiclesResource.value() ?? []);

  // --- SIGNAL FILTRES ---
  // Transforme les valeurs du formulaire en filtres DTO acceptables
  readonly filters = toSignal(
    this.filterForm.valueChanges.pipe(
      startWith(this.filterForm.value),
      debounceTime(300),
      map(formValues => {
        const filters: {
          minPower?: number | null;
          maxPrice?: number | null;
          connectorType?: string | null;
          search?: string | null;
        } = {
          minPower: formValues.minPower,
          maxPrice: formValues.maxPrice,
          connectorType: formValues.connectorType,
          search: formValues.search
        };

        // Si "Mes véhicules uniquement" est coché, on essaie de contraindre par type de connecteur.
        // Note : Le backend ne supporte qu'un seul type de connecteur à la fois.
        // On priorise la sélection explicite du formulaire.

        return filters;
      })
    ),
    { initialValue: {} }
  );

  // --- RESSOURCE PRINCIPALE (Pagination Côté Serveur) ---
  readonly searchSearchSignal = computed(() => this.filterForm.get('search')?.value);

  readonly stationsState = createPaginatedResource<Station, any>(
    (params) => {
      // Mappage des paramètres génériques vers SearchStationsDto
      return this.stationsService.search({
        page: params.page,
        limit: params.limit,
        minPower: params.minPower,
        maxPrice: params.maxPrice,
        connectorType: params.connectorType,
        search: params.search
      }).pipe(
        // ADAPTATEUR : Mappage 'PaginationMeta' Backend vers 'PageMeta' Utilitaire
        map(res => ({
          data: res.data,
          meta: {
            total: res.meta.total,
            page: res.meta.currentPage,
            limit: res.meta.itemsPerPage,
            totalPages: res.meta.totalPages
          }
        }))
      );
    },
    {
      page: this.pageIndex,
      limit: this.pageSize,
      // On ne passe pas le signal 'search' au paramètre de recherche de l'utilitaire
      // car search() du backend ne supporte pas encore de requête texte générique.
      // On passe les autres filtres.
      filters: this.filters
    }
  );

  readonly stations = this.stationsState.data;
  readonly totalItems = this.stationsState.total;
  readonly isLoading = this.stationsState.loading;

  // --- MUTATIONS (Signaux Purs) ---

  /** Mutation : Basculer favori. */
  readonly toggleFavoriteMutation = createMutationResource<any, number>(
    (stationId) => this.stationsService.toggleFavorite(stationId)
  );

  constructor() {
    // Effet : Rafraîchir les favoris après succès via reload()
    effect(() => {
      if (this.toggleFavoriteMutation.isSuccess()) {
        this.favoritesResource.reload();
      }
    });
  }

  // --- FAVORITES ---
  
  /** Resource des favoris - Angular 21 rxResource avec reload() */
  readonly favoritesResource = rxResource<Set<number>, unknown>({
    stream: () => this.stationsService.getFavorites().pipe(
      map(favs => new Set(favs.map(s => s.id))),
      catchError(() => of(new Set<number>()))
    )
  });

  // Signal exposant le Set des IDs favoris (pour réactivité template)
  readonly favoriteIds = computed(() => this.favoritesResource.value() ?? new Set<number>());

  onToggleFavorite(stationId: number): void {
    this.toggleFavoriteMutation.mutate(stationId);
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.pageIndex.set(0);
  }

  applyBackendFilters(): void {
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
