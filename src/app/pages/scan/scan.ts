import { Component, signal } from '@angular/core';
import { OcrService } from '../../services/ocr.service';
import { ReceiptParserService } from '../../services/receipt-parser.service';
import { InvoiceService } from '../../services/invoice.service';
import { CategoryService } from '../../services/category.service';
import { AlertService } from '../../services/alert.service';
import type { ScanResult } from '../../models/receipt.model';
import type { Invoice } from '../../models/invoice.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-scan',
  templateUrl: './scan.html',
  styleUrl: './scan.css'
})
export class Scan {
  loading = signal(false);
  result = signal<ScanResult | null>(null);
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

  async saveInvoice() {
    const r = this.result();
    if (!r?.parsed) return;
    this.saving.set(true);
    this.error.set(null);

    try {
      const items = this.categoryService.categorizeItems(
        r.parsed.items.map((item) => ({
          invoiceId: 0,
          description: item.descripcion,
          quantity: item.cantidad,
          amount: item.importe,
        }))
      );

      const invoice: Invoice = {
        business: r.parsed.negocio,
        ruc: r.parsed.ruc,
        timbrado: r.parsed.timbrado,
        date: r.parsed.fecha_emision,
        items,
        total: r.parsed.total,
        createdAt: new Date(),
      };

      await this.invoiceService.save(invoice);
      const month = r.parsed.fecha_emision.slice(0, 7);
      await this.alertService.checkForAlerts(month);
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
    this.imagePreview.set(null);
    this.saved.set(false);
    this.error.set(null);
  }

  private async processImage(base64: string) {
    this.loading.set(true);
    this.result.set(null);

    try {
      const rawText = await this.ocr.extractText(base64);

      try {
        const parsed = await this.parser.parse(rawText);
        this.result.set({ rawText, parsed });
      } catch {
        this.result.set({
          rawText,
          parsed: null,
          error: 'No se pudo estructurar con IA. Revisa el texto OCR.',
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
