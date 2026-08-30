/**
 * 「치수선이 **도형 안쪽**을 지나는가」를 제품 SVG 에서 잰다.
 *
 * 원장님이 지면에서 찾으셨다(2026-08-30): 등변사다리꼴의 `9 cm` 가 도형 안쪽으로
 * 크게 휘어 들어와 있었다. 그것을 세는 축이 엔진에도 검사에도 **없었다**.
 *
 * ⚠️ 참을 엔진 안에서 가져오지 않는다 — 엔진을 고치는 중이므로, 고치는 쪽과 재는
 *    쪽이 같은 것을 보면 동어반복이 된다(CLAUDE.md 2026-08-18). **나온 SVG** 만 본다.
 *
 * 판정: 도형 잉크(가장 굵은 선)의 끝점으로 볼록 껍질을 만들고, 현 중점에서 곡선
 *       쪽으로 2px 나간 자리가 그 안인지 본다. **깊이가 아니라 «쪽»**을 묻는다 —
 *       도형 한가운데를 지나는 선분(접힌 종이의 대각선)은 어느 쪽으로 그려도 깊이가
 *       크고, 그건 「바깥이 없는」 것이지 「바깥을 두고 안으로 간」 것이 아니다.
 *       그래서 `otherDepth`(반대 쪽)도 같이 낸다 — 둘 다 안이면 결함이 아니다.
 *
 * ⚠️ **볼록 껍질은 실제 도형보다 넓다.** 원장님이 그 한계를 바로 짚으셨다
 *    (2026-08-30, `평행선|02`: 삼각형 밖인데 D 가 왼쪽 위에 있어 껍질 안으로 잡힌다).
 *    그래서 이 자의 「고칠 수 있었던 것 0」은 **상한이 아니라 하한**이다 —
 *    0이어도 원장님이 더 찾으실 수 있다.
 */

type XY = [number, number];

const MARGIN = 0.0; // 쪽 판정이라 경계 바로 안이면 안쪽이다

function attr(tag: string, name: string): number | null {
  const m = new RegExp(`${name}="(-?[\\d.eE+]+)"`).exec(tag);
  return m ? Number(m[1]) : null;
}

/** `<svg>` 문자열을 태그 단위로 자른다. */
function tags(svg: string): string[] {
  return svg.match(/<[^>]+>/g) ?? [];
}

/** path 의 `d` 에서 곡선을 샘플한다 (`M x y` · `Q cx cy x y` · `L x y` 만 쓴다). */
function samplePath(d: string): XY[] {
  const out: XY[] = [];
  const tok = d.trim().split(/[\s,]+/);
  let i = 0;
  let cur: XY | null = null;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    const cmd = tok[i++];
    if (cmd === "M") {
      cur = [num(), num()];
      out.push(cur);
    } else if (cmd === "L") {
      cur = [num(), num()];
      out.push(cur);
    } else if (cmd === "Q") {
      const cx = num();
      const cy = num();
      const ex = num();
      const ey = num();
      const s = cur ?? [cx, cy];
      for (let k = 1; k <= 12; k += 1) {
        const t = k / 12;
        const u = 1 - t;
        out.push([
          u * u * s[0] + 2 * u * t * cx + t * t * ex,
          u * u * s[1] + 2 * u * t * cy + t * t * ey,
        ]);
      }
      cur = [ex, ey];
    } else if (cmd === "A") {
      // 호 — 끝점만 쓴다 (도형 잉크 껍질용).
      i += 5;
      cur = [num(), num()];
      out.push(cur);
    } else if (/^-?[\d.]/.test(cmd ?? "")) {
      i += 0; // 숫자가 명령 없이 이어지는 경우는 이 엔진 출력에 없다
      break;
    }
  }
  return out;
}

function hull(pts: XY[]): XY[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: XY, a: XY, b: XY) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (src: XY[]) => {
    const st: XY[] = [];
    for (const q of src) {
      while (
        st.length >= 2 &&
        cross(st[st.length - 2]!, st[st.length - 1]!, q) <= 0
      )
        st.pop();
      st.push(q);
    }
    return st;
  };
  const lower = build(p);
  const upper = build([...p].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** 볼록 껍질 경계까지의 **부호 있는** 거리 — 안쪽이 양수. */
function depth(poly: XY[], q: XY): number {
  if (poly.length < 3) return -Infinity;
  let best = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey) || 1;
    // 껍질이 반시계(수학) / 시계(화면) 어느 쪽이든, 안쪽은 **모든 변에서 같은 부호**다.
    const side = ((q[0] - a[0]) * ey - (q[1] - a[1]) * ex) / len;
    best = Math.min(best, side);
  }
  // 껍질을 만든 방향에 따라 부호가 뒤집힐 수 있어 절댓값 대신 두 방향을 다 본다.
  let best2 = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const len = Math.hypot(ex, ey) || 1;
    best2 = Math.min(best2, -((q[0] - a[0]) * ey - (q[1] - a[1]) * ex) / len);
  }
  return Math.max(best, best2);
}

export type DimVerdict = {
  otherDepth: number; // 반대 쪽 깊이 — 이것도 양수면 「바깥이 없는」 도형이다
  label: string;
  maxDepth: number; // 곡선이 가장 깊이 들어간 정도
  labelDepth: number; // 값 글자가 들어간 정도
};

/** SVG 한 장을 판정한다. */
export function judgeSvg(svg: string): { hullPts: number; dims: DimVerdict[] } {
  const all = tags(svg);
  // ⑴ 도형 잉크 = `stroke-width` 최댓값. (치수 0.72 · 표시 0.72 · 도형 1.9)
  let widest = 0;
  for (const t of all) {
    if (!/^<(line|path|circle|ellipse|polygon|polyline)\b/.test(t)) continue;
    if (/stroke-dasharray/.test(t)) continue;
    const w = attr(t, "stroke-width");
    if (w !== null && w > widest) widest = w;
  }
  const ink: XY[] = [];
  for (const t of all) {
    if (/stroke-dasharray/.test(t)) continue;
    const w = attr(t, "stroke-width");
    if (w === null || Math.abs(w - widest) > 1e-6) continue;
    if (/^<line\b/.test(t)) {
      const x1 = attr(t, "x1");
      const y1 = attr(t, "y1");
      const x2 = attr(t, "x2");
      const y2 = attr(t, "y2");
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        ink.push([x1, y1], [x2, y2]);
      }
    } else if (/^<circle\b/.test(t)) {
      const cx = attr(t, "cx");
      const cy = attr(t, "cy");
      const r = attr(t, "r");
      if (cx !== null && cy !== null && r !== null && r > 2) {
        for (let k = 0; k < 12; k += 1) {
          const a = (k / 12) * Math.PI * 2;
          ink.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
      }
    } else if (/^<path\b/.test(t)) {
      const d = /\sd="([^"]+)"/.exec(t)?.[1];
      if (d) ink.push(...samplePath(d));
    }
  }
  const poly = hull(ink);

  // ⑵ 치수 파선
  const dims: DimVerdict[] = [];
  const dashPaths = all.filter(
    (t) => /^<path\b/.test(t) && /stroke-dasharray/.test(t),
  );
  // ⑶ 값 라벨 — `data-label` 이 길이 글자인 것.
  const labelBoxes: { text: string; at: XY }[] = [];
  for (const t of all) {
    const m = /data-label="([^"]*)"/.exec(t);
    if (!m) continue;
    const x = attr(t, "data-x");
    const y = attr(t, "data-y");
    if (x === null || y === null) continue;
    labelBoxes.push({ text: m[1]!, at: [x, y] });
  }
  for (const t of dashPaths) {
    const d = /\sd="([^"]+)"/.exec(t)?.[1];
    if (!d) continue;
    const pts = samplePath(d);
    if (pts.length === 0) continue;
    // 🔴 **「곡선이 얼마나 깊이 들어갔나」로는 두 부류가 안 갈린다.**
    //    도형 «한가운데»를 지나는 선분(접힌 종이의 대각선)은 어느 쪽으로 그려도
    //    깊이가 크다 — 그건 「바깥이 없는」 것이지 「바깥을 두고 안으로 간」 것이
    //    아니다. 그래서 **쪽**을 묻는다: 현 중점에서 곡선 쪽으로 2px 나간 자리가
    //    껍질 안인가. 이 값은 벌어짐 크기와 무관하다.
    //
    //    현의 끝은 조각이 둘로 잘려 있어 `pts[0]`·`pts.at(-1)` 이 아니다
    //    (틈이 값 자리에 난다). **가장 먼 두 점**을 현으로 본다.
    let e0 = pts[0]!;
    let e1 = pts[pts.length - 1]!;
    let far = -1;
    for (const a of pts) {
      for (const b of pts) {
        const dd = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (dd > far) {
          far = dd;
          e0 = a;
          e1 = b;
        }
      }
    }
    const chordMid: XY = [(e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2];
    // 현에서 가장 먼 샘플 = apex. 그 방향이 곧 이 치수가 나간 쪽이다.
    let apex = pts[0]!;
    let apexOff = -1;
    const ex = e1[0] - e0[0];
    const ey = e1[1] - e0[1];
    const elen = Math.hypot(ex, ey) || 1;
    for (const q of pts) {
      const off = Math.abs(((q[0] - e0[0]) * ey - (q[1] - e0[1]) * ex) / elen);
      if (off > apexOff) {
        apexOff = off;
        apex = q;
      }
    }
    const dirLen =
      Math.hypot(apex[0] - chordMid[0], apex[1] - chordMid[1]) || 1;
    const probe: XY = [
      chordMid[0] + ((apex[0] - chordMid[0]) / dirLen) * 2,
      chordMid[1] + ((apex[1] - chordMid[1]) / dirLen) * 2,
    ];
    const maxD = depth(poly, probe);
    // 반대 쪽도 안쪽인가 — 그러면 「바깥을 두고 안으로 간」 것이 아니라
    // **바깥이 아예 없는** 도형이다(도형 한가운데를 지나는 선분). 결함이 아니다.
    const other: XY = [
      chordMid[0] - ((apex[0] - chordMid[0]) / dirLen) * 2,
      chordMid[1] - ((apex[1] - chordMid[1]) / dirLen) * 2,
    ];
    const otherDepth = depth(poly, other);
    // 이 곡선에 딸린 값 라벨 = 현 중점에 가장 가까운 길이 글자
    const mid: XY = chordMid;
    let bestLabel: { text: string; at: XY } | null = null;
    let bestDist = Infinity;
    for (const lb of labelBoxes) {
      if (!/\d/.test(lb.text)) continue;
      const dist = Math.hypot(lb.at[0] - mid[0], lb.at[1] - mid[1]);
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = lb;
      }
    }
    dims.push({
      otherDepth,
      label: bestLabel?.text ?? "?",
      maxDepth: maxD,
      labelDepth: bestLabel ? depth(poly, bestLabel.at) : -Infinity,
    });
  }
  return { hullPts: poly.length, dims };
}

export const INSIDE_MARGIN = MARGIN;

/**
 * 치수 파선과 **각 표시(호·직각 사각형)** 사이의 가장 가까운 거리.
 *
 * 원장님이 지면에서 찾으셨다(2026-08-30, `2-2|삼각형의 성질|12`): 「치수선과 각도가
 * 매우 겹치기 때문에 문제에서 BC 를 주고 치수선을 표시 안 하는 게 더 나은 방법일지도
 * 모름.」 겹친 것은 곡선끼리가 아니라 **값 글자와 각 호**다 — 실측 `6 cm` 상자와
 * 60° 호 사이 **8.25px**(곡선끼리는 10.08px 라 그것만 보면 「안 겹친다」로 읽힌다).
 * ⚠️ 처음에 「0.29px」이라 적었는데 그건 **틀린 값**이다. 그때 자가 `stroke-width`
 *    없는 **글자 글리프**까지 「표시」로 세고 있었다. 치수 자리를 고르는 점수가 도형
 * 선분·호·원은 보는데 **각 표시는 목록에 없어** 구조적으로 0이었다.
 *
 * 치수가 하나도 없으면 `Infinity` — 「겹침 없음」과 「잴 것이 없음」을 부르는 쪽이
 * 갈라 볼 수 있어야 한다.
 */
export function dimVsAngleMarkGap(svg: string): {
  gap: number;
  labelGap: number;
  dims: number;
  marks: number;
} {
  const all = svg.match(/<[^>]+>/g) ?? [];
  const dashed: XY[][] = [];
  const marks: XY[][] = [];
  for (const t of all) {
    if (!/^<path\b/.test(t)) continue;
    const d = /\sd="([^"]+)"/.exec(t)?.[1];
    if (!d) continue;
    // 🔴 `stroke-width` 가 **없는** path 는 글자 글리프다 — `w < 1.0` 으로만 거르면
    //    그것들이 통째로 「표시」로 들어온다. 첫 판이 그랬고, 그래서 「각 표시와
    //    0.29px」이라는 숫자가 나왔다. 실제로 그 0.29 는 **글자와의 거리**였다.
    const w = Number(/stroke-width="([\d.]+)"/.exec(t)?.[1] ?? "0");
    if (/stroke-dasharray/.test(t)) dashed.push(samplePath(d));
    else if (w > 0 && w < 1.0) marks.push(samplePath(d)); // 얇은 실선 = 표시류
  }
  let gap = Infinity;
  for (const c of dashed) {
    for (const m of marks) {
      for (const a of c) {
        for (const b of m)
          gap = Math.min(gap, Math.hypot(a[0] - b[0], a[1] - b[1]));
      }
    }
  }

  // 🔴 **원장님이 보신 겹침은 곡선끼리가 아니라 «값 글자»와 각 호였다.**
  //    (2026-08-30, `2-2|삼각형의 성질|12` — 「치수선과 각도가 매우 겹치기 때문에」)
  //    곡선만 재면 그 자리는 10px 떨어진 것으로 나와 **아무것도 안 잡힌다.**
  //    라벨 상자는 `data-*` 에 있다: 폭 `data-w`·위 `data-a`·아래 `data-d` (전부 em).
  let labelGap = Infinity;
  for (const t of all) {
    const text = /data-label="([^"]*)"/.exec(t)?.[1];
    if (text === undefined || !/\d/.test(text)) continue;
    if (/°/.test(text)) continue; // 각 값 자체는 제 호 곁에 앉는 것이 정상이다
    const x = attr(t, "data-x");
    const y = attr(t, "data-y");
    // ⚠️ **`data-w`·`data-a`·`data-d` 는 px 다.** 엔진 안에서는 em 이지만
    //    (`label_metrics` 주석), SVG 로 나올 때 이미 글꼴 크기가 곱해져 있다.
    //    처음에 em 으로 보고 `× data-fs` 를 한 번 더 곱했더니 「A」 한 글자 상자가
    //    **211px** 이 되어 무엇과도 겹쳤고, `labelGap` 이 늘 0이었다.
    //    실측으로 확인: «A» `data-w="12.600"` · `data-fs="16.800"` — 12.6 이 폭이다.
    const wPx = attr(t, "data-w");
    const aPx = attr(t, "data-a");
    const dPx = attr(t, "data-d");
    if (x === null || y === null || wPx === null) continue;
    const halfW = wPx / 2;
    const up = aPx ?? 12;
    const down = dPx ?? 4;
    const box: [number, number, number, number] = [
      x - halfW,
      y - up,
      x + halfW,
      y + down,
    ];
    for (const m of marks) {
      for (const p of m) {
        const dx = Math.max(box[0] - p[0], 0, p[0] - box[2]);
        const dy = Math.max(box[1] - p[1], 0, p[1] - box[3]);
        labelGap = Math.min(labelGap, Math.hypot(dx, dy));
      }
    }
  }
  return { gap, labelGap, dims: dashed.length, marks: marks.length };
}

/**
 * 각 라벨을 **밖으로 끌어낸** 지시선들. 없으면 빈 배열 = 라벨이 도형 안에 있다.
 *
 * 지시선은 「점선이 아닌 얇은 `<path>` 중 이차 곡선(`Q`)을 쓰는 것」이다 — 각 표시
 * 호는 `A`(원호) 명령이고, 치수는 점선이다. 이름이 아니라 **모양**으로 가른다.
 */
export function angleLeaders(svg: string): XY[][] {
  const out: XY[][] = [];
  for (const t of svg.match(/<[^>]+>/g) ?? []) {
    if (!/^<path\b/.test(t) || /stroke-dasharray/.test(t)) continue;
    const d = /\sd="([^"]+)"/.exec(t)?.[1];
    if (!d || !/\bQ\b/.test(d)) continue;
    const w = Number(/stroke-width="([\d.]+)"/.exec(t)?.[1] ?? "0");
    if (w <= 0 || w >= 1.0) continue;
    out.push(samplePath(d));
  }
  return out;
}

/** 도형 잉크의 y 최댓값 — 「도형보다 아래로 나갔나」를 묻는 데 쓴다. */
export function inkBounds(svg: string): {
  minY: number;
  maxY: number;
  minX: number;
  maxX: number;
} {
  const all = svg.match(/<[^>]+>/g) ?? [];
  let widest = 0;
  for (const t of all) {
    if (!/^<(line|path|circle)\b/.test(t) || /stroke-dasharray/.test(t))
      continue;
    const w = Number(/stroke-width="([\d.]+)"/.exec(t)?.[1] ?? "0");
    if (w > widest) widest = w;
  }
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  const eat = (x: number, y: number) => {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  };
  for (const t of all) {
    if (/stroke-dasharray/.test(t)) continue;
    const w = Number(/stroke-width="([\d.]+)"/.exec(t)?.[1] ?? "0");
    if (Math.abs(w - widest) > 1e-6) continue;
    if (/^<line\b/.test(t)) {
      // ⚠️ 여기서 정규식을 **템플릿 리터럴로 짓지 마라.** 처음에 그렇게 썼다가
      //    `[\d.]` 가 TS 문자열에서 `[d.]` 로 축약돼 **숫자를 하나도 안 물었고**,
      //    `maxY` 가 `-Infinity` 라 그것을 쓰는 시험이 **늘 통과**했다(가드가
      //    아니었다). 위에 이미 있는 `attr()` 를 쓴다 — 한 곳만 둔다.
      const nums = (["x1", "y1", "x2", "y2"] as const).map((n) => attr(t, n));
      if (nums.every((n) => n !== null)) {
        eat(nums[0]!, nums[1]!);
        eat(nums[2]!, nums[3]!);
      }
    } else if (/^<path\b/.test(t)) {
      const d = /\sd="([^"]+)"/.exec(t)?.[1];
      if (d) for (const p of samplePath(d)) eat(p[0], p[1]);
    }
  }
  return { minY, maxY, minX, maxX };
}
