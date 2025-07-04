#!/usr/bin/env npx tsx

/**
 * Simple tool registry validation
 */

async function validate() {
  console.log('🔍 Validating Tool Registry...\n');

  // Step 1: Initialize registry
  console.log('1️⃣ Initializing registry...');
  const { initializeToolRegistry } = await import('../lib/tools/registry-loader');
  await initializeToolRegistry();
  
  // Step 2: Get tools and stats
  console.log('2️⃣ Getting registry stats...');
  const { getAllTools, getRegistryStats, getTool } = await import('../lib/tools/registry');
  const allTools = getAllTools();
  const stats = getRegistryStats();
  
  console.log(`📊 Registry Statistics:`);
  console.log(`   Total tools: ${stats.totalTools}`);
  console.log(`   By category: ${JSON.stringify(stats.categories)}`);
  console.log(`   Registry locked: ${stats.registryLocked}`);
  console.log(`   Tool IDs: ${stats.toolIds.join(', ')}\n`);

  // Step 3: Basic validation
  const expectedTools = ['chat', 'glossary', 'highlights', 'metadata', 'search', 'summary', 'toc-ai', 'toc-original'];
  
  if (stats.totalTools !== expectedTools.length) {
    throw new Error(`Expected ${expectedTools.length} tools, found ${stats.totalTools}`);
  }
  console.log('✅ Correct number of tools registered');

  // Step 4: Check each tool
  const missingTools: string[] = [];
  for (const toolId of expectedTools) {
    const tool = getTool(toolId);
    if (!tool) {
      missingTools.push(toolId);
    }
  }
  
  if (missingTools.length > 0) {
    throw new Error(`Missing tools: ${missingTools.join(', ')}`);
  }
  console.log('✅ All expected tools are registered');

  // Step 5: Category validation
  const expectedCategories = {
    'analysis': 2,
    'navigation': 2,
    'interactive': 2,
    'generation': 2
  };
  
  for (const [category, expectedCount] of Object.entries(expectedCategories)) {
    const actualCount = stats.categories[category] || 0;
    if (actualCount !== expectedCount) {
      throw new Error(`Category '${category}': expected ${expectedCount} tools, found ${actualCount}`);
    }
  }
  console.log('✅ All categories have correct tool counts');

  // Step 6: Metadata validation
  let incompleteTools = 0;
  for (const tool of allTools) {
    if (!tool.name || !tool.description || !tool.category || !tool.icon) {
      incompleteTools++;
      console.warn(`⚠️  Tool '${tool.id}' has incomplete metadata`);
    }
  }
  
  if (incompleteTools === 0) {
    console.log('✅ All tools have complete metadata');
  }

  console.log('\n🎉 Tool Registry Validation Complete!');
  console.log(`   Successfully validated ${stats.totalTools} tools across ${Object.keys(stats.categories).length} categories.`);
}

// Run validation if this script is executed directly
if (require.main === module) {
  validate().catch(error => {
    console.error('\n❌ Validation failed:', error.message);
    process.exit(1);
  });
}

export { validate };