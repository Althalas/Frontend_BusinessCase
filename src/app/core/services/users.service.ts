import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { User } from "../models/user.model";

/**
 * Service de gestion des utilisateurs.
 * Permet la modification du profil, l'upload d'avatar et l'exportation des données.
 */
@Injectable({
  providedIn: "root",
})
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  /**
   * Télécharge et met à jour l'avatar de l'utilisateur.
   * Utilise un objet FormData pour l'envoi du fichier binaire.
   * @param file Fichier image sélectionné par l'utilisateur.
   * @returns Observable avec l'utilisateur mis à jour.
   */
  uploadAvatar(file: File): Observable<User> {
    const formData = new FormData();
    formData.append("file", file);
    return this.http.post<User>(`${this.apiUrl}/me/avatar`, formData);
  }

  /**
   * Met à jour les informations du profil utilisateur (Nom, Bio, etc.).
   * @param dto Objet partiel contenant les champs à modifier.
   * @returns Observable avec l'utilisateur mis à jour.
   */
  updateProfile(dto: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/me`, dto);
  }

  /**
   * Exporte toutes les données personnelles de l'utilisateur.
   * Conformité RGPD (GDPR).
   * @returns Observable contenant l'objet JSON complet des données.
   */
  exportData(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me/export`);
  }

  /**
   * Change le mot de passe de l'utilisateur.
   * @param dto Objet contenant l'ancien et le nouveau mot de passe.
   */
  changePassword(dto: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/me/password`, dto);
  }

  /**
   * Supprime définitivement le compte de l'utilisateur (RGPD Article 17).
   * Les données personnelles sont anonymisées.
   * @returns Observable avec confirmation de suppression.
   */
  deleteAccount(): Observable<{ message: string; deletedAt: string }> {
    return this.http.delete<{ message: string; deletedAt: string }>(`${this.apiUrl}/me`);
  }
}
