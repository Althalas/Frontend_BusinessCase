import { describe, it, expect, beforeEach, vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { AdminDashboardComponent } from "./admin-dashboard.component";
import { HttpClient } from "@angular/common/http";
import { AuthService } from "@core/services/auth.service";
import { ReportsService } from "@core/services/reports.service";
import { StationsService } from "@core/services/stations.service";
import { MatDialog } from "@angular/material/dialog";
import { of } from "rxjs";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

/**
 * Tests unitaires pour AdminDashboardComponent.
 * Vérifie le chargement des ressources paginées et des stats.
 */
describe("AdminDashboardComponent", () => {
    let component: AdminDashboardComponent;
    let fixture: ComponentFixture<AdminDashboardComponent>;
    let httpMock: any;
    let authServiceMock: any;
    let reportsServiceMock: any;
    let stationsServiceMock: any;
    let dialogMock: any;

    const mockStats = {
        totalUsers: 10,
        totalStations: 5,
        totalReservations: 20,
        pendingReservations: 2,
        pendingValidations: 1
    };

    // Standard paginated response format
    const emptyPaginatedResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 }
    };

    beforeEach(async () => {
        httpMock = {
            get: vi.fn((url: string) => {
                if (url.includes("/admin/stats")) return of(mockStats);
                if (url.includes("/users")) return of(emptyPaginatedResponse);
                if (url.includes("/admin/stations")) return of(emptyPaginatedResponse);
                if (url.includes("/admin/reservations")) return of(emptyPaginatedResponse);
                return of(emptyPaginatedResponse);
            }),
            patch: vi.fn().mockReturnValue(of({})),
            delete: vi.fn().mockReturnValue(of({}))
        };

        authServiceMock = {
            getCurrentUser: vi.fn().mockReturnValue({ id: 1, roles: ["admin"] })
        };

        reportsServiceMock = {
            getAllReports: vi.fn().mockReturnValue(of([]))
        };

        stationsServiceMock = {
            deactivate: vi.fn().mockReturnValue(of({}))
        };

        dialogMock = {
            open: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [AdminDashboardComponent, NoopAnimationsModule],
            providers: [
                { provide: HttpClient, useValue: httpMock },
                { provide: AuthService, useValue: authServiceMock },
                { provide: ReportsService, useValue: reportsServiceMock },
                { provide: StationsService, useValue: stationsServiceMock },
                { provide: MatDialog, useValue: dialogMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AdminDashboardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("doit être créé", () => {
        expect(component).toBeTruthy();
    });

    it("doit charger les statistiques via rxResource", async () => {
        await fixture.whenStable();
        expect(component.stats()).toEqual(mockStats);
    });

    it("doit charger les utilisateurs via createPaginatedResource", async () => {
        await fixture.whenStable();
        expect(httpMock.get).toHaveBeenCalled();
        expect(component.users()).toEqual([]);
        expect(component.totalUsers()).toBe(0);
    });

    it("doit avoir des mutations pour les actions admin", () => {
        expect(component.toggleUserStatusMutation).toBeDefined();
        expect(component.deactivateStationMutation).toBeDefined();
        expect(component.cancelReservationMutation).toBeDefined();
        expect(typeof component.toggleUserStatusMutation.mutate).toBe("function");
    });

    it("doit avoir des contrôles de recherche", () => {
        expect(component.usersSearchControl).toBeDefined();
        expect(component.stationsSearchControl).toBeDefined();
        expect(component.reservationsSearchControl).toBeDefined();
    });
});
