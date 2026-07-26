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
- `dexie` — IndexedDB wrapper
- `@angular/pwa` — service worker + manifest
- `@angular/service-worker` — caching offline

---

## TODO

### 🔴 Críticos

- [ ] **Backend proxy para Groq API** — La clave de Groq queda expuesta en el JS compilado del browser. Mover la llamada a un serverless function (Cloudflare Worker, Netlify Function, etc.) y eliminar la key del frontend.
- [ ] **DB via DI** — `db` se exporta como singleton directo (`export const db = new AppDatabase()`). Envolver en un `@Injectable({ providedIn: 'root' })` para habilitar inyección de dependencias y tests mockeables.
- [ ] **Fix N+1 queries en InvoiceService** — `getAllWithItems()` carga todas las facturas y luego hace N queries por cada una para traer sus items. Usar batch queries o joins con Dexie.

### 🟠 Altos

- [ ] **Lazy loading en rutas** — Las 11 páginas se cargan eager. Usar `loadChildren` para mejora de tiempo de carga inicial.
- [ ] **Cache de Tesseract worker** — El worker y modelo (~15MB) se descargan del CDN en cada escaneo. Reutilizar la instancia.
- [ ] **Queries indexadas en AnalyticsService** — `getMonthsRange()` y `getMonthSummary()` cargan TODA la base y filtran en JS. Usar queries indexadas por `month`.
- [ ] **Tests de servicios** — Solo 1 test de creación del componente raíz. Vitest está configurado pero no se usa. Agregar tests para CategoryService, InvoiceService, ReceiptParserService.

### 🟡 Medios

- [ ] **Extraer `formatGs()` como pipe** — Duplicado en 6+ componentes. Crear un `CurrencyGsPipe` compartido.
- [ ] **Unificar theme toggle** — Header y Sidebar ambos tienen `isDark()` y `toggleTheme()` independientes. Crear un `ThemeService` compartido.
- [ ] **Eliminar sidebar duplicada** — Menú desktop y mobile son copias completas del HTML. Unificar con un `@if` o componente reutilizable.
- [ ] **Eliminar dependencias muertas** — `chart.js` y `ng2-charts` instalados pero no usados. Quitar del `package.json`.
- [ ] **Pinning de versiones Capacitor** — `@capacitor/core: latest` sin pinning. Fijar versión específica.
- [ ] **Tree-shakear Bootstrap** — Carga bundle completo (~200KB+) para grid, cards y unos utilities. Usar SCSS parciales.
- [ ] **Convertir getters a `computed()`** — En History, Budget y ManualExpense, los getters crean nuevos `computed()` en cada acceso. Mover a nivel de clase.
- [ ] **Handler global de errores** — No hay `ErrorHandler` provider ni interceptors HTTP. Agregar manejo centralizado.
- [ ] **HttpClient en vez de `fetch`** — `receipt-parser.service.ts` usa `fetch()` directo. Migrar a `HttpClient` para interceptors, logging y error handling.
- [ ] **`strict: true` en tsconfig** — El proyecto usa strictness selectivo en vez de full strict mode.
- [ ] **Implementar `getCurrentMonthAlerts()`** — En AnalyticsService retorna siempre `{ exceeded: false, percentage: 0 }`. Código muerto/placeholder.
- [ ] **Validación de tamaño en uploads** — No hay validación de tamaño de imagen. Un archivo de 50MB se procesaría directamente.
- [ ] **Validación de schema en LLM output** — `JSON.parse()` del output del LLM sin validación. Un JSON malformado rompe la app.

### 🟢 Bajo

- [ ] **Renombrar campos español→inglés en modelos** — `receipt.model.ts` usa campos en español (`negocio`, `ruc`, `descripcion`) mientras `invoice.model.ts` usa inglés. Unificar.
- [ ] **Separar ProductService de InvoiceService** — `InvoiceService` maneja facturas Y productos. Debería ser un `ProductService` separado.
- [ ] **Virtual scrolling en historial y productos** — Renderiza todos los items a la vez. Usar `@angular/cdk/virtual-scroll-viewport`.
- [ ] **`updatedAt` en modelos** — Ninguna tabla tiene campo de actualización. Agregar donde aplique.
- [ ] **Indexes compuestos en budgets** — `budgets` no tiene index compuesto `(month, categoryId)` para el lookup común.
