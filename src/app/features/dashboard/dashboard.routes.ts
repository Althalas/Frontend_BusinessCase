import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard-home/dashboard-home.component').then(
        (m) => m.DashboardHomeComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./pages/profile/profile.component').then(
        (m) => m.ProfileComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'my-stations',
    loadComponent: () =>
      import('./pages/my-stations/my-stations.component').then(
        (m) => m.MyStationsComponent
      ),
    canActivate: [authGuard],
  },
];
