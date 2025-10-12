import { vi, describe, it, expect, beforeEach } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RegisterComponent } from "./register.component";
import { AuthService } from "@core/services/auth.service";
import { Router } from "@angular/router";
import { ToastService } from "@core/services/toast.service";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { of } from "rxjs";
import { ActivatedRoute } from "@angular/router";
import { NO_ERRORS_SCHEMA } from "@angular/core";

describe("RegisterComponent", () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: any;
  let router: any;
  let toastService: any;

  beforeEach(async () => {
    authService = {
      register: vi.fn().mockReturnValue(of({ message: "Success" })),
    };
    router = {
      navigate: vi.fn().mockResolvedValue(true),
      createUrlTree: vi.fn(),
      serializeUrl: vi.fn(),
      events: of({}),
      url: "/",
    };
    toastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toastService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
            queryParams: of({}),
            params: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit avoir le signal isLoading initialisé à false", () => {
    expect(component.isLoading()).toBeFalsy();
  });

  it("doit valider la correspondance des mots de passe", () => {
    component.registerForm.controls["password"].setValue("password123");
    component.registerForm.controls["confirmPassword"].setValue("password456");
    expect(component.registerForm.hasError("passwordMismatch")).toBeTruthy();

    component.registerForm.controls["confirmPassword"].setValue("password123");
    expect(component.registerForm.hasError("passwordMismatch")).toBeFalsy();
  });

  it("doit avoir tous les champs de formulaire requis", () => {
    expect(component.registerForm.get("firstName")).toBeDefined();
    expect(component.registerForm.get("lastName")).toBeDefined();
    expect(component.registerForm.get("email")).toBeDefined();
    expect(component.registerForm.get("password")).toBeDefined();
    expect(component.registerForm.get("confirmPassword")).toBeDefined();
  });

  it("doit appeler authService.register sur une soumission valide", async () => {
    component.registerForm.setValue({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "1234567890",
      address: "123 Main St",
      postalCode: "12345",
      city: "City",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    expect(component.registerForm.valid).toBeTruthy();
    component.onSubmit();

    await fixture.whenStable();
    expect(authService.register).toHaveBeenCalled();
  });

  it("ne doit pas soumettre si le formulaire est invalide", () => {
    component.registerForm.reset();
    component.onSubmit();
    expect(authService.register).not.toHaveBeenCalled();
  });
});
