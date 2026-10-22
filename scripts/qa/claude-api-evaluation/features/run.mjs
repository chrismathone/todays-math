/** Run isolated offline capture/replay; never load project env or make HTTP calls. */
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
const [mode = "capture", evidence, responseMap] = process.argv.slice(2);
if (
  !["capture", "replay", "guards", "regression"].includes(mode) ||
  !evidence ||
  !path.isAbsolute(evidence)
) {
  throw new Error(
    "Usage: node scripts/qa/claude-api-evaluation/features/run.mjs capture|replay|guards|regression /absolute/evidence [response-map.json]",
  );
}
const root = path.resolve(evidence);
mkdirSync(root, { recursive: true, mode: 0o700 });
mkdirSync(path.join(root, "cache"), { recursive: true, mode: 0o700 });
const env = {
  PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
  TMPDIR: path.join(root, "cache"),
  XDG_CACHE_HOME: path.join(root, "cache"),
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://qa:qa@127.0.0.1:1/disabled",
  DIRECT_URL: "postgresql://qa:qa@127.0.0.1:1/disabled",
  ANTHROPIC_API_KEY: "offline-placeholder-never-transmitted",
  STUDIO_AI_ANTHROPIC_MODEL: "claude-opus-5",
  STUDIO_AI_JEV: "off",
  PYTHON_BIN:
    "/Users/pss/.local/share/uv/python/cpython-3.12.15-macos-aarch64-none/bin/python3.12",
  PYTHONDONTWRITEBYTECODE: "1",
  FEATURES_MODE: mode,
  FEATURES_EVIDENCE: root,
  ...(responseMap ? { FEATURES_RESPONSE_MAP: path.resolve(responseMap) } : {}),
};
const child = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "scripts/qa/claude-api-evaluation/features/vitest.config.mts",
    ...(mode === "guards"
      ? ["guards.test.ts"]
      : mode === "regression"
        ? ["devAiTasks.test.ts", "englishReadPhoto.test.ts"]
        : ["features.test.ts"]),
  ],
  { env, stdio: "inherit" },
);
if (child.error) throw child.error;
process.exitCode = child.status ?? 1;
