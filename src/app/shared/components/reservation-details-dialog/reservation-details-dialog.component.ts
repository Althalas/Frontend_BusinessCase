import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MAT_DIALOG_DATA, MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";

/**
 * Interface des détails de réservation à afficher.
 */
export interface ReservationDetailData {
  id: number;
  stationName: string;
  stationCity: string;
  renterName: string;
  renterEmail: string;
  startDatetime: string;
  endDatetime: string;
  totalAmount: number;
  status: string;
  cancellationReason?: string;
  refusedBy?: string;
  cancelledBy?: string;
  paymentStatus?: string;
}

/**
 * Dialogue affichant tous les détails d'une réservation.
 * Utilisé principalement dans le tableau de bord propriétaire.
 */
@Component({
  selector: "app-reservation-details-dialog",
  
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: "./reservation-details-dialog.component.html",
  styleUrl: "./reservation-details-dialog.component.scss",
})
export class ReservationDetailsDialogComponent {
  data = inject<ReservationDetailData>(MAT_DIALOG_DATA);
}
