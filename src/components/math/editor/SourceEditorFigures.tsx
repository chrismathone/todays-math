import SourceEditorRenderer, { type MarkdownRendererProps } from "./SourceEditorRenderer";

type FigureProps = Omit<MarkdownRendererProps, "content"> & { value: string };

/** OCRItem's standalone figure fallback, shared by read and edit wrappers.
 * It renders outside TipTap so opening/redrawing never inserts body markers.
 */
export function SourceEditorFigures({ value, diagramSvgs, imageCrops, ...props }: FigureProps) {
  const used = new Set<number>();
  let sequential = 0;
  for (const match of value.matchAll(/\[그림\s*(\d*)\]/g)) used.add(match[1] ? Number(match[1]) - 1 : sequential++);
  const compact = value.replace(/\s+/g, "");
  const count = Math.max(diagramSvgs?.length ?? 0, imageCrops?.length ?? 0);
  const remaining = Array.from({ length: count }, (_, index) => index).filter(index => {
    if (used.has(index)) return false;
    const svg = diagramSvgs?.[index]?.svg;
    const src = imageCrops?.[index]?.src;
    if (!svg && !src) return false;
    if (svg && compact.includes(svg.replace(/\s+/g, ""))) return false;
    if (src && value.includes(src)) return false;
    return true;
  });
  if (!remaining.length) return null;
  return <div className="source-editor-figures" data-editor-standalone-figures>
    <SourceEditorRenderer {...props} diagramSvgs={diagramSvgs} imageCrops={imageCrops} content={remaining.map(index => `[그림${index + 1}]`).join("\n\n")} editorTokens />
  </div>;
}
