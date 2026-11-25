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
  activeCalls: number;
  queuedCalls: number;
}>;
export type ScanUsageLease = Readonly<{ month: string; token: string }>;
export type ScanUsageReservation = Readonly<{
  reservedNanoUsd: number;
  requestKey: string;
  resultKey?: string;
  bound?: object;
  operation: "read" | "grade";
  model: ScanPricedModel;
  promptVersion: string;
}>;
export type ScanUsageEvidence = Readonly<{
  usage?: readonly AnthropicUsage[];
  /** Server-only replay evidence. Never log or project this to a student. */
  output?: string;
}>;
/** Atomic reservation sums across processes; queued work retains its position and bound. */
export interface ScanUsageStore {
  begin(
    month: string,
    capNanoUsd: number,
    reservation: ScanUsageReservation,
    maxConcurrent?: number,
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

/** Internal control flow: persist the job as waiting, never expose this as a busy failure. */
export class ScanQueuedError extends Error {
  constructor() {
    super("차례를 기다리는 중");
    this.name = "ScanQueuedError";
  }
}
export function assertScanConcurrency(value: number) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new RangeError("동시 호출 상한이 맞지 않습니다.");
}

/** Tests/local simulation only. Not a production/serverless quota store. */
export function createMemoryScanUsageStore(): ScanUsageStore {
  type Call = {
    token: string;
    month: string;
    key: string;
    resultKey: string;
    reserved: number;
    status: string;
    output?: string;
  };
  const months = new Map<string, { spent: number; reserved: number }>();
  const calls = new Map<string, Call>();
  const row = (month: string) => {
    assertScanMonth(month);
    if (!months.has(month)) months.set(month, { spent: 0, reserved: 0 });
    return months.get(month)!;
  };
  let sequence = 0;
  return {
    async begin(month, cap, reservation, maxConcurrent = 4) {
      assertScanMonth(month);
      assertScanReservation(cap, reservation);
      assertScanConcurrency(maxConcurrent);
      let call = [...calls.values()].find(
        (c) => c.key === reservation.requestKey,
      );
      if (
        call &&
        (call.status !== "queued" ||
          call.reserved !== reservation.reservedNanoUsd ||
          call.resultKey !== (reservation.resultKey ?? reservation.requestKey))
      )
        throw new Error("이미 실행한 사진 채점 작업입니다.");
      if (!call) {
        const current = row(month);
        if (
          current.spent + current.reserved >
          cap - reservation.reservedNanoUsd
        )
          throw new Error(
            "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
          );
        call = {
          token: String(++sequence),
          month,
          key: reservation.requestKey,
          resultKey: reservation.resultKey ?? reservation.requestKey,
          reserved: reservation.reservedNanoUsd,
          status: "queued",
        };
        calls.set(call.token, call);
        current.reserved += call.reserved;
      }
      if (row(call.month).spent + row(call.month).reserved > cap)
        throw new Error(
          "사진 채점의 월 사용 상한에 필요한 예약액이 남지 않았습니다.",
        );
      if (
        [...calls.values()].filter((c) => c.status === "running").length >=
          maxConcurrent ||
        [...calls.values()].find((c) => c.status === "queued") !== call
      )
        throw new ScanQueuedError();
      call.status = "running";
      return { month: call.month, token: call.token };
    },
    async settle(lease, cost, evidence) {
      assertScanCost(cost);
      const call = calls.get(lease.token);
      if (!call || call.month !== lease.month || call.status !== "running")
        throw new Error("이미 정산했거나 다른 호출의 사용량입니다.");
      const current = row(call.month);
      current.spent += cost ?? call.reserved;
      current.reserved -= call.reserved;
      call.status = "settled";
      const exceeded = cost !== null && cost > call.reserved;
      if (cost !== null && !exceeded) call.output = evidence?.output;
      if (exceeded)
        throw new Error(
          "실제 사용량이 예약 상계를 넘었습니다. 실제 사용량을 기록했습니다.",
        );
    },
    async inspect(month) {
      const current = row(month),
        list = [...calls.values()].filter((c) => c.month === month);
      const activeCalls = list.filter((c) => c.status === "running").length;
      return {
        spentNanoUsd: current.spent,
        reservedNanoUsd: current.reserved,
        busy: activeCalls > 0,
        unresolved: false,
        activeCalls,
        queuedCalls: list.filter((c) => c.status === "queued").length,
      };
    },
    async findResult(key) {
      return (
        [...calls.values()].find(
          (c) =>
            c.resultKey === key &&
            c.status === "settled" &&
            c.output !== undefined,
        )?.output ?? null
      );
    },
  };
}
