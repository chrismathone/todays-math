import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningInsightPanel from "@/components/math-srs/LearningInsightPanel";
import {
  getLearningInsight,
  inquireLearningInsight,
} from "@/components/math-srs/courseApi";
import {
  insightFixture,
  inquiryFixture,
  scopeA,
  scopeB,
} from "../../../scripts/qa/math-insight-ui/data";

vi.mock("@/components/math-srs/courseApi", () => ({
  getLearningInsight: vi.fn(),
  inquireLearningInsight: vi.fn(),
}));
const get = vi.mocked(getLearningInsight);
const inquire = vi.mocked(inquireLearningInsight);
const props = scopeA;

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("LearningInsightPanel request ownership", () => {
  it("requests scoped deterministic evidence on mount and never invokes AI automatically", async () => {
    get.mockImplementation(() => new Promise(() => {}));
    render(<LearningInsightPanel {...props} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "학습 근거를 불러오는 중",
    );
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        props.studentId,
        props.classId,
        props.branchId,
        expect.any(AbortSignal),
      ),
    );
    expect(inquire).not.toHaveBeenCalled();
  });

  it("keeps an actionable load error and retries only the selected scope", async () => {
    get.mockResolvedValue({
      ok: false,
      status: 403,
      message: "조회 권한을 확인해 주세요.",
    });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "조회 권한을 확인",
    );
    await user.click(
      screen.getByRole("button", { name: "학습 근거 다시 불러오기" }),
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(inquire).not.toHaveBeenCalled();
  });

  it("aborts old GET and ignores its late error after student/class/branch changes", async () => {
    let finish!: (value: {
      ok: false;
      status: number;
      message: string;
    }) => void;
    get.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    get.mockResolvedValue({
      ok: false,
      status: 403,
      message: "현재 학생의 조회 오류",
    });
    const { rerender } = render(<LearningInsightPanel {...props} />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    const signal = get.mock.calls[0][3]!;
    rerender(
      <LearningInsightPanel
        studentId="synthetic-b"
        classId="class-b"
        branchId="branch-b"
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "현재 학생의 조회 오류",
    );
    expect(signal.aborted).toBe(true);
    await act(async () =>
      finish({ ok: false, status: 403, message: "이전 학생의 늦은 오류" }),
    );
    expect(screen.queryByText("이전 학생의 늦은 오류")).not.toBeInTheDocument();
  });

  it("aborts pending evidence on refresh and unmount", async () => {
    get.mockImplementation(() => new Promise(() => {}));
    const { rerender, unmount } = render(
      <LearningInsightPanel {...props} refreshKey={0} />,
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    const first = get.mock.calls[0][3]!;
    rerender(<LearningInsightPanel {...props} refreshKey={1} />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(first.aborted).toBe(true);
    const second = get.mock.calls[1][3]!;
    unmount();
    expect(second.aborted).toBe(true);
  });

  it("shows bounded observation, candidate relation and record links without automatic AI", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    expect(
      await screen.findByText(/최근 확인 기준 미충족/),
    ).toBeInTheDocument();
    expect(screen.getByText(/관련 개념 · 관계 확인 전/)).toBeInTheDocument();
    expect(inquire).not.toHaveBeenCalled();
    await user.click(screen.getAllByRole("link", { name: "기록 1" })[0]);
    expect(
      screen.getByText("근거 기록 2건 · 포함·제외 이유").parentElement,
    ).toHaveAttribute("open");
    expect(screen.getByText("미완료")).toBeInTheDocument();
  });

  it("submits a bounded explicit question and uses the fresh server snapshot", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    const result = inquiryFixture();
    result.snapshot.asOf = "2026-10-22T09:00:00.000Z";
    inquire.mockResolvedValue({ ok: true, data: result });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    const field = await screen.findByRole("textbox", {
      name: "학습 근거에 관해 질문하기",
    });
    expect(field).toHaveAttribute("maxLength", "500");
    expect(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    ).toBeDisabled();
    await user.type(field, "다음에는 무엇을 확인할까요?");
    expect(inquire).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    expect(await screen.findByText("질문에 연결된 근거")).toBeInTheDocument();
    expect(inquire).toHaveBeenCalledWith(
      props.studentId,
      props.classId,
      { query: "다음에는 무엇을 확인할까요?" },
      props.branchId,
      expect.any(AbortSignal),
    );
    expect(screen.getByText(/오후 6:00/)).toBeInTheDocument();
  });

  it.each([503, 502, 429, 504])(
    "keeps deterministic records and input after AI failure %s",
    async (status) => {
      get.mockResolvedValue({ ok: true, data: insightFixture() });
      inquire.mockResolvedValue({
        ok: false,
        status,
        message: "질문 기능을 지금 사용할 수 없습니다.",
      });
      const user = userEvent.setup();
      render(<LearningInsightPanel {...props} />);
      const field = await screen.findByRole("textbox");
      await user.type(field, "기록을 설명해 주세요");
      await user.click(
        screen.getByRole("button", { name: "AI에 근거 질문하기" }),
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "위 학습 근거는 계속 확인",
      );
      expect(field).toHaveValue("기록을 설명해 주세요");
      expect(screen.getByText("분수의 뺄셈")).toBeInTheDocument();
    },
  );

  it("clears old AI output and aborts pending POST before new scope can show it", async () => {
    get.mockResolvedValueOnce({ ok: true, data: insightFixture() });
    get.mockResolvedValue({ ok: true, data: insightFixture(scopeB) });
    let finish!: (value: {
      ok: true;
      data: ReturnType<typeof inquiryFixture>;
    }) => void;
    inquire.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const user = userEvent.setup();
    const { rerender } = render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "확인 후보는?");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    const signal = inquire.mock.calls[0][4]!;
    rerender(<LearningInsightPanel {...scopeB} />);
    expect(signal.aborted).toBe(true);
    await screen.findByRole("textbox");
    await act(async () => finish({ ok: true, data: inquiryFixture() }));
    expect(screen.queryByText("질문에 연결된 근거")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it.each(["student", "class", "branch", "references", "null-context"])(
    "rejects inconsistent %s evidence",
    async (kind) => {
      const data = insightFixture();
      if (kind === "student") data.context!.studentId = scopeB.studentId;
      if (kind === "class") data.context!.classId = scopeB.classId;
      if (kind === "branch") data.context!.branchId = scopeB.studentId;
      if (kind === "references") data.sections[0].evidenceIds = ["nonexistent"];
      if (kind === "null-context") data.context = null;
      get.mockResolvedValue({ ok: true, data });
      render(<LearningInsightPanel {...props} />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "일치하지 않습니다",
      );
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    },
  );

  it("rejects an AI result referring to excluded or unknown evidence and keeps the original evidence", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    const data = inquiryFixture();
    data.facts[0].evidenceIds = ["record-excluded"];
    inquire.mockResolvedValue({ ok: true, data });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "근거는?");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "응답의 근거가 일치하지 않습니다",
    );
    expect(screen.queryByText(data.facts[0].text)).not.toBeInTheDocument();
    expect(screen.getByText("분수의 뺄셈")).toBeInTheDocument();
  });

  it("distinguishes empty and outside-pilot evidence without inventing student conclusions", async () => {
    const data = insightFixture();
    data.eligibility = "out-of-scope";
    data.goal = {
      sectionId: "3-1-1-1",
      title: "시범 범위 밖 예시",
      unitId: null,
      mappingStatus: "unmapped",
    };
    data.sections = [];
    data.evidence = [];
    data.nextChecks = [];
    get.mockResolvedValue({ ok: true, data });
    render(<LearningInsightPanel {...props} />);
    expect(
      await screen.findByText("현재 목표는 시범 범위 밖"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("이 범위에서 살펴볼 학습 기록이 없습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("현재 제시할 확인 후보가 없습니다."),
    ).toBeInTheDocument();
    expect(inquire).not.toHaveBeenCalled();
  });
});
