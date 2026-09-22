export const CONCEPT_IDS = [
  "balance",
  "two-step",
  "distribute",
  "both-sides",
  "fractions",
  "word",
] as const;
export type ConceptId = (typeof CONCEPT_IDS)[number];
export type MissionKind =
  "warmup" | "quick" | "memory" | "training" | "revenge" | "boss";
export type Rating = "again" | "hard" | "good" | "easy";
export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Concept {
  id: ConceptId;
  title: string;
  description: string;
}
export interface ConceptMemory {
  conceptId: ConceptId;
  mastery: number;
  stabilityDays: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  attempts: number;
  successes: number;
}
export interface GeneratedProblem {
  id: string;
  templateId: string;
  conceptId: ConceptId;
  conceptWeights: { conceptId: ConceptId; weight: number }[];
  difficulty: Difficulty;
  kind: MissionKind;
  prompt: string;
  equation: string;
  answer: number;
  answerUnit?: string;
  hint: string;
  solution: string[];
  expectedSeconds: number;
}
export interface Attempt {
  problemId: string;
  conceptId: ConceptId;
  templateId: string;
  kind: MissionKind;
  submittedAnswer: string;
  correct: boolean;
  rating: Rating;
  usedHint: boolean;
  elapsedSeconds: number;
  answeredAt: string;
}
export interface Mission {
  id: string;
  date: string;
  seed: number;
  startedAt: string;
  completedAt: string | null;
  problems: GeneratedProblem[];
  attempts: Attempt[];
}
export interface Learner {
  id: string;
  name: string;
  memories: ConceptMemory[];
  missions: Mission[];
}
export interface SrsStore {
  version: 1;
  activeLearnerId: string;
  learners: Learner[];
}

// Engine contract: generator.ts exports CONCEPTS, TEMPLATE_COUNT,
// generateProblem({conceptId, difficulty, seed, kind?}): GeneratedProblem,
// checkAnswer(input: string, expected: number): boolean.
// memory.ts exports retention(memory, now: Date): number (0..100),
// applyAttempt(memories, problem, attempt): ConceptMemory[],
// dueConcepts(memories, now: Date): ConceptMemory[],
// createMemories(): ConceptMemory[]. Initial estimates are unassessed, not fake scores.
// mission.ts exports localDateKey(now: Date): string,
// createMission(learner: Learner, now: Date, seed: number): Mission (12 problems),
// recordAttempt(learner, missionId, attempt): Learner (idempotent, ordered),
// suggestedRating(correct, usedHint, elapsedSeconds, expectedSeconds): Rating.
// storage.ts exports STORAGE_KEY, createStore(): SrsStore,
// loadStore(storage?: Storage): {store:SrsStore; warning:string|null},
// saveStore(store:SrsStore, storage?: Storage): {ok:boolean; warning:string|null},
// addLearner(store:SrsStore, name:string): SrsStore (max 12, throws on invalid name),
// selectLearner(store:SrsStore, id:string): SrsStore,
// updateLearner(store:SrsStore, learner:Learner): SrsStore.
