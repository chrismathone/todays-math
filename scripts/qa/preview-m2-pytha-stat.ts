/**
 * 6E-중2피타고라스통계엔진 33유형 미리보기 — 지면에 무엇이 나가는지 **파일로** 남긴다.
 * (스크롤백은 창이 닫히면 사라진다 — 물결 계약 「끝내는 조건」)
 *
 *   npx tsx scripts/qa/preview-m2-pytha-stat.ts > docs/planning/tracks/preview-6e-pytha-stat.md
 */
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M2_PYTHA } from "../../src/lib/middle/m2Pytha";
import { M3_STAT2 } from "../../src/lib/middle/m3Stat2";

const SEEDS = [20260824, 7, 4242];

function printModule(
  title: string,
  entries: readonly {
    key: string;
    rpmMinor: string;
    rpmType: string;
    rpmTitle: string;
    unitSection: string;
  }[],
): void {
  console.log(`\n# ${title}\n`);
  console.log(
    `생성 유형 ${entries.length}개 · 유형마다 씨앗 ${SEEDS.length}개.\n`,
  );

  let minor = "";
  for (const e of entries) {
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
      console.log(
        `  - **그림** ${p.figureSpec ? JSON.stringify(p.figureSpec).slice(0, 160) + "…" : "(없음)"}`,
      );
    }
  }
}

printModule("6E — 중2 「피타고라스 정리」 16유형", M2_PYTHA);
printModule(
  "6E — 중3 「산포도」7 + 「상자그림과 산점도」10 = 17유형",
  M3_STAT2,
);
