// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listeningJsonResponse } from "@/lib/english/listening/runtime/jsonResponse";

describe("streamed listening JSON", () => {
  it("streams a large original-image history while preserving its private JSON envelope", async () => {
    const data = {
      images: Array.from(
        { length: 20 },
        () => "iVBORw0KGgo" + "A".repeat(260000),
      ),
    };
    const response = listeningJsonResponse(data, 201, {
      "Cache-Control": "private, no-store",
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.has("content-length")).toBe(false);
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      chunks.push(item.value);
    }
    expect(chunks.length).toBeGreaterThan(1);
    expect(
      Math.max(...chunks.map((chunk) => chunk.byteLength)),
    ).toBeLessThanOrEqual(16384);
    const text = Buffer.concat(chunks).toString("utf8");
    expect(Buffer.byteLength(text)).toBeGreaterThan(4.5 * 1024 * 1024);
    expect(JSON.parse(text)).toEqual({ data });
  });
  it("preserves a Unicode surrogate pair split exactly at a stream boundary", async () => {
    const data = {
      text: "x".repeat(16384 - '{"data":{"text":"'.length - 1) + "🙂한글",
    };
    expect(await listeningJsonResponse(data, 200, {}).json()).toEqual({ data });
  });
});
