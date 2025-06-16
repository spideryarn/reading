-- Migration: Complete chat_threads model_string migration
-- Stage 11 of LLM Model Management Simplification

-- Step 1: Drop foreign key constraint to ai_models
ALTER TABLE chat_threads 
DROP CONSTRAINT IF EXISTS chat_threads_model_id_fkey;

-- Step 2: Make model_string NOT NULL (all records should have values from previous migration)
ALTER TABLE chat_threads 
ALTER COLUMN model_string SET NOT NULL;

-- Step 3: Drop the legacy model_id column
ALTER TABLE chat_threads 
DROP COLUMN model_id;

-- Step 4: Add performance index for model_string queries
CREATE INDEX IF NOT EXISTS idx_chat_threads_model_string 
ON chat_threads(model_string);

-- Verification
DO $$
DECLARE
  total_threads INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_threads FROM chat_threads;
  RAISE NOTICE 'Migration complete: % chat threads now use model_string', total_threads;
END $$;