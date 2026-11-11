/**
 * 쪽별 인식 경고를 «쪽당 한 줄»로 줄인다(원장님 2026-11-11 — 경고가 쪽마다 세 줄씩 쌓여 너무 많았다).
 *
 * - 크롭 잉크 검사(`src/lib/mathgen/ocrCropQuality.ts`)의 문장은 짧은 이름으로 바꿔 한 줄에 잇는다.
 * - «크롭은 자동 인식한 후보입니다 …»는 크롭이 있는 모든 쪽에 똑같이 붙는 안내라 쪽마다 띄우지 않고
 *   위에 한 번만 둔다(`common`).
 * - 모르는 문장은 버리지 않는다 — «확인 N건»으로 세고 원문은 «자세히»에서 읽는다.
 */

/** 모든 쪽에 같이 붙는 안내 — 위에 한 번만. */
export const COMMON_CROP_NOTICE =
  "크롭은 자동 인식 후보입니다 — 원본과 대조해 주세요.";

const CANDIDATE_PREFIX = "크롭은 자동 인식한 후보입니다.";

const SHORT_LABELS: { prefix: string; label: string }[] = [
  { prefix: "크롭 경계에 원본 잉크가 닿아 있습니다.", label: "경계 잉크" },
  { prefix: "크롭 밖에 원본 잉크가 남아 있습니다.", label: "크롭 밖 잉크" },
  {
    prefix: "크롭들이 같은 원본 잉크를 포함합니다.",
    label: "크롭 겹침",
  },
  {
    prefix: "크롭의 원본 잉크 범위를 확인하지 못했습니다.",
    label: "잉크 확인 못 함",
  },
];

export interface PageWarningSummary {
  /** 한 줄에 잇는 짧은 이름들(차례는 원문 차례) */
  labels: string[];
  /** «자세히»에서 읽는 원문 — 위로 올린 공통 안내는 뺀다 */
  details: string[];
  /** 공통 안내(자동 인식 후보)가 이 쪽에 있었나 */
  common: boolean;
}

export function summarizePageWarnings(warnings: string[]): PageWarningSummary {
  const labels: string[] = [];
  const details: string[] = [];
  let common = false;
  let other = 0;
  for (const warning of warnings) {
    if (warning.startsWith(CANDIDATE_PREFIX)) {
      common = true;
      continue;
    }
    details.push(warning);
    const known = SHORT_LABELS.find((item) => warning.startsWith(item.prefix));
    if (known) {
      if (!labels.includes(known.label)) labels.push(known.label);
    } else other++;
  }
  if (other) labels.push(`확인 ${other}건`);
  return { labels, details, common };
}
