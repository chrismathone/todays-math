/**
 * Measure production energy for every grok MPEG source that does not yet
 * have a native cache. One source at a time. No full PCM is kept.
 * ebs-middle-1-2006-2 is measured by measureNative.ts directly. Its original
 * is m4a; the batch queue must not send it through this MPEG loop.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = "C:/Creative/testautocreator";
const nativeDir = `${root}/output/listening-assessments/whole-audio-seek-20261005/grok/native`;
const inventory = JSON.parse(readFileSync(`${root}/.qa-artifacts/whole-audio-seek-20261005/inventory.json`, "utf8"));
const here = path.dirname(fileURLToPath(import.meta.url));
const measurer = path.join(here, "measureNative.ts");
const ids = inventory.records
  .filter((record: { assignedAgent: string; sourceRecordId: string }) =>
    record.assignedAgent === "grok" && record.sourceRecordId !== "ebs-middle-1-2006-2")
  .map((record: { sourceRecordId: string }) => record.sourceRecordId);

let measured = 0;
let skipped = 0;
let failed = 0;
for (const sourceRecordId of ids) {
  const nativePath = path.join(nativeDir, `${sourceRecordId}.native.json`);
  if (existsSync(nativePath)) {
    skipped += 1;
    continue;
  }
  const started = Date.now();
  const child = spawnSync(process.execPath, ["--experimental-strip-types", measurer, sourceRecordId], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const line = (child.stdout || "").trim().split(/\r?\n/).filter((item) => item.startsWith("{")).at(-1) ?? "";
  if (child.status !== 0) {
    failed += 1;
    process.stdout.write(`${JSON.stringify({ sourceRecordId, ok: false, status: child.status, error: (child.stderr || "").slice(-400) })}\n`);
    continue;
  }
  measured += 1;
  process.stdout.write(`${JSON.stringify({ ok: true, seconds: Number(((Date.now() - started) / 1000).toFixed(1)), ...JSON.parse(line) })}\n`);
}
process.stdout.write(`${JSON.stringify({ done: true, measured, skipped, failed, sources: ids.length })}\n`);
