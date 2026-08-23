/**
 * 4E-중2대수 29유형 미리보기 — 지면에 무엇이 나가는지 **파일로** 남긴다.
 * (스크롤백은 창이 닫히면 사라진다 — 물결 계약 「끝내는 조건」)
 *
 *   npx tsx scripts/qa/preview-m2-mono.ts > docs/planning/tracks/preview-m2-mono.md
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_MONO } from "../../src/lib/middle/m2Mono";

const SEEDS = [20260824, 7, 4242];

console.log("# 4E-중2대수 — RPM 2-1 단항식 16 + 다항식 13 미리보기\n");
console.log(
  `생성 유형 ${M2_MONO.length}개 · 유형마다 씨앗 ${SEEDS.length}개.\n`,
);

let minor = "";
for (const e of M2_MONO) {
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
