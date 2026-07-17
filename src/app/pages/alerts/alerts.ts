import { Component, signal } from '@angular/core';
import { AlertService } from '../../services/alert.service';
import { CategoryService } from '../../services/category.service';
import type { BudgetAlert } from '../../models/budget.model';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.html',
  styleUrl: './alerts.css'
})
export class Alerts {
  alerts = signal<BudgetAlert[]>([]);
  categories = signal<{ [id: number]: string }>({});
  loading = signal(true);

  constructor(
    private alertService: AlertService,
    private categoryService: CategoryService,
  ) {
    this.load();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-PY', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  }

  async markRead(id: number) {
    await this.alertService.markAsRead(id);
    this.alerts.update((list) => list.filter((a) => a.id !== id));
  }

  async markAllRead() {
    await this.alertService.markAllAsRead();
    this.alerts.set([]);
  }

  private async load() {
    this.loading.set(true);
    const [alerts, categories] = await Promise.all([
      this.alertService.getAll(),
      this.categoryService.getAll(),
    ]);
    const catMap: { [id: number]: string } = {};
    for (const c of categories) {
      if (c.id) catMap[c.id] = c.name;
    }
    this.alerts.set(alerts);
    this.categories.set(catMap);
    this.loading.set(false);
  }
}
