-- Add upload metadata fields to documents table
-- These fields track how documents were uploaded and processed

-- Add upload metadata JSONB field for flexible storage of upload parameters
ALTER TABLE documents ADD COLUMN upload_metadata JSONB;

-- Add foreign key to ai_calls table to link documents to their upload processing call
ALTER TABLE documents ADD COLUMN upload_ai_call_id UUID;

-- Add foreign key constraint to ai_calls table
ALTER TABLE documents ADD CONSTRAINT documents_upload_ai_call_id_fkey 
  FOREIGN KEY (upload_ai_call_id) REFERENCES ai_calls(id);

-- Comment the new columns for clarity
COMMENT ON COLUMN documents.upload_metadata IS 'JSONB storage for upload-related metadata such as extraction method, provider used, processing time, file size, etc.';
COMMENT ON COLUMN documents.upload_ai_call_id IS 'Foreign key to ai_calls table linking to the AI call that processed this document during upload';