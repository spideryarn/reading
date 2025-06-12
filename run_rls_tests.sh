#!/bin/bash
cd /Users/greg/Dropbox/dev/spideryarn/reading-worktree4
echo "Running RLS integration tests..."
npm test lib/services/database/__tests__/rls-policies-integration.test.ts 2>&1
echo "Exit code: $?"