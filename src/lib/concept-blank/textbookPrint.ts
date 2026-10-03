import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";
import type { TextbookFrozenConcept } from "@/contracts/textbookConcept.contract";
import { composeSheets } from "./compose";
import {
  EXACT_COMPOSITION_VERSION,
  EXACT_PARSER_VERSION,
  selectionFromPicks,
  type ResolvedBlankSection,
} from "./exactPick";

/** Teacher-only adapter. The caller must authorize the edition/concept server reference first. */
export function composeFrozenTextbookBlank(
  frozen: TextbookFrozenConcept,
  title?: string,
) {
  if (
    frozen.parserVersion !== EXACT_PARSER_VERSION ||
    frozen.compositionVersion !== EXACT_COMPOSITION_VERSION
  )
    throw new RangeError("지원하지 않는 고정 개념백지 파서·조합 버전입니다.");
  const bank: ConceptBlankBank = {
    concepts: [],
    ox: [],
    apply: [],
    figures: [],
  };
  for (const entry of frozen.entries) {
    switch (entry.entryKind) {
      case "concept":
        bank.concepts.push(entry.payload);
        break;
      case "ox":
        bank.ox.push(entry.payload);
        break;
      case "apply":
        bank.apply.push(entry.payload);
        break;
      case "figure":
        bank.figures.push(entry.payload);
        break;
    }
  }
  const selection = selectionFromPicks(frozen.selection, title);
  const used = new Set(
    frozen.selection.map((p) => `${p.entryKind}:${p.entryId}`),
  );
  if (
    frozen.entries.length !== used.size ||
    frozen.entries.some((e) => !used.has(`${e.entryKind}:${e.payload.id}`))
  )
    throw new RangeError("고정 선택과 고정 항목 목록이 일치하지 않습니다.");
  if (
    new Set(frozen.sections.map((s) => s.blankSectionKey)).size !==
      selection.sections.length ||
    frozen.sections.some((s) => !selection.sections.includes(s.blankSectionKey))
  )
    throw new RangeError("고정 선택과 소단원 라벨 목록이 일치하지 않습니다.");
  return {
    selection,
    sheets: composeSheets(selection, bank, frozen.sections),
    source: "frozen" as const,
    sheetCode: null,
  };
}

export function composeCurrentTextbookBlank(
  selection: ReturnType<typeof selectionFromPicks>,
  bank: ConceptBlankBank,
  sections?: readonly ResolvedBlankSection[],
) {
  if (!selection.pick)
    throw new RangeError("교재 인쇄는 정확한 항목 선택을 사용합니다.");
  return {
    selection,
    sheets: composeSheets(selection, bank, sections),
    source: "current" as const,
    sheetCode: null,
  };
}
