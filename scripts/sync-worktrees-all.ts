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
 * Options:
 * --ignore-dirty    Skip worktrees with uncommitted changes (default: false)
 * 
 * See also:
 * - docs/GIT_WORKTREES.md - Complete worktree setup and workflow documentation
 * - scripts/sync-worktrees.ts - The underlying sync script this wrapper calls
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, basename } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const ignoreDirty = args.includes('--ignore-dirty');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execInDirectory(directory: string, command: string): { success: boolean; output?: string; error?: string } {
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

function isWorktreeDirty(worktreePath: string): boolean {
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

async function main() {
  log('🔄 Sync All Worktrees - Boomerang Mode', colors.bright);
  if (ignoreDirty) {
    log('   Option: --ignore-dirty (skipping dirty worktrees)', colors.yellow);
  }
  
  // Get current directory (should be main)
  const currentDir = process.cwd();
  const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  
  if (currentBranch !== 'main') {
    log(`\n❌ Error: This script should be run from the main branch.`, colors.red);
    log(`   Current branch: ${currentBranch}`, colors.red);
    log(`   Please switch to main branch and try again.`, colors.red);
    process.exit(1);
  }
  
  // Get all worktrees
  const worktreeOutput = execSync('git worktree list --porcelain', { encoding: 'utf8' });
  const worktrees = parseWorktreeList(worktreeOutput);
  
  // Filter for worktree branches and main
  const worktreePaths = worktrees
    .filter(wt => wt.branch && /^(worktree\d+|main)$/.test(wt.branch))
    .sort((a, b) => {
      // Put main first, then sort worktrees numerically
      if (a.branch === 'main') return -1;
      if (b.branch === 'main') return 1;
      return a.branch!.localeCompare(b.branch!);
    });
  
  const worktreeOnlyPaths = worktreePaths.filter(wt => wt.branch !== 'main');
  
  if (worktreeOnlyPaths.length === 0) {
    log(`\n❌ No worktree branches found.`, colors.red);
    process.exit(1);
  }
  
  log(`\nFound ${worktreeOnlyPaths.length} worktrees:`, colors.cyan);
  
  // Check dirty status if needed
  let cleanWorktrees = worktreeOnlyPaths;
  const dirtyWorktrees: typeof worktreeOnlyPaths = [];
  
  if (ignoreDirty) {
    cleanWorktrees = [];
    for (const wt of worktreeOnlyPaths) {
      const isDirty = isWorktreeDirty(wt.path);
      if (isDirty) {
        dirtyWorktrees.push(wt);
        log(`  • ${wt.branch} → ${wt.path} (⚠️  dirty - skipping)`, colors.yellow);
      } else {
        cleanWorktrees.push(wt);
        log(`  • ${wt.branch} → ${wt.path}`, colors.green);
      }
    }
    
    if (cleanWorktrees.length === 0) {
      log(`\n⚠️  All worktrees are dirty. No branches to sync.`, colors.yellow);
      log(`   Use without --ignore-dirty to sync anyway.`, colors.yellow);
      process.exit(0);
    }
  } else {
    worktreeOnlyPaths.forEach(wt => {
      log(`  • ${wt.branch} → ${wt.path}`);
    });
  }
  
  // Step 1: Sync all worktrees to main (from main)
  log(`\n📥 Step 1: Collecting changes from all worktrees...`, colors.bright);
  log(`   Running from: ${currentDir}\n`);
  
  // Build command with specific branches if ignoring dirty ones
  let syncCommand = './scripts/sync-worktrees.ts';
  if (ignoreDirty && cleanWorktrees.length < worktreeOnlyPaths.length) {
    // Need to sync specific branches only
    for (const wt of cleanWorktrees) {
      log(`   Syncing ${wt.branch}...`);
      const branchResult = execInDirectory(currentDir, `./scripts/sync-worktrees.ts --branch ${wt.branch}`);
      if (!branchResult.success) {
        log(`\n❌ Failed to sync ${wt.branch} to main:`, colors.red);
        log(branchResult.error || 'Unknown error', colors.red);
        if (branchResult.output) {
          log(`\nOutput:`, colors.yellow);
          console.log(branchResult.output);
        }
        log(`\n🔧 Fix the issues above and try again.`, colors.yellow);
        process.exit(1);
      }
      if (branchResult.output) {
        console.log(branchResult.output);
      }
    }
  } else {
    // Sync all branches
    const step1Result = execInDirectory(currentDir, syncCommand);
    
    if (!step1Result.success) {
      log(`\n❌ Failed to sync worktrees to main:`, colors.red);
      log(step1Result.error || 'Unknown error', colors.red);
      if (step1Result.output) {
        log(`\nOutput:`, colors.yellow);
        console.log(step1Result.output);
      }
      log(`\n🔧 Fix the issues above and try again.`, colors.yellow);
      process.exit(1);
    }
    
    if (step1Result.output) {
      console.log(step1Result.output);
    }
  }
  
  // Step 2: Go to each worktree and pull from main
  log(`\n📤 Step 2: Distributing main to all worktrees...`, colors.bright);
  
  let allSuccess = true;
  const results: Array<{ branch: string; success: boolean; error?: string; skipped?: boolean }> = [];
  
  // If ignoring dirty, add skipped results for dirty worktrees
  if (ignoreDirty) {
    for (const wt of dirtyWorktrees) {
      results.push({ branch: wt.branch!, success: true, skipped: true });
    }
  }
  
  // Only sync clean worktrees
  const worktreesToSync = ignoreDirty ? cleanWorktrees : worktreeOnlyPaths;
  
  for (const worktree of worktreesToSync) {
    log(`\n🔀 Syncing ${worktree.branch}...`, colors.cyan);
    log(`   Going to: ${worktree.path}`);
    
    const syncScriptPath = resolve(worktree.path, 'scripts/sync-worktrees.ts');
    
    if (!existsSync(syncScriptPath)) {
      log(`   ⚠️  Script not found at ${syncScriptPath}`, colors.yellow);
      results.push({ branch: worktree.branch!, success: false, error: 'Script not found' });
      allSuccess = false;
      continue;
    }
    
    const result = execInDirectory(worktree.path, './scripts/sync-worktrees.ts');
    
    if (result.success) {
      log(`   ✅ Synced successfully`, colors.green);
      if (result.output) {
        // Show the output but indent it
        console.log(result.output.split('\n').map(line => '      ' + line).join('\n'));
      }
      results.push({ branch: worktree.branch!, success: true });
    } else {
      log(`   ❌ Sync failed`, colors.red);
      if (result.error) {
        log(`   Error: ${result.error}`, colors.red);
      }
      if (result.output) {
        console.log(result.output.split('\n').map(line => '      ' + line).join('\n'));
      }
      results.push({ branch: worktree.branch!, success: false, error: result.error });
      allSuccess = false;
    }
  }
  
  // Final summary
  log(`\n${'='.repeat(50)}`, colors.bright);
  log(`🏁 Sync Complete - Boomerang Returned!`, colors.bright);
  log(`${'='.repeat(50)}\n`, colors.bright);
  
  const successCount = results.filter(r => r.success).length;
  log(`Summary: ${successCount}/${results.length} worktrees synced successfully\n`);
  
  results.forEach(result => {
    let icon, color, suffix;
    if (result.skipped) {
      icon = '⏭️';
      color = colors.yellow;
      suffix = ' (skipped - dirty)';
    } else if (result.success) {
      icon = '✅';
      color = colors.green;
      suffix = '';
    } else {
      icon = '❌';
      color = colors.red;
      suffix = result.error ? ': ' + result.error : '';
    }
    log(`  ${icon} ${result.branch}${suffix}`, color);
  });
  
  if (!allSuccess) {
    log(`\n⚠️  Some worktrees failed to sync.`, colors.yellow);
    log(`   Check the errors above and resolve any merge conflicts.`, colors.yellow);
    log(`   Then run the sync script manually in those worktrees.`, colors.yellow);
    process.exit(1);
  } else {
    log(`\n🎉 All worktrees are now in sync!`, colors.green);
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}-${date.getDate().toString().padStart(2, '0')}`;
    const formattedTime = date.toLocaleTimeString('en-US', { hour12: false });
    log(`   Completed at ${formattedDate} ${formattedTime}`, colors.cyan);
  }
}

function parseWorktreeList(output: string): Array<{ path: string, branch: string | null }> {
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

// Run the script
main().catch(error => {
  log(`\n❌ Unexpected error:`, colors.red);
  console.error(error);
  process.exit(1);
});