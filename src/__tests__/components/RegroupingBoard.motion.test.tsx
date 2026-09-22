import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegroupingBoard from "@/components/lab/cube31/RegroupingBoard";

const animations: {
  target: Element;
  cancel: ReturnType<typeof vi.fn>;
  onfinish: (() => void) | null;
  oncancel: (() => void) | null;
}[] = [];
let reduced = false;
let preferenceChanged: (() => void) | undefined;
const animate = vi.fn(function (this: Element) {
  const animation = {
    target: this,
    cancel: vi.fn(),
    onfinish: null,
    oncancel: null,
  };
  animations.push(animation);
  return animation;
});
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const flights = () => document.querySelectorAll("[data-block-flight]");

beforeEach(() => {
  reduced = false;
  animations.length = 0;
  animate.mockClear();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, listener: () => void) => {
      preferenceChanged = listener;
    },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("PointerEvent", MouseEvent);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const zone = this.closest<HTMLElement>("[data-block-zone]");
      const index = Number(
        this.closest<HTMLElement>("[data-block-index]")?.dataset.blockIndex ??
          0,
      );
      return DOMRect.fromRect({
        x: Number(zone?.dataset.place ?? 0) * 150 + index * 5,
        y: zone?.dataset.blockZone === "workspace" ? 80 : 240,
        width: 20,
        height: 20,
      });
    },
  );
  vi.stubGlobal("Animation", class {});
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: animate,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(Element.prototype, "animate");
});

describe("RegroupingBoard motion lifecycle", () => {
  it("keeps rapid input synchronous and cancels all decoration on undo, reset, and unmount in StrictMode", () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <RegroupingBoard
          problem={{ a: 473, b: 352, operation: "add" }}
          onComplete={onComplete}
        />
      </StrictMode>,
    );
    act(() => {
      for (let i = 0; i < 3; i++) click("백의 자리 1개 옮기기");
      for (let i = 0; i < 5; i++) click("십의 자리 1개 옮기기");
    });
    expect(screen.getByLabelText("백의 자리 작업판 7개")).toBeInTheDocument();
    expect(screen.getByLabelText("십의 자리 작업판 12개")).toBeInTheDocument();
    expect(flights()).toHaveLength(8);
    expect(onComplete).not.toHaveBeenCalled();
    click("한 번 되돌리기");
    expect(flights()).toHaveLength(0);
    expect(
      animations.every((animation) => animation.cancel.mock.calls.length === 1),
    ).toBe(true);
    click("십의 자리 1개 옮기기");
    click("십의 자리 10개 묶기");
    expect(screen.getByLabelText("백의 자리 작업판 8개")).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-block-flight="bundle"]'),
    ).toHaveLength(10);
    click("처음부터");
    expect(document.querySelector("[data-block-motion-layer]")).toBeNull();
    click("백의 자리 1개 옮기기");
    unmount();
    expect(document.querySelector("[data-block-motion-layer]")).toBeNull();
    expect(
      animations.every((animation) => animation.cancel.mock.calls.length === 1),
    ).toBe(true);
  });

  it("uses actual source and destination geometry and releases finished animations", () => {
    render(
      <RegroupingBoard
        problem={{ a: 473, b: 352, operation: "add" }}
        onComplete={vi.fn()}
      />,
    );
    click("옮기기: 백의 자리 백 판 1번");
    expect(flights()).toHaveLength(1);
    const arrival = animations[0];
    expect(arrival.target).toBe(
      document.querySelector(
        '[data-block-zone="workspace"][data-place="2"] [data-block-index="4"] svg',
      ),
    );
    expect(animate.mock.calls[0]).toEqual([
      [{ opacity: 0 }, { opacity: 0 }],
      { duration: 420 },
    ]);
    const [frames, timing] = animate.mock.calls[1] as unknown as [
      Keyframe[],
      KeyframeAnimationOptions,
    ];
    expect(timing.duration).toBe(420);
    expect(frames[0].transform).not.toBe(frames.at(-1)?.transform);
    expect((flights()[0] as HTMLElement).style.top).toBe("240px");
    for (const animation of animations) animation.onfinish?.();
    expect(document.querySelector("[data-block-motion-layer]")).toBeNull();
    expect(
      animations.every((animation) => animation.cancel.mock.calls.length === 1),
    ).toBe(true);
  });

  it("restores reused destinations before the next action and hides a shared bundle target only once", () => {
    render(
      <RegroupingBoard
        problem={{ a: 473, b: 352, operation: "add" }}
        onComplete={vi.fn()}
      />,
    );
    click("십의 자리 1개 옮기기");
    const firstArrival = animations[0];
    click("십의 자리 1개 옮기기");
    expect(firstArrival.cancel).toHaveBeenCalledTimes(1);
    click("십의 자리 1개 옮기기");
    click("십의 자리 10개 묶기");
    const target = document.querySelector(
      '[data-block-zone="workspace"][data-place="2"] [data-block-index="4"] svg',
    );
    const sharedArrival = animations.filter(
      (animation) => animation.target === target,
    );
    expect(sharedArrival).toHaveLength(1);
    click("처음부터");
    expect(sharedArrival[0].cancel).toHaveBeenCalledTimes(1);
    expect(
      animations.every((animation) => animation.cancel.mock.calls.length === 1),
    ).toBe(true);
  });

  it("fans a split into ten destinations and animates pointer release without a duplicate click", () => {
    render(
      <RegroupingBoard
        problem={{ a: 402, b: 175, operation: "subtract" }}
        onComplete={vi.fn()}
      />,
    );
    click("백의 자리 1개 풀기");
    expect(
      document.querySelectorAll('[data-block-flight="split"]'),
    ).toHaveLength(10);
    const source = screen.getByRole("button", {
      name: "빼기: 십의 자리 십 막대 1번",
    });
    const target = screen.getByLabelText("십의 자리 빼기 상자");
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => target,
    });
    fireEvent.pointerDown(source, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(source, { pointerId: 1, clientX: 20, clientY: 80 });
    fireEvent.pointerUp(source, { pointerId: 1, clientX: 20, clientY: 80 });
    fireEvent.click(source, { detail: 1 });
    expect(screen.getByLabelText("십의 자리 작업판 9개")).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-block-flight="remove"]'),
    ).toHaveLength(1);
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("honors reduced motion initially and cancels in-flight motion when the preference changes", () => {
    reduced = true;
    render(
      <RegroupingBoard
        problem={{ a: 473, b: 352, operation: "add" }}
        onComplete={vi.fn()}
      />,
    );
    click("백의 자리 1개 옮기기");
    expect(screen.getByLabelText("백의 자리 작업판 5개")).toBeInTheDocument();
    expect(animate).not.toHaveBeenCalled();
    reduced = false;
    click("백의 자리 1개 옮기기");
    expect(flights()).toHaveLength(1);
    reduced = true;
    preferenceChanged?.();
    expect(document.querySelector("[data-block-motion-layer]")).toBeNull();
    click("백의 자리 1개 옮기기");
    expect(screen.getByLabelText("백의 자리 작업판 7개")).toBeInTheDocument();
    expect(flights()).toHaveLength(0);
  });
});
