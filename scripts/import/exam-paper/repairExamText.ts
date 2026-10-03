/** 기출 변환에서 남은 연산자 표기를 복구한다. */
import { tokenizeMath } from "../../../src/lib/math/segments";

export function repairExamText(text: string): string {
  const operators = text
    .replace(/(?<![A-Za-z])SIM(?![A-Za-z])/g, "∼")
    .replace(/\bcoc(?=\s*\d)/g, "\\cos ");
  // 제품과 같은 달러 경계로만 고친다. 글 속 %나 짝 없는 달러는 그대로 남는다.
  return tokenizeMath(operators)
    .map((segment) => {
      if (segment.type === "text") return segment.value;
      const delimiter = segment.type === "display" ? "$$" : "$";
      // 이스케이프는 두 글자씩 소비한다. 이미 있는 \%는 그대로이고,
      // 줄바꿈 \\ 뒤의 %는 여전히 맨 퍼센트이므로 이스케이프한다.
      const value = segment.value.replace(/\\[\s\S]|%/g, (token) =>
        token === "%" ? "\\%" : token,
      );
      return `${delimiter}${value}${delimiter}`;
    })
    .join("");
}
