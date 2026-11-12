"use client";

import { BackButton } from "@/components/ui/BackLink";

/* Local image data must stay in the browser, bypassing the Next image optimizer. */
/* eslint-disable @next/next/no-img-element */

import StudioStepBar from "./StudioStepBar";
import StudioPageOrder from "./StudioPageOrderStep";
import {
  activePageOrder,
  commitPageOrder,
  createPageOrderHistory,
  initialPageOrder,
  movePage,
  reconcilePageOrder,
  studioPageKey,
  togglePageOut,
  undoPageOrder,
  type StudioOrderedPage,
} from "./studioPageOrder";
import {
  renderStudioPagePreview,
  type StudioPagePreview,
} from "./studioPagePreview";
import StudioCropOverlay from "./StudioCropOverlay";
import WorkProgress from "./WorkProgress";
import StudioQueueStatus from "./StudioQueueStatus";
import { summarizePageWarnings } from "./pageWarningSummary";
import StudioProgressStrip from "./StudioProgressStrip";
import { studioCropWorkKind, studioWorkName } from "./studioWorkNames";
import { applyStudioCropEdit, studioCropStatusOnly } from "./studioCropEdit";
import { retainStudioFigures } from "./studioFigureReferences";
import StudioFigureFailures, {
  studioFailedFigureItems,
} from "./StudioFigureFailures";
import StudioReviewPane from "./StudioReviewPane";
import StudioPageEmpty from "./StudioPageEmpty";
import {
  StudioSessionStore,
  type StudioSessionData,
} from "./studioSessionStore";
import { useLibrarySaveConfirmation } from "./LibrarySaveDialog";
import { workspaceLibraryLabel } from "@/contracts/accountAccess.contract";
import { resolveStudioGrade, studioGradeLevel } from "./studioGrade";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent,
  PointerEvent,
  SVGProps,
} from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { useStudioAi, type StudioAiPageTask } from "./useStudioAi";
import { useStudioDemo, useStudioDemoFile } from "./useStudioDemo";
import {
  studioCropImage,
  studioImageCanvas,
  studioRotateCanvas,
} from "./studioAiHelpers";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import type { SchoolLevel, StudioProblem, StudioViewProps } from "./types";
import {
  studioCartAddLabel,
  studioCartPending,
  studioCartState,
  onlySolutionChanged,
  useStudioCart,
  type StudioCartRemoval,
  type StudioCartPageIdentity,
} from "./studioCart";
import StudioCartPanel, { StudioCartChip } from "./StudioCartPanel";
import {
  clamp,
  drawStudioSample,
  STUDIO_GRADES,
  STUDIO_QUESTION_TYPES,
  studioCropDigitized,
  studioDeleteWarning,
  studioFigureLabel,
  studioFigureProgressDetail,
  studioPixelRect,
  studioProblem,
  studioRectBetween,
} from "./studioHelpers";
import type { StudioCrop, StudioRect, StudioFigure } from "./studioHelpers";
import styles from "./StudioView.module.css";

const StudioFigureEditor = lazy(() => import("./figure-editor"));

function StudioEmptyPageStamp() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={styles.emptyPageStamp}
      data-loaded={loaded}
      role="status"
      aria-label="자동 인식 완료: 문제가 없는 빈 페이지"
    >
      <img
        src="/images/studio/empty-page-stamp.png"
        width={1774}
        height={887}
        alt=""
        aria-hidden="true"
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

interface StudioSource {
  id: string;
  name: string;
  kind: "image" | "pdf" | "sample";
  pages: number;
  grade?: string;
  level?: SchoolLevel;
  gradeManual?: boolean;
  pageRotations?: Record<number, number>;
  original?: File;
  image?: HTMLImageElement | HTMLCanvasElement;
  pdf?: PDFDocumentProxy;
}

/** Background rendering owns its canvas and cancellation, independently of the viewport. */
async function renderAiPage(
  source: StudioSource,
  page: number,
  signal: AbortSignal,
  extraRotation = 0,
) {
  const check = () => {
    if (signal.aborted) throw new DOMException("작업 취소", "AbortError");
  };
  check();
  const canvas = document.createElement("canvas");
  let referenceText: string | undefined;
  if (source.pdf) {
    const pdfPage = await source.pdf.getPage(page);
    check();
    try {
      const text = await pdfPage.getTextContent();
      referenceText = text.items
        .flatMap((item) => ("str" in item ? [item.str] : []))
        .join(" ");
    } catch {
      /* A scanned/image-only PDF has no usable text reference. */
    }
    check();
    const base = pdfPage.getViewport({ scale: 1 });
    const viewport = pdfPage.getViewport({
      scale: Math.min(2.5, 2200 / Math.max(base.width, base.height)),
    });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("지면을 불러오지 못했습니다.");
    const task = pdfPage.render({ canvas, canvasContext: context, viewport });
    const abort = () => task.cancel();
    signal.addEventListener("abort", abort, { once: true });
    try {
      await task.promise;
    } finally {
      signal.removeEventListener("abort", abort);
    }
  } else if (source.image) {
    canvas.width =
      source.image instanceof HTMLImageElement
        ? source.image.naturalWidth
        : source.image.width;
    canvas.height =
      source.image instanceof HTMLImageElement
        ? source.image.naturalHeight
        : source.image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("지면을 불러오지 못했습니다.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source.image, 0, 0);
  } else throw new Error("원본 파일을 다시 불러와 주세요.");
  check();
  const result = studioRotateCanvas(
    canvas,
    (source.pageRotations?.[page] ?? 0) + extraRotation,
  );
  return {
    canvas: result,
    imageDataUrl: result.toDataURL("image/png"),
    referenceText,
  };
}

interface RenderedPage {
  sourceId: string;
  number: number;
  canvas: HTMLCanvasElement;
  url: string;
}

interface StudioSession {
  generation: number;
  importing: AbortController | null;
  loadingPdfs: Set<PDFDocumentLoadingTask>;
  documents: Set<PDFDocumentProxy>;
  renderTask: RenderTask | null;
}

function releaseSession(session: StudioSession) {
  // Fence every async continuation before releasing its browser resources.
  session.generation += 1;
  session.importing?.abort();
  session.importing = null;
  session.renderTask?.cancel();
  session.renderTask = null;
  for (const loading of session.loadingPdfs)
    void loading.destroy().catch(() => {});
  session.loadingPdfs.clear();
  for (const pdf of session.documents)
    void pdf.loadingTask.destroy().catch(() => {});
  session.documents.clear();
}

function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | "upload"
    | "crop"
    | "file"
    | "check"
    | "arrow"
    | "plus"
    | "trash"
    | "restart";
}) {
  const paths = {
    upload: "M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5",
    crop: "M6 3v15h15M3 6h15v15",
    file: "M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8Zm0 0v6h6M8 13h8M8 17h6",
    check: "m5 12 4 4L19 6",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    plus: "M12 5v14M5 12h14",
    trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
    restart: "M3 4v6h6M3 10a9 9 0 1 1 2 8",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}

function readImage(file: File, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Import cancelled", "AbortError"));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", cancel);
      URL.revokeObjectURL(url);
    };
    const cancel = () => {
      cleanup();
      image.src = "";
      reject(new DOMException("Import cancelled", "AbortError"));
    };
    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(
        new Error(
          "이미지를 열 수 없습니다. PNG, JPG 또는 WebP 파일을 확인해 주세요.",
        ),
      );
    };
    signal.addEventListener("abort", cancel, { once: true });
    image.src = url;
  });
}

export default function StudioView({
  onAdd,
  onExport,
  importRequest,
  active = true,
  restoreRequest,
  storageScope,
  branchId,
  documentId,
  onDocumentChange,
  onCropCountChange,
  canExport = true,
  picked,
  removed,
  onRemove,
  onRemoveAll,
  onRestore,
  pickedCount,
  stepRequest,
  exportRequest,
  onPageOrderChange,
}: StudioViewProps & {
  canExport?: boolean;
  active?: boolean;
  /**
   * 시험지의 담은 목록 — `UnifiedWorkspace` 의 `selected` **그대로**(원장님 2026-09-21 확정, 트랙 44).
   * 작업실의 «담음»·«N문항 담기»·«M문항 담음»·«담은 문항» 목록·「시험지 구성」 탭 배지가 모두
   * 이것에서 센다(`studioCart.ts`). 작업실이 제 안에서 따로 세면 ④·문제은행과 갈린다(트랙 41 어긋남 1~4).
   * 안 넘기면(작업실만 띄우는 시험 하네스) 같은 규칙으로 제 안에 한 벌 둔다.
   */
  picked?: StudioProblem[];
  /** 이 시험지에서 뺀 문항과 그 자리 — 한꺼번에 담기가 건너뛰고, 목록이 흐린 줄로 남긴다. */
  removed?: StudioCartRemoval[];
  /** 목록 줄의 × — ④·문제은행과 같은 빼기 길(`UnifiedWorkspace` 의 `toggle`). */
  onRemove?: (problem: StudioProblem) => void;
  /** «담은 문항» 목록의 «모두 빼기» — 시험지 전체를 뺀다. */
  onRemoveAll?: () => void;
  /** 목록 줄의 «다시 담기» — 뺀 자리로. */
  onRestore?: (problem: StudioProblem) => void;
  /**
   * 「시험지 구성」 탭 배지 — `picked` 를 넘기면 쓰지 않는다. 장부 없이 배지만 보는 옛 하네스용.
   */
  pickedCount?: number;
  /** 시험지 화면의 단계 탭이 보내는 요청 — 그 단계로 간다. */
  stepRequest?: { id: number; step: "upload" | "crop" | "review" };
  /** Shell composition uses the local handoff; clear this request on completion or source change. */
  exportRequest?: { id: number };
  /** 자른 문제 수를 밖에 알린다 — 시험지 화면의 탭 배지가 쓴다(안 A). */
  onCropCountChange?: (count: number) => void;
  onPageOrderChange?: (
    order: readonly StudioOrderedPage[],
    pageCrops: readonly StudioCartPageIdentity[],
  ) => void;
  restoreRequest?: { id: number; crops: StudioCrop[] };
  storageScope?: string;
  branchId?: string | null;
  documentId?: string;
  onDocumentChange?: (id?: string) => void;
}) {
  const handledStep = useRef<number | null>(null);
  const handledExport = useRef<number | null>(null);
  const handledRestore = useRef<number | null>(null);
  const handledImport = useRef<number | null>(null);
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [rendered, setRendered] = useState<RenderedPage | null>(null);
  const [selection, setSelection] = useState<StudioRect | null>(null);
  const [storedCrops, setCrops] = useState<StudioCrop[]>([]);
  const [orderHistory, setOrderHistory] = useState(() =>
    createPageOrderHistory([]),
  );
  const pageOrder = useMemo(
    () => reconcilePageOrder(orderHistory.present, sources),
    [orderHistory.present, sources],
  );
  const livePages = useMemo(() => activePageOrder(pageOrder), [pageOrder]);
  const currentPageIndex = livePages.findIndex(
    (page) => page.sourceId === sourceId && page.page === pageNumber,
  );
  const livePageKeys = useMemo(
    () => new Set(livePages.map(studioPageKey)),
    [livePages],
  );
  const crops = useMemo(() => {
    const ranks = new Map(
      livePages.map((page, index) => [studioPageKey(page), index]),
    );
    return storedCrops
      .filter((crop) => ranks.has(studioPageKey(crop)))
      .sort(
        (a, b) => ranks.get(studioPageKey(a))! - ranks.get(studioPageKey(b))!,
      );
  }, [storedCrops, livePages]);
  const [previews, setPreviews] = useState<
    Record<
      string,
      StudioPagePreview & { loading?: boolean; checking?: boolean }
    >
  >({});
  const previewCache = useRef(new Map<string, StudioPagePreview>());
  const previewController = useRef<AbortController | null>(null);
  const previewRequests = useRef(new Map<string, AbortSignal>());
  // One user-retry lane beside the serial initial pass bounds expensive renders.
  const previewRetries = useRef<{
    signal: AbortSignal;
    pending: { source: StudioSource; page: number }[];
    running: boolean;
  } | null>(null);
  const autoAnalyzeSources = useRef(new Set<string>());
  const analyzedPages = useRef(new Set<string>());
  // Manual inclusion/exclusion survives undo and preview retries for this work.
  const manualOutPages = useRef(new Set<string>());
  const [orderToast, setOrderToast] = useState("");
  const [activeCropId, setActiveCropId] = useState("");
  const [cropTool, setCropTool] = useState<
    "select" | "add-problem" | "add-figure" | "delete"
  >("add-problem");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [inspectedPages, setInspectedPages] = useState<Record<string, string>>(
    {},
  );
  const [step, setStep] = useState<"upload" | "order" | "crop" | "review">(
    "upload",
  );
  const isPageOrder = step === "order";
  const pendingThumbnails =
    isPageOrder &&
    sources.some((source) =>
      initialPageOrder([source]).some((page) => {
        const preview = previews[studioPageKey(page)];
        return (
          !preview ||
          preview.loading ||
          preview.rotation !== (source.pageRotations?.[page.page] ?? 0)
        );
      }),
    );
  const pendingConfirmations =
    isPageOrder && Object.values(previews).some((preview) => preview.checking);
  /*
   * 시험지 화면의 단계 탭이 보내는 요청 — 그 단계로 간다. 2026-09-21 안 A 전에는
   * 「이전 검토 단계」 단추만 있어 `reviewRequest`(검수로만 가는 셈)였다. 탭이 넷이 되면서
   * 어느 단계로든 갈 수 있어야 해 단계까지 실어 나른다.
   * 검수 패널은 건드리지 않는다 — 원장님이 접어 둔 것을 펴지 않는다.
   */
  const [level, setLevel] = useState<SchoolLevel>("secondary");
  const [grade, setGrade] = useState("미지정");
  const [zoom, setZoom] = useState(100);
  const [importingBusy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(
    () => Boolean(storageScope) || typeof indexedDB !== "undefined",
  );
  const stepRequested = useEffectEvent((next: "upload" | "crop" | "review") => {
    if (next === "crop" && isPageOrder) stopPendingPageAnalysis();
    setStep(next);
  });
  useEffect(() => {
    if (restoring || !stepRequest || handledStep.current === stepRequest.id)
      return;
    handledStep.current = stepRequest.id;
    stepRequested(stepRequest.step);
  }, [stepRequest, restoring]);
  const busy = importingBusy || restoring;
  const [sessionStore] = useState(
    () =>
      new StudioSessionStore(storageScope, documentId, { autoResume: false }),
  );
  const reportDocument = useEffectEvent(() =>
    onDocumentChange?.(sessionStore.documentId),
  );
  const latestSave = useRef<(() => void) | undefined>(undefined);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const storageReady = useRef(false);
  const storageEpoch = useRef(0);
  const [sessionSave, setSessionSave] = useState(() =>
    restoring ? "불러오는 중" : "저장소 사용 불가",
  );
  const [savedSessionData, setSavedSessionData] =
    useState<StudioSessionData | null>(null);
  const [storageVersion, setStorageVersion] = useState(0);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
    name: string;
    startedAt: number;
    /** 계정에 저장된 작업을 되살리는 중 — 새 파일을 여는 것과 문구가 다르다(원장님 2026-09-18). */
    restoring?: boolean;
  } | null>(null);
  // 들어오자마자 계정에 저장된 작업을 되살린다 — 그동안 «파일 여는 중»이면 새 파일을 여는 것처럼 보인다.
  const busyLabel =
    restoring || importProgress?.restoring
      ? "이전 작업 불러오는 중…"
      : "파일 여는 중…";
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [coordinatesOpen, setCoordinatesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);
  const [figureEditor, setFigureEditor] = useState<{
    cropId: string;
    figureId: string;
    draftFigure?: StudioFigure;
    onApply?: (next: StudioFigure) => void;
  } | null>(null);
  function openFigureEditor(
    crop: StudioCrop,
    figure: StudioFigure,
    onApply?: (next: StudioFigure) => void,
  ) {
    setFigureEditor({
      cropId: crop.id,
      figureId: figure.id,
      draftFigure: onApply ? figure : undefined,
      onApply,
    });
  }
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const studio = useRef<HTMLElement>(null);
  const focusButton = useRef<HTMLButtonElement>(null);
  const restartButton = useRef<HTMLButtonElement>(null);
  const restartDialog = useRef<HTMLDialogElement>(null);
  const cancelRestartButton = useRef<HTMLButtonElement>(null);
  const pageViewport = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const [chromeHeight, setChromeHeight] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const session = useRef<StudioSession>({
    generation: 0,
    importing: null,
    loadingPdfs: new Set(),
    documents: new Set(),
    renderTask: null,
  });
  const mounted = useRef(true);
  const studioAi = useStudioAi({
    crops,
    setCrops,
    activePages: livePages,
    contextKey: `${sourceId}:${pageNumber}`,
    active,
    // 도형 생성은 ② 영역 지정이 끝난 뒤에 — 크롭과 같이 돌리면 칸을 고친 뒤 두 번 만든다(원장님 2026-09-21).
    figuresDeferred: step !== "review",
    onRotatePage: (id, page, delta) => {
      if (!livePageKeys.has(studioPageKey({ sourceId: id, page }))) return;
      setSources((previous) =>
        previous.map((source) =>
          source.id === id
            ? {
                ...source,
                pageRotations: {
                  ...source.pageRotations,
                  [page]: ((source.pageRotations?.[page] ?? 0) + delta) % 360,
                },
              }
            : source,
        ),
      );
      setInspectedPages((previous) => {
        const next = { ...previous };
        delete next[`${id}:${page}`];
        return next;
      });
      setSelection(null);
      setNotice(`${page}쪽의 뒤집힌 방향을 바로잡고 다시 인식합니다.`);
    },
    onDetected: (id) => {
      setActiveCropId(id);
      setSelectedBoxId(id);
      setCropTool("select");
      setSelection(null);
      setInspectorOpen(true);
    },
  });
  const activePageJobs = studioAi.pageJobs.filter((job) =>
    livePageKeys.has(studioPageKey(job)),
  );
  // 문제 추출 시연(원장님 2026-11-11) — 시연 계정이 시연 PDF 를 열면 AI 응답을 녹화본으로 답한다(`useStudioDemo.ts`).
  useStudioDemo(sources);
  // 시연 계정에게만 — 서버에 둔 시연 시험지를 이 PC 에 파일 없이 연다(원장님 2026-11-11 «어디서든 아이디로»)
  const demoFile = useStudioDemoFile();
  const recognizingPage = studioAi.isPageBusy(sourceId, pageNumber);
  /** 담은 문항 장부 — 시험지의 담은 목록 하나에서 센다(`studioCart.ts`). */
  const cart = useStudioCart({
    picked,
    removed,
    onAdd,
    onRemove,
    onRemoveAll,
    onRestore,
    pageOrder,
    pageCrops: storedCrops,
    onPageOrderChange,
  });
  const cartState = (crop: StudioCrop) =>
    studioCartState(crop, cart.picked, cart.removed);
  const [cartOpen, setCartOpen] = useState(false);
  const cartToggle = useRef<HTMLButtonElement>(null);
  const cartPanelId = useId();
  // 시험지에 이 판 그대로 담긴 것은 한꺼번에 인식·해설에서 뺀다(전에는 `crop.added` 가 그 일을 했다).
  const unreadCrops = crops.filter(
    (crop) => !crop.content.trim() && cartState(crop) !== "picked",
  );
  // 해설은 담은 뒤에 만들어도 시험지에 저절로 들어간다(아래 효과) — 담은 문항도 «해설 없는 N개 생성»에 든다.
  // 뺀 문항만 건너뛴다(원장님 2026-11-11).
  const unsolvedCrops = crops.filter(
    (crop) =>
      crop.content.trim() &&
      !crop.solution.trim() &&
      cartState(crop) !== "removed",
  );
  /**
   * 해설 생성이 끝난 담은 문항은 시험지의 같은 자리에 새 판을 넣는다(원장님 2026-11-11 «해설은 자동 반영»).
   * 전에는 해설이 작업실에만 들어가고 시험지에는 해설 없는 판이 남아 «해설 없음»으로 나갔다.
   * 본문·보기·그림까지 바뀐 문항은 그대로 «반영 전» — 원장님이 «반영»을 누른다.
   */
  const solutionJobsDone = studioAi.cropJobs
    .filter((job) => job.action === "solution" && job.state === "complete")
    .map((job) => job.cropId)
    .join(",");
  useEffect(() => {
    if (!solutionJobsDone) return;
    const done = new Set(solutionJobsDone.split(","));
    const reflect = crops.filter((crop) => {
      if (!done.has(crop.id) || !crop.solution.trim()) return false;
      const entry = cart.picked.find((problem) => problem.id === crop.id);
      return Boolean(
        entry?.studioCrop &&
        (entry.studioCrop.revision ?? 0) !== (crop.revision ?? 0) &&
        onlySolutionChanged(entry.studioCrop, crop),
      );
    });
    if (reflect.length) cart.add(reflect.map(studioProblem));
    // 장부(`cart`)는 매 렌더 새 객체다 — 판이 바뀐 문항이 있을 때만 위에서 걸러 넣는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solutionJobsDone, crops, cart.picked]);

  // The workspace keeps inactive views mounted; leaving must release modal state.
  if (!active && focusMode) setFocusMode(false);
  if (!active && restartOpen) setRestartOpen(false);
  if (!active && cartOpen) setCartOpen(false);

  const currentSource = sources.find((item) => item.id === sourceId);
  const sourceJobs = activePageJobs.filter((job) => job.sourceId === sourceId);
  const sourceRecognizing = sourceJobs.some((job) =>
    ["queued", "rendering", "running"].includes(job.state),
  );
  const currentPageJob = sourceJobs.find((job) => job.page === pageNumber);
  const editing = Boolean(
    currentSource && (step === "crop" || step === "review"),
  );
  /*
   * 편집창 확대는 원장님 선택에만 따른다 — 단계가 바뀐다고 건드리지 않는다.
   * 원장님 2026-09-21 «편집창 확대/축소도 자동으로 하지말고 사용자 선택에 놔둘것»:
   * 2026-09-19 에 고르신 시안 B(«검수에 들어서면 확대, 잘라내기로 돌아가면 되돌림»)를
   * 2026-09-21 에 물린 것이다. 되살리지 말 것 — 켜고 끄는 길은 띠의 «편집창 확대/축소»
   * 단추와 Esc 뿐이고, 고른 상태는 단계를 오가도 그대로 남는다.
   * (작업실을 떠나면 푸는 것은 위 `!active` 줄이 한다 — 확대는 바깥을 inert 로 덮는다.)
   */
  const activeCrop = crops.find((item) => item.id === activeCropId);
  const figureCrop = crops.find((crop) => crop.id === figureEditor?.cropId);
  const editedFigure =
    figureEditor?.draftFigure ??
    figureCrop?.figures?.find((figure) => figure.id === figureEditor?.figureId);
  const editedFigureIndex =
    figureCrop?.figures?.findIndex(
      (figure) => figure.id === editedFigure?.id,
    ) ?? -1;
  const activeCropIndex = crops.findIndex((item) => item.id === activeCropId);
  const pageCrops = crops.filter(
    (crop) => crop.sourceId === sourceId && crop.page === pageNumber,
  );
  const reviewedCount = crops.filter((crop) => crop.reviewed).length;
  const pageKey = `${sourceId}:${pageNumber}`;
  const pageSignature = JSON.stringify(
    pageCrops.map((crop) => [
      crop.id,
      crop.rect,
      crop.figures?.map((figure) => [figure.id, figure.rect]),
    ]),
  );
  const pageInspected = Boolean(
    pageCrops.length && inspectedPages[pageKey] === pageSignature,
  );
  const pageReady = Boolean(
    currentPageIndex >= 0 &&
    rendered &&
    rendered.sourceId === sourceId &&
    rendered.number === pageNumber,
  );
  // «N문항 담기»·«담고 내보내기»가 담을 것 — 뺀 것·고친 뒤 반영 전인 것은 없다(`studioCartPending`).
  const pendingCrops = studioCartPending(crops, cart.picked, cart.removed);
  const pendingCount = pendingCrops.length;
  const compositionBlocked =
    busy || studioAi.running || sessionSave === "복원 실패";
  // 바닥 «M문항 담음» — 작업실 문항 가운데 시험지에 있는 것(고친 뒤 반영 전 포함).
  const pickedHereCount = crops.filter((crop) =>
    cart.picked.some((problem) => problem.id === crop.id),
  ).length;
  // 시험지 화면의 「OCR · 디지털화」 탭 배지가 이 값을 쓴다(안 A).
  const reportCropCount = useEffectEvent(() =>
    onCropCountChange?.(crops.length),
  );
  useEffect(reportCropCount, [crops.length, reportCropCount]);
  const readyToCrop =
    pageReady && selection && rendered
      ? studioPixelRect(
          selection,
          rendered.canvas.width,
          rendered.canvas.height,
        )
      : null;
  const validSelection = Boolean(
    readyToCrop && readyToCrop.width >= 8 && readyToCrop.height >= 8,
  );

  const reconcileGrades = useEffectEvent(() => {
    const decisions = new Map(
      sources.flatMap((source) => {
        const jobs = activePageJobs.filter((job) => job.sourceId === source.id);
        if (
          source.gradeManual ||
          !jobs.length ||
          jobs.some((job) =>
            ["queued", "rendering", "running"].includes(job.state),
          )
        )
          return [];
        return [[source.id, resolveStudioGrade(source, jobs)] as const];
      }),
    );
    if (!decisions.size) return;
    setSources((previous) =>
      previous.map((source) => {
        const result = decisions.get(source.id);
        return result && source.grade !== result.grade
          ? {
              ...source,
              grade: result.grade,
              level: studioGradeLevel(result.grade),
            }
          : source;
      }),
    );
    setCrops((previous) =>
      previous.map((crop) => {
        const result = decisions.get(crop.sourceId);
        const nextGrade = result?.grade ?? "미지정";
        return livePageKeys.has(studioPageKey(crop)) &&
          result &&
          crop.grade !== nextGrade
          ? {
              ...crop,
              grade: nextGrade,
              level: studioGradeLevel(result.grade),
              reviewed: false,
              revision: (crop.revision ?? 0) + 1,
            }
          : crop;
      }),
    );
    const selected = decisions.get(sourceId);
    if (selected) {
      setGrade(selected.grade ?? "미지정");
      setLevel(studioGradeLevel(selected.grade));
    }
  });
  useEffect(() => {
    // Reconcile the completed external AI queue into the file and its existing crops.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reconcileGrades();
  }, [studioAi.pageJobs]);

  useEffect(() => {
    const dialog = restartDialog.current;
    if (!dialog) return;
    if (restartOpen && active) {
      if (!dialog.open) dialog.showModal();
      cancelRestartButton.current?.focus();
    } else if (dialog.open) dialog.close();
  }, [restartOpen, active]);

  useEffect(() => {
    const viewport = pageViewport.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) =>
      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [editing, step, pageReady]);

  useEffect(() => {
    if (!focusMode) return;
    const background: { element: HTMLElement; inert: boolean }[] = [];
    let branch = studio.current;
    while (branch?.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling instanceof HTMLElement &&
          !(sibling instanceof HTMLDialogElement) &&
          sibling !== branch
        ) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
      if (branch === document.body) break;
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = focusButton.current;
    trigger?.focus({ preventScroll: true });
    const close = (event: WindowEventMap["keydown"]) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector("dialog[open]")
      )
        setFocusMode(false);
    };
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("keydown", close);
      document.body.style.overflow = overflow;
      for (const { element, inert } of background) element.inert = inert;
      if (trigger?.isConnected && !trigger.closest("[hidden]"))
        trigger.focus({ preventScroll: true });
    };
  }, [focusMode]);

  // 작업 칸이 화면 높이에서 빼야 하는 것은 그 밖의 줄 전부다 — 머리 띠(꺾이면 두 줄) · 안내 줄 ·
  // 오류 줄 · 바닥 줄. 머리 띠만 재고 나머지를 상수로 빼던 때는 없어진 위 띠까지 빼서 아래가 비었다
  // (원장님 2026-11-11 «하단 여백이 너무 쓸데없이 많은데 페이지 확장시켜»). 확대 중에는 스튜디오가
  // 화면을 덮는 고정 칸이라 «전체 − 작업 칸»이 줄 높이가 아니다 — 재지 않고 확대 전 값을 둔다.
  // 확대 효과(위)가 `studio` 둘레를 바꾸므로 이 효과는 그 뒤에 둔다(react-hooks/immutability).
  useEffect(() => {
    const root = studio.current;
    const area = workspace.current;
    if (!root || !area) return;
    const observer = new ResizeObserver(() => {
      if (root.getAttribute("role") === "dialog") return;
      setChromeHeight(root.offsetHeight - area.offsetHeight);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    mounted.current = true;
    const resources = session.current;
    return () => {
      mounted.current = false;
      releaseSession(resources);
      // Strict Mode replays mount effects; allow the cancelled initial request to retry.
      handledImport.current = null;
    };
  }, []);

  useEffect(() => {
    if (!currentSource || isPageOrder) return;
    const resources = session.current;
    const generation = resources.generation;
    let cancelled = false;
    let task: RenderTask | undefined;
    const stale = () => cancelled || generation !== resources.generation;
    async function renderPage() {
      const canvas = document.createElement("canvas");
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("이 브라우저에서 지면을 표시할 수 없습니다.");
        if (currentSource!.pdf) {
          const page = await currentSource!.pdf.getPage(pageNumber);
          if (stale()) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(2.5, 2200 / Math.max(base.width, base.height)),
          });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          task = page.render({ canvas, canvasContext: ctx, viewport });
          resources.renderTask = task;
          await task.promise;
        } else if (currentSource!.image) {
          const image = currentSource!.image;
          canvas.width =
            image instanceof HTMLImageElement
              ? image.naturalWidth
              : image.width;
          canvas.height =
            image instanceof HTMLImageElement
              ? image.naturalHeight
              : image.height;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0);
        }
        const pageCanvas = studioRotateCanvas(
          canvas,
          currentSource!.pageRotations?.[pageNumber] ?? 0,
        );
        if (!stale())
          setRendered({
            sourceId: currentSource!.id,
            number: pageNumber,
            canvas: pageCanvas,
            url: pageCanvas.toDataURL("image/png"),
          });
      } catch (cause) {
        if (!stale())
          setError(
            cause instanceof Error
              ? cause.message
              : "페이지를 열 수 없습니다. 다른 원본을 선택해 주세요.",
          );
      }
    }
    void renderPage();
    return () => {
      cancelled = true;
      task?.cancel();
      if (resources.renderTask === task) resources.renderTask = null;
    };
  }, [currentSource, pageNumber, isPageOrder]);

  function chooseSource(id: string, requestedPage?: number) {
    const first = livePages.find(
      (item) =>
        item.sourceId === id &&
        (requestedPage === undefined || item.page === requestedPage),
    );
    if (sources.some((source) => source.id === id) && !first) return;
    const page = first?.page ?? requestedPage ?? 1;
    const next =
      (activeCrop?.sourceId === id && activeCrop.page === page
        ? activeCrop
        : undefined) ??
      crops.find((crop) => crop.sourceId === id && crop.page === page);
    setSourceId(id);
    const source = sources.find((item) => item.id === id);
    setGrade(source?.grade ?? "미지정");
    setLevel(source?.level ?? "secondary");
    setPageNumber(page);
    setSelection(null);
    drag.current = null;
    setActiveCropId(next?.id ?? "");
    setSelectedBoxId(next?.id ?? "");
    setError("");
    setStep((previous) => (previous === "review" ? "review" : "crop"));
  }

  function rotateCurrentPage() {
    if (
      currentPageIndex < 0 ||
      !currentSource ||
      !pageReady ||
      busy ||
      studioAi.running
    )
      return;
    if (
      pageCrops.length &&
      !window.confirm(
        "현재 페이지의 문제 영역과 인식 내용을 지우고 90도 회전할까요? 시험지에 이미 담은 문제는 유지됩니다.",
      )
    )
      return;
    if (!studioAi.forgetPage(sourceId, pageNumber)) return;
    setCrops((previous) =>
      previous.filter(
        (crop) => crop.sourceId !== sourceId || crop.page !== pageNumber,
      ),
    );
    setSources((previous) =>
      previous.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              pageRotations: {
                ...source.pageRotations,
                [pageNumber]:
                  ((source.pageRotations?.[pageNumber] ?? 0) + 90) % 360,
              },
            }
          : source,
      ),
    );
    setInspectedPages((previous) => {
      const next = { ...previous };
      delete next[`${sourceId}:${pageNumber}`];
      return next;
    });
    setActiveCropId("");
    setSelectedBoxId("");
    setSelection(null);
    setStep("crop");
    setNotice(`${pageNumber}쪽을 시계 방향으로 90도 회전했습니다.`);
  }

  function orderedLabel(key: string) {
    const page = pageOrder.find((item) => studioPageKey(item) === key);
    return page
      ? `${sources.find((source) => source.id === page.sourceId)?.name} 원본 ${page.page}쪽`
      : "쪽";
  }
  // Settle an excluded selection before any crop controls commit to the screen.
  if (
    sources.length &&
    currentPageIndex < 0 &&
    (sourceId || livePages.length)
  ) {
    const index = pageOrder.findIndex(
      (page) => page.sourceId === sourceId && page.page === pageNumber,
    );
    const next =
      pageOrder.slice(index + 1).find((page) => !page.out) ?? livePages[0];
    const crop =
      next && crops.find((item) => studioPageKey(item) === studioPageKey(next));
    setSourceId(next?.sourceId ?? "");
    setPageNumber(next?.page ?? 1);
    const source = sources.find((item) => item.id === next?.sourceId);
    setGrade(source?.grade ?? "미지정");
    setLevel(source?.level ?? "secondary");
    setActiveCropId(crop?.id ?? "");
    setSelectedBoxId(crop?.id ?? "");
    setSelection(null);
  }
  function changeOrder(next: typeof pageOrder, message: string) {
    if (
      studioAi.running ||
      busy ||
      JSON.stringify(next) === JSON.stringify(pageOrder)
    )
      return;
    const previousOut = new Map(
      pageOrder.map((page) => [studioPageKey(page), page.out]),
    );
    for (const page of next) {
      const key = studioPageKey(page);
      if (previousOut.get(key) !== page.out) manualOutPages.current.add(key);
    }
    setOrderHistory((history) =>
      commitPageOrder({ ...history, present: pageOrder }, next),
    );
    setOrderToast(message);
  }
  function undoOrder() {
    setOrderHistory((history) => undoPageOrder(history));
    setOrderToast("");
  }
  function stopPendingPageAnalysis() {
    // Starting takes ownership of all remaining pages. Reopening order may retry
    // thumbnails, but must never resume automatic exclusions for these sources.
    for (const source of sources) autoAnalyzeSources.current.delete(source.id);
    previewController.current?.abort();
  }
  function startOrderedPages() {
    if (busy || studioAi.running || !livePages.length) return;
    stopPendingPageAnalysis();
    const first = livePages[0];
    chooseSource(first.sourceId, first.page);
    setStep("crop");
    setOrderToast("");
  }
  useEffect(() => {
    if (!orderToast) return;
    const timer = window.setTimeout(() => setOrderToast(""), 6000);
    return () => window.clearTimeout(timer);
  }, [orderToast, orderHistory.present]);

  const acceptPagePreview = useCallback(
    (source: StudioSource, page: number, preview: StudioPagePreview) => {
      const key = studioPageKey({ sourceId: source.id, page });
      setPreviews((previous) => ({
        ...previous,
        [key]: {
          ...preview,
          url:
            preview.url ||
            (preview.error &&
            previous[key]?.rotation === (source.pageRotations?.[page] ?? 0)
              ? (previous[key]?.url ?? "")
              : ""),
          rotation: source.pageRotations?.[page] ?? 0,
          loading: false,
          checking: false,
        },
      }));
      if (
        preview.error ||
        !preview.url ||
        !autoAnalyzeSources.current.has(source.id) ||
        analyzedPages.current.has(key)
      )
        return;
      analyzedPages.current.add(key);
      if (preview.autoOut)
        setOrderHistory((history) => {
          if (
            manualOutPages.current.has(key) ||
            !autoAnalyzeSources.current.has(source.id)
          )
            return history;
          return {
            ...history,
            present: reconcilePageOrder(history.present, sources).map(
              (entry) =>
                studioPageKey(entry) === key
                  ? { ...entry, out: true, autoOut: preview.autoOut }
                  : entry,
            ),
          };
        });
    },
    [sources],
  );
  const loadPagePreview = useCallback(
    async (source: StudioSource, page: number, signal: AbortSignal) => {
      const pageKey = studioPageKey({ sourceId: source.id, page });
      const rotation = source.pageRotations?.[page] ?? 0;
      const key = `${pageKey}:${rotation}`;
      if (signal.aborted || previewRequests.current.get(key)?.aborted === false)
        return;
      let preview = previewCache.current.get(key);
      if (!preview) {
        previewRequests.current.set(key, signal);
        let thumbnail: StudioPagePreview | undefined;
        setPreviews((previous) => {
          const current = previous[pageKey];
          const url = current?.rotation === rotation ? current.url : "";
          return {
            ...previous,
            [pageKey]: {
              ...current,
              url,
              rotation,
              loading: !url,
              checking: Boolean(url),
            },
          };
        });
        const currentRequest = () =>
          !signal.aborted && previewRequests.current.get(key) === signal;
        try {
          preview = await renderStudioPagePreview(source, page, signal, {
            onPreview: (value) => {
              if (!currentRequest()) return;
              thumbnail = {
                url: value.url,
                inkRatio: value.inkRatio,
                rotation,
              };
              const ready = { ...thumbnail, loading: false, checking: true };
              setPreviews((previous) =>
                currentRequest() ? { ...previous, [pageKey]: ready } : previous,
              );
            },
          });
          if (!currentRequest()) return;
          if (!preview.url && thumbnail?.url)
            preview = { ...preview, url: thumbnail.url };
        } catch (cause) {
          if (!currentRequest()) return;
          preview = {
            ...thumbnail,
            url: thumbnail?.url ?? "",
            error:
              cause instanceof Error
                ? cause.message
                : "쪽 그림을 불러오지 못했습니다.",
          };
        } finally {
          // An old aborted request must not clear a newer request's lock.
          if (previewRequests.current.get(key) === signal)
            previewRequests.current.delete(key);
        }
        if (signal.aborted) return;
        // A rendered thumbnail can still carry a retryable verification error.
        if (preview.url && !preview.error)
          previewCache.current.set(key, preview);
      }
      if (!signal.aborted) acceptPagePreview(source, page, preview);
    },
    [acceptPagePreview],
  );
  useEffect(() => {
    if (!isPageOrder) return;
    const controller = new AbortController();
    previewController.current = controller;
    const retries = { signal: controller.signal, pending: [], running: false };
    previewRetries.current = retries;
    void (async () => {
      for (const source of sources) {
        for (let page = 1; page <= source.pages; page++) {
          await loadPagePreview(source, page, controller.signal);
          if (controller.signal.aborted) return;
        }
      }
    })();
    return () => {
      controller.abort();
      if (previewController.current === controller)
        previewController.current = null;
      if (previewRetries.current === retries) previewRetries.current = null;
    };
  }, [sources, isPageOrder, loadPagePreview]);

  function retryPagePreview(key: string) {
    const controller = previewController.current;
    if (!isPageOrder || !controller || controller.signal.aborted) return;
    const page = pageOrder.find((entry) => studioPageKey(entry) === key);
    const source = sources.find((entry) => entry.id === page?.sourceId);
    if (!source || !page) return;
    const cacheKey = `${key}:${source.pageRotations?.[page.page] ?? 0}`;
    if (previewRequests.current.get(cacheKey)?.aborted === false) return;
    const retries = previewRetries.current;
    if (
      !retries ||
      retries.signal !== controller.signal ||
      retries.pending.some(
        (entry) => entry.source.id === source.id && entry.page === page.page,
      )
    )
      return;
    // Explicit retry also recovers an image that failed to decode in the browser.
    previewCache.current.delete(cacheKey);
    retries.pending.push({ source, page: page.page });
    if (retries.running) {
      setPreviews((previous) => ({
        ...previous,
        [key]: {
          ...previous[key],
          url: previous[key]?.url ?? "",
          loading: !previous[key]?.url,
          checking: Boolean(previous[key]?.url),
        },
      }));
      return;
    }
    retries.running = true;
    void (async () => {
      try {
        while (!retries.signal.aborted && retries.pending.length) {
          const next = retries.pending.shift()!;
          await loadPagePreview(next.source, next.page, retries.signal);
        }
      } finally {
        retries.running = false;
      }
    })();
  }

  async function importFiles(files: File[], restored?: StudioSessionData) {
    const resources = session.current;
    if ((!files.length && !restored) || resources.importing) return;
    const controller = new AbortController();
    const generation = resources.generation;
    resources.importing = controller;
    const stale = () => !mounted.current || generation !== resources.generation;
    setBusy(true);
    const startedAt = Date.now();
    setImportProgress({
      done: 0,
      total: files.length,
      name: files[0]?.name ?? "이전 작업",
      startedAt,
      restoring: Boolean(restored),
    });
    setError("");
    const loaded: StudioSource[] = (restored?.sources ?? [])
      .filter((source) => source.kind === "sample")
      .map((source) => ({ ...source, image: drawStudioSample() }));
    const restoredFiles = restored?.sources.filter(
      (source) => source.kind !== "sample",
    );
    const errors: string[] = [];
    for (const [fileIndex, file] of files.entries()) {
      if (stale()) return;
      setImportProgress({
        done: loaded.length + errors.length,
        total: files.length,
        name: file.name,
        startedAt,
        restoring: Boolean(restored),
      });
      try {
        if (file.size > 40 * 1024 * 1024)
          throw new Error("40 MB 이하 파일을 선택해 주세요.");
        const savedSource = restoredFiles?.[fileIndex];
        const id = savedSource?.id ?? crypto.randomUUID();
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const pdfjs = await import("pdfjs-dist");
          if (stale()) return;
          const endpoints = getStudioEndpoints();
          pdfjs.GlobalWorkerOptions.workerSrc = `${endpoints.pdfWorker}?v=${pdfjs.version}`;
          const data = await file.arrayBuffer();
          if (stale()) return;
          const loading = pdfjs.getDocument({
            data,
            useSystemFonts: true,
            cMapUrl: `${endpoints.pdfAssets}cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${endpoints.pdfAssets}standard_fonts/`,
            // Scanned exam text can be a CCITT/JBIG2 image mask, separate
            // from the visible background. Missing WASM silently drops it.
            wasmUrl: `${endpoints.pdfAssets}wasm/`,
          });
          resources.loadingPdfs.add(loading);
          // Password-protected files fail clearly instead of opening an unseen prompt.
          const pdf = await loading.promise.catch(async (cause: unknown) => {
            if (resources.loadingPdfs.delete(loading))
              await loading.destroy().catch(() => {});
            if (cause instanceof Error && cause.name === "PasswordException")
              throw new Error("암호를 해제한 PDF를 선택해 주세요.");
            throw new Error(
              "PDF를 열 수 없습니다. 파일과 PDF 뷰어 연결을 확인해 주세요.",
            );
          });
          resources.loadingPdfs.delete(loading);
          if (stale()) {
            await pdf.loadingTask.destroy().catch(() => {});
            return;
          }
          resources.documents.add(pdf);
          loaded.push({
            ...savedSource,
            id,
            name: file.name,
            kind: "pdf",
            original: file,
            pages: pdf.numPages,
            pdf,
          });
        } else if (
          /^image\/(png|jpeg|webp|gif|bmp)$/.test(file.type) ||
          /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)
        ) {
          const image = await readImage(file, controller.signal);
          if (stale()) return;
          if (image.naturalWidth * image.naturalHeight > 48_000_000)
            throw new Error(
              "이미지가 너무 큽니다. 4,800만 화소 이하로 줄여 주세요.",
            );
          loaded.push({
            ...savedSource,
            id,
            name: file.name,
            kind: "image",
            original: file,
            pages: 1,
            image,
          });
        } else
          throw new Error(
            "PDF, PNG, JPG, WebP, GIF, BMP 파일을 선택해 주세요.",
          );
      } catch (cause) {
        if (stale()) return;
        errors.push(
          `${file.name}: ${cause instanceof Error ? cause.message : "파일을 열 수 없습니다."}`,
        );
      }
    }
    if (!stale()) {
      if (restored && errors.length) {
        releaseSession(resources);
        resources.importing = null;
        setBusy(false);
        setImportProgress(null);
        throw new Error(
          `이전 원본을 복원하지 못했습니다. 저장된 작업은 유지됩니다. ${errors.join(" ")}`,
        );
      }
      const ordered = restored
        ? restored.sources.map((source) =>
            loaded.find((item) => item.id === source.id)!,
          )
        : loaded;
      if (loaded.length) {
        setSources((previous) =>
          restored ? ordered : [...previous, ...ordered],
        );
        if (!restored) {
          loaded.forEach((source) => autoAnalyzeSources.current.add(source.id));
          setOrderHistory((history) => ({
            present: reconcilePageOrder(history.present, [
              ...sources,
              ...ordered,
            ]),
            past: history.past.map((past) =>
              reconcilePageOrder(past, [...sources, ...ordered]),
            ),
          }));
          chooseSource(loaded[0].id);
          setStep("order");
        }
        setNotice(
          `원본 ${loaded.length}개를 열었습니다. 쪽 순서를 확인해 주세요.`,
        );
      }
      if (restored) {
        const restoredOrder = reconcilePageOrder(restored.pageOrder, ordered);
        setOrderHistory(createPageOrderHistory(restoredOrder));
        setCrops(restored.crops);
        const restoredPage =
          activePageOrder(restoredOrder).find(
            (page) =>
              page.sourceId === restored.sourceId &&
              page.page === restored.pageNumber,
          ) ?? activePageOrder(restoredOrder)[0];
        setSourceId(restoredPage?.sourceId ?? restored.sourceId);
        setPageNumber(restoredPage?.page ?? restored.pageNumber);
        setActiveCropId(restored.activeCropId);
        setSelectedBoxId(restored.activeCropId);
        setInspectedPages(restored.inspectedPages);
        setGrade(restored.grade);
        setLevel(restored.level);
        setStep(
          !activePageOrder(restoredOrder).length && restored.step !== "upload"
            ? "order"
            : restored.step,
        );
        studioAi.restorePageJobs(restored.completedPages ?? []);
        setNotice("이전 문제 추출 작업을 복원했습니다.");
      }
      setError(errors.join("\n"));
      setBusy(false);
      setImportProgress(null);
      resources.importing = null;
    }
  }

  const restoreSaved = useEffectEvent(
    async (data: StudioSessionData, originals: Map<string, Blob>) => {
      const files = data.sources
        .filter((source) => source.kind !== "sample")
        .map(
          (source) =>
            new File([originals.get(source.id)!], source.name, {
              type: originals.get(source.id)!.type,
            }),
        );
      await importFiles(files, data);
    },
  );
  useEffect(() => {
    let cancelled = false;
    const epoch = storageEpoch.current;
    if (!storageScope && typeof indexedDB === "undefined") return;
    void (async () => {
      try {
        const saved = await sessionStore.load();
        if (cancelled || epoch !== storageEpoch.current) return;
        if (saved?.data.sources.length)
          await restoreSaved(saved.data, saved.originals);
        if (cancelled || epoch !== storageEpoch.current) return;
        storageReady.current = true;
        setSessionSave("저장됨");
        reportDocument();
      } catch (cause) {
        if (!cancelled && epoch === storageEpoch.current) {
          setSessionSave("복원 실패");
          setError(
            cause instanceof Error
              ? cause.message
              : "저장된 자료를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled && epoch === storageEpoch.current) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStore, storageScope, loadAttempt]);

  const sessionData = useMemo<StudioSessionData>(
    () => ({
      sources: sources.map(
        ({
          id,
          name,
          kind,
          pages,
          grade,
          level,
          gradeManual,
          pageRotations,
        }) => ({
          id,
          name,
          kind,
          pages,
          grade,
          level,
          gradeManual,
          pageRotations,
        }),
      ),
      crops: storedCrops,
      pageOrder,
      sourceId,
      pageNumber,
      activeCropId,
      inspectedPages,
      step,
      grade,
      level,
      completedPages: studioAi.pageJobs.filter(
        (job) => job.state === "complete" || job.state === "empty",
      ),
    }),
    [
      sources,
      storedCrops,
      pageOrder,
      sourceId,
      pageNumber,
      activeCropId,
      inspectedPages,
      step,
      grade,
      level,
      studioAi.pageJobs,
    ],
  );
  const sessionStatus =
    sessionSave === "저장됨" &&
    sources.length &&
    savedSessionData !== sessionData
      ? "저장 중"
      : sessionSave;

  useEffect(() => {
    if (!storageReady.current || restoring || importingBusy) return;
    const epoch = storageEpoch.current;
    let disposed = false;
    let started = false;
    const originals = new Map(
      sources
        .filter((source) => source.original)
        .map((source) => [source.id, source.original!]),
    );
    const save = () => {
      if (started || epoch !== storageEpoch.current) return;
      started = true;
      void sessionStore
        .save(sessionData, originals)
        .then(() => {
          if (!disposed && epoch === storageEpoch.current) {
            setSavedSessionData(sessionData);
            setSessionSave("저장됨");
            reportDocument();
          }
        })
        .catch((cause: unknown) => {
          if (!disposed && epoch === storageEpoch.current) {
            setSessionSave("저장 실패");
            setError(
              cause instanceof Error
                ? cause.message
                : "자료 저장 공간을 확인해 주세요.",
            );
          }
        });
    };
    latestSave.current = save;
    const timer = window.setTimeout(save, 400);
    window.addEventListener("pagehide", save);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", save);
    };
  }, [
    sources,
    sessionData,
    restoring,
    importingBusy,
    sessionStore,
    storageVersion,
  ]);

  useEffect(() => {
    sessionStore.retain();
    return () => {
      latestSave.current?.();
      sessionStore.release();
    };
  }, [sessionStore]);

  useEffect(() => {
    if (sessionStatus !== "저장 중" && sessionStatus !== "저장 실패") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [sessionStatus]);

  const { requestSave: saveLibrary, dialog: saveDialog } =
    useLibrarySaveConfirmation(
      branchId,
      "extraction",
      async (sharing) => {
        if (!storageReady.current || restoring || importingBusy) return false;
        setSessionSave("저장 중");
        try {
          await sessionStore.save(
            sessionData,
            new Map(
              sources
                .filter((source) => source.original)
                .map((source) => [source.id, source.original!]),
            ),
            sharing,
          );
          onDocumentChange?.(sessionStore.documentId);
          setSessionSave("저장됨");
          return true;
        } catch (cause) {
          setSessionSave("저장 실패");
          setError(
            cause instanceof Error
              ? cause.message
              : "자료를 저장하지 못했습니다.",
          );
          throw cause;
        }
      },
      sessionStore.sharedBranchId === branchId
        ? sessionStore.visibility
        : "private",
    );

  async function startOver() {
    if (storageScope) {
      storageEpoch.current += 1;
      storageReady.current = false;
      setRestoring(true);
      setSessionSave("저장 중");
      try {
        await sessionStore.save(
          sessionData,
          new Map(
            sources
              .filter((source) => source.original)
              .map((source) => [source.id, source.original!]),
          ),
        );
        await sessionStore.clear();
        onDocumentChange?.(sessionStore.documentId);
      } catch (cause) {
        storageReady.current = true;
        setRestoring(false);
        setSessionSave("저장 실패");
        setError(
          cause instanceof Error
            ? cause.message
            : "자료를 저장하지 못했습니다. 다시 시도해 주세요.",
        );
        return;
      }
    }
    storageEpoch.current += 1;
    const epoch = storageEpoch.current;
    storageReady.current = false;
    setRestoring(false);
    setSessionSave("저장 중");
    void (storageScope ? Promise.resolve() : sessionStore.clear())
      .then(() => {
        if (epoch === storageEpoch.current) {
          storageReady.current = true;
          setStorageVersion((version) => version + 1);
          setSessionSave("저장됨");
        }
      })
      .catch((cause: unknown) => {
        if (epoch === storageEpoch.current) {
          setSessionSave("저장 실패");
          setError(
            cause instanceof Error
              ? cause.message
              : "이전 자료 삭제를 완료하지 못했습니다.",
          );
        }
      });
    studioAi.cancel(true);
    releaseSession(session.current);
    // A queued external import belongs to the workspace being discarded, too.
    if (importRequest) handledImport.current = importRequest.id;
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    if (
      pointerId !== undefined &&
      surface.current?.hasPointerCapture(pointerId)
    )
      surface.current.releasePointerCapture(pointerId);
    if (fileInput.current) fileInput.current.value = "";
    setSources([]);
    setOrderHistory(createPageOrderHistory([]));
    setPreviews({});
    previewCache.current.clear();
    previewController.current?.abort();
    previewRequests.current.clear();
    previewRetries.current = null;
    autoAnalyzeSources.current.clear();
    analyzedPages.current.clear();
    manualOutPages.current.clear();
    setOrderToast("");
    setImportProgress(null);
    setSourceId("");
    setPageNumber(1);
    setRendered(null);
    setSelection(null);
    setCrops([]);
    setActiveCropId("");
    setSelectedBoxId("");
    setCropTool("add-problem");
    setInspectedPages({});
    setStep("upload");
    setLevel("secondary");
    setGrade("미지정");
    setZoom(100);
    setBusy(false);
    setDragOver(false);
    setError("");
    setNotice("");
    setInspectorOpen(true);
    setCoordinatesOpen(false);
    setFocusMode(false);
    setViewportSize({ width: 0, height: 0 });
    setRestartOpen(false);
    setFigureEditor(null);
  }

  function requestStartOver() {
    if (
      sources.length ||
      crops.length ||
      selection ||
      session.current.importing
    )
      setRestartOpen(true);
    else startOver();
  }

  const importRequested = useEffectEvent((files: File[]) => {
    void importFiles(files);
  });
  useEffect(() => {
    if (!importRequest || handledImport.current === importRequest.id || busy)
      return;
    handledImport.current = importRequest.id;
    importRequested(importRequest.files);
  }, [importRequest, busy]);

  const reopenRequested = useEffectEvent(async (snapshots: StudioCrop[]) => {
    const generation = session.current.generation;
    setBusy(true);
    setError("");
    try {
      const restoredCrops: StudioCrop[] = [];
      const restoredSources: StudioSource[] = [];
      for (const snapshot of snapshots) {
        const existing = storedCrops.find((crop) => crop.id === snapshot.id);
        if (existing) {
          restoredCrops.push(existing);
          continue;
        }
        if (sources.some((source) => source.id === snapshot.sourceId)) {
          restoredCrops.push(structuredClone(snapshot));
          continue;
        }
        // A portable worksheet contains the original problem crop, not the full PDF.
        const canvas = await studioImageCanvas(snapshot.image);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (value) =>
              value
                ? resolve(value)
                : reject(new Error("저장된 원본 이미지를 읽지 못했습니다.")),
            "image/png",
          ),
        );
        if (!mounted.current || generation !== session.current.generation)
          return;
        const id = crypto.randomUUID();
        const name = `${snapshot.sourceLabel} · ${snapshot.page}쪽 문제`;
        const rect = snapshot.rect;
        const restored: StudioCrop = {
          ...structuredClone(snapshot),
          sourceId: id,
          sourceLabel: name,
          page: 1,
          rect: { x: 0, y: 0, width: 1, height: 1 },
          sourceSize: { width: canvas.width, height: canvas.height },
          sourceWidthMm: snapshot.sourceWidthMm
            ? snapshot.sourceWidthMm * rect.width
            : undefined,
          figures: snapshot.figures?.map((figure) => ({
            ...figure,
            rect: {
              x: clamp((figure.rect.x - rect.x) / rect.width),
              y: clamp((figure.rect.y - rect.y) / rect.height),
              width: clamp(figure.rect.width / rect.width),
              height: clamp(figure.rect.height / rect.height),
            },
          })),
        };
        restoredSources.push({
          id,
          name,
          kind: "image",
          pages: 1,
          grade: snapshot.grade,
          level: snapshot.level,
          gradeManual: true,
          image: canvas,
          original: new File([blob], `${name}.png`, { type: "image/png" }),
        });
        restoredCrops.push(restored);
      }
      if (!mounted.current || generation !== session.current.generation) return;
      setSources((previous) => [...previous, ...restoredSources]);
      setCrops((previous) => [
        ...previous,
        ...restoredCrops.filter(
          (crop) => !previous.some((item) => item.id === crop.id),
        ),
      ]);
      const first = restoredCrops[0];
      if (first) {
        setSourceId(first.sourceId);
        setPageNumber(first.page);
        setActiveCropId(first.id);
        setSelectedBoxId(first.id);
        setGrade(first.grade);
        setLevel(first.level);
        setStep("review");
        setInspectorOpen(true);
        setNotice("저장한 문제의 원본과 검수 내용을 열었습니다.");
      }
    } catch (cause) {
      if (mounted.current && generation === session.current.generation)
        setError(
          cause instanceof Error
            ? cause.message
            : "저장한 문제를 열지 못했습니다.",
        );
    } finally {
      if (mounted.current && generation === session.current.generation)
        setBusy(false);
    }
  });
  useEffect(() => {
    if (!restoreRequest || handledRestore.current === restoreRequest.id || busy)
      return;
    handledRestore.current = restoreRequest.id;
    void reopenRequested(restoreRequest.crops);
  }, [restoreRequest, busy]);

  function loadSample() {
    if (busy) return;
    const existing = sources.find((item) => item.kind === "sample");
    if (existing) {
      chooseSource(existing.id);
      return;
    }
    try {
      const sample: StudioSource = {
        id: crypto.randomUUID(),
        name: "오늘 수학 · 연습용 예제",
        kind: "sample",
        pages: 1,
        image: drawStudioSample(),
      };
      setSources((previous) => [...previous, sample]);
      chooseSource(sample.id);
      setNotice(
        "브라우저에서 그린 예제입니다. 원하는 문제를 드래그해 잘라 보세요.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "예제를 열 수 없습니다.",
      );
    }
  }

  function pointAt(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const parent = cropTool === "add-figure" ? activeCrop?.rect : undefined;
    return {
      x: clamp(
        (event.clientX - bounds.left) / bounds.width,
        parent?.x ?? 0,
        parent ? parent.x + parent.width : 1,
      ),
      y: clamp(
        (event.clientY - bounds.top) / bounds.height,
        parent?.y ?? 0,
        parent ? parent.y + parent.height : 1,
      ),
    };
  }

  function beginCrop(event: PointerEvent<HTMLDivElement>) {
    if (
      recognizingPage ||
      (cropTool !== "add-problem" && cropTool !== "add-figure") ||
      !pageReady ||
      event.button !== 0 ||
      !event.isPrimary
    )
      return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointAt(event);
    drag.current = { ...point, pointerId: event.pointerId };
    setSelection({ ...point, width: 0, height: 0 });
    setStep("crop");
  }

  function moveCrop(event: PointerEvent<HTMLDivElement>) {
    if (
      recognizingPage ||
      (cropTool !== "add-problem" && cropTool !== "add-figure") ||
      !drag.current ||
      drag.current.pointerId !== event.pointerId
    )
      return;
    setSelection(studioRectBetween(drag.current, pointAt(event)));
  }

  function endCrop(event: PointerEvent<HTMLDivElement>) {
    if (
      recognizingPage ||
      !drag.current ||
      drag.current.pointerId !== event.pointerId
    )
      return;
    const next = studioRectBetween(drag.current, pointAt(event));
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (
      next.width < 0.005 &&
      next.height < 0.005 &&
      cropTool === "add-problem"
    ) {
      const crop = pageCrops.find(
        (crop) =>
          next.x >= crop.rect.x &&
          next.x <= crop.rect.x + crop.rect.width &&
          next.y >= crop.rect.y &&
          next.y <= crop.rect.y + crop.rect.height,
      );
      if (crop) {
        selectBox(crop.id);
        setCropTool("select");
        return;
      }
    }
    saveCrop(next);
  }

  function cancelSelection() {
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    setSelection(null);
    if (
      pointerId !== undefined &&
      surface.current?.hasPointerCapture(pointerId)
    )
      surface.current.releasePointerCapture(pointerId);
  }

  function saveCrop(rect: StudioRect | null = selection) {
    const pixels =
      rect && rendered
        ? studioPixelRect(rect, rendered.canvas.width, rendered.canvas.height)
        : null;
    if (
      recognizingPage ||
      !rect ||
      !rendered ||
      !currentSource ||
      !pixels ||
      pixels.width < 8 ||
      pixels.height < 8
    )
      return;
    try {
      if (cropTool === "add-figure") {
        if (
          !activeCrop ||
          activeCrop.sourceId !== sourceId ||
          activeCrop.page !== pageNumber
        )
          return;
        const figure = {
          id: crypto.randomUUID(),
          rect: { ...rect },
          image: studioCropImage(rendered.canvas, rect),
        };
        updateCrop({ figures: [...(activeCrop.figures ?? []), figure] });
        setSelectedBoxId(figure.id);
        setSelection(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("문제 이미지를 만들 수 없습니다.");
      ctx.drawImage(
        rendered.canvas,
        pixels.x,
        pixels.y,
        pixels.width,
        pixels.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const crop: StudioCrop = {
        id: crypto.randomUUID(),
        sourceId,
        sourceLabel: currentSource.name,
        page: pageNumber,
        rect: { ...rect },
        image: canvas.toDataURL("image/png"),
        content: "",
        answer: "",
        solution: "",
        level,
        grade,
        mode: "image",
        sourceSize: {
          width: rendered.canvas.width,
          height: rendered.canvas.height,
        },
      };
      setCrops((previous) => [...previous, crop]);
      setActiveCropId(crop.id);
      setSelectedBoxId(crop.id);
      setSelection(null);
      setError("");
      setNotice("문제를 잘랐습니다. 원본을 보며 내용을 검수해 주세요.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "문제를 자를 수 없습니다.",
      );
    }
  }

  function keyboardCrop(event: KeyboardEvent<HTMLDivElement>) {
    if (recognizingPage) return;
    if (event.key === "Escape") {
      if (selection || drag.current) event.preventDefault();
      cancelSelection();
      return;
    }
    if (cropTool !== "add-problem" && cropTool !== "add-figure") return;
    if (event.key === "Enter") {
      event.preventDefault();
      saveCrop();
      return;
    }
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    event.preventDefault();
    const delta = event.shiftKey ? 0.02 : 0.005;
    setSelection((previous) => {
      const bounds =
        cropTool === "add-figure" && activeCrop
          ? activeCrop.rect
          : { x: 0, y: 0, width: 1, height: 1 };
      const rect =
        previous ??
        (cropTool === "add-figure"
          ? {
              x: bounds.x + bounds.width * 0.2,
              y: bounds.y + bounds.height * 0.2,
              width: bounds.width * 0.6,
              height: bounds.height * 0.6,
            }
          : { x: 0.08, y: 0.15, width: 0.84, height: 0.2 });
      return {
        ...rect,
        x: clamp(
          rect.x +
            (event.key === "ArrowRight"
              ? delta
              : event.key === "ArrowLeft"
                ? -delta
                : 0),
          bounds.x,
          bounds.x + bounds.width - rect.width,
        ),
        y: clamp(
          rect.y +
            (event.key === "ArrowDown"
              ? delta
              : event.key === "ArrowUp"
                ? -delta
                : 0),
          bounds.y,
          bounds.y + bounds.height - rect.height,
        ),
      };
    });
  }

  function adjustSelection(key: keyof StudioRect, value: number) {
    if (recognizingPage || !Number.isFinite(value)) return;
    setSelection((previous) => {
      if (!previous) return previous;
      const next = { ...previous, [key]: clamp(value / 100) };
      if (key === "x" || key === "y") {
        next.x = clamp(next.x, 0, 1 - next.width);
        next.y = clamp(next.y, 0, 1 - next.height);
      } else {
        next.width = clamp(next.width, 0.001, 1 - next.x);
        next.height = clamp(next.height, 0.001, 1 - next.y);
      }
      return cropTool === "add-figure" && activeCrop
        ? intersectRect(next, activeCrop.rect)
        : next;
    });
  }

  function intersectRect(
    rect: StudioRect,
    bounds: StudioRect,
  ): StudioRect | null {
    const x = Math.max(rect.x, bounds.x);
    const y = Math.max(rect.y, bounds.y);
    const right = Math.min(rect.x + rect.width, bounds.x + bounds.width);
    const bottom = Math.min(rect.y + rect.height, bounds.y + bounds.height);
    return right > x && bottom > y
      ? { x, y, width: right - x, height: bottom - y }
      : null;
  }

  function chooseTool(tool: typeof cropTool) {
    if (recognizingPage) return;
    cancelSelection();
    setCropTool(tool);
    setStep("crop");
    if (tool === "add-figure" && activeCrop) {
      if (activeCrop.sourceId !== sourceId || activeCrop.page !== pageNumber) {
        chooseSource(activeCrop.sourceId, activeCrop.page);
      }
      setSelectedBoxId(activeCrop.id);
    }
  }

  function commitBox(id: string, rect: StudioRect) {
    if (!pageReady || !rendered || recognizingPage) return;
    const crop = pageCrops.find(
      (item) =>
        item.id === id || item.figures?.some((figure) => figure.id === id),
    );
    if (!crop) return;
    try {
      const problemRect = crop.id === id ? rect : crop.rect;
      const figures = (crop.figures ?? []).flatMap((figure) => {
        const bounded = intersectRect(
          figure.id === id ? rect : figure.rect,
          problemRect,
        );
        if (!bounded) return [];
        const pixels = studioPixelRect(
          bounded,
          rendered.canvas.width,
          rendered.canvas.height,
        );
        return pixels.width >= 8 && pixels.height >= 8
          ? [
              {
                ...figure,
                rect: bounded,
                ...(JSON.stringify(bounded) === JSON.stringify(figure.rect)
                  ? {}
                  : {
                      image: studioCropImage(rendered.canvas, bounded),
                      originalImage: undefined,
                      svg: undefined,
                      spec: undefined,
                      engine: undefined,
                      figureReview: undefined,
                    }),
              },
            ]
          : [];
      });
      const image = studioCropImage(rendered.canvas, problemRect);
      setCrops((previous) =>
        previous.map((item) =>
          item.id === crop.id
            ? {
                ...item,
                rect: problemRect,
                image,
                ...retainStudioFigures(item, figures),
                sourceSize: {
                  width: rendered.canvas.width,
                  height: rendered.canvas.height,
                },
                reviewed: false,
                revision: (item.revision ?? 0) + 1,
              }
            : item,
        ),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "영역을 수정하지 못했습니다.",
      );
    }
  }

  function selectBox(id: string) {
    const crop = pageCrops.find(
      (item) =>
        item.id === id || item.figures?.some((figure) => figure.id === id),
    );
    if (!crop || recognizingPage) return;
    selectCrop(crop.id);
    setSelectedBoxId(id);
  }

  function deleteBox(id: string) {
    if (recognizingPage) return;
    const crop = crops.find(
      (item) =>
        item.id === id || item.figures?.some((figure) => figure.id === id),
    );
    if (!crop) return;
    // 모든 삭제 길(페이지 위 ×·Delete 키·지우기 도구·검사 칸 휴지통·도형 ×)이 여기로 모인다.
    // 취소하면 선택 상태까지 그대로 둔다 — 그래서 무엇이든 바꾸기 전에 묻는다.
    const warning = studioDeleteWarning(crops, id);
    if (warning && !window.confirm(warning)) return;
    if (crop.id === id) {
      const index = crops.indexOf(crop);
      const next = crops[index + 1] ?? crops[index - 1];
      setCrops((previous) => previous.filter((item) => item.id !== id));
      if (activeCropId === id) {
        setActiveCropId(next?.id ?? "");
        setSelectedBoxId(next?.id ?? "");
        if (!next) setStep(currentSource ? "crop" : "upload");
      }
      if (cartState(crop) === "picked" || cartState(crop) === "stale")
        setNotice(
          "원본 작업에서 삭제했습니다. 이미 담은 문항은 내 시험지에서 관리해 주세요.",
        );
    } else {
      setCrops((previous) =>
        previous.map((item) =>
          item.id === crop.id
            ? {
                ...item,
                ...retainStudioFigures(
                  item,
                  (item.figures ?? []).filter((figure) => figure.id !== id),
                ),
                reviewed: false,
                revision: (item.revision ?? 0) + 1,
              }
            : item,
        ),
      );
      setSelectedBoxId(crop.id);
    }
    cancelSelection();
  }

  function updateCrop(patch: Partial<StudioCrop>) {
    updateCropById(activeCropId, patch);
  }

  function updateCropById(id: string, patch: Partial<StudioCrop>) {
    if (!crops.some((crop) => crop.id === id)) return;
    setCrops((previous) =>
      previous.map((crop) =>
        crop.id === id ? applyStudioCropEdit(crop, patch) : crop,
      ),
    );
    // 검수 완료·취소는 상태라 판을 안 올린다(«담음» 그대로). 시험지 판이 이 판과 같으면 상태만 같이
    // 적어 둔다 — ④ «원본 편집»으로 이 문항을 다시 열 때 검수 상태가 되살아나게.
    const crop = crops.find((item) => item.id === id);
    if (crop && studioCropStatusOnly(patch) && cartState(crop) === "picked")
      cart.add([studioProblem(applyStudioCropEdit(crop, patch))]);
  }

  function selectCrop(id: string) {
    const crop = crops.find((item) => item.id === id);
    if (!crop || studioAi.isPageBusy(crop.sourceId, crop.page)) return;
    cancelSelection();
    setActiveCropId(id);
    setSelectedBoxId(id);
    setCropTool("select");
    setLevel(crop.level);
    setGrade(crop.grade);
    if (crop.sourceId !== sourceId || crop.page !== pageNumber) {
      setSourceId(crop.sourceId);
      setPageNumber(crop.page);
    }
  }

  function inspectPage() {
    if (!pageCrops.length || !pageReady || recognizingPage) return;
    setInspectedPages((previous) => ({
      ...previous,
      [pageKey]: pageSignature,
    }));
    if (currentPageIndex >= 0 && currentPageIndex < livePages.length - 1) {
      const next = livePages[currentPageIndex + 1];
      chooseSource(next.sourceId, next.page);
    } else {
      selectCrop(pageCrops[0].id);
      // 다른 쪽이나 도형이 아직 도는 동안에는 넘기지 않는다 — 아래 막대 단추로 넘어간다.
      if (!studioAi.running) setStep("review");
    }
  }

  function changeSourceGrade(value: string) {
    if (!currentSource || sourceRecognizing) return;
    const manual = value !== "auto";
    const nextGrade = manual
      ? value
      : resolveStudioGrade(
          { ...currentSource, gradeManual: false, grade: undefined },
          sourceJobs,
        ).grade;
    const nextLevel = studioGradeLevel(nextGrade);
    setLevel(nextLevel);
    setGrade(nextGrade ?? "미지정");
    setSources((previous) =>
      previous.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              grade: nextGrade,
              level: nextLevel,
              gradeManual: manual,
            }
          : source,
      ),
    );
    setCrops((previous) =>
      previous.map((crop) =>
        livePageKeys.has(studioPageKey(crop)) &&
        crop.sourceId === sourceId &&
        crop.grade !== (nextGrade ?? "미지정")
          ? {
              ...crop,
              grade: nextGrade ?? "미지정",
              level: nextLevel,
              reviewed: false,
              revision: (crop.revision ?? 0) + 1,
            }
          : crop,
      ),
    );
  }

  function recognizeSource(allPages = true) {
    if (!currentSource) return;
    const pages = allPages
      ? livePages
      : livePages.filter(
          (page) => page.sourceId === sourceId && page.page === pageNumber,
        );
    const tasks: StudioAiPageTask[] = pages.map(({ sourceId: id, page }) => {
      const source = sources.find((item) => item.id === id)!;
      return {
        sourceId: id,
        sourceLabel: source.name,
        page,
        grade: source.gradeManual ? (source.grade ?? "미지정") : "미지정",
        level: source.level ?? level,
        load: (signal, extraRotation = 0) =>
          renderAiPage(source, page, signal, extraRotation),
      };
    });
    void studioAi.recognizePages(tasks, {
      force: !allPages || livePages.length === 1,
    });
  }

  /** Every composition entry appends pending crops without replacing the existing worksheet. */
  function addProblems(exportAfter = false) {
    if (exportAfter && !canExport) return;
    if (compositionBlocked) return;
    if (!crops.length && !exportAfter) return;
    cart.syncPageOrder();
    // 뺀 것은 건너뛴다 — 원장님 2026-09-21 확정 «안 넣는다». 뺀 것은 목록의 «다시 담기»로만.
    if (pendingCrops.length) {
      cart.add(pendingCrops.map(studioProblem));
      setNotice(`${pendingCrops.length}문항을 내 시험지에 담았습니다.`);
    }
    if (exportAfter && (cart.picked.length || pendingCrops.length)) {
      setFocusMode(false);
      onExport();
    }
  }

  const handleExportRequest = useEffectEvent(() => addProblems(true));
  useEffect(() => {
    if (
      !exportRequest ||
      handledExport.current === exportRequest.id ||
      !active ||
      compositionBlocked
    )
      return;
    handledExport.current = exportRequest.id;
    handleExportRequest();
  }, [exportRequest, active, compositionBlocked]);

  /** 카드의 «반영» — 담은 뒤 고친 문항의 새 판을 시험지의 같은 자리에 갈아 넣는다. */
  function reflectCrop(id: string) {
    const crop = crops.find((item) => item.id === id);
    if (!crop || cartState(crop) !== "stale") return;
    cart.add([studioProblem(crop)]);
    setNotice("고친 내용을 시험지에 반영했습니다.");
  }

  /** 목록 줄의 × — 시험지에서 뺀다. 작업실 문항은 그대로 남는다. */
  function removeFromCart(problem: StudioProblem) {
    cart.remove(problem);
    setNotice("시험지에서 문제를 뺐습니다.");
  }

  /** 목록 머리의 «모두 빼기» — 시험지 전체를 뺀다. 뺀 줄은 흐리게 남아 하나씩 «다시 담기»로 돌린다. */
  function removeAllFromStudioCart() {
    const count = cart.picked.length;
    if (!count) return;
    cart.removeAll();
    setNotice(`시험지에서 ${count}문항을 모두 뺐습니다.`);
  }

  /** 목록 줄의 «다시 담기» — 작업실에 그 문항이 있으면 지금 판을, 없으면 뺄 때의 판을 되돌린다. */
  function restoreToCartFromStudio(problem: StudioProblem) {
    const crop = crops.find((item) => item.id === problem.id);
    cart.restore(crop ? studioProblem(crop) : problem);
    setNotice("문제를 다시 담았습니다.");
  }

  function digitizeAll() {
    setStep("review");
    setCrops((previous) =>
      previous.map((crop) =>
        livePageKeys.has(studioPageKey(crop)) &&
        crop.content.trim() &&
        !crop.modeManual &&
        crop.mode !== "text"
          ? // 출력 방식이 바뀌면 시험지에 실리는 것이 바뀐다 — 판을 올려 «고친 뒤 반영 전»이 보이게.
            {
              ...crop,
              mode: "text",
              reviewed: false,
              revision: (crop.revision ?? 0) + 1,
            }
          : crop,
      ),
    );
    void studioAi.processCrops(
      "ocr",
      crops.filter((crop) => !crop.content.trim()).map((crop) => crop.id),
    );
    void studioAi.figureAi.run(
      crops.filter((crop) => crop.content.trim()).map((crop) => crop.id),
    );
  }
  const figureJobs = studioAi.figureAi?.jobs ?? [];
  const figurePending = figureJobs.filter((job) =>
    ["queued", "running"].includes(job.state),
  );
  // 실패는 어느 칸에도 안 들어가 분모에서만 사라졌다(2+2+0 인데 총 5) — 따로 센다.
  const failedFigures = figureJobs.filter((job) => job.state === "error");
  const doneFigures = figureJobs.filter(
    (job) => job.state === "complete",
  ).length;
  const digitalCount = crops.filter(studioCropDigitized).length;
  /*
   * 원장님 2026-09-20 «전체 해설 생성. 순서대로 해설 생성» — 목록 차례대로 보낸다.
   * 이미 해설이 있으면 건너뛰고, 검수 완료된 문항은 건드리지 않는다(검수 완료 잠금과 같은 규칙).
   * 본문이 없으면 보낼 것이 없다 — 한 문항 «해설 생성» 도 그때 안 눌린다.
   * 줄 세우기·진행·취소·실패는 `studioAi.processCrops` 가 이미 하던 그대로 쓴다.
   */
  const solutionTargets = crops.filter(
    (crop) =>
      !crop.solution.trim() && !crop.reviewed && Boolean(crop.content.trim()),
  );
  // 다음 단계로 넘어가기 전에 남은 일. 실패·취소는 studioAi.running 에 없으므로 여기서 멈추지 않는다.
  const busyPages =
    studioAi.pageProgress.queued + studioAi.pageProgress.running;
  const busyCrops = (studioAi.cropJobs ?? []).filter((job) =>
    ["queued", "running"].includes(job.state),
  ).length;
  const remainingLabel = [
    busyPages ? `${busyPages}쪽` : "",
    busyCrops ? `문항 ${busyCrops}개` : "",
    figurePending.length ? `도형 ${figurePending.length}개` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const detectedGrade = currentSource
    ? resolveStudioGrade(currentSource, sourceJobs)
    : undefined;
  const selectedGrade = currentSource?.gradeManual
    ? currentSource.grade
    : "auto";
  /*
   * 안 A(원장님 2026-09-21 확정) — 제목 줄은 네 단계가 똑같고, 단계별 도구는 **모두 둘째 줄**이다.
   * 파일·학년도 그 줄로 내려왔다(전에는 검수 단계만 제목 줄에 있었다).
   * 둘째 줄은 캔버스 칸 «밖» 전폭에 선다 — 안에 두면 검수 패널만큼 좁아져 ②만 먼저 꺾였다
   * (실측 1516px: 캔버스 안 1170px vs 전폭 1490px).
   */
  const toolRowShown =
    Boolean(currentSource) && (step === "crop" || step === "review");
  /*
   * 학년은 자동 인식이 서면 조용히 둔다(원장님 2026-09-21 «확인 필요할 때만 드러내기»).
   * 고칠 길은 어느 상태에서도 남는다 — 학년은 문항에 저장되는 실제 데이터이고(대분수 표시·출제
   * 조건이 이것을 본다) 자동 인식이 틀렸을 때 고칠 자리가 여기뿐이다.
   */
  const gradeState = detectedGrade?.needsReview ? "review" : "quiet";
  // 쪽 이동 — 잘라내기는 제목 줄에, 검수는 문제 이동과 같은 둘째 줄에 선다.
  const pageNavigation = currentSource ? (
    <div className={styles.pageTools} data-studio-page-tools>
      <button
        type="button"
        className={styles.pageNavigationButton}
        aria-label="이전 페이지"
        disabled={currentPageIndex <= 0}
        onClick={() => {
          const page = livePages[currentPageIndex - 1];
          if (page) chooseSource(page.sourceId, page.page);
        }}
      >
        이전 쪽
      </button>
      <label>
        <span className={styles.srOnly}>페이지</span>
        <select
          aria-label="페이지 선택"
          value={currentPageIndex}
          onChange={(event) => {
            const page = livePages[Number(event.target.value)];
            if (page) chooseSource(page.sourceId, page.page);
          }}
        >
          {livePages.map((page, index) => (
            <option key={studioPageKey(page)} value={index}>
              새 {index + 1}쪽 ·{" "}
              {sources.find((source) => source.id === page.sourceId)?.name} 원본{" "}
              {page.page}쪽
            </option>
          ))}
        </select>
        <span>/ {livePages.length}</span>
      </label>
      <button
        type="button"
        className={styles.pageNavigationButton}
        aria-label="다음 페이지"
        disabled={
          currentPageIndex < 0 || currentPageIndex >= livePages.length - 1
        }
        onClick={() => {
          const page = livePages[currentPageIndex + 1];
          if (page) chooseSource(page.sourceId, page.page);
        }}
      >
        다음 쪽
      </button>
      {/*
        회전은 **잘라내기 단계에만** 둔다(원장님 2026-09-21 «OCR 단계에서 '페이지 회전'이 왜
        필요한가? 필요없음»). 근거는 `rotateCurrentPage` 에 있다 — 이 쪽의 영역과 인식 결과를
        지우고 잘라내기 단계로 되돌린다. 검수 화면에서 누르면 검수하러 온 그것을 버린다.
      */}
      {step === "crop" && (
        <>
          <span className={styles.divider} />
          <button
            type="button"
            className={styles.pageNavigationButton}
            aria-label="현재 페이지 90도 회전"
            onClick={rotateCurrentPage}
            disabled={!pageReady || busy || studioAi.running}
          >
            회전
          </button>
        </>
      )}
      {step === "crop" && (
        <select
          aria-label="원본 확대 비율"
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
        >
          <option value={0}>전체 보기</option>
          <option value={75}>75%</option>
          <option value={100}>너비 맞춤</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
          <option value={200}>200%</option>
        </select>
      )}
    </div>
  ) : null;
  /*
   * 전체 작업 셋 — 원장님 2026-09-21 «전체 페이지 자동 인식, 전체 디지털화, 전체 해설 생성은
   * 같은 행에». 잘라내기는 제목 줄, 검수는 둘째 줄에 함께 선다. 제목 줄에 두면 1516px 에서
   * 줄이 꺾여(잰 값 94px) 파일 이름에 줄 자리가 없어진다 — 쪽 이동과 같은 줄로 내렸다.
   * 상단의 «AI 연결» 칸은 없앴고(왼쪽 탭의 AI 상태판이 그 일을 한다), 그 안에 있던
   * «현재 쪽만 다시 인식»은 이 묶음에 남긴다.
   */
  const bulkActions = currentSource ? (
    <div className={styles.bulkActions} data-studio-bulk>
      <button
        type="button"
        className={`${styles.secondaryButton} ${styles.pageAiButton}`}
        disabled={
          !pageReady || !studioAi.available || sourceRecognizing || busy
        }
        title="전체 페이지를 대기열에 넣어 최대 2쪽씩 인식합니다. 기존 영역은 유지합니다."
        aria-busy={sourceRecognizing}
        onClick={() => recognizeSource()}
      >
        {livePages.length > 1 ? "전체 페이지 자동 인식" : "페이지 자동 인식"}
      </button>
      {livePages.length > 1 ? (
        <button
          type="button"
          className={styles.secondaryButton}
          aria-label={`현재 ${pageNumber}쪽만 다시 인식`}
          disabled={!pageReady || recognizingPage || !studioAi.available}
          onClick={() => recognizeSource(false)}
        >
          이 쪽 다시 인식
        </button>
      ) : null}
      {step === "review" ? (
        <>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!studioAi.available || !crops.length}
            onClick={digitizeAll}
          >
            전체 디지털화
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={!studioAi.available || !solutionTargets.length}
            title={
              solutionTargets.length
                ? undefined
                : "해설이 없는 문항이 없습니다."
            }
            onClick={() =>
              void studioAi.processCrops(
                "solution",
                solutionTargets.map((crop) => crop.id),
              )
            }
          >
            전체 해설 생성
          </button>
        </>
      ) : null}
    </div>
  ) : null;
  /** 문제 이동 — 검수 단계의 둘째 줄에만 선다. */
  const cropNavigation = activeCrop ? (
    <>
      <span className={styles.divider} />
      <button
        type="button"
        className={styles.secondaryButton}
        aria-label="이전 문제 검수"
        disabled={activeCropIndex <= 0 || recognizingPage}
        onClick={() => selectCrop(crops[activeCropIndex - 1].id)}
      >
        이전 문제
      </button>
      <strong>
        문제 {activeCropIndex + 1} <span>/ {crops.length}</span>
      </strong>
      <button
        type="button"
        className={styles.secondaryButton}
        aria-label="다음 문제 검수"
        disabled={activeCropIndex >= crops.length - 1 || recognizingPage}
        onClick={() => selectCrop(crops[activeCropIndex + 1].id)}
      >
        다음 문제
      </button>
    </>
  ) : null;
  const sourceToolbar = (
    <>
      <div className={styles.sourcePicker} data-studio-band-tools>
        <Icon name="file" />
        {sources.length ? (
          <select
            aria-label="원본 파일"
            title={currentSource?.name}
            value={sourceId}
            onChange={(event) => chooseSource(event.target.value)}
          >
            {sources.map((source) => (
              <option
                key={source.id}
                value={source.id}
                disabled={
                  !livePages.some((page) => page.sourceId === source.id)
                }
              >
                {source.name}
              </option>
            ))}
          </select>
        ) : (
          <span>원본 지면</span>
        )}
      </div>
      {currentSource ? (
        <label
          className={styles.sourceGrade}
          data-grade={gradeState}
          title={detectedGrade?.evidence ?? "이 파일의 모든 문제에 적용"}
        >
          <span className={gradeState === "quiet" ? styles.srOnly : undefined}>
            학년
          </span>
          <select
            aria-label="시험지 학년"
            value={selectedGrade}
            disabled={sourceRecognizing}
            onChange={(event) => changeSourceGrade(event.target.value)}
          >
            <option value="auto">
              {detectedGrade?.needsReview
                ? "학년 확인 필요"
                : (detectedGrade?.grade ?? "자동 인식")}
            </option>
            <optgroup label="초등">
              {STUDIO_GRADES.elementary.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </optgroup>
            <optgroup label="중·고등">
              {STUDIO_GRADES.secondary.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      ) : null}
      {currentSource ? (
        <>
          {pageNavigation}
          {step === "review" && cropNavigation}
          <span className={styles.divider} />
          {bulkActions}
          {step === "crop" && (
            <button
              className={styles.preciseButton}
              type="button"
              onClick={() => {
                setStep("crop");
                setCropTool("add-problem");
                setSelection({
                  x: 0.08,
                  y: 0.15,
                  width: 0.84,
                  height: 0.2,
                });
                requestAnimationFrame(() =>
                  surface.current?.focus({ preventScroll: true }),
                );
              }}
              disabled={!pageReady || recognizingPage}
              aria-label="키보드로 영역 지정"
            >
              영역 지정
            </button>
          )}
        </>
      ) : (
        <span className={styles.toolbarMeta}>PDF · 이미지</span>
      )}
    </>
  );
  const progressStrip = (
    <StudioProgressStrip
      hasFeedback={!!studioAi.message || !!studioAi.error}
      summaries={[
        ...(activePageJobs.length
          ? [
              {
                id: "pages",
                label: studioWorkName("pages").short,
                done: activePageJobs.filter(
                  (job) => job.state === "complete" || job.state === "empty",
                ).length,
                total: activePageJobs.length,
                active: activePageJobs.some((job) =>
                  ["queued", "rendering", "running"].includes(job.state),
                ),
              },
            ]
          : []),
        ...(studioAi.progress
          ? [
              {
                id: "crops",
                label: studioWorkName(
                  studioCropWorkKind(studioAi.progress.action),
                ).short,
                done: studioAi.progress.done,
                total: studioAi.progress.total,
                active: true,
              },
            ]
          : []),
        ...(figureJobs.length
          ? [
              {
                id: "figures",
                label: studioWorkName("svg").short,
                done: doneFigures,
                total: figureJobs.length,
                active: figurePending.length > 0,
              },
            ]
          : []),
        // 검수 줄의 진행 요약 «도형 N/M · 디지털화 N/M» — 옛 디지털화 줄의 셈을 여기로 옮겼다.
        ...(step === "review" && crops.length
          ? [
              {
                id: "digital",
                label: studioWorkName("digital").short,
                done: digitalCount,
                total: crops.length,
                active: false,
              },
            ]
          : []),
      ]}
      warningCount={
        activePageJobs.reduce(
          (count, job) =>
            count +
            // 쪽당 한 줄로 요약하니 개수도 쪽 단위 — 공통 안내(자동 인식 후보)는 세지 않는다.
            Number(
              summarizePageWarnings(job.warnings ?? []).details.length > 0,
            ) +
            Number(!!job.textLayerWarning) +
            Number(job.state === "error"),
          0,
        ) +
        failedFigures.length +
        Number(!!studioAi.error)
      }
    >
      <StudioQueueStatus
        jobs={activePageJobs}
        startedAt={studioAi.pageProgress.startedAt ?? undefined}
        sources={sources}
        onCancel={() => studioAi.cancel()}
        onRetry={() => void studioAi.retryPages()}
        onNavigate={chooseSource}
      />
      {figurePending.length > 0 ? (
        <WorkProgress
          label={studioWorkName("svg").short}
          fullLabel={studioWorkName("svg").running}
          detail={studioFigureProgressDetail(
            crops,
            figurePending,
            failedFigures.length,
          )}
          completed={doneFigures}
          total={figureJobs.length}
          startedAt={figurePending.find((job) => job.startedAt)?.startedAt}
          onCancel={() => studioAi.figureAi.cancel()}
          cancelLabel="취소"
          cancelName={`${studioWorkName("svg").long} 취소`}
        />
      ) : failedFigures.length ? (
        <>
          <div className={styles.queueSummary} role="status">
            <strong>
              도형 {doneFigures} / {figureJobs.length} 완료 · 실패{" "}
              {failedFigures.length}개
            </strong>
            <button
              type="button"
              disabled={!studioAi.available || studioAi.running}
              onClick={() =>
                void studioAi.figureAi.run([
                  ...new Set(failedFigures.map((job) => job.cropId)),
                ])
              }
            >
              실패 {failedFigures.length}개 다시 생성
            </button>
          </div>
          {/*
            원장님 2026-09-20 «전부 완료인데 도형 2/4 이니까 어딘지 알 수가 없음» ·
            «실패한 문항을 누르면 그 문항 검수 창으로 이동» — 셈만 있던 자리에 이름을
            하나씩 적고, 누르면 검수 단계로 옮겨 그 문항을 고른다(`selectCrop`).
          */}
          <StudioFigureFailures
            items={studioFailedFigureItems(crops, failedFigures)}
            onSelect={(cropId) => {
              setStep("review");
              selectCrop(cropId);
            }}
          />
        </>
      ) : figureJobs.length ? (
        <div className={styles.queueSummary} role="status">
          <strong>
            도형 {doneFigures} / {figureJobs.length} 완료
          </strong>
          {figureJobs.some((job) => job.state === "cancelled") ? (
            <span>취소한 도형은 그림 편집에서 다시 생성할 수 있습니다.</span>
          ) : null}
        </div>
      ) : null}
      {currentPageJob?.state === "error" ? (
        <div className={styles.aiFeedback} role="alert">
          <span>
            {pageNumber}쪽 · {currentPageJob.error}
          </span>
          <button
            type="button"
            disabled={!studioAi.available}
            onClick={() => recognizeSource(false)}
          >
            이 페이지 재시도
          </button>
        </div>
      ) : null}
      {studioAi.progress ? (
        <WorkProgress
          label={
            studioWorkName(studioCropWorkKind(studioAi.progress.action)).short
          }
          fullLabel={
            studioWorkName(studioCropWorkKind(studioAi.progress.action)).running
          }
          completed={studioAi.progress.done}
          total={studioAi.progress.total}
          unit="문항"
          startedAt={studioAi.progress.startedAt}
          onCancel={() => studioAi.cancelCrop()}
          cancelLabel="취소"
          cancelName={`${
            studioWorkName(studioCropWorkKind(studioAi.progress.action)).long
          } 취소`}
        />
      ) : null}
      {!studioAi.progress && (studioAi.message || studioAi.error) ? (
        <div
          className={styles.aiFeedback}
          role={studioAi.error ? "alert" : "status"}
        >
          <span>{studioAi.error || studioAi.message}</span>
          {studioAi.error ? (
            <button
              type="button"
              disabled={!studioAi.available || studioAi.running}
              onClick={studioAi.retry}
            >
              다시 시도
            </button>
          ) : (
            <button
              type="button"
              aria-label="AI 결과 안내 닫기"
              onClick={() => studioAi.cancelCrop(true)}
            >
              ×
            </button>
          )}
        </div>
      ) : null}
    </StudioProgressStrip>
  );

  return (
    <section
      ref={studio}
      className={`${styles.studio} ${step === "order" ? styles.pageOrderMode : ""} ${editing ? styles.editing : ""} ${focusMode ? styles.focusMode : ""} ${!inspectorOpen ? styles.panelClosed : ""} ${step === "review" ? styles.reviewMode : ""}`}
      aria-label="문제 제작 스튜디오"
      style={
        chromeHeight
          ? ({
              "--studio-chrome-height": `${chromeHeight}px`,
            } as CSSProperties)
          : undefined
      }
      role={focusMode ? "dialog" : undefined}
      aria-modal={focusMode || undefined}
      onKeyDown={(event) => {
        if (
          !focusMode ||
          event.key !== "Tab" ||
          document.querySelector("dialog[open]")
        )
          return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      {/*
        자료 제작 네 단계의 제목 줄 — 원장님 2026-09-21 «4단계 헤더 구성 일치화 시킬것.
        각 단계에서 필요없는 헤더는 지울것. 단계마다 헤더 구조가 바뀌는 치명적인 ux 고칠것»
        → **안 A 확정**. 네 단계가 같은 띠를 쓰고, 단계별 도구는 아래 둘째 줄에 선다.
        전에 여기 있던 큰 제목(「내 자료로 만드는 문제」)·설명 줄·원형 체크 막대(.workflow)는
        없앴다 — 탭 넷이 그 일을 한다. 되살리지 말 것.
      */}
      <div className={styles.studioHeader} data-studio-header>
        <StudioStepBar
          step={step}
          cropCount={crops.length}
          pickedCount={
            cart.controlled
              ? cart.picked.length
              : (pickedCount ?? cart.picked.length)
          }
          canOrder={sources.length > 0 && !studioAi.running && !busy}
          canCrop={livePages.length > 0 && !busy && !studioAi.running}
          canReview={crops.length > 0}
          canExport={canExport && !compositionBlocked}
          canCompose={cart.picked.length + pendingCount > 0}
          onStep={(next) => {
            if (next === "export") {
              addProblems(true);
              return;
            }
            if (next === "crop" && step === "order") startOrderedPages();
            else setStep(next);
            if (next === "review") setInspectorOpen(true);
          }}
        >
          {step === "order" && (
            <>
              <button
                type="button"
                disabled={!orderHistory.past.length || busy || studioAi.running}
                onClick={undoOrder}
              >
                되돌리기
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  studioAi.running ||
                  JSON.stringify(pageOrder) ===
                    JSON.stringify(initialPageOrder(sources))
                }
                onClick={() =>
                  changeOrder(
                    initialPageOrder(sources),
                    "처음 차례로 돌렸습니다.",
                  )
                }
              >
                처음 차례로
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={busy || studioAi.running || !livePages.length}
                onClick={startOrderedPages}
              >
                이 순서로 시작 →
              </button>
            </>
          )}
          {step === "upload" ? (
            <>
              <button type="button" onClick={loadSample} disabled={busy}>
                <Icon name="file" />
                예제로 시작
              </button>
              {/*
              띠의 «파일 가져오기»는 지름길이다 — 이 단계의 본 자리(끌어 놓기 칸)에
              «내 컴퓨터에서 선택»이 그대로 있다. 그래서 채운 단추로 세우지 않는다
              (한 줄에 파란 단추 둘이 서지 않게 — 채운 단추는 «편집창 확대» 하나다).
            */}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
              >
                <Icon name="upload" />
                {busy ? busyLabel : "파일 가져오기"}
              </button>
            </>
          ) : null}
          <button
            hidden={step === "order"}
            ref={restartButton}
            type="button"
            onClick={requestStartOver}
          >
            <Icon name="restart" />
            새로 시작
          </button>
          {step === "crop" && (
            <button
              aria-pressed={inspectorOpen}
              aria-label={inspectorOpen ? "검수 패널 접기" : "검수 패널 열기"}
              onClick={() => setInspectorOpen((value) => !value)}
            >
              검수 패널
            </button>
          )}
          {/*
          ①에도 둔다(원장님 2026-09-21 확정) — 확대를 켠 채 «원본 가져오기»로 오면
          이 단추가 없어 Esc 말고는 풀 길이 없었다. 띠가 네 단계에 다 서면서 사라진 덫이다.
        */}
          <button
            ref={focusButton}
            hidden={step === "order"}
            className={styles.primaryButton}
            aria-pressed={focusMode}
            onClick={() => setFocusMode((value) => !value)}
          >
            {focusMode ? "편집창 축소" : "편집창 확대"}
          </button>
        </StudioStepBar>

        {/*
        둘째 줄 — 그 단계의 도구. 캔버스 칸 «밖»이라 ②③ 이 같은 폭을 쓴다(안 A).
        검수 단계는 문제 이동과 「N문항 검수 완료」가 더 붙는다.
      */}
        {toolRowShown && (
          <div
            className={styles.reviewNavigation}
            data-studio-tool-row
            aria-label={step === "review" ? "문항 검수 이동" : "지면 도구"}
          >
            {sourceToolbar}
            {progressStrip}
            {step === "review" && crops.length > 0 && (
              <span className={styles.reviewProgress}>
                {reviewedCount}문항 검수 완료
              </span>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInput}
        className={styles.hiddenInput}
        type="file"
        tabIndex={-1}
        aria-label="PDF 또는 이미지 파일 가져오기"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp,.pdf,.png,.jpg,.jpeg,.webp,.gif,.bmp"
        multiple
        disabled={busy}
        onChange={(event) => {
          void importFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {error ? (
        <div className={styles.error} role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="오류 메시지 닫기"
          >
            ×
          </button>
        </div>
      ) : null}
      <div
        className={`${styles.announcement} ${editing ? styles.srOnly : ""}`}
        role="status"
        aria-live="polite"
      >
        <Icon name={crops.length ? "check" : "file"} />
        <span>
          {notice || "파일을 가져오거나 예제 지면으로 자르기를 연습하세요."}
        </span>
      </div>

      {step === "order" && (
        <>
          <StudioPageOrder
            sources={sources}
            order={pageOrder}
            previews={previews}
            busy={busy || studioAi.running}
            onRetryPreview={retryPagePreview}
            onMove={(key, direction) =>
              changeOrder(
                movePage(pageOrder, key, direction),
                `${orderedLabel(key)}을 옮겼습니다.`,
              )
            }
            onToggle={(key) =>
              changeOrder(
                togglePageOut(pageOrder, key),
                `${orderedLabel(key)}을 ${pageOrder.find((page) => studioPageKey(page) === key)?.out ? "되살렸습니다." : "뺐습니다."}`,
              )
            }
          />
          {pendingThumbnails && <p role="status">쪽 그림을 불러오는 중…</p>}
          {pendingConfirmations && <p role="status">빈 쪽인지 확인하는 중…</p>}
          {orderToast && (
            <div className={styles.pageOrderToast} role="status">
              <span>{orderToast}</span>
              <button
                type="button"
                disabled={!orderHistory.past.length}
                onClick={undoOrder}
              >
                되돌리기
              </button>
            </div>
          )}
        </>
      )}
      <div
        hidden={step === "order"}
        ref={workspace}
        className={styles.workspace}
        data-studio-workspace
      >
        <div className={styles.canvasColumn}>
          {importProgress ? (
            <WorkProgress
              label={
                importProgress.restoring
                  ? "이전 작업 불러오는 중"
                  : "파일 불러오는 중"
              }
              detail={importProgress.name}
              completed={importProgress.done}
              total={importProgress.total}
              unit="파일"
              startedAt={importProgress.startedAt}
            />
          ) : null}
          {/* ②③ 은 둘째 줄이 진행 띠를 안고 있다 — ① 에만 여기 남는다. */}
          {step === "upload" && progressStrip}

          {step === "review" ? (
            <>
              <StudioReviewPane
                crops={pageCrops}
                allCrops={crops}
                activeId={activeCropId}
                original={pageReady ? rendered?.url : undefined}
                page={pageNumber}
                pageJob={currentPageJob}
                jobs={studioAi.cropJobs ?? []}
                figureJobs={figureJobs}
                available={studioAi.available}
                onSelect={selectCrop}
                onUpdate={updateCropById}
                onRun={(action, ids) => void studioAi.processCrops(action, ids)}
                onCancel={(id, action) => studioAi.cancelCropJob(id, action)}
                onRetry={(id, action) => void studioAi.retryCrop(id, action)}
                onCrop={(crop, figure) => {
                  if (crop) selectCrop(crop.id);
                  setStep("crop");
                  setInspectorOpen(true);
                  setCropTool(crop ? "select" : "add-problem");
                  if (figure) setSelectedBoxId(figure.id);
                }}
                onEditFigure={openFigureEditor}
                onRetryPage={() => recognizeSource(false)}
                onRenderFigure={(cropId, figureId) =>
                  void studioAi.figureAi.run([cropId], figureId)
                }
                onCancelFigure={(cropId, figureId) =>
                  studioAi.figureAi.cancel(cropId, figureId)
                }
                cartState={cartState}
                onReflect={reflectCrop}
              />
            </>
          ) : step === "upload" || !currentSource ? (
            <div
              className={`${styles.uploadArea} ${dragOver ? styles.dragOver : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                )
                  setDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                void importFiles(Array.from(event.dataTransfer.files));
              }}
            >
              <div className={styles.uploadIllustration} aria-hidden="true">
                <Icon name="upload" width="32" height="32" />
              </div>
              <div className={styles.uploadCopy}>
                <h2>문제로 만들 자료를 가져오세요</h2>
                <p>
                  PDF나 이미지를 여기에 놓아 주세요.
                  <br />
                  문제와 도형을 원본 그대로 잘라 사용할 수 있습니다.
                </p>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => fileInput.current?.click()}
                disabled={busy}
              >
                <Icon name="plus" />
                {busy ? busyLabel : "내 컴퓨터에서 선택"}
              </button>
              <span className={styles.fileHint}>
                PDF, JPG, PNG, WebP 등 · 파일당 최대 40 MB
              </span>
              <div className={styles.sampleLink}>
                준비한 자료가 없나요?{" "}
                <button type="button" onClick={loadSample} disabled={busy}>
                  예제 지면 둘러보기 <span aria-hidden="true">↗</span>
                </button>
              </div>
              {demoFile ? (
                <div className={styles.sampleLink}>
                  시연 계정{" "}
                  <button
                    type="button"
                    title={demoFile.name}
                    disabled={busy}
                    onClick={() =>
                      void demoFile
                        .open()
                        .then((file) => importFiles([file]))
                        .catch(() =>
                          setError(
                            "시연 시험지를 받지 못했습니다. 다시 시도해 주세요.",
                          ),
                        )
                    }
                  >
                    시연 시험지 열기
                  </button>
                </div>
              ) : null}
              {currentSource ? (
                <BackButton type="button" onClick={() => setStep("crop")}>
                  열어 둔 원본으로 돌아가기
                </BackButton>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.cropHint}>
                <Icon name="crop" />
                <span>문제·보기·도형을 포함해 영역을 드래그하세요.</span>
                <button
                  type="button"
                  onClick={() => {
                    setCropTool("add-problem");
                    setSelection({
                      x: 0.08,
                      y: 0.15,
                      width: 0.84,
                      height: 0.2,
                    });
                    surface.current?.focus();
                  }}
                  disabled={!pageReady || recognizingPage}
                >
                  키보드로 영역 지정
                </button>
              </div>
              <div
                ref={pageViewport}
                className={styles.pageViewport}
                aria-busy={recognizingPage || (!pageReady && !error)}
              >
                {pageReady && rendered ? (
                  <div
                    className={styles.pageSizer}
                    style={{
                      width:
                        zoom === 0
                          ? `${Math.max(1, Math.min(viewportSize.width - 24, ((viewportSize.height - 24) * rendered.canvas.width) / rendered.canvas.height))}px`
                          : `${zoom}%`,
                    }}
                  >
                    <div
                      ref={surface}
                      className={styles.pageSurface}
                      data-tool={cropTool}
                      tabIndex={0}
                      role="group"
                      aria-label="문제 자르기 영역"
                      aria-busy={recognizingPage}
                      aria-disabled={recognizingPage}
                      aria-describedby="studio-crop-keyboard-help"
                      onPointerDown={beginCrop}
                      onPointerMove={moveCrop}
                      onPointerUp={endCrop}
                      onPointerCancel={cancelSelection}
                      onContextMenu={(event) => {
                        if (!selection && !drag.current) return;
                        event.preventDefault();
                        cancelSelection();
                      }}
                      onLostPointerCapture={() => {
                        drag.current = null;
                      }}
                      onKeyDown={keyboardCrop}
                    >
                      <img
                        src={rendered.url}
                        width={rendered.canvas.width}
                        height={rendered.canvas.height}
                        alt={`${currentSource.name}, ${pageNumber}쪽 원본`}
                        draggable={false}
                      />
                      {currentPageJob?.state === "empty" &&
                      !pageCrops.length ? (
                        <StudioEmptyPageStamp
                          key={`${currentSource.id}:${pageNumber}`}
                        />
                      ) : null}
                      {pageCrops.map((crop) => (
                        <StudioCropOverlay
                          key={crop.id}
                          id={crop.id}
                          rect={crop.rect}
                          label={`문제 ${crops.indexOf(crop) + 1}${crop.questionType ? ` · ${STUDIO_QUESTION_TYPES[crop.questionType]}` : ""}`}
                          kind="problem"
                          done={studioCropDigitized(crop)}
                          selected={selectedBoxId === crop.id}
                          disabled={recognizingPage}
                          tool={cropTool}
                          onSelect={selectBox}
                          onCommit={commitBox}
                          onDelete={deleteBox}
                        />
                      ))}
                      {pageCrops.flatMap((crop) =>
                        (crop.figures ?? []).map((figure, index) => (
                          <StudioCropOverlay
                            key={figure.id}
                            id={figure.id}
                            rect={figure.rect}
                            bounds={crop.rect}
                            label={studioFigureLabel(
                              crops.indexOf(crop) + 1,
                              index,
                            )}
                            kind="figure"
                            done={Boolean(figure.svg)}
                            selected={selectedBoxId === figure.id}
                            disabled={recognizingPage}
                            tool={cropTool}
                            onSelect={selectBox}
                            onCommit={commitBox}
                            onDelete={deleteBox}
                          />
                        )),
                      )}
                      {selection ? (
                        <div
                          className={styles.rectangle}
                          style={{
                            left: `${selection.x * 100}%`,
                            top: `${selection.y * 100}%`,
                            width: `${selection.width * 100}%`,
                            height: `${selection.height * 100}%`,
                          }}
                        >
                          <i />
                          <i />
                          <i />
                          <i />
                          <span>선택 영역</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className={styles.loading}>
                    {error ? (
                      "원본을 표시할 수 없습니다."
                    ) : (
                      <WorkProgress
                        key={`${sourceId}:${pageNumber}`}
                        label="지면을 불러오는 중"
                        variant="inline"
                        showElapsed
                      />
                    )}
                  </div>
                )}
              </div>
              <div
                id="studio-crop-keyboard-help"
                className={styles.keyboardHelp}
              >
                방향키: 이동 · Shift + 방향키: 크게 이동 · Enter: 자르기 ·
                우클릭 / Esc: 취소
              </div>
              {selection && coordinatesOpen ? (
                <div className={styles.coordinates}>
                  {(
                    [
                      ["x", "왼쪽"],
                      ["y", "위쪽"],
                      ["width", "너비"],
                      ["height", "높이"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <span>
                        <input
                          type="number"
                          disabled={recognizingPage}
                          aria-label={`자르기 영역 ${label} (%)`}
                          min={0}
                          max={100}
                          step={0.1}
                          value={Math.round(selection[key] * 1000) / 10}
                          onChange={(event) =>
                            adjustSelection(
                              key,
                              event.currentTarget.valueAsNumber,
                            )
                          }
                        />
                        %
                      </span>
                    </label>
                  ))}
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={cancelSelection}
                    disabled={recognizingPage}
                  >
                    선택 해제
                  </button>
                </div>
              ) : null}
            </>
          )}
          <div className={styles.canvasFootnote}>
            <span>
              {sources.length
                ? `원본 ${sources.length}개 보관 중`
                : storageScope
                  ? ""
                  : "파일을 열면 브라우저에서 원본을 보관합니다."}
            </span>
            <span>
              {storageScope
                ? "작업은 계정에 자동 저장됩니다."
                : "새로고침하면 작업 내용이 초기화됩니다."}
            </span>
          </div>
        </div>

        <aside
          className={styles.inspector}
          aria-label="자른 문제 검수"
          hidden={step === "review" || (editing && !inspectorOpen)}
        >
          <h2 className={styles.srOnly}>문제 검수</h2>
          <div className={styles.inspectorScroll}>
            {step === "crop" && currentSource ? (
              <div className={styles.cropEditTools}>
                <div className={styles.cropEditHeading}>
                  <strong>영역 편집</strong>
                  <span>
                    {pageCrops.length}문제 ·{" "}
                    {pageCrops.reduce(
                      (total, crop) => total + (crop.figures?.length ?? 0),
                      0,
                    )}
                    도형
                  </span>
                </div>
                <div
                  className={styles.cropToolButtons}
                  aria-label="영역 편집 도구"
                >
                  {(
                    [
                      ["select", "선택"],
                      ["add-problem", "문제 추가"],
                      ["add-figure", "도형 추가"],
                      ["delete", "삭제"],
                    ] as const
                  ).map(([tool, label]) => (
                    <button
                      type="button"
                      key={tool}
                      aria-pressed={cropTool === tool}
                      disabled={
                        recognizingPage ||
                        !pageReady ||
                        (tool === "add-figure" && !activeCrop)
                      }
                      onClick={() => chooseTool(tool)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className={styles.cropLegend}>
                  <span>문제 영역</span>
                  <span>내부 도형</span>
                  <small>우클릭 · Esc 취소</small>
                </div>
              </div>
            ) : null}
            {unreadCrops.length > 1 || unsolvedCrops.length > 1 ? (
              <div className={styles.aiBatch} aria-label="대기 문항 AI 처리">
                {unreadCrops.length > 1 ? (
                  <button
                    type="button"
                    disabled={!unreadCrops.length || !studioAi.available}
                    onClick={() =>
                      void studioAi.processCrops(
                        "ocr",
                        unreadCrops.map((crop) => crop.id),
                      )
                    }
                  >
                    미인식 {unreadCrops.length}개 인식
                  </button>
                ) : null}
                {unsolvedCrops.length > 1 ? (
                  <button
                    type="button"
                    disabled={!unsolvedCrops.length || !studioAi.available}
                    title="검수한 문제 내용과 원본 이미지로 해설을 차례로 생성합니다."
                    onClick={() =>
                      void studioAi.processCrops(
                        "solution",
                        unsolvedCrops.map((crop) => crop.id),
                      )
                    }
                  >
                    해설 없는 {unsolvedCrops.length}개 생성
                  </button>
                ) : null}
              </div>
            ) : null}
            {crops.length ? (
              <div className={styles.cropList} aria-label="자른 문제 목록">
                {crops.map((crop, index) => {
                  const title = `문제 ${String(index + 1).padStart(2, "0")}`;
                  const detail = `${crop.page}쪽 · ${crop.grade} · ${crop.mode === "text" && crop.content.trim() ? "텍스트" : "이미지"}`;
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      className={styles.cropItem}
                      aria-pressed={activeCropId === crop.id}
                      disabled={studioAi.isPageBusy(crop.sourceId, crop.page)}
                      onClick={() => selectCrop(crop.id)}
                    >
                      <img src={crop.image} alt="" />
                      {/* 좁은 목록에서는 줄바꿈 대신 말줄임 — 전체 글자는 title 로(원장님 2026-09-19). */}
                      <span>
                        <strong title={title}>{title}</strong>
                        <small title={detail}>{detail}</small>
                      </span>
                      {studioAi.isCropBusy?.(crop.id) ? (
                        <span className={styles.draftBadge}>
                          {studioAi.cropJobs?.some(
                            (job) =>
                              job.cropId === crop.id && job.state === "running",
                          )
                            ? "인식 중"
                            : "대기 중"}
                        </span>
                      ) : figurePending.some(
                          (job) => job.cropId === crop.id,
                        ) ? (
                        <span className={styles.draftBadge}>도형 생성 중</span>
                      ) : cartState(crop) !== "pending" ? (
                        // 카드 바닥 표시와 같은 글자·같은 모양(모든 화면 일치).
                        <StudioCartChip state={cartState(crop)} />
                      ) : crop.reviewed ? (
                        <span className={styles.addedBadge}>검수 완료</span>
                      ) : (
                        <span className={styles.draftBadge}>검수 중</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {activeCrop ? (
              <div className={styles.editor}>
                <div className={styles.editorHeading}>
                  <h3>
                    문제{" "}
                    {String(
                      crops.findIndex((crop) => crop.id === activeCropId) + 1,
                    ).padStart(2, "0")}
                  </h3>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label="선택한 자른 문제 삭제"
                    disabled={recognizingPage}
                    onClick={() => deleteBox(activeCropId)}
                  >
                    <Icon name="trash" width="16" height="16" />
                  </button>
                </div>
                <div
                  className={styles.figureReview}
                  aria-label="내부 도형 검수"
                >
                  <div className={styles.cropEditHeading}>
                    <strong>내부 도형 {activeCrop.figures?.length ?? 0}</strong>
                    <button
                      type="button"
                      className={styles.textButton}
                      disabled={
                        studioAi.isCropBusy?.(activeCrop.id) ||
                        !studioAi.available
                      }
                      onClick={() =>
                        void studioAi.processCrops("figures", [activeCropId])
                      }
                    >
                      그림 다시 찾기
                    </button>
                  </div>
                  {activeCrop.figures?.length ? (
                    <div className={styles.figureList}>
                      {activeCrop.figures.map((figure, index) => (
                        <div key={figure.id}>
                          <button
                            type="button"
                            aria-pressed={selectedBoxId === figure.id}
                            disabled={recognizingPage}
                            onClick={() => {
                              if (
                                activeCrop.sourceId !== sourceId ||
                                activeCrop.page !== pageNumber
                              )
                                chooseSource(
                                  activeCrop.sourceId,
                                  activeCrop.page,
                                );
                              setStep("crop");
                              setCropTool("select");
                              setSelectedBoxId(figure.id);
                            }}
                          >
                            <img src={figure.image} alt="" />
                            {studioFigureLabel(activeCropIndex + 1, index)}
                          </button>
                          <button
                            type="button"
                            aria-label={`${studioFigureLabel(activeCropIndex + 1, index)} 삭제`}
                            disabled={recognizingPage}
                            onClick={() => deleteBox(figure.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.figureEmpty}>
                      지정한 도형이 없습니다
                    </span>
                  )}
                </div>
                <label className={styles.compactType}>
                  문제 유형
                  <select
                    value={activeCrop.questionType ?? ""}
                    onChange={(event) =>
                      updateCrop({
                        questionType: (event.target.value ||
                          undefined) as StudioCrop["questionType"],
                      })
                    }
                  >
                    <option value="">유형 미확인</option>
                    {Object.entries(STUDIO_QUESTION_TYPES).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <div className={styles.cropPreview}>
                  <img src={activeCrop.image} alt="검수할 자른 원본 문제" />
                </div>
              </div>
            ) : currentSource ? (
              <StudioPageEmpty
                job={currentPageJob}
                page={pageNumber}
                onAdd={() => chooseTool("add-problem")}
                onRetry={() => recognizeSource(false)}
                canRetry={studioAi.available}
              />
            ) : null}
          </div>
        </aside>
        {/*
          담은 문항 목록 — 안 D(원장님 2026-09-21 확정). 바닥 막대에서 위로 펼친다(문제은행이 좁을 때
          쓰는 바구니와 같은 결). 시험지 전체를 보이고(문제은행에서 담은 것까지, 출처 표시), 뺀 줄은
          흐리게 남아 «다시 담기»로 제자리에 돌린다 — 편집창 확대 중에도 닿는 되돌리기다.
        */}
        {cartOpen && step !== "crop" && (
          <StudioCartPanel
            id={cartPanelId}
            crops={crops}
            picked={cart.picked}
            removed={cart.removed}
            canExport={canExport}
            onJump={(id) => {
              setCartOpen(false);
              setStep("review");
              selectCrop(id);
            }}
            onRemove={removeFromCart}
            onRemoveAll={removeAllFromStudioCart}
            onRestore={restoreToCartFromStudio}
            onClose={(returnFocus) => {
              setCartOpen(false);
              if (returnFocus) cartToggle.current?.focus();
            }}
            onExport={() => {
              if (compositionBlocked) return;
              setCartOpen(false);
              addProblems(true);
            }}
          />
        )}
      </div>
      {active && figureCrop && editedFigure && (
        <Suspense
          fallback={
            <WorkProgress label="도형 편집기 여는 중" variant="inline" />
          }
        >
          <StudioFigureEditor
            image={editedFigure.image}
            originalImage={editedFigure.originalImage}
            initialSvg={editedFigure.svg}
            index={editedFigureIndex}
            label={studioFigureLabel(
              crops.indexOf(figureCrop) + 1,
              editedFigureIndex,
            )}
            onClose={() => setFigureEditor(null)}
            onSave={({ svg, dataUrl, originalImage }) => {
              if (figureEditor?.onApply) {
                figureEditor.onApply({
                  ...editedFigure,
                  svg,
                  image: dataUrl,
                  originalImage,
                  spec: undefined,
                  engine: undefined,
                  figureReview: undefined,
                });
                return;
              }
              setCrops((previous) =>
                previous.map((crop) =>
                  crop.id === figureCrop.id
                    ? {
                        ...crop,
                        figures: crop.figures?.map((figure) =>
                          figure.id === editedFigure.id
                            ? {
                                ...figure,
                                svg,
                                image: dataUrl,
                                originalImage,
                                spec: undefined,
                                engine: undefined,
                                figureReview: undefined,
                              }
                            : figure,
                        ),
                        mode:
                          crop.content.trim() && !crop.modeManual
                            ? "text"
                            : crop.mode,
                        reviewed: false,
                        revision: (crop.revision ?? 0) + 1,
                      }
                    : crop,
                ),
              );
            }}
            onRedraw={
              studioAi.available
                ? async ({ originalImage, svg, instructions, signal }) => {
                    // 대기열 맨 앞으로 — 일괄 생성이 도는 동안 바로 보내면 서버가 429 로 거절한다
                    const response = await studioAi.runInteractive(
                      {
                        action: "figure-redraw",
                        imageDataUrl: originalImage,
                        svg,
                        content:
                          instructions.trim() ||
                          "원본의 인쇄된 도형을 정확하게 다시 그려 주세요. 손글씨와 채점 표시는 제외하고 수학 기호와 조건을 보존하세요.",
                        grade: figureCrop.grade,
                      },
                      signal,
                    );
                    if (!response.result.svg)
                      throw new Error(
                        "도형 응답이 비어 있습니다. 다시 시도해 주세요.",
                      );
                    return {
                      svg: response.result.svg,
                      warnings: response.result.warnings,
                    };
                  }
                : undefined
            }
            onEdit={
              studioAi.available
                ? async ({ imageDataUrl, figure, instructions, signal }) => {
                    const response = await studioAi.runInteractive(
                      {
                        action: "figure-edit",
                        imageDataUrl,
                        figure,
                        content: instructions,
                        grade: figureCrop.grade,
                      },
                      signal,
                    );
                    if (!response.result.edits?.length)
                      throw new Error(
                        "수정 명령을 받지 못했습니다. 다시 시도해 주세요.",
                      );
                    return {
                      edits: response.result.edits,
                      warnings: response.result.warnings,
                    };
                  }
                : undefined
            }
          />
        </Suspense>
      )}
      <footer
        hidden={step === "order"}
        className={styles.actionBar}
        aria-label="문제 제작 주요 작업"
      >
        {saveDialog}
        {storageScope && (
          <button onClick={saveLibrary} disabled={busy || !sources.length}>
            {workspaceLibraryLabel(branchId)}에 저장
          </button>
        )}
        <span role="status" aria-label="문제 추출 저장 상태">
          {storageScope && sessionStatus === "저장됨"
            ? sources.length
              ? "계정에 저장됨"
              : "작업 준비 완료"
            : sessionStatus}
        </span>
        {storageScope &&
          (sessionStatus === "저장 실패" || sessionStatus === "복원 실패") && (
            <button
              onClick={() => {
                if (storageReady.current)
                  setStorageVersion((version) => version + 1);
                else {
                  setRestoring(true);
                  setLoadAttempt((attempt) => attempt + 1);
                }
              }}
            >
              다시 시도
            </button>
          )}
        <div className={styles.selectionAction}>
          {step === "crop" &&
          currentSource &&
          (selection ||
            cropTool === "add-problem" ||
            cropTool === "add-figure" ||
            recognizingPage) ? (
            <>
              <div className={styles.selectionStatus}>
                <strong>
                  {recognizingPage
                    ? studioWorkName("pages").running
                    : validSelection
                      ? "선택 영역"
                      : cropTool === "add-figure"
                        ? "도형 영역 지정"
                        : "영역 선택 대기"}
                </strong>
                <span>
                  {recognizingPage
                    ? "완료 후 영역을 선택할 수 있습니다"
                    : selection && readyToCrop
                      ? `${readyToCrop.width} × ${readyToCrop.height} px`
                      : "드래그하면 추가 · 우클릭으로 취소"}
                </span>
              </div>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!validSelection || recognizingPage}
                onClick={() => saveCrop()}
              >
                <Icon name="crop" />
                {cropTool === "add-figure"
                  ? "도형 영역 저장"
                  : "선택 영역 자르기"}
              </button>
              <button
                type="button"
                className={styles.coordinateToggle}
                aria-expanded={coordinatesOpen}
                onClick={() => setCoordinatesOpen((value) => !value)}
                disabled={!selection || recognizingPage}
              >
                {coordinatesOpen ? "좌표 접기" : "세부 좌표"}
              </button>
            </>
          ) : step === "crop" && currentSource ? (
            <>
              <div className={styles.selectionStatus}>
                <strong>
                  {pageNumber}쪽 · {pageCrops.length}문제
                </strong>
                <span>
                  {pageInspected
                    ? "영역 확인 완료"
                    : cropTool === "delete"
                      ? "삭제할 영역을 클릭하세요"
                      : "박스 이동 · 모서리로 크기 조절"}
                </span>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!pageCrops.length || !pageReady || recognizingPage}
                onClick={inspectPage}
              >
                {currentPageIndex < livePages.length - 1
                  ? "영역 확인 · 다음 쪽"
                  : "영역 확인 · 문항 검수"}
              </button>
            </>
          ) : (
            <div className={styles.selectionStatus}>
              <strong>자른 문제 {crops.length}문항</strong>
              <span>
                {crops.length
                  ? `${reviewedCount}문항 검수 완료 · 이 원본 ${pickedHereCount}문항 담음 · ${pendingCount}문항 추가 예정`
                  : "원본을 가져와 첫 문제를 선택하세요"}
              </span>
            </div>
          )}
        </div>
        <div className={styles.outputActions}>
          {step === "crop" ? (
            <>
              {studioAi.running && remainingLabel ? (
                <span className={styles.buttonHint}>{remainingLabel} 남음</span>
              ) : null}
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!crops.length || recognizingPage || studioAi.running}
                title={
                  studioAi.running
                    ? "자동 인식이 끝나면 넘어갈 수 있습니다. 도형 생성은 다음 단계에서 시작합니다."
                    : undefined
                }
                onClick={digitizeAll}
              >
                다음: OCR · 디지털화 <Icon name="arrow" />
              </button>
            </>
          ) : (
            <>
              {/* 시험지 전체의 담은 수 — 1280px 에서 위 «M문항 담음» 줄이 숨어도 개수가 여기 남는다. */}
              <button
                ref={cartToggle}
                type="button"
                className={styles.secondaryButton}
                aria-expanded={cartOpen}
                aria-controls={cartPanelId}
                disabled={!cart.picked.length && !cart.removed.length}
                onClick={() => setCartOpen((value) => !value)}
              >
                담은 문항 <b>{cart.picked.length}</b>{" "}
                <span aria-hidden="true">{cartOpen ? "▾" : "▴"}</span>
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!pendingCount || compositionBlocked}
                onClick={() => addProblems()}
              >
                <Icon name="plus" />
                {/* 뺀 것만 남았으면 «담을 문항 없음», 다 담겼으면 «모두 담았습니다»(`studioCartAddLabel`). */}
                {studioCartAddLabel(crops, cart.picked, cart.removed)}
              </button>
              {canExport && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={
                    !(cart.picked.length + pendingCount) || compositionBlocked
                  }
                  title={
                    pendingCount
                      ? `추출 ${pendingCount}문항을 추가합니다. 현재 시험지 ${cart.picked.length}문항은 유지됩니다.`
                      : `현재 시험지 ${cart.picked.length}문항을 구성합니다.`
                  }
                  onClick={() => addProblems(true)}
                >
                  {pendingCount ? "담고 내보내기" : "내보내기"}{" "}
                  <Icon name="arrow" width="18" height="18" />
                </button>
              )}
            </>
          )}
        </div>
      </footer>
      <dialog
        ref={restartDialog}
        className={styles.restartDialog}
        aria-labelledby="studio-restart-title"
        aria-describedby="studio-restart-description"
        onCancel={(event) => {
          event.preventDefault();
          setRestartOpen(false);
        }}
        onClose={() => {
          requestAnimationFrame(() => {
            if (
              !active ||
              !studio.current ||
              studio.current.closest("[hidden], [inert]") ||
              document.querySelector("dialog[open]")
            )
              return;
            // 띠가 네 단계에 다 서므로 「새로 시작」 단추는 늘 있다(안 A) — 대역이 필요 없다.
            restartButton.current?.focus({ preventScroll: true });
          });
        }}
      >
        <h2 id="studio-restart-title">새로 시작할까요?</h2>
        <p id="studio-restart-description">
          원본과 자른 문제, 검수 내용을 지웁니다.
          <br />
          이미 내 시험지에 담은 문항은 유지됩니다.
        </p>
        <div className={styles.restartActions}>
          <button
            ref={cancelRestartButton}
            type="button"
            className={styles.secondaryButton}
            onClick={() => setRestartOpen(false)}
          >
            취소
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={startOver}
          >
            새로 시작
          </button>
        </div>
      </dialog>
    </section>
  );
}
