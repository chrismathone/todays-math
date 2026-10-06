/**
 * POST /api/english/materials/{id}/read — 사진 자료(png · jpg)에서 인쇄된 글자를 읽어 돌려준다 (D-158 · 25 §13.8 ~ §13.10).
 *
 * **저장하지 않는다** — 읽은 글은 선생님이 사진과 견주어 고친 뒤 `POST /api/english/exams/{id}/materials` 로 글 자료가 된다.
 * 순서: 세션 401 → 메뉴 403(자료를 다루는 «학교별 내신 대비») → 같은 출처 403 → 없는 자료 404 → 범위 밖 403
 *       (`requireOwnedEnglishExam` — 소유는 부모 시험으로) → 사진이 아닌 자료 400 → 한 사람의 동시 읽기 상한 429 → 모델.
 * 모델은 (기본 — Gemini) 세 번 부른다 — 읽기 · 그 글을 같은 사진과 다시 맞춰 보는 대조 · 따로 한 번 더 읽기. 그 뒤는 모델 없이
 * 빈칸 자리를 맞추고 추측으로 다듬는다(`readPhoto.ts` · `readRefine.ts` — `ENGLISH_READ_VERIFY` · `ENGLISH_READ_TWICE` 로 끈다).
 * 대조나 따로 읽기가 실패해도 처음 읽은 글을 돌려준다(읽기는 성공이다).
 *
 * 실패는 까닭을 갈라 알린다(검토 2026-10-06 — 전에는 전부 «사진이 흐리다»였다):
 *   - 503 «AI 연결이 설정되지 않았습니다.» — 사진을 보는 모델의 키가 없다 · 상류가 키나 모델 이름을 거절했다(401 · 403 · 404)
 *   - 503 «AI 서버가 응답하지 않습니다 …» — 상류가 바쁘다(5xx — 배관이 다시 해 본 뒤)
 *   - 429 — 상류의 사용량 한도(기다릴 시간은 `Retry-After`) · 한 사람의 동시 읽기 상한
 *   - 504 — 배관의 제한 시간(110초)
 *   - 499 — 화면이 요청을 끊었다(받을 쪽이 없다)
 *   - 502 «글을 읽지 못했습니다. 사진이 흐리거나 …» — 모델이 글을 하나도 내지 않았다
 *   - 502 «글을 읽지 못했습니다. 다시 시도하거나 …» — 모델이 요청을 거절했거나 끝까지 쓰지 않았다(사진 탓이라 말할 수 없다 —
 *     Gemini 는 틀린 키에도 400 을 주고, 출판된 글을 그대로 옮기다 멈추기도 한다)
 *   - 그 밖의 예외는 우리 쪽 결함이다 — 덮지 않고 던진다(500 으로 기록된다)
 * 비밀 값 · 사진 · 모델의 거절 원문은 응답에 싣지 않는다. 까닭의 원문은 오류 기록에만 남긴다(`noteErrorLog`).
 *
 * 🔴 사진은 이 요청에서 **외부 모델로 나간다**. 화면이 누르기 전에 알린다(«사진은 글을 읽을 때 AI 서버로 보냅니다»).
 * 🔴 값이 드는 호출이다 — 여기서는 한 사람의 동시 읽기를 둘로 막는다(작업실 `/api/studio/ai` 의 «한 사람 둘»과 같은 결 ·
 *    서버 한 대 안에서만 센다). 화면도 한 번에 둘까지만 띄우고, 읽던 요청은 끊지 않고 받아 둔다 — 운영(Vercel)은 화면이
 *    요청을 끊어도 함수에 알려 주지 않아(설정 `supportsCancellation` 이 없다) 끊어 봐야 모델 호출은 끝까지 돈다.
 *    `request.signal` 은 그래도 넘긴다(알려 주는 환경에서는 끊긴다 — 499).
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
  EnglishReadEmptyError,
  EnglishReadNotPhotoError,
  isReadablePhoto,
  readEnglishPhoto,
} from "@/lib/english/readPhoto";
import { requireEnglishSession } from "@/lib/english/routeSupport";
import { describeFailure } from "@/lib/errorLog/describe";
import { noteErrorLog } from "@/lib/errorLog/scope";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEnglishExam } from "@/lib/ownership";
import { StudioApiError } from "@/lib/studio-ai/errors";

type RouteContext = { params: Promise<{ id: string }> };

/** 읽기는 배관의 제한 시간(110초 — 다시 해 보기까지 통틀어), 대조는 60초까지 — 그 합에 여유 */
export const maxDuration = 180;

const NOT_PHOTO = "사진 자료만 글을 읽을 수 있습니다.";
const READ_EMPTY =
  "글을 읽지 못했습니다. 사진이 흐리거나 글자가 작을 수 있습니다. 다시 찍어 올리거나 지문을 직접 입력해 주세요.";
const READ_FAILED =
  "글을 읽지 못했습니다. 다시 시도하거나 지문을 직접 입력해 주세요.";
const NOT_CONFIGURED = "AI 연결이 설정되지 않았습니다.";
const UPSTREAM_BUSY =
  "AI 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.";
const RATE_LIMITED =
  "AI 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
const TIMED_OUT = "AI 작업 시간이 초과되었습니다. 다시 시도해 주세요.";
const TOO_MANY = "진행 중인 AI 작업이 끝나면 다시 시도해 주세요.";

/** 한 사람이 동시에 띄울 수 있는 읽기 — 화면(읽기 창)도 한 번에 둘까지만 띄운다 */
const READS_PER_USER = 2;
const reading = new Map<string, number>();

const failed = (message: string, status: number) =>
  jsonError("AI_GENERATION_FAILED", message, status);

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;
  const userId = gate.session.id;
  noteErrorLog({ userId, action: "english-material-read" });

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  // 소유와 종류를 먼저 본다 — 사진 바이트(4MB 까지)는 통과한 뒤에 읽는다
  const head = await db.englishMaterial.findUnique({
    where: { id },
    select: { examId: true, mimeType: true },
  });
  if (!head) return notFoundError("자료");
  const owned = await requireOwnedEnglishExam(gate.session, head.examId);
  if (!owned.ok) return owned.response;
  if (!(ENGLISH_READABLE_MIME as readonly string[]).includes(head.mimeType))
    return jsonError("VALIDATION_ERROR", NOT_PHOTO, 400);

  if ((reading.get(userId) ?? 0) >= READS_PER_USER)
    return failed(TOO_MANY, 429);
  reading.set(userId, (reading.get(userId) ?? 0) + 1);
  try {
    const file = await db.englishMaterial.findUnique({
      where: { id },
      select: { bytes: true },
    });
    const photo = {
      mimeType: head.mimeType,
      bytes: file?.bytes ?? new Uint8Array(0),
    };
    if (!isReadablePhoto(photo))
      return jsonError("VALIDATION_ERROR", NOT_PHOTO, 400);
    const text = await readEnglishPhoto(photo, { signal: request.signal });
    const res = jsonOk(englishMaterialReadResponseSchema, { data: { text } });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    // 화면이 끊은 요청 — 받을 쪽이 없다
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof EnglishReadNotPhotoError)
      return jsonError("VALIDATION_ERROR", NOT_PHOTO, 400);
    if (error instanceof EnglishReadConfigError)
      return failed(NOT_CONFIGURED, 503);
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    if (
      !timedOut &&
      !(error instanceof StudioApiError) &&
      !(error instanceof EnglishReadEmptyError)
    )
      throw error;
    // AI 쪽 실패 — 모델이 왜 멈췄는지는 화면이 아니라 기록에(상류의 거절 원문은 배관이 이미 실었다)
    noteErrorLog({ kind: "ai-rejected", detail: describeFailure(error) });
    if (timedOut) return failed(TIMED_OUT, 504);
    if (error instanceof EnglishReadEmptyError) return failed(READ_EMPTY, 502);
    if (error instanceof StudioApiError) {
      if (error.status === 429) {
        const res = failed(RATE_LIMITED, 429);
        if (error.retryAfterMs)
          res.headers.set(
            "Retry-After",
            String(Math.ceil(error.retryAfterMs / 1000)),
          );
        return res;
      }
      if ([401, 403, 404].includes(error.status))
        return failed(NOT_CONFIGURED, 503);
      // 배관이 스스로 낸 실패(끝까지 쓰지 않음 · 빈 응답)는 502 다 — 상류의 5xx 만 «바쁘다»
      if (error.status >= 500 && error.status !== 502)
        return failed(UPSTREAM_BUSY, 503);
    }
    return failed(READ_FAILED, 502);
  } finally {
    const left = (reading.get(userId) ?? 1) - 1;
    if (left > 0) reading.set(userId, left);
    else reading.delete(userId);
  }
}

export const POST = withErrorLog(
  "/api/english/materials/[id]/read",
  handlePost,
);
