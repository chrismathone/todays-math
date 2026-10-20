import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConceptBlankUnitPicker from "@/components/concept-blank/ConceptBlankUnitPicker";
import { BLANK_TREE } from "@/lib/concept-blank/sections";

const elementary = BLANK_TREE.find((g) => g.grade === "초5")!;
const middle = BLANK_TREE.find((g) => g.grade === "중1")!;
const first = elementary.chapters[0]!;
const second = elementary.chapters.find((c) => c.title.startsWith("2-"))!;
const mid = middle.chapters[0]!;

describe("단원 고르기 요약", () => {
  it("선택 순서와 무관하게 나무 순서로 묶고 초등에만 학기를 붙인다", () => {
    render(
      <ConceptBlankUnitPicker
        selected={[
          mid.sections[0]!.key,
          second.sections[0]!.key,
          first.sections[0]!.key,
        ]}
      >
        <span />
      </ConceptBlankUnitPicker>,
    );
    const summary = screen.getByRole("button", { name: "단원 고르기 열기" });
    const groups = summary.querySelectorAll("[data-summary-group]");
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveTextContent(`초5 · 1학기 · ${first.title}`);
    expect(groups[1]).toHaveTextContent(`초5 · 2학기 · ${second.title}`);
    expect(groups[2]).toHaveTextContent(`중1 · ${mid.title}`);
    expect(groups[2]).not.toHaveTextContent("학기");
  });

  it("여섯 줄 안에서 머리와 소단원을 함께 보여 주며 숨긴 소단원을 센다", () => {
    const keys = [
      ...first.sections.slice(0, 6),
      ...second.sections.slice(0, 2),
      mid.sections[0]!,
    ].map((s) => s.key);
    render(
      <ConceptBlankUnitPicker selected={keys}>
        <span />
      </ConceptBlankUnitPicker>,
    );
    const summary = screen.getByRole("button", { name: "단원 고르기 열기" });
    expect(summary).toHaveTextContent(`외 ${keys.length - 4}개 소단원`);
    expect(summary.querySelectorAll("[data-summary-section]")).toHaveLength(4);
    for (const group of summary.querySelectorAll("[data-summary-group]"))
      expect(group.querySelector("[data-summary-section]")).not.toBeNull();
    expect(summary).not.toHaveTextContent(`중1 · ${mid.title}`);
  });

  it("소단원과 대단원의 수식을 PaperText로 표시한다", () => {
    const chapter = BLANK_TREE.find((g) => g.grade === "중3")!.chapters.find(
      (c) => c.sections.some((s) => s.title.includes("y=ax^2+bx+c")),
    )!;
    const section = chapter.sections.find((s) =>
      s.title.includes("y=ax^2+bx+c"),
    )!;
    render(
      <ConceptBlankUnitPicker selected={[section.key]}>
        <span />
      </ConceptBlankUnitPicker>,
    );
    expect(
      screen
        .getByRole("button", { name: "단원 고르기 열기" })
        .querySelector(".katex"),
    ).not.toBeNull();
  });

  it("한 줄만 남으면 다음 묶음의 머리를 표시하지 않는다", () => {
    const chapter = elementary.chapters.find((c) => c.sections.length >= 4)!;
    const keys = [...chapter.sections.slice(0, 4), mid.sections[0]!].map(
      (s) => s.key,
    );
    render(
      <ConceptBlankUnitPicker selected={keys}>
        <span />
      </ConceptBlankUnitPicker>,
    );
    const summary = screen.getByRole("button", { name: "단원 고르기 열기" });
    expect(summary.querySelectorAll("[data-summary-group]")).toHaveLength(1);
    expect(summary).toHaveTextContent("외 1개 소단원");
    expect(summary).not.toHaveTextContent(`중1 · ${mid.title}`);
  });
});
