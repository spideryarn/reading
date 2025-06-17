# Command-Line Scripts

Guidelines for writing command-line scripts in the Spideryarn Reading codebase, covering both shell scripts and TypeScript/Clipanion tools.

## See also

- `docs/instructions/GIT_WORKTREES.md` - Example of well-documented script usage (sync-worktrees scripts)
- `scripts/sync-worktrees.ts` - Example Clipanion implementation with comprehensive help and error handling
- `scripts/` - Directory containing all project scripts
- `docs/reference/FASTMOD_FIND_REPLACE.md` - Fastmod tool for codebase refactoring
- https://github.com/arcanis/clipanion - Clipanion documentation for TypeScript CLI tools

## When to Use Shell Scripts vs Clipanion

### Shell Scripts
Use shell scripts (`.sh`) for:
- Very short/simple scripts with one or two required arguments
- Scripts that primarily orchestrate other command-line tools
- Quick one-liners or simple loops
- Scripts under ~50 lines without complex logic

Examples:
- `scripts/count_lines.sh` - Simple wrapper around `cloc` command
- `scripts/dev-with-restart.sh` - Basic npm command orchestration

### Clipanion TypeScript Scripts
Use Clipanion (`.ts`) for:
- Scripts with multiple/complex arguments
- Scripts containing any significant logic (loops, conditionals, functions)
- Scripts that need proper error handling and recovery
- Scripts that would benefit from type safety
- Scripts that parse or manipulate data structures

Examples:
- `scripts/sync-worktrees.ts` - Complex Git operations with multiple modes
- `scripts/import-static-documents.ts` - Database operations with error handling

## External Tools for Script Integration

### Fastmod for Codebase Refactoring

**Fastmod** is the preferred tool for find-replace operations across the codebase:

```bash
# Interactive mode (recommended for scripts)
fastmod "old-string" "new-string" .

# Automated mode (use in scripts with caution)
fastmod --accept-all --print-changed-files "old" "new" .
```

**Script Integration Pattern**:
```typescript
import { execSync } from 'child_process';

// Run fastmod and capture changed files
try {
  const result = execSync(
    `fastmod --accept-all --print-changed-files "${oldString}" "${newString}" .`,
    { encoding: 'utf8' }
  );
  
  const changedFiles = result.trim().split('\n').filter(Boolean);
  this.context.stdout.write(`Updated ${changedFiles.length} files\n`);
  
  return 0;
} catch (error) {
  throw new UsageError(`Fastmod failed: ${error.message}`);
}
```

See `docs/reference/FASTMOD_FIND_REPLACE.md` for complete usage guide.

## Setting Up Clipanion Scripts

### 1. Dependencies
Clipanion is included as a dev dependency:
```json
{
  "devDependencies": {
    "clipanion": "^4.0.0-rc.4",
    "tsx": "^4.19.2"
  }
}
```

### 2. Script Structure
```typescript
#!/usr/bin/env npx tsx

import { Cli, Command, Option, UsageError } from 'clipanion';

class MyCommand extends Command {
  static paths = [['my-command'], Command.Default];
  
  static usage = Command.Usage({
    description: 'Brief description of what this script does',
    details: `
      Detailed explanation of the script's purpose and behavior.
      Can include markdown formatting.
    `,
    examples: [
      ['Basic usage', 'my-command --input file.txt'],
      ['With options', 'my-command --input file.txt --verbose'],
    ],
  });

  // Define options
  inputFile = Option.String('--input', {
    description: 'Path to input file',
    required: true,
  });

  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Enable verbose output',
  });

  async execute(): Promise<number> {
    try {
      // Your script logic here
      return 0; // Success
    } catch (error) {
      // Error handling - see Error Handling section
      throw error;
    }
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'My Script',
  binaryName: 'my-script',
  binaryVersion: '1.0.0',
});

cli.register(MyCommand);
cli.runExit(process.argv.slice(2));
```

### 3. Making Scripts Executable
```bash
chmod +x scripts/my-script.ts
```

## Error Handling Principles

**Core principle**: No silent failures or band-aid fixes. If something unexpected happens, fail immediately with a clear error message.

### Exit Codes
- Return `0` for success
- Return `1` (or higher) for expected failures
- Throw errors for unexpected failures

### Error Types in Clipanion
```typescript
// For user-facing errors (no stack trace)
throw new UsageError('File not found: ' + filename);

// For unexpected errors (with stack trace)
throw new Error('Database connection failed: ' + error.message);

// For expected failures (e.g., no matches found)
return 1; // With appropriate console output
```

### Recovery Instructions
When operations fail, provide actionable recovery steps:
```typescript
catch (error) {
  console.error('\n❌ Operation failed:', error.message);
  console.error('\n🔧 Recovery options:');
  console.error('   • Check file permissions: ls -la ' + filepath);
  console.error('   • Verify database connection: npm run db:test');
  // console.error('   • See docs/TROUBLESHOOTING.md for more help\n'); // TODO: Create troubleshooting doc
  return 1;
}
```

## Help Text Requirements

All scripts must support `-h` or `--help` flags and include:

1. **High-level description** - What the script does in one sentence
2. **Usage examples** - Real-world command examples
3. **Options documentation** - Clear description for each option
4. **References to documentation** - Link to relevant docs

Clipanion provides this automatically through the `static usage` property.

## Environment Variables

### Loading from .env.local
For scripts needing environment variables, load from `.env.local` to keep things simple:

```typescript
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Use with fallback to environment
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new UsageError('ANTHROPIC_API_KEY not found in .env.local or environment');
}
```

### When to Skip .env Loading
- Scripts that are always run in an environment where variables are pre-loaded
- Scripts that only use system environment variables (PATH, HOME, etc.)
- Very simple scripts that don't need configuration

## Clipanion-Specific Patterns

### Option Types
```typescript
// String with validation
apiKey = Option.String('--api-key', {
  validator: t.isString(),
  required: true,
});

// Boolean flags
verbose = Option.Boolean('-v,--verbose', false);

// Arrays for multiple values
files = Option.Array('--files', [], {
  description: 'Files to process',
});

// Rest arguments
restArgs = Option.Rest();
```

### Context Usage
Use context methods instead of console directly:
```typescript
async execute(): Promise<number> {
  // Good
  this.context.stdout.write('Processing...\n');
  
  // Avoid
  console.log('Processing...');
}
```

### Common Gotchas

1. **No automatic type coercion** - String options return strings, not numbers
2. **Optional values** - Options may be undefined, handle accordingly
3. **Exit codes** - Use `cli.runExit()` to properly handle exit codes
4. **Stack traces** - Use `UsageError` for clean user-facing errors

## Examples

### Simple Shell Script
```bash
#!/bin/bash
# backup-database.sh - Create a backup of the local database

if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    echo "Usage: $0 [backup-name]"
    echo "Create a backup of the local Supabase database"
    echo ""
    echo "Examples:"
    echo "  $0              # Creates backup with timestamp"
    echo "  $0 pre-migration # Creates named backup"
    exit 0
fi

# Script implementation...
```

### Complex Clipanion Script
See `scripts/sync-worktrees.ts` for a comprehensive example with:
- Multiple command modes
- Complex option handling
- Detailed error recovery
- Integration with Git operations
- Comprehensive help text