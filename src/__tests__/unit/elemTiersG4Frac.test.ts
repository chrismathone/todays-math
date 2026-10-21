/**
 * 초4 2-1 「분수의 덧셈과 뺄셈」 4단 확대 (D-72) — 네 소단원 전부. 초4 2학기 첫 트랜치.
 *
 * **참은 발문에서 온다.** 발문에 적힌 분수·수 카드·부등식 조건만 읽어 답을 **독립 재도출**
 * 한다 — 생성기를 되부르지도, 제품 상수(`fmtFrac`·`FRAC_DENS`)를 쓰지도 않는다. 기약 여부는
 * 이 파일이 가진 `gcdOf` 로 세고, 대분수 정본 꼴도 이 파일이 직접 조립해 대조한다.
 *
 * **이 트랜치의 진짜 위험은 초5 1-5 다.** 소단원 이름이 넷 다 같다(진분수의 덧셈…).
 * 그래서 「겹치지 말자」를 손 목록으로 두지 않고 **초5 를 실제로 뽑아 대조**한다 —
 * 발문 완전 일치 0 · 수를 가린 골격 일치 0. 그리고 진짜 판별자인 **동분모**에는
 * 「초5 에는 분모가 다른 발문이 실제로 있다」는 **음성 대조군**을 붙였다. 음성이 없으면
 * 그 판별자가 가르는지 알 수 없다(2026-08-20 판정자 눈금 교훈).
 *
 * ⚠️ 이 파일에는 LaTeX 리터럴이 많다. 역슬래시가 한 겹 벗겨지면 **아무것도 안 매칭하는데
 * 초록**이 된다(g5 실측 2026-08-23). 그래서 맨 아래 「자체 눈금」이 도구마다 **걸려야 하는
 * 입력**과 **통과해야 하는 입력**을 둘 다 대 본다 — 거기가 빨개지면 도구를 믿지 마라.
 *
 * ⚠️ **이 파일은 초5 1-5(g5 소유)의 산출물을 읽는다.** 손 목록 대신 실제 발문을 대조하는
 * 대가로, **g5 가 초5 1-5 를 건드리면 여기가 빨개질 수 있다.** 그때 의심할 곳은 초4 가
 * 아니라 «두 학년이 같은 문형을 쓰게 됐는가» 다 — 자기 코드부터 뒤지지 말 것.
 * 겹침이 진짜면 고칠 쪽은 **그 문형이 자기 소단원 이름의 약속을 덜 담고 있는 쪽**이다.
 * 둘 다 담고 있으면 **소재·장면을 바꿀 여지가 더 많은 쪽**이 비킨다. 판단은 팀장이 가른다.
 *
 * (한때 「나중에 그 문형을 쓴 학년이 비킨다」고 적었다. 커밋 순서는 우연이라 그러면
 *  **먼저 착지한 쪽이 문형을 선점**한다 — 근거가 내용이 아니라 시각인 규칙이었다.)
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = ["2-1-1", "2-1-2", "2-1-3", "2-1-4"] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);
const WIDE = Array.from({ length: 200 }, (_, i) => 31337 + i * 104729);

function unitOf(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(code),
  );
  expect(u, `${grade} ${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function gen(code: string, seed: number, tier?: ElemTier) {
  return generateElementaryProblem(unitOf("초4", code), seed, tier);
}

/* ─────────────────────────── 도구 (제품을 안 쓴다) ─────────────────────────── */

/** 최대공약수 — 기약 판정의 «참». 제품 `math.ts` 를 안 부른다. */
function gcdOf(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y !== 0) [x, y] = [y, x % y];
  return x === 0 ? 1 : x;
}

type Frac = { whole: number; num: number; den: number };

/** 본문에 적힌 분수를 **나온 차례대로**. 자연수 부분이 붙어 있으면 대분수다. */
function fracsIn(text: string): Frac[] {
  const out: Frac[] = [];
  const re = /(\d+)?\\frac\{(\d+)\}\{(\d+)\}/g;
  let m = re.exec(text);
  while (m !== null) {
    out.push({
      whole: m[1] === undefined ? 0 : Number(m[1]),
      num: Number(m[2]),
      den: Number(m[3]),
    });
    m = re.exec(text);
  }
  return out;
}

/** 분수 하나가 나타내는 값을 **분자 단위**로. 분모가 같은 범위라 이것으로 다 된다. */
function unitsOfFrac(f: Frac): number {
  return f.whole * f.den + f.num;
}

/** 대분수 정본 꼴을 **직접 조립**한다 — 제품 `fmtFrac` 을 안 부른다. */
function mixedForm(total: number, den: number): string {
  const w = Math.floor(total / den);
  const r = total % den;
  if (r === 0) return String(w);
  if (w === 0) return `\\frac{${r}}{${den}}`;
  return `${w}\\frac{${r}}{${den}}`;
}

/**
 * 「합이 $1$ / $\frac{7}{9}$」 에서 **분자 합**을 읽는다 (확대 갈래가 쓴다).
 * 합이 정확히 분모면 `fmtFrac` 이 `1` 로 찍으므로 분수가 아니다.
 */
function sumNumerators(content: string, den: number): number {
  const proper = /합이 \$\\frac\{(\d+)\}\{(\d+)\}\$/.exec(content);
  if (proper) return Number(proper[1]);
  const whole = /합이 \$(\d+)\$/.exec(content);
  expect(whole, `합을 못 읽었다: ${content}`).toBeTruthy();
  return Number(whole![1]) * den;
}

/** 분모 `den`, 분자 합 `sum` 인 **서로 다른** 두 진분수의 분자 쌍(작은 쪽 오름차순). */
function numeratorPairsIn(den: number, sum: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 1; p < sum - p; p += 1) {
    const q = sum - p;
    if (q <= den - 1) out.push([p, q]);
  }
  return out;
}

/** 수를 가린 골격. 「같은 문장인데 수만 다른」 겹침을 여기서 본다. */
function skeleton(content: string): string {
  return content
    .replace(/\$[^$]*\$/g, "⟨수⟩")
    .replace(/\s+/g, " ")
    .trim();
}

/** `$...$` 안의 수들. 「$7$, $8$」 같은 여러 답을 읽을 때 쓴다. */
function plainNums(text: string): number[] {
  return [...text.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
}

/* ─────────────────────────── 값의 참을 발문에서 ─────────────────────────── */

/** 답 한 덩어리를 KaTeX 로 감싼다 — 제품과 **같은 규약**을 시험 쪽에서 직접 쓴다. */
function wrap(latex: string): string {
  return `$${latex}$`;
}

/**
 * 갈래마다 **발문만 읽어** 답을 다시 세운다. 반환은 **정답 문자열 전체**다(감쌈 포함).
 * 못 세는 갈래는 두지 않는다 — 열여섯 개 전부 여기 있다.
 */
const REDERIVE: Record<string, (content: string) => string> = {
  // ── 2-1-1 진분수의 덧셈
  "2-1-1|연산": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(x!.num + y!.num, x!.den));
  },
  "2-1-1|기본": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(x!.num + y!.num, x!.den));
  },
  // 「$b$ 만큼 더 긴 쪽」을 거친다 — 답은 $a + (a+b)$.
  "2-1-1|응용": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(2 * x!.num + y!.num, x!.den));
  },
  // 더할 것을 뺐다: 어떤 수 = 잘못된 값 + b, 바른 답 = 어떤 수 + b. 차는 $2b$.
  "2-1-1|심화하": (c) => {
    const [add, wrong] = fracsIn(c);
    const den = add!.den;
    return wrap(
      c.includes("차는")
        ? mixedForm(2 * add!.num, den)
        : mixedForm(wrong!.num + 2 * add!.num, den),
    );
  },

  // ── 2-1-2 진분수의 뺄셈
  "2-1-2|연산": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(x!.num - y!.num, x!.den));
  },
  "2-1-2|기본": (c) => {
    const [x] = fracsIn(c);
    return wrap(mixedForm(x!.den - x!.num, x!.den));
  },
  "2-1-2|응용": (c) => {
    const [x, y, z] = fracsIn(c);
    return wrap(mixedForm(x!.num - y!.num - z!.num, x!.den));
  },
  // 조건 결합 — 셈이 아니라 **전수로 세어** 대조한다.
  "2-1-2|심화하": (c) => {
    const [x, y] = fracsIn(c);
    const den = x!.den;
    const gap = x!.num - y!.num;
    let count = 0;
    for (let k = 1; k <= den - 1; k += 1) {
      if (c.includes("작으면서") ? k < gap : k > gap) count += 1;
    }
    return `${wrap(String(count))}개`;
  },

  // ── 2-1-3 대분수의 덧셈
  "2-1-3|연산": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(unitsOfFrac(x!) + unitsOfFrac(y!), x!.den));
  },
  "2-1-3|기본": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(unitsOfFrac(x!) + unitsOfFrac(y!), x!.den));
  },
  "2-1-3|응용": (c) => {
    const [x, y, z] = fracsIn(c);
    return wrap(
      mixedForm(unitsOfFrac(x!) + unitsOfFrac(y!) + unitsOfFrac(z!), x!.den),
    );
  },
  // 수 카드 — 만들 수 있는 대분수를 **전부 만들어** 최대·최소를 고른다.
  "2-1-3|심화하": (c) => {
    const cards = c.match(/수 카드 \$(\d+)\$, \$(\d+)\$, \$(\d+)\$/);
    expect(cards, `수 카드를 못 읽음: ${c}`).toBeTruthy();
    const den = Number(c.match(/분모가 \$(\d+)\$인/)![1]);
    const made: number[] = [];
    const ns = [Number(cards![1]), Number(cards![2]), Number(cards![3])];
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        if (i === j) continue;
        made.push(ns[i]! * den + ns[j]!);
      }
    }
    return wrap(mixedForm(Math.max(...made) + Math.min(...made), den));
  },

  // ── 2-1-4 대분수의 뺄셈
  "2-1-4|연산": (c) => {
    const [x, y] = fracsIn(c);
    return wrap(mixedForm(unitsOfFrac(x!) - unitsOfFrac(y!), x!.den));
  },
  // 자연수 − 대분수. 자연수는 분수가 아닌 맨 `$N$` 이다.
  "2-1-4|기본": (c) => {
    const [cut] = fracsIn(c);
    const whole = Number(c.match(/\$(\d+)\$ (?:m|kg)/)![1]);
    return wrap(mixedForm(whole * cut!.den - unitsOfFrac(cut!), cut!.den));
  },
  "2-1-4|응용": (c) => {
    const fs = fracsIn(c).map(unitsOfFrac);
    return wrap(
      mixedForm(Math.max(...fs) - Math.min(...fs), fracsIn(c)[0]!.den),
    );
  },
  /* ── 확대 갈래 (D-113 둘째 물결, 2026-08-31) ───────────────────────────
   *
   * 이 자리는 **저절로 늘어난다** — `tiersOf(unit)` 를 도는 시험이라 소단원에
   * `심화중`·`심화상` 을 등록하는 순간 「재도출이 없다」로 빨개진다(D-113 ⑺ 의 설계).
   * 아래도 **발문만 읽어** 답을 다시 세운다.
   */

  /** 분모 `den`, 분자 합 `sum` 인 서로 다른 두 진분수의 분자 쌍(작은 쪽 오름차순). */
  // (아래 셋이 같이 쓴다 — 시험 안에서 한 곳에 둔다.)
  "2-1-1|심화중": (c) => {
    const den = Number(c.match(/분모가 \$(\d+)\$인/)![1]);
    const sum = sumNumerators(c, den);
    const cut = Number(
      c.match(/작은 분수가 \$\\frac\{(\d+)\}\{\d+\}\$보다/)![1],
    );
    const over = c.includes("보다 클 때");
    const alive = numeratorPairsIn(den, sum).filter(([p]) =>
      over ? p > cut : p < cut,
    );
    expect(alive, `2-1-1 심화중 후보가 하나가 아니다: ${c}`).toHaveLength(1);
    const [small, big] = alive[0]!;
    return wrap(
      `\\frac{${c.includes("때 작은 분수를") ? small : big}}{${den}}`,
    );
  },
  // 차만 주면 「어느 쪽이 큰지」가 안 굳는다 — 크기 조건이 하나를 고르고 한 걸음이 남는다.
  "2-1-2|심화중": (c) => {
    // ⚠️ `fracsIn` 을 자리로 destructure 하면 안 된다 — 기준 분수가 **두 번** 나온다
    //    (「…와 $A$ 의 차가 $B$」·「어떤 진분수는 $A$ 보다 큽니다」). 이름으로 읽는다.
    const den = Number(c.match(/\\frac\{\d+\}\{(\d+)\}/)![1]);
    const base = Number(
      c.match(/어떤 진분수와 \$\\frac\{(\d+)\}\{\d+\}\$의 차가/)![1],
    );
    const gap = Number(
      c.match(/의 차가 \$\\frac\{(\d+)\}\{\d+\}\$입니다/)![1],
    );
    const minus = Number(
      c.match(/어떤 진분수에서 \$\\frac\{(\d+)\}\{\d+\}\$[을를] 뺀/)![1],
    );
    const value = c.includes("보다 큽니다") ? base + gap : base - gap;
    return wrap(`\\frac{${value - minus}}{${den}}`);
  },
  // 합에서 쌍을 만든 뒤 **쌍마다 실제로 빼 보아야** 창에 드는 것이 하나 남는다.
  "2-1-2|심화상": (c) => {
    const den = Number(c.match(/분모가 \$(\d+)\$인/)![1]);
    const sum = sumNumerators(c, den);
    const lo = Number(
      c.match(/뺀 값이 \$\\frac\{(\d+)\}\{\d+\}\$보다 크고/)![1],
    );
    const hi = Number(
      c.match(/보다 크고 \$\\frac\{(\d+)\}\{\d+\}\$보다 작을 때/)![1],
    );
    const alive = numeratorPairsIn(den, sum).filter(
      ([p, q]) => q - p > lo && q - p < hi,
    );
    expect(alive, `2-1-2 심화상 후보가 하나가 아니다: ${c}`).toHaveLength(1);
    const [small, big] = alive[0]!;
    return wrap(
      `\\frac{${c.includes("작은 분수를 구하시오") ? small : big}}{${den}}`,
    );
  },
  // 자연수 부분이 하나 커졌다 = **받아올림**. 분수 부분의 합은 `1 + r/d` 다.
  "2-1-3|심화중": (c) => {
    const [sum] = fracsIn(c);
    return wrap(String(sum!.den + sum!.num));
  },
  // 자연수 부분의 차보다 하나 작다 = **받아내림**. 빼는 분자의 최솟값은 `topNum + 1`.
  "2-1-4|심화중": (c) => {
    const [top] = fracsIn(c);
    const diffWhole = Number(
      c.match(/차의 자연수 부분이 \$(\d+)\$[이가] 되었습니다/)![1],
    );
    const smallest = top!.num + 1;
    return wrap(
      `${diffWhole}\\frac{${top!.den + top!.num - smallest}}{${top!.den}}`,
    );
  },

  // 부등식 — $\square$ 에 $1$ 부터 분모 직전까지 **전부 넣어 보고** 답을 짠다.
  "2-1-4|심화하": (c) => {
    const [left, right] = fracsIn(c);
    const subWhole = Number(c.match(/(\d+)\\frac\{\\square\}\{(\d+)\}/)![1]);
    const den = left!.den;
    const target = unitsOfFrac(right!);
    const ok: number[] = [];
    for (let k = 1; k <= den - 1; k += 1) {
      const got = unitsOfFrac(left!) - (subWhole * den + k);
      if (c.includes("보다 클 때") ? got > target : got < target) ok.push(k);
    }
    return ok.map((v) => `$${v}$`).join(", ");
  },
};

/* ─────────────────────────────── 시험 ─────────────────────────────── */

describe("초4 2-1 분수의 덧셈과 뺄셈 — 4단 등록", () => {
  it.each(CODES)("%s 는 네 갈래가 다 있다", (code) => {
    expectCoreTiers(unitOf("초4", code), code);
  });
});

describe("답의 꼴 — 기약·대분수 정본 (gcd 로 독립 검산)", () => {
  it("답에 든 분수는 기약이고 분자가 분모보다 작다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          for (const f of fracsIn(p.answer)) {
            if (gcdOf(f.num, f.den) !== 1) {
              bad.push(`${code} «${tier}» 약분됨: ${p.answer}`);
            }
            if (f.num >= f.den) {
              bad.push(`${code} «${tier}» 가분수 답: ${p.answer}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("답 문자열이 발문에서 다시 세운 정본 꼴과 글자까지 같다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        const rederive = REDERIVE[`${code}|${tier}`];
        expect(rederive, `${code} «${tier}» 재도출이 없다`).toBeTruthy();
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const want = rederive!(p.content);
          if (p.answer !== want) {
            bad.push(
              `${code} «${tier}» s${seed}: 답 ${p.answer} ≠ 재도출 ${want}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe("소단원 이름이 약속하는 성질이 지면에 선다", () => {
  it("2-1-1·2-1-2 의 발문 분수는 전부 진분수다", () => {
    const bad: string[] = [];
    for (const code of ["2-1-1", "2-1-2"] as const) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          for (const f of fracsIn(p.content)) {
            if (f.whole !== 0 || f.num >= f.den) {
              bad.push(`${code} «${tier}» s${seed}: ${p.content}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("2-1-3·2-1-4 의 발문에는 대분수가 적어도 하나 있다", () => {
    const bad: string[] = [];
    for (const code of ["2-1-3", "2-1-4"] as const) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          if (!fracsIn(p.content).some((f) => f.whole > 0)) {
            bad.push(`${code} «${tier}» s${seed}: ${p.content}`);
          }
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("뺄셈 소단원의 답은 늘 양수다 (구성으로 보장되는가)", () => {
    for (const code of ["2-1-2", "2-1-4"] as const) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          expect(p.answer, `${code} «${tier}» s${seed}`).not.toMatch(/-\d/);
          for (const f of fracsIn(p.answer)) {
            expect(f.num, `${code} «${tier}» s${seed}`).toBeGreaterThan(0);
          }
        }
      }
    }
  });
});

describe("동분모 — 초4 를 초5 1-5 와 가르는 판별자", () => {
  it("초4 2-1 은 표준·갈래 전부 발문 분모가 하나뿐이다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of [undefined, ...tiersOf(unitOf("초4", code))]) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          const dens = new Set(fracsIn(p.content).map((f) => f.den));
          if (dens.size > 1) {
            bad.push(`${code} «${tier ?? "표준"}» s${seed}: ${p.content}`);
          }
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  // 음성 대조군 — 이것이 없으면 위 검사가 «가르는지»를 알 수 없다.
  it("초5 1-5 에는 분모가 다른 발문이 실제로 있다", () => {
    let mixed = 0;
    for (const code of ["1-5-1", "1-5-2", "1-5-3", "1-5-4"] as const) {
      for (const tier of tiersOf(unitOf("초5", code))) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf("초5", code), seed, tier);
          if (new Set(fracsIn(p.content).map((f) => f.den)).size > 1)
            mixed += 1;
        }
      }
    }
    expect(mixed).toBeGreaterThan(0);
  });
});

describe("겹침 — 초5 1-5 · 초4 2-1 표준", () => {
  const mine = new Map<string, string>();
  for (const code of CODES) {
    for (const tier of tiersOf(unitOf("초4", code))) {
      for (const seed of WIDE) {
        const p = gen(code, seed, tier);
        mine.set(p.content, `초4 ${code} «${tier}»`);
      }
    }
  }

  it("초5 1-5 와 발문이 한 건도 안 겹친다", () => {
    const hit: string[] = [];
    for (const code of ["1-5-1", "1-5-2", "1-5-3", "1-5-4"] as const) {
      for (const tier of [undefined, ...tiersOf(unitOf("초5", code))]) {
        for (const seed of WIDE) {
          const p = generateElementaryProblem(unitOf("초5", code), seed, tier);
          const where = mine.get(p.content);
          if (where) hit.push(`${where} = 초5 ${code}: ${p.content}`);
        }
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });

  it("초5 1-5 와 «수를 가린 골격»도 안 겹친다", () => {
    const skeletons = new Map<string, string>();
    for (const [content, where] of mine)
      skeletons.set(skeleton(content), where);
    const hit: string[] = [];
    for (const code of ["1-5-1", "1-5-2", "1-5-3", "1-5-4"] as const) {
      for (const tier of [undefined, ...tiersOf(unitOf("초5", code))]) {
        for (const seed of WIDE) {
          const p = generateElementaryProblem(unitOf("초5", code), seed, tier);
          const where = skeletons.get(skeleton(p.content));
          if (where) hit.push(`${where} ≈ 초5 ${code}: ${p.content}`);
        }
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });

  it("같은 소단원의 표준과도 발문·골격이 안 겹친다 (R5)", () => {
    const hit: string[] = [];
    const skeletons = new Map<string, string>();
    for (const [content, where] of mine)
      skeletons.set(skeleton(content), where);
    for (const code of CODES) {
      for (const seed of WIDE) {
        const p = gen(code, seed);
        if (mine.has(p.content))
          hit.push(`표준 ${code} = ${mine.get(p.content)}`);
        const near = skeletons.get(skeleton(p.content));
        if (near) hit.push(`표준 ${code} ≈ ${near}: ${p.content}`);
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });
});

describe("변형 — 씨앗이 바뀌면 발문이 바뀐다", () => {
  it("갈래마다 씨앗 16개에서 발문이 8가지 이상", () => {
    const thin: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf("초4", code))) {
        const seen = new Set(SEEDS.map((s) => gen(code, s, tier).content));
        if (seen.size < 8) thin.push(`${code} «${tier}» ${seen.size}가지`);
      }
    }
    expect(thin).toEqual([]);
  });
});

/*
 * 눈검수로 찾아 **고친** 자리를 여기서 잠근다.
 *
 * ⚠️ 리드 검수(2026-08-23)에서 셋 다 **되돌려도 시험이 초록**이었다 — 산출물은 바뀌는데
 * 아무 검사도 안 물었다. 「고쳤다」와 「고친 것이 지켜진다」는 다른 말이다.
 *
 * 씨앗을 1,200개 쓰는 이유: 가장 드문 것이 **29/1200** 이었다. 다른 검사가 쓰는 16개로는
 * 이 부류를 **구조적으로** 못 본다.
 *
 * 그리고 각 검사는 「그 상황이 실제로 나왔는가」를 함께 센다 — 무리가 비면 조건이 참이라
 * 초록이 되고, 그건 확인이 아니라 요행이다.
 */
describe("눈으로 찾아 고친 자리 — 전수 쓸기로 잠근다", () => {
  const SWEEP = Array.from({ length: 1200 }, (_, i) => 20260823 + i * 7919);

  it("전체가 $1$ 인 상황(화단)에는 합이 $1$ 을 넘는 짝이 안 온다", () => {
    const bad: string[] = [];
    let seen = 0;
    for (const seed of SWEEP) {
      const p = gen("2-1-1", seed, "기본");
      if (!p.content.includes("화단")) continue;
      seen += 1;
      const fs = fracsIn(p.content);
      const sum = fs.reduce((s, f) => s + f.num, 0);
      if (sum >= fs[0]!.den) bad.push(`s${seed}: ${p.content}`);
    }
    // 무리가 비면 조건이 참이라 초록이 된다 — 「그 상황이 실제로 나왔나」를 먼저 못 박는다.
    expect(seen).toBeGreaterThan(50);
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("2-1-4 해설의 자연수 뺄셈 결과는 늘 $1$ 이상이다 (문체 선택)", () => {
    // 결함이 아니라 **문체**다 — 표준은 「$1-1=0$, …」 을 그대로 쓴다. 갈래에서만 답이
    // 늘 대분수로 서는 쪽을 골랐고, 그 의도를 여기 남긴다. 표준을 이것에 맞추지 말 것.
    const bad: string[] = [];
    let seen = 0;
    for (const tier of tiersOf(unitOf("초4", "2-1-4"))) {
      for (const seed of SWEEP) {
        const p = gen("2-1-4", seed, tier);
        for (const m of p.solution.matchAll(/\$(\d+)-(\d+)=(\d+)\$/g)) {
          seen += 1;
          if (Number(m[3]) < 1) bad.push(`«${tier}» s${seed}: ${m[0]}`);
        }
      }
    }
    expect(seen).toBeGreaterThan(1000);
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("2-1-3 기본·응용의 대분수는 발문 안에서 서로 다르다", () => {
    const bad: string[] = [];
    let seen = 0;
    for (const tier of ["기본", "응용"] as const) {
      for (const seed of SWEEP) {
        const p = gen("2-1-3", seed, tier);
        const shown = fracsIn(p.content).map(
          (f) => `${f.whole}|${f.num}|${f.den}`,
        );
        if (shown.length < 2) continue;
        seen += 1;
        if (new Set(shown).size !== shown.length) {
          bad.push(`«${tier}» s${seed}: ${p.content}`);
        }
      }
    }
    expect(seen).toBeGreaterThan(2000);
    expect(bad.slice(0, 3)).toEqual([]);
  });
});

describe("조사 — 분수 뒤 조사는 «분자의 소리»가 정한다", () => {
  /** 끝 숫자를 한자 수사로 읽었을 때 받침이 있는가. 영·일·삼·육·칠·팔 만 있다. */
  const BATCHIM: Record<string, boolean> = {
    "0": true,
    "1": true,
    "2": false,
    "3": true,
    "4": false,
    "5": false,
    "6": true,
    "7": true,
    "8": true,
    "9": false,
  };
  const PAIRS: Record<string, boolean> = {
    을: true,
    를: false,
    이: true,
    가: false,
    과: true,
    와: false,
    은: true,
    는: false,
  };

  /**
   * `$...$` 뒤에 조사가 온 자리를 모아 «틀린 것」만 돌려준다.
   *
   * ⚠️ 처음에는 **붙여 쓴 조사만** 봤다. 그래서 「$4\frac{1}{7}$ **와** 같이」처럼
   * 한 칸 띄운 자리를 통째로 못 봤다(2026-08-23 눈검수에서 나왔다 — 시험은 초록이었다).
   * 이제 공백 하나까지 본다. 다만 「$3$ **은행**」의 «은» 처럼 **낱말의 첫 글자**를 조사로
   * 읽으면 거짓 경보가 나므로, 뒤에 한글이 이어지면 조사가 아니라고 본다.
   */
  function josaFaults(text: string): string[] {
    const bad: string[] = [];
    const re = /\$([^$]*)\$ ?(을|를|이|가|과|와|은|는)(?![가-힣])/g;
    let m = re.exec(text);
    while (m !== null) {
      const span = m[1]!;
      // 분수는 「십분의 육」처럼 **분자를 마지막에 읽는다** — 소리를 정하는 것은 분자다.
      const asFrac = span.match(/\\frac\{(\d+)\}\{\d+\}$/);
      const asNum = span.match(/(\d+)$/);
      const digits = asFrac?.[1] ?? asNum?.[1];
      if (digits !== undefined) {
        const want = BATCHIM[digits.slice(-1)!]!;
        // 잡힌 자리를 **있는 그대로** 적는다 — 띄어쓰기까지 보여야 어디를 고칠지 안다.
        if (PAIRS[m[2]!] !== want) bad.push(m[0]);
      }
      m = re.exec(text);
    }
    return bad;
  }

  it("초4 2-1 은 표준·갈래 전부 발문·해설의 조사가 맞다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      for (const tier of [undefined, ...tiersOf(unitOf("초4", code))]) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const f of [
            ...josaFaults(p.content),
            ...josaFaults(p.solution),
          ]) {
            bad.push(`${code} «${tier ?? "표준"}» s${seed}: ${f}`);
          }
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("자체 눈금 — 틀린 조사를 실제로 잡고 맞는 것은 통과시킨다", () => {
    expect(josaFaults("$\\frac{6}{10}$를 더하면")).toEqual([
      "$\\frac{6}{10}$를",
    ]);
    expect(josaFaults("$\\frac{6}{10}$을 더하면")).toEqual([]);
    expect(josaFaults("$\\frac{2}{5}$가 되었다")).toEqual([]);
    expect(josaFaults("$\\frac{2}{5}$이 되었다")).toEqual(["$\\frac{2}{5}$이"]);
    expect(josaFaults("$1$을 받아올려")).toEqual([]);
    // 한 칸 띄운 조사도 본다 — 「칠분의 일」은 «과»다. 이 자리를 못 봐서 결함이 샜다.
    expect(josaFaults("$4\\frac{1}{7}$ 와 같이")).toEqual([
      "$4\\frac{1}{7}$ 와",
    ]);
    expect(josaFaults("$4\\frac{1}{7}$과 같이")).toEqual([]);
    // 낱말의 첫 글자를 조사로 읽으면 안 된다 — 거짓 경보는 가드를 끈다.
    expect(josaFaults("$3$ 은행나무")).toEqual([]);
    expect(josaFaults("$3$ 이등변삼각형")).toEqual([]);
    // □ 는 소리를 모른다 — 판정하지 않는다(조용히 통과시키는 것이 아니라 «못 잰다»).
    expect(josaFaults("$1\\frac{\\square}{9}$를 뺀")).toEqual([]);
  });
});

describe("자체 눈금 — 이 파일의 도구가 살아 있는가", () => {
  it("분수를 읽는다 (대분수·진분수·가분수)", () => {
    expect(fracsIn("$2\\frac{1}{3}+\\frac{4}{3}$")).toEqual([
      { whole: 2, num: 1, den: 3 },
      { whole: 0, num: 4, den: 3 },
    ]);
    // 역슬래시가 한 겹 벗겨지면 여기가 빨개진다 — 「0건이라 깨끗」과 「못 셈」을 가른다.
    expect(fracsIn("frac{1}{3}")).toEqual([]);
  });

  it("대분수 정본 꼴을 조립한다", () => {
    expect(mixedForm(7, 5)).toBe("1\\frac{2}{5}");
    expect(mixedForm(3, 5)).toBe("\\frac{3}{5}");
    expect(mixedForm(10, 5)).toBe("2");
  });

  it("기약 판정이 약분되는 분수를 잡는다", () => {
    expect(gcdOf(2, 4)).toBe(2);
    expect(gcdOf(5, 8)).toBe(1);
  });

  it("골격은 수만 가리고 문장은 남긴다", () => {
    expect(skeleton("합은 $\\frac{1}{3}$ 이고 $2$ 다")).toBe(
      "합은 ⟨수⟩ 이고 ⟨수⟩ 다",
    );
    // 수가 달라도 골격은 같아야 겹침을 잡을 수 있다.
    expect(skeleton("계산하시오. $\\frac{1}{2}$")).toBe(
      skeleton("계산하시오. $\\frac{7}{9}$"),
    );
  });

  it("여러 답을 읽는다", () => {
    expect(plainNums("$7$, $8$")).toEqual([7, 8]);
  });
});
