# Local Database Access

see:
- docs/reference/DATABASE_SCHEMA.md
- docs/reference/DATABASE_OVERVIEW.md
- docs/reference/DATABASE_MIGRATIONS.md
- docs/reference/DATABASE_PRODUCTION.md


## Primary Access Method

Use the `Supabase_local` MCP tool for database queries:

```sql
-- Example queries via MCP
SELECT * FROM documents ORDER BY created_at DESC LIMIT 5;
SELECT provider, model_id FROM ai_models;
```


## Fallback: psql CLI

If MCP unavailable, use `psql` with connection string from `.env.local`:

```bash
# Extract DATABASE_URL from .env.local
grep DATABASE_URL .env.local

# Connect using the URL
psql "postgresql://postgres:[password]@127.0.0.1:54322/postgres"
```

**Local development note**: Default Supabase local port is 54322.

Use a pager to avoid getting stuck in a shell.