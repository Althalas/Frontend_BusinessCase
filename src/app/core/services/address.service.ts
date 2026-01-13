import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface AddressResult {
  label: string;
  lat: number;
  long: number;
  city: string;
  postcode: string;
}

interface GeoApiResponse {
  features: {
    properties: {
      label: string;
      city: string;
      postcode: string;
    };
    geometry: {
      coordinates: [number, number]; // [lon, lat]
    };
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private http = inject(HttpClient);
  private readonly API_URL = 'https://api-adresse.data.gouv.fr/search/';

  /**
   * Recherche une adresse via l'API du gouvernement français.
   * @param query Le texte de l'adresse à rechercher
   * @returns Observable d'une liste de résultats formatés
   */
  searchAddress(query: string): Observable<AddressResult[]> {
    if (!query || query.length < 3) {
      return of([]);
    }

    // Paramètres: q=query, limit=5, autocomplete=1
    const url = `${this.API_URL}?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`;

    return this.http.get<GeoApiResponse>(url).pipe(
      map((response) =>
        response.features.map((feature) => ({
          label: feature.properties.label,
          lat: feature.geometry.coordinates[1], // API returns [lon, lat]
          long: feature.geometry.coordinates[0],
          city: feature.properties.city,
          postcode: feature.properties.postcode,
        }))
      ),
      catchError(() => of([]))
    );
  }
}
