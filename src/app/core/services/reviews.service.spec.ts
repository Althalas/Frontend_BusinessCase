import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ReviewsService } from "./reviews.service";
import { environment } from "../../../environments/environment";

describe("ReviewsService", () => {
  let service: ReviewsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReviewsService],
    });
    service = TestBed.inject(ReviewsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should find by station", () => {
    service.findByStation(1).subscribe((reviews) => {
      expect(reviews.length).toBe(0);
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/reviews/station/1`);
    expect(req.request.method).toBe("GET");
    req.flush([]);
  });

  it("should create review", () => {
    const dto = { stationId: 1, rating: 5, comment: "Great" };
    service.create(dto).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/reviews`);
    expect(req.request.method).toBe("POST");
    req.flush({});
  });
});
