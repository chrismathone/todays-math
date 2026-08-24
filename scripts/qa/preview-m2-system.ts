/**
 * 5C-중2연립 30유형 미리보기 — 지면에 무엇이 나가는지 **파일로** 남긴다.
 * (스크롤백은 창이 닫히면 사라진다 — 물결 계약 「끝내는 조건」)
 *
 *   npx tsx scripts/qa/preview-m2-system.ts > docs/planning/tracks/preview-m2-system.md
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_SYSTEM } from "../../src/lib/middle/m2System";

const SEEDS = [20260824, 7, 4242];

console.log(
  "# 5C-중2연립 — RPM 2-1 일차부등식 9 + 연립일차방정식 13 + 활용 8 미리보기\n",
);
console.log(
  `생성 유형 ${M2_SYSTEM.length}개 · 유형마다 씨앗 ${SEEDS.length}개.\n`,
);

let minor = "";
for (const e of M2_SYSTEM) {
  if (e.rpmMinor !== minor) {
    minor = e.rpmMinor;
    console.log(`\n## ${minor}\n`);
  }
  console.log(`### ${e.rpmType} ${e.rpmTitle}  \`${e.unitSection}\`\n`);
  for (const seed of SEEDS) {
    const p = generateMiddleProblem(e.key, seed);
    console.log(
      `- **문제** (${p.difficulty}) ${p.content.replace(/\n/g, "  \n  ")}`,
    );
    console.log(`  - **답** ${p.answer}`);
    console.log(`  - **풀이** ${p.solution.replace(/\n/g, "  \n    ")}`);
  }
}
