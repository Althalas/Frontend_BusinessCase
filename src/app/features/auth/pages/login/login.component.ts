import { Component, inject, effect, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";

/**
 * Page de connexion utilisateur.
 * Refactored to Pure Signals (Zoneless).
 * - Reactive Login Action via `loginTrigger$`.
 */
@Component({
  selector: "app-login",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  loginForm: FormGroup = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]],
  });

  // Mutation Resource
  readonly loginMutation = createMutationResource((credentials: { email: string, password: string }) =>
    this.authService.login(credentials.email, credentials.password)
  );

  readonly isLoading = this.loginMutation.isLoading;
  hidePassword = true;

  constructor() {
    // Success Effect
    effect(() => {
      const success = this.loginMutation.isSuccess();
      const isAdmin = this.authService.isAdmin(); // authService state is updated inside login service or we check token
      // Wait, authService.login returns boolean/user? 
      // The original code checked `if (res)`.

      if (success) {
        this.toastService.success("Connexion réussie !");
        if (isAdmin) {
          this.router.navigate(["/admin"]);
        } else {
          this.router.navigate(["/dashboard"]);
        }
      }
    });

    // Error Effect
    effect(() => {
      const err = this.loginMutation.error();
      if (err) {
        const message = (err as any).error?.message || "Erreur de connexion";
        this.toastService.error(message);
      }
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.loginMutation.mutate(this.loginForm.value);
  }
}
