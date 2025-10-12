import { Component, inject, signal, computed, ChangeDetectionStrategy, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatTabsModule } from "@angular/material/tabs";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { BookingsService, Booking } from "@core/services/bookings.service";
import { getStationAddress, Station } from "@core/services/stations.service";
import { createPaginatedResource } from "@shared/utils/pagination.util";
import { createMutationResource } from "@shared/utils/mutation.util";
import { ToastService } from "@core/services/toast.service";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";

/**
 * Page liste des réservations de l'utilisateur.
 *
 * Chargement des données via `rxResource`.
 * Calculs dérivés (Upcoming/Completed/Cancelled) via `computed`.
 * Mode "OnPush" strict.
 */
@Component({
  selector: "app-bookings-list",
  
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatDialogModule,
  ],
  templateUrl: "./bookings-list.component.html",
  styleUrl: "./bookings-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingsListComponent {
  private bookingsService = inject(BookingsService);
  private toastService = inject(ToastService);
  private dialog = inject(MatDialog);

  // --- DÉCLENCHEURS ---
  /** Signal de rafraîchissement manuel. */
  readonly refreshTrigger = signal(0);

  // --- ÉTAT DE PAGINATION (Base 0, compatible Material Paginator) ---
  readonly upcomingPageIndex = signal(0);
  readonly upcomingPageSize = signal(5);

  readonly historyPageIndex = signal(0);
  readonly historyPageSize = signal(10);

  // --- MUTATIONS (Signaux Purs) ---
  /** Mutation: Annuler une réservation. */
  readonly cancelBookingMutation = createMutationResource<Booking, number>(
    (id) => this.bookingsService.cancel(id)
  );

  /** Mutation: Télécharger un reçu. */
  readonly receiptMutation = createMutationResource<Blob, number>(
    (id) => this.bookingsService.downloadReceipt(id)
  );

  /** Mutation: Export Excel. */
  readonly exportMutation = createMutationResource<Blob, void>(
    () => this.bookingsService.exportBookings()
  );

  // --- RESSOURCES ---

  /** Réservations à venir (Paginated). */
  readonly upcomingState = createPaginatedResource<Booking, { timeFilter: 'upcoming' }>(
    (params) => this.bookingsService.getMyBookings({ ...params, timeFilter: 'upcoming' }),
    {
      page: this.upcomingPageIndex,
      limit: this.upcomingPageSize,
      refreshTrigger: this.refreshTrigger
    }
  );
  readonly upcomingBookings = this.upcomingState.data;
  readonly upcomingTotal = this.upcomingState.total;
  readonly isLoadingUpcoming = this.upcomingState.loading;

  /** Historique des réservations (Paginated). */
  readonly historyState = createPaginatedResource<Booking, { timeFilter: 'history' }>(
    (params) => this.bookingsService.getMyBookings({ ...params, timeFilter: 'history' }),
    {
      page: this.historyPageIndex,
      limit: this.historyPageSize,
      refreshTrigger: this.refreshTrigger
    }
  );
  readonly historyBookingsRaw = this.historyState.data;
  readonly historyTotal = this.historyState.total;
  readonly isLoadingHistory = this.historyState.loading;

  // --- ÉTAT DÉRIVÉ (Depuis la page d'historique) ---

  /** Réservations terminées (sur la page courante d'historique). */
  readonly completedBookings = computed(() => {
    return this.historyBookingsRaw().filter(b =>
      b.status === "completed" || (new Date(b.endTime) <= new Date() && b.status !== "cancelled" && b.status !== "refused")
    );
  });

  /** Réservations annulées/refusées (sur la page courante d'historique). */
  readonly cancelledBookings = computed(() => {
    return this.historyBookingsRaw().filter(b =>
      b.status === "cancelled" || b.status === "refused"
    );
  });

  /** Indicateur de chargement global. */
  readonly isLoading = computed(() => this.isLoadingUpcoming() || this.isLoadingHistory());

  /** Indicateur d'export en cours. */
  readonly isExporting = signal(false);

  constructor() {
    // Effet : Rafraîchir après une annulation réussie
    effect(() => {
      if (this.cancelBookingMutation.isSuccess()) {
        this.refreshTrigger.update(n => n + 1);
      }
    });

    // Effet : Gérer le téléchargement du reçu
    effect(() => {
      const blob = this.receiptMutation.value();
      if (this.receiptMutation.isSuccess() && blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        // Note : Idéalement on utiliserait l'ID des arguments de mutation, mais ici on génère un nom générique
        link.download = `receipt-${new Date().getTime()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.receiptMutation.reset();
      }
    });

    // Effet : Gérer l'export Excel
    effect(() => {
      const blob = this.exportMutation.value();
      if (this.exportMutation.isSuccess() && blob) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `mes-reservations-${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.exportMutation.reset();
      }
    });

    // Effet : Gérer l'erreur d'export
    effect(() => {
      if (this.exportMutation.isError()) {
        this.toastService.error("Erreur lors de l'export Excel");
        this.isExporting.set(false);
      }
    });

    // Effet : Gérer l'erreur de reçu
    effect(() => {
      if (this.receiptMutation.isError()) {
        this.toastService.error("Erreur lors du téléchargement du reçu");
      }
    });
  }

  // --- ACTIONS ---

  onTabChange(_index: number): void {
    // Logique optionnelle
  }

  /**
   * Annule une réservation.
   */
  cancelBooking(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Annuler la réservation',
        message: 'Êtes-vous sûr de vouloir annuler cette réservation ?',
        confirmLabel: 'Annuler',
        confirmColor: 'warn',
        icon: 'cancel'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.cancelBookingMutation.mutate(id);
      }
    });
  }

  onUpcomingPageChange(event: PageEvent) {
    this.upcomingPageIndex.set(event.pageIndex);
    this.upcomingPageSize.set(event.pageSize);
  }

  onHistoryPageChange(event: PageEvent) {
    this.historyPageIndex.set(event.pageIndex);
    this.historyPageSize.set(event.pageSize);
  }

  /**
   * Télécharge le reçu d'une réservation.
   */
  downloadReceipt(id: number): void {
    this.receiptMutation.mutate(id);
  }

  /**
   * Exporte les réservations en Excel.
   */
  exportExcel(): void {
    this.isExporting.set(true);
    this.exportMutation.mutate();
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
}
