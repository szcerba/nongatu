export interface InvoiceItem {
  id?: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  categoryId?: number;
  customCategoryName?: string;
}

export interface Invoice {
  id?: number;
  business: string;
  ruc: string;
  timbrado: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  notes?: string;
  createdAt: Date;
}
