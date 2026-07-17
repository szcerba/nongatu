import { Injectable } from '@angular/core';
import { createWorker } from 'tesseract.js';

@Injectable({ providedIn: 'root' })
export class OcrService {

  async extractText(imageBase64: string): Promise<string> {
    const worker = await createWorker('spa');
    const { data } = await worker.recognize(imageBase64);
    await worker.terminate();
    return data.text;
  }
}
