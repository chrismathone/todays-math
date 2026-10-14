// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  buildArithmeticV2Sheet,
  getArithmeticV2Definition,
  listArithmeticV2Types,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
  arithmeticV2SheetPayloadSchema,
} from "@/contracts/arithmeticV2.contract";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import {
  arithmeticAngleAssets,
  arithmeticAngleSnapshot,
  arithmeticAngleSvg,
} from "@/lib/arithmetic-v2/geometry";
import assetFile from "@/lib/arithmetic-v2/families/geometry-angle-assets-v1.json";
import { svgLabels } from "@/lib/figure/svgLabels";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { parseStrictJson } from "@/lib/textbook/strictJson";

const ids = ["e4-triangle-missing-angle", "e4-right-triangle-missing-angle"];
const request = (
  allocations = ids.map((typeId) => ({ typeId, count: 10 })),
  rounds = 1,
) => ({
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
  seed: '"'.repeat(128),
  rounds: Array.from({ length: rounds }, () => ({ allocations })),
});

describe("live geometry arithmetic", () => {
  it("registers both selectable grade-four geometry types with checked examples", () => {
    const catalog = listArithmeticV2Types();
    expect(catalog.length).toBeGreaterThanOrEqual(86);
    expect(
      catalog.filter((type) => type.strand === "도형").map((type) => type.id),
    ).toEqual(expect.arrayContaining(ids));
    expect(ids.map((id) => getArithmeticV2Definition(id).domainSize)).toEqual([
      70, 11,
    ]);
    for (const id of ids)
      expect(catalog.find((type) => type.id === id)).toMatchObject({
        grade: "초4",
        example: { layout: "math", figureId: expect.any(String) },
      });
  });

  it("checks EVERY exact domain answer and actual SVG coordinate angle, with no unknown label", () => {
    const prompts = new Set<string>();
    for (const id of ids) {
      const definition = getArithmeticV2Definition(id);
      for (let index = 0; index < definition.domainSize; index++) {
        const candidate = arithmeticV2CandidateSchema.parse(
          definition.problemAt(index),
        );
        expect(definition.verify(candidate)).toBe(true);
        const [a, b] = candidate.parameters;
        const answer = Number(candidate.answer.exact[0]);
        expect(a + b + answer).toBe(180);
        expect(candidate.answer.text).toBe(`${answer}°`);
        expect(candidate.answer.latex).toBe(`${answer}^{\\circ}`);
        expect(prompts.has(arithmeticV2PromptIdentity(candidate.prompt))).toBe(
          false,
        );
        prompts.add(arithmeticV2PromptIdentity(candidate.prompt));
        if (candidate.prompt.layout !== "math")
          throw new Error("Unexpected prompt");
        const svg = arithmeticAngleSvg(
          candidate.prompt.figureId!,
          arithmeticAngleSnapshot,
        );
        const vertices = [
          ...svg.matchAll(/<line x1="([^"]+)" y1="([^"]+)"/g),
        ].map((m) => [Number(m[1]), Number(m[2])]);
        expect(vertices).toHaveLength(3);
        vertices.forEach((v, i) => {
          const p = vertices[(i + 1) % 3],
            q = vertices[(i + 2) % 3];
          const u = [p[0] - v[0], p[1] - v[1]],
            w = [q[0] - v[0], q[1] - v[1]];
          const angle =
            (Math.atan2(
              Math.abs(u[0] * w[1] - u[1] * w[0]),
              u[0] * w[0] + u[1] * w[1],
            ) *
              180) /
            Math.PI;
          expect(Math.abs(angle - [a, b, answer][i])).toBeLessThan(0.01);
        });
        const labels = svgLabels(svg);
        expect(labels.map((label) => label.text)).toEqual(
          b === 90 ? [`${a}°`] : [`${a}°`, `${b}°`],
        );
        const [, , width, height] = /viewBox="([^"]+)"/
          .exec(svg)![1]
          .split(/\s+/)
          .map(Number);
        expect(
          labels.every(
            (label) =>
              label.typeset &&
              (label.fontSize * 216) / Math.max(width, height) >= 16,
          ),
        ).toBe(true);
        expect(svg).not.toMatch(
          /\?|<script|foreignObject|\bon\w+=|(?:href|src)=/i,
        );
        if (b === 90) expect(svg).toMatch(/d="M [^"]+ L [^"]+ L [^"]+"/);
        const wrong = structuredClone(candidate);
        wrong.answer.exact[0] = String(answer + 1);
        expect(definition.verify(wrong)).toBe(false);
      }
      for (const index of [-1, 0.5, NaN, Infinity, definition.domainSize])
        expect(() => definition.problemAt(index)).toThrow();
    }
    expect(prompts.size).toBe(81);
  });

  it("keeps the published SVG pack immutable and self-contained", () => {
    const svgs = Object.fromEntries(
      arithmeticAngleAssets.map((entry) => [
        entry.id,
        arithmeticAngleSvg(entry.id, arithmeticAngleSnapshot),
      ]),
    );
    expect(
      createHash("sha256").update(JSON.stringify(svgs)).digest("hex"),
    ).toBe(assetFile.sha256);
    expect(arithmeticAngleSnapshot.svgPack.length).toBeLessThan(40000);
  });

  it("generates deterministically, persists SVG once, reopens exact snapshots and excludes duplicates", () => {
    const input = request();
    const sheet = buildArithmeticV2Sheet(input);
    expect(buildArithmeticV2Sheet(input)).toEqual(sheet);
    expect(buildArithmeticV2Sheet({ ...input, seed: "new-seed" })).not.toEqual(
      sheet,
    );
    expect(reopenArithmeticV2Sheet(JSON.parse(JSON.stringify(sheet)))).toEqual(
      sheet,
    );
    expect(sheet.figures).toEqual(arithmeticAngleSnapshot);
    expect(
      new Set(
        sheet.rounds[0].items.map((item) =>
          arithmeticV2PromptIdentity(item.prompt),
        ),
      ).size,
    ).toBe(20);
    expect(() =>
      buildArithmeticV2Sheet(request([{ typeId: ids[1], count: 12 }])),
    ).toThrow(expect.objectContaining({ code: "capacity" }));
    expect(() =>
      buildArithmeticV2Sheet(
        request([
          { typeId: ids[0], count: 50 },
          { typeId: ids[0], count: 21 },
        ]),
      ),
    ).toThrow(expect.objectContaining({ code: "capacity" }));
  });

  it.each([
    "missing-pack",
    "bad-pack",
    "unknown-id",
    "wrong-figure",
    "wrong-answer",
    "wrong-index",
  ])("rejects changed geometry snapshot: %s", (change) => {
    const sheet = buildArithmeticV2Sheet(request());
    const item = sheet.rounds[0].items[0];
    if (change === "missing-pack") delete sheet.figures;
    if (change === "bad-pack") sheet.figures!.svgPack = "eJw=";
    if (change === "unknown-id" && item.prompt.layout === "math")
      item.prompt.figureId = "<script>";
    if (change === "wrong-figure" && item.prompt.layout === "math")
      item.prompt.figureId = "right-angle-v1-20";
    if (change === "wrong-answer") item.answer.text = "0°";
    if (change === "wrong-index") item.domainIndex = 70;
    expect(() => reopenArithmeticV2Sheet(sheet)).toThrow();
    if (["missing-pack", "bad-pack", "unknown-id"].includes(change))
      expect(arithmeticV2SheetPayloadSchema.safeParse(sheet).success).toBe(
        false,
      );
  });

  it("projects saved SVG and degree answers without calling a geometry generator", () => {
    const sheet = buildArithmeticV2Sheet(request());
    const before = structuredClone(sheet);
    const definition = getArithmeticV2Definition(ids[0]);
    const spy = vi.spyOn(definition, "problemAt");
    try {
      const problems = arithmeticToStudioProblems(sheet);
      // Existing projection reads the catalog's example once; it does not regenerate items.
      expect(spy).toHaveBeenCalledTimes(1);
      problems.forEach((problem, i) => {
        const item = sheet.rounds[0].items[i];
        if (item.prompt.layout !== "math") throw new Error("Unexpected prompt");
        expect(problem.figureSvg).toBe(
          arithmeticAngleSvg(item.prompt.figureId!, sheet.figures!),
        );
        expect(decodeURIComponent(problem.figureUrls[0].split(",")[1])).toBe(
          problem.figureSvg,
        );
        expect(problem.figureSourceMm[0]).toBeGreaterThan(0);
        expect(problem.figureSourceMm[0]).toBeLessThanOrEqual(57.15);
        expect(problem.content).toContain("[그림1]");
        expect(problem.content).not.toContain(item.answer.latex);
        expect(problem.content).not.toContain("?");
        expect(problem.answer).toBe(`$${item.answer.latex}$`);
        expect(problem.solution).toBe("");
      });
      expect(sheet).toEqual(before);
    } finally {
      spy.mockRestore();
    }
  });

  it("fits 200 mixed/geometry items and presentation in the unchanged 256 KiB save guard", () => {
    for (const input of [
      request(undefined, 10),
      request([{ typeId: ids[0], count: 10 }], 20),
      request(
        [
          { typeId: ids[0], count: 70 },
          { typeId: ids[1], count: 11 },
          { typeId: "m2-polynomial-add", count: 19 },
        ],
        2,
      ),
    ]) {
      const payload = {
        ...buildArithmeticV2Sheet(input),
        presentation: defaultArithmeticPresentation("학원"),
      };
      const body = JSON.stringify({
        kind: "arithmeticSheet",
        title: "가".repeat(100),
        expectedRevision: null,
        payload,
      });
      expect(Buffer.byteLength(body)).toBeLessThan(256 * 1024);
      expect(() =>
        parseStrictJson(body, { maxBytes: 256 * 1024, maxDepth: 16 }),
      ).not.toThrow();
      expect(reopenArithmeticV2Sheet(payload)).toEqual(payload);
    }
  });
});
