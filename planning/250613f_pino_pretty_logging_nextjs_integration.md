# Fix pino-pretty Integration with Next.js 15

## Goal

Enable pretty-printed logs in development mode for better developer experience with our Pino logging system. Currently, JSON logs are difficult to read during development, and pino-pretty was previously removed due to worker thread incompatibility with Next.js.

## Context

The project uses Pino for structured logging across API routes and services. The logger configuration (`lib/services/logger.ts`) has a comment indicating that pino-pretty transport was removed due to "worker thread incompatibility with Next.js". This is impacting developer experience as JSON logs are harder to parse visually during development.

## References

- `lib/services/logger.ts` - Current logger configuration with pino-pretty removed
- `docs/reference/LOGGING_BEST_PRACTICES.md` - Comprehensive logging patterns and guidance
- `next.config.ts` - Next.js configuration file
- `package.json` - Shows Next.js 15.3.2 and pino-pretty already installed as dev dependency

## Principles & Key Decisions

- **Development experience matters**: Pretty logs significantly improve debugging efficiency
- **Production safety**: JSON logs must remain in production for performance and parsing
- **Minimal disruption**: Solution should not break existing logging functionality
- **Follow Next.js best practices**: Use official configuration approaches where possible

## Stages & Actions

### ✅ Stage: Reproduce the original problem
- ✅ Re-enable pino-pretty transport in logger.ts with worker threads
  - Add transport configuration back to the logger
  - Run the dev server to capture the exact error message
  - Document the specific error for reference
  - 📔 Error found: `TypeError: The worker script or module filename must be an absolute path...`
- ✅ Create a minimal test case to verify the issue
  - The error appeared immediately when accessing any route that uses the logger

### ✅ Stage: Implement serverExternalPackages solution
- ✅ Update next.config.ts with serverExternalPackages
  - Add `serverExternalPackages: ['pino', 'pino-pretty']` to configuration
  - This is the recommended approach for Next.js 15
- ✅ Test the solution
  - Restart the dev server
  - Verify pretty logs are working
  - Check that all existing logging functionality remains intact
  - 📔 Success! Pretty logs now working with colored output
- ✅ Run automated tests in a subagent to ensure no regressions
  - 📔 Found one new issue: `setImmediate` not defined in Jest environment
  - Fixed by adding polyfill to jest.setup.js

### ❌ Stage: Alternative approach if serverExternalPackages fails
- ❌ Implement piping solution - Not needed, serverExternalPackages worked!
- ❌ Consider simpler transport configuration without workers - Not needed

### ✅ Stage: Document and finalise
- ✅ Update logger.ts with chosen solution
  - Added comments explaining the serverExternalPackages requirement
  - Documented Next.js bundling compatibility requirement
- ✅ Update CLAUDE.md if needed
  - Added note about pretty logging in development section
- ✅ Create or update relevant documentation
  - Updated jest.setup.js with setImmediate polyfill
  - Planning doc serves as comprehensive troubleshooting guide
- [ ] Git commit with clear message about fixing pino-pretty integration

### Stage: Clean up
- [ ] Move this planning doc to `planning/finished/`
- [ ] Final commit

## Appendix

### Web Search Findings

#### Key Integration Challenges
- Next.js 13+ app directory has known issues with pino-pretty
- Worker threads used by pino-pretty conflict with Next.js bundling
- Common "Module not found: Can't resolve 'pino-pretty'" errors

#### Solution Research Summary

**1. serverExternalPackages Configuration (Next.js 15)**
- Official Next.js 15 approach: `serverExternalPackages: ['pino', 'pino-pretty']`
- Replaced deprecated `experimental.serverComponentsExternalPackages` from Next.js 14
- Tells Next.js to use native Node.js `require` instead of bundling

**2. Webpack Configuration**
```javascript
webpack: (config) => {
  config.resolve.fallback = {
    fs: false,
    net: false,
    tls: false
  };
  config.externals.push('pino-pretty', 'encoding');
  return config;
}
```

**3. Transport Configuration Options**
```javascript
// Development-only transport
const logger = pino({
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard'
      }
    }
  })
})
```

**4. Piping Approach**
- Most reliable but requires different dev command
- Example: `node app.js | npx pino-pretty`

### Relevant Links
- [Next.js Discussion #46987](https://github.com/vercel/next.js/discussions/46987) - pino-pretty with Next 13 app directory
- [Stack Overflow - Pino Logger Implementation](https://stackoverflow.com/questions/78200117/how-to-implement-pino-logger-in-a-next-js-typescript-monorepo-for-both-client)
- [Better Stack Guide](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
- [Next.js serverExternalPackages Docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [Pino Next.js Example Repository](https://github.com/pinojs/pino-nextjs-example)

### Known Limitations
- Edge runtime incompatibility - pino-pretty won't work with edge functions
- Performance overhead in development (acceptable trade-off)
- Some "just do this" solutions don't always work despite claims

### Alternative Pretty-Printing Tools
- `pino-colada` - Alternative pretty printer
- `bunyan` - Can parse pino JSON output
- External log viewers that parse JSON

### Current Logger Configuration
The existing logger in `lib/services/logger.ts` is well-structured with:
- Child loggers for different components
- Utility functions for request logging and timing
- AI operation logging helpers
- Correlation ID generation

The only missing piece is the pretty-printing transport for development.