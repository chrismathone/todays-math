/**
 * POST /api/english/generate — DeepSeek 직접 생성 (D-148 · 25 §3 · §4.3).
 *
 * **저장하지 않는다** — 초안만 돌려주고, 저장은 클라이언트가 `POST /api/english/exams/{id}/sets` 로 한다
 * (변형 미리보기 `api/problems/transform` 과 같은 결: 결과를 보기 전에 쌓이지 않는다).
 *
 * 순서: 세션 401 → 같은 출처 403 → 계약 400 → 시험 404 / 범위 밖 403(D-130 `withinOwnerScope`) → AI.
 * 오류: `AiCapacityError` 502 → `AiConfigError` 503 → `EnglishDraftRejectedError` 502 `ENGLISH_DRAFT_REJECTED`(details.issues 에 문항별 사유)
 *      → `AiGenerationError` 502. 셋 다 `AiGenerationError` 의 하위 타입이라 **이 순서**여야 원인이 안 뭉개진다.
 * 비밀 값 · 프롬프트 전문 · 원문은 응답과 로그에 싣지 않는다.
 *
 * 대응 계약: src/contracts/english.contract.ts (englishGenerateRequestSchema / englishDraftResponseSchema)
 */
import type { NextRequest } from "next/server";

import {
  englishDraftResponseSchema,
  englishGenerateRequestSchema,
} from "@/contracts/english.contract";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  AiCapacityError,
  AiConfigError,
  AiGenerationError,
} from "@/lib/ai/errors";
import {
  forbiddenError,
  jsonError,
  jsonOk,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { findEnglishExamGrade } from "@/lib/english/examLookup";
import {
  ENGLISH_DRAFT_REJECTED,
  EnglishDraftRejectedError,
  generateEnglishDraft,
} from "@/lib/english/generate";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { withinOwnerScope } from "@/lib/ownerScope";
import { getSessionUser } from "@/lib/session";

/**
 * 수학 생성 실측(`api/problems/generate`)이 3문항 40초 · 10문항 128초였다 — 지문까지 쓰는 영어는 더 길 수 있고
 * 파싱 실패 재시도가 한 번 더 붙는다. 서버리스 기본 제한에서 잘리면 화면에 원인이 안 남는다.
 */
export const maxDuration = 300;

async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();
  if (!sameOriginMutation(request))
    return jsonError("FORBIDDEN", "같은 사이트에서 요청해 주세요.", 403);

  const body = await request.json().catch(() => undefined);
  const parsed = englishGenerateRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const exam = await findEnglishExamGrade(db, parsed.data.examId);
  if (!exam) return notFoundError("시험");
  if (!withinOwnerScope(session, exam.userId, exam.ownerBranchId))
    return forbiddenError();

  try {
    const draft = await generateEnglishDraft(parsed.data, exam.grade);
    // 200 — 만든 자원이 없다. 저장은 클라이언트가 sets POST 로.
    return jsonOk(englishDraftResponseSchema, { data: draft });
  } catch (error) {
    if (error instanceof AiCapacityError)
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 가 답을 내기 전에 길이 한도에 걸렸습니다. 문항 수를 줄여 다시 시도해 주세요.",
        502,
      );
    if (error instanceof AiConfigError)
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 연결이 설정되지 않았습니다.",
        503,
      );
    if (error instanceof EnglishDraftRejectedError)
      return jsonError(ENGLISH_DRAFT_REJECTED, error.message, 502, {
        issues: error.issues,
      });
    if (error instanceof AiGenerationError)
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 지문·문제 생성에 실패했습니다. 다시 시도해 주세요.",
        502,
      );
    throw error;
  }
}

export const POST = withErrorLog("/api/english/generate", handlePost);
