// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/lab/math-srs/figure/route";
import { courseFigureCandidates } from "@/lib/math-srs/elementary/courseFigureCandidates";
import { courseFigureFingerprint } from "@/lib/math-srs/elementary/figureFingerprint";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { generateElementaryProblem } from "@/lib/elementary/generate";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";

vi.mock("@/lib/math-srs/elementary/courseFigureCandidates", () => ({
  courseFigureCandidates: vi.fn(),
}));
vi.mock("@/lib/figure/renderFigureSpec", () => ({ renderFigureSpec: vi.fn() }));
const section = COURSE_SECTIONS.find(
  (section) =>
    section.grade === 5 &&
    generateElementaryProblem(section.unit, 70001, "기본").figureSpec,
)!;
const legacy = generateElementaryProblem(section.unit, 70001, "기본");
const savedSpec = {
  ...legacy.figureSpec!,
  readerFixture: "second engine candidate",
};
const redraw = { ...legacy, figureSpec: savedSpec };
const url = (seed: number, spec?: string) =>
  new Request(
    `http://localhost/lab/math-srs/figure?${new URLSearchParams({
      sectionId: section.id,
      seed: String(seed),
      tier: "기본",
      ...(spec === undefined ? {} : { spec }),
    })}`,
  );
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(courseFigureCandidates).mockReturnValue([legacy, redraw]);
  vi.mocked(renderFigureSpec).mockResolvedValue({ ok: true, svg: "<svg/>" });
});
it("selects the regenerated candidate matching the saved figure, including after a legacy cache hit", async () => {
  await GET(url(70001));
  vi.mocked(renderFigureSpec).mockClear();
  expect(
    (await GET(url(70001, courseFigureFingerprint(savedSpec)))).status,
  ).toBe(200);
  expect(renderFigureSpec).toHaveBeenCalledWith(savedSpec);
});
it("preserves the first default candidate when spec is absent", async () => {
  expect((await GET(url(70002))).status).toBe(200);
  expect(renderFigureSpec).toHaveBeenCalledWith(legacy.figureSpec);
});
it("returns 404 rather than another figure for an unknown or empty fingerprint", async () => {
  for (const spec of ["unknown", ""]) {
    const result = await GET(url(70003, spec));
    expect(result.status).toBe(404);
    expect(await result.json()).toEqual({ error: "그림이 없는 문제입니다." });
  }
  expect(renderFigureSpec).not.toHaveBeenCalled();
});
it("sorts nested object keys but preserves array order in browser/server fingerprints", () => {
  expect(courseFigureFingerprint({ b: [{ z: 1, a: 2 }], a: "각" })).toBe(
    courseFigureFingerprint({ a: "각", b: [{ a: 2, z: 1 }] }),
  );
  expect(courseFigureFingerprint({ a: [1, 2] })).not.toBe(
    courseFigureFingerprint({ a: [2, 1] }),
  );
});
