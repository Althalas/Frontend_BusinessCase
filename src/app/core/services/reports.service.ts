import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@env/environment";

export interface Report {
  id: number;
  reporterId: number;
  targetStationId?: number;
  targetReviewId?: number;
  reason:
    | "INAPPROPRIATE_CONTENT"
    | "BROKEN_STATION"
    | "INCORRECT_INFO"
    | "OTHER";
  description?: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  updatedAt: string;
  reporter?: any; // User
  targetStation?: any;
  targetReview?: any;
}

/**
 * Service de gestion des signalements (Reports).
 * Permet de signaler des problèmes sur les stations ou les avis.
 */
@Injectable({
  providedIn: "root",
})
export class ReportsService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/reports`;



  /**
   * Crée un nouveau signalement (station ou avis).
   */
  createReport(data: {
    targetStationId?: number;
    targetReviewId?: number;
    reason: string;
    description?: string;
  }): Observable<Report> {
    return this.http.post<Report>(this.apiUrl, data);
  }

  /**
   * Récupère tous les signalements (Admin uniquement).
   */
  getAllReports(): Observable<Report[]> {
    return this.http.get<Report[]>(this.apiUrl);
  }

  /**
   * Met à jour le statut d'un signalement.
   */
  updateStatus(
    id: number,
    status: "PENDING" | "RESOLVED" | "DISMISSED"
  ): Observable<Report> {
    return this.http.patch<Report>(`${this.apiUrl}/${id}/status`, { status });
  }
}
