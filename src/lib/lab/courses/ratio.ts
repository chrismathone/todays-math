import { qtyPicks } from "../picks";
import type { CourseDef } from "../types";

export const RATIO_COURSE: CourseDef = {
  id: "ratio",
  title: "비와 같은 맛",
  gradeLabel: "6학년",
  unitIds: ["6-1-4", "6-2-4"],
  summary:
    "두 양을 같은 묶음으로 늘려 비를 유지하고, 총량을 비에 맞게 나눕니다.",
  flow: "비의 뜻 → 묶음 늘리기 → 같은 비 → 한쪽만 늘린 오류 찾기",
  activities: [
    {
      id: "ratio-mean",
      kind: "recall",
      title: "2:3의 뜻",
      intro: "주스 2:3은 무엇을 말할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "parts", label: "한 묶음에 2와 3이 들어갑니다" },
          { id: "minus", label: "3에서 2를 뺀 값입니다" },
          { id: "plus", label: "2와 3을 더한 값입니다" },
        ],
        correct: "parts",
      },
      hints: [{ id: "h1", text: "비교하는 양과 기준량을 짝으로 봅니다." }],
      success: "2와 3이 한 묶음입니다.",
      wrong: "합이나 차가 아니라 짝입니다.",
    },
    {
      id: "mix-2-3",
      kind: "manipulate",
      title: "2와 3을 두 묶음",
      intro: "한 묶음이 2와 3일 때, 묶음 두 개가 되게 하세요.",
      engine: { type: "ratio", a: 2, b: 3, copies: 2 },
      hints: [{ id: "h1", text: "한 묶음 더하기를 두 번 누르세요." }],
      success: "4와 6이고, 비는 여전히 2:3입니다.",
      wrong: "묶음 수가 2가 될 때까지 더하세요.",
    },
    {
      id: "same-taste",
      kind: "apply",
      title: "같은 맛",
      intro: "2:3을 유지하며 두 묶음이면 양은 얼마일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "4-6", label: "4와 6" },
          { id: "2-3", label: "2와 3" },
          { id: "3-2", label: "3과 2" },
        ],
        correct: "4-6",
      },
      hints: [{ id: "h1", text: "2와 3을 각각 두 배로.", backTo: "mix-2-3" }],
      success: "4:6은 2:3과 같은 비입니다.",
      wrong: "양쪽을 같은 횟수만큼 늘려야 합니다.",
    },
    {
      id: "mix-1-2",
      kind: "manipulate",
      title: "1과 2를 세 묶음",
      intro: "한 묶음이 1과 2일 때, 묶음 세 개가 되게 하세요.",
      engine: { type: "ratio", a: 1, b: 2, copies: 3 },
      hints: [
        { id: "h1", text: "더하기를 세 번 누릅니다.", backTo: "mix-2-3" },
      ],
      success: "3과 6이고, 비는 1:2입니다.",
      wrong: "묶음이 3인지 보세요.",
    },
    {
      id: "error-one-side",
      kind: "error-hunt",
      title: "누가 비를 깨었을까요",
      intro: "2:3을 두 배로 만드는 설명을 보고, 한쪽만 늘린 설명을 고르세요.",
      engine: {
        type: "error-hunt",
        scenes: [
          {
            id: "ok-haeun",
            title: "하은",
            detail: "2와 3을 각각 두 배로 하여 4와 6",
          },
          { id: "bad-minsu", title: "민수", detail: "2만 두 배로 하여 4와 3" },
          {
            id: "ok-doyun",
            title: "도윤",
            detail: "같은 묶음을 하나 더 놓아 4와 6",
          },
        ],
        wrong: "bad-minsu",
      },
      hints: [
        {
          id: "h1",
          text: "양쪽을 같이 바꿔야 같은 맛입니다.",
          backTo: "same-taste",
        },
      ],
      success: "민수는 한쪽만 늘려 비가 깨졌습니다.",
      wrong: "두 양을 같은 횟수로 늘렸는지 보세요.",
    },
    {
      id: "order",
      kind: "reason",
      title: "비의 순서",
      intro: "물:주스가 2:3일 때 3:2는 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "swap", label: "비교하는 양과 기준량의 순서가 바뀐 것입니다" },
          { id: "same", label: "같은 비입니다" },
          { id: "sum", label: "합이 같으면 같은 비입니다" },
        ],
        correct: "swap",
      },
      hints: [{ id: "h1", text: "앞에 오는 양이 다릅니다." }],
      success: "순서가 바뀌면 다른 비입니다.",
      wrong: "무엇을 무엇에 비교하는지 순서를 보세요.",
    },
    {
      id: "share-16",
      kind: "apply",
      title: "3:5로 16 나누기",
      intro: "16을 3:5로 나누면 한 묶음의 크기는 얼마일까요. 3+5=8입니다.",
      engine: {
        type: "choice",
        options: qtyPicks(2, [3, 5, 8]),
        correct: "2",
      },
      hints: [{ id: "h1", text: "16을 8로 나누면 한 묶음입니다." }],
      success: "한 묶음이 2이므로 6과 10입니다.",
      wrong: "비의 합이 한 묶음의 칸 수입니다.",
    },
    {
      id: "mix-3-5",
      kind: "manipulate",
      title: "3과 5를 두 묶음",
      intro: "한 묶음이 3과 5일 때, 묶음 두 개가 되게 하세요.",
      engine: { type: "ratio", a: 3, b: 5, copies: 2 },
      hints: [
        { id: "h1", text: "앞에서 구한 6과 10입니다.", backTo: "share-16" },
      ],
      success: "6과 10입니다.",
      wrong: "묶음 두 번입니다.",
    },
    {
      id: "rhythm-2-2",
      kind: "rhythm",
      title: "1:1 두 묶음",
      intro: "한 묶음이 1과 1일 때 두 묶음이면 양은 얼마일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "2-2", label: "2와 2" },
          { id: "1-1", label: "1과 1" },
          { id: "2-1", label: "2와 1" },
        ],
        correct: "2-2",
      },
      hints: [{ id: "h1", text: "양쪽을 같이 두 배로." }],
      success: "2:2는 1:1과 같은 비입니다.",
      wrong: "양쪽을 같은 횟수로 늘리세요.",
    },
    {
      id: "rhythm-copies",
      kind: "rhythm",
      title: "2:3 한 묶음",
      intro: "한 묶음만 있으면 양은 얼마일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "2-3", label: "2와 3" },
          { id: "4-6", label: "4와 6" },
          { id: "3-2", label: "3과 2" },
        ],
        correct: "2-3",
      },
      hints: [
        { id: "h1", text: "첫 묶음 그대로입니다.", backTo: "ratio-mean" },
      ],
      success: "2와 3입니다.",
      wrong: "한 묶음은 2와 3입니다.",
    },
    {
      id: "explain-both",
      kind: "explain",
      title: "같은 비를 유지하려면",
      intro: "맛을 그대로 두면서 양을 늘리려면 어떻게 해야 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "both", label: "두 양을 같은 횟수의 묶음으로 늘립니다" },
          { id: "one", label: "많은 쪽만 늘립니다" },
        ],
        correct: "both",
      },
      hints: [
        {
          id: "h1",
          text: "한쪽만 늘리면 비가 깨집니다.",
          backTo: "error-one-side",
        },
      ],
      success: "같은 묶음을 더 놓는 것이 같은 비입니다.",
      wrong: "한쪽만 바꾸면 2:3이 아닙니다.",
    },
    {
      id: "transfer-3-copies",
      kind: "apply",
      title: "2:3 세 묶음",
      intro: "2:3을 세 묶음 놓으면 양은 얼마일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "6-9", label: "6과 9" },
          { id: "4-6", label: "4와 6" },
          { id: "5-6", label: "5와 6" },
        ],
        correct: "6-9",
      },
      hints: [{ id: "h1", text: "2와 3을 각각 세 배.", backTo: "mix-2-3" }],
      success: "6:9는 2:3과 같은 비입니다.",
      wrong: "양쪽을 3배로 하세요.",
    },
  ],
};
