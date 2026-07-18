import { Injectable } from '@angular/core';
import { InvoiceService } from './invoice.service';
import type { Invoice, InvoiceItem } from '../models/invoice.model';
import { ManualExpenseService } from './manual-expense.service';
import type { ManualExpense } from '../models/manual-expense.model';
import { CategoryService } from './category.service';
import type { Category } from '../models/category.model';

export interface MonthSummary {
  total: number;
  invoiceTotal: number;
  manualTotal: number;
  invoiceCount: number;
  averageTicket: number;
  byCategory: { category: Category; total: number; percentage: number }[];
  topProducts: { name: string; total: number; count: number }[];
  monthlyTrend: { month: string; total: number }[];
  topBusinesses: { name: string; total: number; count: number }[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(
    private invoiceService: InvoiceService,
    private manualExpenseService: ManualExpenseService,
    private categoryService: CategoryService,
  ) {}

  async getMonthSummary(month: string): Promise<MonthSummary> {
    const [invoices, manualExpenses] = await Promise.all([
      this.invoiceService.getByMonth(month),
      this.manualExpenseService.getByMonth(month),
    ]);
    return this.computeSummary(invoices, manualExpenses, month);
  }

  async getMonthsRange(months: number): Promise<{ month: string; total: number }[]> {
    const [allInvoices, allManual] = await Promise.all([
      this.invoiceService.getAllWithItems(),
      this.manualExpenseService.getAll(),
    ]);
    const result: { month: string; total: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      const invTotal = allInvoices
        .filter((inv) => inv.date.startsWith(month))
        .reduce((sum, inv) => sum + inv.total, 0);
      const manTotal = allManual
        .filter((e) => e.date.startsWith(month))
        .reduce((sum, e) => sum + e.amount, 0);
      result.push({ month, total: invTotal + manTotal });
    }
    return result;
  }

  async getCurrentMonthAlerts(currentMonth: string): Promise<{
    exceeded: boolean;
    percentage: number;
    total: number;
  }> {
    const [invoices, manualExpenses] = await Promise.all([
      this.invoiceService.getByMonth(currentMonth),
      this.manualExpenseService.getByMonth(currentMonth),
    ]);
    const invTotal = invoices.reduce((s, i) => s + i.total, 0);
    const manTotal = manualExpenses.reduce((s, e) => s + e.amount, 0);
    return { exceeded: false, percentage: 0, total: invTotal + manTotal };
  }

  private async computeSummary(invoices: Invoice[], manualExpenses: ManualExpense[], month: string): Promise<MonthSummary> {
    const categories = await this.categoryService.getAll();
    const invoiceTotal = invoices.reduce((s, i) => s + i.total, 0);
    const manualTotal = manualExpenses.reduce((s, e) => s + e.amount, 0);
    const total = invoiceTotal + manualTotal;
    const invoiceCount = invoices.length;

    const allItems = invoices.flatMap((inv) => inv.items);
    const byCategoryMap = new Map<number, number>();
    for (const item of allItems) {
      const catId = item.categoryId ?? 0;
      byCategoryMap.set(catId, (byCategoryMap.get(catId) || 0) + item.amount);
    }
    for (const exp of manualExpenses) {
      byCategoryMap.set(exp.categoryId, (byCategoryMap.get(exp.categoryId) || 0) + exp.amount);
    }

    const byCategory = categories
      .map((cat) => ({
        category: cat,
        total: byCategoryMap.get(cat.id!) ?? 0,
        percentage: total > 0 ? Math.round((((byCategoryMap.get(cat.id!) ?? 0) / total) * 100) * 10) / 10 : 0,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    const productTotals = new Map<string, { total: number; count: number }>();
    for (const item of allItems) {
      const key = item.description.toLowerCase();
      const existing = productTotals.get(key) || { total: 0, count: 0 };
      existing.total += item.amount;
      existing.count += item.quantity;
      productTotals.set(key, existing);
    }
    for (const exp of manualExpenses) {
      const key = exp.description.toLowerCase();
      const existing = productTotals.get(key) || { total: 0, count: 0 };
      existing.total += exp.amount;
      existing.count++;
      productTotals.set(key, existing);
    }

    const topProducts = [...productTotals.entries()]
      .map(([key, v]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        total: v.total,
        count: v.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const trend = await this.getMonthsRange(6);

    const businessMap = new Map<string, { total: number; count: number }>();
    for (const inv of invoices) {
      const existing = businessMap.get(inv.business) || { total: 0, count: 0 };
      existing.total += inv.total;
      existing.count++;
      businessMap.set(inv.business, existing);
    }
    for (const exp of manualExpenses) {
      const name = 'Gasto Manual';
      const existing = businessMap.get(name) || { total: 0, count: 0 };
      existing.total += exp.amount;
      existing.count++;
      businessMap.set(name, existing);
    }

    const topBusinesses = [...businessMap.entries()]
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      total,
      invoiceTotal,
      manualTotal,
      invoiceCount,
      averageTicket: invoiceCount > 0 ? Math.round(invoiceTotal / invoiceCount) : 0,
      byCategory,
      topProducts,
      monthlyTrend: trend,
      topBusinesses,
    };
  }
}
