"""midTypesC.test.ts 에 일차부등식 확장 10유형의 값 검산을 붙인다 (일회용)."""

from pathlib import Path

BLOCK = r'''
describe("중등 유형 갈래 C — 일차부등식의 응용", () => {
  const SEC_APP = "일차부등식의 응용";

  // 「가장 큰/작은 정수」·「개수」는 **경계가 곧 답**이다. 답만 넣어 보면
  // 한 칸 옆도 만족하는 식(생성기 오류)을 못 가려낸다 — 늘 양쪽을 본다.

  it("70 답은 만족하고 답+1 은 만족하지 않는다", () => {
    const { facts } = generatedIneq(SEC_APP, "70");
    const ok = (x: number) => facts!.a * x + facts!.b <= facts!.c;
    expect(ok(facts!.n)).toBe(true);
    expect(ok(facts!.n + 1)).toBe(false);
  });

  it("71 자연수 해를 실제로 세어 답과 맞댄다", () => {
    const { facts } = generatedIneq(SEC_APP, "71");
    let count = 0;
    for (let x = 1; x <= 200; x += 1) {
      if (facts!.a * x - facts!.b < facts!.d) count += 1;
    }
    expect(count).toBe(facts!.n);
  });

  it("72 답은 만족하고 답-1 은 만족하지 않는다", () => {
    const { facts } = generatedIneq(SEC_APP, "72");
    const ok = (x: number) =>
      facts!.a * (x - facts!.p) > facts!.b * (x + facts!.q);
    expect(ok(facts!.n)).toBe(true);
    expect(ok(facts!.n - 1)).toBe(false);
  });

  it("73 두 부등식을 동시에 만족하는 정수를 실제로 세어 맞댄다", () => {
    const { facts } = generatedIneq(SEC_APP, "73");
    let count = 0;
    for (let x = -300; x <= 300; x += 1) {
      const a = facts!.a1 * x + facts!.b1 < facts!.c1;
      const b = facts!.a2 * x + facts!.b2 >= facts!.c2;
      if (a && b) count += 1;
    }
    expect(count).toBe(facts!.ans);
  });

  it("74 답에서만 자연수 해가 발문의 개수가 된다 — 경계", () => {
    const { facts } = generatedIneq(SEC_APP, "74");
    const naturals = (a: number) => {
      let c = 0;
      for (let x = 1; x <= 300; x += 1) if (facts!.m * x - a <= 0) c += 1;
      return c;
    };
    expect(naturals(facts!.ans)).toBe(facts!.n);
    expect(naturals(facts!.ans - 1)).not.toBe(facts!.n); // 최솟값이 맞나
  });
});

describe("중등 유형 갈래 C — 일차부등식의 활용(개수, 예금액, 유리한 방법)", () => {
  const SEC_CNT = "일차부등식의 활용(개수, 예금액, 유리한 방법)";

  it("70 답 개월에 목표를 넘고 한 달 전에는 못 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "70");
    const bal = (x: number) => facts!.a0 + facts!.p * x;
    expect(bal(facts!.n)).toBeGreaterThanOrEqual(facts!.T);
    expect(bal(facts!.n - 1)).toBeLessThan(facts!.T);
  });

  it("71 답 개월에 처음의 k배를 넘고 한 달 전에는 못 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "71");
    const bal = (x: number) => facts!.a0 + facts!.p * x;
    const goal = facts!.k * facts!.a0;
    expect(bal(facts!.n)).toBeGreaterThanOrEqual(goal);
    expect(bal(facts!.n - 1)).toBeLessThan(goal);
  });

  it("72 답 개수에서 기준을 넘고 한 개 적으면 못 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "72");
    const score = (x: number) => facts!.a * x - facts!.b * (facts!.N - x);
    expect(score(facts!.n)).toBeGreaterThanOrEqual(facts!.M);
    expect(score(facts!.n - 1)).toBeLessThan(facts!.M);
    expect(facts!.n).toBeLessThanOrEqual(facts!.N); // 낼 수 있는 문제 수를 넘지 않는다
  });

  it("73 답 횟수면 다 나르고 한 번 적으면 남는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "73");
    expect(facts!.w * facts!.n).toBeGreaterThanOrEqual(facts!.W);
    expect(facts!.w * (facts!.n - 1)).toBeLessThan(facts!.W);
  });

  it("74 답 개수는 예산 안이고 한 개 더 사면 넘는다", () => {
    const { facts } = generatedIneq(SEC_CNT, "74");
    const cost = (x: number) => facts!.p2 * x + facts!.p1 * (facts!.N - x);
    expect(cost(facts!.n)).toBeLessThanOrEqual(facts!.T);
    expect(cost(facts!.n + 1)).toBeGreaterThan(facts!.T);
    expect(facts!.n).toBeLessThanOrEqual(facts!.N);
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')
path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')
