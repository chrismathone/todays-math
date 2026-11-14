import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ArithmeticTypePreview,
  useArithmeticTypePreview,
} from "@/components/arithmetic/ArithmeticTypePreview";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2/catalog";

const types = listArithmeticV2Types();
const numeric = types.find((type) => type.id === "m1-integer-add-chain")!;
const sine = types.find((type) => type.id === "m3-trig-sine-from-area")!;

function Catalog() {
  const preview = useArithmeticTypePreview();
  return (
    <>
      {[numeric, sine].map((type) => (
        <button key={type.id} {...preview.cardProps(type.id)}>
          {type.title}
        </button>
      ))}
      <ArithmeticTypePreview state={preview.state} types={types} />
    </>
  );
}

let anchor: DOMRect;
let naturalHeight: number;
const observers = new Map<ResizeObserverCallback, Map<Element, number>>();

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    left: x,
    top: y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    toJSON() {},
  };
}

// jsdom has no layout. Supply independent border-box measurements and apply
// the rendered fixed-position CSS, rather than calling the placement helper.
function layout(element: HTMLElement) {
  const height = Math.min(
    naturalHeight,
    parseFloat(element.style.maxHeight) || Infinity,
  );
  const top = element.style.top
    ? parseFloat(element.style.top)
    : window.innerHeight - parseFloat(element.style.bottom) - height;
  return rect(
    parseFloat(element.style.left),
    top,
    parseFloat(element.style.width),
    height,
  );
}

function resizeContent(height: number) {
  naturalHeight = height;
  act(() => {
    for (const [callback, measurements] of observers) {
      let changed = false;
      for (const [element, previous] of measurements) {
        const next = element.getBoundingClientRect().height;
        if (next !== previous) changed = true;
        measurements.set(element, next);
      }
      if (changed) callback([], {} as ResizeObserver);
    }
  });
}

function open(name = numeric.title, keyboard = false) {
  const card = screen.getByRole("button", { name });
  if (keyboard) {
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => card.focus());
  } else fireEvent.pointerEnter(card, { pointerType: "mouse" });
  act(() => vi.advanceTimersByTime(300));
  return card;
}

function expectContained() {
  const tooltip = screen.getByRole("tooltip");
  const box = layout(tooltip);
  expect(box.top).toBeGreaterThanOrEqual(12);
  expect(box.bottom).toBeLessThanOrEqual(window.innerHeight - 12);
  expect(box.left).toBeGreaterThanOrEqual(12);
  expect(box.right).toBeLessThanOrEqual(window.innerWidth - 12);
  return box;
}

describe("measured arithmetic tooltip containment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("innerWidth", 390);
    vi.stubGlobal("innerHeight", 844);
    anchor = rect(24, 380.75, 200, 44);
    naturalHeight = 120;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(element: Element) {
          if (!observers.has(this.callback))
            observers.set(this.callback, new Map());
          observers
            .get(this.callback)!
            .set(element, element.getBoundingClientRect().height);
        }
        disconnect() {
          observers.delete(this.callback);
        }
        unobserve() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        if (this.getAttribute("role") === "tooltip") return layout(this);
        // Natural flow content can keep growing while its capped parent does
        // not resize. A header-only observation cannot detect that growth.
        if (
          this.closest('[role="tooltip"]') &&
          this.querySelector('[aria-label="답란"], [role="status"], img')
        ) {
          return rect(0, 0, 290, naturalHeight);
        }
        return anchor;
      },
    );
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.getAttribute("role") === "tooltip"
          ? layout(this).height
          : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
      () => naturalHeight,
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    observers.clear();
  });

  it("reproduces the measured 390×844 sine overflow after content grows", () => {
    render(<Catalog />);
    const card = open();
    expectContained();
    resizeContent(438.6875);
    const box = expectContained();
    expect(box.height).toBe(438.6875);
    expect(card).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
  });

  it.each([24, 380.75, 776])(
    "keeps small numeric content clear of a narrow card at y=%s",
    (top) => {
      anchor = rect(24, top, 200, 44);
      render(<Catalog />);
      open();
      const box = expectContained();
      expect(box.bottom <= anchor.top - 8 || box.top >= anchor.bottom + 8).toBe(
        true,
      );
    },
  );

  it.each([24, 380.75, 776])(
    "keeps growing figure-sized content contained at y=%s",
    (top) => {
      anchor = rect(24, top, 200, 44);
      render(<Catalog />);
      open();
      resizeContent(438.6875);
      expect(expectContained().height).toBe(438.6875);
      resizeContent(160);
      expect(expectContained().height).toBe(160);
    },
  );

  it.each([24, 380, 776])(
    "prefers a free side and clamps measured content at y=%s",
    (top) => {
      vi.stubGlobal("innerWidth", 1280);
      anchor = rect(420, top, 200, 44);
      render(<Catalog />);
      open();
      resizeContent(438.6875);
      const box = expectContained();
      expect(box.left).toBeGreaterThanOrEqual(anchor.right + 8);
    },
  );

  it("uses the left side when there is no room on the right", () => {
    vi.stubGlobal("innerWidth", 1280);
    anchor = rect(1000, 740, 200, 44);
    render(<Catalog />);
    open();
    resizeContent(438.6875);
    expect(expectContained().right).toBeLessThanOrEqual(anchor.left - 8);
  });

  it("bounds tall content on a short viewport and lets the focused card scroll to its end", () => {
    vi.stubGlobal("innerHeight", 320);
    anchor = rect(24, 120, 200, 44);
    naturalHeight = 438.6875;
    const { unmount } = render(<Catalog />);
    const card = open(numeric.title, true);
    const tooltip = screen.getByRole("tooltip");
    expect(expectContained().height).toBe(296);
    fireEvent.keyDown(card, { key: "ArrowDown" });
    expect(tooltip.scrollTop).toBeGreaterThan(0);
    fireEvent.keyDown(card, { key: "End" });
    expect(tooltip.scrollTop + tooltip.clientHeight).toBeGreaterThanOrEqual(
      tooltip.scrollHeight,
    );
    // The fallback's own scroll must not trigger the page-scroll dismissal.
    fireEvent.scroll(tooltip);
    expect(screen.getByRole("tooltip")).toBe(tooltip);
    fireEvent.keyDown(card, { key: "Home" });
    expect(tooltip.scrollTop).toBe(0);
    fireEvent.keyDown(card, { key: "PageDown" });
    expect(tooltip.scrollTop).toBeGreaterThan(0);
    fireEvent.keyDown(card, { key: "PageUp" });
    expect(tooltip.scrollTop).toBe(0);
    expect(card).toHaveFocus();
    fireEvent.scroll(window);
    expect(screen.queryByRole("tooltip")).toBeNull();
    unmount();
    expect(observers.size).toBe(0);
  });

  it("detects content growing beyond an already full-height box", () => {
    vi.stubGlobal("innerHeight", 320);
    anchor = rect(24, 120, 200, 44);
    naturalHeight = 296;
    render(<Catalog />);
    const card = open(numeric.title, true);
    const tooltip = screen.getByRole("tooltip");
    expect(expectContained().height).toBe(296);
    expect(tooltip).toHaveAttribute("data-overflow", "false");
    resizeContent(600);
    expect(expectContained().height).toBe(296);
    expect(tooltip).toHaveAttribute("data-overflow", "true");
    fireEvent.keyDown(card, { key: "End" });
    expect(tooltip.scrollTop + tooltip.clientHeight).toBe(600);
    resizeContent(120);
    expect(expectContained().height).toBe(120);
    expect(tooltip).toHaveAttribute("data-overflow", "false");
  });

  it("does not reopen after cancellation even if a queued resize callback arrives", () => {
    const { unmount } = render(<Catalog />);
    const card = open();
    const queued = [...observers.keys()];
    expect(queued.length).toBeGreaterThan(0);
    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      for (const callback of queued) callback([], {} as ResizeObserver);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(card).not.toHaveAttribute("aria-describedby");
    unmount();
    expect(observers.size).toBe(0);
  });

  it("remeasures the real lazy sine module and a later image load without reopening", async () => {
    render(<Catalog />);
    const card = open(sine.title);
    const tooltip = screen.getByRole("tooltip");
    expect(screen.getByRole("status")).toBeInTheDocument();
    vi.useRealTimers();
    await waitFor(() => expect(tooltip.querySelector("img")).not.toBeNull());
    resizeContent(360);
    expectContained();
    naturalHeight = 438.6875;
    fireEvent.load(tooltip.querySelector("img")!);
    expect(expectContained().height).toBe(438.6875);
    expect(screen.getByRole("tooltip")).toBe(tooltip);
    expect(card).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("ignores a queued old measurement after a direct card transition", () => {
    anchor = rect(24, 776, 200, 44);
    render(<Catalog />);
    const first = open();
    const queued = [...observers.keys()];
    anchor = rect(24, 24, 200, 44);
    const next = screen.getByRole("button", { name: sine.title });
    act(() => {
      fireEvent.pointerOut(first, {
        pointerType: "mouse",
        relatedTarget: next,
      });
      fireEvent.pointerOver(next, {
        pointerType: "mouse",
        relatedTarget: first,
      });
      vi.advanceTimersByTime(300);
      fireEvent.pointerMove(next, { pointerType: "mouse" });
    });
    const top = expectContained().top;
    expect(top).toBe(anchor.bottom + 8);
    act(() => {
      for (const callback of queued) callback([], {} as ResizeObserver);
    });
    expect(expectContained().top).toBe(top);
    expect(next).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
  });
});
