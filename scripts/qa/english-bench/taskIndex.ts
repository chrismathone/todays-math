/** 오늘의 영어 모델 벤치 — 과제 찾기. 채점 · 분석이 기존 셋(tasks.ts)과 v4 열둘(tasksV4.ts)을 같이 본다. */
import { BENCH_TASKS, type BenchTask } from "./tasks";
import { V4_FICTION_TASKS, V4_TASKS } from "./tasksV4";

export const ALL_TASKS: BenchTask[] = [
  ...BENCH_TASKS,
  ...V4_TASKS,
  ...V4_FICTION_TASKS,
];

export function findTask(id: string): BenchTask {
  const task = ALL_TASKS.find((t) => t.id === id);
  if (!task) throw new Error(`과제 없음: ${id}`);
  return task;
}
