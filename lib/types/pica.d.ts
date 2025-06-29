declare module 'pica' {
  interface PicaResizeOptions {
    quality?: number
    alpha?: boolean
    unsharpAmount?: number
    unsharpRadius?: number
    unsharpThreshold?: number
    tileRows?: number
    filter?: string
  }

  interface PicaOptions {
    features?: string[]
    idle?: number
    concurrency?: number
  }

  class Pica {
    constructor(options?: PicaOptions)
    
    resize(
      from: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
      to: HTMLCanvasElement | OffscreenCanvas,
      options?: PicaResizeOptions
    ): Promise<HTMLCanvasElement | OffscreenCanvas>
    
    toBlob(
      canvas: HTMLCanvasElement | OffscreenCanvas,
      mimeType: string,
      quality?: number
    ): Promise<Blob>
    
    resizeBuffer(options: {
      src: Uint8Array
      width: number
      height: number
      toWidth: number
      toHeight: number
      dest?: Uint8Array
      quality?: number
      alpha?: boolean
      unsharpAmount?: number
      unsharpRadius?: number
      unsharpThreshold?: number
    }): Uint8Array
  }

  export = Pica
}