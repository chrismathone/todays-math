import { qtyPicks } from "../picks";
import type { CourseDef } from "../types";

export const MEASURE_COURSE: CourseDef = {
  id: "measure",
  title: "길이 재기",
  gradeLabel: "2학년",
  unitIds: ["1-1-4", "2-1-4", "2-2-3"],
  summary:
    "시작을 맞추고, 같은 단위로 세고, 0이 아닌 눈금에서도 길이를 읽습니다.",
  flow: "비교 → 0 맞추기 → 눈금 읽기 → 잘못된 재기 찾기 → 짧은 복습",
  activities: [
    {
      id: "compare-start",
      kind: "recall",
      title: "시작을 맞추면 길이가 보입니다",
      intro:
        "두 막대의 왼쪽 끝을 같은 자리에 두고, 어느 쪽이 더 긴지 고르세요.",
      engine: {
        type: "compare",
        left: 7,
        right: 5,
        longer: "left",
      },
      hints: [
        {
          id: "h1",
          text: "한쪽 끝을 맞춘 뒤, 반대쪽 끝이 더 나온 쪽이 깁니다.",
        },
      ],
      success: "왼쪽 막대가 더 깁니다. 시작을 맞춰야 비교가 됩니다.",
      wrong: "아직 시작이 어긋나 있으면 겉보기와 실제 길이가 다를 수 있습니다.",
    },
    {
      id: "predict-zero",
      kind: "predict",
      title: "자의 0은 어디에 둘까요",
      intro: "막대의 길이를 재려면 자의 0을 어디에 맞춰야 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "start", label: "막대의 왼쪽 끝" },
          { id: "end", label: "막대의 오른쪽 끝" },
          { id: "middle", label: "막대의 가운데" },
        ],
        correct: "start",
      },
      hints: [
        {
          id: "h1",
          text: "0은 길이의 시작입니다. 끝이 아닙니다.",
        },
      ],
      success: "자의 0을 재는 대상의 시작에 둡니다.",
      wrong: "끝의 숫자만 보면 시작이 어디인지 알 수 없습니다.",
    },
    {
      id: "align-ruler",
      kind: "manipulate",
      title: "자를 끌어 0을 맞추세요",
      intro: "자를 움직여 0이 막대 시작에 오게 한 뒤, 길이를 고르세요.",
      engine: {
        type: "ruler",
        objectStart: 3,
        objectEnd: 10,
        rulerZero: 0,
        mode: "align",
        max: 14,
        picks: qtyPicks(7, [10, 3, 13], "cm"),
      },
      hints: [
        {
          id: "h1",
          text: "자의 0이 노란 막대의 왼쪽 끝에 오도록 손잡이를 움직이세요.",
          backTo: "predict-zero",
        },
      ],
      success: "0에서 7까지이므로 길이는 7cm입니다.",
      wrong: "먼저 0을 막대 시작에 맞춘 다음, 끝 눈금을 읽으세요.",
    },
    {
      id: "reason-zero",
      kind: "reason",
      title: "왜 0을 맞춰야 할까요",
      intro: "자를 막대 중간에 놓으면 무엇이 잘못될까요.",
      engine: {
        type: "choice",
        options: [
          {
            id: "gap",
            label:
              "시작과 끝 사이의 칸 수가 길이인데, 시작을 빼먹지 못하게 됩니다",
          },
          { id: "color", label: "자의 색이 막대와 달라서 길이가 바뀝니다" },
        ],
        correct: "gap",
      },
      hints: [
        {
          id: "h1",
          text: "길이는 끝 눈금에서 시작 눈금을 뺀 칸 수입니다.",
          backTo: "align-ruler",
        },
      ],
      success: "길이는 시작에서 끝까지의 칸 수입니다.",
      wrong: "자의 색은 길이를 바꾸지 않습니다. 시작과 끝을 함께 보세요.",
    },
    {
      id: "offset-read",
      kind: "apply",
      title: "0에서 시작하지 않아도 됩니다",
      intro: "막대가 눈금 2에서 8까지 놓여 있습니다. 길이는 몇 cm일까요.",
      engine: {
        type: "ruler",
        objectStart: 2,
        objectEnd: 8,
        rulerZero: 0,
        mode: "offset",
        max: 14,
        picks: qtyPicks(6, [8, 2, 10], "cm"),
      },
      hints: [
        {
          id: "h1",
          text: "끝 눈금 8에서 시작 눈금 2를 빼 보세요.",
          backTo: "reason-zero",
        },
      ],
      success: "8에서 2를 빼면 6cm입니다.",
      wrong:
        "끝의 숫자 8만 읽으면 안 됩니다. 시작에서 끝까지 몇 칸인지 보세요.",
    },
    {
      id: "error-end",
      kind: "error-hunt",
      title: "잘못된 재기를 찾으세요",
      intro: "같은 7cm 막대를 잰 세 기록입니다. 틀린 것을 고르세요.",
      engine: {
        type: "error-hunt",
        scenes: [
          {
            id: "ok-align",
            title: "민수 · 7cm",
            detail: "자의 0을 막대 시작에 맞추고 끝 눈금 7",
          },
          {
            id: "ok-offset",
            title: "하은 · 7cm",
            detail: "시작 눈금 3, 끝 눈금 10",
          },
          {
            id: "bad-end",
            title: "도윤 · 9cm",
            detail: "시작 눈금 2, 끝 눈금 9",
          },
        ],
        wrong: "bad-end",
      },
      hints: [
        {
          id: "h1",
          text: "끝 숫자만 적은 기록을 찾아보세요.",
          backTo: "offset-read",
        },
      ],
      success: "시작이 0이 아닌데 끝 숫자만 적은 기록이 틀렸습니다.",
      wrong: "세 기록을 시작 눈금과 끝 눈금으로 비교해 보세요.",
    },
    {
      id: "unit-cover",
      kind: "manipulate",
      title: "1cm 조각으로 덮기",
      intro:
        "막대를 빈틈없이 덮으려면 1cm 조각이 몇 개 필요할까요. 조각을 눌러 올리세요.",
      engine: { type: "cover", length: 5 },
      hints: [
        {
          id: "h1",
          text: "겹치거나 빈칸이 남지 않게 한 줄로 붙이세요.",
        },
      ],
      success: "1cm 조각 5개가 막대를 빈틈없이 덮습니다. 길이는 5cm입니다.",
      wrong: "조각이 모자라거나 넘치면 아직 덮이지 않은 곳이 있습니다.",
    },
    {
      id: "estimate",
      kind: "apply",
      title: "어림해 보세요",
      intro: "이미 잰 5cm 막대와 비교할 때, 약 8cm인 막대는 어느 쪽일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "short", label: "5cm보다 조금 짧은 막대" },
          { id: "eight", label: "5cm보다 한 뼘 정도 더 긴 막대" },
          { id: "long", label: "5cm의 세 배가 넘는 막대" },
        ],
        correct: "eight",
      },
      hints: [
        {
          id: "h1",
          text: "8은 5보다 3만큼 깁니다. 세 배가 아닙니다.",
          backTo: "unit-cover",
        },
      ],
      success: "8cm는 5cm보다 조금 더 긴 길이입니다.",
      wrong: "5cm 조각을 기준으로 얼마나 더 긴지 떠올려 보세요.",
    },
    {
      id: "broken-ruler",
      kind: "apply",
      title: "잘린 자",
      intro:
        "자의 앞부분이 없어서 막대가 눈금 4에서 12까지입니다. 길이는 몇 cm일까요.",
      engine: {
        type: "ruler",
        objectStart: 4,
        objectEnd: 12,
        rulerZero: 0,
        mode: "offset",
        max: 16,
        picks: qtyPicks(8, [12, 4, 16], "cm"),
      },
      hints: [
        {
          id: "h1",
          text: "12에서 4를 빼면 칸 수를 알 수 있습니다.",
          backTo: "offset-read",
        },
      ],
      success: "12-4=8이므로 8cm입니다.",
      wrong: "잘린 자라도 시작과 끝의 차이가 길이입니다.",
    },
    {
      id: "difference",
      kind: "apply",
      title: "두 길이의 차",
      intro: "파란 막대는 7cm, 회색 막대는 4cm입니다. 차는 몇 cm일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(3, [11, 4, 1], "cm"),
        correct: "3",
      },
      hints: [
        { id: "h1", text: "7에서 4를 빼 보세요.", backTo: "compare-start" },
      ],
      success: "7cm와 4cm의 차는 3cm입니다.",
      wrong: "두 길이를 시작에 맞추면 남는 칸이 차입니다.",
    },
    {
      id: "rhythm-a",
      kind: "rhythm",
      title: "빠르게 읽기 1",
      intro: "막대가 1에서 5까지입니다.",
      engine: {
        type: "ruler",
        objectStart: 1,
        objectEnd: 5,
        rulerZero: 0,
        mode: "offset",
        max: 12,
        picks: qtyPicks(4, [5, 1, 6], "cm"),
      },
      hints: [{ id: "h1", text: "5-1을 계산하세요." }],
      success: "4cm입니다.",
      wrong: "시작 눈금을 빼고 읽으세요.",
    },
    {
      id: "rhythm-b",
      kind: "rhythm",
      title: "빠르게 읽기 2",
      intro: "막대가 0에서 9까지입니다.",
      engine: {
        type: "ruler",
        objectStart: 0,
        objectEnd: 9,
        rulerZero: 0,
        mode: "offset",
        max: 12,
        picks: qtyPicks(9, [0, 10, 8], "cm"),
      },
      hints: [{ id: "h1", text: "0에서 시작하면 끝 눈금이 길이입니다." }],
      success: "9cm입니다.",
      wrong: "0에서 시작했는지만 먼저 보세요.",
    },
    {
      id: "rhythm-c",
      kind: "rhythm",
      title: "빠르게 읽기 3",
      intro: "막대가 6에서 11까지입니다.",
      engine: {
        type: "ruler",
        objectStart: 6,
        objectEnd: 11,
        rulerZero: 0,
        mode: "offset",
        max: 14,
        picks: qtyPicks(5, [11, 6, 17], "cm"),
      },
      hints: [{ id: "h1", text: "11-6을 계산하세요." }],
      success: "5cm입니다.",
      wrong: "끝에서 시작을 빼 보세요.",
    },
    {
      id: "explain-photos",
      kind: "explain",
      title: "같은 막대, 다른 숫자",
      intro:
        "같은 막대를 찍은 사진이 5cm와 9cm로 다르게 나왔습니다. 까닭은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          {
            id: "start",
            label: "한쪽은 시작 눈금을 빼지 않고 끝 숫자만 읽었습니다",
          },
          { id: "grew", label: "사진을 찍는 동안 막대가 길어졌습니다" },
        ],
        correct: "start",
      },
      hints: [
        {
          id: "h1",
          text: "막대의 길이는 바뀌지 않습니다. 읽기 방법이 달랐는지 보세요.",
          backTo: "error-end",
        },
      ],
      success: "시작을 빼지 않으면 같은 막대도 더 큰 수로 읽힙니다.",
      wrong: "막대 자체는 같은 길이입니다. 눈금을 어떻게 읽었는지 보세요.",
    },
    {
      id: "join-cm",
      kind: "apply",
      title: "이어 붙인 길이",
      intro: "3cm 조각과 5cm 조각을 이어 붙이면 몇 cm일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(8, [2, 15, 5], "cm"),
        correct: "8",
      },
      hints: [
        {
          id: "h1",
          text: "두 조각을 한 줄로 붙인 뒤 1cm 칸을 세세요.",
          backTo: "unit-cover",
        },
      ],
      success: "3cm와 5cm를 이으면 8cm입니다.",
      wrong: "겹치지 않게 이어 붙인 길이를 더하세요.",
    },
  ],
};
