import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@env/environment";

/**
 * Interface représentant un véhicule utilisateur.
 */
export interface Vehicle {
  id: number;
  brand: string;
  model: string;
  licensePlate: string;
  connectorType?: "TYPE2" | "CCS" | "CHADEMO" | "DOMESTIC";
  batteryCapacity?: number;
  createdAt: string;
}

export interface CreateVehicleDto {
  brand: string;
  model: string;
  licensePlate: string;
  connectorType?: "TYPE2" | "CCS" | "CHADEMO" | "DOMESTIC";
  batteryCapacity?: number;
}

/**
 * Service de gestion des véhicules.
 * Permet le CRUD complet des véhicules de l'utilisateur.
 */
@Injectable({ providedIn: "root" })
export class VehiclesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + "/vehicles";

  /**
   * Récupère tous les véhicules de l'utilisateur connecté.
   */
  getAll(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.apiUrl);
  }

  /**
   * Récupère un véhicule par son ID.
   */
  getById(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.apiUrl}/${id}`);
  }

  /**
   * Ajoute un nouveau véhicule.
   */
  create(vehicle: CreateVehicleDto): Observable<Vehicle> {
    return this.http.post<Vehicle>(this.apiUrl, vehicle);
  }

  /**
   * Met à jour un véhicule existant.
   */
  update(id: number, vehicle: Partial<CreateVehicleDto>): Observable<Vehicle> {
    return this.http.patch<Vehicle>(`${this.apiUrl}/${id}`, vehicle);
  }

  /**
   * Supprime un véhicule.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
