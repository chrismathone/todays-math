/**
 * **그림에 적힌 각이 정말 그 각인가** — 좌표로 재서 라벨과 맞댄다.
 *
 *   npx tsx scripts/qa/probe-middle-figure-angles.ts
 *   npx tsx scripts/qa/probe-middle-figure-angles.ts --selftest
 *
 * ## 왜 이 축이 필요한가 (원장님 지적 2026-08-27)
 *
 *   「지금 각이 70도인데 전혀 70도처럼 안 생김. 지 멋대로 그려놓고 70도라고 우기고 있음.」
 *
 * `2-2|삼각형의 성질|06` 이 직각을 $C$ 에 두고 `rise = base·tan(acute)` 로 그려서
 * **$\angle B$ 가 acute** 가 되는데, 라벨은 **$\angle A$** 에 붙이고 있었다.
 * $\angle A = 90^\circ - \angle B$ 이므로 `acute=70` 이면 지면의 각은 **20°**다.
 *
 * 🔴 **기존 관문은 이 부류를 하나도 못 본다.**
 *   · 값 검산  — 발문의 수와 정답은 서로 맞다(그림만 틀렸다)
 *   · KaTeX    — 그림은 SVG 라 수식 검사 밖이다
 *   · 지면 냄새 — 글자를 보지 좌표를 안 본다
 *   · 렌더 성공 — 좌표가 유효하면 잘 그려진다. **틀린 그림도 잘 그려진다.**
 * 「없는 축은 변이시킬 수 없다」가 이 저장소에서 되풀이된 자리다.
 *
 * ## 무엇을 재나
 *
 * FigureSpec v2 의 `angles` 는 `{ vertex, points: [P, Q], label?, right? }` 다.
 * `points` 에 그 이름들의 좌표가 있으므로 **꼭짓점에서 두 점으로 가는 두 벡터의
 * 사잇각**을 직접 잴 수 있다. 라벨이 `NN°` 꼴이면 그 값과, `right: true` 면 90° 와 견준다.
 *
 * ⚠️ **각의 크기는 y 뒤집기에 안 변한다**(반사는 각을 보존한다). 그래서 `fitPts` 가
 *    SVG 좌표로 어떻게 접든 이 판정은 그대로 선다 — 그 변환을 옮겨 적을 필요가 없다.
 *
 * ⚠️ **허용 오차 2°.** 좌표가 정수로 반올림되므로 딱 떨어지지 않는다. 작은 도형에서
 *    1px 반올림이 1° 넘게 흔든다. 2° 를 넘게 어긋나면 그건 반올림이 아니다.
 *    (실측: 이 결함은 **44~50°** 어긋났다. 문턱을 어디 두든 잡힌다.)
 *
 * ⚠️ **라벨이 문자면 첫 축은 안 본다** — `x`, `a°`, `∠x` 처럼 미지수를 적는 것이
 *    정상이다. 숫자로 못 읽는 라벨은 **그 축의 대상이 아니다**(못 본 것은 「없다」가 아니다).
 *
 * ## 축 둘 — **기호 라벨은 첫 축이 구조적으로 못 본다** (2026-08-28)
 *
 * RPM 1:1 대조를 하다 `1-2|기본 도형|10`(맞꼭지각)이 발문과 상관없이 **늘 55°** 를
 * 그리는 것을 찾았다. 원장님이 짚으신 것과 **같은 결함**인데, 라벨이 `a` 라 첫 축이
 * 못 본다 — 그림에 적힌 것은 기호이고 **값은 발문에 있다.**
 *
 * 그래서 둘째 축을 세운다: 발문이 `\angle a=(4x+51)^\circ` 라고 **그 기호의 값을
 * 말하면**, `facts.x` 로 셈해 좌표와 맞댄다. 이 모양인 유형은 셋뿐이었고
 * (`기본 도형|10` · `위치 관계|11` · `위치 관계|12`) **셋 다 틀려 있었다.**
 * 그림 둘이 모듈 상수라 씨앗이 뭐든 같은 각을 그렸다.
 *
 * ⚠️ §4-20-b(「발문이 이미 말했는가」)는 **값을 라벨로 이중표기하지 마라**는 규칙이지
 *    「아무 각이나 그려도 된다」가 아니다. 라벨은 기호로 두고 **그리는 각만** 맞춘다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const SEEDS = [20260827, 7, 424242];
const VARIANTS = 2;
/** 좌표 반올림이 만드는 흔들림의 상한. 이보다 크게 어긋나면 반올림이 아니다. */
const TOL_DEG = 2;

type XY = [number, number];

interface AngleCheck {
  name: string;
  vertex: string;
  from: string;
  to: string;
  /** 라벨이 요구하는 각. `right:true` 면 90. */
  want: number;
  /** 좌표로 잰 각. */
  got: number;
  /** 라벨 원문 — 사람이 볼 때 쓴다. */
  raw: string;
}

/** `70°` · `$70^\circ$` · `70도` 처럼 **숫자로 읽히는** 라벨만 값을 낸다. */
export function labelDegrees(label: unknown): number | null {
  if (typeof label !== "string") return null;
  // 문자가 섞이면(미지수 x·a) 판정 대상이 아니다. 숫자와 도 표시만 남는지 본다.
  const m = /^\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:\^?\\?circ|°|도)\s*\$?\s*$/.exec(
    label,
  );
  return m ? Number(m[1]) : null;
}

function angleAt(v: XY, p: XY, q: XY): number {
  const a: XY = [p[0] - v[0], p[1] - v[1]];
  const b: XY = [q[0] - v[0], q[1] - v[1]];
  const na = Math.hypot(a[0], a[1]);
  const nb = Math.hypot(b[0], b[1]);
  if (na === 0 || nb === 0) return NaN;
  const cos = (a[0] * b[0] + a[1] * b[1]) / (na * nb);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function asXY(v: unknown): XY | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const [x, y] = v;
  if (typeof x !== "number" || typeof y !== "number") return null;
  return [x, y];
}

/**
 * 이 그림에서 **라벨과 어긋난 각**을 낸다. 잴 수 없는 것은 조용히 건너뛰지 않고
 * 아예 대상이 아니다(라벨이 문자·좌표가 없음).
 */
export function angleMismatches(spec: unknown): AngleCheck[] {
  if (!spec || typeof spec !== "object") return [];
  const s = spec as Record<string, unknown>;
  const rawPts = s.points;
  const rawAngles = s.angles;
  if (!rawPts || typeof rawPts !== "object") return [];
  if (!rawAngles || typeof rawAngles !== "object") return [];

  const pts = new Map<string, XY>();
  for (const [k, v] of Object.entries(rawPts as Record<string, unknown>)) {
    const xy = asXY(v);
    if (xy) pts.set(k, xy);
  }

  const out: AngleCheck[] = [];
  for (const [name, rawA] of Object.entries(
    rawAngles as Record<string, unknown>,
  )) {
    if (!rawA || typeof rawA !== "object" || Array.isArray(rawA)) continue;
    const a = rawA as Record<string, unknown>;
    const vertex = typeof a.vertex === "string" ? a.vertex : null;
    const arms = Array.isArray(a.points) ? a.points : null;
    if (!vertex || !arms || arms.length < 2) continue;
    const [pn, qn] = arms as [unknown, unknown];
    if (typeof pn !== "string" || typeof qn !== "string") continue;

    const V = pts.get(vertex);
    const P = pts.get(pn);
    const Q = pts.get(qn);
    if (!V || !P || !Q) continue;

    const want = a.right === true ? 90 : labelDegrees(a.label);
    if (want === null) continue; // 미지수 라벨 — 대상이 아니다

    const got = angleAt(V, P, Q);
    if (!Number.isFinite(got)) continue;
    if (Math.abs(got - want) > TOL_DEG)
      out.push({
        name,
        vertex,
        from: pn,
        to: qn,
        want,
        got: Math.round(got * 10) / 10,
        raw: a.right === true ? "직각 표시" : String(a.label),
      });
  }
  return out;
}

/**
 * 발문이 `\angle a=NN^\circ` 또는 `\angle a=(cx+d)^\circ` 라고 **기호의 값을 말하는** 자리.
 * 기호는 한 글자만 본다 — `\angle ABC` 같은 세 글자 표기는 라벨이 아니라 각의 이름이다.
 */
const CONTENT_SAYS =
  /\\angle ([a-z])\s*=\s*(?:\((\d+)x\s*([+-])\s*(\d+)\)|(\d+))\s*\^?\\?circ/g;

/**
 * **발문이 값을 말한 기호 라벨**을 좌표와 맞댄다 — 첫 축(`angleMismatches`)이
 * 구조적으로 못 보는 자리다.
 *
 * `facts.x` 가 없으면 `(cx+d)` 를 셈할 수 없으므로 **대상이 아니다**(조용한 통과가
 * 아니라 대상 제외 — 「못 본 것」과 「없는 것」을 안 섞는다).
 */
export function symbolicAngleMismatches(
  spec: unknown,
  content: string,
  facts: unknown,
): AngleCheck[] {
  if (!spec || typeof spec !== "object") return [];
  const s = spec as Record<string, unknown>;
  const rawPts = s.points;
  const rawAngles = s.angles;
  if (!rawPts || typeof rawPts !== "object") return [];
  if (!rawAngles || typeof rawAngles !== "object") return [];
  const x = (facts as Record<string, unknown> | null | undefined)?.x;

  const pts = new Map<string, XY>();
  for (const [k, v] of Object.entries(rawPts as Record<string, unknown>)) {
    const xy = asXY(v);
    if (xy) pts.set(k, xy);
  }

  const out: AngleCheck[] = [];
  CONTENT_SAYS.lastIndex = 0;
  for (let m = CONTENT_SAYS.exec(content); m; m = CONTENT_SAYS.exec(content)) {
    const sym = m[1]!;
    const want = m[5]
      ? Number(m[5])
      : typeof x === "number"
        ? Number(m[2]) * x + (m[3] === "-" ? -1 : 1) * Number(m[4])
        : NaN;
    if (!Number.isFinite(want)) continue; // `x` 를 모르면 대상이 아니다

    for (const [name, rawA] of Object.entries(
      rawAngles as Record<string, unknown>,
    )) {
      if (!rawA || typeof rawA !== "object" || Array.isArray(rawA)) continue;
      const a = rawA as Record<string, unknown>;
      if (a.label !== sym) continue;
      const vertex = typeof a.vertex === "string" ? a.vertex : null;
      const arms = Array.isArray(a.points) ? a.points : null;
      if (!vertex || !arms || arms.length < 2) continue;
      const [pn, qn] = arms as [unknown, unknown];
      if (typeof pn !== "string" || typeof qn !== "string") continue;
      const V = pts.get(vertex);
      const P = pts.get(pn);
      const Q = pts.get(qn);
      if (!V || !P || !Q) continue;
      const got = angleAt(V, P, Q);
      if (!Number.isFinite(got)) continue;
      if (Math.abs(got - want) > TOL_DEG)
        out.push({
          name,
          vertex,
          from: pn,
          to: qn,
          want,
          got: Math.round(got * 10) / 10,
          raw: `발문이 말한 ∠${sym}=${want}°`,
        });
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// 눈금 — 양성과 음성을 **둘 다** 댄다. 양성만 대면 지어냄이 구조적으로 0이 된다.
// ────────────────────────────────────────────────────────────────────────
/** 직각을 C 에 둔 삼각형. rise 를 바꾸면 ∠A·∠B 가 함께 움직인다. */
function triSpec(rise: number, label: string, at: "A" | "B"): unknown {
  const base = 78;
  return {
    version: 2,
    points: { A: [base, rise], B: [0, 0], C: [base, 0] },
    segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
    angles: {
      rC: { vertex: "C", points: ["B", "A"], right: true },
      ang:
        at === "A"
          ? { vertex: "A", points: ["B", "C"], label }
          : { vertex: "B", points: ["A", "C"], label },
    },
  };
}

const GAUGE: [name: string, spec: unknown, catches: boolean][] = [
  // 원장님이 화면에서 찾으신 그 모양 — rise=214 면 ∠A 는 20°인데 70° 라 적혀 있다.
  ["🔴 그 결함 그대로 — ∠A 가 20°인데 70°", triSpec(214.3, "70°", "A"), true],
  ["🔴 64° 판", triSpec(159.9, "64°", "A"), true],
  [
    "🔴 직각 표시가 직각이 아니다",
    {
      version: 2,
      points: { A: [0, 0], B: [100, 0], C: [40, 60] },
      angles: { r: { vertex: "A", points: ["B", "C"], right: true } },
    },
    true,
  ],
  // ── 음성 — 여기가 없으면 「전부 잡는다」와 구분이 안 된다 ──────────────
  ["같은 그림에서 ∠B 에 붙이면 맞다", triSpec(214.3, "70°", "B"), false],
  ["30° 판도 ∠B 면 맞다", triSpec(45, "30°", "B"), false],
  [
    "직각 표시가 진짜 직각이면 안 잡는다",
    {
      version: 2,
      points: { A: [78, 100], B: [0, 0], C: [78, 0] },
      angles: { rC: { vertex: "C", points: ["B", "A"], right: true } },
    },
    false,
  ],
  ["미지수 라벨은 대상이 아니다 — `x`", triSpec(214.3, "x", "A"), false],
  [
    "각도가 아닌 라벨도 대상이 아니다 — `5\\,\\mathrm{cm}`",
    triSpec(214.3, "5\\,\\mathrm{cm}", "A"),
    false,
  ],
  [
    "좌표가 없는 점을 가리키면 못 잰다 (조용히 통과가 아니라 대상 아님)",
    {
      version: 2,
      points: { A: [0, 0], B: [10, 0] },
      angles: { a: { vertex: "A", points: ["B", "Z"], label: "70°" } },
    },
    false,
  ],
  ["반올림 1° 는 봐준다", triSpec(45.9, "30°", "B"), false],
];

/** 두 직선이 O 에서 만나 ∠a(=BOC)를 이루는 그림 — `deg` 를 실제로 그린다. */
function crossSpec(deg: number): unknown {
  const h = ((deg / 2) * Math.PI) / 180;
  const P = (t: number): XY => [120 + 70 * Math.cos(t), 95 - 70 * Math.sin(t)];
  return {
    version: 2,
    points: {
      O: [120, 95],
      A: P(Math.PI - h),
      B: P(-h),
      C: P(h),
      D: P(Math.PI + h),
    },
    segments: { AB: ["A", "B"], CD: ["C", "D"] },
    angles: { a: { vertex: "O", points: ["B", "C"], label: "a" } },
  };
}

/**
 * 둘째 축의 눈금 — `[이름, 스펙, 발문, facts, 잡나]`.
 *
 * ⚠️ **양성 하나는 그 결함 그대로다** — 상수 55° 그림에 발문이 99° 라고 하는 판.
 *    실제 유형을 부르지 않고 **픽스처**로 박는다: 유형을 고치면 살아 있는 엔진에서는
 *    그 자리가 사라져 재현율을 영영 못 재게 된다(2026-08-23 사다리 판정기와 같은 자리).
 */
const GAUGE_SYM: [
  name: string,
  spec: unknown,
  content: string,
  facts: unknown,
  catches: boolean,
][] = [
  [
    "🔴 그 결함 그대로 — 발문은 ∠a=99° 인데 그림은 늘 55°",
    crossSpec(55),
    "그림에서 $\\angle a=(4x+51)^\\circ$, $\\angle c=(5x+39)^\\circ$는 맞꼭지각이다.",
    { x: 12 },
    true,
  ],
  [
    "🔴 발문이 수를 바로 말하는 판 — ∠a=97° 인데 그림은 55°",
    crossSpec(55),
    "그림에서 $l\\parallel m$이고 $\\angle a=97^\\circ$이다.",
    {},
    true,
  ],
  // ── 음성 ──────────────────────────────────────────────────────────────
  [
    "그림이 발문대로 99° 를 그리면 안 잡는다",
    crossSpec(99),
    "그림에서 $\\angle a=(4x+51)^\\circ$, $\\angle c=(5x+39)^\\circ$는 맞꼭지각이다.",
    { x: 12 },
    false,
  ],
  [
    "그림이 발문대로 97° 를 그리면 안 잡는다",
    crossSpec(97),
    "그림에서 $l\\parallel m$이고 $\\angle a=97^\\circ$이다.",
    {},
    false,
  ],
  [
    "`x` 를 모르면 대상이 아니다 — 조용한 통과가 아니라 셈을 못 한다",
    crossSpec(55),
    "그림에서 $\\angle a=(4x+51)^\\circ$이다.",
    {},
    false,
  ],
  [
    "발문이 값을 안 말하면 대상이 아니다",
    crossSpec(55),
    "그림에서 $\\angle a$와 $\\angle c$는 맞꼭지각이다. 옳은 것을 고르시오.",
    { x: 12 },
    false,
  ],
  [
    "세 글자 각 이름(∠ABC)은 라벨이 아니다 — 기호 하나만 본다",
    crossSpec(55),
    "그림에서 $\\angle ABC=99^\\circ$이다.",
    {},
    false,
  ],
  [
    "발문이 말한 기호가 그림에 없으면 대상이 아니다",
    crossSpec(55),
    "그림에서 $\\angle z=99^\\circ$이다.",
    {},
    false,
  ],
];

function selftest(): void {
  let bad = 0;
  for (const [name, spec, want] of GAUGE) {
    const got = angleMismatches(spec).length > 0;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? "✅" : "❌"} ${name} — 기대 ${want ? "잡는다" : "안 잡는다"}` +
        ` / 실제 ${got ? "잡는다" : "안 잡는다"}`,
    );
  }
  console.log("  ── 축 2: 라벨은 기호이고 값은 발문에 있다 ──");
  for (const [name, spec, content, facts, want] of GAUGE_SYM) {
    const got = symbolicAngleMismatches(spec, content, facts).length > 0;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? "✅" : "❌"} ${name} — 기대 ${want ? "잡는다" : "안 잡는다"}` +
        ` / 실제 ${got ? "잡는다" : "안 잡는다"}`,
    );
  }
  const total = GAUGE.length + GAUGE_SYM.length;
  const pos =
    GAUGE.filter((g) => g[2]).length + GAUGE_SYM.filter((g) => g[4]).length;
  console.log(
    `\n${bad === 0 ? "✅" : "🔴"} 눈금 ${total}건` +
      `${bad === 0 ? " 전부 맞다" : ` 중 ${bad}건 어긋남`}` +
      ` (양성 ${pos} · 음성 ${total - pos})`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

function main(): void {
  if (process.argv.includes("--selftest")) return selftest();

  const types = registeredTypes();
  const bad = new Map<string, AngleCheck[]>();
  let tried = 0;
  let threw = 0;
  let withAngles = 0;

  for (const t of types) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        tried += 1;
        let p;
        try {
          p = generateMiddleProblem(t.key, seed, v);
        } catch {
          threw += 1;
          continue;
        }
        const spec = p.figureSpec as unknown;
        if (!spec || typeof spec !== "object") continue;
        const angles = (spec as Record<string, unknown>).angles;
        if (angles && typeof angles === "object") withAngles += 1;
        const miss = [
          ...angleMismatches(spec),
          ...symbolicAngleMismatches(spec, p.content, p.facts),
        ];
        if (miss.length > 0 && !bad.has(t.key)) bad.set(t.key, miss);
      }
    }
  }

  console.log(
    `등록 유형 ${types.length}개 × 씨앗 ${SEEDS.length} × 변형 ${VARIANTS}` +
      ` = 시도 ${tried} (던진 것 ${threw})`,
  );
  console.log(`각을 적은 그림 ${withAngles}건 · 어긋난 유형 ${bad.size}개`);

  if (bad.size === 0) {
    console.log("✅ 그림의 각이 전부 라벨과 맞다.");
    return;
  }
  for (const [key, list] of [...bad].sort()) {
    console.log(`  ❌ ${key}`);
    for (const c of list)
      console.log(
        `       ∠${c.vertex} (${c.from}–${c.vertex}–${c.to}) — 적힌 것 ${c.raw}` +
          ` / 실제 ${c.got}° · ${Math.abs(c.got - c.want).toFixed(1)}° 어긋남`,
      );
  }
  console.log(
    "\n고치는 법: 좌표를 **라벨이 가리키는 각**에서 유도하라." +
      " 직각이 $C$ 인 삼각형에서 $\\angle A$ 를 $t$ 로 두려면" +
      " `rise = base / tan(t)` 다 — `base * tan(t)` 는 $\\angle B$ 를 $t$ 로 만든다.",
  );
  process.exit(1);
}

// ⚠️ 직접 실행할 때만 쓸기를 돈다 — 다른 도구가 판정 함수를 import 한다.
if (/probe-middle-figure-angles/.test(process.argv[1] ?? "")) main();
