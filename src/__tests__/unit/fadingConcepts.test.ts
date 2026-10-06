import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  FADING_MAX_PROPOSITIONS,
  buildFadingConcepts,
  fadingConceptDigest,
  fadingTargets,
  proposeFadingGroups,
} from "@/lib/fading/concepts";

const SECTION = "중2::4. 삼각형의 성질::삼각형의 외심";
const OTHER = "중2::4. 삼각형의 성질::삼각형의 내심";

function entry(
  id: string,
  level: ConceptEntry["level"],
  definition = "세 점에서 같은 거리에 있는 점을 {중심}이라 한다.",
  section = SECTION,
): ConceptEntry {
  return { id, section, term: `용어 ${id}`, kind: "정의", level, definition };
}
const many = (n: number, prefix: string, level: ConceptEntry["level"] = "하") =>
  Array.from({ length: n }, (_, i) => entry(`${prefix}${i + 1}`, level));

describe("묶음의 초안 — 소단원 × 난이도 안에서 다섯 이하씩 고르게", () => {
  it("일곱 문장은 넷과 셋으로 나뉘고, 열쇠는 묶음의 첫 문장 id 다", () => {
    expect(proposeFadingGroups(many(7, "a"))).toEqual({
      a1: ["a1", "a2", "a3", "a4"],
      a5: ["a5", "a6", "a7"],
    });
  });

  it("다섯 문장까지는 한 묶음이고, 여섯부터 나눈다 — 크기는 하나 넘게 벌어지지 않는다", () => {
    expect(FADING_MAX_PROPOSITIONS).toBe(5);
    const sizesOf = (n: number) =>
      Object.values(proposeFadingGroups(many(n, "q"))).map((m) => m.length);
    expect([5, 6, 10, 11].map(sizesOf)).toEqual([
      [5],
      [3, 3],
      [5, 5],
      [4, 4, 3],
    ]);
    for (let n = 1; n <= 23; n++) {
      const sizes = sizesOf(n);
      expect(sizes.length).toBe(Math.ceil(n / FADING_MAX_PROPOSITIONS));
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  it("소단원은 은행에 처음 나온 차례, 난이도는 하 · 중 · 상 차례 — 은행에 섞여 있어도", () => {
    expect(
      Object.keys(
        proposeFadingGroups([
          entry("b1", "상"),
          entry("x1", "중", undefined, OTHER),
          entry("b2", "하"),
          entry("b3", "상"),
          entry("x2", "하", undefined, OTHER),
        ]),
      ),
    ).toEqual(["b2", "b1", "x2", "x1"]);
  });

  it("같은 id 의 문장이 둘이면 거절한다 — 표적의 열쇠가 겹친다", () => {
    expect(() =>
      proposeFadingGroups([entry("d1", "하"), entry("d1", "중")]),
    ).toThrow("d1");
    expect(() =>
      buildFadingConcepts([entry("d1", "하"), entry("d1", "중")], {
        d1: ["d1"],
      }),
    ).toThrow("d1");
  });
});

describe("개념 짓기 — 묶음 표대로", () => {
  const entries = [...many(4, "a"), entry("z1", "상"), ...many(2, "x", "중")];

  it("표에 적힌 열쇠와 차례 그대로다 — 열쇠가 첫 문장의 id 가 아니어도", () => {
    const concepts = buildFadingConcepts(entries, {
      "kept-key": ["a3", "a1"],
      a2: ["a2", "a4"],
      z1: ["z1"],
    });
    expect(
      concepts.map((c) => [c.id, c.propositions.map((p) => p.id)]),
    ).toEqual([
      ["kept-key", ["a3", "a1"]],
      ["a2", ["a2", "a4"]],
      ["z1", ["z1"]],
    ]);
    expect(concepts.map((c) => [c.level, c.ordinal, c.siblings])).toEqual([
      ["하", 1, 2],
      ["하", 2, 2],
      ["상", 1, 1],
    ]);
    expect(concepts.every((c) => c.section === SECTION)).toBe(true);
  });

  it("은행에 없는 문장은 건너뛰고, 남은 문장이 없는 개념은 내지 않는다", () => {
    const concepts = buildFadingConcepts(entries, {
      a1: ["a1", "gone-1", "a2"],
      lost: ["gone-2"],
      x1: ["x1", "x2"],
    });
    expect(concepts.map((c) => [c.id, c.propositions.length])).toEqual([
      ["a1", 2],
      ["x1", 2],
    ]);
  });

  it("문장을 글과 표적으로 나눈다 — 수식이 든 핵심어는 수식 등급, 수식 안의 { } 는 표적이 아니다", () => {
    const [concept] = buildFadingConcepts(
      [
        entry(
          "k1",
          "하",
          "$\\frac{1}{2}$의 {역수}는 {$2$}이고, 곱하면 {언제나 $1$}이다.",
        ),
      ],
      { k1: ["k1"] },
    );
    expect(concept!.propositions[0]!.pieces).toEqual([
      { kind: "text", text: "$\\frac{1}{2}$의 " },
      { kind: "target", target: { id: "k1#1", text: "역수", tier: "text" } },
      { kind: "text", text: "는 " },
      { kind: "target", target: { id: "k1#2", text: "$2$", tier: "math" } },
      { kind: "text", text: "이고, 곱하면 " },
      {
        kind: "target",
        target: { id: "k1#3", text: "언제나 $1$", tier: "math" },
      },
      { kind: "text", text: "이다." },
    ]);
    expect(fadingTargets(concept!).map((t) => t.id)).toEqual([
      "k1#1",
      "k1#2",
      "k1#3",
    ]);
  });
});

describe("개념 내용의 지문", () => {
  const build = (definition: string, members = ["a1", "a2"]) =>
    buildFadingConcepts([entry("a1", "하", definition), entry("a2", "하")], {
      a1: members,
    })[0]!;
  const base = build("한 점에서 같은 거리에 있는 점의 모임을 {원}이라 한다.");

  it("16진 여덟 자이고, 같은 내용이면 같다", () => {
    expect(fadingConceptDigest(base)).toMatch(/^[0-9a-f]{8}$/);
    expect(fadingConceptDigest(base)).toBe(
      fadingConceptDigest(
        build("한 점에서 같은 거리에 있는 점의 모임을 {원}이라 한다."),
      ),
    );
  });

  it("문장의 글 · 핵심어의 자리 · 명제의 구성이 바뀌면 달라진다", () => {
    const digests = [
      base,
      build("한 점에서 같은 거리에 있는 점의 모임을 {원}이라고 한다."),
      build("한 점에서 {같은 거리}에 있는 점의 모임을 원이라 한다."),
      build("한 점에서 같은 거리에 있는 점의 모임을 {원}이라 한다.", ["a1"]),
      build("한 점에서 같은 거리에 있는 점의 모임을 {원}이라 한다.", [
        "a2",
        "a1",
      ]),
    ].map(fadingConceptDigest);
    expect(new Set(digests).size).toBe(digests.length);
  });
});
