# AI Model Critiques - Codex CLI Approach

Agentic approach for critiquing planning documents using conversational AI interactions through Codex CLI workflows.

## See also

- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_OVERVIEW.md` - **Start here**: Core intent and workflow overview
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md` - Alternative API approach (more reliable)
- `scripts/codex-with-env.sh` - Implementation of the agentic critique tool
- `scripts/parse-critique-output.ts` - Parser for extracting clean critique text from raw model output
- `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md` - Critique methodology used by AI models

## Overview

This document details the **Codex CLI approach** for obtaining AI model critiques of planning documents. For context on why this critique process exists and the core workflow, see `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_OVERVIEW.md`.

The Codex CLI approach uses agentic, conversational interactions with AI models to provide critique through a series of file reads and analysis steps. This allows for more interactive dialogue but currently has reliability issues.

## Current Status

⚠️ **Experimental/Reliability Issues**: This approach is promising but not working reliably right now due to:
- **Timeout issues** during long conversations
- **Broken function calls** in agentic workflows
- **Inconsistent execution** across different planning documents

**Recommended**: Use the API approach (`docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md`) for reliable results.

## How It Works (When Working)

### Agentic Conversation Flow
1. **Initial document read**: AI agent reads the planning document
2. **Context gathering**: Agent explores relevant codebase files
3. **Interactive analysis**: Agent asks questions and builds understanding
4. **Comprehensive critique**: Agent provides detailed feedback
5. **Follow-up clarification**: Agent can respond to questions about the critique

### Advantages (Theoretical)
- **Interactive dialogue**: Can ask follow-up questions during critique
- **Dynamic context**: Agent chooses what files to examine based on document content
- **Conversational refinement**: Can iterate on critique based on clarifications
- **Natural flow**: More like consulting with a human expert

## Usage (Legacy - Not Recommended)

### Basic Command
```bash
# WARNING: This approach has reliability issues
./scripts/codex-with-env.sh planning/your-planning-doc.md
```

### Expected Output (When Working)
- Clean critique displayed in terminal
- Raw output saved to `planning/critiques/o3-pro__CRITIQUE_OF__[doc-name]__YYMMDD_HHMM.jsonl`

### Manual Parsing (If Needed)
If automated parsing fails:
```bash
./scripts/parse-critique-output.ts planning/critiques/o3-pro__CRITIQUE_OF__[doc-name]__[timestamp].jsonl
```

## Known Issues and Limitations

### Reliability Problems
- **Function call failures**: AI agents struggle with tool use in long conversations
- **Timeout issues**: Extended agentic workflows often timeout
- **Inconsistent results**: Success rate varies significantly between runs
- **Error recovery**: Difficult to debug and recover from failures

### Technical Challenges
- **State management**: Long conversations lose context
- **Tool integration**: Function calls become unreliable over time  
- **Resource usage**: Higher computational cost than single API calls
- **Debugging complexity**: Multiple interaction points make troubleshooting difficult

## Configuration Requirements

When this approach was functional, it required:
- `OPENAI_API_KEY` in `.env.local` (automatically extracted by `codex-with-env.sh`)
- Access to project context via `CLAUDE.md`
- Following critique methodology in `docs/instructions/CRITIQUE_OF_PLANNING_DOC.md`

## Future Considerations

### Potential Improvements
If reliability issues are resolved, this approach could benefit from:
- **Better state management**: Maintain conversation context more effectively
- **Robust error handling**: Graceful recovery from function call failures
- **Hybrid approach**: Combine with API method for best of both worlds
- **Interactive UI**: Web interface for real-time critique dialogue

### Research Areas
- **Conversation optimization**: Techniques for maintaining long AI conversations
- **Tool reliability**: Improving function call success rates in agentic workflows
- **Context preservation**: Better methods for maintaining state across interactions
- **Error patterns**: Understanding common failure modes for prevention

## Relationship to Current Workflow

### Integration Strategy
When functional, this approach would integrate with the core workflow:

1. **Write planning document** following `docs/instructions/WRITE_PLANNING_DOC.md`
2. **Commit planning doc** (creates pre-critique baseline)
3. **Run agentic critique**: `./scripts/codex-with-env.sh planning/doc.md`
4. **Process critique response** using methodology from overview
5. **Update planning document** based on feedback
6. **Commit revised version** with critique summary

### Complementary Use
Could serve as:
- **Interactive refinement tool**: For follow-up questions after API critique
- **Deep-dive analysis**: When comprehensive exploration is needed
- **Experimental platform**: For testing new critique methodologies

## Migration Path

### From Legacy to Current
Users currently relying on this approach should:
1. **Switch to API approach** for immediate reliability
2. **Preserve existing critiques** from successful Codex CLI runs
3. **Monitor improvements** to this approach for future use
4. **Use hybrid strategy** if specific interactive features are needed

### Backup Strategy
Keep this approach available for:
- **Future improvements** when reliability issues are resolved
- **Specialized use cases** requiring interactive dialogue
- **Research purposes** into agentic critique methodologies

This approach represents an important experiment in interactive AI critique, and while currently unreliable, it may become valuable as agentic AI capabilities improve.