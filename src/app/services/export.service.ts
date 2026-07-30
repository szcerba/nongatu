import { Injectable } from '@angular/core';
import { db } from './database.service';
import { DEFAULT_CATEGORIES, type Category } from '../models/category.model';
import type { Invoice, InvoiceItem } from '../models/invoice.model';
import type { Product } from '../models/product.model';
import type { MonthlyBudget, BudgetAlert } from '../models/budget.model';
import type { ManualExpense } from '../models/manual-expense.model';

@Injectable({ providedIn: 'root' })
export class ExportService {

  async generateCsv(): Promise<string> {
    const [invoices, invoiceItems, categories, products, budgets, alerts, manualExpenses] = await Promise.all([
      db.invoices.toArray(),
      db.invoiceItems.toArray(),
      db.categories.count().then(c => c > 0 ? db.categories.toArray() : Promise.resolve(DEFAULT_CATEGORIES)),
      db.products.toArray(),
      db.budgets.toArray(),
      db.alerts.toArray(),
      db.manualExpenses.toArray(),
    ]);

    const catMap = new Map<number, string>();
    for (const cat of categories) {
      if (cat.id !== undefined) catMap.set(cat.id, cat.name);
    }

    const sections: string[] = [];

    sections.push(this.buildSection('FACTURAS', [
      'ID', 'Negocio', 'RUC', 'Timbrado', 'Fecha', 'Total', 'Notas', 'Creado',
    ], invoices.map(inv => [
      inv.id, inv.business, inv.ruc, inv.timbrado, inv.date, inv.total, inv.notes ?? '', inv.createdAt,
    ])));

    sections.push(this.buildSection('ITEMS DE FACTURAS', [
      'ID', 'ID Factura', 'Descripcion', 'Cantidad', 'Precio Unitario', 'Importe', 'Categoria ID', 'Categoria Nombre',
    ], invoiceItems.map(item => [
      item.id, item.invoiceId, item.description, item.quantity, item.unitPrice, item.amount, item.categoryId ?? '', catMap.get(item.categoryId ?? 0) ?? item.customCategoryName ?? '',
    ])));

    sections.push(this.buildSection('CATEGORIAS', [
      'ID', 'Nombre', 'Icono', 'Color', 'Es Predeterminada',
    ], categories.map(cat => [
      cat.id, cat.name, cat.icon, cat.color, cat.isDefault ? 'Si' : 'No',
    ])));

    sections.push(this.buildSection('PRODUCTOS', [
      'ID', 'Nombre', 'Normalizado', 'Categoria ID', 'Categoria Nombre', 'Compras', 'Total Gastado', 'Precio Promedio', 'Precio Unitario Ultima', 'Ultima Compra',
    ], products.map(prod => [
      prod.id, prod.name, prod.normalized, prod.categoryId ?? '', catMap.get(prod.categoryId ?? 0) ?? '', prod.purchaseCount, prod.totalSpent, prod.averagePrice, prod.lastUnitPrice, prod.lastPurchased,
    ])));

    sections.push(this.buildSection('PRESUPUESTOS', [
      'ID', 'Mes', 'Categoria ID', 'Categoria Nombre', 'Limite',
    ], budgets.map(b => [
      b.id, b.month, b.categoryId, catMap.get(b.categoryId) ?? '', b.limit,
    ])));

    sections.push(this.buildSection('ALERTAS', [
      'ID', 'Mes', 'Tipo', 'Categoria ID', 'Categoria Nombre', 'Mensaje', 'Severidad', 'Leida', 'Creado',
    ], alerts.map(a => [
      a.id, a.month, a.type, a.categoryId ?? '', catMap.get(a.categoryId ?? 0) ?? '', a.message, a.severity, a.read ? 'Si' : 'No', a.createdAt,
    ])));

    sections.push(this.buildSection('GASTOS MANUALES', [
      'ID', 'Descripcion', 'Monto', 'Categoria ID', 'Categoria Nombre', 'Fecha', 'Notas', 'Creado',
    ], manualExpenses.map(e => [
      e.id, e.description, e.amount, e.categoryId, catMap.get(e.categoryId) ?? '', e.date, e.notes ?? '', e.createdAt,
    ])));

    return sections.join('\n\n');
  }

  async exportAll(): Promise<void> {
    const csv = await this.generateCsv();
    this.download(csv, `nongatu_export_${this.dateStr()}.csv`);
  }

  async importFromCsv(file: File): Promise<{ imported: boolean; counts: Record<string, number> }> {
    return this.importFromCsvString(await file.text());
  }

  async importFromCsvString(text: string): Promise<{ imported: boolean; counts: Record<string, number> }> {
    const sections = this.parseSections(text);
    const counts: Record<string, number> = {};

    const existingCategories = await db.categories.toArray();
    const catByName = new Map<string, Category>();
    for (const c of existingCategories) catByName.set(c.name, c);

    for (const section of sections) {
      switch (section.title) {
        case 'CATEGORIAS':
          counts[section.title] = await this.importCategories(section.rows, catByName);
          break;
        case 'FACTURAS':
          counts[section.title] = await this.importInvoices(section.rows);
          break;
        case 'ITEMS DE FACTURAS':
          counts[section.title] = await this.importInvoiceItems(section.rows, catByName);
          break;
        case 'PRODUCTOS':
          counts[section.title] = await this.importProducts(section.rows, catByName);
          break;
        case 'PRESUPUESTOS':
          counts[section.title] = await this.importBudgets(section.rows, catByName);
          break;
        case 'ALERTAS':
          counts[section.title] = await this.importAlerts(section.rows, catByName);
          break;
        case 'GASTOS MANUALES':
          counts[section.title] = await this.importManualExpenses(section.rows, catByName);
          break;
      }
    }

    return { imported: true, counts };
  }

  private parseSections(text: string): { title: string; rows: string[][] }[] {
    const blocks = text.replace(/\r\n/g, '\n').split('\n\n');
    const sections: { title: string; rows: string[][] }[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length < 2) continue;

      const titleMatch = lines[0].match(/^===\s*(.+?)\s*===$/);
      if (!titleMatch) continue;

      const title = titleMatch[1];
      const dataLines = lines.slice(2);
      const rows = dataLines.map(l => this.parseCsvLine(l));

      sections.push({ title, rows });
    }

    return sections;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ';') {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current);
    return result;
  }

  private num(v: string): number {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  private async importInvoices(rows: string[][]): Promise<number> {
    const existing = await db.invoices.toArray();
    const existingKeys = new Set(existing.map(i => `${i.business}|${i.ruc}|${i.date}|${i.total}`));

    const toAdd: Invoice[] = [];
    for (const r of rows) {
      const key = `${r[1]}|${r[2]}|${r[4]}|${this.num(r[5])}`;
      if (existingKeys.has(key)) continue;
      toAdd.push({
        business: r[1] ?? '',
        ruc: r[2] ?? '',
        timbrado: r[3] ?? '',
        date: r[4] ?? '',
        total: this.num(r[5]),
        notes: r[6] || undefined,
        createdAt: new Date(r[7] || Date.now()),
        items: [],
      });
    }

    for (const inv of toAdd) {
      await db.invoices.add(inv);
    }
    return toAdd.length;
  }

  private async importInvoiceItems(rows: string[][], catByName: Map<string, Category>): Promise<number> {
    const existing = await db.invoiceItems.toArray();
    const existingKeys = new Set(existing.map(i => `${i.invoiceId}|${i.description}|${i.amount}`));
    const invoices = await db.invoices.toArray();
    const invoiceIds = new Set(invoices.map(i => i.id));

    const toAdd: InvoiceItem[] = [];
    for (const r of rows) {
      const invoiceId = this.num(r[1]);
      if (!invoiceIds.has(invoiceId)) continue;

      const key = `${invoiceId}|${r[2]}|${this.num(r[5])}`;
      if (existingKeys.has(key)) continue;

      const catName = r[7] ?? '';
      const cat = catByName.get(catName);

      toAdd.push({
        invoiceId,
        description: r[2] ?? '',
        quantity: this.num(r[3]),
        unitPrice: this.num(r[4]),
        amount: this.num(r[5]),
        categoryId: cat?.id,
        customCategoryName: cat ? undefined : catName || undefined,
      });
    }

    for (const item of toAdd) {
      await db.invoiceItems.add(item);
    }
    return toAdd.length;
  }

  private async importCategories(rows: string[][], catByName: Map<string, Category>): Promise<number> {
    let count = 0;
    for (const r of rows) {
      const name = r[1] ?? '';
      if (catByName.has(name)) continue;

      const id = await db.categories.add({
        name,
        icon: r[2] ?? 'bi-tag',
        color: r[3] ?? '#6b7280',
        isDefault: r[4] === 'Si',
      });
      catByName.set(name, { id: id as number, name, icon: r[2] ?? 'bi-tag', color: r[3] ?? '#6b7280', isDefault: r[4] === 'Si' });
      count++;
    }
    return count;
  }

  private async importProducts(rows: string[][], catByName: Map<string, Category>): Promise<number> {
    const existing = await db.products.toArray();
    const existingNorms = new Set(existing.map(p => p.normalized));

    const toAdd: Product[] = [];
    for (const r of rows) {
      const normalized = r[2] ?? r[1]?.toLowerCase().trim() ?? '';
      if (existingNorms.has(normalized)) continue;

      const catName = r[4] ?? '';
      const cat = catByName.get(catName);

      toAdd.push({
        name: r[1] ?? '',
        normalized,
        categoryId: cat?.id,
        purchaseCount: this.num(r[5]),
        totalSpent: this.num(r[6]),
        averagePrice: this.num(r[7]),
        lastUnitPrice: this.num(r[8]),
        lastPurchased: r[9] ?? '',
      });
    }

    for (const prod of toAdd) {
      await db.products.add(prod);
    }
    return toAdd.length;
  }

  private async importBudgets(rows: string[][], catByName: Map<string, Category>): Promise<number> {
    const existing = await db.budgets.toArray();
    const existingKeys = new Set(existing.map(b => `${b.month}|${b.categoryId}`));

    const toAdd: MonthlyBudget[] = [];
    for (const r of rows) {
      const month = r[1] ?? '';
      const catName = r[3] ?? '';
      const cat = catByName.get(catName);
      const catId = cat?.id ?? this.num(r[2]);

      if (existingKeys.has(`${month}|${catId}`)) continue;
      toAdd.push({ month, categoryId: catId, limit: this.num(r[4]) });
    }

    for (const b of toAdd) {
      await db.budgets.add(b);
    }
    return toAdd.length;
  }

  private async importAlerts(rows: string[][], catByName: Map<string, Category>): Promise<number> {
    const existing = await db.alerts.toArray();
    const existingKeys = new Set(existing.map(a => `${a.month}|${a.type}|${a.message}`));

    const toAdd: BudgetAlert[] = [];
    for (const r of rows) {
      const key = `${r[1]}|${r[2]}|${r[5]}`;
      if (existingKeys.has(key)) continue;

      const catName = r[4] ?? '';
      const cat = catByName.get(catName);

      toAdd.push({
        month: r[1] ?? '',
        type: r[2] as BudgetAlert['type'] ?? 'warning',
        categoryId: cat?.id,
        message: r[5] ?? '',
        severity: r[6] as BudgetAlert['severity'] ?? 'low',
        read: r[7] === 'Si',
        createdAt: new Date(r[8] || Date.now()),
      });
    }

    for (const a of toAdd) {
      await db.alerts.add(a);
    }
    return toAdd.length;
  }

  private async importManualExpenses(rows: string[][], catByName: Map<string, Category>): Promise<number> {
    const existing = await db.manualExpenses.toArray();
    const existingKeys = new Set(existing.map(e => `${e.date}|${e.description}|${e.amount}`));

    const toAdd: ManualExpense[] = [];
    for (const r of rows) {
      const key = `${r[4]}|${r[1]}|${this.num(r[2])}`;
      if (existingKeys.has(key)) continue;

      const catName = r[4] ?? '';
      const cat = catByName.get(catName);

      toAdd.push({
        description: r[1] ?? '',
        amount: this.num(r[2]),
        categoryId: cat?.id ?? this.num(r[3]),
        date: r[4] ?? '',
        notes: r[5] || undefined,
        createdAt: new Date(r[6] || Date.now()),
      });
    }

    for (const e of toAdd) {
      await db.manualExpenses.add(e);
    }
    return toAdd.length;
  }

  private buildSection(title: string, headers: string[], rows: unknown[][]): string {
    const lines: string[] = [];
    lines.push(`=== ${title} ===`);
    lines.push(headers.join(';'));
    for (const row of rows) {
      lines.push(row.map(v => this.escapeCsv(String(v ?? ''))).join(';'));
    }
    return lines.join('\n');
  }

  private escapeCsv(value: string): string {
    if (value.includes(';') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private dateStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private download(content: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
