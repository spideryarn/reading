/**
 * @jest-environment node
 */
/**
 * Static Content Fidelity Test
 * 
 * Tests real AI extraction against a static complex document to ensure
 * content is preserved accurately without modification or loss.
 */

import { POST } from '../extract-url/route'
import { createClient } from '@/lib/supabase/client'
import { DocumentService } from '@/lib/services/database/documents'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import { getTestNamespace, createTestEmail, createTestMetadata } from '@/lib/testing/test-isolation-utils'
import { JSDOM } from 'jsdom'

// Mock authentication to return a test user
jest.mock('@/lib/auth/server-auth', () => ({
  validateAuth: jest.fn()
}))

// Mock slug generation for predictable results
jest.mock('@/lib/utils/slug', () => ({
  generateSlug: jest.fn().mockImplementation((text: string) => text.toLowerCase().replace(/\s+/g, '-').slice(0, 50)),
  generateHtmlFilename: jest.fn().mockImplementation((url: string) => {
    const domain = new URL(url).hostname.replace(/\./g, '-')
    return `${domain}-${Date.now()}.html`
  })
}))

// Mock the server Supabase client to use the browser client for tests
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => {
    // Dynamic import required for Jest mocking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@/lib/supabase/client')
    return createClient()
  }
}))

// Mock AI call service to avoid database model requirements
jest.mock('@/lib/services/database/ai-calls', () => ({
  AiCallService: jest.fn().mockImplementation(() => ({
    startCall: jest.fn().mockResolvedValue('mock-ai-call-id'),
    updateCall: jest.fn().mockResolvedValue(undefined),
    completeCall: jest.fn().mockResolvedValue(undefined),
    getModelUuidByProviderAndId: jest.fn().mockResolvedValue('mock-model-uuid')
  }))
}))

// Mock global fetch to return our test document
global.fetch = jest.fn()

import { validateAuth } from '@/lib/auth/server-auth'

const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('Static Content Fidelity Test', () => {
  const namespace = getTestNamespace('static-fidelity')
  let supabase: SupabaseClient<Database>
  let testUserId: string

  // Static test document with complex academic content
  const testDocumentHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quantum Computing Breakthrough: Fault-Tolerant Error Correction</title>
    <meta name="description" content="Research paper on quantum error correction">
</head>
<body>
    <header class="site-header">
        <nav>Site Navigation</nav>
        <div class="ads">Advertisement Block</div>
    </header>
    
    <main class="article-content">
        <article>
            <header>
                <h1>Quantum Computing Breakthrough: Fault-Tolerant Error Correction</h1>
                <div class="authors">
                    <span>Dr. Alice Johnson<sup>1,2</sup></span>,
                    <span>Prof. Robert Chen<sup>1</sup></span>
                </div>
                <div class="metadata">
                    <span class="date">Published: March 15, 2024</span>
                    <span class="doi">DOI: 10.1038/nature.2024.12345</span>
                </div>
            </header>

            <section class="abstract">
                <h2>Abstract</h2>
                <p>
                    We demonstrate a fault-tolerant quantum error correction protocol achieving
                    <strong>99.9% fidelity</strong> in logical qubit operations. The surface code
                    implementation shows error rates below the <strong>10⁻⁴ threshold</strong>
                    required for practical quantum computing.
                </p>
            </section>

            <section class="methodology">
                <h2>1. Theoretical Framework</h2>
                
                <h3>1.1 Stabilizer Formalism</h3>
                <p>
                    The stabilizer group S = ⟨g₁, g₂, ..., gₙ⟩ defines the code space where
                    logical states |ψₗ⟩ satisfy gᵢ|ψₗ⟩ = |ψₗ⟩ for all stabilizers gᵢ ∈ S.
                </p>

                <math xmlns="http://www.w3.org/1998/Math/MathML" display="block" data-equation-id="pauli-commutation">
                    <mrow>
                        <mo>[</mo>
                        <msub><mi>σ</mi><mi>i</mi></msub>
                        <mo>,</mo>
                        <msub><mi>σ</mi><mi>j</mi></msub>
                        <mo>]</mo>
                        <mo>=</mo>
                        <mn>0</mn>
                        <mspace width="1em"/>
                        <mtext>for all</mtext>
                        <mspace width="0.5em"/>
                        <mi>i</mi>
                        <mo>,</mo>
                        <mi>j</mi>
                    </mrow>
                </math>

                <h3>1.2 Error Threshold Analysis</h3>
                <p>The following table summarizes error thresholds for different codes:</p>

                <table data-table-id="error-thresholds" class="results-table">
                    <caption>
                        <strong>Table 1:</strong> Error threshold comparison for quantum codes
                    </caption>
                    <thead>
                        <tr>
                            <th>Code Type</th>
                            <th>Distance</th>
                            <th>Threshold (%)</th>
                            <th>Physical Qubits</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-code="surface">
                            <td>Surface Code</td>
                            <td data-distance="13">13</td>
                            <td data-threshold="1.1">1.1</td>
                            <td data-qubits="169">169</td>
                        </tr>
                        <tr data-code="color">
                            <td>Color Code</td>
                            <td data-distance="15">15</td>
                            <td data-threshold="1.9">1.9</td>
                            <td data-qubits="225">225</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="results">
                <h2>2. Experimental Results</h2>
                
                <blockquote data-quote-id="main-finding">
                    "This represents a quantum leap forward in error correction capabilities,
                    bringing us significantly closer to fault-tolerant quantum computing."
                    <footer>
                        <cite data-ref="johnson2024">Dr. Alice Johnson, Lead Researcher</cite>
                    </footer>
                </blockquote>

                <figure data-figure-id="fidelity-plot">
                    <img src="/images/fidelity-vs-distance.png" alt="Logical fidelity vs code distance" />
                    <figcaption>
                        <strong>Figure 1:</strong> Logical qubit fidelity as a function of code distance.
                        Error bars represent standard deviation over 1000 trials.
                    </figcaption>
                </figure>

                <h3>2.1 Performance Metrics</h3>
                <ul>
                    <li><strong>Logical error rate:</strong> 10⁻⁶ per gate operation</li>
                    <li><strong>Syndrome extraction time:</strong> 2.3 ± 0.1 μs</li>
                    <li><strong>Correction fidelity:</strong> 99.97 ± 0.02%</li>
                </ul>
            </section>

            <section class="code-implementation">
                <h2>3. Implementation</h2>
                <p>Core stabilizer measurement routine:</p>
                
                <pre data-language="python" class="code-block"><code>def measure_stabilizers(qubits, stabilizer_generators):
    """
    Measure all stabilizer generators for error detection.
    
    Args:
        qubits: List of physical qubits in the code
        stabilizer_generators: Pauli operators defining the code
    
    Returns:
        syndrome: Binary vector indicating detected errors
    """
    syndrome = []
    for generator in stabilizer_generators:
        # Apply measurement circuit for this stabilizer
        result = measure_pauli_operator(qubits, generator)
        syndrome.append(result)
    
    return syndrome</code></pre>
            </section>

            <section class="references">
                <h2>References</h2>
                <ol class="reference-list">
                    <li data-ref="gottesman1997">
                        Gottesman, D. (1997). Stabilizer codes and quantum error correction.
                        <em>arXiv preprint quant-ph/9705052</em>.
                    </li>
                    <li data-ref="fowler2012">
                        Fowler, A. G., et al. (2012). Surface codes for practical quantum computation.
                        <em>Physical Review A</em>, 86(3), 032324.
                    </li>
                </ol>
            </section>
        </article>
    </main>

    <aside class="sidebar">
        <div class="newsletter">
            <h3>Subscribe to Updates</h3>
            <form>
                <input type="email" placeholder="Your email">
                <button>Subscribe</button>
            </form>
        </div>
        <script>trackPageViews()</script>
    </aside>

    <footer class="site-footer">
        <p>&copy; 2024 Quantum Research Institute</p>
    </footer>
</body>
</html>`

  beforeAll(async () => {
    // Set up real database connection
    supabase = createClient()
    
    // Create a test user profile
    testUserId = `test-user-${namespace}`
    const testEmail = createTestEmail(namespace, 'static-fidelity')
    
    await supabase.from('profiles').insert({
      id: testUserId,
      email: testEmail,
      full_name: 'Static Fidelity Test User',
      metadata: createTestMetadata(namespace)
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authentication to return our test user
    mockValidateAuth.mockResolvedValue({ 
      id: testUserId, 
      email: createTestEmail(namespace, 'static-fidelity') 
    })

    // Mock fetch to return our test document
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({
        'content-type': 'text/html; charset=utf-8'
      }),
      text: async () => testDocumentHtml
    } as Response)
  })

  afterAll(async () => {
    // Clean up test data
    await supabase.from('documents').delete().eq('user_id', testUserId)
    await supabase.from('ai_calls').delete().contains('input_data', { test_namespace: namespace })
    await supabase.from('profiles').delete().eq('id', testUserId)
  })

  const createRequest = (body: Record<string, unknown>): Request => {
    return new Request('http://localhost:3000/api/extract-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
  }

  describe('Real AI Extraction Fidelity', () => {
    it('should preserve critical academic content using real AI extraction', async () => {
      // Debug environment variables
      console.log('Environment check:')
      console.log('- NODE_ENV:', process.env.NODE_ENV)
      console.log('- LLM_MODEL:', process.env.LLM_MODEL)
      console.log('- ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)
      console.log('- ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length)
      
      const testUrl = 'https://example.com/quantum-paper'
      
      const request = createRequest({
        url: testUrl,
        method: 'ai-transcription'
      })

      const response = await POST(request)
      const result = await response.json()

      // Verify successful extraction
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.document).toBeDefined()

      // Get the extracted HTML content
      const extractedHtml = result.document.content_html

      // Parse both original and extracted content for comparison
      const originalDom = new JSDOM(testDocumentHtml)
      const extractedDom = new JSDOM(extractedHtml)
      
      const originalDoc = originalDom.window.document
      const extractedDoc = extractedDom.window.document

      // Critical Content Preservation Tests
      
      // 1. Main title must be preserved exactly
      const originalTitle = originalDoc.querySelector('h1')?.textContent
      const extractedTitle = extractedDoc.querySelector('h1')?.textContent
      expect(extractedTitle).toBe(originalTitle)
      expect(extractedTitle).toBe('Quantum Computing Breakthrough: Fault-Tolerant Error Correction')

      // 2. Author information must be preserved
      expect(extractedHtml).toContain('Dr. Alice Johnson')
      expect(extractedHtml).toContain('Prof. Robert Chen')

      // 3. Critical metadata (DOI) must be preserved
      expect(extractedHtml).toContain('DOI: 10.1038/nature.2024.12345')

      // 4. Key numerical data must be preserved exactly
      expect(extractedHtml).toContain('99.9% fidelity')
      expect(extractedHtml).toContain('10⁻⁴ threshold')

      // 5. Mathematical notation must be preserved
      expect(extractedHtml).toContain('gᵢ|ψₗ⟩ = |ψₗ⟩')
      
      // 6. Mathematical equations (MathML) should be preserved
      const originalMathElements = originalDoc.querySelectorAll('math[data-equation-id]')
      const extractedMathElements = extractedDoc.querySelectorAll('math[data-equation-id]')
      expect(extractedMathElements.length).toBeGreaterThan(0)
      // Allow some tolerance for MathML preservation challenges
      expect(extractedMathElements.length).toBeGreaterThanOrEqual(originalMathElements.length * 0.5)

      // 7. Table structure and data must be preserved
      const originalTableRows = originalDoc.querySelectorAll('table[data-table-id="error-thresholds"] tbody tr')
      const extractedTableRows = extractedDoc.querySelectorAll('table tbody tr')
      expect(extractedTableRows.length).toBeGreaterThanOrEqual(originalTableRows.length)
      
      // Check specific table data
      expect(extractedHtml).toContain('Surface Code')
      expect(extractedHtml).toContain('Color Code')
      expect(extractedHtml).toContain('1.1') // Surface code threshold
      expect(extractedHtml).toContain('169') // Surface code qubits

      // 8. Citations and references must be preserved
      expect(extractedHtml).toContain('Gottesman, D. (1997)')
      expect(extractedHtml).toContain('Fowler, A. G.')
      
      // 9. Code blocks must be preserved
      expect(extractedHtml).toContain('def measure_stabilizers')
      expect(extractedHtml).toContain('syndrome = []')

      // 10. Blockquotes must be preserved
      expect(extractedHtml).toContain('quantum leap forward')
      expect(extractedHtml).toContain('Dr. Alice Johnson, Lead Researcher')

      // Content Filtering Tests (peripheral content should be removed)
      
      // 11. Navigation should be removed
      const extractedNavElements = extractedDoc.querySelectorAll('nav')
      expect(extractedNavElements.length).toBe(0)

      // 12. Advertisement content should be removed
      expect(extractedHtml).not.toContain('Advertisement Block')

      // 13. Newsletter signup should be removed
      expect(extractedHtml).not.toContain('Subscribe to Updates')

      // 14. Analytics scripts should be removed
      expect(extractedHtml).not.toContain('trackPageViews')

      // Content Quality Analysis
      
      // 15. Extract text content for similarity analysis
      const originalText = originalDoc.querySelector('main')?.textContent || ''
      const extractedText = extractedDoc.textContent || ''
      
      const originalWords = new Set(originalText.toLowerCase().split(/\s+/).filter(w => w.length > 2))
      const extractedWords = new Set(extractedText.toLowerCase().split(/\s+/).filter(w => w.length > 2))
      
      const commonWords = new Set([...originalWords].filter(word => extractedWords.has(word)))
      const similarity = originalWords.size > 0 ? commonWords.size / originalWords.size : 0
      
      // Should preserve at least 70% of meaningful words
      expect(similarity).toBeGreaterThan(0.7)
      
      // Content length should be reasonable (not too much removed, not too much added)
      const contentRatio = extractedText.length / originalText.length
      expect(contentRatio).toBeGreaterThan(0.4) // Not too much removed
      expect(contentRatio).toBeLessThan(2.0)    // Not too much added

      // Cleanup DOM instances
      originalDom.window.close()
      extractedDom.window.close()

      console.log('Content Fidelity Analysis:')
      console.log(`- Text similarity: ${(similarity * 100).toFixed(1)}%`)
      console.log(`- Content ratio: ${(contentRatio * 100).toFixed(1)}%`)
      console.log(`- Original text length: ${originalText.length}`)
      console.log(`- Extracted text length: ${extractedText.length}`)
      console.log(`- Math elements preserved: ${extractedMathElements.length}/${originalMathElements.length}`)
      console.log(`- Table rows preserved: ${extractedTableRows.length}/${originalTableRows.length}`)
    }, 30000) // 30 second timeout for AI processing
  })
})