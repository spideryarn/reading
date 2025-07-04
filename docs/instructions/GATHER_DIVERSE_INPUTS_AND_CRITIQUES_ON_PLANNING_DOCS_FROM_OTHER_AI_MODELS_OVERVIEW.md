# Getting Diverse AI Model Critiques on Planning Documents - Overview

Process for obtaining external critiques of planning documents using different AI models to improve decision quality and catch blind spots.

## See also

- `docs/instructions/WRITE_PLANNING_DOC.md` - Guidelines for writing planning documents (includes this critique stage)
- `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` - Methodology for systematic planning document critique
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md` - **Current recommended approach** using direct API calls
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_CODEX_CLI_APPROACH.md` - Alternative agentic approach (experimental, reliability issues)

## Intent and Purpose

External AI model critiques provide valuable perspective on planning documents by:
- **Identifying assumptions and blind spots** that human reviewers might miss
- **Suggesting alternative approaches** from different architectural perspectives  
- **Highlighting potential risks and edge cases** before implementation begins
- **Validating technical decisions** against industry best practices
- **Providing independent assessment** free from project-specific biases

This process is **mandatory** for all planning documents to ensure quality and catch issues early in the development cycle.

## Core Workflow

### 1. Prepare Planning Document
- Write initial planning document following `docs/instructions/WRITE_PLANNING_DOC.md`
- **Commit the planning doc first** (creates pre-critique baseline for comparison)

### 2. Specify Feedback Focus
Before running critique, specify what type of feedback is most valuable:
- **Technical architecture** - Focus on implementation approach and technical decisions
- **Risk identification** - Emphasize potential problems, edge cases, and failure modes  
- **Process optimization** - Review project stages, sequencing, and workflow efficiency
- **Best practices** - Validate against industry standards and proven patterns
- **Scope and prioritization** - Assess feature selection and MVP boundaries

### 3. Run External Critique
Choose one of the available approaches:

**API Approach (Recommended)**:
```bash
./scripts/o3-critique-as-api.ts docs/planning/your-planning-doc.md
```
- Single comprehensive API call
- Reliable execution
- Comprehensive codebase context
- See: `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md`

**Codex CLI Approach (Experimental)**:
```bash
./scripts/codex-with-env.sh docs/planning/your-planning-doc.md
```
- Agentic conversation-based critique
- More interactive but less reliable
- See: `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_CODEX_CLI_APPROACH.md`

### 4. Process Critique Response
- **Switch Claude to enhanced reasoning mode** for processing critique
- Claude should:
  - Read and analyze the critique thoroughly
  - Search web for additional context if needed
  - Exercise independent judgment on which suggestions are valuable
  - Propose specific changes/responses to user for discussion
  - Avoid accepting suggestions uncritically

### 5. Incorporate Feedback
- User and Claude discuss critique insights
- Update planning document based on agreed changes
- Add critique documentation section (see template below)
- **Commit revised planning document**

## Planning Document Template Addition

Add this section to planning documents after critique:

```markdown
## External Critique

**Critique Date**: [Date]
**Model**: [Model used, e.g. OpenAI o3-pro, Claude Opus]  
**Approach**: [API/Codex CLI]
**Raw Output**: `docs/planning/critiques/[model]__CRITIQUE_OF__[doc-name]__[timestamp].[json|jsonl]`
**Feedback Focus**: [What type of feedback was requested]
**Key Insights**: [Summary of useful feedback points]
**Changes Made**: [What was incorporated and rationale]
**Rejected Suggestions**: [What was not incorporated and why]
```

## Approach Comparison

### API Approach
**Strengths:**
- Highly reliable single API call
- Comprehensive codebase context
- Predictable cost and timing
- Clear error handling

**When to use:**
- Standard planning document critique
- Need reliable, consistent results
- Want comprehensive context inclusion

### Codex CLI Approach  
**Strengths:**
- Interactive, conversational critique
- Can ask follow-up questions
- More natural dialogue flow

**Current limitations:**
- Reliability issues with timeouts
- Complex error recovery
- Function call inconsistencies

**When to consider:**
- Experimental scenarios
- Need interactive refinement
- API approach insufficient

## Quality Criteria for Major Planning Documents

While critique is mandatory for all docs, the following characteristics indicate particularly important docs requiring extra attention:
- **Core architecture changes** - Affects fundamental system structure
- **High implementation cost/risk** - Significant time investment or technical complexity
- **Novel approaches** - Using unfamiliar techniques or experimental patterns
- **User-facing changes** - Impacts user experience or interface design
- **Cross-cutting concerns** - Affects multiple system components

## Configuration Requirements

Both approaches require:
- Appropriate API keys in `.env.local` (OpenAI, Anthropic, etc.)
- Access to project context via `CLAUDE.md`
- Following critique methodology in `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md`

This process complements human review and provides systematic external validation for critical planning decisions, ensuring higher quality outcomes through diverse AI perspectives.