-- 20250630235000_add_is_draft_column.sql
-- Description: Add nullable is_draft column to documents table for draft uploads

-- 1. Add column (nullable, no default) ---------------------------------------
ALTER TABLE documents
ADD COLUMN is_draft TIMESTAMPTZ;

-- 2. Comment for schema documentation ---------------------------------------
COMMENT ON COLUMN documents.is_draft IS 'Timestamp when the document was first created as a draft upload. NULL indicates the document is fully processed.';

-- 3. Index for quick draft look-ups (optional but helpful) -------------------
CREATE INDEX IF NOT EXISTS idx_documents_is_draft ON documents(is_draft);

-- 4. RLS policies: existing policies reference documents.owner_id etc. No
--    change required because INSERT privileges already governed by owner.
--
-- Migration completed -------------------------------------------------------- 