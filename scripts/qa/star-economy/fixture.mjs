// econ-log 결과(30 · 90일)를 시험 고정본으로 줄인다 — [종류, 그 미션의 카드 레벨 별, 그날 제품이 준 별, 칸 1/0].
// 실행: node scripts/qa/star-economy/fixture.mjs  (econ-log.mjs 를 30일 · 90일로 먼저 돌린다)
// 🔴 고정본을 바꾸면 `mathExplorersStarEconomy.test.ts` 의 수치(보고서 · Wire 표)도 같이 바뀐다 — 까닭을 적을 것.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const { worktree: root } = await import("./load.mjs");
const dir = resolve(root, ".qa-artifacts/star-economy");
const code = (r) => (r.kind === "explorers" ? (r.route === "unit" ? "u" : "m") : r.route === "memory" ? "r" : "b");
const lines = [
  "{",
  '  "about": "통합 탐험 별 경제 30·90일 날별 기록 (D-144). 제품 엔진·CAS 저장·탐험 가드를 하루씩 돌린 학생 셋(g8 중2 개념·기억 · g4 초4 진도 계획+초등 은행 · g7 중1 개념+중등 은행). 고정 씨앗 20260928. 다시 만들기(저장소 뿌리): node scripts/qa/star-economy/econ-log.mjs → DAYS=90 node scripts/qa/star-economy/econ-log.mjs → node scripts/qa/star-economy/fixture.mjs — 같은 씨앗이면 바이트 동일",',
  '  "row": ["kind u=개념 날 m=기억 복습 b=은행 r=은행 복습", "그 미션이 준 카드 레벨 별", "그날 제품이 준 별(레벨+상자, 지금 규칙)", "칸을 얻었나 1/0"],',
];
for (const [tag, file] of [["days30", "econ-log.json"], ["days90", "econ-log-90.json"]]) {
  const log = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
  lines.push(`  "${tag}": {`);
  ["g8", "g4", "g7"].forEach((p, i) =>
    lines.push(`    "${p}": ${JSON.stringify(log[p].map((r) => [code(r), r.levelUps, r.productStars, r.tile ? 1 : 0]))}${i < 2 ? "," : ""}`),
  );
  lines.push(`  }${tag === "days30" ? "," : ""}`);
}
lines.push("}");
writeFileSync(resolve(root, "src/__tests__/fixtures/starEconomyDays.json"), lines.join("\n") + "\n");
console.log("ok");
