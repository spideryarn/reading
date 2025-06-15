# LLM Evaluation Frameworks for Content Extraction

## Summary

This document analyses evaluation frameworks suitable for testing HTML/PDF transcription quality in the Spideryarn Reading project. Based on requirements for programmatic API access, content extraction metrics, and budget constraints (<$30/month), we recommend **DeepEval** as the primary framework, with **Ragas** as an alternative for specific use cases.

## Requirements Analysis

### Core Requirements
- **Programmatic API** for automated evaluation runs
- **Small evaluation dataset** (2-5 high-value static examples)
- **Content extraction metrics** (Levenshtein distance, structural preservation)
- **Budget**: <$30/month (ideally free during prototype phase)
- **Manual execution** rather than CI/CD integration

### Evaluation Focus Areas
1. **Content fidelity**: Exact text preservation for critical elements
2. **Structure preservation**: Tables, formulae, footnotes, hierarchical headings
3. **Noise removal**: Ads, navigation, page numbers stripped correctly
4. **Error handling**: Graceful handling of malformed HTML

## Framework Comparison

### 1. DeepEval (Recommended)

**Strengths:**
- Comprehensive metric library (14+ metrics)
- Self-explaining metrics with detailed failure reasons
- Simple API for programmatic use
- Excellent documentation for beginners
- Free and open source
- Works with any LLM framework

**Implementation Example:**
```python
from deepeval import evaluate
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric
)
from deepeval.test_case import LLMTestCase

# Define test case for content extraction
test_case = LLMTestCase(
    input="<html>Complex academic paper...</html>",
    actual_output=extracted_content,
    expected_output=gold_standard,
    context=["extraction_prompt", "html_structure"]
)

# Evaluate with multiple metrics
metrics = [
    AnswerRelevancyMetric(threshold=0.7),
    FaithfulnessMetric(threshold=0.85),
    ContextualPrecisionMetric(threshold=0.8)
]

results = evaluate(test_cases=[test_case], metrics=metrics)
```

### 2. Ragas (Alternative)

**Strengths:**
- Specifically designed for RAG evaluation
- Simple API with HuggingFace integration
- Good for document-based evaluation
- Free courses from DeepLearning.AI

**When to use:**
- If focusing on RAG-specific metrics
- When working with document retrieval pipelines

### 3. Braintrust.dev (Enterprise-Oriented Alternative)

**Strengths:**
- Free tier suitable for small projects (1M traces, 1GB data)
- Built-in Levenshtein distance scorer
- Visual comparison tools and playground UI
- Well-integrated tracing and debugging
- Python, TypeScript, and Java SDKs

**Limitations:**
- Closed-source (less customizable)
- More complex setup than alternatives
- 14-day data retention on free tier
- Dense documentation can overwhelm new users
- Lacks built-in HTML/PDF specific features

**When to use:**
- If you need enterprise-grade infrastructure
- When visual debugging tools are important
- If you're already in the Braintrust ecosystem

### 4. Custom Hybrid Approach (Recommended Implementation)

Given the specific requirements, we recommend a hybrid approach:

1. **Use DeepEval** for LLM-based evaluation metrics
2. **Implement custom metrics** for content extraction specifics:
   - Levenshtein distance calculation
   - Structural element counting
   - Mathematical notation preservation
   - Table integrity checking

## Evaluation Metrics for Content Extraction

### 1. String-Based Metrics

**Levenshtein Distance**
```python
import Levenshtein

def content_similarity_score(original, extracted):
    """Calculate normalized Levenshtein similarity"""
    distance = Levenshtein.distance(original, extracted)
    max_len = max(len(original), len(extracted))
    return 1 - (distance / max_len) if max_len > 0 else 1
```

**Benefits:**
- Character-level precision
- Good for exact preservation requirements
- Fast computation

**Limitations:**
- No semantic understanding
- Sensitive to formatting changes

Note: if we decide to use Levenshtein distance or similar on HTML, we should run it through an HTML prettifier to standardise all of the HTML markup.

see also `fuzzywuzzy` and its suite of normalised text difference scores...


### 2. Structural Metrics

**Element Preservation**
```python
def structural_fidelity_score(original_html, extracted_html):
    """Measure preservation of structural elements"""
    original_dom = BeautifulSoup(original_html, 'html.parser')
    extracted_dom = BeautifulSoup(extracted_html, 'html.parser')
    
    metrics = {
        'tables': len(extracted_dom.find_all('table')) / max(len(original_dom.find_all('table')), 1),
        'headings': len(extracted_dom.find_all(['h1', 'h2', 'h3'])) / max(len(original_dom.find_all(['h1', 'h2', 'h3'])), 1),
        'lists': len(extracted_dom.find_all(['ul', 'ol'])) / max(len(original_dom.find_all(['ul', 'ol'])), 1),
        'math': len(extracted_dom.find_all(['math', '[data-equation]'])) / max(len(original_dom.find_all(['math', '[data-equation]'])), 1)
    }
    
    return sum(metrics.values()) / len(metrics)
```

### 3. Content-Specific Metrics

**Academic Content Preservation**
```python
def academic_content_score(original, extracted):
    """Evaluate preservation of academic elements"""
    checks = {
        'citations': check_citation_preservation(original, extracted),
        'equations': check_equation_preservation(original, extracted),
        'figures': check_figure_preservation(original, extracted),
        'references': check_reference_preservation(original, extracted)
    }
    return sum(checks.values()) / len(checks)
```

### 4. Noise Removal Metrics

**Peripheral Content Filtering**
```python
def noise_removal_score(extracted_html):
    """Check that unwanted elements are removed"""
    dom = BeautifulSoup(extracted_html, 'html.parser')
    
    unwanted_elements = [
        'nav', '.advertisement', '.ads', 
        '.social-sharing', '.newsletter-signup',
        'script', 'footer.site-footer'
    ]
    
    found_unwanted = sum(1 for selector in unwanted_elements 
                        if dom.select(selector))
    
    return 1 - (found_unwanted / len(unwanted_elements))
```

## Implementation Strategy

### 1. Evaluation Dataset Structure

```python
# evaluation_dataset.py
EVALUATION_EXAMPLES = [
    {
        'id': 'academic-paper-complex',
        'name': 'Complex Academic Paper with Math',
        'source_html': 'path/to/source.html',
        'gold_standard': 'path/to/expected.html',
        'critical_checks': [
            {'type': 'exact_text', 'value': 'DOI: 10.1038/nature.2024.12345'},
            {'type': 'element_count', 'selector': 'table', 'count': 3},
            {'type': 'math_preservation', 'min_equations': 5}
        ],
        'weight': 2.0  # Higher weight for more important examples
    },
    {
        'id': 'news-article-ads',
        'name': 'News Article with Heavy Advertising',
        'source_html': 'path/to/news.html',
        'gold_standard': 'path/to/expected_news.html',
        'critical_checks': [
            {'type': 'no_element', 'selector': '.advertisement'},
            {'type': 'preserve_quotes', 'min_count': 3}
        ],
        'weight': 1.0
    }
]
```

### 2. Evaluation Runner

```python
# run_evaluation.py
import deepeval
from deepeval.metrics import GEval

class ContentExtractionEvaluator:
    def __init__(self, framework='deepeval'):
        self.framework = framework
        self.metrics = self._initialize_metrics()
    
    def _initialize_metrics(self):
        return {
            'content_fidelity': GEval(
                name="Content Fidelity",
                criteria="The extracted content preserves all critical information from the original",
                evaluation_params=[
                    ("original_html", str),
                    ("extracted_html", str)
                ],
                threshold=0.8
            ),
            'structure_preservation': GEval(
                name="Structure Preservation",
                criteria="Tables, lists, and hierarchical elements maintain their structure",
                threshold=0.85
            ),
            'noise_removal': GEval(
                name="Noise Removal",
                criteria="Advertisements, navigation, and peripheral content are removed",
                threshold=0.9
            )
        }
    
    def evaluate_extraction(self, source_html, extracted_html, example_id):
        """Run evaluation on a single example"""
        results = {
            'example_id': example_id,
            'string_similarity': content_similarity_score(source_html, extracted_html),
            'structural_fidelity': structural_fidelity_score(source_html, extracted_html),
            'academic_preservation': academic_content_score(source_html, extracted_html),
            'noise_removal': noise_removal_score(extracted_html)
        }
        
        # Run DeepEval metrics
        if self.framework == 'deepeval':
            for metric_name, metric in self.metrics.items():
                score = metric.measure(source_html, extracted_html)
                results[f'deepeval_{metric_name}'] = score
        
        return results
    
    def run_full_evaluation(self):
        """Run evaluation on entire dataset"""
        all_results = []
        
        for example in EVALUATION_EXAMPLES:
            source = load_file(example['source_html'])
            extracted = self.extract_content(source)  # Your extraction method
            
            results = self.evaluate_extraction(
                source, 
                extracted, 
                example['id']
            )
            
            # Run critical checks
            critical_passed = self.run_critical_checks(
                extracted, 
                example['critical_checks']
            )
            results['critical_checks_passed'] = critical_passed
            
            # Weight results
            results['weighted_score'] = (
                sum(v for k, v in results.items() if isinstance(v, (int, float))) 
                * example['weight']
            )
            
            all_results.append(results)
        
        return self.generate_report(all_results)
```

### 3. Integration with Existing Tests

```typescript
// app/api/__tests__/extract-url-evaluation.test.ts
import { runContentExtractionEvaluation } from '@/lib/testing/evaluation-runner'

describe('Content Extraction Evaluation', () => {
  it('should achieve target scores on evaluation dataset', async () => {
    const results = await runContentExtractionEvaluation({
      dataset: 'static-examples',
      metrics: ['levenshtein', 'structural', 'academic'],
      framework: 'deepeval'
    })
    
    expect(results.overallScore).toBeGreaterThan(0.85)
    expect(results.criticalFailures).toBe(0)
    
    // Save results for tracking
    await saveEvaluationResults(results)
  })
})
```

## Community Sentiment & Recommendations

### Developer Preferences (Based on Community Research)

1. **DeepEval** - Community Favorite
   - "Pytest for LLMs" - familiar testing interface
   - Best developer experience with self-explaining metrics
   - Strong community support and documentation
   - Some free tier limitations but core is open source

2. **Ragas** - Budget-Conscious Choice
   - Completely free forever, no limitations
   - Strong research foundation but less polished DX
   - Can be frustrating to debug (NaN scores, JSON issues)
   - Good for those comfortable with research-oriented tools

3. **Braintrust** - Enterprise Alternative
   - Free tier works for small projects
   - More complex than necessary for simple evaluations
   - Limited community discussion
   - Better suited for larger teams

### For Content Extraction Projects
Community consensus: Start with **DeepEval** for better DX or **Ragas** for unlimited free usage. Braintrust is overkill unless you need enterprise features.

## Cost Analysis

### Free Options
1. **DeepEval**: Core framework free, hosted service has free tier
2. **Ragas**: Completely free, open source
3. **Braintrust**: Free tier (1M traces, 14-day retention)
4. **Custom metrics**: No cost beyond development time

### Potential Costs
- **LLM API calls** for LLM-as-judge metrics (~$0.01-0.05 per evaluation)
- **Storage** for evaluation results (minimal)
- **Compute** for running evaluations (local execution)

### Estimated Monthly Cost
- Manual runs (10x/month): ~$0.50
- Automated daily runs: ~$15/month
- **Recommendation**: Start with manual runs, well within budget

## Recommendations

### Immediate Actions
1. **Install DeepEval**: `pip install deepeval`
2. **Create evaluation dataset** with 2-3 high-value examples
3. **Implement hybrid metrics** combining DeepEval + custom metrics
4. **Set up manual evaluation script** for on-demand runs

### Example Implementation Timeline
- Week 1: Set up DeepEval, create first evaluation example
- Week 2: Implement custom metrics for structure/math preservation
- Week 3: Add 2-3 more examples, refine metrics
- Week 4: Create reporting dashboard, establish baselines

### Success Metrics
- Overall extraction quality: >85%
- Critical content preservation: 100%
- Noise removal effectiveness: >90%
- Evaluation run time: <2 minutes

## Related Documentation
- [`docs/reference/HTML_CONTENT_PROCESSING_OVERVIEW.md`](./HTML_CONTENT_PROCESSING_OVERVIEW.md) - Comprehensive HTML processing guide including content fidelity testing
- [`docs/reference/TESTING_OVERVIEW.md`](./TESTING_OVERVIEW.md) - General testing approach
- [`app/api/__tests__/extract-url-content-fidelity-static.test.ts`](../../app/api/__tests__/extract-url-content-fidelity-static.test.ts) - Static test implementation example