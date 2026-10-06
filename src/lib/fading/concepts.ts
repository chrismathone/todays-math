import {
  CONCEPT_BLANK_LEVELS,
  splitBlankSentence,
  type ConceptBlankLevel,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import type { ConceptKind } from "@/lib/math-explorers/conceptKinds";
import { fnv1a } from "./random";

/**
 * «오늘의 기억»의 개념 — 개념 백지 은행의 뜻 문장을 묶은 것(`docs/planning/srs-overhaul-20261006.md` §7 · §13).
 *
 * 은행은 소단원마다 뜻 문장이 9 ~ 30개라 그대로는 한 번에 외울 단위가 아니다. 소단원 × 난이도 안에서 **다섯 이하씩** 묶은 것 하나가
 * 복습이 예약되는 «개념»이다. 은행은 건드리지 않는다 — 문장을 읽기만 한다.
 * 🔴 **묶음은 규칙이 아니라 얼려 둔 표가 정한다**(`groups/` — codex 합의 2026-10-06). 규칙으로만 묶으면 은행에 문장이 하나 들고 날 때마다
 * 그 칸의 묶음이 통째로 달라져, 학생 기록이 다른 내용을 가리키게 된다. 표의 열쇠는 한 번 정하면 그 묶음의 문장이 바뀌어도 그대로다.
 * 규칙(`proposeFadingGroups`)은 표를 처음 만들 때와 새 문장의 자리를 정할 때만 쓴다(`scripts/qa/fading-grouping/sync.ts`).
 * 은행 파일을 부르지 않는다(화면 번들이 은행 전체를 싣지 않게) — 받은 문장으로만 일한다.
 */

export const FADING_MAX_PROPOSITIONS = 5;

/** 표적의 등급 — 수식이 든 핵심어(`$…$`)는 3단계부터 지운다. */
export type FadingTier = "text" | "math";

/** 지울 수 있는 자리 하나. `id` 는 «명제 id#몇째»(1부터). */
export type FadingTarget = { id: string; text: string; tier: FadingTier };

export type FadingPiece =
  { kind: "text"; text: string } | { kind: "target"; target: FadingTarget };

/** 명제 — 은행의 뜻 문장 하나. `id` 는 은행의 그 문장 id 그대로다. */
export type FadingProposition = {
  id: string;
  term: string;
  kind: ConceptKind;
  pieces: FadingPiece[];
};

export type FadingConcept = {
  id: string;
  section: string;
  level: ConceptBlankLevel;
  /** 같은 소단원 · 난이도 안에서 몇째 개념인가(1부터)와 모두 몇인가. */
  ordinal: number;
  siblings: number;
  propositions: FadingProposition[];
};

/** 묶음 표 — 개념의 열쇠 → 그 개념의 명제(은행 뜻 문장)의 id 들. 적힌 차례가 곧 개념의 차례다. */
export type FadingGroupTable = Readonly<Record<string, readonly string[]>>;

function proposition(entry: ConceptEntry): FadingProposition {
  let count = 0;
  return {
    id: entry.id,
    term: entry.term,
    kind: entry.kind,
    pieces: splitBlankSentence(entry.definition).map((piece) =>
      piece.kind === "text"
        ? piece
        : {
            kind: "target",
            target: {
              id: `${entry.id}#${++count}`,
              text: piece.text,
              tier: piece.text.includes("$") ? "math" : "text",
            },
          },
    ),
  };
}

function entriesById(entries: readonly ConceptEntry[]) {
  const byId = new Map<string, ConceptEntry>();
  for (const entry of entries) {
    if (byId.has(entry.id))
      throw new Error(`같은 id 의 뜻 문장이 둘입니다: ${entry.id}`);
    byId.set(entry.id, entry);
  }
  return byId;
}

/**
 * 규칙으로 묶은 초안 — 소단원은 처음 나온 차례, 난이도는 하 · 중 · 상, 칸 안은 은행 차례로 다섯 이하씩 고르게.
 * 열쇠는 묶음의 첫 문장 id 다. 🔴 풀이에 쓰는 묶음이 아니다 — 묶음 표를 만들고 고칠 때만 쓴다.
 */
export function proposeFadingGroups(
  entries: readonly ConceptEntry[],
): FadingGroupTable {
  entriesById(entries);
  const sections = new Map<string, Map<ConceptBlankLevel, string[]>>();
  for (const entry of entries) {
    const levels =
      sections.get(entry.section) ??
      sections.set(entry.section, new Map()).get(entry.section)!;
    const cell =
      levels.get(entry.level) ?? levels.set(entry.level, []).get(entry.level)!;
    cell.push(entry.id);
  }
  const groups: Record<string, string[]> = {};
  for (const levels of sections.values())
    for (const level of CONCEPT_BLANK_LEVELS) {
      const cell = levels.get(level) ?? [];
      const count = Math.ceil(cell.length / FADING_MAX_PROPOSITIONS);
      let from = 0;
      for (let nth = 1; nth <= count; nth++) {
        // 고르게 — 6문장은 5 + 1 이 아니라 3 + 3 이다(명제 하나짜리 개념을 만들지 않는다).
        const size =
          Math.floor(cell.length / count) +
          (nth <= cell.length % count ? 1 : 0);
        groups[cell[from]!] = cell.slice(from, from + size);
        from += size;
      }
    }
  return groups;
}

/**
 * 묶음 표대로 개념을 짓는다 — 표에 적힌 차례 그대로.
 * 표가 가리키는 문장이 은행에 없으면 그 문장만 건너뛴다(남은 문장이 없으면 그 개념을 내지 않는다) —
 * 은행과 표가 어긋난 채 배포돼도 학생 화면이 죽지 않게. 어긋남 자체는 시험(`fadingGroups.test.ts`)이 배포 전에 잡는다.
 */
export function buildFadingConcepts(
  entries: readonly ConceptEntry[],
  groups: FadingGroupTable,
): FadingConcept[] {
  const byId = entriesById(entries);
  const concepts: FadingConcept[] = [];
  const cells = new Map<string, FadingConcept[]>();
  for (const [id, memberIds] of Object.entries(groups)) {
    const members = memberIds.flatMap((memberId) => byId.get(memberId) ?? []);
    const first = members[0];
    if (!first) continue;
    const concept: FadingConcept = {
      id,
      section: first.section,
      level: first.level,
      ordinal: 0,
      siblings: 0,
      propositions: members.map(proposition),
    };
    const key = `${first.section}||${first.level}`;
    const cell = cells.get(key) ?? cells.set(key, []).get(key)!;
    cell.push(concept);
    concepts.push(concept);
  }
  for (const cell of cells.values())
    cell.forEach((concept, i) => {
      concept.ordinal = i + 1;
      concept.siblings = cell.length;
    });
  return concepts;
}

/** 개념의 표적 전부 — 읽는 차례. */
export function fadingTargets(concept: FadingConcept): FadingTarget[] {
  return concept.propositions.flatMap((p) =>
    p.pieces.flatMap((piece) =>
      piece.kind === "target" ? [piece.target] : [],
    ),
  );
}

/**
 * 개념 내용의 지문(16진 여덟 자) — 명제의 구성이나 문장이 바뀌면 달라진다.
 * 평가할 때 학생 기록에 같이 적어 두어, 그 뒤에 은행의 문장이 고쳐졌는지 알아볼 수 있게 한다.
 */
export function fadingConceptDigest(concept: FadingConcept): string {
  const content = concept.propositions.map((p) => [
    p.id,
    p.pieces.map((piece) =>
      piece.kind === "text" ? piece.text : `{${piece.target.text}}`,
    ),
  ]);
  return fnv1a(JSON.stringify(content)).toString(16).padStart(8, "0");
}
