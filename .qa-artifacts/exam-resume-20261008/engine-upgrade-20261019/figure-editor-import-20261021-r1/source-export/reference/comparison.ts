import { substituteLabels } from "@/lib/figure/mathjaxSubstitute";
import { svgDataUrl } from "@/lib/svgDataUrl";
import { annotateGrid, type MeasuredGrid } from "./gridMeasure";

/**
 * «다시 그리기» 대조 이미지 — 왼쪽 «1. ORIGINAL»(원본), 오른쪽 «2. RECONSTRUCTION»(엔진이 그리고 라벨을 조판한 실제 모습).
 * todays-math 는 서버에서 헤드리스 크롬으로 찍었다(figure-comparison.ts). 여기서는 브라우저 캔버스가 같은 판을 만든다:
 * 1840×960, 칸마다 900×900 안에 비율 유지(contain), 머리 글자 24px — 대조 지시문(figure-prompt.ts)이 이 모양을 말한다.
 */
const WIDTH = 1840;
const HEIGHT = 960;
const PANEL = 900;
const HEAD = 40;
const PAD = 10;
const GAP = 20;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("대조 이미지를 만들지 못했습니다."));
    image.src = src;
  });
}

/** 엔진 SVG 에 크기를 박아 래스터화 품질을 맞춘다(viewBox 만 있으면 브라우저가 작게 그릴 수 있다). */
function sized(svg: string) {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2]! > 0 && vb[3]! > 0) {
    const scale = PANEL / Math.max(vb[2]!, vb[3]!);
    root.setAttribute("width", String(Math.round(vb[2]! * scale)));
    root.setAttribute("height", String(Math.round(vb[3]! * scale)));
  }
  return new XMLSerializer().serializeToString(root);
}

function drawContain(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number) {
  const w = image.naturalWidth || PANEL;
  const h = image.naturalHeight || PANEL;
  const scale = Math.min(PANEL / w, PANEL / h);
  const dw = w * scale;
  const dh = h * scale;
  ctx.drawImage(image, x + (PANEL - dw) / 2, y + (PANEL - dh) / 2, dw, dh);
}

/**
 * 재작도 SVG 의 모눈(`<g data-grid>`)을 래스터 좌표의 모눈으로 — 재작도 판에도 원본 판과 같은 격자 좌표를 적기 위해.
 * math-figure-editor 2026-10-21: 대조 모델이 칸 수를 바퀴마다 다르게 셌다. 두 판에 같은 방식의 좌표 숫자를 적으면
 * 끝점을 숫자로 맞댈 수 있다.
 */
function rasterGrid(svg: string, width: number, height: number): MeasuredGrid | null {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const values = (root.querySelector("g[data-grid]")?.getAttribute("data-grid") ?? "").trim().split(/\s+/).map(Number);
  if (vb.length !== 4 || !vb.every(Number.isFinite) || values.length !== 6 || !values.every(Number.isFinite)) return null;
  const [x0, y0, cw, ch, cols, rows] = values as [number, number, number, number, number, number];
  const sx = width / vb[2]!;
  const sy = height / vb[3]!;
  const first = (x0 - vb[0]!) * sx;
  const top = (y0 - vb[1]!) * sy;
  return {
    width,
    height,
    x: { first, last: first + cols * cw * sx, cell: cw * sx, count: cols, found: cols + 1 },
    y: { first: top, last: top + rows * ch * sy, cell: ch * sy, count: rows, found: rows + 1 },
  };
}

/** 이미지 요소 → PNG data URL(그 크기 그대로). */
function rasterize(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || PANEL;
  canvas.height = image.naturalHeight || PANEL;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function buildComparisonImage(
  original: string,
  engineSvg: string,
  /** 둘레에 격자 좌표를 적은 원본(`annotateGrid`) — 주면 재작도 판에도 그 모눈의 좌표를 적는다. */
  annotatedOriginal?: string,
): Promise<string> {
  const typeset = substituteLabels(engineSvg);
  if (typeset.unresolved.length) throw new Error("재작도한 도형의 수식 라벨을 조판하지 못했습니다.");
  const sizedSvg = sized(typeset.svg);
  let [source, rebuilt] = await Promise.all([loadImage(annotatedOriginal ?? original), loadImage(svgDataUrl(sizedSvg))]);
  if (annotatedOriginal) {
    const raster = rasterize(rebuilt);
    const grid = raster && rasterGrid(sizedSvg, rebuilt.naturalWidth || PANEL, rebuilt.naturalHeight || PANEL);
    const marked = raster && grid ? await annotateGrid(raster, grid) : null;
    // 재작도에 모눈이 없거나 못 적으면 원본도 숫자 없이(두 판이 같은 조건이어야 비교가 된다)
    if (marked) rebuilt = await loadImage(marked);
    else source = await loadImage(original);
  }
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("대조 이미지를 만들지 못했습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const left = PAD;
  const right = PAD + PANEL + GAP;
  ctx.fillText("1. ORIGINAL", left + PANEL / 2, PAD + HEAD / 2);
  ctx.fillText("2. RECONSTRUCTION", right + PANEL / 2, PAD + HEAD / 2);
  drawContain(ctx, source, left, PAD + HEAD);
  drawContain(ctx, rebuilt, right, PAD + HEAD);
  return canvas.toDataURL("image/png");
}
