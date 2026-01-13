import { Component, inject, computed, ChangeDetectionStrategy, effect, DestroyRef } from "@angular/core";
import { toSignal, rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDividerModule } from "@angular/material/divider";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { BookingsService, Booking } from "@core/services/bookings.service";
import { getStationAddress, Station } from "@core/services/stations.service";
import { PaymentDialogComponent } from "@shared/components/payment-dialog/payment-dialog.component";
import { createMutationResource } from "@shared/utils/mutation.util";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";
import { ToastService } from "@core/services/toast.service";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";

/**
 * Page de détail d'une réservation.
 * 
 * rxResource pour le chargement unifié de la réservation.
 * Réactivité totale aux paramètres de route et actions.
 * Documentation française et typage strict.
 */
@Component({
  selector: "app-booking-detail",
  
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: "./booking-detail.component.html",
  styleUrl: "./booking-detail.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);
  private readonly toastService = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  // Note : Utilisation de rxResource.reload() au lieu de refreshTrigger pour des mises à jour plus fiables

  // --- MUTATIONS (Signaux Purs) ---

  /** Mutation: Annuler une réservation. */
  readonly cancelMutation = createMutationResource<any, number>(
    (id) => this.bookingsService.cancel(id)
  );

  /** Mutation: Payer une réservation. */
  readonly payMutation = createMutationResource<any, number>(
    (id) => this.bookingsService.pay(id)
  );

  /** Mutation: Télécharger un reçu. */
  readonly receiptMutation = createMutationResource<Blob, number>(
    (id) => this.bookingsService.downloadReceipt(id)
  );

  /** État de traitement (dérivé des mutations). */
  readonly isProcessing = computed(() =>
    this.cancelMutation.isLoading() || this.payMutation.isLoading() || this.receiptMutation.isLoading()
  );

  constructor() {
    effect(() => {
      if (this.cancelMutation.isSuccess()) {
        this.toastService.success("Réservation annulée");
        this.bookingResource.reload();
      }
    });

    effect(() => {
      if (this.cancelMutation.isError()) {
        const error = this.cancelMutation.error() as any;
        const message = error.error?.message || "Erreur lors de l'annulation";
        this.toastService.error(message);
      }
    });

    effect(() => {
      if (this.payMutation.isSuccess()) {
        this.toastService.success("Paiement validé avec succès !");
        this.bookingResource.reload();
      }
    });

    effect(() => {
      if (this.payMutation.isError()) {
        const error = this.payMutation.error() as any;
        const message = error.error?.message || "Erreur de paiement";
        this.toastService.error(message);
        // Rafraîchir quand même pour afficher les mises à jour partielles
        this.bookingResource.reload();
      }
    });

    // Effet : Gérer le téléchargement du reçu
    effect(() => {
      const blob = this.receiptMutation.value();
      if (this.receiptMutation.isSuccess() && blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // Idéalement utiliser l'ID de réservation s'il est disponible de manière sûre, sinon nom générique
        link.download = `receipt-${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.receiptMutation.reset();
      }
    });

    effect(() => {
      if (this.receiptMutation.isError()) {
        this.toastService.error("Erreur lors du téléchargement du reçu");
      }
    });
  }

  // --- ROUTE & IDS ---
  /** Paramètres de route réactifs. */
  private paramMap = toSignal(this.route.paramMap);

  /** ID de la réservation dérivé. */
  readonly bookingId = computed(() => {
    const id = this.paramMap()?.get("id");
    return id ? Number(id) : null;
  });

  // --- RESSOURCES ---

  /** 
   * Ressource Principale : Détail de la réservation.
   */
  readonly bookingResource = rxResource<Booking | null, unknown>({
    stream: () => {
      const id = this.bookingId();
      if (!id) return of(null);

      return this.bookingsService.getById(id).pipe(
        catchError(() => {
          this.router.navigate(["/bookings"]);
          return of(null);
        })
      );
    }
  });

  /** View Model de la réservation. */
  readonly booking = computed(() => this.bookingResource.value());

  /** Indicateur de chargement des données. */
  readonly isLoading = computed(() => this.bookingResource.isLoading());

  // --- ACTIONS (Signaux Purs - Mutations) ---

  /**
   * Annule la réservation courante avec confirmation.
   */
  cancelBooking(): void {
    const booking = this.booking();
    if (!booking) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Annuler la réservation',
        message: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
        confirmLabel: 'Annuler la réservation',
        cancelLabel: 'Retour',
        confirmColor: 'warn',
        icon: 'cancel'
      }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed) {
        this.cancelMutation.mutate(booking.id);
      }
    });
  }

  /**
   * Lance le processus de paiement (Stripe).
   */
  processPayment(): void {
    const booking = this.booking();
    if (!booking) return;

    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: "450px",
      disableClose: true,
      data: { amount: booking.totalPrice, bookingId: booking.id },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: any) => {
      if (result) {
        this.bookingResource.reload();
        this.payMutation.mutate(booking.id);
      }
    });
  }

  /**
   * Télécharge le reçu PDF de la réservation.
   */
  downloadReceipt(): void {
    const booking = this.booking();
    if (!booking) return;
    this.receiptMutation.mutate(booking.id);
  }


  // --- UTILITAIRES ---

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: "En attente",
      accepted: "Acceptée",
      refused: "Refusée",
      completed: "Terminée",
      cancelled: "Annulée",
    };
    return labels[status] || status;
  }

  getStationAddressHelper(station: Station): string {
    return getStationAddress(station);
  }

  canCancel(booking: Booking): boolean {
    const isStatusCancellable =
      booking.status === "pending" || booking.status === "accepted";
    const isFuture = new Date(booking.endTime) > new Date();
    return isStatusCancellable && isFuture;
  }
}
