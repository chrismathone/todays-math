import "server-only";
import { selectUnitOpening } from "../../unitOpenings";
import { activityText } from "../quickCreateRecovery";
import type { QuickCreateAssembly } from "./context";

/** The chapter's goals and order, at the head of the chapter the cursor just entered. */
export function appendUnitIntro(ctx: QuickCreateAssembly): void {
  const { components, units, chapter, addSection } = ctx;
  if (!components.unitIntro) return;
  const selected = units.filter((row) => row.chapter === chapter);
  const opening = selectUnitOpening(
    selected[0].grade,
    chapter,
    selected.map((row) => row.section),
  );
  if (!opening || opening.unmatched.length || !opening.sections.length)
    throw new Error("선택 범위의 단원 도입 원고를 찾을 수 없습니다.");
  const {
    sourceHash,
    sourceConceptIds,
    sourceHashes,
    editor,
    reviewer,
    status,
    humanReview,
    origin,
  } = opening.provenance;
  addSection(opening.title, "auto-unit-intro", [
    activityText(
      "unitIntro",
      opening.title,
      `### ${opening.title}\n\n${opening.question}\n\n${opening.explanation}`,
      {
        kind: "unitIntro",
        question: opening.question,
        explanation: opening.explanation,
        keyPhrase: opening.keyPhrase,
        goals: [...opening.goals],
        path: [...opening.path],
      check: [...opening.check],
      dateLabel: "공부를 시작한 날",
        provenance: {
          origin,
          sourceHash,
          sourceConceptIds: [...sourceConceptIds],
          sourceHashes: [...sourceHashes],
          editor,
          reviewer,
          status,
          humanReview,
        },
      },
    ),
  ]);
}
