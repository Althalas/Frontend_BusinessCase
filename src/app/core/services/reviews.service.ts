import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Review, CreateReviewDto } from "../models/review.model";

/**
 * Service de gestion des avis (Reviews).
 * Permet de créer, lire, modifier et supprimer des avis sur les stations.
 */
@Injectable({
  providedIn: "root",
})
export class ReviewsService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/reviews`;



  /**
   * Récupère les avis pour une station spécifique.
   */
  findByStation(stationId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/station/${stationId}`);
  }

  /**
   * Récupère tous les avis laissés par l'utilisateur connecté.
   */
  getGivenReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/given`);
  }

  /**
   * Récupère tous les avis reçus sur les stations de l'utilisateur (propriétaire).
   */
  getReviewsForMyStations(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/my-stations`);
  }

  /**
   * Crée un nouvel avis pour une station.
   */
  create(dto: CreateReviewDto): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, dto);
  }

  /**
   * Met à jour un avis existant.
   */
  update(id: number, dto: Partial<CreateReviewDto>): Observable<Review> {
    return this.http.patch<Review>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Supprime un avis.
   */
  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
