import type { FadingTrap } from "./chips";
import { fadingConceptDigest, type FadingConcept } from "./concepts";
import { FADING_TRAPS, type FadingTrapEntry } from "./trapTable";

/**
 * 함정 칩을 내준다 — 함정 표(`trapTable.ts`)에서 (`docs/planning/srs-overhaul-20261006.md` §9-2 · §17).
 *
 * 🔴 **읽을 때의 지문이 지금 내용과 같은 것만** 내준다. 함정은 «그 개념의 어느 빈칸에 넣어도 틀린다»를 사람이 읽어 받은 것이라,
 * 은행의 문장이나 묶음이 바뀌면 그 읽기가 낡는다 — 다시 읽기 전에는 함정 없이 돈다(넣어도 맞는 조각이 함정이 되는 쪽보다 안전하다).
 * 내려가는 것은 글뿐이다 — 어느 문항에서 왔는지 · 왜 틀린지는 채점 전에 싣지 않는다.
 */
type TrapTable = Readonly<Record<string, readonly FadingTrapEntry[]>>;

/** 그 개념의 함정 칩. 표에 없거나 내용이 바뀐 개념이면 비어 있다. */
export function fadingTrapsFor(
  concept: FadingConcept,
  table: TrapTable = FADING_TRAPS,
): FadingTrap[] {
  const entries = table[concept.id];
  if (!entries?.length) return [];
  const digest = fadingConceptDigest(concept);
  return entries
    .filter((entry) => entry.digest === digest)
    .map((entry) => ({ text: entry.text }));
}

/** 개념 여럿의 함정 — 열쇠로. 서버 없이 도는 길(`createLocalFadingSource`)에 그대로 넘긴다. 함정이 없는 개념은 싣지 않는다. */
export function fadingTrapMap(
  concepts: readonly FadingConcept[],
  table: TrapTable = FADING_TRAPS,
): Record<string, FadingTrap[]> {
  const map: Record<string, FadingTrap[]> = {};
  for (const concept of concepts) {
    const traps = fadingTrapsFor(concept, table);
    if (traps.length) map[concept.id] = traps;
  }
  return map;
}
