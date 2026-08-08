import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["json"],
      reportsDirectory: "./coverage",
    },
    include: ["vitest-tests/**/*.test.ts"],
  },
});
