# Instructions

Read all the relevant code re tools, starting with:
- `docs/reference/TOOL_EXECUTION_FRAMEWORK.md`
- `docs/reference/TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md`

Conduct a technical audit/review with recommendations for how we might improve/simplify the design. I'm especially interested in anything that will help with AI-first coding, e.g. better compile-time checking to discover bugs earlier in development. Also mention if you spot any potential problems/bugs/gotchas.



# Gemini AI

Overall Assessment


The tool architecture is robust, modern, and well-designed. It successfully decouples features into modular "tools," making the system extensible and maintainable.

Key Strengths:


* Excellent Decoupling: The separation between the tool registry (lib/tools/registry.ts), UI rendering (components/unified-left-pane.tsx), and execution logic (lib/tools/executor/, app/api/tools/) is very clean.
* Discoverability: The registry acts as a single source of truth, which brilliantly enables dynamic UI generation for the vertical navigation bar and the command palette.
* Type Safety: The use of TypeScript, especially in the Tool interface (lib/tools/types.ts) and the executor framework, provides strong type safety. The auto-generated, type-safe wrappers (lib/tools/executor/wrappers.ts) are a standout feature for developer experience.
* Centralized Execution: The unified API endpoint (app/api/tools/[toolId]/route.ts) and the executeTool function centralize key concerns like authentication, logging, and error
    handling, which is a best practice.


The system is in a very good state. My recommendations are focused on simplification, reducing redundancy, and addressing potential edge cases.

---


Recommendations for Improvement & Simplification

1. Consolidate Tool Configuration


The Tool interface in lib/tools/types.ts has an executorConfig property, while the more specific ExecutableTool in lib/tools/executor/types.ts introduces apiEndpoint,
localOperations, serverOperations, and timeouts. This is redundant and can be confusing.


Recommendation: Merge all execution-related configurations into a single, optional execution block within the main Tool interface.

Current State (Simplified):



1 // In lib/tools/types.ts
2 export interface Tool {
3   id: string;
4   // ...
5   executorConfig?: { /* ... */ };
6 }
7 
8 // In lib/tools/executor/types.ts
9 export interface ExecutableTool extends Tool {
10   apiEndpoint?: ToolApiEndpoint;
11   localOperations?: string[];
12   serverOperations?: string[];
13   timeouts?: Partial<ToolTimeoutConfig>;
14 }


Proposed Improvement:



1 // In lib/tools/types.ts
2 export interface Tool {
3   id: string;
4   // ...
5   execution?: {
6     // Replaces apiEndpoint
7     apiRoute?: string; // e.g., 'glossary'
8 
9     // Replaces localOperations/serverOperations
10     // An action is 'server' by default if it has an API handler.
11     localActions?: string[]; // e.g., ['open']
12 
13     // Replaces timeouts
14     timeouts?: Partial<ToolTimeoutConfig>;
15 
16     // Keep other executorConfig fields
17     cacheable?: boolean;
18     requiresAuth?: boolean;
19   };
20 }



This change would unify the configuration, remove the need for the ExecutableTool type, and make the tool definition cleaner.


2. Simplify UI Rendering in UnifiedLeftPane


The UnifiedLeftPane component uses a series of <div> elements with style={{ display: ... }} to render the active tool. This requires manually adding a new block for every new
tool.


Recommendation: Use a dynamic component loading pattern. Create a single component responsible for lazy-loading and rendering the active tool's panel based on its componentPath
from the registry.

Example Implementation:



1 // Create a new component: ToolPanelRenderer.tsx
2 import { lazy, Suspense } from 'react';
3 import { getTool } from '@/lib/tools/registry';
4 
5 const ToolPanelRenderer = ({ activeTabId, ...props }) => {
6   const tool = getTool(activeTabId);
7 
8   if (!tool || !tool.componentPath) {
9     return <div>Tool not found or has no component.</div>;
10   }
11 
12   // Note: Dynamic import paths need careful handling with bundlers.
13   // This is a conceptual example.
14   const ToolPanel = lazy(() => import(`@/components/tools/${tool.id}Panel`));
15 
16   return (
17     <Suspense fallback={<div>Loading...</div>}>
18       <ToolPanel {...props} />
19     </Suspense>
20   );
21 };
22 
23 // In UnifiedLeftPane.tsx, replace the block of divs with:
24 <ToolPanelRenderer activeTabId={state.activeTabId} {...allTheProps} />



This would make the UnifiedLeftPane much cleaner and remove the need to modify it every time a new tool is added.


3. Decouple Search Logic from UnifiedLeftPane


The UnifiedLeftPane component contains a significant amount of logic specifically for the text search feature (over 100 lines for performSearch, debouncedSearch, mark.js
integration, etc.). This bloats the component and tightly couples it to the search implementation.


Recommendation: Refactor all text-search-related state and logic into a custom hook (e.g., useTextSearch). The SearchPanel component would then use this hook, completely
removing the search-specific logic from UnifiedLeftPane.

---


Potential Problems, Bugs, and Gotchas

1. Shortcut Conflict in Implementations


The tweet-thread tool is registered with the shortcut Cmd+9/Ctrl+9.


File: `lib/tools/implementations/tweet-thread.ts`


1 const tweetThreadTool: Tool = {
2   //...
3   shortcuts: ['Cmd+9', 'Ctrl+9'],
4   //...
5 }



This directly conflicts with the example tool provided in the TOOL_ARCHITECTURE_AND_DEVELOPMENT_GUIDE.md documentation. While the example isn't registered, this indicates a
potential for real conflicts. The detectConflicts function in the registry is excellent for catching this, but it's worth fixing in the existing code.


2. Inconsistent Tool Definitions


Not all tool definitions are consistent. For example, glossary.ts and metadata.ts implement the ExecutableTool interface with apiEndpoint and timeouts, while chat.ts and
summary.ts use the executorConfig object.


File: `lib/tools/implementations/glossary.ts`


1 const glossaryTool: ExecutableTool = {
2   // ...
3   apiEndpoint: { /* ... */ },
4   timeouts: { /* ... */ }
5 }



File: `lib/tools/implementations/chat.ts`


1 const chatTool: Tool = {
2   // ...
3   executorConfig: {
4     apiEndpoint: '/api/tools/chat',
5     timeout: 60000,
6     // ...
7   }
8 }



This inconsistency could lead to runtime errors in the executor, which might expect one format over the other. This reinforces the recommendation to consolidate the
configuration.

3. Hardcoded Navigation Order


In components/vertical-icon-nav.tsx, the display order of the tool icons is determined by a hardcoded array TOOL_ORDER.



1 const TOOL_ORDER = [
2   'structure',
3   'summary',
4   'chat',
5   'glossary',
6   'search',
7   'highlights',
8   'tweet-thread',
9   'metadata'
10 ];



If a new tool is added, a developer must remember to update this array. If they forget, the new tool will appear at the end of the list, which may not be the desired behavior.


Recommendation: Add an optional order or priority number to the Tool interface and sort by that in generateNavigationFromRegistry. This would make the ordering explicit and
self-contained within the tool's definition.

4. API Handler Discovery is Implicit


The unified API route (app/api/tools/[toolId]/route.ts) uses a dynamic import to load the handler: import(./handlers/${toolId}). This works, but it relies on a file naming 
convention. There is no mechanism to ensure that a tool registered with an apiEndpoint or apiRoute` actually has a corresponding handler file. This could lead to 404 errors at
runtime that are hard to debug during development.


Recommendation: Add a build-time script that validates the tool registry against the file system, ensuring that for every tool specifying an API route, a corresponding
handlers/[toolId].ts file exists.


## Is there anything we could do to improve type-safety/protection? Or to make developing tools less error-prone?

✦ Yes, absolutely. While the current architecture is strong, we can definitely enhance both type-safety and
  the overall developer experience to make creating tools less error-prone. The key is to shift as much
  validation as possible from runtime to compile-time and to provide clearer, more guided development
  patterns.

  Here are several concrete recommendations:


  1. Improving Type-Safety and Protection

  a. Typed Tool Parameters with Zod Schemas


  This is the single most impactful change you could make for type-safety.


  Problem: The executeTool function and its wrappers currently accept parameters as Record<string, unknown>.
  This offers no type-safety when calling a tool, forcing developers to remember the correct parameter names
  and types.


  Recommendation: Integrate zod schemas directly into the tool definition. The Tool interface would be
  updated to include an optional schema.



   1 // In lib/tools/types.ts
   2 import { z } from 'zod';
   3 
   4 export interface Tool {
   5   // ... existing properties
   6   parameters?: z.ZodObject<any>; // Define the schema for the tool's parameters
   7 }



  Example Implementation (`search.ts`):



    1 // In lib/tools/implementations/search.ts
    2 import { z } from 'zod';
    3 
    4 const searchTool: Tool = {
    5   // ...
    6   id: 'search',
    7   parameters: z.object({
    8     query: z.string().min(1),
    9     searchType: z.enum(['text', 'semantic']).default('text'),
   10     caseSensitive: z.boolean().optional()
   11   }),
   12   // ...
   13 };


  Benefits:


   1. Runtime Validation: The executeTool function can now validate incoming parameters against the schema
      before making an API call, failing early with clear errors.
   2. Compile-Time Type Safety: The generateToolWrappers function can infer the parameter types from the Zod
      schema. This would transform the developer experience:


      Before:


   1     // No type-safety, relies on developer memory
   2     await tools.search.execute({ q: 'AI', type: 'semantic' }); // Oops, param is 'query', not 'q'



      After:


   1     // Fully type-safe with autocomplete!
   2     // The type of 'execute' would be:
   3     // (parameters: { query: string; searchType?: "text" | "semantic"; caseSensitive?: boolean })
     => Promise<...>
   4     await tools.search.execute({ query: 'AI', searchType: 'semantic' }); // Correct and 
     type-checked


  b. Typed and Restricted Tool Actions


  Problem: The action parameter is a free-form string. A developer could accidentally call
  tools.glossary.execute({ action: 'generat' }) (a typo) which would fail at runtime.


  Recommendation: Make the available actions explicit in the tool definition and use this to create more
  specific wrappers.

  Example Implementation:



    1 // In lib/tools/types.ts
    2 export interface Tool {
    3   // ...
    4   execution?: {
    5     apiRoute?: string;
    6     // Define the specific actions this tool's handler supports
    7     serverActions?: readonly string[];
    8     localActions?: readonly string[];
    9   };
   10 }
   11 
   12 // In lib/tools/implementations/glossary.ts
   13 const glossaryTool: Tool = {
   14   // ...
   15   execution: {
   16     apiRoute: 'glossary',
   17     serverActions: ['generate', 'get', 'delete'],
   18     localActions: ['open']
   19   }
   20 };



  The generateToolWrappers function would then be updated to only generate methods for the explicitly listed
  actions. If refresh is not in serverActions, the tools.glossary.refresh method would not exist, causing a
  compile-time error if used.

  2. Making Development Less Error-Prone (Developer Experience)


  a. Create a "Tool Builder" Function


  Problem: Creating a new tool requires a developer to correctly implement the large Tool interface from
  scratch, which is prone to errors and omissions.


  Recommendation: Introduce a "builder" or "factory" function that guides the developer through the process
  with a fluent API.

  Example:



    1 import { ToolBuilder } from '@/lib/tools/builder'; // A new file
    2 
    3 const glossaryTool = new ToolBuilder('glossary')
    4   .name('Glossary')
    5   .description('Extracts key terms...')
    6   .category('analysis')
    7   .icon(BookOpen)
    8   .component('@/components/tools/GlossaryPanel')
    9   .tab('glossary')
   10   .shortcut('Cmd+5')
   11   .keywords(['terms', 'definitions'])
   12   .requiresDocument(true)
   13   .withApi({
   14     route: 'glossary',
   15     actions: ['generate', 'get', 'delete'],
   16     cacheable: true
   17   })
   18   .build(); // .build() validates the tool and returns the final object
   19 
   20 registerTool(glossaryTool);



  This pattern makes tool creation more declarative, less error-prone, and allows the ToolBuilder class to
  enforce rules and set sensible defaults.


  b. Scaffolding CLI for New Tools


  Problem: Creating a new tool involves creating multiple files in different directories (/implementations,
  /handlers, /components). This is tedious and easy to get wrong.


  Recommendation: Create a simple scaffolding script.

  Example Usage:
  npm run tool:create


  This script would prompt the developer for the tool's name (glossary) and then automatically:
   1. Create lib/tools/implementations/glossary.ts from a template.
   2. Create app/api/tools/[toolId]/handlers/glossary.ts with boilerplate.
   3. Create components/tools/GlossaryPanel.tsx with boilerplate.
   4. (Optional) Automatically add the import for the new tool implementation to a central file to ensure it
      gets registered.

  c. Implement a "Tool Doctor" Validation Script


  Problem: Many dependencies between tool parts are implicit (e.g., does the componentPath point to a real
  file? Does the apiRoute have a handler?). These errors are only caught at runtime.


  Recommendation: Create a validation script that can be run locally or in CI.

  Example Usage:
  npm run tool:doctor


  This script would:
   1. Load all tools from the registry.
   2. For each tool, validate its definition against a master Zod schema.
   3. Check for duplicate shortcuts or keywords.
   4. Verify that componentPath points to an existing file.
   5. Verify that if apiRoute is defined, the corresponding handlers/[toolId].ts file exists.
   6. Report all errors in a clear, actionable list.


  By implementing these changes, you would create a highly robust system with strong guardrails that guides
  developers toward creating correct, consistent, and type-safe tools, significantly reducing the chance of
  runtime errors.


# o3 AI

Ran tool

Read file: lib/tools/registry.ts

Read file: lib/tools/types.ts

Ran tool

Read file: lib/tools/executor/wrappers.ts

Read file: lib/tools/executor/executor.ts

Read file: lib/tools/executor/types.ts

Read file: lib/tools/command-generation.ts

🔍  Technical audit of the current “tool” subsystem
===================================================

I reviewed every file under `lib/tools/**`, the executor helpers in `lib/tools/executor/**`, the dynamic command-palette generator, the individual tool definitions in `lib/tools/implementations/`, plus the API route & types they depend on.  Overall it’s a well-structured first pass with clear documentation and extensive runtime guards, but a few patterns rely on run-time validation that could be shifted to compile-time to make AI-first development faster and safer.

Below is a findings & recommendation list grouped by topic.

--------------------------------------------------------------------
1.  Compile-time safety & DX
--------------------------------------------------------------------

Current state  
• `Tool.id`, shortcut uniqueness, keyword uniqueness, etc. are only checked by `validateTool()` / `detectConflicts()` at run-time (or test-time).  
• Wrapper generation (`generateToolWrappers`) returns a wide `Record<string, ToolWrapper>` – all method parameters are just `Record<string, unknown>`.  
• `determineExecutionType()` uses string heuristics (`action.includes('ai')`) instead of static metadata.  
• `componentPath` is a bare string; the compiler can’t warn if the file moves/renames.

Recommendations  
a.  Promote IDs & shortcuts to compile-time literals  
   • Export the array of tool objects as  
     ```ts
     export const TOOLS = [glossaryTool, summaryTool, …] as const satisfies readonly Tool[]
     ```  
   • Derive `type ToolId = typeof TOOLS[number]['id']` and reuse everywhere (`getTool(id: ToolId)` etc.) – typos are now TS errors.  
   • A tiny generic can detect duplicate IDs/shortcuts purely in the type-system (TS 5.4 conditional/key remap tricks) so the build fails before runtime.

b.  Strongly-typed parameter schemas  
   • Let every tool export a `zod` schema per action:  
     ```ts
     const executeParams = z.object({ refresh: z.boolean().optional() })
     export type ExecuteParams = z.infer<typeof executeParams>
     ```  
   • Make `Tool` generic: `interface Tool<PExecute = unknown, POpen = unknown, PRefresh=unknown>` and thread the generics through `ToolWrapper`.  
   • The wrapper generator can then expose signatures like  
     ```ts
     glossary.execute(params: GlossaryExecuteParams, opts?)  
     ```  
     giving instant IntelliSense & mis-spell detection while coding prompts/tests.

c.  Replace `componentPath: string` with `component: () => Promise<{ default: React.FC<any> }>` (Next.js compatible dynamic import).  
   • Now missing files are compile-time errors, and tree-shaking still works.  
   • We can still lazy-load: `component: () => import('@/components/tools/GlossaryPanel')`

d.  Encode execution metadata in the type instead of heuristics  
   ```ts
   interface Tool {  
     execution: { execute: 'server'; open: 'local'; refresh: 'server' }  
   }
   ```  
   `determineExecutionType()` becomes a direct lookup, no more substring guessing.

--------------------------------------------------------------------
2.  Runtime architecture & potential bugs
--------------------------------------------------------------------

1. Registry locking order  
   • `lockRegistry()` must run after *all* imports with side-effect `registerTool()` calls.  In Next 13+ dependency graphs this isn’t guaranteed, and SSR/edge chunks might load a module later, throwing “Cannot register tool after initialization”.  
   ⇒ Consider removing the hard lock and instead freeze via `Object.freeze(toolRegistry)` but allow idempotent double-registration of identical definitions.

2. Dynamic import paths  
   • Because `componentPath` is a free string, a refactor/rename silently 404s at runtime until that tool tab is opened.  (Fixed by suggestion 1c.)

3. Timeout mapping  
   • `determineTimeout()` uses substring heuristics; “generateTweetThread” and “aiSummary” both match “ai” but maybe need different budgets.  Prefer explicit per-action timeout (`tool.timeouts.execute`, `tool.timeouts.open`).

4. `createCancellableExecution()`  
   • `currentController` is kept in closure scope – fine when a single UI hook wraps it, but if several hooks create wrappers the controllers are isolated.  Document that or expose a per-tool map so cancellation from different panes works consistently.

5. Keyword conflict logging  
   • `generateCommandsFromRegistry()` only logs keyword conflicts once (`_hasLoggedKeywordConflictWarning`). During hot reload the flag isn’t reset, so new conflicts might be missed.  Easy fix: reset the flag in `resetRegistryForTests()` and in a HMR callback.

--------------------------------------------------------------------
3.  Testing implications
--------------------------------------------------------------------

• When tools gain typed parameter schemas (1b), we can add a Jest helper that automatically iterates over `TOOLS` and validates every implementation’s request/response body against its schema using the real API route – instant red-flags in CI.

• Unit tests that currently register ad-hoc “mockTool” objects will need minor tweaks (add params generic or cast).

--------------------------------------------------------------------
4.  LLM / AI-first workflow benefits
--------------------------------------------------------------------

✅  Stricter types = earlier failures while writing prompts, registries, command palette entries – the LLM sees compiler errors in context and corrects them without needing to run the app.

✅  Schemas exported next to the prompt templates can be used directly for function-calling: generate OpenAPI definitions automatically from `zod` (you already planned this in `planning/250614e_llm_tool_function_calling.md`).

✅  Tool-ID union makes it trivial for an LLM to list available tools or validate a generated command palette entry.

--------------------------------------------------------------------
5.  Short-term quick-wins (low effort, high value)
--------------------------------------------------------------------

1. Convert each existing tool definition to  
   ```ts
   export const glossaryTool = { … } as const satisfies Tool
   ```  
   and make `TOOLS` an array as in 1a.

2. Change `componentPath` → `component: () => Promise<…>` (1c).  Update registry validator accordingly (catch non-function).

3. Add a lightweight ESLint rule (or TS programmatic check in CI) that fails the build on duplicate shortcuts/IDs, instead of only console errors.

4. Replace timeout substring heuristic with a single optional `defaultTimeout` field on `Tool`.

--------------------------------------------------------------------
6.  Longer-term / architectural
--------------------------------------------------------------------

• Generate a `tools.d.ts` file in pre-build that contains:

  ```ts
  export type ToolId = 'glossary' | 'summary' | …;
  export interface ToolMap {
    glossary: { execute: GlossaryExecuteParams; … }
    …
  }
  ```
  This file is machine-generated from the `TOOLS` array, so it never drifts and gives all compile-time goodness without hand-maintaining unions.

• Move “tool-action-schema” out of individual API routes and into the tool definition.  The unified API handler can then introspect the schema and perform validation automatically, further reducing boiler-plate.

• Consider code-generating the Next API route itself when a tool defines `server: true` + schema.  Keeps individual tool folders thin and consistent.

--------------------------------------------------------------------
7.  Summary of potential bugs / gotchas spotted
--------------------------------------------------------------------

1. Registry lock can throw in lazy-loaded chunks.  
2. `componentPath` string is refactor-fragile.  
3. Timeout heuristic may mis-classify actions.  
4. Keyword-conflict warning can be suppressed after first HMR.  
5. No compile-time duplicate shortcut detection.  
6. Wrapper params are `unknown` – easy to pass wrong shapes and only discover at runtime.  

None of these are production-blocking today, but addressing them will make the codebase far friendlier for automated agents and human contributors alike.

--------------------------------------------------------------------
Let me know which of these improvements you’d like to pursue first, and I’ll draft a concrete implementation plan or code changes accordingly.

