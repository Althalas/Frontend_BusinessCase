import { Component, inject, signal, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatIconModule } from "@angular/material/icon";
import { ReviewsService } from "@core/services/reviews.service";
import { ToastService } from "@core/services/toast.service";
import { AuthService } from "@core/services/auth.service";
import { Review } from "@core/models/review.model";

/**
 * Formulaire de création d'avis.
 * Refactored to Pure Signals.
 */
@Component({
  selector: "app-review-form",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: "./review-form.component.html",
  styleUrl: "./review-form.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewFormComponent {
  data = inject<{
    stationId: number;
    review?: Review;
}>(MAT_DIALOG_DATA);

  private fb = inject(FormBuilder);
  private reviewsService = inject(ReviewsService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  public dialogRef = inject(MatDialogRef<ReviewFormComponent>);

  stationId: number;

  // State
  readonly isSubmitting = signal(false);
  stars = [1, 2, 3, 4, 5];
  hoverRating = 0;

  reviewForm = this.fb.group({
    rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ["", [Validators.maxLength(500)]],
  });



  constructor() {
    const data = this.data;

    this.stationId = data.stationId;

    if (data.review) {
      this.reviewForm.patchValue({
        rating: data.review.rating || 0,
        comment: data.review.comment,
      });
      // Set initial hover to show rating
      this.hoverRating = data.review.rating || 0;
    }

    if (this.authService.isAdmin()) {
      this.reviewForm.get("rating")?.clearValidators();
      this.reviewForm.get("rating")?.updateValueAndValidity();
    }
  }

  setRating(rating: number) {
    this.reviewForm.patchValue({ rating });
  }

  onSubmit() {
    if (this.reviewForm.invalid) return;

    this.isSubmitting.set(true);
    const { rating, comment } = this.reviewForm.value;
    const finalRating = rating && rating > 0 ? rating : undefined;

    if (this.data.review) {
      // UPDATE MODE
      this.reviewsService.update(this.data.review.id, {
        rating: finalRating,
        comment: comment || ""
      }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.toastService.success("Avis modifié avec succès !");
          this.dialogRef.close(true);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error("Erreur lors de la modification");
        }
      });
    } else {
      // CREATE MODE
      this.reviewsService
        .create({
          stationId: this.stationId,
          rating: finalRating,
          comment: comment || "",
        })
        .subscribe({
          next: () => {
            this.isSubmitting.set(false);
            this.toastService.success("Avis publié avec succès !");
            this.dialogRef.close(true);
          },
          error: (err: any) => {
            this.isSubmitting.set(false);
            let msg = "Erreur lors de la publication";
            if (err.status === 403)
              msg = "Vous devez avoir une réservation terminée sur cette borne pour la noter.";
            if (err.status === 409) msg = "Vous avez déjà noté cette borne.";

            this.toastService.error(msg);
          },
        });
    }
  }
}
