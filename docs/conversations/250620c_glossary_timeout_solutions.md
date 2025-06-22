# Glossary Timeout Solutions - 2025-06-20

---
Date: 2025-06-20
Duration: ~45 minutes
Type: Problem-solving
Status: Active
Related Docs:
  - planning/250620a_glossary_generate_more_timeout_mitigation.md
  - docs/reference/TOOL_GLOSSARY.md
  - lib/prompts/templates/glossary.njk
---

## Context & Goals

Production users experiencing 504 timeout errors when generating glossaries for complex documents with extensive terminology. The issue particularly affects papers with high terminological density, where the glossary feature may need to generate dozens or hundreds of entities requiring thousands of LLM tokens.

## Problem Definition

The user reported: **"We're getting a 504 timeout error on production sometimes when we try and create the glossary. Probably because for big documents with lots of complex terminology, this could involve generating dozens or even hundreds of entities, with thousands of tokens."**

### Root Cause Analysis

Current glossary implementation processes entire document in single LLM call:
- **Single API call bottleneck**: One call handles entity extraction for entire document
- **Token scale issues**: Complex documents require massive context windows plus detailed entity generation
- **No chunking strategy**: Full document content sent as single prompt input
- **Production timeout limits**: 30-second Vercel timeout vs potentially longer processing times

Technical factors contributing to timeouts:
- **LLM processing time**: Scales non-linearly with entity count and document complexity
- **Token generation**: Each entity requires brief_explanation + long_explanation fields
- **Context overhead**: Full document text must be included for contextual accuracy
- **No incremental loading**: All-or-nothing approach provides no partial results

## User Requirements & Constraints

### Key Preferences
The user expressed clear preferences about solution approaches:

**Quality over speed**: *"I think I'd probably rather stick with Claude Sonnet because it does a good job."*

**Contextual accuracy**: *"I'm hesitant about option 6 because I worry that there might be important context in other parts of the document that should inform the glossary explanations."*

**Avoid caching compromises**: *"I'm hesitant about option 8 because I want the glossary explanations to be really contextually relevant."*

**Simplicity and extensibility**: *"I think on reflection, the 'generate more' approach is probably the one to go for, Because it's relatively simple and there's lots of ways in which we could extend/reuse it."*

### Constraints
- **Document type**: Medium-sized scientific papers (~20 pages) with high terminological complexity
- **Quality requirements**: Contextually relevant explanations informed by full document context
- **User experience**: Progressive disclosure preferred over all-or-nothing loading

## Solutions Explored

### User-Proposed Options

**Option 1: Entity Cap with "Generate More" Button**
- Cap initial generation to manageable number (e.g., 20-50 entities)
- Provide button for users to request additional entities
- Progressive loading reduces initial timeout risk

**Option 2: Search/Add Functionality**
- Add search interface for users to request specific missing entities
- Explicit user control over glossary expansion
- Reduces computational overhead by focusing on user priorities

**Option 3: Two-Stage Processing**
- Stage 1: Generate entity list only
- Stage 2: Lazy-load explanations on hover/click
- Concern: Cost-inefficient due to multiple small LLM calls with large document context

**Option 4: Parallel Chunked Explanations**
- Generate entity list first
- Process explanations in parallel chunks of 10 entities
- Balance between efficiency and progressive loading

**Option 5: Simplified Entity Format**
- Remove long_explanation field, keep only brief_explanation
- Alternative: Add "Find out more" button for detailed explanations
- Could integrate with chat interface for specific term exploration

### Additional Technical Options

**Option 6: Chunked Processing** (User hesitant due to context concerns)
- Process document in overlapping sections
- Risk: Missing cross-document context for entity explanations

**Option 7: Model Tier Strategy**
- Use faster models (Gemini 2.5 Flash) for initial extraction
- Reserve Claude Sonnet for detailed explanations or user-requested entities
- Balance cost, speed, and quality

**Option 8: Smart Caching + Incremental Updates** (User hesitant due to relevance concerns)
- Cache entity explanations with document-specific context
- Risk: Explanations may not reflect current document's specific usage

**Option 9: Streaming Response**
- Stream entity results as they're generated
- Provide immediate feedback and partial results
- Technical complexity with current API structure

## Recommended Approach

Based on user preferences for simplicity, quality, and extensibility, the recommended phased approach:

### Phase 1: Entity Cap with Load More
- **Cap entities**: Limit initial generation to 50 entities maximum
- **"Load more" button**: Allow users to request additional entities in batches
- **Model switching**: Consider Gemini 2.5 Flash for speed while maintaining Claude Sonnet option
- **Timeout monitoring**: Add logging to identify actual timeout patterns

### Phase 2: Enhanced Progressive Loading
- **Relevance scoring**: Add scoring system for entity importance/centrality
- **Smart sorting**: Prioritize most relevant entities in initial batch
- **Search integration**: Allow users to request specific entities via search

### Phase 3: Advanced Features
- **Streaming implementation**: Real-time entity generation feedback
- **User preferences**: Configurable entity limits and types
- **Performance optimization**: Based on production usage patterns

## Implementation Considerations

### Technical Approach
The user suggested modifying the Nunjucks template to implement entity capping:
- Update `lib/prompts/templates/glossary.njk` to include entity limit parameter
- Modify `/api/glossary/route.ts` to handle batch processing logic
- Add UI components for "Load more" functionality in glossary pane

### Monitoring Requirements
- Track timeout frequency and document characteristics
- Monitor LLM token usage patterns for cost optimization
- Measure user engagement with "Load more" functionality

### UX Considerations
- Clear messaging about entity limits and additional availability
- Progressive loading indicators for user feedback
- Preservation of search and navigation functionality during partial loads

## Next Steps

1. **Implement entity capping**: Modify glossary template and API to support configurable entity limits
2. **Add "Load more" UI**: Create progressive loading interface in glossary pane
3. **Deploy monitoring**: Track timeout patterns and user behavior
4. **Iterate based on usage**: Adjust entity limits and batching strategy based on production data

## Sources & References

- **Current implementation**: `docs/reference/TOOL_GLOSSARY.md`
- **Prompt template**: `lib/prompts/templates/glossary.njk`  
- **API endpoint**: `/api/glossary/route.ts`
- **LLM configuration**: `docs/reference/LLM_MODEL_CONFIGURATION.md`

## Related Work

This conversation will inform:
- Implementation of glossary timeout mitigation
- Progressive loading patterns for other AI features
- LLM cost optimization strategies across the application