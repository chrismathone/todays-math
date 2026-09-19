/**
 * **DB 행의 그림이 시험지까지 가는가.**
 *
 * 🔴 2026-08-29 적대적 점검: `figureSvg` 컬럼이 인쇄 페이지의 인라인 매핑에서
 * 빠져 있어 **엔진 문항 4,640건의 그림이 시험지에 한 장도 안 나갔다.**
 * 인라인 매핑은 시험할 자리가 없어서, 빠진 줄도 몰랐다.
 */
import { describe, expect, it } from "vitest";

import { displayFractions } from "@/components/unified/fractionDisplay";
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

  // 원장님 2026-09-19 «모든 화면이 일치하도록» — 작업실·새 문제은행·학습지 인쇄는 초등이면
  // 대분수인데 이 지면만 가분수였다. 넘침 판정·답지·지면이 같은 글을 보도록 여기서 한 번 바꾼다.
  it("초등 문항은 화면과 같은 함수로 대분수로 찍는다 — 원문은 그대로", () => {
    const row: PrintableProblemRow = {
      ...ROW,
      content: String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.`,
      answer: String.raw`$\frac{13}{3}$`,
      solution: String.raw`$\frac{10}{3}+1=\frac{13}{3}$`,
      unit: { grade: "초5" },
    };
    const out = toPrintProblem(row, 1);
    expect(out.content).toBe(
      String.raw`$3\frac{1}{3}$ 보다 1 큰 수를 구하시오.`,
    );
    expect(out.answer).toBe(String.raw`$4\frac{1}{3}$`);
    expect(out.solution).toBe(String.raw`$3\frac{1}{3}+1=4\frac{1}{3}$`);
    expect(out.answer).toBe(displayFractions(row.answer, "초5", row.content));
    expect(row.content).toContain(String.raw`\frac{10}{3}`);
  });

  it("중학 이상 · 학년을 모르는 행 · 바꾸기 문제는 원문 그대로 찍는다", () => {
    const content = String.raw`$\frac{10}{3}$ 보다 1 큰 수를 구하시오.`;
    for (const unit of [{ grade: "중1" }, null, undefined]) {
      const out = toPrintProblem({ ...ROW, content, unit }, 1);
      expect(out.content).toBe(content);
    }
    const convert = String.raw`가분수 $\frac{7}{3}$ 을 대분수로 바꾸시오.`;
    const out = toPrintProblem(
      {
        ...ROW,
        content: convert,
        answer: String.raw`$2\frac{1}{3}$`,
        unit: { grade: "초3" },
      },
      1,
    );
    expect(out.content).toBe(convert);
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
    // 학년은 단원에 있다 — 조회가 단원을 안 실으면 초등도 조용히 가분수로 찍힌다.
    expect(src, "인쇄 조회가 문항의 단원 학년을 안 싣는다").toMatch(
      /unit:\s*\{\s*select:\s*\{\s*grade:\s*true/,
    );
  });
});
