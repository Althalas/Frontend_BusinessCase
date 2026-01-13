import { Component, input, computed, inject, signal, ChangeDetectionStrategy, DestroyRef } from "@angular/core";
import { rxResource, takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { MatListModule } from "@angular/material/list";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { ReviewsService } from "@core/services/reviews.service";
import { Review } from "@core/models/review.model";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";
import { ReportsService } from "@core/services/reports.service";
import { ReportDialogComponent } from "@shared/components/report-dialog/report-dialog.component";
import { ReviewFormComponent } from "@features/stations/components/review-form/review-form.component";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";
import { ConfirmDialogComponent } from "@shared/components/confirm-dialog/confirm-dialog.component";

/**
 * Affiche la liste des avis pour une station donnée.
 * 
 * Utilise rxResource pour le chargement.
 * Stratégie OnPush.
 */
@Component({
  selector: "app-review-list",
  
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: "./review-list.component.html",
  styleUrl: "./review-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewListComponent {
  readonly stationId = input.required<number>();
  readonly isAdmin = input<boolean>(false);
  /** Signal externe pour forcer le rafraîchissement (depuis le parent). */
  readonly refreshSignal = input<number>(0);

  private reviewsService = inject(ReviewsService);
  private reportsService = inject(ReportsService);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly currentUserId = computed(() => this.authService.currentUser()?.id);

  // --- SIGNALS ---
  /** Signal interne pour rafraîchir la liste (suppression/edition locales). */
  private readonly internalRefresh = signal(0);

  // --- RESOURCES ---

  readonly reviewsResource = rxResource<Review[], unknown>({
    stream: () => {
      const id = this.stationId();
      
      // Dependencies tracking
      this.internalRefresh(); 
      this.refreshSignal(); 

      if (!id) return of([]);

      return this.reviewsService.findByStation(id).pipe(
        catchError(() => of([]))
      );
    }
  });

  readonly reviews = computed(() => this.reviewsResource.value() ?? []);
  readonly isLoading = computed(() => this.reviewsResource.isLoading());

  // --- ACTIONS ---

  openReport(review: Review) {
    const dialogRef = this.dialog.open(ReportDialogComponent, {
      width: "500px",
      data: {
        type: "review",
        targetId: review.id,
        targetName: `Avis de ${review.user?.firstName || "Utilisateur"}`,
      },
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      if (result) {
        this.reportsService
          .createReport({
            targetReviewId: review.id,
            reason: result.reason,
            description: result.description,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.toastService.success("Signalement envoyé"),
            error: (err) => this.toastService.error(err.error?.message || "Erreur lors du signalement"),
          });
      }
    });
  }

  deleteReview(review: Review) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Supprimer l\'avis',
        message: 'Êtes-vous sûr de vouloir supprimer cet avis ?',
        confirmLabel: 'Supprimer',
        confirmColor: 'warn',
        icon: 'delete'
      }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (confirmed) {
        this.reviewsService.delete(review.id).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe({
          next: () => {
            this.internalRefresh.update(n => n + 1);
            this.toastService.success("Avis supprimé");
          },
          error: (err) => this.toastService.error(err.error?.message || "Erreur lors de la suppression"),
        });
      }
    });
  }

  editReview(review: Review) {
    const dialogRef = this.dialog.open(ReviewFormComponent, {
      width: '600px',
      data: {
        stationId: this.stationId(),
        review: review
      }
    });

    dialogRef.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
      if (result) {
        this.internalRefresh.update(n => n + 1);
      }
    });
  }

  getStars(rating: number): number[] {
    if (!rating) return [];
    return Array(rating).fill(0);
  }

  getEmptyStars(rating: number): number[] {
    const r = rating || 0;
    return Array(5 - r).fill(0);
  }
}
