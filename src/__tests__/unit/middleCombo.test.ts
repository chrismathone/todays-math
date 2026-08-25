/**
 * 중등 결합형(combo) 파일럿 — 원장님 승인 2026-08-24 (후보 B).
 *
 * ⚠️ 검산은 **생성기가 쓴 관계와 다른 관계**로 한다. 생성기는 $p, q$ 에서 계수를
 * «만들어» 내려가고, 여기서는 **지면에 찍힌 계수**를 읽어 이차식을 세우고 근을 구한다.
 * 같은 식을 다시 쓰면 동어반복이라 아무것도 못 잡는다.
 */
import { bareNumbers } from "@/lib/elementary/rules";
import { describe, expect, it } from "vitest";

import {
  generateMiddleComboProblem,
  generateMiddleComboSet,
  isMiddleComboId,
  middleComboDefinitions,
} from "@/lib/middle/combo";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";

const ID = "중3|원주각::중3|이차방정식의 풀이";
/** 후보 ㄱ — 원장님 승인 2026-08-25 (D-108 뒤, 대수 쪽 첫 결합형). */
const LIN = "중2|일차함수의 활용::중2|일차부등식의 풀이";
/** 곱셈 공식 × 근호 — 원장님 승인 2026-08-25 (D-110). 새 문형 둘. */
const SQRT = "중3|다항식의 곱셈::중3|근호를 포함한 식의 계산";
/**
 * **위임 등록** — 이미 등록된 유형이 곧 그 결합형이다(D-110). 새 문형이 없다.
 * `[결합형 id, 원천 유형 키]`.
 */
const DELEGATED_PAIRS: [string, string][] = [
  [
    "중2|여러 가지 연립방정식의 풀이::중2|순환소수의 분수 표현",
    "2-1|연립일차방정식|19",
  ],
  ["중2|여러 가지 연립방정식의 풀이::중2|지수법칙", "2-1|연립일차방정식|20"],
  ["중3|이차방정식의 풀이::중3|인수분해", "3-1|이차방정식의 풀이|06"],
];
const DELEGATED = DELEGATED_PAIRS.map(([id]) => id);
const SEEDS = [1, 7, 20260824, 99991, 424242];

/** 지면의 `(...)^\circ` 두 개에서 계수를 읽는다. */
function readAngles(content: string): { ins: number[]; cen: number[] } {
  const found = [...content.matchAll(/\$\(([^()]+)\)\^\\circ\$/g)].map(
    (m) => m[1]!,
  );
  expect(found).toHaveLength(2);
  const parse = (s: string): number[] => {
    const a = /(-?\d*)x\^2/.exec(s);
    const b = /([+-]\d*)x(?!\^)/.exec(s);
    const c = /([+-]\d+)(?!x)(?!\^)\s*$/.exec(s);
    const num = (t: string | undefined, dflt: number): number => {
      if (t === undefined) return dflt;
      if (t === "" || t === "+") return 1;
      if (t === "-") return -1;
      return Number(t);
    };
    return [num(a?.[1], 0), num(b?.[1], 0), num(c?.[1], 0)];
  };
  return { ins: parse(found[0]!), cen: parse(found[1]!) };
}

describe("중등 결합형 — 등록부", () => {
  it("승인된 것만 있다 — 조합기가 아니다", () => {
    const defs = middleComboDefinitions();
    expect(defs.map((d) => d.id)).toEqual([ID, LIN, SQRT, ...DELEGATED]);
    for (const id of [ID, LIN, SQRT, ...DELEGATED])
      expect(isMiddleComboId(id), id).toBe(true);
    expect(isMiddleComboId("아무거나")).toBe(false);
  });

  it("승인되지 않은 id 는 던진다 — 조용히 만들어 주지 않는다", () => {
    expect(() =>
      generateMiddleComboProblem("중1|아무거나::중2|아무거나", 1),
    ).toThrow(/승인되지 않은 결합형/);
  });

  it("원천 유형 키가 **실재하는 등록 유형**이다", () => {
    const known = new Set(registeredTypes().map((t) => t.key));
    for (const d of middleComboDefinitions()) {
      for (const k of d.conceptKeys) {
        expect(known.has(k), `${d.id} 의 원천 키 ${k}`).toBe(true);
      }
    }
  });

  it("승인 근거 세 가지가 비어 있지 않다 — 왜 중등 범위인지 적어야 한다", () => {
    for (const d of middleComboDefinitions()) {
      expect(d.curriculumBasis.trim()).not.toBe("");
      expect(d.laterConceptReview.trim()).not.toBe("");
      expect(d.gradeBoundary.trim()).not.toBe("");
    }
  });
});

describe("중등 결합형 — 원주각 × 인수분해 이차방정식", () => {
  it("지면의 두 각으로 세운 이차방정식의 양수 해가 정답이다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      const { ins, cen } = readAngles(p.content);

      // 「중심각 = 원주각 × 2」 → (cen − 2·ins) = 0
      const A = cen[0]! - 2 * ins[0]!;
      const B = cen[1]! - 2 * ins[1]!;
      const C = cen[2]! - 2 * ins[2]!;
      const disc = B * B - 4 * A * C;
      expect(disc).toBeGreaterThan(0);
      const root = Math.sqrt(disc);
      expect(Number.isInteger(root)).toBe(true); // 인수분해로 풀려야 한다
      const roots = [(-B + root) / (2 * A), (-B - root) / (2 * A)];

      const positive = roots.filter((r) => r > 0);
      expect(positive).toHaveLength(1); // 「양수 $x$」가 하나로 정해져야 한다
      expect(Number(/\$(\d+)\$/.exec(p.answer)?.[1])).toBe(positive[0]);
      expect(roots.some((r) => r < 0)).toBe(true); // 버릴 근이 실제로 있다
    }
  });

  it("나온 각이 실제로 각이다 — 원주각 < 180°, 중심각 = 2 × 원주각", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      const x = Number(/\$(\d+)\$/.exec(p.answer)?.[1]);
      const { ins, cen } = readAngles(p.content);
      const at = (k: number[]): number => k[0]! * x * x + k[1]! * x + k[2]!;
      expect(at(ins)).toBeGreaterThan(0);
      expect(at(ins)).toBeLessThan(180);
      expect(at(cen)).toBe(2 * at(ins));
      expect(at(cen)).toBeLessThanOrEqual(360);
    }
  });

  it("두 개념이 다 필요하다 — 지면에 원주각·중심각과 인수분해가 같이 있다", () => {
    const p = generateMiddleComboProblem(ID, 20260824);
    expect(p.content).toContain("원주각");
    expect(p.content).toContain("중심각");
    expect(p.solution).toContain("인수분해");
    expect(p.conceptKeys).toContain("3-2|원주각|02");
    expect(p.conceptKeys).toContain("3-1|이차방정식의 풀이|06");
  });

  it("숫자는 전부 수식 안에 있다", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      expect(bareNumbers(p.content)).toEqual([]);
      expect(bareNumbers(p.answer)).toEqual([]);
      expect(bareNumbers(p.solution)).toEqual([]);
    }
  });

  it("좌표평면을 쓰지 않는다 (D-100 ⑶)", () => {
    for (const seed of SEEDS) {
      const p = generateMiddleComboProblem(ID, seed);
      expect(`${p.content} ${p.solution}`).not.toContain("좌표");
    }
  });

  it("같은 씨앗은 같은 세트, 발문이 겹치지 않는다", () => {
    const a = generateMiddleComboSet(ID, 20260824, 5);
    const b = generateMiddleComboSet(ID, 20260824, 5);
    expect(a.map((p) => p.content)).toEqual(b.map((p) => p.content));
    expect(new Set(a.map((p) => p.content)).size).toBe(5);
  });
});

/**
 * 후보 ㄱ — 일차함수의 활용 × 일차부등식의 풀이 (원장님 승인 2026-08-25).
 *
 * ⚠️ 검산은 **`facts` 를 안 본다.** 지면에 찍힌 수만 읽어 관계를 다시 세운다 —
 * 생성기와 시험이 같은 값을 보면 동어반복이고, 지면과 `facts` 가 갈라져도 못 잡는다
 * (D-103 이 같은 함정을 이미 한 번 겪었다).
 */
const LIN_SEEDS = [1, 7, 2026, 20260825, 99991, 424242, 777];

function linSet(count: number) {
  return LIN_SEEDS.flatMap((s) => generateMiddleComboSet(LIN, s, count));
}

describe("중등 결합형 — 일차함수의 활용 × 일차부등식", () => {
  it("문형이 둘 다 나온다 (D-75 — pair 마다 family 둘 이상)", () => {
    const ids = new Set(linSet(6).map((p) => p.familyId));
    expect([...ids].sort()).toEqual([
      "moving-point-area-range",
      "water-graph-range",
    ]);
  });

  it("① 지면의 두 점으로 세운 일차함수를 부등식에 넣으면 정답이 나온다", () => {
    const items = linSet(6).filter((p) => p.familyId === "water-graph-range");
    expect(items.length).toBeGreaterThan(0);
    for (const p of items) {
      const pt = /\$\(0,\\ (\d+)\)\$, \$\((\d+),\\ (\d+)\)\$이다/.exec(
        p.content,
      );
      expect(pt, p.content).not.toBeNull();
      const [b0, px, q] = [Number(pt![1]), Number(pt![2]), Number(pt![3])];
      const t = Number(
        /양이 \$(\d+)\\,\\mathrm\{L\}\$ 이하가/.exec(p.content)![1],
      );

      // 두 점에서 기울기 → 식 → 부등식. 생성기가 쓴 순서와 반대 방향이다.
      const m = (q - b0) / px;
      expect(Number.isInteger(m)).toBe(true);
      expect(m).toBeLessThan(0); // 음수라야 부등호가 뒤집힌다 — 이 결합의 요점
      const boundary = (t - b0) / m;
      expect(Number.isInteger(boundary)).toBe(true);
      expect(boundary).toBeGreaterThan(0);

      expect(Number(/\$(\d+)\$분 후/.exec(p.answer)![1])).toBe(boundary);
      // 경계 바로 앞은 조건을 만족하지 않아야 한다 (경계가 실제로 경계인가)
      expect(m * boundary + b0).toBeLessThanOrEqual(t);
      expect(m * (boundary - 1) + b0).toBeGreaterThan(t);
      expect(p.solution).toContain("부등호의 방향이 바뀌어");
    }
  });

  it("② 지면의 변 길이·속력·넓이로 다시 세워도 정답이 나온다", () => {
    const items = linSet(6).filter(
      (p) => p.familyId === "moving-point-area-range",
    );
    expect(items.length).toBeGreaterThan(0);
    for (const p of items) {
      const ab = Number(
        /\\overline\{\\mathrm\{AB\}\}=(\d+)\\,\\mathrm\{cm\}/.exec(
          p.content,
        )![1],
      );
      const bc = Number(
        /\\overline\{\\mathrm\{BC\}\}=(\d+)\\,\\mathrm\{cm\}/.exec(
          p.content,
        )![1],
      );
      const v = Number(/매초 \$(\d+)\\,\\mathrm\{cm\}\$/.exec(p.content)![1]);
      const s = Number(
        /넓이가 \$(\d+)\\,\\mathrm\{cm\}\^2\$ 이상/.exec(p.content)![1],
      );

      // 넓이 = ½ × BP × AB = ½ × v x × ab
      const boundary = (2 * s) / (ab * v);
      expect(Number.isInteger(boundary)).toBe(true);
      expect(boundary).toBeGreaterThan(0);
      expect(Number(/\$(\d+)\$초 후/.exec(p.answer)![1])).toBe(boundary);
      // 점 P 가 C 에 닿기 **전**이라야 물음이 성립한다 — 정의역 밖이면 답이 없다
      expect(boundary * v).toBeLessThanOrEqual(bc);
    }
  });

  /**
   * D-100 ⑶ — 「도형을 좌표평면에 올려 길이·넓이를 구하지 않는다」.
   *
   * 「좌표라는 낱말이 없다」로는 못 잰다. 문형 ① 은 **일차함수의 그래프**라 좌표를
   * 쓰는 것이 정상이고(등록 유형 `⑵|07` 이 이미 그렇다), 막아야 하는 것은 **도형과
   * 좌표가 한 문항에 같이 오는 것**이다. 그래서 둘의 **교집합**을 잰다.
   */
  it("도형이 있는 문항에는 좌표가 없다 (D-100 ⑶)", () => {
    for (const p of linSet(6)) {
      const text = `${p.content} ${p.solution}`;
      const hasShape = /삼각형|직사각형|\\overline/.test(text);
      const hasCoord = /\$\(\d+,/.test(text);
      expect(hasShape && hasCoord, `${p.familyId}: ${p.content}`).toBe(false);
    }
  });

  it("숫자는 전부 수식 안에 있다", () => {
    for (const p of linSet(4)) {
      expect(bareNumbers(p.content), p.content).toEqual([]);
      expect(bareNumbers(p.answer)).toEqual([]);
      expect(bareNumbers(p.solution), p.solution).toEqual([]);
    }
  });

  /**
   * 값이 맞아도 지면이 흉할 수 있다(CLAUDE.md 2026-08-24). 값 검산이 **구조적으로
   * 못 보는** 것만 따로 센다 — 실제로 첫 판에서 넷 다 지면에 나가고 있었다.
   */
  it("지면 냄새 — 계수 1, 조사 (으)로, 띄어쓰기", () => {
    /**
     * ⚠️ 「(으)로」의 기대값을 **구현의 자릿수 목록으로 다시 적지 않는다.** 그러면
     * 둘이 같이 틀려도 초록이다. 수를 한국어로 읽은 **마지막 글자의 종성을
     * 유니코드에서 꺼내** 판정한다 — 받침이 없거나 ㄹ 이면 「로」.
     * (끝자리가 0 이면 마지막으로 읽는 글자가 십·백·천·만이라 「십」으로 대표한다.)
     */
    const READING = [
      "십",
      "일",
      "이",
      "삼",
      "사",
      "오",
      "육",
      "칠",
      "팔",
      "구",
    ];
    const expectedRo = (n: number): "로" | "으로" => {
      const jong = (READING[Math.abs(n) % 10]!.charCodeAt(0) - 0xac00) % 28;
      return jong === 0 || jong === 8 ? "로" : "으로"; // 8 = ㄹ
    };

    let checked = 0;
    for (const p of linSet(6)) {
      const text = `${p.content} ${p.solution} ${p.answer}`;
      expect(text, "계수 1 이 그대로 찍혔다").not.toMatch(/[^0-9]1x/);
      expect(text, "수식과 조사 사이가 벌어졌다").not.toMatch(
        /\$ (이다|이고|이므로|분 후|초 후)/,
      );
      for (const m of text.matchAll(/\$-?(\d+)\$(으?로)/g)) {
        expect(m[2], `${m[0]} — 「${m[1]}」 뒤의 조사`).toBe(
          expectedRo(Number(m[1])),
        );
        checked += 1;
      }
    }
    // 잴 자리가 없으면 위 검사는 아무것도 증명하지 않는다.
    expect(checked, "(으)로 를 한 번도 못 쟀다").toBeGreaterThan(0);
  });

  it("같은 씨앗은 같은 세트, 발문이 겹치지 않는다", () => {
    const a = generateMiddleComboSet(LIN, 20260825, 6);
    const b = generateMiddleComboSet(LIN, 20260825, 6);
    expect(a.map((x) => x.content)).toEqual(b.map((x) => x.content));
    expect(new Set(a.map((x) => x.content)).size).toBe(6);
  });
});

/**
 * 곱셈 공식 × 근호 (D-110).
 *
 * ⚠️ 검산은 **`facts` 를 안 본다.** 지면에 찍힌 수만 읽어 관계를 다시 세운다.
 * 문형 ② 는 더 나아가 **되곱해서** 확인한다 — 유리화한 답에 원래 분모를 곱하면
 * 원래 분자가 나와야 한다. 생성기가 나눈 것을 시험은 **곱해서** 본다.
 */
const SQRT_SEEDS = [1, 5, 42, 2026, 20260825, 99991, 777];

function sqrtSet(count: number) {
  return SQRT_SEEDS.flatMap((s) => generateMiddleComboSet(SQRT, s, count));
}

describe("중등 결합형 — 곱셈 공식 × 근호", () => {
  it("문형이 둘 다 나온다 (D-75)", () => {
    expect([...new Set(sqrtSet(6).map((p) => p.familyId))].sort()).toEqual([
      "binomial-rationalize",
      "sqrt-product-expand",
    ]);
  });

  it("① 지면의 두 인수로 다시 전개하면 정답이 나온다", () => {
    const items = sqrtSet(6).filter(
      (p) => p.familyId === "sqrt-product-expand",
    );
    expect(items.length).toBeGreaterThan(0);
    for (const p of items) {
      const m =
        /\$\(\\sqrt\{(\d+)\}([+-]\d+)\)\(\\sqrt\{\d+\}([+-]\d+)\)=p\+q\\sqrt\{\d+\}\$/.exec(
          p.content,
        );
      expect(m, p.content).not.toBeNull();
      const [a, b, c] = [Number(m![1]), Number(m![2]), Number(m![3])];
      // $(\sqrt a+b)(\sqrt a+c) = (a+bc) + (b+c)\sqrt a$
      const rp = a + b * c;
      const rq = b + c;
      expect(rq, "무리수 부분이 사라지면 묻는 것이 없어진다").not.toBe(0);
      expect(b, "$b=c$ 이면 완전제곱꼴이라 다른 공식이다").not.toBe(c);
      expect(Number(/\$(-?\d+)\$/.exec(p.answer)![1])).toBe(rp + rq);
      expect(p.solution).toContain("곱셈 공식");
      expect(p.solution).toContain(`(\\sqrt{${a}})^2=${a}`);
    }
  });

  it("② 유리화한 답에 원래 분모를 되곱하면 원래 분자가 나온다", () => {
    const items = sqrtSet(6).filter(
      (p) => p.familyId === "binomial-rationalize",
    );
    expect(items.length).toBeGreaterThan(0);
    for (const p of items) {
      const q = /\$\\dfrac\{(\d+)\}\{\\sqrt\{(\d+)\}\+(\d+)\}\$/.exec(
        p.content,
      )!;
      const [k, a, b] = [Number(q[1]), Number(q[2]), Number(q[3])];
      const r = /\$(\d*)\\sqrt\{(\d+)\}-(\d+)\$/.exec(p.answer);
      expect(r, p.answer).not.toBeNull();
      const mm = r![1] === "" ? 1 : Number(r![1]);
      expect(Number(r![2]), "답의 근호 속 수가 발문과 다르다").toBe(a);
      expect(Number(r![3]), "답의 상수항이 $m\\times b$ 가 아니다").toBe(
        mm * b,
      );
      // 되곱하기: $(m\sqrt a - mb)(\sqrt a + b) = m(a-b^2)$ 이 원래 분자 $k$ 여야 한다.
      expect(mm * (a - b * b), `되곱한 값이 ${k} 가 아니다`).toBe(k);
      expect(a, "분모가 $0$ 이 되면 안 된다").toBeGreaterThan(b * b);
      expect(p.solution).toContain("(x+y)(x-y)=x^2-y^2");
    }
  });

  it("숫자는 전부 수식 안에 있다", () => {
    for (const p of sqrtSet(4)) {
      expect(bareNumbers(p.content), p.content).toEqual([]);
      expect(bareNumbers(p.answer)).toEqual([]);
      expect(bareNumbers(p.solution), p.solution).toEqual([]);
    }
  });

  /** 값이 맞아도 지면이 흉할 수 있다 — 첫 판에서 넷 다 지면에 나갔다. */
  it("지면 냄새 — 계수 1, $0-$, 분모 1, 조사, 띄어쓰기", () => {
    const READING = [
      "십",
      "일",
      "이",
      "삼",
      "사",
      "오",
      "육",
      "칠",
      "팔",
      "구",
    ];
    const expectedEul = (n: number): "을" | "를" => {
      const jong = (READING[Math.abs(n) % 10]!.charCodeAt(0) - 0xac00) % 28;
      return jong === 0 ? "를" : "을";
    };
    let checked = 0;
    for (const p of sqrtSet(6)) {
      const text = `${p.content} ${p.solution} ${p.answer}`;
      expect(text, "계수 1 이 그대로 찍혔다").not.toMatch(/[^0-9]1\\sqrt/);
      expect(text, "계수 1 이 그대로 찍혔다").not.toMatch(/[^0-9]1x/);
      expect(text, "$0-$ 가 앞에 남았다").not.toMatch(/=0[+-]\\sqrt/);
      expect(text, "분모 1 인 분수를 그렸다").not.toMatch(
        /\\dfrac\{[^{}]*\}\{1\}/,
      );
      expect(text, "수식과 조사 사이가 벌어졌다").not.toMatch(
        /\$ (이다|이고|이므로|에 의하여|일 때)/,
      );
      for (const m of text.matchAll(/\\sqrt\{(\d+)\}\$(을|를)/g)) {
        expect(m[2], `${m[0]} — 「${m[1]}」 뒤의 조사`).toBe(
          expectedEul(Number(m[1])),
        );
        checked += 1;
      }
    }
    expect(checked, "조사를 한 번도 못 쟀다").toBeGreaterThan(0);
  });
});

/**
 * 위임 등록 (D-110) — **이미 등록된 유형이 곧 그 결합형**이다.
 *
 * ⚠️ 여기서 지켜야 하는 것은 「같은 수학을 두 벌 쓰지 않았다」이다. 새로 베껴 쓰면
 * 값이 둘 다 맞은 채로 갈라질 수 있고, **그 갈라짐은 아무도 못 알아챈다.**
 * 그래서 산출물이 원천 유형의 산출물과 **글자까지 같은지** 본다.
 */
describe("중등 결합형 — 위임 등록", () => {
  it("새 문형을 만들지 않았다 — 문형 id 가 곧 원천 유형 키다", () => {
    const byId = new Map(middleComboDefinitions().map((d) => [d.id, d]));
    for (const [id, source] of DELEGATED_PAIRS) {
      const d = byId.get(id);
      expect(d, id).toBeDefined();
      expect(d!.delegatesTo, `${id} 가 위임이 아니다`).toBe(source);
      expect(d!.familyIds, `${id} 의 문형`).toEqual([source]);
      expect(d!.conceptKeys[0], `${id} 의 앵커 원천`).toBe(source);
    }
  });

  it("산출물이 원천 유형의 것과 **글자까지 같다** — 수학이 두 벌이 아니다", () => {
    for (const [id, source] of DELEGATED_PAIRS) {
      for (const seed of [3, 77, 20260825]) {
        for (const variant of [0, 1, 2]) {
          const c = generateMiddleComboProblem(id, seed, variant);
          const origin = generateMiddleProblem(source, seed, variant);
          // 이 세 줄이 이 파일에서 가장 중요한 검사다 — 위임이 **새 수학을 안 썼다**는
          // 유일한 증거다. 베껴 쓰면 값이 둘 다 맞은 채로 갈라질 수 있고 아무도 못 본다.
          expect(c.content, `${id} 발문`).toBe(origin.content);
          expect(c.answer, `${id} 정답`).toBe(origin.answer);
          expect(c.solution, `${id} 해설`).toBe(origin.solution);
          expect(c.difficulty, `${id} 난이도`).toBe(origin.difficulty);
          expect(c.familyId).toBe(source);
          expect(c.conceptKeys).toContain(source);
        }
        const set = generateMiddleComboSet(id, seed, 3);
        expect(new Set(set.map((x) => x.content)).size).toBe(3);
      }
    }
  });

  it("위임도 승인 근거 세 가지를 갖춘다", () => {
    const byId = new Map(middleComboDefinitions().map((d) => [d.id, d]));
    for (const id of DELEGATED) {
      const d = byId.get(id)!;
      expect(d.curriculumBasis.length).toBeGreaterThan(30);
      expect(d.laterConceptReview.length).toBeGreaterThan(30);
      expect(d.gradeBoundary.trim()).not.toBe("");
    }
  });
});
