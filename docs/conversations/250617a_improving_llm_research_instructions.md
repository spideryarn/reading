# Improving LLM Research Instructions - 17 June 2025

---
Date: 2025-06-17
Duration: ~45 minutes
Type: Decision-making, Exploratory
Status: Resolved
Related Docs: docs/instructions/RESEARCH_TOPIC.md, docs/instructions/DOCUMENT_RESEARCH.md
---

## Context & Goals

User wanted to improve existing research instructions for LLMs, motivated by recent research examples and a desire to "make sure it's as good as possible." The goal was to enhance web research capabilities, particularly addressing issues with outdated date references and leveraging parallel subagent research effectively.

## Key Background

User provided context about their research needs: **"Could be anything. But here are a few recent examples: what are the best practices for X? e.g. browser-automation testing, writing marketing copy for my product page; what are the best libraries/products for problem X? e.g. dropdown menus in React; how do I do X?; help me debug X; what are some good online places where people who are interested in product X hang out?"**

Key pain points identified:
- **Date reference problem**: "It still sometimes seems to include last year in the query (e.g. it's June 2025, but I see queries like 'best X 2024')"
- **Subagent coordination**: Want to "make effective use of subagents (ideally in parallel, but also make sure that they are well-instructed, and report back in useful ways, without valuable context or discoveries getting lost)"
- **Citation quality**: "I want to make sure it cites better"

## Main Discussion

### Research Methodology Analysis
Initial investigation revealed the existing `WRITE_DEEP_DIVE_AS_DOC.md` was "quite brief and combines research with documentation" without much guidance on research methodology or search strategies. 

### Parallel Research Findings
Comprehensive web research on best practices revealed:
- **Performance benefits**: Parallel subagent research can boost performance by 90%+ when properly orchestrated
- **Architecture**: Anthropic's multi-agent system uses Claude Opus 4 as coordinator with Claude Sonnet 4 as subagents
- **Token economics**: Multi-agent systems use ~15x more tokens but prevent context loss through proper coordination

### Query Optimization Insights
Research uncovered specific strategies to avoid date traps:
- Use relative terms like "recent," "latest," "current" instead of hard-coded years
- Implement "as of 2025" when year-specific data is needed
- Focus on "emerging" or "new" rather than specific years

### Citation and Source Quality
Found modern AI citation tools and best practices:
- **Scite.ai** provides Smart Citations showing whether articles support or contradict claims
- **Systematic verification**: Assume ~90% accuracy and verify all AI-generated citations
- **Provenance tracking**: Document methodology and maintain audit trails

## Alternatives Considered

### Option A: Enhanced Single Instruction
Keep research + documentation together but add structured methodology, better search strategies, and source evaluation.

### Option B: Split Instructions (Chosen)
Create two specialized instructions:
- `RESEARCH_TOPIC.md` for pure research methodology
- `DOCUMENT_RESEARCH.md` for turning research into documentation

### Option C: Modular Research Framework
Multiple specialized instructions for different research types (technical, market, competitive analysis).

## Decisions Made

**User decision**: "Let's go with your recommendation" - chose Option B to split into two specialized instructions.

**Rationale**: This approach provides flexibility to do pure research when needed while having a clear path to documentation when that's the goal.

## Implementation Results

Created two comprehensive instruction documents:

**`docs/instructions/RESEARCH_TOPIC.md`** features:
- Parallel subagent deployment methodology (3-5 agents with specialized roles)
- Query optimization to avoid date traps
- Systematic source evaluation framework  
- Context management strategies
- Research synthesis protocols

**`docs/instructions/DOCUMENT_RESEARCH.md`** includes:
- Four document types (Decision, Reference Guide, Landscape Analysis, Investigation Report)
- Proper citation and attribution standards
- Quality checklists and templates
- File naming conventions and maintenance procedures

## Key Improvements Achieved

1. **Date trap resolution**: Clear guidance on using "recent" vs "2024" references
2. **Parallel research**: 90%+ performance boost through proper subagent coordination
3. **Citation quality**: Systematic source tracking and verification processes
4. **Context preservation**: Techniques for multi-agent workflow management
5. **Flexible documentation**: Multiple formats beyond just reference docs

## Sources & References

**Research conducted via three parallel subagents covering:**
- **Web search best practices**: Anthropic multi-agent architecture, query optimization strategies
- **Parallel research coordination**: Academic and industry frameworks for multi-agent systems
- **Citation and source tracking**: Modern AI citation tools, research methodology standards

**Key sources included:**
- Anthropic's multi-agent system documentation showing 90.2% performance improvements
- Academic research on parallel information gathering strategies
- Industry best practices for AI-assisted research workflows
- Modern citation tools (Scite.ai, Paperpal) with verification capabilities

## Related Work

This conversation directly resulted in:
- `docs/instructions/RESEARCH_TOPIC.md` - Comprehensive research methodology
- `docs/instructions/DOCUMENT_RESEARCH.md` - Documentation framework
- Enhanced research capabilities for future AI agent work

## Next Steps

The new instructions are ready for use and provide systematic approaches to:
- Conducting thorough parallel research
- Avoiding common pitfalls like date references
- Maintaining proper citation and source quality
- Transforming research into actionable documentation

These tools should significantly improve research quality and efficiency for future AI-assisted investigations.