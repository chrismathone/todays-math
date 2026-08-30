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
