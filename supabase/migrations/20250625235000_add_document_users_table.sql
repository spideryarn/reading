-- Add document_users junction table
-- This table stores user-specific context and intent for documents

-- Create document_users table
CREATE TABLE document_users (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    background TEXT DEFAULT '',
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, document_id)
);

-- Add comments to document the table and columns
COMMENT ON TABLE document_users IS 'Junction table storing user-specific context and reading intent for documents';
COMMENT ON COLUMN document_users.user_id IS 'References the user who has a relationship with the document';
COMMENT ON COLUMN document_users.document_id IS 'References the document the user has context for';
COMMENT ON COLUMN document_users.background IS 'Free-text user intent and context for this specific document (e.g., "I want to understand X", "Research for project Y")';
COMMENT ON COLUMN document_users.extra IS 'Additional metadata in JSONB format for future extensibility';

-- Create indexes for efficient queries
CREATE INDEX idx_document_users_user_id ON document_users (user_id);
CREATE INDEX idx_document_users_document_id ON document_users (document_id);

-- Create updated_at trigger for automatic timestamp updates
CREATE TRIGGER set_document_users_updated_at
    BEFORE UPDATE ON document_users
    FOR EACH ROW
    EXECUTE FUNCTION moddatetime('updated_at');

-- Enable Row Level Security
ALTER TABLE document_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can manage their own document relationships, admins can access all
CREATE POLICY "Users and admins can manage document relationships" ON document_users
    FOR ALL TO authenticated
    USING (
        -- User owns the relationship
        auth.uid() = user_id OR
        -- Admin bypass
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin IS NOT NULL)
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Document_users table created at %', NOW();
  RAISE NOTICE 'Added junction table with user_id + document_id composite primary key';
  RAISE NOTICE 'RLS policies created: user-only access with admin override';
  RAISE NOTICE 'Indexes created for efficient user and document lookups';
END $$;

-- Verification queries (commented out for production):
-- SELECT table_name, column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'document_users' 
-- ORDER BY ordinal_position;
--
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'document_users';
--
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'document_users';