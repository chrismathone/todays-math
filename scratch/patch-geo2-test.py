"""midTypesC.test.ts 에 m1Geo2 확장 11유형 검산 + 입체 이름 가드를 붙인다 (일회용)."""

from pathlib import Path

BLOCK = r'''
describe("중등 유형 갈래 C — 작도 · 합동", () => {
  const SEC_CON = "작도";
  const SEC_CONG = "합동";

  it("70 될 수 있는 자연수를 실제로 세어 맞댄다", () => {
    const { facts } = generatedGeo2(SEC_CON, "70");
    let count = 0;
    for (let x = 1; x <= 60; x += 1) {
      // 삼각형이 되려면 어느 두 변의 합도 나머지 한 변보다 커야 한다.
      const a = facts!.a;
      const b = facts!.b;
      if (a + b > x && b + x > a && x + a > b) count += 1;
    }
    expect(count).toBe(facts!.ans);
  });

  it("71 네 수의 모든 세 짝을 훑어 센다", () => {
    const { facts } = generatedGeo2(SEC_CON, "71");
    const p = [facts!.p0, facts!.p1, facts!.p2, facts!.p3];
    let count = 0;
    for (let i = 0; i < 4; i += 1)
      for (let j = i + 1; j < 4; j += 1)
        for (let k = j + 1; k < 4; k += 1) {
          const [x, y, z] = [p[i]!, p[j]!, p[k]!].sort((u, v) => u - v);
          if (x! + y! > z!) count += 1;
        }
    expect(count).toBe(facts!.ans);
  });

  it("72 답은 삼각형이 되고 답+1 은 안 된다 — 경계", () => {
    const { facts } = generatedGeo2(SEC_CON, "72");
    const ok = (x: number) => facts!.a + facts!.b > x;
    expect(ok(facts!.ans)).toBe(true);
    expect(ok(facts!.ans + 1)).toBe(false);
    expect(facts!.ans).toBeGreaterThanOrEqual(Math.max(facts!.a, facts!.b));
  });

  it("73 네 변을 따로 더한 값이 답이다", () => {
    const { facts } = generatedGeo2(SEC_CONG, "73");
    expect(facts!.s1 + facts!.s2 + facts!.s3 + facts!.s4).toBe(facts!.total);
  });

  it("74 세 내각을 더하면 180도다", () => {
    const { facts } = generatedGeo2(SEC_CONG, "74");
    expect(facts!.p + facts!.q + facts!.r).toBe(180);
    expect(facts!.r).toBeGreaterThan(0);
  });

  it("75 네 내각을 더하면 360도다", () => {
    const { facts } = generatedGeo2(SEC_CONG, "75");
    expect(facts!.p + facts!.q + facts!.r + facts!.s).toBe(360);
    expect(facts!.s).toBeGreaterThan(0);
  });
});

describe("중등 유형 갈래 C — 이등변삼각형의 성질 · 다각형의 내각과 외각", () => {
  const SEC_ISO = "이등변삼각형의 성질";
  const SEC_POLY = "다각형의 내각과 외각";

  it("70 두 밑각과 꼭지각을 더하면 180도다", () => {
    const { facts } = generatedGeo2(SEC_ISO, "70");
    expect(2 * facts!.base + facts!.apex).toBe(180);
    expect(facts!.apex).toBeGreaterThan(0);
  });

  it("71 밑변을 이등분한 값이 답이다", () => {
    const { facts } = generatedGeo2(SEC_ISO, "71");
    expect(2 * facts!.half).toBe(facts!.bc);
    // 이등변삼각형이 성립해야 한다 — 두 등변의 합이 밑변보다 길다.
    expect(2 * facts!.ab).toBeGreaterThan(facts!.bc);
  });

  it("72 △DBC 의 세 각을 더하면 180도다", () => {
    const { facts } = generatedGeo2(SEC_ISO, "72");
    expect(2 * facts!.base + facts!.apex).toBe(180);
    // ∠DBC(밑각의 절반) + ∠C(밑각) + ∠BDC = 180
    expect(facts!.base / 2 + facts!.base + facts!.x).toBe(180);
    expect(Number.isInteger(facts!.base / 2)).toBe(true);
  });

  it("70 발문의 내각 합에서 n 을 되짚고 대각선을 다시 센다", () => {
    const { facts } = generatedGeo2(SEC_POLY, "70");
    const n = facts!.sum / 180 + 2;
    expect(n).toBe(facts!.n);
    // 꼭짓점마다 자기 자신과 이웃 둘을 뺀 만큼, 두 번 세었으니 절반.
    expect((n * (n - 3)) / 2).toBe(facts!.diag);
  });

  it("71 외각의 합이 360도이고 내각의 합이 180(n-2) 다", () => {
    const { facts } = generatedGeo2(SEC_POLY, "71");
    expect(facts!.ext * facts!.n).toBe(360);
    expect(facts!.sum).toBe(180 * (facts!.n - 2));
  });
});

describe("중등 유형 갈래 C — 입체도형의 이름이 지면에서 옳다", () => {
  /**
   * 「오각형뿔」·「칠각형기둥」·「오각형뿔대」를 막는다.
   *
   * `gonName(5)` 는 「오각형」이다. 거기에 「뿔」을 이어 붙이면 «오각형뿔» 이 된다 —
   * 2026-08-27 에 실제로 8자리가 그렇게 나갔다. **값은 다 맞고** KaTeX 도 초록이라
   * 값 검산도 지면 냄새 판정기도 구조적으로 못 본다. 발문을 찍어 눈으로 보고서야
   * 나왔고, 그래서 코드로 옮긴다.
   */
  const BAD = /각형(뿔|기둥|대|형)/;

  it("눈금 — 이 검사가 «아니오» 를 낼 수 있다", () => {
    expect(BAD.test("오각형뿔에서")).toBe(true);
    expect(BAD.test("칠각형기둥에서")).toBe(true);
    expect(BAD.test("오각뿔에서")).toBe(false);
    expect(BAD.test("정오각형에서")).toBe(false);
  });

  it("내가 지은 확장 유형(70~)의 발문·해설에 잘못된 입체 이름이 없다", () => {
    const bad: string[] = [];
    for (const t of registeredTypes()) {
      if (Number(t.rpmType) < 70) continue;
      for (const seed of [1, 20260827, 424242]) {
        let p;
        try {
          p = generateMiddleProblem(t.key, seed);
        } catch {
          continue;
        }
        for (const text of [p.content, p.answer, p.solution ?? ""]) {
          const m = text.match(BAD);
          if (m) bad.push(`${t.key}: ${m[0]}`);
        }
      }
    }
    expect([...new Set(bad)].slice(0, 8), `잘못된 입체 이름 ${bad.length}건`).toEqual(
      [],
    );
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')

old_helper = 'function generatedGeo1(section: string, type: string, seed = 23) {'
assert src.count(old_helper) == 1
helper = '''function generatedGeo2(section: string, type: string, seed = 31) {
  const entry = M1_GEO2.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

'''
src = src.replace(old_helper, helper + old_helper)

old_imp = 'import { M1_GEO1 } from "../../lib/middle/m1Geo1";'
assert src.count(old_imp) == 1
src = src.replace(
    old_imp,
    old_imp
    + '\nimport { M1_GEO2 } from "../../lib/middle/m1Geo2";'
    + '\nimport {\n  generateMiddleProblem,\n  registeredTypes,\n} from "../../lib/middle/generate";',
)

path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')
