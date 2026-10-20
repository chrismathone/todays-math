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

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

// ⚠️ 문턱(`0.8`)도 **세는 함수도** 판정기와 **같은 모듈**에서 가져온다.
// 여기에 숫자를 다시 적으면 한쪽만 옮겨도 아무도 모른다.
// (판정기 `probe-elem-rules.ts` 자체는 import 하면 안 된다 — 최상단에서 전량 쓸기를
//  돌고 `process.exitCode` 를 쓴다. 그래서 규칙만 순수 모듈로 내려 두었다.)
import {
  ANSWER_SKEW_MAX,
  answerSkewAmongFigures,
  topAnswerShare,
} from "../../../scripts/qa/answerSkewRule";

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

  // ══ 확대 갈래 (D-113 3차분) — **약분 축**. 앞의 「나누었더니」 판독기보다 먼저 본다 ══
  //
  // ⚠️ 순서가 뜻이다. 셋 다 「나누었더니/나눈 몫」을 쓰므로 아래 심화하 판독기가 먼저
  //    물면 엉뚱한 두 수를 나눠 «참»을 지어낸다.
  //
  // 세 갈래 모두 **시험이 조건을 다시 풀고**, 답이 하나로 굳는지까지 여기서 잰다 —
  // 「답이 둘인 문항」은 값 검산이 구조적으로 못 보는 부류다.

  // 1-1-1 심화중 — 「$b$ 로 나눈 몫의 기약 분모가 $m$」 + **양쪽으로 닫은 창** $(lo, hi)$.
  //
  // ⚠️ 예전 발문은 「몫이 $1$보다 작다」(밴드) + 하한 한 쪽이었는데, 답이 늘 배수열의
  //    마지막이라 하한이 정보를 한 비트도 안 실었다(적대 검토 ⑴, 실측 100%).
  //    창이 양쪽으로 닫히면서 밴드 문장은 지워졌다 — 판독기도 같이 옮긴다.
  if (
    content.includes("기약분수로 나타냈더니 분모가") &&
    content.includes("어떤 자연수를")
  ) {
    const b = Number(content.match(/어떤 자연수를 \$(\d+)\$/)?.[1] ?? NaN);
    const m = Number(content.match(/분모가 \$(\d+)\$/)?.[1] ?? NaN);
    const win = content.match(
      /어떤 수가 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
    );
    if (!Number.isFinite(b) || !Number.isFinite(m) || !win) return null;
    if (b % m !== 0) return null;
    const g = b / m;
    const hit: number[] = [];
    for (let a = Number(win[1]) + 1; a < Number(win[2]); a += 1)
      if (gcd(a, b) === g) hit.push(a);
    return hit.length === 1 ? rat(hit[0]!) : null;
  }
  // 1-1-2 심화중 — 「몫의 분모가 처음과 같은 $q$」 ⟺ 분자 $p$ 가 나누는 수로 나누어떨어진다.
  if (content.includes("몫의 분모가 처음과 같은")) {
    const f = content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
    const win = content.match(/\$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/);
    if (!f || !win) return null;
    const [p, q] = [Number(f[1]), Number(f[2])];
    const [lo, up] = [Number(win[1]), Number(win[2])];
    const hit: number[] = [];
    for (let k = lo + 1; k < up; k += 1)
      if (k >= 2 && p % k === 0 && (q * k) / gcd(p, q * k) === q) hit.push(k);
    return hit.length === 1 ? rat(hit[0]!) : null;
  }
  // 1-1-3 심화상 — 배수열 후보 가운데 기약 분모가 $m$ 인 것 하나.
  if (content.includes("몫을 기약분수로 나타낸 분모가")) {
    const mix = content.match(/\$(\d+)\\frac\{(\d+)\}\{(\d+)\}\$/);
    const cap = Number(
      content.match(/\$(\d+)\$보다 작은 어떤 자연수/)?.[1] ?? NaN,
    );
    const m = Number(content.match(/분모가 \$(\d+)\$/)?.[1] ?? NaN);
    if (!mix || !Number.isFinite(cap) || !Number.isFinite(m)) return null;
    const [w, t, d] = [Number(mix[1]), Number(mix[2]), Number(mix[3])];
    const imp = w * d + t;
    const hit: number[] = [];
    for (let k = 2; k < cap; k += 1)
      if ((d * k) / gcd(imp, d * k) === m) hit.push(k);
    return hit.length === 1 ? rat(hit[0]!) : null;
  }

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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 유리수로 다시 계산)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
    expect(checked).toBe(
      CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) * SEEDS.length,
    );
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
        const deep = generateElementaryProblem(unit, seed, "심화하");
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
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
    }
  });

  it("같은 씨앗이면 같은 문항이고, 씨앗 16개면 갈래마다 8가지 이상 나온다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
      for (const tier of tiersOf(unit)) {
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

  it("소단원 이름이 내건 조건을 그 소단원이 내는 갈래가 전부 지킨다", () => {
    const bad: string[] = [];
    // ⚠️ 앞판은 **대표로 1-1-1 의 갈래 집합**을 돌며 셋을 한꺼번에 불렀다. 주석도
    //    「셋은 같은 회차에 같이 채워지므로 지금은 갈래 집합이 같다」고 적어 두었는데,
    //    D-113 확대 3차분에서 그것이 **깨졌다** — 같은 축이라도 소단원마다 서는 칸이
    //    다르다(1-1-1·1-1-2 는 «중», 1-1-3 은 «상»). 그래서 코드마다 자기 갈래를 돈다.
    const checkers: Record<string, (c: string) => string | null> = {
      // 1-1-1 «(자연수)÷(자연수)» — 발문에 나오는 수가 전부 자연수여야 한다.
      "1-1-1": (c) =>
        numbersIn(c).some((v) => v.d !== 1) ? `자연수가 아닌 수 — ${c}` : null,
      // 1-1-2 «(분수)÷(자연수)» — 나누어지는 양이 **진분수**여야 한다(대분수·가분수 금지).
      "1-1-2": (c) => {
        const f = c.match(/\\frac\{(\d+)\}\{(\d+)\}/);
        return !f || Number(f[1]) >= Number(f[2]) || /\d+\s*\\frac\{/.test(c)
          ? `진분수가 아니다 — ${c}`
          : null;
      },
      // 1-1-3 «(대분수)÷(자연수)» — 발문에 대분수가 있어야 한다.
      "1-1-3": (c) =>
        /\d+\s*\\frac\{/.test(c) ? null : `대분수가 없다 — ${c}`,
    };
    let checked = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const c = generateElementaryProblem(unit, seed, tier).content;
          checked += 1;
          const why = checkers[code]!(c);
          if (why) bad.push(`${code} ${tier} seed=${seed}: ${why}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 — 갈래가 늘면 여기도 같이 는다. 0 이면 위 검사는 아무것도 안 잰 것이다.
    expect(checked).toBe(
      CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) * SEEDS.length,
    );
  });

  it("갈래를 안 주면 예전 문항이 그대로 나온다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      const plain = generateElementaryProblem(unit, 20260823);
      const tiers = tiersOf(unit).map(
        (t: ElemTier) => generateElementaryProblem(unit, 20260823, t).content,
      );
      // 옛 경로는 갈래 소금을 안 타므로 씨앗이 다르다 — 우연히 같아지면 배선이 샌 것이다.
      //
      // 🔴 2026-08-30: 이 자리에 **그 «우연히 같아지면»을 재는 단언이 없었다.**
      //    있던 것은 `expect(tiers).toHaveLength(ELEM_TIERS.length)` 뿐인데,
      //    `tiers` 를 그 목록으로 만들었으니 **늘 참**이다(갈래를 등록 갈래로 옮기며
      //    동어반복이 눈에 보이게 됐다). 주석이 말하는 것을 실제로 묻는다 —
      //    초6 1-1 전 갈래 실측으로 12/12 가 다르다.
      expect(plain.content.length, code).toBeGreaterThan(0);
      expect(
        tiers.filter((c: string) => c === plain.content),
        `${code}: 갈래 문항이 갈래 없는 문항과 같다 — 갈래 소금이 안 탔다`,
      ).toEqual([]);
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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 밑면의 변의 수로 다시 세운 값과 같다 (시험이 공식을 직접 든다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_CODES) {
      const unit = unitOf(code);
      const pyramidSection = code === "1-2-4" || code === "1-2-5";
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;

          // ── 확대 갈래 둘은 **밑면을 아무 데서도 이름으로 말하지 않는다** ──
          //
          // 아래 판독기는 「이 문항의 밑면은 몇 각형인가」를 먼저 알아내고 공식을 대는데,
          // 그 둘은 **밑면이 곧 답**이거나(㉠) **입체의 종류부터 안 정해져**(㉡) 그럴 수
          // 없다. 그래서 발문의 수만으로 **여기서 다시 푼다** — 답이 하나로 굳는지까지
          // 같이 잰다(구성이 범위를 잘못 잡으면 답이 둘이 되는데, 그건 값 검산이
          // 구조적으로 못 보는 부류다).
          {
            const nums = plainNums(p.content);
            // ㉠ 「밑면은 어떤 도형입니까」 — 옆면 하나의 넓이의 배수가 구간에 하나뿐이어야 한다.
            if (/밑면은 어떤 도형입니까/.test(p.content)) {
              checked += 1;
              const [side, high, lo, up] = nums as [
                number,
                number,
                number,
                number,
              ];
              const one = pyramidSection ? (side * high) / 2 : side * high;
              const fits = [3, 4, 5, 6, 7, 8].filter(
                (k) => one * k > lo && one * k < up,
              );
              if (fits.length !== 1) {
                bad.push(
                  `${where}: 구간이 밑면을 하나로 안 굳힌다 (${fits.join(",")}) — ${p.content}`,
                );
              } else {
                const want = Object.entries(SINO_NUM).find(
                  ([, v]) => v === fits[0],
                )![0];
                if (p.answer !== `${want}각형`) {
                  bad.push(`${where}: ${p.answer} (${want}각형 이어야)`);
                }
              }
              continue;
            }
            // ㉡ 발문이 각기둥·각뿔로 범위를 정한 뒤 둘을 다 만들어 조건에 대 본다.
            if (/각기둥이나 각뿔 가운데 하나인 입체도형/.test(p.content)) {
              checked += 1;
              const [faces, cap] = nums as [number, number];
              const live: number[] = [];
              // 각기둥: 면 = n+2 · 꼭짓점 = 2n · 모서리 = 3n
              if (faces - 2 >= 3 && 2 * (faces - 2) < cap)
                live.push(3 * (faces - 2));
              // 각뿔: 면 = n+1 · 꼭짓점 = n+1 · 모서리 = 2n
              if (faces - 1 >= 3 && faces < cap) live.push(2 * (faces - 1));
              if (live.length !== 1) {
                bad.push(
                  `${where}: 조건이 입체를 하나로 안 굳힌다 (${live.join(",")}) — ${p.content}`,
                );
              } else if (answerNum(p.answer) !== live[0]) {
                bad.push(`${where}: ${p.answer} (${live[0]} 이어야)`);
              }
              continue;
            }
          }

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
    expect(checked).toBe(
      G6_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
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
        const deep = generateElementaryProblem(unit, seed, "심화하");
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
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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
      for (const tier of tiersOf(unit)) {
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

/** 발문·정답의 `$...$` 덩어리에서 소수·자연수·분수를 순서대로 뽑는다.
 *  `\%` 는 걷어 내고(백분율 수치), `:` 는 가른다(`$3:4$` 의 두 항). */
function decNumbersIn(text: string): R[] {
  const out: R[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!|\\%/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .replace(/\\div|\\times|\\square|=|:/g, " ")
      .trim();
    for (const piece of tok.split(/\s+/)) {
      const v = readDecTok(piece) ?? readNumber(piece);
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
/**
 * 유리수의 **소수 자릿수**. $2$·$5$ 말고 다른 소인수가 남으면 «안 끝난다»(null).
 * 생성기의 `centsQuotientDp` 를 안 부른다 — 부르면 동어반복이다.
 */
function decDpOf13(v: R): number | null {
  let d = v.d;
  let two = 0;
  let five = 0;
  while (d % 2 === 0) {
    d /= 2;
    two += 1;
  }
  while (d % 5 === 0) {
    d /= 5;
    five += 1;
  }
  return d === 1 ? Math.max(two, five) : null;
}

/**
 * 「$X$ 를 어떤 자연수로 나누었더니 … 나누는 수가 $lo$ 보다 크고 $hi$ 보다 작을 때」 발문에서
 * **창 안의 자연수를 전부 훑어** 조건을 지키는 것을 돌려준다. 못 읽으면 null.
 */
function divisorsMatching13(
  content: string,
  keep: (quotient: R) => boolean,
): number[] | null {
  const xm = content.match(/\$(\d+(?:\.\d+)?)\$[을를] 어떤 자연수로/);
  const wm = content.match(
    /나누는 수가 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
  );
  if (!xm || !wm) return null;
  const x = readDecTok(xm[1]!);
  if (!x) return null;
  const out: number[] = [];
  for (let d = Number(wm[1]) + 1; d < Number(wm[2]); d += 1) {
    if (keep(rdiv(x, rat(d)))) out.push(d);
  }
  return out;
}

function truthOf13(content: string): R | null {
  const ns = decNumbersIn(content);
  const at = (i: number) => ns[i] ?? null;
  // ══ 확대 갈래 (4차분 · 물결 4) — **나누는 수를 감춘다**. 아래 심화하 판독기보다 먼저 본다 ══
  //
  // ⚠️ 순서가 뜻이다. 셋 다 「나누었더니」를 쓰므로 아래 판독기가 먼저 물면 엉뚱한 두 수를
  //    나눠 «참»을 지어낸다(1-1 의 확대 갈래에서 이미 한 번 물린 자리).
  //
  // 셋 다 시험이 **조건을 다시 풀고** 답이 하나로 굳는지까지 여기서 잰다 —
  // 「답이 둘인 문항」은 값 검산이 구조적으로 못 보는 부류다.

  // 1-3-2 심화중 — 「$A$ 를 나누면 몫이 $1$보다 작아지는 자연수 중 가장 작은 수」로 나눈 몫이 $q$.
  if (content.includes("작아지는") && content.includes("가장 작은 수")) {
    const qm = content.match(/몫이 \$(\d+(?:\.\d+)?)\$[이가] 되었습니다/);
    const am = content.match(/나누는 수가 \$(\d+(?:\.\d+)?)\$[을를] 나누면/);
    if (!qm || !am) return null;
    const q = readDecTok(qm[1]!);
    const a = readDecTok(am[1]!);
    if (!q || !a) return null;
    // 몫이 $1$보다 작다 ⟺ 나누는 수 > $A$. 그중 가장 작은 자연수.
    const d = Math.floor(a.n / a.d) + 1;
    return rmul(q, rat(d));
  }
  // 1-3-3 심화상 — 창 안의 자연수 중 「$0$을 내려 몫이 소수 두 자리」인 것 하나.
  if (content.includes("소수점 아래 $0$을 내려 계산하게 되어")) {
    const hit = divisorsMatching13(content, (v) => decDpOf13(v) === 2);
    return hit && hit.length === 1 ? rat(hit[0]!) : null;
  }
  // 1-3-4 심화상 — 그 중 「몫의 소수 첫째 자리가 $0$」인 것 하나. 답은 **몫**이다.
  if (content.includes("몫이 소수 첫째 자리에 $0$이 있는")) {
    const x = readDecTok(
      content.match(/\$(\d+(?:\.\d+)?)\$[을를] 어떤 자연수로/)?.[1] ?? "",
    );
    const hit = divisorsMatching13(
      content,
      (v) => decDpOf13(v) === 2 && Math.floor((v.n * 10) / v.d) % 10 === 0,
    );
    if (!x || !hit || hit.length !== 1) return null;
    return rdiv(x, rat(hit[0]!));
  }

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
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 유리수로 다시 계산)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_13_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
    expect(checked).toBe(
      G6_13_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
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
        const deep = generateElementaryProblem(unit, seed, "심화하");
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
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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
      for (const tier of tiersOf(unit)) {
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

// ══════════ 4차분 — 1-4 비와 비율 ══════════
//
// 답 모양이 넷(자연수·비·기약분수·소수)이고, **비의 어순**이 이 대단원 최대 함정이다:
// 「B에 대한 A의 비」=A:B(B가 기준량) · 「A와 B의 비」=A:B · 「A의 B에 대한 비」=A:B.
// 생성기가 한 문형을 거꾸로 읽으면 그 갈래 전량이 그럴듯한 오답이 된다 — 그래서
// ⑴ 이 시험이 어순 규칙을 **생성기와 독립으로** 다시 구현해 발문에서 비를 되뽑고
// ⑵ 세 문형을 고정 픽스처로도 잠근다(파서 자체의 눈금 — 엔진을 안 부른다).

const G6_14_CODES = [
  "1-4-1",
  "1-4-2",
  "1-4-3",
  "1-4-4",
  "1-4-5",
  "1-4-6",
] as const;

/** 발문에서 «이름 $n$» 짝을 뽑는다: "남학생 $4$명과" → { name: "남학생", v: 4 }.
 *  이름에 앞말이 딸려 붙을 수 있어(«명과 여학생») 찾을 때는 endsWith 로 맞춘다. */
function namedCounts(content: string): { name: string; v: number }[] {
  const out: { name: string; v: number }[] = [];
  for (const m of content.matchAll(/([가-힣][가-힣 ]*?)\s\$(\d+)\$/g)) {
    out.push({ name: m[1]!.trim(), v: Number(m[2]) });
  }
  return out;
}

/**
 * 비(`$a:b$`)가 답인 발문에서 어순 규칙으로 (비교하는 양, 기준량)을 되뽑는다.
 * 「전체 …」는 이름이 아니라 **이름들의 합**이다. 못 읽으면 null — 위반으로 처리된다.
 */
function ratioTruthOf(content: string): [number, number] | null {
  const dae = content.match(/\$(\d+)\$ 대 \$(\d+)\$/);
  if (dae) return [Number(dae[1]), Number(dae[2])];
  // 1-4-2 심화 — 「합이 $S$ 이고 비교하는 양이 기준량보다 $d$ 만큼 큽니다(작습니다)」.
  // 기준량이 **주어지지 않으므로** 합과 차에서 함께 되짚는다(D-72 4단 — 조건 둘을 겹친다).
  if (content.includes("만큼")) {
    const ns = decNumbersIn(content);
    if (ns.length < 2 || ns[0]!.d !== 1 || ns[1]!.d !== 1) return null;
    const sum = ns[0]!.n;
    const d = ns[1]!.n;
    const bigger = content.includes("큽니다");
    const twice = bigger ? sum - d : sum + d;
    if (twice % 2 !== 0) return null;
    const b0 = twice / 2;
    return bigger ? [b0 + d, b0] : [b0 - d, b0];
  }
  const counts = namedCounts(content);
  const resolve = (label: string): number | null => {
    if (label.startsWith("전체")) {
      return counts.reduce((s, c) => s + c.v, 0);
    }
    const hit = counts.find((c) => c.name.endsWith(label));
    return hit ? hit.v : null;
  };
  // 「B에 대한 A의 비」 = A:B — 기준량이 앞에 온다.
  let m = content.match(
    /([가-힣][가-힣 ]*?) 수에 대한 ([가-힣][가-힣 ]*?) 수의 비/,
  );
  if (m) {
    const x = resolve(m[2]!);
    const y = resolve(m[1]!);
    return x !== null && y !== null ? [x, y] : null;
  }
  // 「A의 B에 대한 비」 = A:B.
  m = content.match(
    /([가-힣][가-힣 ]*?) 수의 ([가-힣][가-힣 ]*?) 수에 대한 비/,
  );
  if (m) {
    const x = resolve(m[1]!);
    const y = resolve(m[2]!);
    return x !== null && y !== null ? [x, y] : null;
  }
  // 「A와 B의 비」 = A:B — 차례 그대로.
  m = content.match(/([가-힣][가-힣 ]*?) 수와 ([가-힣][가-힣 ]*?) 수의 비/);
  if (m) {
    const x = resolve(m[1]!);
    const y = resolve(m[2]!);
    return x !== null && y !== null ? [x, y] : null;
  }
  return null;
}

/** `$a:b$` 답. 비는 6-1 에서 약분하지 않으므로 **그대로의 짝**으로 견준다. */
function readRatioAnswer(answer: string): [number, number] | null {
  const m = answer.match(/^\$(\d+):(\d+)\$$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** 정답 하나를 유리수로 — 자연수·소수·분수(`fmtFrac` 산출) 전부. */
function readMixedAnswer(answer: string): R {
  const m = answer.match(/^\$(.+)\$$/);
  expect(m, `정답 모양: ${answer}`).toBeTruthy();
  const tok = m![1]!.replace(/\\,|\\;|\\!/g, "").trim();
  const v = readDecTok(tok) ?? readNumber(tok);
  expect(v, `정답을 못 읽음: ${answer}`).toBeTruthy();
  return v!;
}

/** 유리수 값 비교(교차곱) — 백분율 비교 갈래가 쓴다. */
const rlt = (a: R, b: R) => a.n * b.d < b.n * a.d;

/**
 * 유리수 답 갈래의 참 — 발문의 낱말로 가른다. 어순(«에 대한»)이 방향을 정하는 갈래는
 * 그 방향을 여기서 **다시** 정한다(엔진 해석을 되받으면 값 복사라 같이 눈먼다).
 */
function truthOf14(content: string): R | null {
  const ns = decNumbersIn(content);
  const at = (i: number) => ns[i] ?? null;
  // ══ 확대 갈래 (4차분 · 물결 4) — **값을 안 주고 «정수성 + 창»으로 굳힌다** ══
  //
  // ⚠️ 순서가 뜻이다. 아래 심화하 판독기(「찬성률이」·「비율이 $」)가 먼저 물면
  //    창의 두 끝을 «찬성 인원»·«합»으로 읽어 그럴듯한 «참»을 지어낸다.
  //
  // 셋 다 시험이 창 안에서 배수를 **다시 찾고**, 하나로 굳는지까지 여기서 잰다.
  {
    /** 창 안 자연수 가운데 $m$의 배수 — 정확히 하나일 때만 값을 준다. */
    const lone14 = (lo: number, hi: number, m: number): number | null => {
      let hit: number | null = null;
      for (let v = lo + 1; v < hi; v += 1) {
        if (v % m !== 0) continue;
        if (hit !== null) return null;
        hit = v;
      }
      return hit;
    };
    const pctOf = (c: string) => {
      const m = c.match(/\$(\d+)\\%\$/);
      return m ? Number(m[1]) : null;
    };
    const winOf = (c: string, re: RegExp): [number, number] | null => {
      const m = c.match(re);
      return m ? [Number(m[1]), Number(m[2])] : null;
    };

    // 1-4-3 심화중 — 비율 $\frac pq$ + 「두 항이 자연수」 → 기준량은 $q$ 의 배수.
    if (content.includes("두 항이 모두 자연수이고 기준량이")) {
      const f = content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
      const w = winOf(
        content,
        /기준량이 \$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/,
      );
      if (!f || !w) return null;
      const [p, q] = [Number(f[1]), Number(f[2])];
      const base = lone14(w[0], w[1], q);
      return base === null ? null : rat((base / q) * p);
    }
    // 1-4-5 심화중 — $p\%$ + 「그 학생 수가 자연수」 → 전체는 기약분모의 배수.
    if (content.includes("수가 자연수이고 전체 학생이")) {
      const p = pctOf(content);
      const w = winOf(
        content,
        /전체 학생이 \$(\d+)\$명보다 많고 \$(\d+)\$명보다 적을 때/,
      );
      if (p === null || !w) return null;
      const b = 100 / gcd(p, 100);
      const total = lone14(w[0], w[1], b);
      return total === null ? null : rat((total * p) / 100);
    }
    // 1-4-6 심화중 — 같은 굳힘, 묻는 것은 **여집합**(반대한 학생).
    if (content.includes("찬성한 학생 수가 자연수이고 투표한 학생이")) {
      const p = pctOf(content);
      const w = winOf(
        content,
        /투표한 학생이 \$(\d+)\$명보다 많고 \$(\d+)\$명보다 적을 때/,
      );
      if (p === null || !w) return null;
      const b = 100 / gcd(p, 100);
      const total = lone14(w[0], w[1], b);
      return total === null ? null : rat(total - (total * p) / 100);
    }
  }

  // 1-4-1 심화 ⓑ — 어떤 수를 되짚어 다른 배를 구한다.
  // ⚠️ 1-4-5 심화 ⓐ(「어떤 수의 $p\%$ 는 $V$. 어떤 수의 $q\%$ 는?」)도 여기로 온다 —
  //    되짚어 다시 적용하는 **같은 구조**라 $V\div p\times q$ 로 값이 맞다(`\%` 는 안 읽힌다).
  if (content.includes("어떤 수의")) {
    const [k1, v, k2] = [at(0), at(1), at(2)];
    return k1 && v && k2 ? rmul(rdiv(v, k1), k2) : null;
  }
  // 1-4-5 심화 ⓑ — 백분율을 두 겹으로: 전체의 $p\%$ 의 $q\%$
  if (content.includes("가 남학생입니다")) {
    const [total, p, q] = [at(0), at(1), at(2)];
    if (!total || !p || !q) return null;
    return rmul(rmul(total, rdiv(p, rat(100))), rdiv(q, rat(100)));
  }
  // 1-4-1 심화 ⓐ — 배수 조건과 **전체** 조건을 겹친다: 전체는 작은 쪽의 $k+1$ 묶음이다
  if (content.includes("배입니다")) {
    const [k, total] = [at(0), at(1)];
    if (!k || !total || k.d !== 1) return null;
    return rdiv(total, rat(k.n + 1));
  }
  // 1-4-3 심화 — 비율과 **합**을 겹쳐 비례배분한다 (묻는 쪽만 다르다)
  if (/비율이 \$/.test(content) && content.includes("합이")) {
    const [f, sum] = [at(0), at(1)];
    if (!f || !sum) return null;
    const parts = rat(f.n + f.d);
    const want = content.includes("비교하는 양은") ? rat(f.n) : rat(f.d);
    return rmul(rdiv(sum, parts), want);
  }
  // 1-4-4 심화 — 빠르기를 **먼저 되짚어** 거리·시간을 구한다 (발문은 비율을 안 준다)
  if (content.includes("같은 빠르기로")) {
    const [h, dist, other] = [at(0), at(1), at(2)];
    if (!h || !dist || !other) return null;
    const rate = rdiv(dist, h);
    return content.includes("몇 시간") ? rdiv(other, rate) : rmul(rate, other);
  }
  // 1-4-6 심화 ⓐ — 할인가에서 원래 가격을 되짚는다
  if (content.includes("원래 가격")) {
    const [r, paid] = [at(0), at(1)];
    return r && paid ? rdiv(paid, rat(100 - r.n, 100)) : null;
  }
  // 1-4-6 심화 ⓑ — 찬성률과 찬성 수에서 전체를 되짚는다
  if (content.includes("찬성률이")) {
    const [rate, yes] = [at(0), at(1)];
    return rate && yes ? rdiv(yes, rat(rate.n, 100)) : null;
  }
  // 1-4-6 응용 — 할인 금액을 빼고 남은 지불액
  if (content.includes("할인하여 샀습니다")) {
    const [p, r] = [at(0), at(1)];
    return p && r ? rmul(p, rat(100 - r.n, 100)) : null;
  }
  // 1-4-6 연산 — 이자율 (예금한 돈이 기준량이다)
  if (content.includes("예금한")) {
    const [pr, it] = [at(0), at(1)];
    return pr && it ? rmul(rdiv(it, pr), rat(100)) : null;
  }
  // 1-4-4 응용 — 물+소금을 먼저 소금물로
  if (content.includes("녹여")) {
    const [w, s] = [at(0), at(1)];
    return w && s ? rdiv(s, rat(w.n + s.n)) : null;
  }
  // 1-4-6 기본 — 소금물의 진하기를 백분율로 (소금물이 기준량이다)
  if (content.includes("소금물") && content.includes("%")) {
    const [total, s] = [at(0), at(1)];
    return total && s ? rmul(rdiv(s, total), rat(100)) : null;
  }
  // 1-4-5 응용 — 두 비율을 백분율로 바꿔 견준다
  if (content.includes("두 비율")) {
    const [f, d] = [at(0), at(1)];
    if (!f || !d) return null;
    const pickBig = content.includes("큰");
    const chosen = rlt(f, d) === pickBig ? d : f;
    return rmul(chosen, rat(100));
  }
  // 1-4-5 연산 — 소수 비율 × 100
  if (/^비율 \$/.test(content) && ns.length === 1) {
    return rmul(at(0)!, rat(100));
  }
  // 1-4-3 응용 — 나머지 쪽을 먼저 구해 전체에 대한 비율로
  if (content.includes("그중") && content.includes("나머지")) {
    const [r, a] = [at(0), at(1)];
    return r && a ? rat(r.n - a.n, r.n) : null;
  }
  // 1-4-5 기본 — 전체에 대한 부분을 백분율로
  if (content.includes("그중") && content.includes("%")) {
    const [t, a] = [at(0), at(1)];
    return t && a ? rmul(rdiv(a, t), rat(100)) : null;
  }
  // 1-4-3 기본 — 모둠에 대한 무리의 비율(분수)
  if (content.includes("명 중")) {
    const [b, a] = [at(0), at(1)];
    return b && a ? rdiv(a, b) : null;
  }
  // 1-4-1 응용 — 다른 쪽을 차에서 먼저 구한다
  if (content.includes("적습니다")) {
    const [red, d] = [at(0), at(1)];
    return red && d ? rdiv(red, rat(red.n - d.n)) : null;
  }
  // 1-4-4 기본 ⓐ — 걸린 시간에 대한 간 거리 (시간이 앞에 적힌다)
  if (content.includes("동안") || content.includes("걸린 시간이")) {
    const [h, dist] = [at(0), at(1)];
    return h && dist ? rdiv(dist, h) : null;
  }
  // 1-4-4 기본 ⓑ — 넓이에 대한 인구
  if (content.includes("인구")) {
    const [a, p] = [at(0), at(1)];
    return a && p ? rdiv(p, a) : null;
  }
  // 1-4-1 연산·기본 — 큰 수 ÷ 작은 수 · 1-4-3 연산 — 비를 소수 비율로
  const [a, b] = [at(0), at(1)];
  if (!a || !b || ns.length > 2) return null;
  return rdiv(a, b);
}

describe("[초6 갈래] 1-4 비와 비율", () => {
  it("소단원 여섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_14_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("비 어순 눈금 — 판독기가 세 문형과 «전체»를 옳게 읽는다 (엔진을 안 부른다)", () => {
    const rows: { content: string; want: [number, number]; why: string }[] = [
      {
        content:
          "여학생 $5$명과 남학생 $4$명이 있습니다. 여학생 수에 대한 남학생 수의 비를 쓰시오.",
        want: [4, 5],
        why: "«B에 대한 A의 비» = A:B — 기준량이 앞에 온다",
      },
      {
        content:
          "여학생 $5$명과 남학생 $4$명이 있습니다. 남학생 수에 대한 여학생 수의 비를 쓰시오.",
        want: [5, 4],
        why: "같은 문형, 반대 방향 — 방향이 안 갈리면 판독기가 아니다",
      },
      {
        content:
          "여학생 $5$명과 남학생 $4$명이 있습니다. 남학생 수와 여학생 수의 비를 쓰시오.",
        want: [4, 5],
        why: "«A와 B의 비» = A:B — 차례 그대로",
      },
      {
        content:
          "여학생 $5$명과 남학생 $4$명이 있습니다. 남학생 수의 여학생 수에 대한 비를 쓰시오.",
        want: [4, 5],
        why: "«A의 B에 대한 비» = A:B — 엔진이 아직 안 쓰는 문형도 잠근다",
      },
      {
        content:
          "남학생 $4$명과 여학생 $5$명이 있습니다. 전체 학생 수에 대한 남학생 수의 비를 쓰시오.",
        want: [4, 9],
        why: "«전체 …»는 이름이 아니라 이름들의 합이다",
      },
      {
        content:
          "어떤 비의 두 항의 합이 $10$이고, 비교하는 양이 기준량보다 $2$만큼 큽니다. 이 비를 쓰시오.",
        want: [6, 4],
        why: "심화 — 합과 차에서 함께 되짚는다: 기준량 $(10-2)\\div2=4$",
      },
      {
        content:
          "어떤 비의 두 항의 합이 $10$이고, 비교하는 양이 기준량보다 $2$만큼 작습니다. 이 비를 쓰시오.",
        want: [4, 6],
        why: "같은 문형, 반대 방향 — 방향이 안 갈리면 판독기가 아니다",
      },
    ];
    for (const f of rows) {
      expect(ratioTruthOf(f.content), `${f.why} — ${f.content}`).toEqual(
        f.want,
      );
    }
  });

  it("정답은 발문이 말하는 값과 같다 (비는 어순 규칙으로, 나머지는 유리수로 재계산)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_14_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          const pairGot = readRatioAnswer(p.answer);
          if (pairGot) {
            const want = ratioTruthOf(p.content);
            if (!want) {
              bad.push(`${where}: 비 발문을 못 읽음 — ${flat}`);
              continue;
            }
            checked += 1;
            if (want[0] !== pairGot[0] || want[1] !== pairGot[1]) {
              bad.push(
                `${where}: 답 ${p.answer} (${want[0]}:${want[1]} 이어야) — ${flat}`,
              );
            }
            continue;
          }
          const want = truthOf14(p.content);
          if (!want) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          checked += 1;
          const got = readMixedAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${where}: 답 ${p.answer} (${rshow(want)} 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_14_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("연산은 이름표 붙은 값이고, 기본은 상황문이며, 응용은 등식이 하나 더 많다", () => {
    // 손 목록이다 — 연산 문형을 바꾸면 여기가 먼저 빨개져서 새 문형을 적게 만든다.
    const CALC_SHAPE: Record<string, RegExp> = {
      "1-4-1": /^\$\d+\$[은는] \$\d+\$의 몇 배입니까/,
      "1-4-2": /^\$\d+\$ 대 \$\d+\$/,
      "1-4-3": /^비 \$\d+:\d+\$의 비율을 소수로/,
      "1-4-4": /^걸린 시간이 \$\d+\$시간이고/,
      "1-4-5": /^비율 \$[\d.]+\$/,
      "1-4-6": /^예금한 돈이 \$\d+\$원이고/,
    };
    const eqs = (s: string) => (s.match(/\$[^$]*=[^$]*\$/g) ?? []).length;
    for (const code of G6_14_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        const apply = generateElementaryProblem(unit, seed, "응용");
        expect(
          CALC_SHAPE[code]!.test(calc.content),
          `${code} 연산 seed=${seed}: ${calc.content}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(basic.content),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${basic.content}`,
        ).toBe(false);
        // 3단은 중간값(전체·차·할인 금액·환산)이 있어 해설의 등식이 2단보다 하나 많다.
        expect(
          eqs(apply.solution) > eqs(basic.solution),
          `${code} seed=${seed}: 응용 등식 ${eqs(apply.solution)} · 기본 ${eqs(basic.solution)} — ${apply.solution}`,
        ).toBe(true);
        expect(
          /어떤 수|배입니다|비교하는 양이|같은 빠르기로|가 남학생입니다|원래 가격|찬성률이|비율이 \$/.test(
            apply.content,
          ),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
      }
    }
  });

  it("심화는 역산 표지가 있다 — 비율·백분율을 주고 반대쪽을 되짚는다", () => {
    for (const code of G6_14_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const deep = generateElementaryProblem(unit, seed, "심화하");
        expect(
          /어떤 수|배입니다|비교하는 양이|같은 빠르기로|가 남학생입니다|원래 가격|찬성률이|비율이 \$/.test(
            deep.content,
          ),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        // ⓐ «백분율→기약분수»는 발문의 수가 하나뿐이다(백분율 하나에서 되돌린다) — ≥1 로 잰다.
        expect(
          decNumbersIn(deep.content).length,
          `${code} 심화 seed=${seed}: ${deep.content}`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_14_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·샌 소수·꼬리 0 없음", () => {
    const bad: string[] = [];
    for (const code of G6_14_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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

// ══════════ 5차분 — 1-5 여러 가지 그래프 ══════════
//
// **참이 처음으로 그림 스펙에 있다** — 읽기 소단원(1-5-1·3·5)의 자료는 figureSpec 의
// {label, pct} 다. 검산은 스펙에서 비율을 되뽑고, 발문의 라벨·수와 맞대어 재계산한다.
// 그리고 **백분율 합 100 을 독립 재검산한다** — 그래프 자료가 100 을 못 채우면
// 문항 전체가 성립하지 않는데, 그 결함은 렌더도 검산도 스스로 신고하지 않는다.

const G6_15_CODES = ["1-5-1", "1-5-2", "1-5-3", "1-5-4", "1-5-5"] as const;

type ChartSlice = { label: string; pct: number };

/** figureSpec 에서 {label, pct} 목록을 꺼낸다 — 원·띠 두 kind 만 안다. */
function chartPcts(spec: unknown): ChartSlice[] | null {
  const s = spec as
    | { kind?: string; slices?: ChartSlice[]; segments?: ChartSlice[] }
    | null
    | undefined;
  if (!s) return null;
  if (s.kind === "pieChart") return s.slices ?? null;
  if (s.kind === "stripChart") return s.segments ?? null;
  return null;
}

/** 발문에 나온 스펙 라벨을 **나온 차례대로**. (한 글자 라벨 «배»도 차례가 지켜 준다.) */
function labelsInOrder(content: string, slices: ChartSlice[]): ChartSlice[] {
  return slices
    .filter((s) => content.includes(s.label))
    .sort((a, b) => content.indexOf(a.label) - content.indexOf(b.label));
}

/**
 * 유리수 답 갈래의 참 — 그림 문항은 스펙에서, 그리기 문항은 발문 수치에서 다시 만든다.
 * 못 읽으면 null — 위반으로 처리된다.
 */
function truthOf15(content: string, spec: unknown): R | null {
  const ns = decNumbersIn(content);
  const at = (i: number) => ns[i] ?? null;
  const slices = chartPcts(spec);
  const named = slices ? labelsInOrder(content, slices) : [];
  // ══ 확대 갈래 (4차분 · 물결 4) — 1-5-2 심화중 · **눈금**이 굳힌다 ══
  //
  // 전체와 부분 길이가 모두 자연수 cm이므로 전체를 기약분모의 배수로 묶는다.
  // 시험이 창 안에서 배수를 **다시 찾고**, 하나로 굳는지까지 잰다.
  if (/전체 길이와 .*차지하는 길이가 모두 자연수 cm/.test(content)) {
    const p = Number(content.match(/\$(\d+)\\%\$/)?.[1] ?? NaN);
    const w = content.match(
      /전체 길이가 \$(\d+)\$ cm 보다 길고 \$(\d+)\$ cm 보다 짧을 때/,
    );
    if (!Number.isFinite(p) || !w) return null;
    const b = 100 / gcd(p, 100);
    let hit: number | null = null;
    for (let v = Number(w[1]) + 1; v < Number(w[2]); v += 1) {
      if (v % b !== 0) continue;
      if (hit !== null) return null;
      hit = v;
    }
    return hit === null ? null : rat((hit * p) / 100);
  }

  // 1-5-5 심화 — 최고 명수에서 전체를 되짚어 최저 명수로
  if (content.includes("가장 높은 항목을 고른 학생이")) {
    if (!slices || !at(0)) return null;
    const ps = slices.map((s) => s.pct);
    return rat(at(0)!.n * Math.min(...ps), Math.max(...ps));
  }
  // 1-5-1 심화 — 명수에서 전체를 되짚는다
  if (content.includes("전체 학생은 몇 명")) {
    const n = at(0);
    return n && named[0] ? rat(n.n * 100, named[0].pct) : null;
  }
  // 1-5-3 심화 — X 명수 → 전체 → Y 명수
  if (
    content.includes("고른 학생이 $") &&
    content.includes("고른 학생은 몇 명")
  ) {
    const n = at(0);
    return n && named.length >= 2
      ? rat(n.n * named[1]!.pct, named[0]!.pct)
      : null;
  }
  // 1-5-2 심화 — 길이 → 비율 → 명수
  if (content.includes("를 차지합니다")) {
    const [w, len, t] = [at(0), at(1), at(2)];
    return w && len && t ? rat(t.n * len.n, w.n) : null;
  }
  // 1-5-4 심화 — 관계 단서 + 합 100 → 명수
  if (content.includes("배이고")) {
    const [k, pb, t] = [at(0), at(1), at(2)];
    if (!k || !pb || !t) return null;
    return rat(t.n * (100 - k.n * pb.n - pb.n), 100);
  }
  // 1-5-4 기본 — 나머지 항목의 비율
  if (content.includes("나머지는 모두") && content.includes("비율은 몇 %")) {
    if (ns.length < 3) return null;
    return rat(100 - ns.reduce((s, v) => s + v.n, 0));
  }
  // 1-5-2 응용 — 비율이 큰 항목부터 그릴 때의 누적 시작 자리
  if (content.includes("시작되는 곳")) {
    const pairs = [
      ...content.matchAll(/([가-힣][가-힣 ]*?)[은는] \$(\d+)\\%\$/g),
    ].map((m) => ({ label: m[1]!.trim(), pct: Number(m[2]) }));
    const asked = content.match(/([가-힣][가-힣 ]*?)[이가] 시작되는/);
    const w = ns[ns.length - 1];
    if (pairs.length < 3 || !asked || !w) return null;
    // 문장 첫 항목은 캡처가 앞말까지 삼킨다(«좋아하는 과목 조사에서 영어») — 양방향으로 맞댄다.
    const mine = pairs.find(
      (p) => p.label.endsWith(asked[1]!) || asked[1]!.endsWith(p.label),
    );
    if (!mine) return null;
    const before = pairs
      .filter((p) => p.pct > mine.pct)
      .reduce((s, p) => s + p.pct, 0);
    return rat(w.n * before, 100);
  }
  // 1-5-2·4 연산 — 명수 → 비율
  if (content.includes("조사하였더니") && content.includes("비율은 몇 %")) {
    const [t, n] = [at(0), at(1)];
    return t && n ? rat(n.n * 100, t.n) : null;
  }
  // 1-5-2 기본 — 비율 → 길이
  if (content.includes("차지하는 길이")) {
    const [p, w] = [at(0), at(1)];
    return p && w ? rat(w.n * p.n, 100) : null;
  }
  // 1-5-4 응용 — 두 명수 → 비율 합
  if (content.includes("비율의 합은 몇 %")) {
    const [t, nA, nB] = [at(0), at(1), at(2)];
    return t && nA && nB ? rat((nA.n + nB.n) * 100, t.n) : null;
  }
  // 1-5-5 응용 — 상위 두 항목의 합 − 절반
  if (content.includes("절반보다")) {
    if (!slices) return null;
    const ps = slices.map((s) => s.pct).sort((a, b) => b - a);
    return rat(ps[0]! + ps[1]! - 50);
  }
  // 1-5-5 연산 — 최고 비율 읽기
  if (content.includes("가장 높은 항목의 비율")) {
    return slices ? rat(Math.max(...slices.map((s) => s.pct))) : null;
  }
  // 1-5-5 기본 — 한 항목보다 높은 항목 세기
  if (content.includes("보다 비율이 높은 항목")) {
    if (!slices || !named[0]) return null;
    return rat(slices.filter((s) => s.pct > named[0]!.pct).length);
  }
  // 1-5-1 응용 — 두 항목의 명수 차 (큰 쪽이 앞에 적힌다)
  if (content.includes("더 많습니까")) {
    const t = at(0);
    return t && named.length >= 2
      ? rat(t.n * (named[0]!.pct - named[1]!.pct), 100)
      : null;
  }
  // 1-5-3 기본 — 두 항목의 비율 차 (높은 쪽이 앞에 적힌다)
  if (content.includes("더 높습니까")) {
    return named.length >= 2 ? rat(named[0]!.pct - named[1]!.pct) : null;
  }
  // 1-5-3 응용 — «몇 배»
  if (content.includes("몇 배입니까")) {
    return named.length >= 2 ? rat(named[0]!.pct, named[1]!.pct) : null;
  }
  // 1-5-1·3 연산 — 항목 비율 읽기 (발문에 수가 없다 — 그래프가 자료다)
  if (content.includes("의 비율은 몇 %입니까") && ns.length === 0) {
    return named[0] ? rat(named[0].pct) : null;
  }
  return null;
}

describe("[초6 갈래] 1-5 여러 가지 그래프", () => {
  it("소단원 다섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_15_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("그래프 자료의 백분율 합은 늘 100 이고, 읽기 갈래에만 그림이 있다", () => {
    const bad: string[] = [];
    for (const code of G6_15_CODES) {
      const unit = unitOf(code);
      const drawing = code === "1-5-2" || code === "1-5-4";
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const slices = chartPcts(p.figureSpec ?? null);
          if (drawing) {
            // 그리기 소단원은 자료를 발문이 준다 — 그림이 붙으면 설계가 샌 것이다.
            if (p.figureSpec) bad.push(`${where}: 그리기 갈래에 그림`);
            continue;
          }
          if (!slices) {
            bad.push(`${where}: 그림이 없거나 못 읽음`);
            continue;
          }
          const sum = slices.reduce((s, v) => s + v.pct, 0);
          if (sum !== 100) {
            bad.push(`${where}: 백분율 합 ${sum} — ${JSON.stringify(slices)}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("정답은 발문·그림이 말하는 값과 같다 (그림 문항은 스펙에서 되뽑는다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_15_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          // 1-5-1 기본 — 낱말 답(가장 큰 항목). 스펙의 최댓값 라벨과 맞댄다.
          if (p.content.includes("가장 많은 학생이 고른 항목")) {
            const slices = chartPcts(p.figureSpec ?? null);
            if (!slices) {
              bad.push(`${where}: 그림 없음 — ${flat}`);
              continue;
            }
            checked += 1;
            const top = slices.reduce((a, b) => (a.pct > b.pct ? a : b));
            if (p.answer !== top.label) {
              bad.push(`${where}: 답 ${p.answer} (${top.label} 이어야)`);
            }
            continue;
          }
          const want = truthOf15(p.content, p.figureSpec ?? null);
          if (!want) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          checked += 1;
          const got = readMixedAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${where}: 답 ${p.answer} (${rshow(want)} 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_15_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("연산 문형이 서고, 기본은 그 문형이 아니며, 응용은 되짚지 않는다", () => {
    const CALC_SHAPE: Record<string, RegExp> = {
      "1-5-1": /띠그래프입니다\. [가-힣 ]+의 비율은 몇 %입니까\?$/,
      "1-5-2": /^학생 \$\d+\$명의 .+ 조사하였더니/,
      "1-5-3": /원그래프입니다\. [가-힣 ]+의 비율은 몇 %입니까\?$/,
      "1-5-4": /^학생 \$\d+\$명의 .+ 조사하였더니/,
      "1-5-5": /가장 높은 항목의 비율은 몇 %입니까\?$/,
    };
    const DEEP = /전체 학생은 몇 명|고른 학생이 \$|를 차지합니다|배이고/;
    for (const code of G6_15_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        const apply = generateElementaryProblem(unit, seed, "응용");
        const deep = generateElementaryProblem(unit, seed, "심화하");
        expect(
          CALC_SHAPE[code]!.test(calc.content),
          `${code} 연산 seed=${seed}: ${calc.content}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(basic.content),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${basic.content}`,
        ).toBe(false);
        expect(
          DEEP.test(deep.content),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        expect(
          DEEP.test(apply.content),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_15_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·샌 소수 없음", () => {
    const bad: string[] = [];
    for (const code of G6_15_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

// ══════════ 6차분 — 1-6 직육면체의 겉넓이와 부피 (초6 1학기 마감) ══════════
//
// 참은 발문의 **이름표 붙은 치수**(가로/세로/높이·한 모서리)에서 나온다. 겉넓이·부피
// 공식과 단위 환산(1 m³ = 1000000 cm³)을 시험이 직접 들고, 단위 표기(cm²·cm³·m³)가
// 묻는 것과 맞는지도 잰다 — 넓이에 cm³ 를 쓰는 결함은 값 검산이 못 본다.

const G6_16_CODES = ["1-6-1", "1-6-2", "1-6-3"] as const;

/** 발문이 말하는 값을 다시 만든다 — 공식을 여기서 직접 든다(엔진을 안 부른다). */
function truthOf16(content: string): R | null {
  const ns = decNumbersIn(content);
  const at = (i: number) => ns[i] ?? null;

  // ══ 확대 갈래 (D-113 2차분) — **구간·인수** 꼴이라 앞의 「값 하나」 판독기보다 먼저 본다 ══
  //
  // ⚠️ 순서가 뜻이다. 「겉넓이가 … 높이는」·「부피가 … 높이는 몇 m」는 아래 심화하
  //    판독기가 먼저 무는데, 확대 갈래는 겉넓이·부피를 **구간**으로 주므로 그 자리의
  //    `at(2)` 가 «구간의 왼쪽 끝»이 되어 조용히 다른 값을 참으로 삼는다.

  /** 구간 $(lo, up)$ 안에서 `f(k)` 가 참이 되는 자연수 `k` — 하나가 아니면 null. */
  const onlyK = (from: number, to: number, f: (k: number) => number) => {
    const hit: number[] = [];
    for (let k = 1; k <= 60; k += 1) {
      const v = f(k);
      if (v > from && v < to) hit.push(k);
    }
    return hit.length === 1 ? hit[0]! : null;
  };

  // 1-6-1 심화중 — 겉넓이가 **구간**이고 높이가 자연수: 하나로 굳는 높이를 여기서 다시 찾는다.
  if (content.includes("겉넓이가") && content.includes("보다 넓고")) {
    const [w, d, lo, up] = [at(0), at(1), at(2), at(3)];
    if (!w || !d || !lo || !up) return null;
    const k = onlyK(lo.n, up.n, (h) => 2 * w.n * d.n + 2 * (w.n + d.n) * h);
    return k === null ? null : rat(k);
  }
  // 1-6-1 심화상 — 밑면이 정사각형: $2a^2+4ah=S$ 를 만족하는 자연수 $a$ 는 하나뿐이다.
  if (content.includes("밑면이 정사각형") && content.includes("한 변은 몇")) {
    const [h, S] = [at(0), at(1)];
    if (!h || !S) return null;
    const hit = [];
    for (let a = 1; a <= 40; a += 1)
      if (2 * a * a + 4 * a * h.n === S.n) hit.push(a);
    return hit.length === 1 ? rat(hit[0]!) : null;
  }
  // 1-6-2 심화중 — 부피·가로·차에서 세로: 곱이 $V\div w$ 이고 차가 주어진 짝은 하나뿐이다.
  if (content.includes("부피가") && content.includes("세로는 몇 cm입니까")) {
    const [V, w, gap] = [at(0), at(1), at(2)];
    if (!V || !w || !gap || V.n % w.n !== 0) return null;
    const p = V.n / w.n;
    const hit: number[] = [];
    for (let x = 1; x * x <= p; x += 1)
      if (p % x === 0 && p / x - x === gap.n) hit.push(p / x);
    return hit.length === 1 ? rat(hit[0]!) : null;
  }
  // 1-6-2 심화상 — 서로 다른 세 자연수의 곱 중 «가장 긴 것»이 상한보다 짧은 삼조의 합.
  if (content.includes("세 모서리의 길이의 합은 몇")) {
    const [V, cap] = [at(0), at(1)];
    if (!V || !cap) return null;
    const kept: number[] = [];
    for (let a = 1; a * a * a < V.n; a += 1) {
      if (V.n % a !== 0) continue;
      const rest = V.n / a;
      for (let b = a + 1; b * b < rest; b += 1) {
        if (rest % b !== 0) continue;
        const c = rest / b;
        if (c > b && c < cap.n) kept.push(a + b + c);
      }
    }
    return kept.length === 1 ? rat(kept[0]!) : null;
  }
  // 1-6-3 심화중 — cm³ **구간**을 m³ 로 옮긴 뒤 밑면 넓이의 배수를 찾는다.
  if (content.includes("부피가") && content.includes("보다 크고")) {
    const [w, d, lo, up] = [at(0), at(1), at(2), at(3)];
    if (!w || !d || !lo || !up) return null;
    const k = onlyK(lo.n / 1000000, up.n / 1000000, (h) => w.n * d.n * h);
    return k === null ? null : rat(k);
  }

  // 1-6-1 심화 ⓐ — 두 변과 겉넓이에서 높이: h = (S − 2wd) ÷ (2(w+d))
  if (content.includes("겉넓이가") && content.includes("높이는")) {
    const [w, d, S] = [at(0), at(1), at(2)];
    if (!w || !d || !S) return null;
    return rat(S.n - 2 * w.n * d.n, 2 * (w.n + d.n));
  }
  // 1-6-1 심화 ⓑ — 정육면체 겉넓이에서 한 면
  if (content.includes("겉넓이가") && content.includes("한 면의 넓이")) {
    const S = at(0);
    return S ? rat(S.n, 6) : null;
  }
  // 1-6-3 심화 — cm³ 부피와 m 단위 두 변에서 높이(m): 환산이 걸음이다
  if (content.includes("부피가") && content.includes("높이는 몇 m입니까")) {
    const [V, w, d] = [at(0), at(1), at(2)];
    return V && w && d ? rat(V.n, 1000000 * w.n * d.n) : null;
  }
  // 1-6-2 심화 ⓐ — 부피와 두 변에서 높이(cm)
  if (content.includes("부피가") && content.includes("높이는 몇 cm입니까")) {
    const [V, w, d] = [at(0), at(1), at(2)];
    return V && w && d ? rat(V.n, w.n * d.n) : null;
  }
  // 1-6-2 심화 ⓑ — 쌓기나무 층수 (첫 수는 모서리 1 cm)
  if (content.includes("쌓기나무")) {
    const [, count, w, d] = [at(0), at(1), at(2), at(3)];
    return count && w && d ? rat(count.n, w.n * d.n) : null;
  }
  // 1-6-1 응용 — 뚜껑 없는 상자의 다섯 면
  if (content.includes("뚜껑이 없는")) {
    const [w, d, h] = [at(0), at(1), at(2)];
    if (!w || !d || !h) return null;
    return rat(w.n * d.n + 2 * (d.n * h.n + h.n * w.n));
  }
  // 1-6-2 응용 — 두 변을 늘이면 부피는 곱의 배
  if (content.includes("몇 배가 됩니까")) {
    const [k1, k2] = [at(0), at(1)];
    return k1 && k2 ? rat(k1.n * k2.n) : null;
  }
  // 1-6-3 연산 — 환산 두 방향
  if (/m³는 몇 cm³/.test(content)) {
    const k = at(0);
    return k ? rat(k.n * 1000000) : null;
  }
  if (/cm³는 몇 m³/.test(content)) {
    const k = at(0);
    return k ? rat(k.n, 1000000) : null;
  }
  // 1-6-3 응용 — cm 로 준 변을 m 로 바꿔 부피(m³)
  if (content.includes("cm}") && content.includes("몇 m³")) {
    const [wCm, d, h] = [at(0), at(1), at(2)];
    return wCm && d && h ? rat(wCm.n * d.n * h.n, 100) : null;
  }
  // 겉넓이 — 정육면체(수 하나)면 6a², 직육면체(수 셋)면 2(wd+dh+hw)
  if (content.includes("겉넓이는 몇")) {
    if (ns.length === 1) return rat(6 * ns[0]!.n * ns[0]!.n);
    const [w, d, h] = [at(0), at(1), at(2)];
    if (!w || !d || !h) return null;
    return rat(2 * (w.n * d.n + d.n * h.n + h.n * w.n));
  }
  // 부피 — 정육면체(수 하나)면 a³, 직육면체(수 셋)면 wdh
  if (content.includes("부피는 몇")) {
    if (ns.length === 1) return rat(ns[0]!.n ** 3);
    const [w, d, h] = [at(0), at(1), at(2)];
    return w && d && h ? rat(w.n * d.n * h.n) : null;
  }
  return null;
}

describe("[초6 갈래] 1-6 직육면체의 겉넓이와 부피", () => {
  it("소단원 셋이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_16_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 공식·환산을 직접 든다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_16_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const want = truthOf16(p.content);
          if (!want) {
            bad.push(
              `${code} ${tier} seed=${seed}: 발문을 못 읽음 — ${p.content.replace(/\n+/g, " ")}`,
            );
            continue;
          }
          checked += 1;
          const got = readMixedAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${code} ${tier} seed=${seed}: 답 ${p.answer} (${rshow(want)} 이어야) — ${p.content.replace(/\n+/g, " ")}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_16_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("단위 표기가 묻는 것과 맞는다 — 넓이는 cm², 부피는 cm³·m³", () => {
    const bad: string[] = [];
    for (const code of G6_16_CODES) {
      const unit = unitOf(code);
      for (const tier of ["연산", "기본"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          if (code === "1-6-1" && !p.content.includes("cm²")) {
            bad.push(`${where}: 겉넓이인데 cm² 가 없다 — ${p.content}`);
          }
          if (code === "1-6-2" && !p.content.includes("cm³")) {
            bad.push(`${where}: 부피인데 cm³ 가 없다 — ${p.content}`);
          }
          if (code === "1-6-3" && !/[cm ]m³/.test(p.content)) {
            bad.push(`${where}: m³ 가 없다 — ${p.content}`);
          }
          // 넓이 발문에 부피 단위가, 부피 발문에 넓이 단위가 섞이면 안 된다.
          if (code === "1-6-1" && p.content.includes("cm³")) {
            bad.push(`${where}: 겉넓이인데 cm³ — ${p.content}`);
          }
          if (code !== "1-6-1" && p.content.includes("cm²")) {
            bad.push(`${where}: 부피인데 cm² — ${p.content}`);
          }
        }
      }
      // 1-6-3 응용은 단위 혼합이 알맹이다 — cm 변과 m³ 물음이 같이 있어야 한다.
      for (const seed of SEEDS) {
        const apply = generateElementaryProblem(unit, seed, "응용");
        if (code === "1-6-3") {
          expect(
            apply.content.includes("cm}") && apply.content.includes("몇 m³"),
            `1-6-3 응용 seed=${seed}: 단위 혼합이 없다 — ${apply.content}`,
          ).toBe(true);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("연산 문형이 서고, 기본은 그 문형이 아니며, 심화만 되짚는다", () => {
    const CALC_SHAPE: Record<string, RegExp> = {
      "1-6-1": /^가로가 .+ 높이가 .+ 겉넓이는 몇 cm²입니까\?$/,
      "1-6-2": /^가로가 .+ 높이가 .+ 부피는 몇 cm³입니까\?$/,
      "1-6-3": /^\$\d+\$ (?:m|cm)³는 몇/,
    };
    const DEEP = /겉넓이가|부피가|쌓기나무/;
    for (const code of G6_16_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        const apply = generateElementaryProblem(unit, seed, "응용");
        const deep = generateElementaryProblem(unit, seed, "심화하");
        expect(
          CALC_SHAPE[code]!.test(calc.content.replace(/\n+/g, " ")),
          `${code} 연산 seed=${seed}: ${calc.content}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(basic.content.replace(/\n+/g, " ")),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${basic.content}`,
        ).toBe(false);
        expect(
          DEEP.test(deep.content),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        expect(
          DEEP.test(apply.content),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_16_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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
    for (const code of G6_16_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
            if (field.includes("\\frac"))
              bad.push(`${where} ${name}: 분수가 섞였다`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

// ══════════ 7차분 — 2-1 분수의 나눗셈 ══════════
//
// ⑴ 답 분수는 기약·대분수 정본 꼴 — 시험이 gcd 로 독립 검산한다(엔진의 fmtFrac 을 안 믿는다).
// ⑵ 「분모가 같은/다른」 소단원 조건을 시험에도 미러한다 — 판정기 loose 가 없는 축이라
//    발문에 분수 둘이 실제로 보여야 하고, 그 분모 관계가 이름 그대로여야 한다.
// ⑶ 2-1-4 는 답이 식인 갈래가 있다 — 값이 아니라 **뒤 분수가 뒤집혔는가**(구조)로 검산한다.

const G6_21_CODES = ["2-1-1", "2-1-2", "2-1-3", "2-1-4", "2-1-5"] as const;

/** 발문·정답의 `\frac{a}{b}` 짝 전부(대분수의 분수 부분 포함). */
function fracPairsIn(text: string): [number, number][] {
  return [...text.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

/** 발문이 말하는 값을 유리수로 다시 만든다 — 못 읽으면 null(위반). */
function truthOf21(content: string): R | null {
  const ns = numbersIn(content);
  const at = (i: number) => ns[i] ?? null;
  // ══ 확대 갈래 (4차분 · 물결 4) — **소단원 약속이 창을 공짜로 준다** ══
  //
  // ⚠️ 순서가 뜻이다. 아래 심화하 판독기(「알맞은 수」)가 먼저 물면 엉뚱한 식을 읽는다.
  // 시험이 후보를 **다시 만들어** 하나로 굳는지까지 여기서 잰다.
  {
    const denOf = (c: string) => {
      const m = c.match(/\\frac\{\\square\}\{(\d+)\}/);
      return m ? Number(m[1]) : null;
    };
    const divTopOf = (c: string) => {
      const m = c.match(/\\div\\frac\{(\d+)\}\{\d+\}/);
      return m ? Number(m[1]) : null;
    };
    // 2-1-5 심화중 — 대분수의 진분수부. 「가분수 분자가 $a$ 의 배수」인 $\square$ 하나.
    if (
      content.includes("의 몫이 자연수입니다") &&
      /\d\\frac\{\\square\}/.test(content)
    ) {
      const w = Number(content.match(/\$(\d+)\\frac\{\\square\}/)?.[1] ?? NaN);
      const d = denOf(content);
      const a = divTopOf(content);
      if (!Number.isFinite(w) || d === null || a === null) return null;
      const hit: number[] = [];
      for (let s = 1; s < d; s += 1) if ((w * d + s) % a === 0) hit.push(s);
      return hit.length === 1 ? rat(hit[0]!) : null;
    }
    // 2-1-1 심화상 — 「분자가 몫보다 $k$ 만큼 크다」. 후보를 만들어 차를 견준다.
    if (content.includes("그 몫보다") && content.includes("만큼 클 때")) {
      const d = denOf(content);
      const a = divTopOf(content);
      const k = Number(content.match(/그 몫보다 \$(\d+)\$만큼/)?.[1] ?? NaN);
      if (d === null || a === null || !Number.isFinite(k)) return null;
      const hit: number[] = [];
      for (let m = 1; m * a < d; m += 1) if (m * a - m === k) hit.push(m * a);
      return hit.length === 1 ? rat(hit[0]!) : null;
    }
  }

  // 2-1-4 심화 ⓐ — 역수 관계를 되짚는다
  if (content.includes("어떤 분수")) {
    const f = at(0);
    return f ? rdiv(rat(1), f) : null;
  }
  // 2-1-1·5 심화 — 곱을 나눗셈으로 되돌린다: [곱한 수, 결과]
  if (content.includes("곱했더니") && content.includes("어떤 수는")) {
    const [b, a] = [at(0), at(1)];
    return b && a ? rdiv(a, b) : null;
  }
  // 2-1-2·3 심화 ⓐ — 나눈 몫에서 되짚는다: [나누는 수, 몫]
  if (content.includes("나누었더니") && content.includes("어떤 수는")) {
    const [x, q] = [at(0), at(1)];
    return x && q ? rmul(q, x) : null;
  }
  // 2-1-3 심화 ⓑ — `\square` 가 나누어지는 수다
  if (content.includes("알맞은 수")) {
    const m = content.match(/\\square\\div\\frac\{(\d+)\}\{(\d+)\}=(\d+)/);
    return m ? rmul(rat(Number(m[3])), rat(Number(m[1]), Number(m[2]))) : null;
  }
  // 2-1-1·3 응용 — 쓰고 남은 양을 나눈다
  if (content.includes("중에서") && content.includes("남은")) {
    const [a, u, b] = [at(0), at(1), at(2)];
    return a && u && b ? rdiv(rsub(a, u), b) : null;
  }
  // 응용 2-1-4 — 한 개 몫이 먼저, 전체가 뒤에 온다: (전체)÷(한 개 몫)
  if (content.includes("만드는 데")) {
    const [per, total] = [at(0), at(1)];
    return per && total ? rdiv(total, per) : null;
  }
  // 넓이 결합 — (세로·높이)=(넓이)÷(가로·밑변)
  if (content.includes("넓이가")) {
    const [area, base] = [at(0), at(1)];
    return area && base ? rdiv(area, base) : null;
  }
  // 기본 — 몇 배·몇 도막·몇 봉지 · 연산 — 식 그대로 (두 수를 나눈다)
  const [a, b] = [at(0), at(1)];
  if (!a || !b || ns.length > 2) return null;
  return rdiv(a, b);
}

describe("[초6 갈래] 2-1 분수의 나눗셈", () => {
  it("소단원 다섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_21_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (식 답은 «뒤집혔는가» 구조로 본다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_21_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          // 답이 곱셈식 — 발문 나눗셈식의 나누는 수가 뒤집혀 곱해져야 한다.
          const mulAns = p.answer.match(
            /^\$\\frac\{(\d+)\}\{(\d+)\}\\times\\frac\{(\d+)\}\{(\d+)\}\$$/,
          );
          if (mulAns) {
            const src = p.content.match(
              /\\frac\{(\d+)\}\{(\d+)\}\\div\\frac\{(\d+)\}\{(\d+)\}/,
            );
            checked += 1;
            if (
              !src ||
              mulAns[1] !== src[1] ||
              mulAns[2] !== src[2] ||
              mulAns[3] !== src[4] ||
              mulAns[4] !== src[3]
            ) {
              bad.push(`${where}: 뒤집기가 틀렸다 — ${p.answer} ← ${flat}`);
            }
            continue;
          }
          // 답이 나눗셈식 — 발문 곱셈식의 곱한 수를 되돌린 나눗셈이어야 한다.
          const divAns = p.answer.match(
            /^\$\\frac\{(\d+)\}\{(\d+)\}\\div\\frac\{(\d+)\}\{(\d+)\}\$$/,
          );
          if (divAns) {
            const src = p.content.match(
              /\\frac\{(\d+)\}\{(\d+)\}\\times\\frac\{(\d+)\}\{(\d+)\}/,
            );
            checked += 1;
            if (
              !src ||
              divAns[1] !== src[1] ||
              divAns[2] !== src[2] ||
              divAns[3] !== src[4] ||
              divAns[4] !== src[3]
            ) {
              bad.push(`${where}: 되돌리기가 틀렸다 — ${p.answer} ← ${flat}`);
            }
            continue;
          }
          const want = truthOf21(p.content);
          if (!want) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          checked += 1;
          const got = readAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${where}: 답 ${p.answer} (${rshow(want)} 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_21_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("답·발문 분수는 기약이고 대분수는 정본 꼴이다 (시험이 gcd 로 직접 잰다)", () => {
    const bad: string[] = [];
    for (const code of G6_21_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          // 해설은 통분·가분수 전개 과정을 보여야 하므로 뺀다(1-1 선례).
          for (const [name, field] of [
            ["발문", p.content],
            ["정답", p.answer],
          ] as const) {
            for (const [n, d] of fracPairsIn(field)) {
              if (gcd(n, d) !== 1) {
                bad.push(`${where} ${name}: 약분이 남았다 \\frac{${n}}{${d}}`);
              }
              // 분모 1 은 분수로 적지 않는다 — 역수가 \frac{6}{1} 로 선 실측 결함의 잠금.
              if (d === 1) {
                bad.push(`${where} ${name}: 분모 1 — \\frac{${n}}{${d}}`);
              }
            }
            // 대분수 정본 꼴 — 분수 부분이 진분수·기약이어야 한다.
            for (const m of field.matchAll(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/g)) {
              const [t, d] = [Number(m[2]), Number(m[3])];
              if (t >= d || gcd(t, d) !== 1) {
                bad.push(`${where} ${name}: 대분수 꼴이 틀렸다 ${m[0]}`);
              }
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("소단원 이름의 분모·피연산자 조건을 갈래 넷이 지면에서 지킨다", () => {
    const bad: string[] = [];
    // 🔴 **대표 하나로 돌면 안 된다** (2026-09-01, 물결 4). 예전에는 2-1-1 의 갈래로
    //    넷을 다 돌렸는데, 확대 갈래는 **소단원마다 있을 수도 없을 수도** 있어서
    //    2-1-1 만 채우는 순간 2-1-2 에서 `generateElementaryProblem` 이 **던진다**
    //    (`helpers/elemTiers.ts` 머리말이 「그건 결함이 아니라 설계다 — 루프를
    //     소단원마다 쪼개라」고 적어 둔 그 자리다). 그래서 **그 소단원이 실제로 내는
    //    갈래**만 돈다. 검사 내용은 그대로다.
    // ⚠️ 분모 세기는 `\frac{\square}{d}` 도 **한 분수로** 센다. 확대 갈래는 분자를
    //    감추므로(4차분) 숫자 분수만 세면 「분모가 하나뿐」이 되어 거짓 빨강이 난다 —
    //    그런데 그 발문의 분모 관계는 지면에 **그대로 보인다**.
    const densIn = (c: string): number[] => [
      ...fracPairsIn(c).map(([, d]) => d),
      ...[...c.matchAll(/\\frac\{\\square\}\{(\d+)\}/g)].map((m) =>
        Number(m[1]),
      ),
    ];
    const each = (code: string, run: (c: string, tier: ElemTier) => void) => {
      for (const tier of tiersOf(unitOf(code)))
        for (const seed of SEEDS)
          run(
            generateElementaryProblem(unitOf(code), seed, tier).content,
            tier,
          );
    };
    // 2-1-1 «분모가 같은» — 발문 분수가 둘 이상이고 분모가 전부 같다.
    each("2-1-1", (c, tier) => {
      const d = densIn(c);
      if (d.length < 2 || d.some((v) => v !== d[0]))
        bad.push(`2-1-1 ${tier}: 분모가 어긋났다 — ${c}`);
    });
    // 2-1-2 «분모가 다른» — 서로 다른 분모가 둘 이상.
    each("2-1-2", (c, tier) => {
      const d = densIn(c);
      if (d.length < 2 || new Set(d).size < 2)
        bad.push(`2-1-2 ${tier}: 분모가 전부 같다 — ${c}`);
    });
    // 2-1-3 «(자연수)÷(분수)» — 자연수와 분수가 함께 보인다(□·어떤 수 포함).
    each("2-1-3", (c, tier) => {
      const ns = numbersIn(c);
      const hasNat =
        ns.some((v) => v.d === 1) ||
        c.includes("\\square") ||
        c.includes("어떤 수");
      if (!hasNat || !ns.some((v) => v.d > 1))
        bad.push(`2-1-3 ${tier}: 자연수·분수 짝이 없다 — ${c}`);
    });
    // 2-1-5 «(가분수), (대분수)» — 어느 한쪽은 지면에 선다.
    each("2-1-5", (c, tier) => {
      const hasMixed = /\d+\\frac\{/.test(c);
      const hasImproper = fracPairsIn(c).some(([n, d]) => n >= d);
      if (!hasMixed && !hasImproper)
        bad.push(`2-1-5 ${tier}: 가분수도 대분수도 없다 — ${c}`);
    });
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("연산 문형이 서고, 기본은 그 문형이 아니며, 심화만 되짚는다", () => {
    const CALC_SHAPE: Record<string, RegExp> = {
      "2-1-1": /^다음 나눗셈의 몫을 구하시오/,
      "2-1-2": /^다음 나눗셈의 몫을 구하시오/,
      "2-1-3": /^다음 나눗셈의 몫을 구하시오/,
      "2-1-4": /[을를] 곱셈식으로 나타내시오\.$/,
      "2-1-5": /^다음 나눗셈의 몫을 구하시오/,
    };
    const DEEP = /어떤 수|알맞은 수|어떤 분수|나눗셈식을 쓰시오/;
    for (const code of G6_21_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        const apply = generateElementaryProblem(unit, seed, "응용");
        const deep = generateElementaryProblem(unit, seed, "심화하");
        expect(
          CALC_SHAPE[code]!.test(calc.content),
          `${code} 연산 seed=${seed}: ${calc.content}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(basic.content),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${basic.content}`,
        ).toBe(false);
        expect(
          DEEP.test(deep.content),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        expect(
          DEEP.test(apply.content),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_21_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·소수 없음", () => {
    const bad: string[] = [];
    for (const code of G6_21_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
            // 이 대단원에 소수가 나오면 종류가 샌 것이다(2-2 와 섞였다).
            if (/\d+\.\d+/.test(field))
              bad.push(`${where} ${name}: 소수가 섞였다`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

// ══════════ 8차분 — 2-2 소수의 나눗셈 ══════════
//
// ⑴ 소수는 ×10/×100 정수로 다시 세어 검산한다 — 시험도 부동소수점을 안 쓴다.
// ⑵ 2-2-5 는 **몫이 자연수·나머지가 나누어지는 수와 같은 소수 자리**여야 한다(초등 규약).
//    값만 맞고 자리가 틀리면 뜻이 달라지므로 **자리까지** 대조한다.
// ⑶ 2-2-4 는 판정기 검사(몫이 그 자리에서 딱 떨어지면 위반)와 **같은 조건을 시험도** 잰다 —
//    엔진이 그 검사에 스스로 걸리지 않는지 여기서 먼저 빨개진다.

const G6_22_CODES = ["2-2-1", "2-2-2", "2-2-3", "2-2-4", "2-2-5"] as const;

/** `12.34` → {scaled: 1234, dp: 2}. 글자로 세므로 `7.0` 도 dp=1 로 잡힌다. */
function scaledOf(tok: string): { scaled: number; dp: number } | null {
  const m = tok.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  return { scaled: Number(`${m[1]}${frac}`), dp: frac.length };
}

/** 발문의 `$...$` 안 수를 «자릿수까지» 뽑는다. */
function scaledNumsIn(text: string): { scaled: number; dp: number }[] {
  const out: { scaled: number; dp: number }[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!|\\%/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .replace(/\\div|\\times|\\square|\\ldots|=/g, " ")
      .trim();
    for (const piece of tok.split(/\s+/)) {
      const v = scaledOf(piece);
      if (v) out.push(v);
    }
  }
  return out;
}

/** 유리수로 옮긴다 — 10^dp 를 분모로 두므로 부동소수점을 안 거친다. */
const asRat = (v: { scaled: number; dp: number }) => rat(v.scaled, 10 ** v.dp);

/** 발문이 말하는 값의 참 — 못 읽으면 null(위반). */
function truthOf22(content: string): R | null {
  const ns = scaledNumsIn(content).map(asRat);
  const at = (i: number) => ns[i] ?? null;

  // 심화 2-2-2·3 — `\square` 가 나누어지는 수 / 나누는 수
  if (content.includes("알맞은 수")) {
    const asDividend = content.match(
      /\\square\\div(\d+(?:\.\d+)?)=(\d+(?:\.\d+)?)/,
    );
    if (asDividend) {
      return rmul(
        asRat(scaledOf(asDividend[1]!)!),
        asRat(scaledOf(asDividend[2]!)!),
      );
    }
    const asDivisor = content.match(
      /(\d+(?:\.\d+)?)\\div\\square=(\d+(?:\.\d+)?)/,
    );
    if (asDivisor) {
      return rdiv(
        asRat(scaledOf(asDivisor[1]!)!),
        asRat(scaledOf(asDivisor[2]!)!),
      );
    }
    return null;
  }
  // 심화 2-2-1 — 곱을 나눗셈으로 되돌린다: [곱한 수, 결과]
  if (content.includes("곱했더니")) {
    const [b, a] = [at(0), at(1)];
    return b && a ? rdiv(a, b) : null;
  }
  // 2-2-5 심화 — 몫과 남는 수에서 처음 양을 되짚는다: [1인분, 사람 수, 남는 수]
  if (content.includes("처음에 있던")) {
    const [per, people, rem] = [at(0), at(1), at(2)];
    return per && people && rem
      ? rat(per.n * people.n * rem.d + rem.n, rem.d)
      : null;
  }
  // 2-2-5 응용 — 한 사람 몫을 채우는 데 모자란 양: [전체, 1인분]
  if (content.includes("더 필요합니까")) {
    const [total, per] = [at(0), at(1)];
    if (!total || !per) return null;
    const q = Math.floor((total.n * per.d) / (total.d * per.n) + 1e-9);
    const remN = total.n * per.d - q * per.n * total.d; // 분모 total.d*per.d
    return rsub(per, rat(remN, total.d * per.d));
  }
  // 응용 2-2-1·2·3 — 쓰고 남은 양을 나눈다: [전체, 쓴 양, 1인분]
  if (content.includes("중에서") || content.includes("사서")) {
    const [total, used, per] = [at(0), at(1), at(2)];
    return total && used && per ? rdiv(rsub(total, used), per) : null;
  }
  // 기본·연산 — 두 수를 그대로 나눈다
  const [a, b] = [at(0), at(1)];
  if (!a || !b || ns.length > 2) return null;
  return rdiv(a, b);
}

describe("[초6 갈래] 2-2 소수의 나눗셈", () => {
  it("소단원 다섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_22_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 ×10 정수로 다시 계산)", () => {
    const bad: string[] = [];
    let checked = 0;
    let skippedTop = 0;
    for (const code of G6_22_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          // 2-2-4 는 답이 «반올림한 값»이라 값 검산을 따로 한다(아래 전용 검사).
          if (code === "2-2-4") continue;
          // 🔴 **확대 갈래(D-113)는 이 자가 구조적으로 못 잰다.** 새 잣대(되짚기 축,
          //    2026-08-30 확정)의 답은 「$A$ 의 배수 중 범위 안에 든 것」·「반올림 구간의
          //    자연수」처럼 **발문의 두 수를 한 번 계산해서 나오는 값이 아니다** — 그게
          //    바로 그 갈래의 정의다(반증 ⑥). 이 자는 「앞 수 ÷ 뒤 수」류만 읽는다.
          //    조용히 건너뛰면 그 갈래가 통째로 가드 밖이 되므로 **건너뛴 수를 세어 못 박고**,
          //    실제 판정은 `elemTiersG6Deep.test.ts` 가 **되짚기를 다시 밟아서** 한다.
          if (tier === "심화중" || tier === "심화상") {
            skippedTop += 1;
            continue;
          }
          // 2-2-5 의 몫·나머지 쌍도 전용 검사가 본다.
          if (/몫과 남는 수|몇 명에게 나누어 줄 수 있고/.test(p.content)) {
            continue;
          }
          const want = truthOf22(p.content);
          if (!want) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          checked += 1;
          const got = readMixedAnswer(p.answer);
          if (!req(want, got)) {
            bad.push(
              `${where}: 답 ${p.answer} (${rshow(want)} 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 건너뛴 심화상도 **세어서** 못 박는다 — 「몇 건을 이 자가 안 봤나」가 안 보이면
    // 나중에 갈래가 하나 빠져도 분모만 조용히 줄어든다(D-113).
    expect(skippedTop).toBe(
      G6_22_CODES.filter((c) => c !== "2-2-4")
        .flatMap((c) => tiersOf(unitOf(c)))
        .filter((t) => t === "심화중" || t === "심화상").length * SEEDS.length,
    );
    // 2-2-4 전량과 2-2-5 의 몫·나머지 갈래(연산·기본 32)는 전용 검사 몫이다.
    // 32 는 «연산·기본 두 핵심 갈래 × 16 시드» 고정값이다 — 축이 늘어나도 몫·나머지
    // 문형은 그 둘에서만 나므로 tiersOf 로 다시 셀 값이 아니다.
    expect(checked).toBe(
      G6_22_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length -
        tiersOf(unitOf("2-2-4")).length * SEEDS.length -
        32 -
        skippedTop,
    );
  });

  it("2-2-4 는 반올림이 뜻을 가진다 — 그 자리에서 딱 떨어지지 않고, 값도 맞다", () => {
    const bad: string[] = [];
    let skippedExt = 0;
    const unit = unitOf("2-2-4");
    for (const tier of tiersOf(unit)) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        const where = `2-2-4 ${tier} seed=${seed}`;
        // 🔴 **확대 갈래(D-113)는 여기서 안 잰다.** 새 잣대(되짚기 축)의 2-2-4 는
        //    「$\square\div b$ 의 몫을 반올림하면 $r$」처럼 **나누어지는 수가 미지수**라
        //    아래 「앞 수 ÷ 뒤 수」 읽기가 구조적으로 못 읽는다 — 그게 그 갈래의 정의다.
        //    조용히 넘기지 않고 **건너뛴 수를 세어 못 박는다**. 값·구간·반올림 뜻은
        //    `elemTiersG6Deep.test.ts` 가 **구간을 다시 지어** 잰다.
        if (tier === "심화중" || tier === "심화상") {
          skippedExt += 1;
          continue;
        }
        // 문장형 갈래(기본·응용)는 발문에 식이 없다 — 그때는 «앞 수 ÷ 뒤 수»로 읽는다.
        const m = p.content.match(/\$(\d+)\\div(\d+)\$/);
        const nums = scaledNumsIn(p.content);
        if (!m && (nums.length < 2 || nums.some((v) => v.dp !== 0))) {
          bad.push(`${where}: 나눗셈의 두 수를 못 읽음 — ${p.content}`);
          continue;
        }
        const [a, b] = m
          ? [Number(m[1]), Number(m[2])]
          : [nums[0]!.scaled, nums[1]!.scaled];
        const place = /둘째 자리까지/.test(p.content) ? 2 : 1;
        // ⑴ 반올림이 뜻을 가지는가 — 요구 자리에서 딱 떨어지면 판정기가 위반으로 본다.
        if ((a * 10 ** place) % b === 0) {
          bad.push(
            `${where}: 몫이 소수 ${place}자리에서 딱 떨어진다 — ${p.content}`,
          );
        }
        // ⑴-b 해설이 «한 자리 더 보이고 `\ldots`» 라고 적는다 — 거기서 끝나면 그 말이 거짓이다.
        //
        // ⚠️ ⑴ 만으로는 이 자리를 **못 본다**(두 조건은 다른 자리를 잰다). 변이
        // 「반올림 뜻 훼손」이 구성에서 이 필터만 빼자 시험이 **초록**이었다 — 사각지대였다.
        if (
          p.solution.includes("\\ldots") &&
          (a * 10 ** (place + 1)) % b === 0
        ) {
          bad.push(
            `${where}: 몫이 소수 ${place + 1}자리에서 끝나는데 해설이 \\ldots 라 적는다 — ${p.solution}`,
          );
        }
        // ⑵ 값 — 시험이 정수 나눗셈으로 반올림을 다시 짓는다(부동소수 없음).
        const scale = a * 10 ** place;
        const cut = Math.floor(scale / b) + ((scale % b) * 2 >= b ? 1 : 0);
        // 심화는 두 자리의 «차»를 묻는다 — 그 갈래만 따로 짓는다.
        if (/차를 구하시오/.test(p.content)) {
          const s2 = a * 100;
          const cut2 = Math.floor(s2 / b) + ((s2 % b) * 2 >= b ? 1 : 0);
          const c1 =
            Math.floor((a * 10) / b) + (((a * 10) % b) * 2 >= b ? 1 : 0);
          const want = rat(Math.abs(cut2 - c1 * 10), 100);
          if (!req(want, readMixedAnswer(p.answer))) {
            bad.push(`${where}: 차 ${p.answer} (${rshow(want)} 이어야)`);
          }
          continue;
        }
        const want = rat(cut, 10 ** place);
        if (!req(want, readMixedAnswer(p.answer))) {
          bad.push(
            `${where}: 답 ${p.answer} (${rshow(want)} 이어야) — ${p.content}`,
          );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모를 같이 못 박는다 — 「몇 건을 이 자가 안 봤나」가 안 보이면 갈래가 하나
    // 빠져도 조용히 줄어든다(D-113).
    expect(skippedExt).toBe(
      tiersOf(unit).filter((t) => t === "심화중" || t === "심화상").length *
        SEEDS.length,
    );
  });

  it("2-2-5 는 몫이 자연수이고 남는 수는 나누어지는 수와 같은 소수 자리다", () => {
    const bad: string[] = [];
    const unit = unitOf("2-2-5");
    for (const tier of tiersOf(unit)) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        const where = `2-2-5 ${tier} seed=${seed}`;
        const nums = scaledNumsIn(p.content);
        // 🔴 **답의 «모양»만 보면 다른 문항을 몫·나머지로 읽는다.** 아래 정규식은
        //    「$6$, $9$」처럼 쉼표로 이어진 두 값에도 걸리는데, 2-2-5 심화상(D-113)의
        //    답이 정확히 그 모양이다(실측으로 거짓 빨강이 났다). **무엇을 묻는가는
        //    발문에서** 봐야 한다 — 답 모양은 그 다음이다.
        if (!/몫과 남는 수|몇 명에게 나누어 줄 수 있고/.test(p.content))
          continue;
        // 몫·나머지를 함께 답하는 갈래만 이 규약을 잰다.
        const pair = p.answer.match(
          /^(?:몫 )?\$(\d+)\$(?:명)?, (?:남는 수 )?\$(\d+(?:\.\d+)?)\$/,
        );
        if (!pair) continue;
        const total = nums[0]!;
        const per = nums[1]!;
        const q = Number(pair[1]);
        const rem = scaledOf(pair[2]!)!;
        // ⑴ 몫은 자연수 — 문자열에 소수점이 없어야 한다.
        if (!/^\d+$/.test(pair[1]!)) {
          bad.push(`${where}: 몫이 자연수가 아니다 — ${p.answer}`);
        }
        // ⑵ 남는 수의 소수 자리 = 나누어지는 수의 소수 자리 (초등 규약)
        if (rem.dp !== total.dp) {
          bad.push(
            `${where}: 남는 수 자리 ${rem.dp} ≠ 나누어지는 수 자리 ${total.dp} — ${p.answer}`,
          );
        }
        // ⑶ 값 — 전체 = 1인분 × 몫 + 남는 수, 그리고 남는 수 < 1인분
        const lhs = total.scaled;
        const rhs = per.scaled * 10 ** (total.dp - per.dp) * q + rem.scaled;
        if (lhs !== rhs) {
          bad.push(`${where}: ${lhs} ≠ ${rhs} — ${p.content} / ${p.answer}`);
        }
        if (rem.scaled >= per.scaled * 10 ** (total.dp - per.dp)) {
          bad.push(`${where}: 남는 수가 1인분보다 크다 — ${p.answer}`);
        }
        if (rem.scaled === 0) {
          bad.push(`${where}: 남는 수가 0 — «남는 양»이 뜻을 잃는다`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("소단원이 약속한 종류·자릿수가 **지면에** 선다 (□ 뒤에 숨지 않는다)", () => {
    // 값 검산은 이 축을 구조적으로 못 본다 — 답은 늘 옳기 때문이다. 판정기도 □ 를
    // 와일드카드로 세므로 통과시킨다. 그런데 학생은 지면만 본다: 조건이 되는 종류가
    // □ 뒤에 숨으면 그 문항은 그 소단원이 아니다(2-2-2·2-2-3 심화가 실측으로 걸렸다).
    const bad: string[] = [];
    // 이 자리는 code 를 셋 동시에 다룬다(아래 at()) — 대표로 2-2-1 의 갈래를 돈다.
    // 이 그룹은 같은 회차에 같이 채워지므로 지금은 갈래 집합이 같다.
    for (const tier of tiersOf(unitOf("2-2-1"))) {
      for (const seed of SEEDS) {
        const at = (code: string) =>
          generateElementaryProblem(unitOf(code), seed, tier).content;
        const dpsOf = (c: string) =>
          scaledNumsIn(c)
            .filter((v) => v.dp > 0)
            .map((v) => v.dp);
        // 2-2-1 — 소수 둘 이상이 보이고 자릿수가 전부 같다.
        const d1 = dpsOf(at("2-2-1"));
        if (d1.length < 2 || d1.some((d) => d !== d1[0])) {
          bad.push(
            `2-2-1 ${tier} seed=${seed}: 같은 자릿수 소수 둘이 안 보인다`,
          );
        }
        // 2-2-2 — 소수 둘 이상이 보이고 **자릿수가 다른** 것이 있다.
        const d2 = dpsOf(at("2-2-2"));
        if (d2.length < 2 || new Set(d2).size < 2) {
          bad.push(
            `2-2-2 ${tier} seed=${seed}: 자릿수가 다른 소수가 안 보인다`,
          );
        }
        // 2-2-3 — 자연수와 소수가 **둘 다** 보인다.
        const c3 = at("2-2-3");
        const n3 = scaledNumsIn(c3);
        if (!n3.some((v) => v.dp === 0) || !n3.some((v) => v.dp > 0)) {
          bad.push(
            `2-2-3 ${tier} seed=${seed}: 자연수·소수 짝이 안 보인다 — ${c3}`,
          );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("순서를 주장하는 낱말은 값의 순서와 맞는다 — 씨앗 0~1999 전수", () => {
    // ⚠️ **씨앗 16개로는 구조적으로 안 보이는 부류다.** 리드 검수가 씨앗 0~1999 에서
    // 7건(0.35%)을 찾았다 — 「긴 막대가 $11$ cm, 짧은 막대가 $13$ cm」. 값·판정기·
    // 시험·변이가 전부 통과한다(값은 옳고 **낱말만** 거짓말한다). 그래서 이 잠금만은
    // 표본이 아니라 **전수**로 쓴다.
    //
    // 낱말 목록은 손이라 샌다 — 그래서 엔진의 `ordered` 표시를 안 보고 **지면의 낱말**로
    // 잰다. 새 순서 낱말이 들어오면 여기 추가해야 하지만, 최소한 지금 쓰는 것은 잠긴다.
    const ORDERED_WORDS: [RegExp, RegExp][] = [
      [/긴 /, /짧은 /],
      [/무거운 /, /가벼운 /],
      [/많은 /, /적은 /],
      [/큰 /, /작은 /],
    ];
    const bad: string[] = [];
    const unit = unitOf("2-2-4");
    for (const tier of tiersOf(unit)) {
      for (let seed = 0; seed < 2000; seed += 1) {
        const p = generateElementaryProblem(unit, seed, tier);
        const hit = ORDERED_WORDS.find(
          ([big, small]) => big.test(p.content) && small.test(p.content),
        );
        if (!hit) continue;
        const nums = scaledNumsIn(p.content);
        if (nums.length < 2) {
          bad.push(
            `2-2-4 ${tier} seed=${seed}: 두 수를 못 읽음 — ${p.content}`,
          );
          continue;
        }
        // 앞에 적힌 것이 «큰 쪽»을 주장하는 낱말이므로 값도 앞이 커야 한다.
        if (nums[0]!.scaled <= nums[1]!.scaled) {
          bad.push(
            `2-2-4 ${tier} seed=${seed}: 낱말과 값이 어긋난다 — ${p.content}`,
          );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("연산 문형이 서고, 기본은 그 문형이 아니며, 심화만 되짚는다", () => {
    const CALC_SHAPE: Record<string, RegExp> = {
      "2-2-1": /^다음 나눗셈의 몫을 구하시오/,
      "2-2-2": /^다음 나눗셈의 몫을 구하시오/,
      "2-2-3": /^다음 나눗셈의 몫을 구하시오/,
      "2-2-4": /^다음 나눗셈의 몫을 반올림하여/,
      "2-2-5": /몫과 남는 수를 구하시오\.$/,
    };
    const DEEP = /어떤 수|알맞은 수|처음에 있던|차를 구하시오/;
    for (const code of G6_22_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const calc = generateElementaryProblem(unit, seed, "연산");
        const basic = generateElementaryProblem(unit, seed, "기본");
        const apply = generateElementaryProblem(unit, seed, "응용");
        const deep = generateElementaryProblem(unit, seed, "심화하");
        expect(
          CALC_SHAPE[code]!.test(calc.content),
          `${code} 연산 seed=${seed}: ${calc.content}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(basic.content),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${basic.content}`,
        ).toBe(false);
        expect(
          DEEP.test(deep.content),
          `${code} 심화 seed=${seed}: 역산 표지가 없다 — ${deep.content}`,
        ).toBe(true);
        expect(
          DEEP.test(apply.content),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${apply.content}`,
        ).toBe(false);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_22_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·꼬리 0·분수 없음", () => {
    const bad: string[] = [];
    for (const code of G6_22_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
            // 초등 지면은 «7.0» 을 안 쓴다.
            const trailing = field.match(/\d+\.\d*0(?![\d])/g);
            if (trailing)
              bad.push(`${where} ${name}: 꼬리 0 — ${trailing.join(",")}`);
            // 이 대단원에 분수가 나오면 2-1 과 종류가 섞인 것이다.
            if (field.includes("\\frac"))
              bad.push(`${where} ${name}: 분수가 섞였다`);
            const runaway = field.match(/\d+\.\d{4,}/g);
            if (runaway) bad.push(`${where} ${name}: 샌 소수 ${runaway[0]}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 초6 2-4 비례식과 비례배분 (5소단원 · 20갈래)
//
// 이 대단원의 답은 **자리가 뜻이다** — `$3:4$` 와 `$4:3$` 은 다른 답이다.
// 그런데 값 검산이 흔히 쓰는 잣대(두 항의 곱·합, 약분한 비율)는 그 둘을 **구조적으로
// 못 가른다**. 그래서 이 블록은 답을 «순서 있는 수의 나열»로 읽어 **자리마다** 견준다.
// ══════════════════════════════════════════════════════════════════════════

const G6_24_CODES = ["2-4-1", "2-4-2", "2-4-3", "2-4-4", "2-4-5"] as const;

/** 답을 «모양 + 순서 있는 수의 나열»로. 모양(비·비례식·쌍·수)도 답의 일부다. */
function readOrdered(
  answer: string,
): { shape: string; terms: number[] } | null {
  const inner = answer.match(/^\$(.+)\$$/)?.[1];
  if (inner === undefined) return null;
  if (/^\d+:\d+=\d+:\d+$/.test(inner))
    return { shape: "비례식", terms: inner.split(/[:=]/).map(Number) };
  if (/^\d+(?::\d+)+$/.test(inner))
    return { shape: "비", terms: inner.split(":").map(Number) };
  if (/^\d+,\\ \d+$/.test(inner))
    return { shape: "쌍", terms: inner.split(/,\\ /).map(Number) };
  if (/^\d+$/.test(inner)) return { shape: "수", terms: [Number(inner)] };
  return null;
}

/** 두 유리수의 비를 서로소인 자연수 쌍으로. */
function reduceRatio(p: R, q: R): [number, number] {
  const A = p.n * q.d;
  const B = q.n * p.d;
  const g = gcd(A, B);
  return [A / g, B / g];
}

/** 단위 → 밑단위와 그 배율. **시험이 직접 든다** — 엔진 표를 안 쓴다. */
const UNIT_BASE: Record<string, { base: string; n: number; d: number }> = {
  m: { base: "길이", n: 1, d: 1 },
  cm: { base: "길이", n: 1, d: 100 },
  kg: { base: "무게", n: 1, d: 1 },
  g: { base: "무게", n: 1, d: 1000 },
  L: { base: "들이", n: 1, d: 1 },
  mL: { base: "들이", n: 1, d: 1000 },
};

/** `$1.8\,\mathrm{kg}$` · `$\frac{1}{2}\,\mathrm{m}$` 를 **밑단위 값**으로 순서대로. */
function quantitiesIn(text: string): R[] {
  const out: R[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const span = m[1]!;
    const um = span.match(/\\mathrm\{([a-zA-Z]+)\}/);
    const tok = span.replace(/\\,|\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "").trim();
    const v = readDecTok(tok) ?? readNumber(tok);
    if (!v) continue;
    const u = um ? UNIT_BASE[um[1]!] : undefined;
    out.push(u ? rat(v.n * u.n, v.d * u.d) : v);
  }
  return out;
}

const asRatio = (a: number, b: number) => ({ shape: "비", terms: [a, b] });
const asNum = (v: number) => ({ shape: "수", terms: [v] });

/**
 * 발문이 말하는 답을 **시험이 다시 짓는다**. 엔진 함수를 안 부른다(되부르면 동어반복).
 *
 * 못 읽으면 `null` — 부르는 쪽이 **위반**으로 센다. 조용히 통과시키면 그 문형이
 * 통째로 사각지대가 된다(이 저장소가 여러 번 겪은 자리).
 */
function truthOf24(
  code: string,
  c: string,
): { shape: string; terms: number[] } | null {
  // ══ 확대 갈래 (D-113 2차분) ══
  //
  // 이 대단원의 안 굳는 마디는 전부 **한 묶음 $k$** 다. 그래서 여기서도 «구간 안의
  // 배수»를 다시 세고 **하나가 아니면 null** 을 낸다 — 답이 둘인 문항은 값이 맞아도
  // 지면이 틀린 것이라, 「구성이 하나로 굳혔는가」까지 이 자가 잰다.
  const nsOf = (t: string) => decNumbersIn(t).map((v) => v.n);
  /** 구간 $(lo, up)$ 안의 `m` 의 배수가 정확히 하나면 그 값. */
  const onlyMultiple = (lo: number, up: number, m: number) => {
    const hit: number[] = [];
    for (let v = m; v < up; v += m) if (v > lo) hit.push(v);
    return hit.length === 1 ? hit[0]! : null;
  };

  if (code === "2-4-1" && c.includes("가장 간단한 자연수의 비일 때")) {
    const [P, Q] = nsOf(c);
    if (P === undefined || Q === undefined) return null;
    const g = gcd(P, Q);
    return asNum(Q / g - P / g);
  }
  if (code === "2-4-2" && c.includes("후항이")) {
    const [am, lo, up, b] = nsOf(c);
    if (
      am === undefined ||
      lo === undefined ||
      up === undefined ||
      b === undefined
    )
      return null;
    const x = onlyMultiple(lo, up, b);
    if (x === null) return null;
    const w = am * 100;
    const g = gcd(w, x);
    return x / g === b ? { shape: "비", terms: [w / g, b] } : null;
  }
  if (code === "2-4-3" && c.includes("두 항의 합이")) {
    const [a, b, lo, up] = nsOf(c);
    if (
      a === undefined ||
      b === undefined ||
      lo === undefined ||
      up === undefined
    )
      return null;
    const sum = onlyMultiple(lo, up, a + b);
    if (sum === null) return null;
    const k = sum / (a + b);
    return { shape: "비례식", terms: [a, b, a * k, b * k] };
  }
  if (code === "2-4-4" && c.includes("똑같은 자연수")) {
    const [a, b] = nsOf(c);
    if (a === undefined || b === undefined) return null;
    const p = a * b;
    const x = Math.round(Math.sqrt(p));
    return x * x === p ? asNum(x) : null;
  }
  if (code === "2-4-5" && c.includes("갖는") && c.includes("모두 몇")) {
    // 심화중 — 한 사람의 몫이 구간 안이고, 그 몫이 그 사람의 묶음 수의 배수다.
    const [a, b, lo, up] = nsOf(c);
    if (
      a === undefined ||
      b === undefined ||
      lo === undefined ||
      up === undefined
    )
      return null;
    const part = onlyMultiple(lo, up, b);
    return part === null ? null : asNum((part / b) * (a + b));
  }
  if (code === "2-4-5" && c.includes("다시")) {
    // 심화상 — 전체가 구간 안의 $(a+b)$ 의 배수이고, 첫 사람의 몫이 둘째 비로 갈라진다.
    const [a, b, lo, up, c2, d2] = nsOf(c);
    if (
      a === undefined ||
      b === undefined ||
      lo === undefined ||
      up === undefined ||
      c2 === undefined ||
      d2 === undefined
    )
      return null;
    const s = a + b;
    const t = c2 + d2;
    const hit: number[] = [];
    for (let v = s; v < up; v += s)
      if (v > lo && ((v / s) * a) % t === 0) hit.push(v);
    return hit.length === 1 ? asNum(hit[0]!) : null;
  }

  if (code === "2-4-1") {
    // 심화ⓑ 가 연산ⓐ 와 같은 말(「전항과 후항에 각각 …을 곱」)을 쓴다 — 먼저 가른다.
    let m = c.match(
      /^어떤 비의 전항과 후항에 각각 \$(\d+)\$[을를] 곱했더니 \$(\d+):(\d+)\$/,
    );
    if (m) {
      const [k, P, Q] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (P % k !== 0 || Q % k !== 0) return null;
      return asNum(P / k + Q / k);
    }
    m = c.match(
      /전항과 후항에 각각 \$(\d+)\$[을를] 곱한 비[\s\S]*?\$(\d+):(\d+)\$/,
    );
    if (m) {
      const k = Number(m[1]);
      return asRatio(Number(m[2]) * k, Number(m[3]) * k);
    }
    m = c.match(
      /전항과 후항을 각각 \$(\d+)\$으?로 나눈 비[\s\S]*?\$(\d+):(\d+)\$/,
    );
    if (m) {
      const [g, A, B] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (A % g !== 0 || B % g !== 0) return null;
      return asRatio(A / g, B / g);
    }
    m = c.match(/^한 상자에 .*?\$(\d+)\$.*?\$(\d+)\$.*?이런 상자 \$(\d+)\$개/);
    if (m) {
      const k = Number(m[3]);
      return asRatio(Number(m[1]) * k, Number(m[2]) * k);
    }
    m = c.match(
      /중에서 \$(\d+):(\d+)\$[과와] 비율이 같은 비를 찾아[\s\S]*?\$(\d+):(\d+)\$, \$(\d+):(\d+)\$/,
    );
    if (m) {
      const v = m.slice(1, 7).map(Number);
      const hits = [
        [v[2]!, v[3]!],
        [v[4]!, v[5]!],
      ].filter(([x, y]) => x! * v[1]! === y! * v[0]!);
      // 후보가 둘 다 맞거나 둘 다 틀리면 **문항 자체가 틀린 것**이다.
      return hits.length === 1 ? asRatio(hits[0]![0]!, hits[0]![1]!) : null;
    }
    m = c.match(
      /^\$(\d+):(\d+)\$[과와] 비율이 같은 비 중에서 전항과 후항의 합이 \$(\d+)\$인/,
    );
    if (m) {
      const [a, b, sum] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (sum % (a + b) !== 0) return null;
      const k = sum / (a + b);
      return asRatio(a * k, b * k);
    }
    return null;
  }

  if (code === "2-4-2") {
    // 심화 — **양 셋**을 엮는다: 「A:B 는 $a:b$ · B 는 큰 단위 · C 는 작은 단위 → A:C」.
    // 단위 환산은 여기서 **다시** 적는다(엔진 값을 되받으면 값 복사라 같이 눈먼다).
    const deep = c.match(
      /의 비는 \$(\d+):(\d+)\$입니다\.[\s\S]*?\$([\d.]+)\\,\\mathrm\{([a-zA-Z]+)\}\$[\s\S]*?\$(\d+)\\,\\mathrm\{([a-zA-Z]+)\}\$일 때/,
    );
    if (deep) {
      const PER: Record<string, { small: string; per: number }> = {
        m: { small: "cm", per: 100 },
        kg: { small: "g", per: 1000 },
        L: { small: "mL", per: 1000 },
      };
      const [a, b] = [Number(deep[1]), Number(deep[2])];
      const info = PER[deep[4]!];
      if (!info || info.small !== deep[6]) return null;
      const mid = Math.round(Number(deep[3]) * info.per);
      if (mid % b !== 0) return null;
      const first = (mid / b) * a;
      const third = Number(deep[5]);
      const g = gcd(first, third);
      return asRatio(first / g, third / g);
    }
    const bare = c.match(/\$(\d+):(\d+)\$/);
    if (bare) {
      const [A, B] = [Number(bare[1]), Number(bare[2])];
      const g = gcd(A, B);
      return asRatio(A / g, B / g);
    }
    const qs = quantitiesIn(c);
    if (qs.length < 2) return null;
    const [x, y] = reduceRatio(qs[0]!, qs[1]!);
    return asRatio(x, y);
  }

  if (code === "2-4-3") {
    let m = c.match(
      /^다음 비례식에서 (외항|내항)을 모두 쓰시오[\s\S]*?\$(\d+):(\d+)=(\d+):(\d+)\$/,
    );
    if (m) {
      const v = m.slice(2, 6).map(Number);
      // 지면의 «비례식»이 참이 아니면 문항이 틀렸다.
      if (v[0]! * v[3]! !== v[1]! * v[2]!) return null;
      return {
        shape: "쌍",
        terms: m[1] === "외항" ? [v[0]!, v[3]!] : [v[1]!, v[2]!],
      };
    }
    if (c.startsWith("작은 ")) {
      const v = decNumbersIn(c);
      if (v.length !== 4 || v.some((x) => x.d !== 1)) return null;
      const t = v.map((x) => x.n);
      if (t[0]! * t[3]! !== t[1]! * t[2]!) return null;
      return { shape: "비례식", terms: t };
    }
    m = c.match(
      /^다음 두 식 중에서 비례식을 찾아[\s\S]*?\$(\d+):(\d+)=(\d+):(\d+)\$, \$(\d+):(\d+)=(\d+):(\d+)\$/,
    );
    if (m) {
      const v = m.slice(1, 9).map(Number);
      const hits = [v.slice(0, 4), v.slice(4, 8)].filter(
        (t) => t[0]! * t[3]! === t[1]! * t[2]!,
      );
      return hits.length === 1 ? { shape: "비례식", terms: hits[0]! } : null;
    }
    m = c.match(
      /^비례식 \$(\d+):(\d+)=\\square:\\square\$에서 두 번째 비의 전항과 후항의 차가 \$(\d+)\$/,
    );
    if (m) {
      const [a, b, diff] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const gap = Math.abs(a - b);
      if (gap === 0 || diff % gap !== 0) return null;
      const k = diff / gap;
      return { shape: "비례식", terms: [a, b, a * k, b * k] };
    }
    return null;
  }

  if (code === "2-4-4") {
    let m = c.match(
      /\$((?:\d+|\\square):(?:\d+|\\square)=(?:\d+|\\square):(?:\d+|\\square))\$/,
    );
    if (m) {
      const parts = m[1]!.split(/[:=]/);
      if (parts.filter((p) => p === "\\square").length !== 1) return null;
      const pos = parts.indexOf("\\square");
      const v = parts.map((p) => (p === "\\square" ? 0 : Number(p)));
      const want =
        pos === 0
          ? (v[1]! * v[2]!) / v[3]!
          : pos === 3
            ? (v[1]! * v[2]!) / v[0]!
            : pos === 1
              ? (v[0]! * v[3]!) / v[2]!
              : (v[0]! * v[3]!) / v[1]!;
      return Number.isInteger(want) ? asNum(want) : null;
    }
    m = c.match(
      /^[가-힣]+ \$(\d+)\$[가-힣]+의 값이 \$(\d+)\$원입니다\. 같은 [가-힣]+ \$(\d+)\$[가-힣]+의 값은 몇 원입니까\?$/,
    );
    if (m) {
      const [a, price, more] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const v = (price * more) / a;
      return Number.isInteger(v) ? asNum(v) : null;
    }
    if (c.startsWith("휘발유 ")) {
      const v = decNumbersIn(c);
      if (v.length !== 4 || v.some((x) => x.d !== 1)) return null;
      const t = v.map((x) => x.n);
      const need = (t[0]! * t[2]!) / t[1]!;
      return Number.isInteger(need) ? asNum(need - t[3]!) : null;
    }
    m = c.match(
      /^어떤 비례식에서 외항의 곱이 \$(\d+)\$입니다\. 내항 중 하나가 \$(\d+)\$일 때/,
    );
    if (m) {
      const [prod, known] = [Number(m[1]), Number(m[2])];
      return prod % known === 0 ? asNum(prod / known) : null;
    }
    m = c.match(
      /^어떤 비례식에서 내항은 \$(\d+)\$[과와] \$(\d+)\$입니다\. 외항 중 하나가 \$(\d+)\$일 때/,
    );
    if (m) {
      const [x, y, outer] = [Number(m[1]), Number(m[2]), Number(m[3])];
      return (x * y) % outer === 0 ? asNum((x * y) / outer) : null;
    }
    return null;
  }

  if (code === "2-4-5") {
    let m = c.match(
      /^\$(\d+)\$[을를] \$(\d+):(\d+)\$으?로 비례배분하면 두 수는 각각/,
    );
    if (m) {
      const [total, a, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (total % (a + b) !== 0) return null;
      const k = total / (a + b);
      return { shape: "쌍", terms: [a * k, b * k] };
    }
    const asked = c.match(/([가-힣]+)[이가] 갖는/);
    m = c.match(
      /\$(\d+)\$[가-힣]+[을를] ([가-힣]+), ([가-힣]+), ([가-힣]+)[이가] \$(\d+):(\d+):(\d+)\$/,
    );
    if (m && asked) {
      const total = Number(m[1]);
      const names = [m[2]!, m[3]!, m[4]!];
      const t = [Number(m[5]), Number(m[6]), Number(m[7])];
      const sum = t[0]! + t[1]! + t[2]!;
      const idx = names.indexOf(asked[1]!);
      if (idx < 0 || total % sum !== 0) return null;
      return asNum((total / sum) * t[idx]!);
    }
    m = c.match(
      /\$(\d+)\$[가-힣]+[을를] ([가-힣]+)[과와] ([가-힣]+)[이가] \$(\d+):(\d+)\$/,
    );
    if (m && asked) {
      const [total, a, b] = [Number(m[1]), Number(m[4]), Number(m[5])];
      const part = asked[1] === m[2] ? a : asked[1] === m[3] ? b : null;
      if (part === null || total % (a + b) !== 0) return null;
      return asNum((total / (a + b)) * part);
    }
    if (c.startsWith("둘레가 ")) {
      const v = decNumbersIn(c);
      if (v.length !== 3 || v.some((x) => x.d !== 1)) return null;
      const t = v.map((x) => x.n);
      if (t[0]! % 2 !== 0) return null;
      const half = t[0]! / 2;
      if (half % (t[1]! + t[2]!) !== 0) return null;
      const k = half / (t[1]! + t[2]!);
      return asNum(t[1]! * k * (t[2]! * k));
    }
    m = c.match(
      /^[가-힣]+[을를] ([가-힣]+)[과와] ([가-힣]+)[이가] \$(\d+):(\d+)\$으?로 나누어 가졌더니 ([가-힣]+)[이가] \$(\d+)\$/,
    );
    if (m) {
      const [a, b] = [Number(m[3]), Number(m[4])];
      const part = m[5] === m[1] ? a : m[5] === m[2] ? b : null;
      const mine = Number(m[6]);
      if (part === null || mine % part !== 0) return null;
      return asNum((mine / part) * (a + b));
    }
    m = c.match(
      /^[가-힣]+[을를] ([가-힣]+)[과와] ([가-힣]+)[이가] \$(\d+):(\d+)\$으?로 나누어 가졌습니다\. ([가-힣]+)[이가] ([가-힣]+)보다 \$(\d+)\$/,
    );
    if (m) {
      const [a, b] = [Number(m[3]), Number(m[4])];
      const moreIsFirst = m[5] === m[1] && m[6] === m[2];
      const moreIsSecond = m[5] === m[2] && m[6] === m[1];
      if (!moreIsFirst && !moreIsSecond) return null;
      const big = moreIsFirst ? a : b;
      const small = moreIsFirst ? b : a;
      // ③ 낱말이 값을 주장한다 — 「더 많이」가 실제로 큰 쪽이 아니면 여기서 죽는다.
      if (big <= small) return null;
      const diff = Number(m[7]);
      return diff % (big - small) === 0
        ? asNum((diff / (big - small)) * (a + b))
        : null;
    }
    return null;
  }
  return null;
}

describe("[초6 갈래] 2-4 비례식과 비례배분", () => {
  it("소단원 다섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_24_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 — 비는 **왼쪽·오른쪽을 따로** 견준다", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_24_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          const want = truthOf24(code, flat);
          if (!want) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          const got = readOrdered(p.answer);
          if (!got) {
            bad.push(`${where}: 답 모양을 못 읽음 — ${p.answer}`);
            continue;
          }
          checked += 1;
          if (got.shape !== want.shape) {
            bad.push(
              `${where}: 답이 «${got.shape}» 인데 «${want.shape}» 여야 — ${p.answer}`,
            );
          } else if (
            got.terms.length !== want.terms.length ||
            got.terms.some((v, i) => v !== want.terms[i])
          ) {
            bad.push(
              `${where}: 답 ${p.answer} ([${want.terms.join(", ")}] 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_24_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("2-4-2 의 답은 늘 «가장 간단한 자연수의 비»다 (시험이 최대공약수를 잰다)", () => {
    // 소단원 이름이 내건 조건은 **답**에 있다. 값이 맞아도 기약이 아니면 답이 아니다.
    const bad: string[] = [];
    const unit = unitOf("2-4-2");
    for (const tier of tiersOf(unit)) {
      for (let seed = 0; seed < 400; seed += 1) {
        const p = generateElementaryProblem(unit, seed, tier);
        const got = readOrdered(p.answer);
        if (!got || got.shape !== "비" || got.terms.length !== 2) {
          bad.push(
            `2-4-2 ${tier} seed=${seed}: 답이 비가 아니다 — ${p.answer}`,
          );
          continue;
        }
        const [x, y] = got.terms as [number, number];
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1) {
          bad.push(
            `2-4-2 ${tier} seed=${seed}: 자연수 비가 아니다 — ${p.answer}`,
          );
        } else if (gcd(x, y) !== 1) {
          bad.push(
            `2-4-2 ${tier} seed=${seed}: 기약이 아니다 (gcd=${gcd(x, y)}) — ${p.answer}`,
          );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("2-4-2 는 갈래마다 «간단히 하는 걸음»이 하나씩 늘어난다", () => {
    // 「심화만 되짚는다」축이 안 서는 소단원이다(역산이 아니라 **조건 결합**으로 오른다).
    // 그러면 축이 없는 게 아니라 **다른 축**이다 — 지면에 남은 «고칠 것»의 종류로 잰다.
    const bad: string[] = [];
    const unit = unitOf("2-4-2");
    const unitsOf = (s: string) =>
      new Set([...s.matchAll(/\\mathrm\{([a-zA-Z]+)\}/g)].map((m) => m[1]));
    for (const seed of SEEDS) {
      const at = (t: ElemTier) =>
        generateElementaryProblem(unit, seed, t).content.replace(/\n+/g, " ");
      const calc = at("연산");
      const basic = at("기본");
      const apply = at("응용");
      const deep = at("심화하");
      if (!/^다음 비를 .*\$\d+:\d+\$$/.test(calc))
        bad.push(`연산 seed=${seed}: 자연수 비 하나가 아니다 — ${calc}`);
      if (!/\d\.\d/.test(basic) || basic.includes("\\frac"))
        bad.push(`기본 seed=${seed}: 소수 두 양이 아니다 — ${basic}`);
      if (!apply.includes("\\frac") || !/\d\.\d/.test(apply))
        bad.push(`응용 seed=${seed}: 분수와 소수가 섞이지 않았다 — ${apply}`);
      if (unitsOf(deep).size !== 2)
        bad.push(`심화 seed=${seed}: 단위가 둘이 아니다 — ${deep}`);
      if (unitsOf(basic).size !== 1)
        bad.push(`기본 seed=${seed}: 단위가 하나가 아니다 — ${basic}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("2-4-1 응용의 오답 후보는 «뒤집은 비»다 — 곱·합으로는 안 갈리는 자리를 세운다", () => {
    // 이 문항이 ② 축을 실제로 재려면 두 후보가 **곱도 합도 같아야** 한다.
    // 안 그러면 곱만 보는 잣대로도 갈려서, 「자리를 본다」는 잠금이 장식이 된다.
    const bad: string[] = [];
    const unit = unitOf("2-4-1");
    let seen = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const p = generateElementaryProblem(unit, seed, "응용");
      const flat = p.content.replace(/\n+/g, " ");
      const m = flat.match(
        /중에서 \$(\d+):(\d+)\$[과와] .*\$(\d+):(\d+)\$, \$(\d+):(\d+)\$/,
      );
      if (!m) {
        bad.push(`seed=${seed}: 후보 둘을 못 읽음 — ${flat}`);
        continue;
      }
      seen += 1;
      const v = m.slice(1, 7).map(Number);
      const [a, b, p1, q1, p2, q2] = v as number[];
      if (p1 !== q2 || q1 !== p2)
        bad.push(`seed=${seed}: 두 후보가 서로 뒤집힌 짝이 아니다 — ${flat}`);
      if (p1! * q1! !== p2! * q2!)
        bad.push(`seed=${seed}: 두 후보의 곱이 다르다 — ${flat}`);
      if (p1! + q1! !== p2! + q2!)
        bad.push(`seed=${seed}: 두 후보의 합이 다르다 — ${flat}`);
      if (a === b)
        bad.push(
          `seed=${seed}: 기준 비의 두 항이 같아 뒤집어도 같다 — ${flat}`,
        );
      const ok = [
        [p1!, q1!],
        [p2!, q2!],
      ].filter(([x, y]) => x! * b! === y! * a!);
      if (ok.length !== 1)
        bad.push(`seed=${seed}: 비율이 같은 후보가 ${ok.length}개다 — ${flat}`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(seen).toBe(200);
  });

  it("비례배분은 몫이 자연수다 — 전체가 «항의 합»으로 나누어떨어진다", () => {
    const bad: string[] = [];
    const unit = unitOf("2-4-5");
    for (const tier of tiersOf(unit)) {
      for (let seed = 0; seed < 500; seed += 1) {
        const p = generateElementaryProblem(unit, seed, tier);
        const flat = p.content.replace(/\n+/g, " ");
        const rm = flat.match(/\$(\d+):(\d+)(?::(\d+))?\$/);
        if (!rm) {
          bad.push(`${tier} seed=${seed}: 비가 지면에 없다 — ${flat}`);
          continue;
        }
        const terms = [rm[1], rm[2], rm[3]]
          .filter((v): v is string => v !== undefined)
          .map(Number);
        const sum = terms.reduce((s, v) => s + v, 0);
        if (terms.reduce((g, v) => gcd(g, v), 0) !== 1) {
          bad.push(
            `${tier} seed=${seed}: 비가 가장 간단한 자연수의 비가 아니다 — ${flat}`,
          );
        }
        // 전체가 어디 적혔는지는 갈래마다 다르다 — 역산 갈래에서는 **답**이 전체다.
        let total = NaN;
        if (/비례배분하면 두 수는/.test(flat)) {
          const t = readOrdered(p.answer);
          total = t && t.shape === "쌍" ? t.terms[0]! + t.terms[1]! : NaN;
        } else if (flat.startsWith("둘레가 ")) {
          const around = Number(flat.match(/^둘레가 \$(\d+)/)?.[1]);
          total = around % 2 === 0 ? around / 2 : NaN;
        } else if (/처음 .*모두 몇/.test(flat) || /[은는] 모두 몇/.test(flat)) {
          // 확대 갈래도 **답이 전체**다 — 전체가 지면에 없으면 이 자가 못 읽는다.
          total = Number(p.answer.match(/^\$(\d+)\$$/)?.[1] ?? NaN);
        } else {
          total = Number(flat.match(/\$(\d+)\$[가-힣]+[을를] /)?.[1] ?? NaN);
        }
        if (!Number.isFinite(total)) {
          bad.push(
            `${tier} seed=${seed}: 전체를 못 읽음 — ${flat} / ${p.answer}`,
          );
        } else if (total % sum !== 0 || total / sum < 1) {
          bad.push(
            `${tier} seed=${seed}: ${total}÷${sum} 이 떨어지지 않는다 — ${flat}`,
          );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it("순서를 주장하는 낱말은 값의 순서와 맞는다 — 2-4-5 씨앗 0~1999 전수", () => {
    // ⚠️ 씨앗 16개로는 구조적으로 안 보이는 부류다 — 2-2-4 반려가 2000 중 7건(0.35%)
    // 이었다. 값·판정기·시험이 전부 통과하고 **낱말만** 거짓말한다. 그래서 전수로 쓴다.
    // 그리고 엔진의 표시가 아니라 **지면의 낱말**로 잰다(표시를 믿으면 같이 눈이 먼다).
    const bad: string[] = [];
    const unit = unitOf("2-4-5");
    let seen = 0;
    for (const tier of tiersOf(unit)) {
      for (let seed = 0; seed < 2000; seed += 1) {
        const flat = generateElementaryProblem(
          unit,
          seed,
          tier,
        ).content.replace(/\n+/g, " ");
        const more = flat.match(
          /([가-힣]+)[이가] ([가-힣]+)보다 \$(\d+)\$[가-힣]+ 더 많이/,
        );
        if (!more) continue;
        seen += 1;
        const m = flat.match(
          /([가-힣]+)[과와] ([가-힣]+)[이가] \$(\d+):(\d+)\$/,
        );
        if (!m) {
          bad.push(`${tier} seed=${seed}: 비와 두 이름을 못 읽음 — ${flat}`);
          continue;
        }
        const [a, b] = [Number(m[3]), Number(m[4])];
        const bigger = a > b ? m[1] : m[2];
        const smaller = a > b ? m[2] : m[1];
        if (more[1] !== bigger || more[2] !== smaller) {
          bad.push(
            `${tier} seed=${seed}: 「${more[1]}가 ${more[2]}보다 더 많이」인데 비는 ${a}:${b} — ${flat}`,
          );
        }
        if (a === b || Number(more[3]) % Math.abs(a - b) !== 0) {
          bad.push(`${tier} seed=${seed}: 차가 값과 안 맞는다 — ${flat}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 잴 자리가 정말 있는가 — 0 이면 이 잠금은 아무것도 증명하지 않는다.
    expect(seen).toBeGreaterThan(100);
  });

  it("2-4-3 기본의 «작은·큰» 도 값과 맞는다 — 씨앗 0~1999 전수", () => {
    const bad: string[] = [];
    const unit = unitOf("2-4-3");
    let seen = 0;
    for (let seed = 0; seed < 2000; seed += 1) {
      const p = generateElementaryProblem(unit, seed, "기본");
      if (!p.content.startsWith("작은 ")) continue;
      seen += 1;
      const v = decNumbersIn(p.content).map((x) => x.n);
      if (v.length !== 4) {
        bad.push(`seed=${seed}: 네 수를 못 읽음 — ${p.content}`);
        continue;
      }
      if (v[2]! <= v[0]! || v[3]! <= v[1]!) {
        bad.push(`seed=${seed}: 「큰 것」이 더 작다 — ${p.content}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(seen).toBe(2000);
  });

  it("연산 문형이 서고, 기본은 그 문형이 아니며, 심화만 되짚는다", () => {
    const CALC_SHAPE: Record<string, RegExp> = {
      "2-4-1": /^다음 비의 전항과 후항/,
      "2-4-2": /^다음 비를 가장 간단한 자연수의 비로 나타내시오/,
      "2-4-3": /^다음 비례식에서 (외항|내항)을 모두 쓰시오/,
      "2-4-4": /^\$\\square\$ 안에 알맞은 수를 구하시오/,
      "2-4-5": /비례배분하면 두 수는 각각 얼마입니까\?$/,
    };
    // 2-4-2 는 역산이 아니라 **조건 결합**으로 오르는 소단원이라 이 축이 없다 —
    // 그 축은 위 「걸음이 하나씩 늘어난다」가 대신 잰다(사각지대로 두지 않는다).
    const DEEP_MARK: Record<string, RegExp> = {
      "2-4-1": /^어떤 비의|합이 \$\d+\$인 비를 쓰시오/,
      "2-4-3": /차가 \$\d+\$입니다/,
      "2-4-4": /^어떤 비례식에서/,
      "2-4-5": /가졌더니|더 많이 가졌다면/,
    };
    for (const code of G6_24_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const at = (t: ElemTier) =>
          generateElementaryProblem(unit, seed, t).content.replace(/\n+/g, " ");
        expect(
          CALC_SHAPE[code]!.test(at("연산")),
          `${code} 연산 seed=${seed}: ${at("연산")}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(at("기본")),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${at("기본")}`,
        ).toBe(false);
        const deep = DEEP_MARK[code];
        if (!deep) continue;
        expect(
          deep.test(at("심화하")),
          `${code} 심화 seed=${seed}: 되짚는 표지가 없다 — ${at("심화하")}`,
        ).toBe(true);
        expect(
          deep.test(at("응용")),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${at("응용")}`,
        ).toBe(false);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_24_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·꼬리 0·샌 소수 없음", () => {
    const bad: string[] = [];
    // 「기약이다」 가드가 **몇 개를 재고 몇 개를 예외로 뺐는지**를 센다.
    // 예외는 조용히 넓어진다 — 세어서 못 박아 두면 «갑자기 커진 것»이 보인다.
    // (리드 지적 2026-08-23. 「못 잰 것은 통과가 아니라 안 잼」과 같은 태도다.)
    let fracSeen = 0;
    let fracExempt = 0;
    for (const code of G6_24_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
            const trailing = field.match(/\d+\.\d*0(?![\d])/g);
            if (trailing)
              bad.push(`${where} ${name}: 꼬리 0 — ${trailing.join(",")}`);
            const runaway = field.match(/\d+\.\d{4,}/g);
            if (runaway) bad.push(`${where} ${name}: 샌 소수 ${runaway[0]}`);
            // 지면의 분수는 기약이다. **딱 한 자리만** 예외 — 해설이 「$\frac{15}{18}=
            // \frac{5}{6}$」처럼 **약분해 보이는** 등식. 그 왼쪽은 안 줄인 게 뜻이다.
            // 그 자리를 통째로 빼지 않고 «오른쪽이 정말 왼쪽의 기약형일 때만» 뺀다 —
            // 안 그러면 이 가드가 해설에서 장식이 된다.
            fracSeen += [...field.matchAll(/\\frac\{\d+\}\{\d+\}/g)].length;
            const scan =
              name === "해설"
                ? field.replace(
                    /\\frac\{(\d+)\}\{(\d+)\}=\\frac\{(\d+)\}\{(\d+)\}/g,
                    (all, a1, b1, c1, d1) => {
                      const [x, y, u, w] = [a1, b1, c1, d1].map(Number) as [
                        number,
                        number,
                        number,
                        number,
                      ];
                      if (x * w === y * u && gcd(u, w) === 1) {
                        fracExempt += 2;
                        return " ";
                      }
                      return all;
                    },
                  )
                : field;
            for (const f of scan.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)) {
              if (gcd(Number(f[1]), Number(f[2])) !== 1)
                bad.push(`${where} ${name}: 분수가 기약이 아니다 — ${f[0]}`);
            }
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 실측 리터럴로 못 박는다 — 예외가 넓어지면 이 줄이 먼저 빨개진다.
    // 분모(fracSeen)도 같이 박는다: **0 이면 이 가드는 아무것도 안 잰 것**이다.
    expect({ 분수: fracSeen, 예외: fracExempt }).toEqual({
      분수: 99,
      예외: 38,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 초6 **표준** 2-5-3 원의 넓이 어림하기 — 발문이 도형을 하나로 정하는가
//
// 갈래가 아직 없는 소단원이지만 잠금은 여기에 둔다(초6 엔진 잠금의 집).
//
// ⚠️ **값 검산으로는 구조적으로 안 잡히는 부류다.** 답($2r^2$·$4r^2$)은 교과서
// 규약대로 맞다. 틀린 것은 「원 안에 그린 마름모」가 **무수히 많다**는 것이고,
// 교과서는 그림이 정해 주는데 우리 지면에는 그림이 없다. 그래서 이 시험은 값이
// 아니라 **한정어가 지면에 서 있는가**를 잰다(2026-08-18 기출 1,420건과 같은 부류).
// ══════════════════════════════════════════════════════════════════════════

describe("[초6 표준] 2-5-3 — 그림 없이도 도형이 하나로 정해진다", () => {
  it("한정어와 «단, …» 조건이 발문에 늘 서고 해설이 그것을 근거로 쓴다 — 씨앗 0~999 전수", () => {
    const unit = unitOf("2-5-3");
    const bad: string[] = [];
    let inner = 0;
    let outer = 0;
    for (let seed = 0; seed < 1000; seed += 1) {
      const p = generateElementaryProblem(unit, seed);
      const c = p.content.replace(/\n+/g, " ");
      const r = Number(
        c.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/)?.[1] ?? NaN,
      );
      const ans = Number(p.answer.match(/^\$(\d+)\$$/)?.[1] ?? NaN);
      if (!Number.isFinite(r) || !Number.isFinite(ans)) {
        bad.push(`seed=${seed}: 반지름·정답을 못 읽음 — ${c} / ${p.answer}`);
        continue;
      }
      if (c.includes("마름모")) {
        inner += 1;
        if (!/원 안에 꼭 맞게 그린 마름모/.test(c))
          bad.push(`seed=${seed}: 「꼭 맞게」 한정어가 없다 — ${c}`);
        if (!/단, 마름모의 네 꼭짓점은 모두 원 위에 있습니다/.test(c))
          bad.push(`seed=${seed}: 내접 조건이 발문에 없다 — ${c}`);
        // 해설이 예전 말을 되풀이하면 같은 자리가 남는다 — 근거를 요구한다.
        if (!/네 꼭짓점이 모두 원 위에 있으므로/.test(p.solution))
          bad.push(
            `seed=${seed}: 해설이 조건을 근거로 쓰지 않는다 — ${p.solution}`,
          );
        if (ans !== 2 * r * r)
          bad.push(`seed=${seed}: 답 ${ans} (${2 * r * r} 이어야) — ${c}`);
      } else if (c.includes("정사각형")) {
        outer += 1;
        if (!/원 밖에 꼭 맞게 그린 정사각형/.test(c))
          bad.push(`seed=${seed}: 「꼭 맞게」 한정어가 없다 — ${c}`);
        if (!/단, 정사각형의 네 변은 모두 원에 닿습니다/.test(c))
          bad.push(`seed=${seed}: 외접 조건이 발문에 없다 — ${c}`);
        if (!/네 변이 모두 원에 닿으므로/.test(p.solution))
          bad.push(
            `seed=${seed}: 해설이 조건을 근거로 쓰지 않는다 — ${p.solution}`,
          );
        if (ans !== 4 * r * r)
          bad.push(`seed=${seed}: 답 ${ans} (${4 * r * r} 이어야) — ${c}`);
      } else {
        // 새 문형이 들어오면 **조용히 통과시키지 않는다** — 한정어를 안 재게 된다.
        bad.push(`seed=${seed}: 아는 문형이 아니다 — ${c}`);
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 — 두 가지가 **둘 다** 실제로 나와야 한다. 한쪽이 0이면 그쪽은 «안 잰» 것이다.
    expect({ 내접: inner > 300, 외접: outer > 300 }).toEqual({
      내접: true,
      외접: true,
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 초6 2-5 원의 둘레와 넓이 (4소단원 · 16갈래)
//
// 이 대단원의 위험은 값이 아니라 **발문이 도형을 하나로 정하는가**다 — 2-5-3 표준을
// 고치며 세운 규약(「꼭 맞게」+「단, …」)을 갈래가 물려받는지 전량으로 잰다.
// 원주율도 같은 부류다: 발문이 안 적으면 「$3$ 으로 풀까 $3.14$ 로 풀까」가 안 갈린다.
// ══════════════════════════════════════════════════════════════════════════

const G6_25_CODES = ["2-5-1", "2-5-2", "2-5-3", "2-5-4"] as const;

/** 발문에서 «이름 뒤 수» 하나. 없으면 NaN — 부르는 쪽이 위반으로 센다. */
function numAfter(c: string, re: RegExp): number {
  const m = c.match(re);
  return m ? Number(m[1]) : NaN;
}

// ⚠️ 「**반**지름이」 안에 「지름이」가 들어 있다. 뒤돌아보기를 안 걸면 반지름을 지름으로
// 읽어 넓이가 딱 **네 배** 어긋난다 — 2-5-3 기본에서 실제로 그렇게 걸렸다(엔진은 옳았고
// 시험이 틀렸다). 낱말이 낱말을 품는 자리는 정규식이 조용히 거짓말한다.
const RE_D = /(?<!반)지름이 \$(\d+)\\,\\mathrm\{cm\}\$/;
const RE_R = /반지름이 \$(\d+)\\,\\mathrm\{(?:cm|m)\}\$/;

/**
 * 2-5 는 **센트(정수)로 견준다** — D-74 이 응용에 `$3.1$`, 심화에 `$3.14$` 를 걸어
 * 답에 소수가 선다. 부동소수점으로 재면 `0.1+0.2` 부류가 조용히 어긋난다.
 */
function centsAfter(c: string, re: RegExp): number {
  const m = c.match(re);
  if (!m) return NaN;
  const [whole, frac = ""] = m[1]!.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0") || "0");
}

const asCents = (cents: number) => ({ shape: "수", terms: [cents] });

/** 답을 **센트**로. `$74.4$` · `$200,\ 400$` 둘 다 읽는다. */
function readCents(answer: string): { shape: string; terms: number[] } | null {
  const inner = answer.match(/^\$(.+)\$$/)?.[1];
  if (inner === undefined) return null;
  const toCents = (t: string): number | null => {
    const m = t.match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!m) return null;
    return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0");
  };
  const parts = inner.split(/,\\ /).map(toCents);
  if (parts.some((v) => v === null)) return null;
  return {
    shape: parts.length > 1 ? "쌍" : "수",
    terms: parts as number[],
  };
}

/** 2-5 의 참 — 시험이 다시 짓는다. 못 읽으면 null(= 위반). */
function truthOf25(
  code: string,
  c: string,
): { shape: string; terms: number[] } | null {
  if (code === "2-5-1") {
    if (c.includes("정육각형의 둘레가")) {
      // 심화 ⓐ — 내접 정육각형 둘레에서 외접 정사각형 둘레로
      const p = numAfter(c, /정육각형의 둘레가 \$(\d+)\\,\\mathrm\{cm\}\$/);
      if (!Number.isFinite(p) || p % 6 !== 0) return null;
      return asCents((p / 6) * 800);
    }
    if (c.includes("정사각형의 둘레가")) {
      // 심화 ⓑ — 반대 방향(외접 정사각형 둘레에서 내접 정육각형 둘레로)
      const p = numAfter(c, /정사각형의 둘레가 \$(\d+)\\,\\mathrm\{cm\}\$/);
      if (!Number.isFinite(p) || p % 8 !== 0) return null;
      return asCents((p / 8) * 600);
    }
    if (c.includes("굴렸더니")) {
      // 응용 — 굴러간 거리에서 지름의 범위(쌍)
      const l = numAfter(c, /굴렸더니 \$(\d+)\\,\\mathrm\{cm\}\$/);
      if (!Number.isFinite(l) || l % 12 !== 0) return null;
      return { shape: "쌍", terms: [(l / 4) * 100, (l / 3) * 100] };
    }
    const rh = numAfter(c, /반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
    if (Number.isFinite(rh) && c.includes("정육각형")) return asCents(rh * 600);
    const d = numAfter(c, RE_D);
    if (!Number.isFinite(d)) return null;
    if (c.includes("정사각형")) return asCents(d * 400);
    if (c.includes("몇 cm보다 깁니까")) return asCents(d * 300); // 기본
    return null;
  }

  if (code === "2-5-2") {
    if (c.includes("몇 바퀴 굴렸더니")) {
      // 확대 갈래 (D-113 3차분) 심화상 — 거리 ÷ 원주율 = (지름)×(바퀴 수).
      // 창 안의 자연수 가운데 그 곱을 나누어떨어지게 하는 것이 **하나**여야 한다.
      const l = centsAfter(c, /굴렸더니 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
      const win = c.match(/지름이 \$(\d+)\$ cm보다 길고 \$(\d+)\$ cm보다 짧은/);
      if (!Number.isFinite(l) || !win) return null;
      // `l` 은 **센트**다. 거리 ÷ 원주율 = `l/100 ÷ 3.14` = `l/314` — 여기서 곱하기 100 을
      // 한 번 더 하면 값이 백 배가 된다(첫 판이 그렇게 틀렸고 이 시험이 잡았다).
      if (l % 314 !== 0) return null;
      const prod = l / 314; // (지름)×(바퀴 수)
      const hit: number[] = [];
      for (let d = Number(win[1]) + 1; d < Number(win[2]); d += 1)
        if (prod % d === 0 && prod / d >= 2) hit.push(prod / d);
      return hit.length === 1 ? asCents(hit[0]! * 100) : null;
    }
    if (c.includes("굴렸더니")) {
      // 심화 — 굴러간 거리와 바퀴 수에서 반지름 (D-74: 원주율 $3.14$)
      const l = centsAfter(c, /굴렸더니 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
      const t = numAfter(c, /\$(\d+)\$바퀴/);
      if (!Number.isFinite(l) || !Number.isFinite(t) || l % t !== 0)
        return null;
      const per = l / t; // 원주(센트)
      if ((per * 100) % 314 !== 0) return null;
      const dia = (per * 100) / 314; // 지름(센트)
      return dia % 2 === 0 ? asCents(dia / 2) : null;
    }
    if (c.includes("바퀴 굴렸습니다")) {
      // 응용 — 반지름과 바퀴 수에서 굴러간 거리 (D-74: 원주율 $3.1$)
      const r = numAfter(c, RE_R);
      const t = numAfter(c, /\$(\d+)\$바퀴/);
      return Number.isFinite(r) && Number.isFinite(t)
        ? asCents(620 * r * t)
        : null;
    }
    const d = numAfter(c, RE_D);
    return Number.isFinite(d) ? asCents(300 * d) : null; // 연산·기본 ($3$)
  }

  if (code === "2-5-3") {
    if (c.includes("마름모의 넓이가")) {
      // 심화 — 내접 마름모 넓이에서 **지름**을 되짚는다(두 걸음 역산)
      const ar = numAfter(c, /마름모의 넓이가 \$(\d+)\$ cm²/);
      if (!Number.isFinite(ar)) return null;
      const dd = ar * 2; // (지름)×(지름)
      const d = Math.round(Math.sqrt(dd));
      return d * d === dd ? asCents(100 * d) : null;
    }
    if (c.includes("보다 크고")) {
      // 응용 — 안팎 두 넓이(쌍)
      const r = numAfter(c, RE_R);
      return Number.isFinite(r)
        ? { shape: "쌍", terms: [200 * r * r, 400 * r * r] }
        : null;
    }
    const d = numAfter(c, RE_D);
    if (Number.isFinite(d)) {
      if (c.includes("마름모")) return asCents(d * d * 50);
      if (c.includes("정사각형")) return asCents(d * d * 100);
      return null;
    }
    const r = numAfter(c, RE_R);
    if (Number.isFinite(r) && c.includes("마름모")) return asCents(200 * r * r);
    return null;
  }

  if (code === "2-5-4") {
    if (c.includes("보다 넓고")) {
      // 🔴 심화중 — 넓이 **구간** ÷ 원주율 → (반지름)×(반지름) 의 구간.
      //    그 안의 «제곱수»가 하나여야 답이 선다(적대 검토 ④-㉰ 가 되살린 자리).
      const lo = centsAfter(c, /넓이가 \$([\d.]+)\$ cm²보다 넓고/);
      const up = centsAfter(c, /\$([\d.]+)\$ cm²보다 좁습니다/);
      if (!Number.isFinite(lo) || !Number.isFinite(up)) return null;
      if (lo % 314 !== 0 || up % 314 !== 0) return null;
      const hit: number[] = [];
      for (let r = 1; r * r < up / 314; r += 1)
        if (r * r > lo / 314) hit.push(r);
      return hit.length === 1 ? asCents(100 * hit[0]!) : null;
    }
    if (c.includes("넓이가")) {
      // 심화 — 넓이에서 반지름·지름을 되짚는다 (D-74: 원주율 $3.14$)
      const a = centsAfter(c, /넓이가 \$([\d.]+)\$ cm²인 원/);
      if (!Number.isFinite(a) || a % 314 !== 0) return null;
      const rr = a / 314;
      const r = Math.round(Math.sqrt(rr));
      if (r * r !== rr) return null;
      if (c.includes("반지름은 몇")) return asCents(100 * r);
      if (c.includes("지름은 몇")) return asCents(200 * r);
      return null;
    }
    if (c.includes("원주가")) {
      // 응용 — 원주에서 반지름을 되찾아 넓이 (D-74: 원주율 $3.1$)
      const cc = centsAfter(c, /원주가 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
      if (!Number.isFinite(cc) || cc % 310 !== 0) return null;
      const dia = cc / 310; // 지름 = 원주 ÷ 3.1
      return dia % 2 === 0 ? asCents(310 * (dia / 2) * (dia / 2)) : null;
    }
    const rc = numAfter(c, /반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
    if (Number.isFinite(rc)) return asCents(300 * rc * rc); // 연산 — 반지름(cm)
    const dm = numAfter(c, /(?<!반)지름이 \$(\d+)\\,\\mathrm\{m\}\$/);
    if (Number.isFinite(dm)) return dm % 2 === 0 ? asCents(75 * dm * dm) : null; // 기본 — 지름(m)
    return null;
  }
  return null;
}

describe("[초6 갈래] 2-5 원의 둘레와 넓이", () => {
  it("소단원 넷이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_25_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 공식을 직접 든다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_25_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          const want = truthOf25(code, flat);
          if (!want) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          const got = readCents(p.answer);
          if (!got) {
            bad.push(`${where}: 답 모양을 못 읽음 — ${p.answer}`);
            continue;
          }
          checked += 1;
          if (
            got.shape !== want.shape ||
            got.terms.length !== want.terms.length ||
            got.terms.some((v, i) => v !== want.terms[i])
          ) {
            bad.push(
              `${where}: 답 ${p.answer} ([${want.terms.join(", ")}] 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_25_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("원 안팎 도형에는 «꼭 맞게»와 짝이 맞는 조건이 늘 붙는다 — 씨앗 0~499 전수", () => {
    // 2-5-3 표준을 고치며 세운 규약을 **갈래가 물려받는가**. 그림이 없으니 이 말이
    // 없으면 답이 하나로 안 선다 — 값 검산으로는 구조적으로 안 잡히는 부류다.
    const bad: string[] = [];
    const seen = { 정육각형: 0, 마름모: 0, 정사각형: 0 };
    for (const code of ["2-5-1", "2-5-3"] as const) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (let seed = 0; seed < 500; seed += 1) {
          const c = generateElementaryProblem(unit, seed, tier).content.replace(
            /\n+/g,
            " ",
          );
          const shapes = (["정육각형", "마름모", "정사각형"] as const).filter(
            (k) => c.includes(k),
          );
          if (shapes.length === 0) continue;
          if (!c.includes("꼭 맞게"))
            bad.push(`${code} ${tier} seed=${seed}: 「꼭 맞게」가 없다 — ${c}`);
          for (const k of shapes) {
            seen[k] += 1;
            const want =
              k === "정육각형"
                ? "정육각형의 여섯 꼭짓점은 모두 원 위에 있습니다"
                : k === "마름모"
                  ? "마름모의 네 꼭짓점은 모두 원 위에 있습니다"
                  : "정사각형의 네 변은 모두 원에 닿습니다";
            if (!c.includes(want))
              bad.push(`${code} ${tier} seed=${seed}: ${k} 조건이 없다 — ${c}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 — 세 도형이 **다 나와야** 한다. 0 인 것이 있으면 그 도형은 «안 잰» 것이다.
    expect({
      정육각형: seen.정육각형 > 100,
      마름모: seen.마름모 > 100,
      정사각형: seen.정사각형 > 100,
    }).toEqual({ 정육각형: true, 마름모: true, 정사각형: true });
  });

  it("원주율은 D-74 표대로 서고, **발문에 적은 값으로 해설이 계산한다** — 씨앗 0~299 전수", () => {
    // D-74(원장님 확정 2026-08-23): 연산 $3$ · 기본 $3$ · 응용 $3.1$ · 심화 $3.14$.
    //
    // ⚠️ 예전 잠금은 「$3.14$ 가 섞이면 빨강」이었다. D-74 이면 그것은 **거꾸로 걸린다** —
    // 있어야 할 것을 막는다. 진짜 축은 「**적은 값과 쓴 값이 같은가**」다:
    // 「$3$ 이라 적고 $3.14$ 로 계산」은 양쪽 다 산술이 맞아 **값 검산으로는 안 잡히고**
    // 지면에서만 틀린다. 이 저장소가 되풀이해 밟는 부류라 여기서 못 박는다.
    const WANT: Record<string, string> = {
      연산: "3",
      기본: "3",
      응용: "3.1",
      심화하: "3.14",
      // D-74 의 「심화」는 하나였다. 축이 여섯이 된 뒤(D-113) 심화 **계열 셋**이 같은
      // 층이므로 셋 다 `$3.14$` 다 — 같은 층이 다른 원주율을 쓰면 지면에서
      // 「$3$ 이라 적고 $3.14$ 로 계산」과 구분이 안 된다.
      심화중: "3.14",
      심화상: "3.14",
    };
    const bad: string[] = [];
    let withPi = 0;
    for (const code of G6_25_CODES) {
      const unit = unitOf(code);
      const needsPi = code === "2-5-2" || code === "2-5-4";
      for (const tier of tiersOf(unit)) {
        for (let seed = 0; seed < 300; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const said = p.content.match(/\(원주율: \$([\d.]+)\$\)/)?.[1];
          if (!needsPi) {
            if (/원주율/.test(p.content))
              bad.push(`${where}: 원주율을 안 쓰는 소단원인데 적혀 있다`);
            continue;
          }
          withPi += 1;
          if (said === undefined) {
            bad.push(`${where}: 발문이 원주율을 안 적었다 — ${p.content}`);
            continue;
          }
          if (said !== WANT[tier]!)
            bad.push(
              `${where}: 원주율이 $${said}$ 다 (D-74 은 $${WANT[tier]}$)`,
            );
          // 해설이 곱하거나 나눈 «원주율 후보» 값들.
          //
          // ⚠️ 맨 `3` 이 원주율이 아닐 수 있다 — 「$18.6\times3=55.8$」의 3 이 **바퀴 수**인
          // 자리가 있어 첫 판이 거기서 거짓 경보를 냈다. **거짓 경보는 가드를 끈다.**
          // 그래서 「쓴 값 == 적은 값」으로 못 박지 않고 두 조건으로 나눈다:
          //   ㉠ 적은 값이 해설에 **반드시 있다**   ㉡ 적은 값보다 **잘게 쓴 값이 없다**
          // 「$3$ 이라 적고 $3.14$ 로 계산」은 ㉡ 이, 「$3.14$ 라 적고 $3$ 으로 계산」은
          // ㉠ 이 잡는다. 바퀴 수 3 은 «더 잘지» 않으므로 통과한다.
          const used = new Set(
            [
              ...p.solution.matchAll(
                /(?:\\times|\\div)(3(?:\.1\d?)?)(?![\d.])/g,
              ),
            ].map((m) => m[1]!),
          );
          const finer = ["3", "3.1", "3.14"].filter(
            (v) => v.length > said.length && used.has(v),
          );
          if (!used.has(said))
            bad.push(
              `${where}: 발문은 $${said}$인데 해설에 그 값이 없다 — ${p.solution}`,
            );
          if (finer.length > 0)
            bad.push(
              `${where}: 발문은 $${said}$인데 해설이 [${finer.join(", ")}] 로 계산한다`,
            );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 — 원주율을 쓰는 갈래가 정말 있는가. 0 이면 위 검사는 아무것도 안 잰 것이다.
    expect(withPi).toBe(
      (tiersOf(unitOf("2-5-2")).length + tiersOf(unitOf("2-5-4")).length) * 300,
    );
  });

  it("연산 문형이 서고, 기본은 그 문형이 아니며, 심화만 되짚는다", () => {
    const CALC_SHAPE: Record<string, RegExp> = {
      "2-5-1": /^(반)?지름이 .*원 (안|밖)에 꼭 맞게 그린 .*둘레는 몇 cm입니까\?/,
      "2-5-2": /^지름이 .*원의 원주는 몇 cm입니까\?/,
      "2-5-3": /^지름이 .*원 (안|밖)에 꼭 맞게 그린 .*넓이는 몇 cm²입니까\?/,
      "2-5-4": /^반지름이 .*원이 있습니다\. 이 원의 넓이는 몇 cm²입니까\?/,
    };
    const DEEP_MARK: Record<string, RegExp> = {
      "2-5-1": /어떤 원 (안|밖)에 꼭 맞게 그린 (정육각형|정사각형)의 둘레가/,
      "2-5-2": /굴렸더니/,
      "2-5-3": /어떤 원 안에 꼭 맞게 그린 마름모의 넓이가/,
      "2-5-4": /넓이가 \$[\d.]+\$ cm²인 원이 있습니다/,
    };
    for (const code of G6_25_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const at = (t: ElemTier) =>
          generateElementaryProblem(unit, seed, t).content.replace(/\n+/g, " ");
        expect(
          CALC_SHAPE[code]!.test(at("연산")),
          `${code} 연산 seed=${seed}: ${at("연산")}`,
        ).toBe(true);
        expect(
          CALC_SHAPE[code]!.test(at("기본")),
          `${code} 기본 seed=${seed}: 연산 문형이다 — ${at("기본")}`,
        ).toBe(false);
        expect(
          DEEP_MARK[code]!.test(at("심화하")),
          `${code} 심화 seed=${seed}: 되짚는 표지가 없다 — ${at("심화하")}`,
        ).toBe(true);
        expect(
          DEEP_MARK[code]!.test(at("응용")),
          `${code} 응용 seed=${seed}: 심화처럼 되짚는다 — ${at("응용")}`,
        ).toBe(false);
      }
    }
  });

  it("갈래 넷은 같은 씨앗에서도 서로 다르고, 씨앗 16개면 갈래마다 8가지 이상이다", () => {
    for (const code of G6_25_CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const shown = tiersOf(unit).map(
          (t) => generateElementaryProblem(unit, seed, t).content,
        );
        expect(new Set(shown).size, `${code} seed=${seed}`).toBe(
          tiersOf(unit).length,
        );
      }
      for (const tier of tiersOf(unit)) {
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·꼬리 0·샌 소수·분수 없음", () => {
    const bad: string[] = [];
    for (const code of G6_25_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
            if (field.includes("\\frac"))
              bad.push(`${where} ${name}: 분수가 섞였다`);
            // D-74 이후 응용·심화는 소수가 **정상**이다. 다만 꼬리 0 과 샌 소수는 막는다.
            const trailing = field.match(/\d+\.\d*0(?![\d])/g);
            if (trailing)
              bad.push(`${where} ${name}: 꼬리 0 — ${trailing.join(",")}`);
            const runaway = field.match(/\d+\.\d{3,}/g);
            if (runaway) bad.push(`${where} ${name}: 샌 소수 ${runaway[0]}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
// ══════════════════════════════════════════════════════════════════════════
// 초6 `2-3 공간과 입체` (D-72 확대 11차분 — 6소단원 · 24갈래)
//
// ⚠️ **이 단원은 정답의 근거가 발문이 아니라 «그림»에 있다.** 발문은 「가로 $3$칸,
// 세로 $2$칸 바닥에 쌓은 모양입니다」까지만 말하고 **층수는 `figureSpec.voxels` 에만**
// 있다. 그래서 이 시험은 발문이 아니라 **그림을 되읽어** 다시 센다.
//
// 발문만 보고 검산하면 이 단원에서 잴 수 있는 것이 거의 없다 — 그러면
// 「값은 맞는데 그림이 배반한다」가 통째로 축 밖이 된다(이 저장소가 되풀이해 밟는 자리).
// 되읽는 쪽을 골랐으므로 **그림이 곧 참**이고, 그림과 발문이 어긋나는 것은
// 아래 「격자」 검사가 따로 잡는다. 둘이 서로의 사각지대를 덮는다.
// ══════════════════════════════════════════════════════════════════════════

const G6_23_CODES = [
  "2-3-1",
  "2-3-2",
  "2-3-3",
  "2-3-4",
  "2-3-5",
  "2-3-6",
] as const;

/** `voxels` 를 층수 격자로 되돌린다. 쌓기나무 그림이 아니면 `null`. */
function gridOf(spec: Record<string, unknown> | null): number[][] | null {
  if (!spec || spec.kind !== "stackCubes") return null;
  const vox = spec.voxels as [number, number, number][] | undefined;
  if (!Array.isArray(vox) || vox.length === 0) return null;
  const cols = Math.max(...vox.map((v) => v[0])) + 1;
  const rows = Math.max(...vox.map((v) => v[1])) + 1;
  const h = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (const [x, y, z] of vox) h[y]![x] = Math.max(h[y]![x]!, z + 1);
  return h;
}

type T23 = { shape: "수" | "쌍"; terms: number[] };
const one23 = (v: number): T23 => ({ shape: "수", terms: [v] });
const pair23 = (a: number, b: number): T23 => ({ shape: "쌍", terms: [a, b] });

/** 정답을 읽는다. `$7$` 은 수, `$3,\ 2$` 는 쌍. 그 밖이면 `null`(= 빨강). */
function readAns23(ans: string): T23 | null {
  const p = ans.match(/^\$(\d+),\\ (\d+)\$$/);
  if (p) return pair23(Number(p[1]), Number(p[2]));
  const s = ans.match(/^\$(\d+)\$$/);
  return s ? one23(Number(s[1])) : null;
}

/**
 * 갈래마다 **참**을 직접 만든다. 엔진 함수를 되부르지 않는다.
 *
 * 그림이 있는 갈래는 격자에서, 없는 갈래(역산 여섯 + `2-3-5 연산` + `2-3-6 연산`)는
 * **발문의 수**에서 센다. 발문을 못 읽으면 `null` — 조용히 넘기지 않고 빨개진다.
 */
function truthOf23(
  code: string,
  tier: ElemTier,
  q: string,
  h: number[][] | null,
): T23 | null {
  const cell = h ? h.flat() : [];
  const cols = h ? h[0]!.length : 0;
  const rows = h ? h.length : 0;
  const filled = cell.filter((v) => v > 0).length;
  const total = cell.reduce((s, v) => s + v, 0);
  const tallN = cell.filter((v) => v >= 2).length;
  const oneN = cell.filter((v) => v === 1).length;
  const maxH = cell.length > 0 ? Math.max(...cell) : 0;

  /** 발문에서 수를 뽑는다. 안 맞으면 `null` 이 위로 올라가 빨개진다. */
  const g = (re: RegExp): number[] | null => {
    const m = q.match(re);
    return m ? m.slice(1).map(Number) : null;
  };
  const need = (v: number[] | null): v is number[] => v !== null;

  switch (`${code} ${tier}`) {
    // ── 2-3-1 어느 방향에서 보았는지 ──
    case "2-3-1 연산":
      return h ? one23(cols * rows - filled) : null;
    case "2-3-1 기본":
      return h ? one23(filled) : null;
    case "2-3-1 응용":
      return h ? one23(Math.abs(tallN - oneN)) : null;
    case "2-3-1 심화하": {
      const v = g(/놓인 칸이 \$(\d+)\$칸이고, 그중 \$(\d+)\$칸은 두 층 이상/);
      return need(v) ? one23(v[0]! + v[1]!) : null;
    }

    // ── 2-3-2 개수 (1) ──
    case "2-3-2 연산":
    case "2-3-2 기본":
      return h ? one23(total) : null;
    case "2-3-2 응용": {
      const v = g(/쌓기나무 \$(\d+)\$개로 이 모양을 만들었다면/);
      return h && need(v) ? pair23(total, v[0]! - total) : null;
    }
    case "2-3-2 심화하": {
      // 준비한 것에서 **남은 것을 먼저 빼고** 나눈다(두 걸음). 예전에는 나눗셈 한 번이었다.
      const v = g(
        /쌓기나무 \$(\d+)\$개로 똑같은 모양 \$(\d+)\$개를 만들었더니 \$(\d+)\$개가 남았습니다/,
      );
      if (!need(v)) return null;
      const used = v[0]! - v[2]!;
      return used > 0 && used % v[1]! === 0 ? one23(used / v[1]!) : null;
    }

    // ── 2-3-3 개수 (2) ──
    case "2-3-3 연산":
      return h ? one23(total) : null;
    case "2-3-3 기본":
      return h ? one23(maxH) : null;
    case "2-3-3 응용":
      return h
        ? one23(cell.filter((v) => v >= 2).reduce((s, v) => s + v, 0))
        : null;
    case "2-3-3 심화하": {
      const v = g(/칸이 \$(\d+)\$칸이고, 칸에 적힌 수를 모두 더하니 \$(\d+)\$/);
      return need(v) ? one23(v[1]! - v[0]!) : null;
    }

    // ── 2-3-4 개수 (3) — 층별 ──
    case "2-3-4 연산":
      return h ? one23(filled) : null;
    case "2-3-4 기본":
      return h ? one23(tallN) : null;
    case "2-3-4 응용":
      return h ? one23(filled - tallN) : null;
    case "2-3-4 심화하": {
      // $2$층을 조건에서 먼저 만들고, 전체에서 두 층을 뺀다(두 걸음).
      // 예전에는 세 수를 그냥 더하는 것이라 되짚기도 조건 겹침도 없었다.
      const v = g(
        /\$1\$층에는 \$(\d+)\$개가 놓여 있고, \$2\$층은 \$1\$층보다 \$(\d+)\$개 적습니다\. 사용한 쌓기나무가 모두 \$(\d+)\$개/,
      );
      if (!need(v)) return null;
      const second = v[0]! - v[1]!;
      return one23(v[2]! - v[0]! - second);
    }

    // ── 2-3-5 개수 (4) — 직육면체 채우기 ──
    case "2-3-5 연산": {
      const v = g(
        /가로 \$(\d+)\$칸, 세로 \$(\d+)\$칸, 높이 \$(\d+)\$층인 직육면체/,
      );
      return need(v) ? one23(v[0]! * v[1]! * v[2]!) : null;
    }
    case "2-3-5 기본":
    case "2-3-5 응용": {
      const t = g(/높이 \$(\d+)\$층인 직육면체/);
      if (!h || !need(t)) return null;
      const box = cols * rows * t[0]!;
      return tier === "기본" ? one23(box - total) : pair23(box - total, box);
    }
    case "2-3-5 심화하": {
      const v = g(
        /쌓기나무를 \$(\d+)\$개 더 쌓았더니 가로 \$(\d+)\$칸, 세로 \$(\d+)\$칸, 높이 \$(\d+)\$층인/,
      );
      return need(v) ? one23(v[1]! * v[2]! * v[3]! - v[0]!) : null;
    }

    // ── 2-3-6 여러 가지 모양 만들기 ──
    case "2-3-6 연산": {
      const v = g(
        /쌓기나무 \$(\d+)\$개로 만든 모양이 있습니다\. 똑같은 모양 \$(\d+)\$개/,
      );
      return need(v) ? one23(v[0]! * v[1]!) : null;
    }
    case "2-3-6 기본": {
      const v = g(/똑같은 모양을 \$(\d+)\$개 만들려면/);
      return h && need(v) ? one23(total * v[0]!) : null;
    }
    case "2-3-6 응용": {
      const v = g(
        /똑같은 모양을 \$(\d+)\$개 만들려고 하는데 쌓기나무가 \$(\d+)\$개 있습니다/,
      );
      return h && need(v) ? one23(total * v[0]! - v[1]!) : null;
    }
    case "2-3-6 심화하": {
      const v = g(
        /쌓기나무 \$(\d+)\$개로 만드는 모양을 여러 개 만들었더니 쌓기나무 \$(\d+)\$개 중 \$(\d+)\$개가 남았습니다/,
      );
      if (!need(v)) return null;
      const used = v[1]! - v[2]!;
      return used % v[0]! === 0 ? one23(used / v[0]!) : null;
    }
    default:
      return null;
  }
}

describe("[초6 갈래] 2-3 공간과 입체", () => {
  it("소단원 여섯이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_23_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 **그림이 말하는 값**과 같다 (시험이 격자를 직접 센다)", () => {
    const bad: string[] = [];
    let checked = 0;
    let fromFigure = 0;
    for (const code of G6_23_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          const h = gridOf(p.figureSpec);
          if (h) fromFigure += 1;
          const want = truthOf23(code, tier, flat, h);
          if (!want) {
            bad.push(`${where}: 참을 못 세움 — ${flat}`);
            continue;
          }
          const got = readAns23(p.answer);
          if (!got) {
            bad.push(`${where}: 답 모양을 못 읽음 — ${p.answer}`);
            continue;
          }
          checked += 1;
          if (
            got.shape !== want.shape ||
            got.terms.length !== want.terms.length ||
            got.terms.some((v, i) => v !== want.terms[i])
          ) {
            bad.push(
              `${where}: 답 ${p.answer} ([${want.terms.join(", ")}] 이어야) — ${flat}`,
            );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_23_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
    // 분모 — **그림에서 센 자리가 정말 있는가.** 그림 갈래 16개 × 씨앗이다.
    // 0 이 되면 이 검사는 발문만 보는 것이 되어 이 단원의 축을 통째로 잃는다.
    expect(fromFigure).toBe(16 * SEEDS.length);
  });

  it("발문이 말한 격자 == 그림의 바닥, 그리고 **뜬 쌓기나무가 없다** — 씨앗 0~299 전수", () => {
    // ⚠️ 값 검산으로는 구조적으로 안 잡히는 부류다. 「가로 $3$칸」이라 적고 그림이
    // $2$칸이면 학생이 세는 바닥과 우리가 센 바닥이 다르다 — 그런데 답은 우리 격자로
    // 맞다. `heightGrid` 가 「가장자리 줄이 비면 안 된다」로, `withHole` 이
    // 「그 줄·칸에 다른 것이 남아야」로 막고 있는 자리이고, 그 두 가드를 여기서 잠근다.
    const bad: string[] = [];
    let gridSites = 0;
    let figSites = 0;
    for (const code of G6_23_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (let seed = 0; seed < 300; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const spec = p.figureSpec;
          const h = gridOf(spec);
          if (!h) continue;
          figSites += 1;
          // ㉠ 뜬 쌓기나무 — 칸마다 $z$ 가 $0$ 부터 이어져야 층수 합 == 개수다.
          const vox = spec!.voxels as [number, number, number][];
          const sum = h.flat().reduce((s, v) => s + v, 0);
          if (sum !== vox.length)
            bad.push(
              `${where}: 뜬 쌓기나무 (층수합 ${sum} ≠ 개수 ${vox.length})`,
            );
          // ㉡ 발문이 격자를 말하면 그림의 바닥과 같아야 한다. **여러 번 말하면 다 같아야.**
          const said = [
            ...p.content.matchAll(/가로 \$(\d+)\$칸, 세로 \$(\d+)\$칸/g),
          ];
          for (const m of said) {
            gridSites += 1;
            const c = Number(m[1]);
            const r = Number(m[2]);
            if (c !== h[0]!.length || r !== h.length)
              bad.push(
                `${where}: 발문 ${c}×${r} ≠ 그림 ${h[0]!.length}×${h.length}`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 둘 — 그림도 격자 문장도 **실제로 있었는가**.
    expect(figSites).toBe(16 * 300);
    // 격자를 말하는 자리는 갈래마다 다르다(`2-3-4 기본`은 안 말하고 `2-3-5`는 두 번
    // 말한다). **실측 리터럴로 못 박는다** — 문구가 바뀌면 여기가 먼저 빨개진다.
    expect(gridSites).toBe(17 * 300);
  });

  it("갈래를 가르는 성질이 실제로 선다 — 씨앗 0~299 전수", () => {
    // ⑴ **심화 여섯은 그림이 없다.** 역산인데 그림이 답을 그대로 보여 주면 되짚을 것이
    //    없어진다(설계 ⑷). 그림을 붙이는 순간 심화가 기본으로 내려앉는다.
    // ⑵ **응용 둘(2-3-2·2-3-5)은 쌍으로 답한다** — 두 걸음이 답에 드러나는 자리다.
    // ⑶ **연산·기본은 늘 한 수**. 쌍이 새면 「절차 한 번」이 아니다.
    // ⑷ **빈 칸이 늘 하나는 있다**(`withHole`) — 2-3-1 연산의 답이 늘 $0$ 이면 축이 죽는다.
    // ⑸ **두 층 이상인 자리가 늘 하나는 있다** — 2-3-4 기본의 답이 늘 $0$ 이면 같은 일이다.
    const bad: string[] = [];
    const PAIR = new Set(["2-3-2 응용", "2-3-5 응용"]);
    let emptyMin = Number.POSITIVE_INFINITY;
    let tallMin = Number.POSITIVE_INFINITY;
    for (const code of G6_23_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (let seed = 0; seed < 300; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          if (tier === "심화하" && p.figureSpec)
            bad.push(`${where}: 심화에 그림이 붙었다 — 되짚을 것이 없어진다`);
          const got = readAns23(p.answer);
          if (!got) {
            bad.push(`${where}: 답 모양을 못 읽음 — ${p.answer}`);
            continue;
          }
          const wantPair = PAIR.has(`${code} ${tier}`);
          if (wantPair !== (got.shape === "쌍"))
            bad.push(
              `${where}: 답이 ${got.shape} 인데 ${wantPair ? "쌍" : "수"} 이어야`,
            );
          if (got.terms.some((v) => v < 0))
            bad.push(`${where}: 답이 음수다 — ${p.answer}`);
          if (code === "2-3-1" && tier === "연산")
            emptyMin = Math.min(emptyMin, got.terms[0]!);
          if (code === "2-3-4" && tier === "기본")
            tallMin = Math.min(tallMin, got.terms[0]!);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect({ 빈칸최소: emptyMin, 두층최소: tallMin }).toEqual({
      빈칸최소: 1,
      두층최소: 1,
    });
  });

  it("같은 씨앗이면 같은 문항, 씨앗 16개면 갈래마다 여러 문항", () => {
    for (const code of G6_23_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        const a = generateElementaryProblem(unit, 4242, tier);
        const b = generateElementaryProblem(unit, 4242, tier);
        expect(a.content, `${code} ${tier} 재현`).toBe(b.content);
        expect(JSON.stringify(a.figureSpec), `${code} ${tier} 그림 재현`).toBe(
          JSON.stringify(b.figureSpec),
        );
        const rows = new Set(
          SEEDS.map((s) => {
            const p = generateElementaryProblem(unit, s, tier);
            return `${p.content}||${p.answer}||${JSON.stringify(p.figureSpec)}`;
          }),
        );
        expect(rows.size, `${code} ${tier} 다양성`).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·소수·분수 없음", () => {
    // 이 단원의 값은 **개수**뿐이라 소수도 분수도 설 자리가 없다. 하나라도 새면
    // 어딘가에서 나눗셈이 안 떨어진 것이다.
    const bad: string[] = [];
    for (const code of G6_23_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          for (const [name, field] of [
            ["발문", p.content],
            ["정답", p.answer],
            ["해설", p.solution],
          ] as const) {
            const bare = field.replace(/\$[^$]*\$/g, " ").match(/\d+/g);
            if (bare)
              bad.push(`${where} ${name}: KaTeX 밖 숫자 ${bare.join(",")}`);
            if (field.includes("\\frac"))
              bad.push(`${where} ${name}: 분수가 섞였다`);
            if (/\d\.\d/.test(field))
              bad.push(`${where} ${name}: 소수가 섞였다 — ${field}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
// ══════════════════════════════════════════════════════════════════════════
// 초6 `2-6 원기둥, 원뿔, 구` (D-72 확대 12차분 — 4소단원 · 16갈래)
//
// ⚠️ **`cylinder` 그림은 높이를 「$9$ cm」처럼 글자로 찍는다.** 실제로 렌더해 보고
// 알았다 — 원문 `grep` 으로는 `_text` 가 안 보였다(호출이 헬퍼 안쪽에 있다).
// `cuboid` 는 세 치수를 **다** 찍고, `cone`·`sphere`·`netCylinder`·`prism` 은
// 하나도 안 찍는다. 그래서 원기둥 갈래는 **발문이 말한 높이와 그림의 높이가 같은가**를
// 잠근다 — 어긋나면 지면에 «본문에 없는 수»가 뜨거나 **본문과 다른 수**가 뜬다.
// 값 검산으로는 구조적으로 안 잡히는 부류다(답은 양쪽 다 맞다).
// ══════════════════════════════════════════════════════════════════════════

const G6_26_CODES = ["2-6-1", "2-6-2", "2-6-3", "2-6-4"] as const;

/** `"303.8"` · `"452.16"` · `"30"` → 백분의 일 단위 정수. 못 읽으면 `null`. */
function toCents26(s: string): number | null {
  const m = s.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

/**
 * 발문이 말하는 값에서 답을 **다시 짓는다**. 엔진 함수를 되부르지 않는다.
 *
 * ⚠️ 「반지름」 안에 「지름」이 들어 있다. 뒤돌아보기(`(?<!반)`)를 안 걸면 반지름을
 * 지름으로 읽어 답이 **딱 두 배** 어긋난다 — 2-5 에서 실제로 밟은 함정이다.
 */
function truthOf26(code: string, tier: ElemTier, q: string): number | null {
  const one = (re: RegExp): number | null => {
    const m = q.match(re);
    return m ? Number(m[1]) : null;
  };
  const R = one(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
  const D = one(/(?<!반)지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
  const H = one(/높이[가는] \$(\d+)\\,\\mathrm\{cm\}\$/);
  const AREA = one(/넓이가 \$([\d.]+)\$ cm²/);
  const PERI = one(/둘레가 \$(\d+)\\,\\mathrm\{cm\}\$/);
  const CIRC = q.match(/둘레가 \$([\d.]+)\\,\\mathrm\{cm\}\$였습니다/);

  // ══ 확대 갈래 (D-113 3차분) — **모양 성질이 두 미지수를 묶는다** ══
  //
  // 아래 `switch` 보다 먼저 본다. 셋 다 발문이 「넓이가 …」·「둘레가 …」를 쓰는데,
  // 그 자리를 심화하 판독기가 먼저 물면 다른 값을 «참»으로 삼는다.
  if (tier === "심화중" && code === "2-6-1") {
    // 앞에서 본 모양이 정사각형 ⟹ 한 변 = 지름 = 높이. 넓이의 «같은 수 두 번 곱»을 되짚는다.
    if (AREA === null) return null;
    const side = Math.round(Math.sqrt(AREA));
    if (side * side !== AREA || side % 2 !== 0) return null;
    return side / 2;
  }
  if (tier === "심화중" && code === "2-6-2") {
    // 옆면이 정사각형 ⟹ 한 변 = 밑면의 둘레 = 높이. 둘레 ÷ 4 ÷ 3.14 ÷ 2.
    const per = q.match(/둘레가 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
    if (!per) return null;
    const c = toCents26(per[1]!);
    if (c === null || c % 4 !== 0) return null;
    const side = c / 4;
    if (side % 628 !== 0) return null;
    return side / 628;
  }
  if (tier === "심화상" && code === "2-6-3") {
    // 앞에서 본 삼각형의 넓이 = (반지름)×(높이). 짝을 만들어 **차**를 견준다.
    //
    // ⚠️ 예전 조건은 「높이가 $cap$ 보다 짧을 때」였는데 짝을 **하나도 안 걸렀다**
    //    (적대 검토 ⑵ 실측 0/1200) — 답이 늘 마지막 짝이라 D-115 ⑾ 로는 «중»이었다.
    //    이제 「높이와 반지름의 차」라 짝마다 계산해 견주어야 한다.
    const diff = one(/차가 \$(\d+)\$ cm일 때/);
    if (AREA === null || diff === null) return null;
    const hit: number[] = [];
    for (let r = 1; r * r < AREA; r += 1) {
      if (AREA % r !== 0) continue;
      const h = AREA / r;
      if (h > r && h - r === diff) hit.push(r);
    }
    return hit.length === 1 ? hit[0]! : null;
  }

  switch (`${code} ${tier}`) {
    case "2-6-1 연산":
      return R === null ? null : 2 * R;
    case "2-6-1 기본":
      return D === null || H === null ? null : D * H;
    case "2-6-1 응용":
      return R === null || H === null ? null : 2 * (2 * R + H);
    case "2-6-1 심화하": {
      if (PERI === null || H === null) return null;
      if (PERI % 2 !== 0) return null;
      const across = PERI / 2 - H;
      return across % 2 === 0 ? across / 2 : null;
    }

    // ⚠️ 세 갈래가 **옆면의 «둘레»** 로 옮겨졌다(적대 검토 ⑷ — 예전에는 2-5-2 와
    //    계산이 글자 그대로 같았다). 원에는 «둘레와 높이를 더하는» 자리가 없어서
    //    사슬에 덧셈/뺄셈이 하나 낀다.
    case "2-6-2 연산":
      // 둘레 = (가로 + 세로) × 2, 가로 = 지름 × 3.
      return D === null || H === null ? null : 2 * (3 * D + H);
    case "2-6-2 기본":
      return R === null ? null : 6 * R;
    case "2-6-2 응용":
      // 둘레 = (2r×3.1 + h) × 2. 십분의 일 단위 정수로 견준다(부동소수 안 씀).
      return R === null || H === null ? null : 2 * (2 * R * 31 + H * 10);
    case "2-6-2 심화하": {
      // 답(반지름)은 (둘레 ÷ 2 − 높이) ÷ 3.14 ÷ 2 다. 백분의 일 단위로 나눠떨어져야 한다.
      const a = q.match(/둘레가 \$([\d.]+)\$ cm/);
      if (!a || H === null) return null;
      const c = toCents26(a[1]!);
      if (c === null || c % 2 !== 0) return null;
      const lat = c / 2 - H * 100;
      if (lat <= 0 || lat % 628 !== 0) return null;
      return lat / 628;
    }

    case "2-6-3 연산":
      return R === null ? null : 2 * R;
    case "2-6-3 기본":
      return D === null || H === null ? null : (D * H) / 2;
    case "2-6-3 응용":
      return R === null || H === null ? null : R * H;
    case "2-6-3 심화하": {
      if (AREA === null || H === null) return null;
      return AREA % H === 0 ? AREA / H : null;
    }

    case "2-6-4 연산":
      return D === null ? null : D / 2;
    case "2-6-4 기본":
      return R === null ? null : 2 * R;
    case "2-6-4 응용":
      // 둘레 = 2r × 3.1, 십분의 일 단위.
      return R === null ? null : 2 * R * 31;
    case "2-6-4 심화하": {
      if (!CIRC) return null;
      const c = toCents26(CIRC[1]!);
      return c === null || c % 628 !== 0 ? null : c / 628;
    }
    default:
      return null;
  }
}

/** 답을 견줄 단위 — 소수가 나오는 두 갈래는 십분의 일 단위로 견준다. */
const TENTHS_26 = new Set(["2-6-2 응용", "2-6-4 응용"]);

describe("[초6 갈래] 2-6 원기둥, 원뿔, 구", () => {
  it("소단원 넷이 갈래 넷을 전부 낸다", () => {
    for (const code of G6_26_CODES) {
      expectCoreTiers(unitOf(code), code);
    }
  });

  it("정답은 발문이 말하는 값과 같다 (시험이 공식을 직접 든다)", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of G6_26_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const where = `${code} ${tier} seed=${seed}`;
          const flat = p.content.replace(/\n+/g, " ");
          const want = truthOf26(code, tier, flat);
          if (want === null) {
            bad.push(`${where}: 발문을 못 읽음 — ${flat}`);
            continue;
          }
          const m = p.answer.match(/^\$([\d.]+)\$$/);
          if (!m) {
            bad.push(`${where}: 답 모양을 못 읽음 — ${p.answer}`);
            continue;
          }
          const key = `${code} ${tier}`;
          const got = TENTHS_26.has(key)
            ? Math.round(Number(m[1]) * 10)
            : Number(m[1]);
          checked += 1;
          if (got !== want)
            bad.push(`${where}: 답 ${p.answer} (${want} 이어야) — ${flat}`);
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    expect(checked).toBe(
      G6_26_CODES.reduce((n, c) => n + tiersOf(unitOf(c)).length, 0) *
        SEEDS.length,
    );
  });

  it("**그림의 치수가 발문과 같다** — 씨앗 0~299 전수", () => {
    // `cylinder` 는 높이를 글자로 찍으므로 어긋나면 지면에서 바로 보인다.
    // 나머지 입체는 안 찍지만, 그림이 발문과 다른 물건이면 그것도 결함이다.
    const bad: string[] = [];
    const seen = new Map<string, number>();
    for (const code of G6_26_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (let seed = 0; seed < 300; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          const f = p.figureSpec;
          // 심화 **계열 셋**은 전부 역산이다 — 되짚을 값을 그림이 알려 주면 마디가
          // 안 열린다(`cylinder` 는 높이를 글자로 찍고 `cone`·`netCylinder` 는
          // 밑면을 그대로 보여 준다). 앞판은 「심화하」만 적어 두었는데, D-113 으로
          // 축이 여섯이 되면서 그 문자열이 **확대 갈래를 놓쳤다.**
          if (tier === "심화하" || tier === "심화중" || tier === "심화상") {
            if (f)
              bad.push(`${code} ${tier} seed=${seed}: 역산인데 그림이 붙었다`);
            continue;
          }
          if (!f) {
            bad.push(`${code} ${tier} seed=${seed}: 그림이 없다`);
            continue;
          }
          const kind = String(f.kind);
          seen.set(kind, (seen.get(kind) ?? 0) + 1);
          const q = p.content.replace(/\n+/g, " ");
          const r = q.match(/반지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
          const d = q.match(/(?<!반)지름이 \$(\d+)\\,\\mathrm\{cm\}\$/);
          const h = q.match(/높이[가는] \$(\d+)\\,\\mathrm\{cm\}\$/);
          const wantR = r ? Number(r[1]) : d ? Number(d[1]) / 2 : null;
          if (wantR !== null && f.r !== wantR)
            bad.push(
              `${code} ${tier} seed=${seed}: 그림 r=${f.r} ≠ 발문 ${wantR}`,
            );
          // 높이를 **글자로 찍는** 그림은 발문이 그 값을 말해야 한다.
          if (kind === "cylinder") {
            if (h === null)
              bad.push(
                `${code} ${tier} seed=${seed}: cylinder 는 높이를 지면에 찍는데 발문이 높이를 안 말한다`,
              );
            else if (f.h !== Number(h[1]))
              bad.push(
                `${code} ${tier} seed=${seed}: 그림 h=${f.h} ≠ 발문 ${h[1]}`,
              );
          }
          // 전개도의 원주율은 발문에 적은 값과 같아야 가로 비율이 맞는다.
          if (kind === "netCylinder") {
            const pi = q.match(/\(원주율: \$([\d.]+)\$\)/);
            if (!pi)
              bad.push(
                `${code} ${tier} seed=${seed}: 전개도인데 원주율을 안 적었다`,
              );
            else if (String(f.pi) !== pi[1])
              bad.push(
                `${code} ${tier} seed=${seed}: 그림 pi=${f.pi} ≠ 발문 ${pi[1]}`,
              );
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 — 네 입체가 **다 나왔는가**. 하나라도 0 이면 그 종류는 «안 잰» 것이다.
    expect([...seen.keys()].sort()).toEqual([
      "cone",
      "cylinder",
      "netCylinder",
      "sphere",
    ]);
  });

  it("원주율은 D-74 표대로 서고, **발문에 적은 값으로 해설이 계산한다** — 씨앗 0~299", () => {
    // 2-5 와 같은 축. 「$3$ 이라 적고 $3.14$ 로 계산」은 양쪽 다 산술이 맞아
    // 값 검산으로는 안 잡히고 지면에서만 틀린다.
    const WANT: Record<string, string> = {
      연산: "3",
      기본: "3",
      응용: "3.1",
      심화하: "3.14",
      심화중: "3.14",
      심화상: "3.14",
    };
    const bad: string[] = [];
    let withPi = 0;
    for (const code of G6_26_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        for (let seed = 0; seed < 300; seed += 1) {
          const p = generateElementaryProblem(unit, seed, tier);
          const said = p.content.match(/\(원주율: \$([\d.]+)\$\)/);
          if (!said) continue;
          withPi += 1;
          if (said[1] !== WANT[tier])
            bad.push(
              `${code} ${tier} seed=${seed}: 원주율 ${said[1]} (${WANT[tier]} 이어야)`,
            );
          const used = new Set(
            [
              ...p.solution.matchAll(
                /(?:\\times|\\div)(3(?:\.1|\.14)?)(?![\d.])/g,
              ),
            ].map((m) => m[1]!),
          );
          if (!used.has(said[1]!))
            bad.push(
              `${code} ${tier} seed=${seed}: 해설이 ${said[1]} 로 계산하지 않는다`,
            );
          const finer = ["3", "3.1", "3.14"].filter(
            (v) => v.length > said[1]!.length && used.has(v),
          );
          if (finer.length > 0)
            bad.push(
              `${code} ${tier} seed=${seed}: 해설이 [${finer.join(", ")}] 로 계산한다`,
            );
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
    // 분모 — 원주율을 적는 자리가 정말 있는가(2-6-2 **전 갈래** + 2-6-4 응용·심화하).
    // ⚠️ 앞판은 `6 * 300` 손 상수였다. 2-6-2 에 갈래가 하나 늘자 바로 어긋났다 —
    //    갈래 수에서 유도해 두면 다음 회차가 손으로 세지 않아도 된다.
    expect(withPi).toBe((tiersOf(unitOf("2-6-2")).length + 2) * 300);
  });

  it("같은 씨앗이면 같은 문항, 씨앗 16개면 갈래마다 여러 문항", () => {
    for (const code of G6_26_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
        const a = generateElementaryProblem(unit, 4242, tier);
        const b = generateElementaryProblem(unit, 4242, tier);
        expect(a.content, `${code} ${tier} 재현`).toBe(b.content);
        expect(JSON.stringify(a.figureSpec), `${code} ${tier} 그림 재현`).toBe(
          JSON.stringify(b.figureSpec),
        );
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

  it("갈래 문항도 D-66 표기를 지킨다 — KaTeX 밖 숫자·꼬리 0·샌 소수·분수 없음", () => {
    const bad: string[] = [];
    for (const code of G6_26_CODES) {
      const unit = unitOf(code);
      for (const tier of tiersOf(unit)) {
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
            if (field.includes("\\frac"))
              bad.push(`${where} ${name}: 분수가 섞였다`);
            const trailing = field.match(/\d+\.\d*0(?![\d])/g);
            if (trailing)
              bad.push(`${where} ${name}: 꼬리 0 — ${trailing.join(",")}`);
            const runaway = field.match(/\d+\.\d{3,}/g);
            if (runaway) bad.push(`${where} ${name}: 샌 소수 ${runaway[0]}`);
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
// ══════════════════════════════════════════════════════════════════════════
// 초6 **1-5 그래프** — 역산의 답이 지면에 찍히지 않는가
//
// 원그래프·띠그래프는 **비율을 글자로 찍는다.** `_pie_chart`
// (`scripts/figure/elem_advanced.py:804`)는 %를 **두 곳**에 쓴다 — 부채꼴 안
// (`pct >= 8` 일 때)과 범례(`{label} {pct}%`). 그래서 「그 항목을 고른 학생이 몇
// 명인가」를 되짚는 갈래에서 **전체가 $100$명이면** 배율이 $1$ 이라 답이 곧 그
// 항목의 %가 되고, 학생은 비례식을 세우지 않고 **그 부채꼴을 읽으면** 맞힌다.
//
// ── 열쇠를 좁힌 근거 (이것이 이 블록에서 가장 중요한 부분이다) ──────────────
//
// 처음 쓴 열쇠는 **「답이 지면의 어느 %와도 같지 않다」**였다. 그것으로 재니
// 씨앗 0~399 에서 **294자리**가 걸렸는데(1-5-5 응용 208 · 1-5-1 응용 86)
// **전부 거짓 경보**다. 답이 «명 수»이고 그림이 «%»라 **수만 우연히 같을 뿐**,
// 그 수가 **어느 항목의 것인지** 학생은 알 길이 없다.
//
// 읽혀서 위험한 것은 **답이 «묻고 있는 바로 그 항목»의 %와 같을 때**뿐이다.
// 그리고 답 $=$ 전체 $\times$ 그 항목 %$/100$ 이므로,
// **답 $=$ 그 항목의 % $\iff$ 전체 $=100$** 이다 — 정확히 동치다. 다른 전체에서는
// 절대 안 겹친다. 그래서 잠그는 것은 **「전체가 $100$이 아니다」** 하나다.
//
// ⚠️ 거짓 경보는 가드를 끈다(2026-08-20). 294자리가 늘 빨간 검사를 남겼으면
//    다음 사람이 이 검사를 지웠을 것이고, 그때 **진짜 113+115자리도 같이** 안 보인다.
//
// ⚠️⚠️ **눈금을 «문자열»로 박는다.** 엔진을 고치면 살아 있는 양성이 **사라지고**,
//    그때부터 이 검사는 전량 초록이라 잘 도는 것처럼 보이지만 **재현율을 영영 못
//    잰다**(D-66 ⒀ 의 그 함정). 아래 일곱은 **고치기 전** 엔진이 실제로 낸 것이다.
// ══════════════════════════════════════════════════════════════════════════

/** 그림 스펙에서 **지면에 찍히는** 비율. 비율을 안 찍는 그림이면 빈 배열. */
function pctsOf(spec: Record<string, unknown> | null): number[] {
  if (!spec) return [];
  const items = (spec.slices ?? spec.segments) as { pct: number }[] | undefined;
  return Array.isArray(items) ? items.map((i) => i.pct) : [];
}

const readAnsCount = (a: string) => Number(a.replace(/[^\d]/g, ""));

/** 넓은 열쇠 — 「답이 어느 %와도 같지 않다」. **거짓 경보가 난다**(아래가 증명). */
const wideLeak = (answer: string, pcts: number[]) =>
  pcts.includes(readAnsCount(answer));

/** 좁은 열쇠 — 「답이 **묻는 그 항목**의 %와 같다」. 이것만 실제로 읽힌다. */
const realLeak = (answer: string, askedPct: number | null) =>
  askedPct !== null && readAnsCount(answer) === askedPct;

/**
 * 고치기 **전** 실제 산출물. `asked` 는 발문이 «몇 명이냐»고 묻는 항목의 %
 * (합·차처럼 한 항목이 아니면 `null`).
 */
const GAUGE = [
  {
    why: "1-5-3 심화 — 배율 1. 봄을 묻는데 답 $20$이 봄의 $20\\%$",
    answer: "$20$",
    pcts: [20, 45, 35],
    asked: 20,
    real: true,
  },
  {
    why: "1-5-3 심화 — 배율 1. 지하철을 묻는데 답 $45$가 지하철의 $45\\%$",
    answer: "$45$",
    pcts: [20, 45, 35],
    asked: 45,
    real: true,
  },
  {
    why: "1-5-5 심화 — 배율 1. 가장 낮은 항목을 묻는데 답 $25$가 그 항목의 $25\\%$",
    answer: "$25$",
    pcts: [30, 25, 45],
    asked: 25,
    real: true,
  },
  {
    // ⚠️ 넓은 열쇠는 이것을 «샌다»고 한다. 아니다 — 묻는 항목은 $15\%$ 인데 답은
    // $30$ 이라, 그 부채꼴을 읽은 학생은 $15$ 라고 쓴다. $30$ 은 **다른** 항목의 값이다.
    why: "1-5-5 심화 배율 2 — 답 $30$이 «다른» 항목의 $30\\%$와 우연히 같다",
    answer: "$30$",
    pcts: [20, 30, 15, 35],
    asked: 15,
    real: false,
  },
  {
    why: "1-5-5 응용 — 답이 «몇 %»이고 한 항목이 아니다(합에서 절반을 뺀 값)",
    answer: "$15$",
    pcts: [35, 20, 15, 30],
    asked: null,
    real: false,
  },
  {
    why: "1-5-1 응용 — 답이 두 항목의 «차»라 어느 부채꼴도 그 수를 뜻하지 않는다",
    answer: "$15$",
    pcts: [15, 30, 35, 20],
    asked: null,
    real: false,
  },
  {
    // 1-5-1 심화는 «전체»를 묻는다. 전체는 늘 어느 %보다도 크므로 **구조적으로**
    // 안전하다 — 배율이 1 이어도 그렇다(실측 배율1 128 · 겹침 0). 고치면 안 된다.
    why: "1-5-1 심화 — «전체»를 묻는 갈래. 배율 1 이어도 답이 %와 같을 수 없다",
    answer: "$400$",
    pcts: [30, 20, 30, 20],
    asked: null,
    real: false,
  },
] as const;

describe("[초6 그래프] 역산의 답이 지면에 찍히지 않는다", () => {
  it("눈금 — 좁은 열쇠는 갈라내고, **넓은 열쇠는 거짓 경보를 낸다**", () => {
    // 좁은 열쇠가 「예」와 「아니오」를 **둘 다** 낼 수 있어야 아래 쓸기의 0 이
    // «깨끗»을 뜻한다. 그리고 넓은 열쇠가 왜 못 쓰는지도 여기서 못 박는다 —
    // 넓은 쪽은 ④⑤⑥ 을 «샌다»고 하는데 셋 다 아니다.
    expect(GAUGE.map((c) => realLeak(c.answer, c.asked))).toEqual(
      GAUGE.map((c) => c.real),
    );
    expect(GAUGE.map((c) => wideLeak(c.answer, [...c.pcts]))).toEqual([
      true,
      true,
      true,
      true, // ← 거짓 경보
      true, // ← 거짓 경보
      true, // ← 거짓 경보
      false,
    ]);
  });

  it("「그 항목이 몇 명인가」를 되짚는 심화는 전체를 $100$명으로 뽑지 않는다 — 씨앗 0~399", () => {
    // 답 = 전체 × (그 항목 %) ÷ 100 이므로 **답 = 그 항목 % ⟺ 전체 = 100** 이다.
    // 그래서 이 한 줄이 「답이 지면에서 읽힌다」와 정확히 동치다.
    const REVERSE = ["1-5-3", "1-5-5"] as const;
    const bad: string[] = [];
    let measured = 0;
    for (const code of REVERSE) {
      const u = unitOf(code);
      for (let seed = 0; seed < 400; seed += 1) {
        const p = generateElementaryProblem(u, seed, "심화하");
        const pcts = pctsOf(p.figureSpec);
        if (pcts.length === 0) {
          bad.push(`${code} seed=${seed}: 비율을 찍는 그림이 없다`);
          continue;
        }
        // 전체는 해설이 직접 적는다 — 「$45\div\frac{45}{100}=100$ 명입니다」.
        // 못 읽으면 **조용히 넘기지 않고** 빨개진다(해설 문구가 바뀌면 여기가 운다).
        const m = p.solution.match(/=(\d+)\$ 명입니다/);
        if (!m) {
          bad.push(
            `${code} seed=${seed}: 해설에서 전체를 못 읽음 — ${p.solution}`,
          );
          continue;
        }
        measured += 1;
        if (Number(m[1]) === 100)
          bad.push(
            `${code} seed=${seed}: 전체가 $100$명 — 답 ${p.answer} 이 그 항목의 %와 같다 ` +
              `(지면 %[${pcts.join(",")}])`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 분모 — 정말 잰 자리가 있는가. 0 이면 이 검사는 아무것도 증명하지 않는다.
    expect(measured).toBe(REVERSE.length * 400);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// 초6 **전량** — 단위 뒤 조사는 «소리»로 고른다
//
// `rules.ts` 의 R-조사는 이 부류를 **판정 밖**이라고 스스로 적어 두었다(「$3$ kg을」).
// 수식 밖 낱말이 소리의 끝을 정하기 때문이다. 그 사각지대를 여기서 덮는다 —
// 단위 기호는 목록이 닫혀 있어 소리를 표로 적을 수 있다.
//
// 2026-08-23 실측: 이 검사를 처음 돌리자 **7자리**가 틀려 있었다.
//  · 「몇 kg**가** 남습니까?」(킬로그램가) — 맨 글자 자리
//  · 「$2.4\,\mathrm{kg}$**를**」·「$0.6\,\mathrm{kg}$ **가**」 — **KaTeX 로 감싼** 자리 6곳.
//    이쪽은 R-조사도 g3 의 소스 판정기도 구조적으로 못 본다(하나는 판정 밖, 하나는
//    `josa()` 호출이 아니라 리터럴이라). **셋이 서로의 사각지대를 덮는다.**
// ══════════════════════════════════════════════════════════════════════════
// 초6 **전량** — 정답이 한쪽으로 쏠리지 않는다
//
// 2026-08-24: `2-3-3 기본`(가장 높이 쌓은 자리는 몇 층인가)의 답이 **$3$ 이 90.3%**
// 였다($3$ 361 / $2$ 39, 씨앗 400). 학생이 문제를 안 풀고 «$3$» 이라 써도 열에 아홉
// 맞는다. 원인은 `heightGrid` 가 칸마다 $0$~$3$ 을 **따로** 뽑는 것이었다 — 칸이 넷만
// 넘으면 그 최댓값은 거의 늘 $3$ 이다.
//
// ⚠️ **어떤 값 검산도 이 부류를 못 본다** — 답은 언제나 옳다. 「한 가지뿐인가」에도
// 안 걸린다(두 가지는 나온다). **분포**를 봐야 보이고, 그 축이 아예 없었다.
//
// ⚠️ **문턱 $0.8$ 이 두 곳에 있다** — 여기와 `probe-elem-rules` 의 `R9-c 정답고정`.
//    옮기게 되면 **둘 다** 옮길 것. 한쪽만 고치면 갈라져도 아무도 모른다.
// ⚠️ 그림이 넷 미만인 자리는 **판정하지 않는다** — 「쏠림」과 「못 셈」이 안 갈린다.
// ══════════════════════════════════════════════════════════════════════════

describe("[초6 전량] 정답 쏠림", () => {
  it("그림이 붙은 갈래에서 한 답이 문턱을 넘지 않는다 — 씨앗 0~399", () => {
    const over: string[] = [];
    let cells = 0;
    let worst = 0;
    let worstAt = "";
    let g233: { answer: string; share: number; n: number } | null = null;
    let g233Set: string[] = [];
    for (const u of elementaryUnits().filter((x) => x.grade === "초6")) {
      const tiers =
        supportedTiers(u).length > 0 ? [undefined, ...tiersOf(u)] : [undefined];
      for (const tier of tiers) {
        const items = Array.from({ length: 400 }, (_, seed) => {
          const p = generateElementaryProblem(u, seed, tier);
          return { answer: p.answer, figureSpec: p.figureSpec };
        });
        // 판정도 셈도 판정기와 **같은 함수**다. 「넷 미만이면 판정 안 함」도 그 안에 있다.
        const top = topAnswerShare(items);
        if (!top) continue;
        cells += 1;
        const at = `${u.section.slice(0, 5)} ${tier ?? "표준"}`;
        if (top.share > worst) {
          worst = top.share;
          worstAt = at;
        }
        const hit = answerSkewAmongFigures(items);
        if (hit)
          over.push(
            `${at}: 최다 답 ${hit.answer} 이 ${(hit.share * 100).toFixed(1)}% (${hit.n}건)`,
          );
        if (at === "2-3-3 기본") {
          g233 = top;
          g233Set = [
            ...new Set(
              items.filter((i) => i.figureSpec != null).map((i) => i.answer),
            ),
          ].sort();
        }
      }
    }
    expect(over).toEqual([]);
    // 분모 — 잰 셀이 정말 있는가. 0 이면 이 검사는 아무것도 증명하지 않는다.
    expect(cells).toBeGreaterThan(20);

    // 여유 — 가장 쏠린 자리가 문턱에 **붙어 가는지** 본다. 보통 가드는 「지금 넘었나」만
    // 보는데, 이 줄은 **가드가 장식이 되어 가는 것**을 미리 알려 준다.
    // 실측(2026-08-24): 가장 쏠린 자리가 `1-5-3 응용` 52.5% 로 문턱과 사이가 넉넉하다.
    expect(worst, `가장 쏠린 자리 ${worstAt}`).toBeLessThan(
      ANSWER_SKEW_MAX - 0.1,
    );

    // ── 고친 자리를 따로 못 박는다 ────────────────────────────────────
    // 「두 가지 나오니 됐다」로 $90:10$ 이 다시 통과하지 않게 **이 자리만** 더 좁게 건다.
    // 고치기 전 90.3%($3$ 361 / $2$ 39) · 고친 뒤 34.0%($2$ 132 / $3$ 132 / $4$ 136).
    expect(g233, "2-3-3 기본을 못 쟀다").not.toBeNull();
    expect({ 가짓수: g233Set, 반쪽넘음: (g233?.share ?? 1) >= 0.5 }).toEqual({
      가짓수: ["$2$", "$3$", "$4$"],
      반쪽넘음: false,
    });
  });
});
// ══════════════════════════════════════════════════════════════════════════

describe("[초6 전량] 단위 뒤 조사", () => {
  it("«단위 + 조사» 가 전부 소리와 맞는다 (표준·갈래 전량, 씨앗 0~199)", () => {
    /** 단위를 **읽었을 때** 받침이 있는가. 그램·킬로그램만 있다. */
    const FINAL: Record<string, boolean> = {
      m: false,
      cm: false,
      km: false,
      L: false,
      mL: false,
      g: true,
      kg: true,
    };
    const NEEDS: Record<string, boolean> = {
      을: true,
      를: false,
      이: true,
      가: false,
      과: true,
      와: false,
      은: true,
      는: false,
    };
    // 맨 글자(`몇 kg가`)와 KaTeX 로 감싼 것(`$…\mathrm{kg}$ 가`) 둘 다 본다.
    const RE =
      /(?:\mathrm\{(kg|mL|km|cm|m|L|g)\}\$ ?|(kg|mL|km|cm|m|L|g))(을|를|이|가|과|와|은|는)(?![가-힣])/g;
    const bad = new Set<string>();
    let seen = 0;
    for (const u of elementaryUnits().filter((x) => x.grade === "초6")) {
      const tiers =
        supportedTiers(u).length > 0 ? [undefined, ...tiersOf(u)] : [undefined];
      for (const tier of tiers) {
        for (let seed = 0; seed < 200; seed += 1) {
          const p = generateElementaryProblem(u, seed, tier);
          for (const field of [p.content, p.solution]) {
            for (const m of field.matchAll(RE)) {
              seen += 1;
              const sym = (m[1] ?? m[2])!;
              if (NEEDS[m[3]!] !== FINAL[sym]) {
                bad.add(`${u.section} ${tier ?? "표준"}: ${m[0]}`);
              }
            }
          }
        }
      }
    }
    expect([...bad].slice(0, 8)).toEqual([]);
    // 분모 — 잴 자리가 정말 있는가. 0 이면 이 검사는 아무것도 증명하지 않는다.
    expect(seen).toBeGreaterThan(1000);
  });
});
