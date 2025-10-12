import { Component, inject, computed, effect, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDividerModule } from "@angular/material/divider";
import { MatTabsModule } from "@angular/material/tabs";
import { AuthService } from "@core/services/auth.service";
import { UsersService } from "@core/services/users.service";
import { ToastService } from "@core/services/toast.service";
import { createMutationResource } from "@shared/utils/mutation.util";
import { getAvatarUrl } from "@shared/utils/user.util";
import { MatChipsModule } from "@angular/material/chips";
import { MatSelectModule } from "@angular/material/select";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatListModule } from "@angular/material/list";
import { MatDialogModule } from "@angular/material/dialog";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";

/**
 * Page de profil utilisateur.
 * 
 * Gestion de l'état local via Signals (`isUpdating`, `currentUser`).
 * Actions impératives pour les mises à jour.
 * Formulaire réactif synchronisé automatiquement via effect.
 */
@Component({
  selector: "app-profile",
  
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTabsModule,
    MatListModule,
    MatListModule,
    MatDialogModule,
    MatChipsModule,
  ],
  templateUrl: "./profile.component.html",
  styleUrl: "./profile.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly toastService = inject(ToastService);

  /** Utilisateur courant (Signal dérivé du service d'auth). */
  readonly currentUser = this.authService.currentUser;

  // --- FORMULAIRES ---

  profileForm: FormGroup = this.fb.group({
    firstName: [""],
    lastName: [""],
    email: [{ value: "", disabled: true }, [Validators.required, Validators.email]],
    phone: [""],
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ["", [Validators.required]],
    newPassword: ["", [Validators.required, Validators.minLength(8)]],
    confirmPassword: ["", [Validators.required]],
  });

  // --- ÉTAT (STATE) ---

  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;

  // Ressource de mutation pour l'upload d'avatar
  readonly uploadAvatarMutation = createMutationResource((file: File) =>
    this.usersService.uploadAvatar(file)
  );

  // Ressource de mutation pour la mise à jour du profil
  readonly updateProfileMutation = createMutationResource((data: Partial<{ firstName: string; lastName: string; email: string; phone: string }>) =>
    this.usersService.updateProfile(data)
  );

  // Ressource de mutation pour le changement de mot de passe
  readonly changePasswordMutation = createMutationResource((dto: { currentPassword: string; newPassword: string }) =>
    this.usersService.changePassword(dto)
  );

  // État de chargement calculé (combinaison de toutes les mises à jour)
  readonly isUpdating = computed(() =>
    this.updateProfileMutation.isLoading() || this.uploadAvatarMutation.isLoading()
  );

  readonly isChangingPassword = this.changePasswordMutation.isLoading;

  constructor() {
    // Synchronisation automatique du formulaire avec les données utilisateur
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.profileForm.patchValue({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        }, { emitEvent: false });
      }
    });

    // --- EFFETS : Changement de mot de passe ---
    effect(() => {
      if (this.changePasswordMutation.isSuccess()) {
        this.toastService.success("Mot de passe modifié avec succès !");
        this.passwordForm.reset();
        this.changePasswordMutation.reset();
      }
    });

    effect(() => {
      const err = this.changePasswordMutation.error();
      if (err) {
        if ((err as any).status === 409) {
          this.toastService.error("Le mot de passe actuel est incorrect.");
        } else {
          this.toastService.error("Erreur lors du changement de mot de passe.");
        }
      }
    });

    // --- EFFETS : Upload Avatar ---
    effect(() => {
      const user = this.uploadAvatarMutation.value();
      if (user) {
        this.authService.updateUser(user);
        this.toastService.success("Photo de profil mise à jour !");
        this.uploadAvatarMutation.reset();
      }
    });

    effect(() => {
      if (this.uploadAvatarMutation.error()) {
        this.toastService.error("Erreur lors de l'upload");
      }
    });

    // --- EFFETS : Mise à jour Profil ---
    effect(() => {
      const user = this.updateProfileMutation.value();
      if (user) {
        this.authService.updateUser(user);
        this.toastService.success("Profil mis à jour !");
        this.updateProfileMutation.reset();
      }
    });

    effect(() => {
      if (this.updateProfileMutation.error()) {
        this.toastService.error("Erreur lors de la mise à jour");
      }
    });
  }

  // --- ACTIONS ---

  /**
   * Construit l'URL de l'avatar.
   * Utilise l'utilitaire partagé qui gère proprement le préfixe /api
   */
  getAvatarUrl(): string {
    return getAvatarUrl(this.currentUser());
  }

  /**
   * Gère la sélection d'un fichier pour l'avatar.
   */
  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadAvatarMutation.mutate(file);
    }
  }

  /**
   * Soumet les modifications du profil.
   */
  onSubmitProfile(): void {
    if (this.profileForm.invalid) return;
    this.updateProfileMutation.mutate(this.profileForm.value);
  }

  /**
   * Exporte les données personnelles au format JSON.
   */
  downloadData(): void {
    this.usersService.exportData().subscribe({
      next: (data) => {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `user_data_${this.currentUser()?.id}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.success("Données exportées avec succès");
      },
      error: () => {
        this.toastService.error("Erreur lors de l'export des données");
      }
    });
  }

  /**
   * Soumet le formulaire de changement de mot de passe.
   */
  onSubmitPassword() {
    if (this.passwordForm.valid) {
      const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;

      if (newPassword !== confirmPassword) {
        this.toastService.error("Les nouveaux mots de passe ne correspondent pas.");
        return;
      }

      if (currentPassword && newPassword) {
        this.changePasswordMutation.mutate({ currentPassword, newPassword });
      }
    }
  }
}
