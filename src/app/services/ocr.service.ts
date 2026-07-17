import { Injectable } from '@angular/core';
import { createWorker } from 'tesseract.js';

@Injectable({ providedIn: 'root' })
export class OcrService {

  async extractText(imageBase64: string): Promise<string> {
    const worker = await createWorker('spa');

    await worker.setParameters({
      tessedit_pageseg_mode: '6' as any,
      tessedit_ocr_engine_mode: '1' as any,
    });

    const { data } = await worker.recognize(imageBase64);
    await worker.terminate();
    return this.fixDecimals(data.text);
  }

  private fixDecimals(text: string): string {
    const lines = text.split('\n');
    const fixed: string[] = [];

    for (const line of lines) {
      // Split into number tokens and text tokens
      const tokens = line.split(/(\s+)/);
      const numbers: { idx: number; val: string }[] = [];

      tokens.forEach((tok, i) => {
        if (/^\d+$/.test(tok.trim())) {
          numbers.push({ idx: i, val: tok });
        }
      });

      // If we have 2+ adjacent numbers on a line, the first small one
      // is likely a decimal quantity that lost its dot
      if (numbers.length >= 2) {
        for (let i = 0; i < numbers.length - 1; i++) {
          const curr = numbers[i];
          const next = numbers[i + 1];
          const currNum = parseInt(curr.val);
          const nextNum = parseInt(next.val);

          // Small number followed by a much bigger number = decimal quantity
          // e.g. "10 5000" should be "1.0 5000"
          // e.g. "082 32000" should be "0.82 32000"
          if (currNum >= 1 && currNum <= 99 && nextNum > currNum * 5) {
            if (curr.val.length === 2 && currNum >= 1 && currNum <= 9) {
              // "10" -> "1.0", "25" -> "2.5", etc.
              tokens[curr.idx] = curr.val[0] + '.' + curr.val[1];
            } else if (curr.val.length === 3 && curr.val.startsWith('0')) {
              // "082" -> "0.82", "050" -> "0.50"
              tokens[curr.idx] = '0.' + curr.val.slice(1);
            }
          }
        }
      }

      fixed.push(tokens.join(''));
    }

    return fixed.join('\n');
  }
}
