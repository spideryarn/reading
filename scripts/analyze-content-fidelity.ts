#!/usr/bin/env npx tsx
/**
 * Content Fidelity Analysis Tool
 * 
 * Command-line tool for analyzing and comparing original vs extracted HTML content.
 * Provides detailed reports on content preservation, missing elements, and extraction quality.
 * 
 * Usage:
 *   npm run script:analyze-fidelity -- --url="https://example.com" --method="ai-transcription"
 *   npm run script:analyze-fidelity -- --test-documents --output="./fidelity-report.json"
 */

import { program } from 'commander'
import fs from 'fs/promises'
import path from 'path'
import { JSDOM } from 'jsdom'
import { 
  generateAllTestDocuments, 
  type TestDocument, 
  type ContentCheck,
  extractTextContent 
} from '../lib/testing/html-content-fidelity-generator'

interface FidelityAnalysis {
  url?: string
  testDocument?: string
  extractionMethod: string
  timestamp: string
  contentMetrics: {
    originalLength: number
    extractedLength: number
    contentRatio: number
    textSimilarity: number
    structuralSimilarity: number
  }
  preservationResults: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    criticalFailures: number
    checkDetails: Array<{
      description: string
      type: string
      passed: boolean
      critical: boolean
      expectedValue?: string | number
      actualValue?: string | number
    }>
  }
  missingElements: {
    importantMissing: string[]
    minorMissing: string[]
    unexpectedlyPresent: string[]
  }
  qualityScore: {
    overall: number // 0-100
    contentPreservation: number
    structuralIntegrity: number
    dataAccuracy: number
  }
  recommendations: string[]
}

interface ComparisonReport {
  analysisType: 'single' | 'batch' | 'comparison'
  generatedAt: string
  analyses: FidelityAnalysis[]
  summary: {
    totalTests: number
    averageQualityScore: number
    criticalFailuresTotal: number
    commonIssues: Array<{
      issue: string
      frequency: number
      impact: 'low' | 'medium' | 'high'
    }>
  }
}

/**
 * Analyze content fidelity between original and extracted HTML
 */
function analyzeContentFidelity(
  originalHtml: string, 
  extractedHtml: string, 
  checks: ContentCheck[],
  metadata: { url?: string, testDocument?: string, extractionMethod: string }
): FidelityAnalysis {
  
  // Calculate basic content metrics
  const originalText = extractTextContent(originalHtml)
  const extractedText = extractTextContent(extractedHtml)
  
  const contentRatio = extractedText.length / originalText.length
  const textSimilarity = calculateTextSimilarity(originalText, extractedText)
  const structuralSimilarity = calculateStructuralSimilarity(originalHtml, extractedHtml)

  // Run content checks
  const checkResults = runDetailedContentChecks(extractedHtml, checks)

  // Analyze missing elements
  const missingElements = analyzeMissingElements(originalHtml, extractedHtml)

  // Calculate quality scores
  const qualityScore = calculateQualityScore(
    textSimilarity,
    structuralSimilarity,
    contentRatio,
    checkResults.criticalFailures,
    checkResults.totalChecks
  )

  // Generate recommendations
  const recommendations = generateRecommendations(
    qualityScore,
    checkResults,
    missingElements,
    contentRatio
  )

  return {
    url: metadata.url,
    testDocument: metadata.testDocument,
    extractionMethod: metadata.extractionMethod,
    timestamp: new Date().toISOString(),
    contentMetrics: {
      originalLength: originalText.length,
      extractedLength: extractedText.length,
      contentRatio,
      textSimilarity,
      structuralSimilarity
    },
    preservationResults: {
      totalChecks: checkResults.totalChecks,
      passedChecks: checkResults.passedChecks,
      failedChecks: checkResults.failedChecks,
      criticalFailures: checkResults.criticalFailures,
      checkDetails: checkResults.details
    },
    missingElements,
    qualityScore,
    recommendations
  }
}

/**
 * Calculate text similarity using word overlap
 */
function calculateTextSimilarity(original: string, extracted: string): number {
  const originalWords = new Set(original.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const extractedWords = new Set(extracted.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  
  const intersection = new Set([...originalWords].filter(w => extractedWords.has(w)))
  const union = new Set([...originalWords, ...extractedWords])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Calculate structural similarity based on element types and hierarchy
 */
function calculateStructuralSimilarity(originalHtml: string, extractedHtml: string): number {
  const originalDom = new JSDOM(originalHtml)
  const extractedDom = new JSDOM(extractedHtml)
  
  const originalElements = getElementStructure(originalDom.window.document)
  const extractedElements = getElementStructure(extractedDom.window.document)
  
  originalDom.window.close()
  extractedDom.window.close()
  
  // Compare element type distributions
  const allElementTypes = new Set([...Object.keys(originalElements), ...Object.keys(extractedElements)])
  let totalElements = 0
  let matchingElements = 0
  
  for (const elementType of allElementTypes) {
    const originalCount = originalElements[elementType] || 0
    const extractedCount = extractedElements[elementType] || 0
    
    totalElements += Math.max(originalCount, extractedCount)
    matchingElements += Math.min(originalCount, extractedCount)
  }
  
  return totalElements > 0 ? matchingElements / totalElements : 0
}

/**
 * Get element structure from document
 */
function getElementStructure(document: Document): Record<string, number> {
  const elements: Record<string, number> = {}
  const allElements = document.querySelectorAll('*')
  
  allElements.forEach(element => {
    const tagName = element.tagName.toLowerCase()
    elements[tagName] = (elements[tagName] || 0) + 1
  })
  
  return elements
}

/**
 * Run detailed content checks and collect results
 */
function runDetailedContentChecks(extractedHtml: string, checks: ContentCheck[]) {
  const dom = new JSDOM(extractedHtml)
  const document = dom.window.document
  
  const details: Array<{
    description: string
    type: string
    passed: boolean
    critical: boolean
    expectedValue?: string | number
    actualValue?: string | number
  }> = []
  
  let passedChecks = 0
  let criticalFailures = 0
  
  for (const check of checks) {
    let passed = false
    let actualValue: string | number | undefined
    
    try {
      switch (check.type) {
        case 'exact_text':
          passed = extractedHtml.includes(check.expectedValue as string)
          actualValue = passed ? 'found' : 'missing'
          break
          
        case 'element_count':
          if (check.selector) {
            const elements = document.querySelectorAll(check.selector)
            actualValue = elements.length
            passed = elements.length === check.expectedValue
          }
          break
          
        case 'attribute_value':
          if (check.selector) {
            const element = document.querySelector(check.selector)
            if (element) {
              const attrMatch = check.selector.match(/\[([^=]+)="([^"]+)"\]/)
              if (attrMatch) {
                const [, attrName] = attrMatch
                actualValue = element.getAttribute(attrName) || 'null'
                passed = actualValue === check.expectedValue
              }
            } else {
              actualValue = 'element not found'
            }
          }
          break
          
        case 'mathematical_equation':
          const mathElements = document.querySelectorAll('math, [data-equation-id]').length
          const hasUnicodeSymbols = /[⟩⟨∈∪∩∀∃∑∏∫√∞≤≥≠±×÷→←↔↕]/.test(extractedHtml)
          actualValue = `${mathElements} math elements, unicode symbols: ${hasUnicodeSymbols}`
          passed = mathElements > 0 || hasUnicodeSymbols
          break
          
        default:
          actualValue = 'check type not implemented'
      }
    } catch (error) {
      actualValue = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }
    
    if (passed) {
      passedChecks++
    } else if (check.critical) {
      criticalFailures++
    }
    
    details.push({
      description: check.description,
      type: check.type,
      passed,
      critical: check.critical,
      expectedValue: check.expectedValue,
      actualValue
    })
  }
  
  dom.window.close()
  
  return {
    totalChecks: checks.length,
    passedChecks,
    failedChecks: checks.length - passedChecks,
    criticalFailures,
    details
  }
}

/**
 * Analyze missing elements between original and extracted content
 */
function analyzeMissingElements(originalHtml: string, extractedHtml: string) {
  const originalDom = new JSDOM(originalHtml)
  const extractedDom = new JSDOM(extractedHtml)
  
  const originalDoc = originalDom.window.document
  const extractedDoc = extractedDom.window.document
  
  // Important academic/content elements that should be preserved
  const importantSelectors = [
    'math', 'table', 'figure', 'blockquote', 'cite', 'code', 'pre',
    '[data-equation-id]', '[data-table-id]', '[data-figure-id]',
    '.reference-list', '.citation', '.footnote'
  ]
  
  // Elements that should be removed (peripheral content)
  const peripheralSelectors = [
    'nav', 'script', '.advertisement', '.ads', '.social-sharing',
    '.newsletter', '.popup', '.modal', '.cookie-notice'
  ]
  
  const importantMissing: string[] = []
  const unexpectedlyPresent: string[] = []
  
  // Check for missing important elements
  for (const selector of importantSelectors) {
    const originalCount = originalDoc.querySelectorAll(selector).length
    const extractedCount = extractedDoc.querySelectorAll(selector).length
    
    if (originalCount > 0 && extractedCount === 0) {
      importantMissing.push(`${selector} (${originalCount} elements missing)`)
    }
  }
  
  // Check for peripheral elements that should have been removed
  for (const selector of peripheralSelectors) {
    const extractedCount = extractedDoc.querySelectorAll(selector).length
    
    if (extractedCount > 0) {
      unexpectedlyPresent.push(`${selector} (${extractedCount} elements present)`)
    }
  }
  
  originalDom.window.close()
  extractedDom.window.close()
  
  return {
    importantMissing,
    minorMissing: [], // Could be expanded with less critical elements
    unexpectedlyPresent
  }
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(
  textSimilarity: number,
  structuralSimilarity: number,
  contentRatio: number,
  criticalFailures: number,
  totalChecks: number
): {
  overall: number
  contentPreservation: number
  structuralIntegrity: number
  dataAccuracy: number
} {
  // Content preservation: how much of the original text is preserved
  const contentPreservation = Math.min(100, textSimilarity * 100)
  
  // Structural integrity: how well the document structure is maintained
  const structuralIntegrity = Math.min(100, structuralSimilarity * 100)
  
  // Data accuracy: based on content checks passing
  const dataAccuracy = totalChecks > 0 
    ? Math.max(0, 100 - (criticalFailures / totalChecks * 100))
    : 100
  
  // Content ratio penalty (too much or too little content is problematic)
  const ratioScore = contentRatio >= 0.5 && contentRatio <= 1.5 ? 100 : 
                    contentRatio >= 0.3 && contentRatio <= 2.0 ? 80 : 60
  
  // Overall score is weighted average
  const overall = (
    contentPreservation * 0.4 +
    structuralIntegrity * 0.2 +
    dataAccuracy * 0.3 +
    ratioScore * 0.1
  )
  
  return {
    overall: Math.round(overall),
    contentPreservation: Math.round(contentPreservation),
    structuralIntegrity: Math.round(structuralIntegrity),
    dataAccuracy: Math.round(dataAccuracy)
  }
}

/**
 * Generate actionable recommendations based on analysis
 */
function generateRecommendations(
  qualityScore: { overall: number, contentPreservation: number, structuralIntegrity: number, dataAccuracy: number },
  checkResults: { criticalFailures: number, details: any[] },
  missingElements: { importantMissing: string[], unexpectedlyPresent: string[] },
  contentRatio: number
): string[] {
  const recommendations: string[] = []
  
  // Overall quality recommendations
  if (qualityScore.overall < 70) {
    recommendations.push('Overall extraction quality is below acceptable threshold. Consider reviewing extraction prompts or method.')
  }
  
  // Content preservation recommendations
  if (qualityScore.contentPreservation < 80) {
    recommendations.push('Content preservation is low. Verify that main content areas are being correctly identified and extracted.')
  }
  
  // Structural integrity recommendations
  if (qualityScore.structuralIntegrity < 70) {
    recommendations.push('Document structure is not well preserved. Review HTML element extraction and semantic markup preservation.')
  }
  
  // Data accuracy recommendations
  if (checkResults.criticalFailures > 0) {
    recommendations.push(`${checkResults.criticalFailures} critical content checks failed. Review specific failing checks and adjust extraction logic.`)
  }
  
  // Content ratio recommendations
  if (contentRatio < 0.5) {
    recommendations.push('Extracted content is significantly shorter than original. May be missing important sections.')
  } else if (contentRatio > 1.5) {
    recommendations.push('Extracted content is significantly longer than original. May be including unnecessary elements.')
  }
  
  // Missing elements recommendations
  if (missingElements.importantMissing.length > 0) {
    recommendations.push(`Important elements are missing: ${missingElements.importantMissing.slice(0, 3).join(', ')}. Adjust extraction to preserve these elements.`)
  }
  
  if (missingElements.unexpectedlyPresent.length > 0) {
    recommendations.push(`Peripheral elements were not removed: ${missingElements.unexpectedlyPresent.slice(0, 3).join(', ')}. Improve filtering logic.`)
  }
  
  // Specific check recommendations
  const failedCriticalChecks = checkResults.details.filter(detail => !detail.passed && detail.critical)
  if (failedCriticalChecks.length > 0) {
    recommendations.push(`Critical checks failing: ${failedCriticalChecks.slice(0, 2).map(c => c.description).join(', ')}.`)
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Extraction quality is good. Consider minor optimizations for edge cases.')
  }
  
  return recommendations
}

/**
 * Analyze test documents and generate comprehensive report
 */
async function analyzeTestDocuments(): Promise<ComparisonReport> {
  const testDocuments = generateAllTestDocuments()
  const analyses: FidelityAnalysis[] = []
  
  console.log(`Analyzing ${testDocuments.length} test documents...`)
  
  for (const testDoc of testDocuments) {
    console.log(`\nAnalyzing: ${testDoc.name}`)
    
    // Simulate AI extraction (in real scenario, this would call the actual API)
    const simulatedExtraction = simulateAIExtraction(testDoc.originalHtml)
    
    const analysis = analyzeContentFidelity(
      testDoc.originalHtml,
      simulatedExtraction,
      testDoc.expectedContentChecks,
      {
        testDocument: testDoc.name,
        extractionMethod: 'ai-transcription-simulated'
      }
    )
    
    analyses.push(analysis)
    
    console.log(`Quality Score: ${analysis.qualityScore.overall}/100`)
    console.log(`Critical Failures: ${analysis.preservationResults.criticalFailures}`)
  }
  
  // Generate summary
  const totalTests = analyses.length
  const averageQualityScore = analyses.reduce((sum, a) => sum + a.qualityScore.overall, 0) / totalTests
  const criticalFailuresTotal = analyses.reduce((sum, a) => sum + a.preservationResults.criticalFailures, 0)
  
  // Identify common issues
  const issueFrequency: Record<string, number> = {}
  analyses.forEach(analysis => {
    analysis.recommendations.forEach(rec => {
      const key = rec.split('.')[0] // First sentence as key
      issueFrequency[key] = (issueFrequency[key] || 0) + 1
    })
  })
  
  const commonIssues = Object.entries(issueFrequency)
    .map(([issue, frequency]) => ({
      issue,
      frequency,
      impact: frequency > totalTests * 0.5 ? 'high' as const : 
              frequency > totalTests * 0.25 ? 'medium' as const : 'low' as const
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)
  
  return {
    analysisType: 'batch',
    generatedAt: new Date().toISOString(),
    analyses,
    summary: {
      totalTests,
      averageQualityScore: Math.round(averageQualityScore),
      criticalFailuresTotal,
      commonIssues
    }
  }
}

/**
 * Simple AI extraction simulation for testing
 */
function simulateAIExtraction(originalHtml: string): string {
  const dom = new JSDOM(originalHtml)
  const document = dom.window.document
  
  // Remove peripheral elements
  const toRemove = ['script', 'nav', '.advertisement', '.ads', '.social-sharing', '.site-header', '.site-footer']
  toRemove.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => el.remove())
  })
  
  // Extract main content
  const mainContent = document.querySelector('main, article, .article-content')
  if (mainContent) {
    const result = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Extracted Content</title>
</head>
<body>
    ${mainContent.outerHTML}
</body>
</html>`
    dom.window.close()
    return result
  }
  
  const result = document.documentElement.outerHTML
  dom.window.close()
  return result
}

/**
 * Main CLI program
 */
async function main() {
  program
    .name('analyze-content-fidelity')
    .description('Analyze content fidelity of HTML extraction')
    .version('1.0.0')

  program
    .command('test-documents')
    .description('Analyze all test documents')
    .option('-o, --output <file>', 'Output file for JSON report')
    .option('--format <format>', 'Output format: json, markdown', 'json')
    .action(async (options) => {
      try {
        const report = await analyzeTestDocuments()
        
        if (options.output) {
          if (options.format === 'markdown') {
            const markdown = generateMarkdownReport(report)
            await fs.writeFile(options.output, markdown)
          } else {
            await fs.writeFile(options.output, JSON.stringify(report, null, 2))
          }
          console.log(`Report saved to ${options.output}`)
        } else {
          console.log('\n=== CONTENT FIDELITY ANALYSIS REPORT ===')
          console.log(`Total Tests: ${report.summary.totalTests}`)
          console.log(`Average Quality Score: ${report.summary.averageQualityScore}/100`)
          console.log(`Total Critical Failures: ${report.summary.criticalFailuresTotal}`)
          
          if (report.summary.commonIssues.length > 0) {
            console.log('\nCommon Issues:')
            report.summary.commonIssues.forEach(issue => {
              console.log(`- ${issue.issue} (${issue.frequency}/${report.summary.totalTests} tests, ${issue.impact} impact)`)
            })
          }
        }
      } catch (error) {
        console.error('Error analyzing test documents:', error)
        process.exit(1)
      }
    })

  await program.parseAsync()
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report: ComparisonReport): string {
  let markdown = `# Content Fidelity Analysis Report

Generated: ${new Date(report.generatedAt).toLocaleString()}

## Summary

- **Total Tests:** ${report.summary.totalTests}
- **Average Quality Score:** ${report.summary.averageQualityScore}/100
- **Total Critical Failures:** ${report.summary.criticalFailuresTotal}

## Common Issues

${report.summary.commonIssues.map(issue => 
  `- **${issue.issue}** (${issue.frequency}/${report.summary.totalTests} tests, ${issue.impact} impact)`
).join('\n')}

## Detailed Results

${report.analyses.map(analysis => `
### ${analysis.testDocument || analysis.url}

- **Quality Score:** ${analysis.qualityScore.overall}/100
- **Content Preservation:** ${analysis.qualityScore.contentPreservation}/100
- **Structural Integrity:** ${analysis.qualityScore.structuralIntegrity}/100
- **Data Accuracy:** ${analysis.qualityScore.dataAccuracy}/100
- **Critical Failures:** ${analysis.preservationResults.criticalFailures}
- **Content Ratio:** ${(analysis.contentMetrics.contentRatio * 100).toFixed(1)}%

**Recommendations:**
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}
`).join('\n')}
`

  return markdown
}

if (require.main === module) {
  main()
}

export { analyzeContentFidelity, type FidelityAnalysis, type ComparisonReport }