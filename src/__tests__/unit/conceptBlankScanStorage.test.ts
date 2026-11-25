// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createScanPhotoStorage,
  readScanStorageConfig,
  SCAN_PHOTO_BUCKET,
} from "@/lib/concept-blank/scan/storage.server";
const config = {
  url: "https://abcdefghijklmnopqrst.supabase.co",
  serviceKey: "sb_secret_test_only",
  bucket: "concept-blank-scan-private",
};
const key =
  "00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000003";
const bytes = Buffer.from("verified-photo-bytes"),
  hash = createHash("sha256").update(bytes).digest("hex");
function fake(publicBucket = false) {
  return vi.fn<typeof fetch>(async (url, init) => {
    const path = new URL(String(url)).pathname;
    if (path.includes("/bucket/"))
      return Response.json({ id: config.bucket, public: publicBucket });
    if (path.includes("/object/sign/"))
      return Response.json({
        signedURL: `/object/sign/${config.bucket}/${key}?token=fake`,
      });
    if (path.includes("/object/authenticated/"))
      return new Response(bytes, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(bytes.length),
        },
      });
    if (init?.method === "DELETE") return Response.json([{ name: key }]);
    return Response.json({ Key: `${config.bucket}/${key}` }, { status: 201 });
  });
}
describe("private scan photo storage transport", () => {
  it("requires server credentials and a fixed HTTPS project host", () => {
    expect(readScanStorageConfig({})).toBeNull();
    expect(
      readScanStorageConfig({
        SUPABASE_URL: config.url,
        SUPABASE_SECRET_KEY: config.serviceKey,
      }),
    ).toEqual({ ...config, bucket: SCAN_PHOTO_BUCKET });
    expect(() =>
      createScanPhotoStorage(
        { ...config, url: "https://evil.example" },
        fake(),
      ),
    ).toThrow();
    const anon = `e30.${Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url")}.fake`;
    expect(() =>
      createScanPhotoStorage({ ...config, serviceKey: anon }, fake()),
    ).toThrow();
  });
  it("checks bucket privacy, uploads without overwriting, then verifies bytes by hash", async () => {
    const fetcher = fake(),
      storage = createScanPhotoStorage(config, fetcher);
    await storage.upload(key, bytes, "image/png");
    const call = fetcher.mock.calls.find(
      ([, init]) => init?.method === "POST",
    )!;
    const headers = new Headers(call[1]?.headers);
    expect(headers.get("x-upsert")).toBe("false");
    expect(headers.get("cache-control")).toBe("no-store");
    expect(
      fetcher.mock.calls.some(([url]) =>
        String(url).includes("/object/authenticated/"),
      ),
    ).toBe(true);
    expect(
      fetcher.mock.calls.every(([, init]) => init?.redirect === "error"),
    ).toBe(true);
    expect(await storage.read(key, hash, "image/png")).toEqual(bytes);
    await expect(
      storage.read(key, "0".repeat(64), "image/png"),
    ).rejects.toThrow();
  });
  it("rejects a public bucket, path traversal and long-lived links", async () => {
    const fetcher = fake(true),
      storage = createScanPhotoStorage(config, fetcher);
    await expect(storage.upload(key, bytes, "image/png")).rejects.toThrow(
      /비공개/,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(storage.signedUrl("../../other", 30)).rejects.toThrow();
    await expect(storage.signedUrl(key, 61)).rejects.toThrow();
    await expect(storage.signedUrl(key, 0)).rejects.toThrow();
  });
  it("returns only a validated signed address with the requested short expiry", async () => {
    const fetcher = fake(),
      storage = createScanPhotoStorage(config, fetcher);
    expect(await storage.signedUrl(key, 30)).toBe(
      `${config.url}/storage/v1/object/sign/${config.bucket}/${key}?token=fake`,
    );
    const call = fetcher.mock.calls.find(([url]) =>
      String(url).includes("/object/sign/"),
    )!;
    expect(JSON.parse(call[1]!.body as string)).toEqual({ expiresIn: 30 });
    const malicious = vi.fn<typeof fetch>(async (url) =>
      String(url).includes("/bucket/")
        ? Response.json({ id: config.bucket, public: false })
        : Response.json({ signedURL: "https://evil.example/steal" }),
    );
    await expect(
      createScanPhotoStorage(config, malicious).signedUrl(key, 30),
    ).rejects.toThrow();
  });
  it("deletes via Storage API even if bucket privacy is misconfigured, and surfaces failures for retry", async () => {
    const fetcher = fake(true),
      storage = createScanPhotoStorage(config, fetcher);
    await storage.remove(key);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.method).toBe("DELETE");
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({
      prefixes: [key],
    });
    const failed = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("failure", { status: 503 }));
    await expect(
      createScanPhotoStorage(config, failed).remove(key),
    ).rejects.toThrow();
    expect(failed).toHaveBeenCalledTimes(1);
  });
});
