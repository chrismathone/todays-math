/**
 * 수학 랩실에서는 활동 기록을 안 보낸다 — src/components/account/ActivityReporter.tsx (트랙 53).
 *
 * 원장님 결정(2026-09-21, D-135 ⑼): `/lab` 은 누구나 열고 **감사 기록 없이**. 관문의 요청 감사는
 * 트랙 52 가 없앴지만, 루트 레이아웃의 활동 기록기가 로그인한 계정의 클릭·이동을
 * `/api/account/activity` 로 보내 DB(`accountAuditLog`)에 계속 쓰고 있었다. 랩실은 누르는 일이 많다
 * (칸 칠하기 · 다음 · 도움). 판정은 관문과 같은 `isLabPath` 하나다(labPathSharedSource.test.tsx).
 *
 * 🔴 랩실 **밖** 화면의 기록은 그대로여야 한다 — 랩실에서 나가면 다시 보내고, 랩실로 들어가기 직전의
 *    기록도 잃지 않는다. 경계는 관문과 같다(`/labx` · `/label` 은 랩실이 아니다).
 */
import { fireEvent, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ActivityReporter from "@/components/account/ActivityReporter";

const { nav } = vi.hoisted(() => ({ nav: { pathname: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

type Row = { action: string; label: string; path: string };

const fetchMock = vi.fn();
const beaconMock = vi.fn((_url: string, _data?: BodyInit | null) => true);

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  beaconMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: beaconMock,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
  nav.pathname = "/";
});

/** 화면 이동 — 주소창(기록기가 행의 path 로 읽는 것)과 usePathname 을 같이 옮긴다. */
function go(path: string) {
  window.history.pushState(null, "", path);
  nav.pathname = path.split(/[?#]/)[0];
}

function Page() {
  return (
    <>
      <ActivityReporter userId="owner-1" />
      <button>칸 칠하기</button>
      <input aria-label="답" />
      <form onSubmit={(e) => e.preventDefault()}>
        <button type="submit">확인</button>
      </form>
    </>
  );
}

/** 보낸 행 전부 — fetch 와 sendBeacon 둘 다. */
async function sentRows(): Promise<Row[]> {
  const bodies: string[] = fetchMock.mock.calls.map(
    (call) => (call[1] as RequestInit).body as string,
  );
  for (const [, data] of beaconMock.mock.calls)
    bodies.push(
      await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsText(data as Blob);
      }),
    );
  return bodies.flatMap(
    (body) => (JSON.parse(body) as { events: Row[] }).events,
  );
}

/** 한 화면에서 할 수 있는 일을 다 한다 — 누르기 · 입력 · 제출 · 해시 · 뒤로 · 인쇄. */
function doEverything(screen: ReturnType<typeof render>) {
  fireEvent.click(screen.getByRole("button", { name: "칸 칠하기" }));
  fireEvent.change(screen.getByLabelText("답"), { target: { value: "12" } });
  fireEvent.click(screen.getByRole("button", { name: "확인" }));
  fireEvent.submit(
    screen.getByRole("button", { name: "확인" }).closest("form")!,
  );
  window.dispatchEvent(new Event("hashchange"));
  window.dispatchEvent(new Event("popstate"));
  window.dispatchEvent(new Event("beforeprint"));
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("랩실에서는 활동 기록을 안 보낸다 (D-135 ⑼)", () => {
  it.each([
    "/lab",
    "/lab/",
    "/lab/teacher",
    "/lab/play/area",
    "/lab/play/space#s3",
  ])(
    "%s — 열고 · 누르고 · 입력하고 · 떠나도 한 줄도 안 보낸다",
    async (path) => {
      go(path);
      const screen = render(<Page />);
      doEverything(screen);
      await wait(5000);
      window.dispatchEvent(new Event("pagehide"));
      screen.unmount();
      await wait(5000);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(beaconMock).not.toHaveBeenCalled();
    },
  );
});

describe("🔴 랩실 밖 화면의 기록은 그대로", () => {
  it.each(["/", "/studio", "/labels", "/labx", "/laboratory", "/lab-notes"])(
    "%s — 열기와 누르기를 보낸다(관문과 같은 경계)",
    async (path) => {
      go(path);
      const screen = render(<Page />);
      fireEvent.click(screen.getByRole("button", { name: "칸 칠하기" }));
      await wait(650);
      expect(await sentRows()).toEqual([
        expect.objectContaining({
          action: "navigate",
          label: "화면 열기",
          path,
        }),
        expect.objectContaining({ action: "click", label: "칸 칠하기", path }),
      ]);
      screen.unmount();
    },
  );

  it("랩실에서 다른 화면으로 옮겨 가면 다시 보낸다", async () => {
    go("/lab/play/area");
    const screen = render(<Page />);
    doEverything(screen);
    await wait(5000);
    expect(fetchMock).not.toHaveBeenCalled();

    go("/studio");
    screen.rerender(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "칸 칠하기" }));
    fireEvent.change(screen.getByLabelText("답"), { target: { value: "3" } });
    await wait(650);

    const rows = await sentRows();
    expect(rows.map((r) => r.path)).toEqual(rows.map(() => "/studio"));
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "navigate", path: "/studio" }),
        expect.objectContaining({ action: "click", label: "칸 칠하기" }),
        expect.objectContaining({ action: "change", label: "답" }),
      ]),
    );
    screen.unmount();
  });

  it("랩실로 들어가기 직전의 기록은 잃지 않고, 랩실 안의 일은 안 보낸다", async () => {
    go("/studio");
    const screen = render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "칸 칠하기" }));
    // 보내기 전(600ms)에 랩실로 들어간다.
    go("/lab");
    screen.rerender(<Page />);
    doEverything(screen);
    await wait(5000);
    screen.unmount();
    await wait(5000);

    const rows = await sentRows();
    expect(rows).toEqual([
      expect.objectContaining({
        action: "navigate",
        label: "화면 열기",
        path: "/studio",
      }),
      expect.objectContaining({
        action: "click",
        label: "칸 칠하기",
        path: "/studio",
      }),
    ]);
  });

  it("랩실을 다녀와도 같은 화면에서 전처럼 보낸다", async () => {
    go("/studio");
    const screen = render(<Page />);
    await wait(650);
    go("/lab/play/area");
    screen.rerender(<Page />);
    doEverything(screen);
    await wait(5000);
    go("/studio");
    screen.rerender(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "칸 칠하기" }));
    await wait(650);

    const rows = await sentRows();
    expect(rows.every((r) => r.path === "/studio")).toBe(true);
    expect(rows.filter((r) => r.action === "click")).toHaveLength(1);
    screen.unmount();
  });
});
