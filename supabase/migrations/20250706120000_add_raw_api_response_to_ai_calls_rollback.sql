-- Rollback migration for 20250706120000_add_raw_api_response_to_ai_calls.sql
-- This file is for documentation/emergency purposes only
-- To rollback, run this SQL manually

-- Remove the raw_api_response column
ALTER TABLE public.ai_calls 
DROP COLUMN IF EXISTS raw_api_response;

-- Re-add the response_text field as it was before
ALTER TABLE public.ai_calls
ADD COLUMN response_text TEXT;

-- Note: This will permanently delete any data stored in raw_api_response column
-- The response_text field will be restored but will be NULL for all rows (as it was before)