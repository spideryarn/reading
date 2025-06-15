-- Add model_string column to chat_threads table to match ai_calls migration pattern
-- This migration follows the same approach used for ai_calls table

-- Add model_string column as nullable initially
ALTER TABLE chat_threads 
ADD COLUMN model_string TEXT;

-- Add check constraint for format validation
-- Format: provider:model:version[:thinking]
ALTER TABLE chat_threads 
ADD CONSTRAINT chat_threads_model_string_format_check 
CHECK (
  model_string IS NULL OR 
  model_string ~ '^[a-z]+:[a-z0-9\-\.]+:[a-z0-9\-\.]+(:thinking)?$'
);

-- Add comment to document the format
COMMENT ON COLUMN chat_threads.model_string IS 'Model identifier in format: provider:model:version[:thinking]';

-- Populate model_string from existing model_id relationships
-- This maps the same models that were migrated for ai_calls
UPDATE chat_threads ct
SET model_string = 
  CASE 
    WHEN am.provider = 'anthropic' AND am.model_id = 'claude-3-5-haiku-20241022' AND am.version = '20241022' THEN 'anthropic:claude-3-5-haiku:20241022'
    WHEN am.provider = 'anthropic' AND am.model_id = 'claude-sonnet-4-20250514' AND am.version = '20250514' THEN 'anthropic:claude-sonnet-4:20250514'
    WHEN am.provider = 'anthropic' AND am.model_id = 'claude-sonnet-4-20250514' AND am.version = '20250514-thinking' THEN 'anthropic:claude-sonnet-4:20250514:thinking'
    WHEN am.provider = 'anthropic' AND am.model_id = 'claude-opus-4-20250514' AND am.version = '20250514' THEN 'anthropic:claude-opus-4:20250514'
    WHEN am.provider = 'google' AND am.model_id = 'gemini-2.0-flash' THEN 'google:gemini-2.0-flash:latest'
    WHEN am.provider = 'google' AND am.model_id = 'gemini-2.5-pro' THEN 'google:gemini-2.5-pro:latest'
    ELSE am.provider || ':' || am.model_id || ':' || am.version
  END
FROM ai_models am
WHERE ct.model_id = am.id;

-- For any chat threads with null model_id, set a default model_string
-- This ensures we don't have null values when we make the column required
UPDATE chat_threads
SET model_string = 'anthropic:claude-3-5-haiku:20241022'
WHERE model_id IS NULL AND model_string IS NULL;

-- Create index on model_string for performance
CREATE INDEX idx_chat_threads_model_string ON chat_threads(model_string);

-- Note: We're not dropping model_id yet to allow for gradual migration
-- A future migration can make model_string NOT NULL and drop model_id once all code is updated