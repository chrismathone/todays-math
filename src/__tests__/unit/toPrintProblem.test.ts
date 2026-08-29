/**
 * **DB 행의 그림이 시험지까지 가는가.**
 *
 * 🔴 2026-08-29 적대적 점검: `figureSvg` 컬럼이 인쇄 페이지의 인라인 매핑에서
 * 빠져 있어 **엔진 문항 4,640건의 그림이 시험지에 한 장도 안 나갔다.**
 * 인라인 매핑은 시험할 자리가 없어서, 빠진 줄도 몰랐다.
 */
import { describe, expect, it } from "vitest";

import {
  PRINT_FIGURE_FIELDS,
  toPrintProblem,
  type PrintableProblemRow,
} from "@/lib/print/toPrintProblem";

const ROW: PrintableProblemRow = {
  id: "p1",
  problemCode: "E61201-A05-010",
  content: "다음 그림의 원기둥의 겉넓이를 구하시오.",
  answer: "$100$",
  solution: "밑넓이와 옆넓이를 더한다.",
  questionType: "단답형",
  figureUrls: ["/figures/a/q1.jpg"],
  figureDims: [400, 300],
  figureSourceMm: [45],
  figureSvg: '<svg viewBox="0 0 160 120"><g/></svg>',
};

describe("[지면] DB 행 → 시험지 문항", () => {
  it("🔴 **그림에 관한 컬럼이 하나도 안 빠진다**", () => {
    const out = toPrintProblem(ROW, 3);
    for (const field of PRINT_FIGURE_FIELDS) {
      expect(out[field], `${field} 가 지면까지 안 간다`).toEqual(ROW[field]);
    }
    // 목록 자체가 비면 위 고리가 한 바퀴도 안 돈다 — 0 이 「깨끗」이 되면 안 된다.
    expect(PRINT_FIGURE_FIELDS.length).toBeGreaterThanOrEqual(4);
    expect([...PRINT_FIGURE_FIELDS]).toContain("figureSvg");
  });

  it("본문·번호·형식도 그대로 간다", () => {
    const out = toPrintProblem(ROW, 3);
    expect(out.orderIndex).toBe(3);
    expect(out.content).toBe(ROW.content);
    expect(out.answer).toBe(ROW.answer);
    expect(out.solution).toBe(ROW.solution);
    expect(out.questionType).toBe(ROW.questionType);
    expect(out.problemCode).toBe(ROW.problemCode);
  });

  it("**인쇄 페이지가 이 함수를 쓴다** — 매핑이 두 벌이면 한쪽만 고쳐도 모른다", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(
      "src/app/(main)/tests/[id]/print/page.tsx",
      "utf8",
    );
    expect(src, "인쇄 페이지가 매핑을 제 손으로 갖고 있다").toContain(
      "toPrintProblem(",
    );
  });
});
