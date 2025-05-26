import { readFileSync } from 'fs';
import { load } from 'cheerio';
import { assignDeterministicIds, getBodyWithIds } from '../deterministicId';

// Simple test runner
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

// Extract all IDs from HTML body in a deterministic order
function extractIds(bodyHtml: string): string[] {
  const $ = load(`<body>${bodyHtml}</body>`);
  const ids: string[] = [];
  
  // Traverse in document order
  const traverse = (el: cheerio.Element) => {
    const $el = $(el);
    const id = $el.attr('id');
    if (id) ids.push(id);
    
    $el.children().each((_, child) => {
      if (child.type === 'tag') traverse(child);
    });
  };
  
  $('body').children().each((_, child) => {
    if (child.type === 'tag') traverse(child);
  });
  
  return ids;
}

async function runTests() {
  console.log('Running deterministic ID generation tests...\n');
  
  // Load the Chalmers HTML file
  const originalHtml = readFileSync(
    './static/examples/Chalmers (1995) - Facing Up to the Problem of Consciousness cropped.html',
    'utf-8'
  );
  
  // Test 1: Generate IDs
  console.log('Test 1: Basic ID generation');
  const htmlWithIds = assignDeterministicIds(originalHtml);
  const $ = load(htmlWithIds);
  const idsCount = $('[id^="syr-"]').length;
  assert(idsCount > 0, `Generated ${idsCount} IDs`);
  
  // Test 2: IDs are deterministic
  console.log('\nTest 2: IDs are deterministic');
  const body1 = getBodyWithIds(originalHtml);
  const body2 = getBodyWithIds(originalHtml);
  const ids1 = extractIds(body1);
  const ids2 = extractIds(body2);
  assert(JSON.stringify(ids1) === JSON.stringify(ids2), 'Same input generates same IDs');
  
  // Store reference IDs for comparison
  const referenceIds = ids1;
  
  // Test 3: Changes that should NOT affect IDs
  console.log('\nTest 3: Changes that should NOT affect body IDs');
  
  // Change meta tags
  let modifiedHtml = originalHtml.replace(
    /<meta name="author"[^>]*>/,
    '<meta name="author" content="Different Author">'
  );
  const bodyAfterMetaChange = getBodyWithIds(modifiedHtml);
  assert(JSON.stringify(referenceIds) === JSON.stringify(extractIds(bodyAfterMetaChange)), 'Meta tag changes do not affect body IDs');
  
  // Change title
  modifiedHtml = originalHtml.replace(
    /<title>[^<]*<\/title>/,
    '<title>Different Title</title>'
  );
  const bodyAfterTitleChange = getBodyWithIds(modifiedHtml);
  assert(JSON.stringify(referenceIds) === JSON.stringify(extractIds(bodyAfterTitleChange)), 'Title changes do not affect body IDs');
  
  // Add HTML comments
  modifiedHtml = originalHtml.replace(
    '<body',
    '<!-- This is a comment --><body'
  );
  const bodyAfterCommentAdd = getBodyWithIds(modifiedHtml);
  assert(JSON.stringify(referenceIds) === JSON.stringify(extractIds(bodyAfterCommentAdd)), 'HTML comments do not affect body IDs');
  
  // Change style attributes
  const $mod = load(originalHtml);
  $mod('p').first().attr('style', 'color: red;');
  const bodyAfterStyleChange = getBodyWithIds($mod.html());
  assert(JSON.stringify(referenceIds) === JSON.stringify(extractIds(bodyAfterStyleChange)), 'Style attribute changes do not affect body IDs');
  
  // Test 4: Changes that SHOULD affect IDs
  console.log('\nTest 4: Changes that SHOULD affect IDs');
  
  // Add a new element
  const $add = load(originalHtml);
  $add('body').prepend('<div class="new-element">New content</div>');
  const bodyAfterAddElement = getBodyWithIds($add.html());
  const idsAfterAdd = extractIds(bodyAfterAddElement);
  assert(JSON.stringify(referenceIds) !== JSON.stringify(idsAfterAdd), 'Adding elements changes IDs');
  
  // Change class name
  const $class = load(originalHtml);
  const firstP = $class('p').first();
  if (firstP.length) {
    firstP.addClass('modified-class');
    const bodyAfterClassChange = getBodyWithIds($class.html());
    const idsAfterClassChange = extractIds(bodyAfterClassChange);
    assert(JSON.stringify(referenceIds) !== JSON.stringify(idsAfterClassChange), 'Changing class names changes IDs');
  }
  
  // Change tag name (p to div)
  const $tag = load(originalHtml);
  const firstPara = $tag('p').first();
  if (firstPara.length) {
    const content = firstPara.html();
    const attrs = firstPara.attr();
    firstPara.replaceWith(`<div ${Object.entries(attrs || {}).map(([k, v]) => `${k}="${v}"`).join(' ')}>${content}</div>`);
    const bodyAfterTagChange = getBodyWithIds($tag.html());
    const idsAfterTagChange = extractIds(bodyAfterTagChange);
    assert(JSON.stringify(referenceIds) !== JSON.stringify(idsAfterTagChange), 'Changing tag names changes IDs');
  }
  
  // Test 5: Verify IDs are unique
  console.log('\nTest 5: ID uniqueness');
  const $unique = load(htmlWithIds);
  const allIds = new Set<string>();
  $unique('[id^="syr-"]').each((_, el) => {
    const id = $unique(el).attr('id');
    if (id && allIds.has(id)) {
      throw new Error(`Duplicate ID found: ${id}`);
    }
    if (id) allIds.add(id);
  });
  assert(allIds.size === idsCount, `All ${idsCount} IDs are unique`);
  
  console.log('\n✅ All tests passed!');
}

// Run tests
runTests().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});