"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  TextbookRequestError,
  httpTextbookApi,
  newRequestId,
  type TextbookStudioApi,
} from "@/lib/textbook/client";
import {
  orderBlankPicks,
  spreadStarts,
  type AssignmentRow,
  type Audience,
  type BookSummary,
  type EditionDetail,
  type ImportMode,
  type PaperPreviewInput,
  type PreviewMode,
  type PublishStatus,
  type SectionDetail,
  type StudioIssue,
  type StudioPane,
  type VideoBinding,
  type ZoomMode,
} from "@/components/textbook/model";
import {
  AssignmentPanel,
  BookList,
  ImportPanel,
  Outline,
  PreviewPane,
  PublishPanel,
  ReviewTable,
  SectionEditor,
  VideoPanel,
  paperInput,
} from "@/components/textbook/parts";
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
}: {
  api?: TextbookStudioApi;
  audience?: Audience;
  renderPaper?: (input: PaperPreviewInput) => ReactNode;
  viewport?: "desktop" | "mobile";
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

  async function loadSection(nextEdition: EditionDetail, sectionId: string) {
    const section = await api.getSection(nextEdition.editionId, sectionId);
    const aligned = {
      ...section,
      aggregateRevision: nextEdition.structureRevision,
    };
    setDraft(aligned);
    setSaved(structuredClone(aligned));
    setConflict(null);
    setShowServer(false);
    setPendingId(null);
    setDiffSummary(null);
  }

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
      {books === null ? <p>교재를 불러오는 중입니다.</p> : null}
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
            onTitle={setTitle}
            onVolume={setVolumeCode}
            onCurriculum={setCurriculumVersion}
            onPageTarget={setPageTarget}
            onVideoPolicy={setVideoPolicy}
            onCreate={() => {
              const pages = Number(pageTarget);
              if (!Number.isSafeInteger(pages) || pages < 1) {
                setNotice("목표 쪽수는 1 이상의 정수입니다.");
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
      {edition && books !== null ? (
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
                      setEdition({
                        ...edition,
                        units: edition.units.map((unit, index) =>
                          index === 0
                            ? {
                                ...unit,
                                sections: [
                                  ...unit.sections,
                                  {
                                    sectionId: created.sectionId,
                                    title: created.title,
                                    status: "draft" as const,
                                    parity: "continue" as const,
                                  },
                                ],
                              }
                            : unit,
                        ),
                      });
                      setNewSectionTitle("");
                      setNewSectionKey("");
                      setNewTemplateKey("");
                      await loadSection(edition, created.sectionId);
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
                    api
                      .captureItems({
                        editionId: edition.editionId,
                        sectionId: draft.sectionId,
                        expectedRevision: edition.structureRevision,
                        requestId: newRequestId(),
                        testId: testId || null,
                        problemIds,
                      })
                      .then((result) => {
                        setDraft((current) =>
                          current
                            ? { ...current, items: result.items }
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
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onDiff={(itemId) => {
                    api
                      .diffItem(
                        edition.editionId,
                        itemId,
                        newRequestId(),
                        edition.structureRevision,
                      )
                      .then((diff) => setDiffSummary(diff.summary))
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
                  onRecapture={(itemId) => {
                    api
                      .recaptureItem(
                        edition.editionId,
                        itemId,
                        newRequestId(),
                        edition.structureRevision,
                      )
                      .then((item) => {
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                items: current.items.map((row) =>
                                  row.itemId === item.itemId ? item : row,
                                ),
                              }
                            : current,
                        );
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)));
                  }}
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
                        edition.structureRevision,
                      )
                      .then((job) => {
                        setPublishStatus(job.status);
                        setIssues(job.issues);
                      })
                      .catch((reason: unknown) => setNotice(messageOf(reason)))
                      .finally(() => setBusy(false));
                  }}
                  onStep={() => {
                    setBusy(true);
                    api
                      .stepPublish(edition.editionId, newRequestId())
                      .then((job) => {
                        setPublishStatus(job.status);
                        setIssues(job.issues);
                      })
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
