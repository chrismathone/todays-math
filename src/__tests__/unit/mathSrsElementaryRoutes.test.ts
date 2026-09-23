import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as session } from "@/app/lab/math-srs/session/route";
import { GET as figure } from "@/app/lab/math-srs/figure/route";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import {
  COURSE_CHAPTERS,
  COURSE_SECTIONS,
} from "@/lib/math-srs/elementary/catalog";
import { BOOK_CHAPTERS } from "@/lib/math-srs/elementary/bookReference";
import { generateElementaryProblem } from "@/lib/elementary/generate";

vi.mock("@/lib/figure/renderFigureSpec", () => ({ renderFigureSpec: vi.fn() }));
afterEach(() => vi.clearAllMocks());

describe("public elementary course resources", () => {
  it("connects every chapter to the supplied book's chapter range", () => {
    expect(Object.keys(BOOK_CHAPTERS)).toHaveLength(48);
    for (const chapter of COURSE_CHAPTERS) {
      const reference = BOOK_CHAPTERS[chapter.id];
      expect(reference.title).toBeTruthy();
      expect(reference.from).toBeGreaterThanOrEqual(6);
      expect(reference.to).toBeGreaterThan(reference.from);
    }
    expect(BOOK_CHAPTERS["6-2-2"].title).toBe("소수의 나눗셈");
    expect(BOOK_CHAPTERS["6-2-3"].title).toBe("공간과 입체");
  });
  it("rejects unknown curriculum, invalid seeds and modes without creating a session", async () => {
    for (const query of [
      "sectionId=unknown&seed=2",
      "sectionId=3-1-1-1&seed=-1",
      "sectionId=3-1-1-1&seed=",
      "sectionId=3-1-1-1&seed=4294967296",
      "sectionId=3-1-1-1&seed=1&mode=exam",
    ]) {
      expect(
        (
          await session(
            new Request(`http://localhost/lab/math-srs/session?${query}`),
          )
        ).status,
      ).toBe(400);
    }
  });
  it("returns a complete usable five-question session at each grade", async () => {
    for (const grade of [3, 4, 5, 6]) {
      const section = COURSE_SECTIONS.find((item) => item.grade === grade)!;
      const response = await session(
        new Request(
          `http://localhost/lab/math-srs/session?sectionId=${section.id}&seed=91812&mode=review`,
        ),
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      const result = await response.json();
      expect(result.sectionId).toBe(section.id);
      expect(result.mode).toBe("review");
      expect(result.problems).toHaveLength(5);
      expect(result.attempts).toEqual([]);
    }
  });
  it("regenerates diagrams from curriculum IDs and returns SVG, never client-provided markup", async () => {
    const item = COURSE_SECTIONS.map((section) => ({
      section,
      problem: generateElementaryProblem(section.unit, 27272, "기본"),
    })).find((item) => item.problem.figureSpec)!;
    vi.mocked(renderFigureSpec).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" /></svg>',
    });
    const request = new Request(
      `http://localhost/lab/math-srs/figure?sectionId=${item.section.id}&seed=27272&tier=${encodeURIComponent("기본")}`,
    );
    const response = await figure(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(renderFigureSpec).toHaveBeenCalledWith(item.problem.figureSpec);
    expect(await response.text()).toContain("<circle");
    expect((await figure(request)).status).toBe(200);
    expect(renderFigureSpec).toHaveBeenCalledTimes(1);
  });
  it("exposes rendering failures as retryable errors", async () => {
    const item = COURSE_SECTIONS.find(
      (section) =>
        generateElementaryProblem(section.unit, 93939, "기본").figureSpec,
    )!;
    vi.mocked(renderFigureSpec).mockResolvedValue({
      ok: false,
      error: "renderer unavailable",
    });
    const query = `sectionId=${item.id}&seed=93939&tier=${encodeURIComponent("기본")}`;
    expect(
      (
        await figure(
          new Request(`http://localhost/lab/math-srs/figure?${query}`),
        )
      ).status,
    ).toBe(503);
    expect(
      (
        await figure(
          new Request(
            "http://localhost/lab/math-srs/figure?sectionId=3-1-1-1&seed=1&tier=unknown",
          ),
        )
      ).status,
    ).toBe(400);
  });
});
