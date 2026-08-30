/**
 * **초5 2-4 소수의 곱셈 — 확대 갈래 «심화중»·«심화상» (D-113 파일럿, 2026-08-30).**
 *
 * ## 무엇을 잠그나 — 축을 셋 세웠고, **셋이 서로 다른 것을 본다**
 *
 * ⑴ **심화중이 «후보 줄을 범위로 자른 것»인가** — 시험이 발문의 후보 줄을 **직접
 *    전수로** 훑어 답을 다시 만든다. 그래서 «빠뜨린 답»과 «범위 밖인데 넣은 답»이
 *    둘 다 걸린다. 그리고 답이 **둘 이상**임을 요구한다 — 하나면 그건 심화하의
 *    한 걸음 역산이지 열거가 아니다.
 *
 * ⑵ **심화상이 «배열을 전수 탐색해야 나오는 것»인가** — 시험이 발문의 «꼴»과 카드로
 *    배열을 **전부 만들어** 곱을 견준다. 핵심은 마지막 한 줄이다:
 *    **만들 수 있는 가장 큰 곱이 조건에 걸려 빠진다.** 그래야 「큰 수를 앞자리에」라는
 *    요령이 막히고, 학생이 실제로 여럿을 만들어 견주게 된다.
 *    이것이 이 시험에서 **심화상을 심화중 위에 세우는 유일한 반증 가능한 문장**이다.
 *
 * ⑶ **소단원의 약속** — 만들 수 있는 배열이 **전부** 그 소단원의 꼴인가.
 *    참은 내 코드가 아니라 **교육과정 SSOT 의 소단원 이름**에서 온다
 *    (`(1보다 작은 소수)×(자연수)` 를 괄호째 읽어 조건으로 쓴다).
 *
 * 그리고 사다리를 **셀 수 있는 형태**로 한 줄 더 잠근다 — 두 갈래의 해설 계산 걸음이
 * 같은 소단원 «심화하»보다 많다(잣대는 제품 함수 `countCalcSteps` 하나를 쓴다).
 *
 * ## 🔴 이 시험이 **못 보는 것** (다음 사람 몫 — 여기 안 적으면 「검사됐다」로 읽힌다)
 *
 * · **「어려운가」자체.** 걸음 수도 후보 수도 **모양**이지 어려움이 아니다. 이 저장소가
 *   전 학년 10,944문항에 열쇠 셋을 대 보고 전부 버린 자리다
 *   (`probe-elem-tier-ladder.ts` ㉡-b). 높이는 원장님이 `/dev/tier-bench/g5` 에서 보신다.
 * · **「심화상이 심화중보다 학생에게 어렵나」.** 이 자가 재는 것은 «후보 공간이 한 줄이
 *   아니라 배열이다» 하나뿐이다. **배열이 곧 더 어렵다는 것은 가정**이고, 실측한 계산
 *   걸음은 둘이 **겹친다**(심화중 4~6 · 심화상 4~9). 그 가정을 확정하는 것이 이 파일럿의
 *   목적이지 이 시험의 결론이 아니다.
 * · **다른 지름길.** ⑵ 가 막는 것은 「가장 큰 곱을 그냥 고르기」 **한 가지**다. 후보 둘만
 *   견주면 되는 배치처럼 다른 요령은 못 본다.
 * · **지면(문형) 경로.** 이 파일럿은 갈래만 채웠다 — 적재본에는 한 건도 안 나간다.
 *   그 사실은 `probe-elem-extending-tiers.ts` 가 두 줄로 따로 찍는다.
 */
import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
} from "@/lib/elementary/generate";
import { countCalcSteps } from "@/lib/elementary/make";

import { tiersOf } from "../helpers/elemTiers";

const CODES = [
  "2-4-1",
  "2-4-2",
  "2-4-3",
  "2-4-4",
  "2-4-5",
  "2-4-6",
  "2-4-7",
] as const;

const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(code),
  )!;

const problem = (code: string, tier: ElemTier, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier);

/* ── 시험이 쓰는 자 — 값은 **정수 스케일**로만 다룬다(부동소수 금지) ────────── */

/** `[정수 스케일 값, 소수점 아래 자릿수]`. */
type S = [number, number];

/** 자릿수가 다른 둘을 견주기 위한 공통 분모. */
const q = ([v, d]: S): number => v * (10000 / 10 ** d);
const mulS = (a: S, b: S): S => [a[0] * b[0], a[1] + b[1]];

/** `"0.35"` → `[35, 2]`. 수가 아니면 null — 애매하면 읽지 않는다. */
function readDec(tok: string): S | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(tok.trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  return [Number(m[1] + frac), frac.length];
}

/** 지면 표기 — 꼬리 0 을 접는다(`[60,1]` → `"6"`). */
function text([v, d]: S): string {
  let val = v;
  let dp = d;
  while (dp > 0 && val % 10 === 0) {
    val /= 10;
    dp -= 1;
  }
  return dp === 0 ? String(val) : (val / 10 ** dp).toFixed(dp);
}

/** `$6,\ 7,\ 8$` → `["6","7","8"]`. 한 덩어리가 아니면 여기서 빨개진다. */
function answerList(answer: string): string[] {
  const m = /^\$(.+)\$$/.exec(answer);
  expect(m, `정답이 KaTeX 한 덩어리가 아니다: ${answer}`).not.toBeNull();
  return m![1]!.split(",\\ ").map((s) => s.trim());
}

/* ── ⑴ 심화중 — 후보 줄을 시험이 직접 훑는다 ──────────────────────────────── */

/**
 * `$0.7\times\square$` 같은 식에서 **고정값과 후보 줄**을 읽는다.
 *
 * ⚠️ 자연수 후보를 **40 까지** 훑는다 — 생성기가 쓰는 20 보다 넓다. 생성기와 같은
 *    범위를 쓰면 「생성기가 안 본 후보가 실은 범위 안이었다」를 구조적으로 못 본다.
 * ⚠️ `0.\square`·`1.\square` 의 □ 에는 **0 도 넣어 본다.** 발문은 「들어갈 수 있는 수」
 *    라고만 했으므로 0 이 조건에 맞으면 그것도 답이어야 한다.
 */
function midSpace(
  frame: string,
): { fixed: S; cands: { label: number; s: S }[] } | null {
  const parts = frame.split("\\times");
  if (parts.length !== 2) return null;
  const [l, r] = parts as [string, string];
  const boxLeft = l.includes("\\square");
  const other = boxLeft ? r : l;
  const boxTok = (boxLeft ? l : r).trim();
  if (other.includes("\\square")) return null;
  const fixed = readDec(other);
  if (!fixed) return null;
  if (boxTok === "\\square") {
    return {
      fixed,
      cands: Array.from({ length: 40 }, (_, i) => ({
        label: i + 1,
        s: [i + 1, 0] as S,
      })),
    };
  }
  const digit = /^(\d)\.\\square$/.exec(boxTok);
  if (digit) {
    return {
      fixed,
      cands: Array.from({ length: 10 }, (_, i) => ({
        label: i,
        s: [Number(digit[1]) * 10 + i, 1] as S,
      })),
    };
  }
  return null;
}

/** 발문만 보고 **답이 무엇이어야 하는가**를 시험이 다시 만든다. */
function midTruth(content: string): string[] {
  const band = /\$([\d.]+)\$보다 크고 \$([\d.]+)\$보다 작/.exec(content);
  expect(band, `범위를 못 읽었다:\n${content}`).not.toBeNull();
  const lo = q(readDec(band![1]!)!);
  const hi = q(readDec(band![2]!)!);

  // ㉠ 「$…$에 …을 각각 곱했습니다」 — 후보가 **곱하는 수 목록**이고 답은 그 **곱**이다.
  const each = /^\$([\d.]+)\$에 (.+?)을 각각 곱했습니다/.exec(content);
  if (each) {
    const base = readDec(each[1]!)!;
    const muls = [...each[2]!.matchAll(/\$([\d.]+)\$/g)].map((m) =>
      readDec(m[1]!)!,
    );
    expect(muls.length, "곱하는 수 목록이 비었다").toBeGreaterThan(2);
    return muls
      .map((m) => mulS(base, m))
      .filter((p) => q(p) > lo && q(p) < hi)
      .map(text);
  }

  // ㉡ 「$…\times\square$의 값이」 — 후보가 **한 줄**이고 답은 후보의 이름이다.
  const frame = /^\$([^$]+)\$의 값이/.exec(content);
  expect(frame, `식을 못 읽었다:\n${content}`).not.toBeNull();
  const space = midSpace(frame![1]!);
  expect(space, `후보 줄을 못 읽었다: ${frame![1]}`).not.toBeNull();
  return space!.cands
    .filter((c) => {
      const p = q(mulS(space!.fixed, c.s));
      return p > lo && p < hi;
    })
    .map((c) => String(c.label));
}

/* ── ⑵ 심화상 — 배열을 시험이 직접 전부 만든다 ────────────────────────────── */

type Filling = { text: string; prod: S; ops: S[] };

/**
 * 발문의 «꼴»(`0.\square\times\square\square`)과 카드로 **배열을 전부** 만든다.
 * 카드를 서로 다른 자리에 넣는 모든 차례를 훑으므로, 「한 번씩 모두」든
 * 「중에서 두 장」이든 같은 코드가 덮는다.
 *
 * `powers` 가 있으면 꼴이 **곱셈식이 아니라 소수 하나**이고, 그 소수에 곱하는 수를
 * 차례로 붙인다(2-4-7).
 */
function arrangements(
  frame: string,
  cards: readonly number[],
  powers: readonly number[],
): Filling[] {
  const slots = (frame.match(/\\square/g) ?? []).length;
  const out: Filling[] = [];
  const walk = (used: number[], rest: number[]) => {
    if (used.length === slots) {
      let i = 0;
      const filled = frame.replace(/\\square/g, () => String(used[i++]));
      if (powers.length > 0) {
        const v = readDec(filled);
        if (!v) return;
        for (const p of powers) {
          out.push({
            text: `${filled}\\times${p}`,
            prod: mulS(v, [p, 0]),
            ops: [v, [p, 0]],
          });
        }
        return;
      }
      const halves = filled.split("\\times");
      if (halves.length !== 2) return;
      const a = readDec(halves[0]!);
      const b = readDec(halves[1]!);
      if (!a || !b) return;
      out.push({ text: filled, prod: mulS(a, b), ops: [a, b] });
      return;
    }
    for (let k = 0; k < rest.length; k += 1) {
      walk(
        [...used, rest[k]!],
        rest.filter((_, j) => j !== k),
      );
    }
  };
  walk([], [...cards]);
  return out;
}

type TopParts = {
  cards: number[];
  frame: string;
  powers: number[];
  bound: S;
};

function topParse(content: string): TopParts {
  const head = /^수 카드 (.+?)(?: 한 번씩| 중에서)/.exec(content);
  expect(head, `카드를 못 읽었다:\n${content}`).not.toBeNull();
  const cards = [...head![1]!.matchAll(/\$(\d)\$/g)].map((m) => Number(m[1]));
  expect(cards.length, `카드가 모자란다: ${head![1]}`).toBeGreaterThan(2);

  const chunks = [...content.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
  const frame = chunks.find((c) => c.includes("\\square"));
  expect(frame, `꼴을 못 읽었다:\n${content}`).not.toBeUndefined();

  const powerText = /그 소수에 (.+?) 중 한 수를 곱합니다/.exec(content);
  const powers = powerText
    ? [...powerText[1]!.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]))
    : [];

  const boundText = /\$([\d.]+)\$보다 작은 것 가운데/.exec(content);
  expect(boundText, `경계를 못 읽었다:\n${content}`).not.toBeNull();
  return { cards, frame: frame!, powers, bound: readDec(boundText![1]!)! };
}

/* ── ⑶ 소단원의 약속 — 참은 **교육과정 SSOT 의 소단원 이름**에서 온다 ───────── */

/** `"… (1보다 작은 소수)×(자연수)의 계산"` → 피연산자 둘의 조건. 못 읽으면 null. */
function operandRule(section: string): ((v: S) => boolean)[] | null {
  const m = /\(([^)]+)\)×\(([^)]+)\)/.exec(section);
  if (!m) return null;
  const of = (name: string): ((v: S) => boolean) | null => {
    if (name === "1보다 작은 소수")
      return (v) => q(v) > 0 && q(v) < 10000 && q(v) % 10000 !== 0;
    if (name === "1보다 큰 소수")
      return (v) => q(v) > 10000 && q(v) % 10000 !== 0;
    if (name === "자연수") return (v) => q(v) % 10000 === 0;
    return null;
  };
  const a = of(m[1]!);
  const b = of(m[2]!);
  return a && b ? [a, b] : null;
}

/* ── 눈금 — **이 시험의 자가 «아니오»를 낼 수 있는가** ─────────────────────── */

describe("[초5 2-4 확대] 눈금 — 시험이 쓰는 자가 살아 있다", () => {
  it("심화중 자 — 범위를 바꾸면 답이 따라 바뀐다 (양성·음성)", () => {
    const base =
      "$0.7\\times\\square$의 값이 $4$보다 크고 $6$보다 작을 때, $\\square$ 안에 들어갈 수 있는 자연수를 모두 구하시오.";
    expect(midTruth(base)).toEqual(["6", "7", "8"]);
    // 위 경계를 넓히면 $0.7\times9=6.3$ 이 들어온다 — 자가 «범위»를 실제로 본다.
    expect(midTruth(base.replace("$6$보다 작을", "$7$보다 작을"))).toEqual([
      "6",
      "7",
      "8",
      "9",
    ]);
    // 곱하는 수를 바꾸면 답이 통째로 달라진다 — 자가 «고정값»도 실제로 본다.
    expect(midTruth(base.replace("$0.7\\times", "$0.5\\times"))).toEqual([
      "9",
      "10",
      "11",
    ]);
  });

  it("심화중 자 — 「각각 곱했습니다」 꼴은 **곱**을 답으로 돌려준다", () => {
    const c =
      "$2.1$에 $0.01$, $0.1$, $10$, $100$, $1000$을 각각 곱했습니다. 그 곱 중에서 $0.5$보다 크고 $1000$보다 작은 것을 모두 구하시오.";
    expect(midTruth(c)).toEqual(["21", "210"]);
    expect(midTruth(c.replace("$1000$보다 작은", "$100$보다 작은"))).toEqual([
      "21",
    ]);
  });

  it("배열 자 — 카드 셋으로 여섯 가지를 만들고 곱을 바르게 낸다", () => {
    const made = arrangements(
      "0.\\square\\times\\square\\square",
      [3, 6, 8],
      [],
    );
    expect(made).toHaveLength(6);
    expect(made.map((f) => text(f.prod)).sort()).toEqual(
      ["20.4", "22.8", "25.8", "28.8", "49.8", "50.4"].sort(),
    );
    // 「큰 수를 앞자리에」가 여기서는 통한다 — 그래서 발문이 **조건**을 걸어야 한다.
    expect(text(made.map((f) => f.prod).sort((a, b) => q(b) - q(a))[0]!)).toBe(
      "50.4",
    );
  });

  it("배열 자 — 곱하는 수까지 붙이는 꼴(2-4-7)도 전부 만든다", () => {
    const made = arrangements(
      "\\square.\\square\\square",
      [1, 7, 8],
      [10, 100, 1000],
    );
    expect(made).toHaveLength(18);
    expect(made.some((f) => f.text === "1.87\\times100")).toBe(true);
    expect(text(made.find((f) => f.text === "1.87\\times100")!.prod)).toBe(
      "187",
    );
  });

  it("🔴 축 ⑵ 의 자 — 「가장 큰 곱이 빠진다」가 **거짓일 수도** 있다 (음성 대조)", () => {
    // 이 축은 오늘 실물에서 늘 참이다(생성기가 그렇게 고른다). 그러면 전량 초록이
    // «깨끗»인지 «못 셈»인지 안 갈린다 — 손으로 지은 발문으로 자가 «아니오»를 내는
    // 것을 여기서 못 박는다. 실물 검사는 아래 본 검사가 한다.
    const escapes = (content: string) => {
      const t = topParse(content);
      const all = arrangements(t.frame, t.cards, t.powers);
      return (
        q(all.reduce((a, b) => (q(a.prod) >= q(b.prod) ? a : b)).prod) >
        q(t.bound)
      );
    };
    const head =
      "수 카드 $3$, $6$, $8$을 한 번씩 모두 사용하여 $0.\\square\\times\\square\\square$ 꼴의 곱셈식을 만듭니다. $0.3\\times68$도 그중 하나입니다. 만들 수 있는 곱 중에서 ";
    // 경계가 가장 큰 곱($50.4$)보다 **아래** — 요령이 막힌다(참).
    expect(
      escapes(`${head}$45$보다 작은 것 가운데 가장 큰 곱을 구하시오.`),
    ).toBe(true);
    // 경계가 모든 곱보다 **위** — 「가장 큰 것을 그냥 고르면」 끝난다(거짓).
    expect(
      escapes(`${head}$99$보다 작은 것 가운데 가장 큰 곱을 구하시오.`),
    ).toBe(false);
  });

  it("소단원 이름 자 — 조건을 이름에서 읽고, 어기면 거짓을 낸다", () => {
    const r = operandRule("2-4-1 (1보다 작은 소수)×(자연수)의 계산")!;
    expect(r).not.toBeNull();
    expect(r[0]!([3, 1])).toBe(true); // 0.3
    expect(r[0]!([13, 1])).toBe(false); // 1.3 은 1보다 작지 않다
    expect(r[0]!([2, 0])).toBe(false); // 2 는 소수가 아니다
    expect(r[1]!([5, 0])).toBe(true); // 5
    expect(r[1]!([5, 1])).toBe(false); // 0.5 는 자연수가 아니다
    // 이름이 그 꼴이 아니면 **판정하지 않는다**(조용히 통과시키지 않으려고 null 이다).
    expect(operandRule("2-4-7 곱의 소수점의 위치")).toBeNull();
  });
});

/* ── 본 검사 ──────────────────────────────────────────────────────────────── */

describe("[초5 2-4 확대] 심화중 — 「후보 줄을 범위로 자른다」", () => {
  it("일곱 소단원 모두 심화중·심화상이 등록돼 있다", () => {
    for (const code of CODES) {
      expect(tiersOf(unitOf(code)), code).toEqual([
        "연산",
        "기본",
        "응용",
        "심화하",
        "심화중",
        "심화상",
      ]);
    }
  });

  it("답이 발문의 범위에서 **전수로** 다시 나온다 (씨앗 16)", () => {
    let checked = 0;
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화중", seed);
        const want = midTruth(p.content);
        expect(
          answerList(p.answer),
          `${code} 심화중 @${seed}\n${p.content}`,
        ).toEqual(want);
        checked += 1;
      }
    }
    // 분모를 지킨다 — 한 번도 안 돌면 위 단정은 아무것도 증명하지 않는다.
    expect(checked).toBe(CODES.length * SEEDS.length);
  });

  it("답이 **둘 이상**이다 — 하나면 그건 심화하의 한 걸음 역산이다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화중", seed);
        expect(
          answerList(p.answer).length,
          `${code} 심화중 @${seed} 답이 하나다\n${p.content}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("해설이 **양쪽 경계**를 둘 다 짚는다 (한쪽만 재고 맞히지 못하게)", () => {
    for (const code of CODES) {
      if (code === "2-4-7") continue; // 후보가 다섯뿐이라 해설이 전부를 늘어놓는다
      for (const seed of SEEDS) {
        const p = problem(code, "심화중", seed);
        expect(
          p.solution,
          `${code} 심화중 @${seed} 아래 경계가 없다\n${p.solution}`,
        ).toMatch(/보다 작고/);
        expect(
          p.solution,
          `${code} 심화중 @${seed} 위 경계가 없다\n${p.solution}`,
        ).toMatch(/보다 크므로/);
      }
    }
  });
});

describe("[초5 2-4 확대] 심화상 — 「배열을 전부 만들어 견줘야 한다」", () => {
  it("답이 발문의 배열 공간에서 **전수로** 다시 나온다 (씨앗 16)", () => {
    let checked = 0;
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        const t = topParse(p.content);
        const all = arrangements(t.frame, t.cards, t.powers);
        expect(
          all.length,
          `${code} 심화상 @${seed} 배열을 못 만들었다\n${p.content}`,
        ).toBeGreaterThan(3);
        const hits = all.filter((f) => q(f.prod) < q(t.bound));
        const best = hits.reduce((a, b) => (q(a.prod) >= q(b.prod) ? a : b));
        expect(p.answer, `${code} 심화상 @${seed}\n${p.content}`).toBe(
          `$${text(best.prod)}$`,
        );
        checked += 1;
      }
    }
    expect(checked).toBe(CODES.length * SEEDS.length);
  });

  it("🔴 **가장 큰 곱이 조건에 걸려 빠진다** — 「큰 수를 앞자리에」가 안 통한다", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        const t = topParse(p.content);
        const all = arrangements(t.frame, t.cards, t.powers);
        const top = all.reduce((a, b) => (q(a.prod) >= q(b.prod) ? a : b));
        expect(
          q(top.prod) > q(t.bound),
          `${code} 심화상 @${seed} 가장 큰 곱이 조건 안에 있다 — 요령으로 풀린다\n${p.content}`,
        ).toBe(true);
        expect(
          p.answer,
          `${code} 심화상 @${seed} 답이 곧 가장 큰 곱이다\n${p.content}`,
        ).not.toBe(`$${text(top.prod)}$`);
      }
    }
  });

  it("견줄 것이 넉넉하다 — 서로 다른 곱이 다섯 가지 이상, 조건에 든 것이 둘 이상", () => {
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        const t = topParse(p.content);
        const all = arrangements(t.frame, t.cards, t.powers);
        const kinds = new Set(all.map((f) => q(f.prod)));
        expect(
          kinds.size,
          `${code} 심화상 @${seed} 곱이 ${kinds.size}가지뿐이다\n${p.content}`,
        ).toBeGreaterThanOrEqual(5);
        const hits = all.filter((f) => q(f.prod) < q(t.bound));
        expect(
          new Set(hits.map((f) => q(f.prod))).size,
          `${code} 심화상 @${seed} 조건에 든 것이 하나뿐이다 — 견줄 짝이 없다\n${p.content}`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("답이 정수로 접히지 않는다 — 「소수의 곱셈」이 지면에서 사라지면 안 된다", () => {
    // ⚠️ 2-4-7 은 **자리를 옮기는** 소단원이라 정수 답이 정상이다 — 여기서 뺀다.
    for (const code of CODES) {
      if (code === "2-4-7") continue;
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        expect(
          p.answer,
          `${code} 심화상 @${seed} 답이 정수다 — 소수가 지면에서 사라졌다\n${p.content}`,
        ).toMatch(/^\$\d+\.\d+\$$/);
      }
    }
  });

  it("2-4-7 은 **곱하는 수도** 골라야 한다 — 조건에 든 것이 한 가지 곱하는 수뿐이 아니다", () => {
    for (const seed of SEEDS) {
      const p = problem("2-4-7", "심화상", seed);
      const t = topParse(p.content);
      expect(t.powers.length, `2-4-7 @${seed} 곱하는 수 목록이 없다`).toBe(3);
      const hits = arrangements(t.frame, t.cards, t.powers).filter(
        (f) => q(f.prod) < q(t.bound),
      );
      const used = new Set(hits.map((f) => f.text.split("\\times")[1]));
      expect(
        used.size,
        `2-4-7 심화상 @${seed} 조건에 든 것이 «${[...used].join()}» 하나뿐이다 — 자리 옮기기가 판정에서 빠진다\n${p.content}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("[초5 2-4 확대] 소단원의 약속 — 탐색의 «재료»가 그 소단원이다", () => {
  it("심화상이 만들 수 있는 배열이 **전부** 소단원 이름의 꼴이다", () => {
    let judged = 0;
    const skipped: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      const rule = operandRule(unit.section);
      if (!rule) {
        skipped.push(code);
        continue;
      }
      for (const seed of SEEDS) {
        const p = problem(code, "심화상", seed);
        const t = topParse(p.content);
        for (const f of arrangements(t.frame, t.cards, t.powers)) {
          expect(
            rule[0]!(f.ops[0]!) && rule[1]!(f.ops[1]!),
            `${code} 심화상 @${seed} «${f.text}» 가 «${unit.section}» 의 꼴이 아니다`,
          ).toBe(true);
          judged += 1;
        }
      }
    }
    // 판정한 수와 **건너뛴 것**을 같이 적는다 — 0 이 「깨끗」인지 「못 셈」인지 갈려야 한다.
    expect(judged, "판정한 배열이 없다").toBeGreaterThan(500);
    expect(skipped, "이름이 «(A)×(B)» 꼴이 아니어서 판정 밖인 소단원").toEqual([
      "2-4-7",
    ]);
  });

  it("심화중도 소단원의 소수를 쓴다 — 「1보다 작은/큰」이 발문에 실제로 있다", () => {
    for (const code of ["2-4-1", "2-4-3", "2-4-5"] as const) {
      for (const seed of SEEDS) {
        const c = problem(code, "심화중", seed).content;
        const decs = [...c.matchAll(/(\d+\.\d+)/g)]
          .map((m) => readDec(m[1]!)!)
          .filter((v) => q(v) < 10000 && q(v) > 0);
        expect(
          decs.length,
          `${code} 심화중 @${seed} 1보다 작은 소수가 없다\n${c}`,
        ).toBeGreaterThan(0);
      }
    }
    for (const code of ["2-4-2", "2-4-4", "2-4-6"] as const) {
      for (const seed of SEEDS) {
        const c = problem(code, "심화중", seed).content;
        const decs = [...c.matchAll(/(\d+\.\d+)/g)]
          .map((m) => readDec(m[1]!)!)
          .filter((v) => q(v) > 10000);
        expect(
          decs.length,
          `${code} 심화중 @${seed} 1보다 큰 소수가 없다\n${c}`,
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("[초5 2-4 확대] 사다리 — 셀 수 있는 형태로 한 줄", () => {
  it("두 갈래의 해설 계산 걸음이 같은 씨앗의 «심화하»보다 많다", () => {
    // 잣대는 제품 함수 하나(`countCalcSteps`)를 쓴다 — 규칙을 옮겨 적지 않는다.
    // ⚠️ 이 자는 **심화중과 심화상을 서로 가르지 못한다**(실측으로 겹친다).
    //    둘 사이의 축은 위 «배열 전수 탐색»이고, 여기는 심화하와의 층만 잠근다.
    for (const code of CODES) {
      for (const seed of SEEDS) {
        const low = countCalcSteps(problem(code, "심화하", seed).solution);
        for (const tier of ["심화중", "심화상"] as const) {
          expect(
            countCalcSteps(problem(code, tier, seed).solution),
            `${code} ${tier} @${seed} 가 심화하(${low})보다 걸음이 많지 않다`,
          ).toBeGreaterThan(low);
        }
      }
    }
  });
});
