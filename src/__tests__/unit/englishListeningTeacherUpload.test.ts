import { File as NodeFile } from "node:buffer";
import { createHash, webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_LISTENING_UPLOAD_BYTES,
  uploadListeningAudio,
} from "@/components/english/listening/listeningUpload";

afterEach(() => vi.unstubAllGlobals());
const file = (bytes: Uint8Array, name = "teacher.mp3") =>
  new NodeFile([bytes], name) as unknown as File;
const receipt = (data: unknown) => Response.json({ data });

describe("bounded teacher audio upload", () => {
  it("hashes the original, transmits bounded sequential chunks and uses only completed derivative metadata", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const bytes = new Uint8Array(2 * 1024 * 1024 + 73).fill(42);
    let offset = 0,
      revision = 0;
    const sentSizes: number[] = [];
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/media")) {
        expect(JSON.parse(init.body as string)).toEqual({
          totalBytes: bytes.length,
          mimeType: "audio/mpeg",
          expectedSha256: createHash("sha256").update(bytes).digest("hex"),
        });
        return receipt({
          assetId: "asset",
          receivedBytes: 0,
          revision,
          chunkBytes: 2 * 1024 * 1024,
        });
      }
      if (url.includes("/chunks?")) {
        const query = new URL(url, "http://localhost").searchParams;
        const body = new Uint8Array(init.body as ArrayBuffer);
        sentSizes.push(body.length);
        expect(query.get("offset")).toBe(String(offset));
        expect(query.get("expectedRevision")).toBe(String(revision));
        expect(query.get("sha256")).toBe(
          createHash("sha256").update(body).digest("hex"),
        );
        expect(init.headers).toEqual({
          "Content-Type": "application/octet-stream",
        });
        offset += body.length;
        revision++;
        return receipt({
          assetId: "asset",
          receivedBytes: offset,
          revision,
          chunkBytes: 2 * 1024 * 1024,
        });
      }
      expect(JSON.parse(init.body as string)).toEqual({ expectedRevision: 3 });
      return receipt({
        state: "ready",
        publishable: true,
        assetId: "asset",
        sha256: "b".repeat(64),
        durationMs: 14000,
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const result = await uploadListeningAudio(
      "set",
      file(bytes),
      new AbortController().signal,
      vi.fn(),
    );
    expect(sentSizes).toEqual([1024 * 1024, 1024 * 1024, 73]);
    expect(result).toEqual({
      assetId: "asset",
      sha256: "b".repeat(64),
      durationMs: 14000,
    });
    expect(result.sha256).not.toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
  });

  it("rejects oversize files before allocation or network activity", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const arrayBuffer = vi.fn();
    await expect(
      uploadListeningAudio(
        "set",
        {
          name: "big.wav",
          size: MAX_LISTENING_UPLOAD_BYTES + 1,
          arrayBuffer,
        } as unknown as File,
        new AbortController().signal,
        vi.fn(),
      ),
    ).rejects.toThrow("64MB");
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("never treats blocked completion as uploaded audio", async () => {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          receipt({
            assetId: "asset",
            receivedBytes: 0,
            revision: 0,
            chunkBytes: 1024,
          }),
        )
        .mockResolvedValueOnce(
          receipt({
            assetId: "asset",
            receivedBytes: 16,
            revision: 1,
            chunkBytes: 1024,
          }),
        )
        .mockResolvedValueOnce(
          receipt({
            state: "publish_blocked",
            publishable: false,
            blocker: "unsupported_or_invalid_mp3",
          }),
        ),
    );
    await expect(
      uploadListeningAudio(
        "set",
        file(new Uint8Array(16)),
        new AbortController().signal,
        vi.fn(),
      ),
    ).rejects.toThrow("재생 가능한 음원");
  });

  it("stops before the next request when aborted", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const controller = new AbortController();
    const fetcher = vi.fn(async () => {
      controller.abort();
      return receipt({
        assetId: "asset",
        receivedBytes: 0,
        revision: 0,
        chunkBytes: 1024,
      });
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(
      uploadListeningAudio(
        "set",
        file(new Uint8Array(16)),
        controller.signal,
        vi.fn(),
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
