"use client";

/**
 * «개념 백지» 탭(D-150 · 26 §4 · 브리프 cb-app) — 왼쪽 나무(학년 → 대단원 → 소단원) · 오른쪽 형식 카드 다섯 ·
 * 제목 · 아래 미리보기 · 머리 오른쪽 인쇄 옵션(날짜 — 기본 오늘 · 학생지 / 채점표 / 전체 · 인쇄하기 → 새 창
 * `/concept-blank/print?s=…&view=…&print=1` 이 지면을 그린 뒤 인쇄 창을 바로 띄운다 — 원장님 2026-10-01).
 *
 * 🔴 고정 문항 — 화면은 고르기(`ConceptBlankSelection`)만 만든다. 지면은 `composeSheets` 가 정하고, 같은 고르기면
 * 언제나 같은 지면이다. 은행은 props(기본 `CONCEPT_BLANK_BANK`) — 실제 은행이 비어 있는 동안 시험은 `FIXTURE_BANK`.
 * 고르기는 주소 `?blank=` 에도 싣는다(이 뷰가 보일 때만) — 새로 고치거나 즐겨찾기로 열면 되살아난다(DB 저장은 26 §7 잔고).
 *
 * 모양은 작업실 토큰 그대로(05 §8.9) · 두 칸은 영어 화면 결(05 §8.23) · 스위치는 진도 계획 화면 것(05 §8.10).
 * D-08(사무적) · D-30(손가락 커서는 단추 · 체크 칸에만). 🔴 새 화면의 첫 판이다 — D-07 로 원장님이 보고 고친다.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import ConceptBlankPreview from "@/components/concept-blank/ConceptBlankPreview";
import { PaperText } from "@/components/concept-blank/paper/PaperParts";
import {
  PrivateCloudClient,
  PrivateCloudError,
  cloudError,
  privateDocumentId,
} from "@/components/unified/privateCloudClient";
import Icon from "@/components/unified/WorkspaceIcon";
import { useLibrarySaveConfirmation } from "@/components/unified/LibrarySaveDialog";
import { workspaceLibraryLabel } from "@/contracts/accountAccess.contract";
import type {
  DocumentSharing,
  DocumentVisibility,
} from "@/contracts/privateWorkspace.contract";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import {
  CONCEPT_BLANK_FORM_LABELS,
  CONCEPT_BLANK_TITLE_MAX,
  CONCEPT_BLANK_FORMS,
  CONCEPT_BLANK_LEVELS,
  conceptBlankDocumentSchema,
  type ConceptBlankBank,
  type ConceptBlankDocument,
  type ConceptBlankForm,
  type ConceptBlankLevel,
  type ConceptBlankSelection,
  type LevelCounts,
} from "@/contracts/conceptBlank.contract";
import { loadGradeBank } from "@/lib/concept-blank/bank/load";
import { joinBanks } from "@/lib/concept-blank/bank/plus";
import {
  composeSheets,
  orderedSections,
  sheetItemCount,
  stockTable,
  type StockCounts,
} from "@/lib/concept-blank/compose";
import {
  BLANK_TREE,
  CONCEPT_BLANK_GRADES,
  getBlankSection,
  sectionTitleTex,
  type BlankChapter,
} from "@/lib/concept-blank/sections";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import {
  assertCurrentPicks,
  materializePicks,
  pickCounts,
  pickKey,
  pickPool,
  samePick,
  STALE_PICK_MESSAGE,
  setPickMode,
  type FormPicking,
} from "@/lib/concept-blank/manualPick";
import { kstDateOf } from "@/lib/kstDate";

import ConceptBlankFormTable from "./ConceptBlankFormTable";
import ConceptBlankQuestionPicker from "./ConceptBlankQuestionPicker";
import ConceptBlankUnitPicker from "./ConceptBlankUnitPicker";
import TextbookConceptLinks from "@/components/textbook/integration/TextbookConceptLinks";
import s from "./concept-blank.module.css";

/** 계약의 상한(`conceptBlankSelectionSchema`) — 형식 · 난이도마다 40, 소단원 60, 제목 40자. */
const COUNT_CAP = 40;
/** 숫자 칸의 처음 값 — 원장님 2026-10-01 «하/중/상 10문제씩»(26 §9 ⑽). 재고가 적으면 재고만큼. */
const DEFAULT_COUNT = 10;
const SECTION_CAP = 60;
const TITLE_MAX = CONCEPT_BLANK_TITLE_MAX;
/** 고르기를 싣는 주소 인수 — 셸의 해시(`#conceptBlank`)는 뷰 이름만 알아서 검색 인수에 둔다(`?set=` · `?extraction=` 결). */
const URL_PARAM = "blank";
/** 내 시험지에서 연(또는 저장한) 개념 백지의 자료 id — 새로 고쳐도 같은 자료에 이어서 저장한다(26 §9 ⑾). */
const DOC_PARAM = "blankDoc";
const PRINT_PATH = "/concept-blank/print";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ZERO: LevelCounts = { 하: 0, 중: 0, 상: 0 };

type Stock = StockCounts;
const EMPTY_STOCK: Stock = {
  concepts: { 하: 0, 중: 0, 상: 0 },
  term: { 하: 0, 중: 0, 상: 0 },
  cloze: { 하: 0, 중: 0, 상: 0 },
  map: { 하: 0, 중: 0, 상: 0 },
  recall: { 하: 0, 중: 0, 상: 0 },
  ox: { 하: 0, 중: 0, 상: 0 },
  apply: { 하: 0, 중: 0, 상: 0 },
  figures: { 하: 0, 중: 0, 상: 0 },
  total: 0,
};
/** `recall` — 개념 가운데 A(완전 백지)에 실을 수 있는 것(사례 문항을 뺀 수 · 26 §10). */
type StockKind =
  "concepts" | "term" | "cloze" | "map" | "recall" | "ox" | "apply" | "figures";
type Row = "main" | "extra";

const LETTER: Record<ConceptBlankForm, string> = {
  recall: "A",
  term: "B",
  cloze: "C",
  map: "D",
  figure: "E",
};

/** 형식마다 숫자 줄 — 첫 줄은 `counts`, 둘째 줄(B ○× · C 적용)은 `extras`. */
const ROWS: Record<
  ConceptBlankForm,
  {
    main: { label: string; stock: StockKind };
    extra?: { label: string; stock: StockKind };
  }
> = {
  recall: { main: { label: "개념 수", stock: "recall" } },
  term: {
    main: { label: "질문", stock: "term" },
    extra: { label: "○×", stock: "ox" },
  },
  cloze: {
    main: { label: "문장", stock: "cloze" },
    extra: { label: "적용", stock: "apply" },
  },
  map: { main: { label: "개념 수", stock: "map" } },
  figure: { main: { label: "그림", stock: "figures" } },
};

const HELP: Record<ConceptBlankForm, string> = {
  recall:
    "소단원 이름만 보고 아는 개념을 모두 씁니다. 수는 채점표에 싣는 개념 수입니다.",
  term: "용어를 보고 뜻을 씁니다. 뒤에 ○× 문항이 붙습니다.",
  cloze: "뜻 문장의 핵심어 자리를 채웁니다. 뒤에 적용 문항이 붙습니다.",
  map: "대단원마다 가운데 이름에서 가지를 뻗어 뜻과 예를 씁니다. 수는 가지 수입니다.",
  figure: "그림의 빈 이름표와 아래 줄을 채웁니다.",
};

const EMPTY_REASON: Record<ConceptBlankForm, string> = {
  recall: "고른 소단원에 개념 문항이 없습니다.",
  term: "고른 소단원에 용어 · ○× 문항이 없습니다.",
  cloze: "고른 소단원에 문장 · 적용 문항이 없습니다.",
  map: "고른 소단원에 개념 문항이 없습니다.",
  figure: "고른 소단원에 그림 문항이 없습니다.",
};

type FormDraft = FormPicking & {
  on: boolean;
  /** 원장님이 고친 수만 — 없으면 10(재고가 적으면 재고만큼). */
  counts: Partial<LevelCounts>;
  extras: Partial<LevelCounts>;
};
type Draft = {
  sections: string[];
  forms: Record<ConceptBlankForm, FormDraft>;
  formOrder: ConceptBlankForm[];
  title: string;
  date: string;
};

const sum = (c: LevelCounts) => c.하 + c.중 + c.상;
const isReadyGrade = (grade: string) =>
  (CONCEPT_BLANK_GRADES as readonly string[]).includes(grade);

/** 주소의 `?blank=` 를 읽어 처음 고르기를 세운다 — 없거나 틀리면 형식도 꺼진 빈 고르기. */
function initialDraft(): Draft {
  return draftFrom(
    typeof window === "undefined"
      ? null
      : decodeSelection(
          new URL(window.location.href).searchParams.get(URL_PARAM),
        ),
  );
}

/** 고르기 → 화면의 초안. 저장한 개념 백지에는 날짜가 없다 — 그때는 오늘. */
function draftFrom(saved: ConceptBlankSelection | null): Draft {
  const forms = Object.fromEntries(
    CONCEPT_BLANK_FORMS.map((form): [ConceptBlankForm, FormDraft] => [
      form,
      { on: false, counts: {}, extras: {}, mode: "auto", picks: [] },
    ]),
  ) as Record<ConceptBlankForm, FormDraft>;
  for (const f of saved?.forms ?? [])
    forms[f.form] = {
      on: true,
      counts: { ...f.counts },
      extras: { ...f.extras },
      mode: saved?.pick ? "pick" : "auto",
      picks: saved?.pick?.filter((pick) => pick.form === f.form) ?? [],
    };
  return {
    sections: saved?.pick
      ? [...saved.sections]
      : saved
        ? orderedSections(saved.sections)
        : [],
    forms,
    formOrder: saved?.pick
      ? [
          ...saved.forms.map(({ form }) => form),
          ...CONCEPT_BLANK_FORMS.filter(
            (form) => !saved.forms.some((f) => f.form === form),
          ),
        ]
      : [...CONCEPT_BLANK_FORMS],
    title: saved?.title ?? "",
    // 원장님 2026-10-01 «디폴트 오늘 날짜» — 주소에 날짜가 없으면 오늘(한국 시간). 비우면 지면의 학습일은 손으로 쓰는 줄.
    date: saved?.date ?? kstDateOf(new Date()),
  };
}

const gradeOf = (draft: Draft) =>
  draft.sections.length
    ? (getBlankSection(draft.sections[0]!)?.grade ?? null)
    : null;

/** 내 시험지에 담는 고르기 — 날짜를 뺀다(다음에 열면 그날). 저장했나를 가르는 열쇠도 이 꼴로 잰다. */
function documentSelection(
  selection: ConceptBlankSelection,
): ConceptBlankDocument["selection"] {
  return {
    sections: selection.sections,
    forms: selection.forms,
    ...(selection.pick ? { pick: selection.pick } : {}),
    ...(selection.title ? { title: selection.title } : {}),
  };
}
const selectionKey = (selection: ConceptBlankDocument["selection"]) =>
  JSON.stringify(conceptBlankDocumentSchema.shape.selection.parse(selection));

/** 내 시험지에 있는 그 자료 — 판 · 고르기 열쇠 · 자료의 지면 제목(내 시험지에서 이름을 바꾸면 이것이 바뀐다). */
type SavedDocument = {
  visibility?: DocumentVisibility;
  sharedBranchId?: string | null;
  id: string;
  revision: number;
  key: string;
  title: string;
};
type BlankDocument = Awaited<ReturnType<typeof readBlankDocument>>;
const savedFrom = (document: BlankDocument): SavedDocument => ({
  visibility: document.visibility,
  sharedBranchId: document.sharedBranchId,
  id: document.id,
  revision: document.revision,
  key: selectionKey(document.selection),
  title: document.selection.title ?? "",
});
/** 저장하려는데 판이 안 맞았다(다른 창 · 기기가 먼저 저장) — 다시 읽은 뒤 한 번 더 누르면 이 화면의 고르기로 저장한다. */
const CHANGED_ELSEWHERE =
  "내 시험지의 자료가 다른 곳에서 바뀌어 다시 읽었습니다. 다시 누르면 지금 고르기로 저장합니다.";

/** 내 시험지의 개념 백지 한 벌을 읽는다 — 다른 종류이거나 꼴이 틀리면 연다고 하지 않는다. */
async function readBlankDocument(client: PrivateCloudClient, id: string) {
  const document = await client.get(id);
  const parsed =
    document.kind === "conceptBlank"
      ? conceptBlankDocumentSchema.safeParse(document.payload)
      : null;
  if (!parsed?.success) throw new Error("저장한 개념 백지를 열지 못했습니다.");
  return {
    id: document.id,
    visibility: document.visibility,
    sharedBranchId: document.sharedBranchId,
    revision: document.revision,
    selection: parsed.data.selection,
  };
}

function stockLine(stock: Stock | undefined): string {
  if (!stock || stock.total === 0) return "문항 없음";
  return `개념 ${sum(stock.concepts)} · ○× ${sum(stock.ox)} · 적용 ${sum(stock.apply)} · 그림 ${sum(stock.figures)}`;
}

type Caps = Record<StockKind, LevelCounts>;

/** 숫자 칸의 최대 — 고른 소단원의 그 재고(계약 상한 40 에서 자른 것). */
function maxOf(caps: Caps, form: ConceptBlankForm, row: Row): LevelCounts {
  const spec = row === "main" ? ROWS[form].main : ROWS[form].extra;
  return spec ? caps[spec.stock] : ZERO;
}
/** 숫자 칸의 값 — 고친 수가 없으면 10, 있으면 그 수 — 어느 쪽이든 최대(재고) 안으로. */
function valueOf(
  draft: Draft,
  caps: Caps,
  form: ConceptBlankForm,
  row: Row,
): LevelCounts {
  const max = maxOf(caps, form, row);
  const stored = draft.forms[form][row === "main" ? "counts" : "extras"];
  const pick = (level: ConceptBlankLevel) =>
    Math.max(0, Math.min(stored[level] ?? DEFAULT_COUNT, max[level]));
  return { 하: pick("하"), 중: pick("중"), 상: pick("상") };
}
/** 형식을 켤 수 있나 — 고른 소단원에 그 형식이 쓰는 재고가 있어야 한다. */
function availableOf(chosen: string[], caps: Caps, form: ConceptBlankForm) {
  return (
    chosen.length > 0 &&
    sum(maxOf(caps, form, "main")) + sum(maxOf(caps, form, "extra")) > 0
  );
}

/**
 * 학년 은행을 늦게 불러온다(은행 3차 · `bank/load.ts`) — 소단원마다 10개씩이라 은행이 열 배, 화면 조각에 은행 전체를 싣지 않는다.
 * `grades` 의 학년만 부르고, 한 번 부른 학년은 다시 부르지 않는다. `null` 이면 부르지 않는다(은행을 props 로 받은 시험 · 시안).
 */
function useGradeBanks(grades: readonly string[] | null) {
  const [parts, setParts] = useState<ReadonlyMap<string, ConceptBlankBank>>(
    () => new Map(),
  );
  /** 못 온 학년 — 다시 불러 오면 뺀다(알림은 못 온 학년이 남아 있는 동안만). */
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const asked = useRef(new Set<string>());
  const wanted = grades ? grades.filter(isReadyGrade).join("|") : "";
  useEffect(() => {
    for (const grade of wanted ? wanted.split("|") : []) {
      if (asked.current.has(grade)) continue;
      asked.current.add(grade);
      loadGradeBank(grade).then(
        (bank) => {
          setParts((current) => new Map(current).set(grade, bank));
          setFailed((current) => {
            if (!current.has(grade)) return current;
            const next = new Set(current);
            next.delete(grade);
            return next;
          });
        },
        () => {
          asked.current.delete(grade);
          setFailed((current) => new Set(current).add(grade));
        },
      );
    }
  }, [wanted]);
  // 학년 차례로 잇는다 — 학년 안은 원래 파일 뒤에 보강(소단원 안 차례가 서버의 은행 전체와 같다).
  const bank = useMemo(
    () =>
      joinBanks(
        CONCEPT_BLANK_GRADES.flatMap((grade) => {
          const part = parts.get(grade);
          return part ? [part] : [];
        }),
      ),
    [parts],
  );
  return { bank, loaded: parts, failed: failed.size > 0 };
}

export type ConceptBlankViewProps = {
  /** 문항 은행 — 시험 · 시안은 `FIXTURE_BANK` 를 준다. 주지 않으면(제품) 학년마다 늦게 불러온다(`useGradeBanks`). */
  bank?: ConceptBlankBank;
  /** 셸에서 지금 보이는 뷰인가 — 보일 때만 주소에 고르기를 싣는다(떠나면 지운다). */
  active?: boolean;
  /** 내 시험지의 계정 범위 — 있으면 [내 시험지에 저장]이 선다(26 §9 ⑾). */
  storageScope?: string;
  branchId?: string | null;
  textbookEnabled?: boolean;
  /** 내 시험지에서 연 개념 백지 — 판(version)이 바뀔 때마다 그 자료를 불러와 고르기를 되살린다. */
  openDocument?: { id: string; version: number } | null;
};

export default function ConceptBlankView({
  bank: fixedBank,
  active = true,
  storageScope,
  branchId,
  openDocument,
  textbookEnabled = false,
}: ConceptBlankViewProps) {
  const uid = useId();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [pickingForm, setPickingForm] = useState<ConceptBlankForm | null>(null);
  const pickOpener = useRef<HTMLButtonElement>(null);
  const [openGrade, setOpenGrade] = useState<string | null>(() =>
    gradeOf(draft),
  );
  /** 내 시험지에 있는 자료 — 저장하면(또는 내 시험지에서 열면) 선다. 다음 저장은 이 자료의 다음 판이다. */
  const [savedDocument, setSavedDocument] = useState<SavedDocument | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  /** 처음 열 때 주소에 있던 자료 id(새로 고침) — 그 자료에 이어서 저장한다. 주소의 고르기(`?blank=`)는 그대로 둔다. */
  const [urlDocument] = useState(() => {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    const id = url.searchParams.get(DOC_PARAM);
    return id ? { id, keepDraft: url.searchParams.has(URL_PARAM) } : null;
  });
  const client = useMemo(
    () => (storageScope ? new PrivateCloudClient(storageScope) : null),
    [storageScope],
  );
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [restoreState, setRestoreState] = useState<{
    status: "loading" | "ready" | "error";
    message?: string;
  }>(() => ({ status: urlDocument ? "loading" : "ready" }));
  const [capHit, setCapHit] = useState(false);
  const [paperView, setPaperView] = useState<"student" | "key">("student");
  /** 인쇄할 지면 — 학생지 · 채점표 · 전체(학생지 뒤에 채점표). 원장님 2026-10-01 «본문/답지/전체 따로». */
  const [printView, setPrintView] = useState<"student" | "key" | "both">(
    "both",
  );

  /** 불러올 학년 — 고른 소단원의 학년 + 펼친 학년. 은행을 props 로 받았으면 부르지 않는다. */
  const neededGrades = useMemo(() => {
    if (fixedBank) return null;
    const grades = new Set<string>();
    for (const key of draft.sections) {
      const grade = getBlankSection(key)?.grade;
      if (grade) grades.add(grade);
    }
    if (openGrade) grades.add(openGrade);
    return [...grades];
  }, [fixedBank, draft.sections, openGrade]);
  const live = useGradeBanks(neededGrades);
  const bank = fixedBank ?? live.bank;
  /** 온 학년(props 은행이면 null — 다 있다). */
  const loadedGrades = fixedBank ? null : live.loaded;
  const hasGrade = (grade: string | undefined) =>
    !loadedGrades || !grade || !isReadyGrade(grade) || loadedGrades.has(grade);
  /** 고른 소단원의 학년이 다 왔나 — 오기 전에는 고르기를 정하지 않는다(주소 · 저장 · 인쇄를 건드리지 않는다). */
  const ready = draft.sections.every((key) =>
    hasGrade(getBlankSection(key)?.grade),
  );

  /** 소단원마다 재고 — 은행이 채우는 학년(초3~중3) 가운데 온 학년만. */
  const stockIndex = useMemo(() => {
    const table = stockTable(bank);
    const map = new Map<string, Stock>();
    for (const grade of BLANK_TREE)
      if (
        isReadyGrade(grade.grade) &&
        (!loadedGrades || loadedGrades.has(grade.grade))
      )
        for (const chapter of grade.chapters)
          for (const section of chapter.sections)
            map.set(section.key, table.get(section.key) ?? EMPTY_STOCK);
    return map;
  }, [bank, loadedGrades]);
  const selectable = (key: string) => (stockIndex.get(key)?.total ?? 0) > 0;

  /** 고른 소단원 — 재고가 있는 것만(학년이 아직 안 왔으면 일단 둔다), 교육과정 순서. */
  const chosen = useMemo(
    () =>
      orderedSections(
        draft.sections.filter(
          (key) =>
            (stockIndex.get(key)?.total ?? 0) > 0 ||
            // 아직 안 온 학년만 기다린다 — 은행이 없는 학년(초1 · 초2 · 고등)은 오지 않으니 전처럼 뺀다
            (!!loadedGrades &&
              isReadyGrade(getBlankSection(key)?.grade ?? "") &&
              !loadedGrades.has(getBlankSection(key)?.grade ?? "")),
        ),
      ),
    [draft.sections, stockIndex, loadedGrades],
  );
  const chosenSet = useMemo(() => new Set(chosen), [chosen]);

  /** 고른 소단원의 재고 합 — 숫자 칸의 최대(계약 상한 40 에서 자른다). */
  const caps = useMemo<Caps>(() => {
    const total = (kind: StockKind): LevelCounts => {
      const out = { ...ZERO };
      for (const key of chosen) {
        const stock = stockIndex.get(key) ?? EMPTY_STOCK;
        for (const level of CONCEPT_BLANK_LEVELS)
          out[level] += stock[kind][level];
      }
      for (const level of CONCEPT_BLANK_LEVELS)
        out[level] = Math.min(out[level], COUNT_CAP);
      return out;
    };
    return {
      concepts: total("concepts"),
      term: total("term"),
      cloze: total("cloze"),
      map: total("map"),
      recall: total("recall"),
      ox: total("ox"),
      apply: total("apply"),
      figures: total("figures"),
    };
  }, [chosen, stockIndex]);

  const isOn = (form: ConceptBlankForm) =>
    availableOf(chosen, caps, form) && draft.forms[form].on;

  const selectionError = useMemo(() => {
    if (!ready) return "";
    try {
      for (const form of CONCEPT_BLANK_FORMS) {
        const state = draft.forms[form];
        if (state.on && state.mode === "pick")
          assertCurrentPicks(bank, draft.sections, form, state.picks);
      }
      return "";
    } catch {
      return STALE_PICK_MESSAGE;
    }
  }, [ready, bank, draft.sections, draft.forms]);

  const selection = useMemo<ConceptBlankSelection | null>(() => {
    if (!ready || selectionError || !chosen.length) return null;
    const forms = draft.formOrder.flatMap((form) => {
      if (!availableOf(chosen, caps, form) || !draft.forms[form].on) return [];
      const counts = valueOf(draft, caps, form, "main");
      const extras = ROWS[form].extra
        ? valueOf(draft, caps, form, "extra")
        : { ...ZERO };
      return draft.forms[form].mode === "pick" || sum(counts) + sum(extras) > 0
        ? [{ form, counts, extras }]
        : [];
    });
    if (!forms.length) return null;
    const title = draft.title.trim().slice(0, TITLE_MAX);
    return materializePicks(
      {
        sections: chosen.slice(0, SECTION_CAP),
        forms,
        ...(title ? { title } : {}),
        ...(DATE_RE.test(draft.date) ? { date: draft.date } : {}),
      },
      draft.forms,
      bank,
    );
  }, [ready, selectionError, chosen, caps, draft, bank]);

  const hasDirect = CONCEPT_BLANK_FORMS.some(
    (form) => isOn(form) && draft.forms[form].mode === "pick",
  );
  const effectivePicks = (form: ConceptBlankForm) => {
    const valid = new Map(
      [
        ...pickPool(bank, chosen, form, "main"),
        ...pickPool(bank, chosen, form, "extra"),
      ].map((pick) => [pickKey(pick), pick]),
    );
    return draft.forms[form].picks.filter((pick) => {
      const current = valid.get(pickKey(pick));
      return current && samePick(pick, current);
    });
  };
  const openPicker = (form: ConceptBlankForm, opener: HTMLButtonElement) => {
    pickOpener.current = opener;
    setPickingForm(form);
  };

  const code = useMemo(() => {
    if (!selection) return null;
    try {
      return encodeSelection(selection);
    } catch {
      return null;
    }
  }, [selection]);
  const sheets = useMemo(
    () => (selection ? composeSheets(selection, bank) : []),
    [selection, bank],
  );
  /** 지면 코드(트랙 cb-code) — 인쇄와 같은 코드 줄을 미리보기에도(같은 문제는 같은 뷰). */
  const sheetCode = useMemo(
    () =>
      selection && !selection.pick && sheets.length
        ? encodeSheetCode(selection, bank)
        : undefined,
    [selection, sheets.length, bank],
  );
  const items = sheets.reduce((n, sheet) => n + sheetItemCount(sheet), 0);

  // 주소 `?blank=` — 이 뷰가 보일 때만 싣고, 떠나면 지운다. replaceState 라 셸의 해시 동기화(popstate)는 안 깨운다.
  // 학년 은행이 오는 동안은 건드리지 않는다 — 오기 전의 빈 고르기로 주소의 고르기를 지우면 새로 고침이 고르기를 잃는다.
  useEffect(() => {
    if (active && (!ready || selectionError)) return;
    const url = new URL(window.location.href);
    const next = active ? code : null;
    if (url.searchParams.get(URL_PARAM) === next) return;
    if (next) url.searchParams.set(URL_PARAM, next);
    else url.searchParams.delete(URL_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, [active, ready, selectionError, code]);

  // 주소 `?blankDoc=` — 내 시험지에 있는 자료면 그 id 를 같은 규칙으로 싣는다(새로 고쳐도 같은 자료에 저장).
  const savedId = savedDocument?.id ?? null;
  useEffect(() => {
    const url = new URL(window.location.href);
    const next = active
      ? (savedId ??
        (restoreState.status !== "ready" ? (urlDocument?.id ?? null) : null))
      : null;
    if (url.searchParams.get(DOC_PARAM) === next) return;
    if (next) url.searchParams.set(DOC_PARAM, next);
    else url.searchParams.delete(DOC_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }, [active, savedId, restoreState.status, urlDocument]);

  /** 내 시험지에서 읽은 자료를 받는다 — `keepDraft` 면 지금 고르기(주소의 아직 저장 안 한 고침)를 그대로 둔다. */
  const adopt = useCallback((document: BlankDocument, keepDraft: boolean) => {
    setSavedDocument(savedFrom(document));
    setSaveError("");
    if (keepDraft) return;
    const next = draftFrom(document.selection);
    setDraft(next);
    setOpenGrade(gradeOf(next));
  }, []);
  // 탭으로 돌아오면 그 자료를 다시 읽는다 — 이 화면은 숨은 채 살아 있어, 내 시험지에서 이름을 바꾸거나 지우면 판이 낡는다
  // (리뷰 2026-10-01). 지워졌으면 «저장됨»을 풀고(다음 저장은 새 자료), 이름이 바뀌었으면 제목 칸도 새 이름으로.
  const wasActive = useRef(active);
  useEffect(() => {
    const back = active && !wasActive.current;
    wasActive.current = active;
    if (!back || !client || !savedDocument) return;
    const previous = savedDocument;
    let live = true;
    readBlankDocument(client, previous.id).then(
      (document) => {
        if (!live) return;
        const next = savedFrom(document);
        setSavedDocument(next);
        if (next.title !== previous.title)
          setDraft((current) => ({ ...current, title: next.title }));
      },
      (cause) => {
        if (live && cause instanceof PrivateCloudError && cause.status === 404)
          setSavedDocument((current) =>
            current?.id === previous.id ? null : current,
          );
      },
    );
    return () => {
      live = false;
    };
  }, [active, client, savedDocument]);
  // 내 시험지의 [열기] — 판이 바뀔 때마다 다시 읽는다(같은 자료를 두 번 열어도).
  const openId = openDocument?.id;
  const openVersion = openDocument?.version;
  useEffect(() => {
    if (!client || !openId) return;
    let live = true;
    readBlankDocument(client, openId).then(
      (document) => {
        if (live) adopt(document, false);
      },
      (cause) => {
        if (live) setSaveError(cloudError(cause));
      },
    );
    return () => {
      live = false;
    };
  }, [client, openId, openVersion, adopt]);
  // 새로 고침 — 주소의 자료 id 를 읽어 판만 받는다. 지워졌으면 다음 저장이 새 자료가 된다.
  useEffect(() => {
    if (!client || !urlDocument) return;
    let live = true;
    readBlankDocument(client, urlDocument.id).then(
      (document) => {
        if (live) {
          adopt(document, urlDocument.keepDraft);
          setRestoreState({ status: "ready" });
        }
      },
      (cause) => {
        if (!live) return;
        const message =
          cause instanceof PrivateCloudError && cause.status === 403
            ? "이 자료를 열 권한이 없습니다. 자료 공유와 소속을 확인해 주세요."
            : cause instanceof PrivateCloudError && cause.status === 404
              ? "자료가 삭제되었거나 찾을 수 없습니다. 목록에서 다시 선택해 주세요."
              : `자료를 불러오지 못했습니다. ${cloudError(cause)}`;
        setRestoreState({ status: "error", message });
      },
    );
    return () => {
      live = false;
    };
  }, [client, urlDocument, adopt, restoreAttempt]);

  /** 고른 소단원을 바꾼다 — 기준은 지금 고른 것(재고 있는 것만). 상한 60 을 넘으면 앞에서 자르고 한 줄 알린다. */
  const changeSections = (next: string[], hit = false) => {
    setCapHit(hit);
    setDraft((current) => ({ ...current, sections: next }));
  };
  const addSections = (keys: string[]) => {
    const add = keys.filter((key) => !chosenSet.has(key));
    const room = Math.max(SECTION_CAP - chosen.length, 0);
    changeSections([...chosen, ...add.slice(0, room)], add.length > room);
  };
  const toggleSection = (key: string) => {
    if (!selectable(key)) return;
    if (chosenSet.has(key)) changeSections(chosen.filter((k) => k !== key));
    else addSections([key]);
  };
  const toggleChapter = (chapter: BlankChapter) => {
    const keys = chapter.sections.map((x) => x.key).filter(selectable);
    if (!keys.length) return;
    if (keys.every((key) => chosenSet.has(key)))
      changeSections(chosen.filter((k) => !keys.includes(k)));
    else addSections(keys);
  };
  const toggleForm = (form: ConceptBlankForm) =>
    setDraft((current) => ({
      ...current,
      forms: {
        ...current.forms,
        [form]: { ...current.forms[form], on: !current.forms[form].on },
      },
    }));
  const setCount = (
    form: ConceptBlankForm,
    row: Row,
    level: ConceptBlankLevel,
    raw: string,
  ) => {
    const max = maxOf(caps, form, row)[level];
    const n = Math.floor(Number(raw));
    const value = Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
    const field = row === "main" ? "counts" : "extras";
    setDraft((current) => ({
      ...current,
      forms: {
        ...current.forms,
        [form]: {
          ...current.forms[form],
          [field]: { ...current.forms[form][field], [level]: value },
        },
      },
    }));
  };

  const autoTitle =
    !draft.title.trim() && sheets[0] ? sheets[0].header.title : null;

  /** 내 시험지에 담을 고르기 — 날짜를 뺀 것. 저장한 것과 같으면 «저장됨». */
  const toSave = useMemo(
    () => (selection ? documentSelection(selection) : null),
    [selection],
  );
  const saved =
    !!toSave && !!savedDocument && savedDocument.key === selectionKey(toSave);
  /** [내 시험지에 저장] — 처음이면 새 자료, 내 시험지에 있는 자료면 그 다음 판. 자료 이름은 지면 제목. */
  const save = async (sharing?: DocumentSharing) => {
    if (
      !client ||
      !toSave ||
      saving ||
      (urlDocument && restoreState.status !== "ready")
    )
      return false;
    setSaving(true);
    setSaveError("");
    const title = (
      toSave.title ??
      sheets[0]?.header.title ??
      "개념 백지"
    ).slice(0, TITLE_MAX);
    const put = (id: string, revision: number | null) =>
      client.save(
        id,
        "conceptBlank",
        title,
        { selection: toSave },
        revision,
        sharing,
      );
    try {
      let document;
      try {
        document = await put(
          savedDocument?.id ?? privateDocumentId(),
          savedDocument?.revision ?? null,
        );
      } catch (cause) {
        // 판이 안 맞으면(409) 다시 읽는다. 지워졌으면(404) 새 자료로 담는다 — 고르기뿐이라 잃을 것이 없다.
        // 다른 곳에서 먼저 저장했으면 새 판을 받고 알린다 — 다시 누르면 이 화면의 고르기로 저장한다.
        if (
          !savedDocument ||
          !(cause instanceof PrivateCloudError && cause.status === 409) ||
          cause.code === "BRANCH_CHANGED"
        )
          throw cause;
        const latest = await readBlankDocument(client, savedDocument.id).catch(
          (missing) =>
            missing instanceof PrivateCloudError && missing.status === 404
              ? null
              : Promise.reject(cause),
        );
        if (latest) {
          setSavedDocument(savedFrom(latest));
          throw new Error(CHANGED_ELSEWHERE);
        }
        document = await put(privateDocumentId(), null);
      }
      setSavedDocument({
        id: document.id,
        visibility: document.visibility,
        sharedBranchId: document.sharedBranchId,
        revision: document.revision,
        key: selectionKey(toSave),
        title: toSave.title ?? "",
      });
      return true;
    } catch (cause) {
      setSaveError(cloudError(cause));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const { requestSave, dialog: saveDialog } = useLibrarySaveConfirmation(
    branchId,
    "conceptBlank",
    save,
    savedDocument?.sharedBranchId === branchId
      ? savedDocument?.visibility
      : "private",
  );
  // `print=1` — 인쇄 페이지가 지면을 다 그린 뒤 인쇄 창을 바로 띄운다(원장님 2026-10-01 «ctrl+p 말고 인쇄버튼으로»)
  const printHref = code
    ? `${PRINT_PATH}?s=${code}&view=${printView}&print=1`
    : null;

  return (
    <div className={s.view}>
      {saveDialog}
      {pickingForm && (
        <ConceptBlankQuestionPicker
          key={pickingForm}
          bank={bank}
          sections={chosen}
          form={pickingForm}
          picks={draft.forms[pickingForm].picks}
          targets={{
            main: valueOf(draft, caps, pickingForm, "main"),
            extra: valueOf(draft, caps, pickingForm, "extra"),
          }}
          returnFocus={pickOpener}
          onCancel={() => setPickingForm(null)}
          onApply={(picks, targets) => {
            setDraft((current) => ({
              ...current,
              forms: {
                ...current.forms,
                [pickingForm]: {
                  ...current.forms[pickingForm],
                  picks,
                  counts: targets.main,
                  extras: targets.extra,
                },
              },
            }));
            setPickingForm(null);
          }}
        />
      )}
      <WorkspacePageHeader
        title="개념 백지"
        description="학년 · 대단원 · 소단원을 고르고 형식마다 난이도별 문항 수를 정합니다. 같은 고르기는 언제나 같은 지면입니다."
      >
        <div className={s.printBar}>
          <label className={s.printDate}>
            <span>날짜</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
          </label>
          <div className={s.printSegment} role="group" aria-label="인쇄할 지면">
            {(
              [
                ["student", "학생지"],
                ["key", "채점표"],
                ["both", "전체"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={printView === value}
                onClick={() => setPrintView(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {client && (
            <button
              type="button"
              className={s.secondaryButton}
              disabled={
                !toSave ||
                saving ||
                (saved && !branchId) ||
                Boolean(urlDocument && restoreState.status !== "ready")
              }
              onClick={requestSave}
            >
              {saving
                ? "저장 중…"
                : saved && !branchId
                  ? "저장됨"
                  : `${workspaceLibraryLabel(branchId)}에 저장`}
            </button>
          )}
          {printHref ? (
            <a
              className={s.primaryButton}
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="print" size={18} />
              인쇄하기
            </a>
          ) : (
            <button type="button" className={s.primaryButton} disabled>
              <Icon name="print" size={18} />
              인쇄하기
            </button>
          )}
        </div>
      </WorkspacePageHeader>
      {urlDocument && restoreState.status === "loading" ? (
        <p role="status" className="mb-4 text-sm">
          {client
            ? "저장된 자료를 불러오는 중…"
            : "저장된 자료를 열려면 로그인과 자료 접근 권한을 확인해 주세요."}
        </p>
      ) : null}
      {restoreState.status === "error" ? (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-control p-4 text-sm"
        >
          <span>{restoreState.message}</span>
          <button
            type="button"
            className={s.secondaryButton}
            onClick={() => {
              setRestoreState({ status: "loading" });
              setRestoreAttempt((value) => value + 1);
            }}
          >
            자료 다시 불러오기
          </button>
          <Link className={s.secondaryButton} href="/#library">
            자료 목록으로 돌아가기
          </Link>
        </div>
      ) : null}
      {textbookEnabled && (
        <TextbookConceptLinks sections={chosen} active={active} />
      )}
      {live.failed && (
        <p className={s.saveError} role="alert">
          문항을 불러오지 못했습니다. 새로 고쳐 주세요.
        </p>
      )}
      {saveError && (
        <p className={s.saveError} role="alert">
          {saveError}
        </p>
      )}
      {selectionError && (
        <div className={s.saveError} role="alert">
          <p>{selectionError}</p>
          {draft.formOrder
            .filter(
              (form) =>
                draft.forms[form].on && draft.forms[form].mode === "pick",
            )
            .map((form) => (
              <button
                key={form}
                type="button"
                className={s.secondaryButton}
                onClick={(event) => openPicker(form, event.currentTarget)}
              >
                {CONCEPT_BLANK_FORM_LABELS[form]} 다시 고르기
              </button>
            ))}
        </div>
      )}

      <div className={s.grid}>
        <ConceptBlankUnitPicker selected={chosen}>
          <section
            className={`${s.card} ${s.treeCard}`}
            aria-labelledby={`${uid}-tree`}
          >
            <div className={s.cardHead}>
              <h2 id={`${uid}-tree`} className={s.cardTitle}>
                단원 고르기
              </h2>
              <span className={s.num}>고른 소단원 {chosen.length}</span>
              {chosen.length > 0 && (
                <button
                  type="button"
                  className={s.quietButton}
                  onClick={() => changeSections([])}
                >
                  모두 풀기
                </button>
              )}
            </div>
            <p className={s.desc}>
              학년을 펼쳐 대단원이나 소단원을 고릅니다. 학년을 넘어 여러 개를
              고를 수 있습니다.
            </p>
            {capHit && (
              <p className={s.note} role="status">
                소단원은 {SECTION_CAP}개까지 고를 수 있습니다.
              </p>
            )}
            <ul className={s.grades}>
              {BLANK_TREE.map((grade, gi) => {
                if (!isReadyGrade(grade.grade))
                  return (
                    <li key={grade.grade} className={s.grade}>
                      <div className={s.gradePending}>
                        <span className={s.gradeName}>{grade.grade}</span>
                        <span className={s.pending}>준비 중</span>
                      </div>
                    </li>
                  );
                const open = openGrade === grade.grade;
                const picked = grade.chapters.reduce(
                  (n, c) =>
                    n + c.sections.filter((x) => chosenSet.has(x.key)).length,
                  0,
                );
                const panelId = `${uid}-g${gi}`;
                return (
                  <li key={grade.grade} className={s.grade}>
                    <button
                      type="button"
                      className={s.gradeButton}
                      aria-expanded={open}
                      aria-controls={open ? panelId : undefined}
                      onClick={() => setOpenGrade(open ? null : grade.grade)}
                    >
                      <span className={s.gradeName}>{grade.grade}</span>
                      {picked > 0 && (
                        <span className={s.picked}>{picked}개 고름</span>
                      )}
                      <span className={s.chevron}>
                        <Icon name="chevron" size={16} />
                      </span>
                    </button>
                    {open && (
                      <ul id={panelId} className={s.chapters}>
                        {grade.chapters.map((chapter, ci) => {
                          const keys = chapter.sections
                            .map((x) => x.key)
                            .filter(selectable);
                          const count = keys.filter((k) =>
                            chosenSet.has(k),
                          ).length;
                          const all = keys.length > 0 && count === keys.length;
                          return (
                            <li
                              key={chapter.key}
                              className={s.chapter}
                              data-empty={keys.length ? undefined : "true"}
                            >
                              <label className={`${s.check} ${s.chapterLabel}`}>
                                <input
                                  type="checkbox"
                                  checked={all}
                                  disabled={!keys.length}
                                  ref={(el) => {
                                    if (el)
                                      el.indeterminate = count > 0 && !all;
                                  }}
                                  onChange={() => toggleChapter(chapter)}
                                />
                                <span>{chapter.title}</span>
                              </label>
                              <ul className={s.sections}>
                                {chapter.sections.map((section, si) => {
                                  const stock = stockIndex.get(section.key);
                                  const loading = !hasGrade(grade.grade);
                                  const empty = !stock || stock.total === 0;
                                  const stockId = `${uid}-g${gi}c${ci}s${si}`;
                                  return (
                                    <li
                                      key={section.key}
                                      className={s.section}
                                      data-empty={
                                        empty && !loading ? "true" : undefined
                                      }
                                    >
                                      <label className={s.check}>
                                        <input
                                          type="checkbox"
                                          checked={chosenSet.has(section.key)}
                                          disabled={empty}
                                          aria-describedby={stockId}
                                          onChange={() =>
                                            toggleSection(section.key)
                                          }
                                        />
                                        <span>
                                          <PaperText
                                            text={sectionTitleTex(
                                              section.title,
                                            )}
                                          />
                                        </span>
                                      </label>
                                      <span id={stockId} className={s.stock}>
                                        {loading
                                          ? "불러오는 중"
                                          : stockLine(stock)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
              <li className={s.grade}>
                <div className={s.gradePending}>
                  <span className={s.gradeName}>고등</span>
                  <span className={s.pending}>준비 중</span>
                </div>
              </li>
            </ul>
          </section>
        </ConceptBlankUnitPicker>

        <div className={s.column}>
          <ConceptBlankFormTable
            columns={CONCEPT_BLANK_FORMS.map((form) => ({
              form,
              label: CONCEPT_BLANK_FORM_LABELS[form],
              letter: LETTER[form],
              help: HELP[form],
              on: isOn(form),
              mode: draft.forms[form].mode,
              available: availableOf(chosen, caps, form),
              reason: !chosen.length
                ? "소단원을 먼저 고르세요."
                : availableOf(chosen, caps, form)
                  ? null
                  : EMPTY_REASON[form],
              fields: (["main", "extra"] as const)
                .filter((row) => row === "main" || ROWS[form].extra)
                .map((row) => ({
                  row,
                  label: (row === "main" ? ROWS[form].main : ROWS[form].extra!)
                    .label,
                  max: maxOf(caps, form, row),
                  value:
                    draft.forms[form].mode === "pick"
                      ? pickCounts(effectivePicks(form), row)
                      : valueOf(draft, caps, form, row),
                })),
            }))}
            onToggle={toggleForm}
            onCount={setCount}
            onMode={(form, mode, opener) => {
              setDraft((current) => ({
                ...current,
                forms: {
                  ...current.forms,
                  [form]: setPickMode(current.forms[form], mode),
                },
              }));
              if (mode === "pick") openPicker(form, opener);
            }}
            onPick={openPicker}
          />

          <section className={s.card} aria-labelledby={`${uid}-meta`}>
            <h2 id={`${uid}-meta`} className={s.cardTitle}>
              제목
            </h2>
            <div className={s.metaGrid}>
              <label className={s.field}>
                <span>제목</span>
                <input
                  type="text"
                  maxLength={TITLE_MAX}
                  value={draft.title}
                  placeholder={autoTitle ?? "비우면 단원 이름이 들어갑니다"}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </section>
        </div>
      </div>

      <section className={`${s.card} ${s.outlineCard}`} aria-label="만들 지면">
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>만들 지면</h2>
          <span className={s.num}>문항 {items}</span>
        </div>
        <div className={s.sheetOutline}>
          {selection?.forms.map(({ form, counts, extras }) => (
            <span key={form}>
              <b>{LETTER[form]}</b> {CONCEPT_BLANK_FORM_LABELS[form]}{" "}
              <span className={s.outlineDetail}>
                {ROWS[form].main.label} {sum(counts)}
                {ROWS[form].extra
                  ? ` · ${ROWS[form].extra.label} ${sum(extras)}`
                  : ""}{" "}
                · {draft.forms[form].mode === "pick" ? "직접" : "자동"}
              </span>
            </span>
          ))}
          <span className={s.codeSlot}>
            지면 코드{" "}
            <span className={s.codeValue} data-none={hasDirect}>
              {hasDirect
                ? "없음 — 직접 고른 형식이 있습니다"
                : (sheetCode ?? "없음")}
            </span>
          </span>
        </div>
      </section>

      <section
        className={`${s.card} ${s.previewCard}`}
        aria-labelledby={`${uid}-preview`}
      >
        <div className={s.cardHead}>
          <h2 id={`${uid}-preview`} className={s.cardTitle}>
            미리보기
          </h2>
          {sheets.length > 0 && (
            <span className={s.num}>
              형식 {selection?.forms.length ?? 0} · 문항 {items}
            </span>
          )}
          <div className={s.segment} role="group" aria-label="미리보기 지면">
            <button
              type="button"
              aria-pressed={paperView === "student"}
              onClick={() => setPaperView("student")}
            >
              학생지
            </button>
            <button
              type="button"
              aria-pressed={paperView === "key"}
              onClick={() => setPaperView("key")}
            >
              채점표
            </button>
          </div>
        </div>
        {sheets.length > 0 ? (
          <ConceptBlankPreview
            key={`${paperView}-${sheetCode}`}
            code={sheetCode}
            sheets={sheets}
            view={paperView}
          />
        ) : (
          <p className={s.empty}>
            {ready
              ? chosen.length > 0 && !CONCEPT_BLANK_FORMS.some(isOn)
                ? "형식을 하나 이상 켜세요."
                : "소단원과 형식을 고르면 지면이 나옵니다."
              : "문항을 불러오는 중입니다."}
          </p>
        )}
      </section>
    </div>
  );
}
