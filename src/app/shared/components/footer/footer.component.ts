import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";

/**
 * Pied de page de l'application (Footer).
 * Affiche les crédits et liens légaux.
 */
@Component({
  selector: "app-footer",
  
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.scss",
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
