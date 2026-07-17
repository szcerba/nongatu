import { Injectable } from '@angular/core';
import { db } from './database.service';
import { DEFAULT_CATEGORIES, type Category } from '../models/category.model';
import type { InvoiceItem } from '../models/invoice.model';

const KEYWORD_RULES: [RegExp, string][] = [
  [/(leche|pan|arroz|harina|fideo|galleta|aceite|azúcar|yerba|café|huevo|pollo|carne|pancho|embutido|tomate|cebolla|papa|mandioca|banana|manzana|naranja|limón)/i, 'Alimentos y Bebidas'],
  [/(cloro|detergente|jabón|lavaplatos|líquido|lavandina|escoba|trapo|esponja|odorizador|insecticida)/i, 'Limpieza y Aseo'],
  [/(medicamento|aspirina|ibuprofeno|paracetamol|remedio|farmaco|venda|alcohol|curita|vitamina)/i, 'Salud y Farmacia'],
  [/(remera|pantalón|short|buzo|camisa|zapato|zapatilla|medias|ropa|vestido|campera)/i, 'Vestimenta'],
  [/(celular|teléfono|cargador|cable|audífono|chip|memoria|pantalla|teclado|mouse|monitor)/i, 'Tecnología'],
  [/(foco|bombilla|enchufe|cable|llave|pintura|martillo|clavo|tornillo|pegamento|cinta|plomero|eléctrico)/i, 'Hogar y Mantenimiento'],
  [/(nafta|gasoil|combustible|gasolina|gnc|peaje|taxi|uber|colectivo|bus|pasaje)/i, 'Transporte y Combustible'],
  [/(cerveza|gaseosa|snack|chocolate|caramelo|helado|pizza|hamburguesa|comida|rapida|cine|película|juego)/i, 'Entretenimiento'],
  [/(cuota|colegio|curso|clase|libro|cuaderno|lápiz|bolígrafo|mochila|universidad)/i, 'Educación'],
  [/(luz|ande|essap|agua|tigo|personal|vox|internet|telefónica|claro|factura|servicio)/i, 'Servicios'],
];

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private initialized = false;

  async initDefaults(): Promise<void> {
    if (this.initialized) return;
    const count = await db.categories.count();
    if (count === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }
    this.initialized = true;
  }

  async getAll(): Promise<Category[]> {
    await this.initDefaults();
    return db.categories.toArray();
  }

  async getById(id: number): Promise<Category | undefined> {
    return db.categories.get(id);
  }

  autoCategorize(description: string): number | undefined {
    for (const [regex, categoryName] of KEYWORD_RULES) {
      if (regex.test(description)) {
        return DEFAULT_CATEGORIES.find((c) => c.name === categoryName)?.id;
      }
    }
    return undefined;
  }

  categorizeItems(items: InvoiceItem[]): InvoiceItem[] {
    return items.map((item) => {
      if (!item.categoryId) {
        const id = this.autoCategorize(item.description);
        if (id !== undefined) {
          item.categoryId = id;
        } else {
          item.categoryId = DEFAULT_CATEGORIES.length;
          item.customCategoryName = 'Otros';
        }
      }
      return item;
    });
  }

  async saveCustom(category: Category): Promise<number> {
    return db.categories.add(category) as Promise<number>;
  }

  async delete(id: number): Promise<void> {
    await db.categories.delete(id);
  }
}
