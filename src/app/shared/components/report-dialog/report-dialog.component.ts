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
import { MatSelectModule } from "@angular/material/select";
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";

/**
 * Interface pour les données injectées dans le dialogue de signalement.
 */
export interface ReportDialogData {
  /** Type d'entité signalée. */
  type: "station" | "review";
  targetId: number;
  targetName?: string;
}

/**
 * Dialogue de création de signalement (Report).
 * Permet de choisir une raison prédéfinie et d'ajouter une description.
 */
@Component({
  selector: "app-report-dialog",
  
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: "./report-dialog.component.html",
  styleUrl: "./report-dialog.component.scss",
})
export class ReportDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<ReportDialogComponent>>(MatDialogRef);
  data = inject<ReportDialogData>(MAT_DIALOG_DATA);

  reportForm: FormGroup;



  constructor() {
    this.reportForm = this.fb.group({
      reason: ["", Validators.required],
      description: [""],
    });
  }

  submit() {
    if (this.reportForm.valid) {
      this.dialogRef.close(this.reportForm.value);
    }
  }
}
