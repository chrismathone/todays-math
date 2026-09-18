import "server-only";
import type { DevAiRequest, StudioApiProvider } from "@/lib/dev-ai/contracts";
import { executeMathgenTask } from "@/lib/dev-ai/tasks";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import { runModelApi, StudioApiError } from "./api";
import { API_KEY_NAMES, resolveApiModel } from "./routing";

/** Both transports execute the same prompts, parser, and deterministic figure engine. */
export async function executeStudioTask(
  request: DevAiRequest,
  transport:
    | { mode: "subscription-cli" }
    | { mode: "model-api"; provider: StudioApiProvider },
  signal: AbortSignal,
  /** 처리기의 끝 시각(ms) — 도형 재작도가 그보다 먼저 멈춰 마지막 렌더를 돌려줄 수 있게 넘긴다. */
  deadlineAt?: number,
) {
  signal.throwIfAborted();
  if (transport.mode === "subscription-cli") {
    if (process.env.NODE_ENV !== "development")
      throw new StudioApiError(
        "운영 환경에서는 서버 API 연결이 필요합니다.",
        403,
      );
    if (request.action === "figure-redraw")
      return {
        result: await redrawDevAiFigure(request, signal, undefined, deadlineAt),
      };
    const { runSubscriptionCli } = await import("@/lib/dev-ai/cli");
    return {
      result: await executeMathgenTask(request, (prompt) => {
        signal.throwIfAborted();
        return runSubscriptionCli({
          provider: request.provider,
          model: request.model,
          prompt,
          imageDataUrl: request.imageDataUrl,
          signal,
        });
      }),
    };
  }
  const route = resolveApiModel(
    transport.provider,
    request.action,
    process.env,
  );
  const reviewRoute =
    transport.provider === "auto" && request.action === "figure-redraw"
      ? resolveApiModel("gemini", "figure-redraw", process.env)
      : route;
  // Preflight all required providers before spending the first inference.
  for (const { vendor } of [route, reviewRoute])
    if (!process.env[API_KEY_NAMES[vendor]]?.trim())
      throw new StudioApiError(
        "이 작업에 필요한 서버 API 키가 설정되지 않았습니다.",
        503,
      );
  if (request.action === "figure-redraw")
    return {
      model: route.model,
      result: await redrawDevAiFigure(
        request,
        signal,
        async ({ phase, ...inference }) => {
          const target = phase === "review" ? reviewRoute : route;
          const started = Date.now();
          let outcome = "failed";
          try {
            const text = await runModelApi({
              ...inference,
              ...target,
              ...(phase === "review" ? { maxOutputTokens: 3000 } : {}),
            });
            outcome = "ok";
            return text;
          } finally {
            // 운영에서 단계별 시간을 되짚는 한 줄 — 입력·응답 본문은 남기지 않는다
            console.info(
              `[POST /api/studio/ai] figure-redraw ${phase} ${target.vendor}/${target.model} ${Date.now() - started}ms ${outcome}`,
            );
          }
        },
        deadlineAt,
      ),
    };
  return {
    model: route.model,
    result: await executeMathgenTask(request, (prompt) => {
      signal.throwIfAborted();
      return runModelApi({
        ...route,
        prompt,
        imageDataUrl: request.imageDataUrl,
        signal,
        action: request.action,
      });
    }),
  };
}
