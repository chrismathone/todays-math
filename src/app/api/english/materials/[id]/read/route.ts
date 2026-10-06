/**
 * POST /api/english/materials/{id}/read — 사진 자료(png · jpg)에서 인쇄된 글자를 읽어 돌려준다 (D-158 · 25 §13.8).
 *
 * **저장하지 않는다** — 읽은 글은 선생님이 사진과 견주어 고친 뒤 `POST /api/english/exams/{id}/materials` 로 글 자료가 된다.
 * 순서: 세션 401 → 메뉴 403(자료를 다루는 «학교별 내신 대비») → 같은 출처 403 → 없는 자료 404 → 범위 밖 403
 *       (`requireOwnedEnglishExam` — 소유는 부모 시험으로) → 사진이 아닌 자료 400 → 모델.
 * 오류: 사진을 보는 모델의 키가 없으면 503 · 사용량 한도 429 · 그 밖의 실패와 빈 글은 502 «글을 읽지 못했습니다 …».
 * 비밀 값 · 사진 · 모델의 거절 원문은 응답에 싣지 않는다(원문은 오류 기록에만 — `runModelApi`).
 *
 * 🔴 사진은 이 요청에서 **외부 모델로 나간다**. 화면이 누르기 전에 알린다(«사진은 글을 읽을 때 AI 서버로 보냅니다»).
 * 대응 계약: src/contracts/english.contract.ts (englishMaterialReadResponseSchema)
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import { englishMaterialReadResponseSchema } from "@/contracts/english.contract";
import {
  jsonError,
  jsonOk,
  notFoundError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import {
  ENGLISH_READABLE_MIME,
  EnglishReadConfigError,
  readEnglishPhoto,
} from "@/lib/english/readPhoto";
import { requireEnglishSession } from "@/lib/english/routeSupport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEnglishExam } from "@/lib/ownership";
import { StudioApiError } from "@/lib/studio-ai/errors";

type RouteContext = { params: Promise<{ id: string }> };

/** 배관의 제한 시간(110초)에 재시도 한 번의 여유 */
export const maxDuration = 240;

const READ_FAILED =
  "글을 읽지 못했습니다. 사진이 흐리거나 글자가 작을 수 있습니다. 다시 찍어 올리거나 지문을 직접 입력해 주세요.";

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const material = await db.englishMaterial.findUnique({ where: { id } });
  if (!material) return notFoundError("자료");
  const owned = await requireOwnedEnglishExam(gate.session, material.examId);
  if (!owned.ok) return owned.response;

  if (
    !material.bytes ||
    !(ENGLISH_READABLE_MIME as readonly string[]).includes(material.mimeType)
  )
    return jsonError(
      "VALIDATION_ERROR",
      "사진 자료만 글을 읽을 수 있습니다.",
      400,
    );

  try {
    const text = await readEnglishPhoto(
      { mimeType: material.mimeType, bytes: new Uint8Array(material.bytes) },
      { signal: request.signal },
    );
    const res = jsonOk(englishMaterialReadResponseSchema, { data: { text } });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    if (
      error instanceof EnglishReadConfigError ||
      (error instanceof StudioApiError && error.status === 503)
    )
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 연결이 설정되지 않았습니다.",
        503,
      );
    if (error instanceof StudioApiError && error.status === 429)
      return jsonError("AI_GENERATION_FAILED", error.message, 429);
    // 모델 실패 · 빈 글 · 잘린 응답 — 화면에는 한 문구. 끊긴 요청(Abort)은 받을 쪽이 없다
    return jsonError("AI_GENERATION_FAILED", READ_FAILED, 502);
  }
}

export const POST = withErrorLog(
  "/api/english/materials/[id]/read",
  handlePost,
);
