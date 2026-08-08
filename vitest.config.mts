import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests target the app's PURE modules (no DB / network) — taxonomy
// validation, AI-quota policy/tier logic, onboarding step flow. The `@` alias
// mirrors tsconfig so those modules resolve their own imports.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
