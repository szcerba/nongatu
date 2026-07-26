import { Component, inject, input, output, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private exportService = inject(ExportService);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  collapsed = input<boolean>(false);
  toggleSidebar = output<void>();
  isDark = signal(document.body.classList.contains('dark'));
  exporting = signal(false);
  importing = signal(false);
  importResult = signal<string | null>(null);

  toggleTheme() {
    document.body.classList.toggle('dark');
    this.isDark.set(document.body.classList.contains('dark'));
    localStorage.setItem('nongatu-theme', this.isDark() ? 'dark' : 'light');
  }

  async exportData() {
    this.exporting.set(true);
    try {
      await this.exportService.exportAll();
    } finally {
      this.exporting.set(false);
    }
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importing.set(true);
    this.importResult.set(null);
    try {
      const result = await this.exportService.importFromCsv(file);
      const parts: string[] = [];
      for (const [section, count] of Object.entries(result.counts)) {
        if (count > 0) parts.push(`${section}: ${count}`);
      }
      this.importResult.set(parts.length > 0 ? `Importado: ${parts.join(', ')}` : 'Sin datos nuevos para importar');
    } catch (e: any) {
      this.importResult.set(`Error: ${e.message ?? 'Archivo inválido'}`);
    } finally {
      this.importing.set(false);
      input.value = '';
    }
  }
}
