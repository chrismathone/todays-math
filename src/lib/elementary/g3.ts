import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemTierMap } from "./difficulty";

import { expr, fracLatex, n, unitNum } from "./format";
import { fracSpec } from "./fracFig";
import { fig, make, makeDeep } from "./make";
import { answerPrintedOnPage, forwardReachable, rat } from "./forwardReach";
import { intBetween, pick } from "./rng";
import type { ChapterHandler, ElemForm, ElemProblem, Rng } from "./types";

/**
 * 한글 낱말 뒤 조사. 받침이 있으면 앞쪽(`은`·`이`·`을`).
 *
 * ⚠️ **수 뒤에는 쓰지 않는다.** 수는 읽는 소리로 갈리므로($4$→사→「가」, $3$→삼→「이」)
 * 글자만 봐서는 못 정한다 — 그런 자리는 조사가 붙지 않게 문장을 바꾼다.
 */
function josa(word: string, withBatchim: string, without: string): string {
  const w = word.trim();
  const code = w.charCodeAt(w.length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return without;
  const final = (code - 0xac00) % 28;
  // «(으)로» 는 ㄹ 받침(8)도 «로» 다 — `format.ts` `josa` 와 같은 규칙.
  if (final === 8 && withBatchim === "으로") return without;
  return final !== 0 ? withBatchim : without;
}

/**
 * 양자택일 문형의 갈래. 변형 셋이 한 답만 내지 않게 첫 뽑기로 고른다.
 * `0..9` 의 홀짝 — `0..1` 동전은 검사 씨앗 셋이 한쪽으로 몰리는 자리가 있다.
 */
function altCase(rng: Rng): boolean {
  return intBetween(rng, 0, 9) % 2 === 1;
}

function digits(n3: number): [number, number, number] {
  return [Math.floor(n3 / 100) % 10, Math.floor(n3 / 10) % 10, n3 % 10];
}

function addWithCarries(
  rng: Rng,
  minCarries: number,
  maxCarries: number,
): [number, number] {
  // 「세 번」은 백의 자리에서 천의 자리로 넘어가는 받아올림이다 — 합이 네 자리라야
  // 나온다. 예전에는 `a + b < 1000` 으로 묶고 받아올림을 일·십에서만 세어,
  // 소단원 이름이 약속한 「세 번」이 **구조적으로 0** 이었다(1-1-2).
  const wantThird = maxCarries >= 3;
  for (let k = 0; k < 80; k += 1) {
    // 「세 번」이 없는 소단원은 예전처럼 합을 세 자리로 **구성으로** 묶는다.
    // ⚠️ `b` 의 아래끝이 101 이므로 `a` 상한은 798 — 799 를 뽑으면 `b` 범위가
    // `[101, 100]` 으로 뒤집혀 던진다(실측: 씨앗의 0.55%에서 문항이 아예 안 나왔다).
    // 문턱으로 걸러 내지 않고 뽑는 범위를 막는다: 가드가 걸러 낼 값을 생성기가
    // 만들면 안 된다.
    const a = intBetween(rng, 101, wantThird ? 898 : 798);
    const b = wantThird
      ? intBetween(rng, 101, 898)
      : intBetween(rng, 101, 899 - a);
    const [a2, a1, a0] = digits(a);
    const [b2, b1, b0] = digits(b);
    let carries = 0;
    let c = 0;
    if (a0 + b0 >= 10) {
      carries += 1;
      c = 1;
    }
    if (a1 + b1 + c >= 10) {
      carries += 1;
      c = 1;
    } else {
      c = 0;
    }
    if (a2 + b2 + c >= 10) carries += 1;
    if (carries >= minCarries && carries <= maxCarries) return [a, b];
  }
  return minCarries === 0 ? [123, 45] : [567, 278];
}

function subWithBorrows(
  rng: Rng,
  minB: number,
  maxB: number,
): [number, number] {
  for (let k = 0; k < 80; k += 1) {
    const a = intBetween(rng, 200, 980);
    // ⚠️ 아래끝이 $11$ 이면 **두 자리 수를 뺀다** — 소단원 이름은 (세 자리)−(세 자리)다.
    // 실측(4단 확대 시험): `435-20`·`366-15` 가 나왔다. 기본 경로도 같이 고쳐진다.
    const b = intBetween(rng, 101, a - 10);
    const [, a1, a0] = digits(a);
    const [, b1, b0] = digits(b);
    let borrows = 0;
    let a0x = a0;
    let a1x = a1;
    if (a0x < b0) {
      borrows += 1;
      a0x += 10;
      a1x -= 1;
    }
    if (a1x < b1) borrows += 1;
    if (borrows >= minB && borrows <= maxB) return [a, b];
  }
  return minB === 0 ? [586, 243] : [503, 278];
}

function addSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const heavy = s.includes("두 번") || s.includes("세 번");
  if (s.includes("+")) {
    const [a, b] = addWithCarries(rng, heavy ? 2 : 0, heavy ? 3 : 1);
    return make(
      unit,
      `다음을 계산하시오.\n\n$${a}+${b}=\\square$`,
      n(a + b),
      expr(`${a}+${b}=${a + b}`),
    );
  }
  const [a, b] = subWithBorrows(rng, heavy ? 2 : 0, heavy ? 3 : 1);
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}-${b}=\\square$`,
    n(a - b),
    expr(`${a}-${b}=${a - b}`),
  );
}

// ── 평면도형: 점격자 도형 ──────────────────────────────────────────────
//
// 처음 점격자를 고른 까닭은 `namedShapes` 의 `rightTri` 가 **직각 표시를 함께 그려서**
// 「직각삼각형을 찾으시오」의 답이 새기 때문이었다(원장님 검수 ⑤ 와 같은 자리).
// **그 전제는 2026-08-22 에 사라졌다** — 표시는 이제 `marks: true` 를 줘야 나오고 기본은 꺼져
// 있다(그림 엔진 세션). 그래도 점격자를 그대로 둔다. 두 가지 까닭이다.
//
//  ㄱ. 「직각인가」를 **칸을 세어** 판단하게 한다 — 초3 교과서의 점종이 방식이고,
//     `namedShapes` 의 그려진 도형은 눈대중밖에 안 된다.
//  ㄴ. 3×3 점 안의 삼각형 84가지에서 뽑으므로 도형이 실제로 갈린다. 씨앗 200개로 재니
//     서로 다른 그림이 1-2-2 163 · 1-2-3 168 · 1-2-4 192 · 1-2-5 66 이다.
//     `namedShapes` 의 도형 목록은 10가지뿐이라 이만큼 안 갈린다.

type Pt = [number, number];

/** 점격자 도형 하나. `lines` 만 그리고 `pts` 에 점을 찍는다. */
type GridShape = {
  pts: Pt[];
  lines: [Pt, Pt][];
  label: string;
  anchor?: Pt;
  side?: string;
};

// ⚠️ 「라」는 1-2-2·1-2-3 심화가 **덧붙이는 사각형**의 기호이기도 하다. 그 두 함수는
// 반드시 count ≤ 3 으로 부를 것 — 4개를 깔고 라를 또 붙이면 기호가 겹친다.
const SHAPE_LABELS = ["가", "나", "다", "라"] as const;

function onGrid(p: Pt, cols: number, rows: number): Pt {
  if (p[0] < 0 || p[0] > cols || p[1] < 0 || p[1] > rows) {
    throw new Error(
      `점격자 밖입니다: (${p[0]}, ${p[1]}) — cols ${cols}, rows ${rows}`,
    );
  }
  return p;
}

/**
 * 점격자 렌더러가 받는 한도 — `scripts/figure/elementary.py` 의 `_point_grid` 가
 * `cols·rows 는 1 이상 10 이하여야 합니다` 로 **던진다.**
 *
 * ⚠️ 이 수를 여기 적어 두는 것은 **두 벌**이다. 그래도 적는다 — 파이썬 쪽을 여기서
 *    읽을 수 없기 때문이다. 대신 어긋나면 **생성이 던지게** 해서(아래) 조용히 지나가지
 *    않게 했다. 저쪽이 한도를 바꾸면 `probe-elem-throw` 가 아니라 **그림 판정기**가 운다.
 */
const GRID_MAX = 10;

/**
 * 띠와 띠 사이 빈 줄. **두 줄**이다 — 라벨이 도형 *아래*에 붙으므로(`side: "down"`)
 * 한 줄만 두면 윗 띠의 기호가 아랫 띠 도형과 겹친다.
 */
const GRID_BAND_GAP = 2;

function shapeSpan(s: GridShape): { minC: number; maxC: number } {
  const cs = s.pts.map((p) => p[0]);
  return { minC: Math.min(...cs), maxC: Math.max(...cs) };
}

function shiftShape(s: GridShape, dc: number, dr: number): GridShape {
  const mv = (p: Pt): Pt => [p[0] + dc, p[1] + dr];
  return {
    ...s,
    pts: s.pts.map(mv),
    lines: s.lines.map(([a, b]) => [mv(a), mv(b)] as [Pt, Pt]),
    anchor: s.anchor ? mv(s.anchor) : undefined,
  };
}

/**
 * 폭이 한도를 넘으면 **아래로 접는다.**
 *
 * ## 왜 여기인가 — 부르는 자리가 **열여덟**이다
 *
 * 도형을 나란히 놓는 함수(`triangleRow`·`rectRow` 등)가 저마다 `c0 = i * gap` 으로
 * 폭을 키운다. 셋을 놓으면 `cols` 가 13~14 가 되어 **렌더러가 던진다** — 그런데
 * 생성기는 멀쩡한 스펙을 돌려주므로 **문항은 그림 없이 지면에 나간다.**
 * 실측(2026-08-24): 씨앗 60 에서 **245건**(1-2-2 · 1-2-3 · 1-2-4).
 *
 * 부르는 자리마다 고치면 열여덟 벌이 되고, 한 벌만 빠뜨려도 아무도 모른다.
 * 그래서 **폭을 아는 유일한 곳**인 여기서 접는다.
 *
 * ## 왜 «셋 중 하나를 뺀다»가 아닌가
 *
 * 도형을 줄이면 「가, 나, 다 중에서 고르시오」가 둘 중 고르기가 되어 **문항이 쉬워진다.**
 * 지면 폭 때문에 난이도를 바꾸는 것은 거꾸로다 — 접으면 셋 다 남는다.
 */
function foldGrid(
  cols: number,
  rows: number,
  shapes: GridShape[],
): { cols: number; rows: number; shapes: GridShape[] } {
  if (cols <= GRID_MAX) return { cols, rows, shapes };
  // 왼쪽부터 차례로 — 발문의 「가, 나, 다」 차례와 같아야 한다.
  const ordered = [...shapes].sort(
    (a, b) => shapeSpan(a).minC - shapeSpan(b).minC,
  );
  const out: GridShape[] = [];
  let at = 0;
  let band = 0;
  let widest = 0;
  for (const s of ordered) {
    const { minC, maxC } = shapeSpan(s);
    const w = maxC - minC;
    if (at > 0 && at + w > GRID_MAX) {
      band += 1;
      at = 0;
    }
    out.push(shiftShape(s, at - minC, band * (rows + GRID_BAND_GAP)));
    widest = Math.max(widest, at + w);
    at += w + 1;
  }
  return {
    cols: widest,
    rows: band * (rows + GRID_BAND_GAP) + rows,
    shapes: out,
  };
}

function pointGridSpec(
  cols: number,
  rows: number,
  shapes: GridShape[],
): Record<string, unknown> {
  const g = foldGrid(cols, rows, shapes);
  // ⚠️ **접고 나서** 던진다. 접어도 안 들어가는 것은 지면에 못 그리는 것이고,
  //    그때는 조용한 «그림 없는 문항»보다 **터지는 쪽**이 낫다 —
  //    `probe-elem-throw` 가 전 씨앗을 쓸므로 그 자리에서 잡힌다.
  if (g.cols < 1 || g.cols > GRID_MAX || g.rows < 1 || g.rows > GRID_MAX) {
    throw new Error(
      `점격자가 렌더러 한도를 넘습니다: ${g.cols}x${g.rows} (한도 ${GRID_MAX}) — 도형 ${shapes.length}개`,
    );
  }
  const dots: Record<string, unknown>[] = [];
  const lines: [Pt, Pt][] = [];
  for (const shape of g.shapes) {
    for (const [a, b] of shape.lines) {
      lines.push([onGrid(a, g.cols, g.rows), onGrid(b, g.cols, g.rows)]);
    }
    const anchor =
      shape.anchor ??
      [...shape.pts].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0]!;
    for (const p of shape.pts) {
      onGrid(p, g.cols, g.rows);
      const isAnchor = p[0] === anchor[0] && p[1] === anchor[1];
      dots.push({
        c: p[0],
        r: p[1],
        label: isAnchor ? shape.label : "",
        side: isAnchor ? (shape.side ?? "down") : "down",
      });
    }
  }
  return fig("pointGrid", { cols: g.cols, rows: g.rows, dots, lines });
}

function closedShape(pts: Pt[], label: string): GridShape {
  return {
    pts,
    lines: pts.map((p, i) => [p, pts[(i + 1) % pts.length]!] as [Pt, Pt]),
    label,
  };
}

function vecDot(v: Pt, p: Pt, q: Pt): number {
  return (p[0] - v[0]) * (q[0] - v[0]) + (p[1] - v[1]) * (q[1] - v[1]);
}

function cosAt(v: Pt, p: Pt, q: Pt): number {
  const l =
    Math.hypot(p[0] - v[0], p[1] - v[1]) * Math.hypot(q[0] - v[0], q[1] - v[1]);
  return l === 0 ? 1 : vecDot(v, p, q) / l;
}

/**
 * 3×3 점 안의 삼각형을 **전부 세어** 「직각이 있는가」로 가른다.
 *
 * 손으로 고른 목록을 쓰지 않는다 — 목록을 손으로 쓰면 그리는 쪽과 답을 정하는 쪽이
 * 같이 눈이 먼다(CLAUDE.md 2026-08-18). 직각 여부는 정수 내적이라 반올림도 없다.
 * 직각이 아닌 쪽은 **뚜렷이** 아니어야 한다(`|cos| >= 0.3`, 약 72°~108° 를 뺀다).
 */
function triPools(): { right: Pt[][]; other: Pt[][] } {
  const pts: Pt[] = [];
  for (let c = 0; c <= 2; c += 1)
    for (let r = 0; r <= 2; r += 1) pts.push([c, r]);
  const right: Pt[][] = [];
  const other: Pt[][] = [];
  for (let i = 0; i < pts.length; i += 1) {
    for (let j = i + 1; j < pts.length; j += 1) {
      for (let k = j + 1; k < pts.length; k += 1) {
        const t: Pt[] = [pts[i]!, pts[j]!, pts[k]!];
        const cross =
          (t[1]![0] - t[0]![0]) * (t[2]![1] - t[0]![1]) -
          (t[1]![1] - t[0]![1]) * (t[2]![0] - t[0]![0]);
        if (Math.abs(cross) < 2) continue; // 넓이 1 미만은 납작해서 못 읽는다
        const cs = t.map((p) => p[0]);
        const rs = t.map((p) => p[1]);
        if (Math.max(...cs) - Math.min(...cs) < 2) continue;
        if (Math.max(...rs) - Math.min(...rs) < 2) continue;
        const coss = [
          cosAt(t[0]!, t[1]!, t[2]!),
          cosAt(t[1]!, t[0]!, t[2]!),
          cosAt(t[2]!, t[0]!, t[1]!),
        ];
        if (coss.some((v) => Math.abs(v) < 1e-9)) right.push(t);
        else if (Math.min(...coss.map((v) => Math.abs(v))) >= 0.3)
          other.push(t);
      }
    }
  }
  if (!right.length || !other.length) throw new Error("삼각형 풀이 비었습니다");
  return { right, other };
}

const TRI_POOLS = triPools();

/** 3×3 점 안의 각. 꼭짓점은 아래 가운데, 뒤에서 뒤집어 방향을 바꾼다. */
function anglePools(): { right: [Pt, Pt][]; other: [Pt, Pt][] } {
  const v: Pt = [1, 2];
  const ends: Pt[] = [
    [0, 2],
    [2, 2],
    [1, 0],
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
  ];
  const right: [Pt, Pt][] = [];
  const other: [Pt, Pt][] = [];
  for (let i = 0; i < ends.length; i += 1) {
    for (let j = i + 1; j < ends.length; j += 1) {
      const c = cosAt(v, ends[i]!, ends[j]!);
      if (Math.abs(c) < 1e-9) right.push([ends[i]!, ends[j]!]);
      else if (Math.abs(c) >= 0.3 && c > -0.95)
        other.push([ends[i]!, ends[j]!]);
    }
  }
  if (!right.length || !other.length) throw new Error("각 풀이 비었습니다");
  return { right, other };
}

const ANGLE_V: Pt = [1, 2];
const ANGLE_POOLS = anglePools();

function flipPt(p: Pt, fx: boolean, fy: boolean): Pt {
  return [fx ? 2 - p[0] : p[0], fy ? 2 - p[1] : p[1]];
}

function lineNames(unit: UnitSeed, rng: Rng): ElemProblem {
  const letters = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"] as const;
  const i = intBetween(rng, 0, letters.length - 2);
  const a = letters[i]!;
  const b = letters[i + 1]!;
  const kind = pick(rng, ["선분", "반직선", "직선"] as const);
  if (kind === "선분") {
    const left = intBetween(rng, 0, 1);
    return make(
      unit,
      `점 ${a}과 점 ${b}을 곧게 이은 선의 이름을 쓰시오.`,
      `선분 ${a}${b}`,
      `두 점을 곧게 이은 선은 선분입니다. 점 ${a}과 점 ${b}을 이었으므로 선분 ${a}${b}입니다.`,
      fig("pointGrid", {
        cols: 6,
        rows: 2,
        dots: [
          { c: left, r: 1, label: a, side: "up" },
          { c: left + 5, r: 1, label: b, side: "up" },
        ],
        lines: [
          [
            [left, 1],
            [left + 5, 1],
          ],
        ],
      }),
    );
  }
  if (kind === "반직선") {
    return make(
      unit,
      `점 ${a}에서 시작하여 점 ${b}을 지나 끝없이 늘인 곧은 선의 이름을 쓰시오.`,
      `반직선 ${a}${b}`,
      `한 점에서 시작하여 한쪽으로 끝없이 늘인 곧은 선은 반직선입니다. 시작하는 점을 먼저 읽어 반직선 ${a}${b}입니다.`,
    );
  }
  return make(
    unit,
    `점 ${a}과 점 ${b}을 지나 양쪽으로 끝없이 늘인 곧은 선의 이름을 쓰시오.`,
    `직선 ${a}${b}`,
    `선분을 양쪽으로 끝없이 늘인 곧은 선은 직선입니다. 두 점을 지나므로 직선 ${a}${b}입니다.`,
  );
}

function rightAnglePick(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const gap = count === 3 ? 4 : 5;
  const cols = (count - 1) * gap + 2;
  const answerAt = intBetween(rng, 0, count - 1);
  const shapes: GridShape[] = [];
  for (let i = 0; i < count; i += 1) {
    const pair =
      i === answerAt
        ? pick(rng, ANGLE_POOLS.right)
        : pick(rng, ANGLE_POOLS.other);
    // 좌우로만 뒤집는다. 위아래로 뒤집으면 꼭짓점이 위로 올라가 **기호 높이가 도형마다 달라진다**
    // — 09 §4-7 「라벨은 도형 아래 같은 높이」. 방향 다양성은 변의 기울기 풀이 이미 준다.
    const fx = intBetween(rng, 0, 1) === 1;
    const c0 = i * gap;
    const move = (p: Pt): Pt => {
      const f = flipPt(p, fx, false);
      return [f[0] + c0, f[1]];
    };
    const v = move(ANGLE_V);
    const p = move(pair[0]);
    const q = move(pair[1]);
    shapes.push({
      pts: [v, p, q],
      lines: [
        [v, p],
        [v, q],
      ],
      label: SHAPE_LABELS[i]!,
      anchor: v,
      side: "down",
    });
  }
  const labels = SHAPE_LABELS.slice(0, count).join(", ");
  const answer = SHAPE_LABELS[answerAt]!;
  const ask = pick(rng, [
    `${labels} 중에서 직각인 각의 기호를 쓰시오.`,
    `${labels} 중에서 두 변이 직각으로 만나는 각의 기호를 쓰시오.`,
    `직각을 찾아 기호를 쓰시오. (${labels})`,
  ]);
  return make(
    unit,
    ask,
    answer,
    `직각은 종이를 반듯하게 두 번 접었을 때 생기는 각입니다. 삼각자의 직각 부분을 대었을 때 꼭 맞는 각은 ${answer} 입니다.`,
    pointGridSpec(cols, 2, shapes),
  );
}

/** 삼각형 여러 개를 나란히. `rightCount` 개만 직각삼각형이다. */
function triangleRow(rng: Rng, count: number, rightCount: number) {
  const gap = count === 3 ? 4 : 5;
  const cols = (count - 1) * gap + 2;
  const slots = SHAPE_LABELS.slice(0, count).map((label, i) => ({ label, i }));
  const rightSlots = new Set<number>();
  while (rightSlots.size < rightCount)
    rightSlots.add(intBetween(rng, 0, count - 1));
  const shapes: GridShape[] = [];
  for (const slot of slots) {
    const tri = rightSlots.has(slot.i)
      ? pick(rng, TRI_POOLS.right)
      : pick(rng, TRI_POOLS.other);
    const c0 = slot.i * gap;
    shapes.push(
      closedShape(
        tri.map((p) => [p[0] + c0, p[1]] as Pt),
        slot.label,
      ),
    );
  }
  const rightLabels = slots
    .filter((s) => rightSlots.has(s.i))
    .map((s) => s.label);
  return { cols, shapes, rightLabels, labels: slots.map((s) => s.label) };
}

function rightTriPick(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const row = triangleRow(rng, count, 1);
  const answer = row.rightLabels[0]!;
  const list = row.labels.join(", ");
  const ask = pick(rng, [
    `${list} 중에서 직각삼각형의 기호를 쓰시오.`,
    `${list} 중에서 한 각이 직각인 삼각형의 기호를 쓰시오.`,
    `직각삼각형을 찾아 기호를 쓰시오. (${list})`,
  ]);
  return make(
    unit,
    ask,
    answer,
    `한 각이 직각인 삼각형을 직각삼각형이라고 합니다. 삼각자의 직각 부분을 대어 보면 ${answer} 의 한 각이 꼭 맞습니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

function rightTriCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = triangleRow(rng, count, rightCount);
  const list = row.labels.join(", ");
  const ask = pick(rng, [
    `${list} 중에서 직각삼각형은 모두 몇 개인지 쓰시오.`,
    `${list} 중에서 직각삼각형의 수를 쓰시오.`,
    `다음 삼각형 ${list} 가운데 직각삼각형은 모두 몇 개인가?`,
  ]);
  return make(
    unit,
    ask,
    n(rightCount),
    `한 각이 직각인 삼각형이 직각삼각형입니다. 직각삼각형은 ${row.rightLabels.join(", ")} 이므로 모두 ${n(rightCount)}개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

function squarePick(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const gap = count === 3 ? 4 : 5;
  const maxW = count === 3 ? 2 : 3;
  const cols = (count - 1) * gap + maxW;
  const rows = 3;
  const side = intBetween(rng, 2, maxW);
  const answerAt = intBetween(rng, 0, count - 1);
  const oblong: [number, number][] = [];
  for (let w = 1; w <= maxW; w += 1) {
    for (let h = 1; h <= rows; h += 1) {
      if (w !== h) oblong.push([w, h]);
    }
  }
  const shapes: GridShape[] = [];
  for (let i = 0; i < count; i += 1) {
    const [w, h] = i === answerAt ? [side, side] : pick(rng, oblong);
    const c0 = i * gap;
    const r0 = rows - h!;
    shapes.push(
      closedShape(
        [
          [c0, r0],
          [c0 + w!, r0],
          [c0 + w!, r0 + h!],
          [c0, r0 + h!],
        ],
        SHAPE_LABELS[i]!,
      ),
    );
  }
  const list = SHAPE_LABELS.slice(0, count).join(", ");
  const answer = SHAPE_LABELS[answerAt]!;
  const ask = pick(rng, [
    `${list} 중에서 정사각형의 기호를 쓰시오.`,
    `${list} 중에서 네 변의 길이가 모두 같은 사각형의 기호를 쓰시오.`,
    `정사각형을 찾아 기호를 쓰시오. (${list})`,
  ]);
  return make(
    unit,
    ask,
    answer,
    `네 각이 모두 직각이고 네 변의 길이가 같은 사각형이 정사각형입니다. ${answer} 는 가로와 세로가 모두 ${n(side)}칸으로 같습니다.`,
    pointGridSpec(cols, rows, shapes),
  );
}

/**
 * 3×3 점 안의 사각형이 **직사각형인가** — 네 꼭짓점에서 정수 내적이 모두 $0$ 인가.
 * 이름표가 아니라 좌표로 가른다.
 */
function quadIsRect(pts: Pt[]): boolean {
  for (let i = 0; i < 4; i += 1) {
    const v = pts[i]!;
    const p = pts[(i + 3) % 4]!;
    const q = pts[(i + 1) % 4]!;
    if (vecDot(v, p, q) !== 0) return false;
  }
  return true;
}

/** 볼록 배치로 정렬 — 그대로 이으면 변이 서로 넘나드는 사각형이 그려진다. */
function orderConvex(pts: Pt[]): Pt[] {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [...pts].sort(
    (a, b) =>
      Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx),
  );
}

/**
 * 직사각형이 **아닌** 사각형 곁들이. 「직사각형을 찾으시오」의 곁들이라 넷 중 하나라도
 * 직각이 아니어야 한다 — 목록을 손으로 적되 **불러올 때 계산으로 검산**한다.
 */
const NON_RECT_QUADS: Pt[][] = [
  [
    [0, 3],
    [1, 1],
    [3, 1],
    [2, 3],
  ],
  [
    [0, 3],
    [1, 1],
    [2, 1],
    [3, 3],
  ],
  [
    [0, 3],
    [1, 0],
    [3, 1],
    [2, 3],
  ],
  [
    [0, 2],
    [1, 0],
    [3, 2],
    [2, 3],
  ],
  [
    [0, 3],
    [0, 1],
    [2, 0],
    [3, 2],
  ],
  // ⚠️ `[[1,3],[0,1],[2,0],[3,2]]` 를 여기 적었다가 아래 검산에 걸렸다 —
  //    **45° 기운 정사각형**이라 네 각이 모두 직각이었다. 손 목록은 반드시 검산할 것.
  [
    [0, 3],
    [1, 1],
    [3, 2],
    [2, 3],
  ],
].map((q) => orderConvex(q as Pt[]));

for (const q of NON_RECT_QUADS) {
  if (quadIsRect(q))
    throw new Error(`곁들이인데 직사각형입니다: ${JSON.stringify(q)}`);
}

/** 직사각형 하나 + 아닌 것들을 나란히. 정답은 **좌표로** 정해진다. */
function rectRow(rng: Rng) {
  const count = intBetween(rng, 2, 3);
  const gap = 5;
  const rows = 3;
  const answerAt = intBetween(rng, 0, count - 1);
  // 가로와 세로가 같으면 정사각형이라 「직사각형」의 답으로 헷갈린다 — 다르게 잡는다.
  const w = intBetween(rng, 2, 4);
  const h = pick(
    rng,
    [1, 2, 3].filter((v) => v !== w),
  );
  const shapes: GridShape[] = [];
  for (let i = 0; i < count; i += 1) {
    const c0 = i * gap;
    const pts =
      i === answerAt
        ? ([
            [c0, rows - h],
            [c0 + w, rows - h],
            [c0 + w, rows],
            [c0, rows],
          ] as Pt[])
        : pick(rng, NON_RECT_QUADS).map((p) => [p[0] + c0, p[1]] as Pt);
    shapes.push(closedShape(pts, SHAPE_LABELS[i]!));
  }
  return {
    cols: (count - 1) * gap + 4,
    rows,
    shapes,
    labels: SHAPE_LABELS.slice(0, count),
    answer: SHAPE_LABELS[answerAt]!,
    w,
    h,
  };
}

/** 표준 1-2-4 — 직사각형 찾기. (이 소단원은 오래 「직각삼각형」으로 잘못 적혀 있었다.) */
function rectPick(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = rectRow(rng);
  const ask = pick(rng, [
    `${row.labels.join(", ")} 중에서 직사각형의 기호를 쓰시오.`,
    `${row.labels.join(", ")} 중에서 네 각이 모두 직각인 사각형의 기호를 쓰시오.`,
    `직사각형을 찾아 기호를 쓰시오. (${row.labels.join(", ")})`,
  ]);
  return make(
    unit,
    ask,
    row.answer,
    `네 각이 모두 직각인 사각형을 직사각형이라고 합니다. ${row.answer} 는 네 각이 모두 직각입니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

function plane(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("선분")) return lineNames(unit, rng);
  // ⚠️ 「정사각형」을 「직사각형」보다 **먼저** 본다 — 둘은 다른 낱말이라 겹치지 않지만,
  // 순서를 바꾸면 나중에 「직사각형 중에서…」 같은 이름이 생겼을 때 조용히 샌다.
  if (s.includes("정사각형")) return squarePick(unit, rng);
  if (s.includes("직사각형")) return rectPick(unit, rng);
  if (s.includes("직각삼각형")) {
    // 1-2-3 하나뿐이다(1-2-4 는 직사각형으로 바로잡혔다). 찾기와 세기를 번갈아 낸다.
    return intBetween(rng, 0, 1) === 0
      ? rightTriPick(unit, rng)
      : rightTriCount(unit, rng);
  }
  return rightAnglePick(unit, rng);
}

function division(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9);
  // 몫과 나누는 수가 같으면 발문에 이미 답이 적힌 것처럼 읽힌다($25\div5$ 의 몫 $5$).
  let q = intBetween(rng, 2, 9);
  for (let k = 0; k < 8 && q === b; k += 1) q = intBetween(rng, 2, 9);
  const a = b * q;
  const s = unit.section;
  if (s.includes("똑같이")) {
    return make(
      unit,
      `사탕 ${n(a)}개를 ${n(b)}묶음으로 똑같이 나누면 한 묶음은 몇 개인가?`,
      n(q),
      `${n(a)}개를 ${n(b)}묶음으로 똑같이 나누면 한 묶음은 ${n(q)}개입니다. 식으로 쓰면 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
      fig("groupDots", { groups: b, each: q }),
    );
  }
  if (s.includes("관계")) {
    return make(
      unit,
      // «$…$ 를» 처럼 수식 바로 뒤에 조사를 붙이지 않는다(갈래 쪽 조사 규칙과 같은 표기) —
      // 식을 아랫줄로 내려 「다음 나눗셈식을」로 받는다.
      `다음 나눗셈식을 곱셈식으로 나타내면 $${b}\\times\\square=${a}$ 입니다. $\\square$ 에 알맞은 수를 쓰시오.\n\n$${a}\\div${b}=\\square$`,
      n(q),
      `곱셈식과 나눗셈식은 같은 수를 씁니다. $${b}\\times${q}=${a}$ 이므로 $\\square$ 에 알맞은 수는 ${n(q)} 입니다.`,
    );
  }
  if (s.includes("곱셈식")) {
    return make(
      unit,
      // «$…=18$ 를» → 십팔이라 «을» 이어야 한다. 수 뒤에서는 조사를 **고르지 말고
      // 안 붙인다**(읽는 소리로 갈려 글자만 봐서는 못 정한다) — 「에서」로 받는다.
      `곱셈식 $\\square\\times${b}=${a}$ 에서 $${a}\\div${b}$ 의 몫을 구하시오.`,
      n(q),
      `$${q}\\times${b}=${a}$ 이므로 $${a}\\div${b}$ 의 몫은 ${n(q)} 입니다.`,
    );
  }
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫을 곱셈구구로 구하시오.`,
    n(q),
    `${n(b)}단 곱셈구구에서 $${b}\\times${q}=${a}$ 이므로 몫은 ${n(q)} 입니다.`,
  );
}

/**
 * (몇십몇)×(몇) 의 올림 종류별 전수 열거 풀 — 1-4-2~5 는 서로 **배타**다(«십의 자리와
 * 일의 자리» 소단원이 따로 있으므로 「십의 자리에서」는 «십의 자리에서만»이다).
 *
 * ⚠️ 예전에는 십·일의 자리를 손 범위(1..3·5..9)로 갈랐는데 b≤5 와 곱하면 경계가 샌다 —
 * 실측(수리 전, 씨앗 200): 1-4-2 「올림이 **없는**」의 75건이 올림($32\times5=160$),
 * 1-4-3 의 52건·1-4-4 의 82건이 «둘 다»였다. 판정기(section-conditions)에 1-4 조건이
 * 없어 구조적으로 0이었다. 가드로 거르지 않고 **뽑는 풀 자체**를 조건으로 만든다.
 * b 는 예전 그대로 2..5 다(원장님 「숫자 규모를 키우는 축은 아님」).
 */
type MulCarry = "none" | "ones" | "tens" | "both";

const MUL_CARRIES: readonly MulCarry[] = ["none", "ones", "tens", "both"];

/**
 * $(\text{몇십몇})\times(\text{몇})$ 의 올림 종류. **한 곳에서만 정한다** —
 * 표준·4단 풀(`mulPools`)과 확대 갈래(`mul14MidPool`)가 같은 규칙을 두 벌로
 * 적으면 한쪽만 고쳐도 아무도 모른다.
 */
function mulCarryClassOf(t: number, o: number, b: number): MulCarry {
  const onesCarry = o * b >= 10;
  const tensCarry = t * b + Math.floor((o * b) / 10) >= 10;
  return onesCarry
    ? tensCarry
      ? "both"
      : "ones"
    : tensCarry
      ? "tens"
      : "none";
}

/** 소단원 **이름**이 약속한 올림 종류. 지면에서 읽으면 동어반복이 된다. */
function mulCarryOfSection(section: string): MulCarry {
  return section.includes("일의 자리") && section.includes("십의 자리")
    ? "both"
    : section.includes("일의 자리")
      ? "ones"
      : section.includes("십의 자리")
        ? "tens"
        : "none";
}

function mulPools(): Record<MulCarry, { t: number; o: number; b: number }[]> {
  const pools: Record<MulCarry, { t: number; o: number; b: number }[]> = {
    none: [],
    ones: [],
    tens: [],
    both: [],
  };
  for (let t = 1; t <= 9; t += 1) {
    for (let o = 1; o <= 9; o += 1) {
      for (let b = 2; b <= 5; b += 1) {
        pools[mulCarryClassOf(t, o, b)].push({ t, o, b });
      }
    }
  }
  for (const key of MUL_CARRIES) {
    if (pools[key].length === 0)
      throw new Error(`곱셈 풀이 비었습니다: ${key}`);
  }
  return pools;
}

const MUL_POOLS = mulPools();

/** 소단원 이름 → 그 이름이 약속한 곱셈 한 벌. 표준과 갈래가 **이 함수 하나**로 뽑는다. */
function mulCaseOf(section: string, rng: Rng): { a: number; b: number } {
  if (section.includes("(몇십)×(몇)")) {
    return { a: intBetween(rng, 2, 9) * 10, b: intBetween(rng, 2, 9) };
  }
  const { t, o, b } = pick(rng, MUL_POOLS[mulCarryOfSection(section)]);
  return { a: t * 10 + o, b };
}

function mul31(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("(몇십)×(몇)")) {
    const { a, b } = mulCaseOf(s, rng);
    return make(
      unit,
      `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
      n(a * b),
      expr(`${a}\\times${b}=${a * b}`),
    );
  }
  const { a, b } = mulCaseOf(s, rng);
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
    n(a * b),
    expr(`${a}\\times${b}=${a * b}`),
  );
}

function lengthTime(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("1cm보다")) {
    const cm = intBetween(rng, 2, 9);
    const extra = intBetween(rng, 0, 9);
    const mm = cm * 10 + extra;
    if (extra === 0) {
      return make(
        unit,
        `□ 안에 알맞은 수를 쓰시오.\n\n$${mm}\\,\\mathrm{mm}=\\square\\,\\mathrm{cm}$`,
        n(cm),
        `$1\\,\\mathrm{cm}=10\\,\\mathrm{mm}$ 이므로 ${unitNum(mm, "mm")} 는 ${unitNum(cm, "cm")} 입니다.`,
        fig("tape", { length: cm, label: `${mm} mm` }),
      );
    }
    return make(
      unit,
      `${unitNum(mm, "mm")} 는 몇 cm 몇 mm인지 쓰시오.`,
      mixedUnit(cm, extra, "cm", "mm"),
      `$10\\,\\mathrm{mm}=1\\,\\mathrm{cm}$ 이므로 ${unitNum(mm, "mm")} 는 ${mixedUnit(cm, extra, "cm", "mm")} 입니다.`,
      fig("tape", { length: cm, label: `${mm} mm` }),
    );
  }
  if (s.includes("1m보다")) {
    const km = intBetween(rng, 2, 8);
    const m = intBetween(rng, 0, 9) * 100;
    if (m === 0) {
      return make(
        unit,
        `□ 안에 알맞은 수를 쓰시오.\n\n$${km}\\,\\mathrm{km}=\\square\\,\\mathrm{m}$`,
        n(km * 1000),
        `$1\\,\\mathrm{km}=1000\\,\\mathrm{m}$ 이므로 ${unitNum(km, "km")} 는 ${unitNum(km * 1000, "m")} 입니다.`,
      );
    }
    return make(
      unit,
      `${mixedUnit(km, m, "km", "m")} 는 몇 m인지 쓰시오.`,
      n(km * 1000 + m),
      `$1\\,\\mathrm{km}=1000\\,\\mathrm{m}$ 이므로 $${km}\\,\\mathrm{km}=${km * 1000}\\,\\mathrm{m}$ 입니다. ${expr(`${km * 1000}+${m}=${km * 1000 + m}`)} 이므로 ${unitNum(km * 1000 + m, "m")} 입니다.`,
    );
  }
  if (s.includes("어림") || s.includes("재어")) {
    const thing = pick(rng, ["지우개", "풀", "가위", "색연필", "머리핀"]);
    const guessCm = intBetween(rng, 5, 9);
    // 차가 어림한 cm 값과 같으면 「발문이 답을 말한 것」처럼 읽힌다 — 겹치지 않게 고른다.
    const off = pick(
      rng,
      [-4, -3, -2, 2, 3, 4].filter((v) => Math.abs(v) !== guessCm),
    );
    const realMm = guessCm * 10 + off;
    const gap = Math.abs(realMm - guessCm * 10);
    return make(
      unit,
      `${thing}의 길이를 약 ${unitNum(guessCm, "cm")} 로 어림했습니다. 자로 재었더니 ${unitNum(realMm, "mm")} 였습니다. 어림한 길이와 잰 길이의 차는 몇 mm인지 쓰시오.`,
      n(gap),
      `어림한 ${unitNum(guessCm, "cm")} 는 ${unitNum(guessCm * 10, "mm")} 입니다. ${expr(`${Math.max(realMm, guessCm * 10)}-${Math.min(realMm, guessCm * 10)}=${gap}`)} 이므로 차는 ${unitNum(gap, "mm")} 입니다.`,
    );
  }
  if (s.includes("1분보다")) {
    const m = intBetween(rng, 2, 5);
    const sec = intBetween(rng, 0, 9) * 5;
    if (sec === 0) {
      return make(
        unit,
        `${n(m)}분은 몇 초인지 쓰시오.`,
        n(m * 60),
        `$1$ 분은 $60$ 초이므로 ${expr(`60\\times${m}=${m * 60}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `${n(m)}분 ${n(sec)}초는 몇 초인지 쓰시오.`,
      n(m * 60 + sec),
      `$1$ 분은 $60$ 초이므로 ${n(m)}분은 ${n(m * 60)}초입니다. ${expr(`${m * 60}+${sec}=${m * 60 + sec}`)} 이므로 ${n(m * 60 + sec)}초입니다.`,
    );
  }
  if (s.includes("덧셈")) {
    const h1 = intBetween(rng, 1, 4);
    const h2 = intBetween(rng, 1, 3);
    const m1 = intBetween(rng, 15, 50);
    const m2 = intBetween(rng, Math.max(11, 61 - m1), 55);
    const hh = h1 + h2 + 1;
    const mm = m1 + m2 - 60;
    return make(
      unit,
      `${n(h1)}시간 ${n(m1)}분과 ${n(h2)}시간 ${n(m2)}분을 더하면 몇 시간 몇 분인지 쓰시오.`,
      `${n(hh)}시간 ${n(mm)}분`,
      `분끼리 더하면 ${expr(`${m1}+${m2}=${m1 + m2}`)} 분이고, $60$ 분은 $1$ 시간이므로 ${n(m1 + m2)}분은 ${n(1)}시간 ${n(mm)}분입니다. 시간끼리 더하면 ${expr(`${h1}+${h2}=${h1 + h2}`)} 시간이므로 모두 ${n(hh)}시간 ${n(mm)}분입니다.`,
    );
  }
  const h = intBetween(rng, 4, 8);
  const subh = intBetween(rng, 1, h - 2);
  const m = intBetween(rng, 5, 25);
  const subm = intBetween(rng, m + 5, 55);
  const mm = m + 60 - subm;
  const hh = h - 1 - subh;
  return make(
    unit,
    `${n(h)}시간 ${n(m)}분에서 ${n(subh)}시간 ${n(subm)}분을 빼면 몇 시간 몇 분인지 쓰시오.`,
    `${n(hh)}시간 ${n(mm)}분`,
    `분끼리 뺄 수 없으므로 $1$ 시간을 $60$ 분으로 바꿉니다. ${expr(`${m}+60=${m + 60}`)} 이고 ${expr(`${m + 60}-${subm}=${mm}`)} 이므로 ${n(mm)}분입니다. 시간끼리 빼면 ${expr(`${h - 1}-${subh}=${hh}`)} 이므로 모두 ${n(hh)}시간 ${n(mm)}분입니다.`,
  );
}

/** 분수 그림 종류에 맞는 소재. 그림은 둥근데 말은 「색 테이프」면 어긋난다. */
function fracMaterial(rng: Rng, kind: string): string {
  if (kind === "fracPie") return pick(rng, ["피자", "케이크", "둥근 종이"]);
  if (kind === "triRow") return pick(rng, ["종이 띠", "색종이"]);
  if (kind === "trapFour") return pick(rng, ["색종이", "도화지"]);
  return pick(rng, ["색 테이프", "종이 띠", "색종이"]);
}

function fracDec31(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  if (s.includes("똑같이 나누기")) {
    const spec = fracSpec(rng, parts, filled);
    const material = fracMaterial(rng, String(spec.kind));
    return make(
      unit,
      `그림은 ${material}${josa(material, "을", "를")} 똑같이 나눈 것입니다. 나누어진 조각은 모두 몇 개인지 쓰시오.`,
      n(parts),
      `${material}${josa(material, "은", "는")} 크기가 같은 ${n(parts)}조각으로 나누어져 있습니다. 이때 한 조각은 전체를 똑같이 ${n(parts)}조각으로 나눈 것 중의 하나입니다.`,
      spec,
    );
  }
  if (s.includes("분수 알아보기(1)")) {
    const spec = fracSpec(rng, parts, filled);
    const material = fracMaterial(rng, String(spec.kind));
    return make(
      unit,
      `${material}에서 색칠한 부분은 전체의 얼마인지 분수로 쓰시오.`,
      expr(`\\frac{${filled}}{${parts}}`),
      `전체를 똑같이 ${n(parts)}조각으로 나눈 것 중 ${n(filled)}조각을 색칠했으므로 ${expr(`\\frac{${filled}}{${parts}}`)} 입니다.`,
      spec,
    );
  }
  if (s.includes("분수 알아보기(2)")) {
    const spec = fracSpec(rng, parts, filled);
    const material = fracMaterial(rng, String(spec.kind));
    const rest = parts - filled;
    return make(
      unit,
      `${material}에서 색칠하지 않은 부분은 전체의 얼마인지 분수로 쓰시오.`,
      expr(`\\frac{${rest}}{${parts}}`),
      `전체 ${n(parts)}조각 중 색칠한 것이 ${n(filled)}조각이므로 색칠하지 않은 것은 ${expr(`${parts}-${filled}=${rest}`)} 조각입니다. 따라서 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다.`,
      spec,
    );
  }
  if (s.includes("단위분수")) {
    const a = intBetween(rng, 3, 7);
    const b = a + intBetween(rng, 1, 4);
    return make(
      unit,
      `다음 두 분수 중 더 큰 분수를 쓰시오.\n\n$\\frac{1}{${a}}$,  $\\frac{1}{${b}}$`,
      expr(`\\frac{1}{${a}}`),
      `단위분수는 전체를 똑같이 나눈 조각 수가 적을수록 한 조각이 큽니다. 분모가 더 작은 쪽이 크므로 답은 ${expr(`\\frac{1}{${a}}`)} 입니다.`,
    );
  }
  if (s.includes("분모가 같은")) {
    const den = intBetween(rng, 5, 9);
    const a = intBetween(rng, 1, den - 2);
    const b = intBetween(rng, a + 1, den - 1);
    return make(
      unit,
      `다음 두 분수 중 더 큰 분수를 쓰시오.\n\n$\\frac{${a}}{${den}}$,  $\\frac{${b}}{${den}}$`,
      expr(`\\frac{${b}}{${den}}`),
      `분모가 같으면 분자가 클수록 큽니다. 분자를 비교하면 ${expr(`${b}>${a}`)} 이므로 답은 ${expr(`\\frac{${b}}{${den}}`)} 입니다.`,
    );
  }
  if (s.includes("소수 알아보기")) {
    const k = intBetween(rng, 1, 9);
    const material = pick(rng, ["색 테이프", "종이 띠", "색종이"]);
    return make(
      unit,
      `${material}${josa(material, "을", "를")} 똑같이 ${n(10)}칸으로 나누고 ${n(k)}칸을 색칠했습니다. 색칠한 부분을 소수로 쓰시오.`,
      n(`0.${k}`),
      `전체를 똑같이 ${n(10)}칸으로 나눈 것 중 ${n(k)}칸이므로 ${expr(`\\frac{${k}}{10}`)} 이고, 이것을 소수로 쓰면 ${expr(`0.${k}`)} 입니다.`,
      fig("fracBars", { cols: 10, rows: 1, filled: k }),
    );
  }
  const w1 = intBetween(rng, 0, 6);
  const t1 = intBetween(rng, 1, 9);
  const sameWhole = intBetween(rng, 0, 1) === 1;
  const w2 = sameWhole ? w1 : w1 + intBetween(rng, 1, 3);
  const t2 = sameWhole
    ? t1 <= 5
      ? t1 + intBetween(rng, 1, 4)
      : t1 - intBetween(rng, 1, 4)
    : intBetween(rng, 1, 9);
  const left = w1 + t1 / 10;
  const right = w2 + t2 / 10;
  const bigger = left > right ? `${w1}.${t1}` : `${w2}.${t2}`;
  return make(
    unit,
    `다음 두 수 중 더 큰 수를 쓰시오.\n\n$${w1}.${t1}$,  $${w2}.${t2}$`,
    n(bigger),
    sameWhole
      ? `자연수 부분이 같으므로 소수 첫째 자리를 비교합니다. 답은 ${expr(bigger)} 입니다.`
      : `자연수 부분이 클수록 큰 수입니다. 답은 ${expr(bigger)} 입니다.`,
  );
}

/** (세 자리)×(한 자리) 의 올림 횟수 — 표준·갈래가 **이 함수 하나**로 센다. */
function mulCarries3x1(a: number, b: number): number {
  let carries = 0;
  let carry = 0;
  for (let d = 0; d < 3; d += 1) {
    const digit = Math.floor(a / 10 ** d) % 10;
    const v = digit * b + carry;
    carry = Math.floor(v / 10);
    if (carry > 0) carries += 1;
  }
  return carries;
}

/** (세 자리)×(한 자리) 에서 올림이 몇 번 나는가로 고른다. */
function mul3x1(rng: Rng, minC: number, maxC: number): [number, number] {
  for (let k = 0; k < 120; k += 1) {
    const a = intBetween(rng, 112, 498);
    const b = intBetween(rng, 2, 8);
    const carries = mulCarries3x1(a, b);
    if (carries >= minC && carries <= maxC) return [a, b];
  }
  return minC === 0 ? [123, 2] : [387, 6];
}

function mul32(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("세 자리") && s.includes("한 자리")) {
    const heavy = s.includes("(2)");
    const [a, b] = mul3x1(rng, heavy ? 2 : 0, heavy ? 3 : 1);
    return make(
      unit,
      `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
      n(a * b),
      expr(`${a}\\times${b}=${a * b}`),
    );
  }
  if (s.includes("(몇십)×(몇십)")) {
    const form = intBetween(rng, 0, 2);
    if (form === 0) {
      const a = intBetween(rng, 2, 9) * 10;
      const b = intBetween(rng, 2, 9) * 10;
      return make(
        unit,
        `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
        n(a * b),
        expr(`${a}\\times${b}=${a * b}`),
      );
    }
    if (form === 1) {
      const a = intBetween(rng, 12, 48);
      const b = intBetween(rng, 2, 7) * 10;
      return make(
        unit,
        `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
        n(a * b),
        expr(`${a}\\times${b}=${a * b}`),
      );
    }
    const a = intBetween(rng, 3, 9);
    // b 가 20·30·40 이면 (몇)×(몇십) — 소단원 이름의 세 꼴 어디에도 없다(실측 4/200).
    // 가드로 거르지 않고 건너뛰기 추첨으로 뽑는 범위에서 뺀다: 12..45 → 12..48∖{20,30,40}.
    let b = intBetween(rng, 12, 45);
    for (const cut of [20, 30, 40]) if (b >= cut) b += 1;
    return make(
      unit,
      `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
      n(a * b),
      expr(`${a}\\times${b}=${a * b}`),
    );
  }
  // 두 수 다 «몇십몇» 이어야 한다 — 일의 자리가 0 이면 (몇십)×(몇십몇) 이라 소단원이 달라진다.
  // 0 을 1 로 밀면 그 값만 두 배로 자주 나온다. 다시 뽑는다.
  let a = intBetween(rng, 12, 28);
  for (let k = 0; k < 8 && a % 10 === 0; k += 1) a = intBetween(rng, 12, 28);
  if (a % 10 === 0) a = 23;
  const b = intBetween(rng, 12, 19);
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
    n(a * b),
    expr(`${a}\\times${b}=${a * b}`),
  );
}

/** 두 자리 나눗셈. 십의 자리에서 내림이 있는지로 고른다. */
function div2(rng: Rng, wantCarryDown: boolean): [number, number, number] {
  for (let k = 0; k < 160; k += 1) {
    const b = intBetween(rng, 2, 9);
    const q = intBetween(rng, 11, 49);
    const a = b * q;
    if (a < 20 || a > 99) continue;
    if ((Math.floor(a / 10) % b !== 0) === wantCarryDown) return [a, b, q];
  }
  return wantCarryDown ? [52, 4, 13] : [48, 4, 12];
}

/**
 * 나머지가 있는 (몇십몇)÷(몇) 한 벌 — 표준과 갈래가 **이 함수 하나**로 뽑는다.
 *
 * ⚠️ $a=b\times q+r$ 로 **조립한 뒤 일의 자리를 안 보면** $70\div8$·$10\div3$ 같은
 * (몇십)÷(몇) 이 나온다 — 소단원 이름이 약속한 «몇십몇» 이 아니다(실측 20/200).
 * 가드로 거르지 않고 **뽑는 범위에서 뺀다**: $b,q$ 가 정해지면 $r$ 은 연속 $b-1(\le8)$
 * 개라 $bq+r$ 이 십의 배수가 되는 $r$ 은 **많아야 하나**다. 그 하나가 범위 안일 때만
 * 한 칸 짧게 뽑아 그 지점부터 밀어 준다(전단사). 없으면 종전 그대로다.
 * 그래서 두 자리($11\le a\le79$ — $9\times8+8=80$ 은 일의 자리가 0 이라 걸러진다)와
 * $1\le r<b$ 가 구성으로 남는다.
 *
 * ⚠️ **$b$ 의 아래끝을 3 보다 낮추지 말 것.** $b=2$ 면 좋은 $r$ 이 $b-2=0$ 개라
 * `intBetween(1, 0)` 이 던진다. 지금은 안 일어난다 — $b=2$ 는 $r=1$ 뿐이고 $2q+1$ 은
 * 홀수라 십의 배수가 될 수 없어 `bad` 가 아예 없고 「없으면 종전대로」 갈래를 탄다.
 * 그 근거가 **코드가 아니라 수학에 있으므로**, 범위를 넓히면 이 자리가 조용히 깨진다.
 */
function div2Rem(rng: Rng): [number, number, number, number] {
  const b = intBetween(rng, 3, 9);
  const q = intBetween(rng, 3, 8);
  let bad = -1;
  for (let v = 1; v <= b - 1; v += 1) if ((b * q + v) % 10 === 0) bad = v;
  let r: number;
  if (bad === -1) {
    r = intBetween(rng, 1, b - 1);
  } else {
    r = intBetween(rng, 1, b - 2);
    if (r >= bad) r += 1;
  }
  return [b * q + r, b, q, r];
}

function div32(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("나머지")) {
    const [a, b, q, r] = div2Rem(rng);
    return make(
      unit,
      `$${a}\\div${b}$ 의 몫과 나머지를 쓰시오.`,
      `몫 ${n(q)}, 나머지 ${n(r)}`,
      `$${b}\\times${q}=${b * q}$ 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다.`,
    );
  }
  if (s.includes("세 자리")) {
    const b = intBetween(rng, 3, 9);
    // ⚠️ 몫을 12..48 로만 뽑으면 b 가 작을 때 나뉘는 수가 두 자리로 떨어진다 —
    // 실측 $45\div3$, 씨앗 12/40 (probe-elem-section-conditions). 가드로 거르지 않고
    // **아래끝을 b 에서 유도**한다(threeSum 과 같은 태도): $b\times q\ge100$ 이 되는
    // 첫 몫부터 뽑는다. 위끝은 $9\times48=432\le999$ 라 그대로 세 자리 안이다.
    const q = intBetween(rng, Math.ceil(100 / b), 48);
    const a = b * q;
    return make(
      unit,
      `다음을 계산하시오.\n\n$${a}\\div${b}=\\square$`,
      n(q),
      `$${b}\\times${q}=${a}$ 이므로 몫은 ${n(q)} 입니다.`,
    );
  }
  const [a, b, q] = div2(rng, s.includes("내림이 있는"));
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}\\div${b}=\\square$`,
    n(q),
    `$${b}\\times${q}=${a}$ 이므로 몫은 ${n(q)} 입니다.`,
  );
}

/**
 * **2-3 원의 그림** — `circleParts`. 🔴 **그림이 학생이 할 단계를 대신하면 안 된다.**
 *
 * 이 소단원은 「원의 중심·지름·반지름」이 곧 이름이라 **묻는 것과 그리는 것이 같아지기
 * 쉽다.** 그래서 발문마다 무엇을 묻는지 보고 갈랐다:
 *
 *  · **2-3-1(용어)** — 답이 «낱말»이다. 엔진이 용어 라벨을 아예 안 그리므로
 *    맨 원 + 중심점이면 새는 것이 없다. 발문이 선분을 말로 다 설명한다.
 *  · **2-3-2(성질)** — 한쪽 치수를 주고 다른 쪽을 묻는다. **준 쪽만** 적는다.
 *    묻는 쪽을 적으면 답이 지면에 있다(엔진이 둘 다 받으면 던진다).
 *  · **2-3-3(원 그리기)** — 그림을 **안 붙인다.** 「컴퍼스를 8cm 벌렸다 → 지름은?」
 *    에서 갈리는 것은 **벌린 길이 하나**뿐인데, 그것을 그림이 나를 길이 둘 다 막힌다:
 *      ㉠ 치수로 적으면 숨은 단계(**«벌린 길이 = 반지름»**)를 **그림이 대신한다.**
 *      ㉡ 원 크기로 나타내면 — 이 kind 는 **고정 62px 도식**이라 값을 안 따른다.
 *    남는 것은 맨 원이고, 맨 원은 **나르는 것이 없다.** `R9-b` 가 「전 씨앗 동일」로
 *    잡은 자리다(2026-08-24).
 *    ⚠️ **뜻 없는 변화(원 크기 흔들기)로 통과시키지 마라** — R9 가 묻는 것은
 *    「씨앗마다 다른가」가 아니라 **「그림이 정보를 나르는가」**다. 2-3-2 와 겉보기가
 *    같아도 이유가 다르다: 저쪽은 **답**이라서 안 적고, 여기는 **나를 것이 없어서** 안 붙인다.
 */
function circleFig(
  kind: "bare" | "showRadius" | "showDiameter" | "radius" | "diameter",
  cm?: number,
) {
  if (kind === "bare") return fig("circleParts", {});
  // `show` — **선분은 그리되 치수는 안 적는다.** 2-3-1 이 「이 선분을 무엇이라 하는지」를
  // 묻는데 그 선분이 지면에 없으면 그림이 아무 말도 안 한다. 답은 낱말이라 안 샌다.
  if (kind === "showRadius") return fig("circleParts", { show: "radius" });
  if (kind === "showDiameter") return fig("circleParts", { show: "diameter" });
  return fig("circleParts", { [kind]: `${cm} cm` });
}

function circle32(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("중심")) {
    const which = pick(rng, ["원의 중심", "지름", "반지름"] as const);
    if (which === "원의 중심") {
      return make(
        unit,
        `원을 그릴 때 컴퍼스의 침을 꽂은 점, 곧 원의 한가운데 있는 점을 무엇이라고 하는지 쓰시오.`,
        "원의 중심",
        "원을 그릴 때 침을 꽂은 점이 원의 중심입니다. 원의 중심에서 원 위의 어느 점까지 재어도 길이가 같습니다.",
        circleFig("bare"),
      );
    }
    if (which === "지름") {
      return make(
        unit,
        `원의 중심을 지나면서 원 위의 두 점을 이은 선분을 무엇이라고 하는지 쓰시오.`,
        "지름",
        "원의 중심을 지나 원 위의 두 점을 이은 선분이 지름입니다. 한 원에서 지름은 모두 길이가 같습니다.",
        circleFig("showDiameter"),
      );
    }
    return make(
      unit,
      `원의 중심과 원 위의 한 점을 이은 선분을 무엇이라고 하는지 쓰시오.`,
      "반지름",
      "원의 중심과 원 위의 한 점을 이은 선분이 반지름입니다. 한 원에서 반지름은 모두 길이가 같습니다.",
      circleFig("showRadius"),
    );
  }
  if (s.includes("성질")) {
    const r = intBetween(rng, 2, 9);
    if (intBetween(rng, 0, 1) === 1) {
      return make(
        unit,
        `반지름이 ${unitNum(r, "cm")} 인 원의 지름은 몇 cm인지 쓰시오.`,
        n(r * 2),
        `한 원에서 지름은 반지름의 $2$ 배입니다. ${expr(`${r}\\times2=${r * 2}`)} 이므로 지름은 ${unitNum(r * 2, "cm")} 입니다.`,
        circleFig("radius", r),
      );
    }
    return make(
      unit,
      `지름이 ${unitNum(r * 2, "cm")} 인 원의 반지름은 몇 cm인지 쓰시오.`,
      n(r),
      `한 원에서 반지름은 지름의 반입니다. ${expr(`${r * 2}\\div2=${r}`)} 이므로 반지름은 ${unitNum(r, "cm")} 입니다.`,
      circleFig("diameter", r * 2),
    );
  }
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려서 원을 그렸습니다. 이 원의 지름은 몇 cm인지 쓰시오.`,
    n(r * 2),
    `컴퍼스를 벌린 길이가 원의 반지름이 됩니다. 지름은 반지름의 $2$ 배이므로 ${expr(`${r}\\times2=${r * 2}`)} 입니다.`,
  );
}

function frac32(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  // 「개」로 세는 것만 — 색종이는 「장」이라 발문이 어색해진다.
  const stuff = pick(rng, ["사탕", "구슬", "딱지", "쿠키", "귤"]);
  if (s.includes("분수로 나타내기")) {
    // ⚠️ **여기는 기약으로 안 거른다 — 아래 「분수만큼」과 통일하지 말 것.**
    // 이 소단원의 분수는 **답**이다. 「$6$묶음 중 $2$묶음」의 답은 $\frac26$ 이 정답이고,
    // $\frac13$ 을 요구하면 **약분(초5)을 안 배운 학년에게 안 배운 것을 요구**하게 된다.
    // 아래 2-4-2·3 은 분수가 **발문에 주어지는 값**이라 반대로 걸러야 한다(거기 주석 참조).
    // 실측 2026-08-23: 씨앗 200개에서 약분되는 답이 39건 — **결함이 아니라 학년에 맞는 것**.
    // 같은 이유로 1-6-2·1-6-3(그림에서 읽는 분수)도 안 거른다.
    // ⓘ 지금 초등 문항은 **자동 채점 경로가 없다**(답은 정답지에 찍고 사람이 채점한다).
    //   나중에 자동 채점이 생기면 $\frac26$ 과 $\frac13$ 을 같게 볼지가 여기서 걸린다.
    const groups = intBetween(rng, 3, 6);
    const each = intBetween(rng, 2, 8);
    const whole = groups * each;
    const take = intBetween(rng, 1, groups - 1);
    return make(
      unit,
      `${stuff} ${n(whole)}개를 똑같이 ${n(groups)}묶음으로 나누었습니다. ${n(take)}묶음은 전체의 얼마인지 분수로 쓰시오.`,
      expr(`\\frac{${take}}{${groups}}`),
      `전체를 똑같이 ${n(groups)}묶음으로 나눈 것 중 ${n(take)}묶음이므로 ${expr(`\\frac{${take}}{${groups}}`)} 입니다.`,
      fig("groupDots", { groups, each }),
    );
  }
  if (s.includes("분수만큼")) {
    // (2) 는 분자가 $2$ 이상이라 분모가 $3$ 보다 작으면 만들 수 없다.
    const many = s.includes("(2)");
    const den = intBetween(rng, many ? 3 : 2, 6);
    const each = intBetween(rng, 2, 8);
    const whole = den * each;
    // 약분되는 분수($\frac24$)는 초3-2 가 아직 안 배운 모양이다 — 기약인 것만 고른다.
    // 분모와 서로소인 분자는 $den-1$ 이 늘 있으므로 후보가 비지 않는다.
    // ⚠️ **위 「분수로 나타내기」와 규칙이 갈리는 것은 일부러다 — 통일하지 말 것.**
    // 여기 분수는 **발문에 주어지는 값**이라 「$24$개의 $\frac26$ 만큼」이 학생에게 약분을
    // 부른다. 위쪽은 분수가 **답**이라 안 거른다. 두 규칙은 어긋난 게 아니라 **서로 다른
    // 것을 막는다** — 어느 쪽으로 통일해도 한쪽이 깨진다(2026-08-23 리드 확정).
    const take = many
      ? pick(
          rng,
          Array.from({ length: den - 2 }, (_, i) => i + 2).filter(
            (v) => gcd(v, den) === 1,
          ),
        )
      : 1;
    const answer = each * take;
    if (take === 1) {
      return make(
        unit,
        `${stuff} ${n(whole)}개의 $\\frac{1}{${den}}$ 만큼은 몇 개인지 쓰시오.`,
        n(answer),
        `${n(whole)}개를 똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${n(each)}개입니다. 한 묶음이 전체의 $\\frac{1}{${den}}$ 만큼이므로 답은 ${n(answer)}개입니다.`,
        fig("groupDots", { groups: den, each }),
      );
    }
    return make(
      unit,
      `${stuff} ${n(whole)}개의 $\\frac{${take}}{${den}}$ 만큼은 몇 개인지 쓰시오.`,
      n(answer),
      `${n(whole)}개를 똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${n(each)}개입니다. ${n(take)}묶음이므로 ${expr(`${each}\\times${take}=${answer}`)} 개입니다.`,
      fig("groupDots", { groups: den, each }),
    );
  }
  if (s.includes("진분수")) {
    const den = intBetween(rng, 3, 9);
    const improper = intBetween(rng, 0, 1) === 1;
    const num = improper
      ? intBetween(rng, den, den + 5)
      : intBetween(rng, 1, den - 1);
    return make(
      unit,
      `다음 분수는 진분수와 가분수 중 무엇인지 쓰시오.\n\n$\\frac{${num}}{${den}}$`,
      improper ? "가분수" : "진분수",
      improper
        ? "분자가 분모와 같거나 분모보다 크면 가분수입니다."
        : "분자가 분모보다 작으면 진분수입니다.",
    );
  }
  if (s.includes("대분수")) {
    const den = intBetween(rng, 3, 8);
    const whole = intBetween(rng, 2, 5);
    const rest = pick(
      rng,
      Array.from({ length: den - 1 }, (_, i) => i + 1).filter(
        (v) => gcd(v, den) === 1,
      ),
    );
    const num = whole * den + rest;
    return make(
      unit,
      `다음 가분수를 대분수로 나타내시오.\n\n$\\frac{${num}}{${den}}$`,
      expr(fracLatex(num, den)),
      // ⚠️ 나머지가 있는 나눗셈을 **등식**으로 적지 않는다 — `$17\div6=2$` 는 참이 아니다.
      // 곱하고 빼서 몫·나머지를 보이는 꼴로 쓴다(2-2-3 해설과 같은 표기).
      `${expr(`${den}\\times${whole}=${den * whole}`)} 이고 ${expr(`${num}-${den * whole}=${rest}`)} 이므로 ${expr(`${num}\\div${den}`)} 의 몫은 ${n(whole)}, 나머지는 ${n(rest)} 입니다. 대분수로 나타내면 ${expr(fracLatex(num, den))} 입니다.`,
    );
  }
  const den = intBetween(rng, 6, 9);
  const picked = new Set<number>();
  while (picked.size < 3) picked.add(intBetween(rng, 1, den - 1));
  const three = [...picked];
  const top = Math.max(...three);
  return make(
    unit,
    `다음 세 분수 중 가장 큰 분수를 쓰시오.\n\n$\\frac{${three[0]}}{${den}}$,  $\\frac{${three[1]}}{${den}}$,  $\\frac{${three[2]}}{${den}}$`,
    expr(`\\frac{${top}}{${den}}`),
    `분모가 같은 분수는 분자가 클수록 큽니다. 분자 중 가장 큰 수가 ${n(top)} 이므로 답은 ${expr(`\\frac{${top}}{${den}}`)} 입니다.`,
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** `$1\,\mathrm{L}\ 300\,\mathrm{mL}$` — 큰 단위와 작은 단위를 한 덩어리로. */
function mixedUnit(
  big: number,
  small: number,
  bigUnit: string,
  smallUnit: string,
): string {
  return `$${big}\\,\\mathrm{${bigUnit}}\\ ${small}\\,\\mathrm{${smallUnit}}$`;
}

function capacity(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  const mass = s.includes("무게");
  const big = mass ? "kg" : "L";
  const small = mass ? "g" : "mL";
  // 단위를 소리내어 읽으면 조사가 갈린다 — 「그램**은**」·「리터**는**」.
  // 큰 단위와 작은 단위가 한 갈래에서 같은 소리로 끝나므로 한 벌이면 된다.
  const jNun = mass ? "은" : "는";
  const jReul = mass ? "을" : "를";
  const jRo = mass ? "으로" : "로";
  if (s.includes("비교")) {
    const b1 = intBetween(rng, 1, 4);
    const s1 = intBetween(rng, 100, 900);
    const total1 = b1 * 1000 + s1;
    const gap =
      intBetween(rng, 50, 400) * (intBetween(rng, 0, 1) === 1 ? 1 : -1);
    const total2 = total1 + gap;
    const answer = total1 > total2 ? "가" : "나";
    const noun = mass ? "상자" : "그릇";
    const nounNun = josa(noun, "은", "는");
    const nounGa = josa(noun, "이", "가");
    return make(
      unit,
      `가 ${noun}${nounNun} ${mixedUnit(b1, s1, big, small)}, 나 ${noun}${nounNun} ${unitNum(total2, small)} 입니다. 더 ${mass ? "무거운" : "많이 담기는"} ${noun}의 기호를 쓰시오.`,
      answer,
      `${mixedUnit(b1, s1, big, small)} ${jNun} ${unitNum(total1, small)} 입니다. ${expr(`${Math.max(total1, total2)}>${Math.min(total1, total2)}`)} 이므로 ${answer} ${noun}${nounGa} 더 ${mass ? "무겁습니다" : "많이 담깁니다"}.`,
    );
  }
  if (s.includes("단위")) {
    const b = intBetween(rng, 2, 9);
    if (intBetween(rng, 0, 1) === 1) {
      return make(
        unit,
        `□ 안에 알맞은 수를 쓰시오.\n\n$${b}\\,\\mathrm{${big}}=\\square\\,\\mathrm{${small}}$`,
        n(b * 1000),
        `$1\\,\\mathrm{${big}}=1000\\,\\mathrm{${small}}$ 이므로 ${unitNum(b, big)} ${jNun} ${unitNum(b * 1000, small)} 입니다.`,
      );
    }
    const rest = intBetween(rng, 1, 9) * 100;
    return make(
      unit,
      `${unitNum(b * 1000 + rest, small)} ${jNun} 몇 ${big} 몇 ${small}인지 쓰시오.`,
      mixedUnit(b, rest, big, small),
      `$1000\\,\\mathrm{${small}}=1\\,\\mathrm{${big}}$ 이므로 ${unitNum(b * 1000 + rest, small)} ${jNun} ${mixedUnit(b, rest, big, small)} 입니다.`,
    );
  }
  // 큰 단위는 $2$ 이상 — 받아내림이 나도 답이 `$0\,\mathrm{L}\ 372\,\mathrm{mL}$` 로 떨어지지 않는다.
  const b1 = intBetween(rng, 2, 4);
  const b2 = intBetween(rng, 1, 3);
  const s1 = intBetween(rng, 100, 900);
  const s2 = intBetween(rng, 100, 900);
  if (intBetween(rng, 0, 1) === 1) {
    const sumSmall = s1 + s2;
    const carry = sumSmall >= 1000 ? 1 : 0;
    const outSmall = sumSmall - carry * 1000;
    const outBig = b1 + b2 + carry;
    return make(
      unit,
      `다음을 계산하시오.\n\n$${b1}\\,\\mathrm{${big}}\\ ${s1}\\,\\mathrm{${small}}+${b2}\\,\\mathrm{${big}}\\ ${s2}\\,\\mathrm{${small}}=\\square$`,
      mixedUnit(outBig, outSmall, big, small),
      carry === 1
        ? `${small}끼리 더하면 ${expr(`${s1}+${s2}=${sumSmall}`)} 이고, $1000\\,\\mathrm{${small}}$ ${jNun} $1\\,\\mathrm{${big}}$ 이므로 받아올림합니다. ${big}끼리 더하면 ${expr(`${b1}+${b2}+1=${outBig}`)} 이므로 ${mixedUnit(outBig, outSmall, big, small)} 입니다.`
        : `${small}끼리 더하면 ${expr(`${s1}+${s2}=${outSmall}`)}, ${big}끼리 더하면 ${expr(`${b1}+${b2}=${outBig}`)} 이므로 ${mixedUnit(outBig, outSmall, big, small)} 입니다.`,
    );
  }
  const total1 = (b1 + b2) * 1000 + s1;
  const total2 = b2 * 1000 + s2;
  const diff = total1 - total2;
  const outBig = Math.floor(diff / 1000);
  const outSmall = diff % 1000;
  const borrow = s1 < s2;
  return make(
    unit,
    `다음을 계산하시오.\n\n$${b1 + b2}\\,\\mathrm{${big}}\\ ${s1}\\,\\mathrm{${small}}-${b2}\\,\\mathrm{${big}}\\ ${s2}\\,\\mathrm{${small}}=\\square$`,
    mixedUnit(outBig, outSmall, big, small),
    borrow
      ? `${small}끼리 뺄 수 없으므로 $1\\,\\mathrm{${big}}$ ${jReul} $1000\\,\\mathrm{${small}}$ ${jRo} 바꿉니다. ${expr(`${s1 + 1000}-${s2}=${outSmall}`)} 이고 ${expr(`${b1 + b2 - 1}-${b2}=${outBig}`)} 이므로 ${mixedUnit(outBig, outSmall, big, small)} 입니다.`
      : `${small}끼리 빼면 ${expr(`${s1}-${s2}=${outSmall}`)}, ${big}끼리 빼면 ${expr(`${b1 + b2}-${b2}=${outBig}`)} 이므로 ${mixedUnit(outBig, outSmall, big, small)} 입니다.`,
  );
}

/** 그림그래프 소재. 원장님: 「학생 말고 다양한 항목으로」(2026-08-22). */
const GRAPH_STUFF = [
  { name: "사과", unit: "개", places: ["마을", "과수원", "농장"] },
  { name: "나무", unit: "그루", places: ["마을", "공원", "농장"] },
  { name: "우유", unit: "개", places: ["반", "모둠", "마을"] },
  { name: "책", unit: "권", places: ["반", "모둠", "학교"] },
  { name: "자전거", unit: "대", places: ["마을", "반", "학교"] },
  { name: "감자", unit: "개", places: ["농장", "마을", "밭"] },
  { name: "어린이", unit: "명", places: ["마을", "반", "모둠"] },
  { name: "연필", unit: "자루", places: ["반", "모둠", "학교"] },
] as const;

/**
 * 소재와 자리를 함께 고른다 — 원장님: 「**학생 말고 다양한 항목**으로」(2026-08-22).
 *
 * 자리를 따로 뽑으면 「과수원의 자전거」 같은 짝이 나온다. 조사도 갈리므로
 * 이름 뒤에는 늘 「수는」을 붙여 «책은/사과는» 이 엇갈리지 않게 한다.
 */
function pictograph(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const labels = ["가", "나", "다"] as const;
  if (unit.section.includes("나타내기")) {
    // 작은 그림이 $0$ 개면 「작은 그림 $0$개」가 답이 된다 — 일의 자리를 비우지 않는다.
    const values = labels.map(
      () => intBetween(rng, 1, 4) * 10 + intBetween(rng, 1, 9),
    );
    const at = intBetween(rng, 0, labels.length - 1);
    const value = values[at]!;
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return make(
      unit,
      `표를 보고 그림그래프로 나타내려고 합니다. 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}입니다. ${labels[at]} ${place}${josa(place, "은", "는")} 큰 그림과 작은 그림을 각각 몇 개 그려야 하는지 쓰시오.`,
      `큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개`,
      `${labels[at]} ${place}의 ${stuff.name} 수는 ${n(value)}${stuff.unit}입니다. ${expr(`${value}=10\\times${tens}+${ones}`)} 이므로 큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개를 그립니다.`,
      fig("table", {
        headers: [place, ...labels],
        rows: [[stuff.name, ...values.map((v) => String(v))]],
      }),
    );
  }
  const step = pick(rng, [2, 5, 10]);
  const counts = labels.map(() => intBetween(rng, 2, 6));
  const at = intBetween(rng, 0, labels.length - 1);
  const count = counts[at]!;
  return make(
    unit,
    `□ 한 칸이 나타내는 ${stuff.name} 수는 ${n(step)}${stuff.unit}입니다. ${labels[at]} ${place}의 ${stuff.name} 수는 몇 ${stuff.unit}인지 쓰시오.`,
    n(count * step),
    `${labels[at]} ${place}${josa(place, "은", "는")} □가 ${n(count)}칸이므로 ${expr(`${step}\\times${count}=${count * step}`)} 입니다.`,
    fig("pictograph", {
      unit: step,
      items: labels.map((label, i) => ({ label, count: counts[i]! })),
    }),
  );
}

export const G3: Record<string, ChapterHandler> = {
  "초3|1-1 덧셈과 뺄셈": addSub,
  "초3|1-2 평면도형": plane,
  "초3|1-3 나눗셈": division,
  "초3|1-4 곱셈": mul31,
  "초3|1-5 길이와 시간": lengthTime,
  "초3|1-6 분수와 소수": fracDec31,
  "초3|2-1 곱셈": mul32,
  "초3|2-2 나눗셈": div32,
  "초3|2-3 원": circle32,
  "초3|2-4 분수": frac32,
  "초3|2-5 들이와 무게": capacity,
  "초3|2-6 그림그래프": pictograph,
};

// ── 난이도 갈래 (D-71) ────────────────────────────────────────────────
//
// 「받아올림이 두 번, 세 번」은 **나열**이다(둘 중 하나면 된다) — 곱이 아니다.
// `addWithCarries` 는 일→십·십→백 두 자리만 세므로 실제로는 늘 두 번이고,
// 그것으로 소단원 조건을 만족한다. 갈래를 넷으로 갈라도 **이 조건은 안 흔든다** —
// 「응용」의 둘째 덧셈·「심화」의 바른 덧셈까지 같은 조건을 걸어 확인한다.

/**
 * 세 자리 덧셈의 받아올림 횟수. `addWithCarries` 와 **같은 셈**이어야 한다 —
 * 일→십 · 십→백 · **백→천** 셋을 다 센다. 둘만 세면 「세 번」이 이 함수에서만
 * 구조적으로 0이 되어, 조건을 재는 쪽과 만드는 쪽이 서로 다른 것을 보게 된다.
 */
function carryCount(a: number, b: number): number {
  const [a2, a1, a0] = digits(a);
  const [b2, b1, b0] = digits(b);
  let carries = 0;
  let c = 0;
  if (a0 + b0 >= 10) {
    carries += 1;
    c = 1;
  }
  if (a1 + b1 + c >= 10) {
    carries += 1;
    c = 1;
  } else {
    c = 0;
  }
  if (a2 + b2 + c >= 10) carries += 1;
  return carries;
}

/**
 * 「응용」의 두 단계 — 처음 수 `base`, 더 많은 만큼 `more`.
 *
 * **두 덧셈이 모두 (세 자리)+(세 자리)** 여야 소단원 안이다. 그래서 첫 덧셈의 합
 * `second` 는 세 자리로 묶는다(네 자리가 되면 둘째 덧셈이 네 자리+세 자리가 된다).
 * 둘째 덧셈의 합은 네 자리여도 좋다 — 그게 「받아올림 세 번」이다.
 * 못 찾으면 **던진다** — 조건을 어긴 문항을 조용히 내보내지 않는다.
 */
function twoStepAdd(rng: Rng): [number, number] {
  for (let k = 0; k < 240; k += 1) {
    const [base, more] = addWithCarries(rng, 2, 2);
    const second = base + more;
    if (second > 999) continue;
    if (carryCount(base, second) < 2) continue;
    return [base, more];
  }
  throw new Error("응용 두 단계 수를 못 만들었습니다");
}

/** 자릿수 두 개를 맞바꾼다($278\to287$). 백의 자리가 $0$ 이 되면 그대로 돌려준다(호출자가 버린다). */
function swapDigits(value: number, rng: Rng): number {
  const d = digits(value);
  const [i, j] = pick(rng, [
    [0, 1],
    [1, 2],
    [0, 2],
  ] as const);
  const out = [...d];
  out[i] = d[j]!;
  out[j] = d[i]!;
  if (out[0] === 0) return value;
  return out[0]! * 100 + out[1]! * 10 + out[2]!;
}

/** 「심화」의 역산 — 어떤 수 · 바르게 더할 수 · 잘못 더한 수 · 잘못된 합 · 바른 합. */
function reverseAdd(rng: Rng): {
  some: number;
  right: number;
  wrong: number;
  wrongSum: number;
  rightSum: number;
} {
  for (let k = 0; k < 240; k += 1) {
    const [some, right] = addWithCarries(rng, 2, 3);
    const wrong = swapDigits(right, rng);
    if (wrong === right) continue;
    const rightSum = some + right;
    const wrongSum = some + wrong;
    // 어떤 수도 잘못된 합도 세 자리여야 학생이 아는 범위 안에서 되짚을 수 있다.
    if (some < 100 || wrongSum < 100 || wrongSum > 999) continue;
    // **잘못 더한 쪽도** 받아올림이 두 번이라야 한다. `addWithCarries` 는 바른 쪽만
    // 보장하는데, 학생이 실제로 푸는 것은 그 합을 되짚는 뺄셈이다 — 여기가 헐거우면
    // 심화인데 받아내림 없는 뺄셈이 나온다(실측: 씨앗 1 에서 $196+342$, 받아올림 0번).
    if (carryCount(some, wrong) < 2) continue;
    return { some, right, wrong, wrongSum, rightSum };
  }
  throw new Error("심화 역산 수를 못 만들었습니다");
}

/** 「기본」 — 두 갈래를 합치는 문장. 조사는 낱말마다 `josa()` 가 정한다. */
const ADD_PAIRS = [
  { left: "남학생", right: "여학생", unit: "명", whole: "학생" },
  { left: "사과", right: "배", unit: "개", whole: "과일" },
  { left: "동화책", right: "위인전", unit: "권", whole: "책" },
  { left: "빨간 색종이", right: "파란 색종이", unit: "장", whole: "색종이" },
  { left: "어른", right: "어린이", unit: "명", whole: "사람" },
  { left: "찹쌀떡", right: "송편", unit: "개", whole: "떡" },
] as const;

/** 「응용」 — 한쪽이 다른 쪽보다 더 많은 두 단계. */
const ADD_PEOPLE = [
  { a: "형", b: "동생", thing: "딱지", unit: "장" },
  { a: "지수", b: "현우", thing: "구슬", unit: "개" },
  { a: "서연", b: "도윤", thing: "붙임딱지", unit: "장" },
  { a: "준서", b: "윤아", thing: "우표", unit: "장" },
  { a: "민재", b: "하린", thing: "사탕", unit: "개" },
] as const;

/** 연산 — 식 그대로. 지금 기본 문항과 같은 모양이다. */
function add3Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 2, 3);
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}+${b}=\\square$`,
    n(a + b),
    expr(`${a}+${b}=${a + b}`),
  );
}

/** 기본 — 문장 한 겹. 식을 학생이 세운다(그래서 세로셈 그림을 붙이지 않는다). */
function add3Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 2, 3);
  const p = pick(rng, ADD_PAIRS);
  return make(
    unit,
    `${p.left}${josa(p.left, "은", "는")} ${n(a)}${p.unit}이고, ${p.right}${josa(p.right, "은", "는")} ${n(b)}${p.unit}입니다. ${p.whole}${josa(p.whole, "은", "는")} 모두 몇 ${p.unit}입니까?`,
    n(a + b),
    `${p.left} 수와 ${p.right} 수를 더합니다. ${expr(`${a}+${b}=${a + b}`)} 이므로 모두 ${n(a + b)}${p.unit}입니다.`,
  );
}

/** 응용 — 두 단계. 「더 많은 쪽」을 먼저 구하고 둘을 합친다. */
function add3TwoStep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [base, more] = twoStepAdd(rng);
  const second = base + more;
  const total = base + second;
  const p = pick(rng, ADD_PEOPLE);
  return make(
    unit,
    `${p.a}${josa(p.a, "은", "는")} ${p.thing}${josa(p.thing, "을", "를")} ${n(base)}${p.unit} 모았고, ${p.b}${josa(p.b, "은", "는")} ${p.a}보다 ${n(more)}${p.unit} 더 모았습니다. 두 사람이 모은 ${p.thing}${josa(p.thing, "은", "는")} 모두 몇 ${p.unit}입니까?`,
    n(total),
    `먼저 ${p.b}${josa(p.b, "이", "가")} 모은 수를 구합니다. ${expr(`${base}+${more}=${second}`)} 이므로 ${n(second)}${p.unit}입니다. 두 사람이 모은 수를 더하면 ${expr(`${base}+${second}=${total}`)} 이므로 모두 ${n(total)}${p.unit}입니다.`,
  );
}

/**
 * 심화 — 역산. 잘못 더한 수는 바른 수의 **자릿수를 맞바꾼** 것이라 그럴듯하다.
 *
 * ⚠️ 해설이 **세 자리 뺄셈**을 쓴다. 이 소단원(`1-1-2`, orderIndex 132)은 뺄셈
 * `1-1-3`(133)보다 **앞**이다. 그래도 두는 근거(리드 판단 2026-08-22): 받아내림은
 * 두 자리로 초2에서 배웠고 세 자리가 1-1-3 의 새 내용일 뿐이며, 교재들도 「어떤 수」
 * 유형을 덧셈 차시의 심화에 둔다. **갈릴 수 있는 판단이라 원장님 확정 자료에 표기해
 * 여쭙는다** — 「덧셈만으로」로 확정되면 역산 대신 다른 축을 찾아야 한다.
 */
function add3Reverse(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = reverseAdd(rng);
  return make(
    unit,
    `어떤 수에 $${r.right}$ 만큼 더해야 할 것을 잘못하여 $${r.wrong}$ 만큼 더했더니 합이 $${r.wrongSum}$ 입니다. 바르게 계산한 값은 얼마입니까?`,
    n(r.rightSum),
    `잘못 더한 식에서 어떤 수를 먼저 구합니다. ${expr(`${r.wrongSum}-${r.wrong}=${r.some}`)} 이므로 어떤 수는 ${n(r.some)} 입니다. 바르게 계산하면 ${expr(`${r.some}+${r.right}=${r.rightSum}`)} 입니다.`,
  );
}

// ── 1-1 덧셈과 뺄셈 나머지 세 소단원 (D-72 확대) ────────────────────────
//
// 축은 D-72 그대로: 1단 절차 한 번 · 2단 식을 스스로 세움 · 3단 두 단계(중간값)
// · 4단 역산(「잘못 계산했더니」·「전체가 ~일 때」).
//
// 파일럿(1-1-2)과 **틀을 겹치지 않게** 짰다 — 같은 대단원이라 시험지에 나란히 나간다.
//   · 2단: 파일럿은 「두 갈래를 합친다」, 여기는 「가진 것 + 더 얻은 것」(1-1-1) ·
//     「있던 것에서 덜어낸다」(1-1-3·4)
//   · 3단: 파일럿은 「한쪽이 더 많다」, 여기는 「세 수」(1-1-1) · 「두 번 덜어낸다」(뺄셈)
//   · 4단: 파일럿은 「잘못 더했더니」 하나, 여기는 「전체가 ~일 때」를 함께 돌린다

/** 세 자리 뺄셈의 받아내림 횟수. `subWithBorrows` 와 **같은 셈**이어야 한다. */
function borrowCount(a: number, b: number): number {
  const [, a1, a0] = digits(a);
  const [, b1, b0] = digits(b);
  let borrows = 0;
  let x0 = a0;
  let x1 = a1;
  if (x0 < b0) {
    borrows += 1;
    x0 += 10;
    x1 -= 1;
  }
  if (x1 < b1) borrows += 1;
  return borrows;
}

/**
 * 1단(연산) 지면 형식 — 여덟 가지. 「식·값 그대로」는 지키되 **묻는 말투와 조판**을 돌린다.
 *
 * 한 소단원이 늘 똑같은 한 줄이면 학습지로 못 쓴다(원장님 「너무 단조로우면 재미도
 * 학습의욕도 떨어짐」). 수 뒤에 조사가 붙지 않는 말투만 골랐다.
 */
const CALC_FORM_COUNT = 8;

function calcForm(
  unit: UnitSeed,
  form: number,
  a: number,
  b: number,
  op: "+" | "-",
  result: number,
): ElemProblem {
  const sign = op === "+" ? "+" : "-";
  const eq = `$${a}${sign}${b}=\\square$`;
  const solution = expr(`${a}${sign}${b}=${result}`);
  const word = op === "+" ? "합" : "차";
  const wordJosa = josa(word, "을", "를");
  switch (form % CALC_FORM_COUNT) {
    // 식과 세로셈을 같이 내지 않는다 — 같은 계산이 두 번, 답 칸도 둘이 된다(원장님 2026-10-20 지면 전수 검사).
    // «세로셈으로 계산하시오»도 식 하나로 낸다 — 세로셈 그림만 남기면 발문 글자가 씨앗마다 같아진다.
    case 0:
      return make(unit, `다음을 계산하시오.\n\n${eq}`, n(result), solution);
    case 1:
      return make(unit, `세로셈으로 계산하시오.\n\n${eq}`, n(result), solution);
    case 2:
      return make(unit, eq, n(result), solution);
    case 3:
      return make(
        unit,
        `□ 안에 알맞은 수를 써넣으시오.\n\n${eq}`,
        n(result),
        solution,
      );
    case 4:
      return make(
        unit,
        `두 수의 ${word}${wordJosa} 구하시오.\n\n$${a}$,  $${b}$`,
        n(result),
        solution,
      );
    case 5:
      return make(
        unit,
        `$${a}$ 에서 $${b}$ 만큼 ${op === "+" ? "더한" : "뺀"} 값을 구하시오.`,
        n(result),
        solution,
      );
    case 6:
      return make(unit, `계산 결과를 구하시오.\n\n${eq}`, n(result), solution);
    default:
      return make(unit, `다음 식을 계산하시오.\n\n${eq}`, n(result), solution);
  }
}

/** 2단(기본) — 「가지고 있던 것에 더 얻는다」. 파일럿의 「두 갈래 합치기」와 다른 틀이다. */
const GAIN_STORY = [
  { who: "형", thing: "딱지", unit: "장", verb: "얻었습니다" },
  { who: "지수", thing: "구슬", unit: "개", verb: "얻었습니다" },
  { who: "도윤", thing: "붙임딱지", unit: "장", verb: "모았습니다" },
  { who: "서연", thing: "우표", unit: "장", verb: "모았습니다" },
  { who: "민재", thing: "사탕", unit: "개", verb: "받았습니다" },
  { who: "하린", thing: "색종이", unit: "장", verb: "받았습니다" },
  { who: "준서", thing: "구슬", unit: "개", verb: "모았습니다" },
  { who: "윤아", thing: "스티커", unit: "장", verb: "받았습니다" },
] as const;

/** 2단(기본) — 「있던 것에서 덜어낸다」. 뺄셈 두 소단원이 함께 쓴다. */
const SPEND_STORY = [
  { who: "형", thing: "딱지", unit: "장", verb: "주었습니다" },
  { who: "지수", thing: "구슬", unit: "개", verb: "주었습니다" },
  { who: "도윤", thing: "색종이", unit: "장", verb: "썼습니다" },
  { who: "서연", thing: "붙임딱지", unit: "장", verb: "썼습니다" },
  { who: "민재", thing: "사탕", unit: "개", verb: "나누어 주었습니다" },
  { who: "하린", thing: "우표", unit: "장", verb: "나누어 주었습니다" },
  { who: "준서", thing: "쿠키", unit: "개", verb: "먹었습니다" },
  { who: "윤아", thing: "감", unit: "개", verb: "먹었습니다" },
] as const;

/** 3단(응용) — 세 수의 합. 소재가 «세 자리»여야 자연스럽다. */
const THREE_PLACE = [
  { place: "가 상자", b: "나 상자", c: "다 상자", thing: "구슬", unit: "개" },
  { place: "첫째 날", b: "둘째 날", c: "셋째 날", thing: "줄넘기", unit: "번" },
  { place: "가 농장", b: "나 농장", c: "다 농장", thing: "사과", unit: "개" },
  { place: "가 반", b: "나 반", c: "다 반", thing: "붙임딱지", unit: "장" },
  { place: "가 마을", b: "나 마을", c: "다 마을", thing: "나무", unit: "그루" },
  { place: "월요일", b: "화요일", c: "수요일", thing: "종이컵", unit: "개" },
  { place: "가 서점", b: "나 서점", c: "다 서점", thing: "공책", unit: "권" },
  { place: "가 창고", b: "나 창고", c: "다 창고", thing: "벽돌", unit: "장" },
] as const;

/** 3단(응용) — 두 번 덜어낸다. 뺄셈 두 소단원이 함께 쓴다. */
const SPEND_TWICE = [
  { who: "형", thing: "딱지", unit: "장" },
  { who: "지수", thing: "구슬", unit: "개" },
  { who: "도윤", thing: "색종이", unit: "장" },
  { who: "서연", thing: "우표", unit: "장" },
  { who: "민재", thing: "사탕", unit: "개" },
  { who: "하린", thing: "붙임딱지", unit: "장" },
  { who: "준서", thing: "쿠키", unit: "개" },
  { who: "윤아", thing: "스티커", unit: "장" },
] as const;

// ── 1-1-1 받아올림이 없는·한 번 있는 (세 자리)+(세 자리) ──

function sub111Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const heavy = intBetween(rng, 0, 1); // 받아올림 0번 / 1번 — 소단원 이름이 둘 다 허용한다
  const [a, b] = addWithCarries(rng, heavy, heavy);
  return calcForm(
    unit,
    intBetween(rng, 0, CALC_FORM_COUNT - 1),
    a,
    b,
    "+",
    a + b,
  );
}

function sub111Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, intBetween(rng, 0, 1), 1);
  const s = pick(rng, GAIN_STORY);
  return make(
    unit,
    `${s.who}${josa(s.who, "은", "는")} ${s.thing}${josa(s.thing, "을", "를")} ${n(a)}${s.unit} 가지고 있었습니다. 오늘 ${n(b)}${s.unit}${josa(s.unit, "을", "를")} 더 ${s.verb}. ${s.who}${josa(s.who, "이", "가")} 가진 ${s.thing}${josa(s.thing, "은", "는")} 모두 몇 ${s.unit}입니까?`,
    n(a + b),
    `가지고 있던 수에 더 얻은 수를 더합니다. ${expr(`${a}+${b}=${a + b}`)} 이므로 모두 ${n(a + b)}${s.unit}입니다.`,
  );
}

/** 세 수의 합 — 두 덧셈이 **모두** 소단원 범위(받아올림 1번 이하, 세 자리)여야 한다. */
function threeSum(rng: Rng): [number, number, number] {
  for (let k = 0; k < 240; k += 1) {
    const [a, b] = addWithCarries(rng, 0, 1);
    const mid = a + b;
    // 셋째 수도 세 자리여야 하므로 자리가 $101$ 은 남아 있어야 한다. 이 문턱을 `999`
    // 로 두면 `intBetween(101, 999-mid)` 범위가 **뒤집혀 던진다**(실측: 씨앗 400개 중 7).
    // 가드로 거르지 말고 뽑는 범위를 막는다 — `addWithCarries` 주석과 같은 태도.
    if (mid > 898) continue;
    const c = intBetween(rng, 101, 999 - mid);
    if (carryCount(mid, c) > 1) continue;
    return [a, b, c];
  }
  throw new Error("세 수의 합을 못 만들었습니다");
}

function sub111Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, c] = threeSum(rng);
  const s = pick(rng, THREE_PLACE);
  const mid = a + b;
  return make(
    unit,
    `${s.place}에 ${s.thing}${josa(s.thing, "이", "가")} ${n(a)}${s.unit}, ${s.b}에 ${n(b)}${s.unit}, ${s.c}에 ${n(c)}${s.unit} 있습니다. ${s.thing}${josa(s.thing, "은", "는")} 모두 몇 ${s.unit}입니까?`,
    n(mid + c),
    `먼저 두 곳을 더합니다. ${expr(`${a}+${b}=${mid}`)} 입니다. 여기에 나머지를 더하면 ${expr(`${mid}+${c}=${mid + c}`)} 이므로 모두 ${n(mid + c)}${s.unit}입니다.`,
  );
}

/**
 * 4단(심화) — 역산 두 갈래. D-72 가 든 두 말투를 **둘 다** 돌린다.
 *   ㉠ 「전체가 ~일 때」 — 합과 한 수를 알고 다른 수를 구한다
 *   ㉡ 「잘못 계산했더니」 — 파일럿과 같은 자릿수 맞바꿈
 * 되짚는 뺄셈은 D-72 ⑷ 로 허용됐다(받아내림은 초2 기학습).
 */
function sub111Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = pick(rng, GAIN_STORY);
  // ⚠️ 예전에는 **상자 둘**이라 「전체 $-$ 아는 쪽」 뺄셈 **한 번**이었다.
  //    같은 소단원 응용이 세 곳의 합(덧셈 두 번)이라 사다리가 뒤집혀 있었다.
  //    상자를 셋으로 늘려 **아는 둘을 먼저 더한 뒤** 되짚는다.
  if (intBetween(rng, 0, 1) === 0) {
    const [a, c] = addWithCarries(rng, intBetween(rng, 0, 1), 1);
    const known = a + c;
    // ⚠️ 셋째 상자는 **받아올림이 하나도 없게** 자릿수마다 골라 뽑는다.
    //    합이 네 자리가 되거나 받아올림이 두 번이면 소단원(«받아올림이 없는, 한 번 있는»)
    //    밖이다 — 문턱으로 걸러 내지 말고 **뽑는 범위**에서 막는다.
    const kd = [
      Math.floor(known / 100) % 10,
      Math.floor(known / 10) % 10,
      known % 10,
    ];
    const b =
      intBetween(rng, 1, Math.max(1, 9 - kd[0]!)) * 100 +
      intBetween(rng, 0, 9 - kd[1]!) * 10 +
      intBetween(rng, 0, 9 - kd[2]!);
    const total = known + b;
    return makeDeep(
      unit,
      `${s.thing} 상자 세 개에 든 ${s.thing}${josa(s.thing, "은", "는")} 모두 ${n(total)}${s.unit}입니다. ` +
        `첫째 상자에 ${n(a)}${s.unit}, 둘째 상자에 ${n(c)}${s.unit}${josa(s.unit, "이", "가")} 들어 있다면 ` +
        `셋째 상자에는 몇 ${s.unit}${josa(s.unit, "이", "가")} 들어 있습니까?`,
      n(b),
      [
        `아는 두 상자를 먼저 더합니다. ${expr(`${a}+${c}=${known}`)} 입니다.`,
        `전체에서 덜어 내면 ${expr(`${total}-${known}=${b}`)} 이므로 ${n(b)}${s.unit}입니다.`,
      ],
    );
  }
  const r = reverseAddLight(rng);
  return make(
    unit,
    `어떤 수에 $${r.right}$ 만큼 더해야 할 것을 잘못하여 $${r.wrong}$ 만큼 더했더니 합이 $${r.wrongSum}$ 입니다. 바르게 계산한 값은 얼마입니까?`,
    n(r.rightSum),
    `잘못 더한 식에서 어떤 수를 먼저 구합니다. ${expr(`${r.wrongSum}-${r.wrong}=${r.some}`)} 이므로 어떤 수는 ${n(r.some)} 입니다. 바르게 계산하면 ${expr(`${r.some}+${r.right}=${r.rightSum}`)} 입니다.`,
  );
}

/** 1-1-1 용 역산 — 파일럿과 달리 **받아올림 1번 이하**로 묶는다. */
function reverseAddLight(rng: Rng): {
  some: number;
  right: number;
  wrong: number;
  wrongSum: number;
  rightSum: number;
} {
  for (let k = 0; k < 240; k += 1) {
    const [some, right] = addWithCarries(rng, 0, 1);
    const wrong = swapDigits(right, rng);
    if (wrong === right) continue;
    const rightSum = some + right;
    const wrongSum = some + wrong;
    if (some < 100 || wrongSum < 100 || wrongSum > 999 || rightSum > 999)
      continue;
    if (carryCount(some, wrong) > 1) continue;
    return { some, right, wrong, wrongSum, rightSum };
  }
  throw new Error("1-1-1 역산 수를 못 만들었습니다");
}

// ── 1-1-3 받아내림이 없는·한 번 있는 · 1-1-4 받아내림이 두 번 있는 ──

function subCalcOf(minB: number, maxB: number) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const lo = minB === maxB ? minB : intBetween(rng, minB, maxB);
    const [a, b] = subWithBorrows(rng, lo, lo);
    return calcForm(
      unit,
      intBetween(rng, 0, CALC_FORM_COUNT - 1),
      a,
      b,
      "-",
      a - b,
    );
  };
}

function subWordOf(minB: number, maxB: number) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const [a, b] = subWithBorrows(rng, minB, maxB);
    const s = pick(rng, SPEND_STORY);
    return make(
      unit,
      `${s.who}${josa(s.who, "은", "는")} ${s.thing}${josa(s.thing, "을", "를")} ${n(a)}${s.unit} 가지고 있었습니다. 그중 ${n(b)}${s.unit}${josa(s.unit, "을", "를")} ${s.verb}. 남은 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
      n(a - b),
      `가지고 있던 수에서 덜어낸 수를 뺍니다. ${expr(`${a}-${b}=${a - b}`)} 이므로 ${n(a - b)}${s.unit} 남습니다.`,
    );
  };
}

/** 두 번 덜어낸다 — 두 뺄셈이 **모두** 소단원 범위여야 한다. */
function twoStepSub(
  rng: Rng,
  minB: number,
  maxB: number,
): [number, number, number] {
  for (let k = 0; k < 240; k += 1) {
    const [a, b] = subWithBorrows(rng, minB, maxB);
    const mid = a - b;
    if (mid < 210) continue;
    // 둘째 뺄셈도 **(세 자리)−(세 자리)** 여야 소단원 안이다 — 두 자리를 빼면 딴 소단원이다.
    const c = intBetween(rng, 100, mid - 10);
    const bc = borrowCount(mid, c);
    if (bc < minB || bc > maxB) continue;
    return [a, b, c];
  }
  throw new Error("두 번 빼기 수를 못 만들었습니다");
}

function subApplyOf(minB: number, maxB: number) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const [a, b, c] = twoStepSub(rng, minB, maxB);
    const s = pick(rng, SPEND_TWICE);
    const mid = a - b;
    return make(
      unit,
      `${s.who}${josa(s.who, "은", "는")} ${s.thing}${josa(s.thing, "을", "를")} ${n(a)}${s.unit} 가지고 있었습니다. 어제 ${n(b)}${s.unit}${josa(s.unit, "을", "를")} 쓰고, 오늘 ${n(c)}${s.unit}${josa(s.unit, "을", "를")} 더 썼습니다. 남은 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
      n(mid - c),
      `먼저 어제 쓰고 남은 수를 구합니다. ${expr(`${a}-${b}=${mid}`)} 입니다. 여기서 오늘 쓴 수를 빼면 ${expr(`${mid}-${c}=${mid - c}`)} 이므로 ${n(mid - c)}${s.unit} 남습니다.`,
    );
  };
}

/** 뺄셈의 역산 — 「잘못 뺐더니」와 「전체가 ~일 때」. */
function subDeepOf(minB: number, maxB: number) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const s = pick(rng, SPEND_TWICE);
    if (intBetween(rng, 0, 1) === 0) {
      const [a, b] = subWithBorrows(rng, minB, maxB);
      const diff = a - b;
      return make(
        unit,
        `${s.who}${josa(s.who, "은", "는")} ${s.thing}${josa(s.thing, "을", "를")} 몇 ${s.unit} 가지고 있었습니다. 그중 ${n(b)}${s.unit}${josa(s.unit, "을", "를")} 쓰고 나니 ${n(diff)}${s.unit} 남았습니다. 처음에 가지고 있던 ${s.thing}${josa(s.thing, "은", "는")} 몇 ${s.unit}입니까?`,
        n(a),
        `남은 수에 쓴 수를 도로 더합니다. ${expr(`${diff}+${b}=${a}`)} 이므로 처음에 ${n(a)}${s.unit} 가지고 있었습니다.`,
      );
    }
    const r = reverseSub(rng, minB, maxB);
    return make(
      unit,
      `어떤 수에서 $${r.right}$ 만큼 빼야 할 것을 잘못하여 $${r.wrong}$ 만큼 뺐더니 결과가 $${r.wrongDiff}$ 입니다. 바르게 계산한 값은 얼마입니까?`,
      n(r.rightDiff),
      `잘못 뺀 식에서 어떤 수를 먼저 구합니다. ${expr(`${r.wrongDiff}+${r.wrong}=${r.some}`)} 이므로 어떤 수는 ${n(r.some)} 입니다. 바르게 계산하면 ${expr(`${r.some}-${r.right}=${r.rightDiff}`)} 입니다.`,
    );
  };
}

function reverseSub(
  rng: Rng,
  minB: number,
  maxB: number,
): {
  some: number;
  right: number;
  wrong: number;
  wrongDiff: number;
  rightDiff: number;
} {
  for (let k = 0; k < 240; k += 1) {
    const [some, right] = subWithBorrows(rng, minB, maxB);
    const wrong = swapDigits(right, rng);
    if (wrong === right || wrong >= some) continue;
    const rightDiff = some - right;
    const wrongDiff = some - wrong;
    if (rightDiff < 100 || wrongDiff < 100) continue;
    const bc = borrowCount(some, wrong);
    if (bc < minB || bc > maxB) continue;
    return { some, right, wrong, wrongDiff, rightDiff };
  }
  throw new Error("뺄셈 역산 수를 못 만들었습니다");
}

// ── 1-2 평면도형 (D-72 확대) ──────────────────────────────────────────
//
// ★ **도형 대단원의 4단 축 — 뒤 학년 도형 확대는 이 넷을 그대로 인용한다** (리드 승인 2026-08-23)
//   1단 절차 한 번  — 그림을 보고 **한 번에** 이름·기호를 답한다
//   2단 스스로 세움 — 조건이 **문장으로만** 주어지고 그림에 대어 고른다
//   3단 두 단계     — 세고 나서 그 수로 다시 셈하거나, 두 개념을 결합한다
//   4단 조건 조합   — D-72 가 4단에 적은 「역산·**조건 조합**」 중 **조건 조합** 쪽
//
// 왜 4단이 역산이 아니라 조건 조합인가 — 도형에는 **되짚을 셈이 없다.** 다만 길이가
// 딸린 소단원(1-2-4 직사각형·1-2-5 정사각형)은 「네 변의 합 → 한 변·세로」로 역산이
// 성립하므로 거기서는 역산을 쓴다. 길이가 없는 소단원에서 억지로 역산을 만들지 말 것.
//
// 그리고 1단 갈래는 **표준 생성기를 그대로 부르지 않는다.** 말투 풀이 표준과 같으면
// 같은 발문이 시험지에 둘 나오고(실측: 1-2-5·1-2-1 에서 실제로 났다) 변형 공간도
// 표준 것 그대로라 8+ 요구가 사실상 미달이 된다.
//
// 답의 «참»은 언제나 **그림**에서 온다 — 삼각형은 3×3 점 안의 것을 전부 세어 정수
// 내적으로 직각을 가르고(`TRI_POOLS`), 사각형은 칸 수로 가른다. 이름표만 바꿔 붙이지 않는다.

const LINE_LETTERS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ"] as const;

/** 점만 찍힌 격자. 「이을 수 있는 선분」을 세는 문항에 쓴다 — 세 점이 한 줄에 서지 않게 골랐다. */
const DOT_LAYOUTS: Pt[][] = [
  [
    [0, 2],
    [2, 0],
    [4, 2],
  ],
  [
    [0, 0],
    [3, 1],
    [1, 3],
  ],
  [
    [1, 0],
    [0, 3],
    [4, 2],
  ],
  [
    [0, 1],
    [2, 3],
    [4, 0],
  ],
  [
    [0, 0],
    [3, 0],
    [0, 3],
    [3, 3],
  ],
  [
    [0, 2],
    [2, 0],
    [4, 2],
    [2, 3],
  ],
  [
    [0, 0],
    [4, 1],
    [1, 3],
    [3, 3],
  ],
  [
    [0, 1],
    [2, 0],
    [4, 3],
    [1, 3],
  ],
];

function dotsOnly(
  layout: Pt[],
  letters: readonly string[],
): Record<string, unknown> {
  const cols = Math.max(...layout.map((p) => p[0]));
  const rows = Math.max(...layout.map((p) => p[1]));
  return fig("pointGrid", {
    cols,
    rows,
    dots: layout.map((p, i) => ({
      c: p[0],
      r: p[1],
      label: letters[i] ?? "",
      side: "up",
    })),
    lines: [],
  });
}

// ── 1-2-1 선분, 반직선, 직선 ──

/**
 * 1단 — 정의를 읽고 이름을 댄다. 한 걸음이면 끝난다.
 *
 * ⚠️ 기본 문항 `lineNames` 를 **그대로 부르면 안 된다.** 말투가 셋뿐이라 소금이 달라도
 * 씨앗에 따라 같은 발문이 나온다(실측: 씨앗 16개 중 2). 갈래 쪽 말투를 따로 둔다.
 */
function line121Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const i = intBetween(rng, 0, LINE_LETTERS.length - 2);
  const a = LINE_LETTERS[i]!;
  const b = LINE_LETTERS[i + 1]!;
  const kind = pick(rng, ["선분", "반직선", "직선"] as const);
  if (kind === "선분") {
    return make(
      unit,
      `점 ${a}과 점 ${b}을 곧게 이었습니다. 이 선의 이름을 쓰시오.`,
      `선분 ${a}${b}`,
      `두 점을 곧게 이은 선은 선분입니다. 점 ${a}과 점 ${b}을 이었으므로 선분 ${a}${b}입니다.`,
    );
  }
  if (kind === "반직선") {
    return make(
      unit,
      `점 ${a}에서 출발하여 점 ${b}쪽으로 끝없이 그은 곧은 선의 이름을 쓰시오.`,
      `반직선 ${a}${b}`,
      `한쪽으로만 끝없이 늘인 곧은 선은 반직선입니다. 출발한 점을 먼저 읽어 반직선 ${a}${b}입니다.`,
    );
  }
  return make(
    unit,
    `점 ${a}과 점 ${b}을 지나면서 양쪽 끝이 없는 곧은 선의 이름을 쓰시오.`,
    `직선 ${a}${b}`,
    `양쪽으로 끝없이 늘인 곧은 선은 직선입니다. 두 점을 지나므로 직선 ${a}${b}입니다.`,
  );
}

/** 2단 — 「늘이면 무엇이 되는가」. 그림의 선분을 조건대로 **바꿔** 판단한다(한 겹). */
function line121Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const i = intBetween(rng, 0, LINE_LETTERS.length - 2);
  const a = LINE_LETTERS[i]!;
  const b = LINE_LETTERS[i + 1]!;
  const left = intBetween(rng, 0, 1);
  const both = intBetween(rng, 0, 1) === 0;
  return make(
    unit,
    both
      ? `선분 ${a}${b}을 **양쪽으로** 끝없이 늘이면 어떤 선이 되는지 이름을 쓰시오.`.replace(
          /\*\*/g,
          "",
        )
      : `선분 ${a}${b}을 점 ${a} 쪽으로만 끝없이 늘이면 어떤 선이 되는지 이름을 쓰시오.`,
    both ? `직선 ${a}${b}` : `반직선 ${b}${a}`,
    both
      ? `선분을 양쪽으로 끝없이 늘인 곧은 선이 직선입니다.`
      : `한쪽으로만 끝없이 늘이면 반직선입니다. 늘이지 않은 점 ${b}에서 시작하므로 반직선 ${b}${a}입니다.`,
    fig("pointGrid", {
      cols: 6,
      rows: 2,
      dots: [
        { c: left, r: 1, label: a, side: "up" },
        { c: left + 5, r: 1, label: b, side: "up" },
      ],
      lines: [
        [
          [left, 1],
          [left + 5, 1],
        ],
      ],
    }),
  );
}

/** 3단 — 점의 수를 세고, 그 수로 **선분의 수**를 구한다(두 단계). */
function line121Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const layout = pick(rng, DOT_LAYOUTS);
  const k = layout.length;
  const letters = LINE_LETTERS.slice(0, k);
  const segs = (k * (k - 1)) / 2;
  return make(
    unit,
    pick(rng, [
      `그림의 점 중 두 점을 이어 그을 수 있는 선분은 모두 몇 개인지 쓰시오.`,
      `점을 두 개 고를 때마다 선분이 하나 생깁니다. 그림에서 생기는 선분은 모두 몇 개인지 쓰시오.`,
      `그림의 점을 빠짐없이 두 개씩 짝지어 선분을 그었습니다. 선분은 모두 몇 개인지 쓰시오.`,
      `그림의 점을 이어 그을 수 있는 선분의 개수를 구하시오.`,
      `곧게 이은 선을 선분이라 합니다. 그림의 점으로 그을 수 있는 선분은 몇 개인지 쓰시오.`,
      `그림에 찍힌 점을 두 개씩 이어 선분을 그으려고 합니다. 선분은 모두 몇 개 그을 수 있는지 쓰시오.`,
      `그림의 점들을 이어 만들 수 있는 선분의 수를 쓰시오.`,
      `두 점을 곧게 이은 선을 선분이라고 합니다. 그림에서 그을 수 있는 선분은 모두 몇 개인지 쓰시오.`,
    ]),
    n(segs),
    `점이 ${n(k)}개이고, 한 점에서 나머지 ${n(k - 1)}개의 점으로 선분을 그을 수 있습니다. ${expr(`${k}\\times${k - 1}=${k * (k - 1)}`)} 인데 같은 선분을 두 번씩 센 것이므로 ${expr(`${k * (k - 1)}\\div2=${segs}`)} 개입니다.`,
    dotsOnly(layout, letters),
  );
}

/** 4단 — 선분과 반직선을 **함께** 센다(조건 조합). 반직선은 방향이 있어 두 배다. */
function line121Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 예전에는 「반직선의 수 $-$ 선분의 수」였다 — 두 번 세고 빼는 세 걸음인데, 그 차는
  //    늘 «선분의 수»와 같아서(반직선 = 선분의 두 배) **실은 한 가지만 세면 된다.**
  //    게다가 역산도 조건 조합도 없다. 이제 **점을 하나 더 찍는 가정**을 얹는다 —
  //    새 점은 기존 점마다 선분 하나를 더 만든다(조건 + 두 걸음).
  const layout = pick(rng, DOT_LAYOUTS);
  const k = layout.length;
  const segs = (k * (k - 1)) / 2;
  return makeDeep(
    unit,
    pick(rng, [
      `그림의 점을 이어 선분을 모두 그었습니다. 여기에 점을 하나 더 찍고 다시 두 점을 잇는 선분을 모두 그으면 선분은 모두 몇 개가 되는지 쓰시오.`,
      `그림의 점으로 그을 수 있는 선분을 모두 그었습니다. 점 하나를 더 찍어 같은 방법으로 다시 그으면 선분은 모두 몇 개인지 쓰시오.`,
      `그림에 점을 하나 더 찍으려고 합니다. 그 뒤 두 점을 잇는 선분을 모두 그으면 선분은 모두 몇 개가 되는지 쓰시오.`,
      `그림의 점에 점 하나를 더 보태고 두 점씩 이어 선분을 모두 그으면 선분의 수는 몇 개인지 쓰시오.`,
      `그림처럼 점이 놓여 있습니다. 점을 하나 더 놓은 다음 두 점을 잇는 선분을 빠짐없이 그으면 선분은 몇 개인지 쓰시오.`,
      `그림의 점들 옆에 점을 하나 더 찍었습니다. 이제 두 점을 잇는 선분을 모두 그으면 선분은 모두 몇 개인지 쓰시오.`,
      `그림의 점에 새 점 하나를 더한 뒤, 두 점씩 짝지어 선분을 모두 그었습니다. 그은 선분은 모두 몇 개인지 쓰시오.`,
      `점을 하나 더 찍어 그림보다 점이 하나 많아졌습니다. 두 점을 잇는 선분을 모두 그으면 몇 개인지 쓰시오.`,
    ]),
    n(segs + k),
    [
      `선분은 두 점의 짝마다 하나이므로 지금은 ` +
        `${expr(`${k}\\times${k - 1}\\div2=${segs}`)} 개입니다.`,
      `점을 하나 더 찍으면 그 점과 원래 점 ${n(k)}개를 잇는 선분이 ${n(k)}개 더 생기므로 ` +
        `${expr(`${segs}+${k}=${segs + k}`)} 개입니다.`,
    ],
    dotsOnly(layout, LINE_LETTERS.slice(0, k)),
  );
}

// ── 1-2-2 각, 직각 알아보기 ──

// 1단(연산) 갈래는 기본 문항 함수를 **그대로 부르지 않고** 따로 짠다.
// 기본 함수(`rightAnglePick` 등)의 말투 풀은 셋뿐이라 변형 공간이 모자라는데,
// 거기를 넓히면 **갈래 없는 기본 경로의 산출물까지 바뀐다.** 갈래 쪽만 넓힌다.

function angle122Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const row = angleRow(rng, count, 1);
  const ask = pick(rng, [
    `직각인 각은 어느 것인지 기호를 쓰시오.`,
    `직각을 하나 골라 그 기호를 쓰시오.`,
    `직각에 해당하는 각의 기호를 쓰시오.`,
    `각의 크기가 직각인 것의 기호를 쓰시오.`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}`,
    row.rightLabels[0]!,
    `삼각자의 직각 부분을 대었을 때 꼭 맞는 각은 ${row.rightLabels[0]!} 입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 각 여러 개를 늘어놓고 **직각인 것의 수**를 함께 돌려준다. */
function angleRow(rng: Rng, count: number, rightCount: number) {
  // 4개일 때도 간격 4 — 폭이 14로 rectRow(3개, 14)와 같은 상한이다. 2·3개는 예전 값 그대로.
  const gap = count === 2 ? 5 : 4;
  const cols = (count - 1) * gap + 2;
  const rightSlots = new Set<number>();
  while (rightSlots.size < rightCount)
    rightSlots.add(intBetween(rng, 0, count - 1));
  const shapes: GridShape[] = [];
  for (let i = 0; i < count; i += 1) {
    const pair = rightSlots.has(i)
      ? pick(rng, ANGLE_POOLS.right)
      : pick(rng, ANGLE_POOLS.other);
    const fx = intBetween(rng, 0, 1) === 1;
    const c0 = i * gap;
    const move = (p: Pt): Pt => {
      const f = flipPt(p, fx, false);
      return [f[0] + c0, f[1]];
    };
    const v = move(ANGLE_V);
    const p = move(pair[0]);
    const q = move(pair[1]);
    shapes.push({
      pts: [v, p, q],
      lines: [
        [v, p],
        [v, q],
      ],
      label: SHAPE_LABELS[i]!,
      anchor: v,
      side: "down",
    });
  }
  const rightLabels = SHAPE_LABELS.slice(0, count).filter((_, i) =>
    rightSlots.has(i),
  );
  return { cols, shapes, rightLabels, labels: SHAPE_LABELS.slice(0, count) };
}

/** 2단 — 조건이 **문장으로만**. 「종이를 두 번 접어 만든 각과 꼭 맞는」 = 직각. */
function angle122Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const row = angleRow(rng, count, 1);
  const answer = row.rightLabels[0]!;
  const ask = pick(rng, [
    `종이를 반듯하게 두 번 접었을 때 생기는 각과 꼭 맞는 각의 기호를 쓰시오.`,
    `삼각자의 뾰족하지 않은 부분과 꼭 맞는 각의 기호를 쓰시오.`,
    `두 변이 서로 반듯하게 만나는 각의 기호를 쓰시오.`,
    // ⚠️ 「긴바늘이 세 시간」이라 적었다가 검수에서 잡았다 — 긴바늘은 한 시간에 한 바퀴라
    //    세 시간이면 세 바퀴다. 직각을 만드는 것은 **짧은바늘**의 세 시간(한 바퀴의 사분의 일)이다.
    `시계의 짧은바늘이 세 시간 동안 돌 때 생기는 각과 같은 각의 기호를 쓰시오.`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}`,
    answer,
    `문장이 가리키는 것은 직각입니다. 삼각자의 직각 부분을 대었을 때 꼭 맞는 각은 ${answer} 입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 3단 — 직각인 것과 아닌 것을 **각각 세고** 차를 구한다(두 단계). */
function angle122Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  // 「3도형 중 직각 1~2」로 고정하면 답이 늘 $1$ 이다(|1-2| — 씨앗 무관). 심화 상수답과
  // 같은 부류라(g6 pyrFaceDeep, 7604dee6) **견주는 두 무리를 벌린다** — 도형 수 3·4 와
  // 직각 수를 함께 흔들어 답이 $1$·$2$·$3$·$4$ 로 갈린다. 4도형에 직각 2는 차가 $0$ 이라
  // 뽑는 범위에서 뺀다(답 $0$ 은 「차를 쓰시오」에 어색하다).
  const count = intBetween(rng, 3, 4);
  const rightCount = count === 3 ? pick(rng, [1, 2, 3]) : pick(rng, [1, 3, 4]);
  const row = angleRow(rng, count, rightCount);
  const other = count - rightCount;
  return make(
    unit,
    pick(rng, [
      `${row.labels.join(", ")} 중에서 직각인 각의 수와 직각이 아닌 각의 수의 차는 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}를 보고 직각인 각과 직각이 아닌 각을 각각 센 뒤, 그 차를 쓰시오.`,
      `${row.labels.join(", ")}에서 직각인 것의 수와 그렇지 않은 것의 수가 몇 개 차이 나는지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각을 세고, 남은 각의 수와의 차를 쓰시오.`,
      `${row.labels.join(", ")}를 두 무리로 나누었습니다. 직각인 무리와 아닌 무리의 개수 차를 쓰시오.`,
      `${row.labels.join(", ")}를 직각인 것과 아닌 것으로 나누었습니다. 두 무리의 개수의 차는 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각은 몇 개이고 직각이 아닌 각은 몇 개인지 세어, 그 차를 쓰시오.`,
      `${row.labels.join(", ")}에서 직각의 수가 직각이 아닌 각의 수보다 몇 개 많고 적은지 그 차를 쓰시오.`,
    ]),
    n(Math.abs(rightCount - other)),
    `직각인 각은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개이고, ${
      other === 0
        ? `직각이 아닌 각은 ${n(0)}개입니다.`
        : `나머지 ${n(other)}개는 직각이 아닙니다.`
    } ${expr(`${Math.max(rightCount, other)}-${Math.min(rightCount, other)}=${Math.abs(rightCount - other)}`)} 이므로 차는 ${n(Math.abs(rightCount - other))}개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 4단 — 각과 **도형의 직각**을 함께 센다(조건 조합). */
function angle122Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = angleRow(rng, count, rightCount);
  // 오른쪽에 사각형 하나를 덧붙인다 — 직사각형은 직각이 넷이다.
  const side = intBetween(rng, 1, 2);
  const wide = intBetween(rng, 0, 1) === 1;
  const c0 = row.cols + 2;
  const w = wide ? side + 1 : side;
  const h = side;
  const rect = closedShape(
    [
      [c0, 2 - h],
      [c0 + w, 2 - h],
      [c0 + w, 2],
      [c0, 2],
    ],
    "라",
  );
  // ⚠️ 예전에는 「직각은 통틀어 몇 개」로 **세면 끝**이었다 — 같은 소단원 응용
  //    (「직각과 직각이 아닌 각의 수를 세어 그 차」)이 오히려 두 걸음이라 사다리가 뒤집혔다.
  //    이제 **직사각형을 하나 더 그리는 가정**을 얹는다(조건 + 두 걸음).
  const total = rightCount + 4;
  const addRects = intBetween(rng, 1, 3);
  const after = total + addRects * 4;
  return makeDeep(
    unit,
    pick(rng, [
      `${row.labels.join(", ")}는 각이고 라는 직사각형입니다. 여기에 직사각형을 ${n(addRects)}개 더 그리면 그림의 직각은 모두 몇 개가 되는지 쓰시오.`,
      `${row.labels.join(", ")}는 각, 라는 직사각형입니다. 직사각형 ${n(addRects)}개를 더 그린다면 직각은 통틀어 몇 개인지 쓰시오.`,
      `그림에는 각 ${row.labels.join(", ")}와 직사각형 라가 있습니다. 라와 같은 직사각형 ${n(addRects)}개를 더 그리면 직각은 모두 몇 개인지 쓰시오.`,
      `그림의 각 ${row.labels.join(", ")}와 직사각형 라 옆에 직사각형 ${n(addRects)}개를 더 그렸습니다. 이제 직각은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}는 각, 라는 직사각형입니다. 직사각형을 ${n(addRects)}개 더 붙여 그리면 그림에 있는 직각의 수는 몇 개인지 쓰시오.`,
      `각 ${row.labels.join(", ")}와 직사각형 라가 그려져 있습니다. 직사각형 ${n(addRects)}개를 더 그린 뒤 직각을 모두 세면 몇 개인지 쓰시오.`,
      `그림에서 ${row.labels.join(", ")}는 각, 라는 직사각형입니다. 같은 직사각형 ${n(addRects)}개를 더 그렸을 때 직각은 통틀어 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}와 직사각형 라에 직사각형 ${n(addRects)}개를 더 보태 그리면 직각은 모두 몇 개가 되는지 쓰시오.`,
    ]),
    n(after),
    [
      `각 ${row.labels.join(", ")} 중 직각은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개이고, 직사각형은 네 각이 모두 직각이므로 ${expr(`${rightCount}+4=${total}`)} 개입니다.`,
      `직사각형 ${n(addRects)}개에는 직각이 ${expr(`4\\times${addRects}=${addRects * 4}`)} 개 있으므로 ${expr(`${total}+${addRects * 4}=${after}`)} 개입니다.`,
    ],
    pointGridSpec(c0 + w, 2, [...row.shapes, rect]),
  );
}

// ── 1-2-3 직각삼각형 알아보기 (찾기) ──

function tri123Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const row = triangleRow(rng, count, 1);
  const ask = pick(rng, [
    `직각삼각형은 어느 것인지 기호를 쓰시오.`,
    `직각삼각형에 해당하는 것의 기호를 쓰시오.`,
    `직각삼각형 하나를 골라 그 기호를 쓰시오.`,
    `삼각형 가운데 직각삼각형인 것의 기호를 쓰시오.`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}`,
    row.rightLabels[0]!,
    `한 각이 직각인 삼각형이 직각삼각형입니다. ${row.rightLabels[0]!} 의 한 각이 삼각자의 직각 부분과 꼭 맞습니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 2단 — 조건이 문장으로만. 「한 각이 직각인 삼각형」을 말로 풀어 준다. */
function tri123Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const row = triangleRow(rng, count, 1);
  const answer = row.rightLabels[0]!;
  const ask = pick(rng, [
    `삼각자의 직각 부분을 대었을 때 꼭 맞는 각이 있는 삼각형의 기호를 쓰시오.`,
    `한 각이 종이를 두 번 접어 만든 각과 같은 삼각형의 기호를 쓰시오.`,
    `두 변이 서로 반듯하게 만나는 곳이 있는 삼각형의 기호를 쓰시오.`,
    `직각을 낀 두 변이 있는 삼각형의 기호를 쓰시오.`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}`,
    answer,
    `문장이 가리키는 것은 직각삼각형입니다. 한 각이 직각인 삼각형이 ${answer} 입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 3단 — 직각삼각형이 **아닌** 것을 세고 그 수를 답한다(뒤집어 세기, 두 단계). */
function tri123Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = triangleRow(rng, count, rightCount);
  const other = count - rightCount;
  const otherLabels = row.labels.filter((l) => !row.rightLabels.includes(l));
  return make(
    unit,
    pick(rng, [
      `${row.labels.join(", ")} 중에서 직각삼각형이 아닌 삼각형은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 가운데 직각삼각형을 빼면 삼각형이 몇 개 남는지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각이 없는 삼각형의 개수를 쓰시오.`,
      `${row.labels.join(", ")}를 직각삼각형과 아닌 것으로 갈랐습니다. 아닌 쪽은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}에서 삼각자의 직각 부분과 꼭 맞는 각이 없는 삼각형은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}를 직각삼각형과 아닌 것으로 나눌 때, 직각삼각형이 아닌 쪽은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각이 하나도 없는 삼각형은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}에서 직각삼각형을 뺀 나머지 삼각형은 몇 개인지 쓰시오.`,
    ]),
    n(other),
    `직각삼각형은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개입니다. 전체 ${n(count)}개에서 빼면 ${expr(`${count}-${rightCount}=${other}`)} 이므로 ${otherLabels.join(", ")} 로 ${n(other)}개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 4단 — 삼각형과 사각형을 섞어 놓고 **조건 둘**을 겹쳐 건다. */
function tri123Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = triangleRow(rng, count, rightCount);
  const c0 = row.cols + 2;
  const w = intBetween(rng, 1, 2);
  const h = intBetween(rng, 1, 2);
  const rect = closedShape(
    [
      [c0, 2 - h],
      [c0 + w, 2 - h],
      [c0 + w, 2],
      [c0, 2],
    ],
    "라",
  );
  return make(
    unit,
    pick(rng, [
      `${row.labels.join(", ")}는 삼각형이고 라는 사각형입니다. 이 중에서 변이 셋이면서 직각이 있는 도형은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")}는 삼각형, 라는 사각형입니다. 변이 셋이고 직각도 가진 도형의 수를 쓰시오.`,
      `${row.labels.join(", ")}와 라 중에서 「변이 셋」과 「직각이 있다」를 함께 만족하는 도형은 몇 개인지 쓰시오.`,
      `그림의 도형 ${row.labels.join(", ")}, 라 가운데 삼각형이면서 직각을 가진 것은 몇 개인지 쓰시오.`,
      // ⚠️ 이 표현은 오래 「**두 조건**을 모두 채우는」이었다 — 그 두 조건이 발문에도
      // 그림에도 없고 **해설에만** 있었다(그림은 pointGrid 라 글자가 없다). 값은 맞는데
      // **학생이 풀 수 없는 문항**이라, 40씨앗 중 3건이 그렇게 나갔다.
      // 조건을 부르려면 **그 자리에서 이름을 대야 한다**. 아래 시험이 잠근다.
      `${row.labels.join(", ")}는 삼각형이고 라는 사각형입니다. 두 조건 「변이 셋」·「직각이 있다」를 모두 채우는 도형의 개수를 쓰시오.`,
      `${row.labels.join(", ")}는 삼각형, 라는 사각형입니다. 변이 셋이고 직각도 있는 도형은 몇 개인지 쓰시오.`,
      `그림에서 ${row.labels.join(", ")}는 삼각형이고 라는 사각형입니다. 두 조건 「변이 셋」과 「직각이 있다」를 모두 만족하는 도형의 수를 쓰시오.`,
      `${row.labels.join(", ")}와 사각형 라 중에서, 변이 셋이면서 직각을 가진 도형은 모두 몇 개인지 쓰시오.`,
    ]),
    n(rightCount),
    `변이 셋인 도형은 삼각형 ${row.labels.join(", ")} 입니다. 라는 변이 넷이라 조건에 맞지 않습니다. 그중 직각이 있는 것은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개입니다.`,
    pointGridSpec(c0 + w, 2, [...row.shapes, rect]),
  );
}

// ── 1-2-4 직사각형 알아보기 ──
// 이 소단원은 오래 「직각삼각형 알아보기」로 잘못 적혀 있었다(eywa 정본 288~289 중복).
// 2026-08-23 에 units.ts 를 바로잡았고, 표준·갈래를 **직사각형**으로 다시 짰다.

/** 1단 — 직사각형 하나를 고른다. 표준과 말투가 겹치지 않게 따로 둔다. */
function rect124Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = rectRow(rng);
  const ask = pick(rng, [
    `직사각형은 어느 것인지 기호를 쓰시오.`,
    `직사각형에 해당하는 것의 기호를 쓰시오.`,
    `직사각형 하나를 골라 그 기호를 쓰시오.`,
    `사각형 가운데 직사각형인 것의 기호를 쓰시오.`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}`,
    row.answer,
    `네 각이 모두 직각인 사각형이 직사각형입니다. ${row.answer} 가 그렇습니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 2단 — 조건이 **문장으로만** 주어진다. */
function rect124Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = rectRow(rng);
  const ask = pick(rng, [
    // ⚠️ 표준 `rectPick` 이 「네 각이 모두 직각인 사각형」을 쓴다 — 그대로 쓰면 발문이
    //    바이트까지 같아진다(실측: 씨앗 300개 중 15). 말투를 갈라 둔다.
    `네 꼭짓점이 모두 직각인 사각형`,
    `마주 보는 두 변의 길이가 같고 네 각이 모두 직각인 사각형`,
    `삼각자의 직각 부분이 네 꼭짓점에 모두 꼭 맞는 사각형`,
    `종이를 두 번 접어 만든 각이 네 꼭짓점에 모두 있는 사각형`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}의 기호를 쓰시오.`,
    row.answer,
    `문장이 가리키는 것은 직사각형입니다. ${row.answer} 는 네 각이 모두 직각입니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 3단 — 가로와 세로를 알고 **네 변의 길이의 합**을 구한다(두 단계). */
function rect124Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 4, 12);
  const h = pick(
    rng,
    [2, 3, 5, 6, 7, 8, 9].filter((v) => v !== w),
  );
  const thing = pick(rng, [
    "액자",
    "공책",
    "칠판",
    "책상",
    "손수건",
    "게시판",
    "창문",
    "카드",
  ]);
  return make(
    unit,
    pick(rng, [
      `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형 모양 ${thing}${josa(thing, "이", "가")} 있습니다. 네 변의 길이의 합은 몇 cm인지 쓰시오.`,
      `직사각형 모양 ${thing}의 가로는 ${n(w)} cm, 세로는 ${n(h)} cm입니다. 네 변의 길이의 합을 구하시오.`,
      `가로 ${n(w)} cm, 세로 ${n(h)} cm인 직사각형이 있습니다. 네 변의 길이를 모두 더하면 몇 cm인지 쓰시오.`,
      `${thing}${josa(thing, "은", "는")} 가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형입니다. 네 변의 길이의 합은 몇 cm인지 쓰시오.`,
    ]),
    n((w + h) * 2),
    `직사각형은 마주 보는 두 변의 길이가 같습니다. 네 변을 모두 더하면 ${expr(`${w}+${h}+${w}+${h}=${(w + h) * 2}`)} 이므로 ${n((w + h) * 2)} cm입니다.`,
  );
}

/** 4단 — **역산**. 네 변의 길이의 합과 가로에서 세로를 되짚는다. */
function rect124Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 4, 12);
  const h = pick(
    rng,
    [2, 3, 5, 6, 7, 8, 9].filter((v) => v !== w),
  );
  const total = (w + h) * 2;
  const half = w + h;
  const thing = pick(rng, [
    "액자",
    "공책",
    "칠판",
    "책상",
    "손수건",
    "게시판",
    "창문",
    "카드",
  ]);
  return make(
    unit,
    pick(rng, [
      `네 변의 길이의 합이 ${n(total)} cm인 직사각형 모양 ${thing}${josa(thing, "이", "가")} 있습니다. 가로가 ${n(w)} cm일 때 세로는 몇 cm인지 쓰시오.`,
      `직사각형 모양 ${thing}의 네 변의 길이의 합은 ${n(total)} cm이고 가로는 ${n(w)} cm입니다. 세로를 구하시오.`,
      `어떤 직사각형의 네 변의 길이를 모두 더하니 ${n(total)} cm였습니다. 가로가 ${n(w)} cm라면 세로는 몇 cm인지 쓰시오.`,
      `${thing}${josa(thing, "은", "는")} 네 변의 길이의 합이 ${n(total)} cm인 직사각형입니다. 가로가 ${n(w)} cm일 때 세로는 몇 cm인지 쓰시오.`,
    ]),
    n(h),
    `직사각형은 마주 보는 두 변의 길이가 같으므로, 네 변의 합의 반이 가로와 세로의 합입니다. ${expr(`${total}\\div2=${half}`)} 입니다. 여기서 가로를 빼면 ${expr(`${half}-${w}=${h}`)} 이므로 세로는 ${n(h)} cm입니다.`,
  );
}

// ── 1-2-5 정사각형 알아보기 ──

function sq125Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = squareRow(rng);
  const ask = pick(rng, [
    `정사각형은 어느 것인지 기호를 쓰시오.`,
    `정사각형에 해당하는 것의 기호를 쓰시오.`,
    `정사각형 하나를 골라 그 기호를 쓰시오.`,
    `사각형 가운데 정사각형인 것의 기호를 쓰시오.`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}`,
    row.answer,
    `네 각이 모두 직각이고 네 변의 길이가 같은 사각형이 정사각형입니다. ${row.answer} 는 가로와 세로가 모두 ${n(row.side)}칸으로 같습니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/**
 * 나란한 직사각형 한 줄. 정확히 하나만 정사각형이다.
 *
 * `squarePick`(기본 문항)과 **따로 짠다** — 거기서 발문을 긁어 기호를 되찾으려 했더니
 * 말투가 세 가지라 「…를 찾아 기호를 쓰시오. (가, 나)」 꼴에서 정규식이 빗나갔다.
 * 빗나가면 **조용히 「가, 나」로 떨어져** 그림과 다른 기호를 적는다 — 긁지 말고 만든다.
 */
function squareRow(rng: Rng) {
  const count = intBetween(rng, 2, 3);
  const gap = count === 3 ? 4 : 5;
  const maxW = count === 3 ? 2 : 3;
  const rows = 3;
  const side = intBetween(rng, 2, maxW);
  const answerAt = intBetween(rng, 0, count - 1);
  const oblong: [number, number][] = [];
  for (let w = 1; w <= maxW; w += 1) {
    for (let h = 1; h <= rows; h += 1) if (w !== h) oblong.push([w, h]);
  }
  const shapes: GridShape[] = [];
  for (let i = 0; i < count; i += 1) {
    const [w, h] = i === answerAt ? [side, side] : pick(rng, oblong);
    const c0 = i * gap;
    const r0 = rows - h!;
    shapes.push(
      closedShape(
        [
          [c0, r0],
          [c0 + w!, r0],
          [c0 + w!, r0 + h!],
          [c0, r0 + h!],
        ],
        SHAPE_LABELS[i]!,
      ),
    );
  }
  return {
    cols: (count - 1) * gap + maxW,
    rows,
    shapes,
    labels: SHAPE_LABELS.slice(0, count),
    answer: SHAPE_LABELS[answerAt]!,
    side,
  };
}

/** 2단 — 조건이 문장으로만. 「네 각이 직각이고 네 변이 같은」을 말로 풀어 준다. */
function sq125Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = squareRow(rng);
  const ask = pick(rng, [
    `네 각이 모두 직각이고 네 변의 길이가 모두 같은 사각형`,
    `네 변의 길이가 모두 같은 직사각형`,
    `가로와 세로의 길이가 같은 직사각형`,
    `네 변의 길이가 모두 같고 네 각이 모두 같은 사각형`,
  ]);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 ${ask}의 기호를 쓰시오.`,
    row.answer,
    `문장이 가리키는 것은 정사각형입니다. ${row.answer} 는 가로와 세로가 모두 ${n(row.side)}칸으로 같습니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 3단 — 정사각형을 찾고 그 **네 변의 길이의 합**까지 구한다(두 단계). */
function sq125Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 9);
  const thing = pick(rng, [
    "색종이",
    "손수건",
    "액자",
    "타일",
    "방석",
    "게시판",
    "창문",
    "스케치북",
  ]);
  return make(
    unit,
    `한 변의 길이가 ${n(side)} cm인 정사각형 모양 ${thing}${josa(thing, "이", "가")} 있습니다. 네 변의 길이의 합은 몇 cm인지 쓰시오.`,
    n(side * 4),
    `정사각형은 네 변의 길이가 모두 같습니다. 같은 길이를 네 번 더하면 ${expr(`${side}+${side}+${side}+${side}=${side * 4}`)} 이므로 ${n(side * 4)} cm입니다.`,
  );
}

/**
 * 4단 — **역산 두 걸음**. 늘인 뒤의 합에서 처음 한 변을 되짚거나(㈟),
 * 둘레가 같은 직사각형에서 정사각형 한 변을 구한다(㈠).
 */
function sq125Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 9);
  const thing = pick(rng, [
    "색종이",
    "손수건",
    "액자",
    "타일",
    "방석",
    "게시판",
    "창문",
    "스케치북",
  ]);
  // ⚠️ 예전에는 「네 변의 합 $20$ → 한 변」이라 $20\div4$ **한 걸음**이었다.
  //    같은 소단원 응용(「한 변 $9$ → 합」)도 한 걸음이라 사다리가 아예 안 올랐다.
  //    이제 **늘인 뒤의 합**을 주고 처음 한 변을 되짚는다(두 걸음).
  if (intBetween(rng, 0, 1) === 0) {
    const grow = intBetween(rng, 1, 5);
    const grown = (side + grow) * 4;
    return makeDeep(
      unit,
      `정사각형 모양 ${thing}의 한 변을 ${n(grow)} cm씩 늘였더니 네 변의 길이의 합이 ` +
        `${n(grown)} cm가 되었습니다. 처음 ${thing}의 한 변의 길이는 몇 cm인지 쓰시오.`,
      n(side),
      [
        `늘인 뒤의 한 변은 ${expr(`${grown}\\div4=${side + grow}`)} cm입니다.`,
        `처음 한 변은 ${expr(`${side + grow}-${grow}=${side}`)} 이므로 ${n(side)} cm입니다.`,
      ],
    );
  }
  // 가로와 세로의 **합이 짝수**라야 네 변의 합이 $4$ 로 나누어떨어진다.
  // 홀수를 허용하면 정사각형 한 변이 `$9.5$` 로 나온다 — 초3 에 소수는 1-6 단원이고,
  // 원장님이 잡으신 「분수 답을 소수로」(R2)와 같은 부류다. 뽑는 범위에서 막는다.
  const w = side + pick(rng, [2, 4, 6]);
  const rectTotal = (w + side) * 2;
  return make(
    unit,
    `네 변의 길이의 합이 같은 정사각형과 직사각형이 있습니다. 직사각형의 가로가 ${n(w)} cm, 세로가 ${n(side)} cm일 때 정사각형의 한 변의 길이는 몇 cm인지 쓰시오.`,
    n(rectTotal / 4),
    `직사각형의 네 변의 길이의 합은 ${expr(`${w}+${side}+${w}+${side}=${rectTotal}`)} 입니다. 정사각형은 네 변이 같으므로 ${expr(`${rectTotal}\\div4=${rectTotal / 4}`)} 이므로 한 변은 ${n(rectTotal / 4)} cm입니다.`,
  );
}

// ── 1-3 나눗셈 (D-72 확대) ────────────────────────────────────────────
//
// 나눗셈 도입 대단원 — 모든 나눗셈이 **곱셈구구 안**이다: 나누는 수·몫 2..9,
// 나뉘는 수 ≤ 81, 나머지 없음(나머지는 2-2 가 맡는다). 표준 `division` 이
// 소단원마다 한 틀뿐이므로 갈래 말투는 따로 둔다(1-2 와 같은 이유).
//
// 몫과 나누는 수가 같으면($25\div5$) 발문에 답이 보인다 — 표준의 회피 이유 그대로,
// 여기서는 재추첨 가드가 아니라 **뽑는 범위에서** 뺀다(2-2-4 수리와 같은 태도).
// 지면에 찍히는 **모든** 나눗셈이 몫≠나누는 수다 — 시험이 전 갈래에서 잠근다.

/** 곱셈구구 안의 나눗셈 한 벌 — $a=b\times q$, $q\ne b$. */
function divTriple(rng: Rng): { a: number; b: number; q: number } {
  const b = intBetween(rng, 2, 9);
  // 몫은 2..9 여덟 값에서 b 를 건너뛴다 — 2..8 로 뽑고 b 이상이면 한 칸 민다.
  const qq = intBetween(rng, 2, 8);
  const q = qq >= b ? qq + 1 : qq;
  return { a: b * q, b, q };
}

/**
 * 한 수를 서로 다른 두 수로 나누는 조합 — $a=b\times q_1=c\times q_2$, 넷 다 2..9,
 * 두 나눗셈 모두 몫≠나누는 수. 심화 세 갈래(몫 비교·다시 담기·어떤 수)가
 * **같은 풀 하나**를 쓴다 — 목록을 손으로 적지 않고 전수 열거로 만든다.
 */
function divCombos(): {
  a: number;
  b: number;
  c: number;
  q1: number;
  q2: number;
}[] {
  const out: { a: number; b: number; c: number; q1: number; q2: number }[] = [];
  for (let b = 2; b <= 9; b += 1) {
    for (let q1 = 2; q1 <= 9; q1 += 1) {
      if (q1 === b) continue;
      const a = b * q1;
      for (let c = 2; c <= 9; c += 1) {
        if (c === b || a % c !== 0) continue;
        const q2 = a / c;
        if (q2 < 2 || q2 > 9 || q2 === c) continue;
        // ⚠️ c 가 옛 몫과 같으면($a=b\times q_1=q_1\times b$) 새 몫이 옛 나누는 수 b 라서
        //    **답이 발문에 그대로 보인다**(표본 눈검수 실측: 「4개씩 7묶음 → 7개씩?」의 답 4).
        if (c === q1) continue;
        out.push({ a, b, c, q1, q2 });
      }
    }
  }
  if (out.length === 0) throw new Error("나눗셈 조합 풀이 비었습니다");
  return out;
}

const DIV_COMBOS = divCombos();
/** 몫 비교용 — $b<c$ 면 몫의 차가 늘 양수라 「몇 개 더 많은가」가 선다. */
const DIV_COMBOS_LT = DIV_COMBOS.filter((v) => v.b < v.c);
if (DIV_COMBOS_LT.length === 0) throw new Error("나눗셈 비교 풀이 비었습니다");

/** 등분 이야기 소재(1-3-1) — 사람·바구니에게 나눠 준다. */
const SHARE_STUFF = [
  "귤",
  "구슬",
  "색종이",
  "딱지",
  "연필",
  "붙임딱지",
  "초콜릿",
  "지우개",
] as const;

/** 묶음 이야기 소재(1-3-3) — 봉지·상자에 «씩» 담는다. */
const PACK_STUFF = [
  "쿠키",
  "사탕",
  "도넛",
  "방울토마토",
  "클립",
  "단추",
  "젤리",
  "빵",
] as const;

// ── 1-3-1 똑같이 나누기 ──

/** 1단 — 식 그대로. 표준(사탕 묶음 그림 문장)과 겹치지 않게 식 틀만 따로 돌린다. */
function div131Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const stem = pick(rng, [
    `다음을 계산하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
    `나눗셈 ${expr(`${a}\\div${b}`)} 의 몫을 구하시오.`,
    `${expr(`${a}\\div${b}`)} 의 값을 쓰시오.`,
    `${expr(`\\square`)} 에 알맞은 수를 쓰시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
    `몫을 구하시오.\n\n${expr(`${a}\\div${b}`)}`,
    `나눗셈식 ${expr(`${a}\\div${b}=\\square`)} 에서 ${expr(`\\square`)} 에 알맞은 수를 쓰시오.`,
    `다음 나눗셈의 몫을 쓰시오.\n\n${expr(`${a}\\div${b}`)}`,
    `빈칸에 알맞은 수를 구하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 몫은 ${n(q)} 입니다.`,
  );
}

/** 2단 — 등분 문장. 식은 학생이 세운다(발문에 나눗셈 기호가 없다). */
function div131Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const thing = pick(rng, SHARE_STUFF);
  const stem = pick(rng, [
    `${thing} ${n(a)}개를 ${n(b)}명이 똑같이 나누어 가지려고 합니다. 한 명이 몇 개씩 가지면 되는지 쓰시오.`,
    `${thing} ${n(a)}개를 바구니 ${n(b)}개에 똑같이 나누어 담으면 한 바구니에 몇 개씩 담기는지 쓰시오.`,
    `친구 ${n(b)}명이 ${thing} ${n(a)}개를 남김없이 똑같이 나누어 가졌습니다. 한 명이 가진 ${thing}${josa(thing, "은", "는")} 몇 개인지 쓰시오.`,
    `${thing} ${n(a)}개를 접시 ${n(b)}개에 남김없이 똑같이 나누어 놓으려고 합니다. 접시 한 개에 몇 개씩 놓아야 하는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${n(a)}개를 ${n(b)}곳으로 똑같이 나누는 식은 ${expr(`${a}\\div${b}`)} 입니다. ${expr(`${a}\\div${b}=${q}`)} 이므로 한 곳에 ${n(q)}개씩입니다.`,
  );
}

/** 3단 — 두 곳의 것을 **합친 뒤** 나눈다(두 단계). */
function div131Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  // 「$1$개를 가져왔습니다」는 어색하다 — 두 몫 다 2개 이상으로 뽑는다(a ≥ 6 이라 늘 된다).
  const x = intBetween(rng, 2, a - 2);
  const y = a - x;
  const thing = pick(rng, SHARE_STUFF);
  const stem = pick(rng, [
    `상자에 ${thing} ${n(x)}개, 주머니에 ${n(y)}개가 있습니다. 모두 모아 ${n(b)}명이 똑같이 나누어 가지면 한 명이 몇 개씩 가지는지 쓰시오.`,
    `${thing}${josa(thing, "이", "가")} 책상 위에 ${n(x)}개, 서랍 안에 ${n(y)}개 있습니다. 전부 모아 ${n(b)}명이 똑같이 나누면 한 명의 몫은 몇 개인지 쓰시오.`,
    `언니가 ${thing} ${n(x)}개, 동생이 ${n(y)}개를 가져왔습니다. 둘이 가져온 것을 모두 ${n(b)}명이 똑같이 나누어 가지면 한 명이 몇 개씩 받는지 쓰시오.`,
    `${thing} ${n(x)}개가 든 봉지와 ${n(y)}개가 든 봉지가 있습니다. 두 봉지를 합쳐 ${n(b)}명에게 똑같이 나누어 주면 한 명에게 몇 개씩 줄 수 있는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `먼저 모두 모읍니다. ${expr(`${x}+${y}=${a}`)} 입니다. ${expr(`${a}\\div${b}=${q}`)} 이므로 한 명이 ${n(q)}개씩 가집니다.`,
  );
}

/** 4단 — 조건 조합: 같은 것을 두 가지 수로 나눠 **몫을 견준다**. */
function div131Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 예전에는 「$b$묶음일 때와 $c$묶음일 때 한 묶음의 차」였다 — 나눗셈 둘과 뺄셈이라
  //    걸음은 셋인데, 같은 소단원 응용(두 봉지를 합쳐 나눈다)과 **하는 일이 같다**.
  //    이제 나눈 뒤 **일부를 주고 남은 것**을 묻는다 — 나눗셈 뒤에 곱셈이 온다.
  // ⚠️ 준 묶음이 하나면 곱셈이 `$q\times1$` 이라 **곱셈구구 밖**이고(이 소단원의 잠금),
  //    남는 묶음이 하나여도 마찬가지다. 그래서 묶음은 넷 이상, 주는 것은 둘 이상 —
  //    남는 것도 둘 이상이 되게 뽑는다.
  const { a, b, q1 } = pick(
    rng,
    DIV_COMBOS_LT.filter((v) => v.b >= 4),
  );
  const give = intBetween(rng, 2, b - 2);
  const thing = pick(rng, SHARE_STUFF);
  const left = q1 * (b - give);
  return makeDeep(
    unit,
    `${thing} ${n(a)}개를 ${n(b)}묶음으로 똑같이 나누었습니다. ` +
      `그중 ${n(give)}묶음을 동생에게 주면 남는 ${thing}${josa(thing, "은", "는")} 몇 개인지 쓰시오.`,
    n(left),
    [
      `한 묶음은 ${expr(`${a}\\div${b}=${q1}`)} 개입니다.`,
      // ⚠️ 마지막 걸음을 **뺄셈**으로 맺는다 — 이 소단원의 잠금이 「정답은 해설의 마지막
      //    «곱셈 아닌» 스텝의 값」이다(곱셈은 되짚기·검산으로 본다).
      `동생에게 준 것은 ${expr(`${q1}\\times${give}=${q1 * give}`)} 개이므로 ` +
        `남는 것은 ${expr(`${a}-${q1 * give}=${left}`)} 개입니다.`,
    ],
  );
}

// ── 1-3-2 곱셈과 나눗셈의 관계 ──

/** 1단 — 곱셈식 하나에서 나눗셈 몫을 바로 읽는다. 어느 쪽 수를 물을지도 갈래다. */
function div132Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const askQ = intBetween(rng, 0, 1) === 0;
  const div = askQ ? `${a}\\div${b}` : `${a}\\div${q}`;
  const ans = askQ ? q : b;
  const mul = expr(`${b}\\times${q}=${a}`);
  const stem = pick(rng, [
    `곱셈식이 ${mul} 일 때, ${expr(div)} 의 몫을 구하시오.`,
    `${mul} 입니다. ${expr(div)} 의 값을 쓰시오.`,
    `곱셈식 ${mul} 에서 만든 나눗셈식 ${expr(`${div}=\\square`)} 의 ${expr(`\\square`)} 에 알맞은 수를 쓰시오.`,
    `${mul} 이므로 ${expr(div)} 의 몫을 바로 알 수 있습니다. 그 몫을 쓰시오.`,
    `곱셈과 나눗셈의 관계를 이용하여 ${expr(div)} 의 몫을 구하시오. (${mul})`,
    `${expr(`${div}=\\square`)} 의 ${expr(`\\square`)} 에 알맞은 수를 곱셈식 ${mul} 에서 찾아 쓰시오.`,
    `곱셈식 ${mul} 의 세 수로 나눗셈식을 만들면 ${expr(`${div}=\\square`)} 입니다. ${expr(`\\square`)} 에 알맞은 수를 쓰시오.`,
    `${mul} 에서 ${expr(div)} 의 몫을 찾아 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(ans),
    `곱셈식과 나눗셈식은 같은 세 수를 씁니다. ${mul} 이므로 ${expr(`${div}=${ans}`)} 입니다.`,
  );
}

/** 2단 — 관계를 문장으로: 곱과 한 수를 알고 다른 수를 찾는다. */
function div132Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const stem = pick(rng, [
    `어떤 두 수의 곱이 ${n(a)} 입니다. 한 수가 ${n(b)} 일 때 다른 한 수를 쓰시오.`,
    `${n(b)} 에 어떤 수를 곱한 결과가 ${n(a)} 입니다. 어떤 수를 쓰시오.`,
    `어떤 수와 ${n(b)} 의 곱이 ${n(a)} 입니다. 어떤 수를 구하시오.`,
    `곱이 ${n(a)} 인 두 수 중에서 한 수가 ${n(b)} 입니다. 나머지 한 수를 쓰시오.`,
    `수 카드 두 장의 수를 곱했더니 ${n(a)} 입니다. 한 장의 수가 ${n(b)} 일 때 다른 한 장의 수를 쓰시오.`,
    `${n(b)} 씩 몇 묶음을 모았더니 모두 ${n(a)}개입니다. 몇 묶음인지 쓰시오.`,
    `한 봉지에 ${n(b)}개씩 들어 있는 과자 몇 봉지가 모두 ${n(a)}개입니다. 몇 봉지인지 쓰시오.`,
    `${n(b)}명이 똑같이 나누어 가진 구슬이 모두 ${n(a)}개입니다. 한 명이 가진 구슬은 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `곱하는 수는 나눗셈으로 구합니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 3단 — 곱셈식 하나에서 나눗셈식 **둘**을 만들어 두 몫을 더한다(두 단계). */
function div132Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const s = q + b;
  const mul = expr(`${b}\\times${q}=${a}`);
  // ⚠️ 발문에 `$a\div b$ 의 몫` 을 인라인하지 않는다 — 산술 판독기가 그 식을 «값 질문»으로
  //    읽어 합(答)과 어긋난다고 봤다(실측: 씨앗 5/8). 나눗셈식은 학생이 만들게 두는 쪽이
  //    3단 취지에도 맞다.
  const stem = pick(rng, [
    `곱셈식 ${mul} 에서 나눗셈식 두 개를 만들 수 있습니다. 두 나눗셈식의 몫의 합을 쓰시오.`,
    `${mul} 에서 만들 수 있는 나눗셈식 두 개의 몫을 더한 값을 쓰시오.`,
    `곱셈식 ${mul} 의 세 수로 나눗셈식 두 개를 만들고, 그 두 몫의 합을 구하시오.`,
    `${mul} 입니다. 이 곱셈식에서 나온 나눗셈식 두 개의 몫을 더하면 얼마인지 쓰시오.`,
    `곱셈식 ${mul} 에서 나눗셈식 두 개를 만들고, 두 몫을 더한 값을 구하시오.`,
    `${mul} 에서 나온 두 나눗셈식의 몫을 모두 더하면 얼마인지 쓰시오.`,
    `곱셈식이 ${mul} 일 때, 만들 수 있는 나눗셈식 두 개의 몫의 합을 구하시오.`,
    `${mul} 의 세 수로 만들 수 있는 나눗셈식 두 개의 몫의 합을 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(s),
    `${expr(`${a}\\div${b}=${q}`)} 이고 ${expr(`${a}\\div${q}=${b}`)} 입니다. ${expr(`${q}+${b}=${s}`)} 이므로 합은 ${n(s)} 입니다.`,
  );
}

/** 4단 — 역산 둘: 「나눠야 할 것을 잘못 뺐다」와 「나누는 수 되짚기」. */
function div132Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  if (intBetween(rng, 0, 1) === 0) {
    const x = a - b;
    const stem = pick(rng, [
      `어떤 수를 ${n(b)} 씩 똑같이 나누어야 하는데 잘못하여 ${n(b)} 만큼 뺐더니 결과가 ${n(x)} 입니다. 바르게 계산한 몫을 쓰시오.`,
      `어떤 수에서 ${n(b)} 만큼 빼면 ${n(x)} 입니다. 이 어떤 수를 ${n(b)} 씩 나누면 몫이 얼마인지 쓰시오.`,
      `${n(b)} 씩 나누어야 할 수에서 잘못하여 ${n(b)} 만큼 뺐더니 ${n(x)} 만 남았습니다. 바르게 나눈 몫을 쓰시오.`,
      `어떤 수를 ${n(b)} 씩 나누는 대신 ${n(b)} 만큼 빼는 실수를 했더니 결과가 ${n(x)} 입니다. 바르게 계산했을 때의 몫을 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(q),
      `잘못 계산한 식에서 어떤 수를 되짚습니다. ${expr(`${x}+${b}=${a}`)} 이므로 어떤 수는 ${n(a)} 입니다. 바르게 계산하면 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
    );
  }
  // ⚠️ 예전에는 「$a$개를 몇 명이 나누니 $q$개씩」 = $a\div q$ **한 걸음 역산**이었다.
  //    되짚기는 맞는데 한 번이라 4단이 아니다 — 되짚은 뒤 **한 걸음 더** 간다.
  // ⚠️ 더 넣는 수는 **나누는 수의 배수**여야 몫이 자연수로 떨어진다 —
  //    $q$ 의 배수로 두면 $(a+add)\div b$ 가 소수가 된다(실제로 `$8.25$` 가 나왔다).
  //    그리고 새 몫 $q+m$ 은 **곱셈구구 안**($\le 9$)이면서 나누는 수와 달라야 한다
  //    (이 소단원의 잠금 둘). 못 고르면 되짚기 갈래를 안 쓴다.
  // ⚠️ 새 몫 $q+m$ 은 **곱셈구구 안**($1\le q+m\le 9$)이면서 나누는 수와 달라야 한다
  //    (몫 $1$ 도 곱셈구구 밖이다). 그래서 **더 넣기와 덜어 내기 양쪽**에서 고른다 —
  //    한쪽만 두면 $q$ 가 클 때 고를 것이 없어진다.
  const m = pick(
    rng,
    [1, 2, 3, -1, -2, -3].filter(
      (v) => q + v >= 2 && q + v <= 9 && q + v !== b,
    ),
  );
  const move = b * Math.abs(m);
  const nowQ = q + m;
  const nowA = a + b * m;
  const stem =
    m > 0
      ? pick(rng, [
          `${n(a)}개를 몇 명이 똑같이 나누었더니 한 명이 ${n(q)}개씩 가졌습니다. ` +
            `여기에 ${n(move)}개를 더 놓고 같은 사람 수로 나누면 한 명이 몇 개씩 가지는지 쓰시오.`,
          `구슬 ${n(a)}개를 똑같이 나누어 담았더니 주머니마다 ${n(q)}개씩 꼭 맞게 들어갔습니다. ` +
            `구슬 ${n(move)}개를 더 넣고 같은 수의 주머니에 나누면 한 주머니에 몇 개씩 들어가는지 쓰시오.`,
          `사탕 ${n(a)}개를 접시마다 ${n(q)}개씩 남김없이 놓았습니다. ` +
            `사탕 ${n(move)}개를 더 가져와 같은 수의 접시에 나누면 한 접시에 몇 개씩 놓이는지 쓰시오.`,
          `색종이 ${n(a)}장을 모둠마다 ${n(q)}장씩 꼭 맞게 나누어 주었습니다. ` +
            `색종이 ${n(move)}장을 더 받아 같은 수의 모둠에 나누면 한 모둠이 몇 장씩 받는지 쓰시오.`,
        ])
      : pick(rng, [
          `${n(a)}개를 몇 명이 똑같이 나누었더니 한 명이 ${n(q)}개씩 가졌습니다. ` +
            `여기에서 ${n(move)}개를 덜어 내고 같은 사람 수로 나누면 한 명이 몇 개씩 가지는지 쓰시오.`,
          `구슬 ${n(a)}개를 똑같이 나누어 담았더니 주머니마다 ${n(q)}개씩 꼭 맞게 들어갔습니다. ` +
            `구슬 ${n(move)}개를 빼고 같은 수의 주머니에 나누면 한 주머니에 몇 개씩 들어가는지 쓰시오.`,
          `사탕 ${n(a)}개를 접시마다 ${n(q)}개씩 남김없이 놓았습니다. ` +
            `사탕 ${n(move)}개를 덜어 내고 같은 수의 접시에 나누면 한 접시에 몇 개씩 놓이는지 쓰시오.`,
          `색종이 ${n(a)}장을 모둠마다 ${n(q)}장씩 꼭 맞게 나누어 주었습니다. ` +
            `색종이 ${n(move)}장을 빼고 같은 수의 모둠에 나누면 한 모둠이 몇 장씩 받는지 쓰시오.`,
        ]);
  return makeDeep(unit, stem, n(nowQ), [
    `먼저 몇으로 나누었는지 되짚습니다. ${expr(`${a}\\div${q}=${b}`)} 입니다.`,
    `${expr(m > 0 ? `${a}+${move}=${nowA}` : `${a}-${move}=${nowA}`)} 이고 ` +
      `${expr(`${nowA}\\div${b}=${nowQ}`)} 이므로 ${n(nowQ)}개씩입니다.`,
  ]);
}

// ── 1-3-3 나눗셈의 몫을 곱셈식으로 구하기 ──

/** 1단 — $b\times\square=a$ 꼴에서 몫을 읽는다. 표준($\square\times b$)과 자리를 바꿔 둔다. */
function div133Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const box = expr(`${b}\\times\\square=${a}`);
  const dv = expr(`${a}\\div${b}`);
  const stem = pick(rng, [
    `${box} 의 ${expr(`\\square`)} 에 알맞은 수를 구하여 ${dv} 의 몫을 쓰시오.`,
    `곱셈식 ${box} 에서 ${dv} 의 몫을 구하시오.`,
    `${dv} 의 몫은 ${box} 의 ${expr(`\\square`)} 입니다. 그 수를 쓰시오.`,
    `${expr(`${b}\\times${q}=${a}`)} 입니다. ${dv} 의 몫을 쓰시오.`,
    `곱셈식을 이용하여 ${dv} 의 몫을 구하시오.`,
    `${expr(`${a}\\div${b}=\\square`)} 의 ${expr(`\\square`)} 에 알맞은 수를 ${box} 에서 찾아 쓰시오.`,
    `나눗셈 ${dv} 의 몫을 곱셈식으로 구하려고 합니다. ${box} 의 ${expr(`\\square`)} 에 알맞은 수를 쓰시오.`,
    `${dv} 의 몫을 구하는 곱셈식은 ${box} 입니다. 몫을 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 2단 — «씩 담기» 문장. 몇 묶음인지 곱셈식으로 찾는다. */
function div133Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const thing = pick(rng, PACK_STUFF);
  const stem = pick(rng, [
    `${thing} ${n(a)}개를 봉지 한 개에 ${n(b)}개씩 담으려고 합니다. 봉지는 몇 개 필요한지 쓰시오.`,
    `${thing} ${n(a)}개를 한 접시에 ${n(b)}개씩 나누어 담으면 접시 몇 개에 담을 수 있는지 쓰시오.`,
    `${thing} ${n(a)}개를 ${n(b)}개씩 묶으면 몇 묶음이 되는지 쓰시오.`,
    `상자 한 개에 ${thing}${josa(thing, "을", "를")} ${n(b)}개씩 담아 모두 ${n(a)}개를 담으려고 합니다. 상자는 몇 개 있어야 하는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${n(b)}개씩 몇 묶음이 ${n(a)}개가 되는지 곱셈식으로 찾습니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 3단 — 나눠 담고 나서 **몇 묶음을 덜어낸다**(두 단계). */
function div133Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const c = intBetween(rng, 1, q - 1);
  const thing = pick(rng, PACK_STUFF);
  const stem = pick(rng, [
    `${thing} ${n(a)}개를 한 봉지에 ${n(b)}개씩 모두 담은 뒤, 그중 ${n(c)}봉지를 이웃에게 주었습니다. 남은 봉지는 몇 개인지 쓰시오.`,
    `${thing} ${n(a)}개를 ${n(b)}개씩 묶어 묶음을 만들고, ${n(c)}묶음을 동생에게 주면 몇 묶음이 남는지 쓰시오.`,
    `${thing} ${n(a)}개를 접시 한 개에 ${n(b)}개씩 담았습니다. 그중 ${n(c)}접시를 손님상에 내면 남는 접시는 몇 개인지 쓰시오.`,
    `${thing} ${n(a)}개를 상자 한 개에 ${n(b)}개씩 담아 두었다가 ${n(c)}상자를 팔았습니다. 남은 상자는 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q - c),
    // 발문이 봉지·묶음·접시·상자를 오가므로 해설은 단위 낱말을 고정하지 않는다.
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다. 여기서 ${expr(`${q}-${c}=${q - c}`)} 입니다.`,
  );
}

/** 4단 — 역산+조합: 담긴 수로 **전체를 되짚고** 다른 크기로 다시 담는다. */
function div133Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, c, q1, q2 } = pick(rng, DIV_COMBOS);
  const thing = pick(rng, PACK_STUFF);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 한 봉지에 ${n(b)}개씩 담았더니 남김없이 ${n(q1)}봉지가 되었습니다. 다시 한 봉지에 ${n(c)}개씩 담으면 몇 봉지가 되는지 쓰시오.`,
    `${thing}${josa(thing, "을", "를")} ${n(b)}개씩 묶었더니 꼭 ${n(q1)}묶음이었습니다. 같은 ${thing}${josa(thing, "을", "를")} ${n(c)}개씩 다시 묶으면 몇 묶음인지 쓰시오.`,
    `한 상자에 ${n(b)}개씩 ${n(q1)}상자에 꼭 맞게 담긴 ${thing}${josa(thing, "이", "가")} 있습니다. 이것을 한 상자에 ${n(c)}개씩 옮겨 담으면 상자 몇 개가 되는지 쓰시오.`,
    `${thing} 전부를 ${n(b)}개씩 담아 ${n(q1)}봉지를 만들었습니다. 처음부터 ${n(c)}개씩 담았다면 몇 봉지가 되었을지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q2),
    `먼저 전체 수를 되짚습니다. ${expr(`${b}\\times${q1}=${a}`)} 이므로 모두 ${n(a)}개입니다. ${expr(`${a}\\div${c}=${q2}`)} 입니다.`,
  );
}

// ── 1-3-4 나눗셈의 몫을 곱셈구구로 구하기 ──

/** 1단 — 구구단 이름을 앞세운 식 틀. 표준(「곱셈구구로 구하시오」 한 틀)과 갈라 둔다. */
function div134Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const dv = expr(`${a}\\div${b}`);
  const stem = pick(rng, [
    `${n(b)}단 곱셈구구를 이용하여 ${dv} 의 몫을 구하시오.`,
    `${n(b)}단 곱셈구구에서 곱이 ${n(a)} 인 곱셈식을 찾아 ${dv} 의 몫을 쓰시오.`,
    `곱셈구구를 이용하여 다음 나눗셈의 몫을 구하시오.\n\n${dv}`,
    `${expr(`${a}\\div${b}=\\square`)} 의 ${expr(`\\square`)} 에 알맞은 수를 ${n(b)}단 곱셈구구에서 찾아 쓰시오.`,
    `${n(b)}단 곱셈구구를 떠올려 ${dv} 의 값을 쓰시오.`,
    `곱셈구구로 다음을 계산하시오.\n\n${expr(`${a}\\div${b}=\\square`)}`,
    `${n(b)}단 곱셈구구에서 ${expr(`${b}\\times\\square=${a}`)} 의 ${expr(`\\square`)} 에 알맞은 수를 찾아 몫을 쓰시오.`,
    `다음 나눗셈의 몫을 곱셈구구에서 찾아 쓰시오.\n\n${dv}`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${n(b)}단 곱셈구구에서 ${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 2단 — «씩» 반복 문장(읽기·자르기·마시기). 구구단으로 몫을 찾는다. */
function div134Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const stem = pick(rng, [
    `동화책 ${n(a)}쪽을 하루에 ${n(b)}쪽씩 읽으면 며칠 만에 다 읽는지 쓰시오.`,
    `길이가 ${n(a)} cm 인 색 테이프를 ${n(b)} cm 씩 자르면 몇 도막이 되는지 쓰시오.`,
    `우유 ${n(a)}컵을 하루에 ${n(b)}컵씩 마시면 며칠 동안 마실 수 있는지 쓰시오.`,
    `계단 ${n(a)}칸을 한 번에 ${n(b)}칸씩 오르면 몇 번 만에 다 오르는지 쓰시오.`,
    `구슬 ${n(a)}개를 한 줄에 ${n(b)}개씩 꿰면 몇 줄이 되는지 쓰시오.`,
    `문제집 ${n(a)}문제를 하루에 ${n(b)}문제씩 풀면 며칠 만에 다 푸는지 쓰시오.`,
    `색종이 ${n(a)}장을 한 사람에게 ${n(b)}장씩 주면 몇 명에게 줄 수 있는지 쓰시오.`,
    `쌓기나무 ${n(a)}개로 한 층에 ${n(b)}개씩 쌓으면 몇 층이 되는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${n(b)}단 곱셈구구에서 ${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 3단 — 몫을 구하고 **거기에 더한다**(두 단계). */
function div134Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const c = intBetween(rng, 1, 5);
  const [p1, p2] = pick(rng, [
    ["동화책", "위인전"],
    ["만화책", "과학책"],
    ["동시집", "소설책"],
    ["그림책", "역사책"],
  ] as const);
  const stem = pick(rng, [
    `${p1} ${n(a)}쪽을 하루에 ${n(b)}쪽씩 읽습니다. ${p2}${josa(p2, "은", "는")} ${p1}보다 ${n(c)}일 더 걸립니다. ${p2}${josa(p2, "을", "를")} 다 읽는 데 며칠 걸리는지 쓰시오.`,
    `${p1} ${n(a)}쪽을 하루에 ${n(b)}쪽씩 읽어 다 읽었습니다. ${p2}${josa(p2, "은", "는")} 그보다 ${n(c)}일 더 걸렸습니다. ${p2}${josa(p2, "은", "는")} 며칠 만에 다 읽었는지 쓰시오.`,
    `하루에 ${n(b)}쪽씩 ${p1} ${n(a)}쪽을 다 읽은 뒤, ${n(c)}일 더 걸려 ${p2}${josa(p2, "을", "를")} 마쳤습니다. ${p2}${josa(p2, "을", "를")} 읽는 데 걸린 날수를 쓰시오.`,
    `${p1} ${n(a)}쪽은 하루 ${n(b)}쪽씩 읽어 며칠 만에 끝냈고, ${p2}${josa(p2, "은", "는")} 그보다 ${n(c)}일이 더 걸렸습니다. ${p2}에 걸린 날수는 며칠인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q + c),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${p1}${josa(p1, "은", "는")} ${n(q)}일 걸립니다. ${expr(`${q}+${c}=${q + c}`)} 이므로 ${p2}${josa(p2, "은", "는")} ${n(q + c)}일 걸립니다.`,
  );
}

/** 4단 — «어떤 수» 두 겹: 묶음 수로 어떤 수를 되짚고, 다른 크기로 다시 묶는다. */
function div134Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, c, q1, q2 } = pick(rng, DIV_COMBOS);
  const boxEq = expr(`\\square\\div${b}=${q1}`);
  const stem = pick(rng, [
    `어떤 수를 ${n(b)} 씩 묶었더니 남김없이 ${n(q1)} 묶음이 되었습니다. 같은 수를 ${n(c)} 씩 묶으면 몇 묶음이 되는지 쓰시오.`,
    `어떤 수를 ${n(b)} 씩 덜어 내면 꼭 ${n(q1)} 번 만에 없어집니다. 같은 수를 ${n(c)} 씩 덜어 내면 몇 번 만에 없어지는지 쓰시오.`,
    `나누는 수가 ${n(b)} 이고 몫이 ${n(q1)} 인 나눗셈이 있습니다. 나뉘는 수는 그대로 두고 나누는 수만 ${n(c)} 이라고 하면 몫이 얼마인지 쓰시오.`,
    `나눗셈의 몫이 ${n(q1)}, 나누는 수가 ${n(b)} 입니다. 나뉘는 수를 먼저 구하고, 그 수를 ${n(c)} 씩 나누었을 때의 몫을 쓰시오.`,
    `${boxEq} 에서 ${expr(`\\square`)} 에 알맞은 수를 찾고, 그 수를 ${n(c)} 씩 묶으면 몇 묶음인지 쓰시오.`,
    `${boxEq} 의 ${expr(`\\square`)} 에 알맞은 수를 구한 다음, 같은 수를 ${n(c)} 씩 덜어 내면 몇 번 만에 없어지는지 쓰시오.`,
    `곱셈구구로 ${boxEq} 의 ${expr(`\\square`)} 에 알맞은 수를 구하고, 이어서 그 수를 ${n(c)} 씩 나눈 몫을 쓰시오.`,
    `어떤 수는 ${n(b)} 단 곱셈구구의 값이고, ${boxEq} 의 ${expr(`\\square`)} 입니다. 이 수를 ${n(c)} 씩 나눈 몫을 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q2),
    // 발문이 묶음·번·몫을 오가므로 해설은 단위 낱말을 고정하지 않는다.
    `${expr(`${b}\\times${q1}=${a}`)} 이므로 어떤 수는 ${n(a)} 입니다. ${expr(`${a}\\div${c}=${q2}`)} 입니다.`,
  );
}

/* ── 1-3 나눗셈 «심화중» — D-113 물결 4 (2026-09-01) ──────────────────────────
 *
 * ── 이 대단원에서 마디를 여는 자리 ──────────────────────────────────────────
 * 초3 나눗셈은 **나머지가 없고 몫이 한 자리**다(소단원 이름이 그 약속이다). 그래서
 * 되짚기의 길은 **곱셈구구뿐**이고, 「전체 수는 되짚었는데 «몇 개씩 몇 묶음»인지
 * 모른다」가 되는 순간 마디가 안 굳는다 — 곱이 $a$ 인 곱셈구구가 **여럿**이기 때문이다.
 * 굳히는 성질은 그 둘의 **크기 관계**다(한 곱셈식에서 나눗셈식이 둘 나오고, 그 둘을
 * 가르는 것이 곧 «어느 쪽이 나누는 수인가»이다 — 1-3 의 이름 그 자체).
 *
 * ── 왜 1-3-3 한 자리인가 ────────────────────────────────────────────────────
 * `1-3-3 심화하` 가 이미 「$b_0$ 씩 묶었더니 $q_0$ 묶음 → $c$ 씩 다시 묶으면?」이다.
 * 거기서 **둘째 나누는 수 $c$ 를 안 주는 것**이 이 갈래다 — 사다리 한 칸이 정확히
 * 「발문이 $c$ 를 주는가」로 갈린다(토대 17 §3 1-3 함정 (b) 가 짚은 그 자리).
 * 나머지 셋은 **비운다** — 같은 재료라 옷만 갈아입힌 같은 문항이 되고(D-66⑸),
 * 1-3-4 심화하는 아예 **같은 풀**(`DIV_COMBOS`)을 쓴다. 보고서 §4 에 수를 적었다.
 *
 * ── 🔴 심화상은 **비웠다 — 세어서** ────────────────────────────────────────
 * 성질(크기 관계)이 후보를 **하나도 못 자르는** 자리는 전수로 **12짝**이고, 거기에
 * 「묶음 수가 한 묶음의 수의 $m$ 배」를 걸어 정확히 하나가 남는 자리는 **4자리 ·
 * 서로 다른 (전체 수, 답) 2가지**($a=12$ · $a=18$)뿐이다. 파일럿이 `2-1-1` 심화상을
 * 「기준 수 $105$ 하나뿐」으로, 물결 2 가 `2-2-1·2-2-2` 를 「3짝」으로 비운 것과
 * **같은 자리**다(원장님 다양성 원칙).
 *
 * ── 🔴 반증 ⑥ 을 이 안에서 잰다 — 공용 자가 여기서 눈이 멀다 ────────────────
 * `forwardReachable` 의 허용 꼴은 전부 `a×b…` 라 **나눗셈이 아예 없다.** 그래서
 * 나눗셈 대단원에서는 1단 「$18\div2$」조차 «안 닿음»이고, 그 0 은 «깨끗»이 아니라
 * **«못 셈»**이다(`probe-elem-tier-backsolve` 가 1-3-1~4 를 「못 재는 소단원」으로 찍는다).
 * 공용 자에 ÷ 를 넣는 것은 **재고 버린 것**이므로(`forwardReach.ts` 머리말 — 심화상의
 * 28%를 거짓으로 문다) 여기 **생성기 안에** 두고, 이 좁은 수 범위에서만 쓴다.
 */

/**
 * 지면에 찍힌 수 둘을 `+ − × ÷` 로 **한 번** 엮어 답에 닿나 (반증 ⑥, 1-3 전용).
 *
 * ⚠️ 「아무 일도 안 하는 연산」은 빼야 한다 — `×1`·`÷1` 은 지면의 수를 그대로 돌려주어
 *    무엇이든 «닿음»으로 만든다(`forwardReachable` 이 곱에 같은 가드를 두는 까닭).
 *    여기서는 지면의 수가 모두 $2$ 이상이라 곱은 안전하지만, 규칙은 같이 적어 둔다.
 */
function div13OneStep(nums: readonly number[], answer: number): boolean {
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      if (a + b === answer) return true;
      if (a - b === answer) return true;
      if (a * b !== a && a * b !== b && a * b === answer) return true;
      if (b !== 0 && a % b === 0 && a / b !== a && a / b === answer)
        return true;
    }
  return false;
}

/** 곱이 $a$ 인 곱셈구구 짝 — 두 수가 모두 $2\sim9$(몫 한 자리라는 소단원 약속). */
function guguPairs(a: number): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 2; k <= 9; k += 1) {
    if (a % k !== 0) continue;
    const q = a / k;
    if (q < 2 || q > 9) continue;
    out.push([k, q]);
  }
  return out;
}

type Div133Mid = {
  /** 전체 수 — 지면에 **없다**(되짚기가 만든다) */
  a: number;
  /** 처음 한 묶음의 수 · 처음 묶음 수 (지면에 찍히는 둘) */
  b0: number;
  q0: number;
  /** 다시 묶을 수 있는 짝 전부 — 해설이 이대로 늘어놓는다 */
  cand: [number, number][];
  /** 굳히는 성질의 방향: 묶음 수가 한 묶음의 수보다 많다(true) / 적다(false) */
  more: boolean;
  /** 성질이 남긴 하나 */
  k: number;
  q: number;
  /** 묶음 수를 묻는가(true) / 한 묶음의 수를 묻는가 */
  askGroups: boolean;
};

/**
 * 🔴 **문턱으로 거르지 않고 목록을 전수로 만든다** — 그래서 어떤 씨앗에서도 안 던진다.
 * 걸러 내는 조건이 곧 이 갈래의 정의다:
 *   ⑴ 다시 묶을 짝이 **둘 이상** — 하나면 마디가 굳어 심화하다(반증 ①)
 *   ⑵ 크기 관계가 **정확히 하나**를 남긴다 — 여럿이면 답이 안 서고, 없으면 문항이 아니다
 *   ⑶ 답이 지면에 이미 없다 · ⑷ 지면 두 수의 한 걸음으로 안 닿는다(반증 ⑥)
 */
function div133MidPool(): Div133Mid[] {
  const out: Div133Mid[] = [];
  for (let b0 = 2; b0 <= 9; b0 += 1)
    for (let q0 = 2; q0 <= 9; q0 += 1) {
      const a = b0 * q0;
      // 🔴 **아래 «둘 이상» 은 지금 풀에서 구조적으로 죽은 가지다** — 지우지 않는다.
      //    변이 하네스가 `< 2` → `< 1` 을 걸었을 때 «산출물이 그대로다»로 판정을
      //    거부했고, 전수로 재니 늘어나는 자리가 **0**이었다. 까닭은 항등식이다:
      //    짝이 둘뿐이면 그 둘은 $(b_0,q_0)$ 와 $(q_0,b_0)$ 이므로, $b_0$ 를 뺀 하나는
      //    반드시 $(q_0,b_0)$ 이고 그 답은 $b_0$ 또는 $q_0$ — **아래 «답이 지면에
      //    있다» 가드가 이미 전부 잡는다.** 그래도 남기는 까닭은 ⑴ 뜻을 적어 두는
      //    자리이고 ⑵ 다른 조건이 바뀌면 되살아나기 때문이다. 「가드가 있다」로
      //    읽지 말 것 — 지금 무는 것은 아래 가드다(물결 3 §9.1 과 같은 자리).
      const cand = guguPairs(a).filter(([k]) => k !== b0);
      if (cand.length < 2) continue;
      for (const more of [true, false]) {
        const hits = cand.filter(([k, q]) => (more ? q > k : q < k));
        if (hits.length !== 1) continue;
        const [k, q] = hits[0]!;
        for (const askGroups of [true, false]) {
          const ans = askGroups ? q : k;
          if (ans === b0 || ans === q0) continue;
          if (div13OneStep([b0, q0], ans)) continue;
          out.push({ a, b0, q0, cand, more, k, q, askGroups });
        }
      }
    }
  if (out.length === 0) throw new Error("1-3-3 심화중 풀이 비었습니다");
  return out;
}

let DIV133_MID: Div133Mid[] | null = null;

/** 곱셈구구 짝을 지면 한 덩어리로 — 숫자마다 감싸면 지면에서 띄어쓰기가 깨진다. */
function guguList(pairs: readonly [number, number][]): string {
  return expr(pairs.map(([k, q]) => `${k}\\times${q}`).join(",\\ "));
}

/**
 * 5단 · 1-3-3 — 둘째 나누는 수를 **안 준다.** 곱셈구구가 짝을 여럿 만들고,
 * **묶음 수와 한 묶음의 수의 크기 관계**가 하나만 남긴다.
 *
 * ⚠️ 해설은 짝을 **늘어놓되 계산하지 않는다** — 늘어놓는 것은 되짚기가 만든 «목록»이고,
 *    거르는 데는 더 계산이 들지 않는다(눈으로 견준다). 그래서 D-115 ⑾ 로 **중**이다.
 *    (물결 2 의 `2-2-3 심화중` 이 후보 $61,62,63$ 을 늘어놓는 것과 **같은 모양**이다.)
 */
function div133Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  DIV133_MID ??= div133MidPool();
  const f = pick(rng, DIV133_MID);
  const thing = pick(rng, PACK_STUFF);
  const 은는 = josa(thing, "은", "는");
  const 이가 = josa(thing, "이", "가");
  const 을를 = josa(thing, "을", "를");
  // ⚠️ 담는 그릇의 낱말을 **발문과 해설이 같이** 쓴다 — 앞판은 발문이 「봉지」인데
  //    해설이 「묶음」이라 한 문항 안에서 낱말이 갈렸다(지면에서 바로 보인다).
  const [w, vPast, vIf, vAgain] = pick(rng, [
    ["묶음", "묶었더니", "묶으면", "묶었더니"],
    ["봉지", "담았더니", "담으면", "담았더니"],
    ["상자", "담았더니", "담으면", "담았더니"],
  ] as const);
  const w이가 = josa(w, "이", "가");
  const cmp = f.more
    ? `${w} 수가 한 ${w}의 수보다 많았습니다`
    : `${w} 수가 한 ${w}의 수보다 적었습니다`;
  const 묶기 = vAgain === "묶었더니";
  // 「한 묶음에 $6$개씩 묶으면」은 겹말이다 — 묶기에서는 그릇 말을 안 붙인다.
  const 그릇 = 묶기 ? "" : `한 ${w}에 `;
  const ask = f.askGroups
    ? `다시 ${묶기 ? "묶은" : "담은"} ${w}${josa(w, "은", "는")} 몇 ${w}인지 쓰시오.`
    : `다시 ${묶기 ? "묶을" : "담을"} 때 한 ${w}에 넣은 수는 몇 개인지 쓰시오.`;
  const ans = f.askGroups ? f.q : f.k;
  const 다시 = `같은 ${thing}${을를} 처음과 다른 수씩 남김없이 다시 ${vAgain} 한 ${w}의 수와 ${w} 수가 모두 한 자리 수였고, ${cmp}.`;
  const stem = pick(rng, [
    `${thing}${이가} 있습니다. 이 ${thing}${을를} ${그릇}${n(f.b0)}개씩 ${vPast} 남는 것 없이 ${n(f.q0)}${w}${w이가} 되었습니다. ${다시} ${ask}`,
    `${thing} 몇 개를 ${그릇}${n(f.b0)}개씩 ${vPast} 꼭 ${n(f.q0)}${w}${w이가} 되었습니다. ${다시} ${ask}`,
    `${thing}${은는} ${그릇}${n(f.b0)}개씩 ${vIf} 남는 것 없이 ${n(f.q0)}${w}${w이가} 됩니다. ${다시} ${ask}`,
    `${thing} 몇 개가 있습니다. ${그릇}${n(f.b0)}개씩 ${vIf} 남는 것 없이 ${n(f.q0)}${w}입니다. ${다시} ${ask}`,
  ]);
  const why = f.more
    ? `${w} 수가 한 ${w}의 수보다 많은 것`
    : `${w} 수가 한 ${w}의 수보다 적은 것`;
  // 🔴 마지막 나눗셈은 **답이 몫이 되는 쪽**으로 적는다 — 그러지 않으면 해설이
  //    답과 다른 수로 끝나 「정답은 마지막 걸음의 값」이라는 이 대단원의 읽는 법이 깨진다.
  const lastDiv = f.askGroups
    ? `${f.a}\\div${f.k}=${f.q}`
    : `${f.a}\\div${f.q}=${f.k}`;
  return makeDeep(unit, stem, n(ans), [
    `먼저 전체 수를 되짚습니다. ${expr(`${f.b0}\\times${f.q0}=${f.a}`)} 이므로 모두 ${n(f.a)}개입니다.`,
    `남김없이 나누어 담는 방법은 곱이 ${n(f.a)} 인 곱셈식에서 찾습니다. 두 수가 모두 한 자리 수이고 처음 ${n(f.b0)}개씩이 아닌 것은 ${guguList(f.cand)} 입니다.`,
    `${why}은 ${expr(`${f.k}\\times${f.q}`)} 하나뿐이므로 ${n(f.k)}개씩 ${n(f.q)}${w}입니다. ` +
      `${expr(lastDiv)} 이므로 답은 ${n(ans)} 입니다.`,
  ]);
}

// ── 1-4 곱셈 (D-72 확대) ────────────────────────────────────────────────
//
// 다섯 소단원이 **같은 네 갈래 함수**를 쓴다 — 수의 약속(몇십·올림 종류)은 `mulCaseOf` 가
// 소단원 이름에서 정하므로, 소단원마다 함수를 두면 같은 코드가 다섯 벌 된다.
// 축(D-72): 1단 식 그대로 · 2단 «씩» 문장 · 3단 곱하고 더하거나 덜기(두 단계) ·
// 4단 «잘못 계산» 역산(더한·뺀 두 방향 — 되짚은 어떤 수가 다시 소단원 풀의 수다).

/** 1단 — 식 그대로. 표준(「다음을 계산하시오」+세로셈 그림)과 틀을 갈라 둔다. */
function mul14Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  const eq = expr(`${a}\\times${b}`);
  const eqBox = expr(`${a}\\times${b}=\\square`);
  const stem = pick(rng, [
    `곱을 구하시오.\n\n${eq}`,
    `${eq} 의 값을 쓰시오.`,
    `${expr(`\\square`)} 에 알맞은 수를 쓰시오.\n\n${eqBox}`,
    `곱셈 ${eq} 의 값을 구하시오.`,
    `다음 곱셈을 하시오.\n\n${eqBox}`,
    `곱셈식 ${eqBox} 에서 ${expr(`\\square`)} 에 알맞은 수를 쓰시오.`,
    `다음 곱셈의 값을 쓰시오.\n\n${eq}`,
    `빈칸에 알맞은 수를 구하시오.\n\n${eqBox}`,
  ]);
  return make(unit, stem, n(p), `${expr(`${a}\\times${b}=${p}`)} 입니다.`);
}

/** 2단 — «씩» 문장. 식은 학생이 세운다(발문에 곱셈 기호가 없다). */
function mul14Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  const stem = pick(rng, [
    `한 상자에 구슬이 ${n(a)}개씩 들어 있습니다. ${n(b)}상자에 들어 있는 구슬은 모두 몇 개인지 쓰시오.`,
    `학생 한 명이 색종이를 ${n(a)}장씩 가졌습니다. ${n(b)}명이 가진 색종이는 모두 몇 장인지 쓰시오.`,
    `하루에 동화책을 ${n(a)}쪽씩 읽습니다. ${n(b)}일 동안 읽는 쪽수는 모두 몇 쪽인지 쓰시오.`,
    `한 봉지에 사탕이 ${n(a)}개씩 담겨 있습니다. ${n(b)}봉지에 담긴 사탕은 모두 몇 개인지 쓰시오.`,
    `꽃 한 다발은 ${n(a)}송이입니다. ${n(b)}다발의 꽃은 모두 몇 송이인지 쓰시오.`,
    `한 줄에 의자가 ${n(a)}개씩 놓여 있습니다. ${n(b)}줄에 놓인 의자는 모두 몇 개인지 쓰시오.`,
    `클립 한 통에 클립이 ${n(a)}개씩 들어 있습니다. ${n(b)}통에 든 클립은 모두 몇 개인지 쓰시오.`,
    `버스 한 대에 ${n(a)}명씩 탈 수 있습니다. 버스 ${n(b)}대에 탈 수 있는 사람은 모두 몇 명인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p),
    `${n(a)}씩 ${n(b)}묶음이므로 곱셈으로 구합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다.`,
  );
}

/** 3단 — 곱한 뒤 낱개를 더하거나 덜어낸다(두 단계). */
function mul14Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  const c = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `귤이 ${n(a)}개씩 든 상자가 ${n(b)}상자 있고, 낱개 귤이 ${n(c)}개 더 있습니다. 귤은 모두 몇 개인지 쓰시오.`,
      `색종이를 ${n(a)}장씩 ${n(b)}묶음 사고, 따로 ${n(c)}장을 더 샀습니다. 색종이는 모두 몇 장인지 쓰시오.`,
      `우표를 ${n(a)}장씩 ${n(b)}줄로 붙이고 ${n(c)}장을 더 붙였습니다. 우표는 모두 몇 장인지 쓰시오.`,
      `구슬을 ${n(a)}개씩 ${n(b)}주머니에 담고 ${n(c)}개를 주머니 밖에 두었습니다. 구슬은 모두 몇 개인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(p + c),
      `${expr(`${a}\\times${b}=${p}`)} 입니다. 낱개까지 더하면 ${expr(`${p}+${c}=${p + c}`)} 입니다.`,
    );
  }
  const stem = pick(rng, [
    `사탕을 ${n(a)}개씩 ${n(b)}봉지 만들었습니다. 그중 ${n(c)}개를 먹으면 남는 사탕은 몇 개인지 쓰시오.`,
    `연필이 ${n(a)}자루씩 ${n(b)}상자 있습니다. ${n(c)}자루를 나누어 주면 남는 연필은 몇 자루인지 쓰시오.`,
    `쿠키를 ${n(a)}개씩 ${n(b)}판 구웠습니다. ${n(c)}개를 맛보면 남는 쿠키는 몇 개인지 쓰시오.`,
    `밤을 ${n(a)}개씩 ${n(b)}봉지에 담았다가 ${n(c)}개를 옆집에 주었습니다. 남은 밤은 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p - c),
    `${expr(`${a}\\times${b}=${p}`)} 입니다. 덜어낸 것을 빼면 ${expr(`${p}-${c}=${p - c}`)} 입니다.`,
  );
}

/** 4단 — «잘못 계산» 역산. 배(倍) 대신 더하거나 뺀 결과에서 어떤 수를 되짚는다. */
function mul14Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  if (intBetween(rng, 0, 1) === 0) {
    const x = a + b;
    const stem = pick(rng, [
      `어떤 수를 ${n(b)}배 하여야 할 것을 잘못하여 ${n(b)} 만큼 더했더니 결과가 ${n(x)} 입니다. 바르게 계산한 값을 쓰시오.`,
      `어떤 수에 ${n(b)} 만큼 더한 결과가 ${n(x)} 입니다. 이 어떤 수를 ${n(b)}배 하면 얼마인지 쓰시오.`,
      `어떤 수를 ${n(b)}배 하여 구해야 하는데, 잘못하여 ${n(b)} 만큼 더했더니 ${n(x)} 입니다. 바르게 ${n(b)}배 한 값을 쓰시오.`,
      `곱하는 수와 더하는 수를 헷갈려, 어떤 수에 ${n(b)} 만큼 더한 결과 ${n(x)} 만 얻었습니다. 원래 구하려던 ${n(b)}배 한 값을 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(p),
      `잘못 계산한 식에서 어떤 수를 되짚습니다. ${expr(`${x}-${b}=${a}`)} 이므로 어떤 수는 ${n(a)} 입니다. 바르게 계산하면 ${expr(`${a}\\times${b}=${p}`)} 입니다.`,
    );
  }
  const x = a - b;
  const stem = pick(rng, [
    `어떤 수를 ${n(b)}배 하여야 할 것을 잘못하여 ${n(b)} 만큼 뺐더니 결과가 ${n(x)} 입니다. 바르게 계산한 값을 쓰시오.`,
    `어떤 수에서 ${n(b)} 만큼 뺀 결과가 ${n(x)} 입니다. 이 어떤 수를 ${n(b)}배 하면 얼마인지 쓰시오.`,
    `어떤 수를 ${n(b)}배 하는 대신 ${n(b)} 만큼 빼는 실수를 해서 결과가 ${n(x)} 입니다. 바르게 계산한 값을 쓰시오.`,
    `어떤 수에서 ${n(b)} 만큼 뺐더니 ${n(x)} 만 남았습니다. 이 어떤 수를 ${n(b)}배 한 값을 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p),
    `잘못 계산한 식에서 어떤 수를 되짚습니다. ${expr(`${x}+${b}=${a}`)} 이므로 어떤 수는 ${n(a)} 입니다. 바르게 계산하면 ${expr(`${a}\\times${b}=${p}`)} 입니다.`,
  );
}

/* ── 1-4 곱셈 «심화중» — D-113 물결 3 (2026-08-31) ──────────────────────────
 *
 * ## 되짚기 재료 — **곱의 일의 자리**
 *
 * 초3 은 이 자리에서 나눗셈을 못 쓴다(1-3 은 곱셈구구 범위·몫 한 자리뿐이고
 * (몇십몇)÷(몇)은 2-2 다). 그래서 곱에서 인수를 되짚는 길은 **곱셈구구뿐**이고,
 * 「$a$ 의 일의 자리 $o$ 에 곱해 일의 자리가 $r$ 이 되는 한 자리 수」는 **둘~넷**이다.
 * 그 마디는 안 굳는다. 굳히는 것은 소단원 **이름 그 자체**인 **올림의 종류**다 —
 * 1-4-2 없음 · 1-4-3 십의 자리에서만 · 1-4-4 일의 자리에서만 · 1-4-5 둘 다.
 * 자리마다 「$o\times k$ 가 $10$ 을 넘나」만 보면 되므로 **끝까지 곱하지 않고**
 * 가른다 → D-115 ⑾ 로 **심화중**이다.
 *
 * ## 자리 수 (전수, `mulCarryClassOf` 를 그대로 부르며 셌다)
 *
 * ```
 *            자리   후보가 하나(=심화하)   성질이 못 자름(=상 후보)
 * 1-4-2       13            21                      0
 * 1-4-3       23            69                      0
 * 1-4-4       25            28                      5
 * 1-4-5       52           242                    170
 * ```
 * 토대 17 §3 이 실측으로 적은 값(13·23·25·52)과 **한 건도 안 어긋난다.**
 *
 * ## 🔴 심화상은 **비웠다** — 토대 17 §2.2 §2 의 권고 그대로
 *
 * 「성질이 못 자름」 175자리(1-4-4 5 · 1-4-5 170)가 곧 심화상 후보다. 그런데 그것을
 * 세우려면 후보를 **곱의 크기**로 갈라야 하고, 그건 **파일럿 `2-1-2`·`2-1-3`
 * 심화상 그 자체**다(「$555$ 에 곱해 일의 자리가 $0$, 곱이 $3000$~$4000$」).
 * §2.2 는 「1-4 는 심화중만 두고 심화상은 2-1 에 남긴다」고 권했고 그대로 따랐다.
 * 그리고 1-4-2·1-4-3 은 **구조적으로 0**이다(위 표) — 일의 자리에서 올림이 없어야
 * 하므로 성질이 반드시 하나로 줄인다.
 *
 * ## ⚠️ 파일럿 `2-1` 과의 겹침을 **어떻게 갈랐나** (§2.2 ㉡)
 *
 * ```
 * 2-1-1·2-1-2 심화중  세 자리 × 한 자리 · 굳히는 성질 = 올림 «횟수»(두 번/세 번)
 * 2-1-3      심화중  **두 자리 × 한 자리** · 굳히는 성질 = **곱의 자릿수**  ← 🔴 같은 자리다
 * 1-4-3·1-4-5 심화중  두 자리 × 한 자리 · 굳히는 성질 = 올림 «자리»(어느 자리에서)
 * ```
 *
 * 🔴 **2-1-1·2-1-2 와는 자릿수가 갈라 준다. 그런데 `2-1-3` 은 안 갈린다** —
 *    2026-08-31 적대 검토가 짚은 자리다. 앞서 여기에 「자릿수가 다르다 · 성질의
 *    종류가 다르다」고 적었는데 **둘 다 거짓**이었다:
 * ```
 * ㉠ `mid213Pool` 은 a = 12..98(몇십 제외) — **같은 (몇십몇)×(몇)** 이다.
 * ㉡ (몇십몇)×(몇)에서 「곱이 세 자리」 ≡ 「십의 자리 올림」 은 **항등식**이다.
 *    a·b = 10(tb + ⌊ob/10⌋) + (ob mod 10) 이고 일의 자리가 9 이하이므로
 *    a·b ≥ 100 ⟺ tb + ⌊ob/10⌋ ≥ 10.  전수 810짝 · 어긋남 0.
 * ```
 *    실측으로 106종 중 **49종**이 파일럿과 $(a,\ 답)$ 까지 같았다(파일럿 자리의 59.8%).
 *    **가르는 유일한 길은 후보들의 십의 자리 올림이 못 갈리게 하는 것**이고, 그것을
 *    `mul14MidPool` 의 가드로 걸었다 — 겹침 **49 → 0**. 그 대가로 1-4-2·1-4-4 는
 *    잔여 3자리가 되어 **비웠다**.
 *
 *    ⚠️ 다음 사람에게: 「자릿수가 다르다」·「성질의 이름이 다르다」는 **가른 근거가
 *       못 된다.** 두 성질이 **같은 후보 집합에서 서로 다른 답을 내는지**를 세라.
 *
 * ## 함정
 *
 * ⑴ 🔴 `probe-elem-section-conditions` 의 `mulCarryClass` 는 발문·해설의 **첫**
 *    `$ab\times c$` 하나만 읽는다. 그래서 해설은 **버릴 후보의 두 자리 곱을 절대 안
 *    쓴다** — 후보 검토는 «일의 자리끼리의 곱»(한 자리 × 한 자리)으로만 하고,
 *    두 자리 곱은 **정답 것 하나**만 맨 끝에 적는다.
 * ⑵ 그 규칙은 **열거 판정기**도 같이 만족시킨다 — 해설의 곱셈 등식이 둘이라
 *    문턱(셋)에 안 닿는다. 후보를 다 곱해 보이면 그건 상의 길이다(D-115 ⑾).
 * ⑶ 🔴 **울타리 문구를 쓰지 않는다** (2026-08-31 적대 검토 뒤 고침). 앞서는 발문이
 *    「$1$ 보다 큰 한 자리 수」라 못 박아 $o=r$ 인 자리(예: $25\times3$)에서 $1$ 이
 *    후보가 되는 것을 막았다. 그런데 그 문구가 **지면에 낱 수 `$1$` 을 하나 더 찍어서**
 *    「지면 두 수의 한 걸음」 자에 `$r+1=$답` 이 걸렸다(씨앗 8 중 4).
 *    지금은 후보를 $0$~$9$ **전부**에서 세고, 그러고도 성질이 하나만 남는 자리만
 *    쓴다 — 문구 없이 답이 하나다. 실측으로 남은 46자리에 $o=r$ 인 것은 **0개**다.
 * ⑷ 답이 $r$ 과 같은 자리는 `answerPrintedOnPage` 가 뺀다($16\times2$ 류).
 * ⑸ **1-4-1 은 비웠다** — (몇십)×(몇) 은 일의 자리 곱이 늘 $0$ 이라 곱의 일의 자리가
 *    항상 $0$ 이고, 남는 성질이 「곱이 두 자리냐 세 자리냐」 하나다. 그건 파일럿
 *    `2-1-3` 심화중의 성질 그 자체다(§2.2 권고: 「2-1 은 자릿수·크기로」).
 */

type Mul14Mid = { a: number; b: number; r: number; cand: number[] };

function mul14MidPool(want: MulCarry): Mul14Mid[] {
  const out: Mul14Mid[] = [];
  for (let t = 1; t <= 9; t += 1)
    for (let o = 1; o <= 9; o += 1)
      for (let b = 2; b <= 9; b += 1) {
        if (mulCarryClassOf(t, o, b) !== want) continue;
        const r = (o * b) % 10;
        const cand: number[] = [];
        // 🔴 후보는 **한 자리 수 전부**($0$~$9$)에서 센다 (2026-08-31 적대 검토 뒤 고침).
        //    앞서는 $2$ 부터 세고 발문에 「$1$ 보다 큰 한 자리 수」라는 **울타리 문구**를
        //    달았는데, 그 문구가 지면에 `$1$` 이라는 **낱 수**를 하나 더 찍었다.
        //    그러면 「지면 두 수의 한 걸음」 자에 `${r}+1=답` 이 걸린다 —
        //    뜻은 없지만(일의 자리 숫자 + 울타리) **지면에는 그렇게 보인다**.
        //    실측: 씨앗 8개 중 4개가 그랬다. 울타리는 없애는 쪽이 옳다 —
        //    $0$~$9$ 를 다 세고도 성질이 하나만 남기면 **문구 없이** 답이 하나다.
        for (let k = 0; k <= 9; k += 1) if ((o * k) % 10 === r) cand.push(k);
        // 후보가 하나면 되짚기만으로 굳는다 — 그건 심화하다(반증 ①).
        if (cand.length < 2) continue;
        // 성질이 정확히 하나만 남겨야 한다. 여럿이면 답이 안 정해지고(문항이 아니다),
        // 그런 자리는 «곱의 크기»로 갈라야 하는데 그건 파일럿 2-1 의 심화상이다.
        if (cand.filter((k) => mulCarryClassOf(t, o, k) === want).length !== 1)
          continue;
        // 🔴 파일럿 `2-1-3` 과 **같은 문항**이 되는 자리를 버린다 (2026-08-31 적대 검토).
        //
        //    (몇십몇)×(몇) 에서 **「곱이 세 자리」 ≡ 「십의 자리 올림」 은 항등식**이다 —
        //    $a\times b = 10\,(tb + \lfloor ob/10 \rfloor) + (ob \bmod 10)$ 이고 일의 자리가
        //    $9$ 이하이므로 $a\times b \ge 100 \iff tb + \lfloor ob/10 \rfloor \ge 10$.
        //    전수 810짝 어긋남 0(`o=0`·`b=1` 을 빼면 648짝). 그래서 후보들의 십의 자리
        //    올림이 갈리는 자리는 **2-1-3 의 「곱의 자릿수」로도 똑같이 갈린다** —
        //    수도 답도 같고 굳히는 문구만 다른 문항이 된다. 실측으로 106종 중 **49종**이
        //    파일럿과 $(a, 답)$ 까지 같았다(파일럿 자리의 59.8%).
        //
        //    ⚠️ 「자릿수가 다르다」·「올림 횟수 ↔ 올림 자리」는 **가르는 근거가 못 된다.**
        //       `mid213Pool` 도 $a = 12..98$(몇십 제외)이라 **같은 (몇십몇)×(몇)** 이고,
        //       위 항등식 때문에 성질의 «종류»도 이 곱셈꼴에서는 하나다.
        //       가르는 유일한 길은 **십의 자리 올림이 후보를 못 가르게** 하는 것이다.
        const tensCarryOf = (k: number) =>
          t * k + Math.floor((o * k) / 10) >= 10;
        if (cand.some((k) => tensCarryOf(k) !== tensCarryOf(cand[0]!)))
          continue;
        const a = t * 10 + o;
        const page = [rat(a), rat(r)];
        if (answerPrintedOnPage(page, rat(b))) continue;
        if (forwardReachable(page, rat(b))) continue;
        out.push({ a, b, r, cand });
      }
  if (out.length === 0) throw new Error(`1-4 심화중 풀이 비었습니다: ${want}`);
  return out;
}

const MUL14_MID: Partial<Record<MulCarry, Mul14Mid[]>> = {};

/**
 * 소단원 이름이 약속한 올림 종류를 **말로**. 발문과 해설이 같은 말을 쓴다.
 * 어미는 자리마다 다르므로 뿌리 하나에서 셋을 만든다 — 문자열을 되고치면 샌다.
 */
function mulCarryStem(c: MulCarry): string {
  if (c === "none") return "올림이 없";
  if (c === "ones") return "일의 자리에서만 올림이 있";
  if (c === "tens") return "십의 자리에서만 올림이 있";
  return "일의 자리와 십의 자리에서 모두 올림이 있";
}

const mulCarryWords = (c: MulCarry) => `${mulCarryStem(c)}습니다`;
const mulCarryAdnom = (c: MulCarry) => `${mulCarryStem(c)}는`;
const mulCarryIf = (c: MulCarry) => `${mulCarryStem(c)}다면`;

/**
 * 후보 하나를 **왜 버리는가** — 어긋나는 **첫 자리**만 말한다.
 * 두 자리 곱을 쓰지 않는 것이 이 함수의 알맹이다(위 함정 ⑴·⑵).
 */
function mul14Why(t: number, o: number, k: number, want: MulCarry): string {
  const onesCarry = o * k >= 10;
  const wantOnes = want === "ones" || want === "both";
  // ⚠️ 수 뒤에 «을/를·이/가» 를 쓰지 않는다 — 읽는 소리로 갈린다(`josa` 머리말).
  //    「$k$ 일 때는 … 입니다」 만 쓴다.
  if (onesCarry !== wantOnes) {
    return (
      `곱하는 수가 ${n(k)} 일 때는 일의 자리끼리의 곱이 ${n(o * k)} 입니다. ` +
      `그래서 일의 자리에서 올림이 ${onesCarry ? "생깁니다" : "생기지 않습니다"}`
    );
  }
  const tens = t * k + Math.floor((o * k) / 10);
  return (
    `곱하는 수가 ${n(k)} 일 때는 십의 자리끼리의 곱에 올림까지 더하면 ${n(tens)} 입니다. ` +
    `그래서 십의 자리에서 올림이 ${tens >= 10 ? "생깁니다" : "생기지 않습니다"}`
  );
}

/** 5단 · 1-4-2~5 — 곱의 일의 자리가 후보를 만들고 **올림의 종류**가 하나를 남긴다. */
function mul14Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const want = mulCarryOfSection(unit.section);
  MUL14_MID[want] ??= mul14MidPool(want);
  const f = pick(rng, MUL14_MID[want]!);
  const t = Math.floor(f.a / 10);
  const o = f.a % 10;
  const words = mulCarryWords(want);
  const stem = pick(rng, [
    `곱셈식 ${expr(`${f.a}\\times\\square`)} 의 ${expr(`\\square`)} 에는 한 자리 수가 들어갑니다. 곱의 일의 자리 숫자가 ${n(f.r)} 이고 이 곱셈은 ${words}. ${expr(`\\square`)} 에 알맞은 수를 구하시오.`,
    `${n(f.a)} 에 한 자리 수를 곱했습니다. 곱의 일의 자리 숫자가 ${n(f.r)} 이고 이 곱셈은 ${words}. 곱한 수를 쓰시오.`,
    `어떤 수는 한 자리 수입니다. ${n(f.a)} 에 어떤 수를 곱한 값은 일의 자리 숫자가 ${n(f.r)} 이고, 그 곱셈은 ${words}. 어떤 수를 구하시오.`,
    `${expr(`${f.a}\\times\\square`)} 의 곱은 일의 자리 숫자가 ${n(f.r)} 입니다. 이 곱셈은 ${words}. ${expr(`\\square`)} 에 들어갈 한 자리 수를 쓰시오.`,
    `한 자리 수 가운데, ${n(f.a)} 에 곱했을 때 곱의 일의 자리 숫자가 ${n(f.r)} 이고 ${mulCarryAdnom(want)} 수를 구하시오.`,
    `${n(f.a)} 에 한 자리 수를 곱하려고 합니다. 곱의 일의 자리 숫자는 ${n(f.r)} 이며, 이 곱셈은 ${words}. 곱하는 수를 쓰시오.`,
    `${n(f.a)} 에 한 자리 수를 곱했더니 곱의 일의 자리 숫자가 ${n(f.r)} 이었습니다. 그 곱셈이 ${mulCarryIf(want)} 곱한 한 자리 수는 얼마인지 쓰시오.`,
    `곱하는 수가 한 자리 수입니다. ${n(f.a)} 에 그 수를 곱한 곱의 일의 자리 숫자가 ${n(f.r)} 이고, 그 곱셈은 ${words}. 곱하는 수를 구하시오.`,
  ]);
  const why = f.cand
    .filter((k) => k !== f.b)
    .map((k) => mul14Why(t, o, k, want))
    .join(". ");
  return makeDeep(unit, stem, n(f.b), [
    `곱의 일의 자리 숫자는 ${n(f.a)} 의 일의 자리인 ${n(o)} 에 곱하는 수를 곱한 값에서 정해집니다. ` +
      `그 일의 자리가 ${n(f.r)} 인 수는 ${expr(f.cand.join(",\\ "))} 입니다.`,
    `${why}.`,
    `곱하는 수가 ${n(f.b)} 일 때는 일의 자리끼리의 곱이 ${expr(`${o}\\times${f.b}=${o * f.b}`)}, ` +
      `십의 자리끼리의 곱에 올림까지 더하면 ${n(t * f.b + Math.floor((o * f.b) / 10))} 입니다. 그래서 ${words}.`,
    `따라서 곱하는 수는 ${n(f.b)} 이고 ${expr(`${f.a}\\times${f.b}=${f.a * f.b}`)} 입니다.`,
  ]);
}

// ── 1-5 길이와 시간 (D-72 확대) ──────────────────────────────────────────
//
// 단위 경계(10 mm·1000 m·60초·60분)의 받아올림·내림이 이 대단원의 알맹이다.
// 그림은 쓰지 않는다 — 필요한 자리가 생기면 기존 kind(clock·tape·timeAdd)만 쓰고,
// 새 형태는 리드 경유(D-61). 길이 두 소단원(1-5-1·1-5-2)은 단위만 다르고 구조가
// 같아 **공장 하나**를 나눠 쓴다(subCalcOf 와 같은 방식 — 규칙이 두 벌이 되지 않게).

type LenCfg = {
  big: string;
  small: string;
  mul: number;
  smallPick: (rng: Rng) => number;
  /** 「연필의 길이는」·「집에서 학교까지의 거리는」 — 소재가 딸린 주어. */
  subject: (rng: Rng) => string;
  word: string;
};

const LEN_CM: LenCfg = {
  big: "cm",
  small: "mm",
  mul: 10,
  smallPick: (rng) => intBetween(rng, 1, 9),
  subject: (rng) =>
    `${pick(rng, ["연필", "못", "클립", "지우개", "열쇠", "크레파스", "빨대", "나뭇잎"])}의 길이는`,
  word: "길이",
};

const LEN_KM: LenCfg = {
  big: "km",
  small: "m",
  // 몇백 m 로만 뽑는다 — 초3 1-5-2 는 «몇 km 몇백 m» 까지만 다룬다(표준과 같은 눈금).
  mul: 1000,
  smallPick: (rng) => intBetween(rng, 1, 9) * 100,
  subject: (rng) =>
    `${pick(rng, ["집에서 학교까지", "집에서 도서관까지", "학교에서 공원까지", "집에서 놀이터까지", "학교에서 우체국까지", "집에서 시장까지", "공원에서 도서관까지", "집에서 문구점까지"])}의 거리는`,
  word: "거리",
};

const mixedLen = (cfg: LenCfg, k: number, e: number) =>
  `$${k}\\,\\mathrm{${cfg.big}}\\ ${e}\\,\\mathrm{${cfg.small}}$`;

/** 1단 — 단위 변환 식 그대로. 표준(「□ 안에 알맞은 수」)과 지시문을 갈라 둔다. */
function lenCalcOf(cfg: LenCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const k = intBetween(rng, 2, 9);
    const e = cfg.smallPick(rng);
    const total = k * cfg.mul + e;
    // ⚠️ 식은 KaTeX 한 덩어리라 변형 공간 정규화($…$→#)에서 지워진다 — 지시문이
    //    틀마다 달라야 8종이 산다(형×지시문 2 = 8).
    const form = intBetween(rng, 0, 3);
    const prompt = pick(
      rng,
      [
        [
          `$\\square$ 에 알맞은 수를 쓰시오.`,
          `큰 단위를 작은 단위로 바꾸어 빈칸을 채우시오.`,
        ],
        [
          `빈칸에 알맞은 수를 구하시오.`,
          `몇 ${cfg.big} 몇 ${cfg.small}인 값을 ${cfg.small} 단위로 바꾸어 $\\square$ 에 쓰시오.`,
        ],
        [
          `$\\square$ 안에 알맞은 수를 구하시오.`,
          `작은 단위를 큰 단위로 바꾸어 빈칸을 채우시오.`,
        ],
        [`빈칸에 알맞은 수를 쓰시오.`, `$\\square$ 에 들어갈 수를 구하시오.`],
      ][form]!,
    );
    if (form === 0) {
      return make(
        unit,
        `${prompt}\n\n$${k}\\,\\mathrm{${cfg.big}}=\\square\\,\\mathrm{${cfg.small}}$`,
        n(k * cfg.mul),
        `$1\\,\\mathrm{${cfg.big}}=${cfg.mul}\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`${cfg.mul}\\times${k}=${k * cfg.mul}`)} 입니다.`,
      );
    }
    if (form === 1) {
      return make(
        unit,
        `${prompt}\n\n$${k}\\,\\mathrm{${cfg.big}}\\ ${e}\\,\\mathrm{${cfg.small}}=\\square\\,\\mathrm{${cfg.small}}$`,
        n(total),
        `$1\\,\\mathrm{${cfg.big}}=${cfg.mul}\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`${cfg.mul}\\times${k}=${k * cfg.mul}`)} 이고, ${expr(`${k * cfg.mul}+${e}=${total}`)} 입니다.`,
      );
    }
    if (form === 2) {
      return make(
        unit,
        `${prompt}\n\n$${k * cfg.mul}\\,\\mathrm{${cfg.small}}=\\square\\,\\mathrm{${cfg.big}}$`,
        n(k),
        `$${cfg.mul}\\,\\mathrm{${cfg.small}}=1\\,\\mathrm{${cfg.big}}$ 이므로 ${unitNum(k * cfg.mul, cfg.small)} 는 ${unitNum(k, cfg.big)} 입니다.`,
      );
    }
    return make(
      unit,
      `${prompt}\n\n$${total}\\,\\mathrm{${cfg.small}}=${k}\\,\\mathrm{${cfg.big}}\\ \\square\\,\\mathrm{${cfg.small}}$`,
      n(e),
      `$${k}\\,\\mathrm{${cfg.big}}=${k * cfg.mul}\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`${total}-${k * cfg.mul}=${e}`)} 입니다.`,
    );
  };
}

/** 2단 — 문장으로 변환. 방향(큰→작은·작은→큰)을 오간다. */
function lenWordOf(cfg: LenCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const k = intBetween(rng, 2, 9);
    const e = cfg.smallPick(rng);
    const total = k * cfg.mul + e;
    const sub = cfg.subject(rng);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${sub} ${mixedLen(cfg, k, e)} 입니다. 이 ${cfg.word}는 몇 ${cfg.small}인지 쓰시오.`,
        n(total),
        `$1\\,\\mathrm{${cfg.big}}=${cfg.mul}\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`${cfg.mul}\\times${k}=${k * cfg.mul}`)} 이고, ${expr(`${k * cfg.mul}+${e}=${total}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `${sub} ${unitNum(total, cfg.small)} 입니다. 이 ${cfg.word}는 몇 ${cfg.big} 몇 ${cfg.small}인지 쓰시오.`,
      mixedLen(cfg, k, e),
      `$${cfg.mul}\\,\\mathrm{${cfg.small}}=1\\,\\mathrm{${cfg.big}}$ 이므로 ${unitNum(total, cfg.small)} 는 ${mixedLen(cfg, k, e)} 입니다.`,
    );
  };
}

/** 3단 — 둘을 이어(더해) 작은 단위로 구한다(변환 두 번 + 덧셈). */
function lenApplyOf(cfg: LenCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const k1 = intBetween(rng, 1, 4);
    const e1 = cfg.smallPick(rng);
    const k2 = intBetween(rng, 1, 4);
    const e2 = cfg.smallPick(rng);
    const t1 = k1 * cfg.mul + e1;
    const t2 = k2 * cfg.mul + e2;
    const stem =
      cfg.big === "cm"
        ? pick(rng, [
            `길이가 ${mixedLen(cfg, k1, e1)} 인 색 테이프와 ${mixedLen(cfg, k2, e2)} 인 색 테이프를 겹치지 않게 이었습니다. 이은 길이는 모두 몇 mm인지 쓰시오.`,
            `${mixedLen(cfg, k1, e1)} 인 리본과 ${mixedLen(cfg, k2, e2)} 인 리본을 나란히 이으면 전체 길이는 몇 mm인지 쓰시오.`,
            `막대 두 개의 길이가 각각 ${mixedLen(cfg, k1, e1)}, ${mixedLen(cfg, k2, e2)} 입니다. 두 막대를 이은 길이는 몇 mm인지 쓰시오.`,
            `철사 ${mixedLen(cfg, k1, e1)} 와 ${mixedLen(cfg, k2, e2)} 를 이어 붙였습니다. 전체 길이는 몇 mm인지 쓰시오.`,
            `색 테이프 두 장을 ${mixedLen(cfg, k1, e1)} 와 ${mixedLen(cfg, k2, e2)} 만큼 잘랐습니다. 자른 길이를 모두 더하면 몇 mm인지 쓰시오.`,
            `털실을 어제 ${mixedLen(cfg, k1, e1)}, 오늘 ${mixedLen(cfg, k2, e2)} 만큼 썼습니다. 이틀 동안 쓴 털실은 몇 mm인지 쓰시오.`,
            `종이띠 ${mixedLen(cfg, k1, e1)} 와 ${mixedLen(cfg, k2, e2)} 를 나란히 붙였습니다. 붙인 종이띠의 전체 길이는 몇 mm인지 쓰시오.`,
            `개미가 ${mixedLen(cfg, k1, e1)} 를 기어가고 이어서 ${mixedLen(cfg, k2, e2)} 를 더 기어갔습니다. 개미가 움직인 거리는 몇 mm인지 쓰시오.`,
          ])
        : pick(rng, [
            `집에서 학교까지는 ${mixedLen(cfg, k1, e1)} 이고, 학교에서 공원까지는 ${mixedLen(cfg, k2, e2)} 입니다. 집에서 학교를 지나 공원까지 가는 거리는 몇 m인지 쓰시오.`,
            `집에서 도서관까지는 ${mixedLen(cfg, k1, e1)}, 도서관에서 시장까지는 ${mixedLen(cfg, k2, e2)} 입니다. 집에서 도서관을 지나 시장까지의 거리는 몇 m인지 쓰시오.`,
            `등산로 입구에서 쉼터까지는 ${mixedLen(cfg, k1, e1)} 이고, 쉼터에서 정상까지는 ${mixedLen(cfg, k2, e2)} 입니다. 입구에서 정상까지의 거리는 몇 m인지 쓰시오.`,
            `자전거로 오전에 ${mixedLen(cfg, k1, e1)}, 오후에 ${mixedLen(cfg, k2, e2)} 를 달렸습니다. 하루 동안 달린 거리는 몇 m인지 쓰시오.`,
            `마을 한 바퀴 중 큰길이 ${mixedLen(cfg, k1, e1)}, 골목길이 ${mixedLen(cfg, k2, e2)} 입니다. 마을 한 바퀴는 몇 m인지 쓰시오.`,
            `아침에 ${mixedLen(cfg, k1, e1)}, 저녁에 ${mixedLen(cfg, k2, e2)} 를 걸었습니다. 하루 동안 걸은 거리는 몇 m인지 쓰시오.`,
            `버스로 ${mixedLen(cfg, k1, e1)} 를 가고 걸어서 ${mixedLen(cfg, k2, e2)} 를 더 갔습니다. 이동한 거리는 모두 몇 m인지 쓰시오.`,
            `강 상류 구간 ${mixedLen(cfg, k1, e1)} 와 하류 구간 ${mixedLen(cfg, k2, e2)} 를 이어 배를 탔습니다. 배로 간 거리는 몇 m인지 쓰시오.`,
          ]);
    return make(
      unit,
      stem,
      n(t1 + t2),
      `${mixedLen(cfg, k1, e1)} 는 ${unitNum(t1, cfg.small)}, ${mixedLen(cfg, k2, e2)} 는 ${unitNum(t2, cfg.small)} 입니다. ${expr(`${t1}+${t2}=${t1 + t2}`)} 입니다.`,
    );
  };
}

/**
 * 4단 — **두 도막을 이은 뒤** 일부를 덜어 낸다. 환산이 둘, 셈이 둘이다.
 *
 * ⚠️ 예전에는 「전체 $W$ 에서 한 도막 $x$ cm $y$ mm 를 뺀다」였다 — 환산 한 번 + 뺄셈인데,
 *    같은 소단원 **응용이 환산 두 번 + 덧셈**이라 사다리가 뒤집혀 있었다(3.3 ㉢ 부류).
 *    이제 응용이 하는 일을 다 하고 **한 걸음 더** 간다.
 */
function lenDeepOf(cfg: LenCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const k1 = intBetween(rng, 1, 4);
    const e1 = cfg.smallPick(rng);
    const k2 = intBetween(rng, 1, 4);
    const e2 = cfg.smallPick(rng);
    const t1 = k1 * cfg.mul + e1;
    const t2 = k2 * cfg.mul + e2;
    const joined = t1 + t2;
    const cut = intBetween(rng, 2, 9) * (cfg.mul === 10 ? 1 : 100);
    const left = joined - cut;
    const A = mixedLen(cfg, k1, e1);
    const B = mixedLen(cfg, k2, e2);
    const C = unitNum(cut, cfg.small);
    const stem =
      cfg.big === "cm"
        ? pick(rng, [
            `색 테이프 ${A} 와 ${B} 를 겹치지 않게 이은 뒤 ${C} 를 잘라 냈습니다. 남은 길이는 몇 mm인지 쓰시오.`,
            `끈 ${A} 와 ${B} 를 이어 붙이고 ${C} 만큼 잘라 썼습니다. 남은 끈은 몇 mm인지 쓰시오.`,
            `리본 ${A} 와 ${B} 를 이은 다음 ${C} 를 선물 포장에 썼습니다. 남은 리본은 몇 mm인지 쓰시오.`,
            `털실 ${A} 와 ${B} 를 이어 놓고 ${C} 만큼 잘라 냈습니다. 남은 털실은 몇 mm인지 쓰시오.`,
            `철사 ${A} 와 ${B} 를 이어 붙인 뒤 ${C} 를 잘라 버렸습니다. 남은 철사는 몇 mm인지 쓰시오.`,
            `실 ${A} 와 ${B} 를 이었습니다. 그중 ${C} 를 이미 썼다면 남은 실은 몇 mm인지 쓰시오.`,
            `빨대 ${A} 와 ${B} 를 이어 하나로 만들고 ${C} 만큼 잘라 냈습니다. 남은 빨대는 몇 mm인지 쓰시오.`,
            `테이프 ${A} 와 ${B} 를 겹치지 않게 붙인 다음 ${C} 를 떼어 냈습니다. 남은 테이프는 몇 mm인지 쓰시오.`,
          ])
        : pick(rng, [
            `집에서 학교까지 ${A}, 학교에서 공원까지 ${B} 입니다. 그중 ${C} 를 버스로 갔다면 걸은 거리는 몇 m인지 쓰시오.`,
            `산책로의 앞 구간이 ${A}, 뒤 구간이 ${B} 입니다. 지금까지 ${C} 를 걸었다면 남은 거리는 몇 m인지 쓰시오.`,
            `자전거로 ${A} 를 가고 이어서 ${B} 를 더 갔습니다. 그중 ${C} 는 내리막이었다면 내리막이 아닌 거리는 몇 m인지 쓰시오.`,
            `강 상류 구간 ${A} 와 하류 구간 ${B} 를 이어 배를 타기로 했습니다. 이미 ${C} 를 갔다면 남은 거리는 몇 m인지 쓰시오.`,
            `등굣길 앞쪽이 ${A}, 뒤쪽이 ${B} 입니다. ${C} 를 이미 걸어왔다면 학교까지 남은 거리는 몇 m인지 쓰시오.`,
            `기차가 갈 길이 ${A} 와 ${B} 로 이어져 있습니다. 지금까지 ${C} 를 왔다면 남은 거리는 몇 m인지 쓰시오.`,
            `호수 둘레의 한쪽이 ${A}, 다른 쪽이 ${B} 입니다. ${C} 만큼 걸었다면 한 바퀴까지 남은 거리는 몇 m인지 쓰시오.`,
            `마라톤 연습 구간이 ${A} 와 ${B} 입니다. 지금까지 ${C} 를 달렸다면 남은 거리는 몇 m인지 쓰시오.`,
          ]);
    return makeDeep(unit, stem, n(left), [
      `${A} 는 ${expr(`${k1}\\times${cfg.mul}+${e1}=${t1}`)} 이고 ` +
        `${B} 는 ${expr(`${k2}\\times${cfg.mul}+${e2}=${t2}`)} 입니다 (단위: ${cfg.small}).`,
      `이으면 ${expr(`${t1}+${t2}=${joined}`)} 이고, ` +
        `${expr(`${joined}-${cut}=${left}`)} 이므로 ${unitNum(left, cfg.small)} 입니다.`,
    ]);
  };
}

// ── 1-5-3 길이와 거리를 어림하고 재어 보기 ──

const GUESS_THINGS = [
  "지우개",
  "풀",
  "가위",
  "색연필",
  "머리핀",
  "클립",
  "열쇠",
  "못",
] as const;

/** 1단 — 어림값의 단위 변환 한 걸음. */
function guessCalc(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, GUESS_THINGS);
  const g = intBetween(rng, 3, 9);
  const stem = pick(rng, [
    `${thing}의 길이를 약 ${unitNum(g, "cm")} 로 어림했습니다. 어림한 길이는 몇 mm인지 쓰시오.`,
    `${thing}의 길이를 어림했더니 약 ${unitNum(g, "cm")} 였습니다. 이 어림값을 mm 로 나타내시오.`,
  ]);
  return make(
    unit,
    stem,
    n(g * 10),
    `$1\\,\\mathrm{cm}=10\\,\\mathrm{mm}$ 이므로 ${expr(`10\\times${g}=${g * 10}`)} 입니다.`,
  );
}

/** 2단 — 누가 더 가깝게 어림했는지 문장으로 판단한다. */
function guessWord(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, GUESS_THINGS);
  const [nameA, nameB] = pick(rng, [
    ["가은", "나윤"],
    ["다인", "라온"],
    ["시우", "하람"],
    ["도현", "서진"],
  ] as const);
  const real = intBetween(rng, 40, 90);
  // 두 어림의 «거리»가 반드시 갈리게 뽑는다 — 가까운 쪽과 먼 쪽을 따로 만든다.
  const nearOff = pick(rng, [-4, -3, -2, 2, 3, 4]);
  const farOff = pick(rng, [-9, -8, 8, 9, 11, 12]);
  const aIsNear = intBetween(rng, 0, 1) === 0;
  const gNearMm = real + nearOff;
  const gFarMm = real + farOff;
  // 어림을 cm 로 반올림해 말하면 두 어림값이 같아져 차가 안 갈릴 수 있다 —
  // mm 그대로 말하게 한다(어림을 mm 로 말하는 것도 교과서에 있다).
  const gA = aIsNear ? gNearMm : gFarMm;
  const gB = aIsNear ? gFarMm : gNearMm;
  const dA = Math.abs(gA - real);
  const dB = Math.abs(gB - real);
  const winner = dA < dB ? nameA : nameB;
  return make(
    unit,
    pick(rng, [
      `${thing}의 실제 길이는 ${unitNum(real, "mm")} 입니다. ${nameA}${josa(nameA, "이", "가")} 약 ${unitNum(gA, "mm")}, ${nameB}${josa(nameB, "이", "가")} 약 ${unitNum(gB, "mm")} 로 어림했다면 실제 길이에 더 가깝게 어림한 사람의 이름을 쓰시오.`,
      `실제 길이가 ${unitNum(real, "mm")} 인 ${thing}${josa(thing, "을", "를")} ${nameA}${josa(nameA, "은", "는")} 약 ${unitNum(gA, "mm")}, ${nameB}${josa(nameB, "은", "는")} 약 ${unitNum(gB, "mm")} 로 어림했습니다. 더 가깝게 어림한 사람은 누구인지 이름을 쓰시오.`,
    ]),
    winner,
    `${nameA}의 차는 ${expr(`${Math.max(gA, real)}-${Math.min(gA, real)}=${dA}`)} 이고, ${nameB}의 차는 ${expr(`${Math.max(gB, real)}-${Math.min(gB, real)}=${dB}`)} 입니다. 차가 더 작은 ${winner}${josa(winner, "이", "가")} 더 가깝게 어림했습니다.`,
  );
}

/** 3단 — 어림과 실측의 차를 구하고, 두 사람의 차까지 견준다(두 단계). */
function guessApply(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, GUESS_THINGS);
  const real = intBetween(rng, 40, 90);
  const nearOff = pick(rng, [-4, -3, -2, 2, 3, 4]);
  const farOff = pick(rng, [-9, -8, 8, 9, 11, 12]);
  const g1 = real + nearOff;
  const g2 = real + farOff;
  const d1 = Math.abs(g1 - real);
  const d2 = Math.abs(g2 - real);
  const gap = Math.abs(d1 - d2);
  return make(
    unit,
    pick(rng, [
      `${thing}의 실제 길이는 ${unitNum(real, "mm")} 입니다. 형은 약 ${unitNum(g1, "mm")}, 동생은 약 ${unitNum(g2, "mm")} 로 어림했습니다. 두 사람의 어림값과 실제 길이의 차는 서로 몇 mm 차이 나는지 쓰시오.`,
      `실제 길이가 ${unitNum(real, "mm")} 인 ${thing}${josa(thing, "을", "를")} 형은 약 ${unitNum(g1, "mm")}, 동생은 약 ${unitNum(g2, "mm")} 로 어림했습니다. 누가 몇 mm 더 가깝게 어림했는지 그 차이를 쓰시오.`,
    ]),
    n(gap),
    `형의 차는 ${expr(`${Math.max(g1, real)}-${Math.min(g1, real)}=${d1}`)} 이고, 동생의 차는 ${expr(`${Math.max(g2, real)}-${Math.min(g2, real)}=${d2}`)} 입니다. ${expr(`${Math.max(d1, d2)}-${Math.min(d1, d2)}=${gap}`)} 이므로 ${unitNum(gap, "mm")} 차이 납니다.`,
  );
}

/** 4단 — 역산: 어림값과 「몇 mm 길다·짧다」에서 실제 길이를 되짚는다. */
function guessDeep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 예전에는 어림값에서 한 번 더하거나 빼면 끝이었다(환산 + 셈 한 번). 같은 소단원
  //    응용이 **두 사람의 어림을 실제와 각각 견주는 세 걸음**이라 사다리가 뒤집혀 있었다.
  //    이제 한 사람의 어림에서 실제를 되짚고, **다른 사람의 어림과 다시 견준다**.
  const thing = pick(rng, GUESS_THINGS);
  const g = intBetween(rng, 4, 9);
  const d = intBetween(rng, 2, 9);
  const longer = intBetween(rng, 0, 1) === 0;
  const real = g * 10 + (longer ? d : -d);
  // 둘째 어림은 실제보다 **길게** 잡는다 — 답이 음수가 되지 않게.
  const g2 = intBetween(rng, Math.max(g + 1, Math.floor(real / 10) + 1), 13);
  const gap = g2 * 10 - real;
  return makeDeep(
    unit,
    pick(rng, [
      `${thing}의 길이를 형은 약 ${unitNum(g, "cm")} 로 어림했는데, 실제 길이는 형의 어림보다 ` +
        `${unitNum(d, "mm")} 더 ${longer ? "깁니다" : "짧습니다"}. 동생은 약 ${unitNum(g2, "cm")} 로 ` +
        `어림했다면, 동생의 어림은 실제 길이보다 몇 mm 더 긴지 쓰시오.`,
      `${thing}${josa(thing, "을", "를")} 형은 약 ${unitNum(g, "cm")} 로 어림했고, 자로 재니 ` +
        `형의 어림보다 ${unitNum(d, "mm")} 더 ${longer ? "길었습니다" : "짧았습니다"}. ` +
        `동생의 어림 약 ${unitNum(g2, "cm")} 는 실제 길이보다 몇 mm 더 긴지 쓰시오.`,
    ]),
    n(gap),
    [
      `형이 어림한 ${unitNum(g, "cm")} 는 ${unitNum(g * 10, "mm")} 이므로 실제 길이는 ` +
        `${expr(longer ? `${g * 10}+${d}=${real}` : `${g * 10}-${d}=${real}`)} 입니다.`,
      `동생이 어림한 ${unitNum(g2, "cm")} 는 ${unitNum(g2 * 10, "mm")} 이므로 ` +
        `${expr(`${g2 * 10}-${real}=${gap}`)} 입니다.`,
    ],
  );
}

// ── 1-5-4 1분보다 작은 단위 · 1-5-5 시간의 덧셈 · 1-5-6 시간의 뺄셈 ──
//
// 60 경계가 알맹이다. 갈래는 올림·내림이 «있는 씨앗과 없는 씨앗»을 섞는다(소단원
// 이름에 조건이 없으므로 둘 다 소단원 안이다 — 표준은 늘 경계를 넘긴다).
// 답의 분·초 자리는 반드시 정규화(< 60)되고 $0$ 이 되지 않게 **뽑을 때** 막는다.

const hmStr = (h: number, m: number) => `${n(h)}시간 ${n(m)}분`;
const clockStr = (h: number, m: number) => `${n(h)}시 ${n(m)}분`;
const msStr = (m: number, s: number) => `${n(m)}분 ${n(s)}초`;

/** 시간 두 벌의 합 — carry 여부를 씨앗이 고르고, 합의 분이 $0$ 이 되지 않게 뽑는다. */
function addHm(rng: Rng): {
  h1: number;
  m1: number;
  h2: number;
  m2: number;
  hh: number;
  mm: number;
} {
  const carry = intBetween(rng, 0, 1) === 1;
  const h1 = intBetween(rng, 1, 4);
  const h2 = intBetween(rng, 1, 3);
  let m1: number;
  let m2: number;
  if (carry) {
    m1 = intBetween(rng, 6, 55);
    m2 = intBetween(rng, Math.max(6, 61 - m1), 55);
  } else {
    m1 = intBetween(rng, 1, 58);
    m2 = intBetween(rng, 1, 59 - m1);
  }
  const total = m1 + m2;
  return {
    h1,
    m1,
    h2,
    m2,
    hh: h1 + h2 + (total >= 60 ? 1 : 0),
    mm: total % 60,
  };
}

/** 시간 두 벌의 차 — borrow 여부를 씨앗이 고른다. 앞이 늘 크다. */
function subHm(rng: Rng): {
  h1: number;
  m1: number;
  sh: number;
  sm: number;
  hh: number;
  mm: number;
} {
  const borrow = intBetween(rng, 0, 1) === 1;
  if (borrow) {
    const h1 = intBetween(rng, 3, 8);
    const sh = intBetween(rng, 1, h1 - 2);
    const m1 = intBetween(rng, 5, 25);
    const sm = intBetween(rng, m1 + 5, 55);
    return { h1, m1, sh, sm, hh: h1 - 1 - sh, mm: m1 + 60 - sm };
  }
  const h1 = intBetween(rng, 2, 8);
  const sh = intBetween(rng, 1, h1 - 1);
  const m1 = intBetween(rng, 10, 55);
  const sm = intBetween(rng, 1, m1 - 1);
  return { h1, m1, sh, sm, hh: h1 - sh, mm: m1 - sm };
}

/** 분↔초 해설 한 줄 — «1분은 60초» 근거를 늘 같은 모양으로 쓴다. */
const minToSec = (m: number) =>
  `$1$ 분은 $60$ 초이므로 ${expr(`60\\times${m}=${m * 60}`)} 입니다.`;

// ── 1-5-4 1분보다 작은 단위 ──

/** 1단 — 분↔초 변환 식 그대로. 표준(「몇 초인지 쓰시오」 두 틀)과 말투를 갈라 둔다. */
function sec154Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 2, 5);
  const s = intBetween(rng, 1, 59);
  const form = intBetween(rng, 0, 3);
  const prompt = intBetween(rng, 0, 1);
  if (form === 0) {
    return make(
      unit,
      prompt === 0
        ? `${n(m)}분을 초로 나타내시오.`
        : `${n(m)}분과 같은 시간은 몇 초인지 구하시오.`,
      n(m * 60),
      minToSec(m),
    );
  }
  if (form === 1) {
    const t = m * 60 + s;
    return make(
      unit,
      prompt === 0
        ? `${n(t)}초를 몇 분 몇 초로 나타내시오.`
        : `${n(t)}초와 같은 시간을 몇 분 몇 초로 쓰시오.`,
      msStr(m, s),
      `$60$ 초는 $1$ 분이므로 ${n(t)}초는 ${msStr(m, s)}입니다. 검산하면 ${expr(`${m * 60}+${s}=${t}`)} 입니다.`,
    );
  }
  if (form === 2) {
    return make(
      unit,
      prompt === 0
        ? `${msStr(m, s)}를 초로 나타내시오.`
        : `${msStr(m, s)}와 같은 시간은 몇 초인지 구하시오.`,
      n(m * 60 + s),
      `$1$ 분은 $60$ 초이므로 ${n(m)}분은 ${n(m * 60)}초입니다. ${expr(`${m * 60}+${s}=${m * 60 + s}`)} 입니다.`,
    );
  }
  return make(
    unit,
    prompt === 0
      ? `${n(m * 60)}초를 분으로 나타내시오.`
      : `${n(m * 60)}초와 같은 시간은 몇 분인지 구하시오.`,
    n(m),
    `$60$ 초는 $1$ 분이므로 ${n(m * 60)}초는 ${n(m)}분입니다. 검산하면 ${expr(`60\\times${m}=${m * 60}`)} 입니다.`,
  );
}

/** 2단 — 생활 문장 변환. 방향은 틀마다 정해져 있다. */
function sec154Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 1, 4);
  const s = intBetween(rng, 1, 59);
  const t = m * 60 + s;
  const form = intBetween(rng, 0, 7);
  const toSec = form % 2 === 1;
  const stems = [
    `수영장에서 잠수를 ${n(t)}초 동안 했습니다. 잠수한 시간은 몇 분 몇 초인지 쓰시오.`,
    `라면을 끓이는 데 ${msStr(m, s)}가 걸렸습니다. 걸린 시간은 몇 초인지 쓰시오.`,
    `노래 한 곡의 길이는 ${n(t)}초입니다. 이 노래는 몇 분 몇 초짜리인지 쓰시오.`,
    `양치질을 ${msStr(m, s)} 동안 했습니다. 몇 초 동안 한 것인지 쓰시오.`,
    `달리기 기록이 ${n(t)}초였습니다. 이 기록은 몇 분 몇 초인지 쓰시오.`,
    `엘리베이터를 ${msStr(m, s)} 동안 기다렸습니다. 기다린 시간은 몇 초인지 쓰시오.`,
    `동영상의 길이는 ${n(t)}초입니다. 몇 분 몇 초짜리 동영상인지 쓰시오.`,
    `줄넘기를 ${msStr(m, s)} 동안 했습니다. 줄넘기를 한 시간은 몇 초인지 쓰시오.`,
  ];
  return make(
    unit,
    stems[form]!,
    toSec ? n(t) : msStr(m, s),
    toSec
      ? `$1$ 분은 $60$ 초이므로 ${n(m)}분은 ${n(m * 60)}초입니다. ${expr(`${m * 60}+${s}=${t}`)} 입니다.`
      : `$60$ 초는 $1$ 분이므로 ${n(t)}초는 ${msStr(m, s)}입니다. 검산하면 ${expr(`${m * 60}+${s}=${t}`)} 입니다.`,
  );
}

/** 3단 — 두 활동을 이어 한 뒤 몇 분 몇 초인지(60 경계 갈림, 두 단계). */
function sec154Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const m1 = intBetween(rng, 1, 3);
  const s1 = intBetween(rng, 5, 55);
  let s2 = intBetween(rng, 5, 55);
  if ((s1 + s2) % 60 === 0) s2 += 1; // 초 자리가 $0$ 이 되면 한 칸 민다
  const total = m1 * 60 + s1 + s2;
  const am = Math.floor(total / 60);
  const as = total % 60;
  const stem = pick(rng, [
    `플랭크를 ${msStr(m1, s1)} 동안 하고, 쉬지 않고 ${n(s2)}초 더 했습니다. 플랭크를 한 시간은 모두 몇 분 몇 초인지 쓰시오.`,
    `노래를 ${msStr(m1, s1)} 동안 부르고 이어서 ${n(s2)}초 더 불렀습니다. 노래를 부른 시간은 모두 몇 분 몇 초인지 쓰시오.`,
    `물을 ${msStr(m1, s1)} 동안 끓이고 ${n(s2)}초 더 끓였습니다. 물을 끓인 시간은 모두 몇 분 몇 초인지 쓰시오.`,
    `숨 참기를 ${msStr(m1, s1)} 하고 나서 ${n(s2)}초 더 참았습니다. 모두 몇 분 몇 초 동안 참았는지 쓰시오.`,
    `훌라후프를 ${msStr(m1, s1)} 동안 돌리고 ${n(s2)}초 더 돌렸습니다. 훌라후프를 돌린 시간은 모두 몇 분 몇 초인지 쓰시오.`,
    `책을 ${msStr(m1, s1)} 동안 소리 내어 읽고, ${n(s2)}초 동안 더 읽었습니다. 모두 몇 분 몇 초 동안 읽었는지 쓰시오.`,
    `제자리 뛰기를 ${msStr(m1, s1)} 하고 쉬지 않고 ${n(s2)}초 더 했습니다. 모두 몇 분 몇 초인지 쓰시오.`,
    `호흡 운동을 ${msStr(m1, s1)} 한 뒤 ${n(s2)}초 더 이어 했습니다. 호흡 운동을 한 시간은 모두 몇 분 몇 초인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    msStr(am, as),
    `초끼리 더하면 ${expr(`${s1}+${s2}=${s1 + s2}`)} 입니다. ${
      s1 + s2 >= 60
        ? `$60$ 초는 $1$ 분이므로 ${n(s1 + s2)}초는 ${msStr(1, s1 + s2 - 60)}입니다. `
        : ``
    }모두 ${msStr(am, as)}입니다. 검산하면 ${expr(`${am * 60}+${as}=${total}`)} 초입니다.`,
  );
}

/** 4단 — 역산: 목표한 분에서 이미 한 초를 되짚어 뺀다. */
function sec154Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 예전에는 「$M$분 중 $t$초 지남 → 몇 초 더」로 환산 한 번 + 뺄셈이었다.
  //    이제 **분과 초가 섞인 시간**을 주고, 답도 **분과 초로 되돌린다**(환산이 양쪽에 온다).
  const M = intBetween(rng, 2, 5);
  const S = intBetween(rng, 5, 55);
  const whole = M * 60 + S;
  const t0 = intBetween(rng, 30, whole - 70);
  // 남은 시간이 딱 몇 분이면 답이 「$2$분 $0$초」가 된다 — 뽑을 때 막는다.
  const t = (whole - t0) % 60 === 0 ? t0 + 1 : t0;
  const remain = whole - t;
  const stem = pick(rng, [
    `줄넘기를 ${n(M)}분 ${n(S)}초 동안 하기로 했습니다. 지금까지 ${n(t)}초 했다면 몇 분 몇 초 더 해야 하는지 쓰시오.`,
    `명상을 ${n(M)}분 ${n(S)}초 동안 하려고 합니다. 벌써 ${n(t)}초가 지났다면 남은 시간은 몇 분 몇 초인지 쓰시오.`,
    `${n(M)}분 ${n(S)}초짜리 모래시계가 있습니다. ${n(t)}초가 지났다면 몇 분 몇 초 뒤에 다 떨어지는지 쓰시오.`,
    `타이머를 ${n(M)}분 ${n(S)}초에 맞추었습니다. ${n(t)}초가 지난 지금, 몇 분 몇 초 뒤에 울리는지 쓰시오.`,
    `발표 시간은 ${n(M)}분 ${n(S)}초입니다. 지금까지 ${n(t)}초 발표했다면 남은 시간은 몇 분 몇 초인지 쓰시오.`,
    `체험 시간은 ${n(M)}분 ${n(S)}초입니다. 시작한 지 ${n(t)}초가 지났다면 남은 시간은 몇 분 몇 초인지 쓰시오.`,
    `라면을 ${n(M)}분 ${n(S)}초 동안 끓여야 합니다. 지금까지 ${n(t)}초 끓였다면 몇 분 몇 초 더 끓여야 하는지 쓰시오.`,
    `노래 한 곡은 ${n(M)}분 ${n(S)}초짜리입니다. ${n(t)}초가 지났다면 몇 분 몇 초 뒤에 끝나는지 쓰시오.`,
  ]);
  return makeDeep(
    unit,
    stem,
    `${n(Math.floor(remain / 60))}분 ${n(remain % 60)}초`,
    [
      `${n(M)}분 ${n(S)}초는 ${expr(`60\\times${M}+${S}=${whole}`)} 초입니다.`,
      `${expr(`${whole}-${t}=${remain}`)} 초입니다. ` +
        `${expr(`60\\times${Math.floor(remain / 60)}=${Math.floor(remain / 60) * 60}`)} 이고 ` +
        `${expr(`${remain}-${Math.floor(remain / 60) * 60}=${remain % 60}`)} 이므로 ` +
        `${n(Math.floor(remain / 60))}분 ${n(remain % 60)}초입니다.`,
    ],
  );
}

// ── 1-5-5 시간의 덧셈 ──

/** 1단 — 두 시간의 합 식 그대로(올림 갈림). 표준(「…과 …을 더하면」 한 틀)과 갈라 둔다. */
function time155Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, h2, m2, hh, mm } = addHm(rng);
  const A = hmStr(h1, m1);
  const B = hmStr(h2, m2);
  const stem = pick(rng, [
    `다음 두 시간의 합은 몇 시간 몇 분인지 쓰시오.\n\n${A}, ${B}`,
    `${A}에 ${B}을 더한 시간은 몇 시간 몇 분인지 쓰시오.`,
    `${A}과 ${B}의 합을 구하시오.`,
    `합이 몇 시간 몇 분인지 쓰시오.\n\n${A} $+$ ${B}`,
    `${A}보다 ${B} 더 긴 시간은 몇 시간 몇 분인지 쓰시오.`,
    `다음 시간을 모두 더하면 몇 시간 몇 분인지 구하시오.\n\n${A}, ${B}`,
    `${A}과 ${B}을 이어서 보내면 모두 몇 시간 몇 분인지 쓰시오.`,
    `두 시간의 합을 구하시오.\n\n${A}, ${B}`,
  ]);
  return make(
    unit,
    stem,
    hmStr(hh, mm),
    `분끼리 더하면 ${expr(`${m1}+${m2}=${m1 + m2}`)} 입니다. ${
      m1 + m2 >= 60
        ? `$60$ 분은 $1$ 시간이므로 ${n(m1 + m2)}분은 ${hmStr(1, mm)}입니다. `
        : ``
    }시간끼리 더하면 ${expr(`${h1}+${h2}=${h1 + h2}`)} 이므로 모두 ${hmStr(hh, mm)}입니다.`,
  );
}

/** 2단 — 생활 문장의 합. */
function time155Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, h2, m2, hh, mm } = addHm(rng);
  const A = hmStr(h1, m1);
  const B = hmStr(h2, m2);
  const stem = pick(rng, [
    `숙제를 ${A} 동안 하고, 책을 ${B} 동안 읽었습니다. 공부한 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `기차를 ${A} 타고, 이어서 버스를 ${B} 탔습니다. 탈것을 탄 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `오전에 ${A}, 오후에 ${B} 동안 그림을 그렸습니다. 그림을 그린 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `청소를 ${A} 하고 요리를 ${B} 했습니다. 집안일을 한 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `등산을 ${A} 하고 내려오는 데 ${B} 걸렸습니다. 산에 있던 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `영화를 ${A} 보고, 이어진 감독 인터뷰를 ${B} 보았습니다. 상영관에 있던 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `수영을 ${A}, 줄넘기를 ${B} 동안 했습니다. 운동한 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `블록 놀이를 ${A} 하고 보드게임을 ${B} 했습니다. 놀이한 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    hmStr(hh, mm),
    `분끼리 더하면 ${expr(`${m1}+${m2}=${m1 + m2}`)} 입니다. ${
      m1 + m2 >= 60
        ? `$60$ 분은 $1$ 시간이므로 ${n(m1 + m2)}분은 ${hmStr(1, mm)}입니다. `
        : ``
    }시간끼리 더하면 ${expr(`${h1}+${h2}=${h1 + h2}`)} 이므로 모두 ${hmStr(hh, mm)}입니다.`,
  );
}

/** 3단 — 시각 + 걸린 시간 = 끝나는 시각(두 단계). */
function time155Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const sh = intBetween(rng, 1, 6);
  const sm = intBetween(rng, 5, 55);
  const dh = intBetween(rng, 1, 3);
  let dm = intBetween(rng, 5, 55);
  if ((sm + dm) % 60 === 0) dm += 1; // 끝나는 분이 $0$ 이면 한 칸 민다
  const total = sm + dm;
  const eh = sh + dh + (total >= 60 ? 1 : 0);
  const em = total % 60;
  const stem = pick(rng, [
    `${clockStr(sh, sm)}에 시작한 영화가 ${hmStr(dh, dm)} 동안 상영됩니다. 영화가 끝나는 시각은 몇 시 몇 분인지 쓰시오.`,
    `${clockStr(sh, sm)}에 출발한 기차가 ${hmStr(dh, dm)} 뒤에 도착합니다. 도착 시각은 몇 시 몇 분인지 쓰시오.`,
    `공연이 ${clockStr(sh, sm)}에 시작하여 ${hmStr(dh, dm)} 동안 이어집니다. 끝나는 시각은 몇 시 몇 분인지 쓰시오.`,
    `${clockStr(sh, sm)}부터 ${hmStr(dh, dm)} 동안 봉사 활동을 합니다. 봉사 활동이 끝나는 시각은 몇 시 몇 분인지 쓰시오.`,
    `${clockStr(sh, sm)}에 요리를 시작해 ${hmStr(dh, dm)} 만에 끝냈습니다. 요리가 끝난 시각은 몇 시 몇 분인지 쓰시오.`,
    `견학이 ${clockStr(sh, sm)}에 시작되어 ${hmStr(dh, dm)} 동안 진행됩니다. 견학이 끝나는 시각을 구하시오.`,
    `${clockStr(sh, sm)}에 잠들어 ${hmStr(dh, dm)} 동안 낮잠을 잤습니다. 잠에서 깬 시각은 몇 시 몇 분인지 쓰시오.`,
    `버스가 ${clockStr(sh, sm)}에 출발해 ${hmStr(dh, dm)} 뒤에 종점에 닿습니다. 종점에 닿는 시각은 몇 시 몇 분인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    clockStr(eh, em),
    `분끼리 더하면 ${expr(`${sm}+${dm}=${total}`)} 입니다. ${
      total >= 60
        ? `$60$ 분은 $1$ 시간이므로 ${n(total)}분은 ${hmStr(1, em)}입니다. `
        : ``
    }시끼리 더하면 ${expr(`${sh}+${dh}=${sh + dh}`)} 이므로 끝나는 시각은 ${clockStr(eh, em)}입니다.`,
  );
}

/** 4단 — 조건 조합: 세 시간의 합(분 합이 두 번 올림될 수 있다). */
function time155Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const h1 = intBetween(rng, 1, 2);
  const h2 = intBetween(rng, 1, 2);
  // 되짚어 구하는 셋째 시간도 «몇 시간 몇 분» 이어야 한다 — $0$ 시간이면 형식이 깨진다.
  const h3 = 1;
  const m1 = intBetween(rng, 15, 55);
  const m2 = intBetween(rng, 15, 55);
  let m3 = intBetween(rng, 15, 55);
  if ((m1 + m2 + m3) % 60 === 0) m3 += 1;
  const tm = m1 + m2 + m3;
  const carry = Math.floor(tm / 60);
  const mm = tm % 60;
  const hh = h1 + h2 + h3 + carry;
  const parts: [string, string, string] = [
    hmStr(h1, m1),
    hmStr(h2, m2),
    hmStr(h3, m3),
  ];
  // ⚠️ 예전에는 **세 시간을 그냥 더했다** — 응용(시각 + 시간)에 항을 하나 더한 것이라
  //    계산량만 늘었다(3.3 ㉡ 부류). 이제 **전체를 주고 셋째를 되짚는다** — 둘을 더한 뒤
  //    전체에서 뺀다. 60 경계는 양쪽(더할 때·뺄 때)에 다 걸린다.
  const stem = pick(rng, [
    `독서를 ${parts[0]}, 운동을 ${parts[1]} 동안 했습니다. 여기에 산책까지 더해 모두 ${hmStr(hh, mm)} 동안 움직였다면 산책은 몇 시간 몇 분 동안 했는지 쓰시오.`,
    `기차를 ${parts[0]}, 버스를 ${parts[1]} 동안 탔습니다. 지하철까지 더해 탈것을 탄 시간이 모두 ${hmStr(hh, mm)}이라면 지하철을 탄 시간은 몇 시간 몇 분인지 쓰시오.`,
    `영화를 ${parts[0]}, 드라마를 ${parts[1]} 보고 만화도 보았습니다. 본 시간이 모두 ${hmStr(hh, mm)}이라면 만화를 본 시간은 몇 시간 몇 분인지 쓰시오.`,
    `달리기를 ${parts[0]}, 자전거를 ${parts[1]} 타고 수영도 했습니다. 운동한 시간이 모두 ${hmStr(hh, mm)}이라면 수영한 시간은 몇 시간 몇 분인지 쓰시오.`,
    `오전 공부 ${parts[0]}, 오후 공부 ${parts[1]}을 하고 저녁에도 공부했습니다. 하루에 공부한 시간이 모두 ${hmStr(hh, mm)}이라면 저녁 공부는 몇 시간 몇 분인지 쓰시오.`,
    `청소 ${parts[0]}, 빨래 ${parts[1]}에 이어 설거지까지 했더니 집안일에 걸린 시간이 모두 ${hmStr(hh, mm)}이었습니다. 설거지에 걸린 시간은 몇 시간 몇 분인지 쓰시오.`,
    `만들기 ${parts[0]}, 색칠 ${parts[1]}에 이어 정리도 했습니다. 걸린 시간이 모두 ${hmStr(hh, mm)}이라면 정리에 걸린 시간은 몇 시간 몇 분인지 쓰시오.`,
    `등산에서 오르막 ${parts[0]}, 능선 ${parts[1]}을 걷고 내리막도 걸었습니다. 걸은 시간이 모두 ${hmStr(hh, mm)}이라면 내리막을 걸은 시간은 몇 시간 몇 분인지 쓰시오.`,
  ]);
  const two = m1 + m2;
  const twoH = h1 + h2 + Math.floor(two / 60);
  const twoM = two % 60;
  return makeDeep(unit, stem, hmStr(h3, m3), [
    `아는 두 시간을 먼저 더합니다. 분끼리 ${expr(`${m1}+${m2}=${two}`)} 이고 ` +
      `시간끼리 ${expr(`${h1}+${h2}=${h1 + h2}`)} 이므로 ${hmStr(twoH, twoM)}입니다.`,
    `전체에서 덜어 내면 ${expr(`${hh * 60 + mm}-${twoH * 60 + twoM}=${h3 * 60 + m3}`)} 분이므로 ` +
      `${hmStr(h3, m3)}입니다.`,
  ]);
}

// ── 1-5-6 시간의 뺄셈 ──

/** 1단 — 두 시간의 차 식 그대로(내림 갈림). 표준(「…에서 …을 빼면」 한 틀)과 갈라 둔다. */
function time156Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, sh, sm, hh, mm } = subHm(rng);
  const A = hmStr(h1, m1);
  const B = hmStr(sh, sm);
  const stem = pick(rng, [
    `다음 두 시간의 차는 몇 시간 몇 분인지 쓰시오.\n\n${A}, ${B}`,
    `${A}과 ${B}의 차를 구하시오.`,
    `${A}은 ${B}보다 몇 시간 몇 분 더 긴지 쓰시오.`,
    `차가 몇 시간 몇 분인지 쓰시오.\n\n${A} $-$ ${B}`,
    `${A}에서 ${B}만큼 지나면 남는 시간은 몇 시간 몇 분인지 쓰시오.`,
    `두 시간의 차를 구하시오.\n\n${A}, ${B}`,
    `계획한 ${A} 가운데 ${B}을 쓰고 나면 몇 시간 몇 분이 남는지 쓰시오.`,
    `${B}과 ${A}의 차는 몇 시간 몇 분인지 구하시오.`,
  ]);
  return make(
    unit,
    stem,
    hmStr(hh, mm),
    m1 < sm
      ? `분끼리 뺄 수 없으므로 $1$ 시간을 $60$ 분으로 바꿉니다. ${expr(`${m1}+60=${m1 + 60}`)} 이고 ${expr(`${m1 + 60}-${sm}=${mm}`)} 입니다. 시간끼리 빼면 ${expr(`${h1 - 1}-${sh}=${hh}`)} 이므로 모두 ${hmStr(hh, mm)}입니다.`
      : `분끼리 빼면 ${expr(`${m1}-${sm}=${mm}`)} 이고, 시간끼리 빼면 ${expr(`${h1}-${sh}=${hh}`)} 이므로 모두 ${hmStr(hh, mm)}입니다.`,
  );
}

/** 2단 — 생활 문장의 차. 더 오래 한 쪽이 앞이라 차가 늘 양수다. */
function time156Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, sh, sm, hh, mm } = subHm(rng);
  const A = hmStr(h1, m1);
  const B = hmStr(sh, sm);
  const stem = pick(rng, [
    `형은 ${A}, 동생은 ${B} 동안 자전거를 탔습니다. 형이 몇 시간 몇 분 더 오래 탔는지 쓰시오.`,
    `어제는 ${A}, 오늘은 ${B} 동안 책을 읽었습니다. 어제가 오늘보다 몇 시간 몇 분 더 긴지 쓰시오.`,
    `비행기는 ${A}, 기차는 ${B} 걸립니다. 기차가 몇 시간 몇 분 더 빨리 도착하는지 쓰시오.`,
    `언니는 ${A}, 나는 ${B} 동안 그림을 그렸습니다. 언니가 나보다 몇 시간 몇 분 더 그렸는지 쓰시오.`,
    `수학 공부를 ${A}, 영어 공부를 ${B} 했습니다. 수학 공부를 몇 시간 몇 분 더 오래 했는지 쓰시오.`,
    `첫날에는 ${A}, 둘째 날에는 ${B} 동안 여행지를 걸었습니다. 첫날이 몇 시간 몇 분 더 긴지 쓰시오.`,
    `쾌속선은 ${B}, 여객선은 ${A} 걸립니다. 쾌속선이 몇 시간 몇 분 더 빨리 닿는지 쓰시오.`,
    `놀이공원에서 언니는 ${A}, 동생은 ${B} 동안 놀이 기구를 탔습니다. 언니가 몇 시간 몇 분 더 탔는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    hmStr(hh, mm),
    m1 < sm
      ? `분끼리 뺄 수 없으므로 $1$ 시간을 $60$ 분으로 바꿉니다. ${expr(`${m1}+60=${m1 + 60}`)} 이고 ${expr(`${m1 + 60}-${sm}=${mm}`)} 입니다. 시간끼리 빼면 ${expr(`${h1 - 1}-${sh}=${hh}`)} 이므로 차는 ${hmStr(hh, mm)}입니다.`
      : `분끼리 빼면 ${expr(`${m1}-${sm}=${mm}`)} 이고, 시간끼리 빼면 ${expr(`${h1}-${sh}=${hh}`)} 이므로 차는 ${hmStr(hh, mm)}입니다.`,
  );
}

/** 3단 — 시작·끝 시각에서 걸린 시간을 구한다(두 단계). */
function time156Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const sh = intBetween(rng, 1, 5);
  const borrow = intBetween(rng, 0, 1) === 1;
  let sm: number;
  let eh: number;
  let em: number;
  if (borrow) {
    sm = intBetween(rng, 20, 55);
    em = intBetween(rng, 5, sm - 5);
    eh = sh + intBetween(rng, 2, 4);
  } else {
    sm = intBetween(rng, 5, 40);
    em = intBetween(rng, sm + 5, 55);
    eh = sh + intBetween(rng, 1, 4);
  }
  const hh = borrow ? eh - sh - 1 : eh - sh;
  const mm = borrow ? em + 60 - sm : em - sm;
  const stem = pick(rng, [
    `${clockStr(sh, sm)}에 시작한 연극이 ${clockStr(eh, em)}에 끝났습니다. 연극을 한 시간은 몇 시간 몇 분인지 쓰시오.`,
    `${clockStr(sh, sm)}에 출발하여 ${clockStr(eh, em)}에 도착했습니다. 가는 데 걸린 시간은 몇 시간 몇 분인지 쓰시오.`,
    `도서관에 ${clockStr(sh, sm)}에 들어가서 ${clockStr(eh, em)}에 나왔습니다. 도서관에 있던 시간은 몇 시간 몇 분인지 쓰시오.`,
    `${clockStr(sh, sm)}부터 ${clockStr(eh, em)}까지 축구를 했습니다. 축구를 한 시간은 몇 시간 몇 분인지 쓰시오.`,
    `영화가 ${clockStr(sh, sm)}에 시작해 ${clockStr(eh, em)}에 끝났습니다. 상영 시간은 몇 시간 몇 분인지 쓰시오.`,
    `${clockStr(sh, sm)}에 청소를 시작해 ${clockStr(eh, em)}에 마쳤습니다. 청소한 시간은 몇 시간 몇 분인지 쓰시오.`,
    `기차가 ${clockStr(sh, sm)}에 떠나 ${clockStr(eh, em)}에 도착했습니다. 기차를 탄 시간은 몇 시간 몇 분인지 쓰시오.`,
    `체험 학습이 ${clockStr(sh, sm)}부터 ${clockStr(eh, em)}까지 있었습니다. 체험 학습 시간은 몇 시간 몇 분인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    hmStr(hh, mm),
    borrow
      ? `분끼리 뺄 수 없으므로 $1$ 시간을 $60$ 분으로 바꿉니다. ${expr(`${em}+60=${em + 60}`)} 이고 ${expr(`${em + 60}-${sm}=${mm}`)} 입니다. 시끼리 빼면 ${expr(`${eh - 1}-${sh}=${hh}`)} 이므로 걸린 시간은 ${hmStr(hh, mm)}입니다.`
      : `분끼리 빼면 ${expr(`${em}-${sm}=${mm}`)} 이고, 시끼리 빼면 ${expr(`${eh}-${sh}=${hh}`)} 이므로 걸린 시간은 ${hmStr(hh, mm)}입니다.`,
  );
}

/** 4단 — 역산: 빼고 남은 시간에서 처음 시간을 되짚는다(덧셈으로 되돌린다). */
function time156Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const dh = intBetween(rng, 1, 3);
  let dm = intBetween(rng, 5, 55);
  const H = intBetween(rng, 1, 4);
  const M = intBetween(rng, 5, 55);
  if ((M + dm) % 60 === 0) dm += 1;
  const total = M + dm;
  const hh = H + dh + (total >= 60 ? 1 : 0);
  const mm = total % 60;
  const stem = pick(rng, [
    `어떤 시간에서 ${hmStr(dh, dm)}을 뺐더니 ${hmStr(H, M)}이 되었습니다. 어떤 시간은 몇 시간 몇 분인지 쓰시오.`,
    `전체 시간에서 ${hmStr(dh, dm)}을 쓰고 나니 ${hmStr(H, M)}이 남았습니다. 전체 시간은 몇 시간 몇 분인지 쓰시오.`,
    `찰흙 놀이에 ${hmStr(dh, dm)}을 쓰고 ${hmStr(H, M)}이 남았습니다. 처음에 있던 놀이 시간은 몇 시간 몇 분인지 쓰시오.`,
    `계획한 시간 중 ${hmStr(dh, dm)}을 이미 보냈고 ${hmStr(H, M)}이 남았습니다. 계획한 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `가지고 있던 자유 시간에서 ${hmStr(dh, dm)}을 쓰니 ${hmStr(H, M)}이 남았습니다. 처음 자유 시간은 몇 시간 몇 분인지 쓰시오.`,
    `건전지로 ${hmStr(dh, dm)}을 쓰고 나니 ${hmStr(H, M)} 쓸 만큼 남았습니다. 건전지로 쓸 수 있던 시간은 모두 몇 시간 몇 분인지 쓰시오.`,
    `어떤 시간보다 ${hmStr(dh, dm)} 짧은 시간이 ${hmStr(H, M)}입니다. 어떤 시간은 몇 시간 몇 분인지 쓰시오.`,
    `${hmStr(H, M)}은 어떤 시간에서 ${hmStr(dh, dm)}을 뺀 것입니다. 어떤 시간을 구하시오.`,
  ]);
  return make(
    unit,
    stem,
    hmStr(hh, mm),
    `뺀 시간을 도로 더합니다. 분끼리 더하면 ${expr(`${M}+${dm}=${total}`)} 입니다. ${
      total >= 60
        ? `$60$ 분은 $1$ 시간이므로 ${n(total)}분은 ${hmStr(1, mm)}입니다. `
        : ``
    }시간끼리 더하면 ${expr(`${H}+${dh}=${H + dh}`)} 이므로 처음 시간은 ${hmStr(hh, mm)}입니다.`,
  );
}

// ── 1-6 분수와 소수 (D-72 확대) ──────────────────────────────────────────
//
// 그림은 기존 kind(fracBars·fracPie·triRow·trapFour)만 쓴다 — 네 kind 모두 넓이가
// 같은 등분이다(D-61: 칸 수가 아니라 **넓이**가 같아야 한다 — 대각선 분할 금지).
// 소수는 초3 범위(소수 한 자리, 꼬리 0 없음)만 나온다. 크기 비교는 **동률이 나올 수
// 없게 뽑을 때** 막는다(가드·재추첨이 아니라 건너뛰기 구성) — 시험이 전 갈래에서 잠근다.

/**
 * $0..n-1$ 에서 서로 다른 수 $k$ 개 — 이미 뽑힌 값을 **건너뛰어** 뽑는다(재추첨 없음).
 * 크기 비교 갈래의 「동률 불가」가 전부 이 함수 하나에서 나온다.
 */
function distinctIdx(rng: Rng, n: number, k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < k; i += 1) {
    let v = intBetween(rng, 0, n - 1 - i);
    for (const u of [...out].sort((a, b) => a - b)) if (v >= u) v += 1;
    out.push(v);
  }
  return out;
}

/** 소수 값 격자 — 색인 0..35 ↔ «w.t» (w 0..3, t 1..9). 꼬리 0 이 구조적으로 없다. */
const decIdxVal = (idx: number) => ({
  w: Math.floor(idx / 9),
  t: (idx % 9) + 1,
});
const decStrOf = (idx: number) => {
  const { w, t } = decIdxVal(idx);
  return `${w}.${t}`;
};

// ── 1-6-1 똑같이 나누기 ──

/** 1단 — 그림을 보고 몇 등분인지 한 번에. 표준(「조각은 모두 몇 개」)과 말투를 갈라 둔다. */
function part161Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  const material = fracMaterial(rng, String(spec.kind));
  const stem = pick(rng, [
    `그림의 ${material}${josa(material, "은", "는")} 똑같이 나누어져 있습니다. 한 조각은 전체를 똑같이 몇 조각으로 나눈 것 중 하나인지 쓰시오.`,
    `${material}${josa(material, "을", "를")} 그림처럼 똑같이 나누었습니다. 전체는 몇 조각으로 나누어졌는지 쓰시오.`,
    `그림처럼 ${material}${josa(material, "을", "를")} 크기가 같게 나누면 조각이 몇 개 생기는지 쓰시오.`,
    `그림은 ${material}${josa(material, "을", "를")} 크기가 같은 조각으로 나눈 것입니다. 몇 등분인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(parts),
    `크기가 같은 조각이 ${n(parts)}개이므로 전체를 똑같이 ${n(parts)}조각으로 나눈 것입니다.`,
    spec,
  );
}

/** 2단 — 문장 조건으로 나눌 조각 수를 세운다(«$c$조각씩 $k$명» — 답이 발문에 안 보인다). */
function part161Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = intBetween(rng, 2, 3);
  const k = intBetween(rng, 2, 4);
  const total = c * k;
  const thing = pick(rng, [
    "피자",
    "케이크",
    "김밥",
    "떡",
    "파이",
    "식빵",
    "와플",
    "전",
  ]);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} ${n(k)}명이 ${n(c)}조각씩 먹도록 똑같이 나누려고 합니다. 몇 조각으로 나누어야 하는지 쓰시오.`,
    `친구 ${n(k)}명이 ${thing}${josa(thing, "을", "를")} 한 명당 ${n(c)}조각씩 남김없이 먹으려면 똑같이 몇 조각으로 나눠야 하는지 쓰시오.`,
    `${thing}${josa(thing, "을", "를")} 한 사람이 ${n(c)}조각씩 갖도록 ${n(k)}명이 똑같이 나눕니다. 전체를 몇 조각으로 나누면 되는지 쓰시오.`,
    `${n(k)}명이 ${n(c)}조각씩 나누어 먹을 수 있게 ${thing}${josa(thing, "을", "를")} 똑같이 나누면 모두 몇 조각인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(total),
    `${n(c)}조각씩 ${n(k)}명이므로 ${expr(`${c}\\times${k}=${total}`)} 조각으로 똑같이 나눕니다.`,
  );
}

/** 3단 — 그림의 조각을 세고, 둘이 똑같이 나누면 몇 조각씩인지(두 단계). */
function part161Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = pick(rng, [4, 6, 8]);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  const material = fracMaterial(rng, String(spec.kind));
  const stem = pick(rng, [
    `그림의 ${material}${josa(material, "은", "는")} 똑같이 나누어져 있습니다. 두 사람이 조각 수를 똑같이 나누어 가지면 한 사람이 몇 조각씩 가지는지 쓰시오.`,
    `그림처럼 나눈 ${material}${josa(material, "을", "를")} 두 명이 남김없이 똑같이 나누어 먹으면 한 명이 몇 조각씩 먹는지 쓰시오.`,
    `그림의 ${material} 조각을 세어, 둘이 똑같이 나눌 때 한 명의 몫이 몇 조각인지 쓰시오.`,
    `똑같이 나누어진 그림의 ${material}${josa(material, "을", "를")} 두 사람이 같은 수만큼 나누어 가지면 한 사람에게 몇 조각씩 돌아가는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(parts / 2),
    `조각은 모두 ${n(parts)}개입니다. ${expr(`${parts}\\div2=${parts / 2}`)} 이므로 한 사람이 ${n(parts / 2)}조각씩 가집니다.`,
    spec,
  );
}

/** 4단 — 역산: 먹고 남은 조각 수에서 처음 등분을 되짚는다. */
function part161Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const e = intBetween(rng, 2, 6);
  const r = intBetween(rng, 2, 6);
  const total = e + r;
  const thing = pick(rng, [
    "피자",
    "케이크",
    "김밥",
    "떡",
    "파이",
    "식빵",
    "와플",
    "전",
  ]);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 똑같이 나눈 뒤 ${n(e)}조각을 먹었더니 ${n(r)}조각이 남았습니다. 처음에 몇 조각으로 나누었는지 쓰시오.`,
    `똑같이 나눈 ${thing} 중 ${n(e)}조각을 접시에 덜고 나니 ${n(r)}조각이 남았습니다. 전체는 몇 조각이었는지 쓰시오.`,
    `${thing}${josa(thing, "을", "를")} 크기가 같게 나누어 ${n(e)}조각을 나누어 주었더니 ${n(r)}조각이 남았습니다. 처음 조각 수를 쓰시오.`,
    `똑같이 나눈 ${thing}에서 ${n(e)}조각이 없어지고 ${n(r)}조각이 남아 있습니다. 처음에는 모두 몇 조각이었는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(total),
    `남은 조각에 먹은 조각을 도로 더합니다. ${expr(`${r}+${e}=${total}`)} 이므로 처음에 ${n(total)}조각으로 나누었습니다.`,
  );
}

// ── 1-6-2 분수 알아보기(1) ──

/** 1단 — 그림의 색칠 부분을 분수로. 표준과 말투를 갈라 둔다. */
function frac162Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  const material = fracMaterial(rng, String(spec.kind));
  const stem = pick(rng, [
    `그림의 ${material}에서 색칠한 부분을 분수로 나타내시오.`,
    `${material}${josa(material, "을", "를")} 똑같이 나눈 그림입니다. 색칠한 부분은 전체의 몇 분의 몇인지 분수로 쓰시오.`,
    `그림에서 색칠한 조각이 전체에서 차지하는 부분을 분수로 쓰시오.`,
    `색칠한 부분이 전체의 얼마인지 그림을 보고 분수로 나타내시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${filled}}{${parts}}`),
    `전체를 똑같이 ${n(parts)}조각으로 나눈 것 중 ${n(filled)}조각이므로 ${expr(`\\frac{${filled}}{${parts}}`)} 입니다.`,
    spec,
  );
}

/** 2단 — 그림 없이 문장으로 분수를 세운다. */
function frac162Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 9);
  const filled = intBetween(rng, 1, parts - 1);
  const thing = pick(rng, [
    "색종이",
    "리본",
    "초콜릿",
    "두부",
    "식빵",
    "김밥",
    "종이 띠",
    "케이크",
  ]);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 똑같이 ${n(parts)}조각으로 나누어 그중 ${n(filled)}조각을 사용했습니다. 사용한 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `전체를 똑같이 ${n(parts)}조각으로 나눈 ${thing} 중에서 ${n(filled)}조각에 색칠했습니다. 색칠한 부분을 분수로 나타내시오.`,
    `${thing}${josa(thing, "을", "를")} 크기가 같게 ${n(parts)}조각으로 나누고 ${n(filled)}조각을 동생에게 주었습니다. 동생에게 준 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 ${n(parts)}조각으로 나눈 ${thing}에서 ${n(filled)}조각을 골랐습니다. 고른 부분을 분수로 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${filled}}{${parts}}`),
    `전체를 똑같이 ${n(parts)}조각으로 나눈 것 중 ${n(filled)}조각이므로 ${expr(`\\frac{${filled}}{${parts}}`)} 입니다.`,
  );
}

/** 3단 — 두 몫을 합쳐 분수로(두 단계). */
function frac162Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 5, 9);
  const f1 = intBetween(rng, 1, parts - 3);
  const f2 = intBetween(rng, 1, parts - f1 - 2);
  const sum = f1 + f2;
  const thing = pick(rng, [
    "색종이",
    "리본",
    "초콜릿",
    "두부",
    "식빵",
    "김밥",
    "종이 띠",
    "케이크",
  ]);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 똑같이 ${n(parts)}조각으로 나누었습니다. 언니가 ${n(f1)}조각, 동생이 ${n(f2)}조각에 색칠했다면 색칠한 부분은 모두 전체의 얼마인지 분수로 쓰시오.`,
    `전체를 똑같이 ${n(parts)}조각으로 나눈 ${thing}에서 아침에 ${n(f1)}조각, 저녁에 ${n(f2)}조각을 먹었습니다. 먹은 부분을 모두 합해 분수로 나타내시오.`,
    `${thing}${josa(thing, "을", "를")} 크기가 같게 ${n(parts)}조각으로 나누어 ${n(f1)}조각과 ${n(f2)}조각을 차례로 사용했습니다. 사용한 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 ${n(parts)}조각으로 나눈 ${thing} 중 ${n(f1)}조각을 먼저, ${n(f2)}조각을 나중에 골랐습니다. 고른 부분 전체를 분수로 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${sum}}{${parts}}`),
    `고른 조각을 모두 더하면 ${expr(`${f1}+${f2}=${sum}`)} 조각입니다. 전체 ${n(parts)}조각 중 ${n(sum)}조각이므로 ${expr(`\\frac{${sum}}{${parts}}`)} 입니다.`,
  );
}

/** 4단 — 역산: 분수에서 조각 수를 되짚는다(색칠하지 않은 조각). */
function frac162Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 4, 9);
  const filled = intBetween(rng, 1, parts - 2);
  const rest = parts - filled;
  const thing = pick(rng, [
    "색종이",
    "리본",
    "초콜릿",
    "두부",
    "식빵",
    "김밥",
    "종이 띠",
    "케이크",
  ]);
  // ⚠️ 예전에는 「색칠한 부분이 전체의 $\frac{a}{b}$ → 색칠 안 한 조각 수」로 **분모에서
  //    분자를 빼면 끝**이었다(한 걸음). 같은 소단원 응용(두 사람의 조각을 더해 분수로)과
  //    무게가 같았다. 이제 안 칠한 조각을 되짚은 **뒤 몇 조각을 더 칠해** 분수로 되돌린다.
  const more = intBetween(rng, 1, rest - 1 > 0 ? rest - 1 : 1);
  const stem = pick(rng, [
    `${thing}의 색칠한 부분이 전체의 ${expr(`\\frac{${filled}}{${parts}}`)} 입니다. 색칠하지 않은 조각 중 ${n(more)}조각을 더 색칠하면 색칠한 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 나눈 ${thing}에서 색칠한 부분이 전체의 ${expr(`\\frac{${filled}}{${parts}}`)} 입니다. 남은 조각에서 ${n(more)}조각을 더 색칠했다면 색칠한 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `색칠한 부분이 전체의 ${expr(`\\frac{${filled}}{${parts}}`)} 인 ${thing}${josa(thing, "이", "가")} 있습니다. 색칠이 안 된 조각 가운데 ${n(more)}조각을 더 칠하면 색칠한 부분은 전체의 얼마인지 분수로 쓰시오.`,
  ]);
  return makeDeep(unit, stem, expr(`\\frac{${filled + more}}{${parts}}`), [
    `분모가 전체 조각 수이고 분자가 색칠한 조각 수이므로 색칠하지 않은 조각은 ` +
      `${expr(`${parts}-${filled}=${rest}`)} 조각입니다.`,
    `${n(more)}조각을 더 칠하면 색칠한 조각은 ${expr(`${filled}+${more}=${filled + more}`)} 조각이므로 ` +
      `${expr(`\\frac{${filled + more}}{${parts}}`)} 입니다.`,
  ]);
}

// ── 1-6-3 분수 알아보기(2) ──

/** 1단 — 그림의 «색칠하지 않은» 부분을 분수로. 표준과 말투를 갈라 둔다. */
function frac163Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const rest = parts - filled;
  const spec = fracSpec(rng, parts, filled);
  const material = fracMaterial(rng, String(spec.kind));
  const stem = pick(rng, [
    `그림의 ${material}에서 색칠하지 않은 부분을 분수로 나타내시오.`,
    `${material}${josa(material, "을", "를")} 똑같이 나눈 그림입니다. 색칠이 안 된 부분은 전체의 몇 분의 몇인지 쓰시오.`,
    `그림에서 색칠되지 않은 조각이 전체에서 차지하는 부분을 분수로 쓰시오.`,
    `색칠하지 않은 부분이 전체의 얼마인지 그림을 보고 분수로 나타내시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${rest}}{${parts}}`),
    `전체 ${n(parts)}조각 중 색칠한 것이 ${n(filled)}조각이므로 색칠하지 않은 것은 ${expr(`${parts}-${filled}=${rest}`)} 조각입니다. 따라서 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다.`,
    spec,
  );
}

/** 2단 — 문장으로: 먹고 남은 부분을 분수로. */
function frac163Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 4, 9);
  const eaten = intBetween(rng, 1, parts - 2);
  const rest = parts - eaten;
  const thing = pick(rng, [
    "피자",
    "케이크",
    "김밥",
    "떡",
    "파이",
    "식빵",
    "와플",
    "전",
  ]);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 똑같이 ${n(parts)}조각으로 나누어 ${n(eaten)}조각을 먹었습니다. 남은 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `전체를 똑같이 ${n(parts)}조각으로 나눈 ${thing} 중 ${n(eaten)}조각을 나누어 주었습니다. 남아 있는 부분을 분수로 나타내시오.`,
    `${thing}${josa(thing, "을", "를")} 크기가 같게 ${n(parts)}조각으로 나누고 ${n(eaten)}조각을 사용했습니다. 사용하지 않은 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 ${n(parts)}조각으로 나눈 ${thing}에서 ${n(eaten)}조각이 팔렸습니다. 팔리지 않은 부분을 분수로 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${rest}}{${parts}}`),
    `전체 ${n(parts)}조각에서 ${n(eaten)}조각을 빼면 ${expr(`${parts}-${eaten}=${rest}`)} 조각입니다. 따라서 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다.`,
  );
}

/** 3단 — 두 번 덜어낸 뒤 남은 부분을 분수로(두 단계). */
function frac163Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 6, 10);
  const e1 = intBetween(rng, 1, parts - 4);
  const e2 = intBetween(rng, 1, parts - e1 - 3);
  const rest = parts - e1 - e2;
  const thing = pick(rng, [
    "피자",
    "케이크",
    "김밥",
    "떡",
    "파이",
    "식빵",
    "와플",
    "전",
  ]);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 똑같이 ${n(parts)}조각으로 나누었습니다. 형이 ${n(e1)}조각, 동생이 ${n(e2)}조각을 먹었다면 남은 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `전체를 똑같이 ${n(parts)}조각으로 나눈 ${thing}에서 점심에 ${n(e1)}조각, 저녁에 ${n(e2)}조각을 먹었습니다. 남은 부분을 분수로 나타내시오.`,
    `${thing}${josa(thing, "을", "를")} 크기가 같게 ${n(parts)}조각으로 나누어 ${n(e1)}조각과 ${n(e2)}조각을 차례로 나누어 주었습니다. 남은 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 ${n(parts)}조각으로 나눈 ${thing} 중 ${n(e1)}조각이 먼저, ${n(e2)}조각이 나중에 팔렸습니다. 팔리지 않은 부분을 분수로 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${rest}}{${parts}}`),
    `먹은 조각은 ${expr(`${e1}+${e2}=${e1 + e2}`)} 조각입니다. ${expr(`${parts}-${e1 + e2}=${rest}`)} 이므로 남은 부분은 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다.`,
  );
}

/** 4단 — 역산: 남은 부분의 분수에서 먹은 조각 수를 되짚는다. */
function frac163Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 4, 9);
  // 더 먹을 조각이 남아야 두 걸음이 산다 — 남은 조각이 하나면 분자가 $0$ 이 된다.
  const rest = intBetween(rng, 2, parts - 2);
  const eaten = parts - rest;
  const thing = pick(rng, [
    "피자",
    "케이크",
    "김밥",
    "떡",
    "파이",
    "식빵",
    "와플",
    "전",
  ]);
  // ⚠️ 1-6-2 와 같은 자리였다 — 「남은 부분이 $\frac{a}{b}$ → 먹은 조각」은 뺄셈 한 번이다.
  //    이제 먹은 조각을 되짚은 **뒤 몇 조각을 더 먹고** 남은 부분을 분수로 되돌린다.
  //    (1-6-2 는 «더 칠한다», 여기는 «더 먹는다» — 방향이 반대라 발문이 안 겹친다.)
  const more = intBetween(rng, 1, rest - 1 > 0 ? rest - 1 : 1);
  const stem = pick(rng, [
    `${thing}${josa(thing, "을", "를")} 똑같이 나누어 먹고 나니 남은 부분이 전체의 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다. 여기서 ${n(more)}조각을 더 먹으면 남은 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 나눈 ${thing}의 남은 부분이 전체의 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다. ${n(more)}조각을 더 먹었다면 남은 부분은 전체의 얼마인지 분수로 쓰시오.`,
    `팔고 남은 ${thing}${josa(thing, "이", "가")} 전체의 ${expr(`\\frac{${rest}}{${parts}}`)} 입니다. ${n(more)}조각이 더 팔리면 남은 부분은 전체의 얼마인지 분수로 쓰시오.`,
  ]);
  return makeDeep(unit, stem, expr(`\\frac{${rest - more}}{${parts}}`), [
    `분모가 전체 조각 수이고 분자가 남은 조각 수이므로 이미 없어진 조각은 ` +
      `${expr(`${parts}-${rest}=${eaten}`)} 조각입니다.`,
    `${n(more)}조각이 더 없어지면 남은 조각은 ${expr(`${rest}-${more}=${rest - more}`)} 조각이므로 ` +
      `${expr(`\\frac{${rest - more}}{${parts}}`)} 입니다.`,
  ]);
}

// ── 1-6-4 분모가 같은 분수의 크기 비교 ──

const KID_PAIRS = [
  ["가은", "나윤"],
  ["다인", "라온"],
  ["시우", "하람"],
  ["도현", "서진"],
] as const;

/** 1단 — 두 분수 비교(큰·작은을 오간다). 표준(「더 큰 분수」 한 틀)과 말투를 갈라 둔다. */
function cmp164Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  const a = i + 1;
  const b = j + 1;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const askBig = intBetween(rng, 0, 1) === 0;
  const ans = askBig ? big : small;
  const frA = expr(`\\frac{${a}}{${den}}`);
  const frB = expr(`\\frac{${b}}{${den}}`);
  const stem = pick(
    rng,
    askBig
      ? [
          `두 분수 ${frA}, ${frB} 중에서 더 큰 분수를 골라 쓰시오.`,
          `${frA}, ${frB} 의 크기를 비교하여 큰 쪽을 쓰시오.`,
          `크기가 더 큰 분수를 쓰시오.\n\n${frA},  ${frB}`,
          `두 분수 가운데 큰 것을 고르시오.\n\n${frA},  ${frB}`,
        ]
      : [
          `두 분수 ${frA}, ${frB} 중에서 더 작은 분수를 골라 쓰시오.`,
          `${frA}, ${frB} 의 크기를 비교하여 작은 쪽을 쓰시오.`,
          `크기가 더 작은 분수를 쓰시오.\n\n${frA},  ${frB}`,
          `두 분수 가운데 작은 것을 고르시오.\n\n${frA},  ${frB}`,
        ],
  );
  return make(
    unit,
    stem,
    expr(`\\frac{${ans}}{${den}}`),
    `분모가 같으면 분자가 클수록 큽니다. ${expr(`${big}>${small}`)} 이므로 ${askBig ? "더 큰" : "더 작은"} 분수는 ${expr(`\\frac{${ans}}{${den}}`)} 입니다.`,
  );
}

/** 2단 — 문장 비교: 누가 더 많이 먹었는가(이름 답, 동률 불가). */
function cmp164Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  const a = i + 1;
  const b = j + 1;
  const [nameA, nameB] = pick(rng, KID_PAIRS);
  const winner = a > b ? nameA : nameB;
  const thing = pick(rng, ["피자", "케이크", "김밥", "식빵"]);
  const frA = expr(`\\frac{${a}}{${den}}`);
  const frB = expr(`\\frac{${b}}{${den}}`);
  const stem = pick(rng, [
    `${nameA}${josa(nameA, "은", "는")} ${thing} 한 판의 ${frA} 만큼, ${nameB}${josa(nameB, "은", "는")} ${frB} 만큼 먹었습니다. 더 많이 먹은 사람의 이름을 쓰시오.`,
    `같은 크기의 ${thing}에서 ${nameA}${josa(nameA, "이", "가")} ${frA} 만큼, ${nameB}${josa(nameB, "이", "가")} ${frB} 만큼 가졌습니다. 더 많이 가진 사람은 누구인지 쓰시오.`,
    `${thing} 한 판을 두고 ${nameA}${josa(nameA, "은", "는")} 전체의 ${frA} 만큼, ${nameB}${josa(nameB, "은", "는")} 전체의 ${frB} 만큼 색칠했습니다. 더 넓게 색칠한 사람의 이름을 쓰시오.`,
    `${nameA}${josa(nameA, "이", "가")} ${thing}의 ${frA} 만큼, ${nameB}${josa(nameB, "이", "가")} ${frB} 만큼 사용했습니다. 더 많이 사용한 사람은 누구인지 이름을 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    winner,
    `분모가 같으면 분자가 클수록 큽니다. ${expr(`${Math.max(a, b)}>${Math.min(a, b)}`)} 이므로 ${winner}${josa(winner, "이", "가")} 더 많습니다.`,
  );
}

/** 3단 — 세 분수 중 가장 큰·작은 것(두 번 비교, 동률 불가). */
function cmp164Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 6, 9);
  const idx = distinctIdx(rng, den - 1, 3);
  const nums = idx.map((v) => v + 1);
  const askBig = intBetween(rng, 0, 1) === 0;
  const ans = askBig ? Math.max(...nums) : Math.min(...nums);
  const frs = nums.map((v) => expr(`\\frac{${v}}{${den}}`));
  const list = `${frs[0]},  ${frs[1]},  ${frs[2]}`;
  const stem = pick(
    rng,
    askBig
      ? [
          `세 분수 중에서 가장 큰 분수를 쓰시오.\n\n${list}`,
          `다음 분수의 크기를 비교하여 가장 큰 것을 고르시오.\n\n${list}`,
          `세 분수 ${frs[0]}, ${frs[1]}, ${frs[2]} 중 가장 큰 분수를 골라 쓰시오.`,
          `가장 큰 분수는 어느 것인지 쓰시오.\n\n${list}`,
        ]
      : [
          `세 분수 중에서 가장 작은 분수를 쓰시오.\n\n${list}`,
          `다음 분수의 크기를 비교하여 가장 작은 것을 고르시오.\n\n${list}`,
          `세 분수 ${frs[0]}, ${frs[1]}, ${frs[2]} 중 가장 작은 분수를 골라 쓰시오.`,
          `가장 작은 분수는 어느 것인지 쓰시오.\n\n${list}`,
        ],
  );
  const sorted = [...nums].sort((x, y) => y - x);
  return make(
    unit,
    stem,
    expr(`\\frac{${ans}}{${den}}`),
    `분모가 같으면 분자가 클수록 큽니다. 분자를 견주면 ${expr(`${sorted[0]}>${sorted[1]}>${sorted[2]}`)} 이므로 답은 ${expr(`\\frac{${ans}}{${den}}`)} 입니다.`,
  );
}

/** 4단 — 조건 조합: $\frac{a}{d}<\frac{\square}{d}<\frac{c}{d}$ 의 $\square$ 세기. */
function cmp164Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 6, 9);
  const a = intBetween(rng, 1, den - 4);
  const c = intBetween(rng, a + 2, den - 1);
  const count = c - a - 1;
  const mid = expr(
    `\\frac{${a}}{${den}}<\\frac{\\square}{${den}}<\\frac{${c}}{${den}}`,
  );
  const stem = pick(rng, [
    `${mid} 에서 ${expr(`\\square`)} 에 들어갈 수 있는 자연수는 모두 몇 개인지 쓰시오.`,
    `${expr(`\\frac{${a}}{${den}}`)} 보다 크고 ${expr(`\\frac{${c}}{${den}}`)} 보다 작은 분수 ${expr(`\\frac{\\square}{${den}}`)} 의 ${expr(`\\square`)} 에 알맞은 자연수는 모두 몇 개인지 쓰시오.`,
    `조건에 맞는 ${expr(`\\square`)} 의 자연수는 모두 몇 개인지 구하시오.\n\n${mid}`,
    `${mid} 에 맞는 자연수 ${expr(`\\square`)} 의 개수를 쓰시오.`,
    `분모가 ${n(den)} 인 분수 중에서 ${expr(`\\frac{${a}}{${den}}`)} 보다 크고 ${expr(`\\frac{${c}}{${den}}`)} 보다 작은 분수는 모두 몇 개인지 쓰시오.`,
    `${mid} 의 ${expr(`\\square`)} 에 알맞은 자연수를 모두 찾을 때, 그 개수를 쓰시오.`,
    `두 분수 ${expr(`\\frac{${a}}{${den}}`)}, ${expr(`\\frac{${c}}{${den}}`)} 사이에 있는, 분모가 ${n(den)} 인 분수의 개수를 쓰시오.`,
    `${mid} 에 알맞은 ${expr(`\\square`)} 의 수를 모두 세면 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(count),
    `분모가 같으므로 분자만 비교하면 됩니다. ${expr(`${a}<\\square<${c}`)} 인 자연수는 ${
      count === 1
        ? `${n(a + 1)} 뿐이므로`
        : `${n(a + 1)}부터 ${n(c - 1)}까지이므로`
    } 모두 ${n(count)}개입니다.`,
  );
}

// ── 1-6-5 단위분수의 크기 비교 ──

/** 1단 — 두 단위분수 비교(큰·작은을 오간다). 표준(「더 큰 분수」 한 틀)과 갈라 둔다. */
function unit165Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  const askBig = intBetween(rng, 0, 1) === 0;
  // 단위분수는 분모가 작을수록 크다.
  const ans = askBig ? Math.min(a, b) : Math.max(a, b);
  const frA = expr(`\\frac{1}{${a}}`);
  const frB = expr(`\\frac{1}{${b}}`);
  const stem = pick(
    rng,
    askBig
      ? [
          `두 단위분수 ${frA}, ${frB} 중에서 더 큰 분수를 골라 쓰시오.`,
          `${frA}, ${frB} 의 크기를 비교하여 큰 쪽을 쓰시오.`,
          `크기가 더 큰 단위분수를 쓰시오.\n\n${frA},  ${frB}`,
          `두 분수 가운데 큰 것을 고르시오.\n\n${frA},  ${frB}`,
        ]
      : [
          `두 단위분수 ${frA}, ${frB} 중에서 더 작은 분수를 골라 쓰시오.`,
          `${frA}, ${frB} 의 크기를 비교하여 작은 쪽을 쓰시오.`,
          `크기가 더 작은 단위분수를 쓰시오.\n\n${frA},  ${frB}`,
          `두 분수 가운데 작은 것을 고르시오.\n\n${frA},  ${frB}`,
        ],
  );
  return make(
    unit,
    stem,
    expr(`\\frac{1}{${ans}}`),
    `단위분수는 분모가 작을수록 큽니다. ${expr(`${Math.min(a, b)}<${Math.max(a, b)}`)} 이므로 답은 ${expr(`\\frac{1}{${ans}}`)} 입니다.`,
  );
}

/** 2단 — 이야기 비교: 조각 수가 다르게 나눈 두 사람(이름 답). */
function unit165Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  const [nameA, nameB] = pick(rng, KID_PAIRS);
  // 조각 수가 적게 나눈 쪽의 한 조각이 더 크다.
  const winner = a < b ? nameA : nameB;
  const thing = pick(rng, ["케이크", "피자", "떡", "파이"]);
  const stem = pick(rng, [
    `똑같은 ${thing}${josa(thing, "을", "를")} ${nameA}${josa(nameA, "은", "는")} ${n(a)}조각으로, ${nameB}${josa(nameB, "은", "는")} ${n(b)}조각으로 똑같이 나누어 각각 한 조각씩 먹었습니다. 더 많이 먹은 사람의 이름을 쓰시오.`,
    `크기가 같은 ${thing}${josa(thing, "을", "를")} ${nameA}${josa(nameA, "이", "가")} ${n(a)}등분, ${nameB}${josa(nameB, "이", "가")} ${n(b)}등분 하여 한 조각씩 가졌습니다. 더 큰 조각을 가진 사람은 누구인지 쓰시오.`,
    `같은 크기의 ${thing}${josa(thing, "을", "를")} ${nameA}${josa(nameA, "은", "는")} 똑같이 ${n(a)}조각, ${nameB}${josa(nameB, "은", "는")} 똑같이 ${n(b)}조각으로 나눴습니다. 한 조각의 크기가 더 큰 쪽의 이름을 쓰시오.`,
    `${nameA}${josa(nameA, "이", "가")} ${n(a)}조각으로, ${nameB}${josa(nameB, "이", "가")} ${n(b)}조각으로 같은 ${thing}${josa(thing, "을", "를")} 똑같이 나눴다면, 한 조각이 더 큰 사람은 누구인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    winner,
    `같은 전체를 나누면 조각 수가 적을수록 한 조각이 큽니다. ${expr(`${Math.min(a, b)}<${Math.max(a, b)}`)} 이므로 ${winner}${josa(winner, "이", "가")} 더 큽니다.`,
  );
}

/** 3단 — 세 단위분수 중 가장 큰·작은 것(동률 불가). */
function unit165Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const idx = distinctIdx(rng, 8, 3);
  const dens = idx.map((v) => v + 2);
  const askBig = intBetween(rng, 0, 1) === 0;
  const ans = askBig ? Math.min(...dens) : Math.max(...dens);
  const frs = dens.map((v) => expr(`\\frac{1}{${v}}`));
  const list = `${frs[0]},  ${frs[1]},  ${frs[2]}`;
  const stem = pick(
    rng,
    askBig
      ? [
          `세 단위분수 중에서 가장 큰 분수를 쓰시오.\n\n${list}`,
          `다음 단위분수의 크기를 비교하여 가장 큰 것을 고르시오.\n\n${list}`,
          `세 분수 ${frs[0]}, ${frs[1]}, ${frs[2]} 중 가장 큰 분수를 골라 쓰시오.`,
          `가장 큰 단위분수는 어느 것인지 쓰시오.\n\n${list}`,
        ]
      : [
          `세 단위분수 중에서 가장 작은 분수를 쓰시오.\n\n${list}`,
          `다음 단위분수의 크기를 비교하여 가장 작은 것을 고르시오.\n\n${list}`,
          `세 분수 ${frs[0]}, ${frs[1]}, ${frs[2]} 중 가장 작은 분수를 골라 쓰시오.`,
          `가장 작은 단위분수는 어느 것인지 쓰시오.\n\n${list}`,
        ],
  );
  const sorted = [...dens].sort((x, y) => x - y);
  return make(
    unit,
    stem,
    expr(`\\frac{1}{${ans}}`),
    `단위분수는 분모가 작을수록 큽니다. 분모를 견주면 ${expr(`${sorted[0]}<${sorted[1]}<${sorted[2]}`)} 이므로 답은 ${expr(`\\frac{1}{${ans}}`)} 입니다.`,
  );
}

/** 4단 — 조건 조합: 부등식의 $\square$ 에 들어갈 수 세기(범위가 닫힌 방향만 쓴다). */
function unit165Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    // 1/□ > 1/k (□ ≥ 2) — □ < k 이므로 k−2 개.
    const k = intBetween(rng, 5, 9);
    const count = k - 2;
    const rel = expr(`\\frac{1}{\\square}>\\frac{1}{${k}}`);
    const stem = pick(rng, [
      `${rel} 에서 ${expr(`\\square`)} 에 들어갈 수 있는 $2$ 이상의 자연수는 모두 몇 개인지 쓰시오.`,
      `${expr(`\\frac{1}{${k}}`)} 보다 큰 단위분수 ${expr(`\\frac{1}{\\square}`)} 의 ${expr(`\\square`)} 에 알맞은 $2$ 이상의 자연수는 모두 몇 개인지 쓰시오.`,
      `조건에 맞는 ${expr(`\\square`)} 의 자연수($2$ 이상)는 모두 몇 개인지 구하시오.\n\n${rel}`,
      `${rel} 에 맞는 $2$ 이상의 자연수 ${expr(`\\square`)} 의 개수를 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(count),
      `단위분수는 분모가 작을수록 크므로 ${expr(`\\square<${k}`)} 여야 합니다. $2$ 이상이므로 ${expr(`2`)} 부터 ${n(k - 1)}까지, 모두 ${n(count)}개입니다.`,
    );
  }
  // 1/a < 1/□ < 1/b — b < □ < a 이므로 a−b−1 개.
  const b = intBetween(rng, 2, 5);
  const a = intBetween(rng, b + 2, 9);
  const count = a - b - 1;
  const rel = expr(`\\frac{1}{${a}}<\\frac{1}{\\square}<\\frac{1}{${b}}`);
  const stem = pick(rng, [
    `${rel} 에서 ${expr(`\\square`)} 에 들어갈 수 있는 자연수는 모두 몇 개인지 쓰시오.`,
    `${expr(`\\frac{1}{${a}}`)} 보다 크고 ${expr(`\\frac{1}{${b}}`)} 보다 작은 단위분수 ${expr(`\\frac{1}{\\square}`)} 의 ${expr(`\\square`)} 에 알맞은 자연수는 모두 몇 개인지 쓰시오.`,
    `조건에 맞는 ${expr(`\\square`)} 의 자연수는 모두 몇 개인지 구하시오.\n\n${rel}`,
    `${rel} 에 맞는 자연수 ${expr(`\\square`)} 의 개수를 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(count),
    `단위분수는 분모가 작을수록 크므로 ${expr(`${b}<\\square<${a}`)} 여야 합니다. ${
      count === 1
        ? `${n(b + 1)} 뿐이므로`
        : `${n(b + 1)}부터 ${n(a - 1)}까지이므로`
    } 모두 ${n(count)}개입니다.`,
  );
}

// ── 1-6-6 소수 알아보기 ──

/** 1단 — 분수↔소수·자리 만들기 네 형. 표준(색칠 문장+그림 한 틀)과 갈라 둔다. */
function dec166Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const form = intBetween(rng, 0, 3);
  const prompt = intBetween(rng, 0, 1);
  if (form === 0) {
    const k = intBetween(rng, 1, 9);
    return make(
      unit,
      prompt === 0
        ? `다음 분수를 소수로 나타내시오.\n\n${expr(`\\frac{${k}}{10}`)}`
        : `분수 ${expr(`\\frac{${k}}{10}`)} 의 값을 소수로 쓰시오.`,
      n(`0.${k}`),
      `${expr(`\\frac{${k}}{10}`)} 의 값은 $0.1$ 짜리가 ${n(k)}개라는 뜻이므로 소수로 쓰면 ${expr(`0.${k}`)} 입니다.`,
    );
  }
  if (form === 1) {
    const k = intBetween(rng, 1, 9);
    return make(
      unit,
      prompt === 0
        ? `다음 소수를 분수로 나타내시오.\n\n${expr(`0.${k}`)}`
        : `소수 ${expr(`0.${k}`)} 의 값을 분수로 쓰시오.`,
      expr(`\\frac{${k}}{10}`),
      `${expr(`0.${k}`)} 의 값은 $0.1$ 짜리가 ${n(k)}개라는 뜻이므로 분수로 쓰면 ${expr(`\\frac{${k}}{10}`)} 입니다.`,
    );
  }
  if (form === 2) {
    const w = intBetween(rng, 1, 4);
    const t = intBetween(rng, 1, 9);
    return make(
      unit,
      prompt === 0
        ? `$1$ 짜리가 ${n(w)}개, $0.1$ 짜리가 ${n(t)}개 있으면 모두 얼마인지 소수로 쓰시오.`
        : `$1$ 짜리 ${n(w)}개와 $0.1$ 짜리 ${n(t)}개를 모은 수를 소수로 나타내시오.`,
      n(`${w}.${t}`),
      `$1$ 짜리 ${n(w)}개는 ${n(w)}, $0.1$ 짜리 ${n(t)}개는 ${expr(`0.${t}`)} 이므로 모으면 ${expr(`${w}.${t}`)} 입니다.`,
    );
  }
  const w = intBetween(rng, 1, 3);
  const t = intBetween(rng, 1, 9);
  const m = w * 10 + t;
  return make(
    unit,
    prompt === 0
      ? `$0.1$ 짜리가 ${n(m)}개 있으면 모두 얼마인지 소수로 쓰시오.`
      : `$0.1$ 짜리 ${n(m)}개를 모은 수를 소수로 나타내시오.`,
    n(`${w}.${t}`),
    `$0.1$ 짜리 ${n(10)}개가 $1$ 입니다. ${n(m)}개는 $1$ 짜리 ${n(w)}개와 $0.1$ 짜리 ${n(t)}개이므로 ${expr(`${w}.${t}`)} 입니다.`,
  );
}

/** 2단 — 문장 변환: mm→cm 소수, 열 조각 이야기. */
function dec166Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const form = intBetween(rng, 0, 1);
  if (form === 0) {
    const k = intBetween(rng, 1, 9);
    const thing = pick(rng, ["못", "클립", "씨앗", "지우개"]);
    const stem = pick(rng, [
      `${thing}의 길이는 ${unitNum(k, "mm")} 입니다. 이 길이는 몇 cm인지 소수로 쓰시오.`,
      `길이가 ${unitNum(k, "mm")} 인 ${thing}${josa(thing, "이", "가")} 있습니다. cm 단위의 소수로 나타내시오.`,
    ]);
    return make(
      unit,
      stem,
      n(`0.${k}`),
      `$1\\,\\mathrm{mm}$ 는 $0.1\\,\\mathrm{cm}$ 입니다. ${unitNum(k, "mm")} 는 $0.1$ 짜리가 ${n(k)}개이므로 ${expr(`0.${k}`)} cm입니다.`,
    );
  }
  const k = intBetween(rng, 1, 9);
  const thing = pick(rng, ["떡", "양갱", "두부", "카스텔라"]);
  const stem = pick(rng, [
    `${thing} 한 개를 똑같이 ${n(10)}조각으로 나누어 ${n(k)}조각을 먹었습니다. 먹은 부분을 소수로 나타내시오.`,
    `${thing}${josa(thing, "을", "를")} 똑같이 ${n(10)}조각으로 나눈 것 중 ${n(k)}조각에 색칠했습니다. 색칠한 부분을 소수로 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(`0.${k}`),
    `전체를 똑같이 ${n(10)}조각으로 나눈 것 중 ${n(k)}조각이므로 ${expr(`\\frac{${k}}{10}`)} 이고, 소수로 쓰면 ${expr(`0.${k}`)} 입니다.`,
  );
}

/** 3단 — 두 부분을 모아 소수로(두 단계): cm·mm 결합, 온전한 것+조각. */
function dec166Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 4);
  const t = intBetween(rng, 1, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const thing = pick(rng, ["연필", "리본", "빨대", "막대"]);
    const stem = pick(rng, [
      `${thing}의 길이는 ${n(w)} cm ${n(t)} mm 입니다. 이 길이는 몇 cm인지 소수로 나타내시오.`,
      `길이가 ${n(w)} cm ${n(t)} mm 인 ${thing}${josa(thing, "이", "가")} 있습니다. cm 단위의 소수로 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(`${w}.${t}`),
      `${n(t)} mm 는 ${expr(`0.${t}`)} cm입니다. ${n(w)} cm 와 ${expr(`0.${t}`)} cm 를 모으면 ${expr(`${w}.${t}`)} cm입니다.`,
    );
  }
  const thing = pick(rng, ["초콜릿", "떡", "카스텔라", "양갱"]);
  const stem = pick(rng, [
    `온전한 ${thing} ${n(w)}개와, 똑같이 ${n(10)}조각으로 나눈 ${thing}의 ${n(t)}조각이 있습니다. ${thing}${josa(thing, "은", "는")} 모두 몇 개인지 소수로 나타내시오.`,
    `${thing} ${n(w)}개가 통째로 있고, 한 개를 ${n(10)}등분한 조각이 ${n(t)}개 더 있습니다. 모두 몇 개인지 소수로 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(`${w}.${t}`),
    `${n(10)}등분한 ${n(t)}조각은 ${expr(`0.${t}`)} 개입니다. ${n(w)}개와 모으면 ${expr(`${w}.${t}`)} 개입니다.`,
  );
}

/** 4단 — 역산: 소수를 $0.1$ 짜리 개수·mm 로 되짚는다. */
function dec166Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 3);
  const t = intBetween(rng, 1, 9);
  const total = w * 10 + t;
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `$0.1$ 짜리가 몇 개 모여야 소수 ${expr(`${w}.${t}`)} 만큼이 되는지 쓰시오.`,
      `$0.1$ 짜리를 몇 개 모으면 ${expr(`${w}.${t}`)} 만큼이 되는지 쓰시오.`,
      `소수 ${expr(`${w}.${t}`)} 만큼을 만들려면 $0.1$ 짜리가 몇 개 필요한지 쓰시오.`,
      `${expr(`${w}.${t}`)} 만큼은 $0.1$ 짜리가 몇 개인 수인지 구하시오.`,
    ]);
    return make(
      unit,
      stem,
      n(total),
      `$1$ 짜리 ${n(w)}개는 $0.1$ 짜리 ${n(w * 10)}개와 같고, ${expr(`0.${t}`)} 만큼은 $0.1$ 짜리 ${n(t)}개입니다. ${expr(`${w * 10}+${t}=${total}`)} 이므로 ${n(total)}개입니다.`,
    );
  }
  // ⚠️ 예전에는 「$w.t$ cm 는 몇 mm」로 **환산 한 번**이었다 — 같은 소단원 응용
  //    (「$a$ cm $b$ mm 를 소수로」)보다도 쉬웠다. 이제 환산한 뒤 **덜어 내고 다시
  //    소수로 되돌린다** — 응용이 하는 일을 안에 품고 한 걸음 더 간다.
  const thing = pick(rng, ["연필", "리본", "빨대", "막대"]);
  // 남은 길이가 `$2.0$` 처럼 소수 자리가 $0$ 이면 소수로 쓸 까닭이 사라진다 — 뽑을 때 막는다.
  const cut0 = intBetween(rng, 1, Math.max(1, total - 11));
  const cut = (total - cut0) % 10 === 0 ? cut0 + 1 : cut0;
  const left = total - cut;
  const stem = pick(rng, [
    `${thing}의 길이는 ${expr(`${w}.${t}`)} cm입니다. 여기서 ${n(cut)} mm를 잘라 내면 남은 길이는 몇 cm인지 소수로 쓰시오.`,
    `길이가 ${expr(`${w}.${t}`)} cm인 ${thing}${josa(thing, "이", "가")} 있습니다. ${n(cut)} mm를 잘라 쓰고 남은 길이를 소수로 나타내시오.`,
    `${expr(`${w}.${t}`)} cm짜리 ${thing}에서 ${n(cut)} mm를 잘라 냈습니다. 남은 길이는 몇 cm인지 소수로 쓰시오.`,
  ]);
  return makeDeep(unit, stem, expr(`${Math.floor(left / 10)}.${left % 10}`), [
    `$1\\,\\mathrm{cm}=10\\,\\mathrm{mm}$ 이므로 ${expr(`${w}.${t}`)} cm 는 ` +
      `${expr(`${w * 10}+${t}=${total}`)} mm입니다.`,
    `${expr(`${total}-${cut}=${left}`)} mm이고, $10$ mm가 $1$ cm이므로 ` +
      `${expr(`${Math.floor(left / 10)}.${left % 10}`)} cm입니다.`,
  ]);
}

// ── 1-6-7 소수의 크기 비교 ──

/** 1단 — 두 소수 비교(큰·작은을 오간다, 동률 불가). 표준(「더 큰 수」 한 틀)과 갈라 둔다. */
function cmp167Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decStrOf(i);
  const B = decStrOf(j);
  const askBig = intBetween(rng, 0, 1) === 0;
  const vA = decIdxVal(i).w * 10 + decIdxVal(i).t;
  const vB = decIdxVal(j).w * 10 + decIdxVal(j).t;
  const ans = askBig ? (vA > vB ? A : B) : vA > vB ? B : A;
  const stem = pick(
    rng,
    askBig
      ? [
          `두 소수 ${n(A)}, ${n(B)} 중에서 더 큰 수를 골라 쓰시오.`,
          `${n(A)}, ${n(B)} 의 크기를 비교하여 큰 쪽을 쓰시오.`,
          `크기가 더 큰 소수를 쓰시오.\n\n${n(A)},  ${n(B)}`,
          `두 소수 가운데 큰 것을 고르시오.\n\n${n(A)},  ${n(B)}`,
        ]
      : [
          `두 소수 ${n(A)}, ${n(B)} 중에서 더 작은 수를 골라 쓰시오.`,
          `${n(A)}, ${n(B)} 의 크기를 비교하여 작은 쪽을 쓰시오.`,
          `크기가 더 작은 소수를 쓰시오.\n\n${n(A)},  ${n(B)}`,
          `두 소수 가운데 작은 것을 고르시오.\n\n${n(A)},  ${n(B)}`,
        ],
  );
  return make(
    unit,
    stem,
    n(ans),
    `자연수 부분부터 비교하고, 같으면 소수 첫째 자리를 비교합니다. ${askBig ? "더 큰" : "더 작은"} 수는 ${expr(ans)} 입니다.`,
  );
}

/** 2단 — 기록 비교 문장(이름 답, 동률 불가). */
function cmp167Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decStrOf(i);
  const B = decStrOf(j);
  const vA = decIdxVal(i).w * 10 + decIdxVal(i).t;
  const vB = decIdxVal(j).w * 10 + decIdxVal(j).t;
  const [nameA, nameB] = pick(rng, KID_PAIRS);
  const winner = vA > vB ? nameA : nameB;
  const stem = pick(rng, [
    `멀리뛰기에서 ${nameA}${josa(nameA, "은", "는")} ${n(A)} m, ${nameB}${josa(nameB, "은", "는")} ${n(B)} m 뛰었습니다. 더 멀리 뛴 사람의 이름을 쓰시오.`,
    `${nameA}${josa(nameA, "이", "가")} 캔 고구마는 ${n(A)} kg, ${nameB}${josa(nameB, "이", "가")} 캔 고구마는 ${n(B)} kg입니다. 더 많이 캔 사람은 누구인지 쓰시오.`,
    `리본을 ${nameA}${josa(nameA, "은", "는")} ${n(A)} m, ${nameB}${josa(nameB, "은", "는")} ${n(B)} m 가지고 있습니다. 더 긴 리본을 가진 사람의 이름을 쓰시오.`,
    `물을 ${nameA}${josa(nameA, "이", "가")} ${n(A)} L, ${nameB}${josa(nameB, "이", "가")} ${n(B)} L 마셨습니다. 더 많이 마신 사람은 누구인지 이름을 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    winner,
    `자연수 부분부터 비교하고, 같으면 소수 첫째 자리를 비교합니다. ${expr(vA > vB ? A : B)} 쪽이 더 크므로 ${winner}${josa(winner, "이", "가")} 답입니다.`,
  );
}

/** 3단 — 세 소수 중 가장 큰·작은 것(동률 불가). */
function cmp167Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const idx = distinctIdx(rng, 36, 3);
  const strs = idx.map(decStrOf);
  const vals = idx.map((v) => decIdxVal(v).w * 10 + decIdxVal(v).t);
  const askBig = intBetween(rng, 0, 1) === 0;
  const pickIdx = askBig
    ? vals.indexOf(Math.max(...vals))
    : vals.indexOf(Math.min(...vals));
  const ans = strs[pickIdx]!;
  const list = `${n(strs[0]!)},  ${n(strs[1]!)},  ${n(strs[2]!)}`;
  const stem = pick(
    rng,
    askBig
      ? [
          `세 소수 중에서 가장 큰 수를 쓰시오.\n\n${list}`,
          `다음 소수의 크기를 비교하여 가장 큰 것을 고르시오.\n\n${list}`,
          `세 소수 ${n(strs[0]!)}, ${n(strs[1]!)}, ${n(strs[2]!)} 중 가장 큰 수를 골라 쓰시오.`,
          `가장 큰 소수는 어느 것인지 쓰시오.\n\n${list}`,
        ]
      : [
          `세 소수 중에서 가장 작은 수를 쓰시오.\n\n${list}`,
          `다음 소수의 크기를 비교하여 가장 작은 것을 고르시오.\n\n${list}`,
          `세 소수 ${n(strs[0]!)}, ${n(strs[1]!)}, ${n(strs[2]!)} 중 가장 작은 수를 골라 쓰시오.`,
          `가장 작은 소수는 어느 것인지 쓰시오.\n\n${list}`,
        ],
  );
  const sortedStrs = idx
    .map((v) => ({ s: decStrOf(v), val: decIdxVal(v).w * 10 + decIdxVal(v).t }))
    .sort((x, y) => y.val - x.val)
    .map((x) => x.s);
  return make(
    unit,
    stem,
    n(ans),
    `자연수 부분부터 비교하고, 같으면 소수 첫째 자리를 비교합니다. 크기 순서는 ${expr(`${sortedStrs[0]}>${sortedStrs[1]}>${sortedStrs[2]}`)} 이므로 답은 ${expr(ans)} 입니다.`,
  );
}

/** 4단 — 조건 조합: 같은 자연수부에서 $w.a<w.\square<w.b$ 의 $\square$ 세기. */
function cmp167Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 0, 3);
  const a = intBetween(rng, 1, 6);
  const b = intBetween(rng, a + 2, 8);
  const count = b - a - 1;
  const rel = expr(`${w}.${a}<${w}.\\square<${w}.${b}`);
  const stem = pick(rng, [
    `${rel} 에서 ${expr(`\\square`)} 에 들어갈 수 있는 수는 모두 몇 개인지 쓰시오.`,
    `${expr(`${w}.${a}`)} 보다 크고 ${expr(`${w}.${b}`)} 보다 작은 소수 ${expr(`${w}.\\square`)} 의 ${expr(`\\square`)} 에 알맞은 수는 모두 몇 개인지 쓰시오.`,
    `조건에 맞는 ${expr(`\\square`)} 의 수는 모두 몇 개인지 구하시오.\n\n${rel}`,
    `${rel} 에 맞는 ${expr(`\\square`)} 의 개수를 쓰시오.`,
    `${expr(`${w}.${a}`)}, ${expr(`${w}.${b}`)} 사이에 있는 소수 한 자리 수는 모두 몇 개인지 쓰시오.`,
    `${rel} 의 ${expr(`\\square`)} 에 알맞은 수를 모두 찾을 때, 그 개수를 쓰시오.`,
    `두 소수 ${expr(`${w}.${a}`)}, ${expr(`${w}.${b}`)} 사이의 소수 한 자리 수를 모두 세어 그 수를 쓰시오.`,
    `${rel} 에 알맞은 ${expr(`\\square`)} 의 수를 모두 세면 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(count),
    `자연수 부분이 같으므로 소수 첫째 자리만 비교합니다. ${expr(`${a}<\\square<${b}`)} 인 수는 ${
      count === 1
        ? `${n(a + 1)} 뿐이므로`
        : `${n(a + 1)}부터 ${n(b - 1)}까지이므로`
    } 모두 ${n(count)}개입니다.`,
  );
}

// ── 2-1 곱셈 (D-72 확대) ─────────────────────────────────────────────────
//
// 이름 약속: 2-1-1/2 는 (세 자리)×(한 자리), 2-1-3 은 (몇십)×(몇십)·(몇십몇)×(몇십)·
// (몇)×(몇십몇) 세 꼴, 2-1-4 는 (몇십몇)×(몇십몇). «몇십몇»은 자리 구성(십 1..9 ·
// 일 1..9)으로 만든다 — 일의 자리 0 이 뽑는 범위에 아예 없다(재추첨 없음).
// (1)/(2)의 올림 종류는 표준과 **같은 함수**(mul3x1)가 정한다 — 규칙이 두 벌이 되지 않게.

/** «몇십몇» — 십의 자리 1..9, 일의 자리 1..9. */
function tensOnes21(rng: Rng): number {
  return intBetween(rng, 1, 9) * 10 + intBetween(rng, 1, 9);
}

/** 소단원 이름이 약속한 올림 횟수 — «(1)» 0~1번, «(2)» 2~3번. 갈림의 **단 하나의 자리**. */
function carryBand21(section: string): [number, number] {
  return section.includes("(2)") ? [2, 3] : [0, 1];
}

/** 2-1-1·2-1-2 의 곱 한 벌 — 표준 mul32 와 **같은 함수**(mul3x1)로 뽑는다. */
function mul21PairOf(section: string, rng: Rng): [number, number] {
  const [lo, hi] = carryBand21(section);
  return mul3x1(rng, lo, hi);
}

/** 1단 — (세 자리)×(한 자리) 식 그대로. */
function mul21Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  const eq = expr(`${a}\\times${b}`);
  const eqBox = expr(`${a}\\times${b}=\\square`);
  const sq = expr(`\\square`);
  const stem = pick(rng, [
    `계산 결과를 쓰시오.\n\n${eqBox}`,
    `${eq} 의 곱을 구하시오.`,
    `다음 식을 계산하시오.\n\n${eqBox}`,
    `곱셈식을 계산하여 ${sq} 의 값을 쓰시오.\n\n${eqBox}`,
    `${eq} 의 값을 계산하시오.`,
    `계산하여 알맞은 수를 ${sq} 에 쓰시오.\n\n${eqBox}`,
    `다음 곱셈식의 곱을 쓰시오.\n\n${eq}`,
    `곱셈을 하여 값을 구하시오.\n\n${eqBox}`,
  ]);
  return make(unit, stem, n(p), `${expr(`${a}\\times${b}=${p}`)} 입니다.`);
}

/** 2단 — 문장. 세 자리 수가 자연스러운 소재(공장·쪽수·값)를 쓴다. */
function mul21Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  const stem = pick(rng, [
    `공장에서 인형을 하루에 ${n(a)}개씩 만듭니다. ${n(b)}일 동안 만드는 인형은 모두 몇 개인지 쓰시오.`,
    `동화책 한 권은 ${n(a)}쪽입니다. 같은 책 ${n(b)}권의 쪽수를 모두 더하면 몇 쪽인지 쓰시오.`,
    `한 자루에 ${n(a)}원인 연필이 있습니다. 이 연필 ${n(b)}자루의 값은 모두 얼마인지 쓰시오.`,
    `빵집에서 빵을 하루에 ${n(a)}개씩 굽습니다. ${n(b)}일 동안 굽는 빵은 모두 몇 개인지 쓰시오.`,
    `젤리가 한 통에 ${n(a)}개씩 담겨 있습니다. ${n(b)}통에 담긴 젤리는 모두 몇 개인지 쓰시오.`,
    `마트에 물병이 한 층에 ${n(a)}병씩 진열되어 있습니다. ${n(b)}층에 진열된 물병은 모두 몇 병인지 쓰시오.`,
    `농장에서 달걀을 하루에 ${n(a)}개씩 거둡니다. ${n(b)}일 동안 거두는 달걀은 모두 몇 개인지 쓰시오.`,
    `과수원에서 사과를 한 상자에 ${n(a)}개씩 담았습니다. ${n(b)}상자에 담은 사과는 모두 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p),
    `같은 수를 ${n(b)}번 더하는 것은 곱셈과 같습니다. ${expr(`${a}\\times${b}=${p}`)} 입니다.`,
  );
}

/** 3단 — 곱한 뒤 더하거나 덜어내는 두 단계. */
function mul21Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  const c = intBetween(rng, 11, Math.min(98, p - 11));
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `문구점에서 색종이를 ${n(a)}장씩 ${n(b)}묶음 들여오고, 낱장으로 ${n(c)}장을 더 들여왔습니다. 들여온 색종이는 모두 몇 장인지 쓰시오.`,
      `공장에서 부품을 하루에 ${n(a)}개씩 ${n(b)}일 동안 만들고, 마지막 날 ${n(c)}개를 더 만들었습니다. 만든 부품은 모두 몇 개인지 쓰시오.`,
      `한 상자에 ${n(a)}개씩 든 나사 ${n(b)}상자와 낱개 나사 ${n(c)}개가 있습니다. 나사는 모두 몇 개인지 쓰시오.`,
      `책을 하루에 ${n(a)}쪽씩 ${n(b)}일 동안 읽고, 오늘 ${n(c)}쪽을 더 읽었습니다. 지금까지 읽은 쪽수는 모두 몇 쪽인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(p + c),
      `먼저 곱합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다. 남은 것까지 더하면 ${expr(`${p}+${c}=${p + c}`)} 입니다.`,
    );
  }
  const stem = pick(rng, [
    `빵집에서 빵을 하루에 ${n(a)}개씩 ${n(b)}일 동안 구웠습니다. 그중 ${n(c)}개가 팔렸다면 남은 빵은 몇 개인지 쓰시오.`,
    `달걀을 하루에 ${n(a)}개씩 ${n(b)}일 동안 거두었는데, 그중 ${n(c)}개를 요리에 썼습니다. 남은 달걀은 몇 개인지 쓰시오.`,
    `구슬을 한 통에 ${n(a)}개씩 ${n(b)}통 준비했다가 ${n(c)}개를 친구에게 주었습니다. 남은 구슬은 몇 개인지 쓰시오.`,
    `쿠키를 한 번에 ${n(a)}개씩 ${n(b)}번 구운 뒤 ${n(c)}개를 포장해 보냈습니다. 남은 쿠키는 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p - c),
    `먼저 곱합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다. 덜어낸 만큼 빼면 ${expr(`${p}-${c}=${p - c}`)} 입니다.`,
  );
}

/**
 * 4단 — 역산 세 틀. ㉠ 곱하는 한 자리 수를 되짚는다. ㉡ 가린 자리의 숫자를 되찾는다.
 * ㉢ 되짚은 «어떤 수»를 다른 수로 다시 곱한다(두 단계).
 *
 * 해설은 곱셈만 쓴다 — 나눗셈은 2-2 라 아직 안 배웠다(D-66⑶).
 * ⚠️ 틀이 ㉠ 하나뿐이면 **답이 «$2$» 로 39% 쏠린다**(실측 300씨앗 117건) — 표준이
 * 쓰는 `mul3x1` 이 올림 0~1번 조건에서 곱하는 수 2를 자주 뽑기 때문이다. 표준 함수는
 * 건드리지 않고(표준 출력 보존) **틀을 늘려** 쏠림을 나눈다.
 */
function mul21Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  const sq = expr(`\\square`);
  // ㉢ 이 쓸 두 번째 곱하는 수 — 처음 수와 다르고, **소단원이 약속한 올림 횟수**를
  // 그대로 지키는 것만 모은다(전수 열거). 비면 ㉢ 을 안 쓴다 — 되뽑기 고리를 두지 않는다.
  const [lo, hi] = carryBand21(unit.section);
  const pool2 = [2, 3, 4, 5, 6, 7, 8, 9].filter(
    (v) => v !== b && mulCarries3x1(a, v) >= lo && mulCarries3x1(a, v) <= hi,
  );
  const frame = intBetween(rng, 0, pool2.length === 0 ? 1 : 2);
  if (frame === 0) {
    const eqD = expr(`${a}\\times\\square=${p}`);
    const stem = pick(rng, [
      `곱셈식의 ${sq} 에 알맞은 수를 쓰시오.\n\n${eqD}`,
      `${eqD} 에서 ${sq} 의 값을 구하시오.`,
      `다음 곱셈식이 맞으려면 ${sq} 에 어떤 수가 들어가야 하는지 쓰시오.\n\n${eqD}`,
      `${sq} 에 알맞은 한 자리 수를 구하시오.\n\n${eqD}`,
      // ⚠️ 아래 넷은 문장이 앞선다 — 그래도 **한 자리 수가 지면에 서야** 한다.
      // 답이 한 자리라 발문에 안 나오면 소단원 이름의 「한 자리 수」가 지면에서 사라진다
      // (조건 판정기 실측 10/40·5/40). 그래서 넷 다 ${sq} 가 든 식을 함께 싣는다.
      `${n(a)} 에 어떤 한 자리 수를 곱한 결과가 ${n(p)} 입니다. 곱한 수를 구하시오.\n\n${eqD}`,
      `${n(a)} 의 몇 배가 ${n(p)} 인지 구하시오.\n\n${eqD}`,
      `어떤 한 자리 수와 ${n(a)} 의 곱이 ${n(p)} 입니다. 어떤 수를 구하시오.\n\n${eqD}`,
      `${n(a)} 씩 ${sq} 묶음이면 모두 ${n(p)} 입니다. ${sq} 에 알맞은 수를 구하시오.`,
    ]);
    return make(
      unit,
      stem,
      n(b),
      `${expr(`${a}\\times${b}=${p}`)} 이므로 구하는 한 자리 수는 ${n(b)} 입니다.`,
    );
  }
  if (frame === 1) {
    // 가린 자리 하나. 곱은 가린 숫자에 대해 **엄격히 커지므로** 답이 하나로 정해진다.
    const pos = intBetween(rng, 0, 2);
    const hidden = Math.floor(a / 10 ** pos) % 10;
    const masked = [2, 1, 0]
      .map((d) =>
        d === pos ? "\\square" : String(Math.floor(a / 10 ** d) % 10),
      )
      .join("");
    const eqH = expr(`${masked}\\times${b}=${p}`);
    const place = pos === 0 ? "일" : pos === 1 ? "십" : "백";
    const stem = pick(rng, [
      `${sq} 에 알맞은 숫자를 구하시오.\n\n${eqH}`,
      `곱셈식이 맞도록 ${sq} 에 알맞은 숫자를 써넣으시오.\n\n${eqH}`,
      `가려진 ${place}의 자리 숫자를 구하시오.\n\n${eqH}`,
      `다음 곱셈식에서 ${sq} 에 들어갈 숫자를 쓰시오.\n\n${eqH}`,
    ]);
    return make(
      unit,
      stem,
      n(hidden),
      `곱해지는 수를 찾으면 ${expr(`${a}\\times${b}=${p}`)} 이므로 ${sq} 에 알맞은 숫자는 ${n(hidden)} 입니다.`,
    );
  }
  const b2 = pool2[intBetween(rng, 0, pool2.length - 1)]!;
  const stem = pick(rng, [
    `어떤 수를 ${n(b)}배 하였더니 ${n(p)} 입니다. 이 어떤 수를 ${n(b2)}배 하면 얼마인지 쓰시오.`,
    `어떤 수의 ${n(b)}배가 ${n(p)} 입니다. 같은 어떤 수의 ${n(b2)}배는 얼마인지 구하시오.`,
    `어떤 수를 ${n(b)}번 더한 값이 ${n(p)} 입니다. 이 어떤 수를 ${n(b2)}번 더하면 얼마인지 쓰시오.`,
    `어떤 수를 ${n(b)}배 한 값이 ${n(p)} 일 때, 그 어떤 수를 ${n(b2)}배 한 값을 구하시오.`,
  ]);
  return make(
    unit,
    stem,
    n(a * b2),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 어떤 수는 ${n(a)} 입니다. 그 수를 ${n(b2)}배 하면 ${expr(`${a}\\times${b2}=${a * b2}`)} 입니다.`,
  );
}

/** 2-1-3 — 세 꼴 중 하나를 뽑는다. 셋 다 이름의 합집합 안이다. */
function mul213PairOf(rng: Rng): [number, number] {
  const shape = intBetween(rng, 0, 2);
  if (shape === 0)
    return [intBetween(rng, 2, 9) * 10, intBetween(rng, 2, 9) * 10];
  if (shape === 1) return [tensOnes21(rng), intBetween(rng, 2, 9) * 10];
  return [intBetween(rng, 2, 9), tensOnes21(rng)];
}

/** 1단 — 세 꼴 식 그대로. */
function mul213Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  const eq = expr(`${a}\\times${b}`);
  const eqBox = expr(`${a}\\times${b}=\\square`);
  const sq = expr(`\\square`);
  const stem = pick(rng, [
    `곱을 계산하시오.\n\n${eqBox}`,
    `${eq} 의 값을 구하여 쓰시오.`,
    `다음 곱셈의 곱을 구하시오.\n\n${eq}`,
    `${sq} 에 알맞은 값을 쓰시오.\n\n${eqBox}`,
    `계산하시오.\n\n${eqBox}`,
    `${eq} 의 계산 결과를 쓰시오.`,
    `곱셈식의 곱을 구하시오.\n\n${eqBox}`,
    `두 수의 곱을 구하시오.\n\n${n(a)},  ${n(b)}`,
  ]);
  return make(unit, stem, n(p), `${expr(`${a}\\times${b}=${p}`)} 입니다.`);
}

/** 2단 — 문장. 세 꼴 어느 것이 와도 자연스러운 소재를 쓴다. */
function mul213Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  const stem = pick(rng, [
    `강당에 의자를 한 줄에 ${n(a)}개씩 ${n(b)}줄 놓았습니다. 놓은 의자는 모두 몇 개인지 쓰시오.`,
    `한 사람이 색 테이프를 ${n(a)}장씩 모았습니다. ${n(b)}명이 모은 색 테이프는 모두 몇 장인지 쓰시오.`,
    `한 상자에 귤이 ${n(a)}개씩 들어 있습니다. ${n(b)}상자에 든 귤은 모두 몇 개인지 쓰시오.`,
    `딱지를 한 통에 ${n(a)}장씩 ${n(b)}통에 담았습니다. 담은 딱지는 모두 몇 장인지 쓰시오.`,
    `하루에 종이비행기를 ${n(a)}개씩 접습니다. ${n(b)}일 동안 접는 종이비행기는 모두 몇 개인지 쓰시오.`,
    `화단에 꽃을 한 줄에 ${n(a)}송이씩 ${n(b)}줄 심었습니다. 심은 꽃은 모두 몇 송이인지 쓰시오.`,
    `빨대가 한 묶음에 ${n(a)}개씩 ${n(b)}묶음 있습니다. 빨대는 모두 몇 개인지 쓰시오.`,
    `한 판에 스티커가 ${n(a)}장씩 붙어 있습니다. ${n(b)}판에 붙어 있는 스티커는 모두 몇 장인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p),
    `한 묶음의 수에 묶음 수를 곱합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다.`,
  );
}

/** 3단 — 곱한 뒤 더하거나 덜어내는 두 단계. */
function mul213Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  const c = intBetween(rng, 11, Math.min(98, p - 11));
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `문방구에서 지우개를 한 상자에 ${n(a)}개씩 ${n(b)}상자 들여오고, 낱개로 ${n(c)}개를 더 들여왔습니다. 지우개는 모두 몇 개인지 쓰시오.`,
      `물을 한 묶음에 ${n(a)}병씩 ${n(b)}묶음 사고, ${n(c)}병을 따로 샀습니다. 산 물은 모두 몇 병인지 쓰시오.`,
      `종이컵을 한 줄에 ${n(a)}개씩 ${n(b)}줄로 쌓고, 옆에 ${n(c)}개를 더 두었습니다. 종이컵은 모두 몇 개인지 쓰시오.`,
      `붙임딱지를 ${n(a)}장씩 ${n(b)}묶음과 낱장 ${n(c)}장을 준비했습니다. 준비한 붙임딱지는 모두 몇 장인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(p + c),
      `묶음의 수를 먼저 곱합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다. 낱개까지 더하면 ${expr(`${p}+${c}=${p + c}`)} 입니다.`,
    );
  }
  const stem = pick(rng, [
    `사탕을 한 봉지에 ${n(a)}개씩 ${n(b)}봉지 샀는데, 그중 ${n(c)}개를 나누어 주었습니다. 남은 사탕은 몇 개인지 쓰시오.`,
    `젤리를 한 통에 ${n(a)}개씩 ${n(b)}통 준비했다가 ${n(c)}개를 먹었습니다. 남은 젤리는 몇 개인지 쓰시오.`,
    `연결 큐브를 한 상자에 ${n(a)}개씩 ${n(b)}상자 가져왔는데, ${n(c)}개를 다른 반에 빌려주었습니다. 남은 연결 큐브는 몇 개인지 쓰시오.`,
    `요구르트를 한 묶음에 ${n(a)}병씩 ${n(b)}묶음 샀는데, ${n(c)}병을 마셨습니다. 남은 요구르트는 몇 병인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p - c),
    `묶음의 수를 먼저 곱합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다. 쓴 만큼 빼면 ${expr(`${p}-${c}=${p - c}`)} 입니다.`,
  );
}

/**
 * 4단 — 역산 두 틀. ㉠ (몇)×(몇십몇) 에서 한 자리 수를 되짚는다. ㉡ (몇십)×(몇십) 에서
 * 몇십을 되짚는다. 둘 다 소단원 이름의 세 꼴 안이다.
 */
function mul213Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const t1 = intBetween(rng, 2, 9) * 10;
    const t2 = intBetween(rng, 2, 9) * 10;
    const tp = t1 * t2;
    const eqT = expr(`\\square\\times${t2}=${tp}`);
    const sqT = expr(`\\square`);
    const stem = pick(rng, [
      `${sqT} 에 알맞은 몇십을 구하시오.\n\n${eqT}`,
      `${eqT} 에서 ${sqT} 의 값을 쓰시오.`,
      `다음 곱셈식의 ${sqT} 에 알맞은 수를 구하시오.\n\n${eqT}`,
      `어떤 몇십과 ${n(t2)} 의 곱이 ${n(tp)} 입니다. 어떤 수를 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(t1),
      `몇십끼리의 곱은 곱셈구구의 곱 뒤에 ${expr(`0`)} 두 개가 붙습니다. ${expr(`${t1}\\times${t2}=${tp}`)} 이므로 구하는 수는 ${n(t1)} 입니다.`,
    );
  }
  const a = intBetween(rng, 3, 9);
  const b = tensOnes21(rng);
  const p = a * b;
  const eqD = expr(`\\square\\times${b}=${p}`);
  const sq = expr(`\\square`);
  const stem = pick(rng, [
    `곱셈식의 ${sq} 에 알맞은 수를 구하시오.\n\n${eqD}`,
    `${eqD} 에서 ${sq} 의 값을 쓰시오.`,
    `${sq} 에 들어갈 한 자리 수를 구하시오.\n\n${eqD}`,
    `알맞은 수를 ${sq} 에 써넣으시오.\n\n${eqD}`,
    `다음 식이 맞으려면 ${sq} 에 어떤 수가 들어가야 하는지 쓰시오.\n\n${eqD}`,
    `${eqD} 의 ${sq} 에 알맞은 한 자리 수를 쓰시오.`,
    `어떤 한 자리 수와 ${n(b)} 의 곱이 ${n(p)} 입니다. 어떤 수를 쓰시오.`,
    `어떤 한 자리 수와 ${n(b)} 의 곱은 ${n(p)} 입니다. 어떤 수는 얼마인지 구하시오.`,
  ]);
  return make(
    unit,
    stem,
    n(a),
    `차례로 곱해 봅니다. ${expr(`${a - 1}\\times${b}=${(a - 1) * b}`)}, ${expr(`${a}\\times${b}=${p}`)} 이므로 구하는 한 자리 수는 ${n(a)} 입니다.`,
  );
}

/** 1단 — (몇십몇)×(몇십몇) 식 그대로. */
function mul214Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  const eq = expr(`${a}\\times${b}`);
  const eqBox = expr(`${a}\\times${b}=\\square`);
  const sq = expr(`\\square`);
  const stem = pick(rng, [
    `곱셈을 하시오.\n\n${eqBox}`,
    `${eq} 의 곱을 계산하시오.`,
    `다음 두 수의 곱을 구하시오.\n\n${n(a)},  ${n(b)}`,
    `계산 결과를 ${sq} 에 알맞게 쓰시오.\n\n${eqBox}`,
    `다음을 계산하여 값을 쓰시오.\n\n${eq}`,
    `곱셈식 ${eqBox} 의 ${sq} 에 알맞은 수를 구하시오.`,
    `${eq} 의 값은 얼마인지 쓰시오.`,
    `다음 곱셈식을 계산하시오.\n\n${eqBox}`,
  ]);
  return make(unit, stem, n(p), `${expr(`${a}\\times${b}=${p}`)} 입니다.`);
}

/** 2단 — 문장. */
function mul214Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  const stem = pick(rng, [
    `한 상자에 감이 ${n(a)}개씩 들어 있습니다. ${n(b)}상자에 들어 있는 감은 모두 몇 개인지 쓰시오.`,
    `하루에 줄넘기를 ${n(a)}번씩 합니다. ${n(b)}일 동안 하는 줄넘기는 모두 몇 번인지 쓰시오.`,
    `한 봉지에 ${n(a)}개씩 든 밤이 ${n(b)}봉지 있습니다. 밤은 모두 몇 개인지 쓰시오.`,
    `학생 ${n(a)}명이 종이학을 ${n(b)}마리씩 접었습니다. 접은 종이학은 모두 몇 마리인지 쓰시오.`,
    `극장의 한 구역에 좌석이 ${n(a)}개씩 ${n(b)}구역 있습니다. 좌석은 모두 몇 개인지 쓰시오.`,
    `한 쪽에 낱말을 ${n(a)}개씩 ${n(b)}쪽 외웠습니다. 외운 낱말은 모두 몇 개인지 쓰시오.`,
    `과일 가게에서 딸기를 한 팩에 ${n(a)}개씩 ${n(b)}팩 팔았습니다. 판 딸기는 모두 몇 개인지 쓰시오.`,
    `버스 한 대에 ${n(a)}명씩 버스 ${n(b)}대에 나누어 탔습니다. 탄 사람은 모두 몇 명인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p),
    `한 묶음의 수에 묶음 수를 곱합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다.`,
  );
}

/** 3단 — 곱한 뒤 더하거나 덜어내는 두 단계. */
function mul214Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  const c = intBetween(rng, 11, Math.min(98, p - 11));
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `젤리를 한 봉지에 ${n(a)}개씩 ${n(b)}봉지 사고, 낱개로 ${n(c)}개를 더 샀습니다. 산 젤리는 모두 몇 개인지 쓰시오.`,
      `공책이 한 묶음에 ${n(a)}권씩 ${n(b)}묶음 있고, 낱권이 ${n(c)}권 더 있습니다. 공책은 모두 몇 권인지 쓰시오.`,
      `배드민턴 연습을 하루에 ${n(a)}번씩 ${n(b)}일 동안 하고, 마지막 날 ${n(c)}번을 더 했습니다. 연습은 모두 몇 번인지 쓰시오.`,
      `한 판에 ${n(a)}개씩 든 달걀 ${n(b)}판과 낱개 달걀 ${n(c)}개가 있습니다. 달걀은 모두 몇 개인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(p + c),
      `먼저 곱셈으로 묶음의 수를 구합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다. 낱개까지 더하면 ${expr(`${p}+${c}=${p + c}`)} 입니다.`,
    );
  }
  const stem = pick(rng, [
    `귤을 한 상자에 ${n(a)}개씩 ${n(b)}상자 샀는데, 그중 ${n(c)}개를 이웃과 나누었습니다. 남은 귤은 몇 개인지 쓰시오.`,
    `색 구슬을 한 통에 ${n(a)}개씩 ${n(b)}통 모았다가 ${n(c)}개를 동생에게 주었습니다. 남은 색 구슬은 몇 개인지 쓰시오.`,
    `물티슈가 한 팩에 ${n(a)}장씩 ${n(b)}팩 있었는데, ${n(c)}장을 썼습니다. 남은 물티슈는 몇 장인지 쓰시오.`,
    `초콜릿을 한 상자에 ${n(a)}개씩 ${n(b)}상자 준비했다가 ${n(c)}개를 손님에게 드렸습니다. 남은 초콜릿은 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(p - c),
    `먼저 곱셈으로 묶음의 수를 구합니다. ${expr(`${a}\\times${b}=${p}`)} 입니다. 쓴 만큼 빼면 ${expr(`${p}-${c}=${p - c}`)} 입니다.`,
  );
}

/** 4단 — 수 카드 네 장으로 가장 큰·작은 곱 만들기(조건 조합). 답은 전수 비교로 구한다. */
function mul214Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const cards = distinctIdx(rng, 9, 4).map((i) => i + 1);
  const askBig = intBetween(rng, 0, 1) === 0;
  let bestA = 0;
  let bestB = 0;
  let bestP = askBig ? -1 : Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < 4; i += 1)
    for (let j = 0; j < 4; j += 1)
      for (let k = 0; k < 4; k += 1)
        for (let l = 0; l < 4; l += 1) {
          if (new Set([i, j, k, l]).size !== 4) continue;
          const v1 = cards[i]! * 10 + cards[j]!;
          const v2 = cards[k]! * 10 + cards[l]!;
          if (askBig ? v1 * v2 > bestP : v1 * v2 < bestP) {
            bestA = v1;
            bestB = v2;
            bestP = v1 * v2;
          }
        }
  const list = cards.map((d) => n(d)).join(", ");
  const stem = askBig
    ? pick(rng, [
        `수 카드 ${list} 의 네 장이 있습니다. 카드를 한 번씩 모두 사용하여 (몇십몇)×(몇십몇) 곱셈식을 만들 때, 가장 큰 곱을 구하시오.`,
        `네 장의 수 카드 ${list} 만 한 번씩 사용하여 두 자리 수끼리의 곱셈식을 만듭니다. 곱이 가장 클 때의 곱을 쓰시오.`,
        `수 카드 ${list} 의 숫자를 한 번씩만 써서 (몇십몇)×(몇십몇) 곱셈식을 만들 때, 만들 수 있는 가장 큰 곱을 쓰시오.`,
        `${list} 의 네 숫자를 모두 한 번씩 사용해 두 자리 수 두 개를 만들어 곱합니다. 곱이 가장 크게 되는 값을 구하시오.`,
      ])
    : pick(rng, [
        `수 카드 ${list} 의 네 장이 있습니다. 카드를 한 번씩 모두 사용하여 (몇십몇)×(몇십몇) 곱셈식을 만들 때, 가장 작은 곱을 구하시오.`,
        `네 장의 수 카드 ${list} 만 한 번씩 사용하여 두 자리 수끼리의 곱셈식을 만듭니다. 곱이 가장 작을 때의 곱을 쓰시오.`,
        `수 카드 ${list} 의 숫자를 한 번씩만 써서 (몇십몇)×(몇십몇) 곱셈식을 만들 때, 만들 수 있는 가장 작은 곱을 쓰시오.`,
        `${list} 의 네 숫자를 모두 한 번씩 사용해 두 자리 수 두 개를 만들어 곱합니다. 곱이 가장 작게 되는 값을 구하시오.`,
      ]);
  // 🔴 **해설이 답에 이르러야 한다** (리드 지적, 2026-08-30). 옛 해설은
  //    「십의 자리 숫자가 클수록 곱이 큽니다」 한 줄로 접고 답을 적었다 —
  //    그 성질은 십의 자리 **두 수만** 정해 주고 남은 두 수의 자리를 안 말한다.
  //    `87\times92` 와 `82\times97` 이 그 문장으로는 안 갈린다(씨앗 0~299 전량).
  //    126가지 카드 조합을 전수로 확인했다: **정답은 늘 그 둘 중 하나이고, 둘의
  //    곱은 늘 다르다.** 그러니 해설은 남은 두 배치를 **실제로 곱해 견주어야** 한다.
  const desc = [...cards].sort((p, q) => q - p);
  const [d1, d2, d3, d4] = desc as [number, number, number, number];
  // 큰 곱은 십의 자리에 큰 두 수(d1·d2), 작은 곱은 작은 두 수(d4·d3)를 놓는다.
  const alt: [number, number][] = askBig
    ? [
        [d1 * 10 + d3, d2 * 10 + d4],
        [d1 * 10 + d4, d2 * 10 + d3],
      ]
    : [
        [d4 * 10 + d1, d3 * 10 + d2],
        [d4 * 10 + d2, d3 * 10 + d1],
      ];
  const shown = alt.map(([u, v]) => expr(`${u}\\times${v}=${u * v}`));
  return make(
    unit,
    stem,
    n(bestP),
    `가장 ${askBig ? "큰" : "작은"} 곱을 만들려면 십의 자리에 ${askBig ? "큰" : "작은"} 두 수를 놓아야 하므로, ` +
      `십의 자리에 놓는 수는 ${list21(askBig ? [d1, d2] : [d4, d3])} 입니다. ` +
      `남은 두 수를 놓는 방법은 두 가지이므로 곱해서 견줍니다. ` +
      `${shown.join(", ")} 이므로 가장 ${askBig ? "큰" : "작은"} 곱은 ${n(bestP)} 입니다.`,
  );
}

/* ── 2-1 곱셈 «심화중»·«심화상» — D-113 파일럿, **되짚기 축** (2026-08-30) ─────
 *
 * 🔴 **첫 판(열거 축)은 기각됐다.** 「후보를 열거해 고른다」로 짰더니 리드 패널이
 *    문형 전량 6,900행으로 두 축을 재어 **열거는 갈래를 1.5~2배밖에 안 가르고
 *    되짚기는 22~40배 가른다**는 것을 보였다. 게다가 심화하 **안에서** 열거형은
 *    평균 0.39 걸음으로 **그 소단원의 «연산»(0.79)보다도 얕았다.**
 *    내 초3 산출물도 한 칸씩 낮게 앉았다(2-1-3 «심화중» → 실은 심화하).
 *
 * ── 확정 잣대 (되짚기 사슬) ─────────────────────────────────────────────────
 *   · **심화하**(기준선, 안 건드림) — 사슬의 **마디마다 값이 하나로 굳는다.**
 *   · **심화중** — 하나로 굳지 않는 마디가 **하나** 있고, 발문의 다른 조건이나
 *     **그 소단원의 성질**이 그 마디를 굳혀 준다.
 *   · **심화상** — 그 마디를 **성질만으로는 못 굳혀**, 그 소단원의 계산으로 나올 수
 *     있는 값들을 **실제로 만들어 견주어야** 하나가 남는다. 후보는 발문이 주지 않고
 *     **되짚기가 만든다.**
 *
 * ── 이 대단원에서 되짚기를 만드는 자리 — **곱의 일의 자리** ──────────────────
 * 초3 2-1 은 **나눗셈을 못 쓴다**(2-2 에서 배운다, D-66⑶). 그래서 곱에서 인수를
 * 되짚는 길은 **곱셈구구뿐**이다: 「$a$ 의 일의 자리가 $o$ 인데 곱의 일의 자리가 $r$ 이면
 * 곱하는 수는 무엇인가」 — 이 되짚기가 **후보를 만든다**(발문이 주지 않는다).
 *   · $o$ 가 홀수(1·3·7·9)면 후보가 **하나** → 그건 심화하다(반증 1).
 *   · $o$ 가 짝수면 **둘**, $o=5$ 면 **넷·다섯** 이 나온다. 그 마디가 안 굳는 자리다.
 *
 * 굳히는 방법이 두 칸을 가른다:
 *   · **심화중 — 올림 횟수**(2-1-1·2-1-2) 또는 **곱의 자릿수**(2-1-3). 둘 다 곱을
 *     끝까지 하지 않고 **자리마다 어림해서** 아는 «성질»이다. 소단원 이름이 약속한
 *     바로 그것이라 반증 3 을 정면으로 지난다.
 *   · **심화상 — 후보가 셋 이상인데 올림도 자릿수도 전부 같다.** 그러면 성질이
 *     아무것도 못 잘라 내고, **후보를 하나씩 실제로 곱해 견주어야** 하나가 남는다.
 *
 * ⚠️ **2-1-4 는 심화상을 비웠다.** 까닭은 이 파일 아래 `mul21High` 주석과 보고서
 *    §2.2 에 적었다.
 *
 * 🔴 **후보 «전량»이 이름 약속 안이어야 한다.** 해설이 후보를 하나씩 곱해 보이므로
 *    그 곱이 전부 소단원의 꼴·올림 안이어야 한다. 그래서 아래 틀은 **전수 열거로
 *    만들고 약속을 못 지키는 틀은 목록에서 뺀다**(문턱으로 거르지 않는다).
 *    문턱을 못 놓는 틀도 같이 뺀다 — 그래서 **어떤 씨앗에서도 안 던진다.**
 */

/** 소단원 이름이 약속한 곱의 갈래 — **이름에서** 읽는다(지면에서 읽으면 동어반복이다). */
type Mul21Kind = "3x1-1" | "3x1-2" | "3shapes" | "2x2";

function mul21Kind(section: string): Mul21Kind {
  if (section.includes("(몇십몇)×(몇십몇)")) return "2x2";
  if (section.includes("(세 자리 수)"))
    return section.includes("(2)") ? "3x1-2" : "3x1-1";
  return "3shapes";
}

/**
 * **곱의 일의 자리로 곱하는 수를 되짚는다** — 곱셈구구가 후보를 만든다.
 * `o` 는 곱해지는 수의 일의 자리, `r` 은 곱의 일의 자리.
 */
function reverseOnes21(o: number, r: number): number[] {
  const out: number[] = [];
  for (let k = 1; k <= 9; k += 1) if ((o * k) % 10 === r) out.push(k);
  return out;
}

/** 「올림이 N번」을 지면 말로. 수를 KaTeX 밖에 쓰지 않으려고 한글로 적는다. */
const CARRY_WORD = [
  "한 번도 없었습니다",
  "한 번 있었습니다",
  "두 번 있었습니다",
  "세 번 있었습니다",
] as const;
const CARRY_WORD_MID = [
  "올림이 없고",
  "올림이 한 번이고",
  "올림이 두 번이고",
  "올림이 세 번이고",
] as const;
const CARRY_WORD_END = [
  "올림이 없습니다",
  "올림이 한 번입니다",
  "올림이 두 번입니다",
  "올림이 세 번입니다",
] as const;

/** 자릿수 이름 — 「두 자리 수」·「세 자리 수」·「네 자리 수」. */
const DIGIT_WORD21 = ["", "한", "두", "세", "네"] as const;
const digitsOf21 = (v: number) => String(v).length;

/**
 * `lo` 와 `hi` 사이의 **둥근** 수 하나. 없으면 null.
 * 문턱이 `1837` 이면 지면이 지저분하다 — 큰 자리부터 찾아 가운데 것을 고른다.
 */
function roundBetween(lo: number, hi: number): number | null {
  for (const m of [1000, 500, 100, 50, 10, 5, 1]) {
    const first = Math.floor(lo / m) * m + m;
    const last = Math.ceil(hi / m) * m - m;
    if (first <= last) {
      const count = (last - first) / m + 1;
      return first + Math.floor((count - 1) / 2) * m;
    }
  }
  return null;
}

// ── 심화중 — 되짚기가 후보 둘을 만들고, **소단원 성질**이 하나를 굳힌다 ──────────

/** (세 자리)×(한 자리) — 굳히는 성질은 **올림 횟수**(소단원 이름 그 자체). */
type Mid3x1 = {
  a: number;
  r: number;
  x: number;
  y: number;
  cx: number;
  cy: number;
};

function mid3x1Pool(band: readonly [number, number]): Mid3x1[] {
  const out: Mid3x1[] = [];
  const inBand = (c: number) => c >= band[0] && c <= band[1];
  for (let a = 102; a <= 998; a += 1) {
    const o = a % 10;
    for (let r = 0; r <= 9; r += 1) {
      const k = reverseOnes21(o, r);
      // 후보가 하나면 되짚기만으로 굳는다 — 그건 심화하다(반증 1).
      if (k.length !== 2) continue;
      const [x, y] = k as [number, number];
      const cx = mulCarries3x1(a, x);
      const cy = mulCarries3x1(a, y);
      // 해설이 두 곱을 다 보이므로 **둘 다** 이름 약속 안이어야 한다.
      if (!inBand(cx) || !inBand(cy)) continue;
      // 올림이 같으면 그 성질이 아무것도 못 가른다.
      if (cx === cy) continue;
      out.push({ a, r, x, y, cx, cy });
    }
  }
  return out;
}

/** 2-1-3 (몇)×(몇십몇) — 굳히는 성질은 **곱의 자릿수**. */
type Mid213 = { a: number; r: number; x: number; y: number };

function mid213Pool(): Mid213[] {
  const out: Mid213[] = [];
  for (let a = 12; a <= 98; a += 1) {
    const o = a % 10;
    if (o === 0) continue; // 몇십은 (몇)×(몇십몇) 꼴이 아니다
    for (let r = 0; r <= 9; r += 1) {
      const k = reverseOnes21(o, r);
      if (k.length !== 2) continue;
      const [x, y] = k as [number, number];
      if (digitsOf21(a * x) === digitsOf21(a * y)) continue;
      out.push({ a, r, x, y });
    }
  }
  return out;
}

/**
 * 2-1-4 (몇십몇)×(몇십몇) — 되짚기가 **곱의 크기**로 후보를 만들고,
 * **일의 자리 성질**(곱셈구구)이 하나를 굳힌다.
 *
 * ⚠️ 후보 창을 **한 십의 자리 안**에 둔다. 그래야 창 안의 모든 수가 몇십몇이고
 *    (몇십이 섞이면 그 곱이 소단원 꼴을 벗어난다) 해설이 전부 찍어도 안전하다.
 */
type Mid214 = {
  a: number;
  lo: number;
  hi: number;
  ans: number;
  r: number;
  T1: number;
  T2: number;
};

function mid214Pool(): Mid214[] {
  const out: Mid214[] = [];
  for (let a = 12; a <= 98; a += 1) {
    if (a % 10 === 0) continue;
    const oa = a % 10;
    for (let d = 1; d <= 9; d += 1) {
      for (let lo = d * 10 + 1; lo <= d * 10 + 7; lo += 1) {
        for (let hi = lo + 2; hi <= d * 10 + 9; hi += 1) {
          const win: number[] = [];
          for (let b = lo; b <= hi; b += 1) win.push(b);
          // 창 밖 이웃이 있어야 문턱을 놓는다.
          const T1 = roundBetween(a * (lo - 1), a * lo);
          const T2 = roundBetween(a * hi, a * (hi + 1));
          if (T1 === null || T2 === null) continue;
          for (let r = 0; r <= 9; r += 1) {
            const hits = win.filter((b) => ((b % 10) * oa) % 10 === r);
            if (hits.length !== 1) continue;
            out.push({ a, lo, hi, ans: hits[0]!, r, T1, T2 });
          }
        }
      }
    }
  }
  return out;
}

// ── 심화상 — 성질이 아무것도 못 잘라 내어 **후보를 실제로 곱해 견준다** ─────────

/**
 * 후보가 **셋 이상**이고 올림·자릿수가 **전부 같은** 틀. 그러면 성질로는 한 개도
 * 못 걸러 내고, 곱을 끝까지 해서 크기를 견주어야 하나가 남는다.
 */
type High21 = {
  a: number;
  r: number;
  ks: number[];
  idx: number;
  /** 아래 문턱 — 후보 맨 앞을 고를 때는 없다(그때는 위 문턱만으로 갈린다). */
  T1: number | null;
  T2: number | null;
};

function high21Pool(
  aFrom: number,
  aTo: number,
  band: readonly [number, number] | null,
  shapeOk: (a: number) => boolean,
): High21[] {
  const out: High21[] = [];
  const inBand = (c: number) => band === null || (c >= band[0] && c <= band[1]);
  for (let a = aFrom; a <= aTo; a += 1) {
    if (!shapeOk(a)) continue;
    const o = a % 10;
    for (let r = 0; r <= 9; r += 1) {
      const ks = reverseOnes21(o, r);
      if (ks.length < 3) continue;
      const carries = ks.map((k) => mulCarries3x1(a, k));
      if (!carries.every((c) => inBand(c))) continue;
      // **성질이 아무것도 못 가른다** — 올림도 자릿수도 후보끼리 같다.
      if (band !== null && !carries.every((c) => c === carries[0])) continue;
      const ps = ks.map((k) => a * k);
      if (!ps.every((p) => digitsOf21(p) === digitsOf21(ps[0]!))) continue;
      // ⚠️ 가운데 후보만 쓰면 **답이 두 가지로 굳는다**(실측: {2,4,6,8} 에서 4·6뿐).
      //    맨 앞·맨 뒤 후보는 문턱이 한쪽만 있으면 갈리므로 같이 쓴다.
      for (let idx = 0; idx < ks.length; idx += 1) {
        const T1 = idx > 0 ? roundBetween(ps[idx - 1]!, ps[idx]!) : null;
        const T2 =
          idx + 1 < ks.length ? roundBetween(ps[idx]!, ps[idx + 1]!) : null;
        if (idx > 0 && T1 === null) continue;
        if (idx + 1 < ks.length && T2 === null) continue;
        out.push({ a, r, ks, idx, T1, T2 });
      }
    }
  }
  return out;
}

// ── 목록은 한 번만 만든다(문턱을 못 놓는 틀은 여기서 이미 빠졌다) ───────────────

const MID21_CACHE = new Map<Mul21Kind, unknown[]>();
const HIGH21_CACHE = new Map<Mul21Kind, High21[]>();

function midPoolOf(kind: Mul21Kind): unknown[] {
  const hit = MID21_CACHE.get(kind);
  if (hit) return hit;
  const built: unknown[] =
    kind === "3x1-1"
      ? mid3x1Pool([0, 1])
      : kind === "3x1-2"
        ? mid3x1Pool([2, 3])
        : kind === "3shapes"
          ? mid213Pool()
          : mid214Pool();
  MID21_CACHE.set(kind, built);
  return built;
}

function highPoolOf(kind: Mul21Kind): High21[] {
  const hit = HIGH21_CACHE.get(kind);
  if (hit) return hit;
  const built =
    kind === "3x1-1"
      ? high21Pool(102, 998, [0, 1], () => true)
      : kind === "3x1-2"
        ? high21Pool(102, 998, [2, 3], () => true)
        : // 2-1-3 은 (몇)×(몇십몇) — 올림 약속이 없으니 자릿수만 같으면 된다.
          high21Pool(12, 98, null, (a) => a % 10 !== 0);
  HIGH21_CACHE.set(kind, built);
  return built;
}

/** 5단 — 되짚기가 후보 둘을 만들고 **소단원 성질**이 하나를 굳힌다. */
function mul21Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = mul21Kind(unit.section);
  if (kind === "2x2") return mul214Mid(unit, rng);
  if (kind === "3shapes") return mul213Mid(unit, rng);
  const f = pick(rng, midPoolOf(kind) as Mid3x1[]);
  // 「올림이 적은 쪽」을 물을지 「많은 쪽」을 물을지 — 둘 다 이름 약속 안이다.
  // ⚠️ 다만 두 가지는 피한다. **답이 $1$** 이면 곱이 곱해지는 수 그대로라 되짚기를
  //    건너뛰고, **답이 곱의 일의 자리 $r$ 과 같으면** 발문에 답이 그대로 서 버린다.
  const low = f.cx < f.cy ? f.x : f.y;
  const high = f.cx > f.cy ? f.x : f.y;
  const score = (v: number) => (v === 1 ? 0 : v === f.r ? 1 : 2);
  const wantLow =
    score(low) !== score(high) ? score(low) > score(high) : altCase(rng);
  const chosen = wantLow ? low : high;
  const other = chosen === f.x ? f.y : f.x;
  const cChosen = chosen === f.x ? f.cx : f.cy;
  const cOther = other === f.x ? f.cx : f.cy;
  const stem = pick(rng, [
    `어떤 한 자리 수를 ${n(f.a)} 에 곱했더니 곱의 일의 자리 숫자가 ${n(f.r)} 입니다. 이 곱셈에서 올림이 ${CARRY_WORD[cChosen]!}. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 한 자리 수를 곱했습니다. 곱의 일의 자리 숫자가 ${n(f.r)} 이고, 계산할 때 올림이 ${CARRY_WORD[cChosen]!}. 어떤 수를 구하시오.`,
    `어떤 한 자리 수와 ${n(f.a)} 의 곱에서 일의 자리 숫자가 ${n(f.r)} 입니다. 그 곱셈에서 올림이 ${CARRY_WORD[cChosen]!}. 어떤 수는 얼마인지 쓰시오.`,
    `어떤 한 자리 수와 ${n(f.a)} 의 곱에서 일의 자리 숫자가 ${n(f.r)} 이고 올림이 ${CARRY_WORD[cChosen]!}. 어떤 수를 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(chosen), [
    `${n(f.a)} 의 일의 자리 숫자가 ${n(f.a % 10)} 이므로, 곱의 일의 자리 숫자가 ${n(f.r)} 인 경우를 곱셈구구에서 찾으면 곱하는 수는 ${n(f.x)} 또는 ${n(f.y)} 입니다.`,
    `${expr(`${f.a}\\times${chosen}=${f.a * chosen}`)} 에서 ${CARRY_WORD_MID[cChosen]!}, ${expr(`${f.a}\\times${other}=${f.a * other}`)} 에서 ${CARRY_WORD_END[cOther]!}.`,
    `따라서 어떤 수는 ${n(chosen)} 입니다.`,
  ]);
}

/** 5단 · 2-1-3 — 굳히는 성질은 **곱의 자릿수**다. */
function mul213Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, midPoolOf("3shapes") as Mid213[]);
  // ⚠️ 답이 $1$ 이거나 곱의 일의 자리 $r$ 과 같은 쪽은 피한다(위 `mul21Mid` 주석).
  const score213 = (v: number) => (v === 1 ? 0 : v === f.r ? 1 : 2);
  const takeX =
    score213(f.x) !== score213(f.y)
      ? score213(f.x) > score213(f.y)
      : altCase(rng);
  const chosen = takeX ? f.x : f.y;
  const other = takeX ? f.y : f.x;
  const dw = DIGIT_WORD21[digitsOf21(f.a * chosen)]!;
  const dwOther = DIGIT_WORD21[digitsOf21(f.a * other)]!;
  const stem = pick(rng, [
    `어떤 한 자리 수와 ${n(f.a)} 의 곱은 일의 자리 숫자가 ${n(f.r)} 인 ${dw} 자리 수입니다. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 한 자리 수를 곱했더니 일의 자리 숫자가 ${n(f.r)} 인 ${dw} 자리 수가 되었습니다. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 한 자리 수를 곱한 값이 ${dw} 자리 수이고 일의 자리 숫자가 ${n(f.r)} 입니다. 어떤 수는 얼마인지 쓰시오.`,
    `어떤 한 자리 수와 ${n(f.a)} 의 곱이 ${dw} 자리 수이고, 그 곱의 일의 자리 숫자가 ${n(f.r)} 입니다. 어떤 수를 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(chosen), [
    `${n(f.a)} 의 일의 자리 숫자가 ${n(f.a % 10)} 이므로, 곱의 일의 자리 숫자가 ${n(f.r)} 인 경우를 곱셈구구에서 찾으면 곱하는 수는 ${n(f.x)} 또는 ${n(f.y)} 입니다.`,
    `${expr(`${chosen}\\times${f.a}=${f.a * chosen}`)} 에서 곱은 ${dw} 자리 수이고, ${expr(`${other}\\times${f.a}=${f.a * other}`)} 에서 곱은 ${dwOther} 자리 수입니다.`,
    `따라서 어떤 수는 ${n(chosen)} 입니다.`,
  ]);
}

/** 5단 · 2-1-4 — 곱의 크기가 후보를 만들고 **일의 자리 성질**이 하나를 굳힌다. */
function mul214Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, midPoolOf("2x2") as Mid214[]);
  const win: number[] = [];
  for (let b = f.lo; b <= f.hi; b += 1) win.push(b);
  const stem = pick(rng, [
    `${n(f.a)} 에 어떤 두 자리 수를 곱했더니 곱이 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작습니다. 그 곱의 일의 자리 숫자가 ${n(f.r)} 일 때 어떤 수를 구하시오.`,
    `어떤 두 자리 수와 ${n(f.a)} 의 곱이 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작습니다. 곱의 일의 자리 숫자가 ${n(f.r)} 이면 어떤 수는 얼마인지 쓰시오.`,
    `${n(f.a)} 에 어떤 두 자리 수를 곱한 값이 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작으며, 일의 자리 숫자가 ${n(f.r)} 입니다. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 두 자리 수를 곱한 곱이 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작고, 곱의 일의 자리 숫자가 ${n(f.r)} 입니다. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 두 자리 수 하나를 곱했더니 곱이 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작았습니다. 곱의 일의 자리 숫자가 ${n(f.r)} 일 때 곱한 수를 구하시오.`,
    `어떤 두 자리 수와 ${n(f.a)} 의 곱은 일의 자리 숫자가 ${n(f.r)} 이고 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작습니다. 어떤 수는 얼마인지 쓰시오.`,
    `${n(f.a)} 에 곱해서 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작은 곱이 나오는 두 자리 수가 있습니다. 그 곱의 일의 자리 숫자가 ${n(f.r)} 일 때 그 두 자리 수를 구하시오.`,
    `어떤 두 자리 수에 ${n(f.a)} 만큼 곱했더니 곱이 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작으며 일의 자리 숫자가 ${n(f.r)} 입니다. 어떤 수를 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(f.ans), [
    `${n(f.a)} 에 곱해서 ${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작은 곱이 나오는 두 자리 수는 ${list21(win)} 입니다.`,
    `${win.map((b) => expr(`${f.a}\\times${b}=${f.a * b}`)).join(", ")} 이므로, 곱의 일의 자리 숫자가 ${n(f.r)} 인 것은 ${expr(`${f.a}\\times${f.ans}=${f.a * f.ans}`)} 뿐입니다.`,
    `따라서 어떤 수는 ${n(f.ans)} 입니다.`,
  ]);
}

/** 수 여러 개를 **한 덩어리** KaTeX 로 — 숫자마다 감싸면 지면에서 띄어쓰기가 깨진다. */
function list21(values: readonly number[]): string {
  return expr(values.join(",\\ "));
}

/**
 * 6단 — 되짚기가 후보 **셋 이상**을 만들고, 올림·자릿수가 전부 같아 **성질이 한 개도
 * 못 걸러 낸다.** 후보를 하나씩 실제로 곱해 크기를 견주어야 하나가 남는다.
 *
 * ⚠️ **2-1-4 는 여기서 비운다.** (몇십몇)×(몇십몇) 은 되짚을 인수가 두 자리라
 *    곱셈구구가 후보를 못 만든다 — 곱의 크기로 후보를 만들면 그것을 굳히는 것이
 *    «일의 자리»뿐이고, 그건 **성질 한 번**이라 정의상 심화중이다. 성질로 못 굳히는
 *    자리를 이 소단원에서 세우려면 **수 카드 배열**이 필요한데, 그 문항은 이미
 *    `mul214Deep`(심화하)에 있다 — 리드가 「해설이 결합을 제대로 풀면 그것이 바로
 *    심화상」이라고 짚은 그 문항이다. 배정을 옮기려면 `FORMS` 를 건드려야 해서
 *    (이번 회차 금지) **비우고 근거를 남긴다.** 보고서 §2.2.
 */
/** 곱의 크기 조건을 한 곳에서 만든다 — 한쪽 문턱만 있는 자리도 있다. */
function range21(f: High21): { decl: string; adj: string } {
  if (f.T1 !== null && f.T2 !== null)
    return {
      decl: `${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작습니다`,
      adj: `${n(f.T1)} 보다 크고 ${n(f.T2)} 보다 작은`,
    };
  if (f.T2 !== null)
    return {
      decl: `${n(f.T2)} 보다 작습니다`,
      adj: `${n(f.T2)} 보다 작은`,
    };
  return { decl: `${n(f.T1!)} 보다 큽니다`, adj: `${n(f.T1!)} 보다 큰` };
}

function mul21High(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = mul21Kind(unit.section);
  const f = pick(rng, highPoolOf(kind));
  const ans = f.ks[f.idx]!;
  const threes = kind === "3shapes";
  const step = (k: number) =>
    threes
      ? expr(`${k}\\times${f.a}=${f.a * k}`)
      : expr(`${f.a}\\times${k}=${f.a * k}`);
  const { decl, adj } = range21(f);
  const stem = pick(rng, [
    `어떤 한 자리 수와 ${n(f.a)} 의 곱은 일의 자리 숫자가 ${n(f.r)} 이고, 그 곱이 ${decl}. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 한 자리 수를 곱했더니 곱의 일의 자리 숫자가 ${n(f.r)} 이고 곱이 ${decl}. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 한 자리 수를 곱한 값의 일의 자리 숫자가 ${n(f.r)} 이고, 그 값이 ${decl}. 어떤 수는 얼마인지 쓰시오.`,
    // ⚠️ 마지막을 「그 수를 구하시오」로 두면 **자리수 조건 판정기가 문다** — 곱의
    //    일의 자리가 $0$ 인 씨앗에서는 발문에 한 자리 수가 한 번도 안 서고,
    //    「어떤 수」가 없으면 그것을 갈음할 미지수도 없다(실측 7/40). 「어떤 수」로 적는다.
    `${n(f.a)} 에 곱해서 ${adj} 곱이 나오게 하는 한 자리 수가 있습니다. 그 곱의 일의 자리 숫자가 ${n(f.r)} 일 때 어떤 수인지 구하시오.`,
    `어떤 한 자리 수와 ${n(f.a)} 의 곱에서 일의 자리 숫자가 ${n(f.r)} 입니다. 그 곱이 ${decl}. 어떤 수를 구하시오.`,
    `${n(f.a)} 에 어떤 한 자리 수를 곱했습니다. 곱의 일의 자리 숫자가 ${n(f.r)} 이고 그 곱이 ${decl}. 어떤 수는 얼마인지 쓰시오.`,
  ]);
  return makeDeep(unit, stem, n(ans), [
    `${n(f.a)} 의 일의 자리 숫자가 ${n(f.a % 10)} 이므로, 곱의 일의 자리 숫자가 ${n(f.r)} 인 경우를 곱셈구구에서 찾으면 곱하는 수는 ${list21(f.ks)} 입니다.`,
    `${f.ks.map((k) => step(k)).join(", ")} 이므로 ${adj} 것은 ${step(ans)} 뿐입니다.`,
    `따라서 어떤 수는 ${n(ans)} 입니다.`,
  ]);
}

// ── 2-2 나눗셈 (D-72 확대) ───────────────────────────────────────────────
//
// 이름 약속: 2-2-1·2-2-2 는 (몇십)÷(몇)·(몇십몇)÷(몇) 이고 **내림 유무**가 갈린다,
// 2-2-3 은 **나머지가 있는** (몇십몇)÷(몇), 2-2-4 는 (세 자리)÷(한 자리).
// 수 뽑기는 표준이 쓰는 함수를 **그대로 쓴다**(div2 · div2Rem · div3Exact) —
// 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
// 곱셈은 2-1 에서 배웠으므로 해설에 **곱셈 검산**을 쓴다(D-66⑶ 반대 방향).

/** 소단원 이름이 약속한 내림 유무 — 갈림의 **단 하나의 자리**. */
function carryDown22(section: string): boolean {
  return section.includes("내림이 있는");
}

/** (세 자리)÷(한 자리), 나머지 없음 — 표준 div32 와 **같은 함수**로 뽑는다. */
function div3Exact(rng: Rng): [number, number, number] {
  const b = intBetween(rng, 3, 9);
  const q = intBetween(rng, Math.ceil(100 / b), 48);
  return [b * q, b, q];
}

/** 1단 — 나눗셈 한 번. 표준(「다음을 계산하시오」)과 틀을 갈라 둔다. */
function div22Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  const eq = expr(`${a}\\div${b}`);
  const eqBox = expr(`${a}\\div${b}=\\square`);
  const sq = expr(`\\square`);
  const stem = pick(rng, [
    `나눗셈을 하시오.\n\n${eqBox}`,
    `${eq} 의 몫을 구하시오.`,
    `${sq} 에 알맞은 수를 쓰시오.\n\n${eqBox}`,
    `나눗셈식 ${eqBox} 에서 ${sq} 에 알맞은 수를 구하시오.`,
    `다음 나눗셈의 몫을 쓰시오.\n\n${eq}`,
    `${eq} 의 값을 계산하시오.`,
    `몫을 구하여 ${sq} 에 써넣으시오.\n\n${eqBox}`,
    `다음 나눗셈식을 계산하시오.\n\n${eqBox}`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 2단 — «똑같이 나누기» 문장. 식은 학생이 세운다. */
function div22Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  const stem = pick(rng, [
    `색종이 ${n(a)}장을 ${n(b)}명에게 똑같이 나누어 주려고 합니다. 한 명이 몇 장씩 받는지 쓰시오.`,
    `사탕 ${n(a)}개를 ${n(b)}봉지에 똑같이 나누어 담으면 한 봉지에 몇 개씩 담기는지 쓰시오.`,
    `연필 ${n(a)}자루를 ${n(b)}상자에 똑같이 나누어 넣으면 한 상자에 몇 자루씩 들어가는지 쓰시오.`,
    `구슬 ${n(a)}개를 ${n(b)}명이 똑같이 나누어 가지면 한 사람이 몇 개씩 갖는지 쓰시오.`,
    `쿠키 ${n(a)}개를 접시 ${n(b)}개에 똑같이 나누어 놓으면 한 접시에 몇 개씩 놓이는지 쓰시오.`,
    `동화책 ${n(a)}쪽을 ${n(b)}일 동안 똑같이 나누어 읽으면 하루에 몇 쪽씩 읽어야 하는지 쓰시오.`,
    `끈 ${n(a)}도막을 ${n(b)}묶음으로 똑같이 나누면 한 묶음이 몇 도막인지 쓰시오.`,
    `학생 ${n(a)}명을 ${n(b)}모둠으로 똑같이 나누면 한 모둠이 몇 명인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `똑같이 나누므로 나눗셈으로 구합니다. ${expr(`${a}\\div${b}=${q}`)} 입니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 맞습니다.`,
  );
}

/** 3단 — 나눈 뒤 곱하거나 덜어내는 두 단계. */
function div22Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  // ⚠️ 「그중 $c$ 묶음」 틀은 $c<b$ 여야 말이 된다. $b=2$ 면 $[2,1]$ 로 **범위가
  // 뒤집혀 던진다** — 되뽑기가 아니라 **그때는 그 틀을 안 쓴다**(구성으로 회피).
  if (b >= 3 && intBetween(rng, 0, 1) === 0) {
    const c = intBetween(rng, 2, b - 1);
    const stem = pick(rng, [
      `공책 ${n(a)}권을 ${n(b)}반에 똑같이 나누어 주었습니다. 그중 ${n(c)}반이 받은 공책은 모두 몇 권인지 쓰시오.`,
      `색연필 ${n(a)}자루를 ${n(b)}모둠에 똑같이 나누어 주었습니다. ${n(c)}모둠이 받은 색연필은 모두 몇 자루인지 쓰시오.`,
      `귤 ${n(a)}개를 ${n(b)}상자에 똑같이 나누어 담았습니다. ${n(c)}상자에 담긴 귤은 모두 몇 개인지 쓰시오.`,
      `사탕 ${n(a)}개를 ${n(b)}봉지에 똑같이 나누어 담았습니다. ${n(c)}봉지에 든 사탕은 모두 몇 개인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(q * c),
      `한 몫을 먼저 구합니다. ${expr(`${a}\\div${b}=${q}`)} 입니다. ${expr(`${q}\\times${c}=${q * c}`)} 이므로 답은 ${n(q * c)} 입니다.`,
    );
  }
  const c = intBetween(rng, 2, 9);
  const stem = pick(rng, [
    `딱지 ${n(a)}장을 ${n(b)}명이 똑같이 나누어 가진 뒤, 한 사람이 ${n(c)}장을 잃어버렸습니다. 그 사람에게 남은 딱지는 몇 장인지 쓰시오.`,
    `구슬 ${n(a)}개를 ${n(b)}명이 똑같이 나누어 가진 뒤, 한 사람이 ${n(c)}개를 동생에게 주었습니다. 그 사람에게 남은 구슬은 몇 개인지 쓰시오.`,
    `쿠키 ${n(a)}개를 접시 ${n(b)}개에 똑같이 나누어 놓은 뒤, 한 접시에서 ${n(c)}개를 먹었습니다. 그 접시에 남은 쿠키는 몇 개인지 쓰시오.`,
    `색종이 ${n(a)}장을 ${n(b)}모둠에 똑같이 나누어 준 뒤, 한 모둠이 ${n(c)}장을 썼습니다. 그 모둠에 남은 색종이는 몇 장인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q - c),
    `한 몫을 먼저 구합니다. ${expr(`${a}\\div${b}=${q}`)} 입니다. ${expr(`${q}-${c}=${q - c}`)} 이므로 답은 ${n(q - c)} 입니다.`,
  );
}

/** 4단 — 역산 두 틀. ㉠ 나뉘는 수 되짚기 ㉡ 잘못 곱한 결과에서 바른 몫 찾기. */
function div22Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  const sq = expr(`\\square`);
  if (intBetween(rng, 0, 1) === 0) {
    const eqD = expr(`\\square\\div${b}=${q}`);
    const stem = pick(rng, [
      `나눗셈식의 ${sq} 에 알맞은 수를 구하시오.\n\n${eqD}`,
      `${eqD} 에서 ${sq} 에 알맞은 수를 쓰시오.`,
      // ⚠️ «$4$ 로 나누어» 처럼 **수 뒤에 조사**를 붙이지 않는다(읽는 소리로 갈린다).
      // 「나누는 수가 $4$ 인」 처럼 조사가 안 붙는 자리로 문장을 돌린다.
      `나누는 수가 ${n(b)} 인 나눗셈의 몫이 ${n(q)} 입니다. 나뉘는 수를 구하시오.\n\n${eqD}`,
      `나누는 수가 ${n(b)} 이고 몫이 ${n(q)} 인 나눗셈이 있습니다. 나뉘는 수를 쓰시오.\n\n${eqD}`,
      `${sq} 에 알맞은 두 자리 수를 구하시오.\n\n${eqD}`,
      `다음 나눗셈식이 맞으려면 ${sq} 에 어떤 수가 들어가야 하는지 쓰시오.\n\n${eqD}`,
    ]);
    return make(
      unit,
      stem,
      n(a),
      `나누어지는 수는 곱으로 되짚습니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 ${sq} 에 알맞은 수는 ${n(a)} 입니다.`,
    );
  }
  const wrong = a * b;
  // 바르게 할 나눗셈을 지면에 세운다 — 나뉘는 수는 가린 채로(답이 보이면 안 된다).
  // 그래야 소단원 이름이 약속한 «(몇십몇)÷(몇)» 꼴이 발문에 실제로 선다.
  const right = expr(`\\square\\div${b}`);
  const stem = pick(rng, [
    `나누는 수가 ${n(b)} 인 나눗셈을 해야 하는데 잘못하여 곱했더니 ${n(wrong)} 입니다. 바르게 계산한 몫을 쓰시오.\n\n${right}`,
    `어떤 수를 ${n(b)} 만큼씩 나누어야 할 것을 잘못하여 ${n(b)} 배 했더니 ${n(wrong)} 입니다. 바르게 계산한 몫을 구하시오.\n\n${right}`,
    `나눗셈을 해야 할 것을 곱셈으로 잘못 계산하여 나온 값이 ${n(wrong)} 입니다. 두 계산에 쓴 수가 모두 ${n(b)} 일 때, 바른 몫을 쓰시오.\n\n${right}`,
    `어떤 수의 ${n(b)} 배가 ${n(wrong)} 입니다. 그 어떤 수의 몫을 구하시오.\n\n${right}`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `잘못 계산한 식에서 어떤 수를 되짚습니다. ${expr(`${b}\\times${a}=${wrong}`)} 이므로 어떤 수는 ${n(a)} 입니다. 바르게 계산하면 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 1단 — 몫과 나머지. 정답은 표준과 같은 «몫 ~, 나머지 ~» 꼴이다. */
function rem223Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  const eq = expr(`${a}\\div${b}`);
  const stem = pick(rng, [
    `나눗셈을 하여 몫과 나머지를 쓰시오.\n\n${eq}`,
    `${eq} 의 몫과 나머지를 차례로 구하시오.`,
    `다음 나눗셈의 몫과 나머지를 각각 구하시오.\n\n${eq}`,
    `${eq} 에서 몫과 나머지를 쓰시오.`,
    `나눗셈식 ${eq} 의 몫과 나머지를 구하시오.`,
    `다음을 계산하여 몫과 나머지를 쓰시오.\n\n${eq}`,
    `${eq} 의 몫과 나머지는 각각 얼마인지 구하시오.`,
    `나눗셈 ${eq} 에서 나머지까지 구하시오.`,
  ]);
  return make(
    unit,
    stem,
    `몫 ${n(q)}, 나머지 ${n(r)}`,
    `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다.`,
  );
}

/** 2단 — 문장. 남는 것이 몇인지, 또는 몇 묶음이 되는지를 묻는다. */
function rem223Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `사탕 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담으려고 합니다. 봉지에 담고 남는 사탕은 몇 개인지 쓰시오.`,
      `색종이 ${n(a)}장을 ${n(b)}명에게 똑같이 나누어 줄 때 남는 색종이는 몇 장인지 쓰시오.`,
      `구슬 ${n(a)}개를 한 통에 ${n(b)}개씩 담으면 남는 구슬은 몇 개인지 쓰시오.`,
      `연필 ${n(a)}자루를 ${n(b)}자루씩 묶으면 묶고 남는 연필은 몇 자루인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(r),
      `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. ${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${b * q}+${r}=${a}`)} 이므로 맞습니다.`,
    );
  }
  const stem = pick(rng, [
    `귤 ${n(a)}개를 한 상자에 ${n(b)}개씩 담습니다. 가득 채운 상자는 몇 상자인지 쓰시오.`,
    `쿠키 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담습니다. 가득 채운 봉지는 몇 봉지인지 쓰시오.`,
    `공책 ${n(a)}권을 한 묶음에 ${n(b)}권씩 묶습니다. 만들 수 있는 묶음은 몇 묶음인지 쓰시오.`,
    `달걀 ${n(a)}개를 한 판에 ${n(b)}개씩 담습니다. 가득 채운 판은 몇 판인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. 가득 채운 것은 몫이므로 ${n(q)} 입니다.`,
  );
}

/** 3단 — 나눈 뒤 남는 것까지 함께 쓰는 두 단계. */
function rem223Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  if (intBetween(rng, 0, 1) === 0) {
    // 남는 것까지 담으려면 한 묶음이 더 필요하다 — 몫에 하나를 더한다.
    const stem = pick(rng, [
      `학생 ${n(a)}명이 한 대에 ${n(b)}명씩 타는 배를 타려고 합니다. 모두 타려면 배는 적어도 몇 대 필요한지 쓰시오.`,
      `사과 ${n(a)}개를 한 상자에 ${n(b)}개씩 담아 모두 담으려고 합니다. 상자는 적어도 몇 상자 필요한지 쓰시오.`,
      `공 ${n(a)}개를 한 바구니에 ${n(b)}개씩 넣어 모두 담으려면 바구니는 적어도 몇 개 필요한지 쓰시오.`,
      `책 ${n(a)}권을 한 칸에 ${n(b)}권씩 꽂아 모두 꽂으려면 칸은 적어도 몇 칸 필요한지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(q + 1),
      `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. 남는 것도 담아야 하므로 ${expr(`${q}+1=${q + 1}`)} 입니다.`,
    );
  }
  // 남는 것을 채우려면 얼마가 더 있어야 하는가 — 나누는 수에서 나머지를 뺀다.
  const stem = pick(rng, [
    `사탕 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담았더니 마지막 봉지가 다 차지 않았습니다. 마지막 봉지를 가득 채우려면 사탕이 몇 개 더 필요한지 쓰시오.`,
    `구슬 ${n(a)}개를 한 통에 ${n(b)}개씩 담았더니 마지막 통이 다 차지 않았습니다. 마지막 통을 가득 채우려면 구슬이 몇 개 더 필요한지 쓰시오.`,
    `달걀 ${n(a)}개를 한 판에 ${n(b)}개씩 담았더니 마지막 판이 다 차지 않았습니다. 마지막 판을 채우려면 달걀이 몇 개 더 필요한지 쓰시오.`,
    `색종이 ${n(a)}장을 ${n(b)}장씩 묶었더니 마지막 묶음이 다 차지 않았습니다. 마지막 묶음을 채우려면 색종이가 몇 장 더 필요한지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(b - r),
    `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. 한 묶음이 ${n(b)} 이므로 ${expr(`${b}-${r}=${b - r}`)} 만큼 더 필요합니다.`,
  );
}

/** 4단 — 역산·조건 조합 두 틀. ㉠ 몫·나머지에서 나뉘는 수 ㉡ 나누어떨어지게 하려면. */
function rem223Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  if (intBetween(rng, 0, 1) === 0) {
    // 나뉘는 수는 가린 채로 나눗셈을 지면에 세운다 — 이름이 약속한 꼴이 서면서
    // 답(나뉘는 수)은 발문에 안 보인다.
    const box = expr(`\\square\\div${b}`);
    const stem = pick(rng, [
      `나누는 수가 ${n(b)} 이고 몫이 ${n(q)}, 나머지가 ${n(r)} 인 나눗셈이 있습니다. 나뉘는 수를 구하시오.\n\n${box}`,
      `어떤 수를 ${n(b)} 씩 나누었더니 몫이 ${n(q)} 이고 나머지가 ${n(r)} 입니다. 어떤 수를 쓰시오.\n\n${box}`,
      `몫이 ${n(q)}, 나머지가 ${n(r)} 인 나눗셈에서 나누는 수가 ${n(b)} 일 때, 나뉘는 수를 구하시오.\n\n${box}`,
      `나누는 수가 ${n(b)} 인 나눗셈의 몫이 ${n(q)}, 나머지가 ${n(r)} 일 때 나뉘는 수는 얼마인지 구하시오.\n\n${box}`,
    ]);
    return make(
      unit,
      stem,
      n(a),
      `나뉘는 수는 곱한 뒤 나머지를 더해 되짚습니다. ${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${b * q}+${r}=${a}`)} 이므로 ${n(a)} 입니다.`,
    );
  }
  const eq = expr(`${a}\\div${b}`);
  const stem = pick(rng, [
    `${eq} 에서 나누어떨어지게 하려면 나뉘는 수에 적어도 얼마를 더해야 하는지 구하시오.`,
    `나눗셈 ${eq} 에서 나누어떨어지도록 나뉘는 수를 늘리려고 합니다. 적어도 얼마를 더해야 하는지 쓰시오.`,
    `${n(a)} 에 적어도 얼마를 더해야 나누는 수가 ${n(b)} 인 나눗셈에서 나누어떨어지는지 구하시오.`,
    `${eq} 에서 나머지가 없게 하려면 나뉘는 수에 적어도 얼마를 더해야 하는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(b - r),
    `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. 나누는 수가 ${n(b)} 이므로 ${expr(`${b}-${r}=${b - r}`)} 만큼 더하면 나누어떨어집니다.`,
  );
}

/** 1단 — (세 자리)÷(한 자리) 식 그대로. */
function div224Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  const eq = expr(`${a}\\div${b}`);
  const eqBox = expr(`${a}\\div${b}=\\square`);
  const sq = expr(`\\square`);
  // 문구는 2-2-1·2-2-2 와 **겹치지 않게** 따로 짠다 — 자리 수만 다른 같은 문장이
  // 두 소단원에 서면 지면에서 같은 문항으로 읽힌다(D-66⑸ 취지).
  const stem = pick(rng, [
    `세 자리 수의 나눗셈을 하시오.\n\n${eqBox}`,
    `${eq} 의 계산에서 몫은 얼마인지 쓰시오.`,
    `계산하여 ${sq} 에 알맞은 수를 써넣으시오.\n\n${eqBox}`,
    `다음 나눗셈에서 몫을 구하시오.\n\n${eq}`,
    `${eq} 의 계산 결과를 쓰시오.`,
    `나눗셈식 ${eqBox} 의 ${sq} 에 알맞은 수를 쓰시오.`,
    `세로로 계산하여 몫을 구하시오.\n\n${eq}`,
    `다음 식의 몫을 구하여 쓰시오.\n\n${eqBox}`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${expr(`${a}\\div${b}=${q}`)} 입니다.`,
  );
}

/** 2단 — 문장. 세 자리 수가 자연스러운 소재를 쓴다(2-2-1·2 와 소재를 갈라 둔다). */
function div224Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  const stem = pick(rng, [
    `색종이 ${n(a)}장을 ${n(b)}반에 똑같이 나누어 주면 한 반이 몇 장씩 받는지 쓰시오.`,
    `공장에서 만든 인형 ${n(a)}개를 ${n(b)}상자에 똑같이 나누어 담으면 한 상자에 몇 개씩 들어가는지 쓰시오.`,
    `위인전 ${n(a)}쪽을 ${n(b)}주 동안 똑같이 나누어 읽으면 한 주에 몇 쪽씩 읽어야 하는지 쓰시오.`,
    `과수원에서 딴 사과 ${n(a)}개를 ${n(b)}수레에 똑같이 나누어 실으면 한 수레에 몇 개씩 실리는지 쓰시오.`,
    `물 ${n(a)}병을 ${n(b)}묶음으로 똑같이 나누면 한 묶음이 몇 병인지 쓰시오.`,
    `학생 ${n(a)}명을 ${n(b)}줄로 똑같이 세우면 한 줄에 몇 명씩 서는지 쓰시오.`,
    `달걀 ${n(a)}개를 ${n(b)}판에 똑같이 나누어 담으면 한 판에 몇 개씩 담기는지 쓰시오.`,
    `도서관에 있는 책 ${n(a)}권을 책꽂이 ${n(b)}칸에 똑같이 나누어 꽂으면 한 칸에 몇 권씩 꽂히는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q),
    `똑같이 나누므로 나눗셈으로 구합니다. ${expr(`${a}\\div${b}=${q}`)} 입니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 맞습니다.`,
  );
}

/** 3단 — 나눈 뒤 더하거나 덜어내는 두 단계. */
function div224Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  const c = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const stem = pick(rng, [
      `위인전 ${n(a)}쪽을 ${n(b)}주에 똑같이 나누어 읽기로 한 뒤, 첫 주에 ${n(c)}쪽을 더 읽었습니다. 첫 주에 읽은 쪽수는 몇 쪽인지 쓰시오.`,
      `사과 ${n(a)}개를 ${n(b)}수레에 똑같이 나누어 실은 뒤, 한 수레에 ${n(c)}개를 더 실었습니다. 그 수레에 실린 사과는 몇 개인지 쓰시오.`,
      `인형 ${n(a)}개를 ${n(b)}상자에 똑같이 나누어 담은 뒤, 한 상자에 ${n(c)}개를 더 넣었습니다. 그 상자에 든 인형은 몇 개인지 쓰시오.`,
      `책 ${n(a)}권을 책꽂이 ${n(b)}칸에 똑같이 나누어 꽂은 뒤, 한 칸에 ${n(c)}권을 더 꽂았습니다. 그 칸에 꽂힌 책은 몇 권인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(q + c),
      `한 몫을 먼저 구합니다. ${expr(`${a}\\div${b}=${q}`)} 입니다. 더 받은 것까지 더하면 ${expr(`${q}+${c}=${q + c}`)} 입니다.`,
    );
  }
  const stem = pick(rng, [
    `인형 ${n(a)}개를 ${n(b)}상자에 똑같이 나누어 담은 뒤, 한 상자에서 ${n(c)}개를 꺼내 팔았습니다. 그 상자에 남은 인형은 몇 개인지 쓰시오.`,
    `색종이 ${n(a)}장을 ${n(b)}반에 똑같이 나누어 준 뒤, 한 반이 ${n(c)}장을 썼습니다. 그 반에 남은 색종이는 몇 장인지 쓰시오.`,
    `물 ${n(a)}병을 ${n(b)}묶음으로 똑같이 나눈 뒤, 한 묶음에서 ${n(c)}병을 마셨습니다. 그 묶음에 남은 물은 몇 병인지 쓰시오.`,
    `달걀 ${n(a)}개를 ${n(b)}판에 똑같이 나누어 담은 뒤, 한 판에서 ${n(c)}개를 요리에 썼습니다. 그 판에 남은 달걀은 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(q - c),
    `한 몫을 먼저 구합니다. ${expr(`${a}\\div${b}=${q}`)} 입니다. 쓴 만큼 빼면 ${expr(`${q}-${c}=${q - c}`)} 입니다.`,
  );
}

/** 4단 — 역산 두 틀. ㉠ 나뉘는 수 되짚기 ㉡ 나뉘는 수의 가린 자리 복원. */
function div224Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  const sq = expr(`\\square`);
  if (intBetween(rng, 0, 1) === 0) {
    const eqD = expr(`\\square\\div${b}=${q}`);
    const stem = pick(rng, [
      `${sq} 에 알맞은 세 자리 수를 구하시오.\n\n${eqD}`,
      `${eqD} 의 ${sq} 에 알맞은 수를 쓰시오.`,
      `나누는 수가 ${n(b)} 이고 몫이 ${n(q)} 인 세 자리 수를 구하시오.\n\n${eqD}`,
      `어떤 세 자리 수를 ${n(b)} 씩 나누었더니 몫이 ${n(q)} 입니다. 그 세 자리 수를 쓰시오.\n\n${eqD}`,
      `나눗셈식이 맞도록 ${sq} 에 알맞은 세 자리 수를 써넣으시오.\n\n${eqD}`,
      `몫이 ${n(q)} 인 나눗셈식입니다. 나뉘는 수를 구하시오.\n\n${eqD}`,
    ]);
    return make(
      unit,
      stem,
      n(a),
      `나누어지는 수는 곱으로 되짚습니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 ${sq} 에 알맞은 수는 ${n(a)} 입니다.`,
    );
  }
  // 가린 자리 하나.
  // ⚠️ **일의 자리는 가리지 않는다.** 2-2-3 에서 나머지를 배운 뒤라 「몫이 $47$」은
  // 나누어떨어지지 않는 수까지 뜻할 수 있다 — $141\div3$ 도 $142\div3$ 도 몫이 $47$ 이라
  // 답이 하나가 아니다. 십·백의 자리는 한 칸 바뀌면 나뉘는 수가 $10$ 이상 달라져
  // 몫이 반드시 달라지므로($10\div b\ge10\div9>1$) 답이 **구성으로** 하나다.
  const pos = intBetween(rng, 1, 2);
  const hidden = Math.floor(a / 10 ** pos) % 10;
  const masked = [2, 1, 0]
    .map((d) => (d === pos ? "\\square" : String(Math.floor(a / 10 ** d) % 10)))
    .join("");
  const eqH = expr(`${masked}\\div${b}=${q}`);
  const place = pos === 0 ? "일" : pos === 1 ? "십" : "백";
  const stem = pick(rng, [
    `${sq} 에 알맞은 숫자를 구하시오.\n\n${eqH}`,
    `나눗셈식이 맞도록 ${sq} 에 알맞은 숫자를 써넣으시오.\n\n${eqH}`,
    `가려진 ${place}의 자리 숫자를 구하시오.\n\n${eqH}`,
    `다음 나눗셈식에서 ${sq} 에 들어갈 숫자를 쓰시오.\n\n${eqH}`,
  ]);
  return make(
    unit,
    stem,
    n(hidden),
    `나누어지는 수를 곱으로 찾으면 ${expr(`${b}\\times${q}=${a}`)} 이므로 ${sq} 에 알맞은 숫자는 ${n(hidden)} 입니다.`,
  );
}

/* ── 2-2 나눗셈 «심화중»·«심화상» — D-113 물결 2 (2026-08-31) ──────────────────
 *
 * ── 이 대단원에서 마디를 여는 자리 ──────────────────────────────────────────
 * 되짚기 식 「나뉘는 수 = 나누는 수 × 몫 (+ 나머지)」에서 **한 자리를 비우면** 마디가
 * 안 굳는다. 비울 수 있는 자리는 둘뿐이다 —
 *   ㉠ **나머지를 모른다** → 나뉘는 수 후보가 나누는 수만큼 **잇달아** 생긴다.
 *   ㉡ **나누는 수를 모른다** → 「나머지 < 나누는 수」가 후보를 만든다.
 * 굳히는 성질도 전부 이 대단원의 이름 안에 있다 — **나머지 < 나누는 수** ·
 * **나누어떨어지는가** · **몫이 몇 자리인가**(백의 자리와 나누는 수의 크기로 안다).
 *
 * ── 중·상을 가르는 자리 (D-115 ⑾) ──────────────────────────────────────────
 *   · **심화중** — 성질이 후보를 «끝까지 나누지 않고» 걸러 낸다.
 *       2-2-3 후보가 **잇달아 놓인 수**라 곱셈구구 한 줄이 하나를 집는다.
 *       2-2-4 **백의 자리와 나누는 수의 크기**만 보면 몫이 몇 자리인지 안다.
 *   · **심화상** — 성질이 **한 개도 못 걸러** 후보를 **실제로 다 나눠 봐야** 한다.
 *       2-2-3 후보가 흩어져 있고 거르는 조건이 «나머지»다.
 *       2-2-4 후보(나누는 수)가 전부 두 자리 몫을 내어 자릿수로는 못 가른다.
 *
 * ── 🔴 2-2-1·2-2-2 는 둘 다 비운다 — **세어서** 정했다 ────────────────────────
 * ㉠ 이 **이름 약속으로 막혀 있다**(두 이름에 「나머지」가 없고 생성기도 `div2`
 * (나누어떨어짐)로만 뽑는다 — 여기서 나머지를 쓰면 2-2-3 과 갈래가 겹친다).
 * 그러면 ㉡ 뿐인데 굳힐 성질이 「내림이 있나」 하나다. 전수로 세니 —
 *   · 두 자리 나뉘는 수를 내는 **몫 23가지 중 18가지**에서 후보의 내림 여부가
 *     **전부 같다** → 그 구절을 지워도 답이 그대로다(**반증 ⑤**).
 *   · 「내림 여부가 정확히 하나를 남기는」 자리는 **(몫,내림) 46짝 중 3짝**뿐이다:
 *     몫 $14$·내림 없음 → $28$ · 몫 $23$·내림 있음 → $92$ · 몫 $24$·내림 없음 → $48$.
 * 문항이 사실상 셋으로 굳는다 — 파일럿이 `2-1-1` 심화상을 「기준 수 $105$ 하나뿐」으로
 * 비운 것과 **같은 자리**다(원장님 다양성 원칙). **비우고 근거를 남긴다.**
 *
 * ⚠️ **2-2-4 에 나머지를 쓰기로 정했다** — 토대 17 §3(2-2 함정 ⑵)이 「먼저 정하라」고
 *    한 그 약속이다. 2-2-3 과 갈리는 자리는 **되짚는 자리**다:
 *    2-2-3 은 **나뉘는 수**를 되짚고, 2-2-4 는 **나누는 수·몫**을 되짚는다.
 *    나뉘는 수는 늘 세 자리로 지면에 서고, 그것이 이 소단원의 이름이다.
 *
 * 🔴 **후보 전량이 지면에 나가므로 목록을 전수 열거로 만들고, 약속을 못 지키는 틀은
 *    목록에서 뺀다**(문턱으로 거르지 않는다 — 파일럿과 같은 태도).
 *    그래서 **어떤 씨앗에서도 안 던진다.**
 *
 * ⚠️ **반증 ⑥ 을 목록에서 건다.** 발문에 찍히는 수는 아래 넷뿐이고(2-2-3 중 $b_1,q,b_2$ ·
 *    2-2-3 상 $L,U,b_1,r_1,b_2,r_2$ · 2-2-4 $N,r$), 그 수로 순방향으로 닿는 틀은
 *    목록에 안 넣는다. 「생성기가 센 수 == 지면에 찍힌 수」는 시험이 따로 잠근다.
 */

/** 2-2-3 심화중 — 나머지를 모른다. 후보는 잇달아 놓이고 «나누어떨어짐»이 하나를 남긴다. */
type Rem223Mid = {
  b1: number;
  q: number;
  b2: number;
  cand: number[];
  ans: number;
};

function rem223MidPool(): Rem223Mid[] {
  const out: Rem223Mid[] = [];
  for (let b1 = 3; b1 <= 9; b1 += 1)
    for (let q = 3; q <= 15; q += 1) {
      const cand: number[] = [];
      for (let r = 1; r <= b1 - 1; r += 1) cand.push(b1 * q + r);
      // 해설이 후보를 통째로 적으므로 **전부 두 자리**라야 한다.
      if (!cand.every((v) => v >= 10 && v <= 99)) continue;
      for (let b2 = 3; b2 <= 9; b2 += 1) {
        if (b2 === b1) continue;
        const hits = cand.filter((x) => x % b2 === 0);
        // 여럿이 남으면 성질이 마디를 못 굳히고, 하나도 없으면 답이 없다.
        if (hits.length !== 1) continue;
        const ans = hits[0]!;
        // 답인 나뉘는 수는 **몇십몇**이다(소단원 이름).
        if (ans % 10 === 0) continue;
        if (forwardReachable([rat(b1), rat(q), rat(b2)], rat(ans))) continue;
        out.push({ b1, q, b2, cand, ans });
      }
    }
  return out;
}

/** 2-2-3 심화상 — 후보가 흩어져 있고 «나머지»라 하나씩 실제로 나눠 봐야 한다. */
type Rem223High = {
  L: number;
  U: number;
  b1: number;
  r1: number;
  b2: number;
  r2: number;
  cand: number[];
  ans: number;
};

function rem223HighPool(): Rem223High[] {
  const out: Rem223High[] = [];
  const bounds: [number, number][] = [];
  for (let L = 10; L <= 80; L += 10)
    for (const w of [20, 30]) if (L + w <= 100) bounds.push([L, L + w]);
  for (const [L, U] of bounds)
    for (let b1 = 3; b1 <= 9; b1 += 1)
      for (let r1 = 1; r1 <= b1 - 1; r1 += 1) {
        const cand: number[] = [];
        for (let x = L + 1; x < U; x += 1) if (x % b1 === r1) cand.push(x);
        // 셋 미만이면 심화중과 구별이 안 되고, 여섯 이상이면 지면이 넘친다.
        if (cand.length < 3 || cand.length > 5) continue;
        if (!cand.every((v) => v >= 10 && v <= 99 && v % 10 !== 0)) continue;
        for (let b2 = 3; b2 <= 9; b2 += 1) {
          if (b2 === b1) continue;
          for (let r2 = 1; r2 <= b2 - 1; r2 += 1) {
            const hits = cand.filter((x) => x % b2 === r2);
            if (hits.length !== 1) continue;
            const ans = hits[0]!;
            if (
              forwardReachable(
                [rat(L), rat(U), rat(b1), rat(r1), rat(b2), rat(r2)],
                rat(ans),
              )
            )
              continue;
            out.push({ L, U, b1, r1, b2, r2, cand, ans });
          }
        }
      }
  return out;
}

/** 2-2-4 심화중 — 나누는 수를 모른다. «몫이 세 자리인가»가 하나를 남긴다. */
type Div224Mid = {
  N: number;
  r: number;
  M: number;
  cand: number[];
  ans: number;
};

function div224MidPool(): Div224Mid[] {
  const out: Div224Mid[] = [];
  for (let N = 100; N <= 999; N += 1)
    for (let r = 2; r <= 8; r += 1) {
      const M = N - r;
      if (M < 100) continue;
      const cand: number[] = [];
      // 나머지 < 나누는 수 — 후보를 만드는 것도 이 소단원의 성질이다.
      for (let b = 3; b <= 9; b += 1) if (b > r && M % b === 0) cand.push(b);
      if (cand.length < 2) continue;
      const three = cand.filter((b) => M / b >= 100);
      if (three.length !== 1) continue;
      // 나머지 후보의 몫도 두 자리라야 지면이 이 소단원 안에 머문다.
      if (!cand.every((b) => M / b >= 10)) continue;
      const ans = three[0]!;
      if (forwardReachable([rat(N), rat(r)], rat(ans))) continue;
      out.push({ N, r, M, cand, ans });
    }
  return out;
}

/** 2-2-4 심화상 — 성질이 후보를 하나도 못 자른다. 차례로 나누어 나머지를 견준다. */
type Div224High = {
  N: number;
  r: number;
  cand: number[];
  b: number;
  q: number;
};

function div224HighPool(): Div224High[] {
  const out: Div224High[] = [];
  for (let N = 100; N <= 999; N += 1)
    for (let r = 4; r <= 6; r += 1) {
      const cand: number[] = [];
      for (let b = r + 1; b <= 9; b += 1) cand.push(b);
      const hits = cand.filter((b) => N % b === r);
      if (hits.length !== 1) continue;
      const b = hits[0]!;
      const q = (N - r) / b;
      // **후보 전부가 두 자리 몫**이어야 「몫이 몇 자리인가」가 무력해진다.
      if (
        !cand.every((x) => Math.floor(N / x) >= 10 && Math.floor(N / x) <= 99)
      )
        continue;
      if (forwardReachable([rat(N), rat(r)], rat(q))) continue;
      out.push({ N, r, cand, b, q });
    }
  return out;
}

// 목록은 한 번만 만든다(약속을 못 지키는 틀은 여기서 이미 빠졌다).
let REM223_MID: Rem223Mid[] | null = null;
let REM223_HIGH: Rem223High[] | null = null;
let DIV224_MID: Div224Mid[] | null = null;
let DIV224_HIGH: Div224High[] | null = null;

/** 수 여러 개를 **한 덩어리** KaTeX 로 — 숫자마다 감싸면 지면에서 띄어쓰기가 깨진다. */
function list22(values: readonly number[]): string {
  return expr(values.join(",\\ "));
}

/** 5단 · 2-2-3 — 나머지를 모른다 → 잇달은 후보 → «나누어떨어짐»이 하나를 남긴다. */
function rem223Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  REM223_MID ??= rem223MidPool();
  const f = pick(rng, REM223_MID);
  const lo = f.b1 * f.q;
  const hi = f.b1 * (f.q + 1);
  const first = f.cand[0]!;
  const last = f.cand[f.cand.length - 1]!;
  const m = f.ans / f.b2;
  const stem = pick(rng, [
    `나누는 수가 ${n(f.b1)} 인 나눗셈에서 몫이 ${n(f.q)} 이고 나머지가 있습니다. 이 나눗셈의 나뉘는 수는 나누는 수가 ${n(f.b2)} 인 나눗셈에서 나누어떨어집니다. 나뉘는 수를 구하시오.`,
    `어떤 두 자리 수는 나누는 수가 ${n(f.b1)} 인 나눗셈에서 몫이 ${n(f.q)} 이고 나머지가 있습니다. 또 나누는 수가 ${n(f.b2)} 인 나눗셈에서는 나누어떨어집니다. 어떤 수를 구하시오.`,
    `어떤 수를 나누는 수가 ${n(f.b1)} 인 나눗셈으로 나누면 몫이 ${n(f.q)} 이고 나머지가 남습니다. 나누는 수가 ${n(f.b2)} 인 나눗셈으로 나누면 남는 것이 없습니다. 어떤 수는 얼마인지 쓰시오.`,
    `나누는 수가 ${n(f.b2)} 인 나눗셈에서 나누어떨어지는 두 자리 수가 있습니다. 이 수는 나누는 수가 ${n(f.b1)} 인 나눗셈에서 몫이 ${n(f.q)} 이고 나머지가 있습니다. 이 수를 구하시오.`,
    `나누는 수가 ${n(f.b1)} 인 나눗셈의 몫이 ${n(f.q)} 이고 나머지가 있는 두 자리 수 가운데, 나누는 수가 ${n(f.b2)} 인 나눗셈에서 나누어떨어지는 수를 구하시오.`,
    `어떤 두 자리 수를 나누는 수가 ${n(f.b1)} 인 나눗셈으로 나누었더니 몫이 ${n(f.q)} 이고 나머지가 있었습니다. 같은 수를 나누는 수가 ${n(f.b2)} 인 나눗셈으로 나누면 나머지가 없습니다. 어떤 수를 쓰시오.`,
    `두 자리 수 하나를 나누는 수가 ${n(f.b1)} 인 나눗셈으로 나누면 몫이 ${n(f.q)} 이고 나머지가 남는데, 나누는 수가 ${n(f.b2)} 인 나눗셈으로 나누면 남는 것이 없습니다. 그 수를 구하시오.`,
    `어떤 수는 나누는 수가 ${n(f.b2)} 인 나눗셈에서 남는 것이 없습니다. 또 나누는 수가 ${n(f.b1)} 인 나눗셈에서는 몫이 ${n(f.q)} 이고 나머지가 있습니다. 어떤 수는 얼마인지 구하시오.`,
    `어떤 두 자리 수는 나누는 수가 ${n(f.b1)} 인 나눗셈에서 몫이 ${n(f.q)} 이고 나머지가 남습니다. 그런데 나누는 수가 ${n(f.b2)} 인 나눗셈에서는 나누어떨어집니다. 어떤 수를 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(f.ans), [
    `나머지는 나누는 수보다 작으므로 ${n(1)} 부터 ${n(f.b1 - 1)} 까지입니다. 나뉘는 수는 ${expr(`${f.b1}\\times${f.q}=${lo}`)} 에 그 나머지를 더한 수이므로 ${n(first)} 부터 ${n(last)} 까지인 ${list22(f.cand)} 입니다.`,
    `이 가운데 나누는 수가 ${n(f.b2)} 인 나눗셈에서 나누어떨어지는 수는 ${expr(`${f.b2}\\times${m}=${f.ans}`)} 하나뿐입니다.`,
    `따라서 나뉘는 수는 ${n(f.ans)} 입니다. ${expr(`${f.ans}\\div${f.b1}`)} 의 몫은 ${n(f.q)}, 나머지는 ${n(f.ans - lo)} 입니다.`,
  ]);
}

/** 6단 · 2-2-3 — 성질이 아무것도 못 잘라 내어 **후보를 하나씩 실제로 나눈다.** */
function rem223High(unit: UnitSeed, rng: Rng): ElemProblem {
  REM223_HIGH ??= rem223HighPool();
  const f = pick(rng, REM223_HIGH);
  const first = f.cand[0]!;
  const stem = pick(rng, [
    `${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 두 자리 수가 있습니다. 나누는 수가 ${n(f.b1)} 인 나눗셈에서 나머지가 ${n(f.r1)} 이고, 나누는 수가 ${n(f.b2)} 인 나눗셈에서 나머지가 ${n(f.r2)} 입니다. 이 수를 구하시오.`,
    `나누는 수가 ${n(f.b1)} 인 나눗셈에서 나머지가 ${n(f.r1)} 이고 나누는 수가 ${n(f.b2)} 인 나눗셈에서 나머지가 ${n(f.r2)} 인 두 자리 수가 있습니다. 이 수가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작을 때 이 수를 구하시오.`,
    `어떤 두 자리 수는 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작습니다. 나누는 수가 ${n(f.b1)} 인 나눗셈에서는 나머지가 ${n(f.r1)} 이고, 나누는 수가 ${n(f.b2)} 인 나눗셈에서는 나머지가 ${n(f.r2)} 입니다. 어떤 수를 쓰시오.`,
    `${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 수 가운데, 나누는 수가 ${n(f.b1)} 인 나눗셈의 나머지가 ${n(f.r1)} 이고 나누는 수가 ${n(f.b2)} 인 나눗셈의 나머지가 ${n(f.r2)} 인 수를 구하시오.`,
    `두 자리 수 하나가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작습니다. 이 수를 나누는 수가 ${n(f.b1)} 인 나눗셈으로 나누면 ${n(f.r1)} 만큼 남고, 나누는 수가 ${n(f.b2)} 인 나눗셈으로 나누면 ${n(f.r2)} 만큼 남습니다. 이 수를 구하시오.`,
    `나누는 수가 ${n(f.b1)} 인 나눗셈에서 나머지가 ${n(f.r1)} 이고 나누는 수가 ${n(f.b2)} 인 나눗셈에서 나머지가 ${n(f.r2)} 인 두 자리 수를 찾습니다. 그 수가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작을 때 얼마인지 쓰시오.`,
    `어떤 두 자리 수를 나누는 수가 ${n(f.b1)} 인 나눗셈으로 나누면 나머지가 ${n(f.r1)} 이고, 나누는 수가 ${n(f.b2)} 인 나눗셈으로 나누면 나머지가 ${n(f.r2)} 입니다. 어떤 수가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작을 때 구하시오.`,
    `${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 두 자리 수를 나누는 수가 ${n(f.b1)} 인 나눗셈으로 나누면 나머지가 ${n(f.r1)} 입니다. 그 수를 나누는 수가 ${n(f.b2)} 인 나눗셈으로 나누면 나머지가 ${n(f.r2)} 입니다. 그 수를 쓰시오.`,
  ]);
  // **하나씩 실제로 나눈다** — 이 갈래를 상으로 만드는 것이 바로 이 걸음이다.
  const tries = f.cand
    .map((x) => {
      const qq = Math.floor(x / f.b2);
      return `${expr(`${f.b2}\\times${qq}=${f.b2 * qq}`)} 에서 ${n(x)} 의 나머지는 ${n(x - f.b2 * qq)}`;
    })
    .join(", ");
  return makeDeep(unit, stem, n(f.ans), [
    `나누는 수가 ${n(f.b1)} 인 나눗셈에서 나머지가 ${n(f.r1)} 인 수는 ${expr(`${f.b1}\\times${(first - f.r1) / f.b1}+${f.r1}=${first}`)} 처럼 만들어지고, 그다음부터는 ${n(f.b1)} 씩 커집니다.`,
    `${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 것은 ${list22(f.cand)} 입니다.`,
    `이 수들을 나누는 수가 ${n(f.b2)} 인 나눗셈으로 하나씩 나누어 봅니다. ${tries} 입니다.`,
    `나머지가 ${n(f.r2)} 인 것은 ${n(f.ans)} 뿐입니다. ${expr(`${f.ans}\\div${f.b1}`)} 의 나머지는 ${n(f.r1)} 입니다.`,
  ]);
}

/** 5단 · 2-2-4 — 나누는 수를 모른다 → «몫이 세 자리인가»가 하나를 남긴다. */
function div224Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  DIV224_MID ??= div224MidPool();
  const f = pick(rng, DIV224_MID);
  const q = f.M / f.ans;
  const hundreds = Math.floor(f.M / 100);
  const stem = pick(rng, [
    `나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 인 나눗셈이 있습니다. 나누는 수는 한 자리 수이고 몫은 세 자리 수입니다. 나누는 수를 구하시오.`,
    `나뉘는 수가 ${n(f.N)} 인 나눗셈에서 나누는 수는 한 자리 수이고 나머지는 ${n(f.r)} 입니다. 몫이 세 자리 수일 때 나누는 수를 구하시오.`,
    `한 자리 수로 나누는 나눗셈이 있습니다. 나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 이며 몫이 세 자리 수일 때, 나누는 수를 구하시오.`,
    `나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 인 나눗셈에서 몫이 세 자리 수입니다. 한 자리 수인 나누는 수는 얼마인지 쓰시오.`,
    `어떤 한 자리 수로 나누는 나눗셈에서 나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 입니다. 몫이 세 자리 수가 되게 하는 나누는 수를 구하시오.`,
    `나눗셈의 나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 입니다. 나누는 수가 한 자리 수이고 몫이 세 자리 수일 때, 나누는 수를 쓰시오.`,
    `세 자리 수를 한 자리 수로 나누었더니 몫도 세 자리 수였고 나머지가 ${n(f.r)} 입니다. 나뉘는 수가 ${n(f.N)} 일 때 나누는 수를 구하시오.`,
    `나뉘는 수가 ${n(f.N)} 이고 몫이 세 자리 수인 나눗셈이 있습니다. 나누는 수는 한 자리 수이고 나머지가 ${n(f.r)} 일 때 나누는 수는 얼마인지 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(f.ans), [
    `나머지가 ${n(f.r)} 이므로 나뉘는 수에서 나머지를 빼면 ${expr(`${f.N}-${f.r}=${f.M}`)} 입니다. 이 수가 나누는 수로 나누어떨어집니다.`,
    `나머지보다 큰 한 자리 수 가운데 나누어떨어지게 하는 수는 ${list22(f.cand)} 입니다.`,
    `몫이 세 자리 수가 되려면 나누는 수가 백의 자리 숫자보다 크지 않아야 합니다. 백의 자리 숫자는 ${n(hundreds)} 이므로 나누는 수는 ${n(f.ans)} 이고, 몫은 ${expr(`${f.M}\\div${f.ans}=${q}`)} 에서 ${n(q)} 입니다.`,
  ]);
}

/** 6단 · 2-2-4 — 성질이 후보를 하나도 못 자른다. 차례로 나누어 나머지를 견준다. */
function div224High(unit: UnitSeed, rng: Rng): ElemProblem {
  DIV224_HIGH ??= div224HighPool();
  const f = pick(rng, DIV224_HIGH);
  const stem = pick(rng, [
    `나뉘는 수가 ${n(f.N)} 이고 나누는 수가 한 자리 수인 나눗셈에서 나머지가 ${n(f.r)} 입니다. 이 나눗셈의 몫을 구하시오.`,
    `어떤 한 자리 수로 나누는 나눗셈에서 나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 입니다. 몫은 얼마인지 구하시오.`,
    `나뉘는 수가 ${n(f.N)} 인 나눗셈이 있습니다. 나누는 수는 한 자리 수이고 나머지는 ${n(f.r)} 입니다. 몫을 구하시오.`,
    `나누는 수가 한 자리 수인 나눗셈에서 나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 일 때 몫을 쓰시오.`,
    `나뉘는 수가 ${n(f.N)} 인 세 자리 수 나눗셈에서 나누는 수는 한 자리 수이고 나머지는 ${n(f.r)} 입니다. 몫을 쓰시오.`,
    `나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 인 나눗셈에서 나누는 수가 한 자리 수입니다. 몫을 구하시오.`,
    `한 자리 수로 나누는 나눗셈이 있습니다. 나뉘는 수가 ${n(f.N)} 이고 나머지가 ${n(f.r)} 일 때, 이 나눗셈의 몫은 얼마인지 쓰시오.`,
    `어떤 나눗셈은 나누는 수가 한 자리 수이고 나뉘는 수가 ${n(f.N)} 이며 나머지가 ${n(f.r)} 입니다. 몫을 구하시오.`,
  ]);
  const tries = f.cand
    .map((b) => {
      const qq = Math.floor(f.N / b);
      return `${expr(`${b}\\times${qq}=${b * qq}`)} 에서 나머지는 ${n(f.N - b * qq)}`;
    })
    .join(", ");
  return makeDeep(unit, stem, n(f.q), [
    `나머지가 ${n(f.r)} 이므로 나누는 수는 ${n(f.r)} 보다 커야 합니다. 곧 한 자리 수 가운데 ${list22(f.cand)} 입니다.`,
    `이 수들로 차례로 나누어 봅니다. ${tries} 입니다.`,
    `나머지가 ${n(f.r)} 인 것은 나누는 수가 ${n(f.b)} 일 때이므로 몫은 ${n(f.q)} 입니다.`,
  ]);
}

// ══ 2-4 분수 (2-4-1 ~ 2-4-6) ═══════════════════════════════════════════
//
// ⚠️ **기약 규칙은 소단원마다 다르고, 그것이 옳다** — `frac32` 의 두 주석을 먼저 읽을 것.
//   분수가 **답**인 자리(2-4-1)는 안 거르고, **발문에 주어지는 값**인 자리(2-4-2·3)는 거른다.
//   초3 은 약분(초5)을 안 배우므로 $\frac26$ 이 정답이다. **통일하지 말 것.**
//
// ⚠️ 이 대단원의 성질 여럿은 **구성이 100% 를 보장한다**(분모가 같다 · 발문이 가분수다 ·
//   분자가 서로 다르다). 그런 성질의 시험 문턱은 **전량**이어야 한다 — 「대부분」으로 두면
//   구성이 절반 무너져도 안 운다(2026-08-23 g5 실측: 구성 100% ↔ 변이 59.5% 가 «과반» 통과).

/** 「개」로 세는 소재만 — 색종이는 「장」이라 발문이 어색해진다(`frac32` 와 같은 목록). */
const FRAC24_STUFF = ["사탕", "구슬", "딱지", "쿠키", "귤"] as const;

/** 세 사람 비교용. 2-4-6 기본은 **셋**이라 1-6-4 기본(둘)과 지면에서 갈린다. */
const KID_TRIOS = [
  ["가은", "나윤", "다인"],
  ["라온", "시우", "하람"],
  ["도현", "서진", "예찬"],
] as const;

/**
 * 분모와 서로소인 분자 후보. **거르는 고리가 아니라 목록에서 고른다** — 뽑고 나서
 * 버리면 씨앗마다 걸음 수가 달라져 되풀이가 깨진다.
 * `den-1` 은 언제나 서로소라 후보가 비지 않는다(그래서 `pick` 이 안전하다).
 */
function coprimeNums(den: number, from: number): number[] {
  return Array.from({ length: den - from }, (_, i) => i + from).filter(
    (v) => gcd(v, den) === 1,
  );
}

// ── 2-4-1 분수로 나타내기 ──

/** 1단 — 묶음 수와 뽑은 묶음 수를 바로 준다(표준은 물건 개수부터 준다). */
function part241Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  const take = intBetween(rng, 1, groups - 1);
  const stem = pick(rng, [
    `전체를 똑같이 ${n(groups)}묶음으로 나눈 것 중 ${n(take)}묶음은 전체의 얼마인지 분수로 쓰시오.`,
    `똑같이 ${n(groups)}묶음으로 나눈 것 가운데 ${n(take)}묶음을 분수로 나타내시오.`,
    `전체를 ${n(groups)}묶음으로 똑같이 나누었습니다. ${n(take)}묶음은 전체의 얼마입니까?`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${take}}{${groups}}`),
    `전체를 똑같이 ${n(groups)}묶음으로 나눈 것 중 ${n(take)}묶음이므로 ${expr(`\\frac{${take}}{${groups}}`)} 입니다.`,
  );
}

/** 2단 — 묶음 수를 **스스로 구해야** 한다(한 묶음의 개수만 준다). */
function part241Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, FRAC24_STUFF);
  const groups = intBetween(rng, 3, 8);
  const each = intBetween(rng, 2, 9);
  const whole = groups * each;
  const take = intBetween(rng, 1, groups - 1);
  const stem = pick(rng, [
    `${stuff} ${n(whole)}개를 한 묶음에 ${n(each)}개씩 묶었습니다. ${n(take)}묶음은 전체의 얼마인지 분수로 쓰시오.`,
    `${stuff} ${n(whole)}개를 ${n(each)}개씩 똑같이 묶었습니다. 그중 ${n(take)}묶음을 분수로 나타내시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${take}}{${groups}}`),
    `${n(whole)}개를 ${n(each)}개씩 묶으면 ${expr(`${whole}\\div${each}=${groups}`)} 이므로 ${n(groups)}묶음입니다. 그중 ${n(take)}묶음이므로 ${expr(`\\frac{${take}}{${groups}}`)} 입니다.`,
  );
}

/** 3단 — 두 단계: 먹은 묶음을 빼서 **남은 묶음**을 구하고 분수로 나타낸다. */
function part241Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, FRAC24_STUFF);
  const groups = intBetween(rng, 4, 8);
  const each = intBetween(rng, 2, 9);
  const whole = groups * each;
  const take = intBetween(rng, 1, groups - 2);
  const left = groups - take;
  const stem = pick(rng, [
    `${stuff} ${n(whole)}개를 똑같이 ${n(groups)}묶음으로 나누어 그중 ${n(take)}묶음을 먹었습니다. 남은 것은 전체의 얼마인지 분수로 쓰시오.`,
    `${stuff} ${n(whole)}개를 ${n(groups)}묶음으로 똑같이 나누고 ${n(take)}묶음을 나누어 주었습니다. 남은 것을 분수로 나타내시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`\\frac{${left}}{${groups}}`),
    `${n(groups)}묶음 중 ${n(take)}묶음을 덜어 내면 ${expr(`${groups}-${take}=${left}`)} 이므로 ${n(left)}묶음이 남습니다. 전체 ${n(groups)}묶음 중 ${n(left)}묶음이므로 ${expr(`\\frac{${left}}{${groups}}`)} 입니다.`,
  );
}

/** 4단 — 역산·조건 둘: 「묶음 수」와 「몇 묶음이 몇 개」에서 **전체 개수**를 되짚는다. */
function part241Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, FRAC24_STUFF);
  const groups = intBetween(rng, 3, 8);
  const each = intBetween(rng, 2, 9);
  const take = intBetween(rng, 2, groups - 1);
  const part = each * take;
  const whole = each * groups;
  const stem = pick(rng, [
    // ⚠️ 소재 낱말 뒤 조사는 **반드시 `josa`** 로 — 「사탕를」·「구슬는」이 그대로 지면에 나간다.
    //   조사 판정기들은 `$…$` 뒤만 보므로 이 부류를 구조적으로 못 잡는다(2026-08-23 실측 6자리).
    `${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(groups)}묶음으로 나누었습니다. 그중 ${n(take)}묶음이 ${n(part)}개일 때, 처음 ${stuff}${josa(stuff, "은", "는")} 모두 몇 개입니까?`,
    `${stuff}${josa(stuff, "을", "를")} ${n(groups)}묶음으로 똑같이 나누었더니 ${n(take)}묶음이 ${n(part)}개였습니다. 전체는 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(whole),
    `${n(take)}묶음이 ${n(part)}개이므로 한 묶음은 ${expr(`${part}\\div${take}=${each}`)} 개입니다. 묶음이 ${n(groups)}개이므로 전체는 ${expr(`${each}\\times${groups}=${whole}`)} 개입니다.`,
  );
}

// ── 2-4-2 · 2-4-3 분수만큼은 얼마인지 알아보기 ──
//
// 두 소단원은 **분자 하나로만** 갈린다((1) 은 단위분수, (2) 는 분자 2 이상).
// 그래서 공장 하나에 `unitOnly` 를 주어 **같은 규칙을 두 곳이 쓰게** 한다 —
// 갈래마다 따로 적으면 한쪽만 고쳐도 아무도 모른다.

/** 분자를 그 소단원 이름이 약속한 대로 고른다. 발문에 실리는 값이라 **기약만**. */
function takeOf(rng: Rng, den: number, unitOnly: boolean): number {
  return unitOnly ? 1 : pick(rng, coprimeNums(den, 2));
}

/** 1단 — 수만 준다(표준은 소재를 붙인다). */
function frac24CalcOf(unitOnly: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    const answer = each * take;
    const fr = expr(`\\frac{${take}}{${den}}`);
    const stem = pick(rng, [
      `${n(whole)}의 ${fr} 만큼은 얼마인지 쓰시오.`,
      `${n(whole)}의 ${fr} 만큼은 어떤 수입니까?`,
    ]);
    return make(
      unit,
      stem,
      n(answer),
      // ⚠️ 수 뒤에 조사를 붙이지 않는다(읽는 소리로 갈린다) — 「$24$을」이 아니라
      //   수를 문장 앞에 세우지 않고 셈으로 보인다. 전 학년 R-조사 판정기가 이 자리를 잡았다.
      take === 1
        ? `똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${expr(`${whole}\\div${den}=${each}`)} 입니다. ${fr} 만큼은 한 묶음이므로 ${n(answer)} 입니다.`
        : `똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${expr(`${whole}\\div${den}=${each}`)} 입니다. ${n(take)}묶음이므로 ${expr(`${each}\\times${take}=${answer}`)} 입니다.`,
    );
  };
}

/** 2단 — 분수를 **스스로 세워야** 한다(나눠 가지는 사람 수만 준다). */
function frac24WordOf(unitOnly: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const stuff = pick(rng, FRAC24_STUFF);
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    const answer = each * take;
    // ⚠️ **발문에 분수가 서야 한다.** 「$N$개를 $d$명이 나누어 가짐」만 쓰면 지면에 분수가
    //   하나도 없어 1-3 나눗셈 문항과 구별되지 않는다 — 소단원 이름이 약속한 「분수만큼」이
    //   사라진다(2026-08-23 자체 시험이 잡았다. 공용 조건 판정기는 이 소단원을 아직 안 본다).
    const fr = expr(`\\frac{${take}}{${den}}`);
    const isNot = josa(stuff, "은", "는");
    const stem = unitOnly
      ? pick(rng, [
          `${stuff} ${n(whole)}개가 있습니다. 그중 ${fr} 만큼을 동생에게 주었습니다. 동생에게 준 ${stuff}${isNot} 몇 개입니까?`,
          `${stuff} ${n(whole)}개를 ${n(den)}명이 똑같이 나누어 가졌습니다. 한 사람이 가진 것은 전체의 ${fr} 만큼입니다. 한 사람이 가진 ${stuff}${isNot} 몇 개인지 쓰시오.`,
        ])
      : pick(rng, [
          `${stuff} ${n(whole)}개가 있습니다. 그중 ${fr} 만큼을 상자에 담았습니다. 상자에 담은 ${stuff}${isNot} 몇 개입니까?`,
          `${stuff} ${n(whole)}개를 똑같이 ${n(den)}묶음으로 나누고 그중 ${n(take)}묶음을 담았습니다. 담은 것은 전체의 ${fr} 만큼입니다. 담은 ${stuff}${isNot} 몇 개인지 쓰시오.`,
        ]);
    return make(
      unit,
      stem,
      n(answer),
      take === 1
        ? `${n(whole)}개를 똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${expr(`${whole}\\div${den}=${each}`)} 개입니다. 한 묶음이 전체의 ${expr(`\\frac{1}{${den}}`)} 만큼입니다.`
        : `${n(whole)}개를 똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${expr(`${whole}\\div${den}=${each}`)} 개입니다. ${n(take)}묶음이므로 ${expr(`${each}\\times${take}=${answer}`)} 개이고, 이는 전체의 ${expr(`\\frac{${take}}{${den}}`)} 만큼입니다.`,
    );
  };
}

/** 3단 — 두 단계: 분수만큼을 구한 뒤 **남은 것**까지 센다. */
function frac24ApplyOf(unitOnly: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const stuff = pick(rng, FRAC24_STUFF);
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    const used = each * take;
    const left = whole - used;
    const fr = expr(`\\frac{${take}}{${den}}`);
    const stem = pick(rng, [
      `${stuff} ${n(whole)}개 중 ${fr} 만큼을 먹었습니다. 남은 ${stuff}${josa(stuff, "은", "는")} 몇 개입니까?`,
      `${stuff} ${n(whole)}개의 ${fr} 만큼을 나누어 주었습니다. 남은 것은 몇 개인지 쓰시오.`,
    ]);
    return make(
      unit,
      stem,
      n(left),
      `${n(whole)}개를 똑같이 ${n(den)}묶음으로 나누면 한 묶음은 ${n(each)}개입니다. ${fr} 만큼은 ${
        take === 1
          ? `${n(used)}개`
          : `${expr(`${each}\\times${take}=${used}`)} 개`
      }이므로 남은 것은 ${expr(`${whole}-${used}=${left}`)} 개입니다.`,
    );
  };
}

/** 4단 — 역산: 「분수만큼이 몇 개」에서 **전체**를 되짚는다(답은 발문에 안 보인다). */
function frac24DeepOf(unitOnly: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const stuff = pick(rng, FRAC24_STUFF);
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    const part = each * take;
    const fr = expr(`\\frac{${take}}{${den}}`);
    const stem = pick(rng, [
      `어떤 수의 ${fr} 만큼이 ${n(part)} 입니다. 어떤 수는 얼마인지 쓰시오.`,
      `${stuff} 상자에서 ${fr} 만큼을 꺼냈더니 ${n(part)}개였습니다. 상자에 있던 ${stuff}${josa(stuff, "은", "는")} 모두 몇 개입니까?`,
    ]);
    return make(
      unit,
      stem,
      n(whole),
      take === 1
        ? `${fr} 만큼이 한 묶음이므로 한 묶음은 ${n(part)} 입니다. 묶음이 ${n(den)}개이므로 처음 수는 ${expr(`${part}\\times${den}=${whole}`)} 입니다.`
        : `${n(take)}묶음이 ${n(part)} 이므로 한 묶음은 ${expr(`${part}\\div${take}=${each}`)} 입니다. 묶음이 ${n(den)}개이므로 처음 수는 ${expr(`${each}\\times${den}=${whole}`)} 입니다.`,
    );
  };
}

// ── 2-4-4 진분수와 가분수 알아보기 ──

/** 1단 — 넷 중 가분수만 모두 고른다(표준은 하나를 판별한다). 진·가가 **둘 다 나오게** 구성. */
function kind244Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 9);
  // 진분수 둘 · 가분수 둘 — **구성으로 보장한다.** 뽑고 나서 세면 한쪽만 나오는 씨앗이 생긴다.
  const proper = distinctIdx(rng, den - 1, 2).map((i) => i + 1);
  const improper = distinctIdx(rng, 5, 2).map((i) => i + den);
  const order = distinctIdx(rng, 4, 4);
  const all = [...proper, ...improper];
  const shown = order.map((i) => all[i]!);
  const list = shown.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  const ans = shown.filter((v) => v >= den);
  return make(
    unit,
    `${pick(rng, ["다음 분수 중에서 가분수를 모두 골라 쓰시오.", "다음 중 가분수인 것을 모두 쓰시오."])}\n\n${list}`,
    ans.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  "),
    `분자가 분모와 같거나 분모보다 크면 가분수입니다. 분모가 ${n(den)} 이므로 분자가 ${n(den)} 이상인 것을 고릅니다.`,
  );
}

/**
 * 2단 — 분수를 **스스로 만들어** 놓고 판별한다(주어진 분수에서 분자를 옮겨 만든다).
 *
 * ⚠️ 분모·분자를 **말로만** 주면 지면에 분수가 하나도 안 선다. 전 학년
 * `probe-elem-section-conditions` 의 「진분수와 가분수」 조건이 그것을 잡는다
 * (2026-08-23 실측 40/40 위반). 기준이 되는 분수를 지면에 세우고 거기서 만들게 한다 —
 * 축(식을 스스로 세움)은 그대로다.
 */
function kind244Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 9);
  const improper = intBetween(rng, 0, 1) === 1;
  const num = improper
    ? intBetween(rng, den, den + 5)
    : intBetween(rng, 1, den - 1);
  // 기준 분수의 분자는 **답의 분자와 달라야** 한다 — 같으면 「분자를 그대로 둔 분수」가
  // 되어 묻는 것이 사라진다. 뽑고 버리지 않고 **건너뛰기로** 막는다(씨앗마다 걸음 수가
  // 같아야 되풀이가 깨지지 않는다). 가분수면 `num` 이 1..den-1 밖이라 애초에 안 부딪힌다.
  const avoid = improper ? 0 : num;
  let base = intBetween(rng, 1, den - 1 - (avoid > 0 ? 1 : 0));
  if (avoid > 0 && base >= avoid) base += 1;
  const gap = num - base;
  const baseFr = expr(`\\frac{${base}}{${den}}`);
  const move =
    gap > 0
      ? `분자를 ${n(gap)} 만큼 크게 한`
      : `분자를 ${n(-gap)} 만큼 작게 한`;
  const stem = pick(rng, [
    `${baseFr} 에서 분모는 그대로 두고 ${move} 분수를 쓰고, 진분수와 가분수 중 무엇인지 쓰시오.`,
    `${baseFr} 에서 분모는 그대로 두고 ${move} 분수는 진분수입니까, 가분수입니까? 분수와 함께 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    `${expr(`\\frac{${num}}{${den}}`)}, ${improper ? "가분수" : "진분수"}`,
    `분모가 ${n(den)}, 분자가 ${n(num)} 이므로 ${expr(`\\frac{${num}}{${den}}`)} 입니다. ${
      improper
        ? `분자와 분모를 비교하면 ${expr(`${num}${num === den ? "=" : ">"}${den}`)} 이므로 가분수입니다.`
        : `분자와 분모를 비교하면 ${expr(`${num}<${den}`)} 이므로 진분수입니다.`
    }`,
  );
}

/**
 * 3단 — 두 단계: 주어진 진분수가 **가분수가 되려면** 분자를 얼마나 키워야 하는지.
 * 판별(진분수다) → 되짚기(분모까지 얼마 남았나) 두 걸음이다.
 */
function kind244Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 4, 9);
  const num = intBetween(rng, 1, den - 1);
  const need = den - num;
  const fr = expr(`\\frac{${num}}{${den}}`);
  const stem = pick(rng, [
    `${fr} 의 분모는 그대로 두고 분자만 크게 하여 가분수를 만들려고 합니다. 분자에 더해야 하는 가장 작은 수를 쓰시오.`,
    `${fr} 의 분자를 적어도 얼마만큼 크게 해야 가분수가 되는지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(need),
    `주어진 분수는 분자와 분모를 비교하면 ${expr(`${num}<${den}`)} 이므로 진분수입니다. 가분수가 되려면 분자가 분모와 같거나 커야 하므로 분자는 적어도 ${n(den)} 이어야 하고, ${expr(`${den}-${num}=${need}`)} 만큼 크게 해야 합니다.`,
  );
}

/**
 * 4단 — 조건 둘을 겹쳐 개수를 센다(가분수이면서 분자가 어떤 수보다 작다).
 *
 * ⚠️ 답이 「몇 개」라 **가짓수**를 봐야 한다. `span` 을 흔들어 답이 2~6 으로 갈리게 한다 —
 * 분모를 고정하면 답이 한 값으로 굳는다.
 */
function kind244Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 9);
  // ⚠️ 견줄 상대가 **나누어떨어지면 안 된다.**
  //
  //    `den + span` 이 `den` 의 배수면 상대가 `\frac{12}{6}` 처럼 **정수로 읽히는**
  //    분수가 된다. D-73 전에는 전처리가 그걸 `2` 로 접어 지면이 자연스러웠는데,
  //    이제 안 접히니 발문에 `\frac{12}{6} 보다 작은` 이 그대로 나간다 —
  //    수학은 맞지만 교과서 말투가 아니다(실측 14자리 · 발문 7 · 해설 7, 2026-08-24).
  //
  //    ⚠️ **정수로 바꿔 쓰는 것으로는 못 푼다.** 그러면 발문에 남는 분수가
  //       `\frac{\square}{d}` 뿐인데 판정기의 분수 세기가 □ 를 못 읽어
  //       「진분수와 가분수」 조건이 **깨진다** — 실제로 고쳐 보고 씨앗 3/40 이 걸렸다.
  //       그래서 «어떻게 적을까»가 아니라 **«그 자리를 안 만든다»**로 푼다.
  //       상대는 늘 진짜 가분수이고, 그게 이 소단원이 다루는 것이기도 하다.
  const span = pick(
    rng,
    [2, 3, 4, 5, 6].filter((v) => v % den !== 0),
  );
  const limit = den + span;
  // ⚠️ 견줄 상대를 **수 분수**로 세운다. `\frac{\square}{d}` 만 있으면 지면에는 분수가
  //   보이는데 판정기의 분수 세기(`fracs()`)가 □ 를 못 읽어 「분수가 없다」로 걸린다.
  //   수 분수를 함께 세우면 문항도 더 구체적이 된다(2026-08-23).
  const limFr = expr(`\\frac{${limit}}{${den}}`);
  const stem = pick(rng, [
    `${expr(`\\frac{\\square}{${den}}`)} 가 가분수이고 ${limFr} 보다 작습니다. ${expr("\\square")} 에 들어갈 수 있는 수는 모두 몇 개입니까?`,
    `분모가 ${n(den)} 인 분수 중에서 ${limFr} 보다 작은 가분수는 모두 몇 개인지 쓰시오.`,
  ]);
  return make(
    unit,
    stem,
    n(span),
    `분모가 같으므로 분자만 견주면 됩니다. 가분수이려면 분자가 분모 ${n(den)} 보다 작지 않아야 하므로 ${n(den)} 부터이고, ${limFr} 보다 작아야 하므로 ${n(limit - 1)} 까지입니다. ${n(den)} 부터 ${n(limit - 1)} 까지이므로 ${expr(`${limit - 1}-${den}+1=${span}`)} 개입니다.`,
  );
}

// ── 2-4-5 대분수 알아보기 ──
//
// ⚠️ 해설에서 **나머지가 있는 나눗셈을 등식으로 적지 않는다** — `$17\div6=2$` 는 거짓이다.
//   표준을 2026-08-23 에 그 꼴로 고쳤으므로 네 갈래도 **같은 꼴**(곱하고 빼서 몫·나머지)로
//   맞춘다. 한 소단원 안에서 표기가 갈리면 지면에서 바로 티가 난다.

/** 1단 — **대분수 → 가분수**(표준은 반대 방향이다). */
function mixed245Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  const num = whole * den + rest;
  const mixed = expr(`${whole}\\frac{${rest}}{${den}}`);
  return make(
    unit,
    `${pick(rng, ["다음 대분수를 가분수로 나타내시오.", "다음 대분수를 가분수로 고쳐 쓰시오."])}\n\n${mixed}`,
    expr(`\\frac{${num}}{${den}}`),
    `자연수 부분을 분모가 ${n(den)} 인 분수로 고치면 ${expr(`\\frac{${whole * den}}{${den}}`)} 이고, ${expr(`${whole * den}+${rest}=${num}`)} 이므로 ${expr(`\\frac{${num}}{${den}}`)} 입니다.`,
  );
}

/** 2단 — 대분수를 **스스로 세운다**(자연수 부분과 진분수 부분을 말로 준다). */
function mixed245Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 6);
  const rest = pick(rng, coprimeNums(den, 1));
  const stem = pick(rng, [
    `자연수 부분이 ${n(whole)} 이고 진분수 부분이 ${expr(`\\frac{${rest}}{${den}}`)} 인 대분수를 쓰시오.`,
    `자연수 ${n(whole)} 만큼과 ${expr(`\\frac{${rest}}{${den}}`)} 만큼을 더한 수를 대분수로 나타내시오.`,
  ]);
  return make(
    unit,
    stem,
    expr(`${whole}\\frac{${rest}}{${den}}`),
    `대분수는 자연수와 진분수를 나란히 씁니다. 자연수 부분이 ${n(whole)}, 진분수 부분이 ${expr(`\\frac{${rest}}{${den}}`)} 이므로 ${expr(`${whole}\\frac{${rest}}{${den}}`)} 입니다.`,
  );
}

/** 3단 — 두 단계: 가분수 둘을 각각 대분수로 고쳐 **자연수 부분이 큰 쪽**을 고른다. */
function mixed245Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  // 자연수 부분이 **반드시 다르게** — 같으면 답이 하나가 아니다(구성으로 막는다).
  const [i, j] = distinctIdx(rng, 5, 2) as [number, number];
  const wA = i + 1;
  const wB = j + 1;
  const rA = pick(rng, coprimeNums(den, 1));
  const rB = pick(rng, coprimeNums(den, 1));
  const numA = wA * den + rA;
  const numB = wB * den + rB;
  const bigger = wA > wB ? numA : numB;
  const bigW = Math.max(wA, wB);
  return make(
    unit,
    `${pick(rng, ["두 가분수를 대분수로 나타냈을 때, 자연수 부분이 더 큰 것을 가분수 그대로 쓰시오.", "다음 두 가분수 중 대분수로 고쳤을 때 자연수 부분이 더 큰 것을 쓰시오."])}\n\n${expr(`\\frac{${numA}}{${den}}`)},  ${expr(`\\frac{${numB}}{${den}}`)}`,
    expr(`\\frac{${bigger}}{${den}}`),
    `${expr(`${den}\\times${wA}=${den * wA}`)} 이고 ${expr(`${numA}-${den * wA}=${rA}`)} 이므로 첫째 분수는 ${expr(`${wA}\\frac{${rA}}{${den}}`)} 입니다. ` +
      `${expr(`${den}\\times${wB}=${den * wB}`)} 이고 ${expr(`${numB}-${den * wB}=${rB}`)} 이므로 둘째 분수는 ${expr(`${wB}\\frac{${rB}}{${den}}`)} 입니다. ` +
      `자연수 부분이 더 큰 것은 ${n(bigW)} 이므로 답은 ${expr(`\\frac{${bigger}}{${den}}`)} 입니다.`,
  );
}

/** 4단 — 역산: 가분수를 알려 주고 대분수의 **가려진 자리**를 되짚는다. */
function mixed245Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 6);
  const rest = pick(rng, coprimeNums(den, 1));
  const num = whole * den + rest;
  // 가리는 자리는 자연수부(0) 또는 분자(1). **분모는 안 가린다** — 가리면 답이 하나가 아니다.
  const spot = intBetween(rng, 0, 1);
  const hidden = spot === 0 ? whole : rest;
  const shown =
    spot === 0
      ? expr(`\\square\\frac{${rest}}{${den}}`)
      : expr(`${whole}\\frac{\\square}{${den}}`);
  return make(
    unit,
    `가분수 ${expr(`\\frac{${num}}{${den}}`)} 만큼을 대분수로 나타내면 ${shown} 입니다. ${expr("\\square")} 에 알맞은 수를 쓰시오.`,
    n(hidden),
    `${expr(`${den}\\times${whole}=${den * whole}`)} 이고 ${expr(`${num}-${den * whole}=${rest}`)} 이므로 ${expr(`${num}\\div${den}`)} 의 몫은 ${n(whole)}, 나머지는 ${n(rest)} 입니다. 대분수로 나타내면 ${expr(`${whole}\\frac{${rest}}{${den}}`)} 이므로 ${expr("\\square")} 에 알맞은 수는 ${n(hidden)} 입니다.`,
  );
}

// ── 2-4-6 분모가 같은 분수의 크기 비교 ──
//
// ⚠️ 소단원 **이름이 1-6-4 와 글자까지 같다.** 부딪히지 않는 이유는 라우터가 대단원 키
//   (`초3|2-4 분수` → `frac32`)로 갈리기 때문이고, 낱말은 그 핸들러 안에서만 경쟁한다.
//   그래도 **지면에서는 갈려야** 하므로 1-6-4 가 둘을 견줄 때 여기는 **셋**을 견준다.

/** 1단 — 세 분수 중 **가장 작은** 것(표준은 가장 큰 것을 묻는다). */
function cmp246Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const small = Math.min(...three);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `${pick(rng, ["다음 세 분수 중 가장 작은 분수를 쓰시오.", "세 분수의 크기를 비교하여 가장 작은 것을 쓰시오."])}\n\n${list}`,
    expr(`\\frac{${small}}{${den}}`),
    `분모가 같은 분수는 분자가 작을수록 작습니다. 분자 중 가장 작은 수가 ${n(small)} 이므로 답은 ${expr(`\\frac{${small}}{${den}}`)} 입니다.`,
  );
}

/** 2단 — 문장: 셋 중 가장 많이 먹은 사람(답이 이름이라 1-6-4 의 둘 비교와 지면에서 갈린다). */
function cmp246Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const kids = pick(rng, KID_TRIOS);
  const top = three.indexOf(Math.max(...three));
  const food = pick(rng, ["피자", "케이크", "빵"]);
  const said = kids
    .map((k, i) => `${k}: ${expr(`\\frac{${three[i]}}{${den}}`)}`)
    .join(",  ");
  return make(
    unit,
    // ⚠️ 소재는 `pick` 으로 뽑히므로 받침이 씨앗마다 갈린다 — 「빵를」이 그대로 나간다.
    `세 사람이 똑같은 ${food}${josa(food, "을", "를")} 각각 다음만큼 먹었습니다. 가장 많이 먹은 사람은 누구인지 쓰시오.\n\n${said}`,
    kids[top]!,
    `분모가 같으므로 분자가 클수록 많이 먹은 것입니다. 분자 중 가장 큰 수가 ${n(Math.max(...three))} 이므로 ${kids[top]}입니다.`,
  );
}

/** 3단 — 두 단계: 셋을 큰 것부터 **순서대로** 늘어놓는다. */
function cmp246Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const sorted = [...three].sort((a, b) => b - a);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `${pick(rng, ["다음 세 분수를 큰 것부터 차례로 쓰시오.", "세 분수를 큰 수부터 순서대로 늘어놓으시오."])}\n\n${list}`,
    sorted.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  "),
    `분모가 같은 분수는 분자가 클수록 큽니다. 분자를 큰 것부터 늘어놓으면 ${sorted.map((v) => n(v)).join(", ")} 이므로 ${sorted.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ")} 입니다.`,
  );
}

/**
 * 4단 — 조건 둘 사이에 드는 분수 중 **가장 큰 것**.
 *
 * ⚠️ 답을 **분수**로 둔다. 2-4-4 심화가 「몇 개」라서, 여기까지 개수를 물으면 한 시험지에
 *   실렸을 때 두 문항이 같은 것을 묻는 것처럼 보인다(2026-08-23 리드 지적).
 */
function cmp246Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 6, 9);
  // 사이가 **반드시 두 칸 이상** 벌어지게 구성한다 — 붙어 있으면 답이 없다.
  const lo = intBetween(rng, 1, den - 4);
  const hi = intBetween(rng, lo + 3, den - 1);
  const ans = hi - 1;
  return make(
    unit,
    `분모가 ${n(den)} 인 분수 중에서 ${expr(`\\frac{${lo}}{${den}}`)} 보다 크고 ${expr(`\\frac{${hi}}{${den}}`)} 보다 작은 것 가운데 가장 큰 분수를 쓰시오.`,
    expr(`\\frac{${ans}}{${den}}`),
    `분모가 같으므로 분자만 견주면 됩니다. 분자는 ${n(lo)} 보다 크고 ${n(hi)} 보다 작아야 하므로 ${n(lo + 1)} 부터 ${n(ans)} 까지입니다. 그중 가장 큰 분자는 ${n(ans)} 이므로 답은 ${expr(`\\frac{${ans}}{${den}}`)} 입니다.`,
  );
}

/* ── 2-4 분수 «심화중»·«심화상» — D-113 물결 2 (2026-08-31) ────────────────────
 *
 * ── 이 대단원에서 마디를 여는 자리 ──────────────────────────────────────────
 *   ㉡ **전체를 모른다** (2-4-1·2-4-2·2-4-3) — 부분에서 전체를 되짚을 때 전체가
 *      범위로만 주어지면 마디가 안 굳고, **「똑같이 나누므로 전체가 묶음 수로
 *      나누어떨어져야 한다」**가 하나를 남긴다. 소단원 이름 그 자체다.
 *   ㉠ **나머지를 모른다** (2-4-5) — 「분자 = 분모 × 자연수부 + 나머지」에서 나머지를
 *      비우면 후보가 분모 개수만큼 생기고, **「나머지는 분모보다 작다」**(대분수의
 *      정의)가 굳힌다.
 *
 * ── 중·상을 가르는 자리 (D-115 ⑾) ──────────────────────────────────────────
 *   · **심화중** — 성질이 후보를 «끝까지 만들어 보지 않고» 걸러 낸다.
 *       2-4-1·2·3 곱셈구구 한 줄로 「범위 안 배수」 하나를 집는다.
 *       2-4-5 「분모보다 작은 수 가운데 가장 큰 수」는 분모만 보면 곧 나온다.
 *   · **심화상** — 성질이 **한 개도 못 걸러**(후보가 전부 「나머지 < 분모」를 지킨다)
 *       후보를 **하나씩 실제로 가분수로 만들어** 범위와 견주어야 한다 (2-4-5).
 *
 * ── 🔴 2-4-4·2-4-6 은 비운다 — **세어서** 정했다 (씨앗 40) ────────────────────
 *   · **2-4-4** 심화하가 「$\square$ 에 들어갈 수 있는 수는 모두 몇 개」로 **24/40**.
 *     그 위에 얹을 수 있는 것은 **열거 축의 규모 키우기**뿐인데, 그 축은 D-115 ⑵ 가
 *     **측정으로 기각**했다(열거형 심화하가 그 소단원의 «연산»보다 얕다).
 *   · **2-4-6** 심화하가 「범위 안에서 가장 큰 분수」로 **40/40**. 같은 자리다.
 *     그리고 이 소단원의 성질은 「분모가 같으면 분자만 견준다」 한 줄이라, 그 한 줄이
 *     **후보를 만드는 데도 굳히는 데도 동시에** 쓰인다(토대 17 §3 1-6 이 적은 그 모양).
 *   ⚠️ 판정기의 ④ 는 2-4-6 을 지목하지만(3건) **그것이 근거는 아니다** — 그 소단원의
 *     답이 분수라 `readRat` 이 기본·응용을 통째로 못 읽고, 연산은 8건 중 5건이 닿는다.
 *     비우는 근거는 위의 «열거 축이 이미 심화하의 것»이다.
 *
 * ⚠️ **2-4-5 는 심화중·심화상이 같은 사슬을 나눠 쓴다** — 중은 나머지를 성질이
 *    굳히고, 상은 성질이 못 굳혀 후보를 다 만들어 본다. 발문이 겹치지 않게
 *    중은 **분모**를, 상은 **가분수 자체**를 묻는다.
 *
 * 🔴 목록은 전수 열거로 만들고 반증 ⑥ 을 목록에서 건다(발문에 찍히는 수로 순방향에
 *    닿는 틀은 안 넣는다). 그래서 어떤 씨앗에서도 안 던진다.
 */

/** 2-4-1·2-4-2·2-4-3 심화중 — 전체가 «묶음 수로 나누어떨어져야 한다»가 굳힌다. */
type Frac24Mid = {
  d: number;
  L: number;
  U: number;
  T: number;
  m: number;
  k: number;
};

/**
 * 창(`L`~`U`) 안에 묶음 수의 배수가 **정확히 하나** 있는 틀만 남긴다.
 * `k` 는 뽑는 묶음 수 — 2-4-2 는 단위분수라 늘 $1$ 이다.
 */
function frac24MidPool(kFrom: number, coprime: boolean): Frac24Mid[] {
  const gcd24 = (a: number, b: number): number =>
    b === 0 ? a : gcd24(b, a % b);
  const out: Frac24Mid[] = [];
  for (let d = 3; d <= 8; d += 1)
    for (let m = 3; m <= 12; m += 1) {
      const T = d * m;
      if (T < 20 || T > 96) continue;
      for (let L = 10; L < T; L += 5)
        for (let U = L + 5; U <= 100; U += 5) {
          if (U <= T || U - L > 20) continue;
          let cnt = 0;
          for (let v = L + 1; v < U; v += 1) if (v % d === 0) cnt += 1;
          if (cnt !== 1) continue;
          const kTo = kFrom === 1 ? 1 : d - 1;
          for (let k = kFrom; k <= kTo; k += 1) {
            // ⚠️ **발문에 실리는 분수는 기약**이다(2-4-2·3). 답인 분수는 안 거른다
            //    (2-4-1) — `frac32` 머리말의 그 비대칭을 여기서도 지킨다.
            if (coprime && gcd24(k, d) !== 1) continue;
            // 2-4-1 은 답이 분수, 2-4-2·3 은 답이 개수라 반증 ⑥ 의 답이 다르다.
            const ansFrac = rat(k, d);
            const ansCount = rat(k * m);
            const nums = [rat(L), rat(U), rat(d), rat(k), rat(k, d)];
            if (forwardReachable(nums, ansFrac)) continue;
            if (forwardReachable(nums, ansCount)) continue;
            // 답이 지면에 그대로 서면 되짚기가 필요 없다.
            if (answerPrintedOnPage(nums, ansCount)) continue;
            out.push({ d, L, U, T, m, k });
          }
        }
    }
  return out;
}

/** 2-4-5 심화중 — 나머지가 「분모보다 작은 수 가운데 가장 큰 수」. */
type Mixed245Mid = { d: number; w: number; N: number };

function mixed245MidPool(): Mixed245Mid[] {
  const out: Mixed245Mid[] = [];
  for (let d = 3; d <= 9; d += 1)
    for (let w = 2; w <= 8; w += 1) {
      // 답(분모)이 발문의 자연수 부분과 같으면 지면에 답이 서 버린다.
      if (d === w) continue;
      const N = (w + 1) * d - 1;
      if (N < 10 || N > 99) continue;
      if (forwardReachable([rat(N), rat(w)], rat(d))) continue;
      out.push({ d, w, N });
    }
  return out;
}

/** 2-4-5 심화상 — 자연수 부분과 분자가 같은 가분수를 **다 만들어** 범위와 견준다. */
type Mixed245High = {
  d: number;
  L: number;
  U: number;
  cand: number[];
  ans: number;
  r: number;
};

function mixed245HighPool(): Mixed245High[] {
  const out: Mixed245High[] = [];
  const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));
  for (let d = 4; d <= 8; d += 1) {
    const cand: number[] = [];
    for (let r = 1; r <= d - 1; r += 1) cand.push(r * (d + 1));
    for (let L = 5; L <= 90; L += 5)
      for (let U = L + 5; U <= 95; U += 5) {
        if (U - L > 15) continue;
        const hits = cand.filter((v) => v > L && v < U);
        if (hits.length !== 1) continue;
        const ans = hits[0]!;
        const r = ans / (d + 1);
        // 답인 분수는 기약으로 둔다 — 이 소단원의 표준(`coprimeNums`)과 같은 태도다.
        if (gcd2(r, d) !== 1) continue;
        if (r < 2) continue;
        if (forwardReachable([rat(d), rat(L), rat(U)], rat(ans, d))) continue;
        out.push({ d, L, U, cand, ans, r });
      }
  }
  return out;
}

// 세 소단원이 같은 되짚기를 쓰지만 **분자 약속이 다르다** — 목록을 하나로 두면
// 2-4-3 의 발문 분수가 약분되는 틀이 섮인다(기존 시험이 그것을 물었다).
const FRAC24_MID_CACHE = new Map<string, Frac24Mid[]>();

function frac24MidOfPool(kFrom: number, coprime: boolean): Frac24Mid[] {
  const key = `${kFrom}-${coprime}`;
  const hit = FRAC24_MID_CACHE.get(key);
  if (hit) return hit;
  const built = frac24MidPool(kFrom, coprime);
  FRAC24_MID_CACHE.set(key, built);
  return built;
}
let MIXED245_MID: Mixed245Mid[] | null = null;
let MIXED245_HIGH: Mixed245High[] | null = null;

/** 5단 · 2-4-1 — 전체를 되짚어 「꺼낸 것이 전체의 얼마인가」를 분수로 답한다. */
function part241Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  // 2-4-1 은 분수가 **답**이라 기약을 안 거른다(`frac32` 머리말).
  const f = pick(rng, frac24MidOfPool(2, false));
  const stuff = pick(rng, FRAC24_STUFF);
  const P = f.k * f.m;
  const stem = pick(rng, [
    `${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(f.d)}묶음으로 나누고 그중 몇 묶음을 꺼냈더니 ${n(P)}개였습니다. ${stuff} 수가 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적을 때, 꺼낸 것은 전체의 얼마인지 분수로 나타내시오.`,
    `${stuff} 수는 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적습니다. 이 ${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(f.d)}묶음으로 나누었더니 남는 것이 없었고, 그중 몇 묶음이 ${n(P)}개였습니다. ${n(P)}개는 전체의 얼마인지 분수로 쓰시오.`,
    `${n(f.L)}개보다 많고 ${n(f.U)}개보다 적은 ${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없습니다. 이 가운데 ${n(P)}개는 전체의 얼마인지 분수로 나타내시오.`,
    `${stuff} 수가 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적습니다. 똑같이 ${n(f.d)}묶음으로 나누어 담았더니 남는 ${stuff}${josa(stuff, "이", "가")} 없었습니다. ${n(P)}개는 전체의 얼마인지 분수로 쓰시오.`,
  ]);
  return makeDeep(unit, stem, expr(`\\frac{${f.k}}{${f.d}}`), [
    `똑같이 ${n(f.d)}묶음으로 나누므로 전체는 ${n(f.d)}묶음으로 나누어떨어져야 합니다. ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 수 가운데 그런 수는 ${expr(`${f.d}\\times${f.m}=${f.T}`)} 에서 ${n(f.T)} 뿐입니다.`,
    `한 묶음은 ${expr(`${f.T}\\div${f.d}=${f.m}`)} 에서 ${n(f.m)}개이므로, ${n(P)}개는 ${expr(`${f.m}\\times${f.k}=${P}`)} 에서 ${n(f.k)}묶음입니다.`,
    `전체 ${n(f.d)}묶음 가운데 ${n(f.k)}묶음이므로 ${expr(`\\frac{${f.k}}{${f.d}}`)} 입니다.`,
  ]);
}

/* ── 2-4-1 «심화상» — D-113 물결 4 (2026-09-01) ──────────────────────────────
 *
 * 🔴 **물결 2 가 §7 에 스스로 열어 둔 물음을 닫는다.** 그 회차는 2-4-1·2-4-2·2-4-3 의
 * 심화상을 비우며 「이 하나는 **«없다»가 아니라 «내가 못 찾았다»**에 가깝다 — 전수로
 * 반증하지 않았다」고 적었다. 전수로 세었다 — **있다.**
 *
 * ── 무엇이 중과 상을 가르나 ────────────────────────────────────────────────
 * 물결 2 의 심화중은 창 안에 «묶음 수의 배수»가 **하나뿐**이라, 이 소단원의 성질
 * (「똑같이 나누므로 전체가 묶음 수로 나누어떨어져야 한다」)이 **곧바로** 굳힌다.
 * 창을 넓혀 배수가 **여럿**이 되면 그 성질은 **한 후보도 못 자른다.** 그때
 * 「그중 몇 묶음이 $P$ 개」를 같이 주면, 후보마다 **한 묶음을 실제로 구해**
 * $P$ 가 온전한 묶음 수가 되는지 견주어야 하나가 남는다 — 그것이 «상»이다(D-115 ⑾).
 *
 * ⚠️ **2-4-2·2-4-3 에는 못 쓴다 — 구성상 불가다.** 그쪽은 분수를 **발문이 주고
 *    개수를 답**하므로, 후보 전체 수가 여럿이면 답도 여럿이 된다. 그 둘은 그대로 비운다.
 *
 * 전수 실측: 자리 **1,581** · 서로 다른 (분모, 분자) **21** ·
 *            서로 다른 (분모, 분자, 준 개수) **187** · 후보 수 2~5개.
 */
type Frac241High = {
  d: number;
  L: number;
  U: number;
  /** 창 안의 «묶음 수의 배수» 전부 — 해설이 이대로 늘어놓는다 */
  cands: number[];
  T: number;
  m: number;
  k: number;
  /** 지면에 주는 개수 = $k \times m$ */
  P: number;
};

/**
 * 🔴 **답이 분수라 반증 ⑥ 을 «유리수까지» 본다.** 공용 `forwardReachable` 은 지면의
 *    정수를 엮어 정수를 만들므로 **진분수인 답에는 구조적으로 못 닿는다** — 그 0 은
 *    «깨끗»이 아니라 «못 셈»이다. 그래서 「지면 두 수를 분수로 읽는 길」($P/U$ 같은)을
 *    여기서 따로 본다.
 */
function frac241FracOneStep(
  nums: readonly number[],
  kn: number,
  kd: number,
): boolean {
  const eq = (a: number, b: number) => a * kd === kn * b;
  for (const a of nums)
    for (const b of nums) {
      if (a === b) continue;
      if (eq(a + b, 1) || eq(a - b, 1)) return true;
      if (a * b !== a && a * b !== b && eq(a * b, 1)) return true;
      if (b !== 0 && eq(a, b)) return true;
    }
  return nums.some((v) => eq(v, 1));
}

function frac241HighPool(): Frac241High[] {
  const out: Frac241High[] = [];
  for (let d = 3; d <= 8; d += 1)
    for (let L = 10; L <= 90; L += 5)
      for (const w of [10, 15, 20, 25]) {
        const U = L + w;
        if (U > 100) continue;
        const cands: number[] = [];
        for (let t = L + 1; t < U; t += 1)
          if (t % d === 0 && t / d >= 3 && t / d <= 12) cands.push(t);
        // 하나면 물결 2 의 «심화중» 이다(성질이 곧바로 굳힌다).
        // 여섯 이상이면 해설이 후보를 다 적을 수 없다.
        if (cands.length < 2 || cands.length > 5) continue;
        if (!cands.every((t) => t >= 20 && t <= 96)) continue;
        for (let k = 2; k < d; k += 1)
          for (const T of cands) {
            const m = T / d;
            const P = k * m;
            // 🔴 **다른 후보에서는 «아예 나누어떨어지지 않아야» 한다.**
            //    「$P$ 개가 몇 묶음이 되기는 하는데 그 수가 전체 묶음 수 이상」인 자리를
            //    남겨 두면, 해설의 「딱 떨어지는 것은 … 뿐입니다」가 **글자 그대로는
            //    거짓**이 된다(실제로 첫 판이 그런 문항을 냈다 — $30$개·한 묶음 $5$개는
            //    $6$묶음이라 «전체»가 되어 버려 버려지는데, 해설은 「안 떨어진다」로 읽힌다).
            //    전수로 재니 이 울타리의 값은 1,581 → **1,492자리**뿐이다(서로 다른
            //    (분모,분자,준 개수) 187 은 그대로) — 값싸게 해설을 참으로 만든다.
            if (!cands.every((t) => t === T || P % (t / d) !== 0)) continue;
            if (frac241FracOneStep([L, U, d, P], k, d)) continue;
            out.push({ d, L, U, cands, T, m, k, P });
          }
      }
  if (out.length === 0) throw new Error("2-4-1 심화상 풀이 비었습니다");
  return out;
}

let FRAC241_HIGH: Frac241High[] | null = null;

/** 6단 · 2-4-1 — 성질이 후보를 하나도 못 자른다. 후보마다 한 묶음을 만들어 견준다. */
function part241High(unit: UnitSeed, rng: Rng): ElemProblem {
  FRAC241_HIGH ??= frac241HighPool();
  const f = pick(rng, FRAC241_HIGH);
  const stuff = pick(rng, FRAC24_STUFF);
  const 을를 = josa(stuff, "을", "를");
  const 이가 = josa(stuff, "이", "가");
  const stem = pick(rng, [
    `${stuff}${이가} ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적습니다. 이 ${stuff}${을를} 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없고, 그중 몇 묶음이 ${n(f.P)}개입니다. ${n(f.P)}개는 전체의 얼마인지 분수로 나타내시오.`,
    `${n(f.L)}개보다 많고 ${n(f.U)}개보다 적은 ${stuff}${을를} 똑같이 ${n(f.d)}묶음으로 나누었더니 남는 것이 없었습니다. 그 가운데 몇 묶음이 ${n(f.P)}개일 때, ${n(f.P)}개는 전체의 얼마인지 분수로 쓰시오.`,
    `${stuff} 수는 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적습니다. 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없으며, 그중 몇 묶음을 세었더니 ${n(f.P)}개였습니다. ${n(f.P)}개는 전체의 얼마인지 분수로 나타내시오.`,
    `${stuff}${을를} 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없습니다. ${stuff} 수가 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적고 그중 몇 묶음이 ${n(f.P)}개일 때, ${n(f.P)}개는 전체의 얼마인지 분수로 쓰시오.`,
  ]);
  // **후보마다 한 묶음을 실제로 만든다** — 이 걸음이 이 갈래를 상으로 만든다.
  const tries = f.cands
    .map((t) => expr(`${t}\\div${f.d}=${t / f.d}`))
    .join(", ");
  return makeDeep(unit, stem, expr(`\\frac{${f.k}}{${f.d}}`), [
    `똑같이 ${n(f.d)}묶음으로 나누므로 전체는 ${n(f.d)}묶음으로 나누어떨어져야 합니다. ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 수 가운데 그런 수는 ${list22(f.cands)} 입니다.`,
    `후보마다 한 묶음이 몇 개인지 구해 봅니다. ${tries} 입니다.`,
    `${n(f.P)}개가 묶음으로 딱 떨어지는 것은 한 묶음이 ${n(f.m)}개일 때뿐이므로 전체는 ${n(f.T)}개입니다. ${expr(`${f.P}\\div${f.m}=${f.k}`)} 에서 ${n(f.k)}묶음이므로 전체 ${n(f.d)}묶음 가운데 ${expr(`\\frac{${f.k}}{${f.d}}`)} 입니다.`,
  ]);
}

/** 5단 · 2-4-2·2-4-3 — 같은 되짚기, 답은 «몇 개». `unitOnly` 는 단위분수 소단원. */
function frac24MidOf(unitOnly: boolean) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    // 분수가 **발문에 주어지는 값**이므로 기약이어야 한다.
    const f = pick(rng, frac24MidOfPool(unitOnly ? 1 : 2, true));
    const stuff = pick(rng, FRAC24_STUFF);
    const fr = expr(`\\frac{${f.k}}{${f.d}}`);
    const ans = f.k * f.m;
    const stem = pick(rng, [
      `${stuff}${josa(stuff, "이", "가")} ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적습니다. 이 ${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없습니다. 전체의 ${fr} 만큼은 몇 개인지 쓰시오.`,
      `${n(f.L)}개보다 많고 ${n(f.U)}개보다 적은 ${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(f.d)}묶음으로 나누었더니 남는 것이 없었습니다. 전체의 ${fr} 만큼은 몇 개입니까?`,
      `${stuff} 수는 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적으며, 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없습니다. 전체의 ${fr} 만큼은 몇 개인지 구하시오.`,
      `${stuff}${josa(stuff, "을", "를")} 똑같이 ${n(f.d)}묶음으로 나누면 남는 것이 없습니다. ${stuff} 수가 ${n(f.L)}개보다 많고 ${n(f.U)}개보다 적을 때, 전체의 ${fr} 만큼은 몇 개인지 쓰시오.`,
    ]);
    return makeDeep(unit, stem, n(ans), [
      `똑같이 ${n(f.d)}묶음으로 나누므로 전체는 ${n(f.d)}묶음으로 나누어떨어져야 합니다. ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 수 가운데 그런 수는 ${expr(`${f.d}\\times${f.m}=${f.T}`)} 에서 ${n(f.T)} 뿐입니다.`,
      `한 묶음은 ${expr(`${f.T}\\div${f.d}=${f.m}`)} 에서 ${n(f.m)}개입니다.`,
      unitOnly
        ? `${fr} 만큼은 한 묶음이므로 ${n(ans)}개입니다.`
        : `${fr} 만큼은 ${n(f.k)}묶음이므로 ${expr(`${f.m}\\times${f.k}=${ans}`)} 에서 ${n(ans)}개입니다.`,
    ]);
  };
}

/** 5단 · 2-4-5 — 나머지를 모른다 → 「분모보다 작은 수 가운데 가장 큰 수」가 굳힌다. */
function mixed245Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  MIXED245_MID ??= mixed245MidPool();
  const f = pick(rng, MIXED245_MID);
  const box = expr(`\\frac{${f.N}}{\\square}`);
  const sq = expr(`\\square`);
  const stem = pick(rng, [
    `어떤 가분수를 대분수로 나타냈더니 자연수 부분이 ${n(f.w)} 이고, 분수 부분의 분자는 분모보다 작은 수 가운데 가장 큰 수였습니다. 이 가분수가 ${box} 일 때 ${sq} 에 알맞은 수를 구하시오.`,
    `분자가 ${n(f.N)} 인 가분수가 있습니다. 대분수로 나타냈더니 자연수 부분이 ${n(f.w)} 이고 분수 부분의 분자는 분모보다 작은 수 가운데 가장 큽니다. 이 가분수는 ${box} 입니다. 분모를 구하시오.`,
    `어떤 대분수의 자연수 부분은 ${n(f.w)} 이고, 분수 부분의 분자는 분모보다 작은 수 가운데 가장 큰 수입니다. 이 대분수를 가분수로 고치면 ${box} 입니다. ${sq} 에 알맞은 수를 쓰시오.`,
    `대분수로 나타내면 자연수 부분이 ${n(f.w)} 이고 분수 부분의 분자가 분모보다 ${n(1)} 작은 가분수가 ${box} 입니다. ${sq} 에 알맞은 수를 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(f.d), [
    `대분수의 분수 부분은 진분수이므로 분자가 분모보다 작습니다. 그 가운데 가장 큰 수는 분모보다 ${n(1)} 작은 수입니다.`,
    `그러면 분자에 ${n(1)} 만 더해도 자연수가 되고, 그 자연수는 ${n(f.w + 1)} 입니다. 곧 ${expr(`${f.N}+1=${f.N + 1}`)} 이고, 이 수는 분모를 ${n(f.w + 1)}번 더한 수입니다.`,
    `분모는 ${expr(`${f.N + 1}\\div${f.w + 1}=${f.d}`)} 에서 ${n(f.d)} 입니다.`,
  ]);
}

/** 6단 · 2-4-5 — 성질이 아무것도 못 잘라 내어 **후보를 다 만들어** 견준다. */
function mixed245High(unit: UnitSeed, rng: Rng): ElemProblem {
  MIXED245_HIGH ??= mixed245HighPool();
  const f = pick(rng, MIXED245_HIGH);
  const shape = expr(`\\square\\frac{\\square}{${f.d}}`);
  const box = expr(`\\frac{\\square}{${f.d}}`);
  const stem = pick(rng, [
    `분모가 ${n(f.d)} 인 가분수를 대분수로 나타냈더니 ${shape} 처럼 자연수 부분과 분수 부분의 분자가 같았습니다. 이 가분수의 분자가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작을 때, 이 가분수를 구하시오.`,
    `대분수로 나타내면 자연수 부분과 분수 부분의 분자가 같아지는 가분수는 ${box} 입니다. 분자가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작을 때 이 가분수를 쓰시오.`,
    `어떤 가분수는 ${box} 이고, 대분수로 고치면 ${shape} 처럼 자연수 부분과 분수 부분의 분자가 같습니다. 분자가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작을 때 이 가분수를 구하시오.`,
    `분모가 ${n(f.d)} 인 어떤 가분수는 ${box} 입니다. 대분수로 고쳤더니 자연수 부분과 분수 부분의 분자가 같았고, 분자는 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작습니다. 이 가분수를 쓰시오.`,
  ]);
  const half = Math.ceil(f.cand.length / 2);
  const line = (from: number, to: number): string =>
    expr(
      f.cand
        .slice(from, to)
        .map((v, i) => {
          const r = from + i + 1;
          return `${r}\\frac{${r}}{${f.d}}=\\frac{${v}}{${f.d}}`;
        })
        .join(",\\ "),
    );
  return makeDeep(unit, stem, expr(`\\frac{${f.ans}}{${f.d}}`), [
    `자연수 부분과 분수 부분의 분자가 같은 대분수를 작은 것부터 만들어 가분수로 고쳐 봅니다.`,
    `${line(0, half)}, ${line(half, f.cand.length)} 입니다.`,
    `이 가운데 분자가 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 것은 ${expr(`\\frac{${f.ans}}{${f.d}}`)} 뿐입니다.`,
  ]);
}

// ── 2-5 들이와 무게 (D-72 확대) ──────────────────────────────────────────
//
// 여섯 소단원이 **셋 × 둘**이다 — 「비교」·「단위」·「합과 차」를 들이(L·mL)와
// 무게(kg·g)가 각각 한 벌씩 쓴다. 단위 경계가 1000 으로 같고 하는 일이 같으므로,
// 1-5 길이가 `LenCfg` 하나를 나눠 쓴 것처럼 **공장 셋을 여섯 소단원이 나눠 쓴다.**
// 한쪽만 고쳐 두 소단원이 조용히 갈라지는 일이 구조적으로 없어진다.
//
// ⚠️ **단위 뒤 조사는 «읽는 소리»로 갈린다 — 여기서는 `josa()` 를 쓸 수 없다.**
//    `josa()` 는 **글자**의 받침을 보는데, `L`·`kg` 은 글자가 소리가 아니다.
//    리터·밀리리터는 받침이 없고(「리터는」·「리터를」), 킬로그램·그램은 있다
//    (「그램은」·「그램을」). 그래서 cfg 에 **한 벌씩** 적어 둔다 — 큰 단위와 작은
//    단위가 같은 소리로 끝나므로 한 벌이면 족하다.
//    (지면에 나간 이 자리를 전량 재는 것은 `scripts/qa/probe-elem-unit-josa.ts` 다.)
//
// ⚠️ **세 갈래가 서로를 흉내 내지 않게 «답의 모양»을 갈라 두었다:**
//      비교    → 기호(가·나·다) 또는 부등호
//      단위    → 작은 단위 하나로 (몇 mL · 몇 g)
//      합과 차 → 몇 L 몇 mL (섞은 꼴)
//    이 구분이 없으면 「들이 비교하기인데 단위 변환만 하고 있다」가 **지면에서
//    안 보인다.** 조건 판정기가 이 모양을 본다(2026-08-24).

type CapCfg = {
  big: string;
  small: string;
  /** 「들이」·「무게」 */
  word: string;
  /**
   * 단위를 **읽은 소리** 뒤 조사. 글자로는 못 정한다 — 위 주석 참조.
   *
   * ⚠️ **`word` 뒤에는 이것을 쓰지 마라.** 이 넷은 `L`·`kg` 의 소리를 따르는 값이라
   *    「들이」·「무게」 같은 **한글 낱말**에 대면 틀린다 — 실제로 첫 판이
   *    「두 무게**을** 비교하여」·「세 봉지의 무게**이**」를 지면에 냈다(들이 쪽은
   *    우연히 같아서 안 드러났다). 한글 낱말은 `josa()` 로 **계산**한다.
   */
  jNun: string;
  jGa: string;
  jReul: string;
  jRo: string;
  /** 관형형 「많이 담기는」·「무거운」 */
  moreAdj: string;
  /** 연결형 「많이 담기고」·「무겁고」 */
  moreConn: string;
  /** 종결형 「많이 담깁니다」·「무겁습니다」 */
  moreVerb: string;
  /** 관형형 「적게 담기는」·「가벼운」 */
  lessAdj: string;
  /** 종결형 「적게 담깁니다」·「가볍습니다」 */
  lessVerb: string;
  /** 담는 그릇 · 무게를 다는 것 */
  vessels: readonly string[];
  /** 담기는 것 */
  stuff: readonly string[];
};

const CAP_L: CapCfg = {
  big: "L",
  small: "mL",
  word: "들이",
  jNun: "는",
  jGa: "가",
  jReul: "를",
  jRo: "로",
  moreAdj: "많이 담기는",
  moreConn: "많이 담기고",
  moreVerb: "많이 담깁니다",
  lessAdj: "적게 담기는",
  lessVerb: "적게 담깁니다",
  vessels: [
    "물통",
    "주전자",
    "냄비",
    "항아리",
    "물병",
    "양동이",
    "수조",
    "물뿌리개",
  ],
  stuff: ["물", "우유", "주스", "보리차", "식용유", "간장", "매실청", "포도즙"],
};

const CAP_KG: CapCfg = {
  big: "kg",
  small: "g",
  word: "무게",
  jNun: "은",
  jGa: "이",
  jReul: "을",
  jRo: "으로",
  moreAdj: "무거운",
  moreConn: "무겁고",
  moreVerb: "무겁습니다",
  lessAdj: "가벼운",
  lessVerb: "가볍습니다",
  vessels: ["상자", "가방", "바구니", "자루", "봉지", "수레", "보따리", "들통"],
  stuff: ["감자", "고구마", "밀가루", "설탕", "사과", "쌀", "콩", "귤"],
};

/** `$2\,\mathrm{L}\ 300\,\mathrm{mL}$` — cfg 에 맞춘 섞은 꼴. */
const mixedCap = (cfg: CapCfg, b: number, s: number) =>
  mixedUnit(b, s, cfg.big, cfg.small);

/** 「가」·「나」·「다」 — 그릇에 붙이는 이름표. */
const CAP_LABELS = ["가", "나", "다"] as const;

/** 셋을 늘어놓는 순열 여섯. 무작위 비교자로 `sort` 하지 않기 위한 것 — 아래 주석 참조. */
const CAP_PERMS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

/* ── 2-5-1 들이 비교하기 · 2-5-4 무게 비교하기 ── */

/**
 * 1단 — 섞은 꼴과 작은 단위 하나를 견주어 부등호를 답한다.
 *
 * 왼쪽만 섞은 꼴로 둔다 — 그래야 **단위를 맞추는 일**이 반드시 한 번 든다.
 * 양쪽 다 섞은 꼴이면 큰 단위만 보고 답이 나와 비교가 알맹이를 잃는다.
 */
function capCmpCalcOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    const left = b * 1000 + s;
    const gap =
      intBetween(rng, 20, 400) * (intBetween(rng, 0, 1) === 1 ? 1 : -1);
    const right = left + gap;
    const sign = left > right ? ">" : "<";
    return make(
      unit,
      `두 ${cfg.word}${josa(cfg.word, "을", "를")} 비교하여 $\\square$ 안에 $>$ 와 $<$ 중 알맞은 것을 쓰시오.\n\n${mixedCap(cfg, b, s)} $\\square$ ${unitNum(right, cfg.small)}`,
      expr(sign),
      `${mixedCap(cfg, b, s)} ${cfg.jNun} ${unitNum(left, cfg.small)} 입니다. ${expr(`${left}${sign}${right}`)} 이므로 $\\square$ 안에는 ${expr(sign)} ${josa(sign, "이", "가")} 들어갑니다.`,
    );
  };
}

/** 2단 — 두 그릇을 문장으로 견준다. 묻는 쪽(큰·작은)을 오간다. */
function capCmpWordOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    const t1 = b * 1000 + s;
    const gap =
      intBetween(rng, 30, 400) * (intBetween(rng, 0, 1) === 1 ? 1 : -1);
    const t2 = t1 + gap;
    const askMore = intBetween(rng, 0, 1) === 1;
    const bigger = t1 > t2 ? "가" : "나";
    const answer = askMore ? bigger : bigger === "가" ? "나" : "가";
    const vessel = pick(rng, cfg.vessels);
    const vGa = josa(vessel, "이", "가");
    return make(
      unit,
      `가 ${vessel}의 ${cfg.word}는 ${mixedCap(cfg, b, s)}, 나 ${vessel}의 ${cfg.word}는 ${unitNum(t2, cfg.small)} 입니다. 더 ${askMore ? cfg.moreAdj : cfg.lessAdj} ${vessel}의 기호를 쓰시오.`,
      answer,
      `가 ${vessel}의 ${cfg.word}는 ${mixedCap(cfg, b, s)}, 곧 ${unitNum(t1, cfg.small)} 입니다. ${expr(`${Math.max(t1, t2)}>${Math.min(t1, t2)}`)} 이므로 ${bigger} ${vessel}${vGa} 더 ${cfg.moreVerb}. 따라서 답은 ${answer} ${vessel} 입니다.`,
    );
  };
}

/** 3단 — 셋을 견주어 차례로 늘어놓는다(단위 맞추기 세 번 + 줄 세우기). */
function capCmpApplyOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const base = intBetween(rng, 1, 4) * 1000 + intBetween(rng, 100, 800);
    // 셋이 서로 다르도록 벌려 둔다 — 같으면 「차례로」의 답이 하나로 안 정해진다.
    const d1 = intBetween(rng, 40, 300);
    const d2 = d1 + intBetween(rng, 40, 300);
    const totals = [base, base + d1, base + d2];
    // 섞은 꼴과 작은 단위 하나를 번갈아 보이게 자리를 섞는다.
    //
    // ⚠️ `sort` 에 무작위 비교자를 넣지 않는다 — 그건 «섞기»가 아니라 **정렬 규약을
    //    어기는 것**이라 엔진마다 결과가 다를 수 있다. 순열을 손에 쥐고 하나를 고른다.
    const order = pick(rng, CAP_PERMS);
    const shown = order.map((i) => totals[i]!);
    const vessel = pick(rng, cfg.vessels);
    const lines = shown.map((t, i) =>
      i % 2 === 0
        ? `${CAP_LABELS[i]} ${vessel}: ${mixedCap(cfg, Math.floor(t / 1000), t % 1000)}`
        : `${CAP_LABELS[i]} ${vessel}: ${unitNum(t, cfg.small)}`,
    );
    const desc = shown
      .map((t, i) => ({ label: CAP_LABELS[i]!, t }))
      .sort((x, y) => y.t - x.t);
    return make(
      unit,
      `세 ${vessel}의 ${cfg.word}${josa(cfg.word, "이", "가")} 다음과 같습니다. ${cfg.moreAdj} ${vessel}부터 차례로 기호를 쓰시오.\n\n${lines.join("\n")}`,
      desc.map((d) => d.label).join(", "),
      `$1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 모두 ${cfg.small} ${cfg.jRo} 고쳐 견줍니다. ${shown.map((t, i) => `${CAP_LABELS[i]} ${vessel}${josa(vessel, "은", "는")} ${unitNum(t, cfg.small)}`).join(", ")} 입니다. ${expr(desc.map((d) => d.t).join(">"))} 이므로 ${desc.map((d) => d.label).join(", ")} 입니다.`,
    );
  };
}

/**
 * 4단 — 조건 **둘** 사이에 드는 값 가운데 가장 큰 수(역산).
 *
 * ⚠️ $\square$ 를 **작은 단위 쪽에** 둔다. 섞은 꼴 쪽에 두면 학생이 큰 단위만 보고
 *    답을 쓸 수 있어 「비교」라는 소단원 조건이 지면에서 사라진다.
 */
function capCmpDeepOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const loB = intBetween(rng, 1, 4);
    const loS = intBetween(rng, 100, 700);
    const lo = loB * 1000 + loS;
    const raw = lo + intBetween(rng, 120, 800);
    // 작은 자리가 $0$ 이면 지면에 `$3\,\mathrm{L}\ 0\,\mathrm{mL}$` 가 나간다 — 한 칸 민다.
    const hi = raw % 1000 === 0 ? raw + 50 : raw;
    const hiB = Math.floor(hi / 1000);
    const hiS = hi % 1000;
    const answer = hi - 1;
    const vessel = pick(rng, cfg.vessels);
    const vNun = josa(vessel, "은", "는");
    return make(
      unit,
      `가 ${vessel}의 ${cfg.word}는 $\\square\\,\\mathrm{${cfg.small}}$ 입니다. 가 ${vessel}${vNun} 나 ${vessel}보다 ${cfg.moreConn}, 다 ${vessel}보다 ${cfg.lessVerb}. 나 ${vessel}의 ${cfg.word}는 ${mixedCap(cfg, loB, loS)}, 다 ${vessel}의 ${cfg.word}는 ${mixedCap(cfg, hiB, hiS)} 입니다. $\\square$ 안에 들어갈 수 있는 수 중 가장 큰 수를 쓰시오.`,
      n(answer),
      `나 ${vessel}${vNun} ${unitNum(lo, cfg.small)}, 다 ${vessel}${vNun} ${unitNum(hi, cfg.small)} 입니다. $\\square$ 안의 수는 ${n(lo)} 보다 크고 ${n(hi)} 보다 작아야 하므로 ${n(lo + 1)} 부터 ${n(answer)} 까지입니다. 그중 가장 큰 수는 ${n(answer)} 입니다.`,
    );
  };
}

/* ── 2-5-2 들이의 단위 · 2-5-5 무게의 단위 ── */

/**
 * 1단 — 단위 바꾸기 식. 네 꼴을 돌아가며 낸다.
 *
 * ⚠️ 식은 KaTeX 한 덩어리라 변형 공간 정규화에서 지워진다 — 1-5 와 같은 이유로
 *    **지시문을 꼴마다 갈라** 둔다(안 그러면 씨앗을 바꿔도 지면이 같아 보인다).
 */
function capUnitCalcOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const b = intBetween(rng, 2, 9);
    const s = intBetween(rng, 1, 9) * 100;
    const total = b * 1000 + s;
    const form = intBetween(rng, 0, 3);
    const prompt = pick(
      rng,
      [
        [
          `$\\square$ 안에 알맞은 수를 쓰시오.`,
          `큰 단위를 작은 단위로 바꾸어 빈칸을 채우시오.`,
        ],
        [
          `빈칸에 알맞은 수를 구하시오.`,
          `몇 ${cfg.big} 몇 ${cfg.small}인 ${cfg.word}${josa(cfg.word, "을", "를")} ${cfg.small} 단위로 바꾸어 $\\square$ 에 쓰시오.`,
        ],
        [
          `$\\square$ 에 알맞은 수를 구하시오.`,
          `작은 단위를 큰 단위로 바꾸어 빈칸을 채우시오.`,
        ],
        [`빈칸에 알맞은 수를 쓰시오.`, `$\\square$ 에 들어갈 수를 구하시오.`],
      ][form]!,
    );
    if (form === 0) {
      return make(
        unit,
        `${prompt}\n\n$${b}\\,\\mathrm{${cfg.big}}=\\square\\,\\mathrm{${cfg.small}}$`,
        n(b * 1000),
        `$1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`1000\\times${b}=${b * 1000}`)} 입니다.`,
      );
    }
    if (form === 1) {
      return make(
        unit,
        `${prompt}\n\n$${b}\\,\\mathrm{${cfg.big}}\\ ${s}\\,\\mathrm{${cfg.small}}=\\square\\,\\mathrm{${cfg.small}}$`,
        n(total),
        `$1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`1000\\times${b}=${b * 1000}`)} 이고, ${expr(`${b * 1000}+${s}=${total}`)} 입니다.`,
      );
    }
    if (form === 2) {
      return make(
        unit,
        `${prompt}\n\n$${b * 1000}\\,\\mathrm{${cfg.small}}=\\square\\,\\mathrm{${cfg.big}}$`,
        n(b),
        `$1000\\,\\mathrm{${cfg.small}}=1\\,\\mathrm{${cfg.big}}$ 이므로 ${unitNum(b * 1000, cfg.small)} ${cfg.jNun} ${unitNum(b, cfg.big)} 입니다.`,
      );
    }
    return make(
      unit,
      `${prompt}\n\n$${total}\\,\\mathrm{${cfg.small}}=${b}\\,\\mathrm{${cfg.big}}\\ \\square\\,\\mathrm{${cfg.small}}$`,
      n(s),
      `${unitNum(b, cfg.big)} ${cfg.jNun} ${unitNum(b * 1000, cfg.small)} 이므로 ${expr(`${total}-${b * 1000}=${s}`)} 입니다.`,
    );
  };
}

/** 2단 — 문장으로 단위를 바꾼다. 방향(큰→작은·작은→큰)을 오간다. */
function capUnitWordOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const b = intBetween(rng, 2, 9);
    const s = intBetween(rng, 1, 9) * 100;
    const total = b * 1000 + s;
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${vessel}에 담긴 ${thing}의 ${cfg.word}는 ${mixedCap(cfg, b, s)} 입니다. 이 ${cfg.word}는 몇 ${cfg.small}인지 쓰시오.`,
        n(total),
        `$1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`1000\\times${b}=${b * 1000}`)} 이고, ${expr(`${b * 1000}+${s}=${total}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `${vessel}에 담긴 ${thing}의 ${cfg.word}는 ${unitNum(total, cfg.small)} 입니다. 이 ${cfg.word}는 몇 ${cfg.big} 몇 ${cfg.small}인지 쓰시오.`,
      mixedCap(cfg, b, s),
      `$1000\\,\\mathrm{${cfg.small}}=1\\,\\mathrm{${cfg.big}}$ 이므로 ${unitNum(total, cfg.small)} ${cfg.jNun} ${mixedCap(cfg, b, s)} 입니다.`,
    );
  };
}

/** 3단 — 같은 것 여러 개를 모아 작은 단위 하나로(변환 + 여러 번 더하기). */
function capUnitApplyOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    // ⚠️ `b * cnt` 를 **한 자리**로 묶어 둔다 — 해설이 $1000\times(b\,cnt)$ 를 쓰는데,
    //    두 자리가 되면 초3 이 아직 안 배운 곱셈이 해설에 나온다.
    const b = intBetween(rng, 1, 2);
    const s = intBetween(rng, 1, 9) * 100;
    const each = b * 1000 + s;
    const cnt = intBetween(rng, 2, 4);
    const total = each * cnt;
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const thingNun = josa(thing, "은", "는");
    const thingEul = josa(thing, "을", "를");
    return make(
      unit,
      `한 ${vessel}에 ${thing}${thingEul} ${mixedCap(cfg, b, s)} 씩 담았습니다. 이런 ${vessel} ${n(cnt)}개에 담은 ${thing}${thingNun} 모두 몇 ${cfg.small}인지 쓰시오.`,
      n(total),
      `${cfg.big}끼리 모으면 ${expr(`${b}\\times${cnt}=${b * cnt}`)}, ${cfg.small}끼리 모으면 ${expr(`${s}\\times${cnt}=${s * cnt}`)} 입니다. $1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 ${expr(`1000\\times${b * cnt}=${b * cnt * 1000}`)} 이고, ${expr(`${b * cnt * 1000}+${s * cnt}=${total}`)} 입니다.`,
    );
  };
}

/**
 * 4단 — **처음** 양을 되짚어 작은 단위 하나로 답한다(역산 + 변환).
 *
 * 답을 작은 단위로 두는 것이 이 소단원의 조건이다 — 섞은 꼴로 답하면
 * 「합과 차」와 지면에서 구별되지 않는다.
 */
function capUnitDeepOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const usedB = intBetween(rng, 1, 3);
    const usedS = intBetween(rng, 1, 9) * 100;
    const used = usedB * 1000 + usedS;
    const leftB = intBetween(rng, 1, 3);
    const leftSRaw = intBetween(rng, 1, 9) * 100;
    // 쓴 양과 남은 양이 **똑같으면** 우연처럼 보인다(씨앗 하나에서 실제로 났다).
    const leftS =
      leftB === usedB && leftSRaw === usedS
        ? leftSRaw === 900
          ? 800
          : leftSRaw + 100
        : leftSRaw;
    const rest = leftB * 1000 + leftS;
    const first = used + rest;
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const thingNun = josa(thing, "은", "는");
    return make(
      unit,
      `${vessel}에 있던 ${thing} 중에서 ${mixedCap(cfg, usedB, usedS)} ${cfg.jReul} 덜어 내고 나니 ${mixedCap(cfg, leftB, leftS)} ${cfg.jGa} 남았습니다. 처음에 있던 ${thing}${thingNun} 몇 ${cfg.small}인지 쓰시오.`,
      n(first),
      `덜어 낸 것은 ${unitNum(used, cfg.small)}, 남은 것은 ${unitNum(rest, cfg.small)} 입니다. 처음에 있던 ${thing}${thingNun} 이 둘을 더한 것이므로 ${expr(`${used}+${rest}=${first}`)} 입니다.`,
    );
  };
}

/* ── 2-5-3 들이의 합과 차 · 2-5-6 무게의 합과 차 ── */

/**
 * 1단 — 합·차 식 그대로. **받아올림·받아내림이 반드시 한 번은 나게** 뽑는다.
 *
 * 이 소단원의 알맹이가 «$1000$ 을 넘거나 모자랄 때 큰 단위로 옮기는 것»이라,
 * 자리 넘김이 없는 것만 나오면 지면이 「단위」 소단원과 구별되지 않는다.
 */
function capSumCalcOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const isAdd = intBetween(rng, 0, 1) === 1;
    const cross = intBetween(rng, 0, 1) === 1;
    const b1 = intBetween(rng, 2, 4);
    const b2 = intBetween(rng, 1, 3);
    if (isAdd) {
      const s1 = intBetween(rng, 100, 900);
      // ⚠️ 합이 **정확히 $1000$** 이면 답이 `$3\,\mathrm{L}\ 0\,\mathrm{mL}$` 가 된다 —
      //    받아올림은 나지만 지면에 `0` 이 남는다. 아래끝을 하나 올려 그 값을 뺀다.
      const s2 = cross
        ? intBetween(rng, 1001 - s1, 999)
        : intBetween(rng, 50, 999 - s1);
      const sum = s1 + s2;
      const carry = sum >= 1000 ? 1 : 0;
      const outS = sum - carry * 1000;
      const outB = b1 + b2 + carry;
      return make(
        unit,
        `다음을 계산하시오.\n\n$${b1}\\,\\mathrm{${cfg.big}}\\ ${s1}\\,\\mathrm{${cfg.small}}+${b2}\\,\\mathrm{${cfg.big}}\\ ${s2}\\,\\mathrm{${cfg.small}}=\\square$`,
        mixedCap(cfg, outB, outS),
        carry === 1
          ? `${cfg.small}끼리 더하면 ${expr(`${s1}+${s2}=${sum}`)} 이고, $1000\\,\\mathrm{${cfg.small}}$ ${cfg.jNun} $1\\,\\mathrm{${cfg.big}}$ 이므로 받아올림합니다. ${cfg.big}끼리 더하면 ${expr(`${b1}+${b2}+1=${outB}`)} 이므로 ${mixedCap(cfg, outB, outS)} 입니다.`
          : `${cfg.small}끼리 더하면 ${expr(`${s1}+${s2}=${outS}`)}, ${cfg.big}끼리 더하면 ${expr(`${b1}+${b2}=${outB}`)} 이므로 ${mixedCap(cfg, outB, outS)} 입니다.`,
      );
    }
    const s2 = intBetween(rng, 100, 900);
    // ⚠️ 아래끝을 `s2` 로 두면 **두 작은 자리가 같아** 답이
    //    `$4\,\mathrm{L}\ 0\,\mathrm{mL}$` 가 된다(씨앗 하나에서 실제로 났다).
    const s1 = cross
      ? intBetween(rng, 50, s2 - 1)
      : intBetween(rng, s2 + 1, 950);
    const bigLeft = b1 + b2;
    const total1 = bigLeft * 1000 + s1;
    const total2 = b2 * 1000 + s2;
    const diff = total1 - total2;
    const outB = Math.floor(diff / 1000);
    const outS = diff % 1000;
    const borrow = s1 < s2;
    return make(
      unit,
      `다음을 계산하시오.\n\n$${bigLeft}\\,\\mathrm{${cfg.big}}\\ ${s1}\\,\\mathrm{${cfg.small}}-${b2}\\,\\mathrm{${cfg.big}}\\ ${s2}\\,\\mathrm{${cfg.small}}=\\square$`,
      mixedCap(cfg, outB, outS),
      borrow
        ? `${cfg.small}끼리 뺄 수 없으므로 $1\\,\\mathrm{${cfg.big}}$ ${cfg.jReul} $1000\\,\\mathrm{${cfg.small}}$ ${cfg.jRo} 바꿉니다. ${expr(`${s1 + 1000}-${s2}=${outS}`)} 이고 ${expr(`${bigLeft - 1}-${b2}=${outB}`)} 이므로 ${mixedCap(cfg, outB, outS)} 입니다.`
        : `${cfg.small}끼리 빼면 ${expr(`${s1}-${s2}=${outS}`)}, ${cfg.big}끼리 빼면 ${expr(`${bigLeft}-${b2}=${outB}`)} 이므로 ${mixedCap(cfg, outB, outS)} 입니다.`,
    );
  };
}

/** 2단 — 문장으로 합·차. 답은 섞은 꼴. */
function capSumWordOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const isAdd = intBetween(rng, 0, 1) === 1;
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const thingNun = josa(thing, "은", "는");
    const thingEul = josa(thing, "을", "를");
    if (isAdd) {
      const b1 = intBetween(rng, 1, 3);
      const s1 = intBetween(rng, 200, 900);
      const b2 = intBetween(rng, 1, 3);
      // 합이 정확히 $1000$ 이면 답의 작은 자리가 `0` 이 된다 — 아래끝을 하나 올린다.
      const s2 = intBetween(rng, 1001 - s1, 950);
      const sum = s1 + s2;
      const outB = b1 + b2 + (sum >= 1000 ? 1 : 0);
      const outS = sum % 1000;
      return make(
        unit,
        `${vessel}에 ${thing}${thingEul} 어제 ${mixedCap(cfg, b1, s1)}, 오늘 ${mixedCap(cfg, b2, s2)} 담았습니다. 담은 ${thing}${thingNun} 모두 몇 ${cfg.big} 몇 ${cfg.small}인지 쓰시오.`,
        mixedCap(cfg, outB, outS),
        `${cfg.small}끼리 더하면 ${expr(`${s1}+${s2}=${sum}`)} 이므로 받아올림하여 ${cfg.big}끼리 ${expr(`${b1}+${b2}+1=${outB}`)} 입니다. 따라서 ${mixedCap(cfg, outB, outS)} 입니다.`,
      );
    }
    const b2 = intBetween(rng, 1, 2);
    // ⚠️ 큰 자리가 **둘 이상** 벌어져야 한다 — 받아내림으로 하나를 내주고도
    //    답의 큰 자리가 `0` 이 되지 않는다(`$0\,\mathrm{L}\ 350\,\mathrm{mL}$` 방지).
    const b1 = intBetween(rng, b2 + 2, 6);
    const s1 = intBetween(rng, 100, 500);
    const s2 = intBetween(rng, s1 + 50, 950);
    const total1 = b1 * 1000 + s1;
    const total2 = b2 * 1000 + s2;
    const diff = total1 - total2;
    return make(
      unit,
      `${vessel}에 ${thing}${josa(thing, "이", "가")} ${mixedCap(cfg, b1, s1)} 있었습니다. 그중 ${mixedCap(cfg, b2, s2)} ${cfg.jReul} 덜어 냈다면 남은 ${thing}${thingNun} 몇 ${cfg.big} 몇 ${cfg.small}인지 쓰시오.`,
      mixedCap(cfg, Math.floor(diff / 1000), diff % 1000),
      `${cfg.small}끼리 뺄 수 없으므로 $1\\,\\mathrm{${cfg.big}}$ ${cfg.jReul} $1000\\,\\mathrm{${cfg.small}}$ ${cfg.jRo} 바꿉니다. ${expr(`${s1 + 1000}-${s2}=${diff % 1000}`)} 이고 ${expr(`${b1 - 1}-${b2}=${Math.floor(diff / 1000)}`)} 이므로 ${mixedCap(cfg, Math.floor(diff / 1000), diff % 1000)} 입니다.`,
    );
  };
}

/** 3단 — 두 단계: 더 담고 덜어 낸다(합과 차를 잇달아). */
function capSumApplyOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const b0 = intBetween(rng, 2, 4);
    // ⚠️ 두 단계라 「끝 값의 작은 자리가 $0$ 이 되나」를 손으로 못 센다. 그래서
    //    **자리를 갈라 둔다** — 처음 값만 십의 자리를 갖고(백의 배수가 아니다),
    //    더하는 값·덜어 내는 값은 백의 배수다. 그러면 끝 값의 십의 자리가 처음 값
    //    그대로 남아 **$0$ 이 될 수 없다.** (뺄셈·덧셈이 백의 자리 위에서만 논다.)
    const s0 = intBetween(rng, 1, 8) * 100 + intBetween(rng, 1, 9) * 10;
    const start = b0 * 1000 + s0;
    const addB = intBetween(rng, 1, 2);
    const addS = intBetween(rng, Math.ceil((1000 - s0) / 100), 9) * 100;
    const add = addB * 1000 + addS;
    const cut = intBetween(rng, 1, 9) * 100;
    const end = start + add - cut;
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const thingNun = josa(thing, "은", "는");
    const thingEul = josa(thing, "을", "를");
    return make(
      unit,
      `${vessel}에 ${thing}${josa(thing, "이", "가")} ${mixedCap(cfg, b0, s0)} 있었습니다. 여기에 ${thing}${thingEul} ${mixedCap(cfg, addB, addS)} 더 담고, 다시 ${unitNum(cut, cfg.small)} ${cfg.jReul} 덜어 냈습니다. 지금 ${vessel}에 있는 ${thing}${thingNun} 몇 ${cfg.big} 몇 ${cfg.small}인지 쓰시오.`,
      mixedCap(cfg, Math.floor(end / 1000), end % 1000),
      `먼저 더하면 ${expr(`${start}+${add}=${start + add}`)} 입니다. 여기서 덜어 내면 ${expr(`${start + add}-${cut}=${end}`)} 이므로 ${mixedCap(cfg, Math.floor(end / 1000), end % 1000)} 입니다.`,
    );
  };
}

/**
 * 4단 — **처음** 양을 되짚는다(역산). 받아내림이 반드시 난다.
 *
 * 답을 섞은 꼴로 둔다 — 「단위」 소단원의 4단이 작은 단위 하나로 답하므로,
 * 이 둘이 한 시험지에 실려도 지면에서 갈린다.
 */
function capSumDeepOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    const addB = intBetween(rng, 1, 3);
    const addS = intBetween(rng, 300, 900);
    const add = addB * 1000 + addS;
    // 받아내림으로 큰 자리 하나를 내주므로, **둘 이상** 벌려야 답의 큰 자리가 남는다.
    const endB = addB + intBetween(rng, 2, 4);
    // 받아내림이 반드시 나게 — 나중 값의 작은 자리를 더한 값보다 작게 둔다.
    const endS = intBetween(rng, 50, addS - 50);
    const end = endB * 1000 + endS;
    const first = end - add;
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const thingEul = josa(thing, "을", "를");
    return make(
      unit,
      `${vessel}에 ${thing}${thingEul} ${mixedCap(cfg, addB, addS)} 더 담았더니 ${thing}${josa(thing, "이", "가")} 모두 ${mixedCap(cfg, endB, endS)} ${cfg.jGa} 되었습니다. 처음에 들어 있던 ${thing}${josa(thing, "은", "는")} 몇 ${cfg.big} 몇 ${cfg.small}인지 쓰시오.`,
      mixedCap(cfg, Math.floor(first / 1000), first % 1000),
      `처음 양은 나중 양에서 더 담은 양을 뺀 것입니다. ${cfg.small}끼리 뺄 수 없으므로 $1\\,\\mathrm{${cfg.big}}$ ${cfg.jReul} $1000\\,\\mathrm{${cfg.small}}$ ${cfg.jRo} 바꾸어 ${expr(`${endS + 1000}-${addS}=${first % 1000}`)} 이고, ${expr(`${endB - 1}-${addB}=${Math.floor(first / 1000)}`)} 이므로 ${mixedCap(cfg, Math.floor(first / 1000), first % 1000)} 입니다.`,
    );
  };
}

/* ── 2-5 들이와 무게 «심화중»·«심화상» — D-113 물결 4 (2026-09-01) ────────────
 *
 * ── 🔴 먼저: **「자리 넘김」 축은 죽었다.** 되살리지 마라 ───────────────────
 * 토대 17 §2.2 ⑴ 이 2-5 의 신청 예시(「$3\,L\ \square\,mL + 2\,L\ 480\,mL
 * = 6\,L\ 230\,mL$」)를 전수로 검산해 **심화하**임을 보였고(후보가 늘 하나 —
 * 반증 ①, 「받아올림이 한 번」을 지워도 답이 같다 — 반증 ⑤), 물결 3 이 그 뿌리가
 * **항등식**임을 진법과 무관하게 확인했다($a-b=c$ 이면 $b+c=a$ 라 두 뺄셈의 자리
 * 넘김이 같은 덧셈의 넘김이다 — 시각 1,036,080짝 · 길이 4,498,500짝 · 어긋남 0).
 * 밑이 $1000$ 이고 미지수가 $[1,999]$ 이면 **mod 되짚기의 답이 정확히 하나**다.
 * 그래서 **합·차의 한 자리를 가리는 모든 판**은 마디가 굳는다.
 *
 * ── 그러면 무엇이 남는가 — **«몇 그릇인가»가 안 굳는다** ────────────────────
 * 이 대단원은 **나눗셈을 안 쓴다**(해설에 한 번도 안 나오고, $7000\div1400$ 은 초3
 * 범위 밖이다). 그래서 「같은 그릇으로 몇 번 부었나」를 물으면 되짚기가 후보
 * $1,2,3,\ldots$ 를 **만들고** 발문은 그것을 주지 않는다. 이 마디를 굳히는 이 소단원의
 * 성질이 곧 **자리 넘김**이다 — 작은 자리는 $1000$ 보다 작으므로, **작은 자리만
 * 더해 가며 끝자리를 보면** 후보가 걸러진다.
 *
 * ── 중·상을 가르는 자리 (D-115 ⑾) ──────────────────────────────────────────
 *   · **심화중** — 합을 «몇 L 몇 mL» 로 준다. 작은 자리만 보면 후보가 **하나**로
 *     줄어든다(그 자리 성질이 «끝까지 계산하지 않고» 걸러 낸다). 큰 자리는 확인일 뿐이다.
 *     $S$ 를 더해 가는 끝자리가 $1\!\sim\!9$ 번에서 **한 번만** 그 값이 되는 자리만 쓴다.
 *   · **심화상** — 합을 «$L_1$ L 보다 많고 $L_2$ L 보다 적다» 는 **범위**로만 준다.
 *     그러면 작은 자리가 지면에 없어 그 성질이 **한 후보도 못 자르고**, 그릇 수를
 *     하나씩 **실제로 만들어** 범위와 견주어야 한다.
 *
 * ── 🔴 비운 자리 넷 — 2-5-1·2-5-2·2-5-4·2-5-5 ──────────────────────────────
 * 비교(2-5-1·2-5-4)는 답이 「가·나」·부등호라 **되짚을 값이 없다.** 단위(2-5-2·2-5-5)는
 * 환산이 **일대일**이라 마디가 늘 굳고(반증 ①), 거기에 이 갈래를 넣으면 굳히는 성질이
 * 「합과 차」의 것이 되어 **반증 ③** 에 걸린다(토대 17 §3 2-5 함정 ⑶ 이 같은 말을 한다).
 *
 * ── 반증 ⑥ 도 여기서 잰다 ──────────────────────────────────────────────────
 * 답이 「$4\,\mathrm{L}\ 811\,\mathrm{mL}$」 꼴이라 공용 자의 `readRat` 이 이 대단원을
 * **한 문항도 안 읽는다**(토대 17 §3 이 실측으로 적었다). 그래서 지면의 수 넷
 * ($B,S,E_B,E_S$ 또는 $B,S,L_1,L_2$)을 `+ − × ÷` 로 한 번 엮어 답에 닿으면 목록에서 뺀다.
 */

/** 지면의 수 둘을 한 번 엮어 답에 닿나 (반증 ⑥, 2-5 전용 — 1-3 판과 같은 규칙). */
function cap25OneStep(nums: readonly number[], answer: number): boolean {
  return div13OneStep(nums, answer);
}

/*
 * ⚠️ **수 뒤에 조사를 붙이지 마라** — g3 의 규약은 「끝소리로 고른다」가 아니라
 *    **「붙이지 않는다」**이고, `elemTiersG3.test.ts` 가 초3 **전 소단원 전 갈래**에서
 *    「판정할 자리 0」을 잠근다. 앞판이 g4 의 `NUM_BATCHIM` 표를 여기 옮겨 적어
 *    「$250$이 되는 것은」을 냈다가 그 시험이 물었다. 표를 지우고 **문장을 바꿨다**
 *    (「끝자리가 $250$ 인 것은」). 조사표를 다시 들여오지 마라.
 */

type Cap25Mid = {
  /** 한 그릇의 양 */
  b: number;
  s: number;
  /** 그릇 수 = 답 */
  k: number;
  /** 모두 부은 뒤 */
  eb: number;
  es: number;
  /** 작은 자리만 더해 갈 때의 끝자리 — 해설이 이대로 늘어놓는다 */
  tail: number[];
};

/**
 * 🔴 목록을 **전수로** 만든다(문턱으로 거르지 않는다) — 그래서 어떤 씨앗에서도 안 던진다.
 *   ⑴ 작은 자리 끝자리가 $1\!\sim\!9$ 번에서 **한 번만** $E_S$ 가 된다(성질이 굳힌다)
 *   ⑵ 합의 작은 자리가 $0$ 이 아니다 — 지면에 「$7\,L\ 0\,mL$」 가 나가면 안 된다
 *   ⑶ 답이 지면에 없고, 지면 두 수의 한 걸음으로 안 닿는다(반증 ⑥)
 *   ⑷ 그릇 수가 $3$ 이상 — 둘이면 «두 번 더하기»라 응용과 구별되지 않는다
 */
function cap25MidPool(): Cap25Mid[] {
  const out: Cap25Mid[] = [];
  for (let b = 1; b <= 2; b += 1)
    for (let s = 100; s <= 900; s += 50)
      // 🔴 **아래 하한 $3$ 도 지금 풀에서 죽은 가지다** — 변이(`k = 3` → `k = 2`)에
      //    하네스가 판정을 거부했고 전수로 재니 늘어나는 자리가 **0**이었다.
      //    그릇이 둘이면 큰 자리가 $2$ 또는 $3$ 이 되어 `page.includes(2)` 나
      //    「$3-1$」 한 걸음에 반드시 걸린다. 지우지 않는 까닭은 위와 같다.
      for (let k = 3; k <= 7; k += 1) {
        const total = (b * 1000 + s) * k;
        if (total >= 10000) continue;
        const es = total % 1000;
        if (es === 0) continue;
        const eb = Math.floor(total / 1000);
        const same: number[] = [];
        for (let j = 1; j <= 9; j += 1) if ((s * j) % 1000 === es) same.push(j);
        if (same.length !== 1) continue;
        const page = [b, s, eb, es];
        if (page.includes(k)) continue;
        if (cap25OneStep(page, k)) continue;
        const tail = Array.from({ length: k }, (_, i) => (s * (i + 1)) % 1000);
        out.push({ b, s, k, eb, es, tail });
      }
  if (out.length === 0) throw new Error("2-5 심화중 풀이 비었습니다");
  return out;
}

type Cap25High = {
  b: number;
  s: number;
  /** 그릇 수 = 답 */
  k: number;
  /** 범위 (큰 단위) */
  lo: number;
  hi: number;
  /** 하나씩 만들어 본 합(작은 단위) — 해설이 이대로 늘어놓는다 */
  runs: number[];
};

/**
 * 🔴 범위가 **딱 하나**를 남기는 자리만 쓴다. 그리고 바로 앞·뒤 그릇 수가 실제로
 *    빗나가는 것을 해설이 보여야 하므로, $k+1$ 까지의 합이 지면 범위 안에 든다
 *    (10,000 을 넘으면 견줄 것이 못 된다).
 */
function cap25HighPool(): Cap25High[] {
  const out: Cap25High[] = [];
  for (let b = 1; b <= 2; b += 1)
    for (let s = 100; s <= 900; s += 50) {
      const per = b * 1000 + s;
      for (let lo = 2; lo <= 8; lo += 1)
        for (let hi = lo + 1; hi <= 9; hi += 1) {
          const hits: number[] = [];
          for (let k = 2; k <= 9; k += 1) {
            const t = per * k;
            if (t > lo * 1000 && t < hi * 1000) hits.push(k);
          }
          if (hits.length !== 1) continue;
          const k = hits[0]!;
          // 셋 미만이면 만들어 견주는 일이 아니고, $k+1$ 이 네 자리를 넘으면 못 견준다.
          // 🔴 앞쪽(`k < 3`)은 지금 풀에서 죽은 가지다 — 변이(`< 2`)에 하네스가 판정을
          //    거부했고 전수로 늘어나는 자리가 **0**이었다(그릇이 둘이면 지면의 수
          //    한 걸음에 반드시 걸린다). **뒤쪽은 살아 있다** — 그 변이는 RED 다.
          if (k < 3 || per * (k + 1) >= 10000) continue;
          const page = [b, s, lo, hi];
          if (page.includes(k)) continue;
          if (cap25OneStep(page, k)) continue;
          const runs = Array.from({ length: k + 1 }, (_, i) => per * (i + 1));
          out.push({ b, s, k, lo, hi, runs });
        }
    }
  if (out.length === 0) throw new Error("2-5 심화상 풀이 비었습니다");
  return out;
}

let CAP25_MID: Cap25Mid[] | null = null;
let CAP25_HIGH: Cap25High[] | null = null;

/** 수 여러 개를 **한 덩어리** KaTeX 로 — 숫자마다 감싸면 지면에서 띄어쓰기가 깨진다. */
function list25(values: readonly number[]): string {
  return expr(values.join(",\\ "));
}

/**
 * 「붓다」는 들이의 말이다 — 무게 쪽(감자·밀가루)은 **담는다.** 한 낱말이라도
 * 어긋나면 지면에서 바로 보인다(「사과를 부었더니」).
 */
const CAP25_VERB = {
  L: {
    past: "부었더니",
    iff: "부으면",
    adj: "부은",
    now: "부을",
    ing: "붓는",
    /** 담아 오는 쪽 그릇 — 감자를 「병」에 담지 않는다 */
    packs: ["병", "통"],
  },
  kg: {
    past: "담았더니",
    iff: "담으면",
    adj: "담은",
    now: "담을",
    ing: "담는",
    packs: ["봉지", "자루"],
  },
} as const;

function cap25Verb(cfg: CapCfg) {
  return cfg.big === "L" ? CAP25_VERB.L : CAP25_VERB.kg;
}

/**
 * 심화중·심화상이 **같은 발문 틀**을 쓴다 — 다른 것은 마지막 조건(합이냐 범위냐)뿐이다.
 *
 * ⚠️ **세는 말을 해설과 같이 쓴다.** 앞판은 발문이 「몇 번 부었는지」인데 해설이
 *    「$3$개입니다」로 끝나 한 문항 안에서 세는 말이 갈렸다(지면에서 바로 보인다).
 *    그래서 틀과 세는 말을 **한 곳에서 같이** 돌려준다.
 */
function cap25Stem(
  rng: Rng,
  cfg: CapCfg,
  p: {
    thing: string;
    을를: string;
    이가: string;
    vessel: string;
    per: string;
    /** 「… 가 되었습니다」 / 「… 보다 적었습니다」 */
    tailText: string;
    /** 「모두 … 라면」 / 「… 보다 적다면」 — 조건절 꼴 */
    tailIf: string;
  },
): [string, string] {
  const { thing, 을를, 이가, per, tailText, tailIf } = p;
  const v = cap25Verb(cfg);
  const pack = pick(rng, v.packs);
  // 담아 오는 그릇과 붓는 그릇이 같은 낱말이면 「봉지를 여러 봉지 모아 한 봉지에」가 된다.
  const vessel = p.vessel === pack ? `큰 ${p.vessel}` : p.vessel;
  // ⚠️ **다섯 틀이 모두 「… 씩 담았습니다」로 시작한다** — 소단원 조건 검사
  //    (`probe-elem-section-conditions` 의 「합과 차」)가 문장형에서 그 말을 찾는다.
  //    앞판은 「여러 번 부었더니」로만 적었다가 24/40 씨앗이 위반으로 걸렸다.
  //    낱말을 맞추는 것이 옳다 — 공용 판정기를 넓히면 다른 물결의 관문이 흔들린다.
  const rows: readonly (readonly [string, string])[] = [
    [
      `똑같은 ${pack}에 ${thing}${을를} ${per} 씩 담았습니다. 이 ${pack}에 담긴 ${thing}${을를} 모두 한 ${vessel}에 ${v.past} ${thing}${이가} ${tailText}. ${pack}${josa(pack, "은", "는")} 몇 개인지 쓰시오.`,
      "개",
    ],
    [
      `${pack}마다 ${thing}${을를} ${per} 씩 담았습니다. 이 ${pack}들을 모두 한 ${vessel}에 ${v.past} ${tailText}. ${v.adj} ${pack}${josa(pack, "은", "는")} 몇 개인지 쓰시오.`,
      "개",
    ],
    [
      `한 ${pack}에 ${thing}${을를} ${per} 씩 담았습니다. 이 ${pack}${josa(pack, "으로", "로")} ${vessel}에 여러 번 ${v.past} ${thing}${이가} 모두 ${tailText}. 몇 번 ${v.past.slice(0, -2)}는지 쓰시오.`,
      "번",
    ],
    [
      `똑같은 그릇에 ${thing}${을를} ${per} 씩 담았습니다. 이 그릇들을 한 ${vessel}에 모두 ${v.past.replace("더니", "습니다")}. ${v.adj} ${thing}${이가} ${tailIf} 그릇은 몇 개인지 쓰시오.`,
      "개",
    ],
    [
      `한 ${pack}에 ${thing}${을를} ${per} 씩 담았습니다. 이런 ${pack}${josa(pack, "을", "를")} 몇 ${pack} 사서 한 ${vessel}에 모두 ${v.past} ${tailText}. 산 ${pack}${josa(pack, "은", "는")} 몇 개인지 쓰시오.`,
      "개",
    ],
  ];
  const row = pick(rng, rows);
  return [row[0], row[1]];
}

/**
 * 5단 · 2-5-3 · 2-5-6 — 「몇 그릇인가」가 안 굳고, **작은 자리의 끝자리**가 굳힌다.
 *
 * ⚠️ 해설은 끝자리를 **늘어놓되 큰 자리는 안 센다** — 그것이 D-115 ⑾ 의 «끝까지
 *    계산하지 않고 걸러 낸다»이고, 그래서 상이 아니라 **중**이다. 큰 자리는 맨 끝
 *    한 줄에서 **확인**으로만 쓴다.
 */
function capSumMidOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    CAP25_MID ??= cap25MidPool();
    const f = pick(rng, CAP25_MID);
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const 을를 = josa(thing, "을", "를");
    const 이가 = josa(thing, "이", "가");
    const per = mixedCap(cfg, f.b, f.s);
    const end = mixedCap(cfg, f.eb, f.es);
    const [stem, cnt] = cap25Stem(rng, cfg, {
      thing,
      을를,
      이가,
      vessel,
      per,
      tailText: `${end} ${cfg.jGa} 되었습니다`,
      // 「$9\,kg\ 300\,g$ **이**라면」 — 단위를 읽은 소리 뒤 조사다(cfg.jNun 과 같은 축).
      tailIf: `모두 ${end} ${cfg.jNun === "은" ? "이라면" : "라면"}`,
    });
    const carry = Math.floor((f.s * f.k) / 1000);
    const v = cap25Verb(cfg);
    return makeDeep(unit, stem, n(f.k), [
      `${cfg.small}끼리만 봅니다. 한 번 ${v.now} 때마다 ${cfg.small} 자리는 ${n(f.s)} 씩 커지고, $1000\\,\\mathrm{${cfg.small}}$ ${cfg.jGa} 되면 $1\\,\\mathrm{${cfg.big}}$ ${cfg.jRo} 받아올림합니다. 그래서 ${cfg.small} 자리는 차례로 ${list25(f.tail)} 입니다.`,
      // ⚠️ **수 뒤에 조사를 붙이지 않는다**(g3 규약 — `josa` 주석. 시험이 전수로 잠근다).
      //    「$250$ 이 되는 것은」이 아니라 「끝자리가 $250$ 인 것은」으로 적는다.
      // ⚠️ **「뿐」이라 쓰지 않는다** — 위 목록은 $k$ 번째까지만 늘어놓으므로 그 글만으로는
      //    «그 뒤에 또 없다»를 못 보인다. 「처음」이라 적고 **다음 걸음이 확인**한다.
      `${cfg.small} 자리가 ${n(f.es)} 인 것은 ${n(f.k)} 번째가 처음입니다.`,
      `확인하면 ${cfg.small}끼리는 ${expr(`${f.s}\\times${f.k}=${f.s * f.k}`)}, ${cfg.big}끼리는 ${expr(`${f.b}\\times${f.k}=${f.b * f.k}`)} 이고, ${unitNum(f.s * f.k, cfg.small)} ${cfg.jNun} ${mixedCap(cfg, carry, f.es)} 이므로 ${expr(`${f.b * f.k}+${carry}=${f.eb}`)} 에서 ${end} 입니다. 따라서 ${n(f.k)}${cnt}입니다.`,
    ]);
  };
}

/**
 * 6단 · 2-5-3 · 2-5-6 — 합을 **범위로만** 주어 자리 성질이 한 후보도 못 자른다.
 * 그릇 수를 하나씩 **실제로 만들어** 범위와 견주어야 한다.
 */
function capSumHighOf(cfg: CapCfg) {
  return (unit: UnitSeed, rng: Rng): ElemProblem => {
    CAP25_HIGH ??= cap25HighPool();
    const f = pick(rng, CAP25_HIGH);
    const vessel = pick(rng, cfg.vessels);
    const thing = pick(rng, cfg.stuff);
    const 을를 = josa(thing, "을", "를");
    const 이가 = josa(thing, "이", "가");
    const per = mixedCap(cfg, f.b, f.s);
    const perSmall = f.b * 1000 + f.s;
    const lo = unitNum(f.lo, cfg.big);
    const hi = unitNum(f.hi, cfg.big);
    const [stem, cnt] = cap25Stem(rng, cfg, {
      thing,
      을를,
      이가,
      vessel,
      per,
      tailText: `${lo} 보다 많고 ${hi} 보다 적었습니다`,
      tailIf: `${lo} 보다 많고 ${hi} 보다 적다면`,
    });
    // 하나씩 **실제로 만든다** — 이 걸음이 이 갈래를 상으로 만든다.
    const v = cap25Verb(cfg);
    const builds = f.runs
      .slice(1)
      .map(
        (val, i) =>
          `${n(i + 2)}${cnt}까지 ${v.iff} ${expr(`${f.runs[i]!}+${perSmall}=${val}`)}`,
      )
      .join(", ");
    return makeDeep(unit, stem, n(f.k), [
      `한 번에 ${v.ing} 양은 ${per}, 곧 ${unitNum(perSmall, cfg.small)} 입니다. 수를 하나씩 늘려 가며 모두 얼마가 되는지 만들어 봅니다.`,
      `처음 한 ${cnt}${josa(cnt, "은", "는")} ${unitNum(perSmall, cfg.small)}, ${builds} 입니다.`,
      `${lo} ${cfg.jNun} ${unitNum(f.lo * 1000, cfg.small)}, ${hi} ${cfg.jNun} ${unitNum(f.hi * 1000, cfg.small)} 입니다. 이 사이에 있는 것은 ${unitNum(f.runs[f.k - 1]!, cfg.small)} 하나뿐이므로 ${n(f.k)}${cnt}입니다.`,
    ]);
  };
}

// ── 2-6 그림그래프 (D-72 확대) ───────────────────────────────────────────
//
// 두 소단원이 **반대 방향**이다 — 2-6-1 은 그림그래프를 **읽고**, 2-6-2 는 표를 보고
// 그림그래프로 **나타낸다**. 그래서 공장을 나눠 쓰지 않는다(2-5 와 다른 점이다).
//
// ⚠️ **그림이 답을 말하지 않게** 하는 자리가 둘이다. elem-figures 가 2-3 에서 잡은
//    것과 같은 부류다(2026-08-24):
//      · 2-6-2 는 **큰·작은 그림을 그리지 않는다.** 그려 놓고 「몇 개 그려야 하나」를
//        물으면 **세면 답**이다. 표만 주고 개수를 «수»로 답하게 한다.
//      · 2-6-1 심화는 묻는 곳을 **그림에서 뺀다.** 그려 두고 「몇 개인가」를 물으면
//        칸을 세면 끝이라 역산이 아니다.
//
// ⚠️ **한 아이콘(`□ = N`)만 쓴다.** 「큰 그림/작은 그림」 두 아이콘 범례는 엔진에
//    아직 없다(elem-figures 확인, 2026-08-24). 2-6-2 가 큰·작은을 다루지만 그것은
//    **발문의 규약**이지 그림이 아니다 — 위 이유로 그리지 않는 편이 옳기도 하다.
//
// ⚠️ **칸 수·항목 수를 스스로 묶는다.** 렌더러는 `count` 0~12 · `items` 1~6 을 받고
//    넘쳐도 안 던진다(`_svg` 가 viewBox 를 넓힌다). 그런데 넓어지면 두 단 지면에서
//    **줄어들어 아이콘이 작아진다** — 실측으로 `count` 8부터 240 → 356 이다.
//    그래서 여기서 **`count` ≤ 7 · `items` ≤ 4** 로 묶어 240 에 머물게 한다.

const GRAPH_MAX_COUNT = 7;
const GRAPH_LABELS = ["가", "나", "다", "라"] as const;

/** `□ = N` 한 아이콘짜리 그림그래프. **칸 수 상한을 여기서 지킨다.** */
function graphSpec(
  step: number,
  rows: readonly { label: string; count: number }[],
  /** 「□ 한 칸은 몇 …?」 처럼 범례의 수를 묻는 문항 — 범례를 «□ = ?» 로 그린다. */
  hideUnit = false,
): Record<string, unknown> {
  for (const r of rows) {
    if (r.count < 1 || r.count > GRAPH_MAX_COUNT) {
      throw new Error(
        `그림그래프 칸 수가 ${r.count} 입니다 — 1~${GRAPH_MAX_COUNT} 로 잡으십시오(넘치면 지면에서 줄어듭니다)`,
      );
    }
  }
  return fig("pictograph", {
    unit: step,
    items: rows.map((r) => ({ label: r.label, count: r.count })),
    ...(hideUnit ? { hideUnit: true } : {}),
  });
}

/** 한 칸이 나타내는 수. 초3 은 $2$·$5$·$10$ 만 쓴다. */
function graphStep(rng: Rng): number {
  return pick(rng, [2, 5, 10]);
}

/* ── 2-6-1 그림그래프 알아보기 — **읽는다** ── */

/** 1단 — 칸을 세어 곱한다(한 단계). */
function graph261Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  const at = intBetween(rng, 0, 2);
  const count = counts[at]!;
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. ${GRAPH_LABELS[at]} ${place}의 ${stuff.name} 수는 몇 ${stuff.unit}인지 쓰시오.`,
    n(count * step),
    `${GRAPH_LABELS[at]} ${place}${josa(place, "은", "는")} □가 ${n(count)}칸이므로 ${expr(`${step}\\times${count}=${count * step}`)} 입니다.`,
    graphSpec(
      step,
      counts.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

/**
 * 2단 — **이름 대신 성질로** 묻는다(D-72). 「가 마을」이 아니라 「가장 많은 곳」이다.
 *
 * 그래서 답이 **기호**다 — 칸을 세어 견주는 일이 알맹이고, 곱셈은 안 든다.
 */
function graph261Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  // 칸 수가 겹치면 「가장 많은 곳」이 하나로 안 정해진다 — 셋을 다르게 뽑는다.
  // 셋을 벌리면 최대가 base+4 다 — 상한 7 을 넘지 않게 base 를 3 까지만.
  const base = intBetween(rng, 2, 3);
  const counts = [base, base + intBetween(rng, 1, 2), 0];
  counts[2] = counts[1]! + intBetween(rng, 1, 2);
  const order = pick(rng, CAP_PERMS);
  const shown = order.map((i) => counts[i]!);
  const askMost = intBetween(rng, 0, 1) === 1;
  const target = askMost ? Math.max(...shown) : Math.min(...shown);
  const at = shown.indexOf(target);
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. ${stuff.name} 수가 가장 ${askMost ? "많은" : "적은"} ${place}의 기호를 쓰시오.`,
    GRAPH_LABELS[at]!,
    `□ 칸 수를 견주면 ${shown.map((c, i) => `${GRAPH_LABELS[i]} ${n(c)}칸`).join(", ")} 입니다. 가장 ${askMost ? "많은" : "적은"} 것은 ${GRAPH_LABELS[at]} ${place}입니다.`,
    graphSpec(
      step,
      shown.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

/** 3단 — 두 곳을 각각 환산해 합하거나 뺀다(두 단계). */
function graph261Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  let i = intBetween(rng, 0, 2);
  let j = intBetween(rng, 0, 1);
  if (j >= i) j += 1;
  // 발문이 「나 … 가 …」로 거꾸로 읽히지 않게 라벨 차례로 세운다.
  if (j < i) [i, j] = [j, i];
  // 두 칸 수가 같으면 **차가 $0$** 이라 「차는 몇 개인가」가 문항이 안 된다.
  // 그때는 합으로 돌린다 — 뽑기를 다시 하면 씨앗마다 문항이 흔들린다.
  const isSum = counts[i] === counts[j] || intBetween(rng, 0, 1) === 1;
  const [hi, lo] =
    counts[i]! >= counts[j]!
      ? [counts[i]!, counts[j]!]
      : [counts[j]!, counts[i]!];
  const value = isSum ? (counts[i]! + counts[j]!) * step : (hi - lo) * step;
  return make(
    unit,
    isSum
      ? `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. ${GRAPH_LABELS[i]} ${place}${josa(place, "과", "와")} ${GRAPH_LABELS[j]} ${place}의 ${stuff.name} 수를 더하면 몇 ${stuff.unit}인지 쓰시오.`
      : `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. ${GRAPH_LABELS[i]} ${place}${josa(place, "과", "와")} ${GRAPH_LABELS[j]} ${place}의 ${stuff.name} 수의 차는 몇 ${stuff.unit}인지 쓰시오.`,
    n(value),
    isSum
      ? `${GRAPH_LABELS[i]} ${place}${josa(place, "은", "는")} ${expr(`${step}\\times${counts[i]}=${counts[i]! * step}`)}, ${GRAPH_LABELS[j]} ${place}${josa(place, "은", "는")} ${expr(`${step}\\times${counts[j]}=${counts[j]! * step}`)} 입니다. ${expr(`${counts[i]! * step}+${counts[j]! * step}=${value}`)} 입니다.`
      : `${GRAPH_LABELS[i]} ${place}${josa(place, "은", "는")} ${expr(`${step}\\times${counts[i]}=${counts[i]! * step}`)}, ${GRAPH_LABELS[j]} ${place}${josa(place, "은", "는")} ${expr(`${step}\\times${counts[j]}=${counts[j]! * step}`)} 입니다. ${expr(`${hi * step}-${lo * step}=${value}`)} 입니다.`,
    graphSpec(
      step,
      counts.map((c, k) => ({ label: GRAPH_LABELS[k]!, count: c })),
    ),
  );
}

/**
 * 4단 — **전체에서 되짚는다.** 묻는 곳은 그림에 **없다.**
 *
 * ⚠️ 그 곳을 그려 놓고 물으면 칸을 세면 끝이라 역산이 아니다. 교과서도 「찢어져
 *    보이지 않는다」로 낸다. 그림에 셋만 두고 넷째를 묻는다.
 */
function graph261Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const shown = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  const missing = intBetween(rng, 2, GRAPH_MAX_COUNT);
  const shownSum = shown.reduce((a, b) => a + b, 0) * step;
  const total = shownSum + missing * step;
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. 라 ${place}의 그림그래프는 찢어져 보이지 않습니다. 네 ${place}의 ${stuff.name} 수를 모두 더한 전체가 ${n(total)}${stuff.unit}일 때, 라 ${place}의 ${stuff.name} 수는 몇 ${stuff.unit}인지 쓰시오.`,
    n(missing * step),
    `보이는 세 ${place}${josa(place, "은", "는")} ${shown.map((c, i) => `${GRAPH_LABELS[i]} ${expr(`${step}\\times${c}=${c * step}`)}`).join(", ")} 이므로 합이 ${n(shownSum)}${stuff.unit}입니다. 전체가 ${n(total)}${stuff.unit}이므로 ${expr(`${total}-${shownSum}=${missing * step}`)} 입니다.`,
    graphSpec(
      step,
      shown.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

/* ── 2-6-2 그림그래프로 나타내기 — **나타낸다** ── */
//
// ⚠️ 넷 다 **표**를 주고 **큰·작은 그림 개수를 «수»로** 답하게 한다. 그림그래프를
//    그려 주면 세면 답이라 문항이 죽는다(위 머리말 참조).

/** 표 한 줄짜리 그림. 라벨이 길면 렌더러가 **던지므로**(D-70) 짧게 유지한다. */
function graphTable(
  place: string,
  name: string,
  labels: readonly string[],
  values: readonly (number | string)[],
): Record<string, unknown> {
  return fig("table", {
    headers: [place, ...labels],
    rows: [[name, ...values.map((v) => String(v))]],
  });
}

/** 1단 — 값을 자릿값으로 가른다(한 단계). */
function graph262Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const labels = GRAPH_LABELS.slice(0, 3);
  // 일의 자리를 비우지 않는다 — 「작은 그림 $0$개」가 답이 되면 문항이 싱겁다.
  const values = labels.map(
    () => intBetween(rng, 1, 4) * 10 + intBetween(rng, 1, 9),
  );
  const at = intBetween(rng, 0, labels.length - 1);
  const value = values[at]!;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return make(
    unit,
    `표를 보고 그림그래프로 나타내려고 합니다. 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}입니다. ${labels[at]} ${place}${josa(place, "은", "는")} 큰 그림과 작은 그림을 각각 몇 개 그려야 하는지 쓰시오.`,
    `큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개`,
    `${labels[at]} ${place}의 ${stuff.name} 수는 ${n(value)}${stuff.unit}입니다. ${expr(`${value}=10\\times${tens}+${ones}`)} 이므로 큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개를 그립니다.`,
    graphTable(place, stuff.name, labels, values),
  );
}

/**
 * 2단 — **문장으로** 값을 받아 나타낸다. 표를 안 쓴다.
 *
 * ⚠️ 처음엔 표를 곁들였는데, 값이 발문에 있으니 **표의 수를 아무도 안 썼다.**
 *    지면에 «쓰지 않는 수»가 서 있으면 학생이 그것을 찾다가 길을 잃는다.
 *    그러면 발문의 「표를 보고」도 거짓말이 된다 — 둘을 같이 뺐다(2026-08-24).
 *    2단의 축은 「문장으로 받는다」라 표가 없어도 성립한다.
 */
function graph262Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const value = intBetween(rng, 1, 5) * 10 + intBetween(rng, 1, 9);
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return make(
    unit,
    `그림그래프로 나타내려고 합니다. 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}입니다. 다 ${place}의 ${stuff.name} 수는 ${n(value)}${stuff.unit}입니다. 다 ${place}${josa(place, "은", "는")} 큰 그림과 작은 그림을 각각 몇 개 그려야 하는지 쓰시오.`,
    `큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개`,
    `다 ${place}의 ${stuff.name} 수는 ${n(value)}${stuff.unit}입니다. ${expr(`${value}=10\\times${tens}+${ones}`)} 이므로 큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개를 그립니다.`,
  );
}

/** 3단 — 표의 한 칸이 비었다. 합계에서 그 값을 구한 **뒤** 그림 개수로 옮긴다. */
function graph262Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const labels = GRAPH_LABELS.slice(0, 3);
  const known = [0, 1].map(
    () => intBetween(rng, 1, 3) * 10 + intBetween(rng, 1, 9),
  );
  const value = intBetween(rng, 1, 4) * 10 + intBetween(rng, 1, 9);
  const total = known[0]! + known[1]! + value;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return make(
    unit,
    `표를 보고 그림그래프로 나타내려고 합니다. 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}입니다. 세 ${place}의 ${stuff.name} 수를 모두 더하면 ${n(total)}${stuff.unit}입니다. 다 ${place}${josa(place, "은", "는")} 큰 그림과 작은 그림을 각각 몇 개 그려야 하는지 쓰시오.`,
    `큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개`,
    `가와 나의 합은 ${expr(`${known[0]}+${known[1]}=${known[0]! + known[1]!}`)} 입니다. 전체가 ${n(total)}${stuff.unit}이므로 다 ${place}${josa(place, "은", "는")} ${expr(`${total}-${known[0]! + known[1]!}=${value}`)} 입니다. ${expr(`${value}=10\\times${tens}+${ones}`)} 이므로 큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개를 그립니다.`,
    graphTable(place, stuff.name, labels, [...known.map(String), "?"]),
  );
}

/**
 * 4단 — **그림 개수에서 값을 되짚고**, 조건을 하나 겹친다.
 *
 * 「큰 그림 a개·작은 그림 b개」로 나타낸 곳이 있고, 묻는 곳은 그보다 얼마 많다.
 * 자릿값을 거꾸로 읽는 것이 4단의 역산이고, 「보다 몇 많다」가 겹친 조건이다.
 */
function graph262Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const bigA = intBetween(rng, 1, 4);
  const smallA = intBetween(rng, 1, 8);
  const base = bigA * 10 + smallA;
  const gap = intBetween(rng, 1, 3) * 10 + intBetween(rng, 1, 9 - smallA);
  const value = base + gap;
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return make(
    unit,
    `그림그래프로 나타낼 때 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. 가 ${place}의 ${stuff.name} 수를 큰 그림 ${n(bigA)}개와 작은 그림 ${n(smallA)}개로 나타냈습니다. 나 ${place}${josa(place, "은", "는")} 가 ${place}보다 ${n(gap)}${stuff.unit} 더 많습니다. 나 ${place}${josa(place, "은", "는")} 큰 그림과 작은 그림을 각각 몇 개 그려야 하는지 쓰시오.`,
    `큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개`,
    `가 ${place}${josa(place, "은", "는")} ${expr(`10\\times${bigA}+${smallA}=${base}`)} 입니다. 나 ${place}${josa(place, "은", "는")} ${expr(`${base}+${gap}=${value}`)} 이고, ${expr(`${value}=10\\times${tens}+${ones}`)} 이므로 큰 그림 ${n(tens)}개, 작은 그림 ${n(ones)}개를 그립니다.`,
  );
}

/* ── 2-6 그림그래프 «심화중»·«심화상» — D-113 물결 2 (2026-08-31) ──────────────
 *
 * ── 이 대단원에서 마디를 여는 자리 ──────────────────────────────────────────
 * 2-6-2 는 「값 ↔ (큰 그림 수, 작은 그림 수)」가 **일대일**이라 값을 주면 늘 굳는다
 * (그게 지금 심화하다). 마디를 열려면 값이 아니라 **그림을 모두 몇 개 그렸는가**를
 * 주어야 한다 — 그러면 $(a,b)$ 가 $a+b$ 만으로는 안 굳고, 값은 $10a+b=9a+(a+b)$ 로
 * 후보가 여럿 생긴다. 굳히는 성질은 이 소단원의 규약 하나다:
 * **「작은 그림은 $9$ 개를 넘지 않는다 — 열 개가 되면 큰 그림 한 개로 바꾼다.」**
 *
 * ── 중·상을 가르는 자리 (D-115 ⑾) ──────────────────────────────────────────
 *   · **심화중** — 그림이 **열 개를 넘게** 그려져 그 규약이 실제로 작동한다.
 *     큰 그림은 적어도 $(총-9)$ 개라는 것이 **한 번에** 나오고, 값을 만들어 보지
 *     않아도 가장 작은 것이 정해진다.
 *   · **심화상** — 그림이 **아홉 개 이하**라 그 규약이 **한 후보도 못 자른다**
 *     (어떤 $a$ 를 잡아도 작은 그림이 $9$ 개 이하다). 그래서 큰 그림 수를 $0$ 부터
 *     차례로 **실제로 만들어** 범위와 견주어야 하나가 남는다.
 *
 * ── 🔴 2-6-1 은 둘 다 비운다 — **세어서** 정했다 ─────────────────────────────
 * 2-6-1 에서 마디를 열 수 있는 축은 「값이 범위 안에 있다」 하나이고, 굳히는 성질은
 * 「값은 한 칸이 나타내는 수의 배수다」 하나다. 엔진이 쓰는 단위는 $2\cdot5\cdot10$
 * 뿐인데(`graphSpec`), 십의 자리 경계로 자른 창 16개를 전수로 세면 —
 * ```
 * 단위 10 → 창 안 후보 0개(8창) · 1개(8창)
 * 단위  5 → 1개(8창) · 3개(8창)
 * 단위  2 → 4개(8창) · 9개(8창)
 * ```
 * 후보가 **하나**일 때는 창의 두 끝을 단위로 나누기만 하면 나오므로 **순방향**이고
 * (반증 ⑥), 후보가 **여럿**일 때는 남은 성질이 없어 답이 안 정해진다. 곧 이 소단원
 * 에서는 「후보가 여럿 생기고 성질이 하나를 남긴다」가 **구성상 일어나지 않는다.**
 * (토대 17 §2.2 적대 검토 ⑶ 이 같은 계산으로 「2-6-1 심화중은 비운다」고 했다.)
 *
 * ⚠️ **그림그래프를 그리지 않는다** — 2-6-2 의 규약 그대로다(`g3.ts` 2-6 머리말).
 *    그리면 세는 것으로 답이 나오고, 표를 두어도 안 쓰는 수가 지면에 선다.
 *
 * 🔴 목록은 전수 열거로 만들고 반증 ⑥ 을 목록에서 건다. 자리 수는 **얇다**
 *    (중 8 · 상 14). 발문의 옷·소재·자리 이름으로 갈리지만 «수»는 그만큼뿐이라,
 *    이 사실을 보고서에 적어 둔다.
 */

/** 2-6-2 심화중 — 그림이 열 개를 넘어 「작은 그림 ≤ $9$」가 실제로 자른다. */
type Graph262Mid = { total: number; big: number; ans: number };

function graph262MidPool(): Graph262Mid[] {
  const out: Graph262Mid[] = [];
  // 총 $11$~$18$ — 아래로는 규약이 안 걸리고, 위로는 값이 세 자리가 된다.
  for (let total = 11; total <= 18; total += 1) {
    const big = total - 9;
    const ans = big * 10 + 9;
    if (forwardReachable([rat(10), rat(1), rat(total)], rat(ans))) continue;
    out.push({ total, big, ans });
  }
  return out;
}

/** 2-6-2 심화상 — 그림이 아홉 개 이하라 규약이 한 후보도 못 자른다. */
type Graph262High = {
  total: number;
  L: number;
  U: number;
  vals: number[];
  big: number;
  small: number;
  value: number;
};

function graph262HighPool(): Graph262High[] {
  const out: Graph262High[] = [];
  for (let total = 4; total <= 7; total += 1) {
    const vals: number[] = [];
    for (let a = 0; a <= total; a += 1) vals.push(9 * a + total);
    for (let L = 10; L <= 80; L += 10)
      for (const w of [10, 20]) {
        const U = L + w;
        const hits = vals.filter((v) => v > L && v < U);
        if (hits.length !== 1) continue;
        const value = hits[0]!;
        const big = (value - total) / 9;
        const small = total - big;
        // 큰 그림도 작은 그림도 있어야 이 소단원의 «나타내기»가 된다.
        if (big < 1 || small < 1) continue;
        const nums = [rat(10), rat(1), rat(total), rat(L), rat(U)];
        if (forwardReachable(nums, rat(big))) continue;
        // 답이 지면에 그대로 서면 되짚기가 필요 없다(작은 그림 한 개는 $1$ 이다).
        if (answerPrintedOnPage(nums, rat(big))) continue;
        out.push({ total, L, U, vals, big, small, value });
      }
  }
  return out;
}

let GRAPH262_MID: Graph262Mid[] | null = null;
let GRAPH262_HIGH: Graph262High[] | null = null;

/** 5단 · 2-6-2 — 「작은 그림은 $9$ 개를 넘지 않는다」가 가장 작은 값을 정한다. */
function graph262Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  GRAPH262_MID ??= graph262MidPool();
  const f = pick(rng, GRAPH262_MID);
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const head = `그림그래프로 나타낼 때 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. 작은 그림 열 개는 큰 그림 한 개로 바꾸어 나타냅니다.`;
  const stem = pick(rng, [
    `${head} 어느 ${place}의 ${stuff.name} 수를 나타내는 데 큰 그림과 작은 그림을 모두 ${n(f.total)}개 그렸습니다. 이 ${place}의 ${stuff.name} 수가 가장 작을 때 얼마인지 쓰시오.`,
    `${head} 가 ${place}의 ${stuff.name} 수를 나타내는 데 그림을 모두 ${n(f.total)}개 그렸습니다. 가 ${place}의 ${stuff.name} 수가 될 수 있는 수 가운데 가장 작은 것을 쓰시오.`,
    `${head} 어느 ${place}의 ${stuff.name} 수를 큰 그림과 작은 그림을 합해 ${n(f.total)}개로 나타냈습니다. 이 ${place}의 ${stuff.name} 수는 가장 작을 때 얼마인지 구하시오.`,
    `${head} 그림을 모두 ${n(f.total)}개 그려 어느 ${place}의 ${stuff.name} 수를 나타냈습니다. 그 수가 가장 작을 때 얼마인지 구하시오.`,
  ]);
  return makeDeep(unit, stem, n(f.ans), [
    `작은 그림은 ${n(9)}개를 넘을 수 없습니다. 작은 그림이 열 개가 되면 큰 그림 한 개로 바꾸기 때문입니다.`,
    `그림이 모두 ${n(f.total)}개이므로 큰 그림은 적어도 ${expr(`${f.total}-9=${f.big}`)} 에서 ${n(f.big)}개입니다.`,
    `큰 그림이 적을수록 나타내는 수가 작으므로 큰 그림 ${n(f.big)}개와 작은 그림 ${n(9)}개일 때 가장 작고, ${expr(`10\\times${f.big}+9=${f.ans}`)} 입니다.`,
  ]);
}

/** 6단 · 2-6-2 — 규약이 한 후보도 못 잘라 **값을 차례로 만들어** 범위와 견준다. */
function graph262High(unit: UnitSeed, rng: Rng): ElemProblem {
  GRAPH262_HIGH ??= graph262HighPool();
  const f = pick(rng, GRAPH262_HIGH);
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const head = `그림그래프로 나타낼 때 큰 그림 한 개는 ${n(10)}${stuff.unit}, 작은 그림 한 개는 ${n(1)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다.`;
  const stem = pick(rng, [
    `${head} 가 ${place}의 ${stuff.name} 수를 나타내는 데 큰 그림과 작은 그림을 모두 ${n(f.total)}개 그렸습니다. 가 ${place}의 ${stuff.name} 수가 ${n(f.L)}${stuff.unit}보다 많고 ${n(f.U)}${stuff.unit}보다 적을 때, 큰 그림은 몇 개 그렸는지 쓰시오.`,
    `${head} 어느 ${place}의 ${stuff.name} 수를 그림 ${n(f.total)}개로 나타냈습니다. 그 수가 ${n(f.L)}${stuff.unit}보다 많고 ${n(f.U)}${stuff.unit}보다 적다면 큰 그림은 몇 개 그렸는지 구하시오.`,
    `${head} ${stuff.name} 수가 ${n(f.L)}${stuff.unit}보다 많고 ${n(f.U)}${stuff.unit}보다 적은 ${place}${josa(place, "이", "가")} 있습니다. 이 ${place}의 ${stuff.name} 수를 나타내는 데 그림을 모두 ${n(f.total)}개 그렸다면 큰 그림은 몇 개인지 쓰시오.`,
    `${head} 어느 ${place}의 ${stuff.name} 수를 큰 그림과 작은 그림을 합해 ${n(f.total)}개로 나타냈고, 그 수는 ${n(f.L)}${stuff.unit}보다 많고 ${n(f.U)}${stuff.unit}보다 적습니다. 큰 그림은 몇 개 그렸는지 구하시오.`,
  ]);
  const half = Math.ceil(f.vals.length / 2);
  const line = (from: number, to: number): string =>
    expr(
      f.vals
        .slice(from, to)
        .map((v, i) => `10\\times${from + i}+${f.total - from - i}=${v}`)
        .join(",\\ "),
    );
  return makeDeep(unit, stem, n(f.big), [
    `그림이 모두 ${n(f.total)}개이므로 작은 그림은 어느 경우에도 ${n(9)}개를 넘지 않습니다. 그래서 큰 그림 수를 ${n(0)}개부터 차례로 늘려 가며 나타내는 수를 만들어 봅니다.`,
    `${line(0, half)}, ${line(half, f.vals.length)} 입니다.`,
    `이 가운데 ${n(f.L)} 보다 크고 ${n(f.U)} 보다 작은 수는 ${n(f.value)} 뿐이므로 큰 그림은 ${n(f.big)}개, 작은 그림은 ${n(f.small)}개입니다.`,
  ]);
}

// ── 2-3 원 (D-72 확대) ──────────────────────────────────────────────────
//
// **그림 결정은 09 §2.2 결정표를 갈래마다 다시 물어서 정했다.** 「심화가 그림을 더
// 많이 쓴다」가 아니다 — 갈래가 바꾸는 것은 «학생이 할 일»이고 그림은 그 일을
// 대신하면 안 된다. 실측(elem-figures, 2026-08-24)으로 **갈래에 그림이 없는 것이
// 섞이는 소단원이 76%** 다. 「이 갈래엔 그림이 없다」는 결함이 아니다.
//
// | 갈래 | 2-3-1 용어 | 2-3-2 성질 | 2-3-3 원 그리기 |
// |---|---|---|---|
// | 연산 | `show` 선분 | 준 쪽 치수 | **없음** |
// | 기본 | **없음** | 준 쪽 치수 | **없음** |
// | 응용 | **없음** | 준 쪽 치수 | **없음** |
// | 심화 | **없음** | 준 쪽 치수 | **없음** |
//
// **까닭 — ①②를 무는 일반 판정기가 없다.** 값 검산도 렌더도 KaTeX 도 다 초록이다.
// 그래서 여기 적어 둔다. 다음 사람이 되돌리는 것을 막는 유일한 장치다(09 §2.2).
//
//  · **2-3-1** — 답이 «낱말»이라 `show`(선분만, 글자 없음)가 안전하다(규칙 ⑤).
//    「그 선분이 무엇인지 **알아내는 것**」이 문제의 일부가 아니라 **이름을 붙이는 것**이
//    일이기 때문이다. ⚠️ 2·3·4단은 **말로만** 성질을 묻는다 — 그리면 나를 것이 없다(③).
//  · **2-3-2** — 준 쪽만 적는다(①). 묻는 쪽을 적으면 답이 지면에 있다.
//    4단은 원이 둘인데 `circleParts` 는 하나뿐이라 **큰 원의 준 값만** 적는다.
//  · **2-3-3** — 어느 갈래에도 **안 붙인다.** 「벌린 길이 = 반지름」이 숨은 첫 단계라
//    치수를 적으면 그림이 그 단계를 대신하고(②), 안 적으면 맨 원이라 나를 것이 없다(③).

/* ── 2-3-1 원의 중심, 지름, 반지름 ── */

/** 1단 — 그려 놓고 **이름을 묻는다.** 그림이 답을 말하지 않는다(답이 낱말이다). */
function circ231Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const isDia = intBetween(rng, 0, 1) === 1;
  return make(
    unit,
    `그림에서 굵게 그린 선분의 이름을 쓰시오.`,
    isDia ? "지름" : "반지름",
    isDia
      ? "원의 중심을 지나 원 위의 두 점을 이은 선분이 지름입니다."
      : "원의 중심과 원 위의 한 점을 이은 선분이 반지름입니다.",
    circleFig(isDia ? "showDiameter" : "showRadius"),
  );
}

/**
 * 2단 — **성질을 말로** 묻는다. 그림을 안 붙인다.
 *
 * 「한 원에서 반지름은 모두 같다」는 **여러 개를 그려야** 보이는데 `circleParts` 는
 * 선분을 하나만 그린다. 하나만 그리면 나를 것이 없다(③).
 */
function circ231Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 3, 6);
  const isDia = intBetween(rng, 0, 1) === 1;
  const name = isDia ? "지름" : "반지름";
  return make(
    unit,
    `한 원에 ${name}${josa(name, "을", "를")} ${n(many)}개 그었습니다. 그은 선분들의 길이는 어떠한지 쓰시오.`,
    "모두 같습니다",
    `한 원에서 ${name}${josa(name, "은", "는")} 모두 길이가 같습니다. 따라서 ${n(many)}개의 길이가 모두 같습니다.`,
  );
}

/** 3단 — 성질에서 **거꾸로 이름을 찾는다**(두 단계). */
function circ231Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 5);
  return make(
    unit,
    `한 원에 지름을 ${n(many)}개 그었더니 ${n(many)}개가 모두 한 점에서 만났습니다. 이 점을 무엇이라고 하는지 쓰시오.`,
    "원의 중심",
    `지름은 원의 중심을 지나는 선분입니다. 그러므로 지름을 여러 개 그으면 모두 원의 중심에서 만납니다.`,
  );
}

/**
 * 4단 — 조건 **둘**을 겹쳐 이름을 찾고, 그 성질까지 묻는다.
 *
 * ⚠️ 「두 조건」이라 부르고 조건을 안 적으면 `elemStemSelfContained` 가 문다.
 *    여기서는 조건을 발문이 **글자로** 다 적는다.
 */
function circ231Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 4);
  return make(
    unit,
    `어떤 선분이 「원 위의 두 점을 잇는다」와 「원의 중심을 지난다」를 모두 만족합니다. 이 선분의 이름을 쓰고, 한 원에 이런 선분을 ${n(many)}개 그었을 때 그 길이가 어떠한지 함께 쓰시오.`,
    "지름, 모두 같습니다",
    `원 위의 두 점을 이으면서 원의 중심을 지나는 선분이 지름입니다. 한 원에서 지름은 모두 길이가 같으므로 ${n(many)}개의 길이가 모두 같습니다.`,
  );
}

/** 문형 01 — 그림에서 굵은 선분의 이름. 번호를 넣어 변형 3개를 채운다. */
function circ231NameVar(unit: UnitSeed, rng: Rng): ElemProblem {
  const isDia = intBetween(rng, 0, 1) === 1;
  return make(
    unit,
    `그림에서 굵게 그린 선분의 이름을 쓰시오.`,
    isDia ? "지름" : "반지름",
    isDia
      ? "원의 중심을 지나 원 위의 두 점을 이은 선분이 지름입니다."
      : "원의 중심과 원 위의 한 점을 이은 선분이 반지름입니다.",
    circleFig(isDia ? "showDiameter" : "showRadius"),
  );
}

/** 문형 05 — 정의: 중심과 원 위 한 점. */
function circ231DefRadius(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `원의 중심과 원 위의 한 점을 이은 선분을 무엇이라고 합니까? 한 원에 이런 선분을 ${n(many)}개 그을 수 있습니다.`,
    "반지름",
    `원의 중심과 원 위의 한 점을 이은 선분이 반지름입니다.`,
  );
}

/** 문형 06 — 정의: 원 위 두 점 + 중심을 지남. */
function circ231DefDiameter(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `원 위의 두 점을 잇고 원의 중심을 지나는 선분을 무엇이라고 합니까? 한 원에 이런 선분을 ${n(many)}개 그을 수 있습니다.`,
    "지름",
    `원 위의 두 점을 잇고 원의 중심을 지나는 선분이 지름입니다.`,
  );
}

/** 문형 07 — 지름의 중점. */
function circ231Midpoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 원에 지름을 ${n(many)}개 그었습니다. 모든 지름의 중점을 무엇이라고 합니까?`,
    "원의 중심",
    `지름은 원의 중심을 지나므로 지름의 중점은 원의 중심입니다.`,
  );
}

/** 문형 08 — 가장 긴 현. */
function circ231Longest(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 3, 7);
  return make(
    unit,
    `한 원에 현을 ${n(many)}개 그었습니다. 이 가운데 가장 길 수 있는 현의 이름을 쓰시오.`,
    "지름",
    `한 원에서 가장 긴 현은 지름입니다.`,
  );
}

/** 문형 09 — 반대 방향 반지름 둘을 이으면. */
function circ231TwoRadii(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 원에 반지름을 ${n(many)}개 그었습니다. 그중 중심에서 서로 반대 방향인 두 개를 이은 선분을 무엇이라고 합니까?`,
    "지름",
    `중심에서 반대 방향인 반지름 두 개를 이으면 지름이 됩니다.`,
  );
}

/** 문형 10 — 지름을 반으로 접으면. */
function circ231FoldHalf(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 5);
  return make(
    unit,
    `한 원에 지름을 ${n(many)}개 그었습니다. 그중 하나를 중점에서 반으로 접으면 생기는 선분을 무엇이라고 합니까?`,
    "반지름",
    `지름의 중점은 원의 중심이므로 반으로 접은 선분은 반지름입니다.`,
  );
}

/* ── 문형 10 (기존 4단은 01–04 로만 감싼다. 핸들러 본체는 안 고친다.) ── */

// 문형 05~09 에 붙던 세로셈(`addCol`·`subCol`)은 걷었다 — 발문의 식을 그대로 한 번 더 그렸다(원장님 2026-10-20 지면 전수 검사).

/** 문형 05 — 합의 백의 자리. 합 전체가 아니라 자리 하나를 묻는다. */
function add111Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 0, 1);
  const s = a + b;
  const h = Math.floor(s / 100);
  return make(
    unit,
    `$${a}+${b}$ 의 합에서 백의 자리 숫자를 쓰시오.`,
    n(h),
    `${expr(`${a}+${b}=${s}`)} 이므로 백의 자리 숫자는 ${n(h)} 입니다.`,
  );
}

/** 문형 06 — 빈칸 가수. 합을 주고 한 수를 되묻는다(한 걸음). */
function add111Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 0, 1);
  const s = a + b;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square+${b}=${s}$`,
      n(a),
      `합에서 아는 수를 뺍니다. ${expr(`${s}-${b}=${a}`)} 이므로 ${n(a)} 입니다.`,
    );
  }
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}+\\square=${s}$`,
    n(b),
    `합에서 아는 수를 뺍니다. ${expr(`${s}-${a}=${b}`)} 이므로 ${n(b)} 입니다.`,
  );
}

/** 문형 07 — 일의 자리 숫자끼리의 합(받아올림 전). */
function add111OnesSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 0, 1);
  const ones = (a % 10) + (b % 10);
  return make(
    unit,
    `$${a}$ 의 일의 자리 숫자와 $${b}$ 의 일의 자리 숫자를 더한 값을 쓰시오.`,
    n(ones),
    `일의 자리 숫자는 ${n(a % 10)} 과 ${n(b % 10)} 이므로 ${expr(`${a % 10}+${b % 10}=${ones}`)} 입니다.`,
  );
}

/** 문형 08 — 합이 어떤 수보다 얼마 큰가(더하고 빼기). */
function add111HowMuchMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 0, 1);
  const s = a + b;
  const c = intBetween(rng, 100, Math.max(100, s - 11));
  return make(
    unit,
    `$${a}+${b}$ 의 합은 $${c}$ 보다 얼마 더 큽니까?`,
    n(s - c),
    `먼저 합을 구합니다. ${expr(`${a}+${b}=${s}`)} 입니다. 차는 ${expr(`${s}-${c}=${s - c}`)} 입니다.`,
  );
}

/** 문형 09 — 합보다 100 큰 수. */
function add111Plus100(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 0, 1);
  const s = a + b;
  return make(
    unit,
    `$${a}$ 와 $${b}$ 의 합보다 $${100}$ 큰 수를 쓰시오.`,
    n(s + 100),
    `${expr(`${a}+${b}=${s}`)} 이고, ${expr(`${s}+100=${s + 100}`)} 입니다.`,
  );
}

/** 문형 10 — 합이 짝수인지 홀수인지. */
function add111EvenOdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOdd = altCase(rng);
  let a = 0;
  let b = 0;
  for (let k = 0; k < 80; k += 1) {
    [a, b] = addWithCarries(rng, 0, 1);
    if (((a + b) % 2 === 1) === wantOdd) break;
  }
  if (((a + b) % 2 === 1) !== wantOdd) {
    a = a % 10 < 9 ? a + 1 : a - 1;
  }
  const s = a + b;
  const even = s % 2 === 0;
  return make(
    unit,
    `$${a}+${b}$ 의 합은 짝수입니까, 홀수입니까?`,
    even ? "짝수" : "홀수",
    `${expr(`${a}+${b}=${s}`)} 이므로 ${even ? "짝수" : "홀수"}입니다.`,
  );
}

/** 문형 05 — 합이 몇 자리인가. 1-1-1 의 백의 자리와 다른 물음. */
function add112Digits(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 2, 3);
  const s = a + b;
  const digitsN = String(s).length;
  return make(
    unit,
    `$${a}+${b}$ 의 합은 몇 자리 수입니까?`,
    n(digitsN),
    `${expr(`${a}+${b}=${s}`)} 이므로 ${n(digitsN)} 자리 수입니다.`,
  );
}

/** 문형 06 — 어떤 수에 a 를 더하면 s. 1-1-1 빈칸 식과 말투를 가른다. */
function add112Unknown(unit: UnitSeed, rng: Rng): ElemProblem {
  const [x, a] = addWithCarries(rng, 2, 3);
  const s = x + a;
  return make(
    unit,
    `어떤 수에 $${a}$ 를 더했더니 $${s}$ 가 되었습니다. 어떤 수는 얼마입니까?`,
    n(x),
    `합에서 더한 수를 뺍니다. ${expr(`${s}-${a}=${x}`)} 이므로 어떤 수는 ${n(x)} 입니다.`,
  );
}

/** 문형 07 — 받아올림 횟수. 이 소단원은 두 번 또는 세 번. */
function add112CarryCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 2, 3);
  const c = carryCount(a, b);
  return make(
    unit,
    `$${a}+${b}$ 를 계산할 때 받아올림은 몇 번 있습니까?`,
    n(c),
    `일의 자리, 십의 자리, 백의 자리에서 받아올림을 세면 ${n(c)} 번입니다.`,
  );
}

/** 문형 08 — 합과 1000 의 차. */
function add112From1000(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 2, 3);
  const s = a + b;
  const gap = Math.abs(1000 - s);
  return make(
    unit,
    `$${a}+${b}$ 의 합과 $${1000}$ 의 차는 얼마입니까?`,
    n(gap),
    `${expr(`${a}+${b}=${s}`)} 이고, ${s >= 1000 ? expr(`${s}-1000=${gap}`) : expr(`1000-${s}=${gap}`)} 입니다.`,
  );
}

/** 문형 09 — 합보다 10 작은 수. 1-1-1 의 +100 과 방향을 가른다. */
function add112Minus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = addWithCarries(rng, 2, 3);
  const s = a + b;
  return make(
    unit,
    `$${a}$ 와 $${b}$ 의 합보다 $${10}$ 작은 수를 쓰시오.`,
    n(s - 10),
    `${expr(`${a}+${b}=${s}`)} 이고, ${expr(`${s}-10=${s - 10}`)} 입니다.`,
  );
}

/** 문형 10 — 두 합 가운데 더 큰 값. */
function add112BiggerSum(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  let s1 = 0;
  let s2 = 0;
  for (let k = 0; k < 80; k += 1) {
    [a, b] = addWithCarries(rng, 2, 3);
    [c, d] = addWithCarries(rng, 2, 3);
    s1 = a + b;
    s2 = c + d;
    if (s1 !== s2) break;
  }
  const big = Math.max(s1, s2);
  return make(
    unit,
    `$${a}+${b}$ 의 합과 $${c}+${d}$ 의 합 가운데 더 큰 수를 쓰시오.`,
    n(big),
    `${expr(`${a}+${b}=${s1}`)}, ${expr(`${c}+${d}=${s2}`)} 이므로 더 큰 수는 ${n(big)} 입니다.`,
  );
}

/** 문형 05 — 차의 백의 자리. */
function sub113Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 0, 1);
  const d = a - b;
  const h = Math.floor(d / 100);
  return make(
    unit,
    `$${a}-${b}$ 의 차에서 백의 자리 숫자를 쓰시오.`,
    n(h),
    `${expr(`${a}-${b}=${d}`)} 이므로 백의 자리 숫자는 ${n(h)} 입니다.`,
  );
}

/** 문형 06 — 빈칸 피감수. */
function sub113MissingMinuend(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 0, 1);
  const d = a - b;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square-${b}=${d}$`,
    n(a),
    `차에 뺀 수를 더합니다. ${expr(`${d}+${b}=${a}`)} 이므로 ${n(a)} 입니다.`,
  );
}

/** 문형 07 — 일의 자리끼리 뺀 값(받아내림하면). 05 와 한 낱말만 다르지 않게. */
function sub113OnesDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 0, 1);
  const ones = (a - b) % 10;
  // 받아내림이 없는 씨앗에는 «받아내림하여»를 쓰지 않는다 — `7-7` 인데 받아내림을 시켰다(Codex 검토 2026-10-20).
  const borrow = a % 10 < b % 10 ? "받아내림하여 " : "";
  return make(
    unit,
    `$${a}$ 의 일의 자리 숫자에서 $${b}$ 의 일의 자리 숫자를 ${borrow}뺀 값을 쓰시오.`,
    n(ones),
    `차 ${expr(`${a}-${b}=${a - b}`)} 의 일의 자리와 같습니다. 값은 ${n(ones)} 입니다.`,
  );
}

/** 문형 08 — 차보다 10 큰 수. */
function sub113Plus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 0, 1);
  const d = a - b;
  return make(
    unit,
    `$${a}$ 에서 $${b}$ 를 뺀 값보다 $${10}$ 큰 수를 쓰시오.`,
    n(d + 10),
    `${expr(`${a}-${b}=${d}`)} 이고, ${expr(`${d}+10=${d + 10}`)} 입니다.`,
  );
}

/** 문형 09 — 차가 어떤 수보다 얼마 큰가. */
function sub113HowMuchMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 0, 1);
  const d = a - b;
  const hi = Math.max(1, d - 1);
  const lo = d > 40 ? intBetween(rng, 10, Math.min(100, d - 5)) : 0;
  const c = lo === 0 ? intBetween(rng, 1, hi) : lo;
  return make(
    unit,
    `$${a}-${b}$ 의 차는 $${c}$ 보다 얼마 더 큽니까?`,
    n(d - c),
    `먼저 차를 구합니다. ${expr(`${a}-${b}=${d}`)} 입니다. 차는 ${expr(`${d}-${c}=${d - c}`)} 입니다.`,
  );
}

/** 문형 10 — 차의 각 자리 숫자의 합. */
function sub113DigitSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 0, 1);
  const d = a - b;
  const sum = [...String(d)].reduce((s, ch) => s + Number(ch), 0);
  return make(
    unit,
    `$${a}-${b}$ 의 차에서 각 자리 숫자를 모두 더한 값을 쓰시오.`,
    n(sum),
    `${expr(`${a}-${b}=${d}`)} 이고, 각 자리 숫자의 합은 ${n(sum)} 입니다.`,
  );
}

/** 문형 05 — 차의 십의 자리. 1-1-3 의 백의 자리와 가른다. */
function sub114Tens(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 2, 2);
  const d = a - b;
  const t = Math.floor(d / 10) % 10;
  return make(
    unit,
    `$${a}-${b}$ 의 차에서 십의 자리 숫자를 쓰시오.`,
    n(t),
    `${expr(`${a}-${b}=${d}`)} 이므로 십의 자리 숫자는 ${n(t)} 입니다.`,
  );
}

/** 문형 06 — 빈칸 감수. 1-1-3 은 피감수를 묻는다. */
function sub114MissingSubtrahend(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 2, 2);
  const d = a - b;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}-\\square=${d}$`,
    n(b),
    `처음 수에서 차를 뺍니다. ${expr(`${a}-${d}=${b}`)} 이므로 ${n(b)} 입니다.`,
  );
}

/** 문형 07 — 백의 자리 숫자끼리의 차(받아내림 전). */
function sub114HundredsBare(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 0;
  let b = 0;
  for (let k = 0; k < 80; k += 1) {
    [a, b] = subWithBorrows(rng, 2, 2);
    if (Math.floor(a / 100) >= Math.floor(b / 100)) break;
  }
  const ha = Math.floor(a / 100);
  const hb = Math.floor(b / 100);
  return make(
    unit,
    `$${a}$ 의 백의 자리 숫자에서 $${b}$ 의 백의 자리 숫자를 뺀 값을 쓰시오.`,
    n(ha - hb),
    `백의 자리 숫자는 ${n(ha)} 과 ${n(hb)} 이므로 ${expr(`${ha}-${hb}=${ha - hb}`)} 입니다.`,
  );
}

/** 문형 08 — 차에 100 을 더한 수. */
function sub114Plus100(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = subWithBorrows(rng, 2, 2);
  const d = a - b;
  return make(
    unit,
    `$${a}-${b}$ 의 차에 $${100}$ 을 더한 수를 쓰시오.`,
    n(d + 100),
    `${expr(`${a}-${b}=${d}`)} 이고, ${expr(`${d}+100=${d + 100}`)} 입니다.`,
  );
}

/** 문형 09 — 차와 100 의 차. */
function sub114From100(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 0;
  let b = 0;
  let d = 0;
  for (let k = 0; k < 80; k += 1) {
    [a, b] = subWithBorrows(rng, 2, 2);
    d = a - b;
    if (d !== 100) break;
  }
  const gap = Math.abs(d - 100);
  return make(
    unit,
    `$${a}-${b}$ 의 차와 $${100}$ 의 차는 얼마입니까?`,
    n(gap),
    `${expr(`${a}-${b}=${d}`)} 이고, ${d >= 100 ? expr(`${d}-100=${gap}`) : expr(`100-${d}=${gap}`)} 입니다.`,
  );
}

/** 문형 10 — 두 차 가운데 더 작은 값. */
function sub114SmallerDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 0;
  let b = 0;
  let c = 0;
  let d = 0;
  let x = 0;
  let y = 0;
  for (let k = 0; k < 80; k += 1) {
    [a, b] = subWithBorrows(rng, 2, 2);
    [c, d] = subWithBorrows(rng, 2, 2);
    x = a - b;
    y = c - d;
    if (x !== y) break;
  }
  const small = Math.min(x, y);
  return make(
    unit,
    `$${a}-${b}$ 의 차와 $${c}-${d}$ 의 차 가운데 더 작은 수를 쓰시오.`,
    n(small),
    `${expr(`${a}-${b}=${x}`)}, ${expr(`${c}-${d}=${y}`)} 이므로 더 작은 수는 ${n(small)} 입니다.`,
  );
}

function line121Dots(rng: Rng): { layout: Pt[]; k: number; letters: string[] } {
  const layout = pick(rng, DOT_LAYOUTS);
  const k = layout.length;
  return { layout, k, letters: LINE_LETTERS.slice(0, k).map(String) };
}

/** 문형 05 — 정의: 두 점을 곧게 이은 선. */
function line121DefSeg(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `두 점을 곧게 이은 선을 무엇이라고 합니까? 그런 선을 ${n(many)}개 그을 수 있습니다.`,
    "선분",
    `두 점을 곧게 이은 선이 선분입니다.`,
  );
}

/** 문형 06 — 정의: 한쪽으로만 끝없이. */
function line121DefRay(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 점에서 출발하여 한쪽으로만 끝없이 늘인 곧은 선을 무엇이라고 합니까? 출발점을 ${n(many)}개 고를 수 있습니다.`,
    "반직선",
    `한쪽으로만 끝없이 늘인 곧은 선이 반직선입니다.`,
  );
}

/** 문형 07 — 정의: 양쪽으로 끝없이. */
function line121DefLine(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `양쪽으로 끝없이 늘인 곧은 선을 무엇이라고 합니까? 그런 선을 ${n(many)}개 그을 수 있습니다.`,
    "직선",
    `양쪽으로 끝없이 늘인 곧은 선이 직선입니다.`,
  );
}

/** 문형 08 — 반직선 수. 선분(03)과 답이 다르다. */
function line121RayCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { layout, k, letters } = line121Dots(rng);
  const rays = k * (k - 1);
  return make(
    unit,
    `그림에 점이 ${n(k)}개 있습니다. 한 점에서 출발하여 다른 점 쪽으로 끝없이 그을 수 있는 반직선은 모두 몇 개인지 쓰시오.`,
    n(rays),
    `한 점마다 나머지 ${n(k - 1)}개 쪽으로 반직선을 그을 수 있습니다. ${expr(`${k}\\times${k - 1}=${rays}`)} 개입니다.`,
    dotsOnly(layout, letters),
  );
}

/** 문형 09 — 점 하나를 지운 뒤 선분 수. 04 는 점을 더한다. */
function line121RemovePoint(unit: UnitSeed, rng: Rng): ElemProblem {
  const { layout, k, letters } = line121Dots(rng);
  const left = k - 1;
  const segs = (left * (left - 1)) / 2;
  return make(
    unit,
    `그림에 점이 ${n(k)}개 있습니다. 그중 한 점을 지우면 남은 점으로 그을 수 있는 선분은 모두 몇 개인지 쓰시오.`,
    n(segs),
    `점이 ${n(left)}개 남으므로 ${expr(`${left}\\times${left - 1}\\div2=${segs}`)} 개입니다.`,
    dotsOnly(layout, letters),
  );
}

/** 문형 10 — 반직선 수와 선분 수의 합. */
function line121RayPlusSeg(unit: UnitSeed, rng: Rng): ElemProblem {
  const { layout, k, letters } = line121Dots(rng);
  const rays = k * (k - 1);
  const segs = (k * (k - 1)) / 2;
  return make(
    unit,
    `그림에 점이 ${n(k)}개 있습니다. 그을 수 있는 반직선의 수와 선분의 수를 더한 값을 쓰시오.`,
    n(rays + segs),
    `반직선은 ${expr(`${k}\\times${k - 1}=${rays}`)} 개, 선분은 ${expr(`${k}\\times${k - 1}\\div2=${segs}`)} 개이므로 합은 ${expr(`${rays}+${segs}=${rays + segs}`)} 입니다.`,
    dotsOnly(layout, letters),
  );
}

/** 문형 05 — 직각인 각의 개수. 01 은 기호를 고른다. */
function ang122RightCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 3, 4);
  const rightCount = intBetween(rng, 1, count - 1);
  const row = angleRow(rng, count, rightCount);
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 가운데 직각인 각은 모두 몇 개인지 쓰시오.`,
    n(rightCount),
    `직각인 각은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 06 — 직각이 아닌 각의 기호. */
function ang122NotRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 3, 4);
  const rightCount = intBetween(rng, 1, count - 1);
  const row = angleRow(rng, count, rightCount);
  const other = row.labels.filter((l) => !row.rightLabels.includes(l));
  const ans = pick(rng, other);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 직각이 아닌 각의 기호를 쓰시오.`,
    ans,
    `직각이 아닌 각은 ${other.join(", ")} 입니다. 그중 ${ans} 를 고릅니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 07 — 정의: 두 변이 반듯하게 만나는 각. */
function ang122Def(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `두 반직선이 한 점에서 반듯하게 만나 이루는 각을 무엇이라고 합니까? 그런 각을 ${n(many)}개 그릴 수 있습니다.`,
    "직각",
    `두 반직선이 반듯하게 만나 이루는 각이 직각입니다.`,
  );
}

/** 문형 08 — 직각이 아닌 각의 개수. */
function ang122OtherCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 3, 4);
  const rightCount = intBetween(rng, 1, count - 1);
  const row = angleRow(rng, count, rightCount);
  const other = count - rightCount;
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 가운데 직각이 아닌 각은 모두 몇 개인지 쓰시오.`,
    n(other),
    `전체 ${n(count)}개에서 직각 ${n(rightCount)}개를 빼면 ${expr(`${count}-${rightCount}=${other}`)} 개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 09 — 직각인 각의 기호를 모두. 둘을 고르게 하여 01 과 가른다. */
function ang122AllRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = angleRow(rng, 3, 2);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 직각인 각의 기호를 모두 쓰시오.`,
    row.rightLabels.join(", "),
    `직각인 각은 ${row.rightLabels.join(", ")} 입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 10 — 각을 이루는 변의 수. 각마다 변 둘. */
function ang122Rays(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 4);
  const rightCount = intBetween(rng, 1, Math.max(1, count - 1));
  const row = angleRow(rng, count, rightCount);
  return make(
    unit,
    `${row.labels.join(", ")} 각을 각각 이루는 변이 2개일 때, 변은 모두 몇 개인지 쓰시오.`,
    n(2 * count),
    `각 ${n(count)}개에 변이 각각 2개이므로 ${expr(`${count}\\times2=${2 * count}`)} 개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 05 — 직각삼각형 개수. 01 은 기호를 고른다. */
function tri123RightCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = triangleRow(rng, count, rightCount);
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 가운데 직각삼각형은 모두 몇 개인지 쓰시오.`,
    n(rightCount),
    `직각삼각형은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 06 — 직각삼각형이 아닌 기호. */
function tri123NotRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = triangleRow(rng, count, rightCount);
  const other = row.labels.filter((l) => !row.rightLabels.includes(l));
  const ans = pick(rng, other);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 직각삼각형이 아닌 삼각형의 기호를 쓰시오.`,
    ans,
    `직각삼각형이 아닌 것은 ${other.join(", ")} 입니다. 그중 ${ans} 를 고릅니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 07 — 정의. */
function tri123Def(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 각이 직각인 삼각형을 무엇이라고 합니까? 그런 삼각형을 ${n(many)}개 그릴 수 있습니다.`,
    "직각삼각형",
    `한 각이 직각인 삼각형이 직각삼각형입니다.`,
  );
}

/** 문형 08 — 직각삼각형만 모아 변의 수. 03 은 아닌 개수, 10 은 모든 꼭짓점. */
function tri123RightSides(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = triangleRow(rng, count, rightCount);
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 가운데 직각삼각형의 변은 모두 몇 개인지 쓰시오.`,
    n(3 * rightCount),
    `직각삼각형은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개이고, 변은 각각 3개이므로 ${expr(`${rightCount}\\times3=${3 * rightCount}`)} 개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 09 — 직각삼각형 기호를 모두. 둘을 고르게 한다. */
function tri123AllRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = triangleRow(rng, 3, 2);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 직각삼각형의 기호를 모두 쓰시오.`,
    row.rightLabels.join(", "),
    `직각삼각형은 ${row.rightLabels.join(", ")} 입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

/** 문형 10 — 꼭짓점 수. 삼각형마다 셋. */
function tri123Vertices(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 3);
  const rightCount = intBetween(rng, 1, Math.max(1, count - 1));
  const row = triangleRow(rng, count, rightCount);
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 삼각형 ${n(count)}개의 꼭짓점은 모두 몇 개인지 쓰시오.`,
    n(3 * count),
    `삼각형 ${n(count)}개에 꼭짓점이 각각 3개이므로 ${expr(`${count}\\times3=${3 * count}`)} 개입니다.`,
    pointGridSpec(row.cols, 2, row.shapes),
  );
}

const RECT_THINGS = [
  "액자",
  "공책",
  "칠판",
  "책상",
  "손수건",
  "게시판",
  "창문",
  "카드",
] as const;

function rectWH(rng: Rng): { w: number; h: number } {
  const w = intBetween(rng, 4, 12);
  const h = pick(
    rng,
    [2, 3, 5, 6, 7, 8, 9].filter((v) => v !== w),
  );
  return { w, h };
}

/** 문형 05 — 직사각형이 아닌 개수. 01 은 기호를 고른다. */
function rect124OtherCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = rectRow(rng);
  const other = row.labels.length - 1;
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 가운데 직사각형이 아닌 도형은 모두 몇 개인지 쓰시오.`,
    n(other),
    `직사각형은 ${row.answer} 하나이므로 아닌 도형은 ${n(other)}개입니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 문형 06 — 직사각형이 아닌 기호. */
function rect124NotRect(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = rectRow(rng);
  const other = row.labels.filter((l) => l !== row.answer);
  const ans = pick(rng, other);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 직사각형이 아닌 도형의 기호를 쓰시오.`,
    ans,
    `직사각형은 ${row.answer} 입니다. 아닌 것 가운데 ${ans} 를 고릅니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 문형 07 — 정의. */
function rect124Def(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `네 각이 모두 직각인 사각형을 무엇이라고 합니까? 그런 사각형을 ${n(many)}개 그릴 수 있습니다.`,
    "직사각형",
    `네 각이 모두 직각인 사각형이 직사각형입니다.`,
  );
}

/** 문형 08 — 가로 두 변의 합. 03 은 네 변의 합. */
function rect124TwoWidths(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, h } = rectWH(rng);
  const thing = pick(rng, RECT_THINGS);
  return make(
    unit,
    `가로가 ${n(w)} cm, 세로가 ${n(h)} cm인 직사각형 모양 ${thing}에서 가로 두 변의 길이의 합은 몇 cm인지 쓰시오.`,
    n(2 * w),
    `가로는 마주 보는 두 변이 ${n(w)} cm이므로 ${expr(`${w}+${w}=${2 * w}`)} 입니다.`,
  );
}

/** 문형 09 — 세로 두 변의 합. 08 과 묻는 변이 다르다. */
function rect124TwoHeights(unit: UnitSeed, rng: Rng): ElemProblem {
  const { w, h } = rectWH(rng);
  const thing = pick(rng, RECT_THINGS);
  return make(
    unit,
    `가로 ${n(w)} cm, 세로 ${n(h)} cm인 직사각형의 세로를 두 번 더한 값은 몇 cm입니까?`,
    n(2 * h),
    `세로 ${n(h)} cm를 두 번 더하면 ${expr(`${h}+${h}=${2 * h}`)} 입니다.`,
  );
}

/** 문형 10 — 직사각형 n개의 직각 수. */
function rect124RightAngles(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `직사각형 ${n(many)}개의 각은 모두 직각입니다. 직각은 모두 몇 개인지 쓰시오.`,
    n(4 * many),
    `직사각형 한 개에 직각이 4개이므로 ${expr(`${many}\\times4=${4 * many}`)} 개입니다.`,
  );
}

const SQ_THINGS = [
  "색종이",
  "손수건",
  "액자",
  "타일",
  "방석",
  "게시판",
  "창문",
  "스케치북",
] as const;

/** 문형 05 — 정사각형이 아닌 개수. */
function sq125OtherCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = squareRow(rng);
  const other = row.labels.length - 1;
  return make(
    unit,
    `그림에서 ${row.labels.join(", ")} 가운데 정사각형이 아닌 도형은 모두 몇 개인지 쓰시오.`,
    n(other),
    `정사각형은 ${row.answer} 하나이므로 아닌 도형은 ${n(other)}개입니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 문형 06 — 정사각형이 아닌 기호. */
function sq125NotSq(unit: UnitSeed, rng: Rng): ElemProblem {
  const row = squareRow(rng);
  const other = row.labels.filter((l) => l !== row.answer);
  const ans = pick(rng, other);
  return make(
    unit,
    `${row.labels.join(", ")} 중에서 정사각형이 아닌 도형의 기호를 쓰시오.`,
    ans,
    `정사각형은 ${row.answer} 입니다. 아닌 것 가운데 ${ans} 를 고릅니다.`,
    pointGridSpec(row.cols, row.rows, row.shapes),
  );
}

/** 문형 07 — 정의. */
function sq125Def(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `네 각이 모두 직각이고 네 변의 길이가 모두 같은 사각형을 무엇이라고 합니까? 그런 사각형을 ${n(many)}개 그릴 수 있습니다.`,
    "정사각형",
    `네 각이 직각이고 네 변이 같은 사각형이 정사각형입니다.`,
  );
}

/** 문형 08 — 마주 보는 두 변의 합. 03 은 네 변의 합. */
function sq125OppSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 9);
  const thing = pick(rng, SQ_THINGS);
  return make(
    unit,
    `한 변의 길이가 ${n(side)} cm인 정사각형 모양 ${thing}에서 마주 보는 두 변의 길이의 합은 몇 cm인지 쓰시오.`,
    n(2 * side),
    `마주 보는 두 변은 각각 ${n(side)} cm이므로 ${expr(`${side}+${side}=${2 * side}`)} 입니다.`,
  );
}

/** 문형 09 — 정사각형 n개의 변의 수. */
function sq125SideCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `정사각형 ${n(many)}개의 변은 모두 몇 개인지 쓰시오.`,
    n(4 * many),
    `정사각형 한 개에 변이 4개이므로 ${expr(`${many}\\times4=${4 * many}`)} 개입니다.`,
  );
}

/** 문형 10 — 네 변의 합에서 한 변을 뺀 값. */
function sq125PerimMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 9);
  const thing = pick(rng, SQ_THINGS);
  return make(
    unit,
    `한 변의 길이가 ${n(side)} cm인 정사각형 모양 ${thing}의 네 변의 길이의 합에서 한 변의 길이를 빼면 몇 cm인지 쓰시오.`,
    n(3 * side),
    `네 변의 합은 ${expr(`${side}\\times4=${4 * side}`)} 이고, 한 변을 빼면 ${expr(`${4 * side}-${side}=${3 * side}`)} 입니다.`,
  );
}

/** 문형 05 — 곱셈으로 검산하면 나뉘는 수. */
function div131Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$${a}\\div${b}=${q}$ 입니다. $${b}\\times${q}$ 의 값을 쓰시오.`,
    n(a),
    `나눗셈을 곱셈으로 검산하면 ${expr(`${b}\\times${q}=${a}`)} 입니다.`,
  );
}

/** 문형 06 — 빈칸 나누는 수. */
function div131MissingDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}\\div\\square=${q}$`,
    n(b),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(b)} 입니다.`,
  );
}

/** 문형 07 — 빈칸 나뉘는 수. */
function div131MissingDividend(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square\\div${b}=${q}$`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${n(a)} 입니다.`,
  );
}

/** 문형 08 — 포함제. 02 는 한 명 몫(등분), 여기는 몇 묶음. */
function div131HowManyGroups(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const thing = pick(rng, SHARE_STUFF);
  return make(
    unit,
    `${thing} ${n(a)}개를 한 묶음에 ${n(q)}개씩 담으면 몇 묶음이 되는지 쓰시오.`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 이므로 ${n(b)}묶음입니다.`,
  );
}

/** 문형 09 — 몫과 나누는 수의 크기 비교. */
function div131Compare(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const bigger = q > b ? "큽니다" : "작습니다";
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫은 나누는 수보다 큽니까, 작습니까?`,
    bigger,
    `몫은 ${n(q)}, 나누는 수는 ${n(b)} 이므로 몫이 더 ${bigger}.`,
  );
}

/** 문형 10 — 한 명 몫과 인원으로 처음 개수(등분의 역). */
function div131TotalFromShare(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const thing = pick(rng, SHARE_STUFF);
  return make(
    unit,
    `친구 ${n(b)}명이 ${thing}${josa(thing, "을", "를")} 한 명 ${n(q)}개씩 가졌습니다. ${thing}${josa(thing, "은", "는")} 모두 몇 개였습니까?`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 이므로 모두 ${n(a)}개입니다.`,
  );
}

/** 문형 05 — 곱셈식에서 만드는 나눗셈식 개수. 늘 둘. 번호를 넣어 변형을 연다. */
function div132DivCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `곱셈식 ${expr(`${b}\\times${q}=${a}`)} 에서 만들 수 있는 나눗셈식은 몇 개입니까?`,
    n(2),
    `${expr(`${a}\\div${b}=${q}`)} 와 ${expr(`${a}\\div${q}=${b}`)} 로 2개입니다.`,
  );
}

/** 문형 06 — 두 나눗셈 몫의 차. 03 은 합. */
function div132QuotDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const d = Math.abs(q - b);
  return make(
    unit,
    `곱셈식 ${expr(`${b}\\times${q}=${a}`)} 에서 만들 수 있는 나눗셈식 두 개의 몫의 차를 쓰시오.`,
    n(d),
    `${expr(`${a}\\div${b}=${q}`)}, ${expr(`${a}\\div${q}=${b}`)} 이므로 차는 ${expr(`${Math.max(q, b)}-${Math.min(q, b)}=${d}`)} 입니다.`,
  );
}

/** 문형 07 — 빈칸 곱하는 수. */
function div132MissingFactor(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${b}\\times\\square=${a}$`,
    n(q),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)} 입니다.`,
  );
}

/** 문형 08 — 세 수 가운데 곱(가장 큰 수). */
function div132Product(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$${b}$, $${q}$, $${a}$ 가운데 두 수의 곱이 되는 수를 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 곱은 ${n(a)} 입니다.`,
  );
}

/** 문형 09 — a÷q 의 몫. 01 은 a÷b 또는 a÷q 를 섞는다. 여기는 항상 a÷q. */
function div132OtherQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `곱셈식 ${expr(`${b}\\times${q}=${a}`)} 일 때 $${a}\\div${q}$ 의 몫을 쓰시오.`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 입니다.`,
  );
}

/** 문형 10 — 몫에 나누는 수를 곱하면 나뉘는 수. */
function div132Recover(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$${a}\\div${b}=${q}$ 입니다. 몫에 나누는 수를 곱한 값을 쓰시오.`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 이므로 ${n(a)} 입니다.`,
  );
}

/** 문형 05 — □×b=a 에서 몫. 01 은 b×□. */
function div133LeftBox(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square\\times${b}=${a}$`,
    n(q),
    `${expr(`${q}\\times${b}=${a}`)} 이므로 ${n(q)} 입니다.`,
  );
}

/** 문형 06 — 봉지를 준 뒤 남은 개수. 03 은 남은 봉지 수. */
function div133LeftItems(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const c = intBetween(rng, 1, q - 1);
  const thing = pick(rng, PACK_STUFF);
  const left = b * (q - c);
  return make(
    unit,
    `${thing} ${n(a)}개를 한 봉지에 ${n(b)}개씩 담은 뒤 ${n(c)}봉지를 주었습니다. 남은 ${thing}${josa(thing, "은", "는")} 몇 개인지 쓰시오.`,
    n(left),
    `${expr(`${a}\\div${b}=${q}`)} 봉지입니다. ${expr(`${q}-${c}=${q - c}`)} 봉지이므로 ${expr(`${b}\\times${q - c}=${left}`)} 개입니다.`,
  );
}

/** 문형 07 — 곱셈 검산. */
function div133Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$${a}\\div${b}=${q}$ 를 곱셈으로 검산한 식의 값을 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 입니다.`,
  );
}

/** 문형 08 — 한 봉지에 몇 개씩. 02 는 몇 봉지. */
function div133Each(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const thing = pick(rng, PACK_STUFF);
  return make(
    unit,
    `${thing} ${n(a)}개를 ${n(q)}봉지에 남김없이 똑같이 담았습니다. 한 봉지에는 몇 개씩인지 쓰시오.`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 이므로 한 봉지에 ${n(b)}개씩입니다.`,
  );
}

/** 문형 09 — 준 봉지에 담긴 개수. 06 은 남은 개수. */
function div133GivenItems(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const c = intBetween(rng, 1, q - 1);
  const thing = pick(rng, PACK_STUFF);
  return make(
    unit,
    `${thing} ${n(a)}개를 한 봉지에 ${n(b)}개씩 담아 ${n(c)}봉지를 이웃에게 주었습니다. 준 ${thing}${josa(thing, "은", "는")} 몇 개인지 쓰시오.`,
    n(b * c),
    `봉지는 ${expr(`${a}\\div${b}=${q}`)} 개입니다. 준 것은 ${expr(`${b}\\times${c}=${b * c}`)} 개입니다.`,
  );
}

/** 문형 10 — 전체에 한 봉지를 더하면. */
function div133PlusPack(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const thing = pick(rng, PACK_STUFF);
  return make(
    unit,
    `${thing} ${n(a)}개를 한 봉지에 ${n(b)}개씩 담았습니다. 같은 봉지 한 개를 더 담으면 ${thing}${josa(thing, "은", "는")} 모두 몇 개인지 쓰시오.`,
    n(a + b),
    `${expr(`${b}\\times${q}=${a}`)} 이고, ${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

/** 문형 05 — 몇 단 곱셈구구를 쓰나. */
function div134WhichTable(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫을 구할 때 이용하는 곱셈구구는 몇 단입니까?`,
    n(b),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${n(b)}단입니다.`,
  );
}

/** 문형 06 — 구구에서 곱이 a인 식의 곱하는 수. */
function div134TimesWhat(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `${n(b)}단 곱셈구구에서 곱이 ${n(a)} 인 곱셈식의 ${expr(`\\square`)} 에 알맞은 수를 쓰시오. (${expr(`${b}\\times\\square=${a}`)})`,
    n(q),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${n(q)} 입니다.`,
  );
}

/** 문형 07 — 몫×단수. */
function div134QuotTimesTable(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `$${a}\\div${b}=${q}$ 입니다. 몫과 단 수를 곱한 값을 쓰시오.`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 입니다.`,
  );
}

/** 문형 08 — 하루에 b쪽씩 q일. 02 는 며칠인지. */
function div134TotalPages(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `동화책을 하루에 ${n(b)}쪽씩 ${n(q)}일 동안 읽었습니다. 읽은 쪽수는 모두 몇 쪽인지 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${n(a)}쪽입니다.`,
  );
}

/** 문형 09 — 다 읽는 날수에서 며칠을 빼면. */
function div134DaysMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  const c = intBetween(rng, 1, q - 1);
  return make(
    unit,
    `동화책 ${n(a)}쪽을 하루에 ${n(b)}쪽씩 읽습니다. ${n(c)}일 먼저 끝내면 며칠 만에 다 읽는지 쓰시오.`,
    n(q - c),
    `${expr(`${a}\\div${b}=${q}`)} 일이고, ${expr(`${q}-${c}=${q - c}`)} 일입니다.`,
  );
}

/** 문형 10 — 구구 곱. */
function div134GuguProduct(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = divTriple(rng);
  return make(
    unit,
    `${n(b)}단 곱셈구구 ${expr(`${b}\\times${q}`)} 의 값을 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 입니다.`,
  );
}

function ten(
  calc: ChapterHandler,
  word: ChapterHandler,
  apply: ChapterHandler,
  deep: ChapterHandler,
  f05: ChapterHandler,
  f06: ChapterHandler,
  f07: ChapterHandler,
  f08: ChapterHandler,
  f09: ChapterHandler,
  f10: ChapterHandler,
): readonly ElemForm[] {
  return [
    { id: "01", tier: "연산", generate: calc },
    { id: "02", tier: "기본", generate: word },
    { id: "03", tier: "응용", generate: apply },
    { id: "04", tier: "심화하", generate: deep },
    { id: "05", tier: "기본", generate: f05 },
    { id: "06", tier: "기본", generate: f06 },
    { id: "07", tier: "기본", generate: f07 },
    { id: "08", tier: "응용", generate: f08 },
    { id: "09", tier: "응용", generate: f09 },
    { id: "10", tier: "응용", generate: f10 },
  ];
}

// 1-4 · 2-1 문형에 붙던 세로셈(`mulCol`)은 걷었다 — 발문의 곱셈식을 그대로 한 번 더 그렸다(2026-10-20).

/** 1-4 공유 — 빈칸 곱하는 수. */
function mul14Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}\\times\\square=${p}$`,
    n(b),
    `${expr(`${p}\\div${a}=${b}`)} 이므로 ${n(b)} 입니다.`,
  );
}

function mul14Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 일의 자리 숫자를 쓰시오.`,
    n(p % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 일의 자리 숫자는 ${n(p % 10)} 입니다.`,
  );
}

function mul14Plus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱보다 $${10}$ 큰 수를 쓰시오.`,
    n(p + 10),
    `${expr(`${a}\\times${b}=${p}`)} 이고, ${expr(`${p}+10=${p + 10}`)} 입니다.`,
  );
}

function mul14From100(unit: UnitSeed, rng: Rng): ElemProblem {
  let a = 0;
  let b = 0;
  let p = 0;
  for (let k = 0; k < 40; k += 1) {
    ({ a, b } = mulCaseOf(unit.section, rng));
    p = a * b;
    if (p !== 100) break;
  }
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱과 $${100}$ 의 차는 얼마입니까?`,
    n(Math.abs(p - 100)),
    `${expr(`${a}\\times${b}=${p}`)} 이고, 차는 ${n(Math.abs(p - 100))} 입니다.`,
  );
}

function mul14EvenOdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOdd = altCase(rng);
  let a = 0;
  let b = 0;
  for (let k = 0; k < 40; k += 1) {
    ({ a, b } = mulCaseOf(unit.section, rng));
    if (((a * b) % 2 === 1) === wantOdd) break;
  }
  if (((a * b) % 2 === 1) !== wantOdd) {
    if (wantOdd) {
      a = intBetween(rng, 5, 14) * 2 + 1;
      b = intBetween(rng, 1, 4) * 2 + 1;
    } else if ((a * b) % 2 === 1) {
      a += 1;
    }
  }
  const p = a * b;
  const even = p % 2 === 0;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱은 짝수입니까, 홀수입니까?`,
    even ? "짝수" : "홀수",
    `${expr(`${a}\\times${b}=${p}`)} 이므로 ${even ? "짝수" : "홀수"}입니다.`,
  );
}

function mul14OneMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = mulCaseOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `한 묶음에 ${n(a)}개씩 ${n(b)}묶음이 있습니다. 한 묶음을 더 모으면 모두 몇 개인지 쓰시오.`,
    n(p + a),
    `${expr(`${a}\\times${b}=${p}`)} 이고, ${expr(`${p}+${a}=${p + a}`)} 입니다.`,
  );
}

const MUL14_FORMS = ten(
  mul14Calc,
  mul14Word,
  mul14Apply,
  mul14Deep,
  mul14Missing,
  mul14Ones,
  mul14Plus10,
  mul14From100,
  mul14EvenOdd,
  mul14OneMore,
);

function lenMissingBigOf(cfg: LenCfg): ChapterHandler {
  return (unit, rng) => {
    const k = intBetween(rng, 2, 9);
    const e = cfg.smallPick(rng);
    const total = k * cfg.mul + e;
    return make(
      unit,
      `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square\\,\\mathrm{${cfg.big}}\\ ${e}\\,\\mathrm{${cfg.small}}=${total}\\,\\mathrm{${cfg.small}}$`,
      n(k),
      `$1\\,\\mathrm{${cfg.big}}=${cfg.mul}\\,\\mathrm{${cfg.small}}$ 이므로 ${n(k)} ${cfg.big}입니다.`,
    );
  };
}

function lenOnlySmallOf(cfg: LenCfg): ChapterHandler {
  return (unit, rng) => {
    const k = intBetween(rng, 2, 9);
    const e = cfg.smallPick(rng);
    return make(
      unit,
      `${mixedLen(cfg, k, e)} 에서 ${cfg.small} 단위의 수만큼만 쓰시오.`,
      n(e),
      `작은 단위 부분은 ${n(e)} ${cfg.small}입니다.`,
    );
  };
}

function lenTimesMulOf(cfg: LenCfg): ChapterHandler {
  return (unit, rng) => {
    const k = intBetween(rng, 2, 9);
    return make(
      unit,
      `$${k}\\,\\mathrm{${cfg.big}}$ 는 $${cfg.mul}\\,\\mathrm{${cfg.small}}$ 의 몇 배입니까?`,
      n(k),
      `$1\\,\\mathrm{${cfg.big}}=${cfg.mul}\\,\\mathrm{${cfg.small}}$ 이므로 ${n(k)}배입니다.`,
    );
  };
}

function lenSumSmallOf(cfg: LenCfg): ChapterHandler {
  return (unit, rng) => {
    const k = intBetween(rng, 2, 6);
    const e = cfg.smallPick(rng);
    const j = intBetween(rng, 1, 4);
    const f = cfg.smallPick(rng);
    const t1 = k * cfg.mul + e;
    const t2 = j * cfg.mul + f;
    return make(
      unit,
      `${mixedLen(cfg, k, e)} 와 ${mixedLen(cfg, j, f)} 의 합은 몇 ${cfg.small}입니까?`,
      n(t1 + t2),
      `${expr(`${t1}+${t2}=${t1 + t2}`)} ${cfg.small}입니다.`,
    );
  };
}

function lenDiffSmallOf(cfg: LenCfg): ChapterHandler {
  return (unit, rng) => {
    const k = intBetween(rng, 3, 8);
    const e = cfg.smallPick(rng);
    const j = intBetween(rng, 1, k - 1);
    const f = cfg.smallPick(rng);
    const t1 = k * cfg.mul + e;
    const t2 = j * cfg.mul + f;
    const hi = Math.max(t1, t2);
    const lo = Math.min(t1, t2);
    return make(
      unit,
      `${mixedLen(cfg, k, e)} 과 ${mixedLen(cfg, j, f)} 의 차는 몇 ${cfg.small}입니까?`,
      n(hi - lo),
      `${expr(`${hi}-${lo}=${hi - lo}`)} ${cfg.small}입니다.`,
    );
  };
}

function lenHowManyBigOf(cfg: LenCfg): ChapterHandler {
  return (unit, rng) => {
    const k = intBetween(rng, 2, 9);
    return make(
      unit,
      `$${k * cfg.mul}\\,\\mathrm{${cfg.small}}$ 안에는 $${cfg.mul}\\,\\mathrm{${cfg.small}}$ 이 몇 번 들어갑니까?`,
      n(k),
      `${expr(`${k * cfg.mul}\\div${cfg.mul}=${k}`)} 이므로 ${n(k)}번입니다.`,
    );
  };
}

function guessMmOfCm(unit: UnitSeed, rng: Rng): ElemProblem {
  const g = intBetween(rng, 3, 9);
  return make(
    unit,
    `어림한 길이 ${unitNum(g, "cm")} 는 ${unitNum(10, "mm")} 가 몇 번 들어간 길이입니까?`,
    n(g),
    `$1\\,\\mathrm{cm}=10\\,\\mathrm{mm}$ 이므로 ${n(g)}번입니다.`,
  );
}

function guessError(unit: UnitSeed, rng: Rng): ElemProblem {
  const real = intBetween(rng, 40, 90);
  const off = pick(rng, [2, 3, 4, 5, 6, 7]);
  const g = real + off * (intBetween(rng, 0, 1) === 0 ? 1 : -1);
  return make(
    unit,
    `실제 길이가 ${unitNum(real, "mm")} 인데 ${unitNum(g, "mm")} 로 어림했습니다. 어림값과 실제 길이의 차는 몇 mm입니까?`,
    n(Math.abs(g - real)),
    `${expr(`${Math.max(g, real)}-${Math.min(g, real)}=${Math.abs(g - real)}`)} 입니다.`,
  );
}

function guessSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 20, 80);
  const b = intBetween(rng, 20, 80);
  return make(
    unit,
    `가은은 약 ${unitNum(a, "mm")}, 나윤은 약 ${unitNum(b, "mm")} 로 어림했습니다. 두 어림값의 합은 몇 mm입니까?`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

function guessToCmMm(unit: UnitSeed, rng: Rng): ElemProblem {
  const cm = intBetween(rng, 2, 9);
  const mm = intBetween(rng, 1, 9);
  const t = cm * 10 + mm;
  return make(
    unit,
    `어림한 길이 ${unitNum(t, "mm")} 는 몇 cm 몇 mm입니까?`,
    `${n(cm)} cm ${n(mm)} mm`,
    `$10$ mm 는 $1$ cm 이므로 ${n(t)} mm 는 ${n(cm)} cm ${n(mm)} mm입니다.`,
  );
}

function guessHowManyCm(unit: UnitSeed, rng: Rng): ElemProblem {
  const cm = intBetween(rng, 2, 9);
  return make(
    unit,
    `${unitNum(cm * 10, "mm")} 를 cm 로 나타내면 몇 cm입니까?`,
    n(cm),
    `${expr(`${cm * 10}\\div10=${cm}`)} 입니다.`,
  );
}

function guessTwice(unit: UnitSeed, rng: Rng): ElemProblem {
  const g = intBetween(rng, 3, 9);
  return make(
    unit,
    `어림한 길이 ${unitNum(g, "cm")} 의 $2$ 배는 몇 mm입니까?`,
    n(g * 20),
    `${expr(`${g}\\times10=${g * 10}`)} mm 의 $2$ 배는 ${expr(`${g * 10}\\times2=${g * 20}`)} 입니다.`,
  );
}

function secMissingMin(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 2, 5);
  const s = intBetween(rng, 1, 59);
  const t = m * 60 + s;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square$분 ${n(s)}초 $=$ ${n(t)}초`,
    n(m),
    `$60$ 초는 $1$ 분이므로 ${n(m)}분입니다.`,
  );
}

function secOnlySec(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 2, 5);
  const s = intBetween(rng, 1, 59);
  return make(
    unit,
    `${msStr(m, s)}에서 초 단위의 수만큼만 쓰시오.`,
    n(s),
    `초 단위 부분은 ${n(s)}초입니다.`,
  );
}

function secHowManyMin(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 2, 5);
  return make(
    unit,
    `${n(m * 60)}초 안에는 $60$초가 몇 번 들어갑니까?`,
    n(m),
    `${expr(`${m * 60}\\div60=${m}`)} 이므로 ${n(m)}번입니다.`,
  );
}

function secSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 10, 50);
  const b = intBetween(rng, 10, 50);
  return make(
    unit,
    `${n(a)}초와 ${n(b)}초의 합은 몇 초입니까?`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

function secDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 30, 80);
  const b = intBetween(rng, 10, a - 5);
  return make(
    unit,
    `${n(a)}초와 ${n(b)}초의 차는 몇 초입니까?`,
    n(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 입니다.`,
  );
}

function secPlusMin(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 2, 4);
  const s = intBetween(rng, 5, 50);
  return make(
    unit,
    `${n(m)}분에 ${n(s)}초를 더한 시간은 몇 초입니까?`,
    n(m * 60 + s),
    `${expr(`60\\times${m}=${m * 60}`)} 이고 ${expr(`${m * 60}+${s}=${m * 60 + s}`)} 입니다.`,
  );
}

function time155MinutesOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, h2, m2 } = addHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}과 ${hmStr(h2, m2)}에서 분끼리만 더한 값은 몇 분입니까?`,
    n(m1 + m2),
    `${expr(`${m1}+${m2}=${m1 + m2}`)} 입니다.`,
  );
}

function time155HoursOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, h2, m2 } = addHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}과 ${hmStr(h2, m2)}에서 시간끼리만 더한 값은 몇 시간입니까?`,
    n(h1 + h2),
    `${expr(`${h1}+${h2}=${h1 + h2}`)} 입니다.`,
  );
}

function time155CarryQ(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, h2, m2 } = addHm(rng);
  const yes = m1 + m2 >= 60;
  return make(
    unit,
    `${hmStr(h1, m1)}과 ${hmStr(h2, m2)}을 더할 때 분에서 시간으로 올림이 있습니까? 예 또는 아니요로 쓰시오.`,
    yes ? "예" : "아니요",
    `분끼리 더하면 ${n(m1 + m2)}분이므로 ${yes ? "올림이 있습니다" : "올림이 없습니다"}.`,
  );
}

function time155TotalMin(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1 } = addHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}은 모두 몇 분입니까?`,
    n(h1 * 60 + m1),
    `${expr(`60\\times${h1}=${h1 * 60}`)} 이고 ${expr(`${h1 * 60}+${m1}=${h1 * 60 + m1}`)} 입니다.`,
  );
}

function time155AddOneHour(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1 } = addHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}에 $1$시간을 더하면 몇 시간 몇 분입니까?`,
    hmStr(h1 + 1, m1),
    `시간에 $1$을 더하면 ${hmStr(h1 + 1, m1)}입니다.`,
  );
}

function time155SumHours(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, h2, m2, hh, mm } = addHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}과 ${hmStr(h2, m2)}의 합에서 시간 부분만 쓰시오.`,
    n(hh),
    `합은 ${hmStr(hh, mm)}이므로 시간은 ${n(hh)}시간입니다.`,
  );
}

function time156MinutesOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, sh, sm, hh, mm } = subHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}에서 ${hmStr(sh, sm)}을 뺀 결과의 분 부분만 쓰시오.`,
    n(mm),
    `차는 ${hmStr(hh, mm)}이므로 분은 ${n(mm)}분입니다.`,
  );
}

function time156HoursOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, sh, sm } = subHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}에서 ${hmStr(sh, sm)}을 뺄 때, 받아내림 전 시간끼리만 빼면 몇 시간입니까?`,
    n(h1 - sh),
    `${expr(`${h1}-${sh}=${h1 - sh}`)} 입니다.`,
  );
}

function time156BorrowQ(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, sh, sm } = subHm(rng);
  const yes = m1 < sm;
  return make(
    unit,
    `${hmStr(h1, m1)}에서 ${hmStr(sh, sm)}을 뺄 때 분에서 받아내림이 있습니까? 예 또는 아니요로 쓰시오.`,
    yes ? "예" : "아니요",
    `${n(m1)}분에서 ${n(sm)}분을 빼므로 ${yes ? "받아내림이 있습니다" : "받아내림이 없습니다"}.`,
  );
}

function time156TotalMin(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1 } = subHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}은 모두 몇 분입니까?`,
    n(h1 * 60 + m1),
    `${expr(`60\\times${h1}+${m1}=${h1 * 60 + m1}`)} 입니다.`,
  );
}

function time156MinusHour(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1 } = subHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}에서 $1$시간을 빼면 몇 시간 몇 분입니까?`,
    hmStr(h1 - 1, m1),
    `시간에서 $1$을 빼면 ${hmStr(h1 - 1, m1)}입니다.`,
  );
}

function time156DiffHours(unit: UnitSeed, rng: Rng): ElemProblem {
  const { h1, m1, sh, sm, hh, mm } = subHm(rng);
  return make(
    unit,
    `${hmStr(h1, m1)}과 ${hmStr(sh, sm)}의 차에서 시간 부분만 쓰시오.`,
    n(hh),
    `차는 ${hmStr(hh, mm)}이므로 시간은 ${n(hh)}시간입니다.`,
  );
}

function part161Filled(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠한 조각은 몇 개인지 쓰시오.`,
    n(filled),
    `색칠한 조각은 ${n(filled)}개입니다.`,
    spec,
  );
}

function part161Empty(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠하지 않은 조각은 몇 개인지 쓰시오.`,
    n(parts - filled),
    `전체 ${n(parts)}개 중 색칠한 것이 ${n(filled)}개이므로 ${expr(`${parts}-${filled}=${parts - filled}`)} 개입니다.`,
    spec,
  );
}

function part161UnitFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림처럼 전체를 똑같이 ${n(parts)}조각으로 나누었습니다. 한 조각은 전체의 얼마인지 분수로 쓰시오.`,
    expr(`\\frac{1}{${parts}}`),
    `똑같이 ${n(parts)}조각이므로 한 조각은 ${expr(`\\frac{1}{${parts}}`)} 입니다.`,
    spec,
  );
}

function part161TwoFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 4, 8);
  const spec = fracSpec(rng, parts, 2);
  return make(
    unit,
    `그림처럼 전체를 똑같이 ${n(parts)}조각으로 나누었습니다. 두 조각은 전체의 얼마인지 분수로 쓰시오.`,
    expr(`\\frac{2}{${parts}}`),
    `두 조각은 ${expr(`\\frac{2}{${parts}}`)} 입니다.`,
    spec,
  );
}

function part161CheckSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠한 조각과 색칠하지 않은 조각을 더한 값은 몇 개입니까?`,
    n(parts),
    `${expr(`${filled}+${parts - filled}=${parts}`)} 입니다.`,
    spec,
  );
}

function part161Def(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `크기가 같게 나누는 것을 무엇이라고 합니까? 그렇게 ${n(many)}조각으로 나눌 수 있습니다.`,
    "똑같이 나누기",
    `크기가 같게 나누는 것이 똑같이 나누기입니다.`,
  );
}

function frac162Den(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠한 부분을 분수로 나타낼 때 분모에 알맞은 수를 쓰시오.`,
    n(parts),
    `전체를 ${n(parts)}조각으로 나누었으므로 분모는 ${n(parts)} 입니다.`,
    spec,
  );
}

function frac162Num(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠한 부분을 분수로 나타낼 때 분자에 알맞은 수를 쓰시오.`,
    n(filled),
    `색칠한 조각이 ${n(filled)}개이므로 분자는 ${n(filled)} 입니다.`,
    spec,
  );
}

function frac162Copies(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림의 색칠한 부분은 ${expr(`\\frac{1}{${parts}}`)} 이 몇 개 모인 것입니까?`,
    n(filled),
    `색칠한 조각이 ${n(filled)}개이므로 ${n(filled)}개입니다.`,
    spec,
  );
}

function frac162Gap(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 분모와 분자의 차는 얼마입니까?`,
    n(parts - filled),
    `${expr(`${parts}-${filled}=${parts - filled}`)} 입니다.`,
    spec,
  );
}

function frac162Whole(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `전체를 분수로 나타내면 얼마입니까? (그림은 ${n(parts)}등분)`,
    expr(`\\frac{${parts}}{${parts}}`),
    `전체는 ${expr(`\\frac{${parts}}{${parts}}`)} 입니다.`,
    spec,
  );
}

function frac162PlusOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 4, 8);
  const filled = intBetween(rng, 1, parts - 2);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림의 색칠한 부분에 한 조각을 더 색칠하면 분수는 얼마입니까?`,
    expr(`\\frac{${filled + 1}}{${parts}}`),
    `${expr(`\\frac{${filled}}{${parts}}`)} 에 한 조각을 더하면 ${expr(`\\frac{${filled + 1}}{${parts}}`)} 입니다.`,
    spec,
  );
}

function frac163RestN(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠하지 않은 조각은 몇 개인지 쓰시오.`,
    n(parts - filled),
    `${expr(`${parts}-${filled}=${parts - filled}`)} 개입니다.`,
    spec,
  );
}

function frac163Eaten(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 4, 9);
  const eaten = intBetween(rng, 1, parts - 2);
  return make(
    unit,
    `전체를 ${n(parts)}조각으로 나누어 ${n(eaten)}조각을 먹었습니다. 먹은 부분은 분수로 얼마입니까?`,
    expr(`\\frac{${eaten}}{${parts}}`),
    `먹은 조각이 ${n(eaten)}개이므로 ${expr(`\\frac{${eaten}}{${parts}}`)} 입니다.`,
  );
}

function frac163RestDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠하지 않은 부분을 분수로 나타낼 때 분모는 얼마입니까?`,
    n(parts),
    `전체 조각이 ${n(parts)}개이므로 분모는 ${n(parts)} 입니다.`,
    spec,
  );
}

function frac163Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `색칠한 조각과 색칠하지 않은 조각을 더하면 몇 개입니까?`,
    n(parts),
    `${expr(`${filled}+${parts - filled}=${parts}`)} 입니다.`,
    spec,
  );
}

function frac163More(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 5, 9);
  const filled = intBetween(rng, 1, parts - 1);
  const rest = parts - filled;
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림에서 색칠한 조각과 색칠하지 않은 조각 가운데 더 많은 쪽의 조각 수를 쓰시오.`,
    n(Math.max(filled, rest)),
    `색칠 ${n(filled)}개, 아닌 것 ${n(rest)}개이므로 더 많은 쪽은 ${n(Math.max(filled, rest))}개입니다.`,
    spec,
  );
}

function frac163Parts(unit: UnitSeed, rng: Rng): ElemProblem {
  const parts = intBetween(rng, 3, 8);
  const filled = intBetween(rng, 1, parts - 1);
  const spec = fracSpec(rng, parts, filled);
  return make(
    unit,
    `그림은 전체를 몇 등분한 것입니까?`,
    n(parts),
    `조각이 ${n(parts)}개이므로 ${n(parts)}등분입니다.`,
    spec,
  );
}

function cmp164BigNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  const a = i + 1;
  const b = j + 1;
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}`)}, ${expr(`\\frac{${b}}{${den}}`)} 에서 더 큰 분수의 분자를 쓰시오.`,
    n(Math.max(a, b)),
    `분모가 같으면 분자가 클수록 크므로 ${n(Math.max(a, b))} 입니다.`,
  );
}

function cmp164NumDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  const a = i + 1;
  const b = j + 1;
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}`)} 과 ${expr(`\\frac{${b}}{${den}}`)} 의 분자끼리의 차는 얼마입니까?`,
    n(Math.abs(a - b)),
    `${expr(`${Math.max(a, b)}-${Math.min(a, b)}=${Math.abs(a - b)}`)} 입니다.`,
  );
}

function cmp164NumSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  const a = i + 1;
  const b = j + 1;
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}`)} 과 ${expr(`\\frac{${b}}{${den}}`)} 의 분자를 더한 값을 쓰시오.`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

function cmp164Den(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  return make(
    unit,
    `${expr(`\\frac{${i + 1}}{${den}}`)}, ${expr(`\\frac{${j + 1}}{${den}}`)} 의 분모를 쓰시오.`,
    n(den),
    `두 분수의 분모는 모두 ${n(den)} 입니다.`,
  );
}

function cmp164SmallNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const [i, j] = distinctIdx(rng, den - 1, 2) as [number, number];
  const a = i + 1;
  const b = j + 1;
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}`)}, ${expr(`\\frac{${b}}{${den}}`)} 에서 더 작은 분수의 분자를 쓰시오.`,
    n(Math.min(a, b)),
    `분자가 작을수록 작으므로 ${n(Math.min(a, b))} 입니다.`,
  );
}

function cmp164SameDenQ(unit: UnitSeed, rng: Rng): ElemProblem {
  const same = altCase(rng);
  const den = intBetween(rng, 5, 9);
  let den2 = den;
  if (!same) {
    den2 = intBetween(rng, 5, 9);
    if (den2 === den) den2 = den === 9 ? 5 : den + 1;
  }
  const [i, j] = distinctIdx(rng, Math.min(den, den2) - 1, 2) as [
    number,
    number,
  ];
  return make(
    unit,
    `${expr(`\\frac{${i + 1}}{${den}}`)} 과 ${expr(`\\frac{${j + 1}}{${den2}}`)} 의 분모는 같습니까? 예 또는 아니요로 쓰시오.`,
    same ? "예" : "아니요",
    same
      ? `두 분수의 분모는 모두 ${n(den)} 으로 같습니다.`
      : `분모는 ${n(den)} 과 ${n(den2)} 으로 다릅니다.`,
  );
}

function unit165SmallDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  return make(
    unit,
    `${expr(`\\frac{1}{${a}}`)}, ${expr(`\\frac{1}{${b}}`)} 에서 더 큰 단위분수의 분모를 쓰시오.`,
    n(Math.min(a, b)),
    `단위분수는 분모가 작을수록 크므로 ${n(Math.min(a, b))} 입니다.`,
  );
}

function unit165DenSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  return make(
    unit,
    `${expr(`\\frac{1}{${a}}`)} 과 ${expr(`\\frac{1}{${b}}`)} 의 분모를 더한 값을 쓰시오.`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

function unit165DenDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  return make(
    unit,
    `${expr(`\\frac{1}{${a}}`)} 과 ${expr(`\\frac{1}{${b}}`)} 의 분모의 차는 얼마입니까?`,
    n(Math.abs(a - b)),
    `${expr(`${Math.max(a, b)}-${Math.min(a, b)}=${Math.abs(a - b)}`)} 입니다.`,
  );
}

function unit165BigDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  return make(
    unit,
    `${expr(`\\frac{1}{${a}}`)}, ${expr(`\\frac{1}{${b}}`)} 에서 더 작은 단위분수의 분모를 쓰시오.`,
    n(Math.max(a, b)),
    `분모가 클수록 작으므로 ${n(Math.max(a, b))} 입니다.`,
  );
}

function unit165OneOver(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `전체를 똑같이 ${n(a)}조각으로 나눈 것 중 한 조각을 분수로 쓰시오.`,
    expr(`\\frac{1}{${a}}`),
    `한 조각은 ${expr(`\\frac{1}{${a}}`)} 입니다.`,
  );
}

function unit165Finer(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 8, 2) as [number, number];
  const a = i + 2;
  const b = j + 2;
  return make(
    unit,
    `${expr(`\\frac{1}{${a}}`)} 과 ${expr(`\\frac{1}{${b}}`)} 가운데 더 잘게 나눈 쪽의 등분 수를 쓰시오.`,
    n(Math.max(a, b)),
    `등분 수가 클수록 더 잘게 나눈 것이므로 ${n(Math.max(a, b))} 입니다.`,
  );
}

function dec166Tenths(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9);
  return make(
    unit,
    `소수 ${expr(`0.${k}`)} 에서 소수 첫째 자리 숫자를 쓰시오.`,
    n(k),
    `소수 첫째 자리 숫자는 ${n(k)} 입니다.`,
  );
}

function dec166AsFracNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9);
  return make(
    unit,
    `${expr(`0.${k}`)} 을 분수로 나타낼 때 분자를 쓰시오.`,
    n(k),
    `${expr(`0.${k}=\\frac{${k}}{10}`)} 이므로 분자는 ${n(k)} 입니다.`,
  );
}

function dec166Whole(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 4);
  const t = intBetween(rng, 1, 9);
  return make(
    unit,
    `소수 ${expr(`${w}.${t}`)} 의 자연수 부분을 쓰시오.`,
    n(w),
    `자연수 부분은 ${n(w)} 입니다.`,
  );
}

function dec166TenthsCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9);
  return make(
    unit,
    `${expr(`0.${k}`)} 안에는 $0.1$ 이 몇 개 있습니까?`,
    n(k),
    `$0.1$ 짜리가 ${n(k)}개입니다.`,
  );
}

function dec166FracDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9);
  return make(
    unit,
    `${expr(`0.${k}`)} 을 분수로 나타낼 때 분모를 쓰시오.`,
    n(10),
    `${expr(`0.${k}=\\frac{${k}}{10}`)} 이므로 분모는 $10$ 입니다.`,
  );
}

function dec166TimesTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9);
  return make(
    unit,
    `${expr(`0.${k}`)} 의 $10$ 배는 얼마입니까?`,
    n(k),
    `${expr(`0.${k}\\times10=${k}`)} 입니다.`,
  );
}

function cmp167WholeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decIdxVal(i);
  const B = decIdxVal(j);
  return make(
    unit,
    `${n(decStrOf(i))} 과 ${n(decStrOf(j))} 의 자연수 부분을 더한 값을 쓰시오.`,
    n(A.w + B.w),
    `${expr(`${A.w}+${B.w}=${A.w + B.w}`)} 입니다.`,
  );
}

function cmp167TenthsSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decIdxVal(i);
  const B = decIdxVal(j);
  return make(
    unit,
    `${n(decStrOf(i))} 과 ${n(decStrOf(j))} 의 소수 첫째 자리 숫자를 더한 값을 쓰시오.`,
    n(A.t + B.t),
    `${expr(`${A.t}+${B.t}=${A.t + B.t}`)} 입니다.`,
  );
}

function cmp167ScaledDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const vA = decIdxVal(i).w * 10 + decIdxVal(i).t;
  const vB = decIdxVal(j).w * 10 + decIdxVal(j).t;
  return make(
    unit,
    `${n(decStrOf(i))} 과 ${n(decStrOf(j))} 을 각각 $10$ 배 한 값의 차를 쓰시오.`,
    n(Math.abs(vA - vB)),
    `$10$ 배 하면 ${n(vA)} 과 ${n(vB)} 이므로 차는 ${n(Math.abs(vA - vB))} 입니다.`,
  );
}

function cmp167BigTenths(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decIdxVal(i);
  const B = decIdxVal(j);
  const vA = A.w * 10 + A.t;
  const vB = B.w * 10 + B.t;
  const t = vA > vB ? A.t : B.t;
  return make(
    unit,
    `${n(decStrOf(i))} 과 ${n(decStrOf(j))} 가운데 더 큰 수의 소수 첫째 자리 숫자를 쓰시오.`,
    n(t),
    `더 큰 수의 소수 첫째 자리는 ${n(t)} 입니다.`,
  );
}

function cmp167Smaller(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decStrOf(i);
  const B = decStrOf(j);
  const vA = decIdxVal(i).w * 10 + decIdxVal(i).t;
  const vB = decIdxVal(j).w * 10 + decIdxVal(j).t;
  const ans = vA > vB ? B : A;
  return make(
    unit,
    `${n(A)} 과 ${n(B)} 가운데 더 작은 수를 쓰시오.`,
    n(ans),
    `더 작은 수는 ${expr(ans)} 입니다.`,
  );
}

function cmp167SameWholeQ(unit: UnitSeed, rng: Rng): ElemProblem {
  const [i, j] = distinctIdx(rng, 36, 2) as [number, number];
  const A = decIdxVal(i);
  const B = decIdxVal(j);
  return make(
    unit,
    `${n(decStrOf(i))} 과 ${n(decStrOf(j))} 의 자연수 부분은 같습니까? 예 또는 아니요로 쓰시오.`,
    A.w === B.w ? "예" : "아니요",
    `자연수 부분은 ${n(A.w)} 과 ${n(B.w)} 입니다.`,
  );
}

function mul21Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}\\times\\square=${p}$`,
    n(b),
    `${expr(`${p}\\div${a}=${b}`)} 이므로 ${n(b)} 입니다.`,
  );
}

function mul21Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 백의 자리 숫자를 쓰시오.`,
    n(Math.floor(p / 100) % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 백의 자리 숫자는 ${n(Math.floor(p / 100) % 10)} 입니다.`,
  );
}

function mul21Minus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱보다 $${10}$ 작은 수를 쓰시오.`,
    n(p - 10),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}-10=${p - 10}`)} 입니다.`,
  );
}

function mul21From1000(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱과 $${1000}$ 의 차는 얼마입니까?`,
    n(Math.abs(p - 1000)),
    `${expr(`${a}\\times${b}=${p}`)} 이고 차는 ${n(Math.abs(p - 1000))} 입니다.`,
  );
}

function mul21DigitSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  const s = [...String(p)].reduce((t, ch) => t + Number(ch), 0);
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 각 자리 숫자를 모두 더한 값을 쓰시오.`,
    n(s),
    `${expr(`${a}\\times${b}=${p}`)} 이고 각 자리의 합은 ${n(s)} 입니다.`,
  );
}

function mul21PlusA(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul21PairOf(unit.section, rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에 $${a}$ 를 더하면 얼마입니까?`,
    n(p + a),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}+${a}=${p + a}`)} 입니다.`,
  );
}

const MUL21_FORMS = ten(
  mul21Calc,
  mul21Word,
  mul21Apply,
  mul21Deep,
  mul21Missing,
  mul21Hundreds,
  mul21Minus10,
  mul21From1000,
  mul21DigitSum,
  mul21PlusA,
);

function mul213Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square\\times${b}=${p}$`,
    n(a),
    `${expr(`${p}\\div${b}=${a}`)} 이므로 ${n(a)} 입니다.`,
  );
}

function mul213Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 일의 자리 숫자를 쓰시오.`,
    n(p % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 일의 자리 숫자는 ${n(p % 10)} 입니다.`,
  );
}

function mul213Plus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱보다 $${10}$ 큰 수를 쓰시오.`,
    n(p + 10),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}+10=${p + 10}`)} 입니다.`,
  );
}

function mul213EvenOdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantOdd = altCase(rng);
  let a: number;
  let b: number;
  if (wantOdd) {
    a = intBetween(rng, 1, 4) * 2 + 1;
    b = tensOnes21(rng);
    if (b % 2 === 0) b += 1;
    if (b > 99) b -= 2;
  } else {
    [a, b] = mul213PairOf(rng);
    if ((a * b) % 2 === 1) a += 1;
  }
  const p = a * b;
  const even = p % 2 === 0;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱은 짝수입니까, 홀수입니까?`,
    even ? "짝수" : "홀수",
    `${expr(`${a}\\times${b}=${p}`)} 이므로 ${even ? "짝수" : "홀수"}입니다.`,
  );
}

function mul213Tens(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 십의 자리 숫자를 쓰시오.`,
    n(Math.floor(p / 10) % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 십의 자리 숫자는 ${n(Math.floor(p / 10) % 10)} 입니다.`,
  );
}

function mul213OneMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = mul213PairOf(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}$ 씩 ${n(b)}묶음에 한 묶음을 더하면 모두 몇 개입니까?`,
    n(p + a),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}+${a}=${p + a}`)} 입니다.`,
  );
}

function mul214Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}\\times\\square=${p}$`,
    n(b),
    `${expr(`${p}\\div${a}=${b}`)} 이므로 ${n(b)} 입니다.`,
  );
}

function mul214Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 백의 자리 숫자를 쓰시오.`,
    n(Math.floor(p / 100) % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 백의 자리 숫자는 ${n(Math.floor(p / 100) % 10)} 입니다.`,
  );
}

function mul214Minus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱보다 $${10}$ 작은 수를 쓰시오.`,
    n(p - 10),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}-10=${p - 10}`)} 입니다.`,
  );
}

function mul214From1000(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱과 $${1000}$ 의 차는 얼마입니까?`,
    n(Math.abs(p - 1000)),
    `${expr(`${a}\\times${b}=${p}`)} 이고 차는 ${n(Math.abs(p - 1000))} 입니다.`,
  );
}

function mul214DigitSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  const s = [...String(p)].reduce((t, ch) => t + Number(ch), 0);
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱에서 각 자리 숫자를 모두 더한 값을 쓰시오.`,
    n(s),
    `${expr(`${a}\\times${b}=${p}`)} 이고 각 자리의 합은 ${n(s)} 입니다.`,
  );
}

function mul214EvenOdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = tensOnes21(rng);
  const b = tensOnes21(rng);
  const p = a * b;
  const even = p % 2 === 0;
  return make(
    unit,
    `$${a}\\times${b}$ 의 곱은 짝수입니까, 홀수입니까?`,
    even ? "짝수" : "홀수",
    `${expr(`${a}\\times${b}=${p}`)} 이므로 ${even ? "짝수" : "홀수"}입니다.`,
  );
}

function div22Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}\\div\\square=${q}$`,
    n(b),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(b)} 입니다.`,
  );
}

function div22Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  return make(
    unit,
    `$${a}\\div${b}=${q}$ 입니다. $${b}\\times${q}$ 의 값을 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 입니다.`,
  );
}

function div22HowManyGroups(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  return make(
    unit,
    `${n(a)}개를 ${n(q)}개씩 묶으면 몇 묶음입니까?`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 이므로 ${n(b)}묶음입니다.`,
  );
}

function div22Compare(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  const bigger = q > b ? "큽니다" : "작습니다";
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫은 나누는 수보다 큽니까, 작습니까?`,
    bigger,
    `몫은 ${n(q)}, 나누는 수는 ${n(b)} 이므로 몫이 더 ${bigger}.`,
  );
}

function div22Total(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  return make(
    unit,
    `한 묶음에 ${n(q)}개씩 ${n(b)}묶음이면 모두 몇 개입니까?`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 입니다.`,
  );
}

function div22Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2(rng, carryDown22(unit.section));
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫에서 일의 자리 숫자를 쓰시오.`,
    n(q % 10),
    `몫은 ${n(q)} 이므로 일의 자리 숫자는 ${n(q % 10)} 입니다.`,
  );
}

const DIV22_FORMS = ten(
  div22Calc,
  div22Word,
  div22Apply,
  div22Deep,
  div22Missing,
  div22Check,
  div22HowManyGroups,
  div22Compare,
  div22Total,
  div22Ones,
);

function rem223Quot(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div2Rem(rng);
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫만 쓰시오.`,
    n(q),
    `몫은 ${n(q)} 입니다.`,
  );
}

function rem223Rem(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  return make(
    unit,
    `$${a}\\div${b}$ 의 나머지만 쓰시오.`,
    n(r),
    `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 나머지는 ${n(r)} 입니다.`,
  );
}

function rem223Divisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  return make(
    unit,
    `$${a}\\div${b}$ 에서 나누는 수를 쓰시오.`,
    n(b),
    `나누는 수는 ${n(b)} 입니다.`,
  );
}

function rem223Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. $${b}\\times${q}+${r}$ 의 값을 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}+${r}=${a}`)} 입니다.`,
  );
}

function rem223LessQ(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantYes = altCase(rng);
  const [a, b, , r] = div2Rem(rng);
  const k = wantYes ? b : r;
  const yes = r < k;
  return make(
    unit,
    `$${a}\\div${b}$ 의 나머지는 ${n(k)}보다 작습니까? 예 또는 아니요로 쓰시오.`,
    yes ? "예" : "아니요",
    `나머지는 ${n(r)} 이므로 ${yes ? `${n(k)}보다 작습니다` : `${n(k)}보다 작지 않습니다`}.`,
  );
}

function rem223Dividend(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q, r] = div2Rem(rng);
  return make(
    unit,
    `몫이 ${n(q)}, 나머지가 ${n(r)}, 나누는 수가 ${n(b)} 일 때 나뉘는 수를 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}+${r}=${a}`)} 입니다.`,
  );
}

function div224Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$${a}\\div\\square=${q}$`,
    n(b),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(b)} 입니다.`,
  );
}

function div224Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  return make(
    unit,
    `$${a}\\div${b}=${q}$ 입니다. $${b}\\times${q}$ 의 값을 쓰시오.`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 입니다.`,
  );
}

function div224HowMany(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  return make(
    unit,
    `${n(a)}개를 ${n(q)}개씩 묶으면 몇 묶음입니까?`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 입니다.`,
  );
}

function div224Compare(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  const bigger = q > b ? "큽니다" : "작습니다";
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫은 나누는 수보다 큽니까, 작습니까?`,
    bigger,
    `몫은 ${n(q)}, 나누는 수는 ${n(b)} 이므로 몫이 더 ${bigger}.`,
  );
}

function div224Total(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  return make(
    unit,
    `한 묶음에 ${n(q)}개씩 ${n(b)}묶음이면 모두 몇 개입니까?`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 입니다.`,
  );
}

function div224Hundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b, q] = div3Exact(rng);
  return make(
    unit,
    `$${a}\\div${b}$ 의 몫에서 백의 자리 숫자를 쓰시오.`,
    n(Math.floor(q / 100) % 10),
    `몫은 ${n(q)} 이므로 백의 자리 숫자는 ${n(Math.floor(q / 100) % 10)} 입니다.`,
  );
}

function circ232Times2(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원에서 지름은 반지름의 몇 배입니까?`,
    n(2),
    `지름은 반지름의 $2$ 배입니다.`,
    circleFig("radius", r),
  );
}

function circ232ThreeR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원에 반지름을 $3$개 그었습니다. 그은 선분의 길이의 합은 몇 cm입니까?`,
    n(3 * r),
    `${expr(`${r}\\times3=${3 * r}`)} 입니다.`,
    circleFig("radius", r),
  );
}

function circ232DiaMinusR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `지름이 ${unitNum(r * 2, "cm")} 인 원에서 지름의 길이에서 반지름의 길이를 빼면 몇 cm입니까?`,
    n(r),
    `반지름은 ${n(r)} cm이므로 ${expr(`${r * 2}-${r}=${r}`)} 입니다.`,
    circleFig("diameter", r * 2),
  );
}

function circ232DiaPlusR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원의 지름과 반지름의 합은 몇 cm입니까?`,
    n(3 * r),
    `${expr(`${r * 2}+${r}=${3 * r}`)} 입니다.`,
    circleFig("radius", r),
  );
}

function circ232ManyR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 8);
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `반지름이 ${unitNum(r, "cm")} 인 원에 반지름을 ${n(k)}개 그었습니다. 길이의 합은 몇 cm입니까?`,
    n(r * k),
    `${expr(`${r}\\times${k}=${r * k}`)} 입니다.`,
    circleFig("radius", r),
  );
}

function circ232HalfDia(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `지름 ${unitNum(r * 2, "cm")} 인 원을 지름의 중점에서 반으로 접으면 생기는 선분의 길이는 몇 cm입니까?`,
    n(r),
    `지름의 반은 반지름이므로 ${n(r)} cm입니다.`,
    circleFig("diameter", r * 2),
  );
}

function circ233Name(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려 원을 ${n(many)}개 그렸습니다. 벌린 길이는 원의 무엇과 같습니까?`,
    "반지름",
    `컴퍼스를 벌린 길이가 반지름입니다.`,
  );
}

function circ233FromDia(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `지름이 ${unitNum(r * 2, "cm")} 인 원을 그리려면 컴퍼스를 몇 cm만큼 벌려야 합니까?`,
    n(r),
    `벌릴 길이는 반지름이므로 ${expr(`${r * 2}\\div2=${r}`)} 입니다.`,
  );
}

function circ233Double(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 6);
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려 원을 그렸습니다. 벌린 길이를 $2$ 배로 하면 새 원의 지름은 몇 cm입니까?`,
    n(4 * r),
    `새 반지름은 ${expr(`${r}\\times2=${2 * r}`)} 이고 지름은 ${expr(`${2 * r}\\times2=${4 * r}`)} 입니다.`,
  );
}

function circ233SumR(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 8);
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `같은 길이 ${unitNum(r, "cm")} 로 원을 ${n(k)}개 그렸습니다. 각 원의 반지름의 합은 몇 cm입니까?`,
    n(r * k),
    `${expr(`${r}\\times${k}=${r * k}`)} 입니다.`,
  );
}

function circ233DiaMinusOpen(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려 그린 원의 지름에서 벌린 길이를 빼면 몇 cm입니까?`,
    n(r),
    `지름은 ${n(r * 2)} cm이므로 ${expr(`${r * 2}-${r}=${r}`)} 입니다.`,
  );
}

function circ233TwoOpen(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌린 길이를 두 번 이으면 그 원의 무엇과 같아집니까?`,
    "지름",
    `벌린 길이 둘이 지름입니다.`,
  );
}

function part241Den(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  const take = intBetween(rng, 1, groups - 1);
  return make(
    unit,
    `전체를 똑같이 ${n(groups)}묶음으로 나눈 것 중 ${n(take)}묶음을 분수로 나타낼 때 분모를 쓰시오.`,
    n(groups),
    `전체 묶음 수가 분모이므로 ${n(groups)} 입니다.`,
  );
}

function part241Num(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  const take = intBetween(rng, 1, groups - 1);
  return make(
    unit,
    `전체를 똑같이 ${n(groups)}묶음으로 나눈 것 중 ${n(take)}묶음을 분수로 나타낼 때 분자를 쓰시오.`,
    n(take),
    `가져온 묶음 수가 분자이므로 ${n(take)} 입니다.`,
  );
}

function part241Rest(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  const take = intBetween(rng, 1, groups - 1);
  return make(
    unit,
    `전체를 ${n(groups)}묶음으로 나누어 ${n(take)}묶음을 가져갔습니다. 남은 묶음은 몇 묶음입니까?`,
    n(groups - take),
    `${expr(`${groups}-${take}=${groups - take}`)} 입니다.`,
  );
}

function part241RestFrac(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  const take = intBetween(rng, 1, groups - 1);
  return make(
    unit,
    `전체를 ${n(groups)}묶음으로 나누어 ${n(take)}묶음을 가져갔습니다. 남은 부분은 분수로 얼마입니까?`,
    expr(`\\frac{${groups - take}}{${groups}}`),
    `남은 묶음은 ${n(groups - take)}묶음이므로 ${expr(`\\frac{${groups - take}}{${groups}}`)} 입니다.`,
  );
}

function part241Unit(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  return make(
    unit,
    `전체를 똑같이 ${n(groups)}묶음으로 나눈 것 중 한 묶음은 분수로 얼마입니까?`,
    expr(`\\frac{1}{${groups}}`),
    `한 묶음은 ${expr(`\\frac{1}{${groups}}`)} 입니다.`,
  );
}

function part241Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const groups = intBetween(rng, 3, 8);
  const take = intBetween(rng, 1, groups - 1);
  return make(
    unit,
    `가져온 ${n(take)}묶음과 남은 ${n(groups - take)}묶음을 더하면 몇 묶음입니까?`,
    n(groups),
    `${expr(`${take}+${groups - take}=${groups}`)} 입니다.`,
  );
}

function frac24EachOf(unitOnly: boolean): ChapterHandler {
  return (unit, rng) => {
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    return make(
      unit,
      `${n(whole)}을 똑같이 ${n(den)}묶음으로 나누면 한 묶음은 얼마입니까?`,
      n(each),
      `${expr(`${whole}\\div${den}=${each}`)} 입니다.`,
    );
  };
}

function frac24TakeOf(unitOnly: boolean): ChapterHandler {
  return (unit, rng) => {
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    return make(
      unit,
      `${n(whole)}의 ${expr(`\\frac{${take}}{${den}}`)} 만큼은 한 묶음이 ${n(each)}일 때 몇 묶음입니까?`,
      n(take),
      `${expr(`\\frac{${take}}{${den}}`)} 은 ${n(take)}묶음입니다.`,
    );
  };
}

function frac24DenOf(unitOnly: boolean): ChapterHandler {
  return (unit, rng) => {
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    return make(
      unit,
      `${n(whole)}의 ${expr(`\\frac{${take}}{${den}}`)} 만큼을 구할 때 분모를 쓰시오.`,
      n(den),
      `분모는 ${n(den)} 입니다.`,
    );
  };
}

function frac24LeftOf(unitOnly: boolean): ChapterHandler {
  return (unit, rng) => {
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    const take = takeOf(rng, den, unitOnly);
    return make(
      unit,
      `${n(whole)}의 ${expr(`\\frac{${take}}{${den}}`)} 만큼을 가져가면 남는 수는 얼마입니까?`,
      n(whole - each * take),
      `가져간 것은 ${n(each * take)} 이므로 ${expr(`${whole}-${each * take}=${whole - each * take}`)} 입니다.`,
    );
  };
}

function frac24TwiceOf(unitOnly: boolean): ChapterHandler {
  return (unit, rng) => {
    const den = intBetween(rng, unitOnly ? 3 : 4, 8);
    const each = intBetween(rng, 2, 8);
    const whole = den * each;
    const take = unitOnly ? 1 : 1;
    return make(
      unit,
      `${n(whole)}의 ${expr(`\\frac{${take}}{${den}}`)} 만큼의 $2$ 배는 얼마입니까?`,
      n(each * 2),
      `한 묶음은 ${n(each)} 이므로 $2$ 배는 ${expr(`${each}\\times2=${each * 2}`)} 입니다.`,
    );
  };
}

function frac24WholeOf(unitOnly: boolean): ChapterHandler {
  return (unit, rng) => {
    const den = intBetween(rng, unitOnly ? 2 : 3, 8);
    const each = intBetween(rng, 2, 9);
    const whole = den * each;
    return make(
      unit,
      `한 묶음이 ${n(each)}이고 묶음이 ${n(den)}개이면 전체는 얼마입니까?`,
      n(whole),
      `${expr(`${each}\\times${den}=${whole}`)} 입니다.`,
    );
  };
}

function kind244ImpCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 9);
  const proper = distinctIdx(rng, den - 1, 2).map((i) => i + 1);
  const improper = distinctIdx(rng, 5, 2).map((i) => i + den);
  const order = distinctIdx(rng, 4, 4);
  const all = [...proper, ...improper];
  const shown = order.map((i) => all[i]!);
  const list = shown.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `다음 분수 가운데 가분수는 몇 개입니까?\n\n${list}`,
    n(2),
    `분자가 분모 이상인 것이 가분수이므로 $2$개입니다.`,
  );
}

function kind244ImpNumSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 9);
  const proper = distinctIdx(rng, den - 1, 2).map((i) => i + 1);
  const improper = distinctIdx(rng, 5, 2).map((i) => i + den);
  const order = distinctIdx(rng, 4, 4);
  const all = [...proper, ...improper];
  const shown = order.map((i) => all[i]!);
  const list = shown.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  const s = shown.filter((v) => v >= den).reduce((t, v) => t + v, 0);
  return make(
    unit,
    `다음 분수 가운데 가분수의 분자를 모두 더한 값을 쓰시오.\n\n${list}`,
    n(s),
    `가분수의 분자 합은 ${n(s)} 입니다.`,
  );
}

function kind244Den(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 9);
  return make(
    unit,
    `${expr(`\\frac{${den + 1}}{${den}}`)} 의 분모를 쓰시오.`,
    n(den),
    `분모는 ${n(den)} 입니다.`,
  );
}

function kind244WholeQ(unit: UnitSeed, rng: Rng): ElemProblem {
  const wantImproper = altCase(rng);
  const den = intBetween(rng, 3, 9);
  const num = wantImproper
    ? den + intBetween(rng, 0, 4)
    : intBetween(rng, 1, den - 1);
  const yes = num >= den;
  return make(
    unit,
    `${expr(`\\frac{${num}}{${den}}`)} 은 가분수입니까? 예 또는 아니요로 쓰시오.`,
    yes ? "예" : "아니요",
    yes
      ? `분자가 분모 이상이므로 가분수입니다.`
      : `분자가 분모보다 작으므로 가분수가 아닙니다.`,
  );
}

function kind244Gap(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const num = intBetween(rng, den + 1, den + 5);
  return make(
    unit,
    `${expr(`\\frac{${num}}{${den}}`)} 에서 분자와 분모의 차는 얼마입니까?`,
    n(num - den),
    `${expr(`${num}-${den}=${num - den}`)} 입니다.`,
  );
}

function kind244Def(unit: UnitSeed, rng: Rng): ElemProblem {
  const many = intBetween(rng, 2, 6);
  return make(
    unit,
    `분자가 분모보다 작은 분수를 무엇이라고 합니까? 그런 분수를 ${n(many)}개 쓸 수 있습니다.`,
    "진분수",
    `분자가 분모보다 작은 분수가 진분수입니다.`,
  );
}

function mixed245Whole(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  return make(
    unit,
    `${expr(`${whole}\\frac{${rest}}{${den}}`)} 의 자연수 부분을 쓰시오.`,
    n(whole),
    `자연수 부분은 ${n(whole)} 입니다.`,
  );
}

function mixed245Rest(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  return make(
    unit,
    `${expr(`${whole}\\frac{${rest}}{${den}}`)} 의 진분수 부분의 분자를 쓰시오.`,
    n(rest),
    `진분수 부분의 분자는 ${n(rest)} 입니다.`,
  );
}

function mixed245Den(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  return make(
    unit,
    `${expr(`${whole}\\frac{${rest}}{${den}}`)} 의 분모를 쓰시오.`,
    n(den),
    `분모는 ${n(den)} 입니다.`,
  );
}

function mixed245ImpNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  const num = whole * den + rest;
  return make(
    unit,
    `${expr(`${whole}\\frac{${rest}}{${den}}`)} 을 가분수로 나타낼 때 분자를 쓰시오.`,
    n(num),
    `${expr(`${whole}\\times${den}+${rest}=${num}`)} 입니다.`,
  );
}

function mixed245WholeTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  return make(
    unit,
    `${expr(`${whole}\\frac{${rest}}{${den}}`)} 에서 자연수 부분과 분모를 곱한 값을 쓰시오.`,
    n(whole * den),
    `${expr(`${whole}\\times${den}=${whole * den}`)} 입니다.`,
  );
}

function mixed245ImpDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 3, 8);
  const whole = intBetween(rng, 2, 5);
  const rest = pick(rng, coprimeNums(den, 1));
  return make(
    unit,
    `${expr(`${whole}\\frac{${rest}}{${den}}`)} 을 가분수로 나타낼 때 분모를 쓰시오.`,
    n(den),
    `분모는 그대로 ${n(den)} 입니다.`,
  );
}

function cmp246SmallNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `다음 세 분수 중 가장 작은 분수의 분자를 쓰시오.\n\n${list}`,
    n(Math.min(...three)),
    `분자가 가장 작은 수가 ${n(Math.min(...three))} 입니다.`,
  );
}

function cmp246BigNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `다음 세 분수 중 가장 큰 분수의 분자를 쓰시오.\n\n${list}`,
    n(Math.max(...three)),
    `분자가 가장 큰 수가 ${n(Math.max(...three))} 입니다.`,
  );
}

function cmp246Den(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `다음 세 분수의 분모를 쓰시오.\n\n${list}`,
    n(den),
    `분모는 모두 ${n(den)} 입니다.`,
  );
}

function cmp246NumSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  const s = three.reduce((t, v) => t + v, 0);
  return make(
    unit,
    `다음 세 분수의 분자를 모두 더한 값을 쓰시오.\n\n${list}`,
    n(s),
    `분자의 합은 ${n(s)} 입니다.`,
  );
}

function cmp246Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const sorted = [...three].sort((a, b) => a - b);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `다음 세 분수 중 크기가 가운데인 분수의 분자를 쓰시오.\n\n${list}`,
    n(sorted[1]!),
    `가운데 크기의 분자는 ${n(sorted[1]!)} 입니다.`,
  );
}

function cmp246Count(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = intBetween(rng, 5, 9);
  const three = distinctIdx(rng, den - 1, 3).map((i) => i + 1);
  const list = three.map((v) => expr(`\\frac{${v}}{${den}}`)).join(",  ");
  return make(
    unit,
    `다음 분수는 모두 몇 개입니까?\n\n${list}`,
    n(3),
    `분수가 $3$개입니다.`,
  );
}

function capCmpToSmallOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 는 몇 ${cfg.small}입니까?`,
      n(b * 1000 + s),
      `$1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 ${n(b * 1000 + s)} ${cfg.small}입니다.`,
    );
  };
}

function capCmpBigPartOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 에서 ${cfg.big} 단위의 수만큼만 쓰시오.`,
      n(b),
      `${cfg.big} 단위 부분은 ${n(b)} ${cfg.big}입니다.`,
    );
  };
}

function capCmpSmallPartOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 에서 ${cfg.small} 단위의 수만큼만 쓰시오.`,
      n(s),
      `${cfg.small} 단위 부분은 ${n(s)} ${cfg.small}입니다.`,
    );
  };
}

function capCmpHowManyOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 2, 9);
    return make(
      unit,
      `$${b * 1000}\\,\\mathrm{${cfg.small}}$ 안에는 $1000\\,\\mathrm{${cfg.small}}$ 이 몇 번 들어갑니까?`,
      n(b),
      `${expr(`${b * 1000}\\div1000=${b}`)} 이므로 ${n(b)}번입니다.`,
    );
  };
}

function capCmpGapOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    const left = b * 1000 + s;
    const gap = intBetween(rng, 20, 400);
    const right = left + gap;
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 과 ${unitNum(right, cfg.small)} 의 차는 몇 ${cfg.small}입니까?`,
      n(gap),
      `${expr(`${right}-${left}=${gap}`)} 입니다.`,
    );
  };
}

function capCmpBiggerOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 900);
    const left = b * 1000 + s;
    const gap = intBetween(rng, 20, 400);
    const right = left + gap * (intBetween(rng, 0, 1) === 0 ? 1 : -1);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 과 ${unitNum(right, cfg.small)} 가운데 더 큰 값은 몇 ${cfg.small}입니까?`,
      n(Math.max(left, right)),
      `둘을 ${cfg.small} ${cfg.jRo} 고치면 ${n(left)} 과 ${n(right)} 이므로 더 큰 값은 ${n(Math.max(left, right))} ${cfg.small}입니다.`,
    );
  };
}

function capUnitMissingOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 2, 9);
    const s = intBetween(rng, 1, 9) * 100;
    const total = b * 1000 + s;
    return make(
      unit,
      `$\\square$ 안에 알맞은 수를 쓰시오.\n\n$\\square\\,\\mathrm{${cfg.big}}\\ ${s}\\,\\mathrm{${cfg.small}}=${total}\\,\\mathrm{${cfg.small}}$`,
      n(b),
      `$1\\,\\mathrm{${cfg.big}}=1000\\,\\mathrm{${cfg.small}}$ 이므로 ${n(b)} ${cfg.big}입니다.`,
    );
  };
}

function capUnitOnlySmallOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 2, 9);
    const s = intBetween(rng, 1, 9) * 100;
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 에서 ${cfg.small} 단위의 수만큼만 쓰시오.`,
      n(s),
      `${cfg.small} 단위 부분은 ${n(s)} ${cfg.small}입니다.`,
    );
  };
}

function capUnitSumOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 4);
    const s = intBetween(rng, 1, 8) * 100;
    const j = intBetween(rng, 1, 3);
    const f = intBetween(rng, 1, 8) * 100;
    const t1 = b * 1000 + s;
    const t2 = j * 1000 + f;
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 과 ${mixedCap(cfg, j, f)} 의 합은 몇 ${cfg.small}입니까?`,
      n(t1 + t2),
      `${expr(`${t1}+${t2}=${t1 + t2}`)} 입니다.`,
    );
  };
}

function capUnitDiffOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 3, 6);
    const s = intBetween(rng, 2, 8) * 100;
    const j = intBetween(rng, 1, b - 1);
    const f = intBetween(rng, 1, 8) * 100;
    const t1 = b * 1000 + s;
    const t2 = j * 1000 + f;
    const hi = Math.max(t1, t2);
    const lo = Math.min(t1, t2);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 과 ${mixedCap(cfg, j, f)} 의 차는 몇 ${cfg.small}입니까?`,
      n(hi - lo),
      `${expr(`${hi}-${lo}=${hi - lo}`)} 입니다.`,
    );
  };
}

function capUnitHowManyOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 2, 9);
    return make(
      unit,
      `$${b * 1000}\\,\\mathrm{${cfg.small}}$ 안에는 $1\\,\\mathrm{${cfg.big}}$ 이 몇 개 들어갑니까?`,
      n(b),
      `${expr(`${b * 1000}\\div1000=${b}`)} 이므로 ${n(b)}개입니다.`,
    );
  };
}

function capUnitPlus100Of(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 1, 8) * 100;
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 에 $100\\,\\mathrm{${cfg.small}}$ 을 더하면 몇 ${cfg.small}입니까?`,
      n(b * 1000 + s + 100),
      `${expr(`${b * 1000 + s}+100=${b * 1000 + s + 100}`)} 입니다.`,
    );
  };
}

function capSumBigOnlyOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b1 = intBetween(rng, 2, 4);
    const b2 = intBetween(rng, 1, 3);
    const s1 = intBetween(rng, 100, 400);
    const s2 = intBetween(rng, 50, 400);
    return make(
      unit,
      `${mixedCap(cfg, b1, s1)} 과 ${mixedCap(cfg, b2, s2)} 에서 ${cfg.big}끼리만 더한 값은 몇 ${cfg.big}입니까?`,
      n(b1 + b2),
      `${expr(`${b1}+${b2}=${b1 + b2}`)} 입니다.`,
    );
  };
}

function capSumSmallOnlyOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b1 = intBetween(rng, 2, 4);
    const b2 = intBetween(rng, 1, 3);
    const s1 = intBetween(rng, 100, 400);
    const s2 = intBetween(rng, 50, 400);
    return make(
      unit,
      `${mixedCap(cfg, b1, s1)} 과 ${mixedCap(cfg, b2, s2)} 에서 ${cfg.small}끼리만 더한 값은 몇 ${cfg.small}입니까?`,
      n(s1 + s2),
      `${expr(`${s1}+${s2}=${s1 + s2}`)} 입니다.`,
    );
  };
}

function capSumCarryQOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const s1 = intBetween(rng, 200, 800);
    const s2 = intBetween(rng, 200, 800);
    const b1 = intBetween(rng, 1, 3);
    const b2 = intBetween(rng, 1, 3);
    const yes = s1 + s2 >= 1000;
    return make(
      unit,
      `${mixedCap(cfg, b1, s1)} 과 ${mixedCap(cfg, b2, s2)} 을 더할 때 ${cfg.small}에서 ${cfg.big}으로 올림이 있습니까? 예 또는 아니요로 쓰시오.`,
      yes ? "예" : "아니요",
      `${cfg.small}끼리 더하면 ${n(s1 + s2)} 이므로 ${yes ? "올림이 있습니다" : "올림이 없습니다"}.`,
    );
  };
}

function capSumToSmallOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 4);
    const s = intBetween(rng, 100, 800);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 는 몇 ${cfg.small}입니까?`,
      n(b * 1000 + s),
      `${expr(`1000\\times${b}+${s}=${b * 1000 + s}`)} 입니다.`,
    );
  };
}

function capSumPlusOneBigOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b = intBetween(rng, 1, 5);
    const s = intBetween(rng, 100, 800);
    return make(
      unit,
      `${mixedCap(cfg, b, s)} 에 $1\\,\\mathrm{${cfg.big}}$ 을 더하면 몇 ${cfg.small}입니까?`,
      n((b + 1) * 1000 + s),
      `${expr(`${b * 1000 + s}+1000=${(b + 1) * 1000 + s}`)} 입니다.`,
    );
  };
}

function capSumDiffBigOf(cfg: CapCfg): ChapterHandler {
  return (unit, rng) => {
    const b1 = intBetween(rng, 3, 6);
    const b2 = intBetween(rng, 1, b1 - 1);
    const s = intBetween(rng, 100, 400);
    return make(
      unit,
      `${mixedCap(cfg, b1, s)} 에서 ${mixedCap(cfg, b2, s)} 을 뺄 때 ${cfg.big}끼리만 빼면 몇 ${cfg.big}입니까?`,
      n(b1 - b2),
      `${expr(`${b1}-${b2}=${b1 - b2}`)} 입니다.`,
    );
  };
}

function graph261Value(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  const at = intBetween(rng, 0, 2);
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니다. ${GRAPH_LABELS[at]} ${place}의 □ 칸 수를 쓰시오.`,
    n(counts[at]!),
    `${GRAPH_LABELS[at]} ${place}${josa(place, "은", "는")} □가 ${n(counts[at]!)}칸입니다.`,
    graphSpec(
      step,
      counts.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

function graph261Total(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  const sum = counts.reduce((t, c) => t + c * step, 0);
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}입니다. 세 ${place}의 ${stuff.name} 수를 모두 더하면 몇 ${stuff.unit}입니까?`,
    n(sum),
    `세 곳의 합은 ${n(sum)}${stuff.unit}입니다.`,
    graphSpec(
      step,
      counts.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

function graph261Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [2, 4, 6];
  const order = pick(rng, CAP_PERMS);
  const shown = order.map((i) => counts[i]!);
  const hi = Math.max(...shown);
  const lo = Math.min(...shown);
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}입니다. 가장 많은 ${place}${josa(place, "과", "와")} 가장 적은 ${place}의 ${stuff.name} 수의 차는 몇 ${stuff.unit}입니까?`,
    n((hi - lo) * step),
    `칸 수의 차는 ${n(hi - lo)}칸이므로 ${expr(`${step}\\times${hi - lo}=${(hi - lo) * step}`)} 입니다.`,
    graphSpec(
      step,
      shown.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

function graph261Cells(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  const sum = counts.reduce((t, c) => t + c, 0);
  return make(
    unit,
    `그림그래프에서 □ 칸을 모두 세면 몇 칸입니까?`,
    n(sum),
    `세 ${place}의 칸을 더하면 ${n(sum)}칸입니다.`,
    graphSpec(
      step,
      counts.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

function graph261Twice(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const counts = [0, 1, 2].map(() => intBetween(rng, 2, GRAPH_MAX_COUNT));
  const at = intBetween(rng, 0, 2);
  return make(
    unit,
    `그림그래프에서 □ 한 칸은 ${stuff.name} ${n(step)}${stuff.unit}입니다. ${GRAPH_LABELS[at]} ${place}의 ${stuff.name} 수의 $2$ 배는 몇 ${stuff.unit}입니까?`,
    n(counts[at]! * step * 2),
    `${GRAPH_LABELS[at]} ${place}${josa(place, "은", "는")} ${n(counts[at]! * step)}${stuff.unit}이므로 $2$ 배는 ${n(counts[at]! * step * 2)}${stuff.unit}입니다.`,
    graphSpec(
      step,
      counts.map((c, i) => ({ label: GRAPH_LABELS[i]!, count: c })),
    ),
  );
}

function graph261Step(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const step = graphStep(rng);
  const count = intBetween(rng, 2, GRAPH_MAX_COUNT);
  return make(
    unit,
    `그림그래프에서 □가 ${n(count)}칸이고 ${stuff.name} 수가 ${n(count * step)}${stuff.unit}일 때, □ 한 칸은 몇 ${stuff.unit}${josa(stuff.unit, "을", "를")} 나타냅니까?`,
    n(step),
    `${expr(`${count * step}\\div${count}=${step}`)} 입니다.`,
    graphSpec(step, [{ label: GRAPH_LABELS[0]!, count }], true),
  );
}

function graph262Tens(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const value = intBetween(rng, 1, 4) * 10 + intBetween(rng, 1, 9);
  return make(
    unit,
    `${place}의 ${stuff.name} 수가 ${n(value)}${stuff.unit}입니다. 큰 그림 한 개가 ${n(10)}${stuff.unit}일 때 큰 그림은 몇 개 그려야 합니까?`,
    n(Math.floor(value / 10)),
    `${expr(`${Math.floor(value / 10)}\\times10`)} 이 ${n(Math.floor(value / 10) * 10)} 이므로 큰 그림은 ${n(Math.floor(value / 10))}개입니다.`,
  );
}

function graph262Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const value = intBetween(rng, 1, 4) * 10 + intBetween(rng, 1, 9);
  return make(
    unit,
    `${place}의 ${stuff.name} 수가 ${n(value)}${stuff.unit}입니다. 작은 그림 한 개가 ${n(1)}${stuff.unit}일 때 작은 그림은 몇 개 그려야 합니까?`,
    n(value % 10),
    `일의 자리가 ${n(value % 10)} 이므로 작은 그림은 ${n(value % 10)}개입니다.`,
  );
}

function graph262Value(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const tens = intBetween(rng, 1, 4);
  const ones = intBetween(rng, 1, 9);
  return make(
    unit,
    `큰 그림 ${n(tens)}개와 작은 그림 ${n(ones)}개로 나타낸 ${place}의 ${stuff.name} 수는 몇 ${stuff.unit}입니까? 큰 그림 한 개는 ${n(10)}${stuff.unit}입니다.`,
    n(tens * 10 + ones),
    `${expr(`10\\times${tens}+${ones}=${tens * 10 + ones}`)} 입니다.`,
  );
}

function graph262Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const a = intBetween(rng, 11, 49);
  const b = intBetween(rng, 11, 49);
  return make(
    unit,
    `가 ${place} ${n(a)}${stuff.unit}, 나 ${place} ${n(b)}${stuff.unit}입니다. 두 ${place}의 ${stuff.name} 수의 합은 몇 ${stuff.unit}입니까?`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

function graph262Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const a = intBetween(rng, 21, 49);
  const b = intBetween(rng, 11, a - 5);
  return make(
    unit,
    `가 ${place} ${n(a)}${stuff.unit}, 나 ${place} ${n(b)}${stuff.unit}입니다. 두 ${place}의 ${stuff.name} 수의 차는 몇 ${stuff.unit}입니까?`,
    n(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 입니다.`,
  );
}

function graph262TenTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const stuff = pick(rng, GRAPH_STUFF);
  const place = pick(rng, stuff.places);
  const tens = intBetween(rng, 1, 4);
  return make(
    unit,
    `큰 그림 ${n(tens)}개만 그렸습니다. 큰 그림 한 개가 ${n(10)}${stuff.unit}일 때 ${place}의 ${stuff.name} 수는 몇 ${stuff.unit}입니까?`,
    n(tens * 10),
    `${expr(`10\\times${tens}=${tens * 10}`)} 입니다.`,
  );
}

export const G3_FORMS: Record<string, readonly ElemForm[]> = {
  "초3|1-1-1": [
    { id: "01", tier: "연산", generate: sub111Calc },
    { id: "02", tier: "기본", generate: sub111Word },
    { id: "03", tier: "응용", generate: sub111Apply },
    { id: "04", tier: "심화하", generate: sub111Deep },
    { id: "05", tier: "기본", generate: add111Hundreds },
    { id: "06", tier: "기본", generate: add111Missing },
    { id: "07", tier: "기본", generate: add111OnesSum },
    { id: "08", tier: "응용", generate: add111HowMuchMore },
    { id: "09", tier: "응용", generate: add111Plus100 },
    { id: "10", tier: "응용", generate: add111EvenOdd },
  ],
  "초3|1-1-2": [
    { id: "01", tier: "연산", generate: add3Calc },
    { id: "02", tier: "기본", generate: add3Word },
    { id: "03", tier: "응용", generate: add3TwoStep },
    { id: "04", tier: "심화하", generate: add3Reverse },
    { id: "05", tier: "기본", generate: add112Digits },
    { id: "06", tier: "기본", generate: add112Unknown },
    { id: "07", tier: "기본", generate: add112CarryCount },
    { id: "08", tier: "응용", generate: add112From1000 },
    { id: "09", tier: "응용", generate: add112Minus10 },
    { id: "10", tier: "응용", generate: add112BiggerSum },
  ],
  "초3|1-1-3": [
    { id: "01", tier: "연산", generate: subCalcOf(0, 1) },
    { id: "02", tier: "기본", generate: subWordOf(0, 1) },
    { id: "03", tier: "응용", generate: subApplyOf(0, 1) },
    { id: "04", tier: "심화하", generate: subDeepOf(0, 1) },
    { id: "05", tier: "기본", generate: sub113Hundreds },
    { id: "06", tier: "기본", generate: sub113MissingMinuend },
    { id: "07", tier: "기본", generate: sub113OnesDiff },
    { id: "08", tier: "응용", generate: sub113Plus10 },
    { id: "09", tier: "응용", generate: sub113HowMuchMore },
    { id: "10", tier: "응용", generate: sub113DigitSum },
  ],
  "초3|1-1-4": [
    { id: "01", tier: "연산", generate: subCalcOf(2, 2) },
    { id: "02", tier: "기본", generate: subWordOf(2, 2) },
    { id: "03", tier: "응용", generate: subApplyOf(2, 2) },
    { id: "04", tier: "심화하", generate: subDeepOf(2, 2) },
    { id: "05", tier: "기본", generate: sub114Tens },
    { id: "06", tier: "기본", generate: sub114MissingSubtrahend },
    { id: "07", tier: "기본", generate: sub114HundredsBare },
    { id: "08", tier: "응용", generate: sub114Plus100 },
    { id: "09", tier: "응용", generate: sub114From100 },
    { id: "10", tier: "응용", generate: sub114SmallerDiff },
  ],
  "초3|1-2-1": [
    { id: "01", tier: "연산", generate: line121Calc },
    { id: "02", tier: "기본", generate: line121Word },
    { id: "03", tier: "응용", generate: line121Apply },
    { id: "04", tier: "심화하", generate: line121Deep },
    { id: "05", tier: "기본", generate: line121DefSeg },
    { id: "06", tier: "기본", generate: line121DefRay },
    { id: "07", tier: "기본", generate: line121DefLine },
    { id: "08", tier: "응용", generate: line121RayCount },
    { id: "09", tier: "응용", generate: line121RemovePoint },
    { id: "10", tier: "응용", generate: line121RayPlusSeg },
  ],
  "초3|1-2-2": [
    { id: "01", tier: "연산", generate: angle122Calc },
    { id: "02", tier: "기본", generate: angle122Word },
    { id: "03", tier: "응용", generate: angle122Apply },
    { id: "04", tier: "심화하", generate: angle122Deep },
    { id: "05", tier: "기본", generate: ang122RightCount },
    { id: "06", tier: "기본", generate: ang122NotRight },
    { id: "07", tier: "기본", generate: ang122Def },
    { id: "08", tier: "응용", generate: ang122OtherCount },
    { id: "09", tier: "응용", generate: ang122AllRight },
    { id: "10", tier: "응용", generate: ang122Rays },
  ],
  "초3|1-2-3": [
    { id: "01", tier: "연산", generate: tri123Calc },
    { id: "02", tier: "기본", generate: tri123Word },
    { id: "03", tier: "응용", generate: tri123Apply },
    { id: "04", tier: "심화하", generate: tri123Deep },
    { id: "05", tier: "기본", generate: tri123RightCount },
    { id: "06", tier: "기본", generate: tri123NotRight },
    { id: "07", tier: "기본", generate: tri123Def },
    { id: "08", tier: "응용", generate: tri123RightSides },
    { id: "09", tier: "응용", generate: tri123AllRight },
    { id: "10", tier: "응용", generate: tri123Vertices },
  ],
  "초3|1-2-4": [
    { id: "01", tier: "연산", generate: rect124Calc },
    { id: "02", tier: "기본", generate: rect124Word },
    { id: "03", tier: "응용", generate: rect124Apply },
    { id: "04", tier: "심화하", generate: rect124Deep },
    { id: "05", tier: "기본", generate: rect124OtherCount },
    { id: "06", tier: "기본", generate: rect124NotRect },
    { id: "07", tier: "기본", generate: rect124Def },
    { id: "08", tier: "응용", generate: rect124TwoWidths },
    { id: "09", tier: "응용", generate: rect124TwoHeights },
    { id: "10", tier: "응용", generate: rect124RightAngles },
  ],
  "초3|1-2-5": [
    { id: "01", tier: "연산", generate: sq125Calc },
    { id: "02", tier: "기본", generate: sq125Word },
    { id: "03", tier: "응용", generate: sq125Apply },
    { id: "04", tier: "심화하", generate: sq125Deep },
    { id: "05", tier: "기본", generate: sq125OtherCount },
    { id: "06", tier: "기본", generate: sq125NotSq },
    { id: "07", tier: "기본", generate: sq125Def },
    { id: "08", tier: "응용", generate: sq125OppSum },
    { id: "09", tier: "응용", generate: sq125SideCount },
    { id: "10", tier: "응용", generate: sq125PerimMinus },
  ],
  "초3|1-3-1": [
    { id: "01", tier: "연산", generate: div131Calc },
    { id: "02", tier: "기본", generate: div131Word },
    { id: "03", tier: "응용", generate: div131Apply },
    { id: "04", tier: "심화하", generate: div131Deep },
    { id: "05", tier: "기본", generate: div131Check },
    { id: "06", tier: "기본", generate: div131MissingDivisor },
    { id: "07", tier: "기본", generate: div131MissingDividend },
    { id: "08", tier: "응용", generate: div131HowManyGroups },
    { id: "09", tier: "응용", generate: div131Compare },
    { id: "10", tier: "응용", generate: div131TotalFromShare },
  ],
  "초3|1-3-2": [
    { id: "01", tier: "연산", generate: div132Calc },
    { id: "02", tier: "기본", generate: div132Word },
    { id: "03", tier: "응용", generate: div132Apply },
    { id: "04", tier: "심화하", generate: div132Deep },
    { id: "05", tier: "기본", generate: div132DivCount },
    { id: "06", tier: "기본", generate: div132QuotDiff },
    { id: "07", tier: "기본", generate: div132MissingFactor },
    { id: "08", tier: "응용", generate: div132Product },
    { id: "09", tier: "응용", generate: div132OtherQuot },
    { id: "10", tier: "응용", generate: div132Recover },
  ],
  "초3|1-3-3": [
    { id: "01", tier: "연산", generate: div133Calc },
    { id: "02", tier: "기본", generate: div133Word },
    { id: "03", tier: "응용", generate: div133Apply },
    { id: "04", tier: "심화하", generate: div133Deep },
    { id: "05", tier: "기본", generate: div133LeftBox },
    { id: "06", tier: "기본", generate: div133LeftItems },
    { id: "07", tier: "기본", generate: div133Check },
    { id: "08", tier: "응용", generate: div133Each },
    { id: "09", tier: "응용", generate: div133GivenItems },
    { id: "10", tier: "응용", generate: div133PlusPack },
  ],
  "초3|1-3-4": [
    { id: "01", tier: "연산", generate: div134Calc },
    { id: "02", tier: "기본", generate: div134Word },
    { id: "03", tier: "응용", generate: div134Apply },
    { id: "04", tier: "심화하", generate: div134Deep },
    { id: "05", tier: "기본", generate: div134WhichTable },
    { id: "06", tier: "기본", generate: div134TimesWhat },
    { id: "07", tier: "기본", generate: div134QuotTimesTable },
    { id: "08", tier: "응용", generate: div134TotalPages },
    { id: "09", tier: "응용", generate: div134DaysMinus },
    { id: "10", tier: "응용", generate: div134GuguProduct },
  ],
  "초3|1-4-1": MUL14_FORMS,
  "초3|1-4-2": MUL14_FORMS,
  "초3|1-4-3": MUL14_FORMS,
  "초3|1-4-4": MUL14_FORMS,
  "초3|1-4-5": MUL14_FORMS,
  "초3|1-5-1": ten(
    lenCalcOf(LEN_CM),
    lenWordOf(LEN_CM),
    lenApplyOf(LEN_CM),
    lenDeepOf(LEN_CM),
    lenMissingBigOf(LEN_CM),
    lenOnlySmallOf(LEN_CM),
    lenTimesMulOf(LEN_CM),
    lenSumSmallOf(LEN_CM),
    lenDiffSmallOf(LEN_CM),
    lenHowManyBigOf(LEN_CM),
  ),
  "초3|1-5-2": ten(
    lenCalcOf(LEN_KM),
    lenWordOf(LEN_KM),
    lenApplyOf(LEN_KM),
    lenDeepOf(LEN_KM),
    lenMissingBigOf(LEN_KM),
    lenOnlySmallOf(LEN_KM),
    lenTimesMulOf(LEN_KM),
    lenSumSmallOf(LEN_KM),
    lenDiffSmallOf(LEN_KM),
    lenHowManyBigOf(LEN_KM),
  ),
  "초3|1-5-3": ten(
    guessCalc,
    guessWord,
    guessApply,
    guessDeep,
    guessMmOfCm,
    guessError,
    guessSum,
    guessToCmMm,
    guessHowManyCm,
    guessTwice,
  ),
  "초3|1-5-4": ten(
    sec154Calc,
    sec154Word,
    sec154Apply,
    sec154Deep,
    secMissingMin,
    secOnlySec,
    secHowManyMin,
    secSum,
    secDiff,
    secPlusMin,
  ),
  "초3|1-5-5": ten(
    time155Calc,
    time155Word,
    time155Apply,
    time155Deep,
    time155MinutesOnly,
    time155HoursOnly,
    time155CarryQ,
    time155TotalMin,
    time155AddOneHour,
    time155SumHours,
  ),
  "초3|1-5-6": ten(
    time156Calc,
    time156Word,
    time156Apply,
    time156Deep,
    time156MinutesOnly,
    time156HoursOnly,
    time156BorrowQ,
    time156TotalMin,
    time156MinusHour,
    time156DiffHours,
  ),
  "초3|1-6-1": ten(
    part161Calc,
    part161Word,
    part161Apply,
    part161Deep,
    part161Filled,
    part161Empty,
    part161UnitFrac,
    part161TwoFrac,
    part161CheckSum,
    part161Def,
  ),
  "초3|1-6-2": ten(
    frac162Calc,
    frac162Word,
    frac162Apply,
    frac162Deep,
    frac162Den,
    frac162Num,
    frac162Copies,
    frac162Gap,
    frac162Whole,
    frac162PlusOne,
  ),
  "초3|1-6-3": ten(
    frac163Calc,
    frac163Word,
    frac163Apply,
    frac163Deep,
    frac163RestN,
    frac163Eaten,
    frac163RestDen,
    frac163Check,
    frac163More,
    frac163Parts,
  ),
  "초3|1-6-4": ten(
    cmp164Calc,
    cmp164Word,
    cmp164Apply,
    cmp164Deep,
    cmp164BigNum,
    cmp164NumDiff,
    cmp164NumSum,
    cmp164Den,
    cmp164SmallNum,
    cmp164SameDenQ,
  ),
  "초3|1-6-5": ten(
    unit165Calc,
    unit165Word,
    unit165Apply,
    unit165Deep,
    unit165SmallDen,
    unit165DenSum,
    unit165DenDiff,
    unit165BigDen,
    unit165OneOver,
    unit165Finer,
  ),
  "초3|1-6-6": ten(
    dec166Calc,
    dec166Word,
    dec166Apply,
    dec166Deep,
    dec166Tenths,
    dec166AsFracNum,
    dec166Whole,
    dec166TenthsCount,
    dec166FracDen,
    dec166TimesTen,
  ),
  "초3|1-6-7": ten(
    cmp167Calc,
    cmp167Word,
    cmp167Apply,
    cmp167Deep,
    cmp167WholeSum,
    cmp167TenthsSum,
    cmp167ScaledDiff,
    cmp167BigTenths,
    cmp167Smaller,
    cmp167SameWholeQ,
  ),
  "초3|2-1-1": MUL21_FORMS,
  "초3|2-1-2": MUL21_FORMS,
  "초3|2-1-3": ten(
    mul213Calc,
    mul213Word,
    mul213Apply,
    mul213Deep,
    mul213Missing,
    mul213Ones,
    mul213Plus10,
    mul213EvenOdd,
    mul213Tens,
    mul213OneMore,
  ),
  "초3|2-1-4": ten(
    mul214Calc,
    mul214Word,
    mul214Apply,
    mul214Deep,
    mul214Missing,
    mul214Hundreds,
    mul214Minus10,
    mul214From1000,
    mul214DigitSum,
    mul214EvenOdd,
  ),
  "초3|2-2-1": DIV22_FORMS,
  "초3|2-2-2": DIV22_FORMS,
  "초3|2-2-3": ten(
    rem223Calc,
    rem223Word,
    rem223Apply,
    rem223Deep,
    rem223Quot,
    rem223Rem,
    rem223Divisor,
    rem223Check,
    rem223LessQ,
    rem223Dividend,
  ),
  "초3|2-2-4": ten(
    div224Calc,
    div224Word,
    div224Apply,
    div224Deep,
    div224Missing,
    div224Check,
    div224HowMany,
    div224Compare,
    div224Total,
    div224Hundreds,
  ),
  "초3|2-3-2": ten(
    circ232Calc,
    circ232Word,
    circ232Apply,
    circ232Deep,
    circ232Times2,
    circ232ThreeR,
    circ232DiaMinusR,
    circ232DiaPlusR,
    circ232ManyR,
    circ232HalfDia,
  ),
  "초3|2-3-3": ten(
    circ233Calc,
    circ233Word,
    circ233Apply,
    circ233Deep,
    circ233Name,
    circ233FromDia,
    circ233Double,
    circ233SumR,
    circ233DiaMinusOpen,
    circ233TwoOpen,
  ),
  "초3|2-4-1": ten(
    part241Calc,
    part241Word,
    part241Apply,
    part241Deep,
    part241Den,
    part241Num,
    part241Rest,
    part241RestFrac,
    part241Unit,
    part241Check,
  ),
  "초3|2-4-2": ten(
    frac24CalcOf(true),
    frac24WordOf(true),
    frac24ApplyOf(true),
    frac24DeepOf(true),
    frac24EachOf(true),
    frac24TakeOf(true),
    frac24DenOf(true),
    frac24LeftOf(true),
    frac24TwiceOf(true),
    frac24WholeOf(true),
  ),
  "초3|2-4-3": ten(
    frac24CalcOf(false),
    frac24WordOf(false),
    frac24ApplyOf(false),
    frac24DeepOf(false),
    frac24EachOf(false),
    frac24TakeOf(false),
    frac24DenOf(false),
    frac24LeftOf(false),
    frac24TwiceOf(false),
    frac24WholeOf(false),
  ),
  "초3|2-4-4": ten(
    kind244Calc,
    kind244Word,
    kind244Apply,
    kind244Deep,
    kind244ImpCount,
    kind244ImpNumSum,
    kind244Den,
    kind244WholeQ,
    kind244Gap,
    kind244Def,
  ),
  "초3|2-4-5": ten(
    mixed245Calc,
    mixed245Word,
    mixed245Apply,
    mixed245Deep,
    mixed245Whole,
    mixed245Rest,
    mixed245Den,
    mixed245ImpNum,
    mixed245WholeTimes,
    mixed245ImpDen,
  ),
  "초3|2-4-6": ten(
    cmp246Calc,
    cmp246Word,
    cmp246Apply,
    cmp246Deep,
    cmp246SmallNum,
    cmp246BigNum,
    cmp246Den,
    cmp246NumSum,
    cmp246Mid,
    cmp246Count,
  ),
  "초3|2-5-1": ten(
    capCmpCalcOf(CAP_L),
    capCmpWordOf(CAP_L),
    capCmpApplyOf(CAP_L),
    capCmpDeepOf(CAP_L),
    capCmpToSmallOf(CAP_L),
    capCmpBigPartOf(CAP_L),
    capCmpSmallPartOf(CAP_L),
    capCmpHowManyOf(CAP_L),
    capCmpGapOf(CAP_L),
    capCmpBiggerOf(CAP_L),
  ),
  "초3|2-5-2": ten(
    capUnitCalcOf(CAP_L),
    capUnitWordOf(CAP_L),
    capUnitApplyOf(CAP_L),
    capUnitDeepOf(CAP_L),
    capUnitMissingOf(CAP_L),
    capUnitOnlySmallOf(CAP_L),
    capUnitSumOf(CAP_L),
    capUnitDiffOf(CAP_L),
    capUnitHowManyOf(CAP_L),
    capUnitPlus100Of(CAP_L),
  ),
  "초3|2-5-3": ten(
    capSumCalcOf(CAP_L),
    capSumWordOf(CAP_L),
    capSumApplyOf(CAP_L),
    capSumDeepOf(CAP_L),
    capSumBigOnlyOf(CAP_L),
    capSumSmallOnlyOf(CAP_L),
    capSumCarryQOf(CAP_L),
    capSumToSmallOf(CAP_L),
    capSumPlusOneBigOf(CAP_L),
    capSumDiffBigOf(CAP_L),
  ),
  "초3|2-5-4": ten(
    capCmpCalcOf(CAP_KG),
    capCmpWordOf(CAP_KG),
    capCmpApplyOf(CAP_KG),
    capCmpDeepOf(CAP_KG),
    capCmpToSmallOf(CAP_KG),
    capCmpBigPartOf(CAP_KG),
    capCmpSmallPartOf(CAP_KG),
    capCmpHowManyOf(CAP_KG),
    capCmpGapOf(CAP_KG),
    capCmpBiggerOf(CAP_KG),
  ),
  "초3|2-5-5": ten(
    capUnitCalcOf(CAP_KG),
    capUnitWordOf(CAP_KG),
    capUnitApplyOf(CAP_KG),
    capUnitDeepOf(CAP_KG),
    capUnitMissingOf(CAP_KG),
    capUnitOnlySmallOf(CAP_KG),
    capUnitSumOf(CAP_KG),
    capUnitDiffOf(CAP_KG),
    capUnitHowManyOf(CAP_KG),
    capUnitPlus100Of(CAP_KG),
  ),
  "초3|2-5-6": ten(
    capSumCalcOf(CAP_KG),
    capSumWordOf(CAP_KG),
    capSumApplyOf(CAP_KG),
    capSumDeepOf(CAP_KG),
    capSumBigOnlyOf(CAP_KG),
    capSumSmallOnlyOf(CAP_KG),
    capSumCarryQOf(CAP_KG),
    capSumToSmallOf(CAP_KG),
    capSumPlusOneBigOf(CAP_KG),
    capSumDiffBigOf(CAP_KG),
  ),
  "초3|2-6-1": ten(
    graph261Calc,
    graph261Word,
    graph261Apply,
    graph261Deep,
    graph261Value,
    graph261Total,
    graph261Diff,
    graph261Cells,
    graph261Twice,
    graph261Step,
  ),
  "초3|2-6-2": ten(
    graph262Calc,
    graph262Word,
    graph262Apply,
    graph262Deep,
    graph262Tens,
    graph262Ones,
    graph262Value,
    graph262Sum,
    graph262Diff,
    graph262TenTimes,
  ),
  "초3|2-3-1": [
    { id: "01", tier: "연산", generate: circ231NameVar },
    { id: "02", tier: "기본", generate: circ231Word },
    { id: "03", tier: "응용", generate: circ231Apply },
    { id: "04", tier: "심화하", generate: circ231Deep },
    { id: "05", tier: "기본", generate: circ231DefRadius },
    { id: "06", tier: "기본", generate: circ231DefDiameter },
    { id: "07", tier: "기본", generate: circ231Midpoint },
    { id: "08", tier: "응용", generate: circ231Longest },
    { id: "09", tier: "응용", generate: circ231TwoRadii },
    { id: "10", tier: "응용", generate: circ231FoldHalf },
  ],
};

/* ── 2-3-2 원의 성질 ── */

/** 1단 — 관계를 한 번 쓴다. 그림은 **준 쪽만** 적는다(①). */
function circ232Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 1) {
    return make(
      unit,
      `$\\square$ 안에 알맞은 수를 쓰시오.\n\n반지름이 ${unitNum(r, "cm")} 인 원의 지름은 $\\square\\,\\mathrm{cm}$ 입니다.`,
      n(r * 2),
      `지름은 반지름의 $2$ 배이므로 ${expr(`${r}\\times2=${r * 2}`)} 입니다.`,
      circleFig("radius", r),
    );
  }
  return make(
    unit,
    `$\\square$ 안에 알맞은 수를 쓰시오.\n\n지름이 ${unitNum(r * 2, "cm")} 인 원의 반지름은 $\\square\\,\\mathrm{cm}$ 입니다.`,
    n(r),
    `반지름은 지름의 반이므로 ${expr(`${r * 2}\\div2=${r}`)} 입니다.`,
    circleFig("diameter", r * 2),
  );
}

/** 2단 — 소재를 얹어 문장으로. 그림은 여전히 **준 쪽만**. */
function circ232Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const thing = pick(rng, [
    "접시",
    "시계",
    "동전",
    "단추",
    "쟁반",
    "탬버린",
    "거울",
    "표지판",
  ]);
  const r = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 1) {
    return make(
      unit,
      `${thing}의 모양이 원입니다. 반지름이 ${unitNum(r, "cm")} 일 때 지름은 몇 cm인지 쓰시오.`,
      n(r * 2),
      `한 원에서 지름은 반지름의 $2$ 배입니다. ${expr(`${r}\\times2=${r * 2}`)} 이므로 지름은 ${unitNum(r * 2, "cm")} 입니다.`,
      circleFig("radius", r),
    );
  }
  return make(
    unit,
    `${thing}의 모양이 원입니다. 지름이 ${unitNum(r * 2, "cm")} 일 때 반지름은 몇 cm인지 쓰시오.`,
    n(r),
    `한 원에서 반지름은 지름의 반입니다. ${expr(`${r * 2}\\div2=${r}`)} 이므로 반지름은 ${unitNum(r, "cm")} 입니다.`,
    circleFig("diameter", r * 2),
  );
}

/** 3단 — 관계를 쓰고 **한 걸음 더** 간다(두 단계). */
function circ232Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 3, 9);
  // 🔴 `extra === r` 이면 답 `r + extra` 가 **그림에 적힌 지름 `r * 2` 와 같아진다.**
  //    그러면 그림이 답을 말한다(09 §2.2 규칙 ①). 잠금 ⑵ 가 씨앗 11 에서 잡았다 —
  //    값 검산은 통과하던 자리다(답 자체는 맞으니까). 그 하나를 뽑기에서 뺀다.
  const extra = pick(
    rng,
    [1, 2, 3, 4, 5, 6].filter((v) => v !== r),
  );
  return make(
    unit,
    `지름이 ${unitNum(r * 2, "cm")} 인 원이 있습니다. 이 원의 반지름보다 ${unitNum(extra, "cm")} 더 긴 선분의 길이는 몇 cm인지 쓰시오.`,
    n(r + extra),
    `반지름은 지름의 반이므로 ${expr(`${r * 2}\\div2=${r}`)} 입니다. 여기에 ${unitNum(extra, "cm")}${josa("미터", "을", "를")} 더하면 ${expr(`${r}+${extra}=${r + extra}`)} 입니다.`,
    circleFig("diameter", r * 2),
  );
}

/**
 * 4단 — 원 **둘**을 잇는 조건에서 되짚는다.
 *
 * ⚠️ `circleParts` 는 원을 **하나만** 그린다. 그래서 큰 원의 **준 값**만 적는다 —
 *    작은 원을 그릴 방법이 없고, 억지로 큰 원에 작은 원의 값을 적으면 그것이 곧
 *    풀이의 가운데 단계다(②).
 */
function circ232Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const small = intBetween(rng, 2, 6);
  const bigDia = small * 4;
  return make(
    unit,
    `큰 원의 반지름이 작은 원의 지름과 같습니다. 큰 원의 지름이 ${unitNum(bigDia, "cm")} 일 때 작은 원의 반지름은 몇 cm인지 쓰시오.`,
    n(small),
    `큰 원의 반지름은 ${expr(`${bigDia}\\div2=${bigDia / 2}`)} 입니다. 이것이 작은 원의 지름이므로 작은 원의 반지름은 ${expr(`${bigDia / 2}\\div2=${small}`)} 입니다.`,
    circleFig("diameter", bigDia),
  );
}

/* ── 2-3-3 원 그리기 — **어느 갈래에도 그림을 안 붙인다** ── */

/** 1단 — 벌린 길이에서 지름을 구한다(한 단계). */
function circ233Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려서 원을 그렸습니다. 이 원의 지름은 몇 cm인지 쓰시오.`,
    n(r * 2),
    `컴퍼스를 벌린 길이가 원의 반지름이 됩니다. 지름은 반지름의 $2$ 배이므로 ${expr(`${r}\\times2=${r * 2}`)} 입니다.`,
  );
}

/**
 * 2단 — 같은 셈을 **문장 소재**로 세운다.
 *
 * ⚠️ 첫 판은 「반지름 r 인 원을 그리려면 몇 cm 벌리나」였다 — 답이 곧 `r` 이라
 *    **한 단계도 없고 1단(×2)보다 쉬웠다.** 사다리가 거꾸로 선 것이다.
 *    `probe-elem-tier-ladder` 는 **심화만** 보므로 이 뒤집힘은 안 잡힌다 —
 *    지면을 넷 나란히 놓고 눈으로 봐서 찾았다(2026-08-24).
 */
function circ233Word(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 9);
  const thing = pick(rng, ["도화지", "공책", "칠판", "모래밭", "종이", "마당"]);
  return make(
    unit,
    `${thing}에 컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려서 원을 그렸습니다. 그린 원의 지름은 몇 cm인지 쓰시오.`,
    n(r * 2),
    `컴퍼스를 벌린 길이가 원의 반지름입니다. 지름은 반지름의 $2$ 배이므로 ${expr(`${r}\\times2=${r * 2}`)} 입니다.`,
  );
}

/** 3단 — 지금 원에서 **더 큰 원**으로 옮겨 간다(지름 두 번 + 되짚기 한 번). */
function circ233Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = intBetween(rng, 2, 7);
  const more = intBetween(rng, 1, 5) * 2; // 새 지름이 짝수여야 반지름이 정수다
  const newDia = r * 2 + more;
  return make(
    unit,
    `컴퍼스를 ${unitNum(r, "cm")} 만큼 벌려서 원을 그렸습니다. 이 원보다 지름이 ${unitNum(more, "cm")} 더 긴 원을 그리려면 컴퍼스를 몇 cm만큼 벌려야 하는지 쓰시오.`,
    n(newDia / 2),
    `처음 원의 지름은 ${expr(`${r}\\times2=${r * 2}`)} 입니다. 새 원의 지름은 ${expr(`${r * 2}+${more}=${newDia}`)} 이고, 벌릴 길이는 그 반이므로 ${expr(`${newDia}\\div2=${newDia / 2}`)} 입니다.`,
  );
}

/** 4단 — 원 **둘**의 조건을 겹쳐 벌릴 길이를 되짚는다. */
function circ233Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const small = intBetween(rng, 2, 6);
  const times = intBetween(rng, 2, 3);
  return make(
    unit,
    `컴퍼스를 ${unitNum(small, "cm")} 만큼 벌려서 작은 원을 그렸습니다. 큰 원의 지름이 작은 원의 지름의 ${n(times)} 배가 되게 그리려면 컴퍼스를 몇 cm만큼 벌려야 하는지 쓰시오.`,
    n(small * times),
    `작은 원의 반지름이 ${unitNum(small, "cm")} 이므로 지름은 ${expr(`${small}\\times2=${small * 2}`)} 입니다. 큰 원의 지름은 ${expr(`${small * 2}\\times${times}=${small * 2 * times}`)} 이고, 큰 원의 반지름은 ${expr(`${small * 2 * times}\\div2=${small * times}`)} 이므로 그만큼 벌립니다.`,
  );
}

/**
 * 난이도 갈래 (D-71 파일럿 → D-72 확대) — 키는 `tierKey` 형식(`"초3|1-1-2"`), 값은 넷 전부.
 * 축은 D-72(1단 절차 한 번 · 2단 식을 스스로 세움 · 3단 두 단계 · 4단 역산·조건 조합)를 따른다.
 */
export const G3_TIERS: ElemTierMap = {
  "초3|1-2-1": {
    연산: line121Calc,
    기본: line121Word,
    응용: line121Apply,
    심화하: line121Deep,
  },
  "초3|1-2-2": {
    연산: angle122Calc,
    기본: angle122Word,
    응용: angle122Apply,
    심화하: angle122Deep,
  },
  "초3|1-2-3": {
    연산: tri123Calc,
    기본: tri123Word,
    응용: tri123Apply,
    심화하: tri123Deep,
  },
  "초3|1-2-4": {
    연산: rect124Calc,
    기본: rect124Word,
    응용: rect124Apply,
    심화하: rect124Deep,
  },
  "초3|1-2-5": {
    연산: sq125Calc,
    기본: sq125Word,
    응용: sq125Apply,
    심화하: sq125Deep,
  },
  "초3|1-3-1": {
    연산: div131Calc,
    기본: div131Word,
    응용: div131Apply,
    심화하: div131Deep,
  },
  "초3|1-3-2": {
    연산: div132Calc,
    기본: div132Word,
    응용: div132Apply,
    심화하: div132Deep,
  },
  // ⚠️ **1-3-1 · 1-3-2 · 1-3-4 는 심화중을 비운다** — 재료가 하나뿐이기 때문이다.
  //    초3 나눗셈에서 마디를 여는 길은 「곱이 $a$ 인 곱셈구구가 여럿」 하나이고,
  //    그 짝이 **둘 이상 남는 전체 수는 $12,16,18,24,36$ 다섯**뿐이다(전수).
  //    네 소단원에 같은 재료를 옷만 갈아입혀 넣으면 한 시험지에 같은 문항이 넷 선다
  //    (D-66⑸). 그래서 **사다리 한 칸이 «발문이 둘째 나누는 수를 주는가»로 갈리는**
  //    1-3-3 하나에만 둔다 — 그 자리의 심화하가 정확히 그 수를 주는 문항이다.
  //    ⚠️ 1-3-4 심화하는 1-3-3 심화하와 **같은 풀**(`DIV_COMBOS`)을 이미 쓴다.
  // ⚠️ **심화상은 넷 다 비운다 — 세어서.** 크기 관계가 후보를 하나도 못 자르는 자리가
  //    전수 12짝이고, 거기에 「몫이 나누는 수의 $m$ 배」를 걸어 하나가 남는 자리는
  //    **4자리 · 서로 다른 (전체 수, 답) 2가지**뿐이다. 보고서 `tier-fill-g3-w4.md` §4.
  "초3|1-3-3": {
    연산: div133Calc,
    기본: div133Word,
    응용: div133Apply,
    심화하: div133Deep,
    심화중: div133Mid,
  },
  "초3|1-3-4": {
    연산: div134Calc,
    기본: div134Word,
    응용: div134Apply,
    심화하: div134Deep,
  },
  // ⚠️ **1-4-1 은 심화중·심화상을 둘 다 비운다** — (몇십)×(몇) 은 일의 자리 곱이 늘
  //    $0$ 이라 「곱의 일의 자리」가 후보를 못 만들고, 남는 성질이 「곱이 두 자리냐
  //    세 자리냐」 하나뿐이다. 그건 파일럿 `2-1-3` 심화중의 성질 **그 자체**여서
  //    한 시험지에 나란히 나가면 같은 문항으로 읽힌다(토대 17 §2.2 §2 권고:
  //    「1-4 는 올림 «종류»로, 2-1 은 자릿수·크기로 갈래를 갈라 적어 둔다」).
  "초3|1-4-1": {
    연산: mul14Calc,
    기본: mul14Word,
    응용: mul14Apply,
    심화하: mul14Deep,
  },
  // ⚠️ **1-4-2~5 는 심화상을 비운다** — 성질이 후보를 하나도 못 자르는 자리는
  //    전수로 **175개**(1-4-4 5 · 1-4-5 170) 있지만, 그것을 가르려면 «곱의 크기»가
  //    필요하고 그건 파일럿 `2-1-2`·`2-1-3` 심화상 그 자체다. §2.2 권고대로
  //    **심화상은 2-1 에 남긴다.** 1-4-2·1-4-3 은 아예 **구조적으로 0**이다.
  // ⚠️ **1-4-2 · 1-4-4 는 심화중도 비운다 — 겹침 가드를 걸고 나니 자리가 3개다**
  //    (2026-08-31 적대 검토 뒤 다시 셌다).
  //
  //    `mul14MidPool` 에 「후보들의 십의 자리 올림이 갈리면 버린다」를 걸어 파일럿
  //    `2-1-3` 과의 겹침을 49종 → **0종**으로 없앴다(그 까닭은 그 가드 옆에 적었다).
  //    그러고 남은 자리를 전수로 세면:
  //        1-4-2 **3** · 1-4-3 23 · 1-4-4 **3** · 1-4-5 23
  //    3자리는 지면에서 $a\in\{12,14\}$ **둘**뿐이다(1-4-2 답 $2$·$3$ / 1-4-4 답 $7$·$8$).
  //    발문 틀이 여덟이어도 **수가 두 가지**라 한 반이 두 번 풀면 같은 수가 나온다.
  //    얇은 까닭은 구조다 — `want` 가 십의 자리 올림을 못 쓰게 되면 버리는 후보도
  //    십의 자리 올림이 없어야 하므로 $t\times k$ 가 작아야 하고, 그래서 $t=1$ 만 남는다.
  //    **자리를 넓히려면 후보에 $k=1$ 을 넣어야 하는데 그 답은 «곱하기 $1$» 이라
  //    심화가 아니다.** 그래서 비운다.
  "초3|1-4-2": {
    연산: mul14Calc,
    기본: mul14Word,
    응용: mul14Apply,
    심화하: mul14Deep,
  },
  "초3|1-4-3": {
    연산: mul14Calc,
    기본: mul14Word,
    응용: mul14Apply,
    심화하: mul14Deep,
    심화중: mul14Mid,
  },
  // ⚠️ 1-4-4 도 위와 같은 까닭으로 심화중을 비운다 — 잔여 3자리($a\in\{12,14\}$).
  "초3|1-4-4": {
    연산: mul14Calc,
    기본: mul14Word,
    응용: mul14Apply,
    심화하: mul14Deep,
  },
  "초3|1-4-5": {
    연산: mul14Calc,
    기본: mul14Word,
    응용: mul14Apply,
    심화하: mul14Deep,
    심화중: mul14Mid,
  },
  // 🔴 **1-5 여섯 소단원 전량 — 심화중·심화상을 비운다.**
  //    까닭이 2026-08-31 적대 검토로 **바뀌었다.** 앞서 적었던 「후보가 안 생긴다」는
  //    **거짓이다** — 세어 보면 자리는 있다(1-5-1 980 · 1-5-2 약 1,000만 · 1-5-4 35,880).
  //    그 문장은 토대 17 §3 의 «없다»를 검산 없이 물려받은 것이었다.
  //
  //   1-5-1·1-5-2·1-5-4·1-5-5·1-5-6
  //        자리는 있다. 그러나 그 자리가 여는 축은 **「차의 방향」 하나**이고,
  //        그 축은 **D-115 반증 ⑥ 을 구조적으로 못 넘는다** — 지면이 두 수를 찍고
  //        답은 그 둘의 `+`·`−` 한 걸음이다(1-1-3·1-1-4 자리에 전수로 적어 두었다).
  //        ⚠️ **진법을 바꿔도 안 통한다.** 「자리 넘김」 항등식은 진법과 무관하다 —
  //           $a-b=c$ 이면 $b+c=a$ 이므로 $a-b$ 와 $a-c$ 의 넘김은 **같은 덧셈**의
  //           넘김이다. 전수 확인: 시각(60/24) 1,036,080짝 · 길이(10/100) 4,498,500짝,
  //           **어긋남 0**. 그래서 1-5-6 의 「자리 넘김」도 답을 **거르는 게 아니라
  //           확인해 준다**(1-1 과 같은 결함).
  //        ⇒ 토대 17 §2.2 ㉠ 의 「자리 넘김 가족(1-1·1-5·2-5)에서 **임자를 하나
  //           고르라**」는 권고는 **전제가 틀렸다.** 고를 임자가 없다 — 축이 죽었다.
  //   1-5-3  후보를 여는 축이 «어림보다 긴가 짧은가» **하나뿐**인데, 그 둘을 가르는
  //        성질은 무엇을 대도 **방향과 같은 말**이 된다 — 후보가 $10g+d$ 와 $10g-d$ 라
  //        cm 자리는 늘 $g$ 와 $g-1$, mm 자리는 늘 $d$ 와 $10-d$ 다. 토대 17 §3 이
  //        든 실물(「실제는 $7$ cm 몇 mm」)도 방향을 다시 말해 주는 것이라, 그 문항은
  //        **현행 심화하보다 걸음이 적다**(심화하는 되짚은 뒤 둘째 어림과 또 견준다).
  "초3|1-5-1": {
    연산: lenCalcOf(LEN_CM),
    기본: lenWordOf(LEN_CM),
    응용: lenApplyOf(LEN_CM),
    심화하: lenDeepOf(LEN_CM),
  },
  "초3|1-5-2": {
    연산: lenCalcOf(LEN_KM),
    기본: lenWordOf(LEN_KM),
    응용: lenApplyOf(LEN_KM),
    심화하: lenDeepOf(LEN_KM),
  },
  "초3|1-5-3": {
    연산: guessCalc,
    기본: guessWord,
    응용: guessApply,
    심화하: guessDeep,
  },
  "초3|1-5-4": {
    연산: sec154Calc,
    기본: sec154Word,
    응용: sec154Apply,
    심화하: sec154Deep,
  },
  "초3|1-5-5": {
    연산: time155Calc,
    기본: time155Word,
    응용: time155Apply,
    심화하: time155Deep,
  },
  "초3|1-5-6": {
    연산: time156Calc,
    기본: time156Word,
    응용: time156Apply,
    심화하: time156Deep,
  },
  "초3|1-6-1": {
    연산: part161Calc,
    기본: part161Word,
    응용: part161Apply,
    심화하: part161Deep,
  },
  "초3|1-6-2": {
    연산: frac162Calc,
    기본: frac162Word,
    응용: frac162Apply,
    심화하: frac162Deep,
  },
  "초3|1-6-3": {
    연산: frac163Calc,
    기본: frac163Word,
    응용: frac163Apply,
    심화하: frac163Deep,
  },
  "초3|1-6-4": {
    연산: cmp164Calc,
    기본: cmp164Word,
    응용: cmp164Apply,
    심화하: cmp164Deep,
  },
  "초3|1-6-5": {
    연산: unit165Calc,
    기본: unit165Word,
    응용: unit165Apply,
    심화하: unit165Deep,
  },
  "초3|1-6-6": {
    연산: dec166Calc,
    기본: dec166Word,
    응용: dec166Apply,
    심화하: dec166Deep,
  },
  "초3|1-6-7": {
    연산: cmp167Calc,
    기본: cmp167Word,
    응용: cmp167Apply,
    심화하: cmp167Deep,
  },
  // ⚠️ `심화중`·`심화상` 은 **이 대단원에만** 있다 — D-113 파일럿(2026-08-30).
  //    원장님이 `/dev/tier-bench/g3` 에서 여섯을 나란히 보시고 잣대를 확정하시면
  //    그때 나머지를 채운다. 문형(`G3_FORMS`)에는 안 넣었다 — 넣으면 소단원마다
  //    열이던 문형이 열둘이 되어 **지면 구성**이 바뀌고, 그건 D-07 결정이다.
  // ⚠️ 2-1-1 은 **심화상을 비웠다.** 심화상은 「되짚기 후보 셋 이상 + 올림·자릿수가
  //    후보끼리 전부 같음」이라야 서는데, 후보가 셋 이상이려면 곱해지는 수의 일의
  //    자리가 $5$ 여야 하고(곱셈구구), 그러면 곱하는 수가 커질 때 올림이 늘어
  //    **「올림 0~1번」 약속을 벗어난다.** 전수로 세니 남는 기준 수가 $105$ **하나**라
  //    문항이 사실상 하나로 굳는다 — 원장님 다양성 원칙에 어긋난다. 보고서 §2.2.
  "초3|2-1-1": {
    연산: mul21Calc,
    기본: mul21Word,
    응용: mul21Apply,
    심화하: mul21Deep,
    심화중: mul21Mid,
  },
  "초3|2-1-2": {
    연산: mul21Calc,
    기본: mul21Word,
    응용: mul21Apply,
    심화하: mul21Deep,
    심화중: mul21Mid,
    심화상: mul21High,
  },
  "초3|2-1-3": {
    연산: mul213Calc,
    기본: mul213Word,
    응용: mul213Apply,
    심화하: mul213Deep,
    심화중: mul21Mid,
    심화상: mul21High,
  },
  // ⚠️ 2-1-4 는 **심화상을 비웠다** — 억지로 채우지 않는다. (몇십몇)×(몇십몇) 은
  //    되짚을 인수가 두 자리라 곱셈구구가 후보를 못 만들고, 곱의 크기로 후보를
  //    만들면 그것을 굳히는 것이 «일의 자리» 하나뿐이라 **정의상 심화중**이다.
  //    성질로 못 굳히는 자리는 수 카드 배열인데, 그 문항은 이미 `mul214Deep`
  //    (심화하)에 있다. 옮기려면 `FORMS` 를 건드려야 해서 이번 회차엔 못 옮긴다.
  "초3|2-1-4": {
    연산: mul214Calc,
    기본: mul214Word,
    응용: mul214Apply,
    심화하: mul214Deep,
    심화중: mul21Mid,
  },
  // ⚠️ 2-2-1·2-2-2 는 **심화중·심화상을 둘 다 비웠다** — 세어서 정했다.
  //    ㉠(나머지를 모른다)는 두 소단원 이름이 금지하고(생성기도 `div2` 로만 뽑는다),
  //    남는 ㉡(나누는 수를 모른다)에서 굳힐 성질은 「내림이 있나」 하나인데 —
  //    두 자리 나뉘는 수를 내는 **몫 23가지 중 18가지에서 후보의 내림 여부가 전부
  //    같아**(반증 ⑤) 그 구절이 아무것도 안 가르고, 정확히 하나를 남기는 자리는
  //    **(몫,내림) 46짝 중 3짝**뿐이다($14$·없음→$28$ / $23$·있음→$92$ / $24$·없음→$48$).
  //    문항이 셋으로 굳는다 — 파일럿이 2-1-1 심화상을 「기준 수 $105$ 하나뿐」으로
  //    비운 것과 같은 자리다. 보고서 `tier-fill-g3-w2.md` §3.
  "초3|2-2-1": {
    연산: div22Calc,
    기본: div22Word,
    응용: div22Apply,
    심화하: div22Deep,
  },
  "초3|2-2-2": {
    연산: div22Calc,
    기본: div22Word,
    응용: div22Apply,
    심화하: div22Deep,
  },
  "초3|2-2-3": {
    연산: rem223Calc,
    기본: rem223Word,
    응용: rem223Apply,
    심화하: rem223Deep,
    심화중: rem223Mid,
    심화상: rem223High,
  },
  "초3|2-4-1": {
    연산: part241Calc,
    기본: part241Word,
    응용: part241Apply,
    심화하: part241Deep,
    심화중: part241Mid,
    // 🔴 **심화상을 세웠다 (물결 4, 2026-09-01)** — 물결 2 가 여기 적어 둔 「비운다」를
    //    뒤집는다. 그 회차의 근거는 「창을 넓히면 답이 여럿이 되어 문항이 아니다」였는데,
    //    **「그중 몇 묶음이 $P$ 개」를 같이 주면** 후보마다 한 묶음을 실제로 구해
    //    $P$ 가 온전한 묶음 수가 되는지 견주게 되어 답이 **하나로** 선다.
    //    전수 실측 **1,581자리** · 서로 다른 (분모,분자,준 개수) **187**.
    //    (물결 2 는 스스로 「«없다»가 아니라 «내가 못 찾았다»에 가깝다 — 전수로
    //     반증하지 않았다」고 §7 에 적어 두었다. 그 물음을 닫는다.)
    심화상: part241High,
  },
  // (1) 은 단위분수, (2) 는 분자 2 이상 — **분자 하나로만** 갈리므로 같은 공장을 쓴다.
  "초3|2-4-2": {
    연산: frac24CalcOf(true),
    기본: frac24WordOf(true),
    응용: frac24ApplyOf(true),
    심화하: frac24DeepOf(true),
    심화중: frac24MidOf(true),
  },
  "초3|2-4-3": {
    연산: frac24CalcOf(false),
    기본: frac24WordOf(false),
    응용: frac24ApplyOf(false),
    심화하: frac24DeepOf(false),
    심화중: frac24MidOf(false),
  },
  // ⚠️ 2-4-4 는 **둘 다 비웠다** — 심화하가 이미 「$\square$ 에 들어갈 수 있는 수는
  //    모두 몇 개」다(씨앗 40 중 **24**). 그 위에 얹을 수 있는 것은 «열거 축의 규모
  //    키우기»뿐인데 그 축은 D-115 ⑵ 가 **측정으로 기각**했다.
  "초3|2-4-4": {
    연산: kind244Calc,
    기본: kind244Word,
    응용: kind244Apply,
    심화하: kind244Deep,
  },
  "초3|2-4-5": {
    연산: mixed245Calc,
    기본: mixed245Word,
    응용: mixed245Apply,
    심화하: mixed245Deep,
    심화중: mixed245Mid,
    심화상: mixed245High,
  },
  // ⚠️ 2-4-6 도 **둘 다 비웠다** — 심화하가 「범위 안에서 가장 큰 분수」로 **40/40**
  //    이고, 이 소단원의 성질은 「분모가 같으면 분자만 견준다」 한 줄이라 그 한 줄이
  //    **후보를 만드는 데도 굳히는 데도 동시에** 쓰인다. 남는 축은 열거뿐이다.
  //    (판정기의 ④ 가 이 소단원을 지목하지만 그것은 근거가 아니다 — 답이 분수라
  //     기본·응용을 `readRat` 이 통째로 못 읽는다. 보고서 §3.)
  "초3|2-4-6": {
    연산: cmp246Calc,
    기본: cmp246Word,
    응용: cmp246Apply,
    심화하: cmp246Deep,
  },
  "초3|2-2-4": {
    연산: div224Calc,
    기본: div224Word,
    응용: div224Apply,
    심화하: div224Deep,
    심화중: div224Mid,
    심화상: div224High,
  },
  // ⚠️ **1-1-1·1-1-2(덧셈)는 심화중·심화상을 둘 다 비운다** — 세어서 정했다(물결 3).
  //    「합이 $S$」에는 **방향이 없어** 어떤 수가 늘 하나로 굳는다(반증 ①). 토대 17
  //    §2.2 ⑵ 가 검산한 「합의 십의 자리 숫자」 모형을 다시 셌더니 그대로였다 —
  //    어떤 수의 일의 자리를 보여주면 후보 **1개(90,000/90,000)** 라 심화하이고,
  //    일의 자리도 가리면 (십,일) 짝이 **늘 10개(9,000/9,000)** 라 복면산이다.
  //    복면산은 초3 지면 규약이 없어 **원장님 확정 전에는 금지**다(파일럿 §2.1b).
  "초3|1-1-1": {
    연산: sub111Calc,
    기본: sub111Word,
    응용: sub111Apply,
    심화하: sub111Deep,
  },
  "초3|1-1-2": {
    연산: add3Calc,
    기본: add3Word,
    응용: add3TwoStep,
    심화하: add3Reverse,
  },
  // 🔴 **1-1-3·1-1-4 는 심화중·심화상을 둘 다 비운다 — 「차의 방향」 되짚기는
  //    D-115 반증 ⑥ 을 구조적으로 못 넘는다** (2026-08-31 적대 검토 뒤 전수로 확인).
  //
  //    물결 3 이 여기에 「차의 방향」 심화중을 한 번 세웠다가 **거뒀다.** 지면은
  //    두 수 $known$ 과 $diff$ 를 찍고 답은 $known+diff$ 이거나 $known-diff$ 다 —
  //    **지면 두 수의 `+`·`−` 한 걸음이면 늘 답에 닿는다.** ⑥ 이 묻는 것은
  //    「답이 **하나로 정해지나**」가 아니라 「답이 **나오나**」이므로 구성상 위반이다.
  //
  //    ⚠️ **더 나쁜 것은 조건이 오답을 «확인해 주는» 것이었다.** 받아내림에는 항등식이
  //       선다 — $known-diff=down$ 이면 $diff+down=known$ 이므로 두 뺄셈
  //       $known-diff$ 와 $known-down$ 의 받아내림은 **같은 덧셈의 받아올림**이다
  //       (전수 122,848짝 · 어긋남 0). 그래서 「지면에 적히는 뺄셈도 소단원 약속 안」
  //       이라는 가드는 실은 **「$down$ 은 반드시 답 후보다」와 같은 말**이었고,
  //       약속이 $[2,2]$ 한 칸인 1-1-4 는 답이 **전수 20,625/20,625 로 $known-diff$**
  //       였다. 학생이 무심코 한 그 뺄셈의 받아내림이 발문이 내건 횟수와 **늘 같다.**
  //       1-1-3 도 $67.6\%$(통과 58,625 중 $down$ 강제 20,625 · 둘 다 38,000)다.
  //
  //    ⚠️ **가드를 떼는 길도 안 통한다.** `kPage` 를 떼면 $up$ 강제 자리가 살아나지만
  //       $up=known+diff$ 라 여전히 한 걸음이다. 이 지면 모양으로는 길이 없다.
  //
  //    ⚠️ **왜 아무 자도 안 울었나** — `forwardReachable` 의 허용 꼴은 `a×b` 계열
  //       넷뿐이라 **곱이 첫 걸음이 아니면 길이 없다.** 1-1 은 구조적으로 늘 `false`
  //       라서 ⑥ 필터가 한 씨앗도 안 걸렀다. 그 「0」은 «깨끗»이 아니라 **«못 셈»**
  //       이었다(저장소가 여러 번 적은 그 자리). 그래서 `pmOneStepReachable` 을
  //       세웠다 — 곱 없는 소단원에서 ⑥ 을 **실제로 재는** 축이다.
  //
  //    다음 사람에게: 여기를 되살리려면 **지면이 두 수를 다 찍지 않는 모양**이
  //    필요하다. 그 설계는 이 회차가 하지 않았다.
  "초3|1-1-3": {
    연산: subCalcOf(0, 1),
    기본: subWordOf(0, 1),
    응용: subApplyOf(0, 1),
    심화하: subDeepOf(0, 1),
  },
  "초3|1-1-4": {
    연산: subCalcOf(2, 2),
    기본: subWordOf(2, 2),
    응용: subApplyOf(2, 2),
    심화하: subDeepOf(2, 2),
  },
  // ⚠️ **2-5-1 · 2-5-4(비교)는 둘 다 비운다** — 답이 「가·나」·부등호라 **되짚을 값이
  //    없다.** 억지로 넣으면 실은 단위(2-5-2·2-5-5) 문항이 되어 반증 ③ 이다.
  "초3|2-5-1": {
    연산: capCmpCalcOf(CAP_L),
    기본: capCmpWordOf(CAP_L),
    응용: capCmpApplyOf(CAP_L),
    심화하: capCmpDeepOf(CAP_L),
  },
  // ⚠️ **2-5-2 · 2-5-5(단위)도 둘 다 비운다** — 환산은 **일대일**이라 되짚어도
  //    마디가 늘 하나로 굳는다(반증 ①). 「몇 그릇인가」를 여기에 넣으면 굳히는 성질이
  //    「합과 차」의 자리 넘김이 되어 소단원 밖이다(반증 ③, 토대 17 §3 2-5 함정 ⑶).
  "초3|2-5-2": {
    연산: capUnitCalcOf(CAP_L),
    기본: capUnitWordOf(CAP_L),
    응용: capUnitApplyOf(CAP_L),
    심화하: capUnitDeepOf(CAP_L),
  },
  "초3|2-5-3": {
    연산: capSumCalcOf(CAP_L),
    기본: capSumWordOf(CAP_L),
    응용: capSumApplyOf(CAP_L),
    심화하: capSumDeepOf(CAP_L),
    심화중: capSumMidOf(CAP_L),
    심화상: capSumHighOf(CAP_L),
  },
  "초3|2-5-4": {
    연산: capCmpCalcOf(CAP_KG),
    기본: capCmpWordOf(CAP_KG),
    응용: capCmpApplyOf(CAP_KG),
    심화하: capCmpDeepOf(CAP_KG),
  },
  "초3|2-5-5": {
    연산: capUnitCalcOf(CAP_KG),
    기본: capUnitWordOf(CAP_KG),
    응용: capUnitApplyOf(CAP_KG),
    심화하: capUnitDeepOf(CAP_KG),
  },
  "초3|2-5-6": {
    연산: capSumCalcOf(CAP_KG),
    기본: capSumWordOf(CAP_KG),
    응용: capSumApplyOf(CAP_KG),
    심화하: capSumDeepOf(CAP_KG),
    심화중: capSumMidOf(CAP_KG),
    심화상: capSumHighOf(CAP_KG),
  },
  // ⚠️ 2-6-1 은 **둘 다 비웠다** — 세어서 정했다. 마디를 열 축은 「값이 범위 안」
  //    하나이고 굳힐 성질은 「값은 한 칸이 나타내는 수의 배수」 하나인데, 엔진이 쓰는
  //    단위 $2\cdot5\cdot10$ 로 십의 자리 창 16개를 전수로 세면 후보가 **하나**(단위
  //    $5\cdot10$)이거나 **넷 이상**(단위 $2$)이다. 하나면 창의 두 끝을 단위로 나누어
  //    바로 나오므로 **순방향**(반증 ⑥)이고, 여럿이면 남은 성질이 없어 답이 안 정해진다.
  //    곧 「후보가 여럿 + 성질이 하나를 남긴다」가 **구성상 일어나지 않는다.**
  "초3|2-6-1": {
    연산: graph261Calc,
    기본: graph261Word,
    응용: graph261Apply,
    심화하: graph261Deep,
  },
  "초3|2-6-2": {
    연산: graph262Calc,
    기본: graph262Word,
    응용: graph262Apply,
    심화하: graph262Deep,
    심화중: graph262Mid,
    심화상: graph262High,
  },
  "초3|2-3-1": {
    연산: circ231Calc,
    기본: circ231Word,
    응용: circ231Apply,
    심화하: circ231Deep,
  },
  "초3|2-3-2": {
    연산: circ232Calc,
    기본: circ232Word,
    응용: circ232Apply,
    심화하: circ232Deep,
  },
  "초3|2-3-3": {
    연산: circ233Calc,
    기본: circ233Word,
    응용: circ233Apply,
    심화하: circ233Deep,
  },
};
