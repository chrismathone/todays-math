import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_SKILL_OPERATOR,
  type ArithmeticOperator,
  type ArithmeticSkillId,
} from "@/contracts/arithmetic.contract";
import type { ProblemIneligibleCode } from "@/lib/problemEligibility";
import {
  USAGE_LABEL_ARITHMETIC_SCOPE,
  USAGE_LABEL_MIN_CANDIDATES,
  USAGE_LABEL_MIN_DISTINCT,
  USAGE_LABEL_PERIOD_MS,
  USAGE_LABEL_PROBLEM_SCOPE,
  USAGE_LABEL_TOP,
  USAGE_LABELS_CONTRACT_VERSION,
  type UsageArithmeticLabel,
  type UsageArithmeticTypeRequest,
  type UsageArithmeticV2Label,
  type UsageLabelPeriod,
  type UsageLabelsResponse,
  type UsageProblemLabel,
} from "@/contracts/usageLabels.contract";
import {
  arithmeticUsageTypeKey,
  arithmeticV2UsageTypeKey,
} from "@/lib/usageLabels/typeKey";
import { ARITHMETIC_V2_CATALOG_VERSION } from "@/contracts/arithmeticV2.contract";
import { getArithmeticV2Definition } from "@/lib/arithmetic-v2/registry";
import { decideUsageRank, usageRankLabel } from "@/lib/usageLabels/rank";

const PERIOD_NOTE =
  "지금 남아 있는 확정·인쇄 시험과 원본 학습지를 만든 시각으로 센다. 지운 기록은 포함하지 않는다.";

export type UsageViewer = { id: string; branchId?: string | null };

export type UsageUnit = {
  id: string;
  grade: string;
  chapter: string;
  section: string;
};

export type UsageProblemRecord = {
  id: string;
  questionId?: string;
  visible: boolean;
  eligible: boolean;
  ineligibleCode: ProblemIneligibleCode | null;
  unit: UsageUnit | null;
};

export type UsageProblemSide = {
  complete: boolean;
  records: readonly UsageProblemRecord[];
  /** 자격 있는 문항만. 값은 서로 다른 시험 수. */
  uses: readonly { problemId: string; testCount: number }[];
};

export type UsageArithmeticSide = {
  complete: boolean;
  /** 원본 학습지에서 한 번이라도 나온 유형. 값은 서로 다른 문서 수. */
  uses: readonly UsageArithmeticUse[];
  v2Uses?: readonly UsageArithmeticV2Use[];
};

export type UsageArithmeticV2Use = {
  typeId: string;
  typeKey: string;
  rankGroup: string;
  documentCount: number;
};

export type UsageArithmeticUse = {
  typeKey: string;
  skillId: ArithmeticSkillId;
  operator: ArithmeticOperator;
  constraints: UsageArithmeticTypeRequest["constraints"];
  documentCount: number;
};

export function usagePeriodWindow(period: UsageLabelPeriod, now: Date) {
  return {
    from:
      period === "30d" ? new Date(now.getTime() - USAGE_LABEL_PERIOD_MS) : null,
    to: now,
  };
}

export function assembleUsageLabels(input: {
  viewer: UsageViewer;
  period: UsageLabelPeriod;
  now: Date;
  problemIds: readonly string[];
  arithmeticTypes: readonly UsageArithmeticTypeRequest[];
  arithmeticV2TypeIds?: readonly string[];
  problems: UsageProblemSide | null;
  arithmetic: UsageArithmeticSide | null;
}): UsageLabelsResponse {
  const window = usagePeriodWindow(input.period, input.now);
  const periodLabel = input.period === "30d" ? "최근 30일" : "보유 중인 기록";
  return {
    contractVersion: USAGE_LABELS_CONTRACT_VERSION,
    observedAt: input.now.toISOString(),
    period: {
      id: input.period,
      label: periodLabel,
      from: window.from?.toISOString() ?? null,
      to: window.to.toISOString(),
      basis: "retained-created-at",
      history: "not-an-event-log",
      note: PERIOD_NOTE,
    },
    scope: {
      viewerId: input.viewer.id,
      branchId: input.viewer.branchId ?? null,
      problems: USAGE_LABEL_PROBLEM_SCOPE,
      arithmetic: USAGE_LABEL_ARITHMETIC_SCOPE,
    },
    metrics: {
      problems: {
        id: "my-confirmed-test-rank",
        label: "내 출제",
        population: "같은 차시에서 내가 확정·인쇄한 시험에 쓰인 자격 문항",
        countUnit: "distinct-tests",
        group: "차시",
        minimumDistinctUses: USAGE_LABEL_MIN_DISTINCT,
        minimumObservedCandidates: USAGE_LABEL_MIN_CANDIDATES,
        top: USAGE_LABEL_TOP,
        tie: "competition-joint",
      },
      arithmetic: {
        id: "my-sheet-type-rank",
        label: "내 학습지 사용",
        population: "같은 연산 기호의 학습지 유형",
        countUnit: "distinct-original-documents",
        group: "operator",
        copies: "excluded",
        minimumDistinctUses: USAGE_LABEL_MIN_DISTINCT,
        minimumObservedCandidates: USAGE_LABEL_MIN_CANDIDATES,
        top: USAGE_LABEL_TOP,
        tie: "competition-joint",
      },
      arithmeticV2: {
        id: "my-v2-sheet-type-rank",
        label: "내 학습지 사용",
        population: "같은 연산 묶음에서 내가 만든 원본 학습지의 유형",
        countUnit: "distinct-original-documents",
        group: "rankGroup",
        copies: "excluded",
        minimumDistinctUses: USAGE_LABEL_MIN_DISTINCT,
        minimumObservedCandidates: USAGE_LABEL_MIN_CANDIDATES,
        top: USAGE_LABEL_TOP,
        tie: "competition-joint",
      },
    },
    problems: input.problems
      ? problemLabels(input.problemIds, input.problems, periodLabel)
      : [],
    arithmeticTypes: input.arithmetic
      ? arithmeticLabels(input.arithmeticTypes, input.arithmetic, periodLabel)
      : [],
    arithmeticV2Types: input.arithmetic
      ? arithmeticV2Labels(
          input.arithmeticV2TypeIds ?? [],
          input.arithmetic,
          periodLabel,
        )
      : [],
  };
}

function arithmeticV2Labels(
  ids: readonly string[],
  side: UsageArithmeticSide,
  periodLabel: string,
): UsageArithmeticV2Label[] {
  const byGroup = new Map<string, { key: string; count: number }[]>();
  for (const use of side.v2Uses ?? []) {
    if (use.documentCount <= 0) continue;
    const group = byGroup.get(use.rankGroup) ?? [];
    group.push({ key: use.typeKey, count: use.documentCount });
    byGroup.set(use.rankGroup, group);
  }
  return ids.map((typeId) => {
    let rankGroup: string | null = null;
    try {
      rankGroup = getArithmeticV2Definition(typeId).rankGroup;
    } catch {
      /* Unknown IDs carry no invented counts. */
    }
    const typeKey = arithmeticV2UsageTypeKey(typeId);
    const base = {
      typeId,
      typeKey,
      catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
      rankGroup,
    };
    if (!rankGroup || !side.complete) {
      const state = rankGroup ? "unavailable" : "unknown";
      return {
        ...base,
        state,
        reason: state,
        count: null,
        rank: null,
        tied: null,
        label: null,
        tooltip: null,
        observedCandidates: null,
      };
    }
    const decision = decideUsageRank(byGroup.get(rankGroup) ?? [], typeKey);
    return {
      ...base,
      state: decision.state,
      reason: decision.reason,
      count: decision.count,
      rank: decision.rank,
      tied: decision.tied,
      label:
        decision.state === "ranked" && decision.rank !== null
          ? usageRankLabel(
              "내 학습지 사용",
              decision.rank,
              decision.tied === true,
            )
          : null,
      tooltip: `같은 연산 묶음 · ${periodLabel} · 원본 ${decision.count}장`,
      observedCandidates: decision.observedCandidates,
    };
  });
}

function problemLabels(
  ids: readonly string[],
  side: UsageProblemSide,
  periodLabel: string,
): UsageProblemLabel[] {
  if (!side.complete) {
    return ids.map((problemId) => blankProblem(problemId, "unavailable"));
  }
  const records = new Map(side.records.map((record) => [record.id, record]));
  const uses = new Map(
    side.uses.map((use) => [use.problemId, use.testCount] as const),
  );
  const byUnit = new Map<string, { key: string; count: number }[]>();
  for (const [problemId, count] of uses) {
    const record = records.get(problemId);
    if (!record?.visible || !record.eligible || !record.unit || count <= 0) {
      continue;
    }
    const group = byUnit.get(record.unit.id) ?? [];
    const key = record.questionId ?? problemId;
    // The loader supplies a union count. Never sum format siblings or rank them twice.
    const existing = group.find((item) => item.key === key);
    if (existing) existing.count = Math.max(existing.count, count);
    else group.push({ key, count });
    byUnit.set(record.unit.id, group);
  }
  return ids.map((problemId) => {
    const record = records.get(problemId);
    if (!record?.visible) return blankProblem(problemId, "unknown");
    if (!record.eligible || !record.unit) {
      return {
        ...blankProblem(problemId, "ineligible"),
        unitId: record.unit?.id ?? null,
        unitName: record.unit?.section ?? null,
        unitGrade: record.unit?.grade ?? null,
        unitChapter: record.unit?.chapter ?? null,
        ineligibleCode: record.ineligibleCode,
      };
    }
    const population = byUnit.get(record.unit.id) ?? [];
    const decision = decideUsageRank(
      population,
      record.questionId ?? problemId,
    );
    const tooltip = `차시 ${record.unit.section} · ${periodLabel} · ${decision.count}회`;
    return {
      problemId,
      state: decision.state,
      reason: decision.reason,
      unitId: record.unit.id,
      unitName: record.unit.section,
      unitGrade: record.unit.grade,
      unitChapter: record.unit.chapter,
      ineligibleCode: null,
      count: decision.count,
      rank: decision.rank,
      tied: decision.state === "ranked" ? decision.tied : decision.tied,
      label:
        decision.state === "ranked" && decision.rank !== null
          ? usageRankLabel("내 출제", decision.rank, decision.tied === true)
          : null,
      tooltip,
      observedCandidates: decision.observedCandidates,
    };
  });
}

function arithmeticLabels(
  requested: readonly UsageArithmeticTypeRequest[],
  side: UsageArithmeticSide,
  periodLabel: string,
): UsageArithmeticLabel[] {
  if (!side.complete) {
    return requested.map((item) => blankArithmetic(item, "unavailable"));
  }
  const byOperator = new Map<ArithmeticOperator, UsageArithmeticUse[]>();
  for (const use of side.uses) {
    if (use.documentCount <= 0) continue;
    const group = byOperator.get(use.operator) ?? [];
    group.push(use);
    byOperator.set(use.operator, group);
  }
  return requested.map((item) => {
    const typeKey = arithmeticUsageTypeKey(item);
    const operator = ARITHMETIC_SKILL_OPERATOR[item.skillId];
    const population = (byOperator.get(operator) ?? []).map((use) => ({
      key: use.typeKey,
      count: use.documentCount,
    }));
    const decision = decideUsageRank(population, typeKey);
    return {
      typeKey,
      skillId: item.skillId,
      operator,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      constraints: normalizedConstraints(item),
      state: decision.state,
      reason: decision.reason,
      count: decision.count,
      rank: decision.rank,
      tied: decision.state === "ranked" ? decision.tied : decision.tied,
      label:
        decision.state === "ranked" && decision.rank !== null
          ? usageRankLabel(
              "내 학습지 사용",
              decision.rank,
              decision.tied === true,
            )
          : null,
      tooltip: `연산 ${operator} · ${periodLabel} · ${decision.count}장`,
      observedCandidates: decision.observedCandidates,
    } as UsageArithmeticLabel;
  });
}

function normalizedConstraints(item: UsageArithmeticTypeRequest) {
  const key = arithmeticUsageTypeKey(item);
  const encoded = key.split("\n").slice(2).join("\n");
  return JSON.parse(encoded) as UsageArithmeticTypeRequest["constraints"];
}

function blankProblem(
  problemId: string,
  state: "unknown" | "unavailable" | "ineligible",
): UsageProblemLabel {
  return {
    problemId,
    state,
    reason: state,
    unitId: null,
    unitName: null,
    unitGrade: null,
    unitChapter: null,
    ineligibleCode: null,
    count: null,
    rank: null,
    tied: null,
    label: null,
    tooltip: null,
    observedCandidates: null,
  };
}

function blankArithmetic(
  item: UsageArithmeticTypeRequest,
  state: "unavailable",
): UsageArithmeticLabel {
  return {
    typeKey: arithmeticUsageTypeKey(item),
    skillId: item.skillId,
    operator: ARITHMETIC_SKILL_OPERATOR[item.skillId],
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    constraints: normalizedConstraints(item),
    state,
    reason: "unavailable",
    count: null,
    rank: null,
    tied: null,
    label: null,
    tooltip: null,
    observedCandidates: null,
  } as UsageArithmeticLabel;
}
