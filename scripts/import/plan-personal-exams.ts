/**
 * Build a read-only 2025+ extraction plan from inventory and a bank snapshot.
 * Reuse the bank identity/metadata rules and hold ambiguous source copies.
 * Usage: <inventory.json> <bank-snapshot.json> <output.json>
 *   [--source-hashes <sidecar.json>] [--write-source-hashes <sidecar.json>]
 * Hashing reads source bytes; this CLI never extracts, invokes AI/COM or changes the DB.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

import { planPersonalExams, type BankSnapshot, type PersonalExamInventory, type SourceHashSnapshot } from "../../src/lib/import/planPersonalExams";

async function main() {
  const [inventoryPath, bankPath, outputPath, ...options] = process.argv.slice(2);
  if (!inventoryPath || !bankPath || !outputPath) throw new Error("Usage: <inventory.json> <bank-snapshot.json> <output.json> [--source-hashes file] [--write-source-hashes file]");
  const flags = new Map<string, string>();
  for (let i = 0; i < options.length; i += 2) {
    const flag = options[i]!; const value = options[i + 1];
    if (!["--source-hashes", "--write-source-hashes"].includes(flag) || !value || value.startsWith("--")) throw new Error(`Unknown/missing option: ${flag}`);
    flags.set(flag, value);
  }
  const read = (file: string) => JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  const write = (file: string, value: unknown) => {
    mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
  };
  const inventory = read(inventoryPath) as PersonalExamInventory;
  const bank = read(bankPath) as BankSnapshot;
  let hashes = flags.has("--source-hashes") ? read(flags.get("--source-hashes")!) as SourceHashSnapshot : undefined;
  if (flags.has("--write-source-hashes")) {
    const base = planPersonalExams(inventory, bank);
    const sources = [...new Set(base.jobs.flatMap((job) => job.files.filter((f) => f.kind === "기출 시험지").map((f) => f.path)))].sort();
    const entries: SourceHashSnapshot["files"] = [];
    for (const file of sources) {
      const before = await stat(file);
      const digest = createHash("sha256");
      for await (const chunk of createReadStream(file)) digest.update(chunk);
      const after = await stat(file);
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error(`Source changed while hashing: ${file}`);
      entries.push({ path: file, bytes: before.size, sha256: digest.digest("hex") });
    }
    hashes = { fetchedAt: new Date().toISOString(), files: entries };
    write(flags.get("--write-source-hashes")!, hashes);
  }
  const result = planPersonalExams(inventory, bank, undefined, hashes);
  write(outputPath, result);
  console.log(JSON.stringify({ output: path.resolve(outputPath), ...result.summary }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
