// Debug script to inject into browser console to check navigation items
console.log('🧭 Debugging navigation items...');

// Check if navigation items are being generated
const navElement = document.querySelector('.vertical-icon-nav');
if (navElement) {
  console.log('📍 Found vertical navigation element');
  
  // Count navigation buttons (excluding collapse and command palette)
  const buttons = navElement.querySelectorAll('a[href*="tab="]');
  console.log('🔢 Tool navigation buttons found:', buttons.length);
  
  buttons.forEach((button, index) => {
    const href = button.getAttribute('href');
    const tabId = href ? new URLSearchParams(href.split('?')[1]).get('tab') : 'unknown';
    const icon = button.querySelector('svg');
    const iconClass = icon ? icon.getAttribute('class') : 'no-icon';
    console.log(`   ${index + 1}. Tab: ${tabId}, Icon: ${iconClass ? 'present' : 'missing'}`);
  });
  
  // Check if there are any console errors
  console.log('🔍 Checking for any navigation generation errors...');
} else {
  console.log('❌ Vertical navigation element not found!');
  console.log('🔍 Available elements with "nav" in class name:');
  document.querySelectorAll('[class*="nav"]').forEach(el => {
    console.log('   -', el.className);
  });
}