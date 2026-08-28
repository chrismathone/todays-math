/**
 * **꼭짓점 이름표가 도형 «바깥»에 앉는가** — 그리고 도형이 글자보다 큰가.
 *
 *   npx tsx scripts/qa/probe-middle-label-outward.ts
 *   npx tsx scripts/qa/probe-middle-label-outward.ts --selftest
 *
 * ## 왜 이 축이 필요한가
 *
 * 종전 배치기는 방향 후보가 «N, NE, E, SE, S, SW, W, NW» **고정 순서**였고 비용은
 * 잉크를 밟을 때만 올랐다. 도형 **안쪽은 대개 비어 있으므로** 아래 꼭짓점의 라벨은
 * `N`(rank 0)을 그대로 집었다 — 즉 **안으로 들어갔다.** 가장 단순한 삼각형에서도
 * 셋 중 둘이 그랬다(실측 2026-08-28: `B` 121.7° · `C` 116.6°, 0°가 바깥).
 *
 * 🔴 **어떤 기존 관문도 이 부류를 못 본다.**
 *   · vitest  — 좌표가 «어딘가»에 있으면 초록이다
 *   · 겹침 판정기 — 라벨이 **잉크를 밟는가**만 본다. 도형 «안쪽»은 비어 있으므로
 *                  안으로 들어간 라벨은 아무것도 안 밟는다. **구조적으로 0** 이다
 *   · KaTeX·조판 — 글자는 멀쩡히 그려진다
 * 결함이 스스로 신고하지 않는 자리다. 원장님이 화면에서 찾아 주실 때까지 몰랐다.
 *
 * ## 바깥을 어떻게 정하나 — **정본에서 뽑았다**
 *
 * RPM 지면(`.rpm-src` 6권 · 각 앞 140쪽 · 라벨 **13,591개**)을 벡터로 훑어 쟀다
 * (`scripts/qa/measure-rpm-label-placement.py`). 「덩어리 중심의 반대쪽」으로 재면
 * 28.3% 가 «안쪽»으로 나온다 — 교재가 그럴 리 없고, 그 축이 오목한 도형에서
 * 바깥을 못 가리는 것이다. **외각 이등분선**으로 다시 재니 RPM 은 **안쪽 9.3%**,
 * 점 이름만 보면 `A` 93.0% · `B` 92.7% · `C` 91.9% 가 바깥 60° 안에 든다.
 *
 * ## ⚠️ 이 판정기가 **못 보는 것**
 *
 * - 여기 그리는 것은 **손으로 고른 대표 그림**이다(엔진 렌더가 그림 하나에
 *   파이썬 프로세스 하나라 전량을 관문에서 못 돌린다). 전량 성적은 손으로 낸다:
 *   `npx tsx scripts/qa/dump-figure-svgs.ts .tmp-orca/label-after` →
 *   `python scripts/qa/measure-svg-label-placement.py .tmp-orca/label-after`.
 * - **각·치수 라벨은 안 본다.** 각 크기(`x°`)는 각 안쪽에 적는 것이 옳다.
 *   여기서 재는 것은 **점 이름**(홑 대문자)뿐이다.
 */
import { renderFigureSpec } from "../../src/lib/figure/renderFigureSpec";
import { generateMiddleProblem } from "../../src/lib/middle/generate";

/** 바깥에서 이만큼 넘게 벗어나면 «안쪽»이다. 0°가 정확히 바깥. */
const INWARD_DEG = 90;
/** 도형 지름이 글자 크기의 이 배는 되어야 한다. RPM 은 10 안팎. */
const MIN_SPAN = 4.0;
/** 이만큼은 재야 한다 — 분모가 무너지면 «깨끗»이 아니라 «못 셈»이다. */
const MIN_MEASURED = 30;

type XY = [number, number];

interface Case {
  name: string;
  spec: Record<string, unknown>;
}

/** 정다각형 꼭짓점 — 원장님이 짚으신 구각형·오각형을 그대로 세운다. */
function regular(n: number, cx: number, cy: number, r: number): XY[] {
  const out: XY[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = (Math.PI * 2 * i) / n - Math.PI / 2;
    out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return out;
}

const ABC = "ABCDEFGHIJ";

function polygonCase(name: string, n: number, diagonals: boolean): Case {
  const pts = regular(n, 110, 110, 90);
  const points: Record<string, XY> = {};
  const segments: Record<string, [string, string]> = {};
  const labels: Record<string, string> = {};
  for (let i = 0; i < n; i += 1) {
    points[ABC[i]!] = pts[i]!;
    labels[ABC[i]!] = ABC[i]!;
  }
  for (let i = 0; i < n; i += 1) {
    segments[`s${i}`] = [ABC[i]!, ABC[(i + 1) % n]!];
  }
  if (diagonals) {
    for (let i = 2; i < n - 1; i += 1) segments[`d${i}`] = [ABC[0]!, ABC[i]!];
  }
  return { name, spec: { version: 2, points, segments, labels } };
}

const CASES: Case[] = [
  {
    // 가장 단순한 그림. 여기서 둘이 안쪽이었다 — 이 한 줄이 결함의 뿌리다.
    name: "삼각형",
    spec: {
      version: 2,
      points: { A: [110, 30], B: [30, 180], C: [190, 180] },
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
      labels: { A: "A", B: "B", C: "C" },
    },
  },
  {
    name: "직사각형",
    spec: {
      version: 2,
      points: { A: [30, 30], B: [30, 170], C: [200, 170], D: [200, 30] },
      segments: {
        AB: ["A", "B"],
        BC: ["B", "C"],
        CD: ["C", "D"],
        DA: ["D", "A"],
      },
      labels: { A: "A", B: "B", C: "C", D: "D" },
    },
  },
  {
    name: "사각형 안의 삼각형",
    spec: {
      version: 2,
      points: {
        C: [120, 20],
        E: [220, 110],
        D: [120, 200],
        F: [20, 110],
        A: [70, 110],
        B: [170, 110],
      },
      segments: {
        CE: ["C", "E"],
        ED: ["E", "D"],
        DF: ["D", "F"],
        FC: ["F", "C"],
        CA: ["C", "A"],
        CB: ["C", "B"],
        AB: ["A", "B"],
      },
      labels: { A: "A", B: "B", C: "C", D: "D", E: "E", F: "F" },
    },
  },
  polygonCase("오각형과 대각선", 5, true),
  polygonCase("구각형과 대각선", 9, true),
  {
    // 부채꼴 — 중심 `O` 는 두 반지름의 «바깥쪽»에 앉아야 한다.
    name: "부채꼴",
    spec: {
      version: 2,
      points: {
        O: [110, 130],
        A: { type: "on_circle", circle: "c", angle: 0 },
        B: { type: "on_circle", circle: "c", angle: 120 },
      },
      circles: { c: { center: "O", radius: 90 } },
      segments: { OA: ["O", "A"], OB: ["O", "B"] },
      labels: { O: "O", A: "A", B: "B" },
    },
  },
  {
    name: "반원과 내접삼각형",
    spec: {
      version: 2,
      points: {
        O: [120, 120],
        A: { type: "on_circle", circle: "c", angle: 180 },
        B: { type: "on_circle", circle: "c", angle: 0 },
        C: { type: "on_circle", circle: "c", angle: 60 },
      },
      circles: { c: { center: "O", radius: 90 } },
      segments: { AB: ["A", "B"], OC: ["O", "C"], CB: ["C", "B"] },
      labels: { O: "O", A: "A", B: "B", C: "C" },
    },
  },
];

// ── 잰다 ──────────────────────────────────────────────────────────────
interface Lab {
  text: string;
  cx: number;
  cy: number;
  size: number;
  /** 임자 꼭짓점 — 엔진이 `data-px`·`data-py` 로 적어 준다. 점 이름표에만 있다. */
  owner: XY | null;
}

function num(tag: string, name: string): number {
  const m = new RegExp(`${name}="([-\\d.]+)"`).exec(tag);
  return m ? Number(m[1]) : NaN;
}

function labelsOf(svg: string): Lab[] {
  const out: Lab[] = [];
  for (const m of svg.matchAll(/<g (data-label="[^"]*"[^>]*?)>/g)) {
    const tag = m[1]!;
    const text = /data-label="([^"]*)"/.exec(tag)?.[1] ?? "";
    const asc = num(tag, "data-a");
    const desc = num(tag, "data-d");
    const px = num(tag, "data-px");
    const py = num(tag, "data-py");
    out.push({
      text,
      cx: num(tag, "data-x"),
      cy: num(tag, "data-base") - asc / 2 + desc / 2,
      size: num(tag, "data-fs"),
      owner: Number.isFinite(px) && Number.isFinite(py) ? [px, py] : null,
    });
  }
  return out;
}

/** 도형 획의 끝점 — `<line>` 만 본다(호·원은 바깥이 반지름 방향이라 이미 옳다). */
function segmentsOf(svg: string): { a: XY; b: XY }[] {
  const out: { a: XY; b: XY }[] = [];
  const re =
    /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g;
  for (const m of svg.matchAll(re)) {
    out.push({
      a: [Number(m[1]), Number(m[2])],
      b: [Number(m[3]), Number(m[4])],
    });
  }
  return out;
}

/**
 * 이 꼭짓점의 바깥 = 붙은 변들의 반대 방향(외각 이등분선). 못 정하면 null.
 *
 * ⚠️ **변이 하나뿐이면 판정하지 않는다.** 그때 「바깥」은 그 변의 반대 방향
 *    하나뿐인데, 그 점이 호 위에 있으면 엔진은 (옳게) **반지름 방향**을 쓴다 —
 *    둘은 다른 값이라 멀쩡한 자리가 «안쪽»으로 찍힌다(실측: 도넛 부채꼴의
 *    `A`·`B` 가 154°로 걸렸다). RPM 실측에서도 변 1개 무리가 가장 흐리다
 *    (≤60° 71.8% — 변 2개 이상은 83~94%). **거짓 경보는 가드를 끈다.**
 */
function outwardAt(v: XY, segs: { a: XY; b: XY }[]): XY | null {
  let sx = 0;
  let sy = 0;
  let hit = 0;
  for (const s of segs) {
    for (const [p, q] of [
      [s.a, s.b],
      [s.b, s.a],
    ] as [XY, XY][]) {
      if (Math.hypot(p[0] - v[0], p[1] - v[1]) > 1.6) continue;
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < 1e-6) continue;
      sx += (q[0] - p[0]) / d;
      sy += (q[1] - p[1]) / d;
      hit += 1;
    }
  }
  if (hit < 2) return null;
  const len = Math.hypot(sx, sy);
  if (len < 0.3) return null;
  return [-sx / len, -sy / len];
}

interface Hit {
  where: string;
  text: string;
  dev: number;
}

/**
 * 실제로 **잰** 점 이름표 수. 0 이면 「깨끗」이 아니라 **「못 쟀다」**다 —
 * 엔진이 `data-px` 를 안 적게 되는 날 이 판정기는 조용히 초록이 된다.
 */
export let measured = 0;

export function inwardLabels(svg: string, where: string): Hit[] {
  const segs = segmentsOf(svg);
  const hits: Hit[] = [];
  for (const lab of labelsOf(svg)) {
    // **점 이름만** 본다 — 각 크기·치수는 안쪽이 제자리다.
    if (!/^[A-Z]$/.test(lab.text)) continue;
    // ⚠️ **임자를 추측하지 않는다.** 엔진이 적어 준 꼭짓점만 쓴다. 없으면 이
    //    라벨은 점 이름표가 아니거나(각·치수) 옛 경로라 **재지 않는다** —
    //    「가장 가까운 끝점」으로 추측하면 두 꼭짓점 사이의 라벨을 엉뚱한 쪽에
    //    붙여 멀쩡한 자리를 178° 안쪽으로 판정한다(실측 2026-08-28).
    const best = lab.owner;
    if (!best) continue;
    const out = outwardAt(best, segs);
    if (!out) continue;
    measured += 1;
    const dx = lab.cx - best[0];
    const dy = lab.cy - best[1];
    const dl = Math.hypot(dx, dy);
    if (dl < 1e-6) continue;
    const cos = Math.max(-1, Math.min(1, (dx * out[0] + dy * out[1]) / dl));
    const dev = (Math.acos(cos) * 180) / Math.PI;
    if (dev > INWARD_DEG) hits.push({ where, text: lab.text, dev });
  }
  return hits;
}

/**
 * 도형 지름 ÷ 글자 크기. 작으면 «글자가 도형보다 크다».
 *
 * ⚠️ **선분만 세면 안 된다.** 부채꼴은 잉크의 대부분이 호(`<path>`)와 원이라,
 *    선분 끝점만 재면 지름이 작게 나와 **멀쩡한 그림이 걸린다**(실측: 도넛
 *    부채꼴이 2.99배로 찍혔다 — 실제로는 호가 지면을 다 채운다). 거짓 경보는
 *    가드를 끈다.
 *
 * ⚠️ 글리프 윤곽선(`<path data-c=…>`)은 **도형이 아니다** — 세면 글자가 클수록
 *    도형이 커 보여 이 자가 스스로 눈이 먼다. `data-c` 가 있는 `path` 는 뺀다.
 */
export function spanRatio(svg: string): number | null {
  const labs = labelsOf(svg);
  const segs = segmentsOf(svg);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of segs) {
    xs.push(s.a[0], s.b[0]);
    ys.push(s.a[1], s.b[1]);
  }
  for (const m of svg.matchAll(/<circle ([^>]*)>/g)) {
    const cx = num(m[1]!, "cx");
    const cy = num(m[1]!, "cy");
    const r = num(m[1]!, "r");
    if (![cx, cy, r].every(Number.isFinite)) continue;
    xs.push(cx - r, cx + r);
    ys.push(cy - r, cy + r);
  }
  for (const m of svg.matchAll(/<path ([^>]*)>/g)) {
    const tag = m[1]!;
    if (tag.includes("data-c=")) continue; // 글자 외곽선이다
    const d = /\sd="([^"]*)"/.exec(tag)?.[1];
    if (!d) continue;
    // ⚠️ **숫자를 둘씩 묶으면 안 된다.** `A rx ry 회전 큰호 방향 x y` 는 **일곱**이라
    //    반지름·깃발이 좌표로 섞여 들어간다(실측: 그래서 부채꼴 지름이 92 인데
    //    자가 72 로 읽었다). 명령을 읽고 **도달점만** 꺼낸다.
    for (const seg of d.matchAll(/([MLHVCSQTA])([^MLHVCSQTAZmlhvcsqtaz]*)/g)) {
      const cmd = seg[1]!;
      const n = [...seg[2]!.matchAll(/[-+]?(?:\d*\.\d+|\d+)/g)].map((v) =>
        Number(v[0]),
      );
      const stride =
        cmd === "A" ? 7 : cmd === "C" ? 6 : cmd === "S" || cmd === "Q" ? 4 : 2;
      if (cmd === "H" || cmd === "V") continue;
      for (let i = stride - 1; i < n.length; i += stride) {
        xs.push(n[i - 1]!);
        ys.push(n[i]!);
      }
    }
  }
  if (labs.length === 0 || xs.length === 0) return null;
  const diag = Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  const size = Math.max(...labs.map((l) => l.size));
  return size > 0 ? diag / size : null;
}

// ── 눈금 ──────────────────────────────────────────────────────────────
/**
 * 양성·음성을 **둘 다** 댄다. 양성만 대면 재현율만 재고 «지어냄»은 구조적으로
 * 0 이 된다(2026-08-20 판정자 눈금과 같은 이야기 — 이번엔 우리 판정기 자신이다).
 */
function labelGroup(
  text: string,
  x: number,
  base: number,
  owner?: [number, number],
): string {
  return (
    `<g data-label="${text}" data-anchor="middle" data-x="${x}" ` +
    `data-y="${base}" data-base="${base}"` +
    (owner ? ` data-px="${owner[0]}" data-py="${owner[1]}"` : "") +
    ` data-fs="24.000" data-w="18.000" data-a="17.000" data-d="0.000"></g>`
  );
}

const V_A: [number, number] = [110, 30];
const V_B: [number, number] = [30, 180];
const V_C: [number, number] = [190, 180];

const TRI_LINES =
  '<line x1="110" y1="30" x2="30" y2="180" stroke="#111" stroke-width="1.9" />' +
  '<line x1="30" y1="180" x2="190" y2="180" stroke="#111" stroke-width="1.9" />' +
  '<line x1="190" y1="180" x2="110" y2="30" stroke="#111" stroke-width="1.9" />';

function selftest(): void {
  const gauges: [string, string, boolean][] = [
    // ── 양성 — 안쪽으로 들어갔다. 반드시 잡아야 한다.
    [
      "양성 · 아래 꼭짓점 라벨이 위(도형 안)로",
      `${TRI_LINES}${labelGroup("B", 30, 160, V_B)}`,
      true,
    ],
    [
      "양성 · 오른아래 꼭짓점 라벨이 위로",
      `${TRI_LINES}${labelGroup("C", 190, 160, V_C)}`,
      true,
    ],
    [
      "양성 · 윗 꼭짓점 라벨이 아래(도형 안)로",
      `${TRI_LINES}${labelGroup("A", 110, 70, V_A)}`,
      true,
    ],
    [
      "양성 · 아래 꼭짓점 라벨이 옆이 아니라 안쪽 위로",
      `${TRI_LINES}${labelGroup("B", 55, 155, V_B)}`,
      true,
    ],
    // ── 음성 — 바깥이다. 잡으면 «지어냄»이다.
    [
      "음성 · 윗 꼭짓점 라벨이 위로",
      `${TRI_LINES}${labelGroup("A", 110, 20, V_A)}`,
      false,
    ],
    [
      "음성 · 왼아래 꼭짓점 라벨이 왼아래로",
      `${TRI_LINES}${labelGroup("B", 12, 205, V_B)}`,
      false,
    ],
    [
      "음성 · 오른아래 꼭짓점 라벨이 오른아래로",
      `${TRI_LINES}${labelGroup("C", 208, 205, V_C)}`,
      false,
    ],
    [
      "음성 · 아래 꼭짓점 라벨이 바로 아래로",
      `${TRI_LINES}${labelGroup("B", 30, 210, V_B)}`,
      false,
    ],
    // ── 각·치수 라벨은 이 축이 **안 본다**. 안쪽에 있어도 잡으면 안 된다.
    [
      "음성 · 각 크기는 안쪽이 제자리",
      `${TRI_LINES}${labelGroup("x", 110, 150, V_A)}`,
      false,
    ],
    [
      "음성 · 치수도 이 축 밖",
      `${TRI_LINES}${labelGroup("5 cm", 110, 150, V_A)}`,
      false,
    ],
  ];
  let bad = 0;
  for (const [name, body, want] of gauges) {
    const svg = `<svg viewBox="0 0 240 240">${body}</svg>`;
    const got = inwardLabels(svg, name).length > 0;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(`  ${ok ? "✅" : "❌"} ${name} — ${got ? "안쪽" : "바깥"}`);
  }
  // 축척 눈금 — 도형이 글자보다 작은 그림을 잡아야 한다.
  const tiny = `<svg viewBox="0 0 80 80"><line x1="20" y1="40" x2="34" y2="40" stroke="#111"/>${labelGroup("A", 20, 25, [20, 40])}</svg>`;
  const big = `<svg viewBox="0 0 240 240">${TRI_LINES}${labelGroup("A", 110, 20, V_A)}</svg>`;
  for (const [name, svg, want] of [
    ["양성 · 도형이 글자보다 작다", tiny, true],
    ["음성 · 도형이 글자의 여러 배", big, false],
  ] as [string, string, boolean][]) {
    const ratio = spanRatio(svg);
    const got = ratio !== null && ratio < MIN_SPAN;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? "✅" : "❌"} ${name} — ${ratio === null ? "못 잼" : `${ratio.toFixed(2)}배`}`,
    );
  }
  console.log(`눈금 ${gauges.length + 2}건 (양성 5 · 음성 7) · 어긋남 ${bad}`);
  process.exit(bad === 0 ? 0 : 1);
}

/**
 * **실제 유형에서도 잰다** — 축척이 문항 수치에 매여 있던 갈래들.
 *
 * 손으로 고른 목록이라 새 갈래는 여기 안 들어온다. 그래서 **전량은 손으로** 낸다
 * (머리말 참조). 이 넷을 박아 두는 이유는 이 갈래들이 2026-08-28 에 실제로
 * 「도형 지름 ÷ 글자 크기」 0.65~3.96 이었기 때문이다 — 되돌아가면 여기서 빨개진다.
 */
const LIVE_KEYS = [
  "1-2|원과 부채꼴|12",
  "1-2|원과 부채꼴|13",
  "1-2|원과 부채꼴|14",
  "1-2|원과 부채꼴|17",
];

function liveCases(): Case[] {
  const out: Case[] = [];
  for (const key of LIVE_KEYS) {
    const spec = generateMiddleProblem(key, 1, 0)?.figureSpec as
      Record<string, unknown> | undefined;
    if (!spec) {
      console.log(`🔴 «${key}» 가 그림을 안 낸다 — 목록이 낡았다.`);
      process.exit(1);
    }
    out.push({ name: key, spec });
  }
  return out;
}

async function main(): Promise<void> {
  if (process.argv.includes("--selftest")) {
    selftest();
    return;
  }
  const inward: Hit[] = [];
  const small: [string, number][] = [];
  let drawn = 0;
  for (const c of [...CASES, ...liveCases()]) {
    const r = await renderFigureSpec(c.spec);
    if (!r.ok) {
      console.log(
        `🔴 «${c.name}» 를 못 그렸다 — ${JSON.stringify(r).slice(0, 160)}`,
      );
      process.exit(1);
    }
    drawn += 1;
    inward.push(...inwardLabels(r.svg, c.name));
    const ratio = spanRatio(r.svg);
    if (ratio !== null && ratio < MIN_SPAN) small.push([c.name, ratio]);
  }
  console.log(
    `대표 그림 ${drawn}장 · **잰 점 이름표 ${measured}개**` +
      " (RPM 정본 13,591 라벨에서 뽑은 규칙으로 잰다)",
  );
  // 🔴 **0 은 «깨끗»과 «못 셈»을 안 가른다.** 엔진이 `data-px` 를 안 적게 되면
  //    잴 것이 하나도 없어 이 판정기가 조용히 초록이 된다. 분모를 먼저 지킨다.
  if (measured < MIN_MEASURED) {
    console.log(
      `🔴 점 이름표를 ${measured}개밖에 못 쟀다(${MIN_MEASURED} 이상이어야 한다).\n` +
        "   엔진이 `data-px`·`data-py` 를 안 적는지 보라 — 그러면 이 축이 눈이 먼다.",
    );
    process.exit(1);
  }
  if (inward.length === 0 && small.length === 0) {
    console.log("✅ 점 이름이 전부 바깥이고, 도형이 글자보다 크다.");
    return;
  }
  for (const h of inward) {
    console.log(
      `  ❌ ${h.where} — «${h.text}» 가 안쪽으로 ${h.dev.toFixed(1)}°`,
    );
  }
  for (const [name, ratio] of small) {
    console.log(
      `  ❌ ${name} — 도형 지름이 글자의 ${ratio.toFixed(2)}배뿐이다`,
    );
  }
  console.log(
    "\n고치는 법: 꼭짓점 라벨 방향은 `figure_scene._outward_vector` 가 정한다." +
      "\n            도형이 작으면 그림을 만드는 쪽에서 배율을 곱해라(`drawScale`).",
  );
  process.exit(1);
}

void main();
