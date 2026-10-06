/**
 * 함정 칩 — 후보를 개념 단위로 Jev 에 묻고(이어 하기 된다), 받은 답으로 수율을 센다. 규칙 · 결과는 README.md.
 * 🔴 함정 표를 쓰는 단계는 없다 — 작은 표본이 미리 적은 기준(T3)을 못 넘었고 수율도 낮았다(README «결과»).
 *
 *   npx tsx scripts/qa/fading-traps/run.ts --dry              # 보내지 않고 요청 · 물음 수만
 *   npx tsx scripts/qa/fading-traps/run.ts [--limit N]        # 묻는다(개념 N개만 — 고정 해시 차례)
 *   npx tsx scripts/qa/fading-traps/run.ts --report           # 받은 답으로 수율만 다시 센다
 *
 * 키: 환경의 TYPESAFE_API_KEY 만 읽는다. 값 · 응답 본문을 찍지 않는다.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fadingTargets } from "../../../src/lib/fading/concepts";
import {
  CANDIDATES_PER_CONCEPT,
  MODEL,
  USD_PER_INPUT_TOKEN,
  allConcepts,
  askNoul,
  authoredTraps,
  candidatesFor,
  fnv,
  referenceOf,
  substituted,
  type Candidate,
  type FadingConcept,
} from "./lib";

const RAW_DIR = join(".qa-artifacts", "fading-traps");
const RAW = join(RAW_DIR, "full.jsonl");
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name: string) => process.argv.includes(`--${name}`);
const limit = Number(arg("limit") ?? Infinity);
const concurrency = Math.max(1, Number(arg("concurrency") ?? 4));

type Job = {
  concept: FadingConcept;
  candidates: Candidate[];
  questions: {
    id: string;
    candidate: number;
    targetId: string;
    statement: string;
  }[];
};

/** 개념마다 — 은행이 쓴 오개념 전부 + 이웃 핵심어 여덟, 후보마다 그 개념의 모든 빈칸에 넣어 본다. */
function jobs(): Job[] {
  const concepts = allConcepts();
  const bySection = new Map<string, FadingConcept[]>();
  for (const c of concepts)
    bySection.set(c.section, [...(bySection.get(c.section) ?? []), c]);
  return concepts
    .map((concept) => {
      const authored = authoredTraps(concept);
      const taken = new Set(authored.map((c) => c.text));
      const candidates = [
        ...authored,
        ...candidatesFor(concept, bySection.get(concept.section)!)
          .filter((c) => !taken.has(c.text))
          .slice(0, CANDIDATES_PER_CONCEPT),
      ];
      const questions = candidates.flatMap((candidate, n) =>
        fadingTargets(concept)
          // 은행이 «틀렸다»고 적은 그 빈칸은 묻지 않는다 — 은행의 답이 기준이다.
          .filter((t) => candidate.authored?.targetId !== t.id)
          .map((t, k) => ({
            id: `q${n}_${k}`,
            candidate: n,
            targetId: t.id,
            statement: substituted(concept, t.id, candidate.text).text,
          })),
      );
      return { concept, candidates, questions };
    })
    .filter((job) => job.candidates.length > 0)
    .sort((a, b) => fnv(`run:${a.concept.id}`) - fnv(`run:${b.concept.id}`));
}

type Row = {
  conceptId: string;
  ok: boolean;
  error?: string;
  inputTokens?: number;
  /** 후보의 글 → 빈칸마다의 noul(못 잰 것은 null). 묻지 않은 빈칸(은행이 적은 것)은 없다. */
  answers: Record<string, Record<string, number | null>>;
};
const readRows = (): Map<string, Row> => {
  const rows = new Map<string, Row>();
  if (existsSync(RAW))
    for (const line of readFileSync(RAW, "utf8").split("\n").filter(Boolean)) {
      const row = JSON.parse(line) as Row;
      if (row.ok) rows.set(row.conceptId, row);
    }
  return rows;
};

/** 남는 후보 — 물은 **모든** 빈칸에서 문턱 이하(못 잰 빈칸이 하나라도 있으면 남기지 않는다). */
function kept(job: Job, row: Row | undefined, cut: number): Candidate[] {
  if (!row) return [];
  return job.candidates.filter((candidate, n) => {
    const answers = row.answers[candidate.text];
    if (!answers) return false;
    return job.questions
      .filter((q) => q.candidate === n)
      .every((q) => {
        const noul = answers[q.targetId];
        return typeof noul === "number" && noul <= cut;
      });
  });
}

function report(all: Job[]) {
  const rows = readRows();
  const asked = all.filter((job) => rows.has(job.concept.id));
  let tokens = 0;
  for (const row of rows.values()) tokens += row.inputTokens ?? 0;
  console.info(
    `개념 ${allConcepts().length} · 후보가 있는 개념 ${all.length} · 물은 개념 ${asked.length} · 입력 토큰 ${tokens} (${(tokens * USD_PER_INPUT_TOKEN).toFixed(3)}달러)`,
  );
  // 문턱은 견줘 보려고 여럿 찍는다 — 규칙이 정한 값은 0.1 하나다(README).
  for (const cut of [0.1, 0.2, 0.3, 0.5]) {
    let candidates = 0;
    let survivors = 0;
    let concepts = 0;
    let ox = 0;
    let oxKept = 0;
    for (const job of asked) {
      const left = kept(job, rows.get(job.concept.id), cut);
      candidates += job.candidates.length;
      survivors += left.length;
      if (left.length) concepts += 1;
      ox += job.candidates.filter((c) => c.source === "ox").length;
      oxKept += left.filter((c) => c.source === "ox").length;
    }
    console.info(
      `문턱 ${cut}: 후보 ${candidates} 가운데 남은 것 ${survivors} (${((100 * survivors) / Math.max(1, candidates)).toFixed(1)}%) · 하나라도 남은 개념 ${concepts}/${asked.length} · 은행이 쓴 것 ${oxKept}/${ox}`,
    );
  }
}

async function main() {
  const all = jobs();
  if (flag("report")) return report(all);
  const todo = all.slice(0, limit);
  console.info(
    `개념 ${todo.length}/${all.length} · 후보 ${todo.reduce((n, j) => n + j.candidates.length, 0)} · 물음 ${todo.reduce((n, j) => n + j.questions.length, 0)} · 판 ${MODEL}`,
  );
  if (flag("dry")) return;
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) throw new Error("TYPESAFE_API_KEY 가 없다 — 재지 못했다.");
  mkdirSync(RAW_DIR, { recursive: true });
  const reference = referenceOf(allConcepts());
  const done = readRows();
  const queue = todo.filter((job) => !done.has(job.concept.id));
  let failed = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (;;) {
        const job = queue.shift();
        if (!job) return;
        const [grade, chapter, unit] = job.concept.section.split("::");
        const result = await askNoul(
          apiKey,
          {
            grade,
            chapter,
            unit,
            reference: reference.get(job.concept.section)!.map((r) => r.text),
          },
          job.questions.map((q) => ({ id: q.id, statement: q.statement })),
        );
        if (!result.ok) failed += 1;
        const answers: Row["answers"] = {};
        for (const q of job.questions) {
          const text = job.candidates[q.candidate]!.text;
          (answers[text] ??= {})[q.targetId] = result.answers[q.id] ?? null;
        }
        const row: Row = {
          conceptId: job.concept.id,
          ok: result.ok,
          error: result.error,
          inputTokens: result.inputTokens,
          answers,
        };
        appendFileSync(RAW, `${JSON.stringify(row)}\n`);
      }
    }),
  );
  console.info(`실패한 요청 ${failed}`);
  report(all);
}
void main();
