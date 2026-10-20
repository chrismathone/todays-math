/** Independent legacy oracles. Only printed text/figures enter this module. */
import type {
  NativePrintedProblem,
  NativeFact,
} from "../../../contracts/nativeDescriptive.contract";
import type { NativeIndependentVerifier, NativeVerification } from "./types";

const plain = (text: string) =>
  text
    .replace(/\$/g, "")
    .replace(/\\,\\mathrm\{cm\}/g, "cm")
    .replace(/\^\\circ/g, "°")
    .replace(/,\\;/g, ",");
const requireValue = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};
function match(q: string, pattern: RegExp): RegExpExecArray {
  const m = pattern.exec(q);
  if (!m) throw new Error(`인쇄 조건 누락: ${pattern.source}`);
  return m;
}
const fact = (
  factKey: string,
  value: string | number,
  kind: NativeFact["kind"] = "intermediate",
  unit?: string,
): NativeFact => ({
  factKey,
  value: String(value),
  kind,
  ...(unit ? { unit } : {}),
});

function equilateral({ content }: NativePrintedProblem): NativeVerification {
  const q = plain(content);
  const given = match(q, /^(둘레가|한 변이) (\d+)cm/);
  const side = Number(given[2]) / (given[1] === "둘레가" ? 3 : 1);
  const proposed = Number(match(q, /세 변은 각각 (\d+)cm/)[1]);
  const angle = Number(match(q, /세 각은 각각 (\d+)°/)[1]);
  requireValue(
    side > 0 && proposed > 0 && angle > 0 && proposed !== side && angle !== 60,
    "정삼각형 설계 조건 오류",
  );
  return {
    derived: [
      fact("length", side, "intermediate", "cm"),
      fact("angle", 60, "intermediate", "도"),
      fact("check", `${3 * side};180`, "answer"),
    ],
    criterionChecks: [
      {
        criterionId: "length",
        expectedContains: [`각각 ${side} cm`],
        modelContains: [
          `각각 ${side}cm`,
          ...(given[1] === "둘레가" ? [`${side * 3}\\div3=${side}`] : []),
        ],
        answerContains: [`한 변 ${side}cm`],
      },
      {
        criterionId: "angle",
        expectedContains: ["180도", "60도"],
        modelContains: ["180°÷3=60°".replace("÷", "\\div")],
        answerContains: ["한 각 60°"],
      },
      {
        criterionId: "check",
        expectedContains: [`둘레 ${3 * side} cm`, "180도"],
        modelContains: [
          `${side}+${side}+${side}=${3 * side}`,
          "60°+60°+60°=180°",
        ],
        answerContains: [`둘레 ${3 * side}cm`, "각의 합 180°"],
      },
    ],
    coverage: {
      given: given[1]!,
      side: String(side),
      sideError: String(proposed - side),
      proposedAngle: String(angle),
    },
  };
}

function triangle({ content }: NativePrintedProblem): NativeVerification {
  const q = plain(content);
  const a = Number(match(q, /각 A는 (\d+)°/)[1]),
    b = Number(match(q, /각 B와 C는 각각 (\d+)°/)[1]);
  requireValue(
    a > 0 &&
      b > 0 &&
      a + 2 * b === 180 &&
      a !== b &&
      q.includes("변 AB와 AC의 길이가 같고"),
    "삼각형 조건 오류",
  );
  const largest = Math.max(a, b),
    name =
      largest === 90
        ? "직각삼각형"
        : largest > 90
          ? "둔각삼각형"
          : "예각삼각형";
  return {
    derived: [
      fact("sides", "이등변;정삼각형 아님"),
      fact("angles", `${largest};180`),
      fact("impossible", "불가능", "answer"),
    ],
    criterionChecks: [
      {
        criterionId: "sides",
        expectedContains: ["이등변", "정삼각형은 아님"],
        modelContains: ["이등변삼각형", "정삼각형은 아닙니다"],
        answerContains: ["이등변삼각형", "정삼각형은 아님"],
      },
      {
        criterionId: "angles",
        expectedContains: [name, "내각합"],
        modelContains: [`가장 큰 각은 ${largest}°`, name, `${a}+${b}+${b}=180`],
        answerContains: [name],
      },
      {
        criterionId: "impossible",
        expectedContains: ["60도", "90도", "양립 불가"],
        modelContains: ["각이 모두 60°", "90°인 각"],
        answerContains: ["불가능"],
      },
    ],
    coverage: { beta: String(b), largest: String(largest), angleClass: name },
  };
}

function trapezoid({ content }: NativePrintedProblem): NativeVerification {
  const q = plain(content),
    side = Number(match(q, /각각 (\d+)cm/)[1]);
  const parallel = match(q, /가는 (변 AB와 CD|변 AD와 BC)가 평행/)[1]!;
  requireValue(
    side > 0 &&
      q.includes("마주 보는 변 두 쌍 모두 평행하지 않습니다") &&
      q.includes("적어도 한 쌍 평행"),
    "사다리꼴 논리 조건 오류",
  );
  // Independent realizability witness: (0,0),(s,0),(2s,2s),(0,s).
  const pts = [
    [0, 0],
    [side, 0],
    [2 * side, 2 * side],
    [0, side],
  ];
  const vec = (a: number, b: number) => [
    pts[b]![0]! - pts[a]![0]!,
    pts[b]![1]! - pts[a]![1]!,
  ];
  const cross = (a: number[], b: number[]) => a[0]! * b[1]! - a[1]! * b[0]!;
  requireValue(
    cross(vec(0, 1), vec(2, 3)) !== 0 && cross(vec(1, 2), vec(3, 0)) !== 0,
    "반례 구성 실패",
  );
  return {
    // The varying side is given, not a scored intermediate quantity.
    derived: [
      fact("side", side, "given", "cm"),
      fact("classify", "가:참;나:거짓"),
      fact("counterexample", "같은 변 길이로 평행이 보장되지 않음"),
      fact("sufficient", "마주 보는 한 쌍 평행", "answer"),
    ],
    criterionChecks: [
      {
        criterionId: "classify",
        expectedContains: ["가의 평행 한 쌍", "나의 평행 0쌍"],
        modelContains: [parallel, "사다리꼴이 아닙니다"],
        answerContains: ["가는 사다리꼴", "나는 사다리꼴이 아님"],
      },
      {
        criterionId: "counterexample",
        expectedContains: ["가정을 만족", "결론은 만족하지 않음"],
        modelContains: [`${side}cm인 두 변`, "반박하는 반례"],
        answerContains: ["반례"],
      },
      {
        criterionId: "sufficient",
        expectedContains: ["마주 보는 변 한 쌍이 평행"],
        modelContains: [
          "변 AB와 CD가 평행",
          "두 쌍이 모두 평행할 필요는 없습니다",
        ],
        answerContains: ["마주 보는 변 한 쌍이 평행하면 충분"],
      },
    ],
    coverage: { side: String(side), parallel },
  };
}

function factorError({ content }: NativePrintedProblem): NativeVerification {
  const q = plain(content),
    poly = match(q, /다항식 (x\^2([+-])(\d+)x\+(\d+))의/);
  const linear = Number(`${poly[2]}${poly[3]}`),
    constant = Number(poly[4]);
  const pairs: [number, number][] = [];
  for (let a = -100; a <= 100; a++) {
    if (a === 0 || constant % a !== 0) continue;
    const b = constant / a;
    if (b >= a && b <= 100 && a + b === linear) pairs.push([a, b]);
  }
  requireValue(pairs.length === 1, "정수 인수쌍이 유일하지 않음");
  const roots = pairs[0]!.sort((a, b) => Math.abs(a) - Math.abs(b));
  const f = (v: number) => `(x${v >= 0 ? "+" : ""}${v})`,
    correct = roots.map(f).join("");
  const wrong = match(q, /인수분해를 \(x([+-]\d+)\)\(x([+-]\d+)\)/),
    wl = Number(wrong[1]) + Number(wrong[2]),
    wc = Number(wrong[1]) * Number(wrong[2]);
  requireValue(wl !== linear && wc !== constant, "진단 대상 오류가 없음");
  const expansion = `x^2${wl >= 0 ? "+" : "-"}${Math.abs(wl) === 1 ? "" : Math.abs(wl)}x${wc >= 0 ? "+" : ""}${wc}`;
  const x = Number(match(q, /\(3\) x=(\d+)/)[1]);
  const value = x * x + linear * x + constant;
  // Degree-two polynomial identity tested on more than two distinct points.
  for (let n = -3; n <= 3; n++)
    requireValue(
      (n + roots[0]!) * (n + roots[1]!) === n * n + linear * n + constant,
      "인수 검산 실패",
    );
  return {
    derived: [
      fact("diagnose", expansion),
      fact("repair", correct),
      fact("verify", value, "answer"),
    ],
    criterionChecks: [
      {
        criterionId: "diagnose",
        expectedContains: ["일차항·상수항 불일치"],
        modelContains: [expansion, "일차항과 상수항이 원래 식과 다릅니다"],
        answerContains: ["일차항과 상수항이 다름"],
      },
      {
        criterionId: "repair",
        expectedContains: [correct],
        modelContains: [correct, poly[1]!],
        answerContains: [correct],
      },
      {
        criterionId: "verify",
        expectedContains: [`대입값 ${value}`, "한계"],
        modelContains: [`모두 ${value}`, "대입 한 번은 확인일 뿐"],
        answerContains: [
          `대입값 ${value}`,
          "한 값의 일치만으로 항등식 증명은 불가",
        ],
      },
    ],
    coverage: {
      a: String(Math.abs(roots[0]!)),
      gap: String(Math.abs(roots[1]!) - Math.abs(roots[0]!)),
      sign: poly[2]!,
      check: String(x),
    },
  };
}

function rectangle({ content }: NativePrintedProblem): NativeVerification {
  const q = plain(content),
    delta = Number(match(q, /세로보다 (\d+)cm/)[1]),
    area = Number(match(q, /넓이는 (\d+)cm\^2/)[1]);
  requireValue(
    delta > 0 && area > 0 && q.includes("세로를 xcm"),
    "길이·넓이 단위 조건 오류",
  );
  const roots: number[] = [];
  for (let x = -area; x <= area; x++)
    if (x * (x + delta) === area) roots.push(x);
  requireValue(
    roots.length === 2 &&
      roots.filter((x) => x > 0 && x + delta > 0).length === 1,
    "두 해/길이 조건 오류",
  );
  const w = roots.find((x) => x > 0)!,
    l = w + delta;
  return {
    derived: [
      fact("model", `x(x+${delta})=${area}`),
      fact("roots", `${w},-${l}`),
      fact("check", `${w},${l}`, "answer", "cm"),
    ],
    criterionChecks: [
      {
        criterionId: "model",
        expectedContains: [`x+${delta}`, `x(x+${delta})=${area}`, "x>0"],
        modelContains: [`x(x+${delta})=${area}`, "x>0"],
      },
      {
        criterionId: "roots",
        expectedContains: [`${w}, -${l}`, "음수 제외"],
        modelContains: [`x=${w}`, `x=-${l}`, "음수 해는 길이의 조건"],
        answerContains: [`${w}`, `-${l}`, "음수 해 제외"],
      },
      {
        criterionId: "check",
        expectedContains: ["가로·세로", "차와 곱"],
        modelContains: [`${l}-${w}=${delta}`, `${w}\\times${l}=${area}`],
        answerContains: [`세로 ${w}cm`, `가로 ${l}cm`],
      },
    ],
    coverage: {
      width: String(w),
      delta: String(delta),
      object: q.includes("사진 판") ? "사진 판" : "종이",
    },
  };
}

function statistics({ content }: NativePrintedProblem): NativeVerification {
  const q = plain(content);
  const groups = ["원래 자료는", "더한", "수정안 B는"].map((s) =>
    match(q.slice(q.indexOf(s) + s.length), /^ ([-\d,]+)/)[1]!
      .replace(/,$/, "")
      .split(",")
      .map(Number),
  );
  requireValue(
    [4, 5].includes(groups[0]!.length) &&
      groups.every(
        (xs) =>
          xs.length === groups[0]!.length && xs.every(Number.isSafeInteger),
      ),
    "자료 목록/단위 오류",
  );
  const statedShift = Number(match(q, /각 값에 (-?\d+)(?:을|를) 더한/)[1]);
  requireValue(
    q.includes("분산은 편차의 제곱의 평균으로 계산합니다."),
    "모분산 정의 누락/변경",
  );
  const summary = (xs: number[]) => {
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    let pairSquares = 0;
    for (const a of xs) for (const b of xs) pairSquares += (a - b) ** 2;
    return [mean, pairSquares / (2 * xs.length ** 2)];
  };
  const [o, a, b] = groups.map(summary),
    shift = a![0]! - o![0]!;
  requireValue(
    shift > 0 &&
      shift === statedShift &&
      a![1] === o![1] &&
      b![0] === o![0] &&
      b![1] === 4 * o![1]! &&
      groups[0]!.every((x, i) => groups[1]![i]! - x === shift),
    "이동/산포 조건 오류",
  );
  return {
    derived: [
      fact("means", `${o![0]},${a![0]},${b![0]}`),
      fact("spread", `${o![1]},${a![1]},${b![1]}`),
      fact("judge", "A;거짓", "answer"),
    ],
    criterionChecks: [
      {
        criterionId: "means",
        expectedContains: [`${o![0]}, ${a![0]}, ${b![0]}`],
        modelContains: [`평균은 ${o![0]}`, `커져 ${a![0]}`],
        answerContains: [
          `원래: 평균 ${o![0]}`,
          `A: 평균 ${a![0]}`,
          `B: 평균 ${b![0]}`,
        ],
      },
      {
        criterionId: "spread",
        expectedContains: [`${o![1]}, ${a![1]}, ${b![1]}`],
        modelContains: [`분산은 ${o![1]}`, `4\\times${o![1]}=${b![1]}`],
        answerContains: [`분산 ${o![1]}`, `분산 ${b![1]}`],
      },
      {
        criterionId: "judge",
        expectedContains: ["A 선택", "반례"],
        modelContains: ["분산이 작은 A", "평균은 커져도 분산은 같으므로"],
        answerContains: ["A 선택", "주장은 거짓"],
      },
    ],
    coverage: {
      center: String(o![0]),
      step: String(groups[0]![1]! - groups[0]![0]!),
      shift: String(shift),
      count: String(groups[0]!.length),
    },
  };
}

export const legacyNativeVerifiers: Readonly<
  Record<string, NativeIndependentVerifier>
> = {
  "e4-equilateral-audit-r1": equilateral,
  "e4-triangle-dual-proof-r1": triangle,
  "e4-trapezoid-sufficiency-r1": trapezoid,
  "m3-factor-error-proof-r1": factorError,
  "m3-quadratic-domain-r1": rectangle,
  "m3-statistics-shift-spread-r1": statistics,
};
