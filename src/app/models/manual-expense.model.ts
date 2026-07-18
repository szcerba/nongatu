export interface ManualExpense {
  id?: number;
  description: string;
  amount: number;
  categoryId: number;
  date: string;
  notes?: string;
  createdAt: Date;
}
