import { NextRequest, NextResponse } from 'next/server';
import { testPdfToPngConverter } from '@/lib/utils/pdf-converter-comparison';
import { join } from 'path';

export async function GET() {
  try {
    // Test with the known academic PDF
    const testPdfPath = join(process.cwd(), 'static', 'examples', '2105.10461v2_cropped.pdf');
    
    const result = await testPdfToPngConverter(testPdfPath);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('PDF conversion test failed:', error);
    
    return NextResponse.json(
      { error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}