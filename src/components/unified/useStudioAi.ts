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
import type { StudioCrop } from "./studioHelpers";
import {
  studioAiRect,
  studioAiFigures,
  studioAiSnapshotMatches,
  studioCropImage,
  studioFiguresEqual,
  studioImageCanvas,
  studioRectsOverlap,
} from "./studioAiHelpers";

import { StudioAiQueue } from "./studioAiQueue";
import type { DevAiDetectedGrade } from "@/lib/dev-ai/contracts";

export interface StudioAiPage {
  sourceId: string;
  sourceLabel: string;
  page: number;
  canvas: HTMLCanvasElement;
  imageDataUrl: string;
  grade: string;
  level: StudioCrop["level"];
}

export interface StudioAiPageTask extends Omit<
  StudioAiPage,
  "canvas" | "imageDataUrl"
> {
  load: (
    signal: AbortSignal,
  ) => Promise<Pick<StudioAiPage, "canvas" | "imageDataUrl">>;
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
  onDetected,
}: {
  crops: StudioCrop[];
  setCrops: Dispatch<SetStateAction<StudioCrop[]>>;
  contextKey: string;
  active: boolean;
  onDetected: (id: string) => void;
}) {
  const ai = useDevAi();
  const [queue] = useState(() => new StudioAiQueue());
  const [progress, setProgress] = useState<Progress | null>(null);
  const [cropJobs, setCropJobs] = useState<StudioAiCropJob[]>([]);
  const [pageJobs, setPageJobs] = useState<StudioAiPageJob[]>([]);
  const [message, setMessage] = useState("");
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
  const latest = useRef({ crops, contextKey, active, onDetected });
  useLayoutEffect(() => {
    latest.current = { crops, contextKey, active, onDetected };
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
    [cancelCrop, publishPages],
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
  }, [crops, publishCrops]);

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

  const provider = ai.status?.providers.find((item) => item.id === ai.provider);
  const available = Boolean(
    ai.status?.enabled &&
    provider &&
    ["ready", "unverified"].includes(provider.status),
  );
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
    cropJobs.some(cropBusy) || pageProgress.queued || pageProgress.running,
  );
  const error = cropJobs.find((job) => job.state === "error")?.error ?? "";

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
      const loaded = await task.load(controller.signal);
      if (stale()) return;
      const page = { ...task, ...loaded };
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
      update({ detectedGrade: response.result.detectedGrade });
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
            answer: item.answer,
            ...questionTypePatch(item as CropQuestionType),
            solution: "",
            grade: page.grade,
            level: page.level,
            mode: "image",
            added: false,
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
      entry.task = undefined;
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
      },
      task: snapshot,
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
                ...questionTypePatch(result as CropQuestionType),
                answer: result.answer,
                solution: "",
              }
            : { answer: result.answer, solution: result.solution };
      }
      const changed =
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
              added: false,
              reviewed: false,
              revision: (snapshot.revision ?? 0) + 1,
            }
          : {}),
      };
      pendingCropApplications.current.push({
        entry,
        expected: { ...snapshot, ...appliedPatch },
      });
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

  return {
    ai,
    available,
    unavailableReason,
    running,
    progress,
    cropJobs,
    pageJobs,
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
        { ...metadata, load: async () => ({ canvas, imageDataUrl }) },
        true,
      );
    },
    processCrops,
    runCrops: processCrops,
    retry,
  };
}
