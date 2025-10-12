import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { loadStripe, Stripe, StripeElements } from "@stripe/stripe-js";
import { environment } from "@env/environment";
import { PaymentsService } from "@core/services/payments.service";

export interface StripeChangeEvent {
  complete: boolean;
  error?: { message: string };
  empty: boolean;
}

@Component({
  selector: "app-payment-dialog",
  
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./payment-dialog.component.html",
  styleUrl: "./payment-dialog.component.scss",
})
export class PaymentDialogComponent implements OnInit {
  dialogRef = inject<MatDialogRef<PaymentDialogComponent>>(MatDialogRef);
  data = inject<{
    amount: number;
    bookingId: number;
}>(MAT_DIALOG_DATA);
  private paymentsService = inject(PaymentsService);

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  
  isProcessing = signal(false);
  isLoading = signal(true);
  isFormComplete = signal(false);
  errorMessage = signal<string | null>(null);



  async ngOnInit(): Promise<void> {
    // 1. Initialisation de Stripe
    this.stripe = await loadStripe(environment.stripePublicKey);
    
    if (!this.stripe) {
      this.errorMessage.set("Erreur d'initialisation Stripe (Clé publique manquante ?)");
      this.isLoading.set(false);
      return;
    }

    // 2. Création du PaymentIntent côté Backend pour obtenir le ClientSecret
    this.paymentsService.createPaymentIntent(this.data.bookingId).subscribe({
      next: (res) => {
        this.initializeElements(res.clientSecret);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set("Impossible d'initialiser le paiement. Réessayez.");
        this.isLoading.set(false);
      }
    });
  }

  private initializeElements(clientSecret: string) {
    if (!this.stripe) return;

    // 3. Création de l'instance Elements
    this.elements = this.stripe.elements({ 
      clientSecret, 
      appearance: { theme: 'stripe' } 
    });

    // 4. Création et montage de l'élément de paiement
    const paymentElement = this.elements.create("payment");
    paymentElement.mount("#payment-element");
    
    // Attendre que l'élément soit prêt
    paymentElement.on('ready', () => {
      this.isLoading.set(false);
    });

    // Surveillance de la validation du formulaire
    paymentElement.on('change', (event: StripeChangeEvent) => {
      this.isFormComplete.set(event.complete);
      if (event.error) {
        this.errorMessage.set(event.error.message || null);
      } else {
        this.errorMessage.set(null);
      }
    });
  }

  cancel() {
    this.dialogRef.close(false);
  }

  async submit() {
    if (!this.stripe || !this.elements) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    // 5. Confirmation du paiement
    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        // L'URL de retour n'est pas strictement nécessaire si on gère les redirections manuellement,
        // mais Stripe 3DS l'exige souvent.
        // On agit comme si redirect: 'if_required'.
        return_url: window.location.origin + '/bookings/' + this.data.bookingId,
      },
      redirect: "if_required", 
    });

    if (error) {
      this.isProcessing.set(false);
      this.errorMessage.set(error.message || "Une erreur est survenue.");
    } else {
      // Payment Succeeded
      this.dialogRef.close(true);
    }
  }
}
