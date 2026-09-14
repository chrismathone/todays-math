import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StudioReviewPane from "@/components/unified/StudioReviewPane";
import { applyStudioCropEdit } from "@/components/unified/studioCropEdit";
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
    <textarea
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
function setup(overrides: Partial<StudioCrop> = {}) {
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
    ...overrides,
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
    await user.click(screen.getByRole("button", { name: "그림 편집" }));
    act(() =>
      onEditFigure.mock.calls[0][2]?.({
        ...sourceFigure,
        image: "changed",
        svg: "changed",
      }),
    );
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onUpdate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "내용 수정" }));
    expect(screen.getByLabelText("문제 내용")).toHaveValue("원래 문제");
    expect(screen.getByLabelText("정답")).toHaveValue("2");
    expect(screen.getByLabelText("토픽")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "그림 편집" }));
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
    await user.click(screen.getByRole("button", { name: "그림 편집" }));
    const nextFigure = { ...sourceFigure, image: "changed", svg: "changed" };
    act(() => onEditFigure.mock.calls[0][2]?.(nextFigure));
    expect(onUpdate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "저장" }));
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

const scoredBody =
  "도훈이의 나이를 구하시오.\n\n> <조건>\n> ○ 미지수 x 정하기\n○ 이차방정식 세우기\n○ 해 중 문제의 뜻에 맞는 것 택하여 답 적기";
const scoredOcr: NonNullable<StudioCrop["ocr"]> = {
  number: 19,
  blocks: [{ type: "text", value: scoredBody, rows: [] }],
  choiceGroups: [],
  subQuestions: [],
  score: 6,
  printedScore: "6",
  confidence: "high",
  choicesLayout: "auto",
  bodyMissing: false,
  choicesMissing: false,
};

describe("Studio score editing", () => {
  it("puts a metadata-only score at the stem end in both display and editor, even when scores are hidden", async () => {
    const { user, onUpdate } = setup({ content: scoredBody, ocr: scoredOcr });
    expect(screen.getByRole("article")).toHaveTextContent("구하시오. [6점]");
    await user.click(screen.getByRole("checkbox", { name: "배점 표시" }));
    expect(screen.getByRole("article")).not.toHaveTextContent("6점");
    await user.click(screen.getByRole("button", { name: "내용 수정" }));
    expect(
      (screen.getByLabelText("문제 내용") as HTMLTextAreaElement).value,
    ).toContain("구하시오. [6점]\n\n> <조건>");
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("retains native blocks when a displayed score was only seeded into the editor", async () => {
    const { user, crop, onUpdate } = setup({
      content: scoredBody,
      ocr: scoredOcr,
    });
    await user.click(screen.getByRole("button", { name: "내용 수정" }));
    await user.click(screen.getByRole("button", { name: "저장" }));
    const patch = onUpdate.mock.calls[0][1];
    expect(patch).not.toHaveProperty("content");
    expect(applyStudioCropEdit(crop, patch).ocr?.blocks).toEqual(
      scoredOcr.blocks,
    );
  });

  it.each([
    "도훈이의 나이를 [7.5점] 구하시오.\n\n> <조건>\n> ○ 미지수 정하기",
    "도훈이의 나이를 구하시오.\n\n> <조건>\n> ○ 미지수 정하기",
  ])(
    "saves a moved/changed or removed score without restoring old metadata: %s",
    async (edited) => {
      const { user, crop, onUpdate } = setup({
        content: scoredBody,
        ocr: scoredOcr,
      });
      await user.click(screen.getByRole("button", { name: "내용 수정" }));
      fireEvent.change(screen.getByLabelText("문제 내용"), {
        target: { value: edited },
      });
      await user.click(screen.getByRole("button", { name: "저장" }));
      const saved = applyStudioCropEdit(crop, onUpdate.mock.calls[0][1]);
      expect(saved.ocr?.score).toBe(edited.includes("7.5") ? 7.5 : undefined);
      expect(saved.ocr?.printedScore).toBe(
        edited.includes("7.5") ? "7.5" : undefined,
      );
      cleanup();
      const reopened = setup(saved);
      expect(screen.getByRole("article")).not.toHaveTextContent("6점");
      if (edited.includes("7.5"))
        expect(screen.getByRole("article")).toHaveTextContent(
          "나이를 [7.5점] 구하시오.",
        );
      await reopened.user.click(
        screen.getByRole("button", { name: "내용 수정" }),
      );
      expect(screen.getByLabelText("문제 내용")).toHaveValue(edited);
    },
  );
});
