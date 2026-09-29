/**
 * 오늘의 영어 «API 직접 생성»을 **실물로 한 번 돌려** 무엇이 오는지 본다 (D-148 · 트랙 english-ai 보고서 §5).
 *
 *   npx tsx -r dotenv/config scripts/qa/probe-english-generate-live.ts                    새 지문 · 2문항 · 실제 DeepSeek 1회
 *   npx tsx -r dotenv/config scripts/qa/probe-english-generate-live.ts --mode original    우리가 지은 표본 원문으로 문제만
 *   npx tsx -r dotenv/config scripts/qa/probe-english-generate-live.ts --count 4 --grade 고1 --types "주제,어법,서술형"
 *
 * ⚠️ `-r dotenv/config` 를 빼면 `DEEPSEEK_API_KEY` 가 안 실린다 — tsx 는 `.env` 를 읽지 않는다.
 *    워크트리에는 `.env` 가 없으니 **리드가 main(키 있는 곳)에서** 돌린다(20번 교훈 2026-09-20).
 *
 * ## 왜 이 파일이 필요한가
 * 단위·라우트 시험은 `openai` 를 늘 모킹한다(절대 규칙 7). «AI 가 실제로 무엇을 주나 — 보기 다섯을 지키나,
 * evidence 를 정말 그대로 인용하나»는 시험에 없는 축이다. 이 프로브가 그 한 번을 맡는다.
 *
 * ⚠️ DB 를 건드리지 않는다 — `generateEnglishDraft` 만 부르고 저장하지 않는다.
 * ⚠️ 실제 API 키를 쓰고 실제로 과금된다. 관문(`npm run test`)에서 돌지 않는다.
 * ⚠️ 표본 원문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님 — 교재 원문은 저장소 밖).
 */
import { performance } from "node:perf_hooks";

import {
  ENGLISH_GENERATED_TYPES,
  englishGenerateRequestSchema,
  englishGradeSchema,
} from "@/contracts/english.contract";
import {
  AiCapacityError,
  AiConfigError,
  AiGenerationError,
} from "@/lib/ai/errors";
import { ENGLISH_EXAM_PROMPT_VERSION } from "@/lib/ai/prompts/englishExam";
import {
  EnglishDraftRejectedError,
  generateEnglishDraft,
} from "@/lib/english/generate";

const args = process.argv.slice(2);
function flagValue(name: string, fallback: string): string {
  const at = args.indexOf(name);
  return at >= 0 ? (args[at + 1] ?? fallback) : fallback;
}

const SAMPLE_PASSAGE =
  "Every Saturday Jun visits the library near the river. He does not borrow many books, but he reads the same page of an old atlas and imagines a different journey each time. The librarian says that imagination needs a quiet room more than a fast train. Last week Jun finally wrote his own map of a town that does not exist, and the librarian put it on the wall beside the real ones.";

const mode = flagValue("--mode", "new");
const count = Number(flagValue("--count", "2"));
const grade = englishGradeSchema.parse(flagValue("--grade", "중2"));
const types = flagValue("--types", "주제,내용 일치")
  .split(",")
  .map((type) => type.trim())
  .filter(Boolean);

async function main() {
  if (!process.env.DEEPSEEK_API_KEY) {
    console.error(
      "DEEPSEEK_API_KEY 가 없다 — .env 를 확인하라(-r dotenv/config).",
    );
    process.exitCode = 1;
    return;
  }
  const request = englishGenerateRequestSchema.parse({
    examId: "00000000-0000-4000-8000-000000000000",
    mode,
    topic: mode === "new" ? "a small library by the river" : "",
    passage: mode === "new" ? "" : SAMPLE_PASSAGE,
    difficulty: "표준",
    count,
    words: 160,
    types,
  });
  console.log(
    `[실물 호출] prompt=${ENGLISH_EXAM_PROMPT_VERSION} grade=${grade} mode=${mode} count=${count} types=${types.join("·")} ` +
      `(고를 수 있는 유형: ${ENGLISH_GENERATED_TYPES.join("·")})`,
  );
  const started = performance.now();
  try {
    const draft = await generateEnglishDraft(request, grade);
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    console.log(
      `[성공] ${seconds}초 · 제목 «${draft.title}» · ${draft.questions.length}문항`,
    );
    console.log(`[지문] ${draft.passage}`);
    draft.questions.forEach((question, index) => {
      console.log(`\n[${index + 1}] ${question.type}`);
      console.log(question.prompt);
      question.options.forEach((option, at) =>
        console.log(`  ${at + 1}. ${option}`),
      );
      console.log(`  정답: ${question.answer}`);
      console.log(`  해설: ${question.explanation}`);
      console.log(`  근거: ${question.evidence}`);
    });
  } catch (error) {
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    if (error instanceof EnglishDraftRejectedError) {
      console.error(
        `[검증기 거절] ${seconds}초 — 라우트라면 502 ENGLISH_DRAFT_REJECTED`,
      );
      for (const issue of error.issues)
        console.error(
          `  ${issue.question === null ? "초안" : `${issue.question + 1}번 문항`}: ${issue.message}`,
        );
    } else if (error instanceof AiCapacityError) {
      console.error(`[길이 한도] ${seconds}초 — ${error.message}`);
    } else if (error instanceof AiConfigError) {
      console.error(`[설정 없음] ${error.message}`);
    } else if (error instanceof AiGenerationError) {
      console.error(`[생성 실패] ${seconds}초 — ${error.message}`);
      if (error.cause instanceof Error)
        console.error(`  원인: ${error.cause.name}: ${error.cause.message}`);
    } else {
      throw error;
    }
    process.exitCode = 1;
  }
}

void main();
