import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '@core/services/auth.service';
import { UsersService } from '@core/services/users.service';
import { ToastService } from '@core/services/toast.service';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

// Mock mutation utility synchronously
vi.mock('@shared/utils/mutation.util', () => ({
  createMutationResource: (mutationFn: any) => {
    return {
      mutate: (args: any) => {
        // Execute immediately
        const result = mutationFn(args);
        // If it returns an observable, subscribe to it
        if (result && typeof result.subscribe === 'function') {
            result.subscribe();
        }
      },
      isLoading: signal(false),
      isSuccess: signal(false),
      isError: signal(false),
      value: signal(undefined),
      status: signal('idle'),
      error: signal(undefined),
      reset: vi.fn()
    };
  }
}));

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authServiceSpy: any;
  let usersServiceSpy: any;
  let toastServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      currentUser: signal({ id: 1, firstName: 'John', lastName: 'Doe', email: 'john@test.com', phone: '123' }),
      updateUser: vi.fn(),
    };
    usersServiceSpy = {
      updateProfile: vi.fn().mockReturnValue(of({ id: 1, firstName: 'Jane' })),
      changePassword: vi.fn().mockReturnValue(of(true)),
      uploadAvatar: vi.fn().mockReturnValue(of({ avatar: 'new.jpg' })),
      exportData: vi.fn().mockReturnValue(of({ id: 1, data: 'test' })),
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: UsersService, useValue: usersServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with current user data', () => {
    expect(component.profileForm.value.firstName).toBe('John');
    expect(component.profileForm.getRawValue().email).toBe('john@test.com');
  });

  it('should call updateProfile on submit', () => {
    component.profileForm.patchValue({ firstName: 'Jane' });
    component.onSubmitProfile();
    expect(usersServiceSpy.updateProfile).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Jane' }));
  });
});
