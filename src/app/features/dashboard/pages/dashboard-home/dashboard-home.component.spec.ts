import { vi, describe, it, expect, beforeEach } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DashboardHomeComponent } from "./dashboard-home.component";
import { AuthService } from "@core/services/auth.service";
import { BookingsService } from "@core/services/bookings.service";
import { VehiclesService } from "@core/services/vehicles.service";
import { StationsService } from "@core/services/stations.service";
import { ReviewsService } from "@core/services/reviews.service";
import { ToastService } from "@core/services/toast.service";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ActivatedRoute } from "@angular/router";
import { NO_ERRORS_SCHEMA } from "@angular/core";

/**
 * Tests unitaires pour DashboardHomeComponent.
 * Vérifie le chargement des ressources via rxResource et createPaginatedResource.
 * Vérifie les mutations (vehicles, favorites, stations).
 */
describe("DashboardHomeComponent", () => {
  let component: DashboardHomeComponent;
  let fixture: ComponentFixture<DashboardHomeComponent>;
  let authServiceMock: any;
  let bookingsServiceMock: any;
  let vehiclesServiceMock: any;
  let stationsServiceMock: any;

  const mockUser = {
    id: 1,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    roles: ["client"],
  };

  const mockUpcomingBookings = [
    {
      id: 1,
      startTime: new Date(Date.now() + 86400000).toISOString(),
      endTime: new Date(Date.now() + 90000000).toISOString(),
      status: "pending",
      totalPrice: 20,
      createdAt: new Date().toISOString(),
      station: { name: "Station 1" },
    },
  ];

  const mockHistoryBookings = [
    {
      id: 2,
      startTime: new Date(Date.now() - 86400000).toISOString(),
      endTime: new Date(Date.now() - 80000000).toISOString(),
      status: "completed",
      totalPrice: 15,
      createdAt: new Date().toISOString(),
      station: { name: "Station 2" },
    },
  ];

  beforeEach(async () => {
    // Create a callable mock for currentUser signal
    const currentUserSignal = vi.fn(() => mockUser);

    authServiceMock = {
      currentUser: currentUserSignal,
    };

    // Mock returns paginated format { data: [], meta: {} }
    bookingsServiceMock = {
      getMyBookings: vi.fn().mockImplementation((params: any) => {
        if (params?.timeFilter === "upcoming") {
          return of({
            data: mockUpcomingBookings,
            meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
          });
        }
        return of({
          data: mockHistoryBookings,
          meta: { total: 1, page: 1, limit: 5, totalPages: 1 }
        });
      }),
    };

    vehiclesServiceMock = {
      getAll: vi.fn().mockReturnValue(of([])),
      create: vi.fn().mockReturnValue(of({ id: 1, brand: "Tesla", model: "Model 3" })),
      delete: vi.fn().mockReturnValue(of({})),
    };

    stationsServiceMock = {
      getFavorites: vi.fn().mockReturnValue(of([])),
      getMyStations: vi.fn().mockReturnValue(of([])),
      toggleFavorite: vi.fn().mockReturnValue(of({})),
      delete: vi.fn().mockReturnValue(of({})),
    };

    const reviewsServiceMock = {
      getReviewsForMyStations: vi.fn().mockReturnValue(of([])),
      getGivenReviews: vi.fn().mockReturnValue(of([])),
    };

    const toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardHomeComponent, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: BookingsService, useValue: bookingsServiceMock },
        { provide: VehiclesService, useValue: vehiclesServiceMock },
        { provide: StationsService, useValue: stationsServiceMock },
        { provide: ReviewsService, useValue: reviewsServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit avoir userName comme signal calculé", () => {
    expect(typeof component.userName).toBe("function");
    expect(component.userName()).toBe("John");
  });

  it("doit charger les réservations via createPaginatedResource", async () => {
    expect(bookingsServiceMock.getMyBookings).toHaveBeenCalled();
    await fixture.whenStable();

    // upcomingBookings and pastBookings are computed signals from createPaginatedResource
    expect(typeof component.upcomingBookings).toBe("function");
    expect(typeof component.pastBookings).toBe("function");
  });

  it("doit avoir les signaux de pagination pour les réservations", () => {
    expect(typeof component.upcomingPageIndex).toBe("function");
    expect(typeof component.upcomingPageSize).toBe("function");
    expect(typeof component.historyPageIndex).toBe("function");
    expect(typeof component.historyPageSize).toBe("function");
  });

  it("doit avoir des mutations pour les opérations CRUD", () => {
    expect(component.createVehicleMutation).toBeDefined();
    expect(component.deleteVehicleMutation).toBeDefined();
    expect(component.toggleFavoriteMutation).toBeDefined();
    expect(component.deleteStationMutation).toBeDefined();

    expect(typeof component.createVehicleMutation.mutate).toBe("function");
    expect(typeof component.deleteVehicleMutation.mutate).toBe("function");
    expect(typeof component.toggleFavoriteMutation.mutate).toBe("function");
    expect(typeof component.deleteStationMutation.mutate).toBe("function");
  });

  it("doit avoir un formulaire véhicule avec les champs requis", () => {
    expect(component.vehicleForm).toBeDefined();
    expect(component.vehicleForm.get("brand")).toBeDefined();
    expect(component.vehicleForm.get("model")).toBeDefined();
    expect(component.vehicleForm.get("licensePlate")).toBeDefined();
  });

  it("doit avoir un helper pour la couleur de statut", () => {
    expect(component.getBookingStatusColor("completed")).toBe("primary");
    expect(component.getBookingStatusColor("accepted")).toBe("accent");
    expect(component.getBookingStatusColor("cancelled")).toBe("warn");
    expect(component.getBookingStatusColor("pending")).toBe("");
  });

  it("doit avoir les signaux favoris et stations", () => {
    // Les ressources sont maintenant exposées via des computed signals
    expect(component.favoritesResource).toBeDefined();
    expect(typeof component.myFavorites).toBe("function");
    expect(typeof component.myStations).toBe("function");
  });
});
