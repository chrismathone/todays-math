/**
 * 초등 출제 CLI 의 알맹이 (scripts/elem/gen-core.ts).
 *
 * 지키는 것:
 * - 목록은 손으로 쓰지 않는다 — 커버리지는 엔진 등록부(handlerKeys)에서 유도된다.
 * - 프리셋 배분(D-71)은 합이 문항 수와 같고, 배분 산식이 재현 가능하다.
 * - 같은 씨앗 → 같은 세트 (재현), 한 세트 안에서는 중복 문항이 없다 (겹치면 던진다).
 * - 갈래 없는 소단원에 프리셋을 물으면 조용히 기본 문항을 내지 않고 던진다.
 */
import { describe, expect, it } from "vitest";

import {
  CORE_DIFFICULTIES,
  DIFFICULTY_LADDER,
} from "../../contracts/difficulty";
import { ELEM_TIERS, type ElemTier } from "../../lib/elementary/difficulty";
import {
  elementaryUnits,
  handlerKeys,
  supportedTiers,
} from "../../lib/elementary/generate";
import {
  allocateByPreset,
  findUnit,
  generateComboSet,
  generateSet,
  listCombos,
  listCoverage,
} from "../../../scripts/elem/gen-core";

const AREA_FRACTION_COMBO = "초5|2-2-3::초5|1-6-2";

describe("[초등 출제 CLI] 커버리지 목록", () => {
  it("커버리지는 엔진 등록부에서 유도된다 — 손 목록이 아니다", () => {
    const rows = listCoverage();
    const keys = new Set(handlerKeys());
    // 모든 행이 실제 생성기가 있는 대단원에 속한다
    for (const row of rows) {
      expect(
        keys.has(`${row.grade}|${row.chapter}`),
        `${row.grade} ${row.section}`,
      ).toBe(true);
    }
    // 독립 재셈: 등록된 대단원에 속한 소단원 수와 행 수가 같다
    const expected = elementaryUnits().filter((u) =>
      keys.has(`${u.grade}|${u.chapter}`),
    ).length;
    expect(rows.length).toBe(expected);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("갈래 표시는 supportedTiers 와 일치한다", () => {
    for (const row of listCoverage()) {
      const unit = findUnit(row.grade, row.code);
      expect(row.tiers).toEqual(supportedTiers(unit));
    }
  });

  it("없는 소단원 코드는 던진다", () => {
    expect(() => findUnit("초4", "9-9-9")).toThrow(/9-9-9/);
  });

  it("결합형 목록도 엔진 등록부에서 유도된다", () => {
    expect(listCombos()).toEqual([
      {
        id: AREA_FRACTION_COMBO,
        anchorKey: "초5|2-2-3",
        prerequisiteKeys: ["초5|1-6-2"],
        familyIds: ["nested-part", "remainder-part"],
      },
    ]);
  });
});

describe("[초등 출제 CLI] 프리셋 배분 (D-71 안A)", () => {
  it("하위반 8문항 — 최대 잔여법 손셈 그대로", () => {
    // 40/40/20/0 % 의 8문항: 3.2/3.2/1.6/0 → 바닥 3/3/1/0(=7) → 잔여 .2/.2/.6/0
    // → 남은 1을 잔여 최대인 응용에 → 3/3/2/0
    expect(allocateByPreset("하위반", 8)).toEqual({
      연산: 3,
      기본: 3,
      응용: 2,
      심화하: 0,
      심화중: 0,
      심화상: 0,
    });
  });

  it("동률 잔여는 ELEM_TIERS 순서가 가른다 — 하위반 1문항은 연산", () => {
    // 0.4/0.4/0.2/0 전부 바닥 0 → 잔여 동률(연산·기본) → 선언 순서 앞인 연산이 받는다
    expect(allocateByPreset("하위반", 1)).toEqual({
      연산: 1,
      기본: 0,
      응용: 0,
      심화하: 0,
      심화중: 0,
      심화상: 0,
    });
  });

  it("합은 항상 문항 수와 같다", () => {
    for (const preset of ["하위반", "중위반", "상위반"] as const) {
      for (const count of [1, 4, 8, 12, 25]) {
        const alloc = allocateByPreset(preset, count);
        const sum = ELEM_TIERS.reduce((a, t) => a + alloc[t], 0);
        expect(sum, `${preset} ${count}문항`).toBe(count);
      }
    }
  });

  it("0% 갈래는 0문항이다 — 하위반 심화·상위반 연산", () => {
    expect(allocateByPreset("하위반", 25).심화하).toBe(0);
    expect(allocateByPreset("상위반", 25).연산).toBe(0);
  });
});

/**
 * **그날이 왔다 — 2026-08-24 에 230개 전부 등록됐다.**
 *
 * 여기 있던 `tierlessFixture()` 는 커버리지에서 「갈래 없는 소단원」을 뽑아
 * 「프리셋을 물으면 던지는가」를 재던 것이다. 그 픽스처가 **모집단에서 사라져**
 * 스스로 던지며 「걷어 낼 때다」라고 알려 왔고(초4 2-4-1·2-6-4 가 마지막이었다),
 * 지시대로 그 둘을 걷어 냈다.
 *
 * 🔴 **그런데 가드는 안 걷어 냈다.** `gen-core.ts` 의 `needTierRegistry()` 와
 * `generate.ts` 의 「난이도 갈래가 없는 소단원입니다」는 그대로 있다 — 오늘 도달할 수
 * 없을 뿐 **죽은 코드가 아니다.** units.ts 에 소단원이 하나 늘거나 학년이 늘면 그날
 * 다시 살아난다. 시험만 지우면 그 가드는 «아무도 안 재는 것»이 되므로,
 * 재는 자리를 **분모 쪽으로 옮긴다** — 아래 「230개 전부 갈래가 있다」가 그것이다.
 * 갈래 없는 소단원이 다시 생기면 **그 시험이 먼저 빨개지고**, 그때 이 두 시험을
 * 되살릴 자리가 어디였는지는 이 주석이 가리킨다.
 */
describe("[초등 출제 CLI] 세트 생성", () => {
  it("같은 씨앗은 같은 세트다 — 재현 가능", () => {
    const a = generateSet({
      grade: "초4",
      code: "1-5-1",
      count: 4,
      seed: 20260823,
    });
    const b = generateSet({
      grade: "초4",
      code: "1-5-1",
      count: 4,
      seed: 20260823,
    });
    expect(a).toEqual(b);
  });

  it("한 세트 안에 같은 문항이 없다 (발문+정답 열쇠)", () => {
    const items = generateSet({
      grade: "초4",
      code: "1-5-1",
      count: 6,
      seed: 20260823,
    });
    expect(items).toHaveLength(6);
    const keys = items.map((i) => `${i.problem.content}|${i.problem.answer}`);
    expect(new Set(keys).size).toBe(6);
  });

  /**
   * 🔴 **열쇠가 «넷»이면 축이 넓어지는 날 거짓 경보가 난다** (D-113, 2026-08-30).
   *
   * 종전에는 `r.tiers.length !== 4` 였다. 그런데 이 시험이 지키려는 것은
   * 「갈래가 **없는** 소단원이 생겼나」이지 「넷인가」가 아니다 — 위 주석이 그렇게 적어
   * 두었는데 **잣대만 개수였다.** 그래서 2-4 일곱 소단원에 `심화중`·`심화상` 을 채우자
   * **멀쩡한 확대를 결함으로** 물었다(초5 2-4-1~7). 이 저장소가 2026-08-25 에 적은
   * 「타입은 배열 길이를 안 센다 — 값이 늘어도 손 목록은 조용히 셋으로 남는다」의
   * 뒷면이다: 이번엔 손 상수가 **시끄럽게** 틀렸다.
   *
   * 이제 **핵심 넷(`CORE_DIFFICULTIES`)을 다 갖는가**를 묻는다. 그 목록은 계약이
   * 정하므로 두 벌이 되지 않고, 확대 갈래를 채워도 안 흔들리며, 갈래가 **비면**
   * 여전히 먼저 빨개진다. 사다리 밖의 이름이 새어 들어오는 것도 같이 막는다.
   */
  it("소단원 230개가 전부 **핵심 넷**을 낸다 — «갈래 없음» 가드의 분모", () => {
    /** 「이 소단원의 갈래 목록이 성한가」 — 밖으로 빼서 **눈금을 댈 수 있게** 한다. */
    const broken = (tiers: readonly string[]) =>
      !CORE_DIFFICULTIES.every((t) => tiers.includes(t)) ||
      !tiers.every((t) => (DIFFICULTY_LADDER as readonly string[]).includes(t));
    // 🔴 **눈금** — 실물이 늘 성해서 전량 초록이면 «깨끗»과 «못 셈»이 안 갈린다.
    expect(broken([...CORE_DIFFICULTIES]), "핵심 넷은 성하다").toBe(false);
    expect(
      broken([...CORE_DIFFICULTIES, "심화중", "심화상"]),
      "확대까지 채운 것도 성하다",
    ).toBe(false);
    expect(broken([]), "갈래가 없으면 잡는다").toBe(true);
    expect(broken(["연산", "기본", "응용"]), "핵심이 빠지면 잡는다").toBe(true);
    expect(
      broken([...CORE_DIFFICULTIES, "심화"]),
      "사다리 밖 옛 이름이 남으면 잡는다",
    ).toBe(true);

    const rows = listCoverage();
    const bad = rows.filter((r) => broken(r.tiers));
    expect(
      bad.map((r) => `${r.grade} ${r.code} [${r.tiers.join("·")}]`),
      "핵심 갈래가 빠졌거나 사다리 밖 이름이 있는 소단원이 생겼다 — " +
        "`gen-core.ts` 의 needTierRegistry()·`generate.ts` 의 " +
        "「난이도 갈래가 없는 소단원입니다」가 그날 다시 살아난다. " +
        "위 주석이 가리키는 두 시험을 되살려 그 가드를 다시 재라",
    ).toEqual([]);
    expect(rows).toHaveLength(230);
    // **분모를 한 번 더 지킨다** — 「핵심 넷을 다 갖는가」는 갈래가 하나도 없으면
    // `every` 가 거짓이라 잡히지만, 목록이 통째로 비면 위 단정이 공허하게 초록이다.
    expect(rows.every((r) => r.tiers.length >= CORE_DIFFICULTIES.length)).toBe(
      true,
    );
  });

  it("tier 와 preset 을 같이 주면 던진다", () => {
    expect(() =>
      generateSet({
        grade: "초3",
        code: "1-1-2",
        count: 4,
        seed: 1,
        tier: "기본",
        preset: "중위반",
      }),
    ).toThrow();
  });

  it("직접 배분(tierCounts) — 준 구성 그대로 나오고, 개수는 합에서 나온다", () => {
    // ⚠️ tierCounts 는 `Partial<Record<ElemTier, number>>` 다 — 0 은 «생략»과 다르다.
    //    명시한 갈래는 반드시 1 이상이어야 한다(스크립트가 그렇게 던진다, 아래
    //    「엉뚱한 갈래 이름·0 이하 개수는 던진다」와 같은 규칙). 안 낼 갈래는 아예
    //    키를 안 준다 — «심화중: 0» 을 적으면 그 자체가 던지는 입력이 된다.
    const items = generateSet({
      grade: "초3",
      code: "1-1-2",
      seed: 20260823,
      tierCounts: { 연산: 1, 응용: 2, 심화하: 1 },
    });
    expect(items).toHaveLength(4);
    const got: Record<string, number> = {};
    for (const item of items) {
      got[item.tier as ElemTier] = (got[item.tier as ElemTier] ?? 0) + 1;
    }
    expect(got).toEqual({ 연산: 1, 응용: 2, 심화하: 1 });
  });

  it("직접 배분에 count 를 같이 주면 합과 같아야 한다 — 어긋나면 던진다", () => {
    expect(() =>
      generateSet({
        grade: "초3",
        code: "1-1-2",
        seed: 1,
        count: 5,
        tierCounts: { 연산: 1, 기본: 1 },
      }),
    ).toThrow(/합/);
  });

  it("직접 배분과 preset/tier 를 섞으면 던진다", () => {
    expect(() =>
      generateSet({
        grade: "초3",
        code: "1-1-2",
        seed: 1,
        preset: "중위반",
        tierCounts: { 기본: 2 },
      }),
    ).toThrow();
    expect(() =>
      generateSet({
        grade: "초3",
        code: "1-1-2",
        seed: 1,
        tier: "기본",
        tierCounts: { 기본: 2 },
      }),
    ).toThrow();
  });

  it("직접 배분의 엉뚱한 갈래 이름·0 이하 개수는 던진다", () => {
    expect(() =>
      generateSet({
        grade: "초3",
        code: "1-1-2",
        seed: 1,
        tierCounts: { 고급: 2 } as never,
      }),
    ).toThrow(/갈래|연산/);
    expect(() =>
      generateSet({
        grade: "초3",
        code: "1-1-2",
        seed: 1,
        tierCounts: { 기본: 0 },
      }),
    ).toThrow();
  });

  it("파일럿 소단원의 프리셋 세트 — 갈래 구성이 배분과 같다", () => {
    const items = generateSet({
      grade: "초3",
      code: "1-1-2",
      count: 8,
      seed: 20260823,
      preset: "하위반",
    });
    const got: Record<string, number> = {};
    for (const item of items) {
      expect(item.tier).not.toBeNull();
      got[item.tier as ElemTier] = (got[item.tier as ElemTier] ?? 0) + 1;
      expect(item.problem.content.length).toBeGreaterThan(0);
      expect(item.problem.answer.length).toBeGreaterThan(0);
    }
    expect(got).toEqual({ 연산: 3, 기본: 3, 응용: 2 });
  });

  it("결합형 세트는 명시한 id로만 재현 가능하게 생성된다", () => {
    const options = {
      comboId: AREA_FRACTION_COMBO,
      count: 6,
      seed: 20260824,
    };
    const a = generateComboSet(options);
    const b = generateComboSet(options);
    expect(a).toEqual(b);
    expect(a).toHaveLength(6);
    expect(a.every((item) => item.tier === null)).toBe(true);
    expect(a.every((item) => item.problem.kind === "combo")).toBe(true);
    expect(
      new Set(a.map((item) => `${item.problem.content}|${item.problem.answer}`))
        .size,
    ).toBe(6);
  });

  it("미등록 결합형 id는 세트에서도 던진다", () => {
    expect(() =>
      generateComboSet({ comboId: "초6|9-9-9::초3|1-1-1", count: 2, seed: 1 }),
    ).toThrow(/등록되지 않은 결합형/);
  });
});
