import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StudioReviewPane from "@/components/unified/StudioReviewPane";
import type {
  StudioCrop,
  StudioFigure,
} from "@/components/unified/studioHelpers";

// Source editing itself has browser coverage; these isolate the review draft transaction.
vi.mock("@/components/math/editor/MathTextEditor", () => ({
  MathTextEditor: ({
    value,
    onChange,
    "aria-label": label,
  }: {
    value: string;
    onChange: (value: string) => void;
    "aria-label": string;
  }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
vi.mock("@/components/math/editor/SourceEditorDisplay", () => ({
  SourceEditorDisplay: ({ value }: { value: string }) => <div>{value}</div>,
}));

const sourceFigure: StudioFigure = {
  id: "figure-1",
  rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  image: "data:image/png;base64,YQ==",
  svg: '<svg xmlns="http://www.w3.org/2000/svg" />',
};
function setup() {
  const crop: StudioCrop = {
    id: "crop-1",
    sourceId: "source-1",
    sourceLabel: "원본",
    page: 1,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: sourceFigure.image,
    figures: [sourceFigure],
    content: "원래 문제",
    answer: "2",
    solution: "원래 풀이",
    level: "secondary",
    grade: "중1",
    mode: "text",
    added: false,
  };
  const onUpdate = vi.fn();
  const onEditFigure =
    vi.fn<
      (
        crop: StudioCrop,
        figure: StudioFigure,
        onApply?: (figure: StudioFigure) => void,
      ) => void
    >();
  render(
    <StudioReviewPane
      crops={[crop]}
      allCrops={[crop]}
      activeId={crop.id}
      original={crop.image}
      page={1}
      jobs={[]}
      figureJobs={[]}
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
  return { user: userEvent.setup(), crop, onUpdate, onEditFigure };
}

describe("Studio source review drafts", () => {
  it("discards body, answer, solution, metadata, and staged figure edits on Cancel", async () => {
    const { user, onUpdate, onEditFigure } = setup();
    await user.click(screen.getByRole("button", { name: "내용 수정" }));
    expect(
      screen.getByRole("button", { name: "그림 다시 찾기" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "다시 인식" })).toBeDisabled();
    await user.clear(screen.getByLabelText("문제 내용"));
    await user.type(screen.getByLabelText("문제 내용"), "바꾼 문제");
    await user.clear(screen.getByLabelText("정답"));
    await user.type(screen.getByLabelText("정답"), "3");
    await user.type(screen.getByLabelText("토픽"), "함수");
    await user.click(
      screen.getByRole("button", { name: "그림 편집", exact: true }),
    );
    act(() =>
      onEditFigure.mock.calls[0][2]?.({
        ...sourceFigure,
        image: "changed",
        svg: "changed",
      }),
    );
    await user.click(screen.getByRole("button", { name: "취소", exact: true }));
    expect(onUpdate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "내용 수정" }));
    expect(screen.getByLabelText("문제 내용")).toHaveValue("원래 문제");
    expect(screen.getByLabelText("정답")).toHaveValue("2");
    expect(screen.getByLabelText("토픽")).toHaveValue("");
    await user.click(
      screen.getByRole("button", { name: "그림 편집", exact: true }),
    );
    expect(onEditFigure.mock.calls[1][1]).toEqual(sourceFigure);
  });

  it("saves metadata and all visual draft fields once, with staged figure output", async () => {
    const { user, onUpdate, onEditFigure, crop } = setup();
    await user.click(screen.getByRole("button", { name: "내용 수정" }));
    for (const [label, value] of [
      ["문제 내용", "바꾼 문제"],
      ["정답", "3"],
      ["풀이", "바꾼 풀이"],
      ["토픽", "함수"],
      ["문제 번호", "8"],
    ]) {
      await user.clear(screen.getByLabelText(label));
      await user.type(screen.getByLabelText(label), value);
    }
    await user.click(
      screen.getByRole("button", { name: "그림 편집", exact: true }),
    );
    const nextFigure = { ...sourceFigure, image: "changed", svg: "changed" };
    act(() => onEditFigure.mock.calls[0][2]?.(nextFigure));
    expect(onUpdate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "저장", exact: true }));
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledWith(
      crop.id,
      expect.objectContaining({
        content: "바꾼 문제",
        answer: "3",
        solution: "바꾼 풀이",
        figures: [nextFigure],
        reviewed: true,
        ocr: expect.objectContaining({
          number: 8,
          topic: "함수",
          contentEdited: true,
        }),
      }),
    );
  });
});
