/**
 * 중2 **확대 갈래 2차 물결**(`심화중`·`심화상`) — D-116.
 *
 * ## ⑴ 왜 새 파일인가
 *
 * 1차 물결이 `m2Top.ts` 에 다섯을 세웠고, 그 파일을 잠그는 시험
 * (`middleTopM2.test.ts`)이 **`expect(M2_TOP.length).toBe(5)`** 로 개수를 얼려 두었다.
 * 거기에 넷을 더하면 그 줄이 빨개지고, 초록으로 되돌리는 **유일한 길이 남의 가드를
 * 무르는 것**이 된다(`m1Top.ts`·`midSupB.ts` 머리말이 같은 자리에 선 까닭). 그리고
 * 오르카 다중 세션이 같은 파일을 동시에 만지면 병합에서 부딪힌다 —
 * 새 파일 하나 + `generate.ts` **spread 한 줄**이면 그 둘을 다 피한다.
 * (그 한 줄은 **리드가** 넣는다. 이 파일은 `generate.ts` 를 건드리지 않는다.)
 *
 * ## ⑵ 유형마다 — 안 굳는 마디 / 무엇이 굳히나 / 같은 소단원 심화하와 무엇이 다른가
 *
 * | 키 | 갈래 | 안 굳는 마디 | 무엇이 굳히나 | 심화하와 다른 축 |
 * |---|---|---|---|---|
 * | `유리수와 순환소수\|31U` | **심화상** | 분모의 자연수 $x$ | 굳지 **않는다** — 「기약분수의 분모가 $2$·$5$ 뿐」은 후보의 «꼴»만 말한다. $x$ 의 남은 소인수가 **분자와 약분되면** 그것도 살아서, 사는 집합이 등차수열이 아니다. $N$ 이하를 하나씩 대어 봐야 갈린다 | 심화하 `10`·`19` 는 미지수가 **분자**에 있고 답이 한 값·개수다. 이쪽은 미지수가 **분모**에 있고 **분자와 약분될 수 있다**는 축이 새로 열린다 |
 * | `단항식의 계산\|32U` | **심화중** | 세 거듭제곱의 **값** | 그 소단원의 지수법칙 ⑶ $\left(a^{m}\right)^{n}=a^{mn}$ — 지수의 **최대공약수**로 맞추면 지수가 같아져 **밑만** 견주면 된다. 값을 한 번도 계산하지 않는다 | 심화하 `07`·`15`·`16` 은 셋 다 **한 수**를 다른 꼴로 고친다. 이 소단원에 **여러 수를 견주는** 갈래가 없다 — 축이 「고치기」에서 「견주기」로 바뀐다 |
 * | `일차부등식\|33U` | **심화중** | 상수 $a$ | 그 소단원의 개념 — 해가 $x\le k$ 꼴이므로 **자연수인 해의 개수는 $k$ 를 넘지 않는 가장 큰 정수**다. 그래서 $n\le k<n+1$ 한 줄이 후보를 하나도 만들지 않고 구간을 낸다. 마디는 **등호가 어느 쪽에 붙는가**다 | 심화하 `63` 은 **해집합을 통째로** 주므로 등식이 서고 마디가 **부호**다. 응용 `62` 는 계수를 다 주고 개수를 묻는 **순방향**이라 화살표가 반대다 |
 * | `일차함수와 그 그래프  ⑵\|34U` | **심화상** | 그때 **누가 앞에 있는가** | 굳지 **않는다** — 두 사람 사이의 거리가 하나의 일차식이 아니라 따라잡는 때를 경계로 **두 일차식**이고, 발문은 어느 구간인지 안 준다. 두 구간에서 **각각** 풀어 봐야 하고 **둘 다 산다** | 심화하 `54`(양초)·응용 `12`(마주 보고 만나기)는 일차식 **하나**에 답 **하나**다. 이쪽은 같은 방향 추격이라 식이 둘로 갈리고 답도 둘이다 |
 *
 * ## ⑶ 🔴 초등이 네 물결에 걸쳐 물린 함정 셋 — 여기서 어떻게 피했나
 *
 * ㉠ **창을 한쪽 끝만 주면 굳힘이 장식이 된다.** 「살아남는 후보가 언제나 목록의
 *    같은 자리」면 굳힘 조건은 «어느 후보인가»를 한 번도 안 고른다(정보는 있고
 *    **선택력이 0**). 초6 에서 갈래 둘이 이것으로 병합이 막혔다(23/23 · 672/672 전수).
 *    - `31U` — 답이 후보 하나가 아니라 **후보 전부의 합**이다. 목록의 어느 자리도
 *      답이 될 수 없으므로 「끝(또는 처음)을 집으면 맞다」가 **구조적으로** 성립하지
 *      않는다. 그래도 시험은 「첫/끝만 읽고 낸 값」을 따로 재서 «축이 없다»와
 *      «축이 초록이다»를 가른다.
 *      그리고 **분모의 홀수 소인수**($q$)를 반드시 넣어 「분모를 안 읽어도 된다」는
 *      지름길을 막았다 — 그것을 안 지우고 풀면 답이 달라진다(불변식으로 잠근다).
 *    - `32U` — 후보 목록(세 수)이 실재하므로 불변식으로 막는다: 참 순서가
 *      ㉮ 지면에 적은 차례도 ㉯ 그 역도 ㉰ 「밑만 보고 찍은 순서」도 ㉱ 「지수만 보고
 *      찍은 순서」도 **아니어야** 한다. 게다가 지면에 적는 차례를 밑 차례와
 *      어긋나게 섞어 「적힌 차례 = 밑 차례」도 못 되게 한다.
 *    - `33U` — 후보 목록이 **아예 없다**(값이 하나의 구간으로 굳는다). 이 축은
 *      여기 없다 — 「없다」와 「초록이다」를 가르려고 그 사실을 시험에 **적어 둔다**.
 *    - `34U` — 답이 **두 시각을 다 적는 것**이라 한 자리를 집어서는 맞을 수 없다.
 *      🔴 그리고 **「그 합을 구하시오」로 묻지 않는다** — $t_1+t_2=2H/D$ 라 목표
 *      거리 $d$ 와 **무관**해서, 합을 물으면 $d$ 를 한 번도 안 읽고 답이 나오는
 *      «정보는 있고 선택력이 0» 인 문항이 된다. 「두 시각의 차」도 같은 까닭으로
 *      안 묻는다($2d/D$ 라 이번엔 $L$ 이 장식이 된다). 시험이 **$d$ 를 바꾸면
 *      답이 바뀌는가**·**$L$ 을 바꾸면 답이 바뀌는가**를 둘 다 잰다.
 *
 * ㉡ **「굳힘이 항등식」** — 굳힘 조건을 지우고 같은 값으로 다시 풀어 답이 그대로면
 *    그것은 굳힘이 아니라 장식이다. 초등에서 이 검사로만 갈래 넷이 걸렸다.
 *    넷 다 굳힘 조건을 **인자로 받는 순수 함수**로 뽑아 두었다 —
 *    `finiteDecimalSurvivors` · `ascendingChain` · `constantRangeForCount` ·
 *    `chaseTimes`. 시험이 그 인자를 흔들어 답이 실제로 달라지는지 잰다.
 *
 * ㉢ **갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 같이
 *    실린다. 넷 다 위 표의 「심화하와 다른 축」을 **먼저 읽고** 정했고, 발문의 첫
 *    문장이 형제와 닮지 않게 지었다(`31U` 는 응용 `09` 의 「$a$ 를 곱하면」 꼴을
 *    안 쓰고 분모에 $x$ 를 직접 놓는다).
 *
 * ## ⑷ 번호 규약 — **`U` 접미사**
 *
 * `extensionNumberReason`(`src/__tests__/helpers/rpmCatalog.ts`)이 「숫자+영문 대문자
 * 한 글자」를 「색인 번호와 절대 안 겹친다」로 통과시킨다. 이미 `A`(색인 밖 보강)와
 * `T`(1차 물결)가 쓰였으므로 2차 물결은 **`U`** 다 — `31U`~`34U`.
 *
 * ## ⑸ 계약 (이웃 모듈과 한 벌)
 *
 * 1. **정답을 먼저 뽑고 발문을 역산한다.**
 * 2. `facts` 로 정답 문자열을 **다시 지을 수 있다**(시험이 왕복으로 잠근다).
 *    답이 수 하나인 갈래(`31U`)는 `facts.x` 가 그 수다. 답이 수가 아니거나 여럿인
 *    갈래는 정직하게 적는다 — `33U` 는 `facts.x` 가 **구간의 왼쪽 끝**(답 문자열의
 *    첫 수), `34U` 는 **첫 시각**, `32U` 는 답에 수가 아예 없어 `x` 를 **안 싣는다.**
 *    「facts.x 가 답」을 지킬 수 없는 자리에 억지로 수를 실으면 그 수가 곧 거짓말이
 *    된다 — 그래서 더 센 계약(왕복 재구성)으로 바꾸고 그 사실을 여기 적는다.
 * 3. 숫자는 전부 `$...$` 안에 (`elementary/rules` `bareNumbers` 가드).
 * 4. `attempt` 가 다 떨어지면 **던진다** — 조용히 기본값을 내지 않는다.
 * 5. 그림이 없으므로 발문이 **지면을 가리키지 않는다**(`pointsAtFigure`).
 * 6. 🔴 **해설이 걸음을 건너뛰지 않는다** (D-116 ⑸). 「풀면」·「구하면」 뒤에 중간
 *    결과 없이 답만 오면 안 된다. 후보를 견주는 갈래(`31U`·`34U`)는 **후보를 하나씩
 *    적고 각각 왜 살고 죽는지**까지 적는다.
 *
 * ## ⑹ 정찰과 달라진 것 — 근거를 남긴다
 *
 * 정찰은 `31U` 의 분자 소수를 $\{7,11,13\}$ 으로 적었다. 그런데 그 갈래의 불변식
 * ㉮(「분자와 약분되어 사는 것이 **둘 이상**」)은 $11$·$13$ 에서 **만족될 수가 없다** —
 * $11\cdot2=22$, $13\cdot2=26$ 이라 위끝 $N\le20$ 안에 둘째가 안 들어온다(실측).
 * 그래서 분자의 소수는 $\{3,7\}$ 로 하고, 정찰이 안 본 축을 하나 더 열었다:
 * **분모에도 홀수 소인수 $q$ 를 두어 먼저 약분하게 한다**($\dfrac{21}{2^{2}\times3\times5\times x}$).
 * 이것이 없으면 분모의 값을 **한 번도 안 읽고** 답을 낼 수 있다 — 있으면 안 읽은
 * 학생은 틀린다(불변식 `naive` 가 그것을 잠근다).
 */
import { intBetween, pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";

import { attempt } from "./m1Shared";
import { eulReul, euroRo, waGwa } from "./m2Josa";
import type { MidProblem, TypeEntry } from "./types";

const GRADE = "중2";
const BOOK = "2-1";

/** RPM 색인 정본(`scripts/rpm/rpm-type-catalog.json`)의 중단원 이름 — 글자 그대로. */
const MINOR_DECIMAL = "유리수와 순환소수";
const MINOR_MONO = "단항식의 계산";
const MINOR_INEQ = "일차부등식";
/**
 * ⚠️ **가는 공백(U+2009)** 이 「그래프」와 「⑵」 사이에 있다. 눈으로 옮겨 적으면
 * 보통 공백이 되어 색인 조회가 **조용히** 빗나간다(2026-08-23 물결 2D 가 물린 자리).
 * 그래서 이스케이프로 못 박는다 — 이 줄은 눈으로도 다르게 보인다.
 */
const MINOR_FUNC = "일차함수와 그 그래프\u2009 ⑵";

/** 우리 `Unit.section` 정확한 이름 (`prisma/seed-data/units.ts` 실측). */
const SEC = {
  유리수와소수: "유리수와 소수",
  지수법칙: "지수법칙",
  일차부등식: "일차부등식의 풀이",
  일차함수활용: "일차함수의 활용(속력, 도형, 기타)",
} as const;

type Body = Pick<
  MidProblem,
  "content" | "answer" | "solution" | "facts" | "figureSpec"
>;

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

// ── 셈 소품 (시험은 **다른 길로** 다시 잰다) ──────────────────

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

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/**
 * 주격 조사 — 받침 판정은 `m2Josa.eulReul` **한 곳**에서 온다(규칙을 두 벌로 안 둔다).
 * `m2Top.ts`·`midSupB.ts` 가 같은 이유로 같은 함수를 들고 있다.
 */
function iGa(n: number): "이" | "가" {
  return eulReul(n) === "을" ? "이" : "가";
}

/** 보조사 — `$7$은` · `$5$는`. 받침 판정도 같은 한 곳에서 온다. */
function eunNeun(n: number): "은" | "는" {
  return eulReul(n) === "을" ? "은" : "는";
}

/** 지수 $1$ 은 지면에 안 쓴다 — `2^{1}` 은 값이 맞고 **지면만 흉하다**(`pageSmells`). */
function powTex(base: number, e: number): string {
  return e === 1 ? `${base}` : `${base}^{${e}}`;
}

/** 목록을 `$1$, $2$, $3$` 꼴로. */
function listTex(xs: readonly number[]): string {
  return xs.map((v) => `$${v}$`).join(", ");
}

// ═══════════════════════════════════════════════════════════
// 31U  분모의 미지수가 **분자와 약분되어** 유한소수가 되는 경우  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 🔴 **여기서는 후보가 굳지 않는다.**
 *
 * 「기약분수의 분모의 소인수가 $2$ 와 $5$ 뿐」이라는 성질은 «$x$ 자체가 $2^{a}5^{b}$
 * 꼴이어야 한다»로 좁혀지지 **않는다** — $x$ 의 남은 소인수가 **분자와 약분되면**
 * 그것도 산다. 그래서 사는 집합은 $\{2^{a}5^{b}\}\cup p\{2^{a}5^{b}\}$ 라는
 * **등차수열이 아닌 집합**이고, 위끝 이하를 하나씩 대어 실제로 약분해 봐야 갈린다.
 * 후보를 하나만 짚어 내는 조건이 발문에 없다는 것이 이 갈래를 «상»으로 만든다
 * (D-115 ⑾).
 *
 * @param oddNumerator 약분에 쓰일 **분자의 홀수부**. 이것이 굳힘의 인자다 —
 *   $1$ 을 주면 「분자와 약분된다」축이 통째로 지워진 판이 된다(시험이 그것으로 ㉡ 을 잰다).
 * @param limit 위끝 $N$.
 */
export function finiteDecimalSurvivors(
  oddNumerator: number,
  limit: number,
): number[] {
  const out: number[] = [];
  for (let x = 1; x <= limit; x += 1) {
    let d = x / gcd(oddNumerator, x);
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    if (d === 1) out.push(x);
  }
  return out;
}

/** `2^{2}\times3\times5` — 소인수를 오름차순으로 늘어놓는다. */
function denomTex(twoExp: number, oddPrime: number, fiveExp: number): string {
  const rest =
    oddPrime < 5
      ? [`${oddPrime}`, powTex(5, fiveExp)]
      : [powTex(5, fiveExp), `${oddPrime}`];
  return [powTex(2, twoExp), ...rest].join("\\times");
}

/** 분모에서 $2$ 와 $5$ 를 걷어 낸 나머지 — 「왜 무한소수인가」의 근거. */
function oddLeftover(n: number): number {
  let d = n;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d;
}

const FINITE_DECIMAL: TypeEntry[] = [
  def(
    MINOR_DECIMAL,
    "31U",
    "분모의 미지수가 분자와 약분되어 유한소수가 되는 경우",
    SEC.유리수와소수,
    "심화상",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        // 분자의 홀수부 $p$ — 이것이 «약분되어 사는» 후보를 만든다.
        const p = pick(rng, [3, 7] as const);
        // 분모의 홀수 소인수 $q$ — **먼저 약분해야** 한다. 이것이 없으면 분모를
        // 한 번도 안 읽고 답이 나온다(㉠ 「정보는 있고 선택력이 0」).
        const q = pick(rng, [3, 7, 11, 13] as const);
        if (q === p) return null;
        const twoExp = intBetween(rng, 1, 3);
        const fiveExp = intBetween(rng, 1, 2);
        const limit = intBetween(rng, 14, 18);
        const numer = p * q;
        const den = 2 ** twoExp * 5 ** fiveExp;

        const kept = finiteDecimalSurvivors(p, limit);
        if (kept.length < 5) return null;
        // ㉮ 「분자와 약분되어 사는 것」이 **둘 이상** — 하나도 없으면 「$x$는
        //    $2^{a}5^{b}$ 꼴」 한 줄로 끝나 «중»으로 내려앉는다.
        //
        // 🟡 지금 위끝이 $[14,18]$ 이라 이 줄은 **한 번도 거부하지 않는다**($p=7$ 이면
        //    $7$·$14$, $p=3$ 이면 $3$·$6$·$12$ 가 늘 들어온다). 변이 하네스가 이것을
        //    「무효한 변이(산출물 동일)」로 정확히 찍었다 — 곧 이 줄만 봐서는 축이
        //    살아 있는지 알 수 없다. **축이 산 것은 위끝을 $[8,12]$ 로 좁힌 변이가
        //    빨개져서** 증명됐고(검산기의 같은 이름 불변식이 문다), 시험의 음성 대조
        //    지면(`분수 $\dfrac{33}{2\times3\times5\times x}$ … $9$ 이하`)이 그것을
        //    회차마다 다시 보인다. 범위를 좁히는 날을 위해 남긴다.
        const cancelled = kept.filter((x) => x % p === 0);
        if (cancelled.length < 2) return null;
        // ㉯ 죽는 것이 위끝의 $\tfrac13$ 이상 — 안 그러면 「거의 다 산다」가 된다.
        const dead = [];
        for (let x = 1; x <= limit; x += 1) if (!kept.includes(x)) dead.push(x);
        if (dead.length * 3 < limit) return null;
        // ㉰ 「약분 축을 지운 판」과 답이 달라야 한다 (㉡ 굳힘이 항등식이 아니다).
        if (sum(finiteDecimalSurvivors(1, limit)) === sum(kept)) return null;
        // ㉱ 「분모의 홀수 소인수를 안 지운 판」과도 달라야 한다 (㉠ 지름길 차단).
        if (sum(finiteDecimalSurvivors(numer, limit)) === sum(kept))
          return null;

        const x = sum(kept);
        const reduced = (v: number): string => {
          const g = gcd(p, v);
          return `\\dfrac{${p / g}}{${(den * v) / g}}`;
        };
        const roll = [];
        for (let v = 1; v <= limit; v += 1) {
          roll.push(`$x=${v}$일 때 $${reduced(v)}$`);
        }
        // 🔴 **약분을 하고 나서 남는 것을 적어야 한다.** `oddLeftover(den * v)` 는
        //    분자 $p$ 와의 약분을 빼먹어, $p=3$ · $x=9$ 에서 「$9$가 남는다」고 적었다
        //    (참은 $3$ — 바로 윗줄이 $\dfrac{1}{300}$ 이라 **해설이 스스로 모순**이었다).
        //    값·냄새·조사·렌더가 전부 초록인 부류라 관문이 침묵한다. 실측 42.5% 문항.
        const leftoverOf = (v: number): number =>
          oddLeftover((den * v) / gcd(p, v));
        const deadWhy = dead
          .map((v) => `$x=${v}$일 때는 $${leftoverOf(v)}$`)
          .join(", ");
        const lastDead = leftoverOf(dead[dead.length - 1]!);
        const cancelWhy = cancelled
          .map((v) => `$x=${v}$일 때 $${reduced(v)}$`)
          .join(", ");
        // 약분되어 사는 자리는 분자가 반드시 $1$ 로 줄어든다 — 읽는 끝 글자가 「일」이다.
        const lastCancelNumer = p / gcd(p, cancelled[cancelled.length - 1]!);
        // 🔴 「$p$ 의 배수면 산다」가 **아니다** — $p^{2}$ 의 배수는 하나가 남아 죽는다.
        //    그 반례가 실제로 목록 안에 있을 때만 적는다(없는 것을 설명하면 헛말이다).
        const squareCaveat =
          p * p <= limit
            ? ` 다만 $x$가 $${p * p}$의 배수이면 $${p}$${iGa(p)} 하나 남으므로 유한소수가 되지 않는다.`
            : "";
        return {
          content: `분수 $\\dfrac{${numer}}{${denomTex(twoExp, q, fiveExp)}\\times x}$${iGa(numer)} 유한소수가 되도록 하는 $${limit}$ 이하의 자연수 $x$의 값을 모두 구하여 그 합을 구하시오.`,
          answer: `$${x}$`,
          solution: [
            `유한소수는 기약분수로 나타내었을 때 분모의 소인수가 $2$ 또는 $5$뿐인 분수이다.`,
            `먼저 분자와 분모에 공통으로 있는 소인수 $${q}$${eulReul(q)} 약분하면 $\\dfrac{${numer}}{${denomTex(twoExp, q, fiveExp)}\\times x}=\\dfrac{${p}}{${den}x}$이다.`,
            `그러므로 $\\dfrac{${p}}{${den}x}$의 분모 $${den}x$에서 $2$${waGwa(2)} $5$가 아닌 소인수가 남지 않아야 한다. 이때 $x$가 $${p}$의 배수이면 그중 $${p}$ 하나가 분자와 약분되어 사라지므로, $x$가 반드시 $2$${waGwa(2)} $5$만으로 이루어진 수일 필요는 없다.${squareCaveat}`,
            `$x=1$부터 $x=${limit}$까지 차례로 기약분수로 나타내면 ${roll.join(", ")}이다.`,
            `이 중 분모의 소인수가 $2$ 또는 $5$뿐인 것은 $x$의 값이 ${listTex(kept)}일 때이다.`,
            `나머지는 분모에 다른 소인수가 남아 무한소수가 된다 — ${deadWhy}${iGa(lastDead)} 남는다.`,
            `특히 ${cancelWhy}${iGa(lastCancelNumer)} 되어, 분자 $${p}$${waGwa(p)} 약분된 덕분에 유한소수가 된다.`,
            `따라서 구하는 합은 $${kept.join("+")}=${x}$이다.`,
          ].join("\n"),
          facts: {
            x,
            p,
            q,
            numer,
            den,
            limit,
            kept: kept.length,
            dead: dead.length,
            cancelled: cancelled.length,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 32U  지수를 맞추어 **세 거듭제곱의 대소** 비교하기  (심화중)
// ═══════════════════════════════════════════════════════════

const LABELS = ["a", "b", "c"] as const;

/**
 * 값이 작은 것부터 이름을 이어 붙인다 — `b<a<c`.
 *
 * 🔴 **굳힘의 인자가 곧 `values` 다.** 「밑^{맞춘 지수}」를 주면 참 순서가 나오고,
 * 밑만 주면 「밑만 보고 찍은 순서」, 지면 지수만 주면 「지수만 보고 찍은 순서」가
 * 나온다. 셋이 **서로 달라야** 이 유형이 성립한다 — 시험이 그 셋을 다 만들어 견준다.
 */
export function ascendingChain(values: readonly number[]): string {
  const idx = values.map((_v, i) => i);
  idx.sort((i, j) => values[i]! - values[j]!);
  return idx.map((i) => LABELS[i]!).join("<");
}

const COMPARE_POWERS: TypeEntry[] = [
  def(
    MINOR_MONO,
    "32U",
    "지수를 맞추어 세 거듭제곱의 대소 비교하기",
    SEC.지수법칙,
    "심화중",
    (rng): Body =>
      attempt(4000, (): Body | null => {
        const pool = [2, 3, 5, 7] as const;
        const bases: number[] = [];
        while (bases.length < 3) {
          const b = pick(rng, pool);
          if (!bases.includes(b)) bases.push(b);
        }
        // 맞춘 뒤의 지수 — 이것이 곧 밑의 «무게»다.
        const ks = [
          intBetween(rng, 1, 4),
          intBetween(rng, 1, 4),
          intBetween(rng, 1, 4),
        ];
        // 지수의 최대공약수가 정확히 $E$ 라야 해설의 「최대공약수로 맞춘다」가 참이다.
        //
        // 🟡 **변이 시험이 이 줄을 «가드가 아니다»로 찍었다 — 그리고 그 판정이 옳다.**
        //    지금 $k_i\in[1,4]$ 라 최대공약수가 $1$ 이 아닌 세 쌍은 반드시 값이 겹치고,
        //    그러면 아래 「지수가 서로 달라야 한다」가 먼저 문다. 곧 이 줄은 지금
        //    **중복**이다. 그래도 지운다면 범위를 넓히는 날 조용히 깨진다 —
        //    범위를 $[1,6]$ 으로 넓히고 이 줄을 함께 지운 변이는 실제로 **빨강**이었다
        //    (해설이 「최대공약수는 $E$」라고 **거짓말**을 한다). 뜻을 적어 두고 남긴다.
        if (gcd(gcd(ks[0]!, ks[1]!), ks[2]!) !== 1) return null;
        const common = pick(rng, [10, 15, 20, 25, 30] as const);
        const exps = ks.map((k) => k * common);
        if (Math.min(...exps) < 15) return null;
        if (Math.max(...exps) > 120) return null; // 지면에 세 자리 지수를 안 쓴다
        if (new Set(exps).size !== 3) return null;
        const values = bases.map((b, i) => b ** ks[i]!);
        if (new Set(values).size !== 3) return null;

        const truth = ascendingChain(values);
        const byBase = ascendingChain(bases);
        const byExp = ascendingChain(exps);
        // ㉠ 참 순서가 ㉮ 적은 차례 ㉯ 그 역 ㉰ 밑 찍기 ㉱ 지수 찍기 **넷 다**와 달라야 한다.
        if (truth === "a<b<c" || truth === "c<b<a") return null;
        if (truth === byBase || truth === byExp) return null;
        // 「적힌 차례 = 밑 차례」도 막는다 — 지면의 차례가 힌트가 되면 안 된다.
        if (bases[0]! < bases[1]! && bases[1]! < bases[2]!) return null;
        if (bases[0]! > bases[1]! && bases[1]! > bases[2]!) return null;

        const head = LABELS.map(
          (l, i) => `$${l}=${bases[i]}^{${exps[i]}}$`,
        ).join(", ");
        const lines = LABELS.map((l, i) =>
          ks[i] === 1
            ? `$${l}=${bases[i]}^{${common}}$은 이미 지수가 $${common}$이다.`
            : `$${l}=${bases[i]}^{${exps[i]}}=\\left(${bases[i]}^{${ks[i]}}\\right)^{${common}}=${values[i]}^{${common}}$`,
        );
        const sorted = [0, 1, 2].sort((i, j) => values[i]! - values[j]!);
        return {
          content: `세 수 ${head}의 대소를 부등호를 사용하여 나타내시오.`,
          answer: `$${truth}$`,
          solution: [
            `세 수의 지수 $${exps[0]}$, $${exps[1]}$, $${exps[2]}$의 최대공약수는 $${common}$이다.`,
            // 🔴 법칙의 글자를 $a$ 로 쓰면 **발문의 $a$**(= 특정한 수 $5^{15}$)와 부딪힌다.
            //    바로 다음 줄이 「$a=5^{15}$은 이미…」라 인접한 세 줄에서 $a$ 가 두 뜻이 됐다.
            //    이 유형의 통째가 그 법칙을 알아보는 것인데, 법칙을 적는 자리에서 글자가
            //    부딪히면 학생이 못 읽는다. 값·냄새·조사·렌더가 전부 초록인 부류다(400/400).
            `지수법칙 $\\left(A^{m}\\right)^{n}=A^{mn}$을 거꾸로 쓰면 세 수를 모두 지수가 $${common}$인 거듭제곱으로 고칠 수 있다.`,
            lines.join("\n"),
            // 🔴 「(으)로」는 **받침 유무가 아니라 ㄹ 받침인가**로 갈린다 —
            //    $15$(십오)는 「로」, $30$(삼십)은 「으로」다. `josaMismatches` 는
            //    이 축을 **구조적으로 못 본다**(그 자는 을/를·은/는·와/과·가만 본다).
            //    첫 판이 「$15$으로」를 내보냈고 해설을 눈으로 읽어서야 나왔다.
            `이제 지수가 모두 $${common}$${euroRo(common)} 같으므로 밑의 대소만 견주면 된다. $${values[sorted[0]!]}<${values[sorted[1]!]}<${values[sorted[2]!]}$이므로 $${values[sorted[0]!]}^{${common}}<${values[sorted[1]!]}^{${common}}<${values[sorted[2]!]}^{${common}}$이다.`,
            `이때 밑만 견주면 $${byBase}$, 지수만 견주면 $${byExp}$가 되는데 둘 다 실제 대소와 다르다. 지수를 맞추기 전에는 밑도 지수도 대소를 정해 주지 못한다.`,
            `따라서 $${truth}$이다.`,
          ].join("\n"),
          facts: {
            b1: bases[0]!,
            b2: bases[1]!,
            b3: bases[2]!,
            e1: exps[0]!,
            e2: exps[1]!,
            e3: exps[2]!,
            common,
            k1: ks[0]!,
            k2: ks[1]!,
            k3: ks[2]!,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 33U  자연수인 해의 **개수**가 주어질 때 상수의 값의 범위  (심화중)
// ═══════════════════════════════════════════════════════════

export type ConstantRange = {
  /** 왼쪽 끝 — 열려 있다(닫힌 부등식일 때). */
  lo: number;
  /** 오른쪽 끝. */
  hi: number;
  /** 등호가 오른쪽에 붙는가 — `false` 면 왼쪽에 붙는다. */
  closedAtHi: boolean;
};

/**
 * 정리하면 $x\le C-a$(또는 $x<C-a$)일 때, 자연수인 해가 정확히 $n$ 개가 되는 $a$ 의 범위.
 *
 * 🔴 **굳힘의 인자는 `closed` 다.** 부등호에 등호가 붙었는지에 따라 **등호의 자리가
 * 뒤집힌다** — 그것이 이 갈래의 진짜 마디다(값이 아니라 «경계가 어느 쪽에 붙는가»).
 *
 * - `closed`(원래 부등식이 $\ge$): 해는 $x\le C-a$ → $n\le C-a<n+1$ → $C-n-1<a\le C-n$
 * - `open`(원래 부등식이 $>$):    해는 $x<C-a$  → $n<C-a\le n+1$ → $C-n-1\le a<C-n$
 */
export function constantRangeForCount(
  total: number,
  count: number,
  closed: boolean,
): ConstantRange {
  const hi = total - count;
  return { lo: hi - 1, hi, closedAtHi: closed };
}

/** 분수 계수 부등식의 틀 — $uq=v+1$ 이라야 정리한 식의 $x$ 계수가 정확히 $-1$ 이다. */
const INEQ_FRAMES: ReadonlyArray<readonly [number, number, number]> = (() => {
  const out: [number, number, number][] = [];
  for (let u = 2; u <= 5; u += 1) {
    for (let v = 2; v <= 9; v += 1) {
      if (gcd(u, v) !== 1) continue;
      if ((v + 1) % u !== 0) continue;
      const q = (v + 1) / u;
      if (q < 2) continue;
      if (u * v > 30) continue; // 양변에 곱하는 수가 커지면 지면이 지저분하다
      out.push([u, v, q]);
    }
  }
  return out;
})();

const NATURAL_COUNT_RANGE: TypeEntry[] = [
  def(
    MINOR_INEQ,
    "33U",
    "자연수인 해의 개수가 주어질 때 상수의 값의 범위",
    SEC.일차부등식,
    "심화중",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        const [u, v, q] = pick(rng, INEQ_FRAMES);
        const count = intBetween(rng, 4, 9);
        const right = intBetween(rng, 3, 9); // 구간의 오른쪽 끝(정수)
        const total = count + right; // 정리한 식의 상수항 $C$
        // $vp+ur=C$ 가 되도록 분자의 상수를 역산한다.
        const p = intBetween(rng, 1, 6);
        const rest = total - v * p;
        if (rest <= 0) return null;
        if (rest % u !== 0) return null;
        const r = rest / u;
        if (r < 1 || r > 9) return null;

        const range = constantRangeForCount(total, count, true);
        if (range.lo < 1) return null; // 지면에 음수 경계를 안 쓴다
        // ⚠️ ㉡(등호를 떼면 등호의 자리가 뒤집힌다)을 **여기서 재지 않는다.**
        //    이 생성기는 늘 닫힌 부등식($\ge$)만 내므로, 여기서 두 판을 견주는 줄은
        //    **한 번도 거부하지 못하는 «도장»**이 된다(2026-08-23 「도장은 초록을 못
        //    낸다」). 그 축은 시험이 `constantRangeForCount` 를 **직접 흔들어** 잰다.

        const mul = u * v;
        const ineqTex = `\\dfrac{x+${p}}{${u}}-\\dfrac{${q}x-${r}}{${v}}\\ge\\dfrac{a}{${mul}}`;
        return {
          // 「…$\dfrac{a}{15}$를」 — 읽는 끝이 문자 $a$(에이)라 늘 「를」이다.
          //    `eulReul(15)` 로 짓지 않는다(그 수는 읽히는 끝이 아니다).
          content: `$x$에 대한 일차부등식 $${ineqTex}$를 만족시키는 자연수 $x$가 $${count}$개일 때, 상수 $a$의 값의 범위를 구하시오.`,
          answer: `$${range.lo}<a\\le${range.hi}$`,
          solution: [
            `양변에 $${mul}$${eulReul(mul)} 곱하면 $${v}\\left(x+${p}\\right)-${u}\\left(${q}x-${r}\\right)\\ge a$이다.`,
            `괄호를 풀면 $${v}x+${v * p}-${u * q}x+${u * r}\\ge a$이므로 정리하면 $-x+${total}\\ge a$이다.`,
            `양변에서 $${total}$${eulReul(total)} 빼면 $-x\\ge a-${total}$이고, 양변에 $-1$을 곱하면 부등호의 방향이 바뀌어 $x\\le${total}-a$이다.`,
            `이 부등식의 해를 수직선에 나타내면 자연수인 해는 $1$부터 시작해 $${total}-a$를 넘지 않는 것까지이다.`,
            `그 개수가 $${count}$이려면 $${count}$${eunNeun(count)} 해이고 $${count + 1}$${eunNeun(count + 1)} 해가 아니어야 하므로 $${count}\\le${total}-a$이고 $${total}-a<${count + 1}$이어야 한다.`,
            `$${count}\\le${total}-a$에서 $a\\le${range.hi}$이고, $${total}-a<${count + 1}$에서 $a>${range.lo}$이다.`,
            `따라서 $${range.lo}<a\\le${range.hi}$이다.`,
            `실제로 $a=${range.hi}$이면 $x\\le${count}$이므로 자연수인 해는 $${count}$개이고, $a=${range.lo}$이면 $x\\le${count + 1}$이므로 $${count + 1}$개가 되어 조건에 맞지 않는다.`,
          ].join("\n"),
          facts: {
            x: range.lo,
            hi: range.hi,
            count,
            total,
            u,
            v,
            q,
            p,
            r,
          },
          figureSpec: null,
        };
      }),
  ),
];

// ═══════════════════════════════════════════════════════════
// 34U  뒤에서 출발한 사람과의 거리가 주어진 값이 되는 때를 **모두**  (심화상)
// ═══════════════════════════════════════════════════════════

/**
 * 뒤에서 출발한 사람이 앞사람과 거리가 `target` 이 되는 **모든 때**(뒷사람 기준 분).
 *
 * 🔴 **굳힘의 인자는 «구간을 둘로 나눈다»는 것 자체다.** 앞 구간만 보면 답이 하나,
 * 뒤 구간만 보면 다른 하나 — 둘을 다 만들어 견주어야 답이 완성된다(D-115 ⑾ 의 «상»).
 *
 * @param v1 앞사람의 분속 · @param v2 뒷사람의 분속 · @param lead 앞사람이 먼저 간 분
 */
export function chaseTimes(
  v1: number,
  v2: number,
  lead: number,
  target: number,
): number[] {
  const head = v1 * lead; // 뒷사람이 출발할 때 이미 벌어진 거리
  const gap = v2 - v1;
  if (gap <= 0) return [];
  const out: number[] = [];
  for (const t of [(head - target) / gap, (head + target) / gap]) {
    if (t > 0) out.push(t);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

const CHASE_TWO_TIMES: TypeEntry[] = [
  def(
    MINOR_FUNC,
    "34U",
    "뒤에서 출발한 사람과의 거리가 주어진 값이 되는 때를 모두 구하기",
    SEC.일차함수활용,
    "심화상",
    (rng): Body =>
      attempt(2000, (): Body | null => {
        // 정답 두 시각을 **먼저** 뽑고 발문을 역산한다.
        const first = intBetween(rng, 2, 6);
        const gapMin = pick(rng, [2, 4] as const); // 같은 홀짝이라야 만나는 때가 정수다
        const second = first + gapMin;
        const diff = pick(rng, [100, 120, 150, 160, 180] as const); // 속력 차
        const head = (diff * (first + second)) / 2; // 처음 벌어진 거리
        const target = (diff * gapMin) / 2; // 물어보는 거리
        const meet = (first + second) / 2; // 따라잡는 때
        const lead = intBetween(rng, 4, 12);
        if (head % lead !== 0) return null;
        const slow = head / lead;
        if (slow < 50 || slow > 90) return null; // 걷는 속력
        if (slow % 10 !== 0) return null;
        const fast = slow + diff;
        if (fast < 140 || fast > 260) return null; // 자전거 속력
        // 두 답이 실제로 살아야 한다 — $d\ge H$ 이면 앞 구간의 답이 죽어
        // 갈래가 한 식짜리로 내려앉는다.
        if (target >= head) return null;
        const times = chaseTimes(slow, fast, lead, target);
        if (times.length !== 2) return null;
        if (times[0] !== first || times[1] !== second) return null;
        if (!(times[0]! < meet && meet < times[1]!)) return null;
        // ⚠️ ㉠(「$d$ 를 바꾸면 답이 바뀌는가」·「$L$ 을 바꾸면 답이 바뀌는가」)도
        //    **여기서 재지 않는다.** 두 시각은 $(H\mp d)/D$ 이고 $H=v_1L$ 이라
        //    어느 쪽을 흔들어도 반드시 달라진다 — 여기 두면 한 번도 거부하지 못하는
        //    «도장»이다. 그 축은 시험이 `chaseTimes` 를 직접 흔들어 잰다.

        const distSlow = (t: number): string => `${slow * (t + lead)}`;
        const distFast = (t: number): string => `${fast * t}`;
        return {
          content: `형이 집을 출발하여 분속 $${slow}\\,\\mathrm{m}$로 걸어간 지 $${lead}$분 후에 동생이 같은 곳에서 같은 방향으로 분속 $${fast}\\,\\mathrm{m}$로 자전거를 타고 출발하였다. 두 사람 사이의 거리가 $${target}\\,\\mathrm{m}$가 되는 것은 동생이 출발한 지 몇 분 후인지 모두 구하시오.`,
          answer: `$${first}$분 후와 $${second}$분 후`,
          solution: [
            `형은 동생보다 $${lead}$분 먼저 출발하였으므로, 동생이 출발할 때 형은 이미 $${slow}\\times${lead}=${head}$, 곧 $${head}\\,\\mathrm{m}$를 갔다.`,
            `동생이 출발한 지 $x$분 후에 형이 간 거리는 $\\left(${slow}x+${head}\\right)\\,\\mathrm{m}$, 동생이 간 거리는 $${fast}x\\,\\mathrm{m}$이다.`,
            `두 그래프가 만나는 때, 곧 동생이 형을 따라잡는 때는 $${slow}x+${head}=${fast}x$에서 $${diff}x=${head}$이므로 $x=${meet}$이다.`,
            `$0\\le x<${meet}$일 때는 형이 앞서 있으므로 두 사람 사이의 거리는 $\\left(${slow}x+${head}\\right)-${fast}x=${head}-${diff}x$, 곧 $\\left(${head}-${diff}x\\right)\\,\\mathrm{m}$이다.`,
            `이것이 $${target}$${iGa(target)} 되려면 $${head}-${diff}x=${target}$에서 $${diff}x=${head - target}$이므로 $x=${first}$이고, 이것은 $0\\le x<${meet}$${eulReul(meet)} 만족시킨다.`,
            `$x>${meet}$일 때는 동생이 앞서 있으므로 두 사람 사이의 거리는 $${fast}x-\\left(${slow}x+${head}\\right)=${diff}x-${head}$, 곧 $\\left(${diff}x-${head}\\right)\\,\\mathrm{m}$이다.`,
            `이것이 $${target}$${iGa(target)} 되려면 $${diff}x-${head}=${target}$에서 $${diff}x=${head + target}$이므로 $x=${second}$이고, 이것은 $x>${meet}$${eulReul(meet)} 만족시킨다.`,
            `확인하면 $x=${first}$일 때 형은 $${distSlow(first)}\\,\\mathrm{m}$, 동생은 $${distFast(first)}\\,\\mathrm{m}$를 가서 거리가 $${target}\\,\\mathrm{m}$이고, $x=${second}$일 때 형은 $${distSlow(second)}\\,\\mathrm{m}$, 동생은 $${distFast(second)}\\,\\mathrm{m}$를 가서 거리가 $${target}\\,\\mathrm{m}$이다.`,
            `따라서 구하는 때는 $${first}$분 후와 $${second}$분 후이다.`,
          ].join("\n"),
          facts: {
            x: first,
            second,
            slow,
            fast,
            lead,
            target,
            head,
            diff,
            meet,
          },
          figureSpec: null,
        };
      }),
  ),
];

/**
 * 중2 확대 갈래 2차 물결 명부 — `generate.ts` 의 `ALL` 이 이것 하나만 spread 한다
 * (그 한 줄은 **리드가** 넣는다).
 *
 * 갈래별 몫: **심화중 2 · 심화상 2**. 수를 목표로 잡지 않았다 — 세울 수 있는
 * 자리에만 세웠다(D-115 ⑹ 「비우는 단위는 학년이 아니라 소단원」).
 */
export const M2_TOP_2: TypeEntry[] = [
  ...FINITE_DECIMAL,
  ...COMPARE_POWERS,
  ...NATURAL_COUNT_RANGE,
  ...CHASE_TWO_TIMES,
];
