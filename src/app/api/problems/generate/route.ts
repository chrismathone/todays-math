/**
 * POST /api/problems/generate — AI 문제 생성 후 pending으로 적재.
 * 대응 계약: src/contracts/problem.contract.ts
 */
import type { NextRequest } from "next/server";

import {
  problemGenerateRequestSchema,
  problemGenerateResponseSchema,
} from "@/contracts/problem.contract";
import { problemAiKeyName } from "@/lib/ai/client";
import { generateProblems } from "@/lib/ai/generator";
import {
  AiCapacityError,
  AiConfigError,
  AiGenerationError,
} from "@/lib/ai/errors";
import { AI_BUSY_MESSAGE, admitAiWork } from "@/lib/aiAdmission";
import {
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { serializeProblem } from "@/lib/serializers";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

/**
 * 🔴 **실측하니 기본 제한을 넘는다.** 2026-08-26
 * (`scripts/qa/probe-ai-generate-live.ts`, 중1 소인수분해, deepseek-v4-pro — 2026-11-11 Claude 로 바뀌기 전 값):
 *
 *   · 3문항 → **40.0초**
 *   · 10문항 → **127.8초**   ← 화면 기본값이 여기 가깝다(「필요 − 가용」, 상한 10)
 *
 * 이 값이 없으면 서버리스 기본 제한에서 잘리고, 화면에는 **원인이 안 남는다** —
 * 그냥 실패한다. 게다가 `withOneRetryOnParseFailure` 가 파싱 실패 때 한 번 더
 * 부르므로 최악은 그 두 배다. 같은 이유로 `api/eywa-sync` 도 300 을 쓴다.
 *
 * ⚠️ Vercel 요금제가 60초로 막으면 이 버튼은 운영에서 타임아웃 난다 —
 *    그때는 개수를 줄여 여러 번 나눠 부르는 수밖에 없다(로컬·개발에는 제한이 없다).
 */
export const maxDuration = 300;

async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = problemGenerateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const unit = await db.unit.findUnique({ where: { id: parsed.data.unitId } });
  if (!unit) return notFoundError("단원");

  // 한 사람이 동시에 띄우는 유료 호출은 둘까지 — 호출 하나가 40초 ~ 2분이고 한도가 없었다(2026-10-07 검수).
  const release = admitAiWork("problems", session.id);
  if (!release) return jsonError("AI_GENERATION_FAILED", AI_BUSY_MESSAGE, 429);

  try {
    const drafts = await generateProblems({
      unitId: parsed.data.unitId,
      unitLabel: `${unit.grade} ${unit.chapter} ${unit.section}`,
      difficulty: parsed.data.difficulty,
      count: parsed.data.count,
    });

    // 🔴 생성 개수만큼 INSERT 를 순차로 await 하던 자리다. `createManyAndReturn` 은
    //    PostgreSQL 의 `INSERT ... RETURNING` 이라 **한 문장**으로 넣고 넣은 행을 그대로
    //    돌려준다. 문장이 하나뿐이므로 트랜잭션 래퍼 없이도 전부 아니면 전무다.
    //    반환 순서는 입력 순서 = 응답 순서라 계약(배열)도 그대로다.
    // exam-wiring: 기출아님 — AI 생성물(source=ai_generated)만 넣는다. 원본 시험지가 없다
    const created = await db.problem.createManyAndReturn({
      data: drafts.map((draft) => ({
        userId: session.id,
        unitId: draft.unitId,
        source: draft.source,
        originProblemId: draft.originProblemId,
        difficulty: draft.difficulty,
        problemType: draft.problemType,
        // ⚠️ 이 줄이 빠지면 DB 는 널이 되고 화면은 `[?형식]` 을 그린다 — **에러가 안 난다**
        //    (원장님 지적 2026-08-26). `src/__tests__/api/aiGenerateQuestionType.test.ts` 가 지킨다.
        questionType: draft.questionType,
        content: draft.content,
        answer: draft.answer,
        solution: draft.solution,
        reviewStatus: draft.reviewStatus,
      })),
    });

    return jsonOk(
      problemGenerateResponseSchema,
      { data: created.map(serializeProblem) },
      { status: 201 },
    );
  } catch (error) {
    // ⚠️ `AiCapacityError`·`AiConfigError` 는 둘 다 `AiGenerationError` 의 하위 타입이다 —
    //    **이 검사들이 먼저** 와야 한다. 순서를 뒤집으면 원인이 일반 실패로 뭉개진다.
    if (error instanceof AiCapacityError) {
      console.error("[POST /api/problems/generate] AI response truncated");
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 가 답을 내기 전에 길이 한도에 걸렸습니다 — 개수를 줄이거나 더 단순한 문항으로 다시 시도해주세요.",
        502,
      );
    }
    // ⚠️ `AiConfigError` 는 `AiGenerationError` 의 하위 타입이다 — **이 검사가 먼저** 와야
    //    한다. 순서를 뒤집으면 설정 누락이 다시 일반 실패로 뭉개져 화면에서 원인을 못 본다.
    if (error instanceof AiConfigError) {
      console.error("[POST /api/problems/generate] AI not configured");
      return jsonError(
        "AI_GENERATION_FAILED",
        // 키 이름은 지금 공급자의 것(기본 ANTHROPIC_API_KEY · 되돌리면 DEEPSEEK_API_KEY) — 값은 싣지 않는다.
        `AI 설정이 없습니다 — 서버 환경변수 ${problemAiKeyName()} 를 확인해주세요.`,
        503,
      );
    }
    if (error instanceof AiGenerationError) {
      console.error("[POST /api/problems/generate] AI generation failed");
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 문제 생성에 실패했습니다.",
        502,
      );
    }
    throw error;
  } finally {
    release();
  }
}

export const POST = withErrorLog("/api/problems/generate", handlePost);
