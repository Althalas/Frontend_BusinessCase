import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CookieConsentComponent } from "./cookie-consent.component";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";

describe("CookieConsentComponent", () => {
  let component: CookieConsentComponent;
  let fixture: ComponentFixture<CookieConsentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CookieConsentComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CookieConsentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("doit être créé", () => {
    expect(component).toBeTruthy();
  });

  it("doit afficher la bannière si non accepté", () => {
    localStorage.removeItem("cookieContent");
    component = new CookieConsentComponent();
    expect(component.accepted).toBeFalsy();
  });

  it("doit cacher la bannière à l'acceptation", () => {
    component.accept();
    expect(component.accepted).toBeTruthy();
    expect(localStorage.getItem("cookieContent")).toBe("true");
  });
});
