# Glossary Entity Normalisation & Highlight-Priority Fix

## Goal & Context

We need to eliminate data-level collisions between glossary entity *names* and *aliases* so that:

* The longest, most specific term is always available to the client-side highlighter (solving the "nonreductive explanation" bug).
* Glossary panes never present contradictory or duplicate entries that confuse readers.
* Down-stream code (Mark.js logic, `deduplicateEntities`) can be greatly simplified or made more predictable.

Current pipeline (simplified):

```
LLM prompt → /api/tools/glossary → returns raw entities
               ↓
           client → processEntitiesForProgressive()
                           └─ deduplicateEntities()  ← drops clashes
```

### Root problems discovered

* LLM occasionally emits both a short and long form as separate entities (e.g. *nonreductive* vs *nonreductive explanation*).
* `deduplicateEntities()` discards the *later* entity when an alias collides with an existing canonical name – in practice this means the **longer** phrase is lost if its first occurrence is later in the document.

### Desired rules

1. No duplicate primary names (case-insensitive).
2. An alias must not equal any other entity's primary name.
3. If multiple entities want the same alias, the first one wins.
4. Prefer the longer/more-specific phrase as the canonical `name` where applicable.

## References

* `lib/utils/entity-position-tracking.ts` – current `deduplicateEntities` implementation.
* `app/api/tools/[toolId]/handlers/glossary` – returns raw entities.
* `lib/prompts/templates/glossary.njk` – LLM prompt.
* Conversation summary *Glossary term highlighting priority issue* – debugging trail leading to this plan.
* `docs/reference/TOOL_GLOSSARY.md` – Glossary feature overview.
* `gjdutils/docs/instructions/WRITE_PLANNING_DOC.md` – planning doc guidelines (this template).

## Principles / Key Decisions

* **Validate early, fail loud.** Normalise entity data on the server immediately after LLM output.
* **Prompt > Post-processing.** Instruct the LLM to avoid collisions, but still enforce rules in code as a safety net.
* **Keep business value front-loaded.** Ship a server-side normaliser first; UI improvements and prompt tweaks can follow.
* **Non-destructive.** Never drop the longer/more-specific entity; instead, demote the shorter term to an alias if they really represent the same concept.

## Acceptance Criteria

The work is complete when **all** of the following hold true:

1. A document containing both "nonreductive explanation" and "nonreductive" highlights the *full phrase* in the viewer and the shorter word only where it appears standalone.
2. Glossary panel lists both entries *or* lists only the longer entry with the shorter in `aliases`, never two identical primary names.
3. `/api/tools/glossary` JSON never includes:
   * duplicate `name` values (case-insensitive)
   * an `aliases[]` item that equals another entity's `name`
4. Unit test suite passes, including new tests listed below.  
5. No existing glossary-related E2E tests fail.
6. Performance: normalisation adds <2 ms for 200 entities on Node 18 release build (benchmark test provided).
7. Feature can be toggled OFF via `GLOSSARY_NORMALISER_DISABLED=true` env var for emergency rollback.

## Detailed Design Notes

### normaliseGlossaryEntities.ts
* New util in `lib/services/glossary/` (create directory if absent).  
* Pure function; no FS or DB access.  
* Export both named (`normaliseGlossaryEntities`) and default for easier mocking.
* Accepts `Entity[]`, returns `Entity[]` respecting desired rules.
* Richness score function:
  ```ts
  const score = (e: Entity) => (e.long_explanation?.length ?? 0) + (e.brief_explanation?.length ?? 0) + e.aliases.length*5
  ```
  (weights aliases higher so canonical with many synonyms wins)

### Integration point
`app/api/tools/[toolId]/handlers/glossary/handlers/execute.ts` (or nearest equiv):
1. `const raw = await callLlm(...)`  
2. `const entities = normaliseGlossaryEntities(raw)`  
3. Continue pipeline unchanged.  
4. Add `X-Duplicates-Fixed` response header (integer) for debugging.

Also patch `refresh` handler (cached fetch).

### Prompt update
Edit `lib/prompts/templates/glossary.njk` inside section "Output format and constraints" – add:
```
• Each entity's **name must be unique** (case-insensitive) across the array.
• Never include an alias that is the same as another entity's name.
• If both a shorter and a longer phrase refer to the same concept, use the **longer phrase** as the name and put shorter ones in aliases.
```
Adjust any affected Zod schema comment.

### Client-side `deduplicateEntities`
* Remove branch that discards entity when alias matches canonical.  
* Keep only *exact* canonical duplicates protection.
* Update inline docs to reference server-side normaliser.

### Tests to add
File: `lib/services/glossary/__tests__/normaliser.test.ts`
* "keeps longer canonical, demotes shorter alias"
* "removes duplicate primary names (Richness heuristic)"
* "drops alias that equals prior canonical"
* "drops alias that collides with earlier alias but keeps entity"
* Benchmark test (jest `test.concurrent`) measuring <2 ms.

Update: `lib/utils/__tests__/entity-position-tracking.test.ts` – remove expectations relying on old dedup logic and add one ensuring both entities are retained.

### E2E fixture
Add markdown fixture to `tests/e2e/fixtures/` containing the conflicting terms to verify highlight behaviour in Playwright spec `ai-glossary-longest-match.spec.ts` (reuse login helpers).

### Logging
* Use `logAIOperation('glossary-normalise', { fixedDuplicates, durationMs })` at debug level.  
* Guard with `if (process.env.NODE_ENV !== 'production')` for verbosity.

### Rollback switch
* Honour env var `GLOSSARY_NORMALISER_DISABLED`.  
* In handler: `if (!process.env.GLOSSARY_NORMALISER_DISABLED) entities = normaliseGlossaryEntities(entities)`.

## Updated Stages & Actions

### Stage: Preparatory housekeeping
- [ ] `git pull --rebase origin main` to ensure latest changes.
- [ ] Confirm no other planning doc with today's date; adjust file letter if necessary.
- [ ] Create feature branch `250629a_glossary_entity_normalisation` (ask user before merging later).

### Stage: Design & spike
- [ ] Draft TypeScript `normaliseGlossaryEntities()` utility with unit tests covering edge cases (duplicate names, alias clashes, length heuristic).
- [ ] Spike on performance with worst-case (200 entities) dataset.

### Stage: Server-side integration
- [ ] Integrate the normaliser into `/api/tools/glossary` handler just after the LLM call (both `execute` and `refresh` paths).
- [ ] Add logging (`debug` level) summarising collisions fixed.

### Stage: Prompt enhancement
- [ ] Update `glossary.njk` template: new bullet instructing model to choose unique primary names, prefer longer phrase as primary, avoid alias–name clashes.
- [ ] Update corresponding Zod schema comment so future devs know why.

### Stage: Client simplification
- [ ] Remove alias/canonical clash rule from `deduplicateEntities` (keep only exact-name dedup).
- [ ] Adjust any affected unit tests.

### Stage: Test & validation
- [ ] Extend integration test `load-more-functionality.test.ts` with scenario (short+long phrase) – expect *both* entities back.
- [ ] Manual sanity check in dev UI with a document containing "nonreductive explanation".
- [ ] Run health checks:
  - [ ] `npm run lint`
  - [ ] `npm run build`
  - [ ] `npm test` (watch for glossary tests)

### Stage: Documentation & cleanup
- [ ] Update `docs/reference/TOOL_GLOSSARY.md` – section *Entity extraction* → note uniqueness rules.
- [ ] Add a short dev note in `ARCHITECTURE_DECISIONS.md` explaining why validation sits server-side.
- [ ] Remove obsolete comments in `deduplicateEntities`.

### Stage: External critique
- [ ] Commit planning doc; run external AI critique (per guidelines) and capture feedback.
- [ ] Incorporate useful critiques, commit updated plan.

### Stage: Review & merge
- [ ] Demo to user: show correct highlighting of longest phrases.
- [ ] Seek permission to merge; then `git merge --no-ff` into `main`.
- [ ] Move this doc to `planning/finished/`.

## Risks / Mitigations

* **LLM still emits duplicates** – Server normaliser guarantees correctness.
* **Glossary UI duplication** – With prompt tweaks, duplicates should be rare; if users complain, add UI collapse of alias-only entries.
* **Unexpected downstream dependency on old dedup behaviour** – Unit tests will catch; we can feature-flag normaliser if rollback needed.

## Appendix

* Prototype normaliser pseudocode (for reference):

```ts
function normaliseGlossaryEntities(raw: Entity[]): Entity[] {
  const canonical = new Map<string, Entity>()
  const seenAlias = new Set<string>()
  const out: Entity[] = []

  for (const ent of raw) {
    const key = ent.name.trim().toLowerCase()
    if (canonical.has(key)) {
      // keep the 'richer' version
      const existing = canonical.get(key)!
      const richness = (e: Entity) => (e.long_explanation?.length ?? 0) + e.aliases.length
      if (richness(ent) > richness(existing)) {
        canonical.set(key, ent)
        out[out.indexOf(existing)] = ent
      }
      continue
    }
    // filter aliases
    const aliases = ent.aliases.filter(a => {
      const k = a.trim().toLowerCase()
      return !canonical.has(k) && !seenAlias.has(k)
    })
    aliases.forEach(a => seenAlias.add(a.trim().toLowerCase()))
    canonical.set(key, ent)
    out.push({ ...ent, aliases })
  }
  return out
}
``` 