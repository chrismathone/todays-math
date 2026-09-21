/**
 * 관문과 활동 기록기는 랩실 판정을 **같은 원천 하나**(src/lib/labPath.ts)에서 받는다 (트랙 53).
 *
 * 두 벌로 쓰면 한쪽만 고쳐지는 날이 온다 — 트랙 52 가 관문의 `startsWith("/lab")` 을 `/lab` 과 그 아래로
 * 좁혔을 때처럼. 그래서 판정 함수를 갈아 끼워 **둘 다 따라오는지** 본다:
 * 가짜 경로 `/zz-sentinel` 을 랩실이라 하고 진짜 `/lab` 을 아니라 하면, 관문은 `/zz-sentinel` 을
 * 감사 없이 보내고 `/lab` 은 감사하며, 기록기는 `/zz-sentinel` 에서 조용하고 `/lab` 에서 보낸다.
 * 어느 쪽이든 판정을 제 손으로 다시 쓰면 여기서 빨갛게 된다.
 */
import { render } from "@testing-library/react";
import { act } from "react";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { session, nav } = vi.hoisted(() => ({
  session: vi.fn(),
  nav: { pathname: "/" },
}));
vi.mock("@/lib/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => (request: NextRequest) =>
    handler(Object.assign(request, { auth: session() })),
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("@/lib/labPath", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/labPath")>();
  return { isLabPath: vi.fn(real.isLabPath) };
});

import ActivityReporter from "@/components/account/ActivityReporter";
import { ALL_WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import { recordAudit } from "@/lib/audit";
import { isLabPath } from "@/lib/labPath";
import { proxy } from "@/proxy";

const SENTINEL = "/zz-sentinel";
const swapped = (pathname: string) => pathname === SENTINEL;

async function gate(method: string, path: string) {
  const call = proxy as unknown as (r: NextRequest) => Promise<Response>;
  vi.mocked(recordAudit).mockClear();
  const res = await call(
    new NextRequest(`http://localhost${path}`, { method }),
  );
  return {
    passed: res.headers.get("x-middleware-next") === "1",
    audited: vi.mocked(recordAudit).mock.calls.length > 0,
  };
}

const fetchMock = vi.fn();

async function reporterSends(path: string): Promise<boolean> {
  window.history.pushState(null, "", path);
  nav.pathname = path;
  fetchMock.mockClear();
  const screen = render(
    <>
      <ActivityReporter userId="u-director" />
      <button>다음</button>
    </>,
  );
  screen.getByRole("button").click();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  screen.unmount();
  return fetchMock.mock.calls.length > 0;
}

beforeEach(() => {
  vi.useFakeTimers();
  session.mockReset().mockReturnValue({
    user: {
      id: "u-director",
      approvalStatus: "approved",
      isAdmin: true,
      menus: ALL_WORKSPACE_MENUS,
    },
  });
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: vi.fn(() => true),
  });
});
afterEach(() => {
  vi.mocked(isLabPath).mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("랩실 판정은 한 원천 — 관문과 활동 기록기", () => {
  it("진짜 판정일 때: /lab 은 둘 다 조용하고 /studio 는 둘 다 기록한다", async () => {
    const real =
      await vi.importActual<typeof import("@/lib/labPath")>("@/lib/labPath");
    vi.mocked(isLabPath).mockImplementation(real.isLabPath);
    expect(await gate("GET", "/lab")).toEqual({ passed: true, audited: false });
    expect(await gate("GET", "/studio")).toEqual({
      passed: true,
      audited: true,
    });
    expect(await reporterSends("/lab")).toBe(false);
    expect(await reporterSends("/studio")).toBe(true);
  });

  it("🔴 판정을 갈아 끼우면 둘 다 따라온다", async () => {
    vi.mocked(isLabPath).mockImplementation(swapped);
    expect(await gate("GET", SENTINEL)).toEqual({
      passed: true,
      audited: false,
    });
    expect(await gate("GET", "/lab")).toEqual({ passed: true, audited: true });
    expect(await reporterSends(SENTINEL)).toBe(false);
    expect(await reporterSends("/lab")).toBe(true);
  });

  it("관문은 여기에 읽기 조건을 더한다 — POST 는 판정이 참이어도 랩실 길을 안 탄다", async () => {
    vi.mocked(isLabPath).mockImplementation(swapped);
    expect(await gate("POST", SENTINEL)).toEqual({
      passed: true,
      audited: true,
    });
  });
});
