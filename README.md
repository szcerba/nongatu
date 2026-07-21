# Ñongatu

Aplicación Angular PWA para gestión de gastos del hogar con inteligencia artificial. Escanea recibos, categoriza productos y genera analytics mensuales con soporte offline.

## Stack

| Capa          | Tecnología                               |
|---------------|------------------------------------------|
| Framework     | Angular 22                               |
| UI            | Ionic 8 + CSS personalizado              |
| Base de datos | IndexedDB (via `ngx-indexed-db`)         |
| Escaneo       | API Groq (Llama 3.2 90B Vision) para OCR |
| Gráficos      | Chart.js + ng2-charts                    |
| PWA           | @angular/pwa con service worker          |

## Estructura del proyecto

```
src/
├── app/
│   ├── components/
│   │   ├── sidebar/              # Navegación lateral responsive
│   │   └── typewriter/           # Efecto typewriter para textos
│   ├── models/
│   │   ├── invoice.model.ts      # Invoice, InvoiceItem, InvoiceProduct
│   │   ├── product.model.ts      # Product (name, category, lastUnitPrice, averagePrice, totalSpent)
│   │   ├── receipt.model.ts      # ReceiptItem (cantidad, descripcion, precio, importe)
│   │   └── manual-expense.model.ts # ManualExpense (description, amount, categoryId, date)
│   ├── pages/
│   │   ├── dashboard/            # Resumen mensual con gráficos y alertas
│   │   ├── scan/                 # Escaneo de recibos con IA
│   │   ├── invoices/             # Historial de facturas
│   │   ├── products/             # CRUD de productos (catálogo)
│   │   └── manual-expense/       # Gastos manuales no asociados a facturas
│   ├── services/
│   │   ├── database.service.ts   # Inicialización y migraciones de IndexedDB
│   │   ├── invoice.service.ts    # CRUD de facturas y productos
│   │   ├── receipt-parser.service.ts # Prompt engineering para OCR de recibos
│   │   ├── analytics.service.ts  # Cálculos de totales, histórico y alertas
│   │   ├── alert.service.ts      # Alertas de presupuesto por categoría
│   │   ├── manual-expense.service.ts # CRUD de gastos manuales
│   │   └── storage.service.ts    # Cache local de imágenes
│   ├── app.routes.ts             # Definición de rutas
│   └── app.config.ts             # Configuración de providers
├── styles.css                    # Variables CSS globales (tema verde)
└── index.html
```

## Modelo de datos

### Invoice
| Campo    | Tipo          | Descripción                        |
|----------|---------------|------------------------------------|
| id       | number        | Auto-increment (IndexedDB)         |
| date     | string        | Fecha ISO de la compra             |
| total    | number        | Suma de importes de la factura     |
| items    | InvoiceItem[] | Artículos escaneados               |
| imageUrl | string        | URL del blob de la imagen original |
| month    | string        | "YYYY-MM" para consultas rápidas   |

### InvoiceItem / InvoiceProduct
| Campo       | Tipo   | Descripción                                      |
|-------------|--------|--------------------------------------------------|
| cantidad    | number | Cantidad comprada (derivada de importe / precio) |
| descripcion | string | Nombre del producto                              |
| precio      | number | Precio unitario (del ticket)                     |
| importe     | number | Importe total del renglón (source of truth)      |
| categoria   | string | Categoría asignada (automática o manual)         |
| unitPrice   | number | Alias de precio (según contexto)                 |

### Product
| Campo          | Tipo   | Descripción                              |
| -------------- | ------ | ---------------------------------------- |
| name           | string | Nombre normalizado del producto          |
| category       | string | Categoría                                |
| lastUnitPrice  | number | Precio unitario de la última compra      |
| averagePrice   | number | Precio promedio histórico                |
| totalSpent     | number | Gasto total histórico                    |
| totalPurchases | number | Veces que se compró                      |
| lastPurchase   | string | Fecha ISO de la última compra            |

### ManualExpense
| Campo       | Tipo   | Descripción                        |
| ----------- | ------ | ---------------------------------- |
| id          | number | Auto-increment (IndexedDB)         |
| description | string | Descripción del gasto              |
| amount      | number | Monto                              |
| categoryId  | string | Categoría asociada                 |
| date        | string | Fecha ISO                          |
| notes       | string | Notas opcionales                   |
| createdAt   | string | Fecha ISO de creación              |

## Flujo de escaneo

1. El usuario captura o selecciona una imagen de recibo
2. Se envía a Groq API (Llama 3.2 90B Vision) con un prompt específico para formato paraguayo: `[cantidad] [descripcion] [precio] [importe]`
3. El parser extrae items en formato JSON con thousand-separator dots
4. Para cada item, se busca el producto en la DB por nombre normalizado
5. **Autocorrección**: si el producto existe, se usa el nombre almacenado + `lastUnitPrice` (de DB) como precio, y se recalcula `cantidad = importe / precio`. El importe del OCR se preserva siempre.
6. Si no existe, se crea un nuevo producto con los valores del OCR
7. Se asignan categorías automáticamente (comida, limpieza, etc.)
8. Se guarda la factura completa en IndexedDB

### Indicadores visuales en escaneo

- **Borde del campo descripción**: verde si el producto existe en DB, amarillo si es nuevo
- **Borde del campo precio**: verde si coincide con `lastUnitPrice` almacenado, amarillo si difiere o el producto es nuevo

## Reglas de negocio

- **Cantidad**: siempre derivada de `importe / precio`. `importe` es el source of truth.
- **Gastos manuales**: se incluyen en totales mensuales, dashboard, analytics y alertas de presupuesto.
- **Alertas**: se comparan gastos reales (facturas + manuales) contra presupuestos por categoría.
- **Errores de API**: los errores de Groq (rate limit, timeout, etc.) se muestran textualmente, sin mensajes genéricos.

## Instalación

```bash
git clone <repo-url>
cd nongatu
npm install
```

## Desarrollo

```bash
ng serve          # Servidor local → http://localhost:4200
```

## Build

```bash
ng build          # Build de producción en dist/
```

## Producción

```bash
ng build --configuration production
```

Los archivos estáticos se sirven desde `dist/nongatu/browser/`. La PWA con service worker funciona offline una vez visitada.

## Variables de entorno

Crear `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  groqApiKey: 'tu-api-key-de-groq'
};
```

La API key de Groq se necesita para el escaneo de recibos.

## Dependencias principales

- `@ionic/angular` — UI toolkit
- `ngx-indexed-db` — IndexedDB wrapper
- `chart.js` + `ng2-charts` — gráficos
- `@angular/pwa` — service worker + manifest
- `@angular/service-worker` — caching offline
