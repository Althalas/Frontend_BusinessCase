import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { adminGuard } from "./features/admin/guards/admin.guard";

export const routes: Routes = [
  {
    path: "",
    redirectTo: "/dashboard",
    pathMatch: "full",
  },
  {
    path: "auth",
    loadChildren: () =>
      import("./features/auth/auth.routes").then((m) => m.AUTH_ROUTES),
  },
  {
    path: "stations",
    loadChildren: () =>
      import("./features/stations/stations.routes").then(
        (m) => m.STATIONS_ROUTES
      ),
  },
  {
    path: "map",
    loadComponent: () =>
      import(
        "./features/stations/pages/stations-map/stations-map.component"
      ).then((m) => m.StationsMapComponent),
    canActivate: [authGuard],
  },
  {
    path: "bookings",
    loadChildren: () =>
      import("./features/bookings/bookings.routes").then(
        (m) => m.BOOKINGS_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: "dashboard",
    loadChildren: () =>
      import("./features/dashboard/dashboard.routes").then(
        (m) => m.DASHBOARD_ROUTES
      ),
    canActivate: [authGuard],
  },
  {
    path: "admin",
    loadChildren: () =>
      import("./features/admin/admin.routes").then((m) => m.adminRoutes),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: "about",
    loadComponent: () =>
      import("./features/public/pages/about/about.component").then(
        (m) => m.AboutComponent
      ),
  },
  {
    path: "terms",
    loadComponent: () =>
      import("./features/public/pages/terms/terms.component").then(
        (m) => m.TermsComponent
      ),
  },
  {
    path: "contact",
    loadComponent: () =>
      import("./features/public/pages/contact/contact.component").then(
        (m) => m.ContactComponent
      ),
  },
  { path: "**", redirectTo: "/dashboard" },
];
