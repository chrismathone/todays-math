import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudentCoursePractice from "@/components/math-srs/StudentCoursePractice";
import StudentMathExplorers from "@/components/math-explorers/StudentMathExplorers";
import {
  LEARNING_MOTION_KEY,
  useLearningMotion,
} from "@/components/math-srs/LearningMotion";
import type { CourseSummary } from "@/contracts/mathSrsCourse.contract";
import type { ExplorerRequest } from "@/contracts/mathExplorers.contract";
import {
  courseSession,
  explorerState,
  now,
} from "../../../scripts/qa/srs-m03-motion/data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/learn",
  useSearchParams: () => new URLSearchParams(),
}));
let osReduced = false;
const listeners = new Set<() => void>();
function os(value: boolean) {
  act(() => {
    osReduced = value;
    listeners.forEach((listener) => listener());
  });
}
function Control() {
  const { appReducedMotion, setAppReducedMotion } = useLearningMotion();
  return (
    <button onClick={() => setAppReducedMotion(!appReducedMotion)}>
      기기 설정
    </button>
  );
}
beforeEach(() => {
  localStorage.clear();
  osReduced = false;
  listeners.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return osReduced;
      },
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
    })),
  );
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function tick(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

async function course({ correct = true, manual = false } = {}) {
  const run = courseSession();
  const problem = run.problems[0];
  problem.feedback = { correct };
  if (manual) problem.answerChoices = null;
  run.attempts = [
    {
      problemId: problem.id,
      submittedAnswer: "12",
      correct,
      usedHint: false,
      selfAssessed: false,
      answeredAt: now,
    },
  ];
  const props = {
    session: run,
    summary: {} as CourseSummary,
    busy: false,
    feedbackId: problem.id,
    onNext: vi.fn(),
    onAnswer: vi.fn(),
    onHint: vi.fn(),
    onContinue: vi.fn(),
    onExit: vi.fn(),
    onAuthFailure: vi.fn(),
  };
  const view = render(
    <>
      <Control />
      <StudentCoursePractice {...props} feedbackId={null} />
    </>,
  );
  await screen.findByText("문제 2: 12 이상인 수를 고르세요.");
  vi.useFakeTimers();
  view.rerender(
    <>
      <Control />
      <StudentCoursePractice {...props} />
    </>,
  );
  return { ...view, props };
}
async function explorer() {
  const initial = explorerState("again");
  const api = vi.fn(async () => {
    const data = explorerState("next");
    data.feedback = { message: "맞았어요", correct: true, advance: true };
    return new Response(JSON.stringify({ data }));
  });
  vi.stubGlobal("fetch", api);
  const view = render(
    <>
      <Control />
      <StudentMathExplorers initialState={initial} />
    </>,
  );
  await screen.findByText("다시 해 볼까요");
  vi.useFakeTimers();
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "2 맞아요" })),
  );
  return { ...view, api };
}

describe("M-03 course timing", () => {
  it("advances exactly at 2 seconds with both preferences full", async () => {
    const { props } = await course();
    tick(1999);
    expect(props.onNext).not.toHaveBeenCalled();
    tick(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
    tick(10000);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
  it("cancels for OS or another tab, and restores a full wait when reduction ends", async () => {
    const { props } = await course();
    tick(1000);
    os(true);
    tick(10000);
    expect(props.onNext).not.toHaveBeenCalled();
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LEARNING_MOTION_KEY,
          newValue: "reduce",
        }),
      ),
    );
    os(false);
    tick(10000);
    expect(props.onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "기기 설정" }));
    tick(1999);
    expect(props.onNext).not.toHaveBeenCalled();
    tick(1);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
  it.each(["question", "exit"])(
    "clears the timer on %s change",
    async (change) => {
      const { props, rerender, unmount } = await course();
      tick(1000);
      if (change === "exit") unmount();
      else rerender(<StudentCoursePractice {...props} feedbackId={null} />);
      tick(10000);
      expect(props.onNext).not.toHaveBeenCalled();
    },
  );
  it.each(["app", "os"])(
    "%s reduce keeps a correct answer for a manual next",
    async (source) => {
      if (source === "app") localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
      else osReduced = true;
      const { props } = await course();
      tick(10000);
      expect(props.onNext).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: "Enter" });
      tick(10000);
      expect(props.onNext).toHaveBeenCalledTimes(1);
    },
  );
  it("waits 2 seconds and consumes manual/timer advancement only once", async () => {
    const { props } = await course();
    tick(1999);
    expect(props.onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /다음 문제/ }));
    tick(10000);
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
  it("cancels a waiting timer when app preference changes and retains the next button", async () => {
    const { props } = await course();
    tick(1000);
    fireEvent.click(screen.getByRole("button", { name: "기기 설정" }));
    tick(10000);
    expect(props.onNext).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /다음 문제/ })).toBeEnabled();
  });
  it.each([{ correct: false }, { manual: true }])(
    "preserves wrong/manual conditions %j",
    async (options) => {
      const { props } = await course(options);
      tick(10000);
      expect(props.onNext).not.toHaveBeenCalled();
    },
  );
});
describe("M-03 explorer timing", () => {
  it("never times out the first wrong answer, second wrong answer or open solution", async () => {
    let stage: "first" | "again" | "solution" | "next" = "first";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: RequestInit) => {
        const action = options?.body
          ? (JSON.parse(String(options.body)) as ExplorerRequest).action
          : null;
        if (action?.type === "answer")
          stage = stage === "first" ? "again" : "solution";
        if (action?.type === "understood") stage = "next";
        const data = explorerState(stage);
        if (action?.type === "answer")
          data.feedback = {
            message: "다시 살펴봐요",
            correct: false,
            advance: false,
          };
        return new Response(JSON.stringify({ data }));
      }),
    );
    render(<StudentMathExplorers initialState={explorerState()} />);
    fireEvent.click(screen.getByRole("button", { name: "오늘의 탐험 시작" }));
    fireEvent.click(await screen.findByRole("button", { name: "2 아니에요" }));
    await screen.findByText("다시 해 볼까요");
    vi.useFakeTimers();
    tick(10000);
    expect(screen.getByText("다시 해 볼까요")).toBeInTheDocument();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: /1 아니에요/ }));
    await screen.findByRole("heading", { name: "정답과 풀이" });
    vi.useFakeTimers();
    tick(10000);
    expect(
      screen.getByRole("heading", { name: "정답과 풀이" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "다음 문항이에요." }),
    ).toBeNull();
    vi.useRealTimers();
    fireEvent.click(screen.getByRole("button", { name: "알겠어요" }));
    expect(
      await screen.findByRole("heading", { name: "다음 문항이에요." }),
    ).toBeInTheDocument();
  });
  it("cancels after an immediate click and does not carry the old delay into the next question", async () => {
    const { api } = await explorer();
    tick(1000);
    fireEvent.click(screen.getByRole("button", { name: /다음 문제/ }));
    tick(10000);
    expect(
      screen.getByRole("heading", { name: "다음 문항이에요." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 맞아요" })).toBeEnabled();
    expect(api).toHaveBeenCalledTimes(1);
  });
  it("keeps a manual next available when reduction ends, with a fresh 2 second wait", async () => {
    localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
    await explorer();
    tick(10000);
    fireEvent.click(screen.getByRole("button", { name: "기기 설정" }));
    expect(screen.getByRole("button", { name: /다음 문제/ })).toBeEnabled();
    tick(1999);
    expect(
      screen.queryByRole("heading", { name: "다음 문항이에요." }),
    ).toBeNull();
    tick(1);
    expect(
      screen.getByRole("heading", { name: "다음 문항이에요." }),
    ).toBeInTheDocument();
  });
  it("drops the held transition on unmount", async () => {
    const { api, unmount } = await explorer();
    tick(1000);
    unmount();
    tick(10000);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it.each(["app", "os"])(
    "%s reduce leaves the saved correct answer on screen",
    async (source) => {
      if (source === "app") localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
      else osReduced = true;
      const { api } = await explorer();
      tick(10000);
      expect(
        screen.queryByRole("heading", { name: "다음 문항이에요." }),
      ).toBeNull();
      fireEvent.keyDown(document, { key: "Enter" });
      expect(
        screen.getByRole("heading", { name: "다음 문항이에요." }),
      ).toBeInTheDocument();
      tick(10000);
      expect(api).toHaveBeenCalledTimes(1);
    },
  );
  it("waits 2 seconds, then advances once", async () => {
    const { api } = await explorer();
    tick(1999);
    expect(
      screen.queryByRole("heading", { name: "다음 문항이에요." }),
    ).toBeNull();
    tick(1);
    expect(
      screen.getByRole("heading", { name: "다음 문항이에요." }),
    ).toBeInTheDocument();
    tick(10000);
    expect(api).toHaveBeenCalledTimes(1);
  });
  it.each(["app", "os"])(
    "%s change while waiting cancels the timer without stranding next",
    async (source) => {
      await explorer();
      tick(1000);
      if (source === "app")
        fireEvent.click(screen.getByRole("button", { name: "기기 설정" }));
      else os(true);
      tick(10000);
      expect(
        screen.queryByRole("heading", { name: "다음 문항이에요." }),
      ).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /다음 문제/ }));
      expect(
        screen.getByRole("heading", { name: "다음 문항이에요." }),
      ).toBeInTheDocument();
    },
  );
});
