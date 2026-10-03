// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalJson } from "@/lib/textbook/canonical";
import {
  contentHash,
  snapshotHash,
  manifestHash,
} from "@/lib/textbook/hash.server";
import { validateTextbookReferences } from "@/lib/textbook/references";
import { assertTextbookIntegrity } from "@/lib/textbook/integrity.server";
import { snapshotToPrintable } from "@/lib/textbook/snapshotToPrintable";
import {
  textbookFixture,
  publishedFixture,
  fixtureUuid,
  SYNTHETIC_ORIGIN,
} from "../helpers/textbookFixture";

describe("textbook hash projections and cross references", () => {
  it("accepts complete synthetic cross refs including repeated snapshots under distinct items", async () => {
    const e = publishedFixture();
    e.items[1].snapshotId = e.items[0].snapshotId;
    e.edition.manifestHash = manifestHash(e);
    await expect(
      assertTextbookIntegrity(e, {
        mode: "publish",
        officialOrigin: SYNTHETIC_ORIGIN,
      }),
    ).resolves.toBeUndefined();
  });
  it("separates content, capture identity, packaging and mutable-video hashes", () => {
    const e = publishedFixture(),
      h = manifestHash(e),
      s = structuredClone(e.snapshots[0]);
    s.source = {
      system: "todays-math",
      problemId: fixtureUuid(999),
      problemCode: "different",
    };
    expect(contentHash(s.payload)).toBe(e.snapshots[0].contentHash);
    expect(snapshotHash(s)).not.toBe(e.snapshots[0].snapshotHash);
    e.snapshots[0] = s;
    expect(manifestHash(e)).not.toBe(h);
    const original = publishedFixture();
    original.exportedAt = "2026-10-04T00:00:00Z";
    original.edition.revision++;
    original.videoBindings.push({
      bindingId: "binding",
      snapshotId: original.snapshots[0].snapshotId,
      videoId: "video",
      status: "draft",
      startSeconds: 0,
      endSeconds: null,
      reviewedAgainstHash: null,
    });
    expect(manifestHash(original)).toBe(h);
    for (const key of ["answer", "solution", "content"] as const) {
      const changed = structuredClone(original);
      changed.snapshots[0].payload[key] += " ";
      expect(manifestHash(changed)).not.toBe(h);
    }
    original.snapshots[0].capturedAt = "2026-10-05T00:00:00Z";
    expect(manifestHash(original)).toBe(h);
    const asset = {
      assetId: "asset",
      packagePath: "assets/a.png",
      mimeType: "image/png" as const,
      sha256: "a".repeat(64),
      widthPx: 1,
      heightPx: 1,
    };
    original.assets.push(asset);
    const packagedHash = manifestHash(original);
    asset.packagePath = "assets/moved.png";
    expect(manifestHash(original)).toBe(packagedHash);
  });
  it.each([
    [
      "duplicate item",
      (e: ReturnType<typeof textbookFixture>) => e.items.push(e.items[0]),
      "DUPLICATE_ID",
    ],
    [
      "duplicate block ref",
      (e: ReturnType<typeof textbookFixture>) =>
        e.units[0].sections[0].blocks.push({
          blockId: "new",
          kind: "problem",
          itemId: e.items[0].itemId,
        }),
      "ITEM_REUSED",
    ],
    [
      "missing snapshot",
      (e: ReturnType<typeof textbookFixture>) => {
        e.items[0].snapshotId = "missing";
      },
      "MISSING_SNAPSHOT",
    ],
    [
      "order mismatch",
      (e: ReturnType<typeof textbookFixture>) => {
        e.items[0].orderIndex = 90;
      },
      "ITEM_ORDER",
    ],
    [
      "cross edition",
      (e: ReturnType<typeof textbookFixture>) => {
        e.items[0].editionId = "other";
      },
      "EDITION_MISMATCH",
    ],
    [
      "QR target swap",
      (e: ReturnType<typeof textbookFixture>) => {
        e.qrTargets[0].itemId = e.items[1].itemId;
      },
      "QR_ITEM",
    ],
    [
      "raw alignment",
      (e: ReturnType<typeof textbookFixture>) => {
        e.snapshots[0].rawSource!.figureDims = [1];
      },
      "RAW_FIGURE_ALIGNMENT",
    ],
  ] as const)("rejects %s", (_, edit, code) => {
    const e = textbookFixture();
    edit(e);
    expect(validateTextbookReferences(e).some((i) => i.code === code)).toBe(
      true,
    );
  });
  it("fails forged hashes, stale video review and official origin mismatch", async () => {
    const e = publishedFixture();
    e.snapshots[0].payload.answer = "tampered";
    await expect(assertTextbookIntegrity(e)).rejects.toThrow(/CONTENT_HASH/);
    e.videoBindings.push({
      bindingId: "b",
      snapshotId: e.snapshots[0].snapshotId,
      videoId: "v",
      status: "published",
      startSeconds: 0,
      endSeconds: null,
      reviewedAgainstHash: "f".repeat(64),
    });
    expect(
      validateTextbookReferences(e, {
        mode: "publish",
        officialOrigin: "https://other.example.test",
      }).map((i) => i.code),
    ).toEqual(expect.arrayContaining(["VIDEO_HASH", "QR_ORIGIN"]));
  });
  it("keeps old extension absence and snapshot display isolated from live fields", () => {
    const e = textbookFixture(),
      s = e.snapshots[0];
    delete s.rawSource;
    delete s.sourceMetadata;
    delete s.snapshotHash;
    delete e.canonicalizationVersion;
    expect(canonicalJson(s)).not.toContain('"rawSource"');
    const print = snapshotToPrintable(s, 3, () => {
      throw new Error("no asset expected");
    });
    expect(print.content).toBe(s.payload.content);
    expect(print.answer).toBe(s.payload.answer);
    expect(print.orderIndex).toBe(3);
    expect(
      validateTextbookReferences(e, {
        mode: "publish",
        officialOrigin: SYNTHETIC_ORIGIN,
        requirePageMap: false,
      }).some((i) => i.code === "SNAPSHOT_EXTENSION_REQUIRED"),
    ).toBe(true);
  });
  it("extracts only the first inline SVG occurrence and preserves repeated figure placements", () => {
    const s = textbookFixture().snapshots[0];
    s.rawSource!.figureSvgAssetId = "same-svg";
    const fig = {
      assetId: "same-svg",
      sha256: "a".repeat(64),
      altText: null,
      sourceWidthMm: null,
      choiceIndex: 0,
    };
    s.payload.figures = [
      fig,
      { ...fig, choiceIndex: 2 },
      { ...fig, choiceIndex: null },
    ];
    const print = snapshotToPrintable(s, 0, () => ({
      url: "/fixed.svg",
      widthPx: null,
      heightPx: null,
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="2"/></svg>',
    }));
    expect(print.figureUrls).toEqual(["/fixed.svg", "/fixed.svg"]);
    expect(print.choiceFigureIndex).toEqual([2, null]);
    expect(print.frozenFigures).toHaveLength(3);
    expect(print.figureSvg).toContain("circle");
    expect(print.figureDims).toEqual([null, null, null, null]);
    expect(print.figureSourceMm).toEqual([null, null]);
  });
});
