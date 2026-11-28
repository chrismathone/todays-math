import { fadingTargets, type FadingConcept } from "@/lib/fading/concepts";
import { fadingTrapMap } from "@/lib/fading/traps";
import { fadingFigureMap } from "@/lib/fading/figures";
import { getConceptBlankBank } from "@/lib/concept-blank/bank/runtime";

export type FadingSample = {
  id: string;
  reason: string;
  targets: number;
  longestSentence: number;
  longestChip: number;
  mathTargets: number;
};
/** 은행 전체에서 계산한다. 개념 id 를 지정해서 고르는 표본은 없다. */
export function selectFadingSamples(all: readonly FadingConcept[]) {
  const rows = all.map((concept) => {
    const targets = fadingTargets(concept);
    const texts = targets.map((t) => t.text.trim().replace(/\s+/g, " "));
    return {
      concept,
      targets: targets.length,
      longestSentence: Math.max(
        ...concept.propositions.map(
          (p) =>
            p.pieces
              .map((piece) =>
                piece.kind === "text" ? piece.text : piece.target.text,
              )
              .join("").length,
        ),
      ),
      longestChip: Math.max(...texts.map((text) => text.length)),
      mathTargets: targets.filter((t) => t.tier === "math").length,
      duplicate: new Set(texts).size < texts.length,
    };
  });
  const max = (
    key: "targets" | "longestSentence" | "longestChip" | "mathTargets",
  ) => rows.reduce((best, row) => (row[key] > best[key] ? row : best));
  const selected: FadingSample[] = [];
  const figures = fadingFigureMap(all, getConceptBlankBank().figures);
  const add = (row: (typeof rows)[number], reason: string) => {
    const previous = selected.find((sample) => sample.id === row.concept.id);
    if (previous) previous.reason += ` · ${reason}`;
    else
      selected.push({
        id: row.concept.id,
        reason,
        targets: row.targets,
        longestSentence: row.longestSentence,
        longestChip: row.longestChip,
        mathTargets: row.mathTargets,
      });
  };
  add(max("targets"), "표적 최다");
  add(max("longestSentence"), "개념 문장 최장");
  add(max("longestChip"), "칩 최장");
  add(max("mathTargets"), "수식 표적 최다");
  const illustrated = rows.filter((row) => figures[row.concept.id]);
  if (illustrated.length)
    add(
      illustrated.reduce((best, row) =>
        figures[row.concept.id]!.tags.length >
        figures[best.concept.id]!.tags.length
          ? row
          : best,
      ),
      "그림 이름표 최다",
    );
  const noFigure = rows.filter((row) => !figures[row.concept.id]);
  if (noFigure.length)
    add(
      noFigure.reduce((best, row) => (row.targets > best.targets ? row : best)),
      "그림 없음",
    );
  const traps = fadingTrapMap(all);
  const withTraps = rows.filter((row) => traps[row.concept.id]?.length);
  if (withTraps.length)
    add(
      withTraps.reduce((best, row) =>
        row.targets > best.targets ? row : best,
      ),
      "추가 칩 있는 표본",
    );
  const repeated = rows.filter((row) => row.duplicate);
  add(
    repeated.reduce((best, row) => (row.targets > best.targets ? row : best)),
    "같은 글 표적",
  );
  add(
    rows.reduce((best, row) => (row.targets < best.targets ? row : best)),
    "표적 최소",
  );
  const ordinary = rows.filter(
    (row) =>
      row.targets >= 5 &&
      row.targets <= 8 &&
      row.concept.propositions.length >= 4,
  );
  for (const fraction of [0.2, 0.5, 0.8])
    add(ordinary[Math.floor((ordinary.length - 1) * fraction)]!, "일반 표본");
  const ids = new Set(selected.map((row) => row.id));
  // 20개 상한의 밀림 장면도 실제 규칙으로 만든다. 보충 개념은 은행 차례다.
  const concepts = [
    ...selected.map((row) => all.find((c) => c.id === row.id)!),
    ...all.filter((c) => !ids.has(c.id)).slice(0, 28),
  ];
  return {
    samples: selected,
    concepts,
    bankSize: all.length,
    traps: fadingTrapMap(concepts),
    figures: fadingFigureMap(concepts, getConceptBlankBank().figures),
  };
}
