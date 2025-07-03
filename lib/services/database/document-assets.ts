/**
 * Document Assets Database Service
 * 
 * Provides a clean API for CRUD operations on the document_assets table,
 * which tracks extracted images and other assets linked to documents.
 */

import { createClient } from '@/lib/supabase/server'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database-auto-generated'
import { createRequestLogger } from '@/lib/services/logger'

export type DocumentAsset = Tables<'document_assets'>
export type DocumentAssetInsert = TablesInsert<'document_assets'>
export type DocumentAssetUpdate = TablesUpdate<'document_assets'>

/**
 * Asset metadata structure for the JSONB metadata field
 */
export interface AssetMetadata {
  bounding_box?: {
    x1: number
    y1: number
    x2: number
    y2: number
  }
  page_number?: number
  original_dimensions?: {
    width: number
    height: number
  }
  file_size?: number
  extraction_method?: string
  element_id?: string
  [key: string]: unknown // Allow extensibility
}

export class DocumentAssetsService {
  private logger = createRequestLogger('/services/database/document-assets')

  /**
   * Create a new document asset record
   */
  async create(data: DocumentAssetInsert): Promise<DocumentAsset> {
    const supabase = await createClient()
    
    this.logger.info('Creating document asset', {
      documentId: data.document_id,
      type: data.type,
      filename: data.filename
    })
    
    const { data: asset, error } = await supabase
      .from('document_assets')
      .insert(data)
      .select()
      .single()
    
    if (error) {
      this.logger.error('Failed to create document asset', {
        error: error.message,
        data
      })
      throw new Error(`Failed to create document asset: ${error.message}`)
    }
    
    this.logger.info('Document asset created successfully', {
      assetId: asset.id,
      documentId: asset.document_id,
      filename: asset.filename
    })
    
    return asset
  }

  /**
   * Get a specific document asset by ID
   */
  async getById(id: string): Promise<DocumentAsset | null> {
    const supabase = await createClient()
    
    const { data: asset, error } = await supabase
      .from('document_assets')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null
      }
      this.logger.error('Failed to get document asset by ID', {
        id,
        error: error.message
      })
      throw new Error(`Failed to get document asset: ${error.message}`)
    }
    
    return asset
  }

  /**
   * Get all assets for a specific document
   */
  async getByDocumentId(documentId: string): Promise<DocumentAsset[]> {
    const supabase = await createClient()
    
    const { data: assets, error } = await supabase
      .from('document_assets')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
    
    if (error) {
      this.logger.error('Failed to get document assets', {
        documentId,
        error: error.message
      })
      throw new Error(`Failed to get document assets: ${error.message}`)
    }
    
    return assets || []
  }

  /**
   * Get assets by document ID and type
   */
  async getByDocumentIdAndType(documentId: string, type: string): Promise<DocumentAsset[]> {
    const supabase = await createClient()
    
    const { data: assets, error } = await supabase
      .from('document_assets')
      .select('*')
      .eq('document_id', documentId)
      .eq('type', type)
      .order('created_at', { ascending: false })
    
    if (error) {
      this.logger.error('Failed to get document assets by type', {
        documentId,
        type,
        error: error.message
      })
      throw new Error(`Failed to get document assets: ${error.message}`)
    }
    
    return assets || []
  }

  /**
   * Get asset by storage path (useful for cleanup operations)
   */
  async getByStoragePath(storagePath: string): Promise<DocumentAsset | null> {
    const supabase = await createClient()
    
    const { data: asset, error } = await supabase
      .from('document_assets')
      .select('*')
      .eq('storage_path', storagePath)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null
      }
      this.logger.error('Failed to get document asset by storage path', {
        storagePath,
        error: error.message
      })
      throw new Error(`Failed to get document asset: ${error.message}`)
    }
    
    return asset
  }
}
