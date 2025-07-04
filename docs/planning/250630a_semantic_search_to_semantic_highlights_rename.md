# Semantic Search to Semantic Highlights Rename

## Goal

Rename "Semantic Search" to "Semantic Highlights" throughout the codebase to better reflect the feature's primary function of highlighting relevant content rather than traditional search functionality. This includes renaming the tool ID from 'search' to 'highlights' for consistency.

## Context

The current "Semantic Search" tool generates highlighted segments of document content based on semantic queries. The name "search" is misleading as the primary user value is highlighting relevant content, not finding/locating content. The tool currently has inconsistent naming with the tool ID being 'search' while the functionality is specifically semantic-based highlighting.

## User Stories & Acceptance Criteria

**As a user**, I want the tool to be named "Semantic Highlights" so that:
- The name accurately reflects what the tool does (highlighting content)
- I can distinguish it from traditional text search functionality
- The UI terminology is consistent and clear

**Acceptance Criteria:**
- All UI references display "Semantic Highlights" instead of "Semantic Search"
- Tool ID changes from 'search' to 'highlights' 
- Database records use 'semantic-highlights' type identifier
- API endpoints reflect the new naming convention
- File names and internal references are updated consistently
- All tests pass with the new naming
- No hardcoded "semantic search" references remain in the codebase

## References

- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` - Tool development patterns and registry management
- `docs/reference/TOOL_HIGHLIGHT.md` - Existing highlighting functionality documentation
- `lib/tools/implementations/search.ts` - Current tool implementation and registration
- `app/api/tools/[toolId]/handlers/search.ts` - Main API handler logic
- `components/unified-left-pane.tsx` - UI integration and state management
- Previous investigation found 26+ files requiring updates across database, API, UI, and test layers

## Principles & Key Decisions

- **Aggressive clean migration**: No backwards compatibility needed (zero users)
- **Complete rename**: Include both user-facing names and internal identifiers
- **Tool ID consistency**: Change tool ID from 'search' to 'highlights' to match function
- **Database records**: Direct replacement without migration scripts (fresh start)
- **File system consistency**: Rename files to match new naming convention
- **Comprehensive testing**: Update all test coverage to reflect new names

## Stages & Actions

### Preparation Stage
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync latest changes from main
- [ ] Create Git branch `250630a_semantic_highlights_rename` for this work
- [ ] Run `npm run dev:status` and ensure dev server is running for testing

### Database & Type Definitions Stage
- [ ] Update database type definitions in `lib/types/database.ts`
  - [ ] Change `'semantic-search'` to `'semantic-highlights'` in `PromptType` union
  - [ ] Change `'semantic-search'` to `'semantic-highlights'` in `EnhancementType` union
- [ ] Update URL state types in `lib/tools/url-state-types.ts`
  - [ ] Review and update search type definitions if needed
- [ ] Run `npm run check:health` in subagent to verify type changes

### Core Implementation Files Stage
- [ ] Rename core implementation files:
  - [ ] `lib/utils/semantic-search.ts` → `lib/utils/semantic-highlights.ts`
  - [ ] `lib/services/semantic-search-formatter.ts` → `lib/services/semantic-highlights-formatter.ts`
  - [ ] `lib/prompts/templates/semantic-search.ts` → `lib/prompts/templates/semantic-highlights.ts`
  - [ ] `lib/prompts/templates/semantic-search.njk` → `lib/prompts/templates/semantic-highlights.njk`
- [ ] Update file contents to replace all internal references:
  - [ ] Function names, variable names, comments
  - [ ] Import/export statements
  - [ ] String literals used in logging and operations
- [ ] Run `npm run build` to verify compilation succeeds

### Tool Registration & API Stage
- [ ] Update tool registration in `lib/tools/implementations/search.ts`:
  - [ ] Change tool ID from 'search' to 'highlights'
  - [ ] Update tool name to 'Semantic Highlights'
  - [ ] Update description to reflect highlighting functionality
  - [ ] Update keywords array to include highlight-related terms
- [ ] Rename API handler file:
  - [ ] `app/api/tools/[toolId]/handlers/search.ts` → `app/api/tools/[toolId]/handlers/highlights.ts`
- [ ] Update API handler implementation:
  - [ ] Replace all `'semantic-search'` references with `'semantic-highlights'`
  - [ ] Update logging operations to use new identifier
  - [ ] Update database queries and enhancement filtering
  - [ ] Update error messages and API responses
- [ ] Update API migration documentation
- [ ] Run `npm run check:health` in subagent to verify API changes

### UI Components Stage
- [ ] Update `components/unified-left-pane.tsx`:
  - [ ] Update tool-specific logic to use new 'highlights' tool ID
  - [ ] Update state management variable names related to semantic search
  - [ ] Update UI text to display "Semantic Highlights"
  - [ ] Update search type handling if needed
  - [ ] Remove or update any commented semantic search code
- [ ] Update other UI components that reference semantic search:
  - [ ] `components/highlight-management.tsx`
  - [ ] Any other components found during search
- [ ] Update CSS animation classes in:
  - [ ] `lib/animations/logo-animations.ts`
  - [ ] `styles/logo-animations.css`
  - [ ] `app/design/logoplay/page.tsx`
- [ ] Test UI functionality with `npm run dev` and manual verification

### Test Files Stage
- [ ] Rename test files:
  - [ ] `lib/utils/__tests__/semantic-search.test.ts` → `lib/utils/__tests__/semantic-highlights.test.ts`
  - [ ] `lib/services/__tests__/semantic-search-formatter.test.ts` → `lib/services/__tests__/semantic-highlights-formatter.test.ts`
- [ ] Update test file contents:
  - [ ] Import statements to reference renamed files
  - [ ] Test descriptions and names
  - [ ] Mock data and assertions using new identifiers
- [ ] Update E2E tests in `tests/e2e/document-search-navigation-workflow.spec.ts`:
  - [ ] Update test descriptions and selectors
  - [ ] Update API endpoint expectations
  - [ ] Update database type assertions
- [ ] Run `npm test` in subagent to verify all unit tests pass
- [ ] Run `npm run test:e2e` in subagent to verify E2E tests pass

### Documentation Stage
- [ ] Update planning documents in `docs/planning/finished/`:
  - [ ] Update semantic search related planning docs to note the rename
  - [ ] Add historical context for the rename decision
- [ ] Update reference documentation:
  - [ ] `docs/reference/TOOL_HIGHLIGHT.md` - Update to include semantic highlights
  - [ ] `docs/reference/PROJECT_STATUS.md` - Update feature names
  - [ ] `docs/reference/LOGGING_BEST_PRACTICES.md` - Update example operations
  - [ ] Any other docs that reference semantic search functionality
- [ ] Update `CLAUDE.md` if needed to reflect new tool naming

### Verification & Cleanup Stage
- [ ] Use subagent to search codebase for any remaining "semantic search" references:
  - [ ] Search for "semantic search", "semantic-search", "semanticSearch" variations
  - [ ] Search for old file names and imports
  - [ ] Verify no hardcoded references remain
- [ ] Run comprehensive health checks:
  - [ ] `npm run check:health --rigorous` in subagent for full codebase validation
  - [ ] `npm run build` to ensure TypeScript compilation
  - [ ] `npm run lint` to verify code quality
  - [ ] `npm test` to confirm all tests pass
- [ ] Manual testing of the renamed functionality:
  - [ ] Test semantic highlights tool in the UI
  - [ ] Verify tool appears correctly in navigation
  - [ ] Test highlight generation and display
  - [ ] Verify caching and persistence work correctly

### Final Integration Stage
- [ ] Git commit all changes following `docs/instructions/GIT_COMMIT_CHANGES.md`
- [ ] Test the complete workflow end-to-end
- [ ] Update this planning document with any discoveries or changes made during implementation
- [ ] Move document to `docs/planning/finished/` directory
- [ ] Merge branch back to main with user permission

## Appendix

### Files Requiring Updates (Comprehensive List)

**Core Implementation (8 files):**
- `lib/tools/implementations/search.ts` → Update tool ID and registration
- `app/api/tools/[toolId]/handlers/search.ts` → Rename to highlights.ts, update content
- `lib/utils/semantic-search.ts` → Rename to semantic-highlights.ts
- `lib/services/semantic-search-formatter.ts` → Rename to semantic-highlights-formatter.ts
- `lib/prompts/templates/semantic-search.ts` → Rename to semantic-highlights.ts
- `lib/prompts/templates/semantic-search.njk` → Rename to semantic-highlights.njk
- `lib/types/database.ts` → Update type unions
- `lib/tools/url-state-types.ts` → Review search type definitions

**UI Components (4 files):**
- `components/unified-left-pane.tsx` → Update tool logic and UI text
- `components/highlight-management.tsx` → Update semantic search references
- `lib/animations/logo-animations.ts` → Update CSS animation classes
- `styles/logo-animations.css` → Update animation class names
- `app/design/logoplay/page.tsx` → Update animation references

**Test Files (4 files):**
- `lib/utils/__tests__/semantic-search.test.ts` → Rename and update
- `lib/services/__tests__/semantic-search-formatter.test.ts` → Rename and update
- `tests/e2e/document-search-navigation-workflow.spec.ts` → Update E2E tests
- Any other test files discovered during search

**Documentation (5+ files):**
- `docs/planning/finished/250606a_semantic_search_implementation.md`
- `docs/planning/finished/250607a_semantic_search_caching.md`
- `docs/planning/finished/250612a_semantic_search_to_highlights_refactor.md`
- `docs/planning/finished/250613a_semantic_highlight_persistence_fix.md`
- `docs/reference/TOOL_HIGHLIGHT.md`
- `docs/reference/PROJECT_STATUS.md`
- `docs/reference/LOGGING_BEST_PRACTICES.md`
- `app/api/tools/[toolId]/migration-guide.md`

### Key String Replacements

**Database Types:**
- `'semantic-search'` → `'semantic-highlights'`

**Tool Registration:**
- Tool ID: `'search'` → `'highlights'`
- Tool name: `'Semantic Search'` → `'Semantic Highlights'`

**File Naming Pattern:**
- `semantic-search` → `semantic-highlights`

**CSS Classes:**
- `.semantic-search` → `.semantic-highlights`

**API Identifiers:**
- `'semantic-search'` → `'semantic-highlights'` in database operations
- Log operation names: `'semantic-search'` → `'semantic-highlights'`

### Risk Mitigation

**Database Consistency:**
- No migration needed due to zero users - clean slate approach
- All database queries updated simultaneously to prevent orphaned records

**Tool Registry:**
- Tool ID change from 'search' to 'highlights' requires updating all references
- Ensure no conflicts with existing highlight functionality

**UI State Management:**
- Complex state logic in unified-left-pane.tsx requires careful updating
- URL state persistence needs verification after changes

**Test Coverage:**
- Comprehensive E2E tests must be updated to reflect new API endpoints
- Unit tests need import statement updates for renamed files

### Alternative Approaches Considered

**Partial Rename:** Keep tool ID as 'search' but change display names only
- **Rejected:** Creates inconsistency between internal and external naming
- **Chosen:** Complete rename for consistency across all layers

**Gradual Migration:** Update in phases with backwards compatibility
- **Rejected:** Added complexity with no users to serve
- **Chosen:** Aggressive clean migration for simpler codebase