/**
 * 승인된 초등 결합형 등록부를 전량 훑는다.
 *
 * 단순히 다른 문자열이 많이 나오는지는 보지 않는다. 숫자와 소재명을 지운 문장
 * 뼈대가 family 수만큼 갈리고, 모든 family가 실제 씨앗에서 도달하는지까지 센다.
 *
 *   npx tsx scripts/qa/probe-elem-combos.ts
 *   npx tsx scripts/qa/probe-elem-combos.ts --selftest
 */
import { readFileSync } from "node:fs";

import {
  elementaryComboDefinitions,
  generateElementaryComboProblem,
  type ElemComboDefinition,
  validateElementaryComboDefinition,
} from "../../src/lib/elementary/generate";
import {
  bareNumbers,
  josaFaults,
  runawayDecimals,
  tooAdvanced,
} from "../../src/lib/elementary/rules";
import type { ElemComboProblem } from "../../src/lib/elementary/types";
import { openFence } from "./elemProbeFence";

const SEEDS = Array.from({ length: 96 }, (_, index) => index + 1);

/** 현재 승인 파일럿의 소재 슬롯까지 지워, 소재 교체를 새 문형으로 세지 않는다. */
function skeleton(text: string): string {
  return text
    .replace(/\$[^$]*\$/g, "§")
    .replace(
      /(텃밭|화단|밭|채소|감자|상추|토마토|고구마|배추|방수 천|돗자리 천|천|깃발|가방|방석|띠|덮개|끈)(?:을|를|이|가)?/g,
      "◇",
    )
    .replace(/§(\s*[,·]\s*§)+/g, "§")
    .replace(/\s+/g, " ")
    .trim();
}

/** 소재 슬롯 바로 뒤에 조사를 손으로 붙인 자리 — 받침이 다른 소재가 오면 깨진다. */
function literalThemeJosaFaults(source: string): string[] {
  return [
    ...source.matchAll(
      /\$\{theme\.(?:place|material|first|second)\}(?:을|를|이|가|은|는|과|와)/g,
    ),
  ].map((match) => match[0]);
}

function audit(
  definitions: readonly ElemComboDefinition[],
  problems: readonly ElemComboProblem[],
): string[] {
  const faults: string[] = [];
  if (definitions.length === 0) faults.push("등록 결합형 0개");
  if (problems.length === 0) faults.push("생성 문항 0개");

  for (const definition of definitions) {
    try {
      validateElementaryComboDefinition(definition);
    } catch (error) {
      faults.push(
        `${definition.id}: 등록 metadata — ${(error as Error).message}`,
      );
      continue;
    }

    const made = problems.filter(
      (problem) => problem.comboId === definition.id,
    );
    const reached = new Set(made.map((problem) => problem.familyId));
    for (const familyId of definition.familyIds) {
      if (!reached.has(familyId))
        faults.push(`${definition.id}: 도달하지 못한 family ${familyId}`);
    }
    for (const familyId of reached) {
      if (!definition.familyIds.includes(familyId))
        faults.push(`${definition.id}: 등록되지 않은 family ${familyId}`);
    }

    const skeletons = new Set(made.map((problem) => skeleton(problem.content)));
    if (made.length > 0 && skeletons.size !== definition.familyIds.length) {
      faults.push(
        `${definition.id}: 문장 뼈대 ${skeletons.size}개 ≠ family ${definition.familyIds.length}개`,
      );
    }

    for (const problem of made) {
      const expectedConcepts = [
        definition.anchorKey,
        ...definition.prerequisiteKeys,
      ];
      if (
        problem.kind !== "combo" ||
        problem.anchorKey !== definition.anchorKey ||
        problem.conceptKeys.join("|") !== expectedConcepts.join("|")
      ) {
        faults.push(`${definition.id}: 생성 metadata가 등록부와 다름`);
      }
      for (const text of [problem.content, problem.answer, problem.solution]) {
        for (const fault of bareNumbers(text))
          faults.push(`${definition.id}: KaTeX 밖 숫자 — ${fault}`);
        for (const fault of runawayDecimals(text))
          faults.push(`${definition.id}: 긴 소수 — ${fault}`);
      }
      for (const fault of josaFaults(`${problem.content}\n${problem.solution}`))
        faults.push(`${definition.id}: 조사 — ${fault}`);
      for (const fault of tooAdvanced(problem.orderIndex, problem.solution))
        faults.push(`${definition.id}: 선수 범위 — ${fault}`);
    }
  }

  return [...new Set(faults)];
}

// ── 눈금 ───────────────────────────────────────────────────────────────
if (process.argv.includes("--selftest")) {
  const definition = elementaryComboDefinitions()[0]!;
  const remainder = generateElementaryComboProblem(definition.id, 1);
  const nested = generateElementaryComboProblem(definition.id, 4);
  const duplicateSkeleton = {
    ...remainder,
    familyId: "nested-part",
  };
  const badMetadata = { ...nested, anchorKey: "초5|1-6-2" };
  const bareAnswer = { ...nested, answer: "12" };
  const hardcodedJosa = literalThemeJosaFaults("${theme.second}를");
  const helperJosa = literalThemeJosaFaults(
    '${theme.second}${josa(theme.second, "을", "를")}',
  );

  const rows: [string, string[], (faults: string[]) => boolean][] = [
    [
      "두 family·두 뼈대가 모두 살아 있다",
      audit([definition], [remainder, nested]),
      (f) => f.length === 0,
    ],
    [
      "한 family가 죽으면 잡는다",
      audit([definition], [remainder]),
      (f) => f.some((x) => x.includes("도달하지 못한 family")),
    ],
    [
      "family 이름만 갈고 뼈대를 합치면 잡는다",
      audit([definition], [remainder, duplicateSkeleton]),
      (f) => f.some((x) => x.includes("문장 뼈대")),
    ],
    [
      "생성 metadata가 등록부와 다르면 잡는다",
      audit([definition], [remainder, badMetadata]),
      (f) => f.some((x) => x.includes("생성 metadata")),
    ],
    [
      "KaTeX 밖 숫자를 잡는다",
      audit([definition], [remainder, bareAnswer]),
      (f) => f.some((x) => x.includes("KaTeX 밖 숫자")),
    ],
    [
      "분모가 0이면 깨끗함으로 넘기지 않는다",
      audit([], []),
      (f) => f.includes("등록 결합형 0개") && f.includes("생성 문항 0개"),
    ],
    [
      "소재 슬롯에 조사를 하드코딩하면 잡고 josa 호출은 통과한다",
      [...hardcodedJosa, ...helperJosa],
      () => hardcodedJosa.length === 1 && helperJosa.length === 0,
    ],
  ];

  let failed = 0;
  for (const [why, faults, passes] of rows) {
    const ok = passes(faults);
    if (!ok) failed += 1;
    console.log(`  ${ok ? "✅" : "❌"} ${why}`);
  }
  console.log(
    failed === 0
      ? "\n✅ 눈금 7건 전부 맞다"
      : `\n❌ 눈금 ${failed}건 어긋남 — 결합형 판정기를 믿을 수 없다`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

// ── 전량 ───────────────────────────────────────────────────────────────
const fence = openFence();
const definitions = elementaryComboDefinitions();
const problems = definitions.flatMap((definition) =>
  SEEDS.map((seed) => generateElementaryComboProblem(definition.id, seed)),
);
const faults = audit(definitions, problems);
for (const fault of literalThemeJosaFaults(
  readFileSync("src/lib/elementary/combo.ts", "utf8"),
)) {
  faults.push(`소재 조사 하드코딩 — ${fault}`);
}
fence.close();

const familyCount = definitions.reduce(
  (sum, definition) => sum + definition.familyIds.length,
  0,
);
console.log(
  `훑은 것 — 결합형 ${definitions.length}개 · family ${familyCount}개 · 씨앗 ${SEEDS.length}개씩 · 문항 ${problems.length}개 · ${fence.scopeLine()}\n`,
);
if (definitions.length === 0 || problems.length === 0) {
  console.log("⛔ 분모가 0이다 — 결합형을 검사하지 못했다.");
  process.exit(2);
}
if (faults.length === 0) {
  console.log("✅ 결합형 위반 0");
} else {
  console.log(`❌ 결합형 위반 ${faults.length}건`);
  for (const fault of faults) console.log(`  · ${fault}`);
}
process.exitCode = faults.length === 0 ? 0 : 1;
