# Testing

This document describes the current testing approach for the Spideryarn Reading project and the planned migration to a proper testing framework.

## See also

- `tests/test-mutation-engine.ts` - the current standalone test runner
- `docs/ARCHITECTURE.md` - for understanding the components being tested
- `docs/CODING_PRINCIPLES.md` - for testing philosophy and approach

## Current Testing Approach

**Current State**: Standalone Node.js script for rapid prototyping ✓  
**Target State**: Jest or Vitest with React Testing Library 📋  
**Migration Status**: Temporary solution in place, framework adoption planned

### Running Tests

To run the current test suite:

```bash
npx tsx tests/test-mutation-engine.ts
```

This executes a simple command-line test runner that validates the mutation engine and related functionality.

Prefer to use a subagent to run tests (to avoid overloading the context window).

When iterating on a single test, you may find it useful to use the equivalent of Pytest's '-x --lf' (or similar) to focus on tests that had been previously failing.


## Why This Approach?

During the rapid prototyping phase, we've opted for a lightweight testing solution that:
- Provides immediate feedback without framework overhead
- Allows quick iteration on core functionality
- Keeps dependencies minimal while architecture stabilises

## Planned Migration

As the codebase grows and stabilises, we plan to adopt a proper testing framework:

### Framework Options
- **Jest**: Mature, well-supported, excellent React integration
- **Vitest**: Modern, fast, native ESM support, compatible with Vite tooling

### Testing Libraries
- **React Testing Library**: For component testing
- **MSW (Mock Service Worker)**: For API mocking
- **Testing Library User Event**: For realistic user interactions

### Migration Timeline
- Migration planned once core features are stable
- Will preserve existing test logic while adding framework benefits
- Focus on maintainability and developer experience

## Testing Philosophy

Following our coding principles, tests should:
- Be simple and readable
- Test behaviour, not implementation details
- Provide clear failure messages
- Run quickly to encourage frequent execution

## Limitations

Current approach limitations:
- No test coverage reporting
- Limited assertion capabilities
- No component testing support
- Manual test organisation
- No watch mode or parallel execution

These limitations are acceptable during prototyping but will be addressed in the framework migration.