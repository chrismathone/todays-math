/**
 * 중1 확장 유형(`m1Types10.ts`) — **소단원 넷을 10유형으로 올린 몫**을 지킨다.
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `EXT_VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `90` 좌변·우변 | 계수를 골라 찍는다 | 찍힌 등식을 파싱해 다시 읽는다 |
 * | `91` 항등식 | $a,b$ 를 골라 $S,T$ 를 만든다 | $S,T$ 에서 **연립방정식을 푼다** |
 * | `92` 해의 합 | 해를 골라 상수항을 역산한다 | 상수항을 **나누어** 해를 구한다 |
 * | `93` 곱하는 수 | 두 분모의 최소공배수 | $k=1$ 부터 **훑어** 가장 작은 것을 찾는다 |
 * | 좌표 `90` | 좌표의 차 | **`hypot`** 으로 실제 길이를 잰다 |
 * | 좌표 `91` | 「x는 C 것, y는 A 것」 | **$D=A+C-B$** (평행사변형) + 직각 확인 |
 * | 구 `90` | $r$ 에서 겉넓이·부피를 만든다 | 주어진 값에서 $r$ 을 **훑어 찾는다** |
 * | 구 `91` | 반지름 비의 세제곱 | $\pi$ 를 넣어 **부피를 실제로 계산**해 나눈다 |
 *
 * 검산기는 값을 낼 뿐 아니라 **불변식을 어기면 던진다**(선분이 축에 안 나란하다 ·
 * 네 점이 직사각형이 아니다 · 해가 정수가 아니다 · $r$ 이 둘 이상이다). 그래야
 * 「답만 맞고 지면이 거짓말하는」 자리가 걸린다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 그 물음에 답하지 못하면 「0건」이 「깨끗」인지 「못 셈」인지 안 갈린다(2026-08-21).
 * 그래서 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 —
 * 양성(`CALIBRATION`: 답을 아는 지면에서 그 답을 낸다)과
 * 음성(`REJECTS`: 모양이 어긋나거나 불변식을 어긴 지면은 **던진다**) 둘 다.
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다.**
 */
import { describe, expect, it } from "vitest";

import { defaultRatioFor } from "@/contracts/difficulty";
import { bareNumbers } from "@/lib/elementary/rules";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import {
  selectProblems,
  type SelectableProblem,
} from "@/lib/generator/selectProblems";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
  typesForSection,
} from "@/lib/middle/generate";
import { M1_TYPES_10 } from "@/lib/middle/m1Types10";

import { josaMismatches, pageSmells } from "../helpers/midPage";

const SEEDS = [20260829, 1, 7, 424242, 99991];
const VARIANTS = 4;

/** 답에서 처음 나오는 수 — 제네릭 가드가 `facts.x` 와 견주는 그 값. */
function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (m === null) throw new Error(`답에 수가 없다: ${text}`);
  return Number(m[0]);
}

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, content: string, who: string): string[] {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${content}`);
  return m.slice(1);
}

const num = (s: string): number => Number(s);

/** 정수여야 하는 자리 — 아니면 던진다. */
function requireInt(v: number, who: string): number {
  if (!Number.isInteger(v)) throw new Error(`${who}: 정수가 아니다 (${v})`);
  return v;
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 *
 * 값 검산도 냄새 자도 이 축을 못 본다: 없는 명령(`\notacommand`)이나 날 LaTeX 는
 * **값이 맞고 냄새 목록에도 없다.** 판정을 명령 목록으로 하지 않고 **화면과 같은
 * 방식으로 렌더해서** 한다 — 목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다.
 *
 * ⚠️ KaTeX 0.16 은 unknown command 를 `.katex-error` 가 아니라 `color:#cc0000` 인
 *    `.mord.text` 로 그린다. 클래스만 보면 붉은 날 명령이 그대로 나간다.
 */
function brokenRender(text: string): boolean {
  const html = renderMathHtml(text);
  return (
    html.includes("katex-error") ||
    html.includes("#cc0000") ||
    html.includes("math-raw")
  );
}

// ── 검산기 — 인자는 `content` 하나뿐이다 ────────────────────────

const K90 = "1-1|일차방정식의 풀이|90";
const K91 = "1-1|일차방정식의 풀이|91";
const K92 = "1-1|일차방정식의 풀이|92";
const K93 = "1-1|일차방정식의 풀이|93";
const C90 = "1-1|좌표와 그래프|90";
const C91 = "1-1|좌표와 그래프|91";
const S90 = "1-2|입체도형의 겉넓이와 부피|90";
const S91 = "1-2|입체도형의 겉넓이와 부피|91";

const EXT_VERIFY: Record<string, (content: string) => number[]> = {
  // 90 — 찍힌 등식을 파싱해 「좌변의 x 계수」와 「우변의 상수항」을 다시 읽는다.
  [K90]: (content) => {
    const [p, , , n] = grab(
      /등식 \$(-?\d+)x([+-]\d+)=(-?\d+)x([+-]\d+)\$에서 좌변의 \$x\$의 계수를 \$a\$, 우변의 상수항을 \$b\$라 할 때/,
      content,
      "90",
    );
    return [num(p!) + num(n!)];
  },

  // 91 — 생성기는 $a,b$ 에서 $S,T$ 를 만들었다. 여기는 **거꾸로 연립을 푼다.**
  //      그러고 나서 여러 점에서 항등식이 실제로 성립하는지 확인한다.
  [K91]: (content) => {
    const [u, v, s, t] = grab(
      /등식 \$a\\left\(x([+-]\d+)\\right\)\+b\\left\(x([+-]\d+)\\right\)=(-?\d+)x([+-]\d+)\$[이가] \$x\$에 대한 항등식일 때/,
      content,
      "91",
    );
    const U = num(u!);
    const V = num(v!);
    const S = num(s!);
    const T = num(t!);
    if (U === V) throw new Error("91: 두 괄호가 같아 a, b 가 안 정해진다");
    const a = requireInt((T - S * V) / (U - V), "91 a");
    const b = requireInt(S - a, "91 b");
    for (const x of [-3, 0, 2, 11]) {
      if (a * (x + U) + b * (x + V) !== S * x + T) {
        throw new Error(`91: x=${x} 에서 항등식이 아니다`);
      }
    }
    return [a * b];
  },

  // 92 — 생성기는 해에서 상수항을 만들었다. 여기는 **나누어** 해를 구하고,
  //      구한 해를 찍힌 등식에 **대입해** 좌우가 같은지 본다.
  [K92]: (content) => {
    const g = grab(
      /두 일차방정식 \$(-?\d+)x([+-]\d+)=(-?\d+)x([+-]\d+)\$, \$(-?\d+)x([+-]\d+)=(-?\d+)x([+-]\d+)\$의 해를 각각 \$a\$, \$b\$라 할 때/,
      content,
      "92",
    ).map(num);
    const roots: number[] = [];
    for (const off of [0, 4]) {
      const [p, q, m, n] = [g[off]!, g[off + 1]!, g[off + 2]!, g[off + 3]!];
      if (p === m) throw new Error("92: 양변의 x 계수가 같아 해가 없다");
      const r = requireInt((n - q) / (p - m), "92 해");
      if (p * r + q !== m * r + n) throw new Error("92: 해를 대입하니 다르다");
      roots.push(r);
    }
    return [roots[0]! + roots[1]!];
  },

  // 93 — 최소공배수를 **안 쓴다.** $k=1$ 부터 올려 가며 모든 계수가 정수가 되는
  //      첫 $k$ 를 찾는다. 그래야 「가장 작은」까지 같이 확인된다.
  [K93]: (content) => {
    const [u, m, sign, a, v, n, c] = grab(
      /일차방정식 \$\\dfrac\{x([+-]\d+)\}\{(\d+)\}([+-])\\dfrac\{(\d+)x([+-]\d+)\}\{(\d+)\}=(-?\d+)\$의 계수를 모두 정수로 고치기 위하여/,
      content,
      "93",
    );
    const U = num(u!);
    const M = num(m!);
    const s = sign === "+" ? 1 : -1;
    const A = num(a!);
    const V = num(v!);
    const N = num(n!);
    const C = num(c!);
    for (let k = 1; k <= 5000; k += 1) {
      const parts = [
        k / M,
        (k * U) / M,
        (s * k * A) / N,
        (s * k * V) / N,
        k * C,
      ];
      if (parts.every((x) => Number.isInteger(x))) {
        if (k / M + (s * k * A) / N === 0) {
          throw new Error(
            "93: 정수로 고치면 x 가 사라진다 — 일차방정식이 아니다",
          );
        }
        return [k];
      }
    }
    throw new Error("93: 5000 이하에 곱할 수가 없다");
  },

  // 좌표 90 — 좌표의 차가 아니라 **실제 길이**를 잰다. 축에 안 나란하면 던진다.
  [C90]: (content) => {
    const [ax, ay, bx, by] = grab(
      /두 점 \$\\mathrm\{A\}\((-?\d+), (-?\d+)\)\$, \$\\mathrm\{B\}\((-?\d+), (-?\d+)\)\$에 대하여 선분 \$\\mathrm\{AB\}\$의 길이를/,
      content,
      "좌표 90",
    ).map(num);
    const sameX = ax === bx;
    const sameY = ay === by;
    if (sameX === sameY) {
      throw new Error("좌표 90: 두 점이 겹치거나 축에 나란하지 않다");
    }
    return [requireInt(Math.hypot(bx! - ax!, by! - ay!), "좌표 90 길이")];
  },

  // 좌표 91 — **평행사변형 규칙** $D=A+C-B$ 로 넷째 점을 구하고, 직각과
  //           축 나란함을 따로 확인한다. 「x 는 C 것, y 는 A 것」을 안 옮겨 적는다.
  [C91]: (content) => {
    const [ax, ay, bx, by, cx, cy] = grab(
      /세 점 \$\\mathrm\{A\}\((-?\d+), (-?\d+)\)\$, \$\\mathrm\{B\}\((-?\d+), (-?\d+)\)\$, \$\\mathrm\{C\}\((-?\d+), (-?\d+)\)\$(?:와|과) 점 \$\\mathrm\{D\}\$를 꼭짓점으로 하는 사각형/,
      content,
      "좌표 91",
    ).map(num);
    const dx = ax! + cx! - bx!;
    const dy = ay! + cy! - by!;
    // 두 변이 직각으로 만나는가 — 벡터 BA 와 BC 의 내적.
    if ((ax! - bx!) * (cx! - bx!) + (ay! - by!) * (cy! - by!) !== 0) {
      throw new Error("좌표 91: 세 점이 직각을 이루지 않는다");
    }
    // 각 변이 좌표축에 평행한가.
    const axisParallel = (
      p: readonly [number, number],
      q: readonly [number, number],
    ): boolean => p[0] === q[0] || p[1] === q[1];
    const A = [ax!, ay!] as const;
    const B = [bx!, by!] as const;
    const C = [cx!, cy!] as const;
    const D = [dx, dy] as const;
    if (!axisParallel(A, B) || !axisParallel(B, C)) {
      throw new Error("좌표 91: 변이 좌표축에 평행하지 않다");
    }
    const corners = [A, B, C, D].map((p) => `${p[0]},${p[1]}`);
    if (new Set(corners).size !== 4) {
      throw new Error("좌표 91: 꼭짓점이 겹친다 — 직사각형이 아니다");
    }
    return [dx, dy];
  },

  // 구 90 — 공식을 되풀이하지 않고 **반지름을 훑어 찾는다.** 후보가 둘이면 던진다.
  [S90]: (content) => {
    const area =
      /겉넓이가 \$(\d+)\\pi\\,\\mathrm\{cm\}\^2\$인 구의 지름의 길이를/.exec(
        content,
      );
    const vol =
      /부피가 \$(\d+)\\pi\\,\\mathrm\{cm\}\^3\$인 구의 지름의 길이를/.exec(
        content,
      );
    if ((area === null) === (vol === null)) {
      throw new Error(`구 90: 지면 모양이 다르다 — ${content}`);
    }
    const given = num((area ?? vol)![1]!);
    const hits: number[] = [];
    for (let r = 1; r <= 200; r += 1) {
      const ok =
        area !== null ? 4 * r * r === given : 4 * r * r * r === 3 * given;
      if (ok) hits.push(r);
    }
    if (hits.length !== 1) {
      throw new Error(`구 90: 반지름 후보가 ${hits.length}개다 (${given})`);
    }
    return [2 * hits[0]!];
  },

  // 구 91 — 세제곱의 비를 안 쓴다. $\pi$ 를 넣어 **부피를 실제로 계산**해 나눈다.
  [S91]: (content) => {
    const [big, small] = grab(
      /반지름의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 쇠구슬을 녹여 반지름의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$인 쇠구슬을 만들려고 한다/,
      content,
      "구 91",
    ).map(num);
    if (!(big! > small!)) throw new Error("구 91: 큰 구가 작은 구보다 작다");
    const volume = (r: number): number => ((4 * Math.PI) / 3) * r ** 3;
    const ratio = volume(big!) / volume(small!);
    const count = Math.floor(ratio + 1e-9);
    if (Math.abs(ratio - count) > 1e-9) {
      throw new Error("구 91: 부피가 나누어떨어지지 않는다");
    }
    if (count < 2) throw new Error("구 91: 만들 수 있는 개수가 하나뿐이다");
    return [count];
  },
};

/** 검산기가 낸 수가 `facts` 의 어느 자리와 짝인가 (기본은 답 하나). */
const EXT_FACT_KEYS: Record<string, readonly string[]> = {
  [C91]: ["x", "y"],
};

/** 등록할 때 적은 난이도 — 사다리를 조용히 옮기면 여기서 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K90]: "연산",
  [K91]: "심화하",
  [K92]: "기본",
  [K93]: "기본",
  [C90]: "연산",
  [C91]: "기본",
  [S90]: "기본",
  [S91]: "응용",
};

/** 이 회차가 채운 소단원 넷. */
const SECTIONS = [
  "방정식과 그 해",
  "일차방정식의 풀이",
  "순서쌍과 좌표평면(응용)",
  "구의 겉넓이와 부피",
] as const;

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ─────────────────────

/** 양성 대조군 — 답을 아는 지면. 검산기가 그 답을 다시 내야 한다. */
const CALIBRATION: readonly { key: string; page: string; want: number[] }[] = [
  {
    key: K90,
    page: "등식 $5x+3=-2x-7$에서 좌변의 $x$의 계수를 $a$, 우변의 상수항을 $b$라 할 때, $a+b$의 값을 구하시오.",
    want: [-2], // 5 + (-7)
  },
  {
    key: K91,
    // a=2, b=3 → (a+b)x + (2·4 + 3·(-1)) = 5x+5
    page: "등식 $a\\left(x+4\\right)+b\\left(x-1\\right)=5x+5$가 $x$에 대한 항등식일 때, 상수 $a$, $b$에 대하여 $ab$의 값을 구하시오.",
    want: [6],
  },
  {
    key: K92,
    // 3x-1=-2x+19 → 5x=20 → 4 ; 4x+7=2x-3 → 2x=-10 → -5
    page: "두 일차방정식 $3x-1=-2x+19$, $4x+7=2x-3$의 해를 각각 $a$, $b$라 할 때, $a+b$의 값을 구하시오.",
    want: [-1],
  },
  {
    key: K93,
    // 분모 4·6 → 12. 분자 계수 5 는 6 과 서로소라 12 보다 작은 수로는 안 된다.
    page: "일차방정식 $\\dfrac{x+1}{4}-\\dfrac{5x+1}{6}=2$의 계수를 모두 정수로 고치기 위하여 양변에 곱해야 하는 가장 작은 자연수를 구하시오.",
    want: [12],
  },
  {
    key: C90,
    page: "두 점 $\\mathrm{A}(-4, 2)$, $\\mathrm{B}(3, 2)$에 대하여 선분 $\\mathrm{AB}$의 길이를 구하시오.",
    want: [7],
  },
  {
    key: C91,
    page: "세 점 $\\mathrm{A}(-2, 5)$, $\\mathrm{B}(-2, -1)$, $\\mathrm{C}(4, -1)$와 점 $\\mathrm{D}$를 꼭짓점으로 하는 사각형 $\\mathrm{ABCD}$가 각 변이 좌표축에 평행한 직사각형일 때, 점 $\\mathrm{D}$의 좌표를 구하시오.",
    want: [4, 5],
  },
  {
    key: S90,
    page: "겉넓이가 $196\\pi\\,\\mathrm{cm}^2$인 구의 지름의 길이를 구하시오.",
    want: [14],
  },
  {
    key: S91,
    page: "반지름의 길이가 $9\\,\\mathrm{cm}$인 쇠구슬을 녹여 반지름의 길이가 $3\\,\\mathrm{cm}$인 쇠구슬을 만들려고 한다. 만들 수 있는 쇠구슬은 최대 몇 개인지 구하시오.",
    want: [27],
  },
];

/** 음성 대조군 — 어긋난 지면. 검산기가 **던져야** 한다. */
const REJECTS: readonly { key: string; why: string; page: string }[] = [
  { key: K90, why: "모양이 아예 다르다", page: "다음 식을 계산하시오. $2x+1$" },
  {
    key: K91,
    why: "두 괄호가 같아 a, b 가 안 정해진다",
    page: "등식 $a\\left(x+3\\right)+b\\left(x+3\\right)=5x+15$가 $x$에 대한 항등식일 때, 상수 $a$, $b$에 대하여 $ab$의 값을 구하시오.",
  },
  {
    key: K91,
    why: "연립의 해가 정수가 아니다",
    page: "등식 $a\\left(x+4\\right)+b\\left(x-1\\right)=5x+6$가 $x$에 대한 항등식일 때, 상수 $a$, $b$에 대하여 $ab$의 값을 구하시오.",
  },
  {
    key: K92,
    why: "양변의 x 계수가 같아 해가 없다",
    page: "두 일차방정식 $3x-1=3x+19$, $4x+7=2x-3$의 해를 각각 $a$, $b$라 할 때, $a+b$의 값을 구하시오.",
  },
  {
    key: K93,
    why: "정수로 고치면 x 가 사라진다",
    page: "일차방정식 $\\dfrac{x+1}{4}-\\dfrac{3x+1}{12}=2$의 계수를 모두 정수로 고치기 위하여 양변에 곱해야 하는 가장 작은 자연수를 구하시오.",
  },
  {
    key: C90,
    why: "축에 나란하지 않다 — 그런데 발문은 그렇다고 한다",
    page: "두 점 $\\mathrm{A}(-4, 2)$, $\\mathrm{B}(3, 5)$에 대하여 선분 $\\mathrm{AB}$의 길이를 구하시오.",
  },
  {
    key: C91,
    why: "세 점이 직각을 이루지 않는다",
    page: "세 점 $\\mathrm{A}(-2, 5)$, $\\mathrm{B}(-2, -1)$, $\\mathrm{C}(-2, -7)$와 점 $\\mathrm{D}$를 꼭짓점으로 하는 사각형 $\\mathrm{ABCD}$가 각 변이 좌표축에 평행한 직사각형일 때, 점 $\\mathrm{D}$의 좌표를 구하시오.",
  },
  {
    key: S90,
    why: "그 겉넓이를 내는 정수 반지름이 없다",
    page: "겉넓이가 $200\\pi\\,\\mathrm{cm}^2$인 구의 지름의 길이를 구하시오.",
  },
  {
    key: S91,
    why: "부피가 나누어떨어지지 않는다",
    page: "반지름의 길이가 $5\\,\\mathrm{cm}$인 쇠구슬을 녹여 반지름의 길이가 $3\\,\\mathrm{cm}$인 쇠구슬을 만들려고 한다. 만들 수 있는 쇠구슬은 최대 몇 개인지 구하시오.",
  },
];

describe("중1 확장 유형 — 검산기 눈금", () => {
  it("양성 — 손으로 쓴 지면에서 답을 다시 낸다 (facts 를 안 본다)", () => {
    expect(CALIBRATION).toHaveLength(Object.keys(EXT_VERIFY).length);
    for (const { key, page, want } of CALIBRATION) {
      const verify = EXT_VERIFY[key];
      expect(verify, `검산식 없음: ${key}`).toBeDefined();
      expect(verify!(page), `${key} 눈금`).toEqual(want);
    }
  });

  it("음성 — 어긋난 지면은 거부한다 (0 이 「못 셈」이 아님을 보인다)", () => {
    expect(REJECTS.length).toBeGreaterThanOrEqual(
      Object.keys(EXT_VERIFY).length,
    );
    for (const { key, page, why } of REJECTS) {
      expect(() => EXT_VERIFY[key]!(page), `${key} — ${why}`).toThrow();
    }
  });

  it("판정기 눈금 — 조사·냄새 자가 아니오를 낼 수 있다", () => {
    expect(josaMismatches("$41$가")).toEqual(["$…41$가 → 이"]);
    expect(pageSmells("$1x+2$")).toContain("계수 1 을 적었다");
    // 음성 — 옳은 지면을 잡으면 거짓 경보고, 거짓 경보는 가드를 끈다.
    expect(josaMismatches("$41$이")).toEqual([]);
    expect(pageSmells("$-8x-4=9x-1$")).toEqual([]);
  });

  it("판정기 눈금 — 렌더 자가 아니오를 낼 수 있다", () => {
    // 양성 — 없는 명령은 붉게 나간다(`.katex-error` 가 아니라 `#cc0000` 인 판이 있다).
    expect(brokenRender("$\\notacommand{2}$")).toBe(true);
    // 음성 — 이 회차가 실제로 쓰는 모양들은 멀쩡해야 한다.
    for (const ok of [
      "$\\dfrac{x+9}{12}+\\dfrac{5x-2}{9}=-5$",
      "$a\\left(x-4\\right)+b\\left(x-5\\right)=-9x+41$",
      "$\\mathrm{A}(-6, -1)$",
      "$676\\pi\\,\\mathrm{cm}^2$",
    ]) {
      expect(brokenRender(ok), ok).toBe(false);
    }
  });
});

describe("중1 확장 유형 — 값 검산", () => {
  it("확장 유형은 하나도 빠짐없이 검산식을 갖는다", () => {
    expect(M1_TYPES_10.length).toBe(8);
    const missing = M1_TYPES_10.filter((e) => !EXT_VERIFY[e.key]).map(
      (e) => e.key,
    );
    expect(missing, "검산식 없는 확장 유형").toEqual([]);
    // 거꾸로도 — 검산식만 있고 유형이 사라지면 그 줄은 아무것도 안 지킨다.
    const orphan = Object.keys(EXT_VERIFY).filter(
      (k) => !M1_TYPES_10.some((e) => e.key === k),
    );
    expect(orphan, "짝 없는 검산식").toEqual([]);
  });

  for (const e of M1_TYPES_10) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("씨앗·변형마다 지면만 보고 답을 다시 내면 facts 와 같다", () => {
        const verify = EXT_VERIFY[e.key]!;
        const factKeys = EXT_FACT_KEYS[e.key] ?? ["x"];
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            const got = verify(p.content);
            expect(
              got,
              `${e.key} seed ${seed} v${v}: ${p.content} / ${JSON.stringify(p.facts)}`,
            ).toEqual(factKeys.map((k) => p.facts[k]));
          }
        }
      });

      it("답의 첫 수가 facts.x 와 같다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              firstNumber(p.answer),
              `${e.key} seed ${seed} v${v}: 답 ${p.answer} vs ${JSON.stringify(p.facts)}`,
            ).toBe(p.facts.x);
          }
        }
      });

      it("지면 글자 — 조사·냄새·맨숫자가 하나도 없다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const part of [p.content, p.answer, p.solution]) {
              expect(josaMismatches(part), `${e.key} ${part}`).toEqual([]);
              expect(pageSmells(part), `${e.key} ${part}`).toEqual([]);
              expect(bareNumbers(part), `${e.key} ${part}`).toEqual([]);
            }
          }
        }
      });

      it("제품 렌더러로 그리면 붉은 자리도 날 LaTeX 도 없다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const part of [p.content, p.answer, p.solution]) {
              expect(brokenRender(part), `${e.key} ${part}`).toBe(false);
            }
          }
        }
      });

      it("그림이 없고, 발문이 없는 그림을 가리키지 않는다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(p.figureSpec ?? null, `${e.key} 그림 스펙`).toBeNull();
            expect(
              pointsAtFigure(p.content),
              `${e.key} seed ${seed} v${v}: ${p.content}`,
            ).toBeNull();
          }
        }
      });

      it("한 유형에서 6문항을 뽑으면 발문이 전부 다르다", () => {
        const set = generateMiddleSet(e.key, 20260829, 6);
        expect(new Set(set.map((p) => p.content)).size, e.key).toBe(6);
      });

      it("난이도가 등록한 갈래 그대로다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            expect(
              generateMiddleProblem(e.key, seed, v).difficulty,
              `${e.key} seed ${seed} v${v}`,
            ).toBe(EXPECTED_TIER[e.key]);
          }
        }
      });
    });
  }
});

describe("중1 확장 유형 — 소단원이 10유형이 되었는가", () => {
  it("모든 유형이 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((x) => x.key));
    for (const e of M1_TYPES_10) expect(keys.has(e.key), e.key).toBe(true);
  });

  it.each(SECTIONS)("%s 소단원은 서로 다른 유형 10개를 갖는다", (section) => {
    const rows = typesForSection(section);
    expect(rows.length, section).toBeGreaterThanOrEqual(10);
    expect(new Set(rows.map((x) => x.key)).size).toBe(rows.length);
    // 학년 필터 뒤에도 10개여야 한다 — 일일테스트는 한 학년 안에서 뽑는다.
    expect(rows.filter((x) => x.grade === "중1").length).toBeGreaterThanOrEqual(
      10,
    );
  });

  it.each(SECTIONS)("%s 는 제품 선택기로 10문항이 실제로 나온다", (section) => {
    // 제품 함수를 그대로 부른다 — 규칙을 옮겨 적으면 동어반복이 된다.
    const pool: SelectableProblem[] = typesForSection(section).map(
      (entry, i) => {
        const p = generateMiddleProblem(entry.key, 20260829);
        return {
          id: `${entry.key}#${i}`,
          unitId: section,
          difficulty: p.difficulty,
          problemType: entry.rpmTitle,
          directUseAllowed: true,
          familyKey: `mid:${entry.key}`,
          content: p.content,
          figureUrls: [],
          figureDims: [],
        };
      },
    );
    const { problems, shortfall } = selectProblems({
      pool,
      count: 10,
      difficultyRatio: defaultRatioFor(10),
      recentProblemIds: [],
      seed: `mid1-types10-${section}`,
    });
    expect(shortfall, `${section}: ${JSON.stringify(shortfall)}`).toEqual([]);
    expect(problems, section).toHaveLength(10);
    // 한 시험지에 같은 문항류는 하나만 (D-105, 원장님 확정 2026-08-26).
    expect(new Set(problems.map((p) => p.familyKey)).size).toBe(10);
  });
});
