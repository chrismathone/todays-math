import type { FadingProposition } from "./concepts";
import type { FadingFigure } from "./figures";

type Range =
  | ["left", number, boolean]
  | ["right", number, boolean]
  | ["between", number, boolean, number, boolean];

/** H-01: checked against definitions, not the B/C questions or the section title.
 * General single-range statements use a small-number example; explicit values follow
 * the sentence. Null means one range cannot illustrate all conditions/comparisons.
 * Pin the sentence so edited content cannot silently reuse a now-unrelated diagram.
 */
const NUMBER_LINES: Readonly<
  Record<string, { sentence: string; range: Range | null }>
> = {
  "e5-2-1-1-c1": {
    sentence:
      "기준 수 이상의 수의 범위는 기준 수를 {포함}하고 그보다 큰 수들도 들어가는 범위이다.",
    range: ["right", 3, true],
  },
  "e5-2-1-1-c2": {
    sentence:
      "기준 수 이하의 수의 범위는 기준 수를 {포함}하고 그보다 작은 수들도 들어가는 범위이다.",
    range: ["left", 3, true],
  },
  "e5-2-1-1-xc3": {
    sentence: "이상은 기준 수에 {색칠한 점}을 찍고 오른쪽으로 선을 긋는다.",
    range: ["right", 3, true],
  },
  "e5-2-1-1-xc4": {
    sentence: "이하는 기준 수에 색칠한 점을 찍고 {왼쪽}으로 선을 긋는다.",
    range: ["left", 3, true],
  },
  "e5-2-1-1-c3": {
    sentence:
      "두 조건을 함께 쓰면 {두 조건을 모두} 만족하는 수만 범위에 남는다.",
    range: null,
  },
  "e5-2-1-1-xc20": {
    sentence:
      "수직선에서 두 점이 모두 색칠되어 있고 {그 사이만} 이어져 있으면 작은 수 이상 큰 수 이하인 범위이다.",
    range: ["between", 2, true, 5, true],
  },
  "e5-2-1-1-xc22": {
    sentence:
      "나이와 키처럼 조건이 둘이면 {각 조건을 따로} 확인한 뒤 둘 다 맞는 사람만 고른다.",
    range: null,
  },
  "e5-2-1-1-xc24": {
    sentence: "‘적어도 그만큼은 되어야 한다’는 조건은 {이상}으로 나타낸다.",
    range: ["right", 3, true],
  },
  "e5-2-1-1-xc25": {
    sentence: "‘많아도 그 값을 넘지 않는다’는 조건은 {이하}로 나타낸다.",
    range: ["left", 3, true],
  },
  "e5-2-1-2-c1": {
    sentence:
      "초과는 {기준 수보다 큰 수}의 범위이며, 기준 수는 들어가지 않는다.",
    range: ["right", 3, false],
  },
  "e5-2-1-2-c2": {
    sentence:
      "미만은 {기준 수보다 작은 수}의 범위이며, 기준 수는 들어가지 않는다.",
    range: ["left", 3, false],
  },
  "e5-2-1-2-xc3": {
    sentence: "초과는 기준 수에 {빈 점}을 찍고 오른쪽으로 선을 긋는다.",
    range: ["right", 3, false],
  },
  "e5-2-1-2-xc4": {
    sentence: "미만은 기준 수에 빈 점을 찍고 {왼쪽}으로 선을 긋는다.",
    range: ["left", 3, false],
  },
  "e5-2-1-2-c3": {
    sentence:
      "이상과 이하는 기준이 되는 수를 범위에 포함하지만, 초과와 미만은 그 수를 {제외한다}.",
    range: null,
  },
  "e5-2-1-2-xc9": {
    sentence:
      "작은 수 초과 큰 수 미만으로 쓰면 {두 기준 수를 모두 뺀} 그 사이의 수가 범위이다.",
    range: ["between", 2, false, 5, false],
  },
  "e5-2-1-2-xc10": {
    sentence: "‘$5$ 이상’은 $5$를 넣고 ‘$5$ 초과’는 $5$를 {뺀다}.",
    range: null,
  },
  "e5-2-1-2-xc11": {
    sentence: "‘$5$ 이하’는 $5$를 넣고 ‘$5$ 미만’은 $5$를 {뺀다}.",
    range: null,
  },
  "e5-2-1-1-xc6": {
    sentence:
      "‘몇 명 이하’로 정한 인원은 {그 수까지} 들어갈 수 있고, 그 수를 하나라도 넘으면 들어갈 수 없다.",
    range: ["left", 3, true],
  },
  "e5-2-1-1-xc7": {
    sentence:
      "이상과 이하에서 범위를 가르는 수를 {기준이 되는 수}라 하며, 그 수는 범위에 들어간다.",
    range: null,
  },
  "e5-2-1-1-xc8": {
    sentence: "$3$ 이상인 수에는 자연수뿐 아니라 $3.5$ 같은 {소수}도 들어간다.",
    range: ["right", 3, true],
  },
  "e5-2-1-1-xc9": {
    sentence:
      "‘$3$ 이상 $7$ 이하’는 $3$부터 $7$까지 {두 수를 모두 포함한} 범위이다.",
    range: ["between", 3, true, 7, true],
  },
  "e5-2-1-1-xc10": {
    sentence: "이상은 기준 수보다 {큰 쪽}, 이하는 작은 쪽으로 이어진다.",
    range: null,
  },
  "e5-2-1-1-xc11": {
    sentence:
      "작은 자연수 이상 큰 자연수 이하인 범위에 든 자연수는 두 수의 차보다 {$1$개 더 많다}.",
    range: ["between", 2, true, 5, true],
  },
  "e5-2-1-1-xc12": {
    sentence:
      "이상으로만 정해 위쪽 끝을 제한하지 않은 수의 범위에는 가장 큰 수가 {없다}.",
    range: ["right", 3, true],
  },
  "e5-2-1-1-xc13": {
    sentence: "이하로 정한 범위에서 가장 큰 수는 {기준이 되는 수}이다.",
    range: ["left", 3, true],
  },
  "e5-2-1-1-xc14": {
    sentence:
      "작은 수 이상 큰 수 이하인 범위를 나타낼 때는 두 기준 수에 {모두 색칠한 점}을 찍고 그 사이를 잇는다.",
    range: ["between", 2, true, 5, true],
  },
  "e5-2-1-1-xc15": {
    sentence:
      "범위에 기준 수가 들어가는지 헷갈리면 ‘이상, 이하’는 {들어간다}고 기억한다.",
    range: null,
  },
  "e5-2-1-1-xc16": {
    sentence: "‘$90$점 이상은 수’처럼 기준 점수 이상이면 {그 등급}에 들어간다.",
    range: ["right", 90, true],
  },
  "e5-2-1-1-xc18": {
    sentence:
      "‘이상’은 ‘{같거나 크다}’, ‘이하’는 ‘같거나 작다’로 바꾸어 말할 수 있다.",
    range: null,
  },
  "e5-2-1-2-xc5": {
    sentence:
      "‘몇 초과’로 정한 조건은 기준 값과 {꼭 같을 때는} 해당하지 않는다.",
    range: ["right", 3, false],
  },
  "e5-2-1-2-xc7": {
    sentence: "초과와 미만에서는 기준 수가 범위에 {들어가지 않는다}.",
    range: null,
  },
  "e5-2-1-2-xc8": {
    sentence: "$3$ 미만인 수에는 $2.9$ 같은 {소수}도 들어간다.",
    range: ["left", 3, false],
  },
  "e5-2-1-2-xc12": {
    sentence:
      "작은 자연수 초과 큰 자연수 미만인 범위에 든 자연수는 두 수의 차보다 {$1$개 적다}.",
    range: ["between", 2, false, 5, false],
  },
  "e5-2-1-2-xc15": {
    sentence:
      "기준 수가 자연수일 때, 그 수 초과인 자연수는 {기준 수보다 $1$ 큰 수 이상}인 자연수와 같다.",
    range: null,
  },
  "e5-2-1-2-xc16": {
    sentence:
      "기준 수가 자연수일 때, 그 수 미만인 자연수는 {기준 수보다 $1$ 작은 수 이하}인 자연수와 같다.",
    range: null,
  },
  "e5-2-1-2-xc17": {
    sentence:
      "이상 · 이하와 초과 · 미만이 섞인 범위는 수직선에서 {범위에 드는 기준 수에만} 색칠한 점을 찍는다.",
    range: null,
  },
  "e5-2-1-2-xc19": {
    sentence:
      "작은 수 초과 큰 수 이하로 쓰면 {작은 기준 수}는 빠지고 {큰 기준 수}는 들어간다.",
    range: ["between", 2, false, 5, true],
  },
  "e5-2-1-2-xc20": {
    sentence:
      "‘$30$ 이상 $35$ 미만’, ‘$35$ 이상 $40$ 미만’처럼 나누면 경계의 수가 {한 구간에만} 들어간다.",
    range: null,
  },
  "e5-2-1-2-xc21": {
    sentence: "‘그 값을 넘으면’이라는 조건은 {초과}로 나타낸다.",
    range: ["right", 3, false],
  },
  "e5-2-1-2-xc22": {
    sentence: "‘그 값에 못 미치면’이라는 조건은 {미만}으로 나타낸다.",
    range: ["left", 3, false],
  },
  "e5-2-1-2-xc23": {
    sentence:
      "$4$ 초과 $8$ 미만인 자연수에 $4$나 $8$을 넣으면 {기준 수를 넣은} 잘못이다.",
    range: ["between", 4, false, 8, false],
  },
  "e5-2-1-2-xc26": {
    sentence:
      "기준 수가 자연수가 아니면 {기준 수와 같은 자연수가 없어}, 자연수만 볼 때 초과와 이상, 미만과 이하가 각각 같은 범위가 된다.",
    range: null,
  },
  "e5-2-1-2-xc27": {
    sentence:
      "이웃한 두 자연수를 기준으로 한 초과 · 미만 범위에는 {자연수가 없지만} 소수는 들어간다.",
    range: ["between", 3, false, 4, false],
  },
};

/** Keep the bank's canvas, colours and marks; ticks and endpoints share x(n).
 * preview/numberLineSvg has a different canvas/palette, so it is not substituted here.
 */
function rangeSvg(range: Range): string {
  const [direction, boundary, closed] = range;
  const min = direction === "between" ? boundary : boundary - 1;
  const max = direction === "between" ? range[3] : boundary + 2;
  const x = (n: number) => 40 + ((n - min) / (max - min)) * 120;
  const guide = 'stroke="#6B6B72" stroke-width="1" fill="none"';
  const parts = [`<path d="M20 70H183 M179 67L183 70L179 73" ${guide}/>`];
  for (let n = min; n <= max; n++) {
    parts.push(`<path d="M${x(n)} 66V74" ${guide}/>`);
    parts.push(
      `<text x="${x(n)}" y="90" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#1F1F23">${n}</text>`,
    );
  }
  const path =
    direction === "left"
      ? `M20 61H${x(boundary)} M25 57L20 61L25 65`
      : direction === "right"
        ? `M${x(boundary)} 61H183 M178 57L183 61L178 65`
        : `M${x(boundary)} 61H${x(range[3])}`;
  parts.push(
    `<path d="${path}" stroke="#A57F00" stroke-width="2" fill="none"/>`,
  );
  const point = (value: number, included: boolean) =>
    `<circle cx="${x(value)}" cy="61" r="4" fill="${included ? "#1F1F23" : "white"}"${included ? "" : ' stroke="#1F1F23" stroke-width="1.5"'}/>`;
  parts.push(point(boundary, closed));
  if (direction === "between") parts.push(point(range[3], range[4]));
  return parts.join("");
}

/** Display-only: no new fields, saved data, sentence edits, token or digest changes. */
export function fadingNumberLineForProposition(
  figure: FadingFigure | null,
  proposition: FadingProposition,
): FadingFigure | null {
  if (!figure || !["e5-2-1-1-f1", "e5-2-1-2-f1"].includes(figure.id))
    return figure;
  const entry = NUMBER_LINES[proposition.id];
  const sentence = proposition.pieces
    .map((piece) =>
      piece.kind === "text" ? piece.text : `{${piece.target.text}}`,
    )
    .join("");
  if (!entry?.range || entry.sentence !== sentence) return null;
  return { ...figure, svg: rangeSvg(entry.range), tags: [] };
}
