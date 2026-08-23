/**
 * 실물 장면(`assetScene`) 조립 — **중1·중2 실물 유형(m1Real·m2Real)이 같은 자를 쓴다.**
 *
 * 장면 좌표를 유형마다 손으로 맞추면 다음 유형에서 같은 구멍이 다시 열린다
 * (CLAUDE.md 2026-08-21 「엔진이 정규화되지 않으면 문항마다 같은 결함이 다시 난다」).
 * 그래서 여기에 **불변식**을 둔다:
 *
 * 1. **바닥선**: 에셋마다 제 그림 안에 지면선이 있다(기차 `y=68/72`, 사람 `96/100` …).
 *    `groundY` 로 놓으면 그 선이 장면의 한 높이에 모인다 — 눈으로 맞추지 않는다.
 * 2. **치수 라벨은 사실에서만 온다**: `dimLabel()`·`textLabel()` 이 만드는 문자열의
 *    수는 전부 생성기의 `facts` 값이다. 테스트가 스펙의 **모든 라벨**에서 수를 긁어
 *    `facts` 와 대조한다 — 그림 따로 발문 따로면 «그럴듯한 오답 그림»이 된다.
 *
 * 세로 치수는 `dims` 대신 `labels` 로 적는다 — 엔진의 `_dim_arrow` 가 라벨을 선분
 * 한가운데에 놓아서 세로선이 글자를 관통한다(원본 지면은 선 옆에 적는다).
 */

/** 에셋 원본 viewBox 와 그 안의 지면선 y — `scripts/figure/assets/*.svg` 실측. */
const ASSET = {
  "train-side": { w: 180, h: 72, ground: 68 },
  bridge: { w: 160, h: 76, ground: 73, deck: 25, slabL: 3, slabR: 157 },
  tunnel: { w: 140, h: 90, ground: 82, mouth: 40, tail: 136 },
  "cup-cone": { w: 80, h: 100, rim: 20, apex: 90, cx: 40, rx: 28 },
  "water-tank": {
    w: 120,
    h: 100,
    top: 20,
    bottom: 88,
    left: 10,
    right: 110,
    water: 52,
  },
  "person-walking": { w: 68, h: 100, ground: 96 },
  "person-standing": { w: 48, h: 100, ground: 96, head: 4 },
  tree: { w: 60, h: 90, ground: 88, head: 10 },
} as const;

export type AssetSlug = keyof typeof ASSET;

export type SceneItem = {
  asset: string;
  x: number;
  y: number;
  w: number;
  flip?: boolean;
};

export type AssetScene = {
  version: "elem-1";
  kind: "assetScene";
  canvas: [number, number];
  items: SceneItem[];
  dims?: { x1: number; y1: number; x2: number; y2: number; label: string }[];
  segments?: (number | string)[][];
  labels?: { x: number; y: number; text: string }[];
};

/** 소수점 둘째 자리까지 — 엔진이 그대로 좌표로 쓴다(긴 부동소수 방지). */
function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** 배치 한 건. `groundY` 를 주면 에셋 제 지면선이 거기에 오도록 y 를 계산한다. */
export function place(
  slug: AssetSlug,
  x: number,
  w: number,
  opts: { groundY?: number; y?: number; flip?: boolean } = {},
): SceneItem {
  const a = ASSET[slug] as { w: number; h: number; ground?: number };
  const s = w / a.w;
  let y: number;
  if (opts.groundY !== undefined) {
    if (a.ground === undefined) {
      throw new Error(
        `에셋 ${slug} 에는 지면선이 없습니다 — y 를 직접 주십시오`,
      );
    }
    y = opts.groundY - a.ground * s;
  } else if (opts.y !== undefined) {
    y = opts.y;
  } else {
    throw new Error("place: groundY 또는 y 중 하나는 주어야 합니다");
  }
  const item: SceneItem = { asset: slug, x: r2(x), y: r2(y), w: r2(w) };
  if (opts.flip) item.flip = true;
  return item;
}

/** 에셋 안의 국소 좌표 → 장면 좌표. */
export function at(item: SceneItem, slug: AssetSlug, key: string): number {
  const a = ASSET[slug] as unknown as Record<string, number>;
  const v = a[key];
  if (v === undefined) throw new Error(`에셋 ${slug} 에 ${key} 가 없습니다`);
  return v;
}

export function scaleOf(item: SceneItem, slug: AssetSlug): number {
  return item.w / ASSET[slug].w;
}

/** 국소 x → 장면 x (좌우 뒤집기까지 반영). */
export function sx(item: SceneItem, slug: AssetSlug, localX: number): number {
  const s = scaleOf(item, slug);
  const lx = item.flip ? ASSET[slug].w - localX : localX;
  return r2(item.x + lx * s);
}

/** 국소 y → 장면 y. */
export function sy(item: SceneItem, slug: AssetSlug, localY: number): number {
  return r2(item.y + localY * scaleOf(item, slug));
}

/** 가로 치수 — 원본 지면의 «↔ 길이». 라벨은 사실에서 온 문자열이어야 한다. */
export function hDim(
  x1: number,
  x2: number,
  y: number,
  label: string,
): { x1: number; y1: number; x2: number; y2: number; label: string } {
  return { x1: r2(x1), y1: r2(y), x2: r2(x2), y2: r2(y), label };
}

/** 세로 치수 — 화살표는 `dims`, 글자는 옆에 `labels` 로 (선이 글자를 관통하지 않게). */
export function vDim(
  x: number,
  y1: number,
  y2: number,
  label: string,
  labelDx = 15,
): {
  dim: { x1: number; y1: number; x2: number; y2: number; label: string };
  label: { x: number; y: number; text: string };
} {
  return {
    dim: { x1: r2(x), y1: r2(y1), x2: r2(x), y2: r2(y2), label: "" },
    label: { x: r2(x + labelDx), y: r2((y1 + y2) / 2 + 4), text: label },
  };
}
