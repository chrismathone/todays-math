/**
 * 소단원 **이름이 내건 조건**을 그 생성기가 실제로 지키는가.
 *
 * 왜 따로 있나 — `probe-elem-rules.ts` 의 가드는 **표기**를 본다. 표기가 완벽해도
 * `2-4-3 (자연수)×(**1보다 작은 소수**)의 계산` 이 `7 × 2.0` 을 내는 것은 못 잡는다.
 * 2.0 은 1보다 작지 않다. 이건 **에러를 안 내는 틀린 문항**이라 스스로 신고하지 않는다.
 *
 *   npx tsx scripts/qa/probe-elem-section-conditions.ts
 *   npx tsx scripts/qa/probe-elem-section-conditions.ts 초5
 *
 * ⚠️ 조건을 못 읽는 소단원은 **`미판정` 으로 반드시 출력한다.** 손으로 적은 조건 목록은
 * 새는데, 조용히 0이 되면 「없다」와 「못 센다」를 구분할 수 없다
 * (CLAUDE.md 2026-08-18 `report-missing-figures.ts` 와 같은 태도).
 */
import { ELEM_TIERS, type ElemTier } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

/**
 * 여러 씨앗으로 봐야 «가끔 어기는» 생성기가 드러난다.
 *
 * ⚠️ **표본이 갈래의 한 가지를 통째로 놓치면 초록이 «사고»가 된다.**
 * 2026-08-23 실측: 초6 `1-1-1 응용` 은 두 모양(남은 양 / 정다각형)을 **46:54** 로 내는데
 * 씨앗 8개가 **8/8 한쪽만** 뽑았다(그럴 확률 ≈0.7%). 그 위의 「조건 위반 0」은 그 가지에
 * 대해 아무것도 증명하지 않았고, 강제로 그 가지를 내게 하자 곧바로 빨강이 나왔다.
 * 씨앗을 40개로 늘리면 한쪽만 나올 확률이 실질적으로 0이다(`0.54^40 ≈ 1e-11`).
 *
 * 앞 8개는 **그대로 둔다** — 예전 실행과 견줄 수 있어야 「늘려서 새로 나온 것」이 보인다.
 */
const SEEDS = [
  20260821,
  7,
  1234,
  99991,
  20260822,
  555,
  31337,
  4242,
  ...Array.from({ length: 32 }, (_, i) => i * 613 + 101),
];

type Unit = ReturnType<typeof elementaryUnits>[number];

/**
 * 이 소단원이 낼 수 있는 문항 갈래 — 표준(`undefined`) + 등록된 난이도 4단 (D-71·D-72).
 *
 * ⚠️ **갈래를 안 세면 그 축은 가드 밖이다.** 2026-08-23 실측: 파일럿 갈래에
 * 「정답 +7 · KaTeX 미감쌈 · 맨 숫자 999」를 심었는데 판정기 넷이 **전부 초록**이었다.
 * 갈래가 없는 소단원은 표준 하나뿐이라 예전과 완전히 같다.
 */
function variantsOf(unit: Unit): (ElemTier | undefined)[] {
  return supportedTiers(unit).length > 0
    ? [undefined, ...ELEM_TIERS]
    : [undefined];
}

const tierLabel = (tier: ElemTier | undefined) => (tier ? ` «${tier}»` : "");

/** 발문에서 수를 뽑는다 — KaTeX 안팎을 가리지 않는다. */
function numbers(text: string): number[] {
  return (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** `\frac{a}{b}` 짝. */
function fracs(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)) {
    out.push([Number(m[1]), Number(m[2])]);
  }
  return out;
}

/** 소수점 아래 자릿수 — `0.30` 은 2. 글자로 세야 한다(`0.30` 을 수로 읽으면 0.3 이다). */
function decimalPlaces(text: string): number[] {
  return [...text.matchAll(/\d+\.(\d+)/g)].map((m) => m[1]!.length);
}

/**
 * 식의 피연산자 하나 — `2\frac{1}{3}`(대분수)·`\frac{1}{3}`·`4.83`·`16` 을 가른다.
 * `dp` 는 소수점 아래 자릿수(소수만), `denom` 은 분모(분수만).
 */
type Operand = {
  kind: "자연수" | "소수" | "분수";
  value: number;
  dp: number;
  denom?: number;
};

const NUM_TOKEN = String.raw`(?:\d+\s*)?\\frac\{\d+\}\{\d+\}|\d+\.\d+|\d+`;

function classifyOperand(tok: string): Operand {
  const frac = tok.match(/^(\d+)?\s*\\frac\{(\d+)\}\{(\d+)\}$/);
  if (frac) {
    const whole = frac[1] ? Number(frac[1]) : 0;
    return {
      kind: "분수",
      value: whole + Number(frac[2]) / Number(frac[3]),
      dp: 0,
      denom: Number(frac[3]),
    };
  }
  if (tok.includes(".")) {
    return { kind: "소수", value: Number(tok), dp: tok.split(".")[1]!.length };
  }
  return { kind: "자연수", value: Number(tok), dp: 0 };
}

/**
 * `a\div b`·`a\times b` 의 두 피연산자. 식이 없으면 null.
 *
 * ⚠️ null 을 받는 검사는 **위반**으로 처리한다 — 이 소단원들의 발문은 전부 식 하나다
 * (씨앗 120개 실측: 소단원 16개 모두 뼈대 1가지). 문장형이 생기면 여기서 빨개지므로
 * 그때 이 추출기를 넓힌다 — 조용히 통과시키면 그 부류가 통째로 사각지대가 된다.
 */
function operandsOf(
  content: string,
  op: "div" | "times",
): [Operand, Operand] | null {
  const m = content.match(
    new RegExp(`(${NUM_TOKEN})\\s*\\\\${op}\\s*(${NUM_TOKEN})`),
  );
  return m
    ? [classifyOperand(m[1]!.trim()), classifyOperand(m[2]!.trim())]
    : null;
}

/** 「(A)÷(B)」·「(A)×(B)」 — 식의 두 피연산자 종류가 소단원 이름 그대로인가. */
function opShape(
  op: "div" | "times",
  left: Operand["kind"],
  right: Operand["kind"],
): (content: string) => boolean {
  return (c) => {
    const o = operandsOf(c, op);
    return o !== null && o[0].kind === left && o[1].kind === right;
  };
}

/** 몫이 소수 몇 자리에서 나누어떨어지는가 — 부동소수 오차는 1e-6 으로 눌러 잰다. */
function quotientDp(q: number): number {
  for (let d = 0; d <= 6; d += 1) {
    if (Math.abs(q * 10 ** d - Math.round(q * 10 ** d)) < 1e-6) return d;
  }
  return 7;
}

const DIGIT_WORD: Record<string, number> = { 한: 1, 두: 2, 세: 3, 네: 4 };

/**
 * 소단원 이름이 내건 「소수 N 자리」를 **전부** 모은다.
 *
 * ⚠️ 「소수 두 자리 수**, 세 자리 수** 알아보기」는 **둘을 나란히** 가르친다.
 * 앞의 것만 보고 걸면 멀쩡한 산출 6/8 이 거짓 경보로 잡힌다(2026-08-22 실측).
 *
 * 「둘 다」와 「둘 중 하나」를 가르는 것은 **구조**다 —
 * 괄호 안 피연산자(`(세 자리 수)×(한 자리 수)`)는 **둘 다** 있어야 하고,
 * 쉼표 나열(`두 자리 수, 세 자리 수`)은 **어느 쪽이든** 좋다.
 * 소수 쪽에는 괄호로 묶인 자릿수 조건이 없으므로 여기서는 나열로만 읽는다
 * (정수 쪽은 아래 needle 별 검사가 그대로 «둘 다»를 요구한다).
 */
function decimalPlacesWanted(section: string): number[] {
  const out = new Set<number>();
  for (const m of section.matchAll(/([한두세네])\s*자리\s*수/g)) {
    out.add(DIGIT_WORD[m[1]!]!);
  }
  return [...out];
}

type Check = {
  /** 소단원 이름에 이 말이 있으면 적용한다. */
  needle: string;
  /** 발문이 조건을 지키면 true. `solution` 은 초3 1-4 올림 검사만 쓴다(문장형 폴백). */
  ok: (content: string, section: string, solution?: string) => boolean;
  /**
   * 이 조건이 그 소단원에 정말 적용되는가. 없으면 늘 적용.
   *
   * ⚠️ 「소수 **한 자리 수**의 덧셈」의 「한 자리」는 **자릿수가 아니라 소수점 아래 자리**다.
   * 이걸 안 가르면 `3.1+2.5` 가 거짓 경보로 잡힌다 — 실제로 잡혔다(2026-08-22).
   * **거짓 경보는 가드를 끈다.**
   */
  when?: (section: string) => boolean;
  /**
   * **식이 없는 발문**에 쓰는 느슨한 판정 — 난이도 갈래의 기본·응용·심화 전용.
   *
   * ⚠️ `opShape` 는 「발문이 식 하나」를 전제한다(이 파일 위쪽 주석 참조). 그런데
   * 기본·응용·심화는 **일부러** 문장형·역산형이다 — `우유 $2\,\mathrm{L}$를 $9$명이…`
   * 는 분명히 (자연수)÷(자연수)인데 `a\div b` 가 없어서 구조 검사가 못 읽는다.
   * 2026-08-23 에 갈래를 순회에 넣자마자 그 부류로 **거짓 경보 6건**이 났다.
   * **거짓 경보는 가드를 끈다** — 그래서 구조 대신 **종류가 있는가**로 떨어뜨린다.
   * 사각지대로 두지는 않는다: 종류가 없으면 여전히 위반이다.
   */
  loose?: (content: string) => boolean;
};

const notDecimalContext = (s: string) => !s.includes("소수");
const decimalContext = (s: string) => s.includes("소수");

// ── 초3 1-4 곱셈 — 배타 올림 약속 (2026-08-23, g3 적발 a42ba6bb) ─────────────
//
// «올림이 없는» 1-4-2 의 37.5% 가 올림을 내고 있었는데, 이 판정기에 1-4 조건이 아예
// 없어 그 축이 **구조적으로 0** 이었다. 분류의 정본은 elemTiersG3.test.ts `mulClassOf` —
// 같은 약속을 여기서 독립으로 다시 센다(생성기 풀을 되부르면 동어반복이다).
// 문장형 갈래는 발문에 식이 없으므로 **해설**에서 읽는다 — 이 검사들만 solution 을 본다.

/** `$ab\times c$` 의 올림 분류. 식이 없으면 null — 부르는 쪽이 위반으로 처리한다. */
function mulCarryClass(text: string): "none" | "ones" | "tens" | "both" | null {
  const m = text.match(/\$(\d{2})\\times(\d)(?!\d)/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const ones = (a % 10) * b >= 10;
  const tens = Math.floor(a / 10) * b + Math.floor(((a % 10) * b) / 10) >= 10;
  return ones ? (tens ? "both" : "ones") : tens ? "tens" : "none";
}

function mulCarryCheck(
  needle: string,
  wanted: "none" | "ones" | "tens" | "both",
  when?: (s: string) => boolean,
): Check {
  return {
    needle,
    ok: (c, _s, solution) =>
      (mulCarryClass(c) ?? mulCarryClass(solution ?? "")) === wanted,
    when,
  };
}

/**
 * 발문에 있는 수의 종류별 개수. `\square`·`□` 는 **구해야 할 수**라 어떤 종류로도 센다.
 *
 * ⚠️ 여기 `stripped` 는 **자연수만** 세려고 다른 종류를 걷어 낸 것이다. 걷어 내기가 새면
 * 분수의 분자·분모가 자연수로 세어져 「자연수가 하나도 없는데 있다」가 된다 —
 * 실제로 그랬다(2026-08-23): `/\frac…/` 의 `\f` 는 정규식 리터럴에서 **폼피드**라
 * 어떤 분수도 못 지웠고, 자연수 피연산자를 통째로 없앤 발문이 **초록**으로 통과했다.
 * 역슬래시는 `\\` 로 적는다 — 이 저장소가 반복해 데인 자리다(2026-08-21 은 반대 방향이었다).
 */
function kindCounts(
  c: string,
): Record<Operand["kind"], number> & { 미지수: number } {
  const stripped = c
    // 대분수는 **한 덩어리**다 — 앞의 정수부를 따로 세면 자연수가 하나 늘어난다.
    .replace(/\d+\s*\\frac\{\d+\}\{\d+\}/g, " ")
    .replace(/\\frac\{\d+\}\{\d+\}/g, " ")
    .replace(/\d+\.\d+/g, " ")
    // 단위·지수는 피연산자가 아니다 — `\mathrm{m}^3` 의 `3` 을 자연수로 세면 안 된다.
    .replace(/\\mathrm\{[^}]*\}/g, " ")
    .replace(/\^\{?\d+\}?/g, " ");
  return {
    분수: fracs(c).length,
    소수: decimalPlaces(c).length,
    자연수: (stripped.match(/\d+/g) ?? []).length,
    미지수: (c.match(/\\square|□/g) ?? []).length,
  };
}

const NUMBER_KINDS = ["분수", "소수", "자연수"] as const;

/**
 * 두 피연산자 «종류»가 발문에 있기는 한가 — **식이 없는 문장형 갈래**에 쓰는 느슨한 판정.
 *
 * 규칙 (원장님·리드 승인 2026-08-23):
 *   ⑴ **요구한 종류는 각각 하나 이상.** 없으면 `\square` 가 갈음한다(구해야 할 수다).
 *   ⑵ **요구하지 않은 종류는 없어야 한다.** 이게 이 검사의 이빨이다 —
 *      「자연수를 소수로 바꿔 심기」가 ⑴ 만으로는 통과한다(자연수는 여전히 하나 남는다).
 *
 * ⚠️ 예전 규칙은 같은 종류를 **개수 2** 로 요구했다(`for (const k of [left, right])` 가
 * 하나씩 깎았다). 그래서 `(자연수)÷(자연수)` 의 **3단 결합형**이 거짓 빨강이었다 —
 * 「둘레가 $7$ m인 정사각형 화단의 한 변은?」은 나누는 수 `4` 가 **「정사각형」이라는 낱말
 * 안에** 있어 발문의 수가 하나뿐이다. 그리고 그게 D-72 3단 「다른 개념과 결합」의 알맹이다.
 * 개수가 아니라 **종류가 있는가**로 본다.
 */
function kindsPresent(
  left: Operand["kind"],
  right: Operand["kind"],
): (content: string) => boolean {
  const wanted = new Set<Operand["kind"]>([left, right]);
  return (c) => {
    const have = kindCounts(c);
    let wild = have.미지수;
    for (const k of wanted) {
      if (have[k] > 0) continue;
      if (wild > 0) {
        wild -= 1;
        continue;
      }
      return false;
    }
    for (const k of NUMBER_KINDS) {
      if (!wanted.has(k) && have[k] > 0) return false;
    }
    return true;
  };
}

/** 「(A)op(B)」 검사 하나 — 식이 있으면 구조로, 없으면 종류로 본다. */
function opCheck(
  needle: string,
  op: "div" | "times",
  left: Operand["kind"],
  right: Operand["kind"],
): Check {
  return {
    needle,
    ok: opShape(op, left, right),
    loose: kindsPresent(left, right),
  };
}

const CHECKS: Check[] = [
  {
    needle: "1보다 작은 소수",
    // `2.0` 은 JS 에서 정수라 `Number.isInteger` 가 참이다. 그것도 결함이다 —
    // 「소수」라면서 정수를 내는 것이니 어느 쪽으로든 걸려야 맞다.
    ok: (c) => numbers(c).some((v) => v < 1 && v > 0 && !Number.isInteger(v)),
  },
  {
    needle: "1보다 큰 소수",
    ok: (c) => numbers(c).some((v) => v > 1 && !Number.isInteger(v)),
  },
  {
    // 「진분수와 가분수 알아보기」처럼 **둘을 나란히 가르치는** 소단원은 어느 쪽이든 좋다.
    needle: "진분수",
    ok: (c) => fracs(c).some(([a, b]) => a < b),
    when: (s) => !s.includes("가분수"),
  },
  {
    needle: "가분수",
    ok: (c) => fracs(c).some(([a, b]) => a >= b),
    when: (s) => !s.includes("진분수"),
  },
  {
    // 「진분수와 가분수 알아보기」는 위 둘이 서로를 꺼서 **검사가 하나도 안 붙었다**.
    // 어느 쪽이든 좋지만 **분수는 있어야 한다** — 사각지대로 두지 않는다.
    needle: "진분수와 가분수",
    ok: (c) => fracs(c).length > 0,
  },
  {
    // 「대분수**의** 덧셈」·「**(대분수)**÷」는 대분수가 **피연산자**다.
    // 「대분수 알아보기」는 대분수가 **답** 쪽일 수 있어(가분수→대분수) 적용하지 않는다.
    needle: "대분수",
    ok: (c) => /\d+\s*\\frac\{/.test(c),
    when: (s) => /대분수의|\(대분수\)/.test(s),
  },
  {
    // 위 검사가 꺼지는 「대분수 알아보기」도 **사각지대로 두지 않는다** —
    // 대분수가 답 쪽이어도 발문에는 바꿀 분수가 있어야 한다.
    needle: "대분수 알아보기",
    ok: (c) => fracs(c).length > 0,
  },
  {
    needle: "세 자리 수",
    ok: (c) =>
      numbers(c).some((v) => Number.isInteger(v) && v >= 100 && v <= 999),
    when: notDecimalContext,
  },
  {
    needle: "두 자리 수",
    ok: (c) =>
      numbers(c).some((v) => Number.isInteger(v) && v >= 10 && v <= 99),
    when: notDecimalContext,
  },
  {
    needle: "한 자리 수",
    ok: (c) => numbers(c).some((v) => Number.isInteger(v) && v >= 1 && v <= 9),
    when: notDecimalContext,
  },
  // 소수 문맥에서의 「N 자리 수」 — 자릿수가 아니라 **소수점 아래 자리**로 읽는다.
  // 소단원이 나열한 자리 **가운데 하나**면 통과. 나열이 하나뿐이면 그 하나를 요구하므로
  // 「소수 한 자리 수의 덧셈」의 엄격함은 그대로다.
  {
    needle: "자리 수",
    ok: (c, s) => {
      const wanted = decimalPlacesWanted(s);
      return (
        wanted.length === 0 || decimalPlaces(c).some((d) => wanted.includes(d))
      );
    },
    when: decimalContext,
  },
  // ── 「(A)÷(B)」·「(A)×(B)」 피연산자 종류 (2026-08-22, 미판정이던 16개 소단원) ──
  // needle 이 실제로 닿는 소단원은 `scripts/qa` 에서 전수 열거로 확인했다 —
  // 「(분수)×(분수)」 는 일부러 안 만든다: 2-1-4 의 그 구절은 **답** 쪽 조건이라
  // 발문에 걸면 멀쩡한 소단원이 통째로 위반이 된다.
  opCheck("(분수)×(자연수)", "times", "분수", "자연수"),
  opCheck("(자연수)×(분수)", "times", "자연수", "분수"),
  opCheck("(자연수)÷(자연수)", "div", "자연수", "자연수"),
  opCheck("(분수)÷(자연수)", "div", "분수", "자연수"),
  opCheck("(소수)÷(자연수)", "div", "소수", "자연수"),
  opCheck("(분수)÷(분수)", "div", "분수", "분수"),
  opCheck("(자연수)÷(분수)", "div", "자연수", "분수"),
  opCheck("(소수)÷(소수)", "div", "소수", "소수"),
  opCheck("(자연수)÷(소수)", "div", "자연수", "소수"),
  // 아래 셋의 조건은 **몫의 성질**이다. 문장형 갈래(기본·응용·심화)는 몫이 발문에 없어
  // (중간값·역산) 여기서는 구조적으로 못 잰다 — 종류만 보고 떨어뜨리고, 몫<1·0내림·
  // 첫째자리0 자체는 `elemTiersG6.test.ts` 가 **정답에 대고** 잠근다 (2026-08-23, D-72 3차분).
  // 조용히 통과시키는 것이 아니다: 종류가 어긋나면(분수가 섞이거나 소수가 없으면) 여전히 위반이다.
  {
    needle: "몫이 1보다 작은",
    ok: (c) => {
      const o = operandsOf(c, "div");
      return o !== null && o[0].value < o[1].value;
    },
    loose: kindsPresent("소수", "자연수"),
  },
  {
    // 「0 을 내린다」 = 피제수의 소수 자리를 다 쓰고도 안 나누어떨어진다
    // — 곧 몫의 소수 자릿수가 피제수보다 깊다 (42.4÷5 = 8.48).
    needle: "소수점 아래 0을 내려",
    ok: (c) => {
      const o = operandsOf(c, "div");
      return o !== null && quotientDp(o[0].value / o[1].value) > o[0].dp;
    },
    loose: kindsPresent("소수", "자연수"),
  },
  {
    needle: "몫의 소수 첫째 자리에 0",
    ok: (c) => {
      const o = operandsOf(c, "div");
      if (o === null) return false;
      const q = o[0].value / o[1].value;
      const dp = quotientDp(q);
      // 몫이 정수·한 자리(6.8)면 「첫째 자리의 0」 자체가 없다.
      return dp >= 2 && q.toFixed(dp).split(".")[1]![0] === "0";
    },
    loose: kindsPresent("소수", "자연수"),
  },
  {
    needle: "자릿수가 같은",
    ok: (c) => {
      const o = operandsOf(c, "div");
      return o !== null && o[0].dp > 0 && o[0].dp === o[1].dp;
    },
  },
  {
    needle: "자릿수가 다른",
    ok: (c) => {
      const o = operandsOf(c, "div");
      return o !== null && o[0].dp > 0 && o[1].dp > 0 && o[0].dp !== o[1].dp;
    },
  },
  {
    // 초6 「분모가 같은 (분수)÷(분수)」만이 아니라 **초3 「분모가 같은 분수의 크기 비교」**도
    // 이 이름을 쓴다 — 거기엔 나눗셈이 없다. 그래서 식이 아니라 발문의 분수 **전부**를 본다.
    needle: "분모가 같은",
    ok: (c) => {
      const f = fracs(c);
      return f.length >= 2 && f.every(([, d]) => d === f[0]![1]);
    },
  },
  {
    needle: "분모가 다른",
    ok: (c) => {
      const f = fracs(c);
      return f.length >= 2 && f.some(([, d]) => d !== f[0]![1]);
    },
  },
  // 초3 1-4 곱셈 — 위 mulCarryCheck 주석 참조. needle 은 괄호까지 붙여 받아올림(덧셈)과
  // 가른다. 1-4-4 needle 은 1-4-5 이름(«십의 자리와 일의 자리에서…»)에도 들어 있어
  // when 으로 뺀다 — 진분수/가분수가 서로를 끄던 것과 같은 자리다.
  {
    needle: "(몇십)×(몇)",
    ok: (c, _s, solution) => {
      const m = (c + " " + (solution ?? "")).match(
        /\$(\d{2})\\times(\d)(?!\d)/,
      );
      return m !== null && Number(m[1]) % 10 === 0;
    },
  },
  mulCarryCheck("올림이 없는 (몇십몇)×(몇)", "none"),
  mulCarryCheck("십의 자리에서 올림이 있는 (몇십몇)×(몇)", "tens"),
  mulCarryCheck(
    "일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    "ones",
    (s) => !s.includes("십의 자리와"),
  ),
  mulCarryCheck("십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)", "both"),
];

/**
 * **일부러 걸리는 입력**으로 가드가 실제로 빨개지는지 본다.
 *
 * 0은 「깨끗하다」와 「못 센다」를 구분해 주지 않는다(CLAUDE.md 2026-08-21).
 * 그리고 눈금에는 **양성·음성 대조군이 둘 다** 있어야 한다 —
 * 걸려야 할 것만 대면 「지어냄」이 구조적으로 0이 된다(2026-08-20).
 *
 *   npx tsx scripts/qa/probe-elem-section-conditions.ts --selftest
 */
/**
 * 눈금 하나. `loose: true` 면 **문장형 갈래**(기본·응용·심화)로 재 본다 —
 * 그 경로는 2026-08-23 까지 픽스처가 **하나도 없었다.** 재는 쪽이 없으면 고쳐도 모른다.
 */
type Fixture = {
  section: string;
  content: string;
  want: boolean;
  why: string;
  loose?: boolean;
  /** 문장형 폴백 눈금용 — 초3 1-4 올림 검사만 해설을 본다. */
  solution?: string;
};
const FIXTURES: Fixture[] = [
  // ── 걸려야 하는 것 (양성) ─────────────────────────────────────────
  {
    section: "2-4-3 (자연수)×(1보다 작은 소수)의 계산",
    content: "$7\\times2.0$을 계산하시오.",
    want: false,
    why: "2.0 은 1보다 작지 않다 — 원장님 검수 밖에서 내가 찾은 그 결함",
  },
  {
    section: "2-3-4 소수 한 자리 수의 덧셈",
    content: "$3.14+2.71$을 계산하시오.",
    want: false,
    why: "두 자리다",
  },
  {
    section: "2-3-1 소수 두 자리 수, 세 자리 수 알아보기",
    content: "$0.5$에서 소수 첫째 자리 숫자를 쓰시오.",
    want: false,
    why: "나열한 자리(2·3) 어느 쪽도 아니다",
  },
  {
    section: "1-3-2 (세 자리 수)×(두 자리 수)의 계산",
    content: "$347\\times5$를 계산하시오.",
    want: false,
    why: "두 자리 수가 없다 — 괄호 피연산자는 **둘 다** 요구한다",
  },
  {
    section: "2-1-1 진분수 알아보기",
    content: "$\\frac{7}{3}$은 진분수인가?",
    want: false,
    why: "가분수다",
  },
  {
    section: "2-4-4 진분수와 가분수 알아보기",
    content: "다음 수는 진분수인가 가분수인가?  $7$",
    want: false,
    why: "어느 쪽이든 좋지만 **분수는 있어야** 한다",
  },
  {
    section: "2-1-3 대분수의 덧셈",
    content: "$\\frac{6}{7}+\\frac{2}{7}=\\square$",
    want: false,
    why: "대분수가 피연산자인데 진분수만 있다",
  },
  // ── 걸리면 안 되는 것 (음성) ──────────────────────────────────────
  {
    section: "2-3-1 소수 두 자리 수, 세 자리 수 알아보기",
    content: "$3.821$에서 소수 셋째 자리 숫자를 쓰시오.",
    want: true,
    why: "쉼표 나열 — 세 자리도 이 소단원이 가르친다(거짓 경보였던 자리)",
  },
  {
    section: "2-3-1 소수 두 자리 수, 세 자리 수 알아보기",
    content: "$0.01$이 $51$개인 수를 소수로 쓰시오.",
    want: true,
    why: "같은 소단원의 두 자리 쪽",
  },
  {
    section: "2-3-4 소수 한 자리 수의 덧셈",
    content: "$3.1+2.5$를 계산하시오.",
    want: true,
    why: "「한 자리」는 자릿수가 아니라 소수점 아래 자리다",
  },
  {
    section: "1-3-2 (세 자리 수)×(두 자리 수)의 계산",
    content: "$347\\times52$를 계산하시오.",
    want: true,
    why: "둘 다 있다",
  },
  {
    section: "2-4-4 진분수와 가분수 알아보기",
    content: "$\\frac{7}{3}$은 진분수인가 가분수인가?",
    want: true,
    why: "둘을 나란히 가르치는 소단원 — 어느 쪽이든 좋다",
  },
  {
    section: "2-4-5 대분수 알아보기",
    content: "다음 가분수를 대분수로 나타내시오.  $\\frac{27}{7}$",
    want: true,
    why: "여기서는 대분수가 **답** 쪽이다 — 발문에 없어도 옳다",
  },
  {
    section: "2-1-3 대분수의 덧셈",
    content: "$2\\frac{6}{7}+1\\frac{2}{7}=\\square$",
    want: true,
    why: "대분수가 피연산자로 있다",
  },
  // ── (A)÷(B) 피연산자 검사 (2026-08-22) — 걸려야 하는 것 ──────────────
  {
    section: "1-3-2 몫이 1보다 작은 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$3.2\\div2=\\square$",
    want: false,
    why: "몫 1.6 — 1보다 작지 않다",
  },
  {
    section: "1-3-3 소수점 아래 0을 내려 계산하는 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$9.5\\div5=\\square$",
    want: false,
    why: "몫 1.9 — 내릴 0 이 없다",
  },
  {
    section: "1-3-4 몫의 소수 첫째 자리에 0이 있는 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$27.2\\div4=\\square$",
    want: false,
    why: "몫 6.8 — 첫째 자리가 8 이다",
  },
  {
    section: "2-2-1 자릿수가 같은 (소수)÷(소수) 알아보기",
    content: "몫을 구하시오.\n\n$15.47\\div3.5=\\square$",
    want: false,
    why: "두 자리 ÷ 한 자리 — 자릿수가 다르다",
  },
  {
    section: "2-1-1 분모가 같은 (분수)÷(분수) 알아보기",
    content: "다음을 계산하시오.\n\n$\\frac{1}{4}\\div\\frac{1}{6}=\\square$",
    want: false,
    why: "분모 4 ≠ 6",
  },
  {
    section: "2-2-1 (분수)×(자연수)의 계산",
    content: "$6\\times\\frac{3}{4}=\\square$",
    want: false,
    why: "차례가 뒤집혔다 — (자연수)×(분수)다",
  },
  {
    section: "1-3-1 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$12\\div4=\\square$",
    want: false,
    why: "피제수에 소수가 없다",
  },
  // ── (A)÷(B) 피연산자 검사 — 걸리면 안 되는 것 ────────────────────────
  {
    section: "1-3-2 몫이 1보다 작은 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$1.2\\div6=\\square$",
    want: true,
    why: "몫 0.2",
  },
  {
    section: "1-3-3 소수점 아래 0을 내려 계산하는 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$8.7\\div2=\\square$",
    want: true,
    why: "몫 4.35 — 0 을 한 번 내린다",
  },
  {
    section: "1-3-4 몫의 소수 첫째 자리에 0이 있는 (소수)÷(자연수) 알아보기",
    content: "몫을 구하시오.\n\n$25.4\\div5=\\square$",
    want: true,
    why: "몫 5.08",
  },
  {
    section: "2-2-2 자릿수가 다른 (소수)÷(소수) 알아보기",
    content: "몫을 구하시오.\n\n$15.47\\div3.5=\\square$",
    want: true,
    why: "두 자리 ÷ 한 자리",
  },
  {
    section: "1-6-4 분모가 같은 분수의 크기 비교",
    content:
      "다음 두 분수 중 더 큰 분수를 쓰시오.\n\n$\\frac{2}{7}$,  $\\frac{5}{7}$",
    want: true,
    why: "나눗셈이 없어도 분모가 같으면 통과 — 초3 비교 소단원",
  },
  {
    section: "2-1-4 (분수)÷(분수)를 (분수)×(분수)로 나타내기",
    content:
      "다음 나눗셈식을 곱셈식으로 나타내시오.\n\n$\\frac{2}{3}\\div\\frac{5}{6}$",
    want: true,
    why: "「×(분수)」 구절은 답 쪽 조건이다 — 발문에는 나눗셈식만 있어도 옳다",
  },

  // ── 문장형 갈래(loose) — 이 경로는 2026-08-23 까지 눈금이 **하나도 없었다** ──────
  //
  // 양성·음성을 **둘 다** 둔다. 양성만 두면 「지어냄」이, 음성만 두면 「거짓 경보」가
  // 구조적으로 0이 된다 (CLAUDE.md 2026-08-20 판정자 눈금과 같은 자리).
  {
    section: "1-1-1 (자연수)÷(자연수)의 몫을 분수로 나타내기",
    content:
      "우유 $5\\,\\mathrm{L}$를 $8$명이 똑같이 나누어 마시려고 합니다. 한 사람이 갖는 우유는 몇 L입니까?",
    want: true,
    loose: true,
    why: "문장형 2단 — 식은 없지만 분명히 (자연수)÷(자연수)다",
  },
  {
    section: "1-1-1 (자연수)÷(자연수)의 몫을 분수로 나타내기",
    content:
      "둘레가 $7\\,\\mathrm{m}$ 인 정사각형 모양 화단이 있습니다. 한 변의 길이는 몇 m입니까?",
    want: true,
    loose: true,
    why:
      "3단 **결합** — 나누는 수 4 가 「정사각형」이라는 낱말 안에 있어 발문의 수가 하나뿐이다. " +
      "예전 규칙(같은 종류 개수 2)이 이것을 거짓 빨강으로 잡았다",
  },
  {
    section: "1-1-2 (분수)÷(자연수) 알아보기",
    content:
      "밀가루 $\\frac{7}{9}$ kg을 여러 명이 똑같이 나누어 담으려고 합니다. 한 사람이 갖는 밀가루는 몇 kg입니까?",
    want: false,
    loose: true,
    why:
      "**자연수 피연산자가 없다.** `\\f` 가 폼피드라 분수를 못 지우던 때는 분자·분모가 " +
      "자연수로 세어져 이것이 초록이었다 — 일부러 걸리는 입력",
  },
  {
    section: "1-1-1 (자연수)÷(자연수)의 몫을 분수로 나타내기",
    content:
      "우유 $5.5\\,\\mathrm{L}$를 $8$명이 똑같이 나누어 마시려고 합니다. 한 사람이 갖는 우유는 몇 L입니까?",
    want: false,
    loose: true,
    why: "요구 밖 종류(소수)가 섞였다 — ⑴ 만으로는 자연수가 남아 통과한다. ⑵ 가 잡는다",
  },
  {
    section: "1-1-2 (분수)÷(자연수) 알아보기",
    content:
      "밀가루 $7$ kg을 $3$명이 똑같이 나누어 담으려고 합니다. 한 사람이 갖는 밀가루는 몇 kg입니까?",
    want: false,
    loose: true,
    why: "분수가 없다 — 요구 종류 ⑴ 이 잡는다",
  },
  {
    section: "1-1-2 (분수)÷(자연수) 알아보기",
    content:
      "$\\square$ 안에 알맞은 자연수를 구하시오.\n\n$\\frac{1}{4}\\div\\square=\\frac{1}{20}$",
    want: true,
    loose: true,
    why:
      "구해야 할 자연수가 `\\square` 다 — 미지수가 갈음한다. " +
      "`/\\square/` 는 `\\s`+「quare」라 그 와일드카드도 **죽어 있었다**",
  },

  // ── 몫-성질 소단원(1-3-2·3·4)의 문장형 loose (2026-08-23, D-72 3차분) ──────
  //
  // 몫의 성질(«1보다 작다»·«0을 내린다»·«첫째 자리 0»)은 발문만으로 못 재므로
  // loose 는 종류만 본다. 그 성질은 elemTiersG6.test.ts 가 정답에 대고 잠근다.
  {
    section: "1-3-2 몫이 1보다 작은 (소수)÷(자연수) 알아보기",
    content:
      "끈 $1.8$ m를 똑같이 $3$도막으로 자르려고 합니다. 한 도막의 길이는 몇 m입니까?",
    want: true,
    loose: true,
    why: "문장형 2단 — 식은 없지만 분명히 (소수)÷(자연수)다",
  },
  {
    section: "1-3-2 몫이 1보다 작은 (소수)÷(자연수) 알아보기",
    content:
      "끈 $\\frac{9}{5}$ m를 똑같이 $3$도막으로 자르려고 합니다. 한 도막의 길이는 몇 m입니까?",
    want: false,
    loose: true,
    why: "요구 밖 종류(분수)가 섞였다 — kindsPresent ⑵ 가 잡는다",
  },
  {
    section: "1-3-3 소수점 아래 0을 내려 계산하는 (소수)÷(자연수) 알아보기",
    content:
      "철사 $8$ m 중에서 $1$ m를 사용하고, 남은 철사를 똑같이 $5$도막으로 잘랐습니다. 한 도막의 길이는 몇 m입니까?",
    want: false,
    loose: true,
    why: "소수가 하나도 없다 — (소수)÷(자연수) 소단원이 아니게 된다",
  },
  {
    section: "1-3-4 몫의 소수 첫째 자리에 0이 있는 (소수)÷(자연수) 알아보기",
    content:
      "$\\square$ 안에 알맞은 수를 구하시오.\n\n$12.2\\div\\square=3.05$",
    want: true,
    loose: true,
    why: "역산형 — `\\square` 가 나누는 수(자연수)를 갈음한다",
  },

  // ── 초3 1-4 곱셈 배타 올림 (2026-08-23, g3 적발 a42ba6bb) ────────────────
  // 양성 첫 건이 **수리 전 실측 결함 그 자체**다 — 1-4-2 가 $32\times5$ 를 내고 있었다.
  {
    section: "1-4-2 올림이 없는 (몇십몇)×(몇)",
    content: "$32\\times5$를 계산하시오.",
    want: false,
    why: "올림이 있다(2×5=10) — 수리 전 실측 결함 (g3 적발 a42ba6bb)",
  },
  {
    section: "1-4-2 올림이 없는 (몇십몇)×(몇)",
    content: "$32\\times3$을 계산하시오.",
    want: true,
    why: "어느 자리에도 올림이 없다",
  },
  {
    section: "1-4-3 십의 자리에서 올림이 있는 (몇십몇)×(몇)",
    content: "$21\\times4$를 계산하시오.",
    want: false,
    why: "올림이 아예 없다 — 십의 자리 올림이 약속이다",
  },
  {
    section: "1-4-3 십의 자리에서 올림이 있는 (몇십몇)×(몇)",
    content: "$52\\times4$를 계산하시오.",
    want: true,
    why: "십의 자리만 올림(5×4=20)",
  },
  {
    section: "1-4-4 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    content: "$47\\times3$을 계산하시오.",
    want: false,
    why: "둘 다 올림(7×3=21 · 4×3+2=14) — 일의 자리만이 약속이다",
  },
  {
    section: "1-4-4 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    content: "$27\\times3$을 계산하시오.",
    want: true,
    why: "일의 자리만 올림(7×3=21 · 2×3+2=8)",
  },
  {
    section: "1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    content: "$27\\times3$을 계산하시오.",
    want: false,
    why: "일의 자리만 올림이다 — 둘 다가 약속이다",
  },
  {
    section: "1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
    content: "$47\\times3$을 계산하시오.",
    want: true,
    why: "두 자리 다 올림",
  },
  {
    section: "1-4-1 (몇십)×(몇)",
    content: "$32\\times4$를 계산하시오.",
    want: false,
    why: "몇십이 아니라 몇십몇이다",
  },
  {
    section: "1-4-1 (몇십)×(몇)",
    content: "$30\\times4$를 계산하시오.",
    want: true,
    why: "몇십 × 몇",
  },
  {
    section: "1-4-2 올림이 없는 (몇십몇)×(몇)",
    content:
      "사과가 한 상자에 $32$개씩 $3$상자 있습니다. 사과는 모두 몇 개입니까?",
    solution: "$32\\times3=96$ 이므로 $96$개입니다.",
    want: true,
    loose: true,
    why: "문장형 — 식은 해설에서 읽는다",
  },
];

/**
 * 소단원 이름은 **대안의 나열**이다 — 쉼표로 갈린다.
 *
 * 「(가분수)÷(분수)**,** (대분수)÷(분수)」는 **어느 쪽이든** 좋고,
 * 한 대안 안의 괄호 피연산자 「(세 자리 수)×(한 자리 수)」는 **둘 다** 있어야 한다.
 * 조건을 하나도 안 걸치는 대안(「받아올림이 없는」)은 **세지 않는다** —
 * 안 그러면 그 대안이 늘 참이라 소단원이 통째로 사각지대가 된다.
 *
 * ⚠️ 「소수」는 **소단원 전체**의 문맥이다. 쉼표 뒤 「세 자리 수」에도 걸린다
 * (「소수 두 자리 수, 세 자리 수」의 뒤쪽은 「소수」가 생략된 것이다).
 * 이걸 대안 단위로 읽으면 3자리 **정수**를 요구하게 된다.
 */
function verdict(
  content: string,
  section: string,
  /** 식이 없어도 되는 발문인가 — 난이도 갈래의 **기본·응용·심화**가 그렇다. */
  allowLoose = false,
  /** 해설 — 초3 1-4 올림 검사의 문장형 폴백만 쓴다. */
  solution = "",
): { kind: "통과" | "위반" | "미판정"; needles: string[] } {
  const seen: string[] = [];
  const pass = (c: Check, alt: string) =>
    c.ok(content, alt, solution) ||
    (allowLoose && (c.loose?.(content) ?? false));
  for (const alt of section.split(/\s*,\s*/)) {
    const checks = CHECKS.filter(
      (c) => alt.includes(c.needle) && (c.when?.(section) ?? true),
    );
    if (checks.length === 0) continue;
    seen.push(...checks.map((c) => c.needle));
    if (checks.every((c) => pass(c, alt)))
      return { kind: "통과", needles: seen };
  }
  return { kind: seen.length > 0 ? "위반" : "미판정", needles: seen };
}

if (process.argv.includes("--selftest")) {
  let failed = 0;
  for (const f of FIXTURES) {
    const v = verdict(f.content, f.section, f.loose ?? false, f.solution ?? "");
    if (v.kind === "미판정") {
      console.log(`  ❌ 검사가 아예 안 붙는다 — ${f.section}`);
      failed += 1;
      continue;
    }
    const got = v.kind === "통과";
    const mark = got === f.want ? "✅" : "❌";
    if (got !== f.want) failed += 1;
    console.log(
      `  ${mark} ${f.want ? "통과해야" : "걸려야"}${f.loose ? " «문장형»" : ""} — ${f.why}\n       ${f.section}\n       ${f.content}`,
    );
  }
  // 개수를 손으로 적으면 fixture 를 늘릴 때마다 거짓말이 된다 — 세어서 찍는다.
  const positives = FIXTURES.filter((f) => !f.want).length;
  const loose = FIXTURES.filter((f) => f.loose).length;
  console.log(
    failed === 0
      ? `\n✅ 눈금 ${FIXTURES.length}건 전부 맞다 (양성 ${positives} · 음성 ${FIXTURES.length - positives} · 그중 문장형 ${loose})`
      : `\n❌ 눈금 ${failed}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
const units = elementaryUnits().filter(
  (u) => !gradeArg || u.grade === gradeArg,
);

const broken: string[] = [];
const unjudged: string[] = [];
let checked = 0;

for (const unit of units) {
  // 난이도 갈래도 **같은 소단원 이름을 단다** — 「(1보다 작은 소수)」 소단원의 심화가
  // `2.0` 을 내면 그것도 위반이다. 갈래를 안 세면 그 축이 통째로 가드 밖이다(D-72).
  for (const tier of variantsOf(unit)) {
    const where = `${unit.grade} ${unit.section}${tierLabel(tier)}`;
    const verdicts = SEEDS.map((s) => {
      const p = generateElementaryProblem(unit, s, tier);
      return {
        seed: s,
        v: verdict(
          p.content,
          unit.section,
          // 표준·연산은 식이 그대로 나오는 꼴이라 구조를 그대로 요구한다.
          tier !== undefined && tier !== "연산",
          p.solution,
        ),
      };
    });
    if (verdicts.every((x) => x.v.kind === "미판정")) {
      // 조건어가 괄호 안에 있는데 우리 목록에 없는 것만 «미판정» 으로 센다.
      // 갈래마다 세면 한 소단원이 다섯 번 찍히므로 **표준에서만** 적는다.
      if (tier === undefined && /\([^)]*(?:수|분수)\)/.test(unit.section)) {
        unjudged.push(`${unit.grade} ${unit.section}`);
      }
      continue;
    }
    checked += 1;
    const bad = verdicts.filter((x) => x.v.kind === "위반");
    if (bad.length > 0) {
      const sample = generateElementaryProblem(
        unit,
        bad[0]!.seed,
        tier,
      ).content.replace(/\n/g, " ");
      const needles = [...new Set(bad.flatMap((x) => x.v.needles))].join(" · ");
      broken.push(
        `${where}\n      조건 「${needles}」 · 씨앗 ${bad.length}/${SEEDS.length} 위반\n      예: ${sample}`,
      );
    }
  }
}

console.log(
  `조건이 있는 소단원 ${checked}${gradeArg ? ` (${gradeArg})` : ""}\n`,
);
if (broken.length === 0) {
  console.log("✅ 조건 위반 0");
} else {
  console.log(`❌ 조건 위반 ${broken.length}건`);
  for (const b of broken) console.log(`  · ${b}`);
}
if (unjudged.length > 0) {
  console.log(
    `\n⚠️ 미판정 ${unjudged.length}건 — 조건어가 있는데 우리 목록에 없다. 눈으로 볼 것:`,
  );
  for (const u of unjudged) console.log(`  · ${u}`);
}
process.exitCode = broken.length === 0 ? 0 : 1;
