import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { UsersService } from "./users.service";
import { environment } from "../../../environments/environment";

describe("UsersService", () => {
  let service: UsersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UsersService],
    });
    service = TestBed.inject(UsersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should upload avatar", () => {
    const file = new File(["dummy content"], "avatar.png", { type: "image/png" });
    const mockUser = { id: 1, avatarUrl: "/path/to/avatar.png" };

    service.uploadAvatar(file).subscribe((user) => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/me/avatar`);
    expect(req.request.method).toBe("POST");
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockUser);
  });

  it("should update profile", () => {
    const updateDto = { bio: "New Bio" };
    const mockUser = { id: 1, bio: "New Bio" };

    service.updateProfile(updateDto).subscribe((user) => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/users/me`);
    expect(req.request.method).toBe("PATCH");
    expect(req.request.body).toEqual(updateDto);
    req.flush(mockUser);
  });
});
