// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalJson } from "@/lib/textbook/canonical";
import { contentHash, sha256, snapshotHash } from "@/lib/textbook/hash.server";
import { validateTextbookIntegrity } from "@/lib/textbook/integrity.server";
import { validateTextbookReferences } from "@/lib/textbook/references";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { textbookFixture, SYNTHETIC_ORIGIN } from "../helpers/textbookFixture";

function figures() {
  const exchange = textbookFixture(1, 1);
  const bytes = new TextEncoder().encode(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><path d="M0 0 L20 10"/></svg>',
  );
  const snapshot = exchange.snapshots[0];
  exchange.assets = ["first", "second"].map((assetId) => ({
    assetId,
    sha256: sha256(bytes),
    mimeType: "image/svg+xml",
    packagePath: `assets/${assetId}.svg`,
    widthPx: 20,
    heightPx: 10,
  }));
  snapshot.payload.figures = exchange.assets.map((asset) => ({
    assetId: asset.assetId,
    sha256: asset.sha256,
    choiceIndex: null,
    sourceWidthMm: null,
    altText: asset.assetId,
  }));
  snapshot.rawSource!.figureUrls = [
    "/figures-svg/first.svg",
    "/figures-svg/second.svg",
  ];
  snapshot.rawSource!.figureDims = [20, 10, 20, 10];
  const rehash = () => {
    snapshot.contentHash = contentHash(snapshot.payload);
    snapshot.snapshotHash = snapshotHash(snapshot);
  };
  rehash();
  return { exchange, snapshot, bytes, rehash };
}
const options = {
  mode: "publish" as const,
  officialOrigin: SYNTHETIC_ORIGIN,
  requirePageMap: false,
};

describe("unknown figure links preserve source without hiding invalid mappings", () => {
  it("permits unknown links with a visible warning and original-order unattached figures, without changing bytes or hashes", async () => {
    const { exchange, snapshot, bytes } = figures();
    const before = canonicalJson(exchange);
    const issues = await validateTextbookIntegrity(exchange, {
      ...options,
      readAsset: async () => bytes,
    });
    expect(issues).toHaveLength(2);
    expect(
      issues.every(
        (issue) =>
          issue.code === "FIGURE_CHOICE_UNKNOWN" &&
          issue.severity === "warning",
      ),
    ).toBe(true);
    const block = createTextbookRenderModel(
      exchange,
      "student",
    ).sections[0].blocks.find((b) => b.kind === "problem")!;
    const html = renderBlockHtml(block, {
      assetUrl: (id) => `/assets/${id}.svg`,
      qrDataUrl: () => "/qr.svg",
    });
    expect(html.indexOf('alt="first"')).toBeLessThan(
      html.indexOf('alt="second"'),
    );
    expect(html.match(/data-choice-index="unknown"/g)).toHaveLength(2);
    expect(html).toContain("보기 대응 정보 없음 · 원본 순서로 표시");
    expect(html).not.toMatch(/data-choice-index="0"|번 보기/);
    expect(snapshot.rawSource!.choiceFigureIndex).toEqual([]);
    expect(snapshot.payload.figures.map((f) => f.choiceIndex)).toEqual([
      null,
      null,
    ]);
    expect(canonicalJson(exchange)).toBe(before);
  });

  it.each(
    [[1], [1, 1], [0, 11], [-1, 2], [1.5, 2]].map((mapping) => ({ mapping })),
  )(
    "blocks malformed explicit mapping $mapping even when capture projected unknown links",
    ({ mapping }) => {
      const { exchange, snapshot, rehash } = figures();
      snapshot.rawSource!.choiceFigureIndex = mapping;
      rehash();
      const before = canonicalJson(exchange);
      expect(validateTextbookReferences(exchange, options)).toContainEqual(
        expect.objectContaining({
          code: "RAW_FIGURE_ALIGNMENT",
          severity: "error",
        }),
      );
      expect(canonicalJson(exchange)).toBe(before);
    },
  );

  it("keeps explicit body and choice labels, and blocks duplicate positive payload links", () => {
    const { exchange, snapshot } = figures();
    snapshot.rawSource!.choiceFigureIndex = [0, 2];
    snapshot.payload.figures[0].choiceIndex = 0;
    snapshot.payload.figures[1].choiceIndex = 2;
    expect(validateTextbookReferences(exchange, options)).toEqual([]);
    const block = createTextbookRenderModel(
      exchange,
      "student",
    ).sections[0].blocks.find((b) => b.kind === "problem")!;
    const html = renderBlockHtml(block, {
      assetUrl: (id) => `/assets/${id}.svg`,
      qrDataUrl: () => "/qr.svg",
    });
    expect(html).toContain('data-choice-index="0"');
    expect(html).toContain("2번 보기");
    expect(html).not.toContain("대응 정보 없음");
    snapshot.payload.figures[0].choiceIndex = 2;
    expect(validateTextbookReferences(exchange, options)).toContainEqual(
      expect.objectContaining({
        code: "FIGURE_CHOICE_DUPLICATE",
        severity: "error",
      }),
    );
  });

  it("still rejects missing assets and corrupt bytes when links are unknown", async () => {
    const { exchange } = figures();
    expect(
      await validateTextbookIntegrity(exchange, {
        ...options,
        readAsset: async () => new Uint8Array([1, 2]),
      }),
    ).toContainEqual(
      expect.objectContaining({ code: "ASSET_BYTES", severity: "error" }),
    );
    exchange.assets.pop();
    expect(
      validateTextbookReferences(exchange, options).some(
        (issue) => issue.severity === "error",
      ),
    ).toBe(true);
  });
});
