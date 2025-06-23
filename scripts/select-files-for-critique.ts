#!/usr/bin/env npx tsx

/**
 * Select Files for Critique - Intelligent Token Budget File Selection
 * 
 * Intelligently selects files for LLM critique based on token budgets to stay within rate limits.
 * Uses the same intelligent file selection logic as o3-critique-as-api.ts but adds token budgeting
 * to prevent exceeding rate limits (e.g., OpenAI's 30k tokens/minute limit).
 * 
 * The script analyzes a planning document to identify relevant files, then iteratively adds files
 * to the selection while checking token counts using code2prompt. It stops when adding the next
 * file would exceed the specified token budget.
 * 
 * Prerequisites:
 * - Install code2prompt (Rust version): https://github.com/mufeedvh/code2prompt
 * 
 * Features:
 * - Reuses intelligent file selection logic from o3-critique-as-api.ts
 * - Incremental token budgeting with code2prompt token counting
 * - Configurable token budget (defaults to 100k)
 * - Prioritized file selection based on relevance
 * - Clear output showing selected files and token usage
 * - Integration with existing critique workflows
 */

import { Cli, Command, Option, UsageError } from 'clipanion';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { getPrioritizedFiles, getRelevantFiles } from '../lib/utils/intelligent-file-selection';

class SelectFilesCommand extends Command {
  static paths = [
    ['select-files'],
    Command.Default,
  ];

  static usage = Command.Usage({
    description: 'Intelligently select files for LLM critique based on token budget constraints',
    details: `
      This script analyzes a planning document to identify relevant files, then selectively
      includes them based on a token budget to avoid rate limits.
      
      The script:
      - Uses the same intelligent file selection logic as o3-critique-as-api.ts
      - Prioritizes files by relevance (explicit mentions first, then contextual)
      - Iteratively adds files while checking token count with code2prompt
      - Stops when adding the next file would exceed the budget
      - Outputs the final file list for use with other critique tools
      
      Designed to stay within configurable token budgets for optimal LLM critique context.
    `,
    examples: [
      ['Select files for a planning document', 'select-files planning/my-feature-plan.md'],
      ['Use custom token budget', 'select-files --budget 20000 planning/my-plan.md'],
      ['Include test files in selection', 'select-files --include-tests planning/my-plan.md'],
      ['Exclude CLAUDE.md from selection', 'select-files --no-include-claude-md planning/my-plan.md'],
      ['Output only file paths', 'select-files --quiet planning/my-plan.md'],
    ],
  });

  planningDoc = Option.String({
    required: true,
    description: 'Path to the planning document to analyze',
  });

  budget = Option.String('--budget', '100000', {
    description: 'Token budget limit (default: 100000)',
  });

  includeTests = Option.Boolean('--include-tests', false, {
    description: 'Include test files in the selection (normally excluded)',
  });

  includeClaude = Option.Boolean('--include-claude-md', true, {
    description: 'Include CLAUDE.md in the base files (default: true)',
  });

  quiet = Option.Boolean('-q,--quiet', false, {
    description: 'Output only the selected file paths (for piping to other tools)',
  });

  verbose = Option.Boolean('-v,--verbose', false, {
    description: 'Enable verbose output with detailed token counting',
  });

  async execute(): Promise<number> {
    try {
      // Validate inputs
      await this.validateInputs();

      // Get prioritized file list with detailed info if verbose
      const fileSelectionResult = this.verbose ? 
        getRelevantFiles(this.planningDoc, {
          includeTests: this.includeTests,
          includeClaude: this.includeClaude
        }) : null;
        
      const prioritizedFiles = getPrioritizedFiles(this.planningDoc, {
        includeTests: this.includeTests,
        includeClaude: this.includeClaude
      });
      
      if (!this.quiet) {
        if (this.verbose && fileSelectionResult) {
          this.context.stdout.write(`📁 Explicit paths found: ${fileSelectionResult.explicitPaths.length}\n`);
          this.context.stdout.write(`🎯 Contextual files identified: ${fileSelectionResult.contextualFiles.length}\n`);
          this.context.stdout.write(`✅ Total unique existing files: ${prioritizedFiles.length}\n\n`);
        }
        this.context.stdout.write(`📊 Found ${prioritizedFiles.length} potentially relevant files\n`);
        this.context.stdout.write(`🎯 Token budget: ${this.budget} tokens\n\n`);
      }

      // Select files within budget
      const selectedFiles = await this.selectFilesWithinBudget(prioritizedFiles);

      // Output results
      if (this.quiet) {
        // Just output file paths for piping to other tools
        selectedFiles.forEach(file => this.context.stdout.write(`${file}\n`));
      } else {
        this.context.stdout.write(`\n✅ Selected ${selectedFiles.length} files within token budget:\n\n`);
        selectedFiles.forEach(file => this.context.stdout.write(`${file}\n`));
        this.context.stdout.write(`\n💡 Usage: You can now use these files with o3-critique-as-api.ts:\n`);
        this.context.stdout.write(`   npx tsx scripts/o3-critique-as-api.ts --files ${selectedFiles.join(' --files ')} ${this.planningDoc}\n`);
        this.context.stdout.write(`\n📋 Or copy this command directly:\n`);
        this.context.stdout.write(`npx tsx scripts/o3-critique-as-api.ts --files ${selectedFiles.join(' --files ')} ${this.planningDoc}\n`);
      }

      return 0;

    } catch (error) {
      if (error instanceof UsageError) {
        throw error;
      }

      this.context.stderr.write(`\n❌ Unexpected error: ${error.message}\n`);
      this.context.stderr.write(`\n🔧 Recovery options:\n`);
      this.context.stderr.write(`   • Verify planning document exists and is readable\n`);
      this.context.stderr.write(`   • Check that code2prompt is installed and working\n`);
      this.context.stderr.write(`   • Run with --verbose for more details\n`);

      return 1;
    }
  }

  private async validateInputs(): Promise<void> {
    // Check if running from project root
    if (!existsSync('.env.local')) {
      throw new UsageError('Must run from project root (no .env.local found)');
    }

    // Check if planning doc exists
    if (!existsSync(this.planningDoc)) {
      throw new UsageError(`Planning document not found: ${this.planningDoc}`);
    }

    // Validate token budget
    const budgetNum = parseInt(this.budget, 10);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      throw new UsageError(`Invalid token budget: ${this.budget}. Must be a positive number.`);
    }

    // Check if code2prompt is installed
    try {
      execSync('which code2prompt', { stdio: 'pipe' });
    } catch {
      throw new UsageError(
        'code2prompt not found. Please install the Rust version:\n' +
        '  • macOS/Linux: curl -fsSL https://raw.githubusercontent.com/mufeedvh/code2prompt/main/install.sh | sh\n' +
        '  • Or via Cargo: cargo install code2prompt\n' +
        '  • See: https://github.com/mufeedvh/code2prompt for more options'
      );
    }
  }


  private async selectFilesWithinBudget(prioritizedFiles: string[]): Promise<string[]> {
    const selectedFiles: string[] = [];
    let currentTokens = 0;
    const budgetLimit = parseInt(this.budget, 10);

    if (!this.quiet) {
      this.context.stdout.write('🔍 Selecting files within token budget...\n\n');
    }

    for (const file of prioritizedFiles) {
      // Calculate tokens for current selection + this file
      const testFiles = [...selectedFiles, file];
      const tokenCount = await this.getTokenCountForFiles(testFiles);
      
      if (tokenCount <= budgetLimit) {
        // This file fits within budget
        selectedFiles.push(file);
        currentTokens = tokenCount;
        
        if (!this.quiet && this.verbose) {
          this.context.stdout.write(`✅ ${file} (${tokenCount} total tokens)\n`);
        } else if (!this.quiet) {
          this.context.stdout.write(`✅ ${file}\n`);
        }
      } else {
        // This file would exceed budget, stop here
        if (!this.quiet) {
          this.context.stdout.write(`⏹️  Stopped at ${file} (would exceed budget: ${tokenCount} > ${budgetLimit})\n`);
        }
        break;
      }
    }

    if (!this.quiet) {
      this.context.stdout.write(`\n📊 Final selection: ${selectedFiles.length}/${prioritizedFiles.length} files, ${currentTokens}/${budgetLimit} tokens\n`);
    }

    return selectedFiles;
  }

  private async getTokenCountForFiles(files: string[]): Promise<number> {
    if (files.length === 0) return 0;

    try {
      // Build code2prompt command with token counting
      const cmd = [
        'code2prompt',
        '.',  // Path as positional argument
        '--tokens format',
        // Add each file as an include pattern
        ...files.map(file => `--include "${file}"`),
      ].join(' ');

      const output = execSync(cmd, { 
        stdio: 'pipe',
        encoding: 'utf8'
      });

      // Extract token count from output
      // Handle both comma-separated and plain numbers
      const tokenMatch = output.match(/Token count: ([\d,]+)/);
      if (tokenMatch) {
        return parseInt(tokenMatch[1].replace(/,/g, ''), 10);
      } else {
        // Fallback: try to find token count in different format
        const altTokenMatch = output.match(/([\d,]+)\s+tokens/i);
        if (altTokenMatch) {
          return parseInt(altTokenMatch[1].replace(/,/g, ''), 10);
        }
      }

      throw new Error('Could not extract token count from code2prompt output');

    } catch (error) {
      throw new UsageError(`Token counting failed for files [${files.join(', ')}]: ${error.message}`);
    }
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'File Selection for LLM Critique',
  binaryName: 'select-files-for-critique',
  binaryVersion: '1.0.0',
});

cli.register(SelectFilesCommand);
cli.runExit(process.argv.slice(2));