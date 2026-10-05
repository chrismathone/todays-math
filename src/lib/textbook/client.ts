/**
 * 교사 교재 API `/api/textbook`.
 *
 * 요청·응답은 공유 계약을 파싱한다.
 * 비교·다시 고정·연결·등록·재출제·업로드 완료는 공유 스키마를 쓴다.
 * 등록은 검수 대기 문항을 만들고 배치를 연결하지 않는다.
 * 재출제 응답의 제목은 저장되지 않는다. 시험지에는 제목 칸이 없다.
 * 성공 본문은 공통 `{ data }` 봉투다. 목록과 교환 파일은 그 봉투가 스키마 안에 있다.
 * 없는 필드는 성공으로 채우지 않는다.
 */
import { z } from "zod";
import { getTextbookCharacter } from "./characters";

import {
  planUploadChunks,
  type AssignmentRow,
  type BlankForm,
  type BlankLevel,
  type BlankPick,
  type BookSummary,
  type ConceptDraft,
  type DialogueTurn,
  type EditionDetail,
  type Expression,
  type ImportMode,
  type ImportResult,
  type ItemRow,
  type NamedChoice,
  type PublishJob,
  type RegisterFields,
  type SectionBlock,
  type SectionDetail,
  SPEAKER_IDS,
  type SolutionPolicy,
  type Speaker,
  type StudioIssue,
  type VideoBinding,
  type VideoPolicy,
  type VideoStatus,
} from "@/components/textbook/model";
import {
  classListResponseSchema,
  studentListResponseSchema,
} from "@/contracts/class.contract";
import { dataResponseSchema } from "@/contracts/common.contract";
import { problemListResponseSchema } from "@/contracts/problem.contract";
import { testListResponseSchema } from "@/contracts/test.contract";
import { unitListResponseSchema } from "@/contracts/unit.contract";
import {
  textbookAssignmentSchema,
  textbookBindingWriteSchema,
  textbookBookListSchema,
  textbookBookSummarySchema,
  textbookCaptureItemsSchema,
  textbookCaptureResultSchema,
  textbookConceptCatalogSchema,
  textbookConceptRecordSchema,
  textbookCreateAssignmentSchema,
  textbookCreateBookSchema,
  textbookCreateEditionSchema,
  textbookEditionDetailSchema,
  textbookExportResponseSchema,
  textbookImportResultSchema,
  textbookImportSchema,
  textbookPreflightSchema,
  textbookPublishJobSchema,
  textbookPublishReserveSchema,
  textbookReissueSchema,
  textbookRequestSchema,
  textbookSaveConceptSchema,
  textbookSaveSectionResultSchema,
  textbookSaveSectionSchema,
  textbookDeleteSectionSchema,
  textbookSaveStructureSchema,
  textbookSectionRecordSchema,
  textbookSnapshotActionSchema,
  textbookVideoCreateSchema,
  textbookVideoSchema,
  type TextbookAssignment,
  type TextbookBookSummary,
  type TextbookEditionDetail,
  type TextbookPublishJob,
  type TextbookSectionRecord,
} from "@/contracts/textbook.contract";
import {
  textbookConceptAttemptSchema,
  textbookObservationCreateSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import {
  textbookItemSchema,
  textbookVideoBindingSchema,
  type AssetRef,
  type ConceptQrTarget,
  type ManuscriptBlock,
  type ProblemSnapshot,
  type QrTarget,
  type Section,
  type TextbookItem,
  type TextbookExchange,
} from "@/contracts/textbookExchange.contract";
import {
  textbookIssueSchema,
  type TextbookIssue,
} from "@/contracts/textbookPrimitives.contract";
import {
  textbookConceptLectureListSchema,
  textbookItemDetailSchema,
  textbookItemDiffSchema,
  textbookItemMutationResultSchema,
  textbookLinkItemSchema,
  textbookRegisterItemResultSchema,
  textbookRegisterItemSchema,
  textbookReissueResultSchema,
  textbookUploadCompleteResultSchema,
  textbookUploadCompleteSchema,
  textbookVideoListSchema,
} from "@/contracts/textbookServer.contract";

const BASE = "/api/textbook";
const LOAD_ERROR = "교재 응답을 읽지 못했습니다.";

const SPEAKER_ID = SPEAKER_IDS;
const EXPRESSION_WIRE: Record<
  Expression,
  "neutral" | "question" | "thinking" | "aha"
> = {
  평온: "neutral",
  질문: "question",
  생각: "thinking",
  알아챔: "aha",
};

export class TextbookRequestError extends Error {
  readonly status: number;
  readonly serverRevision: number | null;
  readonly serverSection: SectionDetail | null;
  readonly issues: StudioIssue[];

  constructor(
    message: string,
    status: number,
    extras?: {
      serverRevision?: number | null;
      serverSection?: SectionDetail | null;
      issues?: StudioIssue[];
    },
  ) {
    super(message);
    this.name = "TextbookRequestError";
    this.status = status;
    this.serverRevision = extras?.serverRevision ?? null;
    this.serverSection = extras?.serverSection ?? null;
    this.issues = extras?.issues ?? [];
  }
}

export type SaveSectionResult = {
  revision: number;
  aggregateRevision: number;
};

export type CaptureResult = {
  items: ItemRow[];
  excluded: { problemId: string; reason: string }[];
  aggregateRevision: number;
};

export type PreflightResult =
  { ok: true; issues: StudioIssue[] } | { ok: false; issues: StudioIssue[] };

export type SnapshotDiff = { itemId: string; summary: string };

export type ItemLinkCandidate = {
  problemId: string;
  problemCode: string;
};

export type RegisterItemResult = {
  item: ItemRow;
  aggregateRevision: number;
  problem: {
    problemId: string;
    problemCode: string;
    reviewStatus: "pending";
  };
  candidates: ItemLinkCandidate[];
};

export type ReissueResult = {
  testId: string;
  problemCount: number;
  titlePersisted: false;
  replayed: boolean;
};

/** 측정에 쓰는 교환 형식의 확정본. 없으면 문항·개념 블록은 측정하지 않는다. */
export type PreviewMaterial = {
  items: TextbookItem[];
  snapshots: ProblemSnapshot[];
  assets: AssetRef[];
  concepts: TextbookConcept[];
  qrTargets: QrTarget[];
  conceptQrTargets: ConceptQrTarget[];
  /** Authorized dialogue source only; the preview measures one selected unit within the normal cap. */
  dialogueUnits?: TextbookExchange["units"];
};

export interface TextbookStudioApi {
  listBooks(): Promise<BookSummary[]>;
  createBook(input: {
    title: string;
    volumeCode: string;
    curriculumVersion: string;
    pageTarget: number;
    videoPolicy: VideoPolicy;
    studentSolutionPolicy: SolutionPolicy;
    requestId: string;
    /** 다시 시도가 같은 요청으로 읽히려면 교재 번호도 같아야 한다 — 없으면 새로 짓는다 */
    bookId?: string;
    schoolLevel?: "elementary" | "middle" | "high";
    grade?: number;
    semester?: 1 | 2;
    mode?: "integrated" | "concept" | "practice";
    innerMarginMm?: number;
    outerMarginMm?: number;
    coverMode?: "included" | "separate";
  }): Promise<BookSummary>;
  openEdition(editionId: string): Promise<EditionDetail>;
  createEdition(
    bookId: string,
    sourceEditionId: string,
    requestId: string,
  ): Promise<EditionDetail>;
  getSection(editionId: string, sectionId: string): Promise<SectionDetail>;
  createSection(input: {
    editionId: string;
    unitKey: string;
    sectionKey: string;
    templateKey: string;
    title: string;
    requestId: string;
  }): Promise<SectionDetail>;
  saveSection(input: {
    editionId: string;
    sectionId: string;
    expectedRevision: number;
    requestId: string;
    section: SectionDetail;
  }): Promise<SaveSectionResult>;
  patchEdition(input: {
    editionId: string;
    expectedRevision: number;
    requestId: string;
    source: TextbookEditionDetail;
  }): Promise<EditionDetail>;
  deleteSection(
    editionId: string,
    sectionId: string,
    expectedRevision: number,
    requestId: string,
  ): Promise<void>;
  captureItems(input: {
    editionId: string;
    sectionId: string;
    expectedRevision: number;
    requestId: string;
    testId: string | null;
    problemIds: string[];
  }): Promise<CaptureResult>;
  diffItem(editionId: string, itemId: string): Promise<SnapshotDiff>;
  recaptureItem(
    editionId: string,
    itemId: string,
    requestId: string,
    expectedRevision: number,
  ): Promise<{ item: ItemRow; aggregateRevision: number }>;
  readItemDetail(
    editionId: string,
    itemId: string,
  ): Promise<{ candidates: ItemLinkCandidate[] }>;
  linkItem(
    editionId: string,
    itemId: string,
    requestId: string,
    expectedRevision: number,
    problemId: string,
  ): Promise<{ item: ItemRow; aggregateRevision: number }>;
  registerItem(
    editionId: string,
    itemId: string,
    requestId: string,
    expectedRevision: number,
    fields: RegisterFields,
  ): Promise<RegisterItemResult>;
  /** 발행본의 배치로 기존 시험지를 만든다. 제목은 저장되지 않는다. */
  reissue(input: {
    editionId: string;
    requestId: string;
    itemIds: string[];
    classId: string;
    title?: string;
    testType: "daily" | "review";
    rangeEndUnitId: string;
  }): Promise<ReissueResult>;
  listUnits(): Promise<NamedChoice[]>;
  listClasses(): Promise<NamedChoice[]>;
  listStudents(classId: string): Promise<NamedChoice[]>;
  listOwnedTests(classId: string, studentId?: string): Promise<NamedChoice[]>;
  listUnitProblems(unitId: string): Promise<NamedChoice[]>;
  readPreviewMaterial(editionId: string): Promise<PreviewMaterial>;
  saveConcept(input: {
    editionId: string;
    conceptKey: string;
    expectedRevision: number;
    requestId: string;
    concept: ConceptDraft;
    picks: BlankPick[];
    source: TextbookConcept | null;
    unitKey: string;
    sectionKey: string | null;
    links: TextbookConcept["links"];
    confirmEntryIds: string[];
    confirmLinkIds: string[];
  }): Promise<{
    revision: number;
    aggregateRevision: number;
    concept: TextbookConcept;
  }>;
  searchCatalog(query: string): Promise<BlankPick[]>;
  recordObservation(input: {
    editionId: string;
    conceptKey: string;
    requestId: string;
    studentId: string;
    form: BlankForm;
    observation: string;
  }): Promise<{ reviewStatus: "pending" | "checked" | "needs-review" }>;
  readConcept(
    editionId: string,
    conceptKey: string,
  ): Promise<{
    concept: TextbookConcept;
    revision: number;
    draft: ConceptDraft;
  }>;
  listAssignments(editionId: string): Promise<AssignmentRow[]>;
  createAssignment(input: {
    editionId: string;
    requestId: string;
    target: AssignmentRow["target"];
    startsAt: string;
    expiresAt: string | null;
  }): Promise<AssignmentRow>;
  revokeAssignment(
    editionId: string,
    assignmentId: string,
    requestId: string,
  ): Promise<void>;
  listVideos(editionId: string): Promise<VideoBinding[]>;
  /** 내가 등록한 영상 — 연결할 때 고른다. 연결이 있어도 목록에서 사라지지 않는다. */
  listVideoChoices(): Promise<NamedChoice[]>;
  /** 단원의 게시된 개념 강의. 문항 영상 바인딩이 아니다. */
  listUnitLectures(unitId: string): Promise<
    Array<{
      lectureId: string;
      title: string;
      status: "draft" | "published" | "archived";
    }>
  >;
  createVideo(input: {
    requestId: string;
    title: string;
    providerVideoId: string;
  }): Promise<VideoBinding>;
  bindVideo(input: {
    snapshotId: string;
    requestId: string;
    videoId: string;
    startSeconds: number;
    endSeconds: number | null;
    status: VideoStatus;
    contentHash: string;
  }): Promise<VideoBinding>;
  updateVideo(input: {
    bindingId: string;
    requestId: string;
    status: VideoStatus;
    policy: VideoBinding["policy"];
    videoId: string;
    startSeconds: number;
    endSeconds: number | null;
    contentHash: string | null;
  }): Promise<VideoBinding>;
  preflight(editionId: string, requestId: string): Promise<PreflightResult>;
  reserve(
    editionId: string,
    requestId: string,
    expectedRevision: number,
  ): Promise<PublishJob>;
  stepPublish(editionId: string, requestId: string): Promise<PublishJob>;
  finalize(editionId: string, requestId: string): Promise<PublishJob>;
  readJob(editionId: string, jobId: string): Promise<PublishJob>;
  readExport(editionId: string): Promise<{ href: string; label: string }>;
  importPackage(input: {
    mode: ImportMode;
    file: Blob;
    fileName: string;
    requestId: string;
  }): Promise<ImportResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string, status = 200): never {
  throw new TextbookRequestError(message, status);
}

function parseRequest<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    fail(
      message && !message.startsWith("Invalid")
        ? message
        : "요청 값이 계약과 맞지 않습니다.",
      400,
    );
  }
  return parsed.data;
}

function parseData<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const envelope = z.strictObject({ data: z.unknown() }).safeParse(body);
  if (!envelope.success) fail(LOAD_ERROR);
  const parsed = schema.safeParse(envelope.data.data);
  if (!parsed.success) fail(LOAD_ERROR);
  return parsed.data;
}

function parseWhole<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) fail(LOAD_ERROR);
  return parsed.data;
}

async function readAllPages<T>(
  fetchImpl: typeof fetch,
  schema: z.ZodType<{
    data: T[];
    meta: { total: number };
  }>,
  urlFor: (page: number) => string,
): Promise<T[]> {
  const rows: T[] = [];
  let total = 0;
  for (let page = 1; page <= 20; page += 1) {
    const parsed = parseWhole(schema, await request(fetchImpl, urlFor(page)));
    if (page === 1) total = parsed.meta.total;
    else if (parsed.meta.total !== total) {
      fail("목록이 바뀌었습니다. 다시 불러오세요.");
    }
    rows.push(...parsed.data);
    if (rows.length >= total) return rows;
    if (parsed.data.length === 0) break;
  }
  fail("목록이 더 있습니다. 거르기를 좁히세요.");
}

function studioIssues(issues: TextbookIssue[]): StudioIssue[] {
  return issues.map((issue) => ({
    severity: issue.severity,
    message: issue.message,
    ...(issue.sectionId ? { sectionId: issue.sectionId } : {}),
    ...(issue.path.length > 0 ? { path: issue.path.join(" › ") } : {}),
  }));
}

function knownSpeaker(id: string): Speaker | null {
  if (id === SPEAKER_ID.선생님) return "선생님";
  if (id === SPEAKER_ID.민서) return "민서";
  if (id === SPEAKER_ID.지호) return "지호";
  const character = getTextbookCharacter(id.replace(/^tb-portrait-/, ""));
  if (character)
    return character.role === "teacher"
      ? "선생님"
      : character.gender === "female"
        ? "민서"
        : "지호";
  return null;
}

function speakerOf(id: string): Speaker {
  return knownSpeaker(id) ?? "선생님";
}

function expressionOf(
  value: "neutral" | "question" | "thinking" | "aha",
): Expression {
  if (value === "question") return "질문";
  if (value === "thinking") return "생각";
  if (value === "aha") return "알아챔";
  return "평온";
}

function linesOf(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function toBook(row: TextbookBookSummary): BookSummary {
  return {
    bookId: row.id,
    title: row.title,
    shared: row.visibility === "branch",
    archived: row.archivedAt !== null,
    activeEditionId: row.draftEditionId,
  };
}

function statusFor(
  sectionId: string,
  issues: TextbookIssue[],
): SectionDetail["status"] {
  const related = issues.filter((issue) => issue.sectionId === sectionId);
  if (related.some((issue) => issue.severity === "error")) return "error";
  if (related.some((issue) => issue.severity === "warning"))
    return "needs-review";
  return "saved";
}

function toEdition(detail: TextbookEditionDetail): EditionDetail {
  return {
    editionId: detail.edition.editionId,
    bookId: detail.book.id,
    title: detail.config.title,
    structureRevision: detail.structureRevision,
    aggregateRevision: detail.edition.revision,
    structureSource: detail,
    config: {
      paper: "A4",
      workLineMm: 7,
      answerPolicy:
        detail.config.studentSolutionPolicy === "assigned"
          ? "assigned-qr"
          : "never",
      volumeCode: detail.config.displayCode,
      videoPolicy: detail.config.videoPolicy,
      studentSolutionPolicy: detail.config.studentSolutionPolicy ?? "never",
    },
    units: detail.outline.map((unit) => ({
      unitKey: unit.unitKey,
      title: unit.title,
      sections: unit.sections.map((section) => ({
        sectionId: section.id,
        title: section.title,
        status: statusFor(section.id, detail.issues),
        parity: "unconfirmed" as const,
      })),
    })),
  };
}

function fromTurn(
  turn: Extract<ManuscriptBlock, { kind: "dialogue" }>["turns"][number],
  index: number,
): DialogueTurn {
  return {
    id: `${turn.speakerId}-${index}`,
    speaker: speakerOf(turn.speakerId),
    speakerId: turn.speakerId,
    expression: expressionOf(turn.expression),
    side: turn.side === "left" ? "왼쪽" : "오른쪽",
    text: turn.markdown,
    portraitAssetId: turn.portraitAssetId,
    mirror: turn.mirrorPortrait,
    ...(turn.presentation ? { presentation: turn.presentation } : {}),
  };
}

function fromBlock(block: ManuscriptBlock): SectionBlock {
  const semantic = block.semantic ? { semantic: block.semantic } : {};
  switch (block.kind) {
    case "text":
      return {
        id: block.blockId,
        kind: "text",
        text: block.markdown,
        ...semantic,
      };
    case "problem":
      return {
        id: block.blockId,
        kind: "problems",
        itemIds: [block.itemId],
        ...semantic,
      };
    case "image":
      return {
        id: block.blockId,
        kind: "image",
        assetId: block.assetId,
        caption: block.caption ?? "",
        ...semantic,
      };
    case "dialogue":
      return {
        id: block.blockId,
        kind: "dialogue",
        turns: block.turns.map(fromTurn),
        ...semantic,
      };
    case "concept":
      return {
        id: block.blockId,
        kind: "concept",
        conceptKey: block.conceptKey,
        ...semantic,
      };
    case "concept-recall":
      return {
        id: block.blockId,
        kind: "concept-recall",
        conceptKey: block.conceptKey ?? "",
        phase: block.phase,
        text: block.markdown,
        showRepetitionChecks: block.showRepetitionChecks,
        ...semantic,
      };
  }
}

function fromRecord(
  record: TextbookSectionRecord,
  editionId: string,
): SectionDetail {
  return {
    sectionId: record.id,
    editionId,
    unitKey: record.unitKey,
    sectionKey: record.section.sectionKey,
    templateKey: record.section.templateKey,
    title: record.section.title,
    revision: record.revision,
    aggregateRevision: record.revision,
    status: "saved",
    parity: record.section.startPolicy,
    parityMessage: null,
    blocks: record.section.blocks.map(fromBlock),
    // 구획 정답 메모 — 서버에 없으면 빈 글로 보여 준다(저장할 때는 빈 글이면 칸을 뺀다)
    answer: record.section.teacherAnswer ?? "",
    portraits: [],
    picks: [],
    items: record.section.blocks.flatMap((block) =>
      block.kind === "problem"
        ? [
            {
              itemId: block.itemId,
              problemId: "",
              label: "문항",
              snapshotHash: null,
              currentHash: null,
              state: "uncompared" as const,
            },
          ]
        : [],
    ),
    concept: null,
  };
}

function toWireTurn(turn: DialogueTurn) {
  if (turn.side === "왼쪽" && turn.mirror)
    fail("왼쪽 초상은 뒤집지 않습니다.", 400);
  if (!turn.portraitAssetId) fail("초상화 자료가 없습니다.", 400);
  return {
    speakerId: turn.speakerId || SPEAKER_ID[turn.speaker],
    side: turn.side === "왼쪽" ? ("left" as const) : ("right" as const),
    expression: EXPRESSION_WIRE[turn.expression],
    portraitAssetId: turn.portraitAssetId,
    mirrorPortrait: turn.mirror,
    markdown: turn.text,
    ...(turn.presentation ? { presentation: turn.presentation } : {}),
  };
}

function toWireBlock(block: SectionBlock): ManuscriptBlock | ManuscriptBlock[] {
  const semantic = block.semantic ? { semantic: block.semantic } : {};
  switch (block.kind) {
    case "text":
      return {
        blockId: block.id,
        kind: "text",
        markdown: block.text,
        ...semantic,
      };
    case "problems": {
      const itemId = block.itemIds[0];
      if (!itemId || block.itemIds.length !== 1)
        fail("문항 블록은 한 문항씩 저장합니다.", 400);
      return { blockId: block.id, kind: "problem", itemId, ...semantic };
    }
    case "image":
      return {
        blockId: block.id,
        kind: "image",
        assetId: block.assetId,
        caption: block.caption.length > 0 ? block.caption : null,
        ...semantic,
      };
    case "dialogue":
      return {
        blockId: block.id,
        kind: "dialogue",
        turns: block.turns.map(toWireTurn),
        ...semantic,
      };
    case "concept":
      return {
        blockId: block.id,
        kind: "concept",
        conceptKey: block.conceptKey,
        ...semantic,
      };
    case "concept-recall":
      if (block.phase !== "study" && block.showRepetitionChecks) {
        fail("핵심어·문장 단계에는 반복 확인란을 표시하지 않습니다.", 400);
      }
      return {
        blockId: block.id,
        kind: "concept-recall",
        phase: block.phase,
        markdown: block.text,
        showRepetitionChecks: block.showRepetitionChecks,
        ...(block.conceptKey ? { conceptKey: block.conceptKey } : {}),
        ...semantic,
      };
  }
}

function toWireSection(section: SectionDetail): Section {
  if (section.parity !== "even-left" && section.parity !== "continue") {
    fail("시작 면이 정해지지 않아 저장하지 않습니다.", 400);
  }
  return {
    sectionKey: section.sectionKey,
    title: section.title,
    templateKey: section.templateKey,
    startPolicy: section.parity,
    blocks: section.blocks.flatMap(toWireBlock),
    // 빈 글 · 공백뿐인 글은 칸을 뺀다 — 빈 값을 실으면 판본 해시가 달라진다
    ...(section.answer.trim().length > 0
      ? { teacherAnswer: section.answer }
      : {}),
  };
}

function linkLabel(
  status: "unlinked" | "candidate" | "linked" | "needs-review",
): string {
  if (status === "unlinked") return "연결 없음";
  if (status === "candidate") return "후보";
  if (status === "linked") return "연결됨";
  return "검수 필요";
}

function toItem(item: z.infer<typeof textbookItemSchema>): ItemRow {
  return {
    itemId: item.itemId,
    problemId: item.sourceTestProblemId ?? "",
    label: `${item.displayNumber} · ${linkLabel(item.linkStatus)}`,
    snapshotHash: null,
    currentHash: null,
    state: "uncompared",
  };
}

function toAssignment(row: TextbookAssignment): AssignmentRow {
  return {
    assignmentId: row.id,
    target:
      row.subject.kind === "class"
        ? { kind: "class", classId: row.subject.classId, label: "반" }
        : { kind: "student", studentId: row.subject.studentId, label: "학생" },
    startsAt: row.startsAt,
    expiresAt: row.expiresAt,
    revoked: row.revokedAt !== null,
  };
}

function videoStatusOf(
  status: "draft" | "review" | "published" | "withdrawn",
): VideoStatus {
  if (status === "review") return "pending-review";
  if (status === "published") return "published";
  if (status === "withdrawn") return "stopped";
  return "draft";
}

function videoStatusWire(
  status: VideoStatus,
): "draft" | "review" | "published" | "withdrawn" {
  if (status === "pending-review") return "review";
  if (status === "published") return "published";
  if (status === "stopped") return "withdrawn";
  return "draft";
}

function toBinding(
  row: z.infer<typeof textbookVideoBindingSchema>,
): VideoBinding {
  return {
    bindingId: row.bindingId,
    videoId: row.videoId,
    snapshotId: row.snapshotId,
    role: "problem-solution",
    status: videoStatusOf(row.status),
    policy: "unknown",
    label: "영상",
    startSeconds: row.startSeconds,
    endSeconds: row.endSeconds,
    contentHash: row.reviewedAgainstHash,
  };
}

function toVideo(row: z.infer<typeof textbookVideoSchema>): VideoBinding {
  return {
    bindingId: row.id,
    videoId: row.id,
    snapshotId: "",
    role: "concept-prep",
    status: "draft",
    policy: "unknown",
    label: row.title,
    startSeconds: 0,
    endSeconds: null,
    contentHash: null,
  };
}

function toJob(job: TextbookPublishJob): PublishJob {
  const status =
    job.status === "published"
      ? "finalized"
      : job.status === "rendering" || job.status === "verifying"
        ? "running"
        : job.status === "ready"
          ? "ready"
          : job.status === "failed"
            ? "failed"
            : "reserved";
  return {
    jobId: job.requestId,
    status,
    issues: studioIssues(job.issues),
    completedSteps: job.completedSteps,
    totalSteps: job.totalSteps,
    artifacts: job.artifacts,
  };
}

function toDraft(concept: TextbookConcept): ConceptDraft {
  return {
    conceptKey: concept.conceptKey,
    title: concept.title,
    kind: concept.kind,
    goal: concept.body.goal,
    prerequisites: concept.body.prerequisites.join("\n"),
    definition: concept.body.definition,
    conditions: concept.body.conditions ?? "",
    examples: concept.body.examples.join("\n"),
    counterexamples: concept.body.counterexamples.join("\n"),
    misconceptions: concept.body.misconceptions.join("\n"),
    explainPrompt: concept.body.explainPrompt ?? "",
    blankForms: concept.blankForms ? [...concept.blankForms] : [],
  };
}

function formsFor(
  entryKind: BlankPick["entryKind"],
  givenCase: boolean,
): BlankForm[] {
  if (entryKind === "ox") return ["term"];
  if (entryKind === "apply") return ["cloze"];
  if (entryKind === "figure") return ["figure"];
  return givenCase ? ["term", "cloze"] : ["term", "cloze"];
}

function picksFromCatalog(
  body: z.infer<typeof textbookConceptCatalogSchema>,
): BlankPick[] {
  return body.entries.flatMap((entry) => {
    const givenCase =
      entry.entryKind === "concept" && entry.payload.givenCase === true;
    const level: BlankLevel =
      entry.payload.level === "하" || entry.payload.level === "상"
        ? entry.payload.level
        : "중";
    return formsFor(entry.entryKind, givenCase).map((form) => ({
      blankSectionKey: entry.payload.section,
      entryKind: entry.entryKind,
      entryId: entry.payload.id,
      form,
      level,
      reviewStatus: "candidate" as const,
    }));
  });
}

function applyConceptEdits(
  source: TextbookConcept,
  concept: ConceptDraft,
  picks: BlankPick[],
  links: TextbookConcept["links"],
): TextbookConcept {
  const reviews = new Map(
    picks.map((pick) => [
      `${pick.entryKind}:${pick.entryId}`,
      pick.reviewStatus,
    ]),
  );
  const blankItems = source.blankItems.map((item) => {
    const status = reviews.get(`${item.entryKind}:${item.entryId}`);
    if (!status || status === "confirmed" || status === item.review.status)
      return item;
    return {
      ...item,
      review: {
        status,
        candidateRule: item.review.candidateRule,
        reviewedBy: null,
        reviewedAt: null,
        targetHash: null,
      },
    };
  });
  const seen = new Set(
    blankItems.map((item) => `${item.entryKind}:${item.entryId}`),
  );
  for (const pick of picks) {
    const key = `${pick.entryKind}:${pick.entryId}`;
    if (seen.has(key) || pick.reviewStatus === "confirmed") continue;
    seen.add(key);
    blankItems.push({
      blankSectionKey: pick.blankSectionKey,
      entryKind: pick.entryKind,
      entryId: pick.entryId,
      review: {
        status: pick.reviewStatus === "rejected" ? "rejected" : "candidate",
        candidateRule: "manual",
        reviewedBy: null,
        reviewedAt: null,
        targetHash: null,
      },
    });
  }
  const next: TextbookConcept = {
    ...source,
    title: concept.title,
    kind: concept.kind,
    body: {
      ...source.body,
      goal: concept.goal,
      prerequisites: linesOf(concept.prerequisites),
      definition: concept.definition,
      conditions: concept.conditions.trim() ? concept.conditions : null,
      examples: linesOf(concept.examples),
      counterexamples: linesOf(concept.counterexamples),
      misconceptions: linesOf(concept.misconceptions),
      explainPrompt: concept.explainPrompt.trim()
        ? concept.explainPrompt
        : null,
    },
    blankItems,
    links,
  };
  if (concept.blankForms.length > 0) next.blankForms = [...concept.blankForms];
  else delete next.blankForms;
  return next;
}

function blankConcept(
  unitKey: string,
  sectionKey: string | null,
  concept: ConceptDraft,
): TextbookConcept {
  return {
    conceptKey: concept.conceptKey,
    unitKey,
    sectionKey,
    title: concept.title,
    kind: concept.kind,
    unitId: null,
    body: {
      goal: concept.goal,
      prerequisites: [],
      definition: concept.definition,
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [],
    links: [],
    mappingVersion: "1",
    derivedFromConceptKey: null,
    frozen: null,
  };
}

function parseItemMutation(body: unknown): {
  item: ItemRow;
  aggregateRevision: number;
} {
  const parsed = parseData(textbookItemMutationResultSchema, body);
  return {
    item: toItem(parsed.item),
    aggregateRevision: parsed.aggregateRevision,
  };
}

function errorMessage(body: unknown, status: number): TextbookRequestError {
  const row = isRecord(body) ? body : null;
  const error = row && isRecord(row.error) ? row.error : null;
  const message =
    error && typeof error.message === "string" && error.message
      ? error.message
      : LOAD_ERROR;
  const details = error && isRecord(error.details) ? error.details : null;
  const serverRevision =
    details &&
    typeof details.serverRevision === "number" &&
    Number.isSafeInteger(details.serverRevision)
      ? details.serverRevision
      : null;
  let serverSection: SectionDetail | null = null;
  if (details && details.serverSection) {
    const parsed = textbookSectionRecordSchema.safeParse(details.serverSection);
    if (parsed.success) serverSection = fromRecord(parsed.data, "");
  }
  let issues: StudioIssue[] = [];
  if (details && Array.isArray(details.issues)) {
    const parsed = z.array(textbookIssueSchema).safeParse(details.issues);
    if (parsed.success) issues = studioIssues(parsed.data);
  }
  return new TextbookRequestError(message, status, {
    serverRevision,
    serverSection,
    issues,
  });
}

async function request(
  fetchImpl: typeof fetch,
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetchImpl(url, { cache: "no-store", ...init });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) throw errorMessage(body, response.status);
  return body;
}

function jsonInit(method: string, payload: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function parseVideoList(body: unknown): VideoBinding[] {
  const envelope = z.strictObject({ data: z.unknown() }).safeParse(body);
  if (envelope.success) {
    const listed = textbookVideoListSchema.safeParse(envelope.data.data);
    if (listed.success) {
      if (listed.data.bindings.length > 0) {
        return listed.data.bindings.map(toBinding);
      }
      return listed.data.videos.map(toVideo);
    }
  }
  const bindings = dataResponseSchema(
    z.array(textbookVideoBindingSchema),
  ).safeParse(body);
  if (bindings.success) return bindings.data.data.map(toBinding);
  const videos = dataResponseSchema(z.array(textbookVideoSchema)).safeParse(
    body,
  );
  if (videos.success) return videos.data.data.map(toVideo);
  fail(LOAD_ERROR);
}

/** 다시 고정만 이 본문을 쓴다. 연결·등록은 다른 동작이라 같은 본문을 보내지 않는다. */
async function recaptureAction(
  fetchImpl: typeof fetch,
  editionId: string,
  itemId: string,
  requestId: string,
  expectedRevision: number,
): Promise<{ item: ItemRow; aggregateRevision: number }> {
  const payload = parseRequest(textbookSnapshotActionSchema, {
    requestId,
    expectedRevision,
  });
  return parseItemMutation(
    await request(
      fetchImpl,
      `${BASE}/editions/${editionId}/items/${itemId}/recapture`,
      jsonInit("POST", payload),
    ),
  );
}

function completeUploadPayload(
  byteLength: number,
  fileName: string,
): { byteLength: number; fileName?: string } {
  const name = fileName.trim().slice(0, 255);
  return name.length > 0 ? { byteLength, fileName: name } : { byteLength };
}

export function createTextbookApi(
  fetchImpl: typeof fetch = fetch,
): TextbookStudioApi {
  return {
    async listBooks() {
      const body = await request(fetchImpl, `${BASE}/books`);
      const parsed = textbookBookListSchema.safeParse(body);
      if (!parsed.success) fail(LOAD_ERROR);
      return parsed.data.data.map(toBook);
    },
    async createBook(input) {
      const bookId = input.bookId ?? crypto.randomUUID();
      const payload = parseRequest(textbookCreateBookSchema, {
        requestId: input.requestId,
        config: {
          bookId,
          schoolLevel: input.schoolLevel ?? "elementary",
          grade: input.grade ?? 5,
          semester: input.semester ?? 1,
          volume: 1,
          volumeCount: 1,
          displayCode: input.volumeCode,
          title: input.title,
          curriculumVersion: input.curriculumVersion,
          mode: input.mode ?? "integrated",
          pageBudget: { target: input.pageTarget, tolerance: 0, strict: false },
          print: {
            paper: "A4",
            innerMarginMm: input.innerMarginMm ?? 15,
            outerMarginMm: input.outerMarginMm ?? 15,
            sectionStart: "even-left",
            coverMode: input.coverMode ?? "separate",
            firstPhysicalPageIndex: 1,
          },
          videoPolicy: input.videoPolicy,
          studentSolutionPolicy: input.studentSolutionPolicy,
        },
      });
      return toBook(
        parseData(
          textbookBookSummarySchema,
          await request(fetchImpl, `${BASE}/books`, jsonInit("POST", payload)),
        ),
      );
    },
    async openEdition(editionId) {
      return toEdition(
        parseData(
          textbookEditionDetailSchema,
          await request(fetchImpl, `${BASE}/editions/${editionId}`),
        ),
      );
    },
    async createEdition(bookId, sourceEditionId, requestId) {
      const payload = parseRequest(textbookCreateEditionSchema, {
        requestId,
        sourceEditionId,
        label: "복사본",
      });
      return toEdition(
        parseData(
          textbookEditionDetailSchema,
          await request(
            fetchImpl,
            `${BASE}/books/${bookId}/editions`,
            jsonInit("POST", payload),
          ),
        ),
      );
    },
    async getSection(editionId, sectionId) {
      return fromRecord(
        parseData(
          textbookSectionRecordSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${editionId}/sections/${sectionId}`,
          ),
        ),
        editionId,
      );
    },
    async createSection(input) {
      const sectionId = crypto.randomUUID();
      const payload = parseRequest(textbookSaveSectionSchema, {
        requestId: input.requestId,
        expectedRevision: 0,
        unitKey: input.unitKey,
        section: {
          sectionKey: input.sectionKey,
          title: input.title,
          templateKey: input.templateKey,
          startPolicy: "continue",
          blocks: [],
        },
      });
      const saved = parseData(
        textbookSaveSectionResultSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${input.editionId}/sections/${sectionId}`,
          jsonInit("PUT", payload),
        ),
      );
      const detail = fromRecord(saved.section, input.editionId);
      return {
        ...detail,
        aggregateRevision: saved.aggregateRevision,
        status: "draft",
      };
    },
    async saveSection(input) {
      const payload = parseRequest(textbookSaveSectionSchema, {
        requestId: input.requestId,
        expectedRevision: input.expectedRevision,
        unitKey: input.section.unitKey,
        section: toWireSection(input.section),
      });
      const saved = parseData(
        textbookSaveSectionResultSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${input.editionId}/sections/${input.sectionId}`,
          jsonInit("PUT", payload),
        ),
      );
      return {
        revision: saved.section.revision,
        aggregateRevision: saved.aggregateRevision,
      };
    },
    async patchEdition(input) {
      const payload = parseRequest(textbookSaveStructureSchema, {
        requestId: input.requestId,
        expectedRevision: input.expectedRevision,
        config: input.source.config,
        outline: input.source.outline,
      });
      return toEdition(
        parseData(
          textbookEditionDetailSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${input.editionId}`,
            jsonInit("PATCH", payload),
          ),
        ),
      );
    },
    async deleteSection(editionId, sectionId, expectedRevision, requestId) {
      const payload = parseRequest(textbookDeleteSectionSchema, {
        requestId,
        expectedRevision,
      });
      await request(
        fetchImpl,
        `${BASE}/editions/${editionId}/sections/${sectionId}`,
        jsonInit("DELETE", payload),
      );
    },
    async captureItems(input) {
      if (input.testId && input.problemIds.length > 0) {
        fail("시험지와 문제 목록은 함께 보내지 않습니다.", 400);
      }
      const source = input.testId
        ? { kind: "test" as const, testId: input.testId }
        : { kind: "problems" as const, problemIds: input.problemIds };
      const payload = parseRequest(textbookCaptureItemsSchema, {
        requestId: input.requestId,
        expectedRevision: input.expectedRevision,
        sectionId: input.sectionId,
        source,
      });
      const result = parseData(
        textbookCaptureResultSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${input.editionId}/items`,
          jsonInit("POST", payload),
        ),
      );
      return {
        items: result.items.map(toItem),
        excluded: result.excluded,
        aggregateRevision: result.aggregateRevision,
      };
    },
    async diffItem(editionId, itemId) {
      const diff = parseData(
        textbookItemDiffSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${editionId}/items/${itemId}/diff`,
          { method: "POST" },
        ),
      );
      return { itemId: diff.itemId, summary: diff.summary };
    },
    async recaptureItem(editionId, itemId, requestId, expectedRevision) {
      return recaptureAction(
        fetchImpl,
        editionId,
        itemId,
        requestId,
        expectedRevision,
      );
    },
    async readItemDetail(editionId, itemId) {
      const detail = parseData(
        textbookItemDetailSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${editionId}/items/${itemId}`,
        ),
      );
      return {
        candidates: detail.linkCandidates.map((row) => ({
          problemId: row.problemId,
          problemCode: row.problemCode,
        })),
      };
    },
    async linkItem(editionId, itemId, requestId, expectedRevision, problemId) {
      const payload = parseRequest(textbookLinkItemSchema, {
        requestId,
        expectedRevision,
        problemId,
      });
      return parseItemMutation(
        await request(
          fetchImpl,
          `${BASE}/editions/${editionId}/items/${itemId}/link`,
          jsonInit("POST", payload),
        ),
      );
    },
    async registerItem(editionId, itemId, requestId, expectedRevision, fields) {
      const payload = parseRequest(textbookRegisterItemSchema, {
        requestId,
        expectedRevision,
        unitId: fields.unitId,
        difficulty: fields.difficulty,
        problemType: fields.problemType,
      });
      const result = parseData(
        textbookRegisterItemResultSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${editionId}/items/${itemId}/register`,
          jsonInit("POST", payload),
        ),
      );
      return {
        item: toItem(result.item),
        aggregateRevision: result.aggregateRevision,
        problem: result.problem,
        candidates: result.linkCandidates.map((row) => ({
          problemId: row.problemId,
          problemCode: row.problemCode,
        })),
      };
    },
    async reissue(input) {
      const payload = parseRequest(textbookReissueSchema, {
        requestId: input.requestId,
        itemIds: input.itemIds,
        classId: input.classId,
        ...(input.title ? { title: input.title } : {}),
        testType: input.testType,
        rangeEndUnitId: input.rangeEndUnitId,
      });
      return parseData(
        textbookReissueResultSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${input.editionId}/reissue`,
          jsonInit("POST", payload),
        ),
      );
    },
    async listUnits() {
      const parsed = parseWhole(
        unitListResponseSchema,
        await request(fetchImpl, "/api/units"),
      );
      return parsed.data.map((unit) => ({
        id: unit.id,
        label: `${unit.grade} ${unit.chapter} ${unit.section}`,
      }));
    },
    async listClasses() {
      const rows = await readAllPages(
        fetchImpl,
        classListResponseSchema,
        (page) => `/api/classes?page=${page}&pageSize=100`,
      );
      return rows.map((row) => ({
        id: row.id,
        label: `${row.name} · ${row.grade}`,
      }));
    },
    async listStudents(classId) {
      const rows = await readAllPages(
        fetchImpl,
        studentListResponseSchema,
        (page) =>
          `/api/students?classId=${encodeURIComponent(classId)}&page=${page}&pageSize=100`,
      );
      return rows.map((row) => ({ id: row.id, label: row.name }));
    },
    async listOwnedTests(classId, studentId) {
      const rows = await readAllPages(
        fetchImpl,
        testListResponseSchema,
        (page) => {
          const query = new URLSearchParams({
            classId,
            page: String(page),
            pageSize: "100",
          });
          if (studentId) query.set("studentId", studentId);
          return `/api/tests?${query.toString()}`;
        },
      );
      return rows.map((row) => ({
        id: row.id,
        label:
          row.testType === "daily"
            ? `${row.testDate} 일일테스트`
            : `${row.testDate} 확인테스트`,
      }));
    },
    async listUnitProblems(unitId) {
      const rows = await readAllPages(
        fetchImpl,
        problemListResponseSchema,
        (page) =>
          `/api/problems?unitId=${encodeURIComponent(unitId)}&page=${page}&pageSize=100`,
      );
      return rows.map((row) => ({ id: row.id, label: row.problemCode }));
    },
    async readPreviewMaterial(editionId) {
      const parsed = parseWhole(
        textbookExportResponseSchema,
        await request(fetchImpl, `${BASE}/editions/${editionId}/export`),
      );
      const dialogueUnits = parsed.data.units
        .map((unit) => ({
          ...unit,
          sections: unit.sections
            .map((section) => ({
              ...section,
              blocks: section.blocks.filter(
                (block) =>
                  Boolean(block.semantic) &&
                  (block.kind === "dialogue" ||
                    (block.kind === "text" &&
                      block.semantic?.node?.kind === "board")),
              ),
            }))
            .filter((section) => section.blocks.length > 0),
        }))
        .filter((unit) => unit.sections.length > 0);
      return {
        items: parsed.data.items,
        snapshots: parsed.data.snapshots,
        assets: parsed.data.assets,
        concepts: parsed.data.conceptIntegration?.concepts ?? [],
        qrTargets: parsed.data.qrTargets,
        conceptQrTargets: parsed.data.conceptQrTargets ?? [],
        ...(dialogueUnits.length ? { dialogueUnits } : {}),
      };
    },
    async readConcept(editionId, conceptKey) {
      const record = parseData(
        textbookConceptRecordSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${editionId}/concepts/${conceptKey}`,
        ),
      );
      return {
        concept: record.concept,
        revision: record.revision,
        draft: toDraft(record.concept),
      };
    },
    async saveConcept(input) {
      const forms = input.concept.blankForms;
      if (new Set(forms).size !== forms.length || forms.length > 5) {
        fail("백지 형식을 중복 없이 다섯까지 고릅니다.", 400);
      }
      const base =
        input.source ??
        blankConcept(input.unitKey, input.sectionKey, input.concept);
      const payload = parseRequest(textbookSaveConceptSchema, {
        requestId: input.requestId,
        expectedRevision: input.expectedRevision,
        concept: applyConceptEdits(
          base,
          input.concept,
          input.picks,
          input.links,
        ),
        ...(input.confirmEntryIds.length > 0
          ? { confirmBlankEntryIds: input.confirmEntryIds }
          : {}),
        ...(input.confirmLinkIds.length > 0
          ? { confirmLinkIds: input.confirmLinkIds }
          : {}),
      });
      const saved = parseData(
        textbookConceptRecordSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${input.editionId}/concepts/${encodeURIComponent(input.conceptKey)}`,
          jsonInit("PUT", payload),
        ),
      );
      return {
        revision: saved.revision,
        aggregateRevision: saved.aggregateRevision,
        concept: saved.concept,
      };
    },
    async recordObservation(input) {
      const payload = parseRequest(textbookObservationCreateSchema, {
        requestId: input.requestId,
        studentId: input.studentId,
        form: input.form,
        observation: input.observation,
      });
      const saved = parseData(
        textbookConceptAttemptSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${input.editionId}/concepts/${encodeURIComponent(input.conceptKey)}/attempts`,
          jsonInit("POST", payload),
        ),
      );
      return { reviewStatus: saved.reviewStatus };
    },
    async searchCatalog(query) {
      const body = await request(
        fetchImpl,
        `${BASE}/concepts/catalog?q=${encodeURIComponent(query)}`,
      );
      return picksFromCatalog(parseData(textbookConceptCatalogSchema, body));
    },
    async listAssignments(editionId) {
      const rows = parseData(
        z.array(textbookAssignmentSchema),
        await request(fetchImpl, `${BASE}/editions/${editionId}/assignments`),
      );
      return rows.map(toAssignment);
    },
    async createAssignment(input) {
      const payload = parseRequest(textbookCreateAssignmentSchema, {
        requestId: input.requestId,
        subject:
          input.target.kind === "class"
            ? { kind: "class", classId: input.target.classId }
            : { kind: "student", studentId: input.target.studentId },
        scope: { kind: "edition" },
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
      });
      return toAssignment(
        parseData(
          textbookAssignmentSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${input.editionId}/assignments`,
            jsonInit("POST", payload),
          ),
        ),
      );
    },
    async revokeAssignment(editionId, assignmentId, requestId) {
      const payload = parseRequest(textbookRequestSchema, { requestId });
      await request(
        fetchImpl,
        `${BASE}/editions/${editionId}/assignments/${assignmentId}`,
        jsonInit("DELETE", payload),
      );
    },
    async listVideos(editionId) {
      return parseVideoList(
        await request(
          fetchImpl,
          `${BASE}/videos?editionId=${encodeURIComponent(editionId)}`,
        ),
      );
    },
    async listVideoChoices() {
      const listed = parseData(
        textbookVideoListSchema,
        await request(fetchImpl, `${BASE}/videos`),
      );
      return listed.videos.map((video) => ({
        id: video.id,
        label: `${video.title} · ${video.providerVideoId}`,
      }));
    },
    async listUnitLectures(unitId) {
      const parsed = parseData(
        textbookConceptLectureListSchema,
        await request(
          fetchImpl,
          `${BASE}/concept-lectures?unitId=${encodeURIComponent(unitId)}`,
        ),
      );
      return parsed.lectures.map((lecture) => ({
        lectureId: lecture.lectureId,
        title: lecture.title,
        status: "published" as const,
      }));
    },
    async createVideo(input) {
      const payload = parseRequest(textbookVideoCreateSchema, {
        requestId: input.requestId,
        title: input.title,
        provider: "youtube",
        providerVideoId: input.providerVideoId,
      });
      return toVideo(
        parseData(
          textbookVideoSchema,
          await request(fetchImpl, `${BASE}/videos`, jsonInit("POST", payload)),
        ),
      );
    },
    async bindVideo(input) {
      const payload = parseRequest(textbookBindingWriteSchema, {
        requestId: input.requestId,
        videoId: input.videoId,
        startSeconds: input.startSeconds,
        endSeconds: input.endSeconds,
        status: videoStatusWire(input.status),
        expectedContentHash: input.contentHash,
      });
      return toBinding(
        parseData(
          textbookVideoBindingSchema,
          await request(
            fetchImpl,
            `${BASE}/snapshots/${input.snapshotId}/bindings`,
            jsonInit("POST", payload),
          ),
        ),
      );
    },
    async updateVideo(input) {
      if (!input.contentHash) fail("게시 검수용 내용 해시가 없습니다.", 400);
      const payload = parseRequest(textbookBindingWriteSchema, {
        requestId: input.requestId,
        videoId: input.videoId,
        startSeconds: input.startSeconds,
        endSeconds: input.endSeconds,
        status: videoStatusWire(input.status),
        expectedContentHash: input.contentHash,
      });
      return toBinding(
        parseData(
          textbookVideoBindingSchema,
          await request(
            fetchImpl,
            `${BASE}/bindings/${input.bindingId}`,
            jsonInit("PATCH", payload),
          ),
        ),
      );
    },
    async preflight(editionId, requestId) {
      const payload = parseRequest(textbookRequestSchema, { requestId });
      const result = parseData(
        textbookPreflightSchema,
        await request(
          fetchImpl,
          `${BASE}/editions/${editionId}/publish/preflight`,
          jsonInit("POST", payload),
        ),
      );
      const issues = studioIssues(result.issues);
      return result.canPublish ? { ok: true, issues } : { ok: false, issues };
    },
    async reserve(editionId, requestId, expectedRevision) {
      const payload = parseRequest(textbookPublishReserveSchema, {
        requestId,
        expectedRevision,
      });
      return toJob(
        parseData(
          textbookPublishJobSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${editionId}/publish/reserve`,
            jsonInit("POST", payload),
          ),
        ),
      );
    },
    async stepPublish(editionId, requestId) {
      const payload = parseRequest(textbookRequestSchema, { requestId });
      return toJob(
        parseData(
          textbookPublishJobSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${editionId}/publish/steps/next`,
            jsonInit("POST", payload),
          ),
        ),
      );
    },
    async finalize(editionId, requestId) {
      const payload = parseRequest(textbookRequestSchema, { requestId });
      return toJob(
        parseData(
          textbookPublishJobSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${editionId}/publish/finalize`,
            jsonInit("POST", payload),
          ),
        ),
      );
    },
    async readJob(editionId, jobId) {
      return toJob(
        parseData(
          textbookPublishJobSchema,
          await request(
            fetchImpl,
            `${BASE}/editions/${editionId}/publish/${jobId}`,
          ),
        ),
      );
    },
    async readExport(editionId) {
      const body = await request(
        fetchImpl,
        `${BASE}/editions/${editionId}/export`,
      );
      const parsed = textbookExportResponseSchema.safeParse(body);
      if (!parsed.success) fail(LOAD_ERROR);
      const href = URL.createObjectURL(
        new Blob([JSON.stringify(parsed.data.data)], {
          type: "application/json",
        }),
      );
      return { href, label: "교환 파일" };
    },
    async importPackage(input) {
      const bytes = await input.file.arrayBuffer();
      const sha256 = await sha256Hex(bytes);
      let offset = 0;
      for (const size of planUploadChunks(bytes.byteLength)) {
        const slice = bytes.slice(offset, offset + size);
        const response = await fetchImpl(`${BASE}/uploads/${sha256}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Range": `bytes ${offset}-${offset + size - 1}/${bytes.byteLength}`,
          },
          body: slice,
        });
        if (!response.ok) throw errorMessage(null, response.status);
        offset += size;
      }
      const completed = parseData(
        textbookUploadCompleteResultSchema,
        await request(
          fetchImpl,
          `${BASE}/uploads/${sha256}/complete`,
          jsonInit(
            "POST",
            parseRequest(
              textbookUploadCompleteSchema,
              completeUploadPayload(bytes.byteLength, input.fileName),
            ),
          ),
        ),
      );
      if (
        completed.sha256 !== sha256 ||
        completed.byteLength !== bytes.byteLength
      ) {
        fail("업로드 응답이 올린 파일과 다릅니다.");
      }
      const payload = parseRequest(textbookImportSchema, {
        requestId: input.requestId,
        mode: input.mode,
        uploadId: completed.uploadId,
        expectedSha256: sha256,
      });
      const imported = parseData(
        textbookImportResultSchema,
        await request(fetchImpl, `${BASE}/imports`, jsonInit("POST", payload)),
      );
      const issues = studioIssues(imported.issues);
      if (imported.issues.some((issue) => issue.severity === "error")) {
        return { mode: input.mode, rejected: true, issues };
      }
      if (input.mode === "archive")
        return { mode: "archive", readOnly: true, issues };
      if (!imported.bookId) fail(LOAD_ERROR);
      const listed = textbookBookListSchema.safeParse(
        await request(fetchImpl, `${BASE}/books`),
      );
      if (!listed.success) fail(LOAD_ERROR);
      const book = listed.data.data
        .map(toBook)
        .find((item) => item.bookId === imported.bookId);
      if (!book) fail(LOAD_ERROR);
      return { mode: "copy", book, issues };
    },
  };
}

export const httpTextbookApi = createTextbookApi();

export function newRequestId(): string {
  return crypto.randomUUID();
}
