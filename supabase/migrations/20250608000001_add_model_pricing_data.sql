-- Add Model Pricing Data Migration
-- Populates input_token_cost and output_token_cost for all AI models
-- Pricing data sourced from official provider websites as of June 8, 2025

-- =====================================================
-- Update Anthropic Models with Current Pricing
-- =====================================================
-- Source: https://www.anthropic.com/pricing (accessed June 8, 2025)

-- Claude 3.5 Haiku: $0.80 input / $4.00 output per million tokens
UPDATE ai_models 
SET 
  input_token_cost = 0.0000008,  -- $0.80 / 1,000,000
  output_token_cost = 0.000004   -- $4.00 / 1,000,000
WHERE provider = 'anthropic' 
  AND model_id = 'claude-3-5-haiku-20241022';

-- Claude Sonnet 4: $3.00 input / $15.00 output per million tokens  
UPDATE ai_models 
SET 
  input_token_cost = 0.000003,   -- $3.00 / 1,000,000
  output_token_cost = 0.000015   -- $15.00 / 1,000,000
WHERE provider = 'anthropic' 
  AND model_id = 'claude-sonnet-4-20250514'
  AND version = '20250514';

-- Claude Sonnet 4 (Thinking): Same pricing as regular Sonnet 4
UPDATE ai_models 
SET 
  input_token_cost = 0.000003,   -- $3.00 / 1,000,000
  output_token_cost = 0.000015   -- $15.00 / 1,000,000
WHERE provider = 'anthropic' 
  AND model_id = 'claude-sonnet-4-20250514'
  AND version = '20250514-thinking';

-- Claude Opus 4: $15.00 input / $75.00 output per million tokens
UPDATE ai_models 
SET 
  input_token_cost = 0.000015,  -- $15.00 / 1,000,000
  output_token_cost = 0.000075  -- $75.00 / 1,000,000
WHERE provider = 'anthropic' 
  AND model_id = 'claude-opus-4-20250514';

-- =====================================================
-- Update Google Models with Current Pricing
-- =====================================================
-- Source: https://ai.google.dev/gemini-api/docs/pricing (Google AI Studio pricing, accessed June 8, 2025)

-- Gemini 2.0 Flash: $0.10 input / $0.40 output per million tokens (Google AI Studio)
UPDATE ai_models 
SET 
  input_token_cost = 0.0000001,  -- $0.10 / 1,000,000
  output_token_cost = 0.0000004  -- $0.40 / 1,000,000
WHERE provider = 'google' 
  AND model_id = 'gemini-2.0-flash';

-- Gemini 2.5 Pro: $1.25 input / $10.00 output per million tokens (≤ 200K tokens)
-- Note: Using lower tier pricing since most usage will be under 200K tokens
UPDATE ai_models 
SET 
  input_token_cost = 0.00000125, -- $1.25 / 1,000,000
  output_token_cost = 0.00001    -- $10.00 / 1,000,000
WHERE provider = 'google' 
  AND model_id = 'gemini-2.5-pro';

-- =====================================================
-- Comments for Documentation
-- =====================================================
COMMENT ON COLUMN ai_models.input_token_cost IS 'Cost per input token in USD. Pricing as of June 8, 2025 from official provider websites.';
COMMENT ON COLUMN ai_models.output_token_cost IS 'Cost per output token in USD. Pricing as of June 8, 2025 from official provider websites.';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify pricing data was populated correctly:
-- SELECT provider, model_id, version, display_name, input_token_cost, output_token_cost 
-- FROM ai_models 
-- ORDER BY provider, input_token_cost;