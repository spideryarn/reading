# Database Migrations Guide

## Overview

Database schema changes are managed through Supabase migrations - timestamped SQL files that can be applied consistently across environments.

📖 **Related Documentation:**
- `docs/reference/DATABASE_OVERVIEW.md`
- `docs/reference/DATABASE_SCHEMA.md`
- `docs/reference/SETUP_DEVELOPMENT_ENVIRONMENT.md` - How to start Supabase locally
- `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md` - Production deployment with GitHub Actions migration automation


## File Structure
```
supabase/
├── config.toml                    # Supabase configuration
├── migrations/                    # All migration files
│   └── 20240101000000_create_documents_schema.sql
└── seed.sql                       # Optional seed data
```


## Migration Commands

```bash
# Start Supabase first (required for migrations)
npm run supabase:start

# Create new migration (generates timestamped file)
npx supabase migration new add_user_preferences

# Apply new migrations to local database (RECOMMENDED)
npx supabase db push --local

# Apply new migrations to remote database
npx supabase db push

# Preview migrations without applying them
npx supabase db push --local --dry-run

# DO NOT RUN `npx supabase db reset` or `npm run db:reset:DANGEROUS` (resets entire database)

# Check current migration status
npm run supabase:status

# Generate migration from schema diff (if making changes via Studio)
npx supabase db diff -f my_schema_changes

# Generate TypeScript types from current schema
npm run db:types
```

## Migration Workflow

1. **Start Supabase**: `npm run supabase:start` (if not already running)
2. **Create migration**: `npx supabase migration new feature_name`
3. **Edit SQL file**: Add your schema changes in `supabase/migrations/[timestamp]_feature_name.sql`
4. **Apply locally**: `npx supabase db push --local` (applies new migrations only)
5. **IMPORTANT**: Ask user for explicit permission before applying migrations


## Migration File Format

```sql
-- Migration: 20240101000001_add_user_preferences.sql
-- Description: Add user preferences table

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Always include indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```


## IMPORTANT RULES - always err on the side of caution

**Only run migrations with explicit user permission (or as part of a planning document)**

- **NEVER run database operations without explicit user permission** - this includes migrations, resets, pushes, or any schema changes
- **PRODUCTION AWARENESS**: Any operation that could affect production data or systems requires extra caution and explicit permission
- DO NOT MAKE large-scale, irreversible, destructive changes, e.g. dropping/truncating tables or deleting rows, UNLESS EXPLICITLY AGREED WITH THE USER
- Do not try and apply to production, only operate in dev
- **When in doubt, ask first** - if you're unsure whether an operation requires permission, always ask the user

## ⚠️ CRITICAL: RLS Policy Considerations

Before creating ANY new table or modifying existing tables:
1. **STOP and discuss RLS requirements with the user** - Who should access this data?
2. Consider access patterns: owners only, admins, public access, anonymous access
3. Plan RLS policies BEFORE writing the migration
4. Include RLS policies in the same migration as table creation
5. Test policies with real RLS testing framework (`lib/testing/rls-database-test-utils.ts`)
6. Document the security model in `docs/reference/DATABASE_SECURITY.md`

**RLS Checklist for New Tables:**
- [ ] Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- [ ] Define policies for SELECT, INSERT, UPDATE, DELETE operations
- [ ] Include admin bypass in policies where appropriate
- [ ] Add indexes for columns used in RLS policy conditions
- [ ] Write comprehensive RLS tests
- [ ] Update security documentation

See `docs/planning/finished/250618a_database_rls_security_comprehensive_review.md` for detailed RLS implementation patterns.


## TypeScript Type Generation

The project uses Supabase's type generation to create TypeScript types from the database schema. This ensures type safety when working with database queries.

### Type Generation Commands

```bash
# Generate types only (manual)
npm run db:types
```

### Generated Types Location

- **Auto-generated file**: `lib/types/database-auto-generated.ts` - Completely regenerated each time
- **Manual extensions**: `lib/types/database-extensions.ts` - Hand-written type utilities and aliases
- **Git tracking**: Both files should be committed to git
- **Usage**: Import from `database-extensions.ts` for enhanced developer experience

### When to Regenerate Types

- **Always after migrations**: Any schema change requires type regeneration
- **Before committing**: Ensure types match your schema changes
- **When types seem outdated**: If TypeScript errors suggest schema mismatches
- **After pulling changes**: If other developers have made schema changes

## Best Practices

### Essential Practices
- **Descriptive names**: `add_summaries_level_index` not `fix_stuff`
- **One feature per migration**: Keep changes focused and atomic
- **Always regenerate types**: Use `npm run db:types` after schema changes
- **Commit types with migrations**: Include both migration files and updated types in the same commit

### File Naming Requirements
- **Precise format**: `YYYYMMDDHHmmss_description.sql` (note casing)
- **UTC time only**: Ensures consistent ordering across environments
- **Short descriptions**: Keep migration names concise but descriptive

### Documentation Standards
- **Header comments**: Include purpose, affected tables, and special considerations
- **Explain destructive operations**: Add detailed comments for drops, truncates, or major alterations (though first see the note above about getting explicit agreement from the user first!)
- **Rollback instructions**: Document how to reverse the migration if needed


## Common Migration Patterns

### Adding a Table
```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns here
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Don't forget indexes
CREATE INDEX idx_new_table_foreign_key ON new_table(foreign_key_id);
```

### Adding a Column
```sql
ALTER TABLE existing_table 
ADD COLUMN new_column TEXT DEFAULT 'default_value';
```

### Adding Row Level Security
```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name" ON new_table 
FOR SELECT USING (true);  -- Adjust condition as needed
```


## Important Limitations & Gotchas

- **Public schema only**: CLI user can only modify public schema
- **No managed flow**: Non-public schemas require manual migration management
- **Avoid `supabase db commit`**: The auto-diffing tool is unreliable and can break schemas
- **RLS policies affect tests**: When testing with anon keys, ensure appropriate policies exist
- **Environment variables in tests**: Use `@next/env` loadEnvConfig for proper Next.js integration
- **⚠️ Storage RLS policy restrictions**: Migrations cannot directly modify RLS policies on `storage.objects` table due to permission restrictions. Use application-layer security during development, or create policies through Supabase Studio/API after migration.

## Troubleshooting Migration Issues

### Migration History Mismatch
**Symptom**: `Remote migration versions not found in local migrations directory`

**Common Cause**: Orphaned migrations on production not in local git repository

**Solution**: Use migration repair commands:
```bash
# Mark problematic migration as reverted (replace VERSION with actual migration)
npx supabase migration repair --status reverted VERSION

# Then push pending local migrations
npx supabase db push
```

**Prevention**: All migrations should be committed to git before applying to production

For GitHub Actions deployment troubleshooting, see `docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md`.

## Migration History

### 20250531235026_comprehensive_storage_schema.sql

**Purpose**: Complete database schema implementation for document storage, AI tracking, and chat functionality

**Major Changes**:
- Created 7 core tables: `ai_models`, `documents`, `ai_calls`, `document_enhancements`, `chat_threads`, `chat_messages`, `profiles`
- Enabled MODDATETIME extension for automatic `updated_at` timestamps
- Implemented comprehensive indexes for performance
- Added Row Level Security (RLS) on all tables
- Pre-seeded AI models data (Claude and Gemini models)

**Key Features**:
- **Document storage**: Full HTML and plaintext in database (not Supabase Storage)
- **AI tracking**: Comprehensive token usage, costs, and response metadata
- **Enhancement types**: Summaries, headings, glossaries, tweet threads
- **Chat support**: Thread-based conversations linked to documents
- **Real-time ready**: All tables configured for Supabase Realtime

**Testing Notes**:
- 13/16 tests passing
- Known issues with RLS policies affecting certain operations
- Requires service role key for some administrative operations
- Run tests with: `node -r dotenv/config ./node_modules/.bin/jest --testPathPattern=database-schema -- dotenv_config_path=.env.local`

**References**:
- Planning: `docs/planning/finished/250531a_database_storage_implementation.md`

### 20250602005754_add_documents_slug_column.sql

**Purpose**: Add slug column to documents table for improved routing performance

**Major Changes**:
- Added `slug` column to `documents` table (TEXT, NOT NULL, UNIQUE)
- Pre-populated slug values for existing example documents
- Added unique constraint `documents_slug_unique` to prevent duplicates
- Created performance index `idx_documents_slug` for fast lookups
- Added column documentation comment

**Performance Impact**:
- Enables direct database lookups by slug instead of fetching all documents and filtering in memory
- Significantly improves routing performance for document access
- Scales much better with increasing document count

**Code Changes Required**:
- Updated `DocumentService.getBySlug()` method for direct slug lookups
- Modified document page routes to use new slug-based database queries
- Application still generates slugs client-side when creating documents

**Migration Strategy**:
- Non-destructive: only adds new column and constraints
- Backward compatible: existing code continues to work
- Pre-populated known documents with appropriate slug values

**Future Enhancements**:
- Could add database triggers for automatic slug generation
- Could implement slug conflict resolution for duplicate titles
- Could add slug validation rules at database level

### 20250603211615_add_mock_system_user.sql

**Purpose**: Add system user for development and testing with document ownership

**Major Changes**:
- Created mock system user with UUID `00000000-0000-0000-0000-000000000001`
- Added to `auth.users` table for authentication system compatibility
- Enables document ownership tracking during development phase
- Provides foundation for future real authentication integration

### 20250603211716_add_automatic_profile_creation_trigger.sql

**Purpose**: Automatic profile creation when new users sign up

**Major Changes**:
- Added database trigger for automatic profile creation
- Ensures every authenticated user has a corresponding profile record
- Maintains data consistency between auth and application layers

### 20250606000001_storage_bucket_and_policies.sql

**Purpose**: Set up Supabase Storage for PDF document storage

**Major Changes**:
- Created `documents` storage bucket for original file storage
- Configured bucket settings: private, 50MB limit, specific MIME types allowed
- Attempted RLS policy creation (failed due to permission restrictions)
- Documented storage security approach in planning documents

**Storage Configuration**:
- **Bucket**: `documents` (private)
- **File Size Limit**: 50MB
- **Allowed Types**: PDF, DOC, DOCX, HTML, TXT
- **Path Structure**: `{document-uuid}/original/{filename}`

**Security Implementation**:
- RLS policies could not be created via migration due to permission restrictions
- Using application-layer security with service role key during development
- Future RLS policies documented in `docs/reference/DATABASE_SECURITY.md`

**Integration Points**:
- Documents table `storage_path` field references stored files
- `lib/services/storage.ts` provides storage utility functions
- API endpoints handle upload/download with proper access control

**References**:
- Planning: `docs/planning/finished/250606a_pdf_Supabase_Storage_integration.md`
- Storage docs: `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md`
- Security: `docs/reference/DATABASE_SECURITY.md`
