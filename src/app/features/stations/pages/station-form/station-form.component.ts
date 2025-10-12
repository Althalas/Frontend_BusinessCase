import { Component, inject, signal, ChangeDetectionStrategy, effect } from "@angular/core";
import { toSignal, rxResource } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSelectModule } from "@angular/material/select";
import { MatIconModule } from "@angular/material/icon";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatRadioModule } from "@angular/material/radio";
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  filter,
  catchError,
  map
} from "rxjs/operators";
import { of } from "rxjs";
import { AddressService, AddressResult } from "@core/services/address.service";
import { StationsService, UserLocation, Station } from "@core/services/stations.service";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";

/**
 * Formulaire de création/édition d'une borne.
 * Refactorisé vers "Pure Signals".
 * - Flux Réactif pour la recherche d'adresse.
 * - Action de Sauvegarde Réactive.
 * - État de chargement basé sur Signal.
 */
@Component({
  selector: "app-station-form",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatRadioModule
  ],
  templateUrl: "./station-form.component.html",
  styleUrl: "./station-form.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly stationsService = inject(StationsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly addressService = inject(AddressService);

  readonly isEditing = signal(false);
  private stationId = signal<number | null>(null);

  // Logique de Réutilisation de Lieu
  readonly locationMode = signal<'NEW' | 'EXISTING'>('NEW'); // Default to new
  readonly selectedLocationId = signal<number | null>(null);

  // --- MUTATION (Signaux Purs) ---
  /**
   * Mutation pour créer/mettre à jour une borne.
   * Remplace le pattern Subject + subscribe.
   */
  readonly saveMutation = createMutationResource<Station, { isEditing: boolean; stationId: number | null; formValue: Record<string, unknown> }>(
    (args) => {
      const request$ = args.isEditing && args.stationId
        ? this.stationsService.update(args.stationId, args.formValue)
        : this.stationsService.create(args.formValue);

      return request$.pipe(
        switchMap((res) => this.authService.refreshProfile().pipe(map(() => res)))
      );
    }
  );

  /** Alias pour isLoading (backward compatibility). */
  readonly isSubmitting = this.saveMutation.isLoading;

  stationForm: FormGroup = this.fb.group({
    name: ["", Validators.required],
    // Address fields
    address: ["", Validators.required],
    postalCode: ["", Validators.required],
    city: ["", Validators.required],
    latitude: [null, Validators.required],
    longitude: [null, Validators.required],

    power: [null, [Validators.required, Validators.min(0)]],
    connector: ["TYPE2", Validators.required],
    pricePerKwh: [null, [Validators.required, Validators.min(0)]],
    instructions: [""],
    isOnStand: [false],
    photos: this.fb.array([this.fb.control("")]),
  });

  // Ressource pour les Lieux Utilisateur
  readonly locationsResource = rxResource<UserLocation[], unknown>({
    stream: () => this.stationsService.getMyLocations().pipe(
      catchError(() => of([]))
    )
  });

      // Flux d'Autocomplétion d'Adresse
  readonly addressOptions = toSignal(
    this.stationForm.get("address")!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      filter((value) => typeof value === "string" && value.length > 2 && this.locationMode() === 'NEW'), // Recherche uniquement en mode NEW
      switchMap((value) => this.addressService.searchAddress(value)),
      catchError(() => of([]))
    ),
    { initialValue: [] }
  );

  constructor() {
    // 1. Chargement Initial des Données (Paramètres Route)
    const id = this.route.snapshot.paramMap.get("id");
    const qParams = this.route.snapshot.queryParams;

    if (id) {
      this.stationId.set(Number(id));
      this.isEditing.set(true);
      this.loadStation(Number(id));
      this.locationMode.set('NEW');
    }

    if (qParams['lat'] && qParams['lng']) {
      this.stationForm.patchValue({
        latitude: Number(qParams['lat']),
        longitude: Number(qParams['lng']),
      });
    }

    // 2. Effet : Gestion Succès Mutation
    effect(() => {
      if (this.saveMutation.isSuccess()) {
        this.toastService.success(
          this.isEditing() ? "Borne mise à jour avec succès" : "Borne créée avec succès"
        );
        this.router.navigate(["/stations"]);
      }
    });

    // 3. Effet : Gestion Erreur Mutation
    effect(() => {
      if (this.saveMutation.isError()) {
        this.toastService.error(
          this.isEditing() ? "Erreur lors de la mise à jour" : "Erreur lors de la création"
        );
      }
    });
  }

  get photos() {
    return this.stationForm.get("photos") as FormArray;
  }

  loadStation(id: number): void {
    // On garde le subscribe ici car c'est une action "One-shot" à l'init.
    this.stationsService.getById(id).subscribe({
      next: (station) => {
        this.stationForm.patchValue({
          name: station.name,
          address: station.location?.address || "",
          postalCode: station.location?.postalCode || "",
          city: station.city || station.location?.city || "",
          latitude: station.latitude,
          longitude: station.longitude,
          power: station.powerKw,
          connector: station.connectorType || "TYPE2",
          pricePerKwh: station.pricing?.[0]?.hourlyRate || 0,
          instructions: station.instructions || "",
          isOnStand: station.isOnStand || false,
        });

        this.photos.clear();
        this.photos.push(this.fb.control(""));
      },
      error: () => {
        this.toastService.error("Erreur lors du chargement de la borne");
        this.router.navigate(["/stations"]);
      },
    });
  }

  onLocationModeChange(mode: 'NEW' | 'EXISTING'): void {
    this.locationMode.set(mode);
    if (mode === 'NEW') {
      this.selectedLocationId.set(null);
      this.stationForm.patchValue({
        address: '',
        postalCode: '',
        city: '',
        latitude: null,
        longitude: null
      });
      this.stationForm.get('address')?.enable();
      this.stationForm.get('postalCode')?.enable();
      this.stationForm.get('city')?.enable();
    }
  }

  onExistingLocationSelected(locationId: number): void {
    this.selectedLocationId.set(locationId);
    const loc = this.locationsResource.value()?.find(l => l.id === locationId);
    if (loc) {
      this.stationForm.patchValue({
        address: loc.address,
        postalCode: loc.postalCode,
        city: loc.city,
        latitude: loc.latitude,
        longitude: loc.longitude
      });
      // Désactiver les champs pour empêcher l'édition quand "Existant" est sélectionné
    }
  }

  onAddressSelected(event: MatAutocompleteSelectedEvent): void {
    const address: AddressResult = event.option.value;
    this.stationForm.patchValue({
      address: address.label,
      postalCode: address.postcode,
      city: address.city,
      latitude: address.lat,
      longitude: address.long,
    });
  }

  displayAddress(address: AddressResult | string): string {
    if (typeof address === "string") return address;
    return address?.label || "";
  }

  addPhoto(): void {
    this.photos.push(this.fb.control(""));
  }

  removePhoto(index: number): void {
    this.photos.removeAt(index);
  }

  onPhotoSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.error(`L'image ${file.name} est trop lourde (> 5Mo).`);
      input.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.toastService.error("Seules les images sont acceptées.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photos.at(index).setValue(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.stationForm.invalid) return;

    const formValue = { ...this.stationForm.value };
    // Filter out empty photo URLs
    formValue.photos = formValue.photos.filter((p: string) => p.trim() !== "");

    // Si réutilisation de lieu, ajouter locationId
    if (this.locationMode() === 'EXISTING' && this.selectedLocationId()) {
      formValue.locationId = this.selectedLocationId();
    }

    this.saveMutation.mutate({
      isEditing: this.isEditing(),
      stationId: this.stationId(),
      formValue
    });
  }
}
