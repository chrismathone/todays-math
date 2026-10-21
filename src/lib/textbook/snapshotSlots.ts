import { renumberFigureSlots } from "@/lib/problem/figureSlots";

/**
 * 교재 스냅샷 본문의 그림 자리 `[그림:n]` 번호를 **이 투영이 넘기는 그림 배열**의 차례로 고쳐 쓴다 (D-164 ③④).
 *
 * 저장된 본문의 번호는 끝까지 은행의 `figureUrls` 차례다. 그런데 스냅샷은 엔진 SVG 를 그림 배열 **맨 앞**에 둔다
 * (`snapshotFromProblem.ts` — SVG 먼저, 그다음 `figureUrls` 차례). 배열을 그대로 넘기는 투영(교재 지면 · 학생 QR)에서
 * `[그림:1]` 은 첫 스캔 그림이 아니라 SVG 를 가리켰다(2026-10-21 Codex 검토). 그래서 투영할 때만 번호를 옮긴다 —
 * 저장된 본문 · 해시 · 그림 배열은 그대로다. 자리 줄이 없으면 본문을 한 글자도 안 바꾼다.
 *
 * @param figures 스냅샷 그림 배열(`payload.figures`).
 * @param svgAssetId 엔진 SVG 의 자산(`rawSource.figureSvgAssetId`) — 은행 `figureUrls` 에 없는 그림이다.
 * @param shown 이 투영이 렌더러에 넘기는 그림을 `figures` 의 자리로, 넘기는 차례대로.
 */
export function renumberSnapshotSlots(
  content: string,
  figures: readonly { assetId: string }[],
  svgAssetId: string | null | undefined,
  shown: readonly number[],
): string {
  // 엔진 SVG 는 **배치 한 곳**이다 — 캡처는 SVG 를 맨 앞에 한 번 넣는다. 같은 바이트의 그림이 은행 `figureUrls` 에도 있으면
  // 같은 자산이 또 나오므로(자산은 한 벌 · 배치는 그대로) 자산 이름으로 다 빼면 은행 그림까지 빠진다(2026-10-21 Codex 검토).
  // 인쇄 투영(`snapshotToPrintable`)의 `findIndex` 와 같은 자리다.
  const engine = svgAssetId
    ? figures.findIndex((figure) => figure.assetId === svgAssetId)
    : -1;
  const bank = figures
    .map((_, index) => index)
    .filter((index) => index !== engine);
  // 대응이 없는 번호(은행에서 이미 범위 밖 · 이 투영이 안 넘기는 그림)는 0 으로 — 그대로 두면 SVG 하나만큼 밀린 배열에서
  // 다른 그림을 가리킨다. 0 은 범위 밖이라 그 자리는 글로 남는다(`layoutFigureSlots` — 감추지 않는다).
  return renumberFigureSlots(content, (n) => {
    const at = bank[n - 1];
    const position = at === undefined ? -1 : shown.indexOf(at);
    return position < 0 ? 0 : position + 1;
  });
}
