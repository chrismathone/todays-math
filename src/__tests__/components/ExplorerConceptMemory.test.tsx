import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import ExplorerConceptMemory from "@/components/math-explorers/ExplorerConceptMemory";
import { createLocalFadingSource } from "@/lib/fading/local";
import { fadingTargets, type FadingConcept } from "@/lib/fading/concepts";
import { FadingSourceError, type FadingSource } from "@/lib/fading/source";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import type {
  FadingDailyActivity,
  FadingDailyPlan,
} from "@/contracts/fadingDaily.contract";
import * as apiSource from "@/components/fading/apiSource";
import { STUDENT_CHANGED_MESSAGE } from "@/lib/studentRouteAccess";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));

const today = "2026-10-07";
const concept: FadingConcept = {
  id: "explorer-memory-test",
  section: "중2::도형::삼각형",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: ["수직이등분선", "외심", "반지름"].map((text, index) => ({
    id: `memory-p${index}`,
    term: `삼각형 성질 ${index + 1}`,
    kind: "정의",
    pieces: [
      { kind: "text", text: `성질 ${index + 1}의 핵심은 ` },
      {
        kind: "target",
        target: { id: `memory-p${index}#1`, text, tier: "text" },
      },
      { kind: "text", text: "입니다." },
    ],
  })),
};

function local() {
  const source = createLocalFadingSource({
    concepts: [concept],
    today,
    cards: true,
  });
  // Keep testing sources that provide only the original four methods.
  return { ...source, dailyPlan: undefined };
}

function suppliedPlan(activities?: FadingDailyActivity[]): FadingDailyPlan {
  const planned: FadingDailyActivity[] = activities ?? [
    {
      kind: "recall",
      key: "recall:first",
      bucket: "prerequisite",
      slots: 3,
      done: 0,
      state: "todo",
      reason: {
        code: "prerequisite-unassessed",
        text: "다음 탐험 전에 필요한 개념을 확인해요.",
      },
      unit: "recall",
      prompts: 3,
      conceptId: concept.id,
      section: concept.section,
      terms: ["삼각형 선수 개념"],
      step: null,
      rated: false,
      risk: null,
      daysUntil: null,
      start: "pick-open",
    },
    {
      kind: "practice",
      key: "practice:today",
      bucket: "progress",
      slots: 10,
      done: 0,
      state: "todo",
      reason: { code: "progress-practice", text: "현재 진도의 문제를 풀어요." },
      unit: "question",
      count: 10,
      answered: 0,
      retryRemaining: 0,
      source: {
        kind: "elementary",
        route: "bank",
        unitId: "e3-multiply",
        title: "곱셈",
        subtitle: "초등 3학년",
        selection: "expedition",
      },
      start: "start",
    },
  ];
  return {
    version: 1,
    today,
    mode: "split",
    quota: { total: 20, source: "default", over: 0 },
    shares: { review: 0, prerequisite: 3, progress: 10 },
    counts: { total: 13, done: 0, remaining: 13 },
    buckets: {
      review: { planned: 0, done: 0 },
      prerequisite: { planned: 3, done: 0 },
      progress: { planned: 10, done: 0 },
    },
    units: {
      recall: { planned: 1, done: 0 },
      prompt: { planned: 3, done: 0 },
      question: { planned: 10, done: 0 },
      task: { planned: 0, done: 0 },
    },
    activities: planned,
    next: planned[0]?.key ?? null,
    status: "todo",
    shortfall: [],
    held: { recalls: 7, prompts: 21 },
    integration: { expedition: true },
    prerequisite: {
      target: {
        title: "곱셈",
        explorerUnitId: "e3-multiply",
        courseSectionId: null,
        sectionKey: null,
        graphUnitId: null,
        cardIds: [],
      },
      coverage: { status: "partial", cardLinks: 1, graphEdges: 0 },
      links: [
        {
          via: "card-link",
          reason: null,
          prerequisite: {
            title: "덧셈",
            cardId: "addition",
            graphUnitId: null,
            courseSectionIds: [],
            sectionKeys: [],
          },
          mapping: "unmapped",
          conceptIds: [],
          evidence: {
            fading: { status: "weak", total: 1, rated: 1, weak: 1, stale: 0 },
            card: { status: "recent" },
            course: { status: "unknown" },
          },
        },
      ],
    },
  };
}
function explorer(): ExplorerState {
  return {
    ...explorerView(createExplorerState("memory-student", 3), today),
    student: { id: "memory-student", name: "학생", className: "테스트반" },
    revision: 0,
    feedback: null,
  };
}
function isolated(source?: FadingSource) {
  return render(
    <StudentMathExplorers
      conceptMemoryEnabled
      fadingSource={source}
      initialState={explorer()}
      preview
    />,
  );
}
async function atFour() {
  const source = local();
  await source.act({ action: "pick", conceptId: concept.id });
  const opened = await source.act({ action: "open", conceptId: concept.id });
  const ref = { conceptId: concept.id, sessionId: opened.session!.id };
  await source.act({ action: "read", ...ref, seen: "123" });
  for (const step of [2, 3] as const)
    await source.act({
      action: "step",
      ...ref,
      step,
      placements: [],
      gaveUp: true,
    });
  return { source, ref };
}
async function exit() {
  fireEvent.click(screen.getByRole("button", { name: "풀이 나가기" }));
  const dialog = await screen.findByRole("dialog", { name: "잠시 나갈까요" });
  fireEvent.click(within(dialog).getByRole("button", { name: "나가기" }));
  await screen.findByRole("heading", { name: "개념을 떠올려 볼까요?" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Preview must never call the API");
    }),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Explorer concept memory inside the old shell", () => {
  it.each(["state", "daily"] as const)(
    "fences the API source and remounts after a changed login reported by %s",
    async (origin) => {
      const original = explorer();
      const changed: ExplorerState = {
        ...explorerView(createExplorerState("next-student", 3), today),
        student: {
          id: "next-student",
          name: "다음 학생",
          className: "다음 반",
        },
        revision: 5,
        feedback: null,
      };
      const rejectedLocal = local();
      const rejected: FadingSource =
        origin === "daily"
          ? {
              ...rejectedLocal,
              dailyPlan: vi.fn(async () => {
                throw new FadingSourceError(
                  "CONFLICT",
                  STUDENT_CHANGED_MESSAGE,
                  409,
                );
              }),
            }
          : rejectedLocal;
      if (origin === "state")
        vi.spyOn(rejected, "state").mockRejectedValue(
          new FadingSourceError("CONFLICT", STUDENT_CHANGED_MESSAGE, 409),
        );
      const current = local();
      const factory = vi
        .spyOn(apiSource, "createApiFadingSource")
        .mockImplementation((options) =>
          options?.studentId === original.student.id ? rejected : current,
        );
      const fetchState = vi.fn(
        async () =>
          new Response(JSON.stringify({ data: changed }), { status: 200 }),
      );
      vi.stubGlobal("fetch", fetchState);
      render(
        <StudentMathExplorers conceptMemoryEnabled initialState={original} />,
      );
      await screen.findByRole("heading", { name: "개념을 떠올려 볼까요?" });
      await waitFor(() =>
        expect(factory).toHaveBeenCalledWith({ studentId: changed.student.id }),
      );
      expect(factory).toHaveBeenCalledWith({ studentId: original.student.id });
      expect(fetchState).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/다음 학생 · 다음 반/)).toBeInTheDocument();
      expect(rejectedLocal.snapshot().concepts).toEqual({});
    },
  );

  it("runs the actual local daily planner from first activity to persisted resume inside the explorer", async () => {
    const source = createLocalFadingSource({
      concepts: [concept],
      today,
      cards: true,
      daily: { quota: 20, progressSections: [concept.section] },
    });
    const planned = await source.dailyPlan();
    const actions = vi.spyOn(source, "act");
    const original = explorer();
    const before = structuredClone(original);
    render(
      <StudentMathExplorers
        conceptMemoryEnabled
        fadingSource={source}
        initialState={original}
        preview
      />,
    );
    const region = await screen.findByRole("region", {
      name: "오늘의 자동 학습 계획",
    });
    expect(planned.units.prompt.planned).toBe(3);
    expect(
      within(region).getByText(
        `기본 분량 ${planned.counts.done} / ${planned.quota.total}개 · 오늘 배정 ${planned.counts.total}개`,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      within(region).getByRole("button", { name: "오늘 학습 시작" }),
    );
    await screen.findByRole("button", { name: "문장 보기" });
    expect(actions.mock.calls.map(([action]) => action.action)).toEqual([
      "open",
    ]);
    expect((await source.state()).session?.conceptId).toBe(concept.id);
    await exit();
    const next = await screen.findByRole("button", { name: "다음 활동" });
    await waitFor(() => expect(next).toBeEnabled());
    fireEvent.click(next);
    await screen.findByRole("button", { name: "풀이 나가기" });
    expect(actions).toHaveBeenCalledTimes(1);
    expect(original).toEqual(before);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the supplied daily next activity and distinct counts instead of inventing a question quota", async () => {
    const source = { ...local(), dailyPlan: vi.fn(async () => suppliedPlan()) };
    const actions = vi.spyOn(source, "act");
    const { container } = isolated(source);
    const plan = await screen.findByRole("region", {
      name: "오늘의 자동 학습 계획",
    });
    expect(
      within(plan).getByText("기본 분량 0 / 20개 · 오늘 배정 13개"),
    ).toBeInTheDocument();
    expect(within(plan).getByText("0 / 1묶음")).toBeInTheDocument();
    expect(within(plan).getAllByText("0 / 3문장")).toHaveLength(2);
    expect(within(plan).getAllByText("0 / 10문제").length).toBeGreaterThan(0);
    expect(
      within(plan).getByText(/복습할 개념 7묶음 · 21문장이 남아/),
    ).toBeInTheDocument();
    const oldStart = screen.getByRole("button", { name: /탐험 문제 시작/ });
    expect(oldStart.className).not.toContain("primary");
    fireEvent.click(within(plan).getByText("선수 개념 살펴보기"));
    expect(
      within(plan).getByText(
        /개념 기억: 다시 확인할 부분 · 탐험 카드: 최근 기록 있음 · 문제 풀이: 확인할 근거 없음/,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      within(plan).getByRole("button", { name: "오늘 학습 시작" }),
    );
    await screen.findByRole("button", { name: "문장 보기" });
    expect(actions.mock.calls.map(([action]) => action.action)).toEqual([
      "open",
    ]);
    expect(
      container.querySelector('[data-explorer-concept-session="true"]'),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("gates a whole explorer block when the supplied plan says it is blocked", async () => {
    const plan = suppliedPlan();
    const practice = plan.activities[1];
    if (practice.kind !== "practice")
      throw new Error("Expected practice fixture");
    practice.state = "blocked";
    practice.start = "none";
    practice.reason = {
      code: "blocked",
      text: "이 문제 묶음은 오늘 남은 분량에 들어가지 않아요.",
    };
    const source = { ...local(), dailyPlan: vi.fn(async () => plan) };
    render(
      <StudentMathExplorers
        conceptMemoryEnabled
        fadingSource={source}
        initialState={explorer()}
      />,
    );
    await screen.findByRole("region", { name: "오늘의 자동 학습 계획" });
    expect(
      screen.getByRole("button", { name: /탐험 문제 시작/ }),
    ).toBeDisabled();
    expect(
      screen.getAllByText("이 문제 묶음은 오늘 남은 분량에 들어가지 않아요.")
        .length,
    ).toBeGreaterThan(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["bank", "expedition-start"],
    ["repair", "retry-unresolved"],
  ] as const)(
    "dispatches a library supplied old %s block through its existing action after syncing revision",
    async (route, action) => {
      const plan = suppliedPlan();
      const practice = plan.activities[1];
      if (practice.kind !== "practice")
        throw new Error("Expected practice fixture");
      practice.source.route = route;
      plan.next = plan.activities[1].key;
      const source = { ...local(), dailyPlan: vi.fn(async () => plan) };
      const original = explorer();
      const requests: { expectedRevision: number; action: { type: string } }[] =
        [];
      const api = vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.body) requests.push(JSON.parse(String(options.body)));
        return new Response(
          JSON.stringify({ data: { ...original, revision: 9 } }),
          { status: 200 },
        );
      });
      vi.stubGlobal("fetch", api);
      render(
        <StudentMathExplorers
          conceptMemoryEnabled
          fadingSource={source}
          initialState={original}
        />,
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "오늘 학습 시작" }),
      );
      await waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0]).toMatchObject({
        expectedRevision: 9,
        action: { type: action },
      });
      expect(api).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps the old mission, journey and tools while the local preview never fetches", async () => {
    const source = local();
    const { container } = isolated(source);
    await screen.findByRole("button", { name: "배울 개념 고르기" });
    expect(
      container.querySelector('[data-expedition-mission="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-explorer-home-part="journey"]'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /오늘의 탐험 시작/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "도감" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "우리 기지" }));
    expect(screen.getByRole("button", { name: /기지 키우기/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "우리 기지 닫기" }));
    expect(fetch).not.toHaveBeenCalled();
    expect(
      container.querySelector("[data-fading-viewport]"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "오늘의 기억 메뉴" }),
    ).not.toBeInTheDocument();
  });

  it("does not read concept data when the server availability prop is off", async () => {
    const source = local();
    const stateRead = vi.spyOn(source, "state");
    render(
      <StudentMathExplorers
        fadingSource={source}
        initialState={explorer()}
        preview
      />,
    );
    await screen.findByRole("button", { name: /오늘의 탐험 시작/ });
    expect(stateRead).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("heading", { name: "개념을 떠올려 볼까요?" }),
    ).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a local source in preview and never falls back to the production API", async () => {
    isolated();
    await screen.findByText("미리 보기용 개념 자료를 준비해 주세요.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("selects a real catalog concept, opens the shared recall screen inline, and returns keyboard focus", async () => {
    const source = local();
    const actions = vi.spyOn(source, "act");
    const { container } = isolated(source);
    fireEvent.click(
      await screen.findByRole("button", { name: "배울 개념 고르기" }),
    );
    const choose = await screen.findByRole("button", {
      name: /삼각형 성질 1.*선택하고 시작/,
    });
    choose.focus();
    fireEvent.click(choose);
    await screen.findByRole("button", { name: "문장 보기" });
    expect(actions.mock.calls.map(([action]) => action.action)).toEqual([
      "pick",
      "open",
    ]);
    expect(
      container.querySelector('[data-explorer-concept-session="true"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-explorer-home="true"]'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^칩 / }),
    ).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
    await exit();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "개념 풀이 이어하기" }),
      ).toHaveFocus(),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resumes typed recall without posting an open action and leaves old credits untouched after rating", async () => {
    const { source } = await atFour();
    const actions = vi.spyOn(source, "act");
    const original = explorer();
    const before = structuredClone(original);
    const { container } = render(
      <StudentMathExplorers
        conceptMemoryEnabled
        fadingSource={source}
        initialState={original}
        preview
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "개념 풀이 이어하기" }),
    );
    const input = await screen.findByRole("textbox", { name: /빈칸 답 입력/ });
    expect(actions).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-fading-mode="cards"]'),
    ).toHaveAttribute("data-step", "4");
    expect(
      screen.queryByRole("button", { name: /^칩 / }),
    ).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: "틀린 답" } });
    fireEvent.submit(input.closest("form")!);
    for (let index = 0; index < concept.propositions.length; index++) {
      const giveUp = screen.queryByRole("button", { name: "아직 모르겠어요" });
      if (!giveUp) break;
      fireEvent.click(giveUp);
    }
    await screen.findByText(/4단계를 마쳤어요/);
    for (let index = 0; index < concept.propositions.length; index++) {
      const different = screen.queryByRole("button", {
        name: "다름",
      });
      if (different) fireEvent.click(different);
      fireEvent.click(
        screen.queryByRole("button", { name: "다음 문장 대조" }) ??
          screen.getByRole("button", { name: "대조 마치기" }),
      );
    }
    fireEvent.click(screen.getByRole("button", { name: /^다시/ }));
    await screen.findByRole("heading", { name: "풀이를 마쳤어요" });
    fireEvent.click(screen.getByRole("button", { name: "오늘의 복습으로" }));
    await screen.findByRole("heading", { name: "개념을 떠올려 볼까요?" });
    const final = await source.state();
    expect(final.summary.todayCount.fresh).toBe(1);
    expect(screen.getByText(/다음 복습은 2026-10-08/)).toBeInTheDocument();
    expect(original).toEqual(before);
    expect(original.completedDays).toEqual(before.completedDays);
    expect(original.profile.stars).toBe(before.profile.stars);
    expect(fetch).not.toHaveBeenCalled();
    expect(
      actions.mock.calls.filter(([action]) => action.action === "rate"),
    ).toHaveLength(1);
  });

  it("offers a future concept as unrecorded practice and sends no pick/open or schedule write", async () => {
    const { source, ref } = await atFour();
    await source.act({
      action: "step",
      ...ref,
      step: 4,
      placements: fadingTargets(concept).map((target) => ({
        targetId: target.id,
        text: target.text,
      })),
    });
    await source.act({
      action: "rate",
      ...ref,
      rating: "good",
      requestId: crypto.randomUUID(),
    });
    const snapshot = source.snapshot();
    const actions = vi.spyOn(source, "act");
    isolated(source);
    fireEvent.click(
      await screen.findByRole("button", { name: "배울 개념 고르기" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /삼각형 성질 1.*연습하기/ }),
    );
    await screen.findByRole("button", { name: "모르겠어요" });
    await exit();
    expect(actions).not.toHaveBeenCalled();
    expect(source.snapshot()).toEqual(snapshot);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rereads the shared explorer revision before the next old action without crediting concept results", async () => {
    const { source } = await atFour();
    const original = explorer();
    const latest = { ...original, revision: 7 };
    const requests: { expectedRevision: number; action: { type: string } }[] =
      [];
    const api = vi.fn(async (url: string, options?: RequestInit) => {
      expect(url).toBe("/api/learn/math-explorers");
      if (options?.body) requests.push(JSON.parse(String(options.body)));
      return new Response(JSON.stringify({ data: latest }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", api);
    render(
      <StudentMathExplorers
        conceptMemoryEnabled
        fadingSource={source}
        initialState={original}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "개념 풀이 이어하기" }),
    );
    await screen.findByRole("button", { name: "풀이 나가기" });
    await exit();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    expect(requests).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /오늘의 탐험 시작/ }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      expectedRevision: 7,
      action: { type: "expedition-start" },
    });
    expect(latest.profile.stars).toBe(original.profile.stars);
    expect(latest.completedDays).toEqual(original.completedDays);
  });

  it("recovers a content conflict by rereading state without replaying an old request", async () => {
    const { source } = await atFour();
    let reads = 0;
    const ready = await source.state();
    const stale = { ...ready, session: null, opened: null };
    const wrapped: FadingSource = {
      ...source,
      state: vi.fn(async () => (++reads === 1 ? stale : ready)),
      act: vi.fn(async () => {
        throw new FadingSourceError("CONFLICT", "풀이 내용이 바뀌었어요.", 409);
      }),
    };
    render(
      <ExplorerConceptMemory
        source={wrapped}
        renderHome={(memory) => <div>{memory}</div>}
      />,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "오늘 개념 복습 시작" }),
    );
    await screen.findByRole("button", { name: "개념 풀이 이어하기" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "풀이 내용이 바뀌었어요.",
    );
    expect(wrapped.act).toHaveBeenCalledTimes(1);
    expect(wrapped.state).toHaveBeenCalledTimes(2);
  });

  it("keeps the old home available when concept loading fails and permits a read retry", async () => {
    const source = local();
    const read = vi
      .spyOn(source, "state")
      .mockRejectedValueOnce(
        new FadingSourceError("OFFLINE", "연결이 끊겼어요.", 0),
      );
    isolated(source);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("연결이 끊겼어요.");
    expect(screen.getByRole("button", { name: "도감" })).toBeEnabled();
    fireEvent.click(
      within(alert).getByRole("button", { name: "개념 자료 다시 불러오기" }),
    );
    await screen.findByRole("button", { name: "배울 개념 고르기" });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retries a failed open catalog as well as state so the selector becomes usable", async () => {
    const source = local();
    const catalog = vi
      .spyOn(source, "catalog")
      .mockRejectedValueOnce(
        new FadingSourceError("OFFLINE", "목록을 불러오지 못했어요.", 0),
      );
    isolated(source);
    fireEvent.click(
      await screen.findByRole("button", { name: "배울 개념 고르기" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("목록을 불러오지 못했어요.");
    fireEvent.click(
      within(alert).getByRole("button", { name: "개념 자료 다시 불러오기" }),
    );
    expect(
      await screen.findByRole("button", {
        name: /삼각형 성질 1.*선택하고 시작/,
      }),
    ).toBeEnabled();
    expect(catalog).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });
});
