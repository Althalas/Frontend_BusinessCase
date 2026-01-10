import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { StationsService, Station } from "./stations.service";
import { environment } from "@env/environment";

describe("StationsService", () => {
  let service: StationsService;
  let httpMock: HttpTestingController;

  const mockStations: Station[] = [
    {
      id: 1,
      name: "Station 1",
      city: "Paris",
      latitude: 48.85,
      longitude: 2.35,
      powerKw: 22,
      isActive: true,
      isAvailable: true,
      pricing: [],
    },
    {
      id: 2,
      name: "Station 2",
      city: "Lyon",
      latitude: 45.75,
      longitude: 4.83,
      powerKw: 50,
      isActive: true,
      isAvailable: true,
      pricing: [],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [StationsService],
    });
    service = TestBed.inject(StationsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should retrieve all stations", () => {
    service.getAll(1, 10).subscribe((res) => {
      expect(res.data.length).toBe(2);
      expect(res.data).toEqual(mockStations);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/stations?page=1&limit=10`
    );
    expect(req.request.method).toBe("GET");
    req.flush({
      data: mockStations,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });
  });

  it("should search stations", () => {
    const searchDto = { lat: 48.85, lng: 2.35, radius: 10 };
    service.search(searchDto).subscribe((stations) => {
      expect(stations).toEqual(mockStations);
    });

    const req = httpMock.expectOne((req) =>
      req.url.includes(`${environment.apiUrl}/stations/search`)
    );
    expect(req.request.method).toBe("GET");
    expect(req.request.params.get("lat")).toBe("48.85");
    req.flush(mockStations);
  });

  it("should toggle favorite", () => {
    const response = { favorited: true };
    service.toggleFavorite(1).subscribe((res) => {
      expect(res).toEqual(response);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/stations/1/favorite`);
    expect(req.request.method).toBe("POST");
    req.flush(response);
  });
});
