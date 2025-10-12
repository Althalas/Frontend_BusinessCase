import { Component, ChangeDetectionStrategy } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { CommonModule } from "@angular/common";

/**
 * Page des Conditions Générales d'Utilisation (CGU).
 * Affiche les termes légaux de la plateforme.
 */
@Component({
  selector: "app-terms",
  
  imports: [CommonModule, MatCardModule],
  templateUrl: "./terms.component.html",
  styleUrl: "./terms.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsComponent { }
