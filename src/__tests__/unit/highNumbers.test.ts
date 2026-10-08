/**
 * 고등 수 표기(`src/lib/high/numbers.ts`) — 분수 · 근호 · 복소수의 **정규형과 지면 글자**.
 *
 * 물결 1 의 복소수·이차방정식·부등식 세션이 같이 쓴다. 표기 규칙이 모듈마다 갈리면 한 시험지
 * 안에서 `\dfrac{1-\sqrt{5}}{2}` 와 `\dfrac{1}{2}-\dfrac{\sqrt{5}}{2}` 가 섞여 나간다.
 *
 * 값은 **시험 쪽 읽개**(`helpers/highAnswer.ts`)로 지면 글자를 다시 읽어, 입력 수치에서
 * 부동소수로 바로 셈한 값과 맞댄다 — 제품의 `surdValue` 를 믿지 않는다.
 */
import katex from "katex";
import { describe, expect, it } from "vitest";

import { createRng } from "../../lib/elementary/rng";
import {
  cAdd,
  cConj,
  cDiv,
  cMul,
  cPow,
  cplx,
  cSub,
  cTex,
  q,
  qAdd,
  qDiv,
  qMul,
  qSub,
  qTex,
  quadRoots,
  surd,
  surdPmTex,
  surdTex,
} from "../../lib/high/numbers";
import { readValues, sameValues, type Cx } from "../helpers/highAnswer";

/** (a + b√r)/d 를 부동소수로 — r<0 이면 허수. 제품을 안 부른다. */
function floatSurd(a: number, b: number, r: number, d: number): Cx {
  return r < 0
    ? { re: a / d, im: (b * Math.sqrt(-r)) / d }
    : { re: (a + b * Math.sqrt(r)) / d, im: 0 };
}

describe("유리수", () => {
  it("약분하고 분모를 양수로 둔다", () => {
    expect(q(6, 4)).toEqual({ n: 3, d: 2 });
    expect(q(3, -6)).toEqual({ n: -1, d: 2 });
    expect(q(0, -5)).toEqual({ n: 0, d: 1 });
    expect(() => q(1, 0)).toThrow();
    expect(() => q(1.5)).toThrow();
  });

  it("사칙연산", () => {
    expect(qAdd(q(1, 2), q(1, 3))).toEqual(q(5, 6));
    expect(qSub(q(1, 2), q(1, 3))).toEqual(q(1, 6));
    expect(qMul(q(2, 3), q(9, 4))).toEqual(q(3, 2));
    expect(qDiv(q(2, 3), q(-4, 9))).toEqual(q(-3, 2));
    expect(() => qDiv(q(1, 2), q(0))).toThrow();
  });

  it.each([
    [q(3, 2), "\\dfrac{3}{2}"],
    [q(-3, 2), "-\\dfrac{3}{2}"],
    [q(-4, 2), "-2"],
    [q(0), "0"],
    // 가분수 그대로 — 대분수 변환은 2026-08-24 에 지면 경로에서 빠졌다(textPreprocess §대분수)
    [q(7, 3), "\\dfrac{7}{3}"],
  ])("표기 %j → %s", (x, tex) => {
    expect(qTex(x)).toBe(tex);
  });
});

describe("근호 (a + b√r)/d", () => {
  it.each([
    // [a, b, r, d, 지면]
    [2, 2, 12, 4, "\\dfrac{1+2\\sqrt{3}}{2}"],
    [0, -1, 5, 2, "-\\dfrac{\\sqrt{5}}{2}"],
    [0, 1, 5, 2, "\\dfrac{\\sqrt{5}}{2}"],
    [3, 1, 4, 1, "5"],
    [1, -1, 2, 1, "1-\\sqrt{2}"],
    [4, 2, 3, -2, "-2-\\sqrt{3}"],
    [-1, 1, -3, 2, "\\dfrac{-1+\\sqrt{3}i}{2}"],
    [0, 1, -1, 1, "i"],
    [0, -2, -1, 1, "-2i"],
    [0, 1, -4, 1, "2i"],
    [1, 3, -8, 1, "1+6\\sqrt{2}i"],
    [6, 0, 7, 4, "\\dfrac{3}{2}"],
    [0, 0, 7, 3, "0"],
  ])("(%i + %i√%i)/%i → %s", (a, b, r, d, tex) => {
    expect(surdTex(surd(a, b, r, d))).toBe(tex);
  });

  it("정규형이 하나다 — 같은 값은 같은 객체", () => {
    expect(surd(2, 2, 12, 4)).toEqual({ a: 1, b: 2, r: 3, d: 2 });
    expect(surd(-2, -4, 3, -4)).toEqual(surd(1, 2, 3, 2));
    expect(surd(5, 0, 3, 1)).toEqual({ a: 5, b: 0, r: 1, d: 1 });
    expect(surd(0, 3, -9, 1)).toEqual({ a: 0, b: 9, r: -1, d: 1 });
    expect(() => surd(1, 1, 2, 0)).toThrow();
  });

  it.each([
    [-1, 1, -3, 2, "\\dfrac{-1\\pm\\sqrt{3}i}{2}"],
    [0, 1, 3, 3, "\\pm\\dfrac{\\sqrt{3}}{3}"],
    [1, -1, 2, 1, "1\\pm\\sqrt{2}"],
    [0, 2, -1, 1, "\\pm2i"],
    // 🔴 `\pm` 뒤가 글자(`i`)면 한 칸 띈다 — 붙여 쓴 `\pmi` 는 없는 명령이다(2026-10-08 적재 전 관문).
    [0, 1, -1, 1, "\\pm i"],
    [2, 1, -1, 1, "2\\pm i"],
    [1, 1, -1, 2, "\\dfrac{1\\pm i}{2}"],
    [0, 1, -1, 2, "\\pm\\dfrac{i}{2}"],
  ])("± 꼴 (%i ± %i√%i)/%i → %s", (a, b, r, d, tex) => {
    expect(surdPmTex(surd(a, b, r, d))).toBe(tex);
  });

  it("🔴 ± 꼴은 어느 수치에서도 KaTeX 가 아는 명령만 쓴다 — `\\pm` 에 글자가 붙지 않는다", () => {
    let checked = 0;
    for (let a = -3; a <= 3; a += 1)
      for (let b = 1; b <= 4; b += 1)
        for (const r of [-12, -4, -3, -2, -1, 2, 3, 5, 8])
          for (let d = 1; d <= 4; d += 1) {
            const s = surd(a, b, r, d);
            if (s.b === 0) continue;
            const tex = surdPmTex(s);
            expect(
              () => katex.renderToString(tex, { throwOnError: true }),
              `(${a}±${b}√${r})/${d} → ${tex}`,
            ).not.toThrow();
            expect(tex, tex).not.toMatch(/\\pm[A-Za-z]/);
            checked += 1;
          }
    expect(checked).toBeGreaterThan(500);
  });

  it("± 꼴은 근호 항이 없으면 던진다", () => {
    expect(() => surdPmTex(surd(3, 0, 2, 1))).toThrow();
  });

  it("지면 글자를 다시 읽으면 입력 수치의 값이다 (씨앗 3,000)", () => {
    const rng = createRng(20260913);
    const pick = (lo: number, hi: number) =>
      lo + Math.floor(rng() * (hi - lo + 1));
    for (let i = 0; i < 3000; i += 1) {
      const a = pick(-12, 12);
      const b = pick(-6, 6);
      const r = pick(-50, 50);
      let d = pick(-8, 8);
      if (d === 0) d = 1;
      const tex = surdTex(surd(a, b, r, d));
      expect(
        sameValues(readValues(tex), [floatSurd(a, b, r, d)], 1e-9),
        `(${a}+${b}√${r})/${d} → ${tex}`,
      ).toBe(true);
    }
  });
});

describe("이차방정식의 근", () => {
  it("근은 방정식을 만족하고, ± 꼴은 두 근을 다 담는다", () => {
    for (const [A, B, C] of [
      [1, -2, -1],
      [2, -3, 1],
      [1, 1, 1],
      [3, 0, -12],
      [-2, 4, 5],
      [1, -6, 9],
    ] as const) {
      const { D, roots } = quadRoots(A, B, C);
      expect(D).toBe(B * B - 4 * A * C);
      for (const root of roots) {
        const [x] = readValues(surdTex(root));
        const x2 = { re: x!.re * x!.re - x!.im * x!.im, im: 2 * x!.re * x!.im };
        const re = A * x2.re + B * x!.re + C;
        const im = A * x2.im + B * x!.im;
        expect(
          Math.hypot(re, im),
          `${A}x²+${B}x+${C}, x=${surdTex(root)}`,
        ).toBeLessThan(1e-9);
      }
      if (roots[0].b !== 0) {
        expect(
          sameValues(
            readValues(surdPmTex(roots[0])),
            roots.map((s) => readValues(surdTex(s))[0]!),
          ),
        ).toBe(true);
      }
    }
  });

  it("유리근이면 근호가 없다", () => {
    const { roots } = quadRoots(2, -3, 1);
    expect(roots.map(surdTex).sort()).toEqual(["1", "\\dfrac{1}{2}"]);
  });

  it("이차항 계수가 0 이면 던진다", () => {
    expect(() => quadRoots(0, 1, 1)).toThrow();
  });
});

describe("복소수 (유리수 실수부·허수부)", () => {
  it.each([
    [cplx(3, -2), "3-2i"],
    [cplx(0, 1), "i"],
    [cplx(0, -1), "-i"],
    [cplx(q(1, 2), q(3, 2)), "\\dfrac{1}{2}+\\dfrac{3}{2}i"],
    [cplx(q(-1, 2), q(-1, 3)), "-\\dfrac{1}{2}-\\dfrac{1}{3}i"],
    [cplx(-1, 0), "-1"],
    [cplx(0, 0), "0"],
    [cplx(0, q(1, 2)), "\\dfrac{1}{2}i"],
    [cplx(2, 1), "2+i"],
  ])("표기 %j → %s", (z, tex) => {
    expect(cTex(z)).toBe(tex);
  });

  it("사칙연산과 켤레", () => {
    expect(cMul(cplx(2, 1), cplx(2, -1))).toEqual(cplx(5, 0));
    expect(cDiv(cplx(1, 0), cplx(1, 1))).toEqual(cplx(q(1, 2), q(-1, 2)));
    expect(cAdd(cplx(1, 2), cplx(3, -5))).toEqual(cplx(4, -3));
    expect(cSub(cplx(1, 2), cplx(3, -5))).toEqual(cplx(-2, 7));
    expect(cConj(cplx(q(1, 2), 3))).toEqual(cplx(q(1, 2), -3));
    expect(() => cDiv(cplx(1, 1), cplx(0, 0))).toThrow();
  });

  it("i 의 거듭제곱 — 음의 지수까지", () => {
    const i = cplx(0, 1);
    expect(cPow(i, 0)).toEqual(cplx(1, 0));
    expect(cPow(i, 4)).toEqual(cplx(1, 0));
    expect(cPow(i, 7)).toEqual(cplx(0, -1));
    expect(cPow(i, -1)).toEqual(cplx(0, -1));
    expect(cPow(cplx(1, 1), 2)).toEqual(cplx(0, 2));
  });

  it("지면 글자를 다시 읽으면 같은 값이다 (씨앗 2,000)", () => {
    const rng = createRng(7777);
    const pick = (lo: number, hi: number) =>
      lo + Math.floor(rng() * (hi - lo + 1));
    for (let i = 0; i < 2000; i += 1) {
      const rn = pick(-20, 20);
      const rd = pick(1, 9);
      const inn = pick(-20, 20);
      const ind = pick(1, 9);
      const tex = cTex(cplx(q(rn, rd), q(inn, ind)));
      expect(
        sameValues(readValues(tex), [{ re: rn / rd, im: inn / ind }]),
        tex,
      ).toBe(true);
    }
  });
});
