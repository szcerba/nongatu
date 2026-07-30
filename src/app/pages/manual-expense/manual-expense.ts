import { Component, signal } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { ManualExpenseService } from '../../services/manual-expense.service';
import { CategoryService } from '../../services/category.service';
import type { ManualExpense as Expense } from '../../models/manual-expense.model';
import type { Category } from '../../models/category.model';
import type { Product } from '../../models/product.model';
import { WidgetBridgeService } from '../../services/widget-bridge.service';

@Component({
  selector: 'app-manual-expense',
  templateUrl: './manual-expense.html',
  styleUrl: './manual-expense.css',
})
export class ManualExpense {
  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);
  saving = signal(false);

  formMode = signal<'new' | 'existing'>('new');
  formDescription = signal('');
  formAmount = signal(0);
  formCategoryId = signal<number>(1);
  formDate = signal(new Date().toISOString().slice(0, 10));
  formNotes = signal('');
  formProductSearch = signal('');
  formSelectedProduct = signal<Product | null>(null);

  constructor(
    private invoiceService: InvoiceService,
    private service: ManualExpenseService,
    private categoryService: CategoryService,
    private widgetBridgeService: WidgetBridgeService,
  ) {
    this.load();
  }

  get filteredProducts() {
    const term = this.formProductSearch().toLowerCase();
    return this.products().filter((p) => p.name.toLowerCase().includes(term));
  }

  formatGs(value: number): string {
    return `₲ ${value.toLocaleString('es-PY')}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-PY');
  }

  setMode(mode: 'new' | 'existing') {
    this.formMode.set(mode);
    this.formDescription.set('');
    this.formSelectedProduct.set(null);
    this.formProductSearch.set('');
  }

  updateProductSearch(event: Event) {
    this.formProductSearch.set((event.target as HTMLInputElement).value);
  }

  selectProduct(product: Product) {
    this.formSelectedProduct.set(product);
    this.formDescription.set(product.name);
    this.formCategoryId.set(product.categoryId ?? 1);
    this.formProductSearch.set('');
  }

  updateDesc(event: Event) {
    this.formDescription.set((event.target as HTMLInputElement).value);
  }

  updateAmount(event: Event) {
    this.formAmount.set(parseInt((event.target as HTMLInputElement).value) || 0);
  }

  updateCategory(event: Event) {
    this.formCategoryId.set(Number((event.target as HTMLSelectElement).value));
  }

  updateDate(event: Event) {
    this.formDate.set((event.target as HTMLInputElement).value);
  }

  updateNotes(event: Event) {
    this.formNotes.set((event.target as HTMLTextAreaElement).value);
  }

  async addExpense() {
    if (!this.formDescription() || this.formAmount() <= 0) return;
    this.saving.set(true);
    await this.service.save({
      description: this.formDescription(),
      amount: this.formAmount(),
      categoryId: this.formCategoryId(),
      date: this.formDate(),
      notes: this.formNotes() || undefined,
      createdAt: new Date(),
    });
    this.formDescription.set('');
    this.formAmount.set(0);
    this.formSelectedProduct.set(null);
    this.formNotes.set('');
    this.saving.set(false);
    await this.load();
    await this.widgetBridgeService.updateWidget();
  }

  async deleteExpense(expense: Expense) {
    if (!expense.id) return;
    if (confirm(`¿Eliminar "${expense.description}"?`)) {
      await this.service.delete(expense.id);
      await this.load();
      await this.widgetBridgeService.updateWidget();
    }
  }

  getCategoryName(id: number): string {
    return this.categories().find((c) => c.id === id)?.name ?? 'Desconocida';
  }

  get totalMonth(): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.expenses()
      .filter((e) => e.date.startsWith(month))
      .reduce((s, e) => s + e.amount, 0);
  }

  private async load() {
    this.loading.set(true);
    const [expenses, categories, products] = await Promise.all([
      this.service.getAll(),
      this.categoryService.getAll(),
      this.invoiceService.getAllProducts(),
    ]);
    this.expenses.set(expenses);
    this.categories.set(categories);
    this.products.set(products);
    this.loading.set(false);
  }
}
