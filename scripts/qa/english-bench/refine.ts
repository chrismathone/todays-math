/**
 * 오늘의 영어 모델 벤치 ④ «강하게 쪼기» — 만든 세트에 **객관적 지적**(제품 검증기 + 결정적 검사)을 되먹여 고쳐 쓰게 한다.
 *
 *   npx tsx scripts/qa/english-bench/refine.ts --from <v2 폴더> --out <루프 폴더> [--only …] [--rounds 2] [--lanes 2]
 *
 * 원장님 2026-09-30 «하네스를 깊게 찔러 넣어도 결과가 같은지 · 강력하게 쪼으면 퀄리티가 올라가는지».
 * 설계: 지적이 없으면 멈춘다. 지적된 문항만 고치고 나머지는 그대로 두라고 한다. 되먹임은 모델 자신의 «반성»이 아니라
 * 기계가 잰 사실만 쓴다(ICLR 2024 «LLM 은 외부 피드백 없이 스스로 추론을 못 고친다» — codex 조사).
 * 결과: `<out>/gen/<같은 이름>.json` — `rounds`(회차별 지적 수) 를 더 적는다. 채점은 judge.ts 를 그대로 돌린다.
 * 되먹임(`englishDraftFeedback`)과 고쳐 쓰기 요청문(`buildEnglishRefinePrompt`)은 **제품 DeepSeek 경로와 같은 함수**다.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import * as prompt from "@/lib/ai/prompts/englishExam";
import { coerceEnglishDraftShape } from "@/lib/english/chatgpt";
import { englishDraftFeedback } from "@/lib/english/feedback";
import { validateEnglishDraft } from "@/lib/english/validate";

import { runCli } from "./cli";
import type { GenRecord } from "./generate";
import { GENERATORS } from "./models";
import { BENCH_TASKS, type BenchTask } from "./tasks";
import { flag, pool } from "./util";

/** 지적 목록 — 제품 되먹임(`src/lib/english/feedback.ts`) 그대로 */
export function feedbackOf(value: unknown, task: BenchTask): string[] {
  return englishDraftFeedback(value, {
    ...task.request,
    words: task.request.words,
  });
}

async function refineOne(
  file: string,
  from: string,
  out: string,
  rounds: number,
  cwd: string,
) {
  const target = path.join(out, "gen", path.basename(file));
  if (existsSync(target)) return;
  const record = JSON.parse(readFileSync(file, "utf8")) as GenRecord & {
    rounds?: number[];
  };
  const model = GENERATORS.find((g) => g.id === record.model)!;
  const task = BENCH_TASKS.find((t) => t.id === record.task)!;
  const history: number[] = [];
  let current = record;
  if (current.parsed && current.draft) {
    for (let round = 0; round < rounds; round += 1) {
      const issues = feedbackOf(current.draft, task);
      history.push(issues.length);
      if (!issues.length) break;
      try {
        const { text, ms } = await runCli({
          provider: model.provider,
          model: model.model,
          effort: model.effort,
          system: prompt.buildEnglishSystemPrompt(),
          prompt: prompt.buildEnglishRefinePrompt(
            task.request,
            task.grade,
            JSON.stringify(current.draft),
            issues,
          ),
          cwd,
        });
        const value = coerceEnglishDraftShape(
          parseAiJsonObject(text),
          "deepseek",
        );
        const verdict = validateEnglishDraft(value, task.request);
        current = {
          ...current,
          ms: (current.ms ?? 0) + ms,
          raw: text,
          draft: value,
          accepted: verdict.ok,
          issues: verdict.ok ? [] : verdict.issues,
        };
      } catch (error) {
        console.log(
          `고쳐쓰기 실패  ${record.model}  ${record.task}  ${(error as Error).message.slice(0, 120)}`,
        );
        break;
      }
    }
    if (history[history.length - 1] !== 0)
      history.push(feedbackOf(current.draft, task).length);
  }
  writeFileSync(
    target,
    JSON.stringify(
      {
        ...current,
        rounds: history,
        promptVersion: `${record.promptVersion}+loop`,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log(
    `완료  ${record.model}  ${record.task}  지적 ${history.join("→")}  채택 ${current.accepted}`,
  );
}

async function main() {
  const from = flag("--from");
  const out = flag("--out");
  if (!from || !out) throw new Error("--from · --out 이 필요하다");
  const only = flag("--only")?.split(",");
  const rounds = Number(flag("--rounds") ?? 2);
  const lanes = Number(flag("--lanes") ?? 2);
  const cwd = path.join(out, "cwd");
  mkdirSync(path.join(out, "gen"), { recursive: true });
  mkdirSync(cwd, { recursive: true });
  const files = readdirSync(path.join(from, "gen"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(from, "gen", f))
    .filter((f) => {
      const r = JSON.parse(readFileSync(f, "utf8")) as GenRecord;
      return !only || only.includes(r.model);
    });
  const byProvider = new Map<string, (() => Promise<void>)[]>();
  for (const f of files) {
    const r = JSON.parse(readFileSync(f, "utf8")) as GenRecord;
    const jobs = byProvider.get(r.provider) ?? [];
    jobs.push(() => refineOne(f, from, out, rounds, cwd));
    byProvider.set(r.provider, jobs);
  }
  await Promise.all([...byProvider.values()].map((jobs) => pool(jobs, lanes)));
  console.log("고쳐쓰기 끝");
}

if (/refine\.ts$/.test(process.argv[1] ?? "")) void main();
