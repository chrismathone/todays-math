import "server-only";
import type { AnthropicUsage, runModelApi } from "@/lib/studio-ai/api";
import {
  SCAN_TOKEN_PRICES_20261103,
  scanTokenCostNanoUsd,
  type ScanPricedModel,
  type ScanUsageStore,
} from "./usage";

export type ScanModel = (request: {
  operation: "read" | "grade";
  prompt: string;
  imageDataUrl?: string;
  signal: AbortSignal;
}) => Promise<string>;
export type ScanConfig = Readonly<{
  enabled: boolean;
  model: ScanPricedModel;
  gradeModel: ScanPricedModel;
  effort: "low" | "medium" | "high";
  monthlyUsdCap: number;
}>;

export function scanConfig(
  env: Record<string, string | undefined> = process.env,
): ScanConfig {
  const priced = (value: string) => {
    if (!Object.hasOwn(SCAN_TOKEN_PRICES_20261103, value))
      throw new RangeError("단가가 등록되지 않은 사진 채점 모델입니다.");
    return value as ScanPricedModel;
  };
  const model = priced(
    env.CONCEPT_BLANK_SCAN_MODEL?.trim() || "claude-opus-5-5",
  );
  const effort = env.CONCEPT_BLANK_SCAN_EFFORT?.trim() || "high";
  if (effort !== "low" && effort !== "medium" && effort !== "high")
    throw new RangeError("사진 채점 생각 강도가 맞지 않습니다.");
  const capText = env.CONCEPT_BLANK_SCAN_MONTHLY_USD_CAP?.trim() ?? "100";
  const monthlyUsdCap = Number(capText);
  if (
    !/^\d+(?:\.\d{1,9})?$/.test(capText) ||
    !Number.isFinite(monthlyUsdCap) ||
    !Number.isSafeInteger(Math.round(monthlyUsdCap * 1e9))
  )
    throw new RangeError("사진 채점 월 상한이 맞지 않습니다.");
  return {
    enabled:
      env.CONCEPT_BLANK_SCAN_ENABLED === undefined ||
      env.CONCEPT_BLANK_SCAN_ENABLED === "on",
    model,
    gradeModel: priced(env.CONCEPT_BLANK_SCAN_GRADE_MODEL?.trim() || model),
    effort,
    monthlyUsdCap,
  };
}

/** Required store and injected model at callers; no module-import-time requests or implicit memory store. */
export function createScanModel(deps: {
  store: ScanUsageStore;
  config?: ScanConfig;
  transport?: typeof runModelApi;
  now?: () => Date;
}): ScanModel {
  return async (request) => {
    const config = deps.config ?? scanConfig();
    if (!config.enabled) throw new Error("사진 채점이 꺼져 있습니다.");
    request.signal.throwIfAborted();
    // Even an installed server key can never activate paid transport in a test process.
    if (
      !deps.transport &&
      (process.env.VITEST || process.env.NODE_ENV === "test")
    )
      throw new Error("시험에서는 사진 채점 호출 함수를 주입해야 합니다.");
    if (!deps.transport && !process.env.ANTHROPIC_API_KEY?.trim())
      throw new Error("Claude 서버 키가 설정되지 않았습니다.");
    const transport =
      deps.transport ?? (await import("@/lib/studio-ai/api")).runModelApi;
    request.signal.throwIfAborted();
    const month = (deps.now?.() ?? new Date()).toISOString().slice(0, 7);
    const model =
      request.operation === "read" ? config.model : config.gradeModel;
    const lease = await deps.store.begin(
      month,
      Math.round(config.monthlyUsdCap * 1e9),
    );
    const receipts: AnthropicUsage[] = [];
    let dispatched = false;
    try {
      request.signal.throwIfAborted();
      dispatched = true;
      const output = await transport({
        vendor: "anthropic",
        model,
        prompt: request.prompt,
        ...(request.imageDataUrl ? { imageDataUrl: request.imageDataUrl } : {}),
        effort: config.effort,
        maxOutputTokens: 16_000,
        signal: request.signal,
        singleAttempt: true,
        suppressUpstreamDetails: true,
        onAnthropicUsage: (usage) => {
          receipts.push(usage);
        },
      });
      if (!receipts.length)
        throw new Error("실제 토큰 사용량을 확인해야 합니다.");
      // Validate before exposing output; settlement below still fails closed on malformed evidence.
      for (const usage of receipts) scanTokenCostNanoUsd(model, usage);
      return output;
    } finally {
      let cost: number | null = dispatched ? null : 0;
      if (receipts.length) {
        try {
          cost = receipts.reduce(
            (sum, usage) => sum + scanTokenCostNanoUsd(model, usage),
            0,
          );
        } catch {
          cost = null;
        }
      }
      await deps.store.settle(lease, cost);
    }
  };
}
