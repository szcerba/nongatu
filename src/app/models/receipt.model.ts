export interface ReceiptItem {
  descripcion: string;
  cantidad: number;
  importe: number;
}

export interface ReceiptData {
  negocio: string;
  ruc: string;
  timbrado: string;
  fecha_emision: string;
  items: ReceiptItem[];
  total: number;
}

export interface ScanResult {
  rawText: string;
  parsed: ReceiptData | null;
  error?: string;
}
