/**
 * Hi-fi 시안용 수직선 SVG — 엔진 `scripts/figure/elementary.py` `_number_line` 과 같은 치수
 * (폭 268 · 축 1.4px · 눈금 숫자 Batang 11 · 600)에 **범위**(Wire R1 — 축 위 선 · 포함 ● · 불포함 ○)를 더했다.
 * 엔진에 넣을 때 이 함수가 정본이 아니다 — 고르신 값을 파이썬 쪽에 옮겨 적고 시험으로 잠근다.
 */

export type Range = {
  /** null 이면 왼쪽 끝까지(미만 · 이하). */
  from: number | null;
  /** null 이면 오른쪽 끝까지(이상 · 초과). */
  to: number | null;
  fromIn?: boolean;
  toIn?: boolean;
};

export type RangeLook = {
  color: string;
  /** 범위 선 굵기. */
  stroke: number;
  /** 점 반지름. */
  dot: number;
  /** 눈금 숫자 크기. */
  font: number;
};

const INK = "#111111";

export function numberLineSvg({
  min,
  max,
  tick,
  labelEvery,
  range,
  look,
  width = 268,
}: {
  min: number;
  max: number;
  tick: number;
  labelEvery: number;
  range?: Range;
  look: RangeLook;
  width?: number;
}): string {
  const pad = 16;
  const span = width - pad * 2 - 8;
  const x0 = pad + 4;
  const y = 18;
  const h = 38;
  const xp = (v: number) => x0 + ((v - min) / (max - min)) * span;
  const n = (v: number) => +v.toFixed(2);
  const onLabel = (v: number) => {
    const q = (v - min) / labelEvery;
    return Math.abs(q - Math.round(q)) < 1e-6;
  };
  const parts: string[] = [
    `<line x1="${n(xp(min) - 8)}" y1="${y}" x2="${n(xp(max) + 8)}" y2="${y}" stroke="${INK}" stroke-width="1.4"/>`,
  ];
  for (let v = min; v <= max + 1e-9; v += tick) {
    const t = +v.toFixed(6);
    const long = onLabel(t);
    parts.push(
      `<line x1="${n(xp(t))}" y1="${y - (long ? 5 : 3.5)}" x2="${n(xp(t))}" y2="${y + (long ? 5 : 3.5)}" stroke="${INK}" stroke-width="1.1"/>`,
    );
    if (long)
      parts.push(
        `<text x="${n(xp(t))}" y="${y + 15}" fill="${INK}" font-size="${look.font}" font-family="Batang, serif" font-weight="600" text-anchor="middle" dominant-baseline="middle">${t}</text>`,
      );
  }
  if (range) {
    const x1 = range.from === null ? xp(min) - 8 : xp(range.from);
    const x2 = range.to === null ? xp(max) + 8 : xp(range.to);
    parts.push(
      `<line x1="${n(x1)}" y1="${y}" x2="${n(x2)}" y2="${y}" stroke="${look.color}" stroke-width="${look.stroke}"/>`,
    );
    const dot = (v: number, filled: boolean) =>
      `<circle cx="${n(xp(v))}" cy="${y}" r="${look.dot}" fill="${filled ? look.color : "#ffffff"}" stroke="${look.color}" stroke-width="1.5"/>`;
    if (range.from !== null) parts.push(dot(range.from, range.fromIn ?? true));
    if (range.to !== null) parts.push(dot(range.to, range.toIn ?? true));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}">${parts.join("")}</svg>`;
}

export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
