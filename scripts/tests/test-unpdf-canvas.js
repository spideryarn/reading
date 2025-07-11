// Test using unpdf with @napi-rs/canvas
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderPageAsImage } = require('unpdf');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

async function test() {
  console.log('Testing unpdf with @napi-rs/canvas...\n');
  
  try {
    // Load test PDF
    const pdfPath = path.join(process.cwd(), 'test-data/Bounding Box Test Document.pdf');
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('PDF loaded:', pdfBuffer.length, 'bytes');
    
    // Try to render with @napi-rs/canvas
    console.log('\nAttempting to render page 1...');
    const imageBuffer = await renderPageAsImage(
      new Uint8Array(pdfBuffer),
      1,
      {
        scale: 2,
        canvasImport: async () => {
          console.log('unpdf is requesting canvas import...');
          const canvas = await import('@napi-rs/canvas');
          console.log('Canvas module imported successfully');
          return canvas;
        }
      }
    );
    
    console.log('\n✅ Success! Rendered image:', imageBuffer.byteLength, 'bytes');
  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    if (error.message.includes('native binding')) {
      console.error('\n⚠️  This is the native binding error!');
    }
  }
}

test();