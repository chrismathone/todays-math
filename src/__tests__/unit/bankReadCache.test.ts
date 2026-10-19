import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BANK_COUNTS_TTL_MS,
  cachedBankRead,
  invalidateBankReadCache,
  publicBankQueryKey,
} from "@/lib/bankReadCache";

beforeEach(() => {
  invalidateBankReadCache();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe("public bank count cache", () => {
  it("coalesces simultaneous reads and starts the short TTL after completion", async () => {
    let resolve!: (value: number) => void;
    const read = vi.fn(
      () =>
        new Promise<number>((done) => {
          resolve = done;
        }),
    );
    const first = cachedBankRead("one", read);
    expect(cachedBankRead("one", read)).toBe(first);
    await Promise.resolve();
    vi.advanceTimersByTime(BANK_COUNTS_TTL_MS * 2);
    expect(cachedBankRead("one", read)).toBe(first);
    resolve(7);
    expect(await first).toBe(7);
    expect(await cachedBankRead("one", read)).toBe(7);
    expect(read).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(BANK_COUNTS_TTL_MS + 1);
    const next = cachedBankRead("one", read);
    await Promise.resolve();
    resolve(8);
    expect(await next).toBe(8);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it("invalidates on import, epoch changes, and failures without caching the failure", async () => {
    const read = vi.fn().mockResolvedValue(1);
    await cachedBankRead("one", read);
    invalidateBankReadCache();
    await cachedBankRead("one", read);
    vi.stubEnv("BANK_COUNTS_EPOCH", "next-import");
    await cachedBankRead("one", read);
    expect(read).toHaveBeenCalledTimes(3);
    const failed = vi
      .fn()
      .mockRejectedValueOnce(new Error("retry"))
      .mockResolvedValueOnce(2);
    await expect(cachedBankRead("failed", failed)).rejects.toThrow("retry");
    expect(await cachedBankRead("failed", failed)).toBe(2);
  });
  it("never shares recent, owner-sensitive or explicit exclusion requests", () => {
    for (const key of [
      "recent",
      "excludeIds",
      "excludeFamiliesOf",
      "familyOf",
      "ids",
    ])
      expect(
        publicBankQueryKey(new URLSearchParams({ [key]: "1" })),
      ).toBeNull();
    expect(
      publicBankQueryKey(new URLSearchParams("sourceGroup=engine&families=1")),
    ).toBe(
      publicBankQueryKey(new URLSearchParams("families=1&sourceGroup=engine")),
    );
  });
  it("does not resurrect an invalidated pending read", async () => {
    let finish!: (value: number) => void;
    const old = cachedBankRead(
      "one",
      () =>
        new Promise<number>((done) => {
          finish = done;
        }),
    );
    await Promise.resolve();
    invalidateBankReadCache();
    const read = vi.fn().mockResolvedValue(2);
    expect(await cachedBankRead("one", read)).toBe(2);
    finish(1);
    await old;
    expect(await cachedBankRead("one", read)).toBe(2);
  });
});
