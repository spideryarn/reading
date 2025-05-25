# Database Guide

## Overview

Spideryarn Reading uses **Supabase** (PostgreSQL) with a relational schema designed for granular document decomposition. Each HTML element becomes a separate database row, enabling flexible querying, hierarchical summaries, and dynamic document reconstruction.

📖 **Related Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Database design decisions and rationale
- [SETUP.md](SETUP.md) - How to start Supabase locally
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current implementation status
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Complete schema details and security
- [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) - Migration workflow and commands


## Schema Overview

### **Core Table Structure**
- **`documents`** - Document metadata (`title`, `source_url`)
- **`document_elements`** - Each HTML element as separate row with hierarchy
- **`summaries`** - AI-generated summaries linked to elements

**Core design**: Granular HTML decomposition with self-referencing parent/child relationships


### **Key Design Principles**

- **Granular decomposition**: Each HTML element (`<h2>`, `<p>`, `<div>`) → separate row
- **Self-referencing hierarchy**: `parent_id` links to other `document_elements` 
- **Position preservation**: `position` field maintains document order
- **Flexible summaries**: AI summaries attached at multiple granularities


## Command-Line Access

### **Connect to Local Database**

```bash
# Start Supabase first
npx supabase start

# Connect via psql (custom port 54342)
psql postgres://postgres:postgres@localhost:54342/postgres

# Alternative: use Supabase CLI
npx supabase db shell
```

### **Useful Commands**

```bash
# Configure psql for better experience
\pset pager off        # Disable pager to avoid getting stuck in shell
\x auto               # Auto-format wide results

# View schema
\dt                    # List tables
\d+ document_elements  # Describe table structure

# Check migrations
\echo "Current migration status:"
SELECT * FROM supabase_migrations.schema_migrations;

# Sample queries (always use LIMIT to avoid overloading context)
SELECT COUNT(*) FROM document_elements;
SELECT tag_name, COUNT(*) FROM document_elements GROUP BY tag_name;
SELECT * FROM document_elements LIMIT 5;
SELECT * FROM documents LIMIT 3;
```

### **Database URLs**

| Service | URL | Usage |
|---------|-----|-------|
| **Database** | `postgres://postgres:postgres@localhost:54342/postgres` | psql, SQL clients |
| **API** | `http://localhost:54341` | REST API calls |
| **Studio** | `http://localhost:54343` | Web UI for browsing data |


## Data Flow Examples

### **Document Parsing Pipeline**
```
HTML Document
    ↓ (DocumentParser + Cheerio)
DocumentElement[] objects  
    ↓ (Supabase insert)
Database rows with relationships
```

### **Summary Generation**
```
document_elements (by section/chapter)
    ↓ (Claude API)
summaries table (linked via element_id)
    ↓ (Frontend query)
Hierarchical summary UI
```

### **Document Reconstruction**
```sql
-- Get document in order (use LIMIT for large documents)
SELECT * FROM document_elements 
WHERE document_id = $1 
ORDER BY position
LIMIT 100;

-- Get children of element  
SELECT * FROM document_elements 
WHERE parent_id = $1 
ORDER BY position
LIMIT 50;

-- Get summaries for section
SELECT s.* FROM summaries s
JOIN document_elements e ON s.element_id = e.id
WHERE e.tag_name = 'h2' AND e.content LIKE '%Introduction%'
LIMIT 10;
```


## Security Summary

**Current Status**: Wide open for development
- **RLS enabled** on all tables but with anonymous access policies
- **Read/insert allowed**, UPDATE/DELETE blocked
- **Future**: User-scoped policies when authentication is added

see `docs/DATABASE_SCHEMA.md` for more info