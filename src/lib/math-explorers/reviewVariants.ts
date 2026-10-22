import type { ExplorerReviewVariant } from "@/contracts/mathExplorers.contract";
import type { CourseCard } from "./definition-content";

/**
 * Version 1 is a stored content identity. Never change its math or wording after
 * activation: add a version instead. No identity means the authored static card.
 * Only numeric examples, their question and the matching solution are varied.
 * Integer hundredths avoid floating-point answer/label discrepancies.
 */
export function reviewVariantCard(
  card: CourseCard,
  variant?: ExplorerReviewVariant,
): CourseCard {
  if (!variant?.cardIds.some((id) => id === card.id)) return card;
  const seed = variant.seed;
  const n = 10 + (seed % 80);
  const truth = Math.floor(seed / 2) % 2 === 0;
  const decimal = (hundredths: number) =>
    `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`.replace(
      /\.?0+$/,
      "",
    );
  // Keep one decimal place on each operand, including 2.0/1.0, so the
  // explanation's two-place calculation exactly matches the printed question.
  const tenths = (value: number) => `${Math.floor(value / 10)}.${value % 10}`;
  const choice = (text: string, yes: boolean) => ({ text, yes });
  let content: Pick<
    CourseCard,
    "exampleTitle" | "examples" | "trap" | "truth" | "explanation"
  >;
  switch (card.id) {
    case "g5-decimal-multiply": {
      const a = 11 + (seed % 79);
      const b = 2 + (Math.floor(seed / 79) % 8);
      const equation = (x: number, y: number, product: number) =>
        `${tenths(x)} × ${tenths(y)} = ${decimal(product)}`;
      content = {
        exampleTitle: "계산이 맞는 것을 모두 골라봐.",
        examples: [
          choice(equation(a, b, a * b), true),
          choice(equation(a + 1, b + 1, (a + 1) * (b + 1)), true),
          choice(equation(a, b, a * b * 10), false),
          choice(equation(a + 1, b + 1, (a + 1) * (b + 1) * 10), false),
        ],
        trap: `${tenths(a)} × ${tenths(b)}은 ${decimal(a * b * (truth ? 1 : 10))}이다.`,
        truth,
        explanation: `${a} × ${b} = ${a * b}에서 두 수의 소수 자릿수의 합이 2이므로 곱은 ${decimal(a * b)}이야. ${tenths(a + 1)} × ${tenths(b + 1)}도 같은 방법으로 계산하면 ${decimal((a + 1) * (b + 1))}이야.`,
      };
      break;
    }
    case "g5-at-least":
    case "g5-more-than": {
      const inclusive = card.id === "g5-at-least";
      const greater = seed % 2 === 0;
      const direction = greater ? 1 : -1;
      const term = inclusive
        ? greater
          ? "이상"
          : "이하"
        : greater
          ? "초과"
          : "미만";
      const accepts = (value: number) =>
        inclusive
          ? greater
            ? value >= n
            : value <= n
          : greater
            ? value > n
            : value < n;
      const values = inclusive
        ? [n, n + direction * 2, n - direction, n - direction * 4]
        : [n + direction, n + direction * 3, n, n - direction];
      content = {
        exampleTitle: `${n} ${term}인 수를 모두 골라봐.`,
        examples: values.map((value) => choice(String(value), accepts(value))),
        trap: `${n} ${term}에는 ${n}이 ${truth === inclusive ? "포함된다" : "포함되지 않는다"}.`,
        truth,
        explanation:
          variant.version === 2
            ? `${term}${term === "이상" || term === "미만" ? "은" : "는"} 기준 수 ${n}을 ${inclusive ? "포함해" : "포함하지 않아"}. ${n}보다 ${greater ? "큰" : "작은"} 수${inclusive ? "와 기준 수가" : "만"} 이 범위에 들어가.`
            : `${term}은 기준 수 ${n}을 ${inclusive ? "포함해" : "포함하지 않아"}. ${n}보다 ${greater ? "큰" : "작은"} 수${inclusive ? "와 기준 수" : "만"}가 이 범위에 들어가.`,
      };
      break;
    }
    case "g5-round": {
      const base = n * 10;
      const round = (value: number) => Math.floor((value + 5) / 10) * 10;
      const low = base + 4;
      const high = base + 5;
      content = {
        exampleTitle:
          "일의 자리에서 반올림해 십의 자리까지 나타낸 것이 맞는 것을 모두 골라봐.",
        examples: [
          choice(`${low} → ${round(low)}`, true),
          choice(`${high} → ${round(high)}`, true),
          choice(`${low} → ${base + 10}`, false),
          choice(`${high} → ${base}`, false),
        ],
        trap: `${high}를 십의 자리까지 반올림하면 ${truth ? round(high) : base}이다.`,
        truth,
        explanation: `${low}는 일의 자리 숫자 4가 5 미만이므로 ${round(low)}, ${high}는 일의 자리 숫자 5가 5 이상이므로 ${round(high)}으로 반올림해.`,
      };
      break;
    }
    case "g5-round-up": {
      const base = n * 10;
      const up = (value: number) => Math.ceil(value / 10) * 10;
      content = {
        exampleTitle: "십의 자리까지 올림한 값이 맞는 것을 모두 골라봐.",
        examples: [
          choice(`${base + 1} → ${up(base + 1)}`, true),
          choice(`${base + 9} → ${up(base + 9)}`, true),
          choice(`${base + 1} → ${base}`, false),
          choice(`${base + 9} → ${base}`, false),
        ],
        trap: `${base}을 십의 자리까지 올림하면 ${truth ? base : base + 10}이다.`,
        truth,
        explanation: `${base + 1}과 ${base + 9}는 일의 자리에 0이 아닌 수가 있어 ${base + 10}으로 올림해. ${base}은 일의 자리가 0이므로 ${base} 그대로야.`,
      };
      break;
    }
    default:
      return card;
  }
  return { ...card, ...content, note: content.explanation };
}
