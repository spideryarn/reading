# Database Migrations Guide

## Overview

Database schema changes are managed through Supabase migrations - timestamped SQL files that can be applied consistently across environments.

📖 **Related Documentation:**
- `docs/DATABASE_OVERVIEW.md`
- `docs/DATABASE_MODELS.md`
- `docs/SETUP.md` - How to start Supabase locally


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
# Create new migration (generates timestamped file)
npx supabase migration new add_user_preferences

# Apply all pending migrations
npx supabase db reset

# Check current migration status
npx supabase status

# Generate migration from schema diff (if making changes via Studio)
npx supabase db diff -f my_schema_changes

# Generate TypeScript types from current schema
npm run db:types

# Reset database and regenerate types in one command
npm run db:reset
```

## Migration Workflow

1. **Create migration**: `npx supabase migration new feature_name`
2. **Edit SQL file**: Add your schema changes in `supabase/migrations/[timestamp]_feature_name.sql`
3. **Apply locally**: `npm run db:reset` (resets DB, applies all migrations, and regenerates types)
4. **Verify types**: Check that `lib/types/database.ts` has been updated with your changes
5. **Test**: Verify changes work as expected in code with proper type safety
6. **Commit**: Include both the migration file and updated types in your git commit
7. **Deploy**: Push to production (future step)


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

- DO NOT MAKE large-scale, irreversible, destructive changes, e.g. dropping/truncating tables or deleting rows, UNLESS EXPLICITLY AGREED WITH THE USER.
- Do not try and apply to production, only operate in dev.


## TypeScript Type Generation

The project uses Supabase's type generation to create TypeScript types from the database schema. This ensures type safety when working with database queries.

### Type Generation Commands

```bash
# Generate types only (manual)
npm run db:types

# Reset database and generate types (recommended for testing schema changes)
npm run db:reset
```

### Generated Types Location

- **File**: `lib/types/database.ts`
- **Auto-generated**: This file is completely regenerated each time
- **Git tracking**: The types file should be committed to git
- **Helper types**: The file includes custom helper types and enums for easier usage

### When to Regenerate Types

- **Always after migrations**: Any schema change requires type regeneration
- **Before committing**: Ensure types match your schema changes
- **When types seem outdated**: If TypeScript errors suggest schema mismatches
- **After pulling changes**: If other developers have made schema changes

## Best Practices

### Essential Practices
- **Descriptive names**: `add_summaries_level_index` not `fix_stuff`
- **One feature per migration**: Keep changes focused and atomic
- **Always regenerate types**: Use `npm run db:reset` or `npm run db:types` after schema changes
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
