import type {
  FigureEditCommand,
  FigureEditFigure,
} from "@/lib/dev-ai/figure-edit-contract";

/** Persist all three fields: the preview is not a substitute for editable source. */
export interface StudioFigureSaveResult {
  svg: string;
  dataUrl: string;
  originalImage?: string;
}

export interface StudioFigureRedrawRequest {
  originalImage: string;
  svg: string;
  instructions: string;
  signal?: AbortSignal;
}

export interface StudioFigureRedrawResult {
  svg: string;
  warnings?: string[];
}

/** «요청대로 고치기» — 지금 그림을 새로 그리지 않고 수정 명령만 받는다(원장님 2026-09-19). */
export interface StudioFigureEditRequest {
  /** 이미지 한 장 — «1. 원본 | 2. 지금 그림»(편집기 요소 번호 표시, figureEditSnapshot.ts). */
  imageDataUrl: string;
  /** 편집기 번호 그대로의 요소 목록(figureEditElements.ts). */
  figure: FigureEditFigure;
  instructions: string;
  signal?: AbortSignal;
}

export interface StudioFigureEditResult {
  /** 편집기가 번호·좌표를 다시 검사한 뒤 지금 그림에 적용한다(figureEditApply.ts). */
  edits: FigureEditCommand[];
  warnings?: string[];
}

export interface StudioFigureEditorProps {
  image: string;
  originalImage?: string;
  initialSvg?: string;
  /** math-figure-editor: 열 때 위 띠에 띄울 안내(자동 작도의 경고 등) — 상류에는 없는 칸. */
  initialNotice?: string;
  /** math-figure-editor: «원본으로 다시 그리기» 진행 단계(«원본과 대조하는 중» 등) — 단추 글자로 보인다. */
  redrawStage?: string;
  index: number;
  /** 편집기 머리의 도형 번호(작업실 «도형 9-1») — 없으면 «도형 {index + 1}». */
  label?: string;
  onSave: (result: StudioFigureSaveResult) => void | Promise<void>;
  onClose: () => void;
  onRedraw?: (
    request: StudioFigureRedrawRequest,
  ) => Promise<StudioFigureRedrawResult>;
  onEdit?: (
    request: StudioFigureEditRequest,
  ) => Promise<StudioFigureEditResult>;
}
