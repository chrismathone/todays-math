// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

function value(tex: string): number {
  const m = tex.match(/^(\d+)?\\frac\{(\d+)\}\{(\d+)\}$/);
  return m ? Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]) : Number(tex);
}
function math(content: string) {
  return [...content.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
}
function multiply(tex: string): number {
  // Repeated addition of fractional unit pieces, independent of cross multiplication.
  const [a, b] = tex.split("\\times").map(value);
  const denominator = 3600;
  return Array.from(
    { length: Math.round(a * denominator) },
    () => b / denominator,
  ).reduce((x, y) => x + y, 0);
}

it("recalculates fraction redraws from the printed quantities and inverse constraints", () => {
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-2-2"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier);
        const parts = math(p.content);
        const code = s.id;
        const id = p.formId;
        let expected: number;
        if (!id) {
          const numerators = [...p.content.matchAll(/\\frac\{(\d+)\}/g)].map(
            (m) => Number(m[1]),
          );
          expected = Array.from(
            { length: numerators[0] },
            () => numerators[1],
          ).reduce((a, b) => a + b, 0);
        } else if (id === "08") {
          const [left, right] = parts[0].split("=");
          const factor = left
            .split("\\times")
            .find((x) => !x.includes("square"))!;
          // Find the unique thousandth-precision candidate by checking the forward equation.
          expected = value(right) / value(factor);
          expect(expected * value(factor)).toBeCloseTo(value(right), 10);
        } else if (
          tier === "기본" &&
          ((id === "06" && !code.endsWith("-4")) ||
            (id === "07" && code.endsWith("-3")))
        ) {
          if (id === "06" && code.endsWith("-2")) {
            const product = multiply(parts[0]);
            expected = Array.from({ length: 200 }, (_, i) => i + 1).find(
              (d) => Math.abs(product * d - Math.round(product * d)) < 1e-9,
            )!;
          } else {
            const product = multiply(parts[0]);
            expected = Array.from({ length: 200 }, (_, i) => i + 1).find(
              (d) => Math.abs(product * d - Math.round(product * d)) < 1e-9,
            )!;
          }
        } else if (tier === "기본" && id === "07") {
          if (code.endsWith("-1"))
            expected = Math.floor(multiply(parts[0]) + 1e-10);
          else if (code.endsWith("-2")) expected = 1 - value(parts[0]);
          else {
            const [mixed, k] = parts;
            expected = (value(mixed) - Math.floor(value(mixed))) * value(k);
          }
        } else if (tier === "기본" && id === "05") {
          const m = parts[0].match(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/)!;
          expected = Number(m[1]) * Number(m[3]) + Number(m[2]);
        } else if (tier === "기본" && id === "06" && code.endsWith("-4")) {
          expected = multiply(
            parts[0].replace(/(\d+)\\frac\{\d+\}\{\d+\}/, "$1"),
          );
        } else if (tier === "기본") {
          expected = value(parts[0]) * value(parts[1]);
        } else if (id === "09") {
          expected = code.endsWith("-1")
            ? value(parts[0]) * (value(parts[1]) - 1)
            : code.endsWith("-2")
              ? multiply(parts[0]) * value(parts[1])
              : code.endsWith("-3")
                ? 1 - value(parts[0]) * value(parts[1])
                : value(parts[0]) * value(parts[1]);
        } else if (id === "10") {
          expected = Math.floor(multiply(parts[0]) + 1e-10);
        } else if (code.endsWith("-1")) {
          expected = value(parts[0]) * value(parts[1]) - value(parts[2]);
        } else if (code.endsWith("-2")) {
          expected = value(parts[0]) * (1 - value(parts[1]));
        } else if (code.endsWith("-3")) {
          expected = parts[0]
            .split("\\times")
            .map(value)
            .reduce((a, b) => a * b, 1);
        } else {
          const mixed = parts[0];
          expected = value(mixed) * value(parts[1]) * value(parts[2]);
        }
        expect(
          value(math(p.answer)[0]),
          `${s.id}/${id} ${p.content}`,
        ).toBeCloseTo(expected, 8);
      }
});
