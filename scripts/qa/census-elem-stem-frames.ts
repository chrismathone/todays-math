/**
 * 초등 소단원×갈래에서 발문 틀이 몇 개인가.
 * 숫·수식을 지운 지문으로 센다. 키에 틀을 붙이면 갈래 상한이 이 수다.
 *
 * DB 없음. 엔진만 부른다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

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
  section: string;
  frames: number;
  perTier: Record<string, number>;
};

const rows: Row[] = [];
let gen = 0;
let fail = 0;

for (const unit of elementaryUnits()) {
  const tiers = supportedTiers(unit);
  if (tiers.length === 0) continue;
  const perTier: Record<string, number> = {};
  const all = new Set<string>();
  // 축 전체(`ELEM_TIERS`)가 아니라 **등록된 갈래**만 만든다 — `심화중`·`심화상` 은
  // 채우는 중이라(D-113) 아직 없는 소단원에서 던지고, 그걸 「생성 실패」로 세면
  // 「아직 안 채움」과 「엔진이 깨졌다」가 같은 숫자로 섞인다.
  for (const tier of tiers) {
    const fps = new Set<string>();
    for (let i = 0; i < SEEDS; i += 1) {
      try {
        const p = generateElementaryProblem(unit, SEED0 + i * STEP, tier);
        gen += 1;
        const fp = fingerprint(p.content);
        fps.add(fp);
        all.add(`${tier}|${fp}`);
      } catch {
        fail += 1;
      }
    }
    perTier[tier] = fps.size;
  }
  rows.push({
    grade: unit.grade,
    section: unit.section,
    frames: all.size,
    perTier,
  });
}

rows.sort((a, b) => a.frames - b.frames || a.section.localeCompare(b.section));
const frames = rows.map((r) => r.frames);
const sum = frames.reduce((a, b) => a + b, 0);
const min = frames[0] ?? 0;
const max = frames[frames.length - 1] ?? 0;
const avg = rows.length ? sum / rows.length : 0;
const below10 = rows.filter((r) => r.frames < 10).length;
const at4 = rows.filter((r) => r.frames === 4).length;

const byGrade: Record<string, { n: number; min: number; below10: number }> = {};
for (const r of rows) {
  const g = byGrade[r.grade] ?? { n: 0, min: Infinity, below10: 0 };
  g.n += 1;
  g.min = Math.min(g.min, r.frames);
  if (r.frames < 10) g.below10 += 1;
  byGrade[r.grade] = g;
}

console.log(
  JSON.stringify(
    {
      sections: rows.length,
      generated: gen,
      failed: fail,
      seedsPerTier: SEEDS,
      frames: { min, avg: Number(avg.toFixed(2)), max, below10, at4 },
      byGrade,
      lowest: rows.slice(0, 8).map((r) => ({
        frames: r.frames,
        grade: r.grade,
        section: r.section,
        perTier: r.perTier,
      })),
      highest: rows.slice(-8).map((r) => ({
        frames: r.frames,
        grade: r.grade,
        section: r.section,
        perTier: r.perTier,
      })),
    },
    null,
    2,
  ),
);
