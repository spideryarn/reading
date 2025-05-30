# Database Guide

> ⚠️ **OUT OF DATE** - This documentation is very much in progress and may not reflect the current implementation. Database architecture is evolving rapidly during early development.

## Overview

Spideryarn Reading's database is in transition. The current implementation uses a decomposed element storage approach (each HTML element as a row), but the architecture has been updated to use single-row document storage for the MVP.

**Current State**: Code still implements decomposed elements approach
**Target State**: Single-row document storage per `ARCHITECTURE.md`

📖 **Related Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Updated database design decisions (single-row approach)
- [SETUP.md](SETUP.md) - How to start Supabase locally
- [PROJECT_STATUS.md](PROJECT_STATUS.md) - Current implementation status
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Schema details (needs updating)
- [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) - Migration workflow and commands

## Current Schema (To Be Updated)

### **Existing Table Structure**
- **`documents`** - Document metadata (`title`, `source_url`)
- **`document_elements`** - Each HTML element as separate row (deprecated approach)
- **`summaries`** - AI-generated summaries linked to elements

### **Target Schema (Per ARCHITECTURE.md)**
- **`documents`** - Document metadata + full HTML content
- **`document_enhancements`** - AI-generated content (summaries, glossaries, headings) as JSONB
- No element decomposition - transformations done in-memory

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
\d+ documents         # Describe table structure

# Check migrations
SELECT * FROM supabase_migrations.schema_migrations;

# Sample queries
SELECT COUNT(*) FROM documents;
SELECT title, source_url FROM documents LIMIT 5;
```

### **Database URLs**

| Service | URL | Usage |
|---------|-----|-------|
| **Database** | `postgres://postgres:postgres@localhost:54342/postgres` | psql, SQL clients |
| **API** | `http://localhost:54341` | REST API calls |
| **Studio** | `http://localhost:54343` | Web UI for browsing data |

## Data Flow

### **Current Implementation**
```
HTML Document
    ↓ (DocumentParser + Cheerio)
DocumentElement[] objects  
    ↓ (Not yet connected to DB)
In-memory element tree for UI
```

### **Target Implementation**
```
HTML Document
    ↓ (Store as single row)
documents table (with HTML content)
    ↓ (AI processing)
document_enhancements table (JSONB)
    ↓ (In-memory transformation)
UI components with enhanced content
```

## Security Summary

**Current Status**: Development mode
- **RLS enabled** but with permissive policies for anonymous access
- **Future**: User-scoped policies when authentication is added

## Migration Status

The database schema needs to be migrated from the decomposed elements approach to the single-row storage approach. This involves:
1. Adding `content` field to `documents` table
2. Creating `document_enhancements` table
3. Eventually removing `document_elements` and `summaries` tables

see `docs/ARCHITECTURE.md` for the rationale behind this change