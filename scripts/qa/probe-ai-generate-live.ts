/**
 * 「AI 생성」을 **실물로 한 번 돌려** 무엇이 오는지 본다 (원장님 검수 지시 2026-08-26 ①).
 *
 *   npx tsx -r dotenv/config scripts/qa/probe-ai-generate-live.ts               실제 DeepSeek 호출 1회
 *   npx tsx -r dotenv/config scripts/qa/probe-ai-generate-live.ts --truncate    예산을 바닥까지 낮춰 «잘림» 경로 확인
 *   npx tsx -r dotenv/config scripts/qa/probe-ai-generate-live.ts --count 5 --unit <uuid>
 *
 * ⚠️ `-r dotenv/config` 를 빼면 `DEEPSEEK_API_KEY` 가 안 실린다 — tsx 는 `.env` 를
 *    자동으로 읽지 않는다(Next 개발 서버만 읽는다). 이 저장소의 다른 스크립트도 같은 방식이다.
 *
 * ## 왜 이 파일이 필요한가
 *
 * 단위 시험은 `openai` SDK 를 늘 모킹한다(절대 규칙 7). 그러면 **「AI 가 실제로 무엇을
 * 주나」라는 축이 시험에 아예 없다** — 이 저장소는 그래서 `AiParseError` 를 실물에서야
 * 만났다(CLAUDE.md 2026-08-19). 이 프로브는 그 한 번을 담당한다.
 *
 * ⚠️ **DB 를 건드리지 않는다.** `generateProblems` 만 부르고 적재는 안 한다 —
 *    공유 DB(D-31)에 검수용 pending 을 쌓지 않기 위해서다.
 *
 * ⚠️ 실제 API 키를 쓰고 실제로 과금된다. 관문(`npm run test`)에서 돌지 않는다.
 */
import { performance } from "node:perf_hooks";

import { AiCapacityError, AiGenerationError } from "@/lib/ai/errors";
import { generateProblems } from "@/lib/ai/generator";

const args = process.argv.slice(2);
function flagValue(name: string, fallback: string): string {
  const at = args.indexOf(name);
  return at >= 0 ? (args[at + 1] ?? fallback) : fallback;
}

/** 중1 「최대공약수와 최소공배수의 활용」 — 실측용 기본 단원. */
const DEFAULT_UNIT_ID = "00b288e3-0b5e-419a-842d-cb018796022f";
const DEFAULT_UNIT_LABEL = "중1 1. 소인수분해 최대공약수와 최소공배수의 활용";

const truncate = args.includes("--truncate");
const count = Number(flagValue("--count", "3"));
const unitId = flagValue("--unit", DEFAULT_UNIT_ID);

if (truncate) {
  // `callAi` 의 하한은 `Math.max(호출부 값, DEEPSEEK_MAX_TOKENS)` 이라 4096 아래로는
  // 못 내린다. 추론형 모델에 4096 이면 답 이전에 예산이 마른다 — 그 경로를 실물로 본다.
  process.env.DEEPSEEK_MAX_TOKENS = "1";
}

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("DEEPSEEK_API_KEY 가 없다 — .env 를 확인하라.");
    process.exitCode = 1;
    return;
  }
  console.log(
    `[실물 호출] unit=${unitId} count=${count} ` +
      `maxTokens하한=${process.env.DEEPSEEK_MAX_TOKENS ?? "64000(기본)"}`,
  );
  const started = performance.now();
  try {
    const drafts = await generateProblems({
      unitId,
      unitLabel: DEFAULT_UNIT_LABEL,
      difficulty: "응용",
      count,
    });
    const seconds = (performance.now() - started) / 1000;
    console.log(`🟢 ${drafts.length}건 · ${seconds.toFixed(1)}초`);
    for (const [i, d] of drafts.entries()) {
      console.log(
        `--- #${i + 1} problemType=${d.problemType} questionType=${d.questionType}`,
      );
      console.log(`    content: ${JSON.stringify(d.content.slice(0, 160))}`);
      console.log(`    answer : ${JSON.stringify(d.answer.slice(0, 80))}`);
      console.log(
        `    solution: ${d.solution === null ? "null" : JSON.stringify(d.solution.slice(0, 100))}`,
      );
    }
  } catch (error) {
    const seconds = (performance.now() - started) / 1000;
    // **어느 실패인지 갈라서 찍는다.** 「잘림」이 「JSON 이 아니다」로 뭉개지면 여기서 드러난다.
    const kind =
      error instanceof AiCapacityError
        ? "AiCapacityError(잘림 — finish_reason=length 를 봤다)"
        : error instanceof AiGenerationError
          ? `${error.constructor.name}(생성 실패)`
          : "그 밖의 예외";
    console.log(`🔴 ${kind} · ${seconds.toFixed(1)}초`);
    console.log(
      `   message: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = truncate && error instanceof AiCapacityError ? 0 : 1;
  }
}

void main();
