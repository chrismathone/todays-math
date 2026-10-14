/** Frozen integration contract for the grade arithmetic expansion (2026-10-14).
 * V1 stays readable and unchanged. These definitions are deterministic, finite
 * domains of actual arithmetic practice, never word problems or equation solving.
 */
export type ArithmeticGrade =
  "초1" | "초2" | "초3" | "초4" | "초5" | "초6" | "중1" | "중2" | "중3";
export type ArithmeticStrand =
  "자연수" | "분수" | "소수" | "정수·유리수" | "문자식" | "근호" | "도형";
export type ArithmeticV2Prompt =
  | {
      layout: "vertical";
      operator: "+" | "-" | "×";
      left: number;
      right: number;
      instruction?: string;
    }
  | {
      layout: "math";
      text: string;
      latex: string;
      instruction?: string;
      /** Frozen SVG in the sheet's figures pack; only catalog examples use bundled assets. */
      figureId?: string;
      /** Unit printed beside the answer blank; omitted legacy angle figures use degrees. */
      answerUnit?: string;
    };
/** Canonical exact values are integer strings, never floating-point estimates.
 * integer=[value]; rational=[numerator,positiveDenominator] reduced;
 * decimal=[coefficient,scale]; remainder=[quotient,remainder];
 * polynomial/surd use the defining family's documented ordered normal form.
 * text/latex are answer-only display, with no solution or worked steps.
 */
export type ArithmeticV2Answer = {
  kind:
    "integer" | "rational" | "decimal" | "remainder" | "polynomial" | "surd";
  exact: string[];
  text: string;
  latex: string;
};
export type ArithmeticV2Candidate = {
  /** Small exact integer parameters; the domain index maps to these uniquely. */
  parameters: number[];
  prompt: ArithmeticV2Prompt;
  answer: ArithmeticV2Answer;
};
export type ArithmeticV2Definition = {
  id: string;
  grade: ArithmeticGrade;
  strand: ArithmeticStrand;
  title: string;
  description: string;
  labels: string[];
  /** Rank only within this explicit arithmetic family. */
  rankGroup: string;
  /** Exact count of unique tasks. No arbitrary capacity or random retries. */
  domainSize: number;
  /** Must reject noninteger/out-of-range indexes. No randomness or I/O. */
  problemAt(index: number): ArithmeticV2Candidate;
  /** Independent numeric/normal-form verification; must not call problemAt. */
  verify(candidate: ArithmeticV2Candidate): boolean;
};
export type ArithmeticV2CatalogEntry = Omit<
  ArithmeticV2Definition,
  "problemAt" | "verify"
> & {
  example: ArithmeticV2Prompt;
  defaultCount: number;
};
