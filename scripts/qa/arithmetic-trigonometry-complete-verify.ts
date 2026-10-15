import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { TRIGONOMETRY_COMPLETE_DEFINITIONS as definitions } from "../../src/lib/arithmetic-v2/families/trigonometryComplete";
const identities = new Set<string>();
for (const d of definitions) {
  for (let i = 0; i < d.domainSize; i++) {
    const c = d.problemAt(i);
    assert(d.verify(c), `${d.id}:${i}`);
    assert(c.prompt.layout === "math");
    const identity = JSON.stringify([
      c.prompt.latex.replace(/\s+/g, ""),
      c.prompt.instruction ?? "",
    ]);
    assert(!identities.has(identity), d.id);
    identities.add(identity);
  }
  console.log(`${d.id}: ${d.domainSize}`);
}
const evidence = {
  families: definitions.length,
  total: identities.size,
  definitions: definitions.map(({ id, title, curriculum, domainSize }) => ({
    id,
    title,
    curriculum,
    domainSize,
  })),
};
console.log(
  JSON.stringify({ families: evidence.families, total: evidence.total }),
);
if (process.argv.includes("--write-evidence"))
  writeFileSync(
    new URL(
      "./arithmetic-trigonometry-complete-evidence.json",
      import.meta.url,
    ),
    JSON.stringify(evidence, null, 2) + "\n",
  );
