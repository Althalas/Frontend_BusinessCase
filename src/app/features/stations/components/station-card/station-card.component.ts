import { Component, input, output, inject, computed, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import {
  Station,
  getStationAddress,
  getStationPower,
  getStationPrice,
} from "@core/services/stations.service";
import { AuthService } from "@core/services/auth.service";
import { StatusBadgeComponent } from "@shared/components/status-badge/status-badge.component";

@Component({
  selector: "app-station-card",
  
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    StatusBadgeComponent
  ],
  templateUrl: "./station-card.component.html",
  styleUrl: "./station-card.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationCardComponent {
  private authService = inject(AuthService);

  // Entrées/Sorties basées sur les Signaux
  readonly station = input.required<Station>();
  readonly isFavorite = input<boolean>(false);
  readonly toggleFavorite = output<number>();

  // État Dérivé (Computed)
  readonly address = computed(() => getStationAddress(this.station()));
  readonly power = computed(() => getStationPower(this.station()));
  readonly price = computed(() => getStationPrice(this.station()));

  // Note : AuthService.isAdmin est généralement stable, mais si c'était un Signal on l'utiliserait directement.
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  onToggleFavorite(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.toggleFavorite.emit(this.station().id);
  }
}
