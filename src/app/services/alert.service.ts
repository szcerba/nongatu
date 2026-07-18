import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { BudgetAlert } from '../models/budget.model';
import { InvoiceService } from './invoice.service';
import { ManualExpenseService } from './manual-expense.service';
import { BudgetService } from './budget.service';
import { CategoryService } from './category.service';

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(
    private invoiceService: InvoiceService,
    private manualExpenseService: ManualExpenseService,
    private budgetService: BudgetService,
    private categoryService: CategoryService,
  ) {}

  async getUnread(): Promise<BudgetAlert[]> {
    return db.alerts.where('read').equals(0).reverse().sortBy('createdAt');
  }

  async getAll(): Promise<BudgetAlert[]> {
    return db.alerts.orderBy('createdAt').reverse().toArray();
  }

  async markAsRead(id: number): Promise<void> {
    await db.alerts.update(id, { read: true });
  }

  async markAllAsRead(): Promise<void> {
    await db.alerts.where('read').equals(0).modify({ read: true });
  }

  async checkForAlerts(month: string): Promise<void> {
    const [invoices, manualExpenses] = await Promise.all([
      this.invoiceService.getByMonth(month),
      this.manualExpenseService.getByMonth(month),
    ]);
    const budgets = await this.budgetService.getForMonth(month);
    const categories = await this.categoryService.getAll();

    const totalSpentByCategory = new Map<number, number>();
    for (const inv of invoices) {
      for (const item of inv.items) {
        const catId = item.categoryId ?? 0;
        totalSpentByCategory.set(catId, (totalSpentByCategory.get(catId) || 0) + item.amount);
      }
    }
    for (const exp of manualExpenses) {
      totalSpentByCategory.set(exp.categoryId, (totalSpentByCategory.get(exp.categoryId) || 0) + exp.amount);
    }

    for (const budget of budgets) {
      const spent = totalSpentByCategory.get(budget.categoryId) ?? 0;
      const cat = categories.find((c) => c.id === budget.categoryId);
      const catName = cat?.name ?? 'Unknown';
      if (spent > budget.limit) {
        const msg = `Excediste el presupuesto de ${catName}: ₲${spent.toLocaleString('es-PY')} de ₲${budget.limit.toLocaleString('es-PY')} (${Math.round((spent / budget.limit) * 100)}%)`;
        await this.createAlert(month, 'exceeded', budget.categoryId, msg, 'high');
      } else if (spent > budget.limit * 0.8) {
        const msg = `Estás cerca del límite de ${catName}: ₲${spent.toLocaleString('es-PY')} de ₲${budget.limit.toLocaleString('es-PY')} (${Math.round((spent / budget.limit) * 100)}%)`;
        await this.createAlert(month, 'warning', budget.categoryId, msg, 'medium');
      }
    }

    const allProducts = await db.products.toArray();
    allProducts.sort((a, b) => b.purchaseCount - a.purchaseCount);
    for (const prod of allProducts.slice(0, 5)) {
      if (prod.purchaseCount >= 3) {
        const msg = `Compraste "${prod.name}" ${prod.purchaseCount} veces. Total gastado: ₲${prod.totalSpent.toLocaleString('es-PY')}`;
        await this.createAlert(month, 'repetitive', prod.categoryId, msg, 'low');
      }
    }
  }

  private async createAlert(
    month: string,
    type: BudgetAlert['type'],
    categoryId: number | undefined,
    message: string,
    severity: BudgetAlert['severity'],
  ): Promise<void> {
    const allAlerts = await db.alerts
      .where('month')
      .equals(month)
      .toArray();
    const exists = allAlerts.some(
      (a) => a.type === type && a.categoryId === categoryId && a.message === message,
    );
    if (exists) return;
    await db.alerts.add({
      month,
      type,
      categoryId,
      message,
      severity,
      read: false,
      createdAt: new Date(),
    });
  }
}
