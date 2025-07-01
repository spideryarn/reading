# Tool Architecture Type Safety and Clean Design

## Goal

Completely redesign the Spideryarn tool architecture to fix root architectural issues, provide full type safety, and enable AI agents to write correct code on first attempt. The new architecture will cleanly separate different tool types (UI panes, quick actions, background jobs, navigation links) and provide compile-time validation throughout.

### Context

The current tool system has fundamental architectural issues identified by Gemini and o3 AI models:
- The single `Tool` interface conflates UI panes, API endpoints, and commands
- Parameters are untyped (`Record<string, unknown>`)
- Many validations happen at runtime that should be compile-time
- Inconsistent patterns between tool implementations create confusion

As a zero-user product, we can implement a clean-slate design that fixes these root causes rather than applying band-aids.

## User Stories & Acceptance Criteria

**As an AI agent developing tools:**
- I can immediately identify which type of tool to create (PaneTool, QuickAction, etc.)
- I get compile-time errors when using wrong fields for a tool type
- I see exactly which parameters each tool action requires
- I never need to read implementation code to understand contracts

**As a human developer:**
- I can create tools using Zod schemas with full validation
- I understand exactly what fields each tool type requires
- I can migrate existing tools incrementally while both systems run
- I end up with zero legacy code after migration

**Acceptance criteria:**
- New architecture supports all current functionality
- Each tool type has only the fields it actually needs
- Full type safety from tool definition through execution
- Complete removal of old system after migration
- No backwards compatibility debt remains

## References

- `planning/critiques/250630b_gemini_o3_tools_architecture_critique.md` - Comprehensive critiques identifying improvement opportunities
- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` - Current tool development patterns
- `docs/reference/TOOL_EXECUTION_FRAMEWORK.md` - Execution framework documentation
- `lib/tools/types.ts` - Current Tool interface definition
- `lib/tools/registry.ts` - Tool registry implementation
- `lib/tools/executor/` - Execution framework
- `docs/reference/CODING_PRINCIPLES.md` - AI-first development principles
- `docs/reference/LLM_PROMPT_TEMPLATES.md` - Existing Zod integration patterns

## Principles & Key Decisions

### Core Principles
1. **Fix root causes** - Address architectural issues directly, not with workarounds
2. **Zero legacy code** - Complete migration leaves no deprecated patterns
3. **Type safety throughout** - Compile-time validation at every layer
4. **Clear separation of concerns** - Each tool type serves one purpose
5. **Zod-first design** - Schemas define structure, types are derived

### Key Decisions

**Clean Slate Architecture (Option B)**
- Build new system with proper discriminated unions
- Run old and new systems in parallel during migration
- Completely remove old system once migration complete
- This fixes root causes rather than patching symptoms

**Tool Type Hierarchy**
```typescript
type ToolEntry = PaneTool | QuickAction | BackgroundJob | NavigationLink
```
- Each type has only relevant fields
- Clear discrimination via `kind` field
- No optional fields that don't apply

**Zod Schema-Based Definition**
- All tool types defined via Zod schemas
- Factory functions validate and create tools
- Full type inference from schemas
- No manual TypeScript interfaces to maintain

**Parallel Migration Strategy**
- New registry runs alongside old one
- Tools migrated individually
- UI components support both systems
- Clean cutover when complete

## Stages & Actions

### Stage: Initial Setup and Research
- [x] Investigate current tool implementations and patterns
- [x] Research web patterns for type-safe plugin systems
- [x] Analyze migration complexity and risks
- [x] Write initial planning document
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync with main
- [ ] Create git branch `250701a_tool_clean_architecture` for this work
- [ ] Get external AI critique following `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md`
- [ ] Update planning doc with critique insights

### Stage: Design New Architecture Foundation
- [ ] Define Zod schemas for each tool type (PaneTool, QuickAction, BackgroundJob, NavigationLink)
- [ ] Create TypeScript types derived from schemas
- [ ] Design new registry structure to handle discriminated unions
- [ ] Write tests for schema validation and type inference
- [ ] Document new architecture in temporary `docs/reference/NEW_TOOL_ARCHITECTURE.md`
- [ ] Run `npm run check:health` to ensure no impact on existing code
- [ ] Git commit: "feat(tools): define new tool architecture schemas and types"

### Stage: Build New Registry System
- [ ] Create `lib/tools/v2/registry.ts` with new type-safe registry
- [ ] Implement registration functions for each tool type
- [ ] Add registry validation and conflict detection
- [ ] Create factory functions using Zod schemas for tool creation
- [ ] Write comprehensive tests for new registry
- [ ] Run `npm run check:health`
- [ ] Git commit: "feat(tools): implement new type-safe tool registry"

### Stage: Implement New Execution Framework
- [ ] Create `lib/tools/v2/executor/` with typed execution paths
- [ ] Implement PaneTool server/local execution with full typing
- [ ] Implement QuickAction execution pattern
- [ ] Design BackgroundJob execution with progress tracking
- [ ] Add NavigationLink handling
- [ ] Write tests for each execution path
- [ ] Run `npm run check:health`
- [ ] Git commit: "feat(tools): implement typed execution framework"

### Stage: Create Glossary Tool in New System
- [ ] Define GlossaryTool using PaneTool schema with typed parameters
- [ ] Implement typed API handler using schema validation
- [ ] Create component with proper type imports
- [ ] Add to new registry with full type safety
- [ ] Test end-to-end functionality
- [ ] Document as reference implementation
- [ ] Run `npm run check:health`
- [ ] Git commit: "feat(tools): implement glossary tool in new architecture"

### Stage: Build Compatibility Layer
- [ ] Create adapter to expose new tools through old registry interface
- [ ] Update UnifiedLeftPane to check both registries
- [ ] Modify command palette to merge tools from both systems
- [ ] Update executor to route to appropriate system
- [ ] Test both old and new tools work side-by-side
- [ ] Run `npm run check:health`
- [ ] Git commit: "feat(tools): add compatibility layer for parallel operation"

### Stage: Migrate Search and Structure Tools
- [ ] Implement search tool as PaneTool with typed parameters
- [ ] Implement structure tool with iterate action support
- [ ] Update components to use new type imports
- [ ] Remove old implementations from legacy registry
- [ ] Test migrated tools thoroughly
- [ ] Run `npm run check:health`
- [ ] Git commit: "feat(tools): migrate search and structure tools"

### Stage: Implement QuickAction Examples
- [ ] Create "Rename Document" as QuickAction example
- [ ] Create "Export as PDF" QuickAction
- [ ] Implement inline execution without UI panes
- [ ] Add to command palette with proper shortcuts
- [ ] Test quick actions work correctly
- [ ] Run `npm run check:health`
- [ ] Git commit: "feat(tools): add QuickAction tool implementations"

### Stage: Migrate Remaining Tools
- [ ] Migrate summary tool to new system
- [ ] Migrate chat tool with streaming support
- [ ] Migrate highlights tool
- [ ] Migrate metadata tool
- [ ] Migrate tweet-thread tool
- [ ] Verify all tools work in new system
- [ ] Run `npm run check:health --rigorous`
- [ ] Git commit: "feat(tools): complete migration of all tools"

### Stage: Remove Old System
- [ ] Remove compatibility layer
- [ ] Delete `lib/tools/types.ts` (old interface)
- [ ] Delete `lib/tools/registry.ts` (old registry)
- [ ] Delete `lib/tools/executor/` (old execution)
- [ ] Delete old tool implementations from `lib/tools/implementations/`
- [ ] Update all imports to use v2 paths
- [ ] Run all tests to ensure nothing breaks
- [ ] Run `npm run check:health --rigorous`
- [ ] Git commit: "refactor(tools): remove legacy tool system"

### Stage: Finalize New Architecture
- [ ] Move `lib/tools/v2/*` to `lib/tools/*`
- [ ] Update all import paths
- [ ] Add comprehensive JSDoc documentation
- [ ] Create development scripts for new tool types
- [ ] Add tool validation CLI command
- [ ] Run `npm run check:health --rigorous`
- [ ] Git commit: "refactor(tools): finalize new tool architecture"

### Stage: Documentation and Polish
- [ ] Update `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md` for new system
- [ ] Delete temporary `NEW_TOOL_ARCHITECTURE.md`
- [ ] Create examples for each tool type
- [ ] Document migration patterns for future tools
- [ ] Update CLAUDE.md with new patterns
- [ ] Add troubleshooting guide
- [ ] Run final test suite with subagent
- [ ] Git commit: "docs(tools): comprehensive documentation for new architecture"

### Stage: Cleanup and Finalization
- [ ] Consolidate redundant tests added during development
- [ ] Review architecture with user for any final adjustments
- [ ] Check no legacy code or patterns remain
- [ ] Get user permission to merge branch
- [ ] Merge `250701a_tool_clean_architecture` to main
- [ ] Move planning doc to `planning/finished/`
- [ ] Final git commit

## Appendix

### New Architecture Schema Definitions

```typescript
// Base schema shared by all tool types
const BaseToolSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  name: z.string(),
  description: z.string(),
  keywords: z.array(z.string()).optional(),
});

// PaneTool - UI components in left pane
const PaneToolSchema = BaseToolSchema.extend({
  kind: z.literal('pane'),
  icon: z.custom<ComponentType<IconProps>>(),
  component: z.function().returns(z.promise(z.any())),
  tabId: z.string(),
  shortcuts: z.array(z.string()).optional(),
  priority: z.number().default(100),
  requiresDocument: z.boolean().default(true),
  capabilities: z.object({
    search: z.boolean().optional(),
    filter: z.boolean().optional(),
  }).optional(),
  parameters: z.record(z.string(), z.any()).optional(),
  actions: z.object({
    execute: z.object({
      schema: z.any(), // Zod schema
      handler: z.enum(['server', 'local']),
      timeout: z.number().optional(),
    }).optional(),
    refresh: z.object({
      schema: z.any(),
      handler: z.enum(['server', 'local']),
    }).optional(),
    iterate: z.object({
      schema: z.any(),
      handler: z.literal('server'),
      timeout: z.number().default(120000),
    }).optional(),
  }),
});

// QuickAction - Instant actions without UI
const QuickActionSchema = BaseToolSchema.extend({
  kind: z.literal('action'),
  shortcuts: z.array(z.string()).optional(),
  icon: z.custom<ComponentType<IconProps>>().optional(),
  parameters: z.any(), // Zod schema for action parameters
  perform: z.function(), // (params, context) => Promise<void>
  confirmRequired: z.boolean().default(false),
});

// BackgroundJob - Long-running operations
const BackgroundJobSchema = BaseToolSchema.extend({
  kind: z.literal('job'),
  parameters: z.any(), // Zod schema for job parameters
  maxDuration: z.number().default(300000), // 5 minutes
  start: z.function(), // (params, context) => Promise<{ jobId: string }>
  getStatus: z.function(), // (jobId) => Promise<JobStatus>
  cancel: z.function().optional(), // (jobId) => Promise<void>
});

// NavigationLink - External or internal navigation
const NavigationLinkSchema = BaseToolSchema.extend({
  kind: z.literal('link'),
  href: z.union([
    z.string().url(),
    z.function(), // (context) => string
  ]),
  openIn: z.enum(['_self', '_blank']).default('_self'),
  icon: z.custom<ComponentType<IconProps>>().optional(),
});

// Union type for all tools
const ToolEntrySchema = z.discriminatedUnion('kind', [
  PaneToolSchema,
  QuickActionSchema,
  BackgroundJobSchema,
  NavigationLinkSchema,
]);

// Derive TypeScript types
type PaneTool = z.infer<typeof PaneToolSchema>;
type QuickAction = z.infer<typeof QuickActionSchema>;
type BackgroundJob = z.infer<typeof BackgroundJobSchema>;
type NavigationLink = z.infer<typeof NavigationLinkSchema>;
type ToolEntry = z.infer<typeof ToolEntrySchema>;
```

### Example Tool Implementations

```typescript
// PaneTool Example - Glossary
const glossaryTool = createPaneTool({
  kind: 'pane',
  id: 'glossary',
  name: 'Glossary',
  description: 'Extract and display key terms',
  icon: BookOpen,
  component: () => import('@/components/tools/GlossaryPanel'),
  tabId: 'glossary',
  shortcuts: ['Cmd+5', 'Ctrl+5'],
  priority: 40,
  actions: {
    execute: {
      schema: z.object({
        documentId: z.string(),
        type: z.enum(['entities', 'all']).default('all'),
        refresh: z.boolean().optional(),
      }),
      handler: 'server',
      timeout: 60000,
    },
    refresh: {
      schema: z.object({
        documentId: z.string(),
      }),
      handler: 'server',
    },
  },
});

// QuickAction Example - Rename Document
const renameDocumentAction = createQuickAction({
  kind: 'action',
  id: 'rename-document',
  name: 'Rename Document',
  description: 'Change the current document title',
  parameters: z.object({
    documentId: z.string(),
    newTitle: z.string().min(1).max(255),
  }),
  perform: async (params, context) => {
    const { documentId, newTitle } = params;
    await updateDocument(documentId, { title: newTitle });
    context.showToast('Document renamed successfully');
  },
  confirmRequired: true,
});

// BackgroundJob Example - Bulk Analysis
const bulkAnalysisJob = createBackgroundJob({
  kind: 'job',
  id: 'bulk-analysis',
  name: 'Analyze Multiple Documents',
  description: 'Run AI analysis on selected documents',
  parameters: z.object({
    documentIds: z.array(z.string()).min(1),
    analysisType: z.enum(['summary', 'entities', 'all']),
  }),
  maxDuration: 600000, // 10 minutes
  start: async (params, context) => {
    const jobId = await startBulkAnalysis(params);
    return { jobId };
  },
  getStatus: async (jobId) => {
    return await checkJobStatus(jobId);
  },
  cancel: async (jobId) => {
    await cancelJob(jobId);
  },
});
```

### Factory Functions with Full Type Safety

```typescript
// Factory function for PaneTool
export function createPaneTool<T extends z.ZodType>(
  definition: Omit<PaneTool, 'parameters'> & { parameters?: T }
): PaneTool & { _paramType: z.infer<T> } {
  const validated = PaneToolSchema.parse(definition);
  return validated as any;
}

// Usage gets full parameter type inference
const tool = createPaneTool({
  // ... tool definition
  parameters: z.object({
    query: z.string(),
    limit: z.number(),
  }),
});

// TypeScript knows the parameter types!
tool.execute({ 
  query: 'test',  // ✓ Required string
  limit: 10,      // ✓ Required number
  // extra: true  // ❌ Type error!
});
```

### Migration Strategy Details

1. **Phase 1: Parallel Systems**
   - Old tools continue working unchanged
   - New tools use v2 registry
   - UI components check both registries

2. **Phase 2: Incremental Migration**
   - Migrate one tool at a time
   - Test thoroughly after each migration
   - Both systems remain operational

3. **Phase 3: Cutover**
   - Remove compatibility layer
   - Delete all old system code
   - Update all imports

4. **Phase 4: Cleanup**
   - No legacy patterns remain
   - Full type safety throughout
   - Clean, maintainable architecture

### Benefits for AI Development

1. **Clear Contracts** - AI agents see exact requirements for each tool type
2. **Compile-time Validation** - Errors caught before runtime
3. **Self-documenting** - Types convey all necessary information
4. **No Ambiguity** - Each tool type has only relevant fields
5. **Parameter Safety** - Full IntelliSense and validation for all parameters