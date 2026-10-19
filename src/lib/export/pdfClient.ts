import { PDF_BATCH_MAX_PAGES, PDF_REQUEST_MAX_BYTES } from "./pdfLimits";

/** Capture the same document and active styles that produced measured A4 pages.
 * Large documents travel as bounded physical-page batches and are combined
 * locally, retaining their already-measured order, numbering and page breaks. */
export async function exportPreviewPdf(
  root: HTMLElement,
  title: string,
): Promise<Blob> {
  const cssUrls: string[] = [],
    css: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) {
      cssUrls.push(sheet.href);
      continue;
    }
    try {
      css.push(
        Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n"),
      );
    } catch {
      /* Cross-origin sheets use their link above. */
    }
  }
  const clone = root.cloneNode(true) as HTMLElement;
  const style = getComputedStyle(root);
  // Next local-font variables are normally inherited from body outside this root.
  for (const property of [
    "font-family",
    "--font-pretendard",
    "--paper-font-serif",
    "--paper-font-sans",
    "--paper-font-mono",
  ]) {
    clone.style.setProperty(property, style.getPropertyValue(property));
  }
  const encode = (html: string) =>
    JSON.stringify({
      title: title.slice(0, 200),
      html,
      cssUrls,
      cssText: css.join("\n"),
    });
  const byteLength = (body: string) =>
    new TextEncoder().encode(body).byteLength;
  const pages = Array.from(clone.children).filter((child) =>
    child.matches("[data-unified-paper]"),
  );
  const canSplit =
    clone.matches("[data-mathgen-document]") &&
    pages.length === clone.children.length &&
    pages.length > 0;
  const fullBody = encode(clone.outerHTML);
  const tooLarge = () =>
    new Error(
      "한 페이지의 PDF 용량이 너무 큽니다. 인쇄에서 PDF로 저장해 주세요.",
    );
  if (!canSplit && byteLength(fullBody) > PDF_REQUEST_MAX_BYTES)
    throw tooLarge();
  const bodyFor = (selected: Element[]) => {
    const wrapper = clone.cloneNode(false) as HTMLElement;
    selected.forEach((page) => wrapper.append(page.cloneNode(true)));
    return encode(wrapper.outerHTML);
  };
  const results: ArrayBuffer[] = [];
  async function send(body: string, selected?: Element[]): Promise<void> {
    const response = await fetch("/api/exports/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    // A diagram-heavy PDF can be larger than its HTML. Halving the same
    // physical pages preserves layout and avoids retrying an oversized batch.
    if (response.status === 413 && selected && selected.length > 1) {
      const middle = Math.ceil(selected.length / 2);
      await send(bodyFor(selected.slice(0, middle)), selected.slice(0, middle));
      await send(bodyFor(selected.slice(middle)), selected.slice(middle));
      return;
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "PDF 생성에 실패했습니다.");
    }
    results.push(await response.arrayBuffer());
  }
  if (
    (!canSplit || pages.length <= PDF_BATCH_MAX_PAGES) &&
    byteLength(fullBody) <= PDF_REQUEST_MAX_BYTES
  ) {
    await send(fullBody, canSplit ? pages : undefined);
  } else {
    let batch: Element[] = [];
    for (const page of pages) {
      const next = [...batch, page];
      if (
        next.length > PDF_BATCH_MAX_PAGES ||
        byteLength(bodyFor(next)) > PDF_REQUEST_MAX_BYTES
      ) {
        if (!batch.length) throw tooLarge();
        await send(bodyFor(batch), batch);
        batch = [];
      }
      batch.push(page);
      if (byteLength(bodyFor(batch)) > PDF_REQUEST_MAX_BYTES) throw tooLarge();
    }
    if (batch.length) await send(bodyFor(batch), batch);
  }
  if (results.length === 1)
    return new Blob(results, { type: "application/pdf" });
  const { PDFDocument } = await import("pdf-lib");
  const combined = await PDFDocument.create();
  combined.setTitle(title.slice(0, 200));
  for (const bytes of results) {
    const document = await PDFDocument.load(new Uint8Array(bytes));
    for (const page of await combined.copyPages(
      document,
      document.getPageIndices(),
    ))
      combined.addPage(page);
  }
  return new Blob([new Uint8Array(await combined.save())], {
    type: "application/pdf",
  });
}
