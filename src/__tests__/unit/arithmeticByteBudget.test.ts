import { describe, expect, it } from "vitest";
import {
  arithmeticSheetByteIssue,
  ARITHMETIC_BODY_MAX_BYTES,
  ARITHMETIC_SHEET_MAX_BYTES,
  ARITHMETIC_SHEET_JSON_LIMITS,
  readArithmeticLibraryBody,
} from "@/lib/arithmetic/byteBudget";
import { parseStrictJson, readStrictJson } from "@/lib/textbook/strictJson";

describe("arithmetic body and save preflight budgets", () => {
  it("counts UTF-8 JSON bytes, including multibyte text and escaped characters", () => {
    expect(
      arithmeticSheetByteIssue("x".repeat(ARITHMETIC_SHEET_MAX_BYTES - 2)),
    ).toBeNull();
    const value = "가".repeat(Math.ceil(ARITHMETIC_SHEET_MAX_BYTES / 3));
    expect(arithmeticSheetByteIssue(value)).toMatchObject({
      code: "payload-size",
      bytes: new TextEncoder().encode(JSON.stringify(value)).length,
      max: ARITHMETIC_SHEET_MAX_BYTES,
    });
    expect(
      arithmeticSheetByteIssue('"'.repeat(ARITHMETIC_SHEET_MAX_BYTES / 2)),
    ).toHaveProperty("code", "payload-size");
  });
  it("accepts large valid wrappers, bounds strings and still rejects duplicate keys", () => {
    const body = JSON.stringify({
      payload: {
        svgPack: "a".repeat(1_000_000),
        rounds: Array.from({ length: 10 }, () =>
          Array.from({ length: 200 }, () => ({ value: "가".repeat(50) })),
        ),
      },
    });
    expect(new TextEncoder().encode(body).length).toBeGreaterThan(256 * 1024);
    expect(() =>
      parseStrictJson(body, ARITHMETIC_SHEET_JSON_LIMITS),
    ).not.toThrow();
    expect(() =>
      parseStrictJson('{"x":1,"x":2}', ARITHMETIC_SHEET_JSON_LIMITS),
    ).toThrow();
    expect(() =>
      parseStrictJson(
        JSON.stringify({ svgPack: "a".repeat(1_000_001) }),
        ARITHMETIC_SHEET_JSON_LIMITS,
      ),
    ).toThrow();
  });
  it("cancels an oversized chunked request without trusting Content-Length", async () => {
    let cancelled = false;
    let n = 0;
    const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
      pull(controller) {
        controller.enqueue(new Uint8Array(1_000_000));
        n++;
      },
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      readArithmeticLibraryBody({ body: stream }),
    ).rejects.toHaveProperty("code", "payload-size");
    expect(cancelled).toBe(true);
    expect(n).toBeLessThanOrEqual(5);
    const exact = "x".repeat(ARITHMETIC_BODY_MAX_BYTES);
    expect(
      (
        await readArithmeticLibraryBody(
          new Request("http://local", { method: "POST", body: exact }),
        )
      ).length,
    ).toBe(ARITHMETIC_BODY_MAX_BYTES);
    await expect(
      readStrictJson(
        new Request("http://local", {
          method: "POST",
          body: JSON.stringify("a".repeat(ARITHMETIC_BODY_MAX_BYTES)),
        }),
        ARITHMETIC_SHEET_JSON_LIMITS,
      ),
    ).rejects.toThrow();
  });
});
