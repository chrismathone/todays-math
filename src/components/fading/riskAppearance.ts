/** 복습 순서는 소스가 정한다. 이 문턱은 v2 대기열의 표시 색에만 쓴다. */
export const FADING_RISK_APPEARANCE = { high: 0.8, mid: 0.6 } as const;
export function fadingRiskTone(risk: number | null): "high" | "mid" | "low" {
  return risk !== null && risk >= FADING_RISK_APPEARANCE.high
    ? "high"
    : risk !== null && risk >= FADING_RISK_APPEARANCE.mid
      ? "mid"
      : "low";
}
