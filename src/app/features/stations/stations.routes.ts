import { Routes } from "@angular/router";

export const STATIONS_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/stations-list/stations-list.component").then(
        (m) => m.StationsListComponent
      ),
  },

  {
    path: "new",
    loadComponent: () =>
      import("./pages/station-form/station-form.component").then(
        (m) => m.StationFormComponent
      ),
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./pages/station-detail/station-detail.component").then(
        (m) => m.StationDetailComponent
      ),
  },
  {
    path: ":id/edit",
    loadComponent: () =>
      import("./pages/station-form/station-form.component").then(
        (m) => m.StationFormComponent
      ),
  },
];
