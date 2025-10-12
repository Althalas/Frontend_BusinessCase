import { Component, input, AfterViewInit, OnDestroy, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import * as L from "leaflet";

/**
 * Composant de carte Leaflet minimaliste.
 * Affiche un marqueur statique pour localiser une station spécifique.
 * Désactive le zoom et le déplacement pour un usage "aperçu".
 */
@Component({
  selector: "app-station-map",
  
  imports: [CommonModule],
  templateUrl: "./station-map.component.html",
  styleUrl: "./station-map.component.scss",
})
export class StationMapComponent implements AfterViewInit, OnDestroy {
  readonly latitude = input.required<number>();
  readonly longitude = input.required<number>();

  @ViewChild("mapContainer") mapContainer!: ElementRef;

  private map: L.Map | undefined;

  // Icônes personnalisées
  private defaultIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
    iconRetinaUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.initMap();
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    const lat = this.latitude();
    const lng = this.longitude();

    if (!lat || !lng || !this.mapContainer) return;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(this.map);

    L.marker([lat, lng], { icon: this.defaultIcon }).addTo(
      this.map
    );
  }
}
