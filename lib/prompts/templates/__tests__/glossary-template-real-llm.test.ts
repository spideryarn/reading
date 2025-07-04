/**
 * Real LLM Integration Tests for Glossary Template
 * 
 * Tests the glossary prompt template with actual LLM calls using test-tier models
 * to ensure the prompt generates valid responses and template logic works correctly.
 * Uses cheaper Gemini Flash model to stay within test budget.
 * 
 * @jest-environment node
 */

// Load test environment with cheaper model
require('dotenv').config({ path: '.env.test' })

// Unmock everything needed for real LLM calls
jest.unmock('@/lib/prompts/types')
jest.unmock('@/lib/services/llm-provider')
jest.unmock('@ai-sdk/anthropic')
jest.unmock('@ai-sdk/google')
jest.unmock('ai')

// Test guard
const SHOULD_RUN_REAL_LLM = process.env.NODE_ENV === 'test' && process.env.GOOGLE_GENERATIVE_AI_API_KEY

const testSuite = SHOULD_RUN_REAL_LLM ? describe : describe.skip

testSuite('Glossary Template - Real LLM Integration', () => {
  // Dynamic imports to avoid module loading issues
  let glossaryPrompt: any
  let executePromptWithUsage: any

  beforeAll(async () => {
    // Import after jest setup
    const glossaryModule = await import('../glossary')
    const typesModule = await import('../../types')
    
    glossaryPrompt = glossaryModule.glossaryPrompt
    executePromptWithUsage = typesModule.executePromptWithUsage
  })

  // Test timeout for LLM calls (45 seconds)
  const LLM_TIMEOUT = 45000

  describe('Real LLM Execution', () => {
    it('should generate valid entities from real document content using Gemini Flash', async () => {
      const testContent = `
        Machine learning is a subset of artificial intelligence (AI) that enables computers to learn 
        and make decisions from data without being explicitly programmed. Neural networks are a key 
        component of deep learning, inspired by the structure of biological neurons in the brain.
        
        Convolutional Neural Networks (CNNs) are particularly effective for image recognition tasks,
        while Recurrent Neural Networks (RNNs) excel at processing sequential data like text and speech.
        The transformer architecture, introduced in 2017, revolutionized natural language processing
        with models like BERT and GPT becoming state-of-the-art for various NLP tasks.
      `

      const input = {
        content: testContent,
        max_entities: 8 // Keep small for cost efficiency
      }

      const result = await executePromptWithUsage(glossaryPrompt, input)

      // Validate response structure
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('usage')
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeLessThan(4000) // Gemini Flash efficiency check

      // Parse and validate the generated entities
      let entities
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = result.text.trim()
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim()
        }
        
        const parsed = JSON.parse(jsonText)
        // Handle both direct array format and object with entities property
        entities = Array.isArray(parsed) ? parsed : parsed.entities || parsed
      } catch (e) {
        console.log('Raw LLM response:', result.text)
        throw new Error(`Response was not valid JSON: ${result.text.substring(0, 500)}...`)
      }

      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBeGreaterThan(0)
      expect(entities.length).toBeLessThanOrEqual(8)

      // Validate entity structure
      entities.forEach((entity: any, index: number) => {
        expect(entity).toHaveProperty('name')
        expect(entity).toHaveProperty('ontology')
        expect(entity).toHaveProperty('aliases')
        expect(entity).toHaveProperty('brief_explanation')
        expect(typeof entity.name).toBe('string')
        expect(entity.name.length).toBeGreaterThan(0)
        expect(Array.isArray(entity.aliases)).toBe(true)
        expect(typeof entity.brief_explanation).toBe('string')
      })

      // Check that some expected ML concepts are captured
      const entityNames = entities.map((e: any) => e.name.toLowerCase())
      const hasMLConcepts = entityNames.some(name => 
        name.includes('machine learning') || 
        name.includes('neural network') || 
        name.includes('artificial intelligence') ||
        name.includes('cnn') ||
        name.includes('rnn') ||
        name.includes('transformer')
      )
      expect(hasMLConcepts).toBe(true)

      console.log(`✅ Real LLM test passed. Generated ${entities.length} entities using ${result.usage.totalTokens} tokens`)
    }, LLM_TIMEOUT)

    it('should handle generate more mode with existing entities', async () => {
      const testContent = `
        Supervised learning algorithms require labeled training data to learn patterns and make predictions.
        Common supervised learning tasks include classification and regression. Unsupervised learning,
        in contrast, finds patterns in data without labeled examples, including clustering and 
        dimensionality reduction techniques like Principal Component Analysis (PCA).
      `

      const existingEntities = [
        {
          name: 'Machine Learning',
          ontology: 'concept' as const,
          aliases: ['ML'],
          brief_explanation: 'A subset of AI that enables computers to learn from data'
        }
      ]

      const input = {
        content: testContent,
        max_entities: 5,
        existing_entities: existingEntities
      }

      const result = await executePromptWithUsage(glossaryPrompt, input)

      // Validate response
      expect(result.usage.totalTokens).toBeGreaterThan(0)
      
      let entities
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = result.text.trim()
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim()
        }
        
        const parsed = JSON.parse(jsonText)
        // Handle both direct array format and object with entities property
        entities = Array.isArray(parsed) ? parsed : parsed.entities || parsed
      } catch (e) {
        console.log('Raw LLM response:', result.text)
        throw new Error(`Response was not valid JSON: ${result.text.substring(0, 500)}...`)
      }

      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBeGreaterThan(0)

      // Should generate new entities, not duplicate existing ones
      const entityNames = entities.map((e: any) => e.name.toLowerCase())
      const hasDuplicateML = entityNames.some(name => 
        name.includes('machine learning') && name === 'machine learning'
      )
      expect(hasDuplicateML).toBe(false)

      // Should capture concepts from the new content
      const hasSupervised = entityNames.some(name => 
        name.includes('supervised') || 
        name.includes('classification') || 
        name.includes('regression') ||
        name.includes('unsupervised') ||
        name.includes('clustering') ||
        name.includes('pca')
      )
      expect(hasSupervised).toBe(true)

      console.log(`✅ Generate more mode test passed. Generated ${entities.length} entities using ${result.usage.totalTokens} tokens`)
    }, LLM_TIMEOUT)

    it('should respect token usage limits for cost efficiency', async () => {
      const shortContent = 'Neural networks process information using interconnected nodes called neurons.'

      const input = {
        content: shortContent,
        max_entities: 3
      }

      const result = await executePromptWithUsage(glossaryPrompt, input)

      // Check cost efficiency - Gemini Flash should use fewer tokens
      expect(result.usage.promptTokens).toBeLessThan(1500)
      expect(result.usage.completionTokens).toBeLessThan(500)
      expect(result.usage.totalTokens).toBeLessThan(2000)

      // Validate basic functionality
      let entities
      try {
        // Extract JSON from markdown code blocks if present
        let jsonText = result.text.trim()
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
        if (jsonMatch) {
          jsonText = jsonMatch[1].trim()
        }
        
        const parsed = JSON.parse(jsonText)
        // Handle both direct array format and object with entities property
        entities = Array.isArray(parsed) ? parsed : parsed.entities || parsed
      } catch (e) {
        console.log('Raw LLM response:', result.text)
        throw new Error(`Response was not valid JSON: ${result.text.substring(0, 500)}...`)
      }

      expect(Array.isArray(entities)).toBe(true)
      expect(entities.length).toBeGreaterThan(0)
      expect(entities.length).toBeLessThanOrEqual(3)

      console.log(`✅ Cost efficiency test passed. Used ${result.usage.totalTokens} tokens for ${entities.length} entities`)
    }, LLM_TIMEOUT)
  })

  describe('Template Configuration Validation', () => {
    it('should use appropriate model configuration for real execution', async () => {
      expect(glossaryPrompt.name).toBe('glossary')
      console.log('Glossary prompt description:', glossaryPrompt.description)
      expect(glossaryPrompt.description).toContain('glossary') // More flexible check
      expect(glossaryPrompt.templatePath).toContain('glossary.njk')
      expect(glossaryPrompt.modelConfig).toBeDefined()
      
      // Should be configured for cost-efficient token usage
      expect(glossaryPrompt.modelConfig?.maxTokens).toBe(8000)
      expect(glossaryPrompt.modelConfig?.temperature).toBe(0.3)
    })

    it('should validate input schema correctly for real calls', () => {
      const validInput = {
        content: 'Test content with actual text for entity extraction',
        max_entities: 5,
        existing_entities: []
      }
      
      const result = glossaryPrompt.schema.safeParse(validInput)
      expect(result.success).toBe(true)

      const invalidInput = {
        content: '', // Empty content
        max_entities: -1 // Invalid number
      }
      
      const invalidResult = glossaryPrompt.schema.safeParse(invalidInput)
      expect(invalidResult.success).toBe(false)
    })
  })
})