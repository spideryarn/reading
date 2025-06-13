/**
 * HTML Content Fidelity Test Generator
 * 
 * Generates realistic HTML documents with complex content structures that are
 * prone to extraction errors. Used for testing the fidelity of URL extraction
 * to ensure content is preserved accurately without modification, abridgment,
 * or loss during AI transcription and processing.
 */

export interface TestDocument {
  id: string
  name: string
  description: string
  originalHtml: string
  expectedContentChecks: ContentCheck[]
  complexityMetrics: ComplexityMetrics
}

export interface ContentCheck {
  type: 'exact_text' | 'element_count' | 'attribute_value' | 'structure_intact' | 'mathematical_equation' | 'data_integrity'
  selector?: string
  expectedValue: string | number
  description: string
  critical: boolean // If true, failure indicates major extraction issue
}

export interface ComplexityMetrics {
  totalElements: number
  mathElements: number
  tableElements: number
  listElements: number
  codeBlocks: number
  figureElements: number
  citationElements: number
  technicalTerms: number
}

/**
 * Generates academic research paper with complex mathematical notation
 */
export function generateAcademicPaperWithMath(): TestDocument {
  const originalHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Quantum Error Correction in Topological Qubits</title>
</head>
<body>
    <header class="site-header">
        <nav>Site Navigation</nav>
        <div class="ads">Advertisement Block</div>
    </header>
    
    <main class="article-content">
        <article>
            <header>
                <h1>Quantum Error Correction in Topological Qubits: A Comprehensive Analysis</h1>
                <div class="authors">
                    <span>Dr. Alice Quantum<sup>1,2</sup></span>,
                    <span>Prof. Bob Topology<sup>1</sup></span>,
                    <span>Dr. Carol States<sup>2</sup></span>
                </div>
                <div class="affiliations">
                    <sup>1</sup>Institute for Quantum Computing, University of Advanced Physics<br>
                    <sup>2</sup>Department of Theoretical Physics, Quantum Research Center
                </div>
                <div class="metadata">
                    <span class="date">Published: March 15, 2024</span>
                    <span class="doi">DOI: 10.1038/quantum.2024.15673</span>
                </div>
            </header>

            <section class="abstract">
                <h2>Abstract</h2>
                <p>
                    We present a novel approach to quantum error correction using topological protection 
                    mechanisms. Our analysis demonstrates that the error threshold for fault-tolerant 
                    quantum computation can be significantly improved through the implementation of 
                    Majorana-based logical qubits. The surface code implementation shows a 
                    <strong>10<sup>-15</sup></strong> error rate improvement over conventional approaches.
                </p>
            </section>

            <section class="introduction">
                <h2>1. Introduction</h2>
                <p>
                    Quantum error correction represents one of the most critical challenges in 
                    implementing fault-tolerant quantum computers. The theoretical foundation, 
                    first established by <cite data-ref="shor1995">Shor (1995)</cite> and 
                    <cite data-ref="steane1996">Steane (1996)</cite>, provides the framework 
                    for protecting quantum information against decoherence.
                </p>
                
                <p>
                    The fundamental principle relies on encoding logical qubits into a larger 
                    Hilbert space using quantum error-correcting codes. The stabilizer formalism 
                    <cite data-ref="gottesman1997">(Gottesman, 1997)</cite> provides an elegant 
                    mathematical framework for understanding these codes.
                </p>
            </section>

            <section class="methodology">
                <h2>2. Theoretical Framework</h2>
                
                <h3>2.1 Stabilizer Codes</h3>
                <p>
                    A stabilizer code is defined by a set of commuting Pauli operators 
                    S = {g₁, g₂, ..., gₙ₋ₖ} that stabilize the code space. The logical 
                    state |ψₗ⟩ satisfies:
                </p>
                
                <math xmlns="http://www.w3.org/1998/Math/MathML" display="block" data-equation-id="stabilizer-condition">
                    <mrow>
                        <msub><mi>g</mi><mi>i</mi></msub>
                        <mo>|</mo>
                        <msub><mi>ψ</mi><mi>L</mi></msub>
                        <mo>⟩</mo>
                        <mo>=</mo>
                        <mo>|</mo>
                        <msub><mi>ψ</mi><mi>L</mi></msub>
                        <mo>⟩</mo>
                        <mspace width="1em"/>
                        <mtext>for all</mtext>
                        <mspace width="0.5em"/>
                        <msub><mi>g</mi><mi>i</mi></msub>
                        <mo>∈</mo>
                        <mi>S</mi>
                    </mrow>
                </math>

                <p>
                    The distance d of the code is the minimum weight of any logical operator:
                </p>

                <math xmlns="http://www.w3.org/1998/Math/MathML" display="block" data-equation-id="code-distance">
                    <mrow>
                        <mi>d</mi>
                        <mo>=</mo>
                        <munder>
                            <mo>min</mo>
                            <mrow>
                                <mi>E</mi>
                                <mo>∈</mo>
                                <msub><mi>L</mi><mi>X</mi></msub>
                                <mo>∪</mo>
                                <msub><mi>L</mi><mi>Z</mi></msub>
                            </mrow>
                        </munder>
                        <mo>|</mo>
                        <mi>E</mi>
                        <mo>|</mo>
                    </mrow>
                </math>

                <h3>2.2 Surface Code Implementation</h3>
                <p>
                    The surface code, operating on a two-dimensional lattice, represents the 
                    most promising approach for near-term quantum error correction. Each 
                    stabilizer corresponds to either a plaquette or vertex operator:
                </p>

                <ul>
                    <li><strong>Plaquette operators:</strong> Aₚ = ⊗ᵢ∈∂ₚ Xᵢ</li>
                    <li><strong>Vertex operators:</strong> Bᵥ = ⊗ᵢ∈∂ᵥ Zᵢ</li>
                </ul>

                <figure data-figure-id="surface-code-lattice">
                    <img src="/figures/surface-code-lattice.svg" alt="Surface code lattice structure showing plaquette and vertex operators" />
                    <figcaption>
                        <strong>Figure 1:</strong> Surface code lattice structure. Blue vertices represent Z-stabilizers, 
                        red plaquettes represent X-stabilizers. The logical X and Z operators are shown as 
                        chains spanning the lattice. 
                        <cite data-ref="fowler2012">(Fowler et al., 2012)</cite>
                    </figcaption>
                </figure>
            </section>

            <section class="results">
                <h2>3. Experimental Results</h2>
                
                <h3>3.1 Error Threshold Analysis</h3>
                <p>
                    Our Monte Carlo simulations reveal significant improvements in error thresholds 
                    when implementing topological protection. The following table summarizes our findings:
                </p>

                <table data-table-id="error-thresholds" class="results-table">
                    <caption>
                        <strong>Table 1:</strong> Error threshold comparison between conventional and 
                        topological quantum error correction schemes. All values represent the 
                        maximum physical error rate that maintains logical error rate below 10⁻¹⁰.
                    </caption>
                    <thead>
                        <tr>
                            <th rowspan="2">Error Correction Scheme</th>
                            <th colspan="3">Error Threshold (%)</th>
                            <th rowspan="2">Code Distance</th>
                            <th rowspan="2">Overhead Factor</th>
                        </tr>
                        <tr>
                            <th>Bit-flip</th>
                            <th>Phase-flip</th>
                            <th>Combined</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr data-scheme="surface-code">
                            <td>Surface Code (2D)</td>
                            <td data-precision="4">1.14</td>
                            <td data-precision="4">1.14</td>
                            <td data-precision="4">0.57</td>
                            <td data-distance="17">17</td>
                            <td data-overhead="289">289×</td>
                        </tr>
                        <tr data-scheme="color-code">
                            <td>Color Code (3D)</td>
                            <td data-precision="4">1.87</td>
                            <td data-precision="4">1.87</td>
                            <td data-precision="4">0.93</td>
                            <td data-distance="21">21</td>
                            <td data-overhead="441">441×</td>
                        </tr>
                        <tr data-scheme="majorana-code" class="highlight">
                            <td>Majorana Topological</td>
                            <td data-precision="4">3.24</td>
                            <td data-precision="4">3.24</td>
                            <td data-precision="4">1.62</td>
                            <td data-distance="13">13</td>
                            <td data-overhead="169">169×</td>
                        </tr>
                        <tr data-scheme="braiding-code">
                            <td>Fibonacci Braiding</td>
                            <td data-precision="4">4.17</td>
                            <td data-precision="4">4.17</td>
                            <td data-precision="4">2.08</td>
                            <td data-distance="11">11</td>
                            <td data-overhead="121">121×</td>
                        </tr>
                    </tbody>
                </table>

                <h3>3.2 Scaling Behavior</h3>
                <p>
                    The logical error rate scales exponentially with code distance according to:
                </p>

                <math xmlns="http://www.w3.org/1998/Math/MathML" display="block" data-equation-id="error-scaling">
                    <mrow>
                        <msub><mi>p</mi><mi>L</mi></msub>
                        <mo>=</mo>
                        <mi>A</mi>
                        <mo>⋅</mo>
                        <msup>
                            <mrow>
                                <mo>(</mo>
                                <mfrac>
                                    <mi>p</mi>
                                    <msub><mi>p</mi><mi>th</mi></msub>
                                </mfrac>
                                <mo>)</mo>
                            </mrow>
                            <mfrac>
                                <mrow><mi>d</mi><mo>+</mo><mn>1</mn></mrow>
                                <mn>2</mn>
                            </mfrac>
                        </msup>
                    </mrow>
                </math>

                <p>
                    Where A is a normalization constant, p is the physical error rate, 
                    p<sub>th</sub> is the threshold error rate, and d is the code distance.
                </p>

                <figure data-figure-id="scaling-behavior">
                    <img src="/figures/error-scaling.png" alt="Logarithmic plot showing exponential scaling of logical error rate with code distance" />
                    <figcaption>
                        <strong>Figure 2:</strong> Logical error rate scaling behavior. The exponential 
                        improvement with code distance is clearly visible for physical error rates 
                        below threshold. Error bars represent 95% confidence intervals from 
                        10<sup>6</sup> Monte Carlo samples.
                    </figcaption>
                </figure>
            </section>

            <section class="discussion">
                <h2>4. Discussion and Future Directions</h2>
                
                <h3>4.1 Implementation Challenges</h3>
                <p>
                    While our theoretical analysis demonstrates significant advantages of topological 
                    approaches, several implementation challenges remain:
                </p>

                <ol>
                    <li>
                        <strong>Coherence requirements:</strong> Majorana qubits require coherence 
                        times exceeding τ > 10 ms for practical implementation.
                    </li>
                    <li>
                        <strong>Initialization fidelity:</strong> State preparation must achieve 
                        F > 99.9% fidelity to maintain threshold conditions.
                    </li>
                    <li>
                        <strong>Measurement accuracy:</strong> Syndrome extraction requires 
                        measurement errors below 0.1% for reliable operation.
                    </li>
                </ol>

                <h3>4.2 Comparison with Classical Error Correction</h3>
                <p>
                    Unlike classical error correction, quantum codes must satisfy the 
                    <em>quantum no-cloning theorem</em>, preventing direct copying of quantum states. 
                    This fundamental constraint necessitates more sophisticated encoding strategies.
                </p>

                <blockquote data-quote-id="no-cloning-principle">
                    "The impossibility of quantum state cloning represents a fundamental difference 
                    between classical and quantum information theory, requiring entirely new 
                    approaches to error correction that preserve quantum coherence while providing 
                    protection against decoherence."
                    <footer>
                        — <cite data-ref="wootters1982">Wootters & Zurek (1982)</cite>
                    </footer>
                </blockquote>

                <h3>4.3 Code Performance Metrics</h3>
                <p>
                    The performance of quantum error correction codes can be characterized 
                    through several key metrics:
                </p>

                <dl class="performance-metrics">
                    <dt>Threshold (p<sub>th</sub>)</dt>
                    <dd>Maximum physical error rate that allows logical error suppression</dd>
                    
                    <dt>Distance (d)</dt>
                    <dd>Minimum weight of logical operators; determines error correction capability</dd>
                    
                    <dt>Rate (R = k/n)</dt>
                    <dd>Ratio of logical to physical qubits; measures encoding efficiency</dd>
                    
                    <dt>Overhead (O = n/k)</dt>
                    <dd>Physical qubit cost per logical qubit; practical implementation metric</dd>
                </dl>
            </section>

            <section class="code-examples">
                <h2>5. Implementation Code</h2>
                
                <h3>5.1 Stabilizer Syndrome Extraction</h3>
                <p>
                    The following pseudocode demonstrates syndrome extraction for surface codes:
                </p>

                <pre data-language="python" class="code-block"><code>def extract_syndromes(surface_code_state, stabilizers):
    """
    Extract error syndromes from surface code measurement.
    
    Args:
        surface_code_state: Current quantum state |ψ⟩
        stabilizers: List of stabilizer generators {g₁, g₂, ..., gₙ}
    
    Returns:
        syndrome_vector: Binary vector indicating detected errors
    """
    syndrome_vector = []
    
    for stabilizer in stabilizers:
        # Measure stabilizer eigenvalue
        eigenvalue = measure_pauli_operator(stabilizer, surface_code_state)
        
        # Convert to syndrome bit (0 for +1, 1 for -1)
        syndrome_bit = (1 - eigenvalue) // 2
        syndrome_vector.append(syndrome_bit)
    
    return syndrome_vector

def correct_errors(syndrome_vector, lookup_table):
    """
    Apply error correction based on syndrome measurement.
    
    The lookup table maps syndrome patterns to correction operators.
    For surface codes, this implements minimum-weight perfect matching.
    """
    error_pattern = lookup_table.get(tuple(syndrome_vector))
    
    if error_pattern is not None:
        apply_correction_operator(error_pattern)
        return True
    else:
        # Unknown syndrome - potential logical error
        return False</code></pre>

                <h3>5.2 Majorana Braiding Protocol</h3>
                <pre data-language="python" class="code-block"><code>class MajoranaQubit:
    """
    Implementation of topological qubit using Majorana zero modes.
    
    Quantum gates are implemented through braiding operations that
    are topologically protected against local perturbations.
    """
    
    def __init__(self, majorana_pairs):
        self.majorana_modes = majorana_pairs
        self.logical_state = None
    
    def apply_x_gate(self):
        """Apply logical X gate through Majorana braiding."""
        # Braid γ₁ around γ₂ clockwise
        self.braid_majoranas(self.majorana_modes[0], self.majorana_modes[1], 'clockwise')
    
    def apply_z_gate(self):
        """Apply logical Z gate through charge parity measurement."""
        # Z gate implemented via measurement-based operations
        parity = self.measure_charge_parity()
        if parity == -1:
            self.apply_phase_correction()
    
    def braid_majoranas(self, gamma1, gamma2, direction):
        """
        Implement braiding operation between two Majorana modes.
        
        The braiding operation is given by:
        exp(±π/4 * γ₁γ₂) = (1 ± γ₁γ₂)/√2
        """
        angle = math.pi / 4 if direction == 'clockwise' else -math.pi / 4
        braiding_operator = math.cos(angle) * I + math.sin(angle) * gamma1 * gamma2
        
        self.logical_state = braiding_operator @ self.logical_state</code></pre>
            </section>

            <section class="conclusions">
                <h2>6. Conclusions</h2>
                <p>
                    Our comprehensive analysis demonstrates that topological quantum error correction 
                    offers substantial advantages over conventional stabilizer codes. The key findings include:
                </p>

                <ul>
                    <li>
                        <strong>Enhanced thresholds:</strong> Majorana-based codes achieve 
                        error thresholds up to 1.62%, representing a <strong>2.8× improvement</strong> 
                        over surface codes.
                    </li>
                    <li>
                        <strong>Reduced overhead:</strong> Topological protection reduces the 
                        required number of physical qubits by approximately <strong>40%</strong> 
                        for equivalent logical error rates.
                    </li>
                    <li>
                        <strong>Intrinsic fault tolerance:</strong> Braiding operations are 
                        inherently protected against local decoherence mechanisms.
                    </li>
                </ul>

                <p>
                    Future work will focus on experimental implementation of these theoretical 
                    predictions using semiconductor-superconductor heterostructures for 
                    Majorana qubit realization.
                </p>
            </section>

            <section class="acknowledgments">
                <h2>Acknowledgments</h2>
                <p>
                    We thank Dr. David Kitaev for insightful discussions on topological quantum 
                    computation and Prof. Michelle Simmons for experimental guidance. This work 
                    was supported by grants from the National Science Foundation (PHY-2024157) 
                    and the Department of Energy (DE-SC0024891).
                </p>
            </section>

            <section class="references">
                <h2>References</h2>
                <ol class="reference-list">
                    <li data-ref="shor1995">
                        Shor, P. W. (1995). Scheme for reducing decoherence in quantum computer memory. 
                        <em>Physical Review A</em>, 52(4), R2493-R2496.
                    </li>
                    <li data-ref="steane1996">
                        Steane, A. M. (1996). Error correcting codes in quantum theory. 
                        <em>Physical Review Letters</em>, 77(5), 793-797.
                    </li>
                    <li data-ref="gottesman1997">
                        Gottesman, D. (1997). Stabilizer codes and quantum error correction. 
                        <em>arXiv preprint quant-ph/9705052</em>.
                    </li>
                    <li data-ref="fowler2012">
                        Fowler, A. G., Mariantoni, M., Martinis, J. M., & Cleland, A. N. (2012). 
                        Surface codes: Towards practical large-scale quantum computation. 
                        <em>Physical Review A</em>, 86(3), 032324.
                    </li>
                    <li data-ref="wootters1982">
                        Wootters, W. K., & Zurek, W. H. (1982). A single quantum cannot be cloned. 
                        <em>Nature</em>, 299(5886), 802-803.
                    </li>
                </ol>
            </section>
        </article>
    </main>

    <aside class="sidebar">
        <div class="advertisement">
            <script>showAds()</script>
            <h3>Related Articles</h3>
            <ul>
                <li><a href="/quantum-computing">Quantum Computing Basics</a></li>
                <li><a href="/topological-physics">Topological Phases of Matter</a></li>
            </ul>
        </div>
    </aside>

    <footer class="site-footer">
        <div class="footer-content">
            <p>&copy; 2024 Quantum Research Institute. All rights reserved.</p>
            <div class="social-links">
                <a href="/twitter">Twitter</a>
                <a href="/linkedin">LinkedIn</a>
            </div>
        </div>
    </footer>

    <script>
        // Analytics tracking
        gtag('config', 'GA-QUANTUM-123');
        trackPageView('/quantum-error-correction');
    </script>
</body>
</html>`

  const expectedContentChecks: ContentCheck[] = [
    // Critical text preservation checks
    {
      type: 'exact_text',
      expectedValue: 'Quantum Error Correction in Topological Qubits: A Comprehensive Analysis',
      description: 'Main title must be preserved exactly',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'Dr. Alice Quantum',
      description: 'Author names with formatting must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'DOI: 10.1038/quantum.2024.15673',
      description: 'Metadata like DOI must be preserved exactly',
      critical: true
    },
    
    // Mathematical equations preservation
    {
      type: 'element_count',
      selector: 'math[data-equation-id]',
      expectedValue: 3,
      description: 'All mathematical equations must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'gᵢ|ψₗ⟩ = |ψₗ⟩',
      description: 'Mathematical notation in text must be preserved',
      critical: true
    },
    
    // Table structure and data integrity
    {
      type: 'element_count',
      selector: 'table[data-table-id="error-thresholds"] tbody tr',
      expectedValue: 4,
      description: 'All table rows must be preserved',
      critical: true
    },
    {
      type: 'attribute_value',
      selector: 'td[data-precision="4"]',
      expectedValue: '1.14',
      description: 'Precise numerical data must be preserved exactly',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: '10⁻¹⁰',
      description: 'Scientific notation with unicode must be preserved',
      critical: true
    },
    
    // Citations and references
    {
      type: 'element_count',
      selector: 'cite[data-ref]',
      expectedValue: 6,
      description: 'All citation elements must be preserved',
      critical: true
    },
    {
      type: 'attribute_value',
      selector: 'cite[data-ref="shor1995"]',
      expectedValue: 'shor1995',
      description: 'Citation references must maintain data attributes',
      critical: true
    },
    
    // Figure captions and academic formatting
    {
      type: 'element_count',
      selector: 'figure[data-figure-id]',
      expectedValue: 2,
      description: 'All figures must be preserved',
      critical: false
    },
    {
      type: 'exact_text',
      expectedValue: 'Figure 1:',
      description: 'Figure numbering must be preserved',
      critical: true
    },
    
    // Code blocks preservation
    {
      type: 'element_count',
      selector: 'pre.code-block',
      expectedValue: 2,
      description: 'All code blocks must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'def extract_syndromes(surface_code_state, stabilizers):',
      description: 'Code function signatures must be preserved exactly',
      critical: true
    },
    
    // List structures
    {
      type: 'element_count',
      selector: 'ol.reference-list li',
      expectedValue: 5,
      description: 'All reference list items must be preserved',
      critical: true
    },
    {
      type: 'element_count',
      selector: 'dl.performance-metrics dt',
      expectedValue: 4,
      description: 'Definition list terms must be preserved',
      critical: false
    },
    
    // Content that should be removed (navigation, ads, scripts)
    {
      type: 'element_count',
      selector: 'script',
      expectedValue: 0,
      description: 'Scripts should be removed during extraction',
      critical: true
    },
    {
      type: 'element_count',
      selector: '.advertisement',
      expectedValue: 0,
      description: 'Advertisement content should be removed',
      critical: true
    },
    {
      type: 'element_count',
      selector: 'nav',
      expectedValue: 0,
      description: 'Navigation elements should be removed',
      critical: true
    }
  ]

  const complexityMetrics: ComplexityMetrics = {
    totalElements: 150,
    mathElements: 3,
    tableElements: 1,
    listElements: 5,
    codeBlocks: 2,
    figureElements: 2,
    citationElements: 6,
    technicalTerms: 25
  }

  return {
    id: 'academic-paper-with-math',
    name: 'Academic Paper with Mathematical Equations',
    description: 'Complex academic paper with mathematical notation, tables, citations, and code blocks',
    originalHtml,
    expectedContentChecks,
    complexityMetrics
  }
}

/**
 * Generates a multi-column newspaper article with complex layout
 */
export function generateNewsArticleWithComplexLayout(): TestDocument {
  const originalHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Breaking: Revolutionary Climate Technology Breakthrough Announced</title>
    <meta name="description" content="Scientists develop new carbon capture technology with 95% efficiency">
</head>
<body>
    <header class="site-header">
        <div class="header-top">
            <div class="weather-widget">72°F | Sunny</div>
            <div class="stock-ticker">DOW +1.2% | NASDAQ +0.8%</div>
            <div class="breaking-news-banner">BREAKING NEWS</div>
        </div>
        <nav class="main-navigation">
            <ul>
                <li><a href="/news">News</a></li>
                <li><a href="/politics">Politics</a></li>
                <li><a href="/science">Science</a></li>
                <li><a href="/business">Business</a></li>
            </ul>
        </nav>
    </header>

    <main class="article-container">
        <article class="news-article">
            <header class="article-header">
                <div class="article-category">SCIENCE & TECHNOLOGY</div>
                <h1>Revolutionary Climate Technology Achieves 95% Carbon Capture Efficiency in Breakthrough Study</h1>
                <h2 class="subtitle">New direct air capture system could transform global carbon removal efforts</h2>
                
                <div class="article-meta">
                    <div class="byline">
                        By <span class="author">Dr. Sarah Chen</span> and <span class="author">Michael Rodriguez</span>
                    </div>
                    <div class="publication-info">
                        <time datetime="2024-03-20T08:30:00Z">March 20, 2024, 8:30 AM EST</time>
                        <span class="reading-time">8 min read</span>
                    </div>
                    <div class="location">MIT, Cambridge, MA</div>
                </div>
            </header>

            <div class="article-body">
                <div class="lead-paragraph">
                    <p class="lead">
                        Scientists at MIT have achieved a groundbreaking <strong>95% efficiency rate</strong> 
                        in direct air carbon capture technology, representing a quantum leap forward in 
                        climate change mitigation efforts. The new system, detailed in today's issue of 
                        <em>Nature Climate Change</em>, could potentially remove 
                        <strong>1 billion tons of CO₂ annually</strong> when deployed at scale.
                    </p>
                </div>

                <figure class="hero-image" data-figure-id="carbon-capture-facility">
                    <img src="/images/carbon-capture-lab.jpg" alt="MIT researchers working with the new carbon capture prototype" />
                    <figcaption>
                        MIT researchers Dr. Elena Volkov (left) and Dr. James Park examine the 
                        revolutionary carbon capture prototype in their Cambridge laboratory. 
                        The system has achieved unprecedented efficiency rates in preliminary testing.
                        <span class="photo-credit">Photo: MIT Technology Review / Alex Thompson</span>
                    </figcaption>
                </figure>

                <div class="article-content">
                    <h3>Technology Overview</h3>
                    <p>
                        The breakthrough centers on a novel <strong>metal-organic framework (MOF)</strong> 
                        material that selectively binds CO₂ molecules from ambient air. Unlike previous 
                        technologies that required energy-intensive heating cycles, this system operates 
                        efficiently at room temperature using a proprietary electrochemical process.
                    </p>

                    <blockquote class="pull-quote" data-quote-id="lead-researcher-statement">
                        "We've fundamentally reimagined how carbon capture can work. Instead of fighting 
                        against thermodynamics, we're working with it to create a system that's both 
                        highly efficient and economically viable."
                        <footer>
                            <cite>Dr. Elena Volkov, Lead Researcher, MIT Climate Solutions Lab</cite>
                        </footer>
                    </blockquote>

                    <h3>Performance Metrics</h3>
                    <p>
                        The research team conducted extensive testing over an 18-month period, 
                        measuring performance across multiple environmental conditions. The results 
                        demonstrate consistent efficiency across a wide range of operational parameters:
                    </p>

                    <table class="performance-data" data-table-id="capture-efficiency">
                        <caption>
                            Carbon Capture Efficiency Under Various Operating Conditions
                        </caption>
                        <thead>
                            <tr>
                                <th>Operating Condition</th>
                                <th>Temperature (°C)</th>
                                <th>Humidity (%)</th>
                                <th>CO₂ Concentration (ppm)</th>
                                <th>Capture Efficiency (%)</th>
                                <th>Energy Required (kWh/ton CO₂)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr data-condition="optimal">
                                <td>Optimal Laboratory</td>
                                <td>22</td>
                                <td>45</td>
                                <td>415</td>
                                <td class="highlight">95.2</td>
                                <td>120</td>
                            </tr>
                            <tr data-condition="high-humidity">
                                <td>High Humidity</td>
                                <td>25</td>
                                <td>85</td>
                                <td>420</td>
                                <td>92.8</td>
                                <td>135</td>
                            </tr>
                            <tr data-condition="low-temperature">
                                <td>Low Temperature</td>
                                <td>5</td>
                                <td>30</td>
                                <td>410</td>
                                <td>89.4</td>
                                <td>145</td>
                            </tr>
                            <tr data-condition="high-temperature">
                                <td>High Temperature</td>
                                <td>40</td>
                                <td>20</td>
                                <td>425</td>
                                <td>91.7</td>
                                <td>125</td>
                            </tr>
                            <tr data-condition="urban-environment">
                                <td>Urban Environment</td>
                                <td>28</td>
                                <td>60</td>
                                <td>450</td>
                                <td>94.1</td>
                                <td>118</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3>Economic Implications</h3>
                    <p>
                        Beyond the technical achievement, the economic implications are equally significant. 
                        Current carbon capture technologies cost between <strong>$150-600 per ton</strong> 
                        of CO₂ removed. The MIT system demonstrates a pathway to reducing costs to 
                        <strong>$50-80 per ton</strong>, making large-scale deployment economically feasible.
                    </p>

                    <div class="info-box" data-info-id="cost-comparison">
                        <h4>Cost Comparison: Existing vs. New Technology</h4>
                        <ul class="cost-breakdown">
                            <li>
                                <strong>Traditional DAC systems:</strong> $400-600/ton CO₂
                                <ul class="subcost-list">
                                    <li>Energy costs: $250-350/ton</li>
                                    <li>Equipment amortization: $100-150/ton</li>
                                    <li>Maintenance and operation: $50-100/ton</li>
                                </ul>
                            </li>
                            <li>
                                <strong>MIT breakthrough system:</strong> $50-80/ton CO₂
                                <ul class="subcost-list">
                                    <li>Energy costs: $20-35/ton</li>
                                    <li>Equipment amortization: $20-30/ton</li>
                                    <li>Maintenance and operation: $10-15/ton</li>
                                </ul>
                            </li>
                        </ul>
                    </div>

                    <h3>Industry Response</h3>
                    <p>
                        The announcement has generated significant interest from both government agencies 
                        and private industry. Several major technology companies have already expressed 
                        interest in licensing the technology for commercial development.
                    </p>

                    <div class="quote-collection">
                        <blockquote data-source="tech-ceo">
                            "This represents exactly the kind of breakthrough we need to meet our 
                            carbon neutrality commitments. We're already in discussions with MIT 
                            about pilot deployment."
                            <footer>
                                <cite>Jennifer Walsh, CEO, GreenTech Solutions</cite>
                            </footer>
                        </blockquote>

                        <blockquote data-source="government-official">
                            "The Department of Energy is prepared to fast-track funding for scaling 
                            this technology. This could be a game-changer for our national climate goals."
                            <footer>
                                <cite>Dr. Robert Kim, Deputy Secretary of Energy</cite>
                            </footer>
                        </blockquote>
                    </div>

                    <h3>Technical Challenges Ahead</h3>
                    <p>
                        Despite the promising results, several challenges remain before widespread 
                        deployment becomes possible:
                    </p>

                    <ol class="challenge-list">
                        <li>
                            <strong>Scaling Production:</strong> Manufacturing the specialized MOF 
                            materials at industrial scale will require significant investment in 
                            new production facilities.
                        </li>
                        <li>
                            <strong>Durability Testing:</strong> Long-term performance studies are 
                            needed to verify the system maintains efficiency over multiple years 
                            of operation.
                        </li>
                        <li>
                            <strong>Integration Challenges:</strong> Adapting the technology for 
                            various deployment scenarios (urban, industrial, remote) requires 
                            customized engineering solutions.
                        </li>
                        <li>
                            <strong>Regulatory Approval:</strong> Environmental impact assessments 
                            and safety certifications must be completed before commercial deployment.
                        </li>
                    </ol>

                    <h3>Global Climate Impact</h3>
                    <p>
                        Climate scientists estimate that widespread deployment of this technology 
                        could remove between <strong>2-5 billion tons</strong> of CO₂ annually by 2040, 
                        representing <strong>5-12%</strong> of current global emissions. This scale 
                        of carbon removal could significantly accelerate progress toward international 
                        climate targets.
                    </p>

                    <figure class="projection-chart" data-figure-id="climate-impact-projection">
                        <img src="/charts/co2-removal-projection.svg" alt="Projected global CO2 removal capacity with new technology deployment" />
                        <figcaption>
                            <strong>Figure 1:</strong> Projected global CO₂ removal capacity through 2050 
                            with accelerated deployment of the new MIT technology. The chart shows 
                            potential reduction trajectories under conservative, moderate, and 
                            aggressive deployment scenarios.
                        </figcaption>
                    </figure>

                    <div class="data-highlight" data-highlight-id="key-statistics">
                        <h4>Key Statistics at a Glance</h4>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <span class="stat-number">95.2%</span>
                                <span class="stat-label">Maximum Capture Efficiency</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">$50-80</span>
                                <span class="stat-label">Cost per Ton CO₂ (projected)</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">1 billion</span>
                                <span class="stat-label">Tons CO₂/year (full scale)</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-number">18 months</span>
                                <span class="stat-label">Testing Period</span>
                            </div>
                        </div>
                    </div>

                    <h3>Next Steps</h3>
                    <p>
                        The research team plans to begin construction of a pilot facility capable 
                        of removing <strong>1,000 tons of CO₂ per year</strong> by late 2024. This 
                        demonstration plant will serve as a proving ground for scaling the technology 
                        to commercial levels.
                    </p>

                    <p>
                        <em>This article is part of our ongoing coverage of climate technology breakthroughs. 
                        For more information, see our <a href="/climate-tech-series">Climate Tech Series</a> 
                        and follow our <a href="/carbon-capture-tracker">Carbon Capture Technology Tracker</a>.</em>
                    </p>
                </div>
            </div>

            <footer class="article-footer">
                <div class="article-tags">
                    <span class="tag">Climate Change</span>
                    <span class="tag">Carbon Capture</span>
                    <span class="tag">MIT Research</span>
                    <span class="tag">Clean Technology</span>
                    <span class="tag">Environmental Science</span>
                </div>
                
                <div class="social-sharing">
                    <button class="share-button" data-platform="twitter">Share on Twitter</button>
                    <button class="share-button" data-platform="linkedin">Share on LinkedIn</button>
                    <button class="share-button" data-platform="email">Share via Email</button>
                </div>
            </footer>
        </article>

        <aside class="related-content">
            <h3>Related Articles</h3>
            <div class="related-articles">
                <article class="related-article">
                    <h4><a href="/carbon-pricing-policies">New Carbon Pricing Policies Show Promise</a></h4>
                    <p>Government initiatives worldwide are implementing innovative carbon pricing mechanisms...</p>
                </article>
                
                <article class="related-article">
                    <h4><a href="/renewable-energy-storage">Breakthrough in Renewable Energy Storage</a></h4>
                    <p>Advanced battery technology could solve intermittency challenges...</p>
                </article>
            </div>
            
            <div class="newsletter-signup">
                <h4>Stay Updated</h4>
                <p>Get the latest climate technology news delivered to your inbox.</p>
                <form class="signup-form">
                    <input type="email" placeholder="Enter your email" required>
                    <button type="submit">Subscribe</button>
                </form>
            </div>
        </aside>
    </main>

    <footer class="site-footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>Climate News Network</h4>
                <p>Your trusted source for climate science and technology news.</p>
            </div>
            <div class="footer-section">
                <h4>Follow Us</h4>
                <div class="social-links">
                    <a href="/twitter">Twitter</a>
                    <a href="/facebook">Facebook</a>
                    <a href="/linkedin">LinkedIn</a>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Analytics and ad tracking
        gtag('config', 'GA-CLIMATE-NEWS-456');
        loadAdvertisements();
        trackScrollDepth();
    </script>
</body>
</html>`

  const expectedContentChecks: ContentCheck[] = [
    // Main content preservation
    {
      type: 'exact_text',
      expectedValue: 'Revolutionary Climate Technology Achieves 95% Carbon Capture Efficiency in Breakthrough Study',
      description: 'Main headline must be preserved exactly',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'By Dr. Sarah Chen and Michael Rodriguez',
      description: 'Author byline must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'March 20, 2024, 8:30 AM EST',
      description: 'Publication timestamp must be preserved',
      critical: true
    },

    // Key statistics and data
    {
      type: 'exact_text',
      expectedValue: '95% efficiency rate',
      description: 'Key performance metric must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: '1 billion tons of CO₂ annually',
      description: 'Scale metrics with unicode symbols must be preserved',
      critical: true
    },

    // Table data integrity
    {
      type: 'element_count',
      selector: 'table[data-table-id="capture-efficiency"] tbody tr',
      expectedValue: 5,
      description: 'All performance data rows must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: '95.2',
      description: 'Precise performance numbers must be preserved',
      critical: true
    },

    // Quote preservation
    {
      type: 'element_count',
      selector: 'blockquote[data-source]',
      expectedValue: 2,
      description: 'All industry quotes must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'Dr. Elena Volkov, Lead Researcher, MIT Climate Solutions Lab',
      description: 'Quote attributions must be preserved exactly',
      critical: true
    },

    // List structures
    {
      type: 'element_count',
      selector: 'ol.challenge-list li',
      expectedValue: 4,
      description: 'All technical challenges must be listed',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: 'Scaling Production:',
      description: 'List item headers must be preserved',
      critical: true
    },

    // Statistical highlights
    {
      type: 'element_count',
      selector: '.stats-grid .stat-item',
      expectedValue: 4,
      description: 'All key statistics must be preserved',
      critical: true
    },
    {
      type: 'exact_text',
      expectedValue: '$50-80',
      description: 'Cost projections must be preserved exactly',
      critical: true
    },

    // Navigation and ads should be removed
    {
      type: 'element_count',
      selector: 'nav',
      expectedValue: 0,
      description: 'Navigation should be removed',
      critical: true
    },
    {
      type: 'element_count',
      selector: '.newsletter-signup',
      expectedValue: 0,
      description: 'Newsletter signup forms should be removed',
      critical: true
    },
    {
      type: 'element_count',
      selector: 'script',
      expectedValue: 0,
      description: 'All scripts should be removed',
      critical: true
    }
  ]

  const complexityMetrics: ComplexityMetrics = {
    totalElements: 200,
    mathElements: 0,
    tableElements: 1,
    listElements: 4,
    codeBlocks: 0,
    figureElements: 2,
    citationElements: 3,
    technicalTerms: 30
  }

  return {
    id: 'news-article-complex-layout',
    name: 'News Article with Complex Layout',
    description: 'Multi-column news article with data tables, quotes, statistics, and sidebar content',
    originalHtml,
    expectedContentChecks,
    complexityMetrics
  }
}

/**
 * Generate all test documents
 */
export function generateAllTestDocuments(): TestDocument[] {
  return [
    generateAcademicPaperWithMath(),
    generateNewsArticleWithComplexLayout(),
    // Add more generators here as needed
  ]
}

/**
 * Utility function to count elements in HTML string
 */
export function countElementsInHtml(html: string, selector: string): number {
  // This would normally use a DOM parser, but for testing we can use regex patterns
  // In actual implementation, we'd use JSDOM or similar
  const elementPattern = new RegExp(`<${selector.replace(/[\[\]]/g, '\\$&')}[^>]*>`, 'g')
  const matches = html.match(elementPattern)
  return matches ? matches.length : 0
}

/**
 * Extract text content from HTML for comparison
 */
export function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}