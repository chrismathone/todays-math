import type { WrongTableLayout } from "./wrongTable";

/** page.evaluate에도 그대로 전달한다. 제출된 HTML의 스크립트는 실행하지 않는다. */
export function styledReportTableDom(
  suppliedRoot: ParentNode | null = null,
  layout?: WrongTableLayout,
  styleId?: string,
) {
  const outer = suppliedRoot ?? document;
  const root = outer.querySelector("[data-paper-desk]") ?? outer;
  const summary = [
    ...root.querySelectorAll<HTMLElement>(
      '[data-report-style][data-er-summary="true"]',
    ),
  ].find((page) => !styleId || page.dataset.reportStyle === styleId);
  const sheet = summary?.querySelector<HTMLElement>(".sc-sheet");
  const area = sheet?.querySelector<HTMLElement>(
    '[data-report-block="wrongTable"]',
  );
  const table = area?.querySelector<HTMLTableElement>("table");
  if (!summary || !sheet || !area || !table || (!layout && !sheet.clientHeight))
    return null;
  const selectedStyle = summary.dataset.reportStyle;
  const rows = [
    ...root.querySelectorAll<HTMLTableRowElement>(
      "[data-report-style] [data-er-wrong-row]",
    ),
  ].filter(
    (row) =>
      row.closest<HTMLElement>("[data-report-style]")?.dataset.reportStyle ===
      selectedStyle,
  );
  if (!rows.length) return null;
  if (
    layout &&
    (!layout.length ||
      layout.some((n) => !Number.isInteger(n) || n < 0) ||
      layout.reduce((sum, n) => sum + n, 0) !== rows.length)
  )
    throw new Error("틀린 문항 표의 행 수가 일치하지 않습니다.");
  const continuation = summary.cloneNode(true) as HTMLElement;
  continuation.removeAttribute("data-er-summary");
  continuation.setAttribute("data-er-table-continuation", "true");
  const nextSheet = continuation.querySelector<HTMLElement>(".sc-sheet")!;
  const nextBody = nextSheet.querySelector<HTMLElement>(".sc-body")!;
  const nextArea = nextBody.querySelector<HTMLElement>(
    '[data-report-block="wrongTable"]',
  )!;
  nextBody.replaceChildren(nextArea);
  nextArea.setAttribute("data-continued", "true");
  nextArea.querySelector("h3")!.textContent = "틀린 문항 (이어서)";
  nextArea.querySelector("tbody")!.replaceChildren();
  const size = (node: HTMLElement) => {
    const page = node.closest<HTMLElement>(".sc-sheet")!;
    const scale =
      page.getBoundingClientRect().height /
      (parseFloat(getComputedStyle(page).height) || page.clientHeight);
    return node.getBoundingClientRect().height / (scale || 1);
  };
  const available = (page: HTMLElement) => {
    const css = getComputedStyle(page);
    const running = page.querySelector<HTMLElement>(".sc-running")!;
    const body = page.querySelector<HTMLElement>(".sc-body")!;
    const end = page.querySelector<HTMLElement>(".sc-pageEnd")!;
    const tbody = body.querySelector<HTMLElement>("tbody")!;
    return (
      (parseFloat(css.height) || page.clientHeight) -
      parseFloat(css.paddingTop) -
      parseFloat(css.paddingBottom) -
      size(running) -
      (parseFloat(getComputedStyle(running).marginBottom) || 0) -
      size(end) -
      (size(body) - size(tbody)) -
      2
    );
  };
  if (layout) {
    for (const page of root.querySelectorAll<HTMLElement>(
      '[data-report-style][data-er-table-continuation="true"]',
    ))
      if (page.dataset.reportStyle === selectedStyle) page.remove();
    let offset = 0;
    let anchor = summary;
    for (const [i, count] of layout.entries()) {
      const page =
        i === 0 ? summary : (continuation.cloneNode(true) as HTMLElement);
      page
        .querySelector("tbody")!
        .replaceChildren(...rows.slice(offset, offset + count));
      offset += count;
      if (i > 0) {
        anchor.after(page);
        anchor = page;
      }
    }
    const pages = [
      ...root.querySelectorAll<HTMLElement>("[data-report-style]"),
    ].filter((page) => page.dataset.reportStyle === selectedStyle);
    for (const [i, page] of pages.entries()) {
      const pageSheet = page.querySelector<HTMLElement>(".sc-sheet")!;
      pageSheet.setAttribute("data-page-number", String(i + 1));
      pageSheet.setAttribute("aria-label", `학생 성적표 ${i + 1}쪽`);
      pageSheet.querySelector("[data-sc-page-count]")!.textContent =
        `${i + 1} / ${pages.length}쪽`;
    }
    return null;
  }
  const ruler = document.createElement("div");
  ruler.style.cssText =
    "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
  ruler.setAttribute("aria-hidden", "true");
  ruler.append(continuation);
  document.body.append(ruler);
  try {
    const first = available(sheet);
    return {
      heights: rows.map(size),
      first,
      continuation: available(nextSheet),
      remaining:
        first -
        [...table.tBodies[0].rows].reduce((sum, row) => sum + size(row), 0),
    };
  } finally {
    ruler.remove();
  }
}

/** 행 이동 뒤 네 양식에 같은 경계 검사를 적용한다. 화면 축척에 의존하지 않는다. */
export function styledReportOverflow(suppliedRoot: ParentNode | null = null) {
  const outer = suppliedRoot ?? document;
  const root = outer.querySelector("[data-paper-desk]") ?? outer;
  return [
    ...root.querySelectorAll<HTMLElement>("[data-report-style] .sc-sheet"),
  ].some((sheet) => {
    if (!sheet.clientHeight) return false;
    const rect = sheet.getBoundingClientRect();
    const css = getComputedStyle(sheet);
    const scale =
      rect.height / (parseFloat(css.height) || sheet.clientHeight) || 1;
    const body = sheet.querySelector<HTMLElement>(".sc-body")!;
    const end = sheet.querySelector<HTMLElement>(".sc-pageEnd")!;
    const blocks = [
      ...body.querySelectorAll<HTMLElement>("[data-report-block]"),
    ];
    if (
      sheet.scrollHeight > sheet.clientHeight + 1 ||
      sheet.scrollWidth > sheet.clientWidth + 1 ||
      body.getBoundingClientRect().bottom >
        end.getBoundingClientRect().top + scale
    )
      return true;
    const bottom = rect.bottom - parseFloat(css.paddingBottom) * scale;
    if (end.getBoundingClientRect().bottom > bottom + scale) return true;
    return blocks.some((block, i) => {
      const box = block.getBoundingClientRect();
      if (block.scrollWidth > block.clientWidth + 1) return true;
      return blocks.slice(i + 1).some((other) => {
        const next = other.getBoundingClientRect();
        return (
          Math.min(box.right, next.right) - Math.max(box.left, next.left) >
            scale &&
          Math.min(box.bottom, next.bottom) - Math.max(box.top, next.top) >
            scale
        );
      });
    });
  });
}
