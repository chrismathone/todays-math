// @vitest-environment jsdom
import { Blob as NodeBlob } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { exportPreviewPdf } from "@/lib/export/pdfClient";
import { PDF_REQUEST_MAX_BYTES } from "@/lib/export/pdfLimits";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Blob", NodeBlob);
  fetchMock.mockReset();
});
afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
function fixture(count: number, text = "회차와 문항") {
  const root = document.createElement("div");
  root.dataset.mathgenDocument = "true";
  root.dataset.template = "yuhyung";
  root.style.setProperty("--paper-font-serif", "Batang");
  for (let i = 0; i < count; i++) {
    const page = document.createElement("article");
    page.dataset.unifiedPaper = "true";
    page.dataset.order = String(i + 1);
    page.textContent = text;
    root.append(page);
  }
  document.body.append(root);
  return root;
}
function parse(body: string) {
  expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(
    PDF_REQUEST_MAX_BYTES,
  );
  const payload = JSON.parse(body);
  const doc = new DOMParser().parseFromString(payload.html, "text/html");
  expect(
    doc.querySelector('[data-template="yuhyung"]')?.getAttribute("style"),
  ).toContain("Batang");
  return [...doc.querySelectorAll("[data-unified-paper]")].map((el) =>
    Number(el.getAttribute("data-order")),
  );
}
async function pdf(orders: number[]) {
  const result = await PDFDocument.create();
  orders.forEach((order) => result.addPage([500 + order, 842]));
  return new Uint8Array(await result.save());
}
async function orders(blob: Blob) {
  const doc = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
  return doc.getPages().map((page) => page.getWidth() - 500);
}

describe("physical-page PDF batching", () => {
  it("retains the single-request PDF bytes for a small document", async () => {
    const bytes = await pdf([1, 2]);
    fetchMock.mockImplementation(async (_url, init) => {
      expect(parse(init.body)).toEqual([1, 2]);
      return new Response(bytes);
    });
    const blob = await exportPreviewPdf(fixture(2), "수학");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("combines bounded batches in exact physical-page order without editing the source", async () => {
    const batches: number[][] = [];
    fetchMock.mockImplementation(async (_url, init) => {
      const selected = parse(init.body);
      batches.push(selected);
      return new Response(await pdf(selected));
    });
    const root = fixture(41);
    const original = root.outerHTML;
    expect(await orders(await exportPreviewPdf(root, "10회차"))).toEqual(
      Array.from({ length: 41 }, (_, i) => i + 1),
    );
    expect(batches.map((batch) => batch.length)).toEqual([20, 20, 1]);
    expect(root.outerHTML).toBe(original);
  });
  it("splits by actual UTF-8 request bytes, including Korean text", async () => {
    fetchMock.mockImplementation(
      async (_url, init) => new Response(await pdf(parse(init.body))),
    );
    expect(
      await orders(
        await exportPreviewPdf(fixture(2, "각".repeat(600_000)), "도형"),
      ),
    ).toEqual([1, 2]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("halves a response-too-large batch and preserves the order of all successful parts", async () => {
    const attempts: number[][] = [];
    fetchMock.mockImplementation(async (_url, init) => {
      const selected = parse(init.body);
      attempts.push(selected);
      return selected.length > 1
        ? Response.json({ error: "too large" }, { status: 413 })
        : new Response(await pdf(selected));
    });
    expect(await orders(await exportPreviewPdf(fixture(4), "도형"))).toEqual([
      1, 2, 3, 4,
    ]);
    expect(attempts).toEqual([
      [1, 2, 3, 4],
      [1, 2],
      [1],
      [2],
      [3, 4],
      [3],
      [4],
    ]);
  });
  it("returns no partial download when an authenticated request fails", async () => {
    fetchMock
      .mockImplementationOnce(
        async (_url, init) => new Response(await pdf(parse(init.body))),
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: "로그인 후 다시 시도해 주세요." },
          { status: 401 },
        ),
      );
    await expect(exportPreviewPdf(fixture(21), "수학")).rejects.toThrow(
      "로그인",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not submit a single page that exceeds the request budget", async () => {
    await expect(
      exportPreviewPdf(fixture(1, "각".repeat(1_200_000)), "도형"),
    ).rejects.toThrow("한 페이지");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
