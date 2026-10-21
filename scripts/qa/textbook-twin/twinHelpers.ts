/**
 * 교과서 쌍둥이 시범의 엔진 쪽 순수 함수 — `engine.ts` 가 쓰고 `textbookTwinHelpers.test.ts` 가 잠근다.
 */
import { createHash } from "node:crypto";

const CIRCLED = /^[①②③④⑤]/;

export const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

/** 문항 코드 → 32비트 씨앗(결정적) — 같은 문항은 늘 같은 엔진 쌍둥이 */
export function seedOf(code: string): number {
  return parseInt(sha256(`textbook-twin|${code}`).slice(0, 8), 16);
}

/** 발문 속 수(소수점 포함) — `2,000` 의 자릿점은 걷는다 */
export function numbersIn(text: string): string[] {
  return (
    text.replace(/(?<=\d),(?=\d{3}(?!\d))/g, "").match(/\d+(?:\.\d+)?/g) ?? []
  );
}

/** 쌍둥이가 원본의 수를 얼마나 물려받았나 — 원본 수(겹침 없이) 가운데 쌍둥이에 있는 몫. 0 · 1 도 센다(Codex 1회차 D) */
export function numberRetention(original: string[], twin: string[]): number {
  const params = [...new Set(original)];
  if (!params.length) return 0;
  const have = new Set(twin);
  return params.filter((n) => have.has(n)).length / params.length;
}

/** 보기 ①~⑤ 를 발문에서 떼어 낸다 — 후보 계약은 보기를 따로 든다(한 줄에 여럿 붙은 꼴도) */
export function splitChoices(content: string): {
  stem: string;
  choices: string[];
} {
  const lines = content.split("\n");
  const first = lines.findIndex((line) => CIRCLED.test(line.trim()));
  if (first < 0) return { stem: content, choices: [] };
  const choices = lines
    .slice(first)
    .filter((line) => line.trim())
    .join(" ")
    .split(/(?=[①②③④⑤])/)
    .map((piece) => piece.replace(CIRCLED, "").trim())
    .filter(Boolean);
  return { stem: lines.slice(0, first).join("\n").trimEnd(), choices };
}
