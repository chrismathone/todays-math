/**
 * 개념 카드 갈래 표(`conceptKinds.ts`) — 탐험 활동 머리의 갈래 딱지(05 §8.19, D-143).
 *
 * 원장님 제보(2026-09-28): «이게 어떤 용어의 정의인지 정리인지 적어 놓는 게 좋을 거 같은데 너무 무작정 문제가 출몰함.»
 * 카드 원본(`definition-content.ts` · PROVENANCE SHA)에는 갈래 칸이 없어 **원본 밖 표**로 둔다.
 * 초안 230장 → 용어 분석 트랙(terms-coverage)의 3자 결론으로 확정(D-143 ⑦): `docs/reference/concept-terms/card-kinds.json`.
 * 확정 전 표(pending 26)는 없어졌다. 조건부 5장은 보정 문장(`conceptSentenceFixes.ts`)과 함께여야 맞는 갈래다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONCEPT_KINDS,
  conceptKind,
  conceptKindConditional,
  conceptKindTable,
} from "@/lib/math-explorers/conceptKinds";
import { cardFixes } from "@/lib/math-explorers/conceptSentenceFixes";
import { definitionCards } from "@/lib/math-explorers/definition-cards";

const decided = JSON.parse(
  readFileSync(
    resolve(__dirname, "../../../docs/reference/concept-terms/card-kinds.json"),
    "utf8",
  ),
) as {
  names: string[];
  counts: Record<string, number>;
  conditional: string[];
  cards: { id: string; kind: string }[];
};

describe("conceptKinds — 갈래 표(확정)", () => {
  it("230장 전부에 갈래가 있고, 표에 카드 밖 id 가 없다", () => {
    const ids = definitionCards.map((card) => card.id).sort();
    expect(Object.keys(conceptKindTable).sort()).toEqual(ids);
  });

  it("갈래 일곱 이름은 확정 파일 그대로", () => {
    expect([...CONCEPT_KINDS]).toEqual(decided.names);
    for (const card of definitionCards)
      expect(CONCEPT_KINDS).toContain(conceptKind(card.id));
  });

  it("카드마다 확정 파일(card-kinds.json)의 갈래와 같다", () => {
    const mismatch = decided.cards
      .filter((card) => conceptKind(card.id) !== card.kind)
      .map(
        (card) => `${card.id}: 표 ${conceptKind(card.id)} ≠ 확정 ${card.kind}`,
      );
    expect(mismatch).toEqual([]);
    expect(decided.cards).toHaveLength(230);
  });

  it("확정 개수 — 정의 166 · 성질 22 · 공식 15 · 방법 17 · 법칙 4 · 정리 1 · 단위 5", () => {
    const count = Object.fromEntries(CONCEPT_KINDS.map((kind) => [kind, 0]));
    for (const card of definitionCards) count[conceptKind(card.id)!]++;
    expect(count).toEqual(decided.counts);
    expect(count).toEqual({
      정의: 166,
      성질: 22,
      공식: 15,
      방법: 17,
      법칙: 4,
      정리: 1,
      단위: 5,
    });
  });

  it("조건부 5장은 보정 문장과 함께여야 맞는 갈래 — 표마다 보정이 있다", () => {
    const conditional = definitionCards
      .filter((card) => conceptKindConditional(card.id))
      .map((card) => card.id)
      .sort();
    expect(conditional).toEqual([...decided.conditional].sort());
    for (const id of conditional) expect(cardFixes[id]).toBeDefined();
  });

  it("모르는 id 는 갈래 없음(딱지를 그리지 않는다)", () => {
    expect(conceptKind("no-such-card")).toBeNull();
    expect(conceptKindConditional("no-such-card")).toBe(false);
  });

  it("학생 화면 번들이 부르는 표라 카드 원본(정답 열쇠)을 import 하지 않는다", () => {
    const source = readFileSync(
      resolve(__dirname, "../../lib/math-explorers/conceptKinds.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /from\s+["'][^"']*(definition-(cards|content)|conceptSentenceFixes)["']/,
    );
    expect(source).not.toMatch(/import\s*\(/);
  });
});
