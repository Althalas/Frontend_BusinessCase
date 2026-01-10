import { Component } from "@angular/core";
import { MatCardModule } from "@angular/material/card";
import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy } from "@angular/core";

/**
 * Page "À propos".
 * Présente l'entreprise, sa mission et ses valeurs.
 * Contenu statique principalement.
 */
@Component({
  selector: "app-about",
  
  imports: [CommonModule, MatCardModule],
  templateUrl: "./about.component.html",
  styleUrl: "./about.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent { }
