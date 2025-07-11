# PDF Extraction Deployment Guide for Vercel

## Overview

This guide covers the deployment requirements and configuration for the hybrid PDF image extraction system on Vercel. The system uses WebAssembly and pure JavaScript modules to avoid native dependency issues.

## Prerequisites

- Node.js 18.x or 20.x (Vercel runtime)
- Vercel Pro plan (for 5-minute timeout support)
- Supabase project with storage configured

## Environment Variables

### Required for Production

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Service Keys (at least one required)
MISTRAL_API_KEY=your-mistral-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key

# PDF Extraction Configuration (optional)
PDF_DIRECT_EXTRACTION=true
PDF_USE_NAPI_CANVAS=true
PDF_USE_WASM_FALLBACK=true
```

### Vercel-Specific Settings

```bash
# Automatically set by Vercel
VERCEL=1
VERCEL_ENV=production
VERCEL_URL=your-deployment-url
```

## Vercel Configuration

### vercel.json

```json
{
  "functions": {
    "app/api/upload-pdf/route.ts": {
      "maxDuration": 300
    },
    "app/api/test-pdf-wasm/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### Build Configuration

Ensure your `next.config.ts` includes:

```typescript
{
  serverExternalPackages: ['@napi-rs/canvas', 'imagescript'],
  typescript: {
    ignoreBuildErrors: false  // Enforce type checking
  }
}
```

## Storage Configuration

### Supabase Bucket Setup

1. Create a `documents` bucket in Supabase Storage
2. Configure allowed MIME types:
   ```
   - application/pdf
   - image/png
   - image/jpeg
   - image/webp
   ```
3. Set up folder structure:
   ```
   documents/
   ├── originals/       # Original PDF files
   └── extracted-images/ # Extracted image regions
   ```

### RLS Policies

The system uses service role authentication for server-side uploads. Ensure your RLS policies allow:
- Public read access to extracted images (if needed)
- No public write access (server-side only)

## Deployment Steps

### 1. Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Set environment variables
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add MISTRAL_API_KEY
# ... add other required vars
```

### 2. Deploy to Preview

```bash
# Deploy to preview environment
vercel

# Test PDF upload functionality
curl -X POST https://your-preview-url.vercel.app/api/test-pdf-wasm \
  -F "pdf=@test.pdf" \
  -F "method=auto"
```

### 3. Production Deployment

```bash
# Deploy to production
vercel --prod

# Verify deployment
vercel logs --follow
```

## Monitoring and Debugging

### Function Logs

Monitor PDF extraction in real-time:
```bash
vercel logs app/api/upload-pdf/route.ts --follow
```

### Key Metrics to Monitor

1. **Cold Start Time**
   - Target: < 3 seconds
   - Monitor: Function initialization logs

2. **Memory Usage**
   - Limit: 1024MB
   - Monitor: Function metrics dashboard

3. **Extraction Method Distribution**
   - Check `upload_metadata.extraction_stats` in database
   - Ideal: High percentage of direct extraction

4. **Error Rates**
   - Monitor error logs for specific patterns
   - Check correlation IDs for failed uploads

### Debug Mode

Enable detailed logging:
```typescript
// In extraction config
const config = {
  debug: process.env.NODE_ENV !== 'production',
  logLevel: process.env.LOG_LEVEL || 'info'
}
```

## Performance Optimization

### 1. Bundle Size Optimization

Monitor and optimize bundle sizes:
```bash
# Analyze bundle
npm run analyze

# Check function size
vercel inspect [deployment-url]
```

### 2. Caching Strategy

- Extracted images are cached via Supabase CDN
- Consider implementing Redis for extraction results
- Use Vercel Edge Config for feature flags

### 3. Extraction Method Tuning

Based on usage patterns, adjust defaults:
```javascript
// For academic PDFs with many embedded images
PDF_DIRECT_EXTRACTION=true
PDF_USE_NAPI_CANVAS=true
PDF_USE_WASM_FALLBACK=false

// For complex PDFs with vector graphics
PDF_DIRECT_EXTRACTION=false
PDF_USE_NAPI_CANVAS=true
PDF_USE_WASM_FALLBACK=true
```

## Troubleshooting

### Common Issues

1. **"Failed to load native binding"**
   - Ensure `@napi-rs/canvas` is in `serverExternalPackages`
   - Check Vercel build logs for bundling errors

2. **"mime type not supported"**
   - Verify Supabase bucket configuration
   - Check storage service role key is set

3. **Memory/Timeout Errors**
   - Reduce extraction scale factor
   - Enable single-page processing for large PDFs
   - Consider implementing streaming

4. **WASM Initialization Failures**
   - Check cold start logs
   - Verify WASM file is included in deployment
   - Monitor function size limits

### Emergency Rollback

If extraction fails in production:

1. **Quick Fix**: Disable specific methods
   ```bash
   vercel env add PDF_USE_WASM_FALLBACK false
   vercel redeploy
   ```

2. **Full Rollback**: Revert to previous deployment
   ```bash
   vercel rollback [previous-deployment-id]
   ```

## Testing Checklist

Before production deployment, verify:

- [ ] Direct extraction works for PDFs with embedded images
- [ ] @napi-rs/canvas fallback activates correctly
- [ ] WASM fallback works as last resort
- [ ] Extraction statistics are logged to metadata
- [ ] Error messages are user-friendly
- [ ] Memory usage stays within limits
- [ ] Cold start time is acceptable
- [ ] All three methods work on Vercel preview

## Security Considerations

1. **File Validation**
   - PDF header verification
   - File size limits enforced
   - Page count validation

2. **Resource Limits**
   - Maximum page dimensions
   - Processing timeouts
   - Memory caps per extraction

3. **Access Control**
   - Service role for server operations
   - Signed URLs for client access
   - No direct bucket access

## Related Documentation

- [PDF Image Extraction Architecture](./PDF_IMAGE_EXTRACTION_ARCHITECTURE.md)
- [Error Handling Patterns](./ERROR_HANDLING_PATTERNS.md)
- [Vercel Serverless Constraints](./VERCEL_SERVERLESS_CONSTRAINTS.md)
- [Pure JS PDF Processing Options](./PURE_JS_PDF_PROCESSING_OPTIONS.md)