import type { UnitSeed } from "../../../prisma/seed-data/units";

import type { ElemTierMap } from "./difficulty";

import { expr, fracLatex, n, unitNum } from "./format";
import { fracSpec } from "./fracFig";
import { fig, make } from "./make";
import { intBetween, pick } from "./rng";
import type { ChapterHandler, ElemProblem, Rng } from "./types";

/**
 * 소단원 번호(`1-2-4`). 이름만으로는 못 가르는 자리가 있다 —
 * `1-2-3`·`1-2-4` 는 units.ts 에 **이름이 똑같이** `직각삼각형 알아보기` 로 적혀 있다.
 */
function secNo(unit: UnitSeed): string {
  return unit.section.split(" ")[0] ?? "";
}

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
  return (code - 0xac00) % 28 !== 0 ? withBatchim : without;
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
      fig("columnOp", { top: String(a), op: "+", bottom: String(b) }),
    );
  }
  const [a, b] = subWithBorrows(rng, heavy ? 2 : 0, heavy ? 3 : 1);
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}-${b}=\\square$`,
    n(a - b),
    expr(`${a}-${b}=${a - b}`),
    fig("columnOp", { top: String(a), op: "−", bottom: String(b) }),
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

const SHAPE_LABELS = ["가", "나", "다"] as const;

function onGrid(p: Pt, cols: number, rows: number): Pt {
  if (p[0] < 0 || p[0] > cols || p[1] < 0 || p[1] > rows) {
    throw new Error(
      `점격자 밖입니다: (${p[0]}, ${p[1]}) — cols ${cols}, rows ${rows}`,
    );
  }
  return p;
}

function pointGridSpec(
  cols: number,
  rows: number,
  shapes: GridShape[],
): Record<string, unknown> {
  const dots: Record<string, unknown>[] = [];
  const lines: [Pt, Pt][] = [];
  for (const shape of shapes) {
    for (const [a, b] of shape.lines) {
      lines.push([onGrid(a, cols, rows), onGrid(b, cols, rows)]);
    }
    const anchor =
      shape.anchor ??
      [...shape.pts].sort((p, q) => q[1] - p[1] || p[0] - q[0])[0]!;
    for (const p of shape.pts) {
      onGrid(p, cols, rows);
      const isAnchor = p[0] === anchor[0] && p[1] === anchor[1];
      dots.push({
        c: p[0],
        r: p[1],
        label: isAnchor ? shape.label : "",
        side: isAnchor ? (shape.side ?? "down") : "down",
      });
    }
  }
  return fig("pointGrid", { cols, rows, dots, lines });
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
      `$${a}\\div${b}=\\square$ 를 곱셈식으로 나타내면 $${b}\\times\\square=${a}$ 입니다. $\\square$ 에 알맞은 수를 쓰시오.`,
      n(q),
      `곱셈식과 나눗셈식은 같은 수를 씁니다. $${b}\\times${q}=${a}$ 이므로 $\\square$ 에 알맞은 수는 ${n(q)} 입니다.`,
    );
  }
  if (s.includes("곱셈식")) {
    return make(
      unit,
      `곱셈식 $\\square\\times${b}=${a}$ 를 이용하여 $${a}\\div${b}$ 의 몫을 구하시오.`,
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

function mul31(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("(몇십)×(몇)")) {
    const a = intBetween(rng, 2, 9) * 10;
    const b = intBetween(rng, 2, 9);
    return make(
      unit,
      `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
      n(a * b),
      expr(`${a}\\times${b}=${a * b}`),
    );
  }
  let tens = intBetween(rng, 1, 8);
  let ones = intBetween(rng, 1, 8);
  const b = intBetween(rng, 2, 5);
  if (s.includes("일의 자리") && s.includes("십의 자리")) {
    ones = intBetween(rng, 5, 9);
    tens = intBetween(rng, 5, 9);
  } else if (s.includes("일의 자리")) {
    ones = intBetween(rng, 5, 9);
    tens = intBetween(rng, 1, 3);
  } else if (s.includes("십의 자리")) {
    ones = intBetween(rng, 1, 3);
    tens = intBetween(rng, 5, 9);
  } else {
    ones = intBetween(rng, 1, 3);
    tens = intBetween(rng, 1, 3);
  }
  const a = tens * 10 + ones;
  return make(
    unit,
    `다음을 계산하시오.\n\n$${a}\\times${b}=\\square$`,
    n(a * b),
    expr(`${a}\\times${b}=${a * b}`),
    fig("columnOp", { top: String(a), op: "×", bottom: String(b) }),
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
      fig("timeAdd", {
        start: { h: h1, m: m1, s: 0 },
        add: { h: h2, m: m2, s: 0 },
      }),
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

/** (세 자리)×(한 자리) 에서 올림이 몇 번 나는가로 고른다. */
function mul3x1(rng: Rng, minC: number, maxC: number): [number, number] {
  for (let k = 0; k < 120; k += 1) {
    const a = intBetween(rng, 112, 498);
    const b = intBetween(rng, 2, 8);
    let carries = 0;
    let carry = 0;
    for (let d = 0; d < 3; d += 1) {
      const digit = Math.floor(a / 10 ** d) % 10;
      const v = digit * b + carry;
      carry = Math.floor(v / 10);
      if (carry > 0) carries += 1;
    }
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
      fig("columnOp", { top: String(a), op: "×", bottom: String(b) }),
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
    const b = intBetween(rng, 12, 48);
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
    fig("columnOp", { top: String(a), op: "×", bottom: String(b) }),
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

function div32(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = unit.section;
  if (s.includes("나머지")) {
    const b = intBetween(rng, 3, 9);
    const q = intBetween(rng, 3, 8);
    const r = intBetween(rng, 1, b - 1);
    const a = b * q + r;
    return make(
      unit,
      `$${a}\\div${b}$ 의 몫과 나머지를 쓰시오.`,
      `몫 ${n(q)}, 나머지 ${n(r)}`,
      `$${b}\\times${q}=${b * q}$ 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다.`,
    );
  }
  if (s.includes("세 자리")) {
    const b = intBetween(rng, 3, 9);
    const q = intBetween(rng, 12, 48);
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
      );
    }
    if (which === "지름") {
      return make(
        unit,
        `원의 중심을 지나면서 원 위의 두 점을 이은 선분을 무엇이라고 하는지 쓰시오.`,
        "지름",
        "원의 중심을 지나 원 위의 두 점을 이은 선분이 지름입니다. 한 원에서 지름은 모두 길이가 같습니다.",
      );
    }
    return make(
      unit,
      `원의 중심과 원 위의 한 점을 이은 선분을 무엇이라고 하는지 쓰시오.`,
      "반지름",
      "원의 중심과 원 위의 한 점을 이은 선분이 반지름입니다. 한 원에서 반지름은 모두 길이가 같습니다.",
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
      );
    }
    return make(
      unit,
      `지름이 ${unitNum(r * 2, "cm")} 인 원의 반지름은 몇 cm인지 쓰시오.`,
      n(r),
      `한 원에서 반지름은 지름의 반입니다. ${expr(`${r * 2}\\div2=${r}`)} 이므로 반지름은 ${unitNum(r, "cm")} 입니다.`,
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
      `$${num}\\div${den}=${whole}$ 이고 나머지가 ${n(rest)} 이므로 대분수로 나타내면 ${expr(fracLatex(num, den))} 입니다.`,
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
    fig("columnOp", { top: String(a), op: "+", bottom: String(b) }),
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
  const figSpec = fig("columnOp", {
    top: String(a),
    op: op === "+" ? "+" : "−",
    bottom: String(b),
  });
  const eq = `$${a}${sign}${b}=\\square$`;
  const solution = expr(`${a}${sign}${b}=${result}`);
  const word = op === "+" ? "합" : "차";
  const wordJosa = josa(word, "을", "를");
  switch (form % CALC_FORM_COUNT) {
    case 0:
      return make(
        unit,
        `다음을 계산하시오.\n\n${eq}`,
        n(result),
        solution,
        figSpec,
      );
    case 1:
      return make(
        unit,
        `세로셈으로 계산하시오.\n\n${eq}`,
        n(result),
        solution,
        figSpec,
      );
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
      return make(
        unit,
        `계산 결과를 구하시오.\n\n${eq}`,
        n(result),
        solution,
        figSpec,
      );
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
  if (intBetween(rng, 0, 1) === 0) {
    const [a, b] = addWithCarries(rng, intBetween(rng, 0, 1), 1);
    const total = a + b;
    return make(
      unit,
      `${s.thing} 상자 두 개에 든 ${s.thing}${josa(s.thing, "은", "는")} 모두 ${n(total)}${s.unit}입니다. 한 상자에 ${n(a)}${s.unit}이 들어 있다면 다른 상자에는 몇 ${s.unit}이 들어 있습니까?`,
      n(b),
      `전체에서 아는 쪽을 덜어 냅니다. ${expr(`${total}-${a}=${b}`)} 이므로 ${n(b)}${s.unit}입니다.`,
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
      : `선분 ${a}${b}를 점 ${a} 쪽으로만 끝없이 늘이면 어떤 선이 되는지 이름을 쓰시오.`,
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
  const layout = pick(rng, DOT_LAYOUTS);
  const k = layout.length;
  const segs = (k * (k - 1)) / 2;
  const rays = k * (k - 1);
  return make(
    unit,
    pick(rng, [
      `그림의 점 중 두 점을 이어 선분과 반직선을 그으려고 합니다. 그을 수 있는 반직선의 수와 선분의 수의 차는 몇 개인지 쓰시오.`,
      `그림의 점으로 반직선과 선분을 모두 그었을 때, 두 수의 차는 몇 개인지 쓰시오.`,
      `선분은 짝마다 하나, 반직선은 짝마다 둘입니다. 그림에서 그 수의 차는 몇 개인지 쓰시오.`,
      `그림의 점을 이어 그을 수 있는 반직선의 수에서 선분의 수를 뺀 값을 쓰시오.`,
      `그림에서 반직선의 수와 선분의 수를 각각 세어, 큰 수에서 작은 수를 뺀 값을 쓰시오.`,
      `그림의 점으로 그을 수 있는 반직선은 선분보다 몇 개 더 많은지 쓰시오.`,
      `반직선 ㄱㄴ과 반직선 ㄴㄱ은 서로 다릅니다. 그림의 점으로 그을 수 있는 반직선의 수에서 선분의 수를 빼면 몇 개인지 쓰시오.`,
      `그림의 점을 이어 선분과 반직선을 모두 그었습니다. 반직선이 선분보다 몇 개 더 많은지 쓰시오.`,
    ]),
    n(rays - segs),
    `선분은 두 점의 짝마다 하나이므로 ${n(segs)}개입니다. 반직선은 시작하는 점이 어디냐에 따라 달라 짝마다 둘이므로 ${n(rays)}개입니다. ${expr(`${rays}-${segs}=${rays - segs}`)} 이므로 차는 ${n(rays - segs)}개입니다.`,
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
  const gap = count === 3 ? 4 : 5;
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
    `시계의 긴바늘이 세 시간 동안 돌 때 생기는 각과 같은 각의 기호를 쓰시오.`,
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
  const count = 3;
  const rightCount = intBetween(rng, 1, 2);
  const row = angleRow(rng, count, rightCount);
  const other = count - rightCount;
  return make(
    unit,
    pick(rng, [
      `${row.labels.join(", ")} 중에서 직각인 각의 수와 직각이 아닌 각의 수의 차는 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 를 보고 직각인 각과 직각이 아닌 각을 각각 센 뒤, 그 차를 쓰시오.`,
      `${row.labels.join(", ")} 에서 직각인 것의 수와 그렇지 않은 것의 수가 몇 개 차이 나는지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각을 세고, 남은 각의 수와의 차를 쓰시오.`,
      `${row.labels.join(", ")} 를 두 무리로 나누었습니다. 직각인 무리와 아닌 무리의 개수 차를 쓰시오.`,
      `${row.labels.join(", ")} 를 직각인 것과 아닌 것으로 나누었습니다. 두 무리의 개수의 차는 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각은 몇 개이고 직각이 아닌 각은 몇 개인지 세어, 그 차를 쓰시오.`,
      `${row.labels.join(", ")} 에서 직각의 수가 직각이 아닌 각의 수보다 몇 개 많고 적은지 그 차를 쓰시오.`,
    ]),
    n(Math.abs(rightCount - other)),
    `직각인 각은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개이고, 나머지 ${n(other)}개는 직각이 아닙니다. ${expr(`${Math.max(rightCount, other)}-${Math.min(rightCount, other)}=${Math.abs(rightCount - other)}`)} 이므로 차는 ${n(Math.abs(rightCount - other))}개입니다.`,
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
  const total = rightCount + 4;
  return make(
    unit,
    pick(rng, [
      `${row.labels.join(", ")} 는 각이고 라는 직사각형입니다. 그림 전체에서 직각은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 는 각, 라는 직사각형입니다. 그림에 있는 직각을 모두 세어 그 수를 쓰시오.`,
      `각 ${row.labels.join(", ")} 와 직사각형 라 에서 직각이 몇 개인지 각각 세어 더한 값을 쓰시오.`,
      `${row.labels.join(", ")} 는 각이고 라는 직사각형일 때, 직각의 개수를 모두 더하면 몇 개인지 쓰시오.`,
      `그림에는 각 ${row.labels.join(", ")} 와 직사각형 라 가 있습니다. 직각은 통틀어 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 는 각이고 라는 직사각형입니다. 각에 있는 직각과 직사각형에 있는 직각을 모두 세면 몇 개인지 쓰시오.`,
      `그림에서 ${row.labels.join(", ")} 는 각, 라는 직사각형입니다. 직각을 하나도 빠뜨리지 말고 세어 그 수를 쓰시오.`,
      `${row.labels.join(", ")} 와 직사각형 라 를 함께 보고, 직각이 모두 몇 개인지 쓰시오.`,
    ]),
    n(total),
    `각 ${row.labels.join(", ")} 중 직각은 ${row.rightLabels.join(", ")} 로 ${n(rightCount)}개입니다. 직사각형은 네 각이 모두 직각이므로 ${n(4)}개입니다. ${expr(`${rightCount}+4=${total}`)} 이므로 모두 ${n(total)}개입니다.`,
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
      `${row.labels.join(", ")} 를 직각삼각형과 아닌 것으로 갈랐습니다. 아닌 쪽은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 에서 삼각자의 직각 부분과 꼭 맞는 각이 없는 삼각형은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 를 직각삼각형과 아닌 것으로 나눌 때, 직각삼각형이 아닌 쪽은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 중 직각이 하나도 없는 삼각형은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 에서 직각삼각형을 뺀 나머지 삼각형은 몇 개인지 쓰시오.`,
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
      `${row.labels.join(", ")} 는 삼각형이고 라는 사각형입니다. 이 중에서 변이 셋이면서 직각이 있는 도형은 모두 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 는 삼각형, 라는 사각형입니다. 변이 셋이고 직각도 가진 도형의 수를 쓰시오.`,
      `${row.labels.join(", ")} 와 라 중에서 「변이 셋」과 「직각이 있다」를 함께 만족하는 도형은 몇 개인지 쓰시오.`,
      `그림의 도형 ${row.labels.join(", ")}, 라 가운데 삼각형이면서 직각을 가진 것은 몇 개인지 쓰시오.`,
      `${row.labels.join(", ")} 는 삼각형이고 라는 사각형입니다. 두 조건을 모두 채우는 도형의 개수를 쓰시오.`,
      `${row.labels.join(", ")} 는 삼각형, 라는 사각형입니다. 변이 셋이고 직각도 있는 도형은 몇 개인지 쓰시오.`,
      `그림에서 ${row.labels.join(", ")} 는 삼각형이고 라는 사각형입니다. 두 조건 「변이 셋」과 「직각이 있다」를 모두 만족하는 도형의 수를 쓰시오.`,
      `${row.labels.join(", ")} 와 사각형 라 중에서, 변이 셋이면서 직각을 가진 도형은 모두 몇 개인지 쓰시오.`,
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

/** 4단 — **역산**. 네 변의 길이의 합에서 한 변을 되짚는다. 도형에서 역산이 서는 자리다. */
function sq125Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 9);
  const total = side * 4;
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
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `네 변의 길이의 합이 ${n(total)} cm인 정사각형 모양 ${thing}${josa(thing, "이", "가")} 있습니다. 이 ${thing}의 한 변의 길이는 몇 cm인지 쓰시오.`,
      n(side),
      `정사각형은 네 변의 길이가 모두 같으므로 합을 넷으로 똑같이 나눕니다. ${expr(`${total}\\div4=${side}`)} 이므로 한 변은 ${n(side)} cm입니다.`,
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

/**
 * 난이도 갈래 (D-71 파일럿 → D-72 확대) — 키는 `tierKey` 형식(`"초3|1-1-2"`), 값은 넷 전부.
 * 축은 D-72(1단 절차 한 번 · 2단 식을 스스로 세움 · 3단 두 단계 · 4단 역산·조건 조합)를 따른다.
 */
export const G3_TIERS: ElemTierMap = {
  "초3|1-2-1": {
    연산: line121Calc,
    기본: line121Word,
    응용: line121Apply,
    심화: line121Deep,
  },
  "초3|1-2-2": {
    연산: angle122Calc,
    기본: angle122Word,
    응용: angle122Apply,
    심화: angle122Deep,
  },
  "초3|1-2-3": {
    연산: tri123Calc,
    기본: tri123Word,
    응용: tri123Apply,
    심화: tri123Deep,
  },
  "초3|1-2-4": {
    연산: rect124Calc,
    기본: rect124Word,
    응용: rect124Apply,
    심화: rect124Deep,
  },
  "초3|1-2-5": {
    연산: sq125Calc,
    기본: sq125Word,
    응용: sq125Apply,
    심화: sq125Deep,
  },
  "초3|1-1-1": {
    연산: sub111Calc,
    기본: sub111Word,
    응용: sub111Apply,
    심화: sub111Deep,
  },
  "초3|1-1-2": {
    연산: add3Calc,
    기본: add3Word,
    응용: add3TwoStep,
    심화: add3Reverse,
  },
  "초3|1-1-3": {
    연산: subCalcOf(0, 1),
    기본: subWordOf(0, 1),
    응용: subApplyOf(0, 1),
    심화: subDeepOf(0, 1),
  },
  "초3|1-1-4": {
    연산: subCalcOf(2, 2),
    기본: subWordOf(2, 2),
    응용: subApplyOf(2, 2),
    심화: subDeepOf(2, 2),
  },
};
