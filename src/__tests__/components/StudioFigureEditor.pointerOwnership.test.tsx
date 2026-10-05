import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioFigureEditor from "@/components/unified/figure-editor";
import { SVG_NS } from "@/components/unified/figure-editor/figureSvgEditing";

vi.mock(
  "@/components/unified/figure-editor/figureTypeset",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/unified/figure-editor/figureTypeset")
      >();
    return { ...actual, typesetFigureSvg: async (source: string) => source };
  },
);

// Synthetic pointer streams validate ownership; they do not simulate physical touch.
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
    this.pointerType = init.pointerType ?? "mouse";
    this.isPrimary = init.isPrimary ?? true;
  }
}
const identity = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
  inverse() {
    return this;
  },
  multiply() {
    return this;
  },
};
class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform() {
    return new Point(this.x, this.y);
  }
}
const capture = vi.fn();
const release = vi.fn();
const captured = new Set<number>();
beforeEach(() => {
  captured.clear();
  capture.mockReset().mockImplementation((id: number) => captured.add(id));
  release.mockReset().mockImplementation((id: number) => captured.delete(id));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("DOMPoint", Point);
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  Object.defineProperty(SVGElement.prototype, "getScreenCTM", {
    configurable: true,
    value: () => identity,
  });
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({ x: 20, y: 30, width: 60, height: 60 }),
  });
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: capture },
    hasPointerCapture: {
      configurable: true,
      value: (id: number) => captured.has(id),
    },
    releasePointerCapture: { configurable: true, value: release },
  });
});
afterEach(() => {
  for (const key of [
    "setPointerCapture",
    "hasPointerCapture",
    "releasePointerCapture",
  ])
    Reflect.deleteProperty(HTMLElement.prototype, key);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const figure = `<svg xmlns="${SVG_NS}" viewBox="0 0 480 360"><line x1="20" y1="30" x2="80" y2="90" stroke="#111"/><line x1="100" y1="30" x2="160" y2="90" stroke="#111"/></svg>`;
const canvas = () => document.querySelector("#figure-editor-canvas")!;
const surface = () => screen.getByLabelText("도형 편집 캔버스");
const first = () => canvas().querySelector("line")!;
const moved = () => first().getAttribute("transform") ?? "";
const undo = () => screen.getByRole("button", { name: /되돌리기/ });
const pointer = (pointerId = 1, clientX = 50): PointerEventInit => ({
  pointerId,
  button: 0,
  clientX,
  clientY: 60,
});
const lostCapture = (pointerId: number, target = surface()) => {
  captured.delete(pointerId);
  return fireEvent(
    target,
    new TestPointerEvent("lostpointercapture", {
      ...pointer(pointerId),
      bubbles: true,
    }),
  );
};
async function open(source = figure) {
  render(
    <StudioFigureEditor
      image="data:image/png;base64,b3JpZ2luYWw="
      initialSvg={source}
      index={0}
      onSave={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  await waitFor(() => expect(first()).toBeVisible());
}

describe("figure drag pointer ownership (synthetic)", () => {
  it("ignores a second pointer's move, up, cancel and lost capture", async () => {
    await open();
    fireEvent.pointerDown(first(), pointer());
    fireEvent.pointerMove(surface(), pointer(1, 70));
    expect(moved()).toContain("translate(20 0)");
    fireEvent.pointerMove(surface(), pointer(2, 200));
    expect(moved()).toContain("translate(20 0)");
    fireEvent.pointerUp(surface(), pointer(2));
    fireEvent.pointerCancel(surface(), pointer(2));
    lostCapture(2);
    expect(undo()).toBeDisabled();
    fireEvent.pointerMove(surface(), pointer(1, 90));
    expect(moved()).toContain("translate(40 0)");
    fireEvent.pointerUp(surface(), pointer(1));
    fireEvent.click(undo());
    expect(moved()).toBe("");
    expect(undo()).toBeDisabled();
  });

  it("a second down cannot replace the active object or capture", async () => {
    await open();
    fireEvent.pointerDown(first(), pointer());
    fireEvent.pointerMove(surface(), pointer(1, 70));
    // Another pointer type can also be primary: active ownership still wins.
    fireEvent.pointerDown(canvas().querySelectorAll("line")[1], {
      ...pointer(2, 120),
      pointerType: "pen",
      isPrimary: true,
    });
    fireEvent.pointerMove(surface(), pointer(1, 90));
    expect(moved()).toContain("translate(40 0)");
    expect(canvas().querySelectorAll("line")[1]).not.toHaveAttribute(
      "transform",
    );
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(1);
  });

  it.each(["mouse", "pen", "touch"])(
    "accepts a normal primary %s drag",
    async (pointerType) => {
      await open();
      fireEvent.pointerDown(first(), { ...pointer(), pointerType });
      fireEvent.pointerMove(surface(), { ...pointer(1, 80), pointerType });
      fireEvent.pointerUp(surface(), { ...pointer(), pointerType });
      expect(moved()).toContain("translate(30 0)");
      expect(undo()).toBeEnabled();
      // Capture loss after a committed up must not undo the drag.
      lostCapture(1);
      expect(moved()).toContain("translate(30 0)");
    },
  );

  it.each(["cancel", "lostcapture"])(
    "owner %s rolls back and allows the next drag",
    async (kind) => {
      await open();
      fireEvent.pointerDown(first(), pointer());
      fireEvent.pointerMove(surface(), pointer(1, 80));
      if (kind === "cancel") fireEvent.pointerCancel(surface(), pointer());
      else lostCapture(1);
      expect(moved()).toBe("");
      expect(undo()).toBeDisabled();
      expect(captured.has(1)).toBe(false);
      if (kind === "cancel") expect(release).toHaveBeenCalledWith(1);
      fireEvent.pointerDown(first(), pointer(2));
      fireEvent.pointerMove(surface(), pointer(2, 90));
      fireEvent.pointerUp(surface(), pointer(2));
      expect(moved()).toContain("translate(40 0)");
      expect(undo()).toBeEnabled();
    },
  );

  it("ignores nonprimary touch starts", async () => {
    await open();
    fireEvent.pointerDown(first(), {
      ...pointer(2),
      pointerType: "touch",
      isPrimary: false,
    });
    fireEvent.pointerMove(surface(), pointer(2, 90));
    fireEvent.pointerUp(surface(), pointer(2));
    expect(moved()).toBe("");
    expect(capture).not.toHaveBeenCalled();
    expect(undo()).toBeDisabled();
  });

  it("drawing retains the first pointer's origin and one history entry", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: "선분" }));
    fireEvent.pointerDown(canvas(), pointer());
    fireEvent.pointerMove(surface(), pointer(1, 80));
    fireEvent.pointerDown(canvas(), pointer(2, 200));
    fireEvent.pointerUp(surface(), pointer(2));
    fireEvent.pointerMove(surface(), pointer(1, 100));
    fireEvent.pointerUp(surface(), pointer());
    expect(canvas().querySelectorAll("line")).toHaveLength(3);
    expect(canvas().querySelectorAll("line")[2]).toHaveAttribute("x1", "50");
    expect(canvas().querySelectorAll("line")[2]).toHaveAttribute("x2", "100");
    fireEvent.click(undo());
    expect(canvas().querySelectorAll("line")).toHaveLength(2);
    expect(undo()).toBeDisabled();
  });

  it("another handle down cannot replace the active endpoint drag", async () => {
    await open();
    fireEvent.click(document.querySelector('[data-figure-list-number="1"]')!);
    fireEvent.pointerDown(
      document.querySelector('[data-figure-handle="start"]')!,
      pointer(),
    );
    fireEvent.pointerMove(surface(), pointer(1, 70));
    fireEvent.pointerDown(
      document.querySelector('[data-figure-handle="end"]')!,
      pointer(2, 120),
    );
    fireEvent.pointerUp(surface(), pointer(2));
    fireEvent.pointerMove(surface(), pointer(1, 90));
    fireEvent.pointerUp(surface(), pointer());
    expect(first()).toHaveAttribute("x1", "90");
    expect(first()).toHaveAttribute("x2", "80");
    expect(capture).toHaveBeenCalledTimes(1);
    fireEvent.click(undo());
    expect(first()).toHaveAttribute("x1", "20");
    expect(undo()).toBeDisabled();
  });

  it("group overlay drags retain their owner and cancel the whole group", async () => {
    await open(
      figure.replaceAll('stroke="#111"', 'stroke="#111" data-group="A"'),
    );
    fireEvent.pointerDown(first(), pointer());
    fireEvent.pointerUp(surface(), pointer());
    capture.mockClear();
    const border = () => document.querySelector("[data-figure-group-border]")!;
    fireEvent.pointerDown(border(), pointer());
    fireEvent.pointerMove(surface(), pointer(1, 70));
    fireEvent.pointerDown(border(), pointer(2, 200));
    fireEvent.pointerCancel(surface(), pointer(2));
    fireEvent.pointerMove(surface(), pointer(1, 90));
    for (const line of canvas().querySelectorAll("line"))
      expect(line.getAttribute("transform")).toContain("translate(40 0)");
    expect(capture).toHaveBeenCalledTimes(1);
    lostCapture(1);
    for (const line of canvas().querySelectorAll("line"))
      expect(line).not.toHaveAttribute("transform");
    expect(undo()).toBeDisabled();
  });

  it.each(["up", "cancel", "lostcapture"])(
    "pan ignores other pointers and ends on owner %s",
    async (kind) => {
      await open();
      fireEvent.click(screen.getByRole("button", { name: "화면 이동" }));
      const viewport = surface().parentElement!;
      fireEvent.pointerDown(canvas(), pointer());
      fireEvent.pointerMove(viewport, pointer(1, 70));
      expect(surface().style.transform).toBe("translate(20px, 0px)");
      fireEvent.pointerDown(canvas(), pointer(2, 200));
      fireEvent.pointerMove(viewport, pointer(2, 300));
      fireEvent.pointerUp(viewport, pointer(2));
      fireEvent.pointerCancel(viewport, pointer(2));
      lostCapture(2, viewport);
      fireEvent.pointerMove(viewport, pointer(1, 90));
      expect(surface().style.transform).toBe("translate(40px, 0px)");
      expect(capture).toHaveBeenCalledTimes(1);
      if (kind === "up") fireEvent.pointerUp(viewport, pointer());
      else if (kind === "cancel") fireEvent.pointerCancel(viewport, pointer());
      else lostCapture(1, viewport);
      fireEvent.pointerMove(viewport, pointer(1, 120));
      expect(surface().style.transform).toBe("translate(40px, 0px)");
      fireEvent.pointerDown(canvas(), pointer(2));
      fireEvent.pointerMove(viewport, pointer(2, 60));
      fireEvent.pointerUp(viewport, pointer(2));
      expect(surface().style.transform).toBe("translate(50px, 0px)");
      expect(undo()).toBeDisabled();
    },
  );
});
