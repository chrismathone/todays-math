import type { StudioOrderedPage } from "./studioPageOrder";

/**
 * Provisional conservative limits, not a calibrated document classifier.
 * Count even faint/color strokes (any composited channel below 252).
 * Blank requires fewer than one ink pixel per million AND no extracted text.
 * Real-PDF measurements belong to the caller's rendering/QA, not this pure model.
 */
export const STUDIO_INK_CHANNEL_THRESHOLD = 252;
export const STUDIO_BLANK_INK_RATIO = 0.000001;

/** RGBA pixel proportion after compositing onto white; invalid rasters are unknown. */
export function measurePageInk(data: Uint8ClampedArray): number {
  if (!data.length || data.length % 4 !== 0) return NaN;
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    const opacity = data[i + 3] / 255;
    const darkestChannel = Math.min(data[i], data[i + 1], data[i + 2]);
    const onWhite = 255 - (255 - darkestChannel) * opacity;
    if (onWhite < STUDIO_INK_CHANNEL_THRESHOLD) ink += 1;
  }
  return ink / (data.length / 4);
}

type AutoOut = StudioOrderedPage["autoOut"];

function normalizedLines(textLines: readonly string[]): string[] {
  return textLines
    .flatMap((line) =>
      line
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .split(/\r\n?|\n/)
        .map((part) => part.replace(/\s+/g, " ").trim()),
    )
    .filter(Boolean);
}

const questionWording =
  /[?？]|구하|고르|쓰시오|쓰세요|답하|계산하|설명하|증명하|나타내|완성하|풀어|풀고|옳은|옳지|알맞|적절|몇\s|어느|얼마|무엇|보기에서|다음\s*중|정답을|정답이/;
const questionNumber =
  /^(?:\d{1,3}(?:[.)\s]|번|$)|[[(]\s*\d{1,3}|\[?\s*(?:서술형|논술형|단답형|주관식|객관식)\s*(?:\d|\])|(?:문제|문항)\s*\d)/;
const equation = /[=<>≤≥÷×+−√∫∑^]/;
const answerHeading =
  /^(?:빠른\s*)?정답(?:표)?(?:\s*(?:및|과|·|\/)\s*해설)?$|^해설$/;
const answerColumns =
  /^(?:(?:문항|문제|번호|정답|답)\s*(?:번호)?\s*[|:]?\s*)+$/;

/** An answer heading alone is never enough: every remaining token must be a table cell. */
function isStructuredAnswerTable(lines: readonly string[]): boolean {
  if (!answerHeading.test(lines[0])) return false;
  const body = lines
    .slice(1)
    .filter((line) => !answerColumns.test(line))
    .join(" ")
    .replace(/\s*\|\s*/g, " ");
  // NFKC makes circled answer digits ordinary digits. No prose or equations are accepted.
  const entry =
    /^(\d{1,3})(?:[.)]|번)?[\s:]+([+-]?\d+(?:\.\d+)?(?:\/\d+)?|[OX○×])(?=\s|$)\s*/;
  let remaining = body;
  let previous: number | undefined;
  let count = 0;
  while (remaining) {
    const match = entry.exec(remaining);
    if (!match) return false;
    const number = Number(match[1]);
    if (number < 1 || (previous !== undefined && number !== previous + 1))
      return false;
    previous = number;
    count += 1;
    remaining = remaining.slice(match[0].length);
  }
  return count >= 2;
}

const coverHeading =
  /^(?:(?:수학|영어|국어|과학|사회)\s*)?(?:문제지|답안지)$|^(?:수험생\s*)?유의\s*사항$/;
const coverMetadata = [
  /^(?:수학|영어|국어|과학|사회)$/,
  /^\d{4}학년도\s*(?:\d학기\s*)?(?:중간|기말)고사$/,
  /^(?:(?:초등학교|중학교|고등학교)\s*)?\d학년(?:\s*\d{1,2}반)?$/,
  /^(?:학교|학년|반|번호|이름|성명|수험\s*번호)\s*[:：]?\s*[\d _()\-]+$/,
  /^(?:시험\s*시간|총\s*문항\s*수|문항\s*수|배점|만점)\s*[:：]?\s*\d+\s*(?:분|문항|점)$/,
];

/** Text rules require verified absence of image and vector fills; scans use the blank rule. */
export function analyzeStudioPage({
  inkRatio,
  textLines,
  hasImagePaint,
  hasFillPaint,
}: {
  inkRatio: number;
  textLines: readonly string[];
  /** Undefined means the operator list was not verified, so text may omit the body. */
  hasImagePaint?: boolean;
  /** Includes filled vector glyphs; even decorative fills make text rules unsafe. */
  hasFillPaint?: boolean;
}): AutoOut {
  if (hasFillPaint === true) return undefined;
  const lines = normalizedLines(textLines);
  if (!lines.length) {
    return Number.isFinite(inkRatio) &&
      inkRatio >= 0 &&
      inkRatio < STUDIO_BLANK_INK_RATIO
      ? "빈 쪽"
      : undefined;
  }
  // Extracted headings/tables may omit questions drawn as images or filled outlines.
  if (hasImagePaint !== false || hasFillPaint !== false) return undefined;
  if (lines.some((line) => questionWording.test(line))) return undefined;
  // Numbered answer keys are a positive table case, before the question-number veto.
  if (isStructuredAnswerTable(lines)) return "정답표";
  if (lines.some((line) => questionNumber.test(line) || equation.test(line)))
    return undefined;
  if (
    lines.some((line) => coverHeading.test(line)) &&
    lines.every(
      (line) =>
        coverHeading.test(line) ||
        coverMetadata.some((pattern) => pattern.test(line)),
    )
  )
    return "표지";
  return undefined;
}
