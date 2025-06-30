---
Date: 2025-06-27
Duration: ~30 minutes
Type: Problem-solving
Status: Resolved
Related Docs: docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md, planning/250627b_fix_ai_headings_insertion_order.md
---

# AI Headings Insertion Order Fix - 27 June 2025

## Context & Goals

User reported that AI-generated headings were sometimes appearing in wrong/reverse order, specifically **"if it was adding an H2 and an H3 immediately after that (i.e. that belongs to the new H2), it would sometimes erroneously add the H3 *first*"**.

The investigation aimed to understand whether mutations are applied in batch vs serially, identify the root cause of the ordering issue, and determine the best solution approach.

## Key Background

**User Question**: **"I think I heard that it's doing things as a batch rather than serially. Is that the case?"**

**User Context**: 
- AI headings mutation was adding hierarchical headings (H2 followed by H3) in reverse order
- H3 that should belong to H2 was appearing before the H2 in the document
- User wanted to understand if this was a batching vs serial processing issue

## Problem Analysis

### Root Cause Identified

**Mutations are applied serially, not in batch**, which is causing the reverse order issue.

**Technical Analysis**:
- Multiple headings inserting after the same element (`afterId`) create conflicts
- In `lib/services/mutation-engine.ts:292-330`, the `applyInsert` method uses:
  ```typescript
  const afterIndex = document.findIndex(el => el.id === transform.afterId)
  result.splice(afterIndex + 1, 0, newElement)
  ```
- When multiple elements insert after the same `afterId`, each subsequent insertion pushes previous insertions further away

**Example Sequence**:
1. **Transform 1**: Insert H2 after paragraph X → `[paragraph X, H2, ...]`
2. **Transform 2**: Insert H3 after paragraph X → `[paragraph X, H3, H2, ...]`

The second transform finds paragraph X at original position and inserts H3 right after it, pushing H2 further down.

### LLM Output Analysis

The LLM template (`lib/prompts/templates/headings.njk`) already returns headings **"in the order that elements appear in the text"** (line 25), so the logical order is correct from the AI perspective. The issue is purely mechanical in the insertion process.

## Solutions Explored

### Option 1: Chain Insertions Properly (Recommended)
Transform LLM output to chain insertions instead of targeting same element:
```typescript
// Current (problematic):
[{ afterId: "para-123" }, { afterId: "para-123" }]

// Better (chained):
[{ afterId: "para-123" }, { afterId: "generated-h2-id" }]
```

**Advantages**:
- ✅ Minimal change to existing system
- ✅ Preserves LLM's intended order
- ✅ Uses existing mutation machinery
- ✅ Simple reversibility (one-to-one forward/reverse mapping)
- ✅ Easy composition with other mutations
- ✅ Granular control (can target individual headings)

### Option 2: Reverse Transform Order
Apply transforms in reverse order so last heading gets inserted first.

**Disadvantages**:
- ❌ Cognitive mismatch (transforms in reverse visual order)
- ❌ Forward/reverse asymmetry
- ❌ Workaround rather than fundamental fix

### Option 3: Batch Insertion Transform
Add new semantic transform type for multiple related insertions:
```typescript
{
  action: 'insert-sequence',
  afterId: 'para-123', 
  elements: [h2, h3, h4]
}
```

**Disadvantages**:
- ❌ Complex composition with other mutations
- ❌ Custom reversal logic required
- ❌ New transform type adds system complexity

### Other Options Considered
- Position-based insertion
- Offset-aware insertion 
- Tree-based mutations

## Composition and Reversibility Analysis

**User Question**: **"Which of Option 1 vs 3 will be easier to compose with other mutations, and to reverse?"**

**Analysis Results**:
- **Option 1 (Chaining)**: Superior for both composition and reversibility
- **Option 3 (Batch)**: More complex, requires custom logic for both areas

**Key Insight**: Option 1 "compiles" semantic intent into primitives the existing system handles well.

## Decisions Made

**Decision**: **Implement Option 1 (Chain Insertions)** as the solution.

**Rationale**:
- Leverages existing mutation machinery without new complexity
- Composes naturally with other mutations
- Simple reversibility using existing patterns
- Granular control for future enhancements
- Clean separation: LLM provides semantic intent, mutation generator handles mechanics

**Implementation Approach**: 
**"Are you thinking that we would take the output from the LLM... and apply some kind of deterministic/programmatic transformation to it?"** - Yes, exactly. Transform the LLM output programmatically in `generateHeadingMutation()` after receiving the LLM response.

## Implementation Plan

Transform logic in `lib/services/heading-mutation-generator.ts`:
1. Group headings by `id_of_after`
2. For each group, chain them: first keeps original `id_of_after`, subsequent ones reference previous generated ID
3. Preserves LLM's intended order through chaining

## Sources & References

**Internal References**:
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Core mutations system documentation
- `docs/reference/TOOL_HEADINGS.md` - AI headings feature documentation  
- `lib/services/mutation-engine.ts:292-330` - `applyInsert` method causing the issue
- `lib/services/heading-mutation-generator.ts:27` - Transform generation location
- `lib/prompts/templates/headings.njk` - LLM template showing intended ordering
- `app/api/headings/route.ts` - API endpoint for headings generation

**Key Code Locations**:
- Insertion logic: `lib/services/mutation-engine.ts:296` (`afterIndex` finding)
- Transform generation: `lib/services/heading-mutation-generator.ts:28` (headings mapping)
- Template ordering: `lib/prompts/templates/headings.njk:25` (order specification)

## Related Work

This conversation will result in:
- Planning document: `planning/250627b_fix_ai_headings_insertion_order.md`
- Implementation changes to `lib/services/heading-mutation-generator.ts`
- Potential test updates to validate correct insertion ordering

The solution maintains backward compatibility while fixing the core ordering issue through improved transform generation.