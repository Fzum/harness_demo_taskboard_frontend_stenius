import { defineConfig } from 'vitest/config';

// Extra Vitest settings for `ng test` (angular.json: <app>.architect.test.options.runnerConfig).
export default defineConfig({
  test: {
    // The Angular builder hands Vitest an in-memory build. Vitest's on-disk module cache keys a
    // spec by its own source only, so after a change to a file the spec imports it could replay
    // the previous build. Keep it off.
    fsModuleCache: false,
  },
});
