import React from "react";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { BANK_CHOICE_FIGURES } from "../../src/__tests__/fixtures/bankChoiceFigures";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { generateHighProblem } from "../../src/lib/high/generate";

async function main() {
  const require = createRequire(import.meta.url);
  require.extensions[".css"] = (module) => {
    module.exports = {};
  };
  const { ProblemContent } =
    await import("../../src/components/math/ProblemContent");
  const hash = (value: unknown) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const text = (problem: {
    content: string;
    answer: string;
    solution: string | null;
  }) => [problem.content, problem.answer, problem.solution];
  const root = "scripts/import/exam-paper/exams";
  const drafts = readdirSync(root, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith("drafts.json"))
    .sort()
    .flatMap(
      (file) =>
        JSON.parse(readFileSync(`${root}/${file}`, "utf8")) as {
          content: string;
          answer: string;
          solution: string | null;
        }[],
    );
  const engine = Array.from({ length: 300 }, (_, seed) => [
    generateMiddleProblem("3-2|삼각비|18", seed),
    generateMiddleProblem("3-2|삼각비|16", seed),
    generateHighProblem("공통수학1|인수분해|04", seed),
  ]).flat();
  const markup = BANK_CHOICE_FIGURES.map((problem) =>
    hash(
      renderToStaticMarkup(
        <ProblemContent {...problem} choiceFigureIndex={undefined} />,
      ),
    ),
  );
  const result = {
    engine: {
      count: engine.length,
      seeds: [0, 299],
      hash: hash(engine.map(text)),
    },
    drafts: { count: drafts.length, hash: hash(drafts.map(text)) },
    markup,
  };
  const dir = "docs/planning/tracks/reports/bank-decide-render";
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/${process.argv[2] ?? "after"}-fingerprint.json`,
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
}
void main();
