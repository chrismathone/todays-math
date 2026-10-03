import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  examRoot,
  readDraftCorpus,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import { repairExamText } from "../../../scripts/import/exam-paper/repairExamText";

function pieces(school: string, file: string): { id: string; text: string }[] {
  return JSON.parse(
    readFileSync(join(examRoot, `2025-${school}-3-2-mid`, file), "utf8"),
  );
}

describe("EX-10·14: AI 반올림 설명과 변환 연산자", () => {
  it("새론 8: 셋째 자리 반올림은 9.71이며 보기 ⑤와 같다", () => {
    const ai = JSON.parse(
      readFileSync(
        join(examRoot, "2025-saeron-3-2-mid/sol_ai/q08.json"),
        "utf8",
      ),
    ) as { answer: string; solution: string };
    const height = (10 + 0.64) * 0.84 + 0.77;
    const rounded = Number(
      ai.solution.match(/셋째 자리에서 반올림하면 \$([\d.]+)\$/)?.[1],
    );
    expect(rounded).toBe(Math.round(height * 100) / 100);
    const row = readDraftCorpus().find(
      (d) => d.examId.includes("saeron") && d.questionNumber === 8,
    )!;
    const values = [...row.content.matchAll(/^\d\. \$([\d.]+)\$/gm)].map((m) =>
      Number(m[1]),
    );
    expect(values).toHaveLength(5);
    const distances = values.map((v) => Math.abs(v - height));
    const nearest = distances.flatMap((d, i) =>
      d === Math.min(...distances) ? [i + 1] : [],
    );
    expect(nearest).toEqual([5]);
    expect(ai.answer).toBe("⑤");
    expect(values[4]).toBe(rounded);
  });

  it("동도 14: 높이와 cos 37도로 둘레 44가 유일하게 결정된다", () => {
    const source = pieces("dongdo", "sol_fixed.json").find(
      (r) => r.id === "14",
    )!.text;
    const fixed = repairExamText(source);
    expect(fixed).toMatch(/\\frac\{10\}\{\\cos\s*37°\}/);
    const ab = 10 / 0.8;
    const bh = 10 * 0.75;
    const perimeter = ab + bh + 10 + 10 * 1.4;
    expect(perimeter).toBe(44);
    const d = readDraftCorpus().find(
      (r) => r.examId.includes("dongdo") && r.questionNumber === 14,
    )!;
    expect(Number(d.answer.replace(/\$/g, ""))).toBe(perimeter);
  });

  it("전 25편에서 연산자·퍼센트를 복구하고 숫자는 한 글자도 바꾸지 않는다", () => {
    let changed = 0;
    let operatorChanges = 0;
    for (const school of new Set(readDraftCorpus().map((d) => d.examId))) {
      for (const file of ["hwp_fixed.json", "sol_fixed.json"]) {
        const rows = JSON.parse(
          readFileSync(join(examRoot, school, file), "utf8"),
        ) as { text: string }[];
        for (const { text } of rows) {
          const fixed = repairExamText(text);
          expect(fixed).not.toMatch(/SIM|coc/);
          expect(fixed.match(/\d+/g)).toEqual(text.match(/\d+/g));
          if (fixed !== text) changed += 1;
          if (fixed.replace(/\\%/g, "%") !== text.replace(/\\%/g, "%"))
            operatorChanges += 1;
        }
      }
    }
    expect(changed).toBe(17); // 연산자 4조각 + 퍼센트 13조각(초안에서는 7행 17곳).
    expect(operatorChanges).toBe(4);
    for (const text of [
      "SIMILAR",
      "cocoa",
      String.raw`$\cos 37°$`,
      "정상 본문",
    ]) {
      expect(repairExamText(text)).toBe(text);
    }
  });
});
