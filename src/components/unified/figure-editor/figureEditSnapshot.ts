import type { FigureNumber } from "./figureObjectNumbers";
import { svgDataUrl } from "./figureDocument";

/**
 * «요청대로 고치기»가 AI 에게 보내는 이미지 한 장 — 왼쪽 «1. 원본»(분리한 원본), 오른쪽 «2. 지금 그림»(편집기에 보이는
 * 그대로, 요소 번호와 점선 지시선까지). 지시문(figure-edit-prompt.ts)이 이 모양을 말한다. 전송층(구독 CLI·서버 API)은
 * 이미지를 한 장만 받아 두 장을 한 장으로 합친다.
 * 번호 자리는 편집기의 `layoutFigureNumbers` 결과(그림 상자 기준 CSS px)를 그대로 옮긴다 — 번호가 곧 요소 목록 번호다.
 */
const PANEL = 720;
const HEAD = 44;
const GAP = 24;
/** 편집기 번호 층(FigureNumberLayer)과 같은 색 — StudioFigureEditor.module.css 의 토큰 값. */
const TAG = {
  fill: "#edf3ff",
  line: "#a9bdea",
  ink: "#284f93",
  leader: "#94a3b8",
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("AI 에 보낼 그림 이미지를 만들지 못했습니다."));
    image.src = src;
  });
}

export async function buildFigureEditSnapshot({
  original,
  figureSvg,
  width,
  height,
  numbers,
}: {
  /** 분리한 원본(data: 또는 blob:) — 없으면 «원본 없음». */
  original?: string;
  /** 조판을 마친 지금 그림(편집기 화면과 같은 viewBox). */
  figureSvg: string;
  /** 편집기 캔버스의 그림 상자 크기(CSS px) — 번호 자리의 기준. */
  width: number;
  height: number;
  numbers: readonly FigureNumber[];
}): Promise<string> {
  const scale = PANEL / Math.max(width, height, 1);
  const figureWidth = Math.round(width * scale),
    figureHeight = Math.round(height * scale);
  // 번호는 그림 둘레 12px 바깥에 선다 — 배율만큼 여백을 둔다.
  const pad = Math.round(12 * scale) + 18;
  const tagScale = Math.min(1.4, Math.max(0.7, scale));
  const source = original ? await loadImage(original).catch(() => null) : null;
  const sourceScale = source
    ? PANEL / Math.max(source.naturalWidth, source.naturalHeight, 1)
    : 1;
  const sourceWidth = source
      ? Math.round(source.naturalWidth * sourceScale)
      : 0,
    sourceHeight = source ? Math.round(source.naturalHeight * sourceScale) : 0;
  const leftWidth = source ? sourceWidth + 36 : 240,
    leftHeight = source ? sourceHeight + 36 : 80;
  const rightWidth = figureWidth + pad * 2,
    rightHeight = figureHeight + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = leftWidth + GAP + rightWidth;
  canvas.height = HEAD + Math.max(leftHeight, rightHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("AI 에 보낼 그림 이미지를 만들지 못했습니다.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000000";
  context.font = "600 22px Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillText("1. 원본", 18, HEAD / 2);
  const right = leftWidth + GAP;
  context.fillText("2. 지금 그림", right + 18, HEAD / 2);
  if (source)
    context.drawImage(source, 18, HEAD + 18, sourceWidth, sourceHeight);
  else {
    context.font = "16px Arial, sans-serif";
    context.fillText("원본 없음", 18, HEAD + 40);
  }
  // 두 칸 사이 구분선
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(leftWidth + GAP / 2, 8);
  context.lineTo(leftWidth + GAP / 2, canvas.height - 8);
  context.stroke();

  const doc = new DOMParser().parseFromString(figureSvg, "image/svg+xml");
  doc.documentElement.setAttribute("width", String(figureWidth));
  doc.documentElement.setAttribute("height", String(figureHeight));
  const figure = await loadImage(
    svgDataUrl(new XMLSerializer().serializeToString(doc.documentElement)),
  );
  const x0 = right + pad,
    y0 = HEAD + pad;
  context.drawImage(figure, x0, y0, figureWidth, figureHeight);

  const radius = 10 * tagScale;
  for (const item of numbers) {
    const x = x0 + item.x * scale,
      y = y0 + item.y * scale;
    context.setLineDash([3, 4]);
    context.strokeStyle = TAG.leader;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x0 + item.targetX * scale, y0 + item.targetY * scale);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = TAG.fill;
    context.strokeStyle = TAG.line;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.fillStyle = TAG.ink;
    context.font = `600 ${Math.round(11 * tagScale)}px Arial, sans-serif`;
    context.textAlign = "center";
    context.fillText(String(item.number), x, y);
    context.textAlign = "start";
  }
  return canvas.toDataURL("image/png");
}
