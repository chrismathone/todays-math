import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BANK_PARTS } from "../../../src/lib/concept-blank/bank";

// IDs can still occur in the frozen fading group table. Match authored sentences.
const signatures = Object.entries(BANK_PARTS).map(([part, bank]) => ({
  part,
  sentences: bank.concepts
    .slice(-20)
    .map(({ definition }) => JSON.stringify(definition).slice(1, -1)),
}));
const output = process.argv[2] ?? ".next";
for (const target of ["server", "static"]) {
  const root = join(output, target);
  for (const file of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".js")) continue;
    const source = readFileSync(join(root, file), "utf8");
    const parts = signatures.filter(
      ({ sentences }) =>
        sentences.filter((sentence) => source.includes(sentence)).length >= 10,
    );
    if (parts.length > 0) {
      console.error(
        `${target}/${file}: ${parts.map(({ part }) => part).join(", ")}`,
      );
      process.exitCode = 1;
    }
  }
}
