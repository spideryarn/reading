# Service Mocking Guide for Tests

## Overview

As part of Stage 4 test restructuring, we've implemented automatic service mocking for the most commonly used database services. This guide explains how to use the new mocking infrastructure.

## Automatic Mocks

The following services are automatically mocked in `jest.setup.js`:
- `@/lib/services/database/ai-calls` - AiCallService
- `@/lib/services/database/enhancements` - EnhancementService  
- `@/lib/services/database/documents` - DocumentService
- `@/lib/prompts/types` - Prompt execution functions
- `@/lib/auth/server-auth` - Authentication functions

## Migration from Manual Mocking

### Old Pattern (Don't Use)
```typescript
// DON'T DO THIS - causes "mockImplementation is not a function" errors
jest.mock('@/lib/services/database/documents')
const MockDocumentService = DocumentService as jest.MockedClass<typeof DocumentService>
MockDocumentService.mockImplementation(() => mockDocumentService)
```

### New Pattern (Use This)
```typescript
import { DocumentService } from '@/lib/services/database/documents'

// The service is already mocked, just create an instance
const documentService = new DocumentService({} as any)

// Mock specific methods
jest.spyOn(documentService, 'getById').mockResolvedValue(mockDocument)
```

## Using the Service Mock Helpers

We provide helper utilities in `@/lib/testing/service-mocks`:

```typescript
import { 
  getMockAiCallService,
  getMockEnhancementService,
  getMockDocumentService,
  setupCommonServiceMocks,
  createMockAiCall,
  createMockEnhancement,
  createMockDocument
} from '@/lib/testing/service-mocks'

// Get properly typed mock service instances
const aiCallService = getMockAiCallService()
const enhancementService = getMockEnhancementService()
const documentService = getMockDocumentService()

// Or use the convenience function that sets up all three with defaults
const { aiCallService, enhancementService, documentService } = setupCommonServiceMocks()

// Create mock data
const mockAiCall = createMockAiCall({ id: 'custom-id' })
const mockEnhancement = createMockEnhancement({ type: 'summary' })
const mockDocument = createMockDocument({ title: 'My Test Doc' })
```

## Complete Example

```typescript
import { POST } from '../headings/route'
import { createMockRequest } from './test-helpers'
import { validateAuth } from '@/lib/auth/server-auth'
import { executePromptWithUsage } from '@/lib/prompts/types'
import { setupCommonServiceMocks } from '@/lib/testing/service-mocks'

const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>
const mockExecutePromptWithUsage = executePromptWithUsage as jest.MockedFunction<typeof executePromptWithUsage>

describe('/api/headings', () => {
  const { aiCallService, enhancementService } = setupCommonServiceMocks()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up auth
    mockValidateAuth.mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com'
    } as any)
    
    // Set up LLM response
    mockExecutePromptWithUsage.mockResolvedValue({
      text: JSON.stringify({ headings: [...] }),
      usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      finishReason: 'stop'
    })
    
    // Customize service behaviors for this test
    jest.spyOn(enhancementService, 'get').mockResolvedValue(null) // No cache
  })

  it('should generate headings', async () => {
    const request = createMockRequest('http://localhost:3000/api/headings', {
      method: 'POST',
      body: { html_content: '<p>Test</p>', documentId: 'doc-123' }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    // Verify service calls
    expect(aiCallService.startCallWithModelString).toHaveBeenCalledWith({
      userId: 'test-user-id',
      documentId: 'doc-123',
      modelString: expect.any(String),
      prompt_type: 'headings',
      input_data: expect.any(Object)
    })
  })
})
```

## Important Notes

1. **Mock Data Isolation**: Each test starts with clean mock data stores. The `beforeEach` in `jest.setup.js` automatically clears all mock data.

2. **Don't Re-mock**: Since services are already mocked globally, don't add `jest.mock()` calls for these services in your test files.

3. **Type Safety**: The mock implementations maintain the same TypeScript interfaces as the real services.

4. **Mock Methods**: All service methods are available but return default values. Use `jest.spyOn()` to customize behavior for specific tests.

5. **Multimodal Prompts**: For tests using multimodal prompts (PDF/image processing), use:
   - `loadMultimodalPromptTemplate` / `loadMultimodalPromptTemplateFromCaller`
   - `executeMultimodalPrompt` / `executeMultimodalPromptWithUsage`

## Troubleshooting

### "mockImplementation is not a function"
This error occurs when trying to mock an already-mocked service. Remove the manual mock setup and use the service directly.

### "Cannot find module" for services
Make sure you're importing from the correct path and that the service is listed in the automatic mocks in `jest.setup.js`.

### Mock not returning expected values
Check that you're using `jest.spyOn()` on the service instance, not the class:
```typescript
// ❌ Wrong
jest.spyOn(DocumentService, 'getById').mockResolvedValue(doc)

// ✅ Correct  
const documentService = new DocumentService({} as any)
jest.spyOn(documentService, 'getById').mockResolvedValue(doc)
```

## See Also
- `lib/testing/service-mocks.ts` - Mock helper utilities
- `jest.setup.js` - Global mock configuration
- `lib/services/database/__mocks__/` - Mock implementations