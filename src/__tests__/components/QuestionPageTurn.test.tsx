import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useQuestionPageTurn } from "@/components/math-srs/useQuestionPageTurn";
import { useLearningMotion } from "@/components/math-srs/LearningMotion";

afterEach(() => {
  const { result, unmount } = renderHook(() => useLearningMotion());
  act(() => result.current.setAppReducedMotion(false));
  unmount();
});

describe("confirmed paper changes", () => {
  it("displays first/resumed data immediately, then fades a new question without treating a grade rerender as a change", () => {
    const { result, rerender } = renderHook(
      ({ key }) => useQuestionPageTurn(key),
      { initialProps: { key: null as string | null } },
    );
    expect(result.current).toBeUndefined();
    rerender({ key: "resumed:4" });
    expect(result.current).toBeUndefined();
    rerender({ key: "resumed:4" });
    expect(result.current).toBeUndefined();
    rerender({ key: "resumed:5" });
    expect(result.current).toBe("true");
    rerender({ key: null });
    rerender({ key: "resumed:6" });
    expect(result.current).toBe("true");
  });

  it("suppresses paper decoration when app reduction is enabled without changing the question identity", () => {
    const motion = renderHook(() => useLearningMotion());
    act(() => motion.result.current.setAppReducedMotion(true));
    const { result, rerender } = renderHook(
      ({ key }) => useQuestionPageTurn(key),
      { initialProps: { key: "one" } },
    );
    rerender({ key: "two" });
    expect(result.current).toBeUndefined();
    act(() => motion.result.current.setAppReducedMotion(false));
    expect(result.current).toBeUndefined();
    rerender({ key: "three" });
    expect(result.current).toBe("true");
  });
});
