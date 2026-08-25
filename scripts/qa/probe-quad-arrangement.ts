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

/**
 * **사람이 눈으로 본 갈래** — `유형키#mode` → 판정. 첫 낱말이 판정이다.
 *
 * 이 판정기는 얽힘을 넓게 잡는다(그래야 놓치지 않는다). 그 대가로 **멀쩡한데 걸리는**
 * 갈래가 남는다. 그것을 그냥 두면 목록이 늘 빨갛고, **늘 우는 가드는 꺼진다**
 * (CLAUDE.md 2026-08-20). 그렇다고 규칙을 좁히면 원래 잡던 진짜를 놓친다 —
 * 이 저장소의 답은 늘 같다: **문턱을 옮기지 말고, 본 것을 적어 두어라.**
 *
 * ⚠️ 여기에 적는 것은 「규칙이 틀렸다」가 아니라 **「사람이 보고 멀쩡하다고 했다」** 다.
 *    새 갈래가 «배치미정» 으로 올라오면 이 표에 없으므로 **경고로 튀어나온다.**
 */
export const REVIEWED_QUAD: Record<string, string> = {
  "3-1|이차방정식의 활용|10#1":
    "멀쩡 — 「**위아래로** 이웃한 두 날짜」. 달력에서 위아래는 7 차이로 정해진다. " +
    "`이웃한` 이 얽힘으로 걸리지만 방향을 발문이 적고 있다.",
  "3-1|이차방정식의 활용|12#2":
    "멀쩡 — 점 $P$ 는 $\\overline{AB}$ 위, 점 $Q$ 는 $\\overline{BC}$ 위라고 " +
    "발문이 **직접** 적는다. 라벨 `ABCD`·`PBQ` 가 $B$ 를 나눠 써서 얽힘으로 걸렸을 뿐이다.",
  "3-1|이차방정식의 활용|14#2":
    "멀쩡 — 「**양쪽을 같은 높이만큼 직각으로** 접어 올려」. 접는 자리가 정해진다. " +
    "`접어` 가 얽힘으로 걸린다.",
  "3-1|이차방정식의 활용|15#2":
    "멀쩡 — 두 정사각형이 **서로 닿지 않는다**(넓이의 합만 묻는다). 배치라는 것이 " +
    "아예 없다. `닮음비` 가 얽힘으로 걸릴 뿐이다. " +
    "⚠️ 보고서 §5.1 표는 이 칸을 「얽힘 없음」이라 적었는데 **틀렸다** — " +
    "판정기는 «배치미정» 을 낸다. DB 에 이 mode 행이 없어서 규칙을 **안 돌려 보고** " +
    "발문만 읽고 적은 값이었다. 엔진 쪽에서 재고서야 드러났다.",
};

export type ModeCell = {
  key: string;
  mode: number;
  hits: number;
  verdicts: Record<string, number>;
  sample: string;
};

/** 씨앗이 고정이라 결과가 늘 같다 — 시험이 세 번 부르므로 한 번만 돌린다(실측 0.5초/회). */
let cached: ModeCell[] | null = null;

/** 유형×mode 별로 판정을 센다. `facts.mode` 가 곧 틀의 갈래다. */
export function sweep(): ModeCell[] {
  if (cached) return cached;
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
  cached = [...cells.values()].sort((a, b) =>
    a.key === b.key ? a.mode - b.mode : a.key.localeCompare(b.key),
  );
  return cached;
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
  const unseen = undetermined.filter(
    (c) => !REVIEWED_QUAD[`${c.key}#${c.mode}`],
  );
  console.log(
    `── «배치미정» 이 남은 갈래 ── ${undetermined.length}개` +
      ` (사람이 본 것 ${undetermined.length - unseen.length} · **아직 아무도 안 본 것 ${unseen.length}**)`,
  );
  for (const c of undetermined) {
    const seen = REVIEWED_QUAD[`${c.key}#${c.mode}`];
    const n = c.verdicts["배치미정"] ?? 0;
    console.log(
      `  ${seen ? "·" : "🔴"} ${c.key} mode ${c.mode}  ${n}/${c.hits}회` +
        (seen ? `  ← ${seen.split(" —")[0]}` : "  ← **아직 아무도 안 봤다**"),
    );
    if (args.includes("--list")) {
      console.log(`      ${c.sample.replace(/^\[미정\]/, "").slice(0, 150)}`);
    }
  }
  if (undetermined.length === 0) {
    console.log("  (없다 — 31유형 어디에도 배치가 안 적힌 자리가 없다)");
  }
  if (unseen.length > 0) {
    console.error(
      "\n🔴 아무도 안 본 갈래가 있다 — 눈으로 보고 `REVIEWED_QUAD` 에 적어라.",
    );
    process.exitCode = 1;
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
