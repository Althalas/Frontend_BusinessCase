import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { animate, style, transition, trigger } from "@angular/animations";

@Component({
  selector: "app-cookie-consent",
  
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: "./cookie-consent.component.html",
  styleUrl: "./cookie-consent.component.scss",
  animations: [
    trigger("slideIn", [
      transition(":enter", [
        style({ transform: "translateY(100%)", opacity: 0 }),
        animate(
          "300ms ease-out",
          style({ transform: "translateY(0)", opacity: 1 })
        ),
      ]),
      transition(":leave", [
        animate(
          "300ms ease-in",
          style({ transform: "translateY(100%)", opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class CookieConsentComponent {
  accepted = false;

  constructor() {
    const consent = localStorage.getItem("cookieContent");
    if (consent) {
      this.accepted = true;
    }
  }

  accept() {
    localStorage.setItem("cookieContent", "true");
    this.accepted = true;
  }
}
