import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ElementaryCourseApp from "@/components/math-srs/ElementaryCourseApp";
import { BOOK_CHAPTERS } from "@/lib/math-srs/elementary/bookReference";
import {
  COURSE_CHAPTERS,
  COURSE_SECTIONS,
} from "@/lib/math-srs/elementary/catalog";
import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import {
  createCourseLearner,
  recordCourseAttempt,
  startCourseSession,
} from "@/lib/math-srs/elementary/progress";
import {
  loadCourseStore,
  saveCourseStore,
} from "@/lib/math-srs/elementary/storage";
import { createStore, loadStore, saveStore } from "@/lib/math-srs/storage";

vi.mock("next/dynamic", async () => {
  const { default: ElementaryPractice } =
    await import("@/components/math-srs/ElementaryPractice");
  return { default: () => ElementaryPractice };
});

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const learnerId = createStore().activeLearnerId;

function currentCourse(id = learnerId) {
  const loaded = loadCourseStore();
  expect(loaded.warning).toBeNull();
  return loaded.store.learners[id];
}

function mockCourseServer(serverAheadMs = 0) {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "http://localhost");
    if (url.pathname === "/lab/math-srs/session") {
      return Response.json(
        generateCourseSession(
          url.searchParams.get("sectionId")!,
          Number(url.searchParams.get("seed")),
          new Date(Date.now() + serverAheadMs),
          url.searchParams.get("mode") === "review" ? "review" : "learn",
        ),
      );
    }
    if (url.pathname === "/lab/math-srs/figure") {
      return new Response(
        '<svg viewBox="0 0 100 100"><title>학습 도형</title><path d="M0 0L100 100"/></svg>',
        { headers: { "content-type": "image/svg+xml" } },
      );
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("elementary course app integration", () => {
  it("offers all eight semesters with six chapters and the corresponding book references", async () => {
    const user = userEvent.setup();
    const fetcher = mockCourseServer();
    render(<ElementaryCourseApp />);
    const map = await screen.findByRole("region", { name: "전체 학습 과정" });
    const gradePicker = within(
      screen.getByRole("group", { name: "학년 선택" }),
    );
    const semesterPicker = within(
      screen.getByRole("group", { name: "학기 선택" }),
    );
    for (const grade of [3, 4, 5, 6]) {
      await user.click(
        gradePicker.getByRole("button", { name: `${grade}학년` }),
      );
      for (const semester of [1, 2]) {
        await user.click(
          semesterPicker.getByRole("button", { name: `${semester}학기` }),
        );
        const chapters = COURSE_CHAPTERS.filter(
          (chapter) => chapter.grade === grade && chapter.semester === semester,
        );
        expect(chapters).toHaveLength(6);
        const headings = within(map).getAllByRole("heading", { level: 3 });
        expect(headings).toHaveLength(6);
        for (const [index, chapter] of chapters.entries()) {
          expect(headings[index]).toHaveTextContent(chapter.title);
        }
        const book = BOOK_CHAPTERS[chapters[0].id];
        expect(
          within(map).getByText(/교재 참고 · 큐브수학 개념/),
        ).toHaveTextContent(
          `큐브수학 개념 ${grade}-${semester} · ${book.from}–${book.to}쪽`,
        );
        expect(
          gradePicker.getByRole("button", { name: `${grade}학년` }),
        ).toHaveAttribute("aria-pressed", "true");
        expect(
          semesterPicker.getByRole("button", { name: `${semester}학기` }),
        ).toHaveAttribute("aria-pressed", "true");
      }
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("records a real five-problem session with a future server clock, reloads it, and isolates learner progress", async () => {
    const user = userEvent.setup();
    mockCourseServer(60_000);
    const mounted = render(<ElementaryCourseApp />);
    const before = Date.now();
    await user.click(
      await screen.findByRole("button", { name: "5문제로 학습 시작" }),
    );
    const input = await screen.findByLabelText(/^나의 답/);
    const initial = currentCourse().session!;
    expect(initial.problems).toHaveLength(5);
    expect(Date.parse(initial.startedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(initial.startedAt)).toBeLessThanOrEqual(Date.now());
    await user.type(
      input,
      `${initial.problems[0].answer.replaceAll("$", "")}{Enter}`,
    );
    expect(currentCourse().session?.attempts[0]).toMatchObject({
      correct: true,
      selfAssessed: false,
    });
    const originalSessionId = initial.id;
    mounted.unmount();
    render(<ElementaryCourseApp />);
    await user.click(
      await screen.findByRole("button", { name: "이어서 풀기 · 1/5" }),
    );
    expect(await screen.findByLabelText(/^나의 답/)).toBeInTheDocument();
    expect(currentCourse().session?.id).toBe(originalSessionId);
    expect(
      screen.getByRole("progressbar", { name: "이번 학습 진행" }),
    ).toHaveValue(1);
    await user.click(screen.getByRole("button", { name: "+ 추가" }));
    await user.type(screen.getByLabelText("학습자 이름"), "분리 확인 학생");
    await user.click(screen.getByRole("button", { name: "추가하기" }));
    const otherId = loadStore().store.activeLearnerId;
    expect(otherId).not.toBe(learnerId);
    expect(currentCourse(otherId)).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "5문제로 학습 시작" }));
    await user.click(
      await screen.findByRole("button", { name: "아직 모르겠어요" }),
    );
    expect(currentCourse(otherId).session?.attempts[0].correct).toBe(false);
    expect(currentCourse().session?.attempts[0].correct).toBe(true);
    await user.selectOptions(screen.getByLabelText("학습자"), learnerId);
    expect(
      await screen.findByRole("button", { name: "이어서 풀기 · 1/5" }),
    ).toBeInTheDocument();
    expect(currentCourse().session?.id).toBe(originalSessionId);
  });

  it("preserves the original questions and attempts when moving from section A to B and back", async () => {
    const user = userEvent.setup();
    mockCourseServer();
    render(<ElementaryCourseApp />);
    await user.click(
      await screen.findByRole("button", { name: "5문제로 학습 시작" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "아직 모르겠어요" }),
    );
    const a = currentCourse().session!;
    await user.click(screen.getByRole("button", { name: "학습 목록" }));
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(escape(COURSE_SECTIONS[1].title)),
      }),
    );
    await user.click(
      await screen.findByRole("button", { name: "아직 모르겠어요" }),
    );
    const b = currentCourse().session!;
    expect(currentCourse().pausedSessions?.[a.sectionId]).toEqual(a);
    await user.click(screen.getByRole("button", { name: "학습 목록" }));
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(escape(COURSE_SECTIONS[0].title)),
      }),
    );
    await screen.findByLabelText(/^나의 답/);
    expect(currentCourse().session).toEqual(a);
    expect(currentCourse().pausedSessions?.[b.sectionId]).toEqual(b);
    expect(
      screen.getByRole("progressbar", { name: "이번 학습 진행" }),
    ).toHaveValue(1);
  });

  it("returns to the course home after completing the final section instead of starting it again", async () => {
    const user = userEvent.setup();
    const fetcher = mockCourseServer();
    const startedAt = new Date(Date.now() - 60_000);
    const last = COURSE_SECTIONS.at(-1)!;
    const session = generateCourseSession(last.id, 731, startedAt);
    let state = startCourseSession(createCourseLearner(), session);
    for (const [index, problem] of session.problems.slice(0, 4).entries()) {
      state = recordCourseAttempt(state, {
        problemId: problem.id,
        submittedAnswer: "",
        correct: false,
        usedHint: false,
        selfAssessed: problem.input.mode === "self-check",
        answeredAt: new Date(
          startedAt.getTime() + index * 1000 + 1000,
        ).toISOString(),
      });
    }
    expect(saveStore(createStore()).ok).toBe(true);
    expect(
      saveCourseStore({ version: 1, learners: { [learnerId]: state } }).ok,
    ).toBe(true);
    render(<ElementaryCourseApp />);
    await user.click(
      await screen.findByRole("button", { name: "이어서 풀기 · 4/5" }),
    );
    const finalProblem = session.problems[4];
    if (finalProblem.input.mode === "self-check") {
      const reveal = await screen.findByRole("button", {
        name: "다 풀었어요 · 정답 확인",
      });
      await waitFor(() => expect(reveal).toBeEnabled());
      await user.click(reveal);
      await user.click(screen.getByRole("button", { name: "다시 연습할래요" }));
    } else {
      const giveUp = await screen.findByRole("button", {
        name: "아직 모르겠어요",
      });
      await waitFor(() => expect(giveUp).toBeEnabled());
      await user.click(giveUp);
    }
    await user.click(screen.getByRole("button", { name: "이번 학습 마치기" }));
    expect(
      screen.getByRole("heading", { name: "차근차근, 오늘도 배웠어요." }),
    ).toBeInTheDocument();
    expect(currentCourse().progress[last.id].completedSessions).toBe(1);
    const completedId = currentCourse().session?.id;
    await user.click(screen.getByRole("button", { name: "다음 학습으로" }));
    expect(
      screen.getByRole("heading", { name: "오늘의 기억" }),
    ).toBeInTheDocument();
    expect(currentCourse().session?.id).toBe(completedId);
    expect(
      fetcher.mock.calls.filter(([input]) =>
        String(input).startsWith("/lab/math-srs/session?"),
      ),
    ).toHaveLength(0);
  });
});
