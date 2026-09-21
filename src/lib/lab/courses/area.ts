import { qtyPicks } from "../picks";
import type { CourseDef } from "../types";

export const AREA_COURSE: CourseDef = {
  id: "area",
  title: "넓이 보존",
  gradeLabel: "5학년",
  unitIds: ["5-1-6", "6-2-5"],
  summary:
    "단위 넓이로 덮고, 잘라 옮겨도 넓이가 같은 이유를 평행사변형에서 확인합니다.",
  flow: "덮기 → 자르고 옮기기 → 높이 → 잘못된 변 찾기 → 새 치수에 적용",
  activities: [
    {
      id: "unit-rect",
      kind: "recall",
      title: "칸으로 직사각형 덮기",
      intro:
        "가로 4칸, 세로 3칸인 직사각형을 1cm² 정사각형으로 덮으면 몇 칸일까요.",
      engine: { type: "unit-squares", cols: 4, rows: 3 },
      hints: [{ id: "h1", text: "한 줄에 4칸이 3줄입니다." }],
      success: "4×3=12칸이므로 넓이는 12cm²입니다.",
      wrong: "가로 칸 수와 세로 줄 수를 곱해 보세요.",
    },
    {
      id: "predict-cut",
      kind: "predict",
      title: "잘라 옮기면 넓이가 바뀔까요",
      intro:
        "평행사변형에서 삼각형을 잘라 반대쪽에 붙입니다. 넓이는 어떻게 될까요.",
      engine: {
        type: "choice",
        options: [
          { id: "same", label: "조각이 남거나 겹치지 않으면 넓이는 같습니다" },
          { id: "smaller", label: "잘라서 작아집니다" },
          { id: "taller", label: "높아 보이면 넓이가 커집니다" },
        ],
        correct: "same",
      },
      hints: [{ id: "h1", text: "버린 조각이 있는지만 먼저 떠올려 보세요." }],
      success: "같은 조각을 옮겨 붙이면 넓이는 그대로입니다.",
      wrong: "모양은 바뀌어도, 버린 조각이 없으면 넓이는 같습니다.",
    },
    {
      id: "cut-slide",
      kind: "manipulate",
      title: "잘라 직사각형 만들기",
      intro:
        "왼쪽 삼각형을 자른 뒤 오른쪽으로 옮겨 직사각형을 만드세요. 넓이가 같은 이유도 고르세요.",
      engine: { type: "area-cut", base: 6, height: 3, skew: 2 },
      hints: [
        {
          id: "h1",
          text: "조각을 끝까지 옮겨 빈칸을 메운 다음, 버린 조각이 있는지 보세요.",
          backTo: "predict-cut",
        },
      ],
      success: "밑변 6cm, 높이 3cm인 직사각형이 됩니다. 넓이는 18cm²입니다.",
      wrong: "조각을 끝까지 옮기고, 겹치거나 버린 부분이 없는지 확인하세요.",
    },
    {
      id: "reason-height",
      kind: "reason",
      title: "높이는 어느 선일까요",
      intro: "평행사변형의 넓이를 구할 때 써야 하는 높이는 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "perp", label: "밑변에 수직인 선분의 길이" },
          { id: "slant", label: "기울어진 변의 길이" },
        ],
        correct: "perp",
      },
      hints: [
        {
          id: "h1",
          text: "잘라 옮기면 직사각형의 세로가 됩니다. 그 세로는 밑변과 수직입니다.",
          backTo: "cut-slide",
        },
      ],
      success: "높이는 밑변에 수직인 거리입니다.",
      wrong: "기울어진 변은 밑변과의 거리가 아닙니다.",
    },
    {
      id: "apply-5-4",
      kind: "apply",
      title: "다른 치수의 평행사변형",
      intro: "밑변 5cm, 높이 4cm인 평행사변형의 넓이는 몇 cm²일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(20, [9, 25, 18], "cm²"),
        correct: "20",
      },
      hints: [
        {
          id: "h1",
          text: "잘라 옮기면 가로 5, 세로 4인 직사각형이 됩니다.",
          backTo: "cut-slide",
        },
      ],
      success: "5×4=20cm²입니다.",
      wrong: "기울어진 변이 아니라 수직인 높이를 곱하세요.",
    },
    {
      id: "error-slant",
      kind: "error-hunt",
      title: "잘못된 넓이 구하기",
      intro:
        "밑변 6cm, 기울어진 변 5cm, 높이 3cm인 평행사변형입니다. 세 친구의 풀이 중 틀린 것을 고르세요.",
      engine: {
        type: "error-hunt",
        scenes: [
          {
            id: "ok-rect",
            title: "민수 · 18cm²",
            detail: "조각을 옮겨 직사각형을 만들고 6 × 3",
          },
          {
            id: "bad-slant",
            title: "하은 · 30cm²",
            detail: "6 × 5",
          },
          {
            id: "ok-formula",
            title: "도윤 · 18cm²",
            detail: "밑변 6에 높이 3을 곱함",
          },
        ],
        wrong: "bad-slant",
      },
      hints: [
        {
          id: "h1",
          text: "5cm는 기울어진 변입니다. 직사각형의 세로가 되는지 보세요.",
          backTo: "reason-height",
        },
      ],
      success: "기울어진 변을 높이로 쓴 풀이가 틀렸습니다.",
      wrong: "세 풀이 중 빗변을 곱한 것을 찾으세요.",
    },
    {
      id: "same-base",
      kind: "apply",
      title: "밑변이 같으면",
      intro:
        "밑변이 모두 6cm입니다. 높이가 2cm인 것과 4cm인 것 중 넓이가 큰 것은 어느 쪽일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "h2", label: "높이 2cm" },
          { id: "h4", label: "높이 4cm" },
          { id: "same", label: "모양이 달라도 넓이는 같다" },
        ],
        correct: "h4",
      },
      hints: [
        {
          id: "h1",
          text: "밑변이 같으면 높이가 큰 쪽이 넓이가 큽니다.",
          backTo: "apply-5-4",
        },
      ],
      success: "밑변이 같으면 높이가 4cm인 쪽이 더 넓습니다.",
      wrong: "모양의 기울기가 아니라 수직 높이를 비교하세요.",
    },
    {
      id: "triangle-half",
      kind: "apply",
      title: "삼각형은 절반",
      intro:
        "밑변 6cm, 높이 4cm인 평행사변형을 대각선으로 나누면 삼각형 하나의 넓이는 몇 cm²일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(12, [24, 10, 6], "cm²"),
        correct: "12",
      },
      hints: [
        {
          id: "h1",
          text: "평행사변형 넓이의 절반입니다. 6×4=24.",
          backTo: "unit-rect",
        },
      ],
      success: "24의 절반이므로 12cm²입니다.",
      wrong: "먼저 평행사변형 넓이를 구한 뒤 반으로 나누세요.",
    },
    {
      id: "height-outside",
      kind: "apply",
      title: "높이가 바깥에 있을 때",
      intro:
        "둔각 평행사변형의 밑변은 5cm, 수직 높이는 3cm입니다. 넓이는 몇 cm²일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(15, [8, 18, 10], "cm²"),
        correct: "15",
      },
      hints: [
        {
          id: "h1",
          text: "높이의 발이 밑변 밖에 있어도, 수직 거리만 쓰면 됩니다.",
          backTo: "reason-height",
        },
      ],
      success:
        "5×3=15cm²입니다. 높이의 위치가 바깥이어도 넓이는 밑변×높이입니다.",
      wrong: "밑변과 수직 거리만 곱하세요.",
    },
    {
      id: "missing-label",
      kind: "error-hunt",
      title: "부족한 표시",
      intro:
        "그림에는 밑변 8cm와 기울어진 변 6cm만 적혀 있습니다. 지금 이 그림만으로 넓이를 구한 풀이를 고르세요.",
      engine: {
        type: "error-hunt",
        scenes: [
          {
            id: "need-h",
            title: "민수",
            detail: "높이를 모르니 넓이는 아직 못 구한다",
          },
          {
            id: "times-6",
            title: "하은 · 48cm²",
            detail: "8 × 6",
          },
          {
            id: "wait",
            title: "도윤",
            detail: "높이 선을 그은 뒤에 곱한다",
          },
        ],
        wrong: "times-6",
      },
      hints: [
        {
          id: "h1",
          text: "6cm가 높이인지 그림에서 수직인지 보세요.",
          backTo: "error-slant",
        },
      ],
      success: "기울어진 변만 보고 곱한 풀이가 틀렸습니다.",
      wrong: "높이가 표시되지 않은 채 곱한 것을 찾으세요.",
    },
    {
      id: "rhythm-a",
      kind: "rhythm",
      title: "짧은 확인 1",
      intro: "밑변 6cm, 높이 2cm입니다.",
      engine: {
        type: "choice",
        options: qtyPicks(12, [8, 16, 10], "cm²"),
        correct: "12",
      },
      hints: [{ id: "h1", text: "6×2." }],
      success: "12cm²입니다.",
      wrong: "밑변과 수직 높이를 곱하세요.",
    },
    {
      id: "rhythm-b",
      kind: "rhythm",
      title: "짧은 확인 2",
      intro: "밑변 7cm, 높이 5cm입니다.",
      engine: {
        type: "choice",
        options: qtyPicks(35, [12, 30, 24], "cm²"),
        correct: "35",
      },
      hints: [{ id: "h1", text: "7×5." }],
      success: "35cm²입니다.",
      wrong: "밑변과 수직 높이를 곱하세요.",
    },
    {
      id: "explain-height",
      kind: "explain",
      title: "한 문장으로",
      intro:
        "평행사변형을 잘라 직사각형으로 바꿔도 넓이가 같은 까닭을 고르세요.",
      engine: {
        type: "choice",
        options: [
          {
            id: "keep",
            label:
              "조각을 버리거나 겹치지 않고 밑변과 높이가 직사각형의 가로·세로가 되기 때문입니다",
          },
          {
            id: "look",
            label: "직사각형이 더 반듯해서 넓이가 커 보이기 때문입니다",
          },
        ],
        correct: "keep",
      },
      hints: [
        {
          id: "h1",
          text: "옮긴 조각의 넓이가 어디로 갔는지 보세요.",
          backTo: "cut-slide",
        },
      ],
      success: "같은 조각이 그대로이므로 넓이도 그대로입니다.",
      wrong: "반듯해 보이는 것과 넓이는 다릅니다.",
    },
    {
      id: "transfer-rect",
      kind: "apply",
      title: "바꾼 직사각형",
      intro:
        "잘라 옮긴 뒤 가로 8cm, 세로 3cm인 직사각형이 되었습니다. 원래 평행사변형의 넓이는 몇 cm²일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(24, [11, 32, 16], "cm²"),
        correct: "24",
      },
      hints: [
        {
          id: "h1",
          text: "옮긴 뒤의 직사각형 넓이가 원래 넓이입니다.",
          backTo: "predict-cut",
        },
      ],
      success: "8×3=24cm²이고, 원래 넓이와 같습니다.",
      wrong: "직사각형의 가로와 세로를 곱하세요. 그 값이 원래 넓이입니다.",
    },
    {
      id: "circle-half",
      kind: "manipulate",
      title: "원 조각의 반",
      intro: "원을 8조각으로 나눈 뒤, 반에 해당하는 칸을 칠하세요.",
      engine: { type: "fraction-bar", parts: 8, filled: 4 },
      hints: [{ id: "h1", text: "8조각의 반은 4조각입니다." }],
      success: "4/8이고, 원의 반입니다.",
      wrong: "네 조각을 칠하세요.",
    },
    {
      id: "circle-rect",
      kind: "reason",
      title: "조각을 늘어놓으면",
      intro: "원 조각을 엇갈려 늘어놓으면 어떤 모양에 가까워질까요.",
      engine: {
        type: "choice",
        options: [
          { id: "rect", label: "직사각형" },
          { id: "tri", label: "삼각형" },
          { id: "line", label: "선분 하나" },
        ],
        correct: "rect",
      },
      hints: [
        {
          id: "h1",
          text: "조각이 많을수록 위아래가 평평해집니다.",
          backTo: "circle-half",
        },
      ],
      success: "직사각형에 가까워지고, 그 넓이가 원의 넓이입니다.",
      wrong: "위가 반지름, 옆이 반 둘레인 직사각형을 떠올리세요.",
    },
  ],
};
