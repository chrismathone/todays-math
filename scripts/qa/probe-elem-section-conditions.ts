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
import { openFence } from "./elemProbeFence";

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

/**
 * **분수가 지면에 있는가** — 값을 못 읽는 것(`\frac{\square}{7}`)도 «있다»로 센다.
 *
 * ⚠️ `fracs()` 로 이걸 물으면 **거짓 경보**가 난다. 2026-08-23 실측: 초3 2-4-4 심화의
 * `$\frac{\square}{8}$ 가 가분수이고…` 가 「분수가 없다」로 40/40 걸렸다 — 지면에는
 * 분수가 **분명히 보이는데** 숫자 분수만 세었기 때문이다. **거짓 경보는 가드를 끈다.**
 *
 * 값을 견주는 검사(진분수인가·가분수인가)는 그대로 `fracs()` 를 써야 한다 —
 * □ 는 값을 모르므로 「분자가 분모보다 작다」를 물을 수 없다. 두 물음은 다르다.
 */
function anyFraction(text: string): boolean {
  return /\\frac\{[^{}]*\}\{[^{}]*\}/.test(text);
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
   *
   * 둘째 인자 `alt` 는 쉼표로 가른 소단원 이름 한 토막 — 자리수 loose 가 «이 대안이
   * 요구하는 자릿수 전부»를 알아야 와일드카드 한도를 대안 전체에서 지킬 수 있다.
   */
  loose?: (content: string, alt: string) => boolean;
};

/**
 * 발문의 와일드카드 수 — `\square`·`□` 낱개 + 「어떤 수」 는 **하나**로 친다.
 *
 * 「어떤 수」 는 역산형 심화의 산문 미지수다(g4 초4 1-3-2 실측: «어떤 수에 $41$을
 * 곱해야 할 것을…» 의 어떤 수 = 439 가 세 자리 조건을 지키는데 발문엔 안 적힌다).
 * □ 와 같은 자격, 같은 한도(하나만) — 원장님·리드 승인 2026-08-23.
 */
function wildcardsIn(c: string): number {
  return (
    (c.match(/\\square|□/g) ?? []).length + (c.includes("어떤 수") ? 1 : 0)
  );
}

/** 자리수 범위 — «한/두/세 자리 수» (정수 문맥). */
const DIGIT_RANGE: Record<string, [number, number]> = {
  한: [1, 9],
  두: [10, 99],
  세: [100, 999],
};

/**
 * 자리수 검사의 loose — 이 대안이 요구하는 자릿수들 중 발문에 없는 것 **전부**를
 * 와일드카드가 덮어야 한다. 세 검사가 같은 식을 계산하므로 한도(□ 낱개 + 어떤 수 1)가
 * 대안 전체에서 지켜진다 — 검사마다 따로 세면 와일드카드 하나가 두 번 쓰인다.
 */
function digitLoose(c: string, alt: string): boolean {
  const wanted = [...alt.matchAll(/([한두세])\s*자리\s*수/g)].map((m) => m[1]!);
  const missing = new Set(
    wanted.filter((w) => {
      const [lo, hi] = DIGIT_RANGE[w]!;
      return !numbers(c).some((v) => Number.isInteger(v) && v >= lo && v <= hi);
    }),
  );
  return missing.size <= wildcardsIn(c);
}

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
    // «어떤 수» 도 □ 와 같은 자격의 와일드카드다(하나만) — wildcardsIn 주석 참조.
    let wild = wildcardsIn(c);
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

const gcdOf = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcdOf(b, a % b);

/** 발문에 실린 비의 항들 — `$3:4$` · `$2:2:3$`. 없으면 null(= 못 읽음 → 위반). */
function ratioTerms(c: string): number[] | null {
  const m = c.match(/\$(\d+):(\d+)(?::(\d+))?\$/);
  if (!m) return null;
  return [m[1], m[2], m[3]]
    .filter((v): v is string => v !== undefined)
    .map(Number);
}

/**
 * 지면에 «아직 간단히 안 된 것»이 남아 있는가 — 2-4-2 의 조건을 **발문 쪽**에서 잰다.
 *
 * 소수·분수는 그 자체로 「자연수의 비로 고칠 일」이 남아 있고, 단위가 서로 다른 두 양도
 * 맞추기 전에는 비가 아니다. 순수 자연수 비뿐이라면 **두 항이 서로소가 아니어야** 한다.
 *
 * ⚠️ 아무것도 못 읽으면 **위반**으로 떨어뜨린다 — 조용히 통과시키면 그 부류가 통째로
 * 사각지대가 된다(이 파일 머리 주석의 태도).
 */
function unsimplifiedOnPage(c: string): boolean {
  if (/\d+\.\d+|\\frac\{/.test(c)) return true;
  const units = new Set(
    [...c.matchAll(/\\mathrm\{([a-zA-Z]+)\}/g)].map((m) => m[1]),
  );
  if (units.size >= 2) return true;
  const pairs = [...c.matchAll(/\$(\d+):(\d+)\$/g)];
  return pairs.some((m) => gcdOf(Number(m[1]), Number(m[2])) > 1);
}

/**
 * 「두 가지 기준」의 두 축. **이름이 나오거나 그 기준을 말하거나** 둘 중 하나면 그 축이
 * 문항에 서 있다고 본다.
 *
 * ⚠️ **「각의 크기가」와 「각의 크기에 따라」는 다른 말이다.** 앞은 자료(그 삼각형의 각이
 * 얼마인지)이고 뒤는 **기준**이다. 처음엔 `각의 크기` 로 넓게 잡았다가 양성 눈금이
 * 안 걸렸다 — 「세 각의 크기가 …인 삼각형을 **변의 길이에 따라** 분류하면?」이 각 축까지
 * 있는 것으로 읽혔다. **음성 대조군이 아니라 양성 눈금이 이걸 잡아 줬다.**
 *
 * 그러면서도 표준을 안 건드려야 한다 — 표준 2-2-5 는 「**변의 길이와 각의 크기**
 * 두 가지 기준으로」처럼 이름 없이 기준만 말한다. 그래서 「두 가지 기준」을 양쪽 축에
 * 다 넣는다(그렇게 말하는 문항은 스스로 둘 다 한다고 선언한 것이다).
 */
const BY_SIDE =
  /이등변삼각형|정삼각형|세 변의 길이|변의 길이에 따라|변의 길이와|두 가지 기준/;
const BY_ANGLE = /예각|직각|둔각|각의 크기에 따라|두 가지 기준/;

// ── 초3 미커버 13소단원의 연장 (2026-08-23, elem-g3) ─────────────────────
//
// 빚 발견기가 「이름이 조건을 약속하는데 검사가 0」으로 찍어 둔 초3 열셋을 갚는다.
//
// ⚠️ **needle 에 괄호까지 붙인다.** 괄호를 떼면 `몇십` 은 19소단원 · `몇십몇` 은
//   15소단원에 닿고 거기 **초4 1-3-4/5/6**(몇십으로 나누기 · 몇십몇으로 나누기)이 든다 —
//   그 소단원들은 우리가 재는 것과 **다른 약속**을 한다. 735소단원 전량에 판정기와 **같은
//   방식**(쉼표로 가른 alt 에 includes)으로 대어 확인했다: 괄호를 붙이면 **초4 0건**이다.
//   g4 가 1-4 곱셈에서 세운 관례 그대로다.

/** 한 자리 수 · 몇십(일의 자리가 0) · 몇십몇(일의 자리가 0이 아닌 두 자리). */
const isOnesDigit = (n: number) => n >= 1 && n <= 9;
const isTens = (n: number) => n >= 10 && n <= 99 && n % 10 === 0;
const isTensOnes = (n: number) => n >= 10 && n <= 99 && n % 10 !== 0;

/** 첫 `a\times b` — 발문에 없으면 **해설**에서. 문장형 갈래는 발문에 식이 없다. */
function mulPair(c: string, solution: string): [number, number] | null {
  for (const t of [c, solution]) {
    const m = t.match(/(\d+)\\times(\d+)/);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  return null;
}

/**
 * 곱셈 짝이 두 모양에 맞는가 — **순서를 가리지 않는다.**
 *
 * ⚠️ 이름은 `(몇십몇)×(몇십)` 처럼 자리를 정해 적지만 곱은 자리를 바꿔도 같은 계산이고,
 * 생성기가 `62\times90` 도 `90\times62` 도 낸다. 순서를 요구하면 **거짓 경보**가 나고,
 * 2-1-3 은 세 모양을 OR 로 늘어놓으므로 순서를 풀어도 **잃는 것이 없다**.
 */
function mulShapeCheck(
  needle: string,
  l: (n: number) => boolean,
  r: (n: number) => boolean,
): Check {
  return {
    needle,
    ok: (c, _s, solution) => {
      const p = mulPair(c, solution ?? "");
      if (!p) return false;
      return (l(p[0]) && r(p[1])) || (l(p[1]) && r(p[0]));
    },
  };
}

/**
 * 첫 `a\div b` — 발문 → 해설. 둘 다 없으면 해설의 `b\times q=a` 로 되짚는다
 * (역산 갈래는 `\square\div4=16` 처럼 나뉘는 수를 감춰 **나눗셈 식이 지면 어디에도 없다**).
 *
 * ⚠️ 이 되짚기는 **내림 검사에만** 쓴다. 2-2-3(나머지)의 해설에서 그 곱은 나뉘는 수가
 * 아니라 **몫×나누는 수**라(`$4\times3=12$ 이고 $14-12=2$`), 그대로 읽으면 나머지가 늘
 * 0 이 되어 **멀쩡한 문항이 전량 거짓 빨강**이 된다 — 실측으로 걸렸다.
 */
function divPairForBorrow(
  c: string,
  solution: string,
): [number, number] | null {
  for (const t of [c, solution]) {
    const m = t.match(/(\d+)\\div(\d+)/);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  const m = solution.match(/(\d+)\\times(\d+)=(\d+)/);
  return m ? [Number(m[3]), Number(m[1])] : null;
}

/** 십의 자리를 나누고 **남는 것이 있으면 내림**이다 — $90\div2$ 는 $9%2=1$ 이라 내림. */
function divBorrowCheck(
  needle: string,
  want: boolean,
  shape: (n: number) => boolean,
  when: (s: string) => boolean,
): Check {
  return {
    needle,
    when,
    ok: (c, _s, solution) => {
      const p = divPairForBorrow(c, solution ?? "");
      if (!p) return false;
      const [a, b] = p;
      if (!shape(a) || !isOnesDigit(b)) return false;
      return (Math.floor(a / 10) % b !== 0) === want;
    },
  };
}

/**
 * 도형 이름 소단원은 **발문 + 해설**을 본다.
 *
 * ⚠️ 처음엔 「발문에 그 낱말이 있는가」로 짰다가 **1273건이 거짓 경보**였다 —
 * 기본(2단)은 **일부러 이름을 안 쓰고 성질로 말한다**(「종이를 두 번 접어 만든 각과 같은
 * 삼각형」). 그게 그 갈래의 알맹이다. 표현 목록을 손으로 나열하는 판(「네 꼭짓점」·
 * 「가로와 세로가 같은」…)도 재 봤지만 **손 목록이라 새고** 표현이 늘 때마다 또 운다 —
 * 재 보고 버렸다. `mulCarryCheck` 가 해설을 폴백으로 읽는 것과 같은 자리다.
 */
function shapeNameCheck(needle: string, re: RegExp): Check {
  return { needle, ok: (c, _s, solution) => re.test(c + (solution ?? "")) };
}

/* ── 초3 2-5 들이와 무게 — 조건 판정 도우미 (2026-08-24 elem-g3) ──────────
 *
 * 단위 짝은 **소단원 이름에서** 정한다. 지면에서 읽으면 「지면에 kg 이 있으니
 * 무게다」가 되어 동어반복이다 — 그러면 「무게 소단원인데 L 로 쓴다」를 못 잡는다.
 */
function capUnitsOfSection(alt: string): [big: string, small: string] {
  return alt.includes("무게") ? ["kg", "g"] : ["L", "mL"];
}

/** 지면에 찍힌 **양**의 개수. 섞은 꼴(`$2\,\mathrm{L}\ 300\,\mathrm{mL}$`)은 하나로 센다. */
function capQuantityCount(c: string, big: string, small: string): number {
  const re = new RegExp(
    `\\d+\\\\,\\\\mathrm\\{${big}\\}\\\\ \\d+\\\\,\\\\mathrm\\{${small}\\}` +
      `|\\d+\\\\,\\\\mathrm\\{(?:${big}|${small})\\}`,
    "g",
  );
  return [...c.matchAll(re)].length;
}

/**
 * 「비교」 — 견줄 것이 **둘 이상**이고, 발문이 어느 쪽·차례·사잇값을 묻는가.
 *
 * $\square$ 도 견줄 자리 하나로 센다(4단은 한 자리를 비워 두고 그 값을 묻는다).
 */
function capCompares(c: string, alt: string): boolean {
  const [big, small] = capUnitsOfSection(alt);
  const seen = capQuantityCount(c, big, small) + (/\\square|□/.test(c) ? 1 : 0);
  const asks =
    /기호를 쓰시오|차례로|가장 (?:큰|작은) 수|알맞은 것을 쓰시오/.test(c);
  return seen >= 2 && asks;
}

/**
 * 「단위」 — 준 꼴과 **다른 단위**로 묻는가. 그게 이 소단원이 시키는 일이다.
 *
 * ⚠️ 「몇 L 몇 mL인지」는 「몇 mL인지」를 **부분 문자열로 품는다.** 섞은 꼴을 먼저
 *    가려내지 않으면 방향 둘이 같은 것으로 읽힌다 — 이 저장소가 여러 번 밟은 자리다.
 *
 * ⚠️ **「작은 단위 값이 있다」와 「작은 단위 **하나로만** 준 값이 있다」는 다르다.**
 *    섞은 꼴 `$2\,\mathrm{L}\ 300\,\mathrm{mL}$` 안에도 `300\,\mathrm{mL}` 가 있어서,
 *    그냥 찾으면 **「섞은 꼴로 주고 섞은 꼴로 묻는」**(환산이 하나도 안 드는) 발문이
 *    통과한다. 음성 눈금이 그걸 잡았다 — 그래서 섞은 꼴을 **지우고** 남는 것을 본다.
 */
function capConverts(c: string, alt: string): boolean {
  const [big, small] = capUnitsOfSection(alt);
  const mixedRe = new RegExp(
    `\\d+\\\\,\\\\mathrm\\{${big}\\}\\\\ \\d+\\\\,\\\\mathrm\\{${small}\\}`,
    "g",
  );
  const mixed = mixedRe.test(c);
  const rest = c.replace(mixedRe, "");
  const smallOnly = new RegExp(`\\d+\\\\,\\\\mathrm\\{${small}\\}`).test(rest);
  const bigOnly = new RegExp(`\\d+\\\\,\\\\mathrm\\{${big}\\}`).test(rest);
  const boxBig = new RegExp(`\\\\square\\\\,\\\\mathrm\\{${big}\\}`).test(c);
  const boxSmall = new RegExp(`\\\\square\\\\,\\\\mathrm\\{${small}\\}`).test(
    c,
  );
  // 1단 — 등식의 두 변이 서로 다른 단위다.
  const eqCross = (boxSmall && (mixed || bigOnly)) || (boxBig && smallOnly);
  // 2~4단 — 문장이 «준 꼴과 다른 단위»로 묻는다. 섞은 꼴을 **먼저** 가른다.
  const asksMixed = new RegExp(`몇 ${big} 몇 ${small}인지`).test(c);
  const asksSmall = !asksMixed && new RegExp(`몇 ${small}인지`).test(c);
  return eqCross || (asksSmall && mixed) || (asksMixed && smallOnly);
}

/**
 * 「합과 차」 — 두 양을 더하거나 빼는 셈이 지면에 있는가.
 *
 * 1단은 식에 부호가 있고, 2~4단은 문장이라 **해설의 수 계산**으로 떨어뜨린다
 * (문장형에 구조 검사를 대면 거짓 경보가 난다 — 이 파일 `loose` 주석 참조).
 */
function capAddSub(c: string, alt: string, solution: string): boolean {
  const [, small] = capUnitsOfSection(alt);
  const opInStem = new RegExp(`\\\\mathrm\\{${small}\\}[+-]`).test(c);
  const words = /더 담|덜어 냈|담았습니다|남은/.test(c);
  const opInSolution = /\d+\s*[+-]\s*\d+\s*=/.test(solution);
  return opInStem || (words && opInSolution);
}

const CHECKS: Check[] = [
  // ── 초4 2-4 사각형 (2026-08-23, elem-g4) ────────────────────────────
  //
  // ⚠️ **needle 에 소단원 번호를 붙였다.** 이름만 쓰면 샌다(실측):
  //   `사다리꼴` → 초4 2-4-4 **+ 초5 1-6-5**「마름모와 사다리꼴의 넓이」
  //   `마름모`   → 초4 2-4-6 **+ 초5 1-6-5**
  // 넓이 소단원에 「이 사각형이 사다리꼴인가」를 요구하면 곧바로 거짓 경보다(g3 이 짚었다).
  //
  // ⚠️ **발문만 보면 안 된다 — 실측 거짓 경보 838건.** 2단은 **일부러 이름을 안 쓰고
  // 성질로 말한다**(「어떤 사각형은 마주 보는 한 쌍의 변만 서로 평행합니다」). g3 이
  // 도형 넷에서 같은 이유로 1,273건을 겪고 알려 줘서 **쓰기 전에 재고** 피했다.
  //
  // ⚠️ **표준도 이름을 안 쓰는 가지가 있다.** 표준 2-4-6 의 「그림에서 네 변의 길이가
  // 모두 같은 사각형의 기호를 쓰시오」는 발문에도 해설에도 「마름모」가 없다(200 중 58).
  // 그래서 **이름 또는 그 성질**을 받는다 — 이름만 요구하면 멀쩡한 표준이 걸린다.
  shapeNameCheck(
    "2-4-4 사다리꼴",
    /사다리꼴|평행한 변이 한 쌍|한 쌍의 변만 서로 평행|한 쌍만 서로 평행|평행한 두 변/,
  ),
  shapeNameCheck("2-4-6 마름모", /마름모|네 변의 길이가 모두 같/),
  shapeNameCheck(
    "2-4-7 여러 가지 사각형",
    /사다리꼴|평행사변형|마름모|직사각형|정사각형|네 변의 길이가 모두 같|네 각의 크기가 모두 같/,
  ),
  // ── 초4 2-2 삼각형 (2026-08-23, elem-g4) ────────────────────────────
  //
  // 이 다섯은 **위반도 빚도 아니었다** — 빚 발견기의 `CONDITION_VOCAB` 가 셈본 낱말뿐이라
  // 도형 이름이 통째로 목록 밖이었다(내 열쇠로 전 학년 27개, g3 열쇠로 41개. 열쇠가
  // 다르지 다 맞게 잰 것이다). 어휘는 g3 이 넓혔고, 이 다섯의 검사는 여기서 갚는다.
  //
  // ⚠️ **needle 을 「각의 크기에 따라 분류하기」로 짧게 쓰면 초4 1-2-3 까지 샌다.**
  // 그 소단원은 «각»을 예각·직각·둔각으로 가르는 자리라 삼각형 이름이 나올 까닭이 없고,
  // 그대로 두면 거짓 경보가 난다 — **거짓 경보는 가드를 끈다.** 재 보고 좁혔다(실측:
  // 짧은 needle 은 1-2-3·2-2-4 둘, 「삼각형을 각의…」는 2-2-4 하나).
  {
    needle: "삼각형을 변의 길이에 따라 분류하기",
    // 변으로 가르는 자리다 — 각도만 있고 변이 없으면 그 소단원이 아니다.
    ok: (c) => /\\mathrm\{cm\}/.test(c) || BY_SIDE.test(c),
  },
  {
    needle: "이등변삼각형의 성질",
    // 「두 각이 같다」·「두 변이 같다」를 다른 말로 쓸 수 있으니 이름만 요구하지 않는다.
    ok: (c) => /이등변삼각형|크기가 같은 두 각|길이가 같은 두 변|밑각/.test(c),
  },
  {
    needle: "정삼각형의 성질",
    ok: (c) => /정삼각형|세 각의 크기가 모두 같|세 변의 길이가 모두 같/.test(c),
  },
  {
    needle: "삼각형을 각의 크기에 따라 분류하기",
    // ⚠️ 처음엔 「각도(°)가 있어야 한다」를 같이 걸었는데 **곧바로 거짓 경보**가 났다 —
    // 「직각삼각형에서 직각이 아닌 두 각의 크기의 합은 몇 도인가?」에는 수가 하나도 없다.
    // 수가 없는 것은 결함이 아니다. 이 소단원이 내건 것은 **가르는 어휘**다.
    ok: (c) => /예각|직각|둔각/.test(c),
  },
  {
    needle: "두 가지 기준으로 분류하기",
    // **이 소단원의 알맹이가 바로 「둘 다」다.** 한 축만 나오면 2-2-1 이나 2-2-4 가 된다.
    // 붙이자마자 실제로 하나 잡았다 — 1단이 세 각을 주고 «변» 기준만 물어 각 기준이
    // 문항에 아예 없었다. 검사가 옳고 갈래가 약했다(2026-08-23, 그 자리에서 갈래를 고쳤다).
    ok: (c) => BY_SIDE.test(c) && BY_ANGLE.test(c),
  },
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
    ok: (c) => anyFraction(c),
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
    ok: (c) => anyFraction(c),
  },
  {
    needle: "세 자리 수",
    ok: (c) =>
      numbers(c).some((v) => Number.isInteger(v) && v >= 100 && v <= 999),
    when: notDecimalContext,
    loose: digitLoose,
  },
  {
    needle: "두 자리 수",
    ok: (c) =>
      numbers(c).some((v) => Number.isInteger(v) && v >= 10 && v <= 99),
    when: notDecimalContext,
    loose: digitLoose,
  },
  {
    needle: "한 자리 수",
    ok: (c) => numbers(c).some((v) => Number.isInteger(v) && v >= 1 && v <= 9),
    when: notDecimalContext,
    loose: digitLoose,
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
    // 이 조건은 몫-성질과 달리 **발문의 소수들에서 직접 잴 수 있다** — 식이 없는 문장형
    // 갈래도 사각지대로 두지 않는다(2026-08-23: loose 가 없어 문장형이 전량 위반이었다).
    loose: (c) => {
      const dps = decimalPlaces(c);
      return dps.length >= 2 && dps.every((d) => d === dps[0]);
    },
  },
  {
    needle: "자릿수가 다른",
    ok: (c) => {
      const o = operandsOf(c, "div");
      return o !== null && o[0].dp > 0 && o[1].dp > 0 && o[0].dp !== o[1].dp;
    },
    loose: (c) => {
      const dps = decimalPlaces(c);
      return dps.length >= 2 && new Set(dps).size >= 2;
    },
  },
  {
    // 초6 2-2-5 «나누어 주고 남는 양» — 2026-08-23 실측: 이 소단원에 붙는 검사가
    // **하나도 없었고**, 발견기 어휘에도 「남는」이 없어 빚 목록에도 안 떴다(침묵의 침묵).
    // 조건: 몫을 자연수까지 구하는 꼴이므로 **남는 수가 0 이 아니어야** 뜻이 산다.
    // 발문에 남는 수가 안 적히는 갈래(묻는 것이 남는 수)는 해설에서 읽는다.
    needle: "남는 양",
    ok: (c, _s, solution) => {
      // ㉠ 나눗셈식이 있으면 자연수 몫을 지은 뒤 남는 것을 잰다.
      const fromDiv = (t: string) => {
        const m = t.match(/(\d+(?:\.\d+)?)\\div(\d+(?:\.\d+)?)/);
        if (!m) return null;
        const a = Number(m[1]);
        const b = Number(m[2]);
        if (b === 0) return null;
        return a - Math.floor(a / b + 1e-9) * b; // 부동소수 오차는 1e-9 로 누른다
      };
      // ㉡ 문장형 해설은 나눗셈식이 아니라 **곱셈·뺄셈**으로 적는 것이 이 소단원의 정본이다
      //    (`3\times4=12` · `14.5-12=2.5`). 그 뺄셈의 결과가 곧 남는 수다.
      //    나눗셈식만 찾으면 이 부류가 통째로 위반이 된다 — 눈금이 그것을 잡았다.
      const fromSub = (t: string) => {
        const m = t.match(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)=(\d+(?:\.\d+)?)/);
        return m ? Number(m[3]) : null;
      };
      // ㉢ **역산 갈래**(남는 수를 주고 처음 양을 되짚는다)의 해설은 덧셈이다
      //    (`5\times4=20` · `20+4.6=24.6`) — 더해지는 쪽이 남는 수다.
      //    뺄셈만 보면 이 갈래가 통째로 위반이 된다(실측 40/40).
      const fromAdd = (t: string) => {
        const m = t.match(/(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)=(\d+(?:\.\d+)?)/);
        return m ? Number(m[2]) : null;
      };
      const rem =
        fromDiv(c) ??
        fromDiv(solution ?? "") ??
        fromSub(solution ?? "") ??
        fromAdd(solution ?? "");
      return rem !== null && rem > 1e-9;
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
  {
    // 초6 2-2-4 «몫을 반올림하여 나타내기» — 발견기 빚 목록 첫 상환 (2026-08-23).
    // 몫이 요구한 자리 안에서 딱 떨어지면 반올림이 뜻이 없다($2.5$ 를 «반올림»시키는 문항).
    // needle 을 «몫을 반올림하여» 로 좁혀 초5 «반올림 알아보기»(어림 일반)에는 안 붙인다.
    // 문장형 갈래가 생기면 올림 검사처럼 해설 폴백으로 읽는다.
    needle: "몫을 반올림하여",
    ok: (c, _s, solution) => {
      const read = (t: string) => {
        const m = t.match(/\$(\d+(?:\.\d+)?)\\div(\d+(?:\.\d+)?)\$/);
        return m ? Number(m[1]) / Number(m[2]) : null;
      };
      const q = read(c) ?? read(solution ?? "");
      const place = c.match(/소수 (첫|둘)째 자리/);
      if (q === null || !place) return false;
      return quotientDp(q) > (place[1] === "첫" ? 1 : 2);
    },
  },
  {
    // 초6 2-4-2 «**간단한** 자연수의 비로 나타내기» — 발견기 빚 목록 상환 (2026-08-23).
    //
    // 이 소단원의 약속은 **답**에 있다(두 항이 서로소). 그런데 이 판정기는 답을 안 본다 —
    // 그래서 **반대편**을 잰다: 지면에 «아직 간단하지 않은 것»이 남아 있는가.
    // 이미 기약인 자연수 비만 실린 문항은 고칠 것이 없어 소단원이 성립하지 않는다.
    // (답의 기약 여부는 `elemTiersG6.test.ts` 가 씨앗 전량으로 잰다 — 둘이 다른 축이다.)
    needle: "간단한 자연수의 비",
    ok: unsimplifiedOnPage,
  },
  {
    // 초6 2-4-5 «비례배분» — 몫이 **자연수로 떨어지는가**.
    //
    // 전체가 지면에 있으면 「전체 ÷ (비의 항의 합)」이 떨어지는지 **직접** 잰다.
    // 역산형(전체를 묻는 갈래)은 전체가 답이라 지면에 없다 — 그때는 loose 로
    // 「비가 실려 있고 그 비가 가장 간단한 자연수의 비인가」까지만 본다.
    // ⚠️ loose 를 «통과»로 읽지 말 것. 그 갈래에서 **못 잰 것**은 나눗셈이다.
    needle: "비례배분",
    ok: (c) => {
      const r = ratioTerms(c);
      if (!r) return false;
      const sum = r.reduce((s, v) => s + v, 0);
      const inRatio = new Set(r);
      return numbers(c).some(
        (v) =>
          Number.isInteger(v) && v > sum && !inRatio.has(v) && v % sum === 0,
      );
    },
    loose: (c) => {
      const r = ratioTerms(c);
      return r !== null && r.reduce((g, v) => gcdOf(g, v), 0) === 1;
    },
  },
  {
    // 초6 2-5-3 «원의 넓이 어림하기» — 발문이 **도형을 하나로 정하는가** (2026-08-23).
    //
    // 「원 안에 그린 마름모」는 무수히 많다. 교과서는 **그림이** 내접·외접을 정해 주는데
    // 우리 지면에는 그림이 없었다. 답($2r^2$·$4r^2$)은 교과서 규약대로 맞으니
    // **값 검산으로는 구조적으로 안 잡힌다** — 그래서 조건이 «지면에 서 있는가»를 잰다.
    //
    // ⚠️ needle 을 「어림」으로 하면 **일곱 소단원**에 붙는다(초3 1-4-4 길이 어림하기 ·
    // 초5 2-1-6 반올림 알아보기와 어림의 활용 …). 세어 보고 「원의 넓이 어림」으로 좁혔다.
    //
    // ⚠️ 한정어가 **있기만** 하면 통과시키지 않는다 — 「마름모인데 네 변이 닿는다」처럼
    // 조건이 엉뚱해도 초록이 된다. 도형과 조건의 **짝**을 본다.
    needle: "원의 넓이 어림",
    ok: (c) => {
      if (!c.includes("꼭 맞게")) return false;
      if (c.includes("마름모"))
        return /단, 마름모의 네 꼭짓점은 모두 원 위에 있습니다/.test(c);
      if (c.includes("정사각형"))
        return /단, 정사각형의 네 변은 모두 원에 닿습니다/.test(c);
      // 아는 도형이 아니면 **위반**이다 — 새 문형이 조용히 통과하면 그 자리는 안 잰다.
      return false;
    },
  },
  // ── 초3 미커버 13소단원 상환 (2026-08-23, elem-g3) ────────────────────
  // 위 「초3 미커버 13소단원의 연장」 주석 참조. 검사는 **16개**인데 소단원은 열셋이다 —
  // 2-1-3 이 모양 셋을 늘어놓고, 2-2 는 «내림 × 모양» 네 짝이기 때문이다.
  // 눈금(양성·음성)은 아래 FIXTURES 에 짝으로 넣었다.

  // 초3 1-2 평면도형 — 이름이 곧 지킬 성질이다.
  // 1-2-2 는 「각, 직각 알아보기」라 **쉼표로 갈리므로** needle 이 뒷 토막이다.
  shapeNameCheck("직각 알아보기", /직각/),
  {
    needle: "직각삼각형 알아보기",
    // 직각만 요구하면 1-2-2(각) 문항도 통과한다 — 삼각형 축을 같이 세운다.
    // 「변이 셋」은 심화가 조건을 **말로 푸는** 표현이라 같이 받는다(실측).
    ok: (c, _s, solution) => {
      const t = c + (solution ?? "");
      return /직각/.test(t) && /삼각형|변이 셋/.test(t);
    },
  },
  shapeNameCheck("직사각형 알아보기", /직사각형/),
  shapeNameCheck("정사각형 알아보기", /정사각형/),

  // 초3 2-1 곱셈 — 이름이 **피연산자 모양**을 셋 늘어놓는다(어느 하나면 통과).
  mulShapeCheck("(몇십)×(몇십)", isTens, isTens),
  mulShapeCheck("(몇십몇)×(몇십)", isTensOnes, isTens),
  mulShapeCheck("(몇)×(몇십몇)", isOnesDigit, isTensOnes),
  mulShapeCheck("(몇십몇)×(몇십몇)", isTensOnes, isTensOnes),

  // 초3 2-2 나눗셈 — 모양과 **내림**을 같이 요구한다.
  // 내림 여부는 소단원 이름 **전체**에 있고 쉼표 뒤 토막(`(몇십몇)÷(몇)`)에는 없다.
  // 그래서 `when` 이 (alt 가 아니라) **section 전체**를 보는 것이 이 배선의 핵심이다 —
  // alt 만 보면 2-2-1 의 뒷 토막이 「내림 아무거나」가 되어 조건이 조용히 새어 나간다.
  divBorrowCheck("(몇십)÷(몇)", false, isTens, (s) =>
    s.includes("내림이 없는"),
  ),
  divBorrowCheck("(몇십몇)÷(몇)", false, isTensOnes, (s) =>
    s.includes("내림이 없는"),
  ),
  divBorrowCheck("(몇십)÷(몇)", true, isTens, (s) => s.includes("내림이 있는")),
  divBorrowCheck("(몇십몇)÷(몇)", true, isTensOnes, (s) =>
    s.includes("내림이 있는"),
  ),
  {
    // 2-2-3 「나머지가 있는」 — 나머지가 0 이면 이 소단원이 성립하지 않는다.
    // ⚠️ 모양(몇십몇÷몇)은 **같이 요구하지 않는다.** 문장형·역산형은 나눗셈 식이
    //    지면에 없어 나뉘는 수를 못 읽는 자리가 있고, 거기서 모양을 요구하면
    //    멀쩡한 문항이 걸린다. 나머지 축은 아래 셋 중 하나로 늘 읽힌다.
    needle: "나머지가 있는",
    ok: (c, _s, solution) => {
      const sol = solution ?? "";
      const div = (t: string) => t.match(/(\d+)\\div(\d+)/);
      const m = div(c) ?? div(sol);
      if (m) return Number(m[1]) % Number(m[2]) !== 0;
      // 문장형은 식이 없다 — 해설의 「$a-p=r$」에서 r 이 나머지다.
      const sub = sol.match(/(\d+)-(\d+)=(\d+)/);
      if (sub) return Number(sub[3]) !== 0;
      // 역산형은 나머지를 **발문이 말한다**(「나머지가 $3$ 인 나눗셈」).
      const said = (c + " " + sol).match(/나머지[가는] \$(\d+)\$/);
      return said ? Number(said[1]) !== 0 : false;
    },
  },

  // 초3 2-3 원 — 갈래가 없고 표준뿐이다(그림 kind 가 아직 없다, elem-figures 확인).
  // 2-3-1 은 세 이름 중 **하나라도** 있으면 된다 — 여기서는 「반지름」이 「지름」에
  // 걸려도 해가 없다(어느 쪽이든 이 소단원의 어휘다). 2-3-2 는 «둘 다»를 요구하므로
  // 같은 겹침이 거기서는 결함이 된다 — 두 물음이 다르다.
  shapeNameCheck("원의 중심", /원의 중심|반지름|지름/),
  {
    // 「원의 성질」이 뜻하는 것은 **지름과 반지름의 관계**다(지름 = 반지름의 2배).
    // 한쪽만 나오면 2-3-1(이름 알기)과 구별되지 않는다.
    //
    // ⚠️ **「반지름」 안에 「지름」이 들어 있다.** 그냥 `/지름/` 로 물으면 반지름만 있는
    //    발문이 «둘 다 있다»로 읽혀 통과한다 — 음성 눈금이 그 자리에서 걸렸다.
    //    앞 글자가 「반」이 아닌 지름만 센다.
    needle: "원의 성질",
    ok: (c, _s, solution) => {
      const t = c + (solution ?? "");
      return /(?<!반)지름/.test(t) && /반지름/.test(t);
    },
  },

  {
    // 초3 2-4-2·2-4-3 「분수만큼은 얼마인지」 — **발문만** 본다.
    // 이 파일이 이미 적어 둔 그 자리다: 발문에 분수가 하나도 없으면 1-3 나눗셈과
    // 구별되지 않는다. 해설까지 보면 그 결함이 **구조적으로 안 잡힌다**(해설은 늘 쓴다).
    needle: "분수만큼은 얼마인지",
    ok: (c) => anyFraction(c),
  },

  /* ── 초3 2-5 들이와 무게 (2026-08-24 elem-g3) ───────────────────────────
   *
   * 여섯 소단원이 **셋 × 둘**이다(비교·단위·합과 차 × 들이·무게). 생성기가 공장
   * 셋을 나눠 쓰므로 **조건도 셋만** 둔다 — 여섯 벌로 적으면 한쪽만 고쳐도 아무도 모른다.
   *
   * ⚠️ **셋은 서로를 배제하지 않는다.** 「합과 차」의 해설에도 환산이 있고 「단위」의
   *    심화에도 덧셈이 있다. 배제로 짜면 거짓 경보가 쏟아지고, **거짓 경보는 가드를
   *    끈다**(2026-08-20). 그래서 각 조건은 그 소단원이 **반드시 시키는 일**만 요구한다:
   *
   *      비교    → 견줄 것이 둘 이상이고, 발문이 **어느 쪽·차례·사잇값**을 묻는가
   *      단위    → 준 꼴과 **다른 단위**로 묻는가 (환산이 실제로 드는가)
   *      합과 차 → 두 양을 **더하거나 빼는 셈**이 지면에 있는가
   *
   *    리드가 든 예 「들이 비교하기인데 단위 변환만 있다」는 **첫째가 잡는다** —
   *    환산만 있는 발문에는 「기호를 쓰시오」도 「차례로」도 없기 때문이다.
   *    음성 눈금으로 그 발문을 그대로 박아 두었다(아래 FIXTURES).
   */

  {
    needle: "들이 비교",
    ok: (c, alt) => capCompares(c, alt),
  },
  {
    needle: "무게 비교",
    ok: (c, alt) => capCompares(c, alt),
  },
  {
    needle: "들이의 단위",
    ok: (c, alt) => capConverts(c, alt),
  },
  {
    needle: "무게의 단위",
    ok: (c, alt) => capConverts(c, alt),
  },
  {
    needle: "들이의 합과 차",
    ok: (c, alt, sol) => capAddSub(c, alt, sol ?? ""),
  },
  {
    needle: "무게의 합과 차",
    ok: (c, alt, sol) => capAddSub(c, alt, sol ?? ""),
  },
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
  // ── 초4 2-4 사각형 — 걸려야 하는 것 (양성) ─────────────────────────
  {
    section: "2-4-4 사다리꼴",
    content: "네 변의 길이가 $7\\,\\mathrm{cm}$인 마름모의 네 변의 합은?",
    want: false,
    why: "사다리꼴 소단원인데 평행도 사다리꼴도 없다",
  },
  {
    section: "2-4-6 마름모",
    content:
      "직사각형의 가로가 $8\\,\\mathrm{cm}$, 세로가 $5\\,\\mathrm{cm}$입니다. 네 변의 합은?",
    want: false,
    why: "마름모 소단원인데 마름모도 «네 변이 모두 같음»도 없다",
  },
  // ── 초4 2-4 사각형 — 걸리면 안 되는 것 (음성 대조군) ───────────────
  {
    section: "2-4-4 사다리꼴",
    content:
      "어떤 사각형은 마주 보는 두 변 중 한 쌍만 서로 평행합니다. 이 사각형의 이름을 쓰고, " +
      "네 변의 길이가 $5\\,\\mathrm{cm}$, $4\\,\\mathrm{cm}$, $9\\,\\mathrm{cm}$, $6\\,\\mathrm{cm}$일 때 " +
      "네 변의 길이의 합을 구하시오.",
    want: true,
    why: "**2단은 일부러 이름을 안 쓴다** — 발문만 보면 838건이 거짓 경보였던 그 자리",
  },
  {
    section: "2-4-6 마름모",
    content: "그림에서 네 변의 길이가 모두 같은 사각형의 기호를 쓰시오.",
    solution:
      "가는 네 변의 길이가 모두 같습니다. 나는 이웃한 두 변의 길이가 다릅니다.",
    want: true,
    why: "**표준도 이름을 안 쓴다**(200 중 58) — 이름만 요구하면 멀쩡한 표준이 걸린다",
  },
  // ── 초4 2-2 삼각형 — 걸려야 하는 것 (양성) ─────────────────────────
  {
    section: "2-2-5 삼각형을 두 가지 기준으로 분류하기",
    content:
      "세 각의 크기가 $35^\\circ$, $35^\\circ$, $110^\\circ$인 삼각형을 " +
      "변의 길이에 따라 분류하면 무엇인가?",
    want: false,
    why: "**한 축만 있다** — 이 소단원이 내건 것은 «두 가지»다. 실제로 내 1단이 이랬다",
  },
  {
    section: "2-2-4 삼각형을 각의 크기에 따라 분류하기",
    content: "세 변의 길이가 $7\\,\\mathrm{cm}$인 삼각형의 세 변의 합은?",
    want: false,
    why: "각으로 가르는 자리인데 가르는 어휘가 하나도 없다",
  },
  {
    section: "2-2-2 이등변삼각형의 성질",
    content: "정삼각형의 한 각의 크기는 몇 도인가?",
    want: false,
    why: "이등변삼각형의 성질을 묻는 자리에 그 삼각형이 없다",
  },
  // ── 초4 2-2 삼각형 — 걸리면 안 되는 것 (음성 대조군) ───────────────
  {
    section: "2-2-5 삼각형을 두 가지 기준으로 분류하기",
    content:
      "두 밑각의 크기가 각각 $25^\\circ$이고 나머지 한 각이 $130^\\circ$인 삼각형을 " +
      "변의 길이와 각의 크기 두 가지 기준으로 각각 무엇이라고 하는가?",
    want: true,
    why: "**표준이 쓰는 문형** — 이름 없이 기준만 말한다. 좁게 잡으면 이게 걸린다",
  },
  {
    section: "2-2-4 삼각형을 각의 크기에 따라 분류하기",
    content: "직각삼각형에서 직각이 아닌 두 각의 크기의 합은 몇 도인가?",
    want: true,
    why: "**수가 하나도 없다** — 「각도(°)가 있어야 한다」로 걸었다가 곧바로 난 거짓 경보",
  },
  {
    section: "2-2-3 정삼각형의 성질",
    content:
      "세 각의 크기가 모두 같은 삼각형이 있습니다. " +
      "한 변의 길이가 $9\\,\\mathrm{cm}$일 때 세 변의 길이의 합은 몇 cm인가?",
    want: true,
    why: "이름을 숨기고 각 조건으로 준 갈래 — 이름만 요구하면 이게 걸린다",
  },
  {
    section: "2-2-2 이등변삼각형의 성질",
    content:
      "어떤 삼각형에 크기가 같은 두 각이 있고 그중 한 각의 크기가 $46^\\circ$입니다. " +
      "크기가 같은 나머지 한 각의 크기는 몇 도인가?",
    want: true,
    why: "「이등변삼각형」이라는 말 없이 그 성질을 쓰는 갈래",
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

  // ── «어떤 수» 와일드카드 (2026-08-23, g4 초4 1-3-2 심화 거짓 경보 40/40) ──
  {
    section: "1-3-2 (세 자리 수)×(두 자리 수)의 계산",
    content:
      "어떤 수에 $41$을 곱해야 할 것을 잘못하여 $14$를 곱했더니 $6146$이 되었습니다. 바르게 계산한 값은 얼마입니까?",
    want: true,
    loose: true,
    why: "«어떤 수»(=439)가 안 적힌 세 자리 몫을 갈음한다 — g4 심화 역산형 그대로",
  },
  {
    section: "1-3-2 (세 자리 수)×(두 자리 수)의 계산",
    content: "$41$을 $14$배 한 값은 얼마입니까?",
    want: false,
    loose: true,
    why: "«어떤 수»도 □ 도 없이 세 자리가 빠졌다 — 음성 대조",
  },

  // ── 초6 2-2-4 몫을 반올림 (2026-08-23, 발견기 빚 목록 첫 상환) ─────────────
  {
    section: "2-2-4 몫을 반올림하여 나타내기",
    content: "$10\\div4$ 의 몫을 반올림하여 소수 첫째 자리까지 나타내시오.",
    want: false,
    why: "몫 2.5 — 첫째 자리에서 이미 끝나 반올림이 뜻이 없다",
  },
  {
    section: "2-2-4 몫을 반올림하여 나타내기",
    content: "$10\\div8$ 의 몫을 반올림하여 소수 둘째 자리까지 나타내시오.",
    want: false,
    why: "몫 1.25 — 둘째 자리에서 끝난다",
  },
  {
    section: "2-2-4 몫을 반올림하여 나타내기",
    content: "$10\\div3$ 의 몫을 반올림하여 소수 첫째 자리까지 나타내시오.",
    want: true,
    why: "몫 3.33… — 둘째 자리에서 반올림한다",
  },

  // ── 초6 2-2 자릿수 loose · 남는 양 (2026-08-23, 8차분) ────────────────────
  // loose 는 «잴 수 있는 것을 재는 확장»이다 — 양성만 두면 사각지대를 여는 완화가 된다.
  // 그래서 «자릿수가 다른데 «같은» 소단원» 음성 대조를 반드시 둔다(리드 조건 ㉠).
  {
    section: "2-2-1 자릿수가 같은 (소수)÷(소수) 알아보기",
    content:
      "간장 $6.4$ L를 한 병에 $0.8$ L씩 나누어 담으려고 합니다. 병은 몇 개 필요합니까?",
    want: true,
    loose: true,
    why: "문장형 — 식은 없지만 발문의 소수 둘이 자릿수가 같다",
  },
  {
    section: "2-2-1 자릿수가 같은 (소수)÷(소수) 알아보기",
    content:
      "간장 $6.44$ L를 한 병에 $0.8$ L씩 나누어 담으려고 합니다. 병은 몇 개 필요합니까?",
    want: false,
    loose: true,
    why: "자릿수가 다르다(2 vs 1) — 음성 대조. loose 가 다 통과시키면 여기서 걸린다",
  },
  {
    section: "2-2-2 자릿수가 다른 (소수)÷(소수) 알아보기",
    content:
      "넓이가 $15.47$ m²이고 가로가 $3.5$ m인 직사각형 모양 화단이 있습니다. 세로는 몇 m입니까?",
    want: true,
    loose: true,
    why: "문장형 — 소수 자릿수가 실제로 다르다",
  },
  {
    section: "2-2-2 자릿수가 다른 (소수)÷(소수) 알아보기",
    content:
      "넓이가 $15.4$ m²이고 가로가 $3.5$ m인 직사각형 모양 화단이 있습니다. 세로는 몇 m입니까?",
    want: false,
    loose: true,
    why: "자릿수가 같다 — 음성 대조",
  },
  {
    section: "2-2-5 나누어 주고 남는 양 알아보기",
    content:
      "$14.5\\div3$ 에서 몫을 자연수까지 구할 때 몫과 남는 수를 구하시오.",
    want: true,
    why: "몫 4, 남는 수 2.5 — 남는 것이 있다",
  },
  {
    section: "2-2-5 나누어 주고 남는 양 알아보기",
    content: "$12\\div3$ 에서 몫을 자연수까지 구할 때 몫과 남는 수를 구하시오.",
    want: false,
    why: "딱 떨어진다 — «남는 양»이 뜻을 잃는다(수리 전이라면 이 부류가 통째로 침묵했다)",
  },
  {
    section: "2-2-5 나누어 주고 남는 양 알아보기",
    content:
      "간장 $14.5$ L를 한 사람에게 $3$ L씩 나누어 주려고 합니다. 몇 명에게 나누어 줄 수 있고 몇 L가 남습니까?",
    solution:
      "$3\\times4=12$ 이므로 $4$명에게 줄 수 있고, $14.5-12=2.5$ 가 남습니다.",
    want: true,
    loose: true,
    why: "문장형 — 식은 해설에서 읽는다(올림 검사와 같은 폴백)",
  },
  {
    section: "2-2-5 나누어 주고 남는 양 알아보기",
    content:
      "간장을 한 사람에게 $5$ L씩 나누어 주었더니 $4$명에게 줄 수 있고 $4.6$ L가 남았습니다. 처음에 있던 간장은 몇 L입니까?",
    solution: "$5\\times4=20$ 입니다. $20+4.6=24.6$ 입니다.",
    want: true,
    loose: true,
    why: "역산 갈래 — 해설이 **덧셈**이라 뺄셈만 보면 위반이 된다(실측 40/40)",
  },
  {
    section: "2-2-5 나누어 주고 남는 양 알아보기",
    content:
      "간장을 한 사람에게 $5$ L씩 나누어 주었더니 $4$명에게 꼭 맞게 나누어 주었습니다. 처음에 있던 간장은 몇 L입니까?",
    solution: "$5\\times4=20$ 입니다. $20+0=20$ 입니다.",
    want: false,
    loose: true,
    why: "남는 것이 $0$ 이다 — 덧셈 폴백이 아무 덧셈이나 통과시키면 여기서 걸린다(음성 대조)",
  },
  // ── 초6 2-4 비례식과 비례배분 (2026-08-23) ────────────────────────
  {
    section: "2-4-2 간단한 자연수의 비로 나타내기",
    content: "다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n$3:4$",
    want: false,
    why: "이미 기약이라 «간단히 할 것»이 지면에 없다 — 소단원이 성립하지 않는다",
  },
  {
    section: "2-4-2 간단한 자연수의 비로 나타내기",
    content: "다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n$72:27$",
    want: true,
    why: "두 항이 서로소가 아니다 — 약분할 것이 남아 있다",
  },
  {
    section: "2-4-2 간단한 자연수의 비로 나타내기",
    content:
      "주스의 양은 $0.3\\,\\mathrm{L}$ 이고 우유의 양은 $0.4\\,\\mathrm{L}$ 입니다. 두 양의 비를 가장 간단한 자연수의 비로 나타내시오.",
    want: true,
    why: "소수는 그 자체로 «자연수의 비로 고칠 일»이다(비 표기가 없어도 통과해야 한다)",
  },
  {
    section: "2-4-2 간단한 자연수의 비로 나타내기",
    content:
      "다음 비를 가장 간단한 자연수의 비로 나타내시오.\n\n$2\\,\\mathrm{m}:150\\,\\mathrm{cm}$",
    want: true,
    why: "단위가 서로 다르면 맞추는 걸음이 남아 있다 — 소수가 없어도 통과해야 한다(경계)",
  },
  {
    section: "2-4-5 비례배분",
    content: "$40$을 $3:4$로 비례배분하면 두 수는 각각 얼마입니까?",
    want: false,
    why: "$40\\div7$ 이 떨어지지 않는다 — 몫이 자연수가 아니면 초등 답이 안 나온다",
  },
  {
    section: "2-4-5 비례배분",
    content: "$42$를 $3:4$로 비례배분하면 두 수는 각각 얼마입니까?",
    want: true,
    why: "$42\\div7=6$ — 전체가 항의 합으로 나누어떨어진다",
  },
  {
    section: "2-4-5 비례배분",
    content:
      "구슬을 지안과 예준이 $4:3$으로 나누어 가졌더니 예준이 $27$개를 가졌습니다. 처음 구슬은 모두 몇 개입니까?",
    want: true,
    loose: true,
    why: "역산 갈래 — 전체가 **답**이라 지면에 없다. 비가 기약인지까지만 잰다(못 잰 것은 나눗셈)",
  },
  {
    section: "2-4-5 비례배분",
    content:
      "구슬을 지안과 예준이 $4:6$으로 나누어 가졌더니 예준이 $27$개를 가졌습니다. 처음 구슬은 모두 몇 개입니까?",
    want: false,
    loose: true,
    why: "loose 가 «아무 비나» 통과시키면 여기서 걸린다 — $4:6$ 은 가장 간단한 비가 아니다(음성 대조)",
  },
  // ── 초6 2-5-3 원의 넓이 어림하기 (2026-08-23) ─────────────────────
  {
    section: "2-5-3 원의 넓이 어림하기",
    content:
      "반지름이 $6\\,\\mathrm{cm}$ 인 원의 넓이를 어림하려고 합니다. 원 안에 그린 마름모의 넓이는 몇 cm²인가?",
    want: false,
    why: "한정어가 없다 — 그런 마름모는 무수히 많다(그림이 없으니 답이 하나로 안 선다). 수리 전 지면 그대로",
  },
  {
    section: "2-5-3 원의 넓이 어림하기",
    content:
      "반지름이 $6\\,\\mathrm{cm}$ 인 원의 넓이를 어림하려고 합니다. 원 안에 꼭 맞게 그린 마름모의 넓이는 몇 cm²인가? 단, 정사각형의 네 변은 모두 원에 닿습니다.",
    want: false,
    why: "조건이 **도형과 안 맞는다**(마름모인데 정사각형 조건). 한정어가 «있기만» 하면 통과시키는 검사였으면 초록이다",
  },
  {
    section: "2-5-3 원의 넓이 어림하기",
    content:
      "반지름이 $6\\,\\mathrm{cm}$ 인 원의 넓이를 어림하려고 합니다. 원 안에 꼭 맞게 그린 마름모의 넓이는 몇 cm²인가? 단, 마름모의 네 꼭짓점은 모두 원 위에 있습니다.",
    want: true,
    why: "내접 조건이 서 있다 — 원에 내접하는 마름모는 정사각형뿐이라 두 대각선이 지름이다",
  },
  {
    section: "2-5-3 원의 넓이 어림하기",
    content:
      "반지름이 $9\\,\\mathrm{cm}$ 인 원의 넓이를 어림하려고 합니다. 원 밖에 꼭 맞게 그린 정사각형의 넓이는 몇 cm²인가? 단, 정사각형의 네 변은 모두 원에 닿습니다.",
    want: true,
    why: "외접 조건이 서 있다 — 네 변이 닿으면 한 변이 지름이다",
  },
  // ── 초3 미커버 13소단원 상환 눈금 (2026-08-23, elem-g3) ─────────────────
  // 양성(걸려야)·음성(통과해야)을 **짝으로** 둔다. 음성이 없으면 「지어냄 0」이
  // 구조적으로 0 이 되어 아무것도 못 잰다(2026-08-20 판정자 눈금과 같은 자리).
  {
    section: "1-2-2 각, 직각 알아보기",
    content: "가, 나 중에서 더 큰 각의 기호를 쓰시오.",
    solution: "가 가 더 큽니다.",
    want: false,
    why: "직각이 발문에도 해설에도 없다 — 이 소단원이 가르는 것이 직각이다",
  },
  {
    section: "1-2-2 각, 직각 알아보기",
    content:
      "가, 나 중에서 종이를 두 번 접어 만든 각과 같은 각의 기호를 쓰시오.",
    solution: "문장이 가리키는 것은 직각입니다. 꼭 맞는 각은 가 입니다.",
    want: true,
    why: "기본 갈래는 **일부러 이름을 안 쓴다** — 해설이 직각을 말하면 통과",
  },
  {
    section: "1-2-3 직각삼각형 알아보기",
    content: "가, 나 중에서 직각인 각의 기호를 쓰시오.",
    solution: "직각인 각은 가 입니다.",
    want: false,
    why: "직각은 있는데 **삼각형 축이 없다** — 그러면 1-2-2 문항이다",
  },
  {
    section: "1-2-3 직각삼각형 알아보기",
    content:
      "가, 나 와 라 중에서 「변이 셋」과 「직각이 있다」를 함께 만족하는 도형은 몇 개인지 쓰시오.",
    solution: "변이 셋인 것은 가, 나 이고 그중 직각이 있는 것은 가 입니다.",
    want: true,
    why: "심화는 조건을 **말로 푼다** — 「변이 셋」도 삼각형 축이다",
  },
  {
    section: "1-2-4 직사각형 알아보기",
    content: "가, 나 중에서 정사각형의 기호를 쓰시오.",
    solution: "네 변의 길이가 모두 같은 정사각형은 나 입니다.",
    want: false,
    why: "정사각형을 묻는다 — 「정사각형」에는 「직사각형」이 안 들어 있다",
  },
  {
    section: "1-2-4 직사각형 알아보기",
    content: "가, 나 중에서 네 꼭짓점이 모두 직각인 사각형의 기호를 쓰시오.",
    solution: "문장이 가리키는 것은 직사각형입니다. 가 입니다.",
    want: true,
    why: "이름 대신 성질로 말한 기본 갈래",
  },
  {
    section: "1-2-5 정사각형 알아보기",
    content:
      "가로 $8$ cm, 세로 $9$ cm인 직사각형의 네 변의 길이의 합은 몇 cm인지 쓰시오.",
    solution: "$8+9+8+9=34$ 이므로 $34$ 입니다.",
    want: false,
    why: "직사각형 문항이다 — 정사각형이 아니다",
  },
  {
    section: "1-2-5 정사각형 알아보기",
    content: "가, 나 중에서 네 변의 길이가 모두 같은 사각형의 기호를 쓰시오.",
    solution: "네 변이 모두 같은 사각형이 정사각형입니다. 나 입니다.",
    want: true,
    why: "성질로 말했고 해설이 이름을 댄다",
  },
  {
    section: "2-1-3 (몇십)×(몇십), (몇십몇)×(몇십), (몇)×(몇십몇)",
    content: "$26\\times12$ 를 계산하시오.",
    want: false,
    why: "둘 다 몇십몇이다 — 그건 2-1-4 다 (세 모양 어느 것도 아니다)",
  },
  {
    section: "2-1-3 (몇십)×(몇십), (몇십몇)×(몇십), (몇)×(몇십몇)",
    content: "$17\\times20$ 을 계산하시오.",
    want: true,
    why: "(몇십몇)×(몇십)",
  },
  {
    section: "2-1-3 (몇십)×(몇십), (몇십몇)×(몇십), (몇)×(몇십몇)",
    content: "$20\\times17$ 을 계산하시오.",
    want: true,
    why: "**자리를 바꿔도 같은 소단원이다** — 순서를 요구하면 거짓 경보가 난다",
  },
  {
    section: "2-1-4 (몇십몇)×(몇십몇)",
    content: "$30\\times60$ 을 계산하시오.",
    want: false,
    why: "둘 다 몇십이다 — 2-1-3 문항",
  },
  {
    section: "2-1-4 (몇십몇)×(몇십몇)",
    content: "다음 두 수의 곱을 구하시오. $19$, $46$",
    solution: "$19\\times46=874$ 입니다.",
    want: true,
    why: "발문에 식이 없다 — **해설에서** 읽는다",
  },
  {
    section: "2-2-1 내림이 없는 (몇십)÷(몇), (몇십몇)÷(몇)",
    content: "$90\\div2$ 를 계산하시오.",
    want: false,
    why: "$9\\div2$ 가 안 떨어져 **내림이 있다** — 이 소단원은 없는 쪽이다",
  },
  {
    section: "2-2-1 내림이 없는 (몇십)÷(몇), (몇십몇)÷(몇)",
    content: "$84\\div4$ 를 계산하시오.",
    want: true,
    why: "$8\\div4$ 가 떨어져 내림이 없다",
  },
  {
    section: "2-2-2 내림이 있는 (몇십)÷(몇), (몇십몇)÷(몇)",
    content: "$84\\div4$ 를 계산하시오.",
    want: false,
    why: "내림이 없다 — 이 소단원은 있는 쪽이다. 쉼표 뒤 토막에는 「내림」이 **없으므로** `when` 이 section 전체를 봐야 이 눈금이 산다",
  },
  {
    section: "2-2-2 내림이 있는 (몇십)÷(몇), (몇십몇)÷(몇)",
    content:
      "나누는 수가 $4$ 인 나눗셈의 몫이 $16$ 입니다. 나뉘는 수를 구하시오.",
    solution:
      "나누어지는 수는 곱으로 되짚습니다. $4\\times16=64$ 이므로 $64$ 입니다.",
    want: true,
    why: "역산형은 **나눗셈 식이 지면에 없다** — 해설의 곱으로 되짚는다($64\\div4$, $6%4≠0$)",
  },
  {
    section: "2-2-3 나머지가 있는 (몇십몇)÷(몇)",
    content: "$84\\div4$ 의 몫과 나머지를 쓰시오.",
    want: false,
    why: "나누어떨어진다 — 나머지가 없으면 이 소단원이 아니다",
  },
  {
    section: "2-2-3 나머지가 있는 (몇십몇)÷(몇)",
    content:
      "색종이 $14$장을 $4$명에게 똑같이 나누어 줄 때 남는 색종이는 몇 장인지 쓰시오.",
    solution: "$4\\times3=12$ 이고 $14-12=2$ 입니다.",
    want: true,
    why: "문장형은 해설의 **뺄셈**이 나머지다. 곱으로 되짚으면 $12\\div4$ 라 나머지가 0 이 되어 **멀쩡한 문항이 전량 거짓 빨강**이 된다 — 그래서 되짚기를 내림 검사에만 쓴다",
  },
  {
    section: "2-2-3 나머지가 있는 (몇십몇)÷(몇)",
    content:
      "나누는 수가 $9$ 이고 몫이 $6$, 나머지가 $3$ 인 나눗셈이 있습니다. 나뉘는 수를 구하시오.",
    solution: "$9\\times6=54$ 이고 $54+3=57$ 이므로 $57$ 입니다.",
    want: true,
    why: "역산형은 나머지를 **발문이 말한다** — 뺄셈도 나눗셈 식도 없다",
  },
  {
    section: "2-3-1 원의 중심, 지름, 반지름",
    content: "원을 그릴 때 쓰는 도구의 이름을 쓰시오.",
    solution: "컴퍼스입니다.",
    want: false,
    why: "세 이름 어느 것도 안 나온다",
  },
  {
    section: "2-3-1 원의 중심, 지름, 반지름",
    content:
      "원의 중심과 원 위의 한 점을 이은 선분을 무엇이라고 하는지 쓰시오.",
    solution: "반지름입니다.",
    want: true,
    why: "이름을 묻는 소단원이다",
  },
  {
    section: "2-3-2 원의 성질",
    content: "반지름이 $9\\,\\mathrm{cm}$ 인 원을 그리시오.",
    solution: "컴퍼스를 $9\\,\\mathrm{cm}$ 벌려 그립니다.",
    want: false,
    why: "지름이 없다 — 이 소단원의 성질은 **지름과 반지름의 관계**다",
  },
  {
    section: "2-3-2 원의 성질",
    content: "반지름이 $9\\,\\mathrm{cm}$ 인 원의 지름은 몇 cm인지 쓰시오.",
    solution: "지름은 반지름의 $2$ 배입니다.",
    want: true,
    why: "두 이름이 다 서서 관계를 묻는다",
  },
  {
    section: "2-4-2 분수만큼은 얼마인지 알아보기 (1)",
    content:
      "사탕 $24$개를 $3$명이 똑같이 나누어 가지면 한 사람은 몇 개인지 쓰시오.",
    solution: "$24\\div3=8$ 이고 이는 전체의 $\\frac{1}{3}$ 만큼입니다.",
    want: false,
    why: "**발문에** 분수가 없다 — 그러면 1-3 나눗셈과 구별되지 않는다. 해설까지 보면 이 결함이 구조적으로 안 잡힌다",
  },
  {
    section: "2-4-3 분수만큼은 얼마인지 알아보기 (2)",
    content: "구슬 $24$개의 $\\frac{3}{4}$ 만큼은 몇 개인지 쓰시오.",
    want: true,
    why: "발문이 분수를 이고 있다",
  },

  // ── 초3 2-5 들이와 무게 (2026-08-24 elem-g3) ──────────────────────────
  //
  // ⚠️ **음성 넷을 먼저 썼다.** 「일부러 걸리는 입력을 하나 넣어 빨개지는 것부터
  //    보라」(리드) — 0 은 「깨끗」과 「못 셈」을 안 갈라 준다.
  {
    section: "2-5-1 들이 비교하기",
    content: "$3\\,\\mathrm{L}\\ 400\\,\\mathrm{mL}$ 는 몇 mL인지 쓰시오.",
    want: false,
    why: "**리드가 든 그 결함** — 들이 비교하기인데 견줄 것이 하나뿐이고 환산만 시킨다",
  },
  {
    section: "2-5-4 무게 비교하기",
    content:
      "가 상자의 무게는 $2\\,\\mathrm{kg}\\ 500\\,\\mathrm{g}$, 나 상자의 무게는 $2700\\,\\mathrm{g}$ 입니다. 두 상자의 무게를 모두 g으로 고치시오.",
    want: false,
    why: "양은 둘인데 **견주기를 안 묻는다** — 고쳐 쓰기만 시킨다",
  },
  {
    section: "2-5-2 들이의 단위",
    content: "$2\\,\\mathrm{L}\\ 300\\,\\mathrm{mL}$ 는 몇 L 몇 mL인지 쓰시오.",
    want: false,
    why: "준 꼴과 묻는 꼴이 **같다** — 환산이 하나도 안 든다",
  },
  {
    section: "2-5-6 무게의 합과 차",
    content:
      "가 자루의 무게는 $4\\,\\mathrm{kg}\\ 200\\,\\mathrm{g}$ 입니다. 몇 g인지 쓰시오.",
    want: false,
    why: "합도 차도 없다 — 「단위」 소단원이 할 일이다",
  },
  // 양성 — 실제로 지면에 나가는 꼴 넷(갈래 1~4를 하나씩).
  {
    section: "2-5-1 들이 비교하기",
    content:
      "두 들이를 비교하여 $\\square$ 안에 $>$ 와 $<$ 중 알맞은 것을 쓰시오.\n\n$4\\,\\mathrm{L}\\ 356\\,\\mathrm{mL}$ $\\square$ $4290\\,\\mathrm{mL}$",
    want: true,
    why: "1단 — 견줄 것이 둘이고 부등호를 묻는다",
  },
  {
    section: "2-5-4 무게 비교하기",
    content:
      "가 자루의 무게는 $\\square\\,\\mathrm{g}$ 입니다. 가 자루는 나 자루보다 무겁고, 다 자루보다 가볍습니다. 나 자루의 무게는 $4\\,\\mathrm{kg}\\ 618\\,\\mathrm{g}$, 다 자루의 무게는 $5\\,\\mathrm{kg}\\ 13\\,\\mathrm{g}$ 입니다. $\\square$ 안에 들어갈 수 있는 수 중 가장 큰 수를 쓰시오.",
    want: true,
    why: "4단 — 사잇값을 묻는다(견주기는 조건 둘로 들어 있다)",
  },
  {
    section: "2-5-5 무게의 단위",
    content:
      "봉지에 담긴 사과의 무게는 $8\\,\\mathrm{kg}\\ 900\\,\\mathrm{g}$ 입니다. 이 무게는 몇 g인지 쓰시오.",
    want: true,
    why: "2단 — 섞은 꼴로 주고 작은 단위로 묻는다",
  },
  {
    section: "2-5-3 들이의 합과 차",
    content:
      "물병에 보리차가 $3\\,\\mathrm{L}\\ 210\\,\\mathrm{mL}$ 있었습니다. 여기에 보리차를 $2\\,\\mathrm{L}\\ 900\\,\\mathrm{mL}$ 더 담고, 다시 $500\\,\\mathrm{mL}$ 를 덜어 냈습니다. 지금 물병에 있는 보리차는 몇 L 몇 mL인지 쓰시오.",
    solution: "먼저 더하면 $3210+2900=6110$ 입니다.",
    want: true,
    why: "3단 — 문장이라 **해설의 수 계산**으로 떨어뜨린다",
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
    (allowLoose && (c.loose?.(content, alt) ?? false));
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

// ── 미커버 발견기 (2026-08-23) ────────────────────────────────────────────
//
// 초3 1-4(올림)·초4 1-3-5/6(몇십몇)이 **같은 무늬로** 침묵했다 — CHECKS 는 손 목록이라
// 새고, 목록에 없는 부류는 영영 0 이다. 그래서 「이름이 조건을 약속하는데 검사가 하나도
// 안 붙는 소단원」을 전수로 찍는다. **게이트가 아니라 빚 목록이다**(exit 코드 불변).
//
// ⚠️ 이 어휘 목록도 손 목록이다 — 여기 없는 조건어 부류는 발견기도 못 본다.
// 그래도 「검사 없는 조건어」 한 층은 스스로 드러나게 된다(0 이면 0 이라고 찍는다).
// ⚠️ 「남는」은 2026-08-23 에 **실측으로** 채웠다 — 초6 2-2-5 «나누어 주고 남는 양»이
// 검사도 없고 이 어휘에도 없어 **빚 목록에조차 안 떴다**(침묵의 침묵). 어휘가 손 목록인
// 한 이런 자리는 또 생긴다 — 새 조건어를 만나면 여기부터 채울 것.
//
// ⚠️ **「어림」은 일부러 안 넣었다** (2026-08-23, 초6 2-5-3 을 고치며 판단·리드 승인).
// 넣으면 일곱 소단원이 한꺼번에 빚 목록에 오른다 — 초3 1-4-4 «길이 어림하기» ·
// 초4 1-2-4 «각의 크기를 어림하고» · 초5 2-1-6 «반올림 알아보기와 어림의 활용» 등.
// 그 이름들의 「어림」은 **조건이 아니라 주제**다(무엇을 지켜야 하는지를 안 말한다).
// 갚을 수 없는 빚을 일곱 줄 올리면 **목록 자체가 신뢰를 잃는다** — 그러면 진짜 빚도
// 같이 안 보인다. 초6 2-5-3 은 어휘가 아니라 **needle 「원의 넓이 어림」**으로 잡았다.
// ── 무엇을 어휘에 넣는가 — **「이름이 조건을 약속하나, 주제를 말하나」** ────────
//
// 2026-08-23 에 판단이 두 번 갈렸고, 그 둘을 나란히 두는 것이 다음 사람에게 기준이 된다.
//  · **넣는다 — 「분수만큼」**: 소단원이 **지킬 성질**을 약속한다. 실제로
//    초3 2-4-2 기본이 「사탕 $24$개를 $3$명이 나누어 가짐」이라 **지면에 분수가 하나도
//    없었고**, 그러면 1-3 나눗셈과 구별되지 않는다. 갚을 수 있는 빚이다.
//  · **안 넣는다 — 「어림하기」**: 초5 2-1-6·초3 1-4-4 등 **일곱**이 걸리는데, 그 일곱은
//    이름이 **주제**를 말할 뿐 지킬 성질을 약속하지 않는다. 넣으면 갚을 수 없는 빚이
//    일곱 줄 늘고 **목록 자체가 신뢰를 잃는다**(g6 판단).
//
// ⚠️ **「성질」이라는 낱말로 재지 말 것.** 초6 2-4-1 「비의 성질」·2-4-4 「비례식의 성질」이
//    딸려 온다 — g4 가 그래서 29 → 27 로 스스로 깎았다. 그래서 아래 도형 어휘는
//    **도형 이름 자체**로 잡는다(직각·이등변·사다리꼴…). 이름이 곧 지킬 성질이다.
//
// ⚠️ 이 어휘는 **손 목록이고, 그래서 샌다.** 여기 없는 부류는 발견기도 못 본다 —
//    초6 2-2-5 「남는」이 그랬고(낱말 하나), 2026-08-23 에 **도형이 통째로** 빠져 있던
//    것을 g4 가 실측으로 찾았다(27소단원). 새 부류를 만나면 여기부터 채울 것.
const CONDITION_VOCAB =
  /받아올림|받아내림|올림|내림|버림|나누어떨어|나머지|남는|자리 수|몇십몇|몇십|몇백|1보다 (?:작은|큰)|[이가] (?:없는|있는)|간단한 자연수의 비|비례배분|분수만큼|직각|예각|둔각|이등변|정삼각형|정사각형|직사각형|평행사변형|사다리꼴|마름모|정다각형|합동|대칭|수직|평행|둘레|넓이|부피|겉넓이|직육면체|정육면체|각기둥|각뿔|원기둥|원뿔|반지름|지름|원주|원의 성질/;

/** 이 소단원에 실제로 붙는 검사 수 — when 게이트까지 통과한 것만 센다. */
function attachedChecks(section: string): number {
  let n = 0;
  for (const alt of section.split(/\s*,\s*/)) {
    n += CHECKS.filter(
      (c) => alt.includes(c.needle) && (c.when?.(section) ?? true),
    ).length;
  }
  return n;
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
  // 발견기 눈금 — 0 이 «깨끗»인지 «못 셈»인지 가르는 자리다. 미커버 양성은 일부러
  // **가짜 이름**(받아내림 뺄셈 — 검사가 아직 없다)으로 만든다.
  // ⚠️ 이름에 «(두 자리 수)» 를 넣으면 자리수 검사가 붙어 미커버가 아니게 된다 —
  //    실측으로 걸렸다. 이것이 이 발견기의 한계이기도 하다: 검사가 **하나라도** 붙으면
  //    빚 목록에서 빠지므로, 자리수만 커버되고 받아내림 약속은 침묵인 소단원은 못 본다.
  const fake = "9-9-9 받아내림이 있는 뺄셈 알아보기";
  for (const [why, got] of [
    [
      "발견기: 커버된 이름(초3 1-4-2)은 검사가 붙는다",
      attachedChecks("1-4-2 올림이 없는 (몇십몇)×(몇)") > 0,
    ],
    [
      "발견기: 미커버 양성(가짜 «받아내림») — 조건어인데 검사 0 이어야",
      attachedChecks(fake) === 0 && CONDITION_VOCAB.test(fake),
    ],
  ] as const) {
    if (!got) failed += 1;
    console.log(`  ${got ? "✅" : "❌"} ${why}`);
  }
  // 개수를 손으로 적으면 fixture 를 늘릴 때마다 거짓말이 된다 — 세어서 찍는다.
  const positives = FIXTURES.filter((f) => !f.want).length;
  const loose = FIXTURES.filter((f) => f.loose).length;
  console.log(
    failed === 0
      ? `\n✅ 눈금 ${FIXTURES.length}건 + 발견기 2건 전부 맞다 (양성 ${positives} · 음성 ${FIXTURES.length - positives} · 그중 문장형 ${loose})`
      : `\n❌ 눈금 ${failed}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
// 재는 동안 생성기가 쓰이면 이 수치는 못 쓴다 — 2026-08-23 거짓 빨강의 실물이 여기다.
const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
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

// **찍기 전에** 닫는다 — 뒤에 닫으면 못 쓸 수치를 이미 내보낸 뒤다.
fence.close();

console.log(
  `조건이 있는 소단원 ${checked}${gradeArg ? ` (${gradeArg})` : ""} · ${fence.scopeLine()}\n`,
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

// 미커버 발견기 — 게이트가 아니라 빚 목록이다(0 이어도 0 이라고 찍는다).
const uncovered = units.filter(
  (u) => CONDITION_VOCAB.test(u.section) && attachedChecks(u.section) === 0,
);

/**
 * **그림 몫** — 이름이 «무엇을 **그리는가**»를 말하는 것. 「전개도를 그렸는가」·「밑면이
 * 어느 것인가」는 **문자열로 물을 수 없고**, 지면 판정이 그림 엔진에 달려 있다.
 *
 * 왜 갈라 찍나 — 빼 버리면 목록이 「다 덮었다」고 말한다(이 저장소가 계속 데인 **침묵의
 * 0**). 덮이지 않은 것은 **사실**이므로 숨기지 않고, 대신 **갚을 수 있는 것**과 갈라
 * 학년 담당의 할 일 목록이 짧아지게 한다.
 *
 * ⚠️ **「도형 단원이면 다 그림 몫」이 아니다.** 겉넓이·부피·둘레·원주는 그림이 있어도
 *   **값**이라 셈으로 갚을 수 있다 — 가르는 것은 단원이 아니라 **묻는 것이 값인가
 *   그림인가**다. 「도형 단원」으로 갈랐으면 초6 1-6-1·1-6-2 같은 갚을 수 있는 여섯이
 *   조용히 그림 칸으로 밀리고, **아무도 그 사실을 모른다**(실측 32 → 26).
 *
 * ⚠️ 이 목록도 **손 목록이라 샌다.** 「투영도」·「밑그림」 같은 낱말이 새로 나오면
 *   여기부터 채울 것. 여기 없는 부류는 **갚을 수 있는 칸**으로 들어가 할 일로 남는다
 *   (안전한 쪽이다 — 못 갚을 것이 할 일에 남는 편이, 갚을 것이 숨는 것보다 낫다).
 */
const DRAWING_DEBT = /전개도|겨냥도|구성 요소|밑면과 옆면/;
const payable = uncovered.filter((u) => !DRAWING_DEBT.test(u.section));
const drawing = uncovered.filter((u) => DRAWING_DEBT.test(u.section));

console.log(
  `\n조건어 미커버 ${uncovered.length}건 (빚 목록, 게이트 아님)` +
    `\n  · 조건 검사로 **갚을 수 있는 것** ${payable.length}` +
    `\n  · **그림 몫** ${drawing.length} — 그림 엔진이 붙어야 갚는다`,
);
if (payable.length > 0) {
  console.log("\n  ── 갚을 수 있는 것 (이름이 조건을 약속하는데 검사가 0)");
  for (const u of payable) console.log(`  · ${u.grade} ${u.section}`);
}
if (drawing.length > 0) {
  console.log("\n  ── 그림 몫 (이름이 «무엇을 그리는가»를 말한다)");
  for (const u of drawing) console.log(`  · ${u.grade} ${u.section}`);
}

process.exitCode = broken.length === 0 ? 0 : 1;
