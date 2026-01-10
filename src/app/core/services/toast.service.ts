import { Injectable, inject } from "@angular/core";
import { MatSnackBar, MatSnackBarConfig } from "@angular/material/snack-bar";

/**
 * Service d'affichage de notifications (Toasts/Snackbars).
 * Wrapper autour de MatSnackBar pour standardiser les succès, erreurs et infos.
 */
@Injectable({
  providedIn: "root",
})
export class ToastService {
  private snackBar = inject(MatSnackBar);

  private defaultConfig: MatSnackBarConfig = {
    duration: 3000,
    horizontalPosition: "start",
    verticalPosition: "top",
  };

  /**
   * Affiche une notification de succès (Vert).
   * @param message Message à afficher.
   * @param action Libellé du bouton (défaut : "Fermer").
   */
  success(message: string, action: string = "Fermer"): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ["toast-success"],
    });
  }

  /**
   * Affiche une notification d'erreur (Rouge).
   * Reste affichée plus longtemps (5s).
   * @param message Message d'erreur.
   * @param action Libellé du bouton (défaut : "Fermer").
   */
  error(message: string, action: string = "Fermer"): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      duration: 5000,
      panelClass: ["toast-error"],
    });
  }

  /**
   * Affiche une notification d'information (Bleu/Neutre).
   * @param message Message informatif.
   * @param action Libellé du bouton (défaut : "Fermer").
   */
  info(message: string, action: string = "Fermer"): void {
    this.snackBar.open(message, action, {
      ...this.defaultConfig,
      panelClass: ["toast-info"],
    });
  }
}
