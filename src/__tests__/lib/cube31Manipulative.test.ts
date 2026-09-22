import { describe, expect, it } from "vitest";
import {
  blockValue,
  canSplit,
  checkNotation,
  createManipulative,
  isManipulationComplete,
  manipulate,
  manipulationHint,
  notationRequirements,
  suggestsSplit,
  PLACES,
  toBlocks,
} from "@/lib/lab/cube31/manipulative";
import type {
  ManipulativeAction,
  ManipulativeState,
  Place,
  RegroupingProblem,
} from "@/lib/lab/cube31/manipulative";

function solve(problem: RegroupingProblem) {
  let state = createManipulative(problem);
  const apply = (action: ManipulativeAction) => {
    const before = JSON.stringify(state);
    const result = manipulate(problem, state, action);
    expect(result.changed).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    state = result.state;
    expect(
      [...state.workspace, ...state.tray, ...state.removed].every(
        (n) => Number.isInteger(n) && n >= 0,
      ),
    ).toBe(true);
    expect(
      blockValue(state.workspace) +
        blockValue(problem.operation === "add" ? state.tray : state.removed),
    ).toBe(problem.operation === "add" ? problem.a + problem.b : problem.a);
  };
  if (problem.b === 0) apply({ type: "confirm-zero" });
  if (problem.operation === "add") {
    for (const place of PLACES)
      while (state.tray[place] > 0) apply({ type: "move", place });
    for (const place of [0, 1, 2] as const)
      while (state.workspace[place] >= 10) apply({ type: "bundle", place });
  } else {
    for (const place of [0, 1, 2] as const) {
      const target = Math.floor(problem.b / 10 ** place) % 10;
      while (state.removed[place] < target) {
        if (state.workspace[place] === 0) {
          let donor = place + 1;
          while (state.workspace[donor] === 0) donor += 1;
          while (donor > place)
            apply({ type: "split", place: donor-- as Place });
        }
        apply({ type: "remove", place });
      }
    }
  }
  expect(isManipulationComplete(problem, state)).toBe(true);
  expect(blockValue(state.workspace)).toBe(
    problem.operation === "add" ? problem.a + problem.b : problem.a - problem.b,
  );
  return state;
}

describe("base-ten arithmetic engine", () => {
  it("conserves value for every action across 3,240 generated addition/subtraction problems", () => {
    const edges = [
      0, 1, 9, 10, 99, 100, 101, 109, 190, 199, 200, 402, 500, 599, 900, 990,
      999, 617, 254, 586,
    ];
    for (const a of edges)
      for (const b of edges) {
        solve({ a, b, operation: "add" });
        solve({ a: Math.max(a, b), b: Math.min(a, b), operation: "subtract" });
      }
    let seed = 7131;
    for (let index = 0; index < 1220; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const a = seed % 1000;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const b = seed % 1000;
      solve({ a, b, operation: "add" });
      solve({ a: Math.max(a, b), b: Math.min(a, b), operation: "subtract" });
    }
  }, 20000);

  it.each([
    [312, 126, "add", [8, 3, 4, 0], [null, null, null, null]],
    [248, 135, "add", [3, 8, 3, 0], [null, 1, null, null]],
    [586, 275, "add", [1, 6, 8, 0], [null, 1, 1, null]],
    [659, 584, "add", [3, 4, 2, 1], [null, 1, 1, 1]],
    [402, 175, "subtract", [7, 2, 2, 0], [12, 9, 3, null]],
    [500, 268, "subtract", [2, 3, 2, 0], [10, 9, 4, null]],
    [254, 138, "subtract", [6, 1, 1, 0], [14, 4, null, null]],
    [617, 342, "subtract", [5, 7, 2, 0], [null, 11, 5, null]],
    [324, 156, "subtract", [8, 6, 1, 0], [14, 11, 2, null]],
  ] as const)(
    "requires meaningful notation for %i and %i (%s)",
    (a, b, operation, digits, marks) => {
      const problem = { a, b, operation };
      const state = solve(problem);
      expect(notationRequirements(problem)).toMatchObject({ digits, marks });
      expect(
        checkNotation(problem, state, {
          digits: digits.map(String),
          marks: marks.map((n) => (n === null ? "" : String(n))),
        }).correct,
      ).toBe(true);
    },
  );

  it("never carries silently and refuses a correct written answer before moving blocks", () => {
    const problem = { a: 248, b: 135, operation: "add" } as const;
    let state = createManipulative(problem);
    const notation = { digits: ["3", "8", "3", "0"], marks: ["", "1", "", ""] };
    expect(checkNotation(problem, state, notation).correct).toBe(false);
    for (const place of PLACES)
      while (state.tray[place])
        state = manipulate(problem, state, { type: "move", place }).state;
    expect(state.workspace).toEqual([13, 7, 3, 0]);
    expect(isManipulationComplete(problem, state)).toBe(false);
    expect(checkNotation(problem, state, notation).correct).toBe(false);
    state = manipulate(problem, state, { type: "bundle", place: 0 }).state;
    expect(checkNotation(problem, state, notation).correct).toBe(true);
  });

  it("preserves exact state on illegal moves, wrong-column drops, or trades", () => {
    const problem = { a: 402, b: 175, operation: "subtract" } as const;
    const initial = createManipulative(problem);
    const reject = (state: ManipulativeState, action: ManipulativeAction) => {
      const result = manipulate(problem, state, action);
      expect(result.changed).toBe(false);
      expect(result.state).toBe(state);
      expect(result.message.length).toBeGreaterThan(15);
    };
    reject(initial, { type: "remove", place: 1 });
    reject(initial, { type: "remove", place: 2, toPlace: 1 });
    reject(initial, { type: "move", place: 2 });
    reject(initial, { type: "split", place: 0 });
    reject(initial, { type: "split", place: 1 });
    reject(initial, { type: "bundle", place: 0 });
    reject(initial, { type: "confirm-zero" });
    // 빼기 상자가 비었으면 넣을 것이 없다
    reject(initial, { type: "restore", place: 2 });
    expect(canSplit(problem, initial, 2)).toBe(true);
    const addition = { a: 312, b: 126, operation: "add" } as const;
    for (const action of [
      { type: "move", place: 1, toPlace: 0 },
      { type: "bundle", place: 0 },
      { type: "split", place: 2 },
      { type: "remove", place: 0 },
      { type: "restore", place: 0 },
    ] as const) {
      expect(
        manipulate(addition, createManipulative(addition), action).changed,
      ).toBe(false);
    }
  });

  // 원장님 2026-09-22 «정답을 정해놓고 빼고 넣도록 하지말것. 자유롭게 뺴고 넣도록. 지금 156이라서 1, 5, 6 개만
  // 뺄 수 있는데, 자유롭게 빼고 넣고 정답 맞추도록.»
  describe("뺄셈은 정답에 묶이지 않는다 — 자유롭게 빼고 넣고, 확인할 때 맞춘다", () => {
    const problem = { a: 324, b: 156, operation: "subtract" } as const;
    const run = (
      actions: ManipulativeAction[],
      from = createManipulative(problem),
    ) =>
      actions.reduce((state, action) => {
        const next = manipulate(problem, state, action);
        expect(next.changed).toBe(true);
        expect(
          blockValue(next.state.workspace) + blockValue(next.state.removed),
        ).toBe(problem.a);
        return next.state;
      }, from);
    const times = (n: number, action: ManipulativeAction) =>
      Array.from({ length: n }, () => action);

    it("빼는 수의 자리 숫자보다 더 뺄 수 있고, 뺀 블록을 다시 넣을 수 있다", () => {
      const state = run([
        ...times(3, { type: "remove", place: 2 }),
        ...times(2, { type: "restore", place: 2 }),
      ]);
      expect(state.workspace[2]).toBe(2);
      expect(state.removed[2]).toBe(1);
    });

    it("넣은 뒤 다시 맞게 빼면 끝난다", () => {
      const state = run([
        ...times(2, { type: "remove", place: 2 }),
        { type: "restore", place: 2 },
        { type: "split", place: 2 },
        { type: "split", place: 1 },
        ...times(6, { type: "remove", place: 0 }),
        ...times(5, { type: "remove", place: 1 }),
      ]);
      expect(state.workspace).toEqual([8, 6, 1, 0]);
      expect(isManipulationComplete(problem, state)).toBe(true);
    });

    it("받아내림(풀기)은 블록이 있으면 언제든 된다 — 필요한지로 막지 않는다", () => {
      const easy = { a: 617, b: 342, operation: "subtract" } as const;
      const initial = createManipulative(easy);
      expect(canSplit(easy, initial, 1)).toBe(true);
      expect(
        manipulate(easy, initial, { type: "split", place: 1 }).changed,
      ).toBe(true);
    });

    it("뺀 블록의 합이 빼는 수이면 묶음을 어떻게 뺐든 끝난다 — 백 판 대신 십 막대 10개", () => {
      const state = run([
        ...times(2, { type: "split", place: 2 }),
        ...times(15, { type: "remove", place: 1 }),
        { type: "split", place: 1 },
        ...times(6, { type: "remove", place: 0 }),
      ]);
      expect(blockValue(state.removed)).toBe(156);
      expect(state.workspace).toEqual([8, 6, 1, 0]);
      expect(isManipulationComplete(problem, state)).toBe(true);
    });

    it("뺀 합이 다르면 끝나지 않고, 확인은 뺀 수를 알려 준다", () => {
      const state = run([
        { type: "remove", place: 2 },
        ...times(2, { type: "remove", place: 1 }),
        ...times(4, { type: "remove", place: 0 }),
      ]);
      expect(blockValue(state.removed)).toBe(124);
      expect(isManipulationComplete(problem, state)).toBe(false);
      const check = checkNotation(problem, state, {
        digits: ["8", "6", "1", ""],
        marks: ["14", "11", "2", ""],
      });
      expect(check.correct).toBe(false);
      expect(check.message).toContain("124");
      expect(check.message).toContain("156");
    });

    it("받아내림은 권하기만 하고(빛·안내), 조작이 맞았다는 «완료»는 미리 알려 주지 않는다", () => {
      const initial = createManipulative(problem);
      // 324 − 156: 일의 자리(4 < 6)가 모자라 십 막대 풀기를 권한다 — 백 판 풀기도 막히지는 않는다
      expect(suggestsSplit(problem, initial, 1)).toBe(true);
      expect(canSplit(problem, initial, 2)).toBe(true);
      expect(manipulationHint(problem, initial)).toMatch(
        /일의 자리가 부족해요/,
      );
      // 일의 자리를 빼는 수(6)보다 더 뺀 뒤에는 그 자리를 위한 풀기를 권하지 않는다
      const over = run([
        { type: "split", place: 1 },
        ...times(7, { type: "remove", place: 0 }),
      ]);
      expect(suggestsSplit(problem, over, 1)).toBe(false);
      const done = run([
        { type: "split", place: 2 },
        { type: "split", place: 1 },
        ...times(6, { type: "remove", place: 0 }),
        ...times(5, { type: "remove", place: 1 }),
        { type: "remove", place: 2 },
      ]);
      expect(isManipulationComplete(problem, done)).toBe(true);
      expect(manipulationHint(problem, done)).not.toMatch(/완료/);
    });
  });

  it("allows borrowing before or after partial removals without changing notation meaning", () => {
    const problem = { a: 402, b: 175, operation: "subtract" } as const;
    let state = createManipulative(problem);
    const actions: ManipulativeAction[] = [
      { type: "remove", place: 2 },
      { type: "remove", place: 0 },
      { type: "split", place: 2 },
      { type: "split", place: 1 },
      ...Array.from({ length: 4 }, (): ManipulativeAction => ({
        type: "remove",
        place: 0,
      })),
      ...Array.from({ length: 7 }, (): ManipulativeAction => ({
        type: "remove",
        place: 1,
      })),
    ];
    for (const action of actions) {
      const next = manipulate(problem, state, action);
      expect(next.changed).toBe(true);
      state = next.state;
    }
    expect(state.workspace).toEqual([7, 2, 2, 0]);
    expect(
      checkNotation(problem, state, {
        digits: ["7", "2", "2", ""],
        marks: ["12", "9", "3", ""],
      }).correct,
    ).toBe(true);
  });

  it("requires zero digits, every needed mark, and rejects empty or nonnumeric input", () => {
    const problem = { a: 500, b: 268, operation: "subtract" } as const;
    const state = solve(problem);
    const good = { digits: ["2", "3", "2", ""], marks: ["10", "9", "4", ""] };
    for (const bad of ["", " ", "x", "2e0", "2.0", "+2", "-2", "02", "22"]) {
      expect(
        checkNotation(problem, state, { ...good, digits: [bad, "3", "2", ""] })
          .correct,
      ).toBe(false);
    }
    for (const bad of ["", "1", " 10", "10.0", "x"]) {
      expect(
        checkNotation(problem, state, { ...good, marks: [bad, "9", "4", ""] })
          .correct,
      ).toBe(false);
    }
    const zero = { a: 100, b: 100, operation: "subtract" } as const;
    const zeroState = solve(zero);
    expect(
      checkNotation(zero, zeroState, { digits: ["0", "0", "0", ""], marks: [] })
        .correct,
    ).toBe(true);
    expect(
      checkNotation(zero, zeroState, { digits: ["", "", "0", ""], marks: [] })
        .correct,
    ).toBe(false);
    expect(toBlocks(1998)).toEqual([8, 9, 9, 1]);
  });

  it.each([-1, 1.2, 1000, NaN, Infinity])(
    "rejects invalid operands: %s",
    (a) => {
      expect(() => createManipulative({ a, b: 0, operation: "add" })).toThrow(
        RangeError,
      );
    },
  );
});
