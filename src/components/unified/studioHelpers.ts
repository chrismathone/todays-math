import type { DevAiResult } from "@/lib/dev-ai/contracts";
import type { SchoolLevel, StudioProblem } from "./types";

export interface StudioRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StudioFigure {
  id: string;
  /** Source PAGE coordinates normalized to 0–1, bounded by the problem. */
  rect: StudioRect;
  image: string;
  originalImage?: string;
  svg?: string;
  spec?: DevAiResult["spec"];
  engine?: DevAiResult["engine"];
  figureReview?: DevAiResult["figureReview"];
}

export interface StudioCrop {
  ocr?: import("@/lib/mathgen/contracts").MathgenProblemData;
  id: string;
  sourceId: string;
  sourceLabel: string;
  page: number;
  rect: StudioRect;
  image: string;
  figures?: StudioFigure[];
  reviewed?: boolean;
  /** Original page canvas pixel dimensions, when available. */
  sourceSize?: { width: number; height: number };
  /** Measured original page width; omit when physical dimensions are unknown. */
  sourceWidthMm?: number;
  content: string;
  answer: string;
  solution: string;
  level: SchoolLevel;
  grade: string;
  mode: "image" | "text";
  /** Explicit output choice takes precedence over later automatic OCR. */
  modeManual?: boolean;
  added: boolean;
  /** Monotonic edit generation, including changes that restore the old text. */
  revision?: number;
  aiWarnings?: string[];
  questionType?: "multiple-choice" | "short-answer" | "descriptive";
}

export const STUDIO_QUESTION_TYPES = {
  "multiple-choice": "객관식",
  "short-answer": "단답형",
  descriptive: "서술형",
} as const;

export const STUDIO_GRADES: Record<SchoolLevel, string[]> = {
  elementary: ["초1", "초2", "초3", "초4", "초5", "초6"],
  secondary: ["중1", "중2", "중3", "고1", "고2", "고3"],
};

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

/**
 * 화면에 내지 않는 옛 AI 경고. 원장님 2026-09-19 «원본 대조 멘트는 필요 없다» — 서버는 더 안 만들지만
 * 이미 저장된 초안에는 남아 있다. 경고를 보이거나 세는 자리는 모두 이 함수를 거친다.
 */
const HIDDEN_WARNING_PREFIXES = ["원본 대조 확인 필요"];
export function visibleStudioWarnings(warnings: string[] | undefined) {
  return (warnings ?? []).filter(
    (warning) =>
      !HIDDEN_WARNING_PREFIXES.some((prefix) =>
        warning.trimStart().startsWith(prefix),
      ),
  );
}

export function studioRectBetween(
  start: { x: number; y: number },
  end: { x: number; y: number },
): StudioRect {
  const x1 = clamp(start.x);
  const y1 = clamp(start.y);
  const x2 = clamp(end.x);
  const y2 = clamp(end.y);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export function studioPixelRect(
  rect: StudioRect,
  width: number,
  height: number,
) {
  const x = clamp(Math.floor(rect.x * width), 0, width - 1);
  const y = clamp(Math.floor(rect.y * height), 0, height - 1);
  return {
    x,
    y,
    width: clamp(Math.ceil((rect.x + rect.width) * width) - x, 1, width - x),
    height: clamp(
      Math.ceil((rect.y + rect.height) * height) - y,
      1,
      height - y,
    ),
  };
}

export function studioProblem(crop: StudioCrop): StudioProblem {
  const useText = crop.mode === "text" && Boolean(crop.content.trim());
  const figures = useText ? (crop.figures ?? []) : [];
  const sourceSize = crop.sourceSize;
  const hasSourceSize =
    sourceSize &&
    [sourceSize.width, sourceSize.height].every(
      (value) => Number.isFinite(value) && value > 0,
    );
  return {
    id: crop.id,
    ...(crop.ocr ? { ocr: structuredClone(crop.ocr) } : {}),
    studioCrop: structuredClone(crop),
    ...(crop.questionType ? { questionType: crop.questionType } : {}),
    content: useText ? crop.content.trim() : "",
    answer: crop.answer.trim(),
    solution: crop.solution.trim(),
    grade: crop.grade,
    chapter: "직접 가져온 문제",
    section: "",
    difficulty: "",
    problemCode: "",
    figureUrls: figures.map((figure) => figure.image),
    figureSvg: null,
    figureDims: hasSourceSize
      ? figures.flatMap((figure) => {
          const pixels = studioPixelRect(
            figure.rect,
            sourceSize.width,
            sourceSize.height,
          );
          return [pixels.width, pixels.height];
        })
      : [],
    figureSourceMm:
      Number.isFinite(crop.sourceWidthMm) && crop.sourceWidthMm! > 0
        ? figures.map((figure) => figure.rect.width * crop.sourceWidthMm!)
        : [],
    croppedImage: useText ? undefined : crop.image,
    sourceLabel: `${crop.sourceLabel} · ${crop.page}쪽`,
  };
}

/** A real, locally drawn practice sheet. This is source artwork, never OCR output. */
export function drawStudioSample(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서 예제 지면을 그릴 수 없습니다.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1200, 1600);
  ctx.fillStyle = "#176b5b";
  ctx.font = '600 22px "Malgun Gothic", sans-serif';
  ctx.fillText("오늘의 수학  /  직접 잘라 보는 예제", 90, 85);
  ctx.fillStyle = "#202e28";
  ctx.font = '700 46px "Malgun Gothic", sans-serif';
  ctx.fillText("한 장으로 시작하는 수학", 90, 160);
  ctx.font = '22px "Malgun Gothic", sans-serif';
  ctx.fillStyle = "#68756e";
  ctx.fillText(
    "이름 ___________________        날짜 ___________________",
    90,
    215,
  );
  const line = (y: number) => {
    ctx.strokeStyle = "#dce4df";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(1110, y);
    ctx.stroke();
  };
  line(255);
  const question = (n: string, text: string, y: number) => {
    ctx.fillStyle = "#176b5b";
    ctx.font = '700 30px "Malgun Gothic", sans-serif';
    ctx.fillText(n, 90, y);
    ctx.fillStyle = "#26332c";
    ctx.font = '26px "Malgun Gothic", sans-serif';
    ctx.fillText(text, 150, y);
  };
  question("01", "다음을 계산하시오.", 325);
  ctx.font = '34px "Malgun Gothic", sans-serif';
  ctx.fillText("(1)  125 + 348 =", 155, 405);
  ctx.fillText("(2)  72 ÷ 8 =", 660, 405);
  line(530);
  question("02", "가로가 8 cm, 세로가 5 cm인 직사각형의 넓이를 구하시오.", 605);
  ctx.fillStyle = "#eef5f1";
  ctx.fillRect(220, 675, 360, 210);
  ctx.strokeStyle = "#3a6857";
  ctx.lineWidth = 3;
  ctx.strokeRect(220, 675, 360, 210);
  ctx.fillStyle = "#26332c";
  ctx.font = '26px "Malgun Gothic", sans-serif';
  ctx.fillText("8 cm", 367, 925);
  ctx.fillText("5 cm", 605, 785);
  ctx.fillText("답: ____________________", 740, 885);
  line(990);
  question("03", "방정식 3x + 5 = 20을 풀고, 풀이 과정을 쓰시오.", 1065);
  ctx.fillStyle = "#7d8780";
  ctx.font = '23px "Malgun Gothic", sans-serif';
  ctx.fillText("풀이", 150, 1140);
  line(1220);
  line(1310);
  ctx.fillText("답: ____________________", 745, 1420);
  ctx.fillStyle = "#87938c";
  ctx.font = '19px "Malgun Gothic", sans-serif';
  ctx.fillText(
    "브라우저에서 그린 연습용 예제 · 영역을 드래그해 문제를 잘라 보세요.",
    90,
    1540,
  );
  return canvas;
}
