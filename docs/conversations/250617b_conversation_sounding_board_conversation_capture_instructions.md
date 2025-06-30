# Sounding-Board Conversation Capture Instructions - 17 June 2025

---
Date: 2025-06-17
Duration: ~30 minutes
Type: Decision-making
Status: Resolved
Related Docs: docs/instructions/CAPTURE_SOUNDING_BOARD_CONVERSATION.md
---

## Context & Goals

Following the creation of improved research instructions, user wanted to create instructions for "capturing a long sounding-board conversation like this into a .md file." The goal was to preserve the nuance and richness of exploratory conversations while making them structured and reviewable.

User had an existing rough instruction: *"Write up this sounding-board conversation to a file, capturing the goals/background, questions/answers, user decisions, alternatives, etc. Try to cleanly capture as much of the user's wording/phrases as possible, perhaps with quotes, but tidy up the structure of it. We really want to capture the nuance and richness and detail. But strike a balance. Be concise - don't waffle or state the obvious. Structure it well."*

But wanted to **"improve on that!"**

## Key Background

User explained the motivation: **"I think this is often something I want to do when it's been a long, rich conversation that has given me a lot to think about, and I want to mull it over, and come back to it. So I want to capture the conversation, so that I can revisit it. I could just copy and paste it, but that's a bit unwieldy, and I would rather distil/restructure it, but without losing the nuance/detail."**

**Use cases**: "me, others, AIs, etc!" - documents need to serve multiple audiences.

## Main Discussion

### Requirements Clarification

Through questioning, established key requirements:

**File Organization**: 
- **Location**: "Put them in docs/conversations/ - that's as good a place as any for now"
- **Naming**: Use same `yyMMddx` convention as planning docs

**Conversation Scope**:
- **"Perhaps both"** - decision-making and exploratory conversations
- **Primary trigger**: "Long, rich conversation that has given me a lot to think about, and I want to mull it over, and come back to it"

**Preserve vs Synthesize Balance**:
User: **"I don't know how to strike this balance. I think capturing exact quotes is useful for capturing user background/intentions/requirements/decisions. But we should also aim to do some synthesis/summarising, especially when rambly/repetitive/unstructured/scattered, and especially of the output from the LLM."**

**Critical requirement**: **"It's really important to capture citations/links to original sources where applicable, so we can go back and re-read them later."**

### Structure Considerations

**Flexibility vs Templates**: User unsure about rigid structure, leading to flexible approach based on conversation flow with multiple template options.

**Integration**: **"Yes"** - should link to resulting documentation and related work.

**Multiple Audiences**: Documents should work for user review, team sharing, and future AI agents.

## Decisions Made

**Approach**: Create comprehensive instruction with flexible structure and multiple templates for different conversation types.

**Key Design Decisions**:
- **Preserve user voice** through direct quotes for decisions, requirements, constraints
- **Synthesize AI responses** focusing on key insights rather than verbose explanations  
- **Maintain source integrity** with systematic citation and link preservation
- **Support multiple document types** (decision-making, exploratory, problem-solving, research review)
- **Use consistent naming** following `yyMMddx` pattern with subagent filename generation

## Implementation Results

Created `docs/instructions/CAPTURE_SOUNDING_BOARD_CONVERSATION.md` with:

### Core Principles
- **Preserve vs Synthesize Balance**: Clear guidance on when to use direct quotes vs summary
- **Source Preservation**: Systematic approach to maintaining citations and references
- **Multiple audiences**: Written for user reflection, team sharing, AI agents

### Document Structure Options
- **Standard Structure**: Context, Discussion, Alternatives, Decisions, Sources
- **Alternative templates** for exploratory, problem-solving, and research review conversations
- **Flexible organization**: Adapt structure to conversation flow

### Writing Guidelines
- **Capturing User Voice**: Direct quotes for requirements, preferences, constraints, decisions
- **Synthesis Techniques**: Extract core points, organize thematically, preserve terminology
- **Technical Details**: Summarize findings, link to sources, preserve methodology

### Quality Framework
- **Content Quality**: Preserve nuance, maintain context, balance detail with conciseness
- **Structural Quality**: Clear headings, logical flow, complete sections
- **Future Utility**: Self-contained, actionable, connectable, searchable

### File Management
- **Naming Convention**: `yyMMddx_description_in_normal_case.md` with subagent generation
- **Location**: `docs/conversations/`
- **Metadata**: Date, duration, type, status, related docs

## Key Features Achieved

1. **Balance preservation with synthesis**: Clear guidance on what to quote vs summarize
2. **Source integrity**: Systematic citation and link preservation
3. **Multiple conversation types**: Templates for different discussion patterns
4. **Multi-audience utility**: Useful for reflection, sharing, and AI reference
5. **Integration**: Links to resulting work and related documentation
6. **Quality assurance**: Comprehensive guidelines and checklists

## Open Questions

None - user expressed satisfaction with the comprehensive approach and immediately requested application to this conversation.

## Next Steps

- Updated naming convention to match planning docs pattern
- Applied the instruction to capture both parts of this conversation
- Ready for regular use in preserving valuable conversational insights

## Sources & References

**Internal References**:
- `docs/instructions/WRITE_PLANNING_DOC.md` - for `yyMMddx` naming convention
- `docs/instructions/SOUNDING_BOARD_MODE.md` - for context on exploratory conversations

**User Requirements**: Direct quotes preserved throughout showing specific needs around balance, citation, and multiple audiences.

## Related Work

This conversation resulted in:
- `docs/instructions/CAPTURE_SOUNDING_BOARD_CONVERSATION.md` - Complete instruction for conversation documentation
- Updated naming convention alignment with existing planning doc standards
- Framework for preserving valuable conversational insights systematically

The instruction provides a systematic approach to transforming rich discussions into structured, preservable documents that maintain nuance while being accessible to multiple audiences.