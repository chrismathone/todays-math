// Run only in an idle checkout: temporarily loads the original production pack,
// body and spacing controls, captures Chromium, then restores all bytes in finally.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
const files = [
  "pack.ts",
  "templates/BodyContainer.tsx",
  "PrintOptionsPanel.tsx",
  "settings.ts",
  "types.ts",
].map((f) => `src/components/unified/print/${f}`);
const saved = new Map(files.map((f) => [f, readFileSync(f)]));
try {
  for (const f of files)
    writeFileSync(f, execFileSync("git", ["show", `563b6da8a:${f}`]));
  execFileSync(
    process.execPath,
    ["scripts/qa/print-spacing/measure.mjs", "before"],
    { stdio: "inherit" },
  );
} finally {
  for (const [f, bytes] of saved) writeFileSync(f, bytes);
}
execFileSync(
  process.execPath,
  ["scripts/qa/print-spacing/measure.mjs", "after"],
  { stdio: "inherit" },
);
