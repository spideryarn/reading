-- Add raw_api_response JSONB field and remove unused response_text field from ai_calls table
-- The raw_api_response field will capture the complete Vercel AI SDK response object including metadata
-- The response_text field is removed as it was never populated and is redundant with raw_api_response

-- Add the new field as nullable initially to ensure backward compatibility
ALTER TABLE public.ai_calls 
ADD COLUMN raw_api_response JSONB;

-- Add comment to document the field's purpose
COMMENT ON COLUMN public.ai_calls.raw_api_response IS 'Complete raw API response from Vercel AI SDK including metadata, timestamps, and provider-specific fields. Access text content via raw_api_response->>''text''';

-- Remove the unused response_text field
-- This field was never populated in production (always NULL)
ALTER TABLE public.ai_calls
DROP COLUMN response_text;

-- Note: We're NOT adding a NOT NULL constraint immediately to allow gradual migration
-- Future migration can add the constraint once all code is updated