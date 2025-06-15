#!/usr/bin/env npx tsx

import { Cli, Command, Option, UsageError } from 'clipanion';
import { config } from 'dotenv';
import { resolve, basename } from 'path';
import { existsSync, mkdirSync, statSync } from 'fs';
import { execSync } from 'child_process';

class BackupDatabaseCommand extends Command {
  static paths = [['backup-database'], Command.Default];
  
  static usage = Command.Usage({
    description: 'Create a timestamped backup of a database using pg_dump',
    details: `
      This script creates database backups in the backup/db directory.
      It reads database connection details from the specified environment file.
      
      The environment file must contain:
      - DATABASE_URL: Full PostgreSQL connection string
      
      Backups are saved with format: yyMMdd_HHmm_<env>_database_backup.sql
      where <env> is derived from the environment filename (e.g., 'local', 'prod', 'test')
    `,
    examples: [
      ['Local database backup', 'backup-database.ts .env.local'],
      ['Production backup', 'backup-database.ts .env.prod'],
      ['Test database backup', 'backup-database.ts .env.test'],
    ],
  });

  envFile = Option.String({
    required: true,
  });

  async execute(): Promise<number> {
    try {
      // Ensure we're running from project root
      if (!existsSync('.git')) {
        throw new UsageError(
          'This script must be run from the project root directory (where .git folder is located)'
        );
      }

      // Validate environment file exists
      if (!existsSync(this.envFile)) {
        throw new UsageError(`Environment file not found: ${this.envFile}`);
      }

      // Clear any existing DATABASE_URL from environment to ensure we're using the file's value
      const previousDatabaseUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // Load environment variables from specified file
      const envPath = resolve(process.cwd(), this.envFile);
      const result = config({ path: envPath });
      
      if (result.error) {
        throw new UsageError(`Failed to load environment file: ${result.error.message}`);
      }

      // Get database URL
      const databaseUrl = process.env.DATABASE_URL;
      
      // Verify the variable was actually set by the env file
      if (!databaseUrl) {
        throw new UsageError(
          `Environment file ${this.envFile} must set DATABASE_URL`
        );
      }

      // Double-check it wasn't inherited from previous environment
      if (databaseUrl === previousDatabaseUrl) {
        throw new UsageError(
          `DATABASE_URL appears to be inherited from environment, not set by ${this.envFile}`
        );
      }

      // Create backup directory if it doesn't exist
      const backupDir = 'backup/db';
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      // Extract environment name from filename (e.g., .env.local -> local)
      const envName = basename(this.envFile).replace(/^\.env\.?/, '') || 'default';
      
      // Generate timestamp
      const now = new Date();
      const timestamp = now.toISOString()
        .slice(2, 16) // Extract yy-mm-dd hh:mm
        .replace(/[-:]/g, '') // Remove separators
        .replace(' ', '_')
        .replace('T', '_');
      
      const backupFile = `${backupDir}/${timestamp}_${envName}_database_backup.sql`;
      const logFile = `${backupFile}.log`;

      console.log('🔄 Starting database backup...');
      console.log(`📁 Environment: ${this.envFile}`);
      console.log(`📁 Backup directory: ${backupDir}`);
      console.log(`🕐 Timestamp: ${timestamp}`);

      // Create the backup using pg_dump
      try {
        execSync(
          `pg_dump "${process.env.DATABASE_URL}" ` +
          `--clean ` +
          `--if-exists ` +
          `--create ` +
          `--no-owner ` +
          `--no-privileges ` +
          `--verbose ` +
          `> "${backupFile}" 2> "${logFile}"`,
          { 
            stdio: 'inherit',
            shell: true
          }
        );
      } catch (error) {
        console.error(`\n❌ Backup failed! Check ${logFile} for details`);
        console.error('\n🔧 Recovery options:');
        console.error('   • Verify database is running: supabase status');
        console.error('   • Check DATABASE_URL in your .env file');
        console.error('   • Ensure pg_dump is installed: which pg_dump');
        console.error(`   • View error log: cat ${logFile}\n`);
        return 1;
      }

      // Get file size
      const stats = statSync(backupFile);
      const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

      console.log('\n✅ Backup completed successfully!');
      console.log(`📄 Backup file: ${backupFile}`);
      console.log(`📊 File size: ${fileSizeMB} MB`);

      // Remove log file on success
      try {
        execSync(`rm -f "${logFile}"`);
      } catch {
        // Ignore cleanup errors
      }

      // Show recent backups
      console.log('\n📚 Recent backups:');
      try {
        const recentBackups = execSync(
          `ls -lht "${backupDir}"/*.sql 2>/dev/null | head -5 | awk '{print "   " $9 " (" $5 ")"}'`,
          { encoding: 'utf8' }
        ).trim();
        console.log(recentBackups);
      } catch {
        console.log('   (no other backups found)');
      }

      // Restoration instructions
      console.log('\n💡 To restore from this backup:');
      console.log(`   psql "${process.env.DATABASE_URL}" < ${backupFile}`);
      console.log('\n   Or for a fresh database:');
      console.log(`   createdb new_database`);
      console.log(`   psql "postgresql://user:pass@host/new_database" < ${backupFile}`);
      console.log('\n   For Supabase local development:');
      console.log(`   psql "postgresql://postgres:postgres@localhost:54342/postgres" < ${backupFile}`);
      
      // Final output - remind user of what was created
      console.log('\n✨ Backup complete:');
      console.log(`   ${backupFile}`);

      return 0;
    } catch (error) {
      if (error instanceof UsageError) {
        throw error;
      }
      
      // Unexpected error
      console.error('\n❌ Unexpected error:', error.message);
      console.error('\nStack trace:', error.stack);
      return 1;
    }
  }
}

// CLI setup
const cli = new Cli({
  binaryLabel: 'Database Backup',
  binaryName: 'backup-database',
  binaryVersion: '1.0.0',
});

cli.register(BackupDatabaseCommand);
cli.runExit(process.argv.slice(2));