// «오늘의 기억» — 함정 표(`trapTable.ts`)와 은행의 짝, 그리고 함정을 내주는 함수(`traps.ts`).
import { describe, expect, it } from "vitest";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { chipFits, chipTray } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingConceptDigest,
  fadingTargets,
  proposeFadingGroups,
  type FadingConcept,
} from "@/lib/fading/concepts";
import { erasedTargets } from "@/lib/fading/erasure";
import { FADING_GROUPS } from "@/lib/fading/groups";
import { FADING_TRAPS } from "@/lib/fading/trapTable";
import { fadingTrapMap, fadingTrapsFor } from "@/lib/fading/traps";

const normalized = (text: string) => text.trim().replace(/\s+/g, " ");

describe("함정 표 — 은행 전체", () => {
  const concepts = new Map(
    buildFadingConcepts(CONCEPT_BLANK_BANK.concepts, FADING_GROUPS).map((c) => [
      c.id,
      c,
    ]),
  );
  const ox = new Map(CONCEPT_BLANK_BANK.ox.map((o) => [o.id, o]));
  const rows = Object.entries(FADING_TRAPS).flatMap(([id, list]) =>
    list.map((entry) => ({ id, entry })),
  );

  it("표가 비어 있지 않고, 줄마다 은행에 있는 개념과 ○× 거짓 문항을 가리킨다", () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const { id, entry } of rows) {
      const concept = concepts.get(id);
      expect(concept, id).toBeDefined();
      const source = ox.get(entry.ox);
      expect(source, entry.ox).toBeDefined();
      expect(source!.answer, entry.ox).toBe(false);
      expect(source!.section, entry.ox).toBe(concept!.section);
    }
  });

  it("읽을 때의 지문이 지금 내용과 같다 — 다르면 은행의 문장이나 묶음이 바뀐 것이라 다시 읽어야 한다", () => {
    const stale = rows
      .filter(
        ({ id, entry }) =>
          fadingConceptDigest(concepts.get(id)!) !== entry.digest,
      )
      .map(({ id, entry }) => `${id}|${entry.text}`);
    // 울면: `npx tsx scripts/qa/fading-traps/authored.ts --list` 로 그 개념을 다시 읽고 판정을 확인한 뒤 `--write`.
    expect(stale).toEqual([]);
  });

  it("함정의 글은 그 ○× 문항이 뜻 문장과 다른 바로 그 자리의 낱말이다", () => {
    for (const { id, entry } of rows) {
      const concept = concepts.get(id)!;
      const statement = ox.get(entry.ox)!.statement;
      const derived = concept.propositions.some((p) =>
        p.pieces.some(
          (piece, index) =>
            piece.kind === "target" &&
            p.pieces
              .map((x, i) =>
                i === index
                  ? entry.text
                  : x.kind === "text"
                    ? x.text
                    : x.target.text,
              )
              .join("")
              .replace(/\s+/g, " ") === statement.replace(/\s+/g, " "),
        ),
      );
      expect(derived, `${id}|${entry.text}`).toBe(true);
    }
  });

  it("함정은 그 개념의 어느 빈칸의 답과도 글이 다르고, 어느 단계의 어느 빈칸에 넣어도 틀린다", () => {
    for (const { id, entry } of rows) {
      const concept = concepts.get(id)!;
      const answers = fadingTargets(concept).map((t) => normalized(t.text));
      expect(answers, id).not.toContain(normalized(entry.text));
      for (const step of [2, 3, 4] as const) {
        const erased = erasedTargets(concept, step);
        const tray = chipTray(concept, step, {
          seed: 1,
          traps: fadingTrapsFor(concept),
        });
        const trap = tray.find(
          (chip) => normalized(chip.text) === normalized(entry.text),
        );
        expect(trap, `${id} ${step}단계`).toBeDefined();
        expect(tray.length, `${id} ${step}단계`).toBeGreaterThan(
          new Set(erased.map((t) => normalized(t.text))).size,
        );
        for (const target of fadingTargets(concept))
          expect(chipFits(concept, target.id, trap!)).toBe(false);
      }
    }
  });

  it("한 개념에 같은 글의 함정이 둘 있지 않다", () => {
    for (const [id, list] of Object.entries(FADING_TRAPS))
      expect(new Set(list.map((e) => normalized(e.text))).size, id).toBe(
        list.length,
      );
  });
});

describe("함정을 내주는 함수", () => {
  const entries = [
    "외심은 세 변의 {수직이등분선}이 만나는 점이다.",
    "직각삼각형의 외심은 {빗변}의 {중점}이다.",
    "외접원의 반지름의 길이는 {$R$}이다.",
  ].map((definition, i): ConceptEntry => ({
    id: `a${i + 1}`,
    section: "중2::4. 삼각형의 성질::삼각형의 외심",
    term: `용어 ${i + 1}`,
    kind: "정의",
    level: "하",
    definition,
  }));
  const [A] = buildFadingConcepts(entries, proposeFadingGroups(entries)) as [
    FadingConcept,
  ];
  const table = {
    [A.id]: [
      { text: "내심", ox: "o1", digest: fadingConceptDigest(A) },
      { text: "무게중심", ox: "o2", digest: "00000000" },
    ],
  };

  it("읽을 때의 지문이 지금 내용과 같은 것만 내준다 — 글뿐이다(어디서 왔는지 · 왜 틀린지는 싣지 않는다)", () => {
    expect(fadingTrapsFor(A, table)).toEqual([{ text: "내심" }]);
  });

  it("문장이 바뀐 개념 · 표에 없는 개념은 함정이 없다", () => {
    const edited: FadingConcept = {
      ...A,
      propositions: A.propositions.slice(0, 2),
    };
    expect(fadingTrapsFor(edited, table)).toEqual([]);
    expect(fadingTrapsFor({ ...A, id: "other" }, table)).toEqual([]);
  });

  it("개념 여럿의 함정을 열쇠로 모은다 — 함정이 없는 개념은 싣지 않는다", () => {
    const other: FadingConcept = { ...A, id: "other" };
    expect(fadingTrapMap([A, other], table)).toEqual({
      [A.id]: [{ text: "내심" }],
    });
    expect(fadingTrapMap([other], table)).toEqual({});
  });

  it("표를 안 주면 제품의 표를 본다", () => {
    const real = buildFadingConcepts(
      CONCEPT_BLANK_BANK.concepts,
      FADING_GROUPS,
    );
    const map = fadingTrapMap(real);
    expect(Object.keys(map).sort()).toEqual(Object.keys(FADING_TRAPS).sort());
  });
});
