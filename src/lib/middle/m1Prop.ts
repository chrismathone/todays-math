/**
 * 중1 RPM 1-1 「정비례와 반비례」 21 + 「좌표와 그래프」 6 = **27유형** (물결 5B).
 *
 * 이 중단원은 **반쯤 차 있었다** — 「좌표와 그래프」 03·04·05·06·10 은 `m1Book1.ts`,
 * 「정비례와 반비례」 04·14 는 `m1Real.ts` 가 이미 냈다. 이 파일은 **남은 번호만**
 * 낸다(`npx tsx scripts/middle/type-census.ts` 실측 2026-08-24). 발문 말투와
 * `unitSection` 이름은 그 두 모듈에 맞췄다 — 한 시험지에 나란히 실리기 때문이다.
 *
 * 계약(물결 2~4 에서 데인 것들 그대로):
 *  · **답을 먼저 정하고 발문을 만든다.** 반비례는 지나는 점 $(p,q)$ 를 먼저 골라
 *    $a=pq$ 로 잡으므로 상수가 항상 정수다.
 *  · `facts` 에 원 수치를 남기고 **시험이 다른 관계식으로** 답을 다시 유도한다.
 *  · 수는 전부 `$...$` 안에(`bareNumbers` 가드) · `attempt` 가 다 떨어지면 던진다.
 *
 * ## 그림을 어디에 붙였나 — **실렌더로 판단했다**(`qa/probe-5b-*`)
 *
 * 쓰는 kind 는 물결 4A 의 좌표평면 한 벌뿐이다(엔진은 **안 만진다**):
 *   · `linearGraph` — 정비례 05·09·10·23
 *   · `curveGraph`(`inverse`) — 반비례 15·19·20 · 정비례∩반비례 21
 * 던지는 조건이 곧 검산이다 — `marks` 가 그래프 위가 아니면 엔진이 먼저 던진다.
 * 그래서 계수를 역산하다 틀리면 **그림이 먼저 빨개진다.**
 *
 * **「좌표와 그래프」 07·08·09·11 에는 그림을 안 붙였다.** 이유는 취향이 아니라
 * 실렌더다(2026-08-24, `qa/m1-prop-sheet/`):
 *   ⑴ 이 넷은 물통·이동거리처럼 **꺾은선**인데, 좌표평면 한 벌에는 선분·꺾은선
 *      문법이 없다. `lines` 는 범위 경계까지 **끝까지 뻗는 직선**이다.
 *   ⑵ 억지로 `linearGraph` 를 쓰면 `xRange` 가 원점을 품어야 하므로(`_cp_range`)
 *      **시각이 음수인 자리까지 직선이 그려진다** — 렌더는 성공하고 지면에서는
 *      「그럴듯한 오답 그림」이 된다(어설픈 그림은 없는 것보다 나쁘다).
 * 그래서 그 넷은 **그래프의 꺾이는 점을 좌표로 적어 주는** 발문으로 냈다. 학생이
 * 읽어야 하는 것(꺾은선의 모양)은 그대로 남고, 지면에 거짓말이 안 나간다.
 * 엔진에 꺾은선(선분 목록) 문법이 생기는 날 이 넷에 그림을 붙일 수 있다 —
 * 그 요청은 워크트리 코멘트에 적었다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { eulReul, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중1";
const BOOK = "1-1";

/** RPM 색인 정본 바이트 — `scripts/rpm/rpm-type-catalog.json` 실측(전부 U+0020). */
const MINOR_COORD = "좌표와 그래프";
const MINOR_PROP = "정비례와 반비례";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측 2026-08-24) */
const SEC = {
  좌표기본: "순서쌍과 좌표평면(기본)",
  그래프이해: "그래프의 이해",
  정비례: "정비례 관계 y=ax의 그래프",
  반비례: "반비례 관계 y=a/x의 그래프",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts"> & {
  figureSpec?: MidProblem["figureSpec"];
};

function def(
  rpmMinor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `${BOOK}|${rpmMinor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

// ── 소품 ─────────────────────────────────────────────────────────────

/** `+3` / `-3` — 항을 이어 붙일 때. */
function signed(n: number): string {
  return n < 0 ? `-${-n}` : `+${n}`;
}

/** 0 이 아닌 정수. */
function nonZero(rng: Rng, lo: number, hi: number): number {
  return attempt<number>(80, (): number | null => {
    const v = intBetween(rng, lo, hi);
    return v === 0 ? null : v;
  });
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** `ax` 꼴 — $1x$·$-1x$ 는 지면에 나가면 안 된다(계약 9). */
function mono(a: number): string {
  return coef(a, "x");
}

/** 계수 붙은 한 항 — $1k$·$-1k$ 를 $k$·$-k$ 로. 지면에 «1» 이 남으면 안 된다. */
function coef(a: number, sym: string): string {
  if (a === 1) return sym;
  if (a === -1) return `-${sym}`;
  return `${a}${sym}`;
}

/**
 * `a\\times x` 대입 — 계수 $\\pm1$ 은 곱셈 기호를 안 쓰고, **양수에는 괄호를 안 친다.**
 * 「$y=1\\times6$」·「$y=-1\\times(7)$」은 값이 맞고 KaTeX 도 초록이라 어느 가드도
 * 안 울지만, 지면에서는 그냥 틀린 글이다(계약 9).
 */
function evalTex(a: number, x: number, ans: number): string {
  if (a === 1) return `${ans}`;
  if (a === -1) return `-${paren(x)}=${ans}`;
  return `${a}\\times${paren(x)}=${ans}`;
}

/** `\\dfrac{k}{r}=값` — 분모가 $\\pm1$ 이면 분수를 안 쓴다(`\\dfrac{-6}{1}` 금지). */
function fracEval(k: number, r: number): string {
  return Math.abs(r) === 1 ? `${k / r}` : `\\dfrac{${k}}{${r}}=${k / r}`;
}

/** 한가운데 — `\\dfrac{4}{2}` 가 지면에 나가지 않게 약분해 적는다. */
function halfTex(n: number): string {
  return n % 2 === 0 ? `${n / 2}` : `\\dfrac{${n}}{2}`;
}

/**
 * 주격 조사 — 「$(2, -1)$**이**」·「$(2, 4)$**가**」. 규칙을 옮겨 적지 않고
 * 정본(`eulReul`)이 낸 답에서 뒤집는다: 받침이 있으면 «을»이고 «이»다.
 *
 * ⚠️ 괄호로 닫힌 순서쌍도 **읽을 때는 마지막 수**로 끝난다 — 「$(2a-3, b-3)$」 은
 * 「…비 빼기 **삼**」이라 «과»다. `josaFaults` 는 `$...$` 가 **숫자로 끝날 때만**
 * 재므로 이 자리를 구조적으로 못 본다. 그래서 여기서 그 수를 넘겨 정한다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "를" ? "가" : "이";
}

/** 음수는 괄호로 — `\div-3` 같은 지면이 나가지 않게. */
function paren(n: number): string {
  return n < 0 ? `(${n})` : `${n}`;
}

/**
 * 정비례 관계식 `y=(num/den)x` — **기약분수로**, 정수면 분수를 안 쓴다(D-73).
 * 대분수는 만들지 않는다(가분수 그대로 둔다 — 제품이 안 바꾼다).
 */
function propTex(num: number, den: number): string {
  const g = gcd(num, den) || 1;
  const n = num / g;
  const d = den / g;
  if (d === 1) return `y=${mono(n)}`;
  return n < 0 ? `y=-\\dfrac{${-n}}{${d}}x` : `y=\\dfrac{${n}}{${d}}x`;
}

/** 반비례 관계식 `y=a/x` — 음수는 분수 앞에 부호를 뺀다. */
function invTex(a: number): string {
  return a < 0 ? `y=-\\dfrac{${-a}}{x}` : `y=\\dfrac{${a}}{x}`;
}

/** 정비례 그래프가 지나는 사분면(교과 표기). $a$ 의 부호가 전부다. */
function propQuadText(a: number): string {
  return a > 0 ? "제$1$사분면과 제$3$사분면" : "제$2$사분면과 제$4$사분면";
}

// ── 그림 — 물결 4A 좌표평면 한 벌을 **쓰기만** 한다 ─────────────────

type Mark = readonly [number, number];

/** 범위 한 축 — **찍는 점**이 정한다. 원점을 품고 폭 4~12칸(`_cp_range`). */
function bound(vals: readonly number[]): number {
  return Math.min(6, Math.max(2, ...vals.map((v) => Math.abs(v) + 1)));
}

/**
 * 정비례(직선) 그림. 안 찍는 점(문항이 묻는 점)은 범위 밖이어도 된다 —
 * 지면에 없는 점이므로 그림이 거짓말을 하지 않는다.
 */
function linearSpec(
  slopes: readonly number[],
  marks: readonly Mark[],
): Record<string, unknown> {
  return {
    version: "elem-1",
    kind: "linearGraph",
    lines: slopes.map((m) => ({ slope: m, yIntercept: 0 })),
    xRange: [-bound(marks.map((m) => m[0])), bound(marks.map((m) => m[0]))],
    yRange: [-bound(marks.map((m) => m[1])), bound(marks.map((m) => m[1]))],
    marks: marks.map((m) => [m[0], m[1]]),
  };
}

/**
 * 반비례(쌍곡선) 그림. 범위는 **$\pm6$ 에 박는다** — `INV_K` 가 그 범위에서
 * 「두 가지가 다 보이고 축에 안 붙는다」를 만족하도록 골라 둔 값들이다.
 */
function inverseSpec(
  k: number,
  marks: readonly Mark[],
  line?: { num: number; den: number },
): Record<string, unknown> {
  const spec: Record<string, unknown> = {
    version: "elem-1",
    kind: "curveGraph",
    curves: [{ type: "inverse", k }],
    xRange: [-6, 6],
    yRange: [-6, 6],
    marks: marks.map((m) => [m[0], m[1]]),
  };
  if (line) spec.lines = [{ slope: line.num / line.den, yIntercept: 0 }];
  return spec;
}

/**
 * 범위 $\pm6$ 에서 **두 가지가 다 보이고 축에서 0.5칸 이상 떨어지는** $|k|$ 들.
 * 엔진 조건은 $|k|\ge3$ 과 $6-|k|/6\ge1.2$ 이고, 여기에 **격자점이 둘 이상**
 * (=문항이 쓸 점 + 그림이 찍을 점)이라는 조건을 더해 걸렀다.
 * 시험이 이 목록을 **엔진 상수에서 다시 유도해** 대조한다(손 목록 이중화 금지).
 */
export const INV_K = [4, 6, 8, 10, 12, 15, 18, 20, 24] as const;

/** 그림 없는 «대응표» 유형용 — 약수가 많아 표의 빈칸을 정수로 채울 수 있는 수. */
const TABLE_K = [12, 18, 20, 24, 30, 36, 40, 48, 60] as const;

/** $|p|\le6$, $|k/p|\le6$ 인 격자점의 $x$좌표들 — 그림에 찍을 수 있는 점. */
export function invLattice(k: number): number[] {
  const a = Math.abs(k);
  const out: number[] = [];
  for (let p = 1; p <= 6; p += 1) {
    if (a % p === 0 && a / p <= 6) out.push(p);
  }
  return out;
}

// ── 좌표와 그래프 ────────────────────────────────────────────────────

const COORD: TypeEntry[] = [
  def(
    MINOR_COORD,
    "01",
    "순서쌍과 좌표평면 위의 점의 좌표",
    SEC.좌표기본,
    "기본",
    (rng) =>
      attempt<Body>(200, (): Body | null => {
        const a = nonZero(rng, -6, 6);
        const b = nonZero(rng, -6, 6);
        const branch = intBetween(rng, 0, 2);
        if (branch === 2) {
          // 합·차 연립 — 계수형과 **구조가 다르다**.
          const s = a + b;
          const d = a - b;
          if (s === 0 || d === 0) return null;
          return {
            content: `두 순서쌍 $(a-b, ${s})$${waGwa(s)} $(${d}, a+b)$가 서로 같을 때, 순서쌍 $(a, b)$를 구하시오.`,
            answer: `$(${a}, ${b})$`,
            solution:
              `두 순서쌍이 서로 같으므로 $a-b=${d}$, $a+b=${s}$이다.\n` +
              `두 식을 변끼리 더하면 $2a=${d + s}$에서 $a=${a}$이고, 이를 $a+b=${s}$에 대입하면 $b=${b}$이다.\n` +
              `따라서 구하는 순서쌍은 $(${a}, ${b})$이다.`,
            facts: { a, b, s, d, branch, ans: a },
          };
        }
        const c = nonZero(rng, -5, 5);
        const dd = intBetween(rng, 1, 5);
        const u = 2 * a + c;
        const v = b - dd;
        const ans = branch === 0 ? a + b : a * b;
        return {
          content:
            `두 순서쌍 $(2a${signed(c)}, b${signed(-dd)})$${waGwa(dd)} $(${u}, ${v})$${iGa(v)} 서로 같을 때, ` +
            `${branch === 0 ? "$a+b$" : "$ab$"}의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution:
            `두 순서쌍이 서로 같으므로 $2a${signed(c)}=${u}$, $b${signed(-dd)}=${v}$이다.\n` +
            `$2a=${u - c}$에서 $a=${a}$이고, $b=${v}${signed(dd)}=${b}$이다.\n` +
            `따라서 ${branch === 0 ? `$a+b=${a}${signed(b)}=${ans}$` : `$ab=${a}\\times(${b})=${ans}$`}이다.`,
          facts: { a, b, c, d: dd, u, v, branch, ans },
        };
      }),
  ),

  def(
    MINOR_COORD,
    "02",
    "축 또는 축 위의 점의 좌표",
    SEC.좌표기본,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        const t = nonZero(rng, -5, 5); // 정답이 되는 문자의 값 — **먼저 정한다**
        const axis = intBetween(rng, 0, 1); // 0 x축 · 1 y축
        const ask = intBetween(rng, 0, 1); // 0 점의 좌표 · 1 문자의 값
        const r = nonZero(rng, -4, 4);
        const s = -r * t; // 0 이 되는 좌표: r·a + s
        const p = nonZero(rng, -4, 4);
        const q = nonZero(rng, -6, 6);
        const other = p * t + q; // 0 이 아닌 좌표
        if (other === 0) return null;
        if (Math.abs(other) > 20 || Math.abs(s) > 20) return null;
        const zeroTex = `${coef(r, "a")}${signed(s)}`;
        const otherTex = `${coef(p, "a")}${signed(q)}`;
        const xTex = axis === 0 ? otherTex : zeroTex;
        const yTex = axis === 0 ? zeroTex : otherTex;
        const px = axis === 0 ? other : 0;
        const py = axis === 0 ? 0 : other;
        const axisName = axis === 0 ? "$x$축" : "$y$축";
        const solveLine =
          Math.abs(r) === 1
            ? `$a=${t}$이다.`
            : `$${coef(r, "a")}=${-s}$에서 $a=${t}$이다.`;
        const zeroName = axis === 0 ? "$y$좌표" : "$x$좌표";
        const branch = axis * 2 + ask;
        return {
          content:
            `점 $\\mathrm{P}(${xTex}, ${yTex})$${iGa(axis === 0 ? s : q)} ${axisName} 위의 점일 때, ` +
            (ask === 0
              ? "점 $\\mathrm{P}$의 좌표를 구하시오."
              : "$a$의 값을 구하시오."),
          answer: ask === 0 ? `$(${px}, ${py})$` : `$${t}$`,
          solution:
            `${axisName} 위의 점은 ${zeroName}가 $0$이므로 $${zeroTex}=0$이다.\n` +
            (ask === 0
              ? `${solveLine}\n이때 나머지 좌표는 $${otherTex}=${other}$이므로 점 $\\mathrm{P}$의 좌표는 $(${px}, ${py})$이다.`
              : `따라서 ${solveLine}`),
          facts: {
            t,
            axis,
            ask,
            r,
            s,
            p,
            q,
            other,
            branch,
            ans: ask === 0 ? other : t,
          },
        };
      }),
  ),

  def(
    MINOR_COORD,
    "07",
    "상황을 그래프로 나타내기",
    SEC.그래프이해,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        // 아래가 넓고 위가 좁은 그릇 — 처음엔 천천히, 나중엔 빨리 오른다.
        const t1 = intBetween(rng, 3, 8);
        const p = intBetween(rng, 1, 4);
        const q = intBetween(rng, p + 1, 8);
        const h1 = p * t1; // 꺾이는 점의 높이
        const branch = intBetween(rng, 0, 2);
        if (branch === 0) {
          return {
            content:
              `아래쪽은 넓고 위쪽은 좁은 그릇에 일정한 속력으로 물을 넣는다. ` +
              `물을 넣기 시작한 지 $${t1}$분 동안은 물의 높이가 $1$분에 $${p}$ cm씩 높아지고, ` +
              `그 후에는 $1$분에 $${q}$ cm씩 높아진다. 물을 넣기 시작한 지 $x$분 후의 물의 높이를 $y$ cm라 하고 ` +
              `$x$와 $y$ 사이의 관계를 그래프로 나타낼 때, 그래프가 꺾이는 점의 좌표를 구하시오.`,
            answer: `$(${t1}, ${h1})$`,
            solution:
              `물을 넣기 시작한 지 $${t1}$분까지는 $1$분에 $${p}$ cm씩 높아지므로 그때의 물의 높이는 $${p}\\times${t1}=${h1}$ (cm)이다.\n` +
              `그 뒤로는 높아지는 빠르기가 달라지므로 그래프는 이 자리에서 꺾인다.\n` +
              `따라서 꺾이는 점의 좌표는 $(${t1}, ${h1})$이다.`,
            facts: { t1, p, q, h1, branch, ans: h1 },
          };
        }
        if (branch === 1) {
          const t2 = t1 + intBetween(rng, 2, 8);
          const h2 = h1 + q * (t2 - t1);
          return {
            content:
              `아래쪽은 넓고 위쪽은 좁은 그릇에 일정한 속력으로 물을 넣는다. ` +
              `물을 넣기 시작한 지 $${t1}$분 동안은 물의 높이가 $1$분에 $${p}$ cm씩 높아지고, ` +
              `그 후에는 $1$분에 $${q}$ cm씩 높아진다. 물을 넣기 시작한 지 $x$분 후의 물의 높이를 $y$ cm라 할 때, ` +
              `물을 넣기 시작한 지 $${t2}$분 후의 물의 높이를 구하시오.`,
            answer: `$${h2}$ cm`,
            solution:
              `처음 $${t1}$분 동안 높아진 높이는 $${p}\\times${t1}=${h1}$ (cm)이다.\n` +
              `그 뒤 $${t2}-${t1}=${t2 - t1}$ (분) 동안 높아진 높이는 $${q}\\times${t2 - t1}=${q * (t2 - t1)}$ (cm)이다.\n` +
              `따라서 물의 높이는 $${h1}+${q * (t2 - t1)}=${h2}$ (cm)이다.`,
            facts: { t1, p, q, h1, t2, branch, ans: h2 },
          };
        }
        const extra = intBetween(rng, 2, 8);
        const h = h1 + q * extra;
        const t = t1 + extra;
        return {
          content:
            `아래쪽은 넓고 위쪽은 좁은 그릇에 일정한 속력으로 물을 넣는다. ` +
            `물을 넣기 시작한 지 $${t1}$분 동안은 물의 높이가 $1$분에 $${p}$ cm씩 높아지고, ` +
            `그 후에는 $1$분에 $${q}$ cm씩 높아진다. 물을 넣기 시작한 지 $x$분 후의 물의 높이를 $y$ cm라 할 때, ` +
            `물의 높이가 $${h}$ cm가 되는 것은 물을 넣기 시작한 지 몇 분 후인지 구하시오.`,
          answer: `$${t}$분 후`,
          solution:
            `처음 $${t1}$분 동안 높아진 높이는 $${p}\\times${t1}=${h1}$ (cm)이므로 남은 높이는 $${h}-${h1}=${h - h1}$ (cm)이다.\n` +
            `그 뒤로는 $1$분에 $${q}$ cm씩 높아지므로 $${h - h1}\\div${q}=${extra}$ (분)이 더 걸린다.\n` +
            `따라서 $${t1}+${extra}=${t}$ (분) 후이다.`,
          facts: { t1, p, q, h1, h, extra, branch, ans: t },
        };
      }),
  ),

  def(MINOR_COORD, "08", "그래프의 해석", SEC.그래프이해, "응용", (rng) =>
    attempt<Body>(400, (): Body | null => {
      // 속력을 60 의 약수로 잡으면 «분»과 «시속»이 둘 다 정수가 된다.
      const SPEED = [6, 10, 12, 15, 20, 30] as const;
      const d = intBetween(rng, 2, 9);
      const v1 = pick(rng, SPEED);
      const v2 = pick(rng, SPEED);
      if (v1 === v2) return null;
      const t1 = (60 * d) / v1; // 갈 때 걸린 시간(분)
      const back = (60 * d) / v2; // 올 때 걸린 시간(분)
      if (t1 < 10 || t1 > 90 || back < 10 || back > 90) return null;
      const stay = intBetween(rng, 1, 6) * 5;
      const t2 = t1 + stay;
      const t3 = t2 + back;
      const branch = intBetween(rng, 0, 2);
      const head =
        `어떤 사람이 집에서 출발하여 공원까지 갔다가 다시 집으로 돌아왔다. ` +
        `집을 출발한 지 $x$분 후에 집에서 떨어진 거리를 $y$ km라 하면, $x$와 $y$ 사이의 관계를 나타내는 그래프는 ` +
        `네 점 $(0, 0)$, $(${t1}, ${d})$, $(${t2}, ${d})$, $(${t3}, 0)$을 차례로 선분으로 이은 것이다. `;
      if (branch === 0) {
        return {
          content: `${head}이 사람이 공원에 머문 시간은 몇 분인지 구하시오.`,
          answer: `$${stay}$분`,
          solution:
            `공원에 머무는 동안은 집에서 떨어진 거리가 $${d}$ km로 변하지 않으므로 그래프가 가로로 그어진 구간이다.\n` +
            `그 구간은 $x=${t1}$부터 $x=${t2}$까지이다.\n` +
            `따라서 머문 시간은 $${t2}-${t1}=${stay}$ (분)이다.`,
          facts: { d, v1, v2, t1, t2, t3, stay, branch, ans: stay },
        };
      }
      if (branch === 1) {
        return {
          content: `${head}이 사람이 공원에서 집으로 돌아올 때의 속력은 시속 몇 km인지 구하시오.`,
          answer: `시속 $${v2}$ km`,
          solution:
            `돌아올 때는 $x=${t2}$부터 $x=${t3}$까지 $${d}$ km를 갔으므로 걸린 시간은 $${t3}-${t2}=${back}$ (분)이다.\n` +
            `$${back}$분은 $\\dfrac{${back}}{60}$시간이므로 속력은 $${d}\\div\\dfrac{${back}}{60}=${v2}$이다.\n` +
            `따라서 돌아올 때의 속력은 시속 $${v2}$ km이다.`,
          facts: { d, v1, v2, t1, t2, t3, stay, back, branch, ans: v2 },
        };
      }
      return {
        content: `${head}이 사람이 집에서 공원까지 갈 때의 속력은 시속 몇 km인지 구하시오.`,
        answer: `시속 $${v1}$ km`,
        solution:
          `집에서 공원까지는 $x=0$부터 $x=${t1}$까지 $${d}$ km를 갔으므로 걸린 시간은 $${t1}$분이다.\n` +
          `$${t1}$분은 $\\dfrac{${t1}}{60}$시간이므로 속력은 $${d}\\div\\dfrac{${t1}}{60}=${v1}$이다.\n` +
          `따라서 갈 때의 속력은 시속 $${v1}$ km이다.`,
        facts: { d, v1, v2, t1, t2, t3, stay, branch, ans: v1 },
      };
    }),
  ),

  def(
    MINOR_COORD,
    "09",
    "주기적 변화를 나타내는 그래프",
    SEC.그래프이해,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        const half = intBetween(rng, 3, 10);
        const period = 2 * half;
        const low = intBetween(rng, 1, 5);
        const high = low + intBetween(rng, 4, 12) * 5;
        // 갈래는 둘이다. 「탄 지 $x$분 후의 높이」 갈래는 **뺐다**(원장님 결정 ㈏, 2026-09-27) —
        // $x$ 가 늘 최고점이나 출발점과 같은 때라 답이 언제나 아래 머리에 적힌 높이였다
        // (씨앗 1,000 중 32.4%, `census-middle-degenerate.ts` 「답이 발문에 그대로」).
        const branch = intBetween(rng, 0, 1);
        const head =
          `어떤 대관람차가 일정한 속력으로 돌고 있다. 대관람차에 탄 지 $x$분 후의 지면으로부터의 높이를 $y$ m라 하면, ` +
          `$y$의 값은 $${period}$분마다 같은 변화를 되풀이한다. 탄 지 $${half}$분 후에 가장 높은 $${high}$ m에 이르고, ` +
          `$${period}$분 후에 처음 높이인 $${low}$ m로 돌아온다. `;
        if (branch === 0) {
          const k = intBetween(rng, 2, 6);
          const ans = half + (k - 1) * period;
          return {
            content: `${head}$${k}$번째로 가장 높은 지점에 이르는 것은 탄 지 몇 분 후인지 구하시오.`,
            answer: `$${ans}$분 후`,
            solution:
              `가장 높은 지점에 처음 이르는 것은 탄 지 $${half}$분 후이고, 그 뒤로는 $${period}$분마다 되풀이된다.\n` +
              `따라서 $${k}$번째는 $${half}+${period}\\times(${k}-1)=${ans}$ (분) 후이다.`,
            facts: { half, period, low, high, k, branch, ans },
          };
        }
        const m = intBetween(rng, 2, 6);
        const total = m * period;
        return {
          content: `${head}대관람차에 탄 지 $${total}$분 동안 가장 높은 지점을 몇 번 지나는지 구하시오.`,
          answer: `$${m}$번`,
          solution:
            `가장 높은 지점을 지나는 것은 탄 지 $${half}$분 후부터 $${period}$분마다이므로 $${half}$분, $${half + period}$분, $\\ldots$ 후이다.\n` +
            `$${total}$분까지 이 중 몇 개가 있는지 세면 $${m}$개이다.\n` +
            `따라서 가장 높은 지점을 $${m}$번 지난다.`,
          facts: { half, period, low, high, m, total, branch, ans: m },
        };
      }),
  ),

  def(
    MINOR_COORD,
    "11",
    "그래프의 해석 두 그래프의 비교",
    SEC.그래프이해,
    "심화하",
    (rng) =>
      attempt<Body>(500, (): Body | null => {
        const SPEED = [6, 10, 12, 15, 20, 30] as const;
        const bigD = intBetween(rng, 4, 12);
        const d1 = intBetween(rng, 1, bigD - 1);
        const v1 = pick(rng, SPEED); // 형의 첫 구간
        const v2 = pick(rng, SPEED); // 형의 둘째 구간
        const vA = pick(rng, SPEED); // 동생(일정한 속력)
        if (v1 === v2) return null;
        const t1 = (60 * d1) / v1;
        const seg2 = (60 * (bigD - d1)) / v2;
        const tB = t1 + seg2;
        const tA = (60 * bigD) / vA;
        if (tA <= tB) return null; // 형이 먼저 도착해야 «몇 분 먼저»가 성립한다
        if (t1 < 5 || seg2 < 5 || tA > 180 || tB > 180) return null;
        const branch = intBetween(rng, 0, 2);
        const head =
          `형과 동생이 집에서 동시에 출발하여 같은 길로 $${bigD}$ km 떨어진 도서관까지 갔다. ` +
          `출발한 지 $x$분 후에 집에서 떨어진 거리를 $y$ km라 할 때, ` +
          `동생의 그래프는 두 점 $(0, 0)$, $(${tA}, ${bigD})$${eulReul(bigD)} 이은 선분이고, ` +
          `형의 그래프는 세 점 $(0, 0)$, $(${t1}, ${d1})$, $(${tB}, ${bigD})$${eulReul(bigD)} 차례로 선분으로 이은 것이다. `;
        if (branch === 0) {
          const ans = tA - tB;
          return {
            content: `${head}형은 동생보다 몇 분 먼저 도서관에 도착하였는지 구하시오.`,
            answer: `$${ans}$분`,
            solution:
              `그래프에서 형이 도서관에 도착한 것은 출발한 지 $${tB}$분 후이고, 동생은 $${tA}$분 후이다.\n` +
              `따라서 형이 $${tA}-${tB}=${ans}$ (분) 먼저 도착하였다.`,
            facts: { bigD, d1, v1, v2, vA, t1, tB, tA, branch, ans },
          };
        }
        if (branch === 1) {
          return {
            content: `${head}형이 출발한 지 $${t1}$분 후부터 도서관에 도착할 때까지의 속력은 시속 몇 km인지 구하시오.`,
            answer: `시속 $${v2}$ km`,
            solution:
              `형은 출발한 지 $${t1}$분 후부터 $${tB}$분 후까지 $${bigD}-${d1}=${bigD - d1}$ (km)를 갔다.\n` +
              `걸린 시간은 $${tB}-${t1}=${seg2}$ (분), 즉 $\\dfrac{${seg2}}{60}$시간이므로 속력은 $${bigD - d1}\\div\\dfrac{${seg2}}{60}=${v2}$이다.\n` +
              `따라서 시속 $${v2}$ km이다.`,
            facts: { bigD, d1, v1, v2, vA, t1, tB, tA, seg2, branch, ans: v2 },
          };
        }
        // 평균 속력이 정수로 떨어지지 않으면 낸다 — 지면에 소수가 나가면 안 된다.
        if ((60 * bigD) % tB !== 0) return null;
        return {
          content: `${head}형과 동생 중 집에서 도서관까지 가는 데 걸린 시간이 더 짧은 사람의 평균 속력은 시속 몇 km인지 구하시오.`,
          answer: `시속 $${(60 * bigD) / tB}$ km`,
          solution:
            `형은 $${tB}$분, 동생은 $${tA}$분이 걸렸으므로 형이 더 짧다.\n` +
            `형은 $${bigD}$ km를 $\\dfrac{${tB}}{60}$시간 동안 갔으므로 평균 속력은 $${bigD}\\div\\dfrac{${tB}}{60}=${(60 * bigD) / tB}$이다.\n` +
            `따라서 시속 $${(60 * bigD) / tB}$ km이다.`,
          facts: {
            bigD,
            d1,
            v1,
            v2,
            vA,
            t1,
            tB,
            tA,
            branch,
            ans: (60 * bigD) / tB,
          },
        };
      }),
  ),
];

// ── 정비례 ───────────────────────────────────────────────────────────

const PROP: TypeEntry[] = [
  def(MINOR_PROP, "01", "정비례 관계", SEC.정비례, "기본", (rng) =>
    attempt<Body>(300, (): Body | null => {
      const a = nonZero(rng, -6, 6);
      const branch = intBetween(rng, 0, 1);
      if (branch === 0) {
        const [x1, x2, x3] = [
          intBetween(rng, 1, 3),
          intBetween(rng, 4, 6),
          intBetween(rng, 7, 9),
        ];
        const y1 = a * x1;
        const bigA = a * x2;
        const y3 = a * x3;
        const ans = bigA + x3;
        return {
          content:
            `$y$가 $x$에 정비례하고, $x=${x1}$일 때 $y=${y1}$, $x=${x2}$일 때 $y=A$, ` +
            `$x=B$일 때 $y=${y3}$이다. 이때 $A+B$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution:
            `$y$가 $x$에 정비례하므로 $\\dfrac{y}{x}$의 값이 일정하고, 그 값은 $${fracEval(y1, x1)}$이다.\n` +
            `$x=${x2}$일 때 $A=${a}\\times${x2}=${bigA}$이고, $y=${y3}$일 때 $B=${y3}\\div${paren(a)}=${x3}$이다.\n` +
            `따라서 $A+B=${bigA}${signed(x3)}=${ans}$이다.`,
          facts: { a, x1, y1, x2, bigA, x3, y3, branch, ans },
        };
      }
      const p = intBetween(rng, 2, 6);
      const q = a * p;
      const k = intBetween(rng, 2, 5);
      const ans = k * q;
      return {
        content:
          `$y$가 $x$에 정비례하고 $x=${p}$일 때 $y=${q}$이다. ` +
          `$x=${k * p}$일 때 $y$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `$y$가 $x$에 정비례하면 $x$의 값이 $${k}$배가 될 때 $y$의 값도 $${k}$배가 된다.\n` +
          `$${k * p}=${p}\\times${k}$이므로 구하는 $y$의 값은 $${q}\\times${k}=${ans}$이다.`,
        facts: { a, p, q, k, branch, ans },
      };
    }),
  ),

  def(MINOR_PROP, "02", "정비례 관계의 식 구하기", SEC.정비례, "기본", (rng) =>
    attempt<Body>(300, (): Body | null => {
      const a = nonZero(rng, -6, 6);
      const p = intBetween(rng, 2, 8);
      const q = a * p;
      const branch = intBetween(rng, 0, 2);
      const head = `$y$가 $x$에 정비례하고 $x=${p}$일 때 $y=${q}$이다. `;
      const setup =
        `$y$가 $x$에 정비례하므로 $y=ax$로 놓으면 $${q}=a\\times${p}$에서 $a=${a}$이다.\n` +
        `즉 $${propTex(a, 1)}$이다.\n`;
      if (branch === 0) {
        return {
          content: `${head}$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
          answer: `$${propTex(a, 1)}$`,
          solution: `${setup}따라서 구하는 식은 $${propTex(a, 1)}$이다.`,
          facts: { a, p, q, branch, ans: a },
        };
      }
      if (branch === 1) {
        const r = nonZero(rng, -9, 9);
        const ans = a * r;
        return {
          content: `${head}$x=${r}$일 때 $y$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `${setup}$x=${r}$${eulReul(r)} 대입하면 $y=${evalTex(a, r, ans)}$이다.`,
          facts: { a, p, q, r, branch, ans },
        };
      }
      const x0 = nonZero(rng, -9, 9);
      const s = a * x0;
      return {
        content: `${head}$y=${s}$일 때 $x$의 값을 구하시오.`,
        answer: `$${x0}$`,
        solution: `${setup}$y=${s}$${eulReul(s)} 대입하면 $${s}=${mono(a)}$에서 $x=${x0}$이다.`,
        facts: { a, p, q, s, branch, ans: x0 },
      };
    }),
  ),

  def(
    MINOR_PROP,
    "03",
    "정비례 관계 의 활용 와 사이의 관계를 나타내는 식 구하기",
    SEC.정비례,
    "응용",
    (rng) =>
      attempt<Body>(200, (): Body | null => {
        const sc = intBetween(rng, 0, 3);
        const c = intBetween(rng, 2, 15);
        const SCENES = [
          {
            content:
              `$1$분에 $${c}$ L씩 물이 나오는 수도로 빈 물통에 물을 받는다. ` +
              `물을 받기 시작한 지 $x$분 후까지 받은 물의 양을 $y$ L라 할 때, $x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `$1$분에 $${c}$ L씩 받으므로 $x$분 동안 받은 물의 양은 $${c}\\times x$ (L)이다.\n` +
              `따라서 $${propTex(c, 1)}$이다.`,
          },
          {
            content:
              `한 개의 무게가 $${c}$ g인 구슬이 있다. 이 구슬 $x$개의 무게를 $y$ g이라 할 때, ` +
              `$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `구슬 한 개의 무게가 $${c}$ g이므로 $x$개의 무게는 $${c}\\times x$ (g)이다.\n` +
              `따라서 $${propTex(c, 1)}$이다.`,
          },
          {
            content:
              `시속 $${c * 4}$ km로 일정하게 달리는 자동차가 있다. 이 자동차가 $x$시간 동안 달린 거리를 $y$ km라 할 때, ` +
              `$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `$1$시간에 $${c * 4}$ km를 달리므로 $x$시간 동안 달린 거리는 $${c * 4}\\times x$ (km)이다.\n` +
              `따라서 $${propTex(c * 4, 1)}$이다.`,
          },
          {
            content:
              `휘발유 $1$ L로 $${c}$ km를 달리는 자동차가 있다. 이 자동차가 휘발유 $x$ L로 달릴 수 있는 거리를 $y$ km라 할 때, ` +
              `$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `휘발유 $1$ L로 $${c}$ km를 달리므로 $x$ L로는 $${c}\\times x$ (km)를 달린다.\n` +
              `따라서 $${propTex(c, 1)}$이다.`,
          },
        ] as const;
        const a = sc === 2 ? c * 4 : c;
        const s = SCENES[sc]!;
        return {
          content: s.content,
          answer: `$${propTex(a, 1)}$`,
          solution: s.solution,
          facts: { sc, c, a, branch: sc, ans: a },
        };
      }),
  ),

  def(MINOR_PROP, "05", "정비례 관계 의 그래프", SEC.정비례, "기본", (rng) =>
    attempt<Body>(300, (): Body | null => {
      const a = nonZero(rng, -5, 5);
      const m = intBetween(rng, 1, 5); // 그림이 찍는 점의 $x$좌표
      if (Math.abs(a * m) > 6) return null;
      const p = nonZero(rng, -9, 9);
      if (p === m) return null;
      const ans = a * p;
      return {
        content:
          `정비례 관계 $${propTex(a, 1)}$의 그래프는 오른쪽 그림과 같이 원점과 점 $(${m}, ${a * m})$${eulReul(a * m)} 지나는 직선이다. ` +
          `이 그래프 위의 점 중 $x$좌표가 $${p}$인 점의 $y$좌표를 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `그래프 위의 점에서는 $${propTex(a, 1)}$이 성립한다.\n` +
          `$x=${p}$${eulReul(p)} 대입하면 $y=${evalTex(a, p, ans)}$이다.`,
        facts: { a, num: a, den: 1, m, p, branch: 0, ans },
        figureSpec: linearSpec([a], [[m, a * m]]),
      };
    }),
  ),

  def(
    MINOR_PROP,
    "06",
    "정비례 관계 의 그래프와 의 절댓값 사이의 관계",
    SEC.정비례,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        const mags = [1, 2, 3, 4, 5, 6];
        const chosen: number[] = [];
        for (let i = 0; i < 4; i += 1) {
          const idx = intBetween(rng, 0, mags.length - 1);
          chosen.push(mags.splice(idx, 1)[0]!);
        }
        const list = chosen.map((v) => (intBetween(rng, 0, 1) === 1 ? v : -v));
        const branch = intBetween(rng, 0, 1);
        const target = branch === 0 ? Math.max(...chosen) : Math.min(...chosen);
        const ansA = list.find((v) => Math.abs(v) === target)!;
        const near = branch === 0 ? "$y$축" : "$x$축";
        return {
          content:
            `네 정비례 관계 $${propTex(list[0]!, 1)}$, $${propTex(list[1]!, 1)}$, $${propTex(list[2]!, 1)}$, $${propTex(list[3]!, 1)}$의 그래프 중 ` +
            `${near}에 가장 가까운 것의 식을 구하시오.`,
          answer: `$${propTex(ansA, 1)}$`,
          solution:
            `정비례 관계 $y=ax$의 그래프는 $a$의 절댓값이 클수록 $y$축에 가깝고, 작을수록 $x$축에 가깝다.\n` +
            `네 식의 $a$의 절댓값은 각각 $${Math.abs(list[0]!)}$, $${Math.abs(list[1]!)}$, $${Math.abs(list[2]!)}$, $${Math.abs(list[3]!)}$이므로 ` +
            `${branch === 0 ? "가장 큰" : "가장 작은"} 것은 $${target}$이다.\n` +
            `따라서 구하는 식은 $${propTex(ansA, 1)}$이다.`,
          facts: {
            a0: list[0]!,
            a1: list[1]!,
            a2: list[2]!,
            a3: list[3]!,
            branch,
            ans: ansA,
          },
        };
      }),
  ),

  def(
    MINOR_PROP,
    "07",
    "정비례 관계 의 그래프가 지나는 점",
    SEC.정비례,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        const a = nonZero(rng, -6, 6);
        const branch = intBetween(rng, 0, 2);
        if (branch === 2) {
          const p = nonZero(rng, -8, 8);
          const q = a * p;
          return {
            content: `정비례 관계 $y=ax$의 그래프가 점 $(${p}, ${q})$${eulReul(q)} 지날 때, 상수 $a$의 값을 구하시오.`,
            answer: `$${a}$`,
            solution:
              `그래프가 점 $(${p}, ${q})$${eulReul(q)} 지나므로 $y=ax$에 $x=${p}$, $y=${q}$${eulReul(q)} 대입하면\n` +
              `$${q}=a\\times${paren(p)}$에서 $a=${a}$이다.`,
            facts: { a, p, q, branch, ans: a },
          };
        }
        const m = nonZero(rng, -8, 8);
        const k = a * m;
        if (branch === 0) {
          return {
            content: `정비례 관계 $${propTex(a, 1)}$의 그래프가 점 $(${m}, t)$를 지날 때, $t$의 값을 구하시오.`,
            answer: `$${k}$`,
            solution:
              `그래프가 점 $(${m}, t)$를 지나므로 $${propTex(a, 1)}$에 $x=${m}$${eulReul(m)} 대입하면\n` +
              `$t=${evalTex(a, m, k)}$이다.`,
            facts: { a, m, k, branch, ans: k },
          };
        }
        return {
          content: `정비례 관계 $${propTex(a, 1)}$의 그래프가 점 $(t, ${k})$${eulReul(k)} 지날 때, $t$의 값을 구하시오.`,
          answer: `$${m}$`,
          solution:
            `그래프가 점 $(t, ${k})$${eulReul(k)} 지나므로 $${propTex(a, 1)}$에 $y=${k}$${eulReul(k)} 대입하면\n` +
            `$${k}=${coef(a, "t")}$에서 $t=${m}$이다.`,
          facts: { a, m, k, branch, ans: m },
        };
      }),
  ),

  def(
    MINOR_PROP,
    "08",
    "정비례 관계 의 그래프의 성질",
    SEC.정비례,
    "기본",
    (rng) => {
      const a = nonZero(rng, -6, 6);
      const branch = intBetween(rng, 0, 2);
      if (branch === 0) {
        return {
          content: `정비례 관계 $${propTex(a, 1)}$의 그래프는 제 몇 사분면을 지나는지 구하시오.`,
          answer: propQuadText(a),
          solution:
            `정비례 관계 $y=ax$의 그래프는 원점을 지나는 직선이고, ` +
            `$a>0$이면 제$1$사분면과 제$3$사분면을, $a<0$이면 제$2$사분면과 제$4$사분면을 지난다.\n` +
            `$a=${a}$이므로 $a${a > 0 ? ">" : "<"}0$이다.\n` +
            `따라서 그래프는 ${propQuadText(a)}을 지난다.`,
          facts: { a, branch, ans: a > 0 ? 1 : 2 },
        };
      }
      if (branch === 1) {
        return {
          content: `정비례 관계 $${propTex(a, 1)}$의 그래프에서 $x$의 값이 증가할 때 $y$의 값은 어떻게 변하는지 구하시오.`,
          answer: a > 0 ? "증가한다." : "감소한다.",
          solution:
            `정비례 관계 $y=ax$의 그래프는 $a>0$이면 오른쪽 위로 향하는 직선이고, $a<0$이면 오른쪽 아래로 향하는 직선이다.\n` +
            `$a=${a}$이므로 $a${a > 0 ? ">" : "<"}0$이다.\n` +
            `따라서 $x$의 값이 증가하면 $y$의 값은 ${a > 0 ? "증가한다" : "감소한다"}.`,
          facts: { a, branch, ans: a > 0 ? 1 : 0 },
        };
      }
      const pos = a > 0;
      return {
        content: `정비례 관계 $y=ax$의 그래프가 ${propQuadText(a)}을 지날 때, 상수 $a$의 부호를 구하시오.`,
        answer: pos ? "$a>0$" : "$a<0$",
        solution:
          `정비례 관계 $y=ax$의 그래프는 원점을 지나는 직선이고, 지나는 사분면은 $a$의 부호가 정한다.\n` +
          `${propQuadText(a)}을 지나는 것은 $a${pos ? ">" : "<"}0$일 때이다.\n` +
          `따라서 $a${pos ? ">" : "<"}0$이다.`,
        facts: { a, branch, ans: pos ? 1 : 0 },
      };
    },
  ),

  def(
    MINOR_PROP,
    "09",
    "정비례 관계의 그래프가 주어진 경우",
    SEC.정비례,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        const a = nonZero(rng, -5, 5);
        const p = nonZero(rng, -5, 5);
        const q = a * p;
        // 원점 바로 옆에 찍으면 안내선과 숫자가 «O» 와 뭉친다(실렌더로 확인).
        if (Math.abs(p) < 2 || Math.abs(q) < 2) return null;
        if (Math.abs(q) > 6) return null;
        const branch = intBetween(rng, 0, 1);
        const head = `오른쪽 그림과 같이 정비례 관계의 그래프가 원점과 점 $(${p}, ${q})$${eulReul(q)} 지나는 직선일 때, `;
        const setup =
          `그래프가 원점을 지나는 직선이므로 $y=ax$로 놓을 수 있다.\n` +
          `점 $(${p}, ${q})$${eulReul(q)} 지나므로 $${q}=a\\times${paren(p)}$에서 $a=${a}$, 즉 $${propTex(a, 1)}$이다.\n`;
        if (branch === 0) {
          return {
            content: `${head}$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            answer: `$${propTex(a, 1)}$`,
            solution: `${setup}따라서 구하는 식은 $${propTex(a, 1)}$이다.`,
            facts: { a, num: a, den: 1, p, q, branch, ans: a },
            figureSpec: linearSpec([a], [[p, q]]),
          };
        }
        const r = nonZero(rng, -9, 9);
        if (r === p) return null;
        const ans = a * r;
        return {
          content: `${head}이 그래프가 점 $(${r}, k)$를 지난다고 한다. $k$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `${setup}$x=${r}$${eulReul(r)} 대입하면 $k=${evalTex(a, r, ans)}$이다.`,
          facts: { a, num: a, den: 1, p, q, r, branch, ans },
          figureSpec: linearSpec([a], [[p, q]]),
        };
      }),
  ),

  def(
    MINOR_PROP,
    "10",
    "정비례 관계 의 그래프와 도형의 넓이",
    SEC.정비례,
    "심화하",
    (rng) =>
      attempt<Body>(400, (): Body | null => {
        // 기울기를 «정수 셋»으로만 두면 조합이 여덟뿐이라 같은 문항이 되풀이된다.
        // 분모를 허용해 넓히되, 찍는 점 $(p,\ q)$ 는 여전히 격자점이다.
        const den = pick(rng, [1, 1, 1, 2, 3] as const);
        const num = intBetween(rng, 1, 3);
        if (gcd(num, den) !== 1) return null;
        const p = intBetween(rng, 2, 6);
        if (p % den !== 0) return null;
        const q = (num * p) / den;
        if (q < 1 || q > 6) return null;
        if ((p * q) % 2 !== 0) return null;
        const branch = intBetween(rng, 0, 1);
        const tri = (p * q) / 2;
        const eq = propTex(num, den);
        const plug =
          den === 1
            ? evalTex(num, p, q)
            : `\\dfrac{${num}}{${den}}\\times${p}=${q}`;
        if (branch === 0) {
          return {
            content:
              `오른쪽 그림과 같이 정비례 관계 $${eq}$의 그래프 위의 점 $\\mathrm{P}$의 $x$좌표가 $${p}$이다. ` +
              `점 $\\mathrm{P}$에서 $x$축에 내린 수선의 발을 $\\mathrm{H}$라 할 때, 삼각형 $\\mathrm{POH}$의 넓이를 구하시오. ` +
              `(단, $\\mathrm{O}$는 원점이다.)`,
            answer: `$${tri}$`,
            solution:
              `점 $\\mathrm{P}$는 그래프 위의 점이므로 $x=${p}$${eulReul(p)} 대입하면 $y=${plug}$, 즉 $\\mathrm{P}(${p}, ${q})$이다.\n` +
              `수선의 발은 $\\mathrm{H}(${p}, 0)$이므로 $\\overline{\\mathrm{OH}}=${p}$, $\\overline{\\mathrm{PH}}=${q}$이다.\n` +
              `따라서 삼각형 $\\mathrm{POH}$의 넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}=${tri}$이다.`,
            facts: { num, den, p, q, branch, ans: tri },
            figureSpec: linearSpec([num / den], [[p, q]]),
          };
        }
        return {
          content:
            `오른쪽 그림과 같이 정비례 관계 $${eq}$의 그래프 위의 점 $\\mathrm{P}$의 $x$좌표가 $${p}$이다. ` +
            `점 $\\mathrm{P}$에서 $x$축, $y$축에 내린 수선의 발을 각각 $\\mathrm{A}$, $\\mathrm{B}$라 할 때, ` +
            `직사각형 $\\mathrm{OAPB}$의 넓이를 구하시오. (단, $\\mathrm{O}$는 원점이다.)`,
          answer: `$${p * q}$`,
          solution:
            `점 $\\mathrm{P}$는 그래프 위의 점이므로 $x=${p}$${eulReul(p)} 대입하면 $y=${plug}$, 즉 $\\mathrm{P}(${p}, ${q})$이다.\n` +
            `$\\overline{\\mathrm{OA}}=${p}$, $\\overline{\\mathrm{OB}}=${q}$이다.\n` +
            `따라서 직사각형 $\\mathrm{OAPB}$의 넓이는 $${p}\\times${q}=${p * q}$이다.`,
          facts: { num, den, p, q, branch, ans: p * q },
          figureSpec: linearSpec([num / den], [[p, q]]),
        };
      }),
  ),

  def(
    MINOR_PROP,
    "22",
    "도형의 넓이를 이등분하는 직선",
    SEC.정비례,
    "심화하",
    (rng) =>
      attempt<Body>(400, (): Body | null => {
        const branch = intBetween(rng, 0, 2);
        if (branch === 0) {
          const w = intBetween(rng, 2, 9);
          const h = intBetween(rng, 2, 9);
          return {
            content:
              `좌표평면 위에 네 점 $\\mathrm{O}(0, 0)$, $\\mathrm{A}(${w}, 0)$, $\\mathrm{B}(${w}, ${h})$, $\\mathrm{C}(0, ${h})$${eulReul(h)} ` +
              `꼭짓점으로 하는 직사각형이 있다. 원점을 지나면서 이 직사각형의 넓이를 이등분하는 직선의 식을 구하시오.`,
            answer: `$${propTex(h, w)}$`,
            solution:
              `직사각형의 넓이를 이등분하는 직선은 두 대각선의 교점, 즉 직사각형의 중심을 지난다.\n` +
              `중심은 $\\mathrm{O}$와 $\\mathrm{B}$의 한가운데인 점 $\\left(${halfTex(w)}, ${halfTex(h)}\\right)$이다.\n` +
              `원점을 지나므로 $y=ax$로 놓고 이 점을 대입하면 $a=${h}\\div${w}$이다.\n` +
              `따라서 구하는 직선의 식은 $${propTex(h, w)}$이다.`,
            facts: { w, h, branch, num: h / gcd(h, w), den: w / gcd(h, w) },
          };
        }
        if (branch === 1) {
          const x1 = intBetween(rng, 1, 5);
          const x2 = x1 + intBetween(rng, 1, 5);
          const y1 = intBetween(rng, 1, 5);
          const y2 = y1 + intBetween(rng, 1, 5);
          const num = y1 + y2;
          const den = x1 + x2;
          return {
            content:
              `좌표평면 위에 네 점 $\\mathrm{A}(${x1}, ${y1})$, $\\mathrm{B}(${x2}, ${y1})$, $\\mathrm{C}(${x2}, ${y2})$, $\\mathrm{D}(${x1}, ${y2})$${eulReul(y2)} ` +
              `꼭짓점으로 하는 직사각형이 있다. 원점을 지나면서 이 직사각형의 넓이를 이등분하는 직선의 식을 구하시오.`,
            answer: `$${propTex(num, den)}$`,
            solution:
              `직사각형의 넓이를 이등분하는 직선은 직사각형의 중심을 지난다.\n` +
              `중심은 $\\mathrm{A}$와 $\\mathrm{C}$의 한가운데인 점 $\\left(${halfTex(den)}, ${halfTex(num)}\\right)$이다.\n` +
              `원점을 지나므로 $y=ax$로 놓고 이 점을 대입하면 $a=${num}\\div${den}$이다.\n` +
              `따라서 구하는 직선의 식은 $${propTex(num, den)}$이다.`,
            facts: {
              x1,
              x2,
              y1,
              y2,
              branch,
              num: num / gcd(num, den),
              den: den / gcd(num, den),
            },
          };
        }
        const w = intBetween(rng, 2, 9);
        const h = intBetween(rng, 2, 9);
        const num = h;
        const den = 2 * w;
        return {
          content:
            `좌표평면 위에 세 점 $\\mathrm{O}(0, 0)$, $\\mathrm{A}(${w}, 0)$, $\\mathrm{B}(${w}, ${h})$${eulReul(h)} 꼭짓점으로 하는 삼각형이 있다. ` +
            `원점을 지나면서 이 삼각형의 넓이를 이등분하는 직선의 식을 구하시오.`,
          answer: `$${propTex(num, den)}$`,
          solution:
            `꼭짓점 $\\mathrm{O}$를 지나는 직선이 삼각형의 넓이를 이등분하려면 마주 보는 변 $\\mathrm{AB}$의 중점을 지나야 한다.\n` +
            `그 중점은 점 $\\left(${w}, ${halfTex(h)}\\right)$이다.\n` +
            `원점을 지나므로 $y=ax$로 놓고 이 점을 대입하면 $a=${halfTex(h)}\\div${w}$이다.\n` +
            `따라서 구하는 직선의 식은 $${propTex(num, den)}$이다.`,
          facts: {
            w,
            h,
            branch,
            num: num / gcd(num, den),
            den: den / gcd(num, den),
          },
        };
      }),
  ),

  def(
    MINOR_PROP,
    "23",
    "두 정비례 관계의 그래프 비교하기",
    SEC.정비례,
    "응용",
    (rng) =>
      attempt<Body>(400, (): Body | null => {
        const magA = intBetween(rng, 1, 5);
        const magB = intBetween(rng, 1, 5);
        // 「$3$ 과 $4$」는 지면에서 두 직선이 겹쳐 보인다 — 실렌더로 확인하고 벌렸다
        // (`qa/m1-prop-sheet/`). 어느 쪽이 $y$축에 가까운지 **눈으로** 갈려야 한다.
        if (Math.abs(magA - magB) < 2) return null;
        const sa = intBetween(rng, 0, 1) === 1 ? 1 : -1;
        const sb = intBetween(rng, 0, 1) === 1 ? 1 : -1;
        const a = sa * magA;
        const b = sb * magB;
        const pa = intBetween(rng, 1, 5);
        const pb = intBetween(rng, 1, 5);
        if (Math.abs(a * pa) > 6 || Math.abs(b * pb) > 6) return null;
        // 두 점의 $x$좌표가 같으면 세로 안내선이 겹쳐 어느 점이 어느 직선인지 안 갈린다.
        if (pa === pb) return null;
        const branch = intBetween(rng, 0, 1);
        const nearY = branch === 0;
        const win = nearY ? (magA > magB ? a : b) : magA < magB ? a : b;
        const winName = win === a ? "$y=ax$" : "$y=bx$";
        return {
          content:
            `오른쪽 그림과 같이 두 정비례 관계 $y=ax$, $y=bx$의 그래프가 각각 점 $(${pa}, ${a * pa})$, 점 $(${pb}, ${b * pb})$${eulReul(b * pb)} 지난다. ` +
            `두 그래프 중 ${nearY ? "$y$축" : "$x$축"}에 더 가까운 것을 $y=ax$, $y=bx$ 중에서 고르시오.`,
          answer: winName,
          solution:
            `$y=ax$의 그래프가 점 $(${pa}, ${a * pa})$${eulReul(a * pa)} 지나므로 $a=${a}$이고, ` +
            `$y=bx$의 그래프가 점 $(${pb}, ${b * pb})$${eulReul(b * pb)} 지나므로 $b=${b}$이다.\n` +
            `$|a|=${magA}$, $|b|=${magB}$이고, 정비례 관계의 그래프는 계수의 절댓값이 클수록 $y$축에 가깝다.\n` +
            `따라서 ${nearY ? "$y$축" : "$x$축"}에 더 가까운 것은 ${winName}이다.`,
          facts: { a, b, pa, pb, branch, ans: win },
          figureSpec: linearSpec(
            [a, b],
            [
              [pa, a * pa],
              [pb, b * pb],
            ],
          ),
        };
      }),
  ),
];

// ── 반비례 ───────────────────────────────────────────────────────────

const INV: TypeEntry[] = [
  def(MINOR_PROP, "11", "반비례 관계", SEC.반비례, "기본", (rng) =>
    attempt<Body>(400, (): Body | null => {
      // 이 유형은 **그림이 없다** — 그래서 `INV_K`(그림이 되는 $k$)에 매이지 않고
      // 약수가 많은 수를 쓴다. 그림 있는 유형과 문턱을 같이 쓰면 표가 셋뿐이 된다.
      const abs = pick(rng, TABLE_K);
      const k = abs * (intBetween(rng, 0, 1) === 1 ? 1 : -1);
      const branch = intBetween(rng, 0, 1);
      const divisors = (n: number) => {
        const out: number[] = [];
        for (let d = 1; d <= 12; d += 1) if (n % d === 0) out.push(d);
        return out;
      };
      if (branch === 0) {
        const div = divisors(abs);
        if (div.length < 3) return null;
        const idx: number[] = [];
        const pool = [...div];
        for (let i = 0; i < 3; i += 1) {
          idx.push(pool.splice(intBetween(rng, 0, pool.length - 1), 1)[0]!);
        }
        const [x1, x2, x3] = idx.sort((u, v) => u - v) as [
          number,
          number,
          number,
        ];
        const y1 = k / x1;
        const bigA = k / x2;
        const y3 = k / x3;
        const ans = bigA + x3;
        return {
          content:
            `$y$가 $x$에 반비례하고, $x=${x1}$일 때 $y=${y1}$, $x=${x2}$일 때 $y=A$, ` +
            `$x=B$일 때 $y=${y3}$이다. 이때 $A+B$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution:
            `$y$가 $x$에 반비례하므로 $xy$의 값이 일정하고, 그 값은 $${x1}\\times${paren(y1)}=${k}$이다.\n` +
            `$x=${x2}$일 때 $A=${k}\\div${x2}=${bigA}$이고, $y=${y3}$일 때 $B=${k}\\div${paren(y3)}=${x3}$이다.\n` +
            `따라서 $A+B=${bigA}${signed(x3)}=${ans}$이다.`,
          facts: { k, x1, y1, x2, bigA, x3, y3, branch, ans },
        };
      }
      const m = intBetween(rng, 2, 4);
      const div = divisors(abs).filter((p) => abs % (p * m) === 0);
      if (div.length === 0) return null;
      const p = div[intBetween(rng, 0, div.length - 1)]!;
      const q = k / p;
      const ans = k / (p * m);
      return {
        content:
          `$y$가 $x$에 반비례하고 $x=${p}$일 때 $y=${q}$이다. ` +
          `$x=${p * m}$일 때 $y$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `$y$가 $x$에 반비례하면 $x$의 값이 $${m}$배가 될 때 $y$의 값은 $\\dfrac{1}{${m}}$배가 된다.\n` +
          `$${p * m}=${p}\\times${m}$이므로 구하는 $y$의 값은 $${q}\\div${m}=${ans}$이다.`,
        facts: { k, p, q, m, branch, ans },
      };
    }),
  ),

  def(MINOR_PROP, "12", "반비례 관계의 식 구하기", SEC.반비례, "기본", (rng) =>
    attempt<Body>(400, (): Body | null => {
      // **답을 먼저** — 지나는 점 $(p, q)$ 를 고르면 $a=pq$ 라 상수가 늘 정수다.
      const p = nonZero(rng, -8, 8);
      const q = nonZero(rng, -8, 8);
      const k = p * q;
      if (Math.abs(k) < 4 || Math.abs(k) > 48) return null;
      const branch = intBetween(rng, 0, 2);
      const head = `$y$가 $x$에 반비례하고 $x=${p}$일 때 $y=${q}$이다. `;
      const setup =
        `$y$가 $x$에 반비례하므로 $y=\\dfrac{a}{x}$로 놓으면 $${q}=\\dfrac{a}{${p}}$에서 $a=${p}\\times${paren(q)}=${k}$이다.\n` +
        `즉 $${invTex(k)}$이다.\n`;
      if (branch === 0) {
        return {
          content: `${head}$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
          answer: `$${invTex(k)}$`,
          solution: `${setup}따라서 구하는 식은 $${invTex(k)}$이다.`,
          facts: { p, q, k, branch, ans: k },
        };
      }
      if (branch === 1) {
        const r = nonZero(rng, -12, 12);
        if (k % r !== 0) return null;
        const ans = k / r;
        return {
          content: `${head}$x=${r}$일 때 $y$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `${setup}$x=${r}$${eulReul(r)} 대입하면 $y=${fracEval(k, r)}$이다.`,
          facts: { p, q, k, r, branch, ans },
        };
      }
      const s = nonZero(rng, -12, 12);
      if (k % s !== 0) return null;
      const ans = k / s;
      return {
        content: `${head}$y=${s}$일 때 $x$의 값을 구하시오.`,
        answer: `$${ans}$`,
        solution: `${setup}$y=${s}$${eulReul(s)} 대입하면 $${s}=\\dfrac{${k}}{x}$에서 $x=${fracEval(k, s)}$이다.`,
        facts: { p, q, k, s, branch, ans },
      };
    }),
  ),

  def(
    MINOR_PROP,
    "13",
    "반비례 관계 의 활용 와 사이의 관계를 나타내는 식 구하기",
    SEC.반비례,
    "응용",
    (rng) =>
      attempt<Body>(200, (): Body | null => {
        const sc = intBetween(rng, 0, 3);
        const c = intBetween(rng, 3, 12);
        const SCENES = [
          {
            k: c * 12,
            content:
              `톱니가 $${c * 12}$개인 톱니바퀴 $\\mathrm{A}$에 톱니가 $x$개인 톱니바퀴 $\\mathrm{B}$가 맞물려 돈다. ` +
              `톱니바퀴 $\\mathrm{A}$가 $1$번 도는 동안 톱니바퀴 $\\mathrm{B}$가 $y$번 돈다고 할 때, $x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `맞물려 도는 두 톱니바퀴에서 (톱니의 수)$\\times$(회전수)는 서로 같으므로 $x\\times y=${c * 12}\\times1$이다.\n` +
              `따라서 $${invTex(c * 12)}$이다.`,
          },
          {
            k: c * 10,
            content:
              `넓이가 $${c * 10}$ cm$^{2}$인 직사각형의 가로의 길이를 $x$ cm, 세로의 길이를 $y$ cm라 할 때, ` +
              `$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `직사각형의 넓이는 (가로)$\\times$(세로)이므로 $x\\times y=${c * 10}$이다.\n` +
              `따라서 $${invTex(c * 10)}$이다.`,
          },
          {
            k: c * 6,
            content:
              `$${c * 6}$ km 떨어진 곳까지 자동차로 가려고 한다. 시속 $x$ km로 갈 때 걸리는 시간을 $y$시간이라 할 때, ` +
              `$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `(거리)$=$(속력)$\\times$(시간)이므로 $x\\times y=${c * 6}$이다.\n` +
              `따라서 $${invTex(c * 6)}$이다.`,
          },
          {
            k: c * 24,
            content:
              `사탕 $${c * 24}$개를 $x$명이 남김없이 똑같이 나누어 가질 때 한 사람이 갖는 사탕의 수를 $y$개라 하자. ` +
              `$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            solution:
              `한 사람이 갖는 수에 사람 수를 곱하면 전체 사탕의 수이므로 $x\\times y=${c * 24}$이다.\n` +
              `따라서 $${invTex(c * 24)}$이다.`,
          },
        ] as const;
        const s = SCENES[sc]!;
        return {
          content: s.content,
          answer: `$${invTex(s.k)}$`,
          solution: s.solution,
          facts: { sc, c, k: s.k, branch: sc, ans: s.k },
        };
      }),
  ),

  def(MINOR_PROP, "15", "반비례 관계 의 그래프", SEC.반비례, "기본", (rng) =>
    attempt<Body>(400, (): Body | null => {
      const k = pick(rng, INV_K) * (intBetween(rng, 0, 1) === 1 ? 1 : -1);
      const div = invLattice(Math.abs(k));
      if (div.length < 2) return null;
      const mi = intBetween(rng, 0, div.length - 1);
      const m = div[mi]!; // 그림이 찍는 점의 $x$좌표
      const rest = div.filter((v) => v !== m);
      const p = rest[intBetween(rng, 0, rest.length - 1)]!;
      const ans = k / p;
      return {
        content:
          `반비례 관계 $${invTex(k)}$의 그래프는 오른쪽 그림과 같이 점 $(${m}, ${k / m})$${eulReul(k / m)} 지난다. ` +
          `이 그래프 위의 점 중 $x$좌표가 $${p}$인 점의 $y$좌표를 구하시오.`,
        answer: `$${ans}$`,
        solution:
          `그래프 위의 점에서는 $${invTex(k)}$가 성립한다.\n` +
          `$x=${p}$${eulReul(p)} 대입하면 $y=${fracEval(k, p)}$이다.`,
        facts: { k, m, p, branch: 0, ans },
        figureSpec: inverseSpec(k, [[m, k / m]]),
      };
    }),
  ),

  def(
    MINOR_PROP,
    "16",
    "반비례 관계 의 그래프와 의 절댓값 사이의 관계",
    SEC.반비례,
    "응용",
    (rng) =>
      attempt<Body>(300, (): Body | null => {
        const mags = [2, 3, 4, 6, 8, 12];
        const chosen: number[] = [];
        for (let i = 0; i < 4; i += 1) {
          const idx = intBetween(rng, 0, mags.length - 1);
          chosen.push(mags.splice(idx, 1)[0]!);
        }
        const list = chosen.map((v) => (intBetween(rng, 0, 1) === 1 ? v : -v));
        const branch = intBetween(rng, 0, 1);
        const target = branch === 0 ? Math.max(...chosen) : Math.min(...chosen);
        const ansK = list.find((v) => Math.abs(v) === target)!;
        return {
          content:
            `네 반비례 관계 $${invTex(list[0]!)}$, $${invTex(list[1]!)}$, $${invTex(list[2]!)}$, $${invTex(list[3]!)}$의 그래프 중 ` +
            `원점에서 ${branch === 0 ? "가장 먼" : "가장 가까운"} 것의 식을 구하시오.`,
          answer: `$${invTex(ansK)}$`,
          solution:
            `반비례 관계 $y=\\dfrac{a}{x}$의 그래프는 $a$의 절댓값이 클수록 원점에서 멀어진다.\n` +
            `네 식의 $a$의 절댓값은 각각 $${Math.abs(list[0]!)}$, $${Math.abs(list[1]!)}$, $${Math.abs(list[2]!)}$, $${Math.abs(list[3]!)}$이므로 ` +
            `${branch === 0 ? "가장 큰" : "가장 작은"} 것은 $${target}$이다.\n` +
            `따라서 구하는 식은 $${invTex(ansK)}$이다.`,
          facts: {
            k0: list[0]!,
            k1: list[1]!,
            k2: list[2]!,
            k3: list[3]!,
            branch,
            ans: ansK,
          },
        };
      }),
  ),

  def(
    MINOR_PROP,
    "17",
    "반비례 관계 의 그래프가 지나는 점",
    SEC.반비례,
    "응용",
    (rng) =>
      attempt<Body>(400, (): Body | null => {
        const p = nonZero(rng, -8, 8);
        const q = nonZero(rng, -8, 8);
        const k = p * q;
        if (Math.abs(k) < 4 || Math.abs(k) > 48) return null;
        const branch = intBetween(rng, 0, 2);
        if (branch === 2) {
          return {
            content: `반비례 관계 $y=\\dfrac{a}{x}$의 그래프가 점 $(${p}, ${q})$${eulReul(q)} 지날 때, 상수 $a$의 값을 구하시오.`,
            answer: `$${k}$`,
            solution:
              `그래프가 점 $(${p}, ${q})$${eulReul(q)} 지나므로 $y=\\dfrac{a}{x}$에 $x=${p}$, $y=${q}$${eulReul(q)} 대입하면\n` +
              `$${q}=\\dfrac{a}{${p}}$에서 $a=${p}\\times${paren(q)}=${k}$이다.`,
            facts: { p, q, k, branch, ans: k },
          };
        }
        const m = nonZero(rng, -12, 12);
        if (k % m !== 0) return null;
        const n = k / m;
        if (m === p) return null;
        if (branch === 0) {
          return {
            content: `반비례 관계 $${invTex(k)}$의 그래프가 점 $(${m}, t)$를 지날 때, $t$의 값을 구하시오.`,
            answer: `$${n}$`,
            solution:
              `그래프가 점 $(${m}, t)$를 지나므로 $${invTex(k)}$에 $x=${m}$${eulReul(m)} 대입하면\n` +
              `$t=${fracEval(k, m)}$이다.`,
            facts: { p, q, k, m, n, branch, ans: n },
          };
        }
        return {
          content: `반비례 관계 $${invTex(k)}$의 그래프가 점 $(t, ${n})$${eulReul(n)} 지날 때, $t$의 값을 구하시오.`,
          answer: `$${m}$`,
          solution:
            `그래프가 점 $(t, ${n})$${eulReul(n)} 지나므로 $${invTex(k)}$에 $y=${n}$${eulReul(n)} 대입하면\n` +
            `$${n}=\\dfrac{${k}}{t}$에서 $t=${fracEval(k, n)}$이다.`,
          facts: { p, q, k, m, n, branch, ans: m },
        };
      }),
  ),

  def(
    MINOR_PROP,
    "18",
    "반비례 관계 의 그래프의 성질",
    SEC.반비례,
    "기본",
    (rng) => {
      const k = nonZero(rng, -12, 12);
      const branch = intBetween(rng, 0, 2);
      const quad =
        k > 0 ? "제$1$사분면과 제$3$사분면" : "제$2$사분면과 제$4$사분면";
      if (branch === 0) {
        return {
          content: `반비례 관계 $${invTex(k)}$의 그래프는 제 몇 사분면을 지나는지 구하시오.`,
          answer: quad,
          solution:
            `반비례 관계 $y=\\dfrac{a}{x}$의 그래프는 원점에 대하여 대칭인 한 쌍의 매끄러운 곡선이고, ` +
            `$a>0$이면 제$1$사분면과 제$3$사분면을, $a<0$이면 제$2$사분면과 제$4$사분면을 지난다.\n` +
            `$a=${k}$이므로 $a${k > 0 ? ">" : "<"}0$이다.\n` +
            `따라서 그래프는 ${quad}을 지난다.`,
          facts: { k, branch, ans: k > 0 ? 1 : 2 },
        };
      }
      if (branch === 1) {
        return {
          content: `반비례 관계 $${invTex(k)}$의 그래프에서 각 사분면에 있는 곡선은 $x$의 값이 증가할 때 $y$의 값이 어떻게 변하는지 구하시오.`,
          answer: k > 0 ? "감소한다." : "증가한다.",
          solution:
            `반비례 관계 $y=\\dfrac{a}{x}$의 그래프는 각 사분면에서 $a>0$이면 $x$의 값이 증가할 때 $y$의 값이 감소하고, ` +
            `$a<0$이면 $x$의 값이 증가할 때 $y$의 값이 증가한다.\n` +
            `$a=${k}$이므로 $a${k > 0 ? ">" : "<"}0$이다.\n` +
            `따라서 각 사분면에서 $x$의 값이 증가하면 $y$의 값은 ${k > 0 ? "감소한다" : "증가한다"}.`,
          facts: { k, branch, ans: k > 0 ? 0 : 1 },
        };
      }
      const pos = k > 0;
      return {
        content: `반비례 관계 $y=\\dfrac{a}{x}$의 그래프가 ${quad}을 지날 때, 상수 $a$의 부호를 구하시오.`,
        answer: pos ? "$a>0$" : "$a<0$",
        solution:
          `반비례 관계 $y=\\dfrac{a}{x}$의 그래프가 지나는 사분면은 $a$의 부호가 정한다.\n` +
          `${quad}을 지나는 것은 $a${pos ? ">" : "<"}0$일 때이다.\n` +
          `따라서 $a${pos ? ">" : "<"}0$이다.`,
        facts: { k, branch, ans: pos ? 1 : 0 },
      };
    },
  ),

  def(
    MINOR_PROP,
    "19",
    "반비례 관계의 그래프가 주어진 경우",
    SEC.반비례,
    "응용",
    (rng) =>
      attempt<Body>(400, (): Body | null => {
        const k = pick(rng, INV_K) * (intBetween(rng, 0, 1) === 1 ? 1 : -1);
        const div = invLattice(Math.abs(k));
        const p = div[intBetween(rng, 0, div.length - 1)]!;
        const q = k / p;
        const branch = intBetween(rng, 0, 1);
        const head = `오른쪽 그림과 같이 반비례 관계의 그래프가 점 $(${p}, ${q})$${eulReul(q)} 지날 때, `;
        const setup =
          `그래프가 원점에 대하여 대칭인 한 쌍의 곡선이므로 $y=\\dfrac{a}{x}$로 놓을 수 있다.\n` +
          `점 $(${p}, ${q})$${eulReul(q)} 지나므로 $${q}=\\dfrac{a}{${p}}$에서 $a=${p}\\times${paren(q)}=${k}$, 즉 $${invTex(k)}$이다.\n`;
        if (branch === 0) {
          return {
            content: `${head}$x$와 $y$ 사이의 관계를 식으로 나타내시오.`,
            answer: `$${invTex(k)}$`,
            solution: `${setup}따라서 구하는 식은 $${invTex(k)}$이다.`,
            facts: { k, p, q, branch, ans: k },
            figureSpec: inverseSpec(k, [[p, q]]),
          };
        }
        const r = nonZero(rng, -12, 12);
        if (r === p || k % r !== 0) return null;
        const ans = k / r;
        return {
          content: `${head}이 그래프가 점 $(${r}, t)$를 지난다고 한다. $t$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `${setup}$x=${r}$${eulReul(r)} 대입하면 $t=${fracEval(k, r)}$이다.`,
          facts: { k, p, q, r, branch, ans },
          figureSpec: inverseSpec(k, [[p, q]]),
        };
      }),
  ),

  def(
    MINOR_PROP,
    "20",
    "반비례 관계 의 그래프와 도형의 넓이",
    SEC.반비례,
    "심화하",
    (rng) =>
      attempt<Body>(400, (): Body | null => {
        const k = pick(rng, INV_K);
        const div = invLattice(k);
        const p = div[intBetween(rng, 0, div.length - 1)]!;
        const q = k / p;
        const branch = intBetween(rng, 0, 1);
        if (branch === 0) {
          return {
            content:
              `오른쪽 그림과 같이 반비례 관계 $${invTex(k)}$의 그래프 위의 점 $\\mathrm{P}$의 $x$좌표가 $${p}$이다. ` +
              `점 $\\mathrm{P}$에서 $x$축, $y$축에 내린 수선의 발을 각각 $\\mathrm{A}$, $\\mathrm{B}$라 할 때, ` +
              `직사각형 $\\mathrm{OAPB}$의 넓이를 구하시오. (단, $\\mathrm{O}$는 원점이다.)`,
            answer: `$${k}$`,
            solution:
              `점 $\\mathrm{P}$는 그래프 위의 점이므로 $x=${p}$${eulReul(p)} 대입하면 $y=${fracEval(k, p)}$, 즉 $\\mathrm{P}(${p}, ${q})$이다.\n` +
              `$\\overline{\\mathrm{OA}}=${p}$, $\\overline{\\mathrm{OB}}=${q}$이다.\n` +
              `따라서 직사각형 $\\mathrm{OAPB}$의 넓이는 $${p}\\times${q}=${k}$이다.`,
            facts: { k, p, q, branch, ans: k },
            figureSpec: inverseSpec(k, [[p, q]]),
          };
        }
        if (k % 2 !== 0) return null;
        return {
          content:
            `오른쪽 그림과 같이 반비례 관계 $${invTex(k)}$의 그래프 위의 점 $\\mathrm{P}$의 $x$좌표가 $${p}$이다. ` +
            `점 $\\mathrm{P}$에서 $x$축에 내린 수선의 발을 $\\mathrm{A}$라 할 때, 삼각형 $\\mathrm{POA}$의 넓이를 구하시오. ` +
            `(단, $\\mathrm{O}$는 원점이다.)`,
          answer: `$${k / 2}$`,
          solution:
            `점 $\\mathrm{P}$는 그래프 위의 점이므로 $x=${p}$${eulReul(p)} 대입하면 $y=${fracEval(k, p)}$, 즉 $\\mathrm{P}(${p}, ${q})$이다.\n` +
            `$\\overline{\\mathrm{OA}}=${p}$, $\\overline{\\mathrm{PA}}=${q}$이다.\n` +
            `따라서 삼각형 $\\mathrm{POA}$의 넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}=${k / 2}$이다.`,
          facts: { k, p, q, branch, ans: k / 2 },
          figureSpec: inverseSpec(k, [[p, q]]),
        };
      }),
  ),

  def(
    MINOR_PROP,
    "21",
    "정비례 관계와 반비례 관계의 그래프가 만나는 점",
    SEC.반비례,
    "심화하",
    (rng) =>
      attempt<Body>(500, (): Body | null => {
        // 만나는 점 $(p, q)$ 를 **먼저** 정하면 $a=\dfrac{q}{p}$, $b=pq$ 가 함께 정해진다.
        const p = intBetween(rng, 1, 6);
        const q = intBetween(rng, 1, 6);
        const k = p * q;
        if (!(INV_K as readonly number[]).includes(k)) return null;
        const g = gcd(q, p);
        const num = q / g;
        const den = p / g;
        if (num / den > 6 || den / num > 6) return null;
        const branch = intBetween(rng, 0, 2);
        const head = `오른쪽 그림과 같이 정비례 관계 $y=ax$의 그래프와 반비례 관계 $y=\\dfrac{b}{x}$의 그래프가 점 $(${p}, ${q})$에서 만난다. `;
        const spec = inverseSpec(
          k,
          [
            [p, q],
            [-p, -q],
          ],
          { num, den },
        );
        if (branch === 0) {
          return {
            content: `${head}상수 $a$의 값을 구하시오.`,
            answer: `$${den === 1 ? num : `\\dfrac{${num}}{${den}}`}$`,
            solution:
              `$y=ax$의 그래프가 점 $(${p}, ${q})$${eulReul(q)} 지나므로 $${q}=a\\times${p}$이다.\n` +
              `따라서 $a=${q}\\div${p}=${den === 1 ? num : `\\dfrac{${num}}{${den}}`}$이다.`,
            facts: { p, q, k, num, den, branch, ans: num },
            figureSpec: spec,
          };
        }
        if (branch === 1) {
          return {
            content: `${head}상수 $b$의 값을 구하시오.`,
            answer: `$${k}$`,
            solution:
              `$y=\\dfrac{b}{x}$의 그래프가 점 $(${p}, ${q})$${eulReul(q)} 지나므로 $${q}=\\dfrac{b}{${p}}$이다.\n` +
              `따라서 $b=${p}\\times${q}=${k}$이다.`,
            facts: { p, q, k, num, den, branch, ans: k },
            figureSpec: spec,
          };
        }
        return {
          content: `${head}두 그래프가 만나는 다른 한 점의 좌표를 구하시오.`,
          answer: `$(${-p}, ${-q})$`,
          solution:
            `정비례 관계의 그래프와 반비례 관계의 그래프는 모두 원점에 대하여 대칭이다.\n` +
            `따라서 두 그래프가 만나는 다른 한 점은 점 $(${p}, ${q})$${waGwa(q)} 원점에 대하여 대칭인 점 $(${-p}, ${-q})$이다.`,
          facts: { p, q, k, num, den, branch, ans: -p },
          figureSpec: spec,
        };
      }),
  ),
];

/** 이 모듈이 등록하는 27유형. 시험은 **이 배열을 직접** 훑는다(중단원 이름으로 거르지 않는다). */
export const M1_PROP: TypeEntry[] = [...COORD, ...PROP, ...INV];
