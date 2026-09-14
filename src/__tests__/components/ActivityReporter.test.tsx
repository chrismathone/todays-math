import { fireEvent, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ActivityReporter from "@/components/account/ActivityReporter";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
const fetchMock = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: vi.fn(() => true),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("private activity reporting", () => {
  it("records action labels without collecting input values", async () => {
    const screen = render(
      <>
        <ActivityReporter userId="owner-1" />
        <label htmlFor="password">비밀번호</label>
        <input id="password" type="password" />
        <button>자료 저장</button>
      </>,
    );
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "do-not-log-this" },
    });
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.ownerId).toBe("owner-1");
    expect(body.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "click", label: "자료 저장" }),
        expect.objectContaining({ action: "change", label: "비밀번호" }),
      ]),
    );
    expect(JSON.stringify(body)).not.toContain("do-not-log-this");
    screen.unmount();
  });
  it("stops sending old-owner events after session mismatch", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    const screen = render(
      <>
        <ActivityReporter userId="old-owner" />
        <button>저장</button>
      </>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    screen.unmount();
  });
});
