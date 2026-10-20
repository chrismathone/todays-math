// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { extraFirstSemesterFrames } from "@/lib/math-srs/elementary/firstSemesterFrames";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";

function numeric(tex: string) {
  const m = tex.match(/^(\d+)?\\frac\{(\d+)\}\{(\d+)\}$/);
  return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(tex);
}
it("independently solves new first-semester numeric frames", () => {
  for (const s of COURSE_SECTIONS.filter((s) =>
    ["5-1-3-2", "5-1-4-2", "5-1-5-2", "5-1-5-4"].includes(s.id),
  ))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const frames = extraFirstSemesterFrames(s.unit, seed * 7919, tier);
        expect(frames.length > 0).toBe(
          !["5-1-5-2", "5-1-5-4"].includes(s.id) || tier === "응용",
        );
        for (const p of frames) {
          expect(
            getCourseProblemInput(p).mode === "self-check",
            p.content,
          ).toBe(false);
          const parts = [...p.content.matchAll(/\$([^$]+)\$/g)].map(
            (m) => m[1],
          );
          let expected: number;
          if (s.id === "5-1-3-2") {
            const spec = p.figureSpec as {
              headers: string[];
              rows: string[][];
            };
            const xs = spec.headers.slice(1).map(Number),
              ys = spec.rows[0].slice(1).map(Number);
            const k = Array.from({ length: 20 }, (_, i) => i).find((k) =>
              xs.every(
                (x, i) =>
                  Array.from({ length: x }, () => k).reduce(
                    (a, b) => a + b,
                    0,
                  ) === ys[i],
              ),
            )!;
            const ns = parts.filter((p) => /^\d+$/.test(p)).map(Number);
            expected =
              tier === "기본"
                ? k
                : p.content.includes("얼마만큼")
                  ? Array.from({ length: ns[1] - ns[0] }, () => k).reduce(
                      (a, b) => a + b,
                      0,
                    )
                  : p.content.includes("합")
                    ? Array.from({ length: ns[0] + ns[1] }, () => k).reduce(
                        (a, b) => a + b,
                        0,
                      )
                    : Array.from({ length: ns[0] }, () => k).reduce(
                        (a, b) => a + b,
                        0,
                      );
          } else if (s.id === "5-1-4-2") {
            const fs = [...p.content.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)].map(
              (m) => [Number(m[1]), Number(m[2])],
            );
            const reduced = fs.map(([a, b]) => {
              const d = Array.from({ length: b }, (_, i) => i + 1).find(
                (d) => (a * d) % b === 0,
              )!;
              return [(a * d) / b, d];
            });
            if (tier === "기본")
              expected = p.content.includes("나눈 수")
                ? fs[0][0] / reduced[0][0]
                : p.content.includes("분자는")
                  ? reduced[0][0]
                  : reduced[0][1];
            else
              expected = p.content.includes("분자와 분모의 합")
                ? reduced[0][0] + reduced[0][1]
                : p.content.includes("분모의 합")
                  ? reduced[0][1] + reduced[1][1]
                  : fs[0][1] - reduced[0][1];
          } else {
            const values = parts.map(numeric);
            expected =
              s.id === "5-1-5-2"
                ? values[0] + values[1] - values[2]
                : p.content.includes("오전")
                  ? values[0] - values[1] - values[2]
                  : values[0] - values[2] - (values[1] - values[3]);
          }
          expect(numeric(p.answer.replaceAll("$", "")), p.content).toBeCloseTo(
            expected,
            8,
          );
        }
      }
});
