import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { MonthlyBudget } from '../models/budget.model';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  async getForMonth(month: string): Promise<MonthlyBudget[]> {
    return db.budgets.where('month').equals(month).toArray();
  }

  async setBudget(budget: MonthlyBudget): Promise<number> {
    const existing = await db.budgets
      .where('month')
      .equals(budget.month)
      .and((b) => b.categoryId === budget.categoryId)
      .first();
    if (existing) {
      await db.budgets.update(existing.id!, { limit: budget.limit });
      return existing.id!;
    }
    return db.budgets.add(budget) as Promise<number>;
  }

  async deleteBudget(id: number): Promise<void> {
    await db.budgets.delete(id);
  }

  async getTotalBudgetForMonth(month: string): Promise<number> {
    const budgets = await this.getForMonth(month);
    return budgets.reduce((s, b) => s + b.limit, 0);
  }
}
