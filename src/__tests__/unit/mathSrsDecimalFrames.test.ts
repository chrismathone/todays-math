// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";

// Count hundredth-sized pieces by addition; do not import production math helpers.
function product(a: number, b: number) {
  let sum = 0;
  for (let i = 0; i < Math.round(a * 100); i++) sum += Math.round(b * 100);
  return sum / 10000;
}
it("solves decimal redraws by counting scaled pieces and checking forward constraints", () => {
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-2-4"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier);
        const parts = [...p.content.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
        const values = parts.flatMap((m) => m.split("\\times").map(Number));
        const [a, b, c, d] = values;
        const id = p.formId;
        const last = Number(s.id.split("-").at(-1));
        let expected: number;
        if (!id) {
          expected = p.content.includes("정사각형")
            ? Math.abs(product(a, b) - product(a, a))
            : product(a, b) - c;
        } else if (last === 7) {
          if (id === "05") expected = String(b).length - 1;
          else if (id === "06")
            expected =
              Number(String(a).replace(".", "")) /
              10 ** Math.max(0, (String(a).split(".")[1]?.length ?? 0) - 1);
          else if (id === "07") expected = product(a, 100);
          else if (id === "08" || id === "09") {
            const places = id === "09" ? 2 : 1;
            const digits = String(a).padStart(places + 1, "0");
            expected = Number(
              `${digits.slice(0, -places)}.${digits.slice(-places)}`,
            );
          } else expected = product(product(a, b), c ?? 1);
        } else if (id === "07") {
          const [lhs, rhs] = parts[0].split("=");
          const factor = Number(
            lhs.split("\\times").find((x) => !x.includes("square")),
          );
          expected = Array.from({ length: 1000 }, (_, i) => (i + 1) / 10).find(
            (x) => Math.abs(product(x, factor) - Number(rhs)) < 1e-7,
          )!;
        } else if (id === "05")
          expected = product(
            Number(String(a).replace(".", "")),
            Number(String(b).replace(".", "")),
          );
        else if (id === "06") {
          const digits =
            product(a, b).toFixed(8).replace(/0+$/, "").split(".")[1] ?? "";
          expected = last >= 5 ? digits.length : Number(digits[0]);
        } else if (tier === "기본")
          expected = last === 6 ? product(b, c) : product(a, b);
        else if (id === "08") expected = product(a, b) - c;
        else if (id === "09")
          expected =
            last === 3
              ? product(product(a, b), c)
              : last === 5
                ? product(a, b) + c
                : product(product(a, b), c);
        else if (id === "10") {
          if (last === 1) expected = product(product(a, b), c);
          else
            expected = p.content.includes("중 더 긴 쪽")
              ? Math.max(product(a, b), product(c, d))
              : Math.abs(product(a, b) - product(c, d));
        } else if (last === 2 || last === 4)
          expected = product(a, b) + product(c, d);
        else if (last === 3) expected = a - product(a, b);
        else if (last === 5) expected = product(product(a, b), c);
        else expected = product(a, b) - c;
        const answer = Number(p.answer.replaceAll("$", ""));
        expect(answer, `${s.id}/${id} ${p.content}`).toBeCloseTo(expected, 7);
      }
});
