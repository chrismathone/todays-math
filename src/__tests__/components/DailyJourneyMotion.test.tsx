/**
 * 진도판 말 이동(3자 합의 v2 9항, 2026-10-04) — 하루를 마친 한 칸만 650ms 로 가고, 뜀은 8px 이하다.
 * 기울임 · 눌림 · 착지 링은 없다. 기기(OS)나 앱의 «움직임 줄이기» 가운데 하나라도 켜져 있으면 움직임 없이
 * 새 칸에 바로 선다. 가는 동안 바퀴가 도는 표지(`data-moving`)와 네 방향(§8.24)은 그대로다.
 *
 * jsdom 에는 `Element.animate` 가 없다 — 그래서 지금까지 이 효과는 시험에서 한 번도 돌지 않았다.
 * 여기서는 `animate` 를 세워 부른 틀 · 길이 · 정리(`cancel`)를 직접 잰다.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DailyJourneyBoard, {
  type DailyJourney,
} from "@/components/math-srs/DailyJourneyBoard";
import {
  LEARNING_MOTION_KEY,
  LearningMotionScope,
  useLearningMotion,
} from "@/components/math-srs/LearningMotion";

type Fake = {
  cancel: ReturnType<typeof vi.fn>;
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
};
type Call = {
  element: HTMLElement;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
  animation: Fake;
};

let calls: Call[] = [];
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

function journey(completedDays: number, todayComplete = false): DailyJourney {
  return {
    completedDays,
    todayComplete,
    todayAnswered: todayComplete ? 10 : 0,
    todayGoal: 10,
    days: Array.from({ length: completedDays }, (_, index) => ({
      id: `elementary:2026-09-${String(index + 1).padStart(2, "0")}`,
      date: `2026-09-${String(index + 1).padStart(2, "0")}`,
      completedAt: "2026-09-26T09:00:00.000Z",
      title: "약수와 배수",
      subtitle: "초5 · 1학기",
      reviewCount: 10,
    })),
    upcoming: Array.from({ length: 12 }, () => ({
      title: "약분과 통분",
      subtitle: "초5 · 1학기",
    })),
  };
}

function MotionControl() {
  const motion = useLearningMotion();
  return (
    <button
      type="button"
      onClick={() => motion.setAppReducedMotion(!motion.appReducedMotion)}
    >
      앱 줄이기
    </button>
  );
}

function board(value: DailyJourney, theme?: "forest") {
  return (
    <LearningMotionScope>
      <MotionControl />
      <DailyJourneyBoard
        journey={value}
        variant="map"
        theme={theme}
        onReviewDay={vi.fn()}
      />
    </LearningMotionScope>
  );
}

const callFor = (marker: string) =>
  calls.find((call) => call.element.matches(marker));

beforeEach(() => {
  calls = [];
  osReduced = false;
  mediaListeners.clear();
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    writable: true,
    value: function (
      this: HTMLElement,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions,
    ) {
      const animation: Fake = {
        onfinish: null,
        oncancel: null,
        cancel: vi.fn(() => animation.oncancel?.()),
      };
      calls.push({ element: this, keyframes, options, animation });
      return animation;
    },
  });
});
afterEach(() => {
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("진도판 말 이동 — 하루 한 칸", () => {
  it("650ms 경로로 한 칸 가고, 뜀은 8px 이하이며 기울임 · 눌림 · 착지 링이 없다", () => {
    const { container, rerender } = render(board(journey(2)));
    expect(calls).toHaveLength(0);
    expect(container.querySelectorAll("[data-day-step]")).toHaveLength(12);

    rerender(board(journey(3, true)));

    const travel = callFor("[data-pawn-day]")!;
    expect(travel.options).toMatchObject({ duration: 650 });
    // 2일차 칸(4행 3열) → 3일차 칸(4행 2열): 왼쪽으로 한 칸, 높이는 그대로
    expect(travel.keyframes).toEqual([
      { left: "69.5%", top: "77.75%" },
      { left: "44.5%", top: "77.75%" },
    ]);

    const hop = callFor("[data-pawn-figure]")!;
    expect(hop.options).toMatchObject({ duration: 650 });
    const heights = hop.keyframes.map((frame) => {
      const transform = String(frame.transform);
      expect(transform).not.toMatch(/rotate|scale|skew/);
      const moved = /^translateY\((-?[\d.]+)(?:px)?\)$/.exec(transform);
      expect(moved, `뜀은 세로 이동만: ${transform}`).not.toBeNull();
      return Number(moved![1]);
    });
    expect(Math.min(...heights)).toBeLessThan(0);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(-8);
    expect(Math.max(...heights)).toBeLessThanOrEqual(0);
    expect(heights[0]).toBe(0);
    expect(heights.at(-1)).toBe(0);

    expect(container.querySelector("[data-pawn-landing]")).toBeNull();
    expect(callFor("[data-pawn-landing]")).toBeUndefined();
    // 판은 그대로 열두 칸이고 말은 새 칸에 서 있다
    expect(container.querySelectorAll("[data-day-step]")).toHaveLength(12);
    expect(screen.getByLabelText("내 말, 3일 학습 완료")).toHaveStyle({
      left: "44.5%",
      top: "77.75%",
    });
  });

  it("탈것은 가는 동안 가는 쪽을 보고 바퀴가 돌며, 도착하면 다음에 갈 쪽을 본다", () => {
    const { rerender } = render(board(journey(3), "forest"));
    rerender(board(journey(4, true), "forest"));
    const rider = screen.getByLabelText("내 탐험 수레, 4일 학습 완료");
    // 3 → 4일차는 아래 줄의 마지막 걸음(왼쪽으로), 그다음은 왼쪽 줄을 위로
    expect(rider).toHaveAttribute("data-moving", "true");
    expect(rider).toHaveAttribute("data-heading", "left");
    act(() => callFor("[data-pawn-day]")!.animation.onfinish?.());
    expect(rider).not.toHaveAttribute("data-moving");
    expect(rider).toHaveAttribute("data-heading", "up");
  });

  it("문제를 푸는 동안 · 처음 그릴 때 · 쪽을 넘길 때는 움직이지 않는다", () => {
    const { rerender } = render(board(journey(5)));
    rerender(board({ ...journey(5), todayAnswered: 7 }));
    fireEvent.click(screen.getByRole("button", { name: "다음 진도판" }));
    fireEvent.click(screen.getByRole("button", { name: "현재 위치로" }));
    // 한꺼번에 두 칸이 늘어난 기록(다른 기기에서 풀고 온 경우)은 연출하지 않는다
    rerender(board(journey(7)));
    expect(calls).toHaveLength(0);
  });
});

describe("진도판 말 이동 — 움직임 줄이기", () => {
  it("기기(OS)가 줄이고 있으면 움직임 없이 새 칸에 선다", () => {
    osReduced = true;
    const { rerender } = render(board(journey(2), "forest"));
    rerender(board(journey(3, true), "forest"));
    expect(calls).toHaveLength(0);
    const rider = screen.getByLabelText("내 탐험 수레, 3일 학습 완료");
    expect(rider).toHaveStyle({ left: "44.5%", top: "77.75%" });
    expect(rider).not.toHaveAttribute("data-moving");
    expect(rider).toHaveAttribute("data-heading", "left");
  });

  it("앱 설정이 줄이고 있으면 기기 설정이 보통이어도 움직이지 않는다", () => {
    localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
    const { container, rerender } = render(board(journey(2)));
    expect(container.firstChild).toHaveAttribute(
      "data-learning-motion",
      "reduce",
    );
    rerender(board(journey(3, true)));
    expect(calls).toHaveLength(0);
    expect(screen.getByLabelText("내 말, 3일 학습 완료")).toHaveStyle({
      left: "44.5%",
      top: "77.75%",
    });
  });

  it("가는 중에 줄이기를 켜면 곧바로 멈추고, 다시 꺼도 같은 칸을 또 연출하지 않는다", () => {
    const { rerender } = render(board(journey(3), "forest"));
    rerender(board(journey(4, true), "forest"));
    const started = [...calls];
    expect(started.length).toBeGreaterThanOrEqual(2);
    const rider = screen.getByLabelText("내 탐험 수레, 4일 학습 완료");
    expect(rider).toHaveAttribute("data-moving", "true");

    fireEvent.click(screen.getByRole("button", { name: "앱 줄이기" }));
    for (const call of started)
      expect(call.animation.cancel).toHaveBeenCalled();
    expect(rider).not.toHaveAttribute("data-moving");
    expect(rider).toHaveAttribute("data-heading", "up");

    fireEvent.click(screen.getByRole("button", { name: "앱 줄이기" }));
    expect(calls).toHaveLength(started.length);
  });

  it("기기 설정이 가는 중에 바뀌어도 멈춘다", () => {
    const { rerender } = render(board(journey(3)));
    rerender(board(journey(4, true)));
    const started = [...calls];
    act(() => {
      osReduced = true;
      mediaListeners.forEach((listener) => listener());
    });
    for (const call of started)
      expect(call.animation.cancel).toHaveBeenCalled();
  });

  it("화면을 떠나면 가던 움직임을 정리한다", () => {
    const { rerender, unmount } = render(board(journey(3)));
    rerender(board(journey(4, true)));
    const started = [...calls];
    expect(started.length).toBeGreaterThanOrEqual(2);
    unmount();
    for (const call of started)
      expect(call.animation.cancel).toHaveBeenCalled();
  });
});
