// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPdf,
  buildPdfBatch,
  PdfPayloadSchema,
} from "@/lib/export/pdfServer";

const m = vi.hoisted(() => ({ launch: vi.fn() }));
vi.mock("puppeteer-core", () => ({ default: { launch: m.launch } }));
vi.mock("@sparticuz/chromium-min", () => ({
  default: { args: [], executablePath: vi.fn() },
}));

const origin = "https://math.example.test";
const payload = (index: number) =>
  PdfPayloadSchema.parse({
    html: `<article data-unified-paper>${index}</article>`,
    fontPolicy: "self-hosted",
    landscape: index === 1,
  });
const bytes = (index: number) => new Uint8Array([index]);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function fakePage(render: () => Promise<Uint8Array>, close: () => void) {
  return {
    setJavaScriptEnabled: vi.fn(async () => {}),
    setRequestInterception: vi.fn(async () => {}),
    on: vi.fn(),
    emulateMediaType: vi.fn(async () => {}),
    setContent: vi.fn(async () => {}),
    evaluate: vi.fn(async () => undefined),
    pdf: vi.fn(render),
    close: vi.fn(async () => close()),
  };
}
function fakeBrowser(
  render: (index: number) => Promise<Uint8Array> = async (index) =>
    bytes(index),
) {
  const pages: ReturnType<typeof fakePage>[] = [];
  let active = 0;
  let peak = 0;
  return {
    pages,
    get active() {
      return active;
    },
    get peak() {
      return peak;
    },
    newPage: vi.fn(async () => {
      const index = pages.length;
      active++;
      peak = Math.max(peak, active);
      const page = fakePage(
        () => render(index),
        () => {
          active--;
        },
      );
      pages.push(page);
      return page;
    }),
    close: vi.fn(async () => {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.launch.mockReset();
  vi.stubEnv("PDF_CHROMIUM_EXECUTABLE", "/mock/chromium");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("bounded server PDF batch with mocked Chromium", () => {
  it("keeps input order with one browser and at most three open pages, replenishing each free slot", async () => {
    const holds = Array.from({ length: 7 }, () => deferred<Uint8Array>());
    const browser = fakeBrowser((index) => holds[index].promise);
    m.launch.mockResolvedValue(browser);
    const inputs = holds.map((_, index) => vi.fn(async () => payload(index)));
    const pending = buildPdfBatch(inputs, origin);

    await vi.waitFor(() => expect(browser.pages).toHaveLength(3));
    expect(m.launch).toHaveBeenCalledTimes(1);
    expect(inputs[3]).not.toHaveBeenCalled();
    for (const [index, count] of [
      [1, 4],
      [3, 5],
      [4, 6],
      [2, 7],
    ]) {
      holds[index].resolve(bytes(index));
      await vi.waitFor(() => expect(browser.pages).toHaveLength(count));
      expect(browser.peak).toBe(3);
    }
    for (const index of [6, 5, 0]) holds[index].resolve(bytes(index));
    expect(await pending).toEqual(holds.map((_, index) => bytes(index)));
    expect(browser.active).toBe(0);
    expect(browser.close).toHaveBeenCalledTimes(1);
    for (const page of browser.pages) {
      expect(page.close).toHaveBeenCalledTimes(1);
      expect(page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
      expect(page.setRequestInterception).toHaveBeenCalledWith(true);
      expect(page.emulateMediaType).toHaveBeenCalledWith("print");
      expect(page.pdf).toHaveBeenCalledWith(
        expect.objectContaining({ format: "A4", printBackground: true }),
      );
    }
    expect(browser.pages[1].pdf).toHaveBeenCalledWith(
      expect.objectContaining({ landscape: true }),
    );
  });

  it("returns archived bytes unchanged and skips Chromium for empty or archive-only batches", async () => {
    const archived = bytes(90);
    expect(await buildPdfBatch([], origin)).toEqual([]);
    const result = await buildPdfBatch([async () => archived], origin);
    expect(result[0]).toBe(archived);
    expect(m.launch).not.toHaveBeenCalled();
  });

  it("rejects the whole batch on source failure before any browser is needed", async () => {
    const error = new Error("archive read failed");
    await expect(
      buildPdfBatch(
        [
          async () => {
            throw error;
          },
        ],
        origin,
      ),
    ).rejects.toBe(error);
    expect(m.launch).not.toHaveBeenCalled();
  });

  it("shares a failed browser launch and does not schedule later inputs", async () => {
    const error = new Error("launch failed");
    m.launch.mockRejectedValue(error);
    const inputs = Array.from({ length: 6 }, (_, index) =>
      vi.fn(async () => payload(index)),
    );
    await expect(buildPdfBatch(inputs, origin)).rejects.toBe(error);
    expect(m.launch).toHaveBeenCalledTimes(1);
    expect(inputs[3]).not.toHaveBeenCalled();
  });

  it.each(["newPage", "prepare", "pdf"])(
    "closes every created page and the shared browser after %s fails",
    async (stage) => {
      const error = new Error(`${stage} failed`);
      const browser = fakeBrowser();
      if (stage === "newPage") browser.newPage.mockRejectedValueOnce(error);
      else {
        const create = browser.newPage.getMockImplementation()!;
        browser.newPage.mockImplementationOnce(async () => {
          const page = await create();
          if (stage === "prepare") page.setContent.mockRejectedValueOnce(error);
          else page.pdf.mockRejectedValueOnce(error);
          return page;
        });
      }
      m.launch.mockResolvedValue(browser);
      const inputs = Array.from({ length: 6 }, (_, index) =>
        vi.fn(async () => payload(index)),
      );
      await expect(buildPdfBatch(inputs, origin)).rejects.toBe(error);
      expect(inputs[3]).not.toHaveBeenCalled();
      expect(browser.close).toHaveBeenCalledTimes(1);
      for (const page of browser.pages)
        expect(page.close).toHaveBeenCalledTimes(1);
    },
  );

  it("stops new work after one failure, awaits active pages, and preserves the first error through cleanup", async () => {
    const holds = Array.from({ length: 3 }, () => deferred<Uint8Array>());
    const browser = fakeBrowser((index) => holds[index].promise);
    m.launch.mockResolvedValue(browser);
    const inputs = Array.from({ length: 6 }, (_, index) =>
      vi.fn(async () => payload(index)),
    );
    const error = new Error("student PDF failed");
    const pending = buildPdfBatch(inputs, origin);
    const rejected = expect(pending).rejects.toBe(error);
    await vi.waitFor(() =>
      expect(
        browser.pages.filter((page) => page.pdf.mock.calls.length),
      ).toHaveLength(3),
    );
    browser.pages[0].close.mockRejectedValueOnce(
      new Error("page close failed"),
    );
    holds[0].reject(error);
    await vi.waitFor(() => expect(browser.pages[0].close).toHaveBeenCalled());
    expect(browser.close).not.toHaveBeenCalled();
    expect(inputs[3]).not.toHaveBeenCalled();
    holds[1].resolve(bytes(1));
    holds[2].reject(new Error("another student PDF failed"));
    await rejected;
    expect(browser.close).toHaveBeenCalledTimes(1);
    for (const page of browser.pages)
      expect(page.close).toHaveBeenCalledTimes(1);
  });

  it("rejects cleanup failures instead of returning a partial success", async () => {
    const browser = fakeBrowser();
    const error = new Error("browser close failed");
    browser.close.mockRejectedValue(error);
    m.launch.mockResolvedValue(browser);
    await expect(buildPdfBatch([async () => payload(0)], origin)).rejects.toBe(
      error,
    );
    expect(browser.pages[0].close).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("keeps the per-PDF timeout and closes the browser once when rendering stalls", async () => {
    vi.useFakeTimers();
    const holds = Array.from({ length: 3 }, () => deferred<Uint8Array>());
    const browser = fakeBrowser((index) => holds[index].promise);
    const error = new Error("Target closed");
    browser.close.mockImplementation(async () => {
      for (const hold of holds) hold.reject(error);
    });
    m.launch.mockResolvedValue(browser);
    const inputs = Array.from({ length: 6 }, (_, index) =>
      vi.fn(async () => payload(index)),
    );
    const pending = buildPdfBatch(inputs, origin);
    const rejected = expect(pending).rejects.toBe(error);
    await vi.waitFor(() =>
      expect(
        browser.pages.filter((page) => page.pdf.mock.calls.length),
      ).toHaveLength(3),
    );
    await vi.advanceTimersByTimeAsync(60000);
    await rejected;
    expect(inputs[3]).not.toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalledTimes(1);
    for (const page of browser.pages)
      expect(page.close).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains the single-PDF pipeline and browser cleanup", async () => {
    const browser = fakeBrowser();
    m.launch.mockResolvedValue(browser);
    expect(await buildPdf(payload(1), origin)).toEqual(bytes(0));
    expect(browser.newPage).toHaveBeenCalledTimes(1);
    expect(browser.pages[0].pdf).toHaveBeenCalledWith(
      expect.objectContaining({ landscape: true }),
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });
});
