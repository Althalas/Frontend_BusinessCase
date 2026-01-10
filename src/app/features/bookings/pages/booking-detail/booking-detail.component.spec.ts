import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { BookingDetailComponent } from "./booking-detail.component";
import { BookingsService } from "@core/services/bookings.service";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

/**
 * Tests unitaires pour BookingDetailComponent.
 * Vérifie le chargement rxResource et les mutations (cancel, pay).
 */
describe("BookingDetailComponent", () => {
    let component: BookingDetailComponent;
    let fixture: ComponentFixture<BookingDetailComponent>;
    let bookingsServiceMock: any;
    let routerMock: any;
    let snackBarMock: any;
    let dialogMock: any;
    let routeMock: any;

    const mockBooking = {
        id: 123,
        status: "pending",
        totalPrice: 50,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        station: { name: "Station Test", city: "Paris" }
    };

    beforeEach(async () => {
        bookingsServiceMock = {
            getById: vi.fn().mockReturnValue(of(mockBooking)),
            cancel: vi.fn().mockReturnValue(of({})),
            pay: vi.fn().mockReturnValue(of({})),
            downloadReceipt: vi.fn().mockReturnValue(of(new Blob()))
        };

        routerMock = {
            navigate: vi.fn()
        };

        snackBarMock = {
            open: vi.fn()
        };

        dialogMock = {
            open: vi.fn().mockReturnValue({ afterClosed: () => of(true) })
        };

        routeMock = {
            paramMap: of(new Map([["id", "123"]]))
        };

        await TestBed.configureTestingModule({
            imports: [BookingDetailComponent, NoopAnimationsModule],
            providers: [
                { provide: BookingsService, useValue: bookingsServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: MatSnackBar, useValue: snackBarMock },
                { provide: MatDialog, useValue: dialogMock },
                { provide: ActivatedRoute, useValue: routeMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(BookingDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("doit être créé", () => {
        expect(component).toBeTruthy();
    });

    it("doit charger les détails de la réservation depuis les paramètres de route", async () => {
        await fixture.whenStable();
        expect(component.bookingId()).toBe(123);
        expect(bookingsServiceMock.getById).toHaveBeenCalledWith(123);
        expect(component.booking()).toEqual(mockBooking);
    });

    it("doit avoir cancelMutation et payMutation", () => {
        expect(component.cancelMutation).toBeDefined();
        expect(component.payMutation).toBeDefined();
        expect(typeof component.cancelMutation.mutate).toBe("function");
        expect(typeof component.payMutation.mutate).toBe("function");
    });

    it("doit avoir isProcessing comme signal calculé", () => {
        expect(typeof component.isProcessing).toBe("function");
        expect(component.isProcessing()).toBe(false);
    });

    it("doit avoir un helper pour le label de statut", () => {
        expect(component.getStatusLabel("pending")).toBe("En attente");
        expect(component.getStatusLabel("completed")).toBe("Terminée");
        expect(component.getStatusLabel("cancelled")).toBe("Annulée");
    });

    it("doit avoir la méthode canCancel", () => {
        expect(typeof component.canCancel).toBe("function");
        // Should return true for pending booking in future
        expect(component.canCancel(mockBooking as any)).toBe(true);
    });
});
