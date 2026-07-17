export interface MonthlyBudget {
  id?: number;
  month: string;
  categoryId: number;
  limit: number;
}

export interface BudgetAlert {
  id?: number;
  month: string;
  type: 'exceeded' | 'warning' | 'repetitive' | 'unusual' | 'trend';
  categoryId?: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: Date;
}
