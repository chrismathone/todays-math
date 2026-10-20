import { createRoot } from "react-dom/client";
import "katex/dist/katex.min.css";
import "../../src/app/globals.css";
import "./harness.css";
import "./writing-area.css";
import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import { DescriptiveAnswerSheet } from "@/components/print/DescriptiveAnswerSheet";
import { DescriptiveRubricPage } from "@/components/print/DescriptiveRubricPage";
import { parseNativeDescriptiveProblem } from "@/contracts/nativeDescriptive.contract";
import { toNativeDescriptivePrint } from "@/lib/print/descriptive";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import {
  writingAreaBanks,
  writingAreaSelection,
  writingAreaSheets,
} from "@/__tests__/fixtures/conceptBlankWritingArea";
import fixture from "@/app/dev/descriptive-paper/rectangleFixture.json";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") === "questions" ? "questions" : "legacy";
const view = params.get("view") === "key" ? "key" : "student";
const sheets = writingAreaSheets(mode).filter(
  (sheet) => sheet.form === params.get("form"),
);
const data = toNativeDescriptivePrint(
  parseNativeDescriptiveProblem(fixture.problem),
);
const items = [
  { number: 1, data },
  { number: 2, data: { ...data, requirements: [] } },
];

createRoot(document.getElementById("root")!).render(
  <main data-print-monochrome={params.get("mono") === "1"}>
    {params.has("descriptive") ? (
      view === "key" ? (
        <DescriptiveRubricPage items={items} title="서술형 B 회귀 표본" />
      ) : (
        <DescriptiveAnswerSheet items={items} title="서술형 B 회귀 표본" />
      )
    ) : (
      <ConceptBlankPaper
        sheets={sheets}
        view={view}
        code={encodeSheetCode(writingAreaSelection, writingAreaBanks[mode])}
      />
    )}
  </main>,
);
