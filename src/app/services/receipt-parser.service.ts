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
1. La cantidad debe ser el número exacto que aparece en la columna "Cant" o "Cant." de la factura. NO infieras cantidad desde la descripción del producto.
   - Ej: si Cant dice "1.0" la cantidad es 1.0 (número uno punto cero, no 10 ni 1).
   - Si la cantidad usa coma como decimal (ej: "0,82") conviértela a punto (0.82).
2. La descripción del producto debe copiarse lo más textual posible desde el OCR, sin interpretar ni corregir.
   - Ej: si el OCR dice "Chorizo Franz a con Queso x5", la descripción debe ser exactamente esa.
3. Importes en Guaraníes (₲). Son números enteros. "5.000" es 5000, "1.250" es 1250.

Formato esperado:
{
  "negocio": "nombre del comercio",
  "ruc": "00000000-0",
  "timbrado": "número de timbrado",
  "fecha_emision": "YYYY-MM-DD",
  "items": [
    { "descripcion": "texto exacto del OCR", "cantidad": 1.0, "importe": 0 }
  ],
  "total": 0
}

- cantidad puede ser decimal (ej: 0.82) o entero (ej: 1.0, 2, 5).
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
