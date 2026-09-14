"use client";

/* Local image data must stay in the browser, bypassing the Next image optimizer. */
/* eslint-disable @next/next/no-img-element */

import WorkspacePageHeader from "./WorkspacePageHeader";
import StudioCropOverlay from "./StudioCropOverlay";
import WorkProgress from "./WorkProgress";
import StudioQueueStatus from "./StudioQueueStatus";
import StudioReviewPane from "./StudioReviewPane";
import StudioPageEmpty from "./StudioPageEmpty";
import { resolveStudioGrade, studioGradeLevel } from "./studioGrade";
import {
  lazy,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, PointerEvent, SVGProps } from "react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { useStudioAi, type StudioAiPageTask } from "./useStudioAi";
import { studioCropImage } from "./studioAiHelpers";
import type { DevAiProvider } from "@/lib/dev-ai/contracts";
import type { SchoolLevel, StudioViewProps } from "./types";
import {
  clamp,
  drawStudioSample,
  STUDIO_GRADES,
  STUDIO_QUESTION_TYPES,
  studioPixelRect,
  studioProblem,
  studioRectBetween,
} from "./studioHelpers";
import type { StudioCrop, StudioRect, StudioFigure } from "./studioHelpers";
import styles from "./StudioView.module.css";

const StudioFigureEditor = lazy(() => import("./figure-editor"));

interface StudioSource {
  id: string;
  name: string;
  kind: "image" | "pdf" | "sample";
  pages: number;
  grade?: string;
  level?: SchoolLevel;
  gradeManual?: boolean;
  original?: File;
  image?: HTMLImageElement | HTMLCanvasElement;
  pdf?: PDFDocumentProxy;
}

/** Background rendering owns its canvas and cancellation, independently of the viewport. */
async function renderAiPage(
  source: StudioSource,
  page: number,
  signal: AbortSignal,
) {
  const check = () => {
    if (signal.aborted) throw new DOMException("작업 취소", "AbortError");
  };
  check();
  const canvas = document.createElement("canvas");
  if (source.pdf) {
    const pdfPage = await source.pdf.getPage(page);
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
  return { canvas, imageDataUrl: canvas.toDataURL("image/png") };
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
  for (const pdf of session.documents) void pdf.destroy().catch(() => {});
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
  reviewRequest = 0,
}: StudioViewProps & { active?: boolean; reviewRequest?: number }) {
  const handledReview = useRef(reviewRequest);
  const handledImport = useRef<number | null>(null);
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [rendered, setRendered] = useState<RenderedPage | null>(null);
  const [selection, setSelection] = useState<StudioRect | null>(null);
  const [crops, setCrops] = useState<StudioCrop[]>([]);
  const [activeCropId, setActiveCropId] = useState("");
  const [cropTool, setCropTool] = useState<
    "select" | "add-problem" | "add-figure" | "delete"
  >("add-problem");
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [inspectedPages, setInspectedPages] = useState<Record<string, string>>(
    {},
  );
  const [step, setStep] = useState<"upload" | "crop" | "review">("upload");
  useEffect(() => {
    if (reviewRequest > 0 && handledReview.current !== reviewRequest) {
      handledReview.current = reviewRequest;
      // The parent explicitly requests return to the preserved review step.
      setStep("review");
    }
  }, [reviewRequest]);
  const [level, setLevel] = useState<SchoolLevel>("secondary");
  const [grade, setGrade] = useState("미지정");
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    done: number;
    total: number;
    name: string;
    startedAt: number;
  } | null>(null);
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
  } | null>(null);
  function openFigureEditor(crop: StudioCrop, figure: StudioFigure) {
    setFigureEditor({ cropId: crop.id, figureId: figure.id });
  }
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const studio = useRef<HTMLElement>(null);
  const focusButton = useRef<HTMLButtonElement>(null);
  const restartButton = useRef<HTMLButtonElement>(null);
  const emptyRestartButton = useRef<HTMLButtonElement>(null);
  const restartDialog = useRef<HTMLDialogElement>(null);
  const cancelRestartButton = useRef<HTMLButtonElement>(null);
  const pageViewport = useRef<HTMLDivElement>(null);
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
    contextKey: `${sourceId}:${pageNumber}`,
    active,
    onDetected: (id) => {
      setActiveCropId(id);
      setSelectedBoxId(id);
      setCropTool("select");
      setSelection(null);
      setInspectorOpen(true);
    },
  });
  const recognizingPage = studioAi.isPageBusy(sourceId, pageNumber);
  const unreadCrops = crops.filter(
    (crop) => !crop.content.trim() && !crop.added,
  );
  const unsolvedCrops = crops.filter(
    (crop) => crop.content.trim() && !crop.solution.trim() && !crop.added,
  );

  // The workspace keeps inactive views mounted; leaving must release modal state.
  if (!active && focusMode) setFocusMode(false);
  if (!active && restartOpen) setRestartOpen(false);

  const currentSource = sources.find((item) => item.id === sourceId);
  const sourceJobs = studioAi.pageJobs.filter(
    (job) => job.sourceId === sourceId,
  );
  const sourceRecognizing = sourceJobs.some((job) =>
    ["queued", "rendering", "running"].includes(job.state),
  );
  const currentPageJob = sourceJobs.find((job) => job.page === pageNumber);
  const editing = Boolean(currentSource && step !== "upload");
  const activeCrop = crops.find((item) => item.id === activeCropId);
  const figureCrop = crops.find((crop) => crop.id === figureEditor?.cropId);
  const editedFigure = figureCrop?.figures?.find(
    (figure) => figure.id === figureEditor?.figureId,
  );
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
    rendered &&
    rendered.sourceId === sourceId &&
    rendered.number === pageNumber,
  );
  const pendingCount = crops.filter((item) => !item.added).length;
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
        const jobs = studioAi.pageJobs.filter(
          (job) => job.sourceId === source.id,
        );
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
        return result && crop.grade !== nextGrade
          ? {
              ...crop,
              grade: nextGrade,
              level: studioGradeLevel(result.grade),
              added: false,
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
    if (!currentSource) return;
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
        if (!stale())
          setRendered({
            sourceId: currentSource!.id,
            number: pageNumber,
            canvas,
            url: canvas.toDataURL("image/png"),
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
  }, [currentSource, pageNumber]);

  function chooseSource(id: string, page = 1) {
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

  async function importFiles(files: File[]) {
    const resources = session.current;
    if (!files.length || resources.importing) return;
    const controller = new AbortController();
    const generation = resources.generation;
    resources.importing = controller;
    const stale = () => !mounted.current || generation !== resources.generation;
    setBusy(true);
    const startedAt = Date.now();
    setImportProgress({
      done: 0,
      total: files.length,
      name: files[0].name,
      startedAt,
    });
    setError("");
    const loaded: StudioSource[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (stale()) return;
      setImportProgress({
        done: loaded.length + errors.length,
        total: files.length,
        name: file.name,
        startedAt,
      });
      try {
        if (file.size > 40 * 1024 * 1024)
          throw new Error("40 MB 이하 파일을 선택해 주세요.");
        const id = crypto.randomUUID();
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const pdfjs = await import("pdfjs-dist");
          if (stale()) return;
          pdfjs.GlobalWorkerOptions.workerSrc = `/api/dev/unified/pdf-worker?v=${pdfjs.version}`;
          const data = await file.arrayBuffer();
          if (stale()) return;
          const loading = pdfjs.getDocument({
            data,
            useSystemFonts: true,
            cMapUrl: "/api/dev/unified/pdf-assets/cmaps/",
            cMapPacked: true,
            standardFontDataUrl: "/api/dev/unified/pdf-assets/standard_fonts/",
            // Scanned exam text can be a CCITT/JBIG2 image mask, separate
            // from the visible background. Missing WASM silently drops it.
            wasmUrl: "/api/dev/unified/pdf-assets/wasm/",
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
            await pdf.destroy().catch(() => {});
            return;
          }
          resources.documents.add(pdf);
          loaded.push({
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
      if (loaded.length) {
        setSources((previous) => [...previous, ...loaded]);
        chooseSource(loaded[0].id);
        setNotice(
          `원본 ${loaded.length}개를 열었습니다. 문제 영역을 드래그해 주세요.`,
        );
      }
      setError(errors.join("\n"));
      setBusy(false);
      setImportProgress(null);
      resources.importing = null;
    }
  }

  function startOver() {
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
        name: "오늘의 수학 · 연습용 예제",
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
        added: false,
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
                figures,
                sourceSize: {
                  width: rendered.canvas.width,
                  height: rendered.canvas.height,
                },
                added: false,
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
    if (crop.id === id) {
      const index = crops.indexOf(crop);
      const next = crops[index + 1] ?? crops[index - 1];
      setCrops((previous) => previous.filter((item) => item.id !== id));
      if (activeCropId === id) {
        setActiveCropId(next?.id ?? "");
        setSelectedBoxId(next?.id ?? "");
        if (!next) setStep(currentSource ? "crop" : "upload");
      }
      if (crop.added)
        setNotice(
          "원본 작업에서 삭제했습니다. 이미 담은 문항은 내 시험지에서 관리해 주세요.",
        );
    } else {
      setCrops((previous) =>
        previous.map((item) =>
          item.id === crop.id
            ? {
                ...item,
                figures: item.figures?.filter((figure) => figure.id !== id),
                added: false,
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
    setCrops((previous) =>
      previous.map((crop) =>
        crop.id === id
          ? {
              ...crop,
              added: false,
              reviewed: false,
              ...patch,
              ...(patch.mode !== undefined ? { modeManual: true } : {}),
              revision: (crop.revision ?? 0) + 1,
            }
          : crop,
      ),
    );
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

  function finishReview() {
    if (
      !activeCrop ||
      recognizingPage ||
      studioAi.isCropBusy?.(activeCrop.id) ||
      studioAi.figureAi?.isBusy(activeCrop.id)
    )
      return;
    setCrops((previous) =>
      previous.map((crop) =>
        crop.id === activeCropId ? { ...crop, reviewed: true } : crop,
      ),
    );
    const next = crops[activeCropIndex + 1];
    if (next) selectCrop(next.id);
  }

  function inspectPage() {
    if (!pageCrops.length || !pageReady || recognizingPage) return;
    setInspectedPages((previous) => ({
      ...previous,
      [pageKey]: pageSignature,
    }));
    if (currentSource && pageNumber < currentSource.pages) {
      chooseSource(sourceId, pageNumber + 1);
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
        crop.sourceId === sourceId && crop.grade !== (nextGrade ?? "미지정")
          ? {
              ...crop,
              grade: nextGrade ?? "미지정",
              level: nextLevel,
              added: false,
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
      ? Array.from({ length: currentSource.pages }, (_, index) => index + 1)
      : [pageNumber];
    const tasks: StudioAiPageTask[] = pages.map((page) => ({
      sourceId: currentSource.id,
      sourceLabel: currentSource.name,
      page,
      grade: currentSource.gradeManual
        ? (currentSource.grade ?? "미지정")
        : "미지정",
      level: currentSource.level ?? level,
      load: (signal) => renderAiPage(currentSource, page, signal),
    }));
    void studioAi.recognizePages(tasks, {
      force: !allPages || currentSource.pages === 1,
    });
  }

  function addProblems(exportAfter = false) {
    if (!crops.length || studioAi.running) return;
    const pending = crops.filter((crop) => !crop.added);
    if (pending.length) {
      onAdd(pending.map(studioProblem));
      setCrops((previous) =>
        previous.map((crop) => ({ ...crop, added: true })),
      );
      setNotice(`${pending.length}문항을 내 시험지에 담았습니다.`);
    }
    if (exportAfter) {
      setFocusMode(false);
      onExport();
    }
  }

  function digitizeAll() {
    setStep("review");
    setCrops((previous) =>
      previous.map((crop) =>
        crop.content.trim() && !crop.modeManual && crop.mode !== "text"
          ? { ...crop, mode: "text", added: false, reviewed: false }
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
  const digitalCount = crops.filter(
    (crop) =>
      crop.content.trim() && (crop.figures ?? []).every((figure) => figure.svg),
  ).length;
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

  return (
    <section
      ref={studio}
      className={`${styles.studio} ${editing ? styles.editing : ""} ${focusMode ? styles.focusMode : ""} ${!inspectorOpen ? styles.panelClosed : ""} ${step === "review" ? styles.reviewMode : ""}`}
      aria-label="문제 제작 스튜디오"
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
      {editing && (
        <div className={styles.editorBar}>
          <div className={styles.editorTabs}>
            <h1>자료 제작</h1>
            <button
              aria-pressed={step === "crop"}
              onClick={() => setStep("crop")}
            >
              문제 자르기
            </button>
            <button
              aria-pressed={step === "review"}
              disabled={!crops.length || studioAi.running}
              title={
                studioAi.running
                  ? "자동 인식과 도형 생성이 모두 끝나면 넘어갈 수 있습니다."
                  : undefined
              }
              onClick={() => {
                setStep("review");
                setInspectorOpen(true);
              }}
            >
              OCR · 디지털화 <b>{crops.length}</b>
            </button>
          </div>
          <div className={styles.editorTools}>
            <button onClick={() => fileInput.current?.click()} disabled={busy}>
              <Icon name="upload" />
              {busy ? "파일 여는 중…" : "파일 가져오기"}
            </button>
            <button
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
            <button
              ref={focusButton}
              aria-pressed={focusMode}
              aria-label={focusMode ? "확대 종료" : "작업 영역 확대"}
              onClick={() => setFocusMode((value) => !value)}
            >
              {focusMode ? "축소" : "확대"}
            </button>
          </div>
        </div>
      )}
      <WorkspacePageHeader
        title="내 자료로 만드는 문제"
        description="자료에서 문제를 자르고, 검수한 문항을 내 시험지에 담으세요."
        hidden={editing}
      >
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={loadSample}
          disabled={busy}
        >
          <Icon name="file" />
          예제로 시작
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          <Icon name="upload" />
          {busy ? "파일 여는 중…" : "파일 가져오기"}
        </button>
        <button
          ref={emptyRestartButton}
          type="button"
          className={styles.secondaryButton}
          onClick={requestStartOver}
        >
          <Icon name="restart" />
          새로 시작
        </button>
      </WorkspacePageHeader>

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

      <div className={styles.workflow}>
        <nav className={styles.steps} aria-label="제작 단계">
          {(
            [
              ["upload", "원본 가져오기"],
              ["crop", "문제 자르기"],
              ["review", "OCR · 디지털화"],
            ] as const
          ).map(([key, label], index) => (
            <button
              key={key}
              type="button"
              aria-current={step === key ? "step" : undefined}
              data-complete={
                (key === "upload" && sources.length > 0) ||
                (key === "crop" && crops.length > 0) ||
                (key === "review" && crops.length > 0 && pendingCount === 0)
              }
              disabled={
                (key === "crop" && !currentSource) ||
                (key === "review" && (!crops.length || studioAi.running))
              }
              onClick={() => setStep(key)}
            >
              <span className={styles.stepNumber}>
                {(key === "upload" && sources.length > 0) ||
                (key === "crop" && crops.length > 0) ||
                (key === "review" && crops.length > 0 && pendingCount === 0) ? (
                  <Icon name="check" />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </button>
          ))}
        </nav>
        <span className={styles.localBadge}>
          <Icon name="file" />
          로컬 작업
        </span>
      </div>

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

      <div className={styles.workspace}>
        <div className={styles.canvasColumn}>
          <div className={styles.canvasToolbar}>
            <div className={styles.sourcePicker}>
              <Icon name="file" />
              {sources.length ? (
                <select
                  aria-label="원본 파일"
                  title={currentSource?.name}
                  value={sourceId}
                  onChange={(event) => chooseSource(event.target.value)}
                >
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
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
                title={detectedGrade?.evidence ?? "이 파일의 모든 문제에 적용"}
              >
                <span>학년</span>
                <select
                  aria-label="시험지 학년"
                  value={selectedGrade}
                  disabled={sourceRecognizing}
                  onChange={(event) => changeSourceGrade(event.target.value)}
                >
                  <option value="auto">
                    {detectedGrade?.grade
                      ? `${detectedGrade.grade} (자동 인식)`
                      : detectedGrade?.needsReview
                        ? "학년 확인 필요"
                        : "자동 인식"}
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
              <div className={styles.pageTools}>
                <button
                  type="button"
                  className={styles.pageNavigationButton}
                  aria-label="이전 페이지"
                  disabled={pageNumber <= 1}
                  onClick={() => chooseSource(sourceId, pageNumber - 1)}
                >
                  이전 쪽
                </button>
                <label>
                  <span className={styles.srOnly}>페이지</span>
                  <select
                    aria-label="페이지 선택"
                    value={pageNumber}
                    onChange={(event) =>
                      chooseSource(sourceId, Number(event.target.value))
                    }
                  >
                    {Array.from({ length: currentSource.pages }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                  <span>/ {currentSource.pages}</span>
                </label>
                <button
                  type="button"
                  className={styles.pageNavigationButton}
                  aria-label="다음 페이지"
                  disabled={pageNumber >= currentSource.pages}
                  onClick={() => chooseSource(sourceId, pageNumber + 1)}
                >
                  다음 쪽
                </button>
                <span className={styles.divider} />
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
                <button
                  type="button"
                  className={`${styles.secondaryButton} ${styles.pageAiButton}`}
                  disabled={
                    !pageReady ||
                    !studioAi.available ||
                    sourceRecognizing ||
                    busy
                  }
                  title="전체 페이지를 대기열에 넣어 최대 2쪽씩 인식합니다. 기존 영역은 유지합니다."
                  aria-busy={sourceRecognizing}
                  onClick={() => recognizeSource()}
                >
                  {currentSource.pages > 1
                    ? "전체 페이지 자동 인식"
                    : "페이지 자동 인식"}
                </button>
                <details className={styles.aiDetails}>
                  <summary
                    title={
                      studioAi.available
                        ? "AI 도구 선택과 연결 정보"
                        : studioAi.unavailableReason
                    }
                  >
                    AI 연결
                  </summary>
                  <div>
                    {currentSource.pages > 1 ? (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        disabled={
                          !pageReady || recognizingPage || !studioAi.available
                        }
                        onClick={(event) => {
                          recognizeSource(false);
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                        }}
                      >
                        현재 {pageNumber}쪽만 다시 인식
                      </button>
                    ) : null}
                    <select
                      aria-label="Studio AI 도구"
                      value={studioAi.ai.provider}
                      disabled={studioAi.running || studioAi.ai.checking}
                      onChange={(event) =>
                        studioAi.ai.setProvider(
                          event.target.value as DevAiProvider,
                        )
                      }
                    >
                      {studioAi.ai.status?.providers.length ? (
                        studioAi.ai.status.providers.map((provider) => (
                          <option
                            key={provider.id}
                            value={provider.id}
                            disabled={
                              !["ready", "unverified"].includes(provider.status)
                            }
                          >
                            {provider.label}
                            {!["ready", "unverified"].includes(provider.status)
                              ? " · 연결 필요"
                              : provider.status === "unverified"
                                ? " · 미확인"
                                : ""}
                          </option>
                        ))
                      ) : (
                        <option value={studioAi.ai.provider}>
                          AI 연결 확인
                        </option>
                      )}
                    </select>
                    {studioAi.ai.status?.providers.map((provider) => (
                      <p key={provider.id}>
                        <strong>{provider.label}</strong> · {provider.detail}
                      </p>
                    ))}
                    {!studioAi.available ? (
                      <p>{studioAi.unavailableReason}</p>
                    ) : null}
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => void studioAi.ai.refresh()}
                      disabled={studioAi.ai.checking}
                    >
                      연결 다시 확인
                    </button>
                  </div>
                </details>
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
              </div>
            ) : (
              <span className={styles.toolbarMeta}>PDF · 이미지</span>
            )}
          </div>

          {importProgress ? (
            <WorkProgress
              label="파일 불러오는 중"
              detail={importProgress.name}
              completed={importProgress.done}
              total={importProgress.total}
              unit="파일"
              startedAt={importProgress.startedAt}
            />
          ) : null}
          <StudioQueueStatus
            jobs={studioAi.pageJobs}
            startedAt={studioAi.pageProgress.startedAt ?? undefined}
            sources={sources}
            onCancel={() => studioAi.cancel()}
            onRetry={() => void studioAi.retryPages()}
            onNavigate={chooseSource}
          />
          {step === "review" && (
            <div className={styles.digitalBar} aria-label="OCR 디지털화 단계">
              <strong>
                디지털화 {digitalCount}/{crops.length}문항
              </strong>
              <span>문자 인식 → 수식 후보정 → SVG 도형 → 검수</span>
              <button
                type="button"
                disabled={!studioAi.available || !crops.length}
                onClick={digitizeAll}
              >
                전체 디지털화
              </button>
            </div>
          )}
          {figurePending.length > 0 ? (
            <WorkProgress
              label="SVG 도형 생성 중"
              detail={`${figurePending.filter((job) => job.state === "running").length}개 처리 중 · ${figurePending.filter((job) => job.state === "queued").length}개 대기${failedFigures.length ? ` · 실패 ${failedFigures.length}개` : ""}`}
              completed={doneFigures}
              total={figureJobs.length}
              unit="도형"
              startedAt={figurePending.find((job) => job.startedAt)?.startedAt}
              onCancel={() => studioAi.figureAi.cancel()}
              cancelLabel="도형 생성 취소"
            />
          ) : failedFigures.length ? (
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
                studioAi.progress.action === "solution"
                  ? "해설 생성 중"
                  : studioAi.progress.action === "figures"
                    ? "도형 인식 중"
                    : "문자 인식 중"
              }
              completed={studioAi.progress.done}
              total={studioAi.progress.total}
              unit="문항"
              startedAt={studioAi.progress.startedAt}
              onCancel={() => studioAi.cancelCrop()}
              cancelLabel="AI 작업 취소"
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

          {step === "review" ? (
            <>
              {activeCrop && (
                <div
                  className={styles.reviewNavigation}
                  aria-label="문항 검수 이동"
                >
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
                    disabled={
                      activeCropIndex >= crops.length - 1 || recognizingPage
                    }
                    onClick={() => selectCrop(crops[activeCropIndex + 1].id)}
                  >
                    다음 문제
                  </button>
                  <span className={styles.reviewProgress}>
                    {reviewedCount}문항 검수 완료
                  </span>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={
                      recognizingPage ||
                      studioAi.isCropBusy?.(activeCrop.id) ||
                      studioAi.figureAi?.isBusy(activeCrop.id) ||
                      (activeCrop.reviewed &&
                        activeCropIndex === crops.length - 1)
                    }
                    onClick={finishReview}
                  >
                    {activeCropIndex < crops.length - 1
                      ? "검수 완료 · 다음"
                      : activeCrop.reviewed
                        ? "검수 완료됨"
                        : "검수 완료"}
                  </button>
                </div>
              )}
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
                {busy ? "파일 여는 중…" : "내 컴퓨터에서 선택"}
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
              {currentSource ? (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setStep("crop")}
                >
                  열어 둔 원본으로 돌아가기 <Icon name="arrow" />
                </button>
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
                        <div
                          className={styles.emptyPageStamp}
                          role="status"
                          aria-label="자동 인식 완료: 문제가 없는 빈 페이지"
                        >
                          <span>인식 완료</span>
                          <strong>빈 페이지</strong>
                          <small>문제 없음</small>
                        </div>
                      ) : null}
                      {pageCrops.map((crop) => (
                        <StudioCropOverlay
                          key={crop.id}
                          id={crop.id}
                          rect={crop.rect}
                          label={`문제 ${crops.indexOf(crop) + 1}${crop.questionType ? ` · ${STUDIO_QUESTION_TYPES[crop.questionType]}` : ""}`}
                          kind="problem"
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
                            label={`도형 ${index + 1}`}
                            kind="figure"
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
                : "파일을 열면 브라우저에서 원본을 보관합니다."}
            </span>
            <span>새로고침하면 작업 내용이 초기화됩니다.</span>
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
                {crops.map((crop, index) => (
                  <button
                    key={crop.id}
                    type="button"
                    className={styles.cropItem}
                    aria-pressed={activeCropId === crop.id}
                    disabled={studioAi.isPageBusy(crop.sourceId, crop.page)}
                    onClick={() => selectCrop(crop.id)}
                  >
                    <img src={crop.image} alt="" />
                    <span>
                      <strong>문제 {String(index + 1).padStart(2, "0")}</strong>
                      <small>
                        {crop.page}쪽 · {crop.grade} ·{" "}
                        {crop.mode === "text" && crop.content.trim()
                          ? "텍스트"
                          : "이미지"}
                      </small>
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
                    ) : figurePending.some((job) => job.cropId === crop.id) ? (
                      <span className={styles.draftBadge}>도형 생성 중</span>
                    ) : crop.added ? (
                      <span className={styles.addedBadge}>담음</span>
                    ) : crop.reviewed ? (
                      <span className={styles.addedBadge}>검수 완료</span>
                    ) : (
                      <span className={styles.draftBadge}>검수 중</span>
                    )}
                  </button>
                ))}
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
                            도형 {index + 1}
                          </button>
                          <button
                            type="button"
                            aria-label={`도형 ${index + 1} 삭제`}
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
            index={figureCrop.figures!.indexOf(editedFigure)}
            onClose={() => setFigureEditor(null)}
            onSave={({ svg, dataUrl, originalImage }) => {
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
                        added: false,
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
                    const response = await studioAi.ai.run(
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
          />
        </Suspense>
      )}
      <footer className={styles.actionBar} aria-label="문제 제작 주요 작업">
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
                    ? "페이지 인식 중"
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
                {pageNumber < currentSource.pages
                  ? "영역 확인 · 다음 쪽"
                  : "영역 확인 · 문항 검수"}
              </button>
            </>
          ) : (
            <div className={styles.selectionStatus}>
              <strong>자른 문제 {crops.length}문항</strong>
              <span>
                {crops.length
                  ? `${reviewedCount}문항 검수 완료 · ${crops.length - pendingCount}문항 담음`
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
                    ? "자동 인식과 도형 생성이 모두 끝나면 넘어갈 수 있습니다."
                    : undefined
                }
                onClick={digitizeAll}
              >
                다음: OCR · 디지털화 <Icon name="arrow" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!pendingCount || studioAi.running}
                onClick={() => addProblems()}
              >
                <Icon name="plus" />
                {pendingCount
                  ? `${pendingCount}문항 담기`
                  : crops.length
                    ? "모두 담았습니다"
                    : "시험지에 담기"}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!crops.length || studioAi.running}
                onClick={() => addProblems(true)}
              >
                {pendingCount ? "담고 내보내기" : "내보내기"}{" "}
                <Icon name="arrow" width="18" height="18" />
              </button>
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
            (restartButton.current ?? emptyRestartButton.current)?.focus({
              preventScroll: true,
            });
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
