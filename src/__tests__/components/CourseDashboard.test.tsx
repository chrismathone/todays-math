import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CourseDashboard from "@/components/math-srs/CourseDashboard";
import type {
  CourseRosterStudent,
  CourseStudentDetail,
} from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import {
  getCourseDashboard,
  getCourseStudentDetail,
  saveCourseStudentPlan,
} from "@/components/math-srs/courseApi";

vi.mock("@/components/math-srs/courseApi", () => ({
  getCourseDashboard: vi.fn(),
  getCourseStudentDetail: vi.fn(),
  saveCourseStudentPlan: vi.fn(),
}));
vi.mock("@/components/math/ProblemContent", () => ({
  ProblemContent: ({ content }: { content: string }) => <p>{content}</p>,
}));
vi.mock("@/components/math/MathText", () => ({
  MathText: ({ text }: { text: string }) => <span>{text}</span>,
}));

const dashboardApi = vi.mocked(getCourseDashboard);
const detailApi = vi.mocked(getCourseStudentDetail);
const saveApi = vi.mocked(saveCourseStudentPlan);
const first = COURSE_SECTIONS[0];
const second = COURSE_SECTIONS[1];
const timestamp = "2026-09-22T03:00:00.000Z";
function student(
  overrides: Partial<CourseRosterStudent> = {},
): CourseRosterStudent {
  return {
    id: "student-1",
    name: "김하늘",
    classId: "class-1",
    className: "초등 새싹반",
    hasAccount: true,
    revision: 3,
    plan: {
      startSectionId: first.id,
      dailyQuestionCount: 10,
      enabled: true,
      configuredAt: timestamp,
    },
    summary: {
      status: "learning",
      currentSectionId: second.id,
      dueCount: 2,
      todayAnswered: 5,
      todayCorrect: 4,
      todayGoal: 10,
      completedSections: 1,
      lastPracticedAt: timestamp,
      nextReviewAt: timestamp,
      recommendation: {
        sectionId: first.id,
        mode: "review",
        reason: "복습 시점이 되어 다시 풀어요.",
      },
    },
    ...overrides,
  };
}
const learner = student();
const other = student({
  id: "student-2",
  name: "이바다",
  classId: "class-2",
  className: "초등 나무반",
  hasAccount: false,
  plan: null,
  revision: 0,
  summary: {
    ...learner.summary,
    status: "setup",
    currentSectionId: null,
    dueCount: 0,
    todayAnswered: 0,
    todayCorrect: 0,
    lastPracticedAt: null,
    recommendation: null,
  },
});
function detail(row = learner): CourseStudentDetail {
  return {
    student: row,
    sections: [
      {
        sectionId: second.id,
        completedSessions: 2,
        attempts: 10,
        correct: 9,
        unaidedCorrect: 8,
        hinted: 1,
        selfAssessed: 0,
        mastery: 85,
        estimatedRecall: 90,
        stabilityDays: 4.25,
        lastReviewedAt: timestamp,
        nextReviewAt: "2999-01-01T00:00:00.000Z",
      },
      {
        sectionId: first.id,
        completedSessions: 1,
        attempts: 5,
        correct: 2,
        unaidedCorrect: 1,
        hinted: 3,
        selfAssessed: 1,
        mastery: 40,
        estimatedRecall: 32,
        stabilityDays: 1.25,
        lastReviewedAt: timestamp,
        nextReviewAt: "2000-01-01T00:00:00.000Z",
      },
    ],
    activity: [
      {
        date: "2026-09-21",
        answered: 15,
        correct: 12,
        unaidedCorrect: 9,
        hinted: 4,
      },
      {
        date: "2026-09-22",
        answered: 5,
        correct: 4,
        unaidedCorrect: 3,
        hinted: 1,
      },
    ],
    recentSessions: [
      {
        id: "session-1",
        sectionId: first.id,
        mode: "review",
        startedAt: timestamp,
        completedAt: timestamp,
        answered: 5,
        correct: 4,
        hinted: 1,
      },
    ],
    recentAttempts: [
      {
        sessionId: "session-1",
        problemId: "problem-1",
        sectionId: first.id,
        content: "24 + 16은 얼마인가요?",
        submittedAnswer: "41",
        answer: "40",
        solution: "24에 16을 더하면 40입니다.",
        correct: false,
        usedHint: true,
        selfAssessed: false,
        answeredAt: timestamp,
      },
      {
        sessionId: "session-1",
        problemId: "problem-2",
        sectionId: second.id,
        content: "7 × 8은 얼마인가요?",
        submittedAnswer: "56",
        answer: "56",
        solution: "7을 8번 더하면 56입니다.",
        correct: true,
        usedHint: false,
        selfAssessed: true,
        answeredAt: timestamp,
      },
    ],
  };
}
function roster(rows = [learner, other]) {
  dashboardApi.mockResolvedValue({
    ok: true,
    data: {
      classes: [
        { id: "class-1", name: "초등 새싹반" },
        { id: "class-2", name: "초등 나무반" },
      ],
      students: rows,
    },
  });
}
async function openStudent(
  user: ReturnType<typeof userEvent.setup>,
  name = learner.name,
) {
  await user.click(
    await screen.findByRole("button", { name: `${name} 상세 보기` }),
  );
  const panel = screen.getByRole("region", { name: `${name} · 학습 상세` });
  await waitFor(() =>
    expect(
      within(panel).queryByText("상세 기록을 불러오는 중…"),
    ).not.toBeInTheDocument(),
  );
  return within(panel);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
  roster();
  detailApi.mockImplementation(async (id) => ({
    ok: true,
    data: detail(id === other.id ? other : learner),
  }));
});
afterEach(cleanup);

describe("CourseDashboard", () => {
  it("shows all accessible students, honest totals, account link and combined class/name filters", async () => {
    const user = userEvent.setup();
    const finished = student({
      id: "student-3",
      name: "박나래",
      summary: { ...learner.summary, status: "done", todayAnswered: 10 },
    });
    roster([learner, other, finished]);
    render(<CourseDashboard admin />);
    expect(
      await screen.findByRole("heading", { name: "SRS 현황 · 관리자" }),
    ).toBeInTheDocument();
    const table = await screen.findByRole("table", {
      name: "학생별 계정, 학습 진도, 오늘의 진행 상황",
    });
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText(/지원 교육과정 초3–초6/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "계정 확인 필요 · 계정 관리 ↗" }),
    ).toHaveAttribute("href", "/classes/class-2");
    const totals = screen.getByLabelText("전체 학생 학습 요약");
    expect(
      within(totals).getByText("계획 설정").nextElementSibling,
    ).toHaveTextContent("2 / 3명");
    expect(
      within(totals).getByText("설정 필요").nextElementSibling,
    ).toHaveTextContent("1명");
    expect(
      within(totals).getByText("복습 도래").nextElementSibling,
    ).toHaveTextContent("2명");
    expect(
      within(totals).getByText("오늘 종료").nextElementSibling,
    ).toHaveTextContent("1명");
    await user.type(screen.getByRole("searchbox"), "나무");
    expect(
      screen.getByRole("button", { name: "이바다 상세 보기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "김하늘 상세 보기" }),
    ).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox"));
    await user.selectOptions(screen.getByLabelText("반 선택"), "class-1");
    await user.type(screen.getByRole("searchbox"), "나래");
    expect(
      screen.getByRole("button", { name: "박나래 상세 보기" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^설정 필요/ }));
    expect(screen.getByText("조건에 맞는 학생이 없습니다")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "필터 초기화" }));
    await user.click(screen.getByRole("button", { name: /^계정 확인 필요/ }));
    expect(
      within(
        screen.getByRole("table", {
          name: "학생별 계정, 학습 진도, 오늘의 진행 상황",
        }),
      ).getAllByRole("row"),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "이바다 상세 보기" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["setup", "설정 필요"],
    ["paused", "일시정지"],
    ["learning", "학습 중"],
    ["review", "복습 필요"],
    ["ready", "시작 가능"],
    ["done", "오늘 종료"],
    ["complete", "과정 완료"],
  ] as const)(
    "filters the %s status independently of account or due count",
    async (status, label) => {
      const user = userEvent.setup();
      roster([
        student({ summary: { ...learner.summary, status } }),
        student({
          ...other,
          summary: {
            ...other.summary,
            status: status === "setup" ? "done" : "setup",
          },
        }),
      ]);
      render(<CourseDashboard />);
      await screen.findByRole("button", { name: "김하늘 상세 보기" });
      await user.click(
        within(screen.getByRole("group", { name: "학습 상태 필터" })).getByRole(
          "button",
          { name: new RegExp(`^${label}`) },
        ),
      );
      expect(
        screen.getByRole("button", { name: "김하늘 상세 보기" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "이바다 상세 보기" }),
      ).not.toBeInTheDocument();
    },
  );

  it("renders real session, sorted section, daily activity, and answer reports", async () => {
    const user = userEvent.setup();
    render(<CourseDashboard admin />);
    const panel = await openStudent(user);
    expect(panel.getByText(/관리자 보고/)).toBeInTheDocument();
    expect(
      panel.getByText("복습 시점이 되어 다시 풀어요."),
    ).toBeInTheDocument();
    expect(
      panel.getByRole("region", { name: "최근 학습 세션 표" }),
    ).toHaveTextContent("5 / 4 / 1");
    await user.click(panel.getByRole("button", { name: "소단원 분석" }));
    expect(
      panel.getByText(/실제 기억을 측정한 결과가 아닙니다/),
    ).toBeInTheDocument();
    const rows = within(panel.getByRole("table")).getAllByRole("row");
    expect(rows[1]).toHaveTextContent(first.title);
    expect(rows[1]).toHaveTextContent("40% / 32%");
    expect(rows[1]).toHaveTextContent("1 / 3 / 1");
    expect(rows[2]).toHaveTextContent(second.title);
    await user.click(panel.getByRole("button", { name: "일별 활동" }));
    const dayRows = within(panel.getByRole("table")).getAllByRole("row");
    expect(dayRows[1]).toHaveTextContent("2026-09-22");
    expect(
      within(dayRows[2])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["15", "12", "9", "4"]);
    await user.click(panel.getByRole("button", { name: "풀이 기록" }));
    expect(panel.getByText("24 + 16은 얼마인가요?")).toBeInTheDocument();
    expect(panel.getByText("41")).toBeInTheDocument();
    expect(panel.getByText("40")).toBeInTheDocument();
    await user.click(panel.getAllByText("해설 보기")[0]);
    expect(panel.getByText("24에 16을 더하면 40입니다.")).toBeVisible();
    expect(panel.getByText("힌트 사용")).toBeInTheDocument();
    expect(panel.getByText("힌트 없음 · 자기평가")).toBeInTheDocument();
    await user.click(panel.getByRole("checkbox", { name: "오답만 보기" }));
    expect(panel.queryByText("7 × 8은 얼마인가요?")).not.toBeInTheDocument();
    expect(panel.getByText("24 + 16은 얼마인가요?")).toBeInTheDocument();
  });

  it("saves the actual form, updates the row and reloads detail; supports pause and resume", async () => {
    const user = userEvent.setup();
    const paused = student({
      revision: 4,
      plan: { ...learner.plan!, dailyQuestionCount: 15, enabled: false },
      summary: { ...learner.summary, status: "paused", todayGoal: 15 },
    });
    saveApi.mockResolvedValueOnce({ ok: true, data: paused });
    render(<CourseDashboard />);
    const panel = await openStudent(user);
    await user.click(panel.getByRole("button", { name: "학습 설정" }));
    await user.selectOptions(panel.getByLabelText("하루 학습량"), "15");
    await user.click(panel.getByRole("checkbox", { name: "자동 학습 사용" }));
    detailApi.mockResolvedValueOnce({ ok: true, data: detail(paused) });
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    await waitFor(() => expect(detailApi).toHaveBeenCalledTimes(2));
    expect(saveApi).toHaveBeenCalledWith(learner.id, {
      startSectionId: first.id,
      dailyQuestionCount: 15,
      enabled: false,
      expectedRevision: 3,
    });
    await waitFor(() =>
      expect(
        panel.getByRole("button", { name: "학습 계획 저장" }),
      ).toBeEnabled(),
    );
    const row = screen
      .getByRole("button", { name: "김하늘 상세 보기" })
      .closest("tr")!;
    expect(row).toHaveTextContent("일시정지");
    expect(row).toHaveTextContent("5 / 15");
    const resumed = {
      ...paused,
      revision: 5,
      plan: { ...paused.plan!, enabled: true },
    };
    saveApi.mockResolvedValueOnce({ ok: true, data: resumed });
    detailApi.mockResolvedValueOnce({ ok: true, data: detail(resumed) });
    await user.click(panel.getByRole("checkbox", { name: "자동 학습 사용" }));
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    await waitFor(() =>
      expect(saveApi).toHaveBeenLastCalledWith(
        learner.id,
        expect.objectContaining({ enabled: true, expectedRevision: 4 }),
      ),
    );
  });

  it("sets up an accountless student's starting section and links account creation to their class", async () => {
    const user = userEvent.setup();
    render(<CourseDashboard />);
    const panel = await openStudent(user, other.name);
    expect(
      panel.getByRole("link", { name: /계정 확인하러 가기/ }),
    ).toHaveAttribute("href", "/classes/class-2");
    await user.click(panel.getByRole("button", { name: "시작 진도 설정" }));
    await user.selectOptions(panel.getByLabelText("학년"), "3");
    await user.selectOptions(panel.getByLabelText("학기"), "1");
    await user.selectOptions(
      panel.getByLabelText("단원", { exact: true }),
      first.chapterId,
    );
    await user.selectOptions(
      panel.getByLabelText("소단원", { exact: true }),
      first.id,
    );
    const configured = { ...other, revision: 1, plan: learner.plan };
    saveApi.mockResolvedValue({ ok: true, data: configured });
    detailApi.mockResolvedValueOnce({ ok: true, data: detail(configured) });
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    await waitFor(() =>
      expect(saveApi).toHaveBeenCalledWith(
        other.id,
        expect.objectContaining({
          startSectionId: first.id,
          expectedRevision: 0,
        }),
      ),
    );
  });

  it("preserves unsaved choices through 409 reload and retries only with the new revision", async () => {
    const user = userEvent.setup();
    saveApi.mockResolvedValueOnce({
      ok: false,
      status: 409,
      message: "다른 기기에서 변경됨",
    });
    render(<CourseDashboard />);
    const panel = await openStudent(user);
    await user.click(panel.getByRole("button", { name: "학습 설정" }));
    await user.selectOptions(panel.getByLabelText("하루 학습량"), "20");
    await user.selectOptions(
      panel.getByLabelText("소단원", { exact: true }),
      second.id,
    );
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    expect(await panel.findByText("다른 기기에서 변경됨")).toBeInTheDocument();
    expect(saveApi).toHaveBeenCalledTimes(1);
    const revised = student({
      revision: 9,
      plan: { ...learner.plan!, dailyQuestionCount: 5 },
    });
    detailApi.mockResolvedValueOnce({ ok: true, data: detail(revised) });
    await user.click(
      panel.getByRole("button", { name: "최신 기록 불러오기 · 입력 유지" }),
    );
    await waitFor(() =>
      expect(
        panel.getByRole("button", { name: "학습 계획 저장" }),
      ).toBeEnabled(),
    );
    expect(panel.getByLabelText("하루 학습량")).toHaveValue("20");
    expect(panel.getByLabelText("소단원", { exact: true })).toHaveValue(
      second.id,
    );
    await user.click(panel.getByRole("button", { name: "개요" }));
    await user.click(panel.getByRole("button", { name: "학습 설정" }));
    expect(panel.getByLabelText("하루 학습량")).toHaveValue("20");
    saveApi.mockResolvedValueOnce({
      ok: true,
      data: { ...revised, revision: 10 },
    });
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    await waitFor(() =>
      expect(saveApi).toHaveBeenLastCalledWith(learner.id, {
        startSectionId: second.id,
        dailyQuestionCount: 20,
        enabled: true,
        expectedRevision: 9,
      }),
    );
  });

  it("ignores a late detail response after selecting another student and returns focus on Escape", async () => {
    const user = userEvent.setup();
    const pending =
      deferred<Awaited<ReturnType<typeof getCourseStudentDetail>>>();
    detailApi.mockImplementation((id) =>
      id === learner.id
        ? pending.promise
        : Promise.resolve({ ok: true, data: detail(other) }),
    );
    render(<CourseDashboard />);
    await user.click(
      await screen.findByRole("button", { name: "김하늘 상세 보기" }),
    );
    const opener = screen.getByRole("button", { name: "이바다 상세 보기" });
    await user.click(opener);
    const title = screen.getByRole("heading", { name: "이바다 · 학습 상세" });
    expect(title).toHaveFocus();
    await act(async () => {
      pending.resolve({ ok: true, data: detail(learner) });
    });
    const panel = within(
      screen.getByRole("region", { name: "이바다 · 학습 상세" }),
    );
    expect(
      panel.queryByText("복습 시점이 되어 다시 풀어요."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "김하늘 · 학습 상세" }),
    ).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
    expect(
      screen.queryByRole("region", { name: "이바다 · 학습 상세" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a pending save scoped to its original student while another panel is opened", async () => {
    const user = userEvent.setup();
    const pending =
      deferred<Awaited<ReturnType<typeof saveCourseStudentPlan>>>();
    saveApi.mockReturnValueOnce(pending.promise);
    render(<CourseDashboard />);
    const panel = await openStudent(user);
    await user.click(panel.getByRole("button", { name: "학습 설정" }));
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    await openStudent(user, other.name);
    const paused = student({
      revision: 4,
      summary: { ...learner.summary, status: "paused" },
    });
    await act(async () => {
      pending.resolve({ ok: true, data: paused });
    });
    expect(
      screen.getByRole("region", { name: "이바다 · 학습 상세" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "김하늘 상세 보기" }).closest("tr"),
    ).toHaveTextContent("일시정지");
    expect(saveApi).toHaveBeenCalledTimes(1);
    expect(saveApi).toHaveBeenCalledWith(learner.id, expect.anything());
    expect(detailApi.mock.calls.map(([id]) => id)).toEqual([
      learner.id,
      other.id,
    ]);
  });

  it("shows unavailable service rather than pretend empty totals and can retry", async () => {
    const user = userEvent.setup();
    dashboardApi.mockResolvedValueOnce({
      ok: false,
      status: 503,
      message: "저장소 연결을 확인해 주세요.",
    });
    render(<CourseDashboard />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "학습 기록 서비스를 사용할 수 없습니다",
    );
    expect(
      screen.queryByLabelText("전체 학생 학습 요약"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("등록된 학생이 없습니다"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));
    expect(
      await screen.findByRole("button", { name: "김하늘 상세 보기" }),
    ).toBeInTheDocument();
  });

  it("does not let an older roster response overwrite a successful plan save", async () => {
    const user = userEvent.setup();
    const pending = deferred<Awaited<ReturnType<typeof getCourseDashboard>>>();
    const updated = student({
      revision: 4,
      plan: { ...learner.plan!, enabled: false },
      summary: { ...learner.summary, status: "paused" },
    });
    render(<CourseDashboard />);
    const panel = await openStudent(user);
    await user.click(panel.getByRole("button", { name: "학습 설정" }));
    dashboardApi.mockReturnValueOnce(pending.promise);
    await user.click(screen.getByRole("button", { name: "목록 새로고침" }));
    saveApi.mockResolvedValueOnce({ ok: true, data: updated });
    detailApi.mockResolvedValueOnce({ ok: true, data: detail(updated) });
    await user.click(panel.getByRole("checkbox", { name: "자동 학습 사용" }));
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    await waitFor(() => expect(detailApi).toHaveBeenCalledTimes(2));
    await act(async () => {
      pending.resolve({
        ok: true,
        data: { classes: [], students: [learner, other] },
      });
    });
    expect(
      screen.getByRole("button", { name: "김하늘 상세 보기" }).closest("tr"),
    ).toHaveTextContent("일시정지");
  });

  it("counts today's early finish without calling it quota completion", async () => {
    roster([
      student({
        summary: {
          ...learner.summary,
          status: "done",
          todayAnswered: 5,
          todayGoal: 20,
        },
      }),
    ]);
    render(<CourseDashboard />);
    const totals = await screen.findByLabelText("전체 학생 학습 요약");
    expect(
      within(totals).getByText("오늘 종료").nextElementSibling,
    ).toHaveTextContent("1명");
    expect(
      screen.getByRole("button", { name: "김하늘 상세 보기" }).closest("tr"),
    ).toHaveTextContent("5 / 20");
  });

  it("handles an empty accessible roster and an empty detail report", async () => {
    roster([]);
    const { unmount } = render(<CourseDashboard />);
    expect(
      await screen.findByText("등록된 학생이 없습니다"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "반 관리 열기 →" }),
    ).toHaveAttribute("href", "/classes");
    unmount();
    roster();
    detailApi.mockResolvedValue({
      ok: true,
      data: {
        student: learner,
        sections: [],
        activity: [],
        recentSessions: [],
        recentAttempts: [],
      },
    });
    const user = userEvent.setup();
    render(<CourseDashboard />);
    const panel = await openStudent(user);
    expect(panel.getByText("아직 학습 세션이 없습니다.")).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "소단원 분석" }));
    expect(
      panel.getByText("풀이가 쌓이면 소단원별 추정치가 표시됩니다."),
    ).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "일별 활동" }));
    expect(
      panel.getByText("표시할 일별 활동 기록이 없습니다."),
    ).toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "풀이 기록" }));
    expect(panel.getByText("아직 제출한 풀이가 없습니다.")).toBeInTheDocument();
  });

  it("reports detail and save failures without replacing unsaved choices", async () => {
    const user = userEvent.setup();
    detailApi.mockResolvedValueOnce({
      ok: false,
      status: 503,
      message: "기록을 조회할 수 없습니다.",
    });
    render(<CourseDashboard />);
    const panel = await openStudent(user);
    expect(panel.getByRole("alert")).toHaveTextContent(
      "기록을 조회할 수 없습니다.",
    );
    expect(
      panel.queryByRole("region", { name: "학습 개요" }),
    ).not.toBeInTheDocument();
    await user.click(panel.getByRole("button", { name: "상세 새로고침" }));
    await panel.findByText("복습 시점이 되어 다시 풀어요.");
    await user.click(panel.getByRole("button", { name: "학습 설정" }));
    await user.selectOptions(panel.getByLabelText("하루 학습량"), "15");
    saveApi.mockResolvedValueOnce({
      ok: false,
      status: 503,
      message: "계획을 저장하지 못했습니다.",
    });
    await user.click(panel.getByRole("button", { name: "학습 계획 저장" }));
    expect(await panel.findByRole("alert")).toHaveTextContent(
      "계획을 저장하지 못했습니다.",
    );
    expect(panel.getByLabelText("하루 학습량")).toHaveValue("15");
    expect(
      screen.getByRole("button", { name: "김하늘 상세 보기" }).closest("tr"),
    ).toHaveTextContent("5 / 10");
  });
});
