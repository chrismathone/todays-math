// @vitest-environment node
// 결함 2(2026-09-18): 비교 사진마다 Chrome 을 새로 띄웠다. 한 번 띄운 브라우저를 재사용하고,
// 한동안 안 쓰면 닫고, 끊기면 다시 띄운다. 취소·시간 초과는 그 요청의 페이지만 닫는다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { launchExportBrowser } from "@/lib/export/pdfServer";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/export/pdfServer", () => ({ launchExportBrowser: vi.fn() }));

const original = "data:image/png;base64,YQ==";
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><path d="M0 0L9 9" stroke="black"/></svg>';

function gate() {
  let open!: () => void;
  const promise = new Promise<void>((resolve) => (open = resolve));
  return { open, promise };
}

type FakePage = ReturnType<typeof fakePage>;
function fakePage(hold?: ReturnType<typeof gate>) {
  const page = {
    closed: false,
    setJavaScriptEnabled: vi.fn(async () => {}),
    setViewport: vi.fn(async () => {}),
    setRequestInterception: vi.fn(async () => {}),
    on: vi.fn(),
    setContent: vi.fn<(html?: string) => Promise<void>>(async () => {
      if (hold) await hold.promise;
      if (page.closed) throw new Error("Target closed");
    }),
    evaluate: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => {}),
    screenshot: vi.fn(async () => "cGln"),
    close: vi.fn(async () => {
      page.closed = true;
      hold?.open();
    }),
  };
  return page;
}

function fakeBrowser(nextHold?: () => ReturnType<typeof gate> | undefined) {
  const listeners = new Map<string, Set<() => void>>();
  const emit = (event: string) => {
    for (const listener of listeners.get(event) ?? []) listener();
    listeners.delete(event);
  };
  const pages: FakePage[] = [];
  const browser = {
    connected: true,
    pages,
    newPage: vi.fn(async () => {
      const page = fakePage(nextHold?.());
      pages.push(page);
      return page;
    }),
    close: vi.fn(async () => {
      browser.connected = false;
      emit("disconnected");
    }),
    crash: () => {
      browser.connected = false;
      emit("disconnected");
    },
    once: (event: string, listener: () => void) => {
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener));
      return browser;
    },
    on: (event: string, listener: () => void) => browser.once(event, listener),
    off: (event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener);
      return browser;
    },
  };
  return browser;
}

const launch = vi.mocked(launchExportBrowser);

async function harness() {
  const { buildFigureComparisonImage, closeFigureComparisonBrowser } =
    await import("@/lib/dev-ai/figure-comparison");
  return {
    build: buildFigureComparisonImage,
    close: closeFigureComparisonBrowser,
  };
}

describe("comparison browser reuse", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it("launches one browser for consecutive and concurrent comparisons, one page each", async () => {
    const browser = fakeBrowser();
    launch.mockResolvedValue(browser as never);
    const { build, close } = await harness();
    expect(await build(original, svg)).toBe("data:image/png;base64,cGln");
    await build(original, svg);
    await Promise.all([build(original, svg), build(original, svg)]);
    expect(launch).toHaveBeenCalledTimes(1);
    expect(browser.newPage).toHaveBeenCalledTimes(4);
    expect(browser.pages.every((page) => page.closed)).toBe(true);
    expect(browser.close).not.toHaveBeenCalled();
    await close();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("relaunches after the browser dies or is closed", async () => {
    const first = fakeBrowser();
    const second = fakeBrowser();
    launch
      .mockResolvedValueOnce(first as never)
      .mockResolvedValueOnce(second as never);
    const { build } = await harness();
    await build(original, svg);
    first.crash();
    await build(original, svg);
    expect(launch).toHaveBeenCalledTimes(2);
    expect(second.newPage).toHaveBeenCalledTimes(1);
  });

  it("closes an idle browser after a while and relaunches on the next request", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    const holds: ReturnType<typeof gate>[] = [];
    const first = fakeBrowser(() => holds.shift());
    const second = fakeBrowser();
    launch
      .mockResolvedValueOnce(first as never)
      .mockResolvedValueOnce(second as never);
    const { build } = await harness();
    await build(original, svg);
    // 쓰는 중에는 닫지 않는다
    const hold = gate();
    holds.push(hold);
    const inFlight = build(original, svg);
    await vi.waitFor(() => expect(first.newPage).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(20_000);
    expect(first.close).not.toHaveBeenCalled();
    hold.open();
    await inFlight;
    expect(first.close).not.toHaveBeenCalled();
    // 한동안 안 쓰면 닫는다
    await vi.advanceTimersByTimeAsync(120_000);
    expect(first.close).toHaveBeenCalledTimes(1);
    await build(original, svg);
    expect(launch).toHaveBeenCalledTimes(2);
    expect(second.newPage).toHaveBeenCalledTimes(1);
  });

  it("cancellation closes only that request's page and keeps the browser for others", async () => {
    const hold = gate();
    const browser = fakeBrowser(() => hold);
    launch.mockResolvedValue(browser as never);
    const { build } = await harness();
    const controller = new AbortController();
    const cancelled = build(original, svg, controller.signal).catch(
      (error: Error) => error,
    );
    await vi.waitFor(() => expect(browser.newPage).toHaveBeenCalledTimes(1));
    controller.abort();
    expect(await cancelled).toMatchObject({ code: "cancelled" });
    expect(browser.pages[0].closed).toBe(true);
    expect(browser.close).not.toHaveBeenCalled();
    const stopped = new AbortController();
    stopped.abort();
    await expect(build(original, svg, stopped.signal)).rejects.toMatchObject({
      code: "cancelled",
    });
    expect(browser.newPage).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("does not remember a failed launch", async () => {
    const browser = fakeBrowser();
    launch
      .mockRejectedValueOnce(
        new Error("PDF 생성용 Chromium 경로가 필요합니다."),
      )
      .mockResolvedValueOnce(browser as never);
    const { build } = await harness();
    await expect(build(original, svg)).rejects.toThrow("Chromium");
    await expect(build(original, svg)).resolves.toContain("data:image/png");
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("annotates a detected lattice only in the derivative and labels the other panel unknown", async () => {
    const gray = new Array<number>(10000).fill(255);
    for (let i = 10; i <= 90; i += 10) for (let j = 10; j <= 90; j++) {
      gray[j * 100 + i] = 40; gray[i * 100 + j] = 40;
    }
    const page = fakePage(), browser = fakeBrowser();
    page.evaluate.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
      gray, width: 100, height: 100, naturalWidth: 100, naturalHeight: 100,
    }).mockResolvedValueOnce(null).mockResolvedValueOnce(undefined);
    browser.newPage.mockResolvedValue(page);
    launch.mockResolvedValue(browser as never);
    const { build, close } = await harness();
    await build(original, svg);
    const overlays = page.evaluate.mock.calls[3]![1];
    expect(overlays).toEqual([expect.objectContaining({
      legend: expect.stringContaining("원문 좌표 아님"),
      ticks: expect.any(Array),
    }), null]);
    expect(page.setContent.mock.calls[0]![0]).toContain(`<img src="${original}">`);
    expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(page.closed).toBe(true);
    expect(browser.newPage).toHaveBeenCalledTimes(1);
    await close();
  });
});
