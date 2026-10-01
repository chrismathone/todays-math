import type {
  ApplyItem,
  ConceptBlankBank,
  ConceptEntry,
  FigureItem,
  OxItem,
} from "@/contracts/conceptBlank.contract";

/**
 * 소단원 하나의 문항(은행 차례 그대로). 은행 파일을 부르지 않는다 — 화면 쪽이 은행 전체를 싣지 않게
 * 합치기(`compose.ts`)는 받은 은행으로만 일한다(은행 3차 · `load.ts`).
 */
export type SectionStock = {
  concepts: ConceptEntry[];
  ox: OxItem[];
  apply: ApplyItem[];
  figures: FigureItem[];
};

export function sectionStock(
  key: string,
  bank: ConceptBlankBank,
): SectionStock {
  return {
    concepts: bank.concepts.filter((x) => x.section === key),
    ox: bank.ox.filter((x) => x.section === key),
    apply: bank.apply.filter((x) => x.section === key),
    figures: bank.figures.filter((x) => x.section === key),
  };
}
