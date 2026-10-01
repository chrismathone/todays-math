/**
 * 개념 백지 지면 코드 길이 실측(트랙 cb-code) — 화면의 기본 고르기(켤 수 있는 형식 전부 · 수는 고른 소단원의 재고 전부,
 * 40 에서 자름 — `ConceptBlankView` 와 같은 규칙)로 코드를 묶어 글자 수를 잰다.
 *
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/sheet-code-lengths.ts
 *
 * 표본 — ① 소단원 하나(재고 있는 소단원 전부) ② 소단원 셋(대단원 안 이어진 셋 · 띄엄띄엄 셋) ③ 대단원 하나 통째(전부)
 * ④ 학년을 넘는 열 개(시드 고정 무작위 500 · 학년마다 하나씩 흩어진 것) ⑤ 최악(계약 상한 60 소단원을 하나 건너 하나 ·
 * 형식 다섯 · 수 40 · 형식마다 다른 수) ⑥ 흩어 고른 소단원 수 5 ~ 60 마다 정원을 넘는 몫(«코드 없음»이 되는 고르기).
 */
import {
  CONCEPT_BLANK_FORMS,
  CONCEPT_BLANK_LEVELS,
  type ConceptBlankForm,
  type ConceptBlankSelection,
  type LevelCounts,
} from "../../../src/contracts/conceptBlank.contract";
import { SHEET_CODE_LINE_CAPACITY } from "../../../src/components/concept-blank/paper/paginate";
import { stockCounts } from "../../../src/lib/concept-blank/compose";
import {
  BLANK_TREE,
  CONCEPT_BLANK_GRADES,
} from "../../../src/lib/concept-blank/sections";
import { encodeSheetCode } from "../../../src/lib/concept-blank/sheetCode";
import { encodeSelection } from "../../../src/lib/concept-blank/selectionCodec";

type StockKind = "concepts" | "ox" | "apply" | "figures";
const MAIN: Record<ConceptBlankForm, StockKind> = {
  recall: "concepts",
  term: "concepts",
  cloze: "concepts",
  map: "concepts",
  figure: "figures",
};
const EXTRA: Partial<Record<ConceptBlankForm, StockKind>> = {
  term: "ox",
  cloze: "apply",
};
const ZERO: LevelCounts = { 하: 0, 중: 0, 상: 0 };
const sum = (c: LevelCounts) => c.하 + c.중 + c.상;

const ready = BLANK_TREE.filter((g) =>
  (CONCEPT_BLANK_GRADES as readonly string[]).includes(g.grade),
);
const chapters = ready.flatMap((g) => g.chapters);
const stocked = chapters
  .flatMap((c) => c.sections)
  .filter((s) => stockCounts(s.key).total > 0);

/** 화면의 기본 고르기 — 켤 수 있는 형식 전부, 수는 재고 전부(40 에서 자름). */
function uiDefault(sections: string[]): ConceptBlankSelection {
  const caps = (kind: StockKind): LevelCounts => {
    const out = { ...ZERO };
    for (const key of sections) {
      const stock = stockCounts(key)[kind];
      for (const l of CONCEPT_BLANK_LEVELS) out[l] += stock[l];
    }
    for (const l of CONCEPT_BLANK_LEVELS) out[l] = Math.min(out[l], 40);
    return out;
  };
  const forms = CONCEPT_BLANK_FORMS.flatMap((form) => {
    const counts = caps(MAIN[form]);
    const extras = EXTRA[form] ? caps(EXTRA[form]!) : { ...ZERO };
    return sum(counts) + sum(extras) > 0 ? [{ form, counts, extras }] : [];
  });
  return { sections, forms };
}

const len = (s: ConceptBlankSelection) =>
  encodeSheetCode(s).replace(/\./g, "").length;

function stats(name: string, selections: ConceptBlankSelection[]) {
  const lens = selections.map(len).sort((a, b) => a - b);
  const pick = (q: number) =>
    lens[Math.min(lens.length - 1, Math.floor(q * lens.length))]!;
  const worst = selections.reduce((w, s) => (len(s) > len(w) ? s : w));
  const shown = encodeSheetCode(worst);
  console.log(
    `| ${name} | ${selections.length} | ${lens[0]} | ${pick(0.5)} | ${lens[lens.length - 1]} | \`${shown}\` (${shown.length}) | ${encodeSelection(worst).length} |`,
  );
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

console.log(
  "| 표본 | 수 | 가장 짧음 | 가운데 | 가장 김 | 가장 긴 코드(점 포함 글자 수) | 그때 `?s=` 길이 |",
);
console.log("|---|---|---|---|---|---|---|");

stats(
  "① 소단원 하나",
  stocked.map((s) => uiDefault([s.key])),
);

const runsOf3 = chapters.flatMap((c) => {
  const keys = c.sections
    .map((s) => s.key)
    .filter((k) => stockCounts(k).total > 0);
  return keys.length >= 3
    ? keys.slice(0, keys.length - 2).map((_, i) => keys.slice(i, i + 3))
    : [];
});
stats("② 소단원 셋 — 대단원 안 이어진 셋", runsOf3.map(uiDefault));
const next3 = rng(3);
stats(
  "② 소단원 셋 — 학년 안 띄엄띄엄",
  Array.from({ length: 300 }, () => {
    const g = ready[Math.floor(next3() * ready.length)]!;
    const keys = g.chapters
      .flatMap((c) => c.sections)
      .filter((s) => stockCounts(s.key).total > 0)
      .map((s) => s.key);
    const out = new Set<string>();
    while (out.size < 3) out.add(keys[Math.floor(next3() * keys.length)]!);
    return uiDefault([...out]);
  }),
);

stats(
  "③ 대단원 하나 통째",
  chapters
    .map((c) =>
      c.sections.map((s) => s.key).filter((k) => stockCounts(k).total > 0),
    )
    .filter((keys) => keys.length > 0)
    .map(uiDefault),
);

const next10 = rng(10);
stats(
  "④ 학년을 넘는 열 개 — 무작위",
  Array.from({ length: 500 }, () => {
    const out = new Set<string>();
    while (out.size < 10)
      out.add(stocked[Math.floor(next10() * stocked.length)]!.key);
    return uiDefault([...out]);
  }),
);
stats(
  "④ 학년을 넘는 열 개 — 일곱 학년에 흩어진 열 개",
  Array.from({ length: 200 }, () => {
    const out = new Set<string>();
    let g = 0;
    while (out.size < 10) {
      const keys = ready[g % ready.length]!.chapters.flatMap(
        (c) => c.sections,
      ).filter((s) => stockCounts(s.key).total > 0);
      out.add(keys[Math.floor(next10() * keys.length)]!.key);
      g++;
    }
    return uiDefault([...out]);
  }),
);
stats("④ 학년을 넘는 열 개 — 두 대단원 다섯씩", [
  uiDefault([
    ...chapters[20]!.sections.slice(0, 5).map((s) => s.key),
    ...chapters[60]!.sections.slice(0, 5).map((s) => s.key),
  ]),
]);

const spread = stocked
  .filter((_, i) => i % 2 === 0)
  .slice(0, 60)
  .map((s) => s.key);
const forty = { 하: 40, 중: 40, 상: 40 };
stats("⑤ 최악 — 60 소단원 하나 건너 하나 · 수 40", [
  {
    sections: spread,
    forms: CONCEPT_BLANK_FORMS.map((form, i) => ({
      form,
      counts: { 하: 40 - i, 중: 39 - i, 상: 38 - i },
      extras: EXTRA[form] ? forty : { ...ZERO },
    })),
  },
]);

/* 흩어진 소단원 수에 따라 — 정원(`SHEET_CODE_LINE_CAPACITY`)을 넘는 몫(«코드 없음»이 되는 고르기) */
console.log("");
console.log(
  `| 흩어 고른 소단원 수(재고 있는 것에서 무작위 · 화면 기본 수) | 표본 | 가운데 | 가장 김 | 정원 ${SHEET_CODE_LINE_CAPACITY} 을 넘는 몫 |`,
);
console.log("|---|---|---|---|---|");
const nextK = rng(60);
for (const k of [5, 10, 15, 20, 25, 30, 40, 50, 60]) {
  const lens = Array.from({ length: 200 }, () => {
    const out = new Set<string>();
    while (out.size < k)
      out.add(stocked[Math.floor(nextK() * stocked.length)]!.key);
    return len(uiDefault([...out]));
  }).sort((a, b) => a - b);
  const over = lens.filter((n) => n > SHEET_CODE_LINE_CAPACITY).length;
  console.log(
    `| ${k} | ${lens.length} | ${lens[lens.length >> 1]} | ${lens[lens.length - 1]} | ${Math.round((over / lens.length) * 100)}% |`,
  );
}
