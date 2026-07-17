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
A partir del siguiente texto OCR, extrae estos campos y devuelve SOLO JSON válido, sin texto adicional:

{
  "negocio": "nombre del comercio",
  "ruc": "00000000-0",
  "timbrado": "número de timbrado",
  "fecha_emision": "YYYY-MM-DD",
  "items": [
    { "descripcion": "nombre del artículo", "cantidad": 1, "importe": 0 }
  ],
  "total": 0
}

Moneda: Guaraníes (₲). Los importes son números enteros, sin decimales.
Normas:
- cantidad e importe deben ser números enteros (no strings)
- Si un valor no se encuentra, usa null
- Si no hay items individuales, infiere del total
- fecha_emision en formato ISO

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
