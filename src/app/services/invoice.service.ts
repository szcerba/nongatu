import { Injectable } from '@angular/core';
import { db } from './database.service';
import type { Invoice, InvoiceItem } from '../models/invoice.model';
import type { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  async save(invoice: Invoice): Promise<number> {
    const id = await db.invoices.add(invoice);
    for (const item of invoice.items) {
      item.invoiceId = id as number;
      await db.invoiceItems.add(item);
      await this.updateProduct(item);
    }
    return id as number;
  }

  async delete(id: number): Promise<void> {
    await db.invoiceItems.where('invoiceId').equals(id).delete();
    await db.invoices.delete(id);
  }

  async getAll(): Promise<Invoice[]> {
    return db.invoices.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: number): Promise<Invoice | undefined> {
    const invoice = await db.invoices.get(id);
    if (!invoice) return undefined;
    invoice.items = await db.invoiceItems.where('invoiceId').equals(id).toArray();
    return invoice;
  }

  async getAllWithItems(): Promise<Invoice[]> {
    const invoices = await this.getAll();
    for (const inv of invoices) {
      inv.items = await db.invoiceItems.where('invoiceId').equals(inv.id!).toArray();
    }
    return invoices;
  }

  async getByMonth(month: string): Promise<Invoice[]> {
    const all = await this.getAllWithItems();
    return all.filter((i) => i.date.startsWith(month));
  }

  async search(term: string): Promise<Invoice[]> {
    const termLc = term.toLowerCase();
    const all = await this.getAllWithItems();
    return all.filter(
      (inv) =>
        inv.business.toLowerCase().includes(termLc) ||
        inv.ruc.includes(term) ||
        inv.items.some((it) => it.description.toLowerCase().includes(termLc)),
    );
  }

  async getDistinctBusinesses(): Promise<string[]> {
    const invoices = await db.invoices.toArray();
    return [...new Set(invoices.map((i) => i.business))];
  }

  private async updateProduct(item: InvoiceItem): Promise<void> {
    const normalized = item.description.toLowerCase().trim();
    const existing = await db.products
      .where('normalized')
      .equals(normalized)
      .first();

    if (existing) {
      await db.products.update(existing.id!, {
        purchaseCount: existing.purchaseCount + 1,
        totalSpent: existing.totalSpent + item.amount,
        averagePrice: Math.round((existing.totalSpent + item.amount) / (existing.purchaseCount + 1)),
        lastPurchased: new Date().toISOString(),
      });
    } else {
      await db.products.add({
        name: item.description,
        normalized,
        categoryId: item.categoryId,
        purchaseCount: 1,
        totalSpent: item.amount,
        averagePrice: item.amount,
        lastPurchased: new Date().toISOString(),
      });
    }
  }
}
