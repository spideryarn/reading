-- Finalize model string migration: make model_string required and drop legacy model_id
-- Part 3: Final cutover to model string system

-- First, verify all records have model_string values before making destructive changes
DO $$
DECLARE
    null_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM ai_calls;
    SELECT COUNT(*) INTO null_count FROM ai_calls WHERE model_string IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % of % ai_calls records have NULL model_string', null_count, total_count;
    END IF;
    
    RAISE NOTICE 'Pre-migration check passed: All % ai_calls records have model_string values', total_count;
END $$;

-- Drop the foreign key constraint to ai_models table
ALTER TABLE ai_calls DROP CONSTRAINT IF EXISTS ai_calls_model_id_fkey;

-- Make model_string column NOT NULL (safe because all records already have values)
ALTER TABLE ai_calls ALTER COLUMN model_string SET NOT NULL;

-- Drop the legacy model_id column (no longer needed)
ALTER TABLE ai_calls DROP COLUMN IF EXISTS model_id;

-- The model_string_format_check constraint already exists from a previous migration
-- No need to add it again

-- Create index on model_string for performance (replaces model_id index)
CREATE INDEX IF NOT EXISTS idx_ai_calls_model_string ON ai_calls(model_string);

-- Final verification
DO $$
DECLARE
    total_count INTEGER;
    constraint_violations INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM ai_calls;
    
    -- Check for any constraint violations
    SELECT COUNT(*) INTO constraint_violations 
    FROM ai_calls 
    WHERE model_string IS NULL 
       OR NOT (model_string ~ '^[a-z]+:[a-z0-9\-\.]+:[a-z0-9\-\.]+(:thinking)?$');
    
    IF constraint_violations > 0 THEN
        RAISE EXCEPTION 'Migration validation failed: % records violate constraints', constraint_violations;
    END IF;
    
    RAISE NOTICE 'Migration completed successfully: % ai_calls records migrated to model_string system', total_count;
END $$;