-- Migration: Add model_string to chat_threads table
-- Stage 11 of LLM Model Management Simplification

-- Step 1: Add model_string column
ALTER TABLE chat_threads 
ADD COLUMN model_string TEXT;

-- Step 2: Add format validation constraint
ALTER TABLE chat_threads 
ADD CONSTRAINT chat_threads_model_string_format 
CHECK (model_string ~ '^[a-z]+:[a-z0-9\-\.]+:[a-z0-9\-\.]+(:thinking)?$');

-- Step 3: Populate model_string from existing model_id relationships
UPDATE chat_threads
SET model_string = 
  CASE
    WHEN m.provider = 'anthropic' AND m.version LIKE '%-thinking' THEN
      m.provider || ':' || 
      regexp_replace(m.model_id, '-\d{8}$', '') || ':' || 
      regexp_replace(m.version, '-thinking$', '') || ':thinking'
    ELSE
      m.provider || ':' || 
      regexp_replace(m.model_id, '-\d{8}$', '') || ':' || 
      m.version
  END
FROM ai_models m
WHERE chat_threads.model_id = m.id;

-- Step 4: Verify all records have valid model_string values
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM chat_threads WHERE model_string IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % chat threads have NULL model_string values', null_count;
  END IF;
  
  RAISE NOTICE 'Migration successful: All chat threads have valid model_string values';
END $$;