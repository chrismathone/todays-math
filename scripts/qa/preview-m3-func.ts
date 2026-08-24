/**
 * 5A 이차함수 42유형 **미리보기 원장** — 검수 근거를 파일로 남긴다.
 *
 *   npx tsx scripts/qa/preview-m3-func.ts
 *   → docs/planning/tracks/reports/m3-func-preview.md
 *
 * 스크롤백은 창이 닫히면 사라진다(물결 5 공통 계약). 유형마다 두 문항을 뽑아
 * 발문·정답·해설을 그대로 적어 두어, 다음 사람이 «무엇이 나오는가»를 코드를
 * 안 읽고도 볼 수 있게 한다. 씨앗이 고정이라 다시 돌리면 같은 파일이 나온다.
 *
 * 그림이 붙는 여섯 유형은 `figureSpec` 을 같이 적는다 — 어떤 포물선을 그렸는지가
 * 글로 남아야 「그때 무엇이 어떻게 보였나」를 다시 그려 보지 않고도 안다.
 * 실제로 그려 본 것은 `sheet-m3-func-figures.ts` 가 만드는 시트다.
 *
 * 수식이 실제로 그려진 지면(KaTeX + 그림)은 CLI 로 따로 뽑는다:
 *   npx tsx scripts/middle/gen-cli.ts --section "이차함수와 그래프" --count 21 \
 *     --seed 20260824 --html C:/tmp/m3-func-g1.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_FUNC, M3_FUNC_FIGURE_KEYS } from "../../src/lib/middle/m3Func";

const OUT = "docs/planning/tracks/reports/m3-func-preview.md";
const SEED = 20260824;

function main(): void {
  const lines: string[] = [];
  lines.push("# 5A 이차함수 42유형 미리보기 (RPM 3-1 그래프 ⑴ 21 + ⑵ 21)");
  lines.push("");
  lines.push(
    "생성: `npx tsx scripts/qa/preview-m3-func.ts` — 씨앗 " +
      `\`${SEED}\`, 유형마다 두 변형. 이 파일은 **손으로 고치지 말 것**(다시 돌리면 덮인다).`,
  );
  lines.push("");
  lines.push(
    `그림은 여섯 유형에 붙는다(${M3_FUNC_FIGURE_KEYS.map((k) => k.split("|").slice(1).join(" ")).join(" · ")}) — ` +
      "`curveGraph` 의 첫 실사용자다. 실제로 그려 본 시트는 " +
      "`docs/planning/tracks/reports/m3-func-figures/index.html` 에 있다.",
  );
  lines.push("");

  let section = "";
  for (const e of M3_FUNC) {
    if (e.unitSection !== section) {
      section = e.unitSection;
      lines.push("");
      lines.push(`## ${e.grade} · ${section}`);
      lines.push("");
    }
    lines.push(`### ${e.rpmMinor} ${e.rpmType} — ${e.rpmTitle}  \`${e.key}\``);
    lines.push("");
    for (let v = 0; v < 2; v += 1) {
      const p = generateMiddleProblem(e.key, SEED, v);
      lines.push(`- **발문** ${p.content.split("\n").join(" ")}`);
      lines.push(`  - **정답** ${p.answer}`);
      for (const s of p.solution.split("\n")) lines.push(`  - 풀이 ${s}`);
      if (p.figureSpec) {
        lines.push(`  - 그림 \`${JSON.stringify(p.figureSpec)}\``);
      }
    }
    lines.push("");
  }

  const path = resolve(process.cwd(), OUT);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n"), "utf-8");
  console.log(
    `→ ${OUT}  (유형 ${M3_FUNC.length} · 문항 ${M3_FUNC.length * 2})`,
  );
}

main();
