export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_calls: {
        Row: {
          completed_at: string | null
          completion_tokens: number | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          error_code: string | null
          error_message: string | null
          extra: Json | null
          extra_usage: Json | null
          finish_reason: string | null
          id: string
          latency_ms: number | null
          model_string: string
          prompt_input: string
          prompt_template: string | null
          prompt_tokens: number | null
          prompt_type: string
          reasoning_tokens: number | null
          response_text: string | null
          status: string
          total_tokens: number | null
        }
        Insert: {
          completed_at?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          error_code?: string | null
          error_message?: string | null
          extra?: Json | null
          extra_usage?: Json | null
          finish_reason?: string | null
          id?: string
          latency_ms?: number | null
          model_string: string
          prompt_input: string
          prompt_template?: string | null
          prompt_tokens?: number | null
          prompt_type: string
          reasoning_tokens?: number | null
          response_text?: string | null
          status: string
          total_tokens?: number | null
        }
        Update: {
          completed_at?: string | null
          completion_tokens?: number | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          error_code?: string | null
          error_message?: string | null
          extra?: Json | null
          extra_usage?: Json | null
          finish_reason?: string | null
          id?: string
          latency_ms?: number | null
          model_string?: string
          prompt_input?: string
          prompt_template?: string | null
          prompt_tokens?: number | null
          prompt_type?: string
          reasoning_tokens?: number | null
          response_text?: string | null
          status?: string
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_calls_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          ai_call_id: string | null
          content: string
          created_at: string | null
          extra: Json | null
          id: string
          role: string
          sequence_number: number
          thread_id: string
        }
        Insert: {
          ai_call_id?: string | null
          content: string
          created_at?: string | null
          extra?: Json | null
          id?: string
          role: string
          sequence_number: number
          thread_id: string
        }
        Update: {
          ai_call_id?: string | null
          content?: string
          created_at?: string | null
          extra?: Json | null
          id?: string
          role?: string
          sequence_number?: number
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_ai_call_id_fkey"
            columns: ["ai_call_id"]
            isOneToOne: false
            referencedRelation: "ai_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_id: string | null
          extra: Json | null
          id: string
          model_string: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          extra?: Json | null
          id?: string
          model_string: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          extra?: Json | null
          id?: string
          model_string?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_assets: {
        Row: {
          caption: string | null
          created_at: string | null
          document_id: string
          extraction_confidence: number | null
          filename: string
          id: string
          metadata: Json | null
          storage_path: string
          type: string
          updated_at: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          document_id: string
          extraction_confidence?: number | null
          filename: string
          id?: string
          metadata?: Json | null
          storage_path: string
          type: string
          updated_at?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          document_id?: string
          extraction_confidence?: number | null
          filename?: string
          id?: string
          metadata?: Json | null
          storage_path?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_assets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_enhancements: {
        Row: {
          ai_call_id: string | null
          content: Json
          created_at: string | null
          document_id: string
          extra: Json | null
          id: string
          subtype: string
          type: string
          updated_at: string | null
        }
        Insert: {
          ai_call_id?: string | null
          content: Json
          created_at?: string | null
          document_id: string
          extra?: Json | null
          id?: string
          subtype: string
          type: string
          updated_at?: string | null
        }
        Update: {
          ai_call_id?: string | null
          content?: Json
          created_at?: string | null
          document_id?: string
          extra?: Json | null
          id?: string
          subtype?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_enhancements_ai_call_id_fkey"
            columns: ["ai_call_id"]
            isOneToOne: false
            referencedRelation: "ai_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_enhancements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_users: {
        Row: {
          background: string | null
          created_at: string | null
          document_id: string
          extra: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          background?: string | null
          created_at?: string | null
          document_id: string
          extra?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          background?: string | null
          created_at?: string | null
          document_id?: string
          extra?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_users_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          html_content: string
          id: string
          is_draft: string | null
          is_public: boolean | null
          language_code: string | null
          original_file_type: string | null
          plaintext_content: string
          slug: string
          source_url: string | null
          storage_path: string | null
          title: string
          updated_at: string | null
          upload_ai_call_id: string | null
          upload_metadata: Json | null
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          html_content: string
          id?: string
          is_draft?: string | null
          is_public?: boolean | null
          language_code?: string | null
          original_file_type?: string | null
          plaintext_content: string
          slug: string
          source_url?: string | null
          storage_path?: string | null
          title: string
          updated_at?: string | null
          upload_ai_call_id?: string | null
          upload_metadata?: Json | null
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          html_content?: string
          id?: string
          is_draft?: string | null
          is_public?: boolean | null
          language_code?: string | null
          original_file_type?: string | null
          plaintext_content?: string
          slug?: string
          source_url?: string | null
          storage_path?: string | null
          title?: string
          updated_at?: string | null
          upload_ai_call_id?: string | null
          upload_metadata?: Json | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_upload_ai_call_id_fkey"
            columns: ["upload_ai_call_id"]
            isOneToOne: false
            referencedRelation: "ai_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          background: string
          created_at: string | null
          id: string
          is_admin: string | null
          preferences: Json | null
          stripe_customer_id: string | null
          subscription_ends_at: string | null
          subscription_plan: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          background?: string
          created_at?: string | null
          id?: string
          is_admin?: string | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          background?: string
          created_at?: string | null
          id?: string
          is_admin?: string | null
          preferences?: Json | null
          stripe_customer_id?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_test_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_active_subscription: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      reset_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_current_user_id: {
        Args: { user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Convenience type exports for common database entities
export type Document = Tables<"documents">
export type DocumentInsert = TablesInsert<"documents">
export type DocumentUpdate = TablesUpdate<"documents">

export type AiCall = Tables<"ai_calls">
export type AiCallInsert = TablesInsert<"ai_calls">
export type AiCallUpdate = TablesUpdate<"ai_calls">

export type DocumentEnhancement = Tables<"document_enhancements">
export type DocumentEnhancementInsert = TablesInsert<"document_enhancements">
export type DocumentEnhancementUpdate = TablesUpdate<"document_enhancements">

export type ChatThread = Tables<"chat_threads">
export type ChatThreadInsert = TablesInsert<"chat_threads">
export type ChatThreadUpdate = TablesUpdate<"chat_threads">

export type ChatMessage = Tables<"chat_messages">
export type ChatMessageInsert = TablesInsert<"chat_messages">
export type ChatMessageUpdate = TablesUpdate<"chat_messages">

export type Profile = Tables<"profiles">
export type ProfileInsert = TablesInsert<"profiles">
export type ProfileUpdate = TablesUpdate<"profiles">

// Enum exports
export type CallStatus = Enums<"call_status">
export type PromptType = Enums<"prompt_type">
export type EnhancementType = Enums<"enhancement_type">
export type MessageRole = Enums<"message_role">

