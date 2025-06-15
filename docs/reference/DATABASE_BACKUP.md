# Database Backup

Comprehensive guide to database backup strategies for the Spideryarn Reading project, including coverage analysis, limitations, and recommendations.

## Status

✅ Implemented (basic pg_dump backup)  
⚠️ Incomplete (missing storage backup, restoration testing)  
Last updated: 2025-06-15

## See Also

- `scripts/backup-database.ts` - Main backup script implementation
- `docs/reference/DATABASE_OVERVIEW.md` - Database architecture
- `docs/reference/DATABASE_SCHEMA.md` - Schema documentation
- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)

## Overview

The project uses a multi-layered backup strategy:

1. **Primary**: Supabase automatic nightly backups (midnight daily)
2. **Secondary**: Local pg_dump backups via `scripts/backup-database.ts`
3. **Missing**: Storage bucket file backups (not implemented)

## Current Backup Script

### Usage

```bash
# Local database backup
npm run db:backup .env.local

# Production backup
npm run db:backup .env.prod

# Direct script usage
./scripts/backup-database.ts .env.local
```

### What's Included

Our current pg_dump backup includes:

- ✅ All schemas (public, auth, storage, supabase_migrations, etc.)
- ✅ All tables and their data
- ✅ Row Level Security (RLS) policy definitions
- ✅ Custom functions and triggers
- ✅ Indexes and constraints
- ✅ User accounts (auth.users table)
- ✅ Encrypted passwords (bcrypt hashes in auth.users.encrypted_password)

### What's NOT Included

Critical gaps in our backup coverage:

1. **Storage Files** 🚨
   - **The Problem**: When users upload PDFs or documents to Supabase Storage, the actual files are stored separately from the database
   - **What we backup**: Only the storage.objects table (metadata like filename, size, created date)
   - **What we DON'T backup**: The actual PDF/document files themselves
   - **Impact**: If we restored from backup, all document metadata would exist but the files would return 404 errors
   - **Example**: User uploads "research-paper.pdf" → Database has a record of it → But the actual PDF file is NOT in our backup

2. **Secrets and Environment Variables**
   - Database connection strings
   - API keys
   - OAuth credentials

3. **Edge Functions** (if used)
   - Function code and configuration
   - Deployment settings

4. **Realtime Configuration**
   - Channel subscriptions
   - Webhook endpoints

## Storage Backup Challenge

### The Core Issue

**Supabase Storage is like AWS S3** - it's a separate file storage system, not part of the PostgreSQL database. Think of it this way:

- **Database** (what pg_dump backs up): Tables with information ABOUT files
- **Storage** (what we're missing): The actual PDF/document files themselves

It's like having a library catalog (database) without the actual books (storage files).

### Why This Matters for Spideryarn

Users upload documents (PDFs, Word docs, etc.) which are:
1. Stored as files in Supabase Storage buckets
2. Referenced in the database (filename, user_id, upload_date, etc.)

If we only backup the database, we have the references but not the files. After a restore, users would see their document list but get errors when trying to open them.

### Current Situation

- Supabase Storage API has no bulk download endpoint (unlike AWS S3 sync)
- Must implement custom solution to list and download files individually
- No official CLI command for storage backup (feature requested: [Issue #363](https://github.com/supabase/storage/issues/363))
- This is a known limitation affecting all Supabase users

### Potential Implementation

```typescript
// Conceptual approach (not implemented)
async function backupStorage(bucketName: string) {
  // 1. List all files in the bucket
  const { data: files } = await supabase.storage
    .from(bucketName)
    .list('', { limit: 1000, recursive: true });
    
  // 2. Download each file individually (inefficient but necessary)
  for (const file of files) {
    const { data } = await supabase.storage
      .from(bucketName)
      .download(file.name);
    // Save to local filesystem with same path structure
    await fs.writeFile(`backup/storage/${bucketName}/${file.name}`, data);
  }
}
```

### Real-World Impact

Without storage backup:
- ❌ Complete disaster recovery impossible
- ❌ Can't migrate to another provider
- ❌ Can't restore user's uploaded documents
- ❌ Testing with production data incomplete

## Authentication & Password Security

### Password Storage

- Passwords are stored as bcrypt hashes in `auth.users.encrypted_password`
- These hashes ARE included in pg_dump backups
- Security implications:
  - Hashes cannot be reversed to plaintext
  - Still secure even if backup is compromised
  - Can be restored and users can log in normally

### Common Misconception

The search revealed that Supabase does NOT exclude passwords from backups. The confusion comes from:
- Custom role passwords being excluded (not user passwords)
- The column name `encrypted_password` (actually hashed, not encrypted)

## pg_dump vs Supabase CLI

### Current Approach: pg_dump

Advantages:
- Direct, simple, well-understood
- Full control over options
- Works with standard PostgreSQL tools

Disadvantages:
- May encounter permission issues with some Supabase internals
- No special handling of Supabase-specific features
- Includes all schemas (even those better handled by Supabase)

### Alternative: Supabase CLI

```bash
supabase db dump --db-url "$DATABASE_URL"
```

Advantages:
- Excludes Supabase-managed schemas by default
- Better permission handling
- Migration-aware (can do incremental dumps)

Disadvantages:
- Excludes data by default (need --data-only=false)
- Less familiar to PostgreSQL users
- Requires Supabase CLI installation

## Restoration Process

### Basic Database Restoration

```bash
# Local development
psql "postgresql://postgres:postgres@localhost:54342/postgres" < backup.sql

# Production (handle with extreme care!)
psql "$DATABASE_URL" < backup.sql
```

### Complete Restoration Checklist

1. **Pre-restoration**
   - [ ] Verify backup file integrity
   - [ ] Test on staging environment first
   - [ ] Notify users of maintenance

2. **Database Restoration**
   - [ ] Drop existing database (if full restore)
   - [ ] Restore from pg_dump file
   - [ ] Verify table counts match
   - [ ] Test RLS policies

3. **Storage Restoration**
   - [ ] Upload files to storage buckets
   - [ ] Verify file accessibility
   - [ ] Update any signed URLs

4. **Post-restoration**
   - [ ] Reset custom role passwords (if any)
   - [ ] Verify authentication works
   - [ ] Test application functionality
   - [ ] Monitor error logs

## Unresolved Questions

1. **Storage Backup Priority**: How critical are stored documents? Should we implement storage backup immediately?

2. **Backup Retention**: How long should we keep backups? Current script overwrites without versioning.

3. **Restoration Testing**: Have we ever tested a full restoration? Should be done quarterly.

4. **Compliance**: Are there regulatory requirements for backup retention/encryption?

## Recommendations

### Immediate Actions

1. **Test Restoration** 🚨
   - Create test database
   - Attempt full restoration
   - Document any issues

2. **Implement Storage Backup**
   - Add to backup script
   - Consider third-party tools like rclone

3. **Add Backup Validation**
   - Check file size is reasonable
   - Verify critical tables exist
   - Test sample queries

### Medium-term Improvements

1. **Switch to Supabase CLI**
   - Better integration with Supabase features
   - Fewer permission issues
   - Official support

2. **Automated Backup Testing**
   - Weekly restoration to test environment
   - Automated verification scripts
   - Alert on failures

3. **Backup Encryption**
   - Encrypt backups at rest
   - Secure key management
   - Compliance documentation

### Long-term Considerations

1. **Point-in-Time Recovery**
   - Enable WAL archiving
   - Continuous backup strategy
   - Reduce data loss window

2. **Geo-redundant Backups**
   - Multiple region storage
   - Disaster recovery plan
   - Regular DR drills

## Current Backup Locations

- **Supabase Dashboard**: Nightly at midnight (primary)
- **Local Backups**: `backup/db/` directory (git-ignored)
- **Format**: `yyMMdd_HHmm_<env>_database_backup.sql`

## Security Notes

- Never commit backup files to Git
- Encrypt backups containing production data
- Limit access to backup files
- Rotate credentials after any suspected compromise
- Be aware that backups contain password hashes (though secure)

## Monitoring & Alerts

Currently no monitoring in place. Consider:
- Alert if nightly Supabase backup fails
- Monitor backup file sizes for anomalies
- Track restoration test results
- Log backup script executions