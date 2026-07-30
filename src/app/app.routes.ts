import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';

import { About } from './pages/about/about';
import { Services } from './pages/services/services';
import { Contact } from './pages/contact/contact';
import { Dashboard } from './pages/dashboard/dashboard';
import { Scan } from './pages/scan/scan';
import { History } from './pages/history/history';
import { Products } from './pages/products/products';
import { ManualExpense } from './pages/manual-expense/manual-expense';
import { Budget } from './pages/budget/budget';
import { Alerts } from './pages/alerts/alerts';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', loadChildren: () => import('./auth/auth.routes').then((m) => m.authRoutes) },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'scan', component: Scan, canActivate: [authGuard] },
  { path: 'history', component: History, canActivate: [authGuard] },
  { path: 'products', component: Products, canActivate: [authGuard] },
  { path: 'manual-expense', component: ManualExpense, canActivate: [authGuard] },
  { path: 'budget', component: Budget, canActivate: [authGuard] },
  { path: 'alerts', component: Alerts, canActivate: [authGuard] },
  { path: 'about', component: About, canActivate: [authGuard] },
  { path: 'services', component: Services, canActivate: [authGuard] },
  { path: 'contact', component: Contact, canActivate: [authGuard] },
  { path: '**', component: NotFound }
];
