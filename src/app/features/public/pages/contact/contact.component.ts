import { Component, inject, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { ToastService } from "@core/services/toast.service";
import { ContactService, ContactMessage } from "@core/services/contact.service";
import { createMutationResource } from "@shared/utils/mutation.util";

/**
 * Page de contact.
 * Permet aux utilisateurs d'envoyer un message aux administrateurs.
 */
@Component({
  selector: "app-contact",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
  ],
  templateUrl: "./contact.component.html",
  styleUrls: ["./contact.component.scss"],
})
export class ContactComponent {
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private contactService = inject(ContactService);

  contactForm = this.fb.group({
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    subject: ["", Validators.required],
    message: ["", Validators.required],
  });

  // Ressource de mutation pour l'envoi de message
  readonly sendMessageMutation = createMutationResource((msg: ContactMessage) =>
    this.contactService.sendMessage(msg)
  );

  readonly isSending = this.sendMessageMutation.isLoading;

  constructor() {
    // Effets réactifs (Side Effects)
    effect(() => {
      if (this.sendMessageMutation.isSuccess()) {
        this.toastService.success("Message envoyé ! Nous vous répondrons bientôt.");
        this.contactForm.reset();
        this.sendMessageMutation.reset(); // Réinitialise l'état pour éviter les déclenchements multiples
      }
    });

    effect(() => {
      if (this.sendMessageMutation.error()) {
        this.toastService.error("Erreur lors de l'envoi du message.");
      }
    });
  }

  /**
   * Soumet le formulaire de contact.
   */
  onSubmit() {
    if (this.contactForm.valid) {
      const messageDto = this.contactForm.value as unknown as ContactMessage;
      this.sendMessageMutation.mutate(messageDto);
    }
  }
}
