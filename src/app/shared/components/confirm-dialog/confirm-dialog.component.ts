import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
}

/**
 * Dialog de confirmation réutilisable.
 * Remplace les confirm() natifs pour une UX cohérente.
 */
@Component({
  selector: 'app-confirm-dialog',
  
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      @if (data.icon) {
        <mat-icon [class]="'icon-' + (data.confirmColor || 'primary')">{{ data.icon }}</mat-icon>
      }
      {{ data.title }}
    </h2>
    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close data-cy="confirm-dialog-cancel">
        {{ data.cancelLabel || 'Annuler' }}
      </button>
      <button mat-flat-button [color]="data.confirmColor || 'primary'" [mat-dialog-close]="true" data-cy="confirm-dialog-confirm">
        {{ data.confirmLabel || 'Confirmer' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .icon-warn { color: #f44336; }
    .icon-primary { color: #2196f3; }
    .icon-accent { color: #4caf50; }
    mat-dialog-content p {
      margin: 0;
      color: var(--text-secondary, #666);
    }
  `]
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
