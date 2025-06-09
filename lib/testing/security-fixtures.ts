/**
 * Security Test Fixtures and Data
 * 
 * Provides standardized test data for security testing scenarios,
 * including documents, enhancements, AI calls, and chat data with explicit ownership.
 */

import { TEST_USERS, TEST_USER_IDS } from './rls-test-context'

/**
 * Document test fixtures with explicit ownership
 */
export const SECURITY_TEST_DOCUMENTS = {
  USER_A_DOCUMENT: {
    title: 'User A Private Document',
    slug: 'user-a-private-doc',
    html_content: '<h1>User A Content</h1><p>This is a private document owned by User A.</p>',
    plaintext_content: 'User A Content\n\nThis is a private document owned by User A.',
    source_url: null,
    is_public: false,
    word_count: 12,
    created_by: TEST_USER_IDS.USER_A,
  },
  
  USER_B_DOCUMENT: {
    title: 'User B Private Document', 
    slug: 'user-b-private-doc',
    html_content: '<h1>User B Content</h1><p>This is a private document owned by User B.</p>',
    plaintext_content: 'User B Content\n\nThis is a private document owned by User B.',
    source_url: null,
    is_public: false,
    word_count: 12,
    created_by: TEST_USER_IDS.USER_B,
  },

  PUBLIC_DOCUMENT: {
    title: 'Public Document',
    slug: 'public-document',
    html_content: '<h1>Public Content</h1><p>This is a public document visible to all.</p>',
    plaintext_content: 'Public Content\n\nThis is a public document visible to all.',
    source_url: 'https://example.com/public-doc',
    is_public: true,
    word_count: 11,
    created_by: TEST_USER_IDS.USER_A, // Owned by User A but public
  },

  SHARED_DOCUMENT: {
    title: 'Shared Research Paper',
    slug: 'shared-research-paper',
    html_content: '<h1>Research Paper</h1><p>This document is shared between users.</p>',
    plaintext_content: 'Research Paper\n\nThis document is shared between users.',
    source_url: 'https://example.com/research-paper',
    is_public: false,
    word_count: 9,
    created_by: TEST_USER_IDS.USER_A, // Owned by User A, shared with others
  }
} as const

/**
 * Document enhancement test fixtures
 */
export const SECURITY_TEST_ENHANCEMENTS = {
  USER_A_ENHANCEMENT: {
    enhancement_type: 'ai_headings',
    enhancement_data: {
      headings: [
        { level: 1, text: 'User A Heading 1', id: 'ua-h1' },
        { level: 2, text: 'User A Heading 2', id: 'ua-h2' }
      ]
    },
    status: 'completed' as const,
  },

  USER_B_ENHANCEMENT: {
    enhancement_type: 'ai_summary',
    enhancement_data: {
      summary: 'This is a summary generated for User B document',
      granularity: 'medium'
    },
    status: 'completed' as const,
  },

  GLOSSARY_ENHANCEMENT: {
    enhancement_type: 'ai_glossary',
    enhancement_data: {
      terms: [
        { term: 'API', definition: 'Application Programming Interface' },
        { term: 'RLS', definition: 'Row Level Security' }
      ]
    },
    status: 'completed' as const,
  }
} as const

/**
 * AI call test fixtures for billing and traceability testing
 */
export const SECURITY_TEST_AI_CALLS = {
  USER_A_AI_CALL: {
    provider: 'anthropic',
    model_id: 'claude-3-haiku-20240307',
    prompt_type: 'headings',
    input_data: {
      document_title: 'User A Document',
      content_length: 1000
    },
    output_data: {
      headings_generated: 5,
      processing_time_ms: 2000
    },
    usage: {
      prompt_tokens: 500,
      completion_tokens: 150,
      total_tokens: 650
    },
    cost_cents: 65,
    finish_reason: 'stop',
    created_by: TEST_USER_IDS.USER_A,
  },

  USER_B_AI_CALL: {
    provider: 'google', 
    model_id: 'gemini-1.5-pro',
    prompt_type: 'summarize',
    input_data: {
      document_title: 'User B Document',
      content_length: 2000
    },
    output_data: {
      summary_length: 300,
      processing_time_ms: 3000
    },
    usage: {
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200
    },
    cost_cents: 120,
    finish_reason: 'stop',
    created_by: TEST_USER_IDS.USER_B,
  }
} as const

/**
 * Chat thread and message test fixtures
 */
export const SECURITY_TEST_CHAT = {
  USER_A_THREAD: {
    title: 'User A Chat Thread',
    created_by: TEST_USER_IDS.USER_A,
  },

  USER_B_THREAD: {
    title: 'User B Chat Thread',
    created_by: TEST_USER_IDS.USER_B,
  },

  SAMPLE_MESSAGES: [
    {
      role: 'user' as const,
      content: 'What is the main theme of this document?',
    },
    {
      role: 'assistant' as const,
      content: 'Based on the document content, the main theme appears to be...',
    },
    {
      role: 'user' as const,
      content: 'Can you elaborate on the key points?',
    }
  ]
} as const

/**
 * Profile test fixtures
 */
export const SECURITY_TEST_PROFILES = {
  USER_A_PROFILE: {
    user_id: TEST_USER_IDS.USER_A,
    display_name: 'Test User A',
    avatar_url: 'https://example.com/avatar-a.jpg',
    bio: 'User A profile for security testing',
    preferences: {
      theme: 'light',
      notifications: true
    }
  },

  USER_B_PROFILE: {
    user_id: TEST_USER_IDS.USER_B,
    display_name: 'Test User B', 
    avatar_url: 'https://example.com/avatar-b.jpg',
    bio: 'User B profile for security testing',
    preferences: {
      theme: 'dark',
      notifications: false
    }
  }
} as const

/**
 * Security test scenarios for comprehensive testing
 */
export const SECURITY_TEST_SCENARIOS = {
  /**
   * Document ownership isolation test
   */
  DOCUMENT_ISOLATION: {
    name: 'Document Ownership Isolation',
    description: 'User A cannot access User B documents and vice versa',
    setup: {
      userADocument: SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT,
      userBDocument: SECURITY_TEST_DOCUMENTS.USER_B_DOCUMENT,
    },
    expectations: {
      userACannotAccessUserBDocs: true,
      userBCannotAccessUserADocs: true,
      usersCanAccessOwnDocs: true,
    }
  },

  /**
   * Enhancement inheritance test
   */
  ENHANCEMENT_INHERITANCE: {
    name: 'Enhancement Access Inheritance',
    description: 'Enhancements follow document ownership rules',
    setup: {
      document: SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT,
      enhancement: SECURITY_TEST_ENHANCEMENTS.USER_A_ENHANCEMENT,
    },
    expectations: {
      ownerCanAccessEnhancement: true,
      otherUsersCannotAccessEnhancement: true,
    }
  },

  /**
   * AI call billing isolation test
   */
  AI_CALL_BILLING: {
    name: 'AI Call Billing Isolation',
    description: 'Users can only see AI calls for documents they own',
    setup: {
      userACall: SECURITY_TEST_AI_CALLS.USER_A_AI_CALL,
      userBCall: SECURITY_TEST_AI_CALLS.USER_B_AI_CALL,
    },
    expectations: {
      usersCanSeeOwnAICalls: true,
      usersCannotSeeOthersAICalls: true,
      billingTraceabilityMaintained: true,
    }
  },

  /**
   * Chat thread isolation test
   */
  CHAT_ISOLATION: {
    name: 'Chat Thread Isolation',
    description: 'Chat threads follow document ownership',
    setup: {
      userAThread: SECURITY_TEST_CHAT.USER_A_THREAD,
      userBThread: SECURITY_TEST_CHAT.USER_B_THREAD,
      messages: SECURITY_TEST_CHAT.SAMPLE_MESSAGES,
    },
    expectations: {
      usersCanAccessOwnThreads: true,
      usersCannotAccessOthersThreads: true,
      messagesFollowThreadAccess: true,
    }
  },

  /**
   * Public document access test
   */
  PUBLIC_ACCESS: {
    name: 'Public Document Access',
    description: 'Public documents accessible to all, private documents only to owners',
    setup: {
      publicDocument: SECURITY_TEST_DOCUMENTS.PUBLIC_DOCUMENT,
      privateDocument: SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT,
    },
    expectations: {
      authenticatedUsersCanAccessPublic: true,
      unauthenticatedUsersCanAccessPublic: true, // Future phase
      onlyOwnersCanAccessPrivate: true,
    }
  }
} as const

/**
 * Edge case test data for security boundaries
 */
export const SECURITY_EDGE_CASES = {
  /**
   * Invalid UUID patterns for testing input validation
   */
  INVALID_UUIDS: [
    'not-a-uuid',
    '12345',
    '',
    null,
    undefined,
    'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  ],

  /**
   * Malformed request data
   */
  MALFORMED_REQUESTS: {
    missingFields: {
      title: 'Test Document',
      // Missing required fields
    },
    invalidTypes: {
      title: 12345, // Should be string
      is_public: 'yes', // Should be boolean
      word_count: 'many', // Should be number
    },
    sqlInjection: {
      title: "'; DROP TABLE documents; --",
      content: "<script>alert('xss')</script>",
    }
  },

  /**
   * Boundary values for testing limits
   */
  BOUNDARY_VALUES: {
    maxTitle: 'A'.repeat(1000), // Very long title
    maxContent: 'A'.repeat(100000), // Very long content
    emptyContent: '',
    specialChars: '!@#$%^&*()[]{}|;:,.<>?',
  }
} as const

/**
 * Helper function to create test data with proper relationships
 */
export function createTestDataSet(userId: string) {
  return {
    user: TEST_USERS[userId as keyof typeof TEST_USERS],
    document: {
      ...SECURITY_TEST_DOCUMENTS.USER_A_DOCUMENT,
      created_by: userId,
    },
    enhancement: SECURITY_TEST_ENHANCEMENTS.USER_A_ENHANCEMENT,
    aiCall: {
      ...SECURITY_TEST_AI_CALLS.USER_A_AI_CALL,
      created_by: userId,
    },
    chatThread: {
      ...SECURITY_TEST_CHAT.USER_A_THREAD,
      created_by: userId,
    },
    profile: {
      ...SECURITY_TEST_PROFILES.USER_A_PROFILE,
      user_id: userId,
    }
  }
}

/**
 * Generate realistic test data with variations
 */
export function generateVariantTestData(baseData: any, variant: string) {
  return {
    ...baseData,
    title: `${baseData.title} - ${variant}`,
    slug: `${baseData.slug}-${variant.toLowerCase().replace(/\s+/g, '-')}`,
  }
}

/**
 * Security test assertions helper
 */
export const SECURITY_ASSERTIONS = {
  /**
   * Assert that a resource is not accessible
   */
  assertInaccessible: (result: any) => {
    expect(result).toBeNull()
  },

  /**
   * Assert that a list is empty (for list-based queries)
   */
  assertEmptyList: (result: any[]) => {
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  },

  /**
   * Assert that a resource is accessible and has expected properties
   */
  assertAccessible: (result: any, expectedId?: string) => {
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('id')
    if (expectedId) {
      expect(result.id).toBe(expectedId)
    }
  },

  /**
   * Assert proper ownership in result
   */
  assertOwnership: (result: any, expectedOwnerId: string) => {
    expect(result).toHaveProperty('created_by', expectedOwnerId)
  },

  /**
   * Assert proper error response format
   */
  assertErrorResponse: (response: any, expectedStatus: number) => {
    expect(response).toHaveProperty('status', expectedStatus)
    expect(response.status).toBeGreaterThanOrEqual(400)
  }
} as const