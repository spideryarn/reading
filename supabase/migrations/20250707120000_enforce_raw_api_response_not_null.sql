-- Enforce NOT NULL-style constraint on ai_calls.raw_api_response
-- Stage 2 of comprehensive AI response logging rollout
-- Goal: guarantee every AI call row stores complete raw API response payload
-- Author: AI agent (2025-07-07)

-- 1️⃣ Back-fill historic rows that predate logging implementation
UPDATE public.ai_calls
SET    raw_api_response = '{}'::jsonb
WHERE  raw_api_response IS NULL;

-- 2️⃣ Add deferred CHECK constraint so transactions inserting/ updating rows
--    must leave raw_api_response populated. DEFERRABLE INITIALLY DEFERRED
--    means we can still perform multi-step insert→update flows inside one
--    transaction (e.g. startCall → completeCall) while blocking legacy
--    code paths that forget to populate the field.
ALTER TABLE public.ai_calls
ADD CONSTRAINT raw_api_response_not_null
CHECK (raw_api_response IS NOT NULL)
DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT raw_api_response_not_null ON public.ai_calls IS
'Ensures every AI call row contains the full raw API response object (added 2025-07-07)'; 