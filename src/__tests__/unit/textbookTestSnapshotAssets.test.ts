// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const queries = vi.hoisted(() => ({ raw: vi.fn() }));
vi.mock("@/lib/db", () => ({
  // 월말평가 M1 — 로더가 반 시험의 발행본을 한 번 묻는다(이 시험의 반 시험은 발행본이 없다).
  db: { $queryRaw: queries.raw, test: { findMany: async () => [] } },
}));

import { hydrateTestSnapshots } from "@/lib/tests/loadSnapshotAssets";
import {
  contentOf,
  serializeFrozenTestProblemItem,
} from "@/lib/tests/testProblemContent";
import { testProblemItemSchema } from "@/contracts/test.contract";
import { sha256 } from "@/lib/textbook/hash.server";
import {
  frozenSnapshot,
  testItem,
  OWNER_ID,
  OTHER_SNAPSHOT_ID,
} from "../fixtures/textbookTestProblem";

const OTHER_OWNER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const THIRD_OWNER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>';
const bytes = new TextEncoder().encode(svg);
const id = sha256(bytes);
const asset = {
  userId: OWNER_ID,
  id,
  mimeType: "image/svg+xml",
  widthPx: null,
  heightPx: null,
  size: bytes.byteLength,
};
const figure = {
  assetId: id,
  sha256: id,
  choiceIndex: null,
  sourceWidthMm: null,
  altText: null,
};
function row() {
  const base = frozenSnapshot();
  return testItem(
    frozenSnapshot({ payload: { ...base.payload, figures: [figure] } }),
  );
}
function succeeds() {
  queries.raw
    .mockResolvedValueOnce([{ ...asset }])
    .mockResolvedValueOnce([{ ...asset, bytes }]);
}
beforeEach(() => queries.raw.mockReset());

describe("Test snapshot assets are bound to their validated snapshot owner", () => {
  it("does no asset I/O for legacy rows or a figureless snapshot", async () => {
    const legacy = { ...testItem(), snapshotId: null, snapshot: null };
    const frozen = testItem();
    const result = await hydrateTestSnapshots([legacy, frozen]);
    expect(result[0]).toBe(legacy);
    expect(result[1]).toBe(frozen);
    expect(queries.raw).not.toHaveBeenCalled();
  });

  it("keeps nullable geometry and uses verified bytes instead of the changed live image URL", async () => {
    succeeds();
    const input = row();
    const [hydrated] = await hydrateTestSnapshots([input]);
    const parsed = testProblemItemSchema.parse(
      serializeFrozenTestProblemItem(hydrated),
    );
    expect(parsed.problem.figureUrls).toEqual([
      `data:image/svg+xml;base64,${Buffer.from(bytes).toString("base64")}`,
    ]);
    expect(parsed.problem.figureDims).toEqual([null, null]);
    expect(parsed.problem.figureSourceMm).toEqual([null]);
    expect(parsed.problem.choiceFigureIndex).toEqual([null]);
    expect(input).not.toHaveProperty("snapshotAssets");
  });

  it("scopes a shared hash independently to each snapshot owner and deduplicates only within an owner", async () => {
    const original = row();
    const reissued = {
      ...row(),
      testId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    const other = row();
    other.snapshotId = OTHER_SNAPSHOT_ID;
    other.snapshot.id = OTHER_SNAPSHOT_ID;
    other.snapshot.userId = OTHER_OWNER;
    const metadata = [
      { ...asset },
      { ...asset, userId: OTHER_OWNER, widthPx: 10, heightPx: 20 },
    ];
    queries.raw
      .mockResolvedValueOnce(metadata)
      .mockResolvedValueOnce(metadata.map((a) => ({ ...a, bytes })));
    const result = await hydrateTestSnapshots([original, reissued, other]);
    expect(contentOf(result[0]).figureDims).toEqual([null, null]);
    expect(contentOf(result[1]).figureDims).toEqual([null, null]);
    expect(contentOf(result[2]).figureDims).toEqual([10, 20]);
    for (const [sql] of queries.raw.mock.calls) {
      expect(sql.values).toEqual([OWNER_ID, id, OTHER_OWNER, id]);
      expect(sql.values).not.toContain(reissued.testId);
    }
  });

  it("rejects a forged payload and invalid owner before selecting any assets", async () => {
    const forged = row();
    forged.snapshot.payload = {
      ...frozenSnapshot().payload,
      answer: "changed",
    };
    await expect(hydrateTestSnapshots([forged])).rejects.toThrow(/해시/);
    const owner = row();
    owner.snapshot.userId = "not-a-uuid";
    await expect(hydrateTestSnapshots([owner])).rejects.toThrow();
    expect(queries.raw).not.toHaveBeenCalled();
  });

  it("rejects an asset ID/hash mismatch even when the enclosing snapshot hashes match", async () => {
    const base = frozenSnapshot();
    const input = testItem(
      frozenSnapshot({
        payload: {
          ...base.payload,
          figures: [{ ...figure, assetId: "different-id" }],
        },
      }),
    );
    await expect(hydrateTestSnapshots([input])).rejects.toThrow(/ID/);
    expect(queries.raw).not.toHaveBeenCalled();
  });
});

describe("bounded complete asset hydration", () => {
  it.each([
    ["missing", []],
    ["foreign owner", [{ ...asset, userId: THIRD_OWNER }]],
    ["unrequested hash", [{ ...asset, id: "f".repeat(64) }]],
    ["negative size", [{ ...asset, size: -1 }]],
    ["zero size", [{ ...asset, size: 0 }]],
    ["fractional size", [{ ...asset, size: 1.5 }]],
    ["NaN size", [{ ...asset, size: NaN }]],
    ["unsafe size", [{ ...asset, size: Number.MAX_SAFE_INTEGER + 1 }]],
    ["excessive size", [{ ...asset, size: 64 * 1024 * 1024 + 1 }]],
    ["font", [{ ...asset, mimeType: "font/woff2" }]],
    ["unsupported MIME", [{ ...asset, mimeType: "text/html" }]],
    ["partial dimensions", [{ ...asset, widthPx: 10 }]],
    ["negative dimensions", [{ ...asset, widthPx: -10, heightPx: -20 }]],
  ])("rejects %s metadata before reading bytes", async (_label, metadata) => {
    queries.raw.mockResolvedValueOnce(metadata);
    await expect(hydrateTestSnapshots([row()])).rejects.toThrow();
    expect(queries.raw).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate owner/hash pairs even when the total count matches", async () => {
    const other = row();
    other.snapshot.userId = OTHER_OWNER;
    queries.raw.mockResolvedValueOnce([asset, asset]);
    await expect(hydrateTestSnapshots([row(), other])).rejects.toThrow(/목록/);
    expect(queries.raw).toHaveBeenCalledTimes(1);
  });

  it("bounds the aggregate bytes across owners before loading blobs", async () => {
    const other = row();
    other.snapshot.userId = OTHER_OWNER;
    queries.raw.mockResolvedValueOnce([
      { ...asset, size: 40 * 1024 * 1024 },
      { ...asset, userId: OTHER_OWNER, size: 40 * 1024 * 1024 },
    ]);
    await expect(hydrateTestSnapshots([row(), other])).rejects.toThrow(/용량/);
    expect(queries.raw).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing row", []],
    ["foreign owner", [{ ...asset, bytes, userId: THIRD_OWNER }]],
    ["missing bytes", [{ ...asset }]],
    ["truncated bytes", [{ ...asset, bytes: bytes.subarray(1) }]],
    [
      "same-length wrong bytes",
      [{ ...asset, bytes: new Uint8Array(bytes.length) }],
    ],
    ["changed size", [{ ...asset, bytes, size: bytes.length + 1 }]],
    ["changed dimensions", [{ ...asset, bytes, widthPx: 10, heightPx: 10 }]],
    ["changed MIME", [{ ...asset, bytes, mimeType: "image/png" }]],
  ])("fails closed on %s in the byte query", async (_label, loaded) => {
    queries.raw.mockResolvedValueOnce([asset]).mockResolvedValueOnce(loaded);
    await expect(hydrateTestSnapshots([row()])).rejects.toThrow();
  });

  it.each([
    ["HTML masquerading as SVG", "<html><body>test</body></html>"],
    [
      "executable SVG",
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ],
    [
      "external SVG reference",
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/image.png"/></svg>',
    ],
  ])("rejects correctly hashed %s", async (_label, text) => {
    const badBytes = new TextEncoder().encode(text);
    const badId = sha256(badBytes);
    const base = frozenSnapshot();
    const input = testItem(
      frozenSnapshot({
        payload: {
          ...base.payload,
          figures: [{ ...figure, assetId: badId, sha256: badId }],
        },
      }),
    );
    const badAsset = { ...asset, id: badId, size: badBytes.length };
    queries.raw
      .mockResolvedValueOnce([badAsset])
      .mockResolvedValueOnce([{ ...badAsset, bytes: badBytes }]);
    await expect(hydrateTestSnapshots([input])).rejects.toThrow();
  });
});
