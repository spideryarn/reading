#!/usr/bin/env npx ts-node

/**
 * Git Worktree Branch Synchronisation Tool
 * 
 * See planning/250526c_git_worktree_sync_strategy.md for implementation decisions and rationale.
 * See docs/SETUP.md for worktree setup instructions and usage.
 * 
 * This script provides a hybrid approach:
 * 1. Attempts fast-forward merge first (ideal case)
 * 2. Falls back to one-direction merge if branches have diverged
 * 3. Requires user confirmation before fallback operations
 * 4. Two-step process for complete sync when fast-forward fails
 */

import { Cli, Command, Option } from 'clipanion';
import { execSync } from 'child_process';
import * as readline from 'readline';

class SyncBranchesCommand extends Command {
  static paths = [
    ['sync-branches'],
    Command.Default,
  ];

  static usage = Command.Usage({
    description: 'Sync between main and experim branches using git worktrees',
    examples: [
      ['Sync with default branches', 'sync-branches'],
      ['Sync with custom branches', 'sync-branches --main develop --experim feature'],
    ],
  });

  mainBranch = Option.String('--main', 'main', {
    description: 'Name of the main branch (default: main)',
  });

  experimBranch = Option.String('--experim', 'experim', {
    description: 'Name of the experimental branch (default: experim)',
  });

  async execute(): Promise<number> {
    try {
      console.log('🔄 Spideryarn Branch Sync Tool');
      console.log('==============================\n');

      // Safety checks
      await this.runSafetyChecks();

      const currentBranch = this.getCurrentBranch();
      console.log(`📍 Current branch: ${currentBranch}`);

      // Determine sync direction
      const { sourceBranch, targetBranch } = this.determineSyncDirection(currentBranch);
      console.log(`🔀 Syncing: ${sourceBranch} → ${targetBranch}\n`);

      // Try fast-forward approach first
      const fastForwardSuccess = await this.tryFastForward(sourceBranch, targetBranch);

      if (fastForwardSuccess) {
        console.log('✅ Fast-forward sync completed successfully!');
        return 0;
      }

      // Fast-forward failed, ask user about fallback
      console.log('⚠️  Fast-forward sync failed (branches have diverged)');
      const shouldUseFallback = await this.askUserConfirmation(
        'Would you like to merge in one direction instead? (y/N)'
      );

      if (!shouldUseFallback) {
        console.log('❌ Sync cancelled');
        return 1;
      }

      // Use fallback: one-direction merge only
      await this.performOneDirectionMerge(sourceBranch, targetBranch);

      console.log('✅ One-direction merge completed successfully!');
      return 0;

    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      return 1;
    }
  }

  private async runSafetyChecks(): Promise<void> {
    // Check if we're in a git repository
    try {
      this.execGit('rev-parse --git-dir');
    } catch {
      throw new Error('Not in a git repository');
    }

    // Check for uncommitted changes
    const status = this.execGit('status --porcelain').trim();
    if (status) {
      throw new Error('Working tree is not clean. Please commit or stash your changes first.');
    }

    // Check if branches exist
    const branches = this.execGit('branch --list').split('\n').map(b => b.replace(/^[\*\+]?\s*/, ''));
    
    if (!branches.includes(this.mainBranch)) {
      throw new Error(`Main branch '${this.mainBranch}' does not exist`);
    }
    
    if (!branches.includes(this.experimBranch)) {
      throw new Error(`Experimental branch '${this.experimBranch}' does not exist`);
    }

    console.log('✅ Safety checks passed');
  }

  private getCurrentBranch(): string {
    return this.execGit('branch --show-current').trim();
  }

  private determineSyncDirection(currentBranch: string): { sourceBranch: string; targetBranch: string } {
    if (currentBranch === this.mainBranch) {
      // From main: sync experim → main
      return { sourceBranch: this.experimBranch, targetBranch: this.mainBranch };
    } else if (currentBranch === this.experimBranch) {
      // From experim: sync main → experim (preferred order)
      return { sourceBranch: this.mainBranch, targetBranch: this.experimBranch };
    } else {
      throw new Error(`Must be on either '${this.mainBranch}' or '${this.experimBranch}' branch`);
    }
  }

  private async tryFastForward(sourceBranch: string, targetBranch: string): Promise<boolean> {
    try {
      console.log(`🚀 Attempting fast-forward sync...`);
      
      // Try to fast-forward target branch to source branch
      this.execGit(`fetch . ${sourceBranch}:${targetBranch}`);
      
      // Merge the updated target into current branch (if different)
      const currentBranch = this.getCurrentBranch();
      if (currentBranch !== targetBranch) {
        this.execGit(`merge ${targetBranch}`);
      }

      return true;
    } catch {
      return false;
    }
  }

  private async performOneDirectionMerge(sourceBranch: string, targetBranch: string): Promise<void> {
    const currentBranch = this.getCurrentBranch();
    
    if (currentBranch === targetBranch) {
      console.log(`🔄 Merging ${sourceBranch} → ${targetBranch}...`);
      this.execGit(`merge ${sourceBranch}`, {
        errorMessage: `Merge conflicts in ${targetBranch}. Please resolve, commit, and re-run this script.`
      });
      
      console.log(`✅ Merged ${sourceBranch} → ${targetBranch}`);
      console.log(`\n📋 Next step: Run this script from the other worktree (${sourceBranch}) to complete the sync.`);
    } else {
      throw new Error(`Expected to be on ${targetBranch} branch, but currently on ${currentBranch}`);
    }
  }

  private execGit(command: string, options?: { errorMessage?: string }): string {
    try {
      return execSync(`git ${command}`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      if (options?.errorMessage) {
        throw new Error(options.errorMessage);
      }
      throw error;
    }
  }

  private async askUserConfirmation(question: string): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(`${question} `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().startsWith('y'));
      });
    });
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Spideryarn Branch Sync',
  binaryName: 'sync-branches',
  binaryVersion: '1.0.0',
});

cli.register(SyncBranchesCommand);

// Run the CLI
cli.runExit(process.argv.slice(2));