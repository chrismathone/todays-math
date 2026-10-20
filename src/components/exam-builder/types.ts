import type { ReactNode } from "react";
import type { WorkspaceWorkflowStep } from "@/contracts/workspaceWorkflow.contract";
import type { ExamConditionSource } from "@/contracts/examCondition.contract";
import type { ExamConditionsClient } from "./examConditionsClient";
import type { QuestionRepresentation } from "@/contracts/questionFormats.contract";

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
  /** 손으로 고친 행 — «구성 조건»의 총 문항이 다시 나누지 않는다(W4). */
  fixed?: boolean;
}
/** 범위의 출제 가능 수를 셀 때 · 후보를 고를 때 · 구성할 때 같은 조건(W4). */
export interface ExamExclusion {
  /** 최근 출제 문항 빼기(D-20) — 서버가 지금 계정의 최근 14일 시험으로 뺀다. */
  excludeRecent?: boolean;
  /** Demand-loaded math inventory: count only visible and selected lessons. */
  scopeIds?: readonly string[];
}
export interface ExamComposeOptions extends ExamExclusion {
  /** 난이도 의도 — 정한 칸만 싣는다. 없는 칸은 지정 없음, 0 은 내지 않음. */
  difficulty?: Record<string, number>;
  /** 형식 의도(M3) — 정한 칸만(객관식 · 단답형 · 서술형). */
  formats?: Record<string, number>;
  /** 다시 구성할 때 남긴 문항 — 이 문항과 그 문항류는 새로 뽑지 않는다(D-111). */
  excludeIds?: string[];
}
export interface ExamComposeResult<T> {
  items: T[];
  /** 모자란 난이도처럼 구성 뒤 알릴 것 — 다른 난이도 · 범위로 채우지 않았다는 말. */
  notes?: string[];
}
/** 출처가 «구성 조건»(W4)을 지원하면 — 지금은 수학만. */
export interface ExamConditionsSupport {
  /** 난이도 의도의 사다리(차례 그대로). */
  ladder: readonly string[];
  /** 최근 출제 빼기의 날 수(D-20 — 14). */
  recentDays: number;
}
/** 출처 칸 쪽이 가진 고르기 — 출처 · 자료 · 같은 문항류 규칙(W5 조건에 함께 담는다). */
export interface ExamSavedSelection {
  source: ExamConditionSource;
  familyRule: boolean;
}
/**
 * W5 «이름 붙인 출제 조건» — 없으면 그 줄 · 단추 · 창을 그리지 않는다(영어). 구성 조건(W4)이 있는 출처에서만 쓴다.
 * 조건만 오간다 — 문항은 적용한 뒤 [문항 검토 →]으로 새로 고른다.
 */
export interface ExamNamedConditions {
  /** 지금의 출처 고르기(저장할 때 담는다). */
  selection: ExamSavedSelection;
  /** 저장한 고르기로 되돌린다 — 출처가 바뀌면 범위의 출제 가능 수를 다시 센 뒤 표에 넣는다. */
  restore: (selection: ExamSavedSelection) => void;
  client: ExamConditionsClient;
}
export interface ExamQuestionInfo {
  id: string;
  /** Server-issued task identity. Actual `id` remains the stored representation. */
  questionId?: string;
  scopeId: string;
  scopeLabel: string;
  difficulty: string;
  detail?: string;
  /**
   * Same value = same problem family; one sheet holds at most one (D-111).
   * Omit when the subject has no family concept (every item stands alone).
   */
  familyId?: string;
  /** 답안 형식(객관식 · 단답형 · 서술형 · 미분류) — 교체 창의 메타 줄(W3). */
  format?: string;
  /** 출처 이름(자작 · 교과서 · 기출 …) — 교체 창의 메타 줄(W3). */
  origin?: string;
}
/** String branches remain valid for existing non-inventory sources. */
export type ExamScopeBranch = string | { label: string; count?: number };
export interface ExamBuilderSource<T> {
  /** Optional S2 data navigation; legacy/local sources can keep full scope lists. */
  scopeNavigation?: {
    groups: (signal: AbortSignal) => Promise<ExamScopeBranch[]>;
    details: (group: string, signal: AbortSignal) => Promise<ExamScopeBranch[]>;
    lessons: (
      group: string,
      detail: string,
      signal: AbortSignal,
    ) => Promise<ExamScope[]>;
    restore: (items: readonly T[], signal: AbortSignal) => Promise<ExamScope[]>;
  };
  /** Optional: English and local sources retain their existing selection flow. */
  questionFormats?: {
    options: (item: T) => readonly QuestionRepresentation[];
    load: (
      item: T,
      option: QuestionRepresentation,
      signal: AbortSignal,
    ) => Promise<T>;
  };
  /** Math inventory must be confirmed before a scope can be selected. */
  requireScopeCounts?: boolean;
  /** Scopes already present with the selected content can be shown before effects run. */
  initialScopes?: ExamScope[];
  /**
   * W3 «원문과 대조한 뒤 교체» — 두 층(같은 문항류 · 같은 차시의 다른 문항)을 쓴다. `list` 가 `familyOf` 를
   * 알아야 한다. 없으면 지금의 후보 창으로 바꾼다(영어).
   */
  compareReplace?: boolean;
  /** W4 «구성 조건» — 없으면 그 줄 · 창을 그리지 않는다(영어). */
  conditions?: ExamConditionsSupport;
  loadScopes: (
    signal: AbortSignal,
    options?: ExamExclusion,
  ) => Promise<ExamScope[]>;
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
      /** W3 «같은 문항류» — 이 문항과 같은 문항류의 다른 문항만(키가 없으면 형제가 없다). */
      familyOf?: string;
    } & ExamExclusion,
    signal: AbortSignal,
  ) => Promise<{ items: T[]; total: number }>;
  compose: (
    allocations: ExamAllocation[],
    signal: AbortSignal,
    options?: ExamComposeOptions,
  ) => Promise<T[] | ExamComposeResult<T>>;
  info: (item: T) => ExamQuestionInfo;
  /** Plain composition counts shown by the review heading (math only). */
  summarize?: (items: T[]) => string;
  /** Resolve revisions / eligibility before entering output. Never silently broaden scope. */
  prepareOutput?: (items: T[], signal: AbortSignal) => Promise<T[]>;
  /** Annotate old saved items with current identity, without replacing saved content. */
  resolveIdentity?: (items: T[], signal: AbortSignal) => Promise<T[]>;
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
  /** 교체 창(W3)의 후보 줄 두 줄 — 본문만. 없으면 `renderQuestion`. */
  renderCandidate?: (item: T) => ReactNode;
  /** Answer and solution beside each reviewed question (math only). */
  renderAnswer?: (item: T) => ReactNode;
  renderOutput: (props: ExamBuilderOutputProps<T>) => ReactNode;
  /** Optional seed from the surrounding workspace; subject is already selected there. */
  initialScopeIds?: string[];
  initialGroup?: string;
  /** Restore only after the owner explicitly opens this document; key by draft id. */
  initialStep?: ExamBuilderStep;
  /** Saved output is shown as stored; composition edits first create an explicit copy. */
  preserveStoredOutput?: boolean;
  onBeginEdit?: () => Promise<boolean>;
  /** User transitions and successful output validation; never called on blank mount. */
  onStepChange?: (step: ExamBuilderStep) => void;
  /** Lets a host's save shortcut honor the same explicit composition intent. */
  onIntentIssueChange?: (issue: string | null) => void;
  canOutput?: boolean;
  onOutputIntent?: () => void;
  disabled?: boolean;
  status?: ReactNode;
  /** Scope source controls sit above the S2 navigation, inside the left panel. */
  scopeControls?: ReactNode;
  /** W5 «이름 붙인 출제 조건»(수학). */
  namedConditions?: ExamNamedConditions;
}
