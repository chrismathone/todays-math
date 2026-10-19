/**
 * 비용 계산과 예산 상한 — 상한을 넘기면 다음 호출 전에 멈춘다(이미 나간 호출은 센다).
 */
import type { Arm } from "./arms";

export interface Usage {
  /** 입력 토큰 전체(캐시 포함) */
  input: number;
  /** 그 가운데 캐시가 맞은 토큰 */
  cachedInput: number;
  /** 출력 토큰(생각 포함) */
  output: number;
  /** 생각 토큰(알 수 있으면) */
  reasoning?: number;
}

export const ZERO_USAGE: Usage = { input: 0, cachedInput: 0, output: 0 };

export function costOf(arm: Arm, usage: Usage, at = new Date()): number {
  const { price } = arm;
  const k = price.peak?.isPeak(at) ? price.peak.multiplier : 1;
  const fresh = Math.max(0, usage.input - usage.cachedInput);
  return (
    (k *
      (fresh * price.input +
        usage.cachedInput * price.cachedInput +
        usage.output * price.output)) /
    1_000_000
  );
}

export class BudgetExceeded extends Error {
  constructor(
    readonly spent: number,
    readonly limit: number,
  ) {
    super(`예산 상한 ${limit.toFixed(2)}달러에 닿아 멈췄습니다(쓴 돈 ${spent.toFixed(4)}달러).`);
  }
}

export class Budget {
  spent = 0;
  reserved = 0;
  /** 응답을 못 받아 사용량을 모르는 호출은 확보한 최대 비용으로 센다. */
  uncertain = 0;
  constructor(readonly limit: number) {
    if (!Number.isFinite(limit) || limit < 0) throw new Error("예산은 0 이상의 유한한 달러 값이어야 합니다.");
  }
  /** 다음 호출 전에 부른다 — 예상 비용을 더해 넘으면 멈춘다 */
  check(expected = 0) {
    if (this.spent + this.reserved + expected > this.limit) throw new BudgetExceeded(this.spent, this.limit);
  }
  add(amount: number) {
    this.spent += amount;
  }
  /** 동시 호출도 같은 예산에서 최대 비용을 확보한 뒤 실제 사용량으로 정산한다. */
  reserve(maximum: number) {
    this.check(maximum);
    this.reserved += maximum;
    return (actual?: number) => {
      this.reserved -= maximum;
      this.spent += actual ?? maximum;
      if (actual === undefined) this.uncertain += maximum;
    };
  }
}

/**
 * 텍스트 호출의 보수적인 최대 비용: UTF-8 바이트 수 + 메시지 여유 1024 토큰,
 * 캐시 미적중, 출력 한도 전부(생각 포함). 110초 제한 안의 혼잡 시간 경계도 반영한다.
 * 이미지 토큰 상한은 공급자마다 달라 strict-budget에서는 이미지 호출을 받지 않는다.
 */
export function maximumTextCallCost(arm: Arm, prompt: string, at = new Date()): number {
  const usage = {
    input: Buffer.byteLength(prompt, "utf8") + 1024,
    cachedInput: 0,
    output: arm.maxOutputTokens ?? 16000,
  };
  return Math.max(costOf(arm, usage, at), costOf(arm, usage, new Date(at.getTime() + 110_000)));
}

/** 드라이런의 어림 — 한국어 섞인 지시문은 글자 0.7개당 토큰 하나쯤으로 넉넉히 본다 */
export const estimateTokens = (text: string) => Math.ceil(text.length / 0.7);
