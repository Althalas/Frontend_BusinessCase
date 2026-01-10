import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@env/environment";
import { Station } from "./stations.service";
import { PaginatedResponse } from "@shared/utils/pagination.util";

export interface Payment {
  id: number;
  amount: number;
  paymentStatus: "pending" | "completed" | "refunded" | "failed";
  paymentDate: string;
  cardLastDigits: string;
}

export interface Booking {
  id: number;
  stationId: number;
  userId: number;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "pending" | "accepted" | "refused" | "completed" | "cancelled";
  station?: Station;
  payment?: Payment;
  createdAt: string;
  renter?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * DTO pour la création d'une réservation.
 */
export interface CreateBookingDto {
  stationId: number;
  /** Date de début au format ISO. */
  startTime: string;
  /** Date de fin au format ISO. */
  endTime: string;
  notes?: string;
  vehicleId?: number;
}

/**
 * Service de gestion des réservations.
 * Supporte le cycle de vie complet : création, paiement, acceptation/refus, annulation.
 */
@Injectable({ providedIn: "root" })
export class BookingsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + "/bookings";

  /**
   * Récupère la liste des réservations de l'utilisateur connecté avec pagination.
   * @param params (timeFilter, page, limit)
   */
  getMyBookings(params: {
    timeFilter?: 'upcoming' | 'history';
    page: number;
    limit: number
  }): Observable<PaginatedResponse<Booking>> {
    return this.http.get<PaginatedResponse<Booking>>(`${this.apiUrl}/my`, {
      params: {
        page: params.page.toString(),
        limit: params.limit.toString(),
        ...(params.timeFilter && { timeFilter: params.timeFilter })
      }
    });
  }

  /**
   * Récupère les détails d'une réservation par son ID.
   * @param id L'identifiant de la réservation.
   */
  getById(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crée une nouvelle réservation.
   * @param booking Les données de la réservation (station, heures, véhicule...).
   */
  create(booking: CreateBookingDto): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, booking);
  }

  /**
   * Simule ou effectue le paiement d'une réservation.
   * @param id L'identifiant de la réservation.
   */
  pay(id: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.apiUrl}/${id}/pay`, {});
  }

  /**
   * Met à jour le statut d'une réservation (ex: acceptation/refus par le propriétaire).
   * @param id L'ID de la réservation.
   * @param status Le nouveau statut.
   * @param reason (Optionnel) Motif du refus.
   */
  updateStatus(
    id: number,
    status: "pending" | "accepted" | "refused" | "completed" | "cancelled",
    reason?: string
  ): Observable<Booking> {
    return this.http.patch<Booking>(`${this.apiUrl}/${id}/status`, {
      status,
      reason,
    });
  }

  /**
   * Annule une réservation existante.
   * @param id L'ID de la réservation.
   */
  cancel(id: number): Observable<Booking> {
    return this.http.patch<Booking>(`${this.apiUrl}/${id}/cancel`, {});
  }

  /**
   * Récupère toutes les réservations associées à une station spécifique (pour le propriétaire).
   * @param stationId L'ID de la station.
   */
  getStationBookings(stationId: number): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.apiUrl}/station/${stationId}`);
  }

  /**
   * Télécharge le reçu de paiement au format PDF (Blob).
   * @param id L'ID de la réservation.
   */
  downloadReceipt(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/receipt`, {
      responseType: "blob",
    });
  }

  /**
   * Récupère les créneaux déjà réservés pour une station à une date donnée.
   * Utilisé pour éviter les conflits lors de la réservation.
   * @param stationId L'ID de la station.
   * @param date La date concernée (string ISO).
   */
  getBusySlots(
    stationId: number,
    date: string
  ): Observable<{ startDatetime: string; endDatetime: string }[]> {
    return this.http.get<any[]>(`${this.apiUrl}/station/${stationId}/busy`, {
      params: { date },
    });
  }

  /**
   * Exporte l'historique des réservations au format Excel.
   */
  exportBookings(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/excel`, {
      responseType: "blob",
    });
  }
}
