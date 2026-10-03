// @vitest-environment node
import { describe, expect, it } from "vitest";
import { englishPassageCreateSchema } from "@/contracts/englishBank.contract";
import {
  assertPassageUse,
  exactHash,
  normalizeBankText,
  readMaterialText,
} from "@/lib/english/bank/policy";

const rights = {
  status: "confirmed" as const,
  basis: "Written by teacher",
  allowedUses: ["generation_input" as const, "external_model" as const],
  confirmedBy: "00000000-0000-4000-8000-000000000001",
  confirmedAt: new Date().toISOString(),
};
describe("bank association and rights boundaries", () => {
  it("normalizes NFC and whitespace for association but hashes exact UTF-8 snapshots", () => {
    expect(normalizeBankText(" e\u0301\n  text ")).toBe(
      normalizeBankText("é text"),
    );
    expect(exactHash(" e\u0301\n  text ")).not.toBe(exactHash("é text"));
  });
  it.each([
    ["cloze", 24000],
    ["chatgpt", 18000],
    ["api", 18000],
  ] as const)("enforces %s exact bound without truncating", (path, limit) => {
    expect(() =>
      assertPassageUse("x".repeat(limit), rights, path),
    ).not.toThrow();
    expect(() => assertPassageUse("x".repeat(limit + 1), rights, path)).toThrow(
      "PASSAGE_TOO_LONG",
    );
  });
  it("requires current confirmation and external rights only for external paths", () => {
    expect(() =>
      assertPassageUse("text", { ...rights, status: "unconfirmed" }, "cloze"),
    ).toThrow("RIGHTS_REQUIRED");
    const local = { ...rights, allowedUses: ["generation_input" as const] };
    expect(() => assertPassageUse("text", local, "cloze")).not.toThrow();
    expect(() => assertPassageUse("text", local, "api")).toThrow(
      "RIGHTS_REQUIRED",
    );
    expect(() => assertPassageUse("text", local, "chatgpt")).toThrow(
      "RIGHTS_REQUIRED",
    );
  });
  it("imports full valid UTF-8 bytes rather than a truncated stored content field", () => {
    expect(() =>
      readMaterialText({
        mimeType: "text/plain",
        bytes: Buffer.from("full text"),
        content: "full",
        size: 9,
      }),
    ).toThrow("IMPORT_TEXT_TRUNCATED");
    expect(
      readMaterialText({
        mimeType: "text/plain",
        bytes: Buffer.from("  full text\n"),
        content: "full text",
        size: 12,
      }),
    ).toBe("  full text\n");
  });
  it("rejects malformed UTF-8, inconsistent bytes, and non-text originals", () => {
    expect(() =>
      readMaterialText({
        mimeType: "text/plain",
        bytes: Buffer.from([0xc3, 0x28]),
        content: "�(",
        size: 2,
      }),
    ).toThrow("IMPORT_INVALID_UTF8");
    expect(() =>
      readMaterialText({
        mimeType: "text/plain",
        bytes: Buffer.from("abc"),
        content: "abc",
        size: 5,
      }),
    ).toThrow("IMPORT_TEXT_TRUNCATED");
    expect(() =>
      readMaterialText({
        mimeType: "application/pdf",
        bytes: Buffer.from("abc"),
        content: null,
        size: 3,
      }),
    ).toThrow("IMPORT_TEXT_UNAVAILABLE");
  });
  it("preserves exact registered text and refuses 30,001 characters", () => {
    const input = {
      clientKey: rights.confirmedBy,
      title: "sample",
      text: "  text\n",
    };
    expect(englishPassageCreateSchema.parse(input).text).toBe(input.text);
    expect(
      englishPassageCreateSchema.safeParse({
        ...input,
        text: "a".repeat(30001),
      }).success,
    ).toBe(false);
    for (const text of ["a\u0000b", "a\ud800b"])
      expect(
        englishPassageCreateSchema.safeParse({ ...input, text }).success,
      ).toBe(false);
  });
});
