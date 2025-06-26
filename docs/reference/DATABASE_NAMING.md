# Database Naming Conventions

Standardised naming conventions for database tables, columns, indexes, and constraints in the Spideryarn Reading project using Supabase/PostgreSQL.

## See also

- `docs/reference/DATABASE_SCHEMA.md` - Complete database schema reference
- `docs/reference/DATABASE_MIGRATIONS.md` - Migration workflow and best practices
- `docs/reference/DATABASE_OVERVIEW.md` - High-level database architecture
- [Supabase Official Documentation](https://supabase.com/docs/guides/database/tables) - Official table and column naming guidance
- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html) - Underlying PostgreSQL identifier rules

## Core Principles

Based on official Supabase documentation and PostgreSQL best practices:

1. **Use lowercase with underscores** (snake_case) for all identifiers
2. **Tables use plural nouns** (e.g., `documents`, `users`, `ai_calls`)
3. **Columns use singular nouns** (e.g., `title`, `content`, `created_at`)
4. **Keep names under 63 characters** (PostgreSQL limit)
5. **Avoid SQL reserved words** as identifiers
6. **Be descriptive but concise** for clarity and maintenance

## Table Naming Conventions

### Primary Tables
Use **plural nouns** describing the entities stored:

✅ **Good Examples**:
- `users` - User account records
- `documents` - Document content and metadata
- `ai_calls` - AI API call tracking
- `profiles` - User profile information

❌ **Avoid**:
- `user`, `document` (singular forms)
- `UserAccounts`, `DocumentData` (camelCase or compound words)

### Junction/Relationship Tables
For many-to-many relationships, use **descriptive plural nouns** or **combined entity names**:

✅ **Preferred Pattern - Descriptive**:
- `document_users` - User relationships to documents
- `user_permissions` - User access permissions
- `document_shares` - Document sharing records

✅ **Alternative Pattern - Combined**:
- `user_documents` - Alternative naming for document-user relationships

❌ **Avoid**:
- `documents_users_junction` (overly verbose)
- `doc_user` (abbreviated)

## Column Naming Conventions

### Primary Keys
- Always use `id` for primary key columns
- Type: `UUID DEFAULT gen_random_uuid()`

### Foreign Keys
Pattern: `{referenced_table_singular}_id`

✅ **Examples**:
- `user_id` - References `users` table
- `document_id` - References `documents` table
- `ai_call_id` - References `ai_calls` table

### Standard Column Types

**Timestamps**:
- `created_at` - Record creation time
- `updated_at` - Last modification time
- `deleted_at` - Soft deletion time (if used)
- Type: `TIMESTAMPTZ DEFAULT NOW()`

**Text Content**:
- `title`, `content`, `description` - Descriptive text fields
- `background` - User background information
- Type: `TEXT` for variable length content

**JSONB Fields**:
- `metadata` - Structured document metadata
- `extra` - Additional flexible data
- `preferences` - User settings and preferences
- Type: `JSONB` for better performance than `JSON`

**Boolean Fields**:
- `is_public` - Document visibility
- `is_active` - Record status
- Type: `BOOLEAN` with appropriate defaults

## Index Naming Conventions

Pattern: `idx_{table_name}_{column_name(s)}`

✅ **Examples**:
```sql
-- Single column index
CREATE INDEX idx_documents_user_id ON documents (user_id);

-- Multi-column index  
CREATE INDEX idx_ai_calls_document_user ON ai_calls (document_id, user_id);

-- Unique index
CREATE UNIQUE INDEX idx_users_email_unique ON users (email);

-- Partial index
CREATE INDEX idx_documents_public_created ON documents (created_at) 
WHERE is_public = true;
```

## Constraint Naming Conventions

### Foreign Key Constraints
Pattern: `fk_{table}_{referenced_table}`

✅ **Examples**:
```sql
CONSTRAINT fk_documents_users 
    FOREIGN KEY (created_by) REFERENCES users (id)

CONSTRAINT fk_document_users_documents 
    FOREIGN KEY (document_id) REFERENCES documents (id)
```

### Unique Constraints  
Pattern: `uq_{table}_{column(s)}`

✅ **Examples**:
```sql
CONSTRAINT uq_users_email UNIQUE (email)
CONSTRAINT uq_document_users_pair UNIQUE (document_id, user_id)
```

### Check Constraints
Pattern: `ck_{table}_{description}`

✅ **Examples**:
```sql
CONSTRAINT ck_documents_word_count_positive 
    CHECK (word_count >= 0)

CONSTRAINT ck_document_users_valid_permission 
    CHECK (permission_level IN ('read', 'write', 'admin'))
```

## Junction Table Best Practices

For document-user relationships, follow this recommended pattern:

```sql
CREATE TABLE document_users (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    background TEXT DEFAULT '',
    extra JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, document_id)
);

-- Indexes
CREATE INDEX idx_document_users_user_id ON document_users (user_id);
CREATE INDEX idx_document_users_document_id ON document_users (document_id);

-- RLS
ALTER TABLE document_users ENABLE ROW LEVEL SECURITY;
```

### Key Design Decisions

1. **Composite Primary Key**: `(user_id, document_id)` ensures one relationship per user-document pair
2. **Cascade Deletion**: Maintains referential integrity when users or documents are deleted
3. **JSONB Extra Field**: Provides flexibility for future enhancements without schema changes
4. **Standard Timestamps**: Consistent with other tables for audit trails

## Current Schema Compliance

The existing Spideryarn Reading schema follows these conventions:

✅ **Compliant Tables**:
- `documents` - Proper plural noun
- `ai_calls` - Descriptive plural with underscore
- `document_enhancements` - Clear relationship naming
- `chat_threads`, `chat_messages` - Consistent pattern

✅ **Compliant Columns**:
- `created_at`, `updated_at` - Standard timestamps
- `user_id`, `document_id` - Proper foreign key naming
- `is_public` - Clear boolean naming

## Common Patterns to Avoid

❌ **Inconsistent Casing**:
- `DocumentUsers` (PascalCase)
- `documentUsers` (camelCase)  

❌ **Abbreviations**:
- `doc_usr` instead of `document_users`
- `usr_id` instead of `user_id`

❌ **Reserved Words**:
- `order` (use `orders` for table, `order_number` for column)
- `user` (use `users` for table)

❌ **Overly Long Names**:
- `document_user_relationship_management_table`

## Migration Naming

Migration files follow the pattern: `YYYYMMDDHHMMSS_descriptive_name.sql`

✅ **Examples**:
- `20250625120000_add_document_users_table.sql`
- `20250625120100_add_document_users_rls_policies.sql`

---

*Status: ✅ **Implemented** - Active naming conventions for all new database objects*  
*Last updated: 25 June 2025*