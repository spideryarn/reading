// Test importing @napi-rs/canvas
console.log('Testing @napi-rs/canvas import...\n');

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const canvas = require('@napi-rs/canvas');
  console.log('✅ Successfully imported @napi-rs/canvas');
  console.log('Available exports:', Object.keys(canvas));
} catch (error) {
  console.error('❌ Failed to import @napi-rs/canvas:');
  console.error('Error:', error.message);
  if (error.message.includes('native binding')) {
    console.error('\n⚠️  This is the native binding error!');
  }
}