import { getDevAiProviderStatuses, runSubscriptionCli } from "@/lib/dev-ai/cli";
import { redrawDevAiFigure } from "@/lib/dev-ai/figure-engine";
import {
  DEV_AI_PROVIDERS,
  type DevAiProvider,
  type DevAiStatus,
} from "@/lib/dev-ai/contracts";
import {
  buildDevAiPrompt,
  DevAiRequestSchema,
  parseDevAiResult,
} from "@/lib/dev-ai/tasks";
import {
  DEV_AI_HEADERS as headers,
  readDevAiBody,
  rejectDevAiRequest,
} from "./guard";
export const runtime = "nodejs";
const enabled = () => process.env.DEV_AI_MODE === "subscription-cli";
export async function GET(request: Request) {
  const rejected = rejectDevAiRequest(request);
  if (rejected) return rejected;
  try {
    const active = enabled();
    const providers = active ? await getDevAiProviderStatuses() : [];
    const configured = process.env.DEV_AI_PROVIDER as DevAiProvider;
    const defaultProvider = DEV_AI_PROVIDERS.includes(configured)
      ? configured
      : (providers.find((p) => p.status === "ready")?.id ??
        providers.find((p) => p.status === "unverified")?.id ??
        "codex");
    return Response.json(
      {
        enabled: active,
        mode: "subscription-cli",
        defaultProvider,
        providers,
      } satisfies DevAiStatus,
      { headers },
    );
  } catch {
    return Response.json(
      {
        error:
          "AI 도구의 로그인 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.",
      },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  const rejected = rejectDevAiRequest(request);
  if (rejected) return rejected;
  if (!enabled())
    return Response.json(
      { error: "개발용 구독 AI 연결이 꺼져 있습니다." },
      { status: 503, headers },
    );
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json(
      { error: "JSON 요청이 필요합니다." },
      { status: 415, headers },
    );
  let input;
  try {
    const parsed = DevAiRequestSchema.safeParse(await readDevAiBody(request));
    if (!parsed.success)
      return Response.json(
        {
          error:
            parsed.error.issues[0]?.message || "문제 입력을 확인해 주세요.",
        },
        { status: 400, headers },
      );
    input = parsed.data;
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof SyntaxError
            ? "요청 내용을 읽지 못했습니다."
            : error instanceof Error
              ? error.message
              : "잘못된 요청입니다.",
      },
      { status: 400, headers },
    );
  }
  try {
    const result =
      input.action === "figure-redraw"
        ? await redrawDevAiFigure(input, request.signal)
        : parseDevAiResult(
            await runSubscriptionCli({
              provider: input.provider,
              prompt: buildDevAiPrompt(input),
              imageDataUrl: input.imageDataUrl,
              signal: request.signal,
            }),
            input.action,
          );
    if (request.signal.aborted)
      return new Response(null, { status: 499, headers });
    return Response.json(
      {
        provider: input.provider,
        action: input.action,
        result,
      },
      { headers },
    );
  } catch (error) {
    if (
      request.signal.aborted ||
      (error instanceof Error && error.name === "AbortError")
    )
      return new Response(null, { status: 499, headers });
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "AI 처리에 실패했습니다.",
      },
      { status: 502, headers },
    );
  }
}
