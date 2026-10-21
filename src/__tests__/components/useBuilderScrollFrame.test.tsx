/**
 * 시험지 만들기의 단 틀 — 단의 위(단계 띠 아래)와 아래(껍데기 여백)를 재어 CSS 변수로 내려 준다.
 * 원장님 2026-10-21 «이중스크롤 · 외부 스크롤이 필요없어보임». 실제 높이 · 스크롤은 브라우저 측정이 본다
 * (`scripts/qa/measure-builder-scroll.mjs` — jsdom 에는 배치가 없다).
 */
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBuilderScrollFrame } from "@/components/exam-builder/useBuilderScrollFrame";
import type { ExamBuilderStep } from "@/components/exam-builder/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function Builder({ step }: { step: ExamBuilderStep }) {
  const { rootRef, bandRef } = useBuilderScrollFrame(step);
  return (
    // The shell's page padding, the builder's own margin and a wrapper's padding.
    <div style={{ paddingBottom: "16px" }}>
      <section ref={rootRef} style={{ marginBottom: "4px" }}>
        <div ref={bandRef} />
        <div style={{ paddingBottom: "2px" }}>
          {step === "scope" && <div data-scope-layout="" data-testid="frame" />}
          {step === "review" && (
            <div data-review-layout="" data-testid="frame" />
          )}
        </div>
      </section>
    </div>
  );
}

const shellBottom = () =>
  [document.body, document.documentElement].reduce((sum, node) => {
    const style = getComputedStyle(node);
    return (
      sum +
      (parseFloat(style.paddingBottom) || 0) +
      (parseFloat(style.marginBottom) || 0)
    );
  }, 0);

describe("단 틀", () => {
  it.each(["scope", "review"] as const)(
    "%s 단도 껍데기의 아래 여백을 비운다 — 페이지가 넘치지 않는다",
    (step) => {
      render(<Builder step={step} />);
      expect(
        screen
          .getByTestId("frame")
          .style.getPropertyValue("--builder-viewport-bottom"),
      ).toBe(`${2 + 4 + 16 + shellBottom()}px`);
    },
  );

  it("단 위의 껍데기 알림이 끼거나 접혀 단이 움직이면 다시 잰다 — 빌더 크기는 그대로다", () => {
    const observed: Element[] = [];
    let notify = () => {};
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          notify = callback;
        }
        observe(target: Element) {
          observed.push(target);
        }
        disconnect() {}
      },
    );
    let top = 180;
    const original = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.testid === "frame"
          ? ({ top, height: 400 } as DOMRect)
          : original.call(this);
      },
    );
    render(<Builder step="review" />);
    const frame = screen.getByTestId("frame");
    const shell = frame.closest("section")!.parentElement!;
    expect(frame.style.getPropertyValue("--builder-viewport-top")).toBe(
      "180px",
    );
    // A failed-save notice above the builder resizes an ancestor, not the builder.
    expect(observed).toContain(shell);
    expect(observed).toContain(document.body);
    top = 260; // the notice appears
    notify();
    expect(frame.style.getPropertyValue("--builder-viewport-top")).toBe(
      "260px",
    );
    top = 200; // the notice folds
    notify();
    expect(frame.style.getPropertyValue("--builder-viewport-top")).toBe(
      "200px",
    );
  });
});
