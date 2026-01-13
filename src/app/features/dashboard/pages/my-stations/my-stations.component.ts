import { Component, inject, signal, ChangeDetectionStrategy, computed, effect, DestroyRef } from "@angular/core";
import { rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatMenuModule } from "@angular/material/menu";
import {
  StationsService,
  Station,
  getStationAddress,
  getStationPower,
  getStationPrice,
} from "@core/services/stations.service";
import { BookingsService, Booking } from "@core/services/bookings.service";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";
import { of, forkJoin } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";

/**
 * Page de gestion des bornes pour les propriétaires (Owners).
 * 
 * Utilise rxResource pour le chargement des stations.
 * Gestion du rafraîchissement après suppression.
 */
@Component({
  selector: "app-my-stations",
  
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDialogModule,
  ],
  templateUrl: "./my-stations.component.html",
  styleUrl: "./my-stations.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyStationsComponent {
  private stationsService = inject(StationsService);
  private bookingsService = inject(BookingsService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  // --- DÉCLENCHEURS ---
  /** Signal pour rafraîchir la liste après une action. */
  readonly refreshTrigger = signal(0);

  // --- MUTATIONS (Signaux Purs) ---

  /** Mutation: Supprimer une station. */
  readonly deleteStationMutation = createMutationResource<void, number>(
    (id) => this.stationsService.delete(id)
  );

  constructor() {
    // Effet : Gérer le succès de la suppression
    effect(() => {
      if (this.deleteStationMutation.isSuccess()) {
        this.toastService.success("Borne supprimée");
        this.refreshTrigger.update(n => n + 1);
      }
    });

    // Effet : Gérer l'erreur de suppression
    effect(() => {
      const error = this.deleteStationMutation.error() as any;
      if (this.deleteStationMutation.isError() && error) {
        const message = error.error?.message || "Erreur lors de la suppression";
        this.toastService.error(message);
      }
    });
  }

  // --- RESSOURCES ---

  /** Interface pour les données combinées stations + stats */
  private stationsWithStats = signal<{
    stations: Station[];
    stats: Map<number, { bookings: number; revenue: number }>;
  }>({ stations: [], stats: new Map() });

  /** Ressource des stations de l'utilisateur avec leurs stats. */
  readonly stationsResource = rxResource<{ stations: Station[]; stats: Map<number, { bookings: number; revenue: number }> }, unknown>({
    stream: () => {
      this.refreshTrigger(); // Dependency
      return this.stationsService.getMyStations().pipe(
        switchMap(stations => {
          if (stations.length === 0) {
            return of({ stations: [], stats: new Map() });
          }
          // Charger les bookings pour chaque station en parallèle
          const bookingRequests = stations.map(s =>
            this.bookingsService.getStationBookings(s.id).pipe(
              catchError(() => of([] as Booking[]))
            )
          );
          return forkJoin(bookingRequests).pipe(
            map(allBookings => {
              const stats = new Map<number, { bookings: number; revenue: number }>();
              stations.forEach((station, index) => {
                const stationBookings = allBookings[index];
                const completedBookings = stationBookings.filter(b => b.status === 'completed');
                const revenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
                stats.set(station.id, {
                  bookings: stationBookings.length,
                  revenue: revenue
                });
              });
              return { stations, stats };
            })
          );
        }),
        catchError(() => of({ stations: [], stats: new Map() }))
      );
    }
  });

  /** Liste des stations. */
  readonly stations = computed(() => this.stationsResource.value()?.stations ?? []);

  /** État de chargement. */
  readonly isLoading = computed(() => this.stationsResource.isLoading());

  /** Stats des stations (bookings count et revenue). */
  readonly stationStats = computed(() => this.stationsResource.value()?.stats ?? new Map());

  // --- UTILITAIRES ---

  isAdmin(): boolean {
    return this.authService.isAdmin();
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

  // --- ACTIONS ---

  /**
   * Supprime une station après confirmation.
   */
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
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed) this.deleteStationMutation.mutate(station.id);
    });
  }
}
