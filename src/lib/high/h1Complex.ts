/**
 * 공통수학1 「복소수」 — RPM 공통수학1(2022) 색인 14유형. **물결 1 세션 `h1-complex` 소유.**
 *
 * 본보기 `h1Identity.ts` 를 그대로 따른다 — 답을 먼저 정하고 식을 짓는다 · 꼴(mode)마다 칸 ·
 * 대표문제 꼴은 `기본` · 수식 뒤 조사는 `josa.ts` 로만. 이 중단원이라서 더한 것은 셋이다:
 *
 * ## ⑴ 정답이 복소수이면 오답 넷을 여기서 낸다
 *
 * 공용 오답 경로(`deriveFormats.numericMistakes`)는 정답 속 **첫 수**만 흔든다. `$3-2i$` 의 보기가
 * `$4-2i$`·`$2-2i$`·`$-3-2i$` 로 나가 **허수부분이 다섯 보기에서 다 같다** — 허수부분만 맞춰 보고
 * 지워 낸다. 그래서 정답이 복소수인 꼴은 그 풀이에서 틀리기 쉬운 자리(켤레 · 부호 · 실수부분과
 * 허수부분 자리 바꿈 · $i^{2}=1$ 로 셈)로 `distractors` 를 짓는다. 정답이 정수·분수면 공용 경로다.
 *
 * ## ⑵ 보기 ㄱ·ㄴ·ㄷ 을 고르는 대표문제는 같은 성질을 수로 묻는다
 *
 * 01·07·13 의 대표문제는 「옳은 것을 모두 고르면」·「옳은 것만을 있는 대로 고르시오」다. 우리
 * 정답은 수식 한 덩어리여야 한다(`highRegistry` 「해설 끝 줄이 답의 수식」 · 오답도 수식). 그래서
 * 그 성질을 **수로 묻는 꼴**(개수 · 값)을 `기본` 칸에 둔다. 문장 정답 형식이 생기면 옮길 자리다.
 *
 * ## ⑶ `|…|` 와 단위 뒤에는 조사를 두지 않는다
 *
 * `josa.finalOf` 는 `|` 로 끝나는 수식을 못 읽어 던진다(옳다 — 조용히 아무 조사나 붙이지 않는다).
 * 발문을 「…$|a|$의」·「…일 때」처럼 조사가 필요 없는 말로 잇는다.
 *
 * ## 우리 단원(시드 공통수학1 「2. 방정식과 부등식」)
 *
 *   01·05·06 → 복소수 · 02·03·08 → 복소수의 연산 · 04·07·13·14 → 켤레복소수의 성질
 *   · 09·10 → i의 거듭제곱 · 11·12 → 음수의 제곱근.
 *   RPM 개념 상자는 04·08 을 「복소수의 사칙연산」에 두지만 04 는 제목이 켤레복소수를 가리킨다(§1-6).
 *
 * RPM 원본은 구조만 봤다(`.rpm-src/22/`). 본문·수치를 옮기지 않는다(저작권).
 */
import type { Difficulty } from "@/contracts/difficulty";

import type { Rng } from "../elementary/types";

import { eul, eun, ga, gwa, ira, ro } from "./josa";
import {
  $,
  attempt,
  coefPrefix,
  distinctInts,
  numAnswer,
  nz,
  pickDistractors,
  pickOne,
  plusConst,
  randInt,
  Retry,
  withSign,
} from "./pick";
import {
  cAdd,
  cConj,
  cDiv,
  cMul,
  cplx,
  cPow,
  cSub,
  cTex,
  gcd,
  q,
  qTex,
  surd,
  surdPmTex,
  surdTex,
  type Cx,
  type Q,
} from "./numbers";
import {
  factorParen,
  factorTex,
  fromRoots,
  linTex,
  paren,
  polyTex,
  scale,
} from "./poly";
import type { HighHold, HighProblem, HighTypeEntry } from "./types";

const GRADE = "공통수학1";
const BOOK = "공통수학1";
const MINOR = "복소수";

/** 우리 `Unit.section` 정확한 이름 (prisma/seed-data/units.ts 공통수학1 2. 방정식과 부등식). */
const SEC = {
  복소수: "복소수",
  연산: "복소수의 연산",
  켤레: "켤레복소수의 성질",
  거듭제곱: "i의 거듭제곱",
  음수: "음수의 제곱근",
} as const;

type Body = {
  content: string;
  answer: string;
  solution: string;
  difficulty: Difficulty;
  facts: Record<string, number>;
  distractors?: readonly string[];
};

// ───────────────────────────── 지면 ─────────────────────────────

const cx = (re: number | Q, im: number | Q = 0): Cx => cplx(re, im);

const isZero = (z: Cx): boolean => z.re.n === 0 && z.im.n === 0;

/** 곱으로 쓸 때 괄호 — `(3-2i)`. */
const cParen = (z: Cx): string => `(${cTex(z)})`;

/**
 * 유리수 정답 — `numAnswer` 의 분수판. **0 이면 다시 뽑는다**(공용 오답 경로가 0 에서 넷을 못 낸다).
 * 공용 후보: `pick.numAnswer` 옆 — 이차방정식·부등식 모듈도 분수 정답을 낸다.
 */
function qAnswer(x: Q): string {
  if (x.n === 0) throw new Retry("정답이 0 이라 객관식 오답을 못 만든다");
  return $(qTex(x));
}

/**
 * 복소수 정답과 오답 넷 — 후보에서 정답·겹침을 거른다. 모자라면 `null`(다시 뽑는다).
 * 후보는 **그 풀이에서 틀리기 쉬운 자리**다(켤레 · 부호 · 자리 바꿈). 뒤에 늘 붙이는
 * `fallback` 은 넷을 못 채울 때만 쓰인다.
 */
function cChoices(
  rng: Rng,
  ans: Cx,
  cands: readonly Cx[],
): { answer: string; distractors: string[] } | null {
  if (isZero(ans)) throw new Retry("정답이 0 이다");
  const fallback = [
    cConj(ans),
    cx(q(-ans.re.n, ans.re.d), ans.im),
    cx(ans.im, ans.re),
  ];
  const ds = pickDistractors(
    rng,
    cTex(ans),
    [...cands, ...fallback].filter((z) => !isZero(z)).map(cTex),
  );
  if (ds === null) return null;
  return { answer: $(cTex(ans)), distractors: ds };
}

/** `a` 를 곱하는 계수 — `3` · `-` · `` (1). */
const coef = coefPrefix;

/** 이어 붙이는 항 — `+2(3-i)` · `-(3-i)`. 계수 ±1 은 숫자를 안 쓴다. */
function sgnTerm(k: number, body: string): string {
  const abs = Math.abs(k);
  return `${k < 0 ? "-" : "+"}${abs === 1 ? "" : abs}${body}`;
}

/**
 * 근을 늘어놓은 합 — `0+(-4)+(-1)`. 0 은 **맨 앞**에 둔다: 뒤에 오면 `+0` 이 찍혀
 * 지면 냄새가 된다(`midPage.pageSmells` 「상수 0 을 더했다」 — 실측으로 걸렸다).
 */
function sumTex(xs: readonly number[]): string {
  const ordered = [...xs].sort((a, b) => Number(b === 0) - Number(a === 0));
  return ordered.map((x, i) => (i === 0 ? String(x) : `+${paren(x)}`)).join("");
}

// ───────────────────────────── 01 ─────────────────────────────
// 복소수의 뜻과 분류 (표: 하 1 — 전부 기본)
// 꼴 0 (기본·대표 대신): 수 여섯 가운데 실수·허수·순허수의 개수 — 대표의 「옳은 것을 모두 고르면」을 수로
// 꼴 1 (기본): 모양을 바꿔 쓴 복소수의 실수부분·허수부분

type Item = { tex: string; value: string; cls: 0 | 1 | 2 };

/** 수 하나 — `cls` 0 실수 · 1 순허수가 아닌 허수 · 2 순허수. 틀마다 한 번만 쓴다. */
const ITEM_MAKERS: readonly ((rng: Rng) => Item)[] = [
  (rng) => {
    const n = nz(rng, -9, 9);
    return { tex: String(n), value: String(n), cls: 0 };
  },
  (rng) => {
    const a = nz(rng, 1, 5);
    const m = pickOne(rng, [2, 3, 5, 6, 7]);
    const t = `${a}${pickOne(rng, ["+", "-"])}\\sqrt{${m}}`;
    return { tex: t, value: t, cls: 0 };
  },
  (rng) => {
    const k = randInt(rng, 2, 5);
    return { tex: `\\sqrt{-${k * k}}`, value: `${k}i`, cls: 2 };
  },
  (rng) => {
    const a = nz(rng, -6, 6);
    const k = randInt(rng, 2, 5);
    return {
      tex: `${a}+\\sqrt{-${k * k}}`,
      value: cTex(cx(a, k)),
      cls: 1,
    };
  },
  (rng) => {
    const n = randInt(rng, 1, 4);
    return {
      tex: `i^{2}+${n}`,
      value: String(n - 1),
      cls: 0,
    };
  },
  (rng) => {
    const b = pickOne(rng, [-3, -2, 2, 3, 5]);
    return { tex: `${b}i`, value: `${b}i`, cls: 2 };
  },
  (rng) => {
    const z = cx(nz(rng, -7, 7), nz(rng, -7, 7));
    return { tex: cTex(z), value: cTex(z), cls: 1 };
  },
  (rng) => {
    const s = pickOne(rng, [1, -1]);
    const t = s > 0 ? "(1+i)^{2}" : "(1-i)^{2}";
    return { tex: t, value: s > 0 ? "2i" : "-2i", cls: 2 };
  },
  (rng) => {
    const a = randInt(rng, 1, 4);
    return {
      tex: `(${a}+i)(${a}-i)`,
      value: String(a * a + 1),
      cls: 0,
    };
  },
  (rng) => {
    const m = pickOne(rng, [2, 3, 5, 7]);
    return { tex: `\\sqrt{${m}}i`, value: `\\sqrt{${m}}i`, cls: 2 };
  },
  () => ({ tex: "i^{3}", value: "-i", cls: 2 }),
  () => ({ tex: "i^{4}", value: "1", cls: 0 }),
];

const KIND_NAME = ["실수", "허수", "순허수"] as const;

function t01(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const ids = distinctInts(rng, 0, ITEM_MAKERS.length - 1, 6);
      const items = ids.map((id) => ITEM_MAKERS[id]!(rng));
      const kind = randInt(rng, 0, 2);
      const hit = items.filter((it) =>
        kind === 0 ? it.cls === 0 : kind === 1 ? it.cls !== 0 : it.cls === 2,
      );
      const n = hit.length;
      const changed = items.filter((it) => it.tex !== it.value);
      const lines = [
        ...(changed.length > 0
          ? [
              changed.map((it) => `$${it.tex}=${it.value}$`).join(", ") +
                "이므로",
            ]
          : []),
        `실수는 $a+bi$ ($a$, $b$는 실수)에서 $b=0$인 수, 허수는 $b\\ne 0$인 수, 순허수는 $a=0$, $b\\ne 0$인 수이다.`,
        `따라서 ${KIND_NAME[kind]}는 ${hit.map((it) => `$${it.tex}$`).join(", ")}의 $${n}$개이다.`,
      ];
      return {
        content: `다음 수 중 ${KIND_NAME[kind]}의 개수를 구하시오.\n${items.map((it) => `$${it.tex}$`).join(", ")}`,
        answer: numAnswer(n),
        solution: lines.join("\n"),
        difficulty: "기본",
        facts: { mode, kind, n },
      };
    });
  return attempt<Body>((): Body | null => {
    const re = nz(rng, -9, 9);
    const form = randInt(rng, 0, 2);
    const im =
      form === 1 ? pickOne(rng, [-5, -4, -3, -2, 2, 3, 4, 5]) : nz(rng, -9, 9);
    const d = randInt(rng, 2, 3);
    const imTerm = im === 1 ? "i" : im === -1 ? "-i" : `${im}i`;
    const tex =
      form === 0
        ? `${imTerm}${plusConst(re)}`
        : form === 1
          ? `${re}${im > 0 ? "+" : "-"}\\sqrt{-${im * im}}`
          : `\\dfrac{${d * re}${im > 0 ? "+" : "-"}${Math.abs(d * im) === 1 ? "" : Math.abs(d * im)}i}{${d}}`;
    const ask = randInt(rng, 0, 2);
    const [et, ev] = (
      [
        ["a+b", re + im],
        ["a-b", re - im],
        ["ab", re * im],
      ] as const
    )[ask]!;
    return {
      content: `복소수 $${tex}$의 실수부분을 $a$, 허수부분을 $b$${ira("b")} 할 때, $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$${tex}=${cTex(cx(re, im))}$이므로 실수부분은 $${re}$, 허수부분은 $${im}$이다.`,
        `즉 $a=${re}$, $b=${im}$이므로 $${et}=${ev}$`,
      ].join("\n"),
      difficulty: "기본",
      facts: { mode, re, im, form, ask },
    };
  });
}

// ───────────────────────────── 02 ─────────────────────────────
// 복소수의 사칙연산 (표: 하1 중하1 중2)
// 꼴 0 (기본·대표): (a+bi)(c+di) + (나눗셈) 을 p+qi 로 → p±q
// 꼴 1 (기본): 실수배의 합과 차 — 답이 복소수(오답 넷)
// 꼴 2 (응용): (p+q√r i)² + (p−q√r i)²
// 꼴 3 (응용): 정의된 연산 x⋆y 의 실수부분·허수부분

function t02(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const z1 = cx(nz(rng, -4, 4), nz(rng, -5, 5));
      const z2 = cx(nz(rng, -4, 4), nz(rng, -5, 5));
      const w = cx(randInt(rng, -4, 4), nz(rng, -4, 4));
      const den = cx(nz(rng, -3, 3), nz(rng, -3, 3));
      const num = cMul(w, den);
      if (num.re.n === 0 || num.im.n === 0) return null;
      const prod = cMul(z1, z2);
      const v = cAdd(prod, w);
      const p = v.re.n;
      const qv = v.im.n;
      const ask = randInt(rng, 0, 1);
      const [et, ev] = ask === 0 ? ["a+b", p + qv] : ["a-b", p - qv];
      const expr = `${cParen(z1)}${cParen(z2)}+\\dfrac{${cTex(num)}}{${cTex(den)}}`;
      const conj = cConj(den);
      const top = cMul(num, conj);
      const norm = cMul(den, conj).re.n;
      return {
        content: `$${expr}$${eul(expr)} 계산하여 $a+bi$의 꼴로 나타낼 때, $${et}$의 값을 구하시오. (단, $a$, $b$는 실수이다.)`,
        answer: numAnswer(ev),
        solution: [
          `$${cParen(z1)}${cParen(z2)}=${cTex(prod)}$`,
          `$\\dfrac{${cTex(num)}}{${cTex(den)}}=\\dfrac{${cParen(num)}${cParen(conj)}}{${cParen(den)}${cParen(conj)}}=\\dfrac{${cTex(top)}}{${norm}}=${cTex(w)}$`,
          `따라서 주어진 식은 $${cTex(prod)}+${cParen(w)}=${cTex(v)}$이므로 $a=${p}$, $b=${qv}$`,
          `$${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          a1: z1.re.n,
          b1: z1.im.n,
          a2: z2.re.n,
          b2: z2.im.n,
          nr: num.re.n,
          ni: num.im.n,
          dr: den.re.n,
          di: den.im.n,
          ask,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const k1 = pickOne(rng, [2, 3, 4]);
      const k2 = pickOne(rng, [2, 3, 5]);
      const z1 = cx(nz(rng, -5, 5), nz(rng, -5, 5));
      const z2 = cx(nz(rng, -6, 6), nz(rng, -6, 6));
      const z3 = cx(nz(rng, -4, 4), nz(rng, -4, 4));
      const v = cSub(cAdd(cMul(cx(k1), z1), z2), cMul(cx(k2), z3));
      const wrongSign = cAdd(cAdd(cMul(cx(k1), z1), z2), cMul(cx(k2), z3));
      const noDist = cSub(
        cAdd(cx(k1 * z1.re.n, z1.im), z2),
        cx(k2 * z3.re.n, z3.im),
      );
      const got = cChoices(rng, v, [wrongSign, noDist, cConj(v)]);
      if (got === null) return null;
      const expr = `${k1}${cParen(z1)}+${cParen(z2)}-${k2}${cParen(z3)}`;
      return {
        content: `$${expr}$의 값을 구하시오.`,
        answer: got.answer,
        solution: [
          `(주어진 식)$=${cTex(cMul(cx(k1), z1))}+${cParen(z2)}-${cParen(cMul(cx(k2), z3))}$`,
          `실수부분은 실수부분끼리, 허수부분은 허수부분끼리 계산하면 $${cTex(v)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          k1,
          k2,
          a1: z1.re.n,
          b1: z1.im.n,
          a2: z2.re.n,
          b2: z2.im.n,
          a3: z3.re.n,
          b3: z3.im.n,
        },
        distractors: got.distractors,
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -4, 4);
      const k = pickOne(rng, [1, 2]);
      const r = pickOne(rng, [2, 3, 5, 6, 7]);
      const v = 2 * (p * p - k * k * r);
      const plus = surdTex(surd(p, k, -r));
      const minus = surdTex(surd(p, -k, -r));
      const cross = `\\sqrt{${r}}i`;
      const sq = k * k * r;
      return {
        content: `$(${plus})^{2}+(${minus})^{2}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$(${plus})^{2}=${p * p}${sgnTerm(2 * p * k, cross)}-${sq}$`,
          `$(${minus})^{2}=${p * p}${sgnTerm(-2 * p * k, cross)}-${sq}$`,
          `따라서 주어진 식은 $2\\times(${p * p}-${sq})=${v}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, k, r },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = pickOne(rng, [1, 2, 3]);
    const b = pickOne(rng, [-2, -1, 1, 2]);
    const c = pickOne(rng, [-2, -1, 1, 2]);
    const x = cx(nz(rng, -4, 4), nz(rng, -4, 4));
    const y = cx(nz(rng, -4, 4), nz(rng, -5, 5));
    const part = randInt(rng, 0, 1);
    const xy = cMul(x, y);
    const v = cAdd(cAdd(cMul(cx(a), xy), cMul(cx(b), x)), cMul(cx(c), y));
    const ans = part === 0 ? v.re.n : v.im.n;
    const def = linTex([
      [a, "xy"],
      [b, "x"],
      [c, "y"],
    ]);
    const partName = part === 0 ? "실수부분" : "허수부분";
    return {
      content: `임의의 두 복소수 $x$, $y$에 대하여 $x\\star y=${def}$${ira(def)} 할 때, $${cParen(x)}\\star${cParen(y)}$의 ${partName}을 구하시오.`,
      answer: numAnswer(ans),
      solution: [
        `$${cParen(x)}\\star${cParen(y)}=${coef(a)}${cParen(x)}${cParen(y)}${sgnTerm(b, cParen(x))}${sgnTerm(c, cParen(y))}$`,
        `$=${coef(a)}${cParen(xy)}${sgnTerm(b, cParen(x))}${sgnTerm(c, cParen(y))}=${cTex(v)}$`,
        `따라서 구하는 ${partName}은 $${ans}$이다.`,
      ].join("\n"),
      difficulty: "응용",
      facts: {
        mode,
        a,
        b,
        c,
        xr: x.re.n,
        xi: x.im.n,
        yr: y.re.n,
        yi: y.im.n,
        part,
      },
    };
  });
}

// ───────────────────────────── 03 ─────────────────────────────
// 복소수가 주어질 때의 식의 값 (표: 중하1 중1 상중1)
// 꼴 0 (기본·대표): x=(p+k√r i)/d → dx−p=k√r i 를 제곱해 이차식의 값
// 꼴 1 (기본): z=p+k√r i 일 때 z²−2pz+c
// 꼴 2 (응용): 나눗셈으로 준 z=u+vi 가 z²−2uz+M=0 을 만족 → 삼차식의 값
// 꼴 3 (심화하): x²=p+qi 일 때 x⁴+Bx³−2px²−2Bpx+c+BN/x

function t03(rng: Rng): Body {
  const mode = randInt(rng, 0, 3);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const s = surd(
        nz(rng, -3, 3),
        pickOne(rng, [1, 2]),
        -pickOne(rng, [2, 3, 5]),
        pickOne(rng, [2, 3]),
      );
      if (s.b <= 0 || s.d === 1) return null;
      const p = s.a;
      const k = s.b;
      const r = -s.r;
      const d = s.d;
      const L2 = d * d;
      const L1 = -2 * d * p;
      const L0 = p * p + k * k * r;
      const g = gcd(gcd(L2, L1), L0);
      const e2 = L2 / g;
      const e1 = L1 / g;
      const e0 = L0 / g;
      const A = pickOne(rng, [1, 2, 3]);
      const c = nz(rng, -6, 6);
      const value = -A * e0 + c;
      const poly = [c, A * e1, A * e2];
      const xs = surdTex(s);
      const P = polyTex(poly);
      const base = polyTex([0, e1, e2]);
      const rad = surdTex(surd(0, k, -r));
      return {
        content: `$x=${xs}$일 때, $${P}$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$x=${xs}$에서 $${coef(d)}x${plusConst(-p)}=${rad}$`,
          `양변을 제곱하면 $${polyTex([p * p, -2 * d * p, d * d])}=${-k * k * r}$`,
          g === 1
            ? `즉 $${base}=${-e0}$`
            : `양변을 $${g}$${ro(String(g))} 나누면 $${base}=${-e0}$`,
          `따라서 $${P}=${A === 1 ? "" : `${A}(${base})`}${A === 1 ? `(${base})` : ""}${plusConst(c)}=${A === 1 ? String(-e0) : `${A}\\times ${paren(-e0)}`}${plusConst(c)}=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, k, r, d, c0: poly[0]!, c1: poly[1]!, c2: poly[2]! },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -5, 5);
      const k = pickOne(rng, [1, 2, 3]);
      const r = pickOne(rng, [2, 3, 5, 6, 7]);
      const c = randInt(rng, -9, 9);
      const z = surdTex(surd(p, k, -r));
      const expr = polyTex([c, -2 * p, 1], "z");
      const N = p * p + k * k * r;
      const value = -N + c;
      return {
        content: `$z=${z}$일 때, $${expr}$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$z=${z}$에서 $${factorTex(p, "z")}=${surdTex(surd(0, k, -r))}$`,
          `양변을 제곱하면 $${polyTex([p * p, -2 * p, 1], "z")}=${-k * k * r}$이므로 $${polyTex([0, -2 * p, 1], "z")}=${-N}$`,
          c === 0
            ? `따라서 구하는 값은 $${value}$`
            : `따라서 $${expr}=${-N}${plusConst(c)}=${value}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, k, r, c },
      };
    });
  if (mode === 2)
    return attempt<Body>((): Body | null => {
      const u = nz(rng, -3, 3);
      const v = nz(rng, -3, 3);
      const z = cx(u, v);
      const den = cx(nz(rng, -2, 2), nz(rng, -2, 2));
      const num = cMul(z, den);
      if (num.re.n === 0 || num.im.n === 0) return null;
      const t = nz(rng, -4, 4);
      const c = nz(rng, -6, 6);
      const M = u * u + v * v;
      const cubic = [M * t + c, M - 2 * u * t, t - 2 * u, 1];
      const quad = polyTex([M, -2 * u, 1], "z");
      const cubicT = polyTex(cubic, "z");
      const zq = `\\dfrac{${cTex(num)}}{${cTex(den)}}`;
      return {
        content: `$z=${zq}$일 때, $${cubicT}$의 값을 구하시오.`,
        answer: numAnswer(c),
        solution: [
          `$z=${zq}=${cTex(z)}$에서 $${factorTex(u, "z")}=${cTex(cx(0, v))}$`,
          `양변을 제곱하면 $${polyTex([u * u, -2 * u, 1], "z")}=${-v * v}$, 즉 $${quad}=0$`,
          `따라서 $${cubicT}=(${quad})(${factorTex(-t, "z")})${plusConst(c)}=${c}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: {
          mode,
          nr: num.re.n,
          ni: num.im.n,
          dr: den.re.n,
          di: den.im.n,
          c0: cubic[0]!,
          c1: cubic[1]!,
          c2: cubic[2]!,
        },
      };
    });
  return attempt<Body>((): Body | null => {
    const p = nz(rng, -3, 3);
    const qv = nz(rng, -3, 3);
    const N = p * p + qv * qv;
    const B = pickOne(rng, [1, 2]);
    const c = randInt(rng, -5, 5);
    const poly = [c, -2 * p * B, -2 * p, B, 1];
    const value = -N + c;
    const expr = `${polyTex(poly)}+\\dfrac{${B * N}}{x}`;
    const x2 = polyTex([0, 0, 1]);
    const q4 = `x^{4}${sgnTerm(-2 * p, "x^{2}")}`;
    const q3 = `x^{3}${sgnTerm(-2 * p, "x")}`;
    return {
      content: `$${x2}=${cTex(cx(p, qv))}$일 때, $${expr}$의 값을 구하시오.`,
      answer: numAnswer(value),
      solution: [
        `$x^{2}=${cTex(cx(p, qv))}$에서 $x^{2}${plusConst(-p)}=${cTex(cx(0, qv))}$`,
        `양변을 제곱하면 $${q4}+${p * p}=${-qv * qv}$이므로 $${q4}=${-N}$ ……㉠`,
        `㉠의 양변을 $x$${ro("x")} 나누면 $${q3}=-\\dfrac{${N}}{x}$, 즉 $${q3}+\\dfrac{${N}}{x}=0$ ……㉡`,
        `따라서 ㉠, ㉡에서 (주어진 식)$=(${q4})+${coef(B)}(${q3}+\\dfrac{${N}}{x})${plusConst(c)}=${c === 0 ? String(value) : `${-N}${plusConst(c)}=${value}`}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, q: qv, B, c },
    };
  });
}

// ───────────────────────────── 04 ─────────────────────────────
// 켤레복소수가 주어질 때의 식의 값 (표: 중하1 중2)
// 꼴 0 (기본·대표): x=a+bi, y=a−bi 에서 x+y, xy 로 대칭식
// 꼴 1 (응용): x=K/(u+vi), y=K/(u−vi) 를 켤레로 바꿔 인수분해한 식의 값
// 꼴 2 (응용): x 와 xy 가 주어질 때 x³−y³ — 답이 순허수(오답 넷)

function t04(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = nz(rng, -5, 5);
      const b = nz(rng, -4, 4);
      const S = 2 * a;
      const P = a * a + b * b;
      const ask = randInt(rng, 0, 2);
      const head = `$x+y=${S}$, $xy=${P}$이므로`;
      const [et, answer, last] =
        ask === 0
          ? [
              "\\dfrac{y}{x}+\\dfrac{x}{y}",
              qAnswer(q(S * S - 2 * P, P)),
              `$\\dfrac{y}{x}+\\dfrac{x}{y}=\\dfrac{(x+y)^{2}-2xy}{xy}=\\dfrac{${paren(S)}^{2}-2\\times ${P}}{${P}}=${qTex(q(S * S - 2 * P, P))}$`,
            ]
          : ask === 1
            ? [
                "x^{2}-xy+y^{2}",
                numAnswer(S * S - 3 * P),
                `$x^{2}-xy+y^{2}=(x+y)^{2}-3xy=${paren(S)}^{2}-3\\times ${P}=${S * S - 3 * P}$`,
              ]
            : [
                "x^{3}+y^{3}",
                numAnswer(S ** 3 - 3 * P * S),
                `$x^{3}+y^{3}=(x+y)^{3}-3xy(x+y)=${paren(S)}^{3}-3\\times ${P}\\times ${paren(S)}=${S ** 3 - 3 * P * S}$`,
              ];
      return {
        content: `$x=${cTex(cx(a, b))}$, $y=${cTex(cx(a, -b))}$일 때, $${et}$의 값을 구하시오.`,
        answer,
        solution: [
          `$x+y=${cParen(cx(a, b))}+${cParen(cx(a, -b))}=${S}$, $xy=${cParen(cx(a, b))}${cParen(cx(a, -b))}=${P}$`,
          head,
          last,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const u = nz(rng, -3, 3);
      const v = nz(rng, -3, 3);
      const m = pickOne(rng, [1, 2]);
      const K = m * (u * u + v * v);
      const x = cx(m * u, -m * v);
      const y = cx(m * u, m * v);
      const S = 2 * m * u;
      const D = cx(0, -2 * m * v);
      const P = m * m * (u * u + v * v);
      const ask = randInt(rng, 0, 1);
      const value =
        ask === 0 ? -8 * m ** 3 * u * v * v : 2 * m * m * (u * u - v * v);
      const et = ask === 0 ? "x^{3}-x^{2}y-xy^{2}+y^{3}" : "x^{2}+y^{2}";
      const last =
        ask === 0
          ? `$${et}=x^{2}(x-y)-y^{2}(x-y)=(x+y)(x-y)^{2}=${S}\\times(${cTex(D)})^{2}=${value}$`
          : `$${et}=(x+y)^{2}-2xy=${paren(S)}^{2}-2\\times ${P}=${value}$`;
      return {
        content: `$x=\\dfrac{${K}}{${cTex(cx(u, v))}}$, $y=\\dfrac{${K}}{${cTex(cx(u, -v))}}$일 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(value),
        solution: [
          `$x=\\dfrac{${K}${cParen(cx(u, -v))}}{${cParen(cx(u, v))}${cParen(cx(u, -v))}}=${cTex(x)}$, $y=\\dfrac{${K}${cParen(cx(u, v))}}{${cParen(cx(u, -v))}${cParen(cx(u, v))}}=${cTex(y)}$`,
          `$x+y=${S}$, $x-y=${cTex(D)}$, $xy=${P}$이므로`,
          last,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, u, v, m, ask },
      };
    });
  return attempt<Body>((): Body | null => {
    const a = nz(rng, -7, 7);
    const b = nz(rng, -3, 3);
    const x = cx(a, -b);
    const y = cx(a, b);
    const N = a * a + b * b;
    const d = cSub(x, y);
    const v = cSub(cPow(x, 3), cPow(y, 3));
    const got = cChoices(rng, v, [
      cx(-v.re.n, -v.im.n),
      cx(v.im),
      cPow(d, 3),
      cAdd(cPow(d, 3), cMul(cx(N), d)),
    ]);
    if (got === null) return null;
    return {
      content: `두 복소수 $x$, $y$에 대하여 $x=${cTex(x)}$이고 $xy=${N}$일 때, $x^{3}-y^{3}$의 값을 구하시오.`,
      answer: got.answer,
      solution: [
        `$xy=${N}$에서 $y=\\dfrac{${N}}{x}=\\dfrac{${N}}{${cTex(x)}}=${cTex(y)}$`,
        `이때 $x-y=${cTex(d)}$이므로`,
        `$x^{3}-y^{3}=(x-y)^{3}+3xy(x-y)=(${cTex(d)})^{3}+3\\times ${N}\\times(${cTex(d)})=${cTex(v)}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, a, b },
      distractors: got.distractors,
    };
  });
}

// ───────────────────────────── 05 ─────────────────────────────
// 복소수가 실수 또는 순허수가 되는 조건 (표: 중3)
// 꼴 0 (기본·대표): x²+(B)x+C 를 실수부분·허수부분으로 정리 → 순허수(또는 실수)가 되는 x
// 꼴 1 (응용): z² 이 실수 → z 는 실수 또는 순허수 → 모든 x 의 합
// 꼴 2 (응용): z² 이 양의 실수(0 아닌 실수) · 음의 실수(순허수)

/** $(x-u)(x-v)$ — 근이 0 이면 `x` 를 앞에 둔다. */
function prodTex(roots: readonly number[]): string {
  return [...roots]
    .sort((a, b) => Number(b === 0) - Number(a === 0))
    .map((r) => factorParen(r))
    .join("");
}

function t05(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [r1, r2] = distinctInts(rng, -5, 5, 2, { nonzero: true }) as [
        number,
        number,
      ];
      if (r1 + r2 === 0) return null;
      const m = pickOne(rng, [-2, -1, 1, 2]);
      const ask = randInt(rng, 0, 1);
      const B = cx(-(r1 + r2), m);
      const C = cx(r1 * r2, -m * r1);
      const zt = `x^{2}+(${cTex(B)})x${withSign(cTex(C))}`;
      const reT = polyTex(fromRoots([r1, r2]));
      const imT = polyTex([-m * r1, m]);
      const lines = [`$${zt}=(${reT})+(${imT})i$`];
      if (ask === 0) {
        lines.push(
          `이 복소수가 순허수가 되려면 $${reT}=0$, $${imT}\\ne 0$`,
          `$${reT}=0$에서 $${prodTex([r1, r2])}=0$이므로 $x=${Math.min(r1, r2)}$ 또는 $x=${Math.max(r1, r2)}$`,
          `$${imT}\\ne 0$에서 $x\\ne ${r1}$`,
          `따라서 $x=${r2}$`,
        );
      } else {
        lines.push(`이 복소수가 실수가 되려면 $${imT}=0$`, `따라서 $x=${r1}$`);
      }
      return {
        content: `복소수 $${zt}$${ga(zt)} ${ask === 0 ? "순허수" : "실수"}가 되도록 하는 실수 $x$의 값을 구하시오.`,
        answer: numAnswer(ask === 0 ? r2 : r1),
        solution: lines.join("\n"),
        difficulty: "기본",
        facts: { mode, r1, r2, m, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const [a, b, c] = distinctInts(rng, -5, 5, 3) as [number, number, number];
      const sum = a + b + c;
      const reT = polyTex(fromRoots([a, b]));
      const imT = polyTex(fromRoots([a, c]));
      const z2 = "z^{2}";
      const xs = [a, b, c].sort((x, y) => x - y);
      return {
        content: `복소수 $z=(${reT})+(${imT})i$에 대하여 $${z2}$${ga(z2)} 실수가 되도록 하는 모든 실수 $x$의 값의 합을 구하시오.`,
        answer: numAnswer(sum),
        solution: [
          `$${z2}$${ga(z2)} 실수가 되려면 $z$는 실수 또는 순허수이어야 하므로 $${reT}=0$ 또는 $${imT}=0$`,
          `$${reT}=0$에서 $${prodTex([a, b])}=0$이므로 $x=${Math.min(a, b)}$ 또는 $x=${Math.max(a, b)}$`,
          `$${imT}=0$에서 $${prodTex([a, c])}=0$이므로 $x=${Math.min(a, c)}$ 또는 $x=${Math.max(a, c)}$`,
          `따라서 모든 실수 $x$의 값의 합은 $${sumTex(xs)}=${sum}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, a, b, c },
      };
    });
  return attempt<Body>((): Body | null => {
    const [p, qq, r] = distinctInts(rng, -4, 4, 3) as [number, number, number];
    const B = cx(-(p + qq), -(p + r));
    const C = cx(p * qq, p * r);
    if ([B.re.n, B.im.n, C.re.n, C.im.n].includes(0)) return null;
    const sign = randInt(rng, 0, 1);
    const lin =
      B.re.n < 0 && B.im.n < 0
        ? `-(${cTex(cx(p + qq, p + r))})x`
        : `+(${cTex(B)})x`;
    const zt = `(1+i)x^{2}${lin}${withSign(cTex(C))}`;
    const reT = polyTex(fromRoots([p, qq]));
    const imT = polyTex(fromRoots([p, r]));
    const z2 = "z^{2}";
    const zero = ga("0");
    const lines = [`$z=(${reT})+(${imT})i$`];
    if (sign === 0) {
      lines.push(
        `$${z2}$${ga(z2)} 양의 실수가 되려면 $z$는 $0$${zero} 아닌 실수이어야 하므로 $${reT}\\ne 0$, $${imT}=0$`,
        `$${imT}=0$에서 $x=${Math.min(p, r)}$ 또는 $x=${Math.max(p, r)}$`,
        `$${reT}\\ne 0$에서 $x\\ne ${Math.min(p, qq)}$, $x\\ne ${Math.max(p, qq)}$`,
        `따라서 $x=${r}$`,
      );
    } else {
      lines.push(
        `$${z2}$${ga(z2)} 음의 실수가 되려면 $z$는 순허수이어야 하므로 $${reT}=0$, $${imT}\\ne 0$`,
        `$${reT}=0$에서 $x=${Math.min(p, qq)}$ 또는 $x=${Math.max(p, qq)}$`,
        `$${imT}\\ne 0$에서 $x\\ne ${Math.min(p, r)}$, $x\\ne ${Math.max(p, r)}$`,
        `따라서 $x=${qq}$`,
      );
    }
    return {
      content: `복소수 $z=${zt}$에 대하여 $${z2}$${ga(z2)} ${sign === 0 ? "양의 실수" : "음의 실수"}가 되도록 하는 실수 $x$의 값을 구하시오.`,
      answer: numAnswer(sign === 0 ? r : qq),
      solution: lines.join("\n"),
      difficulty: "응용",
      facts: { mode, p, q: qq, r, sign },
    };
  });
}

// ───────────────────────────── 06 ─────────────────────────────
// 복소수가 서로 같을 조건 (표: 중3)
// 꼴 0 (기본·대표): (a+bi)x+(c+di)y=R (우변이 켤레로 주어지기도) → x, y
// 꼴 1 (응용): x/(1−i)+y/(1+i)=R — 분모를 실수화한 뒤 비교
// 꼴 2 (응용): 켤레를 벗기면 x+y, xy 만 나온다 → 대칭식

const JOIN_CONJ = (z: string): string => `\\overline{${z}}`;

function t06(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const z1 = cx(nz(rng, -4, 4), nz(rng, -4, 4));
      const z2 = cx(nz(rng, -4, 4), nz(rng, -4, 4));
      const [a, b, c, d] = [z1.re.n, z1.im.n, z2.re.n, z2.im.n];
      if (a * d - b * c === 0) return null;
      const x = nz(rng, -4, 4);
      const y = nz(rng, -4, 4);
      const R = cx(a * x + c * y, b * x + d * y);
      if (R.re.n === 0 || R.im.n === 0) return null;
      const conj = randInt(rng, 0, 1);
      const rhs = conj === 1 ? JOIN_CONJ(cTex(cConj(R))) : cTex(R);
      const eq = `${cParen(z1)}x+${cParen(z2)}y=${rhs}`;
      const ask = randInt(rng, 0, 2);
      const [et, ev] = (
        [
          ["x+y", x + y],
          ["x-y", x - y],
          ["xy", x * y],
        ] as const
      )[ask]!;
      const L1 = linTex([
        [a, "x"],
        [c, "y"],
      ]);
      const L2 = linTex([
        [b, "x"],
        [d, "y"],
      ]);
      return {
        content: `등식 $${eq}$${eul(eq)} 만족시키는 실수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          ...(conj === 1 ? [`$${rhs}=${cTex(R)}$이므로`] : []),
          `좌변을 정리하면 $(${L1})+(${L2})i=${cTex(R)}$`,
          `복소수가 서로 같을 조건에 의하여 $${L1}=${R.re.n}$, $${L2}=${R.im.n}$`,
          `두 식을 연립하여 풀면 $x=${x}$, $y=${y}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b, c, d, er: R.re.n, ei: R.im.n, conj, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const x = nz(rng, -9, 9);
      const y = nz(rng, -9, 9);
      if ((x + y) % 2 !== 0) return null;
      const R = cx((x + y) / 2, (x - y) / 2);
      if (R.re.n === 0 || R.im.n === 0) return null;
      const al = pickOne(rng, [1, 2, 3]);
      const be = pickOne(rng, [-2, -1, 1, 2]);
      const et = linTex([
        [al, "x"],
        [be, "y"],
      ]);
      const ev = al * x + be * y;
      const eq = `\\dfrac{x}{1-i}+\\dfrac{y}{1+i}=${cTex(R)}`;
      return {
        content: `등식 $${eq}$${eul(eq)} 만족시키는 실수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$\\dfrac{x}{1-i}+\\dfrac{y}{1+i}=\\dfrac{x(1+i)+y(1-i)}{(1-i)(1+i)}=\\dfrac{x+y}{2}+\\dfrac{x-y}{2}i$`,
          `즉 $\\dfrac{x+y}{2}+\\dfrac{x-y}{2}i=${cTex(R)}$이므로 복소수가 서로 같을 조건에 의하여 $x+y=${x + y}$, $x-y=${x - y}$`,
          `두 식을 연립하여 풀면 $x=${x}$, $y=${y}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, pr: R.re.n, pi: R.im.n, al, be },
      };
    });
  return attempt<Body>((): Body | null => {
    const S = nz(rng, -6, 6);
    const P = nz(rng, -8, 8);
    if (S * S - 4 * P < 0) return null;
    const k = pickOne(rng, [1, 2, 3]);
    const c = -S;
    const m = k * P;
    const ask = randInt(rng, 0, 2);
    const [et, ev, how] = (
      [
        [
          "x^{2}+y^{2}",
          S * S - 2 * P,
          `(x+y)^{2}-2xy=${paren(S)}^{2}-2\\times ${paren(P)}`,
        ],
        [
          "(x-y)^{2}",
          S * S - 4 * P,
          `(x+y)^{2}-4xy=${paren(S)}^{2}-4\\times ${paren(P)}`,
        ],
        [
          "x^{3}+y^{3}",
          S ** 3 - 3 * P * S,
          `(x+y)^{3}-3xy(x+y)=${paren(S)}^{3}-3\\times ${paren(P)}\\times ${paren(S)}`,
        ],
      ] as const
    )[ask]!;
    const inner = `x${plusConst(c)}${sgnTerm(-k, "xyi")}`;
    const eq = `${JOIN_CONJ(inner)}=${cTex(cx(0, m))}-y`;
    return {
      content: `등식 $${eq}$${eul(eq)} 만족시키는 실수 $x$, $y$에 대하여 $${et}$의 값을 구하시오.`,
      answer: numAnswer(ev),
      solution: [
        `$${JOIN_CONJ(inner)}=x${plusConst(c)}${sgnTerm(k, "xyi")}$이므로 주어진 등식은 $(x${plusConst(c)})${sgnTerm(k, "xyi")}=-y${sgnTerm(m, "i")}$`,
        `복소수가 서로 같을 조건에 의하여 $x${plusConst(c)}=-y$, $${coef(k)}xy=${m}$`,
        `즉 $x+y=${S}$, $xy=${P}$이므로`,
        `$${et}=${how}=${ev}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, c, k, m, ask },
    };
  });
}

// ───────────────────────────── 07 ─────────────────────────────
// 켤레복소수의 성질 (표: 중하1 중1)
// 대표문제는 보기 ㄱ·ㄴ·ㄷ 참거짓 — 같은 성질(z=z̄ ⇔ 실수, z̄=−z ⇔ 순허수 또는 0)을 수로 묻는다(머리말 ⑵)
// 꼴 0 (기본): 0 이 아닌 z 가 z=z̄ → 0 이 아닌 실수 → x
// 꼴 1 (응용): z̄=−z → 실수부분이 0 → 모든 x 의 합

/** 「(단, $\overline{z}$는 $z$의 켤레복소수이다.)」 — 조사는 `josa.ts` 가 고른다. */
function conjNote(): string {
  const zb = "\\overline{z}";
  return `(단, $${zb}$${eun(zb)} $z$의 켤레복소수이다.)`;
}

function t07(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const [p, qq, r] = distinctInts(rng, -4, 4, 3) as [
        number,
        number,
        number,
      ];
      const reT = polyTex(fromRoots([p, qq]));
      const imT = polyTex(fromRoots([p, r]));
      const cond = "z=\\overline{z}";
      return {
        content: `$0$${ga("0")} 아닌 복소수 $z=(${reT})+(${imT})i$에 대하여 $${cond}$${ga(cond)} 성립할 때, 실수 $x$의 값을 구하시오. ${conjNote()}`,
        answer: numAnswer(r),
        solution: [
          `$${cond}$이고 $z\\ne 0$이므로 $z$는 $0$${ga("0")} 아닌 실수이다.`,
          `즉 $${reT}\\ne 0$, $${imT}=0$`,
          `$${imT}=0$에서 $${prodTex([p, r])}=0$이므로 $x=${Math.min(p, r)}$ 또는 $x=${Math.max(p, r)}$`,
          `$${reT}\\ne 0$에서 $x\\ne ${Math.min(p, qq)}$, $x\\ne ${Math.max(p, qq)}$`,
          `따라서 $x=${r}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qq, r },
      };
    });
  return attempt<Body>((): Body | null => {
    const [p, qq] = distinctInts(rng, -5, 5, 2) as [number, number];
    if (p + qq === 0) return null;
    const m = pickOne(rng, [-2, -1, 1, 2]);
    const s = randInt(rng, -4, 4);
    const B = cx(-(p + qq), m);
    const C = cx(p * qq, -m * s);
    const zt = `x^{2}+(${cTex(B)})x${withSign(cTex(C))}`;
    const reT = polyTex(fromRoots([p, qq]));
    const imT = polyTex([-m * s, m]);
    const cond = "\\overline{z}=-z";
    const lo = Math.min(p, qq);
    const hi = Math.max(p, qq);
    return {
      content: `복소수 $z=${zt}$에 대하여 $${cond}$${ga(cond)} 성립하도록 하는 모든 실수 $x$의 값의 합을 구하시오. ${conjNote()}`,
      answer: numAnswer(p + qq),
      solution: [
        `$${cond}$에서 $z$는 순허수 또는 $0$이어야 한다.`,
        `$z=(${reT})+(${imT})i$이므로 $${reT}=0$`,
        `$${prodTex([p, qq])}=0$에서 $x=${lo}$ 또는 $x=${hi}$`,
        `따라서 모든 실수 $x$의 값의 합은 $${sumTex([lo, hi])}=${p + qq}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, p, q: qq, m, s },
    };
  });
}

// ───────────────────────────── 08 ─────────────────────────────
// 등식을 만족시키는 복소수 구하기 (표: 중3)
// 꼴 0 (기본·대표): (p+qi)z+r z̄=R → z=a+bi 로 놓고 비교 — 답이 복소수(오답 넷)
// 꼴 1 (응용): (p+qi)z+w z̄=R → z z̄
// 꼴 2 (응용): z z̄=N, z+N/z=S → z=a±bi — 답이 두 복소수(오답 넷)

function t08(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const zb = "\\overline{z}";
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -3, 3);
      const qv = nz(rng, -3, 3);
      const r = nz(rng, -4, 4);
      if (p * p + qv * qv - r * r === 0) return null;
      const a = nz(rng, -5, 5);
      const b = nz(rng, -5, 5);
      const z = cx(a, b);
      const R = cAdd(cMul(cx(p, qv), z), cMul(cx(r), cConj(z)));
      if (R.re.n === 0 || R.im.n === 0) return null;
      const got = cChoices(rng, z, [cConj(z), cx(b, a), cx(-a, -b), cx(-b, a)]);
      if (got === null) return null;
      const eq = `${cParen(cx(p, qv))}z${sgnTerm(r, zb)}=${cTex(R)}`;
      const L1 = linTex([
        [p + r, "a"],
        [-qv, "b"],
      ]);
      const L2 = linTex([
        [qv, "a"],
        [p - r, "b"],
      ]);
      return {
        content: `등식 $${eq}$${eul(eq)} 만족시키는 복소수 $z$${eul("z")} 구하시오. ${conjNote()}`,
        answer: got.answer,
        solution: [
          `$z=a+bi$ ($a$, $b$${eun("b")} 실수)${ira("a+bi")} 하면 $${zb}=a-bi$`,
          `$${cParen(cx(p, qv))}(a+bi)${sgnTerm(r, "(a-bi)")}=${cTex(R)}$에서 $(${L1})+(${L2})i=${cTex(R)}$`,
          `복소수가 서로 같을 조건에 의하여 $${L1}=${R.re.n}$, $${L2}=${R.im.n}$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
          `따라서 $z=${cTex(z)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, p, q: qv, r, s: 0, t: 0, er: R.re.n, ei: R.im.n },
        distractors: got.distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = nz(rng, -3, 3);
      const qv = nz(rng, -3, 3);
      const s = randInt(rng, -3, 3);
      const t = nz(rng, -3, 3);
      if (p * p + qv * qv - s * s - t * t === 0) return null;
      const a = nz(rng, -5, 5);
      const b = nz(rng, -5, 5);
      const z = cx(a, b);
      const w = cx(s, t);
      const R = cAdd(cMul(cx(p, qv), z), cMul(w, cConj(z)));
      if (R.re.n === 0 || R.im.n === 0) return null;
      const wz = s === 0 ? sgnTerm(t, `i${zb}`) : `+${cParen(w)}${zb}`;
      const eq = `${cParen(cx(p, qv))}z${wz}=${cTex(R)}`;
      const N = a * a + b * b;
      const L1 = linTex([
        [p + s, "a"],
        [t - qv, "b"],
      ]);
      const L2 = linTex([
        [qv + t, "a"],
        [p - s, "b"],
      ]);
      return {
        content: `복소수 $z$${gwa("z")} 그 켤레복소수 $${zb}$에 대하여 $${eq}$${ga(eq)} 성립할 때, $z${zb}$의 값을 구하시오.`,
        answer: numAnswer(N),
        solution: [
          `$z=a+bi$ ($a$, $b$${eun("b")} 실수)${ira("a+bi")} 하면 $${zb}=a-bi$`,
          `주어진 등식에 대입하여 정리하면 $(${L1})+(${L2})i=${cTex(R)}$`,
          `복소수가 서로 같을 조건에 의하여 $${L1}=${R.re.n}$, $${L2}=${R.im.n}$`,
          `두 식을 연립하여 풀면 $a=${a}$, $b=${b}$`,
          `따라서 $z=${cTex(z)}$이므로 $z${zb}=${cParen(z)}${cParen(cConj(z))}=${N}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, q: qv, r: 0, s, t, er: R.re.n, ei: R.im.n },
      };
    });
  return attempt<Body>((): Body | null => {
    const h = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
    const m = pickOne(rng, [2, 3, 5, 6, 7, 8, 10, 11]);
    const N = h * h + m;
    const S = 2 * h;
    const ans = surdPmTex(surd(h, 1, -m));
    const ds = pickDistractors(rng, ans, [
      surdPmTex(surd(-h, 1, -m)),
      surdPmTex(surd(h, 1, m)),
      surdPmTex(surd(h, 1, -(m + 2 * h * h))),
      surdPmTex(surd(S, 1, -m)),
      surdPmTex(surd(h, 1, -N)),
    ]);
    if (ds === null) return null;
    const eq2 = `z+\\dfrac{${N}}{z}=${S}`;
    return {
      content: `복소수 $z$${gwa("z")} 그 켤레복소수 $${zb}$에 대하여 $z${zb}=${N}$, $${eq2}$${ga(eq2)} 성립할 때, 복소수 $z$${eul("z")} 모두 구하시오.`,
      answer: $(ans),
      solution: [
        `$z${zb}=${N}$에서 $${zb}=\\dfrac{${N}}{z}$이므로 $${eq2}$에서 $z+${zb}=${S}$`,
        `$z=a+bi$ ($a$, $b$${eun("b")} 실수)${ira("a+bi")} 하면 $2a=${S}$, 즉 $a=${h}$`,
        `$z${zb}=a^{2}+b^{2}=${N}$에서 $b^{2}=${m}$, 즉 $b=${surdPmTex(surd(0, 1, m))}$`,
        `따라서 $z=${ans}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, N, S },
      distractors: ds,
    };
  });
}

// ───────────────────────────── 09 ─────────────────────────────
// i의 거듭제곱 (표: 중3)
// 꼴 0 (기본·대표): i+i²+…+iⁿ — 넷씩 묶으면 0 · 답이 네 값 가운데 하나(오답 넷)
// 꼴 1 (응용): i+2i²+3i³+…+n iⁿ = x+yi → x±y
// 꼴 2 (응용): 1/i+1/i²+…+1/iⁿ (오답 넷)

/** iᵏ — 지수를 넷으로 나눈 나머지로. */
function iPow(k: number): Cx {
  return [cx(1), cx(0, 1), cx(-1), cx(0, -1)][((k % 4) + 4) % 4]!;
}

/** 이 단원 정답이 머무는 여덟 값 — 오답도 여기서 고른다(주기를 한 칸 잘못 센 자리). */
const CYCLE: readonly Cx[] = [
  cx(0, 1),
  cx(0, -1),
  cx(1),
  cx(-1),
  cx(1, 1),
  cx(1, -1),
  cx(-1, 1),
  cx(-1, -1),
];

function t09(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const n = pickOne(rng, [randInt(rng, 41, 99), randInt(rng, 2001, 3099)]);
      let v = cx(0);
      for (let k = 1; k <= n; k += 1) v = cAdd(v, iPow(k));
      const got = cChoices(rng, v, CYCLE);
      if (got === null) return null;
      const rem = n % 4;
      const tail = ["i", "i^{2}", "i^{3}"].slice(0, rem).join("+");
      const expr = `i+i^{2}+i^{3}+i^{4}+\\cdots+i^{${n}}`;
      return {
        content: `$${expr}$${eul(expr)} 간단히 하시오.`,
        answer: got.answer,
        solution: [
          `$i+i^{2}+i^{3}+i^{4}=i-1-i+1=0$이므로 연속한 네 항의 합은 $0$이다.`,
          `$${n}=4\\times ${Math.floor(n / 4)}+${rem}$이므로 앞에서부터 네 항씩 묶으면 끝에 $${rem}$개의 항 $${tail}$${ga(tail)} 남는다.`,
          `따라서 (주어진 식)$=${tail}=${cTex(v)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, n },
        distractors: got.distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const n = randInt(rng, 21, 62);
      let v = cx(0);
      for (let k = 1; k <= n; k += 1) v = cAdd(v, cMul(cx(k), iPow(k)));
      const x = v.re.n;
      const y = v.im.n;
      const ask = randInt(rng, 0, 1);
      const [et, ev] = ask === 0 ? ["x+y", x + y] : ["x-y", x - y];
      const m = Math.floor(n / 4);
      const kTerm = (k: number): string =>
        k % 4 === 1
          ? `+${k}i`
          : k % 4 === 2
            ? `-${k}`
            : k % 4 === 3
              ? `-${k}i`
              : `+${k}`;
      const rest: string[] = [];
      for (let k = 4 * m + 1; k <= n; k += 1) rest.push(kTerm(k));
      const restTex = rest.join("");
      const expr = `i+2i^{2}+3i^{3}+\\cdots+${n}i^{${n}}`;
      return {
        content: `두 실수 $x$, $y$에 대하여 $${expr}=x+yi$일 때, $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          `$i^{2}=-1$, $i^{3}=-i$, $i^{4}=1$이므로 연속한 네 항씩 묶으면 $(i-2-3i+4)+\\cdots+(${4 * m - 3}i-${4 * m - 2}-${4 * m - 1}i+${4 * m})${restTex}$`,
          `묶음 하나는 $2-2i$이고 묶음이 $${m}$개이므로 (좌변)$=${m}(2-2i)${restTex}=${cTex(v)}$`,
          `따라서 $x=${x}$, $y=${y}$이므로 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, n, ask },
      };
    });
  return attempt<Body>((): Body | null => {
    const n = randInt(rng, 13, 99);
    let v = cx(0);
    for (let k = 1; k <= n; k += 1) v = cAdd(v, iPow(-k));
    const got = cChoices(rng, v, CYCLE);
    if (got === null) return null;
    const rem = n % 4;
    const tail = ["\\dfrac{1}{i}", "\\dfrac{1}{i^{2}}", "\\dfrac{1}{i^{3}}"]
      .slice(0, rem)
      .join("+");
    const expr = `\\dfrac{1}{i}+\\dfrac{1}{i^{2}}+\\dfrac{1}{i^{3}}+\\cdots+\\dfrac{1}{i^{${n}}}`;
    return {
      content: `$${expr}$${eul(expr)} 간단히 하시오.`,
      answer: got.answer,
      solution: [
        `$\\dfrac{1}{i}=-i$, $\\dfrac{1}{i^{2}}=-1$, $\\dfrac{1}{i^{3}}=i$, $\\dfrac{1}{i^{4}}=1$이므로 연속한 네 항의 합은 $0$이다.`,
        `$${n}=4\\times ${Math.floor(n / 4)}+${rem}$이므로 네 항씩 묶으면 끝에 $${tail}$${ga(tail)} 남는다.`,
        `따라서 (주어진 식)$=${tail}=${cTex(v)}$`,
      ].join("\n"),
      difficulty: "응용",
      facts: { mode, n },
      distractors: got.distractors,
    };
  });
}

// ───────────────────────────── 10 ─────────────────────────────
// 복소수의 거듭제곱 (표: 중하1 중1 상중1)
// 꼴 0 (기본·대표): ((1+i)/(1−i))ⁿ ∓ ((1−i)/(1+i))ⁿ = iⁿ ∓ (−i)ⁿ (오답 넷)
// 꼴 1 (응용): (1+i)^{2m} ± (1−i)^{2m} — (1±i)²=±2i
// 꼴 2 (심화하): ((1±i)/√2)^{2n}=c 를 만족시키는 N 이하 자연수 n 의 개수

const POW_SET: readonly Cx[] = [
  cx(0, 2),
  cx(0, -2),
  cx(2),
  cx(-2),
  cx(0, 1),
  cx(0, -1),
  cx(1),
  cx(-1),
];

function t10(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const minus = randInt(rng, 0, 1) === 0;
      const base = randInt(rng, 25, 1040);
      // 빼면 홀수 지수에서, 더하면 짝수 지수에서만 0 이 아니다.
      const n = 2 * base + (minus ? 1 : 0);
      const a = iPow(n);
      const b = cPow(cx(0, -1), n);
      const v = minus ? cSub(a, b) : cAdd(a, b);
      const got = cChoices(rng, v, POW_SET);
      if (got === null) return null;
      const op = minus ? "-" : "+";
      const expr = `\\left(\\dfrac{1+i}{1-i}\\right)^{${n}}${op}\\left(\\dfrac{1-i}{1+i}\\right)^{${n}}`;
      return {
        content: `$${expr}$${eul(expr)} 간단히 하시오.`,
        answer: got.answer,
        solution: [
          `$\\dfrac{1+i}{1-i}=\\dfrac{(1+i)^{2}}{(1-i)(1+i)}=\\dfrac{2i}{2}=i$, $\\dfrac{1-i}{1+i}=\\dfrac{(1-i)^{2}}{(1+i)(1-i)}=-i$이므로`,
          `(주어진 식)$=i^{${n}}${op}(-i)^{${n}}=${cTex(a)}${op}(${cTex(b)})=${cTex(v)}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, n, minus: minus ? 1 : 0 },
        distractors: got.distractors,
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const minus = randInt(rng, 0, 1) === 0;
      const m = minus
        ? pickOne(rng, [3, 5, 7, 9])
        : pickOne(rng, [2, 4, 6, 8, 10]);
      const a = cPow(cx(0, 2), m);
      const b = cPow(cx(0, -2), m);
      const v = minus ? cSub(a, b) : cAdd(a, b);
      const op = minus ? "-" : "+";
      const lines = [
        `$(1+i)^{2}=2i$, $(1-i)^{2}=-2i$이므로`,
        `(주어진 식)$=\\{(1+i)^{2}\\}^{${m}}${op}\\{(1-i)^{2}\\}^{${m}}=(2i)^{${m}}${op}(-2i)^{${m}}=${cTex(v)}$`,
      ];
      const expr = `(1+i)^{${2 * m}}${op}(1-i)^{${2 * m}}`;
      if (!minus) {
        return {
          content: `$${expr}$의 값을 구하시오.`,
          answer: numAnswer(v.re.n),
          solution: lines.join("\n"),
          difficulty: "응용",
          facts: { mode, m, minus: 0 },
        };
      }
      const got = cChoices(rng, v, [
        cx(0, -v.im.n),
        cx(v.im.n),
        cx(0, v.im.n / 2),
        cx(0, 2 * v.im.n),
      ]);
      if (got === null) return null;
      return {
        content: `$${expr}$${eul(expr)} 간단히 하시오.`,
        answer: got.answer,
        solution: lines.join("\n"),
        difficulty: "응용",
        facts: { mode, m, minus: 1 },
        distractors: got.distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const sgn = randInt(rng, 0, 1);
    const cIdx = randInt(rng, 0, 3);
    const c = [cx(1), cx(0, 1), cx(-1), cx(0, -1)][cIdx]!;
    const N = randInt(rng, 30, 70);
    // (1+i)²/2 = i, (1−i)²/2 = −i
    const unit = sgn === 0 ? cx(0, 1) : cx(0, -1);
    const hits: number[] = [];
    for (let n = 1; n <= N; n += 1) {
      const p = cPow(unit, n);
      if (p.re.n === c.re.n && p.im.n === c.im.n) hits.push(n);
    }
    const count = hits.length;
    const top = sgn === 0 ? "1+i" : "1-i";
    const eq = `\\left(\\dfrac{${top}}{\\sqrt{2}}\\right)^{2n}=${cTex(c)}`;
    const u = sgn === 0 ? "i" : "-i";
    return {
      content: `등식 $${eq}$${eul(eq)} 만족시키는 $${N}$ 이하의 자연수 $n$의 개수를 구하시오.`,
      answer: numAnswer(count),
      solution: [
        `$\\left(\\dfrac{${top}}{\\sqrt{2}}\\right)^{2}=\\dfrac{(${top})^{2}}{2}=${u}$이므로 $\\left(\\dfrac{${top}}{\\sqrt{2}}\\right)^{2n}=(${u})^{n}$`,
        `$(${u})^{n}=${cTex(c)}$${ga(cTex(c))} 되는 $n$은 $4$${ro("4")} 나눈 나머지가 $${hits[0]! % 4}$인 자연수이다.`,
        `따라서 $${N}$ 이하의 자연수 $n$은 $${hits[0]}$, $${hits[1]}$, $\\cdots$, $${hits[count - 1]}$의 $${count}$개이다.`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, sgn, cIdx, N },
    };
  });
}

// ───────────────────────────── 11 ─────────────────────────────
// 음수의 제곱근의 계산 (표: 중2 상중1)
// 대표문제(「옳지 않은 것은?」)의 식들을 한 줄로 이어 계산한다 — 음수끼리의 곱 · 음수로 나누기가 틀리기 쉬운 자리
// 꼴 0 (기본): 세 항의 합 = a+bi → a±b
// 꼴 1 (응용): (√p+√−p)(u√p+v√−p) ± (한 항) — 답이 복소수(오답 넷: √a√b=√ab 를 음수에도 쓴 값)
// 꼴 2 (심화하): −p<x<q 에서 네 근호의 곱 — 답이 다항식(오답 넷)

type RootTerm = { tex: string; value: Cx; wrong: Cx; how: string };

/**
 * 근호 한 항. `wrong` 은 √a√b=√ab · √a/√b=√(a/b) 를 **음수에도 그대로** 쓴 값이다 —
 * 이 유형에서 학생이 실제로 하는 실수이고 객관식 오답의 뿌리다.
 */
function rootTerm(rng: Rng, kind: number): RootTerm {
  const s = pickOne(rng, [2, 3, 5, 6]);
  const m = randInt(rng, 1, 3);
  const n = randInt(rng, 1, 3);
  const a = s * m * m;
  const b = s * n * n;
  const smn = s * m * n;
  if (kind === 0)
    return {
      tex: `\\sqrt{-${a}}\\sqrt{-${b}}`,
      value: cx(-smn),
      wrong: cx(smn),
      how: `\\sqrt{-${a}}\\sqrt{-${b}}=\\sqrt{${a}}i\\times\\sqrt{${b}}i=${smn}i^{2}=${-smn}`,
    };
  if (kind === 1)
    return {
      tex: `\\sqrt{-${a}}\\sqrt{${b}}`,
      value: cx(0, smn),
      wrong: cx(0, smn),
      how: `\\sqrt{-${a}}\\sqrt{${b}}=\\sqrt{${a}}i\\times\\sqrt{${b}}=${cTex(cx(0, smn))}`,
    };
  if (kind === 2)
    return {
      tex: `\\dfrac{\\sqrt{${a}}}{\\sqrt{-${s}}}`,
      value: cx(0, -m),
      wrong: cx(0, m),
      how: `\\dfrac{\\sqrt{${a}}}{\\sqrt{-${s}}}=\\dfrac{\\sqrt{${a}}}{\\sqrt{${s}}i}=\\dfrac{${m}}{i}=${cTex(cx(0, -m))}`,
    };
  if (kind === 3)
    return {
      tex: `\\dfrac{\\sqrt{-${a}}}{\\sqrt{-${s}}}`,
      value: cx(m),
      wrong: cx(m),
      how: `\\dfrac{\\sqrt{-${a}}}{\\sqrt{-${s}}}=\\dfrac{\\sqrt{${a}}i}{\\sqrt{${s}}i}=${m}`,
    };
  return {
    tex: `\\dfrac{\\sqrt{-${a}}}{\\sqrt{${s}}}`,
    value: cx(0, m),
    wrong: cx(0, m),
    how: `\\dfrac{\\sqrt{-${a}}}{\\sqrt{${s}}}=\\dfrac{\\sqrt{${a}}i}{\\sqrt{${s}}}=${cTex(cx(0, m))}`,
  };
}

function t11(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const kinds = [
        pickOne(rng, [0, 2]),
        randInt(rng, 0, 4),
        randInt(rng, 0, 4),
      ];
      const terms = kinds.map((k) => rootTerm(rng, k));
      if (new Set(terms.map((t) => t.tex)).size < 3) return null;
      const order = distinctInts(rng, 0, 2, 3);
      let v = cx(0);
      let expr = "";
      order.forEach((idx, j) => {
        const t = terms[idx]!;
        const plus = j === 0 || rng() < 0.5;
        v = plus ? cAdd(v, t.value) : cSub(v, t.value);
        expr += `${j === 0 ? "" : plus ? "+" : "-"}${t.tex}`;
      });
      const re = v.re.n;
      const im = v.im.n;
      const ask = randInt(rng, 0, 1);
      const [et, ev] = ask === 0 ? ["a+b", re + im] : ["a-b", re - im];
      return {
        content: `$${expr}=a+bi$일 때, 실수 $a$, $b$에 대하여 $${et}$의 값을 구하시오.`,
        answer: numAnswer(ev),
        solution: [
          order.map((idx) => `$${terms[idx]!.how}$`).join(", ") + "이므로",
          `(좌변)$=${cTex(v)}$에서 $a=${re}$, $b=${im}$`,
          `따라서 $${et}=${ev}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, ask },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const p = pickOne(rng, [2, 3, 5, 6, 7]);
      const u = pickOne(rng, [1, 2, 3]);
      const vv = pickOne(rng, [-2, -1, 1, 2]);
      const extra = rootTerm(rng, pickOne(rng, [0, 2]));
      const plus = rng() < 0.5;
      const prod = cMul(cx(p), cMul(cx(1, 1), cx(u, vv)));
      const v = plus ? cAdd(prod, extra.value) : cSub(prod, extra.value);
      // 틀리기 쉬운 자리: √−p·√−p 를 +p 로 · 덧붙인 항에 √a√b=√ab 를 그대로
      const prodWrong = cAdd(prod, cx(2 * vv * p));
      const withExtra = (base: Cx, e: Cx): Cx =>
        plus ? cAdd(base, e) : cSub(base, e);
      const got = cChoices(rng, v, [
        withExtra(prodWrong, extra.value),
        withExtra(prod, extra.wrong),
        withExtra(prodWrong, extra.wrong),
        cConj(v),
      ]);
      if (got === null) return null;
      const f1 = `\\sqrt{${p}}+\\sqrt{-${p}}`;
      const f2 = `${coef(u)}\\sqrt{${p}}${sgnTerm(vv, `\\sqrt{-${p}}`)}`;
      const expr = `(${f1})(${f2})${plus ? "+" : "-"}${extra.tex}`;
      return {
        content: `$${expr}$${eul(expr)} 간단히 하시오.`,
        answer: got.answer,
        solution: [
          `$\\sqrt{-${p}}=\\sqrt{${p}}i$이므로`,
          `$(${f1})(${f2})=(\\sqrt{${p}}+\\sqrt{${p}}i)(${coef(u)}\\sqrt{${p}}${sgnTerm(vv, `\\sqrt{${p}}i`)})=${p}(1+i)${cParen(cx(u, vv))}=${cTex(prod)}$`,
          `$${extra.how}$`,
          `따라서 (주어진 식)$=${cTex(prod)}${plus ? "+" : "-"}${cParen(extra.value)}=${cTex(v)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, p, u, v: vv, plus: plus ? 1 : 0 },
        distractors: got.distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const [p, qq] = distinctInts(rng, 1, 6, 2) as [number, number];
    const A = [-p * qq, p - qq, 1];
    const ans = polyTex(A);
    const ds = pickDistractors(rng, ans, [
      polyTex(scale(A, -1)),
      polyTex([-p * qq, qq - p, 1]),
      polyTex([p * qq, p - qq, 1]),
      polyTex([-p * qq, p - qq, -1]),
    ]);
    if (ds === null) return null;
    const expr = `\\sqrt{x+${p}}\\times\\sqrt{x-${qq}}\\times\\sqrt{${qq}-x}\\times\\sqrt{-${p}-x}`;
    return {
      content: `$-${p}<x<${qq}$일 때, $${expr}$${eul(expr)} 간단히 하시오.`,
      answer: $(ans),
      solution: [
        `$-${p}<x<${qq}$에서 $x+${p}>0$, $x-${qq}<0$, $${qq}-x>0$, $-${p}-x<0$이므로`,
        `(주어진 식)$=\\sqrt{x+${p}}\\times\\sqrt{${qq}-x}i\\times\\sqrt{${qq}-x}\\times\\sqrt{x+${p}}i$`,
        `$=(x+${p})(${qq}-x)i^{2}=-(x+${p})(${qq}-x)=${ans}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, p, q: qq },
      distractors: ds,
    };
  });
}

// ───────────────────────────── 12 ─────────────────────────────
// 음수의 제곱근의 성질 (표: 중2)
// 꼴 0 (기본·대표): √a/√b=−√(a/b) 또는 √a√b=−√(ab) 로 부호를 읽고 |…|·√(…)² 를 푼다 — 답이 a, b 의 식(오답 넷)
// 꼴 1 (응용): 문자 하나의 근호 조건 → 범위를 읽어 식의 값(상수)
// 식은 따로 한 줄에 둔다 — `|…|` 뒤에는 조사를 못 붙인다(머리말 ⑶).

type SignedForm = { tex: string; al: number; be: number; sg: 1 | -1 };

const FORMS_Q: readonly SignedForm[] = [
  { tex: "a", al: 1, be: 0, sg: 1 },
  { tex: "b", al: 0, be: 1, sg: -1 },
  { tex: "a-b", al: 1, be: -1, sg: 1 },
  { tex: "b-a", al: -1, be: 1, sg: -1 },
  { tex: "2a-b", al: 2, be: -1, sg: 1 },
  { tex: "b-2a", al: -2, be: 1, sg: -1 },
];

const FORMS_P: readonly SignedForm[] = [
  { tex: "a", al: 1, be: 0, sg: -1 },
  { tex: "b", al: 0, be: 1, sg: -1 },
  { tex: "a+b", al: 1, be: 1, sg: -1 },
  { tex: "2a+b", al: 2, be: 1, sg: -1 },
  { tex: "a+2b", al: 1, be: 2, sg: -1 },
];

function t12(rng: Rng): Body {
  const mode = randInt(rng, 0, 1);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const cond = randInt(rng, 0, 1);
      const pool = cond === 0 ? FORMS_Q : FORMS_P;
      const forms = distinctInts(rng, 0, pool.length - 1, 3).map(
        (i) => pool[i]!,
      );
      const cs = forms.map(() => pickOne(rng, [1, -1, 2]));
      const styles = forms.map(() => randInt(rng, 0, 1));
      const disp = (f: SignedForm, st: number): string =>
        st === 0
          ? f.tex.length === 1
            ? `\\sqrt{${f.tex}^{2}}`
            : `\\sqrt{(${f.tex})^{2}}`
          : `|${f.tex}|`;
      const joinTerms = (
        parts: readonly string[],
        ks: readonly number[],
      ): string =>
        parts
          .map((body, j) => {
            const t = sgnTerm(ks[j]!, body);
            return j === 0 && t.startsWith("+") ? t.slice(1) : t;
          })
          .join("");
      const E = joinTerms(
        forms.map((f, j) => disp(f, styles[j]!)),
        cs,
      );
      const absForm = joinTerms(
        forms.map((f) => `|${f.tex}|`),
        cs,
      );
      const valueOf = (flip: number): [number, number] => {
        let al = 0;
        let be = 0;
        forms.forEach((f, j) => {
          const s = (flip >> j) & 1 ? -f.sg : f.sg;
          al += cs[j]! * s * f.al;
          be += cs[j]! * s * f.be;
        });
        return [al, be];
      };
      const lin = ([al, be]: [number, number]): string =>
        linTex([
          [al, "a"],
          [be, "b"],
        ]);
      const [al, be] = valueOf(0);
      if (al === 0 && be === 0) return null;
      const ans = lin([al, be]);
      const ds = pickDistractors(rng, ans, [
        lin(valueOf(1)),
        lin(valueOf(2)),
        lin(valueOf(4)),
        lin([-al, -be]),
        lin(valueOf(3)),
      ]);
      if (ds === null) return null;
      const resolved = joinTerms(
        forms.map((f) => (f.tex.length === 1 ? f.tex : `(${f.tex})`)),
        forms.map((f, j) => cs[j]! * f.sg),
      );
      const condTex =
        cond === 0
          ? "\\dfrac{\\sqrt{a}}{\\sqrt{b}}=-\\sqrt{\\dfrac{a}{b}}"
          : "\\sqrt{a}\\sqrt{b}=-\\sqrt{ab}";
      return {
        content: `$0$${ga("0")} 아닌 두 실수 $a$, $b$에 대하여 $${condTex}$일 때, 다음 식을 간단히 하시오.\n$${E}$`,
        answer: $(ans),
        solution: [
          `$${condTex}$이므로 $a${cond === 0 ? ">" : "<"}0$, $b<0$`,
          `따라서 ${forms.map((f) => `$${f.tex}${f.sg > 0 ? ">" : "<"}0$`).join(", ")}이므로`,
          `(주어진 식)$=${absForm}$`,
          `$=${resolved}=${ans}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, cond, al, be },
        distractors: ds,
      };
    });
  return attempt<Body>((): Body | null => {
    const form = randInt(rng, 0, 1);
    const [x1, x2] = distinctInts(rng, -3, 6, 2, { nonzero: true }) as [
      number,
      number,
    ];
    // 꼴 0(나눗셈)은 q<a<p 라야 하므로 p>q 로 맞춘다.
    const p = form === 0 ? Math.max(x1, x2) : x1;
    const qq = form === 0 ? Math.min(x1, x2) : x2;
    const ap = `a${plusConst(-p)}`;
    const aq = `a${plusConst(-qq)}`;
    const condTex =
      form === 0
        ? `\\dfrac{\\sqrt{${p}-a}}{\\sqrt{${qq}-a}}=-\\sqrt{\\dfrac{${p}-a}{${qq}-a}}`
        : `\\sqrt{${ap}}\\sqrt{${aq}}=-\\sqrt{(${ap})(${aq})}`;
    const E =
      form === 0
        ? `\\sqrt{(${aq})^{2}}+|${ap}|`
        : `|${ap}|-\\sqrt{(${aq})^{2}}`;
    const lines =
      form === 0
        ? [
            `$${condTex}$이므로 $${p}-a>0$, $${qq}-a<0$`,
            `즉 $${aq}>0$, $${ap}<0$이므로`,
            `(주어진 식)$=|${aq}|+|${ap}|=(${aq})-(${ap})=${p - qq}$`,
          ]
        : [
            `$${condTex}$이므로 $${ap}<0$, $${aq}<0$`,
            `(주어진 식)$=|${ap}|-|${aq}|=-(${ap})+(${aq})=${p - qq}$`,
          ];
    return {
      content: `실수 $a$에 대하여 $${condTex}$일 때, 다음 식을 간단히 하시오. (단, $a\\ne ${p}$, $a\\ne ${qq}$)\n$${E}$`,
      answer: numAnswer(p - qq),
      solution: lines.join("\n"),
      difficulty: "응용",
      facts: { mode, form, p, q: qq },
    };
  });
}

// ───────────────────────────── 13 ─────────────────────────────
// 켤레복소수의 성질의 활용 (표: 상중2)
// 대표문제(보기 ㄱ·ㄴ·ㄷ)는 같은 성질을 수로 묻는다(머리말 ⑵)
// 꼴 0 (기본): 실수가 아닌 z, w 에서 z+w, zw 가 실수 → w=z̄ → z²+w²
// 꼴 1 (심화하): 허수 z 에서 1/(z²+αz+β) 가 실수 → (z−z̄)(z+z̄+α)=0 → z+z̄=−α
// 꼴 2 (심화하): 실수가 아닌 z 에서 z/(k+z²) 가 실수 → (z−z̄)(k−zz̄)=0 → zz̄=k

function t13(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  const zb = "\\overline{z}";
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const a = nz(rng, -5, 5);
      const b = nz(rng, -5, 5);
      if (Math.abs(a) === Math.abs(b)) return null;
      const z = cx(a, b);
      const v = 2 * a * a - 2 * b * b;
      const wT = `c${sgnTerm(-b, "i")}`;
      const imPart = linTex([[b, "c"]], -a * b);
      return {
        content: `실수가 아닌 두 복소수 $z$, $w$에 대하여 $z+w$, $zw$${ga("zw")} 모두 실수이다. $z=${cTex(z)}$일 때, $z^{2}+w^{2}$의 값을 구하시오.`,
        answer: numAnswer(v),
        solution: [
          `$z+w$${ga("z+w")} 실수이므로 $w$의 허수부분은 $${-b}$이다. $w=${wT}$ ($c$${eun("c")} 실수)${ira(wT)} 하면`,
          `$zw=${cParen(z)}(${wT})=(${linTex([[a, "c"]], b * b)})+(${imPart})i$`,
          `$zw$${ga("zw")} 실수이므로 $${imPart}=0$, 즉 $c=${a}$이고 $w=${cTex(cConj(z))}=${zb}$`,
          `따라서 $z+w=${2 * a}$, $zw=${a * a + b * b}$이므로 $z^{2}+w^{2}=(z+w)^{2}-2zw=${paren(2 * a)}^{2}-2\\times ${a * a + b * b}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: { mode, a, b },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const al = nz(rng, -6, 6);
      const be = randInt(rng, -6, 6);
      const P = polyTex([be, al, 1], "z");
      const Pb = `${zb}^{2}${sgnTerm(al, zb)}${plusConst(be)}`;
      const frac = `\\dfrac{1}{${P}}`;
      return {
        content: `허수 $z$에 대하여 $${frac}$${ga(frac)} 실수일 때, $z+${zb}$의 값을 구하시오. ${conjNote()}`,
        answer: numAnswer(-al),
        solution: [
          `$${frac}$${ga(frac)} 실수이므로 $${P}$도 실수이다.`,
          `즉 $${P}=\\overline{${P}}=${Pb}$이므로 $z^{2}-${zb}^{2}${sgnTerm(al, `(z-${zb})`)}=0$`,
          `$(z-${zb})(z+${zb}${plusConst(al)})=0$이고 $z$는 허수이므로 $z\\ne${zb}$`,
          `따라서 $z+${zb}${plusConst(al)}=0$이므로 $z+${zb}=${-al}$`,
        ].join("\n"),
        difficulty: "심화하",
        facts: { mode, al, be },
      };
    });
  return attempt<Body>((): Body | null => {
    const k = randInt(rng, 2, 9);
    const m = nz(rng, -3, 3);
    const frac = `\\dfrac{z}{${k}+z^{2}}`;
    const ask = `(z${plusConst(m)})(${zb}${plusConst(m)})${sgnTerm(-m, `(z+${zb})`)}`;
    return {
      content: `실수가 아닌 복소수 $z$에 대하여 $${frac}$${ga(frac)} 실수일 때, $${ask}$의 값을 구하시오. ${conjNote()}`,
      answer: numAnswer(k + m * m),
      solution: [
        `$${frac}$${ga(frac)} 실수이므로 $${frac}=\\overline{\\left(${frac}\\right)}=\\dfrac{${zb}}{${k}+${zb}^{2}}$`,
        `$z(${k}+${zb}^{2})=${zb}(${k}+z^{2})$에서 $${k}(z-${zb})-z${zb}(z-${zb})=0$`,
        `$(z-${zb})(${k}-z${zb})=0$이고 $z\\ne${zb}$이므로 $z${zb}=${k}$`,
        `따라서 $${ask}=z${zb}+${m * m}=${k}+${m * m}=${k + m * m}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, k, m },
    };
  });
}

// ───────────────────────────── 14 ─────────────────────────────
// 켤레복소수의 성질을 이용한 식의 계산 (표: 중2 상중1)
// 꼴 0 (기본·대표): αᾱ∓ᾱβ∓αβ̄+ββ̄ = (α∓β)(ᾱ∓β̄)
// 꼴 1 (응용): z̄₁+kz̄₂, z̄₁z̄₂ 가 주어질 때 (z₁−1)(kz₂−1) — 답이 복소수(오답 넷: 켤레를 안 벗긴 값)
// 꼴 2 (심화하): zz̄=ww̄=N, z+w=c → 1/z+1/w=c̄/N (오답 넷)

function t14(rng: Rng): Body {
  const mode = randInt(rng, 0, 2);
  if (mode === 0)
    return attempt<Body>((): Body | null => {
      const al = cx(nz(rng, -6, 6), nz(rng, -6, 6));
      const be = cx(nz(rng, -6, 6), nz(rng, -6, 6));
      const minus = randInt(rng, 0, 1) === 1;
      const d = minus ? cSub(al, be) : cAdd(al, be);
      if (isZero(d)) return null;
      const v = cMul(d, cConj(d)).re.n;
      const A = "\\alpha";
      const B = "\\beta";
      const Ab = `\\overline{${A}}`;
      const Bb = `\\overline{${B}}`;
      const op = minus ? "-" : "+";
      const expr = `${A}${Ab}${op}${Ab}${B}${op}${A}${Bb}+${B}${Bb}`;
      const note = `(단, $${Ab}$, $${Bb}$${eun(Bb)} 각각 $${A}$, $${B}$의 켤레복소수이다.)`;
      return {
        content: `$${A}=${cTex(al)}$, $${B}=${cTex(be)}$일 때, $${expr}$의 값을 구하시오. ${note}`,
        answer: numAnswer(v),
        solution: [
          `(주어진 식)$=${A}(${Ab}${op}${Bb})${op}${B}(${Ab}${op}${Bb})=(${A}${op}${B})(${Ab}${op}${Bb})=(${A}${op}${B})\\overline{(${A}${op}${B})}$`,
          `이때 $${A}${op}${B}=${cTex(d)}$이므로 (주어진 식)$=${cParen(d)}${cParen(cConj(d))}=${v}$`,
        ].join("\n"),
        difficulty: "기본",
        facts: {
          mode,
          ar: al.re.n,
          ai: al.im.n,
          br: be.re.n,
          bi: be.im.n,
          minus: minus ? 1 : 0,
        },
      };
    });
  if (mode === 1)
    return attempt<Body>((): Body | null => {
      const k = pickOne(rng, [1, 2, 3]);
      const A = cx(nz(rng, -6, 6), nz(rng, -6, 6));
      const Bc = cx(nz(rng, -6, 6), nz(rng, -6, 6));
      const Ab = cConj(A);
      const Bbar = cConj(Bc);
      const one = cx(1);
      const kB = (b: Cx): Cx => cMul(cx(k), b);
      const v = cAdd(cSub(kB(Bbar), Ab), one);
      const got = cChoices(rng, v, [
        cAdd(cSub(kB(Bc), A), one),
        cAdd(cAdd(kB(Bbar), Ab), one),
        cSub(kB(Bbar), Ab),
        cAdd(cSub(kB(Bbar), A), one),
      ]);
      if (got === null) return null;
      const z1b = "\\overline{z_{1}}";
      const z2b = "\\overline{z_{2}}";
      const sumT = `${z1b}${sgnTerm(k, z2b)}`;
      const note = `(단, $${z1b}$, $${z2b}$${eun(z2b)} 각각 $z_{1}$, $z_{2}$의 켤레복소수이다.)`;
      const target = `(z_{1}-1)(${coef(k)}z_{2}-1)`;
      return {
        content: `두 복소수 $z_{1}$, $z_{2}$에 대하여 $${sumT}=${cTex(A)}$, $${z1b}\\times${z2b}=${cTex(Bc)}$일 때, $${target}$의 값을 구하시오. ${note}`,
        answer: got.answer,
        solution: [
          `$${sumT}=\\overline{z_{1}${sgnTerm(k, "z_{2}")}}=${cTex(A)}$이므로 $z_{1}${sgnTerm(k, "z_{2}")}=${cTex(Ab)}$`,
          `$${z1b}\\times${z2b}=\\overline{z_{1}z_{2}}=${cTex(Bc)}$이므로 $z_{1}z_{2}=${cTex(Bbar)}$`,
          `$${target}=${coef(k)}z_{1}z_{2}-(z_{1}${sgnTerm(k, "z_{2}")})+1$`,
          `$=${k === 1 ? cParen(Bbar) : `${k}${cParen(Bbar)}`}-${cParen(Ab)}+1=${cTex(v)}$`,
        ].join("\n"),
        difficulty: "응용",
        facts: { mode, k, Ar: A.re.n, Ai: A.im.n, Br: Bc.re.n, Bi: Bc.im.n },
        distractors: got.distractors,
      };
    });
  return attempt<Body>((): Body | null => {
    const a = nz(rng, -4, 4);
    const b = nz(rng, -4, 4);
    const z = cx(a, b);
    const w = pickOne(rng, [
      cx(b, a),
      cx(-a, b),
      cx(a, -b),
      cx(-b, a),
      cx(b, -a),
      cx(-b, -a),
    ]);
    if (w.re.n === a && w.im.n === b) return null;
    const c = cAdd(z, w);
    if (isZero(c)) return null;
    const N = a * a + b * b;
    const cb = cConj(c);
    const ans = cDiv(cb, cx(N));
    const got = cChoices(rng, ans, [
      cDiv(c, cx(N)),
      cSub(cx(0), ans),
      cb,
      cDiv(cx(N), c),
    ]);
    if (got === null) return null;
    const zb = "\\overline{z}";
    const wb = "\\overline{w}";
    return {
      content: `두 복소수 $z$, $w$에 대하여 $z${zb}=${N}$, $w${wb}=${N}$, $z+w=${cTex(c)}$일 때, $\\dfrac{1}{z}+\\dfrac{1}{w}$의 값을 구하시오. (단, $${zb}$, $${wb}$${eun(wb)} 각각 $z$, $w$의 켤레복소수이다.)`,
      answer: got.answer,
      solution: [
        `$z${zb}=${N}$, $w${wb}=${N}$에서 $\\dfrac{1}{z}=\\dfrac{${zb}}{${N}}$, $\\dfrac{1}{w}=\\dfrac{${wb}}{${N}}$`,
        `$${zb}+${wb}=\\overline{z+w}=${cTex(cb)}$이므로`,
        `$\\dfrac{1}{z}+\\dfrac{1}{w}=\\dfrac{${zb}+${wb}}{${N}}=\\dfrac{${cTex(cb)}}{${N}}=${cTex(ans)}$`,
      ].join("\n"),
      difficulty: "심화하",
      facts: { mode, N, cr: c.re.n, ci: c.im.n },
      distractors: got.distractors,
    };
  });
}

// ───────────────────────────── 등록 ─────────────────────────────

function entry(
  number: string,
  title: string,
  unitSection: string,
  make: (rng: Rng) => Body,
): HighTypeEntry {
  const meta = {
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: MINOR,
    rpmType: number,
    rpmTitle: title,
  };
  return {
    key: `${BOOK}|${MINOR}|${number}`,
    ...meta,
    handler: (rng: Rng): HighProblem => ({ ...meta, ...make(rng) }),
  };
}

/** 번호·제목은 `scripts/rpm/rpm-high-type-catalog.json` 의 **바이트 그대로**다(시험이 대조한다). */
export const H1_COMPLEX: HighTypeEntry[] = [
  entry("01", "복소수의 뜻과 분류", SEC.복소수, t01),
  entry("02", "복소수의 사칙연산", SEC.연산, t02),
  entry("03", "복소수가 주어질 때의 식의 값", SEC.연산, t03),
  entry("04", "켤레복소수가 주어질 때의 식의 값", SEC.켤레, t04),
  entry("05", "복소수가 실수 또는 순허수가 되는 조건", SEC.복소수, t05),
  entry("06", "복소수가 서로 같을 조건", SEC.복소수, t06),
  entry("07", "켤레복소수의 성질", SEC.켤레, t07),
  entry("08", "등식을 만족시키는 복소수 구하기", SEC.연산, t08),
  entry("09", "i의 거듭제곱", SEC.거듭제곱, t09),
  entry("10", "복소수의 거듭제곱", SEC.거듭제곱, t10),
  entry("11", "음수의 제곱근의 계산", SEC.음수, t11),
  entry("12", "음수의 제곱근의 성질", SEC.음수, t12),
  entry("13", "켤레복소수의 성질의 활용", SEC.켤레, t13),
  entry("14", "켤레복소수의 성질을 이용한 식의 계산", SEC.켤레, t14),
];

export const H1_COMPLEX_HOLD: HighHold[] = [];
