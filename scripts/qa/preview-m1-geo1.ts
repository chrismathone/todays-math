/**
 * 6A-중1도형 31유형 미리보기 — 지면에 무엇이 나가는지 **파일로** 남긴다.
 * (스크롤백은 창이 닫히면 사라진다 — 물결 6 계약 「끝내는 조건」)
 *
 *   npx tsx scripts/qa/preview-m1-geo1.ts > docs/planning/tracks/preview-m1-geo1.md
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_GEO1 } from "../../src/lib/middle/m1Geo1";

const SEEDS = [20260824, 7, 4242];

console.log("# 6A-중1도형 — RPM 1-2 기본 도형 14 + 위치 관계 17 미리보기\n");
console.log(
  `생성 유형 ${M1_GEO1.length}개 · 유형마다 씨앗 ${SEEDS.length}개.\n`,
);

let minor = "";
for (const e of M1_GEO1) {
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
    if (p.figureSpec) console.log(`  - **그림** 있음`);
  }
}
