import { Injectable } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { AnalyticsService } from './analytics.service';
import { AlertService } from './alert.service';
import { BudgetService } from './budget.service';

interface WidgetBridgePlugin {
  updateWidgetData(options: { data: string }): Promise<void>;
  getWidgetData(): Promise<{ data: string }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

@Injectable({ providedIn: 'root' })
export class WidgetBridgeService {
  private isNative = !!(window as any).Capacitor?.isNative;

  constructor(
    private analyticsService: AnalyticsService,
    private alertService: AlertService,
    private budgetService: BudgetService,
  ) {}

  async updateWidget(): Promise<void> {
    if (!this.isNative) return;

    const now = new Date();
    const month = now.toISOString().slice(0, 7);
    const monthName = now.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const [summary, alerts, budgets] = await Promise.all([
      this.analyticsService.getMonthSummary(month),
      this.alertService.getUnread(),
      this.budgetService.getForMonth(month),
    ]);

    const data = JSON.stringify({
      monthName: capitalized,
      totalSpent: summary.total,
      budgetLimit: budgets.reduce((s, b) => s + b.limit, 0),
      unreadAlerts: alerts.length,
    });

    try {
      await WidgetBridge.updateWidgetData({ data });
    } catch (e) {
      console.error('Widget update failed:', e);
    }
  }
}
