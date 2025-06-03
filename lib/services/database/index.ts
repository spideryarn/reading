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
  AiModel,
  AiCall,
  AiCallInsert,
  DocumentEnhancement,
  DocumentEnhancementInsert,
  ChatThread,
  ChatMessage,
  Profile,
  AiProvider,
  PromptType,
  CallStatus,
  EnhancementType,
  MessageRole
} from '@/lib/types/database'