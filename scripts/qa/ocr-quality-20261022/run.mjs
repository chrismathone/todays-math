import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
const [mode, evidence, map, independent] = process.argv.slice(2);
if (
  !["capture", "replay", "guards", "shadow-capture", "shadow-replay"].includes(
    mode,
  ) ||
  !path.isAbsolute(evidence ?? "")
)
  throw Error("capture|replay|guards absolute-evidence [response-map]");
const env = {
  PATH: process.env.PATH,
  NODE_ENV: "test",
  STUDIO_AI_JEV: "off",
  ANTHROPIC_API_KEY: "offline-placeholder-never-transmitted",
  STUDIO_AI_ANTHROPIC_MODEL: "claude-opus-5",
  OCR_MODE: mode.replace("shadow-", ""),
  ...(mode.startsWith("shadow-") ? { OCR_SHADOW: "1" } : {}),
  OCR_EVIDENCE: evidence,
  ...(independent
    ? { OCR_INDEPENDENT_MANIFEST: path.resolve(independent) }
    : {}),
  ...(evidence.endsWith("baseline-v2") ? { OCR_BASELINE: "1" } : {}),
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
// Transport completion is separate from the frozen objective quality verdict.
if (mode.endsWith("replay") && process.exitCode === 0) {
  const summary = JSON.parse(
    fs.readFileSync(path.join(evidence, "summary.json"), "utf8"),
  );
  if (summary.outcomes.some((outcome) => outcome.status !== "quality-pass"))
    process.exitCode = 2;
}
