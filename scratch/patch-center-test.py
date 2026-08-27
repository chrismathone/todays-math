"""midTypesC.test.ts 에 m2Center 확장 13유형의 값 검산을 붙인다 (일회용)."""

from pathlib import Path

BLOCK = r'''
describe("중등 유형 갈래 C — 삼각형의 외심·내심", () => {
  const SEC_O = "삼각형의 외심";
  const SEC_I = "삼각형의 내심";

  it("70 외심이 만드는 세 이등변삼각형의 밑각 셋을 더하면 직각이다", () => {
    const { facts } = generatedCenter(SEC_O, "70");
    expect(facts!.p + facts!.q + facts!.x).toBe(90);
    expect(facts!.x).toBeGreaterThan(0);
  });

  it("71 세 변이 실제로 피타고라스를 이루고 넓이가 (빗변/2)^2·π 다", () => {
    const { facts } = generatedCenter(SEC_O, "71");
    expect(facts!.p ** 2 + facts!.q ** 2).toBe(facts!.h ** 2);
    expect(facts!.h % 2).toBe(0); // 반지름이 정수라야 지면이 깨끗하다
    expect(facts!.area).toBe((facts!.h / 2) ** 2);
  });

  it("72 반지름의 두 배가 빗변이고 나머지 변이 피타고라스로 맞는다", () => {
    const { facts } = generatedCenter(SEC_O, "72");
    expect(2 * facts!.r).toBe(facts!.h);
    expect(facts!.p ** 2 + facts!.q ** 2).toBe(facts!.h ** 2);
  });

  it("73 답한 변만 빗변이다 — 나머지 둘로는 성립하지 않는다", () => {
    const { facts } = generatedCenter(SEC_O, "73");
    const { p, q, h } = facts!;
    expect(p ** 2 + q ** 2).toBe(h ** 2);
    expect(p ** 2 + h ** 2).not.toBe(q ** 2);
    expect(q ** 2 + h ** 2).not.toBe(p ** 2);
  });

  it("74 밑각이 세 내각의 합에서 나오고 답이 그 절반이다", () => {
    const { facts } = generatedCenter(SEC_I, "74");
    expect(facts!.angA + 2 * facts!.base).toBe(180);
    expect(2 * facts!.x).toBe(facts!.base);
  });

  it("75 △IBC 의 넓이가 밑변×높이÷2 다 — 높이는 내접원의 반지름", () => {
    const { facts } = generatedCenter(SEC_I, "75");
    expect(2 * facts!.area).toBe(facts!.a * facts!.r);
  });

  it("76 답한 둘레로 되돌리면 발문의 넓이가 나온다", () => {
    const { facts } = generatedCenter(SEC_I, "76");
    // S = ½ · r · (둘레)
    expect(2 * facts!.S).toBe(facts!.r * facts!.perimeter);
  });
});

describe("중등 유형 갈래 C — 중점연결·무게중심·피타고라스", () => {
  const SEC_MID = "삼각형의 두 변의 중점을 연결한 선분";
  const SEC_G = "삼각형의 무게중심";
  const SEC_PY = "피타고라스 정리";

  it("70 사다리꼴 넓이 + 작은 삼각형 넓이 = 전체", () => {
    const { facts } = generatedCenter(SEC_MID, "70");
    // 닮음비 1:2 → 넓이비 1:4. 작은 쪽은 전체의 ¼.
    expect(4 * (facts!.S - facts!.ans)).toBe(facts!.S);
  });

  it("71 두 대각선의 중점을 이은 선분은 두 밑변 차의 절반이다", () => {
    const { facts } = generatedCenter(SEC_MID, "71");
    expect(2 * facts!.ans).toBe(facts!.bc - facts!.ad);
    expect(facts!.bc).toBeGreaterThan(facts!.ad); // 사다리꼴이 성립해야 한다
  });

  it("72 사각형 MBDN 의 둘레는 네 조각을 따로 더한 값과 같다", () => {
    const { facts } = generatedCenter(SEC_MID, "72");
    const MB = facts!.c / 2;
    const BD = facts!.a / 2;
    const DN = facts!.c / 2; // 중점연결정리 — AB 의 절반
    const NM = facts!.a / 2; // 중점연결정리 — BC 의 절반
    expect(MB + BD + DN + NM).toBe(facts!.ans);
  });

  it("73 답은 세 중선 합의 3분의 2 다", () => {
    const { facts } = generatedCenter(SEC_G, "73");
    expect(3 * facts!.ans).toBe(2 * facts!.total);
  });

  it("74 사각형 넓이 + 작은 삼각형 넓이 = 전체 (넓이비 4:9)", () => {
    const { facts } = generatedCenter(SEC_G, "74");
    const small = facts!.S - facts!.ans;
    expect(9 * small).toBe(4 * facts!.S);
  });

  it("70 세 변이 피타고라스를 이루고 넓이가 두 직각변의 곱의 절반이다", () => {
    const { facts } = generatedCenter(SEC_PY, "70");
    expect(facts!.p ** 2 + facts!.q ** 2).toBe(facts!.h ** 2);
    expect(2 * facts!.area).toBe(facts!.p * facts!.q);
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')
path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')
