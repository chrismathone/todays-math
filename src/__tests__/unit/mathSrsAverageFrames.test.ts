// @vitest-environment node
import { expect, it } from "vitest";
import { COURSE_SECTIONS } from "@/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "@/lib/math-srs/elementary/engineFrames";
import { getCourseProblemInput } from "@/lib/math-srs/elementary/answers";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const copies = <T>(x: T, n: number) => Array.from({ length: n }, () => x);
it("reconstructs averages and enumerates possible outcomes instead of reusing generation formulas", () => {
  for (const s of COURSE_SECTIONS.filter((s) => s.chapterId === "5-2-6"))
    for (const tier of ["기본", "응용"] as const)
      for (let seed = 1; seed <= 32; seed++) {
        const p = generateCourseEngineRedraw(s.unit, seed * 7919, tier);
        expect(getCourseProblemInput(p).mode === "self-check", p.content).toBe(
          false,
        );
        const math = [...p.content.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
        const numbers = math.flatMap((m) =>
          m.match(/\d+(?:\.\d+)?/g)!.map(Number),
        );
        const [a, b, c, d] = numbers;
        let expected: number;
        if (s.id.endsWith("-3")) {
          if (p.content.includes("세 가지"))
            expected = numbers
              .slice(2)
              .filter((k) =>
                Array.from({ length: b }, (_, i) => i + 1).every((v) => v <= k),
              ).length;
          else if (p.content.includes("빨간 구슬의 수를")) expected = a;
          else if (p.content.includes("모두 몇 개가")) {
            const added = Array.from({ length: b + 1 }, (_, i) => i).find(
              (v) => a + v === b,
            )!;
            expected = copies(1, a + added).length + copies(1, b).length;
          } else if (p.content.includes("파란 구슬을 먼저")) {
            const blue = copies(1, b).slice(c).length;
            expected = Array.from({ length: blue + 1 }, (_, i) => i).find(
              (v) => a + v === blue,
            )!;
          } else {
            let red = a,
              blue = b;
            if (p.content.includes("빨간 구슬을 모두")) red = 0;
            else if (p.content.includes("파란 구슬을 모두")) blue = 0;
            else if (p.content.includes("빨간 구슬을 더")) red += c;
            const outcomes = [...copies("red", red), ...copies("blue", blue)];
            const hits = outcomes.filter((x) => x === "red").length;
            expected =
              hits === 0
                ? 0
                : hits === outcomes.length
                  ? 1
                  : hits + hits === outcomes.length
                    ? 0.5
                    : NaN;
          }
        } else if (p.content.includes("각 자료에")) expected = b + c;
        else if (p.formId === "02" && s.id.endsWith("-2"))
          expected = Array.from({ length: a }, (_, i) => i + 1).find(
            (n) => sum(copies(b, n)) === a,
          )!;
        else if (p.formId === "05")
          expected = Array.from({ length: b }, (_, i) => i + 1).find(
            (n) => sum(copies(a, n)) === b,
          )!;
        else if (p.formId === "06" && s.id.endsWith("-2"))
          expected = sum(copies(b, a));
        else if (p.formId === "06")
          expected = Array.from({ length: a }, (_, i) => i + 1).find(
            (n) => sum(copies(b, n)) === a,
          )!;
        else if (s.id.endsWith("-2") && p.formId === "03")
          expected = sum(copies(d, c)) - sum(copies(b, a));
        else if (s.id.endsWith("-2") && p.formId === "10")
          expected = sum(copies(b, a)) - c;
        else if (s.id.endsWith("-2")) {
          const target = sum(copies(d, a + c)),
            already = sum(copies(b, a));
          expected = Array.from({ length: 100 }, (_, i) => i).find(
            (v) => sum(copies(v, c)) + already === target,
          )!;
        } else {
          const values = math
            .find((m) => m.includes(","))!
            .match(/\d+/g)!
            .map(Number);
          const avg = Array.from({ length: 100 }, (_, i) => i).find(
            (v) => sum(copies(v, values.length)) === sum(values),
          )!;
          expected =
            p.formId === "02"
              ? avg
              : p.formId === "03"
                ? values.filter((v) => v > avg).length
                : p.formId === "08"
                  ? values.filter((v) => v < avg).length
                  : p.formId === "09"
                    ? Math.max(...values) - avg
                    : values.filter((v) => v === avg).length;
        }
        expect(
          Number(p.answer.replaceAll("$", "")),
          `${s.id}/${p.formId} ${p.content}`,
        ).toBe(expected);
      }
});
