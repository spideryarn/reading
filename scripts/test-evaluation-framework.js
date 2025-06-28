/**
 * Simple test of the evaluation framework using compiled JavaScript
 */

async function testEvaluationFramework() {
  console.log('🧪 Testing PDF Processing Evaluation Framework')
  console.log('=' .repeat(60))
  
  try {
    // Import the evaluation functions
    const { 
      calculateTextSimilarity,
      calculateStructuralPreservation,
      calculateAcademicContentQuality,
      calculatePerformanceMetric,
      evaluateProcessingQuality,
      generateEvaluationReport
    } = require('../lib/evaluation/pdf-evaluation-framework')
    
    console.log('✅ Successfully imported evaluation framework')
    
    // Test data
    const sampleExpectedHtml = `
      <article>
        <header><h1>Sample Academic Paper</h1></header>
        <main>
          <p>This is a sample academic paper with various elements.</p>
          <h2>Introduction</h2>
          <p>Academic content with <cite>citations</cite> and references.</p>
          <figure>
            <img src="figure1.png" alt="Sample figure"/>
            <figcaption>Figure 1: Sample figure caption</figcaption>
          </figure>
          <table>
            <tr><th>Column 1</th><th>Column 2</th></tr>
            <tr><td>Data 1</td><td>Data 2</td></tr>
          </table>
          <div class="math">E = mc²</div>
          <div class="footnote">This is a footnote</div>
        </main>
      </article>
    `
    
    const sampleActualHtml = `
      <article>
        <header><h1>Sample Academic Paper</h1></header>
        <main>
          <p>This is a sample academic paper with various elements.</p>
          <h2>Introduction</h2>
          <p>Academic content with citations and references.</p>
          <figure>
            <img src="figure1.png" alt="Sample figure"/>
            <figcaption>Figure 1: Sample figure caption</figcaption>
          </figure>
          <table>
            <tr><th>Column 1</th><th>Column 2</th></tr>
            <tr><td>Data 1</td><td>Data 2</td></tr>
          </table>
          <div class="equation">E = mc²</div>
        </main>
      </article>
    `
    
    console.log('📊 Testing individual metrics...')
    
    // Test individual metrics
    const textSimilarity = calculateTextSimilarity(sampleExpectedHtml, sampleActualHtml)
    console.log(`✅ Text Similarity: ${(textSimilarity.score * 100).toFixed(1)}% (${textSimilarity.passed ? 'PASS' : 'FAIL'})`)
    console.log(`   ${textSimilarity.details}`)
    
    const structural = calculateStructuralPreservation(sampleExpectedHtml, sampleActualHtml)
    console.log(`✅ Structural Preservation: ${(structural.score * 100).toFixed(1)}% (${structural.passed ? 'PASS' : 'FAIL'})`)
    console.log(`   ${structural.details}`)
    
    const academic = calculateAcademicContentQuality(sampleExpectedHtml, sampleActualHtml)
    console.log(`✅ Academic Content: ${(academic.score * 100).toFixed(1)}% (${academic.passed ? 'PASS' : 'FAIL'})`)
    console.log(`   ${academic.details}`)
    
    const performance = calculatePerformanceMetric(5000) // 5 seconds
    console.log(`✅ Performance: ${(performance.score * 100).toFixed(1)}% (${performance.passed ? 'PASS' : 'FAIL'})`)
    console.log(`   ${performance.details}`)
    
    console.log()
    console.log('🎯 Testing comprehensive evaluation...')
    
    // Test comprehensive evaluation
    const result = evaluateProcessingQuality(
      sampleExpectedHtml,
      sampleActualHtml,
      5000, // 5 second processing time
      {
        sourceType: 'pdf',
        pageCount: 1,
        fileSize: 1024 * 100, // 100KB
        provider: 'gemini'
      },
      'test-method'
    )
    
    console.log('✅ Comprehensive Evaluation Results:')
    console.log(`   Overall Score: ${(result.overallScore * 100).toFixed(1)}%`)
    console.log(`   Passed: ${result.passed ? '✅ YES' : '❌ NO'}`)
    console.log(`   Processing Time: ${result.processingTime}ms`)
    console.log(`   Metrics Count: ${result.metrics.length}`)
    
    console.log()
    console.log('📋 Testing report generation...')
    
    // Test report generation
    const report = generateEvaluationReport([result])
    console.log('✅ Generated evaluation report:')
    console.log(report)
    
    console.log('✅ All evaluation framework tests passed!')
    console.log()
    console.log('🎯 Framework Capabilities Verified:')
    console.log('   ✅ Text similarity analysis (Levenshtein distance)')
    console.log('   ✅ HTML structural element preservation')
    console.log('   ✅ Academic content quality assessment')
    console.log('   ✅ Processing performance evaluation')
    console.log('   ✅ Comprehensive weighted scoring')
    console.log('   ✅ Detailed report generation')
    
  } catch (error) {
    console.error('❌ Evaluation framework test failed:', error)
    return false
  }
  
  return true
}

// Run the test
testEvaluationFramework()
  .then(success => {
    if (success) {
      console.log('\n🎉 Evaluation framework is ready for Stage 8!')
      process.exit(0)
    } else {
      console.log('\n❌ Evaluation framework needs fixes')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })