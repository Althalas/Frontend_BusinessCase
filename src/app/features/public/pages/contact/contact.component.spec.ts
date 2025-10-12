import { vi } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ContactComponent } from "./contact.component";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { ToastService } from "@core/services/toast.service";

describe("ContactComponent", () => {
  let component: ContactComponent;
  let fixture: ComponentFixture<ContactComponent>;

  const mockToastService = {
    success: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent, NoopAnimationsModule],
      providers: [{ provide: ToastService, useValue: mockToastService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should initialize form invalid", () => {
    expect(component.contactForm.valid).toBeFalsy();
  });

  it("should validate form correctly", () => {
    component.contactForm.patchValue({
      name: "John Doe",
      email: "john@test.com",
      subject: "Help",
      message: "I need help",
    });
    expect(component.contactForm.valid).toBeTruthy();
  });
});
