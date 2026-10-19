import { DIFFICULTY_LADDER, type Difficulty } from "@/contracts/difficulty";
import {
  QUESTION_FORMAT_LABELS,
  QUESTION_FORMATS,
  type QuestionFormat,
  type QuestionFormatIntent,
  type QuestionSelectionStatus,
} from "@/contracts/questionFormats.contract";

export interface QuestionSelectionCandidate {
  id: string;
  questionId: string;
  familyId: string;
  unitId: string;
  difficulty: string;
  format: QuestionFormat;
}
export interface QuestionSelectionInput<T extends QuestionSelectionCandidate> {
  candidates: readonly T[];
  count?: number;
  allocations?: readonly { unitId: string; count: number }[];
  formats?: QuestionFormatIntent;
  difficulty?: Partial<Record<Difficulty, number>>;
  distinctFamilies?: boolean;
  excludeQuestionIds?: readonly string[];
  excludeFamilyIds?: readonly string[];
  maxNodes?: number;
  random?: () => number;
}
export interface QuestionSelectionResult<T> {
  status: QuestionSelectionStatus;
  selected: T[];
  witness: {
    requested: number;
    selected: number;
    visitedNodes: number;
    reason: string;
  };
}

/** Exact full-pool search. A bounded search reports search_limit, never a fabricated shortage.
 * Every choice is an actual row; family and question constraints are independent.
 * Equivalent representations collapse only within the SAME question/profile.
 */
export function solveQuestionSelection<T extends QuestionSelectionCandidate>(
  input: QuestionSelectionInput<T>,
): QuestionSelectionResult<T> {
  const total =
    input.allocations?.reduce((sum, a) => sum + a.count, 0) ?? input.count ?? 0;
  let nodes = 0;
  const result = (
    status: QuestionSelectionStatus,
    selected: T[],
    reason: string,
  ) => ({
    status,
    selected,
    witness: {
      requested: total,
      selected: selected.length,
      visitedNodes: nodes,
      reason,
    },
  });
  if (
    !Number.isInteger(total) ||
    total < 0 ||
    total > 100 ||
    (input.count !== undefined && input.count !== total) ||
    input.allocations?.some((a) => !Number.isInteger(a.count) || a.count < 0) ||
    (input.allocations &&
      new Set(input.allocations.map((a) => a.unitId)).size !==
        input.allocations.length)
  )
    throw new Error("Invalid question allocation");
  const distinct = input.distinctFamilies !== false;
  const excludedQ = new Set(input.excludeQuestionIds);
  const excludedF = new Set(input.excludeFamilyIds);
  const unitDemand = input.allocations
    ? new Map(input.allocations.map((a) => [a.unitId, a.count]))
    : null;
  type Demand = { key: string; count: number; accepts: (row: T) => boolean };
  const demands: Demand[] = [];
  if (unitDemand)
    for (const [unitId, count] of unitDemand)
      demands.push({
        key: `unit:${unitId}`,
        count,
        accepts: (r) => r.unitId === unitId,
      });
  function addIntent<K extends string>(
    keys: readonly K[],
    intent: Partial<Record<K, number>> | undefined,
    value: (r: T) => K,
    prefix: string,
  ) {
    if (!intent) return;
    if (Object.keys(intent).some((k) => !keys.includes(k as K)))
      throw new Error(`Invalid ${prefix} intent`);
    const specified = keys.filter((k) => intent[k] !== undefined);
    const sum = specified.reduce((s, k) => s + intent[k]!, 0);
    if (
      specified.some((k) => !Number.isInteger(intent[k]) || intent[k]! < 0) ||
      sum > total ||
      (specified.length === keys.length && sum !== total)
    )
      throw new Error(`Invalid ${prefix} allocation`);
    for (const k of specified)
      demands.push({
        key: `${prefix}:${k}`,
        count: intent[k]!,
        accepts: (r) => value(r) === k,
      });
    if (specified.length < keys.length)
      demands.push({
        key: `${prefix}:*`,
        count: total - sum,
        accepts: (r) => intent[value(r)] === undefined,
      });
  }
  addIntent(
    Object.values(QUESTION_FORMAT_LABELS),
    input.formats,
    (r) => QUESTION_FORMAT_LABELS[r.format],
    "format",
  );
  addIntent(
    DIFFICULTY_LADDER,
    input.difficulty,
    (r) => r.difficulty as Difficulty,
    "difficulty",
  );
  demands.push({ key: "total", count: total, accepts: () => true });
  const dedup = new Map<string, T>();
  for (const row of input.candidates) {
    if (
      !QUESTION_FORMATS.includes(row.format) ||
      !DIFFICULTY_LADDER.includes(row.difficulty as Difficulty) ||
      excludedQ.has(row.questionId) ||
      excludedF.has(row.familyId) ||
      (unitDemand && !unitDemand.has(row.unitId))
    )
      continue;
    const profile = JSON.stringify([
      row.questionId,
      row.familyId,
      row.unitId,
      row.difficulty,
      row.format,
    ]);
    if (!dedup.has(profile)) dedup.set(profile, row);
  }
  // Shuffle questions first: multiple stored formats do not buy extra sampling tickets.
  const byQuestion = new Map<string, T[]>();
  for (const row of dedup.values()) {
    const group = byQuestion.get(row.questionId);
    if (group) group.push(row);
    else byQuestion.set(row.questionId, [row]);
  }
  const random = input.random ?? Math.random;
  const shuffled = [...byQuestion.values()];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const options = shuffled.flatMap((rows) =>
    rows.map((row) => ({
      row,
      demands: demands.flatMap((d, i) => (d.accepts(row) ? [i] : [])),
    })),
  );
  const remaining = demands.map((d) => d.count);
  const usedQ = new Set<string>();
  const usedF = new Set<string>();
  const selected: T[] = [];
  let best: T[] = [];
  // A complete quota-respecting prefix proves feasibility. Otherwise search the full pool.
  const prefixRemaining = [...remaining];
  const prefixQ = new Set<string>();
  const prefixF = new Set<string>();
  for (const option of options) {
    const row = option.row;
    if (
      prefixQ.has(row.questionId) ||
      (distinct && prefixF.has(row.familyId)) ||
      option.demands.some((i) => prefixRemaining[i] === 0)
    )
      continue;
    best.push(row);
    prefixQ.add(row.questionId);
    prefixF.add(row.familyId);
    for (const i of option.demands) prefixRemaining[i]--;
    if (best.length === total) break;
  }
  if (best.length === total)
    return result("complete", best, "exact_assignment");
  let limited = false;
  let lastReason = "full_pool_exhausted";
  const maxNodes = Math.max(0, input.maxNodes ?? 50000);
  function visit(): boolean {
    if (selected.length === total) return true;
    if (nodes >= maxNodes) {
      limited = true;
      return false;
    }
    nodes++;
    const open = options.filter(
      (o) =>
        !usedQ.has(o.row.questionId) &&
        (!distinct || !usedF.has(o.row.familyId)) &&
        o.demands.every((i) => remaining[i] > 0),
    );
    let target = -1;
    let tightness = Infinity;
    let targetOptions: typeof open = [];
    for (let i = 0; i < demands.length; i++) {
      if (!remaining[i]) continue;
      const candidates = open.filter((o) => o.demands.includes(i));
      const qs = new Set(candidates.map((o) => o.row.questionId)).size;
      const fs = distinct
        ? new Set(candidates.map((o) => o.row.familyId)).size
        : qs;
      const capacity = Math.min(qs, fs);
      if (capacity < remaining[i]) {
        lastReason = `capacity:${demands[i].key}:${capacity}<${remaining[i]}`;
        return false;
      }
      const slack = capacity - remaining[i];
      if (
        slack < tightness ||
        (slack === tightness && candidates.length < targetOptions.length)
      ) {
        target = i;
        tightness = slack;
        targetOptions = candidates;
      }
    }
    if (target < 0) return false;
    // Rows of the same family/profile are interchangeable only if that question
    // cannot also occur under a different family (NULL family legacy fallback).
    const seen = new Set<string>();
    const questionFamilies = new Map<string, Set<string>>();
    for (const o of open) {
      const fs = questionFamilies.get(o.row.questionId) ?? new Set<string>();
      fs.add(o.row.familyId);
      questionFamilies.set(o.row.questionId, fs);
    }
    for (const o of targetOptions) {
      const key = JSON.stringify([
        distinct && questionFamilies.get(o.row.questionId)?.size === 1
          ? o.row.familyId
          : o.row.questionId,
        o.row.unitId,
        o.row.difficulty,
        o.row.format,
      ]);
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push(o.row);
      usedQ.add(o.row.questionId);
      usedF.add(o.row.familyId);
      for (const i of o.demands) remaining[i]--;
      if (selected.length > best.length) best = [...selected];
      if (visit()) return true;
      for (const i of o.demands) remaining[i]++;
      selected.pop();
      usedQ.delete(o.row.questionId);
      usedF.delete(o.row.familyId);
      if (limited) return false;
    }
    return false;
  }
  if (visit()) return result("complete", [...selected], "exact_assignment");
  return result(
    limited ? "search_limit" : "insufficient",
    best,
    limited ? "node_limit" : lastReason,
  );
}
