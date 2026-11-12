import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setupEnv.ts"],
    // Integration tests share one database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000
  }
});
