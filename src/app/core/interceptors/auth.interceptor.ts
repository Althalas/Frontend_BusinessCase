import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { catchError, throwError } from "rxjs";
import { Router } from "@angular/router";

/**
 * Intercepteur HTTP pour l'authentification.
 * Ajoute le token JWT (Bearer) aux requêtes sortantes si disponible.
 * Gère les erreurs 401 (Non autorisé) en déconnectant l'utilisateur
 * et en le redirigeant vers la page de login.
 *
 * @param req La requête HTTP sortante.
 * @param next Le gestionnaire suivant dans la chaîne.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        authService.logout();
        router.navigate(["/auth/login"]);
      }
      return throwError(() => error);
    })
  );
};
