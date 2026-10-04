/**
 * 교재 편집 화면이 지키는 순수 규칙.
 * 서버 응답의 정본은 `src/contracts/textbook.contract.ts`다.
 * 여기 값은 화면 상태다.
 */
import type { Difficulty } from "@/contracts/difficulty";
import type { ProblemType } from "@/contracts/problem.contract";
import type { TextbookArtifact } from "@/contracts/textbook.contract";
import type {
  TextbookDialoguePresentation,
  TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import {
  CONCEPT_KINDS,
  type ConceptKind,
} from "@/lib/math-explorers/conceptKinds";

export { CONCEPT_KINDS, type ConceptKind };

export type NamedChoice = { id: string; label: string };

export type RegisterFields = {
  unitId: string;
  difficulty: Difficulty;
  problemType: ProblemType;
};

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
export const SPEAKER_IDS = {
  선생님: "speaker.teacher",
  민서: "speaker.minseo",
  지호: "speaker.jiho",
} as const satisfies Record<Speaker, string>;
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
  /** 저장 때 서버 확인 목록에 넣는다. 화면이 확인 도장을 찍지 않는다. */
  confirmRequested?: boolean;
  givenCase?: boolean;
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
  presentation?: TextbookDialoguePresentation;
};

export type Portrait = {
  id: string;
  character: Speaker;
  side: Side;
  mirror: boolean;
};

export type RecallPhase = "study" | "keywords" | "sentences";

export type SectionBlock = { semantic?: TextbookSemantic } & (
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
  | { id: string; kind: "problems"; itemIds: string[] }
);

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
  blankForms: BlankForm[];
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

export type SolutionPolicy = "never" | "assigned";

export type EditionConfig = {
  paper: "A4";
  workLineMm: number;
  answerPolicy: AnswerPolicy;
  volumeCode: string;
  videoPolicy: VideoPolicy;
  /** 응답에 칸이 없으면 never 로 보여 준다. 저장할 때는 고른 값을 보낸다. */
  studentSolutionPolicy: SolutionPolicy;
};

export type EditionDetail = {
  editionId: string;
  bookId: string;
  title: string;
  structureRevision: number;
  /** 판본 행의 revision. 담기·다시 고정·발행 예약이 이 값을 보낸다. */
  aggregateRevision: number;
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
  /** 서버가 짚은 자리(교환 파일 안의 경로). 가져오기 오류를 파일 · 구획별로 보여 줄 때 쓴다. */
  path?: string;
};

export type PublishJob = {
  jobId: string;
  status: Exclude<PublishStatus, "idle" | "preflight-failed">;
  issues: StudioIssue[];
  completedSteps?: number;
  totalSteps?: number;
  artifacts?: TextbookArtifact[];
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

/** 발행본과 보관본은 원고를 고치지 않는다. 상태 칸이 없는 화면 픽스처는 초안으로 본다. */
export function manuscriptLocked(
  status: "draft" | "published" | "retired" | undefined,
  bookArchived: boolean,
): boolean {
  return bookArchived || status === "published" || status === "retired";
}

/** 제목·갈래·본문이 바뀌면 저장 대기 중인 연결 확인을 비운다. 백지 형식은 확인을 지우지 않는다. */
export function conceptManuscriptChanged(
  before: ConceptDraft | null,
  after: ConceptDraft | null,
): boolean {
  if (!before || !after) return false;
  return (
    before.title !== after.title ||
    before.kind !== after.kind ||
    before.goal !== after.goal ||
    before.prerequisites !== after.prerequisites ||
    before.definition !== after.definition ||
    before.conditions !== after.conditions ||
    before.examples !== after.examples ||
    before.counterexamples !== after.counterexamples ||
    before.misconceptions !== after.misconceptions ||
    before.explainPrompt !== after.explainPrompt
  );
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
  // Every section is measured separately in the editor, including sections that
  // continue on the preceding page in the full-book PDF.
  return units.flatMap((unit) =>
    unit.sections.map((section) => section.sectionId),
  );
}

export type MeasuredPageRef = {
  physicalPageIndex: number;
  printedPageLabel: string;
};

function measuredSpreadIndexes(pages: readonly MeasuredPageRef[]): number[] {
  return [
    ...new Set(
      pages.map(
        (page) => page.physicalPageIndex - (page.physicalPageIndex % 2),
      ),
    ),
  ].sort((left, right) => left - right);
}

/** The current measured spread, clamped to a remaining spread after remeasurement. */
export function measuredSpreadAnchor(
  pages: readonly MeasuredPageRef[],
  current: number | null,
): number | null {
  if (pages.length === 0) return null;
  const indexes = measuredSpreadIndexes(pages);
  const first = indexes[0];
  if (first === undefined) return null;
  if (current === null) return first;
  const chosen = current - (current % 2);
  return indexes.findLast((index) => index <= chosen) ?? first;
}

/** Next or previous measured spread. Null means this section has no further spread. */
export function nextMeasuredSpread(
  pages: readonly MeasuredPageRef[],
  current: number | null,
  direction: -1 | 1,
): number | null {
  const anchor = measuredSpreadAnchor(pages, current);
  if (anchor === null) return null;
  const indexes = measuredSpreadIndexes(pages);
  return indexes[indexes.indexOf(anchor) + direction] ?? null;
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

const BLANK_FORMS: readonly BlankForm[] = [
  "recall",
  "term",
  "cloze",
  "map",
  "figure",
];

export function toggleBlankForm(
  current: readonly BlankForm[],
  form: BlankForm,
  blockRecall: boolean,
): { ok: true; forms: BlankForm[] } | { ok: false; message: string } {
  if (!BLANK_FORMS.includes(form)) {
    return { ok: false, message: "알 수 없는 백지 형식입니다." };
  }
  if (current.includes(form)) {
    return { ok: true, forms: current.filter((item) => item !== form) };
  }
  if (form === "recall" && blockRecall) {
    return {
      ok: false,
      message: "사례 항목이 있으면 완전 백지를 고르지 않습니다.",
    };
  }
  if (current.length >= 5) {
    return { ok: false, message: "백지 형식은 다섯까지입니다." };
  }
  return { ok: true, forms: [...current, form] };
}

export function moveOutlineSection(
  units: readonly OutlineUnit[],
  sectionId: string,
  direction: -1 | 1,
): OutlineUnit[] | null {
  const unitIndex = units.findIndex((unit) =>
    unit.sections.some((section) => section.sectionId === sectionId),
  );
  if (unitIndex < 0) return null;
  const unit = units[unitIndex];
  if (!unit) return null;
  const sectionIndex = unit.sections.findIndex(
    (section) => section.sectionId === sectionId,
  );
  const target = sectionIndex + direction;
  if (sectionIndex < 0 || target < 0 || target >= unit.sections.length) {
    return null;
  }
  const sections = [...unit.sections];
  const current = sections[sectionIndex];
  const next = sections[target];
  if (!current || !next) return null;
  sections[sectionIndex] = next;
  sections[target] = current;
  return units.map((item, index) =>
    index === unitIndex ? { ...item, sections } : item,
  );
}

export function moveOutlineUnit(
  units: readonly OutlineUnit[],
  unitKey: string,
  direction: -1 | 1,
): OutlineUnit[] | null {
  const index = units.findIndex((unit) => unit.unitKey === unitKey);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= units.length) return null;
  const copy = [...units];
  const current = copy[index];
  const next = copy[target];
  if (!current || !next) return null;
  copy[index] = next;
  copy[target] = current;
  return copy;
}

type EditionSource = NonNullable<EditionDetail["structureSource"]>;

export function applyEditionEdits(
  source: EditionSource,
  edits: {
    units?: readonly OutlineUnit[];
    title?: string;
    volumeCode?: string;
    videoPolicy?: VideoPolicy;
    studentSolutionPolicy?: SolutionPolicy;
    pageTarget?: number;
    coverMode?: "included" | "separate";
    firstPhysicalPageIndex?: number;
  },
): { ok: true; source: EditionSource } | { ok: false; message: string } {
  const known = new Map(
    source.outline.flatMap((unit) =>
      unit.sections.map((section) => [section.id, section] as const),
    ),
  );
  let outline = source.outline;
  if (edits.units) {
    const next = [];
    for (const unit of edits.units) {
      const prior = source.outline.find(
        (item) => item.unitKey === unit.unitKey,
      );
      const sections = [];
      for (const section of unit.sections) {
        const row = known.get(section.sectionId);
        if (!row) {
          return {
            ok: false,
            message: "목차에 없는 구획은 순서를 저장하지 않습니다.",
          };
        }
        sections.push(row);
      }
      if (!prior) {
        if (sections.length > 0) {
          return {
            ok: false,
            message: "새 단원에는 있는 구획만 옮길 수 있습니다.",
          };
        }
        next.push({
          unitKey: unit.unitKey,
          title: unit.title,
          sourceUnitIds: [],
          prerequisites: [],
          goals: [],
          conceptLectureRefs: [],
          sections,
        });
        continue;
      }
      next.push({ ...prior, title: unit.title, sections });
    }
    const nextIds = next.flatMap((unit) =>
      unit.sections.map((section) => section.id),
    );
    if (
      nextIds.length !== known.size ||
      [...known.keys()].some((id) => !nextIds.includes(id))
    ) {
      return {
        ok: false,
        message: "목차의 구획 목록이 지금의 구획과 다릅니다.",
      };
    }
    outline = next;
  }
  const pageTarget = edits.pageTarget;
  const printEdited =
    edits.coverMode !== undefined || edits.firstPhysicalPageIndex !== undefined;
  if (printEdited && !source.config.print) {
    return { ok: false, message: "인쇄 설정이 없어 저장하지 않습니다." };
  }
  const firstPage = edits.firstPhysicalPageIndex;
  if (
    firstPage !== undefined &&
    (!Number.isInteger(firstPage) || firstPage < 1 || firstPage > 1000)
  ) {
    return { ok: false, message: "첫 쪽은 1부터 1000까지입니다." };
  }
  return {
    ok: true,
    source: {
      ...source,
      config: {
        ...source.config,
        ...(edits.title ? { title: edits.title } : {}),
        ...(edits.volumeCode ? { displayCode: edits.volumeCode } : {}),
        ...(edits.videoPolicy ? { videoPolicy: edits.videoPolicy } : {}),
        ...(edits.studentSolutionPolicy
          ? { studentSolutionPolicy: edits.studentSolutionPolicy }
          : {}),
        ...(pageTarget
          ? { pageBudget: { ...source.config.pageBudget, target: pageTarget } }
          : {}),
        ...(printEdited && source.config.print
          ? {
              print: {
                ...source.config.print,
                ...(edits.coverMode ? { coverMode: edits.coverMode } : {}),
                ...(firstPage !== undefined
                  ? { firstPhysicalPageIndex: firstPage }
                  : {}),
              },
            }
          : {}),
      },
      outline,
    },
  };
}

export function mergeCapturedSection(
  draft: SectionDetail,
  saved: SectionDetail,
  fresh: SectionDetail,
): SectionDetail {
  if (JSON.stringify(draft) === JSON.stringify(saved)) return fresh;
  const known = new Set(
    draft.blocks.flatMap((block) =>
      block.kind === "problems" ? block.itemIds : [],
    ),
  );
  const added = fresh.blocks.filter(
    (block) =>
      block.kind === "problems" &&
      block.itemIds.some((itemId) => !known.has(itemId)),
  );
  return {
    ...draft,
    revision: fresh.revision,
    items: fresh.items,
    blocks: [...draft.blocks, ...added],
  };
}

const EDITION_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 주소의 판본이 유효하면 그 id 를 연다. 속성값이 있으면 쿼리보다 먼저 본다. */
export function initialEditionFromLocation(
  prop: string | null | undefined,
  search: string,
): string | null {
  const explicit = prop?.trim() ?? "";
  if (explicit) return EDITION_UUID.test(explicit) ? explicit : null;
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const query = params.get("textbookEdition")?.trim() ?? "";
  if (!query || !EDITION_UUID.test(query)) return null;
  return query;
}

export type ConceptLectureRef = { lectureId: string; conceptKey: string };

export function lectureRefsFor(
  source: EditionSource | undefined,
  unitKey: string,
): ConceptLectureRef[] {
  const unit = source?.outline.find((item) => item.unitKey === unitKey);
  if (!unit) return [];
  return unit.conceptLectureRefs.map((ref) => ({
    lectureId: ref.lectureId,
    conceptKey: ref.conceptKey,
  }));
}

export function sourceUnitIdsFor(
  source: EditionSource | undefined,
  unitKey: string,
): string[] {
  const unit = source?.outline.find((item) => item.unitKey === unitKey);
  return unit ? [...unit.sourceUnitIds] : [];
}

export function withConceptLecture(
  source: EditionSource,
  unitKey: string,
  lectureId: string,
  conceptKey: string,
  linked: boolean,
): { ok: true; source: EditionSource } | { ok: false; message: string } {
  if (!EDITION_UUID.test(lectureId)) {
    return { ok: false, message: "고른 강의를 확인하지 못했습니다." };
  }
  if (!/^[A-Za-z0-9가-힣][A-Za-z0-9가-힣_.:-]*$/.test(conceptKey)) {
    return { ok: false, message: "개념 키가 필요합니다." };
  }
  const index = source.outline.findIndex((unit) => unit.unitKey === unitKey);
  const unit = source.outline[index];
  if (!unit) {
    return {
      ok: false,
      message: "목차에 없는 단원에는 강의를 연결하지 않습니다.",
    };
  }
  const current = unit.conceptLectureRefs;
  const nextRefs = linked
    ? current.some((ref) => ref.lectureId === lectureId)
      ? null
      : [...current, { lectureId, conceptKey }]
    : current.filter(
        (ref) => ref.lectureId !== lectureId || ref.conceptKey !== conceptKey,
      );
  if (!nextRefs) {
    return { ok: false, message: "이미 이 단원에 연결된 강의입니다." };
  }
  if (nextRefs.length > 100) {
    return { ok: false, message: "한 단원의 강의는 100개까지입니다." };
  }
  return {
    ok: true,
    source: {
      ...source,
      outline: source.outline.map((item, itemIndex) =>
        itemIndex === index ? { ...item, conceptLectureRefs: nextRefs } : item,
      ),
    },
  };
}

/** 제품이 스스로 쓰는 지면 틀. 목록에 없는 틀은 «직접 입력»으로 그대로 적는다. */
export const TEMPLATE_CHOICES: readonly NamedChoice[] = [
  { id: "basic", label: "기본" },
  { id: "unit-intro", label: "단원 도입" },
  { id: "rest", label: "쉬어가기" },
];

/** 구획 키의 자동값 — 자동 생성 교재와 같은 모양(`s-` + 8자)이고, 판본 안의 키와 겹치지 않는다. */
export function suggestSectionKey(
  existing: Iterable<string>,
  random: () => string = () => crypto.randomUUID(),
): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const key = `s-${random().replace(/-/g, "").slice(0, 8)}`;
    if (!taken.has(key)) return key;
  }
  return `s-${random().replace(/-/g, "")}`;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * 유튜브 주소나 영상 ID 에서 영상 ID 만 꺼낸다. 유튜브가 아닌 주소 · 모양이 다른 값은 null 이다.
 * 영상 주소를 통째로 저장하지 않는다 — 서버는 공급자와 영상 ID 만 받는다.
 */
export function youtubeVideoId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = url.searchParams.get("v");
    else if (first === "embed" || first === "shorts" || first === "live")
      id = second ?? null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}
