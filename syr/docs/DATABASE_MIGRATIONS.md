# Database Migrations Guide

## Overview

Database schema changes are managed through Supabase migrations - timestamped SQL files that can be applied consistently across environments.

📖 **Related Documentation:**
- [DATABASE_OVERVIEW.md](DATABASE_OVERVIEW.md) - Main database documentation
- [SETUP.md](SETUP.md) - How to start Supabase locally

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

## Best Practices

- **Descriptive names**: `add_summaries_level_index` not `fix_stuff`
- **One feature per migration**: Keep changes focused and atomic
- **Include rollback strategy**: Comment how to undo if needed
- **Test locally first**: Always run `npx supabase db reset` before committing

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

