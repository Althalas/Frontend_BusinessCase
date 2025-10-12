import { Component, inject, ChangeDetectionStrategy, effect } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { AuthService } from "@core/services/auth.service";
import { RegisterRequest } from "@core/models/auth.models";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";

/**
 * Page d'inscription utilisateur.
 * Refactored to Pure Signals (Zoneless).
 * - Reactive Register Action via `registerTrigger$`.
 */
@Component({
  selector: "app-register",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./register.component.html",
  styleUrl: "./register.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  registerForm: FormGroup = this.fb.group(
    {
      firstName: ["", [Validators.required]],
      lastName: ["", [Validators.required]],
      email: ["", [Validators.required, Validators.email]],
      phone: ["", [Validators.required]],
      address: [""],
      postalCode: [""],
      city: [""],
      password: ["", [Validators.required, Validators.minLength(8), this.passwordStrengthValidator]],
      confirmPassword: ["", [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  hidePassword = true;
  hideConfirmPassword = true;

  // Mutation Resource
  readonly registerMutation = createMutationResource<{ message: string }, RegisterRequest>((data) =>
    this.authService.register(data)
  );

  readonly isLoading = this.registerMutation.isLoading;

  constructor() {
    // Success Effect
    effect(() => {
      if (this.registerMutation.isSuccess()) {
        this.toastService.success("Inscription réussie ! Veuillez vérifier vos emails.");
        this.router.navigate(["/auth/verify"], {
          queryParams: { email: this.registerForm.value.email },
        });
        this.registerMutation.reset();
      }
    });

    // Error Effect
    effect(() => {
      const err = this.registerMutation.error();
      if (err) {
        const message = (err as any).error?.message || "Erreur lors de l'inscription";
        this.toastService.error(message);
      }
    });
  }

  /**
   * Validateur de force du mot de passe (OWASP/ANSSI).
   * Exige : 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial.
   */
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    const valid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial;
    if (!valid) {
      return { passwordStrength: true };
    }
    return null;
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get("password");
    const confirmPassword = control.get("confirmPassword");

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    // Prepare data
    const { confirmPassword: _confirmPassword, ...registerData } = this.registerForm.value;
    this.registerMutation.mutate(registerData);
  }
}
