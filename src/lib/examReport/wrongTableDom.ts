import type { WrongTableLayout } from "./wrongTable";

/**
 * 자체 글꼴을 읽은 뒤 화면과 서버 Chromium이 함께 쓰는 행 단위 실측/재배치.
 * page.evaluate에 함수를 그대로 넘기므로 바깥 실행 값에 의존하지 않는다.
 * 화면은 측정값으로 React를 다시 그린다. DOM 쓰기는 서버 PDF에서만 쓴다.
 */
export function examReportTableDom(
  suppliedRoot: ParentNode | null = null,
  layout?: WrongTableLayout,
) {
  const outer = suppliedRoot ?? document;
  // PaperStrip 확대 창에는 같은 쪽이 한 벌 더 있다. 원본 띠만 잰다.
  const root = outer.querySelector("[data-paper-desk]") ?? outer;
  const summary = root.querySelector<HTMLElement>('[data-er-summary="true"]');
  const table = summary?.querySelector<HTMLTableElement>(".er-wrongTable");
  const sheet = summary?.querySelector<HTMLElement>(".er-sheet");
  if (!summary || !table || !sheet || (!layout && !sheet.clientHeight))
    return null;
  const rows = [
    ...root.querySelectorAll<HTMLTableRowElement>("[data-er-wrong-row]"),
  ];
  if (
    layout &&
    (!layout.length ||
      layout.some((count) => !Number.isInteger(count) || count < 0) ||
      layout.reduce((sum, count) => sum + count, 0) !== rows.length)
  ) {
    throw new Error("틀린 문항 표의 행 수가 일치하지 않습니다.");
  }
  const continuation = summary.cloneNode(true) as HTMLElement;
  continuation.removeAttribute("data-er-summary");
  continuation.setAttribute("data-er-table-continuation", "true");
  const nextSheet = continuation.querySelector<HTMLElement>(".er-sheet")!;
  for (const child of [...nextSheet.children]) {
    if (!child.matches(".er-paperHead, .er-wrongArea, .er-footer"))
      child.remove();
  }
  continuation.querySelector("[data-er-head-kind]")!.textContent =
    "틀린 문항 (이어서)";
  continuation.querySelector(".er-area h3")!.textContent = "틀린 문항 (이어서)";
  const nextBody = continuation.querySelector("tbody")!;
  nextBody.replaceChildren();

  const size = (node: HTMLElement) => {
    const page = node.closest<HTMLElement>(".er-sheet")!;
    const height =
      parseFloat(getComputedStyle(page).height) || page.clientHeight;
    const scale = page.getBoundingClientRect().height / height;
    return node.getBoundingClientRect().height / (scale || 1);
  };
  const available = (page: HTMLElement) => {
    const style = getComputedStyle(page);
    const area = page.querySelector<HTMLElement>(".er-wrongArea")!;
    const body = area.querySelector<HTMLElement>("tbody")!;
    const children = [...page.children] as HTMLElement[];
    return (
      (parseFloat(style.height) || page.clientHeight) -
      parseFloat(style.paddingTop || "0") -
      parseFloat(style.paddingBottom || "0") -
      children
        .filter((child) => child !== area)
        .reduce((sum, child) => sum + size(child), 0) -
      (parseFloat(style.rowGap) || 0) * (children.length - 1) -
      (size(area) - size(body)) -
      2
    );
  };

  if (layout) {
    // 구조 시험에서도 실측 없이 원래 행과 머리를 그대로 옮긴다.
    for (const page of root.querySelectorAll(
      '[data-er-table-continuation="true"]',
    ))
      page.remove();
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
      ...root.querySelectorAll<HTMLElement>("[data-exam-report-page]"),
    ];
    for (const [i, page] of pages.entries()) {
      const pageSheet = page.querySelector<HTMLElement>(".er-sheet")!;
      pageSheet.setAttribute("data-page-number", String(i + 1));
      pageSheet.setAttribute("aria-label", `학생 성적표 ${i + 1}쪽`);
      pageSheet.querySelector(".er-footer span:last-child")!.textContent =
        `${i + 1} / ${pages.length}쪽`;
    }
    return null;
  }

  // 독립된 원본 크기 복제본에서 이어지는 쪽 머리의 줄바꿈까지 잰다.
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
