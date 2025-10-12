import { TestBed } from '@angular/core/testing';
import { AddressService } from './address.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('AddressService', () => {
  let service: AddressService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AddressService],
    });
    service = TestBed.inject(AddressService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty array if query is too short', () => {
    service.searchAddress('ab').subscribe((results) => {
      expect(results.length).toBe(0);
    });
    httpMock.expectNone('https://api-adresse.data.gouv.fr/search/');
  });

  it('should return empty array if query is empty', () => {
    service.searchAddress('').subscribe((results) => {
      expect(results.length).toBe(0);
    });
    httpMock.expectNone('https://api-adresse.data.gouv.fr/search/');
  });

  it('should call API and map results correctly', () => {
    const mockResponse = {
      features: [
        {
          properties: {
            label: '8 Bd du Port',
            city: 'Amiens',
            postcode: '80000',
          },
          geometry: {
            coordinates: [2.290084, 49.897442], // lon, lat
          },
        },
      ],
    };

    service.searchAddress('8 Bd du Port').subscribe((results) => {
      expect(results.length).toBe(1);
      expect(results[0].label).toBe('8 Bd du Port');
      expect(results[0].city).toBe('Amiens');
      expect(results[0].postcode).toBe('80000');
      expect(results[0].lat).toBe(49.897442);
      expect(results[0].long).toBe(2.290084);
    });

    const req = httpMock.expectOne((request) =>
      request.url.includes('https://api-adresse.data.gouv.fr/search/')
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toContain('q=8%20Bd%20du%20Port');
    req.flush(mockResponse);
  });

  it('should return empty array on API error', () => {
    service.searchAddress('Error Address').subscribe((results) => {
      expect(results.length).toBe(0);
    });

    const req = httpMock.expectOne((request) =>
      request.url.includes('https://api-adresse.data.gouv.fr/search/')
    );
    req.flush('Error', { status: 500, statusText: 'Server Error' });
  });
});
