#!/usr/bin/env npx tsx

/**
 * Git Worktree Branch Synchronisation Tool
 * 
 * See docs/GIT_WORKTREES.md for complete worktree setup and workflow documentation.
 * 
 * This script provides one-direction merge synchronisation between the current
 * branch and main branch. Always requires a two-step process for complete sync:
 * 1. From feature branch: merge main → current
 * 2. From main branch: merge specified branch → main
 * 
 * AUTOSTASH SUPPORT:
 * This script uses Git's built-in --autostash functionality to safely handle
 * uncommitted changes during merges. Local changes are automatically stashed
 * before the merge and reapplied afterward. If conflicts occur during stash
 * reapplication, Git provides clear recovery instructions.
 */

import { Cli, Command, Option } from 'clipanion';
import { execSync } from 'child_process';

class SyncBranchesCommand extends Command {
  static paths = [
    ['sync-branches'],
    Command.Default,
  ];

  static usage = Command.Usage({
    description: 'Sync current branch with main branch using one-direction merge',
    examples: [
      ['Sync current branch with main', 'sync-branches'],
      ['Sync with custom main branch name', 'sync-branches --main develop'],
      ['Sync specific branch with main (from main)', 'sync-branches --branch worktree1'],
      ['Sync all worktrees with main (from main)', 'sync-branches'],
    ],
  });

  mainBranch = Option.String('--main', 'main', {
    description: 'Name of the main branch (default: main)',
  });

  targetBranch = Option.String('--branch', {
    description: 'Specific branch to sync with main (when on main). If not specified, syncs all worktree branches.',
  });

  async execute(): Promise<number> {
    try {
      // Safety checks (quiet unless issues)
      await this.runSafetyChecks();

      const currentBranch = this.getCurrentBranch();

      if (currentBranch === this.mainBranch && !this.targetBranch) {
        // From main without specific branch: sync all worktrees
        await this.syncAllWorktrees();
      } else {
        // Normal single-branch sync
        const { sourceBranch, targetBranch } = this.determineSyncDirection(currentBranch);
        console.log(`🔀 ${sourceBranch} → ${targetBranch}`);

        await this.performOneDirectionMerge(sourceBranch, targetBranch);

        console.log('✅ Synced');
        const date = new Date();
        const formattedDate = `${date.getFullYear()}-${date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}-${date.getDate().toString().padStart(2, '0')}`;
        const formattedTime = date.toLocaleTimeString('en-US', { hour12: false });
        console.log(`Synced at ${formattedDate} ${formattedTime}`);
        
        // Provide next step guidance only for complex scenarios
        if (currentBranch === this.mainBranch) {
          console.log(`Next: sync from ${sourceBranch} worktree to pull changes`);
        } else {
          console.log(`Next: sync from main to merge ${currentBranch} → main`);
        }
      }
      
      return 0;

    } catch (error) {
      console.error('\n❌ Sync failed:', error instanceof Error ? error.message : error);
      console.error('\n🔧 Recovery options:');
      console.error('   • If merge conflicts: resolve conflicts, git add <files>, git commit');
      console.error('   • If autostash conflicts: run "git stash show -p" to see changes, then "git stash drop" or resolve manually');
      console.error('   • If worktree issues: see docs/GIT_WORKTREES.md for troubleshooting');
      console.error('   • If persistent issues: git status and git log --oneline -5 for diagnostics\n');
      return 1;
    }
  }

  private async runSafetyChecks(): Promise<void> {
    // Check if we're in a git repository
    try {
      this.execGit('rev-parse --git-dir');
    } catch {
      throw new Error('Not in a git repository. Run this script from within a git repository.');
    }

    // Check for uncommitted changes and inform user about autostash
    const status = this.execGit('status --porcelain').trim();
    if (status) {
      console.log('📦 Uncommitted changes detected - using autostash');
    }

    // Check if main branch exists
    const branches = this.execGit('branch --list').split('\n').map(b => b.replace(/^[\*\+]?\s*/, ''));
    
    if (!branches.includes(this.mainBranch)) {
      throw new Error(`Main branch '${this.mainBranch}' does not exist. Create it or specify correct branch with --main <branch>`);
    }

    // Validate worktree structure
    await this.validateWorktreeStructure();

    // Only show success message if there were warnings
    if (status) {
      console.log('✅ Ready to sync');
    }
  }

  private getCurrentBranch(): string {
    return this.execGit('branch --show-current').trim();
  }

  private async validateWorktreeStructure(): Promise<void> {
    // Get all worktrees using git worktree list
    const worktreeInfo = this.getWorktreeInfo();
    
    // For sync-all operations, ensure we have worktree branches to sync
    const currentBranch = this.getCurrentBranch();
    if (currentBranch === this.mainBranch && !this.targetBranch) {
      if (worktreeInfo.branches.length === 0) {
        throw new Error(
          `No worktree branches found. ` +
          `Create worktree branches (e.g., git checkout -b worktree1) and set up worktrees. ` +
          `See docs/GIT_WORKTREES.md for setup instructions.`
        );
      }
    }
  }

  private getWorktreeInfo(): { branches: string[], worktrees: Map<string, string> } {
    // Get all worktrees from git
    const worktreeOutput = this.execGit('worktree list --porcelain');
    const worktrees = this.parseWorktreeList(worktreeOutput);
    
    // Get all branches
    const branches = this.execGit('branch --list').split('\n')
      .map(b => b.replace(/^[\*\+]?\s*/, '').trim())
      .filter(b => b.length > 0);
    
    // Filter for worktree branches (matching pattern worktree[0-9]+)
    const worktreeBranches = branches.filter(b => /^worktree\d+$/.test(b));
    
    // Create a map of branch to worktree path
    const worktreeMap = new Map<string, string>();
    for (const wt of worktrees) {
      if (wt.branch && /^worktree\d+$/.test(wt.branch)) {
        worktreeMap.set(wt.branch, wt.path);
      }
    }
    
    return { branches: worktreeBranches, worktrees: worktreeMap };
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

  private determineSyncDirection(currentBranch: string): { sourceBranch: string; targetBranch: string } {
    if (currentBranch === this.mainBranch) {
      // From main: need to specify which branch to sync
      if (!this.targetBranch) {
        throw new Error(`When on main branch, specify which branch to sync: --branch <branch-name>`);
      }
      // Verify target branch exists
      const branches = this.execGit('branch --list').split('\n').map(b => b.replace(/^[\*\+]?\s*/, ''));
      if (!branches.includes(this.targetBranch)) {
        throw new Error(`Target branch '${this.targetBranch}' does not exist. Create it: git checkout -b ${this.targetBranch}`);
      }
      return { sourceBranch: this.targetBranch, targetBranch: this.mainBranch };
    } else {
      // From feature branch: sync main → current
      return { sourceBranch: this.mainBranch, targetBranch: currentBranch };
    }
  }

  private async syncAllWorktrees(): Promise<void> {
    console.log('🔄 Syncing all worktree branches with main...\n');
    
    // Get all worktree branches dynamically
    const worktreeInfo = this.getWorktreeInfo();
    const worktreeBranches = worktreeInfo.branches.sort(); // Sort for consistent ordering
    
    if (worktreeBranches.length === 0) {
      throw new Error('No worktree branches found to sync');
    }
    
    console.log(`Found ${worktreeBranches.length} worktree branches: ${worktreeBranches.join(', ')}\n`);
    
    for (const branch of worktreeBranches) {
      console.log(`🔀 ${branch} → main`);
      // will abort if there are conflicts
      await this.performOneDirectionMerge(branch, this.mainBranch);
    }
    
    console.log(`\n✅ Synced all ${worktreeBranches.length} worktrees to main`);
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}-${date.getDate().toString().padStart(2, '0')}`;
    const formattedTime = date.toLocaleTimeString('en-US', { hour12: false });
    console.log(`Synced at ${formattedDate} ${formattedTime}`);
    console.log('Next: run this script from each worktree to pull latest main');
  }


  private async performOneDirectionMerge(sourceBranch: string, targetBranch: string): Promise<void> {
    const currentBranch = this.getCurrentBranch();
    
    if (currentBranch === targetBranch) {
      // Use Git's built-in autostash to safely handle uncommitted changes
      // Git will stash changes before merge and reapply them afterward
      this.execGit(`merge --autostash ${sourceBranch}`, {
        errorMessage: `Merge conflicts during ${sourceBranch} → ${targetBranch}.`
      });
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