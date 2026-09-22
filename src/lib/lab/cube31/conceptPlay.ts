import {
  blockValue,
  createManipulative,
  isManipulationComplete,
  manipulate,
  toBlocks,
  VALUES,
  BLOCK_NAMES,
} from "./manipulative";
import type {
  Blocks,
  ManipulativeState,
  Place,
  RegroupingProblem,
} from "./manipulative";

export type PlayPlace = 0 | 1 | 2;
export type PlayMission = {
  title: string;
  goal: string;
  chat: readonly [string, string];
  discovery: string;
  kind: "build" | "bundle" | "split" | "add" | "subtract";
  target: number;
  initial: Blocks;
  places: readonly PlayPlace[];
  problem?: RegroupingProblem;
  exchange?: "bundle" | "split";
};

const SMALL_PLACES = [1, 0] as const;
export const PLAY_MISSIONS: readonly PlayMission[] = [
  {
    title: "블록 가게, 문 열기",
    goal: "십 막대와 낱개로 12를 진열해 줘!",
    chat: [
      "12개를 놓으려면 낱개를 열두 번 눌러야 해?",
      "십 막대 하나가 낱개 10개야. 막대와 낱개로 놓아 볼까?",
    ],
    discovery: "십 막대 1개와 낱개 2개! 10 + 2 = 12구나.",
    kind: "build",
    target: 12,
    initial: [0, 0, 0, 0],
    places: SMALL_PLACES,
  },
  {
    title: "비어 있는 자리",
    goal: "백 판과 낱개로 103을 진열해 줘!",
    chat: [
      "103의 가운데 0은 빠뜨린 숫자야?",
      "백, 십, 일의 자리로 나눠 놓아 보자. 비어 있는 자리는 어떻게 보일까?",
    ],
    discovery: "100 + 0 + 3 = 103! 십의 자리가 비어서 0이네.",
    kind: "build",
    target: 103,
    initial: [0, 0, 0, 0],
    places: [2, 1, 0],
  },
  {
    title: "열 개를 한 묶음으로",
    goal: "낱개 10개를 십 막대 1개로 묶어 줘!",
    chat: [
      "낱개 10개를 막대 하나로 바꾸면 수가 작아지지 않아?",
      "직접 묶어 봐. 아래의 전체 값도 함께 살펴보자!",
    ],
    discovery: "낱개 10개 = 십 막대 1개! 모양만 바뀌고 값은 10이야.",
    kind: "bundle",
    target: 10,
    initial: [10, 0, 0, 0],
    places: SMALL_PLACES,
    exchange: "bundle",
  },
  {
    title: "다시 낱개로",
    goal: "십 막대 1개를 낱개 10개로 풀어 줘!",
    chat: [
      "반대로 풀면 블록이 많아지니까 값도 커질까?",
      "십 막대를 눌러 풀어 봐. 전체 값이 바뀌는지 확인하자.",
    ],
    discovery: "1개의 십 막대를 10개로 풀어도 전체 값은 그대로 10!",
    kind: "split",
    target: 10,
    initial: [0, 1, 0, 0],
    places: SMALL_PLACES,
    exchange: "split",
  },
  {
    title: "새 블록이 도착했어",
    goal: "23에 도착한 12를 모두 더해 줘!",
    chat: [
      "23개에 12개가 왔어. 숫자를 옆에 붙이면 2312?",
      "블록을 같은 자리끼리 더해 보자. 도착한 블록을 눌러 줘!",
    ],
    discovery: "십 막대끼리, 낱개끼리 더하니 23 + 12 = 35!",
    kind: "add",
    target: 35,
    initial: toBlocks(23),
    places: SMALL_PLACES,
    problem: { a: 23, b: 12, operation: "add" },
  },
  {
    title: "낱개 칸이 가득!",
    goal: "138에 도착한 214를 더하고, 낱개를 묶어 줘!",
    chat: [
      "138개에 214개가 더 왔어. 낱개 칸이 꽉 차겠는데?",
      "같은 자리끼리 더해 보자. 낱개가 10개 모이면 어떻게 바꿀까?",
    ],
    discovery: "낱개 12개를 1묶음과 2개로! 받아올려서 138 + 214 = 352야.",
    kind: "add",
    target: 352,
    initial: toBlocks(138),
    places: [2, 1, 0],
    exchange: "bundle",
    problem: { a: 138, b: 214, operation: "add" },
  },
  {
    title: "첫 번째 손님",
    goal: "356에서 손님에게 214만큼 건네줘!",
    chat: [
      "손님이 214개를 달래. 블록을 214번 눌러야 해?",
      "큰 블록도 쓸 수 있어! 진열대에서 눌러 건네고, 남은 수를 보자.",
    ],
    discovery: "214를 건네니 142가 남았어. 같은 자리끼리 356 − 214 = 142!",
    kind: "subtract",
    target: 142,
    initial: toBlocks(356),
    places: [2, 1, 0],
    problem: { a: 356, b: 214, operation: "subtract" },
  },
  {
    title: "낱개가 모자라면?",
    goal: "254에서 138을 건네줘! 낱개가 모자라면?",
    chat: [
      "138개를 줘야 하는데 낱개 8개가 필요해. 지금은 4개뿐이야!",
      "십 막대 하나를 풀면 어떨까? 수는 그대로 두고 낱개를 늘려 보자!",
    ],
    discovery: "십 막대를 풀어 낱개 14개! 받아내려서 254 − 138 = 116이야.",
    kind: "subtract",
    target: 116,
    initial: toBlocks(254),
    places: [2, 1, 0],
    exchange: "split",
    problem: { a: 254, b: 138, operation: "subtract" },
  },
];

export type PlayState = {
  round: number;
  board: ManipulativeState;
  history: readonly ManipulativeState[];
  phase: "playing" | "success" | "complete";
  paused: boolean;
  revision: number;
  feedback: string;
  motion: { place: PlayPlace; kind: "add" | "remove" | "exchange" } | null;
};
export type PlayEvent =
  | { type: "primary" | "take-back"; place: PlayPlace }
  | { type: "exchange" }
  | { type: "undo" | "reset" | "pause" | "replay" }
  | { type: "advance"; revision: number };

function missionBoard(mission: PlayMission): ManipulativeState {
  return mission.problem
    ? createManipulative(mission.problem)
    : {
        ...createManipulative({ a: 0, b: 0, operation: "add" }),
        workspace: mission.initial,
      };
}

export function createPlayState(round = 0): PlayState {
  if (!PLAY_MISSIONS[round]) throw new RangeError("Unknown mission");
  return {
    round,
    board: missionBoard(PLAY_MISSIONS[round]),
    history: [],
    phase: "playing",
    paused: false,
    revision: 0,
    feedback: "",
    motion: null,
  };
}

export function isPlayGoal(
  mission: PlayMission,
  board: ManipulativeState,
): boolean {
  if (board.moves === 0) return false;
  if (mission.problem) return isManipulationComplete(mission.problem, board);
  const expected: Blocks =
    mission.kind === "split" ? [10, 0, 0, 0] : toBlocks(mission.target);
  return board.workspace.every((count, p) => count === expected[p]);
}

export function canPlayExchange(
  mission: PlayMission,
  board: ManipulativeState,
): boolean {
  return playExchange(mission, board) !== null;
}

export function playExchange(
  mission: PlayMission,
  board: ManipulativeState,
): { type: "bundle" | "split"; place: PlayPlace } | null {
  if (mission.kind === "build") {
    const place = ([0, 1] as const).find(
      (p) =>
        mission.places.includes((p + 1) as PlayPlace) &&
        board.workspace[p] >= 10,
    );
    return place === undefined ? null : { type: "bundle", place };
  }
  if (mission.exchange === "bundle" && board.workspace[0] >= 10)
    return { type: "bundle", place: 0 };
  if (mission.exchange === "split" && board.workspace[1] > 0)
    return { type: "split", place: 1 };
  return null;
}

export function canPlayPrimary(
  mission: PlayMission,
  board: ManipulativeState,
  place: PlayPlace,
): boolean {
  if (!mission.places.includes(place)) return false;
  if (mission.kind === "build")
    return board.workspace[place] < (place === 2 ? 3 : 12);
  if (mission.kind === "add") return board.tray[place] > 0;
  if (mission.kind === "subtract") return board.workspace[place] > 0;
  return (
    place === (mission.kind === "bundle" ? 0 : 1) &&
    canPlayExchange(mission, board)
  );
}

/** One reducer owns goal detection and progression, so burst input cannot solve twice. */
export function reducePlay(state: PlayState, event: PlayEvent): PlayState {
  if (event.type === "replay")
    return { ...createPlayState(), revision: state.revision + 1 };
  if (state.phase === "complete") return state;
  if (event.type === "pause") return { ...state, paused: !state.paused };
  if (event.type === "advance") {
    if (
      state.paused ||
      state.phase !== "success" ||
      state.revision !== event.revision
    )
      return state;
    return state.round === PLAY_MISSIONS.length - 1
      ? { ...state, phase: "complete", revision: state.revision + 1 }
      : { ...createPlayState(state.round + 1), revision: state.revision + 1 };
  }
  if (state.paused) return state;
  if (event.type === "reset")
    return { ...createPlayState(state.round), revision: state.revision + 1 };
  if (event.type === "undo") {
    const board = state.history.at(-1);
    return board
      ? {
          ...state,
          board,
          history: state.history.slice(0, -1),
          phase: "playing",
          revision: state.revision + 1,
          feedback: "마지막 움직임을 되돌렸어. 다시 해 보자!",
          motion: null,
        }
      : state;
  }
  if (state.phase !== "playing") return state;
  const mission = PLAY_MISSIONS[state.round];
  let board: ManipulativeState;
  let feedback: string;
  let motion: PlayState["motion"];
  const exchange =
    event.type === "exchange" ||
    (event.type === "primary" &&
      (mission.kind === "bundle" || mission.kind === "split"));
  if (
    event.type === "primary" &&
    !canPlayPrimary(mission, state.board, event.place)
  )
    return state;
  if (exchange) {
    const conversion = playExchange(mission, state.board);
    if (!conversion) return state;
    const { place, type } = conversion;
    // The shared engine restricts exchanges by operation. Standalone exchange
    // scenes use the matching operation, preserving all trays and total value.
    const result = manipulate(
      mission.problem ?? {
        a: 10,
        b: 0,
        operation: type === "bundle" ? "add" : "subtract",
      },
      state.board,
      { type, place },
    );
    if (!result.changed) return state;
    board = result.state;
    feedback =
      type === "bundle"
        ? `${BLOCK_NAMES[place]} 10개 → ${BLOCK_NAMES[place + 1]} 1개. 전체 값 ${blockValue(board.workspace)}은 그대로!`
        : `${BLOCK_NAMES[place]} 1개 → ${BLOCK_NAMES[place - 1]} 10개. 전체 값 ${blockValue(board.workspace)}은 그대로!`;
    motion = {
      place: (type === "bundle" ? place + 1 : place - 1) as PlayPlace,
      kind: "exchange",
    };
  } else if (event.type === "primary" || event.type === "take-back") {
    const place = event.place;
    if (!mission.places.includes(place)) return state;
    if (mission.kind === "build") {
      const delta = event.type === "take-back" ? -1 : 1;
      if (delta < 0 && state.board.workspace[place] === 0) return state;
      const workspace = [...state.board.workspace] as [
        number,
        number,
        number,
        number,
      ];
      workspace[place] += delta;
      board = { ...state.board, workspace, moves: state.board.moves + 1 };
      feedback = `${blockValue(state.board.workspace)} ${delta > 0 ? "+" : "−"} ${VALUES[place]} = ${blockValue(workspace)}`;
      if (playExchange(mission, board))
        feedback += ". 10개를 큰 블록 1개로 묶어 보자!";
      motion = { place, kind: delta > 0 ? "add" : "remove" };
    } else if (mission.problem) {
      if (event.type === "take-back" && mission.kind !== "subtract")
        return state;
      const result = manipulate(mission.problem, state.board, {
        type:
          event.type === "take-back"
            ? "restore"
            : mission.kind === "add"
              ? "move"
              : "remove",
        place: place as Place,
      });
      if (!result.changed) return state;
      board = result.state;
      const added = mission.kind === "add" || event.type === "take-back";
      feedback = `${blockValue(state.board.workspace)} ${added ? "+" : "−"} ${VALUES[place]} = ${blockValue(board.workspace)}`;
      motion = { place, kind: added ? "add" : "remove" };
    } else return state;
  } else return state;
  return {
    ...state,
    board,
    history: [...state.history, state.board],
    feedback,
    motion,
    revision: state.revision + 1,
    phase: isPlayGoal(mission, board) ? "success" : "playing",
  };
}
