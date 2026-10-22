import { spawnSync } from "node:child_process";
import path from "node:path";
const [mode, evidence, map] = process.argv.slice(2);
if (
  !["capture", "replay", "guards"].includes(mode) ||
  !path.isAbsolute(evidence ?? "")
)
  throw Error("capture|replay|guards absolute-evidence [response-map]");
const env = {
  PATH: process.env.PATH,
  NODE_ENV: "test",
  STUDIO_AI_JEV: "off",
  ANTHROPIC_API_KEY: "offline-placeholder-never-transmitted",
  STUDIO_AI_ANTHROPIC_MODEL: "claude-opus-5",
  OCR_MODE: mode,
  OCR_EVIDENCE: evidence,
  ...(map ? { OCR_RESPONSE_MAP: path.resolve(map) } : {}),
};
const r = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "scripts/qa/ocr-quality-20261022/vitest.config.mts",
    mode === "guards" ? "guards.test.ts" : "capture.test.ts",
  ],
  { env, stdio: "inherit" },
);
if (r.error) throw r.error;
process.exitCode = r.status ?? 1;
