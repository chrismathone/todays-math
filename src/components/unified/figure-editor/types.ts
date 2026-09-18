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
  index: number;
  /** 편집기 머리의 도형 번호(작업실 «도형 9-1») — 없으면 «도형 {index + 1}». */
  label?: string;
  onSave: (result: StudioFigureSaveResult) => void;
  onClose: () => void;
  onRedraw?: (
    request: StudioFigureRedrawRequest,
  ) => Promise<StudioFigureRedrawResult>;
  onEdit?: (
    request: StudioFigureEditRequest,
  ) => Promise<StudioFigureEditResult>;
}
