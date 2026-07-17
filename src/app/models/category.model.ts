export interface Category {
  id?: number;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Alimentos y Bebidas', icon: 'bi-cart', color: '#22c55e', isDefault: true },
  { name: 'Limpieza y Aseo', icon: 'bi-droplet', color: '#3b82f6', isDefault: true },
  { name: 'Salud y Farmacia', icon: 'bi-heart-pulse', color: '#ef4444', isDefault: true },
  { name: 'Vestimenta', icon: 'bi-handbag', color: '#a855f7', isDefault: true },
  { name: 'Tecnología', icon: 'bi-phone', color: '#6366f1', isDefault: true },
  { name: 'Hogar y Mantenimiento', icon: 'bi-house', color: '#f59e0b', isDefault: true },
  { name: 'Transporte y Combustible', icon: 'bi-fuel-pump', color: '#ec4899', isDefault: true },
  { name: 'Entretenimiento', icon: 'bi-controller', color: '#14b8a6', isDefault: true },
  { name: 'Educación', icon: 'bi-book', color: '#8b5cf6', isDefault: true },
  { name: 'Servicios', icon: 'bi-wifi', color: '#06b6d4', isDefault: true },
  { name: 'Otros', icon: 'bi-three-dots', color: '#6b7280', isDefault: true },
];
