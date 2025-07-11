-- Rollback script for 20250707120000_enforce_raw_api_response_not_null.sql
-- Removes the CHECK constraint enforcing raw_api_response NOT NULL

-- Drop the CHECK constraint
ALTER TABLE public.ai_calls
DROP CONSTRAINT IF EXISTS raw_api_response_not_null;

-- Note: We don't revert the UPDATE that backfilled NULL values with '{}'
-- as those are valid data transformations that should be preserved