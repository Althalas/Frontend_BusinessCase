import { TestBed } from "@angular/core/testing";
import { ThemeService } from "./theme.service";
import { vi } from "vitest";

describe("ThemeService", () => {
  let service: ThemeService;

  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });
    service = TestBed.inject(ThemeService);
    localStorage.clear();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should toggle theme", () => {
    service.darkMode.set(false);
    service.toggleTheme();
    expect(service.isDark()).toBe(true);
    expect(document.body.classList).toContain("dark-theme");
    expect(localStorage.getItem("isDarkMode")).toBe("true");

    service.toggleTheme();
    expect(service.isDark()).toBe(false);
    expect(document.body.classList).not.toContain("dark-theme");
  });

  it("should initialize from local storage", () => {
    localStorage.setItem("isDarkMode", "true");
    // Re-create service to trigger constructor
    const newService = new ThemeService();
    expect(newService.isDark()).toBe(true);
  });
});
