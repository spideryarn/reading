// PDF.js configuration for Next.js App Router
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use local file for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export { pdfjsLib };