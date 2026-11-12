/** 개념 백지 합치기 — 고정(같은 고르기 = 같은 지면) · 난이도 블록 · 형식별 꼴 · 주소 왕복(D-150). */
import { describe, expect, it } from "vitest";
import type {
  ConceptBlankSelection,
  LevelCounts,
} from "@/contracts/conceptBlank.contract";
import {
  composeSheets,
  orderedSections,
  stockCounts,
  stockTable,
  takeByLevel,
} from "@/lib/concept-blank/compose";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";

const ALL: LevelCounts = { 하: 40, 중: 40, 상: 40 };
const NONE: LevelCounts = { 하: 0, 중: 0, 상: 0 };
const SYM = [
  "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
  "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
  "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
];
const sel = (
  forms: ConceptBlankSelection["forms"],
  sections = SYM,
): ConceptBlankSelection => ({ sections, forms });

describe("composeSheets", () => {
  it("orders sections by the curriculum, not by the click order", () => {
    expect(
      orderedSections(SYM).map((k) => k.split("::")[2]!.slice(0, 5)),
    ).toEqual(["2-3-1", "2-3-3", "2-3-4"]);
  });

  it("is fixed — the same selection gives the same sheets", () => {
    const s = sel([{ form: "term", counts: ALL, extras: ALL }]);
    expect(composeSheets(s, FIXTURE_BANK)).toEqual(
      composeSheets(structuredClone(s), FIXTURE_BANK),
    );
  });

  it("takes 하 then 중 then 상, up to each count", () => {
    const items = [
      { id: "a", level: "상" as const },
      { id: "b", level: "하" as const },
      { id: "c", level: "중" as const },
      { id: "d", level: "하" as const },
    ];
    expect(
      takeByLevel(items, { 하: 1, 중: 1, 상: 1 }).map((x) => x.id),
    ).toEqual(["b", "c", "a"]);
  });

  it("builds each form from the chosen sections only", () => {
    const [recall, term, cloze, map, figure] = composeSheets(
      sel([
        { form: "recall", counts: ALL, extras: NONE },
        { form: "term", counts: ALL, extras: ALL },
        { form: "cloze", counts: { 하: 1, 중: 0, 상: 0 }, extras: NONE },
        { form: "map", counts: ALL, extras: NONE },
        { form: "figure", counts: ALL, extras: NONE },
      ]),
      FIXTURE_BANK,
    );
    expect(
      recall!.form === "recall" && recall!.zones.map((z) => z.side),
    ).toEqual(["예", "그림", "그림"]);
    expect(term!.form === "term" && term!.terms.map((c) => c.id)).toEqual([
      "fx-cong",
      "fx-line",
      "fx-point",
      "fx-line-prop",
    ]);
    expect(term!.form === "term" && term!.ox.map((o) => o.id)).toEqual([
      "fx-ox-line",
    ]);
    expect(
      cloze!.form === "cloze" && cloze!.sentences.map((c) => c.id),
    ).toEqual(["fx-cong"]);
    expect(map!.form === "map" && map!.maps.map((m) => m.hub)).toEqual([
      "합동과 대칭",
    ]);
    expect(
      figure!.form === "figure" && figure!.figures.map((f) => f.id),
    ).toEqual(["fx-fig-line", "fx-fig-point"]);
  });

  it("drops a figure sheet when the chosen sections have no figures", () => {
    const sheets = composeSheets(
      sel(
        [{ form: "figure", counts: ALL, extras: NONE }],
        ["초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기"],
      ),
      FIXTURE_BANK,
    );
    expect(sheets).toEqual([]);
  });

  // 은행 3차 — 소단원마다 10개씩이면 «앞에서부터 n 개»는 첫 소단원만 찍는다. 소단원 차례로 하나씩 돌려 뽑는다(26 §9).
  it("spreads a level count over the chosen sections, one each in turn", () => {
    const item = (id: string, section: string, level: "하" | "중" = "하") => ({
      id,
      section,
      level,
    });
    const items = [
      item("a1", "A"),
      item("a2", "A"),
      item("a3", "A"),
      item("a4", "A"),
      item("b1", "B"),
      item("c1", "C"),
      item("c2", "C"),
      item("a-mid", "A", "중"),
    ];
    // 하 5 → A · B · C · A · C (B 는 하나뿐이라 셋째 바퀴부터 빠진다) — 지면은 소단원 차례 → 은행 차례
    expect(
      takeByLevel(items, { 하: 5, 중: 1, 상: 0 }).map((x) => x.id),
    ).toEqual(["a1", "a2", "b1", "c1", "c2", "a-mid"]);
    // 모자라면 남는 소단원이 마저 채운다
    expect(
      takeByLevel(items, { 하: 7, 중: 0, 상: 0 }).map((x) => x.id),
    ).toEqual(["a1", "a2", "a3", "a4", "b1", "c1", "c2"]);
    // 소단원 하나면 앞에서부터 그대로
    expect(
      takeByLevel(items.slice(0, 4), { 하: 2, 중: 0, 상: 0 }).map((x) => x.id),
    ).toEqual(["a1", "a2"]);
  });

  // 인재원 선생님 2026-11-12 «범위를 넓게 하니까 문제 수를 줄였을 때 뒷 단원 문제는 안 나와요» —
  // 문항 수가 소단원 수보다 적으면 앞 소단원부터 채워 뒤 소단원이 영영 빠졌다. 범위 전체에 고르게 펴고,
  // 난이도마다 자리를 조금씩 비켜 같은 소단원만 거듭 뽑히지 않게 한다(무작위 없이 고정).
  it("spreads a short count over the whole range, not just the first sections", () => {
    const sections = "ABCDEFGHIJ".split("");
    const items = sections.flatMap((s) =>
      (["하", "중", "상"] as const).map((level) => ({
        id: `${s}${level}`,
        section: s,
        level,
      })),
    );
    const picked = takeByLevel(items, { 하: 3, 중: 3, 상: 3 });
    const covered = new Set(picked.map((x) => x.section));
    expect(picked).toHaveLength(9);
    expect(covered.size).toBe(9);
    expect(covered.has("J")).toBe(true);
    expect(takeByLevel(items, { 하: 1, 중: 0, 상: 0 })[0]!.section).not.toBe(
      "A",
    );
    expect(takeByLevel(items, { 하: 3, 중: 3, 상: 3 })).toEqual(picked);
  });

  // 은행 3차로 문항이 열 배 — 나무의 재고는 소단원마다 은행 전체를 훑지 않고 한 번에 센다.
  it("builds the whole stock table in one pass, equal to counting each section", () => {
    const table = stockTable(FIXTURE_BANK);
    const keys = new Set(
      [
        ...FIXTURE_BANK.concepts,
        ...FIXTURE_BANK.ox,
        ...FIXTURE_BANK.apply,
        ...FIXTURE_BANK.figures,
      ].map((x) => x.section),
    );
    expect(keys.size).toBeGreaterThan(1);
    for (const key of keys)
      expect(table.get(key), key).toEqual(stockCounts(key, FIXTURE_BANK));
    expect(table.get("초3::없는::소단원")).toBeUndefined();
  });

  it("counts stock per level for the tree", () => {
    const c = stockCounts(
      "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
      FIXTURE_BANK,
    );
    expect(c.concepts).toEqual({ 하: 1, 중: 0, 상: 1 });
    expect(c.figures).toEqual({ 하: 1, 중: 0, 상: 0 });
    expect(c.total).toBe(4);
  });
});

describe("selection codec", () => {
  it("round-trips Korean section keys through the URL", () => {
    const s = sel([
      {
        form: "cloze",
        counts: { 하: 2, 중: 1, 상: 0 },
        extras: { 하: 1, 중: 0, 상: 0 },
      },
    ]);
    const code = encodeSelection({
      ...s,
      title: "합동과 대칭 백지",
      date: "2026-10-01",
    });
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSelection(code)).toEqual({
      ...s,
      title: "합동과 대칭 백지",
      date: "2026-10-01",
    });
  });

  it("returns null for a broken code", () => {
    expect(decodeSelection("not-a-code")).toBeNull();
    expect(decodeSelection(null)).toBeNull();
  });
});
