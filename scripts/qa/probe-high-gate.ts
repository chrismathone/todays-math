/**
 * 🚧 **고등 적재 전 관문을 표로 찍는다** — 판정은 `highLoadGate.ts`, 여기는 행을 만들어 넣고 읽기 좋게 낸다.
 *
 *   npx tsx scripts/qa/probe-high-gate.ts                          # 적재 계획(공통수학1 전량) 그대로의 행
 *   npx tsx scripts/qa/probe-high-gate.ts --plan <계획.json>       # 다른 계획
 *   npx tsx scripts/qa/probe-high-gate.ts --seeds 1,7,7777         # 계획 대신 등록 유형 전부를 씨앗마다(12벌)
 *   npx tsx scripts/qa/probe-high-gate.ts --json <파일>            # 보고를 JSON 으로도 남긴다
 *
 * DB 를 안 읽는다 · 아무것도 안 쓴다(`--json` 이 적는 파일 하나뿐). 막힌 것이 있으면 exit 1.
 *
 * 계획의 행은 **씨앗 하나**다 — 그 씨앗에서 0 이어도 다른 씨앗에서 걸리는 꼴이 있다(처음 돌린 날 씨앗 여덟에서
 * 셋이 나왔고, 계획 씨앗에서만 봤으면 둘은 못 봤다). 엔진을 고쳤으면 `--seeds` 로 넓게 한 번 더 본다.
 */
import { readFileSync, writeFileSync } from "node:fs";

import {
  buildHighRows,
  buildTargetRows,
  type Target,
} from "../import/load-engine-problems";
import { isDirectScript } from "../import/isDirectScript";
import { DIFFICULTY_LADDER } from "../../src/contracts/difficulty";
import { registeredHighTypes } from "../../src/lib/high/generate";

import {
  describeGate,
  highLoadGate,
  type GateReport,
  type GateRow,
} from "./highLoadGate";

const DEFAULT_PLAN = "scripts/import/plans/2026-10-08-공통수학1-전량.json";

/** 적재기는 target 마다 한 줄씩 찍는다 — 표를 읽는 자리에서는 소음이라 그 동안만 끈다. */
function quietly<T>(fn: () => T): T {
  const log = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
  }
}

/** 계획 파일의 target 전부를 행으로 — 적재기와 **같은 분기 함수**다. */
export function planRows(planFile: string): GateRow[] {
  const plan = JSON.parse(readFileSync(planFile, "utf8")) as {
    seedBase?: number;
    targets: Target[];
  };
  const seedBase = plan.seedBase ?? 20260825;
  return quietly(() =>
    plan.targets.flatMap((t) => buildTargetRows(t, seedBase)),
  ).filter((r) => r.familyKey.startsWith("high:"));
}

/**
 * 등록 유형 전부를 한 씨앗으로 — 유형마다 `want` 벌, 변형 공간이 좁아 못 채우면 채워지는 만큼 낮춘다.
 * 낮춘 유형은 `lowered`(`유형키:벌 수`)로 돌려준다 — 조용히 낮추면 «전부 12벌»로 읽힌다.
 */
export function registryRowsAt(
  seed: number,
  want = 12,
): { rows: GateRow[]; lowered: string[] } {
  const rows: GateRow[] = [];
  const lowered: string[] = [];
  quietly(() => {
    for (const e of registeredHighTypes()) {
      for (let n = want; n >= 1; n -= 1) {
        try {
          rows.push(
            ...buildHighRows(
              {
                engine: "high",
                grade: e.grade,
                unitSection: e.unitSection,
                keys: [e.key],
                variants: n,
              },
              seed,
            ),
          );
          if (n < want) lowered.push(`${e.key}:${n}`);
          break;
        } catch (err) {
          if (n === 1) throw err;
        }
      }
    }
  });
  return { rows, lowered };
}

const TIERS: readonly string[] = DIFFICULTY_LADDER;

function tierCells(counts: Record<string, number>, tiers: string[]): string {
  return tiers.map((t) => String(counts[t] ?? 0).padStart(5)).join(" ");
}

/** 보고 하나를 줄로 — 요약 · 막힌 것 · 못 읽은 보기 · 맨 수 겹침 · 차시별 난이도. */
export function gateTable(report: GateReport, title: string): string[] {
  const tiers = [
    ...TIERS.filter((t) => t in report.difficulty),
    ...Object.keys(report.difficulty).filter((t) => !TIERS.includes(t)),
  ];
  const lines = [
    `${title} — 행 ${report.rows} · 문항류 ${report.families} · 견준 보기 쌍 ${report.comparedPairs}` +
      ` · 못 읽은 보기 ${report.unread.length}행 · 막힌 것 ${report.hits.length}`,
  ];
  lines.push(...describeGate(report, 8).map((l) => `   ${l}`));
  if (report.unread.length > 0) {
    const first = new Map<string, string>();
    for (const u of report.unread)
      if (!first.has(u.familyKey)) first.set(u.familyKey, u.choice);
    lines.push(`   ⚠️ 값으로 못 읽은 보기 — 문항류 ${first.size}`);
    for (const [k, c] of first) lines.push(`      ${k}  ${c}`);
  }
  const shown = report.bareAnswer.filter((b) => b.shown > 0);
  lines.push(
    `   맨 수 답이 발문의 수와 겹친 변형 — 유형 ${shown.length} / 맨 수 답을 내는 유형 ${report.bareAnswer.length}`,
  );
  for (const b of shown.slice(0, 12))
    lines.push(
      `      ${String(b.shown).padStart(3)}/${String(b.variants).padEnd(3)} ${b.familyKey.replace(/^high:/, "")}`,
    );
  lines.push(
    `   차시별 난이도(행)`,
    `      ${"합".padStart(5)} | ${tiers.map((t) => t.padStart(4)).join(" ")} | 차시`,
  );
  for (const [section, counts] of Object.entries(report.bySection))
    lines.push(
      `      ${String(Object.values(counts).reduce((a, b) => a + b, 0)).padStart(5)} | ${tierCells(counts, tiers)} | ${section}`,
    );
  lines.push(
    `      ${String(report.rows).padStart(5)} | ${tierCells(report.difficulty, tiers)} | 합`,
  );
  return lines;
}

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): void {
  const seeds = argOf("--seeds");
  const reports: { title: string; report: GateReport }[] = [];
  if (seeds) {
    for (const seed of seeds.split(",").map(Number)) {
      const got = registryRowsAt(seed);
      reports.push({
        title:
          `씨앗 ${seed}` +
          (got.lowered.length > 0
            ? ` (낮춘 유형 ${got.lowered.join(" · ")})`
            : ""),
        report: highLoadGate(got.rows),
      });
    }
  } else {
    const planFile = argOf("--plan") ?? DEFAULT_PLAN;
    reports.push({
      title: `계획 ${planFile}`,
      report: highLoadGate(planRows(planFile)),
    });
  }
  for (const { title, report } of reports) {
    for (const line of gateTable(report, title)) console.log(line);
    console.log("");
  }
  const blocked = reports.reduce((n, r) => n + r.report.hits.length, 0);
  const unread = reports.reduce((n, r) => n + r.report.unread.length, 0);
  console.log(
    `합 — 보고 ${reports.length} · 행 ${reports.reduce((n, r) => n + r.report.rows, 0)} · 막힌 것 ${blocked} · 못 읽은 보기 ${unread}행`,
  );
  const out = argOf("--json");
  if (out) writeFileSync(out, JSON.stringify(reports, null, 1));
  if (blocked > 0) process.exitCode = 1;
}

if (isDirectScript(import.meta.url)) main();
