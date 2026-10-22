/**
 * 그림 내보내기 — SVG 데이터 URL → 흰 바탕 PNG, 그리고 내려받기. 앱 결과 화면과 편집기 «이미지 저장»이 같이 쓴다
 * (사용자 2026-10-21 «SVG 저장·도형 적용 합쳐서 → 이미지 저장(png)»).
 */
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("그림을 열지 못했습니다."));
    image.src = src;
  });
}

/** 시험지에 넣을 해상도 — 그림 단위의 3배(약 288dpi 상당). */
export async function svgToPng(svgDataUrl: string, scale = 3): Promise<string> {
  const image = await loadImage(svgDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((image.naturalWidth || 400) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || 300) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("PNG 를 만들지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function download(name: string, href: string) {
  if (!/\.png$/i.test(name) || !/^data:image\/png(?:;|,)/i.test(href))
    throw new Error("PNG 이미지만 저장할 수 있습니다.");
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.dispatchEvent(new Event("figure:png-exported"));
}

/** 모두의 최근 작업 미리보기 — 긴 변 240px WebP(되지 않는 브라우저는 PNG). 흰 바탕. */
export async function svgThumbnail(svgDataUrl: string, side = 240): Promise<string> {
  const image = await loadImage(svgDataUrl);
  const w = image.naturalWidth || 400,
    h = image.naturalHeight || 300;
  const k = side / Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("미리보기를 만들지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const webp = canvas.toDataURL("image/webp", 0.8);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/png");
}
