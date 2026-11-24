import "server-only";
import type { AnthropicUsage } from "@/lib/studio-ai/api";

/** Frozen 2026-11-03 benchmark tariff: USD / million tokens, cache discount excluded.
 * These are the requested budget rates, not a claim about today's provider invoice. */
export const SCAN_TOKEN_PRICES_20261103 = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
} as const;
export type ScanPricedModel = keyof typeof SCAN_TOKEN_PRICES_20261103;

export function scanTokenCostNanoUsd(
  model: ScanPricedModel,
  usage: AnthropicUsage,
): number {
  const values = [
    usage.inputTokens,
    usage.outputTokens,
    usage.cachedInputTokens,
    usage.cacheCreationInputTokens,
  ];
  if (values.some((v) => v === null || !Number.isSafeInteger(v) || v < 0))
    throw new RangeError("실제 토큰 사용량을 확인해야 합니다.");
  const rate = SCAN_TOKEN_PRICES_20261103[model];
  const cost =
    (usage.inputTokens! +
      usage.cachedInputTokens! +
      usage.cacheCreationInputTokens!) *
      (rate.input * 1000) +
    usage.outputTokens! * (rate.output * 1000);
  if (!Number.isSafeInteger(cost))
    throw new RangeError("사용량 합계가 너무 큽니다.");
  return cost;
}

export type ScanUsageMonth = Readonly<{
  spentNanoUsd: number;
  busy: boolean;
  unresolved: boolean;
}>;
export type ScanUsageLease = Readonly<{ month: string; token: string }>;
/** One account-wide monthly lane for both read/grade. All methods must be atomic.
 * No TTL release on disconnect: an upstream call can continue after the screen leaves.
 * A future DB implementation must share this lane across branches/processes/deployments. */
export interface ScanUsageStore {
  begin(month: string, capNanoUsd: number): Promise<ScanUsageLease>;
  settle(lease: ScanUsageLease, actualNanoUsd: number | null): Promise<void>;
  inspect(month: string): Promise<ScanUsageMonth>;
}

/** Tests/local simulation only. Not a production/serverless quota store. */
export function createMemoryScanUsageStore(): ScanUsageStore {
  const rows = new Map<
    string,
    { spentNanoUsd: number; token: string | null; unresolved: boolean }
  >();
  let sequence = 0;
  const row = (month: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new RangeError("월 형식이 맞지 않습니다.");
    let result = rows.get(month);
    if (!result) {
      result = { spentNanoUsd: 0, token: null, unresolved: false };
      rows.set(month, result);
    }
    return result;
  };
  return {
    async begin(month, capNanoUsd) {
      if (!Number.isSafeInteger(capNanoUsd) || capNanoUsd < 0)
        throw new RangeError("월 상한이 맞지 않습니다.");
      const current = row(month);
      if (current.unresolved)
        throw new Error("이전 호출의 사용량을 확인해야 합니다.");
      if (current.token)
        throw new Error(
          "진행 중인 사진 채점 호출이 끝나면 다시 시도해 주세요.",
        );
      if (current.spentNanoUsd >= capNanoUsd)
        throw new Error("사진 채점의 월 사용 상한에 도달했습니다.");
      current.token = String(++sequence);
      return { month, token: current.token };
    },
    async settle(lease, actualNanoUsd) {
      const current = row(lease.month);
      if (current.token !== lease.token)
        throw new Error("이미 정산했거나 다른 호출의 사용량입니다.");
      if (
        actualNanoUsd !== null &&
        (!Number.isSafeInteger(actualNanoUsd) ||
          actualNanoUsd < 0 ||
          !Number.isSafeInteger(current.spentNanoUsd + actualNanoUsd))
      )
        throw new RangeError("사용량 값이 맞지 않습니다.");
      if (actualNanoUsd === null) current.unresolved = true;
      else current.spentNanoUsd += actualNanoUsd;
      current.token = null;
    },
    async inspect(month) {
      const current = row(month);
      return {
        spentNanoUsd: current.spentNanoUsd,
        busy: current.token !== null,
        unresolved: current.unresolved,
      };
    },
  };
}
