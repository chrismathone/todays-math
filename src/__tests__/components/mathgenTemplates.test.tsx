import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "@/components/unified/print/types";

// 2026-10-19 C2 승인 구성표: 제품의 PRINTED_META_FIELDS에서 기대값을 가져오지 않는다.
const META_VALUES = {
  title: "검증 시험지",
  schoolName: "검증 학교",
  examDate: "2026-09-14",
  todayGoal: "분수 목표",
  conceptNote: "개념 정리 본문",
  patternName: "유형 검증",
  academyName: "검증 학원",
};
const PRINTED_FIXTURE_FIELDS: Record<
  PrintTemplate,
  (keyof typeof META_VALUES)[]
> = {
  pyeongga: ["title", "schoolName", "examDate"],
  jeongtong: ["title", "schoolName", "examDate"],
  modern: ["title", "schoolName", "examDate"],
  workbook: ["title", "academyName", "examDate", "patternName"],
  jaseup: ["title", "examDate", "todayGoal", "conceptNote"],
  yuhyung: ["title", "patternName"],
};

describe("original Mathgen template adapters", () => {
  it.each(Object.keys(TEMPLATE_COMPONENTS) as PrintTemplate[])(
    "%s keeps number and optional metadata together above the body in both render modes",
    (template) => {
      const Template = TEMPLATE_COMPONENTS[template];
      for (const measure of [undefined, { columnWidthPx: 310 }]) {
        for (const [showChapter, showDifficulty] of [
          [true, true],
          [true, false],
          [false, true],
          [false, false],
        ]) {
          const html = renderToStaticMarkup(
            <Template
              page={1}
              totalPages={1}
              totalProblems={1}
              columns={2}
              startingNumber={7}
              meta={DEFAULT_PRINT_META}
              measure={measure}
              options={{
                ...DEFAULT_PRINT_OPTIONS,
                template,
                showChapter,
                showDifficulty,
              }}
              problems={[
                {
                  id: "header",
                  variant: {
                    id: "header",
                    content: "본문은 다음 줄에서 시작한다.",
                    answer: "",
                    solution: "",
                    grade: "중1",
                    chapter: "단원",
                    topic: "단원 메타",
                    section: "",
                    difficulty: "난이도 메타",
                    problemCode: "",
                    figureUrls: [],
                    figureSvg: null,
                    figureDims: [],
                    figureSourceMm: [],
                  },
                },
              ]}
            />,
          );
          const doc = new DOMParser().parseFromString(html, "text/html");
          const header = doc.querySelector("[data-problem-header]");
          expect(header).not.toBeNull();
          expect(header?.textContent).toContain("7");
          expect(header?.textContent?.includes("단원 메타")).toBe(showChapter);
          expect(header?.textContent?.includes("난이도 메타")).toBe(
            showDifficulty,
          );
          expect(header?.textContent).not.toContain("본문은");
          const body = doc.querySelector("[data-problem-body]");
          expect(body?.textContent).toContain("본문은 다음 줄에서 시작한다.");
          expect(body?.textContent).not.toContain("메타");
          expect(header?.compareDocumentPosition(body!)).toBe(
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        }
      }
    },
  );
  it.each(Object.keys(TEMPLATE_COMPONENTS) as PrintTemplate[])(
    "renders %s with its approved metadata and the unchanged crop",
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
            ...META_VALUES,
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
      const doc = new DOMParser().parseFromString(html, "text/html");
      for (const key of Object.keys(
        META_VALUES,
      ) as (keyof typeof META_VALUES)[]) {
        const fields = doc.querySelectorAll(`[data-meta-field="${key}"]`);
        if (PRINTED_FIXTURE_FIELDS[template].includes(key)) {
          expect(fields, `${template}: ${key}`).toHaveLength(1);
          expect(fields[0].textContent).toContain(META_VALUES[key]);
        } else {
          expect(fields, `${template}: ${key}`).toHaveLength(0);
          expect(doc.body.textContent).not.toContain(META_VALUES[key]);
        }
      }
      expect(html).not.toContain("2025 · 1ST SEMESTER · MIDTERM");
      expect(html).toContain(crop);
      expect(html).toContain('data-measure-idx="0"');
      expect(
        doc.querySelector('[data-measure-idx="0"] img')?.getAttribute("src"),
      ).toBe(crop);
    },
  );
});
