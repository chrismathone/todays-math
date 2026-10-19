// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { STYLE_CANDIDATES } from "@/app/dev/exam-report-styles/candidates";
import { renderStyleCandidate } from "@/app/dev/exam-report-styles/renderStyleCandidate";
import {
  styleFixture,
  PREVIEW_HEADER,
  PREVIEW_FOOTER,
} from "@/app/dev/exam-report-styles/fixtures";
import { REPORT_BLOCK_PRESETS } from "@/lib/examReport/blocks";
import { PdfPayloadSchema, pdfDocument } from "@/lib/export/pdfServer";

vi.mock("puppeteer-core", () => ({
  default: {
    launch: vi.fn(() => {
      throw new Error("이 시험은 Chromium을 부르지 않습니다.");
    }),
  },
}));

describe("후보별 서버 HTML", () => {
  it.each(STYLE_CANDIDATES)(
    "$name · 선택한 모든 블록을 같은 PDF 계약으로 만든다",
    async ({ id }) => {
      const { report, average } = styleFixture("gapHistory");
      const payload = await renderStyleCandidate(id, report, {
        blocks: REPORT_BLOCK_PRESETS.summary,
        header: PREVIEW_HEADER,
        footer: PREVIEW_FOOTER,
        average,
      });
      expect(PdfPayloadSchema.safeParse(payload).success).toBe(true);
      expect(payload.html).toContain('data-mathgen-document="true"');
      expect(payload.html).toContain(`data-style-candidate="${id}"`);
      expect(payload.html).not.toMatch(/<(script|button|nav)/);
      expect(payload.html).toContain('data-trend-score="absent"');
      // 결시를 사이에 둔 두 묶음을 잇지 않는다.
      expect(payload.html.match(/data-trend-segment=/g)).toHaveLength(2);
      expect(payload.fontPolicy).toBe("self-hosted");
      expect(payload.cssUrls).toEqual([]);
      expect(pdfDocument(payload, "http://127.0.0.1:3000")).not.toMatch(
        /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr/,
      );
      for (const [, url] of payload.cssText.matchAll(/url\(([^)]+)\)/g))
        expect(
          url.startsWith("data:font/woff2;") || url.startsWith('"/fonts/'),
        ).toBe(true);
    },
  );
  it("출력 선택을 끄면 추이·재시험·문장을 빼고 HTML 태그를 안전하게 보인다", async () => {
    const { report } = styleFixture("normal");
    const payload = await renderStyleCandidate(
      "letter",
      {
        ...report,
        student: { ...report.student, name: "<script>이름</script>" },
        teacherNote: "<img src=x onerror=alert(1)>",
      },
      {
        blocks: ["teacherNote", "trend", "retries", "score"],
        retry: false,
        trend: false,
      },
    );
    expect(payload.html).toContain("&lt;img");
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).not.toContain("data-exam-report-trend");
    expect(payload.html).not.toContain('data-report-block="retries"');
  });
});
