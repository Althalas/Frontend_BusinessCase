import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";
import { catchError, throwError, switchMap, filter, take } from "rxjs";
import { Router } from "@angular/router";

/**
 * Ajoute le token d'autorisation à une requête.
 */
function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Intercepteur HTTP pour l'authentification.
 * Ajoute le token JWT (Bearer) aux requêtes sortantes si disponible.
 * Gère les erreurs 401 en tentant un refresh du token avant de déconnecter.
 *
 * @param req La requête HTTP sortante.
 * @param next Le gestionnaire suivant dans la chaîne.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Ne pas intercepter les requêtes d'auth (login, register, refresh)
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  if (token) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/auth/')) {
        return handle401Error(req, next, authService, router);
      }
      return throwError(() => error);
    })
  );
};

/**
 * Gère les erreurs 401 en tentant de rafraîchir le token.
 */
function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router
) {
  if (!authService.isTokenRefreshing()) {
    authService.setRefreshing(true);
    authService.emitNewToken(null);

    return authService.refreshTokens().pipe(
      switchMap((response) => {
        authService.setRefreshing(false);

        if (response) {
          authService.emitNewToken(response.accessToken);
          return next(addToken(req, response.accessToken));
        }

        // Refresh échoué, déconnexion
        authService.logout();
        router.navigate(["/auth/login"]);
        return throwError(() => new Error("Session expirée"));
      }),
      catchError((err) => {
        authService.setRefreshing(false);
        authService.logout();
        router.navigate(["/auth/login"]);
        return throwError(() => err);
      })
    );
  } else {
    // Un refresh est déjà en cours, attendre le nouveau token
    return authService.getRefreshTokenObservable().pipe(
      filter((token) => token !== null),
      take(1),
      switchMap((token) => next(addToken(req, token!)))
    );
  }
}
