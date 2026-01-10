import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "../services/auth.service";

/**
 * Garde de navigation pour les routes protégées.
 * Vérifie simplement si l'utilisateur est authentifié (token présent et valide).
 * Redirige vers la page de connexion si non authentifié.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(["/auth/login"]);
  return false;
};
