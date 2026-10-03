/**
 * Q-P01 수리 전후의 파생 산출·난수 소비·객관식 가능 문항류를 DB 없이 잰다.
 * 이름 목록은 엔진 등록부에서 읽고, 저장한 씨앗별 지문을 같은 자로 대조한다.
 * 실행: npx tsx src/__tests__/helpers/deriveFormatsCensus.ts <출력.json> [수리전.json]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateElementaryForm,
  listedForms,
} from "../../lib/elementary/forms";
import { createRng } from "../../lib/elementary/rng";
import {
  asDescriptive,
  asMultipleChoice,
  asShortAnswer,
  numericMistakes,
  type StemProblem,
} from "../../lib/engine/deriveFormats";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../lib/middle/generate";

const hash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fingerprint = (p: StemProblem): string =>
  hash([p.content, p.answer, p.solution]);

type Row = {
  family: string;
  seed: number;
  decimal: boolean;
  stem: string;
  short: string;
  descriptive: string;
  mcq: string | null;
  rngCalls: number;
  error?: string;
};

function census() {
  const rows: Row[] = [];
  const failures: { family: string; seed: number; error: string }[] = [];
  const families = [
    ...CURRICULUM_UNITS.flatMap((unit) =>
      listedForms(unit).map((form) => ({
        family: `elem:${unit.grade}|${unit.section}|${form.id}`,
        generate: (seed: number) => generateElementaryForm(unit, seed, form.id),
      })),
    ),
    ...registeredTypes().map((entry) => ({
      family: `mid:${entry.key}`,
      generate: (seed: number) => generateMiddleProblem(entry.key, seed),
    })),
  ];
  for (const { family, generate } of families) {
    for (let seed = 0; seed < 50; seed += 1) {
      let stem: StemProblem;
      try {
        stem = { ...generate(seed), familyKey: family, problemType: "활용" };
      } catch (error) {
        failures.push({ family, seed, error: String(error) });
        continue;
      }
      const row: Row = {
        family,
        seed,
        // 첫 수가 소수인 장식 답도 포함한다. 뒤의 소수만 보는 오탐은 피한다.
        decimal: /^\D*?-?\d+\.\d+/.test(stem.answer),
        stem: fingerprint(stem),
        short: fingerprint(asShortAnswer(stem)),
        descriptive: fingerprint(asDescriptive(stem)),
        mcq: null,
        rngCalls: 0,
      };
      const rng = createRng(0x9e37 + seed * 17);
      try {
        row.mcq = fingerprint(
          asMultipleChoice(stem, () => {
            row.rngCalls += 1;
            return rng();
          }),
        );
      } catch (error) {
        row.error = String(error);
      }
      rows.push(row);
    }
  }
  const counts = (prefix: string) => {
    const group = rows.filter((row) => row.family.startsWith(prefix));
    return {
      families: families.filter((f) => f.family.startsWith(prefix)).length,
      generated: group.length,
      mcqFamilies: new Set(group.filter((r) => r.mcq).map((r) => r.family))
        .size,
      mcqRows: group.filter((r) => r.mcq).length,
      decimalRows: group.filter((r) => r.decimal).length,
    };
  };
  return {
    seeds: 50,
    counts: { elementary: counts("elem:"), middle: counts("mid:") },
    nonDecimalHash: hash(rows.filter((r) => !r.decimal)),
    rows,
    failures,
  };
}

const reproduction: StemProblem = {
  ...generateMiddleProblem("3-2|삼각비|18", 15),
  familyKey: "x",
  problemType: "활용",
};
console.log(
  JSON.stringify(
    {
      reproduction,
      derived: asMultipleChoice(reproduction, createRng(0x9e37)),
      mistakes: numericMistakes(reproduction.answer),
    },
    null,
    2,
  ),
);

const outputPath = process.argv[2];
if (!outputPath) throw new Error("출력 JSON 경로가 필요합니다");
const result = census();
writeFileSync(outputPath, JSON.stringify(result));
console.log(
  JSON.stringify(
    {
      counts: result.counts,
      nonDecimalHash: result.nonDecimalHash,
      generationFailures: result.failures.length,
    },
    null,
    2,
  ),
);
const beforePath = process.argv[3];
if (beforePath) {
  const before = JSON.parse(readFileSync(beforePath, "utf8")) as ReturnType<
    typeof census
  >;
  const byId = new Map(result.rows.map((r) => [`${r.family}|${r.seed}`, r]));
  const changes = before.rows.flatMap((old) => {
    const current = byId.get(`${old.family}|${old.seed}`);
    return JSON.stringify(old) === JSON.stringify(current)
      ? []
      : [{ old, current }];
  });
  const currentFamilies = new Set(
    result.rows.filter((r) => r.mcq).map((r) => r.family),
  );
  const lostFamilies = [
    ...new Set(before.rows.filter((r) => r.mcq).map((r) => r.family)),
  ].filter((family) => !currentFamilies.has(family));
  const comparison = {
    changedRows: changes.length,
    changedFamilies: [...new Set(changes.map((c) => c.old.family))],
    nonDecimalChanges: changes.filter((c) => !c.old.decimal).length,
    sourceChanges: changes.filter((c) => c.old.stem !== c.current?.stem).length,
    rngChanges: changes.filter((c) => c.old.rngCalls !== c.current?.rngCalls)
      .length,
    lostMcqRows: changes.filter((c) => c.old.mcq && !c.current?.mcq).length,
    lostFamilies,
    generationFailuresMatch:
      JSON.stringify(before.failures) === JSON.stringify(result.failures),
  };
  writeFileSync(
    `${outputPath}.comparison.json`,
    JSON.stringify(comparison, null, 2),
  );
  console.log(JSON.stringify(comparison, null, 2));
  if (
    comparison.nonDecimalChanges ||
    comparison.sourceChanges ||
    lostFamilies.length ||
    !comparison.generationFailuresMatch
  ) {
    process.exitCode = 1;
  }
}
