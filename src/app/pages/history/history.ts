import { Component, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InvoiceService } from '../../services/invoice.service';
import { CategoryService } from '../../services/category.service';
import type { Invoice } from '../../models/invoice.model';
import type { Category } from '../../models/category.model';

@Component({
  selector: 'app-history',
  templateUrl: './history.html',
  styleUrl: './history.css',
  imports: [RouterLink],
})
export class History {
  invoices = signal<Invoice[]>([]);
  categories = signal<Category[]>([]);
  searchTerm = signal('');
  selectedCategory = signal<number | null>(null);
  selectedBusiness = signal<string | null>(null);
  businesses = signal<string[]>([]);
  loading = signal(true);
  showDetail = signal<Invoice | null>(null);

  constructor(
    private invoiceService: InvoiceService,
    private categoryService: CategoryService,
  ) {
    this.load();
  }

  get filteredInvoices() {
    return computed(() => {
      let list = this.invoices();
      const term = this.searchTerm().toLowerCase();
      const catId = this.selectedCategory();
      const biz = this.selectedBusiness();

      if (term) {
        list = list.filter(
          (inv) =>
            inv.business.toLowerCase().includes(term) ||
            inv.ruc.includes(term) ||
            inv.items.some((it) => it.description.toLowerCase().includes(term)),
        );
      }
      if (catId !== null) {
        list = list.filter((inv) =>
          inv.items.some((it) => it.categoryId === catId),
        );
      }
      if (biz !== null) {
        list = list.filter((inv) => inv.business === biz);
      }
      return list;
    });
  }

  get totalFiltered() {
    return computed(() => this.filteredInvoices().reduce((s, inv) => s + inv.total, 0));
  }

  updateSearch(event: Event) {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  updateCategory(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategory.set(val ? Number(val) : null);
  }

  updateBusiness(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedBusiness.set(val || null);
  }

  getCategoryName(catId: number | undefined): string {
    if (catId === undefined) return 'Sin categoría';
    return this.categories().find((c) => c.id === catId)?.name ?? 'Desconocida';
  }

  getCategoryColor(catId: number | undefined): string {
    return this.categories().find((c) => c.id === catId)?.color ?? '#6b7280';
  }

  formatGs(value: number): string {
    return `₲ ${value.toLocaleString('es-PY')}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-PY');
  }

  deleteInvoice(id: number) {
    if (confirm('¿Eliminar esta factura permanentemente?')) {
      this.invoiceService.delete(id).then(() => this.load());
    }
  }

  viewDetail(invoice: Invoice) {
    this.showDetail.set(invoice);
  }

  closeDetail() {
    this.showDetail.set(null);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedCategory.set(null);
    this.selectedBusiness.set(null);
  }

  private async load() {
    this.loading.set(true);
    const invoices = await this.invoiceService.getAllWithItems();
    const categories = await this.categoryService.getAll();
    const businesses = await this.invoiceService.getDistinctBusinesses();
    this.invoices.set(invoices);
    this.categories.set(categories);
    this.businesses.set(businesses);
    this.loading.set(false);
  }
}
