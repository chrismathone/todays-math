// @vitest-environment node
/**
 * «배우기» preview cards (plan §3.4). The answers are recomputed here from the numbers in
 * each prompt — an independent check, not a copy of the data.
 */
import { describe, expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { definitionCard } from "@/lib/math-explorers/definition-cards";
import { PREVIEW_CARDS } from "@/lib/math-srs/preview/cards";
import {
  checkPreviewAnswer,
  previewCardFor,
  previewFigureSvg,
  previewMeaning,
} from "@/lib/math-srs/preview";

const card = (id: string) => previewCardFor(id)!;
const roundUp = (n: number, unit: number) => Math.ceil(n / unit) * unit;
const roundDown = (n: number, unit: number) => Math.floor(n / unit) * unit;
const roundHalf = (n: number, unit: number) =>
  Math.floor(n / unit + 0.5) * unit;

describe("preview cards", () => {
  it("covers every section of the pilot chapter, once each", () => {
    const pilot = COURSE_SECTIONS.filter((s) => s.id.startsWith("5-2-1-"));
    expect(pilot.length).toBe(6);
    for (const section of pilot)
      expect(previewCardFor(section.id)).not.toBeNull();
    const ids = PREVIEW_CARDS.map((c) => c.sectionId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(COURSE_SECTIONS.some((s) => s.id === id)).toBe(true);
    expect(previewCardFor("5-2-4-1")).toBeNull();
  });

  it("shows the explorer card's own meaning sentence", () => {
    const linked = card("5-2-1-1");
    expect(previewMeaning(linked)).toBe(
      definitionCard("g5-at-least").definition,
    );
    expect(previewMeaning(card("5-2-1-3"))).toContain("범위");
  });

  it("draws every card's figure exactly", () => {
    for (const c of PREVIEW_CARDS) {
      const svg = previewFigureSvg(c);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain(`<title>${c.figure.title}</title>`);
    }
  });

  it("has practice answers that follow from their prompts", () => {
    const pick = (values: number[], keep: (n: number) => boolean) =>
      String(values.filter(keep).length);
    expect(card("5-2-1-1").practice.answer).toBe(
      pick([17, 20, 21, 19, 25], (n) => n <= 20),
    );
    expect(card("5-2-1-2").practice.answer).toBe(
      pick([8, 12, 10, 15, 9], (n) => n < 10),
    );
    expect(card("5-2-1-3").practice.answer).toBe(
      pick(
        Array.from({ length: 30 }, (_, i) => i + 1),
        (n) => n > 10 && n <= 14,
      ),
    );
    expect(card("5-2-1-4").practice.answer).toBe(String(roundUp(317, 10)));
    expect(card("5-2-1-5").practice.answer).toBe(String(roundDown(1999, 1000)));
    expect(card("5-2-1-6").practice.answer).toBe(String(roundHalf(476, 10)));
    // Worked examples too.
    expect(card("5-2-1-4").worked.map((w) => w.answer)).toEqual([
      String(roundUp(234, 10)),
      String(roundUp(250, 10)),
    ]);
    expect(card("5-2-1-5").worked.map((w) => w.answer)).toEqual([
      String(roundDown(238, 10)),
      String(roundDown(4567, 100)),
    ]);
    expect(card("5-2-1-6").worked.map((w) => w.answer)).toEqual([
      String(roundHalf(34, 10)),
      String(roundHalf(2650, 100)),
    ]);
    expect(card("5-2-1-1").worked[0].answer).toBe(
      [43, 45, 47, 44, 50].filter((n) => n >= 45).join(", "),
    );
    expect(card("5-2-1-2").worked[0].answer).toBe(
      [28, 30, 31, 35].filter((n) => n > 30).join(", "),
    );
    expect(card("5-2-1-3").worked[0].answer).toBe(
      [20, 21, 22, 23, 24, 25].filter((n) => n >= 20 && n < 25).join(", "),
    );
  });

  it("checks a typed practice answer", () => {
    const counting = card("5-2-1-1");
    for (const typed of ["3", " 3 ", "3개", "3 개"])
      expect(checkPreviewAnswer(counting, typed)).toBe(true);
    for (const typed of ["4", "", "삼", "3.0", "-3"])
      expect(checkPreviewAnswer(counting, typed)).toBe(false);
    const thousands = card("5-2-1-5");
    expect(checkPreviewAnswer(thousands, "1,000")).toBe(true);
    expect(checkPreviewAnswer(thousands, "1000")).toBe(true);
    expect(checkPreviewAnswer(thousands, "2000")).toBe(false);
  });
});

/** Independent rational arithmetic: read the operands from the authored prompt. */
function rational(text: string): [number, number] {
  const match = text.trim().match(/^(?:(\d+) )?(\d+)\/(\d+)$/);
  if (match)
    return [
      Number(match[1] ?? 0) * Number(match[3]) + Number(match[2]),
      Number(match[3]),
    ];
  if (/^\d+$/.test(text.trim())) return [Number(text), 1];
  throw new Error(`검산할 수 없는 수: ${text}`);
}
function product(prompt: string): [number, number] {
  const match = prompt.match(/^(.+?) × (.+?)의 값을 구해요\.$/);
  if (!match) throw new Error(`식을 읽을 수 없음: ${prompt}`);
  const a = rational(match[1]),
    b = rational(match[2]);
  return [a[0] * b[0], a[1] * b[1]];
}
function expectFraction(answer: string, expected: [number, number]) {
  const actual = rational(answer);
  expect(actual[0] * expected[1]).toBe(expected[0] * actual[1]);
}

describe("fraction multiplication previews", () => {
  const ids = ["5-2-2-1", "5-2-2-2", "5-2-2-3", "5-2-2-4"];
  it.each(ids)("recomputes both examples and practice for %s", (id) => {
    const c = card(id);
    expect(c).not.toBeNull();
    expect(c.worked).toHaveLength(2);
    for (const example of [...c.worked, c.practice])
      expectFraction(example.answer, product(example.prompt));
    for (const example of c.worked)
      expect(example.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("uses the explorer definition for both fraction × fraction sections", () => {
    for (const id of ids.slice(2)) {
      expect(card(id).meaning).toEqual({ cardId: "g5-fraction-multiply" });
      expect(previewMeaning(card(id))).toBe(
        definitionCard("g5-fraction-multiply").definition,
      );
    }
  });

  it("grades equivalent fractions and mixed numbers by the course rules", () => {
    for (const typed of ["12/5", "24/10", "2 2/5", "2.4", " 12 / 5 "])
      expect(checkPreviewAnswer(card(ids[0]), typed)).toBe(true);
    for (const typed of ["", "12/0", "2 7/5", "2/5", "12/5 cm", "12/5, 12/5"])
      expect(checkPreviewAnswer(card(ids[0]), typed)).toBe(false);
    expect(checkPreviewAnswer(card(ids[2]), "0.30000000000000001")).toBe(false);
    expect(checkPreviewAnswer(card(ids[2]), "6/20")).toBe(true);
    expect(checkPreviewAnswer(card(ids[3]), "1 1/2")).toBe(true);
  });
});

function rectangles(svg: string) {
  return [...svg.matchAll(/<rect\b([^>]*)\/?\s*>/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
    return {
      x: Number(attrs.x),
      y: Number(attrs.y),
      width: Number(attrs.width),
      height: Number(attrs.height),
      filled: attrs.fill === "#3159df",
    };
  });
}

it("counts the fraction pieces and their exact value in the rendered SVG", () => {
  const cases = [
    {
      id: "5-2-2-1",
      rows: 2,
      cols: 4,
      filled: [0, 1, 2, 4, 5, 6],
      piece: [1, 4],
    },
    { id: "5-2-2-2", rows: 1, cols: 4, filled: [0, 1, 2], piece: [1, 1] },
    {
      id: "5-2-2-3",
      rows: 3,
      cols: 4,
      filled: [0, 1, 2, 4, 5, 6],
      piece: [1, 12],
    },
    { id: "5-2-2-4", rows: 2, cols: 3, filled: [0, 1, 3, 4], piece: [1, 4] },
  ];
  for (const c of cases) {
    const figure = rectangles(previewFigureSvg(card(c.id)));
    expect(figure).toHaveLength(c.rows * c.cols);
    expect(new Set(figure.map((r) => r.x)).size).toBe(c.cols);
    expect(new Set(figure.map((r) => r.y)).size).toBe(c.rows);
    expect(new Set(figure.map((r) => `${r.width},${r.height}`)).size).toBe(1);
    expect(figure.flatMap((r, i) => (r.filled ? [i] : []))).toEqual(c.filled);
    expectFraction(card(c.id).worked[0].answer, [
      c.filled.length * c.piece[0],
      c.piece[1],
    ]);
  }
});

const numbers = (text: string) =>
  [...text.matchAll(/\d+/g)].map((m) => Number(m[0]));
const matchingRectangles = (text: string) => {
  const [a, b, ...sizes] = numbers(text);
  let count = 0;
  for (let i = 0; i < sizes.length; i += 2)
    if (
      (sizes[i] === a && sizes[i + 1] === b) ||
      (sizes[i] === b && sizes[i + 1] === a)
    )
      count++;
  return count;
};

describe("congruence and symmetry previews", () => {
  it.each([
    ["5-2-3-1", "g5-congruence"],
    ["5-2-3-2", "g5-congruence"],
    ["5-2-3-3", "g5-line-symmetry"],
    ["5-2-3-4", "g5-point-symmetry"],
  ])("links %s to the unchanged explorer definition", (id, meaningId) => {
    const c = card(id);
    expect(c).not.toBeNull();
    expect(c.meaning).toEqual({ cardId: meaningId });
    expect(previewMeaning(c)).toBe(definitionCard(meaningId).definition);
    expect(c.worked).toHaveLength(2);
    for (const example of c.worked)
      expect(example.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("recomputes all twelve answers from lengths, angles, cells and midpoint distances", () => {
    const congruent = card("5-2-3-1");
    for (const q of [congruent.worked[0], congruent.practice])
      expect(Number(q.answer)).toBe(matchingRectangles(q.prompt));
    const [side, ...options] = numbers(congruent.worked[1].prompt);
    expect(Number(congruent.worked[1].answer)).toBe(
      options.filter((n) => n === side).length,
    );

    const properties = card("5-2-3-2");
    const [a, b] = numbers(properties.worked[0].prompt);
    expect(Number(properties.worked[0].answer)).toBe(2 * (a + b));
    const [angleA, angleB] = numbers(properties.worked[1].prompt);
    expect(Number(properties.worked[1].answer)).toBe(180 - angleA - angleB);
    expect(Number(properties.practice.answer)).toBe(
      numbers(properties.practice.prompt).reduce((a, b) => a + b, 0),
    );

    const line = card("5-2-3-3");
    for (const q of [...line.worked, line.practice])
      expect(Number(q.answer)).toBe(numbers(q.prompt)[0] * 2);

    const point = card("5-2-3-4");
    expect(Number(point.worked[0].answer)).toBe(
      numbers(point.worked[0].prompt)[0] * 2,
    );
    expect(Number(point.worked[1].answer)).toBe(
      numbers(point.worked[1].prompt)[0],
    );
    expect(Number(point.practice.answer)).toBe(
      numbers(point.practice.prompt)[0] / 2,
    );
  });

  it("renders exact quarter-turn congruent cells on equal-sized grids", () => {
    for (const id of ["5-2-3-1", "5-2-3-2"]) {
      const rects = rectangles(previewFigureSvg(card(id)));
      expect(rects).toHaveLength(32);
      expect(rects.every((r) => r.width === 16 && r.height === 16)).toBe(true);
      const before = rects
        .slice(0, 16)
        .filter((r) => r.filled)
        .map((r) => [(r.x - 8) / 16, (r.y - 8) / 16]);
      const after = rects
        .slice(16)
        .filter((r) => r.filled)
        .map((r) => [(r.x - 108) / 16, (r.y - 8) / 16].join(","))
        .sort();
      expect(after).toEqual(
        before.map(([x, y]) => [3 - y, x].join(",")).sort(),
      );
      expect(before).toHaveLength(id.endsWith("-1") ? 4 : 6);
      if (id.endsWith("-2")) {
        expect(new Set(before.map(([x]) => x)).size).toBe(3);
        expect(new Set(before.map(([, y]) => y)).size).toBe(2);
      }
    }
  });

  it("places every reflected/half-turned cell and the axis/centre at exact coordinates", () => {
    for (const id of ["5-2-3-3", "5-2-3-4"]) {
      const svg = previewFigureSvg(card(id));
      const rects = rectangles(svg);
      expect(rects).toHaveLength(36);
      expect(rects.every((r) => r.width === 16 && r.height === 16)).toBe(true);
      const cells = rects
        .filter((r) => r.filled)
        .map((r) => [(r.x - 10) / 16, (r.y - 10) / 16]);
      const reflected = cells
        .map(([x, y]) => [5 - x, id.endsWith("-3") ? y : 5 - y].join(","))
        .sort();
      expect(reflected).toEqual(cells.map((c) => c.join(",")).sort());
      if (id.endsWith("-3")) {
        expect(cells.filter(([x]) => x < 3)).toHaveLength(4);
        expect(svg).toMatch(
          /<line x1="58" y1="8" x2="58" y2="108"[^>]*stroke-dasharray="5 4"/,
        );
      } else {
        expect(cells).toHaveLength(6);
        expect(svg).toMatch(/<circle cx="58" cy="58" r="2.6"/);
      }
    }
  });
});
