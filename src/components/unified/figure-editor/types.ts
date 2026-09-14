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

export interface StudioFigureEditorProps {
  image: string;
  originalImage?: string;
  initialSvg?: string;
  index: number;
  onSave: (result: StudioFigureSaveResult) => void;
  onClose: () => void;
  onRedraw?: (
    request: StudioFigureRedrawRequest,
  ) => Promise<StudioFigureRedrawResult>;
}
