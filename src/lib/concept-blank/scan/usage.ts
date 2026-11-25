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
  reservedNanoUsd: number;
  busy: boolean;
  unresolved: boolean;
}>;
export type ScanUsageLease = Readonly<{ month: string; token: string }>;
export type ScanUsageReservation = Readonly<{
  reservedNanoUsd: number;
  requestKey: string;
  operation: "read" | "grade";
  model: ScanPricedModel;
  promptVersion: string;
}>;
export type ScanUsageEvidence = Readonly<{
  usage?: readonly AnthropicUsage[];
  /** Server-only replay evidence. Never log or project this to a student. */
  output?: string;
}>;
/** Both operations share one UTC-month lane across processes. Unknown billing holds its
 * reservation indefinitely; a browser disconnect or TTL is never permission to repay. */
export interface ScanUsageStore {
  begin(
    month: string,
    capNanoUsd: number,
    reservation: ScanUsageReservation,
  ): Promise<ScanUsageLease>;
  settle(
    lease: ScanUsageLease,
    actualNanoUsd: number | null,
    evidence?: ScanUsageEvidence,
  ): Promise<void>;
  inspect(month: string): Promise<ScanUsageMonth>;
  findResult(requestKey: string): Promise<string | null>;
}

export function assertScanMonth(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw new RangeError("월 형식이 맞지 않습니다.");
}
export function assertScanReservation(
  cap: number,
  reservation: ScanUsageReservation,
) {
  if (
    !Number.isSafeInteger(cap) ||
    cap < 0 ||
    !Number.isSafeInteger(reservation.reservedNanoUsd) ||
    reservation.reservedNanoUsd <= 0
  )
    throw new RangeError("월 상한 또는 예약액이 맞지 않습니다.");
  if (
    !reservation.requestKey ||
    reservation.requestKey.length > 200 ||
    !reservation.promptVersion ||
    reservation.promptVersion.length > 200 ||
    !["read", "grade"].includes(reservation.operation) ||
    !Object.hasOwn(SCAN_TOKEN_PRICES_20261103, reservation.model)
  )
    throw new RangeError("호출 식별 정보가 맞지 않습니다.");
}
export function assertScanCost(cost: number | null) {
  if (cost !== null && (!Number.isSafeInteger(cost) || cost < 0))
    throw new RangeError("사용량 값이 맞지 않습니다.");
}

/** Tests/local simulation only. Not a production/serverless quota store. */
export function createMemoryScanUsageStore(): ScanUsageStore {
  const rows = new Map<
    string,
    {
      spentNanoUsd: number;
      reservedNanoUsd: number;
      token: string | null;
      unresolved: boolean;
    }
  >();
  const calls = new Map<
    string,
    { key: string; reserved: number; status: string; output?: string }
  >();
  const keys = new Map<string, string>();
  let sequence = 0;
  const row = (month: string) => {
    assertScanMonth(month);
    let result = rows.get(month);
    if (!result) {
      result = {
        spentNanoUsd: 0,
        reservedNanoUsd: 0,
        token: null,
        unresolved: false,
      };
      rows.set(month, result);
    }
    return result;
  };
  return {
    async begin(month, cap, reservation) {
      assertScanReservation(cap, reservation);
      const current = row(month);
      if (current.unresolved)
        throw new Error("이전 호출의 사용량을 확인해야 합니다.");
      if (current.token)
        throw new Error(
          "진행 중인 사진 채점 호출이 끝나면 다시 시도해 주세요.",
        );
      if (keys.has(reservation.requestKey))
        throw new Error("이미 실행한 사진 채점 작업입니다.");
      if (
        current.spentNanoUsd + current.reservedNanoUsd >
        cap - reservation.reservedNanoUsd
      )
        throw new Error(
          "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
        );
      current.token = String(++sequence);
      current.reservedNanoUsd = reservation.reservedNanoUsd;
      calls.set(current.token, {
        key: reservation.requestKey,
        reserved: reservation.reservedNanoUsd,
        status: "running",
      });
      keys.set(reservation.requestKey, current.token);
      return { month, token: current.token };
    },
    async settle(lease, cost, evidence) {
      assertScanCost(cost);
      const current = row(lease.month);
      const call = calls.get(lease.token);
      if (current.token !== lease.token || !call || call.status !== "running")
        throw new Error("이미 정산했거나 다른 호출의 사용량입니다.");
      const exceeded = cost !== null && cost > call.reserved;
      current.token = null;
      if (cost === null || exceeded) {
        current.unresolved = true;
        call.status = "unresolved";
      } else {
        current.spentNanoUsd += cost;
        current.reservedNanoUsd = 0;
        call.status = "settled";
        call.output = evidence?.output;
      }
      if (exceeded)
        throw new Error(
          "실제 사용량이 예약 상계를 넘어 운영 확인이 필요합니다.",
        );
    },
    async inspect(month) {
      const current = row(month);
      return {
        spentNanoUsd: current.spentNanoUsd,
        reservedNanoUsd: current.reservedNanoUsd,
        busy: current.token !== null,
        unresolved: current.unresolved,
      };
    },
    async findResult(key) {
      const call = calls.get(keys.get(key) ?? "");
      return call?.status === "settled" ? (call.output ?? null) : null;
    },
  };
}
