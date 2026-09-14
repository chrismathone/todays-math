import { cleanFigureForSave, prepareFigureSvg } from "./figureSvgEditing";
import type { StudioFigureSaveResult } from "./types";

export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function svgFromImage(image: string): string | undefined {
  if (/^\s*<svg\b/i.test(image)) return image;
  if (!/^data:image\/svg\+xml(?:;[^,]*)?,/i.test(image)) return undefined;
  const comma = image.indexOf(",");
  const body = image.slice(comma + 1);
  return /;base64/i.test(image.slice(0, comma))
    ? new TextDecoder().decode(
        Uint8Array.from(atob(body), (character) => character.charCodeAt(0)),
      )
    : decodeURIComponent(body);
}

export function initialFigureSource(image: string, initialSvg?: string) {
  try {
    return {
      svg: prepareFigureSvg(initialSvg ?? svgFromImage(image)),
      error: "",
    };
  } catch {
    return {
      svg: prepareFigureSvg(),
      error: "저장된 SVG를 읽을 수 없습니다. 원본을 참고해 다시 그려 주세요.",
    };
  }
}

export function createFigureSaveResult(
  svg: string,
  rendered: string,
  originalImage?: string,
): StudioFigureSaveResult {
  return {
    svg: cleanFigureForSave(svg),
    dataUrl: svgDataUrl(cleanFigureForSave(rendered)),
    originalImage,
  };
}
