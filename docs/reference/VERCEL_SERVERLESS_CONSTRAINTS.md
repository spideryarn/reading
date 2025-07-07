# Vercel Serverless Constraints and Limitations

---
Research Date: 2025-06-24
Documentation Date: 2025-06-24
Research Method: Parallel web research using Vercel docs and community sources
Review Date: 2025-12-24
Status: Current
Related Documents: docs/planning/finished/250613e_Vercel_deployment_initial_setup.md, docs/reference/SETUP_DEPLOYMENT_PRODUCTION.md
---

This document provides comprehensive coverage of Vercel serverless platform constraints that affect library selection, architecture decisions, and deployment strategies for the Spideryarn Reading application.

## Executive Summary

Vercel's serverless platform imposes specific technical constraints that developers must consider when choosing libraries and designing applications. Key limitations include a 50MB function size limit, 4.5MB payload restrictions, execution timeouts, and restrictions on native dependencies. However, with proper architecture and library selection, these constraints are manageable for most applications.

**Current Project Status**: ✅ **COMPLIANT** - Spideryarn Reading (~10.5MB total bundle) operates well within all Vercel constraints.

## Core Vercel Serverless Constraints

### Function Size Limits

#### **50MB Bundle Size Limit** 🚨 **CRITICAL**
- **Impact**: Total function bundle (code + dependencies + assets) cannot exceed 50MB
- **Applies to**: All serverless functions, including API routes
- **Calculation**: Includes all imported libraries, fonts, and bundled files
- **Common causes**: Large dependencies like canvas (164MB), sharp (16MB), or multiple heavy libraries

#### **250MB Unzipped Limit**
- **Impact**: Maximum uncompressed function size during execution
- **Less common**: Usually hit only with extremely large applications or data processing

### Memory and CPU Allocation

#### **Memory Limits by Plan**
- **Hobby Plan**: 1024 MB (0.6 vCPU) - fixed allocation
- **Pro/Enterprise**: 1769 MB (1 vCPU) default, upgradeable to 3009 MB (1.7 vCPU) with Fluid Compute

#### **Concurrency Limits**
- **Hobby/Pro**: Auto-scales up to 30,000 concurrent executions
- **Enterprise**: 100,000+ concurrent executions

### Execution Time Constraints

#### **Timeout Limits**
- **Free/Hobby**: 10 seconds maximum execution time
- **Pro**: 15 seconds default (configurable up to 5 minutes for traditional serverless)
- **Fluid Compute**: Up to 14 minutes (Pro/Enterprise)
- **Maximum**: 800 seconds (13.3 minutes) with Fluid Compute on Pro/Enterprise

### Payload and Request Limits

#### **Request/Response Body Size**
- **Standard limit**: 4.5MB maximum payload size **per request body coming _into_ the Function _or_ response body sent _back_ to the client**
- **Important distinction**: the limit is enforced **only on the HTTP boundary between the client and the Vercel Function**.  Once inside the function you can `fetch()` or stream much larger files (e.g. from Supabase Storage) with no size restriction.
- **Workarounds**:
  - **Large _uploads_**: cannot be bypassed by streaming; upload the file directly to a storage provider (Supabase Storage, Vercel Blob, S3, etc.) and pass lightweight metadata to the Function.
  - **Large _responses_**: can be bypassed by returning a streaming response (`ReadableStream`) which removes the 4.5 MB cap.
- **Impact**: API routes that proxy file uploads must adopt a direct-to-storage pattern; heavy server-side processing (e.g. downloading a 20 MB PDF and forwarding it to an external ML API) is safe as long as the payload back to the browser stays under the limit or is streamed.

#### **Environment Variables**
- **Total limit**: 64KB for all environment variables combined per deployment
- **Individual limit**: No single variable can exceed 64KB

### Filesystem Constraints

#### **Read-Only Filesystem**
- **Restriction**: Functions have read-only filesystem except for `/tmp`
- **Writable space**: `/tmp` directory with 500MB limit
- **Persistence**: `/tmp` content not guaranteed between invocations
- **Archive limit**: 100MB maximum filesystem archive at build time

## Edge Runtime vs Node.js Runtime

### Edge Runtime Constraints (More Restrictive)

#### **Size and Performance**
- **Function size**: 4MB limit (even on Enterprise)
- **Timeout**: 30 seconds maximum for all plans
- **Runtime**: Lightweight V8 engine, no MicroVM overhead

#### **Network Limitations**
- **No outbound TCP**: Cannot connect to Redis, direct database connections in VPC
- **HTTP only**: Limited to HTTP/HTTPS outbound requests
- **Streaming**: Supported with active data transmission

### Node.js Runtime (Standard Serverless)

#### **More Permissive**
- **Function size**: 50MB limit
- **Timeout**: Up to 5 minutes (traditional) or 14 minutes (Fluid Compute)
- **Network**: Full TCP/UDP support, database connections, Redis, etc.
- **Compatibility**: Full Node.js API support

## Library and Dependency Restrictions

### Forbidden/Problematic Packages

#### **Native Dependencies** 🚨 **HIGH RISK**
- **Problem**: Packages requiring compilation (node-gyp) often fail
- **Examples**: canvas, sharp, native image processors
- **Symptoms**: Works locally but fails on deployment
- **Detection**: Look for packages with binary components or compilation steps

#### **Known Problematic Libraries**
```typescript
// High-risk packages for bundle size
canvas              // 164MB uncompressed, 42MB compressed
sharp               // 16MB uncompressed, 6MB compressed
pdfjs-dist          // With canvas dependency causes build failures
puppeteer           // Large Chromium bundle
playwright          // Large browser bundles

// Packages that often cause native dependency issues
sqlite3             // Native binary
bcrypt              // Native crypto implementation (use bcryptjs instead)
node-sass           // Native compilation (use sass instead)
```

#### **Safe Alternatives**
```typescript
// Safe alternatives for common needs
bcryptjs            // Instead of bcrypt
sass                // Instead of node-sass
@vercel/blob        // For file storage instead of filesystem
cheerio             // For HTML parsing instead of jsdom (when possible)
```

### Package Installation Strategies

#### **Production Dependencies Only**
```bash
# Vercel automatically excludes devDependencies
npm install --only=production
yarn install --production
```

#### **Bundle Size Optimization**
```javascript
// next.config.js - Exclude packages from bundling
module.exports = {
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./excluded-package/**/*']
    }
  }
}
```

## Regional and Performance Constraints

### Regional Deployment Limits
- **Pro Plan**: Deploy to up to 3 regions
- **Enterprise**: Deploy to up to 18 regions
- **Failure behavior**: Deployment fails before build step if region limit exceeded

### Cold Start Considerations
- **Traditional serverless**: Cold starts for infrequently accessed functions
- **Fluid Compute**: Optimized for reduced cold starts with shared instances
- **Mitigation**: Keep functions warm with regular pings (if needed)

## Database and External Service Constraints

### Connection Limitations
- **Connection pooling**: Essential for serverless due to high concurrency
- **Supabase integration**: Vercel-Supabase integration includes connection management
- **VPC limitations**: Edge Runtime cannot connect to private VPCs

### Authentication and Security
- **JWT tokens**: Stateless authentication preferred over sessions
- **Environment variables**: Store all secrets in Vercel environment variables
- **HTTPS only**: All external connections must use HTTPS

## Spideryarn Reading Specific Analysis

### Current Bundle Analysis ✅
- **Total deployment size**: ~10.5MB (well under 50MB limit)
- **Client bundle**: ~3.1MB
- **Server bundle**: ~7.4MB
- **Risk level**: **LOW** - substantial headroom available

#### **Analysis Methodology** (for future re-evaluation)
The bundle size estimates above were generated using the following analysis approach:

```bash
# 1. Build the application and analyze output
npm run build

# 2. Check .next directory size (contains built application)
du -sh .next/
# Result: ~10.5MB total

# 3. Analyze static assets specifically
du -sh .next/static/
# Result: ~3.1MB (client-side assets)

# 4. Check server-side bundle size
du -sh .next/server/
# Result: ~7.4MB (API routes and server components)

# 5. Verify large dependencies with du analysis
du -sh node_modules/@phosphor-icons/ node_modules/next/ node_modules/jsdom/
# Results: 57MB, 141MB, 4.6MB respectively (installed sizes)

# 6. Confirm static assets exclusion from build
find .next/ -name "*.pdf" -o -name "*.zip" | wc -l
# Result: 0 (confirms large static files excluded)

# 7. Package analysis for bundle impact assessment
npm list --depth=0 --prod > production-deps.txt
npm list --depth=0 --dev > dev-deps.txt
# Use to identify which dependencies contribute to production bundle
```

**To update these figures:**
1. Run `npm run build` to create fresh production build
2. Use `du -sh .next/` to get total deployment size
3. Break down with `du -sh .next/static/` and `du -sh .next/server/`
4. Compare results to 50MB Vercel limit
5. Investigate any significant size increases with bundle analyzer

### Dependency Assessment

#### **Large Dependencies (Properly Managed)**
```typescript
// Current large dependencies with mitigation strategies
@phosphor-icons/react   // 57MB - Using selective imports + tree-shaking
Next.js                // 141MB - Framework overhead, optimized by Vercel
jsdom                  // 4.6MB - Server-only usage in API routes
@assistant-ui/react    // 5.3MB - Essential UI framework
```

#### **Architecture Advantages**
- **Server/client separation**: Heavy processing isolated to API routes
- **Selective imports**: Using specific module imports (e.g., `/dist/ssr/Icon`)
- **Static asset exclusion**: Large example PDFs excluded from build
- **Optimized icons**: `optimizePackageImports` configured for icon library

### Recommendations for Growth

#### **Immediate Monitoring**
```bash
# Add bundle analyzer for size tracking
npm install --save-dev @next/bundle-analyzer

# Monitor usage
vercel logs --follow
```

#### **Future Considerations**
- **Dynamic imports**: Lazy load heavy components if bundle grows
- **External storage**: Use Vercel Blob or S3 for large static assets
- **Code splitting**: Next.js handles this automatically, monitor chunk sizes

## Best Practices and Mitigation Strategies

### Bundle Size Management

#### **Prevention**
```javascript
// Use selective imports
import { PhosphorIcon } from '@phosphor-icons/react/dist/ssr/PhosphorIcon'
// Avoid: import * from '@phosphor-icons/react'

// Configure tree-shaking
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react']
  }
}
```

#### **Monitoring**
```bash
# Check bundle size during build
npm run build

# Use bundle analyzer
npm install --save-dev @next/bundle-analyzer
ANALYZE=true npm run build
```

### Performance Optimization

#### **Function Design**
- **Stateless functions**: Design for stateless execution
- **Minimal imports**: Only import what you need
- **Async operations**: Use streaming for long operations
- **Error handling**: Fail fast with clear error messages

#### **External Dependencies**
- **Prefer serverless-friendly**: Choose libraries designed for serverless
- **Connection pooling**: Use managed databases with connection pooling
- **Caching strategies**: Implement appropriate caching (Redis, Vercel KV)

### Library Selection Guidelines

#### **Evaluation Criteria**
```typescript
// When evaluating new dependencies, check:
1. Bundle size impact (use bundlephobia.com)
2. Native dependency requirements
3. Serverless compatibility
4. Tree-shaking support
5. Alternative lighter options
```

#### **Safe Package Categories**
- **Pure JavaScript**: No compilation required
- **Serverless-first**: Designed for serverless environments
- **Small footprint**: <5MB typical size
- **Wide adoption**: Used by other Vercel applications

## Troubleshooting Common Issues

### Build Failures

#### **Bundle Size Exceeded**
```bash
Error: Serverless Function "api/function" is 50.61mb which exceeds the maximum size limit of 50mb
```

**Solutions:**
1. Remove unused dependencies
2. Use selective imports instead of wildcard imports
3. Exclude development dependencies from production
4. Move large assets to external storage

#### **Native Dependency Failures**
```bash
Error: Cannot find module './build/Release/canvas.node'
```

**Solutions:**
1. Replace with pure JavaScript alternatives
2. Use Vercel-supported packages
3. Implement workarounds using browser APIs or external services

### Performance Issues

#### **Timeout Errors**
```bash
Error: Function execution timed out after 10 seconds
```

**Solutions:**
1. Optimize function execution time
2. Increase timeout limits (Pro/Enterprise)
3. Use streaming for long operations
4. Break large operations into smaller functions

### Memory Limitations

#### **Out of Memory**
```bash
Error: Function exceeded maximum memory usage
```

**Solutions:**
1. Optimize memory usage patterns
2. Upgrade to higher memory allocation (Pro/Enterprise)
3. Process data in chunks
4. Use external processing services for large datasets

## Future Considerations

### Platform Evolution
- **Fluid Compute**: Vercel's answer to traditional serverless limitations
- **Edge Runtime improvements**: Continued expansion of Edge Runtime capabilities
- **Regional expansion**: Additional deployment regions

### Technology Trends
- **WebAssembly support**: Improved performance for compute-intensive tasks
- **Streaming improvements**: Better support for long-running operations
- **Database integrations**: Enhanced database connection management

## Conclusion

Vercel's serverless constraints require thoughtful architecture and library selection, but provide a scalable, maintenance-free hosting solution when properly implemented. The Spideryarn Reading application demonstrates excellent compliance with these constraints through proper dependency management, server/client separation, and bundle optimization.

**Key Success Factors:**
1. **Bundle size monitoring**: Regular tracking of deployment size
2. **Selective imports**: Avoiding full library imports
3. **Server/client separation**: Heavy processing on server-side only
4. **Library evaluation**: Careful vetting of new dependencies

**Risk Mitigation:**
1. **Regular monitoring**: Track bundle size and performance metrics
2. **Alternative planning**: Know lighter alternatives for current dependencies
3. **External storage**: Plan for asset growth with external storage solutions
4. **Performance optimization**: Continuous optimization of function execution

The platform's constraints, while restrictive, encourage good architectural practices and result in performant, scalable applications when properly managed.

## Sources

**Vercel Official Documentation** ([Vercel Functions Limits](https://vercel.com/docs/functions/limitations)) - Comprehensive limits and constraints documentation

**Vercel Functions Runtimes** ([Vercel Docs](https://vercel.com/docs/functions/runtimes)) - Runtime specifications and capabilities

**Vercel Bundle Size Troubleshooting** ([Vercel Guide](https://vercel.com/guides/troubleshooting-function-250mb-limit)) - Official troubleshooting for size limit issues

**Bundle Analysis Discussion** ([GitHub Discussion](https://github.com/vercel/vercel/discussions/10407)) - Community discussion on 50MB limit solutions

**Serverless Function Best Practices** ([Vercel Blog](https://vercel.com/blog/serverless-servers-node-js-with-in-function-concurrency)) - Performance optimization strategies

**Edge Functions Documentation** ([Vercel Blog](https://vercel.com/blog/edge-functions-generally-available)) - Edge Runtime constraints and capabilities