/** 기출 변환에서 남은 연산자 표기를 복구한다. */
export function repairExamText(text: string): string {
  return text
    .replace(/(?<![A-Za-z])SIM(?![A-Za-z])/g, "∼")
    .replace(/\bcoc(?=\s*\d)/g, "\\cos ");
}
