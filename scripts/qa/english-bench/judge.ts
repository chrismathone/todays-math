/**
 * 오늘의 영어 모델 벤치 ② 채점 — 채점관 셋(grok · codex · claude)이 생성물마다 네 번 본다. 생성 모델 이름은 가린다.
 *
 *   npx tsx scripts/qa/english-bench/judge.ts --out <폴더> [--lanes 4] [--judges judge:codex,judge:claude]
 *
 * 설계(리드 · codex · grok 합의, 2026-09-30):
 *   solveA  — **정답을 못 보고** 원 지문 + 주제 · 내용 일치를 푼다(보기 순서는 섞는다 — 위치 편향).
 *   solveB  — 원 지문 **없이** 어법 · 빈칸 · 삽입을 문항 속 지문만으로 푼다(원 지문을 보면 답이 샌다).
 *   guess   — 지문 없이 주제 · 내용 일치를 찍는다(지문 의존도 — 총점 밖 진단). 🔴 한 세트의 문항을 **같이** 보여 준다 —
 *             내용 일치의 맞는 보기들이 지문 내용을 알려 줘 주제의 답이 샌다(2026-09-30 v4 에서 확인).
 *   guessEach — 같은 것을 문항 **하나씩 따로**(`--kinds guessEach`). 문항 하나가 보기만으로 풀리는지는 이쪽이 잰다.
 *   rubric  — 정답 · 해설 · 근거를 보고 문항 축(1~5)과 지문 축(1~5)을 매긴다. 정답 유일성은 solve 가 맡는다.
 * 결과: `<out>/judge/<생성파일>__<채점관>__<종류>.json`. 이미 있으면 건너뛴다(재개).
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import type { EnglishQuestion } from "@/contracts/english.contract";

import { runCli } from "./cli";
import type { GenRecord } from "./generate";
import { JUDGES, type BenchModel } from "./models";
import { findTask } from "./taskIndex";
import { extractJsonObject, flag, pool, safeName } from "./util";

export const SOLVE_A_TYPES = ["주제", "내용 일치"];
export const SOLVE_B_TYPES = ["어법", "빈칸 추론", "문장 삽입"];
/** `guessEach` 는 기본 채점에 안 들어간다(`--kinds guessEach` 로만) — 문항을 **하나씩 따로** 지문 없이 푼다(25 §12.9) */
export const JUDGE_KINDS = ["solveA", "solveB", "guess", "rubric"] as const;
export const EXTRA_KINDS = ["guessEach"] as const;
export type JudgeKind =
  (typeof JUDGE_KINDS)[number] | (typeof EXTRA_KINDS)[number];

const CIRCLED = ["①", "②", "③", "④", "⑤"];

/** 보기 섞기 — 같은 문항은 늘 같은 순서(재현). `order[shown] = 원래 번호(0부터)` */
export function shuffleOrder(seed: string): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const order = [0, 1, 2, 3, 4];
  for (let i = order.length - 1; i > 0; i -= 1) {
    h = Math.imul(h ^ (h >>> 13), 1597334677) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

interface Item {
  id: string;
  index: number;
  question: EnglishQuestion;
  order: number[];
}

function itemsOf(record: GenRecord, types: string[], shuffle: boolean): Item[] {
  const draft = record.draft as { questions?: EnglishQuestion[] } | null;
  return (draft?.questions ?? [])
    .map((question, index) => ({ question, index }))
    .filter(
      ({ question }) =>
        types.includes(question.type) &&
        Array.isArray(question.options) &&
        question.options.length === 5,
    )
    .map(({ question, index }) => ({
      id: `q${index + 1}`,
      index,
      question,
      order: shuffle
        ? shuffleOrder(`${record.model}|${record.task}|${index}`)
        : [0, 1, 2, 3, 4],
    }));
}

function renderItem(item: Item): string {
  const options = item.order
    .map(
      (original, shown) =>
        `${CIRCLED[shown]} ${item.question.options[original]}`,
    )
    .join("\n");
  return `[${item.id}]\n${item.question.prompt}\n${options}`;
}

const SOLVER_SYSTEM =
  "당신은 한국 고등학교 영어 시험을 치르는 우수한 학생이자 검토자입니다. 주어진 글과 문항만으로 풉니다. 정답을 모르는 상태에서 스스로 풉니다. 반드시 JSON 객체 하나로만 답합니다.";

const SOLVE_FORMAT =
  '{"answers":[{"id":"q1","choice":3,"alsoDefensible":[],"unanswerable":false}]}\n' +
  "- choice: 가장 알맞은 보기 번호(1~5).\n" +
  "- alsoDefensible: 발문 조건을 **똑같이** 충족해 정답으로 인정해야 할 다른 보기 번호(없으면 빈 배열). 조금 그럴듯한 정도는 넣지 않습니다.\n" +
  "- unanswerable: 주어진 정보만으로는 풀 수 없으면 true(그래도 choice 는 가장 가까운 것).";

function solvePrompt(
  kind: "solveA" | "solveB" | "guess",
  passage: string,
  items: Item[],
): string {
  const head =
    kind === "solveA"
      ? `다음 글을 읽고 문항을 푸십시오.\n\n[글]\n${passage}\n`
      : kind === "solveB"
        ? "다음 문항을 푸십시오. 각 문항에 필요한 글은 문항 안에 있습니다.\n"
        : "다음 문항의 글은 일부러 보여 주지 않습니다. 발문과 보기만 보고 가장 그럴듯한 답을 고르십시오(추측이어도 됩니다).\n";
  return `${head}\n${items.map(renderItem).join("\n\n")}\n\n답 형식(JSON 하나):\n${SOLVE_FORMAT}`;
}

const RUBRIC_SYSTEM =
  "당신은 한국 중·고등학교 영어 내신 시험 문항을 검수하는 수석 출제위원입니다. 엄격하고 일관되게 채점합니다. 반드시 JSON 객체 하나로만 답합니다.";

function rubricPrompt(record: GenRecord): string {
  const task = findTask(record.task);
  const draft = record.draft as {
    passage?: string;
    questions?: EnglishQuestion[];
  };
  const conditions = [
    `대상 학년: ${task.grade}`,
    `난이도 설정: ${task.request.difficulty}`,
    `제작 방식: ${task.request.mode === "original" ? "원문 유지(원문 그대로, 문제만 출제)" : task.request.mode === "new" ? `새 지문(소재: ${task.request.topic}, 약 ${task.request.words}단어)` : `원문 변형(원문의 소재·구성을 살려 약 ${task.request.words}단어로 바꿔 씀)`}`,
  ];
  const source =
    task.request.mode === "variation"
      ? `\n[변형 전 원문]\n${task.request.passage}\n`
      : "";
  const questions = (draft.questions ?? [])
    .map((q, i) => {
      const options =
        Array.isArray(q.options) && q.options.length
          ? `\n${q.options.map((o, k) => `${CIRCLED[k] ?? k + 1} ${o}`).join("\n")}`
          : "";
      return `[q${i + 1}] 유형: ${q.type}\n${q.prompt}${options}\n정답: ${q.answer}\n해설: ${q.explanation}\n근거: ${q.evidence}`;
    })
    .join("\n\n");
  return `다음은 AI 가 만든 영어 내신 문항 세트입니다. 조건과 한국 내신·수능 영어 출제 관행에 비추어 채점하십시오.

[조건]
${conditions.join("\n")}
${source}
[지문]
${draft.passage ?? ""}

[문항]
${questions}

[채점 기준 — 모두 1~5 정수, 5가 최고]
지문(passage):
- english: 영어의 문법·자연스러움·논리 흐름
- level: 대상 학년·난이도 설정에 맞는 어휘·구문
- naesin: 내신 지문다움(주제 명료, 출제 포인트가 있음)
- fidelity: 원문 변형이면 원문 의미·구성 보존과 적절한 재서술 / 새 지문이면 소재 충실도 / 원문 유지면 null
문항(items, 문항마다):
- distractor: 객관식은 오답의 매력도(그럴듯하지만 분명히 틀림, 서로 다른 오류 유형) / 서술형은 채점 기준의 명확성(부분점수 요소)
- typeFit: 한국 내신 해당 유형의 관행 충실도(어법=밑줄 다섯 중 오류 하나·교육과정 문법 포인트, 빈칸=핵심 자리, 삽입=단서가 한 자리만 연다, 내용 일치=최소 변형 오답, 주제=범위가 맞는 정답)
- stemExplanation: 발문의 명확성과 해설의 질(정답 근거 · 오답이 틀린 이유)
- level: 학년·난이도 설정에 맞는 문항 난도
- keyValid: 정답(서술형은 모범 답안)이 옳고 유일한가(5=확실히 옳고 유일, 1=틀림)
- defects: 발견한 결함을 짧은 한국어 구절 배열로(없으면 빈 배열)

답 형식(JSON 하나):
{"passage":{"english":4,"level":4,"naesin":4,"fidelity":null},"items":[{"q":"q1","distractor":4,"typeFit":4,"stemExplanation":4,"level":4,"keyValid":5,"defects":[]}]}`;
}

async function judgeOne(
  genFile: string,
  record: GenRecord,
  judge: BenchModel,
  kind: JudgeKind,
  out: string,
  cwd: string,
): Promise<void> {
  const file = path.join(
    out,
    "judge",
    `${path.basename(genFile, ".json")}__${safeName(judge.id)}__${kind}.json`,
  );
  // 재개 — 이미 있고 읽힌 것만 건너뛴다(읽기 실패는 다시 부른다)
  if (
    existsSync(file) &&
    !(JSON.parse(readFileSync(file, "utf8")) as { error?: string | null }).error
  )
    return;
  const passage = (record.draft as { passage?: string }).passage ?? "";
  if (kind === "guessEach") {
    // 문항마다 따로 부른다 — 다른 문항의 보기가 단서가 되지 않게
    const each = itemsOf(record, SOLVE_A_TYPES, true);
    if (!each.length) {
      writeFileSync(file, JSON.stringify({ kind, empty: true }), "utf8");
      return;
    }
    const answers: unknown[] = [];
    let total = 0;
    try {
      for (const item of each) {
        const { text, ms } = await runCli({
          provider: judge.provider,
          model: judge.model,
          effort: judge.effort,
          system: SOLVER_SYSTEM,
          prompt: solvePrompt("guess", "", [item]),
          cwd,
        });
        total += ms;
        const one = extractJsonObject(text) as { answers?: unknown[] };
        answers.push(...(one.answers ?? []));
      }
      writeFileSync(
        file,
        JSON.stringify(
          {
            kind,
            judge: judge.id,
            ms: total,
            items: each.map(({ id, index, order }) => ({ id, index, order })),
            result: { answers },
            error: null,
          },
          null,
          2,
        ),
        "utf8",
      );
      console.log(
        `완료  ${judge.id}  ${kind}  ${path.basename(genFile)}  ${total}ms`,
      );
    } catch (e) {
      console.log(
        `실패  ${judge.id}  ${kind}  ${path.basename(genFile)}  ${(e as Error).message.slice(0, 200)}`,
      );
    }
    return;
  }
  let prompt: string;
  let system: string;
  let items: Item[] = [];
  if (kind === "rubric") {
    system = RUBRIC_SYSTEM;
    prompt = rubricPrompt(record);
  } else {
    items =
      kind === "solveB"
        ? itemsOf(record, SOLVE_B_TYPES, false)
        : itemsOf(record, SOLVE_A_TYPES, true);
    if (!items.length) {
      writeFileSync(file, JSON.stringify({ kind, empty: true }), "utf8");
      return;
    }
    system = SOLVER_SYSTEM;
    prompt = solvePrompt(kind, passage, items);
  }
  try {
    const { text, ms } = await runCli({
      provider: judge.provider,
      model: judge.model,
      effort: judge.effort,
      system,
      prompt,
      cwd,
    });
    let result: unknown = null;
    let error: string | null = null;
    try {
      result = extractJsonObject(text);
    } catch (e) {
      error = `읽기 실패: ${(e as Error).message}`;
    }
    writeFileSync(
      file,
      JSON.stringify(
        {
          kind,
          judge: judge.id,
          ms,
          items: items.map(({ id, index, order }) => ({ id, index, order })),
          result,
          error,
          raw: error ? text : undefined,
        },
        null,
        2,
      ),
      "utf8",
    );
    console.log(
      `${error ? "읽기실패" : "완료"}  ${judge.id}  ${kind}  ${path.basename(genFile)}  ${ms}ms`,
    );
  } catch (e) {
    const err = e as Error & { detail?: string };
    console.log(
      `실패  ${judge.id}  ${kind}  ${path.basename(genFile)}  ${err.message} ${err.detail?.slice(0, 200) ?? ""}`,
    );
  }
}

async function main() {
  const out = flag("--out");
  if (!out) throw new Error("--out <폴더> 가 필요하다");
  const lanes = Number(flag("--lanes") ?? 4);
  const only = flag("--judges")?.split(",");
  const match = flag("--match");
  const changedFrom = flag("--changed-from");
  // 종류 거르기 — 느린 채점관은 총점 밖 진단(guess)을 뺄 수 있다(grok 루브릭 한 건 ~4분, 2026-09-30)
  const kinds = (flag("--kinds")?.split(",") ?? [
    ...JUDGE_KINDS,
  ]) as JudgeKind[];
  const cwd = path.join(out, "cwd");
  mkdirSync(path.join(out, "judge"), { recursive: true });
  mkdirSync(cwd, { recursive: true });
  const genDir = path.join(out, "gen");
  const gens = readdirSync(genDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      file: path.join(genDir, f),
      record: JSON.parse(
        readFileSync(path.join(genDir, f), "utf8"),
      ) as GenRecord,
    }))
    .filter(({ record }) => record.parsed && record.draft)
    .filter(({ file }) => !match || path.basename(file).includes(match))
    // 쪼기 루프: 앞 회차와 초안이 같은 세트는 다시 채점하지 않는다(그 회차 채점을 옮겨 쓴다 — sync-unchanged)
    .filter(({ file, record }) => {
      if (!changedFrom) return true;
      const before = path.join(changedFrom, "gen", path.basename(file));
      if (!existsSync(before)) return true;
      const old = JSON.parse(readFileSync(before, "utf8")) as GenRecord;
      return JSON.stringify(old.draft) !== JSON.stringify(record.draft);
    });
  const judges = JUDGES.filter((j) => !only || only.includes(j.id));
  await Promise.all(
    judges.map((judge) =>
      pool(
        gens.flatMap(({ file, record }) =>
          kinds.map(
            (kind) => () => judgeOne(file, record, judge, kind, out, cwd),
          ),
        ),
        lanes,
      ),
    ),
  );
  console.log("채점 끝");
}

// 점수 단계(score.ts)가 상수만 가져갈 때는 돌지 않는다
if (/judge\.ts$/.test(process.argv[1] ?? "")) void main();
