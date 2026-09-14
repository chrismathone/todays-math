import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JeongtongTemplate } from "@/components/unified/print/templates/JeongtongTemplate";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
} from "@/components/unified/print/types";

describe("school exam header", () => {
  it("prints each exam field once in the table, including the semester", () => {
    const html = renderToStaticMarkup(
      <JeongtongTemplate
        page={1}
        totalPages={1}
        totalProblems={0}
        startingNumber={1}
        columns={2}
        problems={[]}
        options={DEFAULT_PRINT_OPTIONS}
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
    ])
      expect(root.textContent!.split(field).length - 1, field).toBe(1);
    expect(root.querySelector("[data-exam-details]")).toBeNull();
    expect(root.querySelector("table")!.textContent).toContain("2학기");
  });
});
