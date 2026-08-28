/**
 * 치수 라벨(`7 cm`)이 **도형 실선 위에 앉지 않는다** — 입체 kind (elem-1).
 *
 * ## 왜 이 축이 따로 필요한가
 *
 * 이미 있던 `scripts/qa/probe-dim-outside.py` 는 치수 **점선**이 도형 안쪽인지를 본다.
 * 그런데 원장님이 종이에서 보시는 것은 **글자**다 — 점선이 바깥이어도 `4 cm` 가
 * 모서리 위에 앉으면 halo 가 도형에 흰 구멍을 뚫고 숫자가 안 읽힌다. 그 축이 없었고,
 * 없는 축은 변이시킬 수도 없다(CLAUDE.md 2026-08-19·08-20 에 네 번 적힌 자리).
 *
 * 실측(2026-08-28, 그림 149장): 치수 라벨 50개 중 **16개(32.0%)** 가 그랬다.
 * 다른 라벨은 2.8% 다 — 치수만 **열 배** 나빴다.
 *
 * ## 무엇을 «겹침»으로 세나 — **자기 치수 점선은 아니다**
 *
 * `measured()` 는 라벨을 제 점선 위에 흰 halo 를 깔고 앉힌다. 그게 제도 관행이고
 * 정본도 그렇게 한다(RPM 중1-2 0849·0845 실측). 처음 만든 자가 그것까지 세어
 * 「치수 겹침 16.8%」라는 **거짓 경보**를 냈다 — 눈으로 보니 3장 중 3장이 멀쩡했다.
 * 늘 우는 가드는 꺼진다(2026-08-20). 그래서 여기서 세는 것은 **도형 실선**뿐이다:
 *
 *   · 도형 모서리  `<polyline stroke="#111111" stroke-width="1.15">` (파선 아님)
 *   · 치수 점선    `<path stroke="#000" stroke-dasharray="6 4">`      → **안 센다**
 *   · 숨은 모서리  `stroke-dasharray="5 4"`                          → **안 센다**
 *     (정본도 홈 속 라벨을 숨은 점선 위에 얹는다 — 0849 의 `7 cm`)
 *
 * ## 기대값은 정본에서 왔다
 *
 * RPM 0849 는 **우리와 같은 문제·같은 치수 여섯**을 그리는데 다섯을 실루엣 바깥
 * 둘레에 두고 하나만 홈 속에 넣는다. 그래서 여기 한계는 「0」이 아니라 **「하나까지」**다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { svgLabels } from "@/lib/figure/svgLabels";

const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine =
  existsSync(VENDOR) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

type Seg = [number, number, number, number];
type Box = { text: string; x0: number; y0: number; x1: number; y1: number };

/**
 * 도형 **실선** 모서리만. 파선(`stroke-dasharray`)과 면 칠(획 색이 면 색)은 뺀다.
 * 면 칠 폴리곤은 `stroke` 가 `#e4d3b8` 같은 면 색이라 `#111111` 조건이 거른다.
 */
function solidEdges(svg: string): Seg[] {
  const out: Seg[] = [];
  for (const m of svg.matchAll(/<(polyline|polygon)\b([^>]*)>/g)) {
    const attrs = m[2] ?? "";
    if (/stroke-dasharray=/.test(attrs)) continue;
    if (!/stroke="#111111"/.test(attrs)) continue;
    const pts = [
      ...(/points="([^"]*)"/.exec(attrs)?.[1] ?? "").matchAll(
        /(-?[\d.]+),(-?[\d.]+)/g,
      ),
    ].map((p) => [Number(p[1]), Number(p[2])] as [number, number]);
    if (m[1] === "polygon" && pts.length >= 3) pts.push(pts[0]!);
    for (let i = 0; i + 1 < pts.length; i += 1) {
      out.push([pts[i]![0], pts[i]![1], pts[i + 1]![0], pts[i + 1]![1]]);
    }
  }
  return out;
}

/** 치수 라벨(`숫자 + 단위`)의 잉크 상자. 조판 안 된 것은 폭을 모르니 뺀다. */
function dimBoxes(svg: string): Box[] {
  return svgLabels(svg)
    .filter(
      (l) =>
        l.typeset &&
        l.width !== null &&
        /^\s*[\d.]+\s*(cm|mm|m|km)\s*$/.test(l.text),
    )
    .map((l) => {
      const w = l.width!;
      const x0 =
        l.anchor === "end"
          ? l.x - w
          : l.anchor === "middle"
            ? l.x - w / 2
            : l.x;
      return {
        text: l.text,
        x0,
        x1: x0 + w,
        y0: l.baseline - (l.ascent ?? l.fontSize * 0.7),
        y1: l.baseline + (l.descent ?? l.fontSize * 0.2),
      };
    });
}

/**
 * 선분이 상자와 만나는가 — **Liang–Barsky**.
 *
 * ⚠️ 표본점을 찍어 「상자 안에 있나」로 물으면 안 된다. 상자가 작고 선분이 길면
 *    표본이 상자를 건너뛰어 «안 겹쳤다»가 나오고, 그 실패는 조용하다.
 */
function hits(seg: Seg, b: Box): boolean {
  const [ax, ay, bx, by] = seg;
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;
  const edges: [number, number][] = [
    [-dx, ax - b.x0],
    [dx, b.x1 - ax],
    [-dy, ay - b.y0],
    [dy, b.y1 - ay],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      t0 = Math.max(t0, r);
    } else {
      if (r < t0) return false;
      t1 = Math.min(t1, r);
    }
  }
  return t0 <= t1;
}

function onShape(svg: string): string[] {
  const edges = solidEdges(svg);
  return dimBoxes(svg)
    .filter((b) => edges.some((s) => hits(s, b)))
    .map((b) => b.text);
}

/**
 * 실측으로 결함이 있던 셋. **씨앗·변형을 리터럴로 못 박는다** — 「아무거나 하나」로
 * 두면 그 갈래가 안 뽑히는 날 시험이 아무것도 안 지키면서 초록이다.
 */
const CASES: { name: string; spec: Record<string, unknown>; max: number }[] = [
  {
    // 잘라 낸 직육면체 — 치수 여섯. 고치기 전 **넷**이 실선 위였다.
    // 정본(RPM 0849)도 여섯 중 하나는 홈 속이므로 한계는 1 이다.
    name: "cutCuboid",
    spec: {
      version: "elem-1",
      kind: "cutCuboid",
      w: 7,
      d: 10,
      h: 12,
      cut: { x: 0, w: 4, d: 4, h: 6 },
    },
    max: 1,
  },
  {
    // 구멍 뚫린 원기둥 — 반지름 둘이 윗면 타원을 물었다(고치기 전 **둘**).
    // 정본(0845)은 반지름 라벨을 실루엣 밖으로 빼고 지시선으로 잇는다.
    name: "hollowSolid 원기둥",
    spec: {
      version: "elem-1",
      kind: "hollowSolid",
      outer: { shape: "cylinder", r: 8, h: 5 },
      inner: { shape: "cylinder", r: 5 },
    },
    max: 0,
  },
  {
    // 성한 직육면체 — 고치기 전에도 깨끗했다. **음성 대조군**이다.
    // 이것이 없으면 「치수를 도형 밖으로」가 지나쳐도(라벨이 프레임 밖) 안 보인다.
    name: "cuboid (음성 대조)",
    spec: { version: "elem-1", kind: "cuboid", w: 7, d: 6, h: 4 },
    max: 0,
  },
];

describe.skipIf(!hasEngine)(
  "치수 라벨은 도형 실선을 비킨다 (elem-1 입체)",
  () => {
    for (const c of CASES) {
      it(`**${c.name}** — 실선 위 치수 라벨 ${c.max}개 이하`, async () => {
        const res = await renderFigureSpec(c.spec as never);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        // 자가 살아 있나 — 도형 실선도 치수 라벨도 실제로 잡혀야 한다.
        // 0 은 «깨끗»과 «못 셈»을 안 가른다.
        expect(solidEdges(res.svg).length).toBeGreaterThan(5);
        expect(dimBoxes(res.svg).length).toBeGreaterThanOrEqual(3);
        // 빨개지면 **어느 라벨인지** 대야 한다 — 「N개 초과」만 찍으면 다음 사람이
        // 그림을 다시 렌더해서 눈으로 찾아야 한다(2026-08-28 관문에서 겪은 자리).
        const bad = onShape(res.svg);
        expect(`${bad.length}개 ${JSON.stringify(bad)}`).toBe(
          bad.length <= c.max
            ? `${bad.length}개 ${JSON.stringify(bad)}`
            : `${c.max}개 이하`,
        );
      }, 30_000);
    }
  },
);
