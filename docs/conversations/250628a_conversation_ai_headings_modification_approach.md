---
Date: 2025-06-28
Duration: Medium (15-20 minutes)
Type: Decision-making
Status: Resolved
Related Docs: docs/reference/TOOL_STRUCTURE_HEADINGS.md, docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md
---

# AI Headings Modification Approach - 2025-06-28

## Context & Goals

User inquiry about whether the AI-generated headings prompt has access to original author-generated headings, leading to a broader discussion about modifying the current approach to balance AI creativity with respect for authorial intent.

## Key Background

Current system: "The AI headings prompt does NOT have access to original author-generated headings." The system deliberately removes all existing headings before sending content to the AI via `removeExistingHeadings()` function, ensuring "completely fresh heading generation based purely on semantic content analysis."

User context: **"Primarily non-fiction, primarily academic/research papers."**

User's design intent: "On the one hand, we want the AI to have liberty to modify the original headings if it thinks they're unsuitable. On the other, we'd prefer if possible for the AI-generated headings to at least be guided/inspired by the original human author's intent."

## Main Discussion

### Current System Analysis
The existing approach is "beautifully simple" but completely discards original heading structure. For academic/research papers, this means losing potentially valuable organizational frameworks that follow established conventions.

### Design Challenge
Core tension identified: **AI creativity vs human authorial intent**. Need to balance giving AI freedom to improve headings while respecting the author's organizational thinking.

### Options Considered

**Option 1 - Hybrid Input Approach**: Give AI both original headings AND content with nuanced instructions
- Pros: Simple, preserves author structure when good
- Cons: AI might be overly conservative, harder to get truly fresh perspectives

**Option 2 - Two-Pass Assessment System**: AI evaluates original headings first, then generates with that context
- Pros: More thoughtful, can adapt approach based on original quality  
- Cons: More complex, higher API costs

**Option 3 - Configurable Modes**: Let users choose between "Fresh generation", "Improve existing", "Preserve structure"
- Pros: User control, covers different use cases
- Cons: More UI complexity, decision burden on users

**Option 4 - Smart Extraction + Context**: Extract headings as "organizational context" rather than constraints

## Decisions Made

**Selected Approach: Option 1 - Hybrid Input Approach**

User decision: **"Let's go with Option 1. We'll just feed in the full document HTML (including the original headings in situ), and then the LLM's output will use our mutations system to update/delete/add as it sees fit."**

### Implementation Strategy
- Feed full document HTML with original headings preserved
- Let AI decide what to update/delete/add through the mutations system
- Leverage existing reversible transforms architecture

## Implementation Considerations

### Technical Integration
- Use existing mutations system (see `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md`)
- Modify current heading removal process to preserve original structure
- Update prompt template to handle hybrid input appropriately

### Academic Paper Context
For academic/research papers specifically:
- Original headings often follow established conventions
- Organizational structure may reflect methodological approaches
- AI can improve clarity while respecting academic structure

## Next Steps

1. Modify the headings generation system to preserve original headings in input
2. Update prompt template to handle hybrid approach
3. Integrate with mutations system for reversible transforms
4. Test with academic papers to validate approach

## Sources & References

- `docs/reference/TOOL_STRUCTURE_HEADINGS.md` - Current headings tool documentation
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Reversible transforms system
- `lib/prompts/templates/headings.njk` - Current prompt template
- `app/api/tools/[toolId]/handlers/structure.ts` - Current implementation with `removeExistingHeadings()`

## Related Work

This conversation will lead to implementation work on:
- Modifying the headings generation pipeline
- Updating prompt templates for hybrid input
- Integration with mutations system for reversible document transforms