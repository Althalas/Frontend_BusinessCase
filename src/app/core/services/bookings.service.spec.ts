import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { BookingsService, Booking, CreateBookingDto } from "./bookings.service";
import { environment } from "@env/environment";

describe("BookingsService", () => {
  let service: BookingsService;
  let httpMock: HttpTestingController;

  const mockBooking: Booking = {
    id: 1,
    stationId: 10,
    userId: 5,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    totalPrice: 15.5,
    status: "pending",
    createdAt: new Date().toISOString(),
    station: { name: "Test Station" } as any,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BookingsService],
    });
    service = TestBed.inject(BookingsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("doit être créé", () => {
    expect(service).toBeTruthy();
  });

  it("doit créer une réservation", () => {
    const newBooking: CreateBookingDto = {
      stationId: 10,
      startTime: "2025-01-01T10:00:00Z",
      endTime: "2025-01-01T12:00:00Z",
      vehicleId: 1,
    };

    service.create(newBooking).subscribe((booking) => {
      expect(booking).toEqual(mockBooking);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/bookings`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body).toEqual(newBooking);
    req.flush(mockBooking);
  });

  it("doit récupérer mes réservations avec pagination", () => {
    const params = { page: 1, limit: 10, timeFilter: "upcoming" as const };

    service.getMyBookings(params).subscribe((response) => {
      expect(response.data.length).toBe(1);
      expect(response.data[0]).toEqual(mockBooking);
      expect(response.meta.total).toBe(1);
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/bookings/my` &&
             r.params.get("page") === "1" &&
             r.params.get("limit") === "10"
    );
    expect(req.request.method).toBe("GET");
    req.flush({
      data: [mockBooking],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 }
    });
  });
});
