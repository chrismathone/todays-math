import { describe, expect, it } from "vitest";
import { CUBE_LESSONS, CUBE_TASK_IDS } from "@/lib/lab/cube31/lessons";
import {
  CONCEPTS,
  emptyCubeSave,
  parseCubeSave,
  practiceRound,
  updateCubeRecord,
} from "@/lib/lab/cube31/progress";
import type { CubePractice } from "@/lib/lab/cube31/types";
import { unitById } from "@/lib/lab/curriculum";

describe("Cube unit learning coverage and saved evidence", () => {
  it("covers every source page and every calculation transfer category", () => {
    const tasks = CUBE_LESSONS.flatMap((l) => l.tasks);
    expect(new Set(CUBE_TASK_IDS).size).toBe(CUBE_TASK_IDS.length);
    expect(
      [...new Set(tasks.flatMap((t) => t.sourcePages))].sort((a, b) => a - b),
    ).toEqual(Array.from({ length: 24 }, (_, i) => i + 8));
    expect(
      tasks.filter((t) => t.kind === "regroup").length,
    ).toBeGreaterThanOrEqual(11);
    expect(
      tasks.some((t) => t.kind === "regroup" && t.a === 805 && t.b === 128),
    ).toBe(true);
    expect(unitById("3-1-1")).toMatchObject({
      gate: "play",
      status: "implemented",
      courses: ["cube-3-1"],
    });
    expect(tasks.filter((t) => t.sourcePages.includes(31))).toEqual([
      expect.objectContaining({ kind: "puzzle" }),
    ]);
  });
  it("rejects corrupt progress and unrecognized completion ids", () => {
    for (const bad of ["no json", "null", '{"version":2}', null])
      expect(parseCubeSave(bad)).toEqual(emptyCubeSave());
    const restored = parseCubeSave(
      JSON.stringify({
        version: 1,
        lesson: 999,
        step: -1,
        round: NaN,
        tasks: {
          invented: { completed: true, attempts: 0, hints: 0 },
          [CUBE_TASK_IDS[0]]: { completed: true, attempts: -1, hints: 0 },
        },
        mastery: { "add-none": ["sample", "sample", 3], unknown: ["a"] },
      }),
    );
    expect(restored.lesson).toBe(0);
    expect(restored.step).toBe(0);
    expect(restored.tasks).toEqual({});
    expect(restored.mastery).toEqual({ "add-none": ["sample"] });
  });
  it("persists completion independently from hints and failed attempts", () => {
    const id = CUBE_TASK_IDS[0];
    let save = updateCubeRecord(emptyCubeSave(), id, "hint");
    save = updateCubeRecord(save, id, "attempt");
    expect(save.tasks[id]).toEqual({ completed: false, hints: 1, attempts: 1 });
    save = updateCubeRecord(save, id, "complete");
    expect(save.tasks[id]).toEqual({ completed: true, hints: 1, attempts: 2 });
    expect(parseCubeSave(JSON.stringify(save))).toEqual(save);
    expect(updateCubeRecord(save, "not-an-activity", "complete")).toBe(save);
    expect(save.mastery).toEqual({});
  });
  it("rotates new generated problems while preserving six concept checks", () => {
    const pool: CubePractice[] = CONCEPTS.flatMap((concept, c) =>
      [0, 1, 2].map((i) => ({
        id: concept + i,
        a: 100 + c + i,
        b: 100,
        operation: "add",
        answer: 200 + c + i,
        concept,
      })),
    );
    const a = practiceRound(pool, 0),
      b = practiceRound(pool, 1);
    expect(a.map((p) => p.concept)).toEqual(CONCEPTS);
    expect(b.map((p) => p.concept)).toEqual(CONCEPTS);
    expect(a.every((p, i) => p.id !== b[i].id)).toBe(true);
    expect(practiceRound(pool, 3)).toEqual(a);
  });
});
