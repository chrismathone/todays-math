import { qtyPicks } from "../picks";
import type { CourseDef } from "../types";

export const PATTERN_COURSE: CourseDef = {
  id: "pattern",
  title: "규칙과 대응",
  gradeLabel: "1·5학년",
  unitIds: ["1-2-5", "5-1-3", "2-2-6", "4-1-6"],
  summary:
    "수를 넣어 나오는 값을 본 뒤 규칙을 고르고, 보지 않은 입력의 출력을 예측합니다.",
  flow: "넣어 보기 → 규칙 고르기 → 새 입력 예측 → 잘못된 규칙 찾기",
  activities: [
    {
      id: "watch-odd",
      kind: "observe",
      title: "넣어 보기",
      intro: "1, 2, 3을 모두 넣어 무엇이 나오는지 보세요.",
      engine: {
        type: "machine",
        pairs: [
          [1, 3],
          [2, 5],
          [3, 7],
        ],
      },
      hints: [{ id: "h1", text: "세 버튼을 모두 눌러 보세요." }],
      success: "1은 3, 2는 5, 3은 7이 나왔습니다.",
      wrong: "아직 넣지 않은 수가 있습니다.",
    },
    {
      id: "rule-odd",
      kind: "predict",
      title: "이 기계의 규칙",
      intro: "방금 본 대응의 규칙으로 알맞은 것을 고르세요.",
      engine: {
        type: "choice",
        options: [
          { id: "2n1", label: "넣은 수에 2를 곱한 뒤 1을 더함" },
          { id: "plus2", label: "넣은 수에 2만 더함" },
          { id: "times3", label: "넣은 수에 3을 곱함" },
        ],
        correct: "2n1",
      },
      hints: [
        {
          id: "h1",
          text: "1→3, 2→5를 식으로 비교해 보세요.",
          backTo: "watch-odd",
        },
      ],
      success: "2×넣은 수+1입니다.",
      wrong: "1에 2만 더하면 3이지만 2에 2만 더하면 4입니다.",
    },
    {
      id: "next-5",
      kind: "apply",
      title: "5를 넣으면",
      intro: "같은 규칙에서 5를 넣으면 무엇이 나올까요.",
      engine: {
        type: "choice",
        options: qtyPicks(11, [7, 10, 15]),
        correct: "11",
      },
      hints: [{ id: "h1", text: "2×5+1입니다.", backTo: "rule-odd" }],
      success: "11이 나옵니다.",
      wrong: "곱한 뒤 1을 더하세요.",
    },
    {
      id: "watch-double",
      kind: "observe",
      title: "다른 기계",
      intro: "1, 2, 3을 넣어 이 기계가 무엇을 하는지 보세요.",
      engine: {
        type: "machine",
        pairs: [
          [1, 2],
          [2, 4],
          [3, 6],
        ],
      },
      hints: [{ id: "h1", text: "세 번 모두 넣어야 규칙이 보입니다." }],
      success: "넣은 수의 두 배가 나왔습니다.",
      wrong: "남은 버튼을 누르세요.",
    },
    {
      id: "next-6",
      kind: "apply",
      title: "6을 넣으면",
      intro: "방금 기계에 6을 넣으면 무엇이 나올까요.",
      engine: {
        type: "choice",
        options: qtyPicks(12, [8, 9, 16]),
        correct: "12",
      },
      hints: [{ id: "h1", text: "두 배입니다.", backTo: "watch-double" }],
      success: "12입니다.",
      wrong: "1→2, 2→4와 같은 곱입니다.",
    },
    {
      id: "error-add",
      kind: "error-hunt",
      title: "누가 규칙을 다르게 읽었을까요",
      intro: "1→2, 2→4, 3→6을 본 세 설명을 보고, 틀린 설명을 고르세요.",
      engine: {
        type: "error-hunt",
        scenes: [
          { id: "ok-haeun", title: "하은", detail: "넣은 수에 2를 곱함" },
          { id: "bad-minsu", title: "민수", detail: "다음 수가 2씩 커짐" },
          {
            id: "ok-doyun",
            title: "도윤",
            detail: "1의 두 배, 2의 두 배, 3의 두 배",
          },
        ],
        wrong: "bad-minsu",
      },
      hints: [
        {
          id: "h1",
          text: "나오는 수끼리의 차와, 넣은 수와의 관계를 가르세요.",
          backTo: "watch-double",
        },
      ],
      success: "민수는 출력끼리만 보고 입력과의 곱을 놓쳤습니다.",
      wrong: "넣은 수와 나온 수를 짝으로 보세요.",
    },
    {
      id: "repeat-ab",
      kind: "recall",
      title: "무늬의 반복",
      intro: "동그라미, 네모, 동그라미, 네모 다음에 올 것은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "circle", label: "동그라미" },
          { id: "square", label: "네모" },
          { id: "tri", label: "세모" },
        ],
        correct: "circle",
      },
      hints: [{ id: "h1", text: "두 개가 한 묶음으로 반복됩니다." }],
      success: "반복 단위는 동그라미·네모입니다.",
      wrong: "두 칸씩 묶어 보세요.",
    },
    {
      id: "reason-pair",
      kind: "reason",
      title: "왜 두 배인가",
      intro: "1→2, 2→4가 같은 규칙이려면 무엇을 봐야 할까요.",
      engine: {
        type: "choice",
        options: [
          { id: "in-out", label: "넣은 수와 나온 수의 짝" },
          { id: "out-out", label: "나온 수끼리의 차이만" },
        ],
        correct: "in-out",
      },
      hints: [
        {
          id: "h1",
          text: "대응은 입력과 출력의 쌍입니다.",
          backTo: "error-add",
        },
      ],
      success: "입력과 출력을 짝으로 봐야 규칙입니다.",
      wrong: "출력의 차이만 보면 다른 규칙과 섞입니다.",
    },
    {
      id: "rhythm-7",
      kind: "rhythm",
      title: "첫 기계에 7",
      intro: "넣은 수에 2를 곱고 1을 더하는 기계에 7을 넣으면 얼마일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(15, [8, 14, 17]),
        correct: "15",
      },
      hints: [{ id: "h1", text: "2×7+1.", backTo: "rule-odd" }],
      success: "15입니다.",
      wrong: "곱한 다음 1을 더하세요.",
    },
    {
      id: "rhythm-4",
      kind: "rhythm",
      title: "두 배 기계에 4",
      intro: "넣은 수의 두 배가 나오는 기계에 4를 넣으면 얼마일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(8, [6, 16, 4]),
        correct: "8",
      },
      hints: [{ id: "h1", text: "4의 두 배.", backTo: "watch-double" }],
      success: "8입니다.",
      wrong: "두 배입니다.",
    },
    {
      id: "explain-rule",
      kind: "explain",
      title: "규칙을 말로",
      intro: "보지 않은 입력에도 같은 말을 쓸 수 있는 규칙은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "all", label: "넣은 수마다 같은 계산을 함" },
          { id: "list", label: "본 세 쌍만 외움" },
        ],
        correct: "all",
      },
      hints: [
        {
          id: "h1",
          text: "5를 넣어도 같은 말이 되어야 합니다.",
          backTo: "next-5",
        },
      ],
      success: "모든 입력에 같은 계산이 규칙입니다.",
      wrong: "외운 세 쌍만으로는 다음 값을 말할 수 없습니다.",
    },
    {
      id: "transfer-8",
      kind: "apply",
      title: "두 배 기계에 8",
      intro: "1→2, 2→4, 3→6인 기계에 8을 넣으면 얼마일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(16, [10, 11, 24]),
        correct: "16",
      },
      hints: [{ id: "h1", text: "두 배입니다.", backTo: "next-6" }],
      success: "16입니다.",
      wrong: "넣은 수에 2를 곱하세요.",
    },
    {
      id: "skip-2",
      kind: "observe",
      title: "2씩 뛰어 세기",
      intro: "2, 4, 6을 넣어 나오는 수를 모두 보세요.",
      engine: {
        type: "machine",
        pairs: [
          [2, 4],
          [4, 6],
          [6, 8],
        ],
      },
      hints: [{ id: "h1", text: "2씩 커집니다." }],
      success: "2를 더하면 다음 수입니다.",
      wrong: "세 버튼을 모두 누르세요.",
    },
    {
      id: "balance",
      kind: "apply",
      title: "양쪽이 같게",
      intro: "3+5와 같은 양은 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "4-4", label: "4+4" },
          { id: "3-3", label: "3+3" },
          { id: "5-5", label: "5+1" },
        ],
        correct: "4-4",
      },
      hints: [{ id: "h1", text: "합이 8인 짝입니다." }],
      success: "3+5=8, 4+4=8입니다.",
      wrong: "합이 같은지 보세요.",
    },
  ],
};
