import type { TestPrintProblem } from "./types";
import { packExamPaper } from "@/lib/print/packExamPaper";
import { paginateAnswerKey } from "@/lib/printLayout";
import {
  PastPaperTemplate,
  type PastPaperMeta,
} from "./templates/PastPaperTemplate";
import { DescriptiveAnswerSheet } from "./DescriptiveAnswerSheet";
import { DescriptiveRubricPage } from "./DescriptiveRubricPage";
import { PrintAnswerKeyPage } from "./PrintAnswerKeyPage";

/** Existing two-column question paper + separate r2 answer sheets (D-119 ⑹). */
export function PastPaperPrint({
  problems,
  meta,
  audience = "student",
}: {
  problems: TestPrintProblem[];
  meta: PastPaperMeta;
  audience?: "student" | "teacher";
}) {
  const numberOf = (problem: TestPrintProblem) => problems.indexOf(problem) + 1;
  const native = problems.flatMap((problem) =>
    problem.nativeDescriptive
      ? [{ number: numberOf(problem), data: problem.nativeDescriptive }]
      : [],
  );
  if (audience === "teacher") {
    const ordinary = problems.filter((problem) => !problem.nativeDescriptive);
    const pages = ordinary.length ? paginateAnswerKey(ordinary) : [];
    return (
      <>
        {pages.map((page, i) => (
          <PrintAnswerKeyPage
            key={`key-${i}`}
            allProblems={ordinary}
            pageProblems={page.problems}
            page={i + 1}
            startingNumber={page.startingNumber}
            testTitle={meta.title}
            totalPages={pages.length + native.length}
            numberOf={numberOf}
          />
        ))}
        {native.map((item, i) => (
          <DescriptiveRubricPage
            key={item.number}
            items={[item]}
            title={meta.title}
            page={pages.length + i + 1}
          />
        ))}
      </>
    );
  }
  const packed = packExamPaper(problems);
  return (
    <>
      {packed.pages.map((page, i) => (
        <PastPaperTemplate
          key={`questions-${i}`}
          meta={meta}
          page={i + 1}
          columns={page.columns}
          numberOf={numberOf}
          scoreOf={(problem) => problem.score ?? null}
          tooTallIds={new Set(packed.tooTall.map((problem) => problem.id))}
        />
      ))}
      {native.map((item, i) => (
        <DescriptiveAnswerSheet
          key={item.number}
          items={[item]}
          title={meta.title}
          page={packed.pages.length + i + 1}
        />
      ))}
    </>
  );
}
