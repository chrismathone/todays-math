import { describe, expect, it } from "vitest";
import { splitBoxSegments } from "@/lib/math/boxBlock";
import { restoreBoxMarker } from "../../../scripts/import/exam-paper/restoreBoxMarker";

describe("PDF box boundaries restored onto HWP stems", () => {
  // 범일중 2025-2 중간 문3: PDF shows a headerless box with three ring bullets.
  const stem =
    "다음 이차함수의 성질을 이용하여 좌표를 구하시오.\n" +
    "∘ 꼭짓점이 $x$축 위에 있다.\n∘ 축의 방정식은 $x=-2$이다.\n" +
    "∘ 점 $(-3,3)$을 지나는 포물선이다.";

  it("retains all three source conditions inside one headerless rendered box", () => {
    const restored = restoreBoxMarker(
      stem,
      "<상자> ∘ 꼭짓점이 x축 위에 있다.",
      3,
    );
    expect(restored.replace("<상자> ", "")).toBe(stem);
    const boxes = splitBoxSegments(restored).filter((s) => s.kind === "box");
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ label: "상자" });
    expect(boxes[0]!.items).toHaveLength(3);
    expect(boxes[0]!.items.join(" ")).toContain("$(-3,3)$");
  });

  it("requires independent PDF box evidence", () => {
    expect(restoreBoxMarker(stem, "본문만 있는 PDF", 3)).toBe(stem);
  });

  it("does not treat composition inside mathematics as a bullet", () => {
    expect(() =>
      restoreBoxMarker("$(f∘g)(x)$를 구하시오.", "<상자>", 4),
    ).toThrow("첫 항목");
  });

  it("holds missing HWP contents while keeping plain cropped tables intact", () => {
    const text = "표를 보고 값을 구하시오.";
    expect(() => restoreBoxMarker(text, "<상자>", 6)).toThrow("첫 항목");
    expect(restoreBoxMarker(text, "<상자>", 6, true)).toBe(text);
  });

  it("holds a lone (가) reference and retains an existing box", () => {
    expect(() => restoreBoxMarker("(가) 에서 구한 값은?", "<조건>", 5)).toThrow(
      "형제",
    );
    const boxed = "<조건> (가) 양수이다. (나) 정수이다.";
    expect(restoreBoxMarker(boxed, "<상자>", 5)).toBe(boxed);
  });
});
