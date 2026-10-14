// @vitest-environment node
import { createHash } from "node:crypto";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  createTriangleAngleDrillSpec,
  renderTriangleAngleDrill,
} from "@/lib/figure/triangleAngleDrill";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import {
  geometryDrillFailures,
  measureGeometryDrills,
} from "../../../scripts/qa/geometryDrillProof";

// The owner's twelve local samples (including the reported tall sample 6).
const cases: [number, number][] = [
  [25, 60],
  [45, 40],
  [25, 55],
  [75, 40],
  [25, 70],
  [85, 70],
  [60, 65],
  [50, 25],
  [35, 75],
  [35, 60],
  [50, 65],
  [40, 40],
];

function angleAt(p: number[], v: number[], q: number[]) {
  const [ux, uy] = [p[0] - v[0], p[1] - v[1]];
  const [vx, vy] = [q[0] - v[0], q[1] - v[1]];
  return (
    (Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * 180) / Math.PI
  );
}

describe("opt-in triangle angle drills", () => {
  let browser: Browser;
  let page: Page;
  const svgs: string[] = [];
  beforeAll(async () => {
    vi.stubEnv("STUDIO_ENGINE_URL", "");
    vi.stubEnv("VERCEL", "0");
    vi.stubGlobal("fetch", () => {
      throw new Error("Network forbidden in geometry tests");
    });
    for (const given of cases) {
      const result = await renderTriangleAngleDrill(given);
      expect(result.ok, result.ok ? "" : result.error).toBe(true);
      if (!result.ok) throw new Error(result.error);
      svgs.push(result.svg);
    }
    browser = await chromium.launch();
    page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
  }, 60_000);
  afterAll(async () => {
    await browser?.close();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("preserves exact source angles, including obtuse A/B and decimal angles", () => {
    for (const given of [...cases, [110, 35], [35, 110], [42.5, 67.5]] as [
      number,
      number,
    ][]) {
      const { A, B, C } = createTriangleAngleDrillSpec(given).points;
      expect(angleAt(B, A, C)).toBeCloseTo(given[0], 10);
      expect(angleAt(A, B, C)).toBeCloseTo(given[1], 10);
      expect(angleAt(A, C, B)).toBeCloseTo(180 - given[0] - given[1], 10);
      const xs = [A[0], B[0], C[0]],
        ys = [A[1], B[1], C[1]];
      expect(
        Math.max(
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
        ),
      ).toBeCloseTo(150, 10);
    }
  });

  it.each(["screen", "print"] as const)(
    "all 12 are legible, exact and collision-free at 216px in %s",
    async (media) => {
      await page.setContent(
        `<style>svg{width:216px;height:216px}@media print{svg{width:57.15mm;height:57.15mm}}</style>${svgs.map((svg) => `<article>${svg}</article>`).join("")}`,
      );
      await page.emulateMedia({ media });
      const proofs = await measureGeometryDrills(page);
      expect(proofs).toHaveLength(12);
      proofs.forEach((proof, i) => {
        expect(
          geometryDrillFailures(proof, cases[i]),
          `sample ${i + 1}`,
        ).toEqual([]);
        expect(proof.widthPx).toBeCloseTo(216, 5);
        expect(proof.heightPx).toBeCloseTo(216, 5);
      });
      expect(proofs[5].leaderCount).toBeGreaterThan(0);
      expect(proofs[5].labels[0].fontPx).toBeGreaterThan(17);
    },
  );

  it("the browser probe rejects shrunken labels and actual overlapping paths", async () => {
    await page.setContent(
      `<style>svg{width:80px;height:80px}</style><article>${svgs[5]}</article>`,
    );
    expect(
      geometryDrillFailures((await measureGeometryDrills(page))[0], cases[5]),
    ).toContain("unreadable label size");
    await page.setContent(
      `<style>svg{width:216px;height:216px}</style><article>${svgs[5]}</article>`,
    );
    await page.locator("[data-label]").evaluateAll((labels) => {
      labels[1].setAttribute("transform", labels[0].getAttribute("transform")!);
    });
    expect(
      (await measureGeometryDrills(page))[0].labelHits.length,
    ).toBeGreaterThan(0);
    await page.setContent(
      `<style>svg{width:216px;height:216px}</style><article>${svgs[5]}</article>`,
    );
    await page
      .locator("path")
      .evaluateAll((paths) =>
        paths
          .filter((p) => / Q /.test(p.getAttribute("d") ?? ""))
          .forEach((p) => p.remove()),
      );
    expect(
      (await measureGeometryDrills(page))[0].outsideWithoutLeader.length,
    ).toBeGreaterThan(0);
  });

  it("leaves ordinary v2 rendering byte-identical to the original sample 6", async () => {
    const a = 85,
      b = 70,
      c = 25,
      r = Math.PI / 180;
    const ac = (240 * Math.sin(b * r)) / Math.sin(c * r);
    const drill = createTriangleAngleDrillSpec([a, b]);
    const spec = {
      ...drill,
      // Historical non-drill input keeps its question-mark label unchanged.
      angles: { ...drill.angles, atC: { ...drill.angles.atC, label: "?" } },
      style: undefined,
      points: {
        A: [0, 0],
        B: [240, 0],
        C: [ac * Math.cos(a * r), -ac * Math.sin(a * r)],
      },
    };
    const result = await renderFigureSpec(spec, { strict: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(createHash("sha256").update(result.svg).digest("hex")).toBe(
      "40c4c41d577b2ea12b3d9485fff6c6c3e026738b820d05636cd005ed52cba92f",
    );
    const disabled = await renderFigureSpec(
      { ...spec, style: { clear_angle_labels: false } },
      { strict: true },
    );
    expect(disabled).toEqual(result);
  });

  it("rejects invalid angles, invalid opt-in flags and crowded layouts instead of faking a result", async () => {
    for (const given of [
      [0, 45],
      [-5, 45],
      [90, 90],
      [NaN, 30],
      [Infinity, 30],
    ] as [number, number][]) {
      expect(() => createTriangleAngleDrillSpec(given)).toThrow();
      expect((await renderTriangleAngleDrill(given)).ok).toBe(false);
    }
    const spec = createTriangleAngleDrillSpec([60, 60]);
    const invalid = await renderFigureSpec(
      { ...spec, style: { ...spec.style, clear_angle_labels: "yes" } },
      { strict: true },
    );
    expect(invalid.ok).toBe(false);
    const crowded = await renderFigureSpec(
      {
        ...spec,
        angles: {
          ...spec.angles,
          atA: { ...spec.angles.atA, label: "1".repeat(100) },
        },
      },
      { strict: true },
    );
    expect(crowded.ok).toBe(false);
  });
});
