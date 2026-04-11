import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15_000,
    include: ["lib/__tests__/**/*.test.ts", "app/**/__tests__/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "lib/repositories/**",
        "lib/services/**",
        "lib/resume-crypto.ts",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
