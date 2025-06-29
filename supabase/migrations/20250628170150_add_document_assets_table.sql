-- Add document_assets table for tracking extracted assets
-- This table links documents to stored assets (images, future asset types) for cleanup and reference

-- Create document_assets table
CREATE TABLE document_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('image')),
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    caption TEXT,
    extraction_confidence DECIMAL(3,2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT document_assets_unique_path UNIQUE (document_id, storage_path)
);

-- Add comments to document the table and columns
COMMENT ON TABLE document_assets IS 'Tracks extracted assets (images, future asset types) linked to documents for cleanup and reference';
COMMENT ON COLUMN document_assets.document_id IS 'References the parent document this asset belongs to';
COMMENT ON COLUMN document_assets.type IS 'Type of asset: currently only "image", expandable for future asset types';
COMMENT ON COLUMN document_assets.filename IS 'Descriptive filename of the asset in storage';
COMMENT ON COLUMN document_assets.storage_path IS 'Full storage path in Supabase Storage (e.g., "doc-uuid/assets/filename.png")';
COMMENT ON COLUMN document_assets.caption IS 'AI-generated or extracted caption describing the asset';
COMMENT ON COLUMN document_assets.extraction_confidence IS 'Confidence score (0.0-1.0) for AI-generated content quality';
COMMENT ON COLUMN document_assets.metadata IS 'Asset-specific metadata: bounding_box, page_number, original_dimensions, file_size, extraction_method, element_id';

-- Create indexes for efficient queries
CREATE INDEX idx_document_assets_document_id ON document_assets (document_id);
CREATE INDEX idx_document_assets_type ON document_assets (type);
CREATE INDEX idx_document_assets_storage_path ON document_assets (storage_path);
CREATE INDEX idx_document_assets_created_at ON document_assets (created_at);

-- Create composite index for document assets by type queries
CREATE INDEX idx_document_assets_document_type ON document_assets (document_id, type);

-- Create updated_at trigger for automatic timestamp updates
CREATE TRIGGER set_document_assets_updated_at
    BEFORE UPDATE ON document_assets
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime('updated_at');

-- Enable Row Level Security
ALTER TABLE document_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies matching existing document access patterns
-- Users can access assets for documents they can access, admins can access all
CREATE POLICY "Users and admins can view document assets" ON document_assets
    FOR SELECT TO authenticated, anon
    USING (
        -- User has access to the parent document (follows document access patterns)
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_assets.document_id 
            AND (
                documents.is_public = true OR
                documents.created_by = auth.uid() OR
                public.is_admin()
            )
        )
    );

-- Only authenticated users can insert/update/delete assets for documents they own or if admin
CREATE POLICY "Authenticated users and admins can manage document assets" ON document_assets
    FOR ALL TO authenticated
    USING (
        -- User owns the parent document OR is admin
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_assets.document_id 
            AND (
                documents.created_by = auth.uid() OR
                public.is_admin()
            )
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Document_assets table created at %', NOW();
  RAISE NOTICE 'Asset tracking enabled with document-based RLS policies';
  RAISE NOTICE 'Metadata JSONB field supports: bounding_box, page_number, original_dimensions, file_size, extraction_method, element_id';
  RAISE NOTICE 'Indexes created for efficient document and asset type queries';
  RAISE NOTICE 'Foreign key cascade ensures asset cleanup when documents are deleted';
END $$;