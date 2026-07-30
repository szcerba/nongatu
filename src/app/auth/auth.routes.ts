import type { Routes } from '@angular/router';
import { guestGuard } from './guards/guest.guard';

export const authRoutes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
];
