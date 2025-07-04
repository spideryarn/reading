# Hierarchical Heading Generation Approach - 2025-06-28

---
Date: 2025-06-28
Duration: ~45 minutes
Type: Decision-making, Research Review
Status: Active
Related Docs: `docs/reference/TOOL_STRUCTURE_HEADINGS.md`, `docs/planning/finished/250620c_glossary_generate_more_timeout_mitigation.md`
---

## Context & Goals

Discussion prompted by user's interest in making AI heading generation faster and potentially adopting a progressive, hierarchical approach similar to the successful glossary "Load More" pattern. The conversation explored whether to move from the current all-at-once heading generation to a level-by-level approach (H1+H2, then H3, then H4, etc.).

## Key Background

Current heading generation system has performance bottlenecks:
- **Current approach**: "removes all existing headings and ask it to add entirely its own new ones"
- **New system**: "we feed in the existing headings provided by the original human author and give it options with its mutation operations to either edit, remove or insert headings"
- **Performance concerns**: Single large LLM call processing entire document, high token costs with Claude Sonnet 4, potential 30-60 second latency for large documents

User's strategic preferences:
> "Let's stick with Sonnet for accuracy."
> "I like the gradual, hierarchical approach, e.g. first generate H2s, then H3s, then H4s, and so on."

Key architectural question: How to know when to stop progression through heading levels, and whether this approach complicates the existing mutation-based system.

## Main Discussion

### Research Findings on Heading Generation Best Practices

Comprehensive research revealed strong evidence supporting the user's instinct for hierarchical generation:

**Academic Evidence for Level-by-Level:**
- **Bottom-up vs Top-down**: Top-down parsing is more efficient than bottom-up aggregation
- **Hierarchical superiority**: "Hierarchical models achieve significantly better scores on all metrics" compared to flat architectures
- **Structure importance**: Research emphasizes "the crucial role of structure in data semantics and saliency"
- **Incremental processing**: Studies show incremental approaches can adapt clustering structures effectively

**Critical Finding on Heading Density:**
University of Washington research by Bartell, Schultz, and Spyridakis tested heading frequency effects on comprehension:
- **Optimal**: ~200 words between headings = **best comprehension**
- **Poor**: High frequency (every ~100 words/paragraph) = **poor comprehension** (tied for worst)
- **Key insight**: "It's not enough to say: 'Write headings'. They have to be good headings, and placed thoughtfully."
- **Online vs Print**: Digital reading requires different heading strategies - high-frequency headings significantly decreased comprehension in online text

**Industry Gap:**
- Neither Google Docs nor Notion offers AI-powered heading suggestions
- Represents genuine differentiation opportunity

### Three Approach Alternatives Considered

**1. Level-by-Level Generation (User's Preference)**
> "H1 and H2 at the same time. The way I see it, there should be one and only one H1, at the very top of the document, i.e. the document title. Then thereafter, one level at a time."

Advantages:
- Research-backed: Hierarchical approaches proven superior
- Quality control: Each level refined before proceeding  
- User control: Stop when structure is sufficient
- Natural stopping criteria via LLM signals

**2. Operation-Limited Approach**
Alternative considered: "you can make 10 operations". Could insert, update, or remove ≤10 headings at a time, evolving the heading structure iteratively.

Trade-offs:
- More LLM flexibility in decision making
- Potentially more efficient
- But unpredictable levels and unclear stopping points
- Risk of inconsistent hierarchy

**3. Paragraph-Per-Heading Approach** 
> "it should just keep on adding headings until every paragraph has its own heading"

User saw potential advantages:
> "One advantage of that is then it's very easy to know when to stop. And it would serve a valuable purpose: Because then we would also be most of the way towards solving another future feature that I had in mind: you could look at the document 'zoomed out', so that you'd see each paragraph as a one-line summary."

However, research directly contradicts this approach - high-frequency headings significantly reduce comprehension.

### Addressing Mutation System Complexity

User's main concern: 
> "The main complexity for me is that we've switched away from the old approach where we strip out all of the headings and ask it to add entirely its own new ones to a newer approach where we feed in the existing headings provided by the original human author and give it options with its mutation operations to either edit, remove or insert headings. Do you think this complicates things?"

**Analysis**: The mutation approach is actually **less complex** than feared. The existing operation format already specifies levels (`tag_name: 'h3'`), enabling:

- **Level-constrained operations**: Filter operations by target level
- **Validation**: Ensure operations match intended level
- **Incremental building**: Build structure progressively

**Implementation approach**: Each level gets full document + existing headings but with level-specific instructions:
```typescript
// H2 generation:
"Generate H2 headings to create major sections. Target ~200 words between headings."

// H3 generation: 
"Given these H2 sections, add H3 sub-headings where sections are complex/long."
```

### Stopping Criteria Design

Adapting glossary's `more_entities_available` pattern:

```typescript
{
  operations: [...],
  more_headings_available: boolean,
  density_analysis: {
    current_avg_words_between_headings: 180,
    sections_needing_detail: ["methodology", "results"],
    optimal_density_reached: false
  },
  recommended_next_level: "h4" | null
}
```

**LLM stopping signals:**
- Density: "Average 200 words between headings achieved"
- Semantic: "All major concepts have appropriate headings" 
- Depth: "Further subdivision would not improve navigation"

## Decisions Made

**Primary Approach**: Level-by-level generation
> "Here's where I'm leaning: Let's do H1 and H2 at the same time... Then thereafter, one level at a time."

**Implementation Phases**:
- **Early stages**: Manual progression - user clicks to generate next level
- **Later stage**: Automatic progression with `more_headings_available` signal and cancel control

**Quality Guidelines**:
- Target ~200 words between headings (optimal density from research)
- Preserve author intent where existing structure is logical
- Provide user control over regeneration scope

**Alternative Feature Recognition**:
Paragraph-per-heading concept preserved as separate "paragraph summaries" feature:
- **Structural headings**: Proper hierarchy (~200 word density) 
- **Paragraph summaries**: One-line summaries for scanning (separate tool)

## Alternatives Considered

**Operation-limited approach**: Rejected due to unpredictable hierarchy and unclear stopping criteria, despite LLM flexibility advantages.

**All-at-once optimization**: Rejected in favor of level-by-level despite potentially faster implementation, based on research evidence for hierarchical superiority.

**Paragraph-density approach**: Transformed into separate feature concept rather than heading generation approach, due to comprehension research findings.

## Open Questions

**Implementation Details**:
- Specific prompt engineering for level-constrained generation
- Validation logic for ensuring operations match target level
- Integration with existing caching system for progressive results

**User Experience**:
- Optimal UI for manual vs automatic progression
- Clear indication of current level and available next steps
- Handling edge cases where LLM recommends stopping early

**Performance Optimization**:
- Whether level-by-level actually improves total generation time
- Caching strategies for intermediate results
- Token cost implications of multiple smaller calls vs single large call

## Next Steps

**Phase 1: Manual Level-by-Level**
- Implement H1+H2 combined generation
- Add level-constrained H3 generation with existing headings context
- Develop stopping criteria based on density analysis

**Phase 2: Auto-progression**
- Implement `more_headings_available` signal mechanism
- Add auto-trigger next level with cancel control
- User testing for optimal density and stopping criteria

**Future Consideration**:
- Separate "paragraph summaries" tool for zoomed-out document view
- Integration with document outline features

## Sources & References

**Research Sources:**
- University of Washington comprehension study (Bartell, Schultz, and Spyridakis) on heading frequency effects
- 2018 supervised learning study achieving 95.83% accuracy in heading detection
- Incremental hierarchical text clustering research
- Industry analysis of Google Docs, Notion, Microsoft Word heading capabilities

**Internal References:**
- `docs/reference/TOOL_STRUCTURE_HEADINGS.md` - Current heading system documentation
- `docs/planning/finished/250620c_glossary_generate_more_timeout_mitigation.md` - Progressive loading pattern reference
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Mutation system architecture
- `lib/prompts/templates/headings.njk` - Current heading generation template

**Tool Output:**
- Comprehensive web research on automatic heading generation best practices
- Analysis of academic papers on document structure extraction
- Industry gap analysis for AI-powered heading suggestions

## Related Work

This conversation directly informs the evolution of the heading generation system and establishes foundation for:
- Enhanced progressive heading generation implementation
- Potential paragraph summary feature development  
- User experience improvements for document structure tools