import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LearningInsightPanel from "@/components/math-srs/LearningInsightPanel";
import {
  getLearningInsightV2 as getLearningInsight,
  inquireLearningInsightV2 as inquireLearningInsight,
} from "@/components/math-srs/courseApi";
import {
  insightFixture,
  outsideFixture,
  inquiryFixture,
  scopeA,
  scopeB,
  CURRENT_RECORD_LABEL,
  TRIGGER_EVIDENCE_ID,
  EXCLUDED_EVIDENCE_ID,
  NEXT_CHECK_TITLE,
} from "../../../scripts/qa/math-insight-ui/data-v2";

vi.mock("@/components/math-srs/courseApi", () => ({
  getLearningInsightV2: vi.fn(),
  inquireLearningInsightV2: vi.fn(),
}));
const get = vi.mocked(getLearningInsight);
const inquire = vi.mocked(inquireLearningInsight);
const props = scopeA;

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe("LearningInsightPanel request ownership", () => {
  it("discards stale records after POST 409, reads once and preserves the question without rerunning AI", async () => {
    get.mockResolvedValueOnce({ ok: true, data: insightFixture() });
    get.mockImplementation(() => new Promise(() => {}));
    inquire.mockResolvedValue({
      ok: false,
      status: 409,
      message: "기록이 바뀌었습니다.",
    });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "남겨 둔 질문");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(inquire).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(NEXT_CHECK_TITLE)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("남겨 둔 질문");
  });

  it.each([401, 403, 404])(
    "clears records and AI on inquiry authorization failure %s",
    async (status) => {
      get.mockResolvedValue({ ok: true, data: insightFixture() });
      inquire.mockResolvedValue({
        ok: false,
        status,
        message: "조회 권한을 확인해 주세요.",
      });
      const user = userEvent.setup();
      render(<LearningInsightPanel {...props} />);
      await user.type(await screen.findByRole("textbox"), "권한 확인");
      await user.click(
        screen.getByRole("button", { name: "AI에 근거 질문하기" }),
      );
      await screen.findByRole("alert");
      expect(screen.queryByText(NEXT_CHECK_TITLE)).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("권한 확인");
      expect(get).toHaveBeenCalledTimes(1);
    },
  );

  it("submits on Enter once even when a same-turn click also submits", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    inquire.mockImplementation(() => new Promise(() => {}));
    render(<LearningInsightPanel {...props} />);
    const field = await screen.findByRole("textbox");
    fireEvent.change(field, { target: { value: "질문 하나" } });
    fireEvent.keyDown(field, { key: "Enter", code: "Enter" });
    expect(inquire).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "근거 확인 중…" }));
    expect(inquire).toHaveBeenCalledTimes(1);
  });

  it("cancels inquiry, retains the question and ignores a late response", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
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
    render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "취소할 질문");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    await user.click(screen.getByRole("button", { name: "질문 취소" }));
    expect(inquire.mock.calls[0][4]!.aborted).toBe(true);
    await act(async () => finish({ ok: true, data: inquiryFixture() }));
    expect(screen.queryByText("질문에 연결된 근거")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("취소할 질문");
  });

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
    expect(
      screen.getAllByText(/일부 범위 · 관계 확인 전/)[0],
    ).toBeInTheDocument();
    expect(inquire).not.toHaveBeenCalled();
    await user.click(
      screen.getAllByRole("link", { name: CURRENT_RECORD_LABEL })[0],
    );
    expect(
      screen.getByText("근거 기록 3건 · 포함·제외 이유").parentElement,
    ).toHaveAttribute("open");
    expect(screen.getAllByText("관찰 기간 밖")[0]).toBeInTheDocument();
  });

  it("submits a bounded explicit question and uses the fresh server snapshot", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    const result = inquiryFixture();
    result.snapshot.asOf = "2026-10-22T09:00:00.000Z";
    result.snapshot.pilot.asOf = result.snapshot.asOf;
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
      expect(screen.getAllByText(NEXT_CHECK_TITLE)[0]).toBeInTheDocument();
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
      if (kind === "references")
        data.pilot.sections[0].evidenceIds = ["nonexistent"];
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
    data.facts[0].evidenceIds = [EXCLUDED_EVIDENCE_ID];
    data.facts[0].text = "tampered-fact-only";
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
    expect(screen.getAllByText(NEXT_CHECK_TITLE)[0]).toBeInTheDocument();
  });

  it("distinguishes empty and outside-pilot evidence without inventing student conclusions", async () => {
    const data = outsideFixture();
    data.pilot.sections = [];
    data.pilot.evidence = [];
    data.pilot.nextChecks = [];
    data.facts = data.facts.filter(
      (fact) =>
        !fact.candidateIds.length &&
        fact.evidenceIds.every((key) =>
          data.observations.some((item) => item.id === key),
        ),
    );
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

  it("distinguishes current-section observation from both failed sessions behind a candidate", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    await screen.findByRole("textbox");
    await user.click(screen.getByText("근거 기록 3건 · 포함·제외 이유"));
    expect(
      screen.getByText("최근 상태와 확인 후보 판단에 사용"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "확인 후보 판단에만 사용 · 최근 상태 수치에 더하지 않음",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    "current-reference",
    "candidate-reference",
    "missing-purpose",
    "duplicate-purpose",
  ])("rejects contradictory %s proof metadata", async (kind) => {
    const data = insightFixture();
    if (kind === "current-reference")
      data.pilot.sections[0].evidenceIds = [TRIGGER_EVIDENCE_ID];
    if (kind === "candidate-reference")
      data.pilot.nextChecks[0].evidenceIds = [EXCLUDED_EVIDENCE_ID];
    if (kind === "missing-purpose") data.pilot.evidence[1].purposes = [];
    if (kind === "duplicate-purpose")
      data.pilot.evidence[1].purposes = [
        "candidate-trigger",
        "candidate-trigger",
      ];
    get.mockResolvedValue({ ok: true, data });
    render(<LearningInsightPanel {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "일치하지 않습니다",
    );
  });
});

describe("LearningInsightPanel v2 facts and source boundaries", () => {
  it.each([
    "grade-3",
    "grade-4",
    "grade-5",
    "grade-6",
    "outside",
    "paused",
    "future",
    "stale",
    "empty",
    "missing-source",
    "unfinished",
    "multiple-grades",
  ])(
    "renders actual code-owned %s context/facts independently of fraction eligibility",
    async (scene) => {
      const data = insightFixture(scopeA, scene);
      get.mockResolvedValue({ ok: true, data });
      render(<LearningInsightPanel {...props} />);
      await screen.findByRole("textbox");
      expect(
        screen.getByRole("heading", { name: "저장 계획과 현재 코스 목표" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "보존된 코스 관찰" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          name: "분수 일부 범위의 관계와 확인 후보",
        }),
      ).toBeInTheDocument();
      for (const fact of data.facts.filter((fact) =>
        ["plan-context", "course-goal"].includes(fact.kind),
      ))
        expect(screen.getByText(fact.text)).toBeInTheDocument();
      if (scene === "empty")
        expect(
          screen.getByText(/학습한 적 없음이나 성취 0을 뜻하지 않습니다/),
        ).toBeInTheDocument();
      expect(inquire).not.toHaveBeenCalled();
    },
  );

  it("reveals and focuses the exact generic source citation without mixing pilot numbering", async () => {
    const data = insightFixture();
    get.mockResolvedValue({ ok: true, data });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    await screen.findByRole("textbox");
    const link = screen.getAllByRole("link", { name: /^기록 [123]$/ })[0];
    const targetId = link.getAttribute("href")!.slice(1);
    await user.click(link);
    const target = document.getElementById(targetId)!;
    expect(target).toHaveFocus();
    expect(target.closest("details")).toHaveAttribute("open");
    expect(target.textContent).toContain("보존 세션");
  });

  it.each([
    "duplicate-fact",
    "unknown-fact-source",
    "duplicate-source",
    "nested-digest",
    "nested-context",
  ])(
    "rejects contradictory v2 %s before rendering any records",
    async (kind) => {
      const data = insightFixture();
      if (kind === "duplicate-fact") data.facts.push(data.facts[0]);
      if (kind === "unknown-fact-source")
        data.facts[0].evidenceIds = ["missing"];
      if (kind === "duplicate-source")
        data.observations[0].id = data.pilot.evidence[0].id;
      if (kind === "nested-digest") data.pilot.stateDigest = "f".repeat(64);
      if (kind === "nested-context")
        data.pilot.context!.branchId = scopeB.classId;
      get.mockResolvedValue({ ok: true, data });
      render(<LearningInsightPanel {...props} />);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "일치하지 않습니다",
      );
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    },
  );

  it("rejects forged inquiry prose even with valid fact/evidence IDs", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    const result = inquiryFixture();
    result.facts[0].text = "합성 위조 문장";
    inquire.mockResolvedValue({ ok: true, data: result });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "근거만");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "응답의 근거가 일치하지 않습니다",
    );
    expect(screen.queryByText("합성 위조 문장")).not.toBeInTheDocument();
  });

  it("keeps Shift+Enter and IME Enter as input without invoking the model", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
    render(<LearningInsightPanel {...props} />);
    const field = await screen.findByRole("textbox");
    fireEvent.change(field, { target: { value: "줄바꿈 질문" } });
    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    fireEvent.keyDown(field, { key: "Enter", isComposing: true });
    fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
    expect(inquire).not.toHaveBeenCalled();
  });

  it("handles stale refresh authorization denial without retaining old records or reposting", async () => {
    get.mockResolvedValueOnce({ ok: true, data: insightFixture() });
    get.mockResolvedValue({
      ok: false,
      status: 403,
      message: "현재 조회 권한이 없습니다.",
    });
    inquire.mockResolvedValue({ ok: false, status: 409, message: "기록 변경" });
    const user = userEvent.setup();
    render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "남은 질문");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "현재 조회 권한이 없습니다",
    );
    expect(screen.queryByText(NEXT_CHECK_TITLE)).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("남은 질문");
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(get).toHaveBeenCalledTimes(2);
    expect(inquire).toHaveBeenCalledTimes(1);
  });

  it("refresh cancels an in-flight POST and ignores its late answer while preserving the query", async () => {
    get.mockResolvedValue({ ok: true, data: insightFixture() });
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
    render(<LearningInsightPanel {...props} />);
    await user.type(await screen.findByRole("textbox"), "새로고침할 질문");
    await user.click(
      screen.getByRole("button", { name: "AI에 근거 질문하기" }),
    );
    const signal = inquire.mock.calls[0][4]!;
    await user.click(
      screen.getByRole("button", { name: "학습 근거 새로고침" }),
    );
    expect(signal.aborted).toBe(true);
    await act(async () => finish({ ok: true, data: inquiryFixture() }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("질문에 연결된 근거")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("새로고침할 질문");
  });
});
