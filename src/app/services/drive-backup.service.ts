import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/services/auth.service';
import { ExportService } from './export.service';

@Injectable({ providedIn: 'root' })
export class DriveBackupService {
  private auth = inject(AuthService);
  private exportService = inject(ExportService);

  private readonly DRIVE_API = 'https://www.googleapis.com/drive/v3';
  private readonly UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
  private readonly BACKUP_PREFIX = 'nongatu_backup_';

  private async getToken(): Promise<string> {
    const token = await this.auth.getAccessToken();
    if (!token) throw new Error('No hay sesión activa. Iniciá sesión primero.');

    const testRes = await fetch(`${this.DRIVE_API}/files?pageSize=1&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (testRes.status === 401 || testRes.status === 403) {
      throw new Error(
        'El permiso de Drive aún no está habilitado. ' +
        'Hacé clic en "Cerrar sesión" en el sidebar y volvé a iniciar sesión para activarlo.'
      );
    }

    return token;
  }

  async listBackups(): Promise<{ id: string; name: string; createdTime: string }[]> {
    const token = await this.getToken();
    const res = await fetch(
      `${this.DRIVE_API}/files?q=name%20contains%20'${this.BACKUP_PREFIX}'%20and%20trashed=false&orderBy=createdTime%20desc&fields=files(id,name,createdTime)`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Error al listar backups (${res.status})`);
    const data = await res.json();
    return data.files ?? [];
  }

  async uploadBackup(): Promise<void> {
    const csv = await this.exportService.generateCsv();
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${this.BACKUP_PREFIX}${dateStr}.csv`;

    const token = await this.getToken();
    const boundary = '----' + Math.random().toString(36).slice(2);
    const delimiter = `--${boundary}\r\n`;
    const closeDelim = `--${boundary}--\r\n`;

    const metadata = JSON.stringify({ name: filename, mimeType: 'text/csv' });
    const body = [
      delimiter,
      `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
      metadata,
      `\r\n`,
      delimiter,
      `Content-Type: text/csv;charset=utf-8\r\n\r\n`,
      '\uFEFF' + csv,
      `\r\n`,
      closeDelim,
    ].join('');

    const res = await fetch(`${this.UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) throw new Error(`Error al subir backup a Drive (${res.status})`);
  }

  async downloadBackup(fileId: string): Promise<string> {
    const token = await this.getToken();
    const res = await fetch(`${this.DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Error al descargar backup (${res.status})`);
    return res.text();
  }
}
