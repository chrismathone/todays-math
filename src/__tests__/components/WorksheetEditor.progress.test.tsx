import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorksheetEditor from "@/components/unified/WorksheetEditor";
import type { StudioProblem } from "@/components/unified/types";

vi.mock("@/components/unified/print/PrintOptionsPanel", () => ({
  PrintOptionsPanel: () => null,
}));
vi.mock("@/components/unified/print/WorksheetPrint", () => ({
  WorksheetPrint: ({ onReady }: { onReady: (ready: boolean) => void }) => (
    <div data-mathgen-document>
      <button onClick={() => onReady(true)}>페이지 구성 완료</button>
    </div>
  ),
}));
vi.mock("@/lib/export/hwpxClient", () => ({
  exportPreviewHwpx: vi.fn(),
  downloadExport: vi.fn(),
}));
vi.mock("@/lib/export/pdfClient", () => ({
  exportPreviewPdf: vi.fn().mockRejectedValue(new Error("검증용 PDF 오류")),
}));

const selected: StudioProblem[] = [
  {
    id: "one",
    content: "1 + 1",
    answer: "2",
    solution: "",
    grade: "중1",
    chapter: "수와 연산",
    section: "",
    difficulty: "기본",
    problemCode: "",
    figureUrls: [],
    figureSvg: null,
    figureDims: [],
    figureSourceMm: [],
  },
];
const props = {
  selected,
  title: "시험지",
  columns: 2,
  answers: true,
  savedAt: "",
  setTitle: vi.fn(),
  setColumns: vi.fn(),
  setAnswers: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  download: vi.fn(),
  toggle: vi.fn(),
  move: vi.fn(),
  reorder: vi.fn(),
  navigate: vi.fn(),
};

describe("worksheet print readiness feedback", () => {
  it("announces export errors in a dismissible notification", async () => {
    render(<WorksheetEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "페이지 구성 완료" }));
    fireEvent.click(screen.getByRole("button", { name: "PDF 내려받기" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("검증용 PDF 오류"),
    );
    fireEvent.click(screen.getByRole("button", { name: "내보내기 알림 닫기" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("groups the two bottom actions in one row and keeps their actions", () => {
    render(<WorksheetEditor {...props} />);
    const add = screen.getByRole("button", { name: "문제 더 담기" });
    const download = screen.getByRole("button", { name: "작업 파일 내보내기" });
    expect(add.parentElement).toBe(download.parentElement);
    expect(add.parentElement?.tagName).toBe("DIV");
    fireEvent.click(add);
    expect(props.navigate).toHaveBeenCalledWith("bank");
    fireEvent.click(download);
    expect(props.download).toHaveBeenCalled();
  });
  it("keeps printing disabled until the exact current draft has been prepared", () => {
    const { rerender } = render(<WorksheetEditor {...props} />);
    expect(
      screen.getByRole("button", { name: "인쇄 준비 중…" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "인쇄 준비 중…" }),
    ).toHaveAttribute("aria-busy", "true");
    fireEvent.click(screen.getByRole("button", { name: "페이지 구성 완료" }));
    expect(
      screen.getByRole("button", { name: "인쇄 / PDF 저장" }),
    ).toBeEnabled();
    rerender(<WorksheetEditor {...props} title="수정한 시험지" />);
    expect(
      screen.getByRole("button", { name: "인쇄 준비 중…" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "페이지 구성 완료" }));
    expect(
      screen.getByRole("button", { name: "인쇄 / PDF 저장" }),
    ).toBeEnabled();
    rerender(
      <WorksheetEditor
        {...props}
        title="수정한 시험지"
        selected={[...selected]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "인쇄 준비 중…" }),
    ).toBeDisabled();
  });

  it("does not suggest active preparation when no problems are selected", () => {
    render(<WorksheetEditor {...props} selected={[]} />);
    expect(
      screen.getByRole("button", { name: "인쇄 / PDF 저장" }),
    ).toBeDisabled();
    expect(screen.queryByText("인쇄 준비 중…")).not.toBeInTheDocument();
  });
});
