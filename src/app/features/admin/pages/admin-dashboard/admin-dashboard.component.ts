import { Component, inject, signal, ChangeDetectionStrategy, computed, effect, DestroyRef } from "@angular/core";
import { toSignal, toObservable, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { createPaginatedResource, PageMeta } from "@shared/utils/pagination.util";
import { createMutationResource } from "@shared/utils/mutation.util";
import { CommonModule } from "@angular/common";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { MatChipsModule } from "@angular/material/chips";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialogModule, MatDialog } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { ReactiveFormsModule, FormControl } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { environment } from "@env/environment";
import { AuthService } from "@core/services/auth.service";
import { ReportsService, Report } from "@core/services/reports.service";
import { StationsService } from "@core/services/stations.service";
import { ReservationDetailsDialogComponent } from "@shared/components/reservation-details-dialog/reservation-details-dialog.component";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";
import { MatPaginatorModule, PageEvent } from "@angular/material/paginator";
import { of } from "rxjs";
import { debounceTime, distinctUntilChanged, startWith, catchError, switchMap } from "rxjs/operators";

// --- INTERFACES ---
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  isValidated: boolean;
  isActive: boolean;
  deletedAt: string | null;
}

interface Station {
  id: number;
  name: string;
  city: string;
  powerKw: number;
  isActive: boolean;
  deletedAt: string | null;
  deletionReason: string | null;
  deletedBy: string | null;
  location: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface Reservation {
  id: number;
  startDatetime: string;
  endDatetime: string;
  totalAmount: number;
  status: string;
  cancellationReason: string | null;
  cancelledBy: string | null;
  refusedBy: string | null;
  renter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  chargingStation: {
    name: string;
    city: string;
  };
}

interface Stats {
  totalUsers: number;
  totalStations: number;
  totalReservations: number;
  pendingReservations: number;
  pendingValidations: number;
}

interface UserResponse {
  data: User[];
  meta: PageMeta;
}

interface StationResponse {
  data: Station[];
  meta: PageMeta;
}

interface ReservationResponse {
  data: Reservation[];
  meta: PageMeta;
}

/**
 * Dashboard Administrateur.
 * 
 * 5 Ressources parallèles (rxResource) pour Utilisateurs, Stations, Réservations, Rapports, Stats.
 * Pagination et Recherche utilisateur réactives.
 * Actions impératives.
 */
@Component({
  selector: "app-admin-dashboard",
  
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatPaginatorModule,
  ],
  templateUrl: "./admin-dashboard.component.html",
  styleUrls: ["./admin-dashboard.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private reportsService = inject(ReportsService);
  private stationsService = inject(StationsService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);
  private apiUrl = environment.apiUrl;

  // --- COLUMNS ---
  displayedUserColumns = ["id", "name", "email", "role", "status", "active", "actions"];
  displayedStationColumns = ["id", "name", "city", "power", "owner", "status", "actions"];
  displayedReservationColumns = ["id", "station", "renter", "dates", "amount", "status", "actions"];
  displayedReportColumns = ["id", "reason", "description", "reporter", "target", "status", "date", "actions"];

  // --- CONTROLS ---
  usersSearchControl = new FormControl("");
  stationsSearchControl = new FormControl("");
  reservationsSearchControl = new FormControl("");

  // --- ÉTATS (Signals) ---

  // Users Pagination
  readonly usersPageSize = signal(10);
  readonly usersPageIndex = signal(0);

  // Stations Pagination
  readonly stationsPageSize = signal(10);
  readonly stationsPageIndex = signal(0);

  // Reservations Pagination
  readonly reservationsPageSize = signal(10);
  readonly reservationsPageIndex = signal(0);

  /** Signaux de déclenchement pour le rafraîchissement manuel. */
  readonly refreshUsers = signal(0);
  readonly refreshStations = signal(0);
  readonly refreshReservations = signal(0);
  readonly refreshReports = signal(0);
  readonly refreshStats = signal(0);

  // --- MUTATIONS (Signaux Purs) ---

  /** Mutation : Basculer le statut utilisateur. */
  readonly toggleUserStatusMutation = createMutationResource<any, number>(
    (userId) => this.http.patch(`${this.apiUrl}/users/${userId}/toggle-status`, {})
  );

  /** Mutation : Mettre à jour le statut du signalement. */
  readonly updateReportStatusMutation = createMutationResource<any, { id: number; status: string }>(
    (args) => this.reportsService.updateStatus(args.id, args.status as any)
  );

  /** Mutation : Désactiver la borne. */
  readonly deactivateStationMutation = createMutationResource<any, { id: number; reason: string }>(
    (args) => this.stationsService.deactivate(args.id, args.reason)
  );

  /** Mutation : Réactiver la borne. */
  readonly reactivateStationMutation = createMutationResource<any, number>(
    (id) => this.http.patch(`${this.apiUrl}/admin/stations/${id}/reactivate`, {})
  );

  /** Mutation : Supprimer la borne (Admin). */
  readonly deleteStationMutation = createMutationResource<any, { id: number; reason: string }>(
    (args) => this.http.delete(`${this.apiUrl}/admin/stations/${args.id}`, { body: { reason: args.reason } })
  );

  /** Mutation : Annuler la réservation. */
  readonly cancelReservationMutation = createMutationResource<any, { id: number; reason: string }>(
    (args) => this.http.patch(`${this.apiUrl}/admin/reservations/${args.id}/cancel`, { reason: args.reason })
  );

  /** Mutation : Approuver la réservation. */
  readonly approveReservationMutation = createMutationResource<any, number>(
    (id) => this.http.patch(`${this.apiUrl}/admin/reservations/${id}/approve`, {})
  );

  /** Mutation : Rejeter la réservation. */
  readonly rejectReservationMutation = createMutationResource<any, { id: number; reason: string }>(
    (args) => this.http.patch(`${this.apiUrl}/admin/reservations/${args.id}/reject`, { reason: args.reason })
  );

  /** Mutation : Supprimer un utilisateur (soft-delete). */
  readonly deleteUserMutation = createMutationResource<any, { id: number; reason: string }>(
    (args) => this.http.delete(`${this.apiUrl}/admin/users/${args.id}`, { body: { reason: args.reason } })
  );

  /** Mutation : Restaurer un utilisateur supprimé. */
  readonly restoreUserMutation = createMutationResource<any, number>(
    (id) => this.http.patch(`${this.apiUrl}/admin/users/${id}/restore`, {})
  );

  /** Signals de recherche avec Debounce (indépendants). */
  readonly usersSearchQuery = toSignal(
    this.usersSearchControl.valueChanges.pipe(
      startWith(""),
      debounceTime(400),
      distinctUntilChanged()
    ),
    { initialValue: "" }
  );

  readonly stationsSearchQuery = toSignal(
    this.stationsSearchControl.valueChanges.pipe(
      startWith(""),
      debounceTime(400),
      distinctUntilChanged()
    ),
    { initialValue: "" }
  );

  readonly reservationsSearchQuery = toSignal(
    this.reservationsSearchControl.valueChanges.pipe(
      startWith(""),
      debounceTime(400),
      distinctUntilChanged()
    ),
    { initialValue: "" }
  );

  constructor() {
    // Reset page index when specific search query changes
    effect(() => {
      this.usersSearchQuery();
      this.usersPageIndex.set(0);
    });

    effect(() => {
      this.stationsSearchQuery();
      this.stationsPageIndex.set(0);
    });

    effect(() => {
      this.reservationsSearchQuery();
      this.reservationsPageIndex.set(0);
    });

    // --- MUTATION EFFECTS ---

    // User status toggle
    effect(() => {
      if (this.toggleUserStatusMutation.isSuccess()) {
        this.refreshUsers.update(n => n + 1);
      }
    });

    // Report status update
    effect(() => {
      if (this.updateReportStatusMutation.isSuccess()) {
        this.refreshReports.update(n => n + 1);
      }
    });

    // Station deactivate
    effect(() => {
      if (this.deactivateStationMutation.isSuccess()) {
        this.refreshStations.update(n => n + 1);
      }
    });

    // Station reactivate
    effect(() => {
      if (this.reactivateStationMutation.isSuccess()) {
        this.refreshStations.update(n => n + 1);
      }
    });

    // Station delete
    effect(() => {
      if (this.deleteStationMutation.isSuccess()) {
        this.refreshStations.update(n => n + 1);
      }
    });

    // Reservation cancel
    effect(() => {
      if (this.cancelReservationMutation.isSuccess()) {
        this.refreshReservations.update(n => n + 1);
      }
    });

    // Reservation approve
    effect(() => {
      if (this.approveReservationMutation.isSuccess()) {
        this.refreshReservations.update(n => n + 1);
      }
    });

    // Reservation reject
    effect(() => {
      if (this.rejectReservationMutation.isSuccess()) {
        this.refreshReservations.update(n => n + 1);
      }
    });

    // User delete
    effect(() => {
      if (this.deleteUserMutation.isSuccess()) {
        this.refreshUsers.update(n => n + 1);
        this.refreshStats.update(n => n + 1);
      }
    });

    // User restore
    effect(() => {
      if (this.restoreUserMutation.isSuccess()) {
        this.refreshUsers.update(n => n + 1);
        this.refreshStats.update(n => n + 1);
      }
    });

  }

  // --- RESOURCES ---

  // 1. Users Resource
  // --- RESOURCES using Generic Utility ---

  // 1. Users (via /admin/users avec includeDeleted pour voir les utilisateurs supprimés)
  readonly usersState = createPaginatedResource<User>(
    (params) => this.http.get<UserResponse>(`${this.apiUrl}/admin/users`, {
      params: { ...params, includeDeleted: 'true' }
    }),
    {
      page: this.usersPageIndex,
      limit: this.usersPageSize,
      search: this.usersSearchQuery,
      refreshTrigger: this.refreshUsers
    }
  );
  readonly users = this.usersState.data;
  readonly totalUsers = this.usersState.total;

  // 2. Stations
  readonly stationsState = createPaginatedResource<Station>(
    (params) => this.http.get<StationResponse>(`${this.apiUrl}/admin/stations`, { params }),
    {
      page: this.stationsPageIndex,
      limit: this.stationsPageSize,
      search: this.stationsSearchQuery,
      refreshTrigger: this.refreshStations
    }
  );
  readonly stations = this.stationsState.data;
  readonly totalStations = this.stationsState.total;

  // 3. Reservations
  readonly reservationsState = createPaginatedResource<Reservation>(
    (params) => this.http.get<ReservationResponse>(`${this.apiUrl}/admin/reservations`, { params }),
    {
      page: this.reservationsPageIndex,
      limit: this.reservationsPageSize,
      search: this.reservationsSearchQuery,
      refreshTrigger: this.refreshReservations
    }
  );
  readonly reservations = this.reservationsState.data;
  readonly totalReservations = this.reservationsState.total;


  // 4. Reports Resource (toObservable pattern for reactive refresh)
  private readonly reportsSource = computed(() => this.refreshReports());
  private readonly reportsSignal = toSignal(
    toObservable(this.reportsSource).pipe(
      switchMap(() => this.reportsService.getAllReports().pipe(catchError(() => of([]))))
    ),
    { initialValue: [] as Report[] }
  );
  readonly reports = computed(() => this.reportsSignal() ?? []);

  // 5. Stats Resource (toObservable pattern for reactive refresh)
  private readonly statsSource = computed(() => this.refreshStats());
  private readonly statsSignal = toSignal(
    toObservable(this.statsSource).pipe(
      switchMap(() => this.http.get<Stats>(`${this.apiUrl}/admin/stats`).pipe(
        catchError(() => of({
          totalUsers: 0,
          totalStations: 0,
          totalReservations: 0,
          pendingReservations: 0,
          pendingValidations: 0,
        }))
      ))
    ),
    { initialValue: { totalUsers: 0, totalStations: 0, totalReservations: 0, pendingReservations: 0, pendingValidations: 0 } }
  );
  readonly stats = computed(() => this.statsSignal() ?? {
    totalUsers: 0,
    totalStations: 0,
    totalReservations: 0,
    pendingReservations: 0,
    pendingValidations: 0,
  });


  // --- ACTIONS ---

  onUsersPageChange(event: PageEvent) {
    this.usersPageIndex.set(event.pageIndex);
    this.usersPageSize.set(event.pageSize);
  }

  onStationsPageChange(event: PageEvent) {
    this.stationsPageIndex.set(event.pageIndex);
    this.stationsPageSize.set(event.pageSize);
  }

  onReservationsPageChange(event: PageEvent) {
    this.reservationsPageIndex.set(event.pageIndex);
    this.reservationsPageSize.set(event.pageSize);
  }

  // No longer needed, as we have 3 distinct controls.
  // toggleSearch() { ... }

  isCurrentUser(user: User): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.id === user.id;
  }

  hasAdminRole(user: User): boolean {
    return user.roles?.includes("admin") || false;
  }

  // --- ACTIONS (Pure Signals - Mutations) ---

  toggleStatus(user: User) {
    this.toggleUserStatusMutation.mutate(user.id);
  }

  async deleteUser(user: User) {
    const reason = await this.promptForReason(
      "Supprimer l'utilisateur",
      `Pourquoi supprimez-vous "${user.firstName} ${user.lastName}" ?`
    );

    if (!reason) return;
    this.deleteUserMutation.mutate({ id: user.id, reason });
  }

  restoreUser(user: User) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Restaurer l\'utilisateur',
        message: `Voulez-vous restaurer le compte de ${user.firstName} ${user.lastName} ?`,
        confirmLabel: 'Restaurer',
        confirmColor: 'primary',
        icon: 'restore'
      }
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed) this.restoreUserMutation.mutate(user.id);
    });
  }

  isUserDeleted(user: User): boolean {
    return !!user.deletedAt;
  }

  updateReportStatus(report: Report, status: "RESOLVED" | "DISMISSED") {
    this.updateReportStatusMutation.mutate({ id: report.id, status });
  }

  async deactivateStation(station: Station) {
    const reason = await this.promptForReason(
      "Désactiver la borne",
      "Veuillez indiquer la raison de la désactivation (sera visible par l'utilisateur) :"
    );

    if (reason) {
      this.deactivateStationMutation.mutate({ id: station.id, reason });
    }
  }

  reactivateStation(station: Station) {
    this.reactivateStationMutation.mutate(station.id);
  }

  async deleteStation(station: Station) {
    const reason = await this.promptForReason(
      "Supprimer la borne",
      `Pourquoi supprimez-vous "${station.name}" ?`
    );

    if (!reason) return;
    this.deleteStationMutation.mutate({ id: station.id, reason });
  }

  async cancelReservation(reservation: Reservation) {
    const reason = await this.promptForReason(
      "Annuler la réservation",
      `Pourquoi annulez-vous cette réservation ?`
    );

    if (!reason) return;
    this.cancelReservationMutation.mutate({ id: reservation.id, reason });
  }

  approveReservation(reservation: Reservation) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Approuver la réservation',
        message: `Voulez-vous approuver cette réservation de ${reservation.renter.firstName} ${reservation.renter.lastName} ?`,
        confirmLabel: 'Approuver',
        confirmColor: 'primary',
        icon: 'check_circle'
      }
    });
    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed) this.approveReservationMutation.mutate(reservation.id);
    });
  }

  async rejectReservation(reservation: Reservation) {
    const reason = await this.promptForReason(
      "Rejeter la réservation",
      `Pourquoi rejetez-vous cette réservation ?`
    );

    if (!reason) return;
    this.rejectReservationMutation.mutate({ id: reservation.id, reason });
  }

  // --- HELPERS ---

  canCancelReservation(reservation: Reservation): boolean {
    return (
      reservation.status !== "cancelled" && reservation.status !== "completed"
    );
  }

  private promptForReason(title: string, message: string): Promise<string | null> {
    return new Promise((resolve) => {
      const reason = prompt(`${title}\n\n${message}`);
      resolve(reason);
    });
  }

  viewReservationDetails(reservation: Reservation) {
    this.dialog.open(ReservationDetailsDialogComponent, {
      width: "500px",
      data: {
        id: reservation.id,
        stationName: reservation.chargingStation.name,
        stationCity: reservation.chargingStation.city,
        renterName: `${reservation.renter.firstName} ${reservation.renter.lastName}`,
        renterEmail: reservation.renter.email,
        startDatetime: reservation.startDatetime,
        endDatetime: reservation.endDatetime,
        totalAmount: reservation.totalAmount,
        status: reservation.status,
        cancellationReason: reservation.cancellationReason,
        refusedBy: reservation.refusedBy,
        cancelledBy: reservation.cancelledBy,
      },
    });
  }

  downloadReceipt(reservationId: number) {
    window.open(`${this.apiUrl}/bookings/${reservationId}/receipt`, "_blank");
  }

  getCancellationTooltip(reservation: Reservation): string {
    const who = reservation.cancelledBy === "admin" ? "ADMIN" : "Utilisateur";
    return `Annulée par ${who}: ${reservation.cancellationReason}`;
  }

  getRefusalTooltip(reservation: Reservation): string {
    const who = reservation.refusedBy === "admin" ? "ADMIN" : "Propriétaire";
    return `Refusée par ${who}: ${reservation.cancellationReason}`;
  }

  getDeletionTooltip(station: Station): string {
    const who = station.deletedBy === "admin" ? "ADMIN" : station.deletedBy || "Inconnu";
    return `Supprimée par ${who}: ${station.deletionReason}`;
  }
}
