#!/usr/bin/env npx tsx

/**
 * Health Check CLI Tool
 * 
 * Systematic compile-time checking for the Spideryarn Reading codebase.
 * Integrates with planning document workflows to provide orchestration-friendly
 * output for routine health checking at the end of development stages.
 * 
 * See docs/reference/COMMAND_LINE_SCRIPTS.md for CLI development patterns.
 * See docs/planning/250620c_ai_orchestration_health_checks.md for implementation details.
 */

import { Cli, Command, Option } from 'clipanion';
import { execSync } from 'child_process';

interface HealthCheckResult {
  tool: string;
  files: string[];
  totalIssues: number;
  success: boolean;
  errorMessage?: string;
}

class HealthCheckCommand extends Command {
  static paths = [Command.Default];

  static usage = Command.Usage({
    description: 'Systematic health check for TypeScript, ESLint, and build issues',
    details: `
      Runs TypeScript, ESLint, and build checks sequentially to identify compile-time issues.
      Designed for planning document workflow integration with orchestration-friendly output.
      
      Git-aware by default: checks files changed since HEAD~1 to catch cross-file impacts.
      Provides file-based output with issue counts for targeted subagent dispatch.
    `,
    examples: [
      ['Basic usage (git-aware)', 'check-health'],
      ['Quick mode (skip build)', 'check-health --quick'],
      ['Rigorous mode (all files + tests)', 'check-health --rigorous'],
      ['Specific files only', 'check-health --files src/lib/services/'],
      ['Skip TypeScript checks', 'check-health --no-typescript'],
      ['Skip ESLint checks', 'check-health --no-eslint'],
      ['Skip build checks', 'check-health --no-build'],
    ],
  });

  // Mode options
  quick = Option.Boolean('--quick', false, {
    description: 'Quick mode: skip build verification (faster iterations)',
  });

  rigorous = Option.Boolean('--rigorous', false, {
    description: 'Rigorous mode: check all files including tests',
  });

  files = Option.Array('--files', [], {
    description: 'Specific file paths to check (overrides git-aware detection)',
  });

  // Tool toggles (using separate flags to avoid parsing ambiguity)
  noTypescript = Option.Boolean('--no-typescript', false, {
    description: 'Skip TypeScript checks',
  });

  noEslint = Option.Boolean('--no-eslint', false, {
    description: 'Skip ESLint checks',
  });

  noBuild = Option.Boolean('--no-build', false, {
    description: 'Skip build checks',
  });

  async execute(): Promise<number> {
    try {
      this.context.stdout.write('🔍 Health Check Starting...\n\n');

      // Determine file scope
      const targetFiles = this.determineFileScope();
      
      if (targetFiles.length === 0) {
        this.context.stdout.write('✅ No files to check (no changes detected)\n');
        return 0;
      }

      this.context.stdout.write(`📋 Scope: ${targetFiles.length} files\n\n`);

      // Run checks sequentially
      const results: HealthCheckResult[] = [];
      
      if (!this.noTypescript) {
        results.push(await this.runTypeScriptCheck(targetFiles));
      }
      
      if (!this.noEslint) {
        results.push(await this.runESLintCheck(targetFiles));
      }
      
      if (!this.noBuild && !this.quick) {
        results.push(await this.runBuildCheck());
      }

      // Generate summary output
      return this.generateSummaryOutput(results);

    } catch (error) {
      this.context.stderr.write(`❌ Health check failed: ${error.message}\n`);
      return 1;
    }
  }

  private determineFileScope(): string[] {
    if (this.files.length > 0) {
      // Explicit file paths provided
      return this.files;
    }

    if (this.rigorous) {
      // Rigorous mode: all TypeScript files
      try {
        const allFiles = execSync(
          'find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next',
          { encoding: 'utf8', cwd: process.cwd() }
        ).trim().split('\n').filter(Boolean);
        return allFiles;
      } catch (error) {
        throw new Error(`Failed to find TypeScript files: ${error.message}`);
      }
    }

    // Default: git-aware (changed files since HEAD~1)
    try {
      const changedFiles = execSync(
        'git diff --name-only HEAD~1 HEAD -- "*.ts" "*.tsx"',
        { encoding: 'utf8', cwd: process.cwd() }
      ).trim().split('\n').filter(Boolean);
      
      // Include any unstaged changes
      const unstagedFiles = execSync(
        'git diff --name-only -- "*.ts" "*.tsx"',
        { encoding: 'utf8', cwd: process.cwd() }
      ).trim().split('\n').filter(Boolean);

      const allChanged = [...new Set([...changedFiles, ...unstagedFiles])];
      return allChanged.filter(file => file && !file.includes('node_modules'));
    } catch (error) {
      // Fallback: check all files if git detection fails
      this.context.stdout.write('⚠️  Git detection failed, checking all files\n');
      try {
        const allFiles = execSync(
          'find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next',
          { encoding: 'utf8', cwd: process.cwd() }
        ).trim().split('\n').filter(Boolean);
        return allFiles;
      } catch (fallbackError) {
        throw new Error(`Failed to find TypeScript files: ${fallbackError.message}`);
      }
    }
  }

  private async runTypeScriptCheck(files: string[]): Promise<HealthCheckResult> {
    this.context.stdout.write('📝 TypeScript check...\n');
    
    try {
      // Use tsc --noEmit for type checking without compilation
      const result = execSync('npx tsc --noEmit', {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      return {
        tool: 'TypeScript',
        files: files,
        totalIssues: 0,
        success: true
      };
    } catch (error) {
      // Parse TypeScript errors to count issues
      const errorOutput = error.stdout || error.stderr || error.message;
      const errorLines = errorOutput.split('\n').filter(line => 
        line.includes('error TS') || line.includes('Error:')
      );

      return {
        tool: 'TypeScript',
        files: files,
        totalIssues: errorLines.length,
        success: false,
        errorMessage: errorOutput
      };
    }
  }

  private async runESLintCheck(files: string[]): Promise<HealthCheckResult> {
    this.context.stdout.write('🔍 ESLint check...\n');
    
    try {
      const result = execSync('npm run lint', {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      return {
        tool: 'ESLint',
        files: files,
        totalIssues: 0,
        success: true
      };
    } catch (error) {
      // Parse ESLint output to count issues
      const errorOutput = error.stdout || error.stderr || error.message;
      const problemLines = errorOutput.split('\n').filter(line => 
        line.toLowerCase().includes('warning') || line.toLowerCase().includes('error')
      );

      return {
        tool: 'ESLint',
        files: files,
        totalIssues: problemLines.length,
        success: false,
        errorMessage: errorOutput
      };
    }
  }

  private async runBuildCheck(): Promise<HealthCheckResult> {
    this.context.stdout.write('🏗️  Build check...\n');
    
    try {
      const result = execSync('npm run build', {
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      return {
        tool: 'Build',
        files: [],
        totalIssues: 0,
        success: true
      };
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || error.message;
      
      return {
        tool: 'Build',
        files: [],
        totalIssues: 1, // Build is binary: success or failure
        success: false,
        errorMessage: errorOutput
      };
    }
  }

  private generateSummaryOutput(results: HealthCheckResult[]): number {
    this.context.stdout.write('\n📊 Health Check Summary:\n');
    this.context.stdout.write('═'.repeat(50) + '\n');

    let totalIssues = 0;
    let hasBlockingIssues = false;

    for (const result of results) {
      const status = result.success ? '✅ OK' : '❌ ISSUES';
      const issueCount = result.totalIssues > 0 ? ` (${result.totalIssues})` : '';
      
      this.context.stdout.write(`${result.tool.padEnd(12)} ${status}${issueCount}\n`);
      
      totalIssues += result.totalIssues;
      
      // TypeScript and Build errors are blocking
      if (!result.success && (result.tool === 'TypeScript' || result.tool === 'Build')) {
        hasBlockingIssues = true;
      }
    }

    this.context.stdout.write('═'.repeat(50) + '\n');

    if (totalIssues === 0) {
      this.context.stdout.write('🎉 All checks passed!\n');
      return 0;
    }

    // Priority guidance for orchestration
    this.context.stdout.write(`📋 Total issues: ${totalIssues}\n`);
    
    if (hasBlockingIssues) {
      this.context.stdout.write('🔴 BLOCKING issues detected\n');
      this.context.stdout.write('📌 Priority: Fix TypeScript/Build errors first\n');
    } else {
      this.context.stdout.write('🟡 Code quality issues detected\n');
      this.context.stdout.write('📌 Priority: Address ESLint warnings\n');
    }

    // File-based orchestration output
    this.context.stdout.write('\n🎯 For detailed fixes, run:\n');
    for (const result of results) {
      if (!result.success) {
        const commandMap = {
          'TypeScript': 'npx tsc --noEmit',
          'ESLint': 'npm run lint',
          'Build': 'npm run build'
        };
        this.context.stdout.write(`   ${commandMap[result.tool]} # ${result.totalIssues} issues\n`);
      }
    }

    return hasBlockingIssues ? 1 : 0;
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Health Check',
  binaryName: 'check-health',
  binaryVersion: '1.0.0',
});

cli.register(HealthCheckCommand);
cli.runExit(process.argv.slice(2));
