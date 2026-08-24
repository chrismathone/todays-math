/**
 * 4B(중3 3-1 앞 세 중단원 48유형) 미리보기 — 근거를 **파일로** 남긴다.
 *
 *   npx tsx scripts/qa/preview-m3-root.ts            # 씨앗 하나, 유형마다 1문항
 *   npx tsx scripts/qa/preview-m3-root.ts --n 3      # 유형마다 3문항
 *
 * 스크롤백은 창이 닫히면 사라진다(물결 3 교훈). 산출물은
 * `docs/planning/tracks/reports/m3-root-preview.md` 에 쓴다.
 *
 * ⚠️ 이 스크립트는 **제품 생성기를 실제로 부른다.** 변이 하네스가 「산출물이
 * 바뀌었나」를 물을 때 쓰는 표본도 이것과 같은 경로다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generateMiddleSet } from "../../src/lib/middle/generate";
import { M3_ROOT } from "../../src/lib/middle/m3Root";

const argN = process.argv.indexOf("--n");
const N = argN >= 0 ? Number(process.argv[argN + 1]) : 1;
const argSeed = process.argv.indexOf("--seed");
const SEED = argSeed >= 0 ? Number(process.argv[argSeed + 1]) : 20260824;

const lines: string[] = [
  `# 4B 중3 3-1 미리보기 — ${M3_ROOT.length}유형 × ${N}문항 (seed ${SEED})`,
  "",
  "생성: `npx tsx scripts/qa/preview-m3-root.ts`. AI 아님 — 씨앗이 같으면 결과가 같다.",
  "",
];

let minor = "";
for (const e of M3_ROOT) {
  if (e.rpmMinor !== minor) {
    minor = e.rpmMinor;
    lines.push("", `## ${minor}`, "");
  }
  lines.push(`### ${e.rpmType} ${e.rpmTitle}`, "");
  for (const p of generateMiddleSet(e.key, SEED, N)) {
    lines.push(`- 발문: ${p.content.replace(/\n/g, "  \n  ")}`);
    lines.push(`  - 정답: ${p.answer}`);
    lines.push(`  - 해설: ${p.solution.replace(/\n/g, "  \n    ")}`);
    lines.push(`  - facts: \`${JSON.stringify(p.facts)}\``);
  }
  lines.push("");
}

const out = path.resolve(
  process.cwd(),
  "docs/planning/tracks/reports/m3-root-preview.md",
);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, lines.join("\n"), "utf-8");
console.log(`${M3_ROOT.length}유형 × ${N}문항 → ${out}`);
