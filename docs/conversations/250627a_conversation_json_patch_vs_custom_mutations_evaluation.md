---
Date: 2025-06-27
Duration: ~45 minutes
Type: Decision-making
Status: Resolved
Related Docs: docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md
---

# JSON Patch vs Custom Mutations System Evaluation - 27 June 2025

## Context & Goals

Prompted by a review of the current mutations system documentation and related conversations, this discussion evaluated whether to adopt JSON Patch (RFC 6902) as a standard for document transformations or continue with the custom mutation framework. The user expressed interest in JSON Patch **"because it's a standard"** but wanted to understand its real-world applicability to HTML/DOM editing and explore alternative standardized approaches.

## Key Background

**Current System**: Custom mutation framework with ID-based addressing supporting four operations (insert, replace, remove, modify) with full reversibility, AI integration, and React state management.

**User Context**: 
- "We don't care at all about backwards compatibility. We have zero users so far."
- Concerned about verbosity for complex operations: "Let's say I'm importing a 100-page PDF" with cross-page paragraph merging and de-hyphenation
- Values standardization but needs practical efficiency

**Technical Requirements**:
- PDF post-processing with complex multi-element operations
- AI-generated content with collision-free ID management
- Real-time UI updates with React integration
- Full reversibility for all transformations

## Main Discussion

### JSON Patch Applicability Research

**Research Finding**: JSON Patch is **NOT commonly used for HTML/DOM editing**. Primary use cases are:
- API partial updates (main use case)
- Real-time collaborative editing with Operational Transform
- Form state management
- JSON-based content management

**Key Limitation**: JSON Patch operates on JSON documents, not HTML structures directly. Path-based addressing (`/elements/3/content`) is fragile compared to ID-based addressing (`/byId/syr-e5f6g7h8`).

**Notable Exception**: Threads Styling used JSON Patch + OT for collaborative document editing, but treated documents as JSON streams rather than HTML.

### Alternative Standards Investigation

**Rich Text Editor Standards** (Most Relevant):
- **ProseMirror transforms/steps**: Industry standard, schema-based, sophisticated reversible operations
- **Quill Delta operations**: Used by Slack, LinkedIn, Figma; JSON-based with Insert/Delete/Retain operations
- **Slate operations**: React-focused, plugin-driven approach

**CRDT Libraries** (Future-Focused):
- **Yjs**: Most popular, used by JupyterLab, network-agnostic
- **Automerge**: JSON-focused, Rust-based with WebAssembly bindings

**DOM-Specific Libraries**:
- **diffDOM**: Purpose-built for DOM element diffing
- **React Virtual DOM**: Reconciliation algorithm for efficient updates

### Current System Advantages Analysis

The research revealed that the **current system is more sophisticated than most "standards"** for document editing:

**Domain-Specific Intelligence**:
- Validates heading hierarchies (H1→H2→H3)
- Maintains parent-child relationships automatically
- Handles position/ordering updates
- Provides content dependency validation

**AI Integration Features**:
- Deterministic ID generation preventing collisions
- Regeneration handling for "regenerate headings" scenarios  
- AI metadata tracking and attribution
- Specialized mutation generation for AI content

**Performance Optimizations**:
- Batch validation (all operations validated before any applied)
- Efficient in-place updates
- React-optimized state management
- Strategic copying to minimize object creation

### JSON Patch Migration Costs

**What Would Need to Be Built**:
1. Custom path resolution layer for ID-based addressing
2. Domain validation engine (heading hierarchies, relationships)
3. AI integration bridge (deterministic IDs, metadata)
4. React state management recreation
5. Reverse patch generation system
6. Debugging and observability recreation

**Performance Overhead**:
- Translation between formats on every operation
- Path resolution for each ID reference
- Maintaining two systems (current + JSON Patch layer)

**Verbosity Problem**: For PDF post-processing, JSON Patch becomes unwieldy. Example de-hyphenation operation requires multiple ops vs. single semantic operation in current system.

## Trade-offs Considered

**JSON Patch Benefits**:
- Ecosystem compatibility and tooling
- Standard debugging support
- Network protocol support (`application/json-patch+json`)
- Interoperability with external systems

**JSON Patch Limitations**:
- Not designed for HTML/DOM editing (operates on JSON)
- Path-based addressing fragility
- Loss of domain-specific intelligence
- Verbose patches for complex operations
- Performance overhead from translation layers
- Significant engineering effort to recreate current functionality

**Current System Benefits**:
- Purpose-built for document editing domain
- ID-based stability and addressing
- AI integration optimizations
- React performance optimizations
- Rich debugging and metadata

**Current System Limitations**:
- Custom format requires documentation
- No ecosystem tooling support
- Potential learning curve for new developers

## Alternatives Considered

**Full Migration to JSON Patch**: Rejected due to high engineering cost and loss of domain-specific features.

**Hybrid Approach**: Translation layer between systems - adds complexity and performance overhead while maintaining two systems.

**Strategic Standards Adoption** (Recommended):
1. **Export capability**: Allow exporting mutations as JSON Patch for debugging/integration
2. **Import pathway**: Accept JSON Patches and convert to internal format
3. **Standard logging**: Use JSON Patch format for audit/debug logs
4. **Future migration options**: Design interfaces that could export to ProseMirror steps if needed

## Decisions Made

**Decision**: Continue with the current custom mutations system.

**Rationale**: 
- Current system addresses domain-specific needs that JSON Patch cannot handle efficiently
- **"The uncomfortable truth: Your current mutation system is more sophisticated than most 'standards' for document editing"**
- JSON Patch migration would require rebuilding most current functionality with questionable benefits
- PDF post-processing requirements need semantic operations that JSON Patch cannot express concisely

**Implementation Path**: Add selective standards compatibility through export/import capabilities rather than wholesale migration.

## Key Insights

**Standards Reality Check**: 
- **"Higher-level document editing operations lack comprehensive standardization"** - leads to fragmented approaches
- **"You're essentially building what should be a standard for semantic document editing"**
- **"You're ahead of the curve, not behind it"**

**Domain Specificity Value**: Purpose-built solutions often outperform generic standards for specialized use cases like AI-assisted document editing.

**Pragmatic Standardization**: Standards adoption through compatibility layers can provide benefits of both approaches.

## Open Questions

- Should we add ProseMirror export capability for future rich text editor integration?
- What's the timeline for collaborative editing features that might benefit from CRDT approaches?
- How much of our mutation logic could be generalized into a reusable library?

## Next Steps

1. **Document current system more thoroughly** - capture the sophistication that research revealed
2. **Add JSON Patch export capability** for debugging and potential integrations
3. **Consider Quill Delta compatibility** for future collaborative editing
4. **Monitor CRDT evolution** (Yjs, Automerge) for future collaborative features

## Sources & References

**Research Sources**:
- **RFC 6902 JSON Patch Specification**
- **fast-json-patch library** documentation and usage patterns  
- **ProseMirror documentation** on transforms and steps
- **Quill Delta specification** and real-world usage
- **Yjs and Automerge CRDT libraries** documentation
- **Industry usage research** for JSON Patch in HTML/DOM editing contexts

**Internal References**:
- `docs/reference/MUTATIONS_DOCUMENT_CONTENT_REVERSIBLE_TRANSFORMS.md` - Current system documentation
- `docs/conversations/250625a_conversation_o3_critiquing_mutations_json_patch.md` - Previous critique
- `docs/conversations/250625b_conversation_claude_api_document_editing_best_practices.md` - API best practices research
- `lib/services/mutation-engine.ts` - Current implementation
- `lib/types/mutation.ts` - Type definitions

## Related Work

This conversation reinforces the current architectural direction and provides research foundation for future standardization decisions. No immediate implementation changes required, but establishes framework for future compatibility additions.