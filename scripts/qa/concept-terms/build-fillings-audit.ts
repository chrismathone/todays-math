// 문장 조립 «정답이 아닌 모든 채움»의 판정 원장 — docs/reference/concept-terms/card-fillings-audit.json.
// 실행: npx tsx scripts/qa/concept-terms/build-fillings-audit.ts [--check]
//
// 조립은 자리 그대로 채점하므로(순서 무관 카드는 맞바꿈도 맞음) 정답이 아닌 채움이 참이면 맞는 문장이 틀림이 된다.
// 뜻은 코드가 못 가리므로 채움마다 사람이 판정을 적는다(3자 합의 · 까닭). 이 스크립트는 판정을 짓지 않는다 —
// 지금 카드(보정을 입은 `definitionCards`)로 채움 글을 다시 뽑아, 글이 같은 채움의 판정만 옮기고 새로 생기거나 바뀐 채움은
// «미검토»로 넣는다. 시험(`conceptSentenceSymmetry.test.ts`)은 «미검토»가 하나라도 있거나 원장 글이 지금 카드와 다르면 빨개진다.
// 범위: 보정 카드(`conceptSentenceFixes.ts`) + 순서 무관 카드(`conceptOrderFree.ts`).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { orderFreeCards } from "../../../src/lib/math-explorers/conceptOrderFree";
import { cardFixes } from "../../../src/lib/math-explorers/conceptSentenceFixes";
import { definitionCard } from "../../../src/lib/math-explorers/definition-cards";

type Filling = {
  slots: [number, number];
  text: string;
  verdict: string;
  why?: string;
};
type AuditCard = {
  id: string;
  name: string;
  scope: string[];
  judgedBy: string;
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

/** 정답(0, 1)을 뺀 순서 있는 채움 11개 — 첫 칸 i, 둘째 칸 j. */
function fillingsOf(id: string) {
  const card = definitionCard(id);
  const out: { slots: [number, number]; text: string }[] = [];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      if (i === j || (i === 0 && j === 1)) continue;
      out.push({
        slots: [i, j],
        text: `${card.pieces[0]}[${card.words[i]}]${card.pieces[1]}[${card.words[j]}]${card.pieces[2]}`,
      });
    }
  return out;
}

const old: Audit | null = existsSync(OUT)
  ? JSON.parse(readFileSync(OUT, "utf8"))
  : null;
const oldCards = new Map((old?.cards ?? []).map((card) => [card.id, card]));
const ids = [...new Set([...Object.keys(cardFixes), ...orderFreeCards])];
const cards: AuditCard[] = ids.map((id) => {
  const before = oldCards.get(id);
  const kept = new Map((before?.fillings ?? []).map((f) => [f.text, f]));
  const fillings = fillingsOf(id).map((f) => {
    const prev = kept.get(f.text);
    return prev && JSON.stringify(prev.slots) === JSON.stringify(f.slots)
      ? { ...f, verdict: prev.verdict, ...(prev.why ? { why: prev.why } : {}) }
      : { ...f, verdict: UNREVIEWED };
  });
  const unchanged = before && fillings.every((f) => f.verdict !== UNREVIEWED);
  return {
    id,
    name: definitionCard(id).name,
    scope: [
      ...(id in cardFixes ? ["보정"] : []),
      ...(orderFreeCards.has(id) ? ["순서 무관"] : []),
    ],
    judgedBy: unchanged ? before!.judgedBy : UNREVIEWED,
    fillings,
  };
});
const doc: Audit = {
  generatedBy: "scripts/qa/concept-terms/build-fillings-audit.ts",
  rule:
    "문장 조립 채움(첫 칸 · 둘째 칸의 말 조각)마다 참인 문장이 되는가. 정답(0, 1) 말고는 모두 «거짓»이어야 하고, " +
    "순서 무관 카드의 맞바꿈(1, 0)만 «순서 무관 정답»이다(엔진이 맞음으로 친다). 새로 생기거나 바뀐 채움은 «미검토» — 읽고 판정을 적는다.",
  verdicts: {
    거짓: "수학적으로 틀리거나 말이 안 된다 — 틀림으로 쳐도 된다",
    "순서 무관 정답":
      "맞바꿔도 조사까지 맞고 뜻이 같다 — 엔진이 맞음으로 친다(conceptOrderFree.ts)",
    [UNREVIEWED]: "아직 아무도 안 읽었다 — 시험이 빨개진다",
  },
  cards,
};
const text = JSON.stringify(doc, null, 1) + "\n";
const unreviewed = cards.flatMap((card) =>
  card.fillings
    .filter((f) => f.verdict === UNREVIEWED)
    .map((f) => `${card.id} ${f.text}`),
);
if (process.argv.includes("--check")) {
  const same =
    existsSync(OUT) &&
    readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") === text;
  console.log(
    same ? "같음" : "다름",
    `· 카드 ${cards.length} · 미검토 ${unreviewed.length}`,
  );
  process.exit(same && !unreviewed.length ? 0 : 1);
}
writeFileSync(OUT, text, "utf8");
console.log(
  `카드 ${cards.length} · 채움 ${cards.length * 11} · 미검토 ${unreviewed.length}`,
);
for (const line of unreviewed.slice(0, 20)) console.log("  ", line);
