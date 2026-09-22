import type { CubeExperiment, JourneyExperiment } from "./explorationTypes";

const journey = (
  start: number,
  steps: JourneyExperiment["steps"],
  prompt = "숫자 조각을 골라 이동해요. 어떤 자리부터 움직여도 될까요?",
): JourneyExperiment => ({ kind: "journey", start, steps, prompt });

/** Explicit lesson design: only problem givens, never fields.answer or correctChoice. */
export const CUBE_EXPERIMENTS: Record<string, CubeExperiment> = {
  "place-value": {
    kind: "bundles",
    prompt: "312를 펼쳐 보세요. 백·십·일은 각각 얼마나 있을까요?",
    counts: [3, 1, 2],
    startPacked: true,
  },
  "exchange-meaning": {
    kind: "bundles",
    prompt: "십 묶음을 눌러 풀어 보세요. 다시 모으면 어떻게 될까요?",
    counts: [0, 1, 0],
  },
  "expanded-hundreds": {
    kind: "bundles",
    prompt: "백 묶음 하나를 풀고, 오른쪽에 생긴 십 묶음을 살펴보세요.",
    counts: [3, 0, 0],
  },
  "addition-decompose": journey(
    400,
    [{ amount: 38, operation: "add" }],
    "400에서 십 3개, 일 8개만큼 이동해요. 어떤 자리부터 더해 볼까요?",
  ),
  "align-place": {
    kind: "alignment",
    prompt: "26의 2를 골라 자리에 놓아 보세요. 자리가 바뀌면 값도 달라져요.",
    top: 312,
    moving: 26,
  },
  "carry-value": {
    kind: "bundles",
    prompt: "낱개 열 개를 묶어 보세요. 생긴 묶음 하나는 어느 자리에 있나요?",
    counts: [0, 0, 10],
  },
  "carry-included": {
    kind: "bundles",
    prompt:
      "265와 147을 합친 모형이에요. 일부터 묶고 십 묶음의 수를 살펴보세요.",
    counts: [3, 10, 12],
  },
  "inverse-check": {
    kind: "relation",
    mode: "join",
    prompt: "남은 수와 뺀 수를 붙여서 처음 수를 되찾아 보세요.",
    parts: [
      { label: "남은 수", value: 142 },
      { label: "뺀 수", value: 214 },
    ],
  },
  "borrow-left": {
    kind: "bundles",
    prompt: "십 묶음 하나를 풀어 보세요. 십과 일의 수가 함께 달라져요.",
    counts: [2, 5, 4],
  },
  "eleven-tens": {
    kind: "bundles",
    prompt: "십 묶음 하나를 먼저 풀고, 그다음 백 묶음을 풀어 보세요.",
    counts: [3, 2, 4],
  },
  "choose-sum": journey(469, [{ amount: 543, operation: "add" }]),
  "story-total": {
    kind: "relation",
    mode: "join",
    prompt: "두 책장 막대를 하나로 이어 보세요. 전체 길이는 어떻게 달라지나요?",
    parts: [
      { label: "첫 책장", value: 248 },
      { label: "둘째 책장", value: 135 },
    ],
  },
  "story-part": {
    kind: "relation",
    mode: "part",
    prompt:
      "파란 부분의 손잡이를 움직여 전체 248에 맞춰 보세요. 답 칸도 함께 바뀌어요.",
    parts: [{ label: "빨간 구슬", value: 120 }],
    total: 248,
    answerField: "part",
  },
  "story-difference": {
    kind: "relation",
    mode: "compare",
    prompt:
      "두 막대의 출발선을 맞춰 보세요. 겹치지 않는 부분이 무엇을 뜻할까요?",
    parts: [
      { label: "333m 탑", value: 333 },
      { label: "324m 탑", value: 324 },
    ],
  },
  "spoken-values": journey(836, [{ amount: 254, operation: "subtract" }]),
  "choose-difference": {
    kind: "comparison",
    prompt:
      "각 식을 골라 직접 이동해 보세요. 같은 출발점에서 어디에 도착하나요?",
    routes: [
      {
        label: "592 − 304",
        value: "a",
        start: 592,
        amount: 304,
        operation: "subtract",
      },
      {
        label: "592 − 314",
        value: "b",
        start: 592,
        amount: 314,
        operation: "subtract",
      },
      {
        label: "592 − 294",
        value: "c",
        start: 592,
        amount: 294,
        operation: "subtract",
      },
    ],
  },
  "hidden-subtraction": {
    kind: "digits",
    prompt:
      "빈자리를 고르고 숫자 조각을 넣어 보세요. 양쪽 계산이 맞아떨어지나요?",
    operation: "subtract",
    rows: [
      [5, 2, 4],
      [3, 7, "ones"],
      [1, "tens", 5],
    ],
  },
  "equal-route": journey(
    215,
    [
      { amount: 297, operation: "add", label: "첫 길의 도착점 찾기" },
      { amount: 267, operation: "subtract", label: "다른 출발점까지의 차이" },
    ],
    "먼저 같은 도착 수를 찾고, 그곳에서 267만큼 거꾸로 가 보세요.",
  ),
  "missing-addend": journey(
    874,
    [{ amount: 298, operation: "subtract" }],
    "도착한 수 874에서 +298을 거꾸로 되돌려 보세요.",
  ),
  "inverse-second": journey(
    913,
    [{ amount: 387, operation: "subtract" }],
    "+387을 거꾸로 돌리면 처음 수로 돌아갈 수 있어요.",
  ),
  "hidden-addition": {
    kind: "digits",
    prompt:
      "빈자리마다 숫자 조각을 넣어 보세요. 합이 793에 닿도록 바꿔 보세요.",
    operation: "add",
    rows: [
      [2, 7, 5],
      [5, "tens", "ones"],
      [7, 9, 3],
    ],
  },
  "unknown-original": journey(
    805,
    [{ amount: 128, operation: "subtract" }],
    "805에 도착하기 전으로 돌아가요. 더했던 만큼 거꾸로 이동하세요.",
  ),
  "select-information": {
    kind: "relation",
    mode: "compare",
    prompt:
      "비교할 음식 두 개를 골라 막대를 맞춰 보세요. 국도 필요한 정보일까요?",
    parts: [
      { label: "잡곡밥", value: 310 },
      { label: "닭감자조림", value: 172 },
      { label: "국", value: 80 },
    ],
  },
  "compare-results": {
    kind: "comparison",
    prompt:
      "세 길을 차례로 움직여 보세요. 출발 수가 가장 크면 도착 수도 클까요?",
    routes: [
      {
        label: "451 − 173",
        value: "a",
        start: 451,
        amount: 173,
        operation: "subtract",
      },
      {
        label: "612 − 327",
        value: "b",
        start: 612,
        amount: 327,
        operation: "subtract",
      },
      {
        label: "524 − 237",
        value: "c",
        start: 524,
        amount: 237,
        operation: "subtract",
      },
    ],
  },
  "chain-add": journey(
    219,
    [
      { amount: 462, operation: "add", label: "첫 계단" },
      { amount: 138, operation: "add", label: "다음 계단" },
    ],
    "첫 계단의 도착점이 다음 계단의 출발점이에요. 숫자 조각으로 이어 가세요.",
  ),
  "chain-mixed": journey(
    725,
    [
      { amount: 513, operation: "subtract", label: "먼저 빼기" },
      { amount: 679, operation: "add", label: "이어서 더하기" },
    ],
    "먼저 왼쪽으로, 다음에는 오른쪽으로! 이동한 수가 다음 계산으로 이어져요.",
  ),
  "reverse-subtraction-error": journey(
    254,
    [{ amount: 138, operation: "subtract" }],
    "254에서 왼쪽으로 138만큼 이동해 보세요. 일의 자리 숫자만 뒤집어 빼도 같을까요?",
  ),
  "larger-number": journey(
    645,
    [{ amount: 478, operation: "add" }],
    "645에서 478만큼 더 멀리! 숫자 조각을 골라 오른쪽으로 이동하세요.",
  ),
  "smaller-number": journey(
    321,
    [{ amount: 142, operation: "subtract" }],
    "321에서 142만큼 돌아와요. 숫자 조각으로 왼쪽으로 이동하세요.",
  ),
  "table-sum": {
    kind: "relation",
    mode: "join",
    prompt: "오전과 오후의 방문객 막대를 이어 하루의 전체를 만들어 보세요.",
    parts: [
      { label: "오전", value: 347 },
      { label: "오후", value: 428 },
    ],
  },
};
