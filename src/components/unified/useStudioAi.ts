"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useDevAi } from "./useDevAi";
import { useStudioFigureAi } from "./useStudioFigureAi";
import type { StudioCrop } from "./studioHelpers";
import {
  studioAiRect,
  studioAiFigures,
  studioAiSnapshotMatches,
  studioCropImage,
  studioFiguresEqual,
  studioImageCanvas,
  studioRectsOverlap,
  studioRotateCanvas,
} from "./studioAiHelpers";

import { StudioAiQueue } from "./studioAiQueue";
import type { DevAiDetectedGrade } from "@/lib/dev-ai/contracts";
import {
  assembleOcrText,
  validateOcrAgainstTextLayer,
  type TextLayerWarning,
} from "@/lib/mathgen/textLayerValidator";

export interface StudioAiPage {
  sourceId: string;
  sourceLabel: string;
  page: number;
  canvas: HTMLCanvasElement;
  imageDataUrl: string;
  grade: string;
  level: StudioCrop["level"];
  referenceText?: string;
}

export interface StudioAiPageTask extends Omit<
  StudioAiPage,
  "canvas" | "imageDataUrl"
> {
  load: (
    signal: AbortSignal,
    extraRotation?: number,
  ) => Promise<Pick<StudioAiPage, "canvas" | "imageDataUrl" | "referenceText">>;
}

export interface StudioAiPageJob {
  key: string;
  sourceId: string;
  page: number;
  state:
    | "queued"
    | "rendering"
    | "running"
    | "complete"
    | "empty"
    | "error"
    | "cancelled";
  startedAt?: number;
  error?: string;
  detectedGrade?: DevAiDetectedGrade;
  rotationAutoRetried?: boolean;
  textLayerWarning?: TextLayerWarning;
  warnings?: string[];
}

export interface StudioAiPageProgress {
  done: number;
  total: number;
  queued: number;
  running: number;
  failed: number;
  startedAt: number | null;
}

type CropAction = "ocr" | "figures" | "solution";
export interface StudioAiCropJob {
  cropId: string;
  action: CropAction;
  state: "queued" | "running" | "complete" | "error" | "cancelled";
  startedAt?: number;
  error?: string;
}
interface CropEntry {
  job: StudioAiCropJob;
  controller: AbortController;
  promise: Promise<void>;
  skipped?: boolean;
  upsideDown?: boolean;
  expected?: StudioCrop;
}
// Kept structural while the protocol and Studio helpers roll out together.
interface CropQuestionType {
  questionType?: "multiple-choice" | "short-answer" | "descriptive";
}
function questionTypePatch(value: CropQuestionType): CropQuestionType {
  const { questionType } = value;
  return questionType === "multiple-choice" ||
    questionType === "short-answer" ||
    questionType === "descriptive"
    ? { questionType }
    : {};
}
const cropSnapshotMatches = (
  current: StudioCrop | undefined,
  snapshot: StudioCrop,
) =>
  studioAiSnapshotMatches(current, snapshot) &&
  (current as CropQuestionType | undefined)?.questionType ===
    (snapshot as CropQuestionType).questionType;
interface Progress {
  action: CropAction | "page-ocr";
  done: number;
  total: number;
  cropId?: string;
  startedAt: number;
}
interface PageEntry {
  job: StudioAiPageJob;
  task?: StudioAiPageTask;
  controller: AbortController;
  promise: Promise<void>;
  extraRotation?: number;
  referenceText?: string;
  ocrWave?: Map<string, StudioCrop>;
}
const pageKey = (sourceId: string, page: number) => `${sourceId}:${page}`;
const cropKey = (cropId: string, action: CropAction) =>
  JSON.stringify([cropId, action]);
const cropBusy = (job: StudioAiCropJob) =>
  job.state === "queued" || job.state === "running";
const pageBusy = (job: StudioAiPageJob) =>
  job.state === "queued" ||
  job.state === "rendering" ||
  job.state === "running";

export function useStudioAi({
  crops,
  setCrops,
  contextKey,
  active,
  figuresDeferred = false,
  onDetected,
  onRotatePage,
}: {
  crops: StudioCrop[];
  setCrops: Dispatch<SetStateAction<StudioCrop[]>>;
  contextKey: string;
  active: boolean;
  /**
   * ② 영역 지정에 있는 동안 참 — 인식이 찾아낸 도형을 **바로 만들지 않고** 미뤄 둔다(원장님 2026-09-21).
   * 도형 칸은 ② 에서 고치는 일이 잦은데, 인식과 같이 돌리면 고친 뒤에 같은 도형을 한 번 더 만든다(유료 호출).
   * 거짓이 되면(③ 으로 넘어가면) 미뤄 둔 것을 그때 만든다. 이미 만든 도형은 `figureAi.run` 이 건너뛴다.
   */
  figuresDeferred?: boolean;
  onDetected: (id: string) => void;
  onRotatePage?: (sourceId: string, page: number, delta: number) => void;
}) {
  const ai = useDevAi();
  const [queue] = useState(() => new StudioAiQueue());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [cropJobs, setCropJobs] = useState<StudioAiCropJob[]>([]);
  const [pageJobs, setPageJobs] = useState<StudioAiPageJob[]>([]);
  const [message, setMessage] = useState("");
  const provider = ai.status?.providers.find((item) => item.id === ai.provider);
  const available = Boolean(
    ai.status?.enabled &&
    provider &&
    ["ready", "unverified"].includes(provider.status),
  );
  const figureAi = useStudioFigureAi({ crops, setCrops, queue, ai, available });
  const cancelFigures = figureAi.cancel;
  const pages = useRef(new Map<string, PageEntry>());
  const cropEntries = useRef(new Map<string, CropEntry>());
  const cropWave = useRef({ keys: new Set<string>(), startedAt: 0 });
  const pendingCropApplications = useRef<
    { entry: CropEntry; expected: StudioCrop }[]
  >([]);
  const mounted = useRef(true);
  const pendingDetected = useRef<
    { id: string; key: string; signal: AbortSignal }[]
  >([]);
  const pendingFigureCrops = useRef<string[]>([]);
  const pendingOcrCrops = useRef<{ id: string; signal: AbortSignal }[]>([]);
  const pendingRotations = useRef<
    { entry: PageEntry; owned: Map<string, StudioCrop> }[]
  >([]);
  const latest = useRef({
    crops,
    contextKey,
    active,
    onDetected,
    onRotatePage,
  });
  useLayoutEffect(() => {
    latest.current = { crops, contextKey, active, onDetected, onRotatePage };
    for (const { entry, owned } of pendingRotations.current.splice(0)) {
      if (
        entry.controller.signal.aborted ||
        pages.current.get(entry.job.key) !== entry
      )
        continue;
      if (
        crops.some(
          (crop) =>
            owned.has(crop.id) ||
            (crop.sourceId === entry.job.sourceId &&
              crop.page === entry.job.page),
        )
      ) {
        setCrops((previous) => [
          ...previous,
          ...[...owned.values()].filter(
            (crop) => !previous.some((current) => current.id === crop.id),
          ),
        ]);
        entry.job = {
          ...entry.job,
          state: "complete",
          warnings: [
            ...(entry.job.warnings ?? []),
            "수정한 문항을 보존하기 위해 자동 회전을 중단했습니다. 원본 방향을 확인해 주세요.",
          ],
        };
        entry.task = undefined;
        publishPages();
        continue;
      }
      try {
        latest.current.onRotatePage?.(entry.job.sourceId, entry.job.page, 180);
        entry.extraRotation = (entry.extraRotation ?? 0) + 180;
        // The next pass uses a different source render. Keep original warnings
        // when rotation was declined, but do not carry them into a failed retry.
        entry.job = { ...entry.job, warnings: undefined };
        if (entry.task)
          entry.promise = queue.enqueue(entry.controller.signal, () =>
            executePage(entry, entry.task!),
          );
      } catch (cause) {
        setCrops((previous) => [
          ...previous,
          ...[...owned.values()].filter(
            (crop) => !previous.some((current) => current.id === crop.id),
          ),
        ]);
        entry.job = {
          ...entry.job,
          state: "error",
          error:
            cause instanceof Error
              ? cause.message
              : "원본 회전에 실패했습니다.",
        };
        publishPages();
      }
    }
    // Notify only after insertion commits, so a concurrent manual crop cannot
    // leave selection pointing at a duplicate that the state updater rejected.
    for (const detection of pendingDetected.current.splice(0)) {
      if (
        active &&
        contextKey === detection.key &&
        !detection.signal.aborted &&
        crops.some((crop) => crop.id === detection.id)
      )
        onDetected(detection.id);
    }
    // ② 에서는 비우지 않고 들고 있다 — 그사이 지운 문제는 `run` 이 지금의 문제 목록에서 못 찾아 자연히 빠진다.
    if (!figuresDeferred) {
      const figureCrops = pendingFigureCrops.current.splice(0);
      if (figureCrops.length) void figureAi.run(figureCrops);
    }
    // Crop jobs enter the same FIFO only after insertion commits. Waiting for
    // children inside a running page slot could deadlock two active pages.
    const ocrCrops = pendingOcrCrops.current
      .splice(0)
      .filter(
        (job) =>
          !job.signal.aborted && crops.some((crop) => crop.id === job.id),
      );
    if (ocrCrops.length)
      void processCrops(
        "ocr",
        ocrCrops.map((job) => job.id),
      );
  });

  const publishPages = useCallback(() => {
    if (mounted.current)
      setPageJobs(Array.from(pages.current.values(), (entry) => entry.job));
  }, []);

  const publishCrops = useCallback(() => {
    if (!mounted.current) return;
    setCropJobs(Array.from(cropEntries.current.values(), (entry) => entry.job));
    const wave = Array.from(cropWave.current.keys).flatMap((key) => {
      const entry = cropEntries.current.get(key);
      return entry ? [entry.job] : [];
    });
    const current =
      wave.find((job) => job.state === "running") ?? wave.find(cropBusy);
    setProgress(
      current
        ? {
            action: current.action,
            cropId: current.cropId,
            done: wave.filter((job) => !cropBusy(job)).length,
            total: wave.length,
            startedAt: cropWave.current.startedAt,
          }
        : null,
    );
  }, []);

  const cancelCropJob = useCallback(
    (id: string, action?: CropAction) => {
      for (const entry of cropEntries.current.values()) {
        if (
          entry.job.cropId === id &&
          (!action || entry.job.action === action) &&
          cropBusy(entry.job)
        ) {
          entry.job = { ...entry.job, state: "cancelled" };
          entry.controller.abort();
        }
      }
      publishCrops();
    },
    [publishCrops],
  );

  const cancelCrop = useCallback(
    (clear = false) => {
      let cancelled = false;
      for (const entry of cropEntries.current.values()) {
        if (cropBusy(entry.job)) {
          entry.job = { ...entry.job, state: "cancelled" };
          cancelled = true;
          entry.controller.abort();
        } else if (clear) entry.controller.abort();
      }
      if (clear) {
        cropEntries.current.clear();
        cropWave.current.keys.clear();
        pendingCropApplications.current = [];
        setMessage("");
      } else if (cancelled)
        setMessage(
          "AI 작업을 취소했습니다. 완료된 결과와 직접 수정한 내용은 유지됩니다.",
        );
      publishCrops();
    },
    [publishCrops],
  );

  const cancel = useCallback(
    (clear = false) => {
      cancelFigures(undefined, undefined, clear);
      pendingFigureCrops.current = [];
      pendingOcrCrops.current = [];
      if (!clear && pendingRotations.current.length) {
        const retained = pendingRotations.current.flatMap(({ owned }) => [
          ...owned.values(),
        ]);
        setCrops((previous) => [
          ...previous,
          ...retained.filter(
            (crop) => !previous.some((current) => current.id === crop.id),
          ),
        ]);
      }
      pendingRotations.current = [];
      let cancelled = false;
      for (const entry of pages.current.values()) {
        if (pageBusy(entry.job)) {
          entry.job = { ...entry.job, state: "cancelled" };
          cancelled = true;
          entry.controller.abort();
        } else if (clear) entry.controller.abort();
      }
      if (clear) pages.current.clear();
      pendingDetected.current = [];
      publishPages();
      cancelCrop(clear);
      if (!clear && cancelled)
        setMessage(
          "AI 작업을 취소했습니다. 완료된 결과와 직접 수정한 내용은 유지됩니다.",
        );
    },
    [cancelCrop, publishPages, cancelFigures, setCrops],
  );

  // A provider-wide cancel reaches queued owners before aborting requests.
  const { subscribeCancel } = ai;
  useEffect(
    () => subscribeCancel(() => cancel(false)),
    [subscribeCancel, cancel],
  );

  useLayoutEffect(() => {
    const ids = new Set(crops.map((crop) => crop.id));
    let changed = false;
    // A manual edit may be batched with the AI state updater before latest is
    // refreshed. Report the updater's rejected result as cancelled after commit.
    for (const { entry, expected } of pendingCropApplications.current.splice(
      0,
    )) {
      if (
        entry.job.state === "complete" &&
        cropEntries.current.get(cropKey(entry.job.cropId, entry.job.action)) ===
          entry &&
        !cropSnapshotMatches(
          crops.find((crop) => crop.id === expected.id),
          expected,
        )
      ) {
        entry.job = { ...entry.job, state: "cancelled" };
        entry.skipped = true;
        changed = true;
      }
    }
    for (const entry of cropEntries.current.values()) {
      if (!ids.has(entry.job.cropId) && cropBusy(entry.job)) {
        entry.job = { ...entry.job, state: "cancelled" };
        entry.controller.abort();
        changed = true;
      }
    }
    // Removal cancels owners; selection, source navigation and tabs do not.
    if (changed) publishCrops();
    settlePageOcr();
  });

  useEffect(() => {
    mounted.current = true;
    const entries = pages.current;
    const crops = cropEntries.current;
    return () => {
      mounted.current = false;
      for (const entry of crops.values()) entry.controller.abort();
      crops.clear();
      pendingCropApplications.current = [];
      for (const entry of entries.values()) entry.controller.abort();
      entries.clear();
      pendingDetected.current = [];
    };
  }, []);

  const unavailableReason =
    ai.statusError ||
    (ai.checking
      ? "AI 연결 확인 중"
      : !ai.status?.enabled
        ? "개발용 AI 연결이 꺼져 있습니다. 연결 상태를 확인해 주세요."
        : provider?.detail || "AI 도구를 선택해 주세요.");
  const pageProgress: StudioAiPageProgress = {
    done: 0,
    total: pageJobs.length,
    queued: 0,
    running: 0,
    failed: 0,
    startedAt: null,
  };
  for (const job of pageJobs) {
    if (job.state === "complete" || job.state === "empty") pageProgress.done++;
    if (job.state === "queued") pageProgress.queued++;
    if (job.state === "rendering" || job.state === "running")
      pageProgress.running++;
    if (job.state === "error") pageProgress.failed++;
    if (job.startedAt !== undefined)
      pageProgress.startedAt = Math.min(
        pageProgress.startedAt ?? job.startedAt,
        job.startedAt,
      );
  }
  const running = Boolean(
    cropJobs.some(cropBusy) ||
    figureAi.running ||
    pageProgress.queued ||
    pageProgress.running,
  );
  const error = cropJobs.find((job) => job.state === "error")?.error ?? "";

  // Crop requests release their FIFO slots before this commit-time aggregation.
  // The source uses strict majority orientation votes, excluding failed crops.
  function settlePageOcr() {
    for (const entry of pages.current.values()) {
      const owned = entry.ocrWave;
      if (!owned || entry.controller.signal.aborted || !pageBusy(entry.job))
        continue;
      const current = latest.current.crops.filter(
        (crop) =>
          crop.sourceId === entry.job.sourceId && crop.page === entry.job.page,
      );
      const jobs = [...owned.keys()].flatMap((id) => {
        const job = cropEntries.current.get(cropKey(id, "ocr"));
        return job ? [job] : [];
      });
      if (
        jobs.some((item) => cropBusy(item.job)) ||
        [...owned.keys()].some(
          (id) =>
            current.some((crop) => crop.id === id) &&
            !cropEntries.current.has(cropKey(id, "ocr")),
        )
      )
        continue;
      entry.ocrWave = undefined;
      const votes = jobs.flatMap((item) =>
        item.job.state === "complete" && typeof item.upsideDown === "boolean"
          ? [item.upsideDown]
          : [],
      );
      const upsideDown =
        votes.length > 0 && votes.filter(Boolean).length * 2 > votes.length;
      const expected = new Map(
        [...owned].map(([id, original]) => [
          id,
          cropEntries.current.get(cropKey(id, "ocr"))?.expected ?? original,
        ]),
      );
      const unchanged = (items: StudioCrop[]) =>
        items.filter(
          (crop) =>
            crop.sourceId === entry.job.sourceId &&
            crop.page === entry.job.page,
        ).length === expected.size &&
        [...expected].every(([id, snapshot]) =>
          cropSnapshotMatches(
            items.find((crop) => crop.id === id),
            snapshot,
          ),
        );
      const cancelled = jobs.some((item) => item.job.state === "cancelled");
      if (
        upsideDown &&
        !entry.job.rotationAutoRetried &&
        entry.task &&
        latest.current.onRotatePage &&
        !cancelled &&
        unchanged(latest.current.crops)
      ) {
        entry.job = {
          ...entry.job,
          state: "queued",
          rotationAutoRetried: true,
          textLayerWarning: undefined,
        };
        for (const [key, cropEntry] of cropEntries.current) {
          if (!owned.has(cropEntry.job.cropId)) continue;
          cropEntry.controller.abort();
          cropEntries.current.delete(key);
          cropWave.current.keys.delete(key);
        }
        for (const id of owned.keys()) cancelFigures(id);
        pendingCropApplications.current =
          pendingCropApplications.current.filter(
            (item) => !owned.has(item.expected.id),
          );
        pendingFigureCrops.current = pendingFigureCrops.current.filter(
          (id) => !owned.has(id),
        );
        pendingRotations.current.push({ entry, owned: expected });
        setCrops((previous) =>
          unchanged(previous) && !entry.controller.signal.aborted
            ? previous.filter((crop) => !owned.has(crop.id))
            : previous,
        );
        publishCrops();
        publishPages();
        continue;
      }
      const textLayerWarning =
        validateOcrAgainstTextLayer(
          assembleOcrText(
            current.map((crop) => ({
              text: crop.content,
              answer: crop.answer,
            })),
          ),
          entry.referenceText ?? "",
        ) ?? undefined;
      entry.job = {
        ...entry.job,
        state: "complete",
        textLayerWarning,
        ...(upsideDown
          ? {
              warnings: [
                ...(entry.job.warnings ?? []),
                entry.job.rotationAutoRetried
                  ? "자동 회전 후에도 원본 방향 확인이 필요합니다. 추가 자동 인식은 하지 않습니다."
                  : latest.current.onRotatePage
                    ? "수정한 문항을 보존하기 위해 자동 회전을 하지 않았습니다. 원본 방향을 확인해 주세요."
                    : "원본이 180도 뒤집혀 있습니다. 원본 방향을 확인해 주세요.",
              ],
            }
          : {}),
      };
      entry.task = undefined;
      pendingFigureCrops.current.push(
        ...jobs
          .filter(
            (item) =>
              item.job.state === "complete" && !item.expected?.ocr?.bodyMissing,
          )
          .map((item) => item.job.cropId),
      );
      publishPages();
    }
  }

  async function executePage(entry: PageEntry, task: StudioAiPageTask) {
    const { controller } = entry;
    const stale = () =>
      controller.signal.aborted ||
      !mounted.current ||
      pages.current.get(entry.job.key) !== entry;
    const update = (patch: Partial<StudioAiPageJob>) => {
      if (stale()) return;
      entry.job = { ...entry.job, ...patch };
      publishPages();
    };
    try {
      update({ state: "rendering", startedAt: Date.now() });
      const loaded = entry.extraRotation
        ? await task.load(controller.signal, entry.extraRotation)
        : await task.load(controller.signal);
      if (stale()) return;
      const page = { ...task, ...loaded };
      entry.referenceText = page.referenceText;
      update({ state: "running" });
      const response = await ai.run(
        {
          action: "page-ocr",
          imageDataUrl: page.imageDataUrl,
          grade: page.grade,
          sourceName: page.sourceLabel,
        },
        controller.signal,
      );
      if (stale()) return;
      const recognized = response.result.problems;
      if (!Array.isArray(recognized))
        throw new Error(
          "문제 인식 결과를 확인하지 못했습니다. 다시 시도해 주세요.",
        );
      update({
        detectedGrade: response.result.detectedGrade,
        warnings: response.result.warnings,
      });
      if (!recognized.length) {
        entry.task = undefined;
        update({ state: "empty" });
        return;
      }
      const existing = latest.current.crops.filter(
        (crop) => crop.sourceId === page.sourceId && crop.page === page.page,
      );
      const detected: StudioCrop[] = [];
      let invalid = 0;
      for (const item of recognized) {
        const rect = studioAiRect(item.bbox);
        if (!rect) {
          invalid++;
          continue;
        }
        if (
          [...existing, ...detected].some((crop) =>
            studioRectsOverlap(crop.rect, rect),
          )
        )
          continue;
        try {
          const figures =
            item.figures === undefined
              ? undefined
              : studioAiFigures(page.canvas, item.figures, rect);
          detected.push({
            id: crypto.randomUUID(),
            sourceId: page.sourceId,
            sourceLabel: page.sourceLabel,
            page: page.page,
            rect,
            image: studioCropImage(page.canvas, rect),
            ...(figures ? { figures: figures.figures } : {}),
            sourceSize: {
              width: page.canvas.width,
              height: page.canvas.height,
            },
            reviewed: false,
            content: item.content,
            ...(item.ocr
              ? { ocr: item.ocr }
              : item.number
                ? {
                    ocr: {
                      number: item.number,
                      blocks: [],
                      choiceGroups: [],
                      subQuestions: [],
                      confidence: "low" as const,
                      choicesLayout: "auto" as const,
                      bodyMissing: true,
                      choicesMissing: false,
                    },
                  }
                : {}),
            answer: item.answer,
            ...questionTypePatch(item as CropQuestionType),
            solution: "",
            grade: page.grade,
            level: page.level,
            mode: item.content.trim() ? "text" : "image",
            aiWarnings: [
              ...response.result.warnings,
              ...(figures?.warnings ?? []),
            ],
          });
        } catch {
          invalid++;
        }
      }
      if (!detected.length && invalid)
        throw new Error(
          "문제 영역을 확인하지 못했습니다. 다시 시도하거나 직접 잘라 주세요.",
        );
      if (detected[0])
        pendingDetected.current.push({
          id: detected[0].id,
          key: entry.job.key,
          signal: controller.signal,
        });
      if (response.result.detectionOnly) {
        entry.ocrWave = new Map(detected.map((crop) => [crop.id, crop]));
        pendingOcrCrops.current.push(
          ...detected.map((crop) => ({
            id: crop.id,
            signal: controller.signal,
          })),
        );
      } else {
        pendingFigureCrops.current.push(...detected.map((crop) => crop.id));
      }
      setCrops((previous) => {
        if (stale()) return previous;
        const additions = detected.filter(
          (candidate) =>
            !previous.some(
              (crop) =>
                crop.sourceId === page.sourceId &&
                crop.page === page.page &&
                studioRectsOverlap(crop.rect, candidate.rect),
            ),
        );
        if (!additions.length) return previous;
        const combined = [...previous, ...additions];
        // Order the source's pages independently of request completion, while
        // keeping other sources in place and preserving within-page reading order.
        const sourceCrops = combined
          .filter((crop) => crop.sourceId === page.sourceId)
          .sort((a, b) => a.page - b.page);
        let sourceIndex = 0;
        return combined.map((crop) =>
          crop.sourceId === page.sourceId ? sourceCrops[sourceIndex++] : crop,
        );
      });
      // Retain loaders only for retryable outcomes; completed eager single-page
      // requests must not keep their full canvas alive in queue history.
      if (!response.result.detectionOnly) {
        entry.task = undefined;
        update({
          state: "complete",
          textLayerWarning:
            validateOcrAgainstTextLayer(
              assembleOcrText(
                detected.map((crop) => ({
                  text: crop.content,
                  answer: crop.answer,
                })),
              ),
              page.referenceText ?? "",
            ) ?? undefined,
        });
      }
    } catch (cause) {
      if (stale()) return;
      if (cause instanceof Error && cause.name === "AbortError")
        update({ state: "cancelled" });
      else
        update({
          state: "error",
          error:
            cause instanceof Error ? cause.message : "AI 처리에 실패했습니다.",
        });
    }
  }

  function enqueuePage(task: StudioAiPageTask, rerun = false): Promise<void> {
    if (!mounted.current || !available) return Promise.resolve();
    const key = pageKey(task.sourceId, task.page);
    const previous = pages.current.get(key);
    if (
      previous &&
      (pageBusy(previous.job) ||
        (!rerun &&
          (previous.job.state === "complete" ||
            previous.job.state === "empty")))
    )
      return previous.promise;
    // Snapshot metadata now, before a queued page or the current source is edited.
    const snapshot = { ...task };
    const entry: PageEntry = {
      job: {
        key,
        sourceId: snapshot.sourceId,
        page: snapshot.page,
        state: "queued",
        ...(previous?.job.rotationAutoRetried
          ? { rotationAutoRetried: true }
          : {}),
      },
      task: snapshot,
      ...(previous?.task === task
        ? { extraRotation: previous.extraRotation }
        : {}),
      controller: new AbortController(),
      promise: Promise.resolve(),
    };
    pages.current.set(key, entry);
    publishPages();
    entry.promise = queue.enqueue(entry.controller.signal, () =>
      executePage(entry, snapshot),
    );
    return entry.promise;
  }

  async function recognizePages(
    tasks: StudioAiPageTask[],
    options: { force?: boolean } = {},
  ) {
    await Promise.all(tasks.map((task) => enqueuePage(task, options.force)));
  }

  async function retryPages() {
    await recognizePages(
      Array.from(pages.current.values()).flatMap((entry) =>
        entry.job.state === "error" && entry.task ? [entry.task] : [],
      ),
    );
  }

  async function executeCrop(entry: CropEntry, snapshot: StudioCrop) {
    const { controller, job } = entry;
    const stale = () =>
      controller.signal.aborted ||
      !mounted.current ||
      cropEntries.current.get(cropKey(job.cropId, job.action)) !== entry;
    const update = (patch: Partial<StudioAiCropJob>) => {
      if (stale()) return;
      entry.job = { ...entry.job, ...patch };
      publishCrops();
    };
    const matches = () =>
      cropSnapshotMatches(
        latest.current.crops.find((crop) => crop.id === snapshot.id),
        snapshot,
      );
    const skip = () => {
      entry.skipped = true;
      update({ state: "cancelled" });
    };
    try {
      if (stale()) return;
      if (!matches()) return skip();
      if (job.action === "solution" && !snapshot.content.trim())
        throw new Error(
          "문제 내용을 먼저 입력하거나 문자 인식을 실행해 주세요.",
        );
      update({ state: "running", startedAt: Date.now() });
      const response = await ai.run(
        {
          action: job.action,
          imageDataUrl: snapshot.image,
          content: snapshot.content,
          ...(snapshot.ocr ? { ocr: snapshot.ocr } : {}),
          ...(job.action === "solution" && snapshot.difficulty
            ? { difficulty: snapshot.difficulty }
            : {}),
          grade: snapshot.grade,
          sourceName: snapshot.sourceLabel,
        },
        controller.signal,
      );
      if (stale()) return;
      if (!matches()) return skip();
      const result = response.result;
      if (entry.job.action === "ocr" && !result.content.trim())
        throw new Error(
          "문자 인식 결과가 비어 있습니다. 원본 영역을 확인하고 다시 시도해 주세요.",
        );
      if (entry.job.action === "solution" && !result.solution.trim())
        throw new Error(
          "해설 결과가 비어 있습니다. 문제 내용을 확인하고 다시 시도해 주세요.",
        );
      let patch: Partial<StudioCrop> & CropQuestionType;
      const warnings = [...result.warnings];
      if (entry.job.action === "figures") {
        if (!result.figures)
          throw new Error(
            "그림 영역 결과가 없습니다. 원본은 유지됩니다. 다시 시도해 주세요.",
          );
        patch = { figures: [] };
        if (result.figures.length) {
          const canvas = await studioImageCanvas(
            snapshot.image,
            controller.signal,
          );
          if (stale()) return;
          if (
            !cropSnapshotMatches(
              latest.current.crops.find((crop) => crop.id === snapshot.id),
              snapshot,
            )
          ) {
            skip();
            return;
          }
          const detected = studioAiFigures(
            canvas,
            result.figures,
            snapshot.rect,
            snapshot.rect,
          );
          patch.figures = detected.figures;
          if (!snapshot.sourceSize)
            patch.sourceSize = {
              width: canvas.width / snapshot.rect.width,
              height: canvas.height / snapshot.rect.height,
            };
          warnings.push(...detected.warnings);
        }
        // Repeated identical detection keeps stable figure IDs and review state.
        if (
          studioFiguresEqual(snapshot.figures, patch.figures, false) &&
          snapshot.figures
        )
          patch.figures = snapshot.figures;
      } else {
        patch =
          entry.job.action === "ocr"
            ? {
                content: result.content,
                ocr: result.ocr
                  ? {
                      ...result.ocr,
                      number: snapshot.ocr?.number ?? result.ocr.number,
                    }
                  : undefined,
                ...(!snapshot.modeManual ? { mode: "text" as const } : {}),
                ...questionTypePatch(result as CropQuestionType),
                // 다시 읽으면 새 판정으로 바꾼다(못 정했으면 옛 값을 지운다)
                difficulty: result.difficulty,
                answer: result.answer,
                solution: "",
              }
            : { answer: result.answer, solution: result.solution };
      }
      // The OCR response also carries figures from the same crop. Existing
      // manual/edited figures stay intact; explicit figure detection replaces them.
      if (
        job.action === "ocr" &&
        result.figures?.length &&
        !snapshot.figures?.length
      ) {
        const canvas = await studioImageCanvas(
          snapshot.image,
          controller.signal,
        );
        if (stale()) return;
        if (!matches()) return skip();
        const detected = studioAiFigures(
          canvas,
          result.figures,
          snapshot.rect,
          snapshot.rect,
        );
        patch.figures = detected.figures;
        warnings.push(...detected.warnings);
        if (!snapshot.sourceSize)
          patch.sourceSize = {
            width: canvas.width / snapshot.rect.width,
            height: canvas.height / snapshot.rect.height,
          };
      }
      const changed =
        (job.action === "ocr" &&
          JSON.stringify(patch.ocr) !== JSON.stringify(snapshot.ocr)) ||
        (patch.mode !== undefined && patch.mode !== snapshot.mode) ||
        (patch.questionType !== undefined &&
          patch.questionType !== (snapshot as CropQuestionType).questionType) ||
        (patch.content !== undefined && patch.content !== snapshot.content) ||
        (patch.answer !== undefined && patch.answer !== snapshot.answer) ||
        (patch.solution !== undefined &&
          patch.solution !== snapshot.solution) ||
        (patch.figures !== undefined &&
          !studioFiguresEqual(patch.figures, snapshot.figures, false));
      const appliedPatch = {
        ...patch,
        aiWarnings: warnings,
        ...(changed
          ? {
              reviewed: false,
              revision: (snapshot.revision ?? 0) + 1,
            }
          : {}),
      };
      pendingCropApplications.current.push({
        entry,
        expected: { ...snapshot, ...appliedPatch },
      });
      entry.expected = { ...snapshot, ...appliedPatch };
      if (job.action === "ocr") entry.upsideDown = result.upsideDown;
      const pageOwner = pages.current.get(
        pageKey(snapshot.sourceId, snapshot.page),
      );
      if (
        (job.action === "ocr" &&
          !patch.ocr?.bodyMissing &&
          !pageOwner?.ocrWave?.has(snapshot.id)) ||
        job.action === "figures"
      )
        pendingFigureCrops.current.push(snapshot.id);
      setCrops((previous) =>
        stale()
          ? previous
          : previous.map((crop) =>
              cropSnapshotMatches(crop, snapshot)
                ? {
                    ...crop,
                    ...appliedPatch,
                    ...(patch.figures &&
                    crop.figures &&
                    studioFiguresEqual(patch.figures, crop.figures, false)
                      ? { figures: crop.figures }
                      : {}),
                  }
                : crop,
            ),
      );
      update({ state: "complete" });
    } catch (cause) {
      if (stale()) return;
      if (cause instanceof Error && cause.name === "AbortError")
        update({ state: "cancelled" });
      else
        update({
          state: "error",
          error:
            cause instanceof Error ? cause.message : "AI 처리에 실패했습니다.",
        });
    }
  }

  function enqueueCrop(id: string, action: CropAction): CropEntry | undefined {
    if (!mounted.current || !available) return;
    const key = cropKey(id, action);
    const previous = cropEntries.current.get(key);
    if (previous && cropBusy(previous.job)) return previous;
    const crop = latest.current.crops.find((item) => item.id === id);
    if (!crop) return;
    // Every request keeps the content, image and edit generation from enqueue.
    // A retry captures fresh input, but a waiting job cannot adopt manual edits.
    const snapshot = {
      ...crop,
      rect: { ...crop.rect },
      figures: crop.figures?.map((figure) => ({
        ...figure,
        rect: { ...figure.rect },
      })),
      sourceSize: crop.sourceSize ? { ...crop.sourceSize } : undefined,
    };
    const entry: CropEntry = {
      job: { cropId: id, action, state: "queued" },
      controller: new AbortController(),
      promise: Promise.resolve(),
    };
    cropEntries.current.set(key, entry);
    cropWave.current.keys.add(key);
    publishCrops();
    entry.promise = queue.enqueue(entry.controller.signal, () =>
      executeCrop(entry, snapshot),
    );
    return entry;
  }

  async function processCrops(action: CropAction, ids: string[]) {
    if (
      !Array.from(cropEntries.current.values()).some((entry) =>
        cropBusy(entry.job),
      )
    ) {
      cropWave.current = { keys: new Set(), startedAt: Date.now() };
      setMessage("");
    }
    const entries = [...new Set(ids)].flatMap((id) => {
      const entry = enqueueCrop(id, action);
      return entry ? [entry] : [];
    });
    await Promise.all(entries.map((entry) => entry.promise));
    if (
      !mounted.current ||
      !entries.length ||
      entries.every(
        (entry) =>
          entry.controller.signal.aborted ||
          cropEntries.current.get(cropKey(entry.job.cropId, action)) !== entry,
      )
    )
      return;
    const completed = entries.filter(
      (entry) => entry.job.state === "complete",
    ).length;
    const skipped = entries.filter((entry) => entry.skipped).length;
    setMessage(
      `${action === "ocr" ? "문자 인식" : action === "figures" ? "도형 인식" : "해설 생성"} ${completed}문항 완료.${skipped ? ` 수정되거나 제외된 ${skipped}문항은 유지했습니다.` : ""} 원본과 결과를 확인해 주세요.`,
    );
  }

  async function retryCrop(id: string, action: CropAction) {
    if (cropEntries.current.get(cropKey(id, action))?.job.state === "error")
      await processCrops(action, [id]);
  }

  async function retry() {
    const failed = Array.from(cropEntries.current.values()).filter(
      (entry) => entry.job.state === "error",
    );
    await Promise.all([
      ...failed.map((entry) => retryCrop(entry.job.cropId, entry.job.action)),
      retryPages(),
    ]);
  }

  const restorePageJobs = useCallback(
    (completed: StudioAiPageJob[]) => {
      let changed = false;
      for (const job of completed) {
        if (
          !job ||
          (job.state !== "complete" && job.state !== "empty") ||
          typeof job.sourceId !== "string" ||
          !job.sourceId ||
          !Number.isInteger(job.page) ||
          job.page < 1
        )
          continue;
        const key = pageKey(job.sourceId, job.page);
        // Never overwrite a live owner or enqueue work while hydrating a session.
        if (pages.current.has(key)) continue;
        pages.current.set(key, {
          job: { ...job, key },
          controller: new AbortController(),
          promise: Promise.resolve(),
        });
        changed = true;
      }
      if (changed) publishPages();
    },
    [publishPages],
  );

  /**
   * 편집기에서 직접 누른 요청(«다시 그리기»·«요청대로 고치기») — 같은 대기열의 **맨 앞**에 세워 보낸다.
   * 전에는 `ai.run` 으로 바로 나가, 일괄 생성이 서버의 계정당 두 자리를 쓰는 동안에는 세 번째 요청이 되어
   * 429 로 거절됐다(원장님 운영 콘솔 2026-09-21). 기다리다 취소되면 AbortError 로 끝난다.
   */
  const runInteractive = (
    request: Parameters<typeof ai.run>[0],
    signal: AbortSignal = new AbortController().signal,
  ) =>
    new Promise<Awaited<ReturnType<typeof ai.run>>>((resolve, reject) => {
      let started = false;
      queue
        .enqueue(
          signal,
          async () => {
            started = true;
            try {
              resolve(await ai.run(request, signal));
            } catch (error) {
              reject(error);
            }
          },
          true,
        )
        .then(() => {
          if (!started)
            reject(new DOMException("요청을 취소했습니다.", "AbortError"));
        }, reject);
    });

  return {
    ai,
    runInteractive,
    available,
    unavailableReason,
    running,
    progress,
    cropJobs,
    figureAi,
    pageJobs,
    forgetPage: (sourceId: string, page: number) => {
      const key = pageKey(sourceId, page);
      const entry = pages.current.get(key);
      if (entry && pageBusy(entry.job)) return false;
      pages.current.delete(key);
      publishPages();
      return true;
    },
    restorePageJobs,
    pageProgress,
    message,
    error,
    cancel,
    cancelCrop,
    cancelCropJob,
    retryCrop,
    isCropBusy: (id: string, action?: CropAction) =>
      cropJobs.some(
        (job) =>
          job.cropId === id &&
          (!action || job.action === action) &&
          cropBusy(job),
      ),
    recognizePages,
    retryPages,
    isPageBusy: (sourceId: string, page: number) =>
      pageJobs.some(
        (job) => job.key === pageKey(sourceId, page) && pageBusy(job),
      ),
    recognizePage: (page: StudioAiPage) => {
      const { canvas, imageDataUrl, ...metadata } = page;
      return enqueuePage(
        {
          ...metadata,
          load: async (signal, extraRotation = 0) => {
            if (signal.aborted)
              throw new DOMException("cancelled", "AbortError");
            if (!extraRotation) return { canvas, imageDataUrl };
            // 폭·높이를 바꾸는 회전은 한 함수로(트랙 39) — 여기만 크기를 그대로 둬 90° 면 잘렸다
            const rotated = studioRotateCanvas(canvas, extraRotation);
            return {
              canvas: rotated,
              imageDataUrl: rotated.toDataURL("image/png"),
            };
          },
        },
        true,
      );
    },
    processCrops,
    runCrops: processCrops,
    retry,
  };
}
