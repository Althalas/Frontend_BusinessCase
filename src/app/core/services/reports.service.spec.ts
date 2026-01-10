import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ReportsService } from "./reports.service";
import { environment } from "../../../environments/environment";

describe("ReportsService", () => {
  let service: ReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReportsService],
    });
    service = TestBed.inject(ReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should create report", () => {
    const dto = { reason: "OTHER" };
    service.createReport(dto as any).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/reports`);
    expect(req.request.method).toBe("POST");
    req.flush({});
  });

  it("should get all reports", () => {
    service.getAllReports().subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/reports`);
    expect(req.request.method).toBe("GET");
    req.flush([]);
  });
});
