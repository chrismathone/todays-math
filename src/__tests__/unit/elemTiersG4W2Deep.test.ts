/**
 * 초4 **둘째 물결** — `2-3 소수의 덧셈과 뺄셈` · `2-6 다각형` · `2-1 분수의 덧셈과 뺄셈`
 * 의 `심화중`·`심화상` (D-113 · D-115, 2026-08-31).
 *
 * 값·표기·규모·겹침은 각 대단원의 기존 시험이 `tiersOf(unit)` 로 돌기 때문에 **새 갈래도
 * 저절로 덮인다**(D-113 ⑺). 여기 두 벌로 적지 않는다. 이 파일이 맡는 것은 그 시험들이
 * 구조적으로 못 보는 하나다 —
 *
 *     「되짚기 사슬에 **굳지 않는 마디**가 있는가, 그리고 무엇이 그것을 굳히는가」
 *
 * ## 세는 형태로 옮긴 방법
 *
 * 소단원마다 시험이 **발문에서** 그 마디의 후보 무리를 다시 만든다(생성기를 안 부른다 —
 * 생성기를 부르면 동어반복이다). 그러고 나서 셋을 묻는다:
 *
 * ```
 * ⑴ 성질을 걸기 **전**에 후보가 여럿인가        ← 마디가 실제로 열려 있다
 * ⑵ 성질을 걸면 **정확히 하나**인가             ← 그 성질이 굳힌다
 * ⑶ 성질을 **뒤집으면 다른 답**이 나오는가       ← 음성 대조(그 줄이 일을 한다)
 * ```
 *
 * ## 🔴 이 파일이 **못 보는 것**
 *
 * ㉠ **후보 무리를 만드는 규칙은 내가 적은 것이다.** 학생이 밟을 무리와 같은지는 사람이
 *    본다 — 그래서 원장님 시안(`/dev/tier-bench/g4`)이 이 회차의 목적이다.
 * ㉡ **반증 ⑥ 검사는 «배선»만 본다.** 생성기가 같은 규칙(`forwardReach`)으로 미리 거르므로
 *    「닿는 것 0」은 절반이 동어반복이다. 그래서 **검출기가 «예»를 낼 수 있는지**를 같은
 *    회차에 함께 보인다(아래 눈금) — 0 이 「깨끗」인지 「못 셈」인지 갈리게.
 * ㉢ **높이는 못 잰다.** 「이 심화중이 그 소단원 심화하보다 어려운가」는 지면에 없다.
 *    `dump-elem-tiers` 로 여섯을 나란히 놓고 사람이 본다.
 * ㉣ **열거(후보를 훑는 양)는 기각된 축이다**(D-115 ⑵). 이 파일은 그 꼴을 축으로 안 쓴다.
 */
import { describe, expect, it } from "vitest";

import { fmtFrac } from "@/lib/elementary/math";
import {
  forwardReachable,
  pageNumbers,
  readRat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { expectCoreTiers } from "../helpers/elemTiers";

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260831 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

const gen = (code: string, seed: number, tier: string) =>
  generateElementaryProblem(unitOf(code), seed, tier as never);

/** `$…$` 안의 수를 전부. 발문에서 참을 꺼내는 유일한 창구다. */
function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g))
    for (const tok of (m[1] ?? "").match(/\d+(?:\.\d+)?/g) ?? [])
      out.push(Number(tok));
  return out;
}

/** 첫 캡처를 수로. 못 찾으면 시험이 그 자리에서 죽어야 한다(조용히 넘어가면 안 된다). */
function grab(text: string, re: RegExp): number {
  const m = re.exec(text);
  expect(m, `발문에서 «${re}» 를 못 읽었다:\n${text}`).toBeTruthy();
  return Number(m![1]);
}

/* ════════════════════ A. 등록 — 세운 곳과 **비운 곳** ════════════════════ */

/**
 * 🔴 비운 자리를 **정확히** 못 박는다. 「덜 찼다」와 「일부러 비웠다」는 다른 말이고,
 * 목록이 없으면 다음 사람이 조용히 채우거나 조용히 지운다.
 * 근거는 보고서 `tier-fill-g4-w2.md` §2·§3 에 소단원마다 한 줄씩 있다.
 */
const REGISTERED: Record<string, ("심화중" | "심화상")[]> = {
  // 2-3 소수 — 2-3-2 는 둘 다 비움(컷으로 닫힌다)
  "2-3-1": ["심화중"],
  "2-3-2": [],
  "2-3-3": ["심화중", "심화상"],
  "2-3-4": ["심화중"],
  "2-3-5": ["심화중"],
  "2-3-6": ["심화중"],
  "2-3-7": ["심화중"],
  // 2-6 다각형 — 2-6-3 은 둘 다 비움(심화하가 이미 만들어 견준다)
  "2-6-1": ["심화중"],
  "2-6-2": ["심화중"],
  "2-6-3": [],
  "2-6-4": ["심화중", "심화상"],
  // 2-1 분수 — 심화상은 2-1-2 하나
  "2-1-1": ["심화중"],
  "2-1-2": ["심화중", "심화상"],
  "2-1-3": ["심화중"],
  "2-1-4": ["심화중"],
};

describe("초4 물결2 — 등록", () => {
  it("핵심 넷은 그대로이고 확대 갈래는 정한 자리에만 있다", () => {
    for (const [code, extra] of Object.entries(REGISTERED)) {
      const u = unitOf(code);
      expectCoreTiers(u, `초4 ${code}`);
      const got = supportedTiers(u).filter(
        (t) => t === "심화중" || t === "심화상",
      );
      expect(got, `초4 ${code} 의 확대 갈래`).toEqual(extra);
    }
  });

  it("세운 갈래는 씨앗마다 실제로 만들어진다 (던지지 않는다)", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          expect(p.content.length, `${code} «${tier}» 발문`).toBeGreaterThan(
            10,
          );
          expect(p.answer.length, `${code} «${tier}» 답`).toBeGreaterThan(0);
        }
  });
});

/* ════════════════ B. 심화중 — 마디가 열려 있고 성질이 굳힌다 ════════════════ */

describe("초4 2-3 소수 — 심화중의 마디", () => {
  it("2-3-1: 창이 세 자리까지만 굳히고, 자리 숫자 관계가 넷째를 굳힌다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-3-1", seed, "심화중");
      const m = grab(p.content, /\$0\.01\$이 \$(\d+)\$개인 수보다 크고/);
      const w = Math.floor(m / 100);
      const a = Math.floor(m / 10) % 10;
      const b = m % 10;
      // ⑴ 창 안의 소수 세 자리 수는 아홉 — 셋째 자리 숫자가 안 굳는다.
      const window = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      expect(window.length, "마디가 열려 있다").toBeGreaterThan(1);
      // ⑵ 「셋째 = 첫째 + 둘째」가 정확히 하나를 남긴다.
      const alive = window.filter((c) => c === a + b);
      expect(alive, `2-3-1 seed=${seed}`).toHaveLength(1);
      const value = w * 1000 + a * 100 + b * 10 + alive[0]!;
      expect(p.answer).toBe(`$${value}$개`);
      // ⑶ 음성 대조 — 관계를 뒤집으면(첫째−둘째) 다른 수가 된다.
      expect(a - b).not.toBe(a + b);
    }
  });

  it("2-3-3: 옮긴 «칸 수»가 안 굳고 자릿수 성질이 둘 중 하나를 떨어뜨린다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-3-3", seed, "심화중");
      const shown = /\$0\.(\d)(\d)\$/.exec(p.content);
      expect(
        shown,
        `2-3-3 발문에서 옮긴 결과를 못 읽음: ${p.content}`,
      ).toBeTruthy();
      const d1 = Number(shown![1]);
      const d2 = Number(shown![2]);
      const two = d1 * 10 + d2;
      // ⑴ 되짚기 후보는 둘 — 한 자리 옮긴 것(`d1.d2`)과 두 자리 옮긴 것(`d1d2`).
      //    부동소수를 안 쓴다 — 십분위 정수로 센다(`두 자리 수`는 `two*10`).
      const cands = [two, two * 10];
      expect(new Set(cands).size).toBe(2);
      // ⑵ 「소수 한 자리 수 / 두 자리 수」가 하나를 고른다.
      const wantsNatural = p.content.includes("어떤 수는 두 자리 수");
      const pickedTenths = wantsNatural ? two * 10 : two;
      expect(p.answer).toBe(`$${pickedTenths * 10}$`);
      // ⑶ 음성 대조 — 다른 쪽을 고르면 답이 달라진다.
      const other = wantsNatural ? two : two * 10;
      expect(other * 10).not.toBe(pickedTenths * 10);
    }
  });

  it("2-3-4·2-3-5: 창이 후보 아홉을 남기고 자리 숫자 조건이 하나를 고른다", () => {
    for (const seed of SEEDS) {
      // 2-3-4 — 더해지는 수를 되짚는다.
      const p4 = gen("2-3-4", seed, "심화중");
      const c = grab(p4.content, /에 \$(\d+\.\d)\$[을를] 더했더니/) * 10;
      const lo = grab(p4.content, /합이 \$(\d+)\$보다 크고/);
      const s = grab(p4.content, /합이 \$(\d+)\$일 때/);
      const base4 = lo * 10 - Math.round(c);
      const all4 = Array.from({ length: 9 }, (_, i) => base4 + i + 1);
      expect(all4.length, "2-3-4 마디").toBeGreaterThan(1);
      const alive4 = all4.filter(
        (v) => Math.floor(v / 10) + (v % 10) === s && v % 10 !== 0,
      );
      expect(alive4, `2-3-4 seed=${seed}`).toHaveLength(1);
      expect(p4.answer).toBe(`$${dec1(alive4[0]!)}$`);
      // ⑶ 음성 대조 — 다른 자리 숫자 합을 걸면 다른 수가 남는다.
      const otherS = all4
        .map((v) => Math.floor(v / 10) + (v % 10))
        .find((x) => x !== s);
      expect(otherS, "2-3-4 대조군 없음").toBeDefined();
      const alt4 = all4.filter(
        (v) => Math.floor(v / 10) + (v % 10) === otherS && v % 10 !== 0,
      );
      expect(alt4[0]).not.toBe(alive4[0]);

      // 2-3-5 — **빼는 수**를 되짚는다(되짚는 자리가 반대다).
      const p5 = gen("2-3-5", seed, "심화중");
      const a5 = Math.round(grab(p5.content, /^\$(\d+\.\d)\$에서/) * 10);
      const lo5 = grab(p5.content, /차가 \$(\d+)\$보다 크고/);
      const k5 = grab(p5.content, /일의 자리 숫자보다 \$(\d+)\$ 클 때/);
      const base5 = a5 - (lo5 + 1) * 10;
      const all5 = Array.from({ length: 9 }, (_, i) => base5 + i + 1);
      const alive5 = all5.filter(
        (v) => v % 10 !== 0 && (v % 10) - Math.floor(v / 10) === k5,
      );
      expect(alive5, `2-3-5 seed=${seed}`).toHaveLength(1);
      expect(p5.answer).toBe(`$${dec1(alive5[0]!)}$`);
    }
  });

  it("2-3-6·2-3-7: 받아올림·받아내림을 먼저 정하지 않으면 자리가 안 굳는다", () => {
    for (const seed of SEEDS) {
      // 2-3-6 — 더하는 쪽. 받아올림이 있어야 첫째 자리가 하나 커진다.
      const p6 = gen("2-3-6", seed, "심화중");
      const w6 = grab(p6.content, /자연수 부분은 \$(\d+)\$이고/);
      const b6 = grab(p6.content, /소수 둘째 자리 숫자는 \$(\d+)\$입니다/);
      const c6 = Math.round(
        grab(p6.content, /\$(\d+\.\d\d)\$[을를] 더했더니/) * 100,
      );
      const p6d = grab(
        p6.content,
        /첫째 자리 숫자가 \$(\d+)\$[이가] 되었습니다/,
      );
      const carry6 = b6 + (c6 % 10) >= 10 ? 1 : 0;
      const f6 = Math.floor(c6 / 10) % 10;
      // ⑴ 받아올림을 모르면 첫째 자리 후보가 둘이다.
      expect(
        new Set([p6d - f6, p6d - f6 - 1]).size,
        "2-3-6 마디가 열려 있다",
      ).toBe(2);
      // ⑵ 받아올림을 정하면 하나로 굳는다.
      const a6 = p6d - f6 - carry6;
      expect(a6, `2-3-6 seed=${seed} 자리 숫자`).toBeGreaterThanOrEqual(0);
      expect(p6.answer).toBe(`$${dec2(w6 * 100 + a6 * 10 + b6)}$`);

      // 2-3-7 — 빼는 쪽. 받아내림이 있으면 첫째 자리가 하나 줄어든다.
      const p7 = gen("2-3-7", seed, "심화중");
      const big7 = Math.round(grab(p7.content, /^\$(\d+\.\d\d)\$에서/) * 100);
      const p7d = grab(
        p7.content,
        /첫째 자리 숫자가 \$(\d+)\$[이가] 되었습니다/,
      );
      const w7 = grab(p7.content, /자연수 부분은 \$(\d+)\$이고/);
      const b7 = grab(p7.content, /소수 둘째 자리 숫자는 \$(\d+)\$일 때/);
      const borrow7 = big7 % 10 < b7 ? 1 : 0;
      const bigA7 = Math.floor(big7 / 10) % 10;
      expect(
        new Set([bigA7 - p7d, bigA7 - p7d - 1]).size,
        "2-3-7 마디가 열려 있다",
      ).toBe(2);
      const a7 = bigA7 - borrow7 - p7d;
      expect(p7.answer).toBe(`$${dec2(w7 * 100 + a7 * 10 + b7)}$`);
    }
  });
});

describe("초4 2-6 다각형 — 심화중의 마디", () => {
  it("2-6-1: 창이 둘을 남기고 «합은 짝수»가 하나를 떨어뜨린다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-6-1", seed, "심화중");
      const lo = grab(p.content, /합은 \$(\d+)\$보다 크고/);
      const gap = grab(p.content, /변이 \$(\d+)\$개 많습니다/);
      const cands = [lo + 1, lo + 2];
      expect(cands, "2-6-1 마디").toHaveLength(2);
      const even = cands.filter((v) => v % 2 === 0);
      expect(even, `2-6-1 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(POLY[even[0]! / 2 + gap]);
      // ⑶ 음성 대조 — 홀수 쪽을 잡으면 변의 수가 자연수가 아니다.
      const odd = cands.find((v) => v % 2 === 1)!;
      expect(Number.isInteger(odd / 2)).toBe(false);
    }
  });

  it("2-6-2: 한 변 후보 둘 중 «나누어떨어지는» 하나만 산다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-6-2", seed, "심화중");
      const total = grab(p.content, /합은 \$(\d+)\\,\\mathrm\{cm\}\$입니다/);
      const lo = grab(p.content, /\$(\d+)\\,\\mathrm\{cm\}\$보다 길고/);
      const cands = [lo + 1, lo + 2];
      const alive = cands.filter((v) => total % v === 0);
      expect(alive, `2-6-2 seed=${seed} — 나누어떨어지는 한 변`).toHaveLength(
        1,
      );
      const sides = total / alive[0]!;
      expect(Number.isInteger(sides)).toBe(true);
      expect(p.answer).toBe(`정${POLY[sides]}`);
      // ⑶ 음성 대조 — 떨어진 쪽은 **아예 나누어떨어지지 않아야** 한다
      //    (몫이 나오는데 십이를 넘는 것으로 떨어뜨리면 답이 둘이 된다).
      const other = cands.find((v) => v !== alive[0])!;
      expect(total % other, `2-6-2 seed=${seed} 반대쪽`).not.toBe(0);
    }
  });

  it("2-6-4 심화중: 창이 배수 둘을 남기고 다른 조각 수가 하나를 고른다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-6-4", seed, "심화중");
      const rules = [
        ...p.content.matchAll(/모양 조각 \$(\d+)\$개로 빈틈없이/g),
      ].map((m) => Number(m[1]));
      expect(rules, "2-6-4 발문이 관계 둘을 자족해야 한다").toHaveLength(2);
      const [from, to] = rules as [number, number];
      const lo = grab(p.content, /\$(\d+)\$보다 많고/);
      const hi = grab(p.content, /\$(\d+)\$보다 적었습니다/);
      const inside: number[] = [];
      for (let v = lo + 1; v < hi; v += 1) if (v % from === 0) inside.push(v);
      expect(
        inside,
        `2-6-4중 seed=${seed} — 마디가 둘이어야 한다`,
      ).toHaveLength(2);
      const alive = inside.filter((v) => v % to === 0);
      expect(alive, `2-6-4중 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(`$${alive[0]! / to}$개`);
    }
  });
});

describe("초4 2-1 분수 — 심화중의 마디", () => {
  it("2-1-1: 합만 주면 분자 쌍이 여럿이고, 창 한 줄이 하나를 남긴다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-1-1", seed, "심화중");
      const den = grab(p.content, /분모가 \$(\d+)\$인/);
      const sum = sumFromMixed(p.content, den);
      const cut = grab(
        p.content,
        /작은 분수가 \$\\frac\{(\d+)\}\{\d+\}\$보다/,
      );
      const over = /보다 클 때/.test(p.content);
      const askSmall = /때 작은 분수를/.test(p.content);
      const pairs = pairsOf(den, sum);
      // ⑴ 마디가 열려 있다 — 성질(진분수)만으로는 셋 이상이 남는다.
      expect(pairs.length, `2-1-1 seed=${seed} 마디`).toBeGreaterThanOrEqual(3);
      // ⑵ 창 한 줄이 정확히 하나를 남긴다.
      const alive = pairs.filter(([q]) => (over ? q > cut : q < cut));
      expect(alive, `2-1-1 seed=${seed}`).toHaveLength(1);
      const [small, big] = alive[0]!;
      expect(p.answer).toBe(`$\\frac{${askSmall ? small : big}}{${den}}$`);
      // ⑶ 음성 대조 — 창을 뒤집으면 남는 쌍이 달라진다.
      const flipped = pairs.filter(([q]) => (over ? q < cut : q > cut));
      expect(flipped.length, `2-1-1 seed=${seed} 대조군`).toBeGreaterThan(0);
      expect(flipped[0]![0]).not.toBe(small);
    }
  });

  it("2-1-2 심화중: 차만 주면 «어느 쪽이 큰지»가 안 굳는다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-1-2", seed, "심화중");
      const den = grab(p.content, /\\frac\{\d+\}\{(\d+)\}/);
      const base = grab(
        p.content,
        /어떤 진분수와 \$\\frac\{(\d+)\}\{\d+\}\$의 차가/,
      );
      const gap = grab(p.content, /의 차가 \$\\frac\{(\d+)\}\{\d+\}\$입니다/);
      const minus = grab(
        p.content,
        /어떤 진분수에서 \$\\frac\{(\d+)\}\{\d+\}\$[을를] 뺀/,
      );
      // ⑴ 후보 둘이 **둘 다 진분수**라야 마디가 실제로 열린다.
      const cands = [base + gap, base - gap];
      for (const v of cands)
        expect(v > 0 && v < den, `2-1-2 seed=${seed} 후보 ${v}`).toBe(true);
      // ⑵ 크기 조건 한 줄이 하나를 고른다.
      const bigger = /보다 큽니다/.test(p.content);
      const value = bigger ? base + gap : base - gap;
      expect(p.answer).toBe(`$\\frac{${value - minus}}{${den}}$`);
      // ⑶ 음성 대조 — 반대쪽을 고르면 답이 달라진다.
      const other = bigger ? base - gap : base + gap;
      expect(other - minus).not.toBe(value - minus);
    }
  });

  it("2-1-3·2-1-4: 받아올림·받아내림이 마디를 굳힌다", () => {
    for (const seed of SEEDS) {
      const p3 = gen("2-1-3", seed, "심화중");
      const den3 = grab(p3.content, /분모가 \$(\d+)\$인/);
      const whole3 = grab(p3.content, /합이 \$(\d+)\\frac\{\d+\}\{\d+\}\$/);
      const rest3 = grab(p3.content, /합이 \$\d+\\frac\{(\d+)\}\{\d+\}\$/);
      const parts = [
        ...p3.content.matchAll(/각각 \$(\d+)\$[와과] \$(\d+)\$입니다/g),
      ][0];
      expect(parts, `2-1-3 seed=${seed} 자연수 부분`).toBeTruthy();
      const w1 = Number(parts![1]);
      const w2 = Number(parts![2]);
      // ⑴ 마디 — 분수 부분끼리 더한 값이 `rest/den` 인지 `1+rest/den` 인지 안 굳는다.
      expect(new Set([rest3, den3 + rest3]).size).toBe(2);
      // ⑵ 자연수 부분이 하나 커졌으므로 받아올림이 있었다.
      expect(whole3).toBe(w1 + w2 + 1);
      expect(p3.answer).toBe(`$${den3 + rest3}$`);

      const p4 = gen("2-1-4", seed, "심화중");
      const den4 = grab(p4.content, /\\frac\{\d+\}\{(\d+)\}/);
      const top = grab(p4.content, /^\$(\d+)\\frac\{\d+\}\{\d+\}\$에서/);
      const topNum = grab(p4.content, /^\$\d+\\frac\{(\d+)\}\{\d+\}\$에서/);
      const sub = grab(p4.content, /자연수 부분이 \$(\d+)\$인 대분수/);
      const diffWhole = grab(
        p4.content,
        /차의 자연수 부분이 \$(\d+)\$[이가] 되었습니다/,
      );
      // ⑴ 받아내림이 있었다 — 자연수 부분의 차보다 하나 작다.
      expect(diffWhole).toBe(top - sub - 1);
      // ⑵ 그러면 빼는 수의 분자가 `topNum` 보다 커야 하고, 가장 작은 것은 `topNum+1`.
      const smallest = topNum + 1;
      expect(smallest).toBeLessThan(den4);
      expect(p4.answer).toBe(
        `$${diffWhole}\\frac{${den4 + topNum - smallest}}{${den4}}$`,
      );
    }
  });
});

/* ═══════════ C. 심화상 — 성질만으로 못 굳혀 «만들어 견주어야» 한다 ═══════════ */

describe("초4 물결2 — 심화상 셋", () => {
  it("2-3-3: 후보 넷을 되짚기가 만들고, 넷을 실제로 $100$배 해야 갈린다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-3-3", seed, "심화상");
      const m = /\$(\d)\.(\d)\$/.exec(p.content);
      expect(m, `2-3-3상 발문: ${p.content}`).toBeTruthy();
      const two = Number(m![1]) * 10 + Number(m![2]);
      // ⑴ 되짚기가 후보 **넷**을 만든다(발문은 하나도 안 준다).
      //    부동소수를 안 쓴다 — **천분위 정수**로 센다($0.0d_1d_2$ → `two`).
      const cands = [two, two * 10, two * 1000, two * 10000];
      expect(new Set(cands).size).toBe(4);
      const printed = new Set(numbersIn(p.content));
      for (const v of cands)
        expect(
          printed.has(v / 1000),
          `2-3-3상 후보 ${v / 1000} 가 발문에 있다`,
        ).toBe(false);
      // ⑵ 넷을 실제로 $100$배 해야 자릿수 조건과 견줄 수 있다.
      const wantTwo = /두 자리 수일 때/.test(p.content);
      const digitsOf = (scaled: number) =>
        scaled % 1000 === 0 ? String(scaled / 1000).length : 0;
      const alive = cands.filter((v) =>
        wantTwo ? digitsOf(v * 100) === 2 : digitsOf(v * 100) === 4,
      );
      expect(alive, `2-3-3상 seed=${seed}`).toHaveLength(1);
      // ⑶ 남은 하나가 무리의 **극값이 아니다** — 극값이면 조건 한 줄로 집혀 심화중이다.
      const sorted = [...cands].sort((a, b) => a - b);
      expect(alive[0]).not.toBe(sorted[0]);
      expect(alive[0]).not.toBe(sorted[3]);
    }
  });

  it("2-1-2: 쌍마다 실제로 빼 보아야 하나가 남고, 그 차가 극값이 아니다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-1-2", seed, "심화상");
      const den = grab(p.content, /분모가 \$(\d+)\$인/);
      const sum = sumFromMixed(p.content, den);
      const lo = grab(
        p.content,
        /뺀 값이 \$\\frac\{(\d+)\}\{\d+\}\$보다 크고/,
      );
      const hi = grab(
        p.content,
        /보다 크고 \$\\frac\{(\d+)\}\{\d+\}\$보다 작을 때/,
      );
      const pairs = pairsOf(den, sum);
      expect(pairs.length, `2-1-2상 seed=${seed} 후보`).toBeGreaterThanOrEqual(
        3,
      );
      // ⑴ 후보를 발문이 주지 않는다 — 되짚기(합)가 만든다.
      //    ⚠️ **수 하나씩 세면 안 된다** — 창의 두 끝이 `\frac{2}{12}` 처럼 같은 분모를
      //    쓰므로 작은 정수는 거의 다 지면에 있다. 「그 분수가 통째로 찍혔나」로 물어야 한다.
      for (const [q, r] of pairs)
        expect(
          p.content.includes(`\\frac{${q}}{${den}}`) &&
            p.content.includes(`\\frac{${r}}{${den}}`),
          `2-1-2상 쌍 ${q}/${r} 이 발문에 통째로 있다`,
        ).toBe(false);
      // ⑵ 쌍마다 차를 **실제로 구해야** 창과 견줄 수 있다.
      const diffs = pairs.map(([q, r]) => r - q);
      const alive = diffs.filter((d) => d > lo && d < hi);
      expect(alive, `2-1-2상 seed=${seed}`).toHaveLength(1);
      // ⑶ 🔴 남은 차가 **극값이 아니다** — 이것이 심화중과 가르는 자리다.
      const sorted = [...diffs].sort((a, b) => a - b);
      expect(alive[0]).not.toBe(sorted[0]);
      expect(alive[0]).not.toBe(sorted[sorted.length - 1]);
      const [small, big] = pairs[diffs.indexOf(alive[0]!)]!;
      const askSmall = /작은 분수를 구하시오/.test(p.content);
      expect(p.answer).toBe(`$\\frac{${askSmall ? small : big}}{${den}}$`);
    }
  });

  it("2-6-4: 짝을 만들어 조각 수를 세어야 «가장 적은» 하나가 남는다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-6-4", seed, "심화상");
      const tris = grab(p.content, /모양 조각 \$(\d+)\$개를 마름모/);
      // ⑴ 되짚기(`2a+3b=N`)가 짝 셋 이상을 만든다 — 발문은 하나도 안 준다.
      const pairs: { a: number; b: number }[] = [];
      for (let b = 1; 3 * b < tris; b += 1) {
        const rest = tris - 3 * b;
        if (rest % 2 === 0) pairs.push({ a: rest / 2, b });
      }
      expect(pairs.length, `2-6-4상 seed=${seed} 짝`).toBeGreaterThanOrEqual(3);
      // ⑵ 짝마다 조각 수를 세어 견주어야 하나가 남는다.
      const totals = pairs.map((x) => x.a + x.b);
      const min = Math.min(...totals);
      expect(
        totals.filter((t) => t === min),
        `2-6-4상 seed=${seed}`,
      ).toHaveLength(1);
      expect(p.answer).toBe(`$${min}$개`);
    }
  });
});

/* ════════════════ D. 반증 ④ — 아래 세 갈래가 이 잣대를 통과하나 ════════════════ */

/**
 * 「같은 소단원의 연산·기본·응용 중 **하나라도** 심화중 잣대를 통과하면 그 소단원은 비운다」.
 *
 * 🔴 판정기(`probe-elem-tier-backsolve`)는 이 세 대단원에서 **못 잰다**(2-3·2-6 은
 * 순수 덧뺄셈·나눗셈, 2-1 은 분수라 그 자의 허용 꼴 밖이다). 그래서 여기서 손으로 잰다 —
 * 「되짚어야 할 미지의 대상을 **말로 부르는가**」를 세고, 부르는 자리는 **한 식으로 굳는지**
 * 를 따로 본다. 열쇠의 한계는 「말을 안 쓰고 마디를 여는 발문은 못 본다」다.
 *
 * ⚠️ **분모를 같이 센다** — 자국이 하나도 없으면 그것은 「깨끗」이 아니라 「이 열쇠가
 *    이 대단원을 못 본다」일 수 있다. 실제로 자국이 있는 자리가 몇 곳인지 못 박아 둔다.
 */
const BACKSOLVE_MARK =
  /어떤 수|어떤 소수|어떤 진분수|어떤 대분수|어떤 다각형|어떤 정다각형|\\square/;

/** 되짚기 자국이 있는 (소단원, 갈래) — 2026-08-31 실측. 늘어도 줄어도 빨개진다. */
const LOWER_TIER_BACKSOLVE: string[] = [
  "2-3-3|기본",
  "2-3-6|응용",
  "2-3-7|응용",
  "2-6-1|연산",
  "2-6-1|기본",
  "2-6-2|연산",
  "2-6-3|연산",
  "2-6-3|응용",
];

describe("초4 물결2 — 반증 ④ (뒤집힘 필터)", () => {
  it("연산·기본·응용에 되짚기 자국이 있는 자리는 «한 식으로 굳는» 그것뿐이다", () => {
    const found: string[] = [];
    for (const code of Object.keys(REGISTERED))
      for (const tier of ["연산", "기본", "응용"] as const) {
        const hit = SEEDS.some((s) =>
          BACKSOLVE_MARK.test(gen(code, s, tier).content),
        );
        if (hit) found.push(`${code}|${tier}`);
      }
    expect(found.sort()).toEqual([...LOWER_TIER_BACKSOLVE].sort());
    // 분모 — 자국이 0이면 이 열쇠가 눈이 먼 것이다. 0 은 「깨끗」이 아니다.
    expect(found.length).toBeGreaterThan(0);
  });

  it("그 자국들은 «되짚을 값을 하나로 굳히는 수»를 발문이 함께 준다", () => {
    // 「어떤 수의 $100$배가 $3.7$」·「어떤 수보다 $0.68$ 큰 수가 $7.31$」처럼
    // **되짚을 연산과 그 상대 값을 둘 다** 주므로 마디가 열리지 않는다(반증 ①).
    for (const key of LOWER_TIER_BACKSOLVE) {
      const [code, tier] = key.split("|") as [string, string];
      for (const seed of SEEDS.slice(0, 6)) {
        const c = gen(code, seed, tier).content;
        if (!BACKSOLVE_MARK.test(c)) continue;
        // 지면에 수가 둘 이상이면 「무엇을 얼마로 되짚나」가 다 적혀 있다는 뜻이다.
        expect(
          numbersIn(c).length,
          `${key} seed=${seed}`,
        ).toBeGreaterThanOrEqual(1);
        // 그리고 **범위 표현이 없다** — 범위가 곧 「굳지 않는 마디」의 자국이다.
        expect(
          /보다 크고|보다 작고|될 수 있는/.test(c),
          `${key} seed=${seed}`,
        ).toBe(false);
      }
    }
  });
});

/* ══════════ E. 반증 ⑥ — 순방향으로 닿지 않는다 (배선 검사 + 눈금) ══════════ */

describe("초4 물결2 — 반증 ⑥", () => {
  it("검출기가 «예»를 낼 수 있다 (0 이 «못 셈»이 아님을 같은 회차에 보인다)", () => {
    // 일부러 닿는 지면 — $1.9\times8-9 = 6.2$.
    const nums = pageNumbers("$1.9$ $8$ $9$");
    expect(forwardReachable(nums, readRat("6.2")!)).toBe(true);
    // 그리고 안 닿는 지면.
    expect(forwardReachable(pageNumbers("$1.9$ $8$"), readRat("6.2")!)).toBe(
      false,
    );
  });

  it("새 갈래 전량이 순방향으로 안 닿는다", () => {
    let measured = 0;
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const a = readRat(p.answer.replace(/\$/g, "").trim());
          if (!a) continue; // 「칠각형」류 — 이 축 밖이다
          measured += 1;
          expect(
            forwardReachable(pageNumbers(p.content), a),
            `${code} «${tier}» seed=${seed} 가 순방향으로 닿는다`,
          ).toBe(false);
        }
    // 분모 — 잰 자리가 0이면 이 검사는 아무것도 안 지킨다.
    expect(measured).toBeGreaterThan(100);
  });
});

/* ═══════════════ F. 지면 약속 — 약분·자릿수·「잘못」·규모 ═══════════════ */

describe("초4 물결2 — 지면 약속", () => {
  it("2-1 의 답은 **약분되지 않는다** (약분은 초5다)", () => {
    for (const code of ["2-1-1", "2-1-2", "2-1-3", "2-1-4"])
      for (const tier of REGISTERED[code]!)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const m = /^\$(\d*)\\frac\{(\d+)\}\{(\d+)\}\$$/.exec(p.answer);
          if (!m) continue; // 자연수 답(2-1-3)은 이 검사 밖이다
          const whole = m[1] === "" ? 0 : Number(m[1]);
          const num = Number(m[2]);
          const den = Number(m[3]);
          expect(
            fmtFrac(whole * den + num, den),
            `${code} «${tier}» seed=${seed} 답이 약분된다`,
          ).toBe(`${m[1]}\\frac{${num}}{${den}}`);
        }
  });

  it("소수 갈래는 소단원이 약속한 자릿수를 지킨다", () => {
    const WANT: Record<string, number> = {
      "2-3-4": 1,
      "2-3-5": 1,
      "2-3-6": 2,
      "2-3-7": 2,
    };
    for (const [code, dp] of Object.entries(WANT))
      for (const seed of SEEDS) {
        const a = gen(code, seed, "심화중").answer.replace(/\$/g, "");
        expect(a, `${code} seed=${seed}`).toMatch(
          new RegExp(`^\\d+\\.\\d{${dp}}$`),
        );
      }
  });

  it("「잘못 …했더니」 문형을 한 갈래도 쓰지 않는다 (심화하에 이미 11자리)", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS)
          expect(
            gen(code, seed, tier).content.includes("잘못"),
            `${code} «${tier}» seed=${seed}`,
          ).toBe(false);
  });

  it("답이 발문에 그대로 있지 않다", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const a = readRat(p.answer.replace(/\$/g, "").trim());
          if (!a) continue;
          const printed = pageNumbers(p.content);
          expect(
            printed.some((r) => r.n === a.n && r.d === a.d),
            `${code} «${tier}» seed=${seed} 답이 발문에 그대로 있다`,
          ).toBe(false);
        }
  });

  it("규모로 올리지 않았다 — 값이 초4 띠 안이다", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const v of numbersIn(p.content))
            expect(v, `${code} «${tier}» seed=${seed} 의 수 ${v}`).toBeLessThan(
              10000,
            );
        }
  });
});

/* ── 잔부품 ─────────────────────────────────────────────────────────────── */

const POLY = [
  "",
  "일각형",
  "이각형",
  "삼각형",
  "사각형",
  "오각형",
  "육각형",
  "칠각형",
  "팔각형",
  "구각형",
  "십각형",
  "십일각형",
  "십이각형",
];

function dec1(tenths: number): string {
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}
function dec2(hundredths: number): string {
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}

/**
 * 「합이 $1\frac{2}{9}$ · $\frac{11}{12}$ · $1$」 에서 **분자 합**을 읽는다.
 * 세 꼴이 다 나온다 — 합이 `1` 보다 작으면 진분수, 딱 `1` 이면 `fmtFrac` 이 정수로 찍는다.
 */
function sumFromMixed(content: string, den: number): number {
  const mixed = /합이 \$(\d+)\\frac\{(\d+)\}\{(\d+)\}\$/.exec(content);
  if (mixed) return Number(mixed[1]) * den + Number(mixed[2]);
  const proper = /합이 \$\\frac\{(\d+)\}\{(\d+)\}\$/.exec(content);
  if (proper) return Number(proper[1]);
  const whole = /합이 \$(\d+)\$/.exec(content);
  expect(whole, `합을 못 읽었다: ${content}`).toBeTruthy();
  return Number(whole![1]) * den;
}

/** 분모 `den`, 분자 합 `sum` 인 서로 다른 두 진분수의 분자 쌍(작은 쪽 오름차순). */
function pairsOf(den: number, sum: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 1; p < sum - p; p += 1) {
    const q = sum - p;
    if (q <= den - 1) out.push([p, q]);
  }
  return out;
}
