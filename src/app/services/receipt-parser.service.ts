import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import type { ReceiptData } from '../models/receipt.model';

@Injectable({ providedIn: 'root' })
export class ReceiptParserService {

  async parse(text: string): Promise<ReceiptData> {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${environment.groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{
            role: 'user',
            content: `Eres un extractor de datos de comprobantes de compra paraguayos.
A partir del siguiente texto OCR, extrae estos campos y devuelve SOLO JSON válido, sin texto adicional.

REGLAS ESTRICTAS:
1. Cada línea de producto tiene el formato: [cantidad] [descripción] [precio_unitario] [importe_total]
   - Ejemplo OCR: "0,47 REMOLACHA X KILO 5.750 o 2.731"
   - Esto significa: cantidad=0.47, descripcion="REMOLACHA X KILO", precio=5750, importe=2731
   - El texto "o" u otros separadores entre el precio y el importe deben ignorarse.
2. La cantidad usa coma como decimal (ej: "0,82" = 0.82, "0,47" = 0.47).
3. Precio e importe usan punto como separador de miles (ej: "5.750" = 5750, "2.731" = 2731).
4. Para cada línea de producto SIEMPRE extrae los 4 campos: cantidad, descripcion, precio e importe.
   - No omitas el importe. Si ves un número después del precio, ese es el importe.
   - Ej: "0,47 REMOLACHA X KILO 5.750 2.731" → {"cantidad": 0.47, "descripcion": "REMOLACHA X KILO", "precio": 5750, "importe": 2731}

Formato esperado:
{
  "negocio": "nombre del comercio",
  "ruc": "00000000-0",
  "timbrado": "número de timbrado",
  "fecha_emision": "YYYY-MM-DD",
  "items": [
    { "descripcion": "texto exacto del OCR", "cantidad": 0.47, "precio": 5750, "importe": 2731 }
  ],
  "total": 0
}

- cantidad puede ser decimal (ej: 0.82) o entero (ej: 1.0, 2, 5).
- precio es entero sin separador de miles (ej: 5750).
- importe SIEMPRE debe extraerse, no lo calcules. Si ves el número en el texto, úsalo.
- Si un valor no se encuentra, usa null.
- fecha_emision en formato ISO (YYYY-MM-DD).

Texto OCR:
${text}`
          }],
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) throw new Error('Respuesta vacía de la API');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se pudo extraer JSON de la respuesta');

    return JSON.parse(jsonMatch[0]) as ReceiptData;
  }
}
