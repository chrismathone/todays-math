/**
 * «배우기» preview cards (plan §3.4 · §8.25 «예습»): before a new section's learn session —
 * meaning → picture → worked examples → one practice. Code data, no database.
 *
 * The meaning is the explorer concept card's own sentence (`definitionCard(...).definition`,
 * already corrected — D-143); worked examples and practice are written here and checked by
 * `previewCards.test.ts`, which recomputes every practice answer from its numbers.
 * Pilot scope (plan §4): 초5 2학기 1단원, the first sections a pilot student meets.
 */
import type { NumberLineSpec } from "./numberLine";

export type PreviewCard = {
  sectionId: string;
  /** The heading the student reads («소수의 곱셈을 배워요» style). */
  title: string;
  /** Explorer concept card whose meaning sentence is shown, or the sentence itself. */
  meaning: { cardId: string } | { text: string };
  /** A line under the meaning (optional). */
  note?: string;
  figure: NumberLineSpec;
  figureCaption: string;
  worked: { prompt: string; steps: string[]; answer: string }[];
  practice: {
    prompt: string;
    /** The number the student types; `unit` follows the input box. */
    answer: string;
    unit?: string;
    hint: string;
    explanation: string;
  };
};

export const PREVIEW_CARDS: PreviewCard[] = [
  {
    sectionId: "5-2-1-1",
    title: "이상과 이하를 배워요",
    meaning: { cardId: "g5-at-least" },
    note: "이상 · 이하에는 기준 수도 들어가요.",
    figure: {
      min: 40,
      max: 50,
      labels: [40, 42, 44, 45, 46, 48, 50],
      points: [{ value: 45, closed: true }],
      ranges: [{ from: 45, to: "right" }],
      title: "45 이상인 수",
    },
    figureCaption: "45 이상: 45에 채운 점을 찍고 오른쪽으로 이어요.",
    worked: [
      {
        prompt: "43, 45, 47, 44, 50 중에서 45 이상인 수를 모두 찾아요.",
        steps: [
          "45와 같거나 45보다 큰 수를 골라요.",
          "45는 기준 수라서 들어가요.",
        ],
        answer: "45, 47, 50",
      },
      {
        prompt: "38 이하인 자연수 중에서 가장 큰 수는 무엇일까요?",
        steps: ["38 이하에는 38도 들어가요.", "그래서 가장 큰 수는 38이에요."],
        answer: "38",
      },
    ],
    practice: {
      prompt: "17, 20, 21, 19, 25 중에서 20 이하인 수는 모두 몇 개인가요?",
      answer: "3",
      unit: "개",
      hint: "20과 같거나 20보다 작은 수를 세어 봐요.",
      explanation: "17, 20, 19가 20 이하예요. 20도 들어가서 모두 3개예요.",
    },
  },
  {
    sectionId: "5-2-1-2",
    title: "초과와 미만을 배워요",
    meaning: { cardId: "g5-more-than" },
    note: "초과 · 미만에는 기준 수가 들어가지 않아요.",
    figure: {
      min: 25,
      max: 35,
      labels: [25, 27, 30, 33, 35],
      points: [{ value: 30, closed: false }],
      ranges: [{ from: 30, to: "right" }],
      title: "30 초과인 수",
    },
    figureCaption: "30 초과: 30에 빈 점을 찍고 오른쪽으로 이어요.",
    worked: [
      {
        prompt: "28, 30, 31, 35 중에서 30 초과인 수를 모두 찾아요.",
        steps: ["30보다 큰 수만 골라요.", "30은 기준 수라서 들어가지 않아요."],
        answer: "31, 35",
      },
      {
        prompt: "15 미만인 자연수 중에서 가장 큰 수는 무엇일까요?",
        steps: [
          "15 미만에는 15가 들어가지 않아요.",
          "그래서 가장 큰 수는 14예요.",
        ],
        answer: "14",
      },
    ],
    practice: {
      prompt: "8, 12, 10, 15, 9 중에서 10 미만인 수는 모두 몇 개인가요?",
      answer: "2",
      unit: "개",
      hint: "10보다 작은 수만 세어 봐요. 10은 들어가지 않아요.",
      explanation: "8, 9가 10 미만이에요. 10은 들어가지 않아서 모두 2개예요.",
    },
  },
  {
    sectionId: "5-2-1-3",
    title: "수의 범위를 배워요",
    meaning: {
      text: "기준 두 개를 함께 쓰면 그 사이의 범위가 돼요. 이상 · 이하는 기준 수를 넣고, 초과 · 미만은 기준 수를 빼요.",
    },
    figure: {
      min: 18,
      max: 27,
      labels: [18, 20, 22, 25, 27],
      points: [
        { value: 20, closed: true },
        { value: 25, closed: false },
      ],
      ranges: [{ from: 20, to: 25 }],
      title: "20 이상 25 미만인 수",
    },
    figureCaption: "20 이상 25 미만: 20은 채운 점, 25는 빈 점이에요.",
    worked: [
      {
        prompt: "20 이상 25 미만인 자연수를 모두 써요.",
        steps: ["20은 들어가요.", "25는 들어가지 않아요."],
        answer: "20, 21, 22, 23, 24",
      },
      {
        prompt:
          "40 kg 초과 45 kg 이하가 한 조예요. 40 kg, 43 kg, 45 kg, 46 kg 중에서 이 조에 들어가는 몸무게를 모두 찾아요.",
        steps: [
          "40 kg은 초과라서 들어가지 않아요.",
          "45 kg은 이하라서 들어가요.",
        ],
        answer: "43 kg, 45 kg",
      },
    ],
    practice: {
      prompt: "10 초과 14 이하인 자연수는 모두 몇 개인가요?",
      answer: "4",
      unit: "개",
      hint: "10은 빼고 14는 넣어서 세어 봐요.",
      explanation: "11, 12, 13, 14로 모두 4개예요.",
    },
  },
  {
    sectionId: "5-2-1-4",
    title: "올림을 배워요",
    meaning: { cardId: "g5-round-up" },
    note: "올림은 남길 자리 아래에 0이 아닌 수가 있으면 남길 자리에 1을 더해요.",
    figure: {
      min: 230,
      max: 240,
      labels: [230, 234, 240],
      points: [{ value: 234, closed: true }],
      jumps: [{ from: 234, to: 240 }],
      title: "234를 올림하여 십의 자리까지 나타내면 240",
    },
    figureCaption: "234를 십의 자리까지 올림하면 240이에요.",
    worked: [
      {
        prompt: "234를 올림하여 십의 자리까지 나타내요.",
        steps: [
          "십의 자리 아래는 일의 자리 4예요.",
          "0이 아니니 십의 자리에 1을 더하고 일의 자리는 0으로 해요.",
        ],
        answer: "240",
      },
      {
        prompt: "250을 올림하여 십의 자리까지 나타내요.",
        steps: [
          "십의 자리 아래는 일의 자리 0이에요.",
          "올릴 것이 없어서 그대로예요.",
        ],
        answer: "250",
      },
    ],
    practice: {
      prompt: "317을 올림하여 십의 자리까지 나타내면 얼마인가요?",
      answer: "320",
      hint: "일의 자리 7을 보고 십의 자리에 1을 더해요.",
      explanation: "일의 자리가 0이 아니라서 310이 아니라 320이에요.",
    },
  },
  {
    sectionId: "5-2-1-5",
    title: "버림을 배워요",
    meaning: { cardId: "g5-round-up" },
    note: "버림은 남길 자리 아래의 수를 모두 0으로 해요.",
    figure: {
      min: 230,
      max: 240,
      labels: [230, 238, 240],
      points: [{ value: 238, closed: true }],
      jumps: [{ from: 238, to: 230 }],
      title: "238을 버림하여 십의 자리까지 나타내면 230",
    },
    figureCaption: "238을 십의 자리까지 버림하면 230이에요.",
    worked: [
      {
        prompt: "238을 버림하여 십의 자리까지 나타내요.",
        steps: [
          "십의 자리 아래는 일의 자리 8이에요.",
          "버림은 아래 자리를 0으로 해서 230이에요.",
        ],
        answer: "230",
      },
      {
        prompt: "4567을 버림하여 백의 자리까지 나타내요.",
        steps: ["백의 자리 아래는 67이에요.", "67을 00으로 해서 4500이에요."],
        answer: "4500",
      },
    ],
    practice: {
      prompt: "1999를 버림하여 천의 자리까지 나타내면 얼마인가요?",
      answer: "1000",
      hint: "천의 자리 아래 999를 모두 0으로 해요.",
      explanation: "999가 아무리 커도 버림은 0으로 해서 1000이에요.",
    },
  },
  {
    sectionId: "5-2-1-6",
    title: "반올림을 배워요",
    meaning: { cardId: "g5-round" },
    note: "바로 아래 자리 숫자만 봐요.",
    figure: {
      min: 30,
      max: 40,
      labels: [30, 34, 35, 40],
      points: [
        { value: 34, closed: true },
        { value: 35, closed: true },
      ],
      jumps: [
        { from: 34, to: 30 },
        { from: 35, to: 40 },
      ],
      title: "34는 30으로, 35는 40으로 반올림",
    },
    figureCaption: "십의 자리까지 반올림하면 34는 30, 35는 40이에요.",
    worked: [
      {
        prompt: "34를 반올림하여 십의 자리까지 나타내요.",
        steps: ["바로 아래 일의 자리 숫자는 4예요.", "5보다 작아서 버려요."],
        answer: "30",
      },
      {
        prompt: "2650을 반올림하여 백의 자리까지 나타내요.",
        steps: [
          "바로 아래 십의 자리 숫자는 5예요.",
          "5 이상이라서 백의 자리에 1을 더해요.",
        ],
        answer: "2700",
      },
    ],
    practice: {
      prompt: "476을 반올림하여 십의 자리까지 나타내면 얼마인가요?",
      answer: "480",
      hint: "일의 자리 숫자 6을 봐요.",
      explanation: "6은 5 이상이라서 올려요. 그래서 480이에요.",
    },
  },
];
