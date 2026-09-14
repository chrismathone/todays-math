import { collectHwpxLayout } from "./hwpxLayout";
import { hwpxZip } from "./hwpxZip";

export async function exportPreviewHwpx(
  root: HTMLElement,
  title: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const { pages, assets } = await collectHwpxLayout(root, onProgress);
  const response = await fetch("/api/exports/hwpx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim().slice(0, 200) || "시험지",
      pages,
    }),
  });
  const result = await response
    .json()
    .catch(() => ({ error: "HWPX 생성 서버에 연결하지 못했습니다." }));
  if (!response.ok || typeof result.partsGzip !== "string")
    throw new Error(result.error || "HWPX 생성에 실패했습니다.");
  const bytes = Uint8Array.from(atob(result.partsGzip), (char) =>
    char.charCodeAt(0),
  );
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const parts: Record<string, string> = JSON.parse(
    await new Response(stream).text(),
  );
  return hwpxZip(parts, assets);
}

export function downloadExport(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_");
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
