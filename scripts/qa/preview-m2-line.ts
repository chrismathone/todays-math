/**
 * 5D 중2 「일차함수와 일차방정식」 24유형 미리보기 — 지면에 무엇이 나가는지 **파일로**
 * 남긴다 (스크롤백은 창이 닫히면 사라진다 — 물결 계약 「끝내는 조건」).
 *
 *   npx tsx scripts/qa/preview-m2-line.ts > docs/planning/tracks/preview-m2-line.md
 *
 * 그림은 여기 안 나온다 — 그림은 `preview-m2-line-figures.ts` 가 **실제로 그려**
 * 기존 `m2Func` 그래프와 나란히 놓은 접촉 시트를 만든다. 값이 맞아도 지면이 흉할
 * 수 있어(계약 §9) 둘 다 눈으로 본다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_LINE } from "../../src/lib/middle/m2Line";

const SEEDS = [20260824, 7, 4242];

console.log(
  "# 5D-중2일차함수 — RPM 2-1 ⑴ 2 + ⑵ 8 + 관계 14 = 24유형 미리보기\n",
);
console.log(
  `생성 유형 ${M2_LINE.length}개 · 유형마다 씨앗 ${SEEDS.length}개.\n` +
    "«그림» 표시가 붙은 유형은 발문 옆에 `linearGraph` 도형이 함께 나간다.\n",
);

let minor = "";
for (const e of M2_LINE) {
  if (e.rpmMinor !== minor) {
    minor = e.rpmMinor;
    console.log(`\n## ${minor}\n`);
  }
  const sample = generateMiddleProblem(e.key, SEEDS[0]!);
  const fig = sample.figureSpec ? " · **그림**" : "";
  console.log(`### ${e.rpmType} ${e.rpmTitle}  \`${e.unitSection}\`${fig}\n`);
  for (const seed of SEEDS) {
    const p = generateMiddleProblem(e.key, seed);
    console.log(
      `- **문제** (${p.difficulty}) ${p.content.replace(/\n/g, "  \n  ")}`,
    );
    console.log(`  - **답** ${p.answer}`);
    console.log(`  - **풀이** ${p.solution.replace(/\n/g, "  \n    ")}`);
  }
}
