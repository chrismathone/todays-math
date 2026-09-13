"use client";

/* Local image data must stay in the browser, bypassing the Next image optimizer. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, SVGProps } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { ProblemContent } from "@/components/math/ProblemContent";
import UnifiedProblem from "./UnifiedProblem";
import { displayFractions } from "./fractionDisplay";
import type { SchoolLevel, StudioViewProps } from "./types";
import {
  clamp,
  drawStudioSample,
  STUDIO_GRADES,
  studioPixelRect,
  studioProblem,
  studioRectBetween,
} from "./studioHelpers";
import type { StudioCrop, StudioRect } from "./studioHelpers";
import styles from "./StudioView.module.css";

interface StudioSource {
  id: string;
  name: string;
  kind: "image" | "pdf" | "sample";
  pages: number;
  original?: File;
  image?: HTMLImageElement | HTMLCanvasElement;
  pdf?: PDFDocumentProxy;
}

interface RenderedPage {
  sourceId: string;
  number: number;
  canvas: HTMLCanvasElement;
  url: string;
}

function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name: "upload" | "crop" | "file" | "check" | "arrow" | "plus" | "trash";
}) {
  const paths = {
    upload: "M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5",
    crop: "M6 3v15h15M3 6h15v15",
    file: "M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8Zm0 0v6h6M8 13h8M8 17h6",
    check: "m5 12 4 4L19 6",
    arrow: "M4 12h16m-6-6 6 6-6 6",
    plus: "M12 5v14M5 12h14",
    trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
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

function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "이미지를 열 수 없습니다. PNG, JPG 또는 WebP 파일을 확인해 주세요.",
        ),
      );
    };
    image.src = url;
  });
}

export default function StudioView({ onAdd, onExport }: StudioViewProps) {
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [rendered, setRendered] = useState<RenderedPage | null>(null);
  const [selection, setSelection] = useState<StudioRect | null>(null);
  const [crops, setCrops] = useState<StudioCrop[]>([]);
  const [activeCropId, setActiveCropId] = useState("");
  const [step, setStep] = useState<"upload" | "crop" | "review">("upload");
  const [level, setLevel] = useState<SchoolLevel>("elementary");
  const [grade, setGrade] = useState("초5");
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const importLock = useRef(false);
  const pdfDocuments = useRef(new Set<PDFDocumentProxy>());
  const mounted = useRef(true);

  const currentSource = sources.find((item) => item.id === sourceId);
  const activeCrop = crops.find((item) => item.id === activeCropId);
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

  useEffect(() => {
    mounted.current = true;
    const documents = pdfDocuments.current;
    return () => {
      mounted.current = false;
      for (const pdf of documents) void pdf.destroy();
      documents.clear();
    };
  }, []);

  useEffect(() => {
    if (!currentSource) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    async function renderPage() {
      const canvas = document.createElement("canvas");
      try {
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("이 브라우저에서 지면을 표시할 수 없습니다.");
        if (currentSource!.pdf) {
          const page = await currentSource!.pdf.getPage(pageNumber);
          if (cancelled) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: Math.min(2.5, 2200 / Math.max(base.width, base.height)),
          });
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          task = page.render({ canvas, canvasContext: ctx, viewport });
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
        if (!cancelled)
          setRendered({
            sourceId: currentSource!.id,
            number: pageNumber,
            canvas,
            url: canvas.toDataURL("image/png"),
          });
      } catch (cause) {
        if (!cancelled)
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
    };
  }, [currentSource, pageNumber]);

  function chooseSource(id: string, page = 1) {
    setSourceId(id);
    setPageNumber(page);
    setSelection(null);
    drag.current = null;
    setError("");
    setStep("crop");
  }

  async function importFiles(files: File[]) {
    if (!files.length || importLock.current) return;
    importLock.current = true;
    setBusy(true);
    setError("");
    const loaded: StudioSource[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        if (file.size > 40 * 1024 * 1024)
          throw new Error("40 MB 이하 파일을 선택해 주세요.");
        const id = crypto.randomUUID();
        if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = "/api/dev/unified/pdf-worker";
          const loading = pdfjs.getDocument({
            data: await file.arrayBuffer(),
            useSystemFonts: true,
          });
          // Password-protected files fail clearly instead of opening an unseen prompt.
          const pdf = await loading.promise.catch(async (cause: unknown) => {
            await loading.destroy();
            if (cause instanceof Error && cause.name === "PasswordException")
              throw new Error("암호를 해제한 PDF를 선택해 주세요.");
            throw new Error(
              "PDF를 열 수 없습니다. 파일과 PDF 뷰어 연결을 확인해 주세요.",
            );
          });
          if (!mounted.current) {
            await pdf.destroy();
            break;
          }
          pdfDocuments.current.add(pdf);
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
          const image = await readImage(file);
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
        errors.push(
          `${file.name}: ${cause instanceof Error ? cause.message : "파일을 열 수 없습니다."}`,
        );
      }
    }
    if (mounted.current) {
      if (loaded.length) {
        setSources((previous) => [...previous, ...loaded]);
        chooseSource(loaded[0].id);
        setNotice(
          `원본 ${loaded.length}개를 열었습니다. 문제 영역을 드래그해 주세요.`,
        );
      }
      setError(errors.join("\n"));
      setBusy(false);
    }
    importLock.current = false;
  }

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
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  }

  function beginCrop(event: PointerEvent<HTMLDivElement>) {
    if (!pageReady || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointAt(event);
    drag.current = { ...point, pointerId: event.pointerId };
    setSelection({ ...point, width: 0, height: 0 });
    setStep("crop");
  }

  function moveCrop(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setSelection(studioRectBetween(drag.current, pointAt(event)));
  }

  function endCrop(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    setSelection(studioRectBetween(drag.current, pointAt(event)));
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function saveCrop() {
    if (
      !selection ||
      !rendered ||
      !currentSource ||
      !validSelection ||
      !readyToCrop
    )
      return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = readyToCrop.width;
      canvas.height = readyToCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("문제 이미지를 만들 수 없습니다.");
      ctx.drawImage(
        rendered.canvas,
        readyToCrop.x,
        readyToCrop.y,
        readyToCrop.width,
        readyToCrop.height,
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
        rect: { ...selection },
        image: canvas.toDataURL("image/png"),
        content: "",
        answer: "",
        solution: "",
        level,
        grade,
        mode: "image",
        added: false,
      };
      setCrops((previous) => [...previous, crop]);
      setActiveCropId(crop.id);
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
    if (event.key === "Escape") {
      drag.current = null;
      setSelection(null);
      return;
    }
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
      const rect = previous ?? { x: 0.08, y: 0.15, width: 0.84, height: 0.2 };
      return {
        ...rect,
        x: clamp(
          rect.x +
            (event.key === "ArrowRight"
              ? delta
              : event.key === "ArrowLeft"
                ? -delta
                : 0),
          0,
          1 - rect.width,
        ),
        y: clamp(
          rect.y +
            (event.key === "ArrowDown"
              ? delta
              : event.key === "ArrowUp"
                ? -delta
                : 0),
          0,
          1 - rect.height,
        ),
      };
    });
  }

  function adjustSelection(key: keyof StudioRect, value: number) {
    if (!Number.isFinite(value)) return;
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
      return next;
    });
  }

  function updateCrop(patch: Partial<StudioCrop>) {
    setCrops((previous) =>
      previous.map((crop) =>
        crop.id === activeCropId ? { ...crop, ...patch, added: false } : crop,
      ),
    );
  }

  function changeLevel(value: SchoolLevel) {
    const nextGrade = value === "elementary" ? "초5" : "중1";
    setLevel(value);
    setGrade(nextGrade);
    if (activeCrop) updateCrop({ level: value, grade: nextGrade });
  }

  function addProblems(exportAfter = false) {
    if (!crops.length) return;
    const pending = crops.filter((crop) => !crop.added);
    if (pending.length) {
      onAdd(pending.map(studioProblem));
      setCrops((previous) =>
        previous.map((crop) => ({ ...crop, added: true })),
      );
      setNotice(`${pending.length}문항을 내 시험지에 담았습니다.`);
    }
    if (exportAfter) onExport();
  }

  const selectedLevel = activeCrop?.level ?? level;
  const selectedGrade = activeCrop?.grade ?? grade;

  return (
    <section className={styles.studio} aria-label="문제 제작 스튜디오">
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>SOURCE TO WORKSHEET</div>
          <h1>내 자료로 만드는 문제</h1>
          <p>원본을 가져오고, 필요한 문제만 골라 담으세요.</p>
        </div>
        <div className={styles.headerActions}>
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
        </div>
      </header>

      <input
        ref={fileInput}
        className={styles.hiddenInput}
        type="file"
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
              ["review", "검수하고 담기"],
            ] as const
          ).map(([key, label], index) => (
            <button
              key={key}
              type="button"
              aria-current={step === key ? "step" : undefined}
              disabled={
                (key === "crop" && !currentSource) ||
                (key === "review" && !crops.length)
              }
              onClick={() => setStep(key)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        <span className={styles.localBadge}>
          <span />이 브라우저에서만 작업
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
      <div className={styles.announcement} role="status" aria-live="polite">
        {notice}
      </div>

      <div className={styles.workspace}>
        <div className={styles.canvasColumn}>
          <div className={styles.canvasToolbar}>
            <div className={styles.sourcePicker}>
              <Icon name="file" />
              {sources.length ? (
                <select
                  aria-label="원본 파일"
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
              <div className={styles.pageTools}>
                <button
                  type="button"
                  aria-label="이전 페이지"
                  disabled={pageNumber <= 1}
                  onClick={() => chooseSource(sourceId, pageNumber - 1)}
                >
                  ‹
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
                  aria-label="다음 페이지"
                  disabled={pageNumber >= currentSource.pages}
                  onClick={() => chooseSource(sourceId, pageNumber + 1)}
                >
                  ›
                </button>
                <span className={styles.divider} />
                <select
                  aria-label="원본 확대 비율"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                >
                  <option value={75}>75%</option>
                  <option value={100}>맞춤</option>
                  <option value={125}>125%</option>
                  <option value={150}>150%</option>
                  <option value={200}>200%</option>
                </select>
              </div>
            ) : (
              <span className={styles.toolbarMeta}>PDF · 이미지</span>
            )}
          </div>

          {step === "review" && activeCrop ? (
            <div className={styles.reviewCanvas}>
              <div className={styles.reviewHeading}>
                <span>출력 미리보기</span>
                <span>
                  {activeCrop.mode === "text" && activeCrop.content.trim()
                    ? "입력한 텍스트"
                    : "원본 이미지"}
                </span>
              </div>
              <article className={styles.reviewPaper}>
                <div className={styles.paperHeading}>
                  <span>오늘의 수학</span>
                  <span>{activeCrop.grade} · 직접 가져온 문제</span>
                </div>
                <div className={styles.problemNumber}>
                  {String(
                    crops.findIndex((crop) => crop.id === activeCropId) + 1,
                  ).padStart(2, "0")}
                </div>
                <UnifiedProblem problem={studioProblem(activeCrop)} />
                {activeCrop.answer.trim() ? (
                  <div className={styles.reviewAnswer}>
                    <strong>정답</strong>
                    <ProblemContent
                      content={displayFractions(
                        activeCrop.answer,
                        activeCrop.grade,
                      )}
                    />
                  </div>
                ) : null}
                {activeCrop.solution.trim() ? (
                  <div className={styles.reviewAnswer}>
                    <strong>풀이</strong>
                    <ProblemContent
                      content={displayFractions(
                        activeCrop.solution,
                        activeCrop.grade,
                      )}
                    />
                  </div>
                ) : null}
              </article>
              <button
                type="button"
                className={styles.textButton}
                onClick={() =>
                  chooseSource(activeCrop.sourceId, activeCrop.page)
                }
              >
                원본으로 돌아가 더 자르기 <Icon name="arrow" />
              </button>
            </div>
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
                <div className={styles.backPaper} />
                <div className={styles.frontPaper}>
                  <span>오늘의 수학</span>
                  <i />
                  <i />
                  <div className={styles.miniCrop}>x + 3 = 7</div>
                  <i />
                </div>
                <div className={styles.uploadCircle}>
                  <Icon name="upload" width="22" height="22" />
                </div>
              </div>
              <div className={styles.uploadCopy}>
                <span className={styles.eyebrow}>나의 첫 번째 원본</span>
                <h2>
                  한 장의 자료에서
                  <br />
                  새로운 수업이 시작됩니다.
                </h2>
                <p>
                  PDF나 이미지를 여기에 놓아 주세요.
                  <br />
                  필요한 문제만 잘라 나만의 시험지로 만들 수 있어요.
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
                <span>문제와 보기가 모두 들어오도록 드래그하세요.</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelection({
                      x: 0.08,
                      y: 0.15,
                      width: 0.84,
                      height: 0.2,
                    });
                    surface.current?.focus();
                  }}
                  disabled={!pageReady}
                >
                  키보드로 영역 지정
                </button>
              </div>
              <div
                className={styles.pageViewport}
                aria-busy={!pageReady && !error}
              >
                {pageReady && rendered ? (
                  <div
                    className={styles.pageSizer}
                    style={{ width: `${zoom}%` }}
                  >
                    <div
                      ref={surface}
                      className={styles.pageSurface}
                      tabIndex={0}
                      role="group"
                      aria-label="문제 자르기 영역"
                      aria-describedby="studio-crop-keyboard-help"
                      onPointerDown={beginCrop}
                      onPointerMove={moveCrop}
                      onPointerUp={endCrop}
                      onPointerCancel={() => {
                        drag.current = null;
                        setSelection(null);
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
                      {crops
                        .filter(
                          (crop) =>
                            crop.sourceId === sourceId &&
                            crop.page === pageNumber,
                        )
                        .map((crop) => (
                          <div
                            key={crop.id}
                            className={styles.savedRectangle}
                            style={{
                              left: `${crop.rect.x * 100}%`,
                              top: `${crop.rect.y * 100}%`,
                              width: `${crop.rect.width * 100}%`,
                              height: `${crop.rect.height * 100}%`,
                            }}
                          >
                            <span>
                              {String(crops.indexOf(crop) + 1).padStart(2, "0")}
                            </span>
                          </div>
                        ))}
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
                    {error
                      ? "원본을 표시할 수 없습니다."
                      : "지면을 불러오는 중…"}
                  </div>
                )}
              </div>
              <div className={styles.cropBar}>
                <div>
                  <span className={styles.cropBarLabel}>
                    {selection && readyToCrop
                      ? `${readyToCrop.width} × ${readyToCrop.height} px`
                      : "영역을 선택해 주세요"}
                  </span>
                  <span
                    id="studio-crop-keyboard-help"
                    className={styles.keyboardHelp}
                  >
                    방향키: 이동 · Enter: 자르기 · Esc: 취소
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={!validSelection}
                  onClick={saveCrop}
                >
                  <Icon name="crop" />
                  선택 영역 자르기
                </button>
              </div>
              {selection ? (
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
                    onClick={() => setSelection(null)}
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
                : "원본은 서버에 전송되지 않습니다."}
            </span>
            <span>새로고침하면 작업 내용이 초기화됩니다.</span>
          </div>
        </div>

        <aside className={styles.inspector} aria-label="자른 문제 검수">
          <div className={styles.inspectorTitle}>
            <h2>문제 검수</h2>
            <span className={styles.count}>{crops.length}</span>
          </div>
          <div className={styles.inspectorScroll}>
            <div className={styles.gradeBlock}>
              <span className={styles.fieldLabel}>
                {activeCrop ? "선택한 문제의 학년" : "가져올 문제의 학년"}
              </span>
              <div className={styles.gradeRow}>
                <div
                  className={styles.segmented}
                  role="group"
                  aria-label="학교급"
                >
                  <button
                    type="button"
                    aria-pressed={selectedLevel === "elementary"}
                    onClick={() => changeLevel("elementary")}
                  >
                    초등
                  </button>
                  <button
                    type="button"
                    aria-pressed={selectedLevel === "secondary"}
                    onClick={() => changeLevel("secondary")}
                  >
                    중·고등
                  </button>
                </div>
                <select
                  aria-label="학년"
                  value={selectedGrade}
                  onChange={(event) => {
                    setGrade(event.target.value);
                    if (activeCrop) updateCrop({ grade: event.target.value });
                  }}
                >
                  {STUDIO_GRADES[selectedLevel].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {crops.length ? (
              <div className={styles.cropList} aria-label="자른 문제 목록">
                {crops.map((crop, index) => (
                  <button
                    key={crop.id}
                    type="button"
                    className={styles.cropItem}
                    aria-pressed={activeCropId === crop.id}
                    onClick={() => {
                      setActiveCropId(crop.id);
                      setLevel(crop.level);
                      setGrade(crop.grade);
                    }}
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
                    {crop.added ? (
                      <span className={styles.addedBadge}>담음</span>
                    ) : (
                      <span className={styles.draftDot} aria-label="검수 중" />
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
                    onClick={() => {
                      setCrops((previous) =>
                        previous.filter((crop) => crop.id !== activeCropId),
                      );
                      const next = crops.find(
                        (crop) => crop.id !== activeCropId,
                      );
                      setActiveCropId(next?.id ?? "");
                      if (!next) setStep(currentSource ? "crop" : "upload");
                      setNotice(
                        "작업 목록에서 문제를 삭제했습니다. 이미 담은 문항은 내 시험지에서 관리해 주세요.",
                      );
                    }}
                  >
                    <Icon name="trash" width="16" height="16" />
                  </button>
                </div>
                <div className={styles.cropPreview}>
                  <img src={activeCrop.image} alt="검수할 자른 원본 문제" />
                </div>
                <button
                  type="button"
                  className={styles.sourceLink}
                  onClick={() =>
                    chooseSource(activeCrop.sourceId, activeCrop.page)
                  }
                >
                  <Icon name="file" width="13" height="13" />
                  <span>
                    {activeCrop.sourceLabel} · {activeCrop.page}쪽
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
                <div className={styles.manualStatus}>
                  <span className={styles.statusDot} />
                  <div>
                    <strong>직접 입력 · 검수</strong>
                    <p>
                      자동 문자 인식은 아직 연결되지 않았어요.
                      <br />
                      이미지 그대로 담거나 내용을 직접 입력하세요.
                    </p>
                  </div>
                </div>
                <label className={styles.textField}>
                  <span>
                    문제 내용 <small>선택</small>
                  </span>
                  <textarea
                    value={activeCrop.content}
                    rows={5}
                    placeholder="원본을 보며 문제와 보기를 입력하세요. 수식은 $x + 1$처럼 쓸 수 있어요."
                    onChange={(event) =>
                      updateCrop({
                        content: event.target.value,
                        ...(!event.target.value.trim()
                          ? { mode: "image" as const }
                          : {}),
                      })
                    }
                  />
                </label>
                {activeCrop.content.trim() ? (
                  <fieldset className={styles.outputMode}>
                    <legend>시험지에 사용할 내용</legend>
                    <label>
                      <input
                        type="radio"
                        name="studio-output-mode"
                        checked={activeCrop.mode === "image"}
                        onChange={() => updateCrop({ mode: "image" })}
                      />
                      <span>원본 이미지</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="studio-output-mode"
                        checked={activeCrop.mode === "text"}
                        onChange={() => updateCrop({ mode: "text" })}
                      />
                      <span>입력한 텍스트</span>
                    </label>
                    <p>
                      {activeCrop.mode === "image"
                        ? "입력한 문제 내용은 보관하고, 원본 이미지만 출력해요."
                        : "입력한 문제 내용만 출력해요. 원본 속 도형과 보기도 확인해 주세요."}
                    </p>
                  </fieldset>
                ) : (
                  <div className={styles.imageMode}>
                    <Icon name="check" width="14" height="14" />
                    문제 전체를 원본 이미지로 담습니다.
                  </div>
                )}
                <label className={styles.textField}>
                  <span>
                    정답 <small>선택</small>
                  </span>
                  <input
                    value={activeCrop.answer}
                    placeholder="정답을 입력하세요"
                    onChange={(event) =>
                      updateCrop({ answer: event.target.value })
                    }
                  />
                </label>
                <label className={styles.textField}>
                  <span>
                    풀이 <small>선택</small>
                  </span>
                  <textarea
                    value={activeCrop.solution}
                    rows={3}
                    placeholder="풀이 과정을 입력하세요"
                    onChange={(event) =>
                      updateCrop({ solution: event.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  className={styles.previewButton}
                  onClick={() => setStep("review")}
                >
                  출력 미리보기 <Icon name="arrow" width="16" height="16" />
                </button>
              </div>
            ) : (
              <div className={styles.emptyInspector}>
                <div>
                  <Icon name="crop" width="28" height="28" />
                </div>
                <h3>첫 문제를 골라 볼까요?</h3>
                <p>
                  원본에서 문제 영역을 자르면
                  <br />
                  이곳에서 내용을 검수할 수 있어요.
                </p>
                <ol>
                  <li>
                    <span>1</span>지면에서 문제 영역 선택
                  </li>
                  <li>
                    <span>2</span>원본을 보며 내용 확인
                  </li>
                  <li>
                    <span>3</span>내 시험지에 담아 내보내기
                  </li>
                </ol>
                <div className={styles.emptyNote}>
                  자동 문자 인식은 아직 연결되지 않았어요.
                  <br />
                  자른 이미지 또는 직접 입력한 내용을 사용합니다.
                </div>
              </div>
            )}
          </div>
          <footer className={styles.inspectorFooter}>
            <div>
              <span>내 시험지에 담을 문제</span>
              <strong>
                {pendingCount}
                <small>문항</small>
              </strong>
            </div>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={!pendingCount}
              onClick={() => addProblems()}
            >
              <Icon name="plus" />
              {pendingCount
                ? `${pendingCount}문항 담기`
                : crops.length
                  ? "모두 담았습니다"
                  : "문제를 먼저 잘라 주세요"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!crops.length}
              onClick={() => addProblems(true)}
            >
              담고 내보내기 <Icon name="arrow" width="16" height="16" />
            </button>
          </footer>
        </aside>
      </div>
    </section>
  );
}
