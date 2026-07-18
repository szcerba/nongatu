import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { ManualExpense } from '../models/manual-expense.model';
import { CategoryService } from './category.service';

@Injectable({ providedIn: 'root' })
export class ManualExpenseService {

  async getAll(): Promise<ManualExpense[]> {
    return db.manualExpenses.orderBy('date').reverse().toArray();
  }

  async getByMonth(month: string): Promise<ManualExpense[]> {
    return db.manualExpenses
      .where('date')
      .startsWith(month)
      .toArray();
  }

  async save(expense: ManualExpense): Promise<number> {
    return db.manualExpenses.add(expense) as Promise<number>;
  }

  async delete(id: number): Promise<void> {
    await db.manualExpenses.delete(id);
  }

  async getTotalByMonth(month: string): Promise<number> {
    const expenses = await this.getByMonth(month);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }
}
