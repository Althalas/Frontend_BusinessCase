import { Injectable, signal } from "@angular/core";

/**
 * Service de gestion du thème (Clair/Sombre).
 * Utilise les Signaux Angular pour la réactivité et persiste le choix dans le LocalStorage.
 * Détecte automatiquent la préférence système au démarrage.
 */
@Injectable({
  providedIn: "root",
})
export class ThemeService {
  private darkModeKey = "isDarkMode";
  /** Signal booléen : true si le mode sombre est activé. */
  darkMode = signal<boolean>(false);

  constructor() {
    this.initializeTheme();
  }

  /**
   * Bascule entre le mode clair et le mode sombre.
   * Met à jour le signal, la classe CSS du body et le LocalStorage.
   */
  toggleTheme() {
    this.darkMode.update((current) => !current);
    this.updateBodyClass();
    localStorage.setItem(this.darkModeKey, JSON.stringify(this.darkMode()));
  }

  /**
   * Vérifie l'état actuel du thème.
   * @returns Vrai si le mode sombre est actif.
   */
  isDark(): boolean {
    return this.darkMode();
  }

  private initializeTheme() {
    const savedTheme = localStorage.getItem(this.darkModeKey);
    if (savedTheme !== null) {
      this.darkMode.set(JSON.parse(savedTheme));
    } else {
      // Check OS preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      this.darkMode.set(prefersDark);
    }
    this.updateBodyClass();
  }

  private updateBodyClass() {
    if (this.darkMode()) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }
}
