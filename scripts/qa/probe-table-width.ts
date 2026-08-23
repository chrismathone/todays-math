/**
 * **표가 지면 폭을 넘는가 — 전량 쓸기** (2026-08-24, elem-figures)
 *
 *   npx tsx scripts/qa/probe-table-width.ts            # 스펙만 모아 JSON 으로
 *   npx tsx scripts/qa/probe-table-width.ts out.json
 *
 * ── 왜 있나 ────────────────────────────────────────────────────────────────
 * main 병합이 `_table_widths` 에 **열 폭 가드**를 들여왔다(D-70 계열). 그 가드가
 * 전량 관문을 막았는데, **몇 건이 걸리는지 아무도 모른다** — 관문은 처음 실패에서
 * 멈추고 씨앗 넷만 보여 준다. 「넷인가 천인가」로 다음 수가 완전히 갈린다.
 *
 * ⚠️ 이 도구는 **세기만 한다.** 고치는 것은 갈래(라벨·항목 수) 아니면 지면 등급이고,
 *    지면은 D-07 이라 원장님 자리다. 여기서 판단하지 않는다.
 *
 * ⚠️ **`table` 만 보지 않는다.** 「어느 kind 가 이 가드에 걸리나」를 미리 정하면
 *    그 목록이 곧 사각지대가 된다(09 §4-22). 나온 스펙을 **전부** 렌더에 넘기고,
 *    던진 것을 사유별로 센다.
 */
import { writeFileSync } from "node:fs";

import { ELEM_TIERS, type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const outPath = process.argv[2] ?? "elem-specs.json";
const seedCount = Number(process.argv[3] ?? 40);

type Row = { grade: string; section: string; tier: string; seed: number; spec: unknown };
const rows: Row[] = [];
const seen = new Set<string>();
let generated = 0;

for (const unit of elementaryUnits()) {
  const tiers: (ElemTier | undefined)[] = [
    undefined,
    ...(supportedTiers(unit).length > 0 ? ELEM_TIERS : []),
  ];
  for (const tier of tiers) {
    for (let seed = 0; seed < seedCount; seed += 1) {
      let problem;
      try {
        problem = generateElementaryProblem(unit, seed, tier);
      } catch {
        continue;
      }
      generated += 1;
      const spec = (problem as { figureSpec?: unknown }).figureSpec;
      if (spec === undefined || spec === null) continue;
      // 같은 스펙을 여러 번 렌더하지 않는다 — 다만 **어느 자리에서 나왔는지**는
      // 첫 자리를 남긴다(고칠 사람이 찾아갈 수 있어야 한다).
      const key = JSON.stringify(spec);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        grade: unit.grade,
        section: unit.section,
        tier: tier ?? "표준",
        seed,
        spec,
      });
    }
  }
}

writeFileSync(outPath, JSON.stringify({ generated, unique: rows.length, rows }, null, 0), "utf-8");
process.stdout.write(`생성 ${generated} · 서로 다른 스펙 ${rows.length} → ${outPath}\n`);
