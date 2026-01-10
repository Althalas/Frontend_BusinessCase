import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  ReservationDetailsDialogComponent,
  ReservationDetailData,
} from "./reservation-details-dialog.component";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

describe("ReservationDetailsDialogComponent", () => {
  let component: ReservationDetailsDialogComponent;
  let fixture: ComponentFixture<ReservationDetailsDialogComponent>;

  const mockData: ReservationDetailData = {
    id: 1,
    stationName: "Test Station",
    stationCity: "Test City",
    renterName: "John Doe",
    renterEmail: "john@test.com",
    startDatetime: new Date().toISOString(),
    endDatetime: new Date().toISOString(),
    totalAmount: 22.5,
    status: "pending",
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationDetailsDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationDetailsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit afficher les détails de la réservation", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Test Station");
    expect(compiled.textContent).toContain("John Doe");
    expect(compiled.textContent).toContain("22.50");
  });
});
