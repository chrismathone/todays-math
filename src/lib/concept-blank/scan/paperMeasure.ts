import type { ScanSnapshot } from "@/contracts/conceptBlankScan.contract";
import type { ScanIssuedLayout } from "@/contracts/conceptBlankScanIssued.contract";

/** Runs inside isolated Chromium. No imports/closures: trusted DOM + snapshot inventory only. */
export function measureScanPaper(snapshot: ScanSnapshot): {
  layout: ScanIssuedLayout;
  overflow: number[];
} {
  const roots = [
    ...document.querySelectorAll<HTMLElement>("[data-print-page]"),
  ];
  const overflow: number[] = [];
  const pages = roots.map((root) => {
    const sheet = root.querySelector<HTMLElement>("[data-cb-issued-part]")!;
    const part = sheet.dataset.cbIssuedPart as "student" | "key";
    const number = Number(sheet.dataset.cbIssuedPage);
    const rect = root.getBoundingClientRect();
    if (
      Math.abs(rect.width - (210 * 96) / 25.4) > 0.5 ||
      Math.abs(rect.height - (297 * 96) / 25.4) > 0.5
    )
      throw new Error("발행 지면의 A4 치수가 맞지 않습니다.");
    const box = (elements: Element[]) => {
      if (!elements.length)
        throw new Error("발행 지면의 답 칸을 찾지 못했습니다.");
      const bounds = elements.map((element) => element.getBoundingClientRect());
      const left = Math.min(...bounds.map((r) => r.left)),
        top = Math.min(...bounds.map((r) => r.top));
      const right = Math.max(...bounds.map((r) => r.right)),
        bottom = Math.max(...bounds.map((r) => r.bottom));
      return {
        x: ((left - rect.left) / rect.width) * 210,
        y: ((top - rect.top) / rect.height) * 297,
        width: ((right - left) / rect.width) * 210,
        height: ((bottom - top) / rect.height) * 297,
      };
    };
    const inventory =
      part === "student" ? snapshot.pages[number - 1] : undefined;
    const slots =
      inventory?.slots.map((slot) => {
        const question = inventory.questions.find(
          (q) => q.id === slot.questionId,
        )!;
        const containers = root.querySelectorAll(
          `[data-cb-question="${question.number}"]`,
        );
        if (containers.length !== 1)
          throw new Error("발행 지면의 문항 연결이 맞지 않습니다.");
        const container = containers[0];
        const suffix = slot.id.slice(slot.questionId.length + 1);
        let elements: Element[];
        if (slot.kind === "cloze")
          elements = [...container.querySelectorAll("[data-cb-blank]")].slice(
            Number(suffix.slice(1)) - 1,
            Number(suffix.slice(1)),
          );
        else if (slot.kind === "figure-tag")
          elements = [
            ...container.querySelectorAll("[data-cb-tag] > rect"),
          ].slice(Number(suffix.slice(3)) - 1, Number(suffix.slice(3)));
        else
          elements = [
            ...container.querySelectorAll(`[data-cb-region="${suffix}"]`),
          ];
        return { slotId: slot.id, box: box(elements) };
      }) ?? [];
    const markers = (["tl", "tr", "br", "bl"] as const).map((id) => {
      const b = box([
        ...root.querySelectorAll(`[data-cb-registration="${id}"]`),
      ]);
      return { id, x: b.x + b.width / 2, y: b.y + b.height / 2 };
    });
    let excess = Math.max(0, sheet.scrollHeight - sheet.clientHeight);
    for (const area of root.querySelectorAll<HTMLElement>("[data-cb-fit]")) {
      const boundary = area.getBoundingClientRect();
      excess = Math.max(
        excess,
        area.scrollHeight - area.clientHeight,
        ...[...area.querySelectorAll("*")].map((node) => {
          const r = node.getBoundingClientRect();
          // SVG connector strokes may intentionally extend; only visible HTML content is a body boundary.
          return node instanceof SVGElement
            ? 0
            : Math.max(0, r.bottom - boundary.bottom, r.right - boundary.right);
        }),
      );
    }
    overflow.push(excess);
    return {
      part,
      number,
      width: 210 as const,
      height: 297 as const,
      markers,
      qr: box([...root.querySelectorAll("[data-cb-issued-qr]")]),
      slots,
    };
  });
  return { layout: { version: 1, pages }, overflow };
}
