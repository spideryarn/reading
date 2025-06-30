---
Date: 17 June 2025
Duration: ~45 minutes
Type: Research Review
Status: Resolved
Related Docs: None
---

# Codebase Find-Replace Tool Research - 17 June 2025

## Context & Goals

This conversation emerged from a practical need in the Spideryarn Reading project: "We often have to find-replace strings across the codebase." The user wanted to identify CLI tools for codebase refactoring that would be suitable for LLM automation, particularly for simple string replacements like path changes.

## Key Background

The user outlined specific requirements for the tool:

- **Usage context**: "It'll be LLMs actually calling the find-replace"
- **Project scope**: Small projects under 100k lines of code
- **Primary use case**: Simple string replacements, especially paths like `"/path/to/blah.xyz" -> "/path/changed/blah.abc"`
- **File types**: "Mostly text files, especially Markdown"
- **Safety priority**: "Safety is most important"
- **Simplicity requirement**: "I want something simple and battle-tested that doesn't have arcane, error-prone syntax"
- **Automation needs**: Non-interactive with dry-run mode that shows changes before applying
- **Installation preference**: "Easy to install with dry-run mode"

## Main Discussion

### Research Methodology

Used parallel web searches to research popular CLI find-replace tools, focusing on:
- Popularity and maintenance status
- Documentation quality
- LLM-friendliness (simple syntax, predictable behavior)
- Safety features (dry-run capabilities)
- Battle-tested status

### Tools Investigated

**ripgrep (rg)**
- Fast and popular but read-only (search without replace)
- Excellent for finding patterns but requires additional tools for replacement
- Ruled out for being incomplete solution

**fastmod (Facebook/Meta)**
- Rust-based tool specifically designed for safe codebase modifications
- Key strengths: Handles special characters gracefully without escaping
- Perfect dry-run workflow: `--accept-all=false` for preview, `--accept-all=true` to apply
- Battle-tested at Meta scale
- Clear unified diff output
- Simple, consistent syntax ideal for LLM usage

**comby**
- Structural code search and replace tool
- Complex syntax with custom pattern language
- Powerful but "arcane" - violates simplicity requirement
- Overkill for simple string replacements

**sed (traditional Unix)**
- Universal availability but challenging escaping requirements
- Special characters in paths would require complex escaping
- Error-prone syntax incompatible with safety requirements

**codemod (Facebook)**
- Archived tool, no longer maintained
- Originally powerful but deprecated in favor of other solutions

## Decision Made

**Fastmod emerged as the clear winner** based on the user's criteria:

> "Perfect dry-run workflow: --accept-all=false for preview, --accept-all=true to apply"
> "LLM-friendly with simple, consistent syntax"
> "Battle-tested (used at Meta scale)"

### Key Decision Factors

1. **Safety**: Excellent dry-run mode with clear diff preview
2. **LLM-friendly**: No escaping needed for paths and special characters
3. **Battle-tested**: Used at Meta scale for large codebases
4. **Simple syntax**: Consistent, predictable command structure
5. **Clear output**: Unified diffs make changes transparent

### Typical Usage Pattern

```bash
# Preview changes (safe)
fastmod --accept-all=false "old/path/file.txt" "new/path/file.txt" .

# Apply changes after review
fastmod --accept-all=true "old/path/file.txt" "new/path/file.txt" .
```

## Implementation Considerations

- Install via Rust cargo or platform package managers
- No special escaping needed for paths containing special characters
- Non-interactive mode perfect for LLM automation
- Clear error messages and exit codes for programmatic use

## Sources & References

**Research conducted via web search covering:**
- **GitHub repositories** - Tool popularity, maintenance status, documentation quality
- **Official documentation** - Usage patterns, safety features, installation methods
- **Community discussions** - Real-world usage experiences, LLM integration patterns
- **Technical blogs** - Comparisons and recommendations for codebase refactoring tools

**Key finding**: Fastmod stands out as the only tool specifically designed for the intersection of safety, simplicity, and large-scale codebase modifications.

## Related Work

This research directly informs future LLM-driven refactoring capabilities in the Spideryarn Reading project, particularly for path updates and simple string replacements across the documentation and codebase structure.