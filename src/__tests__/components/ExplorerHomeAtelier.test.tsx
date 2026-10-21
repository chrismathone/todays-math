/**
 * 학생 수학 홈 — 아틀리에 표면과 기기 «움직임 줄이기»(3자 합의 v2 7 · 9항, 2026-10-04).
 *
 * - 홈의 순서는 미션 → 지도 → 도구 → 다시 살펴볼 개념 그대로다(넓은 PC 의 두 열은 CSS 만 바꾼다).
 * - «움직임 줄이기»는 이 기기의 설정이다. 미션이 진행 중이어서 학년 · 단원이 잠겨 있어도, 상자를 저장하는
 *   중이어도, 다른 요청을 기다리는 중이어도 홈 «학습 설정» 시트에서 눌린다.
 * - 기기(OS)가 이미 줄이고 있으면 앱에서 끌 수 없다 — 스위치는 켜진 채 잠기고 까닭을 말한다.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ExplorerHome from "@/components/math-explorers/ExplorerHome";
import {
  LEARNING_MOTION_KEY,
  LearningMotionScope,
} from "@/components/math-srs/LearningMotion";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import type { ExplorerState } from "@/contracts/mathExplorers.contract";
import type { ExpeditionMission } from "@/contracts/mathExpedition.contract";

const now = "2026-09-26";
const student = { id: "student-ui", name: "학생", className: "테스트반" };

let osReduced = false;
const mediaListeners = new Set<() => void>();
const media = {
  get matches() {
    return osReduced;
  },
  media: "(prefers-reduced-motion: reduce)",
  addEventListener: (_event: string, listener: () => void) =>
    mediaListeners.add(listener),
  removeEventListener: (_event: string, listener: () => void) =>
    mediaListeners.delete(listener),
};

const activeMission: ExpeditionMission = {
  kind: "elementary",
  route: "bank",
  unitId: "e3-multiply",
  title: "곱셈",
  subtitle: "초등 3학년",
  goal: 10,
  id: "00000000-0000-4000-8000-000000000001",
  date: now,
  answered: 4,
  retryRemaining: 0,
  status: "active",
  sourceSessionId: "source",
  sourceSessionIds: ["source"],
  startedAt: `${now}T00:00:00.000Z`,
  completedAt: null,
};

function view(
  expedition: Partial<NonNullable<ExplorerState["expedition"]>> = {},
): ExplorerState {
  const base = explorerView(createExplorerState(student.id, 3), now);
  return {
    ...base,
    student,
    revision: 0,
    feedback: null,
    expedition: {
      mission: null,
      next: {
        kind: "elementary",
        route: "bank",
        unitId: "e3-multiply",
        title: "곱셈",
        subtitle: "초등 3학년",
        goal: 10,
      },
      completedToday: false,
      canStart: true,
      ...expedition,
    },
  };
}

function home(
  state: ExplorerState,
  props: Partial<Parameters<typeof ExplorerHome>[0]> = {},
) {
  const onAction = vi.fn();
  const result = render(
    <LearningMotionScope>
      <ExplorerHome
        state={state}
        busy={false}
        onAction={onAction}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onRetry={vi.fn()}
        onInspect={vi.fn()}
        onReviewDay={vi.fn()}
        {...props}
      />
    </LearningMotionScope>,
  );
  return { ...result, onAction, scope: result.container.firstElementChild! };
}

const openSettings = () =>
  fireEvent.click(screen.getByText("학습 설정", { selector: "button" }));
const motionSwitch = () =>
  screen.getByRole("switch", { name: "움직임 줄이기" });

it("shows one journey heading inside the book while retaining board controls and totals", () => {
  home(view(), { studyBook: true, conceptMemory: <p>오늘 공부</p> });
  expect(
    screen.getAllByRole("heading", { name: "나의 수학 여정" }),
  ).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: "이전 진도판" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "다음 진도판" }),
  ).toBeInTheDocument();
  expect(screen.getByText("일 학습 완료")).toBeInTheDocument();
  expect(screen.getByText(/1–12일차/)).toBeInTheDocument();
});

beforeEach(() => {
  osReduced = false;
  mediaListeners.clear();
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
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

describe("학생 수학 홈의 순서", () => {
  it("미션 → 지도 → 도구 → 다시 살펴볼 개념 그대로이고 새 카드가 없다", () => {
    const state = view();
    const card = state.units[0]!.cards[0]!;
    state.session = {
      id: "session",
      route: "unit",
      title: "곱셈",
      unitId: state.units[0]!.id,
      cardIds: state.units[0]!.cards.map((item) => item.id),
      index: 15,
      total: 15,
      round: 3,
      continuation: 0,
      done: true,
      first: 12,
      stars: 0,
      unresolved: [{ cardId: card.id, name: card.name, kind: 2 }],
      reviewOnly: false,
    };
    const { container } = home(state);
    const root = container.querySelector("[data-explorer-home]")!;
    expect(
      [...root.children].map(
        (child) =>
          child.getAttribute("data-explorer-home-part") ?? child.tagName,
      ),
    ).toEqual(["mission", "journey", "tools", "review"]);
    expect(
      root.querySelector('[data-explorer-home-part="mission"]'),
    ).toHaveAttribute("data-expedition-mission", "true");
    expect(
      root.querySelector(
        '[data-explorer-home-part="journey"] [data-daily-journey]',
      ),
    ).toHaveAttribute("data-journey-variant", "map");
    expect(
      within(
        root.querySelector<HTMLElement>('[data-explorer-home-part="tools"]')!,
      )
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["▤도감", "⚙학습 설정", "⌂우리 기지"]);
    expect(
      root.querySelector('[data-explorer-home-part="review"]'),
    ).toHaveTextContent("다시 살펴볼 개념");
    // 판은 열두 칸 그대로
    expect(root.querySelectorAll("[data-day-step]")).toHaveLength(12);
  });

  it("다시 살펴볼 개념이 없으면 세 덩이뿐이다", () => {
    const { container } = home(view());
    expect(
      [...container.querySelector("[data-explorer-home]")!.children].map(
        (child) => child.getAttribute("data-explorer-home-part"),
      ),
    ).toEqual(["mission", "journey", "tools"]);
  });
});

describe("기기 설정 «움직임 줄이기»", () => {
  it("학습 설정 시트에서 켜고 끄며 이 기기에 남는다", () => {
    const { scope } = home(view());
    expect(scope).toHaveAttribute("data-learning-motion", "full");
    expect(screen.queryByRole("switch")).toBeNull();

    openSettings();
    const sheet = screen.getByRole("dialog", { name: "학습 설정" });
    expect(within(sheet).getByRole("switch")).toBe(motionSwitch());
    expect(motionSwitch()).toHaveAttribute("aria-checked", "false");
    expect(motionSwitch()).toHaveTextContent("꺼짐");
    expect(sheet).toHaveTextContent("이 기기에만 저장돼요.");

    fireEvent.click(motionSwitch());
    expect(motionSwitch()).toHaveAttribute("aria-checked", "true");
    expect(motionSwitch()).toHaveTextContent("켜짐");
    expect(localStorage.getItem(LEARNING_MOTION_KEY)).toBe("reduce");
    expect(scope).toHaveAttribute("data-learning-motion", "reduce");

    fireEvent.click(motionSwitch());
    expect(motionSwitch()).toHaveAttribute("aria-checked", "false");
    expect(localStorage.getItem(LEARNING_MOTION_KEY)).toBe("full");
    expect(scope).toHaveAttribute("data-learning-motion", "full");
  });

  it("미션 진행 · 저장 · 요청 중에도 기기 설정은 눌리고 학년 · 목표는 바꾸지 않는다", () => {
    const { scope, onAction } = home(
      view({ mission: activeMission, next: null }),
      { busy: true, claims: ["chest-waiting"] },
    );
    openSettings();
    const sheet = screen.getByRole("dialog", { name: "학습 설정" });
    expect(within(sheet).queryByLabelText("학년 선택")).not.toBeInTheDocument();

    expect(motionSwitch()).toBeEnabled();
    fireEvent.click(motionSwitch());
    expect(motionSwitch()).toHaveAttribute("aria-checked", "true");
    expect(scope).toHaveAttribute("data-learning-motion", "reduce");
    // 기기 설정은 학습 기록 요청을 보내지 않는다
    expect(onAction).not.toHaveBeenCalled();
  });

  it("기기(OS)가 이미 줄이고 있으면 켜진 채 잠기고 까닭을 말한다", () => {
    osReduced = true;
    const { scope } = home(view());
    expect(scope).toHaveAttribute("data-learning-motion", "reduce");
    openSettings();
    expect(motionSwitch()).toHaveAttribute("aria-checked", "true");
    expect(motionSwitch()).toBeDisabled();
    expect(motionSwitch()).toHaveAccessibleDescription(
      "기기 설정에 따라 움직임을 줄이고 있어요.",
    );
    expect(localStorage.getItem(LEARNING_MOTION_KEY)).toBeNull();

    // 기기 설정이 보통으로 돌아오면 앱 설정(꺼짐)대로 풀린다
    act(() => {
      osReduced = false;
      mediaListeners.forEach((listener) => listener());
    });
    expect(motionSwitch()).toBeEnabled();
    expect(motionSwitch()).toHaveAttribute("aria-checked", "false");
    expect(scope).toHaveAttribute("data-learning-motion", "full");
  });

  it("다른 시트(도감 · 우리 기지)에는 스위치를 두지 않는다", () => {
    home(view());
    fireEvent.click(screen.getByText("도감", { selector: "button" }));
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "나의 개념 도감 닫기" }),
    );
    fireEvent.click(screen.getByText("우리 기지", { selector: "button" }));
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
