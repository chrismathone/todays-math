/**
 * 초등 단원에 들어오면 안 되는, 판별력이 높은 중등 대수 신호만 잡는다.
 *
 * 이 검사는 분류기를 대체하지 않는다. 잘못 붙었을 가능성이 큰 문항을
 * `pending`으로 보내 자동 출제만 막고, 최종 단원은 사람이 검수해 정한다.
 */
const SECONDARY_KEYWORDS = [
  "일차식",
  "이차식",
  "다항식",
  "동류항",
  "계수",
  "문자와 식",
  "제곱근",
  "무리수",
  "근호",
];

const ALGEBRAIC_TERM = /(?:\d|})\s*[abcxyz]\b/i;
const BARE_VARIABLE_OPERATION = /\b[abcxyz]\s*(?:[+\-*/÷×]|\\(?:times|div))/i;

/** 초등 배정 본문을 보류해야 할 이유. 정상 배정이면 null. */
export function elementaryContentHoldReason(
  grade: string | undefined,
  content: string,
): string | null {
  if (!grade?.startsWith("초")) return null;

  const signals: string[] = [];
  const keyword = SECONDARY_KEYWORDS.find((item) => content.includes(item));
  if (keyword) signals.push(`중등 용어 '${keyword}'`);
  if (/\\sqrt|√/.test(content)) signals.push("제곱근 표기");
  if (ALGEBRAIC_TERM.test(content) || BARE_VARIABLE_OPERATION.test(content)) {
    signals.push("문자식 항");
  }

  if (signals.length === 0) return null;
  return `초등 ${grade} 배정 본문에서 ${signals.join(", ")} 신호를 발견했습니다.`;
}
