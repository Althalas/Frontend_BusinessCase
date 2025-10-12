import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { VehiclesService, CreateVehicleDto } from "./vehicles.service";
import { environment } from "../../../environments/environment";

describe("VehiclesService", () => {
  let service: VehiclesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [VehiclesService],
    });
    service = TestBed.inject(VehiclesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should get all vehicles", () => {
    const mockVehicles = [{ id: 1, brand: "Tesla" }];

    service.getAll().subscribe((vehicles: any) => {
      expect(vehicles).toEqual(mockVehicles);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vehicles`);
    expect(req.request.method).toBe("GET");
    req.flush(mockVehicles);
  });

  it("should create vehicle", () => {
    const newVehicle: CreateVehicleDto = {
      brand: "Tesla",
      model: "Model 3",
      licensePlate: "AB-123-CD",
    };
    const mockResponse = { id: 1, ...newVehicle };

    service.create(newVehicle).subscribe((vehicle: any) => {
      expect(vehicle).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vehicles`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(newVehicle);
    req.flush(mockResponse);
  });

  it("should delete vehicle", () => {
    service.delete(1).subscribe((res) => {
      expect(res).toBeNull();
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vehicles/1`);
    expect(req.request.method).toBe("DELETE");
    req.flush(null);
  });
});
