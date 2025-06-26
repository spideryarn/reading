# Critiquing document heading transformations
_Exported on 25/06/2025 at 23:05:59 BST from Cursor (1.1.6)_

---

**User**

Read @MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md and relevant code & docs.

Apply the methodology from @CRITIQUE_OF_PLANNING_DOC.md to critiquing this approach.

I'm particularly interested in how to handle headings. When we import the doc, we try and augment the headings (adding new, more granular sub-headings to make the structure of the document more visible). This uses the Mutations framework, so that the LLM can respond with a data structure that then gets applied to change the headings. And then we can reverse it if we want.

see @TOOL_HEADINGS.md 

I'm considering whether there might be a simpler, more standard way to do this. Is there a standard JSON patch data structure/library for applying changes to a DOM? Or a TypeScript library that has its own typed data structure for DOM operations that we can piggyback on? Search the web.

---

**Cursor**

Critique of the current “Reversible Mutations” approach for AI-generated headings  
==========================================================================

(Framework: follow the questions/check-list in `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` – focus on high-impact architecture issues, potential pitfalls, and realistic alternatives.)

1. Does the design understand the problem?
   • Yes.  We need to insert granular sub-headings that can be undone later, ideally without polluting the permanent source and without surprising users.  
   • The doc clearly states the main constraints – reversibility, immediate UI feedback, single-active-mutation for v1, later composition, etc.

2. Will the proposed solution address the problem?
   • Mostly, but it re-implements a bespoke patch format that is ~80 % identical to existing, battle-tested standards (RFC-6902 JSON Patch) or DOM diff/patch libraries.  
   • The custom format already duplicates `op`, `targetId`, `content`, etc.  This gives us tight control over Supabase row IDs, but also means:  
     – We must own the entire validation, diff, OT/CRDT story.  
     – Any external tools (debuggers, network inspectors, back-end patch storage) need adapters.  
     – Library code such as `MutationEngine.updateElementPositions()` is a TODO – a known source of off-by-one bugs.

3. Hidden complexity / future problems
   a. ID vs Path-based addressing  
      • JSON Patch addresses by JSON Pointer paths (`/sections/3/title`).  Your scheme addresses by `afterId` or `targetId`, which is safer against index drift but forces a flat element list + manual `position` bookkeeping.  
      • The current `updateElementPositions()` is no-op (see `lib/services/mutation-engine.ts` ≈ 511).  Any missed position update breaks sibling ordering.  
   b. Composition & conflicts  
      • “Single active mutation” sidesteps conflicting patches, but the moment we allow “headings + summaries” together we’ll need conflict resolution.  Re-inventing OT/CRDT is heavy.  
   c. Test coverage / Validation  
      • Forward & reverse transforms are validated, but not the **semantic** result (e.g. heading levels becoming illegal H1 → H4 → H2 zig-zags).  
   d. Persistence  
      • JSONB columns in Supabase could store an RFC-6902 patch verbatim; today we have to serialize the custom shape.

4. Are there simpler or more standard alternatives?
   • **RFC-6902 JSON Patch (+ `fast-json-patch` or `rfc6902`)**  
     – Mature TS typings, 4 M weekly downloads, generates & validates patches.  
     – Supports `add | remove | replace | move | copy | test` – our four ops map cleanly (insert → add, etc.).  
     – Pointers could use a stable ID index e.g. `/byId/para-123` to keep ID-based robustness.  
     – Bonus: many DBs & API gateways recognise `application/json-patch+json`.  
   • **DOM-diff libraries** (`diffDOM`, `dom-diff`, `visual-dom-diff`) produce patch objects that can be applied or undone.  They operate on real DOM; for a server‐side AST we’d still need an adapter but they give:  
     – Automatic diff generation → less LLM output mass (LLM just returns “ideal HTML with headings”, we diff on the server).  
     – Built-in undo via inverse patch.  
   • **Slate / ProseMirror step logs** – proven, but heavier and editor-centric.  
   • **CRDT libs** (Yjs, Automerge) – future-proof for multi-user editing, but probably overkill for single-user heading insertion today.

5. Suggested improvements / guidelines
   1. Adopt RFC-6902 as the on-wire & persistence format; keep thin mapping helpers so `MutationEngine` works with either shape.  
      – Lets us plug in `fast-json-patch` for validation & inversion.  
      – Avoids maintaining custom diff/patch logic long-term.  
   2. Introduce a small “path ⇄ id” resolver layer so patches stay stable even if sibling ordering changes.  
   3. For heading generation flow:  
      a. LLM returns *desired* HTML fragment (or markdown AST) rather than mutation object.  
      b. We run `diffDOM` (or JSON diff) between current doc section & desired section → JSON Patch.  
      c. Store & apply that patch via standard engine.  
      This removes the need to teach every prompt template the internal patch shape and gives us automatic reverse patches.  
   4. Finish / unit-test `updateElementPositions()` or drop explicit `position` field and derive order from array index when serialising.  
   5. Start thinking now about multi-mutation composition: even if v1 stays “single active”, choose a format that can merge (JSON Patch + OT library, or CRDT later).  
   6. Tooling: add a dev-only inspector that displays the JSON Patch alongside the rendered diff – debugging becomes trivial.

6. Overall verdict
   • The custom mutation framework works and is easy to reason about, but we are **rebuilding features we could get for free**.  
   • Switching to a standard (or at least storing patches in a standard shape) will lower maintenance cost, ease adoption of external tooling, and position us better for future collaborative editing.  
   • If timeline forbids a full switch now, at minimum wrap the current transforms in an interface that can later emit/ingest RFC-6902 without touching UI code.

Actionable next steps (non-destructive, incremental)
---------------------------------------------------
1. Spike: convert one existing heading-mutation test to emit RFC-6902 using `fast-json-patch.compare`, apply with its `applyPatch`, and measure code churn.  
2. Prototype LLM → HTML → `diffDOM.diff` → JSON Patch → current render cycle; validate reverse patch.  
3. Add exhaustive tests for `updateElementPositions()` and heading-level legality before rolling out further.

These steps follow the “small stages, working code at each stop” rule from the user’s process guidelines and can be paused or rolled back easily.

---

**User**

This sounds interesting.

Thoughts:

- There's another use-case we haven't discussed. Let's say I'm importing a PDF via LLM transcription to HTML, and then I want to do a post-processing to tidy it up, which might involve a lot of fine-grained/nuanced changes to the generated HTML, e.g. de-hyphenating, fixing typos, adding classes, merging elements that span pages, etc. Is the JSON PATCH framework rich enough? Will it require the patches to be too verbose (which will make the LLM post-processor much slower)? I suppose perhaps we could augment the JSON PATCH with extra stuff, but that defeats much of the purpose of using a standard thing.

- What about libraries like Cheerio, JSDom, JQuery, or ProseMirror. Do they define nice data structures for making changes that we can piggy-back on? Search the web as needed.

- We don't care at all about backwards compatibility. We have zero users so far.

---

**Cursor**

Key question 1 – Is JSON Patch expressive (and efficient) enough for the “clean-up my freshly OCR-to-HTML PDF” pipeline?  
-----------------------------------------------------------------

Typical clean-up actions           | Can vanilla RFC-6902 express it?                              | Notes on verbosity / performance
-----------------------------------|---------------------------------------------------------------|---------------------------------
De-hyphenate words across line-breaks | Yes – a single `replace` op for each affected text node.         | If you run a script/regex locally you’ll generate the patch in code, not in the LLM, so size is irrelevant.  
Fix individual typos               | Yes – `replace` on the text node.                              | Same as above.  
Add / change class names           | Yes – `add` or `replace` on `/…/class` attribute.              | One op per element; trivial to auto-generate.  
Merge elements that were split at a page break | Yes, but requires two ops: `remove` the second fragment and `replace` the first with the concatenation (or an `add` into the first then a `remove`). | Slightly chatty, but you’ll create these ops in code; the patch stays small (bytes, not kilobytes).  
Bulk regex replacements            | Many small `replace` ops **or** generate a new HTML subtree and let a diff library collapse them. | Diff engines usually turn a long text change into a single `replace`.  
Tag entire ranges (e.g. wrap multiple paragraphs in a `<section>`) | Yes – a handful of `add` + `move`/`remove`.                    | Generation is mechanical.  

Take-away: JSON Patch itself is “atomic-level”; hand-authoring a huge patch would be painful, **but we never have to**:

1. Let the LLM (or a deterministic script) emit the *desired* fixed HTML.  
2. Run `diffDOM` / `fast-json-patch.compare` / `rfc6902.createPatch` locally.  
3. Store / transmit the compact patch that those libs produce.  
   • Merging 40 typos in one paragraph usually diff-collapses to **one** `replace` op for that text node.  
   • So patch size grows with *semantic* change-count, not raw character count.

If a few operations feel unnatural (e.g. “regex replace”), keep JSON Patch as the canonical payload but add a lightweight, compile-time macro layer:

```ts
type ExtendedOp = StandardJsonPatchOp | { op:'regex-replace', path: string, pattern: string, replacement: string }
```

You expand that into vanilla RFC-6902 before validation / persistence, preserving standards compliance without bloating storage.

Key question 2 – Do existing DOM/HTML libraries give us a better diff/patch model?  
-------------------------------------------------------------------------------

Library / model           | What it gives you                                   | Why it isn’t a drop-in replacement
--------------------------|------------------------------------------------------|-----------------------------------
Cheerio / JSDOM / jQuery  | Imperative mutation API (traverse, `.text()`, etc.) | No persisted *patch* format; you’d still have to capture operations.  
diffDOM / dom-diff        | DOM → DOM diff + patch apply/undo                   | Excellent as **patch generator**, but their patch dialect is project-specific.  Easy to convert their output to RFC-6902 paths, though.  
ProseMirror “Step” log    | Rich, reversible operations over a schema-driven document; proven with collaborative editing. | Heavyweight; requires defining a PM schema, serialisers, and custom rendering. Great if you plan a real in-browser editor, overkill for server-side post-processing.  
Slate operations          | Similar to ProseMirror, but React-centric.          | Same trade-off – powerful, high integration cost.  
Yjs / Automerge (CRDT)    | Real-time multi-user merge; updates are small deltas | Future-proof, but complexity you don’t need today.  

Conclusion: none of those libraries beats “JSON Patch + optional diffDOM as a generator” for **server-side** transformation + **simple** client-side undo/redo.  If you later add a WYSIWYG editor, adopting ProseMirror/Slate inside the editor is fine – just have the editor export its changes as JSON Patch before they hit the back-end.

Key question 3 – LLM cost / verbosity  
---------------------------------------

The LLM never needs to speak JSON Patch.  Two proven patterns:

1. **“Ideal HTML” pattern**  
   LLM→ returns corrected HTML (or Markdown AST).  
   Server→ `diffDOM` + `jsonpatch.compare` → compact RFC-6902 patch.  
   Patch size is independent of original HTML length, so token usage stays modest.

2. **“Transformation instructions” pattern**  
   LLM→ returns high-level commands (“remove hyphen at end of lines, fix common OCR ligatures”).  
   Server→ deterministic script generates JSON Patch.  
   Almost zero tokens.

Either way the LLM cost is dominated by analysing the content, not by emitting the patch.

Recommendations (given you have no backward-compat constraints)  
---------------------------------------------------------------

1. **Adopt RFC-6902 JSON Patch as the persisted / network format.**  
   • Keep your current `Mutation` TypeScript types but store `forward`/`reverse` as raw RFC-6902 arrays (or a tiny wrapper).  
2. **Use a diff library as patch *generator*** for large clean-ups.  
   • `fast-json-patch.compare(objA,objB)` for AST → AST.  
   • `diffDOM.diff(domA, domB)` then convert nodes to JSON Pointer paths.  
3. **Wrap repetitive tasks in helper functions instead of inventing new op kinds.** Example:

   ```ts
   function dehyphenate(nodePath: string, original: string, fixed: string): Operation[] {
     return [
       { op:'test', path: nodePath, value: original },
       { op:'replace', path: nodePath, value: fixed }
     ]
   }
   ```
4. **Keep the bespoke MutationEngine only as a thin façade**:  
   – Validation → delegate to `fast-json-patch.validate`.  
   – Apply/Revert → delegate to `applyPatch` plus your ID/path resolver.  
5. **Re-evaluate later** if you add a full collaborative editor; migrating from JSON Patch to CRDT is straightforward because every patch can be replayed to build a CRDT snapshot.

In short: JSON Patch is expressive enough, verbosity is solvable via automatic diffing, and the ecosystem around RFC-6902 gives you more leverage than bespoke or DOM-specific libraries for your current and foreseeable use-cases.

```typescript
type ExtendedOp = StandardJsonPatchOp | { op:'regex-replace', path: string, pattern: string, replacement: string }
```

```typescript
   function dehyphenate(nodePath: string, original: string, fixed: string): Operation[] {
     return [
       { op:'test', path: nodePath, value: original },
       { op:'replace', path: nodePath, value: fixed }
     ]
   }
```

---

**User**

Let me give you an example for the upload I've been worrying about. Let's say the user uploads a 100-page PDF.

For speed, we'll split it into 100 separate pages, turn each of those into images, and in parallel make 100 LLM calls to transcribe them.

Let's focus just on the case of paragraphs spanning page boundaries. We'll want the post-processing LLM to do something like take the last paragraph of page X, and the first paragraph of page X+1, and merge them, also editing the last and first characters if a word has been hyphenated to merge it back together. Obviously this is *possible* by replacing one of them, and deleting the other element, but that will require the LLM to output the entire new combined element, if I'm understanding correctly. That will be very slow for 100 pages. (And this is just one example of a kind of change we might want to make).

---

**Cursor**

The bottleneck is not the **patch format** (JSON-Patch vs. home-grown) but **how much text you ask the LLM to emit**.  
Below are three strategies—​all compatible with a standards-based JSON-Patch back-end—​that keep the LLM payload tiny even when you’re merging paragraphs across 100 pages.

--------------------------------------------------------------------
1. Deterministic pre-pass  (“LLM-assist, don’t LLM-do-it-all”)
--------------------------------------------------------------------
• Hyphen recovery and page-boundary joins are regular enough to solve with regex + dictionary heuristics.  
  Example: detect “­-\n[A-Z]” at the bottom of a page; strip the soft-hyphen and newline; concatenate nodes.  
• You run this in the worker that stitches the 100 HTML snippets into one AST; the LLM is only invoked later for *semantic* fixes (grammar, style).  
• Generated JSON-Patch is still small (one `replace` per affected text node, one `remove` for the empty stub node).

Result – zero extra LLM tokens, full control, instant speed.

--------------------------------------------------------------------
2. “Instruction → macro → Patch”  pattern
--------------------------------------------------------------------
Ask the LLM to output **symbolic commands**, not literal HTML:

```json
[
  { "op": "merge-paragraphs", "from": "p#pg42-last", "into": "p#pg43-first", "dehyphenate": true }
]
```

At ingest time you expand the macro into vanilla RFC-6902:

```js
[
  { "op": "test", "path": "/byId/pg42-last/text", "value": "agili-" },
  { "op": "remove", "path": "/byId/pg42-last" },
  { "op": "replace",
    "path": "/byId/pg43-first/text",
    "value": "agility" + originalTextOfPg43First.slice(0) }
]
```

• LLM token usage: ~10–15 tokens per merge.  
• Still persists as pure JSON-Patch after expansion (so downstream tools remain standard).

--------------------------------------------------------------------
3. Ask for “desired state”, but **only for the small slice** you’re changing
--------------------------------------------------------------------
Instead of sending the whole 100-page document, stream just the two candidate paragraphs (plus a sentence of context) into the prompt and let the model return the *corrected merged paragraph*.

Patch size is then the length of one paragraph—usually < 500 chars.  
Because you chunk work by page pair you can call the LLM 99 times **in parallel**; total wall-clock is driven by single-request latency, not output size.

--------------------------------------------------------------------
Is JSON-Patch still adequate?
--------------------------------------------------------------------
Yes.  Any of the above ultimately expands to a handful of RFC-6902 ops (`remove`, `replace`, `move`, possibly `copy`).  
If you discover an exotic action that *truly* can’t be expressed concisely, add it to the macro layer (Strategy 2) and auto-translate—​you still keep one canonical persisted format.

--------------------------------------------------------------------
What about Cheerio / JSDOM / ProseMirror?
--------------------------------------------------------------------
• **Cheerio / JSDOM** give you a convenient DOM API for *building* the patch programmatically, but they don’t define a portable delta format; you’d still export JSON-Patch.  
• **ProseMirror Steps / Slate Ops** are powerful for live, collaborative editing in the browser, but heavy to run in a stateless worker and over-kill if your UI isn’t a full editor.  
• So: keep them for future UI work; for your server pipeline, simpler AST + JSON-Patch remains lighter and easier to shard across 100 workers.

--------------------------------------------------------------------
Recommended pipeline for the 100-page PDF case
--------------------------------------------------------------------
1. 100 parallel OCR-→-HTML calls (you already have this).  
2. Assemble pages; run deterministic “de-hyphen + join” script.  
   • For ambiguous joins, enqueue an LLM *instruction* request (Strategy 2).  
3. Convert deterministic/scripted changes into JSON-Patch immediately.  
4. Store patches in Supabase and apply with `fast-json-patch.applyPatch`.  
5. (Optional) later editor can load the same JSON-Patch history or transform it into ProseMirror steps if you adopt a rich editor.

This keeps LLM output small, makes patching fast, and still gives you a single, standards-compliant mutation log.

```json
[
  { "op": "merge-paragraphs", "from": "p#pg42-last", "into": "p#pg43-first", "dehyphenate": true }
]
```

```javascript
[
  { "op": "test", "path": "/byId/pg42-last/text", "value": "agili-" },
  { "op": "remove", "path": "/byId/pg42-last" },
  { "op": "replace",
    "path": "/byId/pg43-first/text",
    "value": "agility" + originalTextOfPg43First.slice(0) }
]
```

