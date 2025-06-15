-- Populate model_string column from existing ai_models data
-- Part 2: Data migration to populate the new column

-- Update ai_calls with model_string values based on ai_models join
UPDATE ai_calls
SET model_string = 
  CASE
    WHEN m.version LIKE '%-thinking' THEN
      m.provider || ':' || 
      regexp_replace(m.model_id, '-\d{8}$', '') || ':' || 
      regexp_replace(m.version, '-thinking$', '') || ':thinking'
    ELSE
      m.provider || ':' || 
      regexp_replace(m.model_id, '-\d{8}$', '') || ':' || 
      m.version
  END
FROM ai_models m
WHERE ai_calls.model_id = m.id;

-- Verify all records have been updated (should be 0 after successful migration)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM ai_calls WHERE model_string IS NULL;
    
    IF null_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % ai_calls records still have NULL model_string', null_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: All ai_calls records have model_string values';
END $$;