# O3 Critique via Direct API - Automated Code Context Generation

Automated approach for critiquing planning documents using OpenAI's o3 model with comprehensive codebase context generation via code2prompt (Rust version).

## See also

- `scripts/o3-critique-as-api.ts` - Implementation of the automated critique tool
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS.md` - Original critique workflow documentation
- `scripts/codex-with-env.sh` - Alternative agentic approach (promising but not working reliably right now)
- `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` - Critique methodology used by o3
- `docs/reference/COMMAND_LINE_SCRIPTS.md` - Script development guidelines and patterns

## Overview

This approach addresses reliability issues with agentic Codex CLI workflows by using a single, comprehensive API call to OpenAI's o3 model. The script gathers relevant codebase context using code2prompt (Rust version) and sends everything to o3 for analysis.

**Key advantages over agentic approaches:**
- **Reliability**: Single API call vs complex agentic workflow
- **Control**: Precise control over what context is included
- **Speed**: No back-and-forth file reading delays
- **Cost efficiency**: One large prompt vs many small interactions
- **Reproducibility**: Same context produces consistent results

## Prerequisites

### Required Environment Variables
- `OPENAI_API_KEY` in `.env.local` - Your OpenAI API key with o3 access

### Required Dependencies
The Rust version of code2prompt is required for the script to work:
```bash
# Installation (via Homebrew - recommended)
brew install code2prompt

# Alternative installation methods:
# Via install script: curl -fsSL https://raw.githubusercontent.com/mufeedvh/code2prompt/main/install.sh | sh
# Via Cargo: cargo install code2prompt

# Verify installation
code2prompt --version  # Should show: code2prompt 3.0.2
```

**Note**: For most developers, code2prompt should already be installed following the main setup guide in `docs/reference/SETUP.md`.

### System Requirements
- Node.js with TypeScript support (tsx)
- curl (for API calls)
- Git repository context
- Rust toolchain (if installing code2prompt via Cargo)

## Basic Usage

### Simple Critique
```bash
./scripts/o3-critique-as-api.ts planning/my-feature-plan.md
```

### With Options
```bash
# Include test files in context
./scripts/o3-critique-as-api.ts --include-tests planning/my-plan.md

# Use different models (multi-provider support)
./scripts/o3-critique-as-api.ts --model openai:o3:latest planning/my-plan.md
./scripts/o3-critique-as-api.ts --model anthropic:claude-opus-4:20250514 planning/my-plan.md
./scripts/o3-critique-as-api.ts --model google:gemini-2.5-pro:latest planning/my-plan.md

# Verbose output with token counts
./scripts/o3-critique-as-api.ts --verbose planning/my-plan.md
```

## How It Works

### 1. **Context Generation Phase**
The script uses code2prompt with optimized settings:

**Included file types:**
- `*.ts, *.tsx, *.js, *.jsx` - Application code
- `*.md` - Documentation and planning files
- `*.json, *.yml, *.yaml` - Configuration files
- `*.sql` - Database schemas and migrations

**Automatically excluded:**
- **Uses .gitignore**: Respects project's .gitignore for consistent exclusions
- `*.test.*, *.spec.*, __tests__/*` - Test files (unless `--include-tests`)

**Key features enabled:**
- **Line numbers**: For precise code references in critique
- **Token counting**: Cost transparency and context management
- **Directory tree**: Project structure understanding
- **.gitignore support**: Automatic exclusion of generated/temporary files

### 2. **Unified LLM Integration**
The script uses the project's unified LLM system with:

1. **Nunjucks + Zod templates**: Type-safe prompt generation
2. **Multi-provider support**: OpenAI, Anthropic, Google via model strings
3. **Vercel AI SDK**: Consistent interface across all providers
4. **Usage tracking**: Automatic token counting and cost calculation

### 3. **Model Configuration**
- **Model strings**: `provider:model:version` format (e.g., `openai:o3-pro:latest`)
- **Automatic provider selection**: Based on model string
- **API key validation**: Handled by provider factory
- **Configurable settings**: Temperature, max tokens, etc.

## Output Files

All outputs are saved to `planning/critiques/` with timestamps:

### Context File
**Format**: `CONTEXT_FOR__[doc-name]__YYMMDD_HHMM.md`
**Contains**: Complete codebase context with file structure, implementation code, and documentation

### API Response
**Format**: `o3-api__CRITIQUE_OF__[doc-name]__YYMMDD_HHMM.json`
**Contains**: Raw OpenAI API response including critique content and usage statistics

## File Selection Strategy

### Automated Relevance Detection
The script uses a **comprehensive inclusion** approach rather than trying to guess relevance:

**Core principle**: Include all implementation and documentation files, exclude noise
- No manual file curation required
- Consistent context across different planning documents
- Reduces risk of missing important context

### When to Include Tests (`--include-tests`)
**Include test files when:**
- Planning document involves testing strategy changes
- Critique needs to understand current test patterns
- Implementation changes affect existing test architecture

**Exclude test files when (default):**
- Focus is on architecture and design decisions
- Token optimization is important
- Planning is high-level strategic discussion

## Token Management

### Cost Optimization
- **Context size**: Typically 20k-50k tokens for medium codebases
- **Response limit**: Default 4000 tokens (configurable with `--max-tokens`)
- **Model selection**: o3-2024-12-17 provides best reasoning for architecture critique

### Token Monitoring
```bash
# Check context size before sending
./scripts/o3-critique-as-api.ts --verbose planning/my-plan.md
```

The script displays token counts and estimated costs when using `--verbose` flag.

## Error Handling and Recovery

### Common Issues and Solutions

**"code2prompt not found"**
```bash
# Install the Rust version of code2prompt:
brew install code2prompt

# Alternative methods:
# curl -fsSL https://raw.githubusercontent.com/mufeedvh/code2prompt/main/install.sh | sh
# cargo install code2prompt

# Verify installation:
code2prompt --version  # Should show: code2prompt 3.0.2
```

**"API key missing for model [model]"**
```bash
# Add appropriate API key to .env.local:
echo "OPENAI_API_KEY=your-openai-key" >> .env.local
echo "ANTHROPIC_API_KEY=your-anthropic-key" >> .env.local  
echo "GOOGLE_GENERATIVE_AI_API_KEY=your-google-key" >> .env.local
```

**"Model not available"**
```bash
# Check available models in lib/config/models.ts
# Or use a known model like:
./scripts/o3-critique-as-api.ts --model anthropic:claude-sonnet-4:20250514 planning/doc.md
```

**"Planning document not found"**
```bash
# Verify file path:
ls -la planning/your-document.md
```

### Recovery Guidance
The script provides specific recovery instructions for each error type, including:
- Command-line examples for debugging
- File permission checks
- Network connectivity tests
- Documentation references

## Advanced Configuration

### Custom Model Selection
```bash
# Use different o3 variant
./scripts/o3-critique-as-api.ts --model o3-2024-12-17 planning/my-plan.md
```

### Response Length Control
```bash
# Longer responses for complex documents
./scripts/o3-critique-as-api.ts --max-tokens 6000 planning/complex-plan.md
```

### File Type Customization
For specialized critique needs, modify the `--filter` parameter in the script:
```typescript
// In generateContext() method
--filter "*.ts,*.tsx,*.js,*.jsx,*.md,*.json,*.sql,*.yml,*.yaml"
```

## Integration with Existing Workflow

### Relationship to Current Process
This approach can serve as:
- **Primary method**: Replace agentic Codex workflow for reliability
- **Backup approach**: Fallback when Codex CLI has issues
- **Complementary tool**: Use both approaches for different critique aspects

### Workflow Integration
1. **Write planning document** following `docs/instructions/WRITE_PLANNING_DOC.md`
2. **Commit planning doc** (creates pre-critique baseline)
3. **Run automated critique**: `./scripts/o3-critique-as-api.ts planning/doc.md`
4. **Process critique response** using existing methodology
5. **Update planning document** based on feedback
6. **Commit revised version** with critique summary

## Quality and Limitations

### Strengths
- **Comprehensive context**: Includes all relevant code and documentation
- **Consistent results**: Same input produces similar critique quality
- **Fast execution**: Single API call vs multiple interactions
- **Cost predictable**: Fixed token usage patterns
- **Error resilient**: Clear failure modes and recovery

### Current Limitations
- **Static file selection**: No dynamic relevance scoring
- **Large token usage**: Includes more context than strictly necessary
- **No iterative refinement**: Single-shot analysis vs conversational critique
- **Model dependency**: Requires OpenAI API access and o3 model availability

### Future Enhancements
- **Intelligent file filtering**: Use embeddings for relevance scoring
- **Template customization**: Different prompt templates for different critique focuses
- **Multi-model support**: Add Anthropic Claude integration
- **Iterative critique**: Support follow-up questions and refinement

## Status

✅ **Implemented**: Basic automated critique with code2prompt integration
✅ **Completed**: Rust version of code2prompt (v3.0.2) installed and verified
📋 **Planned**: Template customization and multi-model support
🚧 **In Progress**: Integration testing with real planning documents