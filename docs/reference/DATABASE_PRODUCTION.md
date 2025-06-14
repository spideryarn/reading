# Production Database Access

**⚠️ READ-ONLY ACCESS ONLY**: Never run INSERT, UPDATE, DELETE, or DDL commands on production. Use for inspection and debugging only.

see:
- docs/reference/DATABASE_SCHEMA.md
- docs/reference/DATABASE_OVERVIEW.md
- docs/reference/DATABASE_MIGRATIONS.md
- docs/reference/DATABASE_LOCAL.md


## Essential Debugging Queries

**Check applied migrations:**
```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 10;
```

**Check ai_models table:**
```sql
SELECT provider, model_id, version, display_name FROM ai_models ORDER BY created_at DESC;
```

**Compare table schemas:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

## Use psql CLI for production database access

If `Supabase_remote` MCP unavailable, use credentials from `.env.prod`:

```bash
psql "postgresql://postgres.blsgjlrezruxcfdyrqpk:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres"
```


**⚠️ Critical**: Set `default_transaction_isolation = 'read committed'` and avoid any write operations.

Use a pager to avoid getting stuck in a shell.

