import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudentExamReportPaper } from "@/components/exam-report/ExamReportPaper";
import { paginateWrongTableRows } from "@/lib/examReport/wrongTable";
import { styledReportTableDom as examReportTableDom } from "@/lib/examReport/styledReportDom";
import { wrongTableFixture } from "../helpers/examReportWrongTableFixture";

describe("합의한 H1 틀린 문항 표", () => {
  it.each([
    [0, 1, 1],
    [10, 1, 1],
    [11, 1, 2],
    [16, 1, 2],
    [20, 1, 2],
    [40, 2, 2],
  ])(
    "틀린 %i개: S1과 기존 M1 모두 %i쪽 · %i단 요약 표만 둔다",
    (count, total, columns) => {
      const report = wrongTableFixture(count);
      const before = JSON.stringify(report);
      for (const mode of ["S1", "M1"] as const) {
        const root = document.createElement("div");
        root.innerHTML = renderToStaticMarkup(
          <StudentExamReportPaper report={report} options={{ mode }} />,
        );
        expect(root.querySelectorAll("[data-exam-report-page]")).toHaveLength(
          total,
        );
        expect(
          [...root.querySelectorAll("[data-er-wrong-no]")].map((node) =>
            Number(node.getAttribute("data-er-wrong-no")),
          ),
        ).toEqual(report.wrongQuestions.map((question) => question.no));
        for (const table of root.querySelectorAll("table.sc-wrongTable")) {
          expect(table.getAttribute("data-er-wrong-columns")).toBe(
            String(columns),
          );
          expect(table.querySelectorAll("thead th")).toHaveLength(columns * 3);
        }
        const continuation = root.querySelectorAll(
          '[data-er-table-continuation="true"]',
        );
        expect(continuation).toHaveLength(total - 1);
        for (const page of continuation) {
          expect(
            page.querySelector("[data-report-block=wrongTable] > h3")
              ?.textContent,
          ).toBe("틀린 문항 (이어서)");
          expect(page.querySelector(".sc-running")?.textContent).toContain(
            report.student.name,
          );
          expect(
            page.querySelector(".sc-teacherNote, .sc-numberRow"),
          ).toBeNull();
        }
        expect(root.querySelector(".sc-noteText")?.textContent).toBe(
          report.teacherNote,
        );
      }
      expect(JSON.stringify(report)).toBe(before);
    },
  );

  it("실측한 긴 행을 통째로 옮기고, 첫 쪽의 문장 자리를 먼저 확보한다", () => {
    expect(paginateWrongTableRows([20, 20, 55, 20], 45, 80)).toEqual([2, 2]);
    expect(paginateWrongTableRows([20, 20, 20], 0, 45)).toEqual([0, 2, 1]);
    expect(paginateWrongTableRows([], 0, 45)).toEqual([0]);
    // 한 행 자체가 커도 버리거나 무한히 빈 쪽을 만들지 않는다. 최종 넘침 검사가 막는다.
    expect(paginateWrongTableRows([100, 20], 0, 45)).toEqual([0, 1, 1]);
  });

  it("번호로 재정렬하지 않고 원래 문항 순서와 긴 단원·유형 전체를 보존한다", () => {
    const report = wrongTableFixture(40);
    report.wrongQuestions.reverse();
    report.wrongQuestions[0] = {
      ...report.wrongQuestions[0],
      unitName: "긴 단원 이름을 줄바꿈하되 자르지 않습니다.\n".repeat(4),
      typeLabel: "여러 조건이 있는 긴 유형 이름".repeat(8),
    };
    const before = JSON.stringify(report);
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(
      <StudentExamReportPaper report={report} />,
    );
    // 첫 쪽의 표가 전부 넘어가도 요약/문장은 남는다.
    examReportTableDom(root, [0, 5, 15]);
    expect(
      root.querySelectorAll('[data-er-summary="true"] [data-er-wrong-no]'),
    ).toHaveLength(0);
    expect(root.querySelector(".sc-noteText")?.textContent).toBe(
      report.teacherNote,
    );
    expect(
      [...root.querySelectorAll("[data-er-wrong-no]")].map((node) =>
        Number(node.getAttribute("data-er-wrong-no")),
      ),
    ).toEqual(report.wrongQuestions.map((q) => q.no));
    expect(root.textContent).toContain(report.wrongQuestions[0].unitName);
    expect(root.textContent).toContain(report.wrongQuestions[0].typeLabel);
    expect(JSON.stringify(report)).toBe(before);
  });

  it("서버 DOM 재조판도 순서·이어지는 쪽 머리·전체 쪽수를 유지하며 반복해도 중복하지 않는다", () => {
    const report = wrongTableFixture(20);
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(
      <StudentExamReportPaper report={report} options={{ mode: "M1" }} />,
    );
    for (let pass = 0; pass < 2; pass++) {
      examReportTableDom(root, [3, 4, 3]);
      const sheets = root.querySelectorAll(".sc-sheet");
      expect(sheets).toHaveLength(3);
      expect(
        [...root.querySelectorAll("[data-er-wrong-no]")].map((node) =>
          Number(node.getAttribute("data-er-wrong-no")),
        ),
      ).toEqual(report.wrongQuestions.map((q) => q.no));
      expect(
        root.querySelectorAll(
          '[data-er-table-continuation="true"] [data-report-block=wrongTable] > h3',
        ),
      ).toHaveLength(2);
      expect(sheets[0].querySelector(".sc-noteText")?.textContent).toBe(
        report.teacherNote,
      );
      for (const [i, sheet] of [...sheets].entries()) {
        expect(sheet.getAttribute("aria-label")).toBe(`학생 성적표 ${i + 1}쪽`);
        expect(sheet.querySelector(".sc-running")?.textContent).toContain(
          `${i + 1} / 3쪽`,
        );
      }
    }
    const before = root.innerHTML;
    expect(() => examReportTableDom(root, [1])).toThrow("행 수");
    expect(root.innerHTML).toBe(before);
  });

  it("축소된 미리보기의 DOM 치수를 원본 크기로 재고, 문장이 쓰는 높이를 표보다 먼저 뺀다", () => {
    const report = wrongTableFixture(20);
    const root = document.createElement("div");
    root.innerHTML = renderToStaticMarkup(
      <StudentExamReportPaper report={report} />,
    );
    const style = document.createElement("style");
    style.textContent = ".sc-sheet{height:1000px;padding:20px;gap:10px}";
    document.head.append(style);
    document.body.append(root);
    let noteHeight = 120;
    const height = (node: HTMLElement): number => {
      if (node.matches(".sc-sheet")) return 1000;
      if (node.matches(".sc-body"))
        return [...node.children].reduce(
          (sum, child) => sum + height(child as HTMLElement),
          0,
        );
      if (node.matches("[data-er-wrong-row]"))
        return node.querySelector('[data-er-wrong-no="1"]') ? 60 : 20;
      if (node.matches("tbody"))
        return [...node.children].reduce(
          (sum, row) => sum + height(row as HTMLElement),
          0,
        );
      if (node.matches(".sc-wrongTable"))
        return 40 + height(node.querySelector("tbody")!);
      if (node.matches(".sc-teacherNote")) return noteHeight;
      if (node.matches(".sc-running")) return 80;
      if (node.matches(".sc-numberRow")) return 100;
      return 20;
    };
    const rect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return {
          height: height(this) * (root.contains(this) ? 0.4 : 1),
        } as DOMRect;
      });
    const client = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(1000);
    try {
      const first = examReportTableDom(root)!;
      expect(first.heights).toEqual([60, ...Array(9).fill(20)]);
      expect(first.continuation).toBeGreaterThan(first.first);
      noteHeight += 400;
      const longerNote = examReportTableDom(root)!;
      expect(first.first - longerNote.first).toBeCloseTo(400);
      expect(
        paginateWrongTableRows(
          longerNote.heights,
          longerNote.first,
          longerNote.continuation,
        ).length,
      ).toBeGreaterThan(1);
      expect(
        document.querySelectorAll(
          '[aria-hidden="true"] [data-er-table-continuation]',
        ),
      ).toHaveLength(0);
    } finally {
      rect.mockRestore();
      client.mockRestore();
      root.remove();
      style.remove();
    }
  });
});
