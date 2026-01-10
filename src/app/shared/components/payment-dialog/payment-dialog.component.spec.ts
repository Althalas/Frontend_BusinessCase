import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PaymentDialogComponent } from "./payment-dialog.component";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { PaymentsService } from "@core/services/payments.service";
import { of } from "rxjs";
import { vi, describe, it, expect, beforeEach } from "vitest";

describe("PaymentDialogComponent", () => {
  let component: PaymentDialogComponent;
  let fixture: ComponentFixture<PaymentDialogComponent>;
  let dialogRefMock: any;
  let paymentsServiceMock: any;

  beforeEach(async () => {
    dialogRefMock = {
      close: vi.fn()
    };

    paymentsServiceMock = {
      createPaymentIntent: vi.fn().mockReturnValue(of({ clientSecret: "test_secret" }))
    };

    await TestBed.configureTestingModule({
      imports: [PaymentDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { amount: 100, bookingId: 1 } },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: PaymentsService, useValue: paymentsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentDialogComponent);
    component = fixture.componentInstance;
    // Ne pas appeler detectChanges pour éviter l'initialisation Stripe
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit s'initialiser avec l'état de chargement", () => {
    expect(component.isLoading()).toBe(true);
    expect(component.isProcessing()).toBe(false);
  });

  it("doit avoir les données correctes injectées", () => {
    expect(component.data.amount).toBe(100);
    expect(component.data.bookingId).toBe(1);
  });

  it("doit fermer la boîte de dialogue à l'annulation", () => {
    component.cancel();
    expect(dialogRefMock.close).toHaveBeenCalledWith(false);
  });

  it("ne doit pas soumettre si stripe n'est pas initialisé", async () => {
    component.stripe = null;
    await component.submit();
    // Should return early without error
    expect(component.isProcessing()).toBe(false);
  });
});
