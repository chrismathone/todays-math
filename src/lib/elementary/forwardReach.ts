/**
 * **반증 ⑥ 의 규칙 한 곳** — 「발문이 준 수에 그 소단원 연산을 **순방향으로만** 적용해
 * 답이 나오면 그 문항은 «심화중·심화상»이 아니다」 (D-113 확정 잣대, 2026-08-30).
 *
 * ## 🔴 왜 규칙을 한 곳에 두나 — 그리고 **입력은 왜 두 곳인가**
 *
 * 이 규칙을 쓰는 자리가 둘이다.
 *
 * ```
 * 생성기 (g5.ts)                    후보를 만들 때 **미리** 거른다 — 지면에 나갈 수를 «예측»한다
 * 판정기 (probe-elem-tier-backsolve) 다 만든 뒤 **지면을 읽어** 다시 잰다 — 참은 지면에서 온다
 * ```
 *
 * **규칙이 두 벌이면 한쪽만 고쳐도 아무도 모른다.** 그래서 규칙은 여기 하나다.
 * 그런데 **입력은 일부러 다르다** — 생성기는 자기가 고른 수만 알고, 판정기는 발문에
 * 실제로 찍힌 수를 전부 본다. 둘이 갈리면 **판정기가 옳다.**
 * 실제로 2026-08-30 에 그렇게 갈렸다: 생성기가 「$1$보다 작은 소수」의 `$1$` 과 창의
 * 경계를 안 세어, 순방향으로 풀리는 문항 14건을 통과시켰다.
 *
 * ## 허용하는 꼴은 **지면에 실제로 있는 갈래의 모양 넷**뿐이다
 *
 * ```
 * a×b            연산·기본            「$0.9×5$」
 * a×b×c          2-4-7 응용           자리를 두 번 옮긴다
 * a×b ± c        응용                 「$4$ L 중 전체의 $0.6$만큼 쓰고 남은 것」 = c−a×b
 * a×b ± c×d      응용                 「$2.3$ m 막대 $2$개와 $1.1$ m 막대 $3$개」
 * ```
 *
 * 🔴 **넓혔다 좁혔다 두 번 틀렸고, 둘 다 실측이 잡았다.**
 *   ⑴ 첫 판은 덧뺄셈을 두 번까지 허용해 **거짓 경보 46건**을 냈다 —
 *      `1+1-1.6`·`3.5-3` 같은 **산술 우연**이 「순방향」으로 찍혔다. 학생이 밟을 길이 아니다.
 *   ⑵ 그래서 좁혔더니 이번엔 **응용 갈래를 놓쳤다**(위 셋째·넷째 꼴). 그게 참이면
 *      반증 ④ 가 「이 소단원은 이 축으로 안 갈린다」고 말해 **멀쩡한 소단원을 비우게**
 *      된다 — 놓침이 곧 잘못된 «비움»이 된다.
 *   지금 목록은 **갈래의 실제 모양에서 온 것**이지 지어낸 것이 아니다.
 *
 * ⚠️ **`1` 을 곱하는 것은 «적용»이 아니다.** 「$1$보다 작은 소수」의 `$1$` 은 낱말이지
 *    자료가 아닌데 곱셈에 쓰면 `a×1±b` 가 `a±b` 로 둔갑해 **아무 뺄셈이나** «순방향»이
 *    된다(위 ⑴ 의 절반이 이것이었다). 그래서 **곱이 피연산자와 같으면**(= 곱셈이 아무
 *    일도 안 했으면) 그 길은 안 센다.
 *
 * ⚠️ **이 자가 못 보는 것**: 「되짚기가 필요한가」는 못 잰다. 재는 것은 «순방향으로도
 *    되나» 하나뿐이다 — 닿으면 확실히 아니지만, **안 닿는다고 되짚기인 것은 아니다.**
 *    그리고 네 걸음짜리 순방향 문항도 못 본다(위 목록에 없다).
 */

/** 정확한 유리수 — 부동소수를 판정에 쓰지 않는다. */
export type Rat = { n: number; d: number };

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);

export function rat(n: number, d = 1): Rat {
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (s * n) / g, d: (s * d) / g };
}

/** `[값, 소수점 아래 자릿수]` → 유리수. */
export const ratOfScaled = (value: number, places: number): Rat =>
  rat(value, 10 ** places);

const mul = (a: Rat, b: Rat) => rat(a.n * b.n, a.d * b.d);
const add = (a: Rat, b: Rat) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Rat, b: Rat) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
const same = (a: Rat, b: Rat) => a.n === b.n && a.d === b.d;

/**
 * **답이 지면에 그대로 찍혀 있다** — 연산을 한 번도 안 쓰고 값이 맞는 자리.
 *
 * 🔴 이것은 «순방향 도달»이 **아니다** (2026-08-31 정정). 반증 ⑥ 의 문장은
 *    「발문이 준 수에 그 소단원 **연산을 순방향으로 적용해** 답이 나오면」이다 —
 *    **연산을 0번 쓰는 것은 적용이 아니다.**
 *
 *    실물로 걸린 자리: 초3 `2-1-1 심화중` 「어떤 한 자리 수를 $116$ 에 곱했더니
 *    **곱의 일의 자리 숫자가 $6$**. 올림이 한 번. 어떤 수는?」 → 답 $6$.
 *    지면의 `$6$` 은 **곱의 일의 자리**이지 피연산자가 아니다. 값만 같다.
 *    (일의 자리가 6인 수에 한 자리 수를 곱해 일의 자리가 6이 되려면 $k∈\{1,6\}$ 이라
 *     답이 자주 6 이 된다 — 우연이 아니라 **역할이 다른 것**이다.)
 *
 *    「답이 발문에 그대로 있다」는 그것대로 결함일 수 있지만 **다른 축**이다.
 *    여기서 세면 이 자가 그 부류를 통째로 오판한다.
 */
export function answerPrintedOnPage(
  nums: readonly Rat[],
  answer: Rat,
): boolean {
  return nums.some((v) => same(v, answer));
}

export function forwardReachable(nums: readonly Rat[], answer: Rat): boolean {
  const products: Rat[] = [];
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      const two = mul(nums[i]!, nums[j]!);
      // 곱이 피연산자 그대로면 곱셈이 아무 일도 안 한 것이다.
      if (same(two, nums[i]!) || same(two, nums[j]!)) continue;
      if (same(two, answer)) return true;
      products.push(two);
      for (let k = 0; k < nums.length; k += 1) {
        if (k === i || k === j) continue;
        const three = mul(two, nums[k]!);
        if (!same(three, two) && same(three, answer)) return true;
      }
    }
  }
  // 곱한 뒤 한 번 더한다·뺀다 — 더하는 쪽은 낱값이든 또 다른 곱이든 좋다.
  const tails: Rat[] = [...nums, ...products];
  for (const base of products) {
    for (const t of tails) {
      if (same(add(base, t), answer) || same(sub(base, t), answer)) return true;
      if (same(sub(t, base), answer)) return true;
    }
  }
  return false;
}

/** `"0.35"` → 7/20. 못 읽으면 null. */
export function readRat(tok: string): Rat | null {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(tok.trim());
  if (!m) return null;
  const frac = m[2] ?? "";
  return rat(Number(m[1] + frac), 10 ** frac.length);
}

/**
 * **지면의 `$…$` 안에서 수를 전부 뽑는다** — 식이든 낱값이든 가리지 않는다.
 *
 * 🔴 생성기도 이것을 쓴다. 「지면에 무엇이 찍힐까」를 **예측하지 말고 찍힌 것을 읽으라**는
 *    뜻이다 — 예측하던 판은 성질 문구의 `$1$` 과 되풀이되는 곱하는 수를 빠뜨려
 *    순방향으로 풀리는 문항을 통과시켰다(2026-08-30, 14건 → 2건 → 0건).
 */
export function pageNumbers(text: string): Rat[] {
  const out: Rat[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    for (const tok of (m[1] ?? "").match(/\d+(?:\.\d+)?/g) ?? []) {
      const r = readRat(tok);
      if (r) out.push(r);
    }
  }
  return out;
}
