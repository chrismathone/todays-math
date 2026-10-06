import type { ConceptBlankSelection } from "../../src/contracts/conceptBlank.contract";
import { BANK_PARTS } from "../../src/lib/concept-blank/bank";
import { composeSheets } from "../../src/lib/concept-blank/compose";
import { encodeSheetCode } from "../../src/lib/concept-blank/sheetCode";

/** 2026-10-06 교실 사진의 고르기. 학생 이름·필기 대신 실제 은행과 인쇄 경로로 재현한다. */
export const PHOTO_CLOZE_CODE = "1TER.H56B.D4XS.Q2";
export const PHOTO_CLOZE_SELECTION: ConceptBlankSelection = {
  sections: [
    "초6::2-1 분수의 나눗셈::2-1-4 (분수)÷(분수)를 (분수)×(분수)로 나타내기",
    "초6::2-1 분수의 나눗셈::2-1-5 (가분수)÷(분수), (대분수)÷(분수) 알아보기",
  ],
  forms: [
    {
      form: "cloze",
      counts: { 하: 5, 중: 5, 상: 0 },
      extras: { 하: 1, 중: 1, 상: 1 },
    },
  ],
};
const bank = {
  concepts: [...BANK_PARTS.e6!.concepts, ...BANK_PARTS.e6plus!.concepts],
  ox: [...BANK_PARTS.e6!.ox, ...BANK_PARTS.e6plus!.ox],
  apply: [...BANK_PARTS.e6!.apply, ...BANK_PARTS.e6plus!.apply],
  figures: [...BANK_PARTS.e6!.figures, ...BANK_PARTS.e6plus!.figures],
};
export const photoSheets = () => composeSheets(PHOTO_CLOZE_SELECTION, bank);
export const photoCode = () => encodeSheetCode(PHOTO_CLOZE_SELECTION, bank);
