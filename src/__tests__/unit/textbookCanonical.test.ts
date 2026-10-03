// @vitest-environment node
import { webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalBytes, canonicalJson } from "@/lib/textbook/canonical";
import { canonicalHash as serverHash } from "@/lib/textbook/hash.server";
import { canonicalHash as browserHash } from "@/lib/textbook/hash.browser";
import { parseStrictJson, readStrictJson } from "@/lib/textbook/strictJson";

describe("P1 JSON byte boundary", () => {
  it.each([
    '{"a":1,"a":2}',
    '{"a":1,"\\u0061":2}',
    '{"x":{"n":0,"n":1}}',
    '{"a":"\\ud800"}',
    '{"a":"\\udc00"}',
    '{"a":"\\u0000"}',
    "-0",
    "-0.0",
    "1e400",
    "9007199254740992",
    "-9007199254740992",
    '{"a":1,}',
    "[1,]",
    "01",
    "+1",
    "NaN",
    "{} {}",
    "\ufeff{}",
  ])("rejects %s before data can be normalized", (source) => {
    const parser = vi.spyOn(JSON, "parse");
    expect(() => parseStrictJson(source)).toThrow();
    expect(parser).not.toHaveBeenCalled();
    parser.mockRestore();
  });
  it("checks fatal UTF8, raw string surrogates and every resource bound", async () => {
    for (const bytes of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xff]])
      expect(() => parseStrictJson(new Uint8Array(bytes))).toThrow(/UTF-8/);
    expect(() => parseStrictJson('"\ud800"')).toThrow(/surrogate/);
    expect(() => parseStrictJson("[0,1]", { maxBytes: 4 })).toThrow(/byte/);
    expect(() => parseStrictJson("[[[0]]]", { maxDepth: 2 })).toThrow(/depth/);
    expect(() => parseStrictJson("[0,1]", { maxTokens: 2 })).toThrow(/token/);
    expect(() => parseStrictJson('"123"', { maxStringLength: 2 })).toThrow(
      /string/,
    );
    const request = new Request("https://example.test", {
      method: "POST",
      body: '{"a":1,"a":2}',
    });
    await expect(readStrictJson(request)).rejects.toThrow(/Duplicate/);
    await expect(
      readStrictJson(
        new Request("https://example.test", {
          method: "POST",
          body: '"0123456789"',
        }),
        { maxBytes: 4 },
      ),
    ).rejects.toThrow(/byte/);
  });
  it("preserves prototype-looking keys, nested strings and Unicode", () => {
    const value = parseStrictJson(
      '{"__proto__":{"x":1},"constructor":false,"😀":"\\ud83d\\ude00","s":"\\b\\f\\n\\r\\t\\\\\\/\\\""}',
    );
    expect(Object.hasOwn(value as object, "__proto__")).toBe(true);
    expect(canonicalJson(value)).toContain('"😀":"😀"');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("P1 canonical serialization", () => {
  it("orders numeric-shaped keys lexically and matches independently specified UTF8 bytes", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const value = { "2": "two", "10": "ten", "😀": "😀", é: "é", a: "가" };
    const expected = '{"10":"ten","2":"two","a":"가","é":"é","😀":"😀"}';
    expect(canonicalJson(value)).toBe(expected);
    // Independently computed using Node crypto over the literal UTF8 string, not this serializer.
    expect(serverHash(value)).toBe(
      "acefa82470454bdfb1996a0471f0952154009bd991a7b883fd5db833d76a4f45",
    );
    expect(new TextDecoder().decode(canonicalBytes(value))).toBe(expected);
    expect(await browserHash(value)).toBe(serverHash(value));
    vi.unstubAllGlobals();
  });
  it("preserves original array, Unicode normalization and line endings", () => {
    expect(serverHash({ text: "e\u0301\r\n가" })).not.toBe(
      serverHash({ text: "é\n가" }),
    );
    expect(serverHash({ text: "e\u0301\r\n가" })).toBe(
      "6f261e5ca4b30a68b52b66ae817413d2a03cf0ade16fa7d16d8fa87a84298e4d",
    );
    expect(serverHash({ text: "é\n가" })).toBe(
      "95fe3b7e6c7a6c1cdcca764112ab36c8f3f8ea93da506b08b608dd77a8810ae2",
    );
    expect(serverHash({ a: [1, 2] })).not.toBe(serverHash({ a: [2, 1] }));
    expect(serverHash({ b: 1, a: 2 })).toBe(serverHash({ a: 2, b: 1 }));
  });
  it("rejects non-JSON values rather than stringify loss", () => {
    for (const value of [
      undefined,
      NaN,
      Infinity,
      -0,
      9007199254740992,
      [undefined],
      [, 1],
      new Date(),
      { a: undefined },
      { a: "\ud800" },
      { a: "\0" },
      { [Symbol("x")]: 1 },
    ])
      expect(() => canonicalJson(value)).toThrow();
    expect(() =>
      canonicalJson(
        Object.defineProperty({}, "x", { get: () => 1, enumerable: true }),
      ),
    ).toThrow();
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(() => canonicalJson(cycle)).toThrow(/Cyclic/);
  });
});
