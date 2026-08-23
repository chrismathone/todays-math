/**
 * 중2 기하 27유형 탐침 — 변이 하네스가 «산출물이 실제로 바뀌었나»를 보는 자
 * (2026-08-21 교훈: 파일이 바뀐 것과 동작이 바뀐 것은 다르다).
 *
 * 씨앗마다 유형별 facts·정답·발문 길이·그림 라벨을 한 줄로 찍는다. DB 를 안 쓴다.
 *
 *   npx tsx scripts/qa/probe-m2-geo.ts
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_TYPES } from "../../src/lib/middle/m2";

const SEEDS = [20260823, 1, 7777, 424242, 99991];
const MINORS = new Set([
  "삼각형의 성질",
  "여러 가지 사각형",
  "도형의 닮음",
  "평행선 사이의 선분의 길이의 비",
]);

function labelsOf(spec: unknown): string {
  if (!spec || typeof spec !== "object") return "-";
  const labels = (spec as Record<string, unknown>).labels;
  if (!labels || typeof labels !== "object") return "-";
  return Object.entries(labels as Record<string, string>)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}

for (const e of M2_TYPES.filter(
  (x) => x.rpmBook === "2-2" && MINORS.has(x.rpmMinor),
)) {
  for (const seed of SEEDS) {
    let line: string;
    try {
      const p = generateMiddleProblem(e.key, seed);
      line = [
        e.key,
        seed,
        JSON.stringify(p.facts),
        p.answer,
        `len=${p.content.length}`,
        `sol=${p.solution.length}`,
        labelsOf(p.figureSpec),
      ].join(" | ");
    } catch (err) {
      line = `${e.key} | ${seed} | THROW ${String(err).slice(0, 80)}`;
    }
    console.log(line);
  }
}
