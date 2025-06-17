# Fastmod Find-Replace Tool ✓

Fastmod is a battle-tested CLI tool for safe, large-scale codebase refactoring, specifically designed for LLM automation and programmatic use.

## See Also

- `docs/instructions/RENAME_OR_MOVE.md` - uses Fastmod for updating file references
- `docs/reference/SETUP.md` - installation instructions
- [Fastmod GitHub](https://github.com/facebookincubator/fastmod) - official documentation and source

## Key Benefits

- **Safety-first**: Interactive diff preview before applying changes
- **LLM-friendly**: No escaping needed for paths and special characters  
- **Battle-tested**: Used at Meta scale for large codebases
- **Simple syntax**: Consistent, predictable command structure
- **Clear output**: Unified diffs make changes transparent

## Installation

```bash
# macOS (Homebrew)
brew install fastmod

# Rust (cross-platform)
cargo install fastmod
```

## Usage Patterns

### Interactive Mode (Recommended)

```bash
# Shows diffs and prompts for each change
fastmod "old-string" "new-string" .

# Limit to specific file types
fastmod --extensions md,ts,tsx "old/path" "new/path" .

# Literal string matching (no regex)
fastmod --fixed-strings "exact-string" "replacement" .
```

**Interactive Controls**:
- `y` - Accept change (default)
- `n` - Reject change  
- `e` - Edit line in $EDITOR
- `A` - Accept all remaining changes
- `q` - Quit without further changes

### Automated Mode (Use with Caution)

```bash
# Apply all changes automatically
fastmod --accept-all "old-string" "new-string" .

# Print changed files (useful for LLM feedback)
fastmod --accept-all --print-changed-files "old" "new" .
```

## Common Use Cases

### Path Updates
```bash
# Update import paths
fastmod --extensions ts,tsx "from '@/old/path'" "from '@/new/path'" .

# Update file references in documentation
fastmod --extensions md "/old/location/" "/new/location/" .
```

### String Replacements
```bash
# Update function names
fastmod --extensions ts,tsx,js,jsx "oldFunctionName" "newFunctionName" .

# Update configuration values
fastmod --fixed-strings "OLD_CONFIG_VALUE" "NEW_CONFIG_VALUE" .
```

### Documentation Updates
```bash
# Update cross-references
fastmod --extensions md "old-doc-name.md" "new-doc-name.md" .
```

## Safety Best Practices

1. **Always review diffs**: Use interactive mode to see exactly what changes
2. **Test in small scopes**: Start with specific directories or file types
3. **Use version control**: Commit before running large refactors
4. **Verify with build**: Run `npm run build` and tests after changes

## Advanced Options

```bash
# Case-insensitive matching
fastmod --ignore-case "CamelCase" "snake_case" .

# Multi-line regex (use with caution)
fastmod --multiline "pattern.*\nspanning.*lines" "replacement" .

# Search hidden files
fastmod --hidden ".oldValue" ".newValue" .

# Glob patterns
fastmod --glob "*.json" "oldKey" "newKey" .
```

## Troubleshooting

**No matches found**: Check file extensions and path scope
```bash
# Debug: see what files would be processed
find . -name "*.md" -type f | head -10
```

**Regex issues**: Use `--fixed-strings` for literal matching
```bash
# Problematic (regex metacharacters)
fastmod "/path/to/file.txt" "/new/path.txt" .

# Safe (literal strings)  
fastmod --fixed-strings "/path/to/file.txt" "/new/path.txt" .
```

**Permission errors**: Ensure files are writable and not locked by editors

## Integration with Development Workflow

Fastmod integrates seamlessly with the Spideryarn Reading development process:

- **File moves**: Update all references after moving files
- **Refactoring**: Rename functions, variables, and imports across the codebase  
- **Documentation**: Update cross-references when files are renamed
- **Configuration**: Update environment variables and configuration keys

## Limitations

- Uses Rust regex syntax (not Python regex like original `codemod`)
- No lookaround or backreference support
- Use `${1}` instead of `\1` for capture groups
- Use `$$` for literal `$` in replacement strings