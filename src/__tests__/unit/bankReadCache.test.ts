import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BANK_COUNTS_TTL_MS,
  BANK_LIST_CACHE_MAX_ENTRIES,
  BANK_LIST_CACHE_MAX_IDS,
  cachedBankRead,
  cachedBankQuestionList,
  invalidateBankReadCache,
  publicBankListQueryKey,
  publicBankQueryKey,
} from "@/lib/bankReadCache";

beforeEach(() => {
  invalidateBankReadCache();
  vi.useFakeTimers();
});

describe("grouped public bank list cache", () => {
  const result = { total: 2, ids: ["one", "two"] };

  it("shares the ordered full list across page/pageSize only", () => {
    const key = publicBankListQueryKey(
      new URLSearchParams("identity=question&grade=중2&page=1&pageSize=12"),
    );
    expect(key).toBe(
      publicBankListQueryKey(
        new URLSearchParams("pageSize=24&page=2&grade=중2&identity=question"),
      ),
    );
    for (const filter of [
      "grade=중1",
      "format=descriptive",
      "availableFormat=multiple_choice",
      "reviewStatus=draft",
      "materials=book",
      "books=book",
      "materialKinds=exercise",
      "sourceGroup=engine",
      "source=manual",
      "semester=2",
      "unitIds=unit",
      "unitFrom=unit",
      "unitTo=unit",
      "chapter=chapter",
      "chapterPrefix=prefix",
      "difficulty=기본",
      "problemType=계산",
      "q=search",
      "hasFigure=1",
      "hasSolution=1",
      "hasAnswer=1",
      "view=other",
    ]) {
      const changed = new URLSearchParams("identity=question&grade=중2");
      for (const [name, value] of new URLSearchParams(filter))
        changed.set(name, value);
      expect(publicBankListQueryKey(changed)).not.toBe(key);
    }
    for (const name of [
      "recent",
      "ids",
      "excludeIds",
      "excludeFamiliesOf",
      "familyOf",
    ])
      expect(
        publicBankListQueryKey(new URLSearchParams({ [name]: "1" })),
      ).toBeNull();
  });

  it("coalesces pending reads and applies TTL only after completion", async () => {
    let finish!: (value: typeof result) => void;
    const read = vi.fn(
      () =>
        new Promise<typeof result>((resolve) => {
          finish = resolve;
        }),
    );
    const first = cachedBankQuestionList("one", read);
    expect(cachedBankQuestionList("one", read)).toBe(first);
    await Promise.resolve();
    vi.advanceTimersByTime(BANK_COUNTS_TTL_MS * 2);
    expect(cachedBankQuestionList("one", read)).toBe(first);
    finish(result);
    expect(await first).toBe(result);
    expect(await cachedBankQuestionList("one", read)).toBe(result);
    vi.advanceTimersByTime(BANK_COUNTS_TTL_MS + 1);
    const next = cachedBankQuestionList("one", read);
    await Promise.resolve();
    finish(result);
    await next;
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("bypasses private queries and clears on write invalidation, epoch and error", async () => {
    const read = vi.fn().mockResolvedValue(result);
    await cachedBankQuestionList(null, read);
    await cachedBankQuestionList(null, read);
    expect(read).toHaveBeenCalledTimes(2);
    await cachedBankQuestionList("one", read);
    invalidateBankReadCache();
    await cachedBankQuestionList("one", read);
    vi.stubEnv("BANK_COUNTS_EPOCH", "next");
    await cachedBankQuestionList("one", read);
    expect(read).toHaveBeenCalledTimes(5);
    const failed = vi
      .fn()
      .mockRejectedValueOnce(Error("retry"))
      .mockResolvedValue(result);
    await expect(cachedBankQuestionList("failed", failed)).rejects.toThrow(
      "retry",
    );
    expect(await cachedBankQuestionList("failed", failed)).toBe(result);
  });

  it("bounds list count separately from the count cache", async () => {
    const read = vi.fn().mockResolvedValue(result);
    await cachedBankRead("counts", read);
    for (let i = 0; i <= BANK_LIST_CACHE_MAX_ENTRIES; i++)
      await cachedBankQuestionList(String(i), read);
    const calls = read.mock.calls.length;
    await cachedBankQuestionList(String(BANK_LIST_CACHE_MAX_ENTRIES), read);
    await cachedBankRead("counts", read);
    expect(read).toHaveBeenCalledTimes(calls);
    await cachedBankQuestionList("0", read);
    expect(read).toHaveBeenCalledTimes(calls + 1);
  });

  it("bounds total retained IDs and never retains an oversized list", async () => {
    const large = {
      total: 1,
      ids: Array<string>(Math.floor(BANK_LIST_CACHE_MAX_IDS / 2) + 1).fill(
        "id",
      ),
    };
    const read = vi.fn().mockResolvedValue(large);
    await cachedBankQuestionList("a", read);
    await cachedBankQuestionList("b", read);
    await cachedBankQuestionList("b", read);
    expect(read).toHaveBeenCalledTimes(2);
    await cachedBankQuestionList("a", read);
    expect(read).toHaveBeenCalledTimes(3);
    const oversized = vi.fn().mockResolvedValue({
      total: 1,
      ids: Array<string>(BANK_LIST_CACHE_MAX_IDS + 1).fill("id"),
    });
    await cachedBankQuestionList("oversized", oversized);
    await cachedBankQuestionList("oversized", oversized);
    expect(oversized).toHaveBeenCalledTimes(2);
  });

  it("never resurrects a pending read invalidated or evicted before completion", async () => {
    for (const invalidate of [
      async () => invalidateBankReadCache(),
      async () => {
        for (let i = 0; i < BANK_LIST_CACHE_MAX_ENTRIES; i++)
          await cachedBankQuestionList(`other-${i}`, async () => result);
      },
    ]) {
      invalidateBankReadCache();
      let finish!: (value: typeof result) => void;
      const old = cachedBankQuestionList(
        "one",
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      await Promise.resolve();
      await invalidate();
      const newer = { total: 1, ids: ["new"] };
      const read = vi.fn().mockResolvedValue(newer);
      expect(await cachedBankQuestionList("one", read)).toBe(newer);
      finish(result);
      await old;
      expect(await cachedBankQuestionList("one", read)).toBe(newer);
      expect(read).toHaveBeenCalledOnce();
    }
  });
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
