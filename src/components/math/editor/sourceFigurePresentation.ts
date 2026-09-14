import { typesetFigureSvg } from "../../unified/figure-editor/figureTypeset";

const prepared = new Map<string, Promise<string>>();

/** Keep the source viewport and aspect ratio; cap the painted frame, not its row. */
export function sourceFigureWidth(source: string): number {
  const root = source.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const attribute = (name: string) =>
    root.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const length = (value: string | undefined) =>
    value && /^\d+(?:\.\d+)?(?:px)?$/.test(value) ? parseFloat(value) : 0;
  const viewBox = attribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  const intrinsicWidth = length(attribute("width"));
  const intrinsicHeight = length(attribute("height"));
  const ratio = viewBox?.[2] && viewBox[3] ? viewBox[2] / viewBox[3] : 1;
  const width =
    intrinsicWidth ||
    (intrinsicHeight ? intrinsicHeight * ratio : viewBox?.[2]) ||
    360;
  const height =
    intrinsicHeight ||
    (intrinsicWidth ? intrinsicWidth / ratio : viewBox?.[3]) ||
    width;
  return width > 0 && height > 0 && Number.isFinite(width / height)
    ? Math.min(width, 360, (360 * width) / height)
    : 360;
}

/** Shared by React previews and TipTap node views; stale redraws cannot repaint. */
export function paintSourceFigure(
  element: HTMLElement,
  source: string,
): () => void {
  let active = true;
  element.innerHTML = source;
  element.style.setProperty(
    "--source-figure-width",
    `${sourceFigureWidth(source)}px`,
  );
  if (/<text\b/i.test(source)) {
    let pending = prepared.get(source);
    if (!pending) {
      // Preserve the viewport/object positions and let the shared label placer
      // handle anchors, baselines, transforms, CJK fallback and existing paths.
      pending = typesetFigureSvg(source, true);
      if (prepared.size >= 100) prepared.delete(prepared.keys().next().value!);
      prepared.set(source, pending);
      void pending.catch(() => prepared.delete(source));
    }
    void pending
      .then((rendered) => {
        if (active) element.innerHTML = rendered;
      })
      .catch(() => {
        /* Keep the source drawing if label preparation fails. */
      });
  }
  return () => {
    active = false;
  };
}
