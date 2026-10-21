import type { PreviewCard } from "./cards";

/** Original worked examples; the tests independently multiply the numbers in each prompt. */
export const FRACTION_PREVIEW_CARDS: PreviewCard[] = [
  {
    sectionId: "5-2-2-1",
    title: "분수에 자연수를 곱해요",
    meaning: {
      text: "분수에 자연수를 곱하면 그 분수를 자연수만큼 더한 양이 돼요. 같은 크기의 조각이 몇 개 모이는지 세어 봐요.",
    },
    figure: {
      kind: "engine",
      id: "fraction-times-whole",
      title: "3/4를 두 번 모으면 1/4 조각 6개",
    },
    figureCaption:
      "한 줄이 1이에요. 줄마다 4칸 중 3칸씩, 두 줄에서 6칸을 모으면 3/4 × 2 = 6/4예요.",
    worked: [
      {
        prompt: "3/4 × 2의 값을 구해요.",
        steps: [
          "3/4를 두 번 더해요: 3/4 + 3/4예요.",
          "1/4 조각이 3 × 2 = 6개라서 6/4예요.",
          "분자와 분모를 2로 나누면 3/2, 곧 1 1/2이에요.",
        ],
        answer: "3/2",
      },
      {
        prompt: "2/5 × 3의 값을 구해요.",
        steps: [
          "2/5 + 2/5 + 2/5처럼 세 번 더해요.",
          "1/5 조각이 2 × 3 = 6개예요. 조각의 크기는 그대로라서 6/5예요.",
        ],
        answer: "6/5",
      },
    ],
    practice: {
      prompt: "3/5 × 4의 값을 구해요.",
      answer: "12/5",
      hint: "1/5 조각 3개씩을 네 번 모아 봐요. 분모는 그대로예요.",
      explanation: "1/5 조각이 3 × 4 = 12개예요. 12/5, 또는 2 2/5이에요.",
    },
  },
  {
    sectionId: "5-2-2-2",
    title: "자연수에 분수를 곱해요",
    meaning: {
      text: "자연수에 분수를 곱하면 그 자연수만큼의 양에서 분수가 나타내는 만큼을 구해요. 분모만큼 똑같이 나누고, 분자만큼 모아요.",
    },
    figure: {
      kind: "engine",
      id: "whole-times-fraction",
      title: "4를 똑같이 4묶음으로 나눈 뒤 3묶음 선택",
    },
    figureCaption:
      "띠 전체가 4이고 한 칸이 1이에요. 4칸 중 3칸을 고르면 4 × 3/4 = 3이에요.",
    worked: [
      {
        prompt: "4 × 3/4의 값을 구해요.",
        steps: [
          "4를 똑같이 4묶음으로 나누면 한 묶음은 4 ÷ 4 = 1이에요.",
          "그중 3묶음을 모으면 1 × 3 = 3이에요.",
        ],
        answer: "3",
      },
      {
        prompt: "6 × 2/3의 값을 구해요.",
        steps: [
          "6을 똑같이 3묶음으로 나누면 한 묶음은 2예요.",
          "그중 2묶음을 모으면 2 × 2 = 4예요.",
        ],
        answer: "4",
      },
    ],
    practice: {
      prompt: "5 × 3/4의 값을 구해요.",
      answer: "15/4",
      hint: "5를 똑같이 4묶음으로 나누면 한 묶음은 5/4예요. 3묶음을 모아 봐요.",
      explanation: "5/4를 3번 모으면 15/4예요. 대분수로 쓰면 3 3/4이에요.",
    },
  },
  {
    sectionId: "5-2-2-3",
    title: "진분수끼리 곱해요",
    meaning: { cardId: "g5-fraction-multiply" },
    note: "1보다 작은 분수를 곱하면 원래 양의 일부분이 돼요.",
    figure: {
      kind: "engine",
      id: "proper-fractions",
      title: "전체 12칸 중 위 두 줄에서 3칸씩 고른 6칸",
    },
    figureCaption:
      "세 줄 전체가 1이에요. 위 두 줄(2/3)에서 각각 4칸 중 3칸을 고르면 2/3 × 3/4 = 6/12예요.",
    worked: [
      {
        prompt: "2/3 × 3/4의 값을 구해요.",
        steps: [
          "1을 3줄로 나누고 각 줄을 4칸으로 나누면 한 칸은 1/12이에요.",
          "2/3인 두 줄에서 3/4씩 고르면 2 × 3 = 6칸이에요.",
          "6/12를 약분하면 1/2이에요.",
        ],
        answer: "1/2",
      },
      {
        prompt: "3/5 × 2/7의 값을 구해요.",
        steps: [
          "1을 5줄로 나누고 각 줄을 7칸으로 나누면 한 칸은 1/35이에요.",
          "3줄에서 2칸씩 고르면 3 × 2 = 6칸이라서 6/35예요.",
        ],
        answer: "6/35",
      },
    ],
    practice: {
      prompt: "4/5 × 3/8의 값을 구해요.",
      answer: "3/10",
      hint: "분자는 4 × 3, 분모는 5 × 8로 계산하고 약분해 봐요.",
      explanation:
        "1/40 조각을 12개 고른 양이에요. 12/40을 약분하면 3/10이에요.",
    },
  },
  {
    sectionId: "5-2-2-4",
    title: "대분수가 있는 곱셈을 해요",
    meaning: { cardId: "g5-fraction-multiply" },
    note: "대분수는 가분수로 고쳐요. 자연수 부분과 분수 부분을 모두 담아야 해요.",
    figure: {
      kind: "engine",
      id: "mixed-fractions",
      title: "전체 1과 1/2을 세 묶음으로 나누고 두 묶음을 선택",
    },
    figureCaption:
      "여섯 칸 전체가 1 1/2이고 한 칸은 1/4이에요. 세 세로 묶음 중 두 묶음(4칸)을 고르면 1 1/2 × 2/3 = 1이에요.",
    worked: [
      {
        prompt: "1 1/2 × 2/3의 값을 구해요.",
        steps: [
          "1은 1/2 조각 2개라서 1 1/2은 3/2예요.",
          "3/2를 세 묶음으로 나누면 한 묶음은 1/2이에요.",
          "두 묶음을 모으면 1이에요. 식으로도 (3 × 2)/(2 × 3) = 6/6 = 1이에요.",
        ],
        answer: "1",
      },
      {
        prompt: "1 2/3 × 1 1/5의 값을 구해요.",
        steps: [
          "1 2/3은 5/3, 1 1/5은 6/5로 고쳐요.",
          "분자끼리, 분모끼리 곱하면 30/15예요.",
          "30/15는 15/15가 두 개이므로 2예요.",
        ],
        answer: "2",
      },
    ],
    practice: {
      prompt: "2 1/4 × 2/3의 값을 구해요.",
      answer: "3/2",
      hint: "2는 1/4 조각 8개예요. 2 1/4을 가분수로 고친 뒤 곱해 봐요.",
      explanation:
        "2 1/4 = 9/4이므로 9/4 × 2/3 = 18/12예요. 약분하면 3/2, 곧 1 1/2이에요.",
    },
  },
];
