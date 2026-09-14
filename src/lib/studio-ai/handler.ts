import "server-only";
import { z } from "zod";
import { STUDIO_API_PROVIDERS } from "@/lib/dev-ai/contracts";
import { DevAiRequestSchema } from "@/lib/dev-ai/tasks";
import { getModelApiStatus, StudioApiError } from "./api";
import { executeStudioTask } from "./execute";
import { readStudioAiBody, STUDIO_HEADERS as headers } from "./http";

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
  if (active >= 8 || (activeUsers.get(owner) ?? 0) >= 2)
    return Response.json(
      { error: "진행 중인 AI 작업이 끝나면 다시 시도해 주세요." },
      { status: 429, headers },
    );
  active++;
  activeUsers.set(owner, (activeUsers.get(owner) ?? 0) + 1);
  const timeout = AbortSignal.timeout(240_000);
  const signal = AbortSignal.any([request.signal, timeout]);
  try {
    let input, provider;
    try {
      const raw = await readStudioAiBody(request, signal);
      const envelope = z
        .object({ provider: z.enum(STUDIO_API_PROVIDERS).default("auto") })
        .passthrough()
        .parse(raw);
      provider = envelope.provider;
      // Provider is transport metadata; validation and prompt inputs stay shared.
      input = DevAiRequestSchema.parse({ ...envelope, provider: "codex" });
    } catch {
      signal.throwIfAborted();
      return Response.json(
        { error: "문항 입력과 이미지 크기를 확인해 주세요." },
        { status: 400, headers },
      );
    }
    const output = await executeStudioTask(
      input,
      { mode: "model-api", provider },
      signal,
    );
    signal.throwIfAborted();
    return Response.json(
      { provider, action: input.action, ...output },
      { headers },
    );
  } catch (error) {
    if (request.signal.aborted)
      return new Response(null, { status: 499, headers });
    if (timeout.aborted)
      return Response.json(
        { error: "AI 작업 시간이 초과되었습니다. 다시 시도해 주세요." },
        { status: 504, headers },
      );
    return Response.json(
      {
        error:
          error instanceof StudioApiError
            ? error.message
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
