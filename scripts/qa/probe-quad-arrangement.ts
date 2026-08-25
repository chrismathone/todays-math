/**
 * **엔진 쪽에서** 「그림 없이 배치가 정해지는가」를 잰다 — 중3 이차방정식 31유형.
 *
 *   npx tsx scripts/qa/probe-quad-arrangement.ts          # 집계
 *   npx tsx scripts/qa/probe-quad-arrangement.ts --list    # 갈래별 발문 한 줄씩
 *   npx tsx scripts/qa/probe-quad-arrangement.ts --json    # 스냅숏 기록
 *
 * ── 왜 DB 쪽 도구로는 부족한가 ──────────────────────────────────────────────
 * `probe-figure-dependent.ts` 는 **나간 행**을 센다. 그런데 이 트랙이 실측한 결론은
 * **「수리의 단위는 산출물이 아니라 틀」** 이었다 — 유형 13·15 는 `mode` 가 셋씩인데
 * DB 에는 그중 일부만 뽑혀 있었다(결함 mode 4개 vs DB 행 3개). **오늘 안 뽑힌 mode 도
 * 다음 생성에서 그대로 나온다.** 그래서 여기서는 `generateMiddleProblem` 을 직접
 * 불러 **mode 를 전부 꺼내** 놓고 판정한다.
 *
 * ── 「고쳤다」가 증명되려면 ──────────────────────────────────────────────────
 * ⑴ **mode 표지** — 씨앗을 넓혀 3 mode 가 **실제로 다 나왔는가**. 안 나온 mode 가
 *    있으면 그 mode 는 판정된 적이 없으므로 **보고를 거부한다.** 「0건」이
 *    「깨끗」과 「못 셈」을 안 가르는 그 자리다(CLAUDE.md 2026-08-21).
 * ⑵ **반대쪽 대조** — 31유형 **전량**을 같은 규칙에 댄다. 이미 배치를 적는 형제
 *    (13 mode 0 · 15 mode 2)에서 «배치미정» 이 나오면 거짓 경보다. 고치는 쪽만
 *    보면 「있는 것을 없다고 하는가」는 구조적으로 안 보인다(CLAUDE.md 2026-08-20).
 *
 * ⚠️ 이 도구도 **아무것도 잠그지 않는다.** 산출은 사람이 볼 목록이다.
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { classifyArrangement } from "../../src/lib/figure/arrangementRule";
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M3_QUAD } from "../../src/lib/middle/m3Quad";
import {
  NEGATIVE_FIXTURES,
  POSITIVE_FIXTURES,
  runSelfTest,
} from "./arrangementFixtures";

/** 씨앗 × 변형 = 250 표본/유형. 브리프 요구는 ≥200 이다. */
const SEEDS = [20260825, 1, 7777, 424242, 99991];
const VARIANTS = 50;

export type ModeCell = {
  key: string;
  mode: number;
  hits: number;
  verdicts: Record<string, number>;
  sample: string;
};

/** 유형×mode 별로 판정을 센다. `facts.mode` 가 곧 틀의 갈래다. */
export function sweep(): ModeCell[] {
  const cells = new Map<string, ModeCell>();
  for (const e of M3_QUAD) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateMiddleProblem(e.key, seed, v);
        const mode = Number(p.facts.mode ?? 0);
        const id = `${e.key}#${mode}`;
        const cell = cells.get(id) ?? {
          key: e.key,
          mode,
          hits: 0,
          verdicts: {},
          sample: p.content,
        };
        cell.hits += 1;
        const verdict = classifyArrangement(p.content);
        cell.verdicts[verdict] = (cell.verdicts[verdict] ?? 0) + 1;
        // 표본은 «배치미정» 을 우선해 남긴다 — 사람이 볼 것이 그쪽이다.
        if (verdict === "배치미정" && !cell.sample.startsWith("[미정]")) {
          cell.sample = `[미정]${p.content}`;
        }
        cells.set(id, cell);
      }
    }
  }
  return [...cells.values()].sort((a, b) =>
    a.key === b.key ? a.mode - b.mode : a.key.localeCompare(b.key),
  );
}

function main() {
  const args = process.argv.slice(2);

  const cal = runSelfTest();
  console.log(
    `── 눈금 (양성 ${POSITIVE_FIXTURES.length} · 음성 ${NEGATIVE_FIXTURES.length}) ──`,
  );
  if (!cal.ok) {
    for (const l of cal.lines) console.log(l);
    console.error(
      "\n🔴 눈금이 어긋났다 — **보고하지 않는다.** 규칙이 「아니오」를 낼 수 있는지부터 고쳐라.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`🟢 눈금 통과 (${cal.lines.length}줄)\n`);

  const cells = sweep();

  // ⑴ mode 표지 — 안 나온 mode 가 있으면 그 자리는 판정된 적이 없다.
  const byKey = new Map<string, ModeCell[]>();
  for (const c of cells) {
    byKey.set(c.key, [...(byKey.get(c.key) ?? []), c]);
  }
  const thin = [...byKey.entries()].filter(([, cs]) =>
    cs.some((c) => c.hits < 5),
  );
  console.log(
    `── mode 표지 ── ${byKey.size}유형 · ${cells.length}갈래 · 표본 ${SEEDS.length * VARIANTS}/유형`,
  );
  for (const [key, cs] of byKey) {
    if (!/활용\|1[0-5]$/.test(key)) continue;
    console.log(
      `  ${key}  ` + cs.map((c) => `mode ${c.mode}: ${c.hits}회`).join(" · "),
    );
  }
  if (thin.length) {
    console.error(
      "\n🔴 표본이 5회 미만인 mode 가 있다 — **보고를 거부한다.** 씨앗을 넓혀라.",
    );
    for (const [key, cs] of thin) {
      console.error(
        `   ↳ ${key}: ` + cs.map((c) => `mode ${c.mode}=${c.hits}`).join(" · "),
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log("  🟢 모든 유형이 자기 mode 를 다 냈다\n");

  // ⑵ 반대쪽 대조 — 31유형 전량에서 «배치미정» 이 어디에 남는가.
  const undetermined = cells.filter((c) => (c.verdicts["배치미정"] ?? 0) > 0);
  console.log(`── «배치미정» 이 남은 갈래 ── ${undetermined.length}개`);
  for (const c of undetermined) {
    const n = c.verdicts["배치미정"] ?? 0;
    console.log(`  ${c.key} mode ${c.mode}  ${n}/${c.hits}회`);
    if (args.includes("--list")) {
      console.log(`      ${c.sample.replace(/^\[미정\]/, "").slice(0, 150)}`);
    }
  }
  if (undetermined.length === 0) {
    console.log("  (없다 — 31유형 어디에도 배치가 안 적힌 자리가 없다)");
  }

  const tally: Record<string, number> = {};
  for (const c of cells) {
    for (const [v, n] of Object.entries(c.verdicts)) {
      tally[v] = (tally[v] ?? 0) + n;
    }
  }
  console.log(`\n── 표본 전량 판정 ── ${JSON.stringify(tally)}`);

  if (args.includes("--json")) {
    mkdirSync("scripts/qa/reports", { recursive: true });
    const out = "scripts/qa/reports/quad-arrangement-snapshot.json";
    writeFileSync(
      out,
      JSON.stringify(
        {
          기준일: "2026-08-25",
          씨앗: SEEDS,
          변형: VARIANTS,
          유형: byKey.size,
          갈래: cells.length,
          판정: tally,
          배치미정_갈래: undetermined.map((c) => `${c.key}#${c.mode}`),
          셀: cells.map((c) => ({
            key: c.key,
            mode: c.mode,
            hits: c.hits,
            verdicts: c.verdicts,
            sample: c.sample.replace(/^\[미정\]/, ""),
          })),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.log(`\n기록: ${out}`);
  }
}

const invokedDirectly = /probe-quad-arrangement\.[tj]s$/.test(
  process.argv[1] ?? "",
);
if (invokedDirectly) main();
