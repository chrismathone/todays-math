"""midTypesC.test.ts 에 m1Calc·m2Counting·m3Func 확장 10유형의 값 검산을 붙인다."""

from pathlib import Path

BLOCK = r'''
describe("중등 유형 갈래 C — 유리수의 곱셈", () => {
  const SEC_MUL = "유리수의 곱셈";

  // 유리수는 `facts` 에 분자·분모 두 수로 남아 있다. 검산은 **정수 곱**으로만
  // 한다 — 부동소수점으로 견주면 0.1+0.2 부류의 거짓 빨강·거짓 초록이 난다.
  const eq = (an: number, ad: number, bn: number, bd: number) =>
    an * bd === bn * ad;

  it("70 세 유리수의 곱이 답과 같고 음수 개수가 부호를 정한다", () => {
    const f = generatedCalc(SEC_MUL, "70").facts!;
    expect(eq(f.an * f.bn * f.cn, f.ad * f.bd * f.cd, f.Sn, f.Sd)).toBe(true);
    const negs = [f.an, f.bn, f.cn].filter((v) => v < 0).length;
    expect(negs).toBe(f.negs);
    expect(f.Sn > 0).toBe(negs % 2 === 0);
  });

  it("71 두 분수의 곱이 답과 같고 답이 기약분수다", () => {
    const f = generatedCalc(SEC_MUL, "71").facts!;
    expect(eq(f.an * f.bn, f.ad * f.bd, f.Sn, f.Sd)).toBe(true);
    const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y));
    expect(Math.abs(g(Math.abs(f.Sn), f.Sd))).toBe(1);
  });

  it("72 원래 수와 역수의 곱이 1이다", () => {
    const f = generatedCalc(SEC_MUL, "72").facts!;
    expect(f.an * f.invn).toBe(f.ad * f.invd);
    expect(f.an * f.invn).toBeGreaterThan(0); // 부호가 그대로여야 곱이 1이다
  });

  it("73 답을 도로 곱하면 발문의 곱이 나온다", () => {
    const f = generatedCalc(SEC_MUL, "73").facts!;
    expect(eq(f.an * f.xn, f.ad * f.xd, f.Sn, f.Sd)).toBe(true);
  });
});

describe("중등 유형 갈래 C — 경우의 수", () => {
  const SEC_CNT2 = "경우의 수";
  const SEC_MANY = "여러 가지 경우의 수";

  it("70 두 주사위를 6×6 으로 훑어 차가 t 인 경우를 센다", () => {
    const f = generatedCounting(SEC_CNT2, "70").facts!;
    let n = 0;
    for (let a = 1; a <= 6; a += 1)
      for (let b = 1; b <= 6; b += 1) if (Math.abs(a - b) === f.t) n += 1;
    expect(n).toBe(f.ans);
  });

  it("71 동전·주사위를 곱셈이 아니라 자리마다 세어 맞댄다", () => {
    const f = generatedCounting(SEC_CNT2, "71").facts!;
    let n = 1;
    for (let i = 0; i < f.coins; i += 1) n *= 2;
    for (let i = 0; i < f.dice; i += 1) n *= 6;
    expect(n).toBe(f.ans);
  });

  it("72 합이 k의 배수인 경우를 6×6 으로 훑어 센다", () => {
    const f = generatedCounting(SEC_CNT2, "72").facts!;
    let n = 0;
    for (let a = 1; a <= 6; a += 1)
      for (let b = 1; b <= 6; b += 1) if ((a + b) % f.k === 0) n += 1;
    expect(n).toBe(f.ans);
  });

  it("73 나머지를 실제로 늘어놓아 순열을 센다", () => {
    const f = generatedCounting(SEC_MANY, "73").facts!;
    // 맨 앞이 고정이므로 나머지 n-1 명의 순열 — 재귀로 실제로 만들어 센다.
    const perm = (k: number): number => (k <= 1 ? 1 : k * perm(k - 1));
    expect(perm(f.n - 1)).toBe(f.ans);
  });
});

describe("중등 유형 갈래 C — 이차함수의 최댓값과 최솟값", () => {
  const SEC_MM = "이차함수의 최댓값과 최솟값";

  // 「꼭짓점에서 최대·최소」를 공식으로 다시 쓰지 않는다 — 함수를 **여러 점에서
  // 실제로 재어** 답이 정말 가장 크거나 작은지 본다.
  function extremeIsAtVertex(f: Record<string, number>): boolean {
    const y = (x: number) => f.a! * (x - f.p!) ** 2 + f.q!;
    for (let x = f.p! - 20; x <= f.p! + 20; x += 0.5) {
      if (f.isMax === 1 ? y(x) > f.ans! + 1e-9 : y(x) < f.ans! - 1e-9) {
        return false;
      }
    }
    return true;
  }

  it("70 답보다 크거나 작은 값이 그래프 위에 없다", () => {
    const f = generatedQuad(SEC_MM, "70").facts!;
    expect(f.ans).toBe(f.q);
    expect(extremeIsAtVertex(f)).toBe(true);
    expect(f.isMax === 1).toBe(f.a < 0);
  });

  it("71 꼭짓점의 y좌표가 답이고 그보다 넘는 값이 없다", () => {
    const f = generatedQuad(SEC_MM, "71").facts!;
    expect(f.ans).toBe(f.q);
    expect(extremeIsAtVertex(f)).toBe(true);
    expect(f.isMax === 1).toBe(f.a < 0);
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')

anchor = 'function generatedGeo2(section: string, type: string, seed = 31) {'
assert src.count(anchor) == 1
helpers = '''function generatedCalc(section: string, type: string, seed = 37) {
  const entry = M1_CALC.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

function generatedCounting(section: string, type: string, seed = 41) {
  const entry = M2_COUNTING.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

function generatedQuad(section: string, type: string, seed = 43) {
  const entry = M3_FUNC.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

'''
src = src.replace(anchor, helpers + anchor)

old_imp = 'import { M1_GEO1 } from "../../lib/middle/m1Geo1";'
assert src.count(old_imp) == 1
src = src.replace(
    old_imp,
    'import { M1_CALC } from "../../lib/middle/m1Calc";\n'
    + old_imp
    + '\nimport { M2_COUNTING } from "../../lib/middle/m2Counting";'
    + '\nimport { M3_FUNC } from "../../lib/middle/m3Func";',
)

path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')
