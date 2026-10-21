import { render, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MATH_TEXT_WRAP } from "@/components/math/mathTextWrap";
import { ProblemContent } from "@/components/math/ProblemContent";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { ProblemBody } from "@/components/print/templates/ProblemBody";
import UnifiedProblem from "@/components/unified/UnifiedProblem";
import { UNLINKED_FIGURE_CHOICES_NOTICE } from "@/lib/problem/choiceFigureIndex";
import { BANK_CHOICE_FIGURES } from "../fixtures/bankChoiceFigures";
import baseline from "../../../docs/planning/tracks/reports/bank-decide-render/before-fingerprint.json";

const first = BANK_CHOICE_FIGURES[0]!;
const gridIn = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-hwpx-grid]")!;

describe("B1 — 그림과 보기 번호의 대응", () => {
  it.each(BANK_CHOICE_FIGURES)(
    "실제 초안 $id 의 여섯 그림이 제자리에 한 번씩 나온다",
    (problem) => {
      const { container } = render(<ProblemContent {...problem} />);
      const grid = gridIn(container);
      expect(grid.querySelectorAll("img")).toHaveLength(5);
      const cells = [...grid.children];
      expect(cells).toHaveLength(5);
      for (const [index, cell] of cells.entries()) {
        expect(within(cell as HTMLElement).getByRole("img")).toHaveAttribute(
          "src",
          problem.figureUrls[index],
        );
        expect(cell.firstElementChild?.textContent).toBe("①②③④⑤"[index]);
        expect(cell.className).toContain("print:break-inside-avoid");
      }
      const stem = [...container.querySelectorAll("img")].filter(
        (img) => !grid.contains(img),
      );
      expect(stem.map((img) => img.getAttribute("src"))).toEqual([
        problem.figureUrls[5],
      ]);
      expect(container.textContent).not.toContain("[그림]");
      expect(grid.className.split(" ")).toContain("grid-cols-2");
    },
  );

  it.each(["auto", "5x1", "2x3", "3x2"] as const)(
    "%s 를 골라도 그림 보기는 고정 두 열이고 통단 mm 폭을 안 쓴다",
    (choiceLayout) => {
      const { container } = render(
        <ProblemContent {...first} choiceLayout={choiceLayout} />,
      );
      const grid = gridIn(container);
      expect(grid.className.split(" ")).toContain("grid-cols-2");
      expect(grid.className).not.toMatch(/(?:md:|print:)grid-cols/);
      for (const img of grid.querySelectorAll("img")) {
        expect(img.style.width).toBe("");
        expect(img.className.split(" ")).toEqual(
          expect.arrayContaining(["w-full", "h-auto"]),
        );
      }
      expect(grid.querySelectorAll("img")).toHaveLength(5);
    },
  );

  it("글 보기는 글로 남고 발문 그림이 없는 문항은 빈 그림 묶음을 만들지 않는다", () => {
    const problem = {
      ...first,
      content: first.content.replace("5. [그림]", "5. 해당하는 그래프가 없다"),
      figureUrls: first.figureUrls.slice(0, 4),
      figureDims: first.figureDims.slice(0, 8),
      choiceFigureIndex: [1, 2, 3, 4],
    };
    const { container } = render(<ProblemContent {...problem} />);
    const grid = gridIn(container);
    expect(grid.querySelectorAll("img")).toHaveLength(4);
    expect(grid.lastElementChild?.textContent).toContain(
      "⑤해당하는 그래프가 없다",
    );
    expect(container.querySelector(".flex-wrap")).toBeNull();
  });

  it.each([
    ["빈 배열", []],
    ["길이 불일치", [1, 2]],
    ["번호 중복", [1, 2, 2, 4, 5, 0]],
    ["보기 범위 밖", [1, 2, 3, 4, 6, 0]],
    ["짝 없는 보기", [1, 2, 3, 4, 0, 0]],
    ["정수 아님", [1, 2, 3, 4, 5.5, 0]],
  ] as const)(
    "%s 이면 연결을 안 준 HTML과 한 글자도 다르지 않다",
    (_name, links) => {
      const unknown = { ...first, choiceFigureIndex: undefined };
      expect(
        renderToStaticMarkup(
          <ProblemContent {...unknown} choiceFigureIndex={[...links]} />,
        ),
      ).toBe(renderToStaticMarkup(<ProblemContent {...unknown} />));
    },
  );

  it("글 보기를 가리키는 연결도 통째로 예전 조판이다", () => {
    const { choiceFigureIndex, ...unknown } = first;
    unknown.content = unknown.content.replace(
      "5. [그림]",
      "5. 해당하는 그래프가 없다",
    );
    expect(
      renderToStaticMarkup(
        <ProblemContent {...unknown} choiceFigureIndex={choiceFigureIndex} />,
      ),
    ).toBe(renderToStaticMarkup(<ProblemContent {...unknown} />));
  });

  it("모르는 문항은 수정 전 HTML 지문 그대로다 — «번호를 확인할 수 없는 문항» 한 줄만 더해졌다", () => {
    // 2026-10-03 3자 합의 A2: 그림뿐인 보기가 있는데 짝을 모르면 문항에 한 번 적는다.
    // 그 한 줄을 걷어 내면 **수정 전 HTML 과 한 글자도 다르지 않아야** 한다 — 그림 · 보기의 조판은 그대로다.
    const notice = `<p data-figure-choice-notice="" class="mt-3 text-xs">${UNLINKED_FIGURE_CHOICES_NOTICE}</p>`;
    expect(
      BANK_CHOICE_FIGURES.map((problem) => {
        const html = renderToStaticMarkup(
          <ProblemContent {...problem} choiceFigureIndex={undefined} />,
        );
        expect(html.split(notice)).toHaveLength(2);
        // 지문은 KaTeX 0.16 으로 떴다. 0.18(380fb3b7d)은 base · strut · sizing 클래스에 `katex-` 를
        // 붙일 뿐이라, 그 이름만 되돌려 같은 지문과 견준다.
        // 2026-10-20 짧은 인라인 식의 `style="white-space:nowrap"`(rehypeMathNowrap)도 되돌린다 — 그 속성뿐이다.
        // 2026-10-21 식 뒤 조사 앞의 U+2060(D-164 ⑴ · `joinParticles`)도 걷는다 — 폭 없는 그 글자뿐이다.
        // 2026-10-21 뿌리의 한글 어절 줄바꿈 클래스(D-164 ② · `mathTextWrap.ts`)도 걷는다 — 그 두 클래스뿐이다
        // (`className` 기본값이 빈 글이라 수정 전 뿌리는 `class=""` 였다).
        const katex016 = html
          .replace(notice, "")
          .replace(/\bkatex-(base|strut|sizing)\b/g, "$1")
          .replace(/ style="white-space:nowrap"/g, "")
          .replaceAll("\u2060", "")
          .replaceAll(` class="${MATH_TEXT_WRAP}"`, ' class=""');
        return createHash("sha256")
          .update(JSON.stringify(katex016))
          .digest("hex");
      }),
    ).toEqual(baseline.markup);
  });

  it("카드·문제지·통합 미리보기가 같은 보기 그림을 받으며 인쇄는 지연 로딩하지 않는다", () => {
    const studio = {
      ...first,
      solution: "",
      grade: "중3",
      chapter: "",
      section: "",
      difficulty: "기본",
      problemCode: "",
      figureSvg: null,
    };
    for (const view of [
      <PaperProblemView key="card" {...first} />,
      <ProblemBody key="paper" problem={{ ...first, orderIndex: 1 }} />,
      <UnifiedProblem key="preview" problem={studio} print />,
    ]) {
      const { container, unmount } = render(view);
      const images = gridIn(container).querySelectorAll("img");
      expect(images).toHaveLength(5);
      if (view.key !== "card")
        for (const img of images) expect(img).not.toHaveAttribute("loading");
      unmount();
    }
  });
});
