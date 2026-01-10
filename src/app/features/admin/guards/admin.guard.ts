import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "@core/services/auth.service";

/**
 * Garde de navigation pour les routes administrateur.
 * Vérifie si l'utilisateur est authentifié et possède le rôle ADMIN.
 * Redirige vers le tableau de bord si l'accès est refusé.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(["/dashboard"]);
  return false;
};
