-- Enforce NOT NULL-style constraint on ai_calls.raw_api_response
-- Stage 2 of comprehensive AI response logging rollout
-- Goal: guarantee every AI call row stores complete raw API response payload
-- Author: AI agent (2025-07-07)
-- Fixed: Removed DEFERRABLE from CHECK constraint (not supported in PostgreSQL)

-- 1️⃣ Back-fill historic rows that predate logging implementation
UPDATE public.ai_calls
SET    raw_api_response = '{}'::jsonb
WHERE  raw_api_response IS NULL;

-- 2️⃣ Add CHECK constraint to ensure raw_api_response is populated
-- Note: CHECK constraints cannot be DEFERRABLE in PostgreSQL, so this
-- will be checked immediately on each row modification. This means
-- multi-step insert→update flows must populate raw_api_response in
-- the initial INSERT, not in a subsequent UPDATE within the same transaction.
ALTER TABLE public.ai_calls
ADD CONSTRAINT raw_api_response_not_null
CHECK (raw_api_response IS NOT NULL);

COMMENT ON CONSTRAINT raw_api_response_not_null ON public.ai_calls IS
'Ensures every AI call row contains the full raw API response object (added 2025-07-07)';