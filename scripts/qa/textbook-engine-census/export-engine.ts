/** Read the live registry and generate reproducible evidence. No DB, API, or app writes. */
import { createHash } from "node:crypto";
import {
  registeredTypes,
  generateMiddleProblem,
} from "../../../src/lib/middle/generate";
const seeds = [20261125, 173, 9049];
const full = process.argv.includes("--samples");
const entries = registeredTypes()
  .filter((e) => ["중1", "중2"].includes(e.grade))
  .map((e) => {
    const samples = seeds.map((seed) => {
      try {
        const p = generateMiddleProblem(e.key, seed);
        return {
          seed,
          sha256: createHash("sha256").update(JSON.stringify(p)).digest("hex"),
          difficulty: p.difficulty,
          hasFigure: !!p.figureSpec,
          ...(full
            ? {
                content: p.content,
                answer: p.answer,
                solution: p.solution,
                facts: p.facts,
              }
            : {}),
        };
      } catch (error) {
        return { seed, error: String(error) };
      }
    });
    return {
      key: e.key,
      grade: e.grade,
      section: e.unitSection,
      title: e.rpmTitle,
      samples,
    };
  });
process.stdout.write(JSON.stringify({ seeds, entries }, null, 2) + "\n");
