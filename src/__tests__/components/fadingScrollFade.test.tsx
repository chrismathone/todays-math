import { useRef } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FadingScrollFade } from "@/components/fading/FadingScrollFade";

let resizeCallback: () => void;
let observed: Set<Element>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const disconnect = vi.fn();

function Harness({ replacement = false }: { replacement?: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={scrollRef} data-testid="scroller">
        <main key={String(replacement)}>Learning content</main>
      </div>
      <FadingScrollFade scrollRef={scrollRef} />
    </div>
  );
}

function flush() {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });
}

beforeEach(() => {
  observed = new Set();
  frames = new Map();
  nextFrame = 0;
  disconnect.mockClear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resizeCallback = callback;
      }
      observe(element: Element) {
        observed.add(element);
      }
      disconnect() {
        observed.clear();
        disconnect();
      }
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  const view = render(<Harness />);
  const scroller = view.getByTestId("scroller");
  const fade = view.container.querySelector("[data-fading-scroll-fade]")!;
  const metrics = { clientHeight: 400, scrollHeight: 400, scrollTop: 0 };
  for (const key of Object.keys(metrics) as (keyof typeof metrics)[]) {
    Object.defineProperty(scroller, key, { get: () => metrics[key] });
  }
  flush();
  return { ...view, scroller, fade, metrics };
}

describe("mobile downward scroll hint", () => {
  it("appears only with content below and disappears at the fractional bottom", () => {
    const { scroller, fade, metrics } = setup();
    expect(fade.getAttribute("data-more-below")).toBe("false");
    expect(fade.getAttribute("aria-hidden")).toBe("true");
    metrics.scrollHeight = 900;
    metrics.scrollTop = -12; // mobile elastic overscroll at the top
    resizeCallback();
    flush();
    expect(fade.getAttribute("data-more-below")).toBe("true");
    metrics.scrollTop = 240;
    fireEvent.scroll(scroller);
    flush();
    expect(fade.getAttribute("data-more-below")).toBe("true");
    metrics.scrollTop = 499.5;
    fireEvent.scroll(scroller);
    flush();
    expect(fade.getAttribute("data-more-below")).toBe("false");
  });

  it("remeasures content replacement and content resize in the same viewport", async () => {
    const { scroller, fade, metrics, rerender } = setup();
    expect(observed.has(scroller.firstElementChild!)).toBe(true);
    metrics.scrollHeight = 1000;
    rerender(<Harness replacement />);
    await act(async () => {}); // deliver MutationObserver's content replacement
    flush();
    expect(observed.has(scroller.firstElementChild!)).toBe(true);
    expect(fade.getAttribute("data-more-below")).toBe("true");
    metrics.scrollHeight = 400;
    resizeCallback(); // late font/image layout or shorter content
    flush();
    expect(fade.getAttribute("data-more-below")).toBe("false");
    metrics.clientHeight = 0;
    metrics.scrollHeight = 1000;
    fireEvent(window, new Event("resize"));
    flush();
    expect(fade.getAttribute("data-more-below")).toBe("false");
  });

  it("batches scroll measurements and releases observers and scheduled work", () => {
    const { scroller, unmount } = setup();
    fireEvent.scroll(scroller);
    fireEvent.scroll(scroller);
    resizeCallback();
    expect(frames.size).toBe(1);
    const before = disconnect.mock.calls.length;
    unmount();
    expect(disconnect.mock.calls.length).toBe(before + 1);
    expect(frames.size).toBe(0);
    fireEvent.scroll(scroller);
    fireEvent(window, new Event("resize"));
    expect(frames.size).toBe(0);
  });
});
