import { Component, inject, ChangeDetectionStrategy, computed, effect } from "@angular/core";
import { toSignal, rxResource } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDividerModule } from "@angular/material/divider";
import {
  StationsService,
  Station,
  getStationAddress,
  getStationPower,
  getStationPrice,
} from "@core/services/stations.service";
import { BookingsService, Booking, CreateBookingDto } from "@core/services/bookings.service";
import { MatSelectModule } from "@angular/material/select";
import { VehiclesService, Vehicle } from "@core/services/vehicles.service";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";

interface BusySlot {
  startDatetime: string;
  endDatetime: string;
}

/**
 * Page de création d'une réservation.
 * 
 * rxResource pour les chargements (Stations, Véhicules, Créneaux occupés).
 * Suivi automatique des dépendances.
 * Gestion réactive du formulaire.
 */
@Component({
  selector: "app-booking-create",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
  ],
  templateUrl: "./booking-create.component.html",
  styleUrl: "./booking-create.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingCreateComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private stationsService = inject(StationsService);
  private bookingsService = inject(BookingsService);
  private vehiclesService = inject(VehiclesService);
  private toastService = inject(ToastService);

  // --- MUTATION (Pure Signals) ---
  /**
   * Mutation pour créer une réservation.
   * Remplace le pattern subscribe manuel.
   */
  readonly createBookingMutation = createMutationResource<Booking, CreateBookingDto>(
    (bookingData) => this.bookingsService.create(bookingData)
  );

  /** Alias pour isLoading (backward compatibility). */
  readonly isSubmitting = this.createBookingMutation.isLoading;

  /** Date minimum (Aujourd'hui, ou Demain si > 22h). */
  readonly minDate = (() => {
    const d = new Date();
    if (d.getHours() >= 22) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  })();

  /** Validateur : endTime doit être > startTime. */
  private timeRangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const startTime = group.get("startTime")?.value;
    const endTime = group.get("endTime")?.value;
    if (!startTime || !endTime) return null;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      return { invalidTimeRange: true };
    }
    return null;
  }

  // --- FORM ---

  bookingForm: FormGroup = this.fb.group({
    date: [null, [Validators.required]],
    startTime: ["", [Validators.required, Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
    endTime: ["", [Validators.required, Validators.pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
    vehicleId: [null],
  }, { validators: this.timeRangeValidator });

  // --- ROUTE & SIGNALS ---

  private paramMap = toSignal(this.route.paramMap);

  /** ID de la station dérivé de la route. */
  readonly stationId = computed(() => {
    const id = this.paramMap()?.get("stationId");
    return id ? Number(id) : null;
  });

  /** Signal de la date sélectionnée dans le formulaire (pour rxResource). */
  readonly selectedDate = toSignal(this.bookingForm.get("date")!.valueChanges, { initialValue: null });

  // --- RESOURCES ---

  // 1. Station Resource
  /** 
   * Ressource de la station ciblée.
   * Dépend de `stationId`. 
   */
  readonly stationResource = rxResource<Station | null, unknown>({
    stream: () => {
      const id = this.stationId();
      if (!id) return of(null);
      return this.stationsService.getById(id).pipe(
        catchError(() => {
          this.router.navigate(["/stations"]);
          return of(null);
        })
      );
    }
  });

  /** View Model Station. */
  readonly station = computed(() => this.stationResource.value());

  /** Chargement Station. */
  readonly isLoadingStation = computed(() => this.stationResource.isLoading());


  // 2. User Vehicles Resource
  /** 
   * Ressource des véhicules de l'utilisateur. 
   */
  readonly vehiclesResource = rxResource<Vehicle[], unknown>({
    stream: () => this.vehiclesService.getAll().pipe(catchError(() => of([])))
  });

  /** View Model Véhicules. */
  readonly userVehicles = computed(() => this.vehiclesResource.value() ?? []);


  // 3. Busy Slots Resource
  /** 
   * Ressource des créneaux occupés.
   * Dépend implicitement de `selectedDate` et `stationId`.
   * Se recharge automatiquement si la date ou la station change.
   */
  readonly busySlotsResource = rxResource<BusySlot[], unknown>({
    stream: () => {
      const date = this.selectedDate();
      const stId = this.stationId();

      if (!date || !stId) return of([]);

      const d = date instanceof Date ? date : new Date(date);
      return this.bookingsService.getBusySlots(stId, d.toISOString()).pipe(
        catchError(() => of([]))
      );
    }
  });

  /** View Model Créneaux Occupés. */
  readonly busySlots = computed(() => this.busySlotsResource.value() ?? []);


  // --- HELPERS & LOGIC ---

  constructor() {
    // Effect: Handle Mutation Success
    effect(() => {
      const booking = this.createBookingMutation.value();
      if (this.createBookingMutation.isSuccess() && booking) {
        this.toastService.success("Réservation créée avec succès !");
        this.router.navigate(["/bookings", booking.id]);
      }
    });

    // Effect: Handle Mutation Error
    effect(() => {
      const error = this.createBookingMutation.error() as any;
      if (this.createBookingMutation.isError() && error) {
        const message = error.error?.message || "Erreur lors de la réservation";
        this.toastService.error(message);
      }
    });
  }

  isBusy(slotStart: string, slotEnd: string): string {
    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    const format = (d: Date) =>
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${format(start)} - ${format(end)}`;
  }

  /** Vérifie si la plage horaire sélectionnée chevauche un créneau occupé. */
  overlapsBusySlot(): boolean {
    const { date, startTime, endTime } = this.bookingForm.value;
    const slots = this.busySlots();
    if (!date || !startTime || !endTime || !slots || slots.length === 0)
      return false;

    const baseDate = new Date(date);
    const start = new Date(baseDate);
    const [sH, sM] = startTime.split(":").map(Number);
    start.setHours(sH, sM, 0, 0);

    const end = new Date(baseDate);
    const [eH, eM] = endTime.split(":").map(Number);
    end.setHours(eH, eM, 0, 0);

    return slots.some((slot: BusySlot) => {
      const busyStart = new Date(slot.startDatetime);
      const busyEnd = new Date(slot.endDatetime);
      return start < busyEnd && end > busyStart;
    });
  }

  /** Vérifie si l'horaire est dans le passé. */
  isInPast(): boolean {
    const { date, startTime } = this.bookingForm.value;
    if (!date || !startTime) return false;

    const baseDate = new Date(date);
    const now = new Date();
    const isToday = baseDate.toDateString() === now.toDateString();

    if (isToday) {
      const [h, m] = startTime.split(":").map(Number);
      const selectedTime = new Date(now);
      selectedTime.setHours(h, m, 0, 0);
      return selectedTime < now;
    }
    return false;
  }

  /** Vérifie si la durée est < 30 minutes. */
  isDurationTooShort(): boolean {
    const { startTime, endTime } = this.bookingForm.value;
    if (!startTime || !endTime) return false;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = endMinutes - startMinutes;

    return duration > 0 && duration < 30;
  }

  /** Vérifie les horaires d'ouverture (06h00 - 22h00). */
  isOutsideHours(): boolean {
    const { startTime, endTime } = this.bookingForm.value;

    // Check validation separately if values exist

    if (startTime) {
      const [sH] = startTime.split(":").map(Number);
      if (sH < 6 || sH >= 22) return true;
    }

    if (endTime) {
      const [eH, eM] = endTime.split(":").map(Number);
      if (eH > 22 || (eH === 22 && eM > 0)) return true;
    }

    return false;
  }

  onVehicleSelect(): void {
    const vehicleId = this.bookingForm.get("vehicleId")?.value;
    const vehicles = this.userVehicles();
    const vehicle = vehicles?.find((v) => v.id === vehicleId);

    if (vehicle) {
      this.toastService.info(
        `Véhicule sélectionné : ${vehicle.brand} ${vehicle.model}`
      );
    }
  }

  calculateDuration(): number {
    const start = this.bookingForm.get("startTime")?.value;
    const end = this.bookingForm.get("endTime")?.value;

    if (!start || !end) return 0;

    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return Math.max(0, endMinutes - startMinutes);
  }

  calculateTotal(): number {
    const s = this.station();
    if (!s) return 0;
    const duration = this.calculateDuration();
    const hours = duration / 60;
    return hours * this.getPrice(s);
  }

  // --- GETTERS (STATION) ---

  getAddress(station: Station): string {
    return getStationAddress(station);
  }

  getPower(station: Station): number {
    return getStationPower(station);
  }

  getPrice(station: Station): number {
    return getStationPrice(station);
  }

  goBack(): void {
    const s = this.station();
    if (s) {
      this.router.navigate(["/stations", s.id]);
    } else {
      this.router.navigate(["/stations"]);
    }
  }

  // --- ACTIONS (WRITE) ---

  onSubmit(): void {
    if (this.bookingForm.invalid || !this.station()) return;

    const { date, startTime, endTime, vehicleId } = this.bookingForm.value;
    const s = this.station()!;

    const baseDate = date instanceof Date ? date : new Date(date);

    const startDateTime = new Date(baseDate);
    const [startH, startM] = startTime.split(":").map(Number);
    startDateTime.setHours(startH, startM, 0, 0);

    const endDateTime = new Date(baseDate);
    const [endH, endM] = endTime.split(":").map(Number);
    endDateTime.setHours(endH, endM, 0, 0);

    // Ensure ID is number
    const stationId = typeof s.id === "string" ? parseInt(s.id, 10) : s.id;

    // Use mutation instead of manual subscribe
    this.createBookingMutation.mutate({
      stationId,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      vehicleId: vehicleId || undefined,
    });
  }
}
