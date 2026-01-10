import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { FormsModule } from "@angular/forms";

/**
 * Interface de configuration pour le dialogue de motif.
 */
export interface ReasonDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
}

/**
 * Dialogue générique demandant une raison/motif à l'utilisateur.
 * Utilisé pour les annulations, refus de réservation, etc.
 */
@Component({
  selector: "app-reason-dialog",
  
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: "./reason-dialog.component.html",
  styleUrl: "./reason-dialog.component.scss",
})
export class ReasonDialogComponent {
  dialogRef = inject<MatDialogRef<ReasonDialogComponent>>(MatDialogRef);
  data = inject<ReasonDialogData>(MAT_DIALOG_DATA);

  reason = "";

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    this.dialogRef.close(this.reason);
  }
}
