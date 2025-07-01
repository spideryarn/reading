-- Enforce NOT NULL constraint on document_enhancements.ai_call_id
-- Ensure referential integrity: every enhancement must be linked to an AI call

-- Safety check: abort if any nulls remain (should be run in CI before prod)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM document_enhancements WHERE ai_call_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot set ai_call_id NOT NULL – % rows still have NULL ai_call_id',
            (SELECT COUNT(*) FROM document_enhancements WHERE ai_call_id IS NULL);
    END IF;
END $$;

-- Apply the constraint
ALTER TABLE document_enhancements
ALTER COLUMN ai_call_id SET NOT NULL;

COMMENT ON COLUMN document_enhancements.ai_call_id IS 'Foreign key to ai_calls table (NOT NULL enforced 2025-07-01)'; 