# Python Setup Guide

Python dependencies and environment setup for Spideryarn Reading project features that require Python tools.

## See also

- `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - Main project setup guide
- `scripts/o3-critique-as-api.ts` - Planning document critique tool that uses Python dependencies
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md` - Critique workflow documentation

## Overview

This project is primarily Node.js/TypeScript. Previously, we used Python tools for specific features:

**Previous Python dependencies:**
- **code2prompt** - Was used for automated codebase context generation
  - **Status**: ✅ Migrated to Rust version (v3.0.2) installed via Homebrew
  - **Installation**: `brew install code2prompt` (already completed)
  - **See**: https://github.com/mufeedvh/code2prompt for documentation

## Current Status

As of now, the project has **no Python dependencies**. The requirements.txt file is kept for historical reference and potential future Python tools.

## Python Version Requirements (If Needed in Future)

**Minimum:** Python 3.7+  
**Recommended:** Python 3.11+ for optimal performance  
**Tested:** Python 3.12.3

## Python Environment Management (Reference)

### Recommended: pyenv (macOS/Linux)
For managing multiple Python versions if needed in the future:

```bash
# Install pyenv
brew install pyenv  # macOS
# OR follow https://github.com/pyenv/pyenv#installation for other systems

# Install and use Python 3.12
pyenv install 3.12.3
pyenv local 3.12.3  # Sets Python version for this project
```

### Alternative: System Python
Most systems come with Python 3.7+ which is sufficient for future needs:

```bash
# Check your Python version
python --version
python3 --version
```

## Development Workflow

### For Regular Development
**No Python setup required** - The project currently has no Python dependencies.

### For Contributors
If adding Python features in the future:
1. Update `requirements.txt` with new dependencies
2. Update this documentation
3. Test in clean environment (virtual environment or container)

## Status

✅ **Completed**: Removed Python code2prompt dependency  
✅ **Completed**: Installed Rust version of code2prompt (v3.0.2) via Homebrew  
✅ **Completed**: `scripts/o3-critique-as-api.ts` ready to use Rust code2prompt