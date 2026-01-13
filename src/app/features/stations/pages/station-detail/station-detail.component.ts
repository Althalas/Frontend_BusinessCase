import { Component, computed, inject, signal, DestroyRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { rxResource, toSignal, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTableModule } from "@angular/material/table";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatSelectModule } from "@angular/material/select";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";
import { AuthService } from "@core/services/auth.service";
import {
  StationsService,
  Station,
  getStationAddress,
  getStationPrice,
  getStationPower,
  getStationStatus
} from "@core/services/stations.service";
import { BookingsService, Booking } from "@core/services/bookings.service";
import { ReviewFormComponent } from "../../components/review-form/review-form.component";
import { ReviewListComponent } from "@features/stations/components/review-list/review-list.component";
import { StationMapComponent } from "@shared/components/station-map/station-map.component";
import { StatusBadgeComponent } from "@shared/components/status-badge/status-badge.component";
import { ReportDialogComponent } from "@shared/components/report-dialog/report-dialog.component";
import { ReportsService } from "@core/services/reports.service";

import { ReservationDetailsDialogComponent } from "@shared/components/reservation-details-dialog/reservation-details-dialog.component";
import { ReasonDialogComponent } from "@shared/components/reason-dialog/reason-dialog.component";
import { catchError, of } from "rxjs";
import { ToastService } from "@core/services/toast.service";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";

/**
 * Page de détail d'une borne.
 * 
 * Utilisation de rxResource pour le chargement des données Station et Réservations.
 * Gestion purement réactive via Signals.
 * Documentation française complète.
 */
@Component({
  selector: "app-station-detail",
  
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    RouterLink,
    ReviewListComponent,
    StationMapComponent,
    StatusBadgeComponent
  ],
  templateUrl: "./station-detail.component.html",
  styleUrl: "./station-detail.component.scss",
})
export class StationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stationsService = inject(StationsService);
  private readonly bookingsService = inject(BookingsService);
  public readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toastService = inject(ToastService);
  private readonly reportsService = inject(ReportsService);
  private readonly destroyRef = inject(DestroyRef);

  displayedBookingColumns = ["renter", "dates", "amount", "status", "actions"];

  /** Signal déclencheur pour le rafraîchissement manuel des données. */
  readonly refreshTrigger = signal(0);

  // --- ROUTE & IDS ---
  /** Paramètres de route convertis en Signal. */
  private paramMap = toSignal(this.route.paramMap);

  /** ID de la station dérivé de la route. */
  readonly stationId = computed(() => {
    const id = this.paramMap()?.get("id");
    return id ? Number(id) : null;
  });

  // --- RESOURCES ---

  /** 
   * Ressource Principale : Données de la Station.
   * Dépend de `stationId` et `refreshTrigger`.
   */
  readonly stationResource = rxResource<Station | null, unknown>({
    stream: () => {
      const id = this.stationId();
      this.refreshTrigger(); // Track refresh

      if (!id) return of(null);

      return this.stationsService.getById(id).pipe(
        catchError(() => {
          this.router.navigate(["/stations"]);
          return of(null);
        })
      );
    }
  });

  /** Raccourci vers la valeur de la station (pour compatibilité template). */
  readonly station = computed(() => this.stationResource.value());

  /** Indicateur de chargement global (Station). */
  readonly isLoading = computed(() => this.stationResource.isLoading());

  // --- DERIVED STATE ---

  /** Vérifie si l'utilisateur courant est le propriétaire de la borne. */
  readonly isOwner = computed(() => {
    const user = this.authService.currentUser();
    const s = this.station();
    return !!(user && s?.location?.userId === user.id);
  });

  /** Vérifie si l'utilisateur est administrateur. */
  readonly isAdmin = computed(() => this.authService.isAdmin());

  /** 
   * Ressource Secondaire : Réservations de la Station.
   * Dépend de l'existence de la station et des droits (Propriétaire/Admin).
   */
  readonly bookingsResource = rxResource<Booking[], unknown>({
    stream: () => {
      const s = this.station();
      this.refreshTrigger(); // Track refresh
      const user = this.authService.currentUser(); // Signal track
      if (!s || !user) return of([]);

      const isOwner = s.location?.userId === user.id;
      
      // Réplication de la logique originale :
      // On vérifie si l'utilisateur est admin via le service (Signal ou méthode).
      const isAdmin = this.authService.isAdmin();

      if (isOwner || isAdmin) {
        return this.bookingsService.getStationBookings(s.id).pipe(
          catchError(() => of([]))
        );
      }
      return of([]);
    }
  });

  /** Raccourci pour les réservations. */
  readonly bookings = computed(() => this.bookingsResource.value() ?? []);

  // --- ACTIONS ---

  /**
   * Accepte une réservation.
   * @param booking La réservation à accepter.
   */
  acceptBooking(booking: Booking) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Accepter la réservation',
        message: 'Voulez-vous accepter cette réservation ?',
        confirmLabel: 'Accepter',
        confirmColor: 'primary',
        icon: 'check_circle'
      }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed) {
        this.bookingsService.updateStatus(booking.id, "accepted").pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => this.refreshTrigger.update(n => n + 1),
          error: (err) => this.toastService.error(err.error?.message || "Erreur lors de l'acceptation"),
        });
      }
    });
  }

  /**
   * Refuse une réservation avec un motif.
   * @param booking La réservation à refuser.
   */
  refuseBooking(booking: Booking) {
    const dialogRef = this.dialog.open(ReasonDialogComponent, {
      width: "400px",
      data: {
        title: "Refuser la réservation",
        message: "Veuillez indiquer le motif du refus :",
        confirmLabel: "Refuser",
        required: true,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reason) => {
      if (reason) {
        this.bookingsService
          .updateStatus(booking.id, "refused", reason)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.refreshTrigger.update(n => n + 1),
            error: (err) => this.toastService.error(err.error?.message || "Erreur lors du refus"),
          });
      }
    });
  }

  /**
   * Ouvre la modale pour laisser un avis.
   */
  openReviewDialog() {
    const s = this.station();
    if (!s) return;

    const dialogRef = this.dialog.open(ReviewFormComponent, {
      width: "500px",
      data: { stationId: s.id },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.refreshTrigger.update(n => n + 1);
      }
    });
  }

  /**
   * Ouvre la modale de signalement.
   */
  openReport() {
    const s = this.station();
    if (!s) return;

    const dialogRef = this.dialog.open(ReportDialogComponent, {
      width: "500px",
      data: {
        type: "station",
        targetId: s.id,
        targetName: s.name,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.reportsService
          .createReport({
            targetStationId: s.id,
            reason: result.reason,
            description: result.description,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.toastService.success("Signalement envoyé avec succès"),
            error: (err) => this.toastService.error(err.error?.message || "Erreur lors du signalement"),
          });
      }
    });
  }

  /**
   * Affiche les détails complets d'une réservation.
   * @param booking Réservation à visualiser.
   */
  viewBooking(booking: Booking) {
    const s = this.station();
    if (!s) return;
    this.dialog.open(ReservationDetailsDialogComponent, {
      width: "500px",
      data: {
        id: booking.id,
        stationName: s.name,
        stationCity: s.city,
        renterName: booking.renter
          ? `${booking.renter.firstName} ${booking.renter.lastName}`
          : `User #${booking.userId}`,
        renterEmail: booking.renter?.email || "N/A",
        startDatetime: booking.startTime,
        endDatetime: booking.endTime,
        totalAmount: booking.totalPrice,
        status: booking.status,
        cancellationReason: (booking as any).cancellationReason,
        refusedBy: (booking as any).refusedBy,
        cancelledBy: (booking as any).cancelledBy,
      },
    });
  }

  // --- HELPERS ---

  getAddress(station: Station): string {
    return getStationAddress(station);
  }

  getPower(station: Station): number {
    return getStationPower(station);
  }

  getPrice(station: Station): number {
    return getStationPrice(station);
  }

  /**
   * Désactive la borne avec un motif.
   */
  deactivateStation() {
    const s = this.station();
    if (!s) return;
    const dialogRef = this.dialog.open(ReasonDialogComponent, {
      width: "400px",
      data: {
        title: "Désactiver la borne",
        message:
          "Veuillez indiquer la raison de la désactivation (sera visible par l'utilisateur) :",
        confirmLabel: "Désactiver",
        required: true,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((reason) => {
      if (reason) {
        this.stationsService.deactivate(s.id, reason).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => {
            this.refreshTrigger.update(n => n + 1);
            this.toastService.success("Borne désactivée");
          },
          error: (err) => this.toastService.error(err.error?.message || "Erreur lors de la désactivation"),
        });
      }
    });
  }

  toggleAvailability(): void {
    const s = this.station();
    if (!s) return;
    const newStatus = !s.isAvailable;
    this.updateStatus(newStatus ? 'AVAILABLE' : 'BUSY');
  }

  /**
   * Met à jour le statut de la borne (Pour le Propriétaire).
   * AVAILABLE -> isAvailable=true
   * BUSY -> isAvailable=false (Indisponible/Occupé)
   * OFFLINE -> isActive=false (Hors ligne)
   */
  updateStatus(newStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE'): void {
    const s = this.station();
    if (!s) return;

    let updates: { isAvailable?: boolean; isActive?: boolean } = {};

    switch (newStatus) {
      case 'AVAILABLE':
        updates = { isAvailable: true, isActive: true };
        break;
      case 'BUSY':
        updates = { isAvailable: false, isActive: true };
        break;
      case 'OFFLINE':
        updates = { isActive: false };
        break;
    }

    this.stationsService.update(s.id, updates).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.toastService.success("Statut mis à jour");
        this.stationResource.reload();
      },
      error: (err) => {
        this.toastService.error(err.error?.message || "Erreur lors de la mise à jour");
      }
    });
  }

  // Duplicates removed


  // View Helpers for Status (used by Select)
  getCurrentStatus(station: Station): 'AVAILABLE' | 'BUSY' | 'OFFLINE' {
    return getStationStatus(station);
  }

  goBack(): void {
    this.router.navigate(["/stations"]);
  }

  /**
   * Bascule la disponibilité de la borne.
   * (Déprécié par le sélecteur, mais gardé pour bouton rapide si besoin ou supprimé si redondant)
   * Redirige vers updateStatus.
   */
  // toggleAvailability() removed in favor of updateStatus logic above

}
