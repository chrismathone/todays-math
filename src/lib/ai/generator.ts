/**
 * AI 문제 생성 — (단원, 난이도, 개수) → 계약(problemSchema) 형태의 draft 배열.
 *
 * 대응 API 경로: POST /api/problems/generate (T3.1 — 이 함수를 호출해 DB 영속만 담당한다)
 * 대응 계약: src/contracts/problem.contract.ts (problemGenerateRequestSchema/ResponseSchema)
 * 참조: docs/planning/06-tasks.md T3.2
 */
import type { Difficulty } from "@/contracts/common.contract";
import {
  problemTypeSchema,
  type ProblemType,
} from "@/contracts/problem.contract";
import { z } from "zod";

import { callAi } from "./client";
import { AiParseError } from "./errors";
import {
  normalizeAiAnswer,
  normalizeAiText,
  parseAiJsonArray,
} from "./jsonRepair";
import {
  buildGenerateSystemPrompt,
  buildGenerateUserPrompt,
} from "./prompts/generate";
import { deriveQuestionType, type AiQuestionType } from "./questionType";
import {
  speakWordyOperators,
  speakWordyOperatorsOrNull,
} from "./wordyOperators";
import { withOneRetryOnParseFailure } from "./retry";

/** AI 응답 원소 형태 — problemType/content/answer/solution만 AI 책임(그 외는 서버가 부여). */
const generatedItemSchema = z.strictObject({
  problemType: problemTypeSchema,
  content: z.string().min(1),
  answer: z.string().min(1),
  solution: z.string().nullable().optional(),
});

export interface GenerateProblemsInput {
  /** 대상 단원 id — 서버가 부여, AI 응답에서 받지 않는다(계약 신뢰 경계). */
  unitId: string;
  /** 프롬프트 문맥용 사람이 읽는 단원명(예: "일차부등식의 활용(농도)") — T3.1이 Unit에서 조회해 전달. */
  unitLabel: string;
  difficulty: Difficulty;
  count: number;
}

/**
 * DB 영속 직전 형태 — id/userId/createdAt/updatedAt은 T3.1(Route Handler + Prisma)이 부여한다.
 * `problemSchema`(계약)에서 이 4개 필드만 빠진 형태와 정확히 일치한다.
 */
export interface GeneratedProblemDraft {
  unitId: string;
  difficulty: Difficulty;
  problemType: ProblemType;
  /**
   * 출제 형식 — 객관식 · 단답형 · 서술형.
   *
   * ⚠️ **널을 넣지 마라.** 이 값이 비면 화면 형식 판정(`classifyFormat`)이 AI 문항을
   *    가를 근거를 못 찾아 `[?형식]` 을 그린다(원장님 지적 2026-08-26). AI 문항은
   *    `familyKey` 가 `solo:<uuid>` 라 엔진 표지로도 구제되지 않는다.
   *    값은 AI 에게 묻지 않고 생성물에서 읽어 낸다 — `./questionType.ts` 참조.
   */
  questionType: AiQuestionType;
  content: string;
  answer: string;
  solution: string | null;
  source: "ai_generated";
  originProblemId: null;
  reviewStatus: "pending";
}

/**
 * AI 문제 생성. unitId/difficulty/source/originProblemId/reviewStatus는 AI 응답을 신뢰하지
 * 않고 서버가 직접 부여한다(계약 위반 원천 차단) — AI는 problemType/content/answer/solution만
 * 책임진다.
 *
 * JSON/스키마 파싱 실패 시 1회 재시도하며, 재시도 후에도 실패하면 `AiGenerationError`를
 * 던진다(호출자 — `src/app/api/problems/generate/route.ts`, T3.1 — 가
 * `jsonError("AI_GENERATION_FAILED", error.message, 502)`로 매핑).
 */
export async function generateProblems(
  input: GenerateProblemsInput,
): Promise<GeneratedProblemDraft[]> {
  const { unitId, unitLabel, difficulty, count } = input;

  if (process.env.E2E_MOCK_AI === "1") {
    return Array.from({ length: count }, (_, index) => ({
      unitId,
      difficulty,
      problemType: "계산",
      // 모의도 **실물과 같은 축**을 갖는다. 여기서 형식을 비워 두면 E2E 에서만
      // `[?형식]` 이 되살아나는데, 그건 시험이 못 보는 자리다.
      questionType: deriveQuestionType({
        content: `모의 생성 문제 ${index + 1}`,
        answer: String(index + 1),
        problemType: "계산",
      }),
      content: `모의 생성 문제 ${index + 1}`,
      answer: String(index + 1),
      solution: null,
      source: "ai_generated" as const,
      originProblemId: null,
      reviewStatus: "pending" as const,
    }));
  }

  const attempt = async () => {
    const raw = await callAi({
      system: buildGenerateSystemPrompt(),
      prompt: buildGenerateUserPrompt({ unitLabel, difficulty, count }),
      // «심화상»이면 Claude Opus 5.5, 그 밖은 Sonnet 5.5(원장님 2026-11-11 — `claudeModels.ts`).
      difficulty,
    });
    const parsed = parseAiJsonArray(raw, generatedItemSchema);
    if (parsed.length < count) {
      throw new AiParseError(
        `AI가 요청한 ${count}개보다 적은 ${parsed.length}개를 반환했습니다.`,
      );
    }
    return parsed;
  };

  const items = await withOneRetryOnParseFailure(attempt);

  return items.slice(0, count).map((item) => {
    // ⚠️ **정규화한 뒤에** 형식을 읽는다. 판정이 보는 본문과 DB·지면이 쓰는 본문이
    //    같아야 보기 칸 수가 갈리지 않는다(CLAUDE.md 2026-08-18).
    //
    //    정규화는 작업실 입구와 같은 후보정이다(`normalizeAiText`/`normalizeAiAnswer`,
    //    2026-09-26 후보정 감사 K). 이제 보기·정답을 **건드린다** — `\textcircled{3}`
    //    이 `③` 이 되어야 정답이 보기 번호로 읽힌다. 그래서 순서를 시험이 지킨다:
    //    `aiBankIntakeNormalize.test.ts` 「보기 번호를 정규화한 뒤에 형식을 읽는다」.
    //    (전에는 `\dfrac`→`\frac` 하나뿐이라 순서를 바꿔도 산출물이 같았다 —
    //    `scripts/qa/mutate-ai-question-type.sh` 의 같은 자리 주석 참조.)
    // 「말 대신 기호」를 말로 (원장님 지시 2026-08-26). 프롬프트가 이미 이르지만
    // **AI 는 지시를 어긴다** — 받은 것을 검사하는 쪽이 여기다. 규칙은 한 곳
    // (`scripts/qa/wordyOperator.ts`)이 정하고, 못 미더우면 원문을 그대로 둔다.
    const content = speakWordyOperators(normalizeAiText(item.content)).out;
    const answer = speakWordyOperators(normalizeAiAnswer(item.answer)).out;
    return {
      unitId,
      difficulty,
      problemType: item.problemType,
      questionType: deriveQuestionType({
        content,
        answer,
        problemType: item.problemType,
      }),
      content,
      answer,
      solution: speakWordyOperatorsOrNull(
        item.solution ? normalizeAiText(item.solution) : null,
      ).out,
      source: "ai_generated" as const,
      originProblemId: null,
      reviewStatus: "pending" as const,
    };
  });
}
