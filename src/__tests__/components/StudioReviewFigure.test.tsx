import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StudioReviewPane from "@/components/unified/StudioReviewPane";
import type {
  StudioCrop,
  StudioFigure,
} from "@/components/unified/studioHelpers";

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30"/></svg>';
const raster = "data:image/png;base64,b3JpZ2luYWw=";

function setup(
  figurePatch: Partial<StudioFigure> = {},
  drawing = false,
  cropPatch: Partial<StudioCrop> = {},
) {
  const figure: StudioFigure = {
    id: "figure-1",
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    svg,
    originalImage: raster,
    ...figurePatch,
  };
  const crop: StudioCrop = {
    id: "crop-1",
    sourceId: "source-1",
    sourceLabel: "원본",
    page: 1,
    rect: figure.rect,
    image: raster,
    figures: [figure],
    content: "넓이를 구하세요.\n\n[그림1]",
    answer: "",
    solution: "",
    level: "secondary",
    grade: "중1",
    mode: "text",
    added: false,
    ...cropPatch,
  };
  const onEditFigure = vi.fn();
  const onUpdate = vi.fn();
  render(
    <StudioReviewPane
      crops={[crop]}
      allCrops={[crop]}
      activeId={crop.id}
      original={raster}
      page={1}
      jobs={[]}
      figureJobs={
        drawing
          ? [{ cropId: crop.id, figureId: figure.id, state: "running" }]
          : []
      }
      available
      onSelect={vi.fn()}
      onUpdate={onUpdate}
      onRun={vi.fn()}
      onCancel={vi.fn()}
      onRetry={vi.fn()}
      onCrop={vi.fn()}
      onEditFigure={onEditFigure}
      onRetryPage={vi.fn()}
      onRenderFigure={vi.fn()}
      onCancelFigure={vi.fn()}
    />,
  );
  return { user: userEvent.setup(), onEditFigure, onUpdate, crop, figure };
}

describe("Studio review figure activation", () => {
  it.each(["click", "Enter", " "])(
    "opens the same editor from the diagram with %s",
    async (activation) => {
      const { user, onEditFigure, crop, figure } = setup();
      const preview = screen.getByRole("button", {
        name: /^그림 1 편집/,
      });
      expect(preview.querySelector("svg circle")).toBeInTheDocument();
      if (activation === "click") await user.click(preview);
      else {
        preview.focus();
        await user.keyboard(activation === "Enter" ? "{Enter}" : activation);
      }
      expect(onEditFigure).toHaveBeenLastCalledWith(crop, figure);
    },
  );

  it("also activates an SVG data image without separate SVG metadata", () => {
    setup({ svg: undefined });
    expect(screen.getByRole("button", { name: /^그림 1 편집/ })).toBeEnabled();
  });

  // 원장님 2026-09-19 «그림 누르면 수정 가능하니 필요 없다» — 도형 줄의 단추 셋을 뺐다.
  // «그림 편집» 단추가 열어 주던 래스터 그림도 이제 그림 자체를 눌러 연다.
  it("opens a raster figure from the figure itself — the separate edit action is gone", async () => {
    const { user, onEditFigure, crop, figure } = setup({
      svg: undefined,
      image: raster,
    });
    const preview = screen.getByRole("button", { name: /^그림 1 편집/ });
    expect(preview).toHaveAttribute("src", raster);
    await user.click(preview);
    expect(onEditFigure).toHaveBeenCalledWith(crop, {
      ...figure,
      svg: undefined,
      image: raster,
    });
    expect(
      screen.queryByRole("button", { name: "그림 편집" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "영역 수정" }),
    ).not.toBeInTheDocument();
    // SVG 가 없는 도형은 캡션과 «SVG 생성»을 남긴다.
    expect(screen.getByText(/원본 크롭 · SVG 미생성/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SVG 생성" })).toBeEnabled();
  });

  it("draws nothing under the body for a finished SVG figure", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "그림 편집" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "영역 수정" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("원본 그림 비교")).not.toBeInTheDocument();
    expect(screen.queryByText(/SVG 도형$/)).not.toBeInTheDocument();
    expect(document.querySelectorAll("article figure")).toHaveLength(0);
  });

  it("disables diagram activation during redraw and keeps the per-figure cancel", async () => {
    const { user, onEditFigure } = setup({}, true);
    const preview = document.querySelector(
      '[data-figure-index="0"]',
    ) as HTMLElement;
    expect(
      screen.queryByRole("button", { name: /^그림 1 편집/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "내용 수정" })).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "그림 편집" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "이 도형 취소" }),
    ).toBeInTheDocument();
    await user.click(preview);
    expect(onEditFigure).not.toHaveBeenCalled();
    expect(screen.queryByAltText(/^도형 .* 원본$/)).not.toBeInTheDocument();
  });

  it("hides old «원본 대조 확인 필요» notes saved in a draft, keeping other warnings", () => {
    setup({}, false, {
      aiWarnings: [
        "원본 대조 확인 필요: 각의 크기가 다릅니다.",
        "보기 5번을 확인해 주세요.",
      ],
    });
    expect(screen.queryByText(/원본 대조/)).not.toBeInTheDocument();
    expect(screen.getByText("보기 5번을 확인해 주세요.")).toBeInTheDocument();
  });

  it("renders a body figure at its source anchor before following conditions, without a repeated preview", () => {
    setup({}, false, {
      content: "그림을 보세요.\n\n[그림1]\n\n주어진 조건을 만족합니다.",
    });
    const figure = screen.getByRole("button", { name: /^그림 1 편집/ });
    const conditions = screen.getByText("주어진 조건을 만족합니다.");
    expect(
      figure.compareDocumentPosition(conditions) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByText("[그림1]")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-figure-index="0"]')).toHaveLength(
      1,
    );
  });

  it("preserves a native choice figure and an unanchored raster beside the source body", () => {
    const choiceFigure: StudioFigure = {
      id: "choice-figure",
      rect: { x: 0, y: 0, width: 1, height: 1 },
      image: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      svg,
    };
    setup({}, false, {
      figures: [
        choiceFigure,
        { ...choiceFigure, id: "raster", image: raster, svg: undefined },
      ],
      ocr: {
        number: 1,
        blocks: [{ type: "text", value: "알맞은 그림을 고르세요.", rows: [] }],
        choiceGroups: [
          {
            number: 1,
            contents: [{ type: "text", value: "[그림1]", rows: [] }],
          },
          ...[2, 3, 4, 5].map((number) => ({
            number,
            contents: [
              { type: "text" as const, value: String(number), rows: [] },
            ],
          })),
        ],
        subQuestions: [],
        confidence: "high",
        choicesLayout: "5x1",
        bodyMissing: false,
        choicesMissing: false,
      },
    });
    const choice = document.querySelector(".choice") as HTMLElement;
    expect(
      within(choice).getByRole("button", { name: /^그림 1 편집/ }),
    ).toBeEnabled();
    expect(document.querySelectorAll('[data-figure-index="0"]')).toHaveLength(
      1,
    );
    expect(screen.getByAltText("도형 1-2")).toHaveAttribute("src", raster);
    // 편집 단추가 빠져 래스터 그림도 그림 자체가 편집을 연다.
    expect(screen.getByAltText("도형 1-2")).toHaveAttribute("role", "button");
  });

  it("retains separated figures when recognition has not supplied text yet", () => {
    setup({}, false, { content: "" });
    expect(screen.getByRole("button", { name: /^그림 1 편집/ })).toBeEnabled();
  });

  it("toggles scores escaped by the visual editor without changing saved content", async () => {
    const { user, onUpdate } = setup({}, false, {
      content: "문제입니다. \\[4점\\]",
    });
    const card = screen.getByRole("article");
    expect(card).toHaveTextContent("문제입니다. [4점]");
    await user.click(screen.getByRole("checkbox", { name: "배점 표시" }));
    expect(card).not.toHaveTextContent("4점");
    expect(card).not.toHaveTextContent("\\");
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
