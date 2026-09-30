// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  mathSrsAttemptInputSchema,
  mathSrsStateResponseSchema,
} from "@/contracts/mathSrs.contract";
import { generateProblem } from "@/lib/math-srs/generator";
import { checkAnswer, correctSrsChoice } from "@/lib/math-srs/sharedAnswers";
import { publicSrsMission, srsStateDto } from "@/lib/math-srs/serverDto";
import {
  emptySrsState,
  parseSrsState,
  revealSrsHint,
  SrsConflict,
  SrsUnavailable,
  startSrsMission,
  submitSrsAttempt,
  type StoredSrsState,
} from "@/lib/math-srs/serverState";
import {
  changeSrsState,
  readSrsState,
  type SrsStateRow,
  type SrsStateTable,
} from "@/lib/math-srs/serverStore";
import { srsCurrentProgress } from "@/lib/math-srs/serverContext";

const studentId = "d5052be4-cc46-4d0d-a479-5004b43affaa";
const classId = "af5d2d3b-a937-4f2b-9cc5-2d616b86642a";
const now = new Date("2026-09-22T16:00:00.000Z"); // already Sep 23 in the academy
const start = (state = emptySrsState(), at = now) =>
  startSrsMission(state, studentId, at, 71, randomUUID);
/** 한 걸음 문항 연결(2026-09-27) 전에 저장된 숫자형 미션 — 숫자 엔진 공급으로 재현한다 */
const startOld = (state = emptySrsState(), at = now) =>
  startSrsMission(state, studentId, at, 71, randomUUID, generateProblem);
const rightAnswer = (
  problem: StoredSrsState["missions"][number]["problems"][number],
) => correctSrsChoice(problem) ?? String(problem.answer);
const requestFor = (state: StoredSrsState, index = 0) => ({
  missionId: state.missions[0].id,
  problemId: state.missions[0].problems[index].id,
  submittedAnswer: rightAnswer(state.missions[0].problems[index]),
  elapsedSeconds: 10,
  rating: "easy" as const,
});

/** In-memory atomic row operations: reads yield, so parallel tests really exercise stale revisions. */
function memoryTable() {
  let row: SrsStateRow | null = null;
  const table: SrsStateTable = {
    async findUnique() {
      const snapshot = structuredClone(row);
      await Promise.resolve();
      return snapshot;
    },
    async findMany() {
      return row ? [structuredClone(row)] : [];
    },
    async create({ data }) {
      if (row) throw { code: "P2002" };
      row = structuredClone(data);
      return row;
    },
    async updateMany({ where, data }) {
      if (
        !row ||
        row.studentId !== where.studentId ||
        row.revision !== where.revision
      )
        return { count: 0 };
      row = {
        ...row,
        payload: structuredClone(data.payload),
        revision: row.revision + data.revision.increment,
      };
      return { count: 1 };
    },
  };
  return table;
}

describe("server practice transitions", () => {
  it("marks stale expected revisions and exhausted atomic retries as revision mismatches", async () => {
    const table = memoryTable();
    await changeSrsState(studentId, (s) => start(s), table);
    const change = vi.fn((s: StoredSrsState) => s);
    await expect(
      changeSrsState(studentId, change, table, 0),
    ).rejects.toMatchObject({
      code: "REVISION_MISMATCH",
    });
    expect(change).not.toHaveBeenCalled();
    table.updateMany = vi.fn(async () => ({ count: 0 }));
    await expect(
      changeSrsState(studentId, (s) => ({ ...s }), table),
    ).rejects.toMatchObject({
      code: "REVISION_MISMATCH",
    });
    expect(table.updateMany).toHaveBeenCalledTimes(5);
  });

  it("uses the existing Korean date and resumes a persisted mission before creating another", () => {
    const state = start();
    expect(state.missions[0].date).toBe("2026-09-23");
    expect(
      state.missions[0].problems.every((p) => /^[a-f\d-]{36}$/.test(p.id)),
    ).toBe(true);
    expect(start(state)).toBe(state);
    expect(start(state, new Date("2026-09-24T10:00:00.000Z"))).toBe(state);
  });

  it("derives four stable answer choices for older stored missions without adding an answer key", () => {
    const saved = startOld();
    const before = structuredClone(saved);
    const result = publicSrsMission(saved.missions[0]);
    for (const [index, problem] of result.problems.entries()) {
      expect(problem.answerChoices).toHaveLength(4);
      expect(new Set(problem.answerChoices).size).toBe(4);
      expect(
        problem.answerChoices!.filter((choice) =>
          checkAnswer(choice, saved.missions[0].problems[index].answer),
        ),
      ).toHaveLength(1);
      expect(problem).not.toHaveProperty("correctChoice");
    }
    expect(
      publicSrsMission(saved.missions[0]).problems.map(
        (problem) => problem.answerChoices,
      ),
    ).toEqual(result.problems.map((problem) => problem.answerChoices));
    expect(saved).toEqual(before);
    expect(parseSrsState(saved)).toEqual(before);
  });

  it("hides answer keys, solution text, original answer text, hints and source seeds until earned", () => {
    const state = startOld();
    const problem = state.missions[0].problems[0];
    problem.answerText = "$\\frac{1}{2}$";
    problem.source = {
      engine: "middle",
      typeKey: "type1",
      title: "등식",
      tier: "기본",
      seed: 827198,
      requestedDifficulty: 1,
    };
    let mission = publicSrsMission(state.missions[0]);
    expect(mission).not.toHaveProperty("seed");
    expect(mission.problems[0]).not.toHaveProperty("answer");
    expect(mission.problems[0]).not.toHaveProperty("answerText");
    expect(mission.problems[0].source).not.toHaveProperty("seed");
    expect(
      mission.problems.every((p) => p.hint === null && p.feedback === null),
    ).toBe(true);
    const hinted = revealSrsHint(state, requestFor(state));
    expect(publicSrsMission(hinted.missions[0]).problems[0].hint).toBe(
      problem.hint,
    );
    const answered = submitSrsAttempt(
      hinted,
      studentId,
      requestFor(hinted),
      new Date(now.getTime() + 10_000),
    );
    mission = publicSrsMission(answered.missions[0]);
    expect(mission.problems[0].feedback?.answerText).toBe(problem.answerText);
    expect(mission.problems[1].feedback).toBeNull();
    expect(mission.attempts[0].usedHint).toBe(true);
    expect(mission.attempts[0].rating).toBe("hard");
  });

  it("rejects future hints/answers, changed duplicates and a different student's mission", () => {
    const state = start();
    expect(() => revealSrsHint(state, requestFor(state, 1))).toThrow(
      SrsConflict,
    );
    expect(() =>
      submitSrsAttempt(state, studentId, requestFor(state, 1), now),
    ).toThrow(SrsConflict);
    const input = requestFor(state);
    const answered = submitSrsAttempt(
      state,
      studentId,
      input,
      new Date(now.getTime() + 10_000),
    );
    expect(
      submitSrsAttempt(
        answered,
        studentId,
        input,
        new Date(now.getTime() + 60_000),
      ),
    ).toBe(answered);
    expect(() =>
      submitSrsAttempt(
        answered,
        studentId,
        { ...input, submittedAnswer: "9999" },
        now,
      ),
    ).toThrow(SrsConflict);
    expect(() => submitSrsAttempt(start(), studentId, input, now)).toThrow(
      SrsConflict,
    );
  });

  it("grades server-side and caps an easy claim using server time and hint evidence", () => {
    const state = start();
    const fast = submitSrsAttempt(
      state,
      studentId,
      requestFor(state),
      new Date(now.getTime() + 1_000),
    );
    expect(fast.missions[0].attempts[0]).toMatchObject({
      correct: true,
      rating: "hard",
      elapsedSeconds: 1,
    });
    const skipped = submitSrsAttempt(
      state,
      studentId,
      { ...requestFor(state), submittedAnswer: "" },
      now,
    );
    expect(skipped.missions[0].attempts[0]).toMatchObject({
      correct: false,
      rating: "again",
    });
    expect(
      mathSrsAttemptInputSchema.safeParse({
        ...requestFor(state),
        correct: true,
      }).success,
    ).toBe(false);
    expect(
      mathSrsAttemptInputSchema.safeParse({
        ...requestFor(state),
        studentId: randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      mathSrsAttemptInputSchema.safeParse({
        ...requestFor(state),
        usedHint: false,
      }).success,
    ).toBe(false);
  });

  it("completes twelve ordered answers and starts only on a later Korean date", () => {
    let state = start();
    for (let i = 0; i < 12; i++)
      state = submitSrsAttempt(
        state,
        studentId,
        requestFor(state, i),
        new Date(now.getTime() + (i + 1) * 10_000),
      );
    expect(state.missions[0].completedAt).not.toBeNull();
    expect(start(state)).toBe(state);
    const next = start(state, new Date("2026-09-23T16:00:00.000Z"));
    expect(next.missions).toHaveLength(2);
    expect(next.missions[0].date).toBe("2026-09-24");
    expect(next.memories).toEqual(state.memories);
    expect(parseSrsState(next)).toEqual(next);
  });

  it("refuses damaged data rather than resetting the student's real record", () => {
    const state = start();
    state.memories[1] = state.memories[0];
    expect(() => parseSrsState(state)).toThrow(SrsUnavailable);
    expect(() => parseSrsState({ version: 99 })).toThrow(SrsUnavailable);
  });

  it("rejects impossible mastery counts, altered attempt metadata and time/hint contradictions", () => {
    const state = start();
    const answered = submitSrsAttempt(
      state,
      studentId,
      requestFor(state),
      new Date(now.getTime() + 10_000),
    );
    for (const corrupt of [
      (s: StoredSrsState) => {
        s.memories[0].successes = s.memories[0].attempts + 1;
      },
      (s: StoredSrsState) => {
        s.missions[0].attempts[0].templateId = "other-template";
      },
      (s: StoredSrsState) => {
        s.missions[0].attempts[0].usedHint = true;
      },
      (s: StoredSrsState) => {
        s.missions[0].attempts[0].answeredAt = "2020-01-01T00:00:00.000Z";
      },
    ]) {
      const broken = structuredClone(answered);
      corrupt(broken);
      expect(() => parseSrsState(broken)).toThrow(SrsUnavailable);
    }
  });

  it("preserves last-answer feedback when yesterday's resumed mission completes after midnight", () => {
    let state = start();
    for (let i = 0; i < 12; i++)
      state = submitSrsAttempt(
        state,
        studentId,
        requestFor(state, i),
        new Date(now.getTime() + (i + 1) * 10_000),
      );
    const nextDay = new Date("2026-09-23T16:00:00.000Z");
    const context = {
      student: { id: studentId, name: "서연", classId, className: "중1" },
      currentProgress: null,
      lectures: [],
    };
    const dto = srsStateDto(
      context,
      { revision: 13, state },
      nextDay,
      state.missions[0].id,
    );
    expect(dto.mission?.completedAt).not.toBeNull();
    expect(dto.mission?.problems[11].feedback).not.toBeNull();
    expect(start(state, nextDay).missions).toHaveLength(2);
  });

  it("returns a response accepted by the shared UI/API contract", () => {
    const data = srsStateDto(
      {
        student: { id: studentId, name: "서연", classId, className: "중1" },
        currentProgress: null,
        lectures: [],
      },
      { revision: 1, state: start() },
      now,
    );
    expect(mathSrsStateResponseSchema.parse({ data }).data).toEqual(data);
  });
});

describe("revision compare-and-swap persistence", () => {
  it("concurrent first starts produce one daily mission", async () => {
    const table = memoryTable();
    const results = await Promise.all([
      changeSrsState(studentId, (s) => start(s), table),
      changeSrsState(studentId, (s) => start(s), table),
    ]);
    expect(results[0].state.missions[0].id).toBe(
      results[1].state.missions[0].id,
    );
    expect((await readSrsState(studentId, table)).revision).toBe(1);
  });

  it("concurrent identical submissions apply memory exactly once and return the same saved result", async () => {
    const table = memoryTable();
    const saved = await changeSrsState(studentId, (s) => start(s), table);
    const input = requestFor(saved.state);
    const change = (s: StoredSrsState) =>
      submitSrsAttempt(s, studentId, input, new Date(now.getTime() + 10_000));
    const results = await Promise.all([
      changeSrsState(studentId, change, table),
      changeSrsState(studentId, change, table),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0].revision).toBe(2);
    expect(results[0].state.missions[0].attempts).toHaveLength(1);
    expect(
      results[0].state.memories.find(
        (m) => m.conceptId === saved.state.missions[0].problems[0].conceptId,
      )?.attempts,
    ).toBe(1);
  });

  it("concurrent different answers cannot overwrite a committed answer", async () => {
    const table = memoryTable();
    const saved = await changeSrsState(studentId, (s) => start(s), table);
    const input = requestFor(saved.state);
    const results = await Promise.allSettled([
      changeSrsState(
        studentId,
        (s) =>
          submitSrsAttempt(
            s,
            studentId,
            input,
            new Date(now.getTime() + 10_000),
          ),
        table,
      ),
      changeSrsState(
        studentId,
        (s) =>
          submitSrsAttempt(
            s,
            studentId,
            { ...input, submittedAnswer: "99999" },
            new Date(now.getTime() + 10_000),
          ),
        table,
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(
      SrsConflict,
    );
    expect(
      (await readSrsState(studentId, table)).state.missions[0].attempts,
    ).toHaveLength(1);
  });

  it("missing storage fails explicitly without an in-memory persistence fallback", async () => {
    const table = memoryTable();
    table.findUnique = async () => {
      throw { code: "P2021" };
    };
    await expect(readSrsState(studentId, table)).rejects.toThrow(
      SrsUnavailable,
    );
  });
});

it("the dashboard uses the existing individual-progress fallback and latest tie-break", () => {
  const classRow = {
    id: "p1",
    classId,
    studentId: null,
    unitId: "u1",
    recordedAt: "2026-09-22",
    createdAt: "2026-09-22T00:00:00.000Z",
  };
  const ownRow = {
    ...classRow,
    id: "p2",
    studentId,
    unitId: "u2",
    recordedAt: "2026-09-20",
  };
  const sections = new Map([
    ["u1", "반 진도"],
    ["u2", "개별 진도"],
  ]);
  expect(
    srsCurrentProgress(
      [classRow],
      { id: studentId, useIndividualProgress: true },
      sections,
    )?.source,
  ).toBe("class");
  expect(
    srsCurrentProgress(
      [classRow, ownRow],
      { id: studentId, useIndividualProgress: true },
      sections,
    )?.section,
  ).toBe("개별 진도");
  expect(
    srsCurrentProgress(
      [classRow, ownRow],
      { id: studentId, useIndividualProgress: false },
      sections,
    )?.section,
  ).toBe("반 진도");
});
