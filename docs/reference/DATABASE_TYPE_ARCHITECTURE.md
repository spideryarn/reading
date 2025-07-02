# Database Type Architecture

This document explains the database type system architecture in the Spideryarn Reading project.

## File Structure

### `lib/types/database-auto-generated.ts` 
**⚠️ AUTO-GENERATED - DO NOT EDIT**

- Contains types generated directly from the Supabase schema
- Completely overwritten by `npm run db:types` 
- Includes raw `Database`, `Tables`, `TablesInsert`, `TablesUpdate` types
- Should never be edited manually as changes will be lost

### `lib/types/database-extensions.ts`
**✅ SAFE TO EDIT**

- Contains manual type extensions and convenience aliases
- Re-exports all types from `database-auto-generated.ts`
- Provides developer-friendly type aliases (e.g., `Document`, `Profile`)
- Includes enum-like union types for string fields
- This is where manual database type additions should go

## Import Patterns

### ✅ Recommended (Import from extensions)
```typescript
import type { 
  Document, 
  DocumentInsert, 
  Profile, 
  AiCall, 
  EnhancementType 
} from '@/lib/types/database-extensions'
```

### ❌ Avoid (Direct import from auto-generated)
```typescript
import type { Database } from '@/lib/types/database-auto-generated'
```

### ✅ Raw schema access (when needed)
```typescript
import type { Tables } from '@/lib/types/database-extensions'
type CustomType = Tables<'some_table'>
```

## Type Categories

### Auto-Generated Types
- `Database` - Full schema structure
- `Tables<TableName>` - Table row types
- `TablesInsert<TableName>` - Insert payload types  
- `TablesUpdate<TableName>` - Update payload types
- `Json` - JSONB field type

### Manual Extensions
- `Document`, `DocumentInsert`, `DocumentUpdate` - Document table types
- `Profile`, `ProfileInsert`, `ProfileUpdate` - Profile table types
- `AiCall`, `ChatMessage`, `ChatThread` - Other convenience types
- `EnhancementType`, `CallStatus`, `MessageRole` - Enum-like unions

## Development Workflow

### Adding New Types
1. **For auto-generated types**: Modify database schema, run `npm run db:types`
2. **For convenience types**: Add to `database-extensions.ts`
3. **For enum types**: Add union types to `database-extensions.ts`

### Type Generation
```bash
npm run db:types  # Safely overwrites database-auto-generated.ts
```

### When Types Are Generated
- When running `npm run dev` (includes type generation)
- When running `npm run db:types` manually
- During database migrations

## Best Practices

1. **Always import from `database-extensions.ts`** for better developer experience
2. **Never edit `database-auto-generated.ts`** - changes will be lost
3. **Add convenience types to `database-extensions.ts`** when needed
4. **Use descriptive type aliases** rather than raw `Tables<'table_name'>`
5. **Keep enum-like types in sync** with actual database values

## Migration from Legacy Pattern

Previously, manual types were added directly to `database.ts`, which caused:
- Lost types when auto-generation ran
- Confusion about which parts were auto-generated
- AI agents accidentally editing auto-generated code

The new pattern solves these issues by:
- Clear file naming (`-auto-generated` suffix)
- Separate files for auto-generated vs manual types
- Explicit warnings in auto-generated files
- Better import patterns for developers

## File Purpose Summary

| File | Purpose | Can Edit? | Regenerated? |
|------|---------|-----------|--------------|
| `database-auto-generated.ts` | Raw schema types | ❌ No | ✅ Yes |
| `database-extensions.ts` | Manual utilities | ✅ Yes | ❌ No |

Import from `database-extensions.ts` for the best development experience.