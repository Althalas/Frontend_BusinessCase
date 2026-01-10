import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, RouterOutlet, NavigationEnd } from "@angular/router";
import { filter, map } from "rxjs/operators";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavbarComponent } from "./shared/components/navbar/navbar.component";
import { FooterComponent } from "./shared/components/footer/footer.component";

import { CookieConsentComponent } from "./core/components/cookie-consent/cookie-consent.component";

@Component({
  selector: "app-root",
  
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    CookieConsentComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  private router = inject(Router);

  // Signal réactive pour afficher le layout
  showLayout = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event: NavigationEnd) => !event.url.includes("/auth/"))
    ),
    { initialValue: false }
  );

  title = "Electricity Business";
}
