/**
 * 중등 지면 판정 연장 — **「값이 맞나」가 아니라 「지면 글자가 옳나」를 잰다.**
 *
 * 값 검산만 두면 앞쪽만 지켜지고 뒤쪽은 원장님이 종이에서 찾아 줄 때까지 아무도
 * 모른다(2026-08-24 「값이 맞으면 시험이 다 초록이다」). 여기 둘은 그 뒤쪽이다.
 *
 *   `josaMismatches` — 수 뒤 조사가 **읽기**와 맞나 (`$15$과`·`$63$와`)
 *   `pageSmells`     — `1x`·`+-`·`^1` 처럼 값은 맞고 보기만 흉한 것
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
 *  ⑴ 분수를 건너뛰면 안 된다. `improperToMixed`(textPreprocess)가 가분수를
 *     **대분수**로 그리므로 $\frac{14}{5}$ 는 「$2$와 $5$분의 $4$」로 읽히고,
 *     조사는 그 **나머지**를 따른다.
 *  ⑵ **지수로 끝나면 읽기를 알 수 없다.** `5x-3x^2` 는 「엑스의 **제곱**」으로
 *     읽지 「이」로 읽지 않는다. 여기를 안 막으면 멀쩡한 「을」이 거짓 경보로
 *     걸리고, **거짓 경보는 가드를 끈다**(2026-08-20).
 */
export function trailingReadNumber(body: string): number | null {
  const frac = body.match(/\\frac\{(\d+)\}\{(\d+)\}$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (a % b === 0) return a / b;
    return a > b ? a % b : a;
  }
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

/** 수 뒤 조사가 읽기와 어긋난 자리 — 없으면 빈 배열. */
export function josaMismatches(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$(을|를|은|는|와|과|가)/g)) {
    const n = trailingReadNumber(m[1]!);
    if (n === null) continue; // 문자·지수로 끝나면 읽기를 알 수 없다
    const pair = JOSA_PAIR[m[2]!]!;
    const want = numVowelFinal(n) ? pair[1] : pair[0];
    if (m[2] !== want) {
      out.push(`$…${m[1]!.slice(-16)}$${m[2]} → ${want}`);
    }
  }
  return out;
}

/** 값이 맞아도 지면에 나오면 안 되는 모양. */
const SMELLS: readonly (readonly [string, RegExp])[] = [
  ["+- 나 -- 가 붙었다", /\+-|--/],
  ["계수 1 을 적었다", /(?<![\d.])1[a-zA-Z](?![a-zA-Z0-9])/],
  ["계수 0 을 적었다", /(?<![\d.])0[a-zA-Z]/],
  // `^1` 만 보면 **중괄호 판**을 통째로 못 본다 — `11^{1}` 이 그렇게 살아 있었다.
  ["지수 1 을 적었다", /\^1(?!\d)|\^\{1\}/],
  ["지수 0 을 적었다", /\^0|\^\{0\}/],
  ["상수 0 을 더했다", /[+-]0(?![\d.])/],
  ["연산자가 붙어 있다", /[+\-*/]\s*[*/]/],
  ["곱셈표 뒤가 비었다", /\\times\s*(?:\$|$)/],
];

/** 지면 냄새가 난 자리 — 없으면 빈 배열. */
export function pageSmells(text: string): string[] {
  return SMELLS.filter(([, re]) => re.test(text)).map(([label]) => label);
}
