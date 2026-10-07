// D-144 · 05 §8.20 — 한 칸 별 · 끝없는 기지가 학생 화면에 보이는 모양(Hi-fi 2안, 3자 합의).
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import {
  applyExplorerAction,
  createExplorerState,
  explorerView,
} from "@/lib/math-explorers/engine";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import type {
  ExpeditionMission,
  ExpeditionPlan,
} from "@/contracts/mathExpedition.contract";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/components/math-explorers/ExplorerBankActivity", () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <section aria-label="은행 활동">
      <button onClick={onComplete}>은행 완료</button>
    </section>
  ),
}));

const now = "2026-09-26";
const student = { id: "student-ui", name: "학생", className: "테스트반" };
const plan = (kind: ExpeditionPlan["kind"] = "elementary"): ExpeditionPlan => ({
  kind,
  route: kind === "explorers" ? "unit" : "bank",
  unitId: "e3-multiply",
  title: "곱셈",
  subtitle: "초등 3학년",
  goal: kind === "explorers" ? 15 : 10,
});
const mission = (
  kind: ExpeditionPlan["kind"] = "elementary",
  complete = false,
): ExpeditionMission => ({
  ...plan(kind),
  id: "00000000-0000-4000-8000-000000000001",
  date: now,
  answered: complete ? plan(kind).goal : 0,
  retryRemaining: 0,
  status: complete ? "complete" : "active",
  sourceSessionId: "source",
  sourceSessionIds: ["source"],
  startedAt: `${now}T00:00:00.000Z`,
  completedAt: complete ? `${now}T09:00:00.000Z` : null,
});
function view(
  profile: Partial<ExplorerState["profile"]> = {},
  expedition: Partial<NonNullable<ExplorerState["expedition"]>> = {},
): ExplorerState {
  const base = explorerView(createExplorerState(student.id, 3), now);
  return {
    ...base,
    profile: { ...base.profile, ...profile },
    student,
    revision: 0,
    feedback: null,
    expedition: {
      mission: null,
      next: plan(),
      completedToday: false,
      canStart: true,
      ...expedition,
    },
  };
}
const completed = (
  todayStars = { cards: 0, bonus: 3 },
  profile: Partial<ExplorerState["profile"]> = { stars: 3, earned: 3 },
) =>
  view(profile, {
    mission: mission("elementary", true),
    next: null,
    completedToday: true,
    canStart: false,
    todayStars,
  });
/** 화면 읽기가 듣는 글자 — `aria-hidden` 가지를 뺀 글자 */
function spoken(element: Element) {
  const copy = element.cloneNode(true) as Element;
  copy
    .querySelectorAll('[aria-hidden="true"]')
    .forEach((node) => node.remove());
  return copy.textContent!.replace(/\s+/g, " ").trim();
}
const effectOf = (text: Element) => text.closest('[role="status"]')!;
const response = (data: unknown) =>
  new Response(JSON.stringify({ data }), { status: 200 });
function home(state: ExplorerState) {
  const onAction = vi.fn();
  render(
    <ExplorerHome
      state={state}
      busy={false}
      onAction={onAction}
      onStart={vi.fn()}
      onResume={vi.fn()}
      onRetry={vi.fn()}
      onInspect={vi.fn()}
      onReviewDay={vi.fn()}
    />,
  );
  return { onAction };
}

beforeEach(() => {
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
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("today's tile stars on the home card", () => {
  it("shows the stars the finished tile gave, next to the completion line", () => {
    home(completed());
    const line = screen.getByText(/한 칸 전진했어요/);
    // 눈에는 «✦+3», 화면 읽기에는 «별 3개»(role 없는 span 의 aria-label 은 읽히지 않는다)
    expect(line).toHaveTextContent("✦+3");
    expect(spoken(line)).toBe(
      "한 칸 전진했어요. 별 3개 다음 탐험은 내일 열려요.",
    );
    expect(line.querySelector("[aria-label]")).toBeNull();
    // 은행 날처럼 한 칸 보장만이면 내역 줄은 없다
    expect(line).not.toHaveTextContent("한 칸 보장");
  });

  it("adds a small breakdown only when card levels and the tile floor both gave stars", () => {
    home(completed({ cards: 2, bonus: 1 }));
    const line = screen.getByText(/한 칸 전진했어요/);
    expect(spoken(line)).toContain("별 3개");
    expect(spoken(line)).toContain("카드 2 · 한 칸 보장 1");
  });

  it("says nothing about stars for a tile awarded before D-144", () => {
    const state = completed();
    delete state.expedition!.todayStars;
    home(state);
    expect(screen.getByText(/한 칸 전진했어요/)).not.toHaveTextContent("✦");
  });
});

describe("the base keeps growing", () => {
  it("shows the collected stars on the base button, and nothing when there are none", () => {
    home(view({ stars: 8 }));
    const button = screen.getByRole("button", { name: "우리 기지, 모은 별 8" });
    expect(button).toHaveTextContent("✦ 8");
    document.body.innerHTML = "";
    home(view({ stars: 0 }));
    expect(
      screen.getByRole("button", { name: "우리 기지" }),
    ).not.toHaveTextContent("✦");
  });

  it("asks 12 stars for every stage after the third and says how many are missing", () => {
    home(view({ level: 5, stars: 8, earned: 60 }));
    fireEvent.click(screen.getByRole("button", { name: /우리 기지/ }));
    const sheet = screen.getByRole("dialog", { name: "우리 기지" });
    expect(within(sheet).getByText("5단계")).toBeVisible();
    expect(
      within(sheet).getByRole("heading", { name: "빛나는 수학 기지" }),
    ).toBeVisible();
    expect(
      within(sheet).getByRole("button", { name: "기지 키우기 · ✦ 12" }),
    ).toBeDisabled();
    expect(
      within(sheet).getByText("별 4개를 더 모으면 6단계예요."),
    ).toBeVisible();
  });

  it("never stops at «성장 완료» — a third-stage base with enough stars grows again", () => {
    const { onAction } = home(view({ level: 3, stars: 20, earned: 41 }));
    fireEvent.click(screen.getByRole("button", { name: /우리 기지/ }));
    const sheet = screen.getByRole("dialog", { name: "우리 기지" });
    expect(within(sheet).queryByText("성장 완료")).not.toBeInTheDocument();
    expect(within(sheet).queryByText(/더 모으면/)).not.toBeInTheDocument();
    fireEvent.click(
      within(sheet).getByRole("button", { name: "기지 키우기 · ✦ 12" }),
    );
    expect(onAction).toHaveBeenCalledWith({ type: "upgrade" });
  });
});

describe("tile reward moment", () => {
  it("plays once after a bank day, leaves after 1.2 s and stays away through upgrades and chests", async () => {
    const initial = view();
    const active = view({}, { mission: mission("elementary"), next: null });
    const done = completed();
    done.chests = done.chests.map((chest, index) =>
      index === 0 ? { ...chest, solved: chest.after, ready: true } : chest,
    );
    const grown = { ...done, profile: { ...done.profile, level: 1, stars: 0 } };
    const opened = {
      ...grown,
      profile: { ...grown.profile, stars: 1, earned: 4 },
      chests: grown.chests.map((chest, index) =>
        index === 0 ? { ...chest, claimed: true } : chest,
      ),
      feedback: {
        chestId: grown.chests[0]!.id,
        stars: 1,
        message: "보상상자에서 별 1개를 얻었어!",
      },
    };
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        if (options?.body) {
          const type = JSON.parse(options.body as string).action.type;
          return response(
            type === "upgrade" ? grown : type === "chest" ? opened : active,
          );
        }
        reads++;
        return response(reads === 1 ? initial : done);
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "은행 완료" }));
    const effect = effectOf(await screen.findByText("오늘의 한 칸"));
    // 퍼지는 별은 화면 읽기에서 뺀다 — «오늘의 한 칸 · 별 +3» 만 읽힌다
    expect(spoken(effect)).toBe("오늘의 한 칸별 +3");
    expect(effect).not.toHaveTextContent("!");
    const shownAt = Date.now();
    await waitFor(
      () => expect(screen.queryByText("오늘의 한 칸")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(Date.now() - shownAt).toBeGreaterThanOrEqual(1000);
    // 칸이 이미 있는 화면의 다음 상태들 — 기지 키우기 · 상자 열기에서는 다시 안 뜬다
    fireEvent.click(screen.getByRole("button", { name: /^우리 기지/ }));
    const sheet = screen.getByRole("dialog", { name: "우리 기지" });
    fireEvent.click(
      within(sheet).getByRole("button", { name: "기지 키우기 · ✦ 3" }),
    );
    expect(await within(sheet).findByText("1단계")).toBeVisible();
    expect(screen.queryByText("오늘의 한 칸")).not.toBeInTheDocument();
    fireEvent.click(
      within(sheet).getAllByRole("button", { name: /열고 별 1개 받기/ })[0]!,
    );
    expect(await screen.findByText("보물 발견!")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByText("오늘의 한 칸")).not.toBeInTheDocument();
  });

  it("plays after the last concept answer's feedback, then not again when the home reloads", async () => {
    // 개념 세션을 엔진으로 마지막 한 문제 전까지 풀어 둔다
    let stored = createExplorerState(student.id, 3);
    const unitId = explorerView(stored, now).units.find(
      (unit) => unit.grade === 3,
    )!.id;
    const act = (value: Parameters<typeof applyExplorerAction>[1]) =>
      applyExplorerAction(stored, value, now, crypto.randomUUID());
    stored = act({ type: "start", route: "unit", unitId }).state;
    const correct = () => {
      const activity = explorerView(stored, now).currentActivity!;
      if (activity.kind === "read")
        return {
          value: { type: "read" as const, questionId: activity.questionId },
          label: "",
        };
      const card = definitionCard(activity.cardId);
      const labels =
        activity.kind === "assemble"
          ? card.words.slice(0, 2)
          : activity.kind === "examples"
            ? card.examples.filter((e) => e.yes).map((e) => e.text)
            : [card.truth ? "맞다" : "아니다"];
      return {
        value: {
          type: "answer" as const,
          questionId: activity.questionId,
          choiceIds: labels.map(
            (label) => activity.choices.find((c) => c.label === label)!.id,
          ),
        },
        label: labels[0]!,
      };
    };
    let last = correct();
    for (;;) {
      const probe = act(last.value);
      if (probe.state.profile.definitions!.session!.done) break;
      stored = probe.state;
      last = correct();
    }
    const finished = act(last.value);
    const active = view({}, { mission: mission("explorers"), next: null });
    const before = { ...active, ...explorerView(stored, now) };
    const after = {
      ...before,
      ...explorerView(finished.state, now),
      feedback: finished.feedback,
      expedition: {
        ...completed({ cards: 5, bonus: 0 }).expedition!,
        mission: mission("explorers", true),
      },
    };
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        if (options?.body) {
          const type = JSON.parse(options.body as string).action.type;
          return response(type === "answer" ? after : before);
        }
        reads++;
        return response(reads === 1 ? before : { ...after, feedback: null });
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /이어서 탐험하기/ }),
    );
    const choices = await screen.findByRole("group", { name: "답 고르기" });
    fireEvent.click(
      within(choices).getByRole("button", { name: new RegExp(last.label) }),
    );
    const effect = effectOf(
      await screen.findByText("오늘의 한 칸", {}, { timeout: 8000 }),
    );
    expect(spoken(effect)).toBe("오늘의 한 칸별 +5");
    await waitFor(
      () => expect(screen.queryByText("오늘의 한 칸")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(() => expect(reads).toBeGreaterThanOrEqual(2));
    expect(await screen.findByText(/한 칸 전진했어요/)).toBeVisible();
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByText("오늘의 한 칸")).not.toBeInTheDocument();
  });

  it("does not play on a fresh load of an already finished day", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response(completed())),
    );
    render(<StudentMathExplorers />);
    expect(await screen.findByText(/한 칸 전진했어요/)).toBeVisible();
    expect(screen.queryByText("오늘의 한 칸")).not.toBeInTheDocument();
  });
});
