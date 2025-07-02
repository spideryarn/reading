// Mock for enhancements service module to use in tests
import type { 
  DocumentEnhancement, 
  EnhancementType,
  Json
} from '@/lib/types/database-extensions'
import type { CreateEnhancementOptions } from '../enhancements'

export class EnhancementService {
  // Mock storage for tracking enhancements
  private static mockEnhancements: DocumentEnhancement[] = []
  private static nextId = 1

  constructor(private supabase: any) {}

  // Helper to generate unique IDs
  private static generateId(): string {
    return `mock-enhancement-id-${this.nextId++}`
  }

  /**
   * Create or update an enhancement
   */
  async upsert(options: CreateEnhancementOptions): Promise<DocumentEnhancement> {
    // Check if enhancement exists
    const existingIndex = EnhancementService.mockEnhancements.findIndex(
      e => e.document_id === options.documentId && 
           e.type === options.type && 
           e.subtype === options.subtype
    )

    const enhancement: DocumentEnhancement = {
      id: existingIndex >= 0 ? EnhancementService.mockEnhancements[existingIndex]?.id || EnhancementService.generateId() : EnhancementService.generateId(),
      document_id: options.documentId,
      ai_call_id: options.aiCallId,
      type: options.type,
      subtype: options.subtype,
      content: options.content as Json,
      extra: (options.extra || {}) as Json,
      created_at: existingIndex >= 0 ? EnhancementService.mockEnhancements[existingIndex]?.created_at || new Date().toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (existingIndex >= 0) {
      // Update existing
      EnhancementService.mockEnhancements[existingIndex] = enhancement
    } else {
      // Create new
      EnhancementService.mockEnhancements.push(enhancement)
    }

    return enhancement
  }

  /**
   * Get a specific enhancement
   */
  async get(
    documentId: string,
    type: EnhancementType,
    subtype?: string
  ): Promise<DocumentEnhancement | null> {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(documentId)) {
      return null
    }

    const effectiveSubtype = subtype || 'default'
    
    return EnhancementService.mockEnhancements.find(
      e => e.document_id === documentId && 
           e.type === type && 
           e.subtype === effectiveSubtype
    ) || null
  }

  /**
   * Get all enhancements for a document
   */
  async getByDocument(documentId: string): Promise<DocumentEnhancement[]> {
    return EnhancementService.mockEnhancements.filter(
      e => e.document_id === documentId
    )
  }

  /**
   * Get all enhancements of a specific type
   */
  async getByType(type: EnhancementType): Promise<DocumentEnhancement[]> {
    return EnhancementService.mockEnhancements.filter(
      e => e.type === type
    )
  }

  /**
   * Delete a specific enhancement
   */
  async delete(
    documentId: string,
    type: EnhancementType,
    subtype?: string
  ): Promise<boolean> {
    const effectiveSubtype = subtype || 'default'
    const index = EnhancementService.mockEnhancements.findIndex(
      e => e.document_id === documentId && 
           e.type === type && 
           e.subtype === effectiveSubtype
    )

    if (index >= 0) {
      EnhancementService.mockEnhancements.splice(index, 1)
      return true
    }

    return false
  }

  /**
   * Delete all enhancements for a document
   */
  async deleteByDocument(documentId: string): Promise<number> {
    const before = EnhancementService.mockEnhancements.length
    EnhancementService.mockEnhancements = EnhancementService.mockEnhancements.filter(
      e => e.document_id !== documentId
    )
    return before - EnhancementService.mockEnhancements.length
  }

  /**
   * Store headings enhancement (convenience method)
   */
  async storeHeadings(
    documentId: string,
    aiCallId: string,
    headings: Array<{ before_html: string; html: string; rationale: string }>
  ): Promise<DocumentEnhancement> {
    return this.upsert({
      documentId,
      aiCallId,
      type: 'headings',
      subtype: 'default',
      content: { items: headings },
    })
  }

  /**
   * Store summary enhancement (convenience method)
   */
  async storeSummary(
    documentId: string,
    aiCallId: string,
    subtype: string,
    summaryData: { summary: string; key_points?: string[] }
  ): Promise<DocumentEnhancement> {
    return this.upsert({
      documentId,
      aiCallId,
      type: 'summary',
      subtype,
      content: summaryData,
    })
  }

  /**
   * Store glossary enhancement (convenience method)
   */
  async storeGlossary(
    documentId: string,
    aiCallId: string,
    glossaryItems: Array<{ term: string; definition: string; context?: string }>
  ): Promise<DocumentEnhancement> {
    return this.upsert({
      documentId,
      aiCallId,
      type: 'glossary',
      subtype: 'default',
      content: { items: glossaryItems },
    })
  }

  // Test helper methods
  static clearMockEnhancements(): void {
    this.mockEnhancements = []
    this.nextId = 1
  }

  static getMockEnhancements(): DocumentEnhancement[] {
    return [...this.mockEnhancements]
  }

  static setMockEnhancements(enhancements: DocumentEnhancement[]): void {
    this.mockEnhancements = [...enhancements]
  }
}

// Export mock as default and named export for flexibility
export default EnhancementService