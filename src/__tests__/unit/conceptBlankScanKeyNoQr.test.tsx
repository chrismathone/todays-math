// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { issuedPaperPages } from "@/components/concept-blank/IssuedPaper";
import { composeSheets } from "@/lib/concept-blank/compose";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { sheetHasContent } from "@/components/concept-blank/paper/paginate";
import { scanLayoutPageSchema } from "@/contracts/conceptBlankScanIssued.contract";

// 원장님 2026-11-25 «교사용에는 qr 필요없어 보이는데» — 채점표는 촬영 대상이 아니다.
const selection = {
  sections: [FIXTURE_BANK.concepts[0].section],
  forms: [
    {
      form: "term" as const,
      counts: { 하: 2, 중: 1, 상: 1 },
      extras: { 하: 0, 중: 0, 상: 0 },
    },
  ],
};
const sheets = composeSheets(selection, FIXTURE_BANK).filter(sheetHasContent);
const qr = { url: "https://x.test/q", dataUrl: "data:image/png;base64,AA==" };

describe("채점표에는 QR · 모서리 표식이 없다", () => {
  it("학생지는 쪽마다 QR · 표식 넷, 채점표는 둘 다 없다", () => {
    const student = issuedPaperPages({ sheets, part: "student", qr: [qr] });
    const studentHtml = student.map((p) => renderToStaticMarkup(p)).join("");
    expect(studentHtml).toContain("data-cb-issued-qr");
    expect(studentHtml.match(/data-cb-registration=/g)?.length).toBe(
      4 * student.length,
    );

    const key = issuedPaperPages({ sheets, part: "key", qr: [] });
    expect(key.length).toBeGreaterThan(0);
    const keyHtml = key.map((p) => renderToStaticMarkup(p)).join("");
    expect(keyHtml).not.toContain("data-cb-issued-qr");
    expect(keyHtml).not.toContain("data-cb-registration");
    expect(keyHtml).toContain('data-cb-issued-part="key"');
  });

  it("발행 좌표: 채점표 쪽은 QR · 표식 없이 받고, 학생지 쪽은 둘 다 요구한다", () => {
    const base = {
      number: 1,
      width: 210 as const,
      height: 297 as const,
      slots: [],
    };
    expect(
      scanLayoutPageSchema.safeParse({ ...base, part: "key" }).success,
    ).toBe(true);
    expect(
      scanLayoutPageSchema.safeParse({
        ...base,
        part: "student",
        slots: [{ slotId: "a", box: { x: 1, y: 1, width: 1, height: 1 } }],
      }).success,
    ).toBe(false);
  });
});
