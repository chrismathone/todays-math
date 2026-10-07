// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { bankJsonResponse } from "@/lib/english/bankJsonResponse";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("English bank JSON transport", () => {
  it("finishes schema validation and serialization before creating any successful stream", () => {
    const stream = vi.spyOn(globalThis, "ReadableStream");
    const schema = z.strictObject({ data: z.string() });
    expect(() =>
      bankJsonResponse(schema, { data: 1 as unknown as string }),
    ).toThrow();
    expect(() => bankJsonResponse(z.unknown(), { data: BigInt(1) })).toThrow();
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(() => bankJsonResponse(z.unknown(), circular)).toThrow();
    expect(stream).not.toHaveBeenCalled();
  });

  it("sends the serialized snapshot even if the source changes before consumption", async () => {
    const payload = { data: '가😀\ud800\n"\\' };
    const expected = JSON.stringify(payload);
    const response = bankJsonResponse(
      z.strictObject({ data: z.string() }),
      payload,
    );
    payload.data = "Changed after response creation";
    expect(await response.text()).toBe(expected);
  });

  it("pulls only on consumer demand and stops after cancellation", async () => {
    const OriginalStream = globalThis.ReadableStream;
    const pulls = vi.fn();
    vi.stubGlobal(
      "ReadableStream",
      class extends OriginalStream<Uint8Array> {
        constructor(
          source: UnderlyingDefaultSource<Uint8Array>,
          strategy?: QueuingStrategy<Uint8Array>,
        ) {
          super(
            {
              ...source,
              pull(controller) {
                pulls();
                return source.pull?.call(source, controller);
              },
            },
            strategy,
          );
        }
      },
    );
    const response = bankJsonResponse(z.strictObject({ data: z.string() }), {
      data: "가😀".repeat(100_000),
    });
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(pulls).not.toHaveBeenCalled();
    const reader = response.body!.getReader();
    expect((await reader.read()).done).toBe(false);
    await settle();
    expect(pulls).toHaveBeenCalledTimes(1);
    await reader.cancel();
    expect((await reader.read()).done).toBe(true);
    await settle();
    expect(pulls).toHaveBeenCalledTimes(1);
  });
});
