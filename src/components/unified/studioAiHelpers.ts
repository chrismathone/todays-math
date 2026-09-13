import type { DevAiRecognizedProblem } from "@/lib/dev-ai/contracts";
import {
  clamp,
  studioPixelRect,
  type StudioCrop,
  type StudioRect,
} from "./studioHelpers";

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
    (current.revision ?? 0) === (snapshot.revision ?? 0) &&
    current.content === snapshot.content &&
    current.answer === snapshot.answer &&
    current.solution === snapshot.solution &&
    current.grade === snapshot.grade &&
    current.mode === snapshot.mode &&
    current.added === snapshot.added,
  );
}
