import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JeongtongTemplate } from "@/components/unified/print/templates/JeongtongTemplate";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";

describe("school exam header", () => {
  it("prints each exam field once in the school header, including the semester", () => {
    const html = renderToStaticMarkup(
      <JeongtongTemplate
        page={1}
        totalPages={1}
        totalProblems={0}
        startingNumber={1}
        columns={2}
        problems={[]}
        options={{ ...DEFAULT_PRINT_OPTIONS, template: "jeongtong" }}
        meta={{
          ...DEFAULT_PRINT_META,
          title: "중복 확인 시험지",
          schoolName: "테스트 학교",
          grade: "중3",
          subject: "수학",
          semester: "2학기",
          examDate: "2026-09-14",
          examiner: "김선생",
          examDuration: "50분",
          totalScore: 83,
        }}
      />,
    );
    const root = document.createElement("div");
    root.innerHTML = html;
    for (const field of [
      "중복 확인 시험지",
      "테스트 학교",
      "중3",
      "수학",
      "2학기",
      "2026-09-14",
      "김선생",
      "50분",
      "83점",
    ])
      expect(root.textContent!.split(field).length - 1, field).toBe(1);
    expect(root.querySelector("[data-exam-details]")).toBeNull();
    // C2 (2026-10-19): 표 모양은 CSS grid가 소유하고 정보는 공통 머릿글에 한 번만 싣는다.
    expect(root.querySelectorAll("[data-print-header]")).toHaveLength(1);
    const header = root.querySelector(
      '[data-print-header][data-template="jeongtong"]',
    )!;
    expect(header).not.toBeNull();
    expect(
      [...header.querySelectorAll("[data-meta-field]")].map((field) =>
        field.getAttribute("data-meta-field"),
      ),
    ).toEqual([
      "title",
      "schoolName",
      "grade",
      "subject",
      "semester",
      "examDate",
      "examDuration",
      "examiner",
      "totalScore",
    ]);
    expect(
      header.querySelector('[data-meta-field="semester"]'),
    ).toHaveTextContent("2학기");
  });
});
