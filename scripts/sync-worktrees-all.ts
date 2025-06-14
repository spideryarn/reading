#!/usr/bin/env npx tsx

/**
 * Sync All Worktrees - Boomerang Script
 * 
 * This wrapper script automates the two-step sync process across all worktrees:
 * 1. From main: Collects changes from all worktree branches
 * 2. From each worktree: Pulls latest main changes
 * 
 * Run this from your main worktree to sync everything in one command.
 * The script will "boomerang" - go out to each worktree and come back.
 * 
 * See also:
 * - docs/instructions/GIT_WORKTREES.md - Complete worktree setup and workflow documentation
 * - docs/reference/COMMAND_LINE_SCRIPTS.md - Guidelines for CLI scripts
 * - scripts/sync-worktrees.ts - The underlying sync script this wrapper calls
 */

import { Cli, Command, Option, UsageError } from 'clipanion';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, basename } from 'path';

class SyncAllWorktreesCommand extends Command {
  static paths = [
    ['sync-all-worktrees'],
    Command.Default,
  ];

  static usage = Command.Usage({
    description: 'Sync all worktrees with main branch in both directions',
    details: `
      This "boomerang" script automates the two-step sync process across all worktrees:
      
      1. From main: Collects changes from all worktree branches
      2. From each worktree: Pulls latest main changes
      
      The script must be run from your main worktree. It will visit each worktree
      to complete the sync process, then return to main.
      
      With --ignore-dirty, the script will skip any worktrees that have uncommitted
      changes, preventing potential merge conflicts or lost work.
      
      By default, npm install is run in each worktree after successful Git sync to ensure
      dependencies are up to date. Use --run-npm-ci=false to skip this step for faster
      execution when you know dependencies haven't changed.
    `,
    examples: [
      ['Sync all worktrees', 'sync-all-worktrees'],
      ['Skip worktrees with uncommitted changes', 'sync-all-worktrees --ignore-dirty'],
      ['Sync without running npm install', 'sync-all-worktrees --run-npm-ci=false'],
    ],
  });

  ignoreDirty = Option.Boolean('--ignore-dirty', false, {
    description: 'Skip worktrees with uncommitted changes',
  });

  runNpmCi = Option.Boolean('--run-npm-ci', true, {
    description: 'Run npm install in each worktree after successful Git sync (default: true)',
  });

  // ANSI color codes for output
  private colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
  };

  private log(message: string, color: string = this.colors.reset) {
    this.context.stdout.write(`${color}${message}${this.colors.reset}\n`);
  }

  private execInDirectory(directory: string, command: string): { success: boolean; output?: string; error?: string } {
    try {
      const output = execSync(command, {
        cwd: directory,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { success: true, output };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Unknown error',
        output: error.stdout?.toString() || ''
      };
    }
  }

  private isWorktreeDirty(worktreePath: string): boolean {
    try {
      const status = execSync('git status --porcelain', {
        cwd: worktreePath,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
      return status.length > 0;
    } catch {
      // If we can't check status, consider it dirty to be safe
      return true;
    }
  }

  async execute(): Promise<number> {
    try {
      this.log('🔄 Sync All Worktrees - Boomerang Mode', this.colors.bright);
      if (this.ignoreDirty) {
        this.log('   Option: --ignore-dirty (skipping dirty worktrees)', this.colors.yellow);
      }
      if (!this.runNpmCi) {
        this.log('   Option: --run-npm-ci=false (skipping npm install)', this.colors.yellow);
      }
      
      // Get current directory (should be main)
      const currentDir = process.cwd();
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      if (currentBranch !== 'main') {
        throw new UsageError(
          `This script must be run from the main branch.\n` +
          `Current branch: ${currentBranch}\n` +
          `Please switch to main branch and try again.`
        );
      }
      
      // Get all worktrees
      const worktreeOutput = execSync('git worktree list --porcelain', { encoding: 'utf8' });
      const worktrees = this.parseWorktreeList(worktreeOutput);
      
      // Filter for worktree branches and main
      const standardWorktrees = worktrees
        .filter(wt => wt.branch && /^(worktree\d+|main)$/.test(wt.branch))
        .sort((a, b) => {
          // Put main first, then sort worktrees numerically
          if (a.branch === 'main') return -1;
          if (b.branch === 'main') return 1;
          return a.branch!.localeCompare(b.branch!);
        });
      
      // Track worktrees that are skipped due to non-standard branches
      const nonStandardWorktrees = worktrees
        .filter(wt => wt.branch && !/^(worktree\d+|main)$/.test(wt.branch))
        .sort((a, b) => a.branch!.localeCompare(b.branch!));
      
      const worktreeOnlyPaths = standardWorktrees.filter(wt => wt.branch !== 'main');
      
      if (worktreeOnlyPaths.length === 0) {
        throw new UsageError('No worktree branches found. Create worktree branches first.');
      }
      
      this.log(`\nFound ${worktreeOnlyPaths.length} worktrees:`, this.colors.cyan);
  
      // Check dirty status if needed
      let cleanWorktrees = worktreeOnlyPaths;
      const dirtyWorktrees: typeof worktreeOnlyPaths = [];
      
      if (this.ignoreDirty) {
        cleanWorktrees = [];
        for (const wt of worktreeOnlyPaths) {
          const isDirty = this.isWorktreeDirty(wt.path);
          if (isDirty) {
            dirtyWorktrees.push(wt);
            this.log(`  • ${wt.branch} → ${wt.path} (⚠️  dirty - skipping)`, this.colors.yellow);
          } else {
            cleanWorktrees.push(wt);
            this.log(`  • ${wt.branch} → ${wt.path}`, this.colors.green);
          }
        }
        
        if (cleanWorktrees.length === 0) {
          this.log(`\n⚠️  All worktrees are dirty. No branches to sync.`, this.colors.yellow);
          this.log(`   Use without --ignore-dirty to sync anyway.`, this.colors.yellow);
          return 0;
        }
      } else {
        worktreeOnlyPaths.forEach(wt => {
          this.log(`  • ${wt.branch} → ${wt.path}`);
        });
      }
  
      // Step 1: Sync all worktrees to main (from main)
      this.log(`\n📥 Step 1: Collecting changes from all worktrees...`, this.colors.bright);
      this.log(`   Running from: ${currentDir}\n`);
  
      // Build command with specific branches if ignoring dirty ones
      let syncCommand = './scripts/sync-worktrees.ts';
      if (this.ignoreDirty && cleanWorktrees.length < worktreeOnlyPaths.length) {
        // Need to sync specific branches only
        for (const wt of cleanWorktrees) {
          this.log(`   Syncing ${wt.branch}...`);
          const branchResult = this.execInDirectory(currentDir, `./scripts/sync-worktrees.ts --branch ${wt.branch}`);
          if (!branchResult.success) {
            this.log(`\n❌ Failed to sync ${wt.branch} to main:`, this.colors.red);
            this.log(branchResult.error || 'Unknown error', this.colors.red);
            if (branchResult.output) {
              this.log(`\nOutput:`, this.colors.yellow);
              this.context.stdout.write(branchResult.output + '\n');
            }
            this.log(`\n🔧 Fix the issues above and try again.`, this.colors.yellow);
            return 1;
          }
          if (branchResult.output) {
            this.context.stdout.write(branchResult.output + '\n');
          }
        }
      } else {
        // Sync all branches
        const step1Result = this.execInDirectory(currentDir, syncCommand);
        
        if (!step1Result.success) {
          this.log(`\n❌ Failed to sync worktrees to main:`, this.colors.red);
          this.log(step1Result.error || 'Unknown error', this.colors.red);
          if (step1Result.output) {
            this.log(`\nOutput:`, this.colors.yellow);
            this.context.stdout.write(step1Result.output + '\n');
          }
          this.log(`\n🔧 Fix the issues above and try again.`, this.colors.yellow);
          return 1;
        }
        
        if (step1Result.output) {
          this.context.stdout.write(step1Result.output + '\n');
        }
      }

      // Run npm install in main after merging worktree changes
      if (this.runNpmCi) {
        this.log(`\n📦 Running npm install in main...`, this.colors.cyan);
        const mainNpmResult = this.execInDirectory(currentDir, 'npm install');
        
        if (mainNpmResult.success) {
          this.log(`✅ npm install completed in main`, this.colors.green);
        } else {
          this.log(`❌ npm install failed in main`, this.colors.red);
          if (mainNpmResult.error) {
            this.log(`Error: ${mainNpmResult.error}`, this.colors.red);
          }
          if (mainNpmResult.output) {
            this.log(`npm install output:`, this.colors.yellow);
            this.context.stdout.write(mainNpmResult.output + '\n');
          }
          this.log(`\n🔧 Fix npm install issues in main and try again.`, this.colors.yellow);
          return 1;
        }
      }
  
      // Step 2: Go to each worktree and pull from main
      this.log(`\n📤 Step 2: Distributing main to all worktrees...`, this.colors.bright);
      
      let allSuccess = true;
      const results: Array<{ branch: string; success: boolean; error?: string; skipped?: boolean; skipReason?: string; path?: string }> = [];
      
      // If ignoring dirty, add skipped results for dirty worktrees
      if (this.ignoreDirty) {
        for (const wt of dirtyWorktrees) {
          results.push({ branch: wt.branch!, success: true, skipped: true });
        }
      }
      
      // Add skipped results for non-standard branch worktrees
      for (const wt of nonStandardWorktrees) {
        results.push({ 
          branch: wt.branch!, 
          success: true, 
          skipped: true, 
          skipReason: 'non-standard branch',
          path: wt.path
        });
      }
      
      // Only sync clean worktrees
      const worktreesToSync = this.ignoreDirty ? cleanWorktrees : worktreeOnlyPaths;
      
      for (const worktree of worktreesToSync) {
        this.log(`\n🔀 Syncing ${worktree.branch}...`, this.colors.cyan);
        this.log(`   Going to: ${worktree.path}`);
        
        const syncScriptPath = resolve(worktree.path, 'scripts/sync-worktrees.ts');
        
        if (!existsSync(syncScriptPath)) {
          this.log(`   ⚠️  Script not found at ${syncScriptPath}`, this.colors.yellow);
          results.push({ branch: worktree.branch!, success: false, error: 'Script not found' });
          allSuccess = false;
          continue;
        }
        
        const result = this.execInDirectory(worktree.path, './scripts/sync-worktrees.ts');
        
        if (result.success) {
          this.log(`   ✅ Git sync successful`, this.colors.green);
          if (result.output) {
            // Show the output but indent it
            this.context.stdout.write(result.output.split('\n').map(line => '      ' + line).join('\n') + '\n');
          }
          
          // Run npm install if enabled
          if (this.runNpmCi) {
            this.log(`   📦 Running npm install...`, this.colors.cyan);
            const npmResult = this.execInDirectory(worktree.path, 'npm install');
            
            if (npmResult.success) {
              this.log(`   ✅ npm install completed`, this.colors.green);
              results.push({ branch: worktree.branch!, success: true });
            } else {
              this.log(`   ❌ npm install failed`, this.colors.red);
              if (npmResult.error) {
                this.log(`   Error: ${npmResult.error}`, this.colors.red);
              }
              if (npmResult.output) {
                this.log(`   npm install output:`, this.colors.yellow);
                this.context.stdout.write(npmResult.output.split('\n').map(line => '      ' + line).join('\n') + '\n');
              }
              results.push({ branch: worktree.branch!, success: false, error: `npm install failed: ${npmResult.error}` });
              allSuccess = false;
            }
          } else {
            results.push({ branch: worktree.branch!, success: true });
          }
        } else {
          this.log(`   ❌ Git sync failed`, this.colors.red);
          if (result.error) {
            this.log(`   Error: ${result.error}`, this.colors.red);
          }
          if (result.output) {
            this.context.stdout.write(result.output.split('\n').map(line => '      ' + line).join('\n') + '\n');
          }
          results.push({ branch: worktree.branch!, success: false, error: result.error });
          allSuccess = false;
        }
      }
  
      // Final summary
      this.log(`\n${'='.repeat(50)}`, this.colors.bright);
      this.log(`🏁 Sync Complete - Boomerang Returned!`, this.colors.bright);
      this.log(`${'='.repeat(50)}\n`, this.colors.bright);
      
      const successCount = results.filter(r => r.success).length;
      this.log(`Summary: ${successCount}/${results.length} worktrees synced successfully\n`);
      
      results.forEach(result => {
        let icon, color, suffix;
        if (result.skipped) {
          icon = '⏭️';
          color = this.colors.yellow;
          if (result.skipReason === 'non-standard branch') {
            const folderName = result.path ? basename(result.path) : 'unknown';
            suffix = ` (skipped - non-standard branch in ${folderName}/)`;
          } else {
            suffix = ' (skipped - dirty)';
          }
        } else if (result.success) {
          icon = '✅';
          color = this.colors.green;
          suffix = '';
        } else {
          icon = '❌';
          color = this.colors.red;
          suffix = result.error ? ': ' + result.error : '';
        }
        this.log(`  ${icon} ${result.branch}${suffix}`, color);
      });
      
      if (!allSuccess) {
        this.log(`\n⚠️  Some worktrees failed to sync.`, this.colors.yellow);
        this.log(`   Check the errors above and resolve any merge conflicts.`, this.colors.yellow);
        this.log(`   Then run the sync script manually in those worktrees.`, this.colors.yellow);
        return 1;
      } else {
        this.log(`\n🎉 All worktrees are now in sync!`, this.colors.green);
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}-${date.getDate().toString().padStart(2, '0')}`;
        const formattedTime = date.toLocaleTimeString('en-US', { hour12: false });
        this.log(`   Completed at ${formattedDate} ${formattedTime}`, this.colors.cyan);
        return 0;
      }
    } catch (error) {
      if (error instanceof UsageError) {
        throw error;
      }
      this.log(`\n❌ Unexpected error:`, this.colors.red);
      this.log(error instanceof Error ? error.message : String(error), this.colors.red);
      this.log(`\n🔧 Recovery options:`, this.colors.yellow);
      this.log(`   • Check git status in all worktrees`, this.colors.yellow);
      this.log(`   • Verify worktree structure: git worktree list`, this.colors.yellow);
      this.log(`   • See docs/instructions/GIT_WORKTREES.md for troubleshooting`, this.colors.yellow);
      return 1;
    }
  }

  private parseWorktreeList(output: string): Array<{ path: string, branch: string | null }> {
    const worktrees: Array<{ path: string, branch: string | null }> = [];
    const lines = output.split('\n');
    
    let currentWorktree: { path?: string, branch?: string | null } = {};
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        if (currentWorktree.path) {
          worktrees.push({ 
            path: currentWorktree.path, 
            branch: currentWorktree.branch || null 
          });
        }
        currentWorktree = { path: line.substring(9) };
      } else if (line.startsWith('branch refs/heads/')) {
        currentWorktree.branch = line.substring(18);
      } else if (line === 'detached') {
        currentWorktree.branch = null;
      }
    }
    
    // Don't forget the last worktree
    if (currentWorktree.path) {
      worktrees.push({ 
        path: currentWorktree.path, 
        branch: currentWorktree.branch || null 
      });
    }
    
    return worktrees;
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Sync All Worktrees',
  binaryName: 'sync-all-worktrees',
  binaryVersion: '1.0.0',
});

cli.register(SyncAllWorktreesCommand);

// Run the CLI
cli.runExit(process.argv.slice(2));