/**
 * 오늘의 영어 모델 벤치 ① 생성 — 모델 × 과제마다 **제품 프롬프트 그대로** 한 번 부른다.
 *
 *   npx tsx scripts/qa/english-bench/generate.ts --out <폴더> [--only codex:gpt-6-astra,claude:opus] [--prompt v1|v2] [--lanes 2]
 *
 *   [--tasks C-variation] 로 과제만 고를 수 있다. [--taskset v4] 는 v4 용 새 지문 열둘.
 * 결과: `<out>/gen/<모델>__<과제>.json` — 원문 응답 · 지연 · 읽기/검증기 판정. 이미 있는 파일은 건너뛴다(재개).
 * 제품 경로와 같게: 프롬프트(`buildEnglishSystemPrompt`/`buildEnglishUserPrompt`) → `parseAiJsonObject`
 *   → `coerceEnglishDraftShape` → `validateEnglishDraft(값, 요청)`.
 * ⚠️ DB·유료 API 를 건드리지 않는다. 구독 CLI 만 부른다.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import * as promptCurrent from "@/lib/ai/prompts/englishExam";
import { coerceEnglishDraftShape } from "@/lib/english/chatgpt";
import { validateEnglishDraft } from "@/lib/english/validate";

import { runCli, type Provider } from "./cli";
import * as promptV1 from "./promptV1";
import * as promptV2 from "./promptV2";
import * as promptV3 from "./promptV3";
import { isV4Version, v4Prompt } from "./promptV4";
import { isStrictVersion, strictPrompt } from "./promptStrict";
import { GENERATORS, type BenchModel } from "./models";
import { BENCH_TASKS, type BenchTask } from "./tasks";
import { V4_TASKS } from "./tasksV4";
import { flag, pool, safeName } from "./util";

export interface GenRecord {
  model: string;
  provider: Provider;
  task: string;
  promptVersion: string;
  ms: number | null;
  /** 부른 횟수 — 읽기 실패면 한 번 더(제품과 같음) */
  attempts?: number;
  /** 토큰 사용량(부른 횟수 합) — cli.ts 가 받아 온 것. 비용 추정용 */
  usage?: { input: number; output: number; reasoning: number };
  raw: string | null;
  error: string | null;
  parsed: boolean;
  draft: unknown;
  accepted: boolean;
  issues: { question: number | null; message: string }[];
}

/** `--prompt v1`·`v2`·`v3` 면 얼려 둔 판, `v2s…v2s5` 는 근거 규칙 시험판, `v4a`·`v4b` 는 주제·내용 일치 시험판, 아니면 제품 프롬프트 */
const PROMPT_FLAG = flag("--prompt");
const PROMPT =
  PROMPT_FLAG === "v1"
    ? promptV1
    : PROMPT_FLAG === "v2"
      ? promptV2
      : PROMPT_FLAG === "v3"
        ? promptV3
        : isV4Version(PROMPT_FLAG)
          ? v4Prompt(PROMPT_FLAG)
          : isStrictVersion(PROMPT_FLAG)
            ? strictPrompt(PROMPT_FLAG)
            : promptCurrent;
/** 한 번 부를 때의 제한(분) — 기본 12. 느린 모델을 부하 없이 다시 잴 때 늘린다(grok-4.7, 2026-09-30) */
const TIMEOUT_MS = Number(flag("--timeout-min") ?? 12) * 60_000;

async function generateOne(
  model: BenchModel,
  task: BenchTask,
  out: string,
  cwd: string,
): Promise<void> {
  const file = path.join(out, "gen", `${safeName(model.id)}__${task.id}.json`);
  if (existsSync(file)) return;
  const record: GenRecord = {
    model: model.id,
    provider: model.provider,
    task: task.id,
    promptVersion: PROMPT.ENGLISH_EXAM_PROMPT_VERSION,
    ms: null,
    raw: null,
    error: null,
    parsed: false,
    draft: null,
    accepted: false,
    issues: [],
  };
  try {
    // 제품 DeepSeek 경로와 같게 **JSON 을 못 읽으면 한 번만 다시** 부른다(`withOneRetryOnParseFailure`).
    // 구독 CLI 는 에이전트 틀이라 «검사한 뒤 내겠다» 머리말만 내고 끝나는 일이 있다(grok · agy 실측 2026-09-30).
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const { text, ms, usage } = await runCli({
        provider: model.provider,
        model: model.model,
        effort: model.effort,
        system: PROMPT.buildEnglishSystemPrompt(),
        prompt: PROMPT.buildEnglishUserPrompt(task.request, task.grade),
        cwd,
        timeoutMs: TIMEOUT_MS,
      });
      record.ms = (record.ms ?? 0) + ms;
      if (usage)
        record.usage = {
          input: (record.usage?.input ?? 0) + (usage.input ?? 0),
          output: (record.usage?.output ?? 0) + usage.output,
          reasoning: (record.usage?.reasoning ?? 0) + (usage.reasoning ?? 0),
        };
      record.raw = text;
      record.attempts = attempt;
      try {
        const value = coerceEnglishDraftShape(
          parseAiJsonObject(text),
          "deepseek",
        );
        record.parsed = true;
        record.error = null;
        record.draft = value;
        const verdict = validateEnglishDraft(value, task.request);
        record.accepted = verdict.ok;
        if (!verdict.ok) record.issues = verdict.issues;
        break;
      } catch (error) {
        record.error = `읽기 실패: ${(error as Error).message}`;
      }
    }
  } catch (error) {
    const e = error as Error & { detail?: string };
    record.error = `${e.message}${e.detail ? ` — ${e.detail}` : ""}`;
  }
  writeFileSync(file, JSON.stringify(record, null, 2), "utf8");
  console.log(
    `${record.accepted ? "통과" : record.parsed ? "거절" : "실패"}  ${model.id}  ${task.id}  ${record.ms ?? "-"}ms${record.error ? `  ${record.error.slice(0, 120)}` : ""}`,
  );
}

async function main() {
  const out = flag("--out");
  if (!out) throw new Error("--out <폴더> 가 필요하다");
  const only = flag("--only")?.split(",");
  const lanes = Number(flag("--lanes") ?? 2);
  const cwd = path.join(out, "cwd");
  mkdirSync(path.join(out, "gen"), { recursive: true });
  mkdirSync(cwd, { recursive: true });
  const models = GENERATORS.filter((m) => !only || only.includes(m.id));
  // 과제 고르기(같은 과제를 여러 회차로 잴 때 — 2026-09-30 luna 근거 조이기)
  const tasks = flag("--tasks")?.split(",");
  // 회사(CLI)마다 따로 줄을 세운다 — 한 회사의 한도가 다른 회사를 막지 않게
  const byProvider = new Map<Provider, (() => Promise<void>)[]>();
  // `--taskset v4` — 주제 · 내용 일치만 재는 새 지문 열둘(tasksV4.ts)
  const taskset = flag("--taskset") === "v4" ? V4_TASKS : BENCH_TASKS;
  for (const task of taskset.filter((t) => !tasks || tasks.includes(t.id)))
    for (const model of models) {
      const jobs = byProvider.get(model.provider) ?? [];
      jobs.push(() => generateOne(model, task, out, cwd));
      byProvider.set(model.provider, jobs);
    }
  await Promise.all([...byProvider.values()].map((jobs) => pool(jobs, lanes)));
  console.log("생성 끝");
}

void main();
