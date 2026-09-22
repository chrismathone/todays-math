import { checkAnswer, generateProblem } from "./generator";
import { kstDateOf } from "@/lib/kstDate";
import { applyAttempt, createMemories, dueConcepts } from "./memory";
import type {
  Attempt,
  ConceptId,
  Difficulty,
  Learner,
  Mission,
  MissionKind,
  Rating,
} from "./types";

export function localDateKey(now: Date): string {
  if (!Number.isFinite(now.getTime()))
    throw new Error("날짜가 올바르지 않아요.");
  return kstDateOf(now);
}

export function suggestedRating(
  correct: boolean,
  usedHint: boolean,
  elapsedSeconds: number,
  expectedSeconds: number,
): Rating {
  if (!correct) return "again";
  if (
    usedHint ||
    !Number.isFinite(elapsedSeconds) ||
    !Number.isFinite(expectedSeconds) ||
    elapsedSeconds < 2 ||
    expectedSeconds <= 0 ||
    elapsedSeconds > expectedSeconds * 1.5
  )
    return "hard";
  return "good";
}

export function createMission(
  learner: Learner,
  now: Date,
  seed: number,
): Mission {
  if (!Number.isFinite(seed)) throw new Error("미션 시드가 올바르지 않아요.");
  const date = localDateKey(now);
  const memories = createMemories().map(
    (empty) =>
      learner.memories.find((memory) => memory.conceptId === empty.conceptId) ??
      empty,
  );
  const ranked = dueConcepts(memories, now);
  const weak = [...memories].sort(
    (a, b) => (a.attempts ? a.mastery : 50) - (b.attempts ? b.mastery : 50),
  );
  const priorAttempts = learner.missions
    .flatMap((mission) => mission.attempts)
    .filter((attempt) => Date.parse(attempt.answeredAt) <= now.getTime())
    .sort((a, b) => Date.parse(b.answeredAt) - Date.parse(a.answeredAt));
  // Only retry a real missed template that has not since been answered correctly.
  const latestByTemplate = new Map<string, Attempt>();
  for (const attempt of priorAttempts)
    if (!latestByTemplate.has(attempt.templateId))
      latestByTemplate.set(attempt.templateId, attempt);
  const missed = [...latestByTemplate.values()].find(
    (attempt) => !attempt.correct,
  );
  const rhythm: { kind: MissionKind; concept: ConceptId; delta: number }[] = [
    { kind: "warmup", concept: ranked[0].conceptId, delta: -1 },
    { kind: "quick", concept: ranked[1].conceptId, delta: -1 },
    { kind: "memory", concept: ranked[2].conceptId, delta: 0 },
    { kind: "training", concept: ranked[3].conceptId, delta: 1 },
    { kind: "memory", concept: ranked[4].conceptId, delta: 0 },
    { kind: "quick", concept: ranked[5].conceptId, delta: -1 },
    { kind: "training", concept: weak[0].conceptId, delta: 0 },
    {
      kind: missed ? "revenge" : "training",
      concept: missed?.conceptId ?? weak[1].conceptId,
      delta: 0,
    },
    { kind: "memory", concept: ranked[0].conceptId, delta: 0 },
    { kind: "training", concept: weak[0].conceptId, delta: 1 },
    { kind: "quick", concept: ranked[1].conceptId, delta: -1 },
    { kind: "boss", concept: weak[0].conceptId, delta: 2 },
  ];
  const seenProblems = new Set<string>();
  const contentKey = (problem: { prompt: string; equation: string }) =>
    `${problem.prompt}\n${problem.equation}`;
  const problems = rhythm.map(({ kind, concept, delta }, index) => {
    const memory = memories.find((entry) => entry.conceptId === concept)!;
    const base =
      memory.attempts === 0
        ? 2
        : memory.mastery < 45
          ? 2
          : memory.mastery < 75
            ? 3
            : 4;
    const difficulty = Math.max(1, Math.min(5, base + delta)) as Difficulty;
    let problem = generateProblem({
      conceptId: concept,
      difficulty,
      kind,
      seed: (seed + (index + 1) * 104729) >>> 0,
    });
    for (
      let retry = 1;
      seenProblems.has(contentKey(problem)) && retry <= 25;
      retry++
    ) {
      problem = generateProblem({
        conceptId: concept,
        difficulty,
        kind,
        seed: (seed + (index + 1) * 104729 + retry * 1543) >>> 0,
      });
    }
    seenProblems.add(contentKey(problem));
    return { ...problem, id: `${problem.id}-${index}` };
  });
  return {
    id: `mission-${learner.id}-${date}-${seed >>> 0}`,
    date,
    seed: seed >>> 0,
    startedAt: now.toISOString(),
    completedAt: null,
    problems,
    attempts: [],
  };
}

function sameAttempt(a: Attempt, b: Attempt) {
  return (
    (Object.keys(a) as (keyof Attempt)[]).every((key) => a[key] === b[key]) &&
    (Object.keys(b) as (keyof Attempt)[]).every((key) => a[key] === b[key])
  );
}

/** Records exactly the next problem, once. Incorrect caller metadata is rejected. */
export function recordAttempt(
  learner: Learner,
  missionId: string,
  attempt: Attempt,
): Learner {
  const mission = learner.missions.find((entry) => entry.id === missionId);
  if (!mission) throw new Error("진행 중인 미션을 찾을 수 없어요.");
  if (!attempt || typeof attempt !== "object")
    throw new Error("학습 기록이 올바르지 않아요.");
  const prior = mission.attempts.find(
    (entry) => entry.problemId === attempt.problemId,
  );
  const problem = prior
    ? mission.problems.find((entry) => entry.id === prior.problemId)
    : mission.problems[mission.attempts.length];
  if (
    (mission.completedAt && !prior) ||
    !problem ||
    mission.problems.length !== 12 ||
    new Set(mission.problems.map((entry) => entry.id)).size !== 12 ||
    mission.attempts.some(
      (entry, index) => entry.problemId !== mission.problems[index]?.id,
    )
  ) {
    throw new Error("이 미션에는 답안을 추가할 수 없어요.");
  }
  const time = Date.parse(attempt.answeredAt);
  const previousTime = Date.parse(
    prior
      ? mission.startedAt
      : (mission.attempts.at(-1)?.answeredAt ?? mission.startedAt),
  );
  if (
    attempt.problemId !== problem.id ||
    attempt.conceptId !== problem.conceptId ||
    attempt.templateId !== problem.templateId ||
    attempt.kind !== problem.kind ||
    typeof attempt.submittedAnswer !== "string" ||
    typeof attempt.correct !== "boolean" ||
    typeof attempt.usedHint !== "boolean" ||
    !["again", "hard", "good", "easy"].includes(attempt.rating) ||
    !Number.isFinite(attempt.elapsedSeconds) ||
    attempt.elapsedSeconds < 0 ||
    attempt.elapsedSeconds > 86_400 ||
    typeof attempt.answeredAt !== "string" ||
    !Number.isFinite(time) ||
    time < previousTime ||
    new Date(time).toISOString() !== attempt.answeredAt ||
    checkAnswer(attempt.submittedAnswer, problem.answer) !== attempt.correct
  ) {
    throw new Error("현재 문제와 답안 기록이 일치하지 않아요.");
  }
  const suggested = suggestedRating(
    attempt.correct,
    attempt.usedHint,
    attempt.elapsedSeconds,
    problem.expectedSeconds,
  );
  const ratingOrder: Rating[] = ["again", "hard", "good", "easy"];
  const easyAllowed =
    suggested === "good" &&
    attempt.elapsedSeconds <= problem.expectedSeconds * 0.75;
  const ceiling = easyAllowed ? "easy" : suggested;
  const rating =
    ratingOrder[
      Math.min(
        ratingOrder.indexOf(attempt.rating),
        ratingOrder.indexOf(ceiling),
      )
    ];
  const recorded = { ...attempt, rating };
  if (prior) {
    if (sameAttempt(prior, recorded)) return learner;
    throw new Error("이미 제출한 문제의 기록을 바꿀 수 없어요.");
  }
  const attempts = [...mission.attempts, recorded];
  const updated = {
    ...mission,
    attempts,
    completedAt: attempts.length === 12 ? attempt.answeredAt : null,
  };
  return {
    ...learner,
    memories: applyAttempt(learner.memories, problem, recorded),
    missions: learner.missions.map((entry) =>
      entry.id === missionId ? updated : entry,
    ),
  };
}
