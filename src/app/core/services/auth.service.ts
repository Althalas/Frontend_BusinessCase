import { Injectable, inject, signal } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { HttpClient } from "@angular/common/http";
import { Observable, tap, catchError, of, BehaviorSubject } from "rxjs";
import { environment } from "@env/environment";
import { User } from "@core/models/user.model";

import { RegisterRequest } from "@core/models/auth.models";

export { User } from "@core/models/user.model";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Service d'authentification principal.
 * Gère l'état de l'utilisateur via des Signaux Angular (Zoneless compatible).
 * S'occupe de la persistance du token JWT et des requêtes d'auth (Login/Register).
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + "/auth";

  // État géré par Signal (Approche Angular 21)
  /** Signal privé contenant l'état mutable de l'utilisateur. */
  private _currentUser = signal<User | null>(null);

  // Signal public en lecture seule
  /**
   * Signal public en lecture seule de l'utilisateur connecté.
   * Utilisez ce signal dans les composants pour la réactivité (ex: `authService.currentUser()`).
   */
  readonly currentUser = this._currentUser.asReadonly();

  // Observable pour la rétrocompatibilité (Interopérabilité Legacy)
  /** Observable de l'utilisateur courant (pour compatibilité RxJS). */
  currentUser$ = toObservable(this._currentUser);

  constructor() {
    const user = localStorage.getItem("user");
    if (user) {
      this._currentUser.set(JSON.parse(user));
    }
  }

  /**
   * Inscrit un nouvel utilisateur.
   * @param data Les données d'inscription (email, mot de passe, nom, etc.)
   * @returns Un message de confirmation.
   */
  register(data: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/register`, data);
  }

  /**
   * Connecte un utilisateur.
   * Stocke le token et les infos utilisateur en cas de succès.
   * @param email L'email de l'utilisateur
   * @param password Le mot de passe
   * @returns Une réponse contenant le token et l'utilisateur.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  /**
   * Déconnecte l'utilisateur.
   * Appelle l'API pour invalider le refresh token, puis nettoie le localStorage.
   */
  logout(): void {
    const refreshToken = localStorage.getItem("refreshToken");

    // Appeler l'API logout pour invalider le token côté serveur
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/logout`, { refreshToken }).pipe(
        catchError(() => of(null)) // Ignorer les erreurs, on déconnecte quand même
      ).subscribe();
    }

    // Nettoyer le localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    this._currentUser.set(null);
  }

  /**
   * Récupère le refresh token stocké.
   */
  getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken");
  }

  /**
   * Rafraîchit les tokens d'accès en utilisant le refresh token.
   * @returns Observable avec les nouveaux tokens ou null si échec.
   */
  refreshTokens(): Observable<AuthResponse | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return of(null);
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((res) => this.handleAuth(res)),
      catchError(() => {
        this.clearTokens();
        return of(null);
      })
    );
  }

  /**
   * Nettoie les tokens sans appeler l'API (utilisé après échec de refresh).
   */
  private clearTokens(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    this._currentUser.set(null);
  }

  /** Flag pour éviter les refresh multiples simultanés. */
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  /**
   * Retourne un observable qui émet le nouveau token après refresh.
   * Gère les appels simultanés.
   */
  getRefreshTokenObservable(): BehaviorSubject<string | null> {
    return this.refreshTokenSubject;
  }

  /**
   * Indique si un refresh est en cours.
   */
  isTokenRefreshing(): boolean {
    return this.isRefreshing;
  }

  /**
   * Définit l'état de refresh.
   */
  setRefreshing(value: boolean): void {
    this.isRefreshing = value;
  }

  /**
   * Émet le nouveau token après un refresh réussi.
   */
  emitNewToken(token: string | null): void {
    this.refreshTokenSubject.next(token);
  }

  /**
   * Récupère le token d'accès stocké.
   * @returns Le token JWT ou null.
   */
  getToken(): string | null {
    return localStorage.getItem("token");
  }

  /**
   * Vérifie si l'utilisateur est authentifié.
   * @returns Vrai si un token est présent.
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Récupère l'objet utilisateur actuel (synchrone).
   * @returns L'utilisateur ou null.
   */
  getCurrentUser(): User | null {
    return this.currentUser();
  }

  /**
   * Vérifie si l'utilisateur a le rôle Admin.
   * Les rôles du backend sont en minuscules (enum Prisma).
   */
  isAdmin(): boolean {
    const user = this.currentUser();
    return user?.roles?.includes("admin") || false;
  }

  /**
   * Vérifie si l'utilisateur a le rôle Propriétaire (Owner).
   */
  isOwner(): boolean {
    const user = this.currentUser();
    return user?.roles?.includes("owner") || false;
  }

  /**
   * Vérifie si l'utilisateur a le rôle Client.
   * Note: Les owners sont aussi clients (peuvent réserver).
   */
  isClient(): boolean {
    const user = this.currentUser();
    return user?.roles?.includes("client") || user?.roles?.includes("owner") || false;
  }

  private handleAuth(res: AuthResponse): void {
    localStorage.setItem("token", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    localStorage.setItem("user", JSON.stringify(res.user));
    this._currentUser.set(res.user);
  }

  /**
   * Met à jour les informations locales de l'utilisateur.
   * @param user L'objet utilisateur mis à jour.
   */
  updateUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
    this._currentUser.set(user);
  }

  /**
   * Rafraîchit les informations du profil depuis l'API.
   * Met à jour le LocalStorage et le Subject.
   * @returns L'utilisateur mis à jour.
   */
  refreshProfile(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap((user) => {
        const currentUser = this.currentUser();
        if (currentUser) {
          localStorage.setItem("user", JSON.stringify(user));
          this._currentUser.set(user);
        }
      })
    );
  }
}
