/**
 * 오늘의 영어 모델 벤치 ③ 점수 — 생성물(gen)과 채점(judge)을 모아 모델별 점수표를 낸다.
 *
 *   npx tsx scripts/qa/english-bench/score.ts --out <폴더>
 *
 * 결과: `<out>/scores.json` · `<out>/report.md`. 설계는 리드 · codex · grok 합의(2026-09-30, 25 §12):
 *   객관식 문항 = D1 구조·IWF 10 + D2 눈가림 정답 일치 35 + D4 루브릭 40 + D5 근거·일관성 15
 *   서술형     = D1 15 + 모범답안 타당성(루브릭 keyValid) 25 + D4 50 + D5 10
 *   세트       = 문항(기대 6문항, 빠지면 0) × (1−w) + 지문 × w  (w: 원문 유지 0 · 새 지문 .30 · 원문 변형 .25)
 *   D3(지문 없이 찍힘)은 **총점 밖 진단**. 루브릭은 채점관별 평균을 빼고 전체 평균을 더해(중심화) 합친다.
 *   품질 = 읽힌 세트 평균 · 채택률 = 제품 검증기 통과 세트 비율 · 운영 = 거절 세트를 0 으로 친 평균.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ENGLISH_GENERATED_TYPES,
  englishQuestionSchema,
  type EnglishDraft,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import { reviewEnglishDraft } from "@/lib/english/quality";

import type { GenRecord } from "./generate";
import type { JudgeKind } from "./judge";
import { familyOf, GENERATORS, JUDGES } from "./models";
import { BENCH_TASKS } from "./tasks";
import { flag, safeName } from "./util";

const PASSAGE_WEIGHT: Record<string, number> = {
  "A-original": 0,
  "B-new": 0.3,
  "C-variation": 0.25,
};
const EXPECTED_ITEMS = 6;
const TYPES = [...ENGLISH_GENERATED_TYPES];

type JudgeFile = {
  kind: JudgeKind;
  judge: string;
  ms?: number;
  empty?: boolean;
  items?: { id: string; index: number; order: number[] }[];
  result?: unknown;
  error?: string | null;
};

const mean = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
const r1 = (x: number) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : NaN);
const to100 = (rating: number) => 25 * (rating - 1);

// ─────────────────────────────────────────────
// Krippendorff α (interval · nominal) — 결측 허용
// ─────────────────────────────────────────────
function krippendorff(
  units: (number | null)[][],
  metric: "interval" | "nominal",
): number {
  const delta = (a: number, b: number) =>
    metric === "interval" ? (a - b) ** 2 : a === b ? 0 : 1;
  const pairable = units
    .map((u) => u.filter((v): v is number => v !== null && Number.isFinite(v)))
    .filter((u) => u.length >= 2);
  const all = pairable.flat();
  const n = all.length;
  if (n < 2) return NaN;
  let dO = 0;
  for (const u of pairable) {
    let s = 0;
    for (let i = 0; i < u.length; i += 1)
      for (let j = 0; j < u.length; j += 1)
        if (i !== j) s += delta(u[i]!, u[j]!);
    dO += s / (u.length - 1);
  }
  dO /= n;
  let dE = 0;
  for (let i = 0; i < n; i += 1)
    for (let j = 0; j < n; j += 1) if (i !== j) dE += delta(all[i]!, all[j]!);
  dE /= n * (n - 1);
  return dE === 0 ? 1 : 1 - dO / dE;
}

// ─────────────────────────────────────────────
// 읽기
// ─────────────────────────────────────────────
interface RubricItem {
  q: string;
  distractor?: number;
  typeFit?: number;
  stemExplanation?: number;
  level?: number;
  keyValid?: number;
  defects?: string[];
}
interface Rubric {
  passage?: {
    english?: number;
    level?: number;
    naesin?: number;
    fidelity?: number | null;
  };
  items?: RubricItem[];
}
interface SolveAnswer {
  id: string;
  choice: number;
  alsoDefensible?: number[];
  unanswerable?: boolean;
}

function readJudge(
  out: string,
  genBase: string,
  judgeId: string,
  kind: JudgeKind,
): JudgeFile | null {
  const file = path.join(
    out,
    "judge",
    `${genBase}__${safeName(judgeId)}__${kind}.json`,
  );
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, "utf8")) as JudgeFile;
  return data.error || (!data.result && !data.empty) ? null : data;
}

function clampRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

/** 눈가림 풀이 한 번의 점수 — 정답·유일 1 · 정답이나 «다른 것도 정답 가능» 0.5 · 오답이나 키를 «동등» 표시 0.5 · 오답 0 */
function solveCredit(
  answer: SolveAnswer | undefined,
  order: number[],
  key: number,
): number | null {
  if (!answer || !Number.isInteger(answer.choice)) return null;
  const chosen = order[answer.choice - 1];
  const also = (answer.alsoDefensible ?? [])
    .map((shown) => order[shown - 1])
    .filter((v): v is number => v !== undefined);
  if (chosen === key)
    return also.some((v) => v !== key) || answer.unanswerable ? 0.5 : 1;
  return also.includes(key) ? 0.5 : 0;
}

// ─────────────────────────────────────────────
// 점수
// ─────────────────────────────────────────────
interface ItemScore {
  model: string;
  task: string;
  index: number;
  type: string;
  valid: boolean;
  d1: number;
  d2: number;
  d4: number;
  d5: number;
  keyValid: number;
  guess: number | null;
  score: number;
  /** 민감도 — 루브릭 α 가 0.67 미만이면 D4 비중을 반으로 줄여 D2 · D5 로 옮긴 점수(grok 제안 규칙) */
  scoreAlt: number;
  d2ByJudge: Record<string, number>;
  d4ByJudge: Record<string, number>;
  defects: string[];
  failedChecks: string[];
}

interface SetScore {
  model: string;
  task: string;
  parsed: boolean;
  accepted: boolean;
  ms: number | null;
  items: ItemScore[];
  itemMean: number;
  itemMeanAlt: number;
  passage: number;
  passageByJudge: Record<string, number>;
  setChecks: string[];
  score: number;
  scoreAlt: number;
}

function main() {
  const out = flag("--out");
  if (!out) throw new Error("--out <폴더> 가 필요하다");
  const genDir = path.join(out, "gen");
  const records = readdirSync(genDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      base: path.basename(f, ".json"),
      record: JSON.parse(
        readFileSync(path.join(genDir, f), "utf8"),
      ) as GenRecord,
    }));

  // 1) 루브릭 원점수를 모아 채점관 평균(중심화용)을 먼저 구한다
  type Raw = {
    set: string;
    q: number;
    judge: string;
    axis: number;
    key: number | null;
    passage: number | null;
  };
  const raws: Raw[] = [];
  const rubricOf = new Map<string, Rubric>();
  for (const { base, record } of records) {
    if (!record.parsed) continue;
    for (const judge of JUDGES) {
      const file = readJudge(out, base, judge.id, "rubric");
      const rubric = (file?.result ?? null) as Rubric | null;
      if (!rubric) continue;
      rubricOf.set(`${base}|${judge.id}`, rubric);
      const p = rubric.passage ?? {};
      const pr = [p.english, p.level, p.naesin, p.fidelity]
        .map(clampRating)
        .filter((v): v is number => v !== null);
      raws.push({
        set: base,
        q: -1,
        judge: judge.id,
        axis: NaN,
        key: null,
        passage: pr.length ? mean(pr) : null,
      });
      for (const item of rubric.items ?? []) {
        const q = Number(String(item.q).replace(/\D/g, "")) - 1;
        const axes = [
          item.distractor,
          item.typeFit,
          item.stemExplanation,
          item.level,
        ]
          .map(clampRating)
          .filter((v): v is number => v !== null);
        raws.push({
          set: base,
          q,
          judge: judge.id,
          axis: axes.length ? mean(axes) : NaN,
          key: clampRating(item.keyValid),
          passage: null,
        });
      }
    }
  }
  const judgeAxisMean = new Map<string, number>();
  const judgeKeyMean = new Map<string, number>();
  const judgePassageMean = new Map<string, number>();
  for (const judge of JUDGES) {
    const mine = raws.filter((r) => r.judge === judge.id);
    judgeAxisMean.set(
      judge.id,
      mean(mine.map((r) => r.axis).filter(Number.isFinite)),
    );
    judgeKeyMean.set(
      judge.id,
      mean(mine.map((r) => r.key).filter((v): v is number => v !== null)),
    );
    judgePassageMean.set(
      judge.id,
      mean(mine.map((r) => r.passage).filter((v): v is number => v !== null)),
    );
  }
  const grandAxis = mean([...judgeAxisMean.values()].filter(Number.isFinite));
  const grandKey = mean([...judgeKeyMean.values()].filter(Number.isFinite));
  const grandPassage = mean(
    [...judgePassageMean.values()].filter(Number.isFinite),
  );
  const centered = (
    value: number,
    judge: string,
    table: Map<string, number>,
    grand: number,
  ) => Math.min(5, Math.max(1, value - (table.get(judge) ?? grand) + grand));

  // 2) 세트마다
  const sets: SetScore[] = [];
  const alphaAxis: (number | null)[][] = [];
  const alphaSolve: (number | null)[][] = [];
  for (const { base, record } of records) {
    const task = BENCH_TASKS.find((t) => t.id === record.task)!;
    const set: SetScore = {
      model: record.model,
      task: record.task,
      parsed: record.parsed,
      accepted: record.accepted,
      ms: record.ms,
      items: [],
      itemMean: 0,
      itemMeanAlt: 0,
      passage: 0,
      passageByJudge: {},
      setChecks: [],
      score: 0,
      scoreAlt: 0,
    };
    sets.push(set);
    if (!record.parsed) continue;
    const draftAny = record.draft as {
      passage?: string;
      title?: string;
      questions?: unknown[];
    };
    const questions = Array.isArray(draftAny.questions)
      ? draftAny.questions
      : [];
    const valid = questions.map((q) => englishQuestionSchema.safeParse(q));
    const validQuestions = valid.flatMap((v) => (v.success ? [v.data] : []));
    const validIndex = valid.flatMap((v, i) => (v.success ? [i] : []));
    const draft: EnglishDraft = {
      title: String(draftAny.title ?? ""),
      source: "deepseek",
      passage: String(draftAny.passage ?? ""),
      questions: validQuestions as EnglishQuestion[],
    };
    const report = reviewEnglishDraft(draft, {
      ...task.request,
      words: task.request.words,
    });
    set.setChecks = report.set.filter((c) => !c.ok).map((c) => c.code);

    // 풀이 결과
    const solves = new Map<string, Map<number, number>>(); // judge → 문항 → credit
    const guesses = new Map<number, number[]>();
    const solveChoices = new Map<number, (number | null)[]>();
    for (const judge of JUDGES) {
      const credits = new Map<number, number>();
      for (const kind of ["solveA", "solveB", "guess"] as const) {
        const file = readJudge(out, base, judge.id, kind);
        if (!file || file.empty) continue;
        const answers = ((file.result as { answers?: SolveAnswer[] })
          ?.answers ?? []) as SolveAnswer[];
        for (const meta of file.items ?? []) {
          const question = questions[meta.index] as EnglishQuestion | undefined;
          const key = Number(question?.answer) - 1;
          const answer = answers.find((a) => a.id === meta.id);
          const credit = solveCredit(answer, meta.order, key);
          if (credit === null) continue;
          if (kind === "guess") {
            const list = guesses.get(meta.index) ?? [];
            list.push(
              credit === 1 || (answer && meta.order[answer.choice - 1] === key)
                ? 1
                : 0,
            );
            guesses.set(meta.index, list);
          } else {
            credits.set(meta.index, credit);
            const choices = solveChoices.get(meta.index) ?? [null, null, null];
            choices[JUDGES.indexOf(judge)] = answer
              ? (meta.order[answer.choice - 1] ?? null)
              : null;
            solveChoices.set(meta.index, choices);
          }
        }
      }
      solves.set(judge.id, credits);
    }
    for (const choices of solveChoices.values()) alphaSolve.push(choices);

    // 문항 점수
    const items: ItemScore[] = [];
    questions.forEach((raw, index) => {
      const v = valid[index]!;
      const type = String((raw as { type?: unknown })?.type ?? "?");
      if (!v.success) {
        items.push({
          model: record.model,
          task: record.task,
          index,
          type,
          valid: false,
          d1: 0,
          d2: 0,
          d4: 0,
          d5: 0,
          keyValid: 0,
          guess: null,
          score: 0,
          scoreAlt: 0,
          d2ByJudge: {},
          d4ByJudge: {},
          defects: ["계약 위반(유형 · 모양)"],
          failedChecks: [],
        });
        return;
      }
      const question = v.data;
      const checks = report.questions[validIndex.indexOf(index)]!.checks;
      const struct = checks.filter(
        (c) => c.kind === "structure" || c.kind === "iwf",
      );
      const evid = checks.filter((c) => c.kind === "evidence");
      const d1 = struct.length
        ? (100 * struct.filter((c) => c.ok).length) / struct.length
        : 100;
      const d5 = evid.length
        ? (100 * evid.filter((c) => c.ok).length) / evid.length
        : 100;
      const d4ByJudge: Record<string, number> = {};
      const keyByJudge: number[] = [];
      const axisRow: (number | null)[] = [];
      const defects: string[] = [];
      for (const judge of JUDGES) {
        const rubric = rubricOf.get(`${base}|${judge.id}`);
        const item = rubric?.items?.find(
          (it) => Number(String(it.q).replace(/\D/g, "")) - 1 === index,
        );
        const axes = item
          ? [item.distractor, item.typeFit, item.stemExplanation, item.level]
              .map(clampRating)
              .filter((x): x is number => x !== null)
          : [];
        if (axes.length) {
          const avg = mean(axes);
          d4ByJudge[judge.id] = to100(
            centered(avg, judge.id, judgeAxisMean, grandAxis),
          );
          axisRow.push(avg);
        } else axisRow.push(null);
        const key = clampRating(item?.keyValid);
        if (key !== null)
          keyByJudge.push(
            to100(centered(key, judge.id, judgeKeyMean, grandKey)),
          );
        for (const d of item?.defects ?? [])
          defects.push(`${judge.id.replace("judge:", "")}: ${d}`);
      }
      alphaAxis.push(axisRow);
      const d4 = mean(Object.values(d4ByJudge));
      const keyValid = mean(keyByJudge);
      const open = question.type === "서술형";
      const d2ByJudge: Record<string, number> = {};
      for (const judge of JUDGES) {
        const credit = solves.get(judge.id)?.get(index);
        if (credit !== undefined) d2ByJudge[judge.id] = 100 * credit;
      }
      const d2 = open ? keyValid : mean(Object.values(d2ByJudge));
      const g = guesses.get(index);
      const safe = (x: number) => (Number.isFinite(x) ? x : 0);
      const score = open
        ? 0.15 * d1 + 0.25 * safe(d2) + 0.5 * safe(d4) + 0.1 * d5
        : 0.1 * d1 + 0.35 * safe(d2) + 0.4 * safe(d4) + 0.15 * d5;
      const scoreAlt = open
        ? 0.15 * d1 + 0.4 * safe(d2) + 0.25 * safe(d4) + 0.2 * d5
        : 0.1 * d1 + 0.49 * safe(d2) + 0.2 * safe(d4) + 0.21 * d5;
      items.push({
        model: record.model,
        task: record.task,
        index,
        type: question.type,
        valid: true,
        d1,
        d2,
        d4,
        d5,
        keyValid,
        guess: g ? mean(g) : null,
        score,
        scoreAlt,
        d2ByJudge,
        d4ByJudge,
        defects,
        failedChecks: checks.filter((c) => !c.ok).map((c) => c.code),
      });
    });
    set.items = items;
    set.itemMean =
      items.reduce((s, it) => s + it.score, 0) /
      Math.max(EXPECTED_ITEMS, items.length);
    set.itemMeanAlt =
      items.reduce((s, it) => s + it.scoreAlt, 0) /
      Math.max(EXPECTED_ITEMS, items.length);

    // 지문
    const passageJudges: number[] = [];
    for (const judge of JUDGES) {
      const p = rubricOf.get(`${base}|${judge.id}`)?.passage;
      const pr = p
        ? [p.english, p.level, p.naesin, p.fidelity]
            .map(clampRating)
            .filter((x): x is number => x !== null)
        : [];
      if (pr.length) {
        const value = to100(
          centered(mean(pr), judge.id, judgePassageMean, grandPassage),
        );
        set.passageByJudge[judge.id] = value;
        passageJudges.push(value);
      }
    }
    const det = report.set.filter((c) => c.code.startsWith("passage."));
    const detScore = det.length
      ? (100 * det.filter((c) => c.ok).length) / det.length
      : 100;
    set.passage =
      0.8 * (passageJudges.length ? mean(passageJudges) : 0) + 0.2 * detScore;
    const w = PASSAGE_WEIGHT[record.task] ?? 0;
    set.score = set.itemMean * (1 - w) + set.passage * w;
    set.scoreAlt = set.itemMeanAlt * (1 - w) + set.passage * w;
  }

  // 3) 모델별
  const models = GENERATORS.map((g) => g.id).filter((id) =>
    sets.some((s) => s.model === id),
  );
  const rows = models.map((model) => {
    const mine = sets.filter((s) => s.model === model);
    const parsed = mine.filter((s) => s.parsed);
    const items = parsed.flatMap((s) => s.items);
    const byTask = Object.fromEntries(
      BENCH_TASKS.map((t) => [t.id, mine.find((s) => s.task === t.id)]),
    );
    const byType = Object.fromEntries(
      TYPES.map((type) => {
        const its = items.filter((it) => it.type === type);
        // 빠진 유형(생성 안 함)은 0 으로 센다 — 세트 셋 × 한 문항
        const missing = parsed.length - its.length;
        return [
          type,
          its.reduce((s, it) => s + it.score, 0) /
            Math.max(1, its.length + Math.max(0, missing)),
        ];
      }),
    );
    const objective = items.filter((it) => it.valid && it.type !== "서술형");
    const selfExcluded = (() => {
      const provider = GENERATORS.find((g) => g.id === model)!.provider;
      const others = JUDGES.filter(
        (j) => familyOf(j.provider) !== familyOf(provider),
      ).map((j) => j.id);
      const vals = items
        .filter((it) => it.valid)
        .map((it) => {
          const d4 = mean(
            others
              .map((j) => it.d4ByJudge[j])
              .filter((x): x is number => x !== undefined),
          );
          const d2 =
            it.type === "서술형"
              ? it.d2
              : mean(
                  others
                    .map((j) => it.d2ByJudge[j])
                    .filter((x): x is number => x !== undefined),
                );
          return it.type === "서술형"
            ? 0.15 * it.d1 + 0.25 * (d2 || 0) + 0.5 * (d4 || 0) + 0.1 * it.d5
            : 0.1 * it.d1 + 0.35 * (d2 || 0) + 0.4 * (d4 || 0) + 0.15 * it.d5;
        });
      return mean(vals);
    })();
    return {
      model,
      quality: mean(parsed.map((s) => s.score)),
      qualityAlt: mean(parsed.map((s) => s.scoreAlt)),
      operational: mean(
        mine.map((s) => (s.parsed && s.accepted ? s.score : 0)),
      ),
      adoption:
        mine.filter((s) => s.accepted).length / Math.max(1, mine.length),
      parsedRate: parsed.length / Math.max(1, mine.length),
      byTask: Object.fromEntries(
        Object.entries(byTask).map(([k, s]) => [k, s?.parsed ? s.score : null]),
      ),
      byType,
      axes: {
        d1: mean(items.filter((it) => it.valid).map((it) => it.d1)),
        d2: mean(objective.map((it) => it.d2).filter(Number.isFinite)),
        d4: mean(
          items
            .filter((it) => it.valid)
            .map((it) => it.d4)
            .filter(Number.isFinite),
        ),
        d5: mean(items.filter((it) => it.valid).map((it) => it.d5)),
        passage: mean(
          parsed.filter((s) => s.task !== "A-original").map((s) => s.passage),
        ),
        guess: mean(
          items.map((it) => it.guess).filter((x): x is number => x !== null),
        ),
      },
      byJudge: Object.fromEntries(
        JUDGES.map((j) => [
          j.id,
          mean(
            items
              .map((it) => it.d4ByJudge[j.id])
              .filter((x): x is number => x !== undefined),
          ),
        ]),
      ),
      selfExcluded,
      latencySec:
        mean(mine.map((s) => s.ms).filter((x): x is number => x !== null)) /
        1000,
    };
  });
  rows.sort((a, b) => (b.quality || 0) - (a.quality || 0));

  // 과제 하나를 빼도 1위가 유지되나
  const leaveOneOut = BENCH_TASKS.map((t) => {
    const ranked = rows
      .map((r) => ({
        model: r.model,
        v: mean(
          BENCH_TASKS.filter((x) => x.id !== t.id)
            .map((x) => r.byTask[x.id])
            .filter((x): x is number => x !== null && x !== undefined),
        ),
      }))
      .sort((a, b) => b.v - a.v);
    return { without: t.id, first: ranked[0]?.model };
  });

  const alpha = {
    rubricInterval: krippendorff(alphaAxis, "interval"),
    solveNominal: krippendorff(alphaSolve, "nominal"),
  };
  const failCounts = new Map<string, number>();
  for (const s of sets)
    for (const it of s.items)
      for (const c of it.failedChecks)
        failCounts.set(c, (failCounts.get(c) ?? 0) + 1);

  writeFileSync(
    path.join(out, "scores.json"),
    JSON.stringify(
      {
        rows,
        sets,
        alpha,
        leaveOneOut,
        failCounts: Object.fromEntries(failCounts),
      },
      null,
      2,
    ),
    "utf8",
  );

  // 4) 보고서
  const f = (x: number | null | undefined) =>
    x === null || x === undefined || !Number.isFinite(x)
      ? "–"
      : r1(x).toFixed(1);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const lines: string[] = [];
  lines.push(
    `# 오늘의 영어 — 모델별 문항 생성 점수 (프롬프트 ${records[0]?.record.promptVersion ?? "?"})`,
    "",
  );
  lines.push(
    "| 순위 | 모델 | 품질 | 운영 | 채택률 | A 원문유지 | B 새지문 | C 변형 | 자기계열 제외 | 지연(초) |",
    "|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|",
  );
  rows.forEach((r, i) =>
    lines.push(
      `| ${i + 1} | ${r.model} | **${f(r.quality)}** | ${f(r.operational)} | ${pct(r.adoption)} | ${f(r.byTask["A-original"])} | ${f(r.byTask["B-new"])} | ${f(r.byTask["C-variation"])} | ${f(r.selfExcluded)} | ${f(r.latencySec)} |`,
    ),
  );
  lines.push(
    "",
    "## 유형별",
    "",
    `| 모델 | ${TYPES.join(" | ")} |`,
    `|---|${TYPES.map(() => "---:").join("|")}|`,
  );
  rows.forEach((r) =>
    lines.push(
      `| ${r.model} | ${TYPES.map((t) => f(r.byType[t])).join(" | ")} |`,
    ),
  );
  lines.push(
    "",
    "## 축별",
    "",
    "| 모델 | D1 구조·IWF | D2 눈가림 정답 | D4 루브릭 | D5 근거·일관 | 지문(B·C) | 지문 없이 맞힘(진단) |",
    "|---|---:|---:|---:|---:|---:|---:|",
  );
  rows.forEach((r) =>
    lines.push(
      `| ${r.model} | ${f(r.axes.d1)} | ${f(r.axes.d2)} | ${f(r.axes.d4)} | ${f(r.axes.d5)} | ${f(r.axes.passage)} | ${Number.isFinite(r.axes.guess) ? pct(r.axes.guess) : "–"} |`,
    ),
  );
  lines.push(
    "",
    "## 채점관별 루브릭(D4, 중심화)",
    "",
    `| 모델 | ${JUDGES.map((j) => j.id.replace("judge:", "")).join(" | ")} |`,
    `|---|${JUDGES.map(() => "---:").join("|")}|`,
  );
  rows.forEach((r) =>
    lines.push(
      `| ${r.model} | ${JUDGES.map((j) => f(r.byJudge[j.id])).join(" | ")} |`,
    ),
  );
  lines.push(
    "",
    "## 신뢰도",
    "",
    `- 루브릭(문항 축 평균) Krippendorff α(구간): ${alpha.rubricInterval.toFixed(3)}`,
    `- 눈가림 풀이 선택 Krippendorff α(명목): ${alpha.solveNominal.toFixed(3)}`,
    `- 과제 하나를 뺀 1위: ${leaveOneOut.map((l) => `${l.without} 제외 → ${l.first}`).join(" · ")}`,
  );
  lines.push(
    "",
    "## 결정적 검사 실패 횟수(전 모델)",
    "",
    ...[...failCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => `- ${c}: ${n}`),
  );
  writeFileSync(path.join(out, "report.md"), lines.join("\n"), "utf8");
  console.log(lines.slice(0, 30).join("\n"));
}

main();
