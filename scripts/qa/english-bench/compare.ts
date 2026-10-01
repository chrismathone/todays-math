/**
 * 오늘의 영어 모델 벤치 ⑤ 회차 비교 — 회차마다 score.ts 가 낸 `scores.json` 을 모아 한 보고서로.
 *
 *   npx tsx scripts/qa/english-bench/compare.ts --root <bench 폴더> --out <보고서.md>
 *
 * 회차: v1(제품 프롬프트 v1) · v2(v2) · v2rep(v2 를 한 번 더 — 재현성) · v2loop(v2 + 객관적 지적 되먹임 최대 2회).
 * 🔴 과제가 셋뿐이라(자유도 2) «세 과제를 모두 이긴 큰 격차»만 우열로 적는다(codex · grok 합의).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { GENERATORS, JUDGES } from "./models";
import { BENCH_SIX_TYPES } from "./sixTypes";
import { BENCH_TASKS } from "./tasks";
import { flag } from "./util";

interface Row {
  model: string;
  quality: number;
  qualityAlt: number;
  operational: number;
  adoption: number;
  parsedRate: number;
  byTask: Record<string, number | null>;
  byType: Record<string, number>;
  axes: Record<string, number>;
  byJudge: Record<string, number>;
  selfExcluded: number;
  latencySec: number;
}
interface Scores {
  rows: Row[];
  alpha: { rubricInterval: number; solveNominal: number };
}

const RUNS = ["v1", "v2", "v2rep", "v2loop"] as const;
const f = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? "–"
    : (Math.round(x * 10) / 10).toFixed(1);
const signed = (x: number) =>
  !Number.isFinite(x)
    ? "–"
    : `${x >= 0 ? "+" : ""}${(Math.round(x * 10) / 10).toFixed(1)}`;
const pct = (x: number) =>
  !Number.isFinite(x) ? "–" : `${Math.round(x * 100)}%`;

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((x, i) => ({ x, i })).sort((p, q) => q.x - p.x);
    const r = new Array<number>(xs.length);
    order.forEach(({ i }, k) => (r[i] = k + 1));
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const d2 = ra.reduce((s, r, i) => s + (r - rb[i]!) ** 2, 0);
  return n > 1 ? 1 - (6 * d2) / (n * (n * n - 1)) : NaN;
}

function main() {
  const root = flag("--root")!;
  const outFile = flag("--out") ?? path.join(root, "compare.md");
  const runs: Partial<Record<(typeof RUNS)[number], Scores>> = {};
  for (const run of RUNS) {
    const file = path.join(root, run, "scores.json");
    if (existsSync(file))
      runs[run] = JSON.parse(readFileSync(file, "utf8")) as Scores;
  }
  const rowOf = (run: (typeof RUNS)[number], model: string) =>
    runs[run]?.rows.find((r) => r.model === model);
  const models = GENERATORS.map((g) => g.id);
  const lines: string[] = [
    "# 오늘의 영어 — 모델별 문항 생성 점수 (2026-09-30)",
    "",
  ];

  // 1) 종합 — v2 기준 순위
  const v2 = runs.v2?.rows ?? [];
  const order = [...models].sort(
    (a, b) => (rowOf("v2", b)?.quality ?? -1) - (rowOf("v2", a)?.quality ?? -1),
  );
  lines.push(
    "## 1. 종합 (v2 프롬프트 기준 순위 · 100점)",
    "",
    "| 순위 | 모델 | **v2 품질** | v2 채택률 | v2 운영 | A 원문유지 | B 새지문 | C 변형 | 자기계열 제외 | 루브릭 절반(민감도) | v1 품질 | v1→v2 | 지연(초) |",
    "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
  );
  order.forEach((model, i) => {
    const r2 = rowOf("v2", model);
    const r1 = rowOf("v1", model);
    lines.push(
      `| ${i + 1} | ${model} | **${f(r2?.quality)}** | ${pct(r2?.adoption ?? NaN)} | ${f(r2?.operational)} | ${f(r2?.byTask["A-original"])} | ${f(r2?.byTask["B-new"])} | ${f(r2?.byTask["C-variation"])} | ${f(r2?.selfExcluded)} | ${f(r2?.qualityAlt)} | ${f(r1?.quality)} | ${signed((r2?.quality ?? NaN) - (r1?.quality ?? NaN))} | ${f(r2?.latencySec)} |`,
    );
  });

  // 2) 유형별
  const types = [...BENCH_SIX_TYPES];
  lines.push(
    "",
    "## 2. 유형별 (v2)",
    "",
    `| 모델 | ${types.join(" | ")} |`,
    `|---|${types.map(() => "---:").join("|")}|`,
  );
  for (const model of order) {
    const r = rowOf("v2", model);
    if (r)
      lines.push(
        `| ${model} | ${types.map((t) => f(r.byType[t])).join(" | ")} |`,
      );
  }
  // 유형별 평균(전 모델) v1 vs v2
  lines.push(
    "",
    "### 유형별 전 모델 평균 — v1 → v2",
    "",
    "| 유형 | v1 | v2 | 변화 |",
    "|---|---:|---:|---:|",
  );
  for (const t of types) {
    const avg = (run: (typeof RUNS)[number]) => {
      const xs = (runs[run]?.rows ?? [])
        .map((r) => r.byType[t])
        .filter((x): x is number => Number.isFinite(x));
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
    };
    lines.push(
      `| ${t} | ${f(avg("v1"))} | ${f(avg("v2"))} | ${signed(avg("v2") - avg("v1"))} |`,
    );
  }

  // 3) 축별
  lines.push(
    "",
    "## 3. 축별 (v2)",
    "",
    "| 모델 | D1 구조·IWF | D2 눈가림 정답 일치 | D4 루브릭 | D5 근거·일관 | 지문(B·C) | 지문 없이 맞힘(진단) |",
    "|---|---:|---:|---:|---:|---:|---:|",
  );
  for (const model of order) {
    const r = rowOf("v2", model);
    if (r)
      lines.push(
        `| ${model} | ${f(r.axes.d1)} | ${f(r.axes.d2)} | ${f(r.axes.d4)} | ${f(r.axes.d5)} | ${f(r.axes.passage)} | ${pct(r.axes.guess)} |`,
      );
  }

  // 4) 채점관별
  lines.push(
    "",
    "## 4. 채점관별 루브릭 D4 (v2, 채점관 평균 중심화)",
    "",
    `| 모델 | ${JUDGES.map((j) => j.id.replace("judge:", "")).join(" | ")} |`,
    `|---|${JUDGES.map(() => "---:").join("|")}|`,
  );
  for (const model of order) {
    const r = rowOf("v2", model);
    if (r)
      lines.push(
        `| ${model} | ${JUDGES.map((j) => f(r.byJudge[j.id])).join(" | ")} |`,
      );
  }

  // 5) 재현성 · 쪼기
  const subset = models.filter((m) => rowOf("v2rep", m) || rowOf("v2loop", m));
  if (subset.length) {
    lines.push(
      "",
      "## 5. 재현성 · «강하게 쪼기»(객관적 지적 되먹임 최대 2회)",
      "",
      "| 모델 | v2 | v2 재실행 | 재실행 차 | v2+루프 | 루프 효과 | 채택률 v2 → 루프 |",
      "|---|---:|---:|---:|---:|---:|---:|",
    );
    const a: number[] = [];
    const b: number[] = [];
    // 두 회차에 **모두 읽힌 과제끼리만** 견준다(Gemini 재실행은 한도 소진으로 A 과제만 있다)
    const common = (x?: Row, y?: Row) => {
      if (!x || !y) return { x: NaN, y: NaN, n: 0 };
      const ids = BENCH_TASKS.map((t) => t.id).filter(
        (id) =>
          Number.isFinite(x.byTask[id] ?? NaN) &&
          Number.isFinite(y.byTask[id] ?? NaN),
      );
      const avg = (r: Row) =>
        ids.reduce((sum, id) => sum + (r.byTask[id] as number), 0) /
        Math.max(1, ids.length);
      return {
        x: ids.length ? avg(x) : NaN,
        y: ids.length ? avg(y) : NaN,
        n: ids.length,
      };
    };
    for (const model of subset) {
      const base = rowOf("v2", model);
      const rep = rowOf("v2rep", model);
      const loop = rowOf("v2loop", model);
      const r = common(base, rep);
      const l = common(base, loop);
      if (r.n) {
        a.push(r.x);
        b.push(r.y);
      }
      lines.push(
        `| ${model} | ${f(r.x)} | ${f(r.y)}${r.n < 3 ? ` (${r.n}과제)` : ""} | ${signed(r.y - r.x)} | ${f(l.y)} | ${signed(l.y - l.x)} | ${pct(base?.adoption ?? NaN)} → ${pct(loop?.adoption ?? NaN)} |`,
      );
    }
    const diffs = a.map((x, i) => Math.abs(x - b[i]!));
    lines.push(
      "",
      `- 재실행 순위 상관(Spearman): ${f(spearman(a, b) * 100)}/100 · 재실행 점수 차 평균 ${f(diffs.reduce((s, x) => s + x, 0) / Math.max(1, diffs.length))}점 · 최대 ${f(Math.max(...diffs))}점`,
    );
  }

  // 6) 신뢰도
  lines.push(
    "",
    "## 6. 채점 신뢰도 (Krippendorff α)",
    "",
    "| 회차 | 루브릭(구간) | 눈가림 풀이 선택(명목) |",
    "|---|---:|---:|",
  );
  for (const run of RUNS) {
    const s = runs[run];
    if (s)
      lines.push(
        `| ${run} | ${s.alpha.rubricInterval.toFixed(3)} | ${s.alpha.solveNominal.toFixed(3)} |`,
      );
  }
  lines.push(
    "",
    `과제: ${BENCH_TASKS.map((t) => `${t.id}(${t.label})`).join(" · ")}. v2 세트 수 ${v2.length}개 모델.`,
  );
  writeFileSync(outFile, lines.join("\n"), "utf8");
  console.log(lines.join("\n"));
}

main();
