import Dexie, { type Table } from 'dexie';
import type { Invoice, InvoiceItem } from '../models/invoice.model';
import type { Category } from '../models/category.model';
import type { Product } from '../models/product.model';
import type { MonthlyBudget, BudgetAlert } from '../models/budget.model';
import type { ManualExpense } from '../models/manual-expense.model';

export class AppDatabase extends Dexie {
  invoices!: Table<Invoice, number>;
  invoiceItems!: Table<InvoiceItem, number>;
  categories!: Table<Category, number>;
  products!: Table<Product, number>;
  budgets!: Table<MonthlyBudget, number>;
  alerts!: Table<BudgetAlert, number>;
  manualExpenses!: Table<ManualExpense, number>;

  constructor() {
    super('ÑongatuDB');
    this.version(3).stores({
      invoices: '++id, business, date, createdAt',
      invoiceItems: '++id, invoiceId, categoryId',
      categories: '++id, name',
      products: '++id, normalized, purchaseCount',
      budgets: '++id, month',
      alerts: '++id, month, type, read, createdAt',
      manualExpenses: '++id, date, categoryId',
    });
  }
}

export const db = new AppDatabase();
