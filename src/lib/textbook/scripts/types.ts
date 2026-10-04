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

export type ConceptScriptTurn = {
  role: ConceptScriptRole;
  expression: ConceptScriptExpression;
  purpose: ConceptScriptPurpose;
  /** CommonMark with inline $TeX$. No legacy [[math]] or blank-answer wrappers. */
  markdown: string;
  conceptIds: string[];
  source: ConceptScriptSource;
};

export type ConceptTeachingScript = {
  version: 1;
  sectionKey: string;
  grade: ConceptScriptGrade;
  chapter: string;
  title: string;
  conceptIds: string[];
  dialogue: ConceptScriptTurn[];
  provenance: {
    bank: "original-concept-blank";
    sourceFiles: string[];
    referenceUnits?: string[];
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
