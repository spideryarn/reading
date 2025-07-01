# Tool Architecture Type Safety and Clean Design

## Goal

Completely redesign the Spideryarn tool architecture to fix root architectural issues, provide full type safety, and enable AI agents to write correct code on first attempt. The new architecture will cleanly separate different tool types (UI panes, quick actions, background jobs, navigation links) and provide compile-time validation throughout.

### Context

The current tool system has fundamental architectural issues identified by Gemini and o3 AI models:
- The single `Tool` interface conflates UI panes, API endpoints, and commands
- Parameters are untyped (`Record<string, unknown>`)
- Many validations happen at runtime that should be compile-time
- Inconsistent patterns between tool implementations create confusion

As a zero-user product, we will implement an in-place rewrite in a feature branch, allowing the codebase to be temporarily broken while we migrate to the clean architecture.

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
- All old code removed during in-place migration
- Tests pass and application builds successfully

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

**In-Place Rewrite Strategy**
- Work in feature branch allowing temporary breakage
- Delete old code as we migrate each component
- TypeScript errors guide the migration path
- Merge main at beginning of each stage to stay current

**Tool Type Hierarchy**
```typescript
type ToolEntry = PaneTool | QuickAction | BackgroundJob | NavigationLink
```
- Each type has only relevant fields
- Clear discrimination via `kind` field
- No optional fields that don't apply

**Zod Schema-Based Definition**
- All tool types defined via Zod schemas
- Simple factory functions without complex generics
- Type inference from schemas where possible
- Validate design with real tools before finalizing API

**BackgroundJob Implementation**
- Use `p-queue` for in-memory job execution (already in use for PDF upload)
- Job state ephemeral (lost on restart) - acceptable for now
- Each job gets dedicated PQueue instance
- Simple jobId → status map for tracking

## Stages & Actions

### Stage: Initial Setup and Branch Creation
- [x] Investigate current tool implementations and patterns
- [x] Research web patterns for type-safe plugin systems
- [x] Analyze migration complexity and risks
- [x] Write initial planning document
- [x] Get external AI critique from o3
- [ ] Run `./scripts/sync-worktrees.ts` in subagent to sync with main
- [ ] Create git branch `tool-arch-rewrite` for in-place rewrite
- [ ] Verify we're in feature branch before proceeding
- [ ] Update planning doc with in-place rewrite approach

### Stage: Create New Architecture Foundation
- [ ] Merge main into feature branch
- [ ] Create `lib/tools/types-v2.ts` with discriminated union types
- [ ] Define Zod schemas for PaneTool and QuickAction (start simple)
- [ ] Implement BackgroundJob wrapper using `p-queue`
- [ ] Create simple factory functions (avoid complex generics initially)
- [ ] Write basic tests for schema validation
- [ ] Git commit: "feat(tools): create new tool type definitions"

### Stage: Migrate Glossary Tool (First Real Tool)
- [ ] Merge main into feature branch
- [ ] Convert glossary to PaneTool schema
- [ ] Update glossary handler to work with new types
- [ ] Delete old glossary implementation from registry
- [ ] Fix TypeScript errors in components using glossary
- [ ] Test glossary functionality manually
- [ ] Run tests in subagent: `npm test -- --testPathPattern=glossary`
- [ ] Git commit: "feat(tools): migrate glossary to new architecture"

### Stage: Create QuickAction Example
- [ ] Merge main into feature branch
- [ ] Implement "Rename Document" as QuickAction
- [ ] Update executor to handle QuickAction execution
- [ ] Add QuickAction support to command palette
- [ ] Test rename functionality
- [ ] Validate type inference works correctly
- [ ] Git commit: "feat(tools): add QuickAction support with rename example"

### Stage: Update Registry and Executor
- [ ] Merge main into feature branch
- [ ] Replace old registry with new discriminated union registry
- [ ] Update executor to handle all tool types
- [ ] Remove old Tool interface completely
- [ ] Fix all TypeScript errors from interface removal
- [ ] Run health check in subagent: `npm run check:health`
- [ ] Git commit: "refactor(tools): replace registry and executor"

### Stage: UI Integration Updates
- [ ] Merge main into feature branch
- [ ] Update UnifiedLeftPane for new tool types
- [ ] Update vertical-icon-nav to handle tool kinds
- [ ] Fix command palette to support QuickActions
- [ ] Update keyboard shortcut system for all tool types
- [ ] Add UI for BackgroundJob progress (toast notifications)
- [ ] Test all UI interactions thoroughly
- [ ] Git commit: "feat(tools): update UI components for new tool types"

### Stage: Migrate Search and Structure Tools
- [ ] Merge main into feature branch
- [ ] Convert search tool to PaneTool
- [ ] Convert structure tool with iterate as BackgroundJob
- [ ] Delete old implementations
- [ ] Update all imports and fix TypeScript errors
- [ ] Test both tools thoroughly
- [ ] Run tests in subagent for these tools
- [ ] Git commit: "feat(tools): migrate search and structure tools"

### Stage: Migrate Remaining Tools
- [ ] Merge main into feature branch
- [ ] Migrate summary tool
- [ ] Migrate chat tool with streaming support
- [ ] Migrate highlights tool
- [ ] Migrate metadata tool
- [ ] Delete all old tool implementations
- [ ] Run full test suite in subagent
- [ ] Git commit: "feat(tools): complete tool migration"

### Stage: Add Tool Creation CLI
- [ ] Merge main into feature branch
- [ ] Create `scripts/create-tool.ts` CLI
- [ ] Support scaffolding for each tool type
- [ ] Generate TypeScript, handler, and component files
- [ ] Add validation for tool IDs and shortcuts
- [ ] Document CLI usage
- [ ] Git commit: "feat(tools): add tool creation CLI"

### Stage: Testing and Validation
- [ ] Merge main into feature branch
- [ ] Update Jest test helpers for new tool types
- [ ] Write contract tests for tool interfaces
- [ ] Create "tool doctor" validation script
- [ ] Run comprehensive test suite in subagent
- [ ] Test all tools manually in browser
- [ ] Run `npm run check:health --rigorous` in subagent
- [ ] Git commit: "test(tools): comprehensive test coverage"

### Stage: Documentation Update
- [ ] Merge main into feature branch
- [ ] Update `TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md`
- [ ] Document new tool types and patterns
- [ ] Add migration guide for future tools
- [ ] Update CLAUDE.md with new patterns
- [ ] Create troubleshooting guide
- [ ] Git commit: "docs(tools): update documentation for new architecture"

### Stage: Final Cleanup and Merge Preparation
- [ ] Merge main into feature branch
- [ ] Review all changes for consistency
- [ ] Ensure no old tool code remains
- [ ] Run final build and all tests
- [ ] Create PR description with migration summary
- [ ] Git commit: "chore(tools): final cleanup before merge"

### Stage: Merge to Main
- [ ] Discuss merge strategy with user
- [ ] Run final validation checks
- [ ] Get user permission to merge
- [ ] Merge `tool-arch-rewrite` to main
- [ ] Delete feature branch
- [ ] Move planning doc to `planning/finished/`
- [ ] Final git commit on main

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
  icon: z.string(), // Icon name to look up at runtime
  componentPath: z.string(), // Path for dynamic import
  tabId: z.string(),
  shortcuts: z.array(z.string()).optional(),
  priority: z.number().default(100),
  requiresDocument: z.boolean().default(true),
  actions: z.record(z.string(), z.object({
    schema: z.any(), // Zod schema for parameters
    handler: z.enum(['server', 'local']),
    timeout: z.number().optional(),
  })).optional(),
});

// QuickAction - Instant actions without UI
const QuickActionSchema = BaseToolSchema.extend({
  kind: z.literal('action'),
  shortcuts: z.array(z.string()).optional(),
  icon: z.string().optional(), // Icon name
  parameters: z.any(), // Zod schema for action parameters
  handler: z.enum(['server', 'local']),
  confirmRequired: z.boolean().default(false),
});

// BackgroundJob - Long-running operations
const BackgroundJobSchema = BaseToolSchema.extend({
  kind: z.literal('job'),
  parameters: z.any(), // Zod schema for job parameters
  maxDuration: z.number().default(300000), // 5 minutes
  concurrency: z.number().default(1), // PQueue concurrency
  handler: z.literal('server'), // Always server-side
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
  icon: 'book-open', // Icon name as string
  componentPath: '@/components/tools/GlossaryPanel',
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
  handler: 'server',
  confirmRequired: true,
});

// BackgroundJob Example - Structure Iteration
const structureIterateJob = createBackgroundJob({
  kind: 'job',
  id: 'structure-iterate',
  name: 'Generate AI Headings (Iterative)',
  description: 'Iteratively generate document structure',
  parameters: z.object({
    documentId: z.string(),
    maxIterations: z.number().default(10),
  }),
  maxDuration: 600000, // 10 minutes
  concurrency: 1, // Sequential processing
  handler: 'server',
});
```

### Factory Functions (Simplified)

```typescript
// Simple factory function for PaneTool
export function createPaneTool(definition: z.input<typeof PaneToolSchema>): PaneTool {
  return PaneToolSchema.parse(definition);
}

// Usage - rely on schema validation
const tool = createPaneTool({
  kind: 'pane',
  id: 'glossary',
  name: 'Glossary',
  // ... other fields
  actions: {
    execute: {
      schema: z.object({
        documentId: z.string(),
        type: z.enum(['entities', 'all']),
      }),
      handler: 'server',
    },
  },
});

// Parameters validated at runtime by schema
await executeAction(tool, 'execute', { 
  documentId: '123',
  type: 'all',
});
```

### In-Place Rewrite Strategy

1. **Branch Setup**
   - Create `tool-arch-rewrite` feature branch
   - Allow codebase to be temporarily broken
   - Merge main at beginning of each stage

2. **Migration Process**
   - Delete old code as we migrate
   - TypeScript errors guide what needs fixing
   - Test after each tool migration
   - Commit frequently to track progress

3. **Testing Approach**
   - Run relevant tests in subagents
   - Manual testing for UI changes
   - Full suite before merge

4. **Merge Strategy**
   - Keep branch current with main
   - Final review with user
   - Single merge when complete

### BackgroundJob Implementation Details

```typescript
import PQueue from 'p-queue';

// In-memory job tracking
const jobQueues = new Map<string, PQueue>();
const jobStatus = new Map<string, JobStatus>();
const jobAbortControllers = new Map<string, AbortController>();

interface JobStatus {
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  result?: any;
  error?: string;
}

// Helper to get or create queue for a job type
function getJobQueue(jobId: string, concurrency: number): PQueue {
  if (!jobQueues.has(jobId)) {
    jobQueues.set(jobId, new PQueue({ concurrency }));
  }
  return jobQueues.get(jobId)!;
}
```

**Note**: Job state is ephemeral - lost on server restart. This is acceptable for MVP with zero users.

### Benefits for AI Development

1. **Clear Contracts** - AI agents see exact requirements for each tool type
2. **Compile-time Validation** - Errors caught before runtime
3. **Self-documenting** - Types convey all necessary information
4. **No Ambiguity** - Each tool type has only relevant fields
5. **Parameter Safety** - Full IntelliSense and validation for all parameters

### Key Risks and Mitigation

**Risks:**
- Branch divergence if migration takes too long
- TypeScript complexity with dynamic imports
- UI breakage during migration
- Test failures masking real issues

**Mitigation:**
- Merge main frequently (every stage)
- Start with simple types, validate with real tools
- Test UI manually at each stage
- Use subagents for test runs to understand failures