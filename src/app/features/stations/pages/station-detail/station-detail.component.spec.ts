import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { StationDetailComponent } from "./station-detail.component";
import { StationsService } from "@core/services/stations.service";
import { AuthService } from "@core/services/auth.service";
import { BookingsService } from "@core/services/bookings.service";
import { ReportsService } from "@core/services/reports.service";
import { ActivatedRoute, Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { NO_ERRORS_SCHEMA } from "@angular/core";

describe("StationDetailComponent", () => {
  let component: StationDetailComponent;
  let fixture: ComponentFixture<StationDetailComponent>;
  let stationsServiceMock: any;
  let bookingsServiceMock: any;
  let reportsServiceMock: any;
  let routerMock: any;
  let activatedRouteMock: any;
  let authServiceMock: any;
  let matDialogMock: any;

  const mockStation = {
    id: 1,
    name: "Station 1",
    city: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    powerKw: 22,
    pricing: [{ hourlyRate: 10 }],
    location: {
      userId: 1,
      address: "123 Rue de Rivoli",
      city: "Paris",
      postalCode: "75001",
    },
  };

  const mockBookings = [
    {
      id: 101,
      startTime: new Date(),
      endTime: new Date(),
      status: "PENDING",
      totalPrice: 10,
    },
  ];

  beforeEach(async () => {
    stationsServiceMock = {
      getById: vi.fn().mockReturnValue(of(mockStation)),
      deactivate: vi.fn().mockReturnValue(of({})),
      toggleAvailability: vi.fn().mockReturnValue(of(mockStation)),
    };

    bookingsServiceMock = {
      getStationBookings: vi.fn().mockReturnValue(of(mockBookings)),
      updateStatus: vi.fn().mockReturnValue(of({})),
    };

    reportsServiceMock = {
      createReport: vi.fn().mockReturnValue(of({})),
    };

    routerMock = {
      navigate: vi.fn(),
    };

    activatedRouteMock = {
      paramMap: of(new Map([["id", "1"]])),
      snapshot: {
        paramMap: {
          get: vi.fn().mockReturnValue("1"),
        },
      },
    };

    // Mock signal-like currentUser
    const currentUserMock = vi.fn(() => ({ id: 1, roles: ["owner"] }));

    authServiceMock = {
      currentUser$: of({ id: 1, email: "test@test.com" }),
      currentUser: currentUserMock,
      isAdmin: vi.fn().mockReturnValue(false),
    };

    matDialogMock = {
      open: vi.fn().mockReturnValue({
        afterClosed: vi.fn().mockReturnValue(of(true)),
      }),
    };

    await TestBed.configureTestingModule({
      imports: [StationDetailComponent, NoopAnimationsModule],
      providers: [
        { provide: StationsService, useValue: stationsServiceMock },
        { provide: BookingsService, useValue: bookingsServiceMock },
        { provide: ReportsService, useValue: reportsServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit charger la station à l'initialisation (via rxResource)", async () => {
    await fixture.whenStable();
    expect(stationsServiceMock.getById).toHaveBeenCalledWith(1);
    expect(component.station()).toEqual(mockStation);
    expect(component.isLoading()).toBe(false);
  });

  it("doit avoir isOwner calculé", () => {
    expect(typeof component.isOwner).toBe("function");
  });

  it("doit naviguer en arrière quand goBack est appelé", () => {
    component.goBack();
    expect(routerMock.navigate).toHaveBeenCalledWith(["/stations"]);
  });

  it("doit obtenir l'adresse correctement", () => {
    const address = component.getAddress(mockStation as any);
    expect(address).toContain("123 Rue de Rivoli");
  });

  it("doit avoir le signal bookings", () => {
    expect(typeof component.bookings).toBe("function");
  });
});
