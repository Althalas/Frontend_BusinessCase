import { Component, inject, signal, computed, ChangeDetectionStrategy, effect } from "@angular/core";
import { rxResource, toSignal } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { environment } from "@env/environment";
import { of } from "rxjs";
import { catchError, map } from "rxjs/operators";

/**
 * Page de vérification de l'email.
 * 
 * - `rxResource` gère l'état de la vérification (Status: Idle, Loading, Success, Error).
 * - Supporte l'auto-vérification via URL ou manuelle via Formulaire.
 */
@Component({
  selector: "app-verify-email",
  
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./verify-email.component.html",
  styleUrl: "./verify-email.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmailComponent {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private apiUrl = environment.apiUrl + "/auth";

  // --- FORM ---
  verifyForm: FormGroup = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    code: ["", [Validators.required, Validators.minLength(6)]],
  });

  // --- STATE SIGNALS ---

  /** Paramètres URL réactifs. */
  private queryParams = toSignal(this.route.queryParams);

  /** Déclencheur manuel de vérification. */
  private manualTrigger = signal<{ email: string; code: string } | null>(null);

  /** 
   * Ressource de Vérification.
   * Se déclenche soit par URL (auto), soit par Manual Trigger.
   */
  readonly verificationResource = rxResource<boolean | undefined, unknown>({
    stream: () => {
      // 1. Check Manual Trigger
      const manual = this.manualTrigger();
      if (manual) {
        return this.verifyRequest(manual.email, manual.code);
      }

      // 2. Check Auto (URL)
      // Note: We only want to auto-trigger ONCE. 
      // But rxResource stream runs whenever deps change.
      // Ideally we check if we already verified or not.
      // For simplicity/robustness: We extract params and check.
      const params = this.queryParams();
      if (params && params['email'] && params['code']) {
        // Auto-fill form for visibility
        this.verifyForm.patchValue({ email: params['email'], code: params['code'] }, { emitEvent: false });
        return this.verifyRequest(params['email'], params['code']);
      }

      // Idle state
      return of(undefined);
      // Note: undefined implies 'not verified yet'. We map result to boolean (true=success).
    }
  });

  /** État dérivé. */
  readonly isLoading = computed(() => this.verificationResource.isLoading());
  readonly success = computed(() => this.verificationResource.value() === true);
  readonly error = computed(() => this.verificationResource.error());

  // Custom Error Message computated from resource error
  readonly errorMessage = computed(() => {
    const err: any = this.error();
    if (!err) return "";
    return err.error?.message || "Une erreur est survenue lors de la vérification.";
  });

  // Prefill email if only email is in params (Side Effect)
  constructor() {
    effect(() => {
      const params = this.queryParams();
      if (params && params['email'] && !params['code']) {
        this.verifyForm.patchValue({ email: params['email'] });
      }
    });
  }

  // --- LOGIC ---

  private verifyRequest(email: string, code: string) {
    return this.http.post(`${this.apiUrl}/verify-email`, { email, code }).pipe(
      map(() => true),
      catchError((err) => {
        // RxResource captures error automatically, we just re-throw or return generic?
        // Throwing lets rxResource handle .error() state.
        throw err;
      })
    );
  }

  onSubmit() {
    if (this.verifyForm.valid) {
      this.manualTrigger.set(this.verifyForm.value);
    }
  }
}
