import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { BudgetService } from '../../services/budget.service';
import { CategoryService } from '../../services/category.service';
import { InvoiceService } from '../../services/invoice.service';
import type { MonthlyBudget } from '../../models/budget.model';
import type { Category } from '../../models/category.model';
import type { Invoice } from '../../models/invoice.model';

@Component({
  selector: 'app-budget',
  templateUrl: './budget.html',
  styleUrl: './budget.css',
  imports: [DecimalPipe],
})
export class Budget {
  budgets = signal<MonthlyBudget[]>([]);
  categories = signal<Category[]>([]);
  invoices = signal<Invoice[]>([]);
  loading = signal(true);
  currentMonth = new Date().toISOString().slice(0, 7);
  editingCategory = signal<number | null>(null);
  editLimit = signal(0);

  constructor(
    private budgetService: BudgetService,
    private categoryService: CategoryService,
    private invoiceService: InvoiceService,
  ) {
    this.load();
  }

  get spentByCategory(): Map<number, number> {
    const map = new Map<number, number>();
    for (const inv of this.invoices()) {
      for (const item of inv.items) {
        const catId = item.categoryId ?? 0;
        map.set(catId, (map.get(catId) || 0) + item.amount);
      }
    }
    return map;
  }

  get totalBudget(): number {
    return this.budgets().reduce((s, b) => s + b.limit, 0);
  }

  get totalSpent(): number {
    return this.invoices().reduce((s, inv) => s + inv.total, 0);
  }

  formatGs(value: number): string {
    return `₲ ${value.toLocaleString('es-PY')}`;
  }

  getCategoryName(id: number): string {
    return this.categories().find((c) => c.id === id)?.name ?? 'Desconocida';
  }

  getCategoryColor(id: number): string {
    return this.categories().find((c) => c.id === id)?.color ?? '#6b7280';
  }

  startEdit(catId: number) {
    const existing = this.budgets().find((b) => b.categoryId === catId);
    this.editingCategory.set(catId);
    this.editLimit.set(existing?.limit ?? 0);
  }

  cancelEdit() {
    this.editingCategory.set(null);
    this.editLimit.set(0);
  }

  updateEditLimit(event: Event) {
    this.editLimit.set(Number((event.target as HTMLInputElement).value));
  }

  async saveBudget() {
    const catId = this.editingCategory();
    if (catId === null) return;
    await this.budgetService.setBudget({
      month: this.currentMonth,
      categoryId: catId,
      limit: this.editLimit(),
    });
    this.cancelEdit();
    this.load();
  }

  async deleteBudget(id: number) {
    await this.budgetService.deleteBudget(id);
    this.load();
  }

  private async load() {
    this.loading.set(true);
    const [budgets, categories, invoices] = await Promise.all([
      this.budgetService.getForMonth(this.currentMonth),
      this.categoryService.getAll(),
      this.invoiceService.getByMonth(this.currentMonth),
    ]);
    this.budgets.set(budgets);
    this.categories.set(categories);
    this.invoices.set(invoices);
    this.loading.set(false);
  }
}
