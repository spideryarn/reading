declare module 'unpdf' {
  export function renderPageAsImage(
    data: Uint8Array | ArrayBuffer,
    pageNumber: number,
    options?: {
      scale?: number
      width?: number
      height?: number
      /** Lazy import that returns a Canvas implementation when running in Node.js */
      canvasImport?: () => Promise<any> | any
      // Additional internal options are currently untyped
    }
  ): Promise<ArrayBuffer>
} 