/**
 * 문장 조립 «정답이 아닌 채움» 검사 — 조립은 **자리 그대로** 채점한다(첫 칸 = 정답 첫 조각, 둘째 칸 = 정답 둘째 조각). 그래서 정답이
 * 아닌 채움이 참인 문장이면 맞는 답을 틀렸다고 친다(첫 판 점수 · 기억 복습이면 차례가 처음으로). 리드 적대적 검토 ①(2026-09-28)이
 * 분수의 곱셈 맞바꿈을 잡았고, 맞바꿈 검사가 피타고라스를, 넓은 검사가 «나눗셈과 크기»(오답 말이 정답의 활용형)를, 230장 기계
 * 훑기가 원본 카드 16장을 더 잡았다. 두 빈칸이 본디 대등한 카드는 순서 무관 채점(`conceptOrderFree.ts`)으로 받는다.
 *
 * 뜻은 코드가 못 가리므로 채움마다 사람이 판정을 적은 **원장**(`docs/reference/concept-terms/card-fillings-audit.json` — 230장
 * 전부(리드 검토 B), 카드마다 11채움 · 3자 합의 또는 Claude · 한 표 의견은 까닭 칸 · 문장은 옮겨 적지 않고 말 · 조각 지문만)을 둔다. 카드의 문장 · 말이 바뀌면 원장과
 * 달라져 빨개진다(리드 검토: 맞바꿈만이 아니라 오답 말이 든 채움까지 — g9-axis 오답 말을 y=p 로 되돌리면 빨개진다).
 * 원장을 다시 뽑으면(`build-fillings-audit.ts`) 바뀐 채움은 «미검토»가 되어 여전히 빨갛다 — 읽고 판정을 적어야 초록이다.
 * 판정은 엔진 채점과 맞물린다: «순서 무관 정답»인 채움만 엔진이 맞음으로 친다.
 *
 * 기계 검사 둘을 230장에 곁들인다: 가운데 조각이 대등하게 잇는 꼴이면 순서 무관이거나 맞바꿈이 거짓이라고 적어 둔 카드여야 하고,
 * 오답 말이 정답 말의 활용형(같은 줄기)이면 안 된다.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { orderFreeCards } from "@/lib/math-explorers/conceptOrderFree";
import { cardFixes } from "@/lib/math-explorers/conceptSentenceFixes";
import {
  definitionAssemblyCorrect,
  definitionCard,
  definitionCards,
  definitionNeedsRead,
  definitionOptions,
  definitionQuestionId,
} from "@/lib/math-explorers/definition-cards";
import {
  applyExplorerAction,
  createExplorerState,
} from "@/lib/math-explorers/engine";
import {
  fitsParticle,
  particleGiveaways,
} from "../../../scripts/qa/concept-terms/particleFit";

type Filling = {
  slots: [number, number];
  words: [string, string];
  verdict: string;
  why?: string;
};
const audit = JSON.parse(
  readFileSync(
    resolve(
      __dirname,
      "../../../docs/reference/concept-terms/card-fillings-audit.json",
    ),
    "utf8",
  ),
) as {
  cards: {
    id: string;
    judgedBy: string;
    piecesSha: string;
    fillings: Filling[];
  }[];
};
const auditOf = new Map(audit.cards.map((card) => [card.id, card]));
/** 조각 지문 — 빈칸 밖 글이 바뀌면 달라진다(원장 생성기와 같은 셈). */
const piecesSha = (pieces: readonly string[]) =>
  createHash("sha256")
    .update(JSON.stringify(pieces), "utf8")
    .digest("hex")
    .slice(0, 16);

/** 정답(0, 1)을 뺀 순서 있는 채움 11개(칸 · 말) — 원장과 같은 차례. 문장은 원장에 적지 않는다(아래 시험). */
const fillingsOf = (id: string) => {
  const card = definitionCard(id);
  const out: { slots: [number, number]; words: [string, string] }[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      if (i === j || (i === 0 && j === 1)) continue;
      out.push({ slots: [i, j], words: [card.words[i]!, card.words[j]!] });
    }
  return out;
};

// 두 조각이 대등하게 이어지는 가운데 조각 — «A = B» · «A과 B» · «A와 B» · «A 및 B» · «A, B»
const symmetricJoin = (middle: string) =>
  /(=|과|와|및)\s*$/.test(middle) || middle.trim() === ",";
/** 대등 꼴이지만 맞바꾸면 거짓인 원본 카드(Claude 읽음 2026-09-28 · 230장 기계 훑기 목록). */
const JOIN_BUT_ORDERED: Record<string, string> = {
  "g5-point-symmetry":
    "«한 점을 중심으로 겹쳐지는 돌렸을 때 처음 도형과 180° 도형» — 말이 안 됨",
  "g7-coordinate": "순서쌍은 (x좌표, y좌표) — 순서가 곧 뜻",
  "g8-power": "«여러 번 지수 것을 밑과 곱한로» — 말이 안 됨",
  "g8-similarity":
    "«일정한 비율로 합동했을 때 … 확대 또는 축소이 되는» — 말이 안 됨",
  "g9-factorization":
    "«두 개 이상의 반대 방향으로 … 전개와 다항식의 곱이다» — 말이 안 됨",
  "g9-radius-tangent": "«접점을 지나는 수직과 반지름이다» — 말이 안 됨",
};

// 활용 끝을 떼어 낸 줄기 — «커지고» · «커진다»는 둘 다 «커». 오답 말이 정답 말과 줄기가 같으면 같은 뜻을 다른 칸 꼴로 넣을 수 있다.
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

describe("채움 원장 — 230장의 정답 아닌 채움 전부", () => {
  it("원장은 카드 문장을 옮겨 적지 않는다 — 말 · 칸 · 조각 지문만(원래 카드 문장의 사본이 교재 표준 문구와 겹친다)", () => {
    const raw = readFileSync(
      resolve(
        __dirname,
        "../../../docs/reference/concept-terms/card-fillings-audit.json",
      ),
      "utf8",
    );
    expect(raw).not.toMatch(/"text"\s*:/);
    for (const entry of audit.cards)
      for (const piece of definitionCard(entry.id).pieces)
        if (piece.trim().length >= 8)
          expect({ id: entry.id, has: raw.includes(piece.trim()) }).toEqual({
            id: entry.id,
            has: false,
          });
  });

  it("원장 카드 = 230장 전부(보정 · 순서 무관 카드만 보던 때 원장 밖 카드에서 참인 채움이 샜다 · 리드 검토 B)", () => {
    expect(audit.cards.map((card) => card.id).sort()).toEqual(
      definitionCards.map((card) => card.id).sort(),
    );
    for (const id of [...Object.keys(cardFixes), ...orderFreeCards])
      expect(auditOf.has(id)).toBe(true);
  });

  it.each(audit.cards.map((card) => card.id))(
    "%s — 채움 11개가 원장에 읽고 적은 그대로(말 · 조각 지문) · 판정이 있고 · 엔진 채점과 맞물린다",
    (id) => {
      const entry = auditOf.get(id)!;
      const card = definitionCard(id);
      expect(entry.judgedBy).not.toMatch(/^미검토$|^$/);
      // 조각(빈칸 밖 글)이 바뀌면 지문이 달라져 다시 읽게 된다
      expect(entry.piecesSha).toBe(piecesSha(card.pieces));
      expect(
        entry.fillings.map(({ slots, words }) => ({ slots, words })),
      ).toEqual(fillingsOf(id));
      for (const f of entry.fillings) {
        expect({ id, words: f.words, verdict: f.verdict }).toEqual({
          id,
          words: f.words,
          verdict: definitionAssemblyCorrect(card, f.slots)
            ? "순서 무관 정답"
            : "거짓",
        });
        // 맞바꿈에는 까닭을 적는다(참이면 왜 받는지, 거짓이면 왜 틀렸는지)
        if (f.slots[0] === 1 && f.slots[1] === 0)
          expect((f.why ?? "").length).toBeGreaterThan(0);
      }
    },
  );
});

describe("230장 — 조사가 답을 알려 주지 않는다(받침으로 갈리는 조사 · 품사 · 리드 검토 A ⑤ · A2 ③ · B)", () => {
  it("칸마다 문법상 맞는 말이 정답 하나뿐인 칸이 없다 · 순서 무관 카드의 오답이 어느 칸에는 들어간다", () => {
    const found = definitionCards.flatMap((card) =>
      particleGiveaways(card).map((why) => `${card.id} ${why}`),
    );
    expect(found).toEqual([]);
    // 자기 시험 — 고치기 전 전개도(«를 따라»에 모서리만) · 실수(순서 무관 · 오답 «…만»이 «와» · «를»에 안 맞음)
    expect(
      particleGiveaways({
        id: "g6-net",
        pieces: ["각기둥이나 각뿔을 ", "를 따라 잘라 ", " 위에 펼친 그림."],
        words: ["모서리", "평면", "면", "공간"],
      }),
    ).toEqual(["칸 1 — «모서리» 하나"]);
    expect(
      particleGiveaways({
        id: "g9-real-number",
        pieces: ["", "와 ", "를 통틀어 이르는 수."],
        words: ["유리수", "무리수", "자연수만", "정수만"],
      }),
    ).toEqual([
      "칸 1 — 정답 둘만 맞음",
      "칸 2 — 정답 둘만 맞음",
      "순서 무관인데 오답이 두 칸 어디에도 못 들어감",
    ]);
    // 자기 시험 — A2 가 고친 품사 단서 셋(리드 검토 A2 M2): 동사꼴 말은 명사 조사에, «-만»은 «에»에, «-기»는 «하고/한»에 안 맞는다
    expect(
      particleGiveaways({
        id: "g8-simultaneous",
        pieces: [
          "둘 이상의 방정식을 ",
          " 나타낸 것이며, 모든 방정식을 함께 참이 되게 하는 값을 그 ",
          "라고 한다.",
        ],
        words: ["한데 묶어", "해", "따로 버려", "평균"],
      }),
    ).toEqual(["칸 2 — «해» 하나"]);
    expect(
      particleGiveaways({
        id: "g8-substitution",
        pieces: [
          "연립방정식의 한 식에서 구한 미지수의 표현을 ",
          "에 ",
          " 푸는 방법.",
        ],
        words: ["다른 식", "넣어", "같은 식만", "빼서"],
      }),
    ).toEqual(["칸 1 — «다른 식» 하나"]);
    expect(
      particleGiveaways({
        id: "g3-table",
        pieces: ["자료를 기준에 따라 ", "하고 행과 열에 ", "한 것."],
        words: ["분류", "정리", "섞기", "숨기기"],
      }),
    ).toEqual([
      "칸 1 — 정답 둘만 맞음",
      "칸 2 — 정답 둘만 맞음",
      "순서 무관인데 오답이 두 칸 어디에도 못 들어감",
    ]);
    // 분수는 «b분의 a» — 끝소리는 분자(리드 검토 A2 L1): 큰 수의 자릿값은 단서가 아니고, 뿔의 부피 옛 말은 «3»만 «으로»에 맞는다
    expect(
      particleGiveaways({
        id: "g4-large-place",
        pieces: [
          "숫자가 한 자리 왼쪽으로 가면 나타내는 값이 ",
          ", 오른쪽으로 가면 ",
          "이 된다.",
        ],
        words: ["10배", "1/10", "2배", "1/2"],
      }),
    ).toEqual([]);
    expect(
      particleGiveaways({
        id: "g7-pyramid-volume",
        pieces: [
          "같은 밑넓이와 높이를 가진 기둥 부피의 ",
          "이며 밑넓이×높이÷",
          "으로 구한다.",
        ],
        words: ["1/3", "3", "1/2", "2"],
      }),
    ).toEqual(["칸 2 — «3» 하나"]);
    // 서술격 «이다»는 주격 «이»가 아니다 — 받침 없는 명사도 맞는다(리드 검토 A2 L2 · 지어낸 카드)
    expect(
      particleGiveaways({
        id: "l2-predicate",
        pieces: ["두 수의 ", "를 구한 값이 ", "이다."],
        words: ["차", "합", "나머지", "배수"],
      }),
    ).toEqual([]);
    // 읽기를 모르는 말(로마자)은 «맞을 수도 있음» — 정답만 모르는 말이고 나머지가 다 안 맞으면 단서다(리드 검토 A2 L3 · 지어낸 카드)
    expect(
      particleGiveaways({
        id: "l3-unknown",
        pieces: ["점 ", "를 지나는 ", "."],
        words: ["P", "직선", "선분", "원"],
      }),
    ).toEqual(["칸 1 — «P» 하나"]);
    // 관형형(«더한 · 작은»)은 받침이 맞아도 명사 조사에 못 온다 — 정답 «합»만 남는다(리드 검토 A2 M2 · 지어낸 카드)
    expect(
      particleGiveaways({
        id: "m2-adnominal",
        pieces: ["두 수를 ", " 결과를 ", "이라고 한다."],
        words: ["더한", "합", "작은", "큰 수"],
      }),
    ).toEqual(["칸 2 — «합» 하나"]);
    // 리드 검토 B — 230장에 넓히며 더한 규칙의 자기 시험(지어낸 카드)
    // 부사(«똑같이»)는 «로»에 못 온다 — 명사 «수»만 남는다(분수 카드)
    expect(
      particleGiveaways({
        id: "b-adverb",
        pieces: ["", " 나누어 ", "로 적는다."],
        words: ["똑같이", "수", "다르게", "색"],
      }),
    ).toEqual(["칸 2 — «수» 하나"]);
    // 종결형 «-다»는 명사 조사에 못 온다
    expect(
      particleGiveaways({
        id: "b-final",
        pieces: ["두 수의 ", "를 구하면 ", "."],
        words: ["차", "0", "같다", "크다"],
      }),
    ).toEqual(["칸 1 — «차» 하나"]);
    // 한 칸에 정답 둘만 맞으면 그 칸이 정답 둘로 좁혀진다(리드 검토 A2 L7 — 경우의 수 첫 칸)
    expect(
      particleGiveaways({
        id: "b-two-answers",
        pieces: ["", "를 모두 센 ", "."],
        words: ["경우", "개수", "평균", "확률"],
      }),
    ).toEqual(["칸 1 — 정답 둘만 맞음"]);
    // 판단 못 하는 말은 null — 참 · 거짓이 아니다(리드 검토 C T5)
    expect(fitsParticle("P", "를 모두 센 ")).toBeNull();
    // 둘째 정답 자리에 둔 거울(리드 검토 C T5)
    expect(
      particleGiveaways({
        id: "b-two-answers-unknown-2",
        pieces: ["", "를 모두 센 ", "."],
        words: ["개수", "P", "평균", "확률"],
      }),
    ).toEqual(["칸 1 — 정답 둘만 맞음"]);
    // 정답 말을 읽을 수 없어도(로마자 «P») 오답 둘이 안 맞으면 좁혀진다(리드 검토 B4 L5)
    expect(
      particleGiveaways({
        id: "b-two-answers-unknown",
        pieces: ["", "를 모두 센 ", "."],
        words: ["P", "개수", "평균", "확률"],
      }),
    ).toEqual(["칸 1 — 정답 둘만 맞음"]);
    // 글자 분수도 분자로 읽는다(«360도분의 각») — 정답이 제 조사에 안 맞고 오답만 맞던 부채꼴의 넓이
    expect(
      particleGiveaways({
        id: "b-own-particle",
        pieces: ["넓이에 ", "를 ", " 구한다."],
        words: ["각/360°", "곱하여", "360°/각", "더하여"],
      }),
    ).toEqual(["칸 1 — 정답 «각/360°»이 제 조사에 안 맞음"]);
    // 끝 글자만 보면 동사꼴인 명사(«순서»)는 명사로 읽는다(리드 검토 A2 · B L3 — 예외 목록을 지우면 230장에서 거짓 경보)
    expect(
      particleGiveaways({
        id: "b-noun-exception",
        pieces: ["같은 ", "로 ", "."],
        words: ["순서", "모양", "더해", "빼서"],
      }),
    ).toEqual(["칸 1 — «순서» 하나"]);
    // «하다» 칸도 동사꼴(«더해»)은 못 온다 — 정답 둘로 좁혀진다(리드 검토 B L3)
    expect(
      particleGiveaways({
        id: "b-hada-verb",
        pieces: ["", "하고 ", "."],
        words: ["분류", "정리", "더해", "섞기"],
      }),
    ).toEqual(["칸 1 — 정답 둘만 맞음"]);
    // 단위 · 글자 읽기(리드 검토 B L1) — «1kg»은 «킬로그램»(ㅁ)이라 «으로», «1m»는 «미터»라 «로», «n»은 «엔»(ㄴ)
    expect(
      particleGiveaways({
        id: "b-units",
        pieces: ["무게를 ", "으로 나타내면 ", "."],
        words: ["1kg", "1000g", "1m", "1L"],
      }),
    ).toEqual(["칸 1 — 정답 둘만 맞음"]);
    expect(
      particleGiveaways({
        id: "b-letter",
        pieces: ["", "을 곱한 ", "."],
        words: ["n", "수", "a", "x"],
      }),
    ).toEqual(["칸 1 — «n» 하나"]);
    // 주격 «이/가»도 받침으로 가른다(리드 검토 B L3 — 이 줄을 지워도 초록이던 것 · 반복 규칙 옛 말)
    expect(
      particleGiveaways({
        id: "b-subject",
        pieces: ["정해진 ", "이 같은 ", "로 되풀이된다."],
        words: ["묶음", "순서", "합계", "크기"],
      }),
    ).toEqual(["칸 1 — «묶음» 하나"]);
    // 끝 글자로 못 가르는 부사(«반드시»)는 목록으로 — 조사가 안 붙는다(리드 검토 B L3)
    expect(
      particleGiveaways({
        id: "b-adverb-list",
        pieces: ["가능성을 ", "로 나타낸다", "."],
        words: ["1", "반드시", "0", "절대로"],
      }),
    ).toEqual(["칸 1 — «1» 하나"]);
    // 순서 있는 카드도 오답 둘이 두 칸 어디에도 못 들어가면 순서만 묻는다(리드 검토 A2 L2 — 크기가 같은 분수 옛 말)
    expect(
      particleGiveaways({
        id: "b-order-only",
        pieces: ["분모와 분자에 같은 ", "를 곱해도 분수의 ", "는 같다."],
        words: ["0이 아닌 수", "크기", "0", "분모만"],
      }),
    ).toEqual([
      "칸 1 — 정답 둘만 맞음",
      "칸 2 — 정답 둘만 맞음",
      "오답이 두 칸 어디에도 못 들어가 순서만 물음",
    ]);
  });
});

describe("원장의 기계 거름 — «조사 어긋남»으로 적은 채움은 지금 규칙으로도 한 칸이 어긋난다", () => {
  it("까닭에 «조사 어긋남»이 있으면 첫 칸이나 둘째 칸의 말이 제 조사에 안 맞는다(옛 규칙이 잘못 걸러 판정 없이 거짓이 된 81칸 — 리드 검토 B)", () => {
    const wrong = audit.cards.flatMap((entry) => {
      const card = definitionCard(entry.id);
      return entry.fillings
        .filter((f) => (f.why ?? "").includes("조사 어긋남"))
        .filter(
          (f) =>
            fitsParticle(card.words[f.slots[0]]!, card.pieces[1]!) !== false &&
            fitsParticle(card.words[f.slots[1]]!, card.pieces[2]!) !== false,
        )
        .map((f) => `${entry.id} ${f.slots.join(",")}`);
    });
    expect(wrong).toEqual([]);
  });
});

describe("원장의 까닭 — B 가 판정한 카드는 모든 채움에 출처 · 맞바꿈은 늘 3자(리드 검토 B2 M3 · B4 L3)", () => {
  // 출처: 넓은 검사(후보 1398칸) · 고침안 자문 · 옛 거름 오류 다시 판정 · 맞바꿈 · 애매 다시 — 모두 3자. 기계 거름은 지금 규칙으로도 조사가 어긋나는 칸만.
  const THREE_WAY = /B (넓은 검사|고침안|다시 판정|맞바꿈 · 애매 다시) 3자/;
  const MECHANICAL = /조사 어긋남\(기계 (거름|로도)\)/;
  const bCards = audit.cards.filter((card) =>
    card.judgedBy.startsWith("3자(B"),
  );
  it("B 카드는 정확히 180장(넓은 검사 139 + 고침안 41) · 나머지 50장은 A 판 원장(리드 검토 C T3 — 문턱이면 한 장이 머리만 바꿔 빠져도 초록)", () => {
    expect(bCards.length).toBe(180);
    expect(audit.cards.length - bCards.length).toBe(50);
  });
  it("B 카드의 채움은 모두 까닭에 출처(3자 판정 또는 기계 거름)가 있다", () => {
    const bare = bCards.flatMap((card) =>
      card.fillings
        .filter(
          (f) => !THREE_WAY.test(f.why ?? "") && !MECHANICAL.test(f.why ?? ""),
        )
        .map((f) => `${card.id} ${f.slots.join(",")}`),
    );
    expect(bare).toEqual([]);
  });
  it("표와 판정이 맞물린다 — 참 둘 이상인 판정 없음 · 거짓인 맞바꿈은 판정마다 거짓 표가 있음 · 오답 채움은 참+애매 둘 미만(리드 검토 C T4)", () => {
    // 규칙(judgedBy): 둘 이상 참이면 카드 고침 · 참+애매 둘 이상이면 오답으로 고칠 수 있는 한 고침 ·
    // 맞바꿈은 한 판정에서 참 둘 이상이거나 거짓 표가 하나도 없으면 조각을 고침
    const VOTES =
      /claude (참|애매|거짓) · codex (참|애매|거짓) · grok (참|애매|거짓)/g;
    const broken = audit.cards.flatMap((card) =>
      card.fillings.flatMap((f) =>
        [...(f.why ?? "").matchAll(VOTES)]
          .map((m) => m.slice(1))
          .filter((v) => {
            const yes = v.filter((x) => x === "참").length;
            const notFalse = v.filter((x) => x !== "거짓").length;
            const swap = f.slots[0] === 1 && f.slots[1] === 0;
            return (
              yes >= 2 ||
              (swap && f.verdict === "거짓" && notFalse === 3) ||
              (!swap && notFalse >= 2)
            );
          })
          .map((v) => `${card.id} ${f.slots.join(",")} ${v.join("·")}`),
      ),
    );
    expect(broken).toEqual([]);
  });
  it("맞바꿈(1, 0)은 기계 거름만으로 거짓이 되지 않는다 — 늘 3자 출처가 있다", () => {
    const machineOnly = bCards.flatMap((card) =>
      card.fillings
        .filter((f) => f.slots[0] === 1 && f.slots[1] === 0)
        .filter((f) => !THREE_WAY.test(f.why ?? ""))
        .map(() => card.id),
    );
    expect(machineOnly).toEqual([]);
  });
});

describe("230장 기계 검사", () => {
  it("가운데 조각이 대등하게 잇는 꼴이면 순서 무관이거나, 맞바꿈이 거짓이라고 적어 둔 카드다", () => {
    const unexplained = definitionCards
      .filter((card) => symmetricJoin(card.pieces[1]))
      .filter(
        (card) =>
          !orderFreeCards.has(card.id) &&
          !(card.id in JOIN_BUT_ORDERED) &&
          auditOf
            .get(card.id)
            ?.fillings.find((f) => f.slots[0] === 1 && f.slots[1] === 0)
            ?.verdict !== "거짓",
      )
      .map((card) => card.id);
    expect(unexplained).toEqual([]);
    for (const id of Object.keys(JOIN_BUT_ORDERED))
      expect(symmetricJoin(definitionCard(id).pieces[1])).toBe(true);
    // 자기 시험 — 고치기 전 분수의 곱셈 · 피타고라스의 가운데 조각, 자리가 정해진 쉼표 문장
    expect(symmetricJoin(" 곱한 값과 ")).toBe(true);
    expect(symmetricJoin("=")).toBe(true);
    expect(symmetricJoin(", ")).toBe(true);
    expect(symmetricJoin(" 곱한 값을 분자로, ")).toBe(false);
  });

  it("오답 말이 정답 말의 활용형이 아니다 — 같은 뜻을 다른 칸 꼴로 넣으면 맞는 문장이 틀림이 된다(나눗셈과 크기)", () => {
    for (const card of definitionCards) {
      const [a0, a1, ...wrong] = card.words;
      for (const d of wrong)
        expect({
          id: card.id,
          d,
          same: [a0, a1].filter((a) => stem(a) === stem(d)),
        }).toEqual({ id: card.id, d, same: [] });
    }
    // 자기 시험 — 고치기 전 나눗셈과 크기의 말
    expect(stem("작아지고")).toBe(stem("작아진다"));
    expect(stem("커진다")).toBe(stem("커지고"));
  });
});

describe("엔진 채점", () => {
  it("자리 그대로 — 순서 무관이 아닌 카드는 맞바꿔 넣으면 틀림(그래서 원장이 필요하다)", () => {
    const card = definitionCard("g9-axis"); // 조각 활동이 끼지 않는 단원
    expect(orderFreeCards.has(card.id)).toBe(false);
    let state = createExplorerState("student-symmetry", 9);
    const date = "2026-09-28";
    const act = (action: Parameters<typeof applyExplorerAction>[1]) => {
      const result = applyExplorerAction(state, action, date, randomUUID());
      state = result.state;
      return result.feedback;
    };
    act({ type: "start", route: "unit", unitId: card.unit });
    const session = () => state.profile.definitions!.session!;
    for (;;) {
      const s = session();
      if (definitionNeedsRead(state.profile, s)) {
        act({ type: "read", questionId: definitionQuestionId(s) });
        continue;
      }
      const task = s.queue[s.index]!;
      const options = definitionOptions(s, task);
      if (task.cardId === card.id && task.kind === 0) {
        const feedback = act({
          type: "answer",
          questionId: definitionQuestionId(s),
          choiceIds: [options.indexOf(1), options.indexOf(0)],
        });
        expect(feedback.correct).toBe(false);
        expect(session().initialWrong).toContain(card.id);
        return;
      }
      const other = definitionCard(task.cardId);
      const source =
        task.kind === 0
          ? [0, 1]
          : task.kind === 1
            ? other.examples.flatMap((e, i) => (e.yes ? [i] : []))
            : [other.truth ? 1 : 0];
      act({
        type: "answer",
        questionId: definitionQuestionId(s),
        choiceIds: source.map((i) => options.indexOf(i)),
      });
    }
  });
});
