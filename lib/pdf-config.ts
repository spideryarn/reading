// PDF.js configuration for Next.js App Router
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use CDN for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export { pdfjsLib };