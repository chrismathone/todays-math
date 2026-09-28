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

/**
 * 빈칸 두 조각을 맞바꾼 문장 감사 표 — 채점은 자리 그대로라, 맞바꿔도 참이면 맞는 답을 틀렸다고 친다(D-143 ⑦ 리드 적대적
 * 검토 ①과 같은 검사 · `conceptSentenceSymmetry.test.ts`). 뜻은 코드가 못 가리므로 3자 검토(2026-09-28 — 21장 모두
 * «맞바꿔도 참인 대칭 없음»)의 까닭을 적는다. 카드 문장이 바뀌면 맞바꾼 문장이 표와 달라져 빨개진다.
 */
const SWAP_AUDIT: Record<string, [string, string]> = {
  "sup-line": [
    "두 점을 지나 곧은으로 끝없이 뻗어 나가는 양쪽 선.",
    "«곧은으로» · «양쪽 선» — 말이 안 됨",
  ],
  "sup-angle": [
    "한 반직선에서 나간 두 점이 만드는 도형.",
    "반직선에서 점이 나가지 않는다 — 말이 안 됨",
  ],
  "sup-side-vertex": [
    "삼각형이나 사각형을 이루는 점을 변이라 하고, 두 변이 만나는 선분을 꼭짓점이라고 한다.",
    "점을 변, 선분을 꼭짓점이라 부른다 — 거짓",
  ],
  "sup-rectangle": [
    "직각 각이 모두 네인 사각형.",
    "«직각 각» · «네인» — 말이 안 됨",
  ],
  "sup-square": [
    "네 변의 길이가 모두 직각 네 각이 모두 같고인 사각형.",
    "«모두 직각 네 각» · «같고인» — 말이 안 됨",
  ],
  "sup-perpendicular-line": [
    "한 직선과 직선으로 만나는 수직.",
    "수선은 직선이지 «수직»이 아니다 — 말이 안 됨",
  ],
  "sup-trapezoid": [
    "한 쌍한 변이 적어도 평행 있는 사각형.",
    "«한 쌍한 변» — 말이 안 됨",
  ],
  "sup-regular-polygon": [
    "각의 길이도, 변의 크기도 모두 똑같은 다각형.",
    "«각의 길이» · «변의 크기» — 말이 안 됨",
  ],
  "sup-isosceles-angles": [
    "이등변삼각형에서 길이가 같은 두 변의 같다에 있는 두 각은 크기가 맞은편.",
    "«변의 같다에» · «크기가 맞은편» — 말이 안 됨",
  ],
  "sup-common-divisor": [
    "두 자연수의 공통 가운데 약수인 수.",
    "«공통 가운데 약수인 수» — 말이 안 됨",
  ],
  "sup-common-multiple": [
    "두 자연수의 공통 가운데 배수인 수.",
    "«공통 가운데 배수인 수» — 말이 안 됨",
  ],
  "sup-corresponding-parts": [
    "합동인 두 도형을 겹치게 서로 포개면 되는 점, 변, 각.",
    "«겹치게 서로 포개면 되는» — 대응을 말하지 않는다(말이 안 됨)",
  ],
  "sup-face-edge": [
    "직육면체에서 겉을 이루는 선분을 면이라 하고, 두 면이 맞닿아 생기는 평평한 부분을 모서리라고 한다.",
    "선분을 면, 평평한 부분을 모서리라 부른다 — 거짓",
  ],
  "sup-base-lateral": [
    "각기둥에서 이어이면서 서로 평행하게 마주 보는 두 면이 밑면이고, 두 밑면을 합동 주는 나머지 면들이 옆면이다.",
    "«이어이면서» · «합동 주는» — 말이 안 됨",
  ],
  "sup-base-exponent": [
    "2³ = 2 × 2 × 2에서 2가 지수, 곱해진 2의 개수인 3이 밑이다.",
    "밑과 지수가 뒤바뀜(2³ 의 밑은 2 · 지수는 3) — 거짓",
  ],
  "sup-equation-sides": [
    "등식에서 등호의 오른쪽에 있는 식이 좌변, 왼쪽에 있는 식이 우변이며 두 변을 함께 양변이라고 한다.",
    "좌변 · 우변이 뒤바뀜 — 거짓",
  ],
  "sup-y-axis-symmetry": [
    "y축을 기준으로 x좌표 때 포개지는 두 점은 접었을의 부호만 서로 다르다.",
    "«x좌표 때» · «접었을의 부호» — 말이 안 됨",
  ],
  "sup-point-line-distance": [
    "직선 밖의 한 점에서 그 직선까지 길이으로 내린 선분의 수직.",
    "«길이으로 내린» · «선분의 수직» — 말이 안 됨",
  ],
  "sup-corresponding-alternate": [
    "한 직선이 두 직선과 만나서 생기는 각 가운데 엇갈린 위치에 놓인 두 각을 동위각, 두 직선 사이에서 같은 위치에 놓인 두 각을 엇각이라고 한다.",
    "동위각 · 엇각이 뒤바뀜 — 거짓",
  ],
  "sup-parallel-lines": [
    "두 직선이 같다하면, 이 두 직선을 가로지르는 직선이 만드는 동위각끼리, 엇각끼리 크기가 각각 평행.",
    "«같다하면» · «각각 평행» — 말이 안 됨",
  ],
  "sup-right-triangle-congruence": [
    "두 직각삼각형은 예각의 길이가 같고, 한 빗변의 크기 또는 다른 한 변의 길이가 같으면 합동이다.",
    "«예각의 길이» · «빗변의 크기» — 말이 안 됨",
  ],
};
// 두 조각이 대등하게 이어지는 가운데 조각 — «A = B» · «A과 B» · «A와 B» · «A 및 B»(본 카드 대칭 시험과 같은 식)
const SYMMETRIC_JOIN = /(=|과|와|및)\s*$/;
// 활용 끝을 떼어 낸 줄기 — 오답 말이 정답 말과 줄기가 같으면 같은 뜻을 다른 칸 꼴로 넣을 수 있다(본 카드 대칭 시험과 같은 목록).
const ENDINGS = [
  "진다",
  "지고",
  "지며",
  "지는",
  "진",
  "한다",
  "하고",
  "하며",
  "하다",
  "하는",
  "한",
  "이다",
  "이고",
  "이며",
  "인",
  "된다",
  "되고",
  "되며",
  "되는",
  "된",
  "는다",
  "다",
  "고",
  "며",
  "는",
];
const stem = (word: string) => {
  const t = word.replace(/\s+/g, "");
  const ending = ENDINGS.find((e) => t.length > e.length && t.endsWith(e));
  return ending ? t.slice(0, -ending.length) : t;
};

describe("보충 카드 21장 — 빈칸 맞바꿈 · 대등 잇기 · 활용형", () => {
  it("감사 표 = 21장 · 맞바꾼 문장이 표와 같고 뜻 문장과 다르다", () => {
    expect(Object.keys(SWAP_AUDIT)).toEqual(IDS);
    for (const card of supplementCards) {
      const swapped =
        card.pieces[0]! +
        card.words[1] +
        card.pieces[1] +
        card.words[0] +
        card.pieces[2];
      const [audited, why] = SWAP_AUDIT[card.id]!;
      expect({ id: card.id, swapped }).toEqual({
        id: card.id,
        swapped: audited,
      });
      expect(why.length).toBeGreaterThan(0);
      expect(swapped).not.toBe(card.definition);
    }
  });

  it("가운데 조각이 대등하게 잇는 꼴(«=» · «…과» · «…와» · «및»)이 아니다", () => {
    for (const card of supplementCards)
      expect({
        id: card.id,
        join: SYMMETRIC_JOIN.test(card.pieces[1]!),
      }).toEqual({ id: card.id, join: false });
    expect(SYMMETRIC_JOIN.test(" 곱한 값과 ")).toBe(true);
  });

  it("오답 말이 정답 말의 활용형이 아니다", () => {
    for (const card of supplementCards) {
      const [a0, a1, ...wrong] = card.words;
      for (const d of wrong)
        expect({
          id: card.id,
          d,
          same: [a0!, a1!].filter((a) => stem(a) === stem(d!)),
        }).toEqual({ id: card.id, d, same: [] });
    }
    expect(stem("같고")).toBe(stem("같다"));
  });
});

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
