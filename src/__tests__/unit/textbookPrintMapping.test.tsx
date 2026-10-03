import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProblemContent } from "@/components/math/ProblemContent";
import { ProblemBody } from "@/components/print/templates/ProblemBody";
import { toPrintProblem } from "@/lib/print/toPrintProblem";
import { assessSeat } from "@/lib/printOverflow";
import { parseFigureDimensions } from "@/lib/figurePrintSize";

const row = {
  id: "p",
  content: "알맞은 것을 고르시오.\n\n① 첫째\n② 둘째",
  answer: "1",
  solution: null,
  figureUrls: ["/a.svg", "/b.svg", "/b.svg"],
  figureDims: [100, 100, 100, 100, 100, 100],
  figureSourceMm: [20, 20, 20],
  choiceFigureIndex: [0, 2, null],
};
describe("snapshot choice image mapping through legacy print", () => {
  it("keeps known dimensions at their own index when another image is unknown", () => {
    const dimensions = parseFigureDimensions(
      3,
      [100, 50, null, null, 200, 100],
      [20, null, 40],
    );
    expect(dimensions).toEqual([
      { width: 100, height: 50, sourceMm: 20 },
      null,
      { width: 200, height: 100, sourceMm: 40 },
    ]);
    const problem = toPrintProblem(
      {
        ...row,
        figureDims: [100, 50, null, null, 200, 100],
        figureSourceMm: [20, null, 40],
      },
      0,
    );
    const { container } = render(<ProblemBody problem={problem} />);
    const stem = container.querySelector(
      '[data-figure-choice="0"] img',
    ) as HTMLImageElement;
    expect(stem.style.width).toBe("20mm");
    expect(problem.figureDims).toEqual([100, 50, null, null, 200, 100]);
  });
  it("preserves nulls, repeat image placements and semantic choice position end to end", () => {
    const problem = toPrintProblem(row, 0),
      { container } = render(<ProblemBody problem={problem} />);
    expect(problem.choiceFigureIndex).toEqual([0, 2, null]);
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(
      container
        .querySelector('[data-figure-choice="2"]')
        ?.closest("[data-hwpx-grid]")?.textContent,
    ).toContain("②");
    // 2026-10-03 3자 합의 A2(리드 · codex · grok 3:0): 글 보기 문항의 모르는 그림에는 문구를 찍지 않는다 —
    // 교재 스냅샷은 은행 행의 짝이 비었으면 스캔 그림을 전부 `null` 로 보내서, 평범한 발문 그림마다 «그림 대응 확인 필요»가
    // 찍히고 있었다. 문구는 «그림뿐인 보기가 있는데 짝이 온전하지 않은 문항»에 한 번만 적는다(`choiceFigureNotice.test.tsx`).
    // 그림은 그대로 보이고(`unknown` 표지도 그대로다 — 자료는 여전히 모름), 글자만 없다.
    expect(
      container.querySelector('[data-figure-choice="unknown"]'),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("그림 대응 확인 필요");
    expect(
      container
        .querySelector('[data-figure-choice="unknown"]')
        ?.closest("[data-hwpx-grid]"),
    ).toBeNull();
  });
  it("keeps absent and historical empty mappings byte-equivalent", () => {
    const props = { content: row.content, figureUrls: row.figureUrls };
    const a = render(<ProblemContent {...props} />),
      html = a.container.innerHTML;
    a.unmount();
    const b = render(<ProblemContent {...props} choiceFigureIndex={[]} />);
    expect(b.container.innerHTML).toBe(html);
    expect(
      toPrintProblem({ ...row, choiceFigureIndex: undefined }, 0),
    ).not.toHaveProperty("choiceFigureIndex");
  });
  it("retains all images when associations are malformed or target missing choices", () => {
    const { container } = render(
      <ProblemContent
        content={row.content}
        figureUrls={row.figureUrls}
        choiceFigureIndex={[5]}
      />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(
      container.querySelectorAll('[data-figure-choice="unknown"]'),
    ).toHaveLength(3);
  });
  it("uses a conservative mapped-image overflow bound with no absent-mode regression", () => {
    const absent = assessSeat({ ...row, choiceFigureIndex: undefined }, 300),
      mapped = assessSeat(row, 300),
      empty = assessSeat({ ...row, choiceFigureIndex: [] }, 300);
    expect(mapped.px).toBeGreaterThan(absent.px);
    expect(empty).toEqual(absent);
  });
});
