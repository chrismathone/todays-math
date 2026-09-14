import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "@/components/unified/print/types";

describe("original Mathgen template adapters", () => {
  it.each(Object.keys(TEMPLATE_COMPONENTS) as PrintTemplate[])(
    "renders %s with real metadata and the unchanged crop",
    (template) => {
      const Template = TEMPLATE_COMPONENTS[template];
      const crop = "data:image/png;base64,aGVsbG8=";
      const html = renderToStaticMarkup(
        <Template
          page={1}
          totalPages={3}
          totalProblems={18}
          columns={1}
          startingNumber={7}
          meta={{
            ...DEFAULT_PRINT_META,
            title: "검증 시험지",
            schoolName: "검증 학교",
            examDate: "2026-09-14",
            todayGoal: "분수",
            conceptNote: "개념 정리",
            patternName: "유형 검증",
            academyName: "검증 학원",
          }}
          options={{ ...DEFAULT_PRINT_OPTIONS, template }}
          problems={[
            {
              id: "crop",
              variant: {
                id: "crop",
                content: "원본 문항",
                answer: "",
                solution: "",
                grade: "초5",
                chapter: "분수",
                topic: "분수",
                section: "",
                difficulty: "중",
                problemCode: "",
                figureUrls: [],
                figureSvg: null,
                figureDims: [],
                figureSourceMm: [],
                croppedImage: crop,
              },
            },
          ]}
        />,
      );
      expect(html).toContain("검증 시험지");
      expect(html).toContain("검증 학교");
      expect(html).toContain("2026-09-14");
      expect(html).not.toContain("2025 · 1ST SEMESTER · MIDTERM");
      expect(html).toContain(crop);
      expect(html).toContain('data-measure-idx="0"');
    },
  );
});
