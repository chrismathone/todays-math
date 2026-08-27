"""midTypesC.test.ts 에 «씨앗을 넓게 훑어도 안 던진다» 가드를 붙인다 (일회용)."""

from pathlib import Path

BLOCK = r'''
describe("중등 유형 갈래 C — 씨앗을 넓게 훑어도 던지지 않는다", () => {
  /**
   * 판정기(`probe-middle-forms`)는 **변형 3개**만 뽑는다. 그래서 「씨앗 200개에
   * 한 번 터지는」 자리를 구조적으로 못 본다.
   *
   * 2026-08-27 에 실제로 났다 — `intBetween(rng, 5, 14)` 로 뽑은 $n$ 을 한글 수사
   * 표(12까지)에 넣어 `한글 수사 범위 밖: 13` 으로 던졌다. 3씨앗 판정기는 초록,
   * 120씨앗 지면 판정기가 잡았다. 그래서 여기서 **더 넓게** 훑는다.
   */
  const MY_TYPES = registeredTypes().filter((t) => Number(t.rpmType) >= 70);

  it("내가 지은 확장 유형이 하나 이상 있다 — 없으면 이 가드는 장식이다", () => {
    expect(MY_TYPES.length).toBeGreaterThan(40);
  });

  it("씨앗 200개 × 변형 3개에서 한 번도 던지지 않는다", () => {
    const bad: string[] = [];
    for (const t of MY_TYPES) {
      for (let seed = 1; seed <= 200; seed += 1) {
        for (let v = 0; v < 3; v += 1) {
          try {
            generateMiddleProblem(t.key, seed, v);
          } catch (err) {
            bad.push(
              `${t.key} 씨앗 ${seed} 변형 ${v}: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
            seed = 201; // 같은 유형에서 200번 다 찍지 않는다
            break;
          }
        }
      }
    }
    expect(bad.slice(0, 6), `던진 유형 ${bad.length}개`).toEqual([]);
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')
path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')
