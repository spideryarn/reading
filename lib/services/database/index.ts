export { DocumentService } from './documents'
export { AiCallService } from './ai-calls'
export { EnhancementService } from './enhancements'
export { ChatService } from './chat'
export { ProfileService } from './profiles'
export type { AiCallMetrics, CreateAiCallOptions } from './ai-calls'
export type { CreateEnhancementOptions } from './enhancements'
export type { CreateThreadOptions, CreateMessageOptions } from './chat'
export type { ProfileInsert, ProfileUpdate } from './profiles'

// Re-export database types for convenience
export type {
  Database,
  Document,
  DocumentInsert,
  DocumentUpdate,
  AiCall,
  AiCallInsert,
  DocumentEnhancement,
  DocumentEnhancementInsert,
  ChatThread,
  ChatMessage,
  Profile
} from '@/lib/types/database'