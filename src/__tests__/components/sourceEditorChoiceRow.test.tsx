import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";

/**
 * 보기 한 칸은 격자 [번호 auto][내용 1fr] 두 열이다. 내용을 한 상자로 안 싸면 글·수식·글이 **각각 격자 칸**이 되어
 * «③ 그래프의 모든 점은 제 / 1 사분면 위에 있다.» 처럼 수식에서 줄이 끊기고, «⑤ ……… 6 / 개의 점으로» 처럼
 * 글이 번호 열로 내려가 수식이 멀리 밀린다. 편집 화면(한 줄)과 적용 화면이 달랐다(원장님 2026-09-18).
 * mathg-gen `MarkdownRenderer` 도 같은 마크업이다 — 거기서 가져온 그대로라 거기서도 같다.
 */
const content = [
  "양초에 불을 붙인 지 $x$시간 후의 양초의 길이 $y\\mathrm{cm}$에 대한 설명으로 올바른 것은?",
  "① 정비례 관계의 그래프이다.",
  "② 반비례 관계의 그래프이다.",
  "③ 그래프의 모든 점은 제 $1$ 사분면 위에 있다.",
  "④ 그래프의 모든 점은 제 $1$ 사분면 위에 있지 않다.",
  "⑤ $6$ 개의 점으로 나타난다.",
].join("\n");

afterEach(cleanup);

describe("보기 칸 — 글과 수식이 섞여도 한 칸", () => {
  it("보기마다 격자 칸은 번호와 내용 둘뿐이다", () => {
    const { container } = render(<SourceEditorDisplay value={content} />);
    const choices = [...container.querySelectorAll(".choice-row .choice")];
    expect(choices).toHaveLength(5);
    for (const choice of choices) {
      const items = [...choice.childNodes].filter(
        (node) =>
          node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
      );
      expect(items).toHaveLength(2);
      expect((items[0] as Element).classList.contains("choice-marker")).toBe(
        true,
      );
    }
  });
  it("수식 앞뒤의 글이 같은 내용 칸에 있다", () => {
    const { container } = render(<SourceEditorDisplay value={content} />);
    const third = container.querySelectorAll(".choice-row .choice")[2];
    const body = third.children[1];
    expect(body.textContent).toContain("그래프의 모든 점은 제");
    expect(body.querySelector(".katex")).not.toBeNull();
    expect(body.textContent).toContain("사분면 위에 있다.");
  });
});
