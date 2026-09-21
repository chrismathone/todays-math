import type {
  DevAiFigure,
  DevAiRecognizedProblem,
} from "@/lib/dev-ai/contracts";
import {
  clamp,
  studioPixelRect,
  type StudioCrop,
  type StudioFigure,
  type StudioRect,
} from "./studioHelpers";

/** Decode only the supplied crop pixels; cancellation also covers image loading. */
export function studioImageCanvas(
  image: string,
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const source = new Image();
    const cleanup = () => {
      source.onload = null;
      source.onerror = null;
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      source.src = "";
      reject(new DOMException("작업 취소", "AbortError"));
    };
    source.onload = () => {
      cleanup();
      try {
        if (!source.naturalWidth || !source.naturalHeight)
          throw new Error("원본 문제 이미지를 읽지 못했습니다.");
        const canvas = document.createElement("canvas");
        canvas.width = source.naturalWidth;
        canvas.height = source.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("그림 이미지를 만들 수 없습니다.");
        context.drawImage(source, 0, 0);
        resolve(canvas);
      } catch (error) {
        reject(error);
      }
    };
    source.onerror = () => {
      cleanup();
      reject(
        new Error("원본 문제 이미지를 읽지 못했습니다. 다시 시도해 주세요."),
      );
    };
    if (signal?.aborted) return abort();
    signal?.addEventListener("abort", abort, { once: true });
    source.src = image;
  });
}

/**
 * 쪽 회전은 이 함수 하나다 — 90°·270° 면 폭과 높이를 바꾼다. 화면 렌더·AI 쪽 렌더·자동 회전 재인식이
 * 같이 쓴다(트랙 39: 재인식 쪽만 폭·높이를 안 바꿔 가로 쪽을 90° 돌리면 잘렸다). 0° 면 원본을 돌려준다.
 */
export function studioRotateCanvas(canvas: HTMLCanvasElement, angle: number) {
  const rotation = ((angle % 360) + 360) % 360;
  if (!rotation) return canvas;
  const rotated = document.createElement("canvas");
  const sideways = rotation === 90 || rotation === 270;
  rotated.width = sideways ? canvas.height : canvas.width;
  rotated.height = sideways ? canvas.width : canvas.height;
  const ctx = rotated.getContext("2d");
  if (!ctx) throw new Error("페이지를 회전할 수 없습니다.");
  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  return rotated;
}

/** Keep original pixels; the normalized model box is only a selection coordinate. */
export function studioCropImage(canvas: HTMLCanvasElement, rect: StudioRect) {
  const pixels = studioPixelRect(rect, canvas.width, canvas.height);
  if (pixels.width < 8 || pixels.height < 8)
    throw new Error(
      "인식한 영역이 너무 작습니다. 원본에서 직접 영역을 지정해 주세요.",
    );
  const output = document.createElement("canvas");
  output.width = pixels.width;
  output.height = pixels.height;
  const context = output.getContext("2d");
  if (!context) throw new Error("문제 이미지를 만들 수 없습니다.");
  context.drawImage(
    canvas,
    pixels.x,
    pixels.y,
    pixels.width,
    pixels.height,
    0,
    0,
    pixels.width,
    pixels.height,
  );
  return output.toDataURL("image/png");
}

export function studioAiRect(
  box: DevAiRecognizedProblem["bbox"],
): StudioRect | null {
  if (
    !box ||
    ![box.left, box.top, box.width, box.height].every(Number.isFinite) ||
    box.width <= 0 ||
    box.height <= 0
  )
    return null;
  const x = clamp(box.left / 1000);
  const y = clamp(box.top / 1000);
  const right = clamp((box.left + box.width) / 1000);
  const bottom = clamp((box.top + box.height) / 1000);
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/** INPUT-image coordinates become page coordinates, then fit the parent problem. */
export function studioAiFigureRect(
  box: DevAiFigure["bbox"],
  parent: StudioRect,
  inputRect: StudioRect = { x: 0, y: 0, width: 1, height: 1 },
): StudioRect | null {
  if (
    !box ||
    ![box.left, box.top, box.width, box.height].every(Number.isFinite) ||
    box.left < 0 ||
    box.top < 0 ||
    box.width <= 0 ||
    box.height <= 0 ||
    box.left + box.width > 1000 ||
    box.top + box.height > 1000
  )
    return null;
  const x = Math.max(
    parent.x,
    inputRect.x + (box.left / 1000) * inputRect.width,
    0,
  );
  const y = Math.max(
    parent.y,
    inputRect.y + (box.top / 1000) * inputRect.height,
    0,
  );
  const right = Math.min(
    parent.x + parent.width,
    inputRect.x + ((box.left + box.width) / 1000) * inputRect.width,
    1,
  );
  const bottom = Math.min(
    parent.y + parent.height,
    inputRect.y + ((box.top + box.height) / 1000) * inputRect.height,
    1,
  );
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : null;
}

/** The canvas covers inputRect on the source page (the full page by default). */
export function studioAiFigures(
  canvas: HTMLCanvasElement,
  detected: DevAiFigure[],
  parent: StudioRect,
  inputRect: StudioRect = { x: 0, y: 0, width: 1, height: 1 },
): { figures: StudioFigure[]; warnings: string[] } {
  let dropped = 0;
  const figures = detected.flatMap((figure) => {
    const rect = studioAiFigureRect(figure?.bbox, parent, inputRect);
    if (!rect) {
      dropped++;
      return [];
    }
    const relative = {
      x: (rect.x - inputRect.x) / inputRect.width,
      y: (rect.y - inputRect.y) / inputRect.height,
      width: rect.width / inputRect.width,
      height: rect.height / inputRect.height,
    };
    const pixels = studioPixelRect(relative, canvas.width, canvas.height);
    if (pixels.width < 8 || pixels.height < 8) {
      dropped++;
      return [];
    }
    // Canvas failures are retryable errors, not evidence that the page has no figures.
    return [
      {
        id: crypto.randomUUID(),
        rect,
        image: studioCropImage(canvas, relative),
      },
    ];
  });
  return {
    figures,
    warnings: dropped
      ? [
          `문제 밖이거나 너무 작거나 잘못된 그림 영역 ${dropped}개를 제외했습니다.`,
        ]
      : [],
  };
}

const rectMatches = (a: StudioRect, b: StudioRect) =>
  a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

export function studioFiguresEqual(
  a: StudioFigure[] | undefined,
  b: StudioFigure[] | undefined,
  includeIds = true,
) {
  return (
    (a?.length ?? 0) === (b?.length ?? 0) &&
    (a ?? []).every((figure, index) => {
      const other = b![index];
      return (
        (!includeIds || figure.id === other.id) &&
        figure.image === other.image &&
        figure.svg === other.svg &&
        figure.originalImage === other.originalImage &&
        rectMatches(figure.rect, other.rect)
      );
    })
  );
}

/** Suppress substantially identical detections when recognizing a page again. */
export function studioRectsOverlap(a: StudioRect, b: StudioRect) {
  const intersection =
    Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return (
    intersection / (a.width * a.height + b.width * b.height - intersection) >
    0.7
  );
}

export function studioAiSnapshotMatches(
  current: StudioCrop | undefined,
  snapshot: StudioCrop,
) {
  return Boolean(
    current &&
    current.id === snapshot.id &&
    current.sourceId === snapshot.sourceId &&
    current.page === snapshot.page &&
    current.image === snapshot.image &&
    rectMatches(current.rect, snapshot.rect) &&
    studioFiguresEqual(current.figures, snapshot.figures) &&
    current.reviewed === snapshot.reviewed &&
    current.sourceSize?.width === snapshot.sourceSize?.width &&
    current.sourceSize?.height === snapshot.sourceSize?.height &&
    current.sourceWidthMm === snapshot.sourceWidthMm &&
    (current.revision ?? 0) === (snapshot.revision ?? 0) &&
    current.content === snapshot.content &&
    current.ocr === snapshot.ocr &&
    current.answer === snapshot.answer &&
    current.solution === snapshot.solution &&
    current.grade === snapshot.grade &&
    current.mode === snapshot.mode &&
    current.modeManual === snapshot.modeManual,
  );
}
