/**
 * **그림 요구 전수 쓸기** — 어느 소단원이 어떤 `elem-1` kind 를 부르는가, 그리고
 * **그림 없이 나가는 문항이 무엇인가**.
 *
 *   npx tsx scripts/qa/probe-elem-figure-demand.ts              # 전 학년, 씨앗 40개
 *   npx tsx scripts/qa/probe-elem-figure-demand.ts 초4 120      # 한 학년 · 씨앗 더
 *   npx tsx scripts/qa/probe-elem-figure-demand.ts --json out.json
 *
 * ── 왜 따로 있나 ────────────────────────────────────────────────────────────
 * D-61 은 「같은 그림이 두 번 나오면 좌표를 고치지 말고 **종류를 만들어라**」인데,
 * 그러려면 「무엇이 두 번 나오는가」를 **먼저 세어야** 한다. 이 도구가 그 자리다.
 * 학년 세션이 문항을 쓰기 시작한 뒤에 세면 이미 좌표가 박혀 있다.
 *
 * ⚠️ **kind 목록을 손으로 적지 않는다.** 씨앗을 돌려 나온 스펙에서 **관측한다** —
 *    손 목록은 샌다(09 §4-20-c 에서 31개가 빠져 있었다). 모르는 kind 가 나오면
 *    그것도 그대로 찍는다. 「내가 아는 것만 세는 자」는 새 kind 를 구조적으로 못 본다.
 *
 * ⚠️ 이 도구는 **그림을 그리지 않는다.** `figureSpec` 이 붙는지와 그 `kind` 만 본다.
 *    그려서 옳은지는 `elementaryFigure.test.ts` 와 육안 검수의 몫이다. 싸게 돌려
 *    「무엇이 필요한가」의 분모를 먼저 잡는 것이 목적이다.
 *
 * ── 모집단 ──────────────────────────────────────────────────────────────────
 * 훑는 것: `elementaryUnits()` 중 **생성기가 등록된 소단원 전량**. 학년 인자를 주면
 *   그 학년만. 대상·대조군을 가르지 않는다 — 가르면 그 경계가 곧 사각지대가 된다.
 * 안 훑는 것: 생성기 미등록 소단원(그 자리는 `--list` 가 말한다) · **난이도 갈래**.
 *   갈래는 등록된 소단원에서만 돌 수 있어 분모가 갈린다. 그래서 이 쓸기는
 *   **표준 문항의 그림 요구**이고, 갈래를 넣을 때 늘어날 그림은 여기 안 잡힌다.
 *   `--tiers` 를 주면 등록된 곳에 한해 갈래도 같이 훑는다(분모가 달라지므로 따로 찍는다).
 */
import { writeFileSync } from "node:fs";

import { type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const args = process.argv.slice(2);
const gradeArg = args.find((a) => a.startsWith("초"));
const seedCount = Number(args.find((a) => /^\d+$/.test(a)) ?? 40);
const withTiers = args.includes("--tiers");
const jsonAt = args.indexOf("--json");
const jsonPath = jsonAt >= 0 ? args[jsonAt + 1] : undefined;

type Unit = ReturnType<typeof elementaryUnits>[number];

type Row = {
  grade: string;
  chapter: string;
  section: string;
  tried: number;
  withFigure: number;
  /** kind → 관측 횟수. `version` 이 elem-1 이 아니면 `v2:*` 로 찍는다. */
  kinds: Record<string, number>;
  /** 그림이 안 붙은 문항의 발문 표본 — 「말로 때우고 있나」를 눈으로 보려고. */
  noFigureSamples: string[];
};

const rows: Row[] = [];
const kindToSections = new Map<string, Set<string>>();
let generated = 0;
let threw = 0;

/** 스펙에서 종류 이름을 **관측**한다 — 아는 목록과 대조하지 않는다. */
function kindOf(spec: unknown): string {
  if (spec === null || typeof spec !== "object") return "(스펙이 객체가 아님)";
  const s = spec as Record<string, unknown>;
  const version = s["version"];
  if (version === "elem-1") {
    const k = s["kind"];
    return typeof k === "string" ? k : "(elem-1 인데 kind 없음)";
  }
  return `v${String(version)}:엔진A`;
}

const units = elementaryUnits().filter(
  (u) => !gradeArg || u.grade === gradeArg,
);

for (const unit of units) {
  // D-113 — 축 전체가 아니라 **그 소단원이 내는 갈래**를 훑는다(안 채운 갈래는 던진다).
  const tiers: (ElemTier | undefined)[] = withTiers
    ? [undefined, ...supportedTiers(unit)]
    : [undefined];
  const row: Row = {
    grade: unit.grade,
    chapter: unit.chapter,
    section: unit.section,
    tried: 0,
    withFigure: 0,
    kinds: {},
    noFigureSamples: [],
  };
  let registered = false;
  for (const tier of tiers) {
    for (let seed = 0; seed < seedCount; seed += 1) {
      let problem;
      try {
        problem = generateElementaryProblem(unit, seed, tier);
      } catch {
        // 미등록 소단원이거나 그 씨앗에서 던진다. 던지기는 probe-elem-throw 의 몫이라
        // 여기서는 세기만 한다 — 두 도구가 같은 것을 두 번 보고하지 않게.
        threw += 1;
        continue;
      }
      registered = true;
      generated += 1;
      row.tried += 1;
      const spec = (problem as { figureSpec?: unknown }).figureSpec;
      if (spec === undefined || spec === null) {
        if (row.noFigureSamples.length < 3) {
          row.noFigureSamples.push(
            problem.content.replace(/\s+/g, " ").slice(0, 110),
          );
        }
        continue;
      }
      row.withFigure += 1;
      const k = kindOf(spec);
      row.kinds[k] = (row.kinds[k] ?? 0) + 1;
      const key = `${unit.grade} ${unit.section}`;
      if (!kindToSections.has(k)) kindToSections.set(k, new Set());
      kindToSections.get(k)!.add(key);
    }
  }
  if (registered) rows.push(row);
}

/* ── 보고 ──────────────────────────────────────────────────────────────────── */
const pct = (a: number, b: number) =>
  b === 0 ? "—" : `${((a / b) * 100).toFixed(0)}%`;

console.log(
  `모집단: 소단원 ${rows.length}개 · 문항 ${generated}개 ` +
    `(씨앗 ${seedCount}${withTiers ? " × 표준+4갈래" : " · 표준만"})` +
    `${gradeArg ? ` · ${gradeArg} 만` : ""} · 던진 조합 ${threw}`,
);
console.log("");

let chapter = "";
for (const r of rows) {
  const head = `${r.grade} ${r.chapter}`;
  if (head !== chapter) {
    chapter = head;
    console.log(`\n■ ${head}`);
  }
  const kinds = Object.entries(r.kinds)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k}×${n}`)
    .join(" · ");
  console.log(
    `  ${r.section}\n` +
      `      그림 ${r.withFigure}/${r.tried} (${pct(r.withFigure, r.tried)})` +
      `${kinds ? `  [${kinds}]` : ""}`,
  );
  if (r.withFigure < r.tried) {
    for (const s of r.noFigureSamples) console.log(`      · 그림없음: ${s}`);
  }
}

console.log(`\n── kind 별 쓰이는 소단원 (관측 ${kindToSections.size}종) ──`);
for (const [k, secs] of [...kindToSections].sort(
  (a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]),
)) {
  console.log(`  ${k}  (${secs.size}개 소단원)  ${[...secs].join(" · ")}`);
}

if (jsonPath) {
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        meta: {
          seedCount,
          withTiers,
          grade: gradeArg ?? null,
          generated,
          threw,
        },
        rows,
        kinds: Object.fromEntries(
          [...kindToSections].map(([k, v]) => [k, [...v]]),
        ),
      },
      null,
      1,
    ),
    "utf-8",
  );
  console.log(`\nJSON: ${jsonPath}`);
}
