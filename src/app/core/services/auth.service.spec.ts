import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { AuthService } from "./auth.service";
import { User, UserRole } from "@core/models/user.model";
import { environment } from "@env/environment";

describe("AuthService", () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockUser: User = {
    id: 1,
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    roles: ["client"],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it("doit être créé", () => {
    expect(service).toBeTruthy();
  });

  describe("register", () => {
    it("doit envoyer une requête POST vers l'endpoint register", () => {
      const registerData = { email: "new@example.com", password: "password" };
      const response = { message: "Registration successful" };

      service.register(registerData).subscribe((res) => {
        expect(res).toEqual(response);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe("POST");
      req.flush(response);
    });
  });

  describe("login", () => {
    it("doit authentifier l'utilisateur et stocker les tokens", () => {
      const loginData = { email: "test@example.com", password: "password" };
      const response = {
        accessToken: "fake-jwt-token",
        refreshToken: "fake-refresh-token",
        user: mockUser,
      };

      service.login(loginData.email, loginData.password).subscribe((res) => {
        expect(res).toEqual(response);
        expect(localStorage.getItem("token")).toBe(response.accessToken);
        expect(localStorage.getItem("user")).toBeTruthy();
        expect(service.getCurrentUser()?.email).toBe(mockUser.email);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe("POST");
      req.flush(response);
    });
  });

  describe("logout", () => {
    it("doit vider le localStorage et l'utilisateur courant", () => {
      localStorage.setItem("token", "old-token");
      service.logout();
      expect(localStorage.getItem("token")).toBeNull();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe("Roles", () => {
    it("doit identifier correctement un admin", () => {
      const adminUser = { ...mockUser, roles: ["admin"] as UserRole[] };
      service["_currentUser"].set(adminUser);
      expect(service.isAdmin()).toBe(true);
    });

    it("doit identifier correctement un propriétaire", () => {
      const ownerUser = { ...mockUser, roles: ["owner"] as UserRole[] };
      service["_currentUser"].set(ownerUser);
      expect(service.isOwner()).toBe(true);
    });
  });
});
