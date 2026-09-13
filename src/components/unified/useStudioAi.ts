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

export interface StudioAiPage {
  sourceId: string;
  sourceLabel: string;
  page: number;
  canvas: HTMLCanvasElement;
  imageDataUrl: string;
  grade: string;
  level: StudioCrop["level"];
}
type CropAction = "ocr" | "figures" | "solution";
type Job =
  | { action: "page-ocr"; page: StudioAiPage }
  | { action: CropAction; ids: string[] };
interface Progress {
  action: Job["action"];
  done: number;
  total: number;
  cropId?: string;
}

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
  const [progress, setProgress] = useState<Progress | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const owned = useRef<AbortController | null>(null);
  const retryJob = useRef<Job | null>(null);
  const latest = useRef({ crops, contextKey, active, onDetected });
  useLayoutEffect(() => {
    latest.current = { crops, contextKey, active, onDetected };
  });

  const cancel = useCallback((clear = false) => {
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

  useEffect(() => {
    // Workspace views stay mounted. A page/source/view change also ends this owner.
    // Clear visible progress as part of aborting the external request owner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cancel(true);
    return () => {
      owned.current?.abort();
      owned.current = null;
      retryJob.current = null;
    };
  }, [contextKey, active, cancel]);

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
  const running = Boolean(progress || ai.activity?.state === "running");

  async function execute(job: Job) {
    if (
      owned.current ||
      !latest.current.active ||
      !available ||
      ai.activity?.state === "running"
    )
      return;
    const controller = new AbortController();
    owned.current = controller;
    retryJob.current = null;
    const origin = latest.current.contextKey;
    const stale = () =>
      controller.signal.aborted ||
      !latest.current.active ||
      latest.current.contextKey !== origin;
    const snapshots =
      job.action === "page-ocr"
        ? []
        : job.ids
            .map((id) => latest.current.crops.find((crop) => crop.id === id))
            .filter((crop): crop is StudioCrop => Boolean(crop));
    const total = job.action === "page-ocr" ? 1 : snapshots.length;
    setError("");
    setMessage("");
    setProgress({ action: job.action, done: 0, total });
    let completed = 0;
    let skipped = 0;
    try {
      if (job.action === "page-ocr") {
        const page = job.page;
        const response = await ai.run(
          {
            action: "page-ocr",
            imageDataUrl: page.imageDataUrl,
            grade: page.grade,
          },
          controller.signal,
        );
        if (stale()) return;
        const recognized = response.result.problems ?? [];
        if (!recognized.length)
          throw new Error(
            "인식한 문제가 없습니다. 다시 시도하거나 직접 영역을 잘라 주세요.",
          );
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
          ) {
            skipped++;
            continue;
          }
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
        setCrops((previous) =>
          stale() ? previous : [...previous, ...detected],
        );
        if (detected[0]) latest.current.onDetected(detected[0].id);
        setMessage(
          `${detected.length}문항을 인식했습니다.${skipped ? ` 기존 영역 ${skipped}개는 유지했습니다.` : ""}${invalid ? ` 영역 ${invalid}개는 직접 잘라 주세요.` : ""} 원본과 내용을 검수한 뒤 해설을 생성하세요.`,
        );
      } else {
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
            done: completed,
            total,
            cropId: snapshot.id,
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
      }
    } catch (cause) {
      if (stale()) return;
      if (cause instanceof Error && cause.name === "AbortError")
        setMessage("AI 작업이 취소되었습니다. 완료된 결과는 유지됩니다.");
      else {
        retryJob.current =
          job.action === "page-ocr"
            ? job
            : {
                ...job,
                ids: snapshots
                  .slice(completed + skipped)
                  .map((crop) => crop.id),
              };
        setError(
          `${completed ? `${completed}문항 완료 후 중단 · ` : ""}${cause instanceof Error ? cause.message : "AI 처리에 실패했습니다."}`,
        );
      }
    } finally {
      if (owned.current === controller) {
        owned.current = null;
        setProgress(null);
      }
    }
  }

  return {
    ai,
    available,
    unavailableReason,
    running,
    progress,
    message,
    error,
    cancel,
    recognizePage: (page: StudioAiPage) =>
      execute({ action: "page-ocr", page }),
    processCrops: (action: CropAction, ids: string[]) =>
      execute({ action, ids }),
    retry: () => {
      if (retryJob.current) void execute(retryJob.current);
    },
  };
}
