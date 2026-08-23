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

// ══════════ 2차분 — 1-2 각기둥과 각뿔 (도형) ══════════
//
// 1-1 과 검산 방식이 다르다. 1-1 은 발문의 **수**를 나눠 보면 됐지만, 도형은 참이
// **밑면의 변의 수 `n`** 에서 나온다 — 그리고 `n` 은 발문에 「칠각형」·「팔각기둥」처럼
// **낱말로만** 있을 때가 있다(그게 3단 「다른 개념과 결합」의 알맹이다).
// 그래서 시험은 낱말에서 `n` 을 되찾아 **공식을 여기서 다시 세운다**(엔진 것을 안 부른다).

const G6_CODES = ["1-2-1", "1-2-2", "1-2-3", "1-2-4", "1-2-5"] as const;

/** 한자 수사 → 수. 엔진의 `sino` 를 부르지 않는다 — 부르면 동어반복이다. */
const SINO_NUM: Record<string, number> = {
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  칠: 7,
  팔: 8,
};

/** 구성 요소 공식 — **시험이 직접 든다.** 엔진의 `prismParts`·`pyramidParts` 와 독립이다. */
const prismCount = (n: number) => ({
  꼭짓점: 2 * n,
  모서리: 3 * n,
  면: n + 2,
  옆면: n,
});
const pyramidCount = (n: number) => ({
  꼭짓점: n + 1,
  모서리: 2 * n,
  면: n + 1,
  옆면: n,
});

/**
 * 발문에서 **밑면의 변의 수**를 되찾는다.
 *
 * 「밑면이 칠각형」·「칠각기둥」·「칠각뿔」 어느 쪽으로 적혀 있어도 읽는다. 겨냥도만 있고
 * 발문에 이름이 없는 **기본** 갈래는 `null` 을 주고, 부르는 쪽이 해설에서 되찾는다.
 */
function baseSidesOf(text: string): number | null {
  // ⚠️ 「직**사각형**」이 밑면 「사각형」으로 읽힌다 — 전개도 문항은 옆면을 늘 직사각형이라
  //    부르므로 이 함정이 반드시 걸린다(실측: 팔각기둥이 사각기둥으로 읽혔다).
  //    「정오각형」의 「정」은 막지 않는다 — 그건 진짜 밑면이다.
  const m = text.match(/(?<!직)([삼사오육칠팔])각(?:형|기둥|뿔)/);
  return m ? SINO_NUM[m[1]!]! : null;
}

/**
 * 「무엇을 묻는가」 — 갈래마다 문형이 다르다(연산은 「…의 수를 구하시오」, 나머지는 「… 몇 개입니까」).
 *
 * ⚠️ **「면」은 「옆면」의 뒷부분이다.** 단순 `includes` 로 세면 「옆면의 수」가 면·옆면 **둘 다**로
 * 잡혀 「묻는 것을 못 읽음」이 된다 — 이 저장소가 여러 번 데인 접두·접미 함정이라 뒤보기로 막는다.
 */
const ASK_PATTERNS: Record<string, RegExp> = {
  꼭짓점: /꼭짓점[은는이가]? 몇|꼭짓점의 수를 구하시오/,
  모서리: /모서리[은는이가]? 몇|모서리의 수를 구하시오/,
  면: /(?<!옆)면[은는이가]? 몇|(?<!옆)면의 수를 구하시오/,
  옆면: /옆면[은는이가]? 몇|옆면의 수를 구하시오/,
};

/** 「…의 수」로 견주는 두 요소 (응용의 «더 많습니까»·«더하면»). 여기도 옆면을 가른다. */
const PAIR_PATTERNS: Record<string, RegExp> = {
  꼭짓점: /꼭짓점의 수/,
  모서리: /모서리의 수/,
  면: /(?<!옆)면의 수/,
};

/** 정답에서 수 하나를 꺼낸다 — `$7$` 꼴만. 낱말 정답은 `null`. */
function answerNum(answer: string): number | null {
  const m = answer.match(/^\$(\d+)\$$/);
  return m ? Number(m[1]) : null;
}

/** 발문의 `$...$` 안 자연수들 (단위 명령은 걷어낸다). */
function plainNums(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .trim();
    if (/^\d+$/.test(tok)) out.push(Number(tok));
  }
  return out;
}

describe("[초6 갈래] 1-2 각기둥과 각뿔", () => {
  it("소단원 다섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("정답은 밑면의 변의 수로 다시 세운 값과 같다 (시험이 공식을 직접 든다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_CODES) {
      const unit = unitOf(code);
      const pyramidSection = code === "1-2-4" || code === "1-2-5";
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          // 밑면의 변의 수는 발문에 있으면 발문에서, 없으면(기본 갈래) 해설에서 읽는다.
          const n = baseSidesOf(p.content) ?? baseSidesOf(p.solution);
          if (n === null) {
            bad.push(`${where}: 밑면의 변의 수를 못 읽음 — ${p.content}`);
            continue;
          }
          const count = pyramidSection ? pyramidCount(n) : prismCount(n);
          const got = answerNum(p.answer);
          const nums = plainNums(p.content);
          checked += 1;

          // ⓐ 낱말 정답(「육각형」·「칠각기둥」) — 이름이 밑면과 맞는가.
          if (got === null) {
            const wantWord = Object.entries(SINO_NUM).find(
              ([, v]) => v === n,
            )![0];
            if (!p.answer.startsWith(wantWord)) {
              bad.push(`${where}: 이름 답 ${p.answer} (${wantWord}… 이어야)`);
            }
            continue;
          }

          // ⓑ 넓이·길이를 묻는 갈래는 발문의 치수로 다시 셈한다.
          //
          // ⚠️ **역산을 먼저 가른다.** 심화 발문에도 「옆면 전체의 넓이」가 들어 있어서
          //    넓이 갈래를 앞에 두면 심화가 그쪽으로 새어 참값이 엉뚱해진다(실측으로 걸렸다).
          if (/높이는 몇/.test(p.content)) {
            // 옆면 전체 넓이 ÷ 옆면 수 ÷ 한 변 = 높이
            const [area, a] = [nums[0]!, nums[1]!];
            const want = area / n / a;
            if (got !== want)
              bad.push(`${where}: ${got} (${want} 이어야) — ${p.content}`);
            continue;
          }
          if (/옆면 전체의 넓이는 몇/.test(p.content)) {
            const [a, h] = [nums[0]!, nums[1]!];
            const want = pyramidSection ? (n * a * h) / 2 : n * a * h;
            if (got !== want)
              bad.push(`${where}: ${got} (${want} 이어야) — ${p.content}`);
            continue;
          }
          if (/옆면 전체의 가로/.test(p.content)) {
            if (got !== n * nums[0]!)
              bad.push(`${where}: ${got} (${n * nums[0]!} 이어야)`);
            continue;
          }

          // ⓒ 개수를 묻는 갈래 — 발문이 무엇을 묻는지로 갈라 공식을 댄다.
          const asks = (["꼭짓점", "모서리", "면", "옆면"] as const).filter(
            (k) => ASK_PATTERNS[k]!.test(p.content),
          );
          // ⓒ-1 밑면이 같은 **각기둥과 각뿔을 건너뛰어** 견주는 심화 — 같은 요소, 다른 입체다.
          //     아래의 «같은 입체 안 두 요소» 판독기로는 못 읽으므로 먼저 가른다.
          const cross = p.content.match(
            /각기둥의 (면|꼭짓점|모서리)[은는]? 각뿔의 (면|꼭짓점|모서리)보다 몇 개 더 많습니까/,
          );
          if (cross) {
            const key1 = cross[1] as "면" | "꼭짓점" | "모서리";
            const key2 = cross[2] as "면" | "꼭짓점" | "모서리";
            const want = prismCount(n)[key1] - pyramidCount(n)[key2];
            if (got !== want)
              bad.push(`${where}: ${got} (${want} 이어야) — ${p.content}`);
            continue;
          }
          if (/더 많습니까/.test(p.content) || /더하면/.test(p.content)) {
            // ⚠️ 뺄셈은 **차례가 뜻이다** — 「모서리의 수는 꼭짓점의 수보다」에서
            //    앞의 것이 큰 쪽이다. 고정 차례로 걸러 내면 부호가 뒤집힌다(실측으로 걸렸다).
            const pair = (["꼭짓점", "모서리", "면"] as const)
              .filter((k) => PAIR_PATTERNS[k]!.test(p.content))
              .sort(
                (x, y) =>
                  p.content.search(PAIR_PATTERNS[x]!) -
                  p.content.search(PAIR_PATTERNS[y]!),
              );
            if (pair.length !== 2) {
              bad.push(`${where}: 견줄 두 요소를 못 읽음 — ${p.content}`);
              continue;
            }
            const [x, y] = [count[pair[0]!], count[pair[1]!]];
            const want = /더 많습니까/.test(p.content) ? x - y : x + y;
            if (got !== want)
              bad.push(`${where}: ${got} (${want} 이어야) — ${p.content}`);
            continue;
          }
          if (asks.length === 1) {
            // 「밑면의 모양이 같은 각기둥과 각뿔」 — 묻는 쪽 입체가 발문에 적혀 있다.
            const wantOn = /각뿔의 (?:면|꼭짓점|모서리)[은는이가]? 몇/.test(
              p.content,
            )
              ? pyramidCount(n)
              : /각기둥의 (?:면|꼭짓점|모서리)[은는이가]? 몇/.test(p.content)
                ? prismCount(n)
                : count;
            if (got !== wantOn[asks[0]!]) {
              bad.push(
                `${where}: ${got} (${wantOn[asks[0]!]} 이어야) — ${p.content}`,
              );
            }
            continue;
          }
          bad.push(`${where}: 묻는 것을 못 읽음 — ${p.content}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(G6_CODES.length * ELEM_TIERS.length * SEEDS.length);
  });

  it("연산은 입체 이름을 주고, 기본은 그림에서 읽게 한다", () => {
    for (const code of G6_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        // 1단 — 밑면이 무엇인지 **발문이 말해 준다**. 절차 한 번이면 끝난다.
        expect(
          baseSidesOf(calc.content),
          `${code} 연산 seed=${seed}`,
        ).not.toBeNull();
        // 2단 — 발문은 밑면을 **안 말한다**. 겨냥도에서 읽어야 하므로 그림이 반드시 있다.
        expect(
          baseSidesOf(basic.content),
          `${code} 기본 seed=${seed}: ${basic.content}`,
        ).toBeNull();
        expect(basic.figureSpec, `${code} 기본 seed=${seed} 그림`).toBeTruthy();
      }
    }
  });

  it("응용은 두 걸음이고 심화는 구성 요소에서 밑면을 거꾸로 찾는다", () => {
    for (const code of G6_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const apply = generateElementaryProblem(unit, seed, "응용");
        const deep = generateElementaryProblem(unit, seed, "심화");
        // 3단 — 2단보다 **한 걸음 더** 간다. 절대 개수로 재지 않고 **기본과 견준다**.
        //
        // ⚠️ 등식 개수의 절대값으로 재면 1-2-3 응용(「옆면 전체의 가로 = 밑면의 둘레」)이 걸린다.
        //    그건 걸음이 모자라서가 아니라 **결합이 곧 걸음**인 모양이라 등식이 하나다.
        //    기본은 밑면을 읽어 공식 한 번이라 등식이 0개다 — 상대 비교면 둘이 정확히 갈린다.
        const eqs = (s: string) => (s.match(/\$[^$]*=[^$]*\$/g) ?? []).length;
        const basicHere = generateElementaryProblem(unit, seed, "기본");
        expect(
          eqs(apply.solution) > eqs(basicHere.solution),
          `${code} seed=${seed}: 응용 등식 ${eqs(apply.solution)} · 기본 ${eqs(basicHere.solution)} — ${apply.solution}`,
        ).toBe(true);
        // 4단은 D-72 에 **두 얼굴**이 있다 — 역산과 조건 조합. 도형에서는 이렇게 나온다.
        //   ㉠ 구성 요소·옆면 수에서 **밑면을 되짚는다** (발문이 밑면을 안 준다)
        //   ㉡ 결과(옆면 전체의 넓이)를 주고 **재료(높이)를 되짚는다** (밑면은 주되 묻는 것이 재료다)
        // 둘 중 하나는 반드시다. 그리고 **응용은 둘 다 아니다** — 그래서 축이 갈린다.
        const backFromParts = (c: string) => baseSidesOf(c) === null;
        const backFromResult = (c: string) => /넓이가 .*입니다/.test(c);
        expect(
          backFromParts(deep.content) || backFromResult(deep.content),
          `${code} 심화 seed=${seed}: 되짚을 것이 없다 — ${deep.content}`,
        ).toBe(true);
        expect(
          backFromParts(apply.content) || backFromResult(apply.content),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
        // 밑면은 발문이나 해설 **어느 한쪽에는** 있어야 검산이 선다.
        // (㉠ 은 해설에서 되짚고, ㉡ 은 발문이 밑면을 주고 높이를 되짚는다.)
        expect(
          baseSidesOf(deep.content) ?? baseSidesOf(deep.solution),
          `${code} 심화 seed=${seed}: 밑면을 어디서도 못 읽는다 — ${deep.content}`,
        ).not.toBeNull();
        // 「…이 $k$개인 입체」꼴 심화의 답이 $k$ 그대로면 되짚은 것이 없다 —
        // 각뿔은 꼭짓점·면이 같은 수(n+1)라 그 둘을 짝지으면 정확히 이렇게 된다.
        // 엔진은 그 짝을 `PYR_DEEP_PAIRS` 에서 뺐는데, 주석만으로는 안 잠기니 여기서 잠근다.
        const givenCount = deep.content.match(
          /(?:꼭짓점|모서리|면)[이가] \$(\d+)\$개인 각(?:기둥|뿔)/,
        );
        if (givenCount) {
          expect(
            answerNum(deep.answer),
            `${code} 심화 seed=${seed}: 준 수가 그대로 답이다 — ${deep.content}`,
          ).not.toBe(Number(givenCount[1]));
        }
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = ELEM_TIERS.map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(4);
      }
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(unit, 4242, tier);
        const b = generateElementaryProblem(unit, 4242, tier);
        expect(a.content, `${code} ${tier} 재현`).toBe(b.content);
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

  it("갈래 문항도 D-66 표기를 지키고 도형 이름은 한자 수사다", () => {
    const bad: string[] = [];
    for (const code of G6_CODES) {
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
            // R4 — 「8각형」·「n각뿔」이 나오면 안 된다.
            const arabic = field.match(/\d+\s*각(?:형|기둥|뿔)/g);
            if (arabic)
              bad.push(
                `${where} ${name}: 아라비아 도형 이름 ${arabic.join(",")}`,
              );
            const placeholder = field.match(/[a-zA-Z]각(?:형|기둥|뿔)/g);
            if (placeholder)
              bad.push(
                `${where} ${name}: 안 채운 자리 ${placeholder.join(",")}`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

// ══════════ 3차분 — 1-3 소수의 나눗셈 ══════════
//
// 1-1(분수)·1-2(도형)와 또 다르다: 참이 **소수**로 나오고, 소단원 조건이 **몫의 성질**
// (1보다 작다 · 0을 내린다 · 첫째 자리 0)이다. `probe-elem-section-conditions` 는 문장형
// 갈래에서 그 성질을 발문만으로 못 재므로(종류 규칙으로 떨어진다), **여기서 정답에 대고**
// 잠근다. 검산은 소수를 부동소수점이 아니라 **유리수**(십·백분위 정수)로 다시 계산한다.

const G6_13_CODES = ["1-3-1", "1-3-2", "1-3-3", "1-3-4", "1-3-5"] as const;

/** `12.2` · `7` 을 유리수로 — 소수는 자릿수만큼의 거듭제곱 분모로 읽어 부동소수를 안 거친다. */
function readDecTok(tok: string): R | null {
  const m = tok.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  return rat(Number(`${m[1]}${frac}`), 10 ** frac.length);
}

/** 발문·정답의 `$...$` 덩어리에서 소수·자연수를 순서대로 뽑는다. */
function decNumbersIn(text: string): R[] {
  const out: R[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .replace(/\\div|\\times|\\square|=/g, " ")
      .trim();
    for (const piece of tok.split(/\s+/)) {
      const v = readDecTok(piece);
      if (v) out.push(v);
    }
  }
  return out;
}

function readDecAnswer(answer: string): R {
  const m = answer.match(/^\$(\d+(?:\.\d+)?)\$$/);
  expect(m, `정답 모양: ${answer}`).toBeTruthy();
  return readDecTok(m![1]!)!;
}

const rsub = (a: R, b: R) => rat(a.n * b.d - b.n * a.d, a.d * b.d);

/** 정답 문자열의 소수점 아래 자릿수와 첫째 자리 숫자. */
function decShape(answer: string): { dp: number; tenth: string | null } {
  const m = answer.match(/^\$(\d+)(?:\.(\d+))?\$$/);
  expect(m, `정답 모양: ${answer}`).toBeTruthy();
  const frac = m![2] ?? "";
  return { dp: frac.length, tenth: frac[0] ?? null };
}

/**
 * 발문이 말하는 값을 **다시** 만든다 — 갈래를 발문의 낱말로 가른다(생성기 분기를 옮겨 적지 않는다).
 * 못 읽으면 null 을 주고, 부르는 쪽이 위반으로 처리한다.
 */
function truthOf13(content: string): R | null {
  const ns = decNumbersIn(content);
  const at = (i: number) => ns[i] ?? null;

  // 심화 — 수 카드로 몫이 가장 작은 나눗셈식
  if (content.includes("수 카드") && content.includes("가장 작은")) {
    if (ns.length < 3 || ns.some((v) => v.d !== 1)) return null;
    const vals = ns.map((v) => v.n);
    return rat(Math.min(...vals), Math.max(...vals));
  }
  // 심화 — `\square` 식. □ 의 자리(나누어지는 수/나누는 수)를 식에서 직접 읽는다.
  if (content.includes("알맞은 수")) {
    const asDividend = content.match(/\\square\\div(\d+)=(\d+(?:\.\d+)?)/);
    if (asDividend) {
      return rmul(rat(Number(asDividend[1])), readDecTok(asDividend[2]!)!);
    }
    const asDivisor = content.match(
      /(\d+(?:\.\d+)?)\\div\\square=(\d+(?:\.\d+)?)/,
    );
    if (asDivisor) {
      return rdiv(readDecTok(asDivisor[1]!)!, readDecTok(asDivisor[2]!)!);
    }
    return null;
  }
  // 심화 — 잘못하여 곱했더니: 어떤 수 = 결과 ÷ k, 바른 값 = 어떤 수 ÷ k
  if (content.includes("잘못하여")) {
    const k = at(0);
    const wrong = ns[ns.length - 1] ?? null;
    return k && wrong ? rdiv(rdiv(wrong, k), k) : null;
  }
  // 심화 — 「$k$로 나누었더니 $몫$」에서 어떤 수를 되짚어 다른 수로 나눈다
  if (content.includes("나누었더니")) {
    const [k, quot, other] = [at(0), at(1), at(2)];
    return k && quot && other ? rdiv(rmul(quot, k), other) : null;
  }
  // 응용 — 전체 무게에서 빈 상자를 빼고 개수로 나눈다
  if (content.includes("빈 상자")) {
    const [k, total, box] = [at(0), at(1), at(2)];
    return k && total && box ? rdiv(rsub(total, box), k) : null;
  }
  // 응용 — 쓰고(마시고) 남은 것을 나눈다
  if (content.includes("중에서") && content.includes("남은")) {
    const [total, used, k] = [at(0), at(1), at(2)];
    return total && used && k ? rdiv(rsub(total, used), k) : null;
  }
  // 응용 — 나누어 가진 뒤 다시 자른다
  if (content.includes("다시 똑같이")) {
    const [total, j, b] = [at(0), at(1), at(2)];
    return total && j && b ? rdiv(rdiv(total, j), b) : null;
  }
  // 응용 — 정다각형의 둘레 ÷ 변의 수 (변의 수는 이름에만 있다)
  const sides = polySides(content);
  if (sides !== null && content.includes("둘레")) {
    const per = at(0);
    return per ? rdiv(per, rat(sides)) : null;
  }
  // 연산·기본 — 두 수를 그대로 나눈다
  const [a, b] = [at(0), at(1)];
  if (!a || !b || ns.length > 2) return null;
  return rdiv(a, b);
}

describe("[초6 갈래] 1-3 소수의 나눗셈", () => {
  it("소단원 다섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_13_CODES) {
      expect(supportedTiers(unitOf(code)), code).toEqual(ELEM_TIERS);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 유리수로 다시 계산)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_13_CODES) {
      const unit = unitOf(code);
      for (const tier of ELEM_TIERS) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const want = truthOf13(p.content);
          if (!want) {
            bad.push(
              `${code} ${tier} seed=${seed}: 발문을 못 읽음 — ${p.content.replace(/\n+/g, " ")}`,
            );
            continue;
          }
          checked += 1;
          const got = readDecAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${code} ${tier} seed=${seed}: 답 ${p.answer} (${rshow(want)} 이어야) — ${p.content.replace(/\n+/g, " ")}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(G6_13_CODES.length * ELEM_TIERS.length * SEEDS.length);
  });

  it("소단원 이름이 내건 «몫의 성질»을 정답이 지킨다 — 판정기가 발문에서 못 재는 그 축", () => {
    // 심화는 답이 몫이 아닐 수 있어(□ 가 나누어지는 수·나누는 수) 연산·기본·응용만 잰다.
    // 심화의 성질은 위 검산(값)과 아래 역산 표지가 함께 잡는다.
    const bad: string[] = [];
    for (const code of G6_13_CODES) {
      const unit = unitOf(code);
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const { dp, tenth } = decShape(p.answer);
          const v = readDecAnswer(p.answer);
          if (code === "1-3-1" && !(dp === 1 && v.n > v.d)) {
            bad.push(
              `${where}: 몫이 1보다 큰 소수 한 자리가 아니다 — ${p.answer}`,
            );
          }
          if (code === "1-3-2" && !(dp === 1 && v.n < v.d)) {
            bad.push(`${where}: 몫이 1보다 작지 않다 — ${p.answer}`);
          }
          if (code === "1-3-3" && !(dp === 2 && tenth !== "0")) {
            bad.push(`${where}: 0을 내린 두 자리 몫이 아니다 — ${p.answer}`);
          }
          if (code === "1-3-4" && !(dp === 2 && tenth === "0")) {
            bad.push(`${where}: 첫째 자리가 0이 아니다 — ${p.answer}`);
          }
          if (code === "1-3-5") {
            if (dp < 1) bad.push(`${where}: 몫이 소수가 아니다 — ${p.answer}`);
            if (/\d+\.\d+/.test(p.content)) {
              bad.push(
                `${where}: (자연수)÷(자연수)인데 발문에 소수 — ${p.content}`,
              );
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("연산은 식을 주고, 기본은 문장으로 묻는다 — 그리고 응용은 한 겹이 아니다", () => {
    const oneStep = (p: { content: string; answer: string }) => {
      const ns = decNumbersIn(p.content);
      return (
        ns.length === 2 && req(rdiv(ns[0]!, ns[1]!), readDecAnswer(p.answer))
      );
    };
    for (const code of G6_13_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        const apply = generateElementaryProblem(unit, seed, "응용");
        // 1단 — 식이 그대로 있다(=\square 꼴이라 산술 판정기도 이 갈래를 읽는다).
        expect(calc.content, `${code} 연산 seed=${seed}`).toMatch(/\\div/);
        expect(calc.content, `${code} 연산 seed=${seed}`).toMatch(/\\square/);
        // 2단 — 식·□ 없이 문장 한 겹. 두 수를 그대로 나누면 답이다.
        expect(basic.content, `${code} 기본 seed=${seed}`).not.toMatch(/\\div/);
        expect(basic.content, `${code} 기본 seed=${seed}`).not.toMatch(
          /\\square/,
        );
        expect(
          oneStep(basic),
          `${code} 기본 seed=${seed}: ${basic.content}`,
        ).toBe(true);
        // 3단 — 한 겹이면 그건 기본이다. 중간값을 만들거나 수 하나가 낱말 안에 있다.
        expect(
          oneStep(apply),
          `${code} 응용 seed=${seed}: 한 겹이다 — ${apply.content}`,
        ).toBe(false);
        expect(
          /잘못하여|나누었더니|알맞은 수|가장 작은/.test(apply.content),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
      }
    }
  });

  it("심화는 역산 표지가 있고, 주어진 결과에서 되짚는다", () => {
    for (const code of G6_13_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const deep = generateElementaryProblem(unit, seed, "심화");
        // 손 목록이라 일부러 좁게 둔다 — 심화 갈래를 새로 만들면 여기가 먼저 빨개진다.
        expect(
          /잘못하여|나누었더니|알맞은 수|가장 작은/.test(deep.content),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        expect(
          decNumbersIn(deep.content).length,
          `${code} 심화 seed=${seed}: ${deep.content}`,
        ).toBeGreaterThanOrEqual(2);
        // 1-3-2 의 심화는 발문에 적힌 몫도 1보다 작아야 그 소단원이다.
        if (code === "1-3-2") {
          const stated = decNumbersIn(deep.content).filter((v) => v.d > 1);
          expect(
            stated.some((v) => v.n < v.d),
            `1-3-2 심화 seed=${seed}: 1보다 작은 소수가 발문에 없다 — ${deep.content}`,
          ).toBe(true);
        }
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_13_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = ELEM_TIERS.map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(4);
      }
      for (const tier of ELEM_TIERS) {
        const a = generateElementaryProblem(unit, 4242, tier);
        const b = generateElementaryProblem(unit, 4242, tier);
        expect(a.content, `${code} ${tier} 재현`).toBe(b.content);
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·샌 소수·분수 없음", () => {
    const bad: string[] = [];
    for (const code of G6_13_CODES) {
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
            const runaway = field.match(/\d+\.\d{3,}/g);
            if (runaway) bad.push(`${where} ${name}: 샌 소수 ${runaway[0]}`);
            // 이 대단원에 분수가 나오면 종류가 샌 것이다(1-1 과 섞였다).
            if (field.includes("\\frac"))
              bad.push(`${where} ${name}: 분수가 섞였다`);
            // 초등 지면은 «7.0» 처럼 꼬리 0 을 적지 않는다.
            const trailing = field.match(/\d+\.\d*0(?![\d])/g);
            if (trailing)
              bad.push(`${where} ${name}: 꼬리 0 — ${trailing.join(",")}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
