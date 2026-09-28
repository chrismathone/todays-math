/**
 * 문장 조립 «정답이 아닌 채움» 검사 — 조립은 **자리 그대로** 채점한다(첫 칸 = 정답 첫 조각, 둘째 칸 = 정답 둘째 조각). 그래서 정답이
 * 아닌 채움이 참인 문장이면 맞는 답을 틀렸다고 친다(첫 판 점수 · 기억 복습이면 차례가 처음으로). 리드 적대적 검토 ①(2026-09-28)이
 * 분수의 곱셈 맞바꿈을 잡았고, 맞바꿈 검사가 피타고라스를, 넓은 검사가 «나눗셈과 크기»(오답 말이 정답의 활용형)를, 230장 기계
 * 훑기가 원본 카드 16장을 더 잡았다. 두 빈칸이 본디 대등한 카드는 순서 무관 채점(`conceptOrderFree.ts`)으로 받는다.
 *
 * 뜻은 코드가 못 가리므로 채움마다 사람이 판정을 적은 **원장**(`docs/reference/concept-terms/card-fillings-audit.json` — 보정 카드 +
 * 순서 무관 카드, 카드마다 11채움 · 3자 합의 또는 Claude · 한 표 의견은 까닭 칸 · 문장은 옮겨 적지 않고 말 · 조각 지문만)을 둔다. 카드의 문장 · 말이 바뀌면 원장과
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

describe("채움 원장 — 보정 카드 + 순서 무관 카드의 정답 아닌 채움 전부", () => {
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

  it("원장 카드 = 보정 카드 ∪ 순서 무관 카드", () => {
    expect(audit.cards.map((card) => card.id).sort()).toEqual(
      [...new Set([...Object.keys(cardFixes), ...orderFreeCards])].sort(),
    );
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

// 받침으로 갈리는 조사 — [받침 있을 때, 없을 때]. «으로/로»는 ㄹ 받침이면 «로».
const PARTICLES: [string, string][] = [
  ["으로", "로"],
  ["이라고", "라고"],
  ["을", "를"],
  ["이", "가"],
  ["은", "는"],
  ["과", "와"],
];
const DIGIT_BATCHIM: Record<string, number> = {
  "0": 21,
  "1": 8,
  "2": 0,
  "3": 16,
  "4": 0,
  "5": 0,
  "6": 1,
  "7": 8,
  "8": 8,
  "9": 0,
  "°": 0,
  "²": 17,
};
/** 마지막 글자의 받침 번호(0 = 없음, 8 = ㄹ). 읽기가 갈리는 글자(로마자 · 기호)는 null.
 * 분수 a/b 는 «b분의 a»로 읽어 끝소리가 분자다(1/2 → «이분의 일» → ㄹ · 리드 검토 A2 L1). */
const batchim = (word: string): number | null => {
  const fraction = /(\d+)\/\d+$/.exec(word.trim());
  if (fraction) return batchim(fraction[1]!);
  const ch = word.trim().slice(-1);
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28;
  return ch in DIGIT_BATCHIM ? DIGIT_BATCHIM[ch]! : null;
};
// 품사(리드 검토 A2 M2) — 명사 자리에 동사꼴 · 관형형 말이 오면 받침과 상관없이 안 맞는다. 목록은 230장의 말로 맞췄다
// (끝 글자만 보면 동사꼴인 명사: 순서 · 무게 · 해).
const NOUNS_LOOKING_LIKE_VERBS = new Set([
  "순서",
  "숫자 순서",
  "덧셈 순서",
  "무게",
  "해",
]);
const lastSyllable = (word: string) => word.trim().slice(-1);
const isVerbForm = (word: string) => {
  const w = word.trim();
  if (NOUNS_LOOKING_LIKE_VERBS.has(w)) return false;
  const last = lastSyllable(w);
  // 관형형 «-는» · 부사형 «-게» · 연결형 «-고 · -서 · -며»
  if (["는", "게", "고", "서", "며"].includes(last)) return true;
  // 연결형 «-어 · -여»(한 글자 «해»는 명사)
  return (
    w.length >= 2 &&
    ["어", "여", "아", "워", "해", "져", "려", "쳐"].includes(last)
  );
};
// 관형형 «-ㄴ»(더한 · 작은 · 짝수인 …) — 230장에서 이 끝 글자로 끝나는 명사는 없다
const isAdnominal = (word: string) =>
  ["한", "은", "인", "큰", "뺀", "른", "긴", "눈", "된", "진"].includes(
    lastSyllable(word),
  );
const isNounLike = (word: string) => !isVerbForm(word) && !isAdnominal(word);
/** 빈칸 뒤 조각에 그 말이 문법상 맞는가 — «하다» 칸 · 서술격 · «에» · 받침 조사. 판단할 수 없으면 null. */
const fitsParticle = (word: string, after: string): boolean | null => {
  // «하다»가 붙는 칸 — 명사만(«-기» · «-만» 은 «하다»가 안 붙는다)
  if (/^(하고|하여|하며|하면|하는|한 |한$|한다|했|할 )/.test(after))
    return isNounLike(word) && !/[기만]$/.test(word.trim());
  // 서술격 «이다 · 이며 · 이고 · 이면 · 이므로» — 받침과 상관없이 명사면 맞다(리드 검토 A2 L2)
  if (/^이(다|며|고|면|므로|지만)/.test(after)) return isNounLike(word);
  // «에» — 명사만, «-만» 뒤는 어색하다
  if (after.startsWith("에"))
    return isNounLike(word) && !word.trim().endsWith("만");
  for (const [withB, without] of PARTICLES) {
    const used = after.startsWith(withB)
      ? withB
      : after.startsWith(without)
        ? without
        : null;
    if (!used) continue;
    if (!isNounLike(word)) return false;
    const b = batchim(word);
    if (b === null) return null;
    if (withB === "으로")
      return used === "으로" ? b !== 0 && b !== 8 : b === 0 || b === 8;
    return used === withB ? b !== 0 : b === 0;
  }
  return null;
};
/** 조사가 답을 알려 주는 칸 — (칸, 까닭) 목록. */
const particleGiveaways = (card: {
  id: string;
  pieces: string[];
  words: string[];
}) => {
  const out: string[] = [];
  const slotFits = [0, 1].map((slot) =>
    card.words.map((w) => fitsParticle(w, card.pieces[slot + 1]!)),
  );
  // 판단할 수 없는 말(null)은 «맞을 수도 있음»으로 센다 — 칸 전체를 건너뛰면 정답만 모르는 말일 때 단서를 놓친다(리드 검토 A2 L3)
  slotFits.forEach((fits, slot) => {
    const ok = card.words.filter((_, i) => fits[i] !== false);
    if (ok.length === 1 && fits[slot] !== false)
      out.push(`칸 ${slot + 1} — «${ok[0]}» 하나`);
  });
  // 순서 무관 카드: 오답이 어느 칸에도 못 들어가면 조사만으로 정답이 정해진다
  if (
    orderFreeCards.has(card.id) &&
    [2, 3].every((i) => slotFits[0]![i] === false && slotFits[1]![i] === false)
  )
    out.push("순서 무관인데 오답이 두 칸 어디에도 못 들어감");
  return out;
};

describe("원장 카드 — 조사가 답을 알려 주지 않는다(받침으로 갈리는 조사 · 리드 검토 A ⑤ · A2 ③)", () => {
  it("칸마다 문법상 맞는 말이 정답 하나뿐인 칸이 없다 · 순서 무관 카드의 오답이 어느 칸에는 들어간다", () => {
    const found = audit.cards.flatMap((entry) =>
      particleGiveaways(definitionCard(entry.id)).map(
        (why) => `${entry.id} ${why}`,
      ),
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
    ).toEqual(["순서 무관인데 오답이 두 칸 어디에도 못 들어감"]);
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
    ).toEqual(["순서 무관인데 오답이 두 칸 어디에도 못 들어감"]);
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
