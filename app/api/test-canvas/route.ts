import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('Testing canvas import in Next.js API route...')
  
  const results: any[] = []
  
  // Test 1: Try @napi-rs/canvas
  try {
    console.log('Attempting to import @napi-rs/canvas...')
    const napiCanvas = await import('@napi-rs/canvas')
    results.push({
      module: '@napi-rs/canvas',
      success: true,
      exports: Object.keys(napiCanvas).slice(0, 5),
      hasCanvas: 'Canvas' in napiCanvas,
      hasPath2D: 'Path2D' in napiCanvas
    })
    console.log('✅ @napi-rs/canvas imported successfully')
  } catch (error) {
    console.error('❌ @napi-rs/canvas import failed:', error)
    results.push({
      module: '@napi-rs/canvas',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      isNodeModuleVersionError: error instanceof Error && error.message.includes('NODE_MODULE_VERSION')
    })
  }
  
  // Test 2: Try canvas
  try {
    console.log('Attempting to import canvas...')
    const canvas = await import('canvas')
    results.push({
      module: 'canvas',
      success: true,
      exports: Object.keys(canvas).slice(0, 5),
      hasCanvas: 'Canvas' in canvas,
      hasCreateCanvas: 'createCanvas' in canvas
    })
    console.log('✅ canvas imported successfully')
  } catch (error) {
    console.error('❌ canvas import failed:', error)
    results.push({
      module: 'canvas',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      isNodeModuleVersionError: error instanceof Error && error.message.includes('NODE_MODULE_VERSION')
    })
  }
  
  // Test 3: Try the exact import pattern from pdf-image-extractor-server.ts
  let finalResult: any = null
  try {
    console.log('Testing production import pattern...')
    const canvasModule = await (async () => {
      try {
        return await import('@napi-rs/canvas')
      } catch (err) {
        console.warn('Falling back to canvas module:', err)
        return await import('canvas')
      }
    })()
    
    finalResult = {
      pattern: 'production-fallback',
      success: true,
      moduleUsed: '@napi-rs/canvas' in results && results[0].success ? '@napi-rs/canvas' : 'canvas'
    }
  } catch (error) {
    finalResult = {
      pattern: 'production-fallback',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
  
  // Return detailed results
  return NextResponse.json({
    nodeVersion: process.version,
    nodeModuleVersion: process.versions.modules,
    platform: process.platform,
    arch: process.arch,
    results,
    finalResult,
    timestamp: new Date().toISOString()
  }, { status: 200 })
} 