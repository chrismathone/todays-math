/** Capture the same document and active styles that produced measured A4 pages. */
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
  const response = await fetch("/api/exports/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.slice(0, 200),
      html: clone.outerHTML,
      cssUrls,
      cssText: css.join("\n"),
    }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "PDF 생성에 실패했습니다.");
  }
  return response.blob();
}
