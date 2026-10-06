"use client";

/**
 * 오늘의 영어 — «문제 만들기» (D-148 · 25 §4 · 브리프 english-ai §3). 트랙 english-ai 소유.
 *
 * 세 길: ① ChatGPT 로 제작(키 없음 — 요청문 복사 · 결과 붙여넣기) ② 원문 복원(규칙 기반 `makeCloze`)
 * ③ API 직접 생성(`POST /api/english/generate`). 세 길 모두 저장 전 미리보기가 없다 — 편집 화면이 곧 검토다.
 * 저장은 늘 «초안»(`POST /api/english/exams/{id}/sets`) → `onSaved(id)`. ChatGPT 탭과 API 탭은 조건을 같이 쓴다.
 *
 * 모양은 작업실 토큰 그대로(05 §8.9) · D-08(사무적) · D-30(손가락 커서는 단추·선택에만).
 */
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import WorkProgress from "@/components/unified/WorkProgress";
import {
  ENGLISH_DIFFICULTIES,
  ENGLISH_GENERATE_MODES,
  ENGLISH_GENERATED_TYPES,
  ENGLISH_SOURCE_PASSAGE_MIN,
  ENGLISH_PASSAGE_MAX,
  englishDraftSchema,
  englishGenerateRequestSchema,
  englishGenerateResponseSchema,
  type EnglishDraft,
  type EnglishDraftIssue,
  type EnglishExam,
  type EnglishGenerateRequest,
  type EnglishMaterial,
  type EnglishSetMeta,
} from "@/contracts/english.contract";
import {
  ENGLISH_BANK_PATH_LIMITS,
  englishPassagePrepareResponseSchema,
  type EnglishBankMakerSeed,
} from "@/contracts/englishBank.contract";
import {
  buildChatgptFixRequest,
  buildChatgptRequest,
  parseChatgptResult,
  type EnglishMakerConditions,
} from "@/lib/english/chatgpt";
import { CLOZE_COUNTS, makeCloze } from "@/lib/english/cloze";
import { englishMetaFromConditions } from "@/lib/english/meta";
import { validateEnglishDraft } from "@/lib/english/validate";

import AutoGrowTextarea from "./AutoGrowTextarea";

import s from "./EnglishMaker.module.css";
import tabs from "./EnglishTabs.module.css";

export interface EnglishMakerViewProps {
  exam: EnglishExam;
  materials: EnglishMaterial[];
  onSaved: (setId: string) => void;
  onNotice: (message: string, tone: "status" | "alert") => void;
  bankSeed?: EnglishBankMakerSeed;
  onBankSeedAccepted?: (examId: string) => void;
  onBankSeedHandled?: (requestId: string) => void;
}

type MakerTab = "chatgpt" | "cloze" | "api";
type Mode = EnglishGenerateRequest["mode"];
type Difficulty = EnglishGenerateRequest["difficulty"];
type GeneratedType = EnglishGenerateRequest["types"][number];
type ClozeCount = (typeof CLOZE_COUNTS)[number];

type Conditions = {
  mode: Mode;
  topic: string;
  passage: string;
  difficulty: Difficulty;
  count: number;
  words: number;
  types: GeneratedType[];
};

const TABS: { id: MakerTab; label: string }[] = [
  { id: "chatgpt", label: "ChatGPT 로 제작" },
  { id: "cloze", label: "원문 복원" },
  { id: "api", label: "API 직접 생성" },
];

const MODE_LABEL: Record<Mode, string> = {
  new: "새 지문 생성",
  original: "원문 유지",
  variation: "원문 변형",
};
const COUNT_OPTIONS = [3, 5, 6, 8] as const;
type CountOption = (typeof COUNT_OPTIONS)[number];

/**
 * 어법과 어휘가 한 배열에 있으면 생성 목록에서 앞선 쪽만 남긴다.
 * 저장 배열은 상수 순서라, 어법이 어휘보다 앞이면 어법이 남는다.
 */
function exclusiveUnderline(types: readonly GeneratedType[]): GeneratedType[] {
  const grammar = types.includes("어법");
  const vocab = types.includes("어휘");
  if (!grammar || !vocab) return [...types];
  const drop =
    ENGLISH_GENERATED_TYPES.indexOf("어법") <
    ENGLISH_GENERATED_TYPES.indexOf("어휘")
      ? "어휘"
      : "어법";
  return types.filter((type) => type !== drop);
}

/** 유형 수가 문항 수보다 크면, 그 수를 담는 가장 작은 선택으로 올린다. 줄이지는 않는다. */
function fitCount(count: number, typeCount: number): CountOption {
  if (
    typeCount <= count &&
    (COUNT_OPTIONS as readonly number[]).includes(count)
  )
    return count as CountOption;
  return (
    COUNT_OPTIONS.find((option) => option >= Math.max(count, typeCount)) ??
    COUNT_OPTIONS[COUNT_OPTIONS.length - 1]!
  );
}

/**
 * `examId` — 이 초안을 검증한 시험. 저장이 끊긴 뒤 시험을 바꾸고 «다시 저장»을 누르면 초안이 **다른 시험**에
 * 들어가던 것을 막는다(D-153 검토 #2): 묶음은 제 시험으로만 보내고, 다른 시험을 보는 동안 단추는 숨긴다.
 */
type SaveBundle = { draft: EnglishDraft; meta: EnglishSetMeta; examId: string };

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort())
      out[key] = sortKeys(source[key]);
    return out;
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right));
}

function metaWithoutKey(
  meta: EnglishSetMeta,
): Omit<EnglishSetMeta, "clientKey"> {
  const rest = { ...meta };
  delete rest.clientKey;
  return rest;
}
// 40 · 60 · 80 은 표지판 · 안내문 · 라벨 같은 짧은 실용문을 변형할 때(D-158 · 계약 하한 `ENGLISH_WORDS_MIN`)
const WORD_OPTIONS = [40, 60, 80, 100, 150, 200, 250, 300, 400] as const;
const JSON_HEADERS = { "content-type": "application/json" } as const;

/** 실패한 요청 — 서버 문구를 그대로 들고, 검증기 사유(`details.issues`)가 있으면 같이. */
class ApiFailure extends Error {
  readonly status: number;
  readonly issues: EnglishDraftIssue[];
  readonly reason?: string;
  constructor(
    status: number,
    message: string,
    issues: EnglishDraftIssue[] = [],
    reason?: string,
  ) {
    super(message);
    this.name = "ApiFailure";
    this.status = status;
    this.issues = issues;
    this.reason = reason;
  }
}

function issuesOf(details: unknown): EnglishDraftIssue[] {
  const list =
    details && typeof details === "object" && "issues" in details
      ? (details as { issues?: unknown }).issues
      : undefined;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) =>
    item &&
    typeof item === "object" &&
    typeof (item as { message?: unknown }).message === "string"
      ? [
          {
            question:
              typeof (item as { question?: unknown }).question === "number"
                ? ((item as { question: number }).question as number)
                : null,
            message: (item as { message: string }).message,
          },
        ]
      : [],
  );
}

/**
 * 응답은 글자로 받아 JSON 으로 풀릴 때만 읽는다 — 플랫폼이 먼저 자른 413·504 는 평문으로 온다
 * (20번 교훈 2026-09-21). 실패는 서버 문구(`{ error: { message } }`)를 그대로 올린다.
 */
async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  let body: unknown = null;
  if (/^\s*[{[]/.test(text)) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const error = (
      body as { error?: { message?: unknown; details?: unknown } } | null
    )?.error;
    const message =
      typeof error?.message === "string" && error.message
        ? error.message
        : `요청이 실패했습니다(${response.status}). 다시 시도해 주세요.`;
    const details = error?.details as { reason?: unknown } | undefined;
    throw new ApiFailure(
      response.status,
      message,
      issuesOf(error?.details),
      typeof details?.reason === "string" ? details.reason : undefined,
    );
  }
  return body;
}

const messageOf = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : "요청이 실패했습니다. 다시 시도해 주세요.";

function describeConditionIssue(issue: {
  path: PropertyKey[];
  code: string;
  message: string;
}): string {
  if (issue.path[0] === "types" && issue.code === "too_small")
    return "문항 유형을 하나 이상 고르세요.";
  return issue.message;
}

const issueLabel = (issue: EnglishDraftIssue) =>
  issue.question === null ? "초안" : `${issue.question + 1}번 문항`;

function IssueList({ issues }: { issues: EnglishDraftIssue[] }) {
  return (
    <ul className={s.issues}>
      {issues.map((issue, index) => (
        <li key={`${issue.question ?? "draft"}-${index}`}>
          <b>{issueLabel(issue)}</b> {issue.message}
        </li>
      ))}
    </ul>
  );
}

export default function EnglishMakerView({
  exam,
  materials,
  onSaved,
  onNotice,
  bankSeed,
  onBankSeedAccepted,
  onBankSeedHandled,
}: EnglishMakerViewProps) {
  const uid = useId();
  // 탭·패널 id 는 인스턴스마다 다르게 — 한 화면에 둘이 마운트돼도 aria-controls·포커스가 안 섞인다(리드 검토 D8).
  const tabId = (id: MakerTab) => `${uid}-tab-${id}`;
  const panelId = (id: MakerTab) => `${uid}-panel-${id}`;
  const [tab, setTab] = useState<MakerTab>("chatgpt");
  const [conditions, setConditions] = useState<Conditions>(() => {
    const types = exclusiveUnderline(
      exam.types.length ? [...exam.types] : ["주제"],
    );
    return {
      mode: "new",
      topic: "",
      passage: "",
      difficulty: "표준",
      count: fitCount(5, types.length),
      words: 200,
      types,
    };
  });
  const [conditionIssues, setConditionIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState<
    null | "import" | "cloze" | "generate" | "save" | "prepare"
  >(null);
  /** 검증을 통과한 초안 · 그때의 meta · clientKey. «다시 저장»은 이 묶음만 보낸다. */
  const [pendingSave, setPendingSave] = useState<SaveBundle | null>(null);
  const [saveFailure, setSaveFailure] = useState<ApiFailure | null>(null);
  const [startedAt, setStartedAt] = useState<number | undefined>(undefined);

  // 불러온 자료 — 그 글을 그대로 썼을 때만 «만든 조건»에 이름을 싣는다
  const [pickedPassage, setPickedPassage] = useState<EnglishMaterial | null>(
    null,
  );
  const [pickedCloze, setPickedCloze] = useState<EnglishMaterial | null>(null);
  // ChatGPT/API share an input; cloze has its own exact text and relationship.
  const [bankPassage, setBankPassage] = useState<EnglishBankMakerSeed | null>(
    null,
  );
  const [bankCloze, setBankCloze] = useState<EnglishBankMakerSeed | null>(null);
  const [bankMessage, setBankMessage] = useState("");
  const [clozeBankMessage, setClozeBankMessage] = useState("");
  const handledSeeds = useRef(new Set<string>());
  const [conditionsEdited, setConditionsEdited] = useState(false);
  const sameText = (material: EnglishMaterial | null, text: string) =>
    material?.content && material.content.trim() === text.trim()
      ? material.name
      : undefined;

  // ① ChatGPT
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [pasteIssues, setPasteIssues] = useState<EnglishDraftIssue[]>([]);
  // 검증에 걸린 그때의 글 · 조건과 수정 요청문(3자 합의 25 §12.13 F1) — JSON 을 못 찾았거나 서버 오류면 null(단추 없음)
  const [rejection, setRejection] = useState<{
    pasted: string;
    conditions: string;
    text: string;
    bank: EnglishBankMakerSeed | null;
  } | null>(null);
  const [fixOpen, setFixOpen] = useState(false);
  const [fixCopyFailed, setFixCopyFailed] = useState(false);

  // ② 원문 복원
  const [clozeText, setClozeText] = useState("");
  const [clozeCount, setClozeCount] = useState<ClozeCount>(5);
  const [clozeError, setClozeError] = useState("");

  // ③ API
  const [aiLink, setAiLink] = useState<"unknown" | "ready" | "waiting">(
    "unknown",
  );
  const [apiError, setApiError] = useState<ApiFailure | null>(null);

  const hasUnsavedDraft = Boolean(
    conditionsEdited ||
    conditions.topic ||
    conditions.passage ||
    clozeText ||
    pasteText ||
    fallbackText ||
    rejection ||
    pendingSave,
  );

  // A bank handoff is a one-shot command. Read the latest draft only when that command is handled.
  const acceptBankSeed = useEffectEvent((bankSeed: EnglishBankMakerSeed) => {
    if (handledSeeds.current.has(bankSeed.requestId)) return;
    // The shell may atomically select a validated target exam after acceptance.
    if (bankSeed.examId !== exam.id && !onBankSeedAccepted) return;
    handledSeeds.current.add(bankSeed.requestId);
    if (
      hasUnsavedDraft &&
      !window.confirm(
        "작성 중인 입력·결과와 저장 대기 초안을 바꾸고 은행 원문을 불러오시겠습니까?",
      )
    ) {
      onBankSeedHandled?.(bankSeed.requestId);
      return;
    }
    setTab(bankSeed.path);
    setPendingSave(null);
    setSaveFailure(null);
    setConditionIssues([]);
    setApiError(null);
    setClozeError("");
    setFallbackText(null);
    setPasteText("");
    setPasteIssues([]);
    setRejection(null);
    setFixOpen(false);
    setFixCopyFailed(false);
    if (bankSeed.path === "cloze") {
      setClozeText(bankSeed.text);
      setBankCloze(bankSeed);
      setPickedCloze(null);
      setClozeBankMessage("");
    } else {
      setConditions((previous) => ({
        ...previous,
        mode: "original",
        topic: "",
        passage: bankSeed.text,
      }));
      setBankPassage(bankSeed);
      setPickedPassage(null);
      setBankMessage("");
    }
    onBankSeedAccepted?.(bankSeed.examId);
    onBankSeedHandled?.(bankSeed.requestId);
  });
  useEffect(() => {
    if (!bankSeed || busy) return;
    // Cancel a queued command if the shell changes the target or unmounts while a save settles.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) acceptBankSeed(bankSeed);
    });
    return () => {
      cancelled = true;
    };
  }, [bankSeed, busy, exam.id, onBankSeedAccepted]);

  const textMaterials = materials.filter((material) => material.content);

  function detachBank(path: "external" | "cloze") {
    const message =
      "입력 또는 자료가 바뀌어 은행 연결을 해제했습니다. 이 글은 새 사본으로 저장됩니다.";
    if (path === "cloze") {
      if (!bankCloze) return;
      setBankCloze(null);
      setClozeBankMessage(message);
    } else {
      if (!bankPassage) return;
      setBankPassage(null);
      setBankMessage(message);
      setFallbackText(null);
      setFixOpen(false);
      setFixCopyFailed(false);
    }
  }

  const update = (patch: Partial<Conditions>) => {
    setConditionsEdited(true);
    if (
      (patch.passage !== undefined && patch.passage !== conditions.passage) ||
      patch.mode === "new"
    )
      detachBank("external");
    setConditions((previous) => ({ ...previous, ...patch }));
  };

  const toggleType = (type: GeneratedType) => {
    setConditionsEdited(true);
    const adding = !conditions.types.includes(type);
    if (
      adding &&
      ((type === "어법" && conditions.types.includes("어휘")) ||
        (type === "어휘" && conditions.types.includes("어법")))
    ) {
      onNotice("어법과 어휘는 한 세트에 넣지 않습니다", "alert");
      return;
    }
    setConditions((previous) => {
      const types = previous.types.includes(type)
        ? previous.types.filter((item) => item !== type)
        : ENGLISH_GENERATED_TYPES.filter(
            (item) => item === type || previous.types.includes(item),
          );
      return {
        ...previous,
        types,
        count: fitCount(previous.count, types.length),
      };
    });
  };

  function loadExamTypes() {
    setConditionsEdited(true);
    if (!exam.types.length) {
      onNotice("이 시험에 저장된 출제 설정이 없습니다.", "alert");
      return;
    }
    const types = exclusiveUnderline([...exam.types]);
    setConditions((previous) => ({
      ...previous,
      types,
      count: fitCount(previous.count, types.length),
    }));
  }

  /** 조건을 계약으로 잠근다 — 어긋나면 사유를 보이고 null. */
  function validatedConditions(): EnglishMakerConditions | null {
    if (
      conditions.mode !== "new" &&
      conditions.passage.length > ENGLISH_BANK_PATH_LIMITS.chatgpt
    ) {
      setConditionIssues([
        "ChatGPT·API 제작은 원문 18,000자까지 가능합니다. 글을 자르지 않았습니다. 원문 복원은 24,000자까지 지원합니다.",
      ]);
      return null;
    }
    const parsed = englishGenerateRequestSchema.safeParse({
      examId: exam.id,
      ...conditions,
    });
    if (!parsed.success) {
      setConditionIssues(parsed.error.issues.map(describeConditionIssue));
      return null;
    }
    setConditionIssues([]);
    const { mode, topic, passage, difficulty, count, words, types } =
      parsed.data;
    return {
      mode,
      topic,
      passage: bankPassage ? conditions.passage : passage,
      difficulty,
      count,
      words,
      types,
    };
  }

  async function prepareBank(
    bank: EnglishBankMakerSeed | null,
    path: MakerTab,
  ) {
    if (!bank) return;
    const body = await readJson(
      await fetch(
        `/api/english/passages/${bank.passageRef.passageId}/prepare`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            examId: exam.id,
            path,
            textRevision: bank.passageRef.textRevision,
          }),
        },
      ),
    );
    const prepared = englishPassagePrepareResponseSchema.safeParse(body);
    if (!prepared.success)
      throw new ApiFailure(
        0,
        "은행 원문 준비 결과를 읽지 못했습니다. 다시 시도해 주세요.",
      );
    const fresh = prepared.data.data;
    if (
      fresh.examId !== exam.id ||
      fresh.path !== path ||
      fresh.text !== bank.text ||
      !sameJson(fresh.passageRef, bank.passageRef)
    ) {
      throw new ApiFailure(
        409,
        "은행 원문이 변경되었습니다. 입력은 보존했습니다. 은행에서 원문을 확인하고 다시 불러와 주세요.",
        [],
        "PASSAGE_TEXT_MISMATCH",
      );
    }
  }

  /**
   * 같은 초안을 다시 누르면 같은 키를 쓴다. 폼을 바꿔 다른 초안이 되면 새 키다.
   * 키는 POST 전에 묶음에 남는다 — 응답이 끊겨도 «다시 저장»이 그 본문만 보낸다.
   */
  function bundleFor(draft: EnglishDraft, meta: EnglishSetMeta): SaveBundle {
    if (
      pendingSave &&
      pendingSave.examId === exam.id &&
      sameJson(pendingSave.draft, draft) &&
      sameJson(metaWithoutKey(pendingSave.meta), metaWithoutKey(meta))
    )
      return pendingSave;
    const bundle = {
      draft,
      meta: { ...meta, clientKey: crypto.randomUUID() },
      examId: exam.id,
    };
    setPendingSave(bundle);
    return bundle;
  }

  async function postBundle(bundle: SaveBundle): Promise<string> {
    setSaveFailure(null);
    try {
      const body = await readJson(
        // 묶음을 지은 시험으로 — 지금 보고 있는 시험이 아니다
        await fetch(`/api/english/exams/${bundle.examId}/sets`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            title: bundle.draft.title,
            source: bundle.draft.source,
            passage: bundle.draft.passage,
            questions: bundle.draft.questions,
            meta: bundle.meta,
          }),
        }),
      );
      const id = (body as { data?: { id?: unknown } } | null)?.data?.id;
      if (typeof id !== "string" || !id)
        throw new ApiFailure(0, "저장 결과를 읽지 못했습니다.");
      return id;
    } catch (error) {
      const failure =
        error instanceof ApiFailure
          ? error
          : new ApiFailure(0, messageOf(error));
      setSaveFailure(failure);
      throw failure;
    }
  }

  async function saveDraft(draft: EnglishDraft, meta: EnglishSetMeta) {
    const bundle = bundleFor(draft, meta);
    const id = await postBundle(bundle);
    setPendingSave(null);
    onNotice("초안으로 저장했습니다. 검토 화면에서 확인해 주세요.", "status");
    onSaved(id);
  }

  async function retrySave() {
    if (!pendingSave || busy || pendingSave.examId !== exam.id) return;
    const bundle = pendingSave;
    setBusy("save");
    try {
      const id = await postBundle(bundle);
      setPendingSave(null);
      onNotice("초안으로 저장했습니다. 검토 화면에서 확인해 주세요.", "status");
      onSaved(id);
    } catch (error) {
      onNotice(messageOf(error), "alert");
    } finally {
      setBusy(null);
    }
  }

  async function unlinkAndSave() {
    if (
      !pendingSave ||
      busy ||
      pendingSave.examId !== exam.id ||
      !pendingSave.meta.passageRef
    )
      return;
    const meta = { ...pendingSave.meta, clientKey: crypto.randomUUID() };
    delete meta.passageRef;
    const bundle = { ...pendingSave, meta };
    // Explicit new-copy action is the only operation that rewrites a pending relationship/key.
    setPendingSave(bundle);
    if (pendingSave.meta.path === "cloze") {
      if (sameJson(bankCloze?.passageRef, pendingSave.meta.passageRef))
        detachBank("cloze");
    } else if (sameJson(bankPassage?.passageRef, pendingSave.meta.passageRef))
      detachBank("external");
    setBusy("save");
    try {
      const id = await postBundle(bundle);
      setPendingSave(null);
      onNotice("은행 연결을 해제한 새 사본을 초안으로 저장했습니다.", "status");
      onSaved(id);
    } catch (error) {
      onNotice(messageOf(error), "alert");
    } finally {
      setBusy(null);
    }
  }

  function cancelPendingSave() {
    setPendingSave(null);
    setSaveFailure(null);
    onNotice(
      "저장 재시도를 취소했습니다. 작성 중인 입력은 그대로 남아 있습니다.",
      "status",
    );
  }

  async function copyRequest() {
    if (busy) return;
    const request = validatedConditions();
    if (!request) return;
    setBusy("prepare");
    setFallbackText(null);
    try {
      await prepareBank(bankPassage, "chatgpt");
      const text = buildChatgptRequest({ exam, request });
      const clipboard =
        typeof navigator === "undefined" ? undefined : navigator.clipboard;
      try {
        if (!clipboard?.writeText) throw new Error("clipboard unavailable");
        await clipboard.writeText(text);
        setFallbackText(null);
        onNotice(
          "요청문을 복사했습니다. ChatGPT 에 붙여 넣어 주세요.",
          "status",
        );
      } catch {
        setFallbackText(text);
      }
    } catch (error) {
      onNotice(messageOf(error), "alert");
    } finally {
      setBusy(null);
    }
  }

  async function importPaste() {
    if (busy) return;
    // «요청문 복사»와 같은 함수로 조건을 읽는다 — 조건이 계약을 못 지나면 여기서도 사유를 보이고 멈춘다.
    // (리드 검토 D4: 전에는 expectation 을 조용히 버리고 문항 수·유형 대조 없이 저장까지 갔다.)
    const request = validatedConditions();
    if (!request) return;
    const verdict = parseChatgptResult(pasteText, {
      mode: request.mode,
      passage: request.passage,
      count: request.count,
      types: request.types,
      allowUnderlineCompanion: true,
    });
    setFixOpen(false);
    setFixCopyFailed(false);
    if (!verdict.ok) {
      setPasteIssues(verdict.issues);
      const fix = buildChatgptFixRequest({ request, pasted: pasteText });
      setRejection(
        fix
          ? {
              pasted: pasteText,
              conditions: JSON.stringify(conditions),
              text: fix,
              bank: bankPassage,
            }
          : null,
      );
      return;
    }
    setPasteIssues([]);
    setRejection(null);
    setBusy("import");
    try {
      await saveDraft(
        verdict.draft,
        englishMetaFromConditions("chatgpt", request, {
          passageRef: bankPassage?.passageRef,
          materialName:
            request.mode === "new"
              ? undefined
              : (bankPassage?.title ??
                sameText(pickedPassage, request.passage)),
        }),
      );
      setPasteText("");
    } catch (error) {
      const message = messageOf(error);
      setPasteIssues([{ question: null, message }]);
      onNotice(message, "alert");
    } finally {
      setBusy(null);
    }
  }

  /** 수정 요청문 복사 — 거절된 그때의 글로 지은 것. 클립보드를 못 쓰면 글을 펼쳐 직접 복사하게 한다 */
  async function copyFixRequest() {
    if (!rejection || busy) return;
    setBusy("prepare");
    setFixOpen(false);
    setFixCopyFailed(false);
    try {
      // The rejected prompt still contains its original source after current input is edited.
      await prepareBank(rejection.bank, "chatgpt");
      const clipboard =
        typeof navigator === "undefined" ? undefined : navigator.clipboard;
      try {
        if (!clipboard?.writeText) throw new Error("clipboard unavailable");
        await clipboard.writeText(rejection.text);
        setFixCopyFailed(false);
        onNotice(
          "수정 요청문을 복사했습니다. 같은 ChatGPT 대화에 붙여 넣어 주세요.",
          "status",
        );
      } catch {
        setFixCopyFailed(true);
        setFixOpen(true);
      }
    } catch (error) {
      onNotice(messageOf(error), "alert");
    } finally {
      setBusy(null);
    }
  }

  async function toggleFixRequest() {
    if (fixOpen) {
      setFixOpen(false);
      return;
    }
    if (!rejection || busy) return;
    if (!rejection.bank) {
      setFixOpen(true);
      return;
    }
    setBusy("prepare");
    try {
      await prepareBank(rejection.bank, "chatgpt");
      setFixOpen(true);
    } catch (error) {
      onNotice(messageOf(error), "alert");
    } finally {
      setBusy(null);
    }
  }

  async function makeClozeSet() {
    if (busy) return;
    const text = bankCloze ? clozeText : clozeText.trim();
    if (!text.trim()) {
      setClozeError("원문을 입력해 주세요.");
      return;
    }
    if (text.length > ENGLISH_PASSAGE_MAX) {
      setClozeError(
        `원문은 ${ENGLISH_PASSAGE_MAX.toLocaleString("ko-KR")}자까지 넣을 수 있습니다.`,
      );
      return;
    }
    const result = makeCloze(text, clozeCount, `${exam.school} 원문 복원 연습`);
    if (!result.ok) {
      setClozeError(result.message);
      return;
    }
    const verdict = validateEnglishDraft(result.draft);
    if (!verdict.ok) {
      setClozeError(
        verdict.issues
          .map((issue) => `${issueLabel(issue)}: ${issue.message}`)
          .join(" "),
      );
      return;
    }
    setClozeError("");
    setBusy("cloze");
    const meta: EnglishSetMeta = { path: "cloze", count: clozeCount };
    const materialName = sameText(pickedCloze, text);
    if (bankCloze) {
      meta.passageRef = { ...bankCloze.passageRef };
      meta.materialName = bankCloze.title;
    } else if (materialName) meta.materialName = materialName;
    try {
      await prepareBank(bankCloze, "cloze");
      await saveDraft(verdict.draft, meta);
    } catch (error) {
      const message = messageOf(error);
      setClozeError(message);
      onNotice(message, "alert");
    } finally {
      setBusy(null);
    }
  }

  async function generateWithApi() {
    if (busy) return;
    const request = validatedConditions();
    if (!request) return;
    setApiError(null);
    setBusy("generate");
    setStartedAt(Date.now());
    let generating = false;
    try {
      await prepareBank(bankPassage, "api");
      generating = true;
      const body = await readJson(
        await fetch("/api/english/generate", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            examId: exam.id,
            ...request,
            ...(bankPassage ? { passageRef: bankPassage.passageRef } : {}),
          }),
        }),
      );
      const full = englishGenerateResponseSchema.safeParse(body);
      const draft = full.success
        ? full
        : englishDraftSchema.safeParse(
            (body as { data?: unknown } | null)?.data,
          );
      if (!draft.success)
        throw new ApiFailure(
          0,
          "생성 결과를 읽지 못했습니다. 다시 시도해 주세요.",
        );
      setAiLink("ready");
      // 부른 모델 · 프롬프트 판은 서버가 알려 준다(못 읽으면 빼고 저장한다 — 초안은 잃지 않는다)
      const model = full.success ? full.data.model : undefined;
      try {
        await saveDraft(
          full.success ? full.data.data : (draft.data as EnglishDraft),
          englishMetaFromConditions("api", request, {
            passageRef: bankPassage?.passageRef,
            model: model?.name,
            promptVersion: model?.promptVersion,
            materialName:
              request.mode === "new"
                ? undefined
                : (bankPassage?.title ??
                  sameText(pickedPassage, request.passage)),
          }),
        );
      } catch (error) {
        // 저장 실패(503 포함)는 연결 상태를 바꾸지 않는다. 생성 실패만 «대기»다.
        const failure =
          error instanceof ApiFailure
            ? error
            : new ApiFailure(0, messageOf(error));
        setApiError(failure);
      }
    } catch (error) {
      const failure =
        error instanceof ApiFailure
          ? error
          : new ApiFailure(0, messageOf(error));
      if (generating && failure.status === 503) setAiLink("waiting");
      setApiError(failure);
    } finally {
      setBusy(null);
    }
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % TABS.length
            : event.key === "ArrowLeft"
              ? (index + TABS.length - 1) % TABS.length
              : null;
    if (next === null) return;
    event.preventDefault();
    setTab(TABS[next]!.id);
    document.getElementById(tabId(TABS[next]!.id))?.focus();
  }

  const materialPicker = (onPick: (material: EnglishMaterial) => void) =>
    textMaterials.length ? (
      <select
        className={s.select}
        disabled={busy !== null}
        aria-label="저장한 자료 불러오기"
        value=""
        onChange={(event) => {
          const picked = textMaterials.find(
            (material) => material.id === event.target.value,
          );
          if (picked?.content) onPick(picked);
        }}
      >
        <option value="">저장한 자료 불러오기</option>
        {textMaterials.map((material) => (
          <option key={material.id} value={material.id}>
            {material.name}
          </option>
        ))}
      </select>
    ) : null;

  const conditionFields = (
    <div className={s.form}>
      {bankPassage ? (
        <p role="status" className={s.statusLine}>
          은행 원문 «{bankPassage.title}» 연결됨
        </p>
      ) : null}
      {bankMessage ? (
        <p role="status" className={s.statusLine}>
          {bankMessage}
        </p>
      ) : null}
      <fieldset className={s.group}>
        <legend>제작 방식</legend>
        <div className={s.choices}>
          {ENGLISH_GENERATE_MODES.map((mode) => (
            <label key={mode} className={s.choice}>
              <input
                type="radio"
                disabled={busy !== null}
                name={`${uid}-mode`}
                value={mode}
                checked={conditions.mode === mode}
                onChange={() => update({ mode })}
              />
              {MODE_LABEL[mode]}
            </label>
          ))}
        </div>
      </fieldset>
      {conditions.mode === "new" ? (
        <div className={s.field}>
          <label htmlFor={`${uid}-topic`}>소재</label>
          <input
            id={`${uid}-topic`}
            disabled={busy !== null}
            type="text"
            value={conditions.topic}
            maxLength={300}
            placeholder="예: 학교 텃밭 가꾸기"
            onChange={(event) => update({ topic: event.target.value })}
          />
        </div>
      ) : (
        <div className={s.field}>
          <div className={s.fieldHead}>
            <label htmlFor={`${uid}-passage`}>원문</label>
            {materialPicker((material) => {
              detachBank("external");
              setPickedPassage(material);
              update({ passage: material.content ?? "" });
            })}
          </div>
          <AutoGrowTextarea
            id={`${uid}-passage`}
            disabled={busy !== null}
            rows={8}
            value={conditions.passage}
            placeholder={`영어 원문을 붙여 넣으세요 (${ENGLISH_SOURCE_PASSAGE_MIN}자 이상).`}
            onChange={(event) => update({ passage: event.target.value })}
          />
        </div>
      )}
      <fieldset className={s.group}>
        <legend>난이도</legend>
        <div className={s.choices}>
          {ENGLISH_DIFFICULTIES.map((difficulty) => (
            <label key={difficulty} className={s.choice}>
              <input
                type="radio"
                disabled={busy !== null}
                name={`${uid}-difficulty`}
                value={difficulty}
                checked={conditions.difficulty === difficulty}
                onChange={() => update({ difficulty })}
              />
              {difficulty}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={s.row}>
        <div className={s.field}>
          <label htmlFor={`${uid}-count`}>문항 수</label>
          <select
            id={`${uid}-count`}
            disabled={busy !== null}
            className={s.select}
            value={conditions.count}
            onChange={(event) => update({ count: Number(event.target.value) })}
          >
            {COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}문항
              </option>
            ))}
          </select>
        </div>
        <div className={s.field}>
          <label htmlFor={`${uid}-words`}>지문 길이</label>
          <select
            id={`${uid}-words`}
            className={s.select}
            value={conditions.words}
            disabled={busy !== null || conditions.mode === "original"}
            onChange={(event) => update({ words: Number(event.target.value) })}
          >
            {WORD_OPTIONS.map((words) => (
              <option key={words} value={words}>
                약 {words}단어
              </option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className={s.group}>
        <legend>문항 유형</legend>
        <div className={s.choices}>
          {ENGLISH_GENERATED_TYPES.map((type) => (
            <label key={type} className={s.choice}>
              <input
                type="checkbox"
                disabled={busy !== null}
                checked={conditions.types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {type}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={busy !== null}
          className={s.quietButton}
          onClick={loadExamTypes}
        >
          이 시험의 출제 설정 불러오기
        </button>
      </fieldset>
      {conditionIssues.length ? (
        <ul role="alert" className={s.issues}>
          {conditionIssues.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    // 머리(«문제 만들기» WorkspacePageHeader)와 학교 칩·시험 고르기 줄은 뿌리 EnglishStudio(shell)가 그린다 —
    // 여기서는 탭 줄부터 시작한다(리드 결정 2026-09-30, 머리·시험 이름이 둘 나오던 자리).
    <div className={s.maker}>
      <div role="tablist" aria-label="문제 만들기 방법" className={s.tabs}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={tabs.tab}
            disabled={busy !== null}
            id={tabId(item.id)}
            aria-selected={tab === item.id}
            aria-controls={panelId(item.id)}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={moveTab}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section
        role="tabpanel"
        id={panelId("chatgpt")}
        aria-labelledby={tabId("chatgpt")}
        hidden={tab !== "chatgpt"}
        tabIndex={0}
        className={s.panel}
      >
        {tab === "chatgpt" ? (
          <>
            <div className={s.card}>
              <h2>ChatGPT 로 제작</h2>
              <p>
                ChatGPT 대화에서 만든 뒤 붙여 넣으면 초안으로 저장됩니다. API
                키가 필요 없습니다.
              </p>
            </div>
            {conditionFields}
            <div className={s.actions}>
              <button
                type="button"
                className={s.primaryButton}
                disabled={busy !== null}
                onClick={() => void copyRequest()}
              >
                요청문 복사
              </button>
            </div>
            {fallbackText !== null ? (
              <div className={s.field}>
                <p role="alert" className={s.alert}>
                  복사되지 않았습니다. 아래 글을 직접 복사해 주세요.
                </p>
                <textarea
                  aria-label="요청문"
                  readOnly
                  rows={10}
                  value={fallbackText}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>
            ) : null}
            <div className={s.field}>
              <label htmlFor={`${uid}-paste`}>ChatGPT 결과 붙여넣기</label>
              <textarea
                id={`${uid}-paste`}
                disabled={busy !== null}
                rows={10}
                value={pasteText}
                placeholder="ChatGPT 가 답한 JSON 을 그대로 붙여 넣으세요."
                onChange={(event) => setPasteText(event.target.value)}
              />
            </div>
            {pasteIssues.length ? (
              <div role="alert" className={s.alert}>
                {rejection &&
                (pasteText !== rejection.pasted ||
                  JSON.stringify(conditions) !== rejection.conditions) ? (
                  <p className={s.alertStale}>
                    아래 사유와 수정 요청문은 앞서 가져오기를 눌렀을 때의 글
                    기준입니다.
                  </p>
                ) : null}
                <p>
                  {rejection
                    ? "가져오지 못했습니다. 아래 사유를 ChatGPT 에 알려 고친 결과를 다시 붙여 넣어 주세요."
                    : "가져오지 못했습니다. 아래 사유를 고쳐 다시 붙여 넣어 주세요."}
                </p>
                <IssueList issues={pasteIssues} />
                {rejection ? (
                  <>
                    <div className={s.alertActions}>
                      <button
                        type="button"
                        className={s.quietButton}
                        disabled={busy !== null}
                        onClick={() => void copyFixRequest()}
                      >
                        수정 요청문 복사
                      </button>
                      <button
                        type="button"
                        className={s.quietButton}
                        disabled={busy !== null}
                        aria-expanded={fixOpen}
                        onClick={() => void toggleFixRequest()}
                      >
                        {fixOpen ? "수정 요청문 접기" : "수정 요청문 보기"}
                      </button>
                    </div>
                    {fixCopyFailed ? (
                      <p>복사되지 않았습니다. 아래 글을 직접 복사해 주세요.</p>
                    ) : null}
                    {fixOpen ? (
                      <textarea
                        aria-label="수정 요청문"
                        className={s.fixText}
                        readOnly
                        rows={10}
                        value={rejection.text}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
            <div className={s.actions}>
              <button
                type="button"
                className={s.primaryButton}
                disabled={busy !== null}
                onClick={() => void importPaste()}
              >
                {busy === "import" ? (
                  <WorkProgress variant="inline" label="저장 중…" />
                ) : (
                  "가져오기"
                )}
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section
        role="tabpanel"
        id={panelId("cloze")}
        aria-labelledby={tabId("cloze")}
        hidden={tab !== "cloze"}
        tabIndex={0}
        className={s.panel}
      >
        {tab === "cloze" ? (
          <>
            <div className={s.card}>
              <h2>원문 복원</h2>
              <p>
                입력한 원문의 단어를 빈칸으로 바꾸는 연습입니다. AI 추론형
                문항과 다릅니다.
              </p>
            </div>
            <div className={s.form}>
              {bankCloze ? (
                <p role="status" className={s.statusLine}>
                  은행 원문 «{bankCloze.title}» 연결됨
                </p>
              ) : null}
              {clozeBankMessage ? (
                <p role="status" className={s.statusLine}>
                  {clozeBankMessage}
                </p>
              ) : null}
              <div className={s.field}>
                <div className={s.fieldHead}>
                  <label htmlFor={`${uid}-cloze`}>복원할 원문</label>
                  {materialPicker((material) => {
                    detachBank("cloze");
                    setPickedCloze(material);
                    setClozeText(material.content ?? "");
                  })}
                </div>
                <AutoGrowTextarea
                  id={`${uid}-cloze`}
                  disabled={busy !== null}
                  rows={10}
                  value={clozeText}
                  placeholder="영어 원문을 붙여 넣으세요."
                  onChange={(event) => {
                    if (event.target.value !== clozeText) detachBank("cloze");
                    setClozeText(event.target.value);
                  }}
                />
              </div>
              <div className={s.row}>
                <div className={s.field}>
                  <label htmlFor={`${uid}-cloze-count`}>최대 문항 수</label>
                  <select
                    id={`${uid}-cloze-count`}
                    disabled={busy !== null}
                    className={s.select}
                    value={clozeCount}
                    onChange={(event) => {
                      setConditionsEdited(true);
                      setClozeCount(Number(event.target.value) as ClozeCount);
                    }}
                  >
                    {CLOZE_COUNTS.map((count) => (
                      <option key={count} value={count}>
                        {count}문항
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {clozeError ? (
                <p role="alert" className={s.alert}>
                  {clozeError}
                </p>
              ) : null}
              <div className={s.actions}>
                <button
                  type="button"
                  className={s.primaryButton}
                  disabled={busy !== null}
                  onClick={() => void makeClozeSet()}
                >
                  {busy === "cloze" ? (
                    <WorkProgress variant="inline" label="저장 중…" />
                  ) : (
                    "연습문제 만들기"
                  )}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section
        role="tabpanel"
        id={panelId("api")}
        aria-labelledby={tabId("api")}
        hidden={tab !== "api"}
        tabIndex={0}
        className={s.panel}
      >
        {tab === "api" ? (
          <>
            <div className={s.card}>
              <h2>API 직접 생성</h2>
              <p role="status" className={s.statusLine}>
                {aiLink === "ready"
                  ? "AI 연결됨"
                  : aiLink === "waiting"
                    ? "연결 대기 — AI 연결이 설정되지 않았습니다."
                    : "AI 연결 확인 전 — 첫 생성 때 확인합니다."}
              </p>
              <p>생성 시 소재·지문을 AI 서버로 보냅니다.</p>
            </div>
            {conditionFields}
            {apiError ? (
              <div role="alert" className={s.alert}>
                <p>{apiError.message}</p>
                {apiError.issues.length ? (
                  <IssueList issues={apiError.issues} />
                ) : null}
              </div>
            ) : null}
            <div className={s.actions}>
              <button
                type="button"
                className={s.primaryButton}
                disabled={busy !== null || aiLink === "waiting"}
                onClick={() => void generateWithApi()}
              >
                {busy === "generate" ? (
                  <WorkProgress
                    variant="inline"
                    label="생성 중…"
                    startedAt={startedAt}
                  />
                ) : (
                  "AI 지문·문제 생성"
                )}
              </button>
            </div>
          </>
        ) : null}
      </section>
      {/* 다른 시험을 보는 동안에는 숨긴다 — 그 시험으로 돌아오면 다시 보인다(묶음은 그대로) */}
      {pendingSave && pendingSave.examId === exam.id ? (
        <div className={s.card}>
          {saveFailure && pendingSave.meta.passageRef ? (
            <p role="alert" className={s.alert}>
              {saveFailure.message}{" "}
              {saveFailure.reason === "RIGHTS_REQUIRED"
                ? "은행에서 제작·외부 전송 이용 근거를 확인한 뒤 다시 저장해 주세요."
                : "입력과 저장할 초안을 보존했습니다. 은행 원문을 확인한 뒤 다시 저장하거나, 연결을 해제해 새 사본으로 저장할 수 있습니다."}
            </p>
          ) : null}
          <div className={s.actions}>
            <button
              type="button"
              className={s.primaryButton}
              disabled={busy !== null}
              onClick={() => void retrySave()}
            >
              {busy === "save" ? (
                <WorkProgress variant="inline" label="저장 중…" />
              ) : (
                "다시 저장"
              )}
            </button>
            {saveFailure && pendingSave.meta.passageRef ? (
              <button
                type="button"
                className={s.quietButton}
                disabled={busy !== null}
                onClick={() => void unlinkAndSave()}
              >
                은행 연결 해제 후 새 사본 저장
              </button>
            ) : null}
            <button
              type="button"
              className={s.quietButton}
              disabled={busy !== null}
              onClick={cancelPendingSave}
            >
              저장 재시도 취소
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
