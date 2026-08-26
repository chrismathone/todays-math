/**
 * 파일럿 소단원 3곳 후보 — 틀 4~6, 학년·적재·그림 유무.
 * DB 없음. 엔진만 부른다.
 */
import { writeFileSync } from "node:fs";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../src/lib/elementary/generate";
import { ELEM_TIERS } from "../src/lib/elementary/difficulty";

const SEEDS = 12;
const SEED0 = 20260826;
const STEP = 1009;

function fingerprint(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "$N$")
    .replace(/\d+/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

type Row = {
  grade: string;
  chapter: string;
  section: string;
  frames: number;
  figRate: number;
  perTier: Record<string, number>;
};

const rows: Row[] = [];
let gen = 0;
let fail = 0;

for (const unit of elementaryUnits()) {
  if (supportedTiers(unit).length === 0) continue;
  const perTier: Record<string, number> = {};
  const all = new Set<string>();
  let figCount = 0;
  let n = 0;
  for (const tier of ELEM_TIERS) {
    const fps = new Set<string>();
    for (let i = 0; i < SEEDS; i += 1) {
      try {
        const p = generateElementaryProblem(unit, SEED0 + i * STEP, tier);
        gen += 1;
        n += 1;
        const fp = fingerprint(p.content);
        fps.add(fp);
        all.add(`${tier}|${fp}`);
        if (p.figureSpec) figCount += 1;
      } catch {
        fail += 1;
      }
    }
    perTier[tier] = fps.size;
  }
  rows.push({
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    frames: all.size,
    figRate: n === 0 ? 0 : figCount / n,
    perTier,
  });
}

rows.sort((a, b) => a.frames - b.frames || a.section.localeCompare(b.section));
const band = rows.filter((r) => r.frames >= 4 && r.frames <= 6);

const out = {
  generated: gen,
  failed: fail,
  total: rows.length,
  band46: band.length,
  byGradeBand: {
    초3: band.filter((r) => r.grade === "초3").length,
    초4: band.filter((r) => r.grade === "초4").length,
    초5: band.filter((r) => r.grade === "초5").length,
    초6: band.filter((r) => r.grade === "초6").length,
  },
  withFig: band
    .filter((r) => r.figRate > 0.05)
    .map((r) => ({
      grade: r.grade,
      chapter: r.chapter,
      section: r.section,
      frames: r.frames,
      figRate: Number(r.figRate.toFixed(2)),
      perTier: r.perTier,
    })),
  noFig: band
    .filter((r) => r.figRate <= 0.05)
    .map((r) => ({
      grade: r.grade,
      chapter: r.chapter,
      section: r.section,
      frames: r.frames,
      figRate: Number(r.figRate.toFixed(2)),
      perTier: r.perTier,
    })),
};

writeFileSync(
  "scratch/pilot-pick-sections.json",
  JSON.stringify(out, null, 2),
  "utf8",
);
console.log(
  JSON.stringify(
    {
      generated: out.generated,
      failed: out.failed,
      band46: out.band46,
      byGradeBand: out.byGradeBand,
      withFig: out.withFig.length,
      noFig: out.noFig.length,
    },
    null,
    2,
  ),
);
