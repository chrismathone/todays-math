import { CONCEPT_IDS, type Learner, type SrsStore } from "./types";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { createMemories } from "./memory";
import { srsChoiceIssue } from "./sharedAnswers";

export const STORAGE_KEY = "todays-math:srs:v1";

const MAX_LEARNERS = 12;
// Keep the newest 90 missions by startedAt; lifetime concept memory is preserved.
const MAX_SAVED_MISSIONS = 90;
const MAX_INPUT_MISSIONS = 10_000;
const MAX_SERIALIZED_LENGTH = 12_000_000;
const KINDS = ["warmup", "quick", "memory", "training", "revenge", "boss"];
const RATINGS = ["again", "hard", "good", "easy"];
const CORRUPT_WARNING =
  "저장된 학습 기록을 읽을 수 없어 임시 학습으로 시작합니다. 기존 기록은 덮어쓰지 않습니다.";
const UNSUPPORTED_WARNING =
  "다른 버전의 학습 기록이 있습니다. 기존 기록을 보호하기 위해 이 화면에서는 저장하지 않습니다.";
const UNAVAILABLE_WARNING =
  "이 환경에서는 브라우저에 학습 기록을 저장할 수 없습니다. 창을 닫으면 이번 학습 기록이 사라질 수 있습니다.";

function invalid(): never {
  throw new Error("학습 기록의 형식이 올바르지 않습니다.");
}

function object(
  value: unknown,
  required: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const result = value as Record<string, unknown>;
  if (
    required.some((key) => !Object.hasOwn(result, key)) ||
    Object.keys(result).some(
      (key) => !required.includes(key) && !optional.includes(key),
    )
  )
    invalid();
  return result;
}

function array(value: unknown, min: number, max: number): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max)
    invalid();
  return Array.from(value);
}

function text(value: unknown, max: number, min = 1): string {
  if (typeof value !== "string" || value.length < min || value.length > max)
    invalid();
  return value;
}

function number(
  value: unknown,
  min: number,
  max: number,
  integer = false,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isSafeInteger(value))
  )
    invalid();
  return value;
}

function choice(value: unknown, choices: readonly string[]): string {
  if (typeof value !== "string" || !choices.includes(value)) invalid();
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") invalid();
  return value;
}

function timestamp(value: unknown): number {
  const date = text(value, 24);
  // Dates written by this version use Date.toISOString(), including milliseconds.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(date)) invalid();
  const result = Date.parse(date);
  if (!Number.isFinite(result) || new Date(result).toISOString() !== date)
    invalid();
  return result;
}

function unique(values: string[]): void {
  if (new Set(values).size !== values.length) invalid();
}

function learnerName(value: unknown): string {
  const name = text(value, 20);
  if (
    name.trim() !== name ||
    !name.trim() ||
    /[\u0000-\u001f\u007f]/.test(name)
  )
    invalid();
  return name;
}

function validateMemory(value: unknown): string {
  const memory = object(value, [
    "conceptId",
    "mastery",
    "stabilityDays",
    "lastReviewedAt",
    "nextReviewAt",
    "attempts",
    "successes",
  ]);
  const conceptId = choice(memory.conceptId, CONCEPT_IDS);
  const mastery = number(memory.mastery, 0, 100);
  const stability = number(memory.stabilityDays, Number.MIN_VALUE, 36_500);
  const attempts = number(memory.attempts, 0, Number.MAX_SAFE_INTEGER, true);
  number(memory.successes, 0, attempts, true);
  if (attempts === 0) {
    if (
      memory.lastReviewedAt !== null ||
      memory.nextReviewAt !== null ||
      mastery !== 0 ||
      stability !== 1
    )
      invalid();
  } else if (
    timestamp(memory.nextReviewAt) < timestamp(memory.lastReviewedAt)
  ) {
    invalid();
  }
  return conceptId;
}

function validateProblem(value: unknown): Record<string, unknown> {
  const problem = object(
    value,
    [
      "id",
      "templateId",
      "conceptId",
      "conceptWeights",
      "difficulty",
      "kind",
      "prompt",
      "equation",
      "answer",
      "hint",
      "solution",
      "expectedSeconds",
    ],
    ["answerUnit", "answerText", "choices", "source"],
  );
  text(problem.id, 200);
  text(problem.templateId, 200);
  const conceptId = choice(problem.conceptId, CONCEPT_IDS);
  const weights = array(problem.conceptWeights, 1, CONCEPT_IDS.length).map(
    (value) => {
      const weight = object(value, ["conceptId", "weight"]);
      number(weight.weight, Number.MIN_VALUE, 1);
      return choice(weight.conceptId, CONCEPT_IDS);
    },
  );
  unique(weights);
  if (!weights.includes(conceptId)) invalid();
  number(problem.difficulty, 1, 5, true);
  choice(problem.kind, KINDS);
  text(problem.prompt, 4_000);
  text(problem.equation, 1_000, 0);
  number(problem.answer, -1e12, 1e12);
  if (problem.answerText !== undefined) text(problem.answerText, 4_000);
  if (problem.answerUnit !== undefined) text(problem.answerUnit, 100);
  // Same rule as the server record: four distinct choices, `answer` an index.
  if (srsChoiceIssue(problem)) invalid();
  text(problem.hint, 4_000);
  array(problem.solution, 1, 20).forEach((step) => text(step, 4_000));
  number(problem.expectedSeconds, Number.MIN_VALUE, 3_600);
  if (problem.source !== undefined) {
    const source = object(problem.source, [
      "engine",
      "typeKey",
      "title",
      "tier",
      "seed",
      "requestedDifficulty",
    ]);
    choice(source.engine, ["middle"]);
    text(source.typeKey, 200);
    text(source.title, 200);
    choice(source.tier, DIFFICULTY_LADDER);
    number(source.seed, 0, 0xffffffff, true);
    number(source.requestedDifficulty, 1, 5, true);
  }
  return problem;
}

function validateMission(value: unknown): string {
  const mission = object(value, [
    "id",
    "date",
    "seed",
    "startedAt",
    "completedAt",
    "problems",
    "attempts",
  ]);
  const id = text(mission.id, 200);
  const day = text(mission.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) invalid();
  timestamp(`${day}T00:00:00.000Z`);
  number(mission.seed, 0, Number.MAX_SAFE_INTEGER, true);
  let previousTime = timestamp(mission.startedAt);
  const problems = array(mission.problems, 12, 12).map(validateProblem);
  unique(problems.map((problem) => problem.id as string));
  const attempts = array(mission.attempts, 0, problems.length);
  attempts.forEach((value, index) => {
    const attempt = object(value, [
      "problemId",
      "conceptId",
      "templateId",
      "kind",
      "submittedAnswer",
      "correct",
      "rating",
      "usedHint",
      "elapsedSeconds",
      "answeredAt",
    ]);
    const problem = problems[index];
    if (
      attempt.problemId !== problem.id ||
      attempt.conceptId !== problem.conceptId ||
      attempt.templateId !== problem.templateId ||
      attempt.kind !== problem.kind
    )
      invalid();
    text(attempt.submittedAnswer, 200, 0);
    boolean(attempt.correct);
    choice(attempt.rating, RATINGS);
    boolean(attempt.usedHint);
    number(attempt.elapsedSeconds, 0, 31_536_000);
    const answeredAt = timestamp(attempt.answeredAt);
    if (answeredAt < previousTime) invalid();
    previousTime = answeredAt;
  });
  if (attempts.length === problems.length) {
    if (timestamp(mission.completedAt) < previousTime) invalid();
  } else if (mission.completedAt !== null) {
    invalid();
  }
  return id;
}

function validateStore(
  value: unknown,
  missionLimit = MAX_INPUT_MISSIONS,
): asserts value is SrsStore {
  const store = object(value, ["version", "activeLearnerId", "learners"]);
  if (store.version !== 1) invalid();
  const activeId = text(store.activeLearnerId, 200);
  const names: string[] = [];
  const ids = array(store.learners, 1, MAX_LEARNERS).map((value) => {
    const learner = object(value, ["id", "name", "memories", "missions"]);
    names.push(learnerName(learner.name).toLocaleLowerCase());
    const memories = array(
      learner.memories,
      CONCEPT_IDS.length,
      CONCEPT_IDS.length,
    ).map(validateMemory);
    unique(memories);
    unique(array(learner.missions, 0, missionLimit).map(validateMission));
    return text(learner.id, 200);
  });
  unique(ids);
  unique(names);
  if (!ids.includes(activeId)) invalid();
}

function id(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `learner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

function createLearner(name: string): Learner {
  return {
    id: id(),
    name,
    memories: createMemories(),
    missions: [],
  };
}

export function createStore(): SrsStore {
  const learner = createLearner("나의 학습");
  // The initial profile is also rendered on the server; its identity must agree
  // with the first client render and repeated reads of an empty storage key.
  learner.id = "srs-default";
  return { version: 1, activeLearnerId: learner.id, learners: [learner] };
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  // Access itself may throw when browser privacy settings deny localStorage.
  return window.localStorage;
}

function parseStore(raw: string): {
  store: SrsStore | null;
  warning: string | null;
} {
  try {
    // A bounded input avoids spending excessive time parsing externally altered storage.
    if (raw.length > MAX_SERIALIZED_LENGTH)
      return { store: null, warning: CORRUPT_WARNING };
    const value: unknown = JSON.parse(raw);
    if (
      value &&
      typeof value === "object" &&
      "version" in value &&
      value.version !== 1
    ) {
      return { store: null, warning: UNSUPPORTED_WARNING };
    }
    validateStore(value, MAX_SAVED_MISSIONS);
    return { store: value, warning: null };
  } catch {
    return { store: null, warning: CORRUPT_WARNING };
  }
}

export function loadStore(storage?: Storage): {
  store: SrsStore;
  warning: string | null;
} {
  try {
    const target = resolveStorage(storage);
    if (!target) return { store: createStore(), warning: UNAVAILABLE_WARNING };
    const raw = target.getItem(STORAGE_KEY);
    if (raw === null) return { store: createStore(), warning: null };
    const loaded = parseStore(raw);
    return { store: loaded.store ?? createStore(), warning: loaded.warning };
  } catch {
    return { store: createStore(), warning: UNAVAILABLE_WARNING };
  }
}

export function saveStore(
  store: SrsStore,
  storage?: Storage,
): { ok: boolean; warning: string | null } {
  try {
    validateStore(store);
  } catch {
    return {
      ok: false,
      warning:
        "학습 기록의 형식이 올바르지 않아 저장하지 않았습니다. 기존 기록은 유지됩니다.",
    };
  }
  try {
    const target = resolveStorage(storage);
    if (!target) return { ok: false, warning: UNAVAILABLE_WARNING };
    const previous = target.getItem(STORAGE_KEY);
    if (previous !== null) {
      const parsed = parseStore(previous);
      if (!parsed.store) return { ok: false, warning: parsed.warning };
    }
    const compacted: SrsStore = {
      ...store,
      learners: store.learners.map((learner) => ({
        ...learner,
        missions:
          learner.missions.length > MAX_SAVED_MISSIONS
            ? [...learner.missions]
                .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
                .slice(0, MAX_SAVED_MISSIONS)
            : learner.missions,
      })),
    };
    const serialized = JSON.stringify(compacted);
    if (serialized.length > MAX_SERIALIZED_LENGTH) {
      return {
        ok: false,
        warning:
          "학습 기록의 크기가 저장 한도를 초과했습니다. 이전 기록은 유지됩니다.",
      };
    }
    target.setItem(STORAGE_KEY, serialized);
    return { ok: true, warning: null };
  } catch (error) {
    const errorName =
      error && typeof error === "object" && "name" in error ? error.name : "";
    const quota =
      errorName === "QuotaExceededError" ||
      errorName === "NS_ERROR_DOM_QUOTA_REACHED";
    return {
      ok: false,
      warning: quota
        ? "브라우저 저장 공간이 부족해 이번 변경을 저장하지 못했습니다. 이전 기록은 유지됩니다."
        : UNAVAILABLE_WARNING,
    };
  }
}

export function addLearner(store: SrsStore, name: string): SrsStore {
  validateStore(store);
  if (typeof name !== "string") throw new Error("학습자 이름을 입력해 주세요.");
  const trimmed = name.trim();
  try {
    learnerName(trimmed);
  } catch {
    throw new Error("학습자 이름은 공백을 제외하고 1~20자로 입력해 주세요.");
  }
  if (
    store.learners.some(
      (learner) =>
        learner.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  ) {
    throw new Error("이미 사용 중인 학습자 이름입니다.");
  }
  if (store.learners.length >= MAX_LEARNERS)
    throw new Error("학습자는 최대 12명까지 만들 수 있습니다.");
  const learner = createLearner(trimmed);
  // Even a mocked or unavailable UUID source must not replace an existing profile.
  while (store.learners.some((existing) => existing.id === learner.id))
    learner.id += "-new";
  return {
    ...store,
    activeLearnerId: learner.id,
    learners: [...store.learners, learner],
  };
}

export function selectLearner(store: SrsStore, learnerId: string): SrsStore {
  validateStore(store);
  if (!store.learners.some((learner) => learner.id === learnerId))
    throw new Error("학습자를 찾을 수 없습니다.");
  return { ...store, activeLearnerId: learnerId };
}

export function updateLearner(store: SrsStore, learner: Learner): SrsStore {
  validateStore(store);
  if (
    !learner ||
    !store.learners.some((existing) => existing.id === learner.id)
  ) {
    throw new Error("수정할 학습자를 찾을 수 없습니다.");
  }
  const result = {
    ...store,
    learners: store.learners.map((existing) =>
      existing.id === learner.id ? learner : existing,
    ),
  };
  validateStore(result);
  return result;
}
