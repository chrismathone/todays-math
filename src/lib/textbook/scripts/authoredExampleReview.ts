/**
 * Offline review of the 210 newly written lesson examples, never imported by the
 * application. Three layers, kept apart in the ledger:
 *  1. every numeric relation written in `$…$` is recalculated (mathCheck.ts);
 *  2. answers stated in words are recalculated by the claims below — each claim
 *     quotes the manuscript, so a changed sentence fails instead of passing unseen;
 *  3. a reading of conditions, steps, answer and grade wording, whose findings are
 *     listed below. A reading by a model is not an editor's approval.
 */
import { AUTHORED_EXAMPLES, type AuthoredExample } from "./authoredExamples";
import { checkNumericStatements } from "./mathCheck";

/** `stated` is quoted from the manuscript; `computed` is what the calculation gives. */
export type AuthoredExampleClaim = { stated: string; computed: string };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
const divisors = (n: number) =>
  Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
const list = (values: readonly (number | string)[]) => `$${values.join(",")}$`;
const tex = (value: number | string) => `$${value}$`;
const fraction = (numerator: number, denominator: number) => {
  const g = gcd(Math.abs(numerator), denominator);
  return denominator / g === 1
    ? `${numerator / g}`
    : `\\frac${numerator / g < 10 ? numerator / g : `{${numerator / g}}`}${denominator / g < 10 ? denominator / g : `{${denominator / g}}`}`;
};
/** Polynomials as coefficient lists, lowest degree first. */
const multiply = (p: readonly number[], q: readonly number[]) => {
  const out: number[] = Array(p.length + q.length - 1).fill(0);
  p.forEach((a, i) => q.forEach((b, j) => (out[i + j]! += a * b)));
  return out;
};
const polynomial = (coefficients: readonly number[]) =>
  [...coefficients]
    .map((c, power) => ({ c, power }))
    .reverse()
    .filter(({ c }) => c)
    .map(({ c, power }, index) => {
      const sign = c < 0 ? "-" : index ? "+" : "";
      const size = Math.abs(c) === 1 && power ? "" : `${Math.abs(c)}`;
      return `${sign}${size}${power ? "x" : ""}${power > 1 ? `^${power}` : ""}`;
    })
    .join("");
const integerRoots = (coefficients: readonly number[]) =>
  Array.from({ length: 41 }, (_, i) => i - 20).filter(
    (x) =>
      coefficients.reduce((sum, c, power) => sum + c * x ** power, 0) === 0,
  );
const angleName = (degrees: number) =>
  degrees < 90 ? "예각" : degrees === 90 ? "직각" : "둔각";
/** Named by its largest angle, with 이등변 added when a right triangle has two equal angles. */
function triangleName(angles: readonly [number, number, number]): string {
  if (angles[0] + angles[1] + angles[2] !== 180) return "";
  const largest = angleName(Math.max(...angles));
  const isosceles = new Set(angles).size < 3;
  return `${largest}${largest === "직각" && isosceles ? "이등변" : ""}삼각형`;
}
const fourDigitGroups = (value: number) =>
  String(value)
    .split(/(?=(?:\d{4})+$)/)
    .filter(Boolean);
const COUNT_WORDS = ["영", "하나", "두", "세", "네", "다섯", "여섯"];
type Vector = readonly [number, number, number];
const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Two lines in space, each given by a point and a direction. */
function linePosition(p: Vector, d: Vector, q: Vector, e: Vector): string {
  const normal = cross(d, e);
  const between: Vector = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  if (dot(normal, normal) === 0) return "평행";
  return dot(between, normal) === 0 ? "한 점에서 만남" : "꼬인 위치";
}
const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
/** Korean reading by four-digit groups; a leading 일 before 십·백·천 is dropped inside a group. */
function koreanNumeral(value: number): string {
  const groups: string[] = [];
  const units = ["", "만", "억", "조"];
  for (let rest = value, level = 0; rest > 0; level += 1) {
    const group = rest % 10000;
    rest = Math.floor(rest / 10000);
    if (!group) continue;
    const places = ["", "십", "백", "천"];
    const read = [...String(group)]
      .reverse()
      .map((digit, place) =>
        digit === "0"
          ? ""
          : `${digit === "1" && place ? "" : DIGITS[Number(digit)]}${places[place]}`,
      )
      .reverse()
      .join("");
    groups.unshift(`${read}${units[level]}`);
  }
  return groups.join(" ");
}
const prism = (n: number) => ({ faces: n + 2, edges: 3 * n, vertices: 2 * n });
const pyramid = (n: number) => ({
  faces: n + 1,
  edges: 2 * n,
  vertices: n + 1,
});
const median = (sorted: readonly number[]) =>
  sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]!
    : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2;
const roundTo = (
  value: number,
  unit: number,
  mode: "floor" | "ceil" | "round",
) => Math[mode](value / unit + (mode === "round" ? 1e-12 : 0)) * unit;

const data8 = [1, 2, 3, 4, 5, 6, 7, 8];
const quadraticMinMax = (() => {
  const y = (x: number) => (x - 2) ** 2 - 1;
  const candidates = [0, 2, 3].map(y);
  return { min: Math.min(...candidates), max: Math.max(...candidates) };
})();

/** Answers and steps that are stated in words or symbols, recalculated here. */
export const AUTHORED_EXAMPLE_CLAIMS: Record<
  string,
  readonly AuthoredExampleClaim[]
> = {
  "초4::1-1-2": [
    { stated: "$40000$", computed: tex(4 * 10 ** 4) },
    { stated: "$300$", computed: tex(3 * 10 ** 2) },
  ],
  "초4::1-1-5": [
    { stated: "일조 이만", computed: koreanNumeral(1000000020000) },
    {
      stated: "$1\\;0000\\;0002\\;0000$",
      computed: tex(fourDigitGroups(1000000020000).join("\\;")),
    },
  ],
  "초4::1-2-3": [
    {
      stated: "차례로 예각, 직각, 둔각",
      computed: `차례로 ${[40, 90, 130].map(angleName).join(", ")}`,
    },
  ],
  "초4::1-3-6": [
    {
      stated: "몫은 $7$, 나머지는 $5$",
      computed: `몫은 ${tex(Math.floor(173 / 24))}, 나머지는 ${tex(173 % 24)}`,
    },
    { stated: "나머지를 $29$", computed: `나머지를 ${tex(173 - 24 * 6)}` },
  ],
  "초4::1-3-7": [
    {
      stated: "몫은 $6$, 나머지는 $1$",
      computed: `몫은 ${tex(Math.floor(187 / 31))}, 나머지는 ${tex(187 % 31)}`,
    },
  ],
  "초4::1-6-1": [
    { stated: "다음 수는 $20$", computed: `다음 수는 ${tex(16 + (16 - 12))}` },
  ],
  "초4::1-6-2": [
    {
      stated: "일곱째는 동그라미",
      computed: `일곱째는 ${["동그라미", "세모"][(7 - 1) % 2]}`,
    },
  ],
  "초4::2-2-3": [{ stated: "$60^\\circ$", computed: `$${180 / 3}^\\circ$` }],
  "초4::2-2-4": [
    { stated: "둔각삼각형", computed: triangleName([30, 40, 110]) },
  ],
  "초4::2-2-5": [
    { stated: "직각이등변삼각형", computed: triangleName([45, 45, 90]) },
  ],
  "초4::2-5-1": [
    {
      stated: "처음에는 늘고 다음에는 줄어요",
      computed: `처음에는 ${15 - 12 > 0 ? "늘" : "줄"}고 다음에는 ${14 - 15 > 0 ? "늘" : "줄"}어요`,
    },
  ],
  "초4::2-6-3": [
    {
      stated: "한 꼭짓점에서 $3$개",
      computed: `한 꼭짓점에서 ${tex(6 - 3)}개`,
    },
  ],
  "초5::1-2-1": [{ stated: "$1,2,3,6,9,18$", computed: list(divisors(18)) }],
  "초5::1-2-3": [
    { stated: "$1,2,3,4,6,12$", computed: list(divisors(12)) },
    { stated: "$1,2,3,6,9,18$", computed: list(divisors(18)) },
    {
      stated: "$1,2,3,6$",
      computed: list(divisors(12).filter((d) => 18 % d === 0)),
    },
    {
      stated: "최대공약수는 $6$",
      computed: `최대공약수는 ${tex(gcd(12, 18))}`,
    },
  ],
  "초5::1-2-4": [
    {
      stated: "최대공약수는 $12$",
      computed: `최대공약수는 ${tex(gcd(24, 36))}`,
    },
  ],
  "초5::1-2-5": [
    {
      stated: "$4,8,12,\\ldots$",
      computed: `$${[1, 2, 3].map((k) => 4 * k).join(",")},\\ldots$`,
    },
    {
      stated: "$6,12,18,\\ldots$",
      computed: `$${[1, 2, 3].map((k) => 6 * k).join(",")},\\ldots$`,
    },
    {
      stated: "최소공배수인 $12$일",
      computed: `최소공배수인 ${tex(lcm(4, 6))}일`,
    },
  ],
  "초5::1-2-6": [
    {
      stated: "최소공배수는 $24$",
      computed: `최소공배수는 ${tex(lcm(8, 12))}`,
    },
    {
      stated: "$96$은 더 큰 공배수",
      computed: `${tex(8 * 12)}은 더 큰 공배수`,
    },
  ],
  "초5::1-3-1": [
    { stated: "$4,8,12$", computed: list([1, 2, 3].map((n) => 4 * n)) },
  ],
  "초5::1-3-3": [
    { stated: "$6\\,\\mathrm{cm}$", computed: `$${3 * 2}\\,\\mathrm{cm}$` },
    { stated: "$12\\,\\mathrm{cm}$", computed: `$${3 * 4}\\,\\mathrm{cm}$` },
  ],
  "초5::1-4-2": [
    {
      stated: "최대공약수는 $6$",
      computed: `최대공약수는 ${tex(gcd(18, 24))}`,
    },
    { stated: "$\\frac34$", computed: tex(fraction(18, 24)) },
  ],
  "초5::1-5-3": [
    {
      stated: "$\\frac9{12}-\\frac2{12}$",
      computed: `$\\frac${(3 * 12) / 4}{12}-\\frac${(1 * 12) / 6}{12}$`,
    },
    { stated: "$\\frac7{12}$", computed: tex(fraction(3 * 6 - 1 * 4, 24)) },
  ],
  "초5::2-1-3": [
    {
      stated: "$8,9,10,11$",
      computed: list(
        Array.from({ length: 20 }, (_, n) => n).filter((n) => n >= 8 && n < 12),
      ),
    },
  ],
  "초5::2-1-4": [
    {
      stated: "$25$대가 필요",
      computed: `${tex(roundTo(241, 10, "ceil") / 10)}대가 필요`,
    },
    { stated: "$240$명", computed: `${tex(24 * 10)}명` },
  ],
  "초5::2-1-5": [
    {
      stated: "버림한 수는 $300$",
      computed: `버림한 수는 ${tex(roundTo(347, 100, "floor"))}`,
    },
  ],
  "초5::2-1-6": [
    {
      stated: "각각 $300$과 $400$",
      computed: `각각 ${tex(roundTo(346, 100, "round"))}과 ${tex(roundTo(351, 100, "round"))}`,
    },
  ],
  "초5::2-2-4": [
    {
      stated: "곱은 $1$",
      computed: `곱은 ${tex(fraction(3 * 8 * 3, 4 * 9 * 2))}`,
    },
  ],
  "초5::2-5-3": [
    {
      stated: "면은 $6$개, 모서리는 $12$개, 꼭짓점은 $8$개",
      computed: `면은 ${tex(prism(4).faces)}개, 모서리는 ${tex(prism(4).edges)}개, 꼭짓점은 ${tex(prism(4).vertices)}개`,
    },
  ],
  "초6::1-1-3": [
    { stated: "$\\frac94$", computed: tex(fraction(2 * 4 + 1, 4)) },
    {
      stated: "$2\\frac14\\div3=\\frac34$",
      computed: `$2\\frac14\\div3=${fraction(9, 4 * 3)}$`,
    },
  ],
  "초6::1-2-1": [
    {
      stated: "밑면은 삼각형 두 개, 옆면은 직사각형 세 개",
      computed: `밑면은 삼각형 ${COUNT_WORDS[prism(3).faces - 3]} 개, 옆면은 직사각형 ${COUNT_WORDS[prism(3).faces - 2]} 개`,
    },
  ],
  "초6::1-2-4": [
    {
      stated: "밑면은 하나, 삼각형 옆면은 네 개",
      computed: `밑면은 ${COUNT_WORDS[pyramid(4).faces - 4]}, 삼각형 옆면은 ${COUNT_WORDS[pyramid(4).faces - 1]} 개`,
    },
  ],
  "초6::1-2-2": [
    {
      stated: "꼭짓점 $10$개, 모서리 $15$개, 면 $7$개",
      computed: `꼭짓점 ${tex(prism(5).vertices)}개, 모서리 ${tex(prism(5).edges)}개, 면 ${tex(prism(5).faces)}개`,
    },
  ],
  "초6::1-2-5": [
    {
      stated: "꼭짓점 $7$개, 모서리 $12$개, 면 $7$개",
      computed: `꼭짓점 ${tex(pyramid(6).vertices)}개, 모서리 ${tex(pyramid(6).edges)}개, 면 ${tex(pyramid(6).faces)}개`,
    },
  ],
  "초6::1-3-4": [
    { stated: "몫은 $1.04$", computed: `몫은 ${tex(312 / 3 / 100)}` },
    { stated: "$0.04$", computed: tex(12 / 3 / 100) },
  ],
  "초6::1-3-5": [{ stated: "몫은 $1.75$", computed: `몫은 ${tex(7 / 4)}` }],
  "초6::1-5-2": [
    {
      stated: "$50\\%,30\\%,20\\%$",
      computed: `$${[10, 6, 4].map((n) => `${(n / 20) * 100}\\%`).join(",")}$`,
    },
    {
      stated: "경계는 $50\\%$와 $80\\%$",
      computed: `경계는 $${(10 / 20) * 100}\\%$와 $${((10 + 6) / 20) * 100}\\%$`,
    },
  ],
  "초6::1-5-5": [
    {
      stated: "을 반이 $4$명 더",
      computed: `을 반이 ${tex(40 * 0.4 - 20 * 0.6)}명 더`,
    },
  ],
  "초6::2-2-4": [
    {
      stated: "반올림하면 $0.67$",
      computed: `반올림하면 ${tex(Math.round((2 / 3) * 100) / 100)}`,
    },
  ],
  "초6::2-2-5": [
    {
      stated: "몫 $5$, 나머지 $3$",
      computed: `몫 ${tex(Math.floor(23 / 4))}, 나머지 ${tex(23 % 4)}`,
    },
  ],
  "초6::2-3-1": [
    {
      stated: "앞에서 $3$층으로 보이지만 전체 개수는 $4$개",
      computed: `앞에서 ${tex(Math.max(1, 3))}층으로 보이지만 전체 개수는 ${tex(1 + 3)}개`,
    },
  ],
  "초6::2-3-5": [
    {
      stated: "층별로 $3,2,1$개",
      computed: `층별로 ${list([1, 2, 3].map((floor) => [3, 2, 1].filter((height) => height >= floor).length))}개`,
    },
  ],
  "초6::2-4-2": [
    {
      stated: "$2:3$",
      computed: tex(`${(0.6 * 10) / gcd(6, 9)}:${(0.9 * 10) / gcd(6, 9)}`),
    },
  ],
  "초6::2-4-4": [{ stated: "$x=15$", computed: tex(`x=${(5 * 9) / 3}`) }],
  "초6::2-4-5": [
    {
      stated: "$12$개와 $18$개",
      computed: `${tex((30 / (2 + 3)) * 2)}개와 ${tex((30 / (2 + 3)) * 3)}개`,
    },
  ],
  "중1::두 직선의 위치 관계": [
    {
      // Unit box: the front-bottom edge runs along x through (0,0,0); each back
      // vertical edge runs along z through (0,1,0) or (1,1,0).
      stated: "꼬인 위치",
      computed: (
        [
          [0, 1, 0],
          [1, 1, 0],
        ] as const
      ).every(
        (point) =>
          linePosition([0, 0, 0], [1, 0, 0], point, [0, 0, 1]) === "꼬인 위치",
      )
        ? "꼬인 위치"
        : "",
    },
  ],
  "중1::원과 부채꼴": [
    {
      stated: "현의 길이는 같은 비례 관계가 아니야",
      computed:
        Math.abs(
          Math.sin((60 / 2) * (Math.PI / 180)) /
            Math.sin((30 / 2) * (Math.PI / 180)) -
            60 / 30,
        ) > 0.05
          ? "현의 길이는 같은 비례 관계가 아니야"
          : "",
    },
  ],
  "중1::줄기와 잎 그림": [
    {
      stated: "줄기 $2$의 잎은 $1,4,4$이고 줄기 $3$의 잎은 $2$",
      computed: `줄기 $2$의 잎은 ${list([21, 24, 24, 32].filter((v) => Math.floor(v / 10) === 2).map((v) => v % 10))}이고 줄기 $3$의 잎은 ${list([21, 24, 24, 32].filter((v) => Math.floor(v / 10) === 3).map((v) => v % 10))}`,
    },
  ],
  "중2::등변사다리꼴, 여러 가지 사각형": [
    { stated: "$110^\\circ$", computed: `$${180 - 70}^\\circ$` },
  ],
  "중2::순환소수를 포함한 식의 계산": [
    {
      stated: "$\\frac13$, $\\frac16$",
      computed: `${tex(fraction(3, 9))}, ${tex(fraction(15, 90))}`,
    },
  ],
  "중3::제곱근의 뜻과 성질": [
    {
      stated: "$9$의 제곱근은 $\\pm3$",
      computed: `$9$의 제곱근은 $\\pm${integerRoots([-9, 0, 1]).filter((x) => x > 0)[0]}$`,
    },
  ],
  "중3::다항식의 곱셈": [
    {
      stated: "$x^2+6x+9$",
      computed: tex(polynomial(multiply([3, 1], [3, 1]))),
    },
  ],
  "중3::인수분해": [
    {
      stated: "$x^2+5x+6$",
      computed: tex(polynomial(multiply([2, 1], [3, 1]))),
    },
    {
      stated: "합이 $5$, 곱이 $6$인 두 수는 $2$와 $3$",
      computed: `합이 ${tex(2 + 3)}, 곱이 ${tex(2 * 3)}인 두 수는 $2$와 $3$`,
    },
  ],
  "중3::이차방정식의 풀이": [
    {
      stated: "$x^2-5x+6=0$",
      computed: tex(`${polynomial(multiply([-2, 1], [-3, 1]))}=0`),
    },
    {
      stated: "$x=2$ 또는 $x=3$",
      computed: integerRoots([6, -5, 1])
        .map((x) => tex(`x=${x}`))
        .join(" 또는 "),
    },
  ],
  "중3::이차방정식의 근의 공식과 응용": [
    {
      stated: "$x=1\\pm\\sqrt2$",
      computed: [1 + Math.SQRT2, 1 - Math.SQRT2].every(
        (x) => Math.abs(x * x - 2 * x - 1) < 1e-9,
      )
        ? "$x=1\\pm\\sqrt2$"
        : "",
    },
  ],
  "중3::이차방정식의 활용": [
    {
      stated: "$(x-4)(x+5)=0$",
      computed:
        polynomial(multiply([-4, 1], [5, 1])) ===
        polynomial(multiply([0, 1], [1, 1]).map((c, i) => (i ? c : c - 20)))
          ? "$(x-4)(x+5)=0$"
          : "",
    },
    {
      stated: "근 $4,-5$",
      computed: `근 ${list([...integerRoots([-20, 1, 1])].sort((a, b) => b - a))}`,
    },
  ],
  "중3::이차함수 y=ax^2+bx+c의 그래프": [
    {
      stated: "$y=x^2-4x+3$",
      computed: tex(
        `y=${polynomial(multiply([-2, 1], [-2, 1]).map((c, i) => (i ? c : c - 1)))}`,
      ),
    },
  ],
  "중3::이차함수의 최댓값과 최솟값": [
    {
      stated: "최솟값 $-1$, 최댓값 $3$",
      computed: `최솟값 ${tex(quadraticMinMax.min)}, 최댓값 ${tex(quadraticMinMax.max)}`,
    },
    {
      stated: "$y(0)=3$, $y(3)=0$",
      computed: `$y(0)=${(0 - 2) ** 2 - 1}$, $y(3)=${(3 - 2) ** 2 - 1}$`,
    },
  ],
  "중3::삼각비의 뜻": [
    {
      stated: "$\\sin A=\\frac35$, $\\cos A=\\frac45$, $\\tan A=\\frac34$",
      computed:
        3 ** 2 + 4 ** 2 === 5 ** 2
          ? `$\\sin A=${fraction(3, 5)}$, $\\cos A=${fraction(4, 5)}$, $\\tan A=${fraction(3, 4)}$`
          : "",
    },
  ],
  "중3::삼각비의 값": [
    {
      stated: "$\\sin45^\\circ=\\cos45^\\circ=\\frac{\\sqrt2}2$",
      computed:
        Math.abs(Math.sin(Math.PI / 4) - Math.SQRT2 / 2) < 1e-12 &&
        Math.abs(Math.cos(Math.PI / 4) - Math.SQRT2 / 2) < 1e-12 &&
        Math.abs(1 / Math.SQRT2 - Math.SQRT2 / 2) < 1e-12
          ? "$\\sin45^\\circ=\\cos45^\\circ=\\frac{\\sqrt2}2$"
          : "",
    },
  ],
  "중3::삼각비의 활용": [
    {
      stated: "$8\\sin30^\\circ=4\\,\\mathrm{cm}$",
      computed: `$8\\sin30^\\circ=${Math.round(8 * Math.sin(Math.PI / 6) * 1e9) / 1e9}\\,\\mathrm{cm}$`,
    },
    {
      stated: "넓이는 $12\\,\\mathrm{cm}^2$",
      computed: `넓이는 $${Math.round(0.5 * 6 * 8 * Math.sin(Math.PI / 6) * 1e9) / 1e9}\\,\\mathrm{cm}^2$`,
    },
  ],
  "중3::원과 현": [
    {
      stated: "현의 길이는 $8\\,\\mathrm{cm}$",
      computed: `현의 길이는 $${2 * Math.sqrt(5 ** 2 - 3 ** 2)}\\,\\mathrm{cm}$`,
    },
  ],
  "중3::대푯값과 산포도": [
    { stated: "평균은 $4$", computed: `평균은 ${tex((2 + 4 + 6) / 3)}` },
    {
      stated: "편차는 $-2,0,2$",
      computed: `편차는 ${list([2, 4, 6].map((v) => v - 4))}`,
    },
    {
      stated: "분산은 $\\frac83$",
      computed: `분산은 ${tex(
        fraction(
          [2, 4, 6].reduce((s, v) => s + (v - 4) ** 2, 0),
          3,
        ),
      )}`,
    },
  ],
  "중3::산점도와 상관관계": [
    {
      stated: "양의 상관관계",
      computed:
        [
          [1, 2],
          [2, 4],
          [3, 5],
        ].reduce((s, [x, y]) => s + (x! - 2) * (y! - 11 / 3), 0) > 0
          ? "양의 상관관계"
          : "",
    },
  ],
  "중3::상자그림": [
    {
      stated: "$1,2.5,4.5,6.5,8$",
      computed: list([
        data8[0]!,
        median(data8.slice(0, 4)),
        median(data8),
        median(data8.slice(4)),
        data8.at(-1)!,
      ]),
    },
    {
      stated: "상자 길이는 $4$",
      computed: `상자 길이는 ${tex(median(data8.slice(4)) - median(data8.slice(0, 4)))}`,
    },
  ],
};

export type AuthoredExampleFinding = {
  key: string;
  /** math: a wrong statement. condition: a condition is missing or appears late. wording: grade language or grammar. */
  kind: "math" | "condition" | "wording";
  finding: string;
  status: "fixed" | "open";
};

/** What the reading found. An empty list for an example means nothing was found, not that an editor approved it. */
export const AUTHORED_EXAMPLE_FINDINGS: readonly AuthoredExampleFinding[] = [
  {
    key: "초5::2-4-6",
    kind: "wording",
    finding:
      "답 ‘곱은 $1.56$예요.’의 조사가 수 읽기와 맞지 않는다: …오육은 받침으로 끝나므로 ‘이에요’가 맞다. 수식과 값은 옳다. 저장된 대사를 바꾸는 일이어서 고치지 않고 남겼다.",
    status: "open",
  },
  {
    key: "초4::2-4-3",
    kind: "condition",
    finding:
      "질문에는 비스듬히 잰 $5\\,\\mathrm{cm}$만 있고, 답의 $3\\,\\mathrm{cm}$는 풀이 둘째 대사에서 ‘수직으로 잰 길이가 $3\\,\\mathrm{cm}$라면’으로 처음 나온다. 가정임이 드러나 있어 틀린 문장은 아니지만 질문만 읽으면 답을 정할 수 없다.",
    status: "open",
  },
  {
    key: "초6::2-3-1",
    kind: "condition",
    finding:
      "질문은 어느 기둥이 앞인지 말하지 않고, 풀이가 ‘뒤 기둥이 더 높아’로 정한다. 어느 쪽이 앞이어도 보이는 높이는 $3$이라 답은 같다.",
    status: "open",
  },
  {
    key: "중3::원의 접선",
    kind: "wording",
    finding:
      "‘원 밖의 점에서 두 접점을 이었고’는 접선 두 개를 그었다는 뜻으로 읽어야 한다. 교과서 표현은 ‘원 밖의 한 점에서 그은 두 접선’.",
    status: "open",
  },
  {
    key: "중3::이차함수와 그래프",
    kind: "wording",
    finding:
      "질문의 ‘두 점은 왜 나란할까’는 ‘높이가 같을까’의 뜻이다. 풀이와 답은 대칭과 좌표로 바르게 설명한다.",
    status: "open",
  },
];

export type AuthoredExampleReviewRow = {
  key: string;
  grade: string;
  /** Relations in `$…$` recalculated and found true. */
  relationsChecked: number;
  /** Relations with a symbolic side; covered by a claim or by reading only. */
  relationsSkipped: number;
  claimsChecked: number;
  /** calculated: at least one relation or claim was recalculated. read-only: nothing numeric to recalculate. */
  method: "calculated" | "read-only";
  findings: AuthoredExampleFinding[];
  faults: string[];
};

export const authoredExampleText = (example: AuthoredExample) =>
  [example.question, ...example.steps, example.answer].join("\n");

export function reviewAuthoredExamples(): AuthoredExampleReviewRow[] {
  return Object.entries(AUTHORED_EXAMPLES).flatMap(([grade, examples]) =>
    Object.entries(examples).map(([name, example]) => {
      const key = `${grade}::${name}`;
      const text = authoredExampleText(example);
      const relations = checkNumericStatements(text);
      const claims = AUTHORED_EXAMPLE_CLAIMS[key] ?? [];
      const faults = [
        ...relations.faults.map((relation) => `틀린 식: $${relation}$`),
        ...claims.flatMap((claim) => [
          ...(text.includes(claim.stated)
            ? []
            : [`원고에 없는 인용: ${claim.stated}`]),
          ...(claim.stated === claim.computed
            ? []
            : [`계산과 다름: ${claim.stated} ≠ ${claim.computed}`]),
        ]),
      ];
      return {
        key,
        grade,
        relationsChecked: relations.checked.length,
        relationsSkipped: relations.skipped.length,
        claimsChecked: claims.length,
        method:
          relations.checked.length || claims.length
            ? "calculated"
            : "read-only",
        findings: AUTHORED_EXAMPLE_FINDINGS.filter(
          (finding) => finding.key === key,
        ),
        faults,
      };
    }),
  );
}
