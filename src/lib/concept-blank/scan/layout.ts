import {
  scanIssuedLayoutSchema,
  scanQrSchema,
  type ScanIssuedLayout,
  type ScanQr,
} from "@/contracts/conceptBlankScanIssued.contract";
import type { ScanSnapshot } from "@/contracts/conceptBlankScan.contract";

/** The public QR is an identifier, never authorization or answer content. */
export function scanQrUrl(origin: string, value: ScanQr): string {
  const qr = scanQrSchema.parse(value);
  const url = new URL("/concept-blank/scan", origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new RangeError("지면 주소가 맞지 않습니다.");
  url.search = new URLSearchParams({
    p: qr.printedSheetId,
    page: String(qr.page),
    part: qr.part,
  }).toString();
  return url.toString();
}

export function parseScanQr(raw: string, origin: string): ScanQr {
  if (raw.length > 1000) throw new RangeError("사진의 QR 주소가 너무 깁니다.");
  const url = new URL(raw);
  if (
    url.origin !== new URL(origin).origin ||
    url.username ||
    url.password ||
    url.hash ||
    url.pathname !== "/concept-blank/scan" ||
    [...url.searchParams.keys()].sort().join(",") !== "p,page,part" ||
    !/^[1-9]\d*$/.test(url.searchParams.get("page") ?? "")
  )
    throw new RangeError("이 서비스에서 발행한 지면 QR이 아닙니다.");
  return scanQrSchema.parse({
    printedSheetId: url.searchParams.get("p"),
    page: Number(url.searchParams.get("page")),
    part: url.searchParams.get("part"),
  });
}

/** A trusted renderer must account for every snapshot slot exactly once and in stable display order. */
export function matchScanLayout(
  snapshot: ScanSnapshot,
  input: ScanIssuedLayout,
): ScanIssuedLayout {
  const layout = scanIssuedLayoutSchema.parse(input);
  const pages = layout.pages.filter((p) => p.part === "student");
  if (pages.length !== snapshot.pageCount)
    throw new RangeError("발행 지면과 답 칸의 쪽 수가 다릅니다.");
  for (const [i, page] of pages.entries()) {
    const ids = snapshot.pages[i].slots.map((s) => s.id);
    if (
      ids.length !== page.slots.length ||
      page.slots.some((s, j) => s.slotId !== ids[j])
    )
      throw new RangeError("발행 지면과 답 칸 연결이 다릅니다.");
  }
  return layout;
}
