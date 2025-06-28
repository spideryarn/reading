/**
 * PDF Processing Evaluation Test Suite
 * 
 * Implements comprehensive testing of PDF-to-HTML conversion quality using
 * existing PDF test files and both vision-based and traditional processing methods.
 */

import fs from 'fs/promises'
import path from 'path'
import { 
  evaluateProcessingQuality, 
  generateEvaluationReport,
  type EvaluationResult,
  type EvaluationConfig,
  DEFAULT_EVALUATION_CONFIG
} from './pdf-evaluation-framework'

/**
 * Test document configuration
 */
export interface TestDocument {
  /** Document identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Path to PDF file */
  pdfPath: string
  /** Expected HTML output (if available) */
  expectedHtmlPath?: string
  /** Document category for analysis */
  category: 'academic-paper' | 'textbook' | 'article'
  /** Importance weight for scoring */
  weight: number
  /** Special characteristics */
  characteristics: string[]
  /** Processing time expectations */
  expectedProcessingTimeMs?: number
}

/**
 * Test suite configuration
 */
export const TEST_DOCUMENTS: TestDocument[] = [
  {
    id: 'academic-paper-full',
    name: 'Statistical Learning Textbook',
    pdfPath: 'static/examples/2009_Book_TheElementsOfStatisticalLearning.pdf',
    category: 'textbook',
    weight: 2.0,
    characteristics: ['complex-math', 'figures', 'tables', 'cross-references'],
    expectedProcessingTimeMs: 120000 // 2 minutes for large textbook
  },
  {
    id: 'academic-paper-arxiv',
    name: 'arXiv Paper - Full',
    pdfPath: 'static/examples/2105.10461v2.pdf',
    category: 'academic-paper',
    weight: 2.0,
    characteristics: ['math-notation', 'figures', 'citations', 'references'],
    expectedProcessingTimeMs: 60000 // 1 minute
  },
  {
    id: 'academic-paper-cropped',
    name: 'arXiv Paper - Cropped',
    pdfPath: 'static/examples/2105.10461v2_cropped.pdf',
    category: 'academic-paper',
    weight: 1.5,
    characteristics: ['math-notation', 'concise-content'],
    expectedProcessingTimeMs: 15000 // 15 seconds
  },
  {
    id: 'academic-paper-medium',
    name: 'arXiv Paper - Medium Length',
    pdfPath: 'static/examples/2105.10461v2_cropped_longer.pdf',
    category: 'academic-paper',
    weight: 1.8,
    characteristics: ['math-notation', 'figures', 'medium-length'],
    expectedProcessingTimeMs: 30000 // 30 seconds
  }
]

/**
 * Processing method configuration
 */
export interface ProcessingMethod {
  /** Method identifier */
  id: string
  /** Human-readable name */
  name: string
  /** API endpoint to use */
  endpoint: string
  /** Whether this method requires pre-converted images */
  requiresImages: boolean
  /** Expected relative performance */
  expectedSpeed: 'fast' | 'medium' | 'slow'
  /** Expected quality level */
  expectedQuality: 'high' | 'medium' | 'basic'
}

export const PROCESSING_METHODS: ProcessingMethod[] = [
  {
    id: 'vision-ai',
    name: 'Vision-based AI Processing (v2)',
    endpoint: '/api/upload-pdf-vision',
    requiresImages: true,
    expectedSpeed: 'slow',
    expectedQuality: 'high'
  },
  {
    id: 'ai-transcription',
    name: 'AI Transcription (v1)',
    endpoint: '/api/upload-pdf',
    requiresImages: false,
    expectedSpeed: 'medium',
    expectedQuality: 'medium'
  }
]

/**
 * Evaluation runner for PDF processing methods
 */
export class EvaluationRunner {
  private baseUrl: string
  private config: EvaluationConfig
  private results: EvaluationResult[] = []

  constructor(
    baseUrl: string = 'http://localhost:3000',
    config: EvaluationConfig = DEFAULT_EVALUATION_CONFIG
  ) {
    this.baseUrl = baseUrl
    this.config = config
  }

  /**
   * Process a PDF file using the specified method
   */
  private async processPdfWithMethod(
    testDoc: TestDocument,
    method: ProcessingMethod
  ): Promise<{ html: string; processingTimeMs: number }> {
    const startTime = Date.now()
    
    try {
      // Read PDF file
      const pdfPath = path.join(process.cwd(), testDoc.pdfPath)
      const pdfBuffer = await fs.readFile(pdfPath)
      const pdfFile = new File([pdfBuffer], path.basename(pdfPath), { type: 'application/pdf' })
      
      // Create form data
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('provider', 'gemini') // Use Gemini for cost efficiency
      formData.append('isPublic', 'false')
      
      // Handle vision-AI specific requirements
      if (method.requiresImages) {
        // For vision-AI, we need to convert PDF to images first
        // This would normally be done in the browser, but for testing we'll simulate
        console.log(`Note: Vision-AI method would require PDF-to-image conversion for ${testDoc.name}`)
        // For now, we'll use a placeholder or skip this method in server-side testing
        throw new Error('Vision-AI method requires browser environment for PDF-to-image conversion')
      }
      
      // Make API request
      const response = await fetch(`${this.baseUrl}${method.endpoint}`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(`Processing failed: ${result.message}`)
      }
      
      const processingTimeMs = Date.now() - startTime
      
      // Extract HTML from result
      const html = result.document?.content || result.html || ''
      
      return { html, processingTimeMs }
      
    } catch (error) {
      const processingTimeMs = Date.now() - startTime
      throw new Error(`Processing failed after ${processingTimeMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate expected HTML for comparison (placeholder implementation)
   */
  private async generateExpectedHtml(testDoc: TestDocument): Promise<string> {
    // If we have a pre-defined expected HTML file, use it
    if (testDoc.expectedHtmlPath) {
      try {
        const expectedPath = path.join(process.cwd(), testDoc.expectedHtmlPath)
        return await fs.readFile(expectedPath, 'utf-8')
      } catch (error) {
        console.warn(`Could not load expected HTML for ${testDoc.id}: ${error}`)
      }
    }
    
    // For now, we'll use a basic HTML structure as baseline
    // In a real implementation, this would be manually curated gold standard HTML
    return `
      <article>
        <header>
          <h1>${testDoc.name}</h1>
        </header>
        <main>
          <p>Expected content structure for ${testDoc.category}</p>
          ${testDoc.characteristics.includes('math-notation') ? '<div class="math">Mathematical notation expected</div>' : ''}
          ${testDoc.characteristics.includes('figures') ? '<figure><img alt="Expected figure"/><figcaption>Figure caption</figcaption></figure>' : ''}
          ${testDoc.characteristics.includes('tables') ? '<table><tr><td>Expected table data</td></tr></table>' : ''}
          ${testDoc.characteristics.includes('citations') ? '<cite>Expected citations</cite>' : ''}
        </main>
      </article>
    `
  }

  /**
   * Run evaluation for a single document and method
   */
  async evaluateDocument(
    testDoc: TestDocument,
    method: ProcessingMethod
  ): Promise<EvaluationResult> {
    console.log(`Evaluating ${testDoc.name} with ${method.name}...`)
    
    try {
      // Process document
      const { html: actualHtml, processingTimeMs } = await this.processPdfWithMethod(testDoc, method)
      
      // Get expected HTML for comparison
      const expectedHtml = await this.generateExpectedHtml(testDoc)
      
      // Get document metadata
      const pdfPath = path.join(process.cwd(), testDoc.pdfPath)
      const pdfStats = await fs.stat(pdfPath)
      
      const metadata = {
        sourceType: 'pdf' as const,
        fileSize: pdfStats.size,
        provider: 'gemini'
      }
      
      // Run comprehensive evaluation
      const result = evaluateProcessingQuality(
        expectedHtml,
        actualHtml,
        processingTimeMs,
        metadata,
        method.id,
        this.config
      )
      
      // Override document ID with test document info
      result.documentId = testDoc.id
      
      return result
      
    } catch (error) {
      console.error(`Evaluation failed for ${testDoc.name} with ${method.name}:`, error)
      
      // Return failed evaluation result
      return {
        documentId: testDoc.id,
        processingMethod: method.id,
        metrics: [],
        overallScore: 0,
        passed: false,
        processingTime: 0,
        timestamp: new Date(),
        metadata: {
          sourceType: 'pdf',
          fileSize: 0
        }
      }
    }
  }

  /**
   * Run comprehensive evaluation across all documents and methods
   */
  async runFullEvaluation(): Promise<{
    results: EvaluationResult[]
    report: string
    summary: {
      totalTests: number
      passedTests: number
      passRate: number
      averageScore: number
      methodComparison: Record<string, { avgScore: number; passRate: number; testCount: number }>
    }
  }> {
    console.log('Starting comprehensive PDF processing evaluation...')
    
    const results: EvaluationResult[] = []
    
    // Test each document with each method
    for (const testDoc of TEST_DOCUMENTS) {
      for (const method of PROCESSING_METHODS) {
        try {
          const result = await this.evaluateDocument(testDoc, method)
          results.push(result)
          
          console.log(`✅ ${testDoc.name} + ${method.name}: ${(result.overallScore * 100).toFixed(1)}% (${result.passed ? 'PASS' : 'FAIL'})`)
          
        } catch (error) {
          console.error(`❌ ${testDoc.name} + ${method.name}: Evaluation failed`)
        }
      }
    }
    
    // Generate summary statistics
    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const passRate = totalTests > 0 ? passedTests / totalTests : 0
    const averageScore = totalTests > 0 ? results.reduce((sum, r) => sum + r.overallScore, 0) / totalTests : 0
    
    // Method comparison
    const methodComparison = PROCESSING_METHODS.reduce((acc, method) => {
      const methodResults = results.filter(r => r.processingMethod === method.id)
      if (methodResults.length > 0) {
        acc[method.id] = {
          avgScore: methodResults.reduce((sum, r) => sum + r.overallScore, 0) / methodResults.length,
          passRate: methodResults.filter(r => r.passed).length / methodResults.length,
          testCount: methodResults.length
        }
      }
      return acc
    }, {} as Record<string, { avgScore: number; passRate: number; testCount: number }>)
    
    // Generate detailed report
    const report = generateEvaluationReport(results)
    
    this.results = results
    
    return {
      results,
      report,
      summary: {
        totalTests,
        passedTests,
        passRate,
        averageScore,
        methodComparison
      }
    }
  }

  /**
   * Save evaluation results to file
   */
  async saveResults(outputPath: string): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      testDocuments: TEST_DOCUMENTS,
      processingMethods: PROCESSING_METHODS
    }
    
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2))
    console.log(`Evaluation results saved to ${outputPath}`)
  }
}

/**
 * Quick evaluation runner for single document testing
 */
export async function evaluateSingleDocument(
  documentId: string,
  methodId: string,
  baseUrl: string = 'http://localhost:3000'
): Promise<EvaluationResult | null> {
  const testDoc = TEST_DOCUMENTS.find(doc => doc.id === documentId)
  const method = PROCESSING_METHODS.find(m => m.id === methodId)
  
  if (!testDoc || !method) {
    console.error(`Document ${documentId} or method ${methodId} not found`)
    return null
  }
  
  const runner = new EvaluationRunner(baseUrl)
  return await runner.evaluateDocument(testDoc, method)
}