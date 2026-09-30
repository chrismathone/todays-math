import type {
  ApplyItem,
  ConceptBlankBank,
  ConceptEntry,
  FigureItem,
  OxItem,
} from "@/contracts/conceptBlank.contract";
import { bank as e3 } from "./e3";
import { bank as e4 } from "./e4";
import { bank as e5 } from "./e5";
import { bank as e6 } from "./e6";
import { bank as m1 } from "./m1";
import { bank as m2 } from "./m2";
import { bank as m3 } from "./m3";

/**
 * 개념 백지 고정 문항 은행(D-150). 학년 파일 일곱을 트랙이 따로 채운다(겹치지 않게 파일을 나눴다).
 * 순서는 파일 안 순서 그대로 — 같은 고르기면 같은 지면(고정).
 */
export const BANK_PARTS: Readonly<Record<string, ConceptBlankBank>> = {
  e3,
  e4,
  e5,
  e6,
  m1,
  m2,
  m3,
};

export const CONCEPT_BLANK_BANK: ConceptBlankBank = {
  concepts: Object.values(BANK_PARTS).flatMap((b) => b.concepts),
  ox: Object.values(BANK_PARTS).flatMap((b) => b.ox),
  apply: Object.values(BANK_PARTS).flatMap((b) => b.apply),
  figures: Object.values(BANK_PARTS).flatMap((b) => b.figures),
};

export type SectionStock = {
  concepts: ConceptEntry[];
  ox: OxItem[];
  apply: ApplyItem[];
  figures: FigureItem[];
};

export function sectionStock(
  key: string,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
): SectionStock {
  return {
    concepts: bank.concepts.filter((x) => x.section === key),
    ox: bank.ox.filter((x) => x.section === key),
    apply: bank.apply.filter((x) => x.section === key),
    figures: bank.figures.filter((x) => x.section === key),
  };
}
