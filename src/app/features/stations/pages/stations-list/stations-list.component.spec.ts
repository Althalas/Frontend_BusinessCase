import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { StationsListComponent } from "./stations-list.component";
import { StationsService } from "@core/services/stations.service";
import { VehiclesService } from "@core/services/vehicles.service";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ActivatedRoute } from "@angular/router";
import { NO_ERRORS_SCHEMA } from "@angular/core";

/**
 * Tests unitaires pour StationsListComponent.
 * Vérifie le chargement paginé via createPaginatedResource et les mutations.
 */
describe("StationsListComponent", () => {
  let component: StationsListComponent;
  let fixture: ComponentFixture<StationsListComponent>;
  let stationsServiceMock: any;
  let vehiclesServiceMock: any;

  const mockStations = [
    {
      id: 1,
      name: "Station 1",
      city: "Paris",
      powerKw: 22,
      pricing: [{ hourlyRate: 10 }],
      location: { address: "Paris" },
    },
    {
      id: 2,
      name: "Station 2",
      city: "Lyon",
      powerKw: 50,
      pricing: [{ hourlyRate: 15 }],
      location: { address: "Lyon" },
    },
  ];

  beforeEach(async () => {
    // Mock returns paginated format with PaginationMeta structure (backend format)
    stationsServiceMock = {
      search: vi.fn().mockReturnValue(of({
        data: mockStations,
        meta: {
          total: 2,
          currentPage: 1,
          itemsPerPage: 10,
          totalPages: 1
        }
      })),
      getFavorites: vi.fn().mockReturnValue(of([])),
      toggleFavorite: vi.fn().mockReturnValue(of({})),
    };

    vehiclesServiceMock = {
      getAll: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [StationsListComponent, NoopAnimationsModule],
      providers: [
        { provide: StationsService, useValue: stationsServiceMock },
        { provide: VehiclesService, useValue: vehiclesServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => null } },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StationsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit charger les stations de manière réactive via createPaginatedResource", async () => {
    expect(stationsServiceMock.search).toHaveBeenCalled();
    await fixture.whenStable();

    // stations is the data signal from createPaginatedResource
    expect(typeof component.stations).toBe("function");
    expect(component.isLoading()).toBe(false);
  });

  it("doit avoir toggleFavoriteMutation", () => {
    expect(component.toggleFavoriteMutation).toBeDefined();
    expect(typeof component.toggleFavoriteMutation.mutate).toBe("function");
  });

  it("doit avoir filterForm défini", () => {
    expect(component.filterForm).toBeDefined();
    expect(component.filterForm.get("search")).toBeDefined();
    expect(component.filterForm.get("minPower")).toBeDefined();
    expect(component.filterForm.get("connectorType")).toBeDefined();
  });

  it("doit avoir la méthode resetFilters", () => {
    expect(typeof component.resetFilters).toBe("function");
    component.filterForm.patchValue({ minPower: 20 });
    component.resetFilters();
    expect(component.filterForm.value.minPower).toBeNull();
  });

  it("doit gérer le changement de page", () => {
    expect(typeof component.onPageChange).toBe("function");
    const pageEvent = { pageIndex: 1, pageSize: 20, length: 100 };
    component.onPageChange(pageEvent as any);

    // Component uses pageIndex (0-based for MatPaginator)
    expect(component.pageIndex()).toBe(1);
    expect(component.pageSize()).toBe(20);
  });

  it("doit avoir les signaux de pagination", () => {
    expect(typeof component.pageIndex).toBe("function");
    expect(typeof component.pageSize).toBe("function");
    expect(typeof component.totalItems).toBe("function");
  });

  it("doit avoir la ressource favoris", () => {
    expect(component.favoritesResource).toBeDefined();
    expect(typeof component.favoriteIds).toBe("function");
  });
});
