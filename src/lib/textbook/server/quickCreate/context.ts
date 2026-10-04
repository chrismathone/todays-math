import "server-only";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type {
  ManuscriptBlock,
  TextbookItem,
} from "@/contracts/textbookExchange.contract";
import type {
  quickCreateInputSchema,
  QuickCreateCast,
  QuickCreateComponents,
  QuickCreateScope,
} from "@/contracts/textbookQuickCreate.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { sectionKeyOf } from "@/lib/concept-blank/sections";
import type { TextbookActor } from "../../access";
import type {
  CapturedSnapshot,
  FigureLoader,
  FrozenAsset,
} from "../../snapshotFromProblem";
import type { OutlineUnitMeta } from "../editions";
import type { TextbookSql } from "../sql";

/** Explicit, closed tier sets. A shortage reduces the count, never borrows a different difficulty. */
export const QUICK_CREATE_DIFFICULTIES = {
  basic: ["연산", "기본"],
  standard: ["기본", "응용"],
  challenge: ["응용", "심화하", "심화중", "심화상"],
} as const;
export const DEFAULT_QUICK_CREATE_CAST: QuickCreateCast = {
  teacherId: "teacher-f1",
  student1Id: "student-f1",
  student2Id: "student-m1",
};
export interface QuickCreateDependencies {
  loadFigure: FigureLoader;
  dialogueForSection?: (
    sectionKey: string,
    cast: QuickCreateCast,
  ) => Promise<{
    turns: Extract<ManuscriptBlock, { kind: "dialogue" }>["turns"];
    assets: FrozenAsset[];
  }>;
  prepareVisuals?: (
    tx: TextbookSql,
    input: {
      userId: string;
      editionId: string;
      cast: QuickCreateCast;
      units: readonly UnitRow[];
      dialogue: boolean;
      rest: boolean;
    },
  ) => Promise<{
    assetIds: string[];
    dialogueForSection: (
      sectionKey: string,
    ) => Extract<ManuscriptBlock, { kind: "dialogue" }>["turns"];
    restForUnit: (unit: UnitRow) => {
      title: string;
      markdown: string;
      reflectionQuestions: readonly string[];
      imageAssetId: string;
    };
  }>;
  now?: () => Date;
}
export interface UnitRow {
  id: string;
  grade: string;
  chapter: string;
  section: string;
  orderIndex: number;
  problemCount: number;
}
export const gradeLabel = (scope: QuickCreateScope) =>
  `${scope.schoolLevel === "elementary" ? "초" : "중"}${scope.grade}`;
export const keyOf = (unit: Pick<UnitRow, "grade" | "chapter" | "section">) =>
  sectionKeyOf(unit.grade, unit.chapter, unit.section);
export const conceptIndex = new Map<string, ConceptEntry[]>();
for (const entry of CONCEPT_BLANK_BANK.concepts) {
  const entries = conceptIndex.get(entry.section) ?? [];
  entries.push(entry);
  conceptIndex.set(entry.section, entries);
}
export const text = (markdown: string): ManuscriptBlock => ({
  blockId: randomUUID(),
  kind: "text",
  markdown,
});
export const plainDefinition = (entry: ConceptEntry) =>
  splitBlankSentence(entry.definition)
    .map((piece) => piece.text)
    .join("");
export interface SectionPlan {
  id: string;
  unitKey: string;
  sectionKey: string;
  title: string;
  templateKey: string;
  startPolicy: "even-left" | "continue";
  blocks: ManuscriptBlock[];
}
export interface ItemPlan {
  id: string;
  unitKey: string;
  sectionId: string;
  stage: TextbookItem["learningStage"];
  snapshot: CapturedSnapshot;
  orderIndex: number;
  conceptKeys: string[];
}

/** The validated request: schema defaults applied, title trimmed. */
export type QuickCreateRequest = z.output<typeof quickCreateInputSchema>;
export type QuickCreateVisuals = Awaited<
  ReturnType<NonNullable<QuickCreateDependencies["prepareVisuals"]>>
>;
export interface QuickCreateStage {
  enabled: boolean;
  stage: TextbookItem["learningStage"];
  title: string;
}

/**
 * What one quick-create transaction assembles before anything but the book and edition rows is
 * written. Stage modules append to these collections in call order; `quickCreate.ts` validates
 * and persists them. `chapter` and `unitKey` are the cursor: where the next section is filed.
 */
export interface QuickCreateAssembly {
  readonly tx: TextbookSql;
  readonly actor: TextbookActor;
  readonly input: QuickCreateRequest;
  readonly components: QuickCreateComponents;
  readonly deps: QuickCreateDependencies;
  readonly units: readonly UnitRow[];
  readonly visuals: QuickCreateVisuals | undefined;
  readonly stages: readonly QuickCreateStage[];
  /** ISO time of this request, shared by every review stamp. */
  readonly now: string;
  readonly sections: SectionPlan[];
  readonly items: ItemPlan[];
  readonly concepts: TextbookConcept[];
  readonly assets: Map<
    string,
    { asset: FrozenAsset; kind: "figure" | "portrait" }
  >;
  readonly outline: OutlineUnitMeta[];
  readonly warnings: string[];
  chapter: string;
  unitKey: string;
  /**
   * Appends a section under the current `unitKey`; ids are drawn after `blocks` is built.
   * A closure, not a method: stage modules destructure it.
   */
  readonly addSection: (
    title: string,
    templateKey: string,
    blocks: ManuscriptBlock[],
  ) => SectionPlan;
}
/** One curriculum section and the lesson section its components are appended to. */
export interface QuickCreateLesson {
  unit: UnitRow;
  section: SectionPlan;
  entries: ConceptEntry[];
}
