export type ConceptScriptGrade =
  "초3" | "초4" | "초5" | "초6" | "중1" | "중2" | "중3";
export type ConceptScriptRole = "teacher" | "student1" | "student2";
export type ConceptScriptExpression =
  "neutral" | "question" | "thinking" | "aha";
export type ConceptScriptPurpose =
  | "opening"
  | "explanation"
  | "example"
  | "misconception"
  | "correction"
  | "check-question"
  | "check-answer";

/** Each source is instructional content. Independent apply/figure problems are excluded. */
export type ConceptScriptSource =
  | { kind: "bank-concept" | "bank-example" | "bank-ox"; entryId: string }
  | { kind: "authored-example"; key: string }
  | {
      kind: "v15";
      unit: string;
      scriptIndex: number;
      blockIndex: number;
      page: number;
    };

/**
 * How a turn is presented and which lesson it belongs to. `board` is writing on
 * the board, not speech: the markdown is `**title**`, a blank line, then the body.
 * Keys: `v15:{unit}:{scriptIndex}` | `concept:{conceptId}` | `section:{id}:open|wrap`.
 * Titles are the v15 page title, the bank concept term, or the section name; they
 * may contain inline $TeX$.
 */
export type ConceptScriptPresentation = {
  kind: "speech" | "board";
  lessonKey: string;
  lessonTitle: string;
};

/** Particle pairs a role mention can carry; the form follows the chosen name's final consonant. */
export type ConceptScriptParticle =
  "은/는" | "이/가" | "을/를" | "과/와" | "아/야" | "";

/**
 * A cast member addressed by name inside the manuscript. `start`/`end` are UTF-16
 * offsets of `name + written particle` in `markdown`. Only these anchored spans are
 * replaced when a different cast is chosen; names are never searched for as text.
 */
export type ConceptScriptRoleMention = {
  role: Exclude<ConceptScriptRole, "teacher">;
  name: string;
  particle: ConceptScriptParticle;
  start: number;
  end: number;
};

export type ConceptScriptTurn = {
  role: ConceptScriptRole;
  expression: ConceptScriptExpression;
  purpose: ConceptScriptPurpose;
  /** CommonMark with inline $TeX$. No legacy [[math]] or blank-answer wrappers. */
  markdown: string;
  conceptIds: string[];
  source: ConceptScriptSource;
  presentation?: ConceptScriptPresentation;
  roleMentions?: ConceptScriptRoleMention[];
};

/** Where a section's boards come from, or why it has none. Nothing is written at runtime. */
export type ConceptScriptBoardProvenance =
  | { status: "authored-v15"; count: number }
  | {
      status: "derived-bank";
      count: number;
      /** Bank concepts whose own `kind` is 공식 · 법칙 · 정리 · 단위. */
      basis: "concept-kind";
      entryIds: string[];
    }
  | { status: "absent"; reason: "no-board-kind-concept" };

export type ConceptTeachingScript = {
  version: 1;
  sectionKey: string;
  grade: ConceptScriptGrade;
  /** Curriculum semester of the section; the same rule the quick-create scope uses. */
  semester?: 1 | 2;
  chapter: string;
  title: string;
  conceptIds: string[];
  dialogue: ConceptScriptTurn[];
  provenance: {
    bank: "original-concept-blank";
    sourceFiles: string[];
    referenceUnits?: string[];
    boards?: ConceptScriptBoardProvenance;
  };
};

export type ConceptScriptCoverage = {
  totalSections: number;
  coveredSections: number;
  coveragePercent: number;
  missingSectionKeys: string[];
  grades: {
    grade: ConceptScriptGrade;
    totalSections: number;
    coveredSections: number;
  }[];
};

export type ConceptScriptSemesterCoverage = {
  grade: ConceptScriptGrade;
  semester: 1 | 2;
  sections: number;
  concepts: number;
}[];
