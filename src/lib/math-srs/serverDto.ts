import { numericAnswerChoices } from "./numericAnswerChoices";
import { dailyJourneyDto } from "./dailyJourney";
import type {
  MathSrsMissionSummary,
  MathSrsPublicMission,
  MathSrsState,
} from "@/contracts/mathSrs.contract";
import {
  currentSrsMission,
  type StoredSrsMission,
  type StoredSrsState,
} from "./serverState";

export function srsMissionSummary(
  mission: StoredSrsMission,
): MathSrsMissionSummary {
  return {
    id: mission.id,
    date: mission.date,
    startedAt: mission.startedAt,
    completedAt: mission.completedAt,
    answered: mission.attempts.length,
    total: 12,
    correct: mission.attempts.filter((a) => a.correct).length,
  };
}

/** Explicit projection: pending answer keys, hints, solutions and seeds are never serialized. */
export function publicSrsMission(
  mission: StoredSrsMission,
): MathSrsPublicMission {
  const attempted = new Set(mission.attempts.map((a) => a.problemId));
  return {
    id: mission.id,
    date: mission.date,
    startedAt: mission.startedAt,
    completedAt: mission.completedAt,
    attempts: mission.attempts,
    resolvedRetryProblemIds: mission.resolvedRetryProblemIds ?? [],
    problems: mission.problems.map((p) => ({
      id: p.id,
      templateId: p.templateId,
      conceptId: p.conceptId,
      conceptWeights: p.conceptWeights,
      difficulty: p.difficulty,
      kind: p.kind,
      prompt: p.prompt,
      equation: p.equation,
      answerChoices: numericAnswerChoices(p, mission.problems),
      expectedSeconds: p.expectedSeconds,
      ...(p.answerUnit ? { answerUnit: p.answerUnit } : {}),
      ...(p.source
        ? {
            source: {
              engine: p.source.engine,
              typeKey: p.source.typeKey,
              title: p.source.title,
              tier: p.source.tier,
              requestedDifficulty: p.source.requestedDifficulty,
            },
          }
        : {}),
      hint: mission.hintedProblemIds.includes(p.id) ? p.hint : null,
      feedback: attempted.has(p.id)
        ? {
            answer: p.answer,
            ...(p.answerText ? { answerText: p.answerText } : {}),
            solution: p.solution,
          }
        : null,
    })),
  };
}

export type SrsStudentContext = Pick<
  MathSrsState,
  "student" | "currentProgress" | "lectures"
>;
export function srsStateDto(
  context: SrsStudentContext,
  saved: { revision: number; state: StoredSrsState },
  now: Date,
  requestedMissionId?: string,
): MathSrsState {
  const mission = requestedMissionId
    ? (saved.state.missions.find((m) => m.id === requestedMissionId) ?? null)
    : currentSrsMission(saved.state, now);
  return {
    ...context,
    journey: dailyJourneyDto(saved.state, "middle", now),
    revision: saved.revision,
    memories: saved.state.memories,
    mission: mission ? publicSrsMission(mission) : null,
    recentMissions: saved.state.missions.slice(0, 14).map(srsMissionSummary),
    available: true,
  };
}
