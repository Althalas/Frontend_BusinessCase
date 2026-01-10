import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterLink, RouterLinkActive } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatMenuModule } from "@angular/material/menu";
import { MatDividerModule } from "@angular/material/divider";
import { MatTooltipModule } from "@angular/material/tooltip";
import { AuthService } from "@core/services/auth.service";
import { ThemeService } from "@core/services/theme.service";

import { getAvatarUrl } from "@shared/utils/user.util";

/**
 * Composant de navigation principal (Header).
 * Gère l'affichage dynamique des liens selon le rôle (Client/Owner/Admin).
 * Intègre le bouton de bascule du thème et le menu utilisateur.
 */
@Component({
  selector: "app-navbar",
  
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: "./navbar.component.html",

  styleUrl: "./navbar.component.scss",
})
export class NavbarComponent {
  private authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;

  /**
   * Bascule le thème de l'application (Clair/Sombre).
   */
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  /**
   * Vérifie si l'utilisateur est authentifié.
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Vérifie si l'utilisateur a le rôle Propriétaire.
   */
  isOwner(): boolean {
    return this.authService.isOwner();
  }

  /**
   * Vérifie si l'utilisateur a le rôle Admin.
   */
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  /**
   * Génère l'URL de l'avatar utilisateur.
   * Utilise l'avatar stocké ou une image générée par ui-avatars.com (fallback).
   */
  getAvatarUrl(user: { avatarUrl?: string | null; firstName?: string; lastName?: string } | null): string {
    return getAvatarUrl(user);
  }

  /**
   * Déconnecte l'utilisateur et redirige vers la page de connexion.
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(["/auth/login"]);
  }
}
