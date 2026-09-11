import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StackCubesDemo } from "@/app/dev/blender/stack-cubes/StackCubesDemo";

// Verify the viewer's public control contract; the coordinator checks the
// actual Blender geometry, framing, and SVG alignment in the browser.
vi.mock("@google/model-viewer", () => {
  class TestModelViewer extends HTMLElement {
    duration = 1;
    currentTime = 0;
    availableAnimations = ["Separate"];
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
  const result = render(<StackCubesDemo />);
  const viewer = await waitForViewer();
  act(() => viewer.dispatchEvent(new Event("load")));
  return { ...result, viewer };
}

describe("Blender stacking-cubes lesson", () => {
  it("waits for the asset, starts stacked without autoplay, and reveals the answer only on request", async () => {
    render(<StackCubesDemo />);
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
    expect(screen.getByRole("slider", { name: "층 벌리기" })).toBeDisabled();
    expect(screen.queryByText("모두 12개예요.")).not.toBeInTheDocument();
    const viewer = await waitForViewer();
    expect(viewer.getAttribute("src")).toBe(
      "/dev/blender-assets/stack-cubes/stack-cubes.glb",
    );
    expect(viewer.animationName).toBe("Separate");
    expect(viewer.autoplay).toBe(false);
    expect(viewer.hasAttribute("auto-rotate")).toBe(false);
    act(() => viewer.dispatchEvent(new Event("load")));
    expect(viewer.currentTime).toBe(0);
    expect(viewer.cameraControls).toBe(true);
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "정답 보기" }));
    expect(screen.getByText("모두 12개예요.")).toBeVisible();
    expect(
      screen.getByText("1층 8개, 2층 3개, 3층 1개를 더해요."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "정답 닫기" }));
    expect(screen.queryByText("모두 12개예요.")).not.toBeInTheDocument();
  });

  it("seeks the actual clip, reverses from the current pose, and cancels playback on keyboard scrubbing", async () => {
    const { viewer } = await readyDemo();
    const slider = screen.getByRole("slider");
    fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
    step(0);
    step(500);
    expect(viewer.currentTime).toBe(0.5);
    fireEvent.click(screen.getByRole("button", { name: "다시 쌓기" }));
    step(600);
    step(850);
    expect(viewer.currentTime).toBe(0.25);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(frames.size).toBe(0);
    fireEvent.change(slider, { target: { value: "60" } });
    step(2000);
    expect(viewer.currentTime).toBe(0.6);
    fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
    step(3000);
    step(3400);
    expect(slider).toHaveValue("100");
    expect(viewer.currentTime).toBeCloseTo(0.999, 5);
    expect(viewer.currentTime).toBeLessThan(viewer.duration);
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "다시 쌓기" }));
    step(4000);
    step(5000);
    expect(viewer.currentTime).toBe(0);
  });

  it("stacks before directional inspection and uses matching Y-up front, right, and top cameras", async () => {
    const { viewer } = await readyDemo();
    for (const [name, orbit] of [
      ["위", "0deg 0deg 0.13m"],
      ["앞", "0deg 90deg 0.13m"],
      ["오른쪽", "90deg 90deg 0.13m"],
    ]) {
      fireEvent.change(screen.getByRole("slider"), { target: { value: "75" } });
      fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
      await act(async () =>
        fireEvent.click(screen.getByRole("button", { name, exact: true })),
      );
      expect(frames.size).toBe(0);
      expect(viewer.currentTime).toBe(0);
      expect(viewer.cameraOrbit).toBe(orbit);
      expect(viewer.cameraTarget).toBe("0m 0.018m 0m");
      expect(screen.getByRole("status")).toHaveTextContent("0%로 되돌렸습니다");
    }
    fireEvent.change(screen.getByRole("slider"), { target: { value: "60" } });
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "입체", exact: true }),
      ),
    );
    expect(viewer.currentTime).toBe(0.6);
    expect(viewer.cameraOrbit).toBe("30deg 60deg 0.13m");
  });

  it("respects reduced motion for animation and camera changes, including a live preference change", async () => {
    const { viewer } = await readyDemo();
    fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
    step(0);
    step(300);
    act(() => {
      media.matches = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(frames.size).toBe(0);
    expect(viewer.interpolationDecay).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
    expect(screen.getByRole("slider")).toHaveValue("100");
    fireEvent.click(screen.getByRole("button", { name: "다시 쌓기" }));
    expect(viewer.currentTime).toBe(0);
    expect(frames.size).toBe(0);
    vi.mocked(viewer.jumpCameraToGoal).mockClear();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "위", exact: true })),
    );
    expect(viewer.jumpCameraToGoal).toHaveBeenCalledOnce();
  });

  it("rejects an invalid clip, retries with a fresh viewer, and ignores stale events after failure", async () => {
    render(<StackCubesDemo />);
    const first = await waitForViewer();
    Object.defineProperty(first, "availableAnimations", { value: ["Other"] });
    act(() => first.dispatchEvent(new Event("load")));
    expect(screen.getByRole("slider")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    const second = await waitForViewer();
    expect(second).not.toBe(first);
    expect(second.getAttribute("src")).toContain("?retry=1");
    act(() => first.dispatchEvent(new Event("load")));
    expect(screen.getByRole("slider")).toBeDisabled();
    act(() => second.dispatchEvent(new Event("load")));
    expect(screen.getByRole("slider")).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
    act(() => second.dispatchEvent(new Event("error")));
    expect(frames.size).toBe(0);
    expect(second.isConnected).toBe(false);
    expect(screen.getByRole("slider")).toBeDisabled();
  });

  it("cleans up its viewer and pending animation under Strict Mode", async () => {
    const { unmount } = render(
      <StrictMode>
        <StackCubesDemo />
      </StrictMode>,
    );
    const viewer = await waitForViewer();
    act(() => viewer.dispatchEvent(new Event("load")));
    expect(document.querySelectorAll("model-viewer")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "층 벌리기" }));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
    expect(viewer.isConnected).toBe(false);
  });
});
