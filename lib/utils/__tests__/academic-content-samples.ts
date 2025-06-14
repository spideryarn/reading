/**
 * Academic Content Samples for Testing HTML Prettification
 * 
 * These samples represent real-world academic content patterns from different publishers
 * to ensure prettification preserves critical formatting for scholarly documents.
 */

/**
 * arXiv-style LaTeXML content with complex mathematical notation
 */
export const ARXIV_MATH_SAMPLE = `
<div class="ltx_document">
  <article class="ltx_document_content ltx_authors_1line">
    <h1 class="ltx_title ltx_title_document">Deep Learning Architectures for Academic Document Processing</h1>
    <div class="ltx_abstract">
      <p>We present a novel approach to document analysis using transformer networks. The key insight is that attention mechanisms can capture long-range dependencies in academic text with complexity <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>O</mi><mo stretchy="false">(</mo><msup><mi>n</mi><mn>2</mn></msup><mo stretchy="false">)</mo></math>.</p>
    </div>
    <section class="ltx_section">
      <h2>Mathematical Framework</h2>
      <p>Our model is based on the transformer equation:</p>
      <div class="ltx_equation">
        <math xmlns="http://www.w3.org/1998/Math/MathML">
          <mrow>
            <mi>Attention</mi><mo stretchy="false">(</mo><mi>Q</mi><mo>,</mo><mi>K</mi><mo>,</mo><mi>V</mi><mo stretchy="false">)</mo>
            <mo>=</mo>
            <mi>softmax</mi><mo stretchy="false">(</mo>
            <mfrac>
              <mrow><mi>Q</mi><msup><mi>K</mi><mi>T</mi></msup></mrow>
              <msqrt><msub><mi>d</mi><mi>k</mi></msub></msqrt>
            </mfrac>
            <mo stretchy="false">)</mo><mi>V</mi>
          </mrow>
        </math>
      </div>
    </section>
  </article>
</div>
`.trim()

/**
 * PubMed Central JATS XML style content with structured metadata
 */
export const PUBMED_CITATION_SAMPLE = `
<article>
  <front>
    <article-meta>
      <title-group>
        <article-title>Machine Learning in Clinical Diagnosis: A Systematic Review</article-title>
      </title-group>
      <contrib-group>
        <contrib contrib-type="author">
          <name><surname>Smith</surname><given-names>John A.</given-names></name>
        </contrib>
        <contrib contrib-type="author">
          <name><surname>Johnson</surname><given-names>Mary B.</given-names></name>
        </contrib>
      </contrib-group>
    </article-meta>
  </front>
  <body>
    <sec>
      <title>Introduction</title>
      <p>Recent advances in machine learning have shown promising results in clinical applications (<xref ref-type="bibr" rid="ref1">Smith et al., 2023</xref>). The accuracy improvements range from 15-30% over traditional methods (<xref ref-type="bibr" rid="ref2">Johnson and Brown, 2024</xref>).</p>
    </sec>
    <sec>
      <title>Methods</title>
      <p>We analyzed data from <italic>n</italic> = 1,247 patients using the following criteria:</p>
      <list list-type="bullet">
        <list-item><p>Age > 18 years</p></list-item>
        <list-item><p>Complete diagnostic records</p></list-item>
        <list-item><p>Informed consent obtained</p></list-item>
      </list>
    </sec>
  </body>
  <back>
    <ref-list>
      <ref id="ref1">
        <element-citation>
          <person-group>
            <name><surname>Smith</surname><given-names>J</given-names></name>
            <name><surname>Wilson</surname><given-names>K</given-names></name>
            <name><surname>Davis</surname><given-names>L</given-names></name>
          </person-group>
          <source>Journal of Medical AI</source>
          <year>2023</year>
        </element-citation>
      </ref>
    </ref-list>
  </back>
</article>
`.trim()

/**
 * IEEE Xplore style content with technical code blocks and equations
 */
export const IEEE_TECHNICAL_SAMPLE = `
<div class="article-content">
  <h1>Efficient Algorithms for Large-Scale Data Processing</h1>
  <div class="abstract">
    <p><strong>Abstract—</strong>This paper presents novel algorithms for processing large datasets with improved time complexity. Our contributions include: 1) A new sorting algorithm with <em>O(n log log n)</em> average case performance, and 2) A parallel implementation achieving 95% efficiency on multi-core systems.</p>
  </div>
  
  <div class="section">
    <h2>I. INTRODUCTION</h2>
    <p>Large-scale data processing has become critical in modern computing systems. Previous work by <cite>Chen et al. [1]</cite> established the theoretical foundation, while <cite>Rodriguez and Kim [2]</cite> demonstrated practical implementations.</p>
  </div>
  
  <div class="section">
    <h2>II. ALGORITHM DESIGN</h2>
    <p>Our algorithm builds on the merge-sort paradigm with the following key innovations:</p>
    
    <div class="algorithm">
      <pre><code class="language-python">
def efficient_sort(data, threshold=1000):
    """
    Efficient sorting algorithm with adaptive threshold.
    
    Args:
        data: Input array to sort
        threshold: Switch to insertion sort below this size
    
    Returns:
        Sorted array
    """
    if len(data) <= threshold:
        return insertion_sort(data)
    
    # Divide phase
    mid = len(data) // 2
    left = efficient_sort(data[:mid], threshold)
    right = efficient_sort(data[mid:], threshold)
    
    # Conquer phase with optimized merge
    return optimized_merge(left, right)
</code></pre>
    </div>
    
    <p>The time complexity analysis yields the recurrence relation:</p>
    <div class="equation">
      <math xmlns="http://www.w3.org/1998/Math/MathML">
        <mrow>
          <mi>T</mi><mo stretchy="false">(</mo><mi>n</mi><mo stretchy="false">)</mo>
          <mo>=</mo>
          <mn>2</mn><mi>T</mi><mo stretchy="false">(</mo><mi>n</mi><mo>/</mo><mn>2</mn><mo stretchy="false">)</mo>
          <mo>+</mo>
          <mi>O</mi><mo stretchy="false">(</mo><mi>n</mi><mo stretchy="false">)</mo>
        </mrow>
      </math>
    </div>
  </div>
  
  <div class="references">
    <h2>REFERENCES</h2>
    <p>[1] <cite>L. Chen, M. Wang, and S. Liu</cite>, "Theoretical foundations of efficient sorting," <em>IEEE Trans. Comput.</em>, vol. 45, no. 3, pp. 123-135, Mar. 2023.</p>
    <p>[2] <cite>A. Rodriguez and J. Kim</cite>, "Parallel sorting on modern architectures," in <em>Proc. IEEE Parallel Computing Conf.</em>, 2024, pp. 78-85.</p>
  </div>
</div>
`.trim()

/**
 * Nature/Springer style content with figures and complex table structures
 */
export const NATURE_FIGURE_SAMPLE = `
<article>
  <header>
    <h1>Quantum Entanglement in Biological Systems: Evidence from Photosynthetic Complexes</h1>
    <div class="authors">
      <span class="author">Dr. Sarah Chen<sup>1,*</sup></span>, 
      <span class="author">Prof. Michael Thompson<sup>2</sup></span>, 
      <span class="author">Dr. Lisa Wang<sup>1,3</sup></span>
    </div>
  </header>
  
  <section class="main-content">
    <p>Recent discoveries in quantum biology have revealed that biological systems can maintain quantum coherence at physiological temperatures <cite>Chen et al. (2024)</cite>. Our experiments demonstrate quantum entanglement in photosystem II complexes with remarkable efficiency.</p>
    
    <figure id="fig1">
      <img src="quantum-coherence-spectrum.png" alt="Quantum coherence spectrum" width="600" height="400" />
      <figcaption>
        <strong>Figure 1: Quantum coherence measurements in photosystem II.</strong> 
        <strong>a</strong>, Coherence time as a function of temperature showing unexpected stability up to 310K. 
        <strong>b</strong>, Entanglement fidelity measurements across different chlorophyll configurations. 
        Error bars represent standard deviation (n = 15 independent measurements). 
        <strong>c</strong>, Comparison with theoretical predictions from density functional theory calculations.
      </figcaption>
    </figure>
    
    <p>The experimental setup utilized femtosecond laser spectroscopy with the following parameters:</p>
    
    <table class="data-table">
      <caption><strong>Table 1: Experimental parameters and measured quantum properties</strong></caption>
      <thead>
        <tr>
          <th rowspan="2">Sample Type</th>
          <th colspan="3">Laser Parameters</th>
          <th colspan="2">Quantum Measurements</th>
        </tr>
        <tr>
          <th>Wavelength (nm)</th>
          <th>Pulse Duration (fs)</th>
          <th>Power (mW)</th>
          <th>Coherence Time (ps)</th>
          <th>Entanglement Fidelity</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Isolated PSII</td>
          <td>680 ± 5</td>
          <td>120</td>
          <td>0.5</td>
          <td>450 ± 50</td>
          <td>0.85 ± 0.03</td>
        </tr>
        <tr>
          <td>Native Complex</td>
          <td>680 ± 5</td>
          <td>120</td>
          <td>0.5</td>
          <td>380 ± 45</td>
          <td>0.92 ± 0.02</td>
        </tr>
        <tr>
          <td>Control (Classical)</td>
          <td>680 ± 5</td>
          <td>120</td>
          <td>0.5</td>
          <td>< 50</td>
          <td>0.12 ± 0.08</td>
        </tr>
      </tbody>
    </table>
  </section>
</article>
`.trim()

/**
 * Edge case: Malformed HTML that should be handled gracefully
 */
export const MALFORMED_HTML_SAMPLE = `
<div>
  <p>This has unclosed tags
  <span>Nested content
    <strong>Bold text
  <p>Another paragraph without proper closing
  <math><mi>x</mi><mo>=</mo><mn>42</mn>
  <code>function broken() {
    // Missing closing brace and tags
`.trim()

/**
 * Edge case: Very large academic document (condensed representation)
 */
export const LARGE_DOCUMENT_SAMPLE = `
<article class="large-document">
  <h1>Comprehensive Review of Machine Learning in Academic Publishing: A Meta-Analysis of 10,000 Papers</h1>
  ${Array.from({ length: 50 }, (_, i) => `
  <section id="section-${i + 1}">
    <h2>Section ${i + 1}: Literature Review Subset ${i + 1}</h2>
    <p>This section analyzes papers ${i * 200 + 1} through ${(i + 1) * 200} in our comprehensive dataset. Key findings include significant improvements in <cite>Author${i}.${i + 1} et al. (202${Math.floor(i / 10) + 1})</cite> methodologies.</p>
    <p>Mathematical analysis shows correlation coefficient <math><mi>r</mi><mo>=</mo><mn>0.${85 + Math.floor(i / 10)}</mn></math> with confidence interval [0.${80 + Math.floor(i / 10)}, 0.${90 + Math.floor(i / 10)}].</p>
    <pre><code>
# Analysis code for section ${i + 1}
def analyze_papers_${i + 1}(dataset):
    results = []
    for paper in dataset[${i * 200}:${(i + 1) * 200}]:
        score = calculate_relevance(paper)
        results.append(score)
    return np.mean(results)
    </code></pre>
  </section>
  `).join('')}
</article>
`.trim()

/**
 * Test sample with mixed academic content types
 */
export const MIXED_ACADEMIC_SAMPLE = `
<article>
  <h1>Interdisciplinary Approaches to Computational Biology</h1>
  
  <section class="introduction">
    <p>This work combines insights from computer science <cite>Knuth (1997)</cite>, molecular biology <cite>Watson & Crick (1953)</cite>, and quantum physics <cite>Schrödinger (1944)</cite>.</p>
  </section>
  
  <section class="theory">
    <h2>Theoretical Framework</h2>
    <p>The Hamiltonian for our system is given by:</p>
    <div class="equation">
      <math xmlns="http://www.w3.org/1998/Math/MathML">
        <mrow>
          <mi>H</mi><mo>=</mo>
          <munderover>
            <mo>∑</mo>
            <mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow>
            <mi>N</mi>
          </munderover>
          <mfrac>
            <msup><mi>p</mi><mn>2</mn></msup>
            <mrow><mn>2</mn><mi>m</mi></mrow>
          </mfrac>
          <mo>+</mo>
          <mi>V</mi><mo stretchy="false">(</mo><msub><mi>r</mi><mi>i</mi></msub><mo stretchy="false">)</mo>
        </mrow>
      </math>
    </div>
  </section>
  
  <section class="implementation">
    <h2>Computational Implementation</h2>
    <p>Our algorithm implements the following pseudocode:</p>
    <pre><code class="language-python">
def quantum_biological_simulation(system_params):
    """
    Simulate quantum effects in biological systems.
    
    This implementation preserves quantum coherence while
    accounting for thermal decoherence effects.
    """
    # Initialize quantum state
    psi = initialize_coherent_state(system_params)
    
    # Time evolution loop
    for t in range(0, max_time, dt):
        # Apply Hamiltonian evolution
        psi = evolve_schrodinger(psi, hamiltonian, dt)
        
        # Account for environmental decoherence
        psi = apply_decoherence(psi, environment_temp)
        
        # Measure observables
        energy = measure_energy(psi)
        coherence = measure_coherence_time(psi)
        
        yield t, energy, coherence
</code></pre>
  </section>
  
  <section class="results">
    <h2>Results and Discussion</h2>
    <p>Our simulations reveal that biological systems can maintain quantum coherence for time scales <math><mi>τ</mi><mo>></mo><mn>100</mn></math> fs at room temperature, consistent with experimental observations by <cite>Fleming et al. (2011)</cite>.</p>
  </section>
</article>
`.trim()

/**
 * Academic content samples organized by type for systematic testing
 */
export const ACADEMIC_TEST_SAMPLES = {
  arxiv: ARXIV_MATH_SAMPLE,
  pubmed: PUBMED_CITATION_SAMPLE,
  ieee: IEEE_TECHNICAL_SAMPLE,
  nature: NATURE_FIGURE_SAMPLE,
  mixed: MIXED_ACADEMIC_SAMPLE,
  malformed: MALFORMED_HTML_SAMPLE,
  large: LARGE_DOCUMENT_SAMPLE
}

/**
 * Test cases that should preserve specific formatting patterns
 */
export const PRESERVATION_TEST_CASES = [
  {
    name: 'Mathematical notation spacing',
    input: '<p>The equation <math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math> is fundamental.</p>',
    mustPreserve: ['<math><mi>E</mi><mo>=</mo><mi>m</mi><mi>c</mi><msup><mi>c</mi><mn>2</mn></msup></math>']
  },
  {
    name: 'Citation formatting',
    input: '<p>Recent work by <cite>Smith et al. (2024)</cite> shows improvement.</p>',
    mustPreserve: ['<cite>Smith et al. (2024)</cite>']
  },
  {
    name: 'Code block indentation',
    input: '<pre><code>def test():\n    return "hello"\n    # Comment</code></pre>',
    mustPreserve: ['    return "hello"', '    # Comment']
  },
  {
    name: 'Inline code elements',
    input: '<p>Use the <code>process_data()</code> function with <var>n</var> = 100.</p>',
    mustPreserve: ['<code>process_data()</code>', '<var>n</var>']
  }
]