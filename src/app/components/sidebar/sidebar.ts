import { Component, inject, input, output, signal, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ExportService } from '../../services/export.service';
import { DriveBackupService } from '../../services/drive-backup.service';
import { AuthService } from '../../auth/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar {
  private exportService = inject(ExportService);
  private driveService = inject(DriveBackupService);
  private auth = inject(AuthService);
  private router = inject(Router);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('driveFileInput') driveFileInput!: ElementRef<HTMLInputElement>;
  collapsed = input<boolean>(false);
  toggleSidebar = output<void>();
  isDark = signal(document.body.classList.contains('dark'));
  exporting = signal(false);
  importing = signal(false);
  importResult = signal<string | null>(null);
  backupToDriveLoading = signal(false);
  restoreFromDriveLoading = signal(false);
  driveFiles = signal<{ id: string; name: string; createdTime: string }[]>([]);
  showDriveFiles = signal(false);
  readonly user = this.auth.user;
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly authLoading = this.auth.isLoading;

  async logout() {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }

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

  async backupToDrive() {
    this.backupToDriveLoading.set(true);
    try {
      await this.driveService.uploadBackup();
      this.importResult.set('Backup subido a Google Drive correctamente');
    } catch (e: any) {
      this.importResult.set(`Error: ${e.message ?? 'Error al subir backup'}`);
    } finally {
      this.backupToDriveLoading.set(false);
    }
  }

  async showDriveBackups() {
    this.restoreFromDriveLoading.set(true);
    try {
      const files = await this.driveService.listBackups();
      this.driveFiles.set(files);
      this.showDriveFiles.set(!this.showDriveFiles());
    } catch (e: any) {
      this.importResult.set(`Error: ${e.message ?? 'Error al listar backups'}`);
    } finally {
      this.restoreFromDriveLoading.set(false);
    }
  }

  async deleteDriveBackup(fileId: string) {
    try {
      await this.driveService.deleteBackup(fileId);
      this.driveFiles.set(this.driveFiles().filter(f => f.id !== fileId));
      this.importResult.set('Backup eliminado de Drive');
    } catch (e: any) {
      this.importResult.set(`Error: ${e.message ?? 'Error al eliminar backup'}`);
    }
  }

  async restoreFromDrive(fileId: string) {
    this.restoreFromDriveLoading.set(true);
    this.importResult.set(null);
    try {
      const csv = await this.driveService.downloadBackup(fileId);
      const result = await this.exportService.importFromCsvString(csv);
      const parts: string[] = [];
      for (const [section, count] of Object.entries(result.counts)) {
        if (count > 0) parts.push(`${section}: ${count}`);
      }
      this.importResult.set(parts.length > 0 ? `Restaurado: ${parts.join(', ')}` : 'Sin datos nuevos para restaurar');
      this.showDriveFiles.set(false);
    } catch (e: any) {
      this.importResult.set(`Error: ${e.message ?? 'Error al restaurar'}`);
    } finally {
      this.restoreFromDriveLoading.set(false);
    }
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
