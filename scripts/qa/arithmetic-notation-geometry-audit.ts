/** Independent finite-domain geometry notation census. No SVG is read or generated. */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import { tokenizeMath } from "../../src/lib/math/segments";

const definitions = arithmeticV2Definitions();
const families = definitions.filter((d) => d.strand === "도형");
const normalizePattern = (text: string) => text.replace(/\d+/g, "#");
const hash = createHash("sha256");
const patterns = new Map<
  string,
  {
    fields: string[];
    families: string[];
    count: number;
    first: string;
    example: string;
  }
>();
let candidates = 0;
const rows = families.map((d) => {
  let figures = 0,
    authored = 0;
  for (let index = 0; index < d.domainSize; index++) {
    const c = d.problemAt(index);
    candidates++;
    hash.update(JSON.stringify([d.id, index, c]));
    if (c.prompt.layout !== "math")
      throw Error(`${d.id}:${index}: unexpected layout`);
    if (c.prompt.figureId) figures++;
    for (const [field, value] of Object.entries({
      text: c.prompt.text,
      instruction: c.prompt.instruction ?? "",
      latex: c.prompt.latex,
      answerText: c.answer.text,
      answerLatex: c.answer.latex,
      answerUnit: c.prompt.answerUnit ?? "<legacy>",
    })) {
      if (tokenizeMath(value).some((s) => s.type !== "text")) authored++;
      const key = `${field}:${normalizePattern(value)}`;
      const p = patterns.get(key) ?? {
        fields: [field],
        families: [],
        count: 0,
        first: `${d.id}:${index}${c.prompt.figureId ? ` (${c.prompt.figureId})` : ""}`,
        example: value,
      };
      if (!p.families.includes(d.id)) p.families.push(d.id);
      p.count++;
      patterns.set(key, p);
    }
  }
  return {
    id: d.id,
    strand: d.strand,
    candidates: d.domainSize,
    figures,
    textOnly: d.domainSize - figures,
    authoredFields: authored,
  };
});
const result = {
  registryFamilies: definitions.length,
  families: families.length,
  candidates,
  canonicalSha256: hash.digest("hex"),
  rows,
  patterns: [...patterns.values()],
};
if (process.argv.includes("--inventory")) {
  writeFileSync(
    "scripts/qa/arithmetic-notation-geometry-audit-inventory.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      { ...result, rows: result.rows.length, patterns: result.patterns.length },
      null,
      2,
    ),
  );
}
