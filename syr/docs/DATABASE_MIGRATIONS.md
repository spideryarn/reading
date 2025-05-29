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
```

## Migration Workflow

1. **Create migration**: `npx supabase migration new feature_name`
2. **Edit SQL file**: Add your schema changes in `supabase/migrations/[timestamp]_feature_name.sql`
3. **Apply locally**: `npx supabase db reset` (resets DB and applies all migrations)
4. **Test**: Verify changes work as expected
5. **Deploy**: Push to production (future step)


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


## Best Practices

### Essential Practices
- **Descriptive names**: `add_summaries_level_index` not `fix_stuff`
- **One feature per migration**: Keep changes focused and atomic

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
