/** Independent print-only oracles. No runtime imports; reconstruct each scored target. */
import type {
  NativePrintedProblem,
  NativeFact,
} from "../../../contracts/nativeDescriptive.contract";
import type { NativeVerification } from "./types";

function text(printed: NativePrintedProblem): {
  stem: string;
  questions: string;
} {
  if (printed.figureSpec !== null)
    throw new Error("그림 없는 문항에 미검증 그림이 추가됨");
  const [stem, ...rest] = printed.content.replace(/\$/g, "").split("\n");
  if (
    !stem ||
    rest.length !== 3 ||
    !rest.every((line, i) => line.startsWith(`(${i + 1}) `))
  )
    throw new Error("인쇄 조건 또는 세 소문항 불완전");
  return { stem, questions: rest.join("\n") };
}
function requireText(questions: string, parts: string[]) {
  if (parts.some((part) => !questions.includes(part)))
    throw new Error("배점에 대응하는 인쇄 요구 누락");
}
const sgn = (n: number) => (n === 0 ? "0" : n < 0 ? "-" : "+");
const plus = (n: number) => (n < 0 ? String(n) : `+${n}`);
const linear = (n: number) => `(x${plus(n)})`;
/** Printing only. All numeric coefficients passed here were independently reconstructed. */
function polynomial(a: number, b: number, c: number): string {
  let result = `${a === 1 ? "" : a === -1 ? "-" : a}x^2`;
  if (b)
    result += `${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}x`;
  if (c) result += plus(c);
  return result;
}
const vertexForm = (a: number, p: number, q: number) =>
  `${a === 1 ? "" : a === -1 ? "-" : a}(x${plus(-p)})^2${q ? plus(q) : ""}`;
function verification(
  given: string,
  keys: string[],
  values: string[],
  witnesses: string[][],
  answer: string,
  coverage: Record<string, string>,
  unit?: string,
): NativeVerification {
  return {
    derived: [
      { factKey: "printed", kind: "given", value: given },
      ...keys.map((factKey, i): NativeFact => ({
        factKey,
        kind: i === keys.length - 1 ? "answer" : "intermediate",
        value: values[i]!,
        ...(unit && i === keys.length - 1 ? { unit } : {}),
      })),
    ],
    criterionChecks: keys.map((criterionId, i) => ({
      criterionId,
      expectedContains: witnesses[i]!,
      modelContains: witnesses[i]!,
      ...(i === keys.length - 1 ? { answerContains: [answer] } : {}),
    })),
    coverage,
  };
}

export function verifyRootSign(
  printed: NativePrintedProblem,
): NativeVerification {
  const { stem, questions } = text(printed);
  requireText(questions, [
    "제곱한 값의 비교",
    "비교가 가능한 이유",
    "부호",
    "비음성",
    "절댓값",
    "간단히",
  ]);
  const m =
    /^식 \\sqrt\{\((\d+)-\\sqrt\{(\d+)\}\)\^2\}에 대하여 다음 물음에 답하시오\.$/.exec(
      stem,
    );
  if (!m) throw new Error("제곱근 인쇄 식/단위/부호 불완전");
  const a = Number(m[1]),
    b = Number(m[2]);
  if (a < 1 || a > 100 || b < 1 || b > 10000)
    throw new Error("제곱근 인쇄 범위 오류");
  // Integer squares by addition; comparison needs no floating point square root.
  let square = 0;
  for (let i = 0; i < a; i++) square += a;
  if (square === b) throw new Error("부호 판단이 필요한 비영 차가 아님");
  const cmp = square < b ? "<" : ">";
  const body = square < b ? `\\sqrt{${b}}-${a}` : `${a}-\\sqrt{${b}}`;
  return verification(
    `${a},${b}`,
    ["comparison", "sign", "simplified"],
    [`${square}${cmp}${b}`, `${a}-sqrt(${b})${cmp}0`, body],
    [
      [
        `${a}^2=${square}`,
        `${square}${cmp}${b}`,
        `${a}${cmp}\\sqrt{${b}}`,
        "두 수가 모두 음이 아니므로",
      ],
      [
        `${a}-\\sqrt{${b}}${cmp}0`,
        `\\sqrt{(${a}-\\sqrt{${b}})^2}=|${a}-\\sqrt{${b}}|=${body}`,
        "제곱근은 음이 아니므로",
      ],
      [body],
    ],
    body,
    { pair: `${a},${b}`, sign: sgn(square - b) },
  );
}

export function verifyFactorRepair(
  printed: NativePrintedProblem,
): NativeVerification {
  const { stem, questions } = text(printed);
  requireText(questions, [
    "각각 전개",
    "보존된 항",
    "잘못 본 항",
    "복원",
    "합과 곱",
    "모든 항의 계수",
    "x=0",
  ]);
  const m =
    /^최고차항이 x\^2인 이차식을 인수분해하였다\. 지호는 x의 계수만 잘못 읽고 나머지 항은 바르게 읽어 \(x([+-]\d+)\)\(x([+-]\d+)\)를 얻었다\. 은수는 상수항만 잘못 읽고 나머지 항은 바르게 읽어 \(x([+-]\d+)\)\(x([+-]\d+)\)를 얻었다\. 두 학생은 읽은 식의 인수분해 계산은 바르게 하였다\.$/.exec(
      stem,
    );
  if (!m) throw new Error("두 오류의 인쇄 조건·곱·단위 불완전");
  const [p, q, u, v] = m.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
  ];
  if ([p, q, u, v].some((n) => n === 0 || Math.abs(n) > 64))
    throw new Error("인쇄 인수의 범위 오류");
  const first = (x: number) => (x + p) * (x + q);
  const second = (x: number) => (x + u) * (x + v);
  // Reconstruct the coefficients by evaluation at -1, 0, 1, independently of expansion.
  const product = first(0),
    wrongConstant = second(0);
  const wrongLinear = (first(1) - first(-1)) / 2;
  const sum = (second(1) - second(-1)) / 2;
  if (wrongConstant === product || wrongLinear === sum)
    throw new Error("잘못 읽었다는 조건과 실제 전개가 모순");
  const roots: number[] = [];
  for (let x = -128; x <= 128; x++)
    if (x * x + sum * x + product === 0) roots.push(x);
  if (roots.length !== 2)
    throw new Error("복원한 이차식의 서로 다른 정수 인수 두 개가 없음");
  const [lo, hi] = roots.map((x) => -x).sort((a, b) => a - b) as [
    number,
    number,
  ];
  const result = linear(lo) + linear(hi),
    original = polynomial(1, sum, product);
  // Three coefficient witnesses prove identity; checking just x=0 would not.
  return verification(
    `${p},${q};${u},${v}`,
    ["expansions", "restored", "factorized"],
    [
      `${wrongLinear},${product};${sum},${wrongConstant}`,
      `${sum},${product};${lo},${hi}`,
      result,
    ],
    [
      [
        `${linear(p) + linear(q)}=${polynomial(1, wrongLinear, product)}`,
        `${linear(u) + linear(v)}=${polynomial(1, sum, wrongConstant)}`,
        `보존된 상수항은 ${product}`,
        `보존된 x의 계수는 ${sum}`,
        `잘못 읽은 x의 계수는 ${wrongLinear}`,
        `잘못 읽은 상수항은 ${wrongConstant}`,
      ],
      [original, `(${lo})+(${hi})=${sum}`, `(${lo})\\times(${hi})=${product}`],
      [
        `${result}=${original}`,
        "x²의 계수 1",
        `x의 계수 ${sum}`,
        `상수항 ${product}`,
        "상수항만 확인하므로 충분하지 않다",
      ],
    ],
    result,
    {
      preserved: `${sum},${product}`,
      firstPair: `${p},${q}`,
      secondPair: `${u},${v}`,
      errors: `${sgn(sum)},${sgn(product)}:${sgn(wrongLinear - sum)},${sgn(wrongConstant - product)}`,
    },
  );
}

export function verifyQuadraticArea(
  printed: NativePrintedProblem,
): NativeVerification {
  const { stem, questions } = text(printed);
  requireText(questions, [
    "두 길이",
    "양수 조건",
    "넓이 공식",
    "대수적인 두 해",
    "버리는 이유",
    "원래 넓이",
    "단위",
  ]);
  const m =
    /^(직사각형|삼각형|평행사변형)의 (세로의 길이|높이)는 x cm이고 (가로|밑변)의 길이는 (x\+\d+|\d+x) cm이다\. 두 길이는 모두 양수이고 넓이는 (\d+) cm²이다\.$/.exec(
      stem,
    );
  if (!m) throw new Error("도형·길이·넓이·양수·단위 조건 불완전");
  const shape = m[1]!,
    variable = m[2]!,
    side = m[3]!,
    other = m[4]!,
    area = Number(m[5]);
  if (
    (shape === "직사각형"
      ? variable !== "세로의 길이" || side !== "가로"
      : variable !== "높이" || side !== "밑변") ||
    area <= 0 ||
    area > 10000
  )
    throw new Error("도형별 길이 또는 양의 넓이 모순");
  const parallel = shape === "평행사변형",
    triangular = shape === "삼각형";
  const r = parallel ? Number(/^(\d+)x$/.exec(other)?.[1]) : 1;
  const k = parallel ? 0 : Number(/^x\+(\d+)$/.exec(other)?.[1]);
  if (
    !Number.isSafeInteger(r) ||
    !Number.isSafeInteger(k) ||
    r <= 0 ||
    (!parallel && k <= 0)
  )
    throw new Error("도형별 길이 관계 불완전");
  const secondLength = (x: number) => r * x + k;
  // Enumerate both algebraic roots against the original doubled-area relation.
  const candidates: number[] = [];
  for (let x = -200; x <= 200; x++)
    if ((triangular ? 1 : 2) * x * secondLength(x) === 2 * area)
      candidates.push(x);
  if (candidates.length !== 2) throw new Error("두 대수적 해를 검산하지 못함");
  const valid = candidates.filter((x) => x > 0 && secondLength(x) > 0);
  if (valid.length !== 1)
    throw new Error("양수인 두 길이의 해가 유일하지 않음");
  const y = valid[0]!,
    negative = candidates.find((x) => x !== y)!;
  if (negative >= 0) throw new Error("배제할 음수 해가 없음");
  const second = secondLength(y);
  const model = parallel
    ? `${r}x^2=${area}`
    : `${triangular ? "\\dfrac{1}{2}" : ""}x(x+${k})=${area}`;
  const equation = parallel
    ? `x^2=${area / r}`
    : `${polynomial(1, k, -(triangular ? 2 : 1) * area)}=0`;
  const factored = `${linear(-y)}${linear(-negative)}=0`;
  const substitution = `${triangular ? "\\dfrac{1}{2}\\times" : ""}${y}\\times${second}=${area}`;
  return verification(
    `${shape};${parallel ? r : k};${area}`,
    ["model", "roots", "length"],
    [model, `${negative},${y}`, String(y)],
    [
      ["x>0", `${other}>0`, model, triangular ? "곱의 절반" : "곱"],
      [equation, factored, `x=${negative}`, `x=${y}`],
      [
        `x=${negative}`,
        "음수 길이이므로 버린다",
        `x=${y}>0`,
        `${other}=${second}>0`,
        substitution,
        "cm²",
        `${y} cm`,
      ],
    ],
    `${y} cm`,
    { shape, combination: `${shape}:${y},${parallel ? r : k}` },
    "cm",
  );
}

export function verifyParabolaTranslation(
  printed: NativePrintedProblem,
): NativeVerification {
  const { stem, questions } = text(printed);
  requireText(questions, [
    "완전제곱식",
    "이동 전 꼭짓점",
    "좌표의 변화",
    "축의 방정식",
    "표준형과 일반형",
    "1 큰 점",
    "대입",
    "a+b-c",
  ]);
  const m =
    /^이차함수 y=([+-]?\d*)x\^2(?:([+-]\d*)x)?([+-]\d+)?의 그래프를 x축 방향으로 (-?\d+)만큼, y축 방향으로 (-?\d+)만큼 평행이동하였다\. 이동 후 식을 y=ax\^2\+bx\+c라 한다\.$/.exec(
      stem,
    );
  if (!m) throw new Error("이차식·이동량·단위 인쇄 조건 불완전");
  const coefficient = (s: string) =>
    s === "" || s === "+" ? 1 : s === "-" ? -1 : Number(s);
  const a = coefficient(m[1]!),
    b0 = m[2] === undefined ? 0 : coefficient(m[2]),
    c0 = Number(m[3] ?? 0);
  const mx = Number(m[4]),
    my = Number(m[5]);
  if (
    a === 0 ||
    Math.abs(a) > 4 ||
    Math.abs(b0) > 32 ||
    Math.abs(c0) > 60 ||
    mx === 0 ||
    Math.abs(mx) > 4 ||
    my === 0 ||
    Math.abs(my) > 5
  )
    throw new Error("이차함수 인쇄 범위 오류");
  const f = (x: number) => a * x * x + b0 * x + c0;
  // Find the symmetry centre from equal heights, rather than using the author's formula.
  const centres = Array.from({ length: 17 }, (_, i) => i - 8).filter(
    (x) => f(x - 1) === f(x + 1),
  );
  if (centres.length !== 1)
    throw new Error("원 꼭짓점을 유일하게 복원하지 못함");
  const p = centres[0]!,
    q = f(p),
    p2 = p + mx,
    q2 = q + my;
  if (p2 === 0) throw new Error("허용 밖 꼭짓점 이동");
  const g = (x: number) => f(x - mx) + my;
  const c = g(0),
    b = (g(1) - g(-1)) / 2,
    leading = (g(1) + g(-1) - 2 * c) / 2;
  if (leading !== a || g(p2) !== q2 || g(p2 - 1) !== g(p2 + 1))
    throw new Error("이동한 함수의 대칭/좌표 조건 모순");
  const ans = a + b - c,
    compensation = a * p * p;
  return verification(
    `${a},${b0},${c0};${mx},${my}`,
    ["vertex", "translated", "coefficient"],
    [`${p},${q}`, `${p2},${q2};${a},${b},${c}`, String(ans)],
    [
      [
        `${a}(x^2${plus(-2 * p)}x+${p * p})${plus(c0 - compensation)}`,
        vertexForm(a, p, q),
        `더한 ${compensation}의 보정`,
        `(${c0})-(${compensation})=${q}`,
        `(${p},${q})`,
      ],
      [
        `(${p})+(${mx})=${p2}`,
        `(${q})+(${my})=${q2}`,
        `(${p2},${q2})`,
        `x=${p2}`,
        `${vertexForm(a, p2, q2)}=${polynomial(a, b, c)}`,
      ],
      [
        `g(${p2})=${a}\\times0^2+(${q2})=${g(p2)}`,
        `g(${p2 + 1})=${a}\\times1^2+(${q2})=${g(p2 + 1)}`,
        `a=${a}`,
        `b=${b}`,
        `c=${c}`,
        `a+b-c=(${a})+(${b})-(${c})=${ans}`,
      ],
    ],
    String(ans),
    {
      curvatureVertex: `${a},${p}`,
      curvatureHeight: `${a},${q}`,
      shifts: `${mx},${my}`,
      horizontal: `${p},${mx}`,
      vertical: `${q},${my}`,
      branches: `${sgn(a)},${sgn(mx)},${sgn(my)}:${sgn(p2)},${sgn(q2)}`,
      sourceConstant: String(c0),
      targetConstant: String(c),
    },
  );
}
