import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AutoGrowTextarea from "@/components/ui/AutoGrowTextarea";

let width: number, contentHeight: number;
let notify: ResizeObserverCallback;
let disconnect: ReturnType<typeof vi.fn>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
let cancelFrame: ReturnType<typeof vi.fn>;
beforeEach(() => {
  width = 200;
  contentHeight = 24;
  frames = new Map();
  nextFrame = 0;
  disconnect = vi.fn();
  cancelFrame = vi.fn((id: number) => frames.delete(id));
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        notify = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.spyOn(
    HTMLTextAreaElement.prototype,
    "clientWidth",
    "get",
  ).mockImplementation(() => width);
  vi.spyOn(
    HTMLTextAreaElement.prototype,
    "scrollHeight",
    "get",
  ).mockImplementation(() => contentHeight);
  vi.spyOn(
    HTMLTextAreaElement.prototype,
    "offsetHeight",
    "get",
  ).mockReturnValue(50);
  vi.spyOn(
    HTMLTextAreaElement.prototype,
    "clientHeight",
    "get",
  ).mockReturnValue(48);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const resize = () => act(() => notify([], {} as ResizeObserver));
const flush = () =>
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
  });

describe("AutoGrowTextarea browser resize ownership", () => {
  it("fits initial/value content immediately, grows and shrinks without losing focus", () => {
    const { rerender } = render(
      <AutoGrowTextarea
        aria-label="질문"
        value="짧은 글"
        onChange={() => {}}
      />,
    );
    const field = screen.getByRole("textbox");
    expect(field.style.height).toBe("26px");
    field.focus();
    contentHeight = 96;
    rerender(
      <AutoGrowTextarea
        aria-label="질문"
        value="여러 줄의 긴 글"
        onChange={() => {}}
      />,
    );
    expect(field.style.height).toBe("98px");
    contentHeight = 24;
    rerender(
      <AutoGrowTextarea aria-label="질문" value="짧게" onChange={() => {}} />,
    );
    expect(field.style.height).toBe("26px");
    expect(field).toHaveFocus();
  });

  it("defers width-driven writes outside ResizeObserver delivery and coalesces to the latest width", () => {
    render(<AutoGrowTextarea aria-label="질문" defaultValue="가변 폭의 글" />);
    const field = screen.getByRole("textbox");
    width = 100;
    contentHeight = 60;
    resize();
    expect(field.style.height).toBe("26px");
    expect(frames.size).toBe(1);
    resize();
    expect(frames.size).toBe(1);
    width = 80;
    contentHeight = 84;
    resize();
    expect(frames.size).toBe(1);
    expect(cancelFrame).toHaveBeenCalled();
    flush();
    expect(field.style.height).toBe("86px");
  });

  it("disconnects and cancels pending fitting on unmount, ignoring late observer delivery", () => {
    const { unmount } = render(
      <AutoGrowTextarea aria-label="질문" defaultValue="글" />,
    );
    width = 100;
    resize();
    expect(frames.size).toBe(1);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
    resize();
    expect(frames.size).toBe(0);
  });
});
