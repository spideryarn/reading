import path from 'path'

// Load env variables
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: '.env.local' })

// Ensure real AI SDK implementation
jest.unmock('ai')

// Ensure real fs (some other tests mock it)
jest.unmock('fs')

// Use requireActual to bypass global mocks in jest.setup.js
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { headingsPrompt, headingsResponseSchema } = jest.requireActual('../templates/headings') as typeof import('../templates/headings')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { executePromptWithUsage } = jest.requireActual('../types') as typeof import('../types')

// Real-LLM integration test. Guarded behind env flag to prevent accidental runs in CI.
const SHOULD_RUN = process.env.RUN_REAL_LLM_TESTS === 'true'

// eslint-disable-next-line jest/no-export
export const maybeRunRealLLMTest = SHOULD_RUN ? describe : describe.skip

// Patch templatePath to absolute path (stack detection fails in mocked env)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
headingsPrompt.templatePath = path.resolve(__dirname, '../templates/headings.njk')

maybeRunRealLLMTest('Headings prompt – real LLM integration', () => {
  it('should return valid heading operations referencing only existing element IDs', async () => {
    // Sample, mildly-meaningful HTML body. IDs must be unique and descriptive so the LLM can reference them.
    const htmlContent = `
      <h1 id="title">The History of Tea</h1>
      <p id="intro">Tea has a rich and fascinating history that spans thousands of years and multiple continents.</p>
      <p id="ancient-china">In ancient China, tea was discovered—at least according to legend—by Emperor Shen Nong.</p>
      <p id="spread-to-japan">Over centuries, tea culture spread to Japan, evolving into the elaborate tea ceremony.</p>
      <p id="industrial-revolution">The industrial revolution and colonial trade brought tea to Europe and beyond.</p>
      <p id="modern-day">Today, tea is the second most consumed beverage in the world after water.</p>
    `

    // Collect all element IDs from the sample HTML so we can validate later.
    const idsInHtml = new Set<string>()
    const idPattern = /id="([^"]+)"/g
    let match
    while ((match = idPattern.exec(htmlContent)) !== null) {
      idsInHtml.add(match[1])
    }

    // Request the first iteration (iteration_count=0) with the default operation cap.
    const result = await executePromptWithUsage(headingsPrompt, {
      html_content: htmlContent,
      iteration_count: 0,
      MAX_HEADING_OPERATIONS_PER_ITERATION: 10,
    })

    // After executePromptWithUsage, but before parse, log
    const rawText = result.text
    console.log('\n--- RAW LLM OUTPUT ---\n', rawText.substring(0, 1000), '\n--- END RAW ---')

    // Parse and validate the JSON the LLM returned (strip ``` fences if present)
    const { stripMarkdownCodeFence } = jest.requireActual('../utils') as typeof import('../utils')
    const cleaned = stripMarkdownCodeFence(rawText)
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (err) {
      // If parsing fails, surface useful info.
      throw new Error(`Failed to parse LLM JSON. Cleaned output:\n${cleaned}`)
    }

    const validated = headingsResponseSchema.parse(parsed)

    // Core assertion: every operation must reference an ID that exists in htmlContent.
    validated.operations.forEach(op => {
      if (op.action === 'insert') {
        // insertNewBeforeExistingId is required for insert operations
        expect(idsInHtml.has(op.insertNewBeforeExistingId!)).toBe(true)
      } else if (op.action === 'replace' || op.action === 'remove') {
        expect(idsInHtml.has(op.targetId!)).toBe(true)
      }
    })

    // Additional sanity checks.
    expect(validated.operations.length).toBeLessThanOrEqual(10)
    expect(typeof validated.iteration_summary).toBe('string')
  }, 60_000) // allow up to 60s for external network call
}) 