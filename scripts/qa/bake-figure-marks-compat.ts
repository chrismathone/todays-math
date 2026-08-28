/**
 * 바이트 기준선을 **제품과 같은 경로로** 굽는다.
 *
 *   npx tsx scripts/qa/bake-figure-marks-compat.ts [--check]
 *
 * 🔴 종전에는 `build-figure-marks-compat.py` 가 `render_spec.py` 를 **파이썬에서
 *    직접** 불러 구웠다. 2026-08-28 부터 라벨은 **TS 가 MathJax 로 조판**하므로
 *    그 경로는 제품이 내는 SVG 와 다르다 — 기준선을 구워도 시험이 곧바로 빨개진다
 *    (실측으로 그랬다). 굽는 쪽과 재는 쪽은 **같은 함수**를 지나야 한다.
 *
 * 스펙은 기존 기준선 JSON 에서 그대로 물려받는다(그 파일이 스펙의 정본이다).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";

const FIXTURE = path.join(
  process.cwd(),
  "scripts",
  "qa",
  "fixtures",
  "figure-marks-compat-baseline.json",
);

type Entry = { spec: unknown; svg: string; md5: string };

async function main(): Promise<void> {
  const check = process.argv.includes("--check");
  const baseline = JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<
    string,
    Entry
  >;
  const changed: string[] = [];
  const failed: string[] = [];

  for (const [id, entry] of Object.entries(baseline)) {
    const result = await renderFigureSpec(entry.spec);
    if (!result.ok) {
      failed.push(`${id}: ${result.error}`);
      continue;
    }
    if (result.svg !== entry.svg) changed.push(id);
    if (!check) {
      entry.svg = result.svg;
      entry.md5 = createHash("md5").update(result.svg, "utf8").digest("hex");
    }
  }

  for (const line of failed) console.log(`  🔴 ${line}`);
  if (changed.length === 0) {
    console.log(`OK — ${Object.keys(baseline).length}개 전부 바이트 불변`);
  } else {
    console.log(`바뀐 것 ${changed.length}: ${changed.join(", ")}`);
  }
  if (!check && failed.length === 0) {
    writeFileSync(FIXTURE, `${JSON.stringify(baseline, null, 1)}\n`, "utf8");
    console.log(`구웠다 → ${FIXTURE}`);
  }
  if (failed.length > 0) process.exit(1);
}

void main();
