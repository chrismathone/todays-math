import { beforeAll, describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import {
  FADING_STEPS,
  erasedCount,
  erasedTargets,
  erasureOrder,
  erasureRate,
  firstErasedSteps,
} from "@/lib/fading/erasure";

const SECTION = "중2::4. 삼각형의 성질::삼각형의 외심";

function concept(definitions: string[], id = "t"): FadingConcept {
  const entries: ConceptEntry[] = definitions.map((definition, i) => ({
    id: `${id}${i + 1}`,
    section: SECTION,
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  return buildFadingConcepts(entries, proposeFadingGroups(entries))[0]!;
}

const MIXED = concept([
  "외심은 세 변의 {수직이등분선}이 만나는 점이고, 각 꼭짓점까지의 거리는 {$R$}이다.",
  "직각삼각형의 외심은 {빗변}의 {중점}이다.",
  "외접원의 반지름의 길이는 {$\\frac{c}{2}$}이다.",
]);

const propositionOf = (id: string) => id.split("#")[0]!;

describe("단계마다 지우는 양 — 3분의 1쯤 · 3분의 2쯤 · 전부", () => {
  it("1단계는 지우지 않고 4단계는 전부 지운다", () => {
    for (let n = 1; n <= 13; n++) {
      expect(erasedCount(n, 1)).toBe(0);
      expect(erasedCount(n, 4)).toBe(n);
    }
  });

  it("표적이 셋 이상이면 단계마다 더 지우고, 2 · 3단계는 3분의 1 · 3분의 2 에서 하나 넘게 벗어나지 않는다", () => {
    for (let n = 3; n <= 40; n++) {
      const [two, three] = [erasedCount(n, 2), erasedCount(n, 3)];
      expect(two).toBeGreaterThanOrEqual(1);
      expect(three).toBeGreaterThan(two);
      expect(three).toBeLessThan(n);
      expect(Math.abs(two - n / 3)).toBeLessThan(1);
      expect(Math.abs(three - (2 * n) / 3)).toBeLessThanOrEqual(1);
    }
    expect(
      [3, 4, 5, 8, 13].map((n) => [erasedCount(n, 2), erasedCount(n, 3)]),
    ).toEqual([
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 5],
      [4, 9],
    ]);
  });

  it("표적이 하나 · 둘뿐이어도 2단계부터 하나는 지운다", () => {
    expect(FADING_STEPS.map((s) => erasedCount(1, s))).toEqual([0, 1, 1, 1]);
    expect(FADING_STEPS.map((s) => erasedCount(2, s))).toEqual([0, 1, 2, 2]);
  });

  it("2단계는 글 표적 수를 넘겨 지우지 않는다 — 글 표적이 없을 때만 수식을 지운다", () => {
    expect(erasedCount(6, 2, 1)).toBe(1);
    expect(erasedCount(6, 3, 1)).toBe(4);
    expect(erasedCount(6, 2, 0)).toBe(2);
  });

  it("세지 못할 값은 거절한다", () => {
    expect(() => erasedCount(0, 2)).toThrow();
    expect(() => erasedCount(2.5, 2)).toThrow();
    expect(() => erasedCount(3, 2, 4)).toThrow();
  });
});

describe("지우는 차례 — 글 먼저, 명제마다 돌아가며", () => {
  it("글 표적이 전부 수식 표적보다 먼저다", () => {
    const tiers = erasureOrder(MIXED).map((t) => t.tier);
    expect(tiers).toEqual(["text", "text", "text", "math", "math"]);
    expect(new Set(erasureOrder(MIXED).map((t) => t.id))).toEqual(
      new Set(fadingTargets(MIXED).map((t) => t.id)),
    );
  });

  it("한 명제에서 둘을 지우기 전에 다른 명제에서 하나씩 지운다", () => {
    const firstPass = erasureOrder(MIXED)
      .slice(0, 2)
      .map((t) => propositionOf(t.id));
    expect(new Set(firstPass).size).toBe(2);
  });

  it("시작 명제는 개념마다 다르다 — 꼴이 같은 개념들의 첫 빈칸이 한 명제에 몰리지 않는다", () => {
    const starts = new Set(
      ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"].map((id) => {
        const c = concept(
          ["첫째는 {가}이다.", "둘째는 {나}이다.", "셋째는 {다}이다."],
          id,
        );
        const first = propositionOf(erasureOrder(c)[0]!.id);
        return c.propositions.findIndex((p) => p.id === first);
      }),
    );
    expect(starts.size).toBeGreaterThan(1);
  });

  it("단계의 표적은 앞 단계의 표적을 품고, 읽는 차례로 나온다", () => {
    const reading = fadingTargets(MIXED).map((t) => t.id);
    let previous: string[] = [];
    for (const step of FADING_STEPS) {
      const ids = erasedTargets(MIXED, step).map((t) => t.id);
      expect(previous.every((id) => ids.includes(id))).toBe(true);
      expect(ids).toEqual(reading.filter((id) => ids.includes(id)));
      previous = ids;
    }
    expect(previous).toEqual(reading);
  });

  it("2단계는 수식을 지우지 않는다", () => {
    expect(erasedTargets(MIXED, 2).map((t) => t.tier)).toEqual([
      "text",
      "text",
    ]);
    expect(erasedTargets(MIXED, 3).length).toBe(3);
  });

  it("표적마다 처음 비는 단계가 하나씩 있다 — 그 단계부터 끝까지 비어 있다", () => {
    const first = firstErasedSteps(MIXED);
    expect(Object.keys(first).sort()).toEqual(
      fadingTargets(MIXED)
        .map((t) => t.id)
        .sort(),
    );
    expect(Object.values(first).sort()).toEqual([2, 2, 3, 4, 4]);
    for (const step of FADING_STEPS)
      expect(
        erasedTargets(MIXED, step)
          .map((t) => t.id)
          .sort(),
      ).toEqual(
        Object.keys(first)
          .filter((id) => first[id]! <= step)
          .sort(),
      );
  });

  it("소거율은 지운 표적 ÷ 전체 표적이다", () => {
    expect(FADING_STEPS.map((s) => erasureRate(MIXED, s))).toEqual([
      0,
      2 / 5,
      3 / 5,
      1,
    ]);
  });
});

describe("칩 — 지운 표적마다 하나, 차례는 섞는다", () => {
  const SAME = concept([
    "두 변의 길이가 {같다}.",
    "두 밑각의 크기가 {같다}.",
    "꼭지각의 이등분선은 밑변을 {수직이등분}한다.",
  ]);

  it("1단계는 칩이 없다", () => {
    expect(chipTray(MIXED, 1, { seed: 1 })).toEqual([]);
  });

  it("칩의 글은 그 단계에서 지운 표적의 글 그대로이고, 칩의 id 는 놓인 자리일 뿐이다", () => {
    const tray = chipTray(MIXED, 4, { seed: 7 });
    expect(tray.map((c) => c.id)).toEqual(["c1", "c2", "c3", "c4", "c5"]);
    expect(tray.map((c) => c.text).sort()).toEqual(
      fadingTargets(MIXED)
        .map((t) => t.text)
        .sort(),
    );
  });

  it("같은 씨앗이면 같은 차례이고, 씨앗이 다르면 차례가 달라진다", () => {
    const texts = (seed: number) =>
      chipTray(MIXED, 4, { seed })
        .map((c) => c.text)
        .join("|");
    expect(texts(3)).toBe(texts(3));
    expect(new Set([1, 2, 3, 4, 5, 6].map(texts)).size).toBeGreaterThan(1);
  });

  it("함정 칩은 섞여 들어가고, 지운 표적과 글이 같은 함정 · 되풀이된 함정은 뺀다", () => {
    const tray = chipTray(MIXED, 4, {
      seed: 2,
      traps: [
        { text: "내심" },
        { text: "빗변" },
        { text: " 내심 " },
        { text: "$2R$" },
      ],
    });
    expect(tray.length).toBe(7);
    expect(tray.map((c) => c.text)).toContain("내심");
    expect(tray.map((c) => c.text)).toContain("$2R$");
    expect(tray.filter((c) => c.text === "빗변").length).toBe(1);
  });

  it("맞는가는 글로 가린다 — 글이 같은 두 빈칸은 어느 칩이든 받는다", () => {
    const tray = chipTray(SAME, 4, { seed: 5 });
    const same = tray.filter((c) => c.text === "같다");
    const [first, second] = fadingTargets(SAME);
    expect(same.length).toBe(2);
    for (const chip of same) {
      expect(chipFits(SAME, first!.id, chip)).toBe(true);
      expect(chipFits(SAME, second!.id, chip)).toBe(true);
    }
    const other = tray.find((c) => c.text === "수직이등분")!;
    expect(chipFits(SAME, first!.id, other)).toBe(false);
    expect(() => chipFits(SAME, "nope#1", other)).toThrow();
  });
});

describe("소거와 칩 — 은행 전체", () => {
  // 은행은 이 묶음에서만 싣는다 — 이 묶음을 건너뛰는 실행(변이 실험의 첫 바퀴)이 9,119문장을 읽지 않게.
  let concepts: FadingConcept[];
  beforeAll(async () => {
    const { CONCEPT_BLANK_BANK } = await import("@/lib/concept-blank/bank");
    const { FADING_GROUPS } = await import("@/lib/fading/groups");
    concepts = buildFadingConcepts(CONCEPT_BLANK_BANK.concepts, FADING_GROUPS);
  });

  it("모든 개념에서 단계의 표적이 앞 단계를 품고, 글 표적이 있으면 2단계에 수식이 없다", () => {
    for (const c of concepts) {
      const all = fadingTargets(c);
      const two = erasedTargets(c, 2);
      const three = erasedTargets(c, 3);
      expect(two.length).toBeGreaterThanOrEqual(1);
      expect(three.length).toBeGreaterThanOrEqual(two.length);
      expect(erasedTargets(c, 4).length).toBe(all.length);
      const threeIds = new Set(three.map((t) => t.id));
      expect(two.every((t) => threeIds.has(t.id))).toBe(true);
      if (all.some((t) => t.tier === "text"))
        expect(two.every((t) => t.tier === "text")).toBe(true);
    }
  });

  it("4단계의 모든 빈칸에 맞는 칩이 있고, 칩 수는 빈칸 수와 같다", () => {
    for (const c of concepts) {
      const tray = chipTray(c, 4, { seed: 11 });
      const targets = fadingTargets(c);
      expect(tray.length).toBe(targets.length);
      for (const target of targets)
        expect(tray.some((chip) => chipFits(c, target.id, chip))).toBe(true);
    }
  });
});
