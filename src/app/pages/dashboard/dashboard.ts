import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AnalyticsService, type MonthSummary } from '../../services/analytics.service';
import { InvoiceService } from '../../services/invoice.service';
import { AlertService } from '../../services/alert.service';
import { BudgetService } from '../../services/budget.service';
import { CategoryService } from '../../services/category.service';
import type { BudgetAlert } from '../../models/budget.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  imports: [DecimalPipe, RouterLink],
})
export class Dashboard {
  summary = signal<MonthSummary | null>(null);
  alerts = signal<BudgetAlert[]>([]);
  totalBudget = signal(0);
  currentMonth = new Date().toISOString().slice(0, 7);
  loading = signal(true);

  constructor(
    private analytics: AnalyticsService,
    private invoiceService: InvoiceService,
    private alertService: AlertService,
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private router: Router,
  ) {
    this.load();
  }

  formatGs(value: number): string {
    return `${value.toLocaleString('es-PY')} ₲s.`;
  }

  getCategoryColor(index: number): string {
    const colors = ['#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#8b5cf6', '#06b6d4', '#6b7280'];
    return colors[index % colors.length];
  }

  goTo(path: string) {
    this.router.navigate([path]);
  }

  getMax(values: number[]): number {
    return Math.max(...values);
  }

  private async load() {
    this.loading.set(true);
    const summary = await this.analytics.getMonthSummary(this.currentMonth);
    const alerts = await this.alertService.getUnread();
    const totalBudget = await this.budgetService.getTotalBudgetForMonth(this.currentMonth);
    this.summary.set(summary);
    this.alerts.set(alerts);
    this.totalBudget.set(totalBudget);
    this.loading.set(false);
  }
}
