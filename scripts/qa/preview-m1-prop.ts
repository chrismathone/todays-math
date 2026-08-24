/**
 * 5B 27유형(정비례와 반비례 21 + 좌표와 그래프 6) 미리보기 — 지면에 무엇이
 * 나가는지 **파일로** 남긴다(스크롤백은 창이 닫히면 사라진다).
 *
 *   npx tsx scripts/qa/preview-m1-prop.ts > docs/planning/tracks/preview-m1-prop.md
 *
 * 값 검사가 다 초록이어도 지면은 흉할 수 있다 — `1x` · 군더더기 괄호 · `\div-3` 은
 * KaTeX·bareNumbers 가드를 **전부 통과한다**(물결 4C·4D 가 그렇게 넷을 찾았다).
 * 그래서 눈으로 볼 물건을 따로 낸다.
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_PROP } from "../../src/lib/middle/m1Prop";

const SEEDS = [20260824, 7, 4242];

console.log("# 5B — RPM 1-1 정비례와 반비례 21 + 좌표와 그래프 6 미리보기\n");
console.log(
  `생성 유형 ${M1_PROP.length}개 · 유형마다 씨앗 ${SEEDS.length}개. ` +
    `그림은 «figureSpec» 줄로만 적는다 — 실제 그림은 ` +
    "`qa/m1-prop-figures.html` 과 `qa/m1-prop-sheet/` 에 있다.\n",
);

let minor = "";
for (const e of M1_PROP) {
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
    if (p.figureSpec) {
      console.log(`  - **그림** \`${JSON.stringify(p.figureSpec)}\``);
    }
  }
}
