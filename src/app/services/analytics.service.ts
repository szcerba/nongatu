import { Injectable } from '@angular/core';
import { InvoiceService } from './invoice.service';
import type { Invoice, InvoiceItem } from '../models/invoice.model';
import { CategoryService } from './category.service';
import type { Category } from '../models/category.model';

export interface MonthSummary {
  total: number;
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
    private categoryService: CategoryService,
  ) {}

  async getMonthSummary(month: string): Promise<MonthSummary> {
    const invoices = await this.invoiceService.getByMonth(month);
    return this.computeSummary(invoices, month);
  }

  async getMonthsRange(months: number): Promise<{ month: string; total: number }[]> {
    const allInvoices = await this.invoiceService.getAllWithItems();
    const result: { month: string; total: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7);
      const total = allInvoices
        .filter((inv) => inv.date.startsWith(month))
        .reduce((sum, inv) => sum + inv.total, 0);
      result.push({ month, total });
    }
    return result;
  }

  async getCurrentMonthAlerts(currentMonth: string): Promise<{
    exceeded: boolean;
    percentage: number;
    total: number;
  }> {
    const invoices = await this.invoiceService.getByMonth(currentMonth);
    const total = invoices.reduce((s, i) => s + i.total, 0);
    return { exceeded: false, percentage: 0, total };
  }

  private async computeSummary(invoices: Invoice[], month: string): Promise<MonthSummary> {
    const categories = await this.categoryService.getAll();
    const total = invoices.reduce((s, i) => s + i.total, 0);
    const invoiceCount = invoices.length;

    const allItems = invoices.flatMap((inv) => inv.items);
    const byCategoryMap = new Map<number, number>();
    for (const item of allItems) {
      const catId = item.categoryId ?? 0;
      byCategoryMap.set(catId, (byCategoryMap.get(catId) || 0) + item.amount);
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

    const topBusinesses = [...businessMap.entries()]
      .map(([name, v]) => ({ name, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      total,
      invoiceCount,
      averageTicket: invoiceCount > 0 ? Math.round(total / invoiceCount) : 0,
      byCategory,
      topProducts,
      monthlyTrend: trend,
      topBusinesses,
    };
  }
}
