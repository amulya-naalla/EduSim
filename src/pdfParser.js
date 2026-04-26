/**
 * pdfParser.js — Extracts text from a PDF file using pdfjs-dist
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Use local worker bundled by Vite instead of CDN to avoid fetch errors
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Extracts text from an uploaded PDF file object.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async function() {
      try {
        const typedarray = new Uint8Array(this.result);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        
        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages to avoid context bloat
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += pageText + '\\n';
        }
        
        resolve(fullText.trim());
      } catch (err) {
        console.error("PDF Parsing Error:", err);
        reject(err);
      }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
