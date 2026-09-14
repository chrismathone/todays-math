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
import type { StudioCrop, StudioFigure } from "./studioHelpers";
import type { useDevAi } from "./useDevAi";
import type { StudioAiQueue } from "./studioAiQueue";

export interface StudioFigureJob {
  cropId: string;
  figureId: string;
  state: "queued" | "running" | "complete" | "error" | "cancelled";
  startedAt?: number;
  stage?: string;
  error?: string;
}
interface Entry {
  job: StudioFigureJob;
  controller: AbortController;
  promise: Promise<void>;
}
const busy = (job: StudioFigureJob) =>
  job.state === "queued" || job.state === "running";
const keyOf = (cropId: string, figureId: string) =>
  JSON.stringify([cropId, figureId]);
const sameFigure = (a: StudioFigure | undefined, b: StudioFigure) =>
  a?.id === b.id &&
  a.image === b.image &&
  a.svg === b.svg &&
  a.originalImage === b.originalImage &&
  JSON.stringify(a.rect) === JSON.stringify(b.rect);

/** Diagram redraws share page/OCR slots, but own cancellation and stale-result checks per figure. */
export function useStudioFigureAi({
  crops,
  setCrops,
  queue,
  ai,
  available,
}: {
  crops: StudioCrop[];
  setCrops: Dispatch<SetStateAction<StudioCrop[]>>;
  queue: StudioAiQueue;
  ai: ReturnType<typeof useDevAi>;
  available: boolean;
}) {
  const [jobs, setJobs] = useState<StudioFigureJob[]>([]);
  const entries = useRef(new Map<string, Entry>());
  const latest = useRef(crops);
  const mounted = useRef(true);
  const publish = useCallback(() => {
    if (mounted.current)
      setJobs(Array.from(entries.current.values(), (e) => e.job));
  }, []);
  const cancel = useCallback(
    (cropId?: string, figureId?: string, clear = false) => {
      for (const entry of entries.current.values()) {
        if (
          (cropId === undefined || entry.job.cropId === cropId) &&
          (figureId === undefined || entry.job.figureId === figureId)
        ) {
          if (busy(entry.job)) entry.job = { ...entry.job, state: "cancelled" };
          entry.controller.abort();
        }
      }
      if (clear) entries.current.clear();
      publish();
    },
    [publish],
  );
  useLayoutEffect(() => {
    latest.current = crops;
    let changed = false;
    for (const entry of entries.current.values()) {
      if (
        busy(entry.job) &&
        !crops.some(
          (c) =>
            c.id === entry.job.cropId &&
            c.figures?.some((f) => f.id === entry.job.figureId),
        )
      ) {
        entry.job = { ...entry.job, state: "cancelled" };
        entry.controller.abort();
        changed = true;
      }
    }
    if (changed) publish();
  }, [crops, publish]);
  useEffect(() => {
    mounted.current = true;
    const owners = entries.current;
    return () => {
      mounted.current = false;
      for (const entry of owners.values()) entry.controller.abort();
      owners.clear();
    };
  }, []);

  async function execute(entry: Entry, crop: StudioCrop, figure: StudioFigure) {
    const key = keyOf(crop.id, figure.id);
    const stale = () =>
      !mounted.current ||
      entry.controller.signal.aborted ||
      entries.current.get(key) !== entry;
    const matches = (current: StudioCrop | undefined) =>
      current?.image === crop.image &&
      current.content === crop.content &&
      sameFigure(
        current.figures?.find((f) => f.id === figure.id),
        figure,
      );
    const update = (patch: Partial<StudioFigureJob>) => {
      if (!stale()) {
        entry.job = { ...entry.job, ...patch };
        publish();
      }
    };
    try {
      if (stale()) return;
      if (!matches(latest.current.find((c) => c.id === crop.id))) {
        update({ state: "cancelled" });
        return;
      }
      update({
        state: "running",
        startedAt: Date.now(),
        stage: "도형 엔진으로 그리는 중",
      });
      const response = await ai.run(
        {
          action: "figure-redraw",
          grade: crop.grade,
          imageDataUrl: figure.originalImage ?? figure.image,
          content:
            "인쇄된 수학 도형을 도형 엔진으로 정확히 재작도하세요. 손글씨와 채점 표시는 제외하고 원본의 기하 관계, 좌표축, 곡선, 점과 수학 라벨을 보존하세요. 사진이나 작품처럼 재작도가 부적절하면 추측하지 말고 실패 이유를 반환하세요. 문제 본문은 참고 데이터입니다: " +
            crop.content,
        },
        entry.controller.signal,
      );
      if (stale()) return;
      if (!response.result.svg)
        throw new Error("도형 엔진 결과가 비어 있습니다.");
      update({ stage: "수식 조판 중" });
      const [
        { prepareFigureSvg, cleanFigureForSave, fitFigureViewport },
        { typesetFigureSvg },
        { svgDataUrl },
      ] = await Promise.all([
        import("./figure-editor/figureSvgEditing"),
        import("./figure-editor/figureTypeset"),
        import("./figure-editor/figureDocument"),
      ]);
      const svg = cleanFigureForSave(prepareFigureSvg(response.result.svg));
      const rendered = fitFigureViewport(await typesetFigureSvg(svg));
      if (stale()) return;
      if (!matches(latest.current.find((c) => c.id === crop.id))) {
        update({ state: "cancelled" });
        return;
      }
      const image = svgDataUrl(cleanFigureForSave(rendered));
      setCrops((previous) =>
        stale()
          ? previous
          : previous.map((current) =>
              current.id === crop.id && matches(current)
                ? {
                    ...current,
                    figures: current.figures?.map((f) =>
                      f.id === figure.id
                        ? {
                            ...f,
                            svg,
                            image,
                            originalImage: f.originalImage ?? figure.image,
                          }
                        : f,
                    ),
                    aiWarnings: [
                      ...new Set([
                        ...(current.aiWarnings ?? []),
                        ...response.result.warnings,
                      ]),
                    ],
                    reviewed: false,
                    added: false,
                    revision: (current.revision ?? 0) + 1,
                  }
                : current,
            ),
      );
      update({ state: "complete", stage: "SVG 생성 완료" });
    } catch (error) {
      if (stale()) return;
      update(
        error instanceof Error && error.name === "AbortError"
          ? { state: "cancelled" }
          : {
              state: "error",
              error: `${error instanceof Error ? error.message : "SVG 생성에 실패했습니다."} 원본 그림을 유지했습니다.`,
            },
      );
    }
  }
  function enqueue(crop: StudioCrop, figure: StudioFigure) {
    const key = keyOf(crop.id, figure.id);
    const previous = entries.current.get(key);
    if (previous && busy(previous.job)) return previous.promise;
    const entry: Entry = {
      job: { cropId: crop.id, figureId: figure.id, state: "queued" },
      controller: new AbortController(),
      promise: Promise.resolve(),
    };
    entries.current.set(key, entry);
    publish();
    entry.promise = queue.enqueue(entry.controller.signal, () =>
      execute(entry, crop, figure),
    );
    return entry.promise;
  }
  async function run(ids: string[], figureId?: string) {
    if (!available || !mounted.current) return;
    await Promise.all(
      latest.current
        .filter((c) => ids.includes(c.id))
        .flatMap((crop) =>
          (crop.figures ?? [])
            .filter((f) => !f.svg && (!figureId || f.id === figureId))
            .map((figure) => enqueue(crop, figure)),
        ),
    );
  }
  return {
    jobs,
    run,
    cancel,
    running: jobs.some(busy),
    isBusy: (cropId: string) =>
      jobs.some((j) => j.cropId === cropId && busy(j)),
  };
}
