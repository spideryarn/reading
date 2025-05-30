# Database Schema Reference

> ⚠️ **OUT OF DATE** - This documentation is very much in progress and may not reflect the current implementation. Database architecture is evolving rapidly during early development.

## Overview

This document describes both the current (deprecated) schema and the target schema for Spideryarn Reading. The project is transitioning from a decomposed element storage approach to a simpler single-row document storage.

📖 **Related Documentation:**
- [DATABASE_OVERVIEW.md](DATABASE_OVERVIEW.md) - High-level database guide
- [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md) - Migration workflow
- [ARCHITECTURE.md](ARCHITECTURE.md) - Design decisions explaining the schema change

## Current Schema (To Be Deprecated)

### **`documents`** - Document Metadata
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`document_elements`** - HTML Decomposition (Deprecated Approach)
```sql
CREATE TABLE document_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES document_elements(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  content TEXT,
  attributes JSONB DEFAULT '{}',
  position INT NOT NULL,
  level INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **`summaries`** - AI Summaries (Deprecated Approach)
```sql
CREATE TABLE summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id UUID NOT NULL REFERENCES document_elements(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  granularity TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Target Schema (Per ARCHITECTURE.md)

### **`documents`** - Enhanced Document Storage
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_url TEXT,
  content TEXT NOT NULL,  -- Full HTML content (NEW)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Changes**: Added `content` field to store full HTML document

### **`document_enhancements`** - AI-Generated Content (NEW)
```sql
CREATE TABLE document_enhancements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'summary', 'glossary', 'headings', etc.
  content JSONB NOT NULL,  -- Flexible storage for different enhancement types
  metadata JSONB DEFAULT '{}',  -- Additional info (model used, parameters, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, type)  -- One enhancement of each type per document
);
```

**Purpose**: Store all AI-generated enhancements in a flexible JSONB format

## Schema Transition Plan

1. **Phase 1** (Current): Both schemas exist, code uses old approach
2. **Phase 2**: Add new fields/tables, update code to use new approach
3. **Phase 3**: Migrate existing data (if any) to new format
4. **Phase 4**: Drop deprecated tables

## Indexes

### Current Indexes
```sql
CREATE INDEX idx_document_elements_document_id ON document_elements(document_id);
CREATE INDEX idx_document_elements_parent_id ON document_elements(parent_id);
CREATE INDEX idx_document_elements_position ON document_elements(document_id, position);
CREATE INDEX idx_summaries_element_id ON summaries(element_id);
```

### Target Indexes
```sql
CREATE INDEX idx_document_enhancements_document_id ON document_enhancements(document_id);
CREATE INDEX idx_document_enhancements_type ON document_enhancements(document_id, type);
```

## Row Level Security

Currently using permissive policies for development:

```sql
-- Allow anonymous read/insert for development
CREATE POLICY "Allow anonymous read" ON documents FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON documents FOR INSERT WITH CHECK (true);
```

Future: User-scoped policies when authentication is implemented

## Migration Notes

The transition from decomposed elements to single-row storage is motivated by:
- Simplicity for MVP development
- Better performance for document-wide transformations
- Easier caching and enhancement management
- Reduced database complexity

see `docs/ARCHITECTURE.md` for detailed rationale