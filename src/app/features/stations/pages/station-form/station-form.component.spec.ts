import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StationFormComponent } from './station-form.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StationsService } from '@core/services/stations.service';
import { AddressService } from '@core/services/address.service';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';

// Mock the mutation utility to run synchronously
vi.mock('@shared/utils/mutation.util', () => ({
  createMutationResource: (mutationFn: any) => {
    // Return a mock object that mimics the MutationResult interface
    // but executes the mutationFn immediately upon 'mutate'
    return {
      mutate: (args: any) => {
        // Execute the function passed by the component
        mutationFn(args).subscribe(); 
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

describe('StationFormComponent', () => {
  let component: StationFormComponent;
  let fixture: ComponentFixture<StationFormComponent>;
  let stationsServiceSpy: any;
  let addressServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;
  let routeMock: any;

  beforeEach(async () => {
    stationsServiceSpy = {
      getById: vi.fn(),
      create: vi.fn().mockReturnValue(of({})),
      update: vi.fn(),
      getMyLocations: vi.fn().mockReturnValue(of([])),
    };
    addressServiceSpy = {
      searchAddress: vi.fn().mockReturnValue(of([])),
    };
    authServiceSpy = {
      refreshProfile: vi.fn().mockReturnValue(of({})),
    };
    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };
    routerSpy = {
      navigate: vi.fn(),
    };
    routeMock = {
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue(null), // Default to Create mode
        },
        queryParams: {},
      },
    };

    await TestBed.configureTestingModule({
      imports: [
        StationFormComponent,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        FormBuilder,
        { provide: StationsService, useValue: stationsServiceSpy },
        { provide: AddressService, useValue: addressServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty values in create mode', () => {
    expect(component.isEditing()).toBe(false);
    expect(component.stationForm.get('name')?.value).toBe('');
  });

  it('should submit form and call stationsService.create in create mode', () => {
    component.stationForm.patchValue({
      name: 'Test Station',
      address: '123 Test St',
      postalCode: '12345',
      city: 'Test City',
      latitude: 10,
      longitude: 20,
      power: 22,
      connector: 'TYPE2',
      pricePerKwh: 0.5,
    }); // Fill required fields

    component.onSubmit();

    expect(stationsServiceSpy.create).toHaveBeenCalled();
    // Since we mocked create to return observable, and we have an effect that navigates on success...
    // But testing effects in unit tests can be tricky with timing. 
    // We mainly verify the service method was called.
  });
});
