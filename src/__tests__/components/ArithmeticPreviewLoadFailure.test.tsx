import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import AdminDocumentPreview from "@/components/admin/AdminDocumentPreview";
import {
  ArithmeticTypePreview,
  useArithmeticTypePreview,
} from "@/components/arithmetic/ArithmeticTypePreview";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2/catalog";

// Reject the requested modules, not React.lazy/Suspense or the consumer. The
// successful-path suites exercise both real modules; this file covers chunk failure.
vi.mock("@/components/admin/AdminArithmeticPreview", () => {
  throw new Error("Simulated arithmetic preview chunk failure");
});
vi.mock("@/components/arithmetic/GradeArithmeticPrompt", () => {
  throw new Error("Simulated figure example chunk failure");
});

it("announces an admin chunk failure and accurately requires refresh even after reopening", async () => {
  const props = {
    userId: "teacher",
    document: {
      id: "saved",
      kind: "arithmeticSheet" as const,
      title: "저장한 연산",
      revision: 1,
      createdAt: "2026-11-14T03:00:00.000Z",
      updatedAt: "2026-11-14T03:00:00.000Z",
      payload: {},
    },
  };
  const { rerender } = render(<AdminDocumentPreview {...props} />);
  expect(screen.getByRole("status")).toHaveTextContent("미리보기를 준비");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "연산 미리보기를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
  );
  rerender(<div />);
  rerender(<AdminDocumentPreview {...props} />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "페이지를 새로고침해 주세요.",
  );
  expect(screen.queryByText("자료를 다시 열어 주세요.")).toBeNull();
});

const types = listArithmeticV2Types();
const figure = types.find((type) => type.id === "m3-trig-special-length")!;
function Catalog() {
  const preview = useArithmeticTypePreview();
  return (
    <>
      <button type="button" {...preview.cardProps(figure.id)}>
        {figure.title}
      </button>
      <ArithmeticTypePreview state={preview.state} types={types} />
    </>
  );
}

it("keeps a failed figure tooltip linked and noninteractive with refresh guidance", async () => {
  render(<Catalog />);
  const card = screen.getByRole("button", { name: figure.title });
  vi.useFakeTimers();
  try {
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => card.focus());
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole("status")).toHaveTextContent(
      "예시를 불러오는 중입니다.",
    );
  } finally {
    vi.useRealTimers();
  }
  const error = await screen.findByRole("alert");
  expect(error).toHaveTextContent(
    "예시를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
  );
  const tooltip = screen.getByRole("tooltip");
  expect(card).toHaveAttribute("aria-describedby", tooltip.id);
  expect(within(tooltip).queryByRole("button")).toBeNull();
  expect(within(tooltip).queryByRole("link")).toBeNull();
  expect(card).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(card).not.toHaveAttribute("aria-describedby");
});
