/** Read-only KaTeX syntax census: tsx render_math.ts <candidates.json> <result.json>. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import katex from "katex";
import type { TextbookGeometryCandidate } from "../../../../src/lib/import/schoolTextbook/variantsGeometry";
const [input, output] = process.argv.slice(2);
if (!input || !output)
  throw new Error("Usage: render_math.ts <candidates.json> <result.json>");
const bytes = readFileSync(input),
  data = JSON.parse(bytes.toString("utf8")) as {
    candidates: TextbookGeometryCandidate[];
  };
let checkedMath = 0;
const failures: unknown[] = [];
for (const c of data.candidates)
  for (const field of ["content", "answer", "solution"] as const) {
    const text = c[field];
    if ((text.match(/\$/g)?.length ?? 0) % 2)
      failures.push({
        externalId: c.externalId,
        field,
        error: "unbalanced-math",
      });
    for (const m of text.matchAll(/\$([^$]+)\$/g))
      try {
        katex.renderToString(m[1]!, { throwOnError: true, strict: "error" });
        checkedMath++;
      } catch (error) {
        failures.push({
          externalId: c.externalId,
          field,
          math: m[1],
          error: String(error),
        });
      }
  }
const result = {
  candidates: data.candidates.length,
  inputSha256: createHash("sha256").update(bytes).digest("hex"),
  checkedMath,
  failures,
  scope:
    "KaTeX syntax census of all generated content, answers and solutions; not final printed PDF review.",
};
writeFileSync(output, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
