import { describe, expect, it } from "vitest";
import {
  AUTHORED_IMAGE_KIND,
  IMAGE_REVIEW_CHECKS,
  imageBindingSha256,
  imageBytesSha256,
  renderSavedAuthoredImage,
  type ImageAssetReview,
  type SavedAuthoredImage,
} from "@/lib/engine/authoredImage";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

// Actual decodable PNG. A fixture represents review evidence only in this test;
// no production asset or problem gains permission from these synthetic passes.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=",
  "base64",
);
const proof = "a".repeat(64);
function saved(): SavedAuthoredImage {
  return {
    assetId: "fixture-scene-v1",
    png,
    generation: {
      tool: "built-in image_gen.imagegen",
      paidApiCliFallback: false,
      generationSha256: proof,
      promptSha256: proof,
    },
    binding: {
      templateId: "fixture-right-triangle",
      templateVersion: "1",
      studentContentSha256: proof,
      diagramSha256: proof,
      curriculum: { grade: "중3", edition: "2015", examYear: 2025 },
      unitId: null,
      familyKey: null,
      classificationSnapshotSha256: null,
      calculationAuthority: "explicit-math-facts-not-image-pixels",
      facts: { heightM: 12.8, eyeHeightM: 1.6, displayedTan: "1.6003" },
      factRelations: ["AB=(heightM-eyeHeightM)/displayedTan"],
      constraints: ["heightM>eyeHeightM>0", "0<angle<90"],
      pointRoles: { A: "eye", B: "horizontal projection" },
      variant: {
        modes: ["inverse-target"],
        sharedConcept: "right-triangle tangent",
        sharedProcedure: "select ratio and eye-height correction",
        changeEvidence:
          "given height and ask distance instead of given distance and ask height",
      },
    },
    review: null,
  };
}
const spec = (a: SavedAuthoredImage) => ({
  kind: AUTHORED_IMAGE_KIND,
  assetId: a.assetId,
  assetSha256: imageBytesSha256(a.png),
  bindingSha256: imageBindingSha256(a.binding),
  generationSha256: a.generation.generationSha256,
  promptSha256: a.generation.promptSha256,
});
function passingReview(a: SavedAuthoredImage): ImageAssetReview {
  return {
    assetSha256: imageBytesSha256(a.png),
    bindingSha256: imageBindingSha256(a.binding),
    generationSha256: a.generation.generationSha256,
    promptSha256: a.generation.promptSha256,
    checks: Object.fromEntries(
      IMAGE_REVIEW_CHECKS.map((k) => [
        k,
        { status: "pass", evidenceSha256: proof },
      ]),
    ) as ImageAssetReview["checks"],
  };
}

describe("saved imagegen assets in the existing figure renderer", () => {
  it.each([
    [
      "invalid zlib",
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAA0lEQVQBAgNTNxetAAAAAElFTkSuQmCC",
    ],
    [
      "invalid bit depth",
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAwYAAABoxfWYAAAAC0lEQVR4nGP4DwQACfsD/fteaysAAAAASUVORK5CYII=",
    ],
    [
      "unsupported indexed image without palette",
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAMAAAAoyzS7AAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==",
    ],
    [
      "invalid row filter",
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGP9DwQAChQEAmH2JHYAAAAASUVORK5CYII=",
    ],
    [
      "inflation beyond declared dimensions",
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAIUlEQVR4nO3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAODfACcQAAEU2DjZAAAAAElFTkSuQmCC",
    ],
  ])(
    "rejects CRC-valid %s before returning a successful display",
    (_label, base64) => {
      const a = saved();
      a.png = Buffer.from(base64, "base64");
      expect(
        renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]]), "preview")
          .ok,
      ).toBe(false);
    },
  );

  it("renders immutable pixels only with explicit trusted resources; default cannot release held assets", async () => {
    const a = saved();
    expect((await renderFigureSpec(spec(a))).ok).toBe(false);
    const assets = new Map([[a.assetId, a]]);
    expect(
      (
        await renderFigureSpec(spec(a), {
          authoredImages: { assets, purpose: "approved-display" },
        })
      ).ok,
    ).toBe(false);
    const preview = await renderFigureSpec(spec(a), {
      authoredImages: { assets, purpose: "preview" },
    });
    expect(preview.ok, JSON.stringify(preview)).toBe(true);
    if (!preview.ok) return;
    expect(preview.authoredImage?.heldChecks).toEqual(IMAGE_REVIEW_CHECKS);
    expect(preview.authoredImage?.problemApproval).toBe(false);
    const embedded = /base64,([^"']+)/.exec(preview.svg)![1]!;
    expect(Buffer.from(embedded, "base64")).toEqual(png);
  });

  it("stales evidence when any student, diagram, parameter, curriculum or variant binding changes", () => {
    for (const mutate of [
      (a: SavedAuthoredImage) => {
        a.binding.facts.heightM = 13;
      },
      (a: SavedAuthoredImage) => {
        a.binding.studentContentSha256 = "b".repeat(64);
      },
      (a: SavedAuthoredImage) => {
        a.binding.diagramSha256 = "b".repeat(64);
      },
      (a: SavedAuthoredImage) => {
        a.binding.variant.changeEvidence += " revised";
      },
    ]) {
      const a = saved(),
        previous = spec(a);
      mutate(a);
      expect(
        renderSavedAuthoredImage(previous, new Map([[a.assetId, a]]), "preview")
          .ok,
      ).toBe(false);
    }
  });

  it("stales old request and review when generation provenance changes but pixels do not", () => {
    for (const field of ["generationSha256", "promptSha256"] as const) {
      const a = saved();
      a.binding.unitId = "49eea45c-142a-4eb4-9427-b510034b5426";
      a.binding.familyKey = "fixture-only";
      a.binding.classificationSnapshotSha256 = proof;
      a.review = passingReview(a);
      const previous = spec(a);
      a.generation[field] = "b".repeat(64);
      const assets = new Map([[a.assetId, a]]);
      expect(renderSavedAuthoredImage(previous, assets, "preview").ok).toBe(
        false,
      );
      expect(renderSavedAuthoredImage(spec(a), assets).ok).toBe(false);
      expect(
        renderSavedAuthoredImage(spec(a), assets, "preview"),
      ).toMatchObject({
        ok: true,
        authoredImage: { heldChecks: IMAGE_REVIEW_CHECKS },
      });
    }
  });

  it("enforces applied curriculum and excludes every rejected student surface even in preview", () => {
    for (const name of IMAGE_REVIEW_CHECKS.slice(0, 8)) {
      const a = saved();
      a.review = passingReview(a);
      a.review.checks[name] = { status: "reject", evidenceSha256: proof };
      expect(
        renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]]), "preview"),
      ).toMatchObject({ ok: false, error: expect.stringContaining(name) });
    }
    const a = saved();
    a.binding.curriculum.examYear = 2027;
    expect(
      renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]]), "preview")
        .ok,
    ).toBe(false);
    a.binding.curriculum.edition = "2022";
    expect(
      renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]]), "preview")
        .ok,
    ).toBe(true);
  });

  it("requires current per-dimension proofs and real classification references for approved display", () => {
    const a = saved();
    a.review = passingReview(a);
    expect(
      renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]])).ok,
    ).toBe(false);
    a.binding.unitId = "49eea45c-142a-4eb4-9427-b510034b5426";
    a.binding.familyKey = "fixture-only";
    a.binding.classificationSnapshotSha256 = proof;
    a.review = passingReview(a);
    expect(
      renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]])),
    ).toMatchObject({
      ok: true,
      authoredImage: { heldChecks: [], problemApproval: false },
    });
    for (const name of IMAGE_REVIEW_CHECKS) {
      a.review = passingReview(a);
      a.review.checks[name] = { status: "pass", evidenceSha256: null };
      expect(
        renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]])).ok,
      ).toBe(false);
    }
    a.review = passingReview(a);
    a.review.bindingSha256 = "b".repeat(64);
    expect(
      renderSavedAuthoredImage(spec(a), new Map([[a.assetId, a]])).ok,
    ).toBe(false);
  });

  it("rejects changed/corrupt PNGs, extra request fields, external resources and fake generation provenance", () => {
    const a = saved(),
      assets = new Map([[a.assetId, a]]);
    expect(
      renderSavedAuthoredImage(
        { ...spec(a), href: "https://example.com/image.png" },
        assets,
        "preview",
      ).ok,
    ).toBe(false);
    const old = spec(a);
    a.png = Buffer.from(a.png);
    a.png[20] ^= 1;
    expect(renderSavedAuthoredImage(old, assets, "preview").ok).toBe(false);
    expect(renderSavedAuthoredImage(spec(a), assets, "preview").ok).toBe(false);
    a.png = Buffer.concat([png, Buffer.from("<script>alert(1)</script>")]);
    expect(renderSavedAuthoredImage(spec(a), assets, "preview").ok).toBe(false);
    a.png = png;
    a.generation.paidApiCliFallback = true as false;
    expect(renderSavedAuthoredImage(spec(a), assets, "preview").ok).toBe(false);
  });

  it("keeps cancellation and ordinary figure schema behavior at the existing entrypoint", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      (await renderFigureSpec(spec(saved()), { signal: controller.signal })).ok,
    ).toBe(false);
    expect((await renderFigureSpec(null)).ok).toBe(false);
  });
});
