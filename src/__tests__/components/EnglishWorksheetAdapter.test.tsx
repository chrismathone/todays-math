import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  assertEnglishSheetPrintable,
  englishOutputSheets,
  englishWorksheetProblem,
} from "@/components/english/englishWorksheetAdapter";
import { EnglishWorksheetQuestion } from "@/components/english/print/EnglishWorksheetQuestion";
import { TEMPLATE_COMPONENTS } from "@/components/unified/print/templateComponents";
import { AnswerPage } from "@/components/unified/print/AnswerPage";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "@/components/unified/print/types";
import { bankUiItem } from "../fixtures/englishBankUi";

describe("lossless English shared worksheet output", () => {
  it("retains original content/source indices and separates passage reading from gapped variants across sets", () => {
    const reading = bankUiItem(0);
    const variant = bankUiItem(3, {
      setId: "30000000-0000-4000-8000-000000000099",
    });
    const sheets = englishOutputSheets([reading, variant]);
    expect(sheets).toHaveLength(2);
    expect(sheets.map((sheet) => sheet.numbers)).toEqual([[2], [1]]);
    expect(sheets.map((sheet) => sheet.includePassage)).toEqual([false, true]);
    const adapted = englishWorksheetProblem(variant, 2, false);
    expect(adapted.english!.item).toBe(variant);
    const html = renderToStaticMarkup(
      <EnglishWorksheetQuestion content={adapted.english!} />,
    );
    expect(html).toContain("________");
    expect(html).toContain('data-english-source-index="3"');
    expect(html).not.toContain("Our town library");
    expect(html).not.toContain("정답으로");
    expect(
      renderToStaticMarkup(
        <EnglishWorksheetQuestion
          content={englishWorksheetProblem(reading, 1, true).english!}
        />,
      ),
    ).toContain(reading.passage);
  });
  it.each(Object.keys(TEMPLATE_COMPONENTS) as PrintTemplate[])(
    "renders complete English underlining and global selection numbering through %s",
    (template) => {
      const item = bankUiItem(1);
      item.question = {
        ...item.question,
        prompt:
          "Choose: ① <u>opened\nthe door</u> ② <u>opens</u> ③ <u>open</u> ④ <u>opening</u> ⑤ <u>to open</u>",
      };
      const problem = englishWorksheetProblem(item, 7, false);
      const Template = TEMPLATE_COMPONENTS[template];
      const html = renderToStaticMarkup(
        <Template
          page={1}
          totalPages={1}
          startingNumber={1}
          columns={1}
          meta={{ ...DEFAULT_PRINT_META, subject: "영어", title: "English" }}
          options={{ ...DEFAULT_PRINT_OPTIONS, template }}
          problems={[
            { id: problem.id, variant: { ...problem, topic: problem.section } },
          ]}
        />,
      );
      expect(html).toContain("<u>opened\nthe door</u>");
      expect(html).toContain('data-english-question="7"');
      expect(html).not.toContain(item.question.explanation);
    },
  );
  it("preserves answer, explanation and evidence verbatim on answer pages", () => {
    const item = bankUiItem(3);
    const problem = englishWorksheetProblem(item, 9, false);
    const html = renderToStaticMarkup(
      <AnswerPage
        page={1}
        totalPages={1}
        startingNumber={1}
        columns={1}
        meta={DEFAULT_PRINT_META}
        options={DEFAULT_PRINT_OPTIONS}
        problems={[{ id: problem.id, variant: { ...problem, topic: "" } }]}
      />,
    );
    expect(html).toContain("9.");
    expect(html).toContain(item.question.answer);
    expect(html).toContain(item.question.explanation);
    expect(html).toContain(item.question.evidence);
  });
  it("blocks unacknowledged unreviewed and malformed underline output", () => {
    const draft = englishOutputSheets([bankUiItem(0, { status: "초안" })])[0]!;
    expect(() => assertEnglishSheetPrintable(draft, false)).toThrow("확인란");
    expect(() => assertEnglishSheetPrintable(draft, true)).not.toThrow();
    const malformed = bankUiItem(1);
    malformed.question = { ...malformed.question, prompt: "① <u>opened" };
    const invalid = englishOutputSheets([malformed])[0]!;
    expect(() => assertEnglishSheetPrintable(invalid, true)).toThrow("밑줄");
  });
});
