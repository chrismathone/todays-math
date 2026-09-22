import { CUBE_LESSONS, CUBE_TASK_IDS } from "./lessons";
import type { CubePractice } from "./types";

export const CUBE_SAVE_KEY = "today-math-cube31-v1";
export const CONCEPTS: CubePractice["concept"][] = [
  "add-none",
  "add-once",
  "add-many",
  "subtract-none",
  "subtract-once",
  "subtract-twice",
];
export type CubeRecord = {
  completed: boolean;
  attempts: number;
  hints: number;
};
export type CubeSave = {
  version: 1;
  lesson: number;
  step: number;
  tasks: Record<string, CubeRecord>;
  mastery: Partial<Record<CubePractice["concept"], string[]>>;
  round: number;
};
export function emptyCubeSave(): CubeSave {
  return { version: 1, lesson: 0, step: 0, tasks: {}, mastery: {}, round: 0 };
}
export function parseCubeSave(raw: string | null): CubeSave {
  if (!raw) return emptyCubeSave();
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1) return emptyCubeSave();
    const result = emptyCubeSave();
    const integer = (v: unknown, max: number) =>
      typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
    if (integer(data.lesson, CUBE_LESSONS.length - 1))
      result.lesson = data.lesson;
    if (integer(data.step, 100)) result.step = data.step;
    if (integer(data.round, 100000)) result.round = data.round;
    for (const id of CUBE_TASK_IDS) {
      const r = data.tasks?.[id];
      if (
        r &&
        typeof r.completed === "boolean" &&
        integer(r.attempts, 100000) &&
        integer(r.hints, 100000)
      )
        result.tasks[id] = r;
    }
    for (const concept of CONCEPTS) {
      const ids = data.mastery?.[concept];
      if (Array.isArray(ids))
        result.mastery[concept] = [
          ...new Set(
            ids.filter(
              (id: unknown): id is string =>
                typeof id === "string" && id.length <= 150,
            ),
          ),
        ].slice(0, 100);
    }
    return result;
  } catch {
    return emptyCubeSave();
  }
}
export function updateCubeRecord(
  save: CubeSave,
  id: string,
  action: "attempt" | "hint" | "complete",
): CubeSave {
  if (!CUBE_TASK_IDS.includes(id)) return save;
  const record = save.tasks[id] ?? { completed: false, attempts: 0, hints: 0 };
  return {
    ...save,
    tasks: {
      ...save.tasks,
      [id]: {
        completed: record.completed || action === "complete",
        attempts:
          record.attempts +
          (action === "attempt" || action === "complete" ? 1 : 0),
        hints: record.hints + (action === "hint" ? 1 : 0),
      },
    },
  };
}
export function practiceRound(
  pool: CubePractice[],
  round: number,
): CubePractice[] {
  return CONCEPTS.flatMap((concept) => {
    const group = pool.filter((p) => p.concept === concept);
    return group.length ? [group[round % group.length]] : [];
  });
}
