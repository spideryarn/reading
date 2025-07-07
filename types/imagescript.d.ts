declare module 'imagescript' {
  // These are minimal type stubs for the ImageScript library that we use only for
  // decoding, cropping and encoding images at runtime. We model the APIs we need
  // as `any` to avoid pulling the full type definitions (which are not bundled).
  export class Image {
    static decode(data: Uint8Array | ArrayBuffer): Promise<Image>
    width: number
    height: number
    crop(x: number, y: number, width: number, height: number): Image
    encode(): Promise<Uint8Array>
    encodeJPG(quality?: number): Promise<Uint8Array>
  }
} 