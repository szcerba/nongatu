import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InvoiceService } from '../../services/invoice.service';
import { CategoryService } from '../../services/category.service';
import type { Product } from '../../models/product.model';
import type { Category } from '../../models/category.model';

@Component({
  selector: 'app-products',
  templateUrl: './products.html',
  styleUrl: './products.css',
  imports: [RouterLink],
})
export class Products {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  filteredProducts = signal<Product[]>([]);
  searchTerm = signal('');
  loading = signal(true);
  editing = signal<Product | null>(null);
  editName = signal('');
  editCategoryId = signal<number | undefined>(undefined);

  constructor(
    private invoiceService: InvoiceService,
    private categoryService: CategoryService,
  ) {
    this.load();
  }

  formatGs(value: number): string {
    return `₲ ${value.toLocaleString('es-PY')}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-PY');
  }

  getCategoryName(id: number | undefined): string {
    if (id === undefined) return 'Sin categoría';
    return this.categories().find((c) => c.id === id)?.name ?? 'Desconocida';
  }

  getCategoryColor(id: number | undefined): string {
    return this.categories().find((c) => c.id === id)?.color ?? '#6b7280';
  }

  updateSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm.set(term);
    if (!term) {
      this.filteredProducts.set(this.products());
    } else {
      this.filteredProducts.set(
        this.products().filter(p => p.name.toLowerCase().includes(term))
      );
    }
  }

  startEdit(product: Product) {
    this.editing.set(product);
    this.editName.set(product.name);
    this.editCategoryId.set(product.categoryId);
  }

  cancelEdit() {
    this.editing.set(null);
  }

  updateEditName(event: Event) {
    this.editName.set((event.target as HTMLInputElement).value);
  }

  updateEditCategory(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.editCategoryId.set(val ? Number(val) : undefined);
  }

  async saveEdit() {
    const product = this.editing();
    if (!product || !product.id) return;
    await this.invoiceService.updateProductById(product.id, {
      name: this.editName(),
      normalized: this.editName().toLowerCase().trim(),
      categoryId: this.editCategoryId(),
    });
    this.cancelEdit();
    await this.load();
  }

  async deleteProduct(product: Product) {
    if (!product.id) return;
    if (confirm(`¿Eliminar "${product.name}" de la base de datos?`)) {
      await this.invoiceService.deleteProduct(product.id);
      await this.load();
    }
  }

  private async load() {
    this.loading.set(true);
    const [products, categories] = await Promise.all([
      this.invoiceService.getAllProducts(),
      this.categoryService.getAll(),
    ]);
    products.sort((a, b) => b.purchaseCount - a.purchaseCount);
    this.products.set(products);
    this.filteredProducts.set(products);
    this.categories.set(categories);
    this.loading.set(false);
  }
}
