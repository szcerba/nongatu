export interface Product {
  id?: number;
  name: string;
  normalized: string;
  categoryId?: number;
  purchaseCount: number;
  totalSpent: number;
  averagePrice: number;
  lastUnitPrice: number;
  lastPurchased: string;
}
