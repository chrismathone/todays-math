import type { TextbookPage } from "@/lib/textbook/layout/paginate";
import type { TextbookRenderModel } from "@/lib/textbook/render/model";
import {
  renderPageHtml,
  TEXTBOOK_CSS,
  type RenderResources,
} from "@/lib/textbook/render/html";
const previewFontCss = [400, 700]
  .map(
    (weight) =>
      `@font-face{font-family:TextbookPretendard;src:url('/textbook/editorial/fonts/NotoSansKR-${weight}.ttf') format('truetype');font-weight:${weight};font-display:block}`,
  )
  .join("\n");

export interface TextbookPaperProps {
  page: TextbookPage;
  model: TextbookRenderModel;
  resources: RenderResources;
  fontCss?: string;
  katexCss?: string;
}
/** Shared trusted renderer; no manuscript HTML is ever accepted as a prop. */
export function TextbookPaper({
  page,
  model,
  resources,
  fontCss = previewFontCss,
  katexCss = "",
}: TextbookPaperProps) {
  return (
    <>
      <style>{fontCss + katexCss + TEXTBOOK_CSS}</style>
      <div
        data-textbook-paper-host
        dangerouslySetInnerHTML={{
          __html: renderPageHtml(page, model, resources),
        }}
      />
    </>
  );
}

export function TextbookSpread({
  pages,
  model,
  resources,
  currentPhysicalPageIndex,
  fontCss = previewFontCss,
  katexCss = "",
}: Omit<TextbookPaperProps, "page"> & {
  pages: TextbookPage[];
  currentPhysicalPageIndex: number;
}) {
  const left =
    currentPhysicalPageIndex % 2 === 0
      ? currentPhysicalPageIndex
      : currentPhysicalPageIndex - 1;
  const visible = pages.filter(
    (p) => p.physicalPageIndex >= left && p.physicalPageIndex <= left + 1,
  );
  return (
    <>
      <style>{fontCss + katexCss + TEXTBOOK_CSS}</style>
      <div className="tb-spread">
        {visible.map((page) => (
          <div
            key={page.physicalPageIndex}
            data-textbook-paper-host
            dangerouslySetInnerHTML={{
              __html: renderPageHtml(page, model, resources, pages),
            }}
          />
        ))}
      </div>
    </>
  );
}
