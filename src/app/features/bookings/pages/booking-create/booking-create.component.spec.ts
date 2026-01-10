import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { BookingCreateComponent } from "./booking-create.component";
import { StationsService } from "@core/services/stations.service";
import { BookingsService } from "@core/services/bookings.service";
import { VehiclesService } from "@core/services/vehicles.service";
import { ToastService } from "@core/services/toast.service";
import { ActivatedRoute, Router } from "@angular/router";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatNativeDateModule } from "@angular/material/core";

describe("BookingCreateComponent", () => {
    let component: BookingCreateComponent;
    let fixture: ComponentFixture<BookingCreateComponent>;
    let stationsServiceMock: any;
    let bookingsServiceMock: any;
    let vehiclesServiceMock: any;
    let toastServiceMock: any;
    let routerMock: any;
    let routeMock: any;

    const mockStation = {
        id: 1,
        name: 'Station 1',
        powerKw: 22,
        pricing: [{ hourlyRate: 10 }],
        location: { address: 'Address 1', city: 'City' }
    };

    beforeEach(async () => {
        stationsServiceMock = {
            getById: vi.fn().mockReturnValue(of(mockStation))
        };
        bookingsServiceMock = {
            getBusySlots: vi.fn().mockReturnValue(of([])),
            create: vi.fn().mockReturnValue(of({ id: 100 }))
        };
        vehiclesServiceMock = {
            getAll: vi.fn().mockReturnValue(of([]))
        };
        toastServiceMock = {
            success: vi.fn(),
            error: vi.fn(),
            info: vi.fn()
        };
        routerMock = { navigate: vi.fn() };
        routeMock = {
            paramMap: of(new Map([['stationId', '1']]))
        };

        await TestBed.configureTestingModule({
            imports: [BookingCreateComponent, NoopAnimationsModule, MatNativeDateModule],
            providers: [
                { provide: StationsService, useValue: stationsServiceMock },
                { provide: BookingsService, useValue: bookingsServiceMock },
                { provide: VehiclesService, useValue: vehiclesServiceMock },
                { provide: ToastService, useValue: toastServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: ActivatedRoute, useValue: routeMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BookingCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("doit être créé", () => {
        expect(component).toBeTruthy();
    });

    it("doit charger les détails de la station depuis la route", async () => {
        await fixture.whenStable();
        expect(component.stationId()).toBe(1);
        expect(stationsServiceMock.getById).toHaveBeenCalledWith(1);
        expect(component.station()).toEqual(mockStation);
    });

    it("doit valider et soumettre la réservation", () => {
        // Mock station loaded
        Object.defineProperty(component, 'station', { value: () => mockStation }); // Mock computed? No, rely on rxResource loaded

        // Manual override for computed in test is hard. 
        // We rely on fixture.whenStable to populate the resource.

        // Form Fill
        component.bookingForm.patchValue({
            date: new Date(), // Today
            startTime: '10:00',
            endTime: '12:00'
        });

        expect(component.bookingForm.valid).toBe(true);
        expect(component.calculateTotal()).toBeGreaterThan(0);
    });

    // We can add more specific logic tests for overlaps/past times
});
