import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
const output = path.resolve(".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/prepush-r27-evidence");
export default defineConfig({
  envDir: false,
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom", globals: false, testTimeout: 20_000, css: false,
    setupFiles: [path.resolve("vitest.setup.ts")],
    server: { deps: { inline: ["next-auth"] } },
    env: {
      AUTH_URL: "http://localhost", NEXTAUTH_URL: "http://localhost", MIDDLE_RENDER: "1", PYTHON_BIN: "python",
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test", DIRECT_URL: "postgresql://test:test@127.0.0.1:1/test",
      MIDDLE_EVIDENCE_DIR: path.join(output,"middle-figures"),
      MIDDLE_REMAINING_EVIDENCE_DIR: path.join(output,"middle-remaining"),
      ADVANCED_EVIDENCE_DIR: path.join(output,"advanced"),
      ADVANCED_REMAINING_EVIDENCE_DIR: path.join(output,"advanced-remaining"),
    },
  },
});
