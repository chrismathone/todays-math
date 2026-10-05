import { describe, expect, it } from "vitest";
import type { TextbookActivity } from "@/contracts/textbookSemantic.contract";
import type { SectionPlan } from "@/lib/textbook/server/quickCreate/context";
import { contentsEntries } from "@/lib/textbook/server/quickCreate/contents";

const section = (
  key: string,
  activities: TextbookActivity[],
  title = "1-6-1 똑같이 나누기",
  unitKey = "u1",
): SectionPlan => ({
  id: key,
  unitKey,
  sectionKey: key,
  title,
  templateKey: "auto-lesson-part",
  startPolicy: "continue",
  blocks: activities.map((activity, index) => ({
    blockId: `${key}-${index}`,
    kind: "text",
    markdown: "보존 $10$",
    semantic: { activity },
  })),
});

describe("new automatic contents activity labels", () => {
  it("distinguishes the observed repeated lesson partitions without changing destinations or content", () => {
    const sections = [
      section("s1", ["dialogue"]),
      section("s2", ["conceptStudy"]),
      section("s3", ["conceptBlankTest"]),
      section("s4", ["conceptMap"]),
    ];
    const before = JSON.stringify(sections);
    const entries = contentsEntries(sections);
    expect(entries.map((entry) => entry.label)).toEqual([
      "1-6-1 똑같이 나누기 · 개념 대화",
      "1-6-1 똑같이 나누기 · 개념 학습",
      "1-6-1 똑같이 나누기 · 자유 개념 백지",
      "1-6-1 똑같이 나누기 · 개념 지도",
    ]);
    expect(
      entries.map((entry) => [
        entry.key,
        entry.targetUnitKey,
        entry.targetSectionKey,
      ]),
    ).toEqual(
      sections.map((entry) => [
        entry.sectionKey,
        entry.unitKey,
        entry.sectionKey,
      ]),
    );
    expect(JSON.stringify(sections)).toBe(before);
  });
  it("names repeated activity runs and unnamed saved sections in their actual order", () => {
    const entries = contentsEntries([
      section("a", ["practice"]),
      section("b", ["concepts", "concepts", "practice"]),
      section("c", ["practice"]),
      section("d", []),
      section("e", []),
    ]);
    expect(entries.map((entry) => entry.label)).toEqual([
      "1-6-1 똑같이 나누기 · 유형 연습 (1/2)",
      "1-6-1 똑같이 나누기 · 개념 이해 / 유형 연습",
      "1-6-1 똑같이 나누기 · 유형 연습 (2/2)",
      "1-6-1 똑같이 나누기 (1/2)",
      "1-6-1 똑같이 나누기 (2/2)",
    ]);
  });
  it("preserves independently named front matter, indexes and lessons in different units", () => {
    const sections = [
      section("guide", ["learningGuide"], "학습 안내"),
      section("s1", ["dialogue"]),
      section("s2", ["dialogue"], undefined, "u2"),
      section("index", ["conceptIndex"], "개념 색인"),
    ];
    expect(contentsEntries(sections).map((entry) => entry.label)).toEqual(
      sections.map((entry) => entry.title),
    );
    expect(contentsEntries([])).toEqual([]);
  });
});
