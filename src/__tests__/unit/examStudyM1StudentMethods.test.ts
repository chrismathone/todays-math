import katex from "katex";
import { describe, expect, it } from "vitest";
import type { ExamStudyFamily } from "@/contracts/examStudy.contract";
import { equalLegs } from "@/lib/examStudy/families/middle/algebra";
import { inverseArea, square } from "@/lib/examStudy/families/middle/graphs";

function variants(family: ExamStudyFamily) {
  if (family.paramDomain.kind !== "finite")
    throw new Error("finite domain required");
  return Array.from({ length: family.paramDomain.size }, (_, n) =>
    family.generate(0, n),
  );
}
function renderMath(text: string) {
  for (const m of text.matchAll(/\$([^$]+)\$/gu))
    expect(() =>
      katex.renderToString(m[1], { throwOnError: true, strict: "error" }),
    ).not.toThrow();
}

describe("actual M1 student methods, including correct-answer counterexamples", () => {
  it("all four coordinate tasks have a positive, unique one-unknown route from printed constants", () => {
    for (const q of variants(equalLegs)) {
      const match = /A=\((\d+),u\).*B=\((\d+),v\)/u.exec(q.content)!;
      const p = Number(match[1]),
        s = Number(match[2]),
        difference = s - p;
      // Solve p(t+d)=st directly: numeric coefficients, no two-unknown theorem.
      const lower = (p * difference) / (s - p),
        upper = lower + difference;
      expect(difference).toBeGreaterThan(0);
      expect(lower).toBeGreaterThan(0);
      expect(p * upper).toBe(s * lower);
      expect(q.answer).toBe(`k=${p * upper}, u=${upper}, v=${lower}`);
      expect(q.solution).toContain(`$${p}(t+${difference})=${s}t$`);
      expect(q.solution).toContain(`$t=${lower}$`);
      expect(q.solution).not.toMatch(/연립|가감|소거|첫 식에/u);
      expect(equalLegs.verify(q).valid).toBe(true);
      renderMath(q.solution);
    }
  });

  it("rejects a numerically correct answer accompanied by the old elimination method", () => {
    for (const q of variants(equalLegs)) {
      expect(
        equalLegs.verify({
          ...q,
          solution:
            "두 미지수의 연립방정식에서 첫 식에 상수를 곱해 빼는 가감법으로 소거하면 정답을 얻는다.",
        }).valid,
      ).toBe(false);
      expect(
        equalLegs.verify({
          ...q,
          solution: q.solution.replace(/\$t=\d+\$/u, "$t=99$"),
        }).valid,
      ).toBe(false);
    }
  });

  it("all twelve area solutions identify three elementary regions and their actual base-height calculations", () => {
    for (const q of variants(inverseArea)) {
      const g = q.figureSpec as { labels: { text: string }[] };
      const label = g.labels
        .map((l) => /^A\((\d+),(\d+)\)$/u.exec(l.text))
        .find(Boolean)!;
      const a = Number(label[1]),
        h = Number(label[2]);
      const ratio = /넓이비가 (\d+):(\d+)/u.exec(q.content)!;
      const b = a + (a * Number(ratio[1])) / Number(ratio[2]),
        z = (a * h) / b;
      const oac = (a * h) / 2,
        abc = ((b - a) * h) / 2,
        obc = (a * z) / 2;
      expect(b).toBeGreaterThan(a);
      expect(z).toBeGreaterThan(0);
      expect(abc / oac).toBeCloseTo(Number(ratio[1]) / Number(ratio[2]));
      expect(q.answer).toBe(`B=(${b},${z}), 넓이=${oac + abc - obc}`);
      // The same quadrilateral has these two partitions; no coordinate-area formula is needed.
      expect(q.solution).toContain(
        "삼각형 $OAC,ABC$로도, 삼각형 $OAB,OBC$로도 나뉜다",
      );
      expect(q.solution).toContain(
        `$[OAB]=[OAC]+[ABC]-[OBC]=${oac}+${abc}-${obc}=${oac + abc - obc}$`,
      );
      expect(inverseArea.verify(q).valid).toBe(true);
      renderMath(q.solution);
    }
  });

  it("rejects missing regions or a corrupted intermediate area even when the final answer is unchanged", () => {
    for (const q of variants(inverseArea)) {
      expect(
        inverseArea.verify({
          ...q,
          solution:
            "큰 삼각형에서 작은 삼각형을 빼면 된다. 정답의 수치가 맞으므로 넓이 계산은 생략한다.",
        }).valid,
      ).toBe(false);
      expect(
        inverseArea.verify({
          ...q,
          solution: q.solution.replace("[OAC]=", "[OBC]="),
        }).valid,
      ).toBe(false);
      expect(
        inverseArea.verify({
          ...q,
          solution: q.solution.replace(/\[ABC\]=[^$]+/u, "[ABC]=999"),
        }).valid,
      ).toBe(false);
    }
  });

  it("changes only the two method-bearing versions and keeps deterministic authored outputs", () => {
    expect(equalLegs.version).toBe("2-m1-single-variable");
    expect(inverseArea.version).toBe("2-m1-elementary-area");
    expect(square.version).toBe("1");
    for (const f of [equalLegs, inverseArea])
      for (let n = 0; n < variants(f).length; n++)
        expect(f.generate(0, n)).toEqual(f.generate(0, n));
  });

  it("rejects contradictory or unknown prose appended to an otherwise correct reviewed solution", () => {
    for (const f of [equalLegs, inverseArea])
      for (const q of variants(f))
        for (const extra of [
          " 하지만 $t=99$이다.",
          " 또한 $[ABC]=999$이다.",
          " 다른 풀이도 무조건 승인한다.",
        ])
          expect(f.verify({ ...q, solution: q.solution + extra }).valid).toBe(
            false,
          );
  });
});
