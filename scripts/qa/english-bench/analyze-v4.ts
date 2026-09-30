/**
 * 오늘의 영어 모델 벤치 — v4(주제 · 내용 일치의 수렴 단서) 판정. **재기 전에 적어 둔 규칙**이다(25 §12.9 · 3자 합의 §12.8 「2」).
 *
 *   npx tsx scripts/qa/english-bench/analyze-v4.ts --out <폴더>      (<폴더>/v3 · v4a · v4b 아래 gen/ · judge/)
 *
 * 재는 것(문항마다 채점관 평균 → 지문마다 문항 평균 — 채점관을 독립 표본으로 세지 않는다):
 *   guess  지문 없이 푼 정답률(보기 순서 섞음)        solve  지문 보고 푼 정답 일치율        rubric  루브릭 네 축 평균(1~5)
 * 통과(판마다): ① guess ≤ 0.40 ② v3 − 판 의 guess 차이의 95% 구간(지문 단위 부트스트랩)이 0 을 벗어남
 *              ③ solve 가 v3 보다 0.05 이상 내리지 않음 ④ rubric 이 v3 보다 0.3 이상 내리지 않음 — 넷 다.
 * 채택: 통과한 판만 후보 — 하나면 그 판 · 둘이면 guess 가 낮은 쪽 · 두 판의 guess 차이 구간이 0 을 포함하면 v4b(완화판) · 없으면 v3 유지.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { EnglishQuestion } from "@/contracts/english.contract";

import type { GenRecord } from "./generate";
import { flag, safeName } from "./util";

const ARMS = ["v3", "v4a", "v4b"] as const;
type Arm = (typeof ARMS)[number];
const JUDGE_IDS = ["judge:codex", "judge:claude"];
const TYPES = ["주제", "내용 일치"];
export const GUESS_CEILING = 0.4;
export const SOLVE_DROP = 0.05;
export const RUBRIC_DROP = 0.3;

interface PassageStat {
  guess: number;
  solve: number;
  rubric: number;
  byType: Record<string, { guess: number[]; solve: number[] }>;
}

const mean = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;

function readJudge(dir: string, base: string, judge: string, kind: string) {
  const file = path.join(
    dir,
    "judge",
    `${base}__${safeName(judge)}__${kind}.json`,
  );
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, "utf8"));
  return data.error ? null : data;
}

/** 풀이 파일에서 그 문항을 맞혔는가 — 없으면 null */
function solved(data: unknown, index: number, key: number): number | null {
  const d = data as {
    items?: { id: string; index: number; order: number[] }[];
    result?: { answers?: { id: string; choice: number }[] };
  } | null;
  const meta = d?.items?.find((it) => it.index === index);
  const answer = d?.result?.answers?.find((a) => a.id === meta?.id);
  if (!meta || !answer) return null;
  return meta.order[answer.choice - 1] === key ? 1 : 0;
}

function loadArm(out: string, arm: Arm) {
  const dir = path.join(out, arm);
  const passages = new Map<string, PassageStat>();
  let sets = 0;
  let accepted = 0;
  const genDir = path.join(dir, "gen");
  if (!existsSync(genDir)) return { passages, sets, accepted };
  for (const name of readdirSync(genDir).filter((f) => f.endsWith(".json"))) {
    const record = JSON.parse(
      readFileSync(path.join(genDir, name), "utf8"),
    ) as GenRecord;
    sets += 1;
    if (record.accepted) accepted += 1;
    // 제품이 저장하지 못하는 세트(검증 거절 · 읽기 실패)는 문항 지표에서 뺀다 — 채택률로 따로 본다
    if (!record.accepted || !record.draft) continue;
    const base = path.basename(name, ".json");
    const questions =
      (record.draft as { questions?: EnglishQuestion[] }).questions ?? [];
    const g: number[] = [];
    const s: number[] = [];
    const r: number[] = [];
    const byType: PassageStat["byType"] = {};
    questions.forEach((q, index) => {
      if (!TYPES.includes(q.type) || q.options.length !== 5) return;
      const key = Number(q.answer) - 1;
      const guesses: number[] = [];
      const solves: number[] = [];
      const rubrics: number[] = [];
      for (const judge of JUDGE_IDS) {
        const gv = solved(readJudge(dir, base, judge, "guess"), index, key);
        if (gv !== null) guesses.push(gv);
        const sv = solved(readJudge(dir, base, judge, "solveA"), index, key);
        if (sv !== null) solves.push(sv);
        const rubric = readJudge(dir, base, judge, "rubric") as {
          result?: { items?: Record<string, unknown>[] };
        } | null;
        const item = rubric?.result?.items?.find(
          (it) => Number(String(it.q).replace(/\D/g, "")) - 1 === index,
        );
        const axes = ["distractor", "typeFit", "stemExplanation", "level"]
          .map((k) => item?.[k])
          .filter((v): v is number => typeof v === "number");
        if (axes.length) rubrics.push(mean(axes));
      }
      if (guesses.length) g.push(mean(guesses));
      if (solves.length) s.push(mean(solves));
      if (rubrics.length) r.push(mean(rubrics));
      const t = (byType[q.type] ??= { guess: [], solve: [] });
      if (guesses.length) t.guess.push(mean(guesses));
      if (solves.length) t.solve.push(mean(solves));
    });
    if (g.length)
      passages.set(record.task, {
        guess: mean(g),
        solve: mean(s),
        rubric: mean(r),
        byType,
      });
  }
  return { passages, sets, accepted };
}

/** 지문 단위 부트스트랩(짝지은 차이) — 재현되게 씨앗을 박는다 */
function bootstrapCi(diffs: number[], rounds = 10_000): [number, number] {
  if (!diffs.length) return [NaN, NaN];
  let seed = 20260930;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  const means: number[] = [];
  for (let i = 0; i < rounds; i += 1) {
    let sum = 0;
    for (let k = 0; k < diffs.length; k += 1)
      sum += diffs[Math.floor(next() * diffs.length)]!;
    means.push(sum / diffs.length);
  }
  means.sort((a, b) => a - b);
  return [
    means[Math.floor(rounds * 0.025)]!,
    means[Math.floor(rounds * 0.975)]!,
  ];
}

function main() {
  const out = flag("--out");
  if (!out) throw new Error("--out <폴더> 가 필요하다");
  const arms = Object.fromEntries(
    ARMS.map((arm) => [arm, loadArm(out, arm)]),
  ) as Record<Arm, ReturnType<typeof loadArm>>;
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const of = (arm: Arm, key: "guess" | "solve" | "rubric") =>
    mean([...arms[arm].passages.values()].map((p) => p[key]));

  console.log(
    "판 | 세트 | 통과 | 지문 | 지문 없이 | 지문 보고 | 루브릭 | 주제 지문 없이 | 내용 일치 지문 없이",
  );
  for (const arm of ARMS) {
    const a = arms[arm];
    const typeGuess = (t: string) =>
      pct(
        mean([...a.passages.values()].flatMap((p) => p.byType[t]?.guess ?? [])),
      );
    console.log(
      `${arm} | ${a.sets} | ${a.accepted} | ${a.passages.size} | ${pct(of(arm, "guess"))} | ${pct(of(arm, "solve"))} | ${of(arm, "rubric").toFixed(2)} | ${typeGuess("주제")} | ${typeGuess("내용 일치")}`,
    );
  }

  const paired = (a: Arm, b: Arm, key: "guess" | "solve" | "rubric") =>
    [...arms[a].passages.keys()]
      .filter((id) => arms[b].passages.has(id))
      .map(
        (id) => arms[a].passages.get(id)![key] - arms[b].passages.get(id)![key],
      );

  const passed: Arm[] = [];
  for (const arm of ["v4a", "v4b"] as const) {
    const drop = paired("v3", arm, "guess");
    const [lo, hi] = bootstrapCi(drop);
    const solveDrop = mean(paired("v3", arm, "solve"));
    const rubricDrop = mean(paired("v3", arm, "rubric"));
    const checks = {
      "① 지문 없이 ≤ 40%": of(arm, "guess") <= GUESS_CEILING,
      "② v3 보다 뚜렷이 낮음(구간이 0 을 벗어남)": lo > 0,
      "③ 지문 보고 풀기 하락 < 5%p": solveDrop < SOLVE_DROP,
      "④ 루브릭 하락 < 0.3": rubricDrop < RUBRIC_DROP,
    };
    const ok = Object.values(checks).every(Boolean);
    if (ok) passed.push(arm);
    console.log(
      `\n[${arm}] 짝지은 지문 ${drop.length} · 지문 없이 v3−${arm} = ${pct(mean(drop))} (95% ${pct(lo)} ~ ${pct(hi)}) · 지문 보고 하락 ${pct(solveDrop)} · 루브릭 하락 ${rubricDrop.toFixed(2)}`,
    );
    for (const [label, value] of Object.entries(checks))
      console.log(`  ${value ? "통과" : "탈락"}  ${label}`);
    console.log(`  → ${ok ? "통과" : "탈락"}`);
  }

  let verdict: string;
  if (passed.length === 0) verdict = "v3 유지 — 통과한 판이 없다";
  else if (passed.length === 1) verdict = `${passed[0]} 채택 — 하나만 통과`;
  else {
    const between = paired("v4b", "v4a", "guess"); // 양수 = 엄격판이 더 낮다
    const [lo, hi] = bootstrapCi(between);
    verdict =
      lo > 0
        ? `v4a 채택 — 엄격판이 뚜렷이 낮다(v4b−v4a 95% ${pct(lo)} ~ ${pct(hi)})`
        : hi < 0
          ? `v4b 채택 — 완화판이 뚜렷이 낮다(v4b−v4a 95% ${pct(lo)} ~ ${pct(hi)})`
          : `v4b 채택 — 둘의 차이 구간이 0 을 포함한다(v4b−v4a 95% ${pct(lo)} ~ ${pct(hi)})`;
  }
  console.log(`\n판정: ${verdict}`);
}

if (/analyze-v4\.ts$/.test(process.argv[1] ?? "")) main();
