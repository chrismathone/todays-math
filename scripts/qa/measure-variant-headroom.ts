/**
 * **공간 자** — 문형·유형마다 «서로 다른 변형»을 몇 개까지 낼 수 있나.
 *
 * 적재는 지금 3벌씩만 넣는다(`perTier: 3` · `variants: 3`). 늘리려면 먼저
 * **공간이 있는지**를 알아야 한다 — 없는 곳에 숫자만 올리면 `allowShort` 가
 * 조용히 모자란 채로 넘어간다(0 은 「깨끗」과 「못 셈」을 안 가른다).
 *
 * ⚠️ 축이 둘이라 따로 잰다:
 *   · 초등 — `seed = seedBase + v*1009` 로 **씨앗**이 변한다.
 *   · 중등 — `generateMiddleProblem(key, seedBase, v)` 로 **변형 index** 가 변한다.
 * 규칙을 옮겨 적지 않으려고 적재기와 **같은 열쇠**(`distinctKey`)를 쓴다.
 */
import { writeFileSync } from "node:fs";

import { distinctKey } from "../../src/lib/engine/variants";
import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
} from "../../src/lib/elementary/generate";
import {
  generateMiddleComboProblem,
  middleComboDefinitions,
} from "../../src/lib/middle/combo";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const ATTEMPTS = Number(process.env.ATTEMPTS ?? 40);
const SEED_BASE = 20260827;
const ONLY = process.env.ONLY ?? "all";

type Rec = {
  kind: "elem" | "middle" | "combo";
  grade: string;
  section: string;
  id: string;
  distinct: number;
  attempts: number;
  errors: number;
  firstError?: string;
};

const out: Rec[] = [];

function measure(
  kind: Rec["kind"],
  grade: string,
  section: string,
  id: string,
  gen: (v: number) => { content: string; answer: string; figureSpec?: unknown },
) {
  const seen = new Set<string>();
  let errors = 0;
  let firstError: string | undefined;
  for (let v = 0; v < ATTEMPTS; v++) {
    try {
      seen.add(distinctKey(gen(v)));
    } catch (e) {
      errors++;
      firstError ??= e instanceof Error ? e.message : String(e);
    }
  }
  out.push({
    kind,
    grade,
    section,
    id,
    distinct: seen.size,
    attempts: ATTEMPTS,
    errors,
    firstError,
  });
}

if (ONLY === "all" || ONLY === "elem") {
  const units = elementaryUnits();
  for (const unit of units) {
    // 초3~중3 범위 — 초1·초2 는 대상이 아니다 (원장님 2026-09-01).
    if (unit.grade === "초1" || unit.grade === "초2") continue;
    let forms: readonly { id: string }[] = [];
    try {
      forms = listedForms(unit);
    } catch {
      forms = [];
    }
    for (const form of forms) {
      measure("elem", unit.grade, unit.section, `f${form.id}`, (v) =>
        generateElementaryForm(unit, SEED_BASE + v * 1009, form.id),
      );
    }
  }
}

if (ONLY === "all" || ONLY === "middle") {
  for (const entry of registeredTypes()) {
    measure("middle", entry.grade, entry.unitSection, entry.key, (v) =>
      generateMiddleProblem(entry.key, SEED_BASE, v),
    );
  }
}

if (ONLY === "all" || ONLY === "combo") {
  for (const def of middleComboDefinitions()) {
    measure("combo", def.anchorGrade, def.anchorSection, def.id, (v) =>
      generateMiddleComboProblem(def.id, SEED_BASE, v),
    );
  }
}

// 🔴 **부분 실행이 보고 파일을 통째로 덮는다.** `ONLY=combo` 로 6줄을 쓰고 나면
//    다음 사람이 그것을 «전량»으로 읽는다 — 0 이 「깨끗」인지 「못 셈」인지 안 갈리는
//    그 자리다. 그래서 무엇을 잰 것인지 파일 안에 적고, 부분이면 이름을 바꾼다.
const OUT =
  ONLY === "all"
    ? "scripts/qa/reports/variant-headroom.json"
    : `scripts/qa/reports/variant-headroom.${ONLY}.json`;
writeFileSync(
  OUT,
  JSON.stringify({ scope: ONLY, attempts: ATTEMPTS, rows: out }, null, 1),
  "utf-8",
);

// ── 보고 ──
const by = (k: Rec["kind"]) => out.filter((r) => r.kind === k);
for (const k of ["elem", "middle", "combo"] as const) {
  const rs = by(k);
  if (rs.length === 0) continue;
  const d = rs.map((r) => r.distinct).sort((a, b) => a - b);
  const at = (p: number) => d[Math.min(d.length - 1, Math.floor(d.length * p))];
  const sum = d.reduce((a, b) => a + b, 0);
  console.log(
    `\n[${k}] ${rs.length}개 · 시도 ${ATTEMPTS} · 서로 다른 변형 합계 ${sum}`,
  );
  console.log(
    `  최소 ${d[0]} · p10 ${at(0.1)} · 중앙 ${at(0.5)} · p90 ${at(0.9)} · 최대 ${d[d.length - 1]}`,
  );
  const buckets = [1, 2, 3, 5, 8, 12, 20];
  for (const b of buckets)
    console.log(`  ${b}개 이하: ${d.filter((x) => x <= b).length}개`);
  const err = rs.filter((r) => r.errors > 0);
  if (err.length)
    console.log(
      `  🔴 던진 것 ${err.length}개 — 예: ${err[0]!.id} «${err[0]!.firstError?.slice(0, 90)}»`,
    );
}
console.log(`\n→ ${OUT} (범위 ${ONLY} · 시도 ${ATTEMPTS})`);
