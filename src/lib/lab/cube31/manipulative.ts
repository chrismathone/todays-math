/** Small, pure base-ten engine. Counts are ordered ones → thousands. */
export type RegroupingProblem = {
  a: number;
  b: number;
  operation: "add" | "subtract";
};
export type Place = 0 | 1 | 2 | 3;
export type Blocks = readonly [number, number, number, number];
export const PLACES: readonly Place[] = [0, 1, 2, 3];
export const PLACE_NAMES = [
  "일의 자리",
  "십의 자리",
  "백의 자리",
  "천의 자리",
] as const;
export const BLOCK_NAMES = ["낱개", "십 막대", "백 판", "천 묶음"] as const;
export const VALUES = [1, 10, 100, 1000] as const;

export type ManipulativeState = {
  workspace: Blocks;
  tray: Blocks;
  removed: Blocks;
  moves: number;
  zeroConfirmed: boolean;
};
export type ManipulativeAction =
  | { type: "move" | "remove"; place: Place; toPlace?: Place }
  | { type: "bundle" | "split"; place: Place }
  | { type: "confirm-zero" };
export type Transition = {
  state: ManipulativeState;
  changed: boolean;
  message: string;
};
export type Notation = {
  digits: readonly string[];
  marks: readonly string[];
};

export function toBlocks(value: number): Blocks {
  return [
    value % 10,
    Math.floor(value / 10) % 10,
    Math.floor(value / 100) % 10,
    Math.floor(value / 1000),
  ];
}

export function blockValue(blocks: Blocks): number {
  return blocks.reduce(
    (total, count, place) => total + count * VALUES[place],
    0,
  );
}

export function createManipulative(
  problem: RegroupingProblem,
): ManipulativeState {
  if (
    ![problem.a, problem.b].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 999,
    ) ||
    !["add", "subtract"].includes(problem.operation) ||
    (problem.operation === "subtract" && problem.a < problem.b)
  )
    throw new RangeError(
      "Use whole-number operands from 0 to 999 and a nonnegative result.",
    );
  return {
    workspace: toBlocks(problem.a),
    tray: problem.operation === "add" ? toBlocks(problem.b) : [0, 0, 0, 0],
    removed: [0, 0, 0, 0],
    moves: 0,
    zeroConfirmed: false,
  };
}

/** A higher block is needed if this column is short, or an empty column must pass it onward. */
function needsBorrow(
  state: ManipulativeState,
  target: Blocks,
  place: Place,
): boolean {
  return (
    state.workspace[place] < target[place] - state.removed[place] ||
    (place > 0 &&
      state.workspace[place] === 0 &&
      needsBorrow(state, target, (place - 1) as Place))
  );
}

export function canSplit(
  problem: RegroupingProblem,
  state: ManipulativeState,
  place: Place,
): boolean {
  return (
    problem.operation === "subtract" &&
    place > 0 &&
    state.workspace[place] > 0 &&
    needsBorrow(state, toBlocks(problem.b), (place - 1) as Place)
  );
}

export function canRemove(
  problem: RegroupingProblem,
  state: ManipulativeState,
  place: Place,
): boolean {
  return (
    problem.operation === "subtract" &&
    state.workspace[place] > 0 &&
    state.removed[place] < toBlocks(problem.b)[place]
  );
}

export function manipulate(
  problem: RegroupingProblem,
  state: ManipulativeState,
  action: ManipulativeAction,
): Transition {
  const reject = (message: string): Transition => ({
    state,
    changed: false,
    message,
  });
  const workspace = [...state.workspace] as [number, number, number, number];
  const tray = [...state.tray] as [number, number, number, number];
  const removed = [...state.removed] as [number, number, number, number];
  let message: string;
  if (action.type === "confirm-zero") {
    if (problem.b !== 0 || state.zeroConfirmed)
      return reject("움직일 블록을 먼저 확인해 보세요.");
    return {
      state: { ...state, moves: state.moves + 1, zeroConfirmed: true },
      changed: true,
      message:
        "0개를 옮기거나 빼면 블록의 수는 그대로예요. 세로셈으로도 나타내 보세요.",
    };
  }
  const p = action.place;
  if (!PLACES.includes(p)) return reject("블록의 자리를 확인해 보세요.");
  if (
    (action.type === "move" || action.type === "remove") &&
    action.toPlace !== undefined &&
    action.toPlace !== p
  ) {
    return reject(
      `${BLOCK_NAMES[p]}는 ${PLACE_NAMES[p]}에 놓아요. 다른 자리에 놓으면 수의 크기가 달라져요.`,
    );
  }
  if (action.type === "move") {
    if (problem.operation !== "add" || tray[p] === 0)
      return reject("이 자리에서 더 옮길 블록은 없어요.");
    tray[p] -= 1;
    workspace[p] += 1;
    message = `${BLOCK_NAMES[p]} 1개를 더했어요. ${PLACE_NAMES[p]} 블록은 ${state.workspace[p]}개 → ${workspace[p]}개예요.`;
  } else if (action.type === "remove") {
    if (problem.operation !== "subtract")
      return reject("덧셈에서는 준비한 블록을 작업판으로 옮겨요.");
    if (removed[p] >= toBlocks(problem.b)[p])
      return reject(
        `${PLACE_NAMES[p]}에서는 필요한 만큼 모두 뺐어요. 더 빼면 빼려는 수가 달라져요.`,
      );
    if (workspace[p] === 0)
      return reject(
        `${PLACE_NAMES[p]} 블록이 부족해요. 왼쪽 자리의 블록 1개를 10개로 바꿔 보세요.`,
      );
    workspace[p] -= 1;
    removed[p] += 1;
    message = `${BLOCK_NAMES[p]} 1개를 뺐어요. ${PLACE_NAMES[p]} 블록은 ${state.workspace[p]}개 → ${workspace[p]}개예요.`;
  } else if (action.type === "bundle") {
    if (problem.operation !== "add" || p === 3 || workspace[p] < 10)
      return reject(
        "같은 자리 블록이 10개 모여야 왼쪽 자리 블록 1개로 바꿀 수 있어요.",
      );
    workspace[p] -= 10;
    workspace[p + 1] += 1;
    message = `${BLOCK_NAMES[p]} 10개 = ${BLOCK_NAMES[p + 1]} 1개 (${VALUES[p]} × 10 = ${VALUES[p + 1]}). 모양이 바뀌어도 전체 수는 ${blockValue(workspace)}로 같아요. 받아올린 1은 ${VALUES[p + 1]}을 뜻해요.`;
  } else {
    if (!canSplit(problem, state, p))
      return reject(
        "아래 자리에 블록이 부족할 때, 왼쪽 블록 1개를 10개로 바꿀 수 있어요.",
      );
    workspace[p] -= 1;
    workspace[p - 1] += 10;
    message = `${BLOCK_NAMES[p]} 1개 = ${BLOCK_NAMES[p - 1]} 10개 (${VALUES[p]} = ${VALUES[p - 1]} × 10). ${PLACE_NAMES[p]} ${state.workspace[p]} − 1 = ${workspace[p]}, ${PLACE_NAMES[p - 1]} ${state.workspace[p - 1]} + 10 = ${workspace[p - 1]}. 전체 수는 ${blockValue(workspace)}로 같아요.`;
  }
  return {
    state: {
      workspace,
      tray,
      removed,
      moves: state.moves + 1,
      zeroConfirmed: state.zeroConfirmed,
    },
    changed: true,
    message,
  };
}

export function isManipulationComplete(
  problem: RegroupingProblem,
  state: ManipulativeState,
): boolean {
  const target = toBlocks(problem.b);
  return (
    state.moves > 0 &&
    state.workspace.every((count) => count >= 0 && count < 10) &&
    blockValue(state.workspace) ===
      (problem.operation === "add"
        ? problem.a + problem.b
        : problem.a - problem.b) &&
    (problem.operation === "add"
      ? state.tray.every((n) => n === 0)
      : state.removed.every((n, p) => n === target[p]))
  );
}

/** Entries above the top operand: incoming carries, or its regrouped place counts. */
export function notationRequirements(problem: RegroupingProblem): {
  digits: Blocks;
  marks: readonly (number | null)[];
  places: readonly Place[];
} {
  const a = toBlocks(problem.a);
  const b = toBlocks(problem.b);
  const answer =
    problem.operation === "add" ? problem.a + problem.b : problem.a - problem.b;
  const marks: (number | null)[] = [null, null, null, null];
  if (problem.operation === "add") {
    let carry = 0;
    for (const p of [0, 1, 2] as const) {
      carry = Math.floor((a[p] + b[p] + carry) / 10);
      if (carry) marks[p + 1] = carry;
    }
  } else {
    // Remainder + removed blocks reconstructs the regrouped minuend without
    // assuming which legal order the learner chose to split/remove blocks.
    const remainder = toBlocks(answer);
    for (const p of PLACES) {
      const regrouped = remainder[p] + b[p];
      if (regrouped !== a[p]) marks[p] = regrouped;
    }
  }
  return {
    digits: toBlocks(answer),
    marks,
    places: answer >= 1000 ? [3, 2, 1, 0] : [2, 1, 0],
  };
}

export function checkNotation(
  problem: RegroupingProblem,
  state: ManipulativeState,
  notation: Notation,
): { correct: boolean; message: string } {
  if (!isManipulationComplete(problem, state))
    return {
      correct: false,
      message:
        "먼저 블록을 모두 옮기거나 빼고, 각 자리에 9개 이하로 정리해 주세요.",
    };
  const required = notationRequirements(problem);
  const matches = (text: string | undefined, expected: number) =>
    typeof text === "string" &&
    /^(0|[1-9]\d?)$/.test(text) &&
    Number(text) === expected;
  for (const p of required.places) {
    if (
      !matches(notation.digits[p], required.digits[p]) ||
      notation.digits[p].length !== 1
    )
      return {
        correct: false,
        message: `${PLACE_NAMES[p]}에 남은 블록을 세어 답 칸에 숫자 한 개를 써 보세요. 0개인 자리에는 0을 써요.`,
      };
    if (
      required.marks[p] !== null &&
      !matches(notation.marks[p], required.marks[p])
    )
      return {
        correct: false,
        message:
          problem.operation === "add"
            ? `${PLACE_NAMES[p]}로 받아올린 블록 수를 위쪽 작은 칸에 써 보세요.`
            : `${PLACE_NAMES[p]}의 바꾼 수를 다시 살펴보세요. 남은 블록과 이 자리에서 빼낸 블록을 합한 개수예요.`,
      };
  }
  return {
    correct: true,
    message:
      "블록과 세로셈이 같아요! 자리를 바꾸어 묶거나 풀어도 수의 크기는 그대로라는 것을 확인했어요.",
  };
}

export function manipulationHint(
  problem: RegroupingProblem,
  state: ManipulativeState,
): string {
  if (isManipulationComplete(problem, state))
    return "블록 정리 완료! 남은 블록을 보고 세로셈의 답과 위쪽 작은 칸을 직접 채워 보세요.";
  if (problem.b === 0)
    return "옮기거나 뺄 블록이 0개예요. 빈 준비판을 확인해 보세요.";
  if (problem.operation === "add") {
    const p = PLACES.find((place) => place < 3 && state.workspace[place] >= 10);
    if (p !== undefined)
      return `${PLACE_NAMES[p]}에 ${state.workspace[p]}개가 모였어요. 10개를 왼쪽 자리의 1개로 바꾸면 세기 쉬워져요.`;
    return "준비판의 블록을 같은 자리의 작업판으로 옮겨요. 블록을 누르거나 끌어 놓을 수 있어요.";
  }
  const p = PLACES.find((place) => canSplit(problem, state, place));
  if (p !== undefined)
    return `${PLACE_NAMES[(p - 1) as Place]}가 부족해요. ${BLOCK_NAMES[p]} 1개를 ${BLOCK_NAMES[p - 1]} 10개로 바꿔 보세요.`;
  return "빼야 할 개수만큼 작업판 블록을 눌러 빼요. 아래의 빼기 상자로 끌어 놓아도 돼요.";
}
