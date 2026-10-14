import {
  USAGE_LABEL_MIN_CANDIDATES,
  USAGE_LABEL_MIN_DISTINCT,
  USAGE_LABEL_TOP,
} from "@/contracts/usageLabels.contract";

export type UsageRankReason =
  "ranked" | "below-minimum" | "sparse-population" | "outside-top" | "unused";

export type UsageRankDecision = {
  state: "ranked" | "unranked" | "zero";
  reason: UsageRankReason;
  count: number;
  rank: number | null;
  tied: boolean | null;
  observedCandidates: number;
};

export type UsageCount = { key: string; count: number };

/**
 * 한 모집단 전체에서 경쟁 순위를 매긴다.
 * 요청 페이지에 없는 후보도 `counts` 에 있어야 한다.
 */
export function decideUsageRank(
  counts: readonly UsageCount[],
  key: string,
): UsageRankDecision {
  const totals = new Map<string, number>();
  for (const entry of counts) {
    if (!Number.isSafeInteger(entry.count) || entry.count < 0) continue;
    totals.set(entry.key, (totals.get(entry.key) ?? 0) + entry.count);
  }
  const observed = [...totals.entries()].filter(([, count]) => count > 0);
  const count = totals.get(key) ?? 0;
  const observedCandidates = observed.length;
  if (count <= 0) {
    return {
      state: "zero",
      reason: "unused",
      count: 0,
      rank: null,
      tied: false,
      observedCandidates,
    };
  }
  if (observedCandidates < USAGE_LABEL_MIN_CANDIDATES) {
    return hidden("sparse-population", count, observedCandidates);
  }
  if (count < USAGE_LABEL_MIN_DISTINCT) {
    return hidden("below-minimum", count, observedCandidates);
  }
  const rank = 1 + observed.filter(([, other]) => other > count).length;
  const tied = observed.filter(([, other]) => other === count).length > 1;
  if (rank > USAGE_LABEL_TOP) {
    return hidden("outside-top", count, observedCandidates);
  }
  return {
    state: "ranked",
    reason: "ranked",
    count,
    rank,
    tied,
    observedCandidates,
  };
}

function hidden(
  reason: Exclude<UsageRankReason, "ranked" | "unused">,
  count: number,
  observedCandidates: number,
): UsageRankDecision {
  return {
    state: "unranked",
    reason,
    count,
    rank: null,
    tied: null,
    observedCandidates,
  };
}

export function usageRankLabel(
  metric: "내 출제" | "내 학습지 사용",
  rank: number,
  tied: boolean,
): string {
  return tied ? `${metric} 공동 ${rank}위` : `${metric} ${rank}위`;
}
