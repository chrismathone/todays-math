import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BANK_PARTS } from "../../../src/lib/concept-blank/bank";

// The authored modules apply the assessment overlays and given-case rules.
const output = "data/concept-blank";
const digest = (bytes: string) =>
  createHash("sha256").update(bytes).digest("hex");
mkdirSync(output, { recursive: true });
const parts = Object.fromEntries(
  Object.entries(BANK_PARTS).map(([part, bank]) => {
    const bytes = JSON.stringify(bank);
    writeFileSync(join(output, `${part}.json`), bytes);
    return [part, digest(bytes)];
  }),
);
writeFileSync(
  join(output, "manifest.json"),
  JSON.stringify({ version: digest(JSON.stringify(parts)), parts }, null, 2) +
    "\n",
);
