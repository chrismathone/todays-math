/**
 * «오늘의 기억» 묶음 점검 — 묶음 표가 구조로 멀쩡한지 세고, 사람이 볼 후보를 찍는다. 고치지 않는다.
 *
 *   npx tsx scripts/qa/fading-grouping/audit.ts           # 숫자만
 *   npx tsx scripts/qa/fading-grouping/audit.ts --list    # 사람이 볼 후보까지
 *
 * 묶음은 «소단원 × 난이도» 한 칸 안에서만 나뉜다 — 한 칸은 많아야 열 문장이라 묶음이 주제 밖으로 섞일 길이 없다.
 * 그래서 여기서 보는 것은 **크기**다: 표적(빈칸이 될 자리)이 너무 적거나 많은 개념, 한 칸 안에서 크게 기운 묶음.
 * 고칠 때는 묶음 표(`src/lib/fading/groups/`)에서 문장을 같은 칸의 묶음 사이로 옮기기만 한다(열쇠는 그대로 · 다섯 이하).
 */
import { CONCEPT_BLANK_BANK } from "../../../src/lib/concept-blank/bank";
import {
  buildFadingConcepts,
  fadingTargets,
  type FadingConcept,
} from "../../../src/lib/fading/concepts";
import { erasedTargets } from "../../../src/lib/fading/erasure";
import { FADING_GROUPS } from "../../../src/lib/fading/groups";

/** 표적이 이만큼 이상이면 4단계의 칩이 많다(시안의 기준 화면이 정답 8 + 함정 3 이었다). */
const HEAVY_TARGETS = 11;
/** 한 칸 안 묶음 사이의 표적 수 차가 이만큼 이상이면 기울었다. */
const LOPSIDED_GAP = 4;

const LIST = process.argv.includes("--list");
const concepts = buildFadingConcepts(
  CONCEPT_BLANK_BANK.concepts,
  FADING_GROUPS,
);
const count = (c: FadingConcept) => fadingTargets(c).length;
const histogram = (values: number[]) => {
  const h = new Map<number, number>();
  for (const v of values) h.set(v, (h.get(v) ?? 0) + 1);
  return [...h.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, c]) => `${n}:${c}`)
    .join(" ");
};

const cells = new Map<string, FadingConcept[]>();
for (const c of concepts) {
  const key = `${c.section} (${c.level})`;
  cells.set(key, [...(cells.get(key) ?? []), c]);
}
const cellSizes = [...cells.values()].map((group) =>
  group.reduce((n, c) => n + c.propositions.length, 0),
);
console.info(
  `개념 ${concepts.length} · 칸(소단원 × 난이도) ${cells.size} · 한 칸의 문장 수 ${Math.min(...cellSizes)} ~ ${Math.max(...cellSizes)}`,
);
console.info(`표적 수(개념마다)  ${histogram(concepts.map(count))}`);
for (const step of [2, 3, 4] as const)
  console.info(
    `${step}단계에 비는 수  ${histogram(concepts.map((c) => erasedTargets(c, step).length))}`,
  );

// 단계가 겹치는 개념 — 2 · 3 · 4단계가 서로 달라야 소거가 뜻이 있다
const flat = concepts.filter((c) => {
  const [two, three, four] = [2, 3, 4].map(
    (step) => erasedTargets(c, step as 2 | 3 | 4).length,
  );
  return !(two! < three! && three! < four!);
});
const heavy = concepts.filter((c) => count(c) >= HEAVY_TARGETS);
const noText = concepts.filter((c) =>
  fadingTargets(c).every((t) => t.tier !== "text"),
);
const lopsided = [...cells.entries()].filter(([, group]) => {
  const counts = group.map(count);
  return Math.max(...counts) - Math.min(...counts) >= LOPSIDED_GAP;
});
console.info(
  `단계가 겹치는 개념 ${flat.length} · 표적 ${HEAVY_TARGETS}개 이상 ${heavy.length} · 글 표적이 없는 개념 ${noText.length} · 묶음이 기운 칸(차 ${LOPSIDED_GAP} 이상) ${lopsided.length}`,
);

if (LIST) {
  console.info(`\n[표적 ${HEAVY_TARGETS}개 이상 — 4단계의 칩이 많다]`);
  for (const c of [...heavy].sort((a, b) => count(b) - count(a)))
    console.info(`  ${count(c)}  ${c.id}  ${c.section} (${c.level})`);
  console.info(`\n[묶음이 기운 칸 — 문장을 옮기면 고르게 된다]`);
  for (const [cell, group] of lopsided)
    console.info(
      `  ${cell}: ${group.map((c) => `${c.id}=${count(c)}`).join(" · ")}`,
    );
  console.info(`\n[글 표적이 없는 개념 — 2단계부터 수식이 빈다]`);
  for (const c of noText) console.info(`  ${c.id}  ${c.section} (${c.level})`);
}
// 구조가 깨진 것(단계가 겹침)만 종료 코드로 알린다 — 나머지는 사람이 볼 후보다.
process.exitCode = flat.length ? 1 : 0;
