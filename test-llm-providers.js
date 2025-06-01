#!/usr/bin/env node

// Test script for API routes with different LLM providers
// Tests /api/summarise, /api/glossary, and /api/headings

const testData = {
  summarise: {
    content: `The Industrial Revolution marked a major turning point in human history. Beginning in Britain in the late 18th century, it was characterized by the transition from manual labor and handicraft economy to machine manufacturing and industrial production. Key innovations included the steam engine, which powered factories and transportation, and the development of iron and steel production techniques. This period saw unprecedented urban growth as people moved from rural areas to work in factories. The social impacts were profound, creating new social classes, changing family structures, and revolutionizing daily life. While it brought prosperity and technological advancement, it also led to challenging working conditions, child labor, and environmental degradation that would shape reform movements for decades to come.`,
    granularity: 'sentence'
  },
  glossary: {
    content: `Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. Neural networks, inspired by the human brain, consist of interconnected nodes that process information. Deep learning extends this concept with multiple layers, allowing for more complex pattern recognition. Key concepts include supervised learning, where models train on labeled data, and unsupervised learning, which finds patterns in unlabeled data. Reinforcement learning teaches agents through reward-based feedback. Common applications include natural language processing, computer vision, and recommendation systems.`
  },
  headings: {
    content: `The water cycle, also known as the hydrological cycle, describes the continuous movement of water on, above, and below Earth's surface. Water evaporates from oceans, lakes, and rivers, rising into the atmosphere as water vapor. As it cools, condensation occurs, forming clouds. When cloud particles become heavy enough, precipitation falls as rain, snow, or hail. Some water infiltrates the soil, replenishing groundwater supplies, while surface runoff flows back to water bodies. Plants contribute through transpiration, releasing water vapor from their leaves. This endless cycle is crucial for life on Earth, distributing fresh water across the planet and regulating global climate patterns. Human activities increasingly impact the water cycle through urbanization, deforestation, and climate change.`
  }
};

async function testEndpoint(endpoint, data, provider) {
  console.log(`\nTesting ${endpoint} with ${provider}...`);
  
  try {
    const response = await fetch(`http://localhost:3002${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Error (${response.status}):`, result.error || result);
      return false;
    }
    
    console.log(`✅ Success! Response preview:`);
    console.log(JSON.stringify(result, null, 2).substring(0, 200) + '...');
    return true;
    
  } catch (error) {
    console.error(`❌ Network error:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting LLM Provider Tests');
  console.log('================================');
  
  // Get current provider from environment
  const currentProvider = process.env.LLM_PROVIDER || 'anthropic';
  console.log(`\nCurrent provider: ${currentProvider}`);
  
  const results = {
    [currentProvider]: {}
  };
  
  // Test all endpoints with current provider
  console.log(`\n📊 Testing with ${currentProvider.toUpperCase()} provider:`);
  
  results[currentProvider].summarise = await testEndpoint('/api/summarise', testData.summarise, currentProvider);
  results[currentProvider].glossary = await testEndpoint('/api/glossary', testData.glossary, currentProvider);
  results[currentProvider].headings = await testEndpoint('/api/headings', testData.headings, currentProvider);
  
  // Summary
  console.log('\n\n📋 Test Summary:');
  console.log('================');
  
  for (const [provider, endpoints] of Object.entries(results)) {
    console.log(`\n${provider.toUpperCase()}:`);
    for (const [endpoint, success] of Object.entries(endpoints)) {
      console.log(`  ${endpoint}: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    }
  }
  
  console.log('\n\n💡 To test with a different provider:');
  console.log('1. Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local');
  console.log('2. Set LLM_PROVIDER=google in .env.local');
  console.log('3. Restart the dev server (npm run dev)');
  console.log('4. Run this test again');
}

// Run the tests
runTests().catch(console.error);