import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy,
  computed
} from "@angular/core";
import { toSignal, toObservable } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { Router, RouterModule } from "@angular/router";
import { StatusBadgeComponent } from "@shared/components/status-badge/status-badge.component";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FormsModule, ReactiveFormsModule, FormControl } from "@angular/forms";
import * as L from "leaflet";
import {
  StationsService,
  Station,
  getStationAddress,
  getStationPrice,
  getStationPower,
  getStationStatus,
  getStationStatusLabel,
} from "@core/services/stations.service";
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { of } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, tap } from "rxjs/operators";
import { AddressService, AddressResult } from "@core/services/address.service";

/**
 * Carte interactive des bornes de recharge.
 *
 * Architecture Réactive :
 * - Gestion des données via `toSignal` (Mode : Chargement initial ou Recherche).
 * - Réactivité totale via Signals (Marqueurs, Position utilisateur).
 * - Intégration Leaflet isolée et pilotée par les effets.
 */
@Component({
  selector: "app-stations-map",
  
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    RouterModule,
    StatusBadgeComponent
  ],
  templateUrl: "./stations-map.component.html",
  styleUrls: ["./stations-map.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StationsMapComponent implements OnInit, AfterViewInit, OnDestroy {
  private stationsService = inject(StationsService);
  private addressService = inject(AddressService);
  private router = inject(Router);

  // --- ÉTATS & SIGNAUX ---
  readonly map = signal<L.Map | null>(null);
  private markers: L.Marker[] = [];
  private userMarker: L.CircleMarker | undefined;

  // Icônes personnalisées
  private icons: Record<string, L.Icon> = {
    AVAILABLE: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }),
    BUSY: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }),
    OFFLINE: L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  };

  /** Formulaire recherche adresse (Autocomplete). */
  readonly addressControl = new FormControl("");

  /** Filtres affichés dans l'autocomplete. */
  readonly filteredAddresses = toSignal(
    this.addressControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((value) => {
        if (typeof value === 'string' && value.length > 2) {
          return this.addressService.searchAddress(value);
        }
        return of([]);
      })
    ),
    { initialValue: [] }
  );

  /** Rayon de recherche en km. */
  readonly searchRadius = signal(10);

  /** 
   * Point d'ancrage de la vue (Centre de recherche).
   * Remplace 'userLocation' et 'searchAddress' séparés.
   */
  readonly viewAnchor = signal<{ lat: number; lng: number, label?: string } | null>(null);

  /** Station actuellement sélectionnée. */
  readonly selectedStation = signal<Station | null>(null);

  readonly searchParams = computed(() => {
    const anchor = this.viewAnchor();
    const radius = this.searchRadius();
    if (anchor) {
      return { lat: anchor.lat, lng: anchor.lng, radius };
    }
    return null;
  });

  /** Etat initial pour UX. */
  readonly isInitialLoad = signal(true);

  /** Bouton "Rechercher ici" affiché après un drag. */
  readonly showRedoButton = signal(false);

  // --- STREAMS ---
  // (Le flux d'autocomplétion d'adresse est défini plus haut)

  // 2. Ressource de Données Principale
  private readonly _isLoading = signal(false);
  readonly isLoading = this._isLoading.asReadonly();

  /**
   * Ressource unifiée des stations.
   * - Si `searchParams` est défini : Recherche géographique.
   * - Sinon : Retourne vide.
   */
  readonly stations = toSignal(
    toObservable(this.searchParams).pipe(
      tap(() => this._isLoading.set(true)),
      switchMap((params) => {
        if (params) {
          this.isInitialLoad.set(false);
          return this.stationsService.search({ ...params, limit: 50 }).pipe(
            map((res) => res.data),
            catchError(() => of([] as Station[])),
            tap(() => this._isLoading.set(false))
          );
        } else {
          this._isLoading.set(false);
          return of([] as Station[]);
        }
      })
    ),
    { initialValue: [] as Station[] }
  );


  // --- EFFETS ---
  constructor() {
    // 1. Gestion du marqueur utilisateur / Ancre
    effect(() => {
      const map = this.map();
      const anchor = this.viewAnchor();

      if (!map || !anchor) return;

      // Supprimer le marqueur utilisateur précédent
      if (this.userMarker) {
        this.userMarker.remove();
        this.userMarker = undefined;
      }

      // Ajouter le nouveau marqueur utilisateur (Cercle Bleu)
      this.userMarker = L.circleMarker([anchor.lat, anchor.lng], {
        radius: 8,
        fillColor: "#2196F3",
        color: "#fff",
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(map);

      // Ajouter popup avec libellé
      if (anchor.label) {
        this.userMarker.bindPopup(`<b>${anchor.label}</b>`).openPopup();
      }

      // Voler vers la position
      map.flyTo([anchor.lat, anchor.lng], 13);
    });

    // 2. Gérer les Marqueurs de Stations
    effect(() => {
      const map = this.map();
      const stations = this.stations();

      if (!map) return;

      // Ajustement auto seulement si ce n'est pas le chargement initial vide
      const shouldAutoFit = stations.length > 0;
      this.addStationMarkers(stations, shouldAutoFit);
    });
  }

  // Icône personnalisée pour les stations
  private stationIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "assets/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  private defaultIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  ngOnInit(): void {
    // Tentative de géolocalisation automatique "Soft" (Silent fail)
    this.getCurrentLocation().catch(() => {
      // Géolocalisation non autorisée ou échouée - Silent fail intentionnel
    });
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.initializeMap();
    });
  }

  ngOnDestroy(): void {
    const map = this.map();
    if (map) {
      map.remove();
    }
  }

  initializeMap(): void {
    const container = document.getElementById("stations-map");
    if (!container) return;

    // Créer l'instance de la carte localement
    const mapInstance = L.map("stations-map").setView([48.8566, 2.3522], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    mapInstance.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const popupContent = `
        <div style="padding: 12px; min-width: 200px; text-align: center;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #2e7d32;">Nouvelle borne</h3>
          <p style="margin: 4px 0 12px 0; font-size: 14px;">Ajouter une borne à cet emplacement ?</p>
          <button
            onclick="window.navigateToCreateStation(${lat}, ${lng})"
            style="padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%; font-weight: 500;"
          >
            Ajouter une borne ici
          </button>
        </div>
      `;
      L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(mapInstance);
    });

    // Détecter les déplacements de la carte pour afficher le bouton "Relancer la recherche"
    mapInstance.on("moveend", () => {
      this.showRedoButton.set(true);
    });

    (window as any).navigateToCreateStation = (lat: number, lng: number) => {
      this.router.navigate(["/stations/new"], { queryParams: { lat, lng } });
    };

    // Si les stations sont chargées avant l'initialisation de la carte
    const currentStations = this.stations();
    if (currentStations.length > 0) {
      // NOTE : Plus besoin d'appeler addStationMarkers directement ici
      // car l'EFFET se lancera dès qu'on set this.map() ci-dessous !
    }

    (window as any).navigateToStation = (id: number) => {
      this.router.navigate(["/stations", id]);
    };

    // Enfin, définir le signal -> Déclenche les effets
    this.map.set(mapInstance);
  }

  // --- ACTIONS ---

  /**
   * Appelé au clic sur "Utiliser ma position".
   */
  getCurrentLocation(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Géolocalisation non supportée");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.viewAnchor.set({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            label: "Votre position"
          });
          this.addressControl.setValue(""); // Reset search input
          resolve();
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }

  /**
   * Lance une recherche au centre de la carte (après un drag).
   */
  searchInArea(): void {
    const map = this.map();
    if (!map) return;
    const center = map.getCenter();
    this.viewAnchor.set({ lat: center.lat, lng: center.lng, label: "Recherche ciblée" });
    this.showRedoButton.set(false);
  }

  selectStation(station: Station): void {
    this.selectedStation.set(station);
    const map = this.map();

    if (map && station.latitude && station.longitude) {
      map.setView([station.latitude, station.longitude], 15);
      const marker = this.markers.find((m) => {
        const latLng = m.getLatLng();
        return latLng.lat === station.latitude && latLng.lng === station.longitude;
      });
      if (marker) marker.openPopup();
    }
  }

  onAddressSelected(event: MatAutocompleteSelectedEvent): void {
    const address: AddressResult = event.option.value;
    this.addressControl.setValue(address.label, { emitEvent: false });

    // Mise à jour Signal -> Déclenche Effect -> Déclenche Resource
    this.viewAnchor.set({
      lat: address.lat,
      lng: address.long,
      label: `Adresse : ${address.label}`
    });
  }

  addStationMarkers(stations: Station[], autoFit: boolean = true): void {
    const map = this.map();
    if (!map) return;

    this.markers.forEach((marker) => marker.remove());
    this.markers = [];

    const bounds = L.latLngBounds([]);

    stations.forEach((station) => {
      if (station.latitude && station.longitude) {
        const status = getStationStatus(station);
        const icon = this.icons[status];

        const popupContent = `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: ${status === 'AVAILABLE' ? '#2e7d32' : '#d32f2f'};">
               ${station.name}
            </h3>
            <div style="margin-bottom: 8px;">
               <span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #eee; font-weight: bold;">
                  ${getStationStatusLabel(station)}
               </span>
            </div>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Adresse:</strong> ${getStationAddress(station)}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Puissance:</strong> ${getStationPower(station)} kW</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Prix:</strong> ${getStationPrice(station)}€/h</p>
            <button
              onclick="window.navigateToStation(${station.id})"
              style="margin-top: 8px; padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; width: 100%;"
            >
              Voir détails
            </button>
          </div>
        `;

        const marker = L.marker([station.latitude, station.longitude], {
          icon: icon,
        })
          .bindPopup(popupContent)
          .addTo(map);

        this.markers.push(marker);
        bounds.extend([station.latitude, station.longitude]);
      }
    });

    if (autoFit && stations.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  displayFn(address: AddressResult): string {
    return address && address.label ? address.label : '';
  }

  getAddress(station: Station): string { return getStationAddress(station); }
  getPrice(station: Station): number { return getStationPrice(station); }
  getStatusLabel(station: Station): string { return getStationStatusLabel(station); }
  getStatus(station: Station): string { return getStationStatus(station); }
}
