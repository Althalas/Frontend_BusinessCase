import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@env/environment";

import { PaginatedResponse } from "@core/models/common.models";

/**
 * Types de connecteurs supportés par l'application.
 */
export type ConnectorType = "TYPE2" | "CCS" | "CHADEMO" | "DOMESTIC";

export interface UserLocation {
  id: number;
  userId: number;
  address: string;
  postalCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface StationSearchFilters {
  lat?: number;
  lng?: number;
  radius?: number; // km
  connectorType?: ConnectorType;
  minPower?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export interface Station {
  id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  powerKw: number;
  connectorType?: ConnectorType;
  isActive: boolean;
  isAvailable?: boolean; // Ajouté
  instructions?: string;
  isOnStand?: boolean;
  photos?: string[];
  location?: {
    id: number;
    userId: number;
    address: string;
    postalCode: string;
    city: string;
    latitude: number;
    longitude: number;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
  pricing?: Array<{
    id: number;
    hourlyRate: number;
    validFrom: string;
    validTo: string | null;
  }>;
}

/**
 * Service de gestion des bornes de recharge (Stations).
 * Gère le CRUD, la recherche avancée, et les interactions propriétaire/admin.
 */
@Injectable({ providedIn: "root" })
export class StationsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + "/stations";

  /**
   * Récupère la liste paginée de toutes les stations.
   * @param page Numéro de page (défaut 1).
   * @param limit Nombre par page (défaut 10).
   */
  getAll(page = 1, limit = 10): Observable<PaginatedResponse<Station>> {
    return this.http.get<PaginatedResponse<Station>>(this.apiUrl, {
      params: { page, limit },
    });
  }

  /**
   * Recherche des stations avec des filtres spécifiques.
   * @param filters Objet contenant les critères de recherche.
   */
  search(filters: StationSearchFilters): Observable<PaginatedResponse<Station>> {
    let params = new HttpParams();
    const allowedKeys = ['page', 'limit', 'lat', 'lng', 'radius', 'connectorType', 'minPower', 'maxPrice', 'search'];

    Object.keys(filters).forEach((key) => {
      if (allowedKeys.includes(key)) {
        const value = (filters as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value);
        }
      }
    });
    return this.http.get<PaginatedResponse<Station>>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Récupère une station par son ID.
   */
  getById(id: number): Observable<Station> {
    return this.http.get<Station>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crée une nouvelle station (Requalification).
   * @param station Les données de la station.
   */
  create(station: Partial<Station>): Observable<Station> {
    return this.http.post<Station>(this.apiUrl, station);
  }

  /**
   * Met à jour une station existante.
   */
  update(id: number, station: Partial<Station>): Observable<Station> {
    return this.http.patch<Station>(`${this.apiUrl}/${id}`, station);
  }

  /**
   * Supprime une station.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère la liste des stations dont l'utilisateur est propriétaire.
   */
  getMyStations(): Observable<Station[]> {
    return this.http.get<Station[]>(`${this.apiUrl}/my`);
  }

  /**
   * Ajoute ou retire une station des favoris.
   */
  toggleFavorite(id: number): Observable<{ favorited: boolean }> {
    return this.http.post<{ favorited: boolean }>(
      `${this.apiUrl}/${id}/favorite`,
      {}
    );
  }

  /**
   * Récupère la liste des stations favorites de l'utilisateur.
   */
  getFavorites(): Observable<Station[]> {
    return this.http.get<Station[]>(`${this.apiUrl}/favorites/list`);
  }

  /**
   * Récupère les lieux enregistrés de l'utilisateur.
   */
  getMyLocations(): Observable<UserLocation[]> {
    return this.http.get<UserLocation[]>(`${this.apiUrl}/my-locations`);
  }

  // Réservé aux administrateurs
  /**
   * Désactive administrativement une station.
   * @param message Message expliquant la raison.
   */
  deactivate(id: number, message: string): Observable<Station> {
    return this.http.patch<Station>(`${this.apiUrl}/${id}/deactivate`, {
      message,
    });
  }

  /**
   * Permet au propriétaire de basculer la disponibilité de sa station.
   */
  toggleAvailability(id: number): Observable<Station> {
    return this.http.patch<Station>(`${this.apiUrl}/${id}/availability`, {});
  }
}

// Fonctions utilitaires pour obtenir les propriétés de la station
/**
 * Helper: Récupère l'adresse affichable d'une station.
 * Priorise l'adresse complète, sinon la ville.
 */
export function getStationAddress(station: Station): string {
  return station.location?.address || station.city || "";
}

/**
 * Helper: Récupère la puissance de la station en kW.
 */
export function getStationPower(station: Station): number {
  return station.powerKw;
}

/**
 * Helper: Récupère le tarif horaire de la station.
 * Prend le premier tarif disponible ou 0.
 */
export function getStationPrice(station: Station): number {
  return station.pricing?.[0]?.hourlyRate || 0;
}

export type StationStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

/**
 * Helper: Détermine le statut d'une station (AVAILABLE, BUSY, OFFLINE).
 */
export function getStationStatus(s: Station): StationStatus {
  if (!s.isActive) return 'OFFLINE';
  if (s.isAvailable === false) return 'BUSY';
  return 'AVAILABLE';
}

/**
 * Helper: Retourne le libellé du statut pour l'affichage.
 */
export function getStationStatusLabel(s: Station): string {
  const status = getStationStatus(s);
  switch (status) {
    case 'AVAILABLE': return 'Disponible';
    case 'BUSY': return 'Occupée';
    case 'OFFLINE': return 'Hors-ligne';
  }
}
