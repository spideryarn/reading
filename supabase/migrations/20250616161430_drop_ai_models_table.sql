-- =====================================================
-- DROP AI_MODELS TABLE - Stage 13 Model String Migration
-- =====================================================
-- 
-- This migration completes the LLM Model Management Simplification by removing
-- the legacy ai_models table that is no longer used after migrating to direct
-- model string storage in ai_calls and chat_threads tables.
--
-- SAFETY: Verified no foreign key constraints reference this table
-- IMPACT: This is a final cleanup step - all functionality now uses model_string
--
-- Part of: Stage 13 Complete Database Cleanup
-- Planning: planning/250614a_llm_model_management_simplification.md
-- Date: 2025-06-16

-- Verify no foreign key constraints exist (safety check)
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO fk_count
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema 
    JOIN information_schema.constraint_column_usage AS ccu 
        ON ccu.constraint_name = tc.constraint_name 
        AND ccu.table_schema = tc.table_schema 
    WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'ai_models'
        AND tc.table_schema = 'public';
    
    IF fk_count > 0 THEN
        RAISE EXCEPTION 'Cannot drop ai_models table: % foreign key constraints still reference it', fk_count;
    END IF;
    
    RAISE NOTICE 'Safety check passed: No foreign key constraints reference ai_models table';
END $$;

-- Drop the ai_models table
DROP TABLE IF EXISTS public.ai_models CASCADE;

-- Log success
DO $$
BEGIN
    RAISE NOTICE 'ai_models table dropped successfully - model string migration complete';
END $$;

-- Verification: Confirm table is dropped
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_models'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE EXCEPTION 'Migration failed: ai_models table still exists';
    ELSE
        RAISE NOTICE 'Verification passed: ai_models table successfully removed';
    END IF;
END $$;

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
--
-- This migration completes the transition from UUID-based model management
-- to direct model string storage. All AI functionality now uses:
-- - ai_calls.model_string (format: provider:model:version[:thinking])
-- - chat_threads.model_string (format: provider:model:version[:thinking])
--
-- Benefits achieved:
-- - Eliminated database lookups for model metadata
-- - Simplified debugging with human-readable model identifiers
-- - Centralized model configuration in version-controlled files
-- - Improved performance on all AI operations
--
-- Next steps after this migration:
-- 1. Regenerate TypeScript database types
-- 2. Verify all queries work without ai_models references
-- 3. Complete final validation of the model string system