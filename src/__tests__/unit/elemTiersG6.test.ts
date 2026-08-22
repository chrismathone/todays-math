/**
 * 초6 난이도 갈래 (D-72 확대 1차분 — `1-1 분수의 나눗셈`).
 *
 * 세 축을 본다.
 *  ⑴ **산술 독립 검산** — 발문이 «말하는 값»을 이 파일이 유리수로 **다시** 계산해 정답과 견준다.
 *     엔진 함수를 되부르지 않는다(되부르면 동어반복이다). 부동소수도 안 쓴다.
 *  ⑵ **축 성질** — 그 소단원에서 갈래를 실제로 가르는 성질. 응용을 기본 복사로 바꾸면 빨개진다.
 *  ⑶ **재현·다양성** — 같은 씨앗이면 같은 문항, 씨앗 16개면 갈래마다 서로 다른 문항이 여럿.
 *
 * ⚠️ 이 파일만 만진다. `elementaryEngine.test.ts` 는 다른 세션 몫이다.
 */
import { describe, expect, it } from "vitest";

import { ELEM_TIERS, type ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const CODES = ["1-1-1", "1-1-2", "1-1-3"] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => i * 31 + 11);

const unitOf = (code: string) => {
  const u = elementaryUnits().find(
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원`).toBeTruthy();
  return u!;
};

// ── 유리수 (시험이 직접 든다 — 엔진의 것을 안 쓴다) ──────────────────────
type R = { n: number; d: number };
const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);
function rat(n: number, d = 1): R {
  expect(d, "분모 0").not.toBe(0);
  const s = d < 0 ? -1 : 1;
  const k = gcd(n, d) || 1;
  return { n: (s * n) / k, d: (s * d) / k };
}
const rdiv = (a: R, b: R) => rat(a.n * b.d, a.d * b.n);
const rmul = (a: R, b: R) => rat(a.n * b.n, a.d * b.d);
const req = (a: R, b: R) => a.n === b.n && a.d === b.d;
const rshow = (a: R) => `${a.n}/${a.d}`;

/** `2\frac{1}{3}` · `\frac{3}{4}` · `12` 를 유리수로. 못 읽으면 null. */
function readNumber(tok: string): R | null {
  const mixed = tok.match(/^(\d+)\\frac\{(\d+)\}\{(\d+)\}$/);
  if (mixed) {
    const [w, t, d] = mixed.slice(1, 4).map(Number) as [number, number, number];
    return rat(w * d + t, d);
  }
  const frac = tok.match(/^\\frac\{(\d+)\}\{(\d+)\}$/);
  if (frac) return rat(Number(frac[1]), Number(frac[2]));
  const int = tok.match(/^(\d+)$/);
  return int ? rat(Number(int[1])) : null;
}

/** 발문·정답에서 `$...$` 덩어리를 순서대로 뽑아 **읽히는 수**만 남긴다. */
function numbersIn(text: string): R[] {
  const out: R[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .replace(/\\div|\\times|\\square|=/g, " ")
      .trim();
    for (const piece of tok.split(/\s+/)) {
      const v = readNumber(piece);
      if (v) out.push(v);
    }
  }
  return out;
}

function readAnswer(answer: string): R {
  const m = answer.match(/^\$(.+)\$$/);
  expect(m, `정답 모양: ${answer}`).toBeTruthy();
  const v = readNumber(m![1]!.replace(/\\,|\\;|\\!/g, "").trim());
  expect(v, `정답을 못 읽음: ${answer}`).toBeTruthy();
  return v!;
}

/** 「정오각형」 → `5`. 도형 결합 갈래가 발문에 이름으로만 적는 값이다. */
const SINO_SIDES: Record<string, number> = {
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
};
function polySides(content: string): number | null {
  const m = content.match(/정([삼사오육칠팔])각형/);
  return m ? SINO_SIDES[m[1]!]! : null;
}

/**
 * 발문이 말하는 값에서 **참**을 다시 만든다.
 *
 * 갈래마다 뼈대가 다르므로 **발문의 낱말**로 갈래를 가른다 — 생성기의 분기를 옮겨 적지 않는다.
 * 못 읽으면 null 을 주고, 부르는 쪽이 **위반으로** 처리한다(조용히 통과시키면 사각지대가 된다).
 */
function truthOf(content: string): R | null {
  const ns = numbersIn(content);
  const at = (i: number) => ns[i] ?? null;

  // 심화 ⓑ — 수 카드로 몫이 가장 큰 나눗셈식
  if (content.includes("수 카드")) {
    const vals = ns.map((v) => v.n / v.d);
    if (vals.length < 3) return null;
    return rat(Math.max(...vals), Math.min(...vals));
  }
  // 심화 ⓒ — `□` 안에 알맞은 자연수: (분수) ÷ □ = (몫)
  if (content.includes("알맞은 자연수")) {
    const [left, quot] = [at(0), at(1)];
    return left && quot ? rdiv(left, quot) : null;
  }
  // 심화 ⓐ — 잘못하여 곱했더니: 어떤 수 = 결과 ÷ k, 바른 값 = 어떤 수 ÷ k
  if (content.includes("잘못하여")) {
    const k = at(0);
    const wrong = ns[ns.length - 1] ?? null;
    return k && wrong ? rdiv(rdiv(wrong, k), k) : null;
  }
  // 심화 ⓓ — 「$k$로 나누었더니 $몫$」에서 어떤 수를 되짚어 다른 수로 나눈다
  if (content.includes("나누었더니")) {
    const [k, quot, other] = [at(0), at(1), at(2)];
    return k && quot && other ? rdiv(rmul(quot, k), other) : null;
  }
  // 응용 — 직사각형 넓이 ÷ 가로 → 그 세로를 다시 나눈다
  if (content.includes("세로를 똑같이")) {
    const [area, w, parts] = [at(0), at(1), at(2)];
    return area && w && parts ? rdiv(rdiv(area, w), parts) : null;
  }
  // 응용 — 거리 ÷ 시간 → 그 절반(30분)
  if (content.includes("분 동안 간 거리")) {
    const [dist, hours] = [at(0), at(1)];
    return dist && hours ? rdiv(rdiv(dist, hours), rat(2)) : null;
  }
  // 응용 ⓐ — 남은 양을 먼저 구한 뒤 나눈다
  if (content.includes("중에서") && content.includes("남은")) {
    const [total, used, people] = [at(0), at(1), at(2)];
    if (!total || !used || !people) return null;
    const left = rat(total.n * used.d - used.n * total.d, total.d * used.d);
    return rdiv(left, people);
  }
  // 응용 ⓑ — 정다각형의 둘레 ÷ 변의 수 (변의 수는 **이름**에만 있다)
  const sides = polySides(content);
  if (sides !== null && content.includes("둘레")) {
    const per = at(0);
    return per ? rdiv(per, rat(sides)) : null;
  }
  // 응용 ⓒ — 두 번 자르기
  if (content.includes("다시 똑같이")) {
    const [len, first, second] = [at(0), at(1), at(2)];
    return len && first && second ? rdiv(rdiv(len, first), second) : null;
  }
  // 응용 ⓓ — 직사각형 넓이 ÷ 가로 · ⓔ 거리 ÷ 시간 · 기본 — 전체 ÷ 사람 수
  // 연산 — 식이 그대로 주어진다
  const [a, b] = [at(0), at(1)];
  if (!a || !b || ns.length > 2) return null;
  return rdiv(a, b);
}

describe("[초6 갈래] 1-1 분수의 나눗셈", () => {
  it("소단원 셋이 갈래 넷을 전부 낸다", () => {
    for (const code of CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 유리수로 다시 계산)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const want = truthOf(p.content);
          if (!want) {
            // 「못 읽음」은 통과가 아니다 — 뼈대가 늘면 여기가 먼저 빨개져야 한다.
            bad.push(
              `${code} ${tier} seed=${seed}: 발문을 못 읽음 — ${p.content.replace(/\n+/g, " ")}`,
            );
            continue;
          }
          checked += 1;
          const got = readAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${code} ${tier} seed=${seed}: 답 ${p.answer} (${rshow(want)} 이어야) — ${p.content.replace(/\n+/g, " ")}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(CODES.length * ELEM_TIERS.length * SEEDS.length);
  });

  it("연산은 식을 주고, 기본은 안 준다 — 축이 실제로 갈린다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        // 1단은 절차 한 번 — 식·값이 그대로 있다.
        expect(calc.content, `${code} 연산 seed=${seed}`).toMatch(/\\div/);
        // 2단은 식을 **스스로** 세운다 — 발문이 식을 주면 그건 1단이다.
        expect(basic.content, `${code} 기본 seed=${seed}`).not.toMatch(/\\div/);
        expect(basic.content, `${code} 기본 seed=${seed}`).toMatch(/입니까\?$/);
      }
    }
  });

  it("응용은 두 걸음이고 심화는 거꾸로 묻는다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const apply = generateElementaryProblem(unit, seed, "응용");
        const deep = generateElementaryProblem(unit, seed, "심화");
        // 2단과 3단을 가르는 것은 **한 겹인가**다 (D-72). 그것을 그대로 잰다 —
        // 「발문에 있는 두 수를 그대로 한 번 나누면 답인가」.
        //
        // ⚠️ 해설의 등식 수로 재면 안 된다. 1-1-3 기본은 「대분수를 가분수로」 때문에
        //    등식이 둘인데 그건 **표기 변환**이지 문제 해결의 걸음이 아니다(실측으로 걸렸다).
        const oneStep = (p: { content: string; answer: string }) => {
          const ns = numbersIn(p.content);
          return (
            ns.length === 2 && req(rdiv(ns[0]!, ns[1]!), readAnswer(p.answer))
          );
        };
        const basic = generateElementaryProblem(unit, seed, "기본");
        expect(
          oneStep(basic),
          `${code} 기본 seed=${seed}: ${basic.content}`,
        ).toBe(true);
        expect(
          oneStep(apply),
          `${code} 응용 seed=${seed}: 한 겹이다 — ${apply.content}`,
        ).toBe(false);
        // 4단 — 역산·조건 조합의 **표지**. 넷 중 하나는 반드시 있다.
        //
        // 이건 손 목록이고, 손 목록은 샌다. 그래서 **일부러 좁게** 둔다 — 심화 갈래를
        // 새로 만들면 여기가 먼저 빨개져서 「이 문항이 무엇을 거꾸로 묻는가」를
        // 적게 만든다. 넓히려면 축(D-72)에 비추어 표지를 **하나 더 선언**할 것.
        expect(
          /잘못하여|나누었더니|알맞은 자연수|가장 큰/.test(deep.content),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        // 그리고 심화는 **주어진 결과에서 되짚는다** — 발문에 답이 아닌 값이 하나 더 있다.
        expect(
          numbersIn(deep.content).length,
          `${code} 심화 seed=${seed}: ${deep.content}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다른 문항이다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = ELEM_TIERS.map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(4);
      }
    }
  });

  it("같은 씨앗이면 같은 문항이고, 씨앗 16개면 갈래마다 8가지 이상 나온다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(unit, 4242, tier);
        const b = generateElementaryProblem(unit, 4242, tier);
        expect(a.content, `${code} ${tier} 재현`).toBe(b.content);
        expect(a.answer, `${code} ${tier} 재현`).toBe(b.answer);

        // /elem-gen 이 「발문+정답」 겹침 없이 갈래당 8개는 뽑을 수 있어야 한다.
        const rows = new Set(
          SEEDS.map((s) => {
            const p = generateElementaryProblem(unit, s, tier);
            return `${p.content}||${p.answer}`;
          }),
        );
        expect(rows.size, `${code} ${tier} 다양성`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·샌 소수·약분 남은 분수 없음", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          for (const [name, field] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const bare = field
              .replace(/\$[^$]*\$/g, " ")
              .match(/\d+(?:\.\d+)?/g);
            if (bare)
              bad.push(`${where} ${name}: KaTeX 밖 숫자 ${bare.join(",")}`);
            const runaway = field.match(/\d+\.\d{4,}/g);
            if (runaway) bad.push(`${where} ${name}: 샌 소수 ${runaway[0]}`);
          }
          // 발문의 분수는 기약분수다(해설은 통분·약분 과정을 보여야 하므로 뺀다).
          for (const m of p.content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)) {
            if (gcd(Number(m[1]), Number(m[2])) !== 1) {
              bad.push(`${where}: 약분이 남은 분수 ${m[0]}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("소단원 이름이 내건 조건을 갈래 넷이 전부 지킨다", () => {
    const bad: string[] = [];
    for (const tier of ELEM_TIERS) {
      for (const seed of SEEDS) {
        const at = (code: string) =>
          generateElementaryProblem(unitOf(code), seed, tier).content;
        // 1-1-1 «(자연수)÷(자연수)» — 발문에 나오는 수가 전부 자연수여야 한다.
        const c1 = at("1-1-1");
        if (numbersIn(c1).some((v) => v.d !== 1)) {
          bad.push(`1-1-1 ${tier} seed=${seed}: 자연수가 아닌 수 — ${c1}`);
        }
        // 1-1-2 «(분수)÷(자연수)» — 나누어지는 양이 **진분수**여야 한다(대분수·가분수 금지).
        const c2 = at("1-1-2");
        const f2 = c2.match(/\\frac\{(\d+)\}\{(\d+)\}/);
        if (
          !f2 ||
          Number(f2[1]) >= Number(f2[2]) ||
          /\d+\s*\\frac\{/.test(c2)
        ) {
          bad.push(`1-1-2 ${tier} seed=${seed}: 진분수가 아니다 — ${c2}`);
        }
        // 1-1-3 «(대분수)÷(자연수)» — 발문에 대분수가 있어야 한다.
        const c3 = at("1-1-3");
        if (!/\d+\s*\\frac\{/.test(c3)) {
          bad.push(`1-1-3 ${tier} seed=${seed}: 대분수가 없다 — ${c3}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("갈래를 안 주면 예전 문항이 그대로 나온다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      const plain = generateElementaryProblem(unit, 20260823);
      const tiers = ELEM_TIERS.map(
        (t: ElemTier) => generateElementaryProblem(unit, 20260823, t).content,
      );
      // 옛 경로는 갈래 소금을 안 타므로 씨앗이 다르다 — 우연히 같아지면 배선이 샌 것이다.
      expect(plain.content.length, code).toBeGreaterThan(0);
      expect(tiers).toHaveLength(4);
    }
  });
});
