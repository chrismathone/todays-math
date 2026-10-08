import type { ReactNode } from "react";

/** Subject data stays in its native contract; this UI only owns the common workflow. */
export type ExamBuilderStep = "scope" | "review" | "output";
export interface ExamScope {
  id: string;
  label: string;
  group: string;
  detail?: string;
  count?: number;
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
}
export interface ExamBuilderSource<T> {
  loadScopes: (signal: AbortSignal) => Promise<ExamScope[]>;
  list: (
    request: {
      scopeIds: string[];
      difficulty: string;
      query: string;
      page: number;
      pageSize: number;
      excludeIds: string[];
    },
    signal: AbortSignal,
  ) => Promise<{ items: T[]; total: number }>;
  compose: (allocations: ExamAllocation[], signal: AbortSignal) => Promise<T[]>;
  info: (item: T) => ExamQuestionInfo;
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
  renderOutput: (props: ExamBuilderOutputProps<T>) => ReactNode;
  /** Optional seed from the surrounding workspace; subject is already selected there. */
  initialScopeIds?: string[];
  initialGroup?: string;
  canOutput?: boolean;
  onOutputIntent?: () => void;
  disabled?: boolean;
  status?: ReactNode;
}
