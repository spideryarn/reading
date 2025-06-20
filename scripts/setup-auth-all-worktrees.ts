#!/usr/bin/env npx tsx

/**
 * Setup Authentication for All Worktrees
 * 
 * This script sets up Playwright authentication in all worktree environments.
 * Useful after database resets or when setting up a new development environment.
 * 
 * Usage:
 *   ./scripts/setup-auth-all-worktrees.ts
 *   
 * Requirements:
 *   - Must be run from main repository directory
 *   - All worktrees must have correct .env.test configuration
 *   - Local Supabase must be running with test users seeded
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { Command, Cli } from 'clipanion';

interface WorktreeInfo {
  name: string;
  path: string;
  port: number;
  testUser: string;
}

class SetupAuthAllWorktreesCommand extends Command {
  static paths = [Command.Default];
  
  static usage = Command.Usage({
    description: 'Setup Playwright authentication in all worktree environments',
    details: `
      This command sets up authentication for browser automation across all Git worktrees.
      
      It will:
      1. Detect all worktree directories
      2. Validate environment configuration in each
      3. Run Playwright auth setup in each worktree
      4. Report results and any failures
      
      Use this after database resets or when setting up new development environments.
    `,
  });

  async execute(): Promise<number> {
    console.log('🔧 Setting up Playwright authentication for all worktrees...\n');

    // Validate we're in the main repository
    if (!this.validateMainRepository()) {
      return 1;
    }

    // Detect worktrees
    const worktrees = this.detectWorktrees();
    if (worktrees.length === 0) {
      console.log('ℹ️  No worktrees detected. Only main repository exists.');
      return 0;
    }

    console.log(`📋 Detected ${worktrees.length + 1} environments (main + ${worktrees.length} worktrees):\n`);
    
    // Include main in the list
    const allEnvironments = [
      { name: 'main', path: '.', port: 3000, testUser: 'hello@spideryarn.com' },
      ...worktrees
    ];

    allEnvironments.forEach(env => {
      console.log(`   ${env.name.padEnd(10)} → ${env.path.padEnd(25)} → ${env.testUser} (port ${env.port})`);
    });
    console.log();

    // Setup auth in each environment
    const results = [];
    for (const env of allEnvironments) {
      console.log(`🔑 Setting up authentication for ${env.name}...`);
      const result = await this.setupAuthInEnvironment(env);
      results.push({ environment: env.name, ...result });
      
      if (result.success) {
        console.log(`✅ ${env.name} authentication setup completed\n`);
      } else {
        console.log(`❌ ${env.name} authentication setup failed: ${result.error}\n`);
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`📊 Summary: ${successful}/${results.length} environments configured successfully`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed environments:');
      failed.forEach(f => {
        console.log(`   ${f.environment}: ${f.error}`);
      });
      return 1;
    }

    console.log('\n🎉 All environments configured successfully! Browser automation is ready.');
    return 0;
  }

  private validateMainRepository(): boolean {
    // Check if we're in the main repository by looking for expected files
    const requiredFiles = ['package.json', 'playwright.config.ts', 'tests/e2e/auth.setup.ts'];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        console.error(`❌ Error: Required file '${file}' not found.`);
        console.error('   This script must be run from the main repository directory.');
        return false;
      }
    }

    return true;
  }

  private detectWorktrees(): WorktreeInfo[] {
    const worktrees: WorktreeInfo[] = [];
    const expectedWorktrees = ['reading-worktree1', 'reading-worktree2', 'reading-worktree3', 
                               'reading-worktree4', 'reading-worktree5', 'reading-worktree6'];

    for (let i = 1; i <= 6; i++) {
      const worktreeName = `reading-worktree${i}`;
      const worktreePath = `../${worktreeName}`;
      
      if (existsSync(worktreePath) && existsSync(`${worktreePath}/package.json`)) {
        worktrees.push({
          name: `worktree${i}`,
          path: worktreePath,
          port: 3000 + i,
          testUser: `test-user${i}@spideryarn.com`
        });
      }
    }

    return worktrees;
  }

  private async setupAuthInEnvironment(env: WorktreeInfo): Promise<{ success: boolean; error?: string }> {
    try {
      // Change to the environment directory
      const originalCwd = process.cwd();
      process.chdir(env.path);

      try {
        // Check if required files exist
        if (!existsSync('.env.test')) {
          return { success: false, error: '.env.test file not found' };
        }

        // Run the auth setup
        execSync('npm run test:e2e:setup', {
          stdio: 'pipe', // Capture output instead of inheriting
          timeout: 60000 // 60 second timeout
        });

        return { success: true };

      } finally {
        // Always restore original working directory
        process.chdir(originalCwd);
      }

    } catch (error) {
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        // Extract meaningful error from execSync
        if ('stdout' in error) {
          const stdout = (error as any).stdout?.toString() || '';
          const stderr = (error as any).stderr?.toString() || '';
          errorMessage = stderr || stdout || error.message;
        } else {
          errorMessage = error.message;
        }
      }

      return { success: false, error: errorMessage.trim() };
    }
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Spideryarn Auth Setup',
  binaryName: 'setup-auth-all-worktrees',
  binaryVersion: '1.0.0',
});

cli.register(SetupAuthAllWorktreesCommand);

// Run the CLI
cli.runExit(process.argv.slice(2));

export { SetupAuthAllWorktreesCommand };