// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

it("solves congruence by grouping figures and symmetry by reflecting actual cells", () => {
  const axes: Record<string, number> = {
    이등변삼각형: 1,
    직사각형: 2,
    정삼각형: 3,
    정사각형: 4,
    정오각형: 5,
    정육각형: 6,
    정팔각형: 8,
  };
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-2-3"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier);
        const spec = p.figureSpec as {
          items?: { shape: string; label: string }[];
          n?: number;
          cells?: number[][];
          axis?: string;
        } | null;
        const numbers = [...p.content.matchAll(/\$(\d+)(?:\^\\circ)?\$/g)].map(
          (m) => Number(m[1]),
        );
        let expected: number;
        if (spec?.items) {
          const groups = new Map<string, number>();
          for (const item of spec.items)
            groups.set(item.shape, (groups.get(item.shape) ?? 0) + 1);
          const counts = [...groups.values()];
          if (/없는 도형|한 개씩 더/.test(p.content))
            expected = counts.filter((n) => n === 1).length;
          else if (p.content.includes("한 개만 남기"))
            expected = counts.reduce((a, b) => a + b - 1, 0);
          else if (p.content.includes("몇 쌍"))
            expected = counts.reduce((a, b) => a + (b * (b - 1)) / 2, 0);
          else if (p.content.includes("몇 종류")) expected = groups.size;
          else if (p.content.includes("서로 합동인 도형"))
            expected = counts.filter((n) => n > 1).reduce((a, b) => a + b, 0);
          else throw new Error(p.content);
        } else if (spec?.cells) {
          const n = spec.n!;
          const cells = new Set(spec.cells.map(([x, y]) => `${x},${y}`));
          const completed = new Set(cells);
          for (const [x, y] of spec.cells)
            completed.add(
              spec.axis === "point"
                ? `${n - 1 - x},${n - 1 - y}`
                : `${n - 1 - x},${y}`,
            );
          if (p.content.includes("칠하지 않은"))
            expected = n * n - completed.size;
          else if (p.content.includes("대칭축 위"))
            expected = spec.cells.filter(([x]) => x === (n - 1) / 2).length;
          else if (p.content.includes("떨어진"))
            expected = [...completed].filter(
              (c) => Number(c.split(",")[0]) !== (n - 1) / 2,
            ).length;
          else if (p.formId === "02" || /더.*칠/.test(p.content))
            expected = completed.size - cells.size;
          else if (p.content.includes("몇 도")) expected = 180;
          else expected = completed.size;
        } else if (p.content.includes("대칭축 개수")) {
          const ns = Object.keys(axes)
            .filter((name) => p.content.includes(name))
            .map((name) => axes[name]);
          expected = p.content.includes("합")
            ? ns.reduce((a, b) => a + b, 0)
            : Math.abs(ns[0] - ns[1]);
        } else {
          const [a, b, c] = numbers;
          if (p.content.includes("밑각"))
            expected = Array.from({ length: 90 }, (_, i) => i).find(
              (v) => v + v + a === 180,
            )!;
          else if (p.content.includes("나머지 한 각"))
            expected = Array.from({ length: 180 }, (_, i) => i).find(
              (v) => v + a + b === 180,
            )!;
          else if (p.content.includes("나머지 한 변"))
            expected = Array.from({ length: a }, (_, i) => i).find(
              (v) => (b + c + v) * 2 === a,
            )!;
          else if (p.content.includes("가장 긴"))
            expected = [a, b, c].sort((x, y) => y - x)[0];
          else if (p.content.includes("가장 짧은"))
            expected = [a, b, c].sort((x, y) => x - y)[0];
          else if (p.content.includes("대응하는 각의 합")) expected = a + a;
          else if (p.content.includes("둘레의 절반"))
            expected = [a, b, c].reduce((x, y) => x + y, 0);
          else if (p.content.includes("둘레"))
            expected = [a, b, c, a, b, c].reduce((x, y) => x + y, 0);
          else expected = a;
        }
        const answer = Number(p.answer.replace(/[^\d.]/g, ""));
        expect(answer, `${s.id} ${p.content}`).toBe(expected);
      }
});
