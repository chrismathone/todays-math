import { EDITORIAL_STAGES, type EditorialStage } from "../editorial";
import { escapeHtml as esc } from "../markdown";

export interface RenderResources {
  assetUrl: (assetId: string) => string;
  qrDataUrl: (qrTargetId: string, url: string) => string;
  /** Bundled original v15 art; the PDF renderer supplies embedded data URLs. */
  editorialAssetUrl?: (name: string) => string;
}
export const attrUrl = (url: string) => {
  if (
    !/^(?:data:image\/(?:png|jpeg|webp|svg\+xml);base64,|https:\/\/textbook\.invalid\/|\/(?!\/))/.test(
      url,
    )
  )
    throw new Error("지면에는 고정 로컬 자산 URL만 허용합니다.");
  return esc(url);
};
export const editorialImage = (
  resources: RenderResources,
  name: string,
  alt: string,
) =>
  `<img data-textbook-editorial-image src="${attrUrl(resources.editorialAssetUrl?.(name) ?? `/textbook/editorial/${name}`)}" alt="${esc(alt)}">`;
export const progressHtml = (
  stage: EditorialStage,
  steps?: readonly { activity: string; label: string }[],
  activity?: string,
  activeTab?: number,
) => {
  if (steps)
    return steps.length === 0
      ? ""
      : `<nav class="tb-progress" aria-label="학습 단계">${steps.map((step) => `<span${step.activity === activity || step.activity === stage ? ' class="tb-progress-active" aria-current="step"' : ""}>${esc(step.label)}</span>`).join("")}</nav>`;
  const active = activeTab ?? EDITORIAL_STAGES[stage].tab;
  return active < 0
    ? ""
    : `<nav class="tb-progress" aria-label="학습 단계">${["개념 이해", "개념 정리", "기본 확인", "유형 연습", "설명·적용", "다시 꺼내기"].map((label, i) => `<span${i === active ? ' class="tb-progress-active" aria-current="step"' : ""}>${label}</span>`).join("")}</nav>`;
};
export const imageHtml = (
  resources: RenderResources,
  id: string,
  alt: string,
  width?: number,
  portraitAtlas = false,
) =>
  `<img data-textbook-image${portraitAtlas ? " data-textbook-portrait-atlas" : ""} src="${attrUrl(resources.assetUrl(id))}" alt="${esc(alt)}"${width ? ` style="width:${width}mm;max-width:100%"` : ""}>`;
export const qrHtml = (resources: RenderResources, id: string, url: string) =>
  `<figure class="tb-qr" data-qr-id="${esc(id)}" data-qr-url="${esc(url)}"><img src="${attrUrl(resources.qrDataUrl(id, url))}" alt="해설 QR"><figcaption>해설 보기</figcaption></figure>`;
