declare module 'pdf2pic' {
  interface ConvertOptions {
    density?: number;
    saveFilename?: string;
    savePath?: string;
    format?: string;
    width?: number;
    height?: number;
  }

  interface ConvertResult {
    name?: string;
    size?: number;
    path?: string;
    page?: number;
  }

  interface BulkOptions {
    responseType?: 'image' | 'base64';
  }

  interface Converter {
    bulk(pages: number, options?: BulkOptions): Promise<ConvertResult[]>;
  }

  interface Pdf2Pic {
    fromPath(path: string, options?: ConvertOptions): Converter;
    fromBuffer(buffer: Buffer, options?: ConvertOptions): Converter;
  }

  const pdf2pic: Pdf2Pic;
  export default pdf2pic;
}