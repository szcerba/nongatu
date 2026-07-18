import { Routes } from '@angular/router';

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
  { path: 'dashboard', component: Dashboard },
  { path: 'scan', component: Scan },
  { path: 'history', component: History },
  { path: 'products', component: Products },
  { path: 'manual-expense', component: ManualExpense },
  { path: 'budget', component: Budget },
  { path: 'alerts', component: Alerts },
  { path: 'about', component: About },
  { path: 'services', component: Services },
  { path: 'contact', component: Contact },
  { path: '**', component: NotFound }
];
