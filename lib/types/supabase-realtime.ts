// Type definitions for Supabase realtime functionality

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

export interface RealtimePayload<T = unknown> {
  eventType: RealtimeEventType;
  new: T;
  old: T;
  errors: string[] | null;
  schema: string;
  table: string;
  commit_timestamp: string;
}

export type RealtimeChangeHandler<T = unknown> = (payload: RealtimePayload<T>) => void;

// Supabase realtime channel types
export interface RealtimeChannel {
  on: (
    event: string,
    filter: { event: RealtimeEventType; schema: string; table: string },
    callback: RealtimeChangeHandler
  ) => RealtimeChannel;
  subscribe: (callback?: (status: string) => void) => RealtimeChannel;
  unsubscribe: () => void;
}