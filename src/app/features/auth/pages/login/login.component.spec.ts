import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, provideRouter } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

// Mock mutation utility synchronously
vi.mock('@shared/utils/mutation.util', () => ({
  createMutationResource: (mutationFn: any) => {
    return {
      mutate: (args: any) => {
          try {
            const result = mutationFn(args);
             if (result && typeof result.subscribe === 'function') {
                result.subscribe({
                    error: (err: any) => {} // Suppress unhandled rejection in test
                });
            }
          } catch(e) {}
      },
      isLoading: signal(false),
      isSuccess: signal(true), 
      isError: signal(false),
      value: signal(undefined),
      status: signal('idle'),
      error: signal(undefined),
      reset: vi.fn()
    };
  }
}));

// We need to override the mock implementation per test to control success/error, 
// OR we rely on accessing the signals on the component instance if we cast them.

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      login: vi.fn().mockReturnValue(of({})),
      isAdmin: vi.fn().mockReturnValue(false),
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        FormBuilder,
        provideRouter([]), // Provides real Router + ActivatedRoute for RouterLink to work
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router); // Get the real router
    vi.spyOn(router, 'navigate'); // Spy on it

    // Allow us to write to the signals for testing purposes
    
    // Allow us to write to the signals for testing purposes
    (component.loginMutation as any).isSuccess = signal(false);
    (component.loginMutation as any).error = signal(undefined);
    (component.loginMutation as any).mutate = (args: any) => {
         authServiceSpy.login(args.email, args.password).subscribe({
             next: () => (component.loginMutation as any).isSuccess.set(true),
             error: (err: any) => (component.loginMutation as any).error.set(err)
         });
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.login on submit', () => {
    component.loginForm.setValue({ email: 'test@test.com', password: 'password' });
    component.onSubmit();
    expect(authServiceSpy.login).toHaveBeenCalledWith('test@test.com', 'password');
  });

  it('should navigate to dashboard on success', () => {
      // Simulate success
      (component.loginMutation as any).isSuccess.set(true);
      fixture.detectChanges(); // Trigger effect
      
      expect(toastServiceSpy.success).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to admin on success (admin user)', () => {
      authServiceSpy.isAdmin.mockReturnValue(true);
      (component.loginMutation as any).isSuccess.set(true);
      fixture.detectChanges();
      
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('should show error toast on failure', () => {
      (component.loginMutation as any).error.set({ error: { message: 'Invalid credentials' } });
      fixture.detectChanges();
      
      expect(toastServiceSpy.error).toHaveBeenCalledWith('Invalid credentials');
  });
});
