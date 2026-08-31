/**
 * 중1 **상위 갈래**(`m1Top.ts`) — `심화중`·`심화상` 을 지킨다 (D-116).
 *
 * ## 검산이 무엇을 보는가 — **지면만 본다**
 *
 * `VERIFY` 의 함수는 인자가 **`content` 하나**다. `facts` 도 `answer` 도 안 받는다.
 * 그래서 생성기의 산술을 옮겨 적을 수가 **구조적으로 없다** — 지면에 실제로 찍힌
 * 글자를 파싱해 **다른 길로** 답을 다시 낸다.
 *
 * | 유형 | 생성기가 간 길 | 여기가 가는 길 |
 * |---|---|---|
 * | `31T` | 답 $g$·나머지 $R$ 을 골라 세 수를 만든다 | 찍힌 세 수의 **차를 직접 빼서** 최대공약수를 잡는다 |
 * | `32T` | 소인수 셋을 골라 $L=G n$ 을 만든다 | 찍힌 $G$, $L$ 에서 $n$ 을 나누고 **약수를 훑어** 서로소인 쌍을 찾는다 |
 * | `94T` | $k$ 를 정하고 $A$ 를 역산한다 | 찍힌 비를 $t=1$ 로 **대입해** 식의 값을 구하고 방정식을 **직접 푼다** |
 * | `95T` | 살아남는 $a$ 를 고르고 지면을 만든다 | 찍힌 두 방정식에서 $a$ 를 $1$부터 **훑어** 둘 다 자연수인 것을 모은다 |
 *
 * ## 🔴 이 회차가 실제로 물린 결함 둘을 여기서 잠근다
 *
 * ⑴ **`32T` 의 「서로소」가 장식이었다.** $n$ 이 무제곱이면 곱이 $n$ 인 **모든** 쌍이
 *    저절로 서로소라 그 조건을 안 읽어도 답이 같다. 판정기가 「굳힘 조건을 지운 답」이
 *    **54.2%** 로 맞는다고 찍어서야 드러났다. `서로소 조건이 실제로 거른다` 가 그것이다.
 * ⑵ **`94T` 발문에 상수 $A$ 가 안 보였다.** 값을 찍어 버려서 「상수 $A$」가 발문
 *    어디에도 없는, **풀 수 없는 문항**이 나왔다. 값 검산은 답이 맞으니 통과한다 —
 *    `m1Types10.ts` 의 `91` 이 같은 자리에 주석을 남겨 두었는데도 밟았다.
 *    `발문이 묻는 글자를 실제로 담는다` 가 그것이다.
 *
 * ## 눈금 — **이 자가 «아니오» 를 낼 수 있는가**
 *
 * 검산기를 **엔진을 거치지 않은 손으로 쓴 지면**에 먼저 대 본다 — 양성(답을 아는
 * 지면에서 그 답을 낸다)과 음성(모양이 어긋나거나 불변식을 어긴 지면은 **던진다**).
 * 손으로 쓴 지면에는 `facts` 가 없으므로, 검산기가 `facts.x` 를 되읽는 판이었다면
 * 이 눈금은 **통과할 수가 없다**(2026-08-21 「0 은 «깨끗»과 «못 셈»을 안 가른다」).
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "@/lib/elementary/rules";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { pointsAtFigure } from "@/lib/middle/figureReference";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "@/lib/middle/generate";
import {
  coprimePairSums,
  divisors,
  gcd,
  M1_TOP,
  naturalRootCandidates,
  ratioValue,
  solveSameRemainder,
  survivorsAreContiguous,
  thirdNumberMatters,
} from "@/lib/middle/m1Top";

import { josaMismatches, pageSmells } from "../helpers/midPage";

const SEEDS = [20260901, 1, 7, 424242, 99991];
const VARIANTS = 4;

const K31 = "1-1|최대공약수와 최소공배수|31T";
const K32 = "1-1|최대공약수와 최소공배수|32T";
const K94 = "1-1|일차방정식의 풀이|94T";
const K95 = "1-1|일차방정식의 풀이|95T";

/** 유형마다 사람이 못 박은 갈래 — 조용히 바뀌면 빨개진다. */
const EXPECTED_TIER: Record<string, string> = {
  [K31]: "심화중",
  [K32]: "심화상",
  [K94]: "심화중",
  [K95]: "심화상",
};

// ── 소품 ────────────────────────────────────────────────────

/** 파싱이 안 되면 **던진다** — 조용히 통과시키면 그 유형은 분모 밖이 된다. */
function grab(re: RegExp, content: string, who: string): string[] {
  const m = re.exec(content);
  if (m === null) throw new Error(`${who}: 지면 모양이 다르다 — ${content}`);
  return m.slice(1);
}

const num = (s: string): number => Number(s);

function answerNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (m === null) throw new Error(`답에 수가 없다: ${text}`);
  return Number(m[0]);
}

/**
 * **지면을 제품 렌더러로 실제로 그려 본다** — 붉거나 중립 폴백이면 참.
 *
 * 값 검산도 냄새 자도 이 축을 못 본다: 없는 명령이나 날 LaTeX 는 **값이 맞고
 * 냄새 목록에도 없다.** 판정을 명령 목록으로 하지 않고 **화면과 같은 방식으로
 * 렌더해서** 한다 — 목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다.
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

const VERIFY: Record<string, (content: string) => number> = {
  // 31T — 찍힌 세 수를 **직접 빼서** 차들의 최대공약수를 잡는다.
  //       생성기는 $g$·$R$ 에서 세 수를 만들었다. 여기는 그 둘을 **모른 채** 간다.
  [K31]: (content) => {
    const [a, b, c] = grab(
      /세 자연수 \$(\d+)\$, \$(\d+)\$, \$(\d+)\$\S* 어떤 자연수로 나누면 나머지가 모두 같다/,
      content,
      "31T",
    );
    const nums = [num(a!), num(b!), num(c!)].sort((x, y) => x - y);
    const g = gcd(nums[1]! - nums[0]!, nums[2]! - nums[1]!);
    // 불변식 — 나머지가 실재해야 한다(모두 같고, $0$ 보다 크고, $g$ 보다 작다).
    const rs = nums.map((v) => v % g);
    if (new Set(rs).size !== 1) throw new Error(`31T: 나머지가 안 같다 ${rs}`);
    if (rs[0] === 0) throw new Error("31T: 나머지가 0 이면 다른 유형이다");
    // 불변식 — 셋 중 하나를 빼도 답이 같으면 그 수는 장식이다(㉠).
    if (!thirdNumberMatters(nums)) throw new Error("31T: 셋째 수가 장식이다");
    return g;
  },

  // 32T — 찍힌 $G$, $L$ 만으로 $n$ 을 되찾고 **약수를 훑어** 서로소인 쌍을 모은다.
  [K32]: (content) => {
    const [g, l] = grab(
      /최대공약수가 \$(\d+)\$이고 최소공배수가 \$(\d+)\$이다/,
      content,
      "32T",
    );
    const G = num(g!);
    const L = num(l!);
    if (L % G !== 0) throw new Error(`32T: ${L} 이 ${G} 로 안 나누어떨어진다`);
    const n = L / G;
    const sums: number[] = [];
    for (const a of divisors(n)) {
      const b = n / a;
      if (a > b) continue;
      if (gcd(a, b) !== 1) continue;
      sums.push(G * (a + b));
    }
    // 소인수가 셋이므로 서로소인 쌍은 **정확히 넷**이다. 셋 이하면 「넷을 다 만들어
    // 견준다」가 성립하지 않으므로 이 유형이 아니다.
    if (sums.length !== 4)
      throw new Error(`32T: 서로소인 쌍이 ${sums.length} 개다 (넷이어야 한다)`);
    if (new Set(sums).size !== sums.length)
      throw new Error("32T: 합이 겹치면 「모든 수」가 아니다");
    return sums.reduce((p, q) => p + q, 0);
  },

  // 94T — 비를 $t=1$ 로 **대입해** 식의 값을 구하고, 방정식을 $A$ 에 대해 **직접 푼다**.
  [K94]: (content) => {
    const [r1, r2, r3, c1, c2, c3, p, q, s] = grab(
      /a:b:c=(\d+):(\d+):(\d+)\$이다\. \$\\dfrac\{(-?\d+)a([+-]\d+)b([+-]\d+)c\}\{b\}\$의 값이 \$x\$에 대한 일차방정식 \$(-?\d+)x\+A=(-?\d+)x([+-]\d+)\$의 해일 때/,
      content,
      "94T",
    );
    const a = num(r1!);
    const b = num(r2!);
    const c = num(r3!);
    const k = (num(c1!) * a + num(c2!) * b + num(c3!) * c) / b;
    if (!Number.isInteger(k))
      throw new Error(`94T: 식의 값이 정수가 아니다 ${k}`);
    if (num(p!) === num(q!)) throw new Error("94T: 일차방정식이 아니다");
    // $pk + A = qk + s$ 를 $A$ 에 대해 푼다.
    return num(q!) * k + num(s!) - num(p!) * k;
  },

  // 95T — 찍힌 두 방정식에서 $a$ 를 $1$부터 **훑어** 둘 다 자연수인 것을 모은다.
  [K95]: (content) => {
    const [p, rhs, t, n] = grab(
      /두 일차방정식 \$ax-(\d+)=(\d+)\$, \$\\left\(a\+(\d+)\\right\)x=(\d+)\$의 해가 모두 자연수/,
      content,
      "95T",
    );
    const m = num(p!) + num(rhs!);
    const T = num(t!);
    const N = num(n!);
    const kept: number[] = [];
    for (let a = 1; a <= m; a += 1) {
      if (m % a !== 0) continue;
      if (N % (a + T) !== 0) continue;
      kept.push(a);
    }
    if (kept.length < 2) throw new Error("95T: 살아남는 $a$ 가 둘 미만이다");
    // 불변식 — 둘째 조건이 실제로 걸러야 하고(㉠), 살아남는 자리가 띄엄띄엄이어야 한다.
    const all = divisors(m);
    if (all.length - kept.length < 3)
      throw new Error("95T: 둘째 조건이 거의 안 거른다");
    if (survivorsAreContiguous(all, kept))
      throw new Error("95T: 살아남는 자리가 연속이라 찍기가 통한다");
    return kept.reduce((x, y) => x + y, 0);
  },
};

// ── 눈금 — 손으로 쓴 지면 (엔진을 안 거친다) ──────────────────

/** 양성: 답을 아는 지면에서 그 답을 낸다. */
const CALIBRATION: ReadonlyArray<readonly [string, string, number]> = [
  [
    K31,
    "세 자연수 $75$, $183$, $318$을 어떤 자연수로 나누면 나머지가 모두 같다. 이러한 자연수 중 가장 큰 수를 구하시오.",
    27,
  ],
  [
    K32,
    "두 자연수 $A$, $B$의 최대공약수가 $4$이고 최소공배수가 $560$이다. $A+B$의 값이 될 수 있는 모든 수의 합을 구하시오.",
    960,
  ],
  [
    K94,
    "$0$이 아닌 세 수 $a$, $b$, $c$에 대하여 $a:b:c=4:3:2$이다. $\\dfrac{4a+3b-2c}{b}$의 값이 $x$에 대한 일차방정식 $2x+A=-6x-3$의 해일 때, 상수 $A$의 값을 구하시오.",
    -59,
  ],
  [
    K95,
    "자연수 $a$에 대하여 $x$에 대한 두 일차방정식 $ax-8=28$, $\\left(a+2\\right)x=55$의 해가 모두 자연수가 되도록 하는 $a$의 값을 모두 구하여 그 합을 구하시오.",
    12,
  ],
];

/** 음성: 모양이 어긋나거나 **불변식을 어긴** 지면은 던진다. */
const REJECTS: ReadonlyArray<readonly [string, string, string]> = [
  [
    K31,
    "세 자연수 $10$, $20$, $30$을 어떤 자연수로 나누면 나머지가 모두 같다. 이러한 자연수 중 가장 큰 수를 구하시오.",
    "나머지가 0 이면 이 유형이 아니다",
  ],
  [
    K31,
    "세 자연수 $75$, $183$, $291$을 어떤 자연수로 나누면 나머지가 모두 같다. 이러한 자연수 중 가장 큰 수를 구하시오.",
    "차가 108·108 이라 셋째 수가 장식이다 (㉠)",
  ],
  [
    K31,
    "두 자연수 $115$, $141$을 어떤 자연수로 나누면 나머지가 모두 $11$이다.",
    "심화하 `21` 의 지면 — 모양이 다르므로 던져야 한다",
  ],
  [
    K32,
    "두 자연수 $A$, $B$의 최대공약수가 $4$이고 최소공배수가 $60$이다. $A+B$의 값이 될 수 있는 모든 수의 합을 구하시오.",
    "$n=15$ 는 서로소인 쌍이 둘뿐 — 「넷을 견준다」가 성립 안 한다",
  ],
  [
    K95,
    "자연수 $a$에 대하여 $x$에 대한 두 일차방정식 $ax-1=5$, $\\left(a+1\\right)x=100$의 해가 모두 자연수가 되도록 하는 $a$의 값을 모두 구하여 그 합을 구하시오.",
    "$m=6$ 은 둘째 조건이 거의 안 거른다",
  ],
];

describe("중1 상위 갈래 — 눈금 (이 자가 «아니오» 를 낼 수 있는가)", () => {
  it.each(CALIBRATION)(
    "양성 %s — 손으로 쓴 지면에서 답을 낸다",
    (key, content, want) => {
      expect(VERIFY[key]!(content)).toBe(want);
    },
  );

  it.each(REJECTS)("음성 %s — %s", (key, content) => {
    expect(() => VERIFY[key]!(content)).toThrow();
  });
});

describe("중1 상위 갈래 — 지면과 값", () => {
  it("네 유형이 모두 generate 진입점에 등록돼 있다", () => {
    const keys = new Set(registeredTypes().map((x) => x.key));
    for (const e of M1_TOP) expect(keys.has(e.key), e.key).toBe(true);
    expect(M1_TOP.length).toBe(4);
  });

  it("🔴 중등에 `심화중`·`심화상` 이 실제로 생겼다 (D-116 ⑴)", () => {
    const tiers = new Set(
      registeredTypes().map(
        (t) => generateMiddleProblem(t.key, SEEDS[0]!).difficulty,
      ),
    );
    expect(tiers.has("심화중")).toBe(true);
    expect(tiers.has("심화상")).toBe(true);
  });

  for (const e of M1_TOP) {
    describe(e.key, () => {
      it("갈래가 못 박은 그대로다 (씨앗·변형을 가로질러)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            expect(
              generateMiddleProblem(e.key, seed, v).difficulty,
              `${e.key} seed ${seed} v${v}`,
            ).toBe(EXPECTED_TIER[e.key]);
          }
        }
      });

      it("지면을 다시 풀면 같은 답이 나온다 — 생성기 산술을 안 옮겨 적는다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(VERIFY[e.key]!(p.content), `${e.key} ${seed}/${v}`).toBe(
              answerNumber(p.answer),
            );
          }
        }
      });

      it("`facts.x` 가 정답이다 (이웃 모듈과 같은 계약)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed, 0);
          expect(p.facts.x, e.key).toBe(answerNumber(p.answer));
        }
      });

      it("지면이 깨끗하다 — 렌더·냄새·조사·맨 숫자·그림 지시", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const text of [p.content, p.answer, p.solution]) {
              expect(brokenRender(text), `${e.key} 렌더: ${text}`).toBe(false);
              expect(pageSmells(text), `${e.key} 냄새`).toEqual([]);
              expect(josaMismatches(text), `${e.key} 조사`).toEqual([]);
              expect(bareNumbers(text), `${e.key} 맨 숫자`).toEqual([]);
            }
            // 그림이 없으므로 발문이 지면을 가리키면 종이에서 못 푼다.
            expect(p.figureSpec ?? null, e.key).toBe(null);
            expect(pointsAtFigure(p.content), e.key).toBeNull();
          }
        }
      });

      it("🔴 해설이 걸음을 건너뛰지 않는다 — 답이 해설 안에 실제로 있다 (D-116 ⑸)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < VARIANTS; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              p.solution.length,
              `${e.key} 해설이 너무 짧다`,
            ).toBeGreaterThan(150);
            // 해설의 마지막 줄이 정답을 실제로 말해야 한다.
            expect(p.solution, `${e.key} 해설에 답이 없다`).toContain(
              String(answerNumber(p.answer)),
            );
            expect(
              p.solution.split("\n").length,
              `${e.key} 해설 줄`,
            ).toBeGreaterThanOrEqual(4);
          }
        }
      });

      it("변형 공간이 열 문항을 낸다 — 발문이 겹치지 않는다", () => {
        const set = generateMiddleSet(e.key, 20260901, 10);
        expect(new Set(set.map((p) => p.content)).size).toBe(10);
      });
    });
  }
});

/**
 * 🔴 **이 회차가 실제로 물린 결함 둘** — 되돌아오면 여기서 빨개진다.
 *
 * 둘 다 **값 검산이 구조적으로 못 보는** 부류다(답은 맞는다). 판정기가 재서야 나왔고,
 * 하나는 눈으로 읽어서야 나왔다. 그래서 가드를 따로 세운다.
 */
describe("중1 상위 갈래 — 물린 결함의 회귀 잠금", () => {
  it("⑴ `32T` 의 「서로소」가 실제로 거른다 — 무제곱이면 그 조건은 장식이다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateMiddleProblem(K32, seed, v);
        const g = p.facts.g!;
        const n = p.facts.n!;
        // 서로소를 안 따진 답
        let loose = 0;
        for (const a of divisors(n)) {
          const b = n / a;
          if (a > b) continue;
          loose += g * (a + b);
        }
        const tight = coprimePairSums(g, n).reduce((x, y) => x + y, 0);
        expect(
          loose,
          `${seed}/${v}: n=${n} 이 무제곱이라 서로소가 장식이다`,
        ).not.toBe(tight);
        expect(tight).toBe(answerNumber(p.answer));
      }
    }
  });

  it("⑵ `94T` 발문이 묻는 글자를 실제로 담는다 — 값을 찍으면 풀 수 없는 문항이 된다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateMiddleProblem(K94, seed, v);
        expect(p.content, `${seed}/${v}`).toContain("+A=");
        expect(p.content).toContain("상수 $A$의 값을 구하시오");
      }
    }
  });

  it("⑶ `31T` 는 셋 중 어느 하나를 빼면 답이 달라진다 (㉠ 선택력)", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateMiddleProblem(K31, seed, v);
        const nums = [p.facts.a!, p.facts.b!, p.facts.c!];
        expect(thirdNumberMatters(nums), `${seed}/${v}: ${nums}`).toBe(true);
      }
    }
  });

  it("⑸ `94T` 의 비가 «세 문자»를 실제로 셋으로 쓴다 — 두 항이 지워지면 안 된다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateMiddleProblem(K94, seed, v);
        const r = [p.facts.r1!, p.facts.r2!, p.facts.r3!];
        const c = [p.facts.c1!, p.facts.c2!, p.facts.c3!];
        // 첫 판은 `a:b:c=3:4:3`(그래서 $a=c$)을 냈고, 계수가 마주쳐 두 항이
        // 통째로 지워져 **사실상 한 문자짜리** 문항이 됐다. 값 검산도 ㉠·㉡
        // 판정기도 못 보는 부류라 **해설을 눈으로 읽어서야** 나왔다.
        expect(
          new Set(r).size,
          `${seed}/${v}: 비가 ${r} 라 자리가 겹친다`,
        ).toBe(3);
        const t = [c[0]! * r[0]!, c[1]! * r[1]!, c[2]! * r[2]!];
        expect(t[0]! + t[1]!, `${seed}/${v}: 두 항이 지워진다`).not.toBe(0);
        expect(t[1]! + t[2]!, `${seed}/${v}: 두 항이 지워진다`).not.toBe(0);
        expect(t[0]! + t[2]!, `${seed}/${v}: 두 항이 지워진다`).not.toBe(0);
      }
    }
  });

  it("⑷ `95T` 의 둘째 조건이 실제로 거르고, 살아남는 자리가 띄엄띄엄이다", () => {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        const p = generateMiddleProblem(K95, seed, v);
        const { all, kept } = naturalRootCandidates(
          p.facts.m!,
          p.facts.t!,
          p.facts.n!,
        );
        expect(all.length - kept.length, `${seed}/${v}`).toBeGreaterThanOrEqual(
          3,
        );
        expect(survivorsAreContiguous(all, kept), `${seed}/${v}`).toBe(false);
      }
    }
  });
});

/**
 * 굳힘 함수 자체의 눈금 — 손 계산과 맞대 본다.
 * `probe-mid-top-m1.ts` 가 같은 함수를 쓰므로, 여기가 빨개지면 그 판정기도 못 믿는다.
 */
describe("중1 상위 갈래 — 굳힘 함수", () => {
  it("`solveSameRemainder` 는 차들의 최대공약수다", () => {
    expect(solveSameRemainder([75, 183, 318])).toBe(27);
    expect(solveSameRemainder([115, 141])).toBe(26);
  });

  it("`coprimePairSums` 는 서로소인 쌍만 센다", () => {
    expect(coprimePairSums(4, 385)).toEqual([184, 248, 328, 1544]);
    // $12=2^2\times3$ — $(2,6)$ 은 서로소가 아니라 빠진다.
    expect(coprimePairSums(1, 12)).toEqual([7, 13]);
  });

  it("`ratioValue` 는 나누어떨어질 때만 값을 낸다", () => {
    expect(ratioValue([4, 3, 2], [4, 3, -2])).toBe(7);
    // $(2\cdot4+1\cdot3+1\cdot2)/3 = 13/3$ — 나누어떨어지지 않는다.
    expect(ratioValue([4, 3, 2], [2, 1, 1])).toBeNull();
  });

  it("`survivorsAreContiguous` 가 연속을 잡는다", () => {
    expect(survivorsAreContiguous([1, 2, 3, 4], [2, 3])).toBe(true);
    expect(survivorsAreContiguous([1, 2, 3, 4], [1, 4])).toBe(false);
  });
});
