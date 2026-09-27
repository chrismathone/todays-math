/**
 * 개념 카드 갈래 표(`conceptKinds.ts`) — 탐험 활동 머리의 갈래 딱지(05 §8.19, D-143).
 *
 * 원장님 제보(2026-09-28): «이게 어떤 용어의 정의인지 정리인지 적어 놓는 게 좋을 거 같은데 너무 무작정 문제가 출몰함.»
 * 카드 원본(`definition-content.ts` · PROVENANCE SHA)에는 갈래 칸이 없어 **원본 밖 표**로 둔다.
 * 초안 230장(정의 166 · 성질 24 · 방법 17 · 공식 14 · 법칙 4 · 단위 4 · 정리 1)이고, 두 갈래 사이에 걸친
 * 26장은 교재 갈래와 맞춰 원장님께 여쭌 뒤 확정한다(`pending`). 시안 `docs/design/mockups/hifi-concept-context.html`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONCEPT_KINDS,
  conceptKind,
  conceptKindIsPending,
  conceptKindTable,
} from "@/lib/math-explorers/conceptKinds";
import { definitionCards } from "@/lib/math-explorers/definition-cards";

const PENDING = [
  "g3-carry",
  "g3-borrow",
  "g3-check-division",
  "g3-kilometer",
  "g3-capacity",
  "g4-estimate-quotient",
  "g4-number-rule",
  "g5-operation-order",
  "g5-round",
  "g5-round-up",
  "g5-rule-expression",
  "g5-perimeter",
  "g6-fraction-divide",
  "g6-rate-amount",
  "g6-part-of-ratio",
  "g6-cone-sphere",
  "g7-vertical-angle",
  "g7-sss",
  "g8-common-solution",
  "g8-similarity-area",
  "g8-complement",
  "g9-polynomial-multiply",
  "g9-common-factor",
  "g9-vertex",
  "g9-axis",
  "g9-inscribed-angle",
];

describe("conceptKinds — 갈래 표", () => {
  it("230장 전부에 갈래가 있고, 표에 카드 밖 id 가 없다", () => {
    const ids = definitionCards.map((card) => card.id).sort();
    expect(Object.keys(conceptKindTable).sort()).toEqual(ids);
  });

  it("갈래는 일곱 이름 가운데 하나다", () => {
    expect([...CONCEPT_KINDS]).toEqual([
      "정의",
      "성질",
      "공식",
      "방법",
      "법칙",
      "정리",
      "단위",
    ]);
    for (const card of definitionCards)
      expect(CONCEPT_KINDS).toContain(conceptKind(card.id));
  });

  it("초안 개수 그대로 — 정의 166 · 성질 24 · 방법 17 · 공식 14 · 법칙 4 · 단위 4 · 정리 1", () => {
    const count = Object.fromEntries(CONCEPT_KINDS.map((kind) => [kind, 0]));
    for (const card of definitionCards) count[conceptKind(card.id)!]++;
    expect(count).toEqual({
      정의: 166,
      성질: 24,
      공식: 14,
      방법: 17,
      법칙: 4,
      정리: 1,
      단위: 4,
    });
  });

  it("대표 카드 — 대입법은 방법 · 피타고라스 정리는 정리 · 사다리꼴의 넓이는 공식 · 곱이 0인 성질은 성질 · 소수는 정의", () => {
    expect(conceptKind("g8-substitution")).toBe("방법");
    expect(conceptKind("g8-pythagoras")).toBe("정리");
    expect(conceptKind("g5-trapezoid-area")).toBe("공식");
    expect(conceptKind("g9-zero-product")).toBe("성질");
    expect(conceptKind("prime")).toBe("정의");
    expect(conceptKind("g8-exponent-law")).toBe("법칙");
    expect(conceptKind("g3-length")).toBe("단위");
  });

  it("원장님 확정 전(pending)은 두 갈래 사이에 걸친 26장뿐이다", () => {
    const pending = definitionCards
      .filter((card) => conceptKindIsPending(card.id))
      .map((card) => card.id);
    expect(pending.sort()).toEqual([...PENDING].sort());
  });

  it("모르는 id 는 갈래 없음(딱지를 그리지 않는다)", () => {
    expect(conceptKind("no-such-card")).toBeNull();
    expect(conceptKindIsPending("no-such-card")).toBe(false);
  });

  it("학생 화면 번들이 부르는 표라 카드 원본(정답 열쇠)을 import 하지 않는다", () => {
    const source = readFileSync(
      resolve(__dirname, "../../lib/math-explorers/conceptKinds.ts"),
      "utf8",
    );
    expect(source).not.toMatch(
      /from\s+["'][^"']*definition-(cards|content)["']/,
    );
    expect(source).not.toMatch(/import\s*\(/);
  });
});
