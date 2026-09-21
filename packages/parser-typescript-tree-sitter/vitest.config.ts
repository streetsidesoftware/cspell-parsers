import { defineConfig } from 'vitest/config';

// EXPERIMENT: cap this package's test run to one worker process instead of one fork per file. All 4
// test files load tree-sitter's native addon at import time; testing whether several forked processes
// dlopen-ing the same native binary concurrently is the source of an intermittent windows-latest
// failure (see docs/debugging/workflows/windows-ci-tree-sitter-flake.md).
export default defineConfig({
  test: {
    maxWorkers: 1,
  },
});
