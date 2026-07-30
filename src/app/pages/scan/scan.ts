import { Component, signal } from '@angular/core';
import { OcrService } from '../../services/ocr.service';
import { ReceiptParserService } from '../../services/receipt-parser.service';
import { InvoiceService } from '../../services/invoice.service';
import { CategoryService } from '../../services/category.service';
import { AlertService } from '../../services/alert.service';
import { WidgetBridgeService } from '../../services/widget-bridge.service';
import type { ScanResult } from '../../models/receipt.model';
import type { Invoice } from '../../models/invoice.model';
import type { ReceiptItem } from '../../models/receipt.model';
import type { Product } from '../../models/product.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.html',
  styleUrl: './scan.css'
})
export class Scan {
  loading = signal(false);
  result = signal<ScanResult | null>(null);
  editedItems = signal<ReceiptItem[]>([]);
  productMatches = signal<Map<number, Product | null>>(new Map());
  checkedItems = signal<Set<number>>(new Set());
  imagePreview = signal<string | null>(null);
  saved = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  constructor(
    private ocr: OcrService,
    private parser: ReceiptParserService,
    private invoiceService: InvoiceService,
    private categoryService: CategoryService,
    private alertService: AlertService,
    private widgetBridgeService: WidgetBridgeService,
    private router: Router,
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.saved.set(false);
    this.error.set(null);

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
      this.processImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  formatGs(value: number | null): string {
    if (value === null || value === undefined) return '-';
    return `₲ ${value.toLocaleString('es-PY')}`;
  }

  updateItemDesc(index: number, event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.editedItems.update(items => {
      const copy = [...items];
      copy[index] = { ...copy[index], descripcion: val };
      return copy;
    });
    this.checkProduct(index, val);
  }

  updateItemQty(index: number, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.editedItems.update(items => {
      const copy = [...items];
      copy[index] = { ...copy[index], cantidad: val };
      return copy;
    });
  }

  updateItemPrice(index: number, event: Event) {
    const val = parseFloat((event.target as HTMLInputElement).value) || 0;
    this.editedItems.update(items => {
      const copy = [...items];
      const importe = copy[index].importe;
      copy[index] = {
        ...copy[index],
        precio: val,
        cantidad: val > 0 && importe > 0 ? parseFloat((importe / val).toFixed(3)) : copy[index].cantidad,
      };
      return copy;
    });
  }

  updateItemAmount(index: number, event: Event) {
    const val = parseInt((event.target as HTMLInputElement).value) || 0;
    this.editedItems.update(items => {
      const copy = [...items];
      copy[index] = {
        ...copy[index],
        importe: val,
        cantidad: copy[index].precio > 0 ? parseFloat((val / copy[index].precio).toFixed(3)) : copy[index].cantidad,
      };
      return copy;
    });
  }

  removeItem(index: number) {
    this.editedItems.update(items => items.filter((_, i) => i !== index));
    this.productMatches.update(map => {
      const newMap = new Map(map);
      newMap.delete(index);
      return newMap;
    });
    this.checkedItems.update(set => {
      const newSet = new Set(set);
      newSet.delete(index);
      return newSet;
    });
  }

  addItem() {
    this.editedItems.update(items => [
      ...items,
      { descripcion: '', cantidad: 1, precio: 0, importe: 0 }
    ]);
  }

  get parsedTotal(): number {
    return this.editedItems().reduce((sum, item) => sum + item.importe, 0);
  }

  async saveInvoice() {
    const r = this.result();
    if (!r?.parsed || this.saving() || this.saved()) return;
    this.saving.set(true);
    this.error.set(null);

    try {
      const items = this.categoryService.categorizeItems(
        this.editedItems().map((item) => ({
          invoiceId: 0,
          description: item.descripcion,
          quantity: item.cantidad,
          unitPrice: item.precio,
          amount: item.importe,
        }))
      );

      const invoice: Invoice = {
        business: r.parsed.negocio,
        ruc: r.parsed.ruc,
        timbrado: r.parsed.timbrado,
        date: r.parsed.fecha_emision,
        items,
        total: this.parsedTotal,
        createdAt: new Date(),
      };

      await this.invoiceService.save(invoice);
      const month = r.parsed.fecha_emision.slice(0, 7);
      await this.alertService.checkForAlerts(month);
      await this.widgetBridgeService.updateWidget();
      this.saved.set(true);
    } catch (err) {
      this.error.set('Error al guardar: ' + (err as Error).message);
    } finally {
      this.saving.set(false);
    }
  }

  goToHistory() {
    this.router.navigate(['/history']);
  }

  scanNew() {
    this.result.set(null);
    this.editedItems.set([]);
    this.productMatches.set(new Map());
    this.checkedItems.set(new Set());
    this.imagePreview.set(null);
    this.saved.set(false);
    this.error.set(null);
  }

  private async checkProduct(index: number, name: string) {
    if (!name || name.trim().length < 2) {
      this.productMatches.update(map => {
        const newMap = new Map(map);
        newMap.delete(index);
        return newMap;
      });
      this.checkedItems.update(set => {
        const newSet = new Set(set);
        newSet.delete(index);
        return newSet;
      });
      return;
    }
    // First try exact match
    let match = await this.invoiceService.findProductByName(name);
    // If no exact match, try fuzzy
    if (!match) {
      match = await this.invoiceService.findSimilarProduct(name);
    }
    this.productMatches.update(map => {
      const newMap = new Map(map);
      newMap.set(index, match ?? null);
      return newMap;
    });
    this.checkedItems.update(set => {
      const newSet = new Set(set);
      newSet.add(index);
      return newSet;
    });
  }

  private async processImage(base64: string) {
    this.loading.set(true);
    this.result.set(null);

    try {
      const rawText = await this.ocr.extractText(base64);

      try {
        const parsed = await this.parser.parse(rawText);
        const items = parsed.items.map(i => {
          const precio = i.precio || 0;
          const importe = i.importe || 0;
          const cantidad = importe > 0 && precio > 0
            ? parseFloat((importe / precio).toFixed(3))
            : i.cantidad || 0;
          return { ...i, precio, importe, cantidad };
        });
        this.editedItems.set(items);
        this.result.set({ rawText, parsed });

        // Check each item and auto-correct if found in database
        for (let i = 0; i < items.length; i++) {
          await this.checkProduct(i, items[i].descripcion);
          const match = this.productMatches().get(i);
          if (match) {
            const price = match.lastUnitPrice || match.averagePrice;
            const importe = items[i].importe || 0;
            const qty = price > 0 && importe > 0
              ? parseFloat((importe / price).toFixed(3))
              : items[i].cantidad || 1;
            this.editedItems.update(current => {
              const copy = [...current];
              copy[i] = {
                ...copy[i],
                descripcion: match.name,
                cantidad: qty,
                precio: price,
                importe: importe,
                categoryId: match.categoryId,
              };
              return copy;
            });
          }
        }
      } catch (err) {
        this.result.set({
          rawText,
          parsed: null,
          error: (err as Error).message,
        });
      }
    } catch (err) {
      this.result.set({
        rawText: '',
        parsed: null,
        error: 'Error al procesar la imagen: ' + (err as Error).message,
      });
    } finally {
      this.loading.set(false);
    }
  }
}
