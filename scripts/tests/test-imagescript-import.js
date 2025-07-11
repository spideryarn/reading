// Test importing imagescript
console.log('Testing imagescript import...\n');

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Image } = require('imagescript');
  console.log('✅ Successfully imported imagescript');
  
  // Try to create a simple image
  const img = new Image(100, 100);
  console.log('Created test image:', img.width + 'x' + img.height);
  
  // Try to encode
  console.log('Testing encode...');
  img.encode().then(() => {
    console.log('✅ Encode works!');
  }).catch(err => {
    console.error('❌ Encode failed:', err.message);
  });
  
} catch (error) {
  console.error('❌ Failed to import imagescript:');
  console.error('Error:', error.message);
  if (error.message.includes('native binding')) {
    console.error('\n⚠️  This is the native binding error!');
  }
}