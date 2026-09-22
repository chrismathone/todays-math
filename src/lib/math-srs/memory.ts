import { CONCEPT_IDS } from "./types";
import type { Attempt, ConceptMemory, GeneratedProblem, Rating } from "./types";

const DAY_MS = 86_400_000;
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));

export function createMemories(): ConceptMemory[] {
  return CONCEPT_IDS.map((conceptId) => ({
    conceptId,
    mastery: 0,
    stabilityDays: 1,
    lastReviewedAt: null,
    nextReviewAt: null,
    attempts: 0,
    successes: 0,
  }));
}

/** S is the number of days until retention reaches 90%, NOT the e-folding time. */
export function retention(memory: ConceptMemory, now: Date): number {
  if (memory.attempts === 0 || memory.lastReviewedAt === null) return 50;
  const elapsedDays = Math.max(
    0,
    (now.getTime() - Date.parse(memory.lastReviewedAt)) / DAY_MS,
  );
  if (!Number.isFinite(elapsedDays)) return 50;
  return clamp(
    100 *
      Math.exp(
        (Math.log(0.9) * elapsedDays) / Math.max(0.1, memory.stabilityDays),
      ),
    0,
    100,
  );
}

function boundedRating(problem: GeneratedProblem, attempt: Attempt): Rating {
  if (!attempt.correct) return "again";
  if (attempt.rating === "again") return "again";
  if (
    attempt.usedHint ||
    attempt.elapsedSeconds < 2 ||
    attempt.elapsedSeconds > problem.expectedSeconds * 1.5
  )
    return "hard";
  if (
    attempt.rating === "easy" &&
    attempt.elapsedSeconds > problem.expectedSeconds * 0.75
  )
    return "good";
  return attempt.rating;
}

export function applyAttempt(
  memories: ConceptMemory[],
  problem: GeneratedProblem,
  attempt: Attempt,
): ConceptMemory[] {
  const now = new Date(attempt.answeredAt);
  if (
    !Number.isFinite(now.getTime()) ||
    problem.id !== attempt.problemId ||
    problem.conceptId !== attempt.conceptId
  ) {
    throw new Error("학습 기록과 문제가 일치하지 않아요.");
  }
  const rating = boundedRating(problem, attempt);
  const weights = new Map(
    problem.conceptWeights.map(({ conceptId, weight }) => [
      conceptId,
      clamp(weight, 0, 1),
    ]),
  );
  // Always require full evidence for the tested concept; prerequisite evidence stays small.
  weights.set(problem.conceptId, 1);
  return memories.map((memory) => {
    const rawWeight = weights.get(memory.conceptId) ?? 0;
    const weight =
      memory.conceptId === problem.conceptId
        ? rawWeight
        : Math.min(0.2, rawWeight);
    if (weight <= 0) return { ...memory };
    const independent = attempt.correct && !attempt.usedHint;
    const priorMastery = memory.attempts === 0 ? 50 : memory.mastery;
    const target = !attempt.correct
      ? 0
      : attempt.usedHint
        ? 58
        : rating === "easy"
          ? 100
          : rating === "hard"
            ? 75
            : 92;
    const mastery = clamp(
      priorMastery + (target - priorMastery) * 0.28 * weight,
      0,
      100,
    );
    const previousStability = Math.max(0.1, memory.stabilityDays);
    const factor =
      rating === "again"
        ? 0.45
        : rating === "hard"
          ? 1.08
          : rating === "good"
            ? 1.7
            : 2.3;
    const stabilityDays = clamp(
      previousStability * (1 + (factor - 1) * weight),
      0.1,
      365,
    );
    // A prerequisite observation is weak evidence. It cannot refresh the whole forgetting clock.
    const priorReviewed = memory.lastReviewedAt
      ? Date.parse(memory.lastReviewedAt)
      : now.getTime();
    const reviewedAt = new Date(
      priorReviewed + (now.getTime() - priorReviewed) * weight,
    );
    const intervalDays =
      rating === "again" ? Math.min(0.25, stabilityDays) : stabilityDays;
    const nextReviewAt = new Date(
      reviewedAt.getTime() + intervalDays * DAY_MS,
    ).toISOString();
    return {
      ...memory,
      mastery,
      stabilityDays,
      lastReviewedAt: reviewedAt.toISOString(),
      nextReviewAt,
      attempts: memory.attempts + 1,
      successes: memory.successes + (independent ? 1 : 0),
    };
  });
}

/** All concepts are ranked for practice; due/unassessed concepts come before fresh ones. */
export function dueConcepts(
  memories: ConceptMemory[],
  now: Date,
): ConceptMemory[] {
  const priority = (memory: ConceptMemory) => {
    if (memory.attempts === 0) return 100;
    const overdue =
      memory.nextReviewAt === null ||
      Date.parse(memory.nextReviewAt) <= now.getTime();
    return (
      (overdue ? 150 : 0) +
      (100 - retention(memory, now)) +
      (100 - memory.mastery) * 0.45
    );
  };
  return [...memories].sort(
    (a, b) =>
      priority(b) - priority(a) ||
      CONCEPT_IDS.indexOf(a.conceptId) - CONCEPT_IDS.indexOf(b.conceptId),
  );
}
