import { qtyPicks } from "../picks";
import type { CourseDef } from "../types";

const SEED_L: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
];

const SEED_T: [number, number][] = [
  [0, 1],
  [1, 1],
  [2, 1],
  [2, 0],
];

export const SHAPE_COURSE: CourseDef = {
  id: "shape",
  title: "대칭과 이동",
  gradeLabel: "4·5학년",
  unitIds: [
    "4-2-6",
    "5-2-3",
    "2-1-2",
    "3-2-3",
    "4-1-4",
    "1-2-3",
    "3-1-2",
    "4-2-2",
    "4-2-4",
  ],
  summary:
    "밀기·뒤집기·돌리기를 가리고, 대칭축 반대쪽에 같은 거리의 칸을 채웁니다.",
  flow: "이동 구별 → 대칭 칸 채우기 → 대응점 → 잘못된 짝 찾기",
  activities: [
    {
      id: "move-kind",
      kind: "predict",
      title: "뒤집기와 밀기",
      intro: "도형을 뒤집지 않고 칸만 옆으로 옮기는 것은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "slide", label: "밀기" },
          { id: "flip", label: "뒤집기" },
          { id: "turn", label: "돌리기" },
        ],
        correct: "slide",
      },
      hints: [{ id: "h1", text: "위·아래가 바뀌지 않으면 밀기입니다." }],
      success: "밀기는 방향이 그대로입니다.",
      wrong: "뒤집으면 왼쪽·오른쪽이 바뀝니다.",
    },
    {
      id: "mirror-l",
      kind: "manipulate",
      title: "반대쪽 칸 채우기",
      intro: "세로 점선 왼쪽에 있는 칸의 짝을 오른쪽에 채우세요.",
      engine: {
        type: "symmetry",
        rows: 3,
        cols: 4,
        axis: "v",
        seed: SEED_L,
      },
      hints: [
        { id: "h1", text: "점선에서 같은 칸 수만큼 떨어진 곳을 누릅니다." },
      ],
      success: "축에서 같은 거리인 칸이 대응점입니다.",
      wrong: "축을 기준으로 접었을 때 겹치는 칸을 찾으세요.",
    },
    {
      id: "which-move",
      kind: "apply",
      title: "거울에 비친 모양",
      intro: "도형을 점선에 접어 겹치게 하는 이동은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "flip", label: "뒤집기" },
          { id: "slide", label: "밀기" },
          { id: "turn", label: "한 바퀴 돌리기" },
        ],
        correct: "flip",
      },
      hints: [
        { id: "h1", text: "접으면 앞면이 반대가 됩니다.", backTo: "move-kind" },
      ],
      success: "점선이 대칭축인 뒤집기입니다.",
      wrong: "밀기만으로는 거울처럼 바뀌지 않습니다.",
    },
    {
      id: "mirror-t",
      kind: "manipulate",
      title: "다른 모양의 짝",
      intro: "세로 점선 왼쪽 칸의 짝을 오른쪽에 모두 채우세요.",
      engine: {
        type: "symmetry",
        rows: 3,
        cols: 4,
        axis: "v",
        seed: SEED_T,
      },
      hints: [
        {
          id: "h1",
          text: "각 칸마다 점선까지의 칸 수를 세어 보세요.",
          backTo: "mirror-l",
        },
      ],
      success: "모든 대응점을 채웠습니다.",
      wrong: "빠진 칸이 있는지 점선 너머를 보세요.",
    },
    {
      id: "error-shift",
      kind: "error-hunt",
      title: "누가 짝을 다르게 찍었을까요",
      intro:
        "점 (2, 1)의 세로 대칭 짝을 찾는 설명을 고르세요. 잘못된 짝입니다.",
      engine: {
        type: "error-hunt",
        scenes: [
          {
            id: "ok-haeun",
            title: "하은",
            detail: "축에서 같은 칸 수만큼 반대쪽",
          },
          { id: "bad-minsu", title: "민수", detail: "바로 옆 칸" },
          { id: "ok-doyun", title: "도윤", detail: "접었을 때 겹치는 칸" },
        ],
        wrong: "bad-minsu",
      },
      hints: [
        { id: "h1", text: "옆 칸은 거리가 다릅니다.", backTo: "mirror-l" },
      ],
      success: "민수는 축까지의 거리를 보지 않았습니다.",
      wrong: "축에서 몇 칸 떨어졌는지 세어 보세요.",
    },
    {
      id: "distance",
      kind: "reason",
      title: "같은 거리",
      intro: "대응점이 되려면 대칭축까지 거리가 어떻게 되어야 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "same", label: "같아야 합니다" },
          { id: "double", label: "두 배여야 합니다" },
          { id: "zero", label: "축 위에 있어야 합니다" },
        ],
        correct: "same",
      },
      hints: [{ id: "h1", text: "접었을 때 겹치려면 거리가 같습니다." }],
      success: "축까지 거리가 같으면 접어 겹칩니다.",
      wrong: "한 칸만 옮기면 거리가 달라집니다.",
    },
    {
      id: "turn-or-flip",
      kind: "apply",
      title: "위아래가 바뀐 모양",
      intro:
        "도형을 점 주위로 반 바퀴 돌려 위아래가 바뀌었습니다. 이 이동은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "turn", label: "돌리기" },
          { id: "slide", label: "밀기" },
          { id: "flip", label: "뒤집기" },
        ],
        correct: "turn",
      },
      hints: [
        { id: "h1", text: "한 점을 중심으로 돌아갑니다.", backTo: "move-kind" },
      ],
      success: "반 바퀴 돌리기입니다.",
      wrong: "밀기는 위아래를 바꾸지 않습니다.",
    },
    {
      id: "mirror-h",
      kind: "observe",
      title: "가로 점선",
      intro: "가로 점선 위쪽 칸의 짝을 아래쪽에 채우세요.",
      engine: {
        type: "symmetry",
        rows: 4,
        cols: 3,
        axis: "h",
        seed: [
          [0, 1],
          [1, 0],
          [1, 1],
        ],
      },
      hints: [
        { id: "h1", text: "위아래로 접는 대칭입니다.", backTo: "distance" },
      ],
      success: "가로축에서도 거리가 같으면 짝입니다.",
      wrong: "점선 아래로 같은 칸 수를 세어 보세요.",
    },
    {
      id: "rhythm-slide",
      kind: "rhythm",
      title: "그대로 옮기기",
      intro: "모양과 방향이 그대로이고 위치만 바뀌면 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "slide", label: "밀기" },
          { id: "flip", label: "뒤집기" },
          { id: "turn", label: "돌리기" },
        ],
        correct: "slide",
      },
      hints: [{ id: "h1", text: "첫 활동과 같습니다.", backTo: "move-kind" }],
      success: "밀기입니다.",
      wrong: "방향이 바뀌었는지 보세요.",
    },
    {
      id: "rhythm-axis",
      kind: "rhythm",
      title: "접는 선",
      intro: "뒤집기의 접는 선을 무엇이라고 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "axis", label: "대칭축" },
          { id: "side", label: "빗변" },
          { id: "center", label: "가운데 점" },
        ],
        correct: "axis",
      },
      hints: [{ id: "h1", text: "점선이 그 선입니다.", backTo: "which-move" }],
      success: "대칭축입니다.",
      wrong: "접는 선이 대칭축입니다.",
    },
    {
      id: "explain-pair",
      kind: "explain",
      title: "대응점인 이유",
      intro: "두 점이 대칭의 짝인 이유는 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          {
            id: "dist",
            label: "축에 내린 거리가 같고, 축의 서로 다른 쪽에 있습니다",
          },
          { id: "color", label: "칸 색이 같아서입니다" },
        ],
        correct: "dist",
      },
      hints: [
        { id: "h1", text: "거리와 쪽이 모두 필요합니다.", backTo: "distance" },
      ],
      success: "같은 거리, 반대쪽이 대응점입니다.",
      wrong: "색이 아니라 위치 관계입니다.",
    },
    {
      id: "transfer-pair",
      kind: "apply",
      title: "새 점의 짝",
      intro: "세로 점선 왼쪽에서 두 칸 떨어진 점의 짝은 어디에 있을까요.",
      engine: {
        type: "choice",
        options: [
          { id: "two", label: "오른쪽에서 두 칸" },
          { id: "one", label: "오른쪽에서 한 칸" },
          { id: "same", label: "같은 자리" },
        ],
        correct: "two",
      },
      hints: [{ id: "h1", text: "거리가 같아야 합니다.", backTo: "mirror-l" }],
      success: "오른쪽에서도 두 칸입니다.",
      wrong: "왼쪽에서 센 칸 수를 오른쪽에도 씁니다.",
    },
    {
      id: "vertices-3",
      kind: "recall",
      title: "삼각형의 꼭짓점",
      intro: "삼각형의 꼭짓점은 몇 개일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(3, [2, 4, 5]),
        correct: "3",
      },
      hints: [{ id: "h1", text: "변이 모이는 점이 꼭짓점입니다." }],
      success: "3개입니다.",
      wrong: "변도 3개, 꼭짓점도 3개입니다.",
    },
    {
      id: "radius",
      kind: "reason",
      title: "반지름과 지름",
      intro: "원의 지름은 반지름과 어떤 관계일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "double", label: "반지름의 두 배" },
          { id: "half", label: "반지름의 절반" },
          { id: "same", label: "같습니다" },
        ],
        correct: "double",
      },
      hints: [{ id: "h1", text: "지름은 중심을 지나는 가장 긴 선분입니다." }],
      success: "지름은 반지름의 두 배입니다.",
      wrong: "중심에서 둘레까지가 반지름입니다.",
    },
    {
      id: "right-tri",
      kind: "apply",
      title: "직각삼각형",
      intro: "한 각이 직각인 삼각형을 무엇이라고 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "right", label: "직각삼각형" },
          { id: "acute", label: "예각삼각형" },
          { id: "obtuse", label: "둔각삼각형" },
        ],
        correct: "right",
      },
      hints: [{ id: "h1", text: "직각은 90도입니다." }],
      success: "직각삼각형입니다.",
      wrong: "직각이 있으면 직각삼각형입니다.",
    },
    {
      id: "plane-round",
      kind: "recall",
      title: "동그란 모양",
      intro: "굴리지 않고 평면에 그린 동그란 모양을 무엇이라고 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "circle", label: "원" },
          { id: "tri", label: "삼각형" },
          { id: "rect", label: "사각형" },
        ],
        correct: "circle",
      },
      hints: [{ id: "h1", text: "둘레가 한 줄로 이어진 둥근 모양입니다." }],
      success: "원입니다.",
      wrong: "세모·네모가 아닌 둥근 평면도형입니다.",
    },
    {
      id: "segment",
      kind: "reason",
      title: "선분",
      intro: "두 점이 끝인 곧은 선을 무엇이라고 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "seg", label: "선분" },
          { id: "ray", label: "반직선" },
          { id: "line", label: "직선" },
        ],
        correct: "seg",
      },
      hints: [{ id: "h1", text: "양쪽이 막혀 있으면 선분입니다." }],
      success: "선분입니다.",
      wrong: "한쪽만 막히면 반직선, 양쪽이 이어지면 직선입니다.",
    },
    {
      id: "right-angle",
      kind: "apply",
      title: "직각",
      intro: "공책 모서리처럼 꺾인 각은 얼마일까요.",
      engine: { type: "angle", degrees: 90 },
      hints: [{ id: "h1", text: "파란 변을 90도에 맞추세요." }],
      success: "직각, 90도입니다.",
      wrong: "90도가 될 때까지 끌어 보세요.",
    },
    {
      id: "parallel",
      kind: "reason",
      title: "평행인 변",
      intro: "직사각형에서 마주 보는 두 변의 관계는 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "par", label: "평행합니다" },
          { id: "meet", label: "한 점에서 만납니다" },
          { id: "curve", label: "굽어 있습니다" },
        ],
        correct: "par",
      },
      hints: [{ id: "h1", text: "만나지 않고 같은 방향으로 갑니다." }],
      success: "마주 보는 변은 평행합니다.",
      wrong: "이웃한 변은 직각으로 만납니다.",
    },
    {
      id: "regular",
      kind: "apply",
      title: "정다각형",
      intro:
        "모든 변의 길이와 모든 각의 크기가 같은 다각형을 무엇이라고 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "reg", label: "정다각형" },
          { id: "any", label: "아무 다각형" },
          { id: "tri", label: "직각삼각형만" },
        ],
        correct: "reg",
      },
      hints: [{ id: "h1", text: "정삼각형, 정사각형이 그 예입니다." }],
      success: "정다각형입니다.",
      wrong: "변과 각이 모두 같아야 합니다.",
    },
  ],
};
