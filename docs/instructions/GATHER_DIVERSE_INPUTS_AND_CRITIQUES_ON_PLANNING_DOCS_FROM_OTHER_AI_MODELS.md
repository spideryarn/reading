# Getting Diverse AI Model Critiques on Planning Documents

Process for obtaining external critiques of planning documents using different AI models to improve decision quality and catch blind spots.

## See also

- `docs/instructions/WRITE_PLANNING_DOC.md` - Guidelines for writing planning documents (includes this critique stage)
- `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` - Methodology for systematic planning document critique
- `scripts/codex-with-env.sh` - Automated script for running OpenAI o3-pro critiques
- `scripts/parse-critique-output.ts` - Parser for extracting clean critique text from raw model output

## Overview

External AI model critiques provide valuable perspective on planning documents by:
- Identifying assumptions and blind spots
- Suggesting alternative approaches  
- Highlighting potential risks and edge cases
- Validating technical decisions against best practices

This process is **mandatory** for all planning documents to ensure quality and catch issues early.

## Critique Workflow

### 1. Prepare Planning Document
- Write initial planning document following `docs/instructions/WRITE_PLANNING_DOC.md`
- **Commit the planning doc first** (creates pre-critique baseline)

### 2. Specify Feedback Focus
Before running critique, user should specify what type of feedback is most valuable:
- **Technical architecture** - Focus on implementation approach and technical decisions
- **Risk identification** - Emphasize potential problems, edge cases, and failure modes  
- **Process optimization** - Review project stages, sequencing, and workflow efficiency
- **Best practices** - Validate against industry standards and proven patterns
- **Scope and prioritization** - Assess feature selection and MVP boundaries

### 3. Run External Critique
```bash
./scripts/codex-with-env.sh planning/your-planning-doc.md
```

This generates:
- Clean critique displayed in terminal
- Raw output saved to `planning/critiques/o3-pro__CRITIQUE_OF__[doc-name]__YYMMDD_HHMM.jsonl`

### 4. Process Critique Response
- **Switch Claude to Opus mode** for enhanced reasoning when processing critique
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
**Model**: OpenAI o3-pro  
**Raw Output**: `planning/critiques/o3-pro__CRITIQUE_OF__[doc-name]__[timestamp].jsonl`
**Feedback Focus**: [What type of feedback was requested]
**Key Insights**: [Summary of useful feedback points]
**Changes Made**: [What was incorporated and rationale]
**Rejected Suggestions**: [What was not incorporated and why]
```

## Manual Parsing

If automated parsing fails:
```bash
./scripts/parse-critique-output.ts planning/critiques/o3-pro__CRITIQUE_OF__[doc-name]__[timestamp].jsonl
```

## Configuration

Requires:
- `OPENAI_API_KEY` in `.env.local` (automatically extracted by `codex-with-env.sh`)
- Access to project context via `CLAUDE.md`
- Following critique methodology in `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md`

## Quality Criteria for Major Planning Documents

While critique is mandatory for all docs, the following characteristics indicate particularly important docs requiring extra attention:
- **Core architecture changes** - Affects fundamental system structure
- **High implementation cost/risk** - Significant time investment or technical complexity
- **Novel approaches** - Using unfamiliar techniques or experimental patterns
- **User-facing changes** - Impacts user experience or interface design
- **Cross-cutting concerns** - Affects multiple system components

This process complements human review and provides systematic external validation for critical planning decisions.