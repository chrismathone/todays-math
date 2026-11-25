import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ScanAnswers } from "@/components/concept-blank/scan/ScanAnswers";
import { ScanResults } from "@/components/concept-blank/scan/ScanResults";
import { ScanPhoto } from "@/components/concept-blank/scan/ScanPhoto";
import type { ScanSubmissionView } from "@/contracts/conceptBlankScanApi.contract";
const source = {
  photoUrl: vi.fn().mockResolvedValue("https://example.test/private-photo"),
};
const view: ScanSubmissionView = {
  id: "00000000-0000-4000-8000-000000000001",
  printedSheetId: "00000000-0000-4000-8000-000000000002",
  student: {
    id: "00000000-0000-4000-8000-000000000003",
    name: "학생",
    className: "반",
  },
  role: "student",
  state: "checking",
  revision: 3,
  job: null,
  lastError: null,
  snapshot: {
    version: 1,
    sheetCode: null,
    pageCount: 1,
    pages: [
      {
        number: 1,
        form: "term",
        questions: [{ id: "q1", number: 1, prompt: "뜻을 쓰시오." }],
        slots: [{ id: "s1", questionId: "q1", kind: "answer", label: "답" }],
      },
    ],
  },
  photos: [
    {
      id: "00000000-0000-4000-8000-000000000004",
      page: 1,
      version: 1,
      width: 1000,
      height: 1400,
      registration: {
        version: 1,
        status: "uncertain",
        reason: "표식을 확인하지 못했습니다.",
      },
      available: true,
      expiresAt: "2026-12-01T00:00:00.000Z",
    },
  ],
  readings: [
    {
      id: "00000000-0000-4000-8000-000000000005",
      slotId: "s1",
      photoId: "00000000-0000-4000-8000-000000000004",
      status: "unreadable",
      text: "",
    },
  ],
  corrections: [],
  grades: [],
};
beforeEach(() => vi.clearAllMocks());
describe("scan confirmation and evidence UI", () => {
  it("opens a confidently read field from the photo and lets a failed draft be discarded", async () => {
    const ref = createRef<{ focus: (slotId: string) => void }>();
    const onDirty = vi.fn();
    const save = vi
      .fn()
      .mockRejectedValue(new Error("최신 답안을 다시 확인해 주세요."));
    render(
      <ScanAnswers
        ref={ref}
        view={{
          ...view,
          readings: [
            { ...view.readings[0], status: "read", text: "원래 읽은 글" },
          ],
        }}
        page={1}
        busy={false}
        save={save}
        onDirty={onDirty}
      />,
    );
    expect(screen.getByLabelText("내가 쓴 답")).not.toBeVisible();
    act(() => ref.current!.focus("s1"));
    await waitFor(() =>
      expect(screen.getByLabelText("내가 쓴 답")).toHaveFocus(),
    );
    fireEvent.change(screen.getByLabelText("내가 쓴 답"), {
      target: { value: "고친 글" },
    });
    fireEvent.click(screen.getByRole("button", { name: "쓴 답 저장" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "입력 되돌리기" }));
    expect(screen.getByLabelText("내가 쓴 답")).toHaveValue("원래 읽은 글");
    expect(onDirty).toHaveBeenLastCalledWith("s1", false);
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("submits blank versus review without inventing text, and offers numerical input assistance", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<ScanAnswers view={view} page={1} busy={false} save={save} />);
    fireEvent.click(
      screen.getByRole("button", { name: "종이에도 비워 뒀어요" }),
    );
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resolution: "blank",
        text: "",
        readId: view.readings[0].id,
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "지금 확인하기 어려워요" }),
    );
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ resolution: "review", text: "" }),
    );
    fireEvent.change(screen.getByLabelText("입력 보조"), {
      target: { value: "fraction" },
    });
    fireEvent.change(screen.getByLabelText("분자"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("분모"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "답에 넣기" }));
    fireEvent.click(screen.getByRole("button", { name: "쓴 답 저장" }));
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith(
        expect.objectContaining({ resolution: "text", text: "1/2" }),
      ),
    );
    expect(screen.queryByText("정답")).not.toBeInTheDocument();
  });
  it("does not paint any overlay for uncertain registration", async () => {
    const { container } = render(
      <ScanPhoto
        photo={view.photos[0]}
        submissionId={view.id}
        numbers={new Map([["s1", 1]])}
        source={source}
      />,
    );
    await screen.findByAltText("1쪽 답안 사진");
    expect(container.querySelector("[data-scan-overlay]")).toBeNull();
    expect(screen.getByText(/번호 표시 없이/)).toBeInTheDocument();
  });
  it("publishes ordered marks and reasons without total scores or student correction controls", () => {
    const result = {
      ...view,
      state: "graded" as const,
      grades: [
        {
          id: "00000000-0000-4000-8000-000000000006",
          targetId: "t1",
          page: 1,
          questionId: "q1",
          slotIds: ["s1"],
          unit: "문항" as const,
          label: "partial" as const,
          reason: "대응하는 변의 길이를 더 설명해야 합니다.",
          directlyEntered: true,
          origin: "model" as const,
          sequence: 1,
          at: "2026-11-25T00:00:00.000Z",
        },
      ],
    };
    render(
      <ScanResults
        view={result}
        busy={false}
        source={source}
        save={vi.fn()}
        onPage={vi.fn()}
      />,
    );
    expect(screen.getByText(result.grades[0].reason)).toBeInTheDocument();
    expect(screen.getByText(/△ 1문항/)).toBeInTheDocument();
    expect(screen.queryByText(/종합 점수|— 점/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "판정 고치기" }),
    ).not.toBeInTheDocument();
  });
});
