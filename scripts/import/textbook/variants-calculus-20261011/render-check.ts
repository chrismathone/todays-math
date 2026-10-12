/** Exercise the actual KaTeX renderer on every emitted question, answer and full solution. */
import katex from "katex";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { TextbookCalculusCandidate } from "../../../../src/lib/import/schoolTextbook/variantsCalculus";

const [input, report] = process.argv.slice(2);
if (!input || !report)
  throw new Error("render-check.ts candidates.json report.json");
const bytes = readFileSync(input),
  packet = JSON.parse(bytes.toString("utf8")) as {
    candidates: TextbookCalculusCandidate[];
  };
const failures: {
  externalId: string;
  field: string;
  math: string;
  error: string;
}[] = [];
let rendered = 0;
for (const candidate of packet.candidates) {
  for (const field of ["content", "answer", "solution"] as const) {
    for (const part of candidate[field].matchAll(/\$([^$]+)\$/g)) {
      try {
        katex.renderToString(part[1]!, { throwOnError: true, strict: "error" });
        rendered++;
      } catch (error) {
        failures.push({
          externalId: candidate.externalId,
          field,
          math: part[1]!,
          error: String(error),
        });
      }
    }
  }
}
const result = {
  candidateFileSha256: createHash("sha256").update(bytes).digest("hex"),
  candidates: packet.candidates.length,
  renderedMathFragments: rendered,
  failures,
};
writeFileSync(report, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
