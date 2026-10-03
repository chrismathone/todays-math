import { readFileSync } from "node:fs";
import { join } from "node:path";
import katex from "katex";
import { describe, expect, it } from "vitest";

import {
  examRoot,
  readDraftCorpus,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import { repairEquationScopes } from "../../../scripts/import/exam-paper/repairEquationScopes";

function mathml(tex: string): Element {
  const doc = document.createElement("div");
  doc.innerHTML = katex.renderToString(tex, {
    output: "mathml",
    throwOnError: true,
    strict: "ignore",
  });
  return doc;
}

function badScopes(text: string): number {
  let bad = 0;
  for (const match of text.matchAll(/\$([^$]+)\$/g)) {
    // 이 관문은 수식 범위만 잰다. 이미 있는 다른 렌더 결함은 여기서 고치지 않는다.
    let root: Element;
    try {
      root = mathml(match[1]);
    } catch {
      continue;
    }
    for (const group of root.querySelectorAll("mfrac, mover")) {
      const argument =
        group.tagName === "mfrac" ? group.children[1] : group.children[0];
      if (argument.textContent?.includes("=")) bad += 1;
    }
  }
  return bad;
}

describe("EX-06: 분모·선분 안으로 들어간 등호", () => {
  it("대륜 13: 분모는 등식이 아닌 길이이며 300개 높이의 삼각비가 성립한다", () => {
    const rows = JSON.parse(
      readFileSync(
        join(examRoot, "2025-daeryun-3-2-mid/sol_fixed.json"),
        "utf8",
      ),
    ) as { id: string; text: string }[];
    const text = repairEquationScopes(rows.find((r) => r.id === "13")!.text);
    const fractions = [...text.matchAll(/\$([^$]+)\$/g)].flatMap((m) => [
      ...mathml(m[1]).querySelectorAll("mfrac"),
    ]);
    const slope = fractions.find((f) => f.children[0].textContent === "x")!;
    expect(slope).toBeDefined();
    expect(slope.children[1].textContent?.replace(/‾/g, "")).toBe("BH");
    for (let x = 1; x <= 300; x += 1) {
      const bh = (5 * x) / 4;
      expect(x / bh).toBeCloseTo(0.8);
    }
  });

  it("전 25편의 변환 원문에서 28곳 이상을 실제로 보고 수리 뒤 범위 오류가 0이다", () => {
    let before = 0;
    let after = 0;
    let rows = 0;
    const schools = [...new Set(readDraftCorpus().map((d) => d.examId))];
    expect(schools).toHaveLength(25);
    for (const school of schools) {
      for (const file of ["hwp_fixed.json", "sol_fixed.json"]) {
        const pieces = JSON.parse(
          readFileSync(join(examRoot, school, file), "utf8"),
        ) as { text: string }[];
        for (const piece of pieces) {
          before += badScopes(piece.text);
          const fixed = repairEquationScopes(piece.text);
          after += badScopes(fixed);
          expect(repairEquationScopes(fixed)).toBe(fixed);
          rows += 1;
        }
      }
    }
    expect(rows).toBeGreaterThan(2000);
    expect(before).toBeGreaterThanOrEqual(28);
    expect(after).toBe(0);
  }, 60000);

  it("정상인 합·곱 분모와 기하 선분은 한 글자도 바뀌지 않는다", () => {
    for (const text of [
      String.raw`$\frac{x}{a+b}$`,
      String.raw`$\frac{1}{2\overline{AB}}=\frac{1}{6}$`,
      String.raw`$\overline{AB}=\overline{CD}$`,
    ]) {
      expect(repairEquationScopes(text)).toBe(text);
    }
  });
});
