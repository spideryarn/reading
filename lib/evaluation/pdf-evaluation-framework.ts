/**
 * PDF Processing Evaluation Framework
 * 
 * Implements comprehensive evaluation metrics for PDF-to-HTML conversion quality,
 * based on research from OmniDocBench and academic evaluation frameworks.
 * 
 * Key evaluation dimensions:
 * - Text extraction accuracy (Normalized Edit Distance)
 * - Structural element preservation
 * - Academic content quality (citations, equations, figures)
 * - Processing performance metrics
 */

import { distance as levenshteinDistance } from 'fastest-levenshtein'
import * as cheerio from 'cheerio'

/**
 * Result of a single evaluation metric
 */
export interface MetricResult {
  /** Metric name */
  name: string
  /** Score between 0 and 1 (1 = perfect) */
  score: number
  /** Detailed explanation of the score */
  details: string
  /** Whether this metric passed the threshold */
  passed: boolean
  /** Threshold used for pass/fail */
  threshold: number
}

/**
 * Complete evaluation result for a single document
 */
export interface EvaluationResult {
  /** Document identifier */
  documentId: string
  /** Processing method used (vision-ai, ai-transcription, etc.) */
  processingMethod: string
  /** Individual metric results */
  metrics: MetricResult[]
  /** Overall weighted score */
  overallScore: number
  /** Whether all critical metrics passed */
  passed: boolean
  /** Processing time in milliseconds */
  processingTime: number
  /** Timestamp of evaluation */
  timestamp: Date
  /** Additional metadata */
  metadata: {
    sourceType: 'pdf' | 'html' | 'url'
    pageCount?: number
    fileSize?: number
    provider?: string
  }
}

/**
 * Configuration for evaluation metrics
 */
export interface EvaluationConfig {
  /** Text similarity threshold (0-1) */
  textSimilarityThreshold: number
  /** Structural preservation threshold (0-1) */
  structuralThreshold: number
  /** Academic content threshold (0-1) */
  academicThreshold: number
  /** Processing time threshold in milliseconds */
  performanceThreshold: number
  /** Weight for each metric category */
  weights: {
    textSimilarity: number
    structural: number
    academic: number
    performance: number
  }
}

/**
 * Default evaluation configuration based on research
 */
export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  textSimilarityThreshold: 0.85,
  structuralThreshold: 0.80,
  academicThreshold: 0.90,
  performanceThreshold: 30000, // 30 seconds
  weights: {
    textSimilarity: 0.30,
    structural: 0.25,
    academic: 0.35,
    performance: 0.10
  }
}

/**
 * Text similarity metric using Normalized Edit Distance
 */
export function calculateTextSimilarity(
  expected: string,
  actual: string
): MetricResult {
  const threshold = DEFAULT_EVALUATION_CONFIG.textSimilarityThreshold
  
  // Normalize text for comparison
  const normalizeText = (text: string) => 
    text.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
  
  const normalizedExpected = normalizeText(expected)
  const normalizedActual = normalizeText(actual)
  
  // Calculate Normalized Edit Distance
  const editDistance = levenshteinDistance(normalizedExpected, normalizedActual)
  const maxLength = Math.max(normalizedExpected.length, normalizedActual.length)
  const similarity = maxLength > 0 ? 1 - (editDistance / maxLength) : 1
  
  return {
    name: 'Text Similarity',
    score: similarity,
    details: `Edit distance: ${editDistance}, Max length: ${maxLength}, Similarity: ${(similarity * 100).toFixed(1)}%`,
    passed: similarity >= threshold,
    threshold
  }
}

/**
 * Structural preservation metric for HTML elements
 */
export function calculateStructuralPreservation(
  expectedHtml: string,
  actualHtml: string
): MetricResult {
  const threshold = DEFAULT_EVALUATION_CONFIG.structuralThreshold
  
  try {
    const $expected = cheerio.load(expectedHtml)
    const $actual = cheerio.load(actualHtml)
    
    // Count structural elements
    const structuralElements = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'ul', 'ol', 'li',
      'p', 'div', 'section', 'article',
      'figure', 'figcaption',
      'blockquote', 'cite'
    ]
    
    const metrics: { [key: string]: number } = {}
    let relevantElements = 0
    
    for (const element of structuralElements) {
      const expectedCount = $expected(element).length
      const actualCount = $actual(element).length
      
      // Only include elements that are expected or actually present
      if (expectedCount > 0 || actualCount > 0) {
        relevantElements++
        if (expectedCount > 0) {
          metrics[element] = Math.min(actualCount / expectedCount, 1)
        } else {
          metrics[element] = 0 // Penalty for extra elements when none expected
        }
      }
    }
    
    // Calculate average over relevant elements only
    const score = relevantElements > 0 
      ? Object.values(metrics).reduce((sum, val) => sum + val, 0) / relevantElements
      : 1 // Perfect score if no structural elements are relevant
    
    const elementCounts = structuralElements
      .map(el => `${el}: ${$expected(el).length}→${$actual(el).length}`)
      .filter(desc => !desc.includes('0→0'))
      .join(', ')
    
    return {
      name: 'Structural Preservation',
      score,
      details: `Element preservation: ${elementCounts}`,
      passed: score >= threshold,
      threshold
    }
  } catch (error) {
    return {
      name: 'Structural Preservation',
      score: 0,
      details: `HTML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      passed: false,
      threshold
    }
  }
}

/**
 * Academic content preservation metric
 */
export function calculateAcademicContentQuality(
  expectedHtml: string,
  actualHtml: string
): MetricResult {
  const threshold = DEFAULT_EVALUATION_CONFIG.academicThreshold
  
  try {
    const $expected = cheerio.load(expectedHtml)
    const $actual = cheerio.load(actualHtml)
    
    const checks = {
      // Citations and references
      citations: {
        expected: $expected('[class*="citation"], [class*="ref"], a[href*="doi"]').length,
        actual: $actual('[class*="citation"], [class*="ref"], a[href*="doi"]').length
      },
      
      // Mathematical content
      mathematics: {
        expected: $expected('math, [class*="math"], [class*="equation"], .katex').length,
        actual: $actual('math, [class*="math"], [class*="equation"], .katex').length
      },
      
      // Figures and images
      figures: {
        expected: $expected('figure, img, [class*="figure"]').length,
        actual: $actual('figure, img, [class*="figure"]').length
      },
      
      // Tables with data
      tables: {
        expected: $expected('table').length,
        actual: $actual('table').length
      },
      
      // Footnotes
      footnotes: {
        expected: $expected('[class*="footnote"], [class*="note"], sup a').length,
        actual: $actual('[class*="footnote"], [class*="note"], sup a').length
      }
    }
    
    // Calculate preservation scores
    const scores: { [key: string]: number } = {}
    for (const [category, counts] of Object.entries(checks)) {
      if (counts.expected > 0) {
        scores[category] = Math.min(counts.actual / counts.expected, 1)
      } else if (counts.actual === 0) {
        scores[category] = 1
      } else {
        scores[category] = 0.5 // Partial credit for extra academic content
      }
    }
    
    const score = Object.values(scores).reduce((sum, val) => sum + val, 0) / Object.keys(scores).length
    
    const details = Object.entries(checks)
      .map(([cat, counts]) => `${cat}: ${counts.expected}→${counts.actual}`)
      .join(', ')
    
    return {
      name: 'Academic Content Quality',
      score,
      details: `Academic elements: ${details}`,
      passed: score >= threshold,
      threshold
    }
  } catch (error) {
    return {
      name: 'Academic Content Quality',
      score: 0,
      details: `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      passed: false,
      threshold
    }
  }
}

/**
 * Processing performance metric
 */
export function calculatePerformanceMetric(
  processingTimeMs: number
): MetricResult {
  const threshold = DEFAULT_EVALUATION_CONFIG.performanceThreshold
  
  // Score based on how much faster than threshold
  const score = Math.max(0, Math.min(1, (threshold - processingTimeMs) / threshold + 0.5))
  
  return {
    name: 'Processing Performance',
    score,
    details: `Processing time: ${processingTimeMs}ms (threshold: ${threshold}ms)`,
    passed: processingTimeMs <= threshold,
    threshold: threshold / 1000 // Convert to seconds for display
  }
}

/**
 * Comprehensive evaluation of PDF processing quality
 */
export function evaluateProcessingQuality(
  expectedHtml: string,
  actualHtml: string,
  processingTimeMs: number,
  metadata: EvaluationResult['metadata'],
  processingMethod: string,
  config: EvaluationConfig = DEFAULT_EVALUATION_CONFIG
): EvaluationResult {
  // Calculate individual metrics
  const textSimilarity = calculateTextSimilarity(expectedHtml, actualHtml)
  const structuralPreservation = calculateStructuralPreservation(expectedHtml, actualHtml)
  const academicQuality = calculateAcademicContentQuality(expectedHtml, actualHtml)
  const performance = calculatePerformanceMetric(processingTimeMs)
  
  const metrics = [textSimilarity, structuralPreservation, academicQuality, performance]
  
  // Calculate weighted overall score
  const overallScore = (
    textSimilarity.score * config.weights.textSimilarity +
    structuralPreservation.score * config.weights.structural +
    academicQuality.score * config.weights.academic +
    performance.score * config.weights.performance
  )
  
  // Check if all critical metrics passed
  const criticalMetrics = [textSimilarity, structuralPreservation, academicQuality]
  const passed = criticalMetrics.every(metric => metric.passed)
  
  return {
    documentId: metadata.sourceType === 'pdf' ? 'pdf-document' : 'document',
    processingMethod,
    metrics,
    overallScore,
    passed,
    processingTime: processingTimeMs,
    timestamp: new Date(),
    metadata
  }
}

/**
 * Generate evaluation report summary
 */
export function generateEvaluationReport(results: EvaluationResult[]): string {
  if (results.length === 0) {
    return 'No evaluation results to report.'
  }
  
  const totalResults = results.length
  const passedResults = results.filter(r => r.passed).length
  const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / totalResults
  const averageTime = results.reduce((sum, r) => sum + r.processingTime, 0) / totalResults
  
  // Method comparison
  const methodStats = results.reduce((acc, result) => {
    const method = result.processingMethod
    if (!acc[method]) {
      acc[method] = { count: 0, totalScore: 0, passed: 0 }
    }
    acc[method].count++
    acc[method].totalScore += result.overallScore
    if (result.passed) acc[method].passed++
    return acc
  }, {} as Record<string, { count: number; totalScore: number; passed: number }>)
  
  let report = `# PDF Processing Evaluation Report\n\n`
  report += `**Overall Results:**\n`
  report += `- Total evaluations: ${totalResults}\n`
  report += `- Passed evaluations: ${passedResults} (${(passedResults/totalResults*100).toFixed(1)}%)\n`
  report += `- Average score: ${(averageScore*100).toFixed(1)}%\n`
  report += `- Average processing time: ${(averageTime/1000).toFixed(1)}s\n\n`
  
  report += `**Method Comparison:**\n`
  for (const [method, stats] of Object.entries(methodStats)) {
    const avgScore = stats.totalScore / stats.count
    const passRate = stats.passed / stats.count
    report += `- ${method}: ${(avgScore*100).toFixed(1)}% avg score, ${(passRate*100).toFixed(1)}% pass rate (${stats.count} tests)\n`
  }
  
  report += `\n**Detailed Results:**\n`
  results.forEach((result, index) => {
    report += `\n### Test ${index + 1}: ${result.processingMethod}\n`
    report += `- Overall Score: ${(result.overallScore*100).toFixed(1)}% ${result.passed ? '✅' : '❌'}\n`
    report += `- Processing Time: ${(result.processingTime/1000).toFixed(1)}s\n`
    result.metrics.forEach(metric => {
      report += `- ${metric.name}: ${(metric.score*100).toFixed(1)}% ${metric.passed ? '✅' : '❌'}\n`
      report += `  ${metric.details}\n`
    })
  })
  
  return report
}