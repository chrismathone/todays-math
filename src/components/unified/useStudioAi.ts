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
interface CropJob {
  action: CropAction;
  ids: string[];
}
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
  const [pageJobs, setPageJobs] = useState<StudioAiPageJob[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const pages = useRef(new Map<string, PageEntry>());
  const owned = useRef<AbortController | null>(null);
  const retryJob = useRef<CropJob | null>(null);
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

  const cancelCrop = useCallback((clear = false) => {
    const running = owned.current;
    owned.current = null;
    running?.abort();
    retryJob.current = null;
    setProgress(null);
    setError("");
    if (clear) setMessage("");
    else if (running)
      setMessage(
        "AI 작업을 취소했습니다. 완료된 결과와 직접 수정한 내용은 유지됩니다.",
      );
  }, []);

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

  useEffect(() => {
    // Navigation owns crop editing only; background pages keep their source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cancelCrop(true);
  }, [contextKey, active, cancelCrop]);

  useEffect(() => {
    mounted.current = true;
    const entries = pages.current;
    return () => {
      mounted.current = false;
      owned.current?.abort();
      owned.current = null;
      retryJob.current = null;
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
    progress || pageProgress.queued || pageProgress.running,
  );

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

  async function execute(job: CropJob) {
    if (
      owned.current ||
      !mounted.current ||
      !latest.current.active ||
      !available
    )
      return;
    const controller = new AbortController();
    owned.current = controller;
    retryJob.current = null;
    const origin = latest.current.contextKey;
    const stale = () =>
      controller.signal.aborted ||
      !mounted.current ||
      !latest.current.active ||
      latest.current.contextKey !== origin;
    const snapshots = job.ids
      .map((id) => latest.current.crops.find((crop) => crop.id === id))
      .filter((crop): crop is StudioCrop => Boolean(crop));
    const total = snapshots.length;
    const startedAt = Date.now();
    setError("");
    setMessage("");
    setProgress({ action: job.action, done: 0, total, startedAt });
    let completed = 0;
    let skipped = 0;
    return queue.enqueue(controller.signal, async () => {
      try {
        for (const snapshot of snapshots) {
          if (stale()) return;
          if (
            !studioAiSnapshotMatches(
              latest.current.crops.find((crop) => crop.id === snapshot.id),
              snapshot,
            )
          ) {
            skipped++;
            continue;
          }
          if (job.action === "solution" && !snapshot.content.trim()) {
            skipped++;
            continue;
          }
          setProgress({
            action: job.action,
            done: completed + skipped,
            total,
            cropId: snapshot.id,
            startedAt,
          });
          const response = await ai.run(
            {
              action: job.action,
              imageDataUrl: snapshot.image,
              content: snapshot.content,
              grade: snapshot.grade,
            },
            controller.signal,
          );
          if (stale()) return;
          if (
            !studioAiSnapshotMatches(
              latest.current.crops.find((crop) => crop.id === snapshot.id),
              snapshot,
            )
          ) {
            skipped++;
            continue;
          }
          const result = response.result;
          if (job.action === "ocr" && !result.content.trim())
            throw new Error(
              "문자 인식 결과가 비어 있습니다. 원본 영역을 확인하고 다시 시도해 주세요.",
            );
          if (job.action === "solution" && !result.solution.trim())
            throw new Error(
              "해설 결과가 비어 있습니다. 문제 내용을 확인하고 다시 시도해 주세요.",
            );
          let patch: Partial<StudioCrop>;
          const warnings = [...result.warnings];
          if (job.action === "figures") {
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
                !studioAiSnapshotMatches(
                  latest.current.crops.find((crop) => crop.id === snapshot.id),
                  snapshot,
                )
              ) {
                skipped++;
                continue;
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
              job.action === "ocr"
                ? {
                    content: result.content,
                    answer: result.answer,
                    solution: "",
                  }
                : { answer: result.answer, solution: result.solution };
          }
          const changed =
            (patch.content !== undefined &&
              patch.content !== snapshot.content) ||
            (patch.answer !== undefined && patch.answer !== snapshot.answer) ||
            (patch.solution !== undefined &&
              patch.solution !== snapshot.solution) ||
            (patch.figures !== undefined &&
              !studioFiguresEqual(patch.figures, snapshot.figures, false));
          setCrops((previous) =>
            stale()
              ? previous
              : previous.map((crop) =>
                  studioAiSnapshotMatches(crop, snapshot)
                    ? {
                        ...crop,
                        ...patch,
                        aiWarnings: warnings,
                        ...(changed
                          ? {
                              added: false,
                              reviewed: false,
                              revision: (crop.revision ?? 0) + 1,
                            }
                          : {}),
                      }
                    : crop,
                ),
          );
          completed++;
        }
        setMessage(
          `${job.action === "ocr" ? "문자 인식" : job.action === "figures" ? "도형 인식" : "해설 생성"} ${completed}문항 완료.${skipped ? ` 수정되거나 제외된 ${skipped}문항은 유지했습니다.` : ""} 원본과 결과를 확인해 주세요.`,
        );
      } catch (cause) {
        if (stale()) return;
        if (cause instanceof Error && cause.name === "AbortError")
          setMessage("AI 작업이 취소되었습니다. 완료된 결과는 유지됩니다.");
        else {
          retryJob.current = {
            ...job,
            ids: snapshots.slice(completed + skipped).map((crop) => crop.id),
          };
          setError(
            `${completed ? `${completed}문항 완료 후 중단 · ` : ""}${cause instanceof Error ? cause.message : "AI 처리에 실패했습니다."}`,
          );
        }
      } finally {
        if (owned.current === controller) {
          owned.current = null;
          if (mounted.current) setProgress(null);
        }
      }
    });
  }

  return {
    ai,
    available,
    unavailableReason,
    running,
    progress,
    pageJobs,
    pageProgress,
    message,
    error,
    cancel,
    cancelCrop,
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
    processCrops: (action: CropAction, ids: string[]) =>
      execute({ action, ids }),
    retry: () => {
      if (retryJob.current) void execute(retryJob.current);
      else void retryPages();
    },
  };
}
