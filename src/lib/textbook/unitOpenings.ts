import { sectionKeyOf, sectionTitleTex } from "@/lib/concept-blank/sections";
import source from "./scripts/unit-openings.json";

export type UnitOpeningCheckKind = "already-known" | "question";

/** One catalogue section of a chapter, with the goal written for it and the bank cards it rests on. */
export type UnitOpeningSection = Readonly<{
  /** `e3-1-1-1` · `m2-01-01` — the core concept IDs of the section without `-cN`. */
  id: string;
  /** `학년::대단원::소단원`, the catalogue key. */
  key: string;
  /** The seed section name, unchanged. */
  title: string;
  goal: string;
  conceptIds: readonly string[];
  /** sha256 of the section's core bank cards; see `source.sectionHash` in the JSON. */
  sourceHash: string;
}>;

/** Who wrote and who read the opening. No opening has been read by a person. */
export type UnitOpeningProvenance = Readonly<{
  origin: "bank-derived";
  bankFile: string;
  scriptFile: string;
  /** sha256 over the chapter's section hashes, in catalogue order. */
  sourceHash: string;
  editor: string;
  reviewer: string;
  status: "AI 검수";
  humanReview: false;
  reviewedOn: string;
}>;

/** The static opening of one curriculum chapter. */
export type UnitOpening = Readonly<{
  /** `e3-1-1` · `m2-01` */
  id: string;
  grade: string;
  semester: 1 | 2;
  /** The seed chapter name, `1-1 덧셈과 뺄셈` · `1. 수와 식`. */
  chapter: string;
  /** The chapter name without its number. */
  title: string;
  question: string;
  explanation: string;
  keyPhrase: string;
  /** What the student already knows, and the question the student wants answered. Nothing else. */
  check: readonly Readonly<{ kind: UnitOpeningCheckKind; text: string }>[];
  sections: readonly UnitOpeningSection[];
  provenance: UnitOpeningProvenance;
}>;

/** A chapter opening cut to the sections a book contains. Field names follow the `unitIntro` node. */
export type UnitOpeningSelection = Readonly<{
  id: string;
  grade: string;
  semester: 1 | 2;
  chapter: string;
  title: string;
  question: string;
  explanation: string;
  keyPhrase: string;
  /** One goal per selected section, in catalogue order. */
  goals: readonly string[];
  /** The selected section names in catalogue order, with units written as TeX. */
  path: readonly string[];
  check: readonly string[];
  sections: readonly UnitOpeningSection[];
  /** Every section of the chapter is selected. */
  complete: boolean;
  /** Requested sections that this chapter does not have. */
  unmatched: readonly string[];
  provenance: UnitOpeningProvenance &
    Readonly<{
      /** Core bank concept IDs of the selected sections only. */
      sourceConceptIds: readonly string[];
      /** Section hashes of the selected sections only. */
      sourceHashes: readonly string[];
    }>;
}>;

/** A selected section: its ID, its catalogue key, or the row a book stores. */
export type UnitOpeningSectionRef =
  string | Readonly<{ grade: string; chapter: string; section: string }>;

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

/** Committed, AI-written and AI-read text. Nothing is authored, derived from the bank or generated at runtime. */
const openings = deepFreeze(source.openings as unknown as UnitOpening[]);
const byId = new Map(openings.map((opening) => [opening.id, opening]));
const byChapter = new Map(
  openings.map((opening) => [`${opening.grade}::${opening.chapter}`, opening]),
);
const bySection = new Map<string, UnitOpening>();
for (const opening of openings)
  for (const section of opening.sections) {
    if (bySection.has(section.id) || bySection.has(section.key))
      throw new Error("단원 도입의 소단원 열쇠가 중복되었습니다.");
    bySection.set(section.id, opening);
    bySection.set(section.key, opening);
  }
if (byId.size !== openings.length || byChapter.size !== openings.length)
  throw new Error("단원 도입의 대단원 열쇠가 중복되었습니다.");

/** The original v15 unit openings and why they are not used. */
export const UNIT_OPENING_REFERENCE = deepFreeze(source.reference);
/** How the openings were written and read, and how many sentences are new. */
export const UNIT_OPENING_REVIEW = deepFreeze(source.review);

/** All 72 chapter openings in catalogue order. Frozen. */
export const unitOpenings = (): readonly UnitOpening[] => openings;

export const unitOpeningById = (id: string): UnitOpening | undefined =>
  byId.get(id);

/** The opening of a chapter, or `undefined` for a grade or chapter that has none (초1~2, 고등). */
export const unitOpeningFor = (
  grade: string,
  chapter: string,
): UnitOpening | undefined => byChapter.get(`${grade}::${chapter}`);

function cut(
  opening: UnitOpening,
  sections?: readonly string[],
): UnitOpeningSelection {
  const wanted = sections && new Set(sections);
  const selected = wanted
    ? opening.sections.filter(
        (section) =>
          wanted.has(section.id) ||
          wanted.has(section.key) ||
          wanted.has(section.title),
      )
    : opening.sections;
  const known = new Set(
    opening.sections.flatMap((section) => [
      section.id,
      section.key,
      section.title,
    ]),
  );
  return deepFreeze({
    id: opening.id,
    grade: opening.grade,
    semester: opening.semester,
    chapter: opening.chapter,
    title: opening.title,
    question: opening.question,
    explanation: opening.explanation,
    keyPhrase: opening.keyPhrase,
    goals: selected.map((section) => section.goal),
    path: selected.map((section) => sectionTitleTex(section.title)),
    check: opening.check.map((prompt) => prompt.text),
    sections: [...selected],
    complete: selected.length === opening.sections.length,
    unmatched: wanted ? [...wanted].filter((name) => !known.has(name)) : [],
    provenance: {
      ...opening.provenance,
      sourceConceptIds: selected.flatMap((section) => section.conceptIds),
      sourceHashes: selected.map((section) => section.sourceHash),
    },
  });
}

/**
 * The chapter's opening with goals and path cut to the given sections. A section is named
 * by its ID, its catalogue key or its seed name; order and repeats in the request do not
 * matter, the result follows the catalogue. Without `sections` the whole chapter is selected.
 * Names the chapter does not have are returned in `unmatched` and appear nowhere else.
 */
export function selectUnitOpening(
  grade: string,
  chapter: string,
  sections?: readonly string[],
): UnitOpeningSelection | undefined {
  const opening = unitOpeningFor(grade, chapter);
  return opening && cut(opening, sections);
}

/**
 * The openings of every chapter a book touches, in catalogue order, each cut to the
 * book's sections. Sections without an opening are returned in `unmatched`.
 */
export function selectUnitOpenings(units: readonly UnitOpeningSectionRef[]): {
  openings: readonly UnitOpeningSelection[];
  unmatched: readonly string[];
} {
  const chosen = new Map<UnitOpening, string[]>();
  const unmatched: string[] = [];
  for (const unit of units) {
    const name =
      typeof unit === "string"
        ? unit
        : sectionKeyOf(unit.grade, unit.chapter, unit.section);
    const opening = bySection.get(name);
    if (!opening) unmatched.push(name);
    else chosen.set(opening, [...(chosen.get(opening) ?? []), name]);
  }
  return deepFreeze({
    openings: openings
      .filter((opening) => chosen.has(opening))
      .map((opening) => cut(opening, chosen.get(opening))),
    unmatched,
  });
}
