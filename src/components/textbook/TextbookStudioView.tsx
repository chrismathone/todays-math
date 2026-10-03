"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  TextbookRequestError,
  httpTextbookApi,
  newRequestId,
  type TextbookStudioApi,
} from "@/lib/textbook/client";
import {
  applyEditionEdits,
  initialEditionFromLocation,
  lectureRefsFor,
  mergeCapturedSection,
  moveOutlineSection,
  moveOutlineUnit,
  orderBlankPicks,
  sourceUnitIdsFor,
  spreadStarts,
  withConceptLecture,
  type AssignmentRow,
  type Audience,
  type BookSummary,
  type ConceptDraft,
  type EditionDetail,
  type ImportMode,
  type OutlineUnit,
  type PaperPreviewInput,
  type PreviewMode,
  type PublishJob,
  type PublishStatus,
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
  ReviewTable,
  SectionEditor,
  VideoPanel,
  paperInput,
} from "@/components/textbook/parts";
import { SectionMeasure } from "@/components/textbook/measuredPreview";
import { buildSectionPreview } from "@/components/textbook/previewModel";
import styles from "@/components/textbook/textbook.module.css";

export type { PaperPreviewInput };

type Panel = "edit" | "review" | "publish" | "assign" | "video" | "import";

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

export function TextbookStudioView({
  api = httpTextbookApi,
  audience = "teacher",
  renderPaper,
  viewport,
  initialEditionId,
}: {
  api?: TextbookStudioApi;
  audience?: Audience;
  renderPaper?: (input: PaperPreviewInput) => ReactNode;
  viewport?: "desktop" | "mobile";
  initialEditionId?: string;
}) {
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
  const [issues, setIssues] = useState<StudioIssue[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [videos, setVideos] = useState<VideoBinding[]>([]);
  const [diffSummary, setDiffSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
  const [newUnitKey, setNewUnitKey] = useState("");
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [exportLink, setExportLink] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionKey, setNewSectionKey] = useState("");
  const [newTemplateKey, setNewTemplateKey] = useState("");
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
    async function loadSection(nextEdition: EditionDetail, sectionId: string) {
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
          aligned = { ...aligned, concept: loaded.draft };
        } catch (reason) {
          setConceptSource(null);
          setConceptRevision(0);
          setNotice(messageOf(reason));
        }
      } else {
        setConceptSource(null);
        setConceptRevision(0);
      }
      setDraft(aligned);
      setSaved(structuredClone(aligned));
      setConflict(null);
      setShowServer(false);
      setPendingId(null);
      setDiffSummary(null);
    },
    [api],
  );

  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = draft !== null && !sameDraft(draft, saved);
  }, [draft, saved]);
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

  async function openBook(book: BookSummary) {
    if (!book.activeEditionId) return;
    setBusy(true);
    setNotice(null);
    try {
      const next = await api.openEdition(book.activeEditionId);
      setEdition(next);
      setPanel("edit");
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

  async function selectSection(sectionId: string) {
    if (!edition) return;
    if (!sameDraft(draft, saved)) {
      setPendingId(sectionId);
      return;
    }
    setBusy(true);
    try {
      await loadSection(edition, sectionId);
    } catch (reason) {
      setNotice(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (!edition || !draft) return false;
    const order = orderBlankPicks(draft.picks);
    if (!order.ok) return false;
    setBusy(true);
    try {
      const result = await api.saveSection({
        editionId: edition.editionId,
        sectionId: draft.sectionId,
        expectedRevision: draft.revision,
        requestId: newRequestId(),
        section: draft,
      });
      const next = {
        ...draft,
        revision: result.revision,
        aggregateRevision: result.aggregateRevision,
        status: "saved" as const,
      };
      setDraft(next);
      setSaved(structuredClone(next));
      setEdition({
        ...edition,
        aggregateRevision: result.aggregateRevision,
        units: edition.units.map((unit) => ({
          ...unit,
          sections: unit.sections.map((section) =>
            section.sectionId === next.sectionId
              ? { ...section, status: "saved" }
              : section,
          ),
        })),
      });
      setConflict(null);
      setNotice("저장됨");
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

  async function moveSpread(direction: -1 | 1) {
    if (!edition || !draft) return;
    const starts = spreadStarts(edition.units);
    const current = starts.indexOf(draft.sectionId);
    const origin = current >= 0 ? current : 0;
    const nextIndex = origin + direction;
    const sectionId = starts[nextIndex];
    if (!sectionId) return;
    await selectSection(sectionId);
  }

  async function followJob(job: PublishJob) {
    if (!edition) return;
    let current = job;
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
    }
  }

  async function persistOutline(units: OutlineUnit[]) {
    if (!edition) return;
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

  const order = draft
    ? orderBlankPicks(draft.picks)
    : { ok: true as const, groups: [] };
  const pageLabel = draft
    ? draft.parity === "even-left"
      ? "짝수 왼쪽"
      : draft.parity === "continue"
        ? "이어짐"
        : "시작 면 미정"
    : "쪽 없음";
  const previewVariant =
    audience === "student" || mode === "student" || mode === "draft"
      ? "student"
      : "answers";
  const preview = useMemo(() => {
    if (!edition || !draft) return null;
    return buildSectionPreview({
      edition,
      section: draft,
      variant: previewVariant,
    });
  }, [edition, draft, previewVariant]);

  return (
    <div className={styles.studio} data-narrow={narrow ? "true" : "false"}>
      <header className={styles.row}>
        <h1>교재 제작</h1>
        {edition ? (
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setEdition(null);
              setDraft(null);
              setSaved(null);
            }}
          >
            목록
          </button>
        ) : null}
      </header>
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
      {books === null && !edition ? <p>교재를 불러오는 중입니다.</p> : null}
      {books !== null && !edition ? (
        <div className={styles.stack}>
          <BookList
            books={books}
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
          {showImport ? (
            <ImportPanel
              onSubmit={(mode: ImportMode, file: File) => {
                setBusy(true);
                api
                  .importPackage({
                    mode,
                    file,
                    fileName: file.name,
                    requestId: newRequestId(),
                  })
                  .then((result) => {
                    if ("rejected" in result) {
                      setIssues(result.issues);
                      setImportNote("가져오지 못했습니다.");
                      return;
                    }
                    if (result.mode === "archive") {
                      setImportNote("읽기 전용 보관본입니다.");
                      setIssues(result.issues);
                      return;
                    }
                    setBooks((current) => [...(current ?? []), result.book]);
                    setImportNote(`${result.book.title} 원고를 만들었습니다.`);
                  })
                  .catch((reason: unknown) => setNotice(messageOf(reason)))
                  .finally(() => setBusy(false));
              }}
            />
          ) : null}
          {importNote ? <p role="status">{importNote}</p> : null}
        </div>
      ) : null}
      {edition ? (
        <div className={styles.stack}>
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
              }}
            >
              영상
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                api
                  .readExport(edition.editionId)
                  .then(setExportLink)
                  .catch((reason: unknown) => setNotice(messageOf(reason)));
              }}
            >
              내보내기
            </button>
          </div>
          {exportLink ? <a href={exportLink.href}>{exportLink.label}</a> : null}
          <div className={styles.workspace} data-pane={pane} data-zoom={zoom}>
            <div className={styles.outline}>
              <Outline
                units={edition.units}
                collapsed={collapsed}
                currentId={draft?.sectionId ?? null}
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
              <form
                className={styles.stack}
                onSubmit={(event) => {
                  event.preventDefault();
                  const unitKey = edition.units[0]?.unitKey;
                  if (!unitKey) {
                    setNotice("단원이 없어 구획을 만들 수 없습니다.");
                    return;
                  }
                  setBusy(true);
                  api
                    .createSection({
                      editionId: edition.editionId,
                      unitKey,
                      sectionKey: newSectionKey.trim(),
                      templateKey: newTemplateKey.trim(),
                      title: newSectionTitle.trim(),
                      requestId: newRequestId(),
                    })
                    .then(async (created) => {
                      const reopened = await api.openEdition(edition.editionId);
                      const nextEdition = {
                        ...reopened,
                        aggregateRevision: created.aggregateRevision,
                      };
                      setEdition(nextEdition);
                      setNewSectionTitle("");
                      setNewSectionKey("");
                      setNewTemplateKey("");
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
                    onChange={(event) => setNewSectionTitle(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>구획 키</span>
                  <input
                    value={newSectionKey}
                    onChange={(event) => setNewSectionKey(event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  <span>지면 틀</span>
                  <input
                    value={newTemplateKey}
                    onChange={(event) => setNewTemplateKey(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={
                    busy ||
                    newSectionTitle.trim() === "" ||
                    newSectionKey.trim() === "" ||
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
              <ConfigPanel
                title={edition.title}
                volumeCode={edition.config.volumeCode}
                pageTarget={String(
                  edition.structureSource?.config.pageBudget.target ?? "",
                )}
                videoPolicy={edition.config.videoPolicy}
                studentSolutionPolicy={edition.config.studentSolutionPolicy}
                busy={busy}
                onSave={(value) => {
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
                  const edited = applyEditionEdits(edition.structureSource, {
                    title: value.title.trim(),
                    volumeCode: value.volumeCode.trim(),
                    videoPolicy: value.videoPolicy,
                    studentSolutionPolicy: value.studentSolutionPolicy,
                    ...(value.pageTarget.trim() === ""
                      ? {}
                      : { pageTarget: pages }),
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
              {pendingId ? (
                <div className={styles.note}>
                  <p>저장하지 않은 수정이 있습니다.</p>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() =>
                      void saveDraft().then((ok) => {
                        if (ok && edition) void loadSection(edition, pendingId);
                      })
                    }
                  >
                    저장 후 이동
                  </button>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={() => {
                      setDraft(saved);
                      void selectSection(pendingId);
                    }}
                  >
                    버리고 이동
                  </button>
                </div>
              ) : null}
              {panel === "edit" && draft ? (
                <SectionEditor
                  draft={draft}
                  audience={audience}
                  mode={mode}
                  conflictMessage={conflict?.message ?? null}
                  serverText={conflict?.serverText ?? null}
                  showServer={showServer}
                  orderMessage={order.ok ? null : order.message}
                  diffSummary={diffSummary}
                  saving={busy}
                  onChange={setDraft}
                  onSave={() => void saveDraft()}
                  onToggleServer={() => setShowServer((value) => !value)}
                  onCopy={() => {
                    setBusy(true);
                    api
                      .createEdition(
                        edition.bookId,
                        edition.editionId,
                        newRequestId(),
                      )
                      .then((next) => {
                        setEdition(next);
                        setNotice(
                          "새 초안을 만들었습니다. 이 구획의 수정은 아직 저장되지 않았습니다.",
                        );
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                  onCapture={(testId, problemIds) => {
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
                  onRegister={(itemId) => {
                    api
                      .registerItem(
                        edition.editionId,
                        itemId,
                        newRequestId(),
                        edition.aggregateRevision,
                      )
                      .then((result) => rememberItem(result))
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onCreateConcept={(conceptKey, title) => {
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
                    setDraft({ ...draft, concept });
                  }}
                  onSaveConcept={() => {
                    if (!draft.concept) return;
                    api
                      .saveConcept({
                        editionId: edition.editionId,
                        conceptKey: draft.concept.conceptKey,
                        expectedRevision: conceptRevision,
                        requestId: newRequestId(),
                        concept: draft.concept,
                        picks: draft.picks,
                        source: conceptSource,
                        unitKey: draft.unitKey,
                        sectionKey: draft.sectionKey,
                        confirmEntryIds: draft.picks
                          .filter((pick) => pick.confirmRequested)
                          .map((pick) => pick.entryId),
                        confirmLinkIds: [],
                      })
                      .then((savedConcept) => {
                        const status = new Map(
                          savedConcept.concept.blankItems.map((item) => [
                            `${item.entryKind}:${item.entryId}`,
                            item.review.status,
                          ]),
                        );
                        setConceptSource(savedConcept.concept);
                        setConceptRevision(savedConcept.revision);
                        setEdition((current) =>
                          current
                            ? {
                                ...current,
                                aggregateRevision:
                                  savedConcept.aggregateRevision,
                              }
                            : current,
                        );
                        setDraft((current) =>
                          current && current.concept
                            ? {
                                ...current,
                                concept: {
                                  ...current.concept,
                                  title: savedConcept.concept.title,
                                  kind: savedConcept.concept.kind,
                                  blankForms: savedConcept.concept.blankForms
                                    ? [...savedConcept.concept.blankForms]
                                    : current.concept.blankForms,
                                },
                                picks: current.picks.map((pick) => ({
                                  ...pick,
                                  confirmRequested: false,
                                  reviewStatus:
                                    status.get(
                                      `${pick.entryKind}:${pick.entryId}`,
                                    ) ?? pick.reviewStatus,
                                })),
                              }
                            : current,
                        );
                        setNotice("개념을 저장했습니다.");
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
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
                  onPreflight={() => {
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
                    setBusy(true);
                    api
                      .stepPublish(edition.editionId, newRequestId())
                      .then((job) => followJob(job))
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                  onFinalize={() => {
                    setBusy(true);
                    api
                      .finalize(edition.editionId, newRequestId())
                      .then((job) => {
                        setPublishStatus(job.status);
                        setIssues(job.issues);
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                />
              ) : null}
              {panel === "assign" ? (
                <AssignmentPanel
                  rows={assignments}
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
              {panel === "video" ? (
                <VideoPanel
                  rows={videos}
                  onCreate={(title, providerVideoId) => {
                    api
                      .createVideo({
                        requestId: newRequestId(),
                        title,
                        providerVideoId,
                      })
                      .then((row) =>
                        setVideos((current) => [
                          ...current,
                          { ...row, policy: edition.config.videoPolicy },
                        ]),
                      )
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onBind={(snapshotId, videoId, contentHash) => {
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
                  onUpdate={(bindingId, status, policy) => {
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
                        contentHash: current.contentHash,
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
            {draft ? (
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
                onPrev={() => void moveSpread(-1)}
                onNext={() => void moveSpread(1)}
                renderPaper={renderPaper}
                measured={
                  preview?.ok && draft ? (
                    <SectionMeasure
                      key={`${draft.sectionId}:${previewVariant}:${draft.revision}:${draft.parity}:${draft.title}`}
                      model={preview.model}
                      resources={preview.resources}
                    />
                  ) : null
                }
                unavailable={
                  preview &&
                  !preview.ok &&
                  preview.message !== "판본 원본이 없어 측정하지 않습니다."
                    ? preview.message
                    : null
                }
              />
            ) : (
              <p className={styles.muted}>미리볼 구획이 없습니다.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
