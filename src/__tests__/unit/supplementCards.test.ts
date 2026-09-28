/**
 * 보충 카드 21장 — 교재에만 있는 개념(D-147, 원장님 2026-09-28: 단원 끝 한 장 + 도감 선반 · 1안 «교재» 딱지).
 * 문장은 우리 말로 새로 썼고 3자 합의(Claude · codex · grok)를 지났다 — `docs/reference/concept-terms/supplement-cards.md`.
 *
 * 본 카드 230장(PROVENANCE · 46단원 × 5장)과 섞지 않는다: 상자는 단원 카드 앞 2 · 4장, 오늘의 탐험은 단원 5장,
 * 기억 복습은 본 카드 기록만 본다. 이 시험은 그 담을 잠그고, 문장이 지켜야 할 모양(빈칸 둘 · 조사 · 예 둘씩)을 잰다.
 * 교재 원문이 없다는 것은 저장소 밖 말뭉치로 재는 누출 검사 다섯이 맡는다(`scripts/qa/concept-terms/`).
 */
import { describe, expect, it } from "vitest";
import {
  conceptKind,
  conceptKindTable,
  isSupplementCardId,
  supplementKindTable,
} from "@/lib/math-explorers/conceptKinds";
import {
  definitionCards,
  definitionUnits,
} from "@/lib/math-explorers/definition-cards";
import {
  supplementCard,
  supplementCards,
} from "@/lib/math-explorers/supplement-content";

const IDS = [
  "sup-line",
  "sup-angle",
  "sup-side-vertex",
  "sup-rectangle",
  "sup-square",
  "sup-perpendicular-line",
  "sup-trapezoid",
  "sup-regular-polygon",
  "sup-isosceles-angles",
  "sup-common-divisor",
  "sup-common-multiple",
  "sup-corresponding-parts",
  "sup-face-edge",
  "sup-base-lateral",
  "sup-base-exponent",
  "sup-equation-sides",
  "sup-y-axis-symmetry",
  "sup-point-line-distance",
  "sup-corresponding-alternate",
  "sup-parallel-lines",
  "sup-right-triangle-congruence",
];

/** 받침 — 없음 · ㄹ · 그 밖(으로/로 는 ㄹ 이 받침 없음 쪽). 한글이 아니면 null. */
function finalSound(word: string): "none" | "rieul" | "other" | null {
  const ch = word.trim().at(-1)!;
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  const jong = code % 28;
  return jong === 0 ? "none" : jong === 8 ? "rieul" : "other";
}
const SENSITIVE: [string, string][] = [
  ["이라고", "라고"],
  ["이면서", "면서"],
  ["으로", "로"],
  ["이며", "며"],
  ["이고", "고"],
  ["을", "를"],
  ["과", "와"],
  ["은", "는"],
  ["이", "가"],
];

describe("보충 카드 21장 — 내용과 담", () => {
  it("후보 21장 순서 그대로, id 는 sup- 로 시작하고 본 카드 230장과 겹치지 않는다", () => {
    expect(supplementCards.map((card) => card.id)).toEqual(IDS);
    const main = new Set(definitionCards.map((card) => card.id));
    for (const card of supplementCards) {
      expect(card.id.startsWith("sup-")).toBe(true);
      expect(main.has(card.id)).toBe(false);
      expect(supplementCard(card.id)).toBe(card);
    }
    expect(() => supplementCard("prime")).toThrow();
  });

  it("본 카드는 그대로 230장 · 단원마다 5장이다(상자 · 단원 탐험 · 기억 복습이 보충을 모른다)", () => {
    expect(definitionCards).toHaveLength(230);
    for (const unit of definitionUnits)
      expect(
        definitionCards.filter((card) => card.unit === unit.id),
      ).toHaveLength(5);
  });

  it("붙는 단원은 열한 곳 — 있는 단원이고, 학년 차례대로다", () => {
    const counts = Object.fromEntries(
      [...new Set(supplementCards.map((card) => card.unit))].map((unit) => [
        unit,
        supplementCards.filter((card) => card.unit === unit).length,
      ]),
    );
    expect(counts).toEqual({
      "g3-shapes": 5,
      "g4-polygons": 3,
      "g4-angles": 1,
      "g5-divisors": 2,
      "g5-solid": 2,
      "g6-solids": 1,
      factors: 1,
      "g7-equation": 1,
      "g7-coordinate": 1,
      "g7-geometry": 3,
      "g8-shapes": 1,
    });
    const grades = supplementCards.map(
      (card) => definitionUnits.find((unit) => unit.id === card.unit)!.grade,
    );
    expect(grades).toEqual([...grades].sort((a, b) => a - b));
  });

  it("문장은 빈칸 둘 · 말 넷(겹침 없음) · 맞음 둘 이상 · 틀림 둘 이상 · 느낌표 없음", () => {
    for (const card of supplementCards) {
      expect(card.pieces).toHaveLength(3);
      expect(new Set(card.words).size).toBe(4);
      expect(card.definition).toBe(
        card.pieces[0] +
          card.words[0] +
          card.pieces[1] +
          card.words[1] +
          card.pieces[2],
      );
      expect(card.examples.filter((e) => e.yes).length).toBeGreaterThanOrEqual(
        2,
      );
      expect(card.examples.filter((e) => !e.yes).length).toBeGreaterThanOrEqual(
        2,
      );
      expect(card.examples.length).toBeLessThanOrEqual(4);
      expect(card.trap.length).toBeGreaterThan(0);
      expect(card.explanation.length).toBeGreaterThan(0);
      const all = [
        card.name,
        card.definition,
        ...card.words,
        card.exampleTitle,
        ...card.examples.map((e) => e.text),
        card.trap,
        card.explanation,
      ].join(" ");
      expect(all).not.toMatch(/[!！]/);
    }
  });

  it("빈칸 뒤 조사가 정답과 그 자리 틀린 말에 똑같이 붙는다(조사가 답을 알려 주지 않게)", () => {
    const leaks: string[] = [];
    for (const card of supplementCards) {
      [
        [card.words[0], card.words[2]],
        [card.words[1], card.words[3]],
      ].forEach(([right, wrong], blank) => {
        const after = card.pieces[blank + 1]!;
        const pair = SENSITIVE.find(
          ([a, b]) => after.startsWith(a) || after.startsWith(b),
        );
        if (!pair) return;
        const r = finalSound(right!),
          w = finalSound(wrong!);
        const same =
          r === w ||
          (pair[0] === "으로" &&
            [r, w].every((sound) => sound === "none" || sound === "rieul"));
        if (!same) leaks.push(`${card.id} 빈칸${blank + 1} ${right}/${wrong}`);
      });
    }
    expect(leaks).toEqual([]);
  });

  it("앞개념은 있는 카드(본 카드 또는 보충 카드)다", () => {
    const known = new Set([
      ...definitionCards.map((card) => card.id),
      ...supplementCards.map((card) => card.id),
    ]);
    for (const card of supplementCards)
      for (const id of card.prerequisites) expect(known.has(id)).toBe(true);
  });

  it("갈래는 본 카드 표 밖의 작은 표 — 정의 18 · 성질 3, 딱지는 같은 함수로 찾는다", () => {
    expect(Object.keys(supplementKindTable)).toEqual(IDS);
    for (const card of supplementCards) {
      expect(supplementKindTable[card.id]).toBe(card.kind);
      expect(conceptKind(card.id)).toBe(card.kind);
      expect(isSupplementCardId(card.id)).toBe(true);
    }
    const kinds = Object.values(supplementKindTable);
    expect(kinds.filter((kind) => kind === "정의")).toHaveLength(18);
    expect(kinds.filter((kind) => kind === "성질")).toHaveLength(3);
    // 본 카드 표는 230장 그대로(`conceptKinds.test.ts` 가 id 짝을 잠근다).
    expect(Object.keys(conceptKindTable)).toHaveLength(230);
    expect(isSupplementCardId("prime")).toBe(false);
  });
});
