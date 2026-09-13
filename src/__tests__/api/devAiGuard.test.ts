import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readDevAiBody,
  rejectDevAiRequest,
} from "@/app/api/dev/unified/ai/guard";
import { MAX_AI_BODY_BYTES } from "@/lib/dev-ai/tasks";
afterEach(() => vi.unstubAllEnvs());
describe("local subscription AI request guard", () => {
  it.each(["production", "test"])("never exposes the bridge in %s", (mode) => {
    vi.stubEnv("NODE_ENV", mode);
    expect(
      rejectDevAiRequest(
        new Request("http://localhost:3000/api/dev/unified/ai"),
      )?.status,
    ).toBe(404);
  });
  it("accepts same-origin loopback only and rejects public hosts and cross-origin quota use", () => {
    vi.stubEnv("NODE_ENV", "development");
    const post = (url: string, origin?: string) =>
      new Request(url + "/api/dev/unified/ai", {
        method: "POST",
        headers: origin ? { origin } : undefined,
      });
    expect(
      rejectDevAiRequest(
        post("http://127.0.0.1:3000", "http://127.0.0.1:3000"),
      ),
    ).toBeNull();
    expect(
      rejectDevAiRequest(post("http://127.0.0.1:3000", "https://external.test"))
        ?.status,
    ).toBe(403);
    expect(rejectDevAiRequest(post("http://127.0.0.1:3000"))?.status).toBe(403);
    expect(
      rejectDevAiRequest(
        post("https://production.test", "https://production.test"),
      )?.status,
    ).toBe(403);
    expect(
      rejectDevAiRequest(
        new Request("http://localhost:3000", {
          headers: { host: "external.test" },
        }),
      )?.status,
    ).toBe(403);
  });
  it("bounds streamed payload bytes, including requests with no content-length", async () => {
    const valid = new Request("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ grade: "초5" }),
    });
    expect(await readDevAiBody(valid)).toEqual({ grade: "초5" });
    const huge = new Request("http://localhost:3000", {
      method: "POST",
      body: "x".repeat(MAX_AI_BODY_BYTES + 1),
    });
    expect(huge.headers.get("content-length")).toBeNull();
    await expect(readDevAiBody(huge)).rejects.toThrow("이미지가 너무 큽니다");
    await expect(
      readDevAiBody(
        new Request("http://localhost:3000", {
          method: "POST",
          body: "{}",
          headers: { "content-length": String(MAX_AI_BODY_BYTES + 1) },
        }),
      ),
    ).rejects.toThrow();
  });
});
