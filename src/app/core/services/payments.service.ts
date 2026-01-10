import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@env/environment";
import { Observable } from "rxjs";

export interface PaymentSimulationResponse {
  success: boolean;
  transactionId: string;
}

/**
 * Service de gestion des paiements.
 * Actuellement utilisé pour la simulation de paiement (Stripe Mock).
 */
@Injectable({ providedIn: "root" })
export class PaymentsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + "/payments";

  /**
   * Simule un paiement pour une réservation donnée (Environnement de test).
   * @param reservationId - L'ID de la réservation à payer.
   */
  simulatePayment(
    reservationId: number
  ): Observable<PaymentSimulationResponse> {
    return this.http.post<PaymentSimulationResponse>(
      `${this.apiUrl}/simulate/${reservationId}`,
      {}
    );
  }

  /**
   * Crée une intention de paiement (PaymentIntent) côté serveur et retourne le ClientSecret.
   * @param reservationId - L'ID de la réservation.
   */
  createPaymentIntent(reservationId: number): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(
      `${this.apiUrl}/create-intent/${reservationId}`,
      {}
    );
  }
}
