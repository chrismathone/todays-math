// 문장 조립 «정답이 아닌 모든 채움»의 판정 원장 — docs/reference/concept-terms/card-fillings-audit.json.
// 실행: npx tsx scripts/qa/concept-terms/build-fillings-audit.ts [--check] [--show <카드 id>] [--mechanical [<out.json>]]
//   --mechanical: 지금 조사 · 품사 규칙(`particleFit.ts`)으로 한 칸이 어긋나는 채움 — 기계 거름을 저장소에서 다시 낸다(리드 검토 B M3).
//   🔴 맞바꿈(1, 0)은 거름에서 빼고 늘 3자가 읽는다 — 조사만 어긋나고 뜻이 같은 맞바꿈이 있었다(linear · 영의 곱 · 각기둥).
//
// 조립은 자리 그대로 채점하므로(순서 무관 카드는 맞바꿈도 맞음) 정답이 아닌 채움이 참이면 맞는 문장이 틀림이 된다.
// 뜻은 코드가 못 가리므로 채움마다 사람이 판정을 적는다(3자 합의 · 까닭). 이 스크립트는 판정을 짓지 않는다 —
// 지금 카드(보정을 입은 `definitionCards`)로 채움(칸 · 말)을 다시 뽑아, 같은 채움의 판정만 옮기고 새로 생기거나 바뀐 채움은
// «미검토»로 넣는다. 시험(`conceptSentenceSymmetry.test.ts`)은 «미검토»가 하나라도 있거나 원장이 지금 카드와 다르면 빨개진다.
// 🔴 원장은 카드 문장을 옮겨 적지 않는다 — 말 두 개와 조각 지문(`piecesSha`, 빈칸 밖 글의 해시)만. 원래 카드 문장의 사본이 교재
// 표준 문구와 겹쳤다(2026-09-28 elem56 검사기 · 밀기 카드). 조각이 바뀌면 지문이 달라져 그 카드의 채움이 모두 «미검토»가 된다.
// 사람이 읽을 문장은 `--show <카드 id>` 로 그때그때 짓는다.
// 범위: 230장 전부 — scope 칸에 보정(`conceptSentenceFixes.ts`) · 순서 무관(`conceptOrderFree.ts`) · 원본을 적는다.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { orderFreeCards } from "../../../src/lib/math-explorers/conceptOrderFree";
import { cardFixes } from "../../../src/lib/math-explorers/conceptSentenceFixes";
import {
  definitionCard,
  definitionCards,
} from "../../../src/lib/math-explorers/definition-cards";
import { fitsParticle } from "./particleFit";

type Filling = {
  slots: [number, number];
  words?: [string, string];
  verdict: string;
  why?: string;
  text?: string;
};
type AuditCard = {
  id: string;
  name: string;
  scope: string[];
  judgedBy: string;
  piecesSha?: string;
  fillings: Filling[];
};
type Audit = {
  generatedBy: string;
  rule: string;
  verdicts: Record<string, string>;
  cards: AuditCard[];
};

const OUT = resolve(
  __dirname,
  "../../../docs/reference/concept-terms/card-fillings-audit.json",
);
const UNREVIEWED = "미검토";
const piecesSha = (pieces: readonly string[]) =>
  createHash("sha256")
    .update(JSON.stringify(pieces), "utf8")
    .digest("hex")
    .slice(0, 16);

/** 정답(0, 1)을 뺀 순서 있는 채움 11개 — 첫 칸 i, 둘째 칸 j. `text` 는 옛 원장(문장을 적던 판)과 맞대는 데 · `--show` 에만 쓴다. */
function fillingsOf(id: string) {
  const card = definitionCard(id);
  const out: {
    slots: [number, number];
    words: [string, string];
    text: string;
  }[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      if (i === j || (i === 0 && j === 1)) continue;
      out.push({
        slots: [i, j],
        words: [card.words[i]!, card.words[j]!],
        text: `${card.pieces[0]}[${card.words[i]}]${card.pieces[1]}[${card.words[j]}]${card.pieces[2]}`,
      });
    }
  return out;
}

const mechanicalAt = process.argv.indexOf("--mechanical");
if (mechanicalAt > 0) {
  const rows = definitionCards.flatMap((card) =>
    fillingsOf(card.id)
      .filter(({ slots }) => !(slots[0] === 1 && slots[1] === 0))
      .filter(
        ({ slots }) =>
          fitsParticle(card.words[slots[0]]!, card.pieces[1]!) === false ||
          fitsParticle(card.words[slots[1]]!, card.pieces[2]!) === false,
      )
      .map(({ slots, words }) => ({ id: card.id, slots, words })),
  );
  const out = process.argv[mechanicalAt + 1];
  if (out && !out.startsWith("--"))
    writeFileSync(out, JSON.stringify(rows, null, 1), "utf8");
  console.log(
    `기계 거름(맞바꿈 뺌) ${rows.length}칸 · 카드 ${new Set(rows.map((r) => r.id)).size}장`,
  );
  process.exit(0);
}

const showAt = process.argv.indexOf("--show");
if (showAt > 0) {
  const id = process.argv[showAt + 1]!;
  const saved: Audit = JSON.parse(readFileSync(OUT, "utf8"));
  const entry = saved.cards.find((card) => card.id === id);
  const sha = piecesSha(definitionCard(id).pieces);
  for (const f of fillingsOf(id)) {
    const v = entry?.fillings.find(
      (x) => JSON.stringify(x.slots) === JSON.stringify(f.slots),
    );
    // 칸 번호만 같고 조각 · 말이 바뀐 판정은 지금 채움의 판정이 아니다(리드 검토 A2 L5)
    const stale =
      v !== undefined &&
      (entry!.piecesSha !== sha ||
        JSON.stringify(v.words) !== JSON.stringify(f.words));
    console.log(
      `${f.slots.join(",")} ${f.text} — ${
        !v ? "원장에 없음" : stale ? `${UNREVIEWED}(원장과 다름)` : v.verdict
      }${v?.why && !stale ? ` (${v.why})` : ""}`,
    );
  }
  process.exit(0);
}

const old: Audit | null = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : null;
const oldCards = new Map((old?.cards ?? []).map((card) => [card.id, card]));
// 범위: 230장 전부(리드 검토 B — 보정 · 순서 무관 카드만 보던 때 원장 밖 카드에서 참인 채움이 샜다)
const ids = definitionCards.map((card) => card.id);
const cards: AuditCard[] = ids.map((id) => {
  const card = definitionCard(id);
  const sha = piecesSha(card.pieces);
  const before = oldCards.get(id);
  const fillings = fillingsOf(id).map(({ slots, words, text }) => {
    const prev = before?.fillings.find(
      (f) => JSON.stringify(f.slots) === JSON.stringify(slots),
    );
    // 같은 채움: 옛 판(문장을 적던 원장)은 문장이 같을 때, 새 판은 조각 지문과 말이 같을 때
    const same =
      prev !== undefined &&
      (prev.text !== undefined
        ? prev.text === text
        : before!.piecesSha === sha &&
          JSON.stringify(prev.words) === JSON.stringify(words));
    return same
      ? {
          slots,
          words,
          verdict: prev.verdict,
          ...(prev.why ? { why: prev.why } : {}),
        }
      : { slots, words, verdict: UNREVIEWED };
  });
  const unchanged =
    before !== undefined && fillings.every((f) => f.verdict !== UNREVIEWED);
  return {
    id,
    name: card.name,
    scope:
      id in cardFixes || orderFreeCards.has(id)
        ? [
            ...(id in cardFixes ? ["보정"] : []),
            ...(orderFreeCards.has(id) ? ["순서 무관"] : []),
          ]
        : ["원본"],
    judgedBy: unchanged ? before.judgedBy : UNREVIEWED,
    piecesSha: sha,
    fillings,
  };
});
const doc: Audit = {
  generatedBy: "scripts/qa/concept-terms/build-fillings-audit.ts",
  rule:
    "문장 조립 채움(첫 칸 · 둘째 칸의 말 조각)마다 참인 문장이 되는가. 정답(0, 1) 말고는 모두 «거짓»이어야 하고, " +
    "순서 무관 카드의 맞바꿈(1, 0)만 «순서 무관 정답»이다(엔진이 맞음으로 친다). 새로 생기거나 바뀐 채움은 «미검토» — 읽고 판정을 적는다. " +
    "카드 문장은 옮겨 적지 않는다(말 · 칸 · 조각 지문만) — 문장은 `build-fillings-audit.ts --show <카드 id>` 로 짓는다. " +
    "판정 기준(리드 검토 B3 L5): 채움이 전칭 성질문이면 반례가 하나라도 있으면 거짓, 그 학년의 정의역 전체에서 참이면 참(결함 — 카드를 고친다) · " +
    "조사가 어긋나도 뜻으로 읽는다 · 겹치는 일부 대상에 들어맞을 뿐이면 거짓 · 짝 개념(다른 카드의 뜻)은 결함 아님.",
  verdicts: {
    거짓: "수학적으로 틀리거나 말이 안 된다 — 틀림으로 쳐도 된다",
    "순서 무관 정답":
      "맞바꿔도 조사까지 맞고 뜻이 같다 — 엔진이 맞음으로 친다(conceptOrderFree.ts)",
    [UNREVIEWED]: "아직 아무도 안 읽었다 — 시험이 빨개진다",
  },
  cards,
};
const out = JSON.stringify(doc, null, 1) + "\n";
const unreviewed = cards.flatMap((card) =>
  card.fillings
    .filter((f) => f.verdict === UNREVIEWED)
    .map(
      (f) => `${card.id} ${f.slots.join(",")} ${(f.words ?? []).join(" · ")}`,
    ),
);
if (process.argv.includes("--check")) {
  const same =
    existsSync(OUT) && readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") === out;
  console.log(
    same ? "같음" : "다름",
    `· 카드 ${cards.length} · 미검토 ${unreviewed.length}`,
  );
  process.exit(same && !unreviewed.length ? 0 : 1);
}
writeFileSync(OUT, out, "utf8");
console.log(
  `카드 ${cards.length} · 채움 ${cards.length * 11} · 미검토 ${unreviewed.length}`,
);
for (const line of unreviewed.slice(0, 20)) console.log("  ", line);
