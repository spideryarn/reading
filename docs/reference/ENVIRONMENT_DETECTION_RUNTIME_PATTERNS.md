# Environment Detection

Environment-aware error handling that distinguishes between local development and cloud/production environments to provide appropriate behavior for platform-specific limitations.

## See also

- `lib/utils/environment.ts` - Core environment detection implementation
- `lib/services/storage.ts` - Environment-aware storage error handling
- `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` - Storage RLS policies and environment limitations
- `docs/reference/TESTING_DATABASE.md` - Related database environment patterns

## Key Principles

- **Fail appropriately by environment**: Expected limitations in local development should not surface as user-facing errors
- **No masked production issues**: Real problems in cloud environments must surface as clear error messages
- **Environment-specific logging**: Provide context-appropriate debugging information

## Environment Detection Logic

### Detection Method
```typescript
interface EnvironmentInfo {
  nodeEnv: 'development' | 'production' | 'test'
  isLocalSupabase: boolean           // localhost:54321 URLs
  isCloudEnvironment: boolean        // !isLocalSupabase OR production
  expectStorageRLS: boolean          // Whether storage RLS should work
  showStorageErrors: boolean         // Whether to show storage errors to users
}
```

**Detection Pattern**:
- **Local Supabase**: URLs containing `localhost` or `127.0.0.1`
- **Cloud Environment**: Production NODE_ENV OR non-localhost Supabase URL
- **Feature Availability**: Determine which capabilities should work in each environment

### Usage Pattern
```typescript
import { detectEnvironment, shouldThrowStorageError, getStorageErrorMessage } from '@/lib/utils/environment'

if (shouldThrowStorageError(error.message)) {
  throw new StorageError(getStorageErrorMessage(error.message))
} else {
  console.warn(`Storage upload failed (expected in local development): ${error.message}`)
  return null // Graceful degradation
}
```

## Environment-Aware Error Handling ✓

### Core Pattern
Different environments have different capabilities. The environment detection system allows graceful handling of expected limitations while surfacing real problems.

**Example: Storage Operations**
- **Local Development**: Some storage features don't work (known limitation) → log warnings, continue processing
- **Cloud/Production**: Storage failures indicate real problems → throw user-friendly errors

**Implementation Pattern**:
```typescript
if (shouldThrowStorageError(error.message)) {
  throw new ServiceError(getStorageErrorMessage(error.message))
} else {
  console.warn(`Service limitation in local development: ${error.message}`)
  return null // Graceful degradation
}
```

See `docs/reference/DATABASE_SUPABASE_STORAGE_REFERENCE.md` for specific storage RLS implementation details.

## Error Handling Patterns

### Local Development
```typescript
// Expected behavior: Service limitation, continue with core functionality
console.warn('Service limitation in local development: feature not available')
// Core functionality continues, optional features gracefully degrade
```

### Cloud/Production
```typescript
// Unexpected behavior: Surface to user with helpful message
throw new ServiceError('Service temporarily unavailable. Please contact support if this persists.')
```


## Limitations & Gotchas

**Security Considerations**:
- Uses `NEXT_PUBLIC_SUPABASE_URL` for client-side detection
- Could be spoofed for non-security-critical decisions
- Server-side validation recommended for security-critical logic

**URL Pattern Limitations**:
- Simple string matching (`includes('localhost')`)
- Doesn't handle self-hosted Supabase instances
- Could be enhanced with regex patterns for robustness

**Assumption Dependencies**:
- Assumes cloud environments have full feature availability
- Cloud environments could also have service issues (maintenance, misconfiguration)
- Consider capability-based testing for production robustness

## Future Enhancements 📋

**Server-Side Detection**:
- Move security-critical detection away from `NEXT_PUBLIC_` variables
- Use server-only environment variables for sensitive decisions

**Capability Testing**:
- Test actual service capabilities rather than assuming based on environment
- Runtime validation of feature availability

**Enhanced URL Patterns**:
- More robust regex-based URL pattern matching
- Support for self-hosted Supabase instances
- Validation that URLs are actually Supabase endpoints