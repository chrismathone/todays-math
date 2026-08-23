/**
 * 4C 다항식 40유형 **미리보기 원장** — 검수 근거를 파일로 남긴다.
 *
 *   npx tsx scripts/qa/preview-m3-poly.ts
 *   → docs/planning/tracks/reports/m3-poly-preview.md
 *
 * 스크롤백은 창이 닫히면 사라진다(물결 4 공통 계약). 유형마다 두 문항을 뽑아
 * 발문·정답·해설을 그대로 적어 두어, 다음 사람이 «무엇이 나오는가»를 코드를
 * 안 읽고도 볼 수 있게 한다. 씨앗이 고정이라 다시 돌리면 같은 파일이 나온다.
 *
 * HTML(수식이 실제로 그려진 지면)은 CLI 로 따로 뽑는다:
 *   npx tsx scripts/middle/gen-cli.ts --section "다항식의 곱셈" --count 18 \
 *     --seed 20260824 --html C:/tmp/m3-poly-mul.html
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_POLY } from "../../src/lib/middle/m3Poly";

const OUT = "docs/planning/tracks/reports/m3-poly-preview.md";
const SEED = 20260824;

function main(): void {
  const lines: string[] = [];
  lines.push("# 4C 다항식 40유형 미리보기 (RPM 3-1 곱셈 18 + 인수분해 22)");
  lines.push("");
  lines.push(
    "생성: `npx tsx scripts/qa/preview-m3-poly.ts` — 씨앗 " +
      `\`${SEED}\`, 유형마다 두 변형. 이 파일은 **손으로 고치지 말 것**(다시 돌리면 덮인다).`,
  );
  lines.push("");
  lines.push(
    "그림은 한 유형도 쓰지 않는다 — 도형 활용 넷(곱셈 08·09, 인수분해 13·14)은 " +
      "발문 문장이 조건을 다 말하도록 다시 썼다.",
  );
  lines.push("");

  let section = "";
  for (const e of M3_POLY) {
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
    }
    lines.push("");
  }

  const path = resolve(process.cwd(), OUT);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n"), "utf-8");
  console.log(`${OUT} — ${M3_POLY.length}유형 × 2문항`);
}

main();
