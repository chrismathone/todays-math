import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import StudioReviewPane from "@/components/unified/StudioReviewPane";
import type {
  StudioCrop,
  StudioFigure,
} from "@/components/unified/studioHelpers";

/** 본문 편집기·읽기 표시 둘 다 그림을 눌러 편집한다 — 잠금은 `isFigureEditable` 로 간다.
 * `vi.mock` 은 파일 꼭대기로 끌어올려지므로 대역도 `vi.hoisted` 로 같이 올린다. */
const { figureStub } = vi.hoisted(() => ({
  figureStub: ({
    value,
    onChange,
    "aria-label": label,
    figures,
    onFigureClick,
    isFigureEditable,
  }: {
    value: string;
    onChange?: (value: string) => void;
    "aria-label"?: string;
    figures?: unknown[];
    onFigureClick?: (index: number) => void;
    isFigureEditable?: (index: number) => boolean;
  }) => (
    <>
      {label ? (
        <textarea
          aria-label={label}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ) : (
        <div>{value}</div>
      )}
      {figures?.map((_, index) => (
        <button
          key={index}
          type="button"
          disabled={isFigureEditable?.(index) === false}
          onClick={() => onFigureClick?.(index)}
        >
          {`그림 ${index + 1} 편집`}
        </button>
      ))}
    </>
  ),
}));
vi.mock("@/components/math/editor/MathTextEditor", () => ({
  MathTextEditor: figureStub,
}));
vi.mock("@/components/math/editor/SourceEditorDisplay", () => ({
  SourceEditorDisplay: figureStub,
}));

const figure: StudioFigure = {
  id: "figure-1",
  rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
  image: "data:image/png;base64,YQ==",
};
const makeCrop = (id: string, overrides: Partial<StudioCrop> = {}) =>
  ({
    id,
    sourceId: "source-1",
    sourceLabel: "원본",
    page: 1,
    rect: { x: 0, y: 0, width: 1, height: 1 },
    image: figure.image,
    figures: [figure],
    content: "원래 문제",
    answer: "2",
    solution: "",
    level: "secondary",
    grade: "중1",
    mode: "text",
    added: false,
    ...overrides,
  }) as StudioCrop;

function setup(crops: StudioCrop[]) {
  const onUpdate = vi.fn();
  const onRun = vi.fn();
  render(
    <StudioReviewPane
      crops={crops}
      allCrops={crops}
      activeId={crops[0].id}
      original={figure.image}
      page={1}
      jobs={[
        {
          cropId: crops[0].id,
          action: "ocr",
          state: "error",
          error: "응답 지연",
        },
      ]}
      figureJobs={[]}
      available
      onSelect={vi.fn()}
      onUpdate={onUpdate}
      onRun={onRun}
      onCancel={vi.fn()}
      onRetry={vi.fn()}
      onCrop={vi.fn()}
      onEditFigure={vi.fn()}
      onRetryPage={vi.fn()}
      onRenderFigure={vi.fn()}
      onCancelFigure={vi.fn()}
    />,
  );
  return { user: userEvent.setup(), onUpdate, onRun };
}
const card = (number: number) =>
  screen.getByRole("article", { name: `문제 ${number} 인식 결과` });

/** 그 문항을 «바꾸는» 것 전부 — 보기만 하는 것(문제 번호·배점 표시·크롭 수정)은 여기 없다. */
const EDITORS = [
  "다시 인식",
  "내용 수정",
  "다시 시도",
  "그림 다시 찾기",
  "SVG 생성",
  "해설 생성",
  "그림 1 편집",
];

afterEach(cleanup);

describe("검수 완료 잠금 — 원장님 2026-09-20 «모든 해당 문제 버튼 비활성화로 수정 불가능하게»", () => {
  it("검수 전에는 고치는 단추가 모두 눌린다", () => {
    setup([makeCrop("c1")]);
    for (const name of EDITORS)
      expect(within(card(1)).getByRole("button", { name })).toBeEnabled();
    expect(
      within(card(1)).getByRole("combobox", { name: "문제 1 출력 방식" }),
    ).toBeEnabled();
  });

  it("검수 완료된 문항은 고치는 단추가 전부 안 눌린다", () => {
    setup([makeCrop("c1", { reviewed: true })]);
    for (const name of EDITORS)
      expect(within(card(1)).getByRole("button", { name })).toBeDisabled();
    expect(
      within(card(1)).getByRole("combobox", { name: "문제 1 출력 방식" }),
    ).toBeDisabled();
    // 왜 안 눌리는지 보인다.
    expect(card(1)).toHaveTextContent("수정하려면 검수 완료를 취소하세요.");
    expect(
      within(card(1)).getByRole("button", { name: "다시 인식" }),
    ).toHaveAttribute("title", expect.stringContaining("검수 완료"));
  });

  it("검수 완료는 되돌릴 수 있다 — 같은 자리에서 푼다", async () => {
    const { user, onUpdate } = setup([makeCrop("c1")]);
    await user.click(
      within(card(1)).getByRole("button", { name: "이 문제 검수 완료" }),
    );
    expect(onUpdate).toHaveBeenCalledWith("c1", { reviewed: true });
    cleanup();
    const locked = setup([makeCrop("c1", { reviewed: true })]);
    const undo = within(card(1)).getByRole("button", {
      name: "검수 완료 취소",
    });
    expect(undo).toBeEnabled();
    await locked.user.click(undo);
    expect(locked.onUpdate).toHaveBeenCalledWith("c1", { reviewed: false });
  });

  it("다른 문항은 그대로 눌린다", () => {
    setup([makeCrop("c1", { reviewed: true }), makeCrop("c2")]);
    expect(
      within(card(2)).getByRole("button", { name: "내용 수정" }),
    ).toBeEnabled();
    expect(
      within(card(2)).getByRole("button", { name: "해설 생성" }),
    ).toBeEnabled();
    expect(card(2)).not.toHaveTextContent("수정하려면 검수 완료를 취소하세요.");
  });

  it("저장은 검수 완료로 치지 않는다 — 안 그러면 저장만 해도 해설 생성이 막힌다", async () => {
    const { user, onUpdate } = setup([makeCrop("c1")]);
    await user.click(
      within(card(1)).getByRole("button", { name: "내용 수정" }),
    );
    await user.click(within(card(1)).getByRole("button", { name: "저장" }));
    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate.mock.calls[0][1]).not.toHaveProperty("reviewed");
  });
});
