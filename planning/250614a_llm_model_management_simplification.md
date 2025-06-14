# LLM Model Management Simplification

## Goal & Context

The current LLM model management system uses a complex tier-based approach with database lookups through the `ai_models` table. This creates unnecessary indirection, maintenance overhead, and bugs (particularly with version extraction for Google models). The goal is to simplify this to use explicit model strings stored directly in the `ai_calls` table, eliminating database lookups and centralising model metadata in configuration files.

## Problem Statement

1. **Complex Tier System**: Current system uses provider-tier keys (e.g., `anthropic-cheap`, `google-balanced`) that require translation to actual model IDs
2. **Database Dependency**: Model lookups require database queries against `ai_models` table, adding latency and complexity
3. **Version Extraction Issues**: The `getModelVersion()` function breaks for Google models and has fragile string parsing logic
4. **Maintenance Overhead**: Model metadata is split between config files and database, requiring migration scripts for updates
5. **UUID Foreign Keys**: Using UUIDs for model references in `ai_calls` makes debugging and direct SQL queries difficult

## Proposed Solution

Replace the current system with explicit model strings using the format: `provider:model:version[:thinking]`

Examples:
- `anthropic:claude-3-5-haiku:20241022`
- `anthropic:claude-sonnet-4:20250514:thinking`
- `google:gemini-2.0-flash:latest`

Key changes:
1. Store model string directly in `ai_calls.model_string` column
2. Remove UUID foreign key to `ai_models` table
3. Move all model metadata to configuration (potentially separate file)
4. Eventually remove `ai_models` table entirely
5. No backwards compatibility needed - clean cutover

## References

- `lib/config.ts` - Current tier-based configuration with PROVIDER_TIER_MODELS
- `lib/services/database/ai-calls.ts` - AiCallService with model UUID lookups
- `lib/types/database.ts` - Database types including ai_models and ai_calls tables
- `docs/reference/DATABASE_SCHEMA.md` - Database schema documentation
- `docs/reference/CODING_PRINCIPLES.md` - Development principles (fix root cause, raise errors early)
- All API routes using `getModelVersion()` - upload-pdf, extract-url, chat, summarise, etc.

## Principles & Key Decisions

1. **Explicit Over Implicit**: Use clear, readable model strings instead of opaque UUIDs or tier abstractions
2. **Configuration Over Database**: Model metadata belongs in version-controlled config files, not in database tables
3. **Direct Storage**: Store the actual model identifier used, avoiding translation layers
4. **Clean Cutover**: No backwards compatibility - we'll migrate all existing data and remove old system
5. **Future-Proof Format**: The `provider:model:version[:thinking]` format is extensible for future needs

## Stages & Actions

### Stage: Preparation & Analysis
- [ ] Create comprehensive inventory of all places using model management
  - [ ] Search for all uses of `getModelVersion`, `getModelConfig`, `PROVIDER_TIER_MODELS`
  - [ ] List all API routes that create AI calls
  - [ ] Document all imports and uses of ProviderTierKey type
- [ ] Analyse existing ai_calls data to understand migration scope
  - [ ] Count total ai_calls records
  - [ ] Map all unique model_id UUIDs to their string representations
  - [ ] Identify any edge cases or anomalies

### Stage: Database Schema Changes
- [ ] Create migration to add `model_string` column to ai_calls table
  - [ ] Add column as nullable initially: `model_string TEXT`
  - [ ] Add check constraint for format validation: `provider:model:version[:thinking]`
- [ ] Create migration to populate model_string from existing data
  - [ ] Join ai_calls with ai_models to build model strings
  - [ ] Handle thinking mode variants correctly
  - [ ] Verify all records have valid model_string values
- [ ] Run migrations in development and verify data integrity

### Stage: Create New Model Configuration System
- [ ] Design new model metadata structure
  - [ ] Create `lib/config/models.ts` for model definitions
  - [ ] Include all current metadata: context window, output tokens, pricing, descriptions
  - [ ] Support lookup by model string
- [ ] Implement model string parsing utilities
  - [ ] Parse `provider:model:version[:thinking]` format
  - [ ] Extract provider, model ID, version, thinking mode
  - [ ] Add validation functions
- [ ] Write comprehensive unit tests for new system
  - [ ] Test parsing of all valid formats
  - [ ] Test validation and error cases
  - [ ] Test metadata lookups

### Stage: Update AI Call Service
- [ ] Modify AiCallService to use model strings
  - [ ] Remove `getModelUuidByProviderAndId` method
  - [ ] Update `startCall` to accept and store model string
  - [ ] Update `create` method similarly
  - [ ] Remove model_id UUID references
- [ ] Update all API routes to use new system
  - [ ] Replace `getModelVersion()` calls with model string construction
  - [ ] Update AI call creation to pass model strings
  - [ ] Test each API route thoroughly
- [ ] Run all tests and fix any failures

### Stage: Update Frontend Usage
- [ ] Search for any frontend code using model configuration
  - [ ] Check for provider/model selectors in UI
  - [ ] Update any model display logic
  - [ ] Ensure chat UI works with new system
- [ ] Test all UI features that involve model selection
  - [ ] PDF upload with provider selection
  - [ ] URL extraction with provider selection
  - [ ] Chat interface model display

### Stage: Clean Migration & Cutover
- [ ] Create final migration to make model_string required
  - [ ] Drop foreign key constraint to ai_models
  - [ ] Make model_string NOT NULL
  - [ ] Drop model_id column
- [ ] Update database types with new schema
  - [ ] Regenerate types with `npm run db:types`
  - [ ] Fix any TypeScript errors from schema changes
- [ ] Comprehensive testing of entire system
  - [ ] Run full test suite
  - [ ] Manual testing of all AI features
  - [ ] Verify logging and monitoring still work

### Stage: Remove Legacy System
- [ ] Remove all tier-based configuration
  - [ ] Delete PROVIDER_TIER_MODELS from lib/config.ts
  - [ ] Remove ProviderTierKey type
  - [ ] Remove getModelVersion and related functions
- [ ] Create migration to drop ai_models table
  - [ ] Remove all references in code first
  - [ ] Update database documentation
  - [ ] Drop the table
- [ ] Final cleanup
  - [ ] Remove any dead code
  - [ ] Update all documentation
  - [ ] Run linter and fix any issues

### Stage: Documentation & Polish
- [ ] Update database schema documentation
  - [ ] Update `docs/reference/DATABASE_SCHEMA.md`
  - [ ] Document new model_string format
  - [ ] Remove ai_models table documentation
- [ ] Create new model configuration documentation
  - [ ] Document model string format
  - [ ] Document configuration structure
  - [ ] Add migration guide for future model additions
- [ ] Update CLAUDE.md if needed
- [ ] Git commit with clear message about the simplification

### Stage: Final Review & Deployment Preparation
- [ ] Review all changes with user
  - [ ] Demonstrate simplified model management
  - [ ] Show performance improvements
  - [ ] Confirm all features working correctly
- [ ] Plan production deployment
  - [ ] Coordinate migration timing
  - [ ] Prepare rollback plan if needed
  - [ ] Document deployment steps
- [ ] Move planning doc to finished folder

# Appendix

## Model String Format Specification

The model string format is: `provider:model:version[:thinking]`

Components:
- `provider`: The LLM provider (anthropic, google, openai, etc.)
- `model`: The model identifier WITHOUT version (e.g., `claude-3-5-haiku`, not `claude-3-5-haiku-20241022`)
- `version`: The version identifier (e.g., `20241022`, `latest`, `preview`)
- `thinking`: Optional suffix for thinking/reasoning mode

Examples:
```
anthropic:claude-3-5-haiku:20241022
anthropic:claude-sonnet-4:20250514
anthropic:claude-sonnet-4:20250514:thinking
google:gemini-2.0-flash:latest
google:gemini-1.5-pro:latest
```

## Current Model UUID Mappings

Based on the migrations, current model UUIDs map to:
- `anthropic/claude-3-5-haiku-20241022/20241022` → `anthropic:claude-3-5-haiku:20241022`
- `anthropic/claude-sonnet-4-20250514/20250514` → `anthropic:claude-sonnet-4:20250514`
- `anthropic/claude-sonnet-4-20250514/20250514-thinking` → `anthropic:claude-sonnet-4:20250514:thinking`
- `google/gemini-2.0-flash/latest` → `google:gemini-2.0-flash:latest`

## Migration Query Template

```sql
-- Populate model_string from existing model relationships
UPDATE ai_calls
SET model_string = 
  CASE
    WHEN m.provider = 'anthropic' AND m.version LIKE '%-thinking' THEN
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
```

## Benefits of New System

1. **Simplicity**: Direct model strings are self-documenting and debuggable
2. **Performance**: Eliminates database lookups for every AI call
3. **Flexibility**: Easy to add new models without database migrations
4. **Maintainability**: All model config in one place (version controlled)
5. **Debugging**: SQL queries can directly filter by model without joins