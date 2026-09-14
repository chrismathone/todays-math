"use client";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import WorkspacePageHeader from "./WorkspacePageHeader";
import WorkProgress from "./WorkProgress";
import { PrintOptionsPanel } from "./print/PrintOptionsPanel";
import { WorksheetPrint } from "./print/WorksheetPrint";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintMeta,
  type PrintOptions,
} from "./print/types";
import Icon from "./WorkspaceIcon";
import type { StudioProblem } from "./types";
import {
  WORKSPACE_MENUS,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import s from "./WorksheetEditor.module.css";
interface Props {
  allowedMenus?: WorkspaceMenu[];
  selected: StudioProblem[];
  title: string;
  columns: number;
  answers: boolean;
  savedAt: string;
  printOptions?: PrintOptions;
  printMeta?: PrintMeta;
  setPrintOptions?: (patch: Partial<PrintOptions>) => void;
  setPrintMeta?: (patch: Partial<PrintMeta>) => void;
  setTitle: (value: string) => void;
  setColumns: (value: number) => void;
  setAnswers: (value: boolean) => void;
  save: () => void;
  restore: () => void;
  download: () => void;
  toggle: (problem: StudioProblem) => void;
  move: (index: number, direction: number) => void;
  navigate: (view: "bank" | "studio") => void;
  onBackToReview?: () => void;
  onImportFiles?: () => void;
  onEditSource?: (problem: StudioProblem) => void;
}
export default function WorksheetEditor({
  selected,
  title,
  columns,
  answers,
  savedAt,
  printOptions,
  printMeta,
  setPrintOptions,
  setPrintMeta,
  setTitle,
  setColumns,
  setAnswers,
  save,
  restore,
  download,
  toggle,
  move,
  navigate,
  onBackToReview,
  onImportFiles,
  onEditSource,
  allowedMenus = WORKSPACE_MENUS.map((menu) => menu.id),
}: Props) {
  const can = (menu: WorkspaceMenu) => allowedMenus.includes(menu);
  const editorRef = useRef<HTMLElement>(null);
  const [exportProgress, setExportProgress] = useState("");
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const orderListRef = useRef<HTMLOListElement>(null);
  const addFromBankRef = useRef<HTMLButtonElement>(null);
  const removedIndexRef = useRef<number | null>(null);
  const [tab, setTab] = useState<"settings" | "order">("settings");
  // Archived concept callers still work; the live workspace persists through its draft store.
  const [localOptions, setLocalOptions] = useState(() => ({
    ...DEFAULT_PRINT_OPTIONS,
    columns: columns === 1 ? (1 as const) : (2 as const),
    showAnswers: answers,
  }));
  const [localMeta, setLocalMeta] = useState(() => ({ ...DEFAULT_PRINT_META }));
  const options = printOptions ?? localOptions;
  const meta = printMeta ?? localMeta;
  const [prepared, setPrepared] = useState<{
    selected: StudioProblem[];
    title: string;
    options: PrintOptions;
    meta: PrintMeta;
  } | null>(null);
  // Readiness belongs to this exact draft. A previous layout must not leave
  // print enabled during the first render after a formatting or content change.
  const printReady =
    prepared?.selected === selected &&
    prepared.title === title &&
    prepared.options === options &&
    prepared.meta === meta;
  const setPrintReady = useCallback(
    (ready: boolean) =>
      setPrepared(ready ? { selected, title, options, meta } : null),
    [selected, title, options, meta],
  );
  function updateOptions(patch: Partial<PrintOptions>) {
    if (setPrintOptions) setPrintOptions(patch);
    else {
      setLocalOptions((previous) => ({ ...previous, ...patch }));
      if (patch.columns) setColumns(patch.columns);
      if (patch.showAnswers !== undefined) setAnswers(patch.showAnswers);
    }
  }
  function updateMeta(patch: Partial<PrintMeta>) {
    if (setPrintMeta) setPrintMeta(patch);
    else setLocalMeta((previous) => ({ ...previous, ...patch }));
  }

  useLayoutEffect(() => {
    if (removedIndexRef.current === null) return;
    const index = Math.min(removedIndexRef.current, selected.length - 1);
    const nextButton =
      orderListRef.current?.children[index]?.querySelector<HTMLButtonElement>(
        "button:last-child",
      );
    (nextButton || addFromBankRef.current)?.focus({ preventScroll: true });
    removedIndexRef.current = null;
  }, [selected]);

  function removeProblem(problem: StudioProblem, index: number) {
    // The parent still owns draft changes and undo; restore keyboard focus after
    // the active row is removed, including the transition to an empty worksheet.
    removedIndexRef.current = index;
    toggle(problem);
  }

  async function exportDocument(kind: "hwpx" | "pdf") {
    const document = editorRef.current?.querySelector<HTMLElement>(
      "[data-mathgen-document]",
    );
    if (!document || !printReady || exporting) return;
    setExporting(true);
    setExportError("");
    setExportProgress(`${kind.toUpperCase()} 문서를 준비하고 있습니다…`);
    try {
      const { exportPreviewHwpx, downloadExport } =
        await import("@/lib/export/hwpxClient");
      const blob =
        kind === "hwpx"
          ? await exportPreviewHwpx(document, title, (current, total) =>
              setExportProgress(`HWPX 문서 구성 ${current}/${total}쪽…`),
            )
          : await (
              await import("@/lib/export/pdfClient")
            ).exportPreviewPdf(document, title);
      downloadExport(blob, `${title || "시험지"}.${kind}`);
      setExportProgress(`${kind.toUpperCase()} 파일을 내려받았습니다.`);
    } catch (error) {
      setExportProgress("");
      setExportError(
        error instanceof Error ? error.message : "파일 생성에 실패했습니다.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className={s.exportContent} ref={editorRef}>
      <WorkspacePageHeader
        title="시험지 구성하기"
        description="문제 순서와 배치를 정하고 인쇄하세요."
      >
        {can("studio") && onBackToReview && (
          <button className={s.secondaryButton} onClick={onBackToReview}>
            <span aria-hidden="true">←</span> 이전 검토 단계
          </button>
        )}
        <button
          className={s.secondaryButton}
          onClick={save}
          disabled={!selected.length}
        >
          <Icon name="save" size={18} /> 작업 저장
        </button>
        <button
          className={s.primaryButton}
          disabled={!selected.length || !printReady || exporting}
          aria-busy={selected.length > 0 && !printReady}
          onClick={() => window.print()}
        >
          {selected.length > 0 && !printReady ? (
            <WorkProgress variant="inline" label="인쇄 준비 중…" />
          ) : (
            <>
              <Icon name="print" size={18} />
              인쇄 / PDF 저장
            </>
          )}
        </button>
        <button
          className={s.secondaryButton}
          disabled={!selected.length || !printReady || exporting}
          onClick={() => void exportDocument("hwpx")}
        >
          HWPX 내보내기
        </button>
        <button
          className={s.secondaryButton}
          disabled={!selected.length || !printReady || exporting}
          onClick={() => void exportDocument("pdf")}
        >
          PDF 내려받기
        </button>
      </WorkspacePageHeader>
      {(exportProgress || exportError) && (
        <div className={s.exportNotification} data-error={Boolean(exportError)}>
          {exportError ? (
            <p role="alert">{exportError}</p>
          ) : (
            <p role="status" aria-live="polite">
              {exportProgress}
            </p>
          )}
          <button
            type="button"
            aria-label="내보내기 알림 닫기"
            onClick={() => {
              setExportProgress("");
              setExportError("");
            }}
          >
            <Icon name="close" size={17} />
          </button>
        </div>
      )}
      {!selected.length ? (
        <div className={s.emptyExport}>
          <h2>시험지에 문제를 담아 주세요</h2>
          <p>
            {can("bank") || can("studio")
              ? "문제은행에서 고르거나 내 자료를 가져오세요."
              : "저장한 작업 파일을 불러와 시험지를 편집할 수 있어요."}
          </p>
          <div>
            {can("bank") && (
              <button
                className={s.primaryButton}
                ref={addFromBankRef}
                onClick={() => navigate("bank")}
              >
                문제은행에서 담기 <Icon name="arrow" size={18} />
              </button>
            )}
            {can("studio") && (
              <button
                className={s.secondaryButton}
                onClick={onImportFiles ?? (() => navigate("studio"))}
              >
                자료 가져오기
              </button>
            )}
          </div>
          <button className={s.textButton} onClick={restore}>
            저장한 작업 불러오기
          </button>
        </div>
      ) : (
        <div className={s.exportGrid}>
          <aside className={s.exportInspector}>
            <h2>시험지 설정</h2>
            <div
              className={s.inspectorTabs}
              role="tablist"
              aria-label="시험지 편집 도구"
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "settings"
                    : event.key === "End"
                      ? "order"
                      : tab === "settings"
                        ? "order"
                        : "settings";
                setTab(next);
                event.currentTarget
                  .querySelector<HTMLButtonElement>(`#worksheet-${next}-tab`)
                  ?.focus();
              }}
            >
              <button
                role="tab"
                id="worksheet-settings-tab"
                aria-selected={tab === "settings"}
                tabIndex={tab === "settings" ? 0 : -1}
                aria-controls="worksheet-settings-panel"
                onClick={() => setTab("settings")}
              >
                서식 설정
              </button>
              <button
                role="tab"
                id="worksheet-order-tab"
                aria-selected={tab === "order"}
                tabIndex={tab === "order" ? 0 : -1}
                aria-controls="worksheet-order-panel"
                onClick={() => setTab("order")}
              >
                문제 순서 · {selected.length}
              </button>
            </div>
            <button
              className={s.previewJump}
              onClick={() => {
                const preview = document.getElementById("worksheet-preview");
                preview?.scrollIntoView({ block: "start" });
                preview?.focus({ preventScroll: true });
              }}
            >
              미리보기 보기 ↓
            </button>
            <div
              id="worksheet-settings-panel"
              role="tabpanel"
              aria-labelledby="worksheet-settings-tab"
              hidden={tab !== "settings"}
              className={s.settingsPanel}
            >
              <PrintOptionsPanel
                title={title}
                setTitle={setTitle}
                options={options}
                meta={meta}
                onOptions={updateOptions}
                onMeta={updateMeta}
              />
            </div>
            <div
              id="worksheet-order-panel"
              role="tabpanel"
              aria-labelledby="worksheet-order-tab"
              hidden={tab !== "order"}
              className={s.orderPanel}
            >
              <div className={s.orderHeading}>
                <h3>문제 순서</h3>
                <span>{selected.length}문항</span>
              </div>
              <ol className={s.orderList} ref={orderListRef}>
                {selected.map((p, i) => (
                  <li key={p.id}>
                    <span className={s.orderNumber}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong
                        title={p.section || p.sourceLabel || "가져온 문제"}
                      >
                        {p.section || p.sourceLabel || "가져온 문제"}
                      </strong>
                      <small>
                        {p.grade} · {p.difficulty || "내 자료"}
                      </small>
                    </div>
                    <div className={s.orderActions}>
                      {can("studio") && p.studioCrop && onEditSource && (
                        <button
                          className={s.secondaryButton}
                          aria-label={`${i + 1}번 원본 편집`}
                          onClick={() => onEditSource(p)}
                        >
                          원본 편집
                        </button>
                      )}
                      <button
                        disabled={i === 0}
                        aria-label={`${i + 1}번 문제 위로`}
                        onClick={() => move(i, -1)}
                      >
                        ↑
                      </button>
                      <button
                        disabled={i === selected.length - 1}
                        aria-label={`${i + 1}번 문제 아래로`}
                        onClick={() => move(i, 1)}
                      >
                        ↓
                      </button>
                      <button
                        aria-label={`${i + 1}번 문제 빼기`}
                        onClick={() => removeProblem(p, i)}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className={s.bottomActions}>
              {can("bank") && (
                <button
                  className={s.addMore}
                  ref={addFromBankRef}
                  onClick={() => navigate("bank")}
                >
                  <Icon name="plus" size={16} /> 문제 더 담기
                </button>
              )}
              <button className={s.secondaryButton} onClick={download}>
                <Icon name="save" size={18} /> 작업 파일 내보내기
              </button>
            </div>
            {savedAt && (
              <p className={s.subtle}>
                이 브라우저에 저장됨 ·{" "}
                {new Date(savedAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </aside>
          <WorksheetPrint
            selected={selected}
            title={title}
            options={options}
            printMeta={meta}
            onReady={setPrintReady}
          />
        </div>
      )}
    </main>
  );
}
