// D-144 · 05 §8.19 — 한 칸 별 · 끝없는 기지가 학생 화면에 보이는 모양(Hi-fi 2안, 3자 합의).
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import type {
  ExpeditionMission,
  ExpeditionPlan,
} from "@/contracts/mathExpedition.contract";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
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
    expect(within(line).getByLabelText("별 3개")).toHaveTextContent("✦+3");
    expect(line).toHaveTextContent("다음 탐험은 내일 열려요.");
    // 은행 날처럼 한 칸 보장만이면 내역 줄은 없다
    expect(line).not.toHaveTextContent("한 칸 보장");
  });

  it("adds a small breakdown only when card levels and the tile floor both gave stars", () => {
    home(completed({ cards: 2, bonus: 1 }));
    const line = screen.getByText(/한 칸 전진했어요/);
    expect(within(line).getByLabelText("별 3개")).toBeVisible();
    expect(line).toHaveTextContent("카드 2 · 한 칸 보장 1");
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
  it("plays once when the screen sees today's tile appear after a bank day", async () => {
    const initial = view();
    const active = view({}, { mission: mission("elementary"), next: null });
    const done = completed();
    let reads = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, options) => {
        if (options?.body) return response(active);
        reads++;
        return response(reads === 1 ? initial : done);
      }),
    );
    render(<StudentMathExplorers />);
    fireEvent.click(
      await screen.findByRole("button", { name: /오늘의 탐험 시작/ }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "은행 완료" }));
    const effect = (await screen.findByText("오늘의 한 칸")).closest(
      '[role="status"]',
    )!;
    expect(effect).toBeInTheDocument();
    expect(effect).toHaveTextContent("별 +3");
    expect(effect).not.toHaveTextContent("!");
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
