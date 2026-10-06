// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readBlobRange } from "@/lib/textbook/server/blobs";
import {
  RANGE_WINDOW_BYTES,
  serveDownloadBytes,
} from "@/lib/textbook/server/bytes";
import type { TextbookSql } from "@/lib/textbook/server/sql";

vi.mock("@/lib/textbook/server/blobs", () => ({ readBlobRange: vi.fn() }));
const db = {} as TextbookSql;
describe("complete PDF attachment downloads", () => {
  it("streams files larger than a database window without truncating them", async () => {
    const bytes = new Uint8Array(RANGE_WINDOW_BYTES + 123).fill(17);
    vi.mocked(readBlobRange).mockImplementation(
      async (_sql, _hash, start, length) => bytes.slice(start, start + length),
    );
    const response = await serveDownloadBytes(
      db,
      new Request("https://test/pdf"),
      {
        sha256: "hash",
        size: bytes.length,
        mimeType: "application/pdf",
        downloadName: "student-pdf.pdf",
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe(String(bytes.length));
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="student-pdf.pdf"',
    );
    // Byte-for-byte, but not with toEqual: its element-wise walk over 4 MB takes longer than
    // the test timeout on a loaded machine (2026-10-06 — 23 s alone, limit 20 s).
    const received = Buffer.from(await response.arrayBuffer());
    expect(received.length).toBe(bytes.length);
    expect(received.equals(Buffer.from(bytes))).toBe(true);
    expect(
      vi.mocked(readBlobRange).mock.calls.map((call) => call.slice(2)),
    ).toEqual([
      [0, RANGE_WINDOW_BYTES],
      [RANGE_WINDOW_BYTES, 123],
    ]);
  });
  it("retains range support for PDF viewers", async () => {
    vi.mocked(readBlobRange)
      .mockClear()
      .mockResolvedValue(new Uint8Array([1, 2, 3]));
    const response = await serveDownloadBytes(
      db,
      new Request("https://test/pdf", { headers: { range: "bytes=2-4" } }),
      { sha256: "hash", size: 6, mimeType: "application/pdf" },
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-4/6");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
      1, 2, 3,
    ]);
  });
});
