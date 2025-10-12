import { vi, describe, it, expect, beforeEach } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { VerifyEmailComponent } from "./verify-email.component";
import { HttpClient } from "@angular/common/http";
import { ActivatedRoute } from "@angular/router";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { of } from "rxjs";
import { NO_ERRORS_SCHEMA } from "@angular/core";

describe("VerifyEmailComponent", () => {
  let component: VerifyEmailComponent;
  let fixture: ComponentFixture<VerifyEmailComponent>;
  let http: any;
  let route: any;

  beforeEach(async () => {
    http = {
      post: vi.fn().mockReturnValue(of({})),
    };
    route = {
      queryParams: of({}),
    };

    await TestBed.configureTestingModule({
      imports: [VerifyEmailComponent, NoopAnimationsModule],
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: ActivatedRoute, useValue: route },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should be idle initially", () => {
    expect(component.isLoading()).toBe(false);
    expect(component.success()).toBe(false);
  });

  it("should have verifyForm defined", () => {
    expect(component.verifyForm).toBeDefined();
    expect(component.verifyForm.get("email")).toBeDefined();
    expect(component.verifyForm.get("code")).toBeDefined();
  });

  it("should have onSubmit method", () => {
    expect(typeof component.onSubmit).toBe("function");
  });

  it("should have success and isLoading signals", () => {
    expect(typeof component.success).toBe("function");
    expect(typeof component.isLoading).toBe("function");
  });
});
