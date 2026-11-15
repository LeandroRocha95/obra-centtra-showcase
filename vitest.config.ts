import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./samples", import.meta.url)) } },
  test: { include: ["samples/**/*.test.ts"] },
});
