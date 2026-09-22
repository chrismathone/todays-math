import { describe, expect, it } from "vitest";
import {
  PLAY_MISSIONS,
  canPlayPrimary,
  createPlayState,
  isPlayGoal,
  reducePlay,
} from "@/lib/lab/cube31/conceptPlay";
import type { PlayEvent, PlayState } from "@/lib/lab/cube31/conceptPlay";
import { blockValue } from "@/lib/lab/cube31/manipulative";

const p = (place: 0 | 1 | 2, count = 1): PlayEvent[] =>
  Array.from({ length: count }, () => ({ type: "primary", place }));
const exchange: PlayEvent = { type: "exchange" };
const solutions: PlayEvent[][] = [
  [...p(1), ...p(0, 2)],
  [...p(2), ...p(0, 3)],
  [exchange],
  [exchange],
  [...p(1), ...p(0, 2)],
  [...p(2, 2), ...p(1), ...p(0, 4), exchange],
  [...p(2, 2), ...p(1), ...p(0, 4)],
  [exchange, ...p(2), ...p(1, 3), ...p(0, 8)],
];

describe("scripted block-store missions", () => {
  it.each(
    PLAY_MISSIONS.map((mission, round) => [round, mission.title] as const),
  )("scene %i %s requires its actual actions and exact goal", (round) => {
    const mission = PLAY_MISSIONS[round];
    let state = createPlayState(round);
    expect(isPlayGoal(mission, state.board)).toBe(false);
    for (const [i, action] of solutions[round].entries()) {
      state = reducePlay(state, action);
      expect(state.phase).toBe(
        i === solutions[round].length - 1 ? "success" : "playing",
      );
    }
    expect(blockValue(state.board.workspace)).toBe(mission.target);
    expect(isPlayGoal(mission, state.board)).toBe(true);
  });

  it("requires the right representation even when the total already equals the goal", () => {
    const build = createPlayState();
    expect(
      isPlayGoal(PLAY_MISSIONS[0], {
        ...build.board,
        workspace: [12, 0, 0, 0],
        moves: 12,
      }),
    ).toBe(false);
    const bundle = createPlayState(2);
    expect(isPlayGoal(PLAY_MISSIONS[2], { ...bundle.board, moves: 1 })).toBe(
      false,
    );
    const split = createPlayState(3);
    expect(isPlayGoal(PLAY_MISSIONS[3], { ...split.board, moves: 1 })).toBe(
      false,
    );
    expect(
      isPlayGoal(PLAY_MISSIONS[1], {
        ...build.board,
        workspace: [3, 0, 1, 0],
        moves: 4,
      }),
    ).toBe(true);
  });

  it("teaches bundling when a build uses equivalent ungrouped blocks", () => {
    let twelve = p(0, 12).reduce(reducePlay, createPlayState());
    expect(twelve.phase).toBe("playing");
    expect(twelve.feedback).toContain("큰 블록 1개로 묶어");
    twelve = reducePlay(twelve, exchange);
    expect(twelve.phase).toBe("success");
    expect(twelve.board.workspace).toEqual([2, 1, 0, 0]);
    let hundred = [...p(1, 10), ...p(0, 3)].reduce(
      reducePlay,
      createPlayState(1),
    );
    expect(hundred.phase).toBe("playing");
    hundred = reducePlay(hundred, exchange);
    expect(hundred.phase).toBe("success");
    expect(hundred.board.workspace).toEqual([3, 0, 1, 0]);
  });

  it("conserves workspace plus tray through all carry actions, including early bundling", () => {
    let state = createPlayState(5);
    for (const event of [
      ...p(0, 2),
      exchange,
      ...p(2, 2),
      ...p(1),
      ...p(0, 2),
    ]) {
      state = reducePlay(state, event);
      expect(
        blockValue(state.board.workspace) + blockValue(state.board.tray),
      ).toBe(352);
    }
    expect(state.board.workspace).toEqual([2, 5, 3, 0]);
    expect(state.phase).toBe("success");
  });

  it("does not accept the addition total until the learner bundles the carry", () => {
    const state = solutions[5]
      .slice(0, -1)
      .reduce(reducePlay, createPlayState(5));
    expect(blockValue(state.board.workspace)).toBe(352);
    expect(state.board.workspace).toEqual([12, 4, 3, 0]);
    expect(state.phase).toBe("playing");
    expect(reducePlay(state, exchange).phase).toBe("success");
  });

  it("conserves workspace plus delivered blocks through borrow, overshoot and restore", () => {
    let state = createPlayState(7);
    const events: PlayEvent[] = [
      ...p(0, 4),
      exchange,
      ...p(1, 4),
      { type: "take-back", place: 1 },
      ...p(2),
      ...p(0, 4),
    ];
    for (const event of events) {
      state = reducePlay(state, event);
      expect(
        blockValue(state.board.workspace) + blockValue(state.board.removed),
      ).toBe(254);
      expect(state.board.workspace.every((count) => count >= 0)).toBe(true);
    }
    expect(state.board.workspace).toEqual([6, 1, 1, 0]);
    expect(blockValue(state.board.removed)).toBe(138);
    expect(state.phase).toBe("success");
  });

  it("lets learners recover from an incorrect subtraction without scoring it", () => {
    let state = createPlayState(6);
    state = [...p(2, 3), ...p(1), ...p(0, 4)].reduce(reducePlay, state);
    expect(state.phase).toBe("playing");
    expect(blockValue(state.board.removed)).toBe(314);
    state = reducePlay(state, { type: "take-back", place: 2 });
    expect(state.phase).toBe("success");
  });

  it("ignores hidden places, unavailable blocks and premature exchanges", () => {
    let state = createPlayState();
    expect(reducePlay(state, { type: "primary", place: 2 })).toBe(state);
    expect(reducePlay(state, exchange)).toBe(state);
    state = createPlayState(7);
    state = p(0, 4).reduce(reducePlay, state);
    expect(canPlayPrimary(PLAY_MISSIONS[7], state.board, 0)).toBe(false);
    expect(reducePlay(state, { type: "primary", place: 0 })).toBe(state);
  });

  it("locks success against burst input and accepts its timer only once", () => {
    const solved = solutions[0].reduce(reducePlay, createPlayState());
    expect(reducePlay(solved, { type: "primary", place: 0 })).toBe(solved);
    const advance: PlayEvent = { type: "advance", revision: solved.revision };
    const next = reducePlay(solved, advance);
    expect(next.round).toBe(1);
    expect(reducePlay(next, advance)).toBe(next);
    expect(next.board.workspace).toEqual([0, 0, 0, 0]);
  });

  it("undo and reset cancel a success and invalidate the previous timer even after solving again", () => {
    const solved = solutions[0].reduce(reducePlay, createPlayState());
    const undone = reducePlay(solved, { type: "undo" });
    expect(undone.phase).toBe("playing");
    expect(blockValue(undone.board.workspace)).toBe(11);
    const again = reducePlay(undone, { type: "primary", place: 0 });
    expect(
      reducePlay(again, { type: "advance", revision: solved.revision }),
    ).toBe(again);
    const reset = reducePlay(solved, { type: "reset" });
    expect(reset.history).toEqual([]);
    expect(blockValue(reset.board.workspace)).toBe(0);
    expect(
      reducePlay(reset, { type: "advance", revision: solved.revision }),
    ).toBe(reset);
  });

  it("pauses actions and progression, then resumes the same solved scene", () => {
    const solved = solutions[0].reduce(reducePlay, createPlayState());
    const paused = reducePlay(solved, { type: "pause" });
    const advance: PlayEvent = { type: "advance", revision: solved.revision };
    expect(reducePlay(paused, advance)).toBe(paused);
    expect(reducePlay(paused, { type: "reset" })).toBe(paused);
    expect(reducePlay(paused, { type: "primary", place: 0 })).toBe(paused);
    expect(
      reducePlay(reducePlay(paused, { type: "pause" }), advance).round,
    ).toBe(1);
  });

  it("finishes all eight scenes and replays a fresh session", () => {
    let state: PlayState = createPlayState();
    for (const solution of solutions) {
      state = solution.reduce(reducePlay, state);
      expect(state.phase).toBe("success");
      state = reducePlay(state, { type: "advance", revision: state.revision });
    }
    expect(state.phase).toBe("complete");
    expect(state.round).toBe(7);
    expect(reducePlay(state, { type: "primary", place: 0 })).toBe(state);
    const replay = reducePlay(state, { type: "replay" });
    expect(replay.phase).toBe("playing");
    expect(replay.round).toBe(0);
    expect(replay.history).toEqual([]);
  });
});
