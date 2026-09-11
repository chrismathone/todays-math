import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FoldingDemo } from "@/app/dev/blender/FoldingDemo";

// Exercise the controls' public model-viewer contract. Real GLB rendering and
// camera framing are checked in the browser with the Blender export.
vi.mock("@google/model-viewer", () => {
  class TestModelViewer extends HTMLElement {
    duration = 3;
    currentTime = 0;
    availableAnimations = ["Fold"];
    updateComplete = Promise.resolve(true);
    pause = vi.fn();
    jumpCameraToGoal = vi.fn();
  }
  if (!customElements.get("model-viewer")) {
    customElements.define("model-viewer", TestModelViewer);
  }
  return {};
});

let frames: Map<number, FrameRequestCallback>;
let media: EventTarget & { matches: boolean };

beforeEach(() => {
  frames = new Map();
  let id = 0;
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => media),
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((frame: number) => frames.delete(frame)),
  );
});

afterEach(() => vi.unstubAllGlobals());

function step(time: number) {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(time));
  });
}

async function waitForViewer() {
  await waitFor(() =>
    expect(document.querySelector("model-viewer")).not.toBeNull(),
  );
  return document.querySelector("model-viewer")!;
}

async function readyDemo() {
  const result = render(<FoldingDemo />);
  const viewer = await waitForViewer();
  act(() => viewer.dispatchEvent(new Event("load")));
  return { ...result, viewer };
}

describe("Blender folding lesson", () => {
  it("waits for the local animated asset and starts flat without playback", async () => {
    render(<FoldingDemo />);
    expect(screen.getByRole("button", { name: "접기" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "접힌 정도" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "시점 초기화" })).toBeDisabled();

    const viewer = await waitForViewer();
    expect(viewer.getAttribute("src")).toBe(
      "/dev/blender-assets/cuboid-fold.glb",
    );
    expect(viewer.autoplay).toBe(false);
    expect(viewer.hasAttribute("auto-rotate")).toBe(false);
    act(() => viewer.dispatchEvent(new Event("load")));

    expect(screen.getByRole("button", { name: "접기" })).toBeEnabled();
    expect(viewer.currentTime).toBe(0);
    expect(frames.size).toBe(0);
    expect(screen.getByRole("status")).toHaveTextContent("준비되었습니다");
  });

  it("seeks by the clip duration, pauses on scrub, and keeps 100% inside the clip end", async () => {
    const { viewer } = await readyDemo();
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    step(0);
    step(3000);
    expect(viewer.currentTime).toBe(1.5);

    const slider = screen.getByRole("slider", { name: "접힌 정도" });
    fireEvent.change(slider, { target: { value: "25" } });
    expect(viewer.currentTime).toBe(0.75);
    expect(frames.size).toBe(0);
    step(9000);
    expect(viewer.currentTime).toBe(0.75);

    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    step(10000);
    step(20000);
    expect(slider).toHaveValue("100");
    expect(viewer.currentTime).toBeLessThan(viewer.duration);
    expect(viewer.currentTime).toBeCloseTo(viewer.duration, 2);
    expect(frames.size).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "펼치기" }));
    step(21000);
    step(27000);
    expect(slider).toHaveValue("0");
    expect(viewer.currentTime).toBe(0);
  });

  it("pauses as soon as keyboard scrubbing starts", async () => {
    const { viewer } = await readyDemo();
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    step(0);
    step(2000);
    const pausedTime = viewer.currentTime;
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowRight" });
    step(6000);
    expect(frames.size).toBe(0);
    expect(viewer.currentTime).toBe(pausedTime);
  });

  it("uses immediate poses with reduced motion and cancels playback when the preference changes", async () => {
    const { viewer } = await readyDemo();
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    step(0);
    step(1000);
    act(() => {
      media.matches = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    expect(screen.getByRole("slider")).toHaveValue("100");
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "펼치기" }));
    expect(viewer.currentTime).toBe(0);
    expect(viewer.interpolationDecay).toBe(0);
  });

  it("recovers from a loading error with a fresh viewer and ignores stale load events", async () => {
    render(<FoldingDemo />);
    const first = await waitForViewer();
    act(() => first.dispatchEvent(new Event("error")));
    expect(screen.getByRole("button", { name: "접기" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("불러오지 못했습니다");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    const second = await waitForViewer();
    expect(second).not.toBe(first);
    expect(second.getAttribute("src")).toContain("?retry=1");
    act(() => first.dispatchEvent(new Event("load")));
    expect(screen.getByRole("slider")).toBeDisabled();
    act(() => second.dispatchEvent(new Event("load")));
    expect(screen.getByRole("slider")).toBeEnabled();
  });

  it("treats an asset without the Fold clip as an error", async () => {
    render(<FoldingDemo />);
    const viewer = await waitForViewer();
    Object.defineProperty(viewer, "availableAnimations", { value: ["Other"] });
    act(() => viewer.dispatchEvent(new Event("load")));
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeEnabled();
    expect(screen.getByRole("slider")).toBeDisabled();
  });

  it("opens the authored XY net face-on and restores the default camera without changing the fold", async () => {
    const { viewer } = await readyDemo();
    fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "전개도 위에서 보기" }),
      ),
    );
    expect(viewer.currentTime).toBe(0);
    expect(viewer.cameraOrbit).toBe("0deg 90deg 105%");
    expect(viewer.cameraTarget).toBe("0m 0m -0.015m");
    fireEvent.change(screen.getByRole("slider"), { target: { value: "60" } });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "시점 초기화" })),
    );
    expect(viewer.currentTime).toBeCloseTo(1.8);
    expect(viewer.cameraOrbit).toBe("25deg 65deg 105%");
    expect(viewer.fieldOfView).toBe("30deg");
  });

  it("cleans up the viewer and pending animation under Strict Mode", async () => {
    const { unmount } = render(
      <StrictMode>
        <FoldingDemo />
      </StrictMode>,
    );
    const viewer = await waitForViewer();
    act(() => viewer.dispatchEvent(new Event("load")));
    expect(document.querySelectorAll("model-viewer")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "접기" }));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(viewer.isConnected).toBe(false);
  });
});
