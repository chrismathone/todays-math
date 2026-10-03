import { lazy, Suspense, type ComponentType } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CourseDashboard from "@/components/math-srs/CourseDashboard";
import CurriculumGraphPanel from "@/components/math-srs/CurriculumGraphPanel";
import {
  getCourseDashboard,
  getCourseStudentDetail,
  saveCourseStudentPlan,
} from "@/components/math-srs/courseApi";
import type { PrerequisiteTeacherEvidence } from "@/contracts/mathPrerequisite.contract";
import type { CourseRosterStudent } from "@/contracts/mathSrsCourse.contract";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<{ default: ComponentType }>) => {
    const Component = lazy(loader);
    return function Dynamic(props: object) {
      return (
        <Suspense
          fallback={<p role="status">교육과정 연결도를 불러오는 중…</p>}
        >
          <Component {...props} />
        </Suspense>
      );
    };
  },
}));
vi.mock("@/components/math-srs/courseApi", () => ({
  getCourseDashboard: vi.fn(),
  getCourseStudentDetail: vi.fn(),
  saveCourseStudentPlan: vi.fn(),
}));

const detailApi = vi.mocked(getCourseStudentDetail);
const dashboardApi = vi.mocked(getCourseDashboard);
const saveApi = vi.mocked(saveCourseStudentPlan);
const observed = "2026-09-22T03:00:00.000Z";
const H1_REASONS = {
  return: "분수의 뺄셈 확인 범위를 본 뒤, 분수의 곱셈을 다시 학습해요.",
  fallback: "확인 문제를 준비하지 못해 분수의 곱셈 학습을 이어 갑니다.",
  unavailable: "새 문제를 준비하지 못했어요. 선생님께 알려 주세요.",
  held: "확인 범위를 최근 14일 안에 풀어, 목표를 마치거나 14일이 지날 때까지 그 복습을 미뤄요. 숙달 판정이 아니에요.",
} as const;
const versions = {
  graphSchemaVersion: "1.1.0" as const,
  graphContentHash: "a".repeat(64),
  mappingVersion: 1 as const,
  policyVersion: 1 as const,
};

function evidence(
  context: PrerequisiteTeacherEvidence["context"] = null,
): PrerequisiteTeacherEvidence {
  return {
    source: "completed_elementary_course",
    configuredAt: observed,
    versions,
    heldSectionIds: ["5-1-5-4"],
    holdReason: H1_REASONS.held,
    context,
    sections: [
      {
        unitId: "E56-N04",
        sectionId: "5-2-2-1",
        title: "(분수)×(자연수)의 계산",
        status: "not_passed_recent",
        outcome: "failed",
        independentCorrect: 1,
        independentIncorrect: 2,
        lastObservedAt: observed,
        sourceRetained: true,
        partial: true,
      },
      {
        unitId: "E56-N04",
        sectionId: "5-2-2-2",
        title: "(자연수)×(분수)의 계산",
        status: "unassessed",
        outcome: "unknown",
        independentCorrect: 0,
        independentIncorrect: 0,
        lastObservedAt: null,
        sourceRetained: false,
        partial: true,
      },
      {
        unitId: "E56-N03",
        sectionId: "5-1-5-4",
        title: "대분수의 뺄셈",
        status: "not_passed_recent",
        outcome: "failed",
        independentCorrect: 0,
        independentIncorrect: 2,
        lastObservedAt: observed,
        sourceRetained: true,
        partial: true,
      },
      {
        unitId: "E56-N03",
        sectionId: "5-1-5-3",
        title: "진분수의 뺄셈",
        status: "unassessed",
        outcome: "unknown",
        independentCorrect: 0,
        independentIncorrect: 0,
        lastObservedAt: null,
        sourceRetained: false,
        partial: true,
      },
    ],
  };
}

function detail(
  id: string,
  revision: number,
  name: string,
  prerequisite?: PrerequisiteTeacherEvidence,
) {
  return {
    ok: true as const,
    data: {
      student: { id, revision, name },
      ...(prerequisite ? { prerequisite } : {}),
      sections: [],
      activity: [],
      recentSessions: [],
      recentAttempts: [],
    },
  } as unknown as Awaited<ReturnType<typeof getCourseStudentDetail>>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function candidateCount() {
  const match = screen
    .getByText(/보이는 후보 \d+ \/ \d+/)
    .textContent?.match(/보이는 후보 (\d+) \/ (\d+)/);
  if (!match) throw new Error("후보 수를 찾지 못했습니다.");
  return { shown: Number(match[1]), total: Number(match[2]) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("교육과정 연결도", () => {
  it("lists every unit and keeps supply labels on the pilot units only", async () => {
    const user = userEvent.setup();
    render(<CurriculumGraphPanel id="graph" student={null} />);

    expect(
      screen.getByRole("heading", { name: "단원 100 / 100" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/성취기준 대조는 끝나지 않았습니다/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /E56-N04/ })).toHaveTextContent(
      "문제를 낼 수 있음",
    );
    expect(screen.getByRole("button", { name: /E56-N03/ })).toHaveTextContent(
      "확인 범위",
    );
    expect(
      screen.getByRole("button", { name: /E56-R02/ }),
    ).not.toHaveTextContent("배정하지 않음");
    expect(screen.queryByText(/배정하지 않음/)).not.toBeInTheDocument();
    expect(screen.queryByText(/1\.1\.0/)).not.toBeInTheDocument();
    expect(detailApi).not.toHaveBeenCalled();

    const domain = screen.getByLabelText("영역");
    expect(
      within(domain).queryByRole("option", { name: "융합·응용" }),
    ).not.toBeInTheDocument();
    expect(within(domain).getAllByRole("option")).toHaveLength(5);

    await user.type(screen.getByRole("searchbox"), "이차방정식");
    expect(screen.getByRole("button", { name: /M3-R02/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /E56-N04/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /M3-R02/ }));
    expect(screen.getByText("근의 공식").closest("button")).toBeNull();
    expect(
      screen.getByText(
        /이 시범에서 자동 제시하는 문제 범위를 연결하지 않았습니다/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/낼 문제가 없고/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "선택한 학생의 기록" }),
    ).not.toBeInTheDocument();
  });

  it("opens a related unit outside the filter by resetting the filter", async () => {
    const user = userEvent.setup();
    render(<CurriculumGraphPanel id="graph" student={null} />);
    await user.selectOptions(screen.getByLabelText("학교급"), "elementary");
    await user.click(screen.getByRole("button", { name: /E56-N04/ }));
    expect(
      screen.getByText("5-2-2-1 (분수)×(자연수)의 계산"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /M1-N02/ }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "필터를 초기화하고 연 단원: 정수와 유리수",
    );
    expect(screen.getByLabelText("학교급")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /M1-N02 정수와 유리수/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.queryByRole("button", { name: /시작/ }),
    ).not.toBeInTheDocument();
  });

  it("excludes already checked units from review candidates without saving mastery", async () => {
    const user = userEvent.setup();
    render(<CurriculumGraphPanel id="graph" student={null} />);
    await user.click(screen.getByRole("button", { name: /E56-N04/ }));
    const before = candidateCount();
    expect(before.total).toBeGreaterThan(1);
    expect(before.shown).toBe(before.total);
    await user.click(screen.getAllByRole("checkbox")[0]);
    const after = candidateCount();
    expect(after.total).toBe(before.total);
    expect(after.shown).toBe(before.shown - 1);
    expect(screen.getByText(/숙달로 저장하지 않습니다/)).toBeInTheDocument();
  });

  it("shows help and course relations from the graph, not from topic lists", async () => {
    const user = userEvent.setup();
    render(<CurriculumGraphPanel id="graph" student={null} />);
    await user.type(screen.getByRole("searchbox"), "H-CAL1-02");
    await user.click(screen.getByRole("button", { name: /H-CAL1-02/ }));
    expect(
      screen.getByRole("button", { name: /H-ALG-02/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/학습 순서를 만들지 않습니다/)).toBeInTheDocument();
  });

  it("renders four partial rows and the enabled fallback without a start control", async () => {
    const user = userEvent.setup();
    detailApi.mockResolvedValue(
      detail(
        "student-a",
        4,
        "김하늘",
        evidence({
          kind: "unavailable",
          targetSectionId: "5-2-2-1",
          sectionId: "5-2-2-1",
          reason: H1_REASONS.fallback,
          canStart: true,
          partial: true,
          versions,
        }),
      ),
    );
    render(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-a", revision: 4 }}
      />,
    );
    const records = await screen.findByRole("region", {
      name: "선택한 학생의 기록",
    });
    const items = within(records).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[2]).toHaveTextContent("5-1-5-4");
    expect(items[2]).toHaveTextContent("대분수의 뺄셈");
    expect(items[2]).toHaveTextContent("최근 통과하지 못함");
    expect(items[2]).toHaveTextContent("2026. 9. 22.");
    expect(items[1]).toHaveTextContent("아직 확인하지 않음");
    expect(items[1]).toHaveTextContent("기록 없음");
    expect(items[3]).toHaveTextContent("5-1-5-3");
    expect(items[3]).toHaveTextContent("진분수의 뺄셈");
    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/최근 완료한 5문항 세션 두 번/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(H1_REASONS.held, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(H1_REASONS.fallback)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/같은 탐험 단원 안에서 시작 소단원을 바꾸거나/),
    ).toBeInTheDocument();
    expect(screen.getByText(/자동 선수 확인을 끄면/)).toBeInTheDocument();
    expect(screen.queryByText(/허용된 계획 변경/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/이미 열린 탐험은 그대로 둡니다/),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/단원 숙달이 아닙니다/)).toHaveLength(4);
    expect(screen.queryByText(/1\.1\.0/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /시작/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /E56-N04/ }));
    expect(
      screen.queryByRole("button", { name: /시작/ }),
    ).not.toBeInTheDocument();
  });

  it("shows a supply shortage reason and ignores a stale student response", async () => {
    const pending =
      deferred<Awaited<ReturnType<typeof getCourseStudentDetail>>>();
    detailApi.mockImplementation(() => pending.promise);
    const { rerender } = render(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-a", revision: 5 }}
      />,
    );
    rerender(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-b", revision: 1 }}
      />,
    );
    pending.resolve(
      detail(
        "student-a",
        5,
        "김하늘",
        evidence({
          kind: "unavailable",
          targetSectionId: "5-2-2-1",
          sectionId: null,
          reason: H1_REASONS.unavailable,
          canStart: false,
          partial: true,
          versions,
        }),
      ),
    );
    expect(
      await screen.findByText(/방금 받은 내용을 표시하지 않습니다/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/대분수의 뺄셈/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(H1_REASONS.unavailable)),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /시작/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the shortage reason and a return reason from the frozen DTO", async () => {
    detailApi.mockResolvedValue(
      detail(
        "student-a",
        2,
        "김하늘",
        evidence({
          kind: "unavailable",
          targetSectionId: "5-2-2-1",
          sectionId: null,
          reason: H1_REASONS.unavailable,
          canStart: false,
          partial: true,
          versions,
        }),
      ),
    );
    const { rerender } = render(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-a", revision: 2 }}
      />,
    );
    expect(
      await screen.findByText(new RegExp(H1_REASONS.unavailable)),
    ).toBeInTheDocument();
    expect(screen.getByText(/자동 선수 확인을 끄면/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /시작/ }),
    ).not.toBeInTheDocument();

    detailApi.mockResolvedValue(
      detail(
        "student-a",
        3,
        "김하늘",
        evidence({
          kind: "return",
          targetSectionId: "5-2-2-1",
          sectionId: "5-2-2-1",
          reason: H1_REASONS.return,
          canStart: true,
          partial: true,
          versions,
        }),
      ),
    );
    rerender(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-a", revision: 3 }}
      />,
    );
    expect(
      await screen.findByText(new RegExp(H1_REASONS.return)),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(new RegExp(H1_REASONS.unavailable)),
    ).not.toBeInTheDocument();
  });

  it("drops the previous student on the first paint of the next student", async () => {
    detailApi.mockResolvedValue(
      detail("student-a", 4, "김하늘", evidence(null)),
    );
    const { rerender } = render(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-a", revision: 4 }}
      />,
    );
    expect(await screen.findByText(/김하늘/)).toBeInTheDocument();
    const pending =
      deferred<Awaited<ReturnType<typeof getCourseStudentDetail>>>();
    detailApi.mockImplementation(() => pending.promise);
    rerender(
      <CurriculumGraphPanel
        id="graph"
        student={{ id: "student-b", revision: 1 }}
      />,
    );
    expect(screen.queryByText(/김하늘/)).not.toBeInTheDocument();
    expect(screen.queryByText(/대분수의 뺄셈/)).not.toBeInTheDocument();
    expect(screen.getByText(/학생 기록을 불러오는 중/)).toBeInTheDocument();
  });
});

describe("SRS 현황의 연결도 진입", () => {
  it("loads the graph from the dashboard before a student is chosen", async () => {
    const user = userEvent.setup();
    dashboardApi.mockResolvedValue({
      ok: true,
      data: { classes: [], students: [] },
    });
    render(<CourseDashboard />);
    const entry = screen.getByRole("button", { name: "교육과정 연결도" });
    expect(entry).toHaveAttribute("aria-expanded", "false");
    await user.click(entry);
    expect(
      await screen.findByRole("heading", { name: "단원 100 / 100" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/선택된 학생 없음/)).toBeInTheDocument();
    expect(screen.queryByText("선택된 학생 없음.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "선택한 학생의 기록" }),
    ).not.toBeInTheDocument();
    expect(detailApi).not.toHaveBeenCalled();
    await waitFor(() => expect(entry).toHaveAttribute("aria-expanded", "true"));
  });

  it("refetches graph evidence when a plan save raises the roster revision", async () => {
    const user = userEvent.setup();
    const section = COURSE_SECTIONS[0];
    const row = (revision: number): CourseRosterStudent => ({
      id: "student-1",
      name: "김하늘",
      classId: "class-1",
      className: "초등 새싹반",
      hasAccount: true,
      revision,
      plan: {
        startSectionId: section.id,
        dailyQuestionCount: 10,
        enabled: true,
        configuredAt: observed,
      },
      summary: {
        status: "learning",
        currentSectionId: section.id,
        dueCount: 0,
        todayAnswered: 0,
        todayCorrect: 0,
        todayGoal: 10,
        completedSections: 0,
        lastPracticedAt: null,
        nextReviewAt: null,
        recommendation: null,
      },
    });
    const payload = (
      revision: number,
      context: PrerequisiteTeacherEvidence["context"],
    ) =>
      ({
        ok: true as const,
        data: {
          student: row(revision),
          sections: [],
          activity: [],
          recentSessions: [],
          recentAttempts: [],
          prerequisite: evidence(context),
        },
      }) as unknown as Awaited<ReturnType<typeof getCourseStudentDetail>>;
    let saved = false;
    detailApi.mockImplementation(async () =>
      saved
        ? payload(4, {
            kind: "return",
            targetSectionId: "5-2-2-1",
            sectionId: "5-2-2-1",
            reason: H1_REASONS.return,
            canStart: true,
            partial: true,
            versions,
          })
        : payload(3, {
            kind: "unavailable",
            targetSectionId: "5-2-2-1",
            sectionId: "5-2-2-1",
            reason: H1_REASONS.fallback,
            canStart: true,
            partial: true,
            versions,
          }),
    );
    dashboardApi.mockResolvedValue({
      ok: true,
      data: {
        classes: [{ id: "class-1", name: "초등 새싹반" }],
        students: [row(3)],
      },
    });
    saveApi.mockResolvedValue({ ok: true, data: row(4) });
    render(<CourseDashboard />);
    await user.click(screen.getByRole("button", { name: "교육과정 연결도" }));
    await screen.findByRole("heading", { name: "단원 100 / 100" });
    await user.click(
      await screen.findByRole("button", { name: "김하늘 상세 보기" }),
    );
    const records = await screen.findByRole("region", {
      name: "선택한 학생의 기록",
    });
    expect(
      await within(records).findByText(new RegExp(H1_REASONS.fallback)),
    ).toBeInTheDocument();
    saved = true;
    await user.click(screen.getByRole("button", { name: "학습 설정" }));
    await user.click(screen.getByRole("button", { name: "학습 계획 저장" }));
    expect(
      await within(records).findByText(new RegExp(H1_REASONS.return)),
    ).toBeInTheDocument();
    expect(
      within(records).queryByText(new RegExp(H1_REASONS.fallback)),
    ).not.toBeInTheDocument();
  });
});
