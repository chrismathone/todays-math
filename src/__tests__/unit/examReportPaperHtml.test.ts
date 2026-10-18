// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { reportFixture } from "@/app/dev/exam-report-hifi/fixtures";
import { buildExamReportPaperHtml } from "@/lib/examReport/paperHtml";
import { PdfPayloadSchema, pdfDocument } from "@/lib/export/pdfServer";

vi.mock("puppeteer-core", () => ({
  default: {
    launch: vi.fn(() => {
      throw new Error("Chromium 실행 금지");
    }),
  },
}));

describe("성적표 서버 HTML", () => {
  it("한 학생·한 회의 모든 쪽과 자체 CSS를 PDF 계약으로 만든다", () => {
    const { student } = reportFixture("normal");
    const input = buildExamReportPaperHtml(student, { mode: "M1" });
    expect(PdfPayloadSchema.safeParse(input).success).toBe(true);
    expect(input.html.match(/data-unified-paper=/g)).toHaveLength(3);
    expect(input.html.match(/data-print-page=/g)).toHaveLength(3);
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

  it("수식·그림·정답·해설은 브라우저 effect 없이 HTML에 있다", () => {
    const { student } = reportFixture("normal");
    const question = {
      ...student.wrongQuestions[0],
      content: "다음 식을 계산하시오. $\\frac{1}{2}+x$",
      answer: "$x=7$",
      solution: "양변에서 3을 뺍니다. 따라서 $x=7$입니다.",
      figureSvg:
        '<svg viewBox="0 0 100 80"><circle cx="50" cy="40" r="20"/></svg>',
    };
    const input = buildExamReportPaperHtml(
      { ...student, wrongQuestions: [question] },
      { mode: "M1" },
    );
    expect(input.html).toContain('class="katex"');
    expect(input.html).toContain("<circle");
    expect(input.html).toContain("양변에서");
    expect(input.cssText).toContain("data:font/woff2;base64,");
    expect(input.html).not.toContain('loading="lazy"');
    expect(
      buildExamReportPaperHtml(
        { ...student, wrongQuestions: [question] },
        { mode: "M1" },
      ),
    ).toEqual(input);
  });

  it("이름·문장·제목의 HTML을 실행 가능한 태그로 넣지 않는다", () => {
    const { student } = reportFixture("normal");
    const input = buildExamReportPaperHtml({
      ...student,
      student: { ...student.student, name: '<script>alert("이름")</script>' },
      teacherNote: '<img src=x onerror="alert(1)">',
    });
    expect(input.html).toContain("&lt;script&gt;");
    expect(input.html).toContain("&lt;img");
    expect(input.html).not.toContain("<script>");
  });

  it("낸 문항의 그림 폭과 번호·본문·풀이를 서버 HTML에서 보존한다", () => {
    const { student } = reportFixture("normal");
    const question = {
      ...student.wrongQuestions[0],
      figureUrls: ["/figures/example.png"],
      figureDims: [600, 300],
      figureSourceMm: [40],
    };
    const input = buildExamReportPaperHtml(
      { ...student, wrongQuestions: [question] },
      { mode: "M1" },
    );
    expect(input.html).toContain('src="/figures/example.png"');
    expect(input.html).toContain("width:40.00mm");
    expect(input.html).toContain(`data-report-question="${question.no}"`);
    expect(input.html).toContain("풀이");
  });
});
