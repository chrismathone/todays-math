/**
 * 원본 그림의 모눈 재기 — math-figure-editor 2026-10-21.
 *
 * 모델은 모눈 칸을 세는 데 약하다(같은 그림을 바퀴마다 16×9 · 18×11 · 19×11 로 셌다). 칸 위치를 모르면 벡터 끝점도
 * 칸을 잘못 짚는다. 그래서 **픽셀로 직접 잰다**: 세로로 긴 선은 열마다 어두운 점이 많이 쌓이고(가로선은 행마다),
 * 그 봉우리가 일정한 간격으로 늘어서면 모눈이다. 잰 값은 «다시 그리기» 지시에 실어 모델이 칸을 세는 대신 쓰게 하고,
 * 모델이 낸 끝점은 격자점에 맞춘다(`gridSnap.ts`).
 *
 * 확신이 없으면 null — 모눈이 없는 그림에 엉뚱한 칸 정보를 실으면 그림을 망친다.
 */

export interface GridAxis {
  /** 첫 선·마지막 선의 위치(픽셀) */
  first: number;
  last: number;
  /** 칸 크기(픽셀) */
  cell: number;
  /** 칸 수 */
  count: number;
  /** 실제로 찾은 선 수(빠진 선이 있으면 count+1 보다 적다) */
  found: number;
}

export interface MeasuredGrid {
  width: number;
  height: number;
  x: GridAxis;
  y: GridAxis;
}

/** 열(또는 행)마다 «어두운 점의 비율» — 한 축의 봉우리 그림. */
export function darkProfile(
  gray: ArrayLike<number>,
  width: number,
  height: number,
  axis: "x" | "y",
  threshold: number,
): number[] {
  const length = axis === "x" ? width : height;
  const span = axis === "x" ? height : width;
  const profile = new Array<number>(length).fill(0);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (gray[row + x]! < threshold) profile[axis === "x" ? x : y]!++;
    }
  }
  return profile.map((count) => count / span);
}

/** 봉우리 → 일정 간격의 선들. 확신이 없으면 null. */
export function latticeFromProfile(profile: readonly number[]): GridAxis | null {
  const max = Math.max(...profile);
  // 모눈 선은 그림 높이(너비)의 상당 부분을 가로지른다 — 글자·대각선 벡터는 봉우리가 낮다
  if (!(max >= 0.25)) return null;
  const cut = max * 0.45;
  const centers: number[] = [];
  for (let i = 0; i < profile.length; ) {
    if (profile[i]! < cut) {
      i++;
      continue;
    }
    let j = i;
    let weight = 0;
    let sum = 0;
    while (j < profile.length && profile[j]! >= cut) {
      weight += profile[j]!;
      sum += profile[j]! * j;
      j++;
    }
    const center = sum / weight;
    // 굵은 선이 둘로 갈라져 보이면 하나로
    if (centers.length && center - centers[centers.length - 1]! < 3) centers[centers.length - 1] = (centers[centers.length - 1]! + center) / 2;
    else centers.push(center);
    i = j;
  }
  if (centers.length < 4) return null;
  const diffs = centers.slice(1).map((c, i) => c - centers[i]!);
  const sorted = [...diffs].sort((a, b) => a - b);
  // 빠진 선(두 칸 간격)은 위쪽으로 치우치므로 아래쪽 사분위 근처를 기준 칸으로
  const base = sorted[Math.floor(sorted.length * 0.3)]!;
  if (!(base >= 4)) return null;
  // 일정 간격으로 **이어진** 선 묶음만 — 문제 위 머리줄·밑줄처럼 멀리 떨어진 선이 끼면 칸 수가 부푼다
  // (문제 전체 그림에서 세로 10칸을 14칸으로 셌다). 한 칸 빠진 것(두 칸 간격)까지는 이어진 것으로 본다.
  const step = (d: number) => {
    const k = Math.round(d / base);
    return k >= 1 && k <= 2 && Math.abs(d / base - k) < 0.2 ? k : 0;
  };
  let best = { start: 0, end: 0 };
  for (let start = 0, i = 0; i <= diffs.length; i++) {
    if (i === diffs.length || !step(diffs[i]!)) {
      if (i - start > best.end - best.start) best = { start, end: i };
      start = i + 1;
    }
  }
  const chain = centers.slice(best.start, best.end + 1);
  if (chain.length < 4 || chain.length < centers.length * 0.6) return null;
  let steps = 0;
  let total = 0;
  for (let i = 1; i < chain.length; i++) {
    const d = chain[i]! - chain[i - 1]!;
    steps += step(d);
    total += d;
  }
  const cell = total / steps;
  const first = chain[0]!;
  const last = chain[chain.length - 1]!;
  const count = Math.round((last - first) / cell);
  if (count < 2 || count > 60) return null;
  return { first, last, cell, count, found: chain.length };
}

/** 회색 픽셀 배열에서 모눈 재기. */
export function measureGridFromGray(gray: ArrayLike<number>, width: number, height: number): MeasuredGrid | null {
  // 바탕 밝기(중앙값)보다 꽤 어두우면 잉크 — 회색 모눈선도 잡히게
  const sample: number[] = [];
  const stride = Math.max(1, Math.floor(gray.length / 4000));
  for (let i = 0; i < gray.length; i += stride) sample.push(gray[i]!);
  sample.sort((a, b) => a - b);
  const background = sample[Math.floor(sample.length / 2)]!;
  const threshold = Math.max(60, background - 35);
  const x = latticeFromProfile(darkProfile(gray, width, height, "x", threshold));
  const y = latticeFromProfile(darkProfile(gray, width, height, "y", threshold));
  if (!x || !y) return null;
  // 모눈종이는 칸이 정사각형에 가깝다 — 크게 다르면 모눈이 아니라 표·그래프 눈금일 수 있다
  const ratio = x.cell / y.cell;
  if (ratio < 0.75 || ratio > 1.33) return null;
  // 교차 확인 — 세로선이 실제로 뻗은 범위가 가로선들의 처음~끝과 맞아야(반대도) 한 모눈이다. 문제 전체 그림에서
  // 글줄·밑줄이 가로선 몇 개와 섞이면 한쪽 축만 일부 잡혀 칸 수가 틀린다(세로 10칸을 6칸으로) — 그럴 땐 안 싣는다.
  const spanY = lineSpan(gray, width, height, "x", x, threshold);
  const spanX = lineSpan(gray, width, height, "y", y, threshold);
  if (!spanY || !spanX) return null;
  const rows = reconcile(y, spanY, height);
  const cols = reconcile(x, spanX, width);
  if (!rows || !cols) return null;
  return { width, height, x: cols, y: rows };
}

/**
 * 잰 선 묶음을 반대 방향 선이 뻗은 범위(`span`)에 맞춘다.
 * - 범위가 정수 칸만큼 더 뻗었으면 그만큼 넓힌다(글줄과 섞여 일부만 잡힌 축을 되살린다 — 세로 6칸 → 10칸).
 * - 그림 가장자리에 닿은 쪽은 크롭에 잘린 것이라 잰 선을 그대로 둔다(벡터 크롭의 오른쪽 끝).
 * - 칸 경계와 어긋나면(한 모눈이 아니면) null.
 */
function reconcile(a: GridAxis, span: [number, number], limit: number): GridAxis | null {
  const fit = (edge: number, at: number, cropped: boolean) => {
    if (cropped) return at;
    const k = (at - edge) / a.cell;
    const r = Math.round(k);
    return Math.abs(k - r) > 0.35 ? NaN : at - r * a.cell;
  };
  const first = fit(span[0], a.first, span[0] <= 3);
  const last = fit(span[1], a.last, span[1] >= limit - 4);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last <= first) return null;
  const count = Math.round((last - first) / a.cell);
  if (count < 2 || count > 60) return null;
  return { ...a, first, last, count };
}

/**
 * 한 축의 모눈선들이 **가로질러 뻗은 범위** — 세로선(axis "x")이면 위아래 범위를 픽셀로.
 * 각 행에서 모눈선 자리의 절반 가까이가 어두우면 그 행은 선이 지나는 행이다. 가장 긴 이어진 구간(틈 3px 허용).
 */
export function lineSpan(
  gray: ArrayLike<number>,
  width: number,
  height: number,
  axis: "x" | "y",
  lines: GridAxis,
  threshold: number,
): [number, number] | null {
  const positions = Array.from({ length: lines.count + 1 }, (_, k) => lines.first + k * lines.cell);
  const along = axis === "x" ? height : width;
  // 스캔 모눈은 점선처럼 끊겨 찍힌다 — 선 자리 ±1px, 진행 방향 ±2px 안에 잉크가 있으면 그 자리를 지난 것으로
  const dark = (p: number, t: number) => {
    for (let d = -1; d <= 1; d++)
      for (let e = -2; e <= 2; e++) {
        const q = Math.round(p) + d;
        const [px, py] = axis === "x" ? [q, t + e] : [t + e, q];
        if (px >= 0 && px < width && py >= 0 && py < height && gray[py * width + px]! < threshold) return true;
      }
    return false;
  };
  const maxGap = Math.max(3, Math.round(lines.cell * 0.5));
  let best: [number, number] | null = null;
  let start = -1;
  let gap = 0;
  for (let t = 0; t <= along; t++) {
    const covered = t < along && positions.filter((p) => dark(p, t)).length >= positions.length * 0.4;
    if (covered) {
      if (start < 0) start = t;
      gap = 0;
    } else if (start >= 0 && ++gap > maxGap) {
      const end = t - gap;
      if (!best || end - start > best[1] - best[0]) best = [start, end];
      start = -1;
      gap = 0;
    }
  }
  if (start >= 0) {
    const end = along - 1 - gap;
    if (!best || end - start > best[1] - best[0]) best = [start, end];
  }
  return best;
}

/** 그림(data URL)에서 모눈 재기 — 브라우저 전용. 못 재면 null. */
export async function measureGrid(dataUrl: string): Promise<MeasuredGrid | null> {
  if (typeof document === "undefined") return null;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("load"));
      img.src = dataUrl;
    });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight, 1));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const gray = new Uint8ClampedArray(width * height);
    for (let i = 0; i < gray.length; i++) gray[i] = (data[i * 4]! * 299 + data[i * 4 + 1]! * 587 + data[i * 4 + 2]! * 114) / 1000;
    return measureGridFromGray(gray, width, height);
  } catch {
    return null;
  }
}

const pct = (v: number, total: number) => `${Math.round((v / total) * 1000) / 10}%`;

/**
 * 잰 모눈을 «다시 그리기» 지시로 — 모델이 칸을 세는 대신 이 값을 쓰고, 끝점은 격자점으로 옮기게 한다.
 * `annotated` 면 첨부 그림 둘레에 격자 좌표 숫자를 적어 보냈다는 뜻(`annotateGrid`) — 끝점을 그 숫자로 읽게 한다.
 * 아니면 위치를 그림 크기에 대한 비율로 준다(모델이 보는 해상도와 무관하게).
 */
export function gridHint(g: MeasuredGrid, annotated = false): string {
  return [
    `측정된 모눈(원본 픽셀 분석, 근사): 가로 ${g.x.count}칸 × 세로 ${g.y.count}칸의 정사각형 모눈.`,
    annotated
      ? `첨부 그림 둘레에 빨간 숫자로 모눈 좌표를 적어 두었다 — 위·아래 숫자는 세로선의 x(왼쪽 끝 선이 0), 왼쪽·오른쪽 숫자는 가로선의 y(아래쪽 끝 선이 0). 빨간 숫자와 빨간 눈금은 원본 그림이 아니다(그리지 않는다).`
      : `모눈의 왼쪽 끝 선은 그림 가로의 ${pct(g.x.first, g.width)}, 오른쪽 끝 선은 ${pct(g.x.last, g.width)}, 위쪽 끝 선은 그림 세로의 ${pct(g.y.first, g.height)}, 아래쪽 끝 선은 ${pct(g.y.last, g.height)} 위치다.`,
    `graph-1 axes:false, grid {step:1}, xRange [0,${g.x.count}], yRange [0,${g.y.count}] 로 그려라(왼쪽 아래 모서리가 (0,0)).`,
    annotated
      ? `벡터·선분·도형의 끝점은 그 끝이 닿은 세로선·가로선의 빨간 숫자를 읽어 격자점(정수 좌표)에 정확히 둔다. 반 칸(예: 13.5) 좌표는 쓰지 않는다. 칸 수보다 끝점 위치가 더 중요하다.`
      : `벡터·선분·도형의 끝점은 원본에서 왼쪽 끝 선·아래쪽 끝 선으로부터 칸을 세어 그 격자점(정수 좌표)에 정확히 둔다. 칸 수보다 끝점 위치가 더 중요하다.`,
  ].join(" ");
}

/** 대조 지시 — 두 판 모두 격자 좌표 숫자가 적혀 있을 때. 칸 수 차이는 지적하지 않고 끝점 좌표만 맞댄다. */
export function gridReviewHint(g: MeasuredGrid): string {
  return [
    `두 판 모두 둘레에 빨간 숫자로 모눈 좌표를 적어 두었다(원본은 측정값 가로 ${g.x.count}×세로 ${g.y.count}칸, 재작도는 그린 모눈).`,
    `빨간 숫자·눈금은 그림이 아니다. 칸 수가 한두 칸 다른 것은 지적하지 않는다(사용자가 고친다).`,
    `각 벡터·선분의 시작점과 끝점이 놓인 격자 좌표를 두 판의 빨간 숫자로 읽어 비교하고, 다르면 «벡터 d 끝점: 원본 (14,7), 재작도 (13,7)» 처럼 좌표로 지적한다.`,
  ].join(" ");
}

/**
 * 모델에 보낼 원본 그림에 **격자 좌표를 적어 준다** — 둘레에 여백을 붙여 세로선마다 x 를(위·아래), 가로선마다
 * y 를(왼쪽·오른쪽, 아래가 0) 빨간 숫자로. 모델이 칸을 세지 않고 숫자로 끝점을 읽는다(반 칸 어림을 줄인다).
 * 칸이 작으면 숫자가 읽히게 그림째 키운다. 실패하면 null(원본을 그대로 쓴다).
 */
export async function annotateGrid(dataUrl: string, g: MeasuredGrid): Promise<string | null> {
  if (typeof document === "undefined") return null;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("load"));
      img.src = dataUrl;
    });
    const toImage = image.naturalWidth / g.width;
    const cellPx = g.x.cell * toImage;
    // 한 칸이 28px 은 되게(두 자리 숫자가 칸 안에 들어간다), 긴 변은 2000px 까지
    const zoom = Math.min(Math.max(1, 28 / cellPx), 2000 / Math.max(image.naturalWidth, image.naturalHeight));
    const s = toImage * zoom;
    const w = image.naturalWidth * zoom;
    const h = image.naturalHeight * zoom;
    const font = Math.max(11, Math.round(g.x.cell * s * 0.5));
    const pad = Math.round(font * 2.2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w + pad * 2);
    canvas.height = Math.round(h + pad * 2);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, pad, pad, w, h);
    ctx.fillStyle = "#d32f2f";
    ctx.strokeStyle = "#d32f2f";
    ctx.lineWidth = 1;
    ctx.font = `${font}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tick = font * 0.5;
    for (let k = 0; k <= g.x.count; k++) {
      const x = pad + (g.x.first + k * g.x.cell) * s;
      ctx.fillText(String(k), x, pad / 2);
      ctx.fillText(String(k), x, pad + h + pad / 2);
      ctx.beginPath();
      ctx.moveTo(x, pad - tick);
      ctx.lineTo(x, pad);
      ctx.moveTo(x, pad + h);
      ctx.lineTo(x, pad + h + tick);
      ctx.stroke();
    }
    for (let j = 0; j <= g.y.count; j++) {
      const y = pad + (g.y.last - j * g.y.cell) * s;
      ctx.fillText(String(j), pad / 2, y);
      ctx.fillText(String(j), pad + w + pad / 2, y);
      ctx.beginPath();
      ctx.moveTo(pad - tick, y);
      ctx.lineTo(pad, y);
      ctx.moveTo(pad + w, y);
      ctx.lineTo(pad + w + tick, y);
      ctx.stroke();
    }
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}
