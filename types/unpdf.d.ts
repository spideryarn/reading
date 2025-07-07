declare module 'unpdf' {
  export function renderPageAsImage(
    data: Uint8Array | ArrayBuffer,
    pageNumber: number,
    options?: {
      scale?: number
      width?: number
      height?: number
      // Additional internal options are currently untyped
    }
  ): Promise<ArrayBuffer>
} 