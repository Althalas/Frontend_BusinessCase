import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const BOOKINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/bookings-list/bookings-list.component').then(
        (m) => m.BookingsListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'new/:stationId',
    loadComponent: () =>
      import('./pages/booking-create/booking-create.component').then(
        (m) => m.BookingCreateComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/booking-detail/booking-detail.component').then(
        (m) => m.BookingDetailComponent
      ),
    canActivate: [authGuard],
  },
];
