import "server-only";
import { z } from "zod";
import { STUDIO_API_PROVIDERS } from "@/lib/dev-ai/contracts";
import { FigureRedrawError } from "@/lib/dev-ai/figure-spec";
import { DevAiParseError, DevAiRequestSchema } from "@/lib/dev-ai/tasks";
import {
  badRequestDetail,
  bodyShape,
  describeFailure,
} from "@/lib/errorLog/describe";
import { noteErrorLog } from "@/lib/errorLog/scope";
import { getModelApiStatus, StudioApiError } from "./api";
import { executeStudioTask } from "./execute";
import { readStudioAiBody, STUDIO_HEADERS as headers } from "./http";
import { STUDIO_AI_PLATFORM_BODY_LIMIT, STUDIO_AI_TOO_LARGE } from "./limits";

// Admission is bounded per server process; no unbounded waiting list or retry spend.
const activeUsers = new Map<string, number>();
let active = 0;
export function studioApiStatus() {
  return Response.json(getModelApiStatus(), { headers });
}
export async function studioApiPost(request: Request, owner: string) {
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    return Response.json(
      { error: "JSON 요청이 필요합니다." },
      { status: 415, headers },
    );
  // 운영은 이 문턱을 넘는 본문을 플랫폼이 먼저 자른다(평문 413) — 로컬도 같은 자리에서 막되 읽을 수 있는 문구로
  if (
    Number(request.headers.get("content-length")) >
    STUDIO_AI_PLATFORM_BODY_LIMIT
  )
    return Response.json(
      { error: STUDIO_AI_TOO_LARGE },
      { status: 413, headers },
    );
  if (active >= 8 || (activeUsers.get(owner) ?? 0) >= 2)
    return Response.json(
      { error: "진행 중인 AI 작업이 끝나면 다시 시도해 주세요." },
      { status: 429, headers },
    );
  active++;
  activeUsers.set(owner, (activeUsers.get(owner) ?? 0) + 1);
  const timeout = AbortSignal.timeout(240_000);
  // 도형 재작도가 이 한도보다 먼저 멈춰 «마지막으로 그린 결과»를 돌려줄 수 있게 끝 시각을 넘긴다(2026-09-19)
  const deadlineAt = Date.now() + 240_000;
  const signal = AbortSignal.any([request.signal, timeout]);
  let action: string | undefined;
  // 오류 기록(withErrorLog)이 실패했을 때만 싣는 메모 — 누가 불렀나
  noteErrorLog({ userId: owner });
  try {
    let input, provider;
    let raw: unknown;
    try {
      raw = await readStudioAiBody(request, signal);
      const envelope = z
        .object({ provider: z.enum(STUDIO_API_PROVIDERS).default("auto") })
        .passthrough()
        .parse(raw);
      provider = envelope.provider;
      // Provider is transport metadata; validation and prompt inputs stay shared.
      input = DevAiRequestSchema.parse({ ...envelope, provider: "codex" });
      action = input.action;
    } catch (error) {
      signal.throwIfAborted();
      // 2026-09-22 «요청대로 고치기» 400 — 어느 칸이 왜 틀렸는지가 어디에도 안 남았다. 화면 문구는 그대로 두고
      // 기록에만 zod 경로·문구와 본문의 모양(열쇠·형·크기 — 값 없이)을 싣는다.
      const shape = bodyShape(raw);
      noteErrorLog({
        ...(typeof shape.action === "string" ? { action: shape.action } : {}),
        detail: badRequestDetail(error),
        context: { requestShape: shape },
      });
      return Response.json(
        { error: "문항 입력과 이미지 크기를 확인해 주세요." },
        { status: 400, headers },
      );
    }
    const output = await executeStudioTask(
      input,
      { mode: "model-api", provider },
      signal,
      deadlineAt,
    );
    signal.throwIfAborted();
    return Response.json(
      { provider, action: input.action, ...output },
      { headers },
    );
  } catch (error) {
    if (request.signal.aborted)
      return new Response(null, { status: 499, headers });
    // AI 쪽 실패 — 모델·엔진의 거절, 응답을 못 읽음, 상류 API 실패, 시간 초과. 개발자용 원문은 기록에만.
    noteErrorLog({ kind: "ai-rejected", detail: describeFailure(error) });
    if (timeout.aborted)
      return Response.json(
        { error: "AI 작업 시간이 초과되었습니다. 다시 시도해 주세요." },
        { status: 504, headers },
      );
    // 2026-09-18 운영 502 16건이 사유 없이 남았다 — 우리 쪽 문구만 남긴다(상류 원문·키는 api.ts 가 이미 걸렀다)
    console.error(
      `[POST /api/studio/ai] ${action ?? "?"} failed:`,
      error instanceof StudioApiError
        ? `${error.status} ${error.message}`
        : error instanceof FigureRedrawError && error.detail
          ? `${error.message} | ${error.detail}`
          : error instanceof Error
            ? error.message.slice(0, 300)
            : "unknown",
    );
    // 2026-09-19 도형 재작도의 사유(모델 note·엔진 검증 사유 — 잘라 둔 것)가 이 502 에 가려져 원장님이
    // 왜 안 됐는지 몰랐다. FigureRedrawError 는 우리가 화면용으로 쓴 문장만 싣는다(figure-spec.ts).
    // 엔진 원문은 개발자용 detail 로 따로 — 작업실은 마우스 올림·콘솔로만 보인다(2026-09-21).
    if (error instanceof FigureRedrawError)
      return Response.json(
        {
          error: error.message,
          ...(error.detail ? { detail: error.detail } : {}),
        },
        { status: error.status, headers },
      );
    return Response.json(
      {
        error:
          error instanceof StudioApiError
            ? error.message
            : // 모델이 낸 응답을 두 번 다 못 읽었다(한 번은 자동으로 다시 보낸다 — `executeMathgenTask`).
              // 입력·설정 탓이 아니니 «설정을 확인»으로 보내지 않는다.
              error instanceof DevAiParseError
              ? "AI 응답을 읽지 못했습니다. 원본은 유지됩니다. 다시 시도해 주세요."
              : "AI 결과를 처리하지 못했습니다. 입력과 모델 설정을 확인해 주세요.",
      },
      {
        status: error instanceof StudioApiError ? error.status : 502,
        headers: {
          ...headers,
          ...(error instanceof StudioApiError && error.retryAfterMs
            ? { "Retry-After": String(Math.ceil(error.retryAfterMs / 1000)) }
            : {}),
        },
      },
    );
  } finally {
    active--;
    const count = (activeUsers.get(owner) ?? 1) - 1;
    if (count) activeUsers.set(owner, count);
    else activeUsers.delete(owner);
  }
}
