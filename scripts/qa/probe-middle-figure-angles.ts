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
 * ⚠️ **라벨이 문자면 안 본다** — `x`, `a°`, `∠x` 처럼 미지수를 적는 것이 정상이다.
 *    숫자로 못 읽는 라벨은 **판정 대상이 아니다**(못 본 것은 「없다」가 아니다).
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
  const pos = GAUGE.filter((g) => g[2]).length;
  console.log(
    `\n${bad === 0 ? "✅" : "🔴"} 눈금 ${GAUGE.length}건` +
      `${bad === 0 ? " 전부 맞다" : ` 중 ${bad}건 어긋남`}` +
      ` (양성 ${pos} · 음성 ${GAUGE.length - pos})`,
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
        const miss = angleMismatches(spec);
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
