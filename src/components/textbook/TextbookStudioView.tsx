"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  TextbookRequestError,
  httpTextbookApi,
  newRequestId,
  type PreviewMaterial,
  type TextbookStudioApi,
} from "@/lib/textbook/client";
import {
  applyEditionEdits,
  conceptManuscriptChanged,
  initialEditionFromLocation,
  lectureRefsFor,
  manuscriptLocked,
  mergeCapturedSection,
  moveOutlineSection,
  moveOutlineUnit,
  measuredSpreadAnchor,
  nextMeasuredSpread,
  orderBlankPicks,
  sourceUnitIdsFor,
  spreadStarts,
  suggestSectionKey,
  TEMPLATE_CHOICES,
  withConceptLecture,
  type AssignmentRow,
  type Audience,
  type BookSummary,
  type ConceptDraft,
  type EditionDetail,
  type ImportMode,
  type NamedChoice,
  type MeasuredPageRef,
  type OutlineUnit,
  type PaperPreviewInput,
  type PreviewMode,
  type PublishJob,
  type PublishStatus,
  type SectionBlock,
  type SectionDetail,
  type SolutionPolicy,
  type StudioIssue,
  type StudioPane,
  type VideoBinding,
  type ZoomMode,
} from "@/components/textbook/model";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import {
  AssignmentPanel,
  BookList,
  ConfigPanel,
  ImportPanel,
  LectureLink,
  ObservationForm,
  Outline,
  PreviewPane,
  PublishPanel,
  ReissuePanel,
  ReviewTable,
  SectionEditor,
  VideoPanel,
  paperInput,
} from "@/components/textbook/parts";
import { SectionMeasure } from "@/components/textbook/measuredPreview";
import { buildSectionPreview } from "@/components/textbook/previewModel";
import styles from "@/components/textbook/textbook.module.css";
import { AutoCreatePanel } from "./AutoCreatePanel";
import {
  httpQuickCreateApi,
  type QuickCreateApi,
} from "@/lib/textbook/quickCreateClient";
import { finishTextbookPdf } from "@/lib/textbook/simplePublish";
import {
  TEXTBOOK_BEFORE_LEAVE,
  type TextbookLeaveDetail,
} from "@/lib/textbook/navigation";

export type { PaperPreviewInput };

type Panel =
  "edit" | "review" | "publish" | "assign" | "reissue" | "video" | "import";

function messageOf(reason: unknown): string {
  return reason instanceof Error && reason.message
    ? reason.message
    : "교재를 불러오지 못했습니다.";
}

function serverTextOf(section: SectionDetail | null): string | null {
  if (!section) return null;
  for (const block of section.blocks) {
    if (block.kind === "dialogue") {
      const turn = block.turns[0];
      if (turn) return turn.text;
    }
  }
  return section.title;
}

function sameDraft(
  left: SectionDetail | null,
  right: SectionDetail | null,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

type PendingNav =
  | { kind: "section"; sectionId: string; entry?: "first" | "last" }
  | { kind: "list" }
  | { kind: "new-draft" }
  /** 작업실 밖으로 나가는 앱 안 링크 — 같은 출처의 경로만 담는다 */
  | { kind: "link"; href: string }
  /** 작업실이 다른 화면으로 바꾸려 한다 — 저장하거나 버린 뒤에만 `proceed` 를 부른다 */
  | { kind: "workspace"; proceed: () => void };

const hasConceptBlock = (section: SectionDetail, conceptKey: string) =>
  section.blocks.some(
    (block) => block.kind === "concept" && block.conceptKey === conceptKey,
  );

/** 원고(블록 · 제목 · 메모 …)만 견준다 — 개념 원고와 백지 고르기는 따로 저장하는 것이라 뺀다 */
const manuscriptDirty = (draft: SectionDetail, saved: SectionDetail) =>
  !sameDraft({ ...draft, concept: saved.concept, picks: saved.picks }, saved);

/** 응답을 받지 못한 실패(통신이 끊김) — 서버가 처리했는지 알 수 없다 */
const outcomeUnknown = (reason: unknown) =>
  !(reason instanceof TextbookRequestError) || reason.status === 0;

/**
 * 누른 것이 «이 화면을 떠나는 앱 안 링크»면 그 경로를, 아니면 null.
 * 새 탭 · 내려받기 · 다른 출처 · 같은 화면 안의 # 이동은 이 화면을 내리지 않으므로 막지 않는다.
 */
export function leavingHref(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return null;
  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  )
    return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function TextbookStudioView({
  api = httpTextbookApi,
  audience = "teacher",
  renderPaper,
  viewport,
  initialEditionId,
  quickApi = httpQuickCreateApi,
}: {
  api?: TextbookStudioApi;
  audience?: Audience;
  renderPaper?: (input: PaperPreviewInput) => ReactNode;
  viewport?: "desktop" | "mobile";
  initialEditionId?: string;
  quickApi?: QuickCreateApi;
}) {
  const router = useRouter();
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edition, setEdition] = useState<EditionDetail | null>(null);
  const [draft, setDraft] = useState<SectionDetail | null>(null);
  const [saved, setSaved] = useState<SectionDetail | null>(null);
  const [conflict, setConflict] = useState<{
    message: string;
    serverText: string | null;
  } | null>(null);
  const [showServer, setShowServer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<PreviewMode>("draft");
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const [pane, setPane] = useState<StudioPane>("manuscript");
  const [panel, setPanel] = useState<Panel>("edit");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [pdfJob, setPdfJob] = useState<PublishJob | null>(null);
  const pdfRequest = useRef<{
    editionId: string;
    revision: number;
    requestId: string;
  } | null>(null);
  const [issues, setIssues] = useState<StudioIssue[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [videos, setVideos] = useState<VideoBinding[]>([]);
  const [loadedMaterial, setLoadedMaterial] = useState<{
    editionId: string;
    value: PreviewMaterial | null;
  } | null>(null);
  const material =
    edition && loadedMaterial?.editionId === edition.editionId
      ? loadedMaterial.value
      : null;
  const [measuredPages, setMeasuredPages] = useState<MeasuredPageRef[]>([]);
  const [spreadIndex, setSpreadIndex] = useState<number | null>(null);
  const [seenMeasureKey, setSeenMeasureKey] = useState<string | null>(null);
  const pendingSpreadEntry = useRef<{
    key: string;
    entry: "first" | "last";
  } | null>(null);
  const [reissueClasses, setReissueClasses] = useState<NamedChoice[]>([]);
  const [reissueUnits, setReissueUnits] = useState<NamedChoice[]>([]);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [simplePreview, setSimplePreview] = useState(true);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [title, setTitle] = useState("");
  const [volumeCode, setVolumeCode] = useState("");
  const [curriculumVersion, setCurriculumVersion] = useState("");
  const [pageTarget, setPageTarget] = useState("");
  const [videoPolicy, setVideoPolicy] = useState<"required" | "optional">(
    "optional",
  );
  const [solutionPolicy, setSolutionPolicy] = useState<SolutionPolicy>("never");
  const [schoolLevel, setSchoolLevel] = useState<
    "elementary" | "middle" | "high"
  >("elementary");
  const [grade, setGrade] = useState("5");
  const [semester, setSemester] = useState<"1" | "2">("1");
  const [bookMode, setBookMode] = useState<
    "integrated" | "concept" | "practice"
  >("integrated");
  const [innerMarginMm, setInnerMarginMm] = useState("15");
  const [outerMarginMm, setOuterMarginMm] = useState("15");
  const [coverMode, setCoverMode] = useState<"included" | "separate">(
    "separate",
  );
  const [conceptSource, setConceptSource] = useState<TextbookConcept | null>(
    null,
  );
  const [conceptRevision, setConceptRevision] = useState(0);
  const [conceptLinks, setConceptLinks] = useState<TextbookConcept["links"]>(
    [],
  );
  const [savedLinks, setSavedLinks] = useState<TextbookConcept["links"]>([]);
  const [confirmLinkIds, setConfirmLinkIds] = useState<string[]>([]);
  const [confirmEntryIds, setConfirmEntryIds] = useState<string[]>([]);
  const [newUnitKey, setNewUnitKey] = useState("");
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [pendingNav, setPendingNav] = useState<PendingNav | null>(null);
  /** «저장 후 이동»이 도는 동안 — 같은 단추를 두 번 누르지 못하게 한다 */
  const [leaving, setLeaving] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);
  /** 가져오기가 돌려준 오류 — 판본 검수 항목(`issues`)과 섞지 않는다 */
  const [importIssues, setImportIssues] = useState<StudioIssue[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  /** 내보낸 교환 파일 — 그 판본 · 그 revision 의 것만 보여 준다 */
  const [exportLink, setExportLink] = useState<{
    editionId: string;
    revision: number;
    href: string;
    label: string;
  } | null>(null);
  const exportEpoch = useRef(0);
  const [showImport, setShowImport] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionKey, setNewSectionKey] = useState("");
  const [newTemplateKey, setNewTemplateKey] = useState("basic");
  /** 새 구획을 넣을 단원. 비어 있으면 지금 연 구획의 단원이다 */
  const [newSectionUnitKey, setNewSectionUnitKey] = useState("");
  /** 발행 확정이 성공한 판본 — 판본을 다시 읽기 전에 먼저 잠근다 */
  const [finalizedEditionId, setFinalizedEditionId] = useState<string | null>(
    null,
  );
  /** 발행 뒤(또는 결과를 모르는 확정 뒤) 판본 다시 읽기가 실패한 상태 */
  const [publishRead, setPublishRead] = useState<{
    editionId: string;
    message: string;
    unknown: boolean;
  } | null>(null);
  /** 개념은 저장됐는데 구획에 잇지 못한 상태 — 다시 시도는 잇기만 한다 */
  const [conceptLink, setConceptLink] = useState<{
    sectionId: string;
    conceptKey: string;
    message: string;
  } | null>(null);
  const [videoChoices, setVideoChoices] = useState<NamedChoice[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  /**
   * 방금 승인한 작업실 이동. 넘겨받은 길(`proceed`)은 주소를 되돌려 놓고 같은 이동을 **다시 물어 올 수 있다**
   * (작업실의 # · 뒤로가기 동기화). 그때 이 화면은 아직 다시 그려지기 전이라 옛 상태를 본다 —
   * 승인이 살아 있는 동안에는 다시 붙잡지 않는다. 상태가 바뀌어 다시 그려지면 거둔다.
   */
  const approvedLeave = useRef(false);
  const [mediaNarrow, setMediaNarrow] = useState(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    )
      return false;
    return window.matchMedia("(max-width: 800px)").matches;
  });
  const narrow = viewport ? viewport === "mobile" : mediaNarrow;

  useEffect(() => {
    if (viewport || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 800px)");
    const apply = () => setMediaNarrow(query.matches);
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [viewport]);

  async function loadBooks() {
    setLoadError(null);
    setBooks(null);
    try {
      setBooks(await api.listBooks());
    } catch (reason) {
      setBooks([]);
      setLoadError(messageOf(reason));
    }
  }

  useEffect(() => {
    let cancel = false;
    api
      .listBooks()
      .then((rows) => {
        if (!cancel) setBooks(rows);
      })
      .catch((reason: unknown) => {
        if (!cancel) {
          setBooks([]);
          setLoadError(messageOf(reason));
        }
      });
    return () => {
      cancel = true;
    };
  }, [api]);

  const loadSection = useCallback(
    async function loadSection(
      nextEdition: EditionDetail,
      sectionId: string,
      entry: "first" | "last" = "first",
    ) {
      const section = await api.getSection(nextEdition.editionId, sectionId);
      let aligned = {
        ...section,
        aggregateRevision: nextEdition.aggregateRevision,
      };
      const conceptBlock = aligned.blocks.find(
        (block) => block.kind === "concept",
      );
      if (conceptBlock && conceptBlock.kind === "concept") {
        try {
          const loaded = await api.readConcept(
            nextEdition.editionId,
            conceptBlock.conceptKey,
          );
          setConceptSource(loaded.concept);
          setConceptRevision(loaded.revision);
          setConceptLinks(loaded.concept.links);
          setSavedLinks(structuredClone(loaded.concept.links));
          setConfirmLinkIds([]);
          setConfirmEntryIds([]);
          aligned = { ...aligned, concept: loaded.draft };
        } catch (reason) {
          setConceptSource(null);
          setConceptRevision(0);
          setConceptLinks([]);
          setSavedLinks([]);
          setConfirmLinkIds([]);
          setConfirmEntryIds([]);
          setNotice(messageOf(reason));
        }
      } else {
        setConceptSource(null);
        setConceptRevision(0);
        setConceptLinks([]);
        setSavedLinks([]);
        setConfirmLinkIds([]);
        setConfirmEntryIds([]);
      }
      pendingSpreadEntry.current = {
        key: `${nextEdition.editionId}:${sectionId}`,
        entry,
      };
      setMeasuredPages([]);
      setSpreadIndex(null);
      setDraft(aligned);
      setSaved(structuredClone(aligned));
      setConflict(null);
      setShowServer(false);
      setPendingNav(null);
      setDiffSummary(null);
      setConceptLink(null);
    },
    [api],
  );

  /** 늦게 끝난 요청이 «지금 연 판본»의 것인지 견줄 때 본다 */
  const editionRef = useRef<EditionDetail | null>(null);
  useEffect(() => {
    editionRef.current = edition;
  }, [edition]);

  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current =
      (draft !== null && !sameDraft(draft, saved)) ||
      JSON.stringify(conceptLinks) !== JSON.stringify(savedLinks) ||
      confirmLinkIds.length > 0 ||
      confirmEntryIds.length > 0;
  }, [draft, saved, conceptLinks, savedLinks, confirmLinkIds, confirmEntryIds]);
  useEffect(() => {
    const id = initialEditionFromLocation(
      initialEditionId,
      typeof window === "undefined" ? "" : window.location.search,
    );
    if (!id || dirtyRef.current) return;
    let cancel = false;
    api
      .openEdition(id)
      .then((next) => {
        if (cancel) return;
        setEdition(next);
        setSimplePreview(true);
        setMode("student");
        const first = next.units.flatMap((unit) => unit.sections)[0];
        if (!first) {
          setDraft(null);
          setSaved(null);
          return;
        }
        return loadSection(next, first.sectionId);
      })
      .catch((reason: unknown) => {
        if (!cancel) setNotice(messageOf(reason));
      });
    return () => {
      cancel = true;
    };
  }, [api, initialEditionId, loadSection]);

  useEffect(() => {
    if (!edition) return;
    const editionId = edition.editionId;
    let cancel = false;
    api
      .readPreviewMaterial(editionId)
      .then((next) => {
        if (!cancel) setLoadedMaterial({ editionId, value: next });
      })
      .catch(() => {
        if (!cancel) setLoadedMaterial({ editionId, value: null });
      });
    return () => {
      cancel = true;
    };
  }, [api, edition]);

  const loadUnits = useCallback(
    () =>
      api.listUnits().catch((reason: unknown) => {
        setNotice(messageOf(reason));
        return [];
      }),
    [api],
  );
  const loadProblems = useCallback(
    (unitId: string) =>
      api.listUnitProblems(unitId).catch((reason: unknown) => {
        setNotice(messageOf(reason));
        return [];
      }),
    [api],
  );
  const loadClasses = useCallback(
    () =>
      api.listClasses().catch((reason: unknown) => {
        setNotice(messageOf(reason));
        return [];
      }),
    [api],
  );
  const loadStudents = useCallback(
    (classId: string) =>
      api.listStudents(classId).catch((reason: unknown) => {
        setNotice(messageOf(reason));
        return [];
      }),
    [api],
  );
  const loadTests = useCallback(
    (classId: string, studentId?: string) =>
      api.listOwnedTests(classId, studentId).catch((reason: unknown) => {
        setNotice(messageOf(reason));
        return [];
      }),
    [api],
  );

  async function openBook(book: BookSummary) {
    if (!book.activeEditionId) return;
    setBusy(true);
    setNotice(null);
    try {
      const next = await api.openEdition(book.activeEditionId);
      forgetExport();
      setPublishRead(null);
      setEdition(next);
      setPdfJob(null);
      pdfRequest.current = null;
      setPublishStatus("idle");
      setIssues([]);
      setPanel("edit");
      setSimplePreview(true);
      setMode("student");
      const first = next.units.flatMap((unit) => unit.sections)[0];
      if (!first) {
        setDraft(null);
        setSaved(null);
        return;
      }
      await loadSection(next, first.sectionId);
    } catch (reason) {
      setNotice(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  const bookArchived =
    books?.find((row) => row.bookId === edition?.bookId)?.archived ?? false;
  /** 발행 확정이 성공했으면 판본을 다시 읽기 전에도 발행본으로 본다 */
  const finalizedHere =
    edition !== null && finalizedEditionId === edition.editionId;
  const published =
    edition?.structureSource?.edition?.status === "published" || finalizedHere;
  const locked =
    manuscriptLocked(edition?.structureSource?.edition?.status, bookArchived) ||
    finalizedHere;
  const linksDirty =
    JSON.stringify(conceptLinks) !== JSON.stringify(savedLinks) ||
    confirmLinkIds.length > 0 ||
    confirmEntryIds.length > 0;
  const workDirty =
    (draft !== null && saved === null) ||
    (draft !== null && saved !== null && !sameDraft(draft, saved)) ||
    linksDirty;

  function refuseLocked(): boolean {
    if (!locked) return false;
    setNotice(
      "발행되었거나 보관된 교재입니다. 원고를 고치려면 새 초안을 만드세요.",
    );
    return true;
  }

  async function openSection(
    sectionId: string,
    entry: "first" | "last" = "first",
  ) {
    if (!edition) return;
    setBusy(true);
    try {
      await loadSection(edition, sectionId, entry);
    } catch (reason) {
      setNotice(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  /** 내보낸 파일 링크를 치운다 — 진행 중인 내보내기의 결과도 받지 않는다. 주소 해제는 아래 효과가 한다 */
  function forgetExport() {
    exportEpoch.current += 1;
    setExportLink(null);
  }

  function clearStudio() {
    forgetExport();
    setEdition(null);
    setDraft(null);
    setSaved(null);
    setConceptSource(null);
    setConceptRevision(0);
    setConceptLinks([]);
    setSavedLinks([]);
    setConfirmLinkIds([]);
    setConfirmEntryIds([]);
    setPendingNav(null);
    setConceptLink(null);
    setPublishRead(null);
  }

  async function createDraftCopy() {
    if (!edition) return;
    setBusy(true);
    try {
      const next = await api.createEdition(
        edition.bookId,
        edition.editionId,
        newRequestId(),
      );
      forgetExport();
      setPublishRead(null);
      setEdition(next);
      setNotice("새 초안을 만들었습니다.");
      const first = next.units.flatMap((unit) => unit.sections)[0];
      if (!first) {
        setDraft(null);
        setSaved(null);
        setConceptLinks([]);
        setSavedLinks([]);
        setConfirmLinkIds([]);
        setConfirmEntryIds([]);
        return;
      }
      await loadSection(next, first.sectionId);
    } catch (reason) {
      setNotice(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  /**
   * 이 화면 안의 이동은 전부 여기를 지난다 — 완성 보기든 세부 편집이든 같다.
   * 저장하지 않은 수정이 있으면 묻고, 저장 · 조판이 도는 동안에는 대상을 바꾸지 않는다.
   */
  function requestNav(nav: PendingNav) {
    if (busy || leaving) {
      setNotice("처리 중입니다. 끝난 뒤 다시 눌러 주세요.");
      return;
    }
    if (workDirty) {
      setPendingNav(nav);
      return;
    }
    void finishNav(nav);
  }

  async function finishNav(nav: PendingNav) {
    setPendingNav(null);
    if (nav.kind === "list") {
      clearStudio();
      return;
    }
    if (nav.kind === "new-draft") {
      await createDraftCopy();
      return;
    }
    if (nav.kind === "link") {
      clearStudio();
      router.push(nav.href);
      return;
    }
    if (nav.kind === "workspace") {
      // 작업실의 다른 화면으로 — 교재는 연 채로 남는다(이미 저장했거나 버렸다)
      approvedLeave.current = true;
      try {
        nav.proceed();
      } finally {
        // 보통은 아래 효과가 거둔다. 다시 그려질 일이 없어도 승인이 다음 이동까지 남지 않게 한다
        window.setTimeout(() => {
          approvedLeave.current = false;
        }, 0);
      }
      return;
    }
    await openSection(nav.sectionId, nav.entry);
  }

  function selectSection(sectionId: string) {
    requestNav({ kind: "section", sectionId });
  }

  async function saveDraft(base?: {
    draft: SectionDetail;
    saved: SectionDetail | null;
    /** 개념 · 연결을 방금 저장했다 — 아래 «아직 저장되지 않았습니다»를 내지 않는다 */
    conceptSaved?: boolean;
  }): Promise<boolean> {
    const target = base?.draft ?? draft;
    const targetSaved = base ? base.saved : saved;
    if (!edition || !target) return false;
    if (refuseLocked()) return false;
    const order = orderBlankPicks(target.picks);
    if (!order.ok) return false;
    const conceptStill =
      !base?.conceptSaved &&
      (JSON.stringify(target.concept) !==
        JSON.stringify(targetSaved?.concept ?? null) ||
        JSON.stringify(target.picks) !==
          JSON.stringify(targetSaved?.picks ?? []));
    const linksStill = !base?.conceptSaved && linksDirty;
    setBusy(true);
    try {
      const result = await api.saveSection({
        editionId: edition.editionId,
        sectionId: target.sectionId,
        expectedRevision: target.revision,
        requestId: newRequestId(),
        section: target,
      });
      const next = {
        ...target,
        revision: result.revision,
        aggregateRevision: result.aggregateRevision,
        status: "saved" as const,
      };
      setDraft(next);
      setSaved((current) =>
        structuredClone({
          ...next,
          concept: current?.concept ?? null,
          picks: current?.picks ?? [],
        }),
      );
      setEdition((current) =>
        current
          ? {
              ...current,
              aggregateRevision: result.aggregateRevision,
              units: current.units.map((unit) => ({
                ...unit,
                sections: unit.sections.map((section) =>
                  section.sectionId === next.sectionId
                    ? {
                        ...section,
                        status:
                          conceptStill || linksStill ? section.status : "saved",
                      }
                    : section,
                ),
              })),
            }
          : current,
      );
      setConflict(null);
      setNotice(
        conceptStill || linksStill
          ? "구획을 저장했습니다. 개념 수정은 아직 저장되지 않았습니다."
          : "저장됨",
      );
      return true;
    } catch (reason) {
      if (reason instanceof TextbookRequestError && reason.status === 409) {
        setConflict({
          message: `${reason.message} 수정은 그대로 두었습니다.`,
          serverText: serverTextOf(reason.serverSection),
        });
        setNotice(null);
        return false;
      }
      setNotice(messageOf(reason));
      return false;
    } finally {
      setBusy(false);
    }
  }

  /**
   * 구획에 개념 블록 **만** 붙인다 — 저장하지 않은 원고는 보내지 않는다(서버에 저장된 구획에 블록 하나를 더한다).
   * `fresh` 면 서버의 지금 구획을 먼저 읽는다: 이미 붙어 있으면 다시 쓰지 않고, 남이 고친 구획이면 그 revision 위에 붙인다.
   * 개념은 만들지 않는다 — 다시 시도해도 개념이 두 벌 생기지 않는다.
   */
  async function attachConcept(
    conceptKey: string,
    base: { draft: SectionDetail; saved: SectionDetail },
    fresh: boolean,
  ): Promise<
    | { ok: true; draft: SectionDetail; saved: SectionDetail }
    | { ok: false; message: string }
  > {
    if (!edition) return { ok: false, message: "판본을 열지 않았습니다." };
    try {
      const server = fresh
        ? await api.getSection(edition.editionId, base.saved.sectionId)
        : base.saved;
      const foreign = server.revision !== base.saved.revision;
      const dirty = manuscriptDirty(base.draft, base.saved);
      let linked = server;
      let block: SectionBlock | null = null;
      if (!hasConceptBlock(server, conceptKey)) {
        block = { id: crypto.randomUUID(), kind: "concept", conceptKey };
        const next = { ...server, blocks: [...server.blocks, block] };
        const result = await api.saveSection({
          editionId: edition.editionId,
          sectionId: server.sectionId,
          expectedRevision: server.revision,
          requestId: newRequestId(),
          section: next,
        });
        linked = {
          ...next,
          revision: result.revision,
          aggregateRevision: result.aggregateRevision,
        };
        setEdition((current) =>
          current
            ? { ...current, aggregateRevision: result.aggregateRevision }
            : current,
        );
      }
      // 남이 고친 구획 위에 붙였고 내 원고에도 수정이 남아 있으면, 내 원고는 건드리지 않는다 —
      // 다음 저장이 409 로 그 사실을 알린다(원고는 그대로 남는다).
      if (foreign && dirty) return { ok: true, ...base };
      const saved = {
        ...linked,
        concept: base.saved.concept,
        picks: base.saved.picks,
      };
      const draft = dirty
        ? {
            ...base.draft,
            blocks: block ? [...base.draft.blocks, block] : base.draft.blocks,
            revision: linked.revision,
            aggregateRevision: linked.aggregateRevision,
          }
        : { ...saved, concept: base.draft.concept, picks: base.draft.picks };
      return { ok: true, draft, saved };
    } catch (reason) {
      return { ok: false, message: messageOf(reason) };
    }
  }

  /**
   * 개념 원고를 저장하고(개념 CAS), 이 구획에 아직 블록이 없으면 잇는다(구획 CAS). 둘은 따로 성공한다 —
   * 개념만 저장된 상태는 «개념 저장 완료 · 구획 연결 실패»로 남기고 conceptKey 와 원고를 보존한다.
   */
  async function persistConcept(): Promise<
    { ok: true; draft: SectionDetail; saved: SectionDetail } | { ok: false }
  > {
    if (!edition || !draft?.concept || !saved) return { ok: false };
    if (refuseLocked()) return { ok: false };
    const concept = draft.concept;
    let savedConcept: Awaited<ReturnType<TextbookStudioApi["saveConcept"]>>;
    try {
      savedConcept = await api.saveConcept({
        editionId: edition.editionId,
        conceptKey: concept.conceptKey,
        expectedRevision: conceptRevision,
        requestId: newRequestId(),
        concept,
        picks: draft.picks,
        source: conceptSource,
        unitKey: draft.unitKey,
        sectionKey: draft.sectionKey,
        links: conceptLinks,
        confirmEntryIds: [
          ...new Set([
            ...confirmEntryIds.filter(
              (id) => !draft.picks.some((pick) => pick.entryId === id),
            ),
            ...draft.picks
              .filter((pick) => pick.confirmRequested)
              .map((pick) => pick.entryId),
          ]),
        ],
        confirmLinkIds,
      });
    } catch (reason) {
      setNotice(messageOf(reason));
      return { ok: false };
    }
    const status = new Map(
      (savedConcept.concept.blankItems ?? []).map((item) => [
        `${item.entryKind}:${item.entryId}`,
        item.review.status,
      ]),
    );
    const nextLinks = savedConcept.concept.links ?? [];
    const nextConcept: ConceptDraft = {
      ...concept,
      title: savedConcept.concept.title,
      kind: savedConcept.concept.kind,
      blankForms: savedConcept.concept.blankForms
        ? [...savedConcept.concept.blankForms]
        : concept.blankForms,
    };
    const nextPicks = draft.picks.map((pick) => ({
      ...pick,
      confirmRequested: false,
      reviewStatus:
        status.get(`${pick.entryKind}:${pick.entryId}`) ?? pick.reviewStatus,
    }));
    setConceptSource(savedConcept.concept);
    setConceptRevision(savedConcept.revision);
    setConceptLinks(nextLinks);
    setSavedLinks(structuredClone(nextLinks));
    setConfirmLinkIds([]);
    setConfirmEntryIds([]);
    setEdition((current) =>
      current
        ? { ...current, aggregateRevision: savedConcept.aggregateRevision }
        : current,
    );
    let nextDraft: SectionDetail = {
      ...draft,
      concept: nextConcept,
      picks: nextPicks,
    };
    let nextSaved: SectionDetail = {
      ...saved,
      concept: nextConcept,
      picks: nextPicks,
    };
    if (!hasConceptBlock(saved, concept.conceptKey)) {
      const linked = await attachConcept(
        concept.conceptKey,
        { draft: nextDraft, saved: nextSaved },
        false,
      );
      if (!linked.ok) {
        // 개념은 저장됐다 — 그 사실과 원고를 남기고, 다시 시도는 잇기만 한다
        setDraft(nextDraft);
        setSaved(structuredClone(nextSaved));
        setConceptLink({
          sectionId: draft.sectionId,
          conceptKey: concept.conceptKey,
          message: linked.message,
        });
        setNotice("개념 저장 완료 · 구획 연결 실패");
        return { ok: false };
      }
      nextDraft = linked.draft;
      nextSaved = linked.saved;
    }
    setConceptLink(null);
    setDraft(nextDraft);
    setSaved(structuredClone(nextSaved));
    setNotice("개념을 저장했습니다.");
    return { ok: true, draft: nextDraft, saved: nextSaved };
  }

  /** «개념 저장 완료 · 구획 연결 실패» 뒤 — 개념은 다시 저장하지 않고 구획에 잇기만 한다 */
  async function retryConceptLink() {
    if (!conceptLink || !draft || !saved || busy) return;
    if (refuseLocked()) return;
    setBusy(true);
    const linked = await attachConcept(
      conceptLink.conceptKey,
      { draft, saved },
      true,
    );
    setBusy(false);
    if (!linked.ok) {
      setConceptLink({ ...conceptLink, message: linked.message });
      setNotice("개념 저장 완료 · 구획 연결 실패");
      return;
    }
    setConceptLink(null);
    setDraft(linked.draft);
    setSaved(structuredClone(linked.saved));
    setNotice("구획에 개념을 연결했습니다.");
  }

  /** 이 판본에 저장돼 있지만 어느 구획에도 놓이지 않은 개념을 이 구획에 잇는다 */
  async function attachExistingConcept(conceptKey: string) {
    if (!edition || !draft || !saved || busy) return;
    if (refuseLocked()) return;
    if (!conceptKey) {
      setNotice("연결할 개념을 고르세요.");
      return;
    }
    setBusy(true);
    try {
      const linked = await attachConcept(conceptKey, { draft, saved }, true);
      if (!linked.ok) {
        setNotice(`구획에 연결하지 못했습니다. ${linked.message}`);
        return;
      }
      let nextDraft = linked.draft;
      let nextSaved = linked.saved;
      try {
        const loaded = await api.readConcept(edition.editionId, conceptKey);
        setConceptSource(loaded.concept);
        setConceptRevision(loaded.revision);
        setConceptLinks(loaded.concept.links);
        setSavedLinks(structuredClone(loaded.concept.links));
        setConfirmLinkIds([]);
        setConfirmEntryIds([]);
        nextDraft = { ...nextDraft, concept: loaded.draft };
        nextSaved = { ...nextSaved, concept: loaded.draft };
        setNotice("구획에 개념을 연결했습니다.");
      } catch (reason) {
        setNotice(
          `구획에 개념을 연결했습니다. 개념 원고는 불러오지 못했습니다. ${messageOf(reason)}`,
        );
      }
      setConceptLink(null);
      setDraft(nextDraft);
      setSaved(structuredClone(nextSaved));
    } finally {
      setBusy(false);
    }
  }

  async function saveThenLeave() {
    const nav = pendingNav;
    if (!nav || !draft || !saved || leaving) return;
    setLeaving(true);
    try {
      let current = { draft, saved };
      const conceptStill =
        JSON.stringify(draft.concept) !== JSON.stringify(saved.concept) ||
        JSON.stringify(draft.picks) !== JSON.stringify(saved.picks) ||
        linksDirty;
      if (conceptStill) {
        const result = await persistConcept();
        if (!result.ok) return;
        current = { draft: result.draft, saved: result.saved };
      }
      if (manuscriptDirty(current.draft, current.saved)) {
        const ok = await saveDraft({ ...current, conceptSaved: true });
        if (!ok) return;
      }
      await finishNav(nav);
    } finally {
      setLeaving(false);
    }
  }

  function discardAndLeave() {
    const nav = pendingNav;
    if (!nav || leaving) return;
    setDraft(saved);
    setConceptLinks(savedLinks);
    setConfirmLinkIds([]);
    setConfirmEntryIds([]);
    void finishNav(nav);
  }

  /**
   * 발행 확정이 성공한 뒤 — 먼저 잠그고(편집 · 다시 확정을 막는다) 판본을 다시 읽는다.
   * 다시 읽기가 실패해도 발행은 이미 끝났다. 그때는 읽기만 다시 시도하게 한다.
   */
  async function refreshPublished(editionId: string, unknown = false) {
    setPublishRead(null);
    try {
      const next = await api.openEdition(editionId);
      if (editionRef.current?.editionId !== editionId) return;
      setEdition(next);
      if (next.structureSource?.edition?.status === "published") {
        setFinalizedEditionId(editionId);
        setPublishStatus("finalized");
      }
    } catch (reason) {
      if (editionRef.current?.editionId !== editionId) return;
      setPublishRead({ editionId, message: messageOf(reason), unknown });
    }
  }

  function movePage(direction: -1 | 1) {
    if (busy || pendingNav) return;
    const next = nextMeasuredSpread(measuredPages, spreadIndex, direction);
    if (next !== null) {
      setSpreadIndex(next);
      return;
    }
    moveSpread(direction);
  }

  function moveSpread(direction: -1 | 1) {
    if (!edition || !draft) return;
    const starts = spreadStarts(edition.units);
    const current = starts.indexOf(draft.sectionId);
    if (current < 0) return;
    const nextIndex = current + direction;
    const sectionId = starts[nextIndex];
    if (!sectionId) return;
    requestNav({
      kind: "section",
      sectionId,
      entry: direction === -1 ? "last" : "first",
    });
  }

  async function followJob(job: PublishJob) {
    if (!edition) return;
    let current = job;
    setPdfJob(current);
    setPublishStatus(current.status);
    setIssues(current.issues);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (current.status !== "reserved" && current.status !== "running") return;
      try {
        current = await api.readJob(edition.editionId, current.jobId);
      } catch (reason) {
        setNotice(messageOf(reason));
        return;
      }
      setPublishStatus(current.status);
      setIssues(current.issues);
      setPdfJob(current);
    }
  }

  async function makeSimplePdf() {
    if (!edition || busy || refuseLocked()) return;
    if (dirtyRef.current) {
      setNotice("수정한 원고를 저장한 뒤 PDF를 만들어 주세요.");
      return;
    }
    const id = edition.editionId;
    setBusy(true);
    setNotice("교재를 확인하고 PDF를 만들고 있습니다.");
    try {
      const checked = await api.preflight(id, newRequestId());
      setIssues(checked.issues);
      if (!checked.ok) {
        setPublishStatus("preflight-failed");
        setNotice("PDF를 만들기 전에 아래 항목을 확인해 주세요.");
        return;
      }
      if (
        pdfRequest.current?.editionId !== id ||
        pdfRequest.current.revision !== edition.aggregateRevision ||
        pdfJob?.status === "failed"
      ) {
        pdfRequest.current = {
          editionId: id,
          revision: edition.aggregateRevision,
          requestId: newRequestId(),
        };
      }
      const reserved = await api.reserve(
        id,
        pdfRequest.current.requestId,
        edition.aggregateRevision,
      );
      const result = await finishTextbookPdf(api, id, reserved, (job) => {
        setPdfJob(job);
        setPublishStatus(job.status);
        setIssues(job.issues);
      });
      if (result.status === "finalized") {
        // 발행은 끝났다 — 먼저 잠그고, 판본 다시 읽기는 따로 실패할 수 있다
        setFinalizedEditionId(id);
        setNotice("PDF가 완성되었습니다. 학생용 또는 해설을 내려받으세요.");
        await refreshPublished(id);
      } else setNotice("PDF를 만들지 못했습니다. 아래 항목을 확인해 주세요.");
    } catch (reason) {
      setNotice(messageOf(reason));
      // 응답을 못 받았으면 발행됐는지 알 수 없다 — 다시 만들기 전에 판본 상태부터 읽는다
      if (outcomeUnknown(reason)) await refreshPublished(id, true);
    } finally {
      setBusy(false);
    }
  }

  async function persistOutline(units: OutlineUnit[]) {
    if (!edition) return;
    if (refuseLocked()) return;
    if (!edition.structureSource) {
      setNotice("목차 원본이 없어 순서를 저장하지 않습니다.");
      return;
    }
    const edited = applyEditionEdits(edition.structureSource, { units });
    if (!edited.ok) {
      setNotice(edited.message);
      return;
    }
    const previous = edition;
    setEdition({ ...edition, units });
    try {
      setEdition(
        await api.patchEdition({
          editionId: edition.editionId,
          expectedRevision: edition.structureRevision,
          requestId: newRequestId(),
          source: edited.source,
        }),
      );
      setNotice("목차를 저장했습니다.");
    } catch (reason) {
      setEdition(previous);
      setNotice(messageOf(reason));
    }
  }

  async function saveLecture(
    lectureId: string,
    conceptKey: string,
    linked: boolean,
  ) {
    if (refuseLocked()) return;
    if (!edition?.structureSource || !draft) return;
    const edited = withConceptLecture(
      edition.structureSource,
      draft.unitKey,
      lectureId,
      conceptKey,
      linked,
    );
    if (!edited.ok) {
      setNotice(edited.message);
      return;
    }
    const previous = edition;
    try {
      setEdition(
        await api.patchEdition({
          editionId: edition.editionId,
          expectedRevision: edition.structureRevision,
          requestId: newRequestId(),
          source: edited.source,
        }),
      );
      setNotice(linked ? "강의를 연결했습니다." : "강의 연결을 뺐습니다.");
    } catch (reason) {
      setEdition(previous);
      setNotice(messageOf(reason));
    }
  }

  function rememberItem(result: {
    item: SectionDetail["items"][number];
    aggregateRevision: number;
  }) {
    setEdition((current) =>
      current
        ? { ...current, aggregateRevision: result.aggregateRevision }
        : current,
    );
    setDraft((current) =>
      current
        ? {
            ...current,
            aggregateRevision: result.aggregateRevision,
            items: current.items.some(
              (row) => row.itemId === result.item.itemId,
            )
              ? current.items.map((row) =>
                  row.itemId === result.item.itemId ? result.item : row,
                )
              : [...current.items, result.item],
          }
        : current,
    );
  }

  // 새로고침 · 탭 닫기 — 브라우저 기본 경고만 낼 수 있다(저장 · 버리기를 고르게 할 수 없다).
  // 저장 · 조판이 도는 동안에도 경고한다 — 닫으면 결과를 보지 못한다.
  useEffect(() => {
    if (!workDirty && !leaving && !busy) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [workDirty, leaving, busy]);

  // 작업실이 이 화면을 떠나려 한다(옆 메뉴 · 단축키 · 주소의 # · 뒤로가기) — `requestTextbookNavigation`.
  // 저장하지 않은 수정이 있으면 붙잡아 같은 확인 칸을 띄우고, 저장 · 조판 중이면 붙잡기만 한다.
  // 이 화면이 가려져 있을 때(다른 화면 사이의 이동)는 붙잡지 않는다 — 확인 칸이 보이지 않는다.
  useEffect(() => {
    // 상태가 바뀌어 다시 그려졌다 — 지난 승인은 여기서 끝난다
    approvedLeave.current = false;
    if (!workDirty && !busy && !leaving) return;
    const onLeave = (event: Event) => {
      // 방금 승인한 이동이 다시 물어 온 것이다(이 닫힘은 아직 옛 상태를 본다) — 붙잡지 않는다
      if (approvedLeave.current) return;
      const root = rootRef.current;
      if (!root || root.closest("[hidden]")) return;
      event.preventDefault();
      if (busy || leaving) {
        setNotice("처리 중입니다. 끝난 뒤 다시 눌러 주세요.");
        return;
      }
      const proceed = (event as CustomEvent<Partial<TextbookLeaveDetail>>)
        .detail?.proceed;
      // 떠날 길을 받지 못했으면 붙잡기만 한다 — 저장한 뒤에도 갈 곳을 모른다
      if (typeof proceed !== "function") {
        setNotice("저장하지 않은 수정이 있습니다. 저장한 뒤 이동해 주세요.");
        return;
      }
      setPendingNav({ kind: "workspace", proceed });
    };
    window.addEventListener(TEXTBOOK_BEFORE_LEAVE, onLeave);
    return () => window.removeEventListener(TEXTBOOK_BEFORE_LEAVE, onLeave);
  }, [workDirty, busy, leaving]);

  // 앱 안 링크 — 이 화면이 보이는 동안 다른 경로로 나가는 링크를 누르면 먼저 묻는다.
  // 작업실의 다른 화면에 가려져 있을 때는 막지 않는다(막아도 확인 칸이 보이지 않는다).
  useEffect(() => {
    if (!workDirty) return;
    const onClick = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root || root.closest("[hidden]")) return;
      const href = leavingHref(event);
      if (!href) return;
      event.preventDefault();
      setPendingNav({ kind: "link", href });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [workDirty]);

  // 내보낸 파일은 그 판본 · 그 revision 의 것일 때만 보여 주고, 아니게 되면 주소를 해제한다
  const exportVisible =
    exportLink !== null &&
    edition !== null &&
    exportLink.editionId === edition.editionId &&
    exportLink.revision === edition.aggregateRevision;
  useEffect(() => {
    if (!exportLink) return;
    const href = exportLink.href;
    if (!exportVisible) {
      URL.revokeObjectURL(href);
      return;
    }
    return () => URL.revokeObjectURL(href);
  }, [exportLink, exportVisible]);

  /** 새 구획이 들어갈 단원 — 고른 단원, 없으면 지금 연 구획의 단원, 그것도 없으면 첫 단원 */
  const sectionUnitKey =
    edition?.units.find((unit) => unit.unitKey === newSectionUnitKey)
      ?.unitKey ??
    edition?.units.find((unit) => unit.unitKey === draft?.unitKey)?.unitKey ??
    edition?.units[0]?.unitKey ??
    "";
  const templateListed = TEMPLATE_CHOICES.some(
    (choice) => choice.id === newTemplateKey,
  );
  /** 이 판본에 저장돼 있지만 어느 구획에도 놓이지 않은 개념 */
  const unattachedConcepts: NamedChoice[] = (material?.concepts ?? [])
    .filter((concept) => concept.sectionKey === null)
    .map((concept) => ({
      id: concept.conceptKey,
      label: `${concept.title} · ${concept.conceptKey}`,
    }));
  /** 영상을 걸 문항 — 지금 이 화면이 읽어 둔 확정본의 내용과 그 해시 */
  const videoSnapshots = (material?.items ?? []).flatMap((item) => {
    const snapshot = material?.snapshots.find(
      (row) => row.snapshotId === item.snapshotId,
    );
    return snapshot
      ? [
          {
            snapshotId: snapshot.snapshotId,
            label: `${item.displayNumber}번`,
            content: snapshot.payload.content,
            answer: snapshot.payload.answer,
            contentHash: snapshot.contentHash,
          },
        ]
      : [];
  });

  const order = draft
    ? orderBlankPicks(draft.picks)
    : { ok: true as const, groups: [] };
  const previewVariant =
    audience === "student" || mode === "student" || mode === "draft"
      ? "student"
      : "answers";
  const measureIdentity = `${edition?.editionId ?? ""}:${draft?.sectionId ?? ""}`;
  const measureKey = `${measureIdentity}:${previewVariant}`;
  if (seenMeasureKey !== measureKey) {
    setSeenMeasureKey(measureKey);
    if (seenMeasureKey !== null) {
      setMeasuredPages([]);
      setSpreadIndex(null);
    }
  }
  const onMeasuredPages = useCallback(
    (pages: MeasuredPageRef[]) => {
      const pending = pendingSpreadEntry.current;
      const entry = pending?.key === measureIdentity ? pending.entry : null;
      if (entry) pendingSpreadEntry.current = null;
      setMeasuredPages(pages);
      setSpreadIndex((current) =>
        measuredSpreadAnchor(
          pages,
          entry === "last"
            ? Math.max(...pages.map((page) => page.physicalPageIndex))
            : entry === "first"
              ? null
              : current,
        ),
      );
    },
    [measureIdentity],
  );
  const preview = useMemo(() => {
    if (!edition || !draft) return null;
    return buildSectionPreview({
      edition,
      section: draft,
      variant: previewVariant,
      material,
      conceptSource,
    });
  }, [conceptSource, edition, draft, material, previewVariant]);
  const pageAnchor = measuredSpreadAnchor(measuredPages, spreadIndex);
  const pageLabel = (() => {
    if (pageAnchor !== null) {
      const labels = measuredPages
        .filter(
          (page) =>
            page.physicalPageIndex === pageAnchor ||
            page.physicalPageIndex === pageAnchor + 1,
        )
        .map((page) => page.printedPageLabel)
        .filter((label) => label.length > 0);
      if (labels.length > 0) return `${draft?.title} · ${labels.join(" · ")}쪽`;
      return "표지";
    }
    if (!draft) return "쪽 없음";
    if (draft.parity === "even-left") return "짝수 왼쪽";
    if (draft.parity === "continue") return "이어짐";
    return "시작 면 미정";
  })();
  const sectionOrder = edition ? spreadStarts(edition.units) : [];
  const sectionIndex = draft ? sectionOrder.indexOf(draft.sectionId) : -1;
  const canPrev =
    nextMeasuredSpread(measuredPages, spreadIndex, -1) !== null ||
    sectionIndex > 0;
  const canNext =
    nextMeasuredSpread(measuredPages, spreadIndex, 1) !== null ||
    (sectionIndex >= 0 && sectionIndex < sectionOrder.length - 1);

  const previewPanel = draft ? (
    <>
      {audience === "teacher" &&
        draft.templateKey.startsWith("auto-lesson") && (
          <p className={styles.muted}>
            개념 원고 준비됨 · 어휘와 수업 흐름은 전체 편집 검수 전
          </p>
        )}
      <PreviewPane
        input={paperInput(
          draft,
          audience,
          audience === "teacher" ? mode : "student",
          zoom,
          pageLabel,
        )}
        zoom={zoom}
        pageLabel={pageLabel}
        showModes={audience === "teacher"}
        onMode={setMode}
        onZoom={setZoom}
        onPrev={() => movePage(-1)}
        onNext={() => movePage(1)}
        prevDisabled={busy || pendingNav !== null || !canPrev}
        nextDisabled={busy || pendingNav !== null || !canNext}
        renderPaper={renderPaper}
        measured={
          preview?.ok ? (
            <SectionMeasure
              key={`${draft.sectionId}:${previewVariant}:${draft.revision}:${draft.parity}:${draft.title}`}
              model={preview.model}
              recallMeasurementModel={preview.recallMeasurementModel}
              resources={preview.resources}
              zoom={zoom}
              physicalPageIndex={spreadIndex}
              provisionalNotice={preview.provisionalNotice}
              onPages={onMeasuredPages}
            />
          ) : null
        }
        unavailable={preview && !preview.ok ? preview.message : null}
      />
    </>
  ) : (
    <p className={styles.muted}>미리볼 구획이 없습니다.</p>
  );

  return (
    <div
      ref={rootRef}
      className={styles.studio}
      data-narrow={narrow ? "true" : "false"}
    >
      <header className={styles.row}>
        <h1>교재 제작</h1>
        {edition ? (
          <button
            type="button"
            className={styles.button}
            onClick={() => requestNav({ kind: "list" })}
          >
            목록
          </button>
        ) : null}
        {edition && locked ? (
          <button
            type="button"
            className={styles.button}
            onClick={() => requestNav({ kind: "new-draft" })}
          >
            새 초안
          </button>
        ) : null}
      </header>
      {edition && locked ? (
        <p className={styles.muted}>
          발행되었거나 보관된 교재입니다. 원고를 고치려면 새 초안을 만드세요.
        </p>
      ) : null}
      {loadError ? (
        <p className={styles.alert} role="alert">
          {loadError}
          <button
            type="button"
            className={styles.button}
            onClick={() => void loadBooks()}
          >
            다시 시도
          </button>
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {pendingNav ? (
        // 보기 분기 밖에 둔다 — 완성 보기에서도 세부 편집에서도 같은 자리에 뜬다
        <div
          className={styles.note}
          role="group"
          aria-label="저장하지 않은 수정"
        >
          <p>저장하지 않은 수정이 있습니다.</p>
          <button
            type="button"
            className={styles.button}
            disabled={leaving || busy}
            onClick={() => void saveThenLeave()}
          >
            저장 후 이동
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={leaving || busy}
            onClick={discardAndLeave}
          >
            버리고 이동
          </button>
          <button
            type="button"
            className={styles.button}
            disabled={leaving}
            onClick={() => setPendingNav(null)}
          >
            계속 편집
          </button>
        </div>
      ) : null}
      {edition && publishRead?.editionId === edition.editionId ? (
        <div className={styles.note} role="alert">
          <p>
            {publishRead.unknown
              ? "발행 결과를 확인하지 못했습니다. 판본 상태를 다시 불러와 확인해 주세요."
              : "발행은 완료되었습니다. 최신 판본 상태를 불러오지 못했습니다."}
          </p>
          <p>{publishRead.message}</p>
          <button
            type="button"
            className={styles.button}
            onClick={() =>
              void refreshPublished(publishRead.editionId, publishRead.unknown)
            }
          >
            판본 다시 불러오기
          </button>
        </div>
      ) : null}
      {books === null && !edition ? <p>교재를 불러오는 중입니다.</p> : null}
      {books !== null && !edition ? (
        <div className={styles.stack}>
          {!showManual ? (
            <AutoCreatePanel
              api={quickApi}
              onCreated={async (result) => {
                const book: BookSummary = {
                  bookId: result.book.id,
                  title: result.book.title,
                  shared: result.book.visibility === "branch",
                  archived: result.book.archivedAt !== null,
                  activeEditionId:
                    result.book.draftEditionId ??
                    result.book.latestPublishedEditionId,
                };
                setBooks((current) => [
                  ...(current ?? []).filter(
                    (row) => row.bookId !== book.bookId,
                  ),
                  book,
                ]);
                await openBook(book);
                setPane("preview");
                setNotice(
                  `${result.problemCount}문제와 ${result.conceptCount}개 개념을 담았습니다.${result.warnings.length ? ` ${result.warnings.join(" ")}` : ""}`,
                );
              }}
            />
          ) : null}
          {books.length > 0 ? (
            <section className={styles.panel} aria-label="만든 교재">
              <h2>만든 교재</h2>
              <ul className={styles.list}>
                {books.map((book) => (
                  <li className={styles.book} key={book.bookId}>
                    <span>
                      {book.title}
                      {book.archived ? " · 보관" : ""}
                    </span>
                    <button
                      type="button"
                      className={styles.button}
                      disabled={!book.activeEditionId || busy}
                      onClick={() => void openBook(book)}
                    >
                      열기
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className={styles.row}>
            <button
              type="button"
              className={styles.button}
              aria-expanded={showManual}
              onClick={() => setShowManual((value) => !value)}
            >
              직접 원고 만들기
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setShowImport((value) => !value)}
            >
              기존 원고 가져오기
            </button>
          </div>
          {showManual ? (
            <BookList
              books={[]}
              title={title}
              volumeCode={volumeCode}
              busy={busy}
              curriculumVersion={curriculumVersion}
              pageTarget={pageTarget}
              videoPolicy={videoPolicy}
              studentSolutionPolicy={solutionPolicy}
              schoolLevel={schoolLevel}
              grade={grade}
              semester={semester}
              bookMode={bookMode}
              innerMarginMm={innerMarginMm}
              outerMarginMm={outerMarginMm}
              coverMode={coverMode}
              onTitle={setTitle}
              onVolume={setVolumeCode}
              onCurriculum={setCurriculumVersion}
              onPageTarget={setPageTarget}
              onVideoPolicy={setVideoPolicy}
              onSolutionPolicy={setSolutionPolicy}
              onSchoolLevel={(value) => {
                setSchoolLevel(value);
                const max = value === "elementary" ? 6 : 3;
                if (Number(grade) > max) setGrade(String(max));
              }}
              onGrade={setGrade}
              onSemester={setSemester}
              onBookMode={setBookMode}
              onInnerMargin={setInnerMarginMm}
              onOuterMargin={setOuterMarginMm}
              onCoverMode={setCoverMode}
              onCreate={() => {
                const pages = Number(pageTarget);
                if (!Number.isSafeInteger(pages) || pages < 1) {
                  setNotice("목표 쪽수는 1 이상의 정수입니다.");
                  return;
                }
                const chosenGrade = Number(grade);
                const gradeMax = schoolLevel === "elementary" ? 6 : 3;
                if (
                  !Number.isSafeInteger(chosenGrade) ||
                  chosenGrade < 1 ||
                  chosenGrade > gradeMax
                ) {
                  setNotice(
                    schoolLevel === "elementary"
                      ? "초등 학년은 1부터 6까지입니다."
                      : "중·고등학교 학년은 1부터 3까지입니다.",
                  );
                  return;
                }
                const inner = Number(innerMarginMm);
                const outer = Number(outerMarginMm);
                if (
                  !Number.isSafeInteger(inner) ||
                  !Number.isSafeInteger(outer) ||
                  inner < 8 ||
                  inner > 40 ||
                  outer < 8 ||
                  outer > 40
                ) {
                  setNotice("여백은 8mm 이상 40mm 이하입니다.");
                  return;
                }
                setBusy(true);
                api
                  .createBook({
                    title: title.trim(),
                    volumeCode: volumeCode.trim(),
                    curriculumVersion: curriculumVersion.trim(),
                    pageTarget: pages,
                    videoPolicy,
                    studentSolutionPolicy: solutionPolicy,
                    schoolLevel,
                    grade: chosenGrade,
                    semester: semester === "2" ? 2 : 1,
                    mode: bookMode,
                    innerMarginMm: inner,
                    outerMarginMm: outer,
                    coverMode,
                    requestId: newRequestId(),
                  })
                  .then((book) => {
                    setBooks((current) => [...(current ?? []), book]);
                    setTitle("");
                    setVolumeCode("");
                    setCurriculumVersion("");
                    setPageTarget("");
                  })
                  .catch((reason: unknown) => setNotice(messageOf(reason)))
                  .finally(() => setBusy(false));
              }}
              onOpen={(book) => void openBook(book)}
              onImport={() => setShowImport(true)}
            />
          ) : null}
          {showImport ? (
            <ImportPanel
              busy={busy}
              note={importNote}
              error={importError}
              issues={importIssues}
              onSubmit={(mode: ImportMode, file: File) => {
                setBusy(true);
                setImportNote(null);
                setImportError(null);
                setImportIssues([]);
                api
                  .importPackage({
                    mode,
                    file,
                    fileName: file.name,
                    requestId: newRequestId(),
                  })
                  .then((result) => {
                    // 판본 검수 항목과 섞지 않는다 — 가져오기 칸 옆에만 보인다
                    setImportIssues(result.issues);
                    if ("rejected" in result) {
                      setImportError(
                        "가져오지 못했습니다. 아래 항목을 고친 뒤 다시 올려 주세요.",
                      );
                      return;
                    }
                    if (result.mode === "archive") {
                      setImportNote("읽기 전용 보관본입니다.");
                      return;
                    }
                    setBooks((current) => [...(current ?? []), result.book]);
                    setImportNote(`${result.book.title} 원고를 만들었습니다.`);
                  })
                  .catch((reason: unknown) =>
                    setImportError(`가져오지 못했습니다. ${messageOf(reason)}`),
                  )
                  .finally(() => setBusy(false));
              }}
            />
          ) : null}
        </div>
      ) : null}
      {edition && simplePreview ? (
        <div className={styles.stack}>
          <div className={styles.row}>
            <h2>{edition.title}</h2>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setSimplePreview(false);
                setMode("draft");
                setPane("manuscript");
              }}
            >
              세부 편집
            </button>
            {!locked ? (
              <button
                type="button"
                className={styles.primary}
                disabled={busy}
                onClick={() => void makeSimplePdf()}
              >
                {busy ? "PDF를 만들고 있습니다…" : "PDF 만들기"}
              </button>
            ) : null}
            {published ? (
              <>
                <a
                  className={styles.primary}
                  href={`/api/textbook/editions/${edition.editionId}/pdf?kind=student`}
                  download
                >
                  학생용 PDF 내려받기
                </a>
                <a
                  className={styles.button}
                  href={`/api/textbook/editions/${edition.editionId}/pdf?kind=answers`}
                  download
                >
                  해설 PDF 내려받기
                </a>
              </>
            ) : null}
          </div>
          {busy && pdfJob ? (
            <p role="status">
              PDF 조판 {pdfJob.completedSteps ?? 0}/{pdfJob.totalSteps ?? "…"}
            </p>
          ) : null}
          {issues.length ? <ReviewTable issues={issues} /> : null}
          <nav className={styles.simpleSections} aria-label="교재 내용">
            {edition.units.map((unit) => (
              <div key={unit.unitKey}>
                <strong>{unit.title}</strong>
                <div className={styles.row}>
                  {unit.sections.map((section) => (
                    <button
                      type="button"
                      key={section.sectionId}
                      className={styles.button}
                      aria-pressed={draft?.sectionId === section.sectionId}
                      disabled={busy}
                      onClick={() => selectSection(section.sectionId)}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          {previewPanel}
        </div>
      ) : null}
      {edition && !simplePreview ? (
        <div className={styles.stack}>
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setSimplePreview(true);
              setMode("student");
            }}
          >
            완성 교재 보기
          </button>
          <div className={styles.tabs} role="tablist" aria-label="편집 칸">
            <button
              type="button"
              className={styles.tab}
              role="tab"
              aria-selected={pane === "manuscript"}
              onClick={() => setPane("manuscript")}
            >
              원고
            </button>
            <button
              type="button"
              className={styles.tab}
              role="tab"
              aria-selected={pane === "preview"}
              onClick={() => setPane("preview")}
            >
              미리보기
            </button>
          </div>
          <div className={styles.row}>
            <button
              type="button"
              className={styles.button}
              aria-pressed={panel === "edit"}
              onClick={() => setPanel("edit")}
            >
              원고
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={panel === "review"}
              onClick={() => setPanel("review")}
            >
              검수
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={panel === "publish"}
              onClick={() => setPanel("publish")}
            >
              발행
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={panel === "assign"}
              onClick={() => {
                setPanel("assign");
                api
                  .listAssignments(edition.editionId)
                  .then(setAssignments)
                  .catch((reason: unknown) => setNotice(messageOf(reason)));
              }}
            >
              배정
            </button>
            {published ? (
              <button
                type="button"
                className={styles.button}
                aria-pressed={panel === "reissue"}
                onClick={() => {
                  setPanel("reissue");
                  void loadClasses().then(setReissueClasses);
                  void loadUnits().then(setReissueUnits);
                }}
              >
                다시 출제
              </button>
            ) : null}
            <button
              type="button"
              className={styles.button}
              aria-pressed={panel === "video"}
              onClick={() => {
                setPanel("video");
                api
                  .listVideos(edition.editionId)
                  .then((rows) =>
                    setVideos(
                      rows.map((row) => ({
                        ...row,
                        policy: edition.config.videoPolicy,
                      })),
                    ),
                  )
                  .catch((reason: unknown) => setNotice(messageOf(reason)));
                api
                  .listVideoChoices()
                  .then(setVideoChoices)
                  .catch((reason: unknown) => setNotice(messageOf(reason)));
              }}
            >
              영상
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                if (workDirty) {
                  setNotice("수정한 원고를 저장한 뒤 내보내 주세요.");
                  return;
                }
                const epoch = ++exportEpoch.current;
                const asked = {
                  editionId: edition.editionId,
                  revision: edition.aggregateRevision,
                  title: edition.title,
                };
                setExportLink(null);
                api
                  .readExport(asked.editionId)
                  .then((link) => {
                    const now = editionRef.current;
                    if (
                      epoch !== exportEpoch.current ||
                      now?.editionId !== asked.editionId ||
                      now.aggregateRevision !== asked.revision
                    ) {
                      // 그사이 다른 판본으로 옮겼거나 원고가 바뀌었다 — 지난 결과는 올리지 않는다
                      URL.revokeObjectURL(link.href);
                      return;
                    }
                    setExportLink({
                      editionId: asked.editionId,
                      revision: asked.revision,
                      href: link.href,
                      label: `${asked.title} 교환 파일`,
                    });
                  })
                  .catch((reason: unknown) => setNotice(messageOf(reason)));
              }}
            >
              내보내기
            </button>
          </div>
          {exportVisible && exportLink ? (
            <a
              href={exportLink.href}
              download={`textbook-${exportLink.editionId}-r${exportLink.revision}.json`}
            >
              {exportLink.label}
            </a>
          ) : null}
          <div className={styles.workspace} data-pane={pane} data-zoom={zoom}>
            <div className={styles.outline}>
              <Outline
                units={edition.units}
                collapsed={collapsed}
                currentId={draft?.sectionId ?? null}
                pendingSectionId={workDirty ? (draft?.sectionId ?? null) : null}
                movesDisabled={locked}
                onToggle={(unitKey) => {
                  const next = new Set(collapsed);
                  if (next.has(unitKey)) next.delete(unitKey);
                  else next.add(unitKey);
                  setCollapsed(next);
                }}
                onSelect={(sectionId) => void selectSection(sectionId)}
                onMoveUnit={(unitKey, direction) => {
                  const next = moveOutlineUnit(
                    edition.units,
                    unitKey,
                    direction,
                  );
                  if (next) void persistOutline(next);
                }}
                onMoveSection={(sectionId, direction) => {
                  const next = moveOutlineSection(
                    edition.units,
                    sectionId,
                    direction,
                  );
                  if (next) void persistOutline(next);
                }}
              />
              {edition.units.every((unit) => unit.sections.length === 0) ? (
                <p className={styles.muted}>구획이 없습니다.</p>
              ) : null}
              <fieldset className={styles.stack} disabled={locked}>
                <form
                  className={styles.stack}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (workDirty && draft) {
                      setPendingNav({
                        kind: "section",
                        sectionId: draft.sectionId,
                      });
                      return;
                    }
                    const unitKey = sectionUnitKey;
                    if (!unitKey) {
                      setNotice("단원이 없어 구획을 만들 수 없습니다.");
                      return;
                    }
                    // 구획 키를 비워 두면 그 단원 안에서 겹치지 않는 키를 지어 준다
                    const sectionKey =
                      newSectionKey.trim() ||
                      suggestSectionKey(
                        (edition.structureSource?.outline ?? []).flatMap(
                          (unit) =>
                            unit.unitKey === unitKey
                              ? unit.sections.map((row) => row.sectionKey)
                              : [],
                        ),
                      );
                    setBusy(true);
                    api
                      .createSection({
                        editionId: edition.editionId,
                        unitKey,
                        sectionKey,
                        templateKey: newTemplateKey.trim(),
                        title: newSectionTitle.trim(),
                        requestId: newRequestId(),
                      })
                      .then(async (created) => {
                        const reopened = await api.openEdition(
                          edition.editionId,
                        );
                        const nextEdition = {
                          ...reopened,
                          aggregateRevision: created.aggregateRevision,
                        };
                        setEdition(nextEdition);
                        setNewSectionTitle("");
                        setNewSectionKey("");
                        await loadSection(nextEdition, created.sectionId);
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                >
                  <label className={styles.field}>
                    <span>새 구획 제목</span>
                    <input
                      value={newSectionTitle}
                      onChange={(event) =>
                        setNewSectionTitle(event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>넣을 단원</span>
                    <select
                      value={sectionUnitKey}
                      onChange={(event) =>
                        setNewSectionUnitKey(event.target.value)
                      }
                    >
                      {edition.units.length === 0 ? (
                        <option value="">단원이 없습니다</option>
                      ) : null}
                      {edition.units.map((unit) => (
                        <option key={unit.unitKey} value={unit.unitKey}>
                          {unit.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>지면 틀</span>
                    <select
                      value={templateListed ? newTemplateKey : "custom"}
                      onChange={(event) =>
                        setNewTemplateKey(
                          event.target.value === "custom"
                            ? ""
                            : event.target.value,
                        )
                      }
                    >
                      {TEMPLATE_CHOICES.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.label}
                        </option>
                      ))}
                      <option value="custom">직접 입력</option>
                    </select>
                  </label>
                  {templateListed ? null : (
                    <label className={styles.field}>
                      <span>지면 틀 직접 입력</span>
                      <input
                        value={newTemplateKey}
                        onChange={(event) =>
                          setNewTemplateKey(event.target.value)
                        }
                      />
                    </label>
                  )}
                  <label className={styles.field}>
                    <span>구획 키</span>
                    <input
                      value={newSectionKey}
                      placeholder="비우면 자동으로 정합니다"
                      onChange={(event) => setNewSectionKey(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className={styles.button}
                    disabled={
                      busy ||
                      newSectionTitle.trim() === "" ||
                      newTemplateKey.trim() === "" ||
                      edition.units.length === 0
                    }
                  >
                    구획 추가
                  </button>
                </form>
                <form
                  className={styles.stack}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (refuseLocked()) return;
                    if (workDirty && draft) {
                      setPendingNav({
                        kind: "section",
                        sectionId: draft.sectionId,
                      });
                      return;
                    }
                    if (!edition.structureSource) {
                      setNotice("목차 원본이 없어 단원을 추가하지 않습니다.");
                      return;
                    }
                    const units = [
                      ...edition.units,
                      {
                        unitKey: newUnitKey.trim(),
                        title: newUnitTitle.trim(),
                        sections: [],
                      },
                    ];
                    setNewUnitKey("");
                    setNewUnitTitle("");
                    void persistOutline(units);
                  }}
                >
                  <label className={styles.field}>
                    <span>새 단원 키</span>
                    <input
                      value={newUnitKey}
                      onChange={(event) => setNewUnitKey(event.target.value)}
                    />
                  </label>
                  <label className={styles.field}>
                    <span>새 단원 제목</span>
                    <input
                      value={newUnitTitle}
                      onChange={(event) => setNewUnitTitle(event.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className={styles.button}
                    disabled={
                      busy ||
                      newUnitKey.trim() === "" ||
                      newUnitTitle.trim() === ""
                    }
                  >
                    단원 추가
                  </button>
                </form>
              </fieldset>
              <ConfigPanel
                title={edition.title}
                volumeCode={edition.config.volumeCode}
                pageTarget={String(
                  edition.structureSource?.config.pageBudget.target ?? "",
                )}
                videoPolicy={edition.config.videoPolicy}
                studentSolutionPolicy={edition.config.studentSolutionPolicy}
                print={
                  edition.structureSource?.config.print
                    ? {
                        coverMode:
                          edition.structureSource.config.print.coverMode,
                        firstPhysicalPageIndex:
                          edition.structureSource.config.print
                            .firstPhysicalPageIndex,
                      }
                    : undefined
                }
                locked={locked}
                busy={busy}
                onSave={(value) => {
                  if (refuseLocked()) return;
                  if (!edition.structureSource) {
                    setNotice("설정 원본이 없어 저장하지 않습니다.");
                    return;
                  }
                  if (
                    value.title.trim() === "" ||
                    value.volumeCode.trim() === ""
                  ) {
                    setNotice("제목과 권 코드가 필요합니다.");
                    return;
                  }
                  const pages = Number(value.pageTarget);
                  if (
                    value.pageTarget.trim() !== "" &&
                    (!Number.isSafeInteger(pages) || pages < 1)
                  ) {
                    setNotice("목표 쪽수는 1 이상의 정수입니다.");
                    return;
                  }
                  let firstPhysicalPageIndex: number | undefined;
                  if (value.firstPhysicalPageIndex !== undefined) {
                    const page = Number(value.firstPhysicalPageIndex);
                    if (!Number.isInteger(page) || page < 1 || page > 1000) {
                      setNotice("첫 쪽은 1부터 1000까지입니다.");
                      return;
                    }
                    firstPhysicalPageIndex = page;
                  }
                  const edited = applyEditionEdits(edition.structureSource, {
                    title: value.title.trim(),
                    volumeCode: value.volumeCode.trim(),
                    videoPolicy: value.videoPolicy,
                    studentSolutionPolicy: value.studentSolutionPolicy,
                    ...(value.pageTarget.trim() === ""
                      ? {}
                      : { pageTarget: pages }),
                    ...(value.coverMode ? { coverMode: value.coverMode } : {}),
                    ...(firstPhysicalPageIndex !== undefined
                      ? { firstPhysicalPageIndex }
                      : {}),
                  });
                  if (!edited.ok) {
                    setNotice(edited.message);
                    return;
                  }
                  setBusy(true);
                  api
                    .patchEdition({
                      editionId: edition.editionId,
                      expectedRevision: edition.structureRevision,
                      requestId: newRequestId(),
                      source: edited.source,
                    })
                    .then((next) => {
                      setEdition(next);
                      setNotice("설정을 저장했습니다.");
                    })
                    .catch((reason: unknown) => setNotice(messageOf(reason)))
                    .finally(() => setBusy(false));
                }}
              />
            </div>
            <div className={styles.manuscript}>
              {panel === "edit" && draft ? (
                <SectionEditor
                  draft={draft}
                  editionId={edition.editionId}
                  audience={audience}
                  mode={mode}
                  locked={locked}
                  existingBlankItems={conceptSource?.blankItems ?? []}
                  confirmEntryIds={confirmEntryIds}
                  onConfirmEntries={setConfirmEntryIds}
                  conceptChanged={conceptManuscriptChanged(
                    saved?.concept ?? null,
                    draft.concept,
                  )}
                  conceptLinks={conceptLinks}
                  confirmLinkIds={confirmLinkIds}
                  onConceptLinks={(links, ids) => {
                    setConceptLinks(links);
                    setConfirmLinkIds(ids);
                  }}
                  conflictMessage={conflict?.message ?? null}
                  serverText={conflict?.serverText ?? null}
                  showServer={showServer}
                  orderMessage={order.ok ? null : order.message}
                  diffSummary={diffSummary}
                  saving={busy}
                  onChange={(next) => {
                    if (conceptManuscriptChanged(draft.concept, next.concept)) {
                      setConfirmLinkIds([]);
                      setConfirmEntryIds([]);
                      setDraft({
                        ...next,
                        picks: next.picks.map((pick) => ({
                          ...pick,
                          confirmRequested: false,
                        })),
                      });
                      return;
                    }
                    setDraft(next);
                  }}
                  onSave={() => void saveDraft()}
                  onToggleServer={() => setShowServer((value) => !value)}
                  onCopy={() => requestNav({ kind: "new-draft" })}
                  onCapture={(testId, problemIds) => {
                    if (refuseLocked()) return;
                    const currentDraft = draft;
                    const currentSaved = saved;
                    api
                      .captureItems({
                        editionId: edition.editionId,
                        sectionId: draft.sectionId,
                        expectedRevision: edition.aggregateRevision,
                        requestId: newRequestId(),
                        testId: testId || null,
                        problemIds,
                      })
                      .then(async (result) => {
                        setEdition((current) =>
                          current
                            ? {
                                ...current,
                                aggregateRevision: result.aggregateRevision,
                              }
                            : current,
                        );
                        if (result.excluded.length > 0) {
                          setNotice(
                            result.excluded
                              .map(
                                (item) => `${item.problemId}: ${item.reason}`,
                              )
                              .join(" "),
                          );
                        }
                        try {
                          const fresh = await api.getSection(
                            edition.editionId,
                            currentDraft.sectionId,
                          );
                          const aligned = {
                            ...fresh,
                            aggregateRevision: result.aggregateRevision,
                          };
                          setDraft(
                            currentSaved
                              ? mergeCapturedSection(
                                  currentDraft,
                                  currentSaved,
                                  aligned,
                                )
                              : aligned,
                          );
                          setSaved(structuredClone(aligned));
                        } catch (reason) {
                          setNotice(
                            `${messageOf(reason)} 문항은 담겼습니다. 구획을 다시 열면 붙은 블록이 보입니다.`,
                          );
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  items: result.items,
                                  aggregateRevision: result.aggregateRevision,
                                }
                              : current,
                          );
                        }
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onDiff={(itemId) => {
                    api
                      .diffItem(edition.editionId, itemId)
                      .then((diff) => setDiffSummary(diff.summary))
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onRecapture={(itemId) => {
                    if (refuseLocked()) return;
                    api
                      .recaptureItem(
                        edition.editionId,
                        itemId,
                        newRequestId(),
                        edition.aggregateRevision,
                      )
                      .then((result) => rememberItem(result))
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onLoadLinks={async (itemId) => {
                    try {
                      const detail = await api.readItemDetail(
                        edition.editionId,
                        itemId,
                      );
                      if (detail.candidates.length === 0) {
                        setNotice("연결할 은행 문항이 없습니다.");
                      }
                      return detail.candidates;
                    } catch (reason) {
                      setNotice(messageOf(reason));
                      return [];
                    }
                  }}
                  onLink={(itemId, problemId) => {
                    if (refuseLocked()) return;
                    if (!problemId) {
                      setNotice("연결할 은행 문항을 고르세요.");
                      return;
                    }
                    api
                      .linkItem(
                        edition.editionId,
                        itemId,
                        newRequestId(),
                        edition.aggregateRevision,
                        problemId,
                      )
                      .then((result) => rememberItem(result))
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onRegister={async (itemId, fields) => {
                    if (refuseLocked()) return null;
                    try {
                      const result = await api.registerItem(
                        edition.editionId,
                        itemId,
                        newRequestId(),
                        edition.aggregateRevision,
                        fields,
                      );
                      rememberItem(result);
                      setNotice(
                        `검수 대기 문항 ${result.problem.problemCode}을 등록했습니다. 연결은 따로 고릅니다.`,
                      );
                      return result.candidates;
                    } catch (reason) {
                      setNotice(messageOf(reason));
                      return null;
                    }
                  }}
                  onLoadUnits={loadUnits}
                  onLoadProblems={loadProblems}
                  onLoadClasses={loadClasses}
                  onLoadStudents={loadStudents}
                  onLoadTests={loadTests}
                  onCreateConcept={(conceptKey, title) => {
                    if (refuseLocked()) return;
                    if (!conceptKey || !title) {
                      setNotice("개념 키와 제목이 필요합니다.");
                      return;
                    }
                    const concept: ConceptDraft = {
                      conceptKey,
                      title,
                      kind: "정의",
                      goal: "",
                      prerequisites: "",
                      definition: "",
                      conditions: "",
                      examples: "",
                      counterexamples: "",
                      misconceptions: "",
                      explainPrompt: "",
                      blankForms: ["term", "cloze"],
                    };
                    setConceptSource(null);
                    setConceptRevision(0);
                    setConceptLinks([]);
                    setSavedLinks([]);
                    setConfirmLinkIds([]);
                    setConfirmEntryIds([]);
                    setDraft({ ...draft, concept });
                  }}
                  onSaveConcept={() => {
                    void persistConcept();
                  }}
                  unattachedConcepts={unattachedConcepts}
                  onAttachConcept={(conceptKey) =>
                    void attachExistingConcept(conceptKey)
                  }
                  conceptLinkFailure={
                    conceptLink?.sectionId === draft.sectionId
                      ? conceptLink.message
                      : null
                  }
                  onRetryConceptLink={() => void retryConceptLink()}
                  onSearchCatalog={(query) => {
                    api
                      .searchCatalog(query)
                      .then((picks) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                picks: [...current.picks, ...picks],
                              }
                            : current,
                        ),
                      )
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onDelete={() => {
                    if (refuseLocked()) return;
                    api
                      .deleteSection(
                        edition.editionId,
                        draft.sectionId,
                        draft.revision,
                        newRequestId(),
                      )
                      .then(() => api.openEdition(edition.editionId))
                      .then((next) => {
                        setEdition(next);
                        setDraft(null);
                        setSaved(null);
                        setNotice("구획을 삭제했습니다.");
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  lectureLink={
                    <>
                      <LectureLink
                        disabled={locked}
                        conceptKey={draft.concept?.conceptKey ?? null}
                        sourceUnitIds={sourceUnitIdsFor(
                          edition.structureSource,
                          draft.unitKey,
                        )}
                        refs={lectureRefsFor(
                          edition.structureSource,
                          draft.unitKey,
                        )}
                        onFind={async () => {
                          const unitIds = sourceUnitIdsFor(
                            edition.structureSource,
                            draft.unitKey,
                          );
                          try {
                            const rows = [];
                            for (const unitId of unitIds) {
                              rows.push(
                                ...(await api.listUnitLectures(unitId)),
                              );
                            }
                            return rows;
                          } catch (reason) {
                            setNotice(messageOf(reason));
                            return [];
                          }
                        }}
                        onLink={(lectureId) => {
                          const conceptKey = draft.concept?.conceptKey;
                          if (!conceptKey) return;
                          void saveLecture(lectureId, conceptKey, true);
                        }}
                        onUnlink={(lectureId, conceptKey) => {
                          void saveLecture(lectureId, conceptKey, false);
                        }}
                      />
                      {edition.structureSource?.edition?.status ===
                        "published" && draft.concept ? (
                        <ObservationForm
                          onLoadClasses={loadClasses}
                          onLoadStudents={loadStudents}
                          onSubmit={(studentId, form, observation) => {
                            if (!studentId || !observation || !draft.concept) {
                              setNotice("학생과 관찰 내용이 필요합니다.");
                              return;
                            }
                            api
                              .recordObservation({
                                editionId: edition.editionId,
                                conceptKey: draft.concept.conceptKey,
                                requestId: newRequestId(),
                                studentId,
                                form,
                                observation,
                              })
                              .then((saved) => {
                                const state =
                                  saved.reviewStatus === "checked"
                                    ? "확인했습니다."
                                    : saved.reviewStatus === "needs-review"
                                      ? "다시 볼 기록입니다."
                                      : "검수 전입니다.";
                                setNotice(`종이 활동을 기록했습니다. ${state}`);
                              })
                              .catch((reason: unknown) =>
                                setNotice(messageOf(reason)),
                              );
                          }}
                        />
                      ) : null}
                    </>
                  }
                />
              ) : null}
              {panel === "edit" && !draft ? (
                <p className={styles.muted}>구획이 없습니다.</p>
              ) : null}
              {panel === "review" ? <ReviewTable issues={issues} /> : null}
              {panel === "publish" ? (
                <PublishPanel
                  status={publishStatus}
                  issues={issues}
                  busy={busy}
                  locked={locked}
                  onPreflight={() => {
                    if (refuseLocked()) return;
                    setBusy(true);
                    api
                      .preflight(edition.editionId, newRequestId())
                      .then((result) => {
                        setIssues(result.issues);
                        setPublishStatus(
                          result.ok ? "idle" : "preflight-failed",
                        );
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                  onReserve={() => {
                    if (refuseLocked()) return;
                    if (workDirty) {
                      setNotice("수정한 원고를 저장한 뒤 발행해 주세요.");
                      return;
                    }
                    setBusy(true);
                    api
                      .reserve(
                        edition.editionId,
                        newRequestId(),
                        edition.aggregateRevision,
                      )
                      .then((job) => followJob(job))
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                  onStep={() => {
                    if (refuseLocked()) return;
                    setBusy(true);
                    api
                      .stepPublish(
                        edition.editionId,
                        pdfJob?.jobId ??
                          pdfRequest.current?.requestId ??
                          newRequestId(),
                      )
                      .then((job) => followJob(job))
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                  onFinalize={() => {
                    if (refuseLocked()) return;
                    if (workDirty) {
                      setNotice("수정한 원고를 저장한 뒤 발행해 주세요.");
                      return;
                    }
                    // 확정은 예약한 작업의 것이다 — 작업이 없으면 새 요청을 지어 보내지 않는다
                    const jobId =
                      pdfJob?.jobId ?? pdfRequest.current?.requestId;
                    if (!jobId) {
                      setNotice(
                        "예약한 발행 작업이 없습니다. 예약부터 해 주세요.",
                      );
                      return;
                    }
                    const id = edition.editionId;
                    setBusy(true);
                    api
                      .finalize(id, jobId)
                      .then(async (job) => {
                        setPublishStatus(job.status);
                        setPdfJob(job);
                        setIssues(job.issues);
                        if (job.status !== "finalized") return;
                        // 발행은 끝났다 — 먼저 잠그고, 판본 다시 읽기는 따로 한다
                        setFinalizedEditionId(id);
                        setNotice("발행했습니다.");
                        await refreshPublished(id);
                      })
                      .catch(async (reason: unknown) => {
                        setNotice(messageOf(reason));
                        // 응답을 못 받았으면 발행됐는지 알 수 없다 — 다시 확정하기 전에 판본부터 읽는다
                        if (outcomeUnknown(reason))
                          await refreshPublished(id, true);
                      })
                      .finally(() => setBusy(false));
                  }}
                />
              ) : null}
              {panel === "assign" ? (
                <AssignmentPanel
                  rows={assignments}
                  unavailable={
                    published
                      ? null
                      : "발행한 판본만 배정할 수 있습니다. 발행 탭에서 확정한 뒤 배정하세요."
                  }
                  onLoadClasses={loadClasses}
                  onLoadStudents={loadStudents}
                  onCreate={(kind, id, label) => {
                    const target =
                      kind === "class"
                        ? { kind, classId: id, label }
                        : { kind, studentId: id, label };
                    api
                      .createAssignment({
                        editionId: edition.editionId,
                        requestId: newRequestId(),
                        target,
                        startsAt: new Date().toISOString(),
                        expiresAt: null,
                      })
                      .then((row) =>
                        setAssignments((current) => [...current, row]),
                      )
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onRevoke={(assignmentId) => {
                    api
                      .revokeAssignment(
                        edition.editionId,
                        assignmentId,
                        newRequestId(),
                      )
                      .then(() =>
                        setAssignments((current) =>
                          current.map((row) =>
                            row.assignmentId === assignmentId
                              ? { ...row, revoked: true }
                              : row,
                          ),
                        ),
                      )
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                />
              ) : null}
              {panel === "reissue" ? (
                <ReissuePanel
                  items={(material?.items ?? []).map((item) => ({
                    itemId: item.itemId,
                    label: item.displayNumber,
                  }))}
                  classes={reissueClasses}
                  units={reissueUnits}
                  onSubmit={(input) => {
                    if (input.itemIds.length === 0) {
                      setNotice("문항을 고르세요.");
                      return;
                    }
                    api
                      .reissue({
                        editionId: edition.editionId,
                        requestId: newRequestId(),
                        itemIds: input.itemIds,
                        classId: input.classId,
                        ...(input.title ? { title: input.title } : {}),
                        testType: input.testType,
                        rangeEndUnitId: input.rangeEndUnitId,
                      })
                      .then((result) => {
                        setNotice(
                          `시험지 ${result.problemCount}문항을 만들었습니다. 제목은 저장되지 않았습니다.`,
                        );
                        const href = `/tests/${result.testId}`;
                        if (
                          /^\/tests\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                            href,
                          )
                        ) {
                          router.push(href);
                        }
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                />
              ) : null}
              {panel === "video" ? (
                <VideoPanel
                  rows={videos}
                  choices={videoChoices}
                  snapshots={videoSnapshots}
                  onCreate={(title, providerVideoId) => {
                    if (!title || !providerVideoId) {
                      setNotice(
                        "영상 제목과 유튜브 주소(또는 영상 ID)가 필요합니다.",
                      );
                      return;
                    }
                    api
                      .createVideo({
                        requestId: newRequestId(),
                        title,
                        providerVideoId,
                      })
                      .then((row) => {
                        setVideoChoices((current) => [
                          ...current.filter(
                            (choice) => choice.id !== row.videoId,
                          ),
                          {
                            id: row.videoId,
                            label: `${row.label} · ${providerVideoId}`,
                          },
                        ]);
                        setNotice(
                          "영상을 등록했습니다. 문항을 골라 연결하세요.",
                        );
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onBind={(snapshotId, videoId, contentHash) => {
                    if (!snapshotId || !videoId || !contentHash) {
                      setNotice(
                        "문항과 영상을 고르고 문항 내용을 확인해 주세요.",
                      );
                      return;
                    }
                    api
                      .bindVideo({
                        snapshotId,
                        requestId: newRequestId(),
                        videoId,
                        startSeconds: 0,
                        endSeconds: null,
                        status: "draft",
                        contentHash,
                      })
                      .then((row) =>
                        setVideos((current) => [
                          ...current,
                          { ...row, policy: edition.config.videoPolicy },
                        ]),
                      )
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onUpdate={(bindingId, status, policy, contentHash) => {
                    const current = videos.find(
                      (row) => row.bindingId === bindingId,
                    );
                    if (!current) return;
                    api
                      .updateVideo({
                        bindingId,
                        requestId: newRequestId(),
                        status,
                        policy,
                        videoId: current.videoId,
                        startSeconds: current.startSeconds,
                        endSeconds: current.endSeconds,
                        // 검수자가 이 화면에서 본 내용의 해시 — 보낼 때 최신 값을 다시 읽어 채우지 않는다
                        contentHash,
                      })
                      .then((next) =>
                        setVideos((current) =>
                          current.map((row) =>
                            row.bindingId === next.bindingId ? next : row,
                          ),
                        ),
                      )
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                />
              ) : null}
            </div>
            {previewPanel}
          </div>
        </div>
      ) : null}
    </div>
  );
}
