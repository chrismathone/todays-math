/**
 * 초등 문항 **가드** 한 곳. 테스트가 230문항 전량에 이것을 댄다.
 *
 * 원장님 육안 검수(2026-08-22)에서 나온 결함을 낱개로 고치지 않고 규칙으로 접은 자리다
 * (`docs/planning/tracks/elem-engine-review-20260822.md`). 가드가 「끝났다」를 정의한다.
 *
 * ⚠️ **여기 규칙의 «참»은 제품 상수에서 오면 안 된다.** 학년별 허용 연산은 손 목록이 아니라
 * `units.ts`(교육과정 SSOT)의 **단원 순서**에서 끌어온다 — 단원 이름이 바뀌면 조용히
 * 통과하는 대신 **던진다**.
 */
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

/** `$...$` 를 걷어낸 나머지. 여기 숫자가 남으면 KaTeX 밖에 있는 것이다. */
function stripMath(text: string): string {
  return text.replace(/\$[^$]*\$/g, " ");
}

/**
 * KaTeX 밖에 남은 숫자. 원장님: 「모든 숫자는 일반텍스트 말고 KaTeX 이용해서 표현하도록」.
 *
 * 소단원 번호(`2-5-5`)는 화면이 따로 찍는 것이라 본문에 없다 — 본문에 있으면 그것도 결함이다.
 */
export function bareNumbers(text: string): string[] {
  const rest = stripMath(text);
  return rest.match(/\d+(?:\.\d+)?/g) ?? [];
}

/**
 * 답에 샌 부동소수점. 원장님: 「분수 문제에서 소수로 답을 표현하게 하지 말고 대분수로」.
 *
 * 자릿수가 셋을 넘는 소수는 초등 답이 아니다 — `6.333333333333333` 이 그렇게 나갔다.
 */
export function runawayDecimals(text: string): string[] {
  return text.match(/\d+\.\d{4,}/g) ?? [];
}

/** 아라비아 숫자로 쓴 도형 이름. 원장님: 「8각형이 아니라 팔각형」. */
export function arabicPolygons(text: string): string[] {
  return text.match(/\d+\s*각형/g) ?? [];
}

/** 틀에서 안 채운 자리가 그대로 나간 것 — `정n각형`, `n각형`. */
export function unfilledPlaceholders(text: string): string[] {
  return text.match(/[a-zA-Z]각형/g) ?? [];
}

// ── R-조사 — 수식 뒤 조사가 «읽는 소리»와 맞는가 (2026-08-23, elem-g4 이식) ─────
//
// 학년마다 각자 손으로 세던 것을 한곳에 올린다. 그래야 결함이 학년 사이를 안 넘나든다.
//
// ⚠️ **표준(`undefined`)을 포함해 훑어야 한다.** g3 이 실측으로 찾은 뿌리가 이것이다 —
// 각 학년의 조사 검사가 `ELEM_TIERS` 만 순회해 **표준이 통째로 빠져 있었다**(갈래는
// 30여 자리를 잡는데 표준은 구조적으로 0). 대단원 블록을 서로 본떠 썼으니 같은 자리가
// 여러 학년에 있다. 이 함수를 부르는 쪽은 반드시 `[undefined, ...ELEM_TIERS]` 로 돈다.

/**
 * 끝 숫자를 한자 수사로 읽었을 때의 **받침 갈래**.
 *
 * 🔴 예전에는 이 표가 `boolean`(받침이 있나) 하나였다. 그래서 **「로/으로」를 표현할 수
 * 없었다** — 그 조사만은 「받침이 있나」가 아니라 「**ㄹ 받침인가**」로 갈리기 때문이다
 * (일·칠·팔은 받침이 있어도 「로」). 표현할 수 없으니 목록에도 없었고, 그러니
 * **12,240행을 먹여도 0** 이었다. 2026-08-31 적대 검토가 초6 3차분에서 **195문항**을
 * 찾아 낸 자리다 — 그때까지 이 함수의 「0」이 「깨끗」으로 읽히고 있었다.
 *
 * `"l"` = ㄹ 받침(일·칠·팔) · `"other"` = 그 밖의 받침(영·삼·육, 그리고 십·백·천·만) ·
 * `"none"` = 받침 없음(이·사·오·구).
 */
const JOSA_FINAL: Record<string, "none" | "l" | "other"> = {
  "0": "other", // 십(ㅂ)·백(ㄱ)·천(ㄴ)·만(ㄴ)·영(ㅇ) — 어느 쪽으로 읽어도 ㄹ 이 아니다
  "1": "l", // 일
  "2": "none", // 이
  "3": "other", // 삼
  "4": "none", // 사
  "5": "none", // 오
  "6": "other", // 육
  "7": "l", // 칠
  "8": "l", // 팔
  "9": "none", // 구
};

/** 끝 숫자를 한자 수사로 읽었을 때 받침이 있는가. **표는 하나다** — 위에서 유도한다. */
const JOSA_BATCHIM: Record<string, boolean> = Object.fromEntries(
  Object.entries(JOSA_FINAL).map(([d, f]) => [d, f !== "none"]),
);

/**
 * 수 뒤의 「로/으로」. **ㄹ 받침은 「로」**다(일로·칠로·팔로).
 *
 * 🔴 생성기와 판정기가 **같은 표**(`JOSA_FINAL`)를 물게 하려고 여기 둔다.
 * 예전에는 이 함수가 `g6.ts` 에만 있었고 `g4.ts` 에는 없었다 — 그래서 초4 는
 * 조사를 하드코딩했고 **525행**이 틀렸다(2026-08-31 적대 검토 뒤 실측).
 * 세는 쪽과 쓰는 쪽이 갈리면 둘 다 눈이 먼다.
 */
export function numRo(value: number): string {
  const last = String(Math.abs(Math.trunc(value))).slice(-1);
  return JOSA_FINAL[last] === "other" ? "으로" : "로";
}

// TeX permits a single token without braces: \frac12 means \frac{1}{2}.
// The spoken ending still comes from the numerator, not the final source digit.
const FRACTION_TAIL =
  /\\(?:d|t)?frac\s*(?:\{([^{}]+)\}|([^{}\s]))\s*(?:\{[^{}]+\}|[^{}\s])\s*$/;

function fractionNumerator(match: RegExpMatchArray): string | undefined {
  const numerator = (match[1] ?? match[2])?.trim();
  return numerator && /^-?\d+$/.test(numerator) ? numerator : undefined;
}

/**
 * `fmtFrac` 이 낸 글자에서 **마지막으로 읽히는 수**.
 * `11\frac{1}{4}` 는 「십일과 사분의 일」이라 끝소리가 **분자**다.
 */
export function lastSpokenNumber(latex: string): number {
  const frac = latex.match(FRACTION_TAIL);
  if (frac) return Number(fractionNumerator(frac) ?? 0);
  const nums = latex.match(/\d+/g);
  return nums ? Number(nums[nums.length - 1]) : 0;
}

/** 조사가 받침 뒤에 쓰는 것인가. */
const JOSA_NEEDS_BATCHIM: Record<string, boolean> = {
  을: true,
  를: false,
  이: true,
  가: false,
  과: true,
  와: false,
  은: true,
  는: false,
};

/**
 * `$...$` 뒤 조사 중 **틀린 것**만 돌려준다. 잡힌 자리를 있는 그대로 적는다
 * (띄어쓰기까지 보여야 어디를 고칠지 안다).
 *
 * 규칙 넷:
 *  ㉠ **분수는 분자를 마지막에 읽는다** — `\frac{6}{10}` 은 「십분의 육」이라 «을».
 *  ㉡ 그 밖은 **끝 숫자**의 소리로 정한다.
 *  ㉢ 뒤에 한글이 이어지면 조사가 아니다 — 「$3$ **은행**나무」의 «은» 은 낱말의 첫 글자다.
 *  ㉣ 🔴 **「로/으로」는 «받침이 있나»가 아니라 «ㄹ 받침인가»로 갈린다** — 일·칠·팔은
 *    받침이 있어도 「로」다. 다른 조사와 규칙이 달라서 `JOSA_FINAL` 이 세 갈래다.
 *
 * ⚠️ **㉢ 은 정확도 문제가 아니라 «가드 생존» 문제다.** 2026-08-23 elem-g5 실측:
 * ㉢ 없이 재면 「$49$ **이**상인」의 «이» 를 조사로 읽어 **거짓 양성 41자리**가 났고
 * (전체 65 → ㉢ 을 넣으니 **9**), 범위·비교를 다루는 단원이 통째로 빨개졌다.
 * **거짓 경보는 가드를 끈다** — 늘 우는 검사는 다음 사람이 꺼 버리고, 그러면 진짜
 * 결함도 같이 안 보인다. ㉢ 을 빼려는 사람은 이 수치를 먼저 볼 것.
 *
 * ⚠️ **못 재는 것은 «통과»가 아니라 «안 잼»이다.** 아래는 판정 **밖**이다 —
 * 다음 사람이 「검사된다」고 읽지 않도록 여기 적어 둔다:
 *  · `$\square$`·`$x$` 처럼 수가 없는 것 — 소리를 모른다.
 *  · `$3$ kg을` 처럼 **단위가 소리를 바꾸는 것**(「킬로그램」이라 «을») — 수식 밖 낱말이
 *    소리의 끝을 정하므로 이 스캐너의 규칙으로는 못 잰다.
 *  · 「$4$ 대 $7$의 비」처럼 수식 사이에 낱말이 낀 것 — 마지막 수식만 본다.
 *  · 🔴 **지수로 끝나는 것**(`$x^2$` · `$5^{x}$` · `$30^\circ$`) — 마지막 소리가 숫자가
 *    아니라 「제곱」·「도」다. **잴 수 있는데 안 켰다**(아래 ㉤ 에 근거와 켜는 법).
 */
export function josaFaults(text: string): string[] {
  const bad: string[] = [];
  // ⚠️ 「으로」를 「로」보다 **먼저** 놓아야 한다 — 뒤에 두면 `으로` 의 `로` 만 물어
  //    앞의 `으` 가 낱말로 남고 판정이 뒤집힌다.
  const re = /\$([^$]*)\$ ?(으로|로|을|를|이|가|과|와|은|는)(?![가-힣])/g;
  let m = re.exec(text);
  while (m !== null) {
    const span = m[1]!;
    // ㉤ 🔴 **지수로 끝나면 마지막 소리는 그 숫자가 아니라 「제곱」이다** — 판정 밖.
    //    `$y=ax^2$` 은 「에이 엑스의 **제곱**」이라 «으로»가 맞는데, 끝 숫자 $2$ 를
    //    「이」로 읽으면 «로»를 요구해 **거짓 경보**가 난다. 2026-08-31 에 이 한 부류가
    //    중3 이차함수 08·14 에서 **관문을 막았다.**
    //
    //    ⚠️ 지수는 **끝에 홀로 선 것**만 문다. `\^[^{}]*$` 로 헐겁게 잡으면
    //       `$y=ax^2+bx+c$` 의 `^` 까지 물어 「씨」를 「제곱」으로 읽는다(실측 결함).
    //
    //    🔴 **잴 수는 있는데 이 회차는 안 켰다 — «못 잼»이 아니라 «안 잼»이다.**
    //    「제곱」은 받침 ㅂ 이고 「도」($^\circ$)는 무받침이라 소리가 정해진다. 그래서
    //    켜면 판정이 된다. 실측(2026-08-31, 씨앗 8×변형 6 전 유형):
    //      · 초등 — 지수로 끝나는 조사 자리 **8**, 전부 `\mathrm{m}^2` 같은 **단위**라
    //        「제곱미터」로 읽힌다. 즉 켜도 **초등에는 값이 0이다.**
    //      · 중등 — **84자리**가 걸린다(`$3x^{2}$를`→을 · `$-15x^{3}y^{2}$가`→이 …).
    //        그중 **14자리**가 `midTypesB.test.ts` 안이라 켜는 순간 관문이 빨개진다.
    //    켜려면 그 84자리를 **같이** 고쳐야 한다. 안 고치고 켜면 늘 우는 가드가 되고,
    //    늘 우는 가드는 꺼진다(2026-08-20). 중등 엔진은 이 회차 소관이 아니라 **넘긴다.**
    //    켤 때는 `final = powArg === "\\circ" ? "none" : "other"` 한 줄이면 된다.
    const POW = /\^(?:\{([^{}]+)\}|(-?\d+|[A-Za-z]|\\circ))$/;
    const pow = POW.test(span);
    const asFrac = span.match(FRACTION_TAIL);
    const asNum = span.match(/(\d+)$/);
    const digits = pow
      ? undefined
      : asFrac
        ? fractionNumerator(asFrac)
        : asNum?.[1];
    const final =
      digits === undefined ? undefined : JOSA_FINAL[digits.slice(-1)!]!;
    if (final !== undefined) {
      const josa = m[2]!;
      if (josa === "로" || josa === "으로") {
        // ㉣ ㄹ 받침과 무받침은 「로」, 그 밖의 받침은 「으로」.
        if ((final === "other") !== (josa === "으로")) bad.push(m[0]);
      } else if (JOSA_NEEDS_BATCHIM[josa] !== (final !== "none")) {
        bad.push(m[0]);
      }
    }
    m = re.exec(text);
  }
  return bad;
}

/** 학년 안에서 «아직 안 배운 연산»을 가려낼 이름들. 값은 그 연산을 **도입하는 단원 이름**이다. */
const CONCEPT_CHAPTER: Record<string, string> = {
  분수의곱셈: "2-2 분수의 곱셈",
  분수의나눗셈: "1-1 분수의 나눗셈",
  소수의곱셈: "2-4 소수의 곱셈",
  소수의나눗셈: "1-3 소수의 나눗셈",
};

/** 단원 이름 → 전역 orderIndex. 이름이 units.ts 에 없으면 **던진다**(조용히 통과 금지). */
function chapterOrder(chapterName: string): number {
  let best = Number.POSITIVE_INFINITY;
  for (const unit of CURRICULUM_UNITS) {
    if (unit.chapter === chapterName) best = Math.min(best, unit.orderIndex);
  }
  if (!Number.isFinite(best)) {
    throw new Error(
      `units.ts 에 없는 단원 이름입니다: ${chapterName} — CONCEPT_CHAPTER 를 고치십시오`,
    );
  }
  return best;
}

/** 개념 → 그 개념을 배우는 시점(전역 orderIndex). units.ts 에서 끌어온다. */
export function conceptIntro(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [concept, chapter] of Object.entries(CONCEPT_CHAPTER)) {
    out[concept] = chapterOrder(chapter);
  }
  return out;
}

const DEC = String.raw`\d+\.\d+`;
const FRAC = String.raw`\\frac\{[^}]*\}\{[^}]*\}`;
const TIMES = String.raw`(?:\\times|×)`;
const DIV = String.raw`(?:\\div|÷)`;

/**
 * 해설이 실제로 **쓰는** 연산. 발문이 아니라 해설을 본다 —
 * 원장님이 잡으신 것은 초4 소수 단원 해설에 `0.1×10=1` 이 나온 자리다.
 */
export function conceptsUsed(text: string): string[] {
  const found = new Set<string>();
  const has = (re: string) => new RegExp(re).test(text);

  if (has(`${DEC}\\s*${TIMES}`) || has(`${TIMES}\\s*${DEC}`))
    found.add("소수의곱셈");
  if (has(`${DEC}\\s*${DIV}`) || has(`${DIV}\\s*${DEC}`))
    found.add("소수의나눗셈");
  if (has(`${FRAC}\\s*${TIMES}`) || has(`${TIMES}\\s*${FRAC}`))
    found.add("분수의곱셈");
  if (has(`${FRAC}\\s*${DIV}`) || has(`${DIV}\\s*${FRAC}`))
    found.add("분수의나눗셈");

  return [...found];
}

/**
 * 이 문항의 해설이 «아직 안 배운 연산»을 썼는가.
 *
 * 같은 단원 안에서 그 개념을 배우는 것은 당연히 허용한다(`>=`).
 */
export function tooAdvanced(orderIndex: number, solution: string): string[] {
  const intro = conceptIntro();
  return conceptsUsed(solution).filter((c) => orderIndex < (intro[c] ?? 0));
}

/**
 * **음수 부호가 붙은 자리** — 초등 지면에 음수가 나가면 안 된다(음수는 중1이다).
 *
 * ## 🔴 가르는 성질은 「빼기표 «뒤»」가 아니라 「빼기표 «앞»」이다
 *
 * 처음엔 「빼기표 뒤에 숫자」로 셌다. 적재본 55,782행에서 **13건**이 걸렸는데
 * **전부 거짓**이었다 — `$\triangle=\square-3$`(초5 대응 관계)의 그 빼기표는
 * 부호가 아니라 **연산자**다. 부호와 연산자를 가르는 것은 **앞에 항이 있는가**다.
 * 그래서 빼기표마다 왼쪽으로 되짚어 «뜻 있는 글자»를 보고, 그것이 항이면 건너뛴다.
 *
 * ⚠️ **뒤도 봐야 한다.** 「$-$」 하나가 낱말로 쓰이는 자리(줄표·범위표)가 있어서,
 *    뒤에 수나 수식(`\dfrac`·`(`·`{`)이 와야 부호로 센다.
 *
 * ⚠️ **유니코드 빼기표(U+2212)도 본다.** 지면 글자에는 둘이 섞인다.
 *
 * ## 이 자가 «예»와 «아니오»를 둘 다 낼 수 있는가
 *
 * `elemNoNegativeAnswer.test.ts` 가 눈금 열둘로 그것을 먼저 확인하고 나서야 전수를
 * 판정한다 — **0 은 «깨끗»과 «못 셈»을 안 가른다.** 실제로 그 눈금이 픽스처의
 * 역슬래시가 먹힌 것을 두 번 잡아 판정을 거부했다(2026-09-04).
 */
export function negativeSigns(text: string): string[] {
  const out: string[] = [];
  const re = /[-−]/g;
  for (let m = re.exec(text); m !== null; m = re.exec(text)) {
    // 왼쪽으로 공백·달러를 건너뛰고 처음 만나는 «뜻 있는» 글자
    let i = m.index - 1;
    while (i >= 0 && /[\s$]/.test(text[i]!)) i -= 1;
    const before = i < 0 ? "" : text[i]!;
    // 앞에 항이 있으면 **연산자**다 — 숫자·글자·닫는 괄호·중괄호
    if (/[0-9A-Za-z가-힣)\]}]/.test(before)) continue;
    // 뒤에 수나 수식이 와야 부호다
    const after = text.slice(m.index + 1).replace(/^[\s$]*/, "");
    if (!/^[\d\\({]/.test(after)) continue;
    out.push(text.slice(Math.max(0, m.index - 6), m.index + 8));
  }
  return out;
}
