import { Component, inject, signal, computed, ChangeDetectionStrategy, effect } from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { MatListModule } from "@angular/material/list";
import { MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatMenuModule } from "@angular/material/menu";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";

import { AuthService } from "@core/services/auth.service";
import { BookingsService, Booking } from "@core/services/bookings.service";
import { VehiclesService, Vehicle, CreateVehicleDto } from "@core/services/vehicles.service";
import {
  StationsService,
  Station,
  getStationAddress,
  getStationPower,
  getStationPrice,
} from "@core/services/stations.service";
import { ReviewsService } from "@core/services/reviews.service";
import { Review } from "@core/models/review.model";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";
import { createPaginatedResource } from "@shared/utils/pagination.util";
import { environment } from "../../../../../environments/environment";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";

/**
 * Page d'accueil du tableau de bord.
 * 
 * Ressources parallèles via rxResource.
 * Calculs dérivés pour les réservations (Passées/Futures).
 * Gestion réactive des listes (Véhicules, Favoris).
 */
@Component({
  selector: "app-dashboard-home",
  
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatListModule,
    MatTableModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule,
    MatPaginatorModule,
    MatDialogModule,
  ],
  templateUrl: "./dashboard-home.component.html",
  styleUrl: "./dashboard-home.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent {
  private authService = inject(AuthService);
  private bookingsService = inject(BookingsService);
  private vehiclesService = inject(VehiclesService);
  private stationsService = inject(StationsService);
  private reviewsService = inject(ReviewsService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);

  /** Utilisateur courant. */
  readonly currentUser = this.authService.currentUser;

  /** Nom d'utilisateur (Display). */
  readonly userName = computed(() => {
    const user = this.currentUser();
    return user ? (user.firstName || user.email) : "";
  });

  /** Rafraîchissement Véhicules. */
  readonly refreshVehicles = signal(0);
  /** Rafraîchissement Stations (Owner). */
  readonly refreshStations = signal(0);

  // --- MUTATIONS (Signaux Purs) ---

  /** Mutation: Créer un véhicule. */
  readonly createVehicleMutation = createMutationResource<Vehicle, CreateVehicleDto>(
    (data) => this.vehiclesService.create(data)
  );

  /** Mutation: Supprimer un véhicule. */
  readonly deleteVehicleMutation = createMutationResource<void, number>(
    (id) => this.vehiclesService.delete(id)
  );

  /** Mutation: Toggle favori. */
  readonly toggleFavoriteMutation = createMutationResource<any, number>(
    (stationId) => this.stationsService.toggleFavorite(stationId)
  );

  /** Mutation: Supprimer une station. */
  readonly deleteStationMutation = createMutationResource<void, number>(
    (id) => this.stationsService.delete(id)
  );

  /** Alias pour isAddingVehicle (rétrocompatibilité). */
  readonly isAddingVehicle = this.createVehicleMutation.isLoading;

  constructor() {
    // Effet : Véhicule créé
    effect(() => {
      if (this.createVehicleMutation.isSuccess()) {
        this.refreshVehicles.update(n => n + 1);
        this.vehicleForm.reset();
        this.toastService.success("Véhicule ajouté !");
      }
    });

    effect(() => {
      if (this.createVehicleMutation.isError()) {
        this.toastService.error("Erreur lors de l'ajout");
      }
    });

    // Effet : Véhicule supprimé
    effect(() => {
      if (this.deleteVehicleMutation.isSuccess()) {
        this.refreshVehicles.update(n => n + 1);
        this.toastService.success("Véhicule supprimé");
      }
    });

    // Effet : Favori basculé
    effect(() => {
      if (this.toggleFavoriteMutation.isSuccess()) {
        this.favoritesResource.reload();
        this.toastService.info("Retiré des favoris");
      }
    });

    // Effet : Borne supprimée
    effect(() => {
      if (this.deleteStationMutation.isSuccess()) {
        this.refreshStations.update(n => n + 1);
        this.toastService.success("Borne supprimée");
      }
    });

    effect(() => {
      const error = this.deleteStationMutation.error() as any;
      if (this.deleteStationMutation.isError() && error) {
        const message = error.error?.message || "Erreur lors de la suppression";
        this.toastService.error(message);
      }
    });
  }

  // --- PAGINATION (Signaux) ---
  readonly upcomingPageIndex = signal(0);
  readonly upcomingPageSize = signal(5);
  readonly historyPageIndex = signal(0);
  readonly historyPageSize = signal(5);

  // --- RESSOURCES ---

  // --- RESOURCES ---
  // 1. Ressource Réservations à venir (Côté Serveur)
  readonly upcomingBookingsState = createPaginatedResource<Booking, { timeFilter: 'upcoming' }>(
    (params) => this.bookingsService.getMyBookings({
      page: params.page,
      limit: params.limit,
      timeFilter: 'upcoming'
    }),
    { page: this.upcomingPageIndex, limit: this.upcomingPageSize, filters: signal({ timeFilter: 'upcoming' }) }
  );
  readonly upcomingBookings = this.upcomingBookingsState.data;
  readonly isLoadingUpcoming = this.upcomingBookingsState.loading;
  readonly upcomingTotal = this.upcomingBookingsState.total;
  // Note : upcomingPageSize/Index sont déjà définis comme signaux plus haut

  // 2. Ressource Historique (Côté Serveur)
  readonly historyBookingsState = createPaginatedResource<Booking, { timeFilter: 'history' }>(
    (params) => this.bookingsService.getMyBookings({
      page: params.page,
      limit: params.limit,
      timeFilter: 'history'
    }),
    { page: this.historyPageIndex, limit: this.historyPageSize, filters: signal({ timeFilter: 'history' }) }
  );
  readonly pastBookings = this.historyBookingsState.data;
  readonly isLoadingHistory = this.historyBookingsState.loading;
  readonly historyTotal = this.historyBookingsState.total;


  // Note : bookingsResource (legacy all-fetch) est retiré car nous divisons en deux requêtes optimisées.
  // Nous gardons la logique d'accès bookings seulement si utilisée ailleurs, mais principalement nous utilisons les signaux d'état ci-dessus.
  readonly isLoadingBookings = computed(() => this.isLoadingUpcoming() || this.isLoadingHistory());


  // 2. Ressource Véhicules
  readonly vehiclesResource = rxResource<Vehicle[], unknown>({
    stream: () => {
      this.refreshVehicles();
      return this.vehiclesService.getAll().pipe(catchError(() => of([])));
    }
  });
  readonly myVehicles = computed(() => this.vehiclesResource.value() ?? []);
  readonly isLoadingVehicles = computed(() => this.vehiclesResource.isLoading());

  // 3. Ressource Favoris - Angular 21 avec reload()
  readonly favoritesResource = rxResource<Station[], unknown>({
    stream: () => this.stationsService.getFavorites().pipe(catchError(() => of([])))
  });
  readonly myFavorites = computed(() => this.favoritesResource.value() ?? []);
  readonly isLoadingFavorites = computed(() => this.favoritesResource.isLoading());

  // 4. Ressource Avis Stations (Reçus)
  readonly stationReviewsResource = rxResource<Review[], unknown>({
    stream: () => this.reviewsService.getReviewsForMyStations().pipe(catchError(() => of([])))
  });
  readonly myStationReviews = computed(() => this.stationReviewsResource.value() ?? []);
  readonly isLoadingReviews = computed(() => this.stationReviewsResource.isLoading());

  // 5. Ressource Avis Donnés
  readonly givenReviewsResource = rxResource<Review[], unknown>({
    stream: () => this.reviewsService.getGivenReviews().pipe(catchError(() => of([])))
  });
  readonly givenReviews = computed(() => this.givenReviewsResource.value() ?? []);

  // 6. Ressource Stations Propriétaire (Logique conditionnelle dans le flux gérée par le service ou vérification vide)
  readonly myStationsResource = rxResource<Station[], unknown>({
    stream: () => {
      this.refreshStations();
      // Charger uniquement si propriétaire
      if (this.currentUser()?.roles?.includes("owner")) {
        return this.stationsService.getMyStations().pipe(catchError(() => of([])));
      }
      return of([]);
    }
  });
  readonly myStations = computed(() => this.myStationsResource.value() ?? []);
  readonly isLoadingStations = computed(() => this.myStationsResource.isLoading());


  // --- COMPUTED STATE ---

  // --- ÉTAT PAGINATION (Côté Serveur géré par signaux createPaginatedResource) ---
  // Re-exposing signals for template binding is done above (upcomingPageIndex, etc).

  /** Mock Stats for Stations. */

  /** Stats Mock pour les stations. */
  readonly stationStats = computed(() => {
    const stats = new Map<number, { bookings: number; revenue: number }>();
    this.myStations().forEach(s => stats.set(s.id, { bookings: 0, revenue: 0 }));
    return stats;
  });

  // --- FORMULAIRES ---
  vehicleForm: FormGroup = this.fb.group({
    brand: ["", Validators.required],
    model: ["", Validators.required],
    licensePlate: ["", Validators.required],
    connectorType: [""],
    batteryCapacity: [""],
  });

  // --- UTILITAIRES ---

  getBookingStatusColor(status: string): string {
    switch (status) {
      case "completed": return "primary";
      case "accepted": return "accent";
      case "cancelled":
      case "refused": return "warn";
      default: return "";
    }
  }

  getReviewerAvatar(review: Review): string {
    if (review.user?.avatarUrl) {
      return `${environment.apiUrl}${review.user.avatarUrl}`;
    }
    return `https://ui-avatars.com/api/?name=${review.user?.firstName}+${review.user?.lastName}&background=random`;
  }

  getBookingsCount(station: Station): number {
    return this.stationStats().get(station.id)?.bookings || 0;
  }

  getRevenue(station: Station): number {
    return this.stationStats().get(station.id)?.revenue || 0;
  }

  getAddress(station: Station): string { return getStationAddress(station); }
  getPower(station: Station): number { return getStationPower(station); }
  getPrice(station: Station): number { return getStationPrice(station); }

  // --- ACTIONS (Signaux Purs - Mutations) ---

  onSubmitVehicle(): void {
    if (this.vehicleForm.invalid) return;
    this.createVehicleMutation.mutate(this.vehicleForm.value);
  }

  deleteVehicle(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer le véhicule',
        message: 'Êtes-vous sûr de vouloir supprimer ce véhicule ?',
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
        icon: 'delete'
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteVehicleMutation.mutate(id);
    });
  }

  removeFavorite(stationId: number): void {
    this.toggleFavoriteMutation.mutate(stationId);
  }

  deleteStation(station: Station): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer la borne',
        message: `Êtes-vous sûr de vouloir supprimer la borne "${station.name}" ?`,
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
        icon: 'delete'
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteStationMutation.mutate(station.id);
    });
  }

  onUpcomingPageChange(event: PageEvent): void {
    this.upcomingPageIndex.set(event.pageIndex);
    this.upcomingPageSize.set(event.pageSize);
  }

  onHistoryPageChange(event: PageEvent): void {
    this.historyPageIndex.set(event.pageIndex);
    this.historyPageSize.set(event.pageSize);
  }
}
