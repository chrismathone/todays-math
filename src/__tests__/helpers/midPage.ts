/**
 * 중등 지면 판정 연장 — **「값이 맞나」가 아니라 「지면 글자가 옳나」를 잰다.**
 *
 * 값 검산만 두면 앞쪽만 지켜지고 뒤쪽은 원장님이 종이에서 찾아 줄 때까지 아무도
 * 모른다(2026-08-24 「값이 맞으면 시험이 다 초록이다」). 여기 둘은 그 뒤쪽이다.
 *
 *   `josaMismatches` — 수 뒤 조사가 **읽기**와 맞나 (`$15$과`·`$63$와`)
 *   `blindJosa`      — 그 사각(문자·제곱·프라임 뒤, 「로/으로」, 「(이)라」, 수 뒤 주격 「이」)
 *   `josaFaults`     — 위 둘을 함께(새로 쓰는 쪽은 이것)
 *   `pageSmells`     — `1x`·`+-`·`^1`·`$1(a+b)$` 처럼 값은 맞고 보기만 흉한 것
 * 눈금은 `unit/midPageGuards.test.ts`(2026-09-27 올린 자)와 각 쓰는 쪽 시험에 있다.
 *
 * ⚠️ 규칙을 **제품에서 가져오지 않는다.** `m2Josa.eulReul` 을 그대로 부르면
 *    동어반복이라 아무것도 안 지킨다 — 받침 판정은 여기 다시 적는다.
 *    반대로 「읽을 때 마지막에 오는 수」는 제품이 모르는 것이라 여기 산다.
 *
 * 냄새 목록의 뿌리는 `scripts/qa/scan-m3-poly-smells.ts` 다(그쪽은 훑개, 이쪽은
 * 가드). 둘이 갈라지면 훑개가 세는 것과 가드가 막는 것이 달라진다 — 늘리는 쪽은
 * 여기다.
 */

/**
 * 수 읽기의 끝 글자에 받침이 있는가 — `m2Josa` 와 **같은 규칙을 시험 쪽에 다시 적은 것**.
 * 끝 자리가 2(이)·4(사)·5(오)·9(구)면 모음, 나머지는 받침이다.
 */
export function numVowelFinal(n: number): boolean {
  const d = Math.abs(n) % 10;
  return d === 2 || d === 4 || d === 5 || d === 9;
}

/**
 * 수식 끝에서 «읽을 때 마지막에 오는 수» — 없으면 `null`(판정하지 않는다).
 *
 * 두 자리가 함정이다.
 *  ⑴ 분수를 건너뛰면 안 된다. 분수는 「$b$**분의** $a$」로 읽으므로 마지막에
 *     오는 수는 **분자**다.
 *     ⚠️ 예전 판은 여기서 «대분수의 나머지»를 냈다 — `improperToMixed` 가
 *     $\frac{14}{5}$ 를 $2\frac45$ 로 그리던 때의 규칙이다. 그 변환은
 *     **2026-08-24 에 제품에서 빠졌다**(원장님 확정 「중등은 대분수 변환하지
 *     말 것」, `textPreprocess.applyMathInnerNormalization` 주석). 전제가
 *     뒤집혔는데 규칙만 남으면 $\frac{7}{5}$(칠 → 받침)를 「이」로 읽어
 *     **옳은 조사를 거짓 경보로 잡는다**. 실제 렌더를 찍어 보고 고쳤다.
 *  ⑵ **지수로 끝나면 읽기를 알 수 없다.** `5x-3x^2` 는 「엑스의 **제곱**」으로
 *     읽지 「이」로 읽지 않는다. 여기를 안 막으면 멀쩡한 「을」이 거짓 경보로
 *     걸리고, **거짓 경보는 가드를 끈다**(2026-08-20).
 */
export function trailingReadNumber(body: string): number | null {
  const frac = body.match(/\\d?frac\{(\d+)\}\{(\d+)\}$/);
  if (frac) return Number(frac[1]); // 「$b$분의 $a$」 — 마지막은 분자
  if (/\^\d+$/.test(body)) return null; // 지수로 끝난다 — 「제곱」으로 읽는다
  const int = body.match(/(\d+)$/);
  return int ? Number(int[1]) : null;
}

const JOSA_PAIR: Record<string, readonly [string, string]> = {
  을: ["을", "를"],
  를: ["을", "를"],
  은: ["은", "는"],
  는: ["은", "는"],
  와: ["과", "와"],
  과: ["과", "와"],
  // 「가」는 넣고 **「이」는 뺀다.** 「이」는 주격 조사이기도 하지만 서술격
  // 「$5$이다·$5$이므로·$5$이고」의 첫 글자이기도 해서, 넣으면 옳은 지면이
  // 무더기로 걸린다 — **거짓 경보는 가드를 끈다**(2026-08-20). 그래서 이 자는
  // 「이를 써야 할 자리에 가를 썼다」만 잡고 그 반대는 못 본다. 생성기 쪽에서
  // `nIGa` 로 짓는 것이 짝이다.
  가: ["이", "가"],
};

/**
 * 수 뒤 조사가 읽기와 어긋난 자리 — 없으면 빈 배열.
 *
 * 「$3$가지」의 「가」·「$4$과목」의 「과」는 조사가 아니라 **낱말의 첫 글자**다 — 예전 판은
 * 이것을 주격·접속 조사로 읽어 전 중등 29유형 34행(유형×필드)에서 거짓 경보를 냈다
 * (2026-09-27 전수, 씨앗 200 에 「가지」 8,964건·「과목」 400건). 그래서 뒤에 「지」·「목」이
 * 오면 안 본다. 「$4$과의」처럼 조사 뒤에 조사가 붙은 것은 그대로 본다.
 *
 * 닫는 괄호는 **소리 내어 읽지 않는다** — 「점 $(6, 8)$」은 「… 팔」로 끝난다. 예전 판은
 * 「)」로 끝나면 판정하지 않아 좌표·함숫값 뒤 조사가 통째로 0 이었다(같은 날 전수 33행 —
 * 모바일 복습이 쓰는 중1 「좌표와 그래프」도 여기서 샜다).
 */
export function josaMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(
    /\$([^$]*)\$(을|를|은|는|와|과(?!목)|가(?!지))/g,
  )) {
    const read = m[1]!.replace(/(?:\\right\)|\\right\]|\)|\])+$/, "");
    const n = trailingReadNumber(read);
    if (n === null) continue; // 문자·지수로 끝나면 읽기를 알 수 없다
    const pair = JOSA_PAIR[m[2]!]!;
    const want = numVowelFinal(n) ? pair[1] : pair[0];
    if (m[2] !== want) {
      out.push(`$…${m[1]!.slice(-16)}$${m[2]} → ${want}`);
    }
  }
  return out;
}

/**
 * 조사 판정 전부 — `josaMismatches`(수 뒤) + `blindJosa`(그 사각). 새로 쓰는 쪽은 이것을 쓴다.
 *
 * ⚠️ `josaMismatches` 에 `blindJosa` 를 **섞지 않았다.** 2026-09-27 에 섞어 보니 이 자를 쓰는
 *    45파일 중 고등 `highIdentity` 하나가 빨개졌다 — 거짓 경보가 아니라 고등 엔진의 진짜 결함
 *    (「항등식과 나머지정리 14」 해설 「$R$라 하면」)이었는데, 고등 엔진은 다른 컴퓨터가 맡는다.
 *    그 결함이 고쳐지면 섞어도 된다(그때 이 함수와 `josaMismatches` 를 하나로).
 */
export function josaFaults(text: string): string[] {
  return [...josaMismatches(text), ...blindJosa(text)];
}

/**
 * `josaMismatches` 의 사각 — 위 자가 **수로 끝나는 수식 뒤 을·를·은·는·와·과·가** 만 보므로
 * 비어 있던 자리들. 보통은 `josaFaults` 로 둘을 함께 부른다.
 * 2026-09-27 중등 전수에서 61유형이 여기서 걸려 고쳤고(`middleJosaAll` 이 먼저 들고 있던 자를
 * 리드 결정으로 여기로 올렸다), 프라임은 원장님이 「프라임으로 통일」을 정하셨다.
 *
 *  ⑴ 수 뒤 **주격** 「이/가」 — 「$252$이 되어야」. 서술격(「$5$이다」·「$5$이고」)과 겹치므로
 *     「이」 뒤가 빈칸·쉼표·마침표·닫는 괄호·끝일 때만 조사로 본다.
 *  ⑵ **문자·제곱·프라임**으로 끝나는 수식 뒤 — 「점 $B$이 있고」·「$R$가」·「$2x^{2}$를」·
 *     「$AEB'$와」. 영문자는 이름으로 읽는다: 받침은 엘·엠·엔·알(l·m·n·r)뿐, 나머지(엑스·와이·
 *     에이 …)는 없다. 제곱·세제곱(`^2`·`^{3}`)과 프라임(「프라임」)은 받침이 있다.
 *  ⑶ 「로/으로」 — 받침이 없거나 ㄹ 받침(1·7·8·l·r)이면 「로」, 그 밖의 받침(0·3·6·m·n·제곱·
 *     프라임)이면 「으로」.
 *  ⑷ 「(이)라」 — 「나머지를 $R$라 하면」·「$y=mx+8$라 하자」. 받침이 있으면 「이라」.
 * 안 보는 것: 단위(`\mathrm{g}`·` cm` — 그램·센티미터가 소리를 정한다), 줄이 바뀐 뒤의
 * 「이」(「⏎이 자료의」 — 지시어), 도(°), 분수·근호로 끝나는 수식(읽는 순서가 다르다).
 */
const BLIND_PAIR: Record<string, readonly [string, string]> = {
  은: ["은", "는"],
  는: ["은", "는"],
  을: ["을", "를"],
  를: ["을", "를"],
  이: ["이", "가"],
  가: ["이", "가"],
  과: ["과", "와"],
  와: ["과", "와"],
};

type Ending = {
  kind: "수" | "문자" | "제곱" | "프라임";
  last: string;
} | null;

/** 수식을 소리 내어 읽을 때의 끝 — 판정할 수 없으면 `null`. */
function endingOf(math: string): Ending {
  let s = math.replace(/(?:\\right\)|\\right\]|\)|\]|\s)+$/, "");
  if (/\\mathrm\{[^{}]*\}(?:\^\{?\d\}?)?$|\\degree$|\^\\circ$/.test(s)) {
    return null;
  }
  // 프라임 — `B'`·`\overline{BA'}` 의 끝은 「프라임」(받침 ㅁ)
  if (/'\}?$/.test(s)) return { kind: "프라임", last: "" };
  // 띄어 쓴 단위 — `$20 cm$`·`$x cm$`. 앞이 명령(`\le x`)이면 단위가 아니다.
  if (
    /(?:\d|(?<![\\A-Za-z])[A-Za-z]|\})(?:\s|\\,)+(?:[a-z]{1,2}|m?L)(?:\^\{?\d\}?)?$/.test(
      s,
    )
  ) {
    return null;
  }
  if (/\^\{?[23]\}?$/.test(s)) return { kind: "제곱", last: "" };
  const ol = /\\overline\{[A-Za-z]*([A-Za-z])\}$/.exec(s);
  if (ol) s = ol[1]!;
  const m = /(?<![\\A-Za-z])([A-Za-z]{1,3})$/.exec(s);
  if (m) return { kind: "문자", last: m[1]!.slice(-1).toLowerCase() };
  const d = /(?<![\d.])(\d+)$/.exec(s);
  if (d) return { kind: "수", last: d[1]!.slice(-1) };
  return null;
}

function hasBatchim(e: NonNullable<Ending>): boolean {
  if (e.kind === "제곱" || e.kind === "프라임") return true;
  if (e.kind === "문자") return "lmnr".includes(e.last);
  return !"2459".includes(e.last);
}

function takesRo(e: NonNullable<Ending>): boolean {
  if (e.kind === "제곱" || e.kind === "프라임") return false;
  if (e.kind === "문자") return !"mn".includes(e.last);
  return !"036".includes(e.last);
}

export function blindJosa(text: string): string[] {
  const out: string[] = [];
  const say = (body: string, josa: string, want: string) =>
    out.push(`$…${body.slice(-16)}$${josa} → ${want}`);
  for (const m of text.matchAll(
    /\$([^$]*)\$ ?(은|는|을|를|이|가|와|과)(.?)/g,
  )) {
    const [, body, josa, next] = m as unknown as [
      string,
      string,
      string,
      string,
    ];
    if (josa === "이" && !/^[\s,.)]?$/.test(next)) continue; // 이다·이고·이므로 …
    if (josa === "가" && next === "지") continue; // 가지
    if (josa === "과" && next === "목") continue; // 과목
    const e = endingOf(body);
    if (!e) continue;
    if (e.kind === "수" && josa !== "이") continue; // 그 밖은 위 `josaMismatches` 몫
    const want = BLIND_PAIR[josa]![hasBatchim(e) ? 0 : 1];
    if (want !== josa) say(body, josa, want);
  }
  for (const m of text.matchAll(
    /\$([^$]*)\$ ?(으로|로)(?:(?![가-힣])|(?=[서써부는도의만]))/g,
  )) {
    const [, body, josa] = m as unknown as [string, string, string];
    const e = endingOf(body);
    if (!e) continue;
    const want = takesRo(e) ? "로" : "으로";
    if (want !== josa) say(body, josa, want);
  }
  for (const m of text.matchAll(
    /\$([^$]*)\$ ?(이라|라)(?= 하|고 |고,|면|는 |서 )/g,
  )) {
    const [, body, josa] = m as unknown as [string, string, string];
    const e = endingOf(body);
    if (!e) continue;
    const want = hasBatchim(e) ? "이라" : "라";
    if (want !== josa) say(body, josa, want);
  }
  return out;
}

/**
 * 값이 맞아도 지면에 나오면 안 되는 모양. 셋째 칸이 `"수식"` 이면 `$…$` 안에서만 본다
 * (발문 글자의 「1(가)」 같은 것은 수식이 아니다).
 */
const SMELLS: readonly (readonly [string, RegExp, "수식"?])[] = [
  ["+- 나 -- 가 붙었다", /\+-|--/],
  ["계수 1 을 적었다", /(?<![\d.])1[a-zA-Z](?![a-zA-Z0-9])/],
  // 위 줄은 `1` 뒤에 **글자**가 올 때만 본다 — `1\left(x-4\right)`·`-1\left(x+7\right)` 는
  // 뒤가 역슬래시라 통째로 빠져 있었다(중1 항등식·일차방정식 판별 목록, 2026-09-27 실측).
  ["괄호 앞에 계수 1 을 적었다", /(?<![\d.])1\\left(?:[([]|\\\{)/],
  // 맨 괄호 `1(` — `$1(a+b)=-8$`·`\{5x-1(20-x)\}`(2026-09-27 전수, 연립 12·부등식 72 …).
  // 앞이 `{` 이면 뺀다 — 중3 유리화 `\dfrac{1(3-\sqrt{3})}{6}` 는 옳은 풀이 줄이다.
  // (중등 `middleNotationAll` 이 먼저 들고 있던 자를 2026-09-27 리드 결정으로 여기로 올렸다.)
  ["맨 괄호 앞에 계수 1 을 적었다", /(?<![\d.{])1\(/, "수식"],
  // 같은 까닭으로 `1\pi`·`1\sqrt{15}` 도 빠져 있었다(원과 부채꼴 넓이·호, 근호 전개 — 2026-09-27 실측).
  ["π·√ 앞에 계수 1 을 적었다", /(?<![\d.])1\\(?:pi|sqrt)(?![a-zA-Z])/],
  ["계수 0 을 적었다", /(?<![\d.])0[a-zA-Z]/],
  // `^1` 만 보면 **중괄호 판**을 통째로 못 본다 — `11^{1}` 이 그렇게 살아 있었다.
  ["지수 1 을 적었다", /\^1(?!\d)|\^\{1\}/],
  ["지수 0 을 적었다", /\^0|\^\{0\}/],
  ["상수 0 을 더했다", /[+-]0(?![\d.])/],
  ["연산자가 붙어 있다", /[+\-*/]\s*[*/]/],
  // 「(속력)$\times$(시간)」처럼 **곱셈표 하나만** 수식으로 쓴 말 공식은 뒤가 빈 것이 아니다 —
  // 수식이 `$\times$` 로 시작하면 빼고 본다(`$3\times$` 는 그대로 잡는다).
  ["곱셈표 뒤가 비었다", /(?<!\$)\\times\s*(?:\$|$)/],
];

/** 지면 냄새가 난 자리 — 없으면 빈 배열. */
export function pageSmells(text: string): string[] {
  const math = [...text.matchAll(/\$[^$]*\$/g)].map((m) => m[0]).join(" ");
  return SMELLS.filter(([, re, scope]) =>
    re.test(scope === "수식" ? math : text),
  ).map(([label]) => label);
}
