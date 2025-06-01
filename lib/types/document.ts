export interface DocumentElement {
  id: string
  document_id: string
  parent_id: string | null
  tag_name: string
  content: string
  attributes: Record<string, string>
  position: number
  level: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  title: string
  source_url?: string
  created_at: string
  updated_at: string
}

export interface Summary {
  id: string
  element_id: string
  level: 'element' | 'section' | 'chapter' | 'document'
  content: string
  created_at: string
  updated_at: string
}