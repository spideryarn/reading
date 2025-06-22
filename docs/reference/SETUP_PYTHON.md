# Python Setup Guide

Python dependencies and environment setup for Spideryarn Reading project features that require Python tools.

## See also

- `docs/reference/SETUP.md` - Main project setup guide
- `scripts/o3-critique-as-api.ts` - Planning document critique tool that uses Python dependencies
- `docs/instructions/GATHER_DIVERSE_INPUTS_AND_CRITIQUES_ON_PLANNING_DOCS_FROM_OTHER_AI_MODELS_API_APPROACH.md` - Critique workflow documentation

## Overview

This project is primarily Node.js/TypeScript, but uses Python tools for specific features:

**Current Python dependencies:**
- **code2prompt** - Automated codebase context generation for LLM critique workflows
- Used by `scripts/o3-critique-as-api.ts` for planning document analysis

## Python Version Requirements

**Minimum:** Python 3.7+  
**Recommended:** Python 3.11+ for optimal performance  
**Tested:** Python 3.12.3

## Installation Options

### Option 1: Automatic Installation (Recommended)
The critique script automatically installs dependencies when needed:

```bash
# Dependencies installed automatically on first run
./scripts/o3-critique-as-api.ts planning/my-document.md
```

### Option 2: Manual Installation
Install all Python dependencies upfront:

```bash
# Install from requirements.txt
pip install -r requirements.txt

# Or install individually
pip install code2prompt==0.8.1
```

### Option 3: Virtual Environment (Isolation)
For developers working with multiple Python projects:

```bash
# Create virtual environment
python -m venv venv

# Activate (macOS/Linux)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Deactivate when done
deactivate
```

## Python Environment Management

### Recommended: pyenv (macOS/Linux)
For managing multiple Python versions:

```bash
# Install pyenv
brew install pyenv  # macOS
# OR follow https://github.com/pyenv/pyenv#installation for other systems

# Install and use Python 3.12
pyenv install 3.12.3
pyenv local 3.12.3  # Sets Python version for this project
```

### Alternative: System Python
Most systems come with Python 3.7+ which is sufficient:

```bash
# Check your Python version
python --version
python3 --version

# Use python3 if python points to Python 2.x
python3 -m pip install -r requirements.txt
```

## Dependency Details

### code2prompt
**Purpose:** Generates comprehensive codebase context for LLM analysis  
**Version:** 0.8.1  
**Features used:**
- `.gitignore` integration for smart file exclusion
- Token counting for cost transparency  
- Line number inclusion for precise code references
- Multiple output formats (Markdown, custom templates)

**Installation verification:**
```bash
code2prompt --version
# Should output: code2prompt, version 0.8.1
```

## Troubleshooting

### "code2prompt not found"
```bash
# Check if pip installed correctly
pip list | grep code2prompt

# Reinstall if needed
pip install --force-reinstall code2prompt==0.8.1

# If using python3 specifically
python3 -m pip install code2prompt==0.8.1
```

### Permission errors
```bash
# Use --user flag to install in user directory
pip install --user -r requirements.txt

# Or use virtual environment (see Option 3 above)
```

### Path issues
```bash
# Check if pip bin directory is in PATH
echo $PATH

# Add to ~/.bashrc or ~/.zshrc if needed
export PATH="$HOME/.local/bin:$PATH"
```

### Python version conflicts
```bash
# Use specific Python version
python3.12 -m pip install -r requirements.txt

# Or use pyenv to manage versions (recommended)
pyenv local 3.12.3
```

## Development Workflow

### For Regular Development
**Most developers won't need manual Python setup** - the critique script handles dependencies automatically.

### For Contributors Adding Python Features
1. Update `requirements.txt` with new dependencies
2. Test automatic installation in the script
3. Update this documentation
4. Test in clean environment (virtual environment or container)

### For CI/CD
```bash
# In GitHub Actions or similar
- name: Setup Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.11'

- name: Install Python dependencies  
  run: pip install -r requirements.txt
```

## Integration with Node.js Workflow

### Package.json Scripts
Consider adding Python-related scripts to package.json:

```json
{
  "scripts": {
    "python:install": "pip install -r requirements.txt",
    "python:check": "python --version && code2prompt --version",
    "critique": "./scripts/o3-critique-as-api.ts"
  }
}
```

### Development Dependencies
Python tools are **runtime dependencies** for critique features, not development dependencies. They're needed in production for the critique workflow to function.

## Status

✅ **Implemented**: Basic Python dependency management with requirements.txt  
📋 **Planned**: Consider adding pyproject.toml for more advanced Python project management if Python usage expands  
🚧 **In Progress**: Testing automatic installation reliability across different environments