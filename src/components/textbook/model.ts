/**
 * 교재 편집 화면이 지키는 순수 규칙.
 * 서버 응답의 정본은 `src/contracts/textbook.contract.ts`다.
 * 여기 값은 화면 상태와, 계약이 오기 전에 클라이언트가 거절할 조건이다.
 */
import {
  CONCEPT_KINDS,
  type ConceptKind,
} from "@/lib/math-explorers/conceptKinds";

export { CONCEPT_KINDS, type ConceptKind };

export type Audience = "teacher" | "student";
export type PreviewMode = "draft" | "student" | "teacher";
export type ZoomMode = "fit" | "wide";
export type StudioPane = "manuscript" | "preview";
export type SectionStatus = "draft" | "saved" | "needs-review" | "error";
export type SectionParity = "even-left" | "continue" | "unconfirmed";
export type EntryKind = "concept" | "ox" | "apply" | "figure";
export type BlankForm = "recall" | "term" | "cloze" | "map" | "figure";
export type BlankLevel = "하" | "중" | "상";
export type ReviewStatus = "candidate" | "confirmed" | "rejected";
export type AnswerPolicy = "never" | "assigned-qr";
export type VideoRole = "concept-prep" | "problem-solution";
export type VideoStatus = "draft" | "pending-review" | "published" | "stopped";
export type VideoPolicy = "required" | "optional";
export type PublishStatus =
  | "idle"
  | "preflight-failed"
  | "reserved"
  | "running"
  | "ready"
  | "failed"
  | "finalized";

export const SPEAKERS = ["선생님", "민서", "지호"] as const;
export type Speaker = (typeof SPEAKERS)[number];
export const EXPRESSIONS = ["평온", "질문", "생각", "알아챔"] as const;
export type Expression = (typeof EXPRESSIONS)[number];
export const SIDES = ["왼쪽", "오른쪽"] as const;
export type Side = (typeof SIDES)[number];

export type BlankPick = {
  blankSectionKey: string;
  entryKind: EntryKind;
  entryId: string;
  form: BlankForm;
  level: BlankLevel;
  reviewStatus: ReviewStatus;
};

export type PickGroup = {
  form: BlankForm;
  blankSectionKey: string;
  picks: BlankPick[];
};

export type OrderResult =
  { ok: true; groups: PickGroup[] } | { ok: false; message: string };

export type DialogueTurn = {
  id: string;
  speaker: Speaker;
  speakerId: string;
  expression: Expression;
  side: Side;
  text: string;
  portraitAssetId: string;
  mirror: boolean;
};

export type Portrait = {
  id: string;
  character: Speaker;
  side: Side;
  mirror: boolean;
};

export type RecallPhase = "study" | "keywords" | "sentences";

export type SectionBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "dialogue"; turns: DialogueTurn[] }
  | { id: string; kind: "image"; assetId: string; caption: string }
  | { id: string; kind: "concept"; conceptKey: string }
  | {
      id: string;
      kind: "concept-recall";
      conceptKey: string;
      phase: RecallPhase;
      text: string;
      showRepetitionChecks: boolean;
    }
  | { id: string; kind: "problems"; itemIds: string[] };

export type ItemRow = {
  itemId: string;
  problemId: string;
  label: string;
  snapshotHash: string | null;
  currentHash: string | null;
  state: "same" | "changed" | "missing" | "uncompared";
};

export type ExcludedItem = { problemId: string; reason: string };

export type ConceptDraft = {
  conceptKey: string;
  title: string;
  kind: ConceptKind;
  goal: string;
  prerequisites: string;
  definition: string;
  conditions: string;
  examples: string;
  counterexamples: string;
  misconceptions: string;
  explainPrompt: string;
};

export type SectionDetail = {
  sectionId: string;
  editionId: string;
  unitKey: string;
  sectionKey: string;
  templateKey: string;
  title: string;
  revision: number;
  aggregateRevision: number;
  status: SectionStatus;
  parity: SectionParity;
  parityMessage: string | null;
  blocks: SectionBlock[];
  answer: string;
  portraits: Portrait[];
  picks: BlankPick[];
  items: ItemRow[];
  concept: ConceptDraft | null;
};

export type OutlineSection = {
  sectionId: string;
  title: string;
  status: SectionStatus;
  parity: SectionParity;
};

export type OutlineUnit = {
  unitKey: string;
  title: string;
  sections: OutlineSection[];
};

export type EditionConfig = {
  paper: "A4";
  workLineMm: number;
  answerPolicy: AnswerPolicy;
  volumeCode: string;
  videoPolicy: VideoPolicy;
};

export type EditionDetail = {
  editionId: string;
  bookId: string;
  title: string;
  structureRevision: number;
  config: EditionConfig;
  units: OutlineUnit[];
  /** 목차 PATCH에 그대로 되돌리는 서버 원고. 없으면 순서를 저장하지 않는다. */
  structureSource?: import("@/contracts/textbook.contract").TextbookEditionDetail;
};

export type BookSummary = {
  bookId: string;
  title: string;
  shared: boolean;
  archived: boolean;
  activeEditionId: string | null;
};

export type StudioIssue = {
  severity: "error" | "warning" | "info";
  message: string;
  sectionId?: string;
};

export type PublishJob = {
  jobId: string;
  status: Exclude<PublishStatus, "idle" | "preflight-failed">;
  issues: StudioIssue[];
};

export type AssignmentTarget =
  | { kind: "class"; classId: string; label: string }
  | { kind: "student"; studentId: string; label: string };

export type AssignmentRow = {
  assignmentId: string;
  target: AssignmentTarget;
  startsAt: string;
  expiresAt: string | null;
  revoked: boolean;
};

export type VideoBinding = {
  bindingId: string;
  videoId: string;
  snapshotId: string;
  role: VideoRole;
  status: VideoStatus;
  policy: VideoPolicy | "unknown";
  label: string;
  startSeconds: number;
  endSeconds: number | null;
  contentHash: string | null;
};

export type ImportMode = "archive" | "copy";

export type ImportResult =
  | { mode: "archive"; readOnly: true; issues: StudioIssue[] }
  | { mode: "copy"; book: BookSummary; issues: StudioIssue[] }
  | { mode: ImportMode; rejected: true; issues: StudioIssue[] };

export type PaperPreviewInput = {
  mode: PreviewMode;
  zoom: ZoomMode;
  title: string;
  blocks: SectionBlock[];
  portraits: Portrait[];
  answer: string | null;
  answerPlacement: "manuscript" | "sheet" | "hidden";
  parityMessage: string | null;
  pageLabel: string;
};

const PAIR: Record<EntryKind, readonly BlankForm[]> = {
  concept: ["recall", "term", "cloze", "map"],
  ox: ["term"],
  apply: ["cloze"],
  figure: ["figure"],
};

export function pickPairAllowed(
  entryKind: EntryKind,
  form: BlankForm,
): boolean {
  return PAIR[entryKind].includes(form);
}

/** 그룹은 (form, blankSectionKey)의 첫 등장 순서다. 떨어져 다시 나오면 오류다. */
export function orderBlankPicks(picks: readonly BlankPick[]): OrderResult {
  if (picks.length > 2000) {
    return { ok: false, message: "한 번에 2000개까지 고를 수 있습니다." };
  }
  const seen = new Set<string>();
  const opened = new Set<string>();
  const groups: PickGroup[] = [];
  let lastKey: string | null = null;
  for (const pick of picks) {
    if (!pickPairAllowed(pick.entryKind, pick.form)) {
      return { ok: false, message: "항목 종류와 형식이 맞지 않습니다." };
    }
    const dup = `${pick.form}\u0000${pick.entryKind}\u0000${pick.entryId}`;
    if (seen.has(dup)) {
      return { ok: false, message: "같은 형식의 같은 항목이 두 번 있습니다." };
    }
    seen.add(dup);
    const key = `${pick.form}\u0000${pick.blankSectionKey}`;
    if (lastKey !== key) {
      if (opened.has(key)) {
        return {
          ok: false,
          message: "같은 형식과 소단원이 떨어져 다시 나옵니다.",
        };
      }
      opened.add(key);
      groups.push({
        form: pick.form,
        blankSectionKey: pick.blankSectionKey,
        picks: [],
      });
      lastKey = key;
    }
    const group = groups[groups.length - 1];
    if (!group) return { ok: false, message: "선택 순서를 정하지 못했습니다." };
    group.picks.push(pick);
  }
  return { ok: true, groups };
}

export function answerPlacement(
  audience: Audience,
  mode: PreviewMode,
): "manuscript" | "sheet" | "hidden" {
  if (audience !== "teacher") return "hidden";
  if (mode === "student") return "hidden";
  if (mode === "draft") return "manuscript";
  return "sheet";
}

/** 학생 세션에는 모드와 무관하게 정답을 넘기지 않는다. */
export function visibleAnswer(
  audience: Audience,
  mode: PreviewMode,
  answer: string,
): string | null {
  if (answerPlacement(audience, mode) === "hidden") return null;
  return answer.length > 0 ? answer : null;
}

export function canFinalize(status: PublishStatus): boolean {
  return status === "ready";
}

export function publishHeadline(status: PublishStatus): string {
  switch (status) {
    case "idle":
      return "발행 전 확인을 아직 하지 않았습니다.";
    case "preflight-failed":
      return "발행 전 확인에서 막혔습니다.";
    case "reserved":
      return "예약되었습니다. 조판이 끝나기 전에는 학생에게 열리지 않습니다.";
    case "running":
      return "서버가 조판하고 있습니다.";
    case "ready":
      return "조판 확인이 끝났습니다. 확정 전입니다.";
    case "failed":
      return "발행하지 못했습니다.";
    case "finalized":
      return "발행됨";
  }
}

export function portraitMirrorAllowed(side: Side, mirror: boolean): boolean {
  return side === "오른쪽" || !mirror;
}

export function planUploadChunks(
  byteLength: number,
  chunkBytes = 1_000_000,
): number[] {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new Error("파일 크기를 읽지 못했습니다.");
  }
  if (byteLength === 0) return [];
  const count = Math.ceil(byteLength / chunkBytes);
  return Array.from({ length: count }, (_, index) =>
    Math.min(chunkBytes, byteLength - index * chunkBytes),
  );
}

export function moveBlock(
  blocks: readonly SectionBlock[],
  id: string,
  direction: -1 | 1,
): SectionBlock[] {
  const index = blocks.findIndex((block) => block.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= blocks.length) return [...blocks];
  const copy = [...blocks];
  const current = copy[index];
  const target = copy[next];
  if (!current || !target) return [...blocks];
  copy[index] = target;
  copy[next] = current;
  return copy;
}

export function spreadStarts(units: readonly OutlineUnit[]): string[] {
  const ids: string[] = [];
  for (const unit of units) {
    for (const section of unit.sections) {
      if (section.parity !== "continue") ids.push(section.sectionId);
    }
  }
  return ids;
}

export function sectionStatusLabel(status: SectionStatus): string {
  switch (status) {
    case "draft":
      return "초안";
    case "saved":
      return "저장됨";
    case "needs-review":
      return "검수 필요";
    case "error":
      return "오류";
  }
}

export function videoStatusLabel(status: VideoStatus): string {
  switch (status) {
    case "draft":
      return "초안";
    case "pending-review":
      return "검수 대기";
    case "published":
      return "게시";
    case "stopped":
      return "게시 중지";
  }
}
