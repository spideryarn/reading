import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import type { RealtimeChangeHandler } from '@/lib/types/supabase-realtime'

export type RealtimeChannelType = ReturnType<SupabaseClient<Database>['channel']>

export interface RealtimeSubscription {
  channel: RealtimeChannelType
  unsubscribe: () => void
}

/**
 * Subscribe to changes on the document_enhancements table
 * Primary use case: Live updates when AI generates new enhancements
 */
export function subscribeToDocumentEnhancements(
  supabase: SupabaseClient<Database>,
  documentId: string,
  onChange: RealtimeChangeHandler<Database['public']['Tables']['document_enhancements']['Row']>
): RealtimeSubscription {
  const channel = supabase
    .channel(`document-enhancements:${documentId}`)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table: 'document_enhancements',
        filter: `document_id=eq.${documentId}`,
      },
      onChange
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Subscribe to changes on the documents table
 * Use case: Sync document metadata changes across tabs
 */
export function subscribeToDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  onChange: RealtimeChangeHandler<Database['public']['Tables']['documents']['Row']>
): RealtimeSubscription {
  const channel = supabase
    .channel(`document:${documentId}`)
    .on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`,
      },
      onChange
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Subscribe to new messages in a chat thread
 * Use case: Real-time chat updates across tabs
 */
export function subscribeToChatMessages(
  supabase: SupabaseClient<Database>,
  threadId: string,
  onNewMessage: RealtimeChangeHandler<Database['public']['Tables']['chat_messages']['Row']>
): RealtimeSubscription {
  const channel = supabase
    .channel(`chat-thread:${threadId}`)
    .on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      onNewMessage
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Subscribe to AI call status updates
 * Use case: Show progress of long-running AI operations
 */
export function subscribeToAiCallStatus(
  supabase: SupabaseClient<Database>,
  aiCallId: string,
  onChange: RealtimeChangeHandler<Database['public']['Tables']['ai_calls']['Row']>
): RealtimeSubscription {
  const channel = supabase
    .channel(`ai-call:${aiCallId}`)
    .on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_calls',
        filter: `id=eq.${aiCallId}`,
      },
      onChange
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Generic subscription helper for any table
 */
export function subscribeToTable<T extends keyof Database['public']['Tables']>(
  supabase: SupabaseClient<Database>,
  table: T,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
  filter: string | null,
  onChange: RealtimeChangeHandler<Database['public']['Tables'][T]['Row']>
): RealtimeSubscription {
  const channelName = filter ? `${table}:${filter}` : `${table}:all`
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      {
        event,
        schema: 'public',
        table: table as string,
        ...(filter && { filter }),
      },
      onChange
    )
    .subscribe()

  return {
    channel,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

/**
 * Helper to check if a channel is subscribed
 */
export function isChannelSubscribed(channel: RealtimeChannelType): boolean {
  return (channel.state as any) === 'SUBSCRIBED'
}

/**
 * Wait for a channel to be subscribed
 */
export async function waitForSubscription(
  channel: RealtimeChannelType,
  timeoutMs: number = 5000
): Promise<boolean> {
  return new Promise((resolve) => {
    if (isChannelSubscribed(channel)) {
      resolve(true)
      return
    }

    const timeoutId = setTimeout(() => {
      resolve(false)
    }, timeoutMs) as NodeJS.Timeout

    (channel as any).on('subscribe', () => {
      clearTimeout(timeoutId)
      resolve(true)
    })
  })
}