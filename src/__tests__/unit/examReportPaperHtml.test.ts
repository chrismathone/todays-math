// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";
import { buildExamReportPaperHtml } from "@/lib/examReport/paperHtml";
import { PdfPayloadSchema, pdfDocument } from "@/lib/export/pdfServer";
import { wrongTableFixture } from "../helpers/examReportWrongTableFixture";

vi.mock("puppeteer-core", () => ({
  default: {
    launch: vi.fn(() => {
      throw new Error("Chromium 실행 금지");
    }),
  },
}));

describe("성적표 서버 HTML", () => {
  it.each([
    [0, 1, 1],
    [10, 1, 1],
    [11, 1, 2],
    [16, 1, 2],
    [20, 1, 2],
    [40, 2, 2],
  ])(
    "틀린 %i개도 같은 H1 초기 %i쪽·%i단과 순서로 내보낸다",
    async (count, total, columns) => {
      const report = wrongTableFixture(count);
      const input = await buildExamReportPaperHtml(report);
      expect(input.html.match(/data-unified-paper=/g)).toHaveLength(total);
      expect(
        [...input.html.matchAll(/data-er-wrong-no="(\d+)"/g)].map((match) =>
          Number(match[1]),
        ),
      ).toEqual(report.wrongQuestions.map((q) => q.no));
      if (count)
        expect(input.html).toContain(`data-er-wrong-columns="${columns}"`);
      expect(
        input.html.match(/data-er-table-continuation="true"/g) ?? [],
      ).toHaveLength(total - 1);
      if (total > 1) expect(input.html).toContain("틀린 문항 (이어서)");
      expect(input.html).toContain(report.teacherNote);
      expect(input.html).not.toContain("<script");
    },
  );

  it("한 학생·한 회의 모든 쪽과 자체 CSS를 PDF 계약으로 만든다", async () => {
    const { student } = reportFixture("normal");
    const input = await buildExamReportPaperHtml(student, { mode: "M1" });
    expect(PdfPayloadSchema.safeParse(input).success).toBe(true);
    expect(input.html.match(/data-unified-paper=/g)).toHaveLength(1);
    expect(input.html.match(/data-print-page=/g)).toHaveLength(1);
    expect(input.html).toContain("data-mathgen-document");
    expect(input.title).toContain("서하린");
    expect(input.cssText).toContain("NotoSerifKR-subset.woff2");
    expect(input.cssText).toContain("PretendardVariable.woff2");
    expect(input.html).not.toMatch(/<(button|script|nav)|예시 자료|시안 인쇄/);
    const doc = pdfDocument(input, "https://math.example");
    expect(doc).not.toMatch(/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr/);
    expect(input.cssUrls).toEqual([]);
    for (const [, url] of input.cssText.matchAll(/url\(([^)]+)\)/g)) {
      expect(
        url.startsWith("data:font/woff2;") || url.startsWith('"/fonts/'),
      ).toBe(true);
    }
  });

  it("기존 M1의 문항·수식·그림·정답·해설은 서버 HTML에서 제외한다", async () => {
    const { student } = reportFixture("normal");
    const question = {
      ...student.wrongQuestions[0],
      content: "다음 식을 계산하시오. $\\frac{1}{2}+x$",
      answer: "$x=7$",
      solution: "양변에서 3을 뺍니다. 따라서 $x=7$입니다.",
      figureSvg:
        '<svg viewBox="0 0 100 80"><circle cx="50" cy="40" r="20"/></svg>',
    };
    const input = await buildExamReportPaperHtml(
      { ...student, wrongQuestions: [question] },
      { mode: "M1" },
    );
    expect(input.html).not.toContain('class="katex"');
    expect(input.html).not.toContain("<circle");
    expect(input.html).not.toContain("양변에서");
    expect(input.cssText).toContain("data:font/woff2;base64,");
    expect(input.html).not.toContain('loading="lazy"');
    expect(
      await buildExamReportPaperHtml(
        { ...student, wrongQuestions: [question] },
        { mode: "M1" },
      ),
    ).toEqual(input);
  });

  it("이름·문장·제목의 HTML을 실행 가능한 태그로 넣지 않는다", async () => {
    const { student } = reportFixture("normal");
    const input = await buildExamReportPaperHtml({
      ...student,
      student: { ...student.student, name: '<script>alert("이름")</script>' },
      teacherNote: '<img src=x onerror="alert(1)">',
    });
    expect(input.html).toContain("&lt;script&gt;");
    expect(input.html).toContain("&lt;img");
    expect(input.html).not.toContain("<script>");
  });

  it("기존 M1도 틀린 문항의 번호·단원·유형만 표에 남기고 그림은 싣지 않는다", async () => {
    const { student } = reportFixture("normal");
    const question = {
      ...student.wrongQuestions[0],
      figureUrls: ["/figures/example.png"],
      figureDims: [600, 300],
      figureSourceMm: [40],
    };
    const input = await buildExamReportPaperHtml(
      { ...student, wrongQuestions: [question] },
      { mode: "M1" },
    );
    expect(input.html).not.toContain('src="/figures/example.png"');
    expect(input.html).not.toContain("width:40.00mm");
    expect(input.html).toContain(`data-er-wrong-no="${question.no}"`);
    expect(input.html).toContain(question.unitName);
    expect(input.html).toContain(question.typeLabel!);
    expect(input.html).not.toContain("틀린 문항 풀이");
  });
});
