import { SHEET_CODE_LINE_CAPACITY } from "../../src/components/concept-blank/paper/paginate";
import { SHEET_CODE_ALPHABET } from "../../src/contracts/conceptBlank.contract";

/**
 * 지면 코드 줄(트랙 cb-code)의 표본 — 손으로 지은 고르기(stress · fuzz · cal …)에는 제품 코드가 없으니,
 * **한 줄에 싣는 가장 긴 코드**(정원 `SHEET_CODE_LINE_CAPACITY` 글자)를 넓은 글자로 지어 단다(넘침 0 은 가장 넓은 줄로 잰다).
 */
export const LONGEST_CODE_SYMBOLS = SHEET_CODE_LINE_CAPACITY;

/** 네 글자마다 점 — 제품(`sheetCode.ts`)과 같은 꼴. */
export const formatCode = (text: string) => text.replace(/(.{4})(?=.)/g, "$1.");

/** 판 번호 `1` 뒤를 `glyph` 로 채운 n 글자 코드(점 포함 꼴). */
export function syntheticCode(n: number, glyph = "W"): string {
  if (!SHEET_CODE_ALPHABET.includes(glyph)) throw new Error(glyph);
  return formatCode(`1${glyph.repeat(n - 1)}`);
}
