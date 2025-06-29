/**
 * Document Assets Database Service
 * 
 * Provides a clean API for CRUD operations on the document_assets table,
 * which tracks extracted images and other assets linked to documents.
 */

import { createClient } from '@/lib/supabase/server'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/types/database'
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

  /**
   * Update a document asset
   */
  async update(id: string, updates: DocumentAssetUpdate): Promise<DocumentAsset> {
    const supabase = await createClient()
    
    this.logger.info('Updating document asset', {
      assetId: id,
      updates
    })
    
    const { data: asset, error } = await supabase
      .from('document_assets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      this.logger.error('Failed to update document asset', {
        id,
        updates,
        error: error.message
      })
      throw new Error(`Failed to update document asset: ${error.message}`)
    }
    
    this.logger.info('Document asset updated successfully', {
      assetId: asset.id,
      filename: asset.filename
    })
    
    return asset
  }

  /**
   * Delete a document asset
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient()
    
    this.logger.info('Deleting document asset', { assetId: id })
    
    const { error } = await supabase
      .from('document_assets')
      .delete()
      .eq('id', id)
    
    if (error) {
      this.logger.error('Failed to delete document asset', {
        id,
        error: error.message
      })
      throw new Error(`Failed to delete document asset: ${error.message}`)
    }
    
    this.logger.info('Document asset deleted successfully', { assetId: id })
  }

  /**
   * Delete all assets for a specific document
   */
  async deleteByDocumentId(documentId: string): Promise<number> {
    const supabase = await createClient()
    
    this.logger.info('Deleting all document assets', { documentId })
    
    const { data: deletedAssets, error } = await supabase
      .from('document_assets')
      .delete()
      .eq('document_id', documentId)
      .select('id')
    
    if (error) {
      this.logger.error('Failed to delete document assets', {
        documentId,
        error: error.message
      })
      throw new Error(`Failed to delete document assets: ${error.message}`)
    }
    
    const deletedCount = deletedAssets?.length || 0
    this.logger.info('Document assets deleted successfully', {
      documentId,
      deletedCount
    })
    
    return deletedCount
  }

  /**
   * Get asset statistics for a document
   */
  async getDocumentAssetStats(documentId: string): Promise<{
    totalAssets: number
    assetsByType: Record<string, number>
    totalStorageSize: number
  }> {
    const assets = await this.getByDocumentId(documentId)
    
    const stats = {
      totalAssets: assets.length,
      assetsByType: {} as Record<string, number>,
      totalStorageSize: 0
    }
    
    for (const asset of assets) {
      // Count by type
      stats.assetsByType[asset.type] = (stats.assetsByType[asset.type] || 0) + 1
      
      // Sum storage size from metadata
      const metadata = asset.metadata as AssetMetadata
      if (metadata?.file_size) {
        stats.totalStorageSize += metadata.file_size
      }
    }
    
    return stats
  }

  /**
   * Find orphaned assets (assets with storage paths that don't exist in storage)
   * This is useful for cleanup operations
   */
  async findOrphanedAssets(): Promise<DocumentAsset[]> {
    const supabase = await createClient()
    
    // For now, just return all assets - actual orphan detection would require
    // cross-referencing with Supabase Storage which is more complex
    const { data: assets, error } = await supabase
      .from('document_assets')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      this.logger.error('Failed to get assets for orphan detection', {
        error: error.message
      })
      throw new Error(`Failed to get assets: ${error.message}`)
    }
    
    // TODO: Implement actual orphan detection by checking storage existence
    // This would require integration with the storage service
    
    return assets || []
  }
}

// Export a singleton instance
export const documentAssetsService = new DocumentAssetsService()