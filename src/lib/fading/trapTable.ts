import type { FadingTrap } from "./chips";

/**
 * 함정 표 — 개념의 열쇠 → 그 개념의 함정 칩. **은행이 ○× 거짓 문항으로 직접 쓴 오개념** 가운데, 그 개념의 빈칸 전부에 넣어 읽고 받은 것만 든다
 * (`scripts/qa/fading-traps/` — README 에 규칙과 결과 · 판정은 `authored-verdicts.json`).
 * 🔴 손으로 고치지 않는다 — `npx tsx scripts/qa/fading-traps/authored.ts --write` 가 쓴다.
 * `ox` 는 그 오개념이 온 ○× 문항, `digest` 는 읽을 때의 개념 내용의 지문이다. 지문이 지금 내용과 다르면 그 함정은 내려가지 않는다
 * (은행의 문장이나 묶음이 바뀌었다 — 다시 읽어야 한다 · `fadingTraps.test.ts` 가 배포 전에 운다).
 */
export type FadingTrapEntry = FadingTrap & { ox: string; digest: string };

export const FADING_TRAPS: Readonly<
  Record<string, readonly FadingTrapEntry[]>
> = {
  "e3-1-2-3-c2": [
    {
      text: "두 곳",
      ox: "e3-1-2-3-xo14",
      digest: "8baa69b1",
    },
  ],
  "e3-1-2-3-c3": [
    {
      text: "크기가 다르다",
      ox: "e3-1-2-3-xo26",
      digest: "bfa7ee4f",
    },
  ],
  "e3-1-2-4-c1": [
    {
      text: "$2$개",
      ox: "e3-1-2-4-xo5",
      digest: "afe7c812",
    },
  ],
  "e3-1-4-4-c1": [
    {
      text: "$1$",
      ox: "e3-1-4-4-xo4",
      digest: "f7e8635b",
    },
  ],
  "e3-1-5-5-c1": [
    {
      text: "시간",
      ox: "e3-1-5-5-xo4",
      digest: "ad2078ab",
    },
  ],
  "e3-1-6-2-c4": [
    {
      text: "더 적게",
      ox: "e3-1-6-2-xo12",
      digest: "7e91a1ef",
    },
  ],
  "e3-2-2-3-c3": [
    {
      text: "남김없이 나누어진다",
      ox: "e3-2-2-3-xo18",
      digest: "8c00a785",
    },
  ],
  "e3-2-4-2-c2": [
    {
      text: "크다",
      ox: "e3-2-4-2-xo12",
      digest: "262f00db",
    },
  ],
  "e3-2-4-3-c2": [
    {
      text: "작다",
      ox: "e3-2-4-3-xo15",
      digest: "cf606318",
    },
  ],
  "e3-1-1-3-xc23": [
    {
      text: "커진다",
      ox: "e3-1-1-3-xo25",
      digest: "a534d8e6",
    },
  ],
  "e3-1-5-2-xc4": [
    {
      text: "$10\\,\\mathrm{cm}$",
      ox: "e3-1-5-2-xo5",
      digest: "e7205131",
    },
  ],
  "e3-1-5-5-xc7": [
    {
      text: "$100$분",
      ox: "e3-1-5-5-xo7",
      digest: "b06809d5",
    },
  ],
  "e3-1-6-1-xc5": [
    {
      text: "똑같이 넷으로",
      ox: "e3-1-6-1-xo6",
      digest: "185a9a82",
    },
  ],
  "e3-1-6-2-xc1": [
    {
      text: "$\\frac{1}{3}$",
      ox: "e3-1-6-2-xo5",
      digest: "87320d15",
    },
  ],
  "e4-2-2-4-c3": [
    {
      text: "$90^\\circ$보다 크다",
      ox: "e4-2-2-4-xo21",
      digest: "285077ae",
    },
  ],
  "e4-2-4-1-c3": [
    {
      text: "$180^\\circ$",
      ox: "e4-2-4-1-xo13",
      digest: "ebd88403",
    },
  ],
  "e4-1-5-3-xc5": [
    {
      text: "가장 짧은",
      ox: "e4-1-5-3-xo4",
      digest: "225a3675",
    },
  ],
  "e4-2-2-2-xc23": [
    {
      text: "커진다",
      ox: "e4-2-2-2-xo23",
      digest: "d6bca8ea",
    },
  ],
  "e4-2-2-3-xc5": [
    {
      text: "둔각",
      ox: "e4-2-2-3-xo4",
      digest: "6c1290f2",
    },
  ],
  "e4-2-4-1-xc12": [
    {
      text: "하나뿐",
      ox: "e4-2-4-1-xo16",
      digest: "07b0afb8",
    },
  ],
  "e4-2-4-2-xc13": [
    {
      text: "$4$개",
      ox: "e4-2-4-2-xo17",
      digest: "e43e329f",
    },
  ],
  "e4-2-4-4-xc5": [
    {
      text: "$180^\\circ$",
      ox: "e4-2-4-4-xo4",
      digest: "e7b463cc",
    },
  ],
  "e4-2-4-5-xc5": [
    {
      text: "$180^\\circ$",
      ox: "e4-2-4-5-xo5",
      digest: "1687b4ce",
    },
  ],
  "e4-2-4-6-xc15": [
    {
      text: "언제나 정삼각형",
      ox: "e4-2-4-6-xo19",
      digest: "fcd23c9b",
    },
  ],
  "e4-2-4-6-xc23": [
    {
      text: "둔각삼각형",
      ox: "e4-2-4-6-xo24",
      digest: "1aecbc28",
    },
  ],
  "e5-2-4-3-c2": [
    {
      text: "$\\frac{1}{25}$",
      ox: "e5-2-4-3-xo12",
      digest: "41b79599",
    },
  ],
  "e5-2-5-1-c5": [
    {
      text: "세 개",
      ox: "e5-2-5-1-xo14",
      digest: "4d291259",
    },
  ],
  "e5-2-6-1-c1": [
    {
      text: "클 수 있다",
      ox: "e5-2-6-1-xo4",
      digest: "659ebfa3",
    },
  ],
  "e5-1-6-4-xc12": [
    {
      text: "높이도 높다",
      ox: "e5-1-6-4-xo18",
      digest: "7b676a08",
    },
  ],
  "e5-2-2-3-xc8": [
    {
      text: "곱이 다르다",
      ox: "e5-2-2-3-xo8",
      digest: "69a65a09",
    },
  ],
  "e5-2-4-1-xc23": [
    {
      text: "언제나 $1$보다 작다",
      ox: "e5-2-4-1-xo27",
      digest: "506b738a",
    },
  ],
  "e5-2-4-7-xc12": [
    {
      text: "처음 수의 $100$배",
      ox: "e5-2-4-7-xo16",
      digest: "78d39e50",
    },
  ],
  "e5-2-5-6-xc5": [
    {
      text: "면이 겹치도록",
      ox: "e5-2-5-6-xo10",
      digest: "27406a63",
    },
  ],
  "e5-2-6-1-xc6": [
    {
      text: "작을 수도 있다",
      ox: "e5-2-6-1-xo6",
      digest: "3305f056",
    },
  ],
  "e5-2-6-3-xc11": [
    {
      text: "$0$에 가까울수록",
      ox: "e5-2-6-3-xo14",
      digest: "8108ee87",
    },
  ],
  "e6-2-2-3-c1": [
    {
      text: "반",
      ox: "e6-2-2-3-xo4",
      digest: "ccbf1cec",
    },
  ],
  "e6-2-3-4-c1": [
    {
      text: "$0$을 적어 칸으로 그린다",
      ox: "e6-2-3-4-xo19",
      digest: "addc8394",
    },
  ],
  "e6-2-6-1-c1": [
    {
      text: "서로 다르다",
      ox: "e6-2-6-1-xo2",
      digest: "e1997107",
    },
  ],
  "e6-2-6-4-c3": [
    {
      text: "밑면",
      ox: "e6-2-6-4-xo27",
      digest: "17008309",
    },
  ],
  "e6-2-2-4-xc15": [
    {
      text: "소수 둘째",
      ox: "e6-2-2-4-xo15",
      digest: "04df97df",
    },
  ],
  "e6-2-3-2-xc14": [
    {
      text: "많을 수 있다",
      ox: "e6-2-3-2-xo18",
      digest: "b6b803db",
    },
  ],
  "e6-2-5-4-xc23": [
    {
      text: "$4$배",
      ox: "e6-2-5-4-xo25",
      digest: "254bfe31",
    },
  ],
  "m1-03-01-xc2": [
    {
      text: "$ab$",
      ox: "m1-03-01-xo10",
      digest: "f577b7a7",
    },
  ],
};
