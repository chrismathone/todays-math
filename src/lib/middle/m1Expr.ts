/**
 * 중1 「문자의 사용과 식의 계산」 16유형 + 「일차방정식의 풀이」 17유형 = **33유형**
 * — 물결 3B 세션 «3B-식방정식» 소유 파일 (`docs/planning/tracks/middle-engine-wave3-plan.md` §3).
 *
 * 이웃 모듈과 **한 벌**로 맞췄다: 발문 말투·해설 형식·`facts` 계약은 본보기
 * `m1LinearApply.ts`(일차방정식의 활용 22유형)와 `m1Book1.ts`(같은 두 중단원에
 * 이미 등록된 다섯 — 문자 09·10·12·13, 일차방정식 05)를 그대로 따른다.
 * 그 다섯은 **여기서 다시 내지 않는다** — 유형 키가 겹치면 `generate.ts` 가 던진다.
 *
 * ## 생성 규칙 — 정답을 먼저 뽑고 발문을 역산한다
 *
 * 모든 생성기는 **정답(또는 방정식의 해)을 먼저** 뽑고, 그 답이 나오도록 발문의
 * 수치를 역산한다. 그래서 해는 항상 정수이고 계산 결과의 계수도 정수다.
 * `facts` 에는 **발문의 원 수치**를 남긴다 — 테스트가 그것으로 조건을 다시 세운다.
 *
 * ## 독립 검산이 무엇을 쓰는가 (생성기와 다른 길)
 *
 * 생성기는 **계수 산술**로 답을 만든다. 시험은 반대로 **대입해서 값을 잰다** —
 * 발문·정답에 실제로 찍힌 LaTeX 를 작은 계산기로 파싱해 수를 넣어 본다
 * (`middleM1Expr.test.ts` 의 `evalTex`). 그래서
 *  - 방정식은 **해를 대입**해 좌변=우변을 확인하고(3B 브리프 지시),
 *  - 계산식은 표본 $x$ 여럿에서 **발문의 식과 정답의 식이 같은 값**인지 보고,
 *  - 항등식·등식의 성질·일차방정식 판별은 **여러 점에서 재어** 판정한다.
 * 계수 산술을 옮겨 적지 않으므로 동어반복이 아니다.
 *
 * ## 이 파일이 안 낸 것 (보류)
 *  - 문자의 사용과 식의 계산 09·10·12·13, 일차방정식의 풀이 05 → `m1Book1.ts` 몫.
 *  - RPM 19(도형에서의 활용)는 원본이 그림 문항이지만 **치수를 글로 적을 수 있는**
 *    직사각형·삼각형만 낸다. 「꽃밭 사이의 길」처럼 배치가 그림에만 있는 것은 안 낸다
 *    (FigureSpec v2 실증 목록에 없는 도형을 지어내지 않는다 — 브리프 계약 9).
 *
 * 숫자는 전부 `$...$` 안에 쓴다 (초등 `rules.bareNumbers` 가드와 같은 규칙).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중1";
const BOOK = "1-1";
const MINOR_EXPR = "문자의 사용과 식의 계산";
const MINOR_EQ = "일차방정식의 풀이";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 중1 「3. 방정식」 실측) */
const SEC = {
  식의값: "문자의 사용과 식의 값",
  일차2: "일차식의 뜻Ⅱ",
  방정식해: "방정식과 그 해",
  등식성질: "등식의 성질",
  일차방정식: "일차방정식의 풀이",
  해응용: "일차방정식의 활용(해의 응용)",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts">;

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 소품 ────────────────────────────────────────────────────

/** 부호 붙여 이어붙이기 — `+3` / `-3`. */
function signed(n: number): string {
  return n < 0 ? `-${-n}` : `+${n}`;
}

function intNonzero(rng: Rng, lo: number, hi: number): number {
  return attempt(120, () => {
    const v = intBetween(rng, lo, hi);
    return v === 0 ? null : v;
  });
}

/** 결정적 셔플(Fisher–Yates) — 씨앗이 같으면 순서도 같다. */
function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

/** `ax+b` 몸통 — 0항 생략, 계수 ±1 처리. `$` 는 밖에서 감싼다. */
function lin(a: number, b: number, v = "x"): string {
  const parts: string[] = [];
  if (a !== 0) {
    const abs = Math.abs(a);
    parts.push(`${a < 0 ? "-" : ""}${abs === 1 ? "" : abs}${v}`);
  }
  if (b !== 0 || parts.length === 0) {
    parts.push(parts.length === 0 ? String(b) : signed(b));
  }
  return parts.join("");
}

function equalityPropertySupplement(
  rpmType: string,
  rpmTitle: string,
  mode: number,
): TypeEntry {
  return def(
    MINOR_EQ,
    rpmType,
    rpmTitle,
    SEC.등식성질,
    mode < 4 ? "기본" : "응용",
    (rng) => {
      const x = intBetween(rng, 2, 9);
      const a = intBetween(rng, 2, 7);
      const b = intBetween(rng, 2, 9);
      const c = intBetween(rng, 2, 6);
      if (mode === 0) {
        return {
          content: `등식 $${a}x=${a * x}$의 양변에 $${b}$를 더하여 얻은 등식을 쓰시오.`,
          answer: `$${a}x+${b}=${a * x + b}$`,
          solution: `등식의 양변에 같은 수를 더해도 등식은 성립하므로 $${a}x+${b}=${a * x}+${b}$, 즉 $${a}x+${b}=${a * x + b}$이다.`,
          facts: { mode, x, a, b, c },
        };
      }
      if (mode === 1) {
        return {
          content: `등식 $${a}x+${b}=${a * x + b}$의 양변에서 $${b}$를 빼어 얻은 등식을 쓰시오.`,
          answer: `$${a}x=${a * x}$`,
          solution: `등식의 양변에서 같은 수를 빼도 등식은 성립한다. 따라서 $${a}x+${b}-${b}=${a * x + b}-${b}$에서 $${a}x=${a * x}$이다.`,
          facts: { mode, x, a, b, c },
        };
      }
      if (mode === 2) {
        return {
          content: `등식 $x=${x}$의 양변에 $${a}$를 곱하여 얻은 등식을 쓰시오.`,
          answer: `$${a}x=${a * x}$`,
          solution: `등식의 양변에 같은 수를 곱해도 등식은 성립하므로 $${a}x=${a}\\times${x}=${a * x}$이다.`,
          facts: { mode, x, a, b, c },
        };
      }
      if (mode === 3) {
        return {
          content: `등식 $${a}x=${a * x}$의 양변을 $${a}$로 나누어 얻은 등식을 쓰시오.`,
          answer: `$x=${x}$`,
          solution: `$${a}\ne0$이므로 등식의 양변을 $${a}$로 나누어도 등식은 성립한다. 따라서 $x=${x}$이다.`,
          facts: { mode, x, a, b, c },
        };
      }
      if (mode === 4) {
        return {
          content: `등식 $${a}x+${b}=${a * x + b}$의 양변에서 $${b}$를 뺀 뒤 양변을 $${a}$로 나누어 얻은 $x$의 값을 구하시오.`,
          answer: `$${x}$`,
          solution: `양변에서 $${b}$를 빼면 $${a}x=${a * x}$이고, 양변을 $${a}$로 나누면 $x=${x}$이다.`,
          facts: { mode, x, a, b, c },
        };
      }
      if (mode === 5) {
        const right = c * (a * x + b);
        return {
          content: `등식 $${a}x+${b}=${a * x + b}$의 양변에 같은 수 $k$를 곱하였더니 $${c * a}x+${c * b}=${right}$이 되었다. $k$의 값을 구하시오.`,
          answer: `$${c}$`,
          solution: `$${a}x$의 계수가 $${a}$에서 $${c * a}$로 바뀌었으므로 양변에 곱한 수는 $k=${c}$이다. 상수항도 $${b}\\times${c}=${c * b}$로 조건을 만족한다.`,
          facts: { mode, x, a, b, c },
        };
      }
      const target = a * x + b;
      return {
        content: `등식 $${a}x+${b}=${target}$에서 등식의 성질을 한 번 사용하여 얻을 수 있는 등식 $x=${x}$에서, 양변에 마지막으로 나눈 수를 구하시오.`,
        answer: `$${a}$`,
        solution: `먼저 양변에서 $${b}$를 빼면 $${a}x=${a * x}$이다. 여기서 $x=${x}$를 얻으려면 양변을 $${a}$로 나누어야 한다.`,
        facts: { mode, x, a, b, c },
      };
    },
  );
}

const EQ_PROPERTY_SUPPLEMENTS = [
  equalityPropertySupplement("19", "등식의 양변에 같은 수 더하기", 0),
  equalityPropertySupplement("20", "등식의 양변에서 같은 수 빼기", 1),
  equalityPropertySupplement("21", "등식의 양변에 같은 수 곱하기", 2),
  equalityPropertySupplement("22", "등식의 양변을 같은 수로 나누기", 3),
  equalityPropertySupplement("23", "등식의 성질을 연속하여 이용하기", 4),
  equalityPropertySupplement("24", "등식의 성질에서 곱한 수 구하기", 5),
  equalityPropertySupplement("25", "등식의 성질에서 나눈 수 구하기", 6),
] as const;

function solutionApplicationSupplement(
  rpmType: string,
  rpmTitle: string,
  mode: number,
): TypeEntry {
  return def(
    MINOR_EQ,
    rpmType,
    rpmTitle,
    SEC.해응용,
    mode < 2 ? "응용" : "심화",
    (rng): Body => {
      const r = intBetween(rng, 2, 9);
      const p = intBetween(rng, 2, 6);
      const q = intBetween(rng, 2, 7);
      const a = p * r + q;
      if (mode === 0) {
        return {
          content: `방정식 $${p}x+a=${a + p * r}$의 해가 $x=${r}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a}$`,
          solution: `$x=${r}$을 대입하면 $${p}\\times${r}+a=${a + p * r}$이므로 $a=${a}$이다.`,
          facts: { mode, r, p, q, a },
        };
      }
      if (mode === 1) {
        const b = q * r - p;
        return {
          content: `두 방정식 $${p}x=${p * r}$, $${q}x-b=${p}$의 해가 서로 같을 때, 상수 $b$의 값을 구하시오.`,
          answer: `$${b}$`,
          solution: `첫째 방정식의 해는 $x=${r}$이다. 둘째 방정식에 대입하면 $${q}\\times${r}-b=${p}$이므로 $b=${b}$이다.`,
          facts: { mode, r, p, q, a, b },
        };
      }
      if (mode === 2) {
        const k = intBetween(rng, 2, 5);
        const b = k * r;
        return {
          content: `방정식 $\\dfrac{x+a}{${k}}=${r + p}$의 해가 $x=${b}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${k * (r + p) - b}$`,
          solution: `$x=${b}$를 대입하면 $\\dfrac{${b}+a}{${k}}=${r + p}$이다. 따라서 $${b}+a=${k * (r + p)}$이므로 $a=${k * (r + p) - b}$이다.`,
          facts: { mode, r, p, q, a, k, b },
        };
      }
      if (mode === 3) {
        const c = p * r - q;
        return {
          content: `방정식 $ax-${q}=${c}$의 해가 자연수 $${r}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${p}$`,
          solution: `$x=${r}$을 대입하면 $${r}a-${q}=${c}$이므로 $${r}a=${p * r}$, $a=${p}$이다.`,
          facts: { mode, r, p, q, a, c },
        };
      }
      if (mode === 4) {
        const c = intBetween(rng, 2, 8);
        return {
          content: `방정식 $(a-${p})x=${c}$가 해를 갖지 않을 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${p}$`,
          solution: `해가 없으려면 $x$의 계수는 $0$이고 우변은 $0$이 아니어야 한다. 따라서 $a-${p}=0$에서 $a=${p}$이다.`,
          facts: { mode, r, p, q, a, c },
        };
      }
      const b = intBetween(rng, 2, 8);
      return {
        content: `방정식 $a(x+${b})=${p}x+${p * b}$의 해가 무수히 많을 때, 상수 $a$의 값을 구하시오.`,
        answer: `$${p}$`,
        solution: `양변을 전개했을 때 $x$의 계수와 상수항이 각각 같아야 한다. $x$의 계수에서 $a=${p}$이고, 이때 상수항도 $${b}a=${p * b}$로 같다.`,
        facts: { mode, r, p, q, a, b },
      };
    },
  );
}

const SOLUTION_APPLICATION_SUPPLEMENTS = [
  solutionApplicationSupplement("26", "해를 대입하여 상수 구하기", 0),
  solutionApplicationSupplement("27", "해가 같은 두 방정식", 1),
  solutionApplicationSupplement("28", "분수 꼴 방정식의 해와 상수", 2),
  solutionApplicationSupplement("29", "자연수인 해를 이용하여 계수 구하기", 3),
  solutionApplicationSupplement("30", "해가 없는 방정식의 조건", 4),
  solutionApplicationSupplement("31", "해가 무수히 많은 방정식의 조건", 5),
] as const;

/** `ax+by+c` 몸통 — 17·18 이 두 문자 식을 낼 때 쓴다. */
function lin2(a: number, b: number, c: number): string {
  const parts: string[] = [];
  const push = (co: number, sym: string): void => {
    if (co === 0) return;
    const abs = Math.abs(co);
    const body = sym === "" ? String(abs) : `${abs === 1 ? "" : abs}${sym}`;
    parts.push(
      parts.length === 0
        ? `${co < 0 ? "-" : ""}${body}`
        : `${co < 0 ? "-" : "+"}${body}`,
    );
  };
  push(a, "x");
  push(b, "y");
  push(c, "");
  return parts.length === 0 ? "0" : parts.join("");
}

/** 백분의 일 단위 정수 → 소수 표기(`50`→`0.5`, `-5`→`-0.05`). */
function dec(h: number): string {
  const neg = h < 0;
  const v = Math.abs(h);
  let s: string;
  if (v % 100 === 0) s = String(v / 100);
  else if (v % 10 === 0) s = `${Math.floor(v / 100)}.${(v / 10) % 10}`;
  else s = `${Math.floor(v / 100)}.${String(v % 100).padStart(2, "0")}`;
  return `${neg ? "-" : ""}${s}`;
}

/** 소수 계수 일차식 몸통 — `0.5x-0.05`. `A`·`B` 는 백분의 일 단위 정수. */
function decLin(A: number, B: number): string {
  const parts: string[] = [];
  if (A !== 0) parts.push(`${dec(A)}x`);
  if (B !== 0 || parts.length === 0) {
    parts.push(
      parts.length === 0 ? dec(B) : `${B < 0 ? "-" : "+"}${dec(Math.abs(B))}`,
    );
  }
  return parts.join("");
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

/** `k/d` 를 약분해 LaTeX 로 — 분모가 $1$이면 분수를 안 쓴다. `tail` 은 뒤에 붙는 문자. */
function fracTex(k: number, d: number, tail = ""): string {
  const g = gcd(k, d) || 1;
  const n = k / g;
  const m = d / g;
  if (m === 1) {
    if (tail === "") return String(n);
    return `${n === 1 ? "" : n === -1 ? "-" : n}${tail}`;
  }
  return `\\dfrac{${n === 1 && tail !== "" ? "" : n}${tail}}{${m}}`;
}

/**
 * `n/d` 를 분수로 — 부호는 분수 **앞**으로 뺀다. 분모에 음수를 두면
 * `\dfrac{5}{-6}` 처럼 교과서에 없는 꼴이 지면에 나간다(렌더는 멀쩡해서 안 걸린다).
 */
function fracRaw(n: number, d: number): string {
  const neg = n < 0 !== d < 0;
  return `${neg ? "-" : ""}\\dfrac{${Math.abs(n)}}{${Math.abs(d)}}`;
}

/** 음수 분수를 연산자 뒤에 놓을 때는 괄호로 감싼다 — `\div\left(-\dfrac{3}{7}
ight)`. */
function fracRawParen(n: number, d: number): string {
  const body = fracRaw(n, d);
  return body.startsWith("-") ? `\\left(${body}\\right)` : body;
}

/** 주격 조사 — 받침 판정은 `m2Josa.eulReul` 한 곳에서 온다(규칙을 두 벌로 두지 않는다). */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** `x^{e}` — 지수 $1$은 생략, $0$이면 빈 문자열. */
function pow(v: string, e: number): string {
  if (e === 0) return "";
  return e === 1 ? v : `${v}^{${e}}`;
}

// ══════════════════════════════════════════════════════════════
//  문자의 사용과 식의 계산 — 01~08 · 11 · 14~20 (16유형)
// ══════════════════════════════════════════════════════════════

const EXPR_TYPES: TypeEntry[] = [
  def(
    MINOR_EXPR,
    "01",
    "곱셈 기호와 나눗셈 기호의 생략",
    SEC.식의값,
    "기본",
    (rng): Body => {
      const sgn = pick(rng, [1, -1] as const);
      const k = intBetween(rng, 2, 9);
      const ex = intBetween(rng, 1, 3);
      const ey = intBetween(rng, 0, 2);
      const head = sgn < 0 ? `(-${k})` : String(k);
      const factors = [
        ...Array.from({ length: ex }, () => "x"),
        ...Array.from({ length: ey }, () => "y"),
      ];
      const raw = `${[head, ...factors].join("\\times ")}\\div z`;
      const body = `${k}${pow("x", ex)}${pow("y", ey)}`;
      const ans = `${sgn < 0 ? "-" : ""}\\dfrac{${body}}{z}`;
      return {
        content: `다음 식을 곱셈 기호와 나눗셈 기호를 생략하여 나타내시오.\n$${raw}$`,
        answer: `$${ans}$`,
        solution: `같은 문자의 곱은 거듭제곱으로 나타내고, 나눗셈은 분수의 꼴로 고친다.\n따라서 $${raw}=${ans}$이다.`,
        facts: { sgn, k, ex, ey },
      };
    },
  ),

  def(
    MINOR_EXPR,
    "02",
    "문자를 사용한 식으로 나타내기 수 단위 금액",
    SEC.식의값,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 4);
      if (mode === 0) {
        const m = intBetween(rng, 2, 9);
        const n = intBetween(rng, 2, 9);
        return {
          content: `한 개에 $a$원인 사탕 $${m}$개와 한 개에 $b$원인 초콜릿 $${n}$개를 살 때 지불하는 금액을 $a$, $b$를 사용한 식으로 나타내시오.`,
          answer: `$(${m}a+${n}b)$원`,
          solution: `사탕값은 $${m}a$원, 초콜릿값은 $${n}b$원이다.\n따라서 지불하는 금액은 $(${m}a+${n}b)$원이다.`,
          facts: { mode, m, n },
        };
      }
      if (mode === 1) {
        const N = pick(rng, [1000, 2000, 5000, 10000] as const);
        const m = intBetween(rng, 2, 9);
        return {
          content: `$${N}$원을 내고 한 개에 $a$원인 물건 $${m}$개를 샀을 때의 거스름돈을 $a$를 사용한 식으로 나타내시오.`,
          answer: `$(${N}-${m}a)$원`,
          solution: `물건값은 $${m}a$원이다.\n따라서 거스름돈은 $(${N}-${m}a)$원이다.`,
          facts: { mode, N, m },
        };
      }
      if (mode === 2) {
        const m = intBetween(rng, 1, 11) * 5;
        return {
          content: `$a$시간 $${m}$분은 모두 몇 분인지 $a$를 사용한 식으로 나타내시오.`,
          answer: `$(60a+${m})$분`,
          solution: `$1$시간은 $60$분이므로 $a$시간은 $60a$분이다.\n따라서 $a$시간 $${m}$분은 $(60a+${m})$분이다.`,
          facts: { mode, m },
        };
      }
      if (mode === 3) {
        const m = intBetween(rng, 1, 19) * 5;
        return {
          content: `$a$ m $${m}$ cm는 모두 몇 cm인지 $a$를 사용한 식으로 나타내시오.`,
          answer: `$(100a+${m})$ cm`,
          solution: `$1$ m는 $100$ cm이므로 $a$ m는 $100a$ cm이다.\n따라서 $a$ m $${m}$ cm는 $(100a+${m})$ cm이다.`,
          facts: { mode, m },
        };
      }
      const p = pick(rng, [10, 20, 25, 40, 50] as const);
      return {
        content: `정가가 $a$원인 물건을 $${p}$ % 할인하여 살 때 지불하는 금액을 $a$를 사용한 식으로 나타내시오.`,
        answer: `$${fracTex(100 - p, 100, "a")}$원`,
        solution: `할인 금액은 $\\dfrac{${p}}{100}a$원이므로 지불하는 금액은 $a-\\dfrac{${p}}{100}a$원이다.\n따라서 $${fracTex(100 - p, 100, "a")}$원이다.`,
        facts: { mode, p },
      };
    },
  ),

  def(
    MINOR_EXPR,
    "03",
    "문자를 사용한 식으로 나타내기 도형",
    SEC.식의값,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 3);
      if (mode === 0) {
        const m = intBetween(rng, 2, 6);
        return {
          content: `가로의 길이가 $a$ cm, 세로의 길이가 $${m}b$ cm인 직사각형의 둘레의 길이를 $a$, $b$를 사용한 식으로 나타내시오.`,
          answer: `$(2a+${2 * m}b)$ cm`,
          solution: `직사각형의 둘레의 길이는 가로의 길이와 세로의 길이의 합의 $2$배이다.\n따라서 $2(a+${m}b)=2a+${2 * m}b$이므로 $(2a+${2 * m}b)$ cm이다.`,
          facts: { mode, m },
        };
      }
      if (mode === 1) {
        const h = intBetween(rng, 1, 6);
        const coef = h === 1 ? "ab" : `${h}ab`;
        return {
          content: `밑변의 길이가 $${2 * h}a$ cm, 높이가 $b$ cm인 삼각형의 넓이를 $a$, $b$를 사용한 식으로 나타내시오.`,
          answer: `$${coef}$ cm$^{2}$`,
          solution: `삼각형의 넓이는 밑변의 길이와 높이의 곱의 절반이다.\n따라서 $\\dfrac{1}{2}\\times${2 * h}a\\times b=${coef}$이므로 $${coef}$ cm$^{2}$이다.`,
          facts: { mode, h },
        };
      }
      if (mode === 2) {
        const d = intBetween(rng, 2, 9);
        return {
          content: `윗변의 길이가 $a$ cm, 아랫변의 길이가 $${d}$ cm, 높이가 $h$ cm인 사다리꼴의 넓이를 $a$, $h$를 사용한 식으로 나타내시오.`,
          answer: `$\\dfrac{(a+${d})h}{2}$ cm$^{2}$`,
          solution: `사다리꼴의 넓이는 윗변의 길이와 아랫변의 길이의 합에 높이를 곱한 것의 절반이다.\n따라서 $\\dfrac{1}{2}\\times(a+${d})\\times h=\\dfrac{(a+${d})h}{2}$이므로 $\\dfrac{(a+${d})h}{2}$ cm$^{2}$이다.`,
          facts: { mode, d },
        };
      }
      const names = ["정삼각형", "정사각형", "정오각형", "정육각형"] as const;
      const idx = intBetween(rng, 0, 3);
      const k = idx + 3;
      const n = intBetween(rng, 2, 7);
      return {
        content: `한 변의 길이가 $${n}x$ cm인 ${names[idx]}의 둘레의 길이를 $x$를 사용한 식으로 나타내시오.`,
        answer: `$${n * k}x$ cm`,
        solution: `${names[idx]}은 길이가 같은 변이 $${k}$개이다.\n따라서 둘레의 길이는 $${k}\\times${n}x=${n * k}x$이므로 $${n * k}x$ cm이다.`,
        facts: { mode, k, n },
      };
    },
  ),

  def(
    MINOR_EXPR,
    "04",
    "문자를 사용한 식으로 나타내기 속력 농도",
    SEC.식의값,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 4);
      if (mode === 0) {
        const D = intBetween(rng, 2, 30) * 10;
        return {
          content: `$${D}$ km의 거리를 시속 $x$ km로 갈 때 걸리는 시간을 $x$를 사용한 식으로 나타내시오.`,
          answer: `$\\dfrac{${D}}{x}$시간`,
          solution: `시간은 거리를 속력으로 나눈 것이다.\n따라서 걸리는 시간은 $\\dfrac{${D}}{x}$시간이다.`,
          facts: { mode, D },
        };
      }
      if (mode === 1) {
        const v = intBetween(rng, 3, 12) * 10;
        return {
          content: `시속 $${v}$ km로 $a$시간 동안 간 거리를 $a$를 사용한 식으로 나타내시오.`,
          answer: `$${v}a$ km`,
          solution: `거리는 속력과 시간의 곱이다.\n따라서 간 거리는 $${v}\\times a=${v}a$이므로 $${v}a$ km이다.`,
          facts: { mode, v },
        };
      }
      if (mode === 2) {
        const W = intBetween(rng, 2, 9) * 100;
        return {
          content: `소금물 $${W}$ g에 소금이 $a$ g 녹아 있을 때, 이 소금물의 농도를 $a$를 사용한 식으로 나타내시오.`,
          answer: `$${fracTex(100, W, "a")}$ %`,
          solution: `소금물의 농도는 소금의 양을 소금물의 양으로 나눈 뒤 $100$을 곱한 것이다.\n따라서 $\\dfrac{a}{${W}}\\times100=${fracTex(100, W, "a")}$이므로 $${fracTex(100, W, "a")}$ %이다.`,
          facts: { mode, W },
        };
      }
      if (mode === 3) {
        const W = intBetween(rng, 2, 9) * 100;
        return {
          content: `농도가 $a$ %인 소금물 $${W}$ g에 들어 있는 소금의 양을 $a$를 사용한 식으로 나타내시오.`,
          answer: `$${W / 100}a$ g`,
          solution: `소금의 양은 농도를 $100$으로 나눈 뒤 소금물의 양을 곱한 것이다.\n따라서 $\\dfrac{a}{100}\\times${W}=${W / 100}a$이므로 $${W / 100}a$ g이다.`,
          facts: { mode, W },
        };
      }
      const D = intBetween(rng, 10, 30) * 10;
      const v = intBetween(rng, 4, 9) * 10;
      return {
        content: `$${D}$ km 떨어진 곳을 향하여 시속 $${v}$ km로 $a$시간 동안 갔을 때, 남은 거리를 $a$를 사용한 식으로 나타내시오.`,
        answer: `$(${D}-${v}a)$ km`,
        solution: `$a$시간 동안 간 거리는 $${v}a$ km이다.\n따라서 남은 거리는 $(${D}-${v}a)$ km이다.`,
        facts: { mode, D, v },
      };
    },
  ),

  def(MINOR_EXPR, "05", "식의 값 구하기", SEC.식의값, "기본", (rng) =>
    attempt(400, (): Body | null => {
      const mode = intBetween(rng, 0, 2);
      if (mode === 0) {
        const x0 = intNonzero(rng, -5, 5);
        const a = intNonzero(rng, -4, 4);
        const b = intNonzero(rng, -7, 7);
        const c = intNonzero(rng, -9, 9);
        const V = a * x0 * x0 + b * x0 + c;
        const expr = `${lin(a, 0, "x^{2}")}${lin(b, 0) === "" ? "" : (b < 0 ? "" : "+") + lin(b, 0)}${signed(c)}`;
        return {
          content: `$x=${x0}$일 때, $${expr}$의 값을 구하시오.`,
          answer: `$${V}$`,
          solution: `문자에 음수를 대입할 때는 반드시 괄호를 사용한다.\n$x=${x0}$${eulReul(x0)} 대입하면 $${expr}=${V}$이다.`,
          facts: { mode, x0, a, b, c, V },
        };
      }
      if (mode === 1) {
        const x0 = intNonzero(rng, -4, 4);
        const y0 = intNonzero(rng, -4, 4);
        const a = intNonzero(rng, -3, 3);
        const b = intNonzero(rng, -5, 5);
        const c = intNonzero(rng, -5, 5);
        const V = a * x0 * x0 + b * x0 * y0 + c * y0;
        const t2 = `${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}xy`;
        const t3 = `${c < 0 ? "-" : "+"}${Math.abs(c) === 1 ? "" : Math.abs(c)}y`;
        const expr = `${lin(a, 0, "x^{2}")}${t2}${t3}`;
        return {
          content: `$x=${x0}$, $y=${y0}$일 때, $${expr}$의 값을 구하시오.`,
          answer: `$${V}$`,
          solution: `문자에 음수를 대입할 때는 반드시 괄호를 사용한다.\n$x=${x0}$, $y=${y0}$${eulReul(y0)} 대입하면 $${expr}=${V}$이다.`,
          facts: { mode, x0, y0, a, b, c, V },
        };
      }
      const a0 = intNonzero(rng, -6, 6);
      if (Math.abs(a0) < 2) return null;
      const e = intBetween(rng, 2, 3);
      const V = -(a0 ** e);
      return {
        content: `$a=${a0}$일 때, $-a^{${e}}$의 값을 구하시오.`,
        answer: `$${V}$`,
        solution: `$-a^{${e}}$는 $a^{${e}}$ 앞에 $-$를 붙인 것이다.\n$a=${a0}$${eulReul(a0)} 대입하면 $-a^{${e}}=${V}$이다.`,
        facts: { mode, a0, e, V },
      };
    }),
  ),

  def(
    MINOR_EXPR,
    "06",
    "식의 값 구하기 분모에 분수 대입하기",
    SEC.식의값,
    "응용",
    (rng): Body =>
      attempt(400, (): Body | null => {
        const mode = intBetween(rng, 0, 1);
        if (mode === 0) {
          // 분모가 $1$이면 대입할 것이 분수가 아니다 — 이 유형의 뜻이 사라진다.
          const p = intNonzero(rng, -6, 6);
          const q = intNonzero(rng, -6, 6);
          if (Math.abs(p) < 2 || Math.abs(q) < 2) return null;
          const m = intBetween(rng, 2, 9);
          const n = intBetween(rng, 2, 9);
          const V = m * p - n * q;
          return {
            content: `$x=${fracRaw(1, p)}$, $y=${fracRaw(1, q)}$일 때, $\\dfrac{${m}}{x}-\\dfrac{${n}}{y}$의 값을 구하시오.`,
            answer: `$${V}$`,
            solution: `분모에 분수를 대입할 때는 생략된 나눗셈 기호를 다시 쓴다.\n$\\dfrac{${m}}{x}=${m}\\div${fracRawParen(1, p)}=${m}\\times\\left(${p}\\right)=${m * p}$이고, 같은 방법으로 $\\dfrac{${n}}{y}=${n * q}$이다.\n따라서 구하는 값은 $${m * p}${signed(-(n * q))}=${V}$이다.`,
            facts: { mode, p, q, m, n, V },
          };
        }
        const p = intNonzero(rng, -5, 5);
        const q = intNonzero(rng, -5, 5);
        const r = intNonzero(rng, -5, 5);
        if (Math.abs(p) < 2 || Math.abs(q) < 2 || Math.abs(r) < 2) return null;
        const l = intBetween(rng, 2, 6);
        const m = intBetween(rng, 2, 6);
        const n = intBetween(rng, 2, 6);
        const V = l * p - m * q - n * r;
        return {
          content: `$a=${fracRaw(1, p)}$, $b=${fracRaw(1, q)}$, $c=${fracRaw(1, r)}$일 때, $\\dfrac{${l}}{a}-\\dfrac{${m}}{b}-\\dfrac{${n}}{c}$의 값을 구하시오.`,
          answer: `$${V}$`,
          solution: `분모에 분수를 대입할 때는 생략된 나눗셈 기호를 다시 쓴다.\n$\\dfrac{${l}}{a}=${l * p}$, $\\dfrac{${m}}{b}=${m * q}$, $\\dfrac{${n}}{c}=${n * r}$이다.\n따라서 구하는 값은 $${l * p}${signed(-(m * q))}${signed(-(n * r))}=${V}$이다.`,
          facts: { mode, p, q, r, l, m, n, V },
        };
      }),
  ),

  def(
    MINOR_EXPR,
    "07",
    "식의 값의 활용 식이 주어진 경우",
    SEC.식의값,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 3);
      if (mode === 0) {
        const T = intBetween(rng, 1, 8) * 5;
        const V = (9 / 5) * T + 32;
        return {
          // 문자를 분자에 넣어 쓴다 — `\dfrac{9}{5}x` 로 쓰면 제품 전처리
          // (`textPreprocess.improperToMixed`)가 이것을 **대분수** `1\frac45 x`
          // 로 바꿔 지면에 내보낸다. 중학 계수는 가분수로 쓴다.
          content: `섭씨 $x$ °C는 화씨 $\\dfrac{9x}{5}+32$ °F이다. 섭씨 $${T}$ °C는 화씨 몇 °F인지 구하시오.`,
          answer: `$${V}$ °F`,
          solution: `$x=${T}$${eulReul(T)} 대입하면 $\\dfrac{9\\times${T}}{5}+32=${(9 / 5) * T}+32=${V}$이다.\n따라서 화씨 $${V}$ °F이다.`,
          facts: { mode, T, V },
        };
      }
      if (mode === 1) {
        const T = intBetween(rng, 1, 6) * 5;
        const t = intBetween(rng, 2, 9);
        const speed = 331 + 0.6 * T;
        const V = speed * t;
        return {
          content: `기온이 $x$ °C일 때 소리의 속력은 초속 $331+0.6x$ m이다. 기온이 $${T}$ °C일 때 소리가 $${t}$초 동안 이동한 거리를 구하시오.`,
          answer: `$${V}$ m`,
          solution: `$x=${T}$${eulReul(T)} 대입하면 소리의 속력은 초속 $331+0.6\\times${T}=${speed}$ m이다.\n따라서 $${t}$초 동안 이동한 거리는 $${speed}\\times${t}=${V}$이므로 $${V}$ m이다.`,
          facts: { mode, T, t, V },
        };
      }
      if (mode === 2) {
        const h0 = intBetween(rng, 2, 6) * 10;
        const v0 = intBetween(rng, 3, 9) * 10;
        const T = intBetween(rng, 2, 6);
        const V = h0 + v0 * T - 5 * T * T;
        return {
          content: `지면에서 던져 올린 물체의 $t$초 후의 높이는 $${h0}+${v0}t-5t^{2}$ m이다. 이 물체의 $${T}$초 후의 높이를 구하시오.`,
          answer: `$${V}$ m`,
          solution: `$t=${T}$${eulReul(T)} 대입하면 $${h0}+${v0}\\times${T}-5\\times${T}^{2}=${V}$이다.\n따라서 $${T}$초 후의 높이는 $${V}$ m이다.`,
          facts: { mode, h0, v0, T, V },
        };
      }
      const a = intBetween(rng, 4, 8) * 5;
      const b = intBetween(rng, 2, 5) * 5;
      const part = Math.round(0.72 * (a + b) * 10) / 10;
      const V = Math.round((part + 40.6) * 10) / 10;
      return {
        content: `기온이 $x$ °C, 습구 온도가 $y$ °C일 때 불쾌지수는 $0.72(x+y)+40.6$이다. 기온이 $${a}$ °C, 습구 온도가 $${b}$ °C일 때의 불쾌지수를 구하시오.`,
        answer: `$${V}$`,
        solution: `$x=${a}$, $y=${b}$${eulReul(b)} 대입하면 $0.72\\times(${a}+${b})+40.6=${part}+40.6=${V}$이다.\n따라서 불쾌지수는 $${V}$이다.`,
        facts: { mode, a, b, V },
      };
    },
  ),

  def(
    MINOR_EXPR,
    "08",
    "식의 값의 활용 식이 주어지지 않은 경우",
    SEC.식의값,
    "응용",
    (rng): Body => {
      const mode = intBetween(rng, 0, 3);
      if (mode === 0) {
        const c = intBetween(rng, 2, 9) * 5;
        const T = intBetween(rng, 2, 9);
        const H = c * T + intBetween(rng, 2, 20) * 10;
        const V = H - c * T;
        return {
          content: `물의 높이가 $1$시간에 $${c}$ cm씩 줄어드는 물탱크가 있다. 현재 물의 높이가 $${H}$ cm일 때, 지금부터 $${T}$시간 후의 물의 높이를 구하시오.`,
          answer: `$${V}$ cm`,
          solution: `$x$시간 후의 물의 높이는 $${H}-${c}x$ cm이다.\n$x=${T}$${eulReul(T)} 대입하면 $${H}-${c}\\times${T}=${V}$이다.\n따라서 $${T}$시간 후의 물의 높이는 $${V}$ cm이다.`,
          facts: { mode, c, T, H, V },
        };
      }
      if (mode === 1) {
        const F = intBetween(rng, 5, 12) * 1000;
        const r = intBetween(rng, 6, 20) * 10;
        const T = intBetween(rng, 5, 20) * 10;
        const V = F + r * T;
        return {
          content: `어느 통신사의 휴대 전화 요금은 한 달에 기본 요금이 $${F}$원이고 통화 시간 $1$분당 $${r}$원씩 추가된다. 한 달에 $${T}$분 통화했을 때의 요금을 구하시오.`,
          answer: `$${V}$원`,
          solution: `한 달에 $x$분 통화했을 때의 요금은 $${F}+${r}x$원이다.\n$x=${T}$${eulReul(T)} 대입하면 $${F}+${r}\\times${T}=${V}$이다.\n따라서 요금은 $${V}$원이다.`,
          facts: { mode, F, r, T, V },
        };
      }
      if (mode === 2) {
        const w = intBetween(rng, 2, 3);
        const a = intBetween(rng, 3, 12);
        const b = intBetween(rng, 1, 6);
        const c = intBetween(rng, 1, 6);
        const V = w * a + b;
        return {
          content: `어느 경기에서 한 경기마다 이기면 $${w}$점, 비기면 $1$점, 지면 $0$점의 승점을 준다. 어느 팀이 $${a}$승 $${b}$무 $${c}$패를 하였을 때의 승점을 구하시오.`,
          answer: `$${V}$점`,
          solution: `$x$승 $y$무를 하였을 때의 승점은 $${w}x+y$점이다.\n$x=${a}$, $y=${b}$${eulReul(b)} 대입하면 $${w}\\times${a}+${b}=${V}$이다.\n따라서 승점은 $${V}$점이다.`,
          facts: { mode, w, a, b, c, V },
        };
      }
      const m = intBetween(rng, 1, 12) * 50;
      const V = Math.round(0.38 * m * 100) / 100;
      return {
        content: `화성에서의 무게는 지구에서의 무게의 $0.38$배라 한다. 지구에서 측정한 무게가 $${m}$ kg인 물체의 화성에서의 무게를 구하시오.`,
        answer: `$${V}$ kg`,
        solution: `지구에서의 무게가 $x$ kg일 때 화성에서의 무게는 $0.38x$ kg이다.\n$x=${m}$${eulReul(m)} 대입하면 $0.38\\times${m}=${V}$이다.\n따라서 화성에서의 무게는 $${V}$ kg이다.`,
        facts: { mode, m, V },
      };
    },
  ),

  def(MINOR_EXPR, "11", "일차식과 수의 곱셈 나눗셈", SEC.일차2, "기본", (rng) =>
    attempt(400, (): Body | null => {
      const mode = intBetween(rng, 0, 2);
      if (mode === 0) {
        // (분수)×(일차식) — 분모가 약분되도록 계수를 분모의 배수로 잡는다.
        // 가분수는 쓰지 않는다: 제품 전처리(`textPreprocess.improperToMixed`)가
        // `\dfrac{7}{3}` 을 **대분수** `2\frac13` 으로 바꿔 지면에 내보내는데,
        // 중학 계수를 대분수로 쓰는 교과서는 없다. 그래서 진분수만 낸다.
        const n = intBetween(rng, 3, 6);
        const m = intNonzero(rng, -5, 5);
        if (Math.abs(m) === 1 || Math.abs(m) >= n) return null;
        if (gcd(Math.abs(m), n) !== 1) return null;
        const a1 = intNonzero(rng, -4, 4);
        const b1 = intNonzero(rng, -6, 6);
        const a = n * a1;
        const b = n * b1;
        const p = m * a1;
        const q = m * b1;
        const expr = `${fracRaw(m, n)}\\left(${lin(a, b)}\\right)`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${lin(p, q)}$`,
          solution: `분배법칙을 이용하여 일차식의 각 항에 $${fracRaw(m, n)}$을 곱한다.\n$${expr}=${lin(p, q)}$이다.`,
          facts: { mode, m, n, a, b, p, q },
        };
      }
      if (mode === 1) {
        // (일차식)÷(수) — RPM 0624 꼴. 나누는 수를 분수로 두면 역수가 반드시
        // 가분수가 되어(둘 중 하나는 분자가 크다) 해설이 대분수로 나간다.
        // 그래서 나누는 수는 정수로 둔다 — 유형 제목의 「수」 그대로다.
        const d = intNonzero(rng, -9, 9);
        if (Math.abs(d) === 1) return null;
        const a1 = intNonzero(rng, -6, 6);
        const b1 = intNonzero(rng, -8, 8);
        const a = d * a1;
        const b = d * b1;
        if (Math.abs(a) > 60 || Math.abs(b) > 72) return null;
        const expr = `\\left(${lin(a, b)}\\right)\\div${d < 0 ? `\\left(${d}\\right)` : d}`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${lin(a1, b1)}$`,
          solution: `나눗셈은 역수의 곱셈으로 고쳐 일차식의 각 항을 $${d}$로 나눈다.\n$${expr}=${lin(a1, b1)}$이다.`,
          facts: { mode, d, a, b, p: a1, q: b1 },
        };
      }
      const k = intNonzero(rng, -6, 6);
      if (Math.abs(k) === 1) return null;
      const a = intNonzero(rng, -7, 7);
      const b = intNonzero(rng, -9, 9);
      const expr = `${k < 0 ? `(${k})` : k}\\left(${lin(a, b)}\\right)`;
      return {
        content: `다음 식을 계산하시오.\n$${expr}$`,
        answer: `$${lin(k * a, k * b)}$`,
        solution: `분배법칙을 이용하여 일차식의 각 항에 $${k}$를 곱한다.\n$${expr}=${lin(k * a, k * b)}$이다.`,
        facts: { mode, k, a, b, p: k * a, q: k * b },
      };
    }),
  ),

  def(
    MINOR_EXPR,
    "14",
    "괄호가 여러 개인 일차식의 덧셈과 뺄셈",
    SEC.일차2,
    "응용",
    (rng) =>
      attempt(600, (): Body | null => {
        // 답을 먼저: 상수항 q = -C·F 를 C·F 로 잡고, x의 계수 p 에 맞춰 A 를 역산한다.
        const C = intBetween(rng, 2, 5);
        const F = intNonzero(rng, -9, 9);
        const q = -C * F;
        const p = intNonzero(rng, -12, 12);
        const B = intNonzero(rng, -7, 7);
        const D = intNonzero(rng, -5, 5);
        const E = intNonzero(rng, -5, 5);
        if (D === E) return null;
        const A = p + B + C * (D - E);
        if (A === 0 || Math.abs(A) > 15) return null;
        const inner = lin(E, -F);
        const mid = `${lin(D, 0)}-\\left(${inner}\\right)`;
        const outer = `${lin(B, 0)}+${C}\\left\\{${mid}\\right\\}`;
        const expr = `${lin(A, 0)}-\\left[${outer}\\right]`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${lin(p, q)}$`,
          solution: `괄호는 소괄호, 중괄호, 대괄호의 순서로 푼다. 이때 괄호 앞의 부호에 주의한다.\n$${expr}=${lin(p, q)}$이다.`,
          facts: { A, B, C, D, E, F, p, q },
        };
      }),
  ),

  def(
    MINOR_EXPR,
    "15",
    "분수 꼴인 일차식의 덧셈과 뺄셈",
    SEC.일차2,
    "응용",
    (rng) =>
      attempt(800, (): Body | null => {
        // 답(p, q)을 먼저 뽑고, 두 분수의 분자를 역산한다.
        const p = intNonzero(rng, -6, 6);
        const q = intNonzero(rng, -9, 9);
        const m = intBetween(rng, 2, 6);
        const n = intBetween(rng, 2, 6);
        if (m === n) return null;
        const L = lcm(m, n);
        const u = L / m;
        const v = L / n;
        const s = pick(rng, [1, -1] as const);
        const c = intNonzero(rng, -7, 7);
        const d = intNonzero(rng, -9, 9);
        const aNum = L * p - s * v * c;
        const bNum = L * q - s * v * d;
        if (aNum % u !== 0 || bNum % u !== 0) return null;
        const a = aNum / u;
        const b = bNum / u;
        if (a === 0 || b === 0) return null;
        if (Math.abs(a) > 12 || Math.abs(b) > 15) return null;
        const expr = `\\dfrac{${lin(a, b)}}{${m}}${s > 0 ? "+" : "-"}\\dfrac{${lin(c, d)}}{${n}}`;
        return {
          content: `다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${lin(p, q)}$`,
          solution: `분모의 최소공배수 $${L}$로 통분한 뒤 동류항끼리 모아서 계산한다.\n$${expr}=${lin(p, q)}$이다.`,
          facts: { a, b, c, d, m, n, s, p, q },
        };
      }),
  ),

  def(MINOR_EXPR, "16", "문자에 일차식을 대입하기", SEC.일차2, "응용", (rng) =>
    attempt(800, (): Body | null => {
      const mode = intBetween(rng, 0, 1);
      const p = intNonzero(rng, -9, 9);
      const q = intNonzero(rng, -12, 12);
      let mCo: number;
      let nCo: number;
      let comb: string;
      if (mode === 0) {
        mCo = intNonzero(rng, -4, 4);
        nCo = intNonzero(rng, -4, 4);
        comb = `${mCo === 1 ? "" : mCo === -1 ? "-" : mCo}A${nCo < 0 ? "-" : "+"}${Math.abs(nCo) === 1 ? "" : Math.abs(nCo)}B`;
      } else {
        const j = intBetween(rng, 2, 4);
        const t = intBetween(rng, 2, 4);
        const k = intNonzero(rng, -4, 4);
        mCo = j - 1;
        nCo = j * t - k;
        if (mCo === 0 || nCo === 0) return null;
        comb = `-A${k < 0 ? "+" : "-"}${Math.abs(k) === 1 ? "" : Math.abs(k)}B+${j}\\left(A+${t}B\\right)`;
      }
      const c = intNonzero(rng, -5, 5);
      const d = intNonzero(rng, -7, 7);
      if ((p - nCo * c) % mCo !== 0 || (q - nCo * d) % mCo !== 0) return null;
      const a = (p - nCo * c) / mCo;
      const b = (q - nCo * d) / mCo;
      if (a === 0 || b === 0) return null;
      if (Math.abs(a) > 8 || Math.abs(b) > 10) return null;
      const tidy = `${lin(mCo, 0, "A")}${nCo < 0 ? "-" : "+"}${Math.abs(nCo) === 1 ? "" : Math.abs(nCo)}B`;
      const step =
        mode === 0
          ? `괄호를 쓰고 $A$, $B$에 주어진 일차식을 그대로 대입한다.`
          : `주어진 식을 먼저 $A$, $B$에 대하여 간단히 하면 $${comb}=${tidy}$이다.`;
      return {
        content: `$A=${lin(a, b)}$, $B=${lin(c, d)}$일 때, $${comb}$를 계산하시오.`,
        answer: `$${lin(p, q)}$`,
        solution: `${step}\n$A=${lin(a, b)}$, $B=${lin(c, d)}$를 대입하여 동류항끼리 모으면 $${lin(p, q)}$이다.`,
        facts: { mode, a, b, c, d, mCo, nCo, p, q },
      };
    }),
  ),

  def(MINOR_EXPR, "17", "어떤 식 구하기", SEC.일차2, "응용", (rng) =>
    attempt(400, (): Body | null => {
      const mode = intBetween(rng, 0, 1);
      const hasY = rng() < 0.5;
      // 답(어떤 다항식)을 먼저 뽑는다.
      const rp = intNonzero(rng, -8, 8);
      const ry = hasY ? intNonzero(rng, -8, 8) : 0;
      const rc = intNonzero(rng, -9, 9);
      const ap = intNonzero(rng, -6, 6);
      const ay = hasY ? intNonzero(rng, -6, 6) : 0;
      const ac = intNonzero(rng, -9, 9);
      // mode 0: 어떤 식 − A = B · mode 1: 어떤 식 + A = B
      const sg = mode === 0 ? -1 : 1;
      const bp = rp + sg * ap;
      const by = ry + sg * ay;
      const bc = rc + sg * ac;
      if (bp === 0 || bc === 0) return null;
      if (hasY && by === 0) return null;
      const A = lin2(ap, ay, ac);
      const B = lin2(bp, by, bc);
      const R = lin2(rp, ry, rc);
      const verb = mode === 0 ? "뺐더니" : "더했더니";
      const undo = mode === 0 ? "더하면" : "빼면";
      return {
        content: `어떤 다항식에${mode === 0 ? "서" : ""} $${A}$${eulReul(ac)} ${verb} $${B}$${iGa(bc)} 되었다. 어떤 다항식을 구하시오.`,
        answer: `$${R}$`,
        solution: `어떤 다항식을 $\\square$라 하면 $\\square${mode === 0 ? "-" : "+"}\\left(${A}\\right)=${B}$이다.\n따라서 $\\square$는 $${B}$에 $${A}$${eulReul(ac)} ${undo} 되므로 $${R}$이다.`,
        facts: { mode, hasY: hasY ? 1 : 0, ap, ay, ac, bp, by, bc, rp, ry, rc },
      };
    }),
  ),

  def(MINOR_EXPR, "18", "바르게 계산한 식 구하기", SEC.일차2, "심화", (rng) =>
    attempt(400, (): Body | null => {
      const mode = intBetween(rng, 0, 1);
      const hasY = rng() < 0.5;
      // 바르게 계산한 식(답)을 먼저 뽑는다.
      const rp = intNonzero(rng, -9, 9);
      const ry = hasY ? intNonzero(rng, -9, 9) : 0;
      const rc = intNonzero(rng, -12, 12);
      const ap = intNonzero(rng, -5, 5);
      const ay = hasY ? intNonzero(rng, -5, 5) : 0;
      const ac = intNonzero(rng, -7, 7);
      // mode 0: □−A 를 □+A 로 잘못함 → B=□+A, 바른답 R=B−2A
      // mode 1: A−□ 를 A+□ 로 잘못함 → B=A+□, 바른답 R=2A−B
      const bp = mode === 0 ? rp + 2 * ap : 2 * ap - rp;
      const by = mode === 0 ? ry + 2 * ay : 2 * ay - ry;
      const bc = mode === 0 ? rc + 2 * ac : 2 * ac - rc;
      if (bp === 0 || bc === 0) return null;
      if (hasY && by === 0) return null;
      const A = lin2(ap, ay, ac);
      const B = lin2(bp, by, bc);
      const R = lin2(rp, ry, rc);
      const content =
        mode === 0
          ? `어떤 다항식에서 $${A}$${eulReul(ac)} 빼야 할 것을 잘못하여 더했더니 $${B}$${iGa(bc)} 되었다. 바르게 계산한 식을 구하시오.`
          : `$${A}$에서 어떤 다항식을 빼야 할 것을 잘못하여 더했더니 $${B}$${iGa(bc)} 되었다. 바르게 계산한 식을 구하시오.`;
      const solution =
        mode === 0
          ? `어떤 다항식을 $\\square$라 하면 $\\square+\\left(${A}\\right)=${B}$이므로 $\\square=${lin2(bp - ap, by - ay, bc - ac)}$이다.\n따라서 바르게 계산한 식은 $\\square-\\left(${A}\\right)=${R}$이다.`
          : `어떤 다항식을 $\\square$라 하면 $\\left(${A}\\right)+\\square=${B}$이므로 $\\square=${lin2(bp - ap, by - ay, bc - ac)}$이다.\n따라서 바르게 계산한 식은 $\\left(${A}\\right)-\\square=${R}$이다.`;
      return {
        content,
        answer: `$${R}$`,
        solution,
        facts: { mode, hasY: hasY ? 1 : 0, ap, ay, ac, bp, by, bc, rp, ry, rc },
      };
    }),
  ),

  def(
    MINOR_EXPR,
    "19",
    "도형에서의 일차식의 덧셈과 뺄셈의 활용",
    SEC.일차2,
    "응용",
    (rng) =>
      attempt(400, (): Body | null => {
        const mode = intBetween(rng, 0, 2);
        if (mode === 0) {
          const a = intBetween(rng, 1, 5);
          const b = intBetween(rng, 1, 9);
          const c = intBetween(rng, 1, 5);
          const d = intBetween(rng, 1, 9);
          const p = 2 * (a + c);
          const q = 2 * (b + d);
          return {
            content: `가로의 길이가 $${lin(a, b)}$ cm, 세로의 길이가 $${lin(c, d)}$ cm인 직사각형의 둘레의 길이를 $x$를 사용한 식으로 나타내시오.`,
            answer: `$${lin(p, q)}$ cm`,
            solution: `직사각형의 둘레의 길이는 가로의 길이와 세로의 길이의 합의 $2$배이다.\n$2\\left\\{\\left(${lin(a, b)}\\right)+\\left(${lin(c, d)}\\right)\\right\\}=${lin(p, q)}$이므로 $${lin(p, q)}$ cm이다.`,
            facts: { mode, a, b, c, d, p, q },
          };
        }
        if (mode === 1) {
          const a = intBetween(rng, 1, 6);
          const b = intBetween(rng, 1, 9);
          const h = intBetween(rng, 1, 5);
          const p = h * a;
          const q = h * b;
          return {
            content: `밑변의 길이가 $${lin(a, b)}$ cm, 높이가 $${2 * h}$ cm인 삼각형의 넓이를 $x$를 사용한 식으로 나타내시오.`,
            answer: `$${lin(p, q)}$ cm$^{2}$`,
            solution: `삼각형의 넓이는 밑변의 길이와 높이의 곱의 절반이다.\n$\\dfrac{1}{2}\\times\\left(${lin(a, b)}\\right)\\times${2 * h}=${lin(p, q)}$이므로 $${lin(p, q)}$ cm$^{2}$이다.`,
            facts: { mode, a, b, h, p, q },
          };
        }
        const a = intBetween(rng, 1, 4);
        const b = intBetween(rng, 1, 9);
        const c = intBetween(rng, 1, 4);
        const d = intBetween(rng, 1, 9);
        const e = intBetween(rng, 1, 4);
        const f = intBetween(rng, 1, 9);
        const p = a + c + e;
        const q = b + d + f;
        return {
          content: `세 변의 길이가 각각 $${lin(a, b)}$ cm, $${lin(c, d)}$ cm, $${lin(e, f)}$ cm인 삼각형의 둘레의 길이를 $x$를 사용한 식으로 나타내시오.`,
          answer: `$${lin(p, q)}$ cm`,
          solution: `삼각형의 둘레의 길이는 세 변의 길이의 합이다.\n$\\left(${lin(a, b)}\\right)+\\left(${lin(c, d)}\\right)+\\left(${lin(e, f)}\\right)=${lin(p, q)}$이므로 $${lin(p, q)}$ cm이다.`,
          facts: { mode, a, b, c, d, e, f, p, q },
        };
      }),
  ),

  def(
    MINOR_EXPR,
    "20",
    "의 꼴이 포함된 일차식의 계산",
    SEC.일차2,
    "심화",
    (rng) =>
      attempt(400, (): Body | null => {
        // ctx 0: n이 자연수 · 1: n이 홀수 · 2: n이 짝수
        // form 0: 2n · 1: 2n+1 · 2: 2n-1 · 3: n · 4: n+1
        const ctx = intBetween(rng, 0, 2);
        const forms = ctx === 0 ? ([0, 1, 2] as const) : ([3, 4] as const);
        const e1 = pick(rng, forms);
        const e2 = pick(rng, forms);
        if (e1 === e2) return null;
        const s1 = signOfForm(e1, ctx);
        const s2 = signOfForm(e2, ctx);
        const p = intNonzero(rng, -12, 12);
        const q = intNonzero(rng, -14, 14);
        const c = intNonzero(rng, -6, 6);
        const d = intNonzero(rng, -8, 8);
        const a = s1 * (p + s2 * c);
        const b = s1 * (q + s2 * d);
        if (a === 0 || b === 0) return null;
        if (Math.abs(a) > 9 || Math.abs(b) > 12) return null;
        const ctxWord = ctx === 0 ? "자연수" : ctx === 1 ? "홀수" : "짝수";
        const expr = `(-1)^{${FORM_TEX[e1]}}\\left(${lin(a, b)}\\right)-(-1)^{${FORM_TEX[e2]}}\\left(${lin(c, d)}\\right)`;
        return {
          content: `$n$이 ${ctxWord}일 때, 다음 식을 계산하시오.\n$${expr}$`,
          answer: `$${lin(p, q)}$`,
          solution: `$(-1)^{(짝수)}=1$, $(-1)^{(홀수)}=-1$이다.\n$n$이 ${ctxWord}이므로 $(-1)^{${FORM_TEX[e1]}}=${s1}$, $(-1)^{${FORM_TEX[e2]}}=${s2}$이다.\n따라서 주어진 식은 $${s1 > 0 ? "" : "-"}\\left(${lin(a, b)}\\right)${s2 > 0 ? "-" : "+"}\\left(${lin(c, d)}\\right)=${lin(p, q)}$이다.`,
          facts: { ctx, e1, e2, s1, s2, a, b, c, d, p, q },
        };
      }),
  ),
];

/** `(-1)^{form}` 의 지수 표기 — 시험이 이 표를 손으로 다시 적어 대조한다. */
const FORM_TEX: Record<number, string> = {
  0: "2n",
  1: "2n+1",
  2: "2n-1",
  3: "n",
  4: "n+1",
};

/** 지수 꼴과 $n$의 성질로 정해지는 $(-1)^{지수}$ 의 값. */
function signOfForm(form: number, ctx: number): number {
  if (form === 0) return 1;
  if (form === 1 || form === 2) return -1;
  // form 3 = n, form 4 = n+1 — ctx 1(홀수) / 2(짝수)
  const nOdd = ctx === 1;
  const expOdd = form === 3 ? nOdd : !nOdd;
  return expOdd ? -1 : 1;
}

// ══════════════════════════════════════════════════════════════
//  일차방정식의 풀이 — 01~04 · 06~18 (17유형)
//  (05 항등식이 되는 조건은 m1Book1.ts 가 이미 냈다)
// ══════════════════════════════════════════════════════════════

/** 다섯 항목을 서로 다르게 뽑아 한 줄로 늘어놓는다 — 판별 유형(01·04·06·09)이 쓴다. */
function itemLine(rng: Rng, items: readonly string[]): string | null {
  if (new Set(items).size !== items.length) return null;
  return shuffle(rng, items)
    .map((s) => `$${s}$`)
    .join(", ");
}

const EQ_TYPES: TypeEntry[] = [
  ...EQ_PROPERTY_SUPPLEMENTS,
  ...SOLUTION_APPLICATION_SUPPLEMENTS,
  def(MINOR_EQ, "01", "등식", SEC.방정식해, "기본", (rng) =>
    attempt(400, (): Body | null => {
      const L = intBetween(rng, 2, 3);
      const kinds: number[] = [];
      const items: string[] = [];
      for (let i = 0; i < L; i += 1) {
        const t = intBetween(rng, 0, 2);
        const a = intNonzero(rng, -9, 9);
        const b = intNonzero(rng, -9, 9);
        const c = intNonzero(rng, -9, 9);
        items.push(
          t === 0
            ? `${lin(a, b)}=${c}`
            : t === 1
              ? `${Math.abs(a)}+${Math.abs(b)}=${Math.abs(a) + Math.abs(b)}`
              : // ⚠️ `+${lin(b, 0)}` 로 이어 붙이면 $b<0$ 일 때 지면에 **`7x+-4x`** 가 나간다
                //    (실측 2026-08-24). 부호를 직접 골라 붙인다 — 바로 아래 $y$ 항과 같은 꼴이다.
                `${lin(a, 0)}${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}x=${lin(a + b, 0)}`,
        );
        kinds.push(0);
      }
      for (let i = L; i < 5; i += 1) {
        const a = intNonzero(rng, -9, 9);
        const b = intNonzero(rng, -9, 9);
        const c = intNonzero(rng, -9, 9);
        if (rng() < 0.5) {
          const rel = pick(rng, [">", "<", "\\ge ", "\\le "] as const);
          items.push(`${lin(a, b)}${rel}${c}`);
          kinds.push(1);
        } else {
          items.push(
            rng() < 0.5
              ? lin(a, b)
              : `${lin(a, 0)}${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}y${signed(c)}`,
          );
          kinds.push(2);
        }
      }
      const line = itemLine(rng, items);
      if (line === null) return null;
      return {
        content: `다음 중 등식인 것의 개수를 구하시오.\n${line}`,
        answer: `$${L}$개`,
        solution: `등호 $=$를 사용하여 두 수 또는 두 식이 서로 같음을 나타낸 식이 등식이다.\n부등호를 쓴 식과 등호가 없는 식은 등식이 아니므로 등식은 $${L}$개이다.`,
        facts: {
          count: L,
          k1: kinds[0]!,
          k2: kinds[1]!,
          k3: kinds[2]!,
          k4: kinds[3]!,
          k5: kinds[4]!,
        },
      };
    }),
  ),

  def(
    MINOR_EQ,
    "02",
    "문장을 등식으로 나타내기",
    SEC.방정식해,
    "기본",
    (rng): Body => {
      const mode = intBetween(rng, 0, 4);
      if (mode === 0) {
        const a = intBetween(rng, 2, 9);
        const b = intBetween(rng, 2, 15);
        const c = intBetween(rng, 2, 9);
        return {
          content: `어떤 수 $x$의 $${a}$배에서 $${b}$${eulReul(b)} 뺀 수는 $x$의 $${c}$배와 같다. 이를 등식으로 나타내시오.`,
          answer: `$${a}x-${b}=${c}x$`,
          solution: `$x$의 $${a}$배에서 $${b}$${eulReul(b)} 뺀 수는 $${a}x-${b}$이고, $x$의 $${c}$배는 $${c}x$이다.\n따라서 $${a}x-${b}=${c}x$이다.`,
          facts: { mode, a, b, c },
        };
      }
      if (mode === 1) {
        const names = ["정삼각형", "정사각형", "정오각형", "정육각형"] as const;
        const idx = intBetween(rng, 0, 3);
        const k = idx + 3;
        const P = k * intBetween(rng, 3, 12);
        return {
          content: `한 변의 길이가 $x$ cm인 ${names[idx]}의 둘레의 길이는 $${P}$ cm이다. 이를 등식으로 나타내시오.`,
          answer: `$${k}x=${P}$`,
          solution: `${names[idx]}의 둘레의 길이는 $${k}x$ cm이다.\n따라서 $${k}x=${P}$이다.`,
          facts: { mode, k, P },
        };
      }
      if (mode === 2) {
        const p = intBetween(rng, 5, 20) * 100;
        const q = intBetween(rng, 3, 15) * 100;
        const m = intBetween(rng, 2, 9);
        const T = intBetween(rng, 10, 40) * 1000;
        return {
          content: `한 개에 $${p}$원인 빵 $x$개와 한 개에 $${q}$원인 우유 $${m}$개를 사고 $${T}$원을 지불하였다. 이를 등식으로 나타내시오.`,
          answer: `$${p}x+${q * m}=${T}$`,
          solution: `빵값은 $${p}x$원, 우유값은 $${q}\\times${m}=${q * m}$ (원)이다.\n따라서 $${p}x+${q * m}=${T}$이다.`,
          facts: { mode, p, q, m, T },
        };
      }
      if (mode === 3) {
        const a = intBetween(rng, 3, 8);
        const b = a + intBetween(rng, 1, 3);
        const r = intBetween(rng, 1, 9);
        const s = intBetween(rng, 1, 9);
        return {
          content: `$x$명의 학생에게 귤을 $${a}$개씩 나누어 주면 $${r}$개가 남고, $${b}$개씩 나누어 주면 $${s}$개가 부족하다. 이를 등식으로 나타내시오.`,
          answer: `$${a}x+${r}=${b}x-${s}$`,
          solution: `귤의 개수를 두 가지로 나타내면 $${a}x+${r}$과 $${b}x-${s}$이다.\n따라서 $${a}x+${r}=${b}x-${s}$이다.`,
          facts: { mode, a, b, r, s },
        };
      }
      const N = pick(rng, [5000, 10000, 20000] as const);
      const p = intBetween(rng, 3, 9) * 100;
      const C = intBetween(rng, 1, 9) * 100;
      return {
        content: `$${N}$원을 내고 한 장에 $${p}$원인 우표를 $x$장 샀더니 거스름돈이 $${C}$원이었다. 이를 등식으로 나타내시오.`,
        answer: `$${N}-${p}x=${C}$`,
        solution: `우표값은 $${p}x$원이므로 거스름돈은 $${N}-${p}x$원이다.\n따라서 $${N}-${p}x=${C}$이다.`,
        facts: { mode, N, p, C },
      };
    },
  ),

  def(MINOR_EQ, "03", "방정식의 해", SEC.방정식해, "응용", (rng) =>
    attempt(400, (): Body | null => {
      const k = intBetween(rng, 2, 8);
      const r = pick(rng, [k, -k] as const);
      const m = intBetween(rng, 2, 5);
      const n = intBetween(rng, 1, 4);
      const A = 1 - m * n;
      if (A === 0) return null;
      const c = intNonzero(rng, -7, 7);
      const B = -m * c;
      const d = A * r + B;
      const lhs = `x-${m}\\left(${lin(n, c)}\\right)`;
      return {
        content: `$x$가 절댓값이 $${k}$인 수일 때, 방정식 $${lhs}=${d}$의 해를 구하시오.`,
        answer: `$x=${r}$`,
        solution: `절댓값이 $${k}$인 수는 $${k}$와 $${-k}$이다.\n$x=${r}$${eulReul(r)} 대입하면 좌변과 우변이 모두 $${d}$로 같고, $x=${-r}$${eulReul(-r)} 대입하면 등식이 성립하지 않는다.\n따라서 해는 $x=${r}$이다.`,
        facts: { k, r, m, n, c, d },
      };
    }),
  ),

  def(MINOR_EQ, "04", "항등식", SEC.방정식해, "응용", (rng) =>
    attempt(400, (): Body | null => {
      const L = intBetween(rng, 2, 3);
      const items: string[] = [];
      for (let i = 0; i < L; i += 1) {
        const t = intBetween(rng, 0, 2);
        const a = intNonzero(rng, -6, 6);
        const b = intNonzero(rng, -6, 6);
        const c = intNonzero(rng, -7, 7);
        const e = intNonzero(rng, -5, 5);
        if (t === 0) {
          if (a + b === 0) return null;
          items.push(
            `${lin(a, 0)}${b < 0 ? "-" : "+"}${Math.abs(b) === 1 ? "" : Math.abs(b)}x=${lin(a + b, 0)}`,
          );
        } else if (t === 1) {
          items.push(`${a}\\left(x${signed(c)}\\right)=${lin(a, a * c)}`);
        } else {
          if (a - e === 0) return null;
          items.push(
            `${lin(a, c)}${e < 0 ? "+" : "-"}${Math.abs(e) === 1 ? "" : Math.abs(e)}x=${lin(a - e, c)}`,
          );
        }
      }
      for (let i = L; i < 5; i += 1) {
        const t = intBetween(rng, 0, 2);
        const a = intNonzero(rng, -6, 6);
        const b = intNonzero(rng, -6, 6);
        const c = intNonzero(rng, -7, 7);
        const d = intNonzero(rng, -9, 9);
        if (t === 0) {
          items.push(`${lin(a, b)}=${d}`);
        } else if (t === 1) {
          if (a === b) return null;
          items.push(`${lin(a, 0)}=${lin(b, 0)}`);
        } else {
          if (d === a * c) return null;
          items.push(`${a}\\left(x${signed(c)}\\right)=${lin(a, d)}`);
        }
      }
      const line = itemLine(rng, items);
      if (line === null) return null;
      return {
        content: `다음 중 항등식인 것의 개수를 구하시오.\n${line}`,
        answer: `$${L}$개`,
        solution: `미지수에 어떤 값을 대입해도 항상 참이 되는 등식이 항등식이다.\n양변을 각각 정리하여 좌변과 우변이 같은 것을 세면 $${L}$개이다.`,
        facts: { count: L },
      };
    }),
  ),

  def(MINOR_EQ, "06", "등식의 성질", SEC.등식성질, "기본", (rng) =>
    attempt(400, (): Body | null => {
      const L = intBetween(rng, 2, 3);
      const items: string[] = [];
      for (let i = 0; i < L; i += 1) {
        const t = intBetween(rng, 0, 3);
        const p = intNonzero(rng, -6, 6);
        const q = intNonzero(rng, -9, 9);
        const m = intBetween(rng, 2, 7);
        if (t === 0) items.push(`a${signed(q)}=b${signed(q)}`);
        else if (t === 1) items.push(`${lin(p, 0, "a")}=${lin(p, 0, "b")}`);
        else if (t === 2) items.push(`\\dfrac{a}{${m}}=\\dfrac{b}{${m}}`);
        else items.push(`${lin(p, q, "a")}=${lin(p, q, "b")}`);
      }
      for (let i = L; i < 5; i += 1) {
        const t = intBetween(rng, 0, 2);
        const p = intNonzero(rng, -6, 6);
        const q = intNonzero(rng, -9, 9);
        const r = intNonzero(rng, -9, 9);
        const m = intBetween(rng, 2, 7);
        const n = intBetween(rng, 2, 7);
        if (t === 0) {
          if (q === r) return null;
          items.push(`${lin(p, q, "a")}=${lin(p, r, "b")}`);
        } else if (t === 1) {
          if (m === n) return null;
          items.push(`\\dfrac{a}{${m}}=\\dfrac{b}{${n}}`);
        } else {
          if (p === q) return null;
          items.push(`${lin(p, 0, "a")}=${lin(q, 0, "b")}`);
        }
      }
      const line = itemLine(rng, items);
      if (line === null) return null;
      return {
        content: `$a=b$일 때, 다음 중 옳은 것의 개수를 구하시오.\n${line}`,
        answer: `$${L}$개`,
        solution: `등식의 양변에 같은 수를 더하거나 빼거나 곱하거나 $0$이 아닌 같은 수로 나누어도 등식은 성립한다.\n양변에 같은 연산을 한 것만 옳으므로 옳은 것은 $${L}$개이다.`,
        facts: { count: L },
      };
    }),
  ),

  def(
    MINOR_EQ,
    "07",
    "등식의 성질을 이용한 방정식의 풀이",
    SEC.등식성질,
    "기본",
    (rng) =>
      attempt(400, (): Body | null => {
        const mode = intBetween(rng, 0, 1);
        if (mode === 0) {
          // 계수는 **진분수**만 — 가분수는 제품 전처리(`improperToMixed`)가
          // 대분수로 바꿔 지면에 내보낸다. 해설도 역수 분수를 쓰지 않고
          // 「양변에 n 을 곱한 뒤 m 으로 나눈다」로 적는다(같은 이유).
          const n = intBetween(rng, 3, 6);
          const m = intNonzero(rng, -5, 5);
          if (Math.abs(m) === 1 || Math.abs(m) >= n) return null;
          if (gcd(Math.abs(m), n) !== 1) return null;
          const t = intNonzero(rng, -6, 6);
          const r = n * t;
          const c = intNonzero(rng, -9, 9);
          const e = m * t - c;
          const move =
            c > 0
              ? `양변에 $${c}$${eulReul(c)} 더하면`
              : `양변에서 $${-c}$${eulReul(c)} 빼면`;
          return {
            content: `등식의 성질을 이용하여 다음 방정식을 푸시오.\n$${fracRaw(m, n)}x${signed(-c)}=${e}$`,
            answer: `$x=${r}$`,
            solution: `${move} $${fracRaw(m, n)}x=${m * t}$이다.\n양변에 $${n}$${eulReul(n)} 곱하면 $${m}x=${m * r}$이고, 양변을 $${m}$${eulReul(m)} 나누면 $x=${r}$이다.`,
            facts: { mode, m, n, c, e, r },
          };
        }
        const n = intBetween(rng, 2, 6);
        const r = intNonzero(rng, -12, 12);
        const j = intNonzero(rng, -8, 8);
        const p = n * j - r;
        if (p === 0) return null;
        return {
          content: `등식의 성질을 이용하여 다음 방정식을 푸시오.\n$\\dfrac{x${signed(p)}}{${n}}=${j}$`,
          answer: `$x=${r}$`,
          solution: `양변에 $${n}$${eulReul(n)} 곱하면 $x${signed(p)}=${n * j}$이다.\n양변에서 $${p}$를 빼면 $x=${r}$이다.`,
          facts: { mode, n, p, j, r },
        };
      }),
  ),

  def(MINOR_EQ, "08", "이항", SEC.등식성질, "응용", (rng) =>
    attempt(400, (): Body | null => {
      // 답(a+b)을 먼저: a>0 와 b 를 뽑고 양변을 역산한다.
      const a = intBetween(rng, 2, 9);
      const b = intNonzero(rng, -15, 15);
      const C = intNonzero(rng, -5, 5);
      const B = intNonzero(rng, -9, 9);
      const A = a + C;
      const D = b + B;
      if (A === 0 || D === 0) return null;
      return {
        content: `등식 $${lin(A, B)}=${lin(C, D)}$${eulReul(D)} 이항만을 이용하여 $ax=b$ ($a>0$)의 꼴로 나타낼 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
        answer: `$${a + b}$`,
        solution: `$x$항은 좌변으로, 상수항은 우변으로 이항하면 $${a}x=${b}$이다.\n따라서 $a=${a}$, $b=${b}$이므로 $a+b=${a + b}$이다.`,
        facts: { A, B, C, D, a, b },
      };
    }),
  ),

  def(MINOR_EQ, "09", "일차방정식", SEC.일차방정식, "응용", (rng) =>
    attempt(400, (): Body | null => {
      const L = intBetween(rng, 2, 3);
      const items: string[] = [];
      for (let i = 0; i < L; i += 1) {
        const a = intNonzero(rng, -7, 7);
        const b = intNonzero(rng, -9, 9);
        const c = intNonzero(rng, -7, 7);
        const d = intNonzero(rng, -9, 9);
        if (a === c) return null;
        items.push(`${lin(a, b)}=${lin(c, d)}`);
      }
      for (let i = L; i < 5; i += 1) {
        const t = intBetween(rng, 0, 2);
        const a = intNonzero(rng, -6, 6);
        const b = intNonzero(rng, -9, 9);
        const c = intNonzero(rng, -7, 7);
        const d = intNonzero(rng, -9, 9);
        if (t === 0) {
          items.push(`${a}\\left(x${signed(c)}\\right)=${lin(a, a * c)}`);
        } else if (t === 1) {
          if (b === d) return null;
          items.push(`${lin(a, b)}=${lin(a, d)}`);
        } else {
          items.push(`x^{2}${signed(b)}=${lin(c, 0)}`);
        }
      }
      const line = itemLine(rng, items);
      if (line === null) return null;
      return {
        content: `다음 중 일차방정식인 것의 개수를 구하시오.\n${line}`,
        answer: `$${L}$개`,
        solution: `모든 항을 좌변으로 옮겨 정리했을 때 $ax+b=0$ ($a\\ne0$)의 꼴이 되는 것이 일차방정식이다.\n이차항이 남거나 $x$항이 없어지는 것은 일차방정식이 아니므로 일차방정식은 $${L}$개이다.`,
        facts: { count: L },
      };
    }),
  ),

  def(MINOR_EQ, "10", "일차방정식의 풀이", SEC.일차방정식, "기본", (rng) =>
    attempt(400, (): Body | null => {
      const r = intNonzero(rng, -9, 9);
      const a1 = intBetween(rng, 2, 8);
      const bb = intNonzero(rng, -9, 9);
      const d = intBetween(rng, 2, 5);
      const e = intBetween(rng, 1, 9);
      const A = a1 - 1;
      const B = -bb;
      const C = d;
      if (A === 0 || A === C) return null;
      const D = B + (A - C) * r;
      const c1 = D + d * e;
      if (c1 === 0 || Math.abs(c1) > 99) return null;
      const lhs = `${lin(a1, 0)}-\\left(x${signed(bb)}\\right)`;
      const rhs = `${c1}-${d}\\left(${e}-x\\right)`;
      return {
        content: `다음 일차방정식을 푸시오.\n$${lhs}=${rhs}$`,
        answer: `$x=${r}$`,
        solution: `분배법칙으로 괄호를 먼저 풀면 $${lin(A, B)}=${lin(C, D)}$이다.\n$x$항은 좌변으로, 상수항은 우변으로 이항하면 $${lin(A - C, 0)}=${D - B}$이다.\n따라서 $x=${r}$이다.`,
        facts: { r, a1, bb, d, e, c1 },
      };
    }),
  ),

  def(
    MINOR_EQ,
    "11",
    "계수가 소수인 일차방정식의 풀이",
    SEC.일차방정식,
    "응용",
    (rng) =>
      attempt(600, (): Body | null => {
        const r = intNonzero(rng, -9, 9);
        const A = intNonzero(rng, -9, 9) * 10;
        const C = intNonzero(rng, -9, 9) * 10;
        if (A === C) return null;
        const B = intNonzero(rng, -30, 30) * 5;
        const D = B + (A - C) * r;
        if (D === 0 || Math.abs(D) > 900) return null;
        const lhs = decLin(A, B);
        const rhs = decLin(C, D);
        return {
          content: `다음 일차방정식을 푸시오.\n$${lhs}=${rhs}$`,
          answer: `$x=${r}$`,
          solution: `계수를 정수로 고치기 위해 양변에 $100$을 곱하면 $${lin(A, B)}=${lin(C, D)}$이다.\n이항하여 정리하면 $${lin(A - C, 0)}=${D - B}$이다.\n따라서 $x=${r}$이다.`,
          facts: { r, A, B, C, D },
        };
      }),
  ),

  def(
    MINOR_EQ,
    "12",
    "계수가 분수인 일차방정식의 풀이",
    SEC.일차방정식,
    "응용",
    (rng) =>
      attempt(800, (): Body | null => {
        const r = intNonzero(rng, -9, 9);
        const m = intBetween(rng, 2, 6);
        const n = intBetween(rng, 2, 6);
        if (m === n) return null;
        const L = lcm(m, n);
        const u = L / m;
        const v = L / n;
        const s = pick(rng, [1, -1] as const);
        const a = intNonzero(rng, -7, 7);
        const b = intNonzero(rng, -9, 9);
        const c = intNonzero(rng, -7, 7);
        const d = intNonzero(rng, -9, 9);
        const xc = u * a + s * v * c;
        if (xc === 0) return null;
        const kNum = xc * r + (u * b + s * v * d);
        if (kNum % L !== 0) return null;
        const k = kNum / L;
        const expr = `\\dfrac{${lin(a, b)}}{${m}}${s > 0 ? "+" : "-"}\\dfrac{${lin(c, d)}}{${n}}`;
        return {
          content: `다음 일차방정식을 푸시오.\n$${expr}=${k}$`,
          answer: `$x=${r}$`,
          solution: `계수를 정수로 고치기 위해 양변에 분모의 최소공배수 $${L}$${eulReul(L)} 곱하면 $${lin(xc, u * b + s * v * d)}=${L * k}$이다.\n이항하여 정리하면 $${lin(xc, 0)}=${L * k - (u * b + s * v * d)}$이다.\n따라서 $x=${r}$이다.`,
          facts: { r, a, b, c, d, m, n, s, k },
        };
      }),
  ),

  def(
    MINOR_EQ,
    "13",
    "계수에 소수와 분수가 섞인 일차방정식의 풀이",
    SEC.일차방정식,
    "심화",
    (rng) =>
      attempt(800, (): Body | null => {
        const r = intNonzero(rng, -9, 9);
        const m = intBetween(rng, 2, 5);
        const a = intNonzero(rng, -6, 6);
        const b = intNonzero(rng, -9, 9);
        const P = intNonzero(rng, -9, 9) * 10;
        const xc = 100 * a - m * P;
        if (xc === 0) return null;
        const QNum = 100 * (a * r + b) - m * P * r;
        if (QNum % m !== 0) return null;
        const Q = QNum / m;
        if (Q === 0 || Q % 5 !== 0 || Math.abs(Q) > 900) return null;
        return {
          content: `다음 일차방정식을 푸시오.\n$\\dfrac{${lin(a, b)}}{${m}}=${decLin(P, Q)}$`,
          answer: `$x=${r}$`,
          solution: `계수를 모두 정수로 고치기 위해 양변에 $${100 * m}$을 곱하면 $${lin(100 * a, 100 * b)}=${lin(m * P, m * Q)}$이다.\n이항하여 정리하면 $${lin(xc, 0)}=${m * Q - 100 * b}$이다.\n따라서 $x=${r}$이다.`,
          facts: { r, m, a, b, P, Q },
        };
      }),
  ),

  def(
    MINOR_EQ,
    "14",
    "비례식으로 주어진 일차방정식의 풀이",
    SEC.일차방정식,
    "응용",
    (rng) =>
      attempt(600, (): Body | null => {
        const r = intNonzero(rng, -9, 9);
        const p = intNonzero(rng, -9, 9);
        const q = intBetween(rng, 2, 7);
        const c = intBetween(rng, 1, 5);
        const e = intBetween(rng, 2, 7);
        const xc = e - q * c;
        if (xc === 0) return null;
        const dNum = e * (r + p) - q * c * r;
        if (dNum % q !== 0) return null;
        const d = dNum / q;
        if (d === 0 || Math.abs(d) > 40) return null;
        return {
          content: `비례식 $\\left(x${signed(p)}\\right):${q}=\\left(${lin(c, d)}\\right):${e}$를 만족시키는 $x$의 값을 구하시오.`,
          answer: `$x=${r}$`,
          solution: `비례식 $a:b=c:d$에서 $ad=bc$이다.\n$${e}\\left(x${signed(p)}\\right)=${q}\\left(${lin(c, d)}\\right)$이므로 정리하면 $${lin(xc, 0)}=${q * d - e * p}$이다.\n따라서 $x=${r}$이다.`,
          facts: { r, p, q, c, d, e },
        };
      }),
  ),

  def(
    MINOR_EQ,
    "15",
    "일차방정식의 해가 주어진 경우",
    SEC.해응용,
    "응용",
    (rng) =>
      attempt(400, (): Body | null => {
        const mode = intBetween(rng, 0, 1);
        const aVal = intNonzero(rng, -12, 12);
        const r = intNonzero(rng, -8, 8);
        if (mode === 0) {
          const pp = intNonzero(rng, -7, 7);
          const qq = intNonzero(rng, -7, 7);
          if (pp === qq) return null;
          const ss = (pp - qq) * r - aVal;
          if (ss === 0 || Math.abs(ss) > 99) return null;
          return {
            content: `일차방정식 $${lin(pp, 0)}-a=${lin(qq, 0)}${signed(ss)}$의 해가 $x=${r}$일 때, 상수 $a$의 값을 구하시오.`,
            answer: `$${aVal}$`,
            solution: `$x=${r}$${eulReul(r)} 대입하면 $${pp * r}-a=${qq * r + ss}$이다.\n따라서 $a=${aVal}$이다.`,
            facts: { mode, aVal, r, pp, qq, ss },
          };
        }
        const n = intBetween(rng, 2, 6);
        const w = intNonzero(rng, -6, 6);
        const a2 = r - n * w;
        if (a2 === 0) return null;
        const j = intNonzero(rng, -5, 5);
        const ss = w - j * r;
        if (ss === 0 || Math.abs(ss) > 99) return null;
        return {
          content: `일차방정식 $\\dfrac{x-a}{${n}}=${lin(j, 0)}${signed(ss)}$의 해가 $x=${r}$일 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${a2}$`,
          solution: `$x=${r}$${eulReul(r)} 대입하면 $\\dfrac{${r}-a}{${n}}=${j * r + ss}$이다.\n양변에 $${n}$${eulReul(n)} 곱하면 $${r}-a=${n * (j * r + ss)}$이다.\n따라서 $a=${a2}$이다.`,
          facts: { mode, aVal: a2, r, n, j, ss },
        };
      }),
  ),

  def(
    MINOR_EQ,
    "16",
    "두 일차방정식의 해가 서로 같은 경우",
    SEC.해응용,
    "심화",
    (rng) =>
      attempt(400, (): Body | null => {
        // 두 방정식이 공유하는 해 r 을 먼저 뽑고, 양쪽을 그 해에 맞춰 역산한다.
        const r = intNonzero(rng, -8, 8);
        const A = intNonzero(rng, -7, 7);
        const C = intNonzero(rng, -7, 7);
        if (A === C) return null;
        const B = intNonzero(rng, -9, 9);
        const D = B + (A - C) * r;
        if (D === 0) return null;
        const g = intNonzero(rng, -5, 5);
        if (Math.abs(g) === 1) return null;
        const t = intNonzero(rng, -6, 6);
        const ss = intNonzero(rng, -5, 5);
        const aVal = g * (r + t) - ss * r;
        if (aVal === 0) return null;
        const eq1 = `${lin(A, B)}=${lin(C, D)}`;
        const eq2 = `${g}\\left(x${signed(t)}\\right)=a${signed(ss)}x`;
        return {
          content: `$x$에 대한 두 일차방정식 $${eq1}$, $${eq2}$의 해가 서로 같을 때, 상수 $a$의 값을 구하시오.`,
          answer: `$${aVal}$`,
          solution: `해를 구할 수 있는 방정식 $${eq1}$${eulReul(D)} 먼저 풀면 $x=${r}$이다.\n이 해를 $${eq2}$에 대입하면 $${g * (r + t)}=a${signed(ss * r)}$이다.\n따라서 $a=${aVal}$이다.`,
          facts: { r, A, B, C, D, g, t, ss, aVal },
        };
      }),
  ),

  def(
    MINOR_EQ,
    "17",
    "해에 대한 조건이 주어진 경우",
    SEC.해응용,
    "심화",
    (rng) =>
      attempt(600, (): Body | null => {
        const mode = intBetween(rng, 0, 1);
        const k = intBetween(rng, 2, 5) * (mode === 0 ? 1 : -1);
        const qq = intNonzero(rng, -6, 6);
        const pp = qq + k;
        if (pp === 0) return null;
        const ss = intBetween(rng, 6, 30);
        // 자연수 $a$ 를 훑는다. 훑는 범위는 넉넉히 잡고 **해의 조건으로만** 거른다 —
        // 범위가 조건을 대신 하면 그 조건은 죽은 규칙이 되어 변이로 시험할 수 없다
        // (2026-08-21 「가드가 0을 내면 «없다»가 아니라 «못 센다»일 수 있다」).
        const vals: number[] = [];
        for (let a = 1; a <= ss; a += 1) {
          if ((ss - a) % k !== 0) continue;
          const x = (ss - a) / k;
          if (mode === 0 ? x < 1 : x > -1) continue;
          vals.push(a);
        }
        if (vals.length < 2 || vals.length > 5) return null;
        const eq = `${lin(pp, 0)}+a=${lin(qq, 0)}${signed(ss)}`;
        if (mode === 0) {
          return {
            content: `$x$에 대한 일차방정식 $${eq}$의 해가 자연수가 되도록 하는 자연수 $a$의 값을 모두 구하시오.`,
            answer: vals.map((v) => `$${v}$`).join(", "),
            solution: `주어진 방정식을 풀면 $x=\\dfrac{${ss}-a}{${k}}$이다.\n$x$가 자연수이려면 $${ss}-a$가 $${k}$의 배수이면서 $${k}$ 이상이어야 한다.\n따라서 자연수 $a$의 값은 ${vals.map((v) => `$${v}$`).join(", ")}이다.`,
            facts: { mode, pp, qq, ss, k, count: vals.length },
          };
        }
        return {
          content: `$x$에 대한 일차방정식 $${eq}$의 해가 음의 정수가 되도록 하는 자연수 $a$의 개수를 구하시오.`,
          answer: `$${vals.length}$개`,
          solution: `주어진 방정식을 풀면 $x=-\\dfrac{${ss}-a}{${-k}}$이다.\n$x$가 음의 정수이려면 $${ss}-a$가 $${-k}$의 배수이면서 $${-k}$ 이상이어야 한다.\n조건을 만족시키는 자연수 $a$는 ${vals.map((v) => `$${v}$`).join(", ")}이므로 $${vals.length}$개이다.`,
          facts: { mode, pp, qq, ss, k, count: vals.length },
        };
      }),
  ),

  def(MINOR_EQ, "18", "특수한 해를 갖는 경우", SEC.해응용, "심화", (rng) =>
    attempt(400, (): Body | null => {
      const mode = intBetween(rng, 0, 1);
      if (mode === 0) {
        // 답(a+b)을 먼저: a=m, b 를 뽑고 좌변 상수항을 역산한다.
        const m = intNonzero(rng, -6, 6);
        if (Math.abs(m) === 1) return null;
        const bVal = intNonzero(rng, -8, 8);
        const ee = intNonzero(rng, -9, 9);
        const cc = m * bVal - ee;
        if (cc === 0) return null;
        return {
          content: `$x$에 대한 방정식 $ax${signed(-cc)}=${m}\\left(x-b\\right)${signed(ee)}$의 해가 무수히 많을 때, 상수 $a$, $b$에 대하여 $a+b$의 값을 구하시오.`,
          answer: `$${m + bVal}$`,
          solution: `해가 무수히 많으려면 양변의 $x$의 계수와 상수항이 각각 같아야 한다.\n$x$의 계수에서 $a=${m}$이고, 상수항에서 $${-cc}=${-m * bVal}${signed(ee)}$이므로 $b=${bVal}$이다.\n따라서 $a+b=${m + bVal}$이다.`,
          facts: { mode, m, bVal, ee, cc },
        };
      }
      const aVal = intNonzero(rng, -9, 9);
      const pp = -2 * aVal;
      const qq = intNonzero(rng, -9, 9);
      return {
        content: `등식 $\\left(a${signed(pp)}\\right)x=${qq}-ax$를 만족시키는 $x$의 값이 존재하지 않을 때, 상수 $a$의 값을 구하시오.`,
        answer: `$${aVal}$`,
        solution: `우변의 $ax$를 좌변으로 이항하면 $\\left(2a${signed(pp)}\\right)x=${qq}$이다.\n$x$의 값이 존재하지 않으려면 $x$의 계수가 $0$이고 우변이 $0$이 아니어야 한다.\n$2a${signed(pp)}=0$에서 $a=${aVal}$이다.`,
        facts: { mode, aVal, pp, qq },
      };
    }),
  ),
];

export const M1_EXPR: TypeEntry[] = [...EXPR_TYPES, ...EQ_TYPES];
