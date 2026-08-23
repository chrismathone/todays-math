/**
 * 중1 물결 3A-유형 — RPM 1-2 **구 계열**(입체도형의 겉넓이와 부피 21~26)과
 * **도수분포표와 상대도수** 중 «그림 없이 성립하는» 유형.
 *
 * ## 왜 이 두 묶음인가 (물결 3 계획 §0-㉡ 실측)
 * 우리 DB 에서 「구의 겉넓이와 부피」는 자격 문항 **7건**뿐인데 엔진 유형이 **0** 이었다.
 * 막는 것은 아무것도 없었다 — 유형을 안 냈을 뿐이다. 그래서 먼저 낸다.
 * 「도수분포표와 상대도수」는 RPM 1-2 에서 통째로 손 안 댄 중단원(19유형)이다.
 *
 * ## 지금 낸 것 / 안 낸 것 — «못 그리는 그림을 지어내지 않는다»
 * 통계 19유형 중 **02·03·11·15·16 다섯**만 여기 있다. 이 다섯은 RPM 원본에서도
 * 표·그래프 없이 글로만 성립하는 문항이 실제로 있는 부류다(1065·1066·1068·1080~1082 꼴).
 *
 * 나머지 **열넷은 보류**다. 보류의 이유는 「어렵다」가 아니라 **읽을 그림이 있어야
 * 문항이 성립**하기 때문이다 — 그림 없이 내면 풀 수 없는 문항이 된다
 * (2026-08-18 «그림을 지목하는데 그림이 없는 1,420건» 과 같은 자리).
 *
 * | 유형 | 제목 | 무엇을 기다리나 |
 * |---|---|---|
 * | 01 | 줄기와 잎 그림의 이해 | `table` 열 폭 + 잎 왼쪽 정렬 |
 * | 04·05·06 | 히스토그램 계열 | `histogram` kind |
 * | 07·08·09·10 | 도수분포다각형 계열 | `freqPolygon` kind |
 * | 12 | 상대도수 구하기 | 표/그래프가 주어지는 유형 |
 * | 13·14 | 상대도수의 분포표 | `table` 열 폭 |
 * | 17·18·19 | 상대도수의 분포를 나타낸 그래프 | `freqPolygon`(세로축 상대도수) |
 *
 * 세션 3A-엔진 이 `table` 열 폭 수리와 `histogram`·`freqPolygon` kind 를 main 에
 * 병합하면 그때 이 파일에 `figureSpec` 을 붙인다. 붙일 때의 계약(물결 2D):
 * **`facts` 의 계급·도수와 `figureSpec` 의 값이 같은지 테스트가 대조**한다 —
 * 그림 따로 발문 따로면 「그럴듯한 오답 그림」이 된다.
 *
 * ## 구 계열에 그림을 안 붙인 이유 (지어내지 않는다)
 * `sphere` kind 는 있지만 그 렌더러는 **반지름을 한 톨도 안 담는다**
 * (`elem_advanced.py:_sphere` — `pr` 이 리터럴 36 이라 `r=1` 과 `r=20` 이 같은 원이고,
 * 주석이 그 사실을 스스로 적어 두고 있다). 그러니 구 그림은 **수를 못 나르는 장식**이다.
 * 게다가 21~26 이 실제로 다루는 입체는 반구·구의 $\frac18$·회전체·원기둥 속 구처럼
 * `sphere` 로는 못 그리는 것이 대부분이다. 그래서 발문이 **말로 다 서술하게** 썼다.
 *
 * ## 생성 규칙 (본보기 `m1LinearApply.ts` 와 동일 계약)
 * 1. **정답(핵심 수치)을 먼저 뽑고 발문을 역산**한다 — 답은 늘 정수·깔끔한 값.
 * 2. `facts` 에 발문의 원 수치를 남기고, 테스트가 **생성기와 다른 식**으로 재계산한다.
 * 3. 숫자는 전부 `$...$` 안에 (`bareNumbers` 가드).
 * 4. 조건이 안 맞으면 `attempt()` 재시도, 소진되면 **던진다**.
 * 5. **답이 발문에 그대로 적혀 있으면 다시 뽑는다**(`leaks`) — 역산이 만드는 우연이다.
 *
 * ## ⚠️ 맨 «정수 가분수» 를 쓰지 말 것 (2026-08-23, 미리보기를 눈으로 보고 나옴)
 * 제품 전처리 `preprocessMathText` 는 「정수 가분수 → 대분수」를 한국 교과 관행으로
 * 적용한다(초등 분수에서는 옳다). 그래서 `\dfrac{4}{3}\pi` 는 지면에 **`1\frac13\pi`**
 * 로 나가고 `\dfrac{12}{2}` 는 통째로 `6` 이 되어 해설이 「$6=6$」이 된다.
 * 계수는 **분자에** 넣고(`\dfrac{4\pi}{3}`), 비에는 문자를 남긴다(`\dfrac{3m}{4k}`).
 * 시험이 제품 전처리를 실제로 돌려 「전후로 수식 안의 수가 같은가」를 본다.
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중1";
const BOOK = "1-2";
const MINOR_SOLID = "입체도형의 겉넓이와 부피";
const MINOR_FREQ = "도수분포표와 상대도수";

/** 우리 Unit.section 정확한 이름 (`prisma/seed-data/units.ts` 실측 2026-08-23) */
const SEC = {
  구: "구의 겉넓이와 부피",
  도수분포표: "도수분포표",
  상대도수: "상대도수",
} as const;

/** 조건을 만족할 때까지 다시 뽑는다 — 못 찾으면 던진다(조용히 기본값 금지). */
function attempt<T>(tries: number, f: () => T | null): T {
  for (let i = 0; i < tries; i += 1) {
    const v = f();
    if (v !== null) return v;
  }
  throw new Error("유형 생성 재시도 초과 — 매개변수 범위를 확인하십시오");
}

type Body = Pick<MidProblem, "content" | "answer" | "solution" | "facts">;

/** 본문에 «값으로» 적힌 수 — 단위·지수·아래첨자의 숫자는 값이 아니다. */
function plainNumbers(text: string): number[] {
  return (
    text
      .replace(/\\mathrm\{[^}]*\}/g, " ")
      .replace(/[\^_]\{?-?\d+\}?/g, " ")
      .match(/-?\d+(?:\.\d+)?/g) ?? []
  ).map(Number);
}

/**
 * 답이 발문에 **그대로 적혀 있으면** 문항이 아니다 — 겹치면 다시 뽑는다.
 *
 * 역산으로 만든 발문은 우연히 답과 같은 수를 말하게 된다. 실제로 걸린 것들:
 * 「겉넓이가 $36\pi$인 구의 부피」($r=3$ 이면 답도 $36\pi$),
 * 「도수가 $5$명일 때 몇 $\%$」(총합 $100$ 이면 답도 $5$).
 * 수학은 맞지만 학생이 보기엔 답을 알려 준 것처럼 읽힌다.
 */
function leaks(content: string, asked: readonly number[]): boolean {
  if (asked.length === 0) return false;
  const nums = new Set(plainNumbers(content));
  return asked.some((v) => nums.has(v));
}

/** 기본 «답의 수» — 유형이 따로 안 알려 주면 `facts.ans` 하나로 본다. */
function askedDefault(f: Record<string, number>): number[] {
  return f.ans === undefined ? [] : [f.ans];
}

function def(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
  asked: (f: Record<string, number>) => number[] = askedDefault,
): TypeEntry {
  return {
    key: `${BOOK}|${minor}|${rpmType}`,
    grade: GRADE,
    unitSection,
    rpmBook: BOOK,
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: GRADE,
      unitSection,
      rpmBook: BOOK,
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...attempt(80, () => {
        const body = gen(rng);
        return leaks(body.content, asked(body.facts)) ? null : body;
      }),
    }),
  };
}

// ── 한국어 조사 — 소재를 바꿔도 「몸무게을」이 안 나오게 ────────────
function hasFinal(word: string): boolean {
  const ch = word.charCodeAt(word.length - 1);
  if (ch < 0xac00 || ch > 0xd7a3) return false;
  return (ch - 0xac00) % 28 !== 0;
}
/** 목적격 조사 — 받침 있으면 「을」, 없으면 「를」. */
function obj(word: string): string {
  return `${word}${hasFinal(word) ? "을" : "를"}`;
}

/** 상대도수 백분율 정수(1~100)를 소수 표기로 — `26 → 0.26`, `10 → 0.1`, `100 → 1`. */
function dec(percent: number): string {
  return (percent / 100).toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** 계수 붙은 문자 — 계수가 $1$ 이면 `1m` 이 아니라 `m`. */
function coef(n: number, sym: string): string {
  return n === 1 ? sym : `${n}${sym}`;
}

// ═══════════════════════════════════════════════════════════════════
//  구 계열 — RPM 1-2 「입체도형의 겉넓이와 부피」 21~26
//  부피에 $\frac43\pi r^3$ 가 들어가는 갈래는 $r$ 를 3의 배수로 잡아
//  계수를 정수로 만든다 (답이 늘 깔끔한 값이어야 한다는 계약).
// ═══════════════════════════════════════════════════════════════════

/** $\frac43 r^3$ 가 정수가 되는 반지름 — 구·반구의 부피를 묻는 갈래에서 쓴다. */
const R3: readonly number[] = [3, 6, 9, 12];

export const M1_SPHERE: TypeEntry[] = [
  def(MINOR_SOLID, "21", "구의 겉넓이", SEC.구, "easy", (rng) =>
    attempt(60, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      const r = intBetween(rng, 2, 12);
      if (branch === 0) {
        // 단면의 최대 넓이 = 중심을 지나는 원의 넓이 = $\pi r^2$
        const A = r * r;
        const S = 4 * r * r;
        return {
          content: `구를 평면으로 잘랐을 때 생기는 단면의 최대 넓이가 $${A}\\pi\\,\\mathrm{cm}^2$일 때, 이 구의 겉넓이를 구하시오.`,
          answer: `$${S}\\pi\\,\\mathrm{cm}^2$`,
          solution: `단면의 넓이가 가장 클 때는 구의 중심을 지나도록 자를 때이므로 그 단면은 반지름의 길이가 구의 반지름과 같은 원이다.\n반지름의 길이를 $r\\,\\mathrm{cm}$라 하면 $\\pi r^{2}=${A}\\pi$에서 $r=${r}$이다.\n따라서 겉넓이는 $4\\pi\\times${r}^{2}=${S}\\pi\\,(\\mathrm{cm}^2)$이다.`,
          facts: { branch, r, A, S, ans: S },
        };
      }
      if (branch === 1) {
        // 반구의 겉넓이 = 곡면 $2\pi r^2$ + 단면인 원 $\pi r^2$
        const S = 3 * r * r;
        return {
          content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 반구의 겉넓이를 구하시오.`,
          answer: `$${S}\\pi\\,\\mathrm{cm}^2$`,
          solution: `곡면의 넓이는 구의 겉넓이의 절반이므로 $\\dfrac{1}{2}\\times4\\pi\\times${r}^{2}=${2 * r * r}\\pi$이다.\n잘린 단면은 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 원이므로 넓이는 $\\pi\\times${r}^{2}=${r * r}\\pi$이다.\n따라서 겉넓이는 $${2 * r * r}\\pi+${r * r}\\pi=${S}\\pi\\,(\\mathrm{cm}^2)$이다.`,
          facts: { branch, r, S, ans: S },
        };
      }
      const d = 2 * r;
      const S = 4 * r * r;
      return {
        content: `지름의 길이가 $${d}\\,\\mathrm{cm}$인 구의 겉넓이를 구하시오.`,
        answer: `$${S}\\pi\\,\\mathrm{cm}^2$`,
        solution: `반지름의 길이는 지름의 길이의 절반이므로 $${r}\\,\\mathrm{cm}$이다.\n따라서 겉넓이는 $4\\pi\\times${r}^{2}=${S}\\pi\\,(\\mathrm{cm}^2)$이다.`,
        facts: { branch, r, d, S, ans: S },
      };
    }),
  ),

  def(MINOR_SOLID, "22", "구의 부피", SEC.구, "easy", (rng) =>
    attempt(60, (): Body | null => {
      const branch = pick(rng, [0, 1, 2, 3] as const);
      const r = pick(rng, R3);
      const V = (4 * r * r * r) / 3;
      if (branch === 0) {
        return {
          content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 구의 부피를 구하시오.`,
          answer: `$${V}\\pi\\,\\mathrm{cm}^3$`,
          solution: `$\\dfrac{4\\pi}{3}\\times${r}^{3}=${V}\\pi\\,(\\mathrm{cm}^3)$이다.`,
          facts: { branch, r, V, ans: V },
        };
      }
      if (branch === 1) {
        const d = 2 * r;
        return {
          content: `지름의 길이가 $${d}\\,\\mathrm{cm}$인 구의 부피를 구하시오.`,
          answer: `$${V}\\pi\\,\\mathrm{cm}^3$`,
          solution: `반지름의 길이는 지름의 길이의 절반이므로 $${r}\\,\\mathrm{cm}$이다.\n따라서 부피는 $\\dfrac{4\\pi}{3}\\times${r}^{3}=${V}\\pi\\,(\\mathrm{cm}^3)$이다.`,
          facts: { branch, r, d, V, ans: V },
        };
      }
      if (branch === 2) {
        const S = 4 * r * r;
        return {
          content: `겉넓이가 $${S}\\pi\\,\\mathrm{cm}^2$인 구의 부피를 구하시오.`,
          answer: `$${V}\\pi\\,\\mathrm{cm}^3$`,
          solution: `반지름의 길이를 $r\\,\\mathrm{cm}$라 하면 $4\\pi r^{2}=${S}\\pi$에서 $r^{2}=${r * r}$, $r=${r}$이다.\n따라서 부피는 $\\dfrac{4\\pi}{3}\\times${r}^{3}=${V}\\pi\\,(\\mathrm{cm}^3)$이다.`,
          facts: { branch, r, S, V, ans: V },
        };
      }
      const H = (2 * r * r * r) / 3;
      return {
        content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 반구의 부피를 구하시오.`,
        answer: `$${H}\\pi\\,\\mathrm{cm}^3$`,
        solution: `구의 부피의 절반이므로 $\\dfrac{1}{2}\\times\\dfrac{4\\pi}{3}\\times${r}^{3}=${H}\\pi\\,(\\mathrm{cm}^3)$이다.`,
        facts: { branch, r, V: H, ans: H },
      };
    }),
  ),

  def(
    MINOR_SOLID,
    "23",
    "구의 일부분을 잘라 낸 입체도형의 겉넓이와 부피",
    SEC.구,
    "hard",
    (rng) =>
      attempt(80, (): Body | null => {
        // $\frac1n$ 을 잘라 내면 자른 면은 «반평면» $\log_2 n$ 장이고
        // 한 장의 넓이는 $\pi r^2\times\frac2n$ 이다 (n=2 원 · n=4 반원 · n=8 사분원).
        const n = pick(rng, [2, 4, 8] as const);
        const r =
          n === 4
            ? intBetween(rng, 2, 12)
            : n === 2
              ? pick(rng, R3)
              : pick(rng, [6, 12] as const);
        const planes = Math.log2(n);
        const curved = (4 * r * r * (n - 1)) / n;
        const cut = (planes * 2 * r * r) / n;
        const A = curved + cut;
        const V = (4 * r * r * r * (n - 1)) / (3 * n);
        if (!Number.isInteger(A) || !Number.isInteger(V)) return null;
        return {
          content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 구의 $\\dfrac{1}{${n}}$을 잘라 내고 남은 입체도형의 겉넓이와 부피를 차례로 구하시오.`,
          answer: `겉넓이 $${A}\\pi\\,\\mathrm{cm}^2$, 부피 $${V}\\pi\\,\\mathrm{cm}^3$`,
          solution: `남은 구면의 넓이는 $4\\pi\\times${r}^{2}\\times\\dfrac{${n - 1}}{${n}}=${curved}\\pi$이다.\n잘라 낸 단면은 $${planes}$개이고 넓이의 합은 $${cut}\\pi$이므로 겉넓이는 $${curved}\\pi+${cut}\\pi=${A}\\pi\\,(\\mathrm{cm}^2)$이다.\n부피는 $\\dfrac{4\\pi}{3}\\times${r}^{3}\\times\\dfrac{${n - 1}}{${n}}=${V}\\pi\\,(\\mathrm{cm}^3)$이다.`,
          facts: { n, r, A, V, ans: A },
        };
      }),
    (f) => [f.A, f.V].filter((v): v is number => v !== undefined),
  ),

  def(
    MINOR_SOLID,
    "24",
    "회전체의 겉넓이와 부피 구",
    SEC.구,
    "mid",
    (rng) =>
      attempt(60, (): Body | null => {
        const half = pick(rng, [0, 1] as const);
        const r = pick(rng, R3);
        if (half === 0) {
          const A = 4 * r * r;
          const V = (4 * r * r * r) / 3;
          return {
            content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 반원을 지름을 회전축으로 하여 $1$회전 시킬 때 생기는 회전체의 겉넓이와 부피를 차례로 구하시오.`,
            answer: `겉넓이 $${A}\\pi\\,\\mathrm{cm}^2$, 부피 $${V}\\pi\\,\\mathrm{cm}^3$`,
            solution: `반원을 지름을 회전축으로 하여 $1$회전 시키면 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 구가 생긴다.\n겉넓이는 $4\\pi\\times${r}^{2}=${A}\\pi\\,(\\mathrm{cm}^2)$이다.\n부피는 $\\dfrac{4\\pi}{3}\\times${r}^{3}=${V}\\pi\\,(\\mathrm{cm}^3)$이다.`,
            facts: { half, r, A, V, ans: A },
          };
        }
        const A = 3 * r * r;
        const V = (2 * r * r * r) / 3;
        return {
          content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 사분원을 한 반지름을 회전축으로 하여 $1$회전 시킬 때 생기는 회전체의 겉넓이와 부피를 차례로 구하시오.`,
          answer: `겉넓이 $${A}\\pi\\,\\mathrm{cm}^2$, 부피 $${V}\\pi\\,\\mathrm{cm}^3$`,
          solution: `사분원을 한 반지름을 회전축으로 하여 $1$회전 시키면 반지름의 길이가 $${r}\\,\\mathrm{cm}$인 반구가 생긴다.\n곡면의 넓이 $${2 * r * r}\\pi$와 단면인 원의 넓이 $${r * r}\\pi$를 더하면 겉넓이는 $${A}\\pi\\,(\\mathrm{cm}^2)$이다.\n부피는 $\\dfrac{1}{2}\\times\\dfrac{4\\pi}{3}\\times${r}^{3}=${V}\\pi\\,(\\mathrm{cm}^3)$이다.`,
          facts: { half, r, A, V, ans: A },
        };
      }),
    (f) => [f.A, f.V].filter((v): v is number => v !== undefined),
  ),

  def(MINOR_SOLID, "25", "원뿔 구 원기둥의 부피의 비", SEC.구, "mid", (rng) =>
    attempt(60, (): Body | null => {
      const branch = pick(rng, [0, 1, 2] as const);
      const r = pick(rng, R3);
      const cone = (2 * r * r * r) / 3;
      const sphere = (4 * r * r * r) / 3;
      const cyl = 2 * r * r * r;
      const head = `높이가 밑면의 지름의 길이와 같은 원기둥 안에 원뿔과 구가 꼭 맞게 들어 있다.`;
      if (branch === 0) {
        const ans = cone + cyl;
        return {
          content: `${head} 구의 부피가 $${sphere}\\pi\\,\\mathrm{cm}^3$일 때, 원뿔의 부피를 $a\\pi\\,\\mathrm{cm}^3$, 원기둥의 부피를 $b\\pi\\,\\mathrm{cm}^3$라 하자. 이때 $a+b$의 값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `(원뿔의 부피)$:$(구의 부피)$:$(원기둥의 부피)$=1:2:3$이다.\n구의 부피가 $${sphere}\\pi$이므로 비의 $1$에 해당하는 값은 $${cone}\\pi$이다.\n따라서 $a=${cone}$, $b=${cyl}$이므로 $a+b=${ans}$이다.`,
          facts: { branch, r, cone, sphere, cyl, ans },
        };
      }
      if (branch === 1) {
        return {
          content: `${head} 원기둥의 부피가 $${cyl}\\pi\\,\\mathrm{cm}^3$일 때, 구의 부피를 구하시오.`,
          answer: `$${sphere}\\pi\\,\\mathrm{cm}^3$`,
          solution: `(원뿔의 부피)$:$(구의 부피)$:$(원기둥의 부피)$=1:2:3$이다.\n원기둥의 부피가 $${cyl}\\pi$이므로 구의 부피는 $${cyl}\\pi\\times\\dfrac{2}{3}=${sphere}\\pi\\,(\\mathrm{cm}^3)$이다.`,
          facts: { branch, r, cone, sphere, cyl, ans: sphere },
        };
      }
      return {
        content: `${head} 원뿔의 부피가 $${cone}\\pi\\,\\mathrm{cm}^3$일 때, 원기둥의 부피를 구하시오.`,
        answer: `$${cyl}\\pi\\,\\mathrm{cm}^3$`,
        solution: `(원뿔의 부피)$:$(구의 부피)$:$(원기둥의 부피)$=1:2:3$이다.\n원뿔의 부피가 $${cone}\\pi$이므로 원기둥의 부피는 $${cone}\\pi\\times3=${cyl}\\pi\\,(\\mathrm{cm}^3)$이다.`,
        facts: { branch, r, cone, sphere, cyl, ans: cyl },
      };
    }),
  ),

  def(
    MINOR_SOLID,
    "26",
    "입체도형에 꼭 맞게 들어가는 입체도형",
    SEC.구,
    "hard",
    (rng) =>
      attempt(60, (): Body | null => {
        const branch = pick(rng, [0, 1, 2] as const);
        if (branch === 0) {
          // 정육면체에 꼭 맞게 들어가는 구 → 지름 = 한 모서리
          const a = 2 * intBetween(rng, 2, 8);
          const r = a / 2;
          const S = a * a;
          return {
            content: `한 모서리의 길이가 $${a}\\,\\mathrm{cm}$인 정육면체 안에 구가 꼭 맞게 들어 있을 때, 이 구의 겉넓이를 구하시오.`,
            answer: `$${S}\\pi\\,\\mathrm{cm}^2$`,
            solution: `구의 지름의 길이가 정육면체의 한 모서리의 길이와 같으므로 반지름의 길이는 그 절반인 $${r}\\,\\mathrm{cm}$이다.\n따라서 겉넓이는 $4\\pi\\times${r}^{2}=${S}\\pi\\,(\\mathrm{cm}^2)$이다.`,
            facts: { branch, a, r, S, ans: S },
          };
        }
        if (branch === 1) {
          // 구에 꼭 맞게 들어가는 정팔면체 → 밑면 대각선이 $2r$ 인 사각뿔 둘
          const r = pick(rng, R3);
          const V = (4 * r * r * r) / 3;
          return {
            content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 구에 정팔면체가 꼭 맞게 들어 있을 때, 이 정팔면체의 부피를 구하시오.`,
            answer: `$${V}\\,\\mathrm{cm}^3$`,
            solution: `정팔면체는 밑면이 정사각형이고 높이가 $${r}\\,\\mathrm{cm}$인 사각뿔 $2$개로 나뉜다.\n밑면인 정사각형은 두 대각선의 길이가 모두 $${2 * r}\\,\\mathrm{cm}$이므로 넓이는 $\\dfrac{1}{2}\\times${2 * r}\\times${2 * r}=${2 * r * r}\\,(\\mathrm{cm}^2)$이다.\n따라서 부피는 $2\\times\\dfrac{1}{3}\\times${2 * r * r}\\times${r}=${V}\\,(\\mathrm{cm}^3)$이다.`,
            facts: { branch, r, V, ans: V },
          };
        }
        // 반구에 꼭 맞게 들어가는 원뿔 → 밑면 반지름·높이가 모두 $r$
        const r = intBetween(rng, 2, 12);
        const half = 2 * r * r * r; // $\frac{3}{\pi}\times$(반구의 부피)
        const cone = r * r * r; //     $\frac{3}{\pi}\times$(원뿔의 부피)
        const ratio = 2;
        return {
          content: `반지름의 길이가 $${r}\\,\\mathrm{cm}$인 반구 안에 원뿔이 꼭 맞게 들어 있다. 반구와 원뿔의 부피를 각각 $V_{1}$, $V_{2}$라 할 때, $\\dfrac{V_{1}}{V_{2}}$의 값을 구하시오.`,
          answer: `$${ratio}$`,
          solution: `$V_{1}=\\dfrac{1}{2}\\times\\dfrac{4\\pi}{3}\\times${r}^{3}=\\dfrac{${half}\\pi}{3}$이다.\n원뿔은 밑면의 반지름의 길이와 높이가 모두 $${r}\\,\\mathrm{cm}$이므로 $V_{2}=\\dfrac{1}{3}\\pi\\times${r}^{2}\\times${r}=\\dfrac{${cone}\\pi}{3}$이다.\n따라서 $\\dfrac{V_{1}}{V_{2}}=${ratio}$이다.`,
          facts: { branch, r, half, cone, ratio, ans: ratio },
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════════════
//  도수분포표와 상대도수 — 그림 없이 성립하는 다섯 유형
// ═══════════════════════════════════════════════════════════════════

/**
 * 소재. `lo`·`w` 는 그 소재에서 실제로 쓰는 계급의 시작값·크기다 —
 * 「키가 $4$ 이상 $8$ 미만」 같은 말이 안 나오게 소재마다 붙여 둔다.
 */
type Topic = {
  subject: string;
  lo: number;
  w: number;
  tex: (n: number) => string;
};

const TOPICS: readonly Topic[] = [
  {
    subject: "하루 독서 시간",
    lo: 30,
    w: 30,
    tex: (n) => `$${n}$분`,
  },
  { subject: "통학 시간", lo: 10, w: 10, tex: (n) => `$${n}$분` },
  {
    subject: "몸무게",
    lo: 40,
    w: 5,
    tex: (n) => `$${n}\\,\\mathrm{kg}$`,
  },
  { subject: "키", lo: 150, w: 5, tex: (n) => `$${n}\\,\\mathrm{cm}$` },
  {
    subject: "앉은키",
    lo: 80,
    w: 5,
    tex: (n) => `$${n}\\,\\mathrm{cm}$`,
  },
  {
    subject: "던지기 기록",
    lo: 20,
    w: 5,
    tex: (n) => `$${n}\\,\\mathrm{m}$`,
  },
  {
    subject: "한 달 동안의 봉사 활동 시간",
    lo: 4,
    w: 4,
    tex: (n) => `$${n}$시간`,
  },
  {
    subject: "하루 인터넷 이용 시간",
    lo: 20,
    w: 20,
    tex: (n) => `$${n}$분`,
  },
  {
    subject: "일주일 동안의 운동 시간",
    lo: 2,
    w: 2,
    tex: (n) => `$${n}$시간`,
  },
  {
    subject: "제자리멀리뛰기 기록",
    lo: 140,
    w: 10,
    tex: (n) => `$${n}\\,\\mathrm{cm}$`,
  },
];

/** 도수의 총합 후보 — 상대도수가 소수 두 자리로 떨어지는 값만. */
const TOTALS: readonly number[] = [20, 25, 40, 50, 100, 200];
/** 상대도수(백분율 정수) 후보 — `dec()` 로 소수 표기한다. */
const RATES: readonly number[] = [
  4, 5, 8, 10, 12, 15, 16, 20, 24, 25, 28, 30, 32, 35, 36, 40,
];
/** 그중 $5\%$ 단위 — 두 집단을 합칠 때 도수·가중평균이 반드시 정수가 된다. */
const RATES5: readonly number[] = [5, 10, 15, 20, 25, 30, 35, 40];

export const M1_FREQ: TypeEntry[] = [
  def(MINOR_FREQ, "02", "도수분포표의 이해", SEC.도수분포표, "easy", (rng) =>
    attempt(80, (): Body | null => {
      const t = pick(rng, TOPICS);
      const branch = pick(rng, [0, 1, 2] as const);
      if (branch === 0) {
        // 계급의 개수 — 답 $k$ 를 먼저 뽑고 «가장 큰 값»을 마지막 계급 안에 놓는다.
        const k = intBetween(rng, 4, 7);
        const minV = t.lo + intBetween(rng, 0, t.w - 1);
        const maxV = t.lo + (k - 1) * t.w + intBetween(rng, 0, t.w - 1);
        if (maxV <= minV) return null;
        return {
          content: `어느 중학교 학생들의 ${obj(t.subject)} 조사하였더니 가장 작은 값은 ${t.tex(minV)}, 가장 큰 값은 ${t.tex(maxV)}이었다. ${t.tex(t.lo)} 이상 ${t.tex(t.lo + t.w)} 미만인 계급부터 시작하여 계급의 크기가 ${t.tex(t.w)}인 도수분포표로 나타낼 때, 계급의 개수를 구하시오.`,
          answer: `$${k}$개`,
          solution: `계급은 ${t.tex(t.lo)} 이상 ${t.tex(t.lo + t.w)} 미만부터 ${t.tex(t.lo + (k - 1) * t.w)} 이상 ${t.tex(t.lo + k * t.w)} 미만까지 필요하다.\n가장 큰 값 ${t.tex(maxV)}이 마지막 계급에 속하므로 계급의 개수는 $${k}$개이다.`,
          facts: { branch, lo: t.lo, w: t.w, minV, maxV, k, ans: k },
        };
      }
      if (branch === 1) {
        // 합계에서 한 계급의 도수를 되찾는다.
        const c = intBetween(rng, 4, 6);
        const d = intBetween(rng, 2, 9);
        const s = intBetween(rng, 10, 30);
        const T = s + d;
        return {
          content: `어느 중학교 학생 $${T}$명의 ${obj(t.subject)} 조사하여 계급의 개수가 $${c}$인 도수분포표로 나타내었다. 한 계급을 제외한 나머지 계급의 도수의 합이 $${s}$명일 때, 그 한 계급의 도수를 구하시오.`,
          answer: `$${d}$명`,
          solution: `도수의 총합은 조사한 학생 수와 같으므로 $${T}$이다.\n따라서 구하는 도수는 $${T}-${s}=${d}$이다.`,
          facts: { branch, T, s, c, d, ans: d },
        };
      }
      // 첫 계급과 마지막 계급, 계급의 개수로 계급의 크기를 되찾는다.
      const k = intBetween(rng, 4, 7);
      const last = t.lo + (k - 1) * t.w;
      return {
        content: `어느 중학교 학생들의 ${obj(t.subject)} 조사하여 나타낸 도수분포표에서 첫 번째 계급은 ${t.tex(t.lo)} 이상이고 마지막 계급은 ${t.tex(last)} 이상 ${t.tex(last + t.w)} 미만이며 계급의 개수는 $${k}$이다. 이 도수분포표에서 계급의 크기를 구하시오.`,
        answer: t.tex(t.w),
        solution: `첫 번째 계급의 시작값부터 마지막 계급의 시작값까지 계급이 $${k - 1}$번 옮겨 갔다.\n따라서 계급의 크기는 $\\dfrac{${last}-${t.lo}}{${k - 1}}=${t.w}$이다.`,
        facts: { branch, lo: t.lo, last, k, w: t.w, ans: t.w },
      };
    }),
  ),

  def(
    MINOR_FREQ,
    "03",
    "도수분포표에서 특정 계급의 백분율",
    SEC.도수분포표,
    "easy",
    (rng) =>
      attempt(120, (): Body | null => {
        const t = pick(rng, TOPICS);
        const branch = pick(rng, [0, 1, 2] as const);
        const T = pick(rng, TOTALS);
        const p = pick(rng, RATES);
        if ((T * p) % 100 !== 0) return null;
        const d = (T * p) / 100;
        if (d < 1 || d >= T) return null;
        const i = intBetween(rng, 0, 3);
        const a = t.lo + i * t.w;
        const b = a + t.w;
        const band = `${t.tex(a)} 이상 ${t.tex(b)} 미만`;
        const head = `어느 중학교 학생 $${T}$명의 ${obj(t.subject)} 조사하여 도수분포표로 나타내었다.`;
        if (branch === 0) {
          return {
            content: `${head} ${band}인 계급의 도수가 $${d}$명일 때, 이 계급에 속하는 학생은 전체의 몇 $\\%$인지 구하시오.`,
            answer: `$${p}\\%$`,
            solution: `(계급의 백분율)$=\\dfrac{(\\text{계급의 도수})}{(\\text{도수의 총합})}\\times100$이다.\n따라서 $\\dfrac{${d}}{${T}}\\times100=${p}\\,(\\%)$이다.`,
            facts: { branch, T, d, p, ans: p },
          };
        }
        if (branch === 1) {
          return {
            content: `${head} ${band}인 계급에 속하는 학생이 전체의 $${p}\\%$일 때, 이 계급의 도수를 구하시오.`,
            answer: `$${d}$명`,
            solution: `(계급의 도수)$=$(도수의 총합)$\\times\\dfrac{(\\text{계급의 백분율})}{100}$이다.\n따라서 $${T}\\times\\dfrac{${p}}{100}=${d}$이다.`,
            facts: { branch, T, d, p, ans: d },
          };
        }
        return {
          content: `어느 중학교 학생들의 ${obj(t.subject)} 조사하여 나타낸 도수분포표에서 ${band}인 계급의 도수는 $${d}$명이고, 이 계급에 속하는 학생은 전체의 $${p}\\%$이다. 이 도수분포표에서 도수의 총합을 구하시오.`,
          answer: `$${T}$`,
          solution: `도수의 총합을 $x$라 하면 $\\dfrac{${d}}{x}\\times100=${p}$이다.\n양변에 $x$ 를 곱하여 정리하면 $x=${T}$이다.`,
          facts: { branch, T, d, p, ans: T },
        };
      }),
  ),

  def(MINOR_FREQ, "11", "상대도수", SEC.상대도수, "mid", (rng) =>
    attempt(150, (): Body | null => {
      const branch = pick(rng, [0, 1, 2, 3] as const);
      const T = pick(rng, TOTALS);
      const f1p = pick(rng, RATES);
      const f2p = pick(rng, RATES);
      if ((T * f1p) % 100 !== 0 || (T * f2p) % 100 !== 0) return null;
      const d1 = (T * f1p) / 100;
      const d2 = (T * f2p) / 100;
      if (d1 < 1 || d2 < 1) return null;
      if (branch === 0) {
        if (f1p === f2p) return null;
        return {
          content: `어느 도수분포표에서 도수가 $${d1}$인 계급의 상대도수가 $${dec(f1p)}$이다. 이 도수분포표에서 상대도수가 $${dec(f2p)}$인 계급의 도수를 구하시오.`,
          answer: `$${d2}$`,
          solution: `(도수의 총합)$=\\dfrac{(\\text{계급의 도수})}{(\\text{계급의 상대도수})}=\\dfrac{${d1}}{${dec(f1p)}}=${T}$이다.\n따라서 구하는 도수는 $${T}\\times${dec(f2p)}=${d2}$이다.`,
          facts: { branch, T, d1, f1p, d2, f2p, ans: d2 },
        };
      }
      if (branch === 1) {
        return {
          content: `어떤 도수분포표에서 도수의 총합이 $${T}$일 때, 상대도수가 $${dec(f1p)}$인 계급의 도수를 구하시오.`,
          answer: `$${d1}$`,
          solution: `(계급의 도수)$=$(도수의 총합)$\\times$(계급의 상대도수)이다.\n따라서 $${T}\\times${dec(f1p)}=${d1}$이다.`,
          facts: { branch, T, d1, f1p, ans: d1 },
        };
      }
      if (branch === 2) {
        return {
          content: `어떤 도수분포표에서 상대도수가 $${dec(f1p)}$인 계급의 도수가 $${d1}$일 때, 도수의 총합을 구하시오.`,
          answer: `$${T}$`,
          solution: `(도수의 총합)$=\\dfrac{(\\text{계급의 도수})}{(\\text{계급의 상대도수})}$이다.\n따라서 $\\dfrac{${d1}}{${dec(f1p)}}=${T}$이다.`,
          facts: { branch, T, d1, f1p, ans: T },
        };
      }
      if (f1p === f2p) return null;
      return {
        content: `어느 도수분포표에서 도수가 $${d1}$인 계급의 상대도수가 $${dec(f1p)}$일 때, 도수가 $${d2}$인 계급의 상대도수를 구하시오.`,
        answer: `$${dec(f2p)}$`,
        solution: `(도수의 총합)$=\\dfrac{${d1}}{${dec(f1p)}}=${T}$이다.\n따라서 구하는 상대도수는 $\\dfrac{${d2}}{${T}}=${dec(f2p)}$이다.`,
        facts: { branch, T, d1, f1p, d2, f2p, ans: f2p / 100 },
      };
    }),
  ),

  def(
    MINOR_FREQ,
    "15",
    "도수의 총합이 다른 두 집단의 상대도수",
    SEC.상대도수,
    "mid",
    (rng) =>
      attempt(200, (): Body | null => {
        const t = pick(rng, TOPICS);
        const branch = pick(rng, [0, 1, 2] as const);
        const i = intBetween(rng, 0, 3);
        const a = t.lo + i * t.w;
        const b = a + t.w;
        const band = `${t.tex(a)} 이상 ${t.tex(b)} 미만`;
        if (branch === 1) {
          // 두 집단을 합쳤을 때의 상대도수 — 가중평균이 백분율 정수로 떨어져야 한다.
          //
          // 재시도로 «되기를 바라는» 대신 **구조로 보장**한다: 전체를 $100k$ 명으로
          // 잡고 $\frac15$ 단위로 가르면 각 집단이 $20$ 의 배수가 되고, 상대도수를
          // $5\%$ 단위로 잡으면 도수도 가중평균도 반드시 정수가 된다.
          const total = 100 * intBetween(rng, 1, 3);
          const j = intBetween(rng, 1, 4);
          const nM = (total * j) / 5;
          const nF = total - nM;
          const fMp = pick(rng, RATES5);
          const fFp = pick(rng, RATES5);
          if (fMp === fFp) return null;
          const sum = nM * fMp + nF * fFp;
          if (sum % total !== 0) return null;
          const fAllp = sum / total;
          return {
            content: `어느 공연의 관람객 중 남자는 $${nM}$명, 여자는 $${nF}$명이다. 관람객들의 ${obj(t.subject)} 조사하였더니 ${band}인 계급의 상대도수가 남자는 $${dec(fMp)}$, 여자는 $${dec(fFp)}$이었다. 이 계급의 전체 관람객에 대한 상대도수를 구하시오.`,
            answer: `$${dec(fAllp)}$`,
            solution: `이 계급의 도수는 남자가 $${nM}\\times${dec(fMp)}=${(nM * fMp) / 100}$, 여자가 $${nF}\\times${dec(fFp)}=${(nF * fFp) / 100}$이다.\n전체 관람객은 $${nM}+${nF}=${nM + nF}$명이므로 상대도수는 $\\dfrac{${(nM * fMp) / 100}+${(nF * fFp) / 100}}{${nM + nF}}=${dec(fAllp)}$이다.`,
            facts: { branch, nM, nF, fMp, fFp, fAllp, ans: fAllp / 100 },
          };
        }
        const nA = pick(rng, TOTALS);
        const nB = pick(rng, TOTALS);
        if (nA === nB) return null;
        const fAp = pick(rng, RATES);
        const fBp = pick(rng, RATES);
        if (fAp === fBp) return null;
        if ((nA * fAp) % 100 !== 0 || (nB * fBp) % 100 !== 0) return null;
        const dA = (nA * fAp) / 100;
        const dB = (nB * fBp) / 100;
        if (dA < 1 || dB < 1) return null;
        const head = `A 중학교 학생 $${nA}$명과 B 중학교 학생 $${nB}$명의 ${obj(t.subject)} 조사하였더니 ${band}인 학생이 A 중학교는 $${dA}$명, B 중학교는 $${dB}$명이었다.`;
        const rateLine = `A 중학교의 상대도수는 $\\dfrac{${dA}}{${nA}}=${dec(fAp)}$, B 중학교의 상대도수는 $\\dfrac{${dB}}{${nB}}=${dec(fBp)}$이다.`;
        if (branch === 0) {
          const bigp = Math.max(fAp, fBp);
          return {
            content: `${head} 두 학교 중 이 계급의 상대도수가 더 큰 학교의 상대도수를 구하시오.`,
            answer: `$${dec(bigp)}$`,
            solution: `${rateLine}\n따라서 더 큰 상대도수는 $${dec(bigp)}$이다.`,
            facts: { branch, nA, dA, fAp, nB, dB, fBp, ans: bigp / 100 },
          };
        }
        const gap = Math.abs(fAp - fBp);
        return {
          content: `${head} 이 계급에 대한 두 학교의 상대도수의 차를 구하시오.`,
          answer: `$${dec(gap)}$`,
          solution: `${rateLine}\n따라서 두 상대도수의 차는 $${dec(gap)}$이다.`,
          facts: { branch, nA, dA, fAp, nB, dB, fBp, ans: gap / 100 },
        };
      }),
  ),

  def(
    MINOR_FREQ,
    "16",
    "도수의 총합이 다른 두 집단의 상대도수의 비",
    SEC.상대도수,
    "hard",
    (rng) =>
      attempt(120, (): Body | null => {
        const t = pick(rng, TOPICS);
        const branch = pick(rng, [0, 1, 2] as const);
        // 총합의 비 $a:b$, 도수의 비 $c:d$ → 상대도수의 비 $\frac ca:\frac db=cb:da$
        let a: number;
        let b: number;
        let c: number;
        let d: number;
        if (branch === 0) {
          a = intBetween(rng, 1, 5);
          b = intBetween(rng, 1, 5);
          c = intBetween(rng, 1, 5);
          d = intBetween(rng, 1, 5);
          if (gcd(a, b) !== 1 || gcd(c, d) !== 1) return null;
          if (a === b && c === d) return null;
        } else if (branch === 1) {
          a = 10 * intBetween(rng, 4, 12);
          b = 10 * intBetween(rng, 4, 12);
          if (a === b) return null;
          c = intBetween(rng, 1, 5);
          d = intBetween(rng, 1, 5);
          if (gcd(c, d) !== 1) return null;
        } else {
          a = 100 * intBetween(rng, 2, 8);
          b = 100 * intBetween(rng, 2, 8);
          if (a === b) return null;
          c = 1;
          d = 1;
        }
        const p0 = c * b;
        const q0 = d * a;
        const g = gcd(p0, q0);
        const p = p0 / g;
        const q = q0 / g;
        // 이미 기약이면 «$=3:10=3:10$» 처럼 같은 비를 두 번 쓰지 않는다.
        const reduced = g > 1 ? `${p0}:${q0}=${p}:${q}` : `${p}:${q}`;
        // 갈래 0 의 총합은 «$4k$, $k$» 라 분모에도 $k$ 를 남긴다 — 바로 위 줄에서
        // 그렇게 놓아 놓고 분모를 $4$ 라고 쓰면 앞뒤가 어긋난다.
        // 분자에 $m$ 이 남으므로 제품 전처리의 «정수 가분수 → 대분수» 도 안 걸린다.
        const denA = branch === 0 ? coef(a, "k") : String(a);
        const denB = branch === 0 ? coef(b, "k") : String(b);
        const over = (num: string, den: string): string =>
          den === "1" ? num : `\\dfrac{${num}}{${den}}`;
        const ratioLine = `(상대도수의 비)$=${over(coef(c, "m"), denA)}:${over(coef(d, "m"), denB)}=${reduced}$이다.`;
        if (branch === 0) {
          return {
            content: `A, B 두 반의 도수의 총합의 비가 $${a}:${b}$이고 어떤 계급의 도수의 비가 $${c}:${d}$일 때, 이 계급의 상대도수의 비를 가장 간단한 자연수의 비로 나타내시오.`,
            answer: `$${p}:${q}$`,
            solution: `도수의 총합을 각각 $${coef(a, "k")}$, $${coef(b, "k")}$, 그 계급의 도수를 각각 $${coef(c, "m")}$, $${coef(d, "m")}$이라 하자.\n${ratioLine}`,
            facts: { branch, a, b, c, d, p, q },
          };
        }
        if (branch === 1) {
          return {
            content: `A, B 두 회사의 직원은 각각 $${a}$명, $${b}$명이다. 두 회사 직원들의 ${obj(t.subject)} 조사한 도수분포표에서 어떤 계급의 도수의 비가 $${c}:${d}$일 때, 이 계급의 상대도수의 비를 가장 간단한 자연수의 비로 나타내시오.`,
            answer: `$${p}:${q}$`,
            solution: `그 계급의 도수를 각각 $${coef(c, "m")}$, $${coef(d, "m")}$이라 하자.\n${ratioLine}`,
            facts: { branch, a, b, c, d, p, q },
          };
        }
        return {
          content: `A, B 두 학교의 전체 학생 수는 각각 $${a}$명, $${b}$명이다. 어떤 계급에 속하는 학생 수가 두 학교에서 서로 같을 때, 이 계급의 상대도수의 비를 가장 간단한 자연수의 비로 나타내시오.`,
          answer: `$${p}:${q}$`,
          solution: `그 계급의 도수를 두 학교 모두 $m$이라 하자.\n${ratioLine}`,
          facts: { branch, a, b, c, d, p, q },
        };
      }),
    // 답이 «$3:4$» 같은 작은 자연수의 비라 발문의 «도수의 비»와 겹치는 것이
    // 정상이다 — 답이 새는 것이 아니므로 겹침 검사를 걸지 않는다.
    () => [],
  ),
];

/** 이 세션이 등록하는 전량 — `generate.ts` 는 이 한 줄만 spread 한다. */
export const M1_STAT_TYPES: TypeEntry[] = [...M1_SPHERE, ...M1_FREQ];
