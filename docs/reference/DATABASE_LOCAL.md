# Local Database Access

see:
- docs/reference/DATABASE_SCHEMA.md
- docs/reference/DATABASE_OVERVIEW.md
- docs/reference/DATABASE_MIGRATIONS.md
- docs/reference/DATABASE_PRODUCTION.md

## Starting Supabase

Use the optimized npm scripts for better performance and battery life:

```bash
# Start with minimal services (recommended)
npm run supabase:start

# Start with all services (if you need email/analytics)
npm run supabase:start:full

# Check status
npm run supabase:status

# Stop when done
npm run supabase:stop
```

**Performance Note**: The minimal start excludes analytics (Logflare), vector (logging aggregator), and inbucket (email testing), reducing container count from 11 to ~7-8 for improved battery life.


## Primary Access Method

Use the `Supabase_local` MCP tool for database queries:

```sql
-- Example queries via MCP
SELECT * FROM documents ORDER BY created_at DESC LIMIT 5;
SELECT provider, model_id FROM ai_models;
```


## Fallback: psql CLI

If MCP unavailable or if you need to make changes, use `psql` with connection string from `.env.local`:

```bash
# Extract DATABASE_URL from .env.local
grep DATABASE_URL .env.local

# Connect using the URL
psql "postgresql://postgres:[password]@127.0.0.1:54322/postgres"
```

**Local development note**: Default Supabase local port is 54322.

Use a pager to avoid getting stuck in a shell.