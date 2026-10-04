import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LEARNING_MOTION_KEY,
  LearningMotionScope,
  useLearningMotion,
} from "@/components/math-srs/LearningMotion";

let osReduced = false;
const mediaListeners = new Set<() => void>();
const media = {
  get matches() {
    return osReduced;
  },
  media: "(prefers-reduced-motion: reduce)",
  addEventListener: vi.fn((_event: string, listener: () => void) =>
    mediaListeners.add(listener),
  ),
  removeEventListener: vi.fn((_event: string, listener: () => void) =>
    mediaListeners.delete(listener),
  ),
};

function Control({ name = "설정" }: { name?: string }) {
  const motion = useLearningMotion();
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={motion.appReducedMotion}
      onClick={() => motion.setAppReducedMotion(!motion.appReducedMotion)}
    >
      {motion.reduceMotion ? "줄임" : "보통"}
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
  osReduced = false;
  mediaListeners.clear();
  media.addEventListener.mockClear();
  media.removeEventListener.mockClear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("학생 수학의 기기 움직임 설정", () => {
  it("앱 설정을 공유하고 OS 줄이기를 앱에서 끌 수 없다", () => {
    const { container } = render(
      <LearningMotionScope>
        <Control name="첫 설정" />
        <Control name="둘째 설정" />
      </LearningMotionScope>,
    );
    expect(screen.getByRole("button", { name: "첫 설정" })).toHaveTextContent(
      "보통",
    );
    expect(mediaListeners.size).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "첫 설정" }));
    expect(screen.getByRole("button", { name: "둘째 설정" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(localStorage.getItem(LEARNING_MOTION_KEY)).toBe("reduce");
    expect(container.firstChild).toHaveAttribute(
      "data-learning-motion",
      "reduce",
    );
    act(() => {
      osReduced = true;
      mediaListeners.forEach((listener) => listener());
    });
    fireEvent.click(screen.getByRole("button", { name: "첫 설정" }));
    expect(screen.getByRole("button", { name: "첫 설정" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "첫 설정" })).toHaveTextContent(
      "줄임",
    );
    act(() => {
      osReduced = false;
      mediaListeners.forEach((listener) => listener());
    });
    expect(container.firstChild).toHaveAttribute(
      "data-learning-motion",
      "full",
    );
  });

  it("기존 기기 설정과 다른 탭의 변경을 반영하며 마지막 구독 해제 때 정리한다", () => {
    localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
    const { unmount } = render(
      <LearningMotionScope>
        <Control />
      </LearningMotionScope>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("줄임");
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: LEARNING_MOTION_KEY,
          newValue: "full",
        }),
      ),
    );
    expect(screen.getByRole("button")).toHaveTextContent("보통");
    unmount();
    expect(mediaListeners.size).toBe(0);
  });

  it("저장소를 쓸 수 없어도 토글은 현재 화면에서 작동한다", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <LearningMotionScope>
        <Control />
      </LearningMotionScope>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("줄임");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("보통");
  });

  it("서버 렌더는 브라우저 저장소 값에 의존하지 않는다", () => {
    localStorage.setItem(LEARNING_MOTION_KEY, "reduce");
    expect(
      renderToString(
        <LearningMotionScope>
          <Control />
        </LearningMotionScope>,
      ),
    ).toContain('data-learning-motion="full"');
  });
});
