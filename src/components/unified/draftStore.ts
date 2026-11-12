import {
  questionIdSchema,
  questionRepresentationSchema,
} from "@/contracts/questionFormats.contract";
import type { Dispatch, SetStateAction } from "react";
import type { StudioProblem } from "./types";
import type { StudioCrop } from "./studioHelpers";
import type { StudioCartRemoval } from "./studioCart";
import { MathgenProblemDataSchema } from "@/lib/mathgen/ocr";
import {
  DEFAULT_PRINT_OPTIONS,
  DEFAULT_PRINT_META,
  type PrintOptions,
  type PrintMeta,
} from "./print/types";
import { parsePrintOptions, parsePrintMeta } from "./print/settings";
import {
  parseWorkspaceWorkflow,
  type WorkspaceWorkflow,
} from "@/contracts/workspaceWorkflow.contract";
import { readSheetTag, type SheetTag } from "@/contracts/sheetTag.contract";

export const DRAFT_STORE_KEY = "today-math-workspace-drafts-v1";
export const LEGACY_DRAFT_KEY = "today-math-unified-draft-v1";
export const DEFAULT_DRAFT_TITLE = "오늘 수학 학습지";
const AUTOSAVE_MS = 600;

export interface WorkspaceDraft {
  workflow?: WorkspaceWorkflow;
  /** 시험지 태그(W8) — 내 시험지에서 거를 때만 쓴다. 지면에 찍지 않는다. 없으면 «태그 없음». */
  tag?: SheetTag;
  id: string;
  title: string;
  problems: StudioProblem[];
  /**
   * 뺀 기억 — 이 시험지에서 뺀 문항과 뺀 자리(`studioCart.ts`). 한꺼번에 담기가 건너뛰고, 작업실
   * «담은 문항» 목록의 «다시 담기»가 이 판을 뺀 자리에 되넣는다. 원장님 2026-09-21 확정 «시험지와 같이
   * 저장한다»(트랙 47) — 전에는 화면 상태라 새로 고치면 뺀 것이 «N문항 담기»에 다시 잡혔다.
   * 이 판 전 저장본에는 칸이 없다 — 빈 기억으로 읽는다(`parseRemovals`).
   */
  removed: StudioCartRemoval[];
  columns: 1 | 2;
  answers: boolean;
  printOptions: PrintOptions;
  printMeta: PrintMeta;
  /** Last successful save, or an empty string for an unsaved worksheet. */
  updatedAt: string;
}

export interface DraftSummary {
  workflow?: WorkspaceWorkflow;
  id: string;
  title: string;
  problemCount: number;
  updatedAt: string;
}

interface DraftEnvelope {
  version: 1;
  activeId: string | null;
  drafts: WorkspaceDraft[];
}

/** 새 시험지 기본 양식이 덮는 값 — 서식 전부와 머리 정보의 고정 값(W6). */
export interface NewSheetSeed {
  printOptions: PrintOptions;
  printMeta: Partial<PrintMeta>;
}

export interface WorkspaceDraftSnapshot {
  draft: WorkspaceDraft;
  hydrated: boolean;
  recent: DraftSummary[];
  saveStatus: "loading" | "saved" | "saving" | "error" | "disabled";
  saveError: string | null;
}

type StorageAccess = () => Pick<Storage, "getItem" | "setItem">;
export interface DraftStoreOptions {
  /** Live workspaces opt out; old direct consumers keep their recovery behavior. */
  autoResume?: boolean;
}

class DraftError extends Error {}

const INVALID_IMPORT =
  "작업 파일 형식이나 문제 내용이 올바르지 않습니다. 버전 1 JSON 파일을 확인해 주세요.";
const INVALID_STORE =
  "저장된 작업을 읽지 못했습니다. 기존 데이터는 덮어쓰지 않았습니다. 브라우저 데이터를 지우지 말고 작업 파일을 백업해 주세요.";
const CONFLICT =
  "다른 창에서 저장된 작업이 변경되었습니다. 현재 작업을 파일로 내려받은 뒤 새로고침해 주세요.";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function blankDraft(id = ""): WorkspaceDraft {
  return {
    id,
    title: DEFAULT_DRAFT_TITLE,
    problems: [],
    removed: [],
    columns: DEFAULT_PRINT_OPTIONS.columns,
    answers: DEFAULT_PRINT_OPTIONS.showAnswers,
    printOptions: { ...DEFAULT_PRINT_OPTIONS },
    printMeta: { ...DEFAULT_PRINT_META },
    updatedAt: "",
  };
}

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function validImageUrl(value: string): boolean {
  // Images may be browser-local crops, site paths, or remote figure assets.
  return (
    !/[\u0000-\u001f\u007f]/.test(value) &&
    (/^data:image\/(?:png|jpe?g|webp|gif|avif|bmp|svg\+xml)[;,]/i.test(value) ||
      /^(?:https?:\/\/|blob:|\/|\.\.?\/)/i.test(value) ||
      /^[^:\s]+\.(?:svg|png|jpe?g|webp|gif|avif|bmp)(?:[?#].*)?$/i.test(value))
  );
}

const SVG_TAGS = new Set([
  "svg",
  "g",
  "path",
  "line",
  "polyline",
  "polygon",
  "circle",
  "ellipse",
  "rect",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "use",
  "symbol",
  "clipPath",
  "mask",
  "marker",
  "pattern",
  "linearGradient",
  "radialGradient",
  "stop",
  "image",
]);

function validSvg(value: string): boolean {
  if (!value) return true;
  if (typeof DOMParser === "undefined" || /<!DOCTYPE|<!ENTITY/i.test(value))
    return false;
  // Validate, never reserialize: original mathematical paths and labels stay byte-for-byte intact.
  const parser = new DOMParser();
  const xml = parser.parseFromString(value, "image/svg+xml");
  if (
    xml.querySelector("parsererror") ||
    xml.documentElement.localName !== "svg"
  )
    return false;
  // The renderer inserts HTML. Check that interpretation too (SVG title/CDATA can parse differently).
  const html = parser.parseFromString(value, "text/html").body;
  if (html.children.length !== 1 || html.firstElementChild?.tagName !== "svg")
    return false;
  return [
    ...Array.from(xml.querySelectorAll("*")),
    ...Array.from(html.querySelectorAll("*")),
  ].every((element) => {
    if (
      !SVG_TAGS.has(element.tagName) ||
      (element.namespaceURI &&
        element.namespaceURI !== "http://www.w3.org/2000/svg")
    )
      return false;
    return Array.from(element.attributes).every((attribute) => {
      const name = attribute.localName.toLowerCase();
      const content = attribute.value.trim();
      if (name.startsWith("on") || name === "base") return false;
      if (name === "href")
        return (
          /^#[\w:.-]+$/.test(content) ||
          (element.tagName === "image" && validImageUrl(content))
        );
      // Block active CSS and external references, including escaped/comment-obfuscated CSS.
      if (
        (name === "style" && /[\\@]|\/\*/.test(content)) ||
        /expression\s*\(|javascript\s*:|behavior\s*:|-moz-binding/i.test(
          content,
        )
      )
        return false;
      const withoutLocalUrls = content.replace(
        /url\(\s*['"]?#[\w:.-]+['"]?\s*\)/gi,
        "",
      );
      if (/url\s*\(/i.test(withoutLocalUrls)) return false;
      return true;
    });
  });
}

function parseStudioCrop(value: unknown): StudioCrop {
  if (!record(value)) throw new DraftError(INVALID_IMPORT);
  if (
    value.ocr !== undefined &&
    !MathgenProblemDataSchema.safeParse(value.ocr).success
  )
    throw new DraftError(INVALID_IMPORT);
  for (const key of [
    "id",
    "sourceId",
    "sourceLabel",
    "content",
    "answer",
    "solution",
    "grade",
  ]) {
    if (typeof value[key] !== "string") throw new DraftError(INVALID_IMPORT);
  }
  if (
    !value.id ||
    !value.sourceId ||
    !Number.isInteger(value.page) ||
    (value.page as number) < 1 ||
    !["text", "image"].includes(value.mode as string) ||
    !["elementary", "secondary"].includes(value.level as string) ||
    // 옛 «담음» 칸 — 이제 아무도 안 읽는다(`StudioCrop.added`). 없어도 되고, 있으면 boolean.
    (value.added !== undefined && typeof value.added !== "boolean") ||
    typeof value.image !== "string" ||
    !validImageUrl(value.image)
  )
    throw new DraftError(INVALID_IMPORT);
  const rect = (box: unknown) =>
    record(box) &&
    ["x", "y", "width", "height"].every(
      (key) =>
        typeof box[key] === "number" &&
        Number.isFinite(box[key]) &&
        box[key] >= 0 &&
        box[key] <= 1,
    ) &&
    (box.width as number) > 0 &&
    (box.height as number) > 0;
  if (!rect(value.rect)) throw new DraftError(INVALID_IMPORT);
  for (const key of ["reviewed", "modeManual"])
    if (value[key] !== undefined && typeof value[key] !== "boolean")
      throw new DraftError(INVALID_IMPORT);
  const sourceSize = value.sourceSize;
  if (
    sourceSize !== undefined &&
    (!record(sourceSize) ||
      !["width", "height"].every(
        (key) =>
          typeof sourceSize[key] === "number" &&
          Number.isFinite(sourceSize[key]) &&
          sourceSize[key] > 0,
      ))
  )
    throw new DraftError(INVALID_IMPORT);
  if (
    value.sourceWidthMm !== undefined &&
    (typeof value.sourceWidthMm !== "number" ||
      !Number.isFinite(value.sourceWidthMm) ||
      value.sourceWidthMm <= 0)
  )
    throw new DraftError(INVALID_IMPORT);
  if (value.figures !== undefined) {
    if (!Array.isArray(value.figures)) throw new DraftError(INVALID_IMPORT);
    for (const figure of value.figures) {
      if (
        !record(figure) ||
        typeof figure.id !== "string" ||
        !rect(figure.rect) ||
        typeof figure.image !== "string" ||
        !validImageUrl(figure.image)
      )
        throw new DraftError(INVALID_IMPORT);
      if (
        figure.originalImage !== undefined &&
        (typeof figure.originalImage !== "string" ||
          !validImageUrl(figure.originalImage))
      )
        throw new DraftError(INVALID_IMPORT);
      if (
        figure.svg !== undefined &&
        (typeof figure.svg !== "string" || !validSvg(figure.svg))
      )
        throw new DraftError(INVALID_IMPORT);
      if (figure.spec !== undefined && !record(figure.spec))
        throw new DraftError(INVALID_IMPORT);
      if (figure.engine !== undefined && figure.engine !== "todays-math-python")
        throw new DraftError(INVALID_IMPORT);
      if (
        figure.figureReview !== undefined &&
        (!record(figure.figureReview) ||
          typeof figure.figureReview.passed !== "boolean" ||
          !Array.isArray(figure.figureReview.issues) ||
          !figure.figureReview.issues.every(
            (item: unknown) => typeof item === "string",
          ))
      )
        throw new DraftError(INVALID_IMPORT);
    }
  }
  return value as unknown as StudioCrop;
}

function parseProblems(value: unknown): StudioProblem[] {
  if (!Array.isArray(value)) throw new DraftError(INVALID_IMPORT);
  const ids = new Set<string>();
  return value.map((problem: unknown) => {
    if (
      !record(problem) ||
      typeof problem.id !== "string" ||
      !problem.id.trim() ||
      ids.has(problem.id) ||
      typeof problem.content !== "string"
    )
      throw new DraftError(INVALID_IMPORT);
    ids.add(problem.id);
    const normalized: Record<string, unknown> = { ...problem };
    if (
      problem.questionId !== undefined &&
      !questionIdSchema.safeParse(problem.questionId).success
    )
      throw new DraftError(INVALID_IMPORT);
    if (
      problem.questionFormats !== undefined &&
      (!Array.isArray(problem.questionFormats) ||
        !problem.questionFormats.every(
          (option: unknown) =>
            questionRepresentationSchema.safeParse(option).success,
        ))
    )
      throw new DraftError(INVALID_IMPORT);
    if (
      problem.ocr !== undefined &&
      !MathgenProblemDataSchema.safeParse(problem.ocr).success
    )
      throw new DraftError(INVALID_IMPORT);
    if (problem.studioCrop !== undefined)
      normalized.studioCrop = parseStudioCrop(problem.studioCrop);
    if (
      problem.questionType !== undefined &&
      !["multiple-choice", "short-answer", "descriptive"].includes(
        problem.questionType as string,
      )
    )
      throw new DraftError(INVALID_IMPORT);
    for (const key of [
      "answer",
      "solution",
      "grade",
      "chapter",
      "section",
      "difficulty",
      "problemCode",
    ]) {
      if (problem[key] !== undefined && typeof problem[key] !== "string")
        throw new DraftError(INVALID_IMPORT);
      normalized[key] = problem[key] ?? "";
    }
    for (const key of ["croppedImage", "sourceLabel"]) {
      if (problem[key] !== undefined && typeof problem[key] !== "string")
        throw new DraftError(INVALID_IMPORT);
    }
    if (problem.croppedImage && !validImageUrl(problem.croppedImage as string))
      throw new DraftError(INVALID_IMPORT);
    const urls = problem.figureUrls === undefined ? [] : problem.figureUrls;
    if (
      !Array.isArray(urls) ||
      !urls.every(
        (url: unknown) => typeof url === "string" && validImageUrl(url),
      )
    )
      throw new DraftError(INVALID_IMPORT);
    normalized.figureUrls = urls;
    for (const key of [
      "figureDims",
      "figureSourceMm",
      ...(problem.choiceFigureIndex === undefined ? [] : ["choiceFigureIndex"]),
    ]) {
      const numbers = problem[key] === undefined ? [] : problem[key];
      if (
        !Array.isArray(numbers) ||
        !numbers.every(
          (number: unknown) =>
            typeof number === "number" &&
            Number.isFinite(number) &&
            number >= 0,
        )
      )
        throw new DraftError(INVALID_IMPORT);
      normalized[key] = numbers;
    }
    if (
      problem.figureSvg != null &&
      (typeof problem.figureSvg !== "string" || !validSvg(problem.figureSvg))
    )
      throw new DraftError(INVALID_IMPORT);
    normalized.figureSvg = problem.figureSvg ?? null;
    return normalized as unknown as StudioProblem;
  });
}

/**
 * 뺀 기억(`WorkspaceDraft.removed`). 칸이 없으면(이 판 전 저장본) 빈 기억이다.
 * - 문항은 담은 목록과 같은 검사를 거친다 — «다시 담기»가 이 판을 그대로 시험지에 넣는다.
 * - 담은 목록에 다시 있는 문항의 기억은 버린다 — 같은 문항(그림 data URL 까지)을 두 곳에 싣지 않는다.
 *   뺀 문항은 담은 목록에서 **옮겨** 온 것이라 저장 크기는 빼기 전과 같다.
 */
function parseRemovals(
  value: unknown,
  problems: StudioProblem[],
): StudioCartRemoval[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    !value.every(
      (item: unknown) =>
        record(item) &&
        Number.isInteger(item.index) &&
        (item.index as number) >= 0 &&
        (item.pageExcluded === undefined ||
          typeof item.pageExcluded === "boolean") &&
        (item.previousId === undefined ||
          item.previousId === null ||
          (typeof item.previousId === "string" && item.previousId.length > 0)),
    )
  )
    throw new DraftError(INVALID_IMPORT);
  const items = value as {
    problem: unknown;
    index: number;
    pageExcluded?: boolean;
    previousId?: string | null;
  }[];
  return parseProblems(items.map((item) => item.problem))
    .map((problem, at) => ({
      problem,
      index: items[at].index,
      ...(items[at].pageExcluded ? { pageExcluded: true } : {}),
      ...(items[at].previousId !== undefined
        ? { previousId: items[at].previousId }
        : {}),
    }))
    .filter((item) => !problems.some((kept) => kept.id === item.problem.id));
}

export function parseImport(
  value: unknown,
): Omit<WorkspaceDraft, "id" | "updatedAt"> {
  if (!record(value) || value.version !== 1 || typeof value.title !== "string")
    throw new DraftError(INVALID_IMPORT);
  const printOptions = parsePrintOptions(value.printOptions, {
    columns: value.columns === 1 ? 1 : 2,
    answers: value.answers,
  });
  const problems = parseProblems(value.problems);
  const workflow = parseWorkspaceWorkflow(value.workflow);
  const tag = readSheetTag(value.tag);
  return {
    ...(workflow ? { workflow } : {}),
    ...(tag ? { tag } : {}),
    title: value.title,
    problems,
    removed: parseRemovals(value.removed, problems),
    columns: printOptions.columns,
    answers: printOptions.showAnswers,
    printOptions,
    printMeta: parsePrintMeta(value.printMeta),
  };
}

export function parseEnvelope(raw: string): DraftEnvelope {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !record(value) ||
      value.version !== 1 ||
      !Array.isArray(value.drafts) ||
      (value.activeId !== null && typeof value.activeId !== "string")
    )
      throw new Error();
    const ids = new Set<string>();
    const drafts = value.drafts.map((draft: unknown) => {
      if (
        !record(draft) ||
        typeof draft.id !== "string" ||
        !draft.id ||
        ids.has(draft.id) ||
        typeof draft.updatedAt !== "string" ||
        !Number.isFinite(Date.parse(draft.updatedAt)) ||
        (draft.columns !== 1 && draft.columns !== 2) ||
        typeof draft.answers !== "boolean"
      )
        throw new Error();
      ids.add(draft.id);
      return {
        ...parseImport({ ...draft, version: 1 }),
        id: draft.id,
        updatedAt: draft.updatedAt,
      };
    });
    if (value.activeId !== null && !ids.has(value.activeId)) throw new Error();
    return { version: 1, activeId: value.activeId, drafts };
  } catch {
    throw new DraftError(INVALID_STORE);
  }
}

function summaries(envelope: DraftEnvelope): DraftSummary[] {
  return envelope.drafts
    .map(({ id, title, problems, updatedAt, workflow }) => ({
      id,
      title,
      problemCount: problems.length,
      updatedAt,
      ...(workflow ? { workflow } : {}),
    }))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function draftRevision(draft: WorkspaceDraft | undefined): string | undefined {
  // Field order differs between a new draft and a decoded draft; compare their data, not that order.
  // 뺀 기억(`removed`)은 일부러 안 넣는다 — 이 판 전 배포본의 창은 모르는 칸을 버리고 봉투를 통째로
  // 다시 쓴다(`parseImport` 가 아는 칸만 고른다). 그 떨굼은 시험지를 고친 것이 아니니 «다른 창의 변경»으로
  // 읽지 않고, 새 창이 다음 저장에 제 기억을 다시 싣는다. 뺀 기억은 빼기·담기와 늘 같이 바뀌어
  // 두 새 창의 진짜 충돌은 `problems` 가 잡는다.
  return (
    draft &&
    JSON.stringify([
      draft.id,
      draft.title,
      draft.columns,
      draft.answers,
      draft.printOptions,
      draft.printMeta,
      draft.updatedAt,
      draft.problems,
      draft.workflow,
    ])
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof DraftError) return error.message;
  if (
    record(error) &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  ) {
    return "브라우저 저장 공간이 부족해 저장하지 못했습니다. 현재 작업은 화면에 유지됩니다. 작업 파일을 내려받아 보관한 뒤 저장 공간을 확보해 주세요.";
  }
  return "브라우저 저장소에 접근하지 못했습니다. 현재 작업을 파일로 내려받아 보관하고 브라우저의 저장 권한을 확인해 주세요.";
}

/** A per-hook session; browser access starts only at hydrate(), never during SSR. */
export function createWorkspaceDraftStore(
  storageAccess: StorageAccess = () => window.localStorage,
  { autoResume = true }: DraftStoreOptions = {},
) {
  const initial: WorkspaceDraftSnapshot = {
    draft: blankDraft(),
    hydrated: false,
    recent: [],
    saveStatus: "loading",
    saveError: null,
  };
  let snapshot = initial;
  let known: DraftEnvelope = { version: 1, activeId: null, drafts: [] };
  let dirty = false;
  let recoveryBlocked = false;
  let recoveryError: unknown;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  /**
   * 새 시험지 기본 양식(W6 · 2026-10-16) — 있으면 새 시험지가 그 서식 · 머리 정보로 열린다(없으면 처음 값).
   * 만들어 둔 빈 시험지(아무것도 담지 않고 손대지 않은 것)에도 덮는다 — 저장할 내용이 아니라 더러워지지 않는다.
   */
  let newSheet: NewSheetSeed | null = null;
  const freshDraft = (id: string): WorkspaceDraft => {
    const draft = blankDraft(id);
    if (!newSheet) return draft;
    const printOptions = parsePrintOptions(newSheet.printOptions);
    return {
      ...draft,
      printOptions,
      columns: printOptions.columns,
      answers: printOptions.showAnswers,
      printMeta: parsePrintMeta({ ...draft.printMeta, ...newSheet.printMeta }),
    };
  };
  const pristine = () =>
    !dirty &&
    !snapshot.draft.updatedAt &&
    !snapshot.draft.problems.length &&
    !snapshot.draft.removed.length &&
    snapshot.draft.title === DEFAULT_DRAFT_TITLE;

  const publish = (patch: Partial<WorkspaceDraftSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((listener) => listener());
  };
  const fail = (error: unknown) => {
    publish({ saveStatus: "error", saveError: errorMessage(error) });
    return false;
  };
  const cancelTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  // Save outgoing edits and the active selection together in one localStorage write.
  // A quota failure leaves both the durable envelope and the current editor untouched.
  const commit = (
    target?: WorkspaceDraft | string,
    mutation?: { id: string; title?: string; remove?: boolean },
  ) => {
    if (!snapshot.hydrated) return false;
    cancelTimer();
    if (recoveryBlocked) return fail(recoveryError);
    try {
      const storage = storageAccess();
      const raw = storage.getItem(DRAFT_STORE_KEY);
      const fresh: DraftEnvelope =
        raw === null
          ? { version: 1, activeId: null, drafts: [] }
          : parseEnvelope(raw);
      let nextDraft = snapshot.draft;
      if (typeof target === "string") {
        const found = fresh.drafts.find((draft) => draft.id === target);
        if (!found)
          throw new DraftError(
            "선택한 작업을 찾지 못했습니다. 최근 작업 목록을 새로고침해 주세요.",
          );
        nextDraft = found;
      } else if (target) nextDraft = target;

      const current = snapshot.draft;
      if (mutation) {
        const expected = known.drafts.find((draft) => draft.id === mutation.id);
        const actual = fresh.drafts.find((draft) => draft.id === mutation.id);
        if (!actual || draftRevision(expected) !== draftRevision(actual))
          throw new DraftError(CONFLICT);
        if (mutation.remove && mutation.id === current.id && dirty)
          throw new DraftError(
            "현재 작업에 저장하지 못한 변경이 있습니다. 작업을 저장하거나 파일로 내보낸 뒤 삭제해 주세요.",
          );
      }
      const previous = known.drafts.find((draft) => draft.id === current.id);
      const latest = fresh.drafts.find((draft) => draft.id === current.id);
      if (dirty && draftRevision(previous) !== draftRevision(latest))
        throw new DraftError(CONFLICT);
      if (!dirty && target === undefined && previous) {
        if (!latest) throw new DraftError(CONFLICT);
        nextDraft = latest;
      }
      const drafts = [...fresh.drafts];
      const put = (draft: WorkspaceDraft) => {
        const index = drafts.findIndex((item) => item.id === draft.id);
        if (index === -1) drafts.push(draft);
        else drafts[index] = draft;
      };
      if (dirty) {
        // Typed callers still may carry malformed runtime data; do not persist an unreadable store.
        const problems = parseProblems(current.problems);
        const saved = {
          ...current,
          problems,
          removed: parseRemovals(current.removed, problems),
          printOptions: parsePrintOptions(current.printOptions),
          printMeta: parsePrintMeta(current.printMeta),
          updatedAt: new Date().toISOString(),
        };
        put(saved);
        if (nextDraft.id === current.id) nextDraft = saved;
      }
      if (
        target &&
        typeof target !== "string" &&
        (target.problems.length || target.updatedAt)
      ) {
        nextDraft = { ...target, updatedAt: new Date().toISOString() };
        put(nextDraft);
      }
      if (mutation) {
        const index = drafts.findIndex((draft) => draft.id === mutation.id);
        if (mutation.remove) {
          drafts.splice(index, 1);
          if (nextDraft.id === mutation.id) nextDraft = freshDraft(newId());
        } else {
          const renamed = {
            ...drafts[index],
            title: mutation.title!,
            updatedAt: new Date().toISOString(),
          };
          drafts[index] = renamed;
          if (nextDraft.id === mutation.id) nextDraft = renamed;
        }
      }
      const activeId = drafts.some((draft) => draft.id === nextDraft.id)
        ? nextDraft.id
        : null;
      const next: DraftEnvelope = { version: 1, activeId, drafts };
      // Merely visiting or creating an untouched blank worksheet does not save a phantom draft.
      if (
        mutation ||
        dirty ||
        (target !== undefined && (raw !== null || drafts.length > 0))
      ) {
        storage.setItem(DRAFT_STORE_KEY, JSON.stringify(next));
      }
      known = next;
      dirty = false;
      publish({
        draft: nextDraft,
        recent: summaries(next),
        saveStatus: "saved",
        saveError: null,
      });
      return true;
    } catch (error) {
      return fail(error);
    }
  };

  const saveNow = () => commit();
  const edit = (change: (draft: WorkspaceDraft) => WorkspaceDraft) => {
    if (!snapshot.hydrated) return;
    const next = change(snapshot.draft);
    if (next === snapshot.draft) return;
    dirty = true;
    cancelTimer();
    publish({ draft: next, saveStatus: recoveryBlocked ? "error" : "saving" });
    timer = setTimeout(saveNow, AUTOSAVE_MS);
  };

  const hydrate = () => {
    if (snapshot.hydrated) return;
    let recovered = freshDraft(newId());
    try {
      const storage = storageAccess();
      const raw = storage.getItem(DRAFT_STORE_KEY);
      if (raw !== null) {
        known = parseEnvelope(raw);
        if (autoResume)
          recovered =
            known.drafts.find((draft) => draft.id === known.activeId) ??
            recovered;
      } else {
        const legacy = storage.getItem(LEGACY_DRAFT_KEY);
        if (legacy !== null) {
          try {
            const value: unknown = JSON.parse(legacy);
            recovered = {
              ...recovered,
              ...parseImport(value),
              updatedAt:
                record(value) &&
                typeof value.updatedAt === "string" &&
                Number.isFinite(Date.parse(value.updatedAt))
                  ? value.updatedAt
                  : new Date().toISOString(),
            };
          } catch {
            throw new DraftError(INVALID_STORE);
          }
          // The source key is deliberately preserved, including when migration cannot fit.
          if (autoResume) dirty = true;
          else {
            known = { version: 1, activeId: null, drafts: [recovered] };
            recovered = freshDraft(newId());
            storage.setItem(DRAFT_STORE_KEY, JSON.stringify(known));
          }
        }
      }
      publish({
        draft: recovered,
        hydrated: true,
        recent: summaries(known),
        saveStatus: dirty ? "saving" : "saved",
      });
      if (dirty) saveNow();
    } catch (error) {
      recoveryBlocked = true;
      recoveryError = error;
      publish({
        draft: autoResume ? recovered : freshDraft(newId()),
        hydrated: true,
        recent: summaries(known),
      });
      fail(error);
    }
  };

  const setProblems: Dispatch<SetStateAction<StudioProblem[]>> = (value) =>
    edit((draft) => {
      const problems =
        typeof value === "function" ? value(draft.problems) : value;
      return problems === draft.problems ? draft : { ...draft, problems };
    });
  const setRemoved: Dispatch<SetStateAction<StudioCartRemoval[]>> = (value) =>
    edit((draft) => {
      const removed =
        typeof value === "function" ? value(draft.removed) : value;
      return removed === draft.removed ? draft : { ...draft, removed };
    });

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate,
    saveNow,
    flush: () => {
      if (dirty) saveNow();
    },
    setTitle: (title: string) =>
      edit((draft) => (title === draft.title ? draft : { ...draft, title })),
    setProblems,
    setRemoved,
    setWorkflow: (workflow: WorkspaceWorkflow | undefined) => {
      const next = parseWorkspaceWorkflow(workflow);
      if (workflow !== undefined && !next) return;
      if (JSON.stringify(next) === JSON.stringify(snapshot.draft.workflow))
        return;
      // Seeding a blank editor's stage is not user content and must not create
      // a phantom saved worksheet. The next real edit includes this metadata.
      if (
        !dirty &&
        !snapshot.draft.updatedAt &&
        !snapshot.draft.problems.length &&
        !snapshot.draft.removed.length &&
        snapshot.draft.title === DEFAULT_DRAFT_TITLE
      ) {
        publish({ draft: { ...snapshot.draft, workflow: next } });
        return;
      }
      edit((draft) => ({ ...draft, workflow: next }));
    },
    /** 시험지 태그(W8) — 하나만, 빼면 칸이 없다. */
    setTag: (tag: SheetTag | null) =>
      edit((draft) => {
        if ((draft.tag ?? null) === tag) return draft;
        const next = { ...draft };
        if (tag) next.tag = tag;
        else delete next.tag;
        return next;
      }),
    setColumns: (columns: number) => {
      if (columns === 1 || columns === 2)
        edit((draft) =>
          columns === draft.columns
            ? draft
            : {
                ...draft,
                columns,
                printOptions: { ...draft.printOptions, columns },
              },
        );
    },
    setAnswers: (answers: boolean) =>
      edit((draft) =>
        answers === draft.answers
          ? draft
          : {
              ...draft,
              answers,
              printOptions: { ...draft.printOptions, showAnswers: answers },
            },
      ),
    setPrintOptions: (patch: Partial<PrintOptions>) =>
      edit((draft) => {
        const printOptions = parsePrintOptions({
          ...draft.printOptions,
          ...patch,
        });
        return {
          ...draft,
          printOptions,
          columns: printOptions.columns,
          answers: printOptions.showAnswers,
        };
      }),
    setPrintMeta: (patch: Partial<PrintMeta>) =>
      edit((draft) => ({
        ...draft,
        printMeta: parsePrintMeta({ ...draft.printMeta, ...patch }),
      })),
    createDraft: () => commit(freshDraft(newId())),
    /** 새 시험지 기본 양식을 정한다(null 이면 처음 값) — 손대지 않은 빈 시험지에도 덮는다. */
    seedNewSheet: (seed: NewSheetSeed | null) => {
      newSheet = seed;
      if (!snapshot.hydrated || !pristine()) return;
      const seeded = freshDraft(snapshot.draft.id);
      publish({
        draft: {
          ...snapshot.draft,
          printOptions: seeded.printOptions,
          printMeta: seeded.printMeta,
          columns: seeded.columns,
          answers: seeded.answers,
        },
      });
    },
    openDraft: (id: string) => commit(id),
    renameDraft: (id: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed || trimmed.length > 80)
        return fail(new DraftError("시험지 이름을 1~80자로 입력해 주세요."));
      return commit(undefined, { id, title: trimmed });
    },
    deleteDraft: (id: string) => commit(undefined, { id, remove: true }),
    /** Cloud library deletion already succeeded; discard only that editor's pending copy. */
    forgetDeletedDraft: (id: string) => {
      if (snapshot.draft.id === id) {
        cancelTimer();
        dirty = false;
      }
      return commit(undefined, { id, remove: true });
    },
    importDraft: (value: unknown) => {
      if (!snapshot.hydrated) return false;
      try {
        // Detach from the caller so later mutations cannot change a saved/imported worksheet.
        const imported = parseImport(JSON.parse(JSON.stringify(value)));
        return commit({
          ...imported,
          id: newId(),
          updatedAt: new Date().toISOString(),
        });
      } catch {
        return fail(new DraftError(INVALID_IMPORT));
      }
    },
  };
}
