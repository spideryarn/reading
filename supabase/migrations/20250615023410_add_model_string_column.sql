-- Add model_string column to ai_calls table
-- Part 1: Add the column as nullable with format validation

-- Add model_string column
ALTER TABLE ai_calls 
ADD COLUMN model_string TEXT;

-- Add check constraint for format validation
-- Format: provider:model:version[:thinking]
ALTER TABLE ai_calls 
ADD CONSTRAINT model_string_format_check 
CHECK (
  model_string IS NULL OR 
  model_string ~ '^[a-z]+:[a-z0-9\-\.]+:[a-z0-9\-\.]+(:thinking)?$'
);

-- Add comment to document the format
COMMENT ON COLUMN ai_calls.model_string IS 'Model identifier in format: provider:model:version[:thinking]';