import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { MyStationsComponent } from "./my-stations.component";
import { StationsService } from "@core/services/stations.service";
import { AuthService } from "@core/services/auth.service";
import { ToastService } from "@core/services/toast.service";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { provideRouter } from "@angular/router";

/**
 * Tests unitaires pour MyStationsComponent.
 * Vérifie le chargement rxResource et les actions de suppression.
 */
describe("MyStationsComponent", () => {
  let component: MyStationsComponent;
  let fixture: ComponentFixture<MyStationsComponent>;
  let stationsServiceMock: any;
  let authServiceMock: any;
  let toastServiceMock: any;

  const mockStations = [
    { id: 1, name: "Station A", address: "123 Rue", city: "Paris", isActive: true },
    { id: 2, name: "Station B", address: "456 Ave", city: "Lyon", isActive: true },
  ];

  beforeEach(async () => {
    stationsServiceMock = {
      getMyStations: vi.fn().mockReturnValue(of(mockStations)),
      delete: vi.fn().mockReturnValue(of({})),
    };

    authServiceMock = {
      isAdmin: vi.fn().mockReturnValue(false),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [MyStationsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: StationsService, useValue: stationsServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MyStationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit charger les stations via rxResource", async () => {
    expect(stationsServiceMock.getMyStations).toHaveBeenCalled();
    await fixture.whenStable();

    expect(typeof component.stations).toBe("function");
    expect(component.isLoading()).toBe(false);
  });

  it("doit avoir le signal refreshTrigger", () => {
    expect(component.refreshTrigger).toBeDefined();
    expect(typeof component.refreshTrigger).toBe("function");
  });

  it("doit avoir la méthode deleteStation", () => {
    expect(typeof component.deleteStation).toBe("function");
  });

  it("doit avoir deleteStationMutation", () => {
    expect(component.deleteStationMutation).toBeDefined();
    expect(typeof component.deleteStationMutation.mutate).toBe("function");
  });

  it("doit avoir la méthode isAdmin", () => {
    expect(typeof component.isAdmin).toBe("function");
    expect(component.isAdmin()).toBe(false);
  });
});
