import type { ReactNode } from "react";
import type { WorkspaceWorkflowStep } from "@/contracts/workspaceWorkflow.contract";

/** Subject data stays in its native contract; this UI only owns the common workflow. */
export type ExamBuilderStep = WorkspaceWorkflowStep;
export interface ExamScope {
  id: string;
  label: string;
  group: string;
  detail?: string;
  count?: number;
  /** What `count` counts. Defaults to 문항; math counts problem families (D-111 «갈래»). */
  countUnit?: string;
}
export interface ExamAllocation {
  scopeId: string;
  count: number;
}
export interface ExamQuestionInfo {
  id: string;
  scopeId: string;
  scopeLabel: string;
  difficulty: string;
  detail?: string;
  /**
   * Same value = same problem family; one sheet holds at most one (D-111).
   * Omit when the subject has no family concept (every item stands alone).
   */
  familyId?: string;
}
export interface ExamBuilderSource<T> {
  /** Math inventory must be confirmed before a scope can be selected. */
  requireScopeCounts?: boolean;
  /** Scopes already present with the selected content can be shown before effects run. */
  initialScopes?: ExamScope[];
  loadScopes: (signal: AbortSignal) => Promise<ExamScope[]>;
  list: (
    request: {
      scopeIds: string[];
      difficulty: string;
      query: string;
      page: number;
      pageSize: number;
      excludeIds: string[];
      /**
       * Exclude the whole family of each of these items (D-111). Add sends the
       * whole sheet; replace sends the sheet minus the slot being replaced.
       */
      excludeFamiliesOf?: string[];
    },
    signal: AbortSignal,
  ) => Promise<{ items: T[]; total: number }>;
  compose: (allocations: ExamAllocation[], signal: AbortSignal) => Promise<T[]>;
  info: (item: T) => ExamQuestionInfo;
  /** Plain composition counts shown by the review heading (math only). */
  summarize?: (items: T[]) => string;
  /** Resolve revisions / eligibility before entering output. Never silently broaden scope. */
  prepareOutput?: (items: T[], signal: AbortSignal) => Promise<T[]>;
}
export interface ExamBuilderOutputProps<T> {
  questions: T[];
  onQuestionsChange: (items: T[]) => void;
  title: string;
  onTitleChange: (value: string) => void;
  onStep: (step: "scope" | "review") => void;
}
export interface ExamBuilderProps<T> {
  source: ExamBuilderSource<T>;
  questions: T[];
  onQuestionsChange: (items: T[]) => void;
  title: string;
  onTitleChange: (value: string) => void;
  difficulties: readonly string[];
  maxQuestions: number;
  renderQuestion: (item: T) => ReactNode;
  /** Answer and solution beside each reviewed question (math only). */
  renderAnswer?: (item: T) => ReactNode;
  renderOutput: (props: ExamBuilderOutputProps<T>) => ReactNode;
  /** Optional seed from the surrounding workspace; subject is already selected there. */
  initialScopeIds?: string[];
  initialGroup?: string;
  /** Restore only after the owner explicitly opens this document; key by draft id. */
  initialStep?: ExamBuilderStep;
  /** User transitions and successful output validation; never called on blank mount. */
  onStepChange?: (step: ExamBuilderStep) => void;
  canOutput?: boolean;
  onOutputIntent?: () => void;
  disabled?: boolean;
  status?: ReactNode;
}
